import React, { useEffect, useMemo, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { AlignCenter, AlignLeft, AlignRight, Bold, Underline as UnderlineIcon } from 'lucide-react';
import { Extension, Node } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

const colIdxToLetter = (idx) => {
  let n = idx + 1;
  let s = '';
  while (n > 0) {
    const mod = (n - 1) % 26;
    s = String.fromCharCode(65 + mod) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

const CM_TO_PX = 37.7952755906;

const ensureGoogleFontLoaded = (fontFamily) => {
  const id = `gf-${fontFamily.replaceAll(' ', '-')}`;
  if (document.getElementById(id)) return;

  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily).replaceAll(
    '%20',
    '+'
  )}:wght@300;400;500;700&display=swap`;
  document.head.appendChild(link);
};

const Variable = Node.create({
  name: 'variable',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addProseMirrorPlugins() {
    const key = new PluginKey('variable-selection-highlight');

    return [
      new Plugin({
        key,
        props: {
          decorations: (state) => {
            const { doc, selection } = state;

            if (selection.empty) return null;

            const from = selection.from;
            const to = selection.to;
            const decos = [];

            doc.nodesBetween(from, to, (node, pos) => {
              if (node.type.name !== 'variable') return;
              decos.push(
                Decoration.node(pos, pos + node.nodeSize, {
                  class: 'pm-variable-in-selection',
                })
              );
            });

            if (!decos.length) return null;
            return DecorationSet.create(doc, decos);
          },
        },
      }),
    ];
  },

  addAttributes() {
    return {
      colIdx: { default: null },
      label: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-variable]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      {
        'data-variable': 'true',
        'data-col-idx': HTMLAttributes.colIdx,
        'data-label': HTMLAttributes.label,
        class:
          'inline-flex items-center rounded-full border border-gray-300 bg-white px-1 py-0 text-[10px] leading-none h-5 text-gray-700 select-none',
      },
      HTMLAttributes.label,
    ];
  },
});

const FontSize = Extension.create({
  name: 'fontSize',

  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize) =>
        ({ chain }) => {
          return chain().setMark('textStyle', { fontSize }).run();
        },
      unsetFontSize:
        () =>
        ({ chain }) => {
          return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run();
        },
    };
  },
});

const replaceVariablesInHtml = (html, row) => {
  if (!html) return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return '';

  const tokens = root.querySelectorAll('span[data-variable][data-col-idx]');
  tokens.forEach((el) => {
    const idx = Number(el.getAttribute('data-col-idx'));
    const value = row?.[idx] ?? '';
    el.replaceWith(doc.createTextNode(String(value)));
  });

  return root.innerHTML;
};

const downloadJson = (obj, filename) => {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const LabelEditor = ({ config, file, onBack, onFileUpdate, onReupload, onOpenSettings, editorSettings, onEditorSettingsChange }) => {
  const [hasHeader, setHasHeader] = useState(editorSettings?.hasHeader ?? file?.hasHeader ?? true);
  const [selectedFont, setSelectedFont] = useState(editorSettings?.font ?? 'Heebo');
  const [selectedFontSize, setSelectedFontSize] = useState(editorSettings?.fontSize ?? '12pt');
  const [verticalAlign, setVerticalAlign] = useState(editorSettings?.verticalAlign ?? 'top');
  const [docJson, setDocJson] = useState(editorSettings?.editorDoc ?? null);
  const [rowIndex, setRowIndex] = useState(0);

  const labelWcm = Number(config?.labelWidthCm) || 5;
  const labelHcm = Number(config?.labelHeightCm) || 3;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      FontFamily,
      FontSize,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Variable,
    ],
    content: docJson ? undefined : '<p></p>',
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
        style: `font-family: ${selectedFont}, Heebo, system-ui, sans-serif; font-size: ${selectedFontSize};`,
      },
      handleDrop: (view, event) => {
        const e = event;
        const colIdx = e.dataTransfer?.getData('text/colIdx');
        const colLabel = e.dataTransfer?.getData('text/colLabel');
        if (!colIdx) return false;

        const coords = view.posAtCoords({ left: e.clientX, top: e.clientY });
        const pos = coords?.pos ?? view.state.selection.from;

        editor
          ?.chain()
          .focus()
          .insertContentAt(pos, {
            type: 'variable',
            attrs: {
              colIdx: Number(colIdx),
              label: colLabel || `עמודה ${Number(colIdx) + 1}`,
            },
          })
          .run();

        setDocJson(editor?.getJSON() ?? null);
        e.preventDefault();
        return true;
      },
    },
    onUpdate: ({ editor: ed }) => {
      setDocJson(ed.getJSON());
    },
    onCreate: ({ editor: ed }) => {
      if (docJson) {
        ed.commands.setContent(docJson);
      }
      setDocJson(ed.getJSON());
    },
  });

  useEffect(() => {
    if (editor && docJson) {
      editor.commands.setContent(docJson);
    }
  }, [docJson, editor]);

  useEffect(() => {
    ensureGoogleFontLoaded(selectedFont);
    if (editor) {
      editor.commands.setFontFamily(selectedFont);
    }
    if (onEditorSettingsChange) {
      onEditorSettingsChange({
        font: selectedFont,
        fontSize: selectedFontSize,
        verticalAlign,
        editorDoc: docJson,
        hasHeader,
      });
    }
  }, [selectedFont, editor]);

  useEffect(() => {
    if (editor) {
      editor.commands.setFontSize(selectedFontSize);
    }
    if (onEditorSettingsChange) {
      onEditorSettingsChange({
        font: selectedFont,
        fontSize: selectedFontSize,
        verticalAlign,
        editorDoc: docJson,
        hasHeader,
      });
    }
  }, [selectedFontSize, editor]);

  const editorBox = useMemo(() => {
    const maxW = 760;
    const maxH = 240;
    const scale = Math.min(maxW / (labelWcm * CM_TO_PX), maxH / (labelHcm * CM_TO_PX));
    return {
      scale,
      widthPx: Math.max(1, Math.round(labelWcm * CM_TO_PX * scale)),
      heightPx: Math.max(1, Math.round(labelHcm * CM_TO_PX * scale)),
    };
  }, [labelWcm, labelHcm]);

  useEffect(() => {
    setHasHeader(file?.hasHeader ?? true);
  }, [file?.hasHeader]);

  useEffect(() => {
    if (onEditorSettingsChange) {
      onEditorSettingsChange({
        font: selectedFont,
        fontSize: selectedFontSize,
        verticalAlign,
        editorDoc: docJson,
        hasHeader,
      });
    }
  }, [verticalAlign, docJson]);

  const data = file?.data ?? [];

  const headerRow = useMemo(() => {
    if (!data.length) return [];
    return hasHeader ? data[0] ?? [] : [];
  }, [data, hasHeader]);

  const bodyRows = useMemo(() => {
    if (!data.length) return [];
    return hasHeader ? data.slice(1) : data;
  }, [data, hasHeader]);

  const colsCount = useMemo(() => {
    return file?.cols ?? (data[0]?.length || 0);
  }, [file?.cols, data]);

  const columns = useMemo(() => {
    return Array.from({ length: colsCount }).map((_, idx) => {
      const letter = colIdxToLetter(idx);
      const header = headerRow?.[idx];
      const label = hasHeader && header ? `${letter} - ${header}` : letter;
      return { idx, letter, header: header ?? '', label };
    });
  }, [colsCount, headerRow, hasHeader]);

  const currentRow = bodyRows[rowIndex] ?? [];

  const previewHtml = useMemo(() => {
    const html = editor?.getHTML() ?? '';
    return replaceVariablesInHtml(html, currentRow);
  }, [docJson, editor, currentRow]);

  const previewBox = useMemo(() => {
    const maxW = 520;
    const maxH = 220;
    const scale = Math.min(maxW / (labelWcm * CM_TO_PX), maxH / (labelHcm * CM_TO_PX));

    return {
      widthPx: Math.max(1, Math.round(labelWcm * CM_TO_PX * scale)),
      heightPx: Math.max(1, Math.round(labelHcm * CM_TO_PX * scale)),
      scale,
    };
  }, [labelWcm, labelHcm]);

  const handleHeaderChange = (checked) => {
    setHasHeader(checked);
    setRowIndex(0);
    if (file && onFileUpdate) {
      onFileUpdate({
        ...file,
        hasHeader: checked,
      });
    }
    if (onEditorSettingsChange) {
      onEditorSettingsChange({
        font: selectedFont,
        fontSize: selectedFontSize,
        verticalAlign,
        editorDoc: docJson,
        hasHeader: checked,
      });
    }
  };

  const handleSaveSettings = () => {
    const payload = {
      version: 1,
      type: 'madbakot-label-settings',
      savedAt: new Date().toISOString(),
      config,
      hasHeader,
      editorDoc: editor?.getJSON() ?? docJson,
      font: selectedFont,
      fontSize: selectedFontSize,
      verticalAlign,
    };

    downloadJson(payload, 'label-settings.json');
  };

  const handlePrint = () => {
    if (!editor || !config || !file) return;

    const verticalJustify =
      verticalAlign === 'bottom' ? 'flex-end' : verticalAlign === 'middle' ? 'center' : 'flex-start';

    const pageW = Number(config.pageWidthCm) || 21;
    const pageH = Number(config.pageHeightCm) || 29.7;

    const ml = Number(config.marginLeftCm) || 0;
    const mr = Number(config.marginRightCm) || 0;
    const mt = Number(config.marginTopCm) || 0;
    const mb = Number(config.marginBottomCm) || 0;

    const cols = Number(config.cols) || 1;
    const rows = Number(config.rows) || 1;
    const labelW = Number(config.labelWidthCm) || 5;
    const labelH = Number(config.labelHeightCm) || 3;

    const templateHtml = editor.getHTML();
    const labelsPerPage = Math.max(1, rows * cols);

    const filled = bodyRows.map((row) => replaceVariablesInHtml(templateHtml, row));

    const pages = [];
    for (let i = 0; i < filled.length; i += labelsPerPage) {
      const slice = filled.slice(i, i + labelsPerPage);
      pages.push(slice);
    }

    ensureGoogleFontLoaded(selectedFont);

    const pageHtml = pages
      .map((pageLabels, pageIdx) => {
        const cells = Array.from({ length: labelsPerPage }).map((_, idx) => {
          const content = pageLabels[idx] ?? '';
          return `<div class="label"><div class="labelContent"><div class="labelInner">${content}</div></div></div>`;
        });

        return `
          <div class="page" data-page="${pageIdx}">
            <div class="grid">
              ${cells.join('')}
            </div>
          </div>
        `;
      })
      .join('');

    const html = `
      <!doctype html>
      <html dir="rtl">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Print Labels</title>
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(selectedFont).replaceAll(
            '%20',
            '+'
          )}:wght@300;400;500;700&display=swap" />
          <style>
            @page { size: ${pageW}cm ${pageH}cm; margin: 0; }
            html, body { margin: 0; padding: 0; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .page {
              width: ${pageW}cm;
              height: ${pageH}cm;
              box-sizing: border-box;
              padding: ${mt}cm ${mr}cm ${mb}cm ${ml}cm;
              page-break-after: always;
              font-family: ${selectedFont}, Heebo, system-ui, sans-serif;
              font-size: ${selectedFontSize};
              line-height: 1.2;
            }
            .grid {
              width: 100%;
              height: 100%;
              display: grid;
              grid-template-columns: repeat(${cols}, ${labelW}cm);
              grid-template-rows: repeat(${rows}, ${labelH}cm);
              grid-auto-flow: row;
              gap: 0;
              align-content: start;
              justify-content: start;
            }
            .label {
              width: ${labelW}cm;
              height: ${labelH}cm;
              box-sizing: border-box;
              overflow: hidden;
              position: relative;
              contain: layout paint;
            }
            .labelContent {
              position: absolute;
              inset: 0;
              width: 100%;
              height: 100%;
              overflow: hidden;
              display: flex;
              flex-direction: column;
              justify-content: ${verticalJustify};
              word-break: break-word;
              overflow-wrap: anywhere;
            }
            .labelInner { width: 100%; }
            p { margin: 0; }
          </style>
        </head>
        <body>
          ${pageHtml}
          <script>
            window.onload = () => { window.focus(); window.print(); };
          </script>
        </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      iframe.remove();
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    const cleanup = () => {
      try {
        iframe.remove();
      } catch {
        // ignore
      }
    };

    const onAfterPrint = () => {
      iframe.contentWindow?.removeEventListener('afterprint', onAfterPrint);
      cleanup();
    };

    iframe.onload = () => {
      const w = iframe.contentWindow;
      if (!w) {
        cleanup();
        return;
      }

      w.addEventListener('afterprint', onAfterPrint);
      w.focus();
      w.print();
    };
  };

  const toolbarButtonClass =
    'rounded-md border border-gray-300 px-2.5 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50';

  const verticalJustify =
    verticalAlign === 'bottom' ? 'flex-end' : verticalAlign === 'middle' ? 'center' : 'flex-start';

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="text-2xl font-bold">עריכת תוויות</h2>
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
        >
          חזרה
        </button>
      </div>

      {file && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="hasHeader"
                checked={hasHeader}
                onChange={(e) => handleHeaderChange(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-gray-300"
              />
              <label htmlFor="hasHeader" className="text-sm font-medium text-gray-700">
                שורה ראשונה היא כותרת
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onReupload}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                העלאת קובץ מחדש
              </button>
              <button
                type="button"
                onClick={onOpenSettings}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                הגדרות
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">קובץ:</span>
              <span className="font-medium text-gray-800 mr-2">{file.file.name}</span>
            </div>
            <div>
              <span className="text-gray-500">גודל:</span>
              <span className="font-medium text-gray-800 mr-2">{(file.file.size / 1024).toFixed(2)} KB</span>
            </div>
            <div>
              <span className="text-gray-500">מספר שורות:</span>
              <span className="font-medium text-gray-800 mr-2">{file.rows}</span>
            </div>
            <div>
              <span className="text-gray-500">מספר עמודות:</span>
              <span className="font-medium text-gray-800 mr-2">{file.cols}</span>
            </div>
          </div>
        </div>
      )}

      {file ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4">
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-700 mb-3">עמודות</div>
                <div className="flex flex-wrap gap-2">
                  {columns.map((col) => (
                    <div
                      key={col.idx}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/colIdx', String(col.idx));
                        e.dataTransfer.setData('text/colLabel', col.label);
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      className="select-none rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 cursor-grab active:cursor-grabbing"
                      title="גרור לעורך"
                    >
                      {col.label}
                    </div>
                  ))}
                </div>

                <div className="mt-4 text-xs text-gray-500">גרור צ'יפ אל העורך כדי להוסיף שדה</div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-700 mb-3">פעולות</div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    disabled={!config}
                  >
                    שמור הגדרות
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                    disabled={!editor || !config || !file || !bodyRows.length}
                  >
                    הדפסה
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => editor?.chain().focus().toggleBold().run()}
                    className={toolbarButtonClass}
                    title="הדגשה"
                    disabled={!editor}
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => editor?.chain().focus().toggleUnderline().run()}
                    className={toolbarButtonClass}
                    title="קו תחתון"
                    disabled={!editor}
                  >
                    <UnderlineIcon className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => editor?.chain().focus().setTextAlign('right').run()}
                    className={toolbarButtonClass}
                    title="יישור לימין"
                    disabled={!editor}
                  >
                    <AlignRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => editor?.chain().focus().setTextAlign('center').run()}
                    className={toolbarButtonClass}
                    title="יישור למרכז"
                    disabled={!editor}
                  >
                    <AlignCenter className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => editor?.chain().focus().setTextAlign('left').run()}
                    className={toolbarButtonClass}
                    title="יישור לשמאל"
                    disabled={!editor}
                  >
                    <AlignLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">גובה</span>
                    <select
                      value={verticalAlign}
                      onChange={(e) => setVerticalAlign(e.target.value)}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                    >
                      <option value="top">למעלה</option>
                      <option value="middle">אמצע</option>
                      <option value="bottom">למטה</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">פונט</span>
                    <select
                      value={selectedFont}
                      onChange={(e) => setSelectedFont(e.target.value)}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                    >
                      <option value="Heebo">Heebo</option>
                      <option value="Rubik">Rubik</option>
                      <option value="Assistant">Assistant</option>
                      <option value="Alef">Alef</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">גודל</span>
                    <select
                      value={selectedFontSize}
                      onChange={(e) => setSelectedFontSize(e.target.value)}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                    >
                      <option value="9pt">9</option>
                      <option value="10pt">10</option>
                      <option value="11pt">11</option>
                      <option value="12pt">12</option>
                      <option value="13pt">13</option>
                      <option value="14pt">14</option>
                      <option value="16pt">16</option>
                      <option value="18pt">18</option>
                      <option value="20pt">20</option>
                    </select>
                  </div>
                </div>

                <div className="w-full overflow-auto">
                  <div
                    className="rounded-md border border-gray-300 bg-white overflow-hidden"
                    style={{ width: `${editorBox.widthPx}px`, height: `${editorBox.heightPx}px` }}
                  >
                    <div
                      style={{
                        width: `${labelWcm}cm`,
                        height: `${labelHcm}cm`,
                        transformOrigin: 'top right',
                        transform: `scale(${editorBox.scale})`,
                        fontFamily: `${selectedFont}, Heebo, system-ui, sans-serif`,
                        fontSize: selectedFontSize,
                        lineHeight: 1.2,
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: verticalJustify,
                        }}
                      >
                        <div style={{ width: '100%' }}>
                          <EditorContent editor={editor} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between gap-4 mb-2">
                <div className="text-sm font-medium text-gray-700">תצוגה מקדימה (שורה אחת)</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRowIndex((i) => Math.max(0, i - 1))}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    disabled={rowIndex <= 0}
                  >
                    שורה קודמת
                  </button>
                  <button
                    type="button"
                    onClick={() => setRowIndex((i) => Math.min(Math.max(0, bodyRows.length - 1), i + 1))}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    disabled={rowIndex >= bodyRows.length - 1}
                  >
                    שורה הבאה
                  </button>
                  <div className="text-sm text-gray-600">
                    שורה: {bodyRows.length ? rowIndex + 1 : 0}/{bodyRows.length}
                  </div>
                </div>
              </div>

              <div className="w-full overflow-auto">
                <div
                  className="rounded-md border border-gray-200 bg-gray-50 overflow-hidden"
                  style={{
                    width: `${previewBox.widthPx}px`,
                    height: `${previewBox.heightPx}px`,
                  }}
                >
                  <div
                    style={{
                      width: `${labelWcm}cm`,
                      height: `${labelHcm}cm`,
                      transformOrigin: 'top right',
                      transform: `scale(${previewBox.scale})`,
                      fontFamily: `${selectedFont}, Heebo, system-ui, sans-serif`,
                      fontSize: selectedFontSize,
                      lineHeight: 1.2,
                      position: 'relative',
                      overflow: 'hidden',
                      wordBreak: 'break-word',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: verticalJustify,
                        wordBreak: 'break-word',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      <div style={{ width: '100%' }} dangerouslySetInnerHTML={{ __html: previewHtml }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-700">נא להעלות קובץ כדי להתחיל.</div>
        </div>
      )}
    </div>
  );
};

export default LabelEditor;

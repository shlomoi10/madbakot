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
          'inline-flex items-center rounded-full border border-gray-300 bg-white px-2 py-0.5 text-sm text-gray-700 select-none',
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

const LabelEditor = ({ config, file, onBack, onFileUpdate, onReupload, onOpenSettings }) => {
  const [hasHeader, setHasHeader] = useState(file?.hasHeader ?? true);
  const [selectedFont, setSelectedFont] = useState('Heebo');
  const [selectedFontSize, setSelectedFontSize] = useState('16px');
  const [docJson, setDocJson] = useState(null);
  const [rowIndex, setRowIndex] = useState(0);

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
    content: '<p></p>',
    editorProps: {
      attributes: {
        class:
          'min-h-[180px] rounded-md border border-gray-300 p-3 focus:outline-none',
        style: `font-family: ${selectedFont}, Heebo, system-ui, sans-serif;`,
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
      setDocJson(ed.getJSON());
    },
  });

  useEffect(() => {
    ensureGoogleFontLoaded(selectedFont);
    if (editor) {
      editor.commands.setFontFamily(selectedFont);
    }
  }, [selectedFont, editor]);

  useEffect(() => {
    if (editor) {
      editor.commands.setFontSize(selectedFontSize);
    }
  }, [selectedFontSize, editor]);

  useEffect(() => {
    setHasHeader(file?.hasHeader ?? true);
  }, [file?.hasHeader]);

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
    const labelW = Number(config?.labelWidthCm) || 5;
    const labelH = Number(config?.labelHeightCm) || 3;
    const maxW = 520;
    const maxH = 220;
    const scale = Math.min(maxW / labelW, maxH / labelH);

    return {
      widthPx: Math.max(160, Math.round(labelW * scale)),
      heightPx: Math.max(90, Math.round(labelH * scale)),
    };
  }, [config?.labelWidthCm, config?.labelHeightCm]);

  const handleHeaderChange = (checked) => {
    setHasHeader(checked);
    setRowIndex(0);
    if (file && onFileUpdate) {
      onFileUpdate({
        ...file,
        hasHeader: checked,
      });
    }
  };

  const toolbarButtonClass =
    'rounded-md border border-gray-300 px-2.5 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50';

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

              <div className="mt-4 text-xs text-gray-500">
                גרור צ'יפ אל העורך כדי להוסיף שדה
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
                      <option value="12px">12</option>
                      <option value="14px">14</option>
                      <option value="16px">16</option>
                      <option value="18px">18</option>
                      <option value="20px">20</option>
                      <option value="24px">24</option>
                      <option value="28px">28</option>
                      <option value="32px">32</option>
                    </select>
                  </div>
                </div>

                <EditorContent editor={editor} />
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
                  className="rounded-md border border-gray-200 bg-gray-50 p-3"
                  style={{
                    width: `${previewBox.widthPx}px`,
                    height: `${previewBox.heightPx}px`,
                    fontFamily: `${selectedFont}, Heebo, system-ui, sans-serif`,
                  }}
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
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

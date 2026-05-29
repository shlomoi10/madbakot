import React from 'react';
import TemplateEditor from './TemplateEditor';

const LabelEditor = ({
  config,
  file,
  onBack,
  onFileUpdate,
  onReupload,
  onOpenSettings,
  editorSettings,
  onEditorSettingsChange,
}) => {
  const labelWcm = Number(config?.labelWidthCm) || 5;
  const labelHcm = Number(config?.labelHeightCm) || 3;

  const handleSave = (ctx) => {
    const payload = {
      version: 1,
      kind: 'label',
      type: 'madbakot-label-settings',
      savedAt: new Date().toISOString(),
      config,
      hasHeader: ctx.hasHeader,
      editorDoc: ctx.editor?.getJSON() ?? ctx.docJson,
      font: ctx.selectedFont,
      fontSize: ctx.selectedFontSize,
      verticalAlign: ctx.verticalAlign,
    };

    ctx.downloadJson(payload, 'label-settings.json');
  };

  const handlePrint = (ctx) => {
    if (!ctx.editor || !config || !file) return;

    const verticalJustify =
      ctx.verticalAlign === 'bottom' ? 'flex-end' : ctx.verticalAlign === 'middle' ? 'center' : 'flex-start';

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

    const templateHtml = ctx.editor.getHTML();
    const labelsPerPage = Math.max(1, rows * cols);

    const filled = ctx.bodyRows.map((row) => ctx.replaceVariablesInHtml(templateHtml, row));

    const pages = [];
    for (let i = 0; i < filled.length; i += labelsPerPage) {
      const slice = filled.slice(i, i + labelsPerPage);
      pages.push(slice);
    }

    ctx.ensureGoogleFontLoaded(ctx.selectedFont);

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
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(ctx.selectedFont).replaceAll(
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
              font-family: ${ctx.selectedFont}, Heebo, system-ui, sans-serif;
              font-size: ${ctx.selectedFontSize};
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

  return (
    <TemplateEditor
      title="עריכת מדבקות"
      file={file}
      onBack={onBack}
      onFileUpdate={onFileUpdate}
      onReupload={onReupload}
      onOpenSettings={onOpenSettings}
      editorSettings={editorSettings}
      onEditorSettingsChange={onEditorSettingsChange}
      boxWidthCm={labelWcm}
      boxHeightCm={labelHcm}
      isSaveDisabled={!config}
      isPrintDisabled={!config || !file || !file?.data?.length}
      onSave={handleSave}
      onPrint={handlePrint}
    />
  );
};

export default LabelEditor;

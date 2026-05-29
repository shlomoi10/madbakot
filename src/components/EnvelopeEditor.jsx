import React, { useEffect, useMemo, useRef, useState } from 'react';
import TemplateEditor from './TemplateEditor';

const clampNonNegative = (n, fallback) => {
  if (!Number.isFinite(n)) return fallback;
  return n >= 0 ? n : fallback;
};

const EnvelopeEditor = ({ config, file, onBack, onFileUpdate, onReupload, onOpenSettings }) => {
  const envWcm = clampNonNegative(Number(config?.envelopeWidthCm), 22);
  const envHcm = clampNonNegative(Number(config?.envelopeHeightCm), 11);
  const boxWcm = clampNonNegative(Number(config?.textBoxWidthCm), 10);
  const boxHcm = clampNonNegative(Number(config?.textBoxHeightCm), 5);

  const [isPrintSettingsOpen, setIsPrintSettingsOpen] = useState(false);
  const [printMode, setPrintMode] = useState('original');
  const [rotationDeg, setRotationDeg] = useState(0);

  const [boxLeftCm, setBoxLeftCm] = useState(() => Math.max(0, (envWcm - boxWcm) / 2));
  const [boxTopCm, setBoxTopCm] = useState(() => Math.max(0, (envHcm - boxHcm) / 2));

  useEffect(() => {
    setBoxLeftCm(Math.max(0, (envWcm - boxWcm) / 2));
    setBoxTopCm(Math.max(0, (envHcm - boxHcm) / 2));
  }, [envWcm, envHcm, boxWcm, boxHcm]);

  const [lastCtx, setLastCtx] = useState(null);

  const envelopePreview = useMemo(() => {
    const maxW = 520;
    const maxH = 320;
    const scale = Math.min(maxW / (envWcm || 1), maxH / (envHcm || 1));
    return {
      scale,
      envPxW: Math.max(1, Math.round(envWcm * scale)),
      envPxH: Math.max(1, Math.round(envHcm * scale)),
      boxPxW: Math.max(1, Math.round(boxWcm * scale)),
      boxPxH: Math.max(1, Math.round(boxHcm * scale)),
      boxPxL: Math.max(0, Math.round(boxLeftCm * scale)),
      boxPxT: Math.max(0, Math.round(boxTopCm * scale)),
    };
  }, [envWcm, envHcm, boxWcm, boxHcm, boxLeftCm, boxTopCm]);

  const dragStateRef = useRef(null);

  const handleStartDrag = (e) => {
    e.preventDefault();
    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startLeftCm: boxLeftCm,
      startTopCm: boxTopCm,
    };
  };

  useEffect(() => {
    const onMove = (e) => {
      const st = dragStateRef.current;
      if (!st) return;

      const dxPx = e.clientX - st.startX;
      const dyPx = e.clientY - st.startY;
      const scale = envelopePreview.scale || 1;
      const dxCm = dxPx / scale;
      const dyCm = dyPx / scale;

      const maxLeft = Math.max(0, envWcm - boxWcm);
      const maxTop = Math.max(0, envHcm - boxHcm);

      setBoxLeftCm(Math.min(Math.max(0, st.startLeftCm + dxCm), maxLeft));
      setBoxTopCm(Math.min(Math.max(0, st.startTopCm + dyCm), maxTop));
    };

    const onUp = () => {
      dragStateRef.current = null;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [envelopePreview.scale, envWcm, envHcm, boxWcm, boxHcm]);

  const handleSave = (ctx) => {
    const payload = {
      version: 1,
      kind: 'envelope',
      type: 'madbakot-envelope-settings',
      savedAt: new Date().toISOString(),
      config,
      hasHeader: ctx.hasHeader,
      editorDoc: ctx.editor?.getJSON() ?? ctx.docJson,
      font: ctx.selectedFont,
      fontSize: ctx.selectedFontSize,
      verticalAlign: ctx.verticalAlign,
      print: {
        boxLeftCm,
        boxTopCm,
        printMode,
        rotationDeg,
      },
    };

    ctx.downloadJson(payload, 'envelope-settings.json');
  };

  const doPrint = () => {
    const ctx = lastCtx;
    if (!ctx?.editor || !config || !file || !ctx.bodyRows?.length) return;

    const verticalJustify =
      ctx.verticalAlign === 'bottom' ? 'flex-end' : ctx.verticalAlign === 'middle' ? 'center' : 'flex-start';

    const templateHtml = ctx.editor.getHTML();
    const filled = ctx.bodyRows.map((row) => ctx.replaceVariablesInHtml(templateHtml, row));
    const fontLink = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(ctx.selectedFont).replaceAll(
      '%20',
      '+'
    )}:wght@300;400;500;700&display=swap`;

    const pageWmm = printMode === 'a4' ? 210 : envWcm * 10;
    const pageHmm = printMode === 'a4' ? 297 : envHcm * 10;

    const envStyle = `width: ${envWcm}cm; height: ${envHcm}cm; position: absolute; top: 0; ${printMode === 'a4' ? 'right: 0;' : 'left: 0;'} overflow: hidden;`;
    const rotateStyle = rotationDeg ? `transform: rotate(${rotationDeg}deg); transform-origin: top left;` : '';

    const textboxStyle = `position: absolute; left: ${boxLeftCm}cm; top: ${boxTopCm}cm; width: ${boxWcm}cm; height: ${boxHcm}cm; overflow: hidden; font-family: ${ctx.selectedFont}, Heebo, system-ui, sans-serif; font-size: ${ctx.selectedFontSize}; line-height: 1.2; word-break: break-word; overflow-wrap: anywhere; display: flex; flex-direction: column; justify-content: ${verticalJustify};`;

    const pagesHtml = filled
      .map((content, idx) => {
        return `
          <div class="page" data-idx="${idx}">
            <div class="env" style="${envStyle} ${rotateStyle}">
              <div class="textbox" style="${textboxStyle}">${content}</div>
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
          <title>Print Envelopes</title>
          <link rel="stylesheet" href="${fontLink}" />
          <style>
            @page { size: ${pageWmm}mm ${pageHmm}mm; margin: 0; }
            html, body { margin: 0; padding: 0; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .page {
              position: relative;
              width: ${pageWmm}mm;
              height: ${pageHmm}mm;
              page-break-after: always;
            }
            .env { box-sizing: border-box; }
            p { margin: 0; }
          </style>
        </head>
        <body>
          ${pagesHtml}
          <script>
            window.onload = () => { window.focus(); window.print(); };
          </script>
        </body>
      </html>
    `;

    ctx.ensureGoogleFontLoaded(ctx.selectedFont);

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
    <>
      <TemplateEditor
        title="עריכת מעטפות"
        file={file}
        onBack={onBack}
        onFileUpdate={onFileUpdate}
        onReupload={onReupload}
        onOpenSettings={onOpenSettings}
        boxWidthCm={boxWcm}
        boxHeightCm={boxHcm}
        isSaveDisabled={!config}
        isPrintDisabled={!config || !file || !file?.data?.length}
        onSave={(ctx) => {
          setLastCtx(ctx);
          handleSave(ctx);
        }}
        onPrint={(ctx) => {
          setLastCtx(ctx);
          setIsPrintSettingsOpen(true);
        }}
      />

      {isPrintSettingsOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold">הגדרות הדפסה</h3>
              <button
                type="button"
                onClick={() => setIsPrintSettingsOpen(false)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-50"
              >
                סגור
              </button>
            </div>

            <div className="p-4 space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-700 mb-3">מיקום תיבת הטקסט (גרירה)</div>
                <div className="w-full overflow-auto flex justify-center">
                  <div
                    className="relative bg-white border border-gray-900"
                    style={{ width: `${envelopePreview.envPxW}px`, height: `${envelopePreview.envPxH}px` }}
                  >
                    <div
                      className="absolute border-2 border-blue-600/80 bg-blue-500/10 cursor-move"
                      style={{
                        left: `${envelopePreview.boxPxL}px`,
                        top: `${envelopePreview.boxPxT}px`,
                        width: `${envelopePreview.boxPxW}px`,
                        height: `${envelopePreview.boxPxH}px`,
                      }}
                      onMouseDown={handleStartDrag}
                      title="גרור כדי למקם"
                    />
                  </div>
                </div>

                <div className="mt-3 text-sm text-gray-700">
                  X: {boxLeftCm.toFixed(2)} ס"מ, Y: {boxTopCm.toFixed(2)} ס"מ
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">גודל דף</div>
                    <select
                      value={printMode}
                      onChange={(e) => setPrintMode(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                    >
                      <option value="original">גודל מקורי (מעטפה)</option>
                      <option value="a4">A4</option>
                    </select>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">כיוון הדפסה</div>
                    <select
                      value={String(rotationDeg)}
                      onChange={(e) => setRotationDeg(Number(e.target.value))}
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                    >
                      <option value="0">0°</option>
                      <option value="90">90°</option>
                      <option value="180">180°</option>
                      <option value="270">270°</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => {
                        setIsPrintSettingsOpen(false);
                        doPrint();
                      }}
                      className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                      disabled={!lastCtx?.editor || !config || !file || !lastCtx?.bodyRows?.length}
                    >
                      הדפסה
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EnvelopeEditor;

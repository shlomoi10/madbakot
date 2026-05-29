import React, { useMemo, useState } from 'react';

const PAGE_PRESETS = [
  { value: 'A4', label: 'A4', widthMm: 210, heightMm: 297 },
  { value: 'Letter', label: 'Letter', widthMm: 216, heightMm: 279 },
  { value: 'A5', label: 'A5', widthMm: 148, heightMm: 210 },
  { value: 'Legal', label: 'Legal', widthMm: 216, heightMm: 356 },
  { value: 'Custom', label: 'מותאם אישית', widthMm: null, heightMm: null },
];

const mmToCm = (mm) => mm / 10;
const cmToMm = (cm) => cm * 10;

const clampNonNegative = (n) => (Number.isFinite(n) && n >= 0 ? n : 0);
const clampNumber = (n) => (Number.isFinite(n) ? n : 0);

const LabelSetup = ({ initialConfig, onSave, onCancel, onImport }) => {
  const [pagePreset, setPagePreset] = useState(initialConfig?.pagePreset ?? 'A4');
  const [pageWidthCm, setPageWidthCm] = useState(
    initialConfig?.pageWidthCm ?? mmToCm(210)
  );
  const [pageHeightCm, setPageHeightCm] = useState(
    initialConfig?.pageHeightCm ?? mmToCm(297)
  );

  const [labelWidthCm, setLabelWidthCm] = useState(initialConfig?.labelWidthCm ?? 3.4);
  const [labelHeightCm, setLabelHeightCm] = useState(initialConfig?.labelHeightCm ?? 2.2);

  const [marginLeftCm, setMarginLeftCm] = useState(initialConfig?.marginLeftCm ?? 0);
  const [marginRightCm, setMarginRightCm] = useState(initialConfig?.marginRightCm ?? 0);
  const [marginTopCm, setMarginTopCm] = useState(initialConfig?.marginTopCm ?? 0);
  const [marginBottomCm, setMarginBottomCm] = useState(initialConfig?.marginBottomCm ?? 0);

  const [cols, setCols] = useState(initialConfig?.cols ?? 2);
  const [rows, setRows] = useState(initialConfig?.rows ?? 7);

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const kind = data.kind;
      const isKindValid = kind ? kind === 'label' : data.type === 'madbakot-label-settings';
      if (!isKindValid || !data.config) {
        alert('קובץ לא תקין');
        return;
      }

      const cfg = data.config;
      setPagePreset(cfg.pagePreset ?? 'A4');
      setPageWidthCm(cfg.pageWidthCm ?? mmToCm(210));
      setPageHeightCm(cfg.pageHeightCm ?? mmToCm(297));
      setLabelWidthCm(cfg.labelWidthCm ?? 3.4);
      setLabelHeightCm(cfg.labelHeightCm ?? 2.2);
      setMarginLeftCm(cfg.marginLeftCm ?? 0);
      setMarginRightCm(cfg.marginRightCm ?? 0);
      setMarginTopCm(cfg.marginTopCm ?? 0);
      setMarginBottomCm(cfg.marginBottomCm ?? 0);
      setCols(cfg.cols ?? 2);
      setRows(cfg.rows ?? 7);

      if (onImport) {
        onImport({
          font: data.font ?? 'Heebo',
          fontSize: data.fontSize ?? '12pt',
          verticalAlign: data.verticalAlign ?? 'top',
          editorDoc: data.editorDoc ?? null,
          hasHeader: data.hasHeader ?? true,
        });
      }
    } catch (err) {
      alert('שגיאה בקריאת הקובץ');
    }

    e.target.value = '';
  };

  const preset = useMemo(
    () => PAGE_PRESETS.find((p) => p.value === pagePreset) ?? PAGE_PRESETS[0],
    [pagePreset]
  );

  const effectivePageWidthMm = useMemo(() => {
    if (preset.value !== 'Custom') return preset.widthMm;
    return clampNonNegative(cmToMm(Number(pageWidthCm)));
  }, [preset.value, preset.widthMm, pageWidthCm]);

  const effectivePageHeightMm = useMemo(() => {
    if (preset.value !== 'Custom') return preset.heightMm;
    return clampNonNegative(cmToMm(Number(pageHeightCm)));
  }, [preset.value, preset.heightMm, pageHeightCm]);

  const effectivePageWidthCm = mmToCm(effectivePageWidthMm);
  const effectivePageHeightCm = mmToCm(effectivePageHeightMm);

  const safe = useMemo(() => {
    const w = clampNonNegative(Number(effectivePageWidthCm));
    const h = clampNonNegative(Number(effectivePageHeightCm));

    const ml = clampNumber(Number(marginLeftCm));
    const mr = clampNumber(Number(marginRightCm));
    const mt = clampNumber(Number(marginTopCm));
    const mb = clampNumber(Number(marginBottomCm));

    const lw = clampNonNegative(Number(labelWidthCm));
    const lh = clampNonNegative(Number(labelHeightCm));

    const c = Math.max(1, Math.floor(Number(cols) || 1));
    const r = Math.max(1, Math.floor(Number(rows) || 1));

    return {
      pagePreset: preset.value,
      pageWidthCm: w,
      pageHeightCm: h,
      marginLeftCm: ml,
      marginRightCm: mr,
      marginTopCm: mt,
      marginBottomCm: mb,
      labelWidthCm: lw,
      labelHeightCm: lh,
      cols: c,
      rows: r,
    };
  }, [
    effectivePageWidthCm,
    effectivePageHeightCm,
    marginLeftCm,
    marginRightCm,
    marginTopCm,
    marginBottomCm,
    labelWidthCm,
    labelHeightCm,
    cols,
    rows,
    preset.value,
  ]);

  const preview = useMemo(() => {
    const previewMaxW = 520;
    const previewMaxH = 320;

    const scale = Math.min(previewMaxW / (safe.pageWidthCm || 1), previewMaxH / (safe.pageHeightCm || 1));
    const pagePxW = Math.max(1, safe.pageWidthCm * scale);
    const pagePxH = Math.max(1, safe.pageHeightCm * scale);

    const ml = safe.marginLeftCm * scale;
    const mr = safe.marginRightCm * scale;
    const mt = safe.marginTopCm * scale;
    const mb = safe.marginBottomCm * scale;

    const innerW = Math.max(0, pagePxW - ml - mr);
    const innerH = Math.max(0, pagePxH - mt - mb);

    const lw = safe.labelWidthCm * scale;
    const lh = safe.labelHeightCm * scale;

    return {
      pagePxW,
      pagePxH,
      scale,
      ml,
      mr,
      mt,
      mb,
      innerW,
      innerH,
      lw,
      lh,
    };
  }, [safe]);

  const canFit = useMemo(() => {
    const availableW = safe.pageWidthCm - safe.marginLeftCm - safe.marginRightCm;
    const availableH = safe.pageHeightCm - safe.marginTopCm - safe.marginBottomCm;

    return safe.cols * safe.labelWidthCm <= availableW + 0.0001 && safe.rows * safe.labelHeightCm <= availableH + 0.0001;
  }, [safe]);

  const handlePresetChange = (value) => {
    setPagePreset(value);
    const p = PAGE_PRESETS.find((x) => x.value === value);
    if (p && p.value !== 'Custom') {
      setPageWidthCm(mmToCm(p.widthMm));
      setPageHeightCm(mmToCm(p.heightMm));
    }
  };

  const handleReset = () => {
    setPagePreset('A4');
    setPageWidthCm(mmToCm(210));
    setPageHeightCm(mmToCm(297));
    setLabelWidthCm(3.4);
    setLabelHeightCm(2.2);
    setMarginLeftCm(0);
    setMarginRightCm(0);
    setMarginTopCm(0);
    setMarginBottomCm(0);
    setCols(2);
    setRows(7);
  };

  return (
    <div className="w-full">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-[560px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">הגדרת דף מדבקות</h2>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              איפוס הגדרות
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">גודל עמוד</label>
                <select
                  value={pagePreset}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  {PAGE_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              {pagePreset === 'Custom' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">רוחב עמוד (ס״מ)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={pageWidthCm}
                      onChange={(e) => setPageWidthCm(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">גובה עמוד (ס״מ)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={pageHeightCm}
                      onChange={(e) => setPageHeightCm(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                    />
                  </div>
                </>
              ) : (
                <div className="sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">מידות (ס״מ)</label>
                  <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    {safe.pageWidthCm.toFixed(2)} × {safe.pageHeightCm.toFixed(2)}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">רוחב מדבקה (ס״מ)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={labelWidthCm}
                  onChange={(e) => setLabelWidthCm(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">גובה מדבקה (ס״מ)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={labelHeightCm}
                  onChange={(e) => setLabelHeightCm(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">שוליים שמאל (ס״מ)</label>
                <input
                  type="number"
                  step="0.1"
                  min="-100"
                  value={marginLeftCm}
                  onChange={(e) => setMarginLeftCm(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">שוליים ימין (ס״מ)</label>
                <input
                  type="number"
                  step="0.1"
                  min="-100"
                  value={marginRightCm}
                  onChange={(e) => setMarginRightCm(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">שוליים למעלה (ס״מ)</label>
                <input
                  type="number"
                  step="0.1"
                  min="-100"
                  value={marginTopCm}
                  onChange={(e) => setMarginTopCm(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">שוליים למטה (ס״מ)</label>
                <input
                  type="number"
                  step="0.1"
                  min="-100"
                  value={marginBottomCm}
                  onChange={(e) => setMarginBottomCm(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">מספר מדבקות לרוחב</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={cols}
                  onChange={(e) => setCols(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">מספר מדבקות לאורך</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={rows}
                  onChange={(e) => setRows(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-sm">
                {canFit ? (
                  <span className="text-green-700">הכל נכנס בתוך הדף</span>
                ) : (
                  <span className="text-red-700">שימו לב: המדבקות/שוליים לא נכנסים בתוך הדף</span>
                )}
              </div>

              <div className="flex gap-3">
                <label className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 cursor-pointer">
                  ייבוא הגדרות
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={onCancel}
                  className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                >
                  ביטול
                </button>
                <button
                  type="button"
                  onClick={() => onSave(safe)}
                  className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  שמור
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full lg:flex-1">
          <h2 className="text-2xl font-bold mb-4">תצוגה מקדימה</h2>

          <div className="bg-white border border-gray-200 rounded-lg p-4 overflow-auto">
            <div className="w-full flex justify-center">
              <div
                className="relative bg-white border border-gray-900"
                style={{ width: `${preview.pagePxW}px`, height: `${preview.pagePxH}px` }}
              >
                <div
                  className="absolute border border-dashed border-gray-400"
                  style={{
                    left: `${preview.ml}px`,
                    top: `${preview.mt}px`,
                    width: `${preview.innerW}px`,
                    height: `${preview.innerH}px`,
                  }}
                />

                {Array.from({ length: safe.rows }).map((_, rowIdx) =>
                  Array.from({ length: safe.cols }).map((__, colIdx) => {
                    const left = preview.ml + colIdx * preview.lw;
                    const top = preview.mt + rowIdx * preview.lh;

                    return (
                      <div
                        key={`${rowIdx}-${colIdx}`}
                        className="absolute border border-blue-500/70 bg-blue-500/10"
                        style={{
                          left: `${left}px`,
                          top: `${top}px`,
                          width: `${preview.lw}px`,
                          height: `${preview.lh}px`,
                        }}
                      />
                    );
                  })
                )}
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              עמוד: {safe.pageWidthCm.toFixed(2)}×{safe.pageHeightCm.toFixed(2)} ס״מ | מדבקה: {safe.labelWidthCm.toFixed(2)}×{safe.labelHeightCm.toFixed(2)} ס״מ | {safe.cols}×{safe.rows}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabelSetup;

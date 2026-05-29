import React, { useMemo, useState } from 'react';

const mmToCm = (mm) => mm / 10;

const DEFAULTS = {
  envelopeWidthCm: mmToCm(220),
  envelopeHeightCm: mmToCm(110),
  textBoxWidthCm: 10,
  textBoxHeightCm: 5,
};

const EnvelopeSetup = ({ initialConfig, onSave, onCancel }) => {
  const [envelopeWidthCm, setEnvelopeWidthCm] = useState(
    initialConfig?.envelopeWidthCm ?? DEFAULTS.envelopeWidthCm
  );
  const [envelopeHeightCm, setEnvelopeHeightCm] = useState(
    initialConfig?.envelopeHeightCm ?? DEFAULTS.envelopeHeightCm
  );

  const [textBoxWidthCm, setTextBoxWidthCm] = useState(
    initialConfig?.textBoxWidthCm ?? DEFAULTS.textBoxWidthCm
  );
  const [textBoxHeightCm, setTextBoxHeightCm] = useState(
    initialConfig?.textBoxHeightCm ?? DEFAULTS.textBoxHeightCm
  );

  const handleReset = () => {
    setEnvelopeWidthCm(DEFAULTS.envelopeWidthCm);
    setEnvelopeHeightCm(DEFAULTS.envelopeHeightCm);
    setTextBoxWidthCm(DEFAULTS.textBoxWidthCm);
    setTextBoxHeightCm(DEFAULTS.textBoxHeightCm);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const kind = data.kind;
      const isKindValid = kind ? kind === 'envelope' : data.type === 'madbakot-envelope-settings';
      if (!isKindValid || !data.config) {
        alert('קובץ לא תקין');
        return;
      }

      const cfg = data.config;
      setEnvelopeWidthCm(cfg.envelopeWidthCm ?? DEFAULTS.envelopeWidthCm);
      setEnvelopeHeightCm(cfg.envelopeHeightCm ?? DEFAULTS.envelopeHeightCm);
      setTextBoxWidthCm(cfg.textBoxWidthCm ?? DEFAULTS.textBoxWidthCm);
      setTextBoxHeightCm(cfg.textBoxHeightCm ?? DEFAULTS.textBoxHeightCm);
    } catch {
      alert('שגיאה בקריאת הקובץ');
    }

    e.target.value = '';
  };

  const safe = useMemo(() => {
    const ew = Math.max(0, Number(envelopeWidthCm) || 0);
    const eh = Math.max(0, Number(envelopeHeightCm) || 0);
    const tw = Math.max(0, Number(textBoxWidthCm) || 0);
    const th = Math.max(0, Number(textBoxHeightCm) || 0);

    return {
      envelopeWidthCm: ew,
      envelopeHeightCm: eh,
      textBoxWidthCm: tw,
      textBoxHeightCm: th,
    };
  }, [envelopeWidthCm, envelopeHeightCm, textBoxWidthCm, textBoxHeightCm]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="text-2xl font-bold">הגדרת מעטפות</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="rounded-md border border-gray-300 px-3 py-2 text-gray-700 hover:bg-gray-50"
          >
            איפוס הגדרות
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            ביטול
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">רוחב מעטפה (ס״מ)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={envelopeWidthCm}
              onChange={(e) => setEnvelopeWidthCm(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">גובה מעטפה (ס״מ)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={envelopeHeightCm}
              onChange={(e) => setEnvelopeHeightCm(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">רוחב תיבת טקסט (ס״מ)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={textBoxWidthCm}
              onChange={(e) => setTextBoxWidthCm(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">גובה תיבת טקסט (ס״מ)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={textBoxHeightCm}
              onChange={(e) => setTextBoxHeightCm(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <label className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 cursor-pointer w-fit">
            ייבוא הגדרות
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>

          <button
            type="button"
            onClick={() => onSave(safe)}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            המשך
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnvelopeSetup;

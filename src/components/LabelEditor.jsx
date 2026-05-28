import React, { useState } from 'react';

const LabelEditor = ({ config, file, onBack, onFileUpdate }) => {
  const [hasHeader, setHasHeader] = useState(file?.hasHeader ?? true);

  const handleHeaderChange = (checked) => {
    setHasHeader(checked);
    if (file && onFileUpdate) {
      onFileUpdate({
        ...file,
        hasHeader: checked,
      });
    }
  };

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
          <div className="flex items-center gap-3 mb-4">
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

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-sm text-gray-700">
          השלב הבא: כאן נבנה את קומפוננטת העריכה אחרי ששומרים את ההגדרות.
        </div>
      </div>
    </div>
  );
};

export default LabelEditor;

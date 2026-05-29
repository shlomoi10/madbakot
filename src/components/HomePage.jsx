import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, StickyNote } from 'lucide-react';

const HomePage = ({ onSelectEnvelopes, onSelectLabels }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col md:flex-row gap-6 justify-center items-center min-h-[60vh]">
      <button
        type="button"
        onClick={onSelectEnvelopes}
        className="text-right bg-white rounded-lg shadow-lg p-8 w-full max-w-md hover:shadow-xl transition-shadow duration-300 cursor-pointer border border-gray-200"
      >
        <div className="flex items-center gap-4 mb-4">
          <Mail className="w-12 h-12 text-purple-600" />
          <h3 className="text-2xl font-bold text-gray-800">מעטפות</h3>
        </div>
        <p className="text-gray-600">הדפסה ישירות על מעטפה</p>
      </button>
      
      <button
        type="button"
        onClick={() => navigate('/madbakot')}
        className="text-right bg-white rounded-lg shadow-lg p-8 w-full max-w-md hover:shadow-xl transition-shadow duration-300 cursor-pointer border border-gray-200"
      >
        <div className="flex items-center gap-4 mb-4">
          <StickyNote className="w-12 h-12 text-purple-600" />
          <h3 className="text-2xl font-bold text-gray-800">מדבקות</h3>
        </div>
        <p className="text-gray-600">הדפסה על דף מדבקות</p>
      </button>
    </div>
  );
};

export default HomePage;

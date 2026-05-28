import React from 'react';
import { Mail, Tag } from 'lucide-react';

const HomePage = () => {
  return (
    <div className="flex flex-col md:flex-row gap-6 justify-center items-center min-h-[60vh]">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md hover:shadow-xl transition-shadow duration-300 cursor-pointer border border-gray-200">
        <div className="flex items-center gap-4 mb-4">
          <Mail className="w-12 h-12 text-purple-600" />
          <h3 className="text-2xl font-bold text-gray-800">מעטפות</h3>
        </div>
        <p className="text-gray-600">הדפסה ישירות על מעטפה</p>
      </div>
      
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md hover:shadow-xl transition-shadow duration-300 cursor-pointer border border-gray-200">
        <div className="flex items-center gap-4 mb-4">
          <Tag className="w-12 h-12 text-purple-600" />
          <h3 className="text-2xl font-bold text-gray-800">מדבקות</h3>
        </div>
        <p className="text-gray-600">הדפסה על דף מדבקות</p>
      </div>
    </div>
  );
};

export default HomePage;

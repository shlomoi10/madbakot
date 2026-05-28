import React from 'react';

const Header = () => {
  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex items-center gap-4">
        <img src="/logo.svg" alt="לוגו" className="w-16 h-16" />
        <h1 className="text-xl font-bold text-gray-800 m-0">הדפסה על מעטפות ומדבקות</h1>
      </div>
    </header>
  );
};

export default Header;

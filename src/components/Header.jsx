import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const timeoutRef = useRef(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 2000);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex items-center gap-4">
        <div className="relative w-16 h-16 cursor-pointer" onClick={() => navigate('/')} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          <img 
            src="/logo.svg" 
            alt="לוגו" 
            className={`absolute inset-0 w-16 h-16 transition-opacity duration-500 ${isHovered ? 'opacity-0' : 'opacity-100'}`}
          />
          <img 
            src="/logo2.svg" 
            alt="לוגו" 
            className={`absolute inset-0 w-16 h-16 transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
          />
        </div>
        <h1 className="text-xl font-bold text-gray-800 m-0">הדפסה על מעטפות ומדבקות</h1>
      </div>
    </header>
  );
};

export default Header;

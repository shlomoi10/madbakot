import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex items-center gap-4">
        <img 
          src={isHovered ? "/logo2.svg" : "/logo.svg"} 
          alt="לוגו" 
          className="w-16 h-16 cursor-pointer" 
          onClick={() => navigate('/')}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        />
        <h1 className="text-xl font-bold text-gray-800 m-0">הדפסה על מעטפות ומדבקות</h1>
      </div>
    </header>
  );
};

export default Header;

import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isLightMode, setIsLightMode] = useState(() => {
    return localStorage.getItem('theme') !== 'dark';
  });

  const toggleTheme = () => setIsLightMode(!isLightMode);

  useEffect(() => {
    localStorage.setItem('theme', isLightMode ? 'light' : 'dark');
  }, [isLightMode]);

  const t = {
    isLightMode,
    bg: isLightMode ? 'bg-[#E5ECE7]' : 'bg-[#0A0D10]',
    textMain: isLightMode ? 'text-[#1D2A23]' : 'text-white',
    textMuted: isLightMode ? 'text-[#6B7A74]' : 'text-[#8A9B96]',
    innerBg: isLightMode ? 'bg-[#F9FBF9]' : 'bg-[#0A0D10]',
    cardBg: isLightMode ? 'bg-white border-[#F0F4F1] shadow-[0_4px_24px_rgba(0,0,0,0.03)]' : 'bg-[#151B1F] border-white/[0.04] shadow-lg',
    cardBorder: isLightMode ? 'border-[#F0F4F1]' : 'border-white/[0.05]',
    accentText: isLightMode ? 'text-[#6C9A7D]' : 'text-[#2CD87D]',
    accentBg: isLightMode ? 'bg-[#98BAA3]/20' : 'bg-[#2CD87D]/20',
    accentBorder: isLightMode ? 'border-[#98BAA3]/40' : 'border-[#2CD87D]/30',
    donutGradient: isLightMode 
      ? 'conic-gradient(#98BAA3 0% 45%, #E3D6B7 45% 60%, #AAC2D2 60% 75%, #9BA5B6 75% 100%)'
      : 'conic-gradient(#2CD87D 0% 45%, #00964E 45% 60%, #005F31 60% 75%, #18201B 75% 100%)',
    tooltipBg: isLightMode ? 'bg-white border-[#E5ECE7] shadow-[0_8px_24px_rgba(0,0,0,0.08)]' : 'bg-[#0F1417] border-white/[0.05] shadow-[0_10px_40px_rgba(0,0,0,0.6)]',
  };

  return (
    <ThemeContext.Provider value={{ isLightMode, toggleTheme, t }}>
      <div className={`transition-colors duration-300 w-full min-h-screen font-sans ${t.bg}`}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

export const ThemedCard = ({ children, className = '' }) => {
  const { t } = useTheme();
  return (
    <div className={`${t.cardBg} rounded-[24px] border p-6 transition-colors duration-300 ${className}`}>
      {children}
    </div>
  );
};

export const ThemeToggleButton = () => {
  const { isLightMode, toggleTheme } = useTheme();
  return (
    <button 
      onClick={toggleTheme}
      className={`fixed bottom-8 right-8 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-110 ${
        isLightMode ? 'bg-[#1D2A23] text-white' : 'bg-white text-[#0A0D10]'
      }`}
    >
      {isLightMode ? (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
      ) : (
        <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" /></svg>
      )}
    </button>
  );
};
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isLightMode, setIsLightMode] = useState(() => {
    return localStorage.getItem('theme') !== 'dark';
  });

  const toggleTheme = () => setIsLightMode(prev => !prev);

  useEffect(() => {
    localStorage.setItem('theme', isLightMode ? 'light' : 'dark');
  }, [isLightMode]);

  const t = {
    isLightMode,
    bg:          isLightMode ? 'bg-[#F2F5F2]'  : 'bg-[#070F07]',
    textMain:    isLightMode ? 'text-[#1A2A1A]' : 'text-white',
    textMuted:   isLightMode ? 'text-[#5A7A5A]' : 'text-[#7A9A7D]',
    cardBg:      isLightMode
                   ? 'bg-white border-[#E8F0E9] shadow-sm'
                   : 'bg-[#0F1F0F] border-white/[0.05]',
    cardBorder:  isLightMode ? 'border-[#E8F0E9]' : 'border-white/[0.05]',
    accentText:  isLightMode ? 'text-[#007C00]'  : 'text-[#00E676]',
    accentBg:    isLightMode ? 'bg-[#007C00]/10' : 'bg-[#007C00]/20',
    innerBg:     isLightMode ? 'bg-[#F2F5F2]'    : 'bg-[#070F07]',
    iconBg1:     isLightMode ? 'bg-[#E8F5E9] text-[#007C00]' : 'bg-[#007C00]/20 text-[#00E676]',
    iconBg2:     isLightMode ? 'bg-[#E3F2FD] text-[#1976D2]' : 'bg-[#1976D2]/15 text-[#64B5F6]',
    iconBg3:     isLightMode ? 'bg-[#FFF3E0] text-[#E65100]' : 'bg-[#FF8F00]/15 text-[#FFB74D]',
    donutGradient: isLightMode
      ? 'conic-gradient(#007C00 0% 50%, #4CAF50 50% 85%, #A5D6A7 85% 100%)'
      : 'conic-gradient(#007C00 0% 50%, #00C853 50% 85%, #004d00 85% 100%)',
    donutInner:  isLightMode ? 'bg-white'   : 'bg-[#0F1F0F]',
    tooltipBg:   isLightMode
      ? 'bg-white border border-[#E8F0E9] shadow-xl'
      : 'bg-[#152015] border border-white/10 shadow-xl',
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
    <div className={`${t.cardBg} rounded-2xl border p-6 transition-colors duration-300 ${className}`}>
      {children}
    </div>
  );
};
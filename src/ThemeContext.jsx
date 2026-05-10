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

  // ─── Elegant Green Palette ────────────────────────────────────────────────
  // Light: warm ivory/linen base, deep forest green accents
  // Dark:  deep slate base (#0F1512 — near-black with green undertone), sage accents
  const t = isLightMode ? {
    // Backgrounds
    bg:         'bg-[#F4F6F2]',         // warm off-white, slight sage tint
    innerBg:    'bg-[#FAFBF9]',
    // Cards
    cardBg:     'bg-white border-[#E3E8E1] shadow-[0_1px_4px_rgba(0,0,0,0.04)]',
    cardBorder: 'border-[#E3E8E1]',
    // Text
    textMain:   'text-[#1A2418]',       // deep forest
    textSub:    'text-[#3D4E3A]',       // dark sage
    textMuted:  'text-[#7A8C77]',       // muted sage
    // Accents
    accentText: 'text-[#2D6A4F]',       // deep emerald
    accentBg:   'bg-[#D8EDDF]',
    accentBorder:'border-[#A8CFBA]',
    accentHex:  '#2D6A4F',
    accentLight: '#D8EDDF',
    // Row / dividers
    rowHover:   'hover:bg-[#F7F9F6]',
    divider:    'border-[#EDF0EB]',
    // Chip
    chipBg:     'bg-[#EEF4EC] text-[#2D6A4F]',
    // Icon bg families
    iconBg1:    'bg-[#D8EDDF] text-[#2D6A4F]',
    iconBg2:    'bg-[#DDE9F5] text-[#2A5FA8]',
    iconBg3:    'bg-[#FAECE8] text-[#A0442A]',
    // Chart / donut
    donutGradient: 'conic-gradient(#2D6A4F 0% 50%, #74C69D 50% 72%, #B7DFCA 72% 87%, #D8EDDF 87% 100%)',
    donutInner: 'bg-white',
    tooltipBg:  'bg-white border-[#E3E8E1] shadow-[0_8px_24px_rgba(0,0,0,0.08)]',
    // Table head
    tableHead:  'bg-[#F7F9F6] border-[#EDF0EB]',
    // Input
    inputBg:    'bg-[#F4F6F2] border-[#DDE3DA] text-[#1A2418] focus:border-[#2D6A4F]/50',
    // Sidebar
    sidebarBg:  'bg-white border-[#E3E8E1]',
    navActive:  'bg-[#D8EDDF] text-[#2D6A4F]',
    navInactive:'text-[#7A8C77] hover:bg-[#F0F4EE] hover:text-[#1A2418]',
  } : {
    // Backgrounds
    bg:         'bg-[#0F1512]',         // near-black, deep forest undertone
    innerBg:    'bg-[#0F1512]',
    // Cards
    cardBg:     'bg-[#161D19] border-white/[0.05] shadow-[0_1px_8px_rgba(0,0,0,0.3)]',
    cardBorder: 'border-white/[0.05]',
    // Text
    textMain:   'text-[#E8F0E5]',       // warm near-white
    textSub:    'text-[#B0C5AA]',       // light sage
    textMuted:  'text-[#627A5C]',       // muted forest
    // Accents
    accentText: 'text-[#52B788]',       // mid-tone sage emerald
    accentBg:   'bg-[#52B788]/10',
    accentBorder:'border-[#52B788]/25',
    accentHex:  '#52B788',
    accentLight: 'rgba(82,183,136,0.12)',
    // Row / dividers
    rowHover:   'hover:bg-white/[0.025]',
    divider:    'border-white/[0.05]',
    // Chip
    chipBg:     'bg-[#52B788]/10 text-[#52B788]',
    // Icon bg families
    iconBg1:    'bg-[#52B788]/12 text-[#52B788]',
    iconBg2:    'bg-[#4A9ECC]/12 text-[#4A9ECC]',
    iconBg3:    'bg-[#E87A5D]/12 text-[#E87A5D]',
    // Chart / donut
    donutGradient: 'conic-gradient(#52B788 0% 50%, #2D6A4F 50% 72%, #1B4332 72% 87%, #0F1512 87% 100%)',
    donutInner: 'bg-[#161D19]',
    tooltipBg:  'bg-[#1C2620] border-white/[0.07] shadow-[0_8px_32px_rgba(0,0,0,0.6)]',
    // Table head
    tableHead:  'bg-[#0F1512] border-white/[0.04]',
    // Input
    inputBg:    'bg-[#0F1512] border-white/[0.06] text-[#E8F0E5] focus:border-[#52B788]/40',
    // Sidebar
    sidebarBg:  'bg-[#111814] border-white/[0.04]',
    navActive:  'bg-[#52B788]/12 text-[#52B788]',
    navInactive:'text-[#627A5C] hover:bg-white/[0.03] hover:text-[#B0C5AA]',
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
    <div className={`${t.cardBg} rounded-2xl border transition-colors duration-300 p-6 ${className}`}>
      {children}
    </div>
  );
};

export const ThemeToggleButton = () => {
  const { isLightMode, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className={`fixed bottom-8 right-8 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-105 ${
        isLightMode ? 'bg-[#1A2418] text-white' : 'bg-white text-[#0F1512]'
      }`}
    >
      {isLightMode
        ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg>
        : <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd"/></svg>
      }
    </button>
  );
};
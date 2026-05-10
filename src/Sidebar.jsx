import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from './ThemeContext';
import { useAdminAuth } from './useAdminAuth';

const NavItem = ({ icon, label, path, currentPath, navigate, t, badge }) => {
  const active = currentPath === path;
  return (
    <button
      onClick={() => navigate(path)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mx-3 transition-all duration-200 text-left
        ${active ? t.navActive : t.navInactive}`}
      style={{ width: 'calc(100% - 24px)' }}
    >
      <span className="flex-shrink-0 opacity-90">{icon}</span>
      <span className={`text-sm flex-1 ${active ? 'font-semibold' : 'font-normal'}`}>{label}</span>
      {badge && (
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wider ${
          badge === 'SA'
            ? 'bg-amber-500/15 text-amber-400'
            : `${t.accentBg} ${t.accentText}`
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
};

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLightMode, toggleTheme, t } = useTheme();
  const { isSuperAdmin, adminUser } = useAdminAuth();

  const handleSignOut = () => {
    if (window.confirm('Sign out?')) navigate('/');
  };

  const iconCls = 'w-[18px] h-[18px]';

  const navItems = [
    {
      path: '/dashboard', label: 'Command Center',
      icon: <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
    },
    {
      path: '/users', label: 'User Management',
      icon: <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    },
    {
      path: '/moderation', label: 'Content Moderation',
      icon: <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    },
    {
      path: '/dropoff', label: 'Drop-Off Nodes',
      icon: <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m3-4h1m-1 4h1m-5 8h8" /></svg>
    },
    {
      path: '/upcycle', label: 'Upcycle Management',
      icon: <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
    },
    {
      path: '/logs', label: 'Surrender Logs',
      icon: <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    },
  ];

  return (
    <div className={`w-64 h-full ${t.sidebarBg} border-r flex flex-col z-20 shrink-0 transition-colors duration-300`}>

      {/* Logo */}
      <div className="px-6 py-6 flex items-center gap-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isLightMode ? 'bg-[#2D6A4F]' : 'bg-[#52B788]/15'}`}>
          <svg className={`w-4 h-4 ${isLightMode ? 'text-white' : 'text-[#52B788]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <div>
          <h1 className={`text-base font-bold tracking-tight ${t.textMain}`}>GreenSort</h1>
          <p className={`text-[10px] ${t.textMuted} tracking-wider uppercase`}>Admin Portal</p>
        </div>
      </div>

      <div className={`mx-5 h-px ${isLightMode ? 'bg-[#E3E8E1]' : 'bg-white/[0.05]'} mb-4`} />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-0 space-y-0.5 pb-4" style={{ scrollbarWidth: 'none' }}>
        <p className={`text-[9px] font-bold uppercase tracking-widest ${t.textMuted} px-7 py-2`}>Main</p>
        {navItems.map(item => (
          <NavItem key={item.path} {...item} currentPath={location.pathname} navigate={navigate} t={t} />
        ))}

        <div className={`mx-5 h-px ${isLightMode ? 'bg-[#E3E8E1]' : 'bg-white/[0.05]'} my-3`} />
        <p className={`text-[9px] font-bold uppercase tracking-widest ${t.textMuted} px-7 py-2`}>System</p>

        <NavItem
          path="/access"
          label="Admin Access"
          currentPath={location.pathname}
          navigate={navigate}
          t={t}
          badge={isSuperAdmin ? 'SA' : 'A'}
          icon={<svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>}
        />
      </nav>

      {/* Bottom */}
      <div className={`p-4 border-t ${isLightMode ? 'border-[#E3E8E1]' : 'border-white/[0.05]'} space-y-3`}>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${
            isLightMode ? 'bg-[#F0F4EE] text-[#3D4E3A] hover:bg-[#E3E8E1]' : 'bg-white/[0.04] text-[#B0C5AA] hover:bg-white/[0.07]'
          }`}
        >
          <span>{isLightMode ? 'Light Mode' : 'Dark Mode'}</span>
          <span className="opacity-60">{isLightMode ? '☀' : '◐'}</span>
        </button>

        {/* User card */}
        <div className={`flex items-center gap-3 p-3 rounded-xl ${isLightMode ? 'bg-[#F0F4EE]' : 'bg-white/[0.03]'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isLightMode ? 'bg-[#D8EDDF] text-[#2D6A4F]' : 'bg-[#52B788]/12 text-[#52B788]'}`}>
            {(adminUser?.full_name || 'A')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold ${t.textMain} truncate`}>{adminUser?.full_name || 'Admin'}</p>
            <p className={`text-[10px] ${t.accentText}`}>{isSuperAdmin ? '★ Super Admin' : 'Admin'}</p>
          </div>
          <button
            onClick={handleSignOut}
            className={`p-1.5 rounded-lg transition-all ${t.textMuted} hover:text-red-500 hover:bg-red-500/10 flex-shrink-0`}
            title="Sign out"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>
      </div>

    </div>
  );
}
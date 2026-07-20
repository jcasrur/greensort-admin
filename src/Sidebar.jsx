import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from './ThemeContext';
import { useAdminAuth } from './useAdminAuth';

import logo      from './assets/logo.png';
import logoGreen from './assets/logo-green.png';

const NavItem = ({ icon, label, path, currentPath, navigate, t, badge, isLightMode }) => {
  const active = currentPath === path || (path !== '/dashboard' && currentPath.startsWith(path));
  return (
    <button
      onClick={() => navigate(path)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mx-3 transition-all duration-200 text-left
        ${active
          ? (isLightMode ? 'bg-[#D8EDDF] text-[#1A2A1A]' : 'bg-[#0f1f0f] text-[#E8F0E5]')
          : (isLightMode ? 'text-[#4A5D4E] hover:bg-[#F3F6F1] hover:text-[#1A2A1A]' : 'text-[#A8BDA2] hover:bg-[#2D6A4F]/40 hover:text-[#E8F0E5]')
        }`}
      style={{ width: 'calc(100% - 24px)' }}
    >
      <span className="flex-shrink-0 opacity-90">{icon}</span>
      <span className={`text-sm flex-1 truncate ${active ? 'font-semibold' : 'font-normal'}`}>{label}</span>
      {badge && (
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wider flex-shrink-0 ${
          badge === 'SA' ? 'bg-amber-500/15 text-amber-500'
            : isLightMode ? 'bg-[#2D6A4F]/10 text-[#2D6A4F]' : 'bg-[#34D399]/10 text-[#34D399]'
        }`}>{badge}</span>
      )}
    </button>
  );
};

const ic = 'w-4 h-4';

const Icons = {
  overview:    <svg className={ic} fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5" strokeWidth={1.75}/><rect x="14" y="3" width="7" height="7" rx="1.5" strokeWidth={1.75}/><rect x="3" y="14" width="7" height="7" rx="1.5" strokeWidth={1.75}/><rect x="14" y="14" width="7" height="7" rx="1.5" strokeWidth={1.75}/></svg>,
  logs:        <svg className={ic} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>,
  students:    <svg className={ic} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 14l9-5-9-5-9 5 9 5z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/></svg>,
  accounting:  <svg className={ic} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>,
  fund:        <svg className={ic} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 10v2m8-6a8 8 0 11-16 0 8 8 0 0116 0z"/></svg>,
  moderation:  <svg className={ic} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>,
  access:      <svg className={ic} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>,
};

const NAV_GROUPS = [
  {
    label: 'Operations',
    items: [
      { path: '/dashboard',      label: 'Overview',       icon: Icons.overview, module: null },
      { path: '/surrender-logs', label: 'Surrender Logs', icon: Icons.logs,     module: null },
    ],
  },
  {
    label: 'Records',
    items: [
      { path: '/students',   label: 'Students Record', icon: Icons.students,   module: 'students' },
      { path: '/accounting', label: 'Accounting',      icon: Icons.accounting, module: 'accounting' },
    ],
  },
  {
    label: 'Management',
    items: [
      { path: '/fund-dashboard', label: 'Waste Type Inventory',  icon: Icons.fund,       module: 'fund_dashboard' },
      { path: '/moderation',     label: 'Moderation',      icon: Icons.moderation, module: 'messages' },
    ],
  },
];

const SYSTEM_ITEMS = [
  { path: '/access', label: 'Admin Access', icon: Icons.access, module: 'super_admin_panel', badge: 'SA' },
];

const ROLE_COLOURS = {
  super_admin: 'text-amber-500',
  admin: 'text-blue-500',
  coordinator: 'text-cyan-500',
  accounting: 'text-purple-400',
  receiving_staff: 'text-emerald-500',
  moderator: 'text-slate-400',
};

export default function Sidebar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { isLightMode, toggleTheme, t } = useTheme();
  const { adminUser, role, roleLabel, can } = useAdminAuth();
  const roleDotCls = ROLE_COLOURS[role] || 'text-emerald-400';

  const handleSignOut = async () => {
    if (window.confirm('Sign out of GreenSort Admin?')) {
      const { supabase } = await import('./supabase');
      await supabase.auth.signOut();
      navigate('/');
    }
  };

  const borderCls = isLightMode ? 'border-[#E8F0E9]' : 'border-white/[0.05]';

  return (
    <div className={`w-56 h-full ${isLightMode ? 'bg-white border-[#E8F0E9]' : 'bg-[#0A140A] border-white/[0.06]'} border-r flex flex-col shrink-0 transition-colors duration-300`}>

      <div className="px-5 py-5 flex items-center gap-2.5">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 ${isLightMode ? 'bg-[#D8EDDF]' : 'bg-[#5E9E7A]/20'}`}>
          <img src={isLightMode ? logoGreen : logo} alt="GreenSort Logo" className="w-full h-full object-cover"/>
        </div>
        <div>
          <h1 className={`text-sm font-semibold tracking-tight ${isLightMode ? 'text-[#1A2A1A]' : 'text-[#E8F0E5]'}`}>GreenSort</h1>
          <p className={`text-[9px] tracking-widest uppercase ${isLightMode ? 'text-[#4A5D4E]' : 'text-[#A8BDA2]'}`}>Admin Panel</p>
        </div>
      </div>

      <div className={`mx-4 h-px ${borderCls} mb-2`}/>

      <nav className="flex-1 overflow-y-auto px-3 space-y-0.5 pb-3" style={{ scrollbarWidth:'none' }}>
        {NAV_GROUPS.map(group => {
          const visible = group.items.filter(item => item.module === null ? true : can(item.module));
          if (!visible.length) return null;
          return (
            <div key={group.label}>
              <p className={`text-[9px] font-semibold uppercase tracking-widest px-3 py-2 ${isLightMode ? 'text-[#5E7A67]' : 'text-[#7A8C77]'}`}>{group.label}</p>
              {visible.map(item => (
                <NavItem key={item.path} {...item} currentPath={location.pathname} navigate={navigate} t={t} isLightMode={isLightMode}/>
              ))}
            </div>
          );
        })}

        {SYSTEM_ITEMS.filter(i => can(i.module)).length > 0 && (
          <>
            <div className={`mx-1 h-px ${borderCls} my-2`}/>
            <p className={`text-[9px] font-semibold uppercase tracking-widest px-3 py-2 ${isLightMode ? 'text-[#5E7A67]' : 'text-[#7A8C77]'}`}>System</p>
            {SYSTEM_ITEMS.filter(i => can(i.module)).map(item => (
              <NavItem key={item.path} {...item} currentPath={location.pathname} navigate={navigate} t={t} badge={item.badge} isLightMode={isLightMode}/>
            ))}
          </>
        )}
      </nav>

      <div className={`p-3 border-t ${borderCls} space-y-2`}>
        <button onClick={toggleTheme} className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${isLightMode ? 'text-[#4A5D4E] hover:bg-[#F3F6F1]' : 'text-[#A8BDA2] hover:bg-white/[0.04]'}`}>
          <span>{isLightMode ? 'Light mode' : 'Dark mode'}</span>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isLightMode
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
            }
          </svg>
        </button>

        <div className={`flex items-center gap-2.5 p-2.5 rounded-xl ${isLightMode ? 'bg-[#F3F6F1]' : 'bg-white/[0.03]'}`}>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${isLightMode ? 'bg-[#D8EDDF] text-[#1A2A1A]' : 'bg-[#007C00]/20 text-[#00E676]'}`}>
            {(adminUser?.full_name || 'A')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-medium truncate ${isLightMode ? 'text-[#1A2A1A]' : 'text-[#E8F0E5]'}`}>{adminUser?.full_name || 'Admin'}</p>
            <p className={`text-[9px] font-medium ${roleDotCls}`}>{roleLabel}</p>
          </div>
          <button onClick={handleSignOut} className={`p-1.5 rounded-lg transition-all ${isLightMode ? 'text-[#5E7A67] hover:text-red-500 hover:bg-red-50' : 'text-[#A8BDA2] hover:text-red-400 hover:bg-red-400/10'}`} title="Sign out">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
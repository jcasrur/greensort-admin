import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from './ThemeContext';

const NavItem = ({ icon, label, path, currentPath, navigate, isLightMode }) => {
  const active = currentPath === path; 
  return (
    <div 
      onClick={() => navigate(path)}
      className={`cursor-pointer flex items-center gap-4 px-5 py-3.5 transition-all duration-300 rounded-[16px] mx-4 my-1.5
      ${active 
        ? (isLightMode ? 'bg-[#98BAA3]/10 text-[#6C9A7D]' : 'bg-[#2CD87D]/10 text-[#2CD87D]') 
        : (isLightMode ? 'text-[#6B7A74] hover:bg-[#F0F4F1] hover:text-[#1D2A23]' : 'text-[#8B9B90] hover:bg-[#18201B] hover:text-white')
      }`}>
      <div className={`${active ? (isLightMode ? 'text-[#6C9A7D]' : 'text-[#2CD87D]') : 'text-inherit'} transition-colors`}>{icon}</div>
      <span className={`text-sm tracking-wide ${active ? 'font-medium' : 'font-light'}`}>{label}</span>
    </div>
  );
};

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation(); 
  const { isLightMode, toggleTheme } = useTheme();

  const handleSignOut = () => {
    if (window.confirm("Are you sure you want to sign out?")) navigate('/');
  };

  const sidebarBg = isLightMode ? 'bg-white border-[#F0F4F1]' : 'bg-[#0A0E0C] border-white/[0.03]';

  return (
    <div className={`w-72 h-full ${sidebarBg} border-r flex flex-col justify-between z-20 shrink-0 transition-colors duration-300`}>
      <div className="overflow-y-auto no-scrollbar">
        <div className="p-8 pb-10 flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full ${isLightMode ? 'bg-[#98BAA3]' : 'bg-[#2CD87D]'} flex items-center justify-center transition-colors`}>
            <svg className={`w-5 h-5 ${isLightMode ? 'text-white' : 'text-[#0D120F]'}`} fill="currentColor" viewBox="0 0 20 20"><path d="M11.3 1.046A12.01 12.01 0 0121 11a11.992 11.992 0 01-2.046 6.7c-.297.417-.79.624-1.28.53A9.972 9.972 0 0011 16.5a9.972 9.972 0 00-6.674 1.73c-.49.094-.983-.113-1.28-.53A11.992 11.992 0 011 11 12.01 12.01 0 0110.7 1.046c.196-.03.396-.03.592 0zM11 5a1 1 0 00-2 0v5a1 1 0 002 0V5z" /></svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-wide transition-colors">
            <span className={isLightMode ? 'text-[#1D2A23]' : 'text-white'}>Green</span><span className={isLightMode ? 'text-[#6C9A7D]' : 'text-[#2CD87D]'}>Sort</span>
          </h1>
        </div>

        <nav className="space-y-1">
          <NavItem path="/dashboard" currentPath={location.pathname} navigate={navigate} isLightMode={isLightMode} label="Command Center" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>} />
          <NavItem path="/users" currentPath={location.pathname} navigate={navigate} isLightMode={isLightMode} label="User Management" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>} />
          <NavItem path="/moderation" currentPath={location.pathname} navigate={navigate} isLightMode={isLightMode} label="Content Moderation" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>} />
          <NavItem path="/dropoff" currentPath={location.pathname} navigate={navigate} isLightMode={isLightMode} label="Drop-Off Nodes" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m3-4h1m-1 4h1m-5 8h8" /></svg>} />
          <NavItem path="/upcycle" currentPath={location.pathname} navigate={navigate} isLightMode={isLightMode} label="Upcycle Management" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>} />
        </nav>
      </div>

      <div className="p-6 shrink-0 flex flex-col gap-4">
          <button onClick={toggleTheme} className={`w-full py-3 rounded-2xl transition-all font-bold text-xs ${isLightMode ? 'bg-[#F0F4F1] text-[#1D2A23]' : 'bg-[#18201B] text-white'}`}>
            {isLightMode ? "Light Mode" : "Dark Mode"}
          </button>
          <div className={`flex items-center justify-between p-4 ${isLightMode ? 'bg-[#F9FBF9]' : 'bg-[#18201B]'} border ${isLightMode ? 'border-[#F0F4F1]' : 'border-white/[0.03]'} rounded-[20px]`}>
              <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${isLightMode ? 'bg-[#98BAA3]/20 text-[#6C9A7D]' : 'bg-[#2CD87D]/10 text-[#2CD87D]'}`}>A</div>
                  <div><p className={`text-sm font-medium ${isLightMode ? 'text-[#1D2A23]' : 'text-white'}`}>Admin Unit</p><p className={`text-[10px] ${isLightMode ? 'text-[#6C9A7D]' : 'text-[#2CD87D]'}`}>Online</p></div>
              </div>
          </div>
      </div>
    </div>
  );
}
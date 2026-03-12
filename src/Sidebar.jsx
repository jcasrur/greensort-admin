import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// 🟢 Reusable GlassCard para sa Profile part sa baba
const GlassCard = ({ children, className = '' }) => (
  <div className={`backdrop-blur-xl bg-[#0A1A2F]/60 border border-white/10 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] p-6 ${className}`}>
    {children}
  </div>
);

// 🟢 Dynamic NavItem (Automatic nagiging active/green depende sa URL)
const NavItem = ({ icon, label, path, currentPath, navigate }) => {
  const active = currentPath === path; // Titignan kung ang URL ay match sa path ng button
  return (
    <div 
      onClick={() => navigate(path)}
      className={`cursor-pointer flex items-center gap-4 px-6 py-4 transition-all duration-300 group relative overflow-hidden rounded-xl mx-2 my-1
      ${active 
        ? 'bg-[#00C853]/20 text-[#00C853] shadow-[0_0_20px_rgba(0,200,83,0.3)] border border-[#00C853]/30' 
        : 'text-gray-400 hover:bg-white/5 hover:text-white'
      }`}>
      {active && <div className="absolute left-0 top-0 h-full w-1 bg-[#00C853] shadow-[0_0_15px_#00C853]"></div>}
      <div className="z-10">{icon}</div>
      <span className="font-semibold text-sm tracking-wider z-10">{label}</span>
      {!active && <div className="absolute inset-0 bg-gradient-to-r from-[#00C853]/0 to-[#00C853]/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>}
    </div>
  );
};

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation(); // 👈 Kukunin ang current URL (ex. "/users" o "/moderation")

  const handleSignOut = () => {
    if (window.confirm("Are you sure you want to sign out?")) {
      navigate('/');
    }
  };

  return (
    <div className="w-72 h-full backdrop-blur-2xl bg-[#020C14]/80 border-r border-white/10 flex flex-col justify-between z-20 shadow-2xl shrink-0">
      <div className="overflow-y-auto no-scrollbar">
        
        {/* Logo Area */}
        <div className="p-8 pb-12 relative">
          <h1 className="text-3xl font-black tracking-widest relative z-10">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00C853] to-[#69F0AE] drop-shadow-[0_0_10px_rgba(0,200,83,0.8)]">GREEN</span>
            <span className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">SORT</span>
          </h1>
          <div className="absolute bottom-6 left-8 w-20 h-1 bg-gradient-to-r from-[#00C853] to-transparent rounded-full opacity-50"></div>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-3 px-2">
          <NavItem 
            path="/dashboard" currentPath={location.pathname} navigate={navigate}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>} 
            label="Command Center" 
          />
          <NavItem 
            path="/users" currentPath={location.pathname} navigate={navigate}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>} 
            label="User Management" 
          />
          
          {/* 🟢 BAGONG DAGDAG: CONTENT MODERATION */}
          <NavItem 
            path="/moderation" currentPath={location.pathname} navigate={navigate}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>} 
            label="Content Moderation" 
          />

          <NavItem 
            path="/dropoff" currentPath={location.pathname} navigate={navigate}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m3-4h1m-1 4h1m-5 8h8" /></svg>} 
            label="Drop-Off Nodes" 
          />
          <NavItem 
            path="/upcycle" currentPath={location.pathname} navigate={navigate}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>} 
            label="Upcycle Management" 
          />
        </nav>
      </div>

      {/* User Profile with Sign Out */}
      <div className="p-6 shrink-0 border-t border-white/5 bg-[#020C14]/50">
          <GlassCard className="flex items-center justify-between !p-4 !bg-[#00C853]/10 !border-[#00C853]/30">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00C853] to-blue-500 flex items-center justify-center text-sm font-bold text-white shadow-[0_0_15px_#00C853]">A</div>
                  <div>
                      <p className="text-sm font-bold text-white tracking-wider">Admin Unit</p>
                      <p className="text-[10px] text-[#00C853]/80 tracking-wider uppercase">ONLINE</p>
                  </div>
              </div>
              <button onClick={handleSignOut} className="text-gray-400 hover:text-red-500 transition-all transform hover:scale-110 active:scale-95">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
          </GlassCard>
      </div>

    </div>
  );
}
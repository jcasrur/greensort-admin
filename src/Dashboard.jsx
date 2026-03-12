import React from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();

  // 🟢 FUNCTION PARA SA SIGN OUT
  const handleSignOut = () => {
    if (window.confirm("Are you sure you want to sign out?")) {
      navigate('/'); // Babalik sa Login Page
    }
  };

  const GlassCard = ({ children, className = '' }) => (
    <div className={`backdrop-blur-xl bg-[#0A1A2F]/60 border border-white/10 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] p-6 ${className}`}>
      {children}
    </div>
  );

  const NavItem = ({ icon, label, active }) => (
    <div className={`flex items-center gap-4 px-6 py-4 transition-all duration-300 group relative overflow-hidden rounded-xl mx-2 my-1
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

  return (
    <div className="flex h-screen w-full font-sans bg-[#020C14] text-gray-100 relative overflow-hidden">
      
      {/* Ambient Background Lights */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#00C853]/30 rounded-full blur-[120px] opacity-50 pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] opacity-40 pointer-events-none"></div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGZ0Ij48cGF0aCBkPSJNMCAwaDQwdjQwSDB6Ii8+PHBhdGggZD0iTTIwIDIwLjVWMThIMBvMGwyLTJ2MnoiIGZpbGw9IiNGRkZGRkYiIG9wYWNpdHk9Ii4wNSIvPjwvZz48L3N2Zz4=')] opacity-20 pointer-events-none"></div>

      {/* 🟢 SIDEBAR */}
      <div className="w-72 h-full backdrop-blur-2xl bg-[#020C14]/80 border-r border-white/10 flex flex-col justify-between z-20 shadow-2xl">
        <div className="overflow-y-auto no-scrollbar">
          {/* Logo Area */}
          <div className="p-8 pb-12 relative">
            <h1 className="text-3xl font-black tracking-widest relative z-10">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00C853] to-[#69F0AE] drop-shadow-[0_0_10px_rgba(0,200,83,0.8)]">GREEN</span>
              <span className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">SORT</span>
            </h1>
            <div className="absolute bottom-6 left-8 w-20 h-1 bg-gradient-to-r from-[#00C853] to-transparent rounded-full opacity-50"></div>
          </div>

          {/* Navigation */}
          <nav className="space-y-3 px-2">
            <div onClick={() => navigate('/dashboard')} className="cursor-pointer">
              <NavItem active icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>} label="Command Center" />
            </div>

            {/* 🟢 NEW: USER MANAGEMENT BUTTON */}
            <div onClick={() => navigate('/users')} className="cursor-pointer">
              <NavItem icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>} label="User Management" />
            </div>

            <div onClick={() => navigate('/dropoff')} className="cursor-pointer">
              <NavItem icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m3-4h1m-1 4h1m-5 8h8" /></svg>} label="Drop-Off Nodes" />
            </div>

            <div onClick={() => navigate('/upcycle')} className="cursor-pointer">
              <NavItem icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>} label="Upcycle Management" />
            </div>
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

      {/* 🟢 MAIN CONTENT AREA */}
      <div className="flex-1 h-full overflow-y-auto relative z-10 no-scrollbar">
        <div className="p-8 lg:p-12 max-w-[1600px] mx-auto">
          
          {/* Header */}
          <div className="mb-10 relative">
            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 tracking-wide uppercase">SYSTEM OVERVIEW</h2>
            <p className="text-gray-400 mt-2 tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 bg-[#00C853] rounded-full animate-pulse shadow-[0_0_10px_#00C853]"></span>
                Live Bio-Data Metrics
            </p>
            <div className="absolute bottom-[-10px] left-0 w-32 h-1 bg-gradient-to-r from-[#00C853] to-transparent rounded-full"></div>
          </div>

          {/* Top Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
            {/* Active Users */}
            <GlassCard className="relative overflow-hidden group">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl group-hover:bg-blue-500/30 transition-all"></div>
              <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-bold text-blue-300 tracking-widest uppercase mb-2">Total of Users</p>
                    <p className="text-5xl font-black text-white tracking-tight drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">1,847</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/20 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.3)] border border-blue-400/20">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                </div>
              </div>
              <div className="mt-4 text-xs text-blue-300 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                <span>+12% from last cycle</span>
              </div>
            </GlassCard>
            
            {/* Active Centers */}
            <GlassCard className="relative overflow-hidden group">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl group-hover:bg-purple-500/30 transition-all"></div>
              <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-bold text-purple-300 tracking-widest uppercase mb-2">Active Collectors</p>
                    <p className="text-5xl font-black text-white tracking-tight drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">47</p>
                </div>
                <div className="p-3 rounded-xl bg-purple-500/20 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)] border border-purple-400/20">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
              </div>
              <div className="mt-4 text-xs text-purple-300 flex items-center gap-1">
                <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                <span>All systems nominal</span>
              </div>
            </GlassCard>

            {/* Top Category */}
            <GlassCard className="relative overflow-hidden group !bg-[#00C853]/10 !border-[#00C853]/30">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-[#00C853]/20 rounded-full blur-2xl group-hover:bg-[#00C853]/30 transition-all"></div>
              <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-bold text-[#69F0AE] tracking-widest uppercase mb-2">Top Scanned</p>
                    <p className="text-4xl font-black text-white tracking-tight drop-shadow-[0_0_10px_rgba(0,200,83,0.5)]">Cardboard</p>
                </div>
                <div className="p-3 rounded-xl bg-[#00C853]/20 text-[#69F0AE] shadow-[0_0_15px_rgba(0,200,83,0.3)] border border-[#00C853]/30">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                </div>
              </div>
               <div className="mt-4 w-full bg-[#00C853]/20 h-1.5 rounded-full overflow-hidden">
                 <div className="h-full bg-gradient-to-r from-[#00C853] to-[#69F0AE] w-[75%] shadow-[0_0_10px_#00C853]"></div>
               </div>
            </GlassCard>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
            {/* Glowing Bar Chart */}
            <GlassCard>
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-lg font-bold text-white tracking-wider flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#00C853]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" /></svg>
                    Monthly Collection Data
                </h3>
                <div className="flex gap-2">
                    <span className="w-3 h-3 bg-[#00C853] rounded-full shadow-[0_0_10px_#00C853]"></span>
                    <span className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6] opacity-50"></span>
                </div>
              </div>
              <div className="pl-6 relative">
                <div className="absolute inset-0 flex flex-col justify-between z-0 pointer-events-none pl-12 pb-6 pr-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="border-b border-dashed border-white/10 w-full h-0 shadow-[0_1px_5px_rgba(255,255,255,0.05)]"></div>
                  ))}
                </div>
                <div className="relative h-64 flex items-end justify-between px-4 gap-4 border-l border-white/10 pb-2">
                  <div className="absolute -left-14 bottom-2 h-full flex flex-col justify-between text-xs text-gray-500 py-1 items-end w-10 font-mono">
                    <span>1000</span><span>750</span><span>500</span><span>250</span><span>0</span>
                  </div>
                  {['45%', '55%', '70%', '80%', '90%'].map((height, index) => (
                     <div key={index} className="w-full max-w-[60px] relative group" style={{ height: height }}>
                        <div 
                            className="absolute bottom-0 w-full rounded-t-md z-10 transition-all duration-300 group-hover:scale-y-110 origin-bottom"
                            style={{ 
                                height: '100%', 
                                background: 'linear-gradient(to top, rgba(0,200,83,0.8), rgba(0,200,83,0.1))',
                                boxShadow: '0 -5px 15px rgba(0,200,83,0.4), inset 0 0 10px rgba(0,200,83,0.2)',
                                borderTop: '2px solid #69F0AE'
                            }}
                        ></div>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#00C853] text-black text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-[0_0_10px_#00C853]">
                            {height}
                        </div>
                     </div>
                  ))}
                </div>
                <div className="flex justify-between px-4 mt-4 text-xs text-gray-400 gap-4 font-mono uppercase tracking-wider">
                  <span className="w-full text-center">Jan</span>
                  <span className="w-full text-center">Feb</span>
                  <span className="w-full text-center">Mar</span>
                  <span className="w-full text-center">Apr</span>
                  <span className="w-full text-center">May</span>
                </div>
              </div>
            </GlassCard>

            {/* Holographic Pie Chart */}
            <GlassCard className="flex flex-col relative overflow-hidden">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#00C853]/10 rounded-full blur-3xl pointer-events-none"></div>
              <h3 className="text-lg font-bold text-white tracking-wider mb-8 flex items-center gap-2 z-10">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
                Material Composition Breakdown
              </h3>
              <div className="flex-1 flex items-center justify-center min-h-[250px] relative z-10">
                <div className="relative w-56 h-56 mt-4">
                  <div className="absolute inset-0 rounded-full border-4 border-white/5 shadow-[0_0_30px_rgba(0,200,83,0.2)]"></div>
                  <div 
                    className="w-full h-full rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5),_inset_0_0_20px_rgba(255,255,255,0.1)] relative overflow-hidden"
                    style={{ 
                        background: 'conic-gradient(#3B82F6 0% 45%, #A855F7 45% 60%, #F59E0B 60% 75%, #00C853 75% 100%)',
                        boxShadow: '0 0 25px rgba(0, 200, 83, 0.3)'
                    }}
                  >
                    <div className="absolute inset-[25%] bg-[#0A1A2F] rounded-full border border-white/10 flex items-center justify-center shadow-[inset_0_0_20px_rgba(0,200,83,0.2)]">
                        <div className="text-center">
                            <p className="text-xs text-gray-400 uppercase tracking-widest">Total</p>
                            <p className="text-2xl font-black text-white drop-shadow-[0_0_5px_#00C853]">100%</p>
                        </div>
                    </div>
                  </div>

                  <span className="absolute top-0 -right-24 text-xs text-blue-300 font-bold bg-blue-900/50 border border-blue-500/30 px-3 py-1 rounded-full backdrop-blur-md shadow-[0_0_10px_rgba(59,130,246,0.3)] flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_5px_#3b82f6]"></span> Plastic 45%
                  </span>
                  <span className="absolute top-32 -right-20 text-xs text-purple-300 font-bold bg-purple-900/50 border border-purple-500/30 px-3 py-1 rounded-full backdrop-blur-md shadow-[0_0_10px_rgba(168,85,247,0.3)] flex items-center gap-2">
                    <span className="w-2 h-2 bg-purple-400 rounded-full shadow-[0_0_5px_#a855f7]"></span> Glass 15%
                  </span>
                  <span className="absolute -bottom-8 right-0 text-xs text-yellow-300 font-bold bg-yellow-900/50 border border-yellow-500/30 px-3 py-1 rounded-full backdrop-blur-md shadow-[0_0_10px_rgba(245,158,11,0.3)] flex items-center gap-2">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full shadow-[0_0_5px_#f59e0b]"></span> Metal 15%
                  </span>
                  <span className="absolute bottom-10 -left-24 text-xs text-[#69F0AE] font-bold bg-[#00C853]/30 border border-[#00C853]/30 px-3 py-1 rounded-full backdrop-blur-md shadow-[0_0_10px_rgba(0,200,83,0.3)] flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#00C853] rounded-full shadow-[0_0_5px_#00C853]"></span> Paper 25%
                  </span>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Recent System Activity */}
          <GlassCard>
            <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                <h3 className="text-lg font-bold text-white tracking-wider flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Live System Feed
                </h3>
                <span className="text-xs text-[#00C853] font-mono animate-pulse">..Receiving Data..</span>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5 hover:bg-white/10 transition-all group">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)] group-hover:shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all">
                        <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <div>
                        <p className="font-bold text-sm text-white tracking-wide">New Pending Application detected</p>
                        <p className="text-xs text-gray-400 font-mono mt-1">SOURCE_ID: Brgy. San Pablo Cavite</p>
                    </div>
                </div>
                <p className="text-xs text-gray-500 font-mono bg-black/30 px-3 py-1 rounded-full border border-white/10">T-minus 5h</p>
              </div>
              
              <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5 hover:bg-white/10 transition-all group">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#00C853]/20 flex items-center justify-center border border-[#00C853]/30 shadow-[0_0_10px_rgba(0,200,83,0.2)] group-hover:shadow-[0_0_15px_rgba(0,200,83,0.4)] transition-all">
                         <svg className="w-5 h-5 text-[#69F0AE]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                        <p className="font-bold text-sm text-white tracking-wide">Drop-Off Node #47 Online</p>
                        <p className="text-xs text-gray-400 font-mono mt-1">STATUS: Verified Connection</p>
                    </div>
                </div>
                <p className="text-xs text-gray-500 font-mono bg-black/30 px-3 py-1 rounded-full border border-white/10">T-minus 8h</p>
              </div>
            </div>
          </GlassCard>

          <div className="h-12"></div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
};

export default Dashboard;
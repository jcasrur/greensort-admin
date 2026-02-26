import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const UpcycleManagement = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('suggestions');

  // 🟢 FUNCTION PARA SA SIGN OUT
  const handleSignOut = () => {
    if (window.confirm("Are you sure you want to sign out?")) {
      navigate('/'); // I-redirect pabalik sa login page
    }
  };

  // Reusable Components
  const GlassCard = ({ children, className = '' }) => (
    <div className={`backdrop-blur-xl bg-[#0A1A2F]/60 border border-white/10 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] p-6 ${className}`}>
      {children}
    </div>
  );

  const NavItem = ({ icon, label, active }) => (
    <div className={`flex items-center gap-4 px-6 py-4 transition-all duration-300 group relative overflow-hidden rounded-xl mx-2 my-1
      ${active ? 'bg-[#00C853]/20 text-[#00C853] shadow-[0_0_20px_rgba(0,200,83,0.3)] border border-[#00C853]/30' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
      {active && <div className="absolute left-0 top-0 h-full w-1 bg-[#00C853] shadow-[0_0_15px_#00C853]"></div>}
      <div className="z-10">{icon}</div>
      <span className="font-semibold text-sm tracking-wider z-10">{label}</span>
      {!active && <div className="absolute inset-0 bg-gradient-to-r from-[#00C853]/0 to-[#00C853]/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>}
    </div>
  );

  // 🟢 MOCK DATA
  const projects = [
    { id: 1, title: "Planter", material: "Plastic", confidence: "High Match", status: "Pending", date: "Feb 10, 2026" },
    { id: 2, title: "Desk Organizer", material: "Cardboard", confidence: "Moderate", status: "Pending", date: "Feb 10, 2026" },
    { id: 3, title: "Jar Light", material: "Glass", confidence: "High Match", status: "Pending", date: "Feb 10, 2026" },
    { id: 4, title: "Eco-Bricks", material: "Plastic", confidence: "High Match", status: "Published", date: "Jan 28, 2026" },
    { id: 5, title: "Paper Basket", material: "Paper", confidence: "High Match", status: "Published", date: "Jan 25, 2026" },
  ];

  const filteredProjects = projects.filter(proj => {
    if (activeTab === 'suggestions') return proj.status === 'Pending';
    if (activeTab === 'published') return proj.status === 'Published';
    return true;
  });

  return (
    <div className="flex h-screen w-full font-sans bg-[#020C14] text-gray-100 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#00C853]/30 rounded-full blur-[120px] opacity-50 pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] opacity-40 pointer-events-none"></div>
      
      {/* 🟢 SIDEBAR */}
      <div className="w-72 h-full backdrop-blur-2xl bg-[#020C14]/80 border-r border-white/10 flex flex-col justify-between z-20 shadow-2xl">
        <div className="overflow-y-auto no-scrollbar">
          <div className="p-8 pb-12 relative">
            <h1 className="text-3xl font-black tracking-widest relative z-10">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00C853] to-[#69F0AE] drop-shadow-[0_0_10px_rgba(0,200,83,0.8)]">GREEN</span>
              <span className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">SORT</span>
            </h1>
          </div>
          
          <nav className="space-y-3 px-2">
            <div onClick={() => navigate('/dashboard')} className="cursor-pointer">
              <NavItem icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" /></svg>} label="Command Center" />
            </div>
            <div onClick={() => navigate('/dropoff')} className="cursor-pointer">
              <NavItem icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m3-4h1m-1 4h1m-5 8h8" /></svg>} label="Drop-Off Centers" />
            </div>
            <div onClick={() => navigate('/upcycle')} className="cursor-pointer">
              <NavItem active icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>} label="Upcycle Management" />
            </div>
          </nav>
        </div>
        
        {/* Footer Section with Sign Out Button */}
        <div className="p-6 shrink-0 border-t border-white/5 bg-[#020C14]/50">
            <GlassCard className="flex items-center justify-between !p-4 !bg-[#00C853]/10 !border-[#00C853]/30">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00C853] to-blue-500 flex items-center justify-center text-sm font-bold text-white shadow-[0_0_15px_#00C853]">A</div>
                    <div>
                        <p className="text-sm font-bold text-white tracking-wider">Admin Unit</p>
                        <p className="text-[10px] text-[#00C853]/80 tracking-wider uppercase">Online</p>
                    </div>
                </div>
                {/* 🔴 SIGN OUT BUTTON BUTTON */}
                <button onClick={handleSignOut} className="text-gray-400 hover:text-red-500 transition-all transform hover:scale-110 active:scale-95">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                </button>
            </GlassCard>
        </div>
      </div>

      {/* 🟢 MAIN CONTENT */}
      <div className="flex-1 h-full overflow-y-auto relative z-10 no-scrollbar">
        <div className="p-8 lg:p-12 max-w-[1600px] mx-auto">
          
          <div className="mb-10">
            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 tracking-wide uppercase">Upcycle Management</h2>
            <p className="text-gray-400 mt-2 tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse shadow-[0_0_10px_#a855f7]"></span>
                Monitor AI-generated tutorials and review pending request
            </p>
          </div>

          {/* TABS */}
          <div className="flex items-center bg-white/5 backdrop-blur-md border border-white/10 rounded-full p-1 mb-8 w-fit shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
            <button onClick={() => setActiveTab('suggestions')} className={`flex items-center gap-3 px-8 py-3 rounded-full font-bold text-sm transition-all duration-300 ${activeTab === 'suggestions' ? 'bg-[#0A1A2F] text-white border border-[#00C853]/50 shadow-[inset_0_0_15px_rgba(0,200,83,0.3)]' : 'text-gray-400 hover:text-white'}`}>
                AI Suggestion 
                <span className="bg-red-500/20 text-red-400 border border-red-500/50 px-2 py-0.5 rounded-full text-xs">
                  {projects.filter(p => p.status === 'Pending').length}
                </span>
            </button>
            <button onClick={() => setActiveTab('published')} className={`px-8 py-3 rounded-full font-bold text-sm transition-all duration-300 ${activeTab === 'published' ? 'bg-[#0A1A2F] text-white border border-[#00C853]/50 shadow-[inset_0_0_15px_rgba(0,200,83,0.3)]' : 'text-gray-400 hover:text-white'}`}>
                Published
            </button>
          </div>

          {/* TABLE AREA */}
          <GlassCard className="overflow-hidden p-0 relative group">
            <div className="p-8 pb-4 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-lg font-bold text-white tracking-wider flex items-center gap-2 uppercase">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                    {activeTab === 'suggestions' ? 'Pending Projects' : 'Published Projects'}
                </h3>
            </div>

            <div className="overflow-x-auto min-h-[300px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-xs text-gray-400 uppercase tracking-widest bg-white/5">
                      <th className="py-5 px-8 font-semibold">Thumbnail</th>
                      <th className="py-5 px-4 font-semibold">Project Title</th>
                      <th className="py-5 px-4 font-semibold">Material Type</th>
                      <th className="py-5 px-4 font-semibold">Confidence</th>
                      <th className="py-5 px-4 font-semibold">Date Applied</th>
                      {activeTab === 'suggestions' && <th className="py-5 px-4 font-semibold">Tutorial</th>}
                      <th className="py-5 px-8 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {filteredProjects.map((proj) => (
                      <tr key={proj.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group/row">
                        <td className="py-4 px-8">
                            <div className="w-12 h-12 bg-white/10 rounded-lg border border-white/5 flex items-center justify-center text-gray-500">
                                <svg className="w-6 h-6 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                        </td>
                        <td className="py-5 px-4 font-bold text-white group-hover/row:text-[#00C853] transition-colors uppercase tracking-wide">{proj.title}</td>
                        <td className="py-5 px-4 text-gray-400">{proj.material}</td>
                        <td className="py-5 px-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                              proj.confidence.includes('High') ? 'bg-[#00C853]/10 text-[#00C853] border-[#00C853]/30' : 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                          }`}>
                              {proj.confidence}
                          </span>
                        </td>
                        <td className="py-5 px-4 text-gray-400">{proj.date}</td>
                        
                        {activeTab === 'suggestions' ? (
                          <>
                            <td className="py-5 px-4">
                              <button className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 hover:border-white/30 rounded-md transition-all text-xs font-bold tracking-wider">
                                  VIEW
                              </button>
                            </td>
                            <td className="py-5 px-8">
                              <div className="flex gap-4 justify-end">
                                  <button onClick={() => alert("Approved!")} className="text-gray-500 hover:text-[#00C853] transition-all transform hover:scale-110">
                                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                  </button>
                                  <button onClick={() => alert("Rejected!")} className="text-gray-500 hover:text-red-500 transition-all transform hover:scale-110">
                                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                  </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <td className="py-5 px-8">
                            <div className="flex gap-4 justify-end">
                                <button className="text-gray-500 hover:text-blue-400 transition-all transform hover:scale-110">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </button>
                                <button className="text-gray-500 hover:text-white transition-all transform hover:scale-110">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#00C853]/20 to-transparent"></div>
          </GlassCard>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
};

export default UpcycleManagement;
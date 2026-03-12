import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase'; 
import Sidebar from './Sidebar'; // 🟢 IN-IMPORT NATIN DITO YUNG SIDEBAR NA GINAWA MO

export default function UserManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    const confirmDelete = window.confirm(`Are you sure you want to DELETE ${userName || 'this user'}? This action cannot be undone.`);
    if (confirmDelete) {
      try {
        const { error } = await supabase.from('profiles').delete().eq('id', userId);
        if (error) throw error;
        setUsers(users.filter(user => user.id !== userId));
        alert("User deleted successfully!");
      } catch (error) {
        console.error("Error deleting user:", error.message);
        alert("Failed to delete user. Please check console.");
      }
    }
  };

  const recentUsersCount = users.filter(user => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return new Date(user.created_at) > oneWeekAgo;
  }).length;

  const checkIfActive = (user) => {
    const dateToCheck = user.last_login ? new Date(user.last_login) : new Date(user.created_at);
    const today = new Date();
    const diffTime = Math.abs(today - dateToCheck);
    const diffDays = diffTime / (1000 * 60 * 60 * 24); 
    return diffDays <= 7;
  };

  // Kina-keep natin itong GlassCard dahil ginagamit ito sa content area (Summary cards)
  const GlassCard = ({ children, className = '' }) => (
    <div className={`backdrop-blur-xl bg-[#0A1A2F]/60 border border-white/10 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] p-6 ${className}`}>
      {children}
    </div>
  );

  return (
    <div className="flex h-screen w-full font-sans bg-[#020C14] text-gray-100 relative overflow-hidden">
      
      {/* Ambient Background Lights */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#00C853]/30 rounded-full blur-[120px] opacity-50 pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] opacity-40 pointer-events-none"></div>

      {/* 🟢 DITO NATIN INILAGAY ANG SIDEBAR MO (ISANG LINYA NA LANG!) */}
      <Sidebar />

      {/* 🟢 YUNG MAIN CONTENT AREA HINDI NATIN GINALAW! */}
      <div className="flex-1 h-full overflow-y-auto relative z-10 no-scrollbar">
        <div className="p-8 lg:p-12 max-w-[1600px] mx-auto">
          
          <div className="mb-10 relative">
            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 tracking-wide uppercase">USER MANAGEMENT</h2>
            <p className="text-gray-400 mt-2 tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 bg-[#00C853] rounded-full animate-pulse shadow-[0_0_10px_#00C853]"></span>
                Live User Database
            </p>
            <div className="absolute bottom-[-10px] left-0 w-32 h-1 bg-gradient-to-r from-[#00C853] to-transparent rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
            <GlassCard>
              <h3 className="text-gray-400 text-xs font-bold tracking-widest mb-1 uppercase">Total Registered Users</h3>
              <p className="text-4xl font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">{users.length}</p>
            </GlassCard>

            <GlassCard className="relative overflow-hidden group !bg-[#00C853]/10 !border-[#00C853]/30">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#00C853]/20 rounded-bl-full pointer-events-none"></div>
              <h3 className="text-[#00C853] text-xs font-bold tracking-widest mb-1 uppercase">Recently Created</h3>
              <p className="text-4xl font-bold text-white drop-shadow-[0_0_10px_rgba(0,200,83,0.5)]">+{recentUsersCount}</p>
            </GlassCard>

            <GlassCard>
              <h3 className="text-gray-400 text-xs font-bold tracking-widest mb-1 uppercase">Active Users</h3>
              <p className="text-4xl font-bold text-white drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                {users.filter(u => checkIfActive(u)).length}  
              </p>
            </GlassCard>
          </div>

          <GlassCard className="!p-0 overflow-hidden">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h2 className="text-lg font-bold text-white tracking-wider">Account Registry</h2>
              <button onClick={fetchUsers} className="text-sm font-semibold text-[#00C853] hover:text-white transition-colors bg-[#00C853]/10 px-4 py-2 rounded-lg border border-[#00C853]/30">
                ↻ Refresh Data
              </button>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-10 text-center text-[#00C853] animate-pulse font-mono tracking-widest">LOADING USERS...</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#020C14]/80 text-gray-400 text-xs uppercase tracking-wider">
                      <th className="p-5 font-semibold">User Details</th>
                      <th className="p-5 font-semibold">Role</th>
                      <th className="p-5 font-semibold">Status</th>
                      <th className="p-5 font-semibold">Date Joined</th>
                      <th className="p-5 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-gray-500 font-mono">No user records found.</td>
                      </tr>
                    ) : (
                       /* USER ROWS DATA HERE */
                      users.map((user) => (
                        <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                          <td className="p-5">
                            <p className="font-bold text-white tracking-wide">{user.full_name || 'Anonymous User'}</p>
                            <p className="text-xs text-gray-400 mt-1 font-mono">{user.email}</p>
                          </td>
                          <td className="p-5">
                            <span className="bg-blue-500/20 text-blue-300 py-1.5 px-3 rounded-md text-xs font-bold border border-blue-500/30">
                              {user.role ? user.role.toUpperCase() : 'RESIDENT'}
                            </span>
                          </td>
                          <td className="p-5">
                            {checkIfActive(user) ? (
                              <span className="flex items-center text-[#00C853] text-xs font-bold">
                                <span className="w-2 h-2 rounded-full bg-[#00C853] mr-2 shadow-[0_0_8px_#00C853]"></span> ACTIVE
                              </span>
                            ) : (
                              <span className="flex items-center text-red-500 text-xs font-bold">
                                <span className="w-2 h-2 rounded-full bg-red-500 mr-2 shadow-[0_0_8px_red]"></span> INACTIVE
                              </span>
                            )}
                          </td>
                          <td className="p-5 text-gray-400 text-xs font-mono">
                            {new Date(user.created_at).toLocaleDateString('en-US', {
                              year: 'numeric', month: 'short', day: 'numeric'
                            })}
                            {new Date() - new Date(user.created_at) < 7 * 24 * 60 * 60 * 1000 && (
                              <span className="ml-3 bg-[#00C853] text-black font-black text-[10px] px-2 py-0.5 rounded shadow-[0_0_8px_rgba(0,200,83,0.5)]">NEW</span>
                            )}
                          </td>
                          <td className="p-5 text-right">
                            <button 
                              onClick={() => handleDeleteUser(user.id, user.full_name)}
                              title="Delete User"
                              className="text-gray-500 hover:text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-all transform hover:scale-110 active:scale-95"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
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
}
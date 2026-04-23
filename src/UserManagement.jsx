import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase'; 
import Sidebar from './Sidebar'; 
import { useTheme, ThemedCard } from './ThemeContext'; // 🟢 Import ang Theme Context

export default function UserManagement() {
  const navigate = useNavigate();
  const { isLightMode, t } = useTheme(); // 🟢 Gamitin ang theme variables
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());

  useEffect(() => {
    fetchUsers();

    const channel = supabase.channel('app-presence');
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const activeIds = new Set();
      Object.keys(state).forEach(key => {
        const presenceData = state[key][0];
        if (presenceData && presenceData.user_id) {
          activeIds.add(presenceData.user_id);
        }
      });
      setOnlineUserIds(activeIds);
    });
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
    const confirmDelete = window.confirm(`Are you sure you want to DELETE ${userName || 'this user'}?`);
    if (confirmDelete) {
      try {
        const { error } = await supabase.from('profiles').delete().eq('id', userId);
        if (error) throw error;
        setUsers(users.filter(user => user.id !== userId));
      } catch (error) {
        console.error("Error deleting user:", error.message);
      }
    }
  };

  const recentUsersCount = users.filter(user => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return new Date(user.created_at) > oneWeekAgo;
  }).length;

  const checkIfActive = (user) => onlineUserIds.has(user.id);

  return (
    // 🟢 Dinamiko na ang background color gamit ang t.bg
    <div className={`flex h-screen w-full font-sans ${t.bg} transition-colors duration-300 overflow-hidden selection:bg-[#3CD085] selection:text-black`}>
      
      <Sidebar />

      <div className="flex-1 h-full overflow-y-auto relative z-10 no-scrollbar">
        <div className="p-6 lg:p-10 max-w-[1600px] mx-auto">
          
          {/* HEADER */}
          <div className="flex flex-col lg:flex-row justify-between items-start mb-8 gap-6">
            <div>
              <h2 className={`text-3xl font-bold ${t.textMain} tracking-tight`}>User Management</h2>
              <p className={`${t.textMuted} mt-1 font-medium text-sm`}>Live User Database and Account Registry</p>
            </div>
          </div>

          {/* TOP STATS - Gamit ang ThemedCard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <ThemedCard className="flex flex-col justify-between h-[140px]">
              <p className={`text-[13px] font-semibold ${t.textMain} tracking-wide`}>Total Registered Users</p>
              <p className={`text-[40px] font-bold ${t.textMain} leading-none mt-auto`}>{users.length}</p>
            </ThemedCard>

            <ThemedCard className={`flex flex-col justify-between h-[140px] border ${isLightMode ? 'bg-[#E4EFE8]/30 border-[#98BAA3]/20' : 'bg-gradient-to-br from-[#151B1F] to-[#122119] border-[#3CD085]/20'}`}>
              <p className={`text-[13px] font-semibold ${isLightMode ? 'text-[#4A7D5C]' : 'text-[#3CD085]'} tracking-wide`}>Recently Created</p>
              <p className={`text-[40px] font-bold ${isLightMode ? 'text-[#4A7D5C]' : 'text-[#3CD085]'} leading-none mt-auto`}>+{recentUsersCount}</p>
            </ThemedCard>

            <ThemedCard className="flex flex-col justify-between h-[140px]">
              <p className={`text-[13px] font-semibold ${t.textMain} tracking-wide`}>Active Online</p>
              <div className="mt-auto flex items-center gap-3">
                <p className={`text-[40px] font-bold ${t.textMain} leading-none`}>
                  {users.filter(u => checkIfActive(u)).length}  
                </p>
                <span className={`w-2.5 h-2.5 rounded-full ${isLightMode ? 'bg-[#6C9A7D]' : 'bg-[#3CD085] shadow-[0_0_8px_#3CD085]'} mt-2`}></span>
              </div>
            </ThemedCard>
          </div>

          {/* TABLE CONTAINER */}
          <ThemedCard className="!p-0 overflow-hidden mb-10">
            <div className={`p-6 border-b ${isLightMode ? 'border-[#F0F4F1]' : 'border-white/[0.05]'} flex justify-between items-center`}>
              <h3 className={`text-lg font-bold ${t.textMain}`}>Account Registry</h3>
              <button 
                onClick={fetchUsers} 
                className={`text-xs font-bold ${isLightMode ? 'text-[#4A7D5C] bg-[#98BAA3]/10' : 'text-[#3CD085] bg-[#3CD085]/10'} px-4 py-2 rounded-lg border border-current transition-all flex items-center gap-2`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Refresh Data
              </button>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className={`p-10 text-center ${isLightMode ? 'text-[#6C9A7D]' : 'text-[#3CD085]'} animate-pulse text-sm font-bold tracking-widest uppercase`}>Loading Registry...</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`${isLightMode ? 'bg-[#F9FBF9]' : 'bg-[#101417]'} ${t.textMuted} text-[10px] uppercase tracking-widest border-b ${isLightMode ? 'border-[#F0F4F1]' : 'border-white/[0.05]'}`}>
                      <th className="px-6 py-4 font-bold">User Details</th>
                      <th className="px-6 py-4 font-bold">Role</th>
                      <th className="px-6 py-4 font-bold">Status</th>
                      <th className="px-6 py-4 font-bold">Date Joined</th>
                      <th className="px-6 py-4 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan="5" className={`p-8 text-center ${t.textMuted}`}>No user records found.</td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user.id} className={`border-b ${isLightMode ? 'border-[#F0F4F1] hover:bg-[#F9FBF9]' : 'border-white/[0.03] hover:bg-white/[0.02]'} transition-colors group`}>
                          <td className="px-6 py-4">
                            <p className={`font-bold ${t.textMain}`}>{user.full_name || 'Anonymous User'}</p>
                            <p className={`text-xs ${t.textMuted} mt-0.5`}>{user.email}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`${isLightMode ? 'bg-[#F0F4F1] text-[#6C9A7D]' : 'bg-[#231B2A] text-[#9A73C2]'} py-1.5 px-3 rounded-md text-[10px] font-bold border border-white/[0.05] tracking-wider`}>
                              {user.role ? user.role.toUpperCase() : 'RESIDENT'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {checkIfActive(user) ? (
                              <span className={`flex items-center ${isLightMode ? 'text-[#6C9A7D]' : 'text-[#3CD085]'} text-xs font-bold`}>
                                <span className={`w-2 h-2 rounded-full ${isLightMode ? 'bg-[#6C9A7D]' : 'bg-[#3CD085] shadow-[0_0_8px_#3CD085]'} mr-2`}></span> Online
                              </span>
                            ) : (
                              <span className={`flex items-center ${t.textMuted} text-xs font-medium`}>
                                <span className={`w-2 h-2 rounded-full ${isLightMode ? 'bg-[#DCE4DF]' : 'bg-[#35403C]'} mr-2`}></span> Offline
                              </span>
                            )}
                          </td>
                          <td className={`px-6 py-4 ${t.textMuted} text-xs`}>
                            {new Date(user.created_at).toLocaleDateString('en-US', {
                              year: 'numeric', month: 'short', day: 'numeric'
                            })}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => handleDeleteUser(user.id, user.full_name)}
                              className={`${t.textMuted} hover:text-[#F45B69] hover:bg-[#F45B69]/10 p-2 rounded-lg transition-all`}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </ThemedCard>

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
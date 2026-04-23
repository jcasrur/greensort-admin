import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase';
import emailjs from '@emailjs/browser'; 
import Sidebar from './Sidebar'; 
import { useTheme, ThemedCard } from './ThemeContext'; // 🟢 Import Theme Context

const DropOffNodes = () => {
  const navigate = useNavigate();
  const { isLightMode, t } = useTheme(); // 🟢 Gamitin ang global theme variables
  
  const [activeTab, setActiveTab] = useState('requests');
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchApplications = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('dropoff_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching data:", error);
    } else {
      setApplications(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  // ... (handleApprove, handleReject, handleDelete, handleDeactivate functions remain exactly the same)
  const handleApprove = async (id, email, programName) => {
    if (window.confirm(`Are you sure you want to approve ${programName}?`)) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
          alert(`❌ Approval Failed: "${email}" is not a valid email address.`);
          return; 
      }
      try {
        await emailjs.send(
          'service_nzpn1cn',       
          'template_adevhna',      
          { to_email: email, to_name: programName },
          { publicKey: 'lkfpdujTp2Sx9Eq3u' }      
        );
        const { error } = await supabase.from('dropoff_applications').update({ status: 'approved' }).eq('id', id);
        if (error) {
          alert("Email sent, but database error: " + error.message);
        } else {
          alert(`✅ Success! ${programName} is now approved!`);
          fetchApplications(); 
        }
      } catch (emailError) {
        console.error("Email Error Details:", emailError);
        alert(`❌ Approval Failed!`);
      }
    }
  };

  const handleReject = async (id, email, programName) => {
    const reason = window.prompt(`Enter reason for rejection:`, "Your application did not meet our current requirements.");
    if (reason !== null) { 
      try {
        await emailjs.send(
          'service_nzpn1cn', 'ILAGAY_MO_DITO_ANG_REJECT_TEMPLATE_ID', 
          { to_email: email, to_name: programName, reject_reason: reason },
          { publicKey: 'lkfpdujTp2Sx9Eq3u' }      
        );
        await supabase.from('dropoff_applications').update({ status: 'rejected' }).eq('id', id);
        fetchApplications(); 
      } catch (e) { console.error(e); }
    }
  };

  const handleDelete = async (id, programName) => {
    if (window.confirm(`Permanently DELETE ${programName}?`)) {
      await supabase.from('dropoff_applications').delete().eq('id', id);
      fetchApplications();
    }
  };

  const handleDeactivate = async (id, programName) => {
    if (window.confirm(`DEACTIVATE ${programName}?`)) {
      await supabase.from('dropoff_applications').update({ status: 'deactivated' }).eq('id', id);
      fetchApplications();
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const filteredApps = applications.filter(app => {
    if (activeTab === 'requests') return app.status === 'pending';
    if (activeTab === 'active') return app.status === 'approved';
    return true;
  });

  const pendingCount = applications.filter(a => a.status === 'pending').length;

  return (
    <div className={`flex h-screen w-full font-sans ${t.bg} transition-colors duration-300 overflow-hidden selection:bg-[#2CD87D] selection:text-black`}>
      
      <Sidebar />

      <div className="flex-1 h-full overflow-y-auto relative z-10 no-scrollbar">
        <div className="p-6 lg:p-10 max-w-[1600px] mx-auto">
          
          {/* HEADER */}
          <div className="flex flex-col lg:flex-row justify-between items-start mb-8 gap-6">
            <div>
              <h2 className={`text-3xl font-bold ${t.textMain} tracking-tight`}>Node Management</h2>
              <p className={`${t.textMuted} mt-1 font-medium text-sm`}>Review and manage drop-off centers</p>
            </div>
          </div>

          {/* TOGGLE TABS */}
          <div className={`flex items-center ${isLightMode ? 'bg-[#F0F4F1] border-[#E5ECE7]' : 'bg-[#131917] border-white/[0.05]'} border rounded-full p-1.5 mb-8 w-fit shadow-sm`}>
            <button 
              onClick={() => setActiveTab('requests')} 
              className={`flex items-center gap-3 px-8 py-2.5 rounded-full font-bold text-sm transition-all duration-300 ${
                activeTab === 'requests' 
                  ? (isLightMode ? 'bg-white text-[#4A7D5C] shadow-sm' : 'bg-[#18201B] text-[#2CD87D] border border-[#2CD87D]/20 shadow-[0_0_15px_rgba(44,216,125,0.1)]') 
                  : `${t.textMuted} hover:${t.textMain}`
              }`}
            >
                Requests 
                {pendingCount > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-black ${isLightMode ? 'bg-[#F45B69]/10 text-[#C45E65]' : 'bg-[#FF5252]/10 text-[#FF5252] border border-[#FF5252]/30'}`}>
                    {pendingCount}
                  </span>
                )}
            </button>
            <button 
              onClick={() => setActiveTab('active')} 
              className={`px-8 py-2.5 rounded-full font-bold text-sm transition-all duration-300 ${
                activeTab === 'active' 
                  ? (isLightMode ? 'bg-white text-[#4A7D5C] shadow-sm' : 'bg-[#18201B] text-[#2CD87D] border border-[#2CD87D]/20 shadow-[0_0_15px_rgba(44,216,125,0.1)]') 
                  : `${t.textMuted} hover:${t.textMain}`
              }`}
            >
                Active Nodes
            </button>
          </div>

          {/* MAIN TABLE CONTAINER */}
          <ThemedCard className="!p-0 overflow-hidden mb-10 relative group">
            
            <div className={`p-6 border-b ${isLightMode ? 'border-[#F0F4F1]' : 'border-white/[0.05]'} flex justify-between items-center`}>
                <h3 className={`text-lg font-bold ${t.textMain} flex items-center gap-3`}>
                    <svg className={`w-5 h-5 ${isLightMode ? 'text-[#6C9A7D]' : 'text-[#2CD87D]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    {activeTab === 'requests' ? 'Pending Applications' : 'Active Centers'}
                </h3>
            </div>

            <div className="overflow-x-auto min-h-[300px]">
                {isLoading ? (
                    <div className={`flex justify-center items-center h-[200px] ${isLightMode ? 'text-[#6C9A7D]' : 'text-[#2CD87D]'} text-sm font-bold tracking-widest animate-pulse`}>LOADING DATA...</div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={`${isLightMode ? 'bg-[#F9FBF9]' : 'bg-[#0A0F0D]'} ${t.textMuted} text-[10px] uppercase tracking-widest border-b ${isLightMode ? 'border-[#F0F4F1]' : 'border-white/[0.05]'}`}>
                        <th className="py-4 px-8 font-bold">Station Name</th>
                        <th className="py-4 px-4 font-bold">Contact No.</th>
                        <th className="py-4 px-4 font-bold">Location</th>
                        <th className="py-4 px-4 font-bold">Duration</th>
                        {activeTab === 'requests' && <th className="py-4 px-4 font-bold">Date Applied</th>}
                        {activeTab === 'requests' && <th className="py-4 px-4 font-bold">Document</th>}
                        <th className="py-4 px-8 font-bold text-right">Actions</th>
                      </tr>
                    </thead>

                    <tbody className="text-sm">
                      {filteredApps.length === 0 ? (
                          <tr>
                              <td colSpan="7" className={`py-10 text-center ${t.textMuted} font-medium italic`}>No records found.</td>
                          </tr>
                      ) : (
                        filteredApps.map((app) => (
                          <tr key={app.id} className={`border-b ${isLightMode ? 'border-[#F0F4F1] hover:bg-[#F9FBF9]' : 'border-white/[0.03] hover:bg-white/[0.02]'} transition-colors group/row`}>
                            <td className={`py-5 px-8 font-bold ${t.textMain} group-hover/row:text-[#2CD87D] transition-colors`}>{app.program_name}</td>
                            <td className={`py-5 px-4 ${t.textMuted} text-xs font-medium`}>{app.contact_number}</td>
                            <td className={`py-5 px-4 ${t.textMuted} text-xs font-medium`}>{app.barangay}, {app.city}</td>
                            <td className="py-5 px-4">
                              <span className={`px-3 py-1.5 rounded-md text-[10px] font-bold border tracking-wider ${
                                  app.operation_duration.includes('More') 
                                    ? (isLightMode ? 'bg-[#E4EFE8] text-[#4A7D5C] border-[#98BAA3]/30' : 'bg-[#005F31]/20 text-[#2CD87D] border-[#00964E]/30') 
                                    : 'bg-[#FF9800]/10 text-[#FF9800] border-[#FF9800]/20'
                              }`}>
                                  {app.operation_duration.includes('More') ? 'LONG-TERM' : 'SHORT-TERM'}
                              </span>
                            </td>

                            {activeTab === 'requests' ? (
                              <>
                                <td className={`py-5 px-4 ${t.textMuted} text-xs font-medium`}>{formatDate(app.created_at)}</td>
                                <td className="py-5 px-4">
                                  {app.permit_url ? (
                                      <button 
                                        onClick={() => window.open(app.permit_url, '_blank')}
                                        className={`px-4 py-1.5 ${isLightMode ? 'bg-[#F0F4F1] text-[#6B7A74] hover:bg-white border-[#DCE4DF]' : 'bg-[#18201B] text-[#8B9B90] hover:text-white border-white/10'} border rounded-md transition-all text-[10px] font-bold tracking-widest`}
                                      >
                                        VIEW FILE
                                      </button>
                                  ) : (
                                      <span className={`${t.textMuted} font-medium text-xs italic`}>No link</span>
                                  )}
                                </td>
                                <td className="py-5 px-8 text-right">
                                  <div className="flex gap-4 justify-end">
                                      <button onClick={() => handleApprove(app.id, app.user_email, app.program_name)} className={`${t.textMuted} hover:text-[#2CD87D] hover:bg-[#2CD87D]/10 p-2 rounded-lg transition-all`}>
                                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>
                                      </button>
                                      <button onClick={() => handleReject(app.id, app.user_email, app.program_name)} className={`${t.textMuted} hover:text-[#F45B69] hover:bg-[#F45B69]/10 p-2 rounded-lg transition-all`}>
                                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                      </button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <td className="py-5 px-8 text-right">
                                <div className="flex gap-4 justify-end">
                                    <button onClick={() => handleDelete(app.id, app.program_name)} className={`${t.textMuted} hover:text-[#F45B69] hover:bg-[#F45B69]/10 p-2 rounded-lg transition-all`}>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                    <button onClick={() => handleDeactivate(app.id, app.program_name)} className={`${t.textMuted} hover:text-[#FF9800] hover:bg-[#FF9800]/10 p-2 rounded-lg transition-all`}>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636a9 9 0 11-12.728 0M12 3v9" /></svg>
                                    </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
            </div>
            
            <div className={`h-1 w-full bg-gradient-to-r from-transparent ${isLightMode ? 'via-[#98BAA3]/40' : 'via-[#2CD87D]/30'} to-transparent`}></div>
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
};

export default DropOffNodes;
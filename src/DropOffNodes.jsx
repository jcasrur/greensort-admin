import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase';
import emailjs from '@emailjs/browser'; 
import Sidebar from './Sidebar'; // 🟢 IN-IMPORT NATIN ANG SIDEBAR

const DropOffNodes = () => {
  const navigate = useNavigate();
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
          alert(`✅ Success! ${programName} is now approved and the email notification was sent!`);
          fetchApplications(); 
        }
      } catch (emailError) {
        console.error("Email Error Details:", emailError);
        alert(`❌ Approval Failed! The email "${email}" might be inactive or invalid.`);
      }
    }
  };

  const handleReject = async (id, programName) => {
    if (window.confirm(`Are you sure you want to reject ${programName}?`)) {
      const { error } = await supabase.from('dropoff_applications').update({ status: 'rejected' }).eq('id', id);
      if (error) alert("Error: " + error.message);
      else fetchApplications(); 
    }
  };

  const handleDelete = async (id, programName) => {
    if (window.confirm(`⚠️ WARNING: Are you sure you want to permanently DELETE ${programName}?`)) {
      const { error } = await supabase.from('dropoff_applications').delete().eq('id', id);
      if (error) alert("Error deleting: " + error.message);
      else { alert(`${programName} has been deleted permanently.`); fetchApplications(); }
    }
  };

  const handleDeactivate = async (id, programName) => {
    if (window.confirm(`Are you sure you want to DEACTIVATE ${programName}?`)) {
      const { error } = await supabase.from('dropoff_applications').update({ status: 'deactivated' }).eq('id', id);
      if (error) alert("Error deactivating: " + error.message);
      else { alert(`${programName} is now deactivated.`); fetchApplications(); }
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const GlassCard = ({ children, className = '' }) => (
    <div className={`backdrop-blur-xl bg-[#0A1A2F]/60 border border-white/10 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] p-6 ${className}`}>
      {children}
    </div>
  );

  const filteredApps = applications.filter(app => {
    if (activeTab === 'requests') return app.status === 'pending';
    if (activeTab === 'active') return app.status === 'approved';
    return true;
  });

  const pendingCount = applications.filter(a => a.status === 'pending').length;

  return (
    <div className="flex h-screen w-full font-sans bg-[#020C14] text-gray-100 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#00C853]/30 rounded-full blur-[120px] opacity-50 pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] opacity-40 pointer-events-none"></div>
      
      {/* 🟢 DITO NATIN INILAGAY ANG REUSABLE SIDEBAR */}
      <Sidebar />

      {/* 🟢 MAIN CONTENT AREA */}
      <div className="flex-1 h-full overflow-y-auto relative z-10 no-scrollbar">
        <div className="p-8 lg:p-12 max-w-[1600px] mx-auto">
          
          <div className="mb-10 relative">
            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 tracking-wide uppercase">Node Management</h2>
            <p className="text-gray-400 mt-2 tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_#3b82f6]"></span>
                Review and manage centers
            </p>
          </div>

          <div className="flex items-center bg-white/5 backdrop-blur-md border border-white/10 rounded-full p-1 mb-8 w-fit shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
            <button onClick={() => setActiveTab('requests')} className={`flex items-center gap-3 px-8 py-3 rounded-full font-bold text-sm transition-all duration-300 ${activeTab === 'requests' ? 'bg-[#0A1A2F] text-white border border-[#00C853]/50 shadow-[inset_0_0_15px_rgba(0,200,83,0.3)]' : 'text-gray-400 hover:text-white'}`}>
                Requests 
                {pendingCount > 0 && (
                  <span className="bg-red-500/20 text-red-400 border border-red-500/50 px-2 py-0.5 rounded-full text-xs">
                    {pendingCount}
                  </span>
                )}
            </button>
            <button onClick={() => setActiveTab('active')} className={`px-8 py-3 rounded-full font-bold text-sm transition-all duration-300 ${activeTab === 'active' ? 'bg-[#0A1A2F] text-white border border-[#00C853]/50 shadow-[inset_0_0_15px_rgba(0,200,83,0.3)]' : 'text-gray-400 hover:text-white'}`}>
                Active Nodes
            </button>
          </div>

          <GlassCard className="overflow-hidden p-0 relative group">
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="p-8 pb-4 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-lg font-bold text-white tracking-wider flex items-center gap-2 uppercase">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    {activeTab === 'requests' ? 'Pending Applications' : 'Active Centers'}
                </h3>
            </div>

            <div className="overflow-x-auto min-h-[300px]">
                {isLoading ? (
                    <div className="flex justify-center items-center h-[200px] text-gray-400">Loading data...</div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      {activeTab === 'requests' ? (
                        <tr className="text-xs text-gray-400 uppercase tracking-widest bg-white/5">
                          <th className="py-5 px-8 font-semibold">Station Name</th>
                          <th className="py-5 px-4 font-semibold">Contact No.</th>
                          <th className="py-5 px-4 font-semibold">Location</th>
                          <th className="py-5 px-4 font-semibold">Duration</th>
                          <th className="py-5 px-4 font-semibold">Date Applied</th>
                          <th className="py-5 px-4 font-semibold">Document</th>
                          <th className="py-5 px-8 font-semibold text-right">Actions</th>
                        </tr>
                      ) : (
                        <tr className="text-xs text-gray-400 uppercase tracking-widest bg-white/5">
                          <th className="py-5 px-8 font-semibold">Station Name</th>
                          <th className="py-5 px-4 font-semibold">Contact No.</th>
                          <th className="py-5 px-4 font-semibold">Location</th>
                          <th className="py-5 px-4 font-semibold">Duration</th>
                          <th className="py-5 px-8 font-semibold text-right">Actions</th>
                        </tr>
                      )}
                    </thead>

                    <tbody className="text-sm">
                      {filteredApps.length === 0 ? (
                          <tr>
                              <td colSpan="7" className="py-10 text-center text-gray-500 italic">No records found.</td>
                          </tr>
                      ) : (
                        filteredApps.map((app) => (
                          <tr key={app.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group/row">
                            <td className="py-5 px-8 font-bold text-white group-hover/row:text-[#00C853] transition-colors">{app.program_name}</td>
                            <td className="py-5 px-4 text-gray-400 font-mono">{app.contact_number}</td>
                            <td className="py-5 px-4 text-gray-400">{app.barangay}, {app.city}</td>
                            <td className="py-5 px-4">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                                  app.operation_duration.includes('More') ? 'bg-[#00C853]/10 text-[#00C853] border-[#00C853]/30' : 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                              }`}>
                                  {app.operation_duration.includes('More') ? 'Long-Term' : 'Short-Term'}
                              </span>
                            </td>

                            {activeTab === 'requests' ? (
                              <>
                                <td className="py-5 px-4 text-gray-400">{formatDate(app.created_at)}</td>
                                <td className="py-5 px-4">
                                  {app.permit_url ? (
                                      <button 
                                        onClick={() => window.open(app.permit_url, '_blank')}
                                        className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 hover:border-white/30 rounded-md transition-all text-xs font-bold tracking-wider"
                                      >
                                        VIEW
                                      </button>
                                  ) : (
                                      <span className="text-gray-500 italic text-xs">No link</span>
                                  )}
                                </td>
                                <td className="py-5 px-8 text-right">
                                  <div className="flex gap-4 justify-end">
                                      <button onClick={() => handleApprove(app.id, app.user_email, app.program_name)} className="text-gray-500 hover:text-[#00C853] transition-all transform hover:scale-125 hover:drop-shadow-[0_0_8px_rgba(0,200,83,0.8)]">
                                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                      </button>
                                      <button onClick={() => handleReject(app.id, app.program_name)} className="text-gray-500 hover:text-red-500 transition-all transform hover:scale-125 hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">
                                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                      </button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <td className="py-5 px-8 text-right">
                                <div className="flex gap-4 justify-end">
                                    <button onClick={() => handleDelete(app.id, app.program_name)} title="Delete Program" className="text-gray-500 hover:text-red-500 transition-all transform hover:scale-110 hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                    <button onClick={() => handleDeactivate(app.id, app.program_name)} title="Deactivate Node" className="text-gray-500 hover:text-orange-400 transition-all transform hover:scale-110 hover:drop-shadow-[0_0_8px_rgba(251,146,60,0.8)]">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 11-12.728 0M12 3v9" /></svg>
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

export default DropOffNodes;
import React, { useState, useEffect } from 'react';
import { supabase } from './supabase'; 
import Sidebar from './Sidebar';

export default function ContentModeration() {
  const [activeTab, setActiveTab] = useState('all_posts');
  const [posts, setPosts] = useState([]);
  const [reports, setReports] = useState([]);
  const [appeals, setAppeals] = useState([]); // 🟢 NEW STATE PARA SA APPEALS
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab === 'all_posts') fetchPosts();
    else if (activeTab === 'reports') fetchReports();
    else fetchAppeals(); // 🟢 FETCH APPEALS KAPAG CLINICK
  }, [activeTab]);

  const timeAgo = (dateString) => {
    if (!dateString) return "Just now";
    const date = new Date(dateString);
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return "Just now";
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const { data: postsData, error: postsError } = await supabase
        .from('posts') 
        .select('*')
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      const mappedPosts = (postsData || []).map(post => {
        const authorName = post.user || "Unknown User"; 
        const postText = post.desc || "No text content provided."; 
        const postImage = post.image || null; 
        const userAvatar = post.avatar || null; 

        let initials = "?";
        if (authorName && authorName !== "Unknown User") {
            const nameParts = authorName.trim().split(' ');
            initials = nameParts.length > 1 
                ? (nameParts[0][0] + nameParts[1][0]).toUpperCase() 
                : authorName.substring(0, 2).toUpperCase();
        }

        return { ...post, display_name: authorName, display_initials: initials.substring(0,2), display_image: postImage, display_text: postText, display_avatar: userAvatar };
      });
      setPosts(mappedPosts);
    } catch (error) { console.error("Error fetching posts:", error.message); } finally { setLoading(false); }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('post_reports').select('*, posts(*)').eq('status', 'Pending').order('created_at', { ascending: false });
      if (error) throw error;
      setReports(data || []);
    } catch (error) { console.error("Error fetching reports:", error.message); } finally { setLoading(false); }
  };

  // 🟢 NEW FUNCTION: FETCH APPEALS
  const fetchAppeals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('appeals').select('*, posts(*)').eq('status', 'Pending').order('created_at', { ascending: false });
      if (error) throw error;
      setAppeals(data || []);
    } catch (error) { console.error("Error fetching appeals:", error.message); } finally { setLoading(false); }
  };

  const handleDeletePost = async (postId) => {
    if (window.confirm("Are you sure you want to DELETE this post? This cannot be undone.")) {
      try {
        await supabase.from('posts').delete().eq('id', postId);
        alert("Post deleted successfully!");
        fetchPosts(); fetchReports(); fetchAppeals();
      } catch (error) { alert("Error deleting post: " + error.message); }
    }
  };

  const handleApproveReport = async (reportId, postId, reporterName, postTitle, reportReason) => {
    if (!window.confirm("Approve this report and DELETE the post?")) return;
    const autoNote = `Thank you for reporting this post for "${reportReason}". We have reviewed the content, confirmed the violation, and removed the post.`;
    try {
      await supabase.from('posts').delete().eq('id', postId); 
      await supabase.from('notifications').insert([{ owner_name: reporterName, actor_name: "GreenSort Admin", actor_avatar: "https://ui-avatars.com/api/?name=Admin&background=00C853&color=fff", action: `approved your report. Note: ${autoNote}`, post_title: postTitle }]);
      alert("Post deleted and automated notification sent!");
      fetchReports(); fetchPosts();
    } catch (error) { alert("Error: " + error.message); }
  };

  const handleDeclineReport = async (reportId, reporterName, postTitle, reportReason) => {
    if (!window.confirm("Decline this report? The post will remain active.")) return;
    const autoNote = `We have reviewed your report regarding "${reportReason}". We determined that this post does not violate our community standards.`;
    try {
      await supabase.from('post_reports').update({ status: 'Resolved' }).eq('id', reportId);
      await supabase.from('notifications').insert([{ owner_name: reporterName, actor_name: "GreenSort Admin", actor_avatar: "https://ui-avatars.com/api/?name=Admin&background=FF1744&color=fff", action: `declined your report. Note: ${autoNote}`, post_title: postTitle }]);
      alert("Report dismissed and automated notification sent!");
      fetchReports();
    } catch (error) { alert("Error: " + error.message); }
  };

  // 🟢 NEW FUNCTION: APPROVE APPEAL & RESTORE POST
  const handleRestorePost = async (appealId, postId, userName, postTitle) => {
    if (!window.confirm("Restore this post? This means the AI was wrong and the post is safe.")) return;
    try {
        await supabase.from('posts').update({ status: 'active' }).eq('id', postId);
        await supabase.from('appeals').update({ status: 'Approved' }).eq('id', appealId);
        await supabase.from('notifications').insert([{ owner_name: userName, actor_name: "GreenSort Admin", actor_avatar: "https://ui-avatars.com/api/?name=Admin&background=00C853&color=fff", action: `approved your appeal. Your post has been restored to the feed.`, post_title: postTitle }]);
        alert("Post restored successfully!");
        fetchAppeals(); fetchPosts();
    } catch (error) { alert("Error: " + error.message); }
  };

  // 🔴 NEW FUNCTION: DENY APPEAL & DELETE POST
  const handleDenyAppeal = async (appealId, postId, userName, postTitle) => {
    if (!window.confirm("Deny appeal and permanently delete this post?")) return;
    try {
        await supabase.from('posts').delete().eq('id', postId);
        await supabase.from('notifications').insert([{ owner_name: userName, actor_name: "GreenSort Admin", actor_avatar: "https://ui-avatars.com/api/?name=Admin&background=FF1744&color=fff", action: `denied your appeal. Your post violates our community rules and has been removed.`, post_title: postTitle }]);
        alert("Appeal denied and post deleted.");
        fetchAppeals(); fetchPosts();
    } catch (error) { alert("Error: " + error.message); }
  };

  return (
    <div className="flex h-screen w-full font-sans bg-[#020C14] text-gray-100 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-orange-500/20 rounded-full blur-[120px] opacity-30 pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#00C853]/20 rounded-full blur-[120px] opacity-20 pointer-events-none"></div>

      <Sidebar />

      <div className="flex-1 h-full overflow-y-auto relative z-10 no-scrollbar">
        <div className="p-8 lg:p-12 max-w-[1600px] mx-auto">
          
          <div className="mb-10 relative">
            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 tracking-wide uppercase">CONTENT MODERATION</h2>
            <p className="text-gray-400 mt-2 tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse shadow-[0_0_10px_#f97316]"></span>
                Monitor community posts, reports, and AI appeals
            </p>
            <div className="absolute bottom-[-10px] left-0 w-32 h-1 bg-gradient-to-r from-orange-500 to-transparent rounded-full"></div>
          </div>

          <div className="flex flex-wrap gap-3 items-center bg-white/5 backdrop-blur-md border border-white/10 rounded-full p-1 mb-8 w-fit shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
            <button onClick={() => setActiveTab('all_posts')} className={`flex items-center gap-3 px-8 py-3 rounded-full font-bold text-sm transition-all duration-300 ${activeTab === 'all_posts' ? 'bg-[#0A1A2F] text-white border border-blue-500/50 shadow-[inset_0_0_15px_rgba(59,130,246,0.3)]' : 'text-gray-400 hover:text-white'}`}>
                All Posts
            </button>
            <button onClick={() => setActiveTab('reports')} className={`flex items-center gap-3 px-8 py-3 rounded-full font-bold text-sm transition-all duration-300 ${activeTab === 'reports' ? 'bg-[#0A1A2F] text-white border border-red-500/50 shadow-[inset_0_0_15px_rgba(239,68,68,0.3)]' : 'text-gray-400 hover:text-white'}`}>
                User Reports
                {reports.length > 0 && (<span className="bg-red-500/20 text-red-400 border border-red-500/50 px-2 py-0.5 rounded-full text-xs">{reports.length}</span>)}
            </button>
            {/* 🟢 NEW TAB FOR APPEALS */}
            <button onClick={() => setActiveTab('appeals')} className={`flex items-center gap-3 px-8 py-3 rounded-full font-bold text-sm transition-all duration-300 ${activeTab === 'appeals' ? 'bg-[#0A1A2F] text-white border border-orange-500/50 shadow-[inset_0_0_15px_rgba(249,115,22,0.3)]' : 'text-gray-400 hover:text-white'}`}>
                AI Appeals
                {appeals.length > 0 && (<span className="bg-orange-500/20 text-orange-400 border border-orange-500/50 px-2 py-0.5 rounded-full text-xs">{appeals.length}</span>)}
            </button>
          </div>

          <div className="w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white tracking-wider">
                {activeTab === 'all_posts' ? 'Community Feed' : activeTab === 'reports' ? 'Pending Reports' : 'AI Flagged Appeals'}
              </h2>
              <button onClick={activeTab === 'all_posts' ? fetchPosts : activeTab === 'reports' ? fetchReports : fetchAppeals} className="text-sm font-semibold text-blue-400 hover:text-white transition-colors bg-blue-500/10 px-4 py-2 rounded-lg border border-blue-500/30">
                ↻ Refresh
              </button>
            </div>

            {loading ? (
              <div className="p-10 text-center text-blue-400 animate-pulse font-mono tracking-widest bg-white/5 rounded-2xl border border-white/10">FETCHING DATA...</div>
            ) : (
              <>
                {/* TAB 1: ALL POSTS */}
                {activeTab === 'all_posts' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {posts.length === 0 ? (
                      <div className="col-span-full p-10 text-center text-gray-500 font-mono bg-white/5 rounded-xl border border-white/10">No posts found.</div>
                    ) : (
                      posts.map((post) => (
                        <div key={post.id} className="bg-[#111C2A] border border-[#1A2C42] rounded-2xl overflow-hidden hover:shadow-[0_0_20px_rgba(0,200,83,0.15)] transition-all flex flex-col relative">
                          {post.status === 'flagged' && (
                              <div className="absolute top-0 left-0 w-full bg-orange-500/90 text-white text-[10px] font-bold px-3 py-1 text-center uppercase tracking-wider z-10">⚠️ Flagged by AI</div>
                          )}
                          <div className={`p-5 flex items-center justify-between ${post.status === 'flagged' ? 'mt-4' : ''}`}>
                            <div className="flex items-center gap-3">
                              {post.display_avatar ? (
                                <img src={post.display_avatar} alt="Avatar" className="w-12 h-12 rounded-full border border-[#00C853]/50 object-cover" />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-[#00C853]/20 border border-[#00C853]/50 flex items-center justify-center text-[#00C853] font-black text-md">
                                  {post.display_initials}
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-white text-md tracking-wide max-w-[150px] truncate">{post.display_name}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{timeAgo(post.created_at)}</p>
                              </div>
                            </div>
                            {post.type && <span className="bg-blue-500/20 text-blue-300 text-[10px] px-2 py-1 rounded-md border border-blue-500/30 font-bold uppercase">{post.type}</span>}
                          </div>

                          <div className="px-5 pb-4 flex-1">
                            {post.title && <h3 className="font-bold text-white text-xl mb-2 leading-tight">{post.title}</h3>}
                            <p className="text-gray-300 text-sm leading-relaxed mb-4">{post.display_text}</p>
                          </div>

                          {post.display_image && (
                            <div className="w-full h-64 bg-[#050B14] flex items-center justify-center overflow-hidden border-t border-b border-[#1A2C42]">
                              <img src={post.display_image} className="max-w-full max-h-full object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                            </div>
                          )}

                          <div className="p-4 bg-[#0D1623] flex items-center justify-between">
                            <div className="flex gap-3 text-xs text-gray-400 font-medium">
                              {post.price && post.price !== '0' && <span className="text-[#00C853] font-bold">₱{post.price}</span>}
                            </div>
                            <button onClick={() => handleDeletePost(post.id)} className="text-gray-500 hover:text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-all" title="Delete Post">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* TAB 2: REPORTS */}
                {activeTab === 'reports' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {reports.length === 0 ? (
                      <div className="col-span-full p-10 text-center text-gray-500 font-mono bg-white/5 rounded-xl border border-white/10">No pending reports. All clear!</div>
                    ) : (
                      reports.map((report) => {
                        const post = report.posts; 
                        if (!post) return null; 
                        return (
                          <div key={report.id} className="bg-[#111C2A] border-2 border-red-500/50 rounded-2xl overflow-hidden relative shadow-[0_4px_15px_rgba(0,0,0,0.5)] flex flex-col">
                            <div className="bg-red-500/10 p-4 border-b border-red-500/30">
                              <p className="text-xs text-red-400 font-bold uppercase tracking-wider mb-1">Reported by: {report.reporter_email}</p>
                              <p className="text-sm text-red-200 font-medium">{report.reason}</p>
                            </div>
                            <div className="p-5 flex-1 opacity-80">
                                <p className="font-bold text-white">{post.user}</p>
                                <h3 className="font-bold text-white text-lg mt-3">{post.title}</h3>
                                <p className="text-gray-400 text-xs line-clamp-3 mt-1">{post.desc}</p>
                            </div>
                            <div className="p-4 bg-[#0D1623] flex flex-col gap-2 border-t border-[#1A2C42]">
                              <button onClick={() => handleApproveReport(report.id, report.post_id, report.reporter_email, post.title, report.reason)} className="w-full text-white bg-red-500/80 hover:bg-red-500 py-2.5 rounded-lg text-sm font-bold">Approve & Delete Post</button>
                              <button onClick={() => handleDeclineReport(report.id, report.reporter_email, post.title, report.reason)} className="w-full text-gray-400 hover:text-white bg-white/5 py-2.5 rounded-lg text-sm font-medium border border-white/10">Decline & Keep Post</button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* 🟢 TAB 3: NEW AI APPEALS */}
                {activeTab === 'appeals' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {appeals.length === 0 ? (
                      <div className="col-span-full p-10 text-center text-gray-500 font-mono bg-white/5 rounded-xl border border-white/10">No pending appeals. All clear!</div>
                    ) : (
                      appeals.map((appeal) => {
                        const post = appeal.posts; 
                        if (!post) return null; 
                        return (
                          <div key={appeal.id} className="bg-[#111C2A] border-2 border-orange-500/50 rounded-2xl overflow-hidden relative shadow-[0_4px_15px_rgba(0,0,0,0.5)] flex flex-col">
                            <div className="bg-orange-500/10 p-4 border-b border-orange-500/30">
                              <div className="flex items-center gap-2 mb-1">
                                <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                <p className="text-xs text-orange-400 font-bold uppercase tracking-wider">Appeal by Owner: {appeal.user_name}</p>
                              </div>
                              <p className="text-xs text-orange-300 font-medium leading-snug">AI Flagged Reason: <span className="font-bold">"{appeal.reason}"</span></p>
                            </div>

                            <div className="p-5 flex-1 opacity-90">
                              {post.image && (
                                <img src={post.image} className="w-full h-32 object-cover rounded-lg mb-3 border border-white/10" alt="post" />
                              )}
                              <h3 className="font-bold text-white text-lg leading-tight">{post.title}</h3>
                              <p className="font-bold text-[#00C853] mt-1">{post.price}</p>
                              <p className="text-gray-400 text-xs mt-2">{post.desc}</p>
                            </div>

                            <div className="p-4 bg-[#0D1623] flex flex-col gap-2 border-t border-[#1A2C42]">
                              <button onClick={() => handleRestorePost(appeal.id, appeal.post_id, appeal.user_name, post.title)} className="w-full flex items-center justify-center gap-2 text-white bg-[#00C853]/80 hover:bg-[#00C853] py-2.5 rounded-lg text-sm transition-all font-bold shadow-[0_0_10px_rgba(0,200,83,0.4)]">
                                ✅ Approve Appeal (Restore Post)
                              </button>
                              <button onClick={() => handleDenyAppeal(appeal.id, appeal.post_id, appeal.user_name, post.title)} className="w-full text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500/30 py-2.5 rounded-lg text-sm transition-all font-medium border border-red-500/20">
                                🗑️ Deny Appeal (Delete Post)
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

              </>
            )}
          </div>
          <div className="h-12"></div>
        </div>
      </div>
    </div>
  );
}
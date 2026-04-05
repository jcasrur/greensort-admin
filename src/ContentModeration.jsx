import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase'; 
import Sidebar from './Sidebar';

export default function ContentModeration() {
  const [activeTab, setActiveTab] = useState('all_posts');
  const [posts, setPosts] = useState([]);
  const [reports, setReports] = useState([]);
  
  // 🟢 BAGONG STATES PARA SA COMMENTS AT USERS REPORTS
  const [commentReports, setCommentReports] = useState([]);
  const [userReports, setUserReports] = useState([]);
  
  const [loading, setLoading] = useState(true);
  
  const [selectedReportDetails, setSelectedReportDetails] = useState(null); 
  const [viewImage, setViewImage] = useState(null); 
  const [expandedReasons, setExpandedReasons] = useState({});

  useEffect(() => {
    if (activeTab === 'all_posts') fetchPosts();
    else if (activeTab === 'reports') fetchReports();
    else if (activeTab === 'reported_comments') fetchCommentReports(); // 🟢 FETCH COMMENTS
    else if (activeTab === 'reported_users') fetchUserReports(); // 🟢 FETCH USERS
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

        return {
          ...post,
          display_name: authorName,
          display_initials: initials.substring(0,2), 
          display_image: postImage,
          display_text: postText,
          display_avatar: userAvatar
        };
      });

      setPosts(mappedPosts);
    } catch (error) {
      console.error("Error fetching posts:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('post_reports')
        .select('*, posts(*)') 
        .eq('status', 'Pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error("Error fetching reports:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // 🟢 FETCH REPORTED COMMENTS
  const fetchCommentReports = async () => {
    setLoading(true);
    try {
      // ⚠️ Tiyakin na 'comment_reports' ang pangalan ng table mo sa Supabase
      const { data, error } = await supabase
        .from('comment_reports') 
        .select('*, comments(*)') 
        .eq('status', 'Pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCommentReports(data || []);
    } catch (error) {
      console.error("Error fetching comment reports:", error.message);
      setCommentReports([]); // Fallback kung wala pang table
    } finally {
      setLoading(false);
    }
  };

  // 🟢 FETCH REPORTED USERS (Messaging)
  // 🟢 FETCH REPORTED USERS (Messaging) AT KUNIN ANG AVATAR NILA
  const fetchUserReports = async () => {
    setLoading(true);
    try {
      const { data: reportsData, error } = await supabase
        .from('user_reports')
        .select('*') 
        .eq('status', 'Pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 🟢 Kung may reports, hanapin natin yung mga avatar nila sa profiles table
      if (reportsData && reportsData.length > 0) {
        // Kunin lahat ng unique na pangalan ng mga nire-report
        const userNames = [...new Set(reportsData.map(r => r.reported_user))];
        
        // I-fetch ang mga avatar nila mula sa profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .in('full_name', userNames);

        // Gumawa ng map para madaling hanapin
        const avatarMap = {};
        if (profiles) {
          profiles.forEach(p => {
            avatarMap[p.full_name] = p.avatar_url;
          });
        }

        // Idikit yung avatar sa report data
        const enrichedReports = reportsData.map(report => ({
          ...report,
          reported_avatar: avatarMap[report.reported_user] || null
        }));

        setUserReports(enrichedReports);
      } else {
        setUserReports([]);
      }

    } catch (error) {
      console.error("Error fetching user reports:", error.message);
      setUserReports([]); 
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (window.confirm("Are you sure you want to DELETE this post? This cannot be undone.")) {
      try {
        const { error } = await supabase.from('posts').delete().eq('id', postId);
        if (error) throw error;
        
        alert("Post deleted successfully!");
        fetchPosts();
        fetchReports(); 
      } catch (error) {
        alert("Error deleting post: " + error.message);
      }
    }
  };

  const handleApproveReport = async (reportId, postId, reporterName, postTitle, reportReason) => {
    if (!window.confirm("Approve this report and DELETE the post? An automated message will be sent to the reporter.")) return;

    const autoNote = `Thank you for reporting this post for "${reportReason}". We have reviewed the content, confirmed the violation, and removed the post to keep our community safe.`;

    try {
      await supabase.from('posts').delete().eq('id', postId); 
      
      await supabase.from('notifications').insert([{
        owner_name: reporterName,
        actor_name: "GreenSort Admin",
        actor_avatar: "https://ui-avatars.com/api/?name=Admin&background=00C853&color=fff",
        action: `approved your report. Note: ${autoNote}`,
        post_title: postTitle
      }]);

      alert("Post deleted and automated notification sent!");
      fetchReports(); 
      fetchPosts();
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const handleDeclineReport = async (reportId, reporterName, postTitle, reportReason) => {
    if (!window.confirm("Decline this report? The post will remain active. An automated message will be sent to the reporter.")) return;

    const autoNote = `We have reviewed your report regarding "${reportReason}". After careful review, we determined that this post does not violate our community standards at this time. Thank you for looking out for the community.`;

    try {
      await supabase.from('post_reports').update({ status: 'Resolved' }).eq('id', reportId);
      
      await supabase.from('notifications').insert([{
        owner_name: reporterName,
        actor_name: "GreenSort Admin",
        actor_avatar: "https://ui-avatars.com/api/?name=Admin&background=FF1744&color=fff",
        action: `declined your report. Note: ${autoNote}`,
        post_title: postTitle
      }]);

      alert("Report dismissed and automated notification sent!");
      fetchReports();
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const toggleReason = (id) => {
    setExpandedReasons(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
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
                Monitor community posts and user reports
            </p>
            <div className="absolute bottom-[-10px] left-0 w-32 h-1 bg-gradient-to-r from-orange-500 to-transparent rounded-full"></div>
          </div>

          {/* 🟢 UPDATED TABS NAVIGATION */}
          <div className="flex flex-wrap gap-2 items-center bg-white/5 backdrop-blur-md border border-white/10 rounded-full p-1 mb-8 w-fit shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
            <button onClick={() => setActiveTab('all_posts')} className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all duration-300 ${activeTab === 'all_posts' ? 'bg-[#0A1A2F] text-white border border-orange-500/50 shadow-[inset_0_0_15px_rgba(249,115,22,0.3)]' : 'text-gray-400 hover:text-white'}`}>
                All Posts
            </button>
            <button onClick={() => setActiveTab('reports')} className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all duration-300 ${activeTab === 'reports' ? 'bg-[#0A1A2F] text-white border border-red-500/50 shadow-[inset_0_0_15px_rgba(239,68,68,0.3)]' : 'text-gray-400 hover:text-white'}`}>
                Reported Posts
                {reports.length > 0 && <span className="bg-red-500/20 text-red-400 border border-red-500/50 px-2 py-0.5 rounded-full text-xs">{reports.length}</span>}
            </button>
            <button onClick={() => setActiveTab('reported_comments')} className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all duration-300 ${activeTab === 'reported_comments' ? 'bg-[#0A1A2F] text-white border border-yellow-500/50 shadow-[inset_0_0_15px_rgba(234,179,8,0.3)]' : 'text-gray-400 hover:text-white'}`}>
                Reported Comments
                {commentReports.length > 0 && <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 px-2 py-0.5 rounded-full text-xs">{commentReports.length}</span>}
            </button>
            <button onClick={() => setActiveTab('reported_users')} className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all duration-300 ${activeTab === 'reported_users' ? 'bg-[#0A1A2F] text-white border border-purple-500/50 shadow-[inset_0_0_15px_rgba(168,85,247,0.3)]' : 'text-gray-400 hover:text-white'}`}>
                Reported Person
                {userReports.length > 0 && <span className="bg-purple-500/20 text-purple-400 border border-purple-500/50 px-2 py-0.5 rounded-full text-xs">{userReports.length}</span>}
            </button>
          </div>

          <div className="w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white tracking-wider">
                {activeTab === 'all_posts' ? 'Community Feed' : 
                 activeTab === 'reports' ? 'Pending Post Reports' : 
                 activeTab === 'reported_comments' ? 'Pending Comment Reports' : 'Pending User Reports'}
              </h2>
              <button 
                onClick={() => {
                  if (activeTab === 'all_posts') fetchPosts();
                  else if (activeTab === 'reports') fetchReports();
                  else if (activeTab === 'reported_comments') fetchCommentReports();
                  else if (activeTab === 'reported_users') fetchUserReports();
                }} 
                className="text-sm font-semibold text-orange-400 hover:text-white transition-colors bg-orange-500/10 px-4 py-2 rounded-lg border border-orange-500/30"
              >
                ↻ Refresh
              </button>
            </div>

            {loading ? (
              <div className="p-10 text-center text-orange-400 animate-pulse font-mono tracking-widest bg-white/5 rounded-2xl border border-white/10">FETCHING DATA...</div>
            ) : (
              <>
                {/* 🟢 TAB 1: ALL POSTS */}
                {activeTab === 'all_posts' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">
                    {posts.length === 0 ? (
                      <div className="col-span-full p-10 text-center text-gray-500 font-mono bg-white/5 rounded-xl border border-white/10">No posts found.</div>
                    ) : (
                      posts.map((post) => (
                        <div key={post.id} className="bg-[#111C2A] border border-[#1A2C42] rounded-2xl overflow-hidden hover:shadow-[0_0_20px_rgba(0,200,83,0.15)] transition-all flex flex-col h-full group relative">
                          
                          <div className="p-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {post.display_avatar ? (
                                <img src={post.display_avatar} alt="Avatar" className="w-12 h-12 rounded-full border border-[#00C853]/50 object-cover shadow-[0_0_10px_rgba(0,200,83,0.2)]" />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-[#00C853]/20 border border-[#00C853]/50 flex items-center justify-center text-[#00C853] font-black text-md shadow-[0_0_10px_rgba(0,200,83,0.2)]">
                                  {post.display_initials}
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-white text-md tracking-wide max-w-[150px] truncate" title={post.display_name}>{post.display_name}</p>
                                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                  {timeAgo(post.created_at)}
                                </p>
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
                              <img 
                                src={post.display_image} 
                                alt="Post" 
                                className="max-w-full max-h-full object-contain cursor-zoom-in hover:scale-105 transition-transform duration-500" 
                                onClick={() => setViewImage(post.display_image)}
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            </div>
                          )}

                          <div className="p-4 bg-[#0D1623] flex items-center justify-between mt-auto">
                            <div className="flex gap-3 text-xs text-gray-400 font-medium">
                              {post.location && (
                                <span className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer">
                                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                  {post.location}
                                </span>
                              )}
                              {post.price && post.price !== '0' && <span className="flex items-center gap-1 text-[#00C853] font-bold">{post.price}</span>}
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

                {/* 🔴 TAB 2: REPORTED POSTS */}
                {activeTab === 'reports' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">
                    {reports.length === 0 ? (
                      <div className="col-span-full p-10 text-center text-gray-500 font-mono bg-white/5 rounded-xl border border-white/10">No pending reports. All clear!</div>
                    ) : (
                      reports.map((report) => {
                        const post = report.posts; 
                        if (!post) return null; 

                        const isLongReason = report.reason && report.reason.length > 80;

                        return (
                          <div key={report.id} className="bg-[#111C2A] border-2 border-red-500/50 rounded-2xl overflow-hidden hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] transition-all flex flex-col h-full relative shadow-[0_4px_15px_rgba(0,0,0,0.5)]">
                            
                            <div className="bg-red-500/10 p-4 border-b border-red-500/30">
                              <div className="flex items-center gap-2 mb-2">
                                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                <p className="text-xs text-red-400 font-bold uppercase tracking-wider">Reported by: {report.reporter_email}</p>
                              </div>
                              <div className="text-sm text-red-200 font-medium leading-snug break-words">
                                {isLongReason ? (
                                  <div className="flex flex-col gap-2 mt-1">
                                    <p>{report.reason.substring(0, 80)}...</p>
                                    <button onClick={() => setSelectedReportDetails(report)} className="self-start inline-flex items-center bg-red-500/20 hover:bg-red-500/40 text-red-300 px-3 py-1.5 rounded-md transition-colors text-[10px] uppercase tracking-wider font-bold border border-red-500/30">
                                      View Full Reason
                                    </button>
                                  </div>
                                ) : (
                                  report.reason
                                )}
                              </div>
                            </div>

                            <div className="p-5 flex items-center justify-between opacity-90">
                              <div className="flex items-center gap-3">
                                {post.avatar ? (
                                  <img src={post.avatar} alt="Avatar" className="w-10 h-10 rounded-full border border-gray-600 object-cover" />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white font-black text-xs">
                                    {post.user?.substring(0, 2).toUpperCase() || '?'}
                                  </div>
                                )}
                                <div>
                                  <p className="font-bold text-gray-300 text-sm tracking-wide max-w-[150px] truncate">{post.user}</p>
                                  <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">Posted {timeAgo(post.created_at)}</p>
                                </div>
                              </div>
                            </div>

                            <div className="px-5 pb-4 flex-1 opacity-90">
                              {post.title && <h3 className="font-bold text-white text-lg mb-1 leading-tight">{post.title}</h3>}
                              <p className="text-gray-400 text-xs leading-relaxed mb-3 line-clamp-3">{post.desc || "No text content provided."}</p>
                            </div>

                            {post.image && (
                              <div className="w-full h-64 bg-[#050B14] flex items-center justify-center overflow-hidden border-t border-b border-[#1A2C42]">
                                <img src={post.image} alt="Report" className="max-w-full max-h-full object-contain cursor-zoom-in hover:opacity-80 transition-all duration-300 hover:scale-105" onClick={() => setViewImage(post.image)} onError={(e) => { e.target.style.display = 'none'; }} />
                              </div>
                            )}

                            <div className="p-4 bg-[#0D1623] flex flex-col gap-2 border-t border-[#1A2C42] mt-auto">
                              <button onClick={() => handleApproveReport(report.id, report.post_id, report.reporter_email, post.title, report.reason)} className="w-full flex items-center justify-center gap-2 text-white bg-red-500/80 hover:bg-red-500 py-2.5 rounded-lg text-sm transition-all font-bold shadow-[0_0_10px_rgba(239,68,68,0.4)]">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Approve Report & Delete Post
                              </button>
                              <button onClick={() => handleDeclineReport(report.id, report.reporter_email, post.title, report.reason)} className="w-full text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 py-2.5 rounded-lg text-sm transition-all font-medium border border-white/10">
                                Decline Report & Keep Post
                              </button>
                            </div>

                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* 🟡 TAB 3: REPORTED COMMENTS */}
                {activeTab === 'reported_comments' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">
                    {commentReports.length === 0 ? (
                      <div className="col-span-full p-10 text-center text-gray-500 font-mono bg-white/5 rounded-xl border border-white/10">No pending comment reports.</div>
                    ) : (
                      commentReports.map((report) => {
                        const comment = report.comments; 
                        if (!comment) return null; 

                        const isLongReason = report.reason && report.reason.length > 80;

                        return (
                          <div key={report.id} className="bg-[#111C2A] border-2 border-yellow-500/50 rounded-2xl overflow-hidden hover:shadow-[0_0_20px_rgba(234,179,8,0.2)] transition-all flex flex-col h-full relative shadow-[0_4px_15px_rgba(0,0,0,0.5)]">
                            
                            <div className="bg-yellow-500/10 p-4 border-b border-yellow-500/30">
                              <div className="flex items-center gap-2 mb-2">
                                <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                <p className="text-xs text-yellow-400 font-bold uppercase tracking-wider">Reported by: {report.reporter_email}</p>
                              </div>
                              <div className="text-sm text-yellow-200 font-medium leading-snug break-words">
                                {isLongReason ? (
                                  <div className="flex flex-col gap-2 mt-1">
                                    <p>{report.reason.substring(0, 80)}...</p>
                                    <button onClick={() => setSelectedReportDetails(report)} className="self-start inline-flex items-center bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-300 px-3 py-1.5 rounded-md transition-colors text-[10px] uppercase tracking-wider font-bold border border-yellow-500/30">
                                      View Full Reason
                                    </button>
                                  </div>
                                ) : (
                                  report.reason
                                )}
                              </div>
                            </div>

                            <div className="p-5 flex-1 opacity-90 bg-black/20 m-4 rounded-xl border border-white/5">
                              <div className="flex items-center gap-3 mb-3">
                                {comment.avatar ? (
                                  <img src={comment.avatar} alt="Avatar" className="w-8 h-8 rounded-full border border-gray-600 object-cover" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white font-black text-xs">
                                    {comment.user_name?.substring(0, 2).toUpperCase() || '?'}
                                  </div>
                                )}
                                <div>
                                  <p className="font-bold text-gray-300 text-sm">{comment.user_name}</p>
                                  <p className="text-[10px] text-gray-500">{timeAgo(comment.created_at)}</p>
                                </div>
                              </div>
                              <p className="text-gray-300 text-sm leading-relaxed border-l-2 border-yellow-500/50 pl-3 italic">
                                "{comment.text}"
                              </p>
                            </div>

                            <div className="p-4 bg-[#0D1623] flex flex-col gap-2 border-t border-[#1A2C42] mt-auto">
                              <button onClick={() => alert('Add Delete Comment Logic here!')} className="w-full flex items-center justify-center gap-2 text-black bg-yellow-500 hover:bg-yellow-400 py-2.5 rounded-lg text-sm transition-all font-bold shadow-[0_0_10px_rgba(234,179,8,0.4)]">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Delete Comment
                              </button>
                              <button onClick={() => alert('Add Decline Comment Logic here!')} className="w-full text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 py-2.5 rounded-lg text-sm transition-all font-medium border border-white/10">
                                Dismiss Report
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* 🟣 TAB 4: REPORTED USERS (MESSAGING) */}
                {activeTab === 'reported_users' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">
                    {userReports.length === 0 ? (
                      <div className="col-span-full p-10 text-center text-gray-500 font-mono bg-white/5 rounded-xl border border-white/10">No pending user reports.</div>
                    ) : (
                      userReports.map((report) => {
                        const isLongReason = report.reason && report.reason.length > 80;

                        return (
                          <div key={report.id} className="bg-[#111C2A] border-2 border-purple-500/50 rounded-2xl overflow-hidden hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] transition-all flex flex-col h-full relative shadow-[0_4px_15px_rgba(0,0,0,0.5)]">
                            
                            <div className="bg-purple-500/10 p-4 border-b border-purple-500/30">
                              <div className="flex items-center gap-2 mb-2">
                                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                <p className="text-xs text-purple-400 font-bold uppercase tracking-wider">Reported by: {report.reporter_email}</p>
                              </div>
                              <div className="text-sm text-purple-200 font-medium leading-snug break-words">
                                {isLongReason ? (
                                  <div className="flex flex-col gap-2 mt-1">
                                    <p>{report.reason.substring(0, 80)}...</p>
                                    <button onClick={() => setSelectedReportDetails(report)} className="self-start inline-flex items-center bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 px-3 py-1.5 rounded-md transition-colors text-[10px] uppercase tracking-wider font-bold border border-purple-500/30">
                                      View Full Reason
                                    </button>
                                  </div>
                                ) : (
                                  report.reason
                                )}
                              </div>
                            </div>

                            <div className="p-8 flex-1 flex flex-col items-center justify-center opacity-90 text-center">
                                {/* 🟢 IPAPAKITA NA ANG PICTURE KUNG MERON */}
                                {report.reported_avatar ? (
                                  <img 
                                    src={report.reported_avatar} 
                                    alt="User Avatar" 
                                    className="w-20 h-20 rounded-full object-cover mb-4 border-4 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.3)]" 
                                  />
                                ) : (
                                  <div className="w-20 h-20 rounded-full bg-gray-600 flex items-center justify-center text-white font-black text-2xl mb-4 border-4 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                                    {report.reported_user?.substring(0, 2).toUpperCase() || 'U'}
                                  </div>
                                )}
                                
                                <h3 className="font-bold text-white text-xl">{report.reported_user || 'Unknown User'}</h3>
                                <p className="text-gray-400 text-xs mt-1">Reported User Account</p>
                            </div>

                            <div className="p-4 bg-[#0D1623] flex flex-col gap-2 border-t border-[#1A2C42] mt-auto">
                              <button onClick={() => alert('Add Ban User Logic here!')} className="w-full flex items-center justify-center gap-2 text-white bg-purple-600 hover:bg-purple-500 py-2.5 rounded-lg text-sm transition-all font-bold shadow-[0_0_10px_rgba(168,85,247,0.4)]">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                Ban / Warn User
                              </button>
                              <button onClick={() => alert('Add Dismiss User Report Logic here!')} className="w-full text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 py-2.5 rounded-lg text-sm transition-all font-medium border border-white/10">
                                Dismiss Report
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

      {/* 🟢 MODAL PARA SA MAHABANG TEXT REASON ONLY */}
      {selectedReportDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn" onClick={() => setSelectedReportDetails(null)}>
          <div className="bg-[#111C2A] border border-red-500/50 rounded-2xl p-6 max-w-lg w-full shadow-[0_0_30px_rgba(239,68,68,0.3)]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Full Report Details
            </h3>
            
            <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Reported by: {selectedReportDetails.reporter_email}</p>
            
            <div className="max-h-[60vh] overflow-y-auto no-scrollbar mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
              <p className="text-red-200 leading-relaxed whitespace-pre-wrap break-words text-sm">
                {selectedReportDetails.reason}
              </p>
            </div>
            
            <button 
              onClick={() => setSelectedReportDetails(null)}
              className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-all border border-white/10"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* 🟢 FULLSCREEN IMAGE VIEWER MODAL */}
      {viewImage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-zoom-out animate-fadeIn" onClick={() => setViewImage(null)}>
          <button className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors bg-black/50 p-2 rounded-full shadow-lg" onClick={() => setViewImage(null)} title="Close image">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <img src={viewImage} alt="Enlarged view" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.8)]" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

    </div>
  );
}
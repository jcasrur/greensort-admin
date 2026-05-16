import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import Sidebar from './Sidebar';
import { useTheme } from './ThemeContext';

export default function ContentModeration() {
  const { isLightMode, t } = useTheme();
  const [activeTab, setActiveTab] = useState('all_posts');
  const [posts, setPosts] = useState([]);
  const [reports, setReports] = useState([]);
  const [commentReports, setCommentReports] = useState([]);
  const [userReports, setUserReports] = useState([]);
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReportDetails, setSelectedReportDetails] = useState(null);
  const [viewImage, setViewImage] = useState(null);
  const [banModal, setBanModal] = useState(null);

  // ─── STABLE TEXT COLORS ────────────────────────────────────────────────────
  // Forces proper light/dark contrast instead of relying on the context variable
  const txtMain  = isLightMode ? 'text-[#1A2A1A]' : 'text-[#E8F0E5]';
  const txtSub   = isLightMode ? 'text-[#2D4A38]' : 'text-[#C4D9CC]';
  const txtMuted = isLightMode ? 'text-[#5E7A67]' : 'text-[#A8BDA2]';

  useEffect(() => {
    if (activeTab === 'all_posts')         fetchPosts();
    else if (activeTab === 'reports')      fetchReports();
    else if (activeTab === 'reported_comments') fetchCommentReports();
    else if (activeTab === 'reported_users')    fetchUserReports();
    else if (activeTab === 'appeals')      fetchAppeals();
  }, [activeTab]);

  const timeAgo = (ds) => {
    if (!ds) return 'Just now';
    const s = Math.floor((Date.now() - new Date(ds)) / 1000);
    if (s < 60) return 'Just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    if (s < 2592000) return `${Math.floor(s / 86400)}d ago`;
    return `${Math.floor(s / 2592000)}mo ago`;
  };

  // ─── Fetchers ────────────────────────────────────────────────────────────
  const fetchPosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const mapped = (data || []).map(post => {
        const authorName = post.user || 'Unknown User';
        const initials = authorName !== 'Unknown User'
          ? authorName.trim().split(' ').reduce((a, p, i) => i < 2 ? a + p[0] : a, '').toUpperCase()
          : '?';
        return { ...post, display_name: authorName, display_initials: initials.substring(0, 2), display_image: post.image || null, display_text: post.desc || 'No content.', display_avatar: post.avatar || null };
      });
      setPosts(mapped);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('post_reports').select('*, posts(*)').eq('status', 'Pending').order('created_at', { ascending: false });
      if (error) throw error;
      setReports(data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchCommentReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('comment_reports').select('*, comments(*)').eq('status', 'Pending').order('created_at', { ascending: false });
      if (error) throw error;
      setCommentReports(data || []);
    } catch (e) { console.error(e); setCommentReports([]); } finally { setLoading(false); }
  };

  const fetchUserReports = async () => {
    setLoading(true);
    try {
      const { data: reportsData, error } = await supabase.from('user_reports').select('*').eq('status', 'Pending').order('created_at', { ascending: false });
      if (error) throw error;
      if (reportsData && reportsData.length > 0) {
        const names = [...new Set(reportsData.map(r => r.reported_user))];
        const { data: profiles } = await supabase.from('profiles').select('full_name, avatar_url').in('full_name', names);
        const avatarMap = {};
        if (profiles) profiles.forEach(p => { avatarMap[p.full_name] = p.avatar_url; });
        setUserReports(reportsData.map(r => ({ ...r, reported_avatar: avatarMap[r.reported_user] || null })));
      } else setUserReports([]);
    } catch (e) { console.error(e); setUserReports([]); } finally { setLoading(false); }
  };

  const fetchAppeals = async () => {
    setLoading(true);
    try {
      const { data: appealsData, error } = await supabase
        .from('appeals')
        .select('*')
        .eq('status', 'Pending')
        .order('created_at', { ascending: false });
      if (error) throw error;

      if (!appealsData || appealsData.length === 0) {
        setAppeals([]);
        return;
      }

      const postIds = [...new Set(appealsData.map(a => a.post_id).filter(Boolean))];
      let postsMap = {};
      if (postIds.length > 0) {
        const { data: postsData } = await supabase
          .from('posts')
          .select('id, title, desc, image, ai_reason, user, avatar, status')
          .in('id', postIds);
        if (postsData) postsData.forEach(p => { postsMap[p.id] = p; });
      }

      const enriched = appealsData.map(a => ({
        ...a,
        posts: postsMap[a.post_id] || null,
      }));

      setAppeals(enriched);
    } catch (e) { console.error('fetchAppeals error:', e); setAppeals([]); } finally { setLoading(false); }
  };

  // ─── Action handlers ─────────────────────────────────────────────────────
  const handleDeletePost = async (postId) => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
      alert('Post deleted!');
      fetchPosts(); fetchReports();
    } catch (e) { alert('Error: ' + e.message); }
  };

  const handleApproveReport = async (reportId, postId, reporterName, postTitle, reportReason) => {
    if (!window.confirm('Approve this report and DELETE the post?')) return;
    const note = `Thank you for reporting this post for "${reportReason}". We reviewed it, confirmed the violation, and removed the post.`;
    try {
      await supabase.from('posts').delete().eq('id', postId);
      await supabase.from('notifications').insert([{ owner_name: reporterName, actor_name: 'GreenSort Admin', actor_avatar: 'https://ui-avatars.com/api/?name=Admin&background=2D6A4F&color=fff', action: `approved your report. Note: ${note}`, post_title: postTitle }]);
      alert('Post deleted and notification sent!');
      fetchReports(); fetchPosts();
    } catch (e) { alert('Error: ' + e.message); }
  };

  const handleDeclineReport = async (reportId, reporterName, postTitle, reportReason) => {
    if (!window.confirm('Decline this report? Post stays active.')) return;
    const note = `We reviewed your report on "${reportReason}". This post does not violate our standards at this time.`;
    try {
      await supabase.from('post_reports').update({ status: 'Resolved' }).eq('id', reportId);
      await supabase.from('notifications').insert([{ owner_name: reporterName, actor_name: 'GreenSort Admin', actor_avatar: 'https://ui-avatars.com/api/?name=Admin&background=A0442A&color=fff', action: `declined your report. Note: ${note}`, post_title: postTitle }]);
      alert('Report dismissed and notification sent!');
      fetchReports();
    } catch (e) { alert('Error: ' + e.message); }
  };

  const handleRestorePost = async (appeal) => {
    const post = appeal.posts;
    if (!post) return alert('Cannot find the original post. It may have already been deleted.');
    if (!window.confirm(`Restore "${post.title || 'this post'}" to the public feed?`)) return;

    try {
      const { error: postError } = await supabase
        .from('posts')
        .update({ status: 'active', ai_reason: null })
        .eq('id', post.id);
      if (postError) throw postError;

      const { error: appealError } = await supabase
        .from('appeals')
        .update({ status: 'Approved' })
        .eq('id', appeal.id);
      if (appealError) throw appealError;

      await supabase.from('notifications').insert([{
        owner_name: appeal.user_name,
        actor_name: 'GreenSort Admin',
        actor_avatar: 'https://ui-avatars.com/api/?name=Admin&background=2D6A4F&color=fff',
        action: 'approved your appeal. Your post has been restored to the community feed.',
        post_title: post.title || 'Your post',
        is_read: false,
      }]);

      alert(`✅ Post restored! "${post.title || 'Post'}" is now live again.`);
      fetchAppeals();
    } catch (e) { alert('Error: ' + e.message); }
  };

  const handleUpholdFlag = async (appeal) => {
    const post = appeal.posts;
    if (!window.confirm(`Uphold the AI flag and keep this post hidden?`)) return;

    try {
      const { error: appealError } = await supabase
        .from('appeals')
        .update({ status: 'Rejected' })
        .eq('id', appeal.id);
      if (appealError) throw appealError;

      await supabase.from('notifications').insert([{
        owner_name: appeal.user_name,
        actor_name: 'GreenSort Admin',
        actor_avatar: 'https://ui-avatars.com/api/?name=Admin&background=A0442A&color=fff',
        action: 'reviewed your appeal and upheld the flag. Your post remains hidden as it violates our community standards.',
        post_title: post?.title || 'Your post',
        is_read: false,
      }]);

      alert('Flag upheld. Post remains hidden and user has been notified.');
      fetchAppeals();
    } catch (e) { alert('Error: ' + e.message); }
  };

  // ─── Shared style helpers ────────────────────────────────────────────────
  const cardBase = `rounded-2xl border overflow-hidden transition-all ${isLightMode ? 'bg-white border-[#E3E8E1]' : 'bg-[#161D19] border-white/[0.05]'}`;
  const cardHeader = (color) => `p-4 border-b flex items-start gap-3 ${
    color === 'red'    ? (isLightMode ? 'bg-red-50 border-red-100'       : 'bg-red-500/5 border-red-500/10') :
    color === 'yellow' ? (isLightMode ? 'bg-amber-50 border-amber-100'   : 'bg-amber-500/5 border-amber-500/10') :
    color === 'purple' ? (isLightMode ? 'bg-violet-50 border-violet-100' : 'bg-violet-500/5 border-violet-500/10') :
    color === 'orange' ? (isLightMode ? 'bg-orange-50 border-orange-100' : 'bg-orange-500/5 border-orange-500/10') :
    (isLightMode ? 'bg-[#F7F9F6] border-[#EDF0EB]' : 'bg-white/[0.02] border-white/[0.04]')
  }`;
  const iconColor  = { red: 'text-red-500', yellow: 'text-amber-500', purple: 'text-violet-500', orange: 'text-orange-500' };
  const reporterText = { red: isLightMode ? 'text-red-600' : 'text-red-400', yellow: isLightMode ? 'text-amber-700' : 'text-amber-400', purple: isLightMode ? 'text-violet-700' : 'text-violet-400', orange: isLightMode ? 'text-orange-700' : 'text-orange-400' };
  const reasonText   = { red: isLightMode ? 'text-red-700' : 'text-red-300', yellow: isLightMode ? 'text-amber-800' : 'text-amber-200', purple: isLightMode ? 'text-violet-700' : 'text-violet-200', orange: isLightMode ? 'text-orange-800' : 'text-orange-200' };

  const tabs = [
    { key: 'all_posts',          label: 'All Posts',          count: 0 },
    { key: 'reports',            label: 'Reported Posts',     count: reports.length },
    { key: 'reported_comments',  label: 'Reported Comments',  count: commentReports.length },
    { key: 'reported_users',     label: 'Reported Person',    count: userReports.length },
    { key: 'appeals',            label: 'Appeals',            count: appeals.length },
  ];

  const badgeCount = (n) => n > 0
    ? <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isLightMode ? 'bg-red-100 text-red-600' : 'bg-red-500/15 text-red-400'}`}>{n}</span>
    : null;

  const refreshCurrentTab = () => {
    if (activeTab === 'all_posts')         fetchPosts();
    else if (activeTab === 'reports')      fetchReports();
    else if (activeTab === 'reported_comments') fetchCommentReports();
    else if (activeTab === 'reported_users')    fetchUserReports();
    else if (activeTab === 'appeals')      fetchAppeals();
  };

  return (
    <div className={`flex h-screen w-full font-sans ${t.bg} transition-colors duration-300 overflow-hidden`}>
      <Sidebar />

      <div className="flex-1 h-full overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="p-6 lg:p-8 max-w-[1500px] mx-auto">

          {/* Header */}
          <div className="mb-7">
            <h1 className={`text-3xl font-bold ${t.textMain} tracking-tight`}>Content Moderation</h1>
            <p className={`${t.textMuted} mt-1 font-medium text-sm`}>Monitor community posts and user reports</p>
          </div>

          {/* Tabs */}
          <div className={`flex flex-wrap gap-1 p-1 rounded-2xl border w-fit mb-7 ${isLightMode ? 'bg-[#F0F4EE] border-[#E3E8E1]' : 'bg-[#111814] border-white/[0.05]'}`}>
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all duration-200 ${
                  activeTab === tab.key
                    ? (isLightMode ? 'bg-white text-[#2D6A4F] shadow-sm font-semibold' : 'bg-[#1C2620] text-[#52B788] border border-[#52B788]/20 font-semibold')
                    : `${txtMuted} ${isLightMode ? 'hover:text-[#1A2A1A]' : 'hover:text-[#E8F0E5]'} font-medium`
                }`}
              >
                {tab.label}
                {badgeCount(tab.count)}
              </button>
            ))}
          </div>

          {/* Top bar */}
          <div className="flex justify-between items-center mb-5">
            <h2 className={`text-base font-semibold ${txtMain}`}>
              {activeTab === 'all_posts'         ? 'Community Feed' :
               activeTab === 'reports'           ? 'Pending Post Reports' :
               activeTab === 'reported_comments' ? 'Pending Comment Reports' :
               activeTab === 'reported_users'    ? 'Pending User Reports' :
               'Pending Post Appeals'}
            </h2>
            <button
              onClick={refreshCurrentTab}
              className={`text-xs font-semibold flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all ${t.accentText} ${isLightMode ? 'border-[#A8CFBA] bg-[#D8EDDF] hover:bg-[#C4E0CF]' : 'border-[#52B788]/25 bg-[#52B788]/8 hover:bg-[#52B788]/15'}`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Refresh
            </button>
          </div>

          {loading ? (
            <div className={`flex items-center justify-center h-48 rounded-2xl border ${isLightMode ? 'bg-white border-[#E3E8E1]' : 'bg-[#161D19] border-white/[0.05]'}`}>
              <p className={`text-sm font-medium animate-pulse ${t.accentText}`}>Loading data…</p>
            </div>
          ) : (
            <>
              {/* TAB 1: ALL POSTS */}
              {activeTab === 'all_posts' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {posts.length === 0
                    ? <div className={`col-span-full p-10 text-center rounded-2xl border ${isLightMode ? 'bg-white border-[#E3E8E1] text-[#7A8C77]' : 'bg-[#161D19] border-white/[0.05] text-[#627A5C]'} text-sm italic`}>No posts found.</div>
                    : posts.map(post => (
                      <div key={post.id} className={`${cardBase} flex flex-col hover:shadow-md transition-shadow`}>
                        <div className={`p-4 flex items-center justify-between ${isLightMode ? 'border-b border-[#EDF0EB]' : 'border-b border-white/[0.04]'}`}>
                          <div className="flex items-center gap-3">
                            {post.display_avatar
                              ? <img src={post.display_avatar} alt="avatar" className="w-9 h-9 rounded-full object-cover border border-[#E3E8E1]" />
                              : <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${t.iconBg1}`}>{post.display_initials}</div>
                            }
                            <div>
                              <p className={`text-sm font-semibold ${txtMain} max-w-[160px] truncate`}>{post.display_name}</p>
                              <p className={`text-[11px] ${txtMuted}`}>{timeAgo(post.created_at)}</p>
                            </div>
                          </div>
                          {post.type && <span className={`text-[9px] font-bold px-2 py-1 rounded-lg uppercase ${isLightMode ? 'bg-[#DDE9F5] text-[#2A5FA8]' : 'bg-[#4A9ECC]/10 text-[#4A9ECC]'}`}>{post.type}</span>}
                        </div>

                        <div className="p-4 flex-1">
                          {post.title && <h3 className={`font-semibold ${txtMain} text-sm mb-1.5 leading-snug`}>{post.title}</h3>}
                          <p className={`text-sm ${txtMuted} leading-relaxed line-clamp-3`}>{post.display_text}</p>
                        </div>

                        {post.display_image && (
                          <div className={`w-full h-52 flex items-center justify-center overflow-hidden border-t border-b ${isLightMode ? 'bg-[#F7F9F6] border-[#EDF0EB]' : 'bg-[#0F1512] border-white/[0.04]'}`}>
                            <img src={post.display_image} alt="Post" className="max-w-full max-h-full object-contain cursor-zoom-in hover:opacity-90 transition-opacity" onClick={() => setViewImage(post.display_image)} onError={e => { e.target.style.display = 'none'; }} />
                          </div>
                        )}

                        <div className={`p-3 flex items-center justify-between ${isLightMode ? 'bg-[#F7F9F6]' : 'bg-white/[0.015]'}`}>
                          <div className={`flex gap-3 text-[11px] ${txtMuted}`}>
                            {post.location && <span className="flex items-center gap-1">{post.location}</span>}
                            {post.price && post.price !== '0' && <span className={`font-semibold ${t.accentText}`}>{post.price}</span>}
                          </div>
                          <button onClick={() => handleDeletePost(post.id)} className={`p-1.5 rounded-lg transition-all ${txtMuted} hover:text-red-500 hover:bg-red-500/10`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}

              {/* TAB 2: REPORTED POSTS */}
              {activeTab === 'reports' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {reports.length === 0
                    ? <div className={`col-span-full p-10 text-center rounded-2xl border ${isLightMode ? 'bg-white border-[#E3E8E1] text-[#7A8C77]' : 'bg-[#161D19] border-white/[0.05] text-[#627A5C]'} text-sm italic`}>No pending reports. All clear!</div>
                    : reports.map(report => {
                      const post = report.posts;
                      if (!post) return null;
                      const isLong = report.reason && report.reason.length > 80;
                      return (
                        <div key={report.id} className={`${cardBase} flex flex-col border-red-200/60 ${isLightMode ? '' : '!border-red-500/20'}`}>
                          <div className={cardHeader('red')}>
                            <svg className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconColor.red}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            <div className="min-w-0">
                              <p className={`text-[10px] font-bold uppercase tracking-wider ${reporterText.red} mb-1`}>Reported by: {report.reporter_email}</p>
                              <p className={`text-xs leading-relaxed ${reasonText.red}`}>
                                {isLong ? (<>{report.reason.substring(0, 80)}… <button onClick={() => setSelectedReportDetails(report)} className="underline font-semibold ml-1">See more</button></>) : report.reason}
                              </p>
                            </div>
                          </div>
                          <div className="p-4 flex items-center gap-3">
                            {post.avatar ? <img src={post.avatar} alt="a" className="w-8 h-8 rounded-full object-cover" /> : <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${t.iconBg1}`}>{(post.user || '?').substring(0, 2).toUpperCase()}</div>}
                            <div>
                              <p className={`text-sm font-semibold ${txtMain}`}>{post.user}</p>
                              <p className={`text-[11px] ${txtMuted}`}>Posted {timeAgo(post.created_at)}</p>
                            </div>
                          </div>
                          <div className="px-4 pb-3 flex-1">
                            {post.title && <p className={`font-semibold ${txtMain} text-sm mb-1`}>{post.title}</p>}
                            <p className={`text-xs ${txtMuted} line-clamp-2`}>{post.desc || 'No content.'}</p>
                          </div>
                          {post.image && (
                            <div className={`w-full h-44 flex items-center justify-center overflow-hidden border-t border-b ${isLightMode ? 'bg-[#F7F9F6] border-[#EDF0EB]' : 'bg-[#0F1512] border-white/[0.04]'}`}>
                              <img src={post.image} alt="Report" className="max-w-full max-h-full object-contain cursor-zoom-in hover:opacity-80 transition-opacity" onClick={() => setViewImage(post.image)} onError={e => { e.target.style.display = 'none'; }} />
                            </div>
                          )}
                          <div className={`p-3 flex flex-col gap-2 ${isLightMode ? 'bg-[#FDF8F8]' : 'bg-red-500/[0.03]'}`}>
                            <button onClick={() => handleApproveReport(report.id, report.post_id, report.reporter_email, post.title, report.reason)}
                              className="w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all bg-red-500 hover:bg-red-400">
                              Approve Report & Delete Post
                            </button>
                            <button onClick={() => handleDeclineReport(report.id, report.reporter_email, post.title, report.reason)}
                              className={`w-full py-2.5 rounded-xl text-xs font-medium transition-all ${txtMuted} ${isLightMode ? 'bg-[#F4F6F2] hover:bg-[#EDF0EB]' : 'bg-white/[0.04] hover:bg-white/[0.07]'}`}>
                              Decline Report & Keep Post
                            </button>
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
              )}

              {/* TAB 3: REPORTED COMMENTS */}
              {activeTab === 'reported_comments' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {commentReports.length === 0
                    ? <div className={`col-span-full p-10 text-center rounded-2xl border ${isLightMode ? 'bg-white border-[#E3E8E1] text-[#7A8C77]' : 'bg-[#161D19] border-white/[0.05] text-[#627A5C]'} text-sm italic`}>No pending comment reports.</div>
                    : commentReports.map(report => {
                      const comment = report.comments;
                      if (!comment) return null;
                      const isLong = report.reason && report.reason.length > 80;
                      return (
                        <div key={report.id} className={`${cardBase} flex flex-col border-amber-200/60 ${isLightMode ? '' : '!border-amber-500/20'}`}>
                          <div className={cardHeader('yellow')}>
                            <svg className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconColor.yellow}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            <div className="min-w-0">
                              <p className={`text-[10px] font-bold uppercase tracking-wider ${reporterText.yellow} mb-1`}>Reported by: {report.reporter_email}</p>
                              <p className={`text-xs leading-relaxed ${reasonText.yellow}`}>
                                {isLong ? (<>{report.reason.substring(0, 80)}… <button onClick={() => setSelectedReportDetails(report)} className="underline font-semibold ml-1">See more</button></>) : report.reason}
                              </p>
                            </div>
                          </div>
                          <div className={`m-4 p-4 rounded-xl border ${isLightMode ? 'bg-[#FAFBF9] border-[#EDF0EB]' : 'bg-white/[0.02] border-white/[0.04]'}`}>
                            <div className="flex items-center gap-2.5 mb-3">
                              {comment.avatar ? <img src={comment.avatar} alt="a" className="w-7 h-7 rounded-full object-cover" /> : <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${t.iconBg1}`}>{(comment.user_name || '?').substring(0, 2).toUpperCase()}</div>}
                              <div>
                                <p className={`text-xs font-semibold ${txtMain}`}>{comment.user_name}</p>
                                <p className={`text-[10px] ${txtMuted}`}>{timeAgo(comment.created_at)}</p>
                              </div>
                            </div>
                            <p className={`text-xs ${txtMuted} leading-relaxed border-l-2 pl-3 italic ${isLightMode ? 'border-amber-300' : 'border-amber-500/40'}`}>"{comment.text}"</p>
                          </div>
                          <div className="flex-1" />
                          <div className={`p-3 flex flex-col gap-2 ${isLightMode ? 'bg-[#FFFBF4]' : 'bg-amber-500/[0.03]'}`}>
                            <button
                              onClick={() => handleDeleteComment(report)}
                              className="w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all bg-amber-500 hover:bg-amber-400"
                            >
                              Delete Comment
                            </button>
                            <button
                              onClick={() => handleDismissCommentReport(report)}
                              className={`w-full py-2.5 rounded-xl text-xs font-medium transition-all ${txtMuted} ${isLightMode ? 'bg-[#F4F6F2] hover:bg-[#EDF0EB]' : 'bg-white/[0.04] hover:bg-white/[0.07]'}`}
                            >
                              Dismiss Report
                            </button>
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
              )}

              {/* TAB 4: REPORTED USERS */}
              {activeTab === 'reported_users' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {userReports.length === 0
                    ? <div className={`col-span-full p-10 text-center rounded-2xl border ${isLightMode ? 'bg-white border-[#E3E8E1] text-[#7A8C77]' : 'bg-[#161D19] border-white/[0.05] text-[#627A5C]'} text-sm italic`}>No pending user reports.</div>
                    : userReports.map(report => {
                      const isLong = report.reason && report.reason.length > 80;
                      return (
                        <div key={report.id} className={`${cardBase} flex flex-col border-violet-200/60 ${isLightMode ? '' : '!border-violet-500/20'}`}>
                          <div className={cardHeader('purple')}>
                            <svg className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconColor.purple}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            <div className="min-w-0">
                              <p className={`text-[10px] font-bold uppercase tracking-wider ${reporterText.purple} mb-1`}>Reported by: {report.reporter_email}</p>
                              <p className={`text-xs leading-relaxed ${reasonText.purple}`}>
                                {isLong ? (<>{report.reason.substring(0, 80)}… <button onClick={() => setSelectedReportDetails(report)} className="underline font-semibold ml-1">See more</button></>) : report.reason}
                              </p>
                            </div>
                          </div>
                          <div className="flex-1 flex flex-col items-center justify-center py-10 gap-3">
                            {report.reported_avatar
                              ? <img src={report.reported_avatar} alt="User" className={`w-20 h-20 rounded-full object-cover border-4 ${isLightMode ? 'border-[#E3E8E1]' : 'border-white/[0.07]'}`} />
                              : <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold ${t.iconBg1}`}>{(report.reported_user || 'U').substring(0, 2).toUpperCase()}</div>
                            }
                            <div className="text-center">
                              <h3 className={`font-semibold ${txtMain} text-base`}>{report.reported_user || 'Unknown User'}</h3>
                              <p className={`text-xs ${txtMuted} mt-0.5`}>Reported Account</p>
                            </div>
                          </div>
                          <div className={`p-3 flex flex-col gap-2 ${isLightMode ? 'bg-[#FAF8FF]' : 'bg-violet-500/[0.03]'}`}>
                            <button
                              onClick={() => setBanModal({ report })}
                              className="w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all bg-violet-600 hover:bg-violet-500"
                            >
                              Ban / Warn User
                            </button>
                            <button
                              onClick={() => handleDismissUserReport(report)}
                              className={`w-full py-2.5 rounded-xl text-xs font-medium transition-all ${txtMuted} ${isLightMode ? 'bg-[#F4F6F2] hover:bg-[#EDF0EB]' : 'bg-white/[0.04] hover:bg-white/[0.07]'}`}
                            >
                              Dismiss Report
                            </button>
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
              )}

              {/* TAB 5: APPEALS */}
              {activeTab === 'appeals' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {appeals.length === 0 ? (
                    <div className={`col-span-full p-10 text-center rounded-2xl border ${isLightMode ? 'bg-white border-[#E3E8E1] text-[#7A8C77]' : 'bg-[#161D19] border-white/[0.05] text-[#627A5C]'} text-sm italic`}>
                      No pending appeals. All clear!
                    </div>
                  ) : (
                    appeals.map(appeal => {
                      const post = appeal.posts;
                      const postTitle   = post?.title   || '(Post was deleted)';
                      const postImage   = post?.image   ? post.image.split(',')[0] : null;
                      const aiReason    = post?.ai_reason || 'No AI reason recorded.';
                      const isPostGone  = !post;

                      return (
                        <div
                          key={appeal.id}
                          className={`${cardBase} flex flex-col border-orange-200/60 ${isLightMode ? '' : '!border-orange-500/20'}`}
                        >
                          <div className={cardHeader('orange')}>
                            <svg className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconColor.orange}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                            </svg>
                            <div className="min-w-0">
                              <p className={`text-[10px] font-bold uppercase tracking-wider ${reporterText.orange} mb-1`}>
                                Appeal by: <span className="normal-case">{appeal.user_name}</span>
                              </p>
                              <p className={`text-[11px] ${txtMuted}`}>{timeAgo(appeal.created_at)}</p>
                            </div>
                          </div>

                          <div className="p-4 flex-1 space-y-3">
                            <div>
                              <p className={`text-[10px] font-bold uppercase tracking-wider ${txtMuted} mb-1`}>Post Title</p>
                              <p className={`text-sm font-semibold ${isPostGone ? 'text-red-400 italic' : txtMain} leading-snug`}>
                                {postTitle}
                              </p>
                            </div>

                            {postImage && !isPostGone && (
                              <div
                                className={`w-full h-36 rounded-xl overflow-hidden border cursor-zoom-in ${isLightMode ? 'border-[#EDF0EB]' : 'border-white/[0.05]'}`}
                                onClick={() => setViewImage(postImage)}
                              >
                                <img
                                  src={postImage}
                                  alt="Post"
                                  className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                                  onError={e => { e.target.style.display = 'none'; }}
                                />
                              </div>
                            )}

                            <div className={`rounded-xl p-3 border ${isLightMode ? 'bg-red-50 border-red-100' : 'bg-red-500/5 border-red-500/10'}`}>
                              <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isLightMode ? 'text-red-600' : 'text-red-400'}`}>
                                ⚠ AI Flag Reason
                              </p>
                              <p className={`text-xs leading-relaxed ${isLightMode ? 'text-red-700' : 'text-red-300'}`}>
                                {aiReason}
                              </p>
                            </div>

                            <div className={`rounded-xl p-3 border ${isLightMode ? 'bg-orange-50 border-orange-100' : 'bg-orange-500/5 border-orange-500/10'}`}>
                              <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${reporterText.orange}`}>
                                User's Explanation
                              </p>
                              <p className={`text-xs leading-relaxed ${reasonText.orange} italic`}>
                                "{appeal.reason || 'No explanation provided.'}"
                              </p>
                            </div>
                          </div>

                          <div className={`p-3 flex flex-col gap-2 ${isLightMode ? 'bg-[#FFFAF5]' : 'bg-orange-500/[0.03]'}`}>
                            {isPostGone ? (
                              <div className={`w-full py-3 rounded-xl text-xs font-medium text-center ${isLightMode ? 'bg-[#F4F6F2] text-[#7A8C77]' : 'bg-white/[0.04] text-[#627A5C]'}`}>
                                Original post no longer exists
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleRestorePost(appeal)}
                                  className="w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center gap-2"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Restore Post
                                </button>
                                <button
                                  onClick={() => handleUpholdFlag(appeal)}
                                  className={`w-full py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-2 ${txtMuted} ${isLightMode ? 'bg-[#F4F6F2] hover:bg-[#EDF0EB]' : 'bg-white/[0.04] hover:bg-white/[0.07]'}`}
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                  </svg>
                                  Uphold Flag (Keep Hidden)
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </>
          )}

          <div className="h-12" />
        </div>
      </div>

      {/* ── Ban / Warn User Modal ── */}
      {banModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setBanModal(null)}>
          <div
            className={`w-full max-w-sm rounded-2xl border shadow-2xl ${isLightMode ? 'bg-white border-[#E3E8E1]' : 'bg-[#161D19] border-white/[0.07]'}`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`p-5 border-b ${isLightMode ? 'border-[#EDF0EB]' : 'border-white/[0.05]'}`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${txtMain}`}>Take Action on User</h3>
                  <p className={`text-[11px] font-medium ${txtMuted} mt-0.5`}>{banModal.report.reported_user}</p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div className={`p-3 rounded-xl border text-xs ${isLightMode ? 'bg-[#F7F9F6] border-[#E3E8E1]' : 'bg-white/[0.02] border-white/[0.05]'}`}>
                <p className={`font-semibold ${txtMuted} mb-1`}>Reported by: {banModal.report.reporter_email}</p>
                <p className={`${txtSub} leading-relaxed`}>{banModal.report.reason}</p>
              </div>
              <button
                onClick={() => handleBanUser(banModal.report, 'ban')}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-400 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                Ban User (set status = Banned)
              </button>
              <button
                onClick={() => handleBanUser(banModal.report, 'warn')}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-amber-500 hover:bg-amber-400 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Issue Warning Only (no ban)
              </button>
              <button
                onClick={() => setBanModal(null)}
                className={`w-full py-2.5 rounded-xl text-sm font-medium border transition-all ${
                  isLightMode ? 'border-[#E3E8E1] text-[#7A8C77] hover:bg-[#F3F6F1]' : 'border-white/[0.07] text-[#627A5C] hover:bg-white/[0.04]'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Reason Modal */}
      {selectedReportDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedReportDetails(null)}>
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl ${isLightMode ? 'bg-white border-[#E3E8E1]' : 'bg-[#161D19] border-white/[0.07]'}`} onClick={e => e.stopPropagation()}>
            <div className={`p-5 border-b ${isLightMode ? 'border-[#EDF0EB]' : 'border-white/[0.05]'} flex items-center justify-between`}>
              <h3 className={`font-semibold ${txtMain}`}>Full Report Details</h3>
              <button onClick={() => setSelectedReportDetails(null)} className={`p-1.5 rounded-lg ${txtMuted} ${isLightMode ? 'hover:text-[#1A2A1A]' : 'hover:text-[#E8F0E5]'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5">
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${txtMuted} mb-3`}>Reported by: {selectedReportDetails.reporter_email}</p>
              <div className={`max-h-[50vh] overflow-y-auto p-4 rounded-xl ${isLightMode ? 'bg-[#F7F9F6]' : 'bg-white/[0.03]'}`}>
                <p className={`text-sm ${txtSub} leading-relaxed whitespace-pre-wrap break-words`}>{selectedReportDetails.reason}</p>
              </div>
              <button onClick={() => setSelectedReportDetails(null)} className={`w-full mt-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${isLightMode ? 'bg-[#F0F4EE] text-[#3D4E3A] hover:bg-[#E3E8E1]' : 'bg-white/[0.06] text-[#B0C5AA] hover:bg-white/[0.1]'}`}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer */}
      {viewImage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-zoom-out" onClick={() => setViewImage(null)}>
          <button className="absolute top-5 right-5 text-white/50 hover:text-white bg-black/50 p-2 rounded-full transition-colors" onClick={() => setViewImage(null)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <img src={viewImage} alt="Enlarged" className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
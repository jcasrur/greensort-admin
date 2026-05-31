import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import Sidebar from './Sidebar';
import { useTheme } from './ThemeContext';

// Thresholds for auto-ban (counted ONLY from approved/resolved reports)
const POST_REPORT_BAN_THRESHOLD = 3;
const COMMENT_REPORT_BAN_THRESHOLD = 5;

export default function ContentModeration() {
  const { isLightMode, t } = useTheme();

  const [activeTab, setActiveTab] = useState('all_posts');
  const [reportsSubTab, setReportsSubTab] = useState('user'); // 'user' | 'ai'
  const [posts, setPosts] = useState([]);
  const [reports, setReports] = useState([]);
  const [aiFlagged, setAiFlagged] = useState([]);
  const [commentReports, setCommentReports] = useState([]);
  const [appeals, setAppeals] = useState([]);
  const [reportHistory, setReportHistory] = useState([]);

  const [loading, setLoading] = useState(true);
  const [selectedReportDetails, setSelectedReportDetails] = useState(null);
  const [viewImage, setViewImage] = useState(null);

  const txtMain = isLightMode ? 'text-[#1A2A1A]' : 'text-[#E8F0E5]';
  const txtSub = isLightMode ? 'text-[#2D4A38]' : 'text-[#C4D9CC]';
  const txtMuted = isLightMode ? 'text-[#5E7A67]' : 'text-[#A8BDA2]';

  useEffect(() => {
    if (activeTab === 'all_posts') fetchPosts();
    else if (activeTab === 'reports') {
      fetchReports();
      fetchAiFlagged();
    }
    else if (activeTab === 'reported_comments') fetchCommentReports();
    else if (activeTab === 'appeals') fetchAppeals();
    else if (activeTab === 'report_history') fetchReportHistory();
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

  const getOwnerNameForNotification = async (identifier) => {
    if (!identifier) return null;

    if (String(identifier).includes('@')) {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('email', identifier)
        .maybeSingle();

      if (!error && data?.full_name) {
        return data.full_name;
      }
    }

    return identifier;
  };

  const sendNotification = async ({
    owner_name,
    actor_name = 'GreenSort Admin',
    actor_avatar = 'https://ui-avatars.com/api/?name=Admin&background=2D6A4F&color=fff',
    action,
    post_title = 'GreenSort Notification',
  }) => {
    try {
      const finalOwnerName = await getOwnerNameForNotification(owner_name);

      if (!finalOwnerName || !action) {
        console.warn('Notification skipped: missing owner_name or action.');
        return;
      }

      const { error } = await supabase.from('notifications').insert([
        {
          owner_name: finalOwnerName,
          actor_name,
          actor_avatar,
          action,
          post_title,
          is_read: false,
        },
      ]);

      if (error) {
        console.warn('Notification insert failed:', error.message);
      }
    } catch (err) {
      console.warn('Notification helper error:', err.message);
    }
  };

  // -------------------------------------------------------------------------
  // AUTO MODERATION HELPERS
  // -------------------------------------------------------------------------

  // Send a warning notification to the user whose post/comment was reported.
  // Per spec: "lahat ng post/comment report = warning agad sa post/comment owner"
  const sendWarning = async ({ ownerName, kind, snippet }) => {
    if (!ownerName) return;

    const where = kind === 'comment' ? 'comment' : 'post';
    const preview = snippet
      ? ` ("${String(snippet).substring(0, 60)}${String(snippet).length > 60 ? '…' : ''}")`
      : '';

    await sendNotification({
      owner_name: ownerName,
      actor_avatar: 'https://ui-avatars.com/api/?name=Admin&background=F59E0B&color=fff',
      action: `sent you a warning. One of your ${where}s${preview} was reported by another user. Please review the community guidelines — repeated violations may lead to an account ban.`,
      post_title: 'Account Warning',
    });
  };

  // Count APPROVED/RESOLVED reports against a user and auto-ban if threshold hit.
  //   - "user" here = display_name / full_name found in posts.user or comments.user_name
  //   - Resolved post_reports counted by joining posts.user == userName
  //   - Resolved comment_reports counted by joining comments.user_name == userName
  // Returns true if the user was banned in this call.
  const checkAndAutoBan = async (userName) => {
    if (!userName) return false;

    try {
      // Skip if already banned
      const { data: profile } = await supabase
        .from('profiles')
        .select('status')
        .eq('full_name', userName)
        .maybeSingle();

      if (profile?.status === 'Banned') return false;

      // --- Count approved POST reports against this user ---
      const { data: postR, error: postErr } = await supabase
        .from('post_reports')
        .select('id, posts!inner(user)')
        .eq('status', 'Resolved')
        .eq('posts.user', userName);

      if (postErr) {
        console.warn('checkAndAutoBan post count error:', postErr.message);
      }

      const approvedPostReports = (postR || []).length;

      // --- Count approved COMMENT reports against this user ---
      const { data: commentR, error: commentErr } = await supabase
        .from('comment_reports')
        .select('id, comments!inner(user_name)')
        .eq('status', 'Resolved')
        .eq('comments.user_name', userName);

      if (commentErr) {
        console.warn('checkAndAutoBan comment count error:', commentErr.message);
      }

      const approvedCommentReports = (commentR || []).length;

      const shouldBan =
        approvedPostReports >= POST_REPORT_BAN_THRESHOLD ||
        approvedCommentReports >= COMMENT_REPORT_BAN_THRESHOLD;

      if (!shouldBan) return false;

      // --- Auto-ban: set profile to Banned ---
      const { error: banError } = await supabase
        .from('profiles')
        .update({ status: 'Banned' })
        .eq('full_name', userName);

      if (banError) {
        console.warn('Auto-ban failed:', banError.message);
        return false;
      }

      // --- Auto-resolve ALL pending reports tied to this user ---
      const { data: pendingPostR } = await supabase
        .from('post_reports')
        .select('id, posts!inner(user)')
        .eq('status', 'Pending')
        .eq('posts.user', userName);

      if (pendingPostR && pendingPostR.length > 0) {
        const ids = pendingPostR.map((r) => r.id);
        await supabase.from('post_reports').update({ status: 'Resolved' }).in('id', ids);
      }

      const { data: pendingCommentR } = await supabase
        .from('comment_reports')
        .select('id, comments!inner(user_name)')
        .eq('status', 'Pending')
        .eq('comments.user_name', userName);

      if (pendingCommentR && pendingCommentR.length > 0) {
        const ids = pendingCommentR.map((r) => r.id);
        await supabase.from('comment_reports').update({ status: 'Resolved' }).in('id', ids);
      }

      // Notify the banned user
      const reason =
        approvedPostReports >= POST_REPORT_BAN_THRESHOLD
          ? `${approvedPostReports} of your posts were confirmed as violating community guidelines`
          : `${approvedCommentReports} of your comments were confirmed as violating community guidelines`;

      await sendNotification({
        owner_name: userName,
        actor_avatar: 'https://ui-avatars.com/api/?name=Admin&background=A0442A&color=fff',
        action: `automatically banned your account. Reason: ${reason}. All pending reports against you have been closed.`,
        post_title: 'Account Banned',
      });

      return true;
    } catch (e) {
      console.error('checkAndAutoBan error:', e);
      return false;
    }
  };

  // -------------------------------------------------------------------------
  // FETCHERS
  // -------------------------------------------------------------------------

  const fetchPosts = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Hide AI-flagged posts from the All Posts feed.
      // (Detected by: status === 'flagged' AND ai_reason is set.)
      const visiblePosts = (data || []).filter(
        (p) => !(p.status === 'flagged' && p.ai_reason && String(p.ai_reason).trim().length > 0)
      );

      const mapped = visiblePosts.map((post) => {
        const authorName = post.user || 'Unknown User';
        const initials =
          authorName !== 'Unknown User'
            ? authorName
                .trim()
                .split(' ')
                .reduce((a, p, i) => (i < 2 ? a + p[0] : a), '')
                .toUpperCase()
            : '?';

        return {
          ...post,
          display_name: authorName,
          display_initials: initials.substring(0, 2),
          display_image: post.image || null,
          display_text: post.desc || 'No content.',
          display_avatar: post.avatar || null,
        };
      });

      setPosts(mapped);
    } catch (e) {
      console.error('fetchPosts error:', e);
      setPosts([]);
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
    } catch (e) {
      console.error('fetchReports error:', e);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  // Posts that the AI flagged (status='flagged' AND ai_reason set).
  // Shown in its own AI Flagged tab.
  const fetchAiFlagged = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('status', 'flagged')
        .not('ai_reason', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Extra safety: filter out empty-string ai_reason
      const filtered = (data || []).filter(
        (p) => p.ai_reason && String(p.ai_reason).trim().length > 0
      );

      setAiFlagged(filtered);
    } catch (e) {
      console.error('fetchAiFlagged error:', e);
      setAiFlagged([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCommentReports = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('comment_reports')
        .select('*, comments(*)')
        .eq('status', 'Pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCommentReports(data || []);
    } catch (e) {
      console.error('fetchCommentReports error:', e);
      setCommentReports([]);
    } finally {
      setLoading(false);
    }
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

      const postIds = [...new Set(appealsData.map((a) => a.post_id).filter(Boolean))];
      let postsMap = {};

      if (postIds.length > 0) {
        const { data: postsData } = await supabase
          .from('posts')
          .select('id, title, desc, image, ai_reason, user, avatar, status')
          .in('id', postIds);

        if (postsData) {
          postsData.forEach((p) => {
            postsMap[p.id] = p;
          });
        }
      }

      const enriched = appealsData.map((a) => ({
        ...a,
        posts: postsMap[a.post_id] || null,
      }));

      setAppeals(enriched);
    } catch (e) {
      console.error('fetchAppeals error:', e);
      setAppeals([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportHistory = async () => {
    setLoading(true);

    try {
      const [
        { data: postReports, error: postErr },
        { data: commentReportsData, error: commentErr },
        { data: userReportsData, error: userErr },
        { data: appealsData, error: appealErr },
      ] = await Promise.all([
        supabase
          .from('post_reports')
          .select('*, posts(title, user, desc)')
          .neq('status', 'Pending')
          .order('created_at', { ascending: false }),

        supabase
          .from('comment_reports')
          .select('*, comments(text, user_name)')
          .neq('status', 'Pending')
          .order('created_at', { ascending: false }),

        // Still surface legacy user_reports here so admins can see them in history,
        // even though the dedicated tab has been removed.
        supabase
          .from('user_reports')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('appeals')
          .select('*, posts(title, user)')
          .neq('status', 'Pending')
          .order('created_at', { ascending: false }),
      ]);

      if (postErr) throw postErr;
      if (commentErr) throw commentErr;
      if (userErr) console.warn('user_reports fetch warning:', userErr.message);
      if (appealErr) throw appealErr;

      const mappedPostReports = (postReports || []).map((r) => {
        // AI-marked rows have reporter_email = 'GreenSort AI'.
        const isAi = r.reporter_email === 'GreenSort AI';

        // The reason field may contain embedded post info (for cascade-safety):
        //   [POST_TITLE:...] [POST_AUTHOR:...] <reason>
        // Parse them out so history works even if the post was deleted.
        let displayTitle = r.posts?.title;
        let displayAuthor = r.posts?.user;
        let displayReason = r.reason || 'No reason provided.';

        if (r.reason) {
          const titleMatch = r.reason.match(/\[POST_TITLE:([^\]]*)\]/);
          const authorMatch = r.reason.match(/\[POST_AUTHOR:([^\]]*)\]/);

          if (titleMatch && !displayTitle) displayTitle = titleMatch[1];
          if (authorMatch && !displayAuthor) displayAuthor = authorMatch[1];

          // Clean reason: remove the marker tags so users see only the actual reason.
          displayReason = r.reason
            .replace(/\[POST_TITLE:[^\]]*\]\s*/g, '')
            .replace(/\[POST_AUTHOR:[^\]]*\]\s*/g, '')
            .trim();
        }

        return {
          id: `post-${r.id}`,
          type: isAi ? 'AI Flag' : 'Post Report',
          status: r.status || 'Resolved',
          reporter: isAi ? 'GreenSort AI' : (r.reporter_email || 'Unknown reporter'),
          reportedItem: displayTitle || 'Deleted post',
          reportedBy: displayAuthor || 'Unknown user',
          reason: displayReason,
          created_at: r.created_at,
        };
      });

      const mappedCommentReports = (commentReportsData || []).map((r) => {
        // The reason field may contain embedded comment info (cascade-safety):
        //   [COMMENT_TEXT:...] [COMMENT_AUTHOR:...] <reason>
        let displayText = r.comments?.text;
        let displayAuthor = r.comments?.user_name;
        let displayReason = r.reason || 'No reason provided.';

        if (r.reason) {
          const textMatch = r.reason.match(/\[COMMENT_TEXT:([^\]]*)\]/);
          const authorMatch = r.reason.match(/\[COMMENT_AUTHOR:([^\]]*)\]/);

          if (textMatch && !displayText) displayText = textMatch[1];
          if (authorMatch && !displayAuthor) displayAuthor = authorMatch[1];

          displayReason = r.reason
            .replace(/\[COMMENT_TEXT:[^\]]*\]\s*/g, '')
            .replace(/\[COMMENT_AUTHOR:[^\]]*\]\s*/g, '')
            .trim();
        }

        return {
          id: `comment-${r.id}`,
          type: 'Comment Report',
          status: r.status || 'Resolved',
          reporter: r.reporter_email || 'Unknown reporter',
          reportedItem: displayText || 'Deleted comment',
          reportedBy: displayAuthor || 'Unknown user',
          reason: displayReason,
          created_at: r.created_at,
        };
      });

      const mappedUserReports = (userReportsData || []).map((r) => ({
        id: `user-${r.id}`,
        type: 'User Report',
        status: r.status || 'Pending',
        reporter: r.reporter_email || 'Unknown reporter',
        reportedItem: r.reported_user || 'Unknown user',
        reportedBy: r.reported_user || 'Unknown user',
        reason: r.reason || 'No reason provided.',
        created_at: r.created_at,
      }));

      const mappedAppeals = (appealsData || []).map((a) => ({
        id: `appeal-${a.id}`,
        type: 'Appeal',
        status: a.status || 'Reviewed',
        reporter: a.user_name || 'Unknown user',
        reportedItem: a.posts?.title || 'Deleted post',
        reportedBy: a.posts?.user || a.user_name || 'Unknown user',
        reason: a.reason || 'No explanation provided.',
        created_at: a.created_at,
      }));

      const combined = [
        ...mappedPostReports,
        ...mappedCommentReports,
        ...mappedUserReports,
        ...mappedAppeals,
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setReportHistory(combined);
    } catch (e) {
      console.error('fetchReportHistory error:', e);
      setReportHistory([]);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------------------

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;

    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;

      alert('Post deleted!');
      fetchPosts();
      fetchReports();
    } catch (e) {
      console.error('handleDeletePost error:', e);
      alert('Error: ' + e.message);
    }
  };

  // Delete an AI-flagged post AND warn the owner (counts toward auto-ban).
  const handleDeleteAiFlaggedPost = async (post) => {
    if (!post?.id) return;

    if (!window.confirm(`Delete AI-flagged post "${post.title || 'this post'}"? Owner will be warned.`)) {
      return;
    }

    console.log('[AI-DELETE] === Starting delete flow for post:', post.id, post.title);

    try {
      const aiReasonText = post.ai_reason || 'Violated community guidelines.';
      const embedded = `[AI Auto-Flag — Deleted by admin] [POST_TITLE:${post.title || 'Untitled'}] [POST_AUTHOR:${post.user || 'Unknown'}] ${aiReasonText}`;

      // 1) Insert log row into post_reports BEFORE deleting the post.
      console.log('[AI-DELETE] Step 1: Inserting log row with post_id =', post.id);

      const { data: insertedRows, error: insertError } = await supabase
        .from('post_reports')
        .insert([
          {
            post_id: post.id,
            reporter_email: 'GreenSort AI',
            reason: embedded,
            status: 'Resolved',
          },
        ])
        .select();

      if (insertError) {
        console.error('[AI-DELETE] ❌ Step 1 FAILED — log insert error:');
        console.error('  message:', insertError.message);
        console.error('  details:', insertError.details);
        console.error('  hint:', insertError.hint);
        console.error('  code:', insertError.code);
        console.error('  full error object:', insertError);
      } else {
        console.log('[AI-DELETE] ✅ Step 1 OK — inserted rows:', insertedRows);
      }

      const insertedId = insertedRows?.[0]?.id;

      // 2) Delete the post.
      console.log('[AI-DELETE] Step 2: Deleting post', post.id);
      const { error: deleteError } = await supabase.from('posts').delete().eq('id', post.id);

      if (deleteError) {
        console.error('[AI-DELETE] ❌ Step 2 FAILED — post delete error:', deleteError);
        throw deleteError;
      }
      console.log('[AI-DELETE] ✅ Step 2 OK — post deleted');

      // 3) Verify the log row survived (cascade check).
      if (insertedId) {
        console.log('[AI-DELETE] Step 3: Checking if log row', insertedId, 'survived...');

        const { data: checkRow, error: checkError } = await supabase
          .from('post_reports')
          .select('id, post_id, reporter_email, status')
          .eq('id', insertedId)
          .maybeSingle();

        if (checkError) {
          console.warn('[AI-DELETE] Step 3 check error:', checkError);
        }

        if (!checkRow) {
          console.warn('[AI-DELETE] ⚠️ Step 3: Log row VANISHED (FK cascade deleted it). Re-inserting without post_id...');

          const { data: relogData, error: relogError } = await supabase
            .from('post_reports')
            .insert([
              {
                post_id: null,
                reporter_email: 'GreenSort AI',
                reason: embedded,
                status: 'Resolved',
              },
            ])
            .select();

          if (relogError) {
            console.error('[AI-DELETE] ❌ Step 3 RE-INSERT FAILED:');
            console.error('  message:', relogError.message);
            console.error('  details:', relogError.details);
            console.error('  hint:', relogError.hint);
            console.error('  code:', relogError.code);
            console.error('  full error:', relogError);
            console.error('  → If code is "23502", post_id is NOT NULL in your schema.');
            console.error('  → Fix: ALTER TABLE post_reports ALTER COLUMN post_id DROP NOT NULL;');
          } else {
            console.log('[AI-DELETE] ✅ Step 3 RE-INSERT OK — relogged with post_id=null:', relogData);
          }
        } else {
          console.log('[AI-DELETE] ✅ Step 3 OK — log row survived:', checkRow);
        }
      } else {
        console.warn('[AI-DELETE] Step 3 skipped — no inserted ID to check (Step 1 failed)');
      }

      // 4) Notify owner.
      console.log('[AI-DELETE] Step 4: Sending warning notification to:', post.user);
      await sendNotification({
        owner_name: post.user,
        actor_avatar: 'https://ui-avatars.com/api/?name=Admin&background=A0442A&color=fff',
        action: `removed your post after reviewing an AI flag. Reason: ${aiReasonText} Repeated violations may lead to an account ban.`,
        post_title: post.title || 'Your post',
      });

      // 5) Check auto-ban threshold.
      console.log('[AI-DELETE] Step 5: Checking auto-ban threshold for:', post.user);
      const banned = await checkAndAutoBan(post.user);
      console.log('[AI-DELETE] Step 5 result — banned:', banned);

      console.log('[AI-DELETE] === Flow complete ===');

      alert(
        banned
          ? `AI-flagged post deleted, owner warned, and ${post.user} was auto-banned.`
          : 'AI-flagged post deleted and owner warned.'
      );
      fetchAiFlagged();
      fetchPosts();
    } catch (e) {
      console.error('[AI-DELETE] ❌ Fatal error in handleDeleteAiFlaggedPost:', e);
      alert('Error: ' + e.message);
    }
  };

  // Keep the AI-flagged post hidden, but mark it as reviewed
  // (clears it from this section by setting status to 'hidden').
  const handleKeepAiFlaggedHidden = async (post) => {
    if (!post?.id) return;

    if (!window.confirm(`Keep "${post.title || 'this post'}" hidden? It stays off the public feed.`)) {
      return;
    }

    try {
      // Log the AI action into post_reports for Report History Logs.
      // Embed post info in reason so history still works even if FK cascades.
      const aiReasonText = post.ai_reason || 'Violated community guidelines.';
      const embedded = `[AI Auto-Flag — Kept Hidden by admin] [POST_TITLE:${post.title || 'Untitled'}] [POST_AUTHOR:${post.user || 'Unknown'}] ${aiReasonText}`;

      const { error: insertError } = await supabase.from('post_reports').insert([
        {
          post_id: post.id,
          reporter_email: 'GreenSort AI',
          reason: embedded,
          status: 'Resolved',
        },
      ]);

      if (insertError) {
        console.warn('AI log insert failed:', insertError.message);
      }

      const { error } = await supabase
        .from('posts')
        .update({ status: 'hidden' })
        .eq('id', post.id);

      if (error) throw error;

      await sendNotification({
        owner_name: post.user,
        actor_avatar: 'https://ui-avatars.com/api/?name=Admin&background=A0442A&color=fff',
        action: `kept your AI-flagged post hidden after admin review. Reason: ${aiReasonText} You may appeal this decision.`,
        post_title: post.title || 'Your post',
      });

      // Check auto-ban (this counts toward the 3-strike threshold).
      const banned = await checkAndAutoBan(post.user);

      alert(
        banned
          ? `Post kept hidden and ${post.user} was auto-banned.`
          : 'Post kept hidden.'
      );
      fetchAiFlagged();
    } catch (e) {
      console.error('handleKeepAiFlaggedHidden error:', e);
      alert('Error: ' + e.message);
    }
  };

  const handleApproveReport = async (
    reportId,
    postId,
    reporterName,
    postTitle,
    reportReason,
    postOwner,
    postDesc
  ) => {
    if (!window.confirm('Approve this report and DELETE the post?')) return;

    const note = `Thank you for reporting this post for "${reportReason}". We reviewed it, confirmed the violation, and removed the post.`;

    console.log('[USER-APPROVE] === Starting flow for report:', reportId, 'post:', postId);

    try {
      // DEFENSIVE (same pattern as AI flag delete):
      // If post_reports.post_id has ON DELETE CASCADE, deleting the post will
      // also delete the report row -> no history log.
      //
      // FIX: Before deleting the post, update the report with status='Resolved'
      // AND embed post info in the reason so it survives a cascade re-insert.

      // 1) Embed post info in reason and mark Resolved BEFORE deletion.
      const embeddedReason = `[POST_TITLE:${postTitle || 'Untitled'}] [POST_AUTHOR:${postOwner || 'Unknown'}] ${reportReason || 'No reason provided.'}`;

      console.log('[USER-APPROVE] Step 1: Marking report as Resolved + embedding info');
      const { error: reportError } = await supabase
        .from('post_reports')
        .update({ status: 'Resolved', reason: embeddedReason })
        .eq('id', reportId);

      if (reportError) {
        console.error('[USER-APPROVE] ❌ Step 1 FAILED:', reportError);
        throw reportError;
      }
      console.log('[USER-APPROVE] ✅ Step 1 OK');

      // 2) Delete the post.
      console.log('[USER-APPROVE] Step 2: Deleting post', postId);
      const { error: deleteError } = await supabase.from('posts').delete().eq('id', postId);
      if (deleteError) {
        console.error('[USER-APPROVE] ❌ Step 2 FAILED:', deleteError);
        throw deleteError;
      }
      console.log('[USER-APPROVE] ✅ Step 2 OK');

      // 3) Verify the report row survived. If cascade wiped it, re-insert.
      console.log('[USER-APPROVE] Step 3: Checking if report row', reportId, 'survived...');
      const { data: checkRow } = await supabase
        .from('post_reports')
        .select('id')
        .eq('id', reportId)
        .maybeSingle();

      if (!checkRow) {
        console.warn('[USER-APPROVE] ⚠️ Report row was CASCADE-DELETED. Re-inserting with post_id=null...');

        const { data: relogData, error: relogError } = await supabase
          .from('post_reports')
          .insert([
            {
              post_id: null,
              reporter_email: reporterName,
              reason: embeddedReason,
              status: 'Resolved',
            },
          ])
          .select();

        if (relogError) {
          console.error('[USER-APPROVE] ❌ Step 3 RE-INSERT FAILED:');
          console.error('  message:', relogError.message);
          console.error('  code:', relogError.code);
          console.error('  full error:', relogError);
        } else {
          console.log('[USER-APPROVE] ✅ Step 3 RE-INSERT OK:', relogData);
        }
      } else {
        console.log('[USER-APPROVE] ✅ Step 3 OK — report row survived');
      }

      // 4) Notify the reporter
      await sendNotification({
        owner_name: reporterName,
        actor_avatar: 'https://ui-avatars.com/api/?name=Admin&background=2D6A4F&color=fff',
        action: `approved your report. Note: ${note}`,
        post_title: postTitle || 'Reported Post',
      });

      // 5) Send a warning to the post owner (confirmed violation)
      await sendWarning({
        ownerName: postOwner,
        kind: 'post',
        snippet: postTitle || postDesc,
      });

      // 6) Check if the post owner has hit the auto-ban threshold
      const banned = await checkAndAutoBan(postOwner);

      console.log('[USER-APPROVE] === Flow complete ===');

      alert(
        banned
          ? `Post deleted, report resolved, and ${postOwner} was auto-banned.`
          : 'Post deleted and report resolved!'
      );
      fetchReports();
      fetchPosts();
    } catch (e) {
      console.error('[USER-APPROVE] ❌ Fatal error:', e);
      alert('Error: ' + e.message);
    }
  };

  const handleDeclineReport = async (
    reportId,
    reporterName,
    postTitle,
    reportReason,
    postOwner,
    postDesc
  ) => {
    if (!window.confirm('Decline this report? Post stays active.')) return;

    const note = `We reviewed your report on "${reportReason}". This post does not violate our standards at this time.`;

    try {
      // Embed post info in reason so history still has it even if the post
      // is later deleted (defensive for ON DELETE CASCADE).
      const embeddedReason = `[POST_TITLE:${postTitle || 'Untitled'}] [POST_AUTHOR:${postOwner || 'Unknown'}] ${reportReason || 'No reason provided.'}`;

      const { error } = await supabase
        .from('post_reports')
        .update({ status: 'Resolved', reason: embeddedReason })
        .eq('id', reportId);

      if (error) throw error;

      // Notify the reporter
      await sendNotification({
        owner_name: reporterName,
        actor_avatar: 'https://ui-avatars.com/api/?name=Admin&background=A0442A&color=fff',
        action: `declined your report. Note: ${note}`,
        post_title: postTitle || 'Reported Post',
      });

      // Per spec: warning is sent to the owner whenever a report is reviewed
      await sendWarning({
        ownerName: postOwner,
        kind: 'post',
        snippet: postTitle || postDesc,
      });

      alert('Report dismissed!');
      fetchReports();
    } catch (e) {
      console.error('handleDeclineReport error:', e);
      alert('Error: ' + e.message);
    }
  };

  const handleDeleteComment = async (report) => {
    const comment = report.comments;
    const commentId = comment?.id || report.comment_id;
    const commentText =
      comment?.text || 'The reported comment text is no longer available.';
    const commenterName = comment?.user_name || 'a user';

    if (!commentId) {
      alert('Comment ID not found. It may have already been deleted.');
      return;
    }

    if (!window.confirm('Delete this reported comment? This action cannot be undone.')) {
      return;
    }

    console.log('[COMMENT-DELETE] === Starting flow for report:', report.id, 'comment:', commentId);

    try {
      // DEFENSIVE: same cascade-safe pattern as post deletion.
      // Embed comment info in reason BEFORE deleting the comment.
      const originalReason = report.reason || 'No reason provided.';
      const embeddedReason = `[COMMENT_TEXT:${commentText}] [COMMENT_AUTHOR:${commenterName}] ${originalReason}`;

      // 1) Mark report as Resolved + embed info.
      console.log('[COMMENT-DELETE] Step 1: Marking report Resolved + embedding info');
      const { error: reportUpdateError } = await supabase
        .from('comment_reports')
        .update({ status: 'Resolved', reason: embeddedReason })
        .eq('id', report.id);

      if (reportUpdateError) {
        console.error('[COMMENT-DELETE] ❌ Step 1 FAILED:', reportUpdateError);
        throw reportUpdateError;
      }
      console.log('[COMMENT-DELETE] ✅ Step 1 OK');

      // 2) Delete the comment.
      console.log('[COMMENT-DELETE] Step 2: Deleting comment', commentId);
      const { error: commentDeleteError } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (commentDeleteError) {
        console.error('[COMMENT-DELETE] ❌ Step 2 FAILED:', commentDeleteError);
        throw commentDeleteError;
      }
      console.log('[COMMENT-DELETE] ✅ Step 2 OK');

      // 3) Verify the report row survived. If cascade wiped it, re-insert.
      console.log('[COMMENT-DELETE] Step 3: Checking if report row', report.id, 'survived...');
      const { data: checkRow } = await supabase
        .from('comment_reports')
        .select('id')
        .eq('id', report.id)
        .maybeSingle();

      if (!checkRow) {
        console.warn('[COMMENT-DELETE] ⚠️ Report row was CASCADE-DELETED. Re-inserting with comment_id=null...');

        const { data: relogData, error: relogError } = await supabase
          .from('comment_reports')
          .insert([
            {
              comment_id: null,
              reporter_email: report.reporter_email,
              reason: embeddedReason,
              status: 'Resolved',
            },
          ])
          .select();

        if (relogError) {
          console.error('[COMMENT-DELETE] ❌ Step 3 RE-INSERT FAILED:');
          console.error('  message:', relogError.message);
          console.error('  code:', relogError.code);
          console.error('  full error:', relogError);
        } else {
          console.log('[COMMENT-DELETE] ✅ Step 3 RE-INSERT OK:', relogData);
        }
      } else {
        console.log('[COMMENT-DELETE] ✅ Step 3 OK — report row survived');
      }

      // 4) Notify the reporter
      await sendNotification({
        owner_name: report.reporter_email,
        actor_avatar: 'https://ui-avatars.com/api/?name=Admin&background=2D6A4F&color=fff',
        action: `approved your report. Note: Your comment report was reviewed and approved. The reported comment from ${commenterName} has been removed. Reported comment: "${commentText}"`,
        post_title: 'Reported Comment',
      });

      // 5) Send warning to the commenter
      await sendWarning({
        ownerName: commenterName,
        kind: 'comment',
        snippet: commentText,
      });

      // 6) Check auto-ban threshold (5 for comments)
      const banned = await checkAndAutoBan(commenterName);

      console.log('[COMMENT-DELETE] === Flow complete ===');

      alert(
        banned
          ? `Comment deleted, report resolved, and ${commenterName} was auto-banned.`
          : 'Comment deleted and report resolved.'
      );
      fetchCommentReports();
    } catch (e) {
      console.error('[COMMENT-DELETE] ❌ Fatal error:', e);
      alert('Error: ' + e.message);
    }
  };

  const handleDismissCommentReport = async (report) => {
    const comment = report.comments;
    const commentText =
      comment?.text || 'The reported comment text is no longer available.';
    const commenterName = comment?.user_name || 'a user';

    if (!window.confirm('Dismiss this comment report? The comment will stay visible.')) {
      return;
    }

    try {
      // Embed comment info in reason so history shows it even if comment is later deleted.
      const originalReason = report.reason || 'No reason provided.';
      const embeddedReason = `[COMMENT_TEXT:${commentText}] [COMMENT_AUTHOR:${commenterName}] ${originalReason}`;

      const { error } = await supabase
        .from('comment_reports')
        .update({ status: 'Resolved', reason: embeddedReason })
        .eq('id', report.id);

      if (error) throw error;

      await sendNotification({
        owner_name: report.reporter_email,
        actor_avatar: 'https://ui-avatars.com/api/?name=Admin&background=A0442A&color=fff',
        action: `declined your report. Note: Your comment report was reviewed and declined. The reported comment from ${commenterName} does not violate our standards at this time. Reported comment: "${commentText}"`,
        post_title: 'Reported Comment',
      });

      // Per spec: warning sent on every reviewed report
      await sendWarning({
        ownerName: commenterName,
        kind: 'comment',
        snippet: commentText,
      });

      alert('Comment report dismissed.');
      fetchCommentReports();
    } catch (e) {
      console.error('handleDismissCommentReport error:', e);
      alert('Error: ' + e.message);
    }
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

      await sendNotification({
        owner_name: appeal.user_name,
        actor_avatar: 'https://ui-avatars.com/api/?name=Admin&background=2D6A4F&color=fff',
        action: 'approved your appeal. Your post has been restored to the community feed.',
        post_title: post.title || 'Your post',
      });

      alert(`✅ Post restored! "${post.title || 'Post'}" is now live again.`);
      fetchAppeals();
    } catch (e) {
      console.error('handleRestorePost error:', e);
      alert('Error: ' + e.message);
    }
  };

  const handleUpholdFlag = async (appeal) => {
    const post = appeal.posts;

    if (!window.confirm('Uphold the AI flag and keep this post hidden?')) return;

    try {
      const { error: appealError } = await supabase
        .from('appeals')
        .update({ status: 'Rejected' })
        .eq('id', appeal.id);

      if (appealError) throw appealError;

      await sendNotification({
        owner_name: appeal.user_name,
        actor_avatar: 'https://ui-avatars.com/api/?name=Admin&background=A0442A&color=fff',
        action: 'reviewed your appeal and upheld the flag. Your post remains hidden as it violates our community standards.',
        post_title: post?.title || 'Your post',
      });

      alert('Flag upheld.');
      fetchAppeals();
    } catch (e) {
      console.error('handleUpholdFlag error:', e);
      alert('Error: ' + e.message);
    }
  };

  // -------------------------------------------------------------------------
  // STYLES
  // -------------------------------------------------------------------------

  const cardBase = `rounded-2xl border overflow-hidden transition-all ${
    isLightMode ? 'bg-white border-[#E3E8E1]' : 'bg-[#161D19] border-white/[0.05]'
  }`;

  const cardHeader = (color) =>
    `p-4 border-b flex items-start gap-3 ${
      color === 'red'
        ? isLightMode
          ? 'bg-red-50 border-red-100'
          : 'bg-red-500/5 border-red-500/10'
        : color === 'yellow'
          ? isLightMode
            ? 'bg-amber-50 border-amber-100'
            : 'bg-amber-500/5 border-amber-500/10'
          : color === 'orange'
            ? isLightMode
              ? 'bg-orange-50 border-orange-100'
              : 'bg-orange-500/5 border-orange-500/10'
            : isLightMode
              ? 'bg-[#F7F9F6] border-[#EDF0EB]'
              : 'bg-white/[0.02] border-white/[0.04]'
    }`;

  const reporterText = {
    red: isLightMode ? 'text-red-600' : 'text-red-400',
    yellow: isLightMode ? 'text-amber-700' : 'text-amber-400',
    orange: isLightMode ? 'text-orange-700' : 'text-orange-400',
  };

  const reasonText = {
    red: isLightMode ? 'text-red-700' : 'text-red-300',
    yellow: isLightMode ? 'text-amber-800' : 'text-amber-200',
    orange: isLightMode ? 'text-orange-800' : 'text-orange-200',
  };

  const historyStatusChip = (statusValue) => {
    const value = String(statusValue || '').toLowerCase();

    if (value === 'resolved' || value === 'approved') {
      return isLightMode
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }

    if (value === 'rejected' || value === 'declined') {
      return isLightMode
        ? 'bg-red-50 text-red-600 border-red-200'
        : 'bg-red-500/10 text-red-400 border-red-500/20';
    }

    return isLightMode
      ? 'bg-gray-100 text-gray-600 border-gray-200'
      : 'bg-white/5 text-white/50 border-white/10';
  };

  const tabs = [
    { key: 'all_posts', label: 'All Posts', count: 0 },
    { key: 'reports', label: 'Reported Posts', count: reports.length + aiFlagged.length },
    { key: 'reported_comments', label: 'Reported Comments', count: commentReports.length },
    { key: 'appeals', label: 'Appeals', count: appeals.length },
    { key: 'report_history', label: 'Report History Logs', count: reportHistory.length },
  ];

  const badgeCount = (n) =>
    n > 0 ? (
      <span
        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
          isLightMode ? 'bg-red-100 text-red-600' : 'bg-red-500/15 text-red-400'
        }`}
      >
        {n}
      </span>
    ) : null;


  const escapeCSV = (value) => {
    if (value === null || value === undefined) return '';

    const stringValue = String(value).replace(/"/g, '""');
    return `"${stringValue}"`;
  };

  const handleDownloadReportHistory = () => {
    if (!reportHistory || reportHistory.length === 0) {
      alert('No report history logs to download.');
      return;
    }

    const headers = [
      'Log ID',
      'Type',
      'Status',
      'Reporter',
      'Reported Item',
      'Reported User / Content Owner',
      'Reason',
      'Date Created',
    ];

    const rows = reportHistory.map((log) => [
      log.id,
      log.type,
      log.status,
      log.reporter,
      log.reportedItem,
      log.reportedBy,
      log.reason,
      log.created_at ? new Date(log.created_at).toLocaleString() : '',
    ]);

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map((row) => row.map(escapeCSV).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().split('T')[0];

    link.href = url;
    link.download = `greensort-report-history-logs-${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  const refreshCurrentTab = () => {
    if (activeTab === 'all_posts') fetchPosts();
    else if (activeTab === 'reports') {
      fetchReports();
      fetchAiFlagged();
    }
    else if (activeTab === 'reported_comments') fetchCommentReports();
    else if (activeTab === 'appeals') fetchAppeals();
    else if (activeTab === 'report_history') fetchReportHistory();
  };

  return (
    <div className={`flex h-screen w-full font-sans ${t.bg} transition-colors duration-300 overflow-hidden`}>
      <Sidebar />

      <div className="flex-1 h-full overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="p-6 lg:p-8 max-w-[1500px] mx-auto">
          <div className="mb-7">
            <h1 className={`text-3xl font-bold ${t.textMain} tracking-tight`}>
              Content Moderation
            </h1>
            <p className={`${t.textMuted} mt-1 font-medium text-sm`}>
              Monitor community posts and user reports
            </p>
          </div>

          <div
            className={`flex flex-wrap gap-1 p-1 rounded-2xl border w-fit mb-7 ${
              isLightMode ? 'bg-[#F0F4EE] border-[#E3E8E1]' : 'bg-[#111814] border-white/[0.05]'
            }`}
          >
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all duration-200 ${
                  activeTab === tab.key
                    ? isLightMode
                      ? 'bg-white text-[#2D6A4F] shadow-sm font-semibold'
                      : 'bg-[#1C2620] text-[#52B788] border border-[#52B788]/20 font-semibold'
                    : `${txtMuted} ${isLightMode ? 'hover:text-[#1A2A1A]' : 'hover:text-[#E8F0E5]'} font-medium`
                }`}
              >
                {tab.label}
                {badgeCount(tab.count)}
              </button>
            ))}
          </div>

          <div className="flex justify-between items-center mb-5">
            <h2 className={`text-base font-semibold ${txtMain}`}>
              {activeTab === 'all_posts'
                ? 'Community Feed'
                : activeTab === 'reports'
                  ? 'Pending Post Reports'
                  : activeTab === 'reported_comments'
                    ? 'Pending Comment Reports'
                    : activeTab === 'appeals'
                      ? 'Pending Post Appeals'
                      : 'Report History Logs'}
            </h2>

            <div className="flex items-center gap-2">
              {activeTab === 'report_history' && (
                <button
                  onClick={handleDownloadReportHistory}
                  disabled={reportHistory.length === 0}
                  className={`text-xs font-semibold flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all ${
                    reportHistory.length === 0
                      ? isLightMode
                        ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'border-white/[0.05] bg-white/[0.03] text-white/30 cursor-not-allowed'
                      : isLightMode
                        ? 'border-[#A8CFBA] bg-[#2D6A4F] text-white hover:bg-[#24583F]'
                        : 'border-[#52B788]/25 bg-[#52B788]/15 text-[#52B788] hover:bg-[#52B788]/25'
                  }`}
                >
                  Download Logs
                </button>
              )}

              <button
                onClick={refreshCurrentTab}
                className={`text-xs font-semibold flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all ${t.accentText} ${
                  isLightMode
                    ? 'border-[#A8CFBA] bg-[#D8EDDF] hover:bg-[#C4E0CF]'
                    : 'border-[#52B788]/25 bg-[#52B788]/8 hover:bg-[#52B788]/15'
                }`}
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Auto-moderation info banner */}
          {(activeTab === 'reports' || activeTab === 'reported_comments') && (
            <div
              className={`mb-5 p-3 rounded-xl border text-xs ${
                isLightMode
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-amber-500/5 border-amber-500/20 text-amber-300'
              }`}
            >
              <span className="font-bold">Auto-moderation active:</span>{' '}
              Every reviewed report sends a warning to the content owner.
              Users are auto-banned after <b>{POST_REPORT_BAN_THRESHOLD}</b> approved post reports
              or <b>{COMMENT_REPORT_BAN_THRESHOLD}</b> approved comment reports. All their pending
              reports auto-resolve.
            </div>
          )}

          {loading ? (
            <div
              className={`flex items-center justify-center h-48 rounded-2xl border ${
                isLightMode ? 'bg-white border-[#E3E8E1]' : 'bg-[#161D19] border-white/[0.05]'
              }`}
            >
              <p className={`text-sm font-medium animate-pulse ${t.accentText}`}>
                Loading data…
              </p>
            </div>
          ) : (
            <>
              {activeTab === 'all_posts' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {posts.length === 0 ? (
                    <div className={`col-span-full p-10 text-center rounded-2xl border ${
                      isLightMode ? 'bg-white border-[#E3E8E1] text-[#7A8C77]' : 'bg-[#161D19] border-white/[0.05] text-[#627A5C]'
                    } text-sm italic`}>
                      No posts found.
                    </div>
                  ) : (
                    posts.map((post) => (
                      <div key={post.id} className={`${cardBase} flex flex-col hover:shadow-md transition-shadow`}>
                        <div className={`p-4 flex items-center justify-between ${
                          isLightMode ? 'border-b border-[#EDF0EB]' : 'border-b border-white/[0.04]'
                        }`}>
                          <div className="flex items-center gap-3">
                            {post.display_avatar ? (
                              <img src={post.display_avatar} alt="avatar" className="w-9 h-9 rounded-full object-cover border border-[#E3E8E1]" />
                            ) : (
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${t.iconBg1}`}>
                                {post.display_initials}
                              </div>
                            )}

                            <div>
                              <p className={`text-sm font-semibold ${txtMain} max-w-[160px] truncate`}>
                                {post.display_name}
                              </p>
                              <p className={`text-[11px] ${txtMuted}`}>
                                {timeAgo(post.created_at)}
                              </p>
                            </div>
                          </div>

                          {post.type && (
                            <span className={`text-[9px] font-bold px-2 py-1 rounded-lg uppercase ${
                              isLightMode ? 'bg-[#DDE9F5] text-[#2A5FA8]' : 'bg-[#4A9ECC]/10 text-[#4A9ECC]'
                            }`}>
                              {post.type}
                            </span>
                          )}
                        </div>

                        <div className="p-4 flex-1">
                          {post.title && (
                            <h3 className={`font-semibold ${txtMain} text-sm mb-1.5 leading-snug`}>
                              {post.title}
                            </h3>
                          )}
                          <p className={`text-sm ${txtMuted} leading-relaxed line-clamp-3`}>
                            {post.display_text}
                          </p>
                        </div>

                        {post.display_image && (
                          <div className={`w-full h-52 flex items-center justify-center overflow-hidden border-t border-b ${
                            isLightMode ? 'bg-[#F7F9F6] border-[#EDF0EB]' : 'bg-[#0F1512] border-white/[0.04]'
                          }`}>
                            <img
                              src={post.display_image}
                              alt="Post"
                              className="max-w-full max-h-full object-contain cursor-zoom-in hover:opacity-90 transition-opacity"
                              onClick={() => setViewImage(post.display_image)}
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>
                        )}

                        <div className={`p-3 flex items-center justify-between ${isLightMode ? 'bg-[#F7F9F6]' : 'bg-white/[0.015]'}`}>
                          <div className={`flex gap-3 text-[11px] ${txtMuted}`}>
                            {post.location && <span>{post.location}</span>}
                            {post.price && post.price !== '0' && (
                              <span className={`font-semibold ${t.accentText}`}>{post.price}</span>
                            )}
                          </div>

                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className={`p-1.5 rounded-lg transition-all ${txtMuted} hover:text-red-500 hover:bg-red-500/10`}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'reports' && (
                <>
                  {/* Sub-tabs: User Reports vs AI Flagged */}
                  <div
                    className={`flex flex-wrap gap-1 p-1 rounded-xl border w-fit mb-5 ${
                      isLightMode ? 'bg-[#F0F4EE] border-[#E3E8E1]' : 'bg-[#111814] border-white/[0.05]'
                    }`}
                  >
                    <button
                      onClick={() => setReportsSubTab('user')}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs transition-all duration-200 ${
                        reportsSubTab === 'user'
                          ? isLightMode
                            ? 'bg-white text-red-600 shadow-sm font-semibold'
                            : 'bg-[#1C2620] text-red-400 border border-red-500/20 font-semibold'
                          : `${txtMuted} ${isLightMode ? 'hover:text-[#1A2A1A]' : 'hover:text-[#E8F0E5]'} font-medium`
                      }`}
                    >
                      User Reports
                      {reports.length > 0 && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            isLightMode ? 'bg-red-100 text-red-600' : 'bg-red-500/15 text-red-400'
                          }`}
                        >
                          {reports.length}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => setReportsSubTab('ai')}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs transition-all duration-200 ${
                        reportsSubTab === 'ai'
                          ? isLightMode
                            ? 'bg-white text-violet-700 shadow-sm font-semibold'
                            : 'bg-[#1C2620] text-violet-400 border border-violet-500/20 font-semibold'
                          : `${txtMuted} ${isLightMode ? 'hover:text-[#1A2A1A]' : 'hover:text-[#E8F0E5]'} font-medium`
                      }`}
                    >
                      🤖 AI Flagged
                      {aiFlagged.length > 0 && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            isLightMode ? 'bg-violet-100 text-violet-700' : 'bg-violet-500/15 text-violet-400'
                          }`}
                        >
                          {aiFlagged.length}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* USER REPORTS sub-content */}
                  {reportsSubTab === 'user' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {reports.length === 0 ? (
                    <div className={`col-span-full p-10 text-center rounded-2xl border ${
                      isLightMode ? 'bg-white border-[#E3E8E1] text-[#7A8C77]' : 'bg-[#161D19] border-white/[0.05] text-[#627A5C]'
                    } text-sm italic`}>
                      No pending user reports. All clear!
                    </div>
                  ) : (
                    reports.map((report) => {
                      const post = report.posts;
                      if (!post) return null;

                      const isLong = report.reason && report.reason.length > 80;

                      return (
                        <div key={report.id} className={`${cardBase} flex flex-col border-red-200/60 ${isLightMode ? '' : '!border-red-500/20'}`}>
                          <div className={cardHeader('red')}>
                            <div className="min-w-0">
                              <p className={`text-[10px] font-bold uppercase tracking-wider ${reporterText.red} mb-1`}>
                                Reported by: {report.reporter_email}
                              </p>
                              <p className={`text-xs leading-relaxed ${reasonText.red}`}>
                                {isLong ? (
                                  <>
                                    {report.reason.substring(0, 80)}…{' '}
                                    <button onClick={() => setSelectedReportDetails(report)} className="underline font-semibold ml-1">
                                      See more
                                    </button>
                                  </>
                                ) : (
                                  report.reason
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="p-4 flex items-center gap-3">
                            {post.avatar ? (
                              <img src={post.avatar} alt="a" className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${t.iconBg1}`}>
                                {(post.user || '?').substring(0, 2).toUpperCase()}
                              </div>
                            )}

                            <div>
                              <p className={`text-sm font-semibold ${txtMain}`}>{post.user}</p>
                              <p className={`text-[11px] ${txtMuted}`}>
                                Posted {timeAgo(post.created_at)}
                              </p>
                            </div>
                          </div>

                          <div className="px-4 pb-3 flex-1">
                            {post.title && <p className={`font-semibold ${txtMain} text-sm mb-1`}>{post.title}</p>}
                            <p className={`text-xs ${txtMuted} line-clamp-2`}>{post.desc || 'No content.'}</p>
                          </div>

                          {post.image && (
                            <div className={`w-full h-44 flex items-center justify-center overflow-hidden border-t border-b ${
                              isLightMode ? 'bg-[#F7F9F6] border-[#EDF0EB]' : 'bg-[#0F1512] border-white/[0.04]'
                            }`}>
                              <img
                                src={post.image}
                                alt="Report"
                                className="max-w-full max-h-full object-contain cursor-zoom-in hover:opacity-80 transition-opacity"
                                onClick={() => setViewImage(post.image)}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            </div>
                          )}

                          <div className={`p-3 flex flex-col gap-2 ${isLightMode ? 'bg-[#FDF8F8]' : 'bg-red-500/[0.03]'}`}>
                            <button
                              onClick={() =>
                                handleApproveReport(
                                  report.id,
                                  report.post_id,
                                  report.reporter_email,
                                  post.title,
                                  report.reason,
                                  post.user,
                                  post.desc
                                )
                              }
                              className="w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all bg-red-500 hover:bg-red-400"
                            >
                              Approve Report & Delete Post
                            </button>

                            <button
                              onClick={() =>
                                handleDeclineReport(
                                  report.id,
                                  report.reporter_email,
                                  post.title,
                                  report.reason,
                                  post.user,
                                  post.desc
                                )
                              }
                              className={`w-full py-2.5 rounded-xl text-xs font-medium transition-all ${txtMuted} ${
                                isLightMode ? 'bg-[#F4F6F2] hover:bg-[#EDF0EB]' : 'bg-white/[0.04] hover:bg-white/[0.07]'
                              }`}
                            >
                              Decline Report & Keep Post
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                  )}

                  {/* AI FLAGGED sub-content */}
                  {reportsSubTab === 'ai' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {aiFlagged.length === 0 ? (
                        <div className={`col-span-full p-10 text-center rounded-2xl border ${
                          isLightMode ? 'bg-white border-[#E3E8E1] text-[#7A8C77]' : 'bg-[#161D19] border-white/[0.05] text-[#627A5C]'
                        } text-sm italic`}>
                          No AI-flagged posts pending review.
                        </div>
                      ) : (
                        aiFlagged.map((post) => {
                          const aiReason = post.ai_reason || 'No AI reason recorded.';
                          const isLong = aiReason.length > 80;

                          return (
                            <div
                              key={`ai-${post.id}`}
                              className={`${cardBase} flex flex-col border-violet-200/60 ${isLightMode ? '' : '!border-violet-500/20'}`}
                            >
                              <div
                                className={`p-4 border-b flex items-start gap-3 ${
                                  isLightMode
                                    ? 'bg-violet-50 border-violet-100'
                                    : 'bg-violet-500/5 border-violet-500/10'
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${
                                    isLightMode ? 'text-violet-700' : 'text-violet-400'
                                  }`}>
                                    🤖 AI Flag Reason
                                  </p>
                                  <p className={`text-xs leading-relaxed ${
                                    isLightMode ? 'text-violet-700' : 'text-violet-200'
                                  }`}>
                                    {isLong ? (
                                      <>
                                        {aiReason.substring(0, 80)}…{' '}
                                        <button
                                          onClick={() =>
                                            setSelectedReportDetails({
                                              reporter_email: 'GreenSort AI',
                                              reason: aiReason,
                                            })
                                          }
                                          className="underline font-semibold ml-1"
                                        >
                                          See more
                                        </button>
                                      </>
                                    ) : (
                                      aiReason
                                    )}
                                  </p>
                                </div>
                              </div>

                              <div className="p-4 flex items-center gap-3">
                                {post.avatar ? (
                                  <img src={post.avatar} alt="a" className="w-8 h-8 rounded-full object-cover" />
                                ) : (
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${t.iconBg1}`}>
                                    {(post.user || '?').substring(0, 2).toUpperCase()}
                                  </div>
                                )}

                                <div>
                                  <p className={`text-sm font-semibold ${txtMain}`}>{post.user}</p>
                                  <p className={`text-[11px] ${txtMuted}`}>
                                    Posted {timeAgo(post.created_at)}
                                  </p>
                                </div>
                              </div>

                              <div className="px-4 pb-3 flex-1">
                                {post.title && <p className={`font-semibold ${txtMain} text-sm mb-1`}>{post.title}</p>}
                                <p className={`text-xs ${txtMuted} line-clamp-2`}>{post.desc || 'No content.'}</p>
                              </div>

                              {post.image && (
                                <div
                                  className={`w-full h-44 flex items-center justify-center overflow-hidden border-t border-b ${
                                    isLightMode ? 'bg-[#F7F9F6] border-[#EDF0EB]' : 'bg-[#0F1512] border-white/[0.04]'
                                  }`}
                                >
                                  <img
                                    src={post.image.split(',')[0]}
                                    alt="Flagged"
                                    className="max-w-full max-h-full object-contain cursor-zoom-in hover:opacity-80 transition-opacity"
                                    onClick={() => setViewImage(post.image.split(',')[0])}
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                </div>
                              )}

                              <div className={`p-3 flex flex-col gap-2 ${isLightMode ? 'bg-[#FAF8FF]' : 'bg-violet-500/[0.03]'}`}>
                                <button
                                  onClick={() => handleDeleteAiFlaggedPost(post)}
                                  className="w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all bg-red-500 hover:bg-red-400"
                                >
                                  Delete Post
                                </button>

                                <button
                                  onClick={() => handleKeepAiFlaggedHidden(post)}
                                  className={`w-full py-2.5 rounded-xl text-xs font-medium transition-all ${txtMuted} ${
                                    isLightMode ? 'bg-[#F4F6F2] hover:bg-[#EDF0EB]' : 'bg-white/[0.04] hover:bg-white/[0.07]'
                                  }`}
                                >
                                  Keep Hidden
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

              {activeTab === 'reported_comments' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {commentReports.length === 0 ? (
                    <div className={`col-span-full p-10 text-center rounded-2xl border ${
                      isLightMode ? 'bg-white border-[#E3E8E1] text-[#7A8C77]' : 'bg-[#161D19] border-white/[0.05] text-[#627A5C]'
                    } text-sm italic`}>
                      No pending comment reports.
                    </div>
                  ) : (
                    commentReports.map((report) => {
                      const comment = report.comments;
                      if (!comment) return null;

                      const isLong = report.reason && report.reason.length > 80;

                      return (
                        <div key={report.id} className={`${cardBase} flex flex-col border-amber-200/60 ${isLightMode ? '' : '!border-amber-500/20'}`}>
                          <div className={cardHeader('yellow')}>
                            <div className="min-w-0">
                              <p className={`text-[10px] font-bold uppercase tracking-wider ${reporterText.yellow} mb-1`}>
                                Reported by: {report.reporter_email}
                              </p>
                              <p className={`text-xs leading-relaxed ${reasonText.yellow}`}>
                                {isLong ? (
                                  <>
                                    {report.reason.substring(0, 80)}…{' '}
                                    <button onClick={() => setSelectedReportDetails(report)} className="underline font-semibold ml-1">
                                      See more
                                    </button>
                                  </>
                                ) : (
                                  report.reason
                                )}
                              </p>
                            </div>
                          </div>

                          <div className={`m-4 p-4 rounded-xl border ${
                            isLightMode ? 'bg-[#FAFBF9] border-[#EDF0EB]' : 'bg-white/[0.02] border-white/[0.04]'
                          }`}>
                            <div className="flex items-center gap-2.5 mb-3">
                              {comment.avatar ? (
                                <img src={comment.avatar} alt="a" className="w-7 h-7 rounded-full object-cover" />
                              ) : (
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${t.iconBg1}`}>
                                  {(comment.user_name || '?').substring(0, 2).toUpperCase()}
                                </div>
                              )}

                              <div>
                                <p className={`text-xs font-semibold ${txtMain}`}>{comment.user_name}</p>
                                <p className={`text-[10px] ${txtMuted}`}>{timeAgo(comment.created_at)}</p>
                              </div>
                            </div>

                            <p className={`text-xs ${txtMuted} leading-relaxed border-l-2 pl-3 italic ${
                              isLightMode ? 'border-amber-300' : 'border-amber-500/40'
                            }`}>
                              "{comment.text}"
                            </p>
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
                              className={`w-full py-2.5 rounded-xl text-xs font-medium transition-all ${txtMuted} ${
                                isLightMode ? 'bg-[#F4F6F2] hover:bg-[#EDF0EB]' : 'bg-white/[0.04] hover:bg-white/[0.07]'
                              }`}
                            >
                              Dismiss Report
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {activeTab === 'appeals' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {appeals.length === 0 ? (
                    <div className={`col-span-full p-10 text-center rounded-2xl border ${
                      isLightMode ? 'bg-white border-[#E3E8E1] text-[#7A8C77]' : 'bg-[#161D19] border-white/[0.05] text-[#627A5C]'
                    } text-sm italic`}>
                      No pending appeals. All clear!
                    </div>
                  ) : (
                    appeals.map((appeal) => {
                      const post = appeal.posts;
                      const postTitle = post?.title || '(Post was deleted)';
                      const postImage = post?.image ? post.image.split(',')[0] : null;
                      const aiReason = post?.ai_reason || 'No AI reason recorded.';
                      const isPostGone = !post;

                      return (
                        <div key={appeal.id} className={`${cardBase} flex flex-col border-orange-200/60 ${isLightMode ? '' : '!border-orange-500/20'}`}>
                          <div className={cardHeader('orange')}>
                            <div className="min-w-0">
                              <p className={`text-[10px] font-bold uppercase tracking-wider ${reporterText.orange} mb-1`}>
                                Appeal by: <span className="normal-case">{appeal.user_name}</span>
                              </p>
                              <p className={`text-[11px] ${txtMuted}`}>{timeAgo(appeal.created_at)}</p>
                            </div>
                          </div>

                          <div className="p-4 flex-1 space-y-3">
                            <div>
                              <p className={`text-[10px] font-bold uppercase tracking-wider ${txtMuted} mb-1`}>
                                Post Title
                              </p>
                              <p className={`text-sm font-semibold ${isPostGone ? 'text-red-400 italic' : txtMain} leading-snug`}>
                                {postTitle}
                              </p>
                            </div>

                            {postImage && !isPostGone && (
                              <div
                                className={`w-full h-36 rounded-xl overflow-hidden border cursor-zoom-in ${
                                  isLightMode ? 'border-[#EDF0EB]' : 'border-white/[0.05]'
                                }`}
                                onClick={() => setViewImage(postImage)}
                              >
                                <img
                                  src={postImage}
                                  alt="Post"
                                  className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
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
                                User&apos;s Explanation
                              </p>
                              <p className={`text-xs leading-relaxed ${reasonText.orange} italic`}>
                                "{appeal.reason || 'No explanation provided.'}"
                              </p>
                            </div>
                          </div>

                          <div className={`p-3 flex flex-col gap-2 ${isLightMode ? 'bg-[#FFFAF5]' : 'bg-orange-500/[0.03]'}`}>
                            {isPostGone ? (
                              <div className={`w-full py-3 rounded-xl text-xs font-medium text-center ${
                                isLightMode ? 'bg-[#F4F6F2] text-[#7A8C77]' : 'bg-white/[0.04] text-[#627A5C]'
                              }`}>
                                Original post no longer exists
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleRestorePost(appeal)}
                                  className="w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all bg-emerald-600 hover:bg-emerald-500"
                                >
                                  Restore Post
                                </button>

                                <button
                                  onClick={() => handleUpholdFlag(appeal)}
                                  className={`w-full py-2.5 rounded-xl text-xs font-medium transition-all ${txtMuted} ${
                                    isLightMode ? 'bg-[#F4F6F2] hover:bg-[#EDF0EB]' : 'bg-white/[0.04] hover:bg-white/[0.07]'
                                  }`}
                                >
                                  Uphold Flag Keep Hidden
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

              {activeTab === 'report_history' && (
                <div className="space-y-4">
                  {reportHistory.length === 0 ? (
                    <div
                      className={`p-10 text-center rounded-2xl border ${
                        isLightMode
                          ? 'bg-white border-[#E3E8E1] text-[#7A8C77]'
                          : 'bg-[#161D19] border-white/[0.05] text-[#627A5C]'
                      } text-sm italic`}
                    >
                      No report history logs yet.
                    </div>
                  ) : (
                    reportHistory.map((log) => (
                      <div
                        key={log.id}
                        className={`${cardBase} p-5 flex flex-col lg:flex-row lg:items-center gap-4`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                                log.type === 'Post Report'
                                  ? isLightMode
                                    ? 'bg-red-50 text-red-600 border-red-200'
                                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                                  : log.type === 'Comment Report'
                                    ? isLightMode
                                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                    : log.type === 'User Report'
                                      ? isLightMode
                                        ? 'bg-violet-50 text-violet-700 border-violet-200'
                                        : 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                                      : log.type === 'AI Flag'
                                        ? isLightMode
                                          ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                                          : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                                        : isLightMode
                                          ? 'bg-orange-50 text-orange-700 border-orange-200'
                                          : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                              }`}
                            >
                              {log.type === 'AI Flag' ? '🤖 AI Flag' : log.type}
                            </span>

                            <span
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${historyStatusChip(log.status)}`}
                            >
                              {log.status}
                            </span>
                          </div>

                          <h3 className={`text-sm font-bold ${txtMain} break-words`}>
                            {log.reportedItem}
                          </h3>

                          <p className={`text-xs ${txtMuted} mt-1`}>
                            Reporter: <span className={txtSub}>{log.reporter}</span>
                          </p>

                          <p className={`text-xs ${txtMuted} mt-1`}>
                            Reported user/content owner: <span className={txtSub}>{log.reportedBy}</span>
                          </p>

                          <p className={`text-xs ${txtMuted} mt-3 leading-relaxed break-words`}>
                            Reason: {log.reason}
                          </p>
                        </div>

                        <div className="lg:text-right shrink-0">
                          <p className={`text-[11px] font-semibold ${txtMuted}`}>
                            {timeAgo(log.created_at)}
                          </p>
                          <p className={`text-[10px] ${txtMuted} mt-1`}>
                            {new Date(log.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}

          <div className="h-12" />
        </div>
      </div>

      {selectedReportDetails && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedReportDetails(null)}
        >
          <div
            className={`w-full max-w-lg rounded-2xl border shadow-2xl ${
              isLightMode ? 'bg-white border-[#E3E8E1]' : 'bg-[#161D19] border-white/[0.07]'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`p-5 border-b ${
                isLightMode ? 'border-[#EDF0EB]' : 'border-white/[0.05]'
              } flex items-center justify-between`}
            >
              <h3 className={`font-semibold ${txtMain}`}>Full Report Details</h3>

              <button
                onClick={() => setSelectedReportDetails(null)}
                className={`p-1.5 rounded-lg ${txtMuted} ${
                  isLightMode ? 'hover:text-[#1A2A1A]' : 'hover:text-[#E8F0E5]'
                }`}
              >
                ✕
              </button>
            </div>

            <div className="p-5">
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${txtMuted} mb-3`}>
                Reported by: {selectedReportDetails.reporter_email}
              </p>

              <div className={`max-h-[50vh] overflow-y-auto p-4 rounded-xl ${isLightMode ? 'bg-[#F7F9F6]' : 'bg-white/[0.03]'}`}>
                <p className={`text-sm ${txtSub} leading-relaxed whitespace-pre-wrap break-words`}>
                  {selectedReportDetails.reason}
                </p>
              </div>

              <button
                onClick={() => setSelectedReportDetails(null)}
                className={`w-full mt-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isLightMode
                    ? 'bg-[#F0F4EE] text-[#3D4E3A] hover:bg-[#E3E8E1]'
                    : 'bg-white/[0.06] text-[#B0C5AA] hover:bg-white/[0.1]'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {viewImage && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-zoom-out"
          onClick={() => setViewImage(null)}
        >
          <button
            className="absolute top-5 right-5 text-white/50 hover:text-white bg-black/50 p-2 rounded-full transition-colors"
            onClick={() => setViewImage(null)}
          >
            ✕
          </button>

          <img
            src={viewImage}
            alt="Enlarged"
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
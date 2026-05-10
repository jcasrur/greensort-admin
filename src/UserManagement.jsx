import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase';
import Sidebar from './Sidebar';
import { useTheme, ThemedCard } from './ThemeContext';
import { useAdminAuth } from './useAdminAuth';
import GuidePanel from './GuidePanel';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const INACTIVE_DAYS = 30;   // full inactive threshold
const AT_RISK_DAYS  = 20;   // warning threshold (20–29 days)

const ADMIN_AVATAR = 'https://ui-avatars.com/api/?name=GreenSort+Admin&background=2D6A4F&color=fff&bold=true';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const daysSince = (dateStr) => {
  if (!dateStr) return 9999;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
};

// Returns: 'online' | 'offline' | 'at_risk' | 'inactive' | 'banned'
const getActivityStatus = (user, onlineIds) => {
  if ((user.status || '').toLowerCase() === 'banned') return 'banned';
  if (onlineIds.has(user.id))                          return 'online';
  const days = daysSince(user.last_login);
  if (days >= INACTIVE_DAYS) return 'inactive';
  if (days >= AT_RISK_DAYS)  return 'at_risk';
  return 'offline';
};

// ─────────────────────────────────────────────────────────────────────────────
// Status badge
// ─────────────────────────────────────────────────────────────────────────────
const ActivityBadge = ({ status, days, isLightMode }) => {
  const cfg = {
    online:   { dot: isLightMode ? 'bg-[#6C9A7D]' : 'bg-[#3CD085] shadow-[0_0_8px_#3CD085]', text: isLightMode ? 'text-[#6C9A7D]' : 'text-[#3CD085]', label: 'Online'           },
    offline:  { dot: isLightMode ? 'bg-[#DCE4DF]' : 'bg-[#35403C]',                           text: 'text-[#6B7C7A]',                                   label: 'Offline'          },
    at_risk:  { dot: 'bg-amber-400',                                                            text: 'text-amber-500',                                   label: `${days}d inactive`},
    inactive: { dot: 'bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,.6)]',                     text: 'text-orange-500',                                  label: `${days}d inactive`},
    banned:   { dot: 'bg-red-500',                                                              text: 'text-red-500',                                     label: 'Deactivated'      },
  }[status] || { dot: 'bg-gray-400', text: 'text-gray-400', label: 'Unknown' };

  return (
    <span className={`flex items-center gap-2 text-xs font-bold ${cfg.text}`}>
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Notify modal
// ─────────────────────────────────────────────────────────────────────────────
function NotifyModal({ user, onConfirm, onClose, isLightMode, t }) {
  const [msgType, setMsgType] = useState('warning');
  const [custom,  setCustom]  = useState('');
  const [sending, setSending] = useState(false);

  const days = daysSince(user.last_login);

  const MESSAGES = {
    warning: {
      label:  'Inactivity Warning',
      desc:   'Gentle reminder — account may be deactivated if inactive much longer.',
      action: 'sent you an inactivity warning. Your account may be deactivated if you remain inactive for much longer. Log in to keep your account active.',
      title:  'Account Inactivity Warning',
    },
    final: {
      label:  'Final Notice (48h)',
      desc:   'Urgent — account will be deactivated within 48 hours.',
      action: 'sent you a final notice. Your GreenSort account will be deactivated within 48 hours due to inactivity. Log in now to prevent this.',
      title:  'Final Notice — Account Deactivation',
    },
    custom: {
      label:  'Custom Message',
      desc:   'Write your own message to this user.',
      action: custom.trim() || '…',
      title:  'Message from GreenSort Admin',
    },
  };

  const handleSend = async () => {
    if (msgType === 'custom' && !custom.trim()) { alert('Please enter a custom message.'); return; }
    setSending(true);
    await onConfirm(user, MESSAGES[msgType]);
    setSending(false);
  };

  const inputCls = `w-full px-3 py-2.5 rounded-xl border text-sm resize-none outline-none transition-all ${
    isLightMode
      ? 'bg-[#F4F6F2] border-[#DDE3DA] text-[#1A2418] focus:border-[#2D6A4F]/60 placeholder:text-[#A8BCAA]'
      : 'bg-[#0F1512] border-white/[0.07] text-[#E8F0E5] focus:border-[#52B788]/50 placeholder:text-[#3D5042]'
  }`;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`w-full max-w-[420px] rounded-2xl border shadow-2xl ${isLightMode ? 'bg-white border-[#E3E8E1]' : 'bg-[#141A16] border-white/[0.07]'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-5 border-b ${isLightMode ? 'border-[#EDF0EB]' : 'border-white/[0.05]'} flex items-center gap-3`}>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isLightMode ? 'bg-amber-50' : 'bg-amber-500/10'}`}>
            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div>
            <h3 className={`text-sm font-bold ${t.textMain}`}>Send Inactivity Notice</h3>
            <p className={`text-[11px] ${t.textMuted} mt-0.5`}>
              {user.full_name} · last seen {days === 9999 ? 'never' : `${days} day${days !== 1 ? 's' : ''} ago`}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">

          {/* Message type options */}
          <div className="space-y-2">
            {Object.entries(MESSAGES).map(([key, msg]) => (
              <label
                key={key}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  msgType === key
                    ? (isLightMode ? 'border-[#A8CFBA] bg-[#EEF4EC]' : 'border-[#52B788]/30 bg-[#52B788]/8')
                    : (isLightMode ? 'border-[#E3E8E1] hover:bg-[#F7F9F6]' : 'border-white/[0.05] hover:bg-white/[0.02]')
                }`}
              >
                <input
                  type="radio"
                  name="msgType"
                  value={key}
                  checked={msgType === key}
                  onChange={() => setMsgType(key)}
                  className="mt-0.5 accent-emerald-600 flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className={`text-xs font-bold ${msgType === key ? t.accentText : t.textMain}`}>{msg.label}</p>
                  <p className={`text-[11px] ${t.textMuted} mt-0.5 leading-relaxed`}>{msg.desc}</p>
                </div>
              </label>
            ))}
          </div>

          {/* Custom textarea */}
          {msgType === 'custom' && (
            <textarea
              rows={3}
              className={inputCls}
              placeholder="Type your custom message to the user..."
              value={custom}
              onChange={e => setCustom(e.target.value)}
            />
          )}

          {/* Preview */}
          <div className={`p-3 rounded-xl border text-xs leading-relaxed ${isLightMode ? 'bg-[#F7F9F6] border-[#E3E8E1]' : 'bg-white/[0.02] border-white/[0.05]'}`}>
            <p className={`font-bold ${t.textMuted} mb-1 uppercase tracking-widest text-[10px]`}>In-app notification preview</p>
            <p className={t.textSub}>
              <span className="font-semibold">GreenSort Admin</span>{' '}
              {msgType === 'custom' ? (custom.trim() || '(type message above)') : MESSAGES[msgType].action}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {sending ? 'Sending…' : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Send Notification
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                isLightMode ? 'border-[#DDE3DA] text-[#7A8C77] hover:bg-[#F3F6F1]' : 'border-white/[0.07] text-[#627A5C] hover:bg-white/[0.03]'
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function UserManagement() {
  const navigate = useNavigate();
  const { isLightMode, t } = useTheme();
  const { adminUser }      = useAdminAuth();

  const [users,         setUsers]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());

  const [search,     setSearch]     = useState('');
  const [filterType, setFilterType] = useState('all');

  const [notifyTarget, setNotifyTarget] = useState(null);
  // Track which users got a notification this session so the button flips to "Notified"
  const [notifySent, setNotifySent] = useState({});

  // ── Presence ───────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchUsers();
    const channel = supabase.channel('app-presence');
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const activeIds = new Set();
      Object.keys(state).forEach(key => {
        const p = state[key][0];
        if (p && p.user_id) activeIds.add(p.user_id);
      });
      setOnlineUserIds(activeIds);
    });
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('last_login', { ascending: false, nullsFirst: false });
      if (error) throw error;
      setUsers(data || []);
    } catch (e) { console.error('fetchUsers error:', e.message); }
    finally    { setLoading(false); }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Permanently DELETE "${userName || 'this user'}"? This cannot be undone.`)) return;
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) throw error;
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (e) { console.error('Error deleting user:', e.message); }
  };

  // ── Deactivate ─────────────────────────────────────────────────────────────
  const handleDeactivate = async (user) => {
    if (!window.confirm(`Deactivate "${user.full_name}"? They will be blocked from the app.`)) return;
    try {
      await supabase.from('profiles').update({ status: 'Banned' }).eq('id', user.id);
      await supabase.from('notifications').insert([{
        owner_name: user.full_name, actor_name: 'GreenSort Admin', actor_avatar: ADMIN_AVATAR,
        action: 'has deactivated your account due to prolonged inactivity. Please contact support if you believe this is a mistake.',
        post_title: 'Account Deactivated', is_read: false,
      }]);
      fetchUsers();
      alert(`✅ "${user.full_name}" has been deactivated.`);
    } catch (e) { alert('Error: ' + e.message); }
  };

  // ── Reactivate ─────────────────────────────────────────────────────────────
  const handleReactivate = async (user) => {
    if (!window.confirm(`Reactivate "${user.full_name}"?`)) return;
    try {
      await supabase.from('profiles').update({ status: 'Active' }).eq('id', user.id);
      await supabase.from('notifications').insert([{
        owner_name: user.full_name, actor_name: 'GreenSort Admin', actor_avatar: ADMIN_AVATAR,
        action: 'has reactivated your account. Welcome back to GreenSort!',
        post_title: 'Account Reactivated', is_read: false,
      }]);
      fetchUsers();
      alert(`✅ "${user.full_name}" has been reactivated.`);
    } catch (e) { alert('Error: ' + e.message); }
  };

  // ── Send notification ──────────────────────────────────────────────────────
  const handleSendNotify = async (user, msg) => {
    try {
      await supabase.from('notifications').insert([{
        owner_name: user.full_name, actor_name: 'GreenSort Admin', actor_avatar: ADMIN_AVATAR,
        action: msg.action, post_title: msg.title, is_read: false,
      }]);
      setNotifySent(prev => ({ ...prev, [user.id]: new Date().toISOString() }));
      setNotifyTarget(null);
      alert(`✅ Notification sent to "${user.full_name}".`);
    } catch (e) { alert('Error: ' + e.message); }
  };

  // ── Computed ───────────────────────────────────────────────────────────────
  const recentCount   = users.filter(u => daysSince(u.created_at) <= 7).length;
  const inactiveCount = users.filter(u => getActivityStatus(u, onlineUserIds) === 'inactive').length;
  const atRiskCount   = users.filter(u => getActivityStatus(u, onlineUserIds) === 'at_risk').length;
  const onlineCount   = users.filter(u => onlineUserIds.has(u.id)).length;
  const bannedCount   = users.filter(u => (u.status || '').toLowerCase() === 'banned').length;

  const filtered = users.filter(u => {
    const s = getActivityStatus(u, onlineUserIds);
    if (filterType === 'online'   && s !== 'online')   return false;
    if (filterType === 'at_risk'  && s !== 'at_risk' && s !== 'inactive') return false;
    if (filterType === 'inactive' && s !== 'inactive') return false;
    if (filterType === 'banned'   && s !== 'banned')   return false;
    const q = search.toLowerCase();
    if (q && !u.full_name?.toLowerCase().includes(q) && !u.email?.toLowerCase().includes(q)) return false;
    return true;
  });

  const fmt = (ds) => ds
    ? new Date(ds).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'Never';

  const fmtLastSeen = (ds) => {
    if (!ds) return 'Never logged in';
    const d = daysSince(ds);
    if (d === 0) return 'Today';
    if (d === 1) return 'Yesterday';
    if (d <  30) return `${d} days ago`;
    if (d < 365) return `${Math.floor(d / 30)} mo ago`;
    return `${Math.floor(d / 365)}y ago`;
  };

  const filterTabs = [
    { key: 'all',      label: 'All',          count: users.length,          alert: false },
    { key: 'online',   label: 'Online',        count: onlineCount,           alert: false },
    { key: 'at_risk',  label: 'At Risk',       count: atRiskCount,           alert: atRiskCount > 0 },
    { key: 'inactive', label: 'Inactive 30d+', count: inactiveCount,         alert: inactiveCount > 0 },
    { key: 'banned',   label: 'Deactivated',   count: bannedCount,           alert: false },
  ];

  return (
    <div className={`flex h-screen w-full font-sans ${t.bg} transition-colors duration-300 overflow-hidden selection:bg-[#3CD085] selection:text-black`}>
      <Sidebar />

      <div className="flex-1 h-full overflow-y-auto relative z-10 no-scrollbar">
        <div className="p-6 lg:p-10 max-w-[1600px] mx-auto">

          {/* ── Header ── */}
          <div className="mb-8">
            <h2 className={`text-3xl font-bold ${t.textMain} tracking-tight`}>User Management</h2>
            <p className={`${t.textMuted} mt-1 font-medium text-sm`}>Live User Database and Account Registry</p>
          </div>

          {/* ── Stat cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

            <ThemedCard className="flex flex-col justify-between h-[130px]">
              <p className={`text-[12px] font-semibold ${t.textMain} tracking-wide`}>Total Users</p>
              <p className={`text-[36px] font-bold ${t.textMain} leading-none mt-auto`}>{users.length}</p>
            </ThemedCard>

            <ThemedCard className={`flex flex-col justify-between h-[130px] border ${isLightMode ? 'bg-[#E4EFE8]/30 border-[#98BAA3]/20' : 'bg-gradient-to-br from-[#151B1F] to-[#122119] border-[#3CD085]/20'}`}>
              <p className={`text-[12px] font-semibold ${isLightMode ? 'text-[#4A7D5C]' : 'text-[#3CD085]'} tracking-wide`}>New This Week</p>
              <p className={`text-[36px] font-bold ${isLightMode ? 'text-[#4A7D5C]' : 'text-[#3CD085]'} leading-none mt-auto`}>+{recentCount}</p>
            </ThemedCard>

            <ThemedCard className={`flex flex-col justify-between h-[130px] border ${
              atRiskCount > 0
                ? (isLightMode ? 'bg-amber-50/50 border-amber-200/50' : 'bg-amber-500/5 border-amber-500/15')
                : ''
            }`}>
              <div className="flex items-start justify-between">
                <p className={`text-[12px] font-semibold tracking-wide ${atRiskCount > 0 ? 'text-amber-500' : t.textMain}`}>
                  At Risk (20–29d)
                </p>
                {atRiskCount > 0 && (
                  <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
              </div>
              <p className={`text-[36px] font-bold leading-none mt-auto ${atRiskCount > 0 ? 'text-amber-500' : t.textMain}`}>{atRiskCount}</p>
            </ThemedCard>

            <ThemedCard className={`flex flex-col justify-between h-[130px] border ${
              inactiveCount > 0
                ? (isLightMode ? 'bg-orange-50/50 border-orange-200/50' : 'bg-orange-500/5 border-orange-500/15')
                : ''
            }`}>
              <div className="flex items-start justify-between">
                <p className={`text-[12px] font-semibold tracking-wide ${inactiveCount > 0 ? 'text-orange-500' : t.textMain}`}>
                  Inactive 30d+
                </p>
                {inactiveCount > 0 && (
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isLightMode ? 'bg-orange-100 text-orange-600' : 'bg-orange-500/15 text-orange-400'}`}>
                    ACTION
                  </span>
                )}
              </div>
              <p className={`text-[36px] font-bold leading-none mt-auto ${inactiveCount > 0 ? 'text-orange-500' : t.textMain}`}>{inactiveCount}</p>
            </ThemedCard>
          </div>

          {/* ── Filter + Search row ── */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5 items-start sm:items-center justify-between">

            <div className={`flex items-center flex-wrap gap-1 p-1 rounded-2xl border w-fit ${isLightMode ? 'bg-[#F0F4EE] border-[#E3E8E1]' : 'bg-[#111814] border-white/[0.05]'}`}>
              {filterTabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilterType(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                    filterType === tab.key
                      ? (isLightMode ? 'bg-white text-[#2D6A4F] shadow-sm' : 'bg-[#1C2620] text-[#52B788] border border-[#52B788]/20')
                      : `${t.textMuted} hover:${t.textMain}`
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                      tab.alert
                        ? tab.key === 'inactive'
                          ? 'bg-orange-500/20 text-orange-500'
                          : 'bg-amber-400/20 text-amber-500'
                        : isLightMode ? 'bg-[#E3E8E1] text-[#7A8C77]' : 'bg-white/[0.06] text-[#627A5C]'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${t.textMuted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                className={`w-full pl-9 pr-4 py-2 rounded-xl border text-sm outline-none transition-all ${
                  isLightMode
                    ? 'bg-white border-[#DDE3DA] text-[#1A2418] focus:border-[#2D6A4F]/60 placeholder:text-[#A8BCAA]'
                    : 'bg-[#0F1512] border-white/[0.07] text-[#E8F0E5] focus:border-[#52B788]/50 placeholder:text-[#3D5042]'
                }`}
                placeholder="Search name or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* ── Table ── */}
          <ThemedCard className="!p-0 overflow-hidden mb-6">
            <div className={`p-5 border-b ${isLightMode ? 'border-[#F0F4F1]' : 'border-white/[0.05]'} flex justify-between items-center`}>
              <h3 className={`text-base font-bold ${t.textMain}`}>
                Account Registry
                <span className={`ml-2 text-xs font-normal ${t.textMuted}`}>— {filtered.length} user{filtered.length !== 1 ? 's' : ''}</span>
              </h3>
              <button
                onClick={fetchUsers}
                className={`text-xs font-bold ${isLightMode ? 'text-[#4A7D5C] bg-[#98BAA3]/10' : 'text-[#3CD085] bg-[#3CD085]/10'} px-3 py-2 rounded-lg border border-current transition-all flex items-center gap-1.5`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Refresh
              </button>
            </div>

            <div className="overflow-x-auto" style={{ minHeight: 320 }}>
              {loading ? (
                <div className={`p-10 text-center ${isLightMode ? 'text-[#6C9A7D]' : 'text-[#3CD085]'} animate-pulse text-sm font-bold tracking-widest uppercase`}>
                  Loading Registry...
                </div>
              ) : filtered.length === 0 ? (
                <div className={`p-12 text-center ${t.textMuted} text-sm italic`}>No users match your current filter.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`${isLightMode ? 'bg-[#F9FBF9]' : 'bg-[#101417]'} ${t.textMuted} text-[10px] uppercase tracking-widest border-b ${isLightMode ? 'border-[#F0F4F1]' : 'border-white/[0.05]'}`}>
                      <th className="px-6 py-4 font-bold">User</th>
                      <th className="px-4 py-4 font-bold">Role</th>
                      <th className="px-4 py-4 font-bold">Activity</th>
                      <th className="px-4 py-4 font-bold">Last Seen</th>
                      <th className="px-4 py-4 font-bold">Joined</th>
                      <th className="px-6 py-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {filtered.map(user => {
                      const actStatus       = getActivityStatus(user, onlineUserIds);
                      const days            = daysSince(user.last_login);
                      const isBanned        = actStatus === 'banned';
                      const isInactive      = actStatus === 'inactive';
                      const isAtRisk        = actStatus === 'at_risk';
                      const alreadyNotified = !!notifySent[user.id];

                      return (
                        <tr
                          key={user.id}
                          className={`border-b transition-colors ${
                            isLightMode
                              ? `border-[#F0F4F1] ${isInactive ? 'bg-orange-50/30 hover:bg-orange-50/60' : isAtRisk ? 'bg-amber-50/20 hover:bg-amber-50/40' : 'hover:bg-[#F9FBF9]'}`
                              : `border-white/[0.03] ${isInactive ? 'bg-orange-500/[0.04] hover:bg-orange-500/[0.07]' : isAtRisk ? 'bg-amber-500/[0.03] hover:bg-amber-500/[0.05]' : 'hover:bg-white/[0.02]'}`
                          }`}
                        >
                          {/* User */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {user.avatar_url ? (
                                <img src={user.avatar_url} alt={user.full_name} className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-white/[0.06]" onError={e => { e.target.style.display = 'none'; }} />
                              ) : (
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${t.iconBg1}`}>
                                  {(user.full_name || 'U')[0].toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className={`font-bold text-sm ${t.textMain}`}>{user.full_name || 'Anonymous User'}</p>
                                <p className={`text-[11px] ${t.textMuted} mt-0.5`}>{user.email}</p>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="px-4 py-4">
                            <span className={`${isLightMode ? 'bg-[#F0F4F1] text-[#6C9A7D]' : 'bg-[#231B2A] text-[#9A73C2]'} py-1.5 px-3 rounded-md text-[10px] font-bold border border-white/[0.05] tracking-wider`}>
                              {(user.role || 'resident').toUpperCase()}
                            </span>
                          </td>

                          {/* Activity */}
                          <td className="px-4 py-4">
                            <ActivityBadge status={actStatus} days={days} isLightMode={isLightMode} />
                          </td>

                          {/* Last seen */}
                          <td className="px-4 py-4">
                            <span className={`text-xs font-medium ${
                              isInactive ? 'text-orange-500' : isAtRisk ? 'text-amber-500' : t.textMuted
                            }`}>
                              {fmtLastSeen(user.last_login)}
                            </span>
                          </td>

                          {/* Joined */}
                          <td className={`px-4 py-4 text-xs ${t.textMuted}`}>{fmt(user.created_at)}</td>

                          {/* Actions */}
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">

                              {/* Notify — only for at_risk / inactive, not banned */}
                              {(isAtRisk || isInactive) && !isBanned && (
                                <button
                                  onClick={() => setNotifyTarget(user)}
                                  title={alreadyNotified ? 'Already notified this session' : 'Send inactivity notice'}
                                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                                    alreadyNotified
                                      ? (isLightMode ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400')
                                      : isInactive
                                        ? (isLightMode ? 'border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100' : 'border-orange-500/25 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20')
                                        : (isLightMode ? 'border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100' : 'border-amber-500/25 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20')
                                  }`}
                                >
                                  {alreadyNotified ? (
                                    <>
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                      Notified
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                      </svg>
                                      Notify
                                    </>
                                  )}
                                </button>
                              )}

                              {/* Deactivate (inactive/at_risk) or Reactivate (banned) */}
                              {isBanned ? (
                                <button
                                  onClick={() => handleReactivate(user)}
                                  title="Reactivate account"
                                  className={`p-1.5 rounded-lg transition-all ${t.textMuted} ${isLightMode ? 'hover:bg-emerald-50 hover:text-emerald-600' : 'hover:bg-emerald-500/10 hover:text-emerald-400'}`}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </button>
                              ) : (isAtRisk || isInactive) && (
                                <button
                                  onClick={() => handleDeactivate(user)}
                                  title="Deactivate account"
                                  className={`p-1.5 rounded-lg transition-all ${t.textMuted} hover:text-orange-500 hover:bg-orange-500/10`}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M18.364 5.636a9 9 0 11-12.728 0M12 3v9" />
                                  </svg>
                                </button>
                              )}

                              {/* Delete */}
                              <button
                                onClick={() => handleDeleteUser(user.id, user.full_name)}
                                title="Delete account permanently"
                                className={`p-1.5 rounded-lg transition-all ${t.textMuted} hover:text-red-500 hover:bg-red-500/10`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className={`h-1 w-full bg-gradient-to-r from-transparent ${isLightMode ? 'via-[#98BAA3]/40' : 'via-[#2CD87D]/30'} to-transparent`} />
          </ThemedCard>

          {/* Inactivity policy banner — only when there are flagged users */}
          {(inactiveCount > 0 || atRiskCount > 0) && (
            <div className={`rounded-2xl border p-4 mb-10 flex items-start gap-3 ${
              isLightMode ? 'bg-amber-50 border-amber-200/60' : 'bg-amber-500/5 border-amber-500/15'
            }`}>
              <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-amber-600 leading-relaxed">
                <span className="font-bold">Inactivity Policy —</span>{' '}
                Users who haven't logged in for <span className="font-bold">{AT_RISK_DAYS}–{INACTIVE_DAYS - 1} days</span> are flagged{' '}
                <span className="font-bold text-amber-500">At Risk</span>. After{' '}
                <span className="font-bold">{INACTIVE_DAYS}+ days</span> they are marked{' '}
                <span className="font-bold text-orange-500">Inactive</span>. Use{' '}
                <span className="font-bold">Notify</span> to send an in-app warning before deactivating.
                Deactivated accounts can be reactivated at any time.
              </p>
            </div>
          )}

          <div className="h-4" />
        </div>
      </div>

      {/* Notify modal */}
      {notifyTarget && (
        <NotifyModal
          user={notifyTarget}
          onConfirm={handleSendNotify}
          onClose={() => setNotifyTarget(null)}
          isLightMode={isLightMode}
          t={t}
        />
      )}

      <GuidePanel page="users" />

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      ` }} />
    </div>
  );
}
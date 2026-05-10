import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import Sidebar from './Sidebar';
import { useTheme, ThemedCard } from './ThemeContext';
import GuidePanel from './GuidePanel';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (ds) =>
  new Date(ds).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const fmtFull = (ds) =>
  new Date(ds).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

const WASTE_TYPES  = ['All', 'Plastic', 'Glass', 'Paper', 'Metal', 'E-Waste', 'Others'];
const STATUS_TYPES = ['All', 'Completed', 'Pending', 'Cancelled'];

// ─────────────────────────────────────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────────────────────────────────────
const Stat = ({ label, value, sub, iconBg, icon, t }) => (
  <ThemedCard className="flex flex-col gap-3 h-[130px]">
    <div className="flex items-center justify-between">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>{icon}</div>
      {sub && <span className={`text-[10px] font-semibold ${t.textMuted}`}>{sub}</span>}
    </div>
    <div>
      <p className={`text-[10px] font-bold uppercase tracking-widest ${t.textMuted} mb-1`}>{label}</p>
      <p className={`text-2xl font-bold ${t.textMain} leading-none truncate`}>{value}</p>
    </div>
  </ThemedCard>
);

// ─────────────────────────────────────────────────────────────────────────────
// Delete confirmation modal
// ─────────────────────────────────────────────────────────────────────────────
function DeleteModal({ log, onConfirm, onClose, isLightMode, t }) {
  const [reason, setReason] = useState('');
  if (!log) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`w-full max-w-md rounded-2xl border shadow-2xl ${isLightMode ? 'bg-white border-[#E3E8E1]' : 'bg-[#141A16] border-white/[0.07]'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className={`p-5 border-b ${isLightMode ? 'border-[#EDF0EB]' : 'border-white/[0.05]'}`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <h3 className={`text-sm font-bold ${t.textMain}`}>Delete Surrender Log</h3>
              <p className={`text-[11px] ${t.textMuted} mt-0.5`}>This action cannot be undone.</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Log summary */}
          <div className={`p-3 rounded-xl border text-sm ${isLightMode ? 'bg-[#F7F9F6] border-[#E3E8E1]' : 'bg-white/[0.02] border-white/[0.05]'}`}>
            <p className={`font-semibold ${t.textMain}`}>{log.resident_name}</p>
            <p className={`text-xs ${t.textMuted} mt-0.5`}>{log.waste_type} · {log.weight_kg} kg · {fmt(log.created_at)}</p>
          </div>

          {/* Reason */}
          <div>
            <label className={`block text-[10px] font-bold uppercase tracking-widest ${t.textMuted} mb-1.5`}>
              Reason for deletion <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Fraudulent entry, duplicate record, data correction..."
              className={`w-full px-3 py-2.5 rounded-xl border text-sm resize-none outline-none transition-all ${
                isLightMode
                  ? 'bg-[#F4F6F2] border-[#DDE3DA] text-[#1A2418] focus:border-[#2D6A4F]/60 placeholder:text-[#A8BCAA]'
                  : 'bg-[#0F1512] border-white/[0.07] text-[#E8F0E5] focus:border-[#52B788]/50 placeholder:text-[#3D5042]'
              }`}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => reason.trim() ? onConfirm(log, reason.trim()) : alert('Please enter a reason.')}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-400 transition-all"
            >
              Delete Log
            </button>
            <button
              onClick={onClose}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium border transition-all ${
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
export default function SurrenderLogs() {
  const { isLightMode, t } = useTheme();

  // ── data ──────────────────────────────────────────────────────────────────
  const [logs,        setLogs]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [logToDelete, setLogToDelete] = useState(null);

  // ── filters ───────────────────────────────────────────────────────────────
  const [search,    setSearch]    = useState('');          // resident name or email
  const [wasteType, setWasteType] = useState('All');
  const [status,    setStatus]    = useState('All');
  const [dateFrom,  setDateFrom]  = useState('');
  const [dateTo,    setDateTo]    = useState('');

  // ── pagination ────────────────────────────────────────────────────────────
  const PAGE_SIZE = 25;
  const [page, setPage] = useState(1);

  // ── stats (computed from full unfiltered set) ─────────────────────────────
  const [stats, setStats] = useState({ total: 0, totalKg: 0, uniqueResidents: 0, fraudFlags: 0 });

  // ── fetch all logs ────────────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('surrender_logs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const rows = data || [];
      setLogs(rows);

      // Compute stats from full set
      const totalKg         = rows.reduce((sum, r) => sum + (Number(r.weight_kg) || 0), 0);
      const uniqueResidents = new Set(rows.map(r => r.resident_email)).size;
      // "fraud flags" = extremely high single-log weights (>50 kg) as a basic heuristic
      const fraudFlags      = rows.filter(r => Number(r.weight_kg) > 50).length;
      setStats({ total: rows.length, totalKg: totalKg.toFixed(1), uniqueResidents, fraudFlags });
    } catch (e) {
      console.error('fetchLogs error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // ── delete handler ────────────────────────────────────────────────────────
  const handleDelete = async (log, reason) => {
    try {
      const { error } = await supabase.from('surrender_logs').delete().eq('id', log.id);
      if (error) throw error;
      // Log the deletion in admin_activity_log for audit trail
      await supabase.from('admin_activity_log').insert([{
        actor_email: 'admin',   // will be overridden if useAdminAuth is wired here
        action:      'DELETED surrender_log',
        target_email: log.resident_email,
        metadata: {
          log_id:       log.id,
          waste_type:   log.waste_type,
          weight_kg:    log.weight_kg,
          reward:       log.reward_claimed,
          delete_reason: reason,
        },
      }]);
      setLogToDelete(null);
      fetchLogs();
      alert('Log deleted and action recorded in audit trail.');
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  // ── CSV export ─────────────────────────────────────────────────────────────
  const handleExport = () => {
    const cols = ['id', 'created_at', 'resident_name', 'resident_email', 'collector_email', 'waste_type', 'weight_kg', 'reward_claimed', 'status'];
    const header = cols.join(',');
    const rows = filtered.map(r =>
      cols.map(c => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(',')
    );
    const csv  = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `surrender_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── client-side filtering ─────────────────────────────────────────────────
  const filtered = logs.filter(r => {
    const q = search.toLowerCase();
    if (q && !r.resident_name?.toLowerCase().includes(q) && !r.resident_email?.toLowerCase().includes(q) && !r.collector_email?.toLowerCase().includes(q)) return false;
    if (wasteType !== 'All' && !r.waste_type?.toLowerCase().includes(wasteType.toLowerCase())) return false;
    if (status    !== 'All' && r.status !== status)  return false;
    if (dateFrom  && new Date(r.created_at) < new Date(dateFrom))  return false;
    if (dateTo    && new Date(r.created_at) > new Date(dateTo + 'T23:59:59')) return false;
    return true;
  });

  // reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, wasteType, status, dateFrom, dateTo]);

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── shared input style ────────────────────────────────────────────────────
  const inputCls = `px-3 py-2 rounded-xl border text-sm outline-none transition-all ${
    isLightMode
      ? 'bg-white border-[#DDE3DA] text-[#1A2418] focus:border-[#2D6A4F]/60 placeholder:text-[#A8BCAA]'
      : 'bg-[#0F1512] border-white/[0.07] text-[#E8F0E5] focus:border-[#52B788]/50 placeholder:text-[#3D5042]'
  }`;

  const selectCls = `${inputCls} cursor-pointer`;

  // ─── reward chip style ────────────────────────────────────────────────────
  const rewardChip = (val) => {
    if (!val) return isLightMode ? 'bg-gray-100 text-gray-500' : 'bg-white/5 text-white/30';
    const v = val.toLowerCase();
    if (v === 'banked')                return isLightMode ? 'bg-[#D8EDDF] text-[#2D6A4F]'  : 'bg-[#52B788]/12 text-[#52B788]';
    if (v.startsWith('banked redempti')) return isLightMode ? 'bg-[#DDE9F5] text-[#2A5FA8]' : 'bg-[#4A9ECC]/12 text-[#4A9ECC]';
    return isLightMode ? 'bg-amber-50 text-amber-700' : 'bg-amber-500/10 text-amber-400';
  };

  const statusChip = (val) => {
    const v = (val || '').toLowerCase();
    if (v === 'completed') return isLightMode ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (v === 'pending')   return isLightMode ? 'bg-amber-50 text-amber-700 border-amber-200'       : 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    if (v === 'cancelled') return isLightMode ? 'bg-red-50 text-red-600 border-red-200'              : 'bg-red-500/10 text-red-400 border-red-500/20';
    return isLightMode ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-white/5 text-white/30 border-white/10';
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className={`flex h-screen w-full font-sans ${t.bg} transition-colors duration-300 overflow-hidden selection:bg-[#2CD87D] selection:text-black`}>
      <Sidebar />

      <div className="flex-1 h-full overflow-y-auto no-scrollbar">
        <div className="p-6 lg:p-10 max-w-[1700px] mx-auto">

          {/* ── Header ── */}
          <div className="flex flex-col lg:flex-row justify-between items-start mb-8 gap-4">
            <div>
              <h2 className={`text-3xl font-bold ${t.textMain} tracking-tight`}>Surrender Logs</h2>
              <p className={`${t.textMuted} mt-1 text-sm font-medium`}>Full audit trail of all waste submissions across the network</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={fetchLogs}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${t.accentText} ${
                  isLightMode ? 'border-[#A8CFBA] bg-[#D8EDDF] hover:bg-[#C4E0CF]' : 'border-[#52B788]/25 bg-[#52B788]/8 hover:bg-[#52B788]/15'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              <button
                onClick={handleExport}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                  isLightMode
                    ? 'border-[#DDE9F5] bg-[#DDE9F5] text-[#2A5FA8] hover:bg-[#C8DCF0]'
                    : 'border-[#4A9ECC]/25 bg-[#4A9ECC]/10 text-[#4A9ECC] hover:bg-[#4A9ECC]/20'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </button>
            </div>
          </div>

          {/* ── Stats row ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Stat
              label="Total Logs"
              value={stats.total.toLocaleString()}
              sub="All time"
              iconBg={t.iconBg1}
              t={t}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
            />
            <Stat
              label="Total KG Collected"
              value={`${Number(stats.totalKg).toLocaleString()} kg`}
              sub="Network-wide"
              iconBg={t.iconBg2}
              t={t}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>}
            />
            <Stat
              label="Unique Residents"
              value={stats.uniqueResidents.toLocaleString()}
              sub="Distinct users"
              iconBg={t.iconBg1}
              t={t}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            />
            <Stat
              label="High-Weight Flags"
              value={stats.fraudFlags}
              sub="> 50 kg per log"
              iconBg={isLightMode ? 'bg-red-50 text-red-500' : 'bg-red-500/10 text-red-400'}
              t={t}
              icon={<svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
            />
          </div>

          {/* ── Filters ── */}
          <div className={`rounded-2xl border p-4 mb-6 ${isLightMode ? 'bg-white border-[#E3E8E1]' : 'bg-[#131A16] border-white/[0.05]'}`}>
            <div className="flex flex-wrap gap-3 items-end">

              {/* Search */}
              <div className="flex-1 min-w-[200px]">
                <label className={`block text-[10px] font-bold uppercase tracking-widest ${t.textMuted} mb-1.5`}>Search</label>
                <div className="relative">
                  <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${t.textMuted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    className={`${inputCls} pl-8 w-full`}
                    placeholder="Resident name, email, or collector..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Waste type */}
              <div className="min-w-[130px]">
                <label className={`block text-[10px] font-bold uppercase tracking-widest ${t.textMuted} mb-1.5`}>Waste Type</label>
                <select className={selectCls} value={wasteType} onChange={e => setWasteType(e.target.value)}>
                  {WASTE_TYPES.map(w => <option key={w}>{w}</option>)}
                </select>
              </div>

              {/* Status */}
              <div className="min-w-[120px]">
                <label className={`block text-[10px] font-bold uppercase tracking-widest ${t.textMuted} mb-1.5`}>Status</label>
                <select className={selectCls} value={status} onChange={e => setStatus(e.target.value)}>
                  {STATUS_TYPES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              {/* Date from */}
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-widest ${t.textMuted} mb-1.5`}>From</label>
                <input type="date" className={inputCls} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>

              {/* Date to */}
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-widest ${t.textMuted} mb-1.5`}>To</label>
                <input type="date" className={inputCls} value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>

              {/* Clear filters */}
              {(search || wasteType !== 'All' || status !== 'All' || dateFrom || dateTo) && (
                <button
                  onClick={() => { setSearch(''); setWasteType('All'); setStatus('All'); setDateFrom(''); setDateTo(''); }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                    isLightMode ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100' : 'border-red-500/20 bg-red-500/8 text-red-400 hover:bg-red-500/15'
                  }`}
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Filter result count */}
            <p className={`text-[11px] font-medium ${t.textMuted} mt-3`}>
              Showing <span className={`font-bold ${t.textMain}`}>{filtered.length.toLocaleString()}</span> of{' '}
              <span className={`font-bold ${t.textMain}`}>{logs.length.toLocaleString()}</span> total logs
            </p>
          </div>

          {/* ── Table ── */}
          <ThemedCard className="!p-0 overflow-hidden mb-6">

            <div className="overflow-x-auto" style={{ minHeight: 340 }}>
              {loading ? (
                <div className={`flex items-center justify-center h-[280px] text-sm font-bold tracking-widest animate-pulse ${t.accentText}`}>
                  LOADING LOGS...
                </div>
              ) : paginated.length === 0 ? (
                <div className={`flex flex-col items-center justify-center h-[280px] gap-3`}>
                  <svg className={`w-12 h-12 ${t.textMuted} opacity-30`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className={`text-sm italic font-medium ${t.textMuted}`}>No logs match your current filters.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`text-[10px] uppercase tracking-widest border-b ${
                      isLightMode ? 'bg-[#F9FBF9] border-[#F0F4F1]' : 'bg-[#0A0F0D] border-white/[0.04]'
                    } ${t.textMuted}`}>
                      <th className="px-6 py-4 font-bold">Date & Time</th>
                      <th className="px-4 py-4 font-bold">Resident</th>
                      <th className="px-4 py-4 font-bold">Collector Center</th>
                      <th className="px-4 py-4 font-bold">Waste Type</th>
                      <th className="px-4 py-4 font-bold">Weight</th>
                      <th className="px-4 py-4 font-bold">Reward</th>
                      <th className="px-4 py-4 font-bold">Status</th>
                      <th className="px-6 py-4 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {paginated.map(log => {
                      const highWeight = Number(log.weight_kg) > 50;
                      return (
                        <tr
                          key={log.id}
                          className={`border-b transition-colors ${
                            isLightMode ? 'border-[#F0F4F1] hover:bg-[#F9FBF9]' : 'border-white/[0.03] hover:bg-white/[0.02]'
                          } ${highWeight ? (isLightMode ? 'bg-red-50/40' : 'bg-red-500/[0.04]') : ''}`}
                        >
                          {/* Date */}
                          <td className={`px-6 py-4 text-xs font-medium ${t.textMuted} whitespace-nowrap`}>
                            {fmtFull(log.created_at)}
                          </td>

                          {/* Resident */}
                          <td className="px-4 py-4">
                            <p className={`font-semibold text-sm ${t.textMain}`}>{log.resident_name || '—'}</p>
                            <p className={`text-[11px] ${t.textMuted} mt-0.5 truncate max-w-[160px]`}>{log.resident_email}</p>
                          </td>

                          {/* Collector */}
                          <td className={`px-4 py-4 text-xs font-medium ${t.textMuted} truncate max-w-[160px]`}>
                            {log.collector_email}
                          </td>

                          {/* Waste type */}
                          <td className="px-4 py-4">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                              isLightMode ? 'bg-[#EEF4EC] text-[#2D6A4F] border-[#A8CFBA]/30' : 'bg-[#52B788]/8 text-[#52B788] border-[#52B788]/20'
                            }`}>
                              {log.waste_type || '—'}
                            </span>
                          </td>

                          {/* Weight — highlight if suspiciously high */}
                          <td className="px-4 py-4">
                            <span className={`font-bold text-sm ${highWeight ? 'text-red-500' : t.textMain}`}>
                              {log.weight_kg} kg
                            </span>
                            {highWeight && (
                              <span className="ml-1.5 text-[9px] font-black text-red-500 border border-red-400/40 bg-red-500/10 px-1.5 py-0.5 rounded-md">HIGH</span>
                            )}
                          </td>

                          {/* Reward */}
                          <td className="px-4 py-4">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${rewardChip(log.reward_claimed)}`}>
                              {log.reward_claimed || 'None'}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-4">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${statusChip(log.status)}`}>
                              {log.status || 'Completed'}
                            </span>
                          </td>

                          {/* Delete */}
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => setLogToDelete(log)}
                              className={`p-1.5 rounded-lg transition-all ${t.textMuted} hover:text-red-500 hover:bg-red-500/10`}
                              title="Delete this log"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Bottom accent */}
            <div className={`h-1 w-full bg-gradient-to-r from-transparent ${isLightMode ? 'via-[#98BAA3]/40' : 'via-[#2CD87D]/30'} to-transparent`} />
          </ThemedCard>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mb-10">
              <p className={`text-xs font-medium ${t.textMuted}`}>
                Page {page} of {totalPages} · {filtered.length} results
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all disabled:opacity-30 ${
                    isLightMode ? 'border-[#E3E8E1] text-[#3D4E3A] hover:bg-[#F3F6F1]' : 'border-white/[0.07] text-[#B0C5AA] hover:bg-white/[0.04]'
                  }`}
                >
                  ← Prev
                </button>

                {/* Page numbers — show up to 5 around current */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                  .reduce((acc, p, i, arr) => {
                    if (i > 0 && p - arr[i - 1] > 1) acc.push('…');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === '…'
                      ? <span key={`e${i}`} className={`px-2 text-xs ${t.textMuted}`}>…</span>
                      : <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`w-8 h-8 rounded-lg text-xs font-bold border transition-all ${
                            p === page
                              ? (isLightMode ? 'bg-[#2D6A4F] text-white border-[#2D6A4F]' : 'bg-[#52B788] text-[#0F1512] border-[#52B788]')
                              : (isLightMode ? 'border-[#E3E8E1] text-[#3D4E3A] hover:bg-[#F3F6F1]' : 'border-white/[0.07] text-[#B0C5AA] hover:bg-white/[0.04]')
                          }`}
                        >
                          {p}
                        </button>
                  )
                }

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all disabled:opacity-30 ${
                    isLightMode ? 'border-[#E3E8E1] text-[#3D4E3A] hover:bg-[#F3F6F1]' : 'border-white/[0.07] text-[#B0C5AA] hover:bg-white/[0.04]'
                  }`}
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          <div className="h-4" />
        </div>
      </div>

      {/* ── Delete modal ── */}
      {logToDelete && (
        <DeleteModal
          log={logToDelete}
          onConfirm={handleDelete}
          onClose={() => setLogToDelete(null)}
          isLightMode={isLightMode}
          t={t}
        />
      )}

      <GuidePanel page="surrender_logs" />

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      ` }} />
    </div>
  );
}
// SurrenderLogs.jsx — WISHCRAFT v2.0
// Updated: fund terminology, canonical status values, classroom/allocation fields

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import Sidebar from './Sidebar';
import { useTheme, ThemedCard } from './ThemeContext';
import GuidePanel from './GuidePanel';

const fmt = (ds) =>
  new Date(ds).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const fmtFull = (ds) =>
  new Date(ds).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

const fmtPeso = (value) => {
  const n = Number(value) || 0;
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Canonical WISHCRAFT fund statuses
const WISHCRAFT_STATUSES = ['All', 'Verified', 'Encoded', 'Credited to Fund', 'Rejected'];
const WASTE_TYPES = ['All', 'Plastic', 'Glass', 'Paper', 'Metal', 'E-Waste', 'Others'];
const ALLOCATION_TYPES = ['All', 'Individual Student Contribution', 'Classroom Contribution', 'General Scholarship Fund'];

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
          <div className={`p-3 rounded-xl border text-sm ${isLightMode ? 'bg-[#F7F9F6] border-[#E3E8E1]' : 'bg-white/[0.02] border-white/[0.05]'}`}>
            <p className={`font-semibold ${t.textMain}`}>{log.resident_name}</p>
            <p className={`text-xs ${t.textMuted} mt-0.5`}>{log.waste_type} · {log.weight_kg} kg · {fmt(log.created_at)}</p>
          </div>
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

// Status pill style — updated for WISHCRAFT canonical statuses
function getStatusStyle(isLightMode) {
  return (val) => {
    const v = String(val || '').toLowerCase().trim();
    if (v === 'verified')           return isLightMode ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (v === 'encoded')            return isLightMode ? 'bg-blue-50 text-blue-700 border-blue-200'          : 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (v === 'credited to fund')   return isLightMode ? 'bg-purple-50 text-purple-700 border-purple-200'    : 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    if (v === 'rejected')           return isLightMode ? 'bg-red-50 text-red-600 border-red-200'              : 'bg-red-500/10 text-red-400 border-red-500/20';
    // Legacy fallback
    if (v === 'completed')          return isLightMode ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (v === 'pending')            return isLightMode ? 'bg-amber-50 text-amber-700 border-amber-200'       : 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    return isLightMode ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-white/5 text-white/30 border-white/10';
  };
}

export default function SurrenderLogs() {
  const { isLightMode, t } = useTheme();

  const [logs,        setLogs]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [logToDelete, setLogToDelete] = useState(null);

  const [search,         setSearch]         = useState('');
  const [wasteType,      setWasteType]      = useState('All');
  const [statusFilter,   setStatusFilter]   = useState('All');
  const [allocationFilter, setAllocationFilter] = useState('All');
  const [dateFrom,       setDateFrom]       = useState('');
  const [dateTo,         setDateTo]         = useState('');

  const PAGE_SIZE = 25;
  const [page, setPage] = useState(1);

  const [stats, setStats] = useState({ total: 0, totalKg: 0, uniqueStudents: 0, estimatedFundValue: 0, creditedToFund: 0, flagged: 0 });

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

      const totalKg           = rows.reduce((s, r) => s + (Number(r.weight_kg) || 0), 0);
      const uniqueStudents    = new Set(rows.map(r => r.resident_email)).size;
      const estimatedFundVal  = rows.filter(r => String(r.encoded_status || r.status || '').toLowerCase() !== 'rejected').reduce((s, r) => s + (Number(r.estimated_credit) || 0), 0);
      const creditedToFund    = rows.filter(r => String(r.encoded_status || r.status || '').toLowerCase() === 'credited to fund').reduce((s, r) => s + (Number(r.estimated_credit) || 0), 0);
      const flagged           = rows.filter(r => Number(r.weight_kg) > 50).length;

      setStats({ total: rows.length, totalKg: totalKg.toFixed(1), uniqueStudents, estimatedFundValue: estimatedFundVal, creditedToFund, flagged });
    } catch (e) {
      console.error('fetchLogs error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleDelete = async (log, reason) => {
    try {
      const { error } = await supabase.from('surrender_logs').delete().eq('id', log.id);
      if (error) throw error;
      await supabase.from('admin_activity_log').insert([{
        actor_email: 'admin',
        action: 'DELETED surrender_log',
        target_email: log.resident_email,
        metadata: { log_id: log.id, waste_type: log.waste_type, weight_kg: log.weight_kg, delete_reason: reason },
      }]);
      setLogToDelete(null);
      fetchLogs();
      alert('Log deleted and action recorded in audit trail.');
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  // Update status (accounting/admin action)
  const handleStatusUpdate = async (log, newStatus) => {
    try {
      const updatePayload = {
        encoded_status: newStatus,
        status: newStatus,
      };
      if (newStatus === 'Credited to Fund') {
        updatePayload.wishcraft_fund_credited_at = new Date().toISOString();
      }
      const { error } = await supabase.from('surrender_logs').update(updatePayload).eq('id', log.id);
      if (error) throw error;
      fetchLogs();
    } catch (e) {
      alert('Error updating status: ' + e.message);
    }
  };

  const handleExport = () => {
    const cols = ['id', 'created_at', 'resident_name', 'resident_email', 'collector_email', 'waste_type', 'weight_kg', 'points_earned', 'estimated_credit', 'contribution_type', 'classroom_section', 'encoded_status'];
    const header = cols.join(',');
    const rows = filtered.map(r => cols.map(c => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(','));
    const csv  = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `surrender_logs_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = logs.filter(r => {
    const q = search.toLowerCase();
    if (q && !r.resident_name?.toLowerCase().includes(q) && !r.resident_email?.toLowerCase().includes(q)) return false;
    if (wasteType !== 'All' && !r.waste_type?.toLowerCase().includes(wasteType.toLowerCase())) return false;
    if (statusFilter !== 'All') {
      const st = String(r.encoded_status || r.status || '').toLowerCase();
      if (!st.includes(statusFilter.toLowerCase())) return false;
    }
    if (allocationFilter !== 'All') {
      const at = String(r.contribution_type || r.scholarship_allocation || '');
      if (at !== allocationFilter) return false;
    }
    if (dateFrom && new Date(r.created_at) < new Date(dateFrom)) return false;
    if (dateTo   && new Date(r.created_at) > new Date(dateTo + 'T23:59:59')) return false;
    return true;
  });

  useEffect(() => { setPage(1); }, [search, wasteType, statusFilter, allocationFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const inputCls = `px-3 py-2 rounded-xl border text-sm outline-none transition-all ${
    isLightMode
      ? 'bg-white border-[#DDE3DA] text-[#1A2418] focus:border-[#2D6A4F]/60 placeholder:text-[#A8BCAA]'
      : 'bg-[#0F1512] border-white/[0.07] text-[#E8F0E5] focus:border-[#52B788]/50 placeholder:text-[#3D5042]'
  }`;

  const statusChip = getStatusStyle(isLightMode);

  const allocationLabel = (val) => {
    const v = String(val || '');
    if (v.includes('Individual')) return 'Individual';
    if (v.includes('Classroom'))  return 'Classroom';
    if (v.includes('General'))    return 'General Fund';
    return v || '—';
  };

  return (
    <div className={`flex h-screen w-full font-sans ${t.bg} transition-colors duration-300 overflow-hidden selection:bg-[#2CD87D] selection:text-black`}>
      <Sidebar />

      <div className="flex-1 h-full overflow-y-auto no-scrollbar">
        <div className="p-6 lg:p-10 max-w-[1700px] mx-auto">

          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start mb-8 gap-4">
            <div>
              <h2 className={`text-3xl font-bold ${t.textMain} tracking-tight`}>Surrender Logs</h2>
              <p className={`${t.textMuted} mt-1 text-sm font-medium`}>Full WISHCRAFT Fund contribution audit trail</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={fetchLogs} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${t.accentText} ${isLightMode ? 'border-[#A8CFBA] bg-[#D8EDDF] hover:bg-[#C4E0CF]' : 'border-[#52B788]/25 bg-[#52B788]/8 hover:bg-[#52B788]/15'}`}>
                Refresh
              </button>
              <button onClick={handleExport} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${isLightMode ? 'border-[#DDE9F5] bg-[#DDE9F5] text-[#2A5FA8] hover:bg-[#C8DCF0]' : 'border-[#4A9ECC]/25 bg-[#4A9ECC]/10 text-[#4A9ECC] hover:bg-[#4A9ECC]/20'}`}>
                Export CSV
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Stat label="Total Submissions" value={stats.total.toLocaleString()} sub="All time" iconBg={t.iconBg1} t={t}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>}
            />
            <Stat label="Total KG Contributed" value={`${Number(stats.totalKg).toLocaleString()} kg`} sub="Network-wide" iconBg={t.iconBg2} t={t}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"/></svg>}
            />
            <Stat label="Estimated Fund Value" value={fmtPeso(stats.estimatedFundValue)} sub="Pending credit" iconBg={t.iconBg1} t={t}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 10v2m8-6a8 8 0 11-16 0 8 8 0 0116 0z"/></svg>}
            />
            <Stat label="Credited to Fund" value={fmtPeso(stats.creditedToFund)} sub="Confirmed" iconBg={isLightMode ? 'bg-purple-50 text-purple-600' : 'bg-purple-500/10 text-purple-400'} t={t}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
            />
          </div>

          {/* Filters */}
          <div className={`rounded-2xl border p-4 mb-6 ${isLightMode ? 'bg-white border-[#E3E8E1]' : 'bg-[#131A16] border-white/[0.05]'}`}>
            <div className="flex flex-wrap gap-3 items-end">

              <div className="flex-1 min-w-[200px]">
                <label className={`block text-[10px] font-bold uppercase tracking-widest ${t.textMuted} mb-1.5`}>Search</label>
                <div className="relative">
                  <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${t.textMuted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                  <input className={`${inputCls} pl-8 w-full`} placeholder="Student name, email..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
              </div>

              <div className="min-w-[130px]">
                <label className={`block text-[10px] font-bold uppercase tracking-widest ${t.textMuted} mb-1.5`}>Waste Type</label>
                <select className={`${inputCls} cursor-pointer`} value={wasteType} onChange={e => setWasteType(e.target.value)}>
                  {WASTE_TYPES.map(w => <option key={w}>{w}</option>)}
                </select>
              </div>

              <div className="min-w-[160px]">
                <label className={`block text-[10px] font-bold uppercase tracking-widest ${t.textMuted} mb-1.5`}>Fund Status</label>
                <select className={`${inputCls} cursor-pointer`} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  {WISHCRAFT_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div className="min-w-[200px]">
                <label className={`block text-[10px] font-bold uppercase tracking-widest ${t.textMuted} mb-1.5`}>Contribution Type</label>
                <select className={`${inputCls} cursor-pointer`} value={allocationFilter} onChange={e => setAllocationFilter(e.target.value)}>
                  {ALLOCATION_TYPES.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>

              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-widest ${t.textMuted} mb-1.5`}>From</label>
                <input type="date" className={inputCls} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>

              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-widest ${t.textMuted} mb-1.5`}>To</label>
                <input type="date" className={inputCls} value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>

              {(search || wasteType !== 'All' || statusFilter !== 'All' || allocationFilter !== 'All' || dateFrom || dateTo) && (
                <button onClick={() => { setSearch(''); setWasteType('All'); setStatusFilter('All'); setAllocationFilter('All'); setDateFrom(''); setDateTo(''); }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${isLightMode ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100' : 'border-red-500/20 bg-red-500/8 text-red-400 hover:bg-red-500/15'}`}>
                  Clear
                </button>
              )}
            </div>

            <p className={`text-[11px] font-medium ${t.textMuted} mt-3`}>
              Showing <span className={`font-bold ${t.textMain}`}>{filtered.length.toLocaleString()}</span> of{' '}
              <span className={`font-bold ${t.textMain}`}>{logs.length.toLocaleString()}</span> total logs
            </p>
          </div>

          {/* Table */}
          <ThemedCard className="!p-0 overflow-hidden mb-6">
            <div className="overflow-x-auto" style={{ minHeight: 340 }}>
              {loading ? (
                <div className={`flex items-center justify-center h-[280px] text-sm font-bold tracking-widest animate-pulse ${t.accentText}`}>
                  LOADING LOGS...
                </div>
              ) : paginated.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[280px] gap-3">
                  <p className={`text-sm italic font-medium ${t.textMuted}`}>No logs match your current filters.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`text-[10px] uppercase tracking-widest border-b ${isLightMode ? 'bg-[#F9FBF9] border-[#F0F4F1]' : 'bg-[#0A0F0D] border-white/[0.04]'} ${t.textMuted}`}>
                      <th className="px-6 py-4 font-bold">Date & Time</th>
                      <th className="px-4 py-4 font-bold">Student</th>
                      <th className="px-4 py-4 font-bold">Waste Type</th>
                      <th className="px-4 py-4 font-bold">Weight</th>
                      <th className="px-4 py-4 font-bold">Contribution Type</th>
                      <th className="px-4 py-4 font-bold">Classroom / Section</th>
                      <th className="px-4 py-4 font-bold">Est. Fund Value</th>
                      <th className="px-4 py-4 font-bold">Fund Status</th>
                      <th className="px-6 py-4 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {paginated.map(log => {
                      const highWeight = Number(log.weight_kg) > 50;
                      const displayStatus = String(log.encoded_status || log.status || 'Verified');
                      return (
                        <tr
                          key={log.id}
                          className={`border-b transition-colors ${
                            isLightMode ? 'border-[#F0F4F1] hover:bg-[#F9FBF9]' : 'border-white/[0.03] hover:bg-white/[0.02]'
                          } ${highWeight ? (isLightMode ? 'bg-red-50/40' : 'bg-red-500/[0.04]') : ''}`}
                        >
                          <td className={`px-6 py-4 text-xs font-medium ${t.textMuted} whitespace-nowrap`}>{fmtFull(log.created_at)}</td>

                          <td className="px-4 py-4">
                            <p className={`font-semibold text-sm ${t.textMain}`}>{log.resident_name || '—'}</p>
                            <p className={`text-[11px] ${t.textMuted} mt-0.5 truncate max-w-[150px]`}>{log.resident_email}</p>
                          </td>

                          <td className="px-4 py-4">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${isLightMode ? 'bg-[#EEF4EC] text-[#2D6A4F] border-[#A8CFBA]/30' : 'bg-[#52B788]/8 text-[#52B788] border-[#52B788]/20'}`}>
                              {log.waste_type || '—'}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <span className={`font-bold text-sm ${highWeight ? 'text-red-500' : t.textMain}`}>
                              {log.weight_kg} kg
                            </span>
                            {highWeight && <span className="ml-1.5 text-[9px] font-black text-red-500 border border-red-400/40 bg-red-500/10 px-1.5 py-0.5 rounded-md">HIGH</span>}
                          </td>

                          <td className={`px-4 py-4 text-xs ${t.textMuted}`}>
                            {allocationLabel(log.contribution_type || log.scholarship_allocation)}
                          </td>

                          <td className={`px-4 py-4 text-xs ${t.textMuted}`}>
                            {log.classroom_section || '—'}
                          </td>

                          <td className={`px-4 py-4 text-sm font-bold ${isLightMode ? 'text-[#2D6A4F]' : 'text-[#52B788]'}`}>
                            {fmtPeso(log.estimated_credit)}
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${statusChip(displayStatus)}`}>
                                {displayStatus}
                              </span>
                              {/* Quick status update dropdown */}
                              {displayStatus !== 'Rejected' && displayStatus !== 'Credited to Fund' && (
                                <select
                                  value={displayStatus}
                                  onChange={e => handleStatusUpdate(log, e.target.value)}
                                  className={`text-[10px] rounded-lg border px-2 py-1 outline-none cursor-pointer ${inputCls} !py-1 !px-2`}
                                  title="Update status"
                                >
                                  {WISHCRAFT_STATUSES.filter(s => s !== 'All').map(s => <option key={s}>{s}</option>)}
                                </select>
                              )}
                            </div>
                          </td>

                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => setLogToDelete(log)}
                              className={`p-1.5 rounded-lg transition-all ${t.textMuted} hover:text-red-500 hover:bg-red-500/10`}
                              title="Delete this log"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
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
            <div className={`h-1 w-full bg-gradient-to-r from-transparent ${isLightMode ? 'via-[#98BAA3]/40' : 'via-[#2CD87D]/30'} to-transparent`} />
          </ThemedCard>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mb-10">
              <p className={`text-xs font-medium ${t.textMuted}`}>Page {page} of {totalPages} · {filtered.length} results</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all disabled:opacity-30 ${isLightMode ? 'border-[#E3E8E1] text-[#3D4E3A] hover:bg-[#F3F6F1]' : 'border-white/[0.07] text-[#B0C5AA] hover:bg-white/[0.04]'}`}>
                  ← Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                  .reduce((acc, p, i, arr) => { if (i > 0 && p - arr[i-1] > 1) acc.push('…'); acc.push(p); return acc; }, [])
                  .map((p, i) =>
                    p === '…'
                      ? <span key={`e${i}`} className={`px-2 text-xs ${t.textMuted}`}>…</span>
                      : <button key={p} onClick={() => setPage(p)}
                          className={`w-8 h-8 rounded-lg text-xs font-bold border transition-all ${p === page ? (isLightMode ? 'bg-[#2D6A4F] text-white border-[#2D6A4F]' : 'bg-[#52B788] text-[#0F1512] border-[#52B788]') : (isLightMode ? 'border-[#E3E8E1] text-[#3D4E3A] hover:bg-[#F3F6F1]' : 'border-white/[0.07] text-[#B0C5AA] hover:bg-white/[0.04]')}`}>
                          {p}
                        </button>
                  )
                }
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all disabled:opacity-30 ${isLightMode ? 'border-[#E3E8E1] text-[#3D4E3A] hover:bg-[#F3F6F1]' : 'border-white/[0.07] text-[#B0C5AA] hover:bg-white/[0.04]'}`}>
                  Next →
                </button>
              </div>
            </div>
          )}

          <div className="h-4" />
        </div>
      </div>

      {logToDelete && (
        <DeleteModal log={logToDelete} onConfirm={handleDelete} onClose={() => setLogToDelete(null)} isLightMode={isLightMode} t={t} />
      )}

      <GuidePanel page="surrender_logs" />

      <style dangerouslySetInnerHTML={{ __html: `.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}` }} />
    </div>
  );
}

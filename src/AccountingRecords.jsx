// AccountingRecords.jsx
// Reads from accounting_records (linked to students + surrender_logs) and
// surrender_logs directly to show Fund Status pipeline with actions.

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './supabase';
import Sidebar from './Sidebar';
import { useTheme, ThemedCard } from './ThemeContext';
import { useAdminAuth } from './useAdminAuth';

const fmt = (ds) => ds ? new Date(ds).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmtFull = (ds) => ds ? new Date(ds).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
const peso = (v) => `₱${Number(v || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUSES = ['All', 'Verified', 'Encoded', 'Credited to Fund', 'Rejected'];
const ALLOCS   = ['All', 'Individual Student Contribution', 'Classroom Contribution', 'General Scholarship Fund'];

const statusChip = (v, light) => {
  const s = (v||'').toLowerCase();
  if (s === 'credited to fund') return light ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-purple-500/10 text-purple-400 border-purple-500/20';
  if (s === 'encoded')          return light ? 'bg-blue-50 text-blue-700 border-blue-200'       : 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  if (s === 'rejected')         return light ? 'bg-red-50 text-red-600 border-red-200'           : 'bg-red-500/10 text-red-400 border-red-500/20';
  return light ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
};

// ── Record Detail / Status Update Modal ──────────────────────────────────────
function RecordModal({ record, onClose, onUpdated, isLightMode, t, canEdit }) {
  const [newStatus, setNewStatus] = useState(record?.encoded_status || record?.status || 'Verified');
  const [remarks,   setRemarks]   = useState(record?.remarks || '');
  const [saving,    setSaving]    = useState(false);

  if (!record) return null;

  const handleSave = async () => {
    if (!canEdit) return;
    setSaving(true);
    try {
      // Update surrender_logs status
      await supabase.from('surrender_logs').update({
        encoded_status: newStatus,
        status: newStatus,
      }).eq('id', record.id);

      // Update or insert accounting_records
      const { data: existing } = await supabase
        .from('accounting_records')
        .select('id')
        .eq('surrender_log_id', record.id)
        .maybeSingle();

      if (existing) {
        await supabase.from('accounting_records').update({
          status: newStatus.toLowerCase(),
          remarks: remarks,
          updated_at: new Date().toISOString(),
        }).eq('surrender_log_id', record.id);
      } else {
        await supabase.from('accounting_records').insert([{
          surrender_log_id:          record.id,
          student_name:              record.resident_name,
          lrn:                       record.lrn,
          cash_equivalent:           record.estimated_credit || 0,
          scholarship_allocation:    record.estimated_credit || 0,
          status:                    newStatus.toLowerCase(),
          remarks:                   remarks,
        }]);
      }

      onUpdated(record.id, newStatus);
      onClose();
    } catch (e) {
      alert('Error updating: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const divider = isLightMode ? 'border-[#EDF0EB]' : 'border-white/[0.05]';

  const Row = ({ label, value, accent }) => (
    <div className={`flex justify-between py-2.5 border-b ${divider}`}>
      <span className={`text-xs ${t.textMuted} flex-shrink-0 w-44`}>{label}</span>
      <span className={`text-xs font-semibold text-right ${accent ? t.accentText : t.textMain}`}>{value || '—'}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`w-full max-w-lg rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto ${isLightMode ? 'bg-white border-[#E3E8E1]' : 'bg-[#141A16] border-white/[0.07]'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className={`p-5 border-b sticky top-0 z-10 ${isLightMode ? 'bg-white border-[#EDF0EB]' : 'bg-[#141A16] border-white/[0.05]'} flex justify-between items-center`}>
          <div>
            <h3 className={`text-sm font-bold ${t.textMain}`}>Accounting Record</h3>
            <p className={`text-[11px] ${t.textMuted} mt-0.5`}>{record.receipt_no || record.control_number || `Log #${record.id}`}</p>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${isLightMode ? 'hover:bg-[#F3F6F1] text-[#5E7A67]' : 'hover:bg-white/[0.05] text-[#A8BDA2]'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="p-5 space-y-0.5">
          <Row label="Student Name"           value={record.resident_name} />
          <Row label="LRN"                    value={record.lrn} />
          <Row label="Section"                value={record.section || record.classroom_section} />
          <Row label="Waste Type"             value={record.waste_type} />
          <Row label="Weight"                 value={`${record.weight_kg} kg`} />
          <Row label="Points Earned"          value={`${Number(record.points_earned||0).toFixed(0)} pts`} />
          <Row label="Estimated Fund Value"   value={peso(record.estimated_credit)} accent />
          <Row label="Allocation Type"        value={record.contribution_type || record.scholarship_allocation} />
          <Row label="Classroom / Section"    value={record.classroom_section} />
          <Row label="Beneficiary"            value={record.beneficiary_name} />
          <Row label="Date Received"          value={fmtFull(record.created_at)} />
          <Row label="Verified By"            value={record.officer_name} />
        </div>

        {canEdit && (
          <div className={`p-5 border-t ${divider} space-y-3`}>
            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-widest ${t.textMuted} mb-1.5`}>Update Fund Status</label>
              <select
                value={newStatus}
                onChange={e => setNewStatus(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${isLightMode ? 'bg-white border-[#DDE3DA] text-[#1A2418]' : 'bg-[#0F1512] border-white/[0.07] text-[#E8F0E5]'}`}
              >
                {STATUSES.filter(s => s !== 'All').map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-widest ${t.textMuted} mb-1.5`}>Remarks (optional)</label>
              <textarea
                rows={2}
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder="e.g. Credited to scholarship fund batch Jan 2025"
                className={`w-full px-3 py-2 rounded-xl border text-sm resize-none outline-none ${isLightMode ? 'bg-[#F4F6F2] border-[#DDE3DA] text-[#1A2418] placeholder:text-[#A8BCAA]' : 'bg-[#0F1512] border-white/[0.07] text-[#E8F0E5] placeholder:text-[#3D5042]'}`}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-[#2D6A4F] hover:bg-[#245A41] disabled:opacity-40 transition-all">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button onClick={onClose} className={`px-5 py-2.5 rounded-xl text-sm border ${isLightMode ? 'border-[#DDE3DA] text-[#7A8C77]' : 'border-white/[0.07] text-[#627A5C]'}`}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AccountingRecords() {
  const { isLightMode, t } = useTheme();
  const { can, isSuperAdmin } = useAdminAuth();
  const canEdit = can('accounting') || isSuperAdmin;

  const [logs,     setLogs]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);

  const [search,   setSearch]   = useState('');
  const [status,   setStatus]   = useState('All');
  const [alloc,    setAlloc]    = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [page,     setPage]     = useState(1);
  const PAGE_SIZE = 25;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('surrender_logs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setLogs(data || []);
    } catch (e) {
      console.error('AccountingRecords fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleUpdated = (id, newStatus) => {
    setLogs(prev => prev.map(l => l.id === id ? { ...l, encoded_status: newStatus, status: newStatus } : l));
  };

  // Summary stats
  const summary = useMemo(() => {
    const all = logs;
    return {
      total:     all.length,
      verified:  all.filter(l => (l.encoded_status||'').toLowerCase() === 'verified').length,
      encoded:   all.filter(l => (l.encoded_status||'').toLowerCase() === 'encoded').length,
      credited:  all.filter(l => (l.encoded_status||'').toLowerCase() === 'credited to fund').length,
      rejected:  all.filter(l => (l.encoded_status||'').toLowerCase() === 'rejected').length,
      totalFund: all.reduce((s, l) => s + (Number(l.estimated_credit)||0), 0),
      fundCredited: all.filter(l => (l.encoded_status||'').toLowerCase() === 'credited to fund')
                       .reduce((s, l) => s + (Number(l.estimated_credit)||0), 0),
    };
  }, [logs]);

  // Filter
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return logs.filter(l => {
      if (q && !l.resident_name?.toLowerCase().includes(q) && !l.resident_email?.toLowerCase().includes(q) && !l.lrn?.includes(q) && !l.receipt_no?.includes(q)) return false;
      if (status !== 'All') {
        const rowStatus = (l.encoded_status || l.status || 'Verified').toLowerCase();
        if (rowStatus !== status.toLowerCase()) return false;
      }
      if (alloc !== 'All') {
        const rowAlloc = (l.contribution_type || l.scholarship_allocation || '').toLowerCase();
        if (!rowAlloc.includes(alloc.toLowerCase().split(' ')[0])) return false;
      }
      if (dateFrom && new Date(l.created_at) < new Date(dateFrom)) return false;
      if (dateTo   && new Date(l.created_at) > new Date(dateTo+'T23:59:59')) return false;
      return true;
    });
  }, [logs, search, status, alloc, dateFrom, dateTo]);

  useEffect(() => { setPage(1); }, [search, status, alloc, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  const inputCls = `px-3 py-2 rounded-xl border text-sm outline-none transition-all ${
    isLightMode ? 'bg-white border-[#DDE3DA] text-[#1A2418] placeholder:text-[#A8BCAA]'
                : 'bg-[#0F1512] border-white/[0.07] text-[#E8F0E5] placeholder:text-[#3D5042]'
  }`;

  // Export CSV
  const handleExport = () => {
    const cols = ['id','created_at','resident_name','resident_email','lrn','section','waste_type','weight_kg','points_earned','estimated_credit','contribution_type','classroom_section','beneficiary_name','encoded_status','officer_name','receipt_no'];
    const csv = [cols.join(','), ...filtered.map(r => cols.map(c => `"${String(r[c]??'').replace(/"/g,'""')}"`).join(','))].join('\n');
    const a = document.createElement('a');
    a.href     = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `accounting_records_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  return (
    <div className={`flex h-screen w-full font-sans ${t.bg} transition-colors duration-300 overflow-hidden`}>
      <Sidebar/>

      <div className="flex-1 h-full overflow-y-auto no-scrollbar">
        <div className="p-6 lg:p-10 max-w-[1800px] mx-auto">

          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start mb-8 gap-4">
            <div>
              <h2 className={`text-3xl font-bold ${t.textMain} tracking-tight`}>Accounting Records</h2>
              <p className={`${t.textMuted} mt-1 text-sm font-medium`}>WISHCRAFT Fund credit pipeline — track every submission from Verified to Credited</p>
            </div>
            <div className="flex gap-2">
              <button onClick={fetchLogs} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${t.accentText} ${isLightMode ? 'border-[#A8CFBA] bg-[#D8EDDF]' : 'border-[#52B788]/25 bg-[#52B788]/8'}`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                Refresh
              </button>
              <button onClick={handleExport} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${isLightMode ? 'border-[#DDE9F5] bg-[#DDE9F5] text-[#2A5FA8]' : 'border-[#4A9ECC]/25 bg-[#4A9ECC]/10 text-[#4A9ECC]'}`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                Export CSV
              </button>
            </div>
          </div>

          {/* Fund Pipeline summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-8">
            {[
              { label: 'Total Records',      value: summary.total,             color: t.iconBg1 },
              { label: 'Verified',           value: summary.verified,          color: isLightMode ? 'bg-emerald-50 text-emerald-700' : 'bg-emerald-500/10 text-emerald-400' },
              { label: 'Encoded',            value: summary.encoded,           color: isLightMode ? 'bg-blue-50 text-blue-700'       : 'bg-blue-500/10 text-blue-400' },
              { label: 'Credited to Fund',   value: summary.credited,          color: isLightMode ? 'bg-purple-50 text-purple-700'   : 'bg-purple-500/10 text-purple-400' },
              { label: 'Rejected',           value: summary.rejected,          color: isLightMode ? 'bg-red-50 text-red-700'         : 'bg-red-500/10 text-red-400' },
              { label: 'Total Fund Value',   value: peso(summary.totalFund),   color: t.iconBg1 },
              { label: 'Credited Amount',    value: peso(summary.fundCredited),color: isLightMode ? 'bg-purple-50 text-purple-700'   : 'bg-purple-500/10 text-purple-400' },
            ].map(s => (
              <ThemedCard key={s.label} className="!p-4 flex flex-col gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${s.color}`}>✓</div>
                <p className={`text-[9px] font-bold uppercase tracking-widest ${t.textMuted}`}>{s.label}</p>
                <p className={`text-lg font-bold ${t.textMain} leading-none`}>{s.value}</p>
              </ThemedCard>
            ))}
          </div>

          {/* Filters */}
          <div className={`rounded-2xl border p-4 mb-6 ${isLightMode ? 'bg-white border-[#E3E8E1]' : 'bg-[#131A16] border-white/[0.05]'}`}>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className={`block text-[10px] font-bold uppercase tracking-widest ${t.textMuted} mb-1.5`}>Search</label>
                <div className="relative">
                  <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${t.textMuted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                  <input className={`${inputCls} pl-8 w-full`} placeholder="Student name, email, LRN, receipt no..." value={search} onChange={e => setSearch(e.target.value)}/>
                </div>
              </div>
              <div className="min-w-[155px]">
                <label className={`block text-[10px] font-bold uppercase tracking-widest ${t.textMuted} mb-1.5`}>Fund Status</label>
                <select className={`${inputCls} cursor-pointer`} value={status} onChange={e => setStatus(e.target.value)}>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="min-w-[190px]">
                <label className={`block text-[10px] font-bold uppercase tracking-widest ${t.textMuted} mb-1.5`}>Contribution Type</label>
                <select className={`${inputCls} cursor-pointer`} value={alloc} onChange={e => setAlloc(e.target.value)}>
                  {ALLOCS.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-widest ${t.textMuted} mb-1.5`}>From</label>
                <input type="date" className={inputCls} value={dateFrom} onChange={e => setDateFrom(e.target.value)}/>
              </div>
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-widest ${t.textMuted} mb-1.5`}>To</label>
                <input type="date" className={inputCls} value={dateTo} onChange={e => setDateTo(e.target.value)}/>
              </div>
              {(search || status !== 'All' || alloc !== 'All' || dateFrom || dateTo) && (
                <button onClick={() => { setSearch(''); setStatus('All'); setAlloc('All'); setDateFrom(''); setDateTo(''); }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border ${isLightMode ? 'border-red-200 bg-red-50 text-red-600' : 'border-red-500/20 bg-red-500/8 text-red-400'}`}>
                  Clear
                </button>
              )}
            </div>
            <p className={`text-[11px] ${t.textMuted} mt-3`}>
              Showing <strong className={t.textMain}>{filtered.length}</strong> of <strong className={t.textMain}>{logs.length}</strong> records
            </p>
          </div>

          {/* Table */}
          <ThemedCard className="!p-0 overflow-hidden mb-6">
            <div className="overflow-x-auto" style={{ minHeight: 320 }}>
              {loading ? (
                <div className={`flex items-center justify-center h-64 text-sm font-bold tracking-widest animate-pulse ${t.accentText}`}>LOADING RECORDS...</div>
              ) : paginated.length === 0 ? (
                <div className={`flex items-center justify-center h-64 text-sm italic ${t.textMuted}`}>No records match your filters.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`text-[10px] uppercase tracking-widest border-b ${isLightMode ? 'bg-[#F9FBF9] border-[#F0F4F1]' : 'bg-[#0A0F0D] border-white/[0.04]'} ${t.textMuted}`}>
                      <th className="px-5 py-4 font-bold">Date</th>
                      <th className="px-4 py-4 font-bold">Student</th>
                      <th className="px-4 py-4 font-bold">Waste Type</th>
                      <th className="px-4 py-4 font-bold">Weight</th>
                      <th className="px-4 py-4 font-bold">Est. Fund Value</th>
                      <th className="px-4 py-4 font-bold">Allocation</th>
                      <th className="px-4 py-4 font-bold">Section</th>
                      <th className="px-4 py-4 font-bold">Fund Status</th>
                      {canEdit && <th className="px-5 py-4 font-bold text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {paginated.map(log => {
                      const curStatus = log.encoded_status || log.status || 'Verified';
                      const alloc     = log.contribution_type || log.scholarship_allocation || 'Individual';
                      return (
                        <tr key={log.id} className={`border-b cursor-pointer transition-colors ${isLightMode ? 'border-[#F0F4F1] hover:bg-[#F9FBF9]' : 'border-white/[0.03] hover:bg-white/[0.02]'}`}
                          onClick={() => setSelected(log)}>
                          <td className={`px-5 py-4 text-xs ${t.textMuted} whitespace-nowrap`}>{fmt(log.created_at)}</td>
                          <td className="px-4 py-4">
                            <p className={`font-semibold text-sm ${t.textMain}`}>{log.resident_name}</p>
                            <p className={`text-[11px] ${t.textMuted} mt-0.5`}>{log.lrn ? `LRN: ${log.lrn}` : log.resident_email}</p>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${isLightMode ? 'bg-[#EEF4EC] text-[#2D6A4F] border-[#A8CFBA]/30' : 'bg-[#52B788]/8 text-[#52B788] border-[#52B788]/20'}`}>
                              {log.waste_type}
                            </span>
                          </td>
                          <td className={`px-4 py-4 text-sm font-bold ${t.textMain}`}>{log.weight_kg} kg</td>
                          <td className={`px-4 py-4 text-sm font-bold ${t.accentText}`}>{peso(log.estimated_credit)}</td>
                          <td className="px-4 py-4">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${isLightMode ? 'bg-[#EEF4EC] text-[#2D6A4F]' : 'bg-[#52B788]/10 text-[#52B788]'}`}>
                              {(alloc||'').includes('Classroom') ? 'Classroom' : (alloc||'').includes('General') ? 'General Fund' : 'Individual'}
                            </span>
                          </td>
                          <td className={`px-4 py-4 text-xs ${t.textMuted}`}>{log.classroom_section || log.section || '—'}</td>
                          <td className="px-4 py-4">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${statusChip(curStatus, isLightMode)}`}>{curStatus}</span>
                          </td>
                          {canEdit && (
                            <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                              <button onClick={() => setSelected(log)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${isLightMode ? 'border-[#A8CFBA] text-[#2D6A4F] hover:bg-[#D8EDDF]' : 'border-[#52B788]/20 text-[#52B788] hover:bg-[#52B788]/10'}`}>
                                Update
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div className={`h-1 w-full bg-gradient-to-r from-transparent ${isLightMode ? 'via-[#98BAA3]/40' : 'via-[#2CD87D]/30'} to-transparent`}/>
          </ThemedCard>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mb-10">
              <p className={`text-xs ${t.textMuted}`}>Page {page} of {totalPages} · {filtered.length} records</p>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className={`px-3 py-1.5 rounded-lg text-xs font-bold border disabled:opacity-30 ${isLightMode ? 'border-[#E3E8E1] text-[#3D4E3A]' : 'border-white/[0.07] text-[#B0C5AA]'}`}>← Prev</button>
                <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages} className={`px-3 py-1.5 rounded-lg text-xs font-bold border disabled:opacity-30 ${isLightMode ? 'border-[#E3E8E1] text-[#3D4E3A]' : 'border-white/[0.07] text-[#B0C5AA]'}`}>Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <RecordModal
          record={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
          isLightMode={isLightMode}
          t={t}
          canEdit={canEdit}
        />
      )}

      <style dangerouslySetInnerHTML={{ __html: `.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}` }}/>
    </div>
  );
}

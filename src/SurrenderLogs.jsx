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

const dateInManila = (value) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
const shiftManilaDate = (dateString, days) => { const d = new Date(`${dateString}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };
const fmtKg = (value) => `${Number(value || 0).toLocaleString('en-PH', { maximumFractionDigits: 3 })} kg`;
const isEligibleStock = (r) => !r.waste_pickup_id && String(r.encoded_status || '').toLowerCase() !== 'rejected' && String(r.status || '').toLowerCase() !== 'rejected';

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
  const [pickups, setPickups] = useState([]);
  const [pickupError, setPickupError] = useState('');
  const [pickupModal, setPickupModal] = useState(false);
  const [showCollectionView, setShowCollectionView] = useState(false);
  const [collectorName, setCollectorName] = useState('');
  const [pickupNotes, setPickupNotes] = useState('');
  const [pickupDateFrom, setPickupDateFrom] = useState('');
  const [pickupDateTo, setPickupDateTo] = useState('');
  const [savingPickup, setSavingPickup] = useState(false);
  const [pickupConfirmed, setPickupConfirmed] = useState(false);
  const [collectionFilter, setCollectionFilter] = useState('All');
  const [overviewDateFrom, setOverviewDateFrom] = useState('');
  const [overviewDateTo, setOverviewDateTo] = useState('');
  const [overviewPreset, setOverviewPreset] = useState('all');

  const [search,         setSearch]         = useState('');
  const [wasteType,      setWasteType]      = useState('All');
  const [statusFilter,   setStatusFilter]   = useState('All');
  const [allocationFilter, setAllocationFilter] = useState('All');
  const [dateFrom,       setDateFrom]       = useState('');
  const [dateTo,         setDateTo]         = useState('');

  const PAGE_SIZE = 25;
  const [page, setPage] = useState(1);


  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      // Supabase defaults to a 1,000-row response; paginate for accurate stock totals.
      const rows = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase
          .from('surrender_logs').select('*')
          .order('created_at', { ascending: false }).order('id', { ascending: false })
          .range(from, from + 999);
        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < 1000) break;
      }
      setLogs(rows);
      const { data: batchRows, error: batchError } = await supabase
        .from('waste_pickups').select('*').order('collected_at', { ascending: false }).limit(100);
      if (batchError) {
        setPickupError('Pickup tracking is not initialized. Run supabase/20261106_waste_pickups.sql in your Supabase SQL Editor, then refresh. ' + batchError.message);
      } else {
        setPickups(batchRows || []);
        setPickupError('');
      }


    } catch (e) {
      console.error('fetchLogs error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleDelete = async (log, reason) => {
    if (log.waste_pickup_id) { alert('Collected logs must be retained for pickup audit history.'); return; }
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

  const handlePickup = async () => {
    if (savingPickup || !pickupConfirmed || !pickupDatesValid || !collectorName.trim() || !pickupRows.length) return;
    setSavingPickup(true);
    try {
      const { error } = await supabase.rpc('record_waste_pickup', {
        p_collector_name: collectorName.trim(),
        p_notes: pickupNotes.trim() || null,
        p_date_from: pickupDateFrom,
        p_date_to: pickupDateTo,
      });
      if (error) throw error;
      setPickupModal(false);
      setCollectorName('');
      setPickupNotes('');
      setPickupConfirmed(false);
      await fetchLogs();
      alert(`Waste pickup recorded for surrender dates ${pickupDateFrom} through ${pickupDateTo}. Only matching uncollected waste was marked collected.`);
    } catch (error) {
      alert('Unable to record pickup: ' + error.message);
    } finally {
      setSavingPickup(false);
    }
  };

  // Update status (accounting/admin action)
  const handleStatusUpdate = async (log, newStatus) => {
  console.log('Updating:', {
    id: log.id,
    newStatus,
  });

  try {
    const { data, error } = await supabase
      .from('surrender_logs')
      .update({
        encoded_status: newStatus,
      })
      .eq('id', log.id)
      .select('id, encoded_status');

    console.log('UPDATE RESULT:', data);
    console.log('UPDATE ERROR:', error);

    if (error) throw error;

    if (!data || data.length === 0) {
      throw new Error(
        'No row was updated. Check the surrender_logs RLS UPDATE policy.'
      );
    }

    setLogs(prev =>
      prev.map(item =>
        item.id === log.id
          ? { ...item, encoded_status: newStatus }
          : item
      )
    );

  } catch (e) {
    console.error('Status update error:', e);
    alert('Error updating status: ' + e.message);
  }
};

  const handleExport = () => {
    const cols = ['id', 'created_at', 'resident_name', 'resident_email', 'collector_email', 'waste_type', 'weight_kg', 'points_earned', 'estimated_credit', 'contribution_type', 'classroom_section', 'encoded_status', 'waste_collected_at', 'waste_pickup_id'];
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
    if (collectionFilter === 'Available' && !isEligibleStock(r)) return false;
    if (collectionFilter === 'Collected' && !r.waste_pickup_id) return false;
    if (allocationFilter !== 'All') {
      const at = String(r.contribution_type || r.scholarship_allocation || '');
      if (at !== allocationFilter) return false;
    }
    if (dateFrom && dateInManila(r.created_at) < dateFrom) return false;
    if (dateTo && dateInManila(r.created_at) > dateTo) return false;
    return true;
  });

  // Summary cards use the same date-filtered rows as the table.
  const summaryRows = logs.filter(r => {
    if (dateFrom && dateInManila(r.created_at) < dateFrom) return false;
    if (dateTo && dateInManila(r.created_at) > dateTo) return false;
    return true;
  });
  // Available stock is GLOBAL, never restricted to a date-filtered table view.
  const availableRows = logs.filter(isEligibleStock);
  const collectedRows = logs.filter(r => !!r.waste_pickup_id);
  const pickupDatesValid = !!pickupDateFrom && !!pickupDateTo && pickupDateFrom <= pickupDateTo && pickupDateTo <= dateInManila(Date.now());
  const pickupRows = pickupDatesValid ? availableRows.filter(r => {
    const day = dateInManila(r.created_at);
    return day >= pickupDateFrom && day <= pickupDateTo;
  }) : [];
  const groupWaste = (rows) => Object.entries(rows.reduce((acc, row) => {
    const name = (row.waste_type || 'Unspecified').trim() || 'Unspecified';
    if (!acc[name]) acc[name] = { kg: 0, count: 0 };
    acc[name].kg += Math.max(0, Number(row.weight_kg) || 0);
    acc[name].count++;
    return acc;
  }, {})).map(([type, values]) => ({ type, ...values })).sort((a, b) => b.kg - a.kg);
  const availableBreakdown = groupWaste(availableRows);
  const pickupBreakdown = groupWaste(pickupRows);
  const pickupKg = pickupBreakdown.reduce((total, group) => total + group.kg, 0);
  const availableKg = availableBreakdown.reduce((total, group) => total + group.kg, 0);
  const collectedKg = collectedRows.reduce((sum, r) => sum + Math.max(0, Number(r.weight_kg) || 0), 0);
  // Overview dates filter SURRENDER dates; collection times are shown separately.
  const overviewDatesValid = !overviewDateFrom || !overviewDateTo || overviewDateFrom <= overviewDateTo;
  const applyOverviewPreset = (preset) => {
    const today = dateInManila(Date.now());
    setOverviewPreset(preset);
    if (preset === 'today') { setOverviewDateFrom(today); setOverviewDateTo(today); }
    else if (preset === 'week') { setOverviewDateFrom(shiftManilaDate(today, -6)); setOverviewDateTo(today); }
    else if (preset === 'month') { setOverviewDateFrom(today.slice(0, 7) + '-01'); setOverviewDateTo(today); }
    else if (preset === 'all') { setOverviewDateFrom(''); setOverviewDateTo(''); }
  };
  const inOverviewDates = (row) => overviewDatesValid &&
    (!overviewDateFrom || dateInManila(row.created_at) >= overviewDateFrom) &&
    (!overviewDateTo || dateInManila(row.created_at) <= overviewDateTo);
  const overviewAvailable = availableRows.filter(inOverviewDates);
  const overviewCollected = collectedRows.filter(inOverviewDates);
  const overviewAvailableBreakdown = groupWaste(overviewAvailable);
  const overviewAvailableKg = overviewAvailable.reduce((sum, row) => sum + Math.max(0, Number(row.weight_kg) || 0), 0);
  const overviewCollectedKg = overviewCollected.reduce((sum, row) => sum + Math.max(0, Number(row.weight_kg) || 0), 0);
  // A pickup can include records from multiple days; show it when at least one
  // collected surrender record falls within the overview's selected dates.
  const visiblePickupIds = new Set(overviewCollected.map(row => row.waste_pickup_id));
  const overviewPickups = pickups.filter(batch => visiblePickupIds.has(batch.id));
  const overviewDateLabel = overviewDateFrom && overviewDateTo
    ? `${overviewDateFrom} to ${overviewDateTo}`
    : overviewDateFrom ? `From ${overviewDateFrom}`
    : overviewDateTo ? `Through ${overviewDateTo}` : 'All surrender dates';
  const pickupSurrenderRanges = new Map();
  for (const row of collectedRows) {
    const pickupId = row.waste_pickup_id;
    const day = dateInManila(row.created_at);
    const range = pickupSurrenderRanges.get(pickupId);
    if (!range) pickupSurrenderRanges.set(pickupId, { from: day, to: day });
    else {
      if (day < range.from) range.from = day;
      if (day > range.to) range.to = day;
    }
  }

  const stats = {
    total: summaryRows.length,
    totalKg: summaryRows.reduce((sum, r) => sum + (Number(r.weight_kg) || 0), 0).toFixed(1),
    uniqueStudents: new Set(summaryRows.map(r => r.resident_email).filter(Boolean)).size,
    estimatedFundValue: summaryRows.filter(r => String(r.encoded_status || r.status || '').toLowerCase() !== 'rejected').reduce((sum, r) => sum + (Number(r.estimated_credit) || 0), 0),
    creditedToFund: summaryRows.filter(r => String(r.encoded_status || r.status || '').toLowerCase() === 'credited to fund').reduce((sum, r) => sum + (Number(r.estimated_credit) || 0), 0),
    flagged: summaryRows.filter(r => Number(r.weight_kg) > 50).length,
  };

  useEffect(() => { setPage(1); }, [search, wasteType, statusFilter, allocationFilter, collectionFilter, dateFrom, dateTo]);

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
    <div className={`flex h-[100dvh] w-full font-sans ${t.bg} transition-colors duration-300 overflow-hidden selection:bg-[#2CD87D] selection:text-black`}>
      <Sidebar />

      <div className="flex-1 min-w-0 h-full overflow-y-auto no-scrollbar pt-16 md:pt-0">
        <div className="p-4 sm:p-6 lg:p-10 max-w-[1700px] mx-auto">

          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start mb-8 gap-4">
            <div>
              <h2 className={`text-2xl sm:text-3xl font-bold ${t.textMain} tracking-tight`}>Surrender Logs</h2>
              <p className={`${t.textMuted} mt-1 text-sm font-medium`}>{showCollectionView ? "Collection totals, waste breakdown, and pickup history" : "Full WISHCRAFT Fund contribution audit trail"}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={fetchLogs} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${t.accentText} ${isLightMode ? 'border-[#A8CFBA] bg-[#D8EDDF] hover:bg-[#C4E0CF]' : 'border-[#52B788]/25 bg-[#52B788]/8 hover:bg-[#52B788]/15'}`}>
                Refresh
              </button>
              <button type="button" onClick={() => setShowCollectionView(prev => !prev)}
                aria-pressed={showCollectionView}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${showCollectionView ? 'bg-emerald-600 text-white border-emerald-600' : isLightMode ? 'bg-white border-[#A8CFBA] text-[#2D6A4F] hover:bg-[#D8EDDF]' : 'bg-[#52B788]/10 border-[#52B788]/30 text-[#52B788] hover:bg-[#52B788]/20'}`}>
                {showCollectionView ? '← Back to Surrender Logs' : 'Garbage Collection View'}
              </button>
              <button disabled={!!pickupError || loading || !availableRows.length} onClick={() => { setPickupDateFrom(overviewDateFrom || ''); setPickupDateTo(overviewDateTo || dateInManila(Date.now())); setPickupConfirmed(false); setPickupModal(true); }}
                className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed">
                Mark Waste as Collected
              </button>
              <button onClick={handleExport} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${isLightMode ? 'border-[#DDE9F5] bg-[#DDE9F5] text-[#2A5FA8] hover:bg-[#C8DCF0]' : 'border-[#4A9ECC]/25 bg-[#4A9ECC]/10 text-[#4A9ECC] hover:bg-[#4A9ECC]/20'}`}>
                Export CSV
              </button>
            </div>
          </div>

          {!showCollectionView && (<>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Stat label="Total Submissions" value={stats.total.toLocaleString()} sub="Selected dates" iconBg={t.iconBg1} t={t}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>}
            />
            <Stat label="Total KG Contributed" value={`${Number(stats.totalKg).toLocaleString()} kg`} sub="Selected dates" iconBg={t.iconBg2} t={t}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"/></svg>}
            />
            <Stat label="Estimated Fund Value" value={fmtPeso(stats.estimatedFundValue)} sub="Pending credit" iconBg={t.iconBg1} t={t}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 10v2m8-6a8 8 0 11-16 0 8 8 0 0116 0z"/></svg>}
            />
            <Stat label="Credited to Fund" value={fmtPeso(stats.creditedToFund)} sub="Confirmed" iconBg={isLightMode ? 'bg-purple-50 text-purple-600' : 'bg-purple-500/10 text-purple-400'} t={t}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
            />
          </div>

          </>)}

          {showCollectionView && (<>
          {/* Dedicated Garbage Collection view — opened from the header button. */}
          <div className={`rounded-2xl border p-5 mb-6 ${isLightMode ? 'bg-white border-[#E3E8E1]' : 'bg-[#131A16] border-white/[0.07]'}`}>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <h3 className={`font-bold text-lg ${t.textMain}`}>Garbage Collection Overview</h3>
                <p className={`text-xs ${t.textMuted}`}>Select surrender dates to view the waste stored or collected during that period. Collection dates are shown in Pickup History.</p>
              </div>
              <span className="text-[11px] font-semibold rounded-lg px-3 py-2 bg-emerald-500/10 text-emerald-600">{overviewAvailable.length} uncollected submissions</span>
            </div>
            <div className={`rounded-xl p-3 mb-4 ${isLightMode ? 'bg-gray-50' : 'bg-white/5'}`}>
              <p className={`text-xs font-semibold mb-2 ${t.textMuted}`}>Filter overview by surrender date (does not change the logs table below)</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {[['all', 'All Dates'], ['today', 'Today'], ['week', 'Last 7 Days'], ['month', 'This Month'], ['custom', 'Custom']].map(([key, label]) => (
                  <button type="button" key={key} onClick={() => applyOverviewPreset(key)}
                    className={`rounded-lg px-3 py-2 text-xs font-bold border ${overviewPreset === key ? 'bg-emerald-600 text-white border-emerald-600' : isLightMode ? 'bg-white border-gray-200 text-gray-700' : 'bg-white/5 border-white/10 text-white/80'}`}>
                    {label}
                  </button>
                ))}
              </div>
              {overviewPreset === 'custom' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={`block text-xs font-semibold mb-1 ${t.textMuted}`}>Surrender Date From</label><input type="date" className={`${inputCls} w-full`} value={overviewDateFrom} onChange={e => setOverviewDateFrom(e.target.value)} /></div>
                <div><label className={`block text-xs font-semibold mb-1 ${t.textMuted}`}>Surrender Date To</label><input type="date" className={`${inputCls} w-full`} value={overviewDateTo} onChange={e => setOverviewDateTo(e.target.value)} /></div>
              </div>}
              <p className={`text-xs mt-2 ${!overviewDatesValid ? 'text-red-500' : t.textMuted}`}>
                {!overviewDatesValid ? 'Start date must be on or before end date.' : `Showing surrender dates: ${overviewDateLabel} (Philippine time)`}
              </p>
            </div>
            {pickupError && <div role="alert" className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-3 text-xs text-amber-600 mb-4">{pickupError}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              <div className={`rounded-xl p-4 ${isLightMode ? 'bg-emerald-50' : 'bg-emerald-500/10'}`}><p className={`text-xs ${t.textMuted}`}>Available for Pickup</p><p className={`text-2xl font-extrabold ${t.textMain}`}>{fmtKg(overviewAvailableKg)}</p><p className={`text-[10px] mt-1 ${t.textMuted}`}>{overviewDateLabel}</p></div>
              <div className={`rounded-xl p-4 ${isLightMode ? 'bg-blue-50' : 'bg-blue-500/10'}`}><p className={`text-xs ${t.textMuted}`}>Already Collected</p><p className={`text-2xl font-extrabold ${t.textMain}`}>{fmtKg(overviewCollectedKg)}</p><p className={`text-[10px] mt-1 ${t.textMuted}`}>{overviewDateLabel}</p></div>
              <div className={`rounded-xl p-4 ${isLightMode ? 'bg-gray-100' : 'bg-white/5'}`}><p className={`text-xs ${t.textMuted}`}>Recorded Pickups</p><p className={`text-2xl font-extrabold ${t.textMain}`}>{overviewPickups.length}</p><p className={`text-[10px] mt-1 ${t.textMuted}`}>Matching surrender dates · latest 100 records</p></div>
            </div>
            <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 ${t.textMuted}`}>Available Waste by Type <span className="normal-case font-normal">({overviewDateLabel})</span></h4>
            {overviewAvailableBreakdown.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {overviewAvailableBreakdown.map(item => <div key={item.type} className={`p-3 rounded-xl border ${isLightMode ? 'border-[#E3E8E1]' : 'border-white/10'}`}>
                  <p className={`text-xs ${t.textMuted}`}>{item.type}</p>
                  <p className={`font-bold ${t.textMain}`}>{fmtKg(item.kg)}</p>
                  <p className={`text-[10px] ${t.textMuted}`}>{item.count} logs</p>
                </div>)}
              </div>
            ) : <p className={`text-xs ${t.textMuted}`}>No uncollected waste. New accepted surrender logs will appear here.</p>}
          </div>

          <div className={`rounded-2xl border p-5 mb-6 ${isLightMode ? 'bg-white border-[#E3E8E1]' : 'bg-[#131A16] border-white/[0.07]'}`}>
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className={`font-bold ${t.textMain}`}>Pickup History</h3>
              <span className={`text-xs ${t.textMuted}`}>Latest 100 pickups · filtered by overview surrender dates</span>
            </div>
            {!overviewPickups.length ? <p className={`text-xs ${t.textMuted}`}>No pickups match the selected surrender dates.</p> : (
              <div className="max-h-72 overflow-y-auto space-y-2">
                {overviewPickups.map(batch => (
                  <details key={batch.id} className={`rounded-xl border p-3 ${isLightMode ? 'border-[#E3E8E1]' : 'border-white/10'}`}>
                    <summary className={`cursor-pointer flex flex-wrap justify-between gap-2 text-sm font-semibold ${t.textMain}`}>
                      <span>Collected on {fmtFull(batch.collected_at)} · {batch.collector_name}</span>
                      <span>{fmtKg(batch.total_kg)} · {batch.item_count} logs</span>
                    </summary>
                    <div className={`mt-3 text-xs ${t.textMuted}`}>
                      <p className="font-semibold mb-2">Surrender dates covered: {pickupSurrenderRanges.has(batch.id) ? (() => { const range = pickupSurrenderRanges.get(batch.id); return range.from === range.to ? range.from : `${range.from} to ${range.to}`; })() : 'Not available'}</p>
                      {(Array.isArray(batch.type_breakdown) ? batch.type_breakdown : []).map(item => <p key={item.type}>{item.type}: {fmtKg(item.kg)} ({item.count} logs)</p>)}
                      {batch.notes && <p className="mt-2">Notes: {batch.notes}</p>}
                      <p className="mt-2 break-all">Pickup ID: {batch.id}</p>
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>

          </>)}

          {!showCollectionView && (<>
          {/* Filters */}
          <div className={`rounded-2xl border p-4 mb-6 ${isLightMode ? 'bg-white border-[#E3E8E1]' : 'bg-[#131A16] border-white/[0.05]'}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(170px,2.2fr)_minmax(110px,1fr)_minmax(130px,1.1fr)_minmax(170px,1.6fr)_minmax(115px,1fr)_minmax(145px,1.2fr)_minmax(145px,1.2fr)] gap-3 items-end">

              <div className="min-w-0">
                <label className={`block text-[10px] font-bold uppercase tracking-widest ${t.textMuted} mb-1.5`}>Search</label>
                <div className="relative">
                  <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${t.textMuted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                  <input className={`${inputCls} pl-8 w-full`} placeholder="Student name, email..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
              </div>

              <div className="min-w-0">
                <label className={`block text-[10px] font-bold uppercase tracking-widest ${t.textMuted} mb-1.5`}>Waste Type</label>
                <select className={`${inputCls} w-full min-w-0 cursor-pointer`} value={wasteType} onChange={e => setWasteType(e.target.value)}>
                  {WASTE_TYPES.map(w => <option key={w}>{w}</option>)}
                </select>
              </div>

              <div className="min-w-0">
                <label className={`block text-[10px] font-bold uppercase tracking-widest ${t.textMuted} mb-1.5`}>Fund Status</label>
                <select className={`${inputCls} w-full min-w-0 cursor-pointer`} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  {WISHCRAFT_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div className="min-w-0">
                <label className={`block text-[10px] font-bold uppercase tracking-widest ${t.textMuted} mb-1.5`}>Contribution Type</label>
                <select className={`${inputCls} w-full min-w-0 cursor-pointer`} value={allocationFilter} onChange={e => setAllocationFilter(e.target.value)}>
                  {ALLOCATION_TYPES.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>

              <div className="min-w-0">
                <label className={`block text-[10px] font-bold uppercase tracking-widest ${t.textMuted} mb-1.5`}>Collection</label>
                <select className={`${inputCls} w-full min-w-0`} value={collectionFilter} onChange={e => setCollectionFilter(e.target.value)}>
                  {['All', 'Available', 'Collected'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div className="min-w-0">
                <label className={`block text-[10px] font-bold uppercase tracking-widest ${t.textMuted} mb-1.5`}>From</label>
                <input type="date" className={`${inputCls} w-full min-w-0`} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>

              <div className="min-w-0">
                <label className={`block text-[10px] font-bold uppercase tracking-widest ${t.textMuted} mb-1.5`}>To</label>
                <input type="date" className={`${inputCls} w-full min-w-0`} value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>


            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className={`text-[11px] font-medium ${t.textMuted}`}>
              Showing <span className={`font-bold ${t.textMain}`}>{filtered.length.toLocaleString()}</span> of{' '}
              <span className={`font-bold ${t.textMain}`}>{logs.length.toLocaleString()}</span> total logs
            </p>
              {(search || wasteType !== 'All' || statusFilter !== 'All' || allocationFilter !== 'All' || collectionFilter !== 'All' || dateFrom || dateTo) && (
                <button onClick={() => { setSearch(''); setWasteType('All'); setStatusFilter('All'); setAllocationFilter('All'); setCollectionFilter('All'); setDateFrom(''); setDateTo(''); }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${isLightMode ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100' : 'border-red-500/20 bg-red-500/8 text-red-400 hover:bg-red-500/15'}`}>
                  Clear
                </button>
              )}
            </div>
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
                <table className="w-full min-w-[860px] text-left border-collapse">
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
                      <th className="px-4 py-4 font-bold">Collection Status</th>
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
                              <select
                                value={WISHCRAFT_STATUSES.includes(displayStatus) ? displayStatus : 'Verified'}
                                onChange={e => handleStatusUpdate(log, e.target.value)}
                                className={`text-[10px] rounded-lg border px-2 py-1 outline-none cursor-pointer ${inputCls} !py-1 !px-2`}
                                title="Update status"
                              >
                                {WISHCRAFT_STATUSES.filter(s => s !== 'All').map(s => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>

                          <td className="px-4 py-4 text-xs">
                            {log.waste_pickup_id ? <span className="text-blue-500 font-bold" title={`Pickup ID: ${log.waste_pickup_id}`}>Collected<br />{log.waste_collected_at ? fmtFull(log.waste_collected_at) : ''}</span> :
                              isEligibleStock(log) ? <span className="text-amber-500 font-bold">Available</span> : <span className={t.textMuted}>Excluded (Rejected)</span>}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => !log.waste_pickup_id && setLogToDelete(log)}
                              disabled={!!log.waste_pickup_id}
                              className={`p-1.5 rounded-lg transition-all disabled:opacity-25 disabled:cursor-not-allowed ${t.textMuted} hover:text-red-500 hover:bg-red-500/10`}
                              title={log.waste_pickup_id ? "Collected logs cannot be deleted" : "Delete this log"}
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
          </>)}
        </div>
      </div>

      {pickupModal && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/70 p-4" onClick={() => !savingPickup && setPickupModal(false)}>
          <div className={`w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl p-6 shadow-2xl ${isLightMode ? 'bg-white text-[#1A2418]' : 'bg-[#141A16] text-white'}`} onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold">Confirm Garbage Pickup</h3>
            <p className={`text-sm mt-2 mb-4 ${t.textMuted}`}>Step 1: Select dates, review all eligible submissions, then confirm. Choose the surrender date range of the waste actually picked up. Only uncollected, non-rejected submissions within these dates (Philippine time) will be marked collected. Fund status stays unchanged. Collection time is saved automatically.</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div><label className="block text-xs font-bold mb-1">Surrender Date From *</label><input type="date" max={dateInManila(Date.now())} className={`${inputCls} w-full`} value={pickupDateFrom} onChange={e => { setPickupDateFrom(e.target.value); setPickupConfirmed(false); }} /></div>
              <div><label className="block text-xs font-bold mb-1">Surrender Date To *</label><input type="date" max={dateInManila(Date.now())} className={`${inputCls} w-full`} value={pickupDateTo} onChange={e => { setPickupDateTo(e.target.value); setPickupConfirmed(false); }} /></div>
            </div>
            {!pickupDatesValid && <p className="text-xs text-amber-600 mb-3">Choose valid dates from oldest to newest, no later than today.</p>}
            <div className="rounded-xl bg-emerald-500/10 p-3 mb-4">
              <p className="font-bold">Selected pickup: {fmtKg(pickupKg)} · {pickupRows.length} submissions</p>
              <div className="text-xs mt-2 space-y-1">{pickupBreakdown.map(item => <p key={item.type}>{item.type}: {fmtKg(item.kg)}</p>)}</div>
              {pickupDatesValid && !pickupRows.length && <p className="text-xs mt-2">No available waste for these dates.</p>}
            </div>
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 mb-3 text-xs">
              <strong>Full pickup only:</strong> This action marks <strong>all {pickupRows.length} eligible submissions</strong> for these surrender dates as collected. If only some bags were picked up, do not confirm. Partial pickups are not supported in this version.
            </div>
            <label className="block text-xs font-bold mb-1">Step 2: Collector / Hauling Company *</label>
            <input maxLength={120} className={`${inputCls} w-full mb-3`} placeholder="Name of waste collector" value={collectorName} onChange={e => setCollectorName(e.target.value)} />
            <label className="block text-xs font-bold mb-1">Pickup Notes (optional)</label>
            <textarea maxLength={1000} className={`${inputCls} w-full mb-4`} rows={2} placeholder="Vehicle, receipt number, remarks..." value={pickupNotes} onChange={e => setPickupNotes(e.target.value)} />
            <label className="flex items-start gap-2 text-xs font-semibold mb-4 cursor-pointer">
              <input type="checkbox" className="mt-0.5 accent-emerald-600" checked={pickupConfirmed} onChange={e => setPickupConfirmed(e.target.checked)} disabled={!pickupDatesValid || !pickupRows.length || savingPickup} />
              <span>I verified the surrender dates, {pickupRows.length} records, and {fmtKg(pickupKg)} total. All selected waste was physically picked up.</span>
            </label>
            <div className="flex justify-end gap-2">
              <button disabled={savingPickup} onClick={() => setPickupModal(false)} className="px-4 py-2 rounded-xl border border-gray-400/30 text-sm">Cancel</button>
              <button disabled={savingPickup || !pickupConfirmed || !collectorName.trim() || !pickupDatesValid || !pickupRows.length} onClick={handlePickup} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-40">{savingPickup ? 'Saving...' : 'Step 3: Confirm Collection'}</button>
            </div>
          </div>
        </div>
      )}

      {logToDelete && (
        <DeleteModal log={logToDelete} onConfirm={handleDelete} onClose={() => setLogToDelete(null)} isLightMode={isLightMode} t={t} />
      )}

      <GuidePanel page="surrender_logs" />

      <style dangerouslySetInnerHTML={{ __html: `.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}` }} />
    </div>
  );
}
// Accounting.jsx — WISHCRAFT Fund accounting ledger
// Accessible by: super_admin, accounting

import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import { useTheme, ThemedCard } from './ThemeContext';
import { supabase } from './supabase';

const fmtPeso = (v) => `₱${Number(v || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
const fmtDate = (ds) => new Date(ds).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

export default function Accounting() {
  const { isLightMode, t } = useTheme();
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalEstimated: 0, totalCredited: 0, pending: 0 });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('surrender_logs')
      .select('id, created_at, resident_name, resident_email, waste_type, weight_kg, points_earned, estimated_credit, encoded_status, status, contribution_type, scholarship_allocation, classroom_section, receipt_no, wishcraft_fund_credited_at')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setLogs(data);
      const est     = data.filter(r => !String(r.encoded_status || r.status || '').toLowerCase().includes('rejected')).reduce((s, r) => s + (Number(r.estimated_credit) || 0), 0);
      const cred    = data.filter(r => String(r.encoded_status || r.status || '').toLowerCase() === 'credited to fund').reduce((s, r) => s + (Number(r.estimated_credit) || 0), 0);
      const pending = data.filter(r => ['verified', 'encoded'].includes(String(r.encoded_status || r.status || '').toLowerCase())).reduce((s, r) => s + (Number(r.estimated_credit) || 0), 0);
      setSummary({ totalEstimated: est, totalCredited: cred, pending });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const allocationShort = (val) => {
    const v = String(val || '');
    if (v.includes('Individual')) return 'Individual';
    if (v.includes('Classroom'))  return 'Classroom';
    if (v.includes('General'))    return 'General Fund';
    return '—';
  };

  return (
    <div className={`flex h-screen w-full font-sans ${t.bg} transition-colors duration-300 overflow-hidden`}>
      <Sidebar />
      <div className="flex-1 h-full overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
          <div className="mb-8">
            <h1 className={`text-3xl font-bold ${t.textMain} tracking-tight`}>Accounting Records</h1>
            <p className={`${t.textMuted} mt-1 text-sm`}>WISHCRAFT Fund ledger — Estimated Fund Value, Credited to Fund records</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <ThemedCard>
              <p className={`text-[11px] font-bold uppercase tracking-widest ${t.textMuted} mb-2`}>Total Estimated Fund Value</p>
              <p className={`text-3xl font-bold ${isLightMode ? 'text-[#2D6A4F]' : 'text-[#34D399]'}`}>{fmtPeso(summary.totalEstimated)}</p>
            </ThemedCard>
            <ThemedCard>
              <p className={`text-[11px] font-bold uppercase tracking-widest ${isLightMode ? 'text-purple-700' : 'text-purple-400'} mb-2`}>Credited to WISHCRAFT Fund</p>
              <p className={`text-3xl font-bold ${isLightMode ? 'text-purple-700' : 'text-purple-400'}`}>{fmtPeso(summary.totalCredited)}</p>
            </ThemedCard>
            <ThemedCard>
              <p className={`text-[11px] font-bold uppercase tracking-widest ${isLightMode ? 'text-amber-700' : 'text-amber-400'} mb-2`}>Pending Encoding / Crediting</p>
              <p className={`text-3xl font-bold ${isLightMode ? 'text-amber-700' : 'text-amber-400'}`}>{fmtPeso(summary.pending)}</p>
            </ThemedCard>
          </div>

          <ThemedCard className="!p-0 overflow-hidden">
            <div className="overflow-x-auto">
              {loading ? (
                <div className={`flex items-center justify-center h-40 text-sm font-bold tracking-widest animate-pulse ${t.accentText}`}>LOADING...</div>
              ) : (
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className={`text-[10px] uppercase tracking-widest border-b ${isLightMode ? 'bg-[#F9FBF9] border-[#F0F4F1]' : 'bg-[#0A0F0D] border-white/[0.04]'} ${t.textMuted}`}>
                      <th className="px-5 py-4 font-bold">Date</th>
                      <th className="px-4 py-4 font-bold">Student</th>
                      <th className="px-4 py-4 font-bold">Allocation Type</th>
                      <th className="px-4 py-4 font-bold">Classroom / Section</th>
                      <th className="px-4 py-4 font-bold">Est. Fund Value</th>
                      <th className="px-4 py-4 font-bold">Fund Status</th>
                      <th className="px-4 py-4 font-bold">Credited At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => (
                      <tr key={log.id} className={`border-b transition-colors ${isLightMode ? 'border-[#F0F4F1] hover:bg-[#F9FBF9]' : 'border-white/[0.03] hover:bg-white/[0.02]'}`}>
                        <td className={`px-5 py-3 text-xs ${t.textMuted}`}>{fmtDate(log.created_at)}</td>
                        <td className="px-4 py-3">
                          <p className={`font-semibold ${t.textMain}`}>{log.resident_name || '—'}</p>
                          <p className={`text-[11px] ${t.textMuted}`}>{log.resident_email}</p>
                        </td>
                        <td className={`px-4 py-3 text-xs ${t.textMuted}`}>{allocationShort(log.contribution_type || log.scholarship_allocation)}</td>
                        <td className={`px-4 py-3 text-xs ${t.textMuted}`}>{log.classroom_section || '—'}</td>
                        <td className={`px-4 py-3 font-bold ${isLightMode ? 'text-[#2D6A4F]' : 'text-[#34D399]'}`}>{fmtPeso(log.estimated_credit)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${
                            String(log.encoded_status || log.status || '').toLowerCase() === 'credited to fund'
                              ? (isLightMode ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-purple-500/10 text-purple-400 border-purple-500/20')
                              : String(log.encoded_status || log.status || '').toLowerCase() === 'encoded'
                              ? (isLightMode ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-blue-500/10 text-blue-400 border-blue-500/20')
                              : (isLightMode ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20')
                          }`}>
                            {log.encoded_status || log.status || 'Verified'}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-xs ${t.textMuted}`}>
                          {log.wishcraft_fund_credited_at ? fmtDate(log.wishcraft_fund_credited_at) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </ThemedCard>
        </div>
      </div>
    </div>
  );
}

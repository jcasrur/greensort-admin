// MRFReceiving.jsx — MRF Receiving Station
// Accessible by: super_admin, receiving_staff

import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import { useTheme, ThemedCard } from './ThemeContext';
import { supabase } from './supabase';
import GuidePanel from './GuidePanel';

export default function MRFReceiving() {
  const { isLightMode, t } = useTheme();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('surrender_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (!error) setLogs(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const fmtKg = (v) => `${Number(v || 0).toFixed(2)} kg`;
  const fmtDate = (ds) => new Date(ds).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  return (
    <div className={`flex h-screen w-full font-sans ${t.bg} transition-colors duration-300 overflow-hidden`}>
      <Sidebar />
      <div className="flex-1 h-full overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <h1 className={`text-3xl font-bold ${t.textMain} tracking-tight`}>MRF Receiving Station</h1>
              <p className={`${t.textMuted} mt-1 text-sm`}>Incoming material surrender records and QR scan log</p>
            </div>
            <button onClick={fetchLogs} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${t.accentText} ${isLightMode ? 'border-[#A8CFBA] bg-[#D8EDDF]' : 'border-[#52B788]/25 bg-[#52B788]/8'}`}>
              Refresh
            </button>
          </div>

          <ThemedCard className="!p-0 overflow-hidden">
            <div className="overflow-x-auto">
              {loading ? (
                <div className={`flex items-center justify-center h-40 text-sm font-bold tracking-widest animate-pulse ${t.accentText}`}>LOADING...</div>
              ) : (
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className={`text-[10px] uppercase tracking-widest border-b ${isLightMode ? 'bg-[#F9FBF9] border-[#F0F4F1]' : 'bg-[#0A0F0D] border-white/[0.04]'} ${t.textMuted}`}>
                      <th className="px-5 py-4 font-bold">Time Received</th>
                      <th className="px-4 py-4 font-bold">Student</th>
                      <th className="px-4 py-4 font-bold">Waste Type</th>
                      <th className="px-4 py-4 font-bold">Weight</th>
                      <th className="px-4 py-4 font-bold">Condition</th>
                      <th className="px-4 py-4 font-bold">Receipt #</th>
                      <th className="px-4 py-4 font-bold">Fund Status</th>
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
                        <td className={`px-4 py-3 text-sm ${t.textSub}`}>{log.waste_type || '—'}</td>
                        <td className={`px-4 py-3 font-bold ${t.textMain}`}>{fmtKg(log.weight_kg)}</td>
                        <td className={`px-4 py-3 text-xs ${t.textMuted}`}>{log.material_condition || '—'}</td>
                        <td className={`px-4 py-3 text-xs font-mono ${t.textMuted}`}>{log.receipt_no || log.transaction_id || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                            isLightMode ? 'bg-[#EEF4EC] text-[#2D6A4F] border-[#A8CFBA]/30' : 'bg-[#52B788]/8 text-[#52B788] border-[#52B788]/20'
                          }`}>
                            {log.encoded_status || log.status || 'Verified'}
                          </span>
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

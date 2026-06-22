import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Sidebar from './Sidebar';
import { supabase } from './supabase';
import { useTheme, ThemedCard } from './ThemeContext';

const fmtKg = (v) => `${Number(v || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 })} kg`;
const fmtPeso = (v) => `₱${Number(v || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtShortDate = (ds) => ds ? new Date(ds).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

const safeNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const statusChip = (value, light) => {
  const s = String(value || '').toLowerCase();
  if (s.includes('credited')) return light ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-purple-500/10 text-purple-400 border-purple-500/20';
  if (s.includes('encoded')) return light ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  if (s.includes('reject')) return light ? 'bg-red-50 text-red-600 border-red-200' : 'bg-red-500/10 text-red-400 border-red-500/20';
  return light ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
};

const Dashboard = () => {
  const { isLightMode, t } = useTheme();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalStudents: 0,
    totalAccounts: 0,
    activeCenters: 0,
    totalReceivedKg: 0,
    weekReceivedKg: 0,
    inventoryItems: 0,
    liveInventoryItems: 0,
    totalFundValue: 0,
    creditedFundValue: 0,
  });
  const [logs, setLogs] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [materialSegments, setMaterialSegments] = useState([]);
  const [activeIndex, setActiveIndex] = useState(null);
  const [maxY, setMaxY] = useState(100);

  const countRows = useCallback(async (table, applyFilter) => {
    try {
      let query = supabase.from(table).select('*', { count: 'exact', head: true });
      if (applyFilter) query = applyFilter(query);
      const { count, error } = await query;
      if (error) return 0;
      return count || 0;
    } catch (e) {
      console.warn(`Unable to count ${table}:`, e?.message || e);
      return 0;
    }
  }, []);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [studentCount, accountCount, centerCount] = await Promise.all([
        countRows('students'),
        countRows('profiles'),
        countRows('dropoff_applications', q => q.eq('status', 'approved')),
      ]);

      const [{ data: surrenderData, error: surrenderError }, { data: inventoryData, error: inventoryError }] = await Promise.all([
        supabase.from('surrender_logs').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('rewards_inventory').select('*').order('created_at', { ascending: false }).limit(500),
      ]);

      const cleanLogs = surrenderError ? [] : (surrenderData || []);
      const cleanInventory = inventoryError ? [] : (inventoryData || []);

      setLogs(cleanLogs.slice(0, 8));

      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);

      const totalReceivedKg = cleanLogs.reduce((sum, row) => sum + safeNumber(row.weight_kg), 0);
      const weekReceivedKg = cleanLogs
        .filter(row => row.created_at && new Date(row.created_at) >= weekStart)
        .reduce((sum, row) => sum + safeNumber(row.weight_kg), 0);

      const validFundRows = cleanLogs.filter(row => !String(row.encoded_status || row.status || '').toLowerCase().includes('reject'));
      const creditedRows = cleanLogs.filter(row => String(row.encoded_status || row.status || '').toLowerCase().includes('credited'));

      const totalFundValue = validFundRows.reduce((sum, row) => sum + safeNumber(row.estimated_credit), 0);
      const creditedFundValue = creditedRows.reduce((sum, row) => sum + safeNumber(row.estimated_credit), 0);

      setMetrics({
        totalStudents: studentCount,
        totalAccounts: accountCount,
        activeCenters: centerCount,
        totalReceivedKg,
        weekReceivedKg,
        inventoryItems: cleanInventory.length,
        liveInventoryItems: cleanInventory.filter(item => item.is_available !== false).length,
        totalFundValue,
        creditedFundValue,
      });

      const weekData = [];
      for (let i = 6; i >= 0; i -= 1) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const key = d.toLocaleDateString('en-CA');
        weekData.push({
          key,
          dateStr: d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }),
          day: d.toLocaleDateString('en-PH', { weekday: 'short' }),
          actual: 0,
        });
      }

      cleanLogs.forEach(row => {
        if (!row.created_at) return;
        const key = new Date(row.created_at).toLocaleDateString('en-CA');
        const target = weekData.find(d => d.key === key);
        if (target) target.actual += safeNumber(row.weight_kg);
      });

      weekData.forEach(d => { d.actual = Number(d.actual.toFixed(2)); });
      const maxActual = Math.max(...weekData.map(d => d.actual), 1);
      setMaxY(Math.ceil(maxActual * 1.25));
      setChartData(weekData);

      const materialMap = cleanLogs.reduce((acc, row) => {
        const label = row.waste_type || row.category || 'Uncategorized';
        acc[label] = (acc[label] || 0) + safeNumber(row.weight_kg || 1);
        return acc;
      }, {});

      const totalMaterial = Object.values(materialMap).reduce((sum, n) => sum + n, 0);
      const colors = [t.accentHex, isLightMode ? '#74C69D' : '#52B788', isLightMode ? '#B7DFCA' : '#2D6A4F', isLightMode ? '#95D5B2' : '#40916C'];
      const segments = Object.entries(materialMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([label, value], index) => ({
          label,
          value,
          pct: totalMaterial ? `${Math.round((value / totalMaterial) * 100)}%` : '0%',
          color: colors[index % colors.length],
        }));
      setMaterialSegments(segments);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setLogs([]);
      setMaterialSegments([]);
    } finally {
      setLoading(false);
    }
  }, [countRows, isLightMode, t.accentHex]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const getCoords = (key) => chartData.map((d, i) => ({
    x: chartData.length <= 1 ? 0 : (i / (chartData.length - 1)) * 100,
    y: 100 - (d[key] / maxY) * 100,
  }));

  const smoothPath = (pts) => {
    if (!pts.length) return '';
    let path = `M ${pts[0].x} ${pts[0].y} `;
    for (let i = 1; i < pts.length; i += 1) {
      const cx = (pts[i - 1].x + pts[i].x) / 2;
      path += `C ${cx} ${pts[i - 1].y}, ${cx} ${pts[i].y}, ${pts[i].x} ${pts[i].y} `;
    }
    return path;
  };

  const coords = chartData.length > 0 ? getCoords('actual') : [];
  const linePath = smoothPath(coords);
  const areaPath = coords.length > 0 ? `${linePath} L 100 100 L 0 100 Z` : '';
  const accentHex = t.accentHex;

  const donutGradient = useMemo(() => {
    if (!materialSegments.length) return isLightMode
      ? 'conic-gradient(#D8EDDF 0% 100%)'
      : 'conic-gradient(#1C2C1C 0% 100%)';

    let cursor = 0;
    const total = materialSegments.reduce((sum, item) => sum + item.value, 0) || 1;
    return `conic-gradient(${materialSegments.map(item => {
      const start = cursor;
      const end = cursor + (item.value / total) * 100;
      cursor = end;
      return `${item.color} ${start}% ${end}%`;
    }).join(', ')})`;
  }, [isLightMode, materialSegments]);

  const statCards = [
    {
      label: 'Students Record',
      value: metrics.totalStudents || metrics.totalAccounts,
      sub: `${metrics.totalAccounts} account${metrics.totalAccounts === 1 ? '' : 's'} registered`,
      iconBg: t.iconBg1,
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 14l9-5-9-5-9 5 9 5z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/></svg>,
    },
    {
      label: 'MRF Received',
      value: fmtKg(metrics.weekReceivedKg),
      sub: `${fmtKg(metrics.totalReceivedKg)} all-time`,
      iconBg: t.iconBg2,
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>,
    },
    {
      label: 'Available Waste Inventory',
      value: metrics.inventoryItems,
      sub: `${metrics.liveInventoryItems} material${metrics.liveInventoryItems === 1 ? '' : 's'} visible on mobile`,
      iconBg: t.iconBg3,
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 7h18M5 7l1 12h12l1-12M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2"/></svg>,
    },
    {
      label: 'WISHCRAFT Fund',
      value: fmtPeso(metrics.totalFundValue),
      sub: `${fmtPeso(metrics.creditedFundValue)} credited to fund`,
      iconBg: t.iconBg1,
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 10v2m8-6a8 8 0 11-16 0 8 8 0 0116 0z"/></svg>,
    },
  ];

  const quickModules = [
    { title: 'MRF Receiving', body: 'Tracks QR surrender records, waste type, weight, receipt number, and fund status.', count: `${logs.length} recent`, accent: t.accentText },
    { title: 'Inventory Storage', body: 'Monitors accepted recyclable materials that appear in the mobile surrender flow.', count: `${metrics.inventoryItems} items`, accent: isLightMode ? 'text-[#E65100]' : 'text-[#FFB74D]' },
    { title: 'Student Records', body: 'Keeps school-based student information, sections, account status, and contribution history.', count: `${metrics.totalStudents || metrics.totalAccounts} users`, accent: isLightMode ? 'text-[#1976D2]' : 'text-[#64B5F6]' },
    { title: 'Accounting', body: 'Reviews estimated fund value and confirms records credited to the WISHCRAFT fund.', count: fmtPeso(metrics.creditedFundValue), accent: isLightMode ? 'text-purple-700' : 'text-purple-400' },
  ];

  return (
    <div className={`flex h-screen w-full font-sans ${t.bg} transition-colors duration-300 overflow-hidden`}>
      <Sidebar />

      <div className="flex-1 h-full overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
          <div className="mb-8 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-3 ${t.chipBg} ${t.accentText}`}>
                WishCraft Admin Dashboard
              </div>
              <h1 className={`text-3xl font-bold ${t.textMain} tracking-tight`}>WishCraft Overview</h1>
              <p className={`${t.textMuted} mt-1 text-sm max-w-2xl`}>
                School-based recycling overview for MRF receiving, inventory storage, student records, accounting, and WISHCRAFT fund monitoring.
              </p>
            </div>
            <button
              onClick={fetchDashboard}
              disabled={loading}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all disabled:opacity-60 ${t.accentText} ${isLightMode ? 'border-[#A8CFBA] bg-[#D8EDDF] hover:bg-[#C9E4D3]' : 'border-[#52B788]/25 bg-[#52B788]/8 hover:bg-[#52B788]/12'}`}
            >
              <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              Refresh Overview
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            {statCards.map(card => (
              <ThemedCard key={card.label} className="flex flex-col gap-4 min-h-[154px]">
                <div className="flex items-center justify-between gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.iconBg}`}>{card.icon}</div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${isLightMode ? 'bg-[#F7F9F6] border-[#E8F0E9] text-[#5A7A5A]' : 'bg-white/[0.03] border-white/[0.06] text-[#A8BDA2]'}`}>
                    Live
                  </span>
                </div>
                <div className="min-w-0">
                  <p className={`text-[11px] font-bold uppercase tracking-widest ${t.textMuted} mb-1.5`}>{card.label}</p>
                  <p className={`text-2xl xl:text-[26px] font-bold ${t.textMain} leading-tight truncate`}>{loading ? '...' : card.value}</p>
                  <p className={`text-[11px] ${t.textMuted} mt-1 truncate`}>{card.sub}</p>
                </div>
              </ThemedCard>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
            <ThemedCard>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className={`text-sm font-bold ${t.textMain}`}>Material Breakdown</h3>
                  <p className={`text-[11px] ${t.textMuted} mt-0.5`}>Based on recorded surrendered waste</p>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${t.chipBg} ${t.accentText}`}>All Logs</span>
              </div>
              <div className="flex items-center gap-5">
                <div className="relative w-28 h-28 flex-shrink-0">
                  <div className="w-full h-full rounded-full" style={{ background: donutGradient }}>
                    <div className={`absolute inset-[23%] ${t.donutInner} rounded-full flex flex-col items-center justify-center border ${isLightMode ? 'border-[#E3E8E1]' : 'border-white/[0.05]'}`}>
                      <p className={`text-base font-bold ${t.textMain}`}>{materialSegments.length || 0}</p>
                      <p className={`text-[9px] ${t.textMuted}`}>types</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 flex flex-col gap-2.5 min-w-0">
                  {materialSegments.length ? materialSegments.map(segment => (
                    <div key={segment.label} className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: segment.color }} />
                      <span className={`text-xs ${t.textMuted} truncate`}>{segment.label}</span>
                      <span className={`text-xs font-bold ${t.textMain} ml-auto`}>{segment.pct}</span>
                    </div>
                  )) : (
                    <p className={`text-xs ${t.textMuted}`}>No material data yet.</p>
                  )}
                </div>
              </div>
            </ThemedCard>

            <ThemedCard className="xl:col-span-2">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className={`text-sm font-bold ${t.textMain}`}>GreenSort Module Snapshot</h3>
                  <p className={`text-[11px] ${t.textMuted} mt-0.5`}>Same workflow as the main admin pages</p>
                </div>
                <span className={`text-[11px] ${t.textMuted}`}>School-based</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {quickModules.map(module => (
                  <div key={module.title} className={`p-4 rounded-2xl border transition-colors ${isLightMode ? 'bg-[#F7F9F6] border-[#E8F0E9] hover:bg-[#EFF4ED]' : 'bg-white/[0.025] border-white/[0.05] hover:bg-white/[0.045]'}`}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h4 className={`text-sm font-bold ${t.textMain}`}>{module.title}</h4>
                      <span className={`text-[11px] font-bold whitespace-nowrap ${module.accent}`}>{module.count}</span>
                    </div>
                    <p className={`text-[11px] leading-relaxed ${t.textMuted}`}>{module.body}</p>
                  </div>
                ))}
              </div>
            </ThemedCard>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <ThemedCard className="xl:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className={`text-sm font-bold ${t.textMain}`}>Collection Output</h3>
                  <p className={`text-[11px] ${t.textMuted} mt-0.5`}>Waste collected in kg for the last 7 days</p>
                </div>
                <span className={`text-[10px] font-bold px-3 py-1.5 rounded-xl border ${t.chipBg} ${isLightMode ? 'border-[#D8EDDF] text-[#1A2A1A]' : 'border-[#52B788]/15 text-white'}`}>This Week</span>
              </div>

              <div className="flex h-60 relative" onMouseLeave={() => setActiveIndex(null)}>
                <div className={`w-12 flex flex-col justify-between items-start pr-2 text-[10px] ${t.textMuted} pb-10 flex-shrink-0 font-medium`}>
                  {[1, 0.75, 0.5, 0.25, 0].map((v, i) => <span key={i}>{Math.round(maxY * v)}</span>)}
                </div>

                <div className="flex-1 flex flex-col min-w-0">
                  <div className="flex-1 relative">
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className={`border-b w-full h-0 ${isLightMode ? 'border-[#EDF0EB]' : 'border-white/[0.04]'}`} />
                      ))}
                    </div>

                    {chartData.length > 0 && (
                      <>
                        <div className="absolute inset-0 overflow-visible pointer-events-none">
                          <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                            <defs>
                              <linearGradient id="overviewAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={accentHex} stopOpacity={isLightMode ? '0.18' : '0.22'} />
                                <stop offset="100%" stopColor={accentHex} stopOpacity="0" />
                              </linearGradient>
                            </defs>
                            <path d={areaPath} fill="url(#overviewAreaGrad)" />
                            <path d={linePath} fill="none" stroke={accentHex} strokeWidth="2" vectorEffect="non-scaling-stroke" />
                          </svg>
                        </div>

                        {activeIndex !== null && coords[activeIndex] && (
                          <div className="absolute inset-0 pointer-events-none overflow-visible z-20">
                            <div className={`absolute border-l border-dashed ${isLightMode ? 'border-[#2D6A4F]/20' : 'border-[#52B788]/15'}`} style={{ left: `${coords[activeIndex].x}%`, top: `${coords[activeIndex].y}%`, bottom: 0 }} />
                            <div className="absolute w-2.5 h-2.5 rounded-full border-2 border-white shadow" style={{ background: accentHex, left: `${coords[activeIndex].x}%`, top: `${coords[activeIndex].y}%`, transform: 'translate(-50%,-50%)' }} />
                            <div className={`absolute rounded-xl px-3 py-2 z-30 min-w-[120px] border ${t.tooltipBg}`} style={{ left: `${coords[activeIndex].x}%`, top: `${coords[activeIndex].y}%`, transform: `translate(${activeIndex > 3 ? '-110%' : '12%'}, -75%)` }}>
                              <p className={`text-[10px] ${t.textMuted} mb-0.5`}>{chartData[activeIndex].dateStr}</p>
                              <p className={`text-base font-bold ${t.textMain}`}>{fmtKg(chartData[activeIndex].actual)}</p>
                            </div>
                          </div>
                        )}

                        <div className="absolute inset-0 flex z-10">
                          {chartData.map((_, i) => <div key={i} className="flex-1 h-full cursor-crosshair" onMouseEnter={() => setActiveIndex(i)} />)}
                        </div>
                      </>
                    )}
                  </div>

                  <div className={`h-8 mt-2 text-[11px] ${t.textMuted} relative`}>
                    {chartData.map((d, i) => (
                      <span key={d.key} className={`absolute transform -translate-x-1/2 transition-colors font-medium ${activeIndex === i ? `${t.textMain} font-semibold` : ''}`} style={{ left: `${chartData.length <= 1 ? 0 : (i / (chartData.length - 1)) * 100}%` }}>
                        {d.day}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </ThemedCard>

            <ThemedCard className="!p-0 overflow-hidden">
              <div className={`p-5 border-b ${isLightMode ? 'border-[#E8F0E9]' : 'border-white/[0.05]'}`}>
                <h3 className={`text-sm font-bold ${t.textMain}`}>Recent MRF Activity</h3>
                <p className={`text-[11px] ${t.textMuted} mt-0.5`}>Latest surrender logs from GreenSort</p>
              </div>
              <div className="divide-y divide-black/0">
                {logs.length ? logs.slice(0, 6).map(row => {
                  const status = row.encoded_status || row.status || 'Verified';
                  return (
                    <div key={row.id || row.receipt_no || row.created_at} className={`p-4 border-b last:border-b-0 ${isLightMode ? 'border-[#F0F4F1] hover:bg-[#F9FBF9]' : 'border-white/[0.03] hover:bg-white/[0.02]'}`}>
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <div className="min-w-0">
                          <p className={`text-sm font-bold ${t.textMain} truncate`}>{row.resident_name || row.student_name || 'Unnamed Student'}</p>
                          <p className={`text-[11px] ${t.textMuted} truncate`}>{row.receipt_no || row.transaction_id || `Log #${row.id}`}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold border whitespace-nowrap ${statusChip(status, isLightMode)}`}>{status}</span>
                      </div>
                      <div className={`flex items-center justify-between text-[11px] ${t.textMuted}`}>
                        <span>{row.waste_type || 'Waste'} · {fmtKg(row.weight_kg)}</span>
                        <span>{fmtShortDate(row.created_at)}</span>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="p-6 text-center">
                    <p className={`text-sm font-semibold ${t.textMain}`}>No activity yet</p>
                    <p className={`text-xs ${t.textMuted} mt-1`}>MRF surrender logs will appear here once students submit recyclables.</p>
                  </div>
                )}
              </div>
            </ThemedCard>
          </div>

          <div className="h-12" />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
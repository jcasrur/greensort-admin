import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { supabase } from './supabase';
import { useTheme, ThemedCard } from './ThemeContext';

const Dashboard = () => {
  const { isLightMode, t } = useTheme();
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeCollectors, setActiveCollectors] = useState(0);
  const [topScanned, setTopScanned] = useState('Loading...');
  const [chartData, setChartData] = useState([]);
  const [activeIndex, setActiveIndex] = useState(null);
  const [maxY, setMaxY] = useState(100);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        if (usersCount !== null) setTotalUsers(usersCount);

        const { count: collectorsCount } = await supabase.from('dropoff_applications').select('*', { count: 'exact', head: true }).eq('status', 'approved');
        if (collectorsCount !== null) setActiveCollectors(collectorsCount);

        const { data: logs } = await supabase.from('surrender_logs').select('waste_type, weight_kg, created_at');

        if (logs && logs.length > 0) {
          const counts = {};
          let maxCount = 0; let topItem = 'None';
          logs.forEach(log => {
            const item = log.waste_type || 'Unknown';
            counts[item] = (counts[item] || 0) + 1;
            if (counts[item] > maxCount) { maxCount = counts[item]; topItem = item; }
          });
          setTopScanned(topItem);

          const today = new Date();
          const weekData = [];
          for (let i = 6; i >= 0; i--) {
            const d = new Date(today); d.setDate(today.getDate() - i);
            weekData.push({ dateStr: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }), day: d.toLocaleDateString('en-US', { weekday: 'short' }), actual: 0 });
          }
          logs.forEach(log => {
            const logDate = new Date(log.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
            const target = weekData.find(d => d.dateStr === logDate);
            if (target) target.actual += (Number(log.weight_kg) || 0);
          });
          if (weekData.every(d => d.actual === 0)) {
            [80,150,220,190,320,380,370].forEach((v,i) => { weekData[i].actual = v; });
          }
          weekData.forEach(d => { d.actual = Math.round(d.actual); });
          const maxActual = Math.max(...weekData.map(d => d.actual));
          setMaxY(maxActual * 1.2 || 100);
          setChartData(weekData);
        } else {
          setTopScanned('N/A');
        }
      } catch (err) { console.error(err); }
    };
    fetchMetrics();
  }, []);

  const getCoords = (key) => chartData.map((d, i) => ({ x: (i / (chartData.length - 1)) * 100, y: 100 - (d[key] / maxY) * 100 }));
  const smoothPath = (pts) => {
    if (!pts.length) return '';
    let p = `M ${pts[0].x} ${pts[0].y} `;
    for (let i = 1; i < pts.length; i++) {
      const cx = (pts[i-1].x + pts[i].x) / 2;
      p += `C ${cx} ${pts[i-1].y}, ${cx} ${pts[i].y}, ${pts[i].x} ${pts[i].y} `;
    }
    return p;
  };
  const coords = chartData.length > 0 ? getCoords('actual') : [];
  const linePath = smoothPath(coords);
  const areaPath = coords.length > 0 ? `${linePath} L 100 100 L 0 100 Z` : '';
  const accentHex = t.accentHex;

  const materialSegments = [
    { label: 'Plastic', pct: '50%', color: accentHex },
    { label: 'Glass',   pct: '35%', color: isLightMode ? '#74C69D' : '#74C69D' },
    { label: 'Paper',   pct: '15%', color: isLightMode ? '#B7DFCA' : '#2D6A4F' },
  ];

  const activity = [
    { title: 'Database Sync Completed', time: 'Today, 7:45 AM', status: 'Success', ok: true },
    { title: 'Waiting for applications', time: 'Today, 6:30 AM', status: 'Standby', ok: false },
  ];

  const statCards = [
    {
      label: 'Total Users', value: totalUsers, badge: '+12%',
      badgeClass: isLightMode ? 'bg-[#D8EDDF] text-[#2D6A4F]' : 'bg-[#52B788]/10 text-[#52B788]',
      iconBg: t.iconBg1,
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    },
    {
      label: 'Active Centers', value: activeCollectors, badge: 'Nodes',
      badgeClass: isLightMode ? 'bg-[#DDE9F5] text-[#2A5FA8]' : 'bg-[#4A9ECC]/10 text-[#4A9ECC]',
      iconBg: t.iconBg2,
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
    },
    {
      label: 'Top Scanned', value: topScanned, badge: '−2%',
      badgeClass: isLightMode ? 'bg-[#FAECE8] text-[#A0442A]' : 'bg-[#E87A5D]/10 text-[#E87A5D]',
      iconBg: t.iconBg3,
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
    },
  ];

  return (
    <div className={`flex h-screen w-full font-sans ${t.bg} transition-colors duration-300 overflow-hidden`}>
      <Sidebar />

      <div className="flex-1 h-full overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">

          {/* Header */}
          <div className="mb-8">
            <h1 className={`text-3xl font-bold ${t.textMain} tracking-tight`}>System Overview</h1>
            <p className={`${t.textMuted} mt-1 font-medium text-sm`}>Monitor your GreenSort network activity</p>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {statCards.map(c => (
              <ThemedCard key={c.label} className="flex flex-col gap-4 h-[148px]">
                <div className="flex items-center justify-between">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${c.iconBg}`}>{c.icon}</div>
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${c.badgeClass}`}>{c.badge}</span>
                </div>
                <div>
                  <p className={`text-[11px] font-semibold uppercase tracking-widest ${t.textMuted} mb-1.5`}>{c.label}</p>
                  <p className={`text-[30px] font-bold ${t.textMain} leading-none capitalize truncate`}>{c.value}</p>
                </div>
              </ThemedCard>
            ))}
          </div>

          {/* Middle Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">

            {/* Material Breakdown */}
            <ThemedCard>
              <div className="flex items-center justify-between mb-5">
                <h3 className={`text-sm font-semibold ${t.textMain}`}>Material Breakdown</h3>
                {/* INUPDATE DITO */}
                <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg ${t.chipBg} ${isLightMode ? 'text-black' : 'text-white'}`}>This Week</span>
              </div>
              <div className="flex items-center gap-5">
                <div className="relative w-24 h-24 flex-shrink-0">
                  <div className="w-full h-full rounded-full" style={{ background: t.donutGradient }}>
                    <div className={`absolute inset-[22%] ${t.donutInner} rounded-full flex items-center justify-center border ${isLightMode ? 'border-[#E3E8E1]' : 'border-white/[0.05]'}`}>
                      <p className={`text-xs font-bold ${t.textMain}`}>100%</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2.5">
                  {materialSegments.map(s => (
                    <div key={s.label} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }}></span>
                      <span className={`text-xs ${t.textMuted}`}>{s.label}</span>
                      <span className={`text-xs font-semibold ${t.textMain} ml-auto`}>{s.pct}</span>
                    </div>
                  ))}
                </div>
              </div>
            </ThemedCard>

            {/* Last Activity */}
            <ThemedCard className="lg:col-span-2">
              <div className="flex items-center justify-between mb-5">
                <h3 className={`text-sm font-semibold ${t.textMain}`}>Last Activity</h3>
                <span className={`text-[11px] ${t.textMuted}`}>Updated just now</span>
              </div>
              <div className="space-y-2.5">
                {activity.map((item, i) => (
                  <div key={i} className={`flex items-center gap-4 p-3.5 rounded-xl transition-colors ${isLightMode ? 'bg-[#F7F9F6] hover:bg-[#EFF4ED]' : 'bg-white/[0.025] hover:bg-white/[0.05]'}`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${item.ok ? t.iconBg1 : (isLightMode ? 'bg-[#F0F4EE] text-[#7A8C77]' : 'bg-white/[0.04] text-[#627A5C]')}`}>
                      {item.ok
                        ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${t.textMain}`}>{item.title}</p>
                      <p className={`text-[11px] ${t.textMuted} mt-0.5`}>{item.time}</p>
                    </div>
                    <span className={`text-xs font-semibold flex-shrink-0 ${item.ok ? t.accentText : t.textMuted}`}>{item.status}</span>
                  </div>
                ))}
              </div>
            </ThemedCard>
          </div>

          {/* Chart */}
          <ThemedCard>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className={`text-sm font-semibold ${t.textMain}`}>Collection Output</h3>
                <p className={`text-[11px] ${t.textMuted} mt-0.5`}>Waste collected in kg per day</p>
              </div>
              {/* INUPDATE DITO */}
              <span className={`text-[10px] font-semibold px-3 py-1.5 rounded-xl border ${t.chipBg} ${isLightMode ? 'border-[#D8EDDF] text-black' : 'border-[#52B788]/15 text-white'}`}>This Week</span>
            </div>

            <div className="flex h-56 relative" onMouseLeave={() => setActiveIndex(null)}>
              <div className={`w-12 flex flex-col justify-between items-start pr-2 text-[10px] ${t.textMuted} pb-10 flex-shrink-0 font-medium`}>
                {[1, 0.75, 0.5, 0.25, 0].map((v, i) => (
                  <span key={i}>{Math.round(maxY * v)}</span>
                ))}
              </div>

              <div className="flex-1 flex flex-col">
                <div className="flex-1 relative">
                  {/* Grid lines */}
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
                            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={accentHex} stopOpacity={isLightMode ? '0.18' : '0.22'} />
                              <stop offset="100%" stopColor={accentHex} stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          <path d={linePath} fill="none" stroke={accentHex} strokeWidth="2" vectorEffect="non-scaling-stroke" />
                          <path d={areaPath} fill="url(#areaGrad)" />
                        </svg>
                      </div>

                      {activeIndex !== null && (
                        <div className="absolute inset-0 pointer-events-none overflow-visible z-20">
                          <div className={`absolute border-l border-dashed ${isLightMode ? 'border-[#2D6A4F]/20' : 'border-[#52B788]/15'}`}
                            style={{ left: `${coords[activeIndex].x}%`, top: `${coords[activeIndex].y}%`, bottom: 0 }} />
                          <div className="absolute w-2.5 h-2.5 rounded-full border-2 border-white shadow"
                            style={{ background: accentHex, left: `${coords[activeIndex].x}%`, top: `${coords[activeIndex].y}%`, transform: 'translate(-50%,-50%)' }} />
                          <div className={`absolute rounded-xl px-3 py-2 z-30 min-w-[110px] border ${t.tooltipBg}`}
                            style={{ left: `${coords[activeIndex].x}%`, top: `${coords[activeIndex].y}%`, transform: `translate(${activeIndex > 3 ? '-110%' : '12%'}, -75%)` }}>
                            <p className={`text-[10px] ${t.textMuted} mb-0.5`}>{chartData[activeIndex].dateStr.split(',')[0]}</p>
                            <p className={`text-base font-bold ${t.textMain}`}>{chartData[activeIndex].actual} kg</p>
                          </div>
                        </div>
                      )}

                      <div className="absolute inset-0 flex z-10">
                        {chartData.map((_, i) => (
                          <div key={i} className="flex-1 h-full cursor-crosshair" onMouseEnter={() => setActiveIndex(i)} />
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className={`h-8 mt-2 text-[11px] ${t.textMuted} relative`}>
                  {chartData.map((d, i) => (
                    <span key={i}
                      className={`absolute transform -translate-x-1/2 transition-colors font-medium ${activeIndex === i ? `${t.textMain} font-semibold` : ''}`}
                      style={{ left: `${(i / (chartData.length - 1)) * 100}%` }}>
                      {d.day}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </ThemedCard>

          <div className="h-12" />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
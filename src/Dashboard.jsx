import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { supabase } from './supabase'; 
// 🟢 Inalis ang ThemeToggleButton sa import
import { useTheme, ThemedCard } from './ThemeContext'; 

const Dashboard = () => {
  const { isLightMode, t } = useTheme();

  const [totalUsers, setTotalUsers] = useState(0);
  const [activeCollectors, setActiveCollectors] = useState(0);
  const [topScanned, setTopScanned] = useState("Loading...");
  
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
          let maxCount = 0;
          let topItem = "None";
          
          logs.forEach(log => {
             const item = log.waste_type || 'Unknown';
             counts[item] = (counts[item] || 0) + 1;
             if (counts[item] > maxCount) {
                 maxCount = counts[item];
                 topItem = item;
             }
          });
          setTopScanned(topItem);

          const today = new Date();
          const weekData = [];
          
          for(let i=6; i>=0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            weekData.push({
              dateStr: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
              day: d.toLocaleDateString('en-US', { weekday: 'short' }),
              actual: 0
            });
          }

          logs.forEach(log => {
            const logDate = new Date(log.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
            const targetDay = weekData.find(d => d.dateStr === logDate);
            if (targetDay) {
               targetDay.actual += (Number(log.weight_kg) || 0);
            }
          });

          if (weekData.every(d => d.actual === 0)) {
             const dummy = [80, 150, 220, 190, 320, 380, 370];
             weekData.forEach((d, i) => { d.actual = dummy[i]; });
          }

          weekData.forEach(d => {
            d.actual = Math.round(d.actual);
          });

          const maxActual = Math.max(...weekData.map(d => d.actual));
          setMaxY(maxActual * 1.2 || 100); 

          setChartData(weekData);

        } else {
          setTopScanned("N/A"); 
        }
      } catch (error) {
        console.error("Error fetching metrics:", error);
      }
    };

    fetchMetrics();
  }, []);

  const getCoordinates = (dataKey) => {
    return chartData.map((d, i) => ({
      x: (i / (chartData.length - 1)) * 100,
      y: 100 - (d[dataKey] / maxY) * 100
    }));
  };

  const createSmoothPath = (coords) => {
    if (coords.length === 0) return "";
    let path = `M ${coords[0].x} ${coords[0].y} `;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const cx = (prev.x + curr.x) / 2;
      path += `C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y} `;
    }
    return path;
  };

  const actualCoords = chartData.length > 0 ? getCoordinates('actual') : [];
  const actualPath = createSmoothPath(actualCoords);
  const areaPath = actualCoords.length > 0 ? `${actualPath} L 100 100 L 0 100 Z` : "";

  return (
    <div className={`flex h-screen w-full font-sans ${t.bg} transition-colors duration-300 overflow-hidden`}>
      
      <Sidebar />
      {/* 🟢 Tinanggal ang <ThemeToggleButton /> dito */}

      <div className="flex-1 h-full overflow-y-auto relative z-10 no-scrollbar">
        <div className="p-6 lg:p-10 max-w-[1600px] mx-auto">
          
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
            <div>
              <h2 className={`text-3xl font-bold ${t.textMain} tracking-tight`}>System Overview</h2>
              <p className={`${t.textMuted} mt-1 font-medium text-sm`}>Explore information and activity about your system</p>
            </div>
          </div>

          {/* TOP STATS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <ThemedCard className="flex flex-col justify-between h-[160px]">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-full ${t.iconBg1}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  </div>
                  <p className={`text-[14px] font-semibold ${t.textMain}`}>Total Users</p>
                </div>
              </div>
              <div className="flex items-end gap-3">
                <p className={`text-[38px] font-bold ${t.textMain} leading-none`}>{totalUsers}</p>
                <div className={`${isLightMode ? 'bg-[#E4EFE8] text-[#4A7D5C]' : 'text-[#2CD87D]'} px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 mb-1`}>
                  12% ↗
                </div>
              </div>
            </ThemedCard>

            <ThemedCard className="flex flex-col justify-between h-[160px]">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-full ${t.iconBg2}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  </div>
                  <p className={`text-[14px] font-semibold ${t.textMain}`}>Active Centers</p>
                </div>
              </div>
              <div className="flex items-end gap-3">
                <p className={`text-[38px] font-bold ${t.textMain} leading-none`}>{activeCollectors}</p>
                <div className={`${isLightMode ? 'bg-[#F0F4F1]' : ''} ${t.textMuted} px-2.5 py-1 rounded-md text-[11px] font-bold mb-1`}>
                  Active Nodes
                </div>
              </div>
            </ThemedCard>

            <ThemedCard className="flex flex-col justify-between h-[160px]">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-full ${t.iconBg3}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                  </div>
                  <p className={`text-[14px] font-semibold ${t.textMain}`}>Top Scanned</p>
                </div>
              </div>
              <div className="flex items-end gap-3">
                <p className={`text-[32px] font-bold ${t.textMain} leading-none capitalize truncate`}>{topScanned}</p>
                <div className={`${isLightMode ? 'bg-[#FCEDF0] text-[#C45E65]' : 'text-[#F45B69]'} px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 mb-1`}>
                  -2% ↘
                </div>
              </div>
            </ThemedCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* MATERIAL BREAKDOWN */}
            <ThemedCard className="lg:col-span-1 flex flex-col">
              <div className="flex justify-between items-center mb-8">
                <h3 className={`text-[16px] font-bold ${t.textMain}`}>Material Breakdown</h3>
              </div>
              <div className="flex-1 flex flex-row items-center justify-between px-2">
                <div className="relative w-36 h-36">
                  <div className="w-full h-full rounded-full" style={{ background: t.donutGradient }}>
                    <div className={`absolute inset-[22%] ${t.donutInner} rounded-full flex items-center justify-center shadow-sm border border-white/[0.05]`}>
                        <div className="text-center">
                            <p className={`text-[18px] font-bold ${t.textMain}`}>100%</p>
                        </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-4 ml-6">
                  <div className="flex items-center gap-3"><span className={`w-3 h-3 rounded-full ${isLightMode ? 'bg-[#98BAA3]' : 'bg-[#2CD87D]'}`}></span><span className={`text-[12px] font-medium ${t.textMuted}`}>Plastic</span></div>
                  <div className="flex items-center gap-3"><span className={`w-3 h-3 rounded-full ${isLightMode ? 'bg-[#E3D6B7]' : 'bg-[#00964E]'}`}></span><span className={`text-[12px] font-medium ${t.textMuted}`}>Glass</span></div>
                  <div className="flex items-center gap-3"><span className={`w-3 h-3 rounded-full ${isLightMode ? 'bg-[#AAC2D2]' : 'bg-[#005F31]'}`}></span><span className={`text-[12px] font-medium ${t.textMuted}`}>Paper</span></div>
                  {isLightMode && <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-[#9BA5B6]"></span><span className="text-[12px] font-medium text-[#6B7A74]">Metal</span></div>}
                </div>
              </div>
            </ThemedCard>

            {/* LAST ACTIVITY */}
            <ThemedCard className="lg:col-span-2">
              <div className="flex justify-between items-center mb-6">
                <h3 className={`text-[16px] font-bold ${t.textMain}`}>Last Activity</h3>
                <span className={`text-[12px] ${t.textMuted} font-medium cursor-pointer`}>Updated just now</span>
              </div>
              <div className="space-y-2">
                <div className={`p-4 flex gap-4 items-center border-b ${isLightMode ? 'hover:bg-[#F9FBF9] border-[#F0F4F1]' : 'bg-[#192126] border-white/[0.05]'} transition-colors rounded-xl`}>
                  <div className={`w-12 h-12 rounded-full ${isLightMode ? 'bg-[#F0F4F1]' : 'bg-[#151B1F]'} flex justify-center items-center`}>
                    <svg className={`w-5 h-5 ${isLightMode ? 'text-[#98BAA3]' : 'text-[#2CD87D]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div className="flex-1">
                    <p className={`text-[14px] ${t.textMain} font-bold`}>Database Sync Completed</p>
                    <p className={`text-[12px] ${t.textMuted} mt-0.5`}>Today, 7:45 AM</p>
                  </div>
                  <span className={`${isLightMode ? 'text-[#98BAA3]' : 'text-[#2CD87D]'} font-bold text-[14px]`}>Success</span>
                </div>
                
                <div className={`p-4 flex gap-4 items-center ${isLightMode ? 'hover:bg-[#F9FBF9]' : 'bg-[#192126]'} transition-colors rounded-xl`}>
                  <div className={`w-12 h-12 rounded-full ${isLightMode ? 'bg-[#F0F4F1]' : 'bg-[#151B1F]'} flex justify-center items-center`}>
                    <svg className={`w-5 h-5 ${isLightMode ? 'text-[#AAC2D2]' : 'text-[#8A9B96]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div className="flex-1">
                    <p className={`text-[14px] ${t.textMain} font-bold`}>Waiting for applications</p>
                    <p className={`text-[12px] ${t.textMuted} mt-0.5`}>Today, 6:30 AM</p>
                  </div>
                  <span className={`${isLightMode ? 'text-[#AAC2D2]' : 'text-[#8A9B96]'} font-bold text-[14px]`}>Standby</span>
                </div>
              </div>
            </ThemedCard>
          </div>

          {/* COLLECTION OUTPUT CHART */}
          <ThemedCard className="mb-10 pb-6 relative">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center mb-8 gap-4">
              <h3 className={`text-[16px] font-bold ${t.textMain}`}>Collection Output</h3>
              <div className={`flex items-center gap-2 ${isLightMode ? 'bg-[#F5F8F6] border-[#E5ECE7]' : 'bg-[#151B1F] border-white/[0.1]'} border px-3 py-1.5 rounded-lg`}>
                  <span className={`text-[12px] ${t.textMuted} font-medium`}>This Week</span>
              </div>
            </div>

            <div className="flex h-80 relative" onMouseLeave={() => setActiveIndex(null)}>
              <div className={`w-[50px] flex flex-col justify-between items-start pr-4 text-[11px] ${t.textMuted} font-medium pb-[2.5rem]`}>
                  <span>{Math.round(maxY)}kg</span>
                  <span>{Math.round(maxY * 0.75)}kg</span>
                  <span>{Math.round(maxY * 0.5)}kg</span>
                  <span>{Math.round(maxY * 0.25)}kg</span>
                  <span>0kg</span>
              </div>

              <div className="flex-1 flex flex-col relative">
                <div className="flex-1 relative">
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className={`border-b w-full h-0 ${isLightMode ? 'border-[#DCE4DF] border-dashed' : 'border-white/[0.03] border-solid'}`}></div>
                    ))}
                  </div>

                  {chartData.length > 0 && (
                    <>
                      <div className="absolute inset-0 w-full h-full overflow-visible pointer-events-none mt-2">
                        <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                          <defs>
                            <linearGradient id="glowArea" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={isLightMode ? '#98BAA3' : '#2CD87D'} stopOpacity={isLightMode ? "0.4" : "0.35"}/>
                              <stop offset="100%" stopColor={isLightMode ? '#98BAA3' : '#2CD87D'} stopOpacity="0.0"/>
                            </linearGradient>
                          </defs>
                          <path d={actualPath} fill="none" stroke={isLightMode ? '#6C9A7D' : '#2CD87D'} strokeWidth="3" vectorEffect="non-scaling-stroke" style={isLightMode ? {} : { filter: `drop-shadow(0px 4px 8px rgba(44,216,125,0.4))` }} />
                          <path d={areaPath} fill="url(#glowArea)" />
                        </svg>
                      </div>

                      {activeIndex !== null && (
                        <div className="absolute inset-0 pointer-events-none overflow-visible z-20 mt-2">
                            <div className={`absolute border-l-[2px] ${isLightMode ? 'border-solid opacity-20' : 'border-dotted opacity-40'}`} style={{ left: `${actualCoords[activeIndex].x}%`, top: `${actualCoords[activeIndex].y}%`, bottom: '0', borderColor: isLightMode ? '#6C9A7D' : '#2CD87D' }} />
                            <div className={`absolute rounded-full shadow-md ${isLightMode ? 'w-3 h-3 bg-[#1D2A23] border-2 border-white' : 'h-2.5 bg-[#2CD87D] shadow-[0_0_12px_#2CD87D]'}`} style={{ width: isLightMode ? '12px' : '26px', left: `${actualCoords[activeIndex].x}%`, top: `${actualCoords[activeIndex].y}%`, transform: 'translate(-50%, -50%)' }} />
                            {!isLightMode && <div className="absolute w-2 h-2 bg-[#CCF6E4] rounded-full" style={{ left: `${actualCoords[activeIndex].x}%`, top: `${actualCoords[activeIndex].y}%`, transform: 'translate(-50%, -50%)' }} />}

                            <div className={`absolute ${t.tooltipBg} rounded-xl p-3 z-30 min-w-[140px] transition-all duration-100 ease-out`} style={{ left: `${actualCoords[activeIndex].x}%`, top: `${actualCoords[activeIndex].y}%`, transform: `translate(${activeIndex > 3 ? '-110%' : '10%'}, -80%)` }}>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="w-2 h-2 rounded-full" style={{backgroundColor: isLightMode ? '#6C9A7D' : '#2CD87D'}}></span>
                                    <span className={`text-[12px] ${t.textMuted} font-medium`}>{chartData[activeIndex].dateStr.split(',')[0]}</span>
                                </div>
                                <span className={`text-[16px] ${t.textMain} font-bold pl-4`}>{chartData[activeIndex].actual} kg</span>
                            </div>
                        </div>
                      )}

                      <div className="absolute inset-0 w-full h-full flex z-10">
                        {chartData.map((_, i) => (
                          <div key={i} className="flex-1 h-full cursor-crosshair" onMouseEnter={() => setActiveIndex(i)} />
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className={`relative h-10 mt-3 text-[12px] ${t.textMuted} font-medium`}>
                  {chartData.map((d, i) => (
                    <span key={i} className={`absolute transform -translate-x-1/2 ${activeIndex === i ? `${t.textMain} font-bold` : ''}`} style={{ left: `${(i / (chartData.length - 1)) * 100}%` }}>{d.day}</span>
                  ))}
                </div>
              </div>
            </div>
          </ThemedCard>

          <div className="h-12"></div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
};

export default Dashboard;
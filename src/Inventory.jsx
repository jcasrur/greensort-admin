// Inventory.jsx — Inventory Storage
// Accessible by: super_admin, receiving_staff

import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import { useTheme, ThemedCard } from './ThemeContext';
import { supabase } from './supabase';

export default function Inventory() {
  const { isLightMode, t } = useTheme();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    // Aggregate surrender_logs by waste_type for a quick inventory overview
    const { data, error } = await supabase
      .from('surrender_logs')
      .select('waste_type, weight_kg, encoded_status, status')
      .neq('encoded_status', 'Rejected')
      .neq('status', 'Rejected');
    if (!error && data) {
      const grouped = {};
      data.forEach(r => {
        const key = r.waste_type || 'Unknown';
        if (!grouped[key]) grouped[key] = { waste_type: key, total_kg: 0, count: 0 };
        grouped[key].total_kg += Number(r.weight_kg) || 0;
        grouped[key].count   += 1;
      });
      setItems(Object.values(grouped).sort((a, b) => b.total_kg - a.total_kg));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  return (
    <div className={`flex h-screen w-full font-sans ${t.bg} transition-colors duration-300 overflow-hidden`}>
      <Sidebar />
      <div className="flex-1 h-full overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
          <div className="mb-8">
            <h1 className={`text-3xl font-bold ${t.textMain} tracking-tight`}>Inventory Storage</h1>
            <p className={`${t.textMuted} mt-1 text-sm`}>Current material stock aggregated from surrender logs</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {loading ? (
              <div className={`col-span-full flex items-center justify-center h-40 text-sm font-bold tracking-widest animate-pulse ${t.accentText}`}>LOADING...</div>
            ) : items.map(item => (
              <ThemedCard key={item.waste_type}>
                <div className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${isLightMode ? 'text-[#2D6A4F]' : 'text-[#34D399]'}`}>
                  {item.waste_type}
                </div>
                <p className={`text-3xl font-bold leading-none ${t.textMain}`}>
                  {item.total_kg.toFixed(1)} kg
                </p>
                <p className={`text-xs mt-2 ${t.textMuted}`}>{item.count} submissions</p>
              </ThemedCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

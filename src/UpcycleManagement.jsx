import React, { useState } from 'react';
import Sidebar from './Sidebar'; 
import { useTheme, ThemedCard } from './ThemeContext'; // 🟢 Gamitin ang Global Theme

export default function UpcycleManagement() {
  const [activeTab, setActiveTab] = useState('suggestions');
  const { isLightMode, t } = useTheme(); // 🟢 Kuhanin ang global variables

  return (
    <div className={`flex h-screen w-full font-sans ${t.bg} transition-colors duration-300 overflow-hidden selection:bg-[#2CD87D] selection:text-black`}>
      
      <Sidebar />

      <div className="flex-1 h-full overflow-y-auto relative z-10 no-scrollbar">
        <div className="p-6 lg:p-10 max-w-[1600px] mx-auto">
          
          {/* HEADER */}
          <div className="flex flex-col lg:flex-row justify-between items-start mb-8 gap-6">
            <div>
              <h2 className={`text-3xl font-bold ${t.textMain} tracking-tight`}>Upcycle Management</h2>
              <p className={`${t.textMuted} mt-1 font-medium text-sm`}>Review and publish AI generated project tutorials</p>
            </div>
          </div>

          {/* TOGGLE TABS */}
          <div className={`flex items-center ${isLightMode ? 'bg-[#F0F4F1] border-[#E5ECE7]' : 'bg-[#131917] border-white/[0.05]'} border rounded-full p-1.5 mb-8 w-fit shadow-sm`}>
            {['suggestions', 'published'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-8 py-2.5 rounded-full font-bold text-sm capitalize transition-all duration-300 ${
                  activeTab === tab 
                    ? (isLightMode ? 'bg-white text-[#4A7D5C] shadow-sm' : 'bg-[#18201B] text-[#2CD87D] border border-[#2CD87D]/20 shadow-[0_0_15px_rgba(44,216,125,0.1)]') 
                    : `${t.textMuted} hover:${t.textMain}`
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* MAIN CONTENT AREA */}
          <ThemedCard className="!p-0 overflow-hidden mb-10">
            <div className={`p-6 border-b ${isLightMode ? 'border-[#F0F4F1]' : 'border-white/[0.05]'} flex justify-between items-center`}>
              <h3 className={`text-lg font-bold ${t.textMain}`}>Project Registry</h3>
              <div className={`text-xs font-bold ${isLightMode ? 'text-[#6C9A7D]' : 'text-[#2CD87D]'} px-3 py-1 bg-current/10 rounded-full`}>
                {activeTab === 'suggestions' ? 'Review Mode' : 'Live Database'}
              </div>
            </div>

            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`${isLightMode ? 'bg-[#F9FBF9]' : 'bg-[#101417]'} ${t.textMuted} text-[10px] uppercase tracking-widest border-b ${isLightMode ? 'border-[#F0F4F1]' : 'border-white/[0.05]'}`}>
                    <th className="px-6 py-4 font-bold">Project Name</th>
                    <th className="px-6 py-4 font-bold">Category</th>
                    <th className="px-6 py-4 font-bold">Difficulty</th>
                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {/* Empty State Example */}
                  <tr>
                    <td colSpan="4" className={`p-12 text-center ${t.textMuted} font-medium italic`}>
                      No projects currently in {activeTab}.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Visual Accent */}
            <div className={`h-1 w-full bg-gradient-to-r from-transparent ${isLightMode ? 'via-[#98BAA3]/40' : 'via-[#2CD87D]/30'} to-transparent`}></div>
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
}
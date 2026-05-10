import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { useTheme, ThemedCard } from './ThemeContext';
import { supabase } from './supabase';
import { useAdminAuth } from './useAdminAuth';
import GuidePanel from './GuidePanel';

// ── Difficulty badge ─────────────────────────────────────────────────────────
const DiffBadge = ({ level, light }) => {
  const map = {
    Easy:   light ? 'bg-emerald-50 text-emerald-700 border-emerald-200'   : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Medium: light ? 'bg-amber-50 text-amber-700 border-amber-200'         : 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Hard:   light ? 'bg-red-50 text-red-700 border-red-200'               : 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  const cls = map[level] || (light ? 'bg-gray-100 text-gray-600 border-gray-200' : 'bg-white/5 text-white/50 border-white/10');
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${cls}`}>
      {level || 'N/A'}
    </span>
  );
};

// ── Category pill ────────────────────────────────────────────────────────────
const CatPill = ({ cat, light }) => (
  <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider border ${
    light ? 'bg-[#EEF4EC] text-[#2D6A4F] border-[#A8CFBA]/30' : 'bg-[#52B788]/8 text-[#52B788] border-[#52B788]/20'
  }`}>
    {cat}
  </span>
);

// ── Side-drawer: full project detail ────────────────────────────────────────
function ProjectDrawer({ project, onClose, onPublish, onReject, onUnpublish, isLightMode, t, adminName }) {
  if (!project) return null;

  const materials = Array.isArray(project.materials) ? project.materials : [];
  const steps     = Array.isArray(project.steps)     ? project.steps     : [];
  const isPublished = project.status === 'published';

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-[100] flex justify-end"
      onClick={onClose}
    >
      {/* Semi-transparent backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

      {/* Drawer panel */}
      <div
        className={`relative w-full max-w-[520px] h-full overflow-y-auto border-l shadow-2xl flex flex-col transition-colors duration-300 ${
          isLightMode ? 'bg-white border-[#E3E8E1]' : 'bg-[#0F1814] border-white/[0.06]'
        }`}
        onClick={e => e.stopPropagation()}
        style={{ scrollbarWidth: 'none' }}
      >
        {/* Sticky header */}
        <div className={`sticky top-0 z-10 px-6 py-4 border-b flex items-center justify-between ${
          isLightMode ? 'bg-white border-[#E3E8E1]' : 'bg-[#0F1814] border-white/[0.06]'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isLightMode ? 'bg-[#D8EDDF]' : 'bg-[#52B788]/12'
            }`}>
              <svg className={`w-4 h-4 ${t.accentText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <p className={`text-xs font-bold uppercase tracking-widest ${t.textMuted}`}>Project Detail</p>
              <p className={`text-sm font-semibold ${t.textMain} truncate max-w-[260px]`}>{project.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-all ${t.textMuted} ${isLightMode ? 'hover:bg-[#F3F6F1]' : 'hover:bg-white/[0.04]'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 p-6 space-y-5">

          {/* Image */}
          {project.image_url && (
            <div className="w-full h-52 rounded-2xl overflow-hidden border border-white/[0.06]">
              <img
                src={project.image_url}
                alt={project.title}
                className="w-full h-full object-cover"
                onError={e => { e.target.style.display = 'none'; }}
              />
            </div>
          )}

          {/* Meta chips row */}
          <div className="flex flex-wrap gap-2 items-center">
            <CatPill cat={project.material_category} light={isLightMode} />
            <DiffBadge level={project.difficulty} light={isLightMode} />
            {project.time_required && (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                isLightMode ? 'bg-[#F0F4EE] text-[#3D4E3A] border-[#E3E8E1]' : 'bg-white/[0.04] text-[#B0C5AA] border-white/[0.06]'
              }`}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {project.time_required}
              </span>
            )}
            {project.estimated_cost && (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                isLightMode ? 'bg-[#F0F4EE] text-[#3D4E3A] border-[#E3E8E1]' : 'bg-white/[0.04] text-[#B0C5AA] border-white/[0.06]'
              }`}>
                ₱ {project.estimated_cost}
              </span>
            )}
            {project.selling_price && (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black border ${
                isLightMode ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                Sell @ {project.selling_price}
              </span>
            )}
          </div>

          {/* Materials */}
          {materials.length > 0 && (
            <div className={`rounded-2xl border p-4 ${isLightMode ? 'bg-[#FAFBF9] border-[#E3E8E1]' : 'bg-white/[0.02] border-white/[0.05]'}`}>
              <p className={`text-xs font-bold uppercase tracking-widest ${t.textMuted} mb-3`}>Materials Required</p>
              <ul className="space-y-2">
                {materials.map((mat, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${isLightMode ? 'bg-[#2D6A4F]' : 'bg-[#52B788]'}`} />
                    <span className={`text-sm ${t.textSub} leading-relaxed`}>{mat}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Steps */}
          {steps.length > 0 && (
            <div className={`rounded-2xl border p-4 ${isLightMode ? 'bg-[#FAFBF9] border-[#E3E8E1]' : 'bg-white/[0.02] border-white/[0.05]'}`}>
              <p className={`text-xs font-bold uppercase tracking-widest ${t.textMuted} mb-3`}>Step-by-Step Instructions</p>
              <ol className="space-y-3">
                {steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${
                      isLightMode ? 'bg-[#D8EDDF] text-[#2D6A4F]' : 'bg-[#52B788]/12 text-[#52B788]'
                    }`}>{i + 1}</span>
                    <span className={`text-sm ${t.textSub} leading-relaxed pt-0.5`}>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Review meta */}
          {project.reviewed_by && (
            <p className={`text-xs ${t.textMuted}`}>
              Reviewed by <span className="font-semibold">{project.reviewed_by}</span>
            </p>
          )}
        </div>

        {/* Sticky action footer */}
        <div className={`sticky bottom-0 p-4 border-t space-y-2.5 ${
          isLightMode ? 'bg-white border-[#E3E8E1]' : 'bg-[#0F1814] border-white/[0.06]'
        }`}>
          {isPublished ? (
            <button
              onClick={() => onUnpublish(project)}
              className={`w-full py-3 rounded-xl text-sm font-bold transition-all border ${
                isLightMode
                  ? 'border-[#E3E8E1] text-[#7A8C77] hover:bg-[#F3F6F1]'
                  : 'border-white/[0.07] text-[#627A5C] hover:bg-white/[0.04]'
              }`}
            >
              Unpublish Project
            </button>
          ) : (
            <>
              <button
                onClick={() => onPublish(project)}
                className={`w-full py-3 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2 ${
                  isLightMode ? 'bg-[#2D6A4F] hover:bg-[#346849]' : 'bg-[#52B788] hover:bg-[#5EC994] text-[#0F1814]'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Publish to App
              </button>
              <button
                onClick={() => onReject(project)}
                className={`w-full py-3 rounded-xl text-sm font-medium transition-all ${
                  isLightMode ? 'bg-[#F4F6F2] text-[#7A8C77] hover:bg-red-50 hover:text-red-600' : 'bg-white/[0.04] text-[#627A5C] hover:bg-red-500/10 hover:text-red-400'
                }`}
              >
                Reject & Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function UpcycleManagement() {
  const { isLightMode, t } = useTheme();
  const { adminUser } = useAdminAuth();

  const [activeTab, setActiveTab]           = useState('suggestions');
  const [projects, setProjects]             = useState([]);
  const [loading, setLoading]               = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);

  // Counts for tab badges
  const [suggestionCount, setSuggestionCount] = useState(0);
  const [publishedCount,  setPublishedCount]  = useState(0);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchProjects = async (statusFilter) => {
    setLoading(true);
    // Tab key 'suggestions' maps to DB value 'suggestion'
    const dbStatus = statusFilter === 'suggestions' ? 'suggestion' : statusFilter;
    try {
      const { data, error } = await supabase
        .from('upcycle_projects')
        .select('*')
        .eq('status', dbStatus)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProjects(data || []);
    } catch (e) {
      console.error('fetchProjects error:', e);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCounts = async () => {
    try {
      const [{ count: sc }, { count: pc }] = await Promise.all([
        supabase.from('upcycle_projects').select('*', { count: 'exact', head: true }).eq('status', 'suggestion'),
        supabase.from('upcycle_projects').select('*', { count: 'exact', head: true }).eq('status', 'published'),
      ]);
      setSuggestionCount(sc || 0);
      setPublishedCount(pc  || 0);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchProjects(activeTab);
    fetchCounts();
  }, [activeTab]);

  // ── Actions ──────────────────────────────────────────────────────────────

  // PUBLISH: status → 'published', stamp reviewed_by
  const handlePublish = async (project) => {
    if (!window.confirm(`Publish "${project.title}" to the app?`)) return;
    try {
      const { error } = await supabase
        .from('upcycle_projects')
        .update({ status: 'published', reviewed_by: adminUser?.full_name || adminUser?.email || 'Admin' })
        .eq('id', project.id);
      if (error) throw error;
      alert(`✅ "${project.title}" is now live in the app!`);
      setSelectedProject(null);
      fetchProjects(activeTab);
      fetchCounts();
    } catch (e) { alert('Error: ' + e.message); }
  };

  // REJECT: permanently deletes the suggestion
  const handleReject = async (project) => {
    if (!window.confirm(`Permanently delete "${project.title}"? This cannot be undone.`)) return;
    try {
      const { error } = await supabase
        .from('upcycle_projects')
        .delete()
        .eq('id', project.id);
      if (error) throw error;
      alert('Project deleted.');
      setSelectedProject(null);
      fetchProjects(activeTab);
      fetchCounts();
    } catch (e) { alert('Error: ' + e.message); }
  };

  // UNPUBLISH: status → 'suggestion' (moves back to review queue)
  const handleUnpublish = async (project) => {
    if (!window.confirm(`Unpublish "${project.title}"? It will return to the Suggestions queue.`)) return;
    try {
      const { error } = await supabase
        .from('upcycle_projects')
        .update({ status: 'suggestion', reviewed_by: null })
        .eq('id', project.id);
      if (error) throw error;
      alert('Project moved back to Suggestions.');
      setSelectedProject(null);
      fetchProjects(activeTab);
      fetchCounts();
    } catch (e) { alert('Error: ' + e.message); }
  };

  const formatDate = (ds) => new Date(ds).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={`flex h-screen w-full font-sans ${t.bg} transition-colors duration-300 overflow-hidden selection:bg-[#2CD87D] selection:text-black`}>

      <Sidebar />

      <div className="flex-1 h-full overflow-y-auto relative z-10 no-scrollbar">
        <div className="p-6 lg:p-10 max-w-[1600px] mx-auto">

          {/* ── Header ── */}
          <div className="flex flex-col lg:flex-row justify-between items-start mb-8 gap-6">
            <div>
              <h2 className={`text-3xl font-bold ${t.textMain} tracking-tight`}>Upcycle Management</h2>
              <p className={`${t.textMuted} mt-1 font-medium text-sm`}>Review and publish AI-generated project tutorials</p>
            </div>
            <button
              onClick={() => { fetchProjects(activeTab); fetchCounts(); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${t.accentText} ${
                isLightMode ? 'border-[#A8CFBA] bg-[#D8EDDF] hover:bg-[#C4E0CF]' : 'border-[#52B788]/25 bg-[#52B788]/8 hover:bg-[#52B788]/15'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>

          {/* ── Stat chips ── */}
          <div className="flex flex-wrap gap-3 mb-8">
            <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-semibold ${
              isLightMode ? 'bg-white border-[#E3E8E1] text-[#3D4E3A]' : 'bg-[#161D19] border-white/[0.05] text-[#B0C5AA]'
            }`}>
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              {suggestionCount} Awaiting Review
            </div>
            <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-semibold ${
              isLightMode ? 'bg-white border-[#E3E8E1] text-[#3D4E3A]' : 'bg-[#161D19] border-white/[0.05] text-[#B0C5AA]'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isLightMode ? 'bg-[#2D6A4F]' : 'bg-[#52B788]'}`} />
              {publishedCount} Published Live
            </div>
          </div>

          {/* ── Tab toggle ── */}
          <div className={`flex items-center ${isLightMode ? 'bg-[#F0F4F1] border-[#E5ECE7]' : 'bg-[#131917] border-white/[0.05]'} border rounded-full p-1.5 mb-8 w-fit shadow-sm`}>
            {[
              { key: 'suggestions', label: 'Suggestions', count: suggestionCount },
              { key: 'published',   label: 'Published',   count: publishedCount  },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-8 py-2.5 rounded-full font-bold text-sm capitalize transition-all duration-300 ${
                  activeTab === tab.key
                    ? (isLightMode ? 'bg-white text-[#4A7D5C] shadow-sm' : 'bg-[#18201B] text-[#2CD87D] border border-[#2CD87D]/20 shadow-[0_0_15px_rgba(44,216,125,0.1)]')
                    : `${t.textMuted} hover:${t.textMain}`
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                    tab.key === 'suggestions'
                      ? 'bg-amber-400/20 text-amber-500'
                      : (isLightMode ? 'bg-[#D8EDDF] text-[#2D6A4F]' : 'bg-[#52B788]/15 text-[#52B788]')
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Main table ── */}
          <ThemedCard className="!p-0 overflow-hidden mb-10">

            {/* Table header bar */}
            <div className={`p-5 border-b flex justify-between items-center ${isLightMode ? 'border-[#F0F4F1]' : 'border-white/[0.05]'}`}>
              <h3 className={`text-base font-bold ${t.textMain} flex items-center gap-2.5`}>
                <svg className={`w-4 h-4 ${t.accentText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {activeTab === 'suggestions' ? 'Pending Review' : 'Live Projects'}
              </h3>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                activeTab === 'suggestions'
                  ? 'bg-amber-400/15 text-amber-500'
                  : (isLightMode ? 'bg-[#D8EDDF] text-[#2D6A4F]' : 'bg-[#52B788]/12 text-[#52B788]')
              }`}>
                {activeTab === 'suggestions' ? 'Review Mode' : 'Live Database'}
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto" style={{ minHeight: 320 }}>
              {loading ? (
                <div className={`flex items-center justify-center h-[280px] text-sm font-bold tracking-widest animate-pulse ${t.accentText}`}>
                  LOADING DATA...
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`text-[10px] uppercase tracking-widest border-b ${
                      isLightMode ? 'bg-[#F9FBF9] border-[#F0F4F1]' : 'bg-[#0A0F0D] border-white/[0.04]'
                    } ${t.textMuted}`}>
                      <th className="px-6 py-4 font-bold">Project Name</th>
                      <th className="px-6 py-4 font-bold">Category</th>
                      <th className="px-6 py-4 font-bold">Difficulty</th>
                      <th className="px-6 py-4 font-bold">Time</th>
                      <th className="px-6 py-4 font-bold">Est. Cost</th>
                      <th className="px-6 py-4 font-bold">Added</th>
                      {activeTab === 'published' && <th className="px-6 py-4 font-bold">Reviewed By</th>}
                      <th className="px-6 py-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {projects.length === 0 ? (
                      <tr>
                        <td colSpan={activeTab === 'published' ? 8 : 7} className={`py-14 text-center ${t.textMuted} font-medium italic`}>
                          {activeTab === 'suggestions'
                            ? 'No projects pending review. You\'re all caught up!'
                            : 'No published projects yet. Approve some suggestions to get started.'}
                        </td>
                      </tr>
                    ) : (
                      projects.map(project => (
                        <tr
                          key={project.id}
                          className={`border-b transition-colors cursor-pointer ${
                            isLightMode
                              ? 'border-[#F0F4F1] hover:bg-[#F9FBF9]'
                              : 'border-white/[0.03] hover:bg-white/[0.02]'
                          }`}
                          onClick={() => setSelectedProject(project)}
                        >
                          {/* Project name + image thumbnail */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {project.image_url ? (
                                <img
                                  src={project.image_url}
                                  alt={project.title}
                                  className="w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-white/[0.06]"
                                  onError={e => { e.target.style.display = 'none'; }}
                                />
                              ) : (
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                  isLightMode ? 'bg-[#EEF4EC]' : 'bg-[#52B788]/8'
                                }`}>
                                  <svg className={`w-5 h-5 ${t.accentText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                </div>
                              )}
                              <span className={`font-semibold ${t.textMain} max-w-[200px] truncate`}>{project.title}</span>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <CatPill cat={project.material_category} light={isLightMode} />
                          </td>

                          <td className="px-6 py-4">
                            <DiffBadge level={project.difficulty} light={isLightMode} />
                          </td>

                          <td className={`px-6 py-4 text-xs font-medium ${t.textMuted}`}>
                            {project.time_required || '—'}
                          </td>

                          <td className={`px-6 py-4 text-xs font-medium ${t.textMuted}`}>
                            {project.estimated_cost || '—'}
                          </td>

                          <td className={`px-6 py-4 text-xs font-medium ${t.textMuted}`}>
                            {formatDate(project.created_at)}
                          </td>

                          {activeTab === 'published' && (
                            <td className={`px-6 py-4 text-xs font-medium ${t.textMuted}`}>
                              {project.reviewed_by || '—'}
                            </td>
                          )}

                          {/* Actions */}
                          <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              {/* View / Open drawer */}
                              <button
                                onClick={() => setSelectedProject(project)}
                                className={`p-2 rounded-lg transition-all ${t.textMuted} ${
                                  isLightMode ? 'hover:bg-[#EEF4EC] hover:text-[#2D6A4F]' : 'hover:bg-[#52B788]/10 hover:text-[#52B788]'
                                }`}
                                title="View full details"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>

                              {activeTab === 'suggestions' ? (
                                <>
                                  {/* Publish */}
                                  <button
                                    onClick={() => handlePublish(project)}
                                    className={`p-2 rounded-lg transition-all ${t.textMuted} ${
                                      isLightMode ? 'hover:bg-emerald-50 hover:text-emerald-600' : 'hover:bg-emerald-500/10 hover:text-emerald-400'
                                    }`}
                                    title="Publish to app"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </button>
                                  {/* Reject */}
                                  <button
                                    onClick={() => handleReject(project)}
                                    className={`p-2 rounded-lg transition-all ${t.textMuted} hover:text-red-500 hover:bg-red-500/10`}
                                    title="Reject & delete"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </>
                              ) : (
                                /* Unpublish */
                                <button
                                  onClick={() => handleUnpublish(project)}
                                  className={`p-2 rounded-lg transition-all ${t.textMuted} hover:text-amber-500 hover:bg-amber-500/10`}
                                  title="Move back to suggestions"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Bottom accent bar */}
            <div className={`h-1 w-full bg-gradient-to-r from-transparent ${isLightMode ? 'via-[#98BAA3]/40' : 'via-[#2CD87D]/30'} to-transparent`} />
          </ThemedCard>

          <div className="h-12" />
        </div>
      </div>

      {/* ── Side drawer ── */}
      {selectedProject && (
        <ProjectDrawer
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onPublish={handlePublish}
          onReject={handleReject}
          onUnpublish={handleUnpublish}
          isLightMode={isLightMode}
          t={t}
          adminName={adminUser?.full_name || adminUser?.email || 'Admin'}
        />
      )}

      {/* ── How-to guide ── */}
      <GuidePanel page="upcycle" />

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      ` }} />
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase';
import emailjs from '@emailjs/browser';
import Sidebar from './Sidebar';
import { useTheme, ThemedCard } from './ThemeContext';
import GuidePanel from './GuidePanel';

// ─────────────────────────────────────────────────────────────────────────────
// RewardsDrawer — slides in from the right when admin clicks "Manage Rewards"
// Shows all rewards_inventory rows for a given collector (user_email)
// Allows Add / Edit / Toggle availability / Delete
// ─────────────────────────────────────────────────────────────────────────────
function RewardsDrawer({ center, onClose, isLightMode, t }) {
  const [rewards, setRewards]         = useState([]);
  const [loadingRewards, setLoading]  = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [editingId, setEditingId]     = useState(null);   // null = add new

  const emptyForm = {
    name: '', description: '', condition: '', tags: 'General',
    checklist: '', image_url: '', waste_image_url: '', is_available: true,
  };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // ── fetch all rewards for this center ──────────────────────────────────
  const fetchRewards = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rewards_inventory')
        .select('*')
        .eq('user_email', center.user_email)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRewards(data || []);
    } catch (e) {
      console.error('fetchRewards error:', e);
      setRewards([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRewards(); }, [center.user_email]);

  // ── open form for adding ───────────────────────────────────────────────
  const handleAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  // ── open form pre-filled for editing ──────────────────────────────────
  const handleEdit = (reward) => {
    setForm({
      name:            reward.name            || '',
      description:     reward.description     || '',
      condition:       reward.condition       || '',
      tags:            reward.tags            || 'General',
      checklist:       reward.checklist       || '',
      image_url:       reward.image_url       || '',
      waste_image_url: reward.waste_image_url || '',
      is_available:    reward.is_available    ?? true,
    });
    setEditingId(reward.id);
    setShowForm(true);
  };

  // ── save (insert or update) ────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim())      return alert('Reward name is required.');
    if (!form.condition.trim()) return alert('Condition is required (e.g. "1kg Plastic").');
    setSaving(true);
    try {
      const payload = {
        user_email:       center.user_email,
        name:             form.name.trim(),
        description:      form.description.trim(),
        condition:        form.condition.trim(),
        tags:             form.tags.trim() || 'General',
        checklist:        form.checklist.trim(),
        image_url:        form.image_url.trim() || null,
        waste_image_url:  form.waste_image_url.trim() || null,
        is_available:     form.is_available,
      };

      if (editingId) {
        const { error } = await supabase.from('rewards_inventory').update(payload).eq('id', editingId);
        if (error) throw error;
        alert('✅ Reward updated!');
      } else {
        const { error } = await supabase.from('rewards_inventory').insert([payload]);
        if (error) throw error;
        alert('✅ Reward added!');
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      fetchRewards();
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── toggle is_available ────────────────────────────────────────────────
  const handleToggleAvailable = async (reward) => {
    try {
      const { error } = await supabase
        .from('rewards_inventory')
        .update({ is_available: !reward.is_available })
        .eq('id', reward.id);
      if (error) throw error;
      fetchRewards();
    } catch (e) { alert('Error: ' + e.message); }
  };

  // ── delete ─────────────────────────────────────────────────────────────
  const handleDelete = async (reward) => {
    if (!window.confirm(`Delete reward "${reward.name}"? This cannot be undone.`)) return;
    try {
      const { error } = await supabase.from('rewards_inventory').delete().eq('id', reward.id);
      if (error) throw error;
      fetchRewards();
    } catch (e) { alert('Error: ' + e.message); }
  };

  // ── shared input style ─────────────────────────────────────────────────
  const inputCls = `w-full px-3 py-2.5 rounded-xl border text-sm transition-all outline-none ${
    isLightMode
      ? 'bg-[#F4F6F2] border-[#DDE3DA] text-[#1A2418] focus:border-[#2D6A4F]/60 placeholder:text-[#A8BCAA]'
      : 'bg-[#0F1512] border-white/[0.07] text-[#E8F0E5] focus:border-[#52B788]/50 placeholder:text-[#3D5042]'
  }`;
  const labelCls = `block text-[10px] font-bold uppercase tracking-widest mb-1.5 ${t.textMuted}`;

  return (
    // Backdrop
    <div className="fixed inset-0 z-[100] flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

      {/* Panel */}
      <div
        className={`relative w-full max-w-[540px] h-full flex flex-col border-l shadow-2xl transition-colors duration-300 ${
          isLightMode ? 'bg-white border-[#E3E8E1]' : 'bg-[#0C1410] border-white/[0.06]'
        }`}
        onClick={e => e.stopPropagation()}
        style={{ scrollbarWidth: 'none' }}
      >
        {/* ── Sticky header ── */}
        <div className={`flex-shrink-0 px-6 py-4 border-b flex items-center justify-between ${
          isLightMode ? 'bg-white border-[#E3E8E1]' : 'bg-[#0C1410] border-white/[0.06]'
        }`}>
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${t.textMuted} mb-0.5`}>Rewards Inventory</p>
            <p className={`text-base font-bold ${t.textMain} truncate max-w-[340px]`}>{center.program_name}</p>
            <p className={`text-xs ${t.textMuted} mt-0.5`}>{center.barangay}, {center.city}</p>
          </div>
          <div className="flex items-center gap-2">
            {!showForm && (
              <button
                onClick={handleAdd}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  isLightMode
                    ? 'bg-[#2D6A4F] text-white hover:bg-[#346849]'
                    : 'bg-[#52B788] text-[#0C1410] hover:bg-[#5EC994]'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Reward
              </button>
            )}
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-all ${t.textMuted} ${
                isLightMode ? 'hover:bg-[#F3F6F1]' : 'hover:bg-white/[0.04]'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4" style={{ scrollbarWidth: 'none' }}>

          {/* ── ADD / EDIT FORM ── */}
          {showForm && (
            <div className={`rounded-2xl border p-5 space-y-4 ${
              isLightMode ? 'bg-[#F7FAF7] border-[#D8EDDF]' : 'bg-[#111A14] border-[#52B788]/20'
            }`}>
              <p className={`text-sm font-bold ${t.textMain}`}>
                {editingId ? 'Edit Reward' : 'Add New Reward'}
              </p>

              {/* Row 1: Name + Tags */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Reward Name *</label>
                  <input
                    className={inputCls}
                    placeholder="e.g. 1kg Rice"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelCls}>Category Tag</label>
                  <input
                    className={inputCls}
                    placeholder="e.g. Food, Voucher"
                    value={form.tags}
                    onChange={e => setForm({ ...form, tags: e.target.value })}
                  />
                </div>
              </div>

              {/* Condition */}
              <div>
                <label className={labelCls}>Condition (waste required) *</label>
                <input
                  className={inputCls}
                  placeholder='e.g. "1kg Plastic" or "5pcs Glass Bottles"'
                  value={form.condition}
                  onChange={e => setForm({ ...form, condition: e.target.value })}
                />
                <p className={`text-[10px] mt-1 ${t.textMuted}`}>
                  The mobile app parses the number from this field to calculate reward multiples.
                </p>
              </div>

              {/* Description */}
              <div>
                <label className={labelCls}>Description</label>
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={2}
                  placeholder="Short description of the reward..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>

              {/* Checklist */}
              <div>
                <label className={labelCls}>Checklist / Requirements</label>
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={2}
                  placeholder="e.g. Must be clean, No labels, Flattened..."
                  value={form.checklist}
                  onChange={e => setForm({ ...form, checklist: e.target.value })}
                />
              </div>

              {/* Image URLs */}
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className={labelCls}>Reward Image URL</label>
                  <input
                    className={inputCls}
                    placeholder="https://... (image of the reward item)"
                    value={form.image_url}
                    onChange={e => setForm({ ...form, image_url: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelCls}>Waste Image URL</label>
                  <input
                    className={inputCls}
                    placeholder="https://... (image of the accepted waste)"
                    value={form.waste_image_url}
                    onChange={e => setForm({ ...form, waste_image_url: e.target.value })}
                  />
                </div>
              </div>

              {/* Available toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, is_available: !form.is_available })}
                  className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                    form.is_available
                      ? (isLightMode ? 'bg-[#2D6A4F]' : 'bg-[#52B788]')
                      : (isLightMode ? 'bg-[#DDE3DA]' : 'bg-white/[0.08]')
                  }`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${
                    form.is_available ? 'left-5' : 'left-0.5'
                  }`} />
                </button>
                <span className={`text-xs font-semibold ${t.textSub}`}>
                  {form.is_available ? 'Available (visible in mobile app)' : 'Unavailable (hidden from mobile app)'}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isLightMode
                      ? 'bg-[#2D6A4F] text-white hover:bg-[#346849]'
                      : 'bg-[#52B788] text-[#0C1410] hover:bg-[#5EC994]'
                  } disabled:opacity-50`}
                >
                  {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Reward'}
                </button>
                <button
                  onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                    isLightMode
                      ? 'border-[#DDE3DA] text-[#7A8C77] hover:bg-[#F3F6F1]'
                      : 'border-white/[0.07] text-[#627A5C] hover:bg-white/[0.03]'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── REWARDS LIST ── */}
          {loadingRewards ? (
            <div className={`flex items-center justify-center h-32 text-xs font-bold tracking-widest animate-pulse ${t.accentText}`}>
              LOADING REWARDS...
            </div>
          ) : rewards.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-14 gap-3 rounded-2xl border border-dashed ${
              isLightMode ? 'border-[#DDE3DA]' : 'border-white/[0.08]'
            }`}>
              <svg className={`w-10 h-10 ${t.textMuted} opacity-40`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.25} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
              <p className={`text-sm font-medium ${t.textMuted} italic`}>No rewards yet for this center.</p>
              <button
                onClick={handleAdd}
                className={`text-xs font-bold px-4 py-2 rounded-xl transition-all ${t.accentText} ${
                  isLightMode ? 'bg-[#D8EDDF] hover:bg-[#C4E0CF]' : 'bg-[#52B788]/12 hover:bg-[#52B788]/20'
                }`}
              >
                + Add the first reward
              </button>
            </div>
          ) : (
            rewards.map(reward => (
              <div
                key={reward.id}
                className={`rounded-2xl border transition-all ${
                  reward.is_available
                    ? (isLightMode ? 'bg-white border-[#E3E8E1]' : 'bg-[#131A16] border-white/[0.06]')
                    : (isLightMode ? 'bg-[#F9F9F9] border-[#E8E8E8] opacity-60' : 'bg-[#0E1210] border-white/[0.03] opacity-50')
                }`}
              >
                <div className="p-4">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Reward image thumbnail */}
                      {reward.image_url ? (
                        <img
                          src={reward.image_url}
                          alt={reward.name}
                          className="w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-white/[0.06]"
                          onError={e => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isLightMode ? 'bg-[#D8EDDF]' : 'bg-[#52B788]/12'
                        }`}>
                          <svg className={`w-5 h-5 ${t.accentText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                          </svg>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className={`text-sm font-bold ${t.textMain} truncate`}>{reward.name}</p>
                        <p className={`text-[11px] ${t.textMuted} mt-0.5`}>{reward.condition}</p>
                      </div>
                    </div>

                    {/* Action icons */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Toggle available */}
                      <button
                        onClick={() => handleToggleAvailable(reward)}
                        title={reward.is_available ? 'Mark unavailable' : 'Mark available'}
                        className={`p-1.5 rounded-lg transition-all ${
                          reward.is_available
                            ? `${t.accentText} ${isLightMode ? 'hover:bg-[#D8EDDF]' : 'hover:bg-[#52B788]/12'}`
                            : `${t.textMuted} hover:text-amber-500 hover:bg-amber-500/10`
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {reward.is_available
                            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          }
                        </svg>
                      </button>
                      {/* Edit */}
                      <button
                        onClick={() => handleEdit(reward)}
                        className={`p-1.5 rounded-lg transition-all ${t.textMuted} ${
                          isLightMode ? 'hover:bg-[#EEF4EC] hover:text-[#2D6A4F]' : 'hover:bg-[#52B788]/10 hover:text-[#52B788]'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(reward)}
                        className={`p-1.5 rounded-lg transition-all ${t.textMuted} hover:text-red-500 hover:bg-red-500/10`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  {reward.description && (
                    <p className={`text-xs ${t.textMuted} mt-1 leading-relaxed line-clamp-2`}>{reward.description}</p>
                  )}

                  {/* Bottom chips */}
                  <div className="flex flex-wrap gap-2 mt-3 items-center">
                    {/* Tags */}
                    {reward.tags && (
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${
                        isLightMode ? 'bg-[#EEF4EC] text-[#2D6A4F] border-[#A8CFBA]/30' : 'bg-[#52B788]/8 text-[#52B788] border-[#52B788]/20'
                      }`}>{reward.tags}</span>
                    )}
                    {/* Availability badge */}
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${
                      reward.is_available
                        ? (isLightMode ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20')
                        : (isLightMode ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-white/5 text-white/30 border-white/10')
                    }`}>
                      {reward.is_available ? 'Available' : 'Hidden'}
                    </span>
                    {/* Waste image indicator */}
                    {reward.waste_image_url && (
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${
                        isLightMode ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}>Waste img ✓</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Reward count footer */}
        <div className={`flex-shrink-0 px-6 py-3 border-t text-xs font-medium ${t.textMuted} ${
          isLightMode ? 'border-[#E3E8E1] bg-[#F7F9F6]' : 'border-white/[0.05] bg-[#0A0F0D]'
        }`}>
          {rewards.length} reward{rewards.length !== 1 ? 's' : ''} configured for this center
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main DropOffNodes component
// ─────────────────────────────────────────────────────────────────────────────
const DropOffNodes = () => {
  const navigate = useNavigate();
  const { isLightMode, t } = useTheme();

  const [activeTab, setActiveTab]           = useState('requests');
  const [applications, setApplications]     = useState([]);
  const [isLoading, setIsLoading]           = useState(true);
  const [selectedCenter, setSelectedCenter] = useState(null); // for rewards drawer

  const fetchApplications = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('dropoff_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching data:', error);
    } else {
      setApplications(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchApplications(); }, []);

  const handleApprove = async (id, email, programName) => {
    if (window.confirm(`Are you sure you want to approve ${programName}?`)) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        alert(`❌ Approval Failed: "${email}" is not a valid email address.`);
        return;
      }
      try {
        await emailjs.send(
          'service_nzpn1cn',
          'template_adevhna',
          { to_email: email, to_name: programName },
          { publicKey: 'lkfpdujTp2Sx9Eq3u' }
        );
        const { error } = await supabase.from('dropoff_applications').update({ status: 'approved' }).eq('id', id);
        if (error) {
          alert('Email sent, but database error: ' + error.message);
        } else {
          alert(`✅ Success! ${programName} is now approved!`);
          fetchApplications();
        }
      } catch (emailError) {
        console.error('Email Error Details:', emailError);
        alert('❌ Approval Failed!');
      }
    }
  };

  const handleReject = async (id, email, programName) => {
    const reason = window.prompt('Enter reason for rejection:', 'Your application did not meet our current requirements.');
    if (reason !== null) {
      try {
        await emailjs.send(
          'service_nzpn1cn', 'ILAGAY_MO_DITO_ANG_REJECT_TEMPLATE_ID',
          { to_email: email, to_name: programName, reject_reason: reason },
          { publicKey: 'lkfpdujTp2Sx9Eq3u' }
        );
        await supabase.from('dropoff_applications').update({ status: 'rejected' }).eq('id', id);
        fetchApplications();
      } catch (e) { console.error(e); }
    }
  };

  const handleDelete = async (id, programName) => {
    if (window.confirm(`Permanently DELETE ${programName}?`)) {
      await supabase.from('dropoff_applications').delete().eq('id', id);
      fetchApplications();
    }
  };

  const handleDeactivate = async (id, programName) => {
    if (window.confirm(`DEACTIVATE ${programName}?`)) {
      await supabase.from('dropoff_applications').update({ status: 'deactivated' }).eq('id', id);
      fetchApplications();
    }
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const filteredApps = applications.filter(app => {
    if (activeTab === 'requests') return app.status === 'pending';
    if (activeTab === 'active')   return app.status === 'approved';
    return true;
  });

  const pendingCount = applications.filter(a => a.status === 'pending').length;

  return (
    <div className={`flex h-screen w-full font-sans ${t.bg} transition-colors duration-300 overflow-hidden selection:bg-[#2CD87D] selection:text-black`}>

      <Sidebar />

      <div className="flex-1 h-full overflow-y-auto relative z-10 no-scrollbar">
        <div className="p-6 lg:p-10 max-w-[1600px] mx-auto">

          {/* HEADER */}
          <div className="flex flex-col lg:flex-row justify-between items-start mb-8 gap-6">
            <div>
              <h2 className={`text-3xl font-bold ${t.textMain} tracking-tight`}>Node Management</h2>
              <p className={`${t.textMuted} mt-1 font-medium text-sm`}>Review and manage drop-off centers</p>
            </div>
          </div>

          {/* TOGGLE TABS */}
          <div className={`flex items-center ${isLightMode ? 'bg-[#F0F4F1] border-[#E5ECE7]' : 'bg-[#131917] border-white/[0.05]'} border rounded-full p-1.5 mb-8 w-fit shadow-sm`}>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex items-center gap-3 px-8 py-2.5 rounded-full font-bold text-sm transition-all duration-300 ${
                activeTab === 'requests'
                  ? (isLightMode ? 'bg-white text-[#4A7D5C] shadow-sm' : 'bg-[#18201B] text-[#2CD87D] border border-[#2CD87D]/20 shadow-[0_0_15px_rgba(44,216,125,0.1)]')
                  : `${t.textMuted} hover:${t.textMain}`
              }`}
            >
              Requests
              {pendingCount > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-black ${isLightMode ? 'bg-[#F45B69]/10 text-[#C45E65]' : 'bg-[#FF5252]/10 text-[#FF5252] border border-[#FF5252]/30'}`}>
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`px-8 py-2.5 rounded-full font-bold text-sm transition-all duration-300 ${
                activeTab === 'active'
                  ? (isLightMode ? 'bg-white text-[#4A7D5C] shadow-sm' : 'bg-[#18201B] text-[#2CD87D] border border-[#2CD87D]/20 shadow-[0_0_15px_rgba(44,216,125,0.1)]')
                  : `${t.textMuted} hover:${t.textMain}`
              }`}
            >
              Active Nodes
            </button>
          </div>

          {/* MAIN TABLE */}
          <ThemedCard className="!p-0 overflow-hidden mb-10 relative group">

            <div className={`p-6 border-b ${isLightMode ? 'border-[#F0F4F1]' : 'border-white/[0.05]'} flex justify-between items-center`}>
              <h3 className={`text-lg font-bold ${t.textMain} flex items-center gap-3`}>
                <svg className={`w-5 h-5 ${isLightMode ? 'text-[#6C9A7D]' : 'text-[#2CD87D]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {activeTab === 'requests' ? 'Pending Applications' : 'Active Centers'}
              </h3>
              {/* Guide hint for active tab */}
              {activeTab === 'active' && (
                <p className={`text-[11px] font-medium ${t.textMuted} flex items-center gap-1.5`}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                  Click "Rewards" to manage exchange items per center
                </p>
              )}
            </div>

            <div className="overflow-x-auto min-h-[300px]">
              {isLoading ? (
                <div className={`flex justify-center items-center h-[200px] ${isLightMode ? 'text-[#6C9A7D]' : 'text-[#2CD87D]'} text-sm font-bold tracking-widest animate-pulse`}>
                  LOADING DATA...
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`${isLightMode ? 'bg-[#F9FBF9]' : 'bg-[#0A0F0D]'} ${t.textMuted} text-[10px] uppercase tracking-widest border-b ${isLightMode ? 'border-[#F0F4F1]' : 'border-white/[0.05]'}`}>
                      <th className="py-4 px-8 font-bold">Station Name</th>
                      <th className="py-4 px-4 font-bold">Contact No.</th>
                      <th className="py-4 px-4 font-bold">Location</th>
                      <th className="py-4 px-4 font-bold">Duration</th>
                      {activeTab === 'requests' && <th className="py-4 px-4 font-bold">Date Applied</th>}
                      {activeTab === 'requests' && <th className="py-4 px-4 font-bold">Document</th>}
                      <th className="py-4 px-8 font-bold text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="text-sm">
                    {filteredApps.length === 0 ? (
                      <tr>
                        <td colSpan="7" className={`py-10 text-center ${t.textMuted} font-medium italic`}>No records found.</td>
                      </tr>
                    ) : (
                      filteredApps.map((app) => (
                        <tr key={app.id} className={`border-b ${isLightMode ? 'border-[#F0F4F1] hover:bg-[#F9FBF9]' : 'border-white/[0.03] hover:bg-white/[0.02]'} transition-colors group/row`}>
                          <td className={`py-5 px-8 font-bold ${t.textMain} group-hover/row:text-[#2CD87D] transition-colors`}>{app.program_name}</td>
                          <td className={`py-5 px-4 ${t.textMuted} text-xs font-medium`}>{app.contact_number}</td>
                          <td className={`py-5 px-4 ${t.textMuted} text-xs font-medium`}>{app.barangay}, {app.city}</td>
                          <td className="py-5 px-4">
                            <span className={`px-3 py-1.5 rounded-md text-[10px] font-bold border tracking-wider ${
                              app.operation_duration.includes('More')
                                ? (isLightMode ? 'bg-[#E4EFE8] text-[#4A7D5C] border-[#98BAA3]/30' : 'bg-[#005F31]/20 text-[#2CD87D] border-[#00964E]/30')
                                : 'bg-[#FF9800]/10 text-[#FF9800] border-[#FF9800]/20'
                            }`}>
                              {app.operation_duration.includes('More') ? 'LONG-TERM' : 'SHORT-TERM'}
                            </span>
                          </td>

                          {activeTab === 'requests' ? (
                            <>
                              <td className={`py-5 px-4 ${t.textMuted} text-xs font-medium`}>{formatDate(app.created_at)}</td>
                              <td className="py-5 px-4">
                                {app.permit_url ? (
                                  <button
                                    onClick={() => window.open(app.permit_url, '_blank')}
                                    className={`px-4 py-1.5 ${isLightMode ? 'bg-[#F0F4F1] text-[#6B7A74] hover:bg-white border-[#DCE4DF]' : 'bg-[#18201B] text-[#8B9B90] hover:text-white border-white/10'} border rounded-md transition-all text-[10px] font-bold tracking-widest`}
                                  >
                                    VIEW FILE
                                  </button>
                                ) : (
                                  <span className={`${t.textMuted} font-medium text-xs italic`}>No link</span>
                                )}
                              </td>
                              <td className="py-5 px-8 text-right">
                                <div className="flex gap-4 justify-end">
                                  <button onClick={() => handleApprove(app.id, app.user_email, app.program_name)} className={`${t.textMuted} hover:text-[#2CD87D] hover:bg-[#2CD87D]/10 p-2 rounded-lg transition-all`}>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>
                                  </button>
                                  <button onClick={() => handleReject(app.id, app.user_email, app.program_name)} className={`${t.textMuted} hover:text-[#F45B69] hover:bg-[#F45B69]/10 p-2 rounded-lg transition-all`}>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            // ── ACTIVE NODES actions: Rewards + Delete + Deactivate ──
                            <td className="py-5 px-8 text-right">
                              <div className="flex gap-2 justify-end items-center">

                                {/* 🟢 MANAGE REWARDS BUTTON */}
                                <button
                                  onClick={() => setSelectedCenter(app)}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                                    isLightMode
                                      ? 'border-[#A8CFBA] bg-[#D8EDDF] text-[#2D6A4F] hover:bg-[#C4E0CF]'
                                      : 'border-[#52B788]/30 bg-[#52B788]/10 text-[#52B788] hover:bg-[#52B788]/20'
                                  }`}
                                  title="Manage rewards for this center"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                                  </svg>
                                  Rewards
                                </button>

                                {/* Delete */}
                                <button onClick={() => handleDelete(app.id, app.program_name)} className={`${t.textMuted} hover:text-[#F45B69] hover:bg-[#F45B69]/10 p-2 rounded-lg transition-all`}>
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>

                                {/* Deactivate */}
                                <button onClick={() => handleDeactivate(app.id, app.program_name)} className={`${t.textMuted} hover:text-[#FF9800] hover:bg-[#FF9800]/10 p-2 rounded-lg transition-all`}>
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636a9 9 0 11-12.728 0M12 3v9" /></svg>
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <div className={`h-1 w-full bg-gradient-to-r from-transparent ${isLightMode ? 'via-[#98BAA3]/40' : 'via-[#2CD87D]/30'} to-transparent`} />
          </ThemedCard>

          <div className="h-12" />
        </div>
      </div>

      {/* ── Rewards Drawer ── */}
      {selectedCenter && (
        <RewardsDrawer
          center={selectedCenter}
          onClose={() => setSelectedCenter(null)}
          isLightMode={isLightMode}
          t={t}
        />
      )}

      <GuidePanel page="dropoff" />

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      ` }} />
    </div>
  );
};

export default DropOffNodes;
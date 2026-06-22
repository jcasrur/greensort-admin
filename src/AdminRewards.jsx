import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from './Sidebar';
import { supabase } from './supabase';
import { useTheme } from './ThemeContext';
import { useToast } from './Toast';

// ─── WISHCRAFT accepted recyclable materials (from manual + questionnaire) ─────
const WISHCRAFT_MATERIALS = [
  { name: 'Newspaper',             category: 'Paper',   icon: '📰', condition: 'Clean and dry newspapers, bundled or stacked properly.' },
  { name: 'Carton / Cardboard',    category: 'Carton',  icon: '📦', condition: 'Flattened, clean, and dry cartons or cardboard.' },
  { name: 'PET Bottles',           category: 'Plastic', icon: '🧴', condition: 'Empty, clean, and dry PET bottles. Remove leftover liquid before surrender.' },
  { name: 'Aluminum Cans',         category: 'Metal',   icon: '🥫', condition: 'Clean and empty aluminum cans.' },
  { name: 'Iron Scraps',           category: 'Metal',   icon: '🔧', condition: 'Clean iron scrap only. Must be safe for handling.' },
  { name: 'Tin Cans',              category: 'Metal',   icon: '🥫', condition: 'Clean, empty, and safe tin cans. Avoid sharp or unsafe edges.' },
  { name: 'Glass Bottles', category: 'Glass',   icon: '🍾', condition: 'Clean clear glass bottles only. Handle carefully.' },
];

const CATEGORY_CONFIG = {
  Paper:     { bg: 'bg-emerald-500/10', text: 'text-emerald-500',  dot: 'bg-emerald-500'  },
  Carton:    { bg: 'bg-amber-500/10',   text: 'text-amber-500',    dot: 'bg-amber-500'    },
  Plastic:   { bg: 'bg-blue-500/10',    text: 'text-blue-400',     dot: 'bg-blue-400'     },
  Metal:     { bg: 'bg-slate-500/10',   text: 'text-slate-400',    dot: 'bg-slate-400'    },
  Glass:     { bg: 'bg-cyan-500/10',    text: 'text-cyan-400',     dot: 'bg-cyan-400'     },
  General:   { bg: 'bg-green-500/10',   text: 'text-green-400',    dot: 'bg-green-400'    },
};

const REQUIRED_TAG = 'WISHCRAFT_SUBMITTABLE';

function buildTags(category) {
  const safe = (category || 'General').replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
  return `${REQUIRED_TAG},WISHCRAFT,SCHOOL_RECYCLABLE,${safe}`;
}

function getCategory(item) { return item?.category || 'General'; }

function getPricePerKg(item) {
  const v = item?.peso_per_kg ?? item?.points_per_kg ?? item?.credit_per_kg ?? item?.value_per_kg ?? 10;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 10;
}

function getUnit(item) {
  return item?.unit === 'pcs' ? 'pcs' : 'kg';
}

function priceLabel(item) {
  return `₱${getPricePerKg(item)}/${getUnit(item)}`;
}

function isLive(item) {
  if (!item?.is_available) return false;
  return String(item?.tags || '').toUpperCase().includes(REQUIRED_TAG);
}

// ─── Image uploader ────────────────────────────────────────────────────────────
function ImageUploader({ value, onChange, isLightMode, t }) {
  const [uploading, setUploading] = useState(false);
  const [preview,   setPreview]   = useState(value || '');
  const inputRef = useRef(null);
  useEffect(() => { setPreview(value || ''); }, [value]);

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB.'); return; }
    setUploading(true);
    try {
      const ext  = file.name.split('.').pop();
      const path = `materials/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      
      // BINAGO: 'wishcraft-incentive' na ang gagamitin na bucket
      const { error: upErr } = await supabase.storage.from('wishcraft-incentive').upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      
      // BINAGO: Dito rin kukunin ang public URL
      const { data: urlData } = supabase.storage.from('wishcraft-incentive').getPublicUrl(path);
      const url = urlData?.publicUrl;
      
      setPreview(url); onChange(url);
    } catch (err) {
      console.error("Supabase Upload Error:", err);
      alert("Failed to upload image. Check your bucket name and RLS policies.");
    } finally { 
      setUploading(false); 
    }
  };

  return (
    <div className="space-y-2">
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`relative rounded-2xl border-2 border-dashed cursor-pointer overflow-hidden transition-all
          ${isLightMode ? 'border-[#D0DDD2] hover:border-[#2D6A4F]/50' : 'border-white/[0.12] hover:border-[#34D399]/30'}`}
        style={{ minHeight: 120 }}>
        {preview ? (
          <div className="relative group">
            <img src={preview} alt="Material" className="w-full h-32 object-cover"/>
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <svg className="w-6 h-6 animate-spin text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
              </div>
            )}
            {!uploading && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-xs font-semibold">Change image</span>
              </div>
            )}
          </div>
        ) : (
          <div className={`flex flex-col items-center justify-center py-8 gap-2 ${isLightMode ? 'text-[#7A9A7D]' : 'text-[#5A7A5A]'}`}>
            {uploading ? (
              <><svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg><span className="text-xs">Uploading...</span></>
            ) : (
              <><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg><span className="text-xs font-medium">Drop image or click to upload</span><span className="text-[10px] opacity-60">PNG, JPG up to 5MB</span></>
            )}
          </div>
        )}
      </div>
      <input type="url" value={preview} onChange={e => { setPreview(e.target.value); onChange(e.target.value); }}
        placeholder="Or paste image URL..."
        className={`w-full px-3 py-2 rounded-xl text-xs border outline-none transition-colors ${isLightMode ? 'bg-[#F7F9F6] border-[#E3E8E1] text-[#1A2A1A] placeholder:text-[#92A394] focus:border-[#2D6A4F]' : 'bg-white/[0.03] border-white/[0.06] text-[#E8F0E5] placeholder:text-[#5A7A5A] focus:border-[#34D399]/40'}`}/>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}/>
    </div>
  );
}

function CategoryBadge({ category }) {
  const cfg = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.General;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}/>{category}
    </span>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function AdminRewards() {
  const { isLightMode, t } = useTheme();
  const toast = useToast();

  const [items,         setItems]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [search,        setSearch]        = useState('');
  const [catFilter,     setCatFilter]     = useState('All');
  const [statusFilter,  setStatusFilter]  = useState('All');
  const [viewMode,      setViewMode]      = useState('grid');
  const [showForm,      setShowForm]      = useState(false);
  const [editingItem,   setEditingItem]   = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const DEFAULT_FORM = { name:'', category:'', description:'', condition:'', checklist:'', price_per_kg:'10', unit:'kg', image_url:'', is_available:true };
  const [form, setForm] = useState(DEFAULT_FORM);

  const inp = `w-full px-3.5 py-3 rounded-xl border outline-none text-sm transition-all ${isLightMode ? 'bg-[#F7F9F6] border-[#E3E8E1] text-[#1A2A1A] placeholder:text-[#92A394] focus:border-[#2D6A4F] focus:ring-4 focus:ring-[#2D6A4F]/8' : 'bg-white/[0.03] border-white/[0.07] text-[#E8F0E5] placeholder:text-[#5A7A5A] focus:border-[#34D399]/40 focus:ring-4 focus:ring-[#34D399]/8'}`;
  const lbl = `block text-[10px] font-bold uppercase tracking-widest mb-2 ${t.textMuted}`;
  const accentGreen = isLightMode ? '#2D6A4F' : '#34D399';

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('rewards_inventory').select('*').order('created_at', { ascending: false });
    if (error) { toast.error('Failed to load materials'); setItems([]); }
    else setItems((data || []).filter(i => String(i.tags || '').includes(REQUIRED_TAG)));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase.channel('rewards-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'rewards_inventory' }, load).subscribe();
    return () => supabase.removeChannel(ch);
  }, [load]);

  const categories = useMemo(() => ['All', ...new Set(items.map(getCategory))], [items]);

  const filtered = useMemo(() => {
    const kw = search.toLowerCase().trim();
    return items.filter(i => {
      const ms = !kw || (i.name||'').toLowerCase().includes(kw) || (i.category||'').toLowerCase().includes(kw) || (i.condition||'').toLowerCase().includes(kw);
      const mc = catFilter === 'All' || getCategory(i) === catFilter;
      const mst = statusFilter === 'All' || (statusFilter === 'Live' && isLive(i)) || (statusFilter === 'Hidden' && !isLive(i));
      return ms && mc && mst;
    });
  }, [items, search, catFilter, statusFilter]);

  const stats = useMemo(() => {
    const live = items.filter(isLive);
    const rates = items.map(getPricePerKg);
    const avg = rates.length > 0 ? rates.reduce((a,b) => a+b, 0) / rates.length : 0;
    const max = rates.length > 0 ? Math.max(...rates) : 0;
    return { total: items.length, live: live.length, hidden: items.length - live.length, avg, max };
  }, [items]);

  const openCreate = () => { setEditingItem(null); setForm(DEFAULT_FORM); setShowForm(true); };
  const openEdit = (item) => {
    setEditingItem(item);
    setForm({ name: item.name||'', category: getCategory(item), description: item.description||'', condition: item.condition||'', checklist: item.checklist||'', price_per_kg: String(getPricePerKg(item)), unit: getUnit(item), image_url: item.waste_image_url||item.image_url||'', is_available: Boolean(item.is_available) });
    setShowForm(true);
  };

  const pickMaterial = (name) => {
    const found = WISHCRAFT_MATERIALS.find(m => m.name === name);
    setForm(prev => ({ ...prev, name, category: found?.category||prev.category, condition: found?.condition||prev.condition, description: found ? `${found.name} accepted for WISHCRAFT school surrender.` : prev.description, checklist: found ? 'Keep clean, dry, sorted, and ready for checking at the MRF Receiving Station.' : prev.checklist }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    const price = Number(form.price_per_kg);
    if (!name) { toast.error('Material name is required'); return; }
    if (!Number.isFinite(price) || price <= 0) { toast.error('₱ value must be greater than 0'); return; }
    
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const email = auth?.user?.email || 'admin@caviteinstitute.edu.ph';
    
    // Now inserting peso_per_kg directly
    const payload = { 
      user_email: email, 
      name, 
      category: form.category, 
      description: form.description.trim() || `${name} accepted for WISHCRAFT school surrender.`, 
      condition: form.condition.trim() || 'Must be clean, dry, and properly sorted.', 
      checklist: form.checklist.trim() || 'Clean, dry, sorted, and ready for MRF check.', 
      peso_per_kg: price,
      unit: form.unit || 'kg',
      waste_image_url: form.image_url || null, 
      image_url: form.image_url || null, 
      is_available: form.is_available, 
      tags: buildTags(form.category), 
      updated_at: new Date().toISOString() 
    };
    
    const result = editingItem?.id
      ? await supabase.from('rewards_inventory').update(payload).eq('id', editingItem.id)
      : await supabase.from('rewards_inventory').insert([payload]);
      
    if (result.error) toast.error(result.error.message || 'Failed to save');
    else { toast.success(editingItem ? 'Material updated' : 'Material added — visible on mobile'); setShowForm(false); load(); }
    setSaving(false);
  };

  const toggleLive = async (item) => {
    const { error } = await supabase.from('rewards_inventory').update({ is_available: !item.is_available }).eq('id', item.id);
    if (error) toast.error(error.message);
    else { toast.success(item.is_available ? 'Hidden from mobile' : 'Now visible on mobile'); load(); }
  };

  const handleDelete = async (item) => {
    const { error } = await supabase.from('rewards_inventory').delete().eq('id', item.id);
    if (error) toast.error(error.message);
    else { toast.success('Deleted'); setDeleteConfirm(null); load(); }
  };

  return (
    <div className={`flex h-screen w-full font-sans ${t.bg} transition-colors duration-300 overflow-hidden`}>
      <Sidebar />

      <div className="flex-1 h-full overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">

          {/* Header */}
          <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${isLightMode ? 'bg-[#D8EDDF] text-[#2D6A4F]' : 'bg-[#2D6A4F]/20 text-[#34D399]'}`}>WISHCRAFT</span>
                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${isLightMode ? 'bg-[#F3F6F1] text-[#5E7A67]' : 'bg-white/[0.05] text-[#A8BDA2]'}`}></span>
              </div>
              <h1 className={`text-3xl font-bold tracking-tight ${t.textMain}`}>Available Waste Types</h1>
              <p className={`text-sm mt-1 max-w-xl ${t.textMuted}`}>
                Manage accepted recyclable materials and their estimated contribution value per kg shown in the student mobile app.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={load} className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${isLightMode ? 'bg-white border-[#E3E8E1] text-[#4A5D4E] hover:bg-[#F7F9F6]' : 'bg-white/[0.03] border-white/[0.07] text-[#A8BDA2] hover:bg-white/[0.06]'}`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                Refresh
              </button>
              <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-sm" style={{ background: accentGreen }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M5 12h14"/></svg>
                Add Material
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Materials',  value: stats.total,                           sub: 'In database',          accent: isLightMode ? 'bg-[#D8EDDF] text-[#2D6A4F]' : 'bg-[#2D6A4F]/20 text-[#34D399]' },
              { label: 'Live on Mobile',   value: stats.live,                            sub: 'Visible to students',  accent: isLightMode ? 'bg-[#DDE9F5] text-[#2A5FA8]' : 'bg-[#4A9ECC]/10 text-[#4A9ECC]' },
              { label: 'Avg. ₱ Value',      value: `₱${stats.avg.toFixed(2)}`,           sub: 'Across all materials', accent: isLightMode ? 'bg-amber-100 text-amber-700' : 'bg-amber-500/10 text-amber-400' },
              { label: 'Highest Value',     value: `₱${stats.max.toFixed(2)}`,            sub: 'Best value material',  accent: isLightMode ? 'bg-[#D8EDDF] text-[#2D6A4F]' : 'bg-[#2D6A4F]/20 text-[#34D399]' },
            ].map(c => (
              <div key={c.label} className={`rounded-2xl border p-5 ${isLightMode ? 'bg-white border-[#E8F0E9] shadow-sm' : 'bg-[#0F1F0F] border-white/[0.05]'}`}>
                <div className={`inline-flex text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full mb-3 ${c.accent}`}>{c.label}</div>
                <p className={`text-3xl font-bold leading-none ${t.textMain}`}>{c.value}</p>
                <p className={`text-[11px] mt-1.5 ${t.textMuted}`}>{c.sub}</p>
              </div>
            ))}
          </div>

          {/* Info banner */}
          <div className={`mb-5 rounded-2xl border px-4 py-3 flex items-start gap-3 ${isLightMode ? 'bg-[#F0F7F3] border-[#C8E0D3]' : 'bg-[#0D1A12] border-[#1E4030]'}`}>
            <svg className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isLightMode ? 'text-[#2D6A4F]' : 'text-[#34D399]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <p className={`text-xs leading-relaxed ${isLightMode ? 'text-[#2D6A4F]' : 'text-[#52B788]'}`}>
              <strong>WISHCRAFT flow:</strong> Student picks material on mobile → generates QR → staff scans at MRF → weight recorded →
              <strong> estimated fund value = quantity × ₱/unit rate</strong> → Credited to the centralized WISHCRAFT fund, classroom contribution, or general scholarship.
              Set ₱/unit to match the current junk shop buying price. Choose kg for materials sold by weight, pcs for items sold by count.
            </p>
          </div>

          {/* Filters */}
          <div className={`mb-4 rounded-2xl border p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center ${isLightMode ? 'bg-white border-[#E8F0E9]' : 'bg-[#0F1F0F] border-white/[0.05]'}`}>
            <div className="relative flex-1 w-full sm:w-auto">
              <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${t.textMuted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search material or category..." className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border outline-none transition-colors ${isLightMode ? 'bg-[#F7F9F6] border-[#E3E8E1] text-[#1A2A1A] placeholder:text-[#9AB09E] focus:border-[#2D6A4F]' : 'bg-white/[0.03] border-white/[0.07] text-[#E8F0E5] placeholder:text-[#5A7A5A] focus:border-[#34D399]/40'}`}/>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {categories.map(c => (
                <button key={c} onClick={() => setCatFilter(c)} className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all ${catFilter === c ? (isLightMode ? 'bg-[#2D6A4F] text-white' : 'bg-[#34D399] text-[#061008]') : (isLightMode ? 'bg-[#F3F6F1] text-[#4A5D4E] hover:bg-[#E8F0E9]' : 'bg-white/[0.04] text-[#A8BDA2] hover:bg-white/[0.08]')}`}>{c}</button>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {['All', 'Live', 'Hidden'].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all ${statusFilter === s ? (isLightMode ? 'bg-[#1A2A1A] text-white' : 'bg-white/[0.12] text-white') : (isLightMode ? 'text-[#5E7A67] hover:bg-[#F3F6F1]' : 'text-[#A8BDA2] hover:bg-white/[0.06]')}`}>{s}</button>
              ))}
              <div className={`h-6 w-px mx-1 ${isLightMode ? 'bg-[#E3E8E1]' : 'bg-white/[0.08]'}`}/>
              {[['grid', <><rect x="3" y="3" width="7" height="7" rx="1" strokeWidth={1.75}/><rect x="14" y="3" width="7" height="7" rx="1" strokeWidth={1.75}/><rect x="3" y="14" width="7" height="7" rx="1" strokeWidth={1.75}/><rect x="14" y="14" width="7" height="7" rx="1" strokeWidth={1.75}/></>], ['table', <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 10h18M3 14h18M10 4v16"/>]].map(([v, icon]) => (
                <button key={v} onClick={() => setViewMode(v)} title={v} className={`p-1.5 rounded-lg transition-all ${viewMode === v ? (isLightMode ? 'bg-[#2D6A4F] text-white' : 'bg-[#34D399] text-[#061008]') : (isLightMode ? 'text-[#5E7A67] hover:bg-[#F3F6F1]' : 'text-[#A8BDA2] hover:bg-white/[0.06]')}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{icon}</svg>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <svg className={`w-6 h-6 animate-spin ${t.textMuted}`} fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
              <span className={`ml-3 text-sm ${t.textMuted}`}>Loading materials...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className={`rounded-2xl border py-16 text-center ${isLightMode ? 'bg-white border-[#E8F0E9]' : 'bg-[#0F1F0F] border-white/[0.05]'}`}>
              <p className={`text-sm font-medium ${t.textMain}`}>No materials found</p>
              <p className={`text-xs mt-1 ${t.textMuted}`}>{items.length === 0 ? 'Click "Add Material" to create an accepted material.' : 'Try adjusting your filters.'}</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(item => {
                const live = isLive(item);
                const mat  = WISHCRAFT_MATERIALS.find(m => m.name === item.name);
                return (
                  <div key={item.id} className={`group rounded-2xl border overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${isLightMode ? 'bg-white border-[#E8F0E9]' : 'bg-[#0F1F0F] border-white/[0.05]'} ${!live ? 'opacity-60' : ''}`}>
                    <div className="relative h-36 overflow-hidden" style={{ background: isLightMode ? '#F0F7F3' : '#0A1A10' }}>
                      {item.waste_image_url || item.image_url ? (
                        <img src={item.waste_image_url || item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><span className="text-5xl select-none">{mat?.icon || '♻️'}</span></div>
                      )}
                      <div className="absolute top-2.5 left-2.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${live ? 'bg-green-500 text-white shadow-sm shadow-green-500/30' : (isLightMode ? 'bg-white/90 text-gray-500' : 'bg-black/60 text-gray-400')}`}>{live ? '● Live' : '○ Hidden'}</span></div>
                      <div className="absolute top-2.5 right-2.5"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/50 text-white backdrop-blur-sm">{priceLabel(item)}</span></div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className={`text-sm font-bold truncate ${t.textMain}`}>{item.name}</p>
                          <CategoryBadge category={getCategory(item)}/>
                        </div>
                      </div>
                      <p className={`text-[11px] leading-relaxed line-clamp-2 mt-2 ${t.textMuted}`}>{item.condition || 'Clean, dry, and sorted.'}</p>
                      <div className={`mt-3 flex items-center justify-between rounded-xl px-3 py-2 ${isLightMode ? 'bg-[#F0F7F3]' : 'bg-white/[0.04]'}`}>
                        <span className={`text-[10px] font-semibold ${t.textMuted}`}>Contribution Value</span>
                        <span className={`text-sm font-bold ${isLightMode ? 'text-[#2D6A4F]' : 'text-[#34D399]'}`}>₱{getPricePerKg(item)}<span className={`text-[10px] font-normal ${t.textMuted}`}>/{getUnit(item)}</span></span>
                      </div>
                      <div className="flex gap-1.5 mt-3">
                        <button onClick={() => openEdit(item)} className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${isLightMode ? 'bg-[#F3F6F1] text-[#2D4A38] hover:bg-[#D8EDDF]' : 'bg-white/[0.05] text-[#C4D9CC] hover:bg-white/[0.09]'}`}>Edit</button>
                        <button onClick={() => toggleLive(item)} className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${live ? (isLightMode ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/15') : (isLightMode ? 'bg-[#D8EDDF] text-[#2D6A4F] hover:bg-[#c8dfd0]' : 'bg-[#2D6A4F]/20 text-[#34D399] hover:bg-[#2D6A4F]/30')}`}>{live ? 'Hide' : 'Show'}</button>
                        <button onClick={() => setDeleteConfirm(item)} className={`px-2.5 py-1.5 rounded-xl text-xs transition-all ${isLightMode ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-red-500/10 text-red-400 hover:bg-red-500/15'}`}>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={`rounded-2xl border overflow-hidden ${isLightMode ? 'bg-white border-[#E8F0E9]' : 'bg-[#0F1F0F] border-white/[0.05]'}`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead className={isLightMode ? 'bg-[#F7F9F6]' : 'bg-white/[0.02]'}>
                    <tr>{['Material', 'Category', 'Condition', '₱/unit', 'Unit', 'Status', 'Actions'].map(h => <th key={h} className={`px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest ${t.textMuted}`}>{h}</th>)}</tr>
                  </thead>
                  <tbody className={`divide-y ${isLightMode ? 'divide-[#F0F4EE]' : 'divide-white/[0.04]'}`}>
                    {filtered.map(item => {
                      const live = isLive(item);
                      const mat  = WISHCRAFT_MATERIALS.find(m => m.name === item.name);
                      return (
                        <tr key={item.id} className={`transition-colors ${isLightMode ? 'hover:bg-[#F7F9F6]' : 'hover:bg-white/[0.02]'} ${!live ? 'opacity-60' : ''}`}>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 ${isLightMode ? 'bg-[#F0F7F3]' : 'bg-white/[0.05]'}`}>
                                {item.waste_image_url||item.image_url ? <img src={item.waste_image_url||item.image_url} alt={item.name} className="w-full h-full object-cover"/> : <span className="text-lg">{mat?.icon||'♻️'}</span>}
                              </div>
                              <p className={`text-sm font-semibold ${t.textMain}`}>{item.name}</p>
                            </div>
                          </td>
                          <td className="px-5 py-4"><CategoryBadge category={getCategory(item)}/></td>
                          <td className="px-5 py-4"><p className={`text-xs max-w-[220px] leading-relaxed line-clamp-2 ${t.textMuted}`}>{item.condition||'Clean, dry, and sorted.'}</p></td>
                          <td className="px-5 py-4"><p className={`text-sm font-bold ${isLightMode ? 'text-[#2D6A4F]' : 'text-[#34D399]'}`}>₱{getPricePerKg(item)}</p></td>
                          <td className="px-5 py-4"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getUnit(item) === 'pcs' ? (isLightMode ? 'bg-blue-50 text-blue-700' : 'bg-blue-500/10 text-blue-400') : (isLightMode ? 'bg-[#D8EDDF] text-[#2D6A4F]' : 'bg-[#2D6A4F]/20 text-[#34D399]')}`}>{getUnit(item)}</span></td>
                          <td className="px-5 py-4"><span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${live ? 'bg-green-500/10 text-green-500' : (isLightMode ? 'bg-[#F3F6F1] text-[#9AB09E]' : 'bg-white/[0.04] text-[#5A7A5A]')}`}>{live ? '● Live' : '○ Hidden'}</span></td>
                          <td className="px-5 py-4">
                            <div className="flex gap-1.5">
                              <button onClick={() => openEdit(item)} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${isLightMode ? 'bg-[#F3F6F1] text-[#2D4A38] hover:bg-[#D8EDDF]' : 'bg-white/[0.05] text-[#C4D9CC] hover:bg-white/[0.09]'}`}>Edit</button>
                              <button onClick={() => toggleLive(item)} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${live ? (isLightMode ? 'bg-amber-50 text-amber-700' : 'bg-amber-500/10 text-amber-400') : (isLightMode ? 'bg-[#D8EDDF] text-[#2D6A4F]' : 'bg-[#2D6A4F]/20 text-[#34D399]')}`}>{live ? 'Hide' : 'Show'}</button>
                              <button onClick={() => setDeleteConfirm(item)} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${isLightMode ? 'bg-red-50 text-red-500' : 'bg-red-500/10 text-red-400'}`}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="h-12"/>
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setShowForm(false)}>
          <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${isLightMode ? 'bg-white border-[#E3E8E1]' : 'bg-[#101A12] border-white/[0.08]'}`} onClick={e => e.stopPropagation()}>

            <div className={`flex items-center justify-between px-6 py-5 border-b flex-shrink-0 ${isLightMode ? 'border-[#E3E8E1]' : 'border-white/[0.07]'}`}>
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isLightMode ? 'text-[#2D6A4F]' : 'text-[#34D399]'}`}>{editingItem ? 'Update' : 'New'} WISHCRAFT Material</p>
                <h2 className={`text-lg font-bold ${t.textMain}`}>{editingItem ? `Edit: ${editingItem.name}` : 'Add Accepted Material'}</h2>
              </div>
              <button onClick={() => setShowForm(false)} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isLightMode ? 'hover:bg-[#F3F6F1] text-[#5E7A67]' : 'hover:bg-white/[0.07] text-[#A8BDA2]'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-5 space-y-4" style={{ scrollbarWidth: 'none' }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={lbl}>Material Name *</label>
                  <input
                    value={form.name}
                    onChange={e => { setForm(f => ({ ...f, name: e.target.value })); pickMaterial(e.target.value); }}
                    placeholder="Type a name or pick from below..."
                    className={inp}
                    required
                  />
                  <div className={`mt-2 grid grid-cols-2 sm:grid-cols-3 gap-1.5`}>
                    {WISHCRAFT_MATERIALS.map(m => {
                      const cfg = CATEGORY_CONFIG[m.category] || CATEGORY_CONFIG.General;
                      const isSelected = form.name === m.name;
                      return (
                        <button
                          key={m.name}
                          type="button"
                          onClick={() => pickMaterial(m.name)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold transition-all border ${
                            isSelected
                              ? (isLightMode ? 'bg-[#D8EDDF] border-[#2D6A4F] text-[#1A2A1A]' : 'bg-[#2D6A4F]/30 border-[#34D399]/50 text-[#E8F0E5]')
                              : (isLightMode ? 'bg-[#F7F9F6] border-[#E3E8E1] text-[#4A5D4E] hover:bg-[#EDFAF2] hover:border-[#2D6A4F]/30' : 'bg-white/[0.03] border-white/[0.06] text-[#A8BDA2] hover:bg-white/[0.07] hover:border-white/[0.12]')
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`}/>
                          <span className="truncate">{m.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className={lbl}>Estimated Contribution Value *</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold ${isLightMode ? 'text-[#2D6A4F]' : 'text-[#34D399]'}`}>₱</span>
                      <input type="number" min="0.01" step="0.01" value={form.price_per_kg} onChange={e => setForm(f => ({ ...f, price_per_kg: e.target.value }))} className={`${inp} pl-8`} required/>
                    </div>
                    <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: isLightMode ? '#E3E8E1' : 'rgba(255,255,255,0.07)' }}>
                      {['kg','pcs'].map(u => (
                        <button key={u} type="button"
                          onClick={() => setForm(f => ({ ...f, unit: u }))}
                          className={`px-4 py-2 text-sm font-bold transition-all ${form.unit === u
                            ? (isLightMode ? 'bg-[#2D6A4F] text-white' : 'bg-[#34D399] text-[#061008]')
                            : (isLightMode ? 'bg-[#F7F9F6] text-[#5E7A67] hover:bg-[#E8F0E9]' : 'bg-white/[0.03] text-[#A8BDA2] hover:bg-white/[0.07]')
                          }`}>
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className={`text-[10px] mt-1 ${t.textMuted}`}>Set ₱/{form.unit} — match current junk shop buying price</p>
                </div>

              </div>

              <div>
                <label className={lbl}>Material Photo</label>
                <ImageUploader value={form.image_url} onChange={url => setForm(f => ({ ...f, image_url: url }))} isLightMode={isLightMode} t={t}/>
              </div>

              <div>
                <label className={lbl}>Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description shown to students" rows={2} className={`${inp} resize-none`}/>
              </div>
              <div>
                <label className={lbl}>Accepted Condition</label>
                <textarea value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))} placeholder="What condition is required for acceptance" rows={3} className={`${inp} resize-none`}/>
              </div>
              <div>
                <label className={lbl}>Preparation Checklist</label>
                <textarea value={form.checklist} onChange={e => setForm(f => ({ ...f, checklist: e.target.value }))} placeholder="Steps students need to follow before surrendering" rows={2} className={`${inp} resize-none`}/>
              </div>
            </form>

            <div className={`px-6 py-4 border-t flex gap-2 flex-shrink-0 ${isLightMode ? 'border-[#E3E8E1]' : 'border-white/[0.07]'}`}>
              <button type="button" onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50" style={{ background: accentGreen }}>
                {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Add Material'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className={`px-5 py-3 rounded-xl text-sm font-semibold transition-all ${isLightMode ? 'bg-[#F3F6F1] text-[#4A5D4E] hover:bg-[#E8F0E9]' : 'bg-white/[0.04] text-[#A8BDA2] hover:bg-white/[0.08]'}`}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setDeleteConfirm(null)}>
          <div className={`w-full max-w-sm rounded-2xl border shadow-2xl p-6 ${isLightMode ? 'bg-white border-[#E3E8E1]' : 'bg-[#101A12] border-white/[0.08]'}`} onClick={e => e.stopPropagation()}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${isLightMode ? 'bg-red-50' : 'bg-red-500/10'}`}>
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </div>
            <h3 className={`text-sm font-bold ${t.textMain} mb-1`}>Delete Material?</h3>
            <p className={`text-xs ${t.textMuted} mb-5`}>"<span className="font-semibold">{deleteConfirm.name}</span>" will be removed from the mobile app. Cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors">Delete</button>
              <button onClick={() => setDeleteConfirm(null)} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${isLightMode ? 'bg-[#F3F6F1] text-[#4A5D4E]' : 'bg-white/[0.04] text-[#A8BDA2]'}`}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
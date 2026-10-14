import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ShieldCheck, GraduationCap, RefreshCw, Search, UsersRound } from 'lucide-react';
import Sidebar from './Sidebar';
import { supabase } from './supabase';
import { useTheme } from './ThemeContext';

// Fetch in batches so the directory is not silently capped at Supabase's default 1,000 rows.
const BATCH_SIZE = 500;
const PAGE_SIZE = 20;
const display = value => String(value ?? '').trim() || '—';

export default function Users() {
  const { t, isLightMode } = useTheme();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchProfiles = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const rows = [];
      for (let offset = 0; ; offset += BATCH_SIZE) {
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, status')
          .order('id', { ascending: true })
          .range(offset, offset + BATCH_SIZE - 1)
          .abortSignal(signal);
        if (fetchError) throw fetchError;
        rows.push(...(data || []));
        if (!data || data.length < BATCH_SIZE) break;
      }
      if (!signal.aborted) setUsers(rows);
    } catch (err) {
      if (!signal.aborted) setError(err.message || 'Unable to load user profiles.');
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchProfiles(controller.signal);
    return () => controller.abort();
  }, [fetchProfiles, refreshKey]);

  const stats = useMemo(() => ({
    totalUsers: users.length,
    totalAdmin: users.filter(u => ['admin', 'super_admin'].includes(String(u.role ?? '').trim().toLowerCase())).length,
    totalStudents: users.filter(u => ['student', 'students', 'resident'].includes(String(u.role ?? '').trim().toLowerCase())).length,
  }), [users]);

  const filtered = useMemo(() => users.filter(u => {
    const role = String(u.role ?? '').trim().toLowerCase();
    const status = String(u.status ?? '').trim().toLowerCase();
    const roleMatches = roleFilter === 'all' ||
      (roleFilter === 'admin' && ['admin', 'super_admin'].includes(role)) ||
      (roleFilter === 'student' && ['student', 'students', 'resident'].includes(role));
    const statusMatches = statusFilter === 'all' || status === statusFilter;
    const q = search.trim().toLowerCase();
    return roleMatches && statusMatches &&
      [u.email, u.full_name, u.status].some(value => String(value ?? '').toLowerCase().includes(q));
  }), [users, search, roleFilter, statusFilter]);
  const statuses = useMemo(() => [...new Set(users.map(u => String(u.status ?? '').trim().toLowerCase()).filter(Boolean))].sort(), [users]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const card = isLightMode ? 'bg-white border-[#E4ECE4]' : 'bg-[#101D14] border-white/[0.08]';
  const fieldStats = [
    { label: 'Total Users', value: stats.totalUsers, icon: UsersRound },
    { label: 'Total Admin', value: stats.totalAdmin, icon: ShieldCheck },
    { label: 'Total Students', value: stats.totalStudents, icon: GraduationCap },
  ];

  return (
    <div className={`flex h-[100dvh] w-full font-sans ${t.bg} overflow-hidden transition-colors duration-300`}>
      <Sidebar />
      <main className="flex-1 min-w-0 h-full overflow-y-auto pt-16 md:pt-0">
        <div className="p-4 sm:p-6 lg:p-10 max-w-[1600px] mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-7">
            <div>
              <h1 className={`text-2xl sm:text-3xl font-bold ${t.textMain}`}>Users</h1>
              <p className={`mt-1 text-sm ${t.textMuted}`}>User directory from Supabase profiles</p>
            </div>
            <button type="button" onClick={() => { setPage(1); setRefreshKey(k => k + 1); }} disabled={loading}
              className={`flex gap-2 items-center px-4 py-2.5 rounded-xl border text-sm font-semibold ${card} ${t.textMain} hover:opacity-80 disabled:opacity-50`}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''}/> Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
            {fieldStats.map(({ label, value, icon: Icon }) => (
              <div key={label} className={`rounded-2xl border p-4 sm:p-5 ${card}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-xs sm:text-sm font-medium ${t.textMuted}`}>{label}</p>
                  <span className={`rounded-xl p-2 ${isLightMode ? 'bg-[#E5F3E9] text-[#2D6A4F]' : 'bg-emerald-500/10 text-emerald-400'}`}><Icon size={18}/></span>
                </div>
                <p className={`text-2xl sm:text-3xl font-bold mt-4 ${t.textMain}`}>{loading ? '…' : value.toLocaleString()}</p>
              </div>
            ))}
          </div>

          <section className={`rounded-2xl border overflow-hidden ${card}`}>
            <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <UsersRound size={19} className={isLightMode ? 'text-[#2D6A4F]' : 'text-emerald-400'}/>
                <h2 className={`text-base font-bold ${t.textMain}`}>User List</h2>
                <span className={`text-xs ${t.textMuted}`}>({filtered.length.toLocaleString()} users)</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                <select aria-label="Filter users by role" value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
                  className={`rounded-xl border px-3 py-2.5 text-sm ${card} ${t.textMain}`}>
                  <option value="all">All Users</option>
                  <option value="admin">Admins</option>
                  <option value="student">Students</option>
                </select>
                <select aria-label="Filter users by status" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                  className={`rounded-xl border px-3 py-2.5 text-sm ${card} ${t.textMain}`}>
                  <option value="all">All Statuses</option>
                  {statuses.map(status => <option key={status} value={status}>{status}</option>)}
                </select>
                <div className="relative flex-1 min-w-[190px] sm:w-72">
                  <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`}/>
                  <input aria-label="Search users" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Search name, email, status…"
                    className={`w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 ${card} ${t.textMain}`}/>
                </div>
              </div>
            </div>
            {error && <div role="alert" className="mx-4 mb-4 rounded-lg bg-red-500/10 text-red-500 p-3 text-sm">{error}. Check profiles SELECT permission (RLS) for the admin account.</div>}
            <div className="overflow-x-auto">
              <table className="min-w-[540px] w-full text-sm text-left">
                <thead className={isLightMode ? 'bg-[#F4F8F4] text-[#58715D]' : 'bg-white/[0.03] text-[#A8BDA2]'}>
                  <tr>{['Email', 'Full Name', 'Status'].map(name => <th key={name} className="px-5 py-3 font-semibold">{name}</th>)}</tr>
                </thead>
                <tbody>
                  {!loading && visible.map((user, index) => (
                    <tr key={user.id || `${user.email}-${index}`} className={`border-t ${isLightMode ? 'border-[#ECF1EC] hover:bg-[#F8FBF8]' : 'border-white/[0.06] hover:bg-white/[0.025]'}`}>
                      <td className={`px-5 py-3.5 ${t.textMain}`}>{display(user.email)}</td>
                      <td className={`px-5 py-3.5 font-medium ${t.textMain}`}>{display(user.full_name)}</td>
                      <td className="px-5 py-3.5"><span className={`inline-block rounded-lg px-2.5 py-1 text-xs font-semibold ${String(user.status ?? '').toLowerCase() === 'active' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-slate-500/10 text-slate-500'}`}>{display(user.status)}</span></td>
                    </tr>
                  ))}
                  {(loading || (!error && !visible.length)) && <tr><td colSpan={3} className={`text-center py-12 ${t.textMuted}`}>{loading ? 'Loading profiles…' : 'No users found.'}</td></tr>}
                </tbody>
              </table>
            </div>
            <div className={`flex flex-wrap items-center justify-between gap-3 p-4 border-t ${isLightMode ? 'border-[#ECF1EC]' : 'border-white/[0.06]'}`}>
              <p className={`text-xs ${t.textMuted}`}>{filtered.length ? `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} of ${filtered.length}` : '0 results'}</p>
              <div className="flex items-center gap-2">
                <button disabled={currentPage <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))} className={`px-3 py-2 border rounded-lg text-xs disabled:opacity-40 ${card} ${t.textMain}`}>Previous</button>
                <span className={`text-xs ${t.textMuted}`}>{currentPage} / {pages}</span>
                <button disabled={currentPage >= pages || loading} onClick={() => setPage(p => Math.min(pages, p + 1))} className={`px-3 py-2 border rounded-lg text-xs disabled:opacity-40 ${card} ${t.textMain}`}>Next</button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

// AdminAccess.jsx
// ─────────────────────────────────────────────────────────────────────────────
// RBAC Management Dashboard
//   • Super Admin can invite role-based admins
//   • Supported roles: Super Admin, School Admin, Accounting, Receiving Staff, Moderator
//   • Pending invitations show the selected role
//   • Admin roster is grouped by role
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './supabase';
import Sidebar from './Sidebar';
import { useTheme, ThemedCard } from './ThemeContext';
import { useAdminAuth } from './useAdminAuth';

const ROLE_META = {
  super_admin: {
    label: 'Super Admin',
    short: 'SA',
    description: 'Full access to all GreenSort admin sections, including Admin Access Control.',
    lightClass: 'bg-amber-50 text-amber-700 border-amber-200',
    darkClass: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
  },
  school_admin: {
    label: 'School Admin',
    short: 'SCH',
    description: 'Can access Dashboard/Reports, User Management, and WISHCRAFT Fund settings.',
    lightClass: 'bg-blue-50 text-blue-700 border-blue-200',
    darkClass: 'bg-blue-500/10 text-blue-400 border-blue-500/25',
  },
  accounting: {
    label: 'Accounting',
    short: 'ACC',
    description: 'Can access Accounting and Student Records for fund/contribution monitoring.',
    lightClass: 'bg-purple-50 text-purple-700 border-purple-200',
    darkClass: 'bg-purple-500/10 text-purple-400 border-purple-500/25',
  },
  receiving_staff: {
    label: 'Receiving Staff',
    short: 'MRF',
    description: 'Can access MRF receiving and inventory-related records.',
    lightClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    darkClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  },
  moderator: {
    label: 'Moderator',
    short: 'MOD',
    description: 'Can access moderation, reports, posts, comments, and flagged content.',
    lightClass: 'bg-slate-50 text-slate-700 border-slate-200',
    darkClass: 'bg-slate-500/10 text-slate-300 border-slate-500/25',
  },
  admin: {
    label: 'Admin',
    short: 'ADM',
    description: 'Legacy admin role. Use the specific roles above for new accounts.',
    lightClass: 'bg-[#E4EFE8] text-[#4A7D5C] border-[#98BAA3]/30',
    darkClass: 'bg-[#2CD87D]/10 text-[#2CD87D] border-[#2CD87D]/20',
  },
};

const ROLE_OPTIONS = [
  'school_admin',
  'accounting',
  'receiving_staff',
  'moderator',
  'super_admin',
];

const roleLabel = (role) => ROLE_META[role]?.label || 'Admin';
const roleDescription = (role) => ROLE_META[role]?.description || ROLE_META.admin.description;

const RoleBadge = ({ role, light }) => {
  const meta = ROLE_META[role] || ROLE_META.admin;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase border ${
        light ? meta.lightClass : meta.darkClass
      }`}
    >
      {role === 'super_admin' && (
        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      )}
      {meta.label}
    </span>
  );
};

const StatusDot = ({ active, light }) => (
  <span
    className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
      active
        ? light
          ? 'text-[#4A7D5C]'
          : 'text-[#2CD87D]'
        : light
          ? 'text-[#9B7B74]'
          : 'text-[#8A9B96]'
    }`}
  >
    <span
      className={`w-1.5 h-1.5 rounded-full ${
        active
          ? light
            ? 'bg-[#6C9A7D]'
            : 'bg-[#2CD87D] shadow-[0_0_6px_#2CD87D]'
          : light
            ? 'bg-[#C5A8A0]'
            : 'bg-[#35403C]'
      }`}
    />
    {active ? 'Active' : 'Inactive'}
  </span>
);

const Modal = ({ open, onClose, children, light }) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-xl rounded-3xl border shadow-2xl ${
          light ? 'bg-white border-[#F0F4F1]' : 'bg-[#0F1814] border-white/[0.07]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export default function AdminAccess() {
  const { isLightMode, t } = useTheme();
  const { adminUser, isSuperAdmin, loading: authLoading } = useAdminAuth();

  const [admins, setAdmins] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [activeTab, setActiveTab] = useState('roster');
  const [dataLoading, setDataLoading] = useState(true);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteRole, setInviteRole] = useState('school_admin');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [resendingInviteId, setResendingInviteId] = useState(null);

  const accentText = isLightMode ? 'text-[#4A7D5C]' : 'text-[#2CD87D]';

  const fetchData = useCallback(async () => {
    setDataLoading(true);

    try {
      const [{ data: adminRows, error: adminErr }, { data: invRows, error: invErr }] = await Promise.all([
        supabase.from('admin_users').select('*').order('created_at', { ascending: false }),
        supabase
          .from('admin_invitations')
          .select('*, admin_users!invited_by(email, full_name)')
          .eq('is_used', false)
          .order('created_at', { ascending: false }),
      ]);

      if (adminErr) throw adminErr;
      if (invErr) throw invErr;

      setAdmins(adminRows || []);
      setInvitations((invRows || []).filter((i) => new Date(i.expires_at) > new Date()));
    } catch (err) {
      console.error('fetchData error:', err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isSuperAdmin) fetchData();
  }, [authLoading, isSuperAdmin, fetchData]);

  const groupedAdmins = useMemo(() => {
    const groups = {
      super_admin: [],
      school_admin: [],
      accounting: [],
      receiving_staff: [],
      moderator: [],
      admin: [],
      other: [],
    };

    admins.forEach((admin) => {
      if (groups[admin.role]) groups[admin.role].push(admin);
      else groups.other.push(admin);
    });

    return groups;
  }, [admins]);

  const inviteCounts = useMemo(() => {
    return invitations.reduce((acc, inv) => {
      acc[inv.role] = (acc[inv.role] || 0) + 1;
      return acc;
    }, {});
  }, [invitations]);

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');

    const cleanEmail = inviteEmail.toLowerCase().trim();
    const cleanFullName = inviteFullName.trim();
    const selectedRole = inviteRole;

    if (!isSuperAdmin) {
      setInviteError('Only Super Admin can invite admin users.');
      return;
    }

    if (!cleanEmail) {
      setInviteError('Email is required.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setInviteError('Enter a valid email address.');
      return;
    }

    if (!ROLE_OPTIONS.includes(selectedRole)) {
      setInviteError('Please select a valid role.');
      return;
    }

    const existing = admins.find((a) => a.email?.toLowerCase() === cleanEmail);
    if (existing) {
      setInviteError('An admin user with that email already exists.');
      return;
    }

    setInviting(true);
    let createdInvitationId = null;

    try {
      const { data: inv, error: invErr } = await supabase
        .from('admin_invitations')
        .insert({
          email: cleanEmail,
          role: selectedRole,
          invited_by: adminUser.id,
        })
        .select()
        .single();

      if (invErr) throw invErr;
      createdInvitationId = inv.id;

      const { error: adminErr } = await supabase.from('admin_users').insert({
        email: cleanEmail,
        full_name: cleanFullName || null,
        role: selectedRole,
        invited_by: adminUser.id,
        is_active: true,
      });

      if (adminErr) throw adminErr;

      await supabase.from('admin_activity_log').insert({
        actor_email: adminUser.email,
        action: 'invited_admin_user',
        target_email: cleanEmail,
        metadata: {
          token_id: inv.id,
          role: selectedRole,
          role_label: roleLabel(selectedRole),
        },
      });

      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, email, role')
        .ilike('email', cleanEmail)
        .maybeSingle();

      const inviteMode = existingProfile ? 'existing' : 'new';

      const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;
      const inviteLink = `${APP_URL}/accept-invite?token=${encodeURIComponent(inv.token)}&mode=${inviteMode}`;

      const { data: authData } = await supabase.auth.getSession();
      const token = authData.session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

      const edgeFunctionUrl =
        'https://yaqpvcriphvcqdmpsfxa.supabase.co/functions/v1/send-admin-invite';

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to_email: cleanEmail,
          to_name: cleanFullName || roleLabel(selectedRole),
          role: selectedRole,
          role_label: roleLabel(selectedRole),
          invite_link: inviteLink,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        let errData = {};
        try {
          errData = JSON.parse(errText);
        } catch {
          errData = { error: errText };
        }

        if (createdInvitationId) {
          await supabase.from('admin_invitations').delete().eq('id', createdInvitationId);
        }

        await supabase.from('admin_users').delete().eq('email', cleanEmail).eq('role', selectedRole);

        throw new Error(errData.error || errData.message || 'Failed to send invitation email.');
      }

      setInviteSuccess(`${roleLabel(selectedRole)} invitation sent to ${cleanEmail}!`);
      setInviteEmail('');
      setInviteFullName('');
      setInviteRole('school_admin');
      fetchData();
    } catch (err) {
      console.error('Invite error:', err);
      setInviteError(err.message || 'Failed to send invitation. Try again.');
    } finally {
      setInviting(false);
    }
  };

  const handleToggleActive = async (admin) => {
    if (!isSuperAdmin) {
      alert('Only Super Admin can manage admin accounts.');
      return;
    }

    if (admin.id === adminUser?.id) {
      alert('You cannot deactivate your own account.');
      return;
    }

    const action = admin.is_active ? 'deactivate' : 'reactivate';
    const label = roleLabel(admin.role);

    if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${label} account ${admin.email}?`)) {
      return;
    }

    await supabase.from('admin_users').update({ is_active: !admin.is_active }).eq('id', admin.id);

    await supabase.from('admin_activity_log').insert({
      actor_email: adminUser.email,
      action: `${action}_admin_user`,
      target_email: admin.email,
      metadata: { role: admin.role, role_label: label },
    });

    fetchData();
  };

  const handleResendInvite = async (inv) => {
    if (!isSuperAdmin) return;

    setResendingInviteId(inv.id);

    try {
      const cleanEmail = String(inv.email || '').toLowerCase().trim();
      const selectedRole = inv.role || 'admin';

      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, email, role')
        .ilike('email', cleanEmail)
        .maybeSingle();

      const inviteMode = existingProfile ? 'existing' : 'new';

      const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;
      const inviteLink = `${APP_URL}/accept-invite?token=${encodeURIComponent(inv.token)}&mode=${inviteMode}`;

      const { data: adminRow } = await supabase
        .from('admin_users')
        .select('full_name')
        .ilike('email', cleanEmail)
        .maybeSingle();

      const { data: authData } = await supabase.auth.getSession();
      const token = authData.session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

      const edgeFunctionUrl =
        'https://yaqpvcriphvcqdmpsfxa.supabase.co/functions/v1/send-admin-invite';

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to_email: cleanEmail,
          to_name: adminRow?.full_name || roleLabel(selectedRole),
          role: selectedRole,
          role_label: roleLabel(selectedRole),
          invite_link: inviteLink,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        let errData = {};

        try {
          errData = JSON.parse(errText);
        } catch {
          errData = { error: errText };
        }

        throw new Error(errData.error || errData.message || 'Failed to resend invitation email.');
      }

      await supabase.from('admin_activity_log').insert({
        actor_email: adminUser.email,
        action: 'resent_admin_invite',
        target_email: cleanEmail,
        metadata: {
          token_id: inv.id,
          role: selectedRole,
          role_label: roleLabel(selectedRole),
          invite_mode: inviteMode,
        },
      });

      alert(`Invitation resent to ${cleanEmail}.`);
    } catch (err) {
      console.error('Resend invite error:', err);
      alert(err.message || 'Failed to resend invitation. Try again.');
    } finally {
      setResendingInviteId(null);
    }
  };

  const handleRevokeInvite = async (inv) => {
    if (!isSuperAdmin) return;
    if (!window.confirm(`Revoke ${roleLabel(inv.role)} invite for ${inv.email}?`)) return;

    await supabase.from('admin_invitations').delete().eq('id', inv.id);
    await supabase.from('admin_users').delete().eq('email', inv.email).eq('role', inv.role);

    await supabase.from('admin_activity_log').insert({
      actor_email: adminUser.email,
      action: 'revoked_admin_invite',
      target_email: inv.email,
      metadata: { role: inv.role, role_label: roleLabel(inv.role) },
    });

    fetchData();
  };

  const timeAgo = (ds) => {
    if (!ds) return '—';
    const s = Math.floor((Date.now() - new Date(ds)) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  const tabs = [
    { key: 'roster', label: 'Admin Roster' },
    { key: 'invitations', label: `Pending Invites ${invitations.length > 0 ? `(${invitations.length})` : ''}` },
  ];

  if (authLoading) {
    return (
      <div className={`flex h-screen w-full ${t.bg} items-center justify-center`}>
        <div className={`text-sm font-bold tracking-widest animate-pulse ${accentText}`}>VERIFYING ACCESS...</div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className={`flex h-screen w-full ${t.bg} items-center justify-center`}>
        <div className="text-center max-w-md px-6">
          <p className="text-red-400 font-bold text-lg mb-2">Access Denied</p>
          <p className={`text-sm ${t.textMuted}`}>
            Admin Access Control is only available for Super Admin accounts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen w-full font-sans ${t.bg} transition-colors duration-300 overflow-hidden`}>
      <Sidebar />

      <div className="flex-1 h-full overflow-y-auto relative z-10 no-scrollbar">
        <div className="p-6 lg:p-10 max-w-[1600px] mx-auto">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
            <div>
              <h2 className={`text-3xl font-bold ${t.textMain} tracking-tight`}>Admin Access Control</h2>
              <p className={`${t.textMuted} mt-1 text-sm font-medium`}>
                Manage role-based access for the GreenSort Admin Portal ·{' '}
                <span className={accentText}>
                  You are logged in as <strong>Super Admin</strong>
                </span>
              </p>
              <p className={`mt-1 text-xs ${t.textMuted}`}>
                New invites can be assigned as School Admin, Accounting, Receiving Staff, Moderator, or Super Admin.
              </p>
            </div>

            <button
              onClick={() => {
                setShowInviteModal(true);
                setInviteError('');
                setInviteSuccess('');
              }}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all ${
                isLightMode
                  ? 'bg-[#4A7D5C] text-white hover:bg-[#3A6B4C] shadow-md'
                  : 'bg-[#2CD87D] text-[#0A0D10] hover:bg-[#00E676] shadow-[0_0_20px_rgba(44,216,125,0.3)]'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Invite Admin User
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {[
              { label: 'Total Admin Users', value: admins.length },
              { label: 'Super Admins', value: groupedAdmins.super_admin.length, amber: true },
              { label: 'School Admins', value: groupedAdmins.school_admin.length },
              { label: 'Accounting', value: groupedAdmins.accounting.length },
              { label: 'Pending Invites', value: invitations.length },
            ].map((card) => (
              <ThemedCard
                key={card.label}
                className={`flex flex-col justify-between h-[110px] ${
                  card.amber
                    ? isLightMode
                      ? '!border-amber-200/60 !bg-amber-50/50'
                      : '!border-amber-500/20 !bg-amber-500/5'
                    : ''
                }`}
              >
                <p className={`text-[12px] font-semibold tracking-wide ${card.amber ? (isLightMode ? 'text-amber-600' : 'text-amber-400') : t.textMuted}`}>
                  {card.label}
                </p>
                <p className={`text-[36px] font-bold leading-none ${card.amber ? (isLightMode ? 'text-amber-600' : 'text-amber-400') : t.textMain}`}>
                  {card.value}
                </p>
              </ThemedCard>
            ))}
          </div>

          <div
            className={`mb-6 p-5 rounded-2xl border flex items-start gap-4 ${
              isLightMode ? 'bg-[#F9FBF9] border-[#E5ECE7]' : 'bg-[#0F1814] border-white/[0.07]'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isLightMode ? 'bg-[#E4EFE8] text-[#4A7D5C]' : 'bg-[#2CD87D]/10 text-[#2CD87D]'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <div className="flex-1">
              <h3 className={`text-sm font-black uppercase tracking-widest mb-2 ${accentText}`}>Role Access Guide</h3>
              <p className={`text-sm leading-relaxed ${t.textMuted}`}>
                Super Admin can assign specific roles so each admin only sees the sections needed for their responsibility.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 mt-4">
                {ROLE_OPTIONS.map((role) => (
                  <div
                    key={role}
                    className={`p-3 rounded-xl border ${isLightMode ? 'bg-white border-[#E5ECE7]' : 'bg-[#0A0D10] border-white/[0.05]'}`}
                  >
                    <RoleBadge role={role} light={isLightMode} />
                    <p className={`text-[11px] mt-2 leading-relaxed ${t.textMuted}`}>{roleDescription(role)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={`flex items-center gap-1 mb-6 p-1.5 rounded-2xl border w-fit ${isLightMode ? 'bg-[#F0F4F1] border-[#E5ECE7]' : 'bg-[#131917] border-white/[0.05]'}`}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
                  activeTab === tab.key
                    ? isLightMode
                      ? 'bg-white text-[#4A7D5C] shadow-sm'
                      : 'bg-[#18201B] text-[#2CD87D] border border-[#2CD87D]/20'
                    : `${t.textMuted}`
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {dataLoading ? (
            <div className={`flex justify-center items-center h-[200px] text-sm font-bold tracking-widest animate-pulse ${accentText}`}>
              LOADING...
            </div>
          ) : (
            <>
              {activeTab === 'roster' && (
                <div className="space-y-6">
                  <AdminTable
                    title={`Super Admins (${groupedAdmins.super_admin.length})`}
                    admins={groupedAdmins.super_admin}
                    currentAdmin={adminUser}
                    isLightMode={isLightMode}
                    t={t}
                    timeAgo={timeAgo}
                    onToggleActive={handleToggleActive}
                    amber
                    emptyMessage="No super admins found."
                  />

                  <AdminTable
                    title={`School Admins (${groupedAdmins.school_admin.length})`}
                    admins={groupedAdmins.school_admin}
                    currentAdmin={adminUser}
                    isLightMode={isLightMode}
                    t={t}
                    timeAgo={timeAgo}
                    onToggleActive={handleToggleActive}
                    emptyMessage="No school admins yet."
                  />

                  <AdminTable
                    title={`Accounting (${groupedAdmins.accounting.length})`}
                    admins={groupedAdmins.accounting}
                    currentAdmin={adminUser}
                    isLightMode={isLightMode}
                    t={t}
                    timeAgo={timeAgo}
                    onToggleActive={handleToggleActive}
                    emptyMessage="No accounting admins yet."
                  />

                  <AdminTable
                    title={`Receiving Staff (${groupedAdmins.receiving_staff.length})`}
                    admins={groupedAdmins.receiving_staff}
                    currentAdmin={adminUser}
                    isLightMode={isLightMode}
                    t={t}
                    timeAgo={timeAgo}
                    onToggleActive={handleToggleActive}
                    emptyMessage="No receiving staff admins yet."
                  />

                  <AdminTable
                    title={`Moderators (${groupedAdmins.moderator.length})`}
                    admins={groupedAdmins.moderator}
                    currentAdmin={adminUser}
                    isLightMode={isLightMode}
                    t={t}
                    timeAgo={timeAgo}
                    onToggleActive={handleToggleActive}
                    emptyMessage="No moderators yet."
                  />

                  {groupedAdmins.admin.length > 0 && (
                    <AdminTable
                      title={`Legacy Admin Role (${groupedAdmins.admin.length})`}
                      admins={groupedAdmins.admin}
                      currentAdmin={adminUser}
                      isLightMode={isLightMode}
                      t={t}
                      timeAgo={timeAgo}
                      onToggleActive={handleToggleActive}
                      emptyMessage="No legacy admin users."
                    />
                  )}
                </div>
              )}

              {activeTab === 'invitations' && (
                <ThemedCard className="!p-0 overflow-hidden">
                  <div className={`px-6 py-4 border-b ${isLightMode ? 'border-[#F0F4F1]' : 'border-white/[0.05]'}`}>
                    <h3 className={`text-sm font-black uppercase tracking-widest ${accentText}`}>Pending Role Invitations</h3>
                    {Object.keys(inviteCounts).length > 0 && (
                      <p className={`text-xs mt-1 ${t.textMuted}`}>
                        {Object.entries(inviteCounts)
                          .map(([role, count]) => `${count} ${roleLabel(role)}`)
                          .join(' · ')}
                      </p>
                    )}
                  </div>

                  {invitations.length === 0 ? (
                    <p className={`p-10 text-center italic text-sm ${t.textMuted}`}>No pending admin invitations.</p>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className={`text-[10px] uppercase tracking-widest border-b ${isLightMode ? 'bg-[#F9FBF9] border-[#F0F4F1]' : 'bg-[#0A0D10] border-white/[0.05]'} ${t.textMuted}`}>
                          <th className="px-6 py-3 font-bold">Invited Email</th>
                          <th className="px-6 py-3 font-bold">Role</th>
                          <th className="px-6 py-3 font-bold">Invited By</th>
                          <th className="px-6 py-3 font-bold">Expires</th>
                          <th className="px-6 py-3 font-bold text-right">Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        {invitations.map((inv) => (
                          <tr
                            key={inv.id}
                            className={`border-b text-sm transition-colors ${
                              isLightMode ? 'border-[#F0F4F1] hover:bg-[#F9FBF9]' : 'border-white/[0.03] hover:bg-white/[0.02]'
                            }`}
                          >
                            <td className={`px-6 py-4 font-semibold ${t.textMain}`}>{inv.email}</td>
                            <td className="px-6 py-4"><RoleBadge role={inv.role} light={isLightMode} /></td>
                            <td className={`px-6 py-4 text-xs ${t.textMuted}`}>{inv.admin_users?.email || '—'}</td>
                            <td className={`px-6 py-4 text-xs ${t.textMuted}`}>
                              {new Date(inv.expires_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleResendInvite(inv)}
                                  disabled={resendingInviteId === inv.id}
                                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                                    isLightMode
                                      ? 'text-[#4A7D5C] border-[#98BAA3]/40 hover:bg-[#E4EFE8]'
                                      : 'text-[#2CD87D] border-[#2CD87D]/25 hover:bg-[#2CD87D]/10'
                                  }`}
                                >
                                  {resendingInviteId === inv.id ? 'Resending…' : 'Resend'}
                                </button>

                                <button
                                  onClick={() => handleRevokeInvite(inv)}
                                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                                    isLightMode ? 'text-red-500 border-red-200 hover:bg-red-50' : 'text-red-400 border-red-500/20 hover:bg-red-500/10'
                                  }`}
                                >
                                  Revoke
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </ThemedCard>
              )}
            </>
          )}

          <div className="h-16" />
        </div>
      </div>

      <Modal open={showInviteModal} onClose={() => setShowInviteModal(false)} light={isLightMode}>
        <div className={`px-7 py-6 border-b ${isLightMode ? 'border-[#F0F4F1]' : 'border-white/[0.06]'}`}>
          <h3 className={`text-xl font-bold ${t.textMain}`}>Invite Admin User</h3>
          <p className={`text-sm ${t.textMuted} mt-1`}>
            Select the exact role needed for this admin account. Super Admin can also invite another Super Admin.
          </p>
        </div>

        <form onSubmit={handleInvite} className="px-7 py-6 space-y-5">
          <div>
            <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${accentText}`}>Email Address *</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="admin@greensort.app"
              className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                isLightMode
                  ? 'bg-[#F0F4F1] border-[#E5ECE7] text-[#1D2A23] focus:border-[#6C9A7D]'
                  : 'bg-[#0A0D10] border-white/[0.05] text-white focus:border-[#2CD87D]/40'
              }`}
            />
          </div>

          <div>
            <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${accentText}`}>Full Name optional</label>
            <input
              type="text"
              value={inviteFullName}
              onChange={(e) => setInviteFullName(e.target.value)}
              placeholder="Juan dela Cruz"
              className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                isLightMode ? 'bg-[#F0F4F1] border-[#E5ECE7] text-[#1D2A23]' : 'bg-[#0A0D10] border-white/[0.05] text-white'
              }`}
            />
          </div>

          <div>
            <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${accentText}`}>Role *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ROLE_OPTIONS.map((role) => {
                const selected = inviteRole === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setInviteRole(role)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${
                      selected
                        ? isLightMode
                          ? 'border-[#6C9A7D] bg-[#E4EFE8]'
                          : 'border-[#2CD87D] bg-[#2CD87D]/10'
                        : isLightMode
                          ? 'border-[#E5ECE7] bg-[#F9FBF9] hover:bg-[#F0F4F1]'
                          : 'border-white/[0.06] bg-[#0A0D10] hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <RoleBadge role={role} light={isLightMode} />
                      {selected && (
                        <svg className={`w-4 h-4 ${accentText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <p className={`text-[11px] leading-relaxed ${t.textMuted}`}>{roleDescription(role)}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {inviteError && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-red-400 text-sm font-medium">{inviteError}</p>
            </div>
          )}

          {inviteSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
              <p className="text-green-400 text-sm font-bold">{inviteSuccess}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowInviteModal(false)}
              className={`flex-1 py-3 rounded-xl font-bold text-sm border transition-all ${
                isLightMode ? 'border-[#E5ECE7] text-[#6B7A74] hover:bg-[#F0F4F1]' : 'border-white/[0.07] text-[#8A9B96] hover:bg-white/[0.03]'
              }`}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={inviting}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-60 ${
                isLightMode ? 'bg-[#4A7D5C] text-white hover:bg-[#3A6B4C]' : 'bg-[#2CD87D] text-[#0A0D10] hover:bg-[#00E676]'
              }`}
            >
              {inviting ? 'Sending Invite…' : `Send ${roleLabel(inviteRole)} Invite`}
            </button>
          </div>
        </form>
      </Modal>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          `,
        }}
      />
    </div>
  );
}

function AdminTable({
  title,
  admins,
  currentAdmin,
  isLightMode,
  t,
  timeAgo,
  onToggleActive,
  amber,
  emptyMessage,
}) {
  return (
    <ThemedCard className="!p-0 overflow-hidden">
      <div
        className={`px-6 py-4 border-b flex items-center gap-3 ${
          amber
            ? isLightMode
              ? 'border-[#F0F4F1] bg-amber-50/40'
              : 'border-white/[0.05] bg-amber-500/5'
            : isLightMode
              ? 'border-[#F0F4F1] bg-[#F9FBF9]'
              : 'border-white/[0.05] bg-[#0A0D10]'
        }`}
      >
        <h3 className={`text-sm font-black uppercase tracking-widest ${amber ? (isLightMode ? 'text-amber-700' : 'text-amber-400') : (isLightMode ? 'text-[#4A7D5C]' : 'text-[#2CD87D]')}`}>
          {title}
        </h3>
      </div>

      {admins.length === 0 ? (
        <p className={`p-8 text-center text-sm italic ${t.textMuted}`}>{emptyMessage || 'No admin users found.'}</p>
      ) : (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className={`text-[10px] uppercase tracking-widest border-b ${isLightMode ? 'bg-[#F9FBF9] border-[#F0F4F1]' : 'bg-[#0A0D10] border-white/[0.05]'} ${t.textMuted}`}>
              <th className="px-6 py-3 font-bold w-[35%]">Admin</th>
              <th className="px-6 py-3 font-bold w-[20%]">Role</th>
              <th className="px-6 py-3 font-bold w-[15%]">Status</th>
              <th className="px-6 py-3 font-bold w-[15%]">Joined</th>
              <th className="px-6 py-3 font-bold text-right w-[15%]">Actions</th>
            </tr>
          </thead>

          <tbody>
            {admins.map((admin) => (
              <AdminRow
                key={admin.id}
                admin={admin}
                currentAdmin={currentAdmin}
                isLightMode={isLightMode}
                t={t}
                timeAgo={timeAgo}
                onToggleActive={onToggleActive}
              />
            ))}
          </tbody>
        </table>
      )}
    </ThemedCard>
  );
}

function AdminRow({ admin, currentAdmin, isLightMode, t, timeAgo, onToggleActive }) {
  const isSelf = admin.id === currentAdmin?.id;

  return (
    <tr className={`border-b text-sm transition-colors ${isLightMode ? 'border-[#F0F4F1] hover:bg-[#F9FBF9]' : 'border-white/[0.03] hover:bg-white/[0.02]'}`}>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
              admin.role === 'super_admin'
                ? isLightMode
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-amber-500/15 text-amber-400'
                : isLightMode
                  ? 'bg-[#E4EFE8] text-[#4A7D5C]'
                  : 'bg-[#2CD87D]/10 text-[#2CD87D]'
            }`}
          >
            {(admin.full_name || admin.email || 'AD').substring(0, 2).toUpperCase()}
          </div>

          <div>
            <p className={`font-bold ${t.textMain} flex items-center gap-1.5`}>
              {admin.full_name || '—'}
              {isSelf && (
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${isLightMode ? 'bg-[#E4EFE8] text-[#4A7D5C]' : 'bg-[#2CD87D]/10 text-[#2CD87D]'}`}>
                  YOU
                </span>
              )}
            </p>
            <p className={`text-xs ${t.textMuted}`}>{admin.email}</p>
          </div>
        </div>
      </td>

      <td className="px-6 py-4"><RoleBadge role={admin.role} light={isLightMode} /></td>
      <td className="px-6 py-4"><StatusDot active={admin.is_active} light={isLightMode} /></td>
      <td className={`px-6 py-4 text-xs ${t.textMuted}`}>{timeAgo(admin.created_at)}</td>

      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          {isSelf ? (
            <span className={`text-[11px] font-semibold ${t.textMuted}`}>Current account</span>
          ) : (
            <button
              onClick={() => onToggleActive(admin)}
              className={`p-2 rounded-lg transition-all ${t.textMuted} ${
                admin.is_active
                  ? 'hover:text-orange-400 hover:bg-orange-500/10'
                  : 'hover:text-[#2CD87D] hover:bg-[#2CD87D]/10'
              }`}
              title={admin.is_active ? 'Deactivate' : 'Reactivate'}
            >
              {admin.is_active ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 11-12.728 0M12 3v9" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

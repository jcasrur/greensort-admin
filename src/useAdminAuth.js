import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

let _cachedUser = null;
let _cachedRole = null;
let _resolved   = false;

const PERMISSIONS = {
  super_admin:     ['mrf','inventory','students','accounting','reports','user_management','fund_dashboard','messages','super_admin_panel'],
  school_admin:    ['reports','user_management','fund_dashboard'],
  accounting:      ['accounting','students'],
  receiving_staff: ['mrf','inventory'],
  moderator:       ['reports','messages'],
};

const ROLE_LABELS = {
  super_admin:'Super Admin', school_admin:'School Admin',
  accounting:'Accounting', receiving_staff:'Receiving Staff',
  moderator:'Moderator', admin:'Admin',
};

export function useAdminAuth() {
  const [adminUser, setAdminUser] = useState(_cachedUser);
  const [role,      setRole]      = useState(_cachedRole);
  const [loading,   setLoading]   = useState(!_resolved);
  const [authError, setAuthError] = useState(null);

  const refresh = useCallback(async (force = false) => {
    if (_resolved && !force) {
      setAdminUser(_cachedUser);
      setRole(_cachedRole);
      setLoading(false);
      return;
    }
    setLoading(true);
    setAuthError(null);
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) {
        _cachedUser = null; _cachedRole = null; _resolved = true;
        setAdminUser(null); setRole(null);
        return;
      }
      const { data: adminRow } = await supabase
        .from('admin_users').select('*')
        .ilike('email', user.email).eq('is_active', true).maybeSingle();
      if (!adminRow) {
        _cachedUser = null; _cachedRole = null; _resolved = true;
        setAdminUser(null); setRole(null);
        setAuthError('No admin portal access.');
        return;
      }
      _cachedUser = adminRow; _cachedRole = adminRow.role; _resolved = true;
      setAdminUser(adminRow); setRole(adminRow.role);
    } catch(err) {
      console.error('useAdminAuth:', err);
      setAuthError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        _cachedUser = null; _cachedRole = null; _resolved = false;
        setAdminUser(null); setRole(null); setLoading(false);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        refresh(true);
      }
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  const can = useCallback((mod) => {
    const r = _cachedRole || role;
    if (!r) return false;
    return (PERMISSIONS[r] || []).includes(mod);
  }, [role]);

  return {
    adminUser, role,
    roleLabel: ROLE_LABELS[role] || 'Admin',
    can,
    isSuperAdmin: role === 'super_admin',
    isAdmin: !!role,
    loading, authError,
    refresh: () => refresh(true),
  };
}

export async function checkAdminAccess() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { allowed: false, role: null };
  const { data } = await supabase.from('admin_users').select('role')
    .ilike('email', user.email).eq('is_active', true).maybeSingle();
  if (!data) return { allowed: false, role: null };
  return { allowed: true, role: data.role };
}

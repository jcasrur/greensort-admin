import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

let _cachedUser = null;
let _cachedRole = null;
let _resolved = false;

const PERMISSIONS = {
  super_admin: [
    'mrf',
    'inventory',
    'students',
    'accounting',
    'reports',
    'fund_dashboard',
    'messages',
    'super_admin_panel',
  ],

  admin: [
    'students',
    'reports',
    'fund_dashboard',
    'messages',
  ],

  coordinator: [
    'mrf',
    'inventory',
    'students',
    'reports',
    'fund_dashboard',
  ],

  accounting: [
    'accounting',
    'students',
    'reports',
  ],

  receiving_staff: [
    'mrf',
    'inventory',
  ],

  moderator: [
    'reports',
    'messages',
  ],
};

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  coordinator: 'Mobile Coordinator',
  accounting: 'Accounting',
  receiving_staff: 'Receiving Staff',
  moderator: 'Moderator',
};

export function useAdminAuth() {
  const [adminUser, setAdminUser] = useState(_cachedUser);
  const [role, setRole] = useState(_cachedRole);
  const [loading, setLoading] = useState(!_resolved);
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
      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();

      if (authErr || !user) {
        _cachedUser = null;
        _cachedRole = null;
        _resolved = true;

        setAdminUser(null);
        setRole(null);
        return;
      }

      const { data: adminRow, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .ilike('email', user.email)
        .eq('is_active', true)
        .maybeSingle();

      if (adminError) {
        throw adminError;
      }

      if (!adminRow) {
        _cachedUser = null;
        _cachedRole = null;
        _resolved = true;

        setAdminUser(null);
        setRole(null);
        setAuthError('No admin portal access.');
        return;
      }

      _cachedUser = adminRow;
      _cachedRole = adminRow.role;
      _resolved = true;

      setAdminUser(adminRow);
      setRole(adminRow.role);
    } catch (err) {
      console.error('useAdminAuth:', err);

      _cachedUser = null;
      _cachedRole = null;
      _resolved = true;

      setAdminUser(null);
      setRole(null);
      setAuthError(err.message || 'Unable to verify admin access.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        _cachedUser = null;
        _cachedRole = null;
        _resolved = false;

        setAdminUser(null);
        setRole(null);
        setLoading(false);
      } else if (
        event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED'
      ) {
        refresh(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refresh]);

  const can = useCallback(
    (moduleName) => {
      const currentRole = _cachedRole || role;

      if (!currentRole) {
        return false;
      }

      return (PERMISSIONS[currentRole] || []).includes(moduleName);
    },
    [role],
  );

  return {
    adminUser,
    role,
    roleLabel: ROLE_LABELS[role] || 'Admin',
    can,
    isSuperAdmin: role === 'super_admin',
    isAdmin: Boolean(role),
    loading,
    authError,
    refresh: () => refresh(true),
  };
}

export async function checkAdminAccess() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      allowed: false,
      role: null,
    };
  }

  const { data, error } = await supabase
    .from('admin_users')
    .select('role')
    .ilike('email', user.email)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) {
    return {
      allowed: false,
      role: null,
    };
  }

  return {
    allowed: true,
    role: data.role,
  };
}
// useAdminAuth.js
// ─────────────────────────────────────────────────────────────────────────────
// Central hook that every page imports to know:
//   • who is logged in
//   • what their admin role is
//   • whether they are allowed to perform privileged actions
//
// Usage:
//   const { adminUser, role, isSuperAdmin, isAdmin, loading } = useAdminAuth();
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

export function useAdminAuth() {
  const [adminUser, setAdminUser]   = useState(null);  // row from admin_users
  const [role, setRole]             = useState(null);   // 'super_admin' | 'admin' | null
  const [loading, setLoading]       = useState(true);
  const [authError, setAuthError]   = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setAuthError(null);
    try {
      // 1. Get the currently logged-in Supabase auth user
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) {
        setAdminUser(null);
        setRole(null);
        return;
      }

      // 2. Look them up in admin_users
      const { data: adminRow, error: dbErr } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', user.email)
        .eq('is_active', true)
        .single();

      if (dbErr || !adminRow) {
        // Authenticated with Supabase Auth but NOT in admin_users → no portal access
        setAdminUser(null);
        setRole(null);
        setAuthError('Your account does not have admin portal access.');
        return;
      }

      setAdminUser(adminRow);
      setRole(adminRow.role);
    } catch (err) {
      console.error('useAdminAuth error:', err);
      setAuthError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    // Re-check whenever the Supabase auth session changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  return {
    adminUser,
    role,
    isSuperAdmin : role === 'super_admin',
    isAdmin      : role === 'admin' || role === 'super_admin', // super_admin inherits admin rights
    loading,
    authError,
    refresh,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Standalone helper — call once on app boot to guard the portal entry point.
// Returns { allowed: bool, role: string|null }
// ─────────────────────────────────────────────────────────────────────────────
export async function checkAdminAccess() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { allowed: false, role: null };

  const { data } = await supabase
    .from('admin_users')
    .select('role')
    .eq('email', user.email)
    .eq('is_active', true)
    .single();

  if (!data) return { allowed: false, role: null };
  return { allowed: true, role: data.role };
}
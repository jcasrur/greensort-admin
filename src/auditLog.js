import { supabase } from './supabase';

/**
 * Logs an admin action to the admin_activity_log table.
 *
 * @param {Object} params
 * @param {string} params.action         - e.g. 'APPROVE_UPCYCLE'
 * @param {string} params.targetTable    - e.g. 'upcycle_submissions'
 * @param {string|number} params.targetId
 * @param {Object} [params.details]      - any extra metadata
 */
export async function logAdminAction({ action, targetTable, targetId, details = {} }) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('admin_activity_log').insert({
      actor_email:  user.email,
      action,
      target_table: targetTable,
      target_id:    String(targetId),
      metadata:     details,
    });
  } catch (err) {
    // Non-blocking — log errors silently so they don't interrupt the UI
    console.warn('auditLog: failed to write log entry', err);
  }
}
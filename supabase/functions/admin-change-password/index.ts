import { createClient } from 'npm:@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6.9.16';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  coordinator: 'Mobile Coordinator',
  accounting: 'Accounting',
  receiving_staff: 'Receiving Staff',
  moderator: 'Moderator',
};

const ALLOWED_TARGET_ROLES = new Set(Object.keys(ROLE_LABELS));

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

const normalizeEmail = (value: unknown) => String(value || '').trim().toLowerCase();

const escapeHtml = (value: unknown) =>
  String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed.' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const gmailUser = Deno.env.get('GMAIL_USER');
  const gmailAppPassword = Deno.env.get('GMAIL_APP_PASSWORD');

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    console.error('Missing required Supabase environment variables.');
    return jsonResponse({ success: false, error: 'Server configuration is incomplete.' }, 500);
  }

  if (!gmailUser || !gmailAppPassword) {
    console.error('Missing GMAIL_USER or GMAIL_APP_PASSWORD.');
    return jsonResponse(
      { success: false, error: 'Email notification is not configured. Password was not changed.' },
      500
    );
  }

  const authorization = request.headers.get('Authorization') || '';
  const accessToken = authorization.replace(/^Bearer\s+/i, '').trim();

  if (!accessToken || accessToken === authorization) {
    return jsonResponse({ success: false, error: 'Missing authentication token.' }, 401);
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    const {
      data: { user: caller },
      error: callerAuthError,
    } = await userClient.auth.getUser(accessToken);

    if (callerAuthError || !caller?.email) {
  return jsonResponse(
    { success: false, error: 'Your session is invalid or expired.' },
    401
  );
}

  const { data: claimsData, error: claimsError } =
    await userClient.auth.getClaims(accessToken);

  if (claimsError || claimsData?.claims?.aal !== 'aal2') {
    return jsonResponse(
      {
        success: false,
        error: 'Google Authenticator verification is required.',
      },
      403
    );
  }

  const callerEmail = normalizeEmail(caller.email);

    const { data: callerAdmin, error: callerAdminError } = await adminClient
      .from('admin_users')
      .select('id, email, role, is_active')
      .ilike('email', callerEmail)
      .eq('role', 'super_admin')
      .eq('is_active', true)
      .maybeSingle();

    if (callerAdminError) {
      console.error('Failed to verify Super Admin access:', callerAdminError.message);
      return jsonResponse({ success: false, error: 'Unable to verify Super Admin access.' }, 500);
    }

    if (!callerAdmin) {
      return jsonResponse(
        { success: false, error: 'Only an active Super Admin can change admin passwords.' },
        403
      );
    }

    let requestBody: Record<string, unknown>;

    try {
      requestBody = await request.json();
    } catch {
      return jsonResponse({ success: false, error: 'Invalid request body.' }, 400);
    }

    const targetEmail = normalizeEmail(requestBody.target_email);
    const newPassword = typeof requestBody.new_password === 'string'
      ? requestBody.new_password
      : '';

    if (!targetEmail) {
      return jsonResponse({ success: false, error: 'Target admin email is required.' }, 400);
    }

    if (newPassword.length < 8 || newPassword.length > 72) {
      return jsonResponse(
        { success: false, error: 'The new password must be between 8 and 72 characters.' },
        400
      );
    }

    if (targetEmail === callerEmail) {
      return jsonResponse(
        { success: false, error: 'You cannot change your own password from Admin Access.' },
        403
      );
    }

    const { data: targetAdmin, error: targetAdminError } = await adminClient
      .from('admin_users')
      .select('id, email, full_name, role, is_active')
      .ilike('email', targetEmail)
      .maybeSingle();

    if (targetAdminError) {
      console.error('Failed to find target admin:', targetAdminError.message);
      return jsonResponse({ success: false, error: 'Unable to find the target admin account.' }, 500);
    }

    if (!targetAdmin || !ALLOWED_TARGET_ROLES.has(targetAdmin.role)) {
      return jsonResponse({ success: false, error: 'Target admin account was not found.' }, 404);
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });

    try {
      await transporter.verify();
    } catch (emailConfigError) {
      console.error(
        'Gmail SMTP verification failed:',
        emailConfigError instanceof Error ? emailConfigError.message : emailConfigError
      );
      return jsonResponse(
        { success: false, error: 'Email service is unavailable. Password was not changed.' },
        502
      );
    }

    const { data: targetProfile, error: targetProfileError } = await adminClient
      .from('profiles')
      .select('id')
      .ilike('email', targetEmail)
      .maybeSingle();

    if (targetProfileError) {
      console.error('Failed to resolve target profile:', targetProfileError.message);
      return jsonResponse({ success: false, error: 'Unable to resolve the target Auth account.' }, 500);
    }

    let targetAuthUserId = targetProfile?.id || null;

    if (!targetAuthUserId) {
      for (let page = 1; page <= 100 && !targetAuthUserId; page += 1) {
        const { data: authPage, error: listUsersError } = await adminClient.auth.admin.listUsers({
          page,
          perPage: 100,
        });

        if (listUsersError) {
          console.error('Failed to search Auth users:', listUsersError.message);
          return jsonResponse({ success: false, error: 'Unable to search Auth accounts.' }, 500);
        }

        const matchingUser = authPage.users.find(
          (user) => normalizeEmail(user.email) === targetEmail
        );

        if (matchingUser) {
          targetAuthUserId = matchingUser.id;
          break;
        }

        if (authPage.users.length < 100) break;
      }
    }

    if (!targetAuthUserId) {
      return jsonResponse(
        { success: false, error: 'The target admin does not have a Supabase Auth account yet.' },
        404
      );
    }

    const { error: passwordUpdateError } = await adminClient.auth.admin.updateUserById(
      targetAuthUserId,
      { password: newPassword }
    );

    if (passwordUpdateError) {
      console.error('Password update failed:', passwordUpdateError.message);
      return jsonResponse({ success: false, error: 'Supabase Auth could not update the password.' }, 500);
    }

    const targetName = targetAdmin.full_name || ROLE_LABELS[targetAdmin.role] || 'GreenSort Admin';
    let emailSent = false;
    let emailFailureMessage = '';

    try {
      await transporter.sendMail({
        from: `"GreenSort Admin" <${gmailUser}>`,
        to: targetEmail,
        subject: 'Your GreenSort Admin password was changed',
        text: [
          `Hello ${targetName},`,
          '',
          'Your GreenSort Admin password has been changed by a Super Admin.',
          'For your security, the new password is not included in this email.',
          '',
          'If you did not expect this change, contact your GreenSort Super Admin immediately.',
        ].join('\n'),
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1d2a23;line-height:1.6">
            <h2 style="color:#2d6a4f;margin-bottom:16px">GreenSort Admin security notice</h2>
            <p>Hello ${escapeHtml(targetName)},</p>
            <p>Your GreenSort Admin password has been changed by a Super Admin.</p>
            <p><strong>For your security, the new password is not included in this email.</strong></p>
            <p>If you did not expect this change, contact your GreenSort Super Admin immediately.</p>
          </div>
        `,
      });
      emailSent = true;
    } catch (emailError) {
      emailFailureMessage = emailError instanceof Error ? emailError.message : String(emailError);
      console.error('Password notification email failed:', emailFailureMessage);
    }

    const { error: auditError } = await adminClient.from('admin_activity_log').insert({
      actor_email: callerEmail,
      action: 'changed_admin_password',
      target_email: targetEmail,
      metadata: {
        target_role: targetAdmin.role,
        target_role_label: ROLE_LABELS[targetAdmin.role] || targetAdmin.role,
        email_notification_sent: emailSent,
      },
    });

    if (auditError) {
      console.error('Password-change audit log failed:', auditError.message);
    }

    if (!emailSent) {
      return jsonResponse({
        success: true,
        email_sent: false,
        audit_logged: !auditError,
        message:
          'Password changed successfully, but the notification email could not be sent. Check the Edge Function logs.',
      });
    }

    return jsonResponse({
      success: true,
      email_sent: true,
      audit_logged: !auditError,
      message: `Password changed successfully. A notification was sent to ${targetEmail}.`,
    });
  } catch (error) {
    console.error(
      'Unexpected admin-change-password error:',
      error instanceof Error ? error.message : error
    );
    return jsonResponse({ success: false, error: 'An unexpected server error occurred.' }, 500);
  }
});

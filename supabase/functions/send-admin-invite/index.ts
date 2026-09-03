import { createClient } from 'npm:@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6.9.16';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
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

const jsonResponse = (
  body: Record<string, unknown>,
  status = 200
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

const normalizeEmail = (value: unknown) =>
  String(value || '').trim().toLowerCase();

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
    return jsonResponse(
      { success: false, error: 'Method not allowed.' },
      405
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const gmailUser = Deno.env.get('GMAIL_USER');
  const gmailAppPassword = Deno.env.get('GMAIL_APP_PASSWORD');

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    console.error('Missing required Supabase environment variables.');

    return jsonResponse(
      {
        success: false,
        error: 'Server configuration is incomplete.',
      },
      500
    );
  }

  if (!gmailUser || !gmailAppPassword) {
    console.error('Missing Gmail SMTP credentials.');

    return jsonResponse(
      {
        success: false,
        error: 'Invitation email service is not configured.',
      },
      500
    );
  }

  const authorization = request.headers.get('Authorization') || '';
  const accessToken = authorization.replace(/^Bearer\s+/i, '').trim();

  if (!accessToken || accessToken === authorization) {
    return jsonResponse(
      {
        success: false,
        error: 'Missing authentication token.',
      },
      401
    );
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
        {
          success: false,
          error: 'Your session is invalid or expired.',
        },
        401
      );
    }

    const callerEmail = normalizeEmail(caller.email);

    const { data: callerAdmin, error: callerAdminError } =
      await adminClient
        .from('admin_users')
        .select('id')
        .ilike('email', callerEmail)
        .eq('role', 'super_admin')
        .eq('is_active', true)
        .maybeSingle();

    if (callerAdminError) {
      console.error(
        'Failed to verify Super Admin:',
        callerAdminError.message
      );

      return jsonResponse(
        {
          success: false,
          error: 'Unable to verify Super Admin access.',
        },
        500
      );
    }

    if (!callerAdmin) {
      return jsonResponse(
        {
          success: false,
          error: 'Only an active Super Admin can send invitations.',
        },
        403
      );
    }

    let payload: Record<string, unknown>;

    try {
      payload = await request.json();
    } catch {
      return jsonResponse(
        {
          success: false,
          error: 'Invalid request body.',
        },
        400
      );
    }

    const targetEmail = normalizeEmail(payload.to_email);
    const targetName =
      typeof payload.to_name === 'string'
        ? payload.to_name.trim().slice(0, 120)
        : '';

    const role =
      typeof payload.role === 'string'
        ? payload.role.trim().toLowerCase()
        : '';

    const inviteLink =
      typeof payload.invite_link === 'string'
        ? payload.invite_link.trim()
        : '';

    if (!targetEmail || !targetEmail.includes('@')) {
      return jsonResponse(
        {
          success: false,
          error: 'A valid invitation email is required.',
        },
        400
      );
    }

    const roleLabel = ROLE_LABELS[role];

    if (!roleLabel) {
      return jsonResponse(
        {
          success: false,
          error: 'Invalid admin role.',
        },
        400
      );
    }

    let verifiedInviteLink: string;

    try {
      const parsedLink = new URL(inviteLink);

      if (
        parsedLink.protocol !== 'https:' &&
        parsedLink.protocol !== 'http:'
      ) {
        throw new Error('Invalid protocol.');
      }

      verifiedInviteLink = parsedLink.toString();
    } catch {
      return jsonResponse(
        {
          success: false,
          error: 'Invalid invitation link.',
        },
        400
      );
    }

    const safeName = escapeHtml(targetName || roleLabel);
    const safeRoleLabel = escapeHtml(roleLabel);
    const safeInviteLink = escapeHtml(verifiedInviteLink);

    const subject =
      role === 'super_admin'
        ? 'Action Required: GreenSort Super Admin Invitation'
        : `You're Invited: GreenSort ${roleLabel} Access`;

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });

    const mailResult = await transporter.sendMail({
      from: `"GreenSort Admin" <${gmailUser}>`,
      to: targetEmail,
      subject,
      text: [
        `Hello ${targetName || roleLabel},`,
        '',
        `You have been invited to join the GreenSort Admin Portal as ${roleLabel}.`,
        '',
        `Accept your invitation: ${verifiedInviteLink}`,
        '',
        'This invitation link expires in 48 hours.',
      ].join('\n'),
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1f2937;line-height:1.6">
          <h2>Hello ${safeName},</h2>

          <p>
            You have been invited to join the
            <strong>GreenSort Admin Portal</strong> as
            <strong>${safeRoleLabel}</strong>.
          </p>

          <p>
            Accept your invitation and set up your account using
            the button below.
          </p>

          <a
            href="${safeInviteLink}"
            style="display:inline-block;padding:12px 20px;background:#10b981;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold"
          >
            Accept Invitation
          </a>

          <p style="margin-top:20px">
            <em>This invitation link expires in 48 hours.</em>
          </p>
        </div>
      `,
    });

    return jsonResponse({
      success: true,
      message: 'Invitation email sent successfully.',
      messageId: mailResult.messageId,
    });
  } catch (error) {
    console.error(
      'Send admin invitation error:',
      error instanceof Error ? error.message : error
    );

    return jsonResponse(
      {
        success: false,
        error: 'Failed to send the invitation email.',
      },
      500
    );
  }
});
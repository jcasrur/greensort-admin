// supabase/functions/create-mobile-coordinator/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function generateTemporaryPassword(length = 12) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@$!%*?&";
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);

  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars[values[i] % chars.length];
  }

  return password;
}

function normalizeEmail(value: string) {
  return String(value || "").trim().toLowerCase();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const GMAIL_USER = Deno.env.get("GMAIL_USER");
    const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Supabase secrets.");
    }

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      throw new Error("Missing GMAIL_USER or GMAIL_APP_PASSWORD in Supabase secrets.");
    }

    let payload;

    try {
      payload = await req.json();
    } catch (parseError) {
      console.error("Failed to read JSON body:", parseError);

      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid or empty JSON body received by server.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const cleanEmail = normalizeEmail(payload.email || "");
    const cleanFullName = String(payload.full_name || "Mobile Coordinator").trim();

    if (!cleanEmail) {
      throw new Error("Missing email in payload.");
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const authHeader = req.headers.get("Authorization") || "";

    if (!authHeader.startsWith("Bearer ")) {
      throw new Error("Missing authorization token.");
    }

    const userClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user: caller },
      error: callerError,
    } = await userClient.auth.getUser();

    if (callerError || !caller?.email) {
      throw new Error("Unauthorized request.");
    }

    const { data: callerAdmin, error: callerAdminError } = await supabaseAdmin
      .from("admin_users")
      .select("id, email, role, is_active")
      .ilike("email", caller.email)
      .maybeSingle();

    if (callerAdminError) throw callerAdminError;

    if (!callerAdmin || callerAdmin.role !== "super_admin" || callerAdmin.is_active !== true) {
      throw new Error("Only an active Super Admin can create a Mobile Coordinator.");
    }

    const temporaryPassword = generateTemporaryPassword(12);

    const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name")
      .ilike("email", cleanEmail)
      .maybeSingle();

    if (profileCheckError) throw profileCheckError;

    let authUserId = existingProfile?.id || null;

    if (authUserId) {
      const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
        authUserId,
        {
          password: temporaryPassword,
          email_confirm: true,
          user_metadata: {
            full_name: cleanFullName,
            role: "coordinator",
          },
        }
      );

      if (updateAuthError) throw updateAuthError;
    } else {
      const { data: createdUser, error: createAuthError } =
        await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          password: temporaryPassword,
          email_confirm: true,
          user_metadata: {
            full_name: cleanFullName,
            role: "coordinator",
          },
        });

      if (createAuthError) throw createAuthError;

      authUserId = createdUser.user?.id;
    }

    if (!authUserId) {
      throw new Error("Failed to create or update Mobile Coordinator auth account.");
    }

    const { error: adminUserError } = await supabaseAdmin
      .from("admin_users")
      .upsert(
        {
          email: cleanEmail,
          full_name: cleanFullName,
          role: "coordinator",
          invited_by: callerAdmin.id,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "email" }
      );

    if (adminUserError) throw adminUserError;

    if (existingProfile?.id) {
      const { error: updateProfileError } = await supabaseAdmin
        .from("profiles")
        .update({
          full_name: cleanFullName,
          role: "coordinator",
          status: "Active",
          account_status: "active",
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingProfile.id);

      if (updateProfileError) throw updateProfileError;
    } else {
      const { error: insertProfileError } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: authUserId,
          email: cleanEmail,
          full_name: cleanFullName,
          role: "coordinator",
          status: "Active",
          account_status: "active",
          is_active: true,
          updated_at: new Date().toISOString(),
        });

      if (insertProfileError) throw insertProfileError;
    }

    await supabaseAdmin.from("admin_activity_log").insert({
      actor_email: caller.email,
      action: "created_mobile_coordinator_credentials",
      target_email: cleanEmail,
      metadata: {
        role: "coordinator",
        role_label: "Mobile Coordinator",
      },
    });

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
        <h2>Hi ${cleanFullName || "Mobile Coordinator"},</h2>

        <p>
          You have been assigned as a
          <strong>Mobile Coordinator</strong> for the
          <strong>GreenSort Mobile Admin</strong> dashboard.
        </p>

        <p>
          Use these credentials to access the Mobile Admin dashboard:
        </p>

        <div style="background:#F3F4F6;border:1px solid #E5E7EB;border-radius:10px;padding:16px;margin:18px 0;">
          <p style="margin:0 0 8px;">
            <strong>Email:</strong> ${cleanEmail}
          </p>
          <p style="margin:0;">
            <strong>Temporary Password:</strong>
            <span style="font-size:18px;font-weight:bold;color:#047857;">
              ${temporaryPassword}
            </span>
          </p>
        </div>

        <p>
          For security, please change your password after logging in.
        </p>

        <p style="margin-top:20px;color:#6B7280;font-size:13px;">
          If you did not expect this access, please contact the GreenSort Super Admin.
        </p>
      </div>
    `;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
    });

    const mailResult = await transporter.sendMail({
      from: `"GreenSort Admin" <${GMAIL_USER}>`,
      to: cleanEmail,
      subject: "GreenSort Mobile Coordinator Access",
      html: htmlContent,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Mobile Coordinator created and temporary password sent.",
        messageId: mailResult.messageId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Create Mobile Coordinator error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to create Mobile Coordinator.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
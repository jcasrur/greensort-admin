import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return json(
      {
        success: false,
        error: "Method not allowed.",
      },
      405
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error("Missing Supabase environment variables.");
    }

    const authHeader = req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return json(
        {
          success: false,
          error: "Missing authorization token.",
        },
        401
      );
    }

    const accessToken = authHeader.replace("Bearer ", "").trim();

    /*
     * Client using the logged-in user's access token.
     */
    const userClient = createClient(
      supabaseUrl,
      anonKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    );

    /*
     * Service-role client.
     *
     * IMPORTANT:
     * This must ONLY exist inside the Edge Function.
     * Never put SUPABASE_SERVICE_ROLE_KEY in React/Vite code.
     */
    const adminClient = createClient(
      supabaseUrl,
      serviceRoleKey
    );

    /*
     * Verify the currently logged-in user.
     */
    const {
      data: { user: authUser },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !authUser?.email) {
      return json(
        {
          success: false,
          error: "Invalid or expired session.",
        },
        401
      );
    }

    const callerEmail = authUser.email
      .toLowerCase()
      .trim();

    /*
     * Find the caller in admin_users.
     */
    const {
      data: callerAdmin,
      error: callerAdminError,
    } = await adminClient
      .from("admin_users")
      .select(
        "id, email, full_name, role, is_active"
      )
      .ilike("email", callerEmail)
      .maybeSingle();

    if (callerAdminError) {
      throw callerAdminError;
    }

    /*
     * Caller must be an active Super Admin.
     */
    let callerIsSuperAdmin =
      callerAdmin?.role === "super_admin" &&
      callerAdmin?.is_active === true;

    /*
     * Also allow an email that exists in the
     * super_admin_allowlist.
     */
    if (!callerIsSuperAdmin) {
      const {
        data: allowlisted,
        error: allowlistError,
      } = await adminClient
        .from("super_admin_allowlist")
        .select("id, email")
        .ilike("email", callerEmail)
        .maybeSingle();

      if (allowlistError) {
        throw allowlistError;
      }

      callerIsSuperAdmin = Boolean(
        allowlisted?.email
      );
    }

    if (!callerIsSuperAdmin) {
      return json(
        {
          success: false,
          error:
            "Only Super Admin can change admin passwords.",
        },
        403
      );
    }

    /*
     * Read request body.
     */
    let payload: {
      target_email?: string;
      new_password?: string;
    };

    try {
      payload = await req.json();
    } catch {
      return json(
        {
          success: false,
          error: "Invalid JSON request body.",
        },
        400
      );
    }

    const targetEmail = String(
      payload.target_email || ""
    )
      .toLowerCase()
      .trim();

    const newPassword = String(
      payload.new_password || ""
    );

    if (!targetEmail) {
      return json(
        {
          success: false,
          error:
            "Target admin email is required.",
        },
        400
      );
    }

    /*
     * Prevent Super Admin from changing
     * their own password through this function.
     */
    if (targetEmail === callerEmail) {
      return json(
        {
          success: false,
          error:
            "You cannot change your own password from Admin Access.",
        },
        400
      );
    }

    /*
     * Password validation.
     */
    if (newPassword.length < 8) {
      return json(
        {
          success: false,
          error:
            "Password must be at least 8 characters long.",
        },
        400
      );
    }

    if (newPassword.length > 72) {
      return json(
        {
          success: false,
          error:
            "Password must not be longer than 72 characters.",
        },
        400
      );
    }

    /*
     * Find the target in admin_users.
     */
    const {
      data: targetAdmin,
      error: targetAdminError,
    } = await adminClient
      .from("admin_users")
      .select(
        "id, email, full_name, role, is_active"
      )
      .ilike("email", targetEmail)
      .maybeSingle();

    if (targetAdminError) {
      throw targetAdminError;
    }

    if (!targetAdmin) {
      return json(
        {
          success: false,
          error:
            "Target admin account was not found.",
        },
        404
      );
    }

    /*
     * IMPORTANT:
     *
     * admin_users.id is NOT guaranteed to be
     * the same as auth.users.id in your schema.
     *
     * Therefore we search Auth by email.
     */
    let targetAuthUser = null;

    let page = 1;
    const perPage = 1000;

    while (!targetAuthUser) {
      const {
        data: usersPage,
        error: usersError,
      } =
        await adminClient.auth.admin.listUsers({
          page,
          perPage,
        });

      if (usersError) {
        throw usersError;
      }

      const users =
        usersPage?.users || [];

      targetAuthUser = users.find(
        (user) =>
          user.email
            ?.toLowerCase()
            .trim() === targetEmail
      );

      if (users.length < perPage) {
        break;
      }

      page += 1;
    }

    if (!targetAuthUser) {
      return json(
        {
          success: false,
          error:
            "The target admin has no matching Supabase Auth account.",
        },
        404
      );
    }

    /*
     * Actually change the password.
     */
    const {
      error: passwordError,
    } =
      await adminClient.auth.admin.updateUserById(
        targetAuthUser.id,
        {
          password: newPassword,
        }
      );

    if (passwordError) {
      throw passwordError;
    }

    /*
     * Log the password change.
     *
     * NEVER put the password into metadata.
     */
    const { error: logError } =
      await adminClient
        .from("admin_activity_log")
        .insert({
          actor_email: callerEmail,
          action: "changed_admin_password",
          target_email: targetEmail,
          metadata: {
            target_role:
              targetAdmin.role,

            target_role_label:
              targetAdmin.role === "super_admin"
                ? "Super Admin"
                : targetAdmin.role === "coordinator"
                  ? "Mobile Coordinator"
                  : targetAdmin.role === "receiving_staff"
                    ? "Receiving Staff"
                    : targetAdmin.role === "accounting"
                      ? "Accounting"
                      : targetAdmin.role === "moderator"
                        ? "Moderator"
                        : "Admin",
          },
        });

    if (logError) {
      console.error(
        "Password changed, but activity log failed:",
        logError
      );
    }

    /*
     * Send notification email.
     *
     * IMPORTANT:
     * The new password is NEVER included.
     */
    const gmailUser =
      Deno.env.get("GMAIL_USER");

    const gmailAppPassword =
      Deno.env.get("GMAIL_APP_PASSWORD");

    if (
      gmailUser &&
      gmailAppPassword
    ) {
      try {
        const transporter =
          nodemailer.createTransport({
            service: "gmail",

            auth: {
              user: gmailUser,
              pass: gmailAppPassword,
            },
          });

        await transporter.sendMail({
          from: `"GreenSort Admin" <${gmailUser}>`,
          to: targetEmail,

          subject:
            "Your GreenSort Admin password was changed",

          html: `
            <div
              style="
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #1f2937;
                max-width: 620px;
                margin: 0 auto;
              "
            >
              <h2>
                Your GreenSort Admin password was changed
              </h2>

              <p>
                Hi ${targetAdmin.full_name || "Admin"},
              </p>

              <p>
                Your GreenSort Admin Portal password
                was changed by a Super Admin.
              </p>

              <p>
                <strong>
                  For your security, the new password
                  is not included in this email.
                </strong>
              </p>

              <p>
                If you did not expect this change,
                please contact your GreenSort Super Admin
                immediately.
              </p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error(
          "Password changed, but notification email failed:",
          emailError
        );
      }
    } else {
      console.warn(
        "GMAIL_USER or GMAIL_APP_PASSWORD is missing. " +
          "Password was changed, but no notification email was sent."
      );
    }

    return json({
      success: true,
      message:
        "Admin password changed successfully. The new password was not emailed.",
    });
  } catch (error) {
    console.error(
      "Admin change password error:",
      error
    );

    return json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to change admin password.",
      },
      500
    );
  }
});
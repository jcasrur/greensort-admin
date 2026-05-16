// supabase/functions/send-admin-invite/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import nodemailer from "npm:nodemailer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Gmail SMTP credentials from Supabase secrets
    const GMAIL_USER = Deno.env.get("GMAIL_USER");
    const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");

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

    const { to_email, to_name, role, invite_link } = payload;

    if (!to_email || !invite_link) {
      throw new Error("Missing to_email or invite_link in payload.");
    }

    const subject =
      role === "super_admin"
        ? "Action Required: GreenSort Super Admin Invitation"
        : "You're Invited: GreenSort Admin Portal Access";

    const htmlContent =
      role === "super_admin"
        ? `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
            <h2>Hi ${to_name || "Super Admin"},</h2>

            <p>
              You have been officially invited to join the
              <strong>GreenSort Admin Portal</strong> as a
              <strong>SUPER ADMIN</strong>.
            </p>

            <p>
              As a Super Admin, you will have full control over the system,
              including managing admins, allowlist access, and system configurations.
            </p>

            <a href="${invite_link}"
              style="display:inline-block;padding:12px 20px;background-color:#F59E0B;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;">
              Accept Super Admin Invite
            </a>

            <p style="margin-top:20px;">
              <em>This link expires in 48 hours.</em>
            </p>
          </div>
        `
        : `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
            <h2>Hi ${to_name || "Admin"},</h2>

            <p>
              You have been officially invited to join the
              <strong>GreenSort Admin Portal</strong> as an
              <strong>ADMIN</strong>.
            </p>

            <p>
              Accept your invitation and set up your account by clicking the button below:
            </p>

            <a href="${invite_link}"
              style="display:inline-block;padding:12px 20px;background-color:#10B981;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;">
              Accept Admin Invite
            </a>

            <p style="margin-top:20px;">
              <em>This link expires in 48 hours.</em>
            </p>
          </div>
        `;

    // Gmail SMTP transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
    });

    const mailResult = await transporter.sendMail({
      from: `"GreenSort Admin" <${GMAIL_USER}>`,
      to: to_email,
      subject,
      html: htmlContent,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invitation email sent successfully.",
        messageId: mailResult.messageId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Send invite error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to send invitation email.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
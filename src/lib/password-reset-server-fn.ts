import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

export interface SendPasswordResetEmailInput {
  email: string;
  redirectTo?: string;
}

export interface SendPasswordResetEmailResponse {
  ok: boolean;
  message: string;
  error?: string;
}

interface RateLimitRecord {
  lastSentAt: number;
  count: number;
}

/**
 * Server-side rate limiting store across invocations.
 * Keyed by normalized email address.
 */
const resetRateLimitStore = new Map<string, RateLimitRecord>();

const COOLDOWN_MS = 60 * 1000; // 60 seconds minimum between dispatches for same email
const HOURLY_WINDOW_MS = 60 * 60 * 1000; // 1 hour sliding window
const MAX_PER_HOUR = 5; // Max 5 requests per hour per email address

function normalizeEmail(email: string): string {
  return (email || "").trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function cleanupExpiredRecords(): void {
  const now = Date.now();
  for (const [email, record] of resetRateLimitStore.entries()) {
    if (now - record.lastSentAt > HOURLY_WINDOW_MS) {
      resetRateLimitStore.delete(email);
    }
  }
}

function getSenderAddress(): string {
  const configured = process.env.RESEND_FROM_EMAIL?.trim();
  if (configured) {
    if (configured.includes("<") && configured.includes(">")) {
      return configured;
    }
    return `John Stayte Services <${configured}>`;
  }
  return "John Stayte Services <noreply@johnstayteservices.co.uk>";
}

function getLogoUrl(): string {
  return process.env.APP_PUBLIC_LOGO_URL?.trim() || "https://john-stayte.vercel.app/image-5.png";
}

function resolveRedirectUrl(requestedRedirect?: string): string {
  if (requestedRedirect) {
    try {
      const parsed = new URL(requestedRedirect);
      const allowedHosts = [
        "localhost",
        "127.0.0.1",
        "stayte-hub-suite.lovable.app",
        "john-stayte.vercel.app",
        "www.johnstayteservices.co.uk",
        "johnstayteservices.co.uk",
      ];
      const isAllowed = allowedHosts.some(
        (h) =>
          parsed.hostname === h ||
          parsed.hostname.endsWith(".lovable.app") ||
          parsed.hostname.endsWith(".vercel.app"),
      );
      if (isAllowed) {
        return `${parsed.origin}/login`;
      }
    } catch {
      // Fallback below
    }
  }
  const appUrl =
    process.env.APP_URL || process.env.VITE_APP_URL || "https://stayte-hub-suite.lovable.app";
  return `${appUrl.replace(/\/$/, "")}/login`;
}

function buildPasswordResetEmailHtml(actionLink: string): string {
  const logoUrl = getLogoUrl();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your John Stayte Services Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
          <!-- Header with Official JSS Logo -->
          <tr>
            <td style="background-color: #0f172a; padding: 24px 32px; text-align: left; border-bottom: 3px solid #e2231a;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse;">
                <tr>
                  <td valign="middle" style="width: 52px; padding-right: 16px; vertical-align: middle;">
                    <img
                      src="${logoUrl}"
                      alt="John Stayte Services Logo"
                      width="48"
                      height="48"
                      style="display: block; width: 48px; height: 48px; border-radius: 10px; border: 0; outline: none; text-decoration: none;"
                    />
                  </td>
                  <td valign="middle" style="vertical-align: middle;">
                    <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff; line-height: 1.2;">
                      JOHN STAYTE <span style="color: #e2231a;">SERVICES</span>
                    </h1>
                    <p style="margin: 4px 0 0; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                      Password Recovery
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 36px 32px 28px;">
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #0f172a;">
                Reset Your Password
              </h2>
              <p style="margin: 0 0 20px; font-size: 15px; color: #475569;">
                We received a request to reset the password for your John Stayte Services account. Click the button below to choose a new password:
              </p>

              <!-- Action Button -->
              <div style="text-align: center; margin: 28px 0;">
                <a
                  href="${actionLink}"
                  target="_blank"
                  rel="noopener noreferrer"
                  style="display: inline-block; background-color: #e2231a; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(226, 35, 26, 0.25);"
                >
                  Reset My Password
                </a>
              </div>

              <!-- Fallback Direct URL -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin: 24px 0; word-break: break-all;">
                <p style="margin: 0 0 6px; font-size: 12px; color: #64748b; font-weight: 600;">
                  If the button above does not work, copy and paste this link into your browser:
                </p>
                <a href="${actionLink}" style="font-size: 12px; color: #e2231a; text-decoration: underline;">
                  ${actionLink}
                </a>
              </div>

              <!-- Security Notice -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px;">
                <tr>
                  <td style="font-size: 13px; color: #991b1b; line-height: 1.5;">
                    <strong>Security Notice:</strong> This reset link is single-use and will expire in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email — your account and password remain secure.
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 13px; color: #64748b;">
                For assistance, please contact John Stayte Services support.
              </p>
            </td>
          </tr>

          <!-- Footer with Canonical Business Contact Details -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 6px; font-size: 13px; font-weight: 700; color: #0f172a;">
                John Stayte Services Ltd
              </p>
              <p style="margin: 0 0 10px; font-size: 12px; color: #64748b; line-height: 1.5;">
                Puddlesworth Lane, Eastington, Stonehouse, Gloucestershire, GL10 3AH, United Kingdom
              </p>
              <p style="margin: 0 0 8px; font-size: 12px; color: #64748b; line-height: 1.6;">
                <strong>Phone:</strong> <a href="tel:+441453822859" style="color: #e2231a; text-decoration: none; font-weight: 600;">+44 (0)1453 822859</a> &nbsp;•&nbsp;
                <strong>Email:</strong> <a href="mailto:info@johnstayteservices.co.uk" style="color: #e2231a; text-decoration: none; font-weight: 600;">info@johnstayteservices.co.uk</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                <a href="https://www.johnstayteservices.co.uk" target="_blank" rel="noopener noreferrer" style="color: #64748b; text-decoration: underline;">www.johnstayteservices.co.uk</a> • Gloucestershire &amp; Cotswolds LPG Distribution
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildPasswordResetEmailText(actionLink: string): string {
  return `JOHN STAYTE SERVICES - PASSWORD RESET

We received a request to reset the password for your John Stayte Services account.

Click the link below to set a new password:
${actionLink}

IMPORTANT: This link is single-use and will expire in 1 hour.

If you did not request a password reset, you can safely ignore this email — your account remains secure.

John Stayte Services Ltd
Puddlesworth Lane, Eastington, Stonehouse, Gloucestershire, GL10 3AH, United Kingdom
Phone: +44 (0)1453 822859
Email: info@johnstayteservices.co.uk
Website: https://www.johnstayteservices.co.uk`;
}

/**
 * Server Function: Dispatches a password recovery link using Resend and Supabase admin.generateLink.
 */
export const sendPasswordResetEmailServerFn = createServerFn({ method: "POST" })
  .validator((data: SendPasswordResetEmailInput) => data)
  .handler(async ({ data }): Promise<SendPasswordResetEmailResponse> => {
    const cleanEmail = normalizeEmail(data?.email);

    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      return {
        ok: false,
        message: "Please provide a valid email address.",
        error: "Invalid email",
      };
    }

    const resendApiKey = process.env.RESEND_API_KEY?.trim();
    if (!resendApiKey) {
      console.error("[Password Reset ServerFn] RESEND_API_KEY is not configured.");
      return {
        ok: false,
        message: "Email service is temporarily unavailable. Please try again later.",
        error: "Unconfigured email provider",
      };
    }

    cleanupExpiredRecords();

    const now = Date.now();
    const existingRate = resetRateLimitStore.get(cleanEmail);

    // 1. Enforce cooldown between requests (60 seconds)
    if (existingRate && now - existingRate.lastSentAt < COOLDOWN_MS) {
      const waitSeconds = Math.ceil((COOLDOWN_MS - (now - existingRate.lastSentAt)) / 1000);
      return {
        ok: false,
        message: `Please wait ${waitSeconds} seconds before requesting another reset email.`,
        error: "Rate limit reached",
      };
    }

    // 2. Enforce maximum requests per hour (5 max)
    if (existingRate && existingRate.count >= MAX_PER_HOUR) {
      return {
        ok: false,
        message: "Too many password reset requests. Please wait a while before requesting again.",
        error: "Rate limit reached",
      };
    }

    // 3. Connect to Supabase with service role to generate recovery link
    const supabaseUrl =
      process.env.VITE_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      "https://wttchknauwvbfjatdscc.supabase.co";

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      console.error("[Password Reset ServerFn] SUPABASE_SERVICE_ROLE_KEY is not configured.");
      return {
        ok: false,
        message: "Password reset service is temporarily unavailable. Please contact support.",
        error: "Server configuration missing",
      };
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const targetRedirectUrl = resolveRedirectUrl(data?.redirectTo);

    let actionLink: string | null = null;
    try {
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: cleanEmail,
        options: {
          redirectTo: targetRedirectUrl,
        },
      });

      if (linkError) {
        // Security requirement: Avoid revealing whether an email address is registered
        const isNotFound =
          linkError.status === 404 ||
          linkError.message.toLowerCase().includes("not found") ||
          linkError.message.toLowerCase().includes("user");

        if (isNotFound) {
          // Record rate limit attempt so rapid scanning is blocked
          resetRateLimitStore.set(cleanEmail, {
            lastSentAt: now,
            count: (existingRate?.count || 0) + 1,
          });

          return {
            ok: true,
            message:
              "If an account exists with this email address, you will receive password reset instructions shortly.",
          };
        }

        console.error(
          `[Password Reset ServerFn] Supabase admin.generateLink error: ${linkError.message}`,
        );
        return {
          ok: false,
          message: "Failed to generate password reset instructions. Please try again later.",
          error: "Link generation failed",
        };
      }

      actionLink = linkData?.properties?.action_link || null;
    } catch (err: any) {
      console.error("[Password Reset ServerFn] Unexpected error generating link:", err?.message);
      return {
        ok: false,
        message: "Failed to process password reset request. Please try again later.",
        error: "Unexpected error",
      };
    }

    if (!actionLink) {
      return {
        ok: false,
        message: "Could not generate a recovery link. Please contact customer support.",
        error: "Missing action link",
      };
    }

    // 4. Update rate limit record
    resetRateLimitStore.set(cleanEmail, {
      lastSentAt: now,
      count: (existingRate?.count || 0) + 1,
    });

    // 5. Dispatch email via Resend
    const sender = getSenderAddress();
    const emailHtml = buildPasswordResetEmailHtml(actionLink);
    const emailText = buildPasswordResetEmailText(actionLink);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      let response: Response;
      try {
        response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
            "User-Agent": "JohnStayteServices-PasswordReset/1.0",
          },
          body: JSON.stringify({
            from: sender,
            to: [cleanEmail],
            subject: "Reset Your John Stayte Services Password",
            html: emailHtml,
            text: emailText,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const errJson = (await response.json().catch(() => ({}))) as { message?: string };
        console.error(
          `[Password Reset ServerFn] Resend dispatch failed with HTTP ${response.status}:`,
          errJson.message || "Unknown error",
        );

        if (response.status === 429) {
          return {
            ok: false,
            message: "Too many email requests. Please wait a few minutes before trying again.",
            error: "Rate limit reached",
          };
        }

        return {
          ok: false,
          message:
            "We were unable to deliver the reset email. Please verify your email or try again later.",
          error: "Email delivery failed",
        };
      }

      return {
        ok: true,
        message:
          "If an account exists with this email address, you will receive password reset instructions shortly.",
      };
    } catch (err: any) {
      console.error("[Password Reset ServerFn] Resend fetch exception:", err?.message);
      return {
        ok: false,
        message: "Network error contacting email provider. Please try again in a few moments.",
        error: "Network error",
      };
    }
  });

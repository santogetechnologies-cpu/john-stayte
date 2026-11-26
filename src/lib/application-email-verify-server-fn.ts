import { createServerFn } from "@tanstack/react-start";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export interface SendApplicationEmailVerifyInput {
  email: string;
  authToken?: string | null;
}

export interface SendApplicationEmailVerifyResponse {
  ok: boolean;
  message: string;
  error?: string;
  cooldownEndsAt?: number;
  retryAfterSeconds?: number;
}

export interface VerifyApplicationEmailCodeInput {
  email: string;
  code: string;
  authToken?: string | null;
}

export interface VerifyApplicationEmailCodeResponse {
  ok: boolean;
  verifiedEmail?: string;
  error?: string;
}

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const VERIFIED_GRACE_MS = 2 * 60 * 60 * 1000; // 2 hours for application submission
const SEND_COOLDOWN_MS = 60 * 1000; // 60 seconds rate-limit between requests
const HOURLY_WINDOW_MS = 60 * 60 * 1000; // 1 hour sliding window
const MAX_SENDS_PER_HOUR = 8;
const MAX_VERIFY_ATTEMPTS = 5;

function getSupabaseUrl(): string {
  return (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    "https://wttchknauwvbfjatdscc.supabase.co"
  );
}

function getServerSupabaseAdmin(): SupabaseClient<Database> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "[Email Verification ServerFn] SUPABASE_SERVICE_ROLE_KEY is not configured on the server.",
    );
  }
  return createClient<Database>(getSupabaseUrl(), serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function resolveCallerUserId(authToken?: string | null): Promise<string | null> {
  const cleanToken = typeof authToken === "string" ? authToken.trim() : "";
  if (!cleanToken) return null;

  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!anonKey) return null;

  try {
    const anonClient = createClient<Database>(getSupabaseUrl(), anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await anonClient.auth.getUser(cleanToken);
    if (error || !data?.user?.id) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

/**
 * Normalizes email address safely
 */
function normalizeEmail(email: string): string {
  return (email || "").trim().toLowerCase();
}

/**
 * Validates basic email format
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Generates a cryptographically secure 6-digit numeric OTP.
 */
function generateSecureOtp(): string {
  const randomArray = new Uint32Array(1);
  crypto.getRandomValues(randomArray);
  return (100000 + (randomArray[0] % 900000)).toString();
}

/**
 * Computes a salted SHA-256 hash using the Web Crypto API.
 */
async function hashOtp(otp: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${otp}`);
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuf));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Constant-time string comparison to prevent timing side-channel attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Resolves the verified sender address for Resend.
 * Defaults to "John Stayte Services <noreply@johnstayteservices.co.uk>" if RESEND_FROM_EMAIL is unconfigured.
 */
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

/**
 * Resolves the public absolute HTTPS URL for the official JSS brand logo.
 * Defaults to the verified production deployment asset at https://john-stayte.vercel.app/image-5.png.
 */
function getLogoUrl(): string {
  return process.env.APP_PUBLIC_LOGO_URL?.trim() || "https://john-stayte.vercel.app/image-5.png";
}

/**
 * Generates the responsive HTML email template for John Stayte Services.
 */
function buildVerificationEmailHtml(otpCode: string): string {
  const logoUrl = getLogoUrl();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your John Stayte Services Verification Code</title>
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
                      Gas Customer Application Verification
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
                Verify Your Email Address
              </h2>
              <p style="margin: 0 0 24px; font-size: 15px; color: #475569;">
                Thank you for applying for a customer account with John Stayte Services. To verify your email address and continue with your Gas Customer Application, please enter the 6-digit verification code below:
              </p>

              <!-- Verification Code Display -->
              <div style="background-color: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 22px 20px; text-align: center; margin: 0 0 24px;">
                <div style="font-family: 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #0f172a; margin-left: 10px;">
                  ${otpCode}
                </div>
                <div style="font-size: 12px; color: #64748b; margin-top: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                  Single-Use Verification Code
                </div>
              </div>

              <!-- Expiry & Security Notice -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px;">
                <tr>
                  <td style="font-size: 13px; color: #991b1b; line-height: 1.5;">
                    <strong>Security Notice:</strong> This code will expire in <strong>10 minutes</strong>. For your security, never share this code with anyone. Our staff will never request your verification code.
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 13px; color: #64748b;">
                If you did not request this verification code, you can safely ignore this email.
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

/**
 * Generates the plain text email fallback.
 */
function buildVerificationEmailText(otpCode: string): string {
  return `JOHN STAYTE SERVICES - GAS CUSTOMER APPLICATION

Your 6-digit verification code is: ${otpCode}

Thank you for applying for a customer account with John Stayte Services.

Please enter this verification code in the customer application form to verify your email address.

IMPORTANT: This code will expire in 10 minutes. For your security, never share this code with anyone.

If you did not request this verification code, you can safely ignore this email.

John Stayte Services Ltd
Puddlesworth Lane, Eastington, Stonehouse, Gloucestershire, GL10 3AH, United Kingdom
Phone: +44 (0)1453 822859
Email: info@johnstayteservices.co.uk
Website: https://www.johnstayteservices.co.uk`;
}

/**
 * Core handler: Dispatches a 6-digit verification code via Resend and persists
 * the salted SHA-256 OTP record in public.email_verifications.
 */
export async function handleSendApplicationEmailVerify(
  data: SendApplicationEmailVerifyInput,
  supabaseClient?: SupabaseClient<Database>,
): Promise<SendApplicationEmailVerifyResponse> {
  const cleanEmail = normalizeEmail(data?.email);

  if (!cleanEmail || !isValidEmail(cleanEmail)) {
    return {
      ok: false,
      message: "Please provide a valid email address to receive your verification code.",
      error: "Invalid email format",
    };
  }

  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (!resendApiKey) {
    console.error(
      "[Resend Email Verify] Dispatch halted: RESEND_API_KEY environment variable is not configured.",
    );
    return {
      ok: false,
      message:
        "Email verification service is not fully configured on the server. Please check RESEND_API_KEY in server environment.",
      error: "Verification provider unconfigured",
    };
  }

  let supabase: SupabaseClient<Database>;
  try {
    supabase = supabaseClient || getServerSupabaseAdmin();
  } catch (err: any) {
    console.error("[Resend Email Verify] Server Supabase initialization failed:", err?.message);
    return {
      ok: false,
      message: "Verification service is temporarily unavailable. Please try again later.",
      error: "Server configuration missing",
    };
  }

  const callerUserId = await resolveCallerUserId(data?.authToken);
  const now = Date.now();
  const oneHourAgoIso = new Date(now - HOURLY_WINDOW_MS).toISOString();

  // Check persistent rate limiting (cooldown + hourly cap) across serverless instances
  const { data: recentRows, error: rateErr } = await (supabase.from("email_verifications") as any)
    .select("id, created_at, metadata")
    .eq("email", cleanEmail)
    .gte("created_at", oneHourAgoIso)
    .order("created_at", { ascending: false })
    .limit(MAX_SENDS_PER_HOUR + 1);

  if (rateErr) {
    console.error("[Resend Email Verify] Database rate-limit check failed:", rateErr.message);
    return {
      ok: false,
      message: "Unable to verify request rate limit. Please try again shortly.",
      error: "Database error",
    };
  }

  if (Array.isArray(recentRows) && recentRows.length > 0) {
    const latest = recentRows[0];
    const lastSentMs =
      Number(latest?.metadata?.last_sent_at) ||
      (latest?.created_at ? new Date(latest.created_at).getTime() : 0);

    if (lastSentMs && now - lastSentMs < SEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((SEND_COOLDOWN_MS - (now - lastSentMs)) / 1000);
      return {
        ok: false,
        message: `Please wait ${waitSeconds} seconds before requesting another verification code.`,
        error: "Rate limit reached",
        cooldownEndsAt: lastSentMs + SEND_COOLDOWN_MS,
        retryAfterSeconds: waitSeconds,
      };
    }

    if (recentRows.length >= MAX_SENDS_PER_HOUR) {
      return {
        ok: false,
        message: "Too many verification requests. Please wait a while before requesting another code.",
        error: "Rate limit reached",
      };
    }
  }

  // Generate secure 6-digit OTP and salted SHA-256 hash
  const rawOtp = generateSecureOtp();
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const salt = Array.from(saltBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  const hashed = await hashOtp(rawOtp, salt);
  const hashedToken = `sha256:${salt}:${hashed}`;

  const senderEmail = getSenderAddress();
  const emailHtml = buildVerificationEmailHtml(rawOtp);
  const emailText = buildVerificationEmailText(rawOtp);

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
          "User-Agent": "JohnStayteServices-Verification/1.0",
        },
        body: JSON.stringify({
          from: senderEmail,
          to: [cleanEmail],
          subject: `Your John Stayte Services Verification Code: ${rawOtp}`,
          html: emailHtml,
          text: emailText,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errData = (await response.json().catch(() => ({}))) as {
        message?: string;
        name?: string;
        statusCode?: number;
      };

      console.error(
        `[Resend Email Verify] Dispatch failed with HTTP ${response.status} (${errData.name || "Error"}):`,
        errData.message || "Unknown error",
      );

      if (response.status === 429) {
        return {
          ok: false,
          message: "Too many verification attempts. Please wait a few minutes before requesting another code.",
          error: "Rate limit reached",
        };
      }

      if (response.status === 401 || response.status === 403) {
        return {
          ok: false,
          message:
            "Email verification service is temporarily unavailable due to a service authorization issue. Please contact support.",
          error: "Authentication error",
        };
      }

      if (response.status === 422) {
        const isDomainErr =
          errData.message?.toLowerCase().includes("domain") ||
          errData.message?.toLowerCase().includes("verify");
        return {
          ok: false,
          message: isDomainErr
            ? "The sender domain is currently being verified. Please try again shortly or contact support."
            : errData.message || "Failed to dispatch verification email. Please check your email address.",
          error: "Validation error",
        };
      }

      const userMsg =
        errData.message && errData.message.includes("testing emails")
          ? errData.message
          : "Failed to dispatch verification email. Please check your email address and try again.";

      return {
        ok: false,
        message: userMsg,
        error: "Resend email dispatch error",
      };
    }

    // Invalidate any prior unverified OTP records for this email before storing the new code
    const nowIso = new Date(now).toISOString();
    const expiresIso = new Date(now + OTP_EXPIRY_MS).toISOString();

    await (supabase.from("email_verifications") as any)
      .update({
        verification_token: null,
        expires_at: nowIso,
        updated_at: nowIso,
      })
      .eq("email", cleanEmail)
      .is("verified_at", null);

    // Persist hashed OTP record in Supabase public.email_verifications
    const { error: insertErr } = await (supabase.from("email_verifications") as any).insert([
      {
        user_id: callerUserId,
        email: cleanEmail,
        verification_token: hashedToken,
        verified_at: null,
        expires_at: expiresIso,
        attempts: 0,
        max_attempts: MAX_VERIFY_ATTEMPTS,
        metadata: {
          provider: "resend",
          type: "gas_application",
          last_sent_at: now,
        },
        created_at: nowIso,
        updated_at: nowIso,
      },
    ]);

    if (insertErr) {
      console.error("[Resend Email Verify] Failed to persist OTP record:", insertErr.message);
      return {
        ok: false,
        message: "Failed to persist verification session. Please try again.",
        error: "Database error",
      };
    }

    return {
      ok: true,
      message: `A 6-digit verification code has been sent to ${cleanEmail}. Please check your inbox.`,
      cooldownEndsAt: now + SEND_COOLDOWN_MS,
      retryAfterSeconds: Math.ceil(SEND_COOLDOWN_MS / 1000),
    };
  } catch (err: any) {
    const isTimeout = err?.name === "AbortError";
    const errorMsg = isTimeout
      ? "Connection to email verification service timed out. Please try again."
      : "Failed to contact email verification gateway. Please try again.";

    console.error("[Resend Email Verify] Dispatch error:", err?.message || err);

    return {
      ok: false,
      message: errorMsg,
      error: isTimeout ? "Timeout" : "Gateway error",
    };
  }
}

/**
 * Server Function: Dispatches a 6-digit verification code to the customer's email
 * using Resend transactional email API.
 */
export const sendApplicationEmailVerifyServerFn = createServerFn({ method: "POST" })
  .validator((data: SendApplicationEmailVerifyInput) => data)
  .handler(async ({ data }): Promise<SendApplicationEmailVerifyResponse> => {
    return handleSendApplicationEmailVerify(data);
  });

/**
 * Core handler: Authenticates the 6-digit OTP code submitted by the applicant
 * against the persistent cryptographically hashed record in public.email_verifications.
 */
export async function handleVerifyApplicationEmailCode(
  data: VerifyApplicationEmailCodeInput,
  supabaseClient?: SupabaseClient<Database>,
): Promise<VerifyApplicationEmailCodeResponse> {
  const cleanEmail = normalizeEmail(data?.email);
  const cleanCode = (data?.code || "").trim();

  if (!cleanEmail || !isValidEmail(cleanEmail)) {
    return {
      ok: false,
      error: "Please provide a valid email address.",
    };
  }

  if (!cleanCode || cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
    return {
      ok: false,
      error: "Please enter the complete 6-digit numerical code sent to your email.",
    };
  }

  let supabase: SupabaseClient<Database>;
  try {
    supabase = supabaseClient || getServerSupabaseAdmin();
  } catch (err: any) {
    console.error("[Resend Email Verify] Server Supabase initialization failed:", err?.message);
    return {
      ok: false,
      error: "Verification service is temporarily unavailable. Please try again later.",
    };
  }

  const callerUserId = await resolveCallerUserId(data?.authToken);

  // Fetch latest verification record for this email (scoped to user_id if authenticated)
  let query = (supabase.from("email_verifications") as any)
    .select("id, user_id, email, verification_token, verified_at, expires_at, attempts, max_attempts")
    .eq("email", cleanEmail)
    .order("created_at", { ascending: false })
    .limit(1);

  if (callerUserId) {
    query = query.or(`user_id.eq.${callerUserId},user_id.is.null`);
  }

  const { data: record, error: fetchErr } = await query.maybeSingle();

  if (fetchErr) {
    console.error("[Resend Email Verify] Database lookup failed:", fetchErr.message);
    return {
      ok: false,
      error: "Failed to verify code. Please try again.",
    };
  }

  if (!record) {
    return {
      ok: false,
      error: "No active verification session found. Please request a verification code.",
    };
  }

  if (record.verified_at || !record.verification_token) {
    return {
      ok: false,
      error: "This verification code has already been used. Please request a new code if needed.",
    };
  }

  const expiresAtMs = record.expires_at ? new Date(record.expires_at).getTime() : 0;
  if (!expiresAtMs || Date.now() > expiresAtMs) {
    return {
      ok: false,
      error: "This verification code has expired. Please request a new code.",
    };
  }

  const attempts = Number(record.attempts || 0);
  const maxAttempts = Number(record.max_attempts || MAX_VERIFY_ATTEMPTS);

  if (attempts >= maxAttempts) {
    return {
      ok: false,
      error: "Maximum verification attempts exceeded. Please request a new verification code.",
    };
  }

  const tokenStr = String(record.verification_token || "");
  const parts = tokenStr.split(":");
  if (parts.length !== 3 || parts[0] !== "sha256") {
    return {
      ok: false,
      error: "Invalid verification session. Please request a new verification code.",
    };
  }

  const salt = parts[1];
  const expectedHash = parts[2];
  const candidateHash = await hashOtp(cleanCode, salt);
  const isMatch = timingSafeEqual(candidateHash, expectedHash);
  const nowIso = new Date().toISOString();

  if (!isMatch) {
    const newAttempts = attempts + 1;
    await (supabase.from("email_verifications") as any)
      .update({
        attempts: newAttempts,
        updated_at: nowIso,
      })
      .eq("id", record.id);

    const remainingAttempts = Math.max(0, maxAttempts - newAttempts);
    if (remainingAttempts <= 0) {
      return {
        ok: false,
        error: "Maximum verification attempts exceeded. Please request a new verification code.",
      };
    }
    return {
      ok: false,
      error: `Invalid verification code. Please check your inbox and try again (${remainingAttempts} attempt${remainingAttempts === 1 ? "" : "s"} remaining).`,
    };
  }

  // Mark verified, extend verified window for application submission, and invalidate OTP token
  const verifiedExpiresIso = new Date(Date.now() + VERIFIED_GRACE_MS).toISOString();
  const { error: updateErr } = await (supabase.from("email_verifications") as any)
    .update({
      verified_at: nowIso,
      expires_at: verifiedExpiresIso,
      verification_token: null,
      attempts: attempts + 1,
      user_id: record.user_id || callerUserId || null,
      updated_at: nowIso,
    })
    .eq("id", record.id);

  if (updateErr) {
    console.error("[Resend Email Verify] Failed to persist verification status:", updateErr.message);
    return {
      ok: false,
      error: "Failed to record verification status. Please try again.",
    };
  }

  return {
    ok: true,
    verifiedEmail: cleanEmail,
  };
}

/**
 * Server Function: Authenticates the 6-digit OTP code submitted by the applicant
 * against the cryptographically hashed verification record.
 */
export const verifyApplicationEmailCodeServerFn = createServerFn({ method: "POST" })
  .validator((data: VerifyApplicationEmailCodeInput) => data)
  .handler(async ({ data }): Promise<VerifyApplicationEmailCodeResponse> => {
    return handleVerifyApplicationEmailCode(data);
  });

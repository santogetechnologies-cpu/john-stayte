import { createServerFn } from "@tanstack/react-start";

export interface SendApplicationEmailVerifyInput {
  email: string;
}

export interface SendApplicationEmailVerifyResponse {
  ok: boolean;
  message: string;
  error?: string;
}

export interface VerifyApplicationEmailCodeInput {
  email: string;
  code: string;
}

export interface VerifyApplicationEmailCodeResponse {
  ok: boolean;
  verifiedEmail?: string;
  error?: string;
}

interface VerificationRecord {
  hashedToken: string; // format: "sha256:<salt>:<hash>"
  salt: string;
  expiresAt: number; // millisecond timestamp
  attempts: number;
  maxAttempts: number;
  lastSentAt: number;
  verified: boolean;
  verifiedAt?: number;
}

/**
 * In-memory verification storage across server invocations.
 * Keyed by normalized email address.
 */
const verificationStore = new Map<string, VerificationRecord>();

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const SEND_COOLDOWN_MS = 30 * 1000; // 30 seconds rate-limit between requests
const MAX_VERIFY_ATTEMPTS = 5;

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
 * Defaults to "John Stayte Services <onboarding@resend.dev>" if RESEND_FROM_EMAIL is unconfigured.
 */
function getSenderAddress(): string {
  const configured = process.env.RESEND_FROM_EMAIL?.trim();
  if (configured) {
    if (configured.includes("<") && configured.includes(">")) {
      return configured;
    }
    return `John Stayte Services <${configured}>`;
  }
  return "John Stayte Services <onboarding@resend.dev>";
}

/**
 * Removes expired or completed verification records to prevent memory growth.
 */
function cleanupExpiredRecords(): void {
  const now = Date.now();
  for (const [email, record] of verificationStore.entries()) {
    if (now > record.expiresAt + 15 * 60 * 1000) {
      verificationStore.delete(email);
    }
  }
}

/**
 * Generates the responsive HTML email template for John Stayte Services.
 */
function buildVerificationEmailHtml(otpCode: string): string {
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
          <!-- Header -->
          <tr>
            <td style="background-color: #0f172a; padding: 28px 32px; text-align: left; border-bottom: 3px solid #e2231a;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">
                JOHN STAYTE <span style="color: #e2231a;">SERVICES</span>
              </h1>
              <p style="margin: 4px 0 0; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">
                Gas Customer Application Verification
              </p>
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

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 4px; font-size: 12px; color: #64748b;">
                John Stayte Services Ltd • Gloucestershire &amp; Cotswolds LPG Distribution
              </p>
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                Tel: 01453 822100 • info@johnstayte.co.uk
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
Tel: 01453 822100 | info@johnstayte.co.uk`;
}

/**
 * Server Function: Dispatches a 6-digit verification code to the customer's email
 * using Resend transactional email API.
 */
export const sendApplicationEmailVerifyServerFn = createServerFn({ method: "POST" })
  .validator((data: SendApplicationEmailVerifyInput) => data)
  .handler(async ({ data }): Promise<SendApplicationEmailVerifyResponse> => {
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

    cleanupExpiredRecords();

    const now = Date.now();
    const existing = verificationStore.get(cleanEmail);

    // Rate limiting: cooldown between code dispatches
    if (existing && now - existing.lastSentAt < SEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((SEND_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000);
      return {
        ok: false,
        message: `Please wait ${waitSeconds} seconds before requesting another verification code.`,
        error: "Rate limit reached",
      };
    }

    // Generate secure 6-digit OTP
    const rawOtp = generateSecureOtp();

    // Generate cryptographic salt and SHA-256 hash
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
          `[Resend Email Verify] Dispatch failed with HTTP ${response.status}:`,
          errData.message || "Unknown error",
        );

        if (response.status === 429) {
          return {
            ok: false,
            message: "Too many verification attempts. Please wait a few minutes before requesting another code.",
            error: "Rate limit reached",
          };
        }

        // Return user-friendly message without exposing sensitive credentials or internals
        const userMsg = errData.message && errData.message.includes("testing emails")
          ? errData.message
          : "Failed to dispatch verification email. Please check your email address and try again.";

        return {
          ok: false,
          message: userMsg,
          error: "Resend email dispatch error",
        };
      }

      // Store hashed OTP record in memory with 10-minute expiry and attempt limit
      verificationStore.set(cleanEmail, {
        hashedToken,
        salt,
        expiresAt: now + OTP_EXPIRY_MS,
        attempts: 0,
        maxAttempts: MAX_VERIFY_ATTEMPTS,
        lastSentAt: now,
        verified: false,
      });

      return {
        ok: true,
        message: `A 6-digit verification code has been sent to ${cleanEmail}. Please check your inbox.`,
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
  });

/**
 * Server Function: Authenticates the 6-digit OTP code submitted by the applicant
 * against the cryptographically hashed verification record.
 */
export const verifyApplicationEmailCodeServerFn = createServerFn({ method: "POST" })
  .validator((data: VerifyApplicationEmailCodeInput) => data)
  .handler(async ({ data }): Promise<VerifyApplicationEmailCodeResponse> => {
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

    cleanupExpiredRecords();

    const record = verificationStore.get(cleanEmail);

    if (!record) {
      return {
        ok: false,
        error: "No active verification session found. Please request a verification code.",
      };
    }

    // Check if code has expired
    if (Date.now() > record.expiresAt) {
      verificationStore.delete(cleanEmail);
      return {
        ok: false,
        error: "This verification code has expired. Please request a new code.",
      };
    }

    // Check attempt limits
    if (record.attempts >= record.maxAttempts) {
      verificationStore.delete(cleanEmail);
      return {
        ok: false,
        error: "Maximum verification attempts exceeded. Please request a new verification code.",
      };
    }

    // Prevent code reuse
    if (record.verified || !record.hashedToken) {
      return {
        ok: false,
        error: "This verification code has already been used. Please request a new code if needed.",
      };
    }

    // Increment attempts
    record.attempts += 1;

    // Verify candidate OTP against stored salted SHA-256 hash
    const candidateHash = await hashOtp(cleanCode, record.salt);
    const expectedHash = record.hashedToken.replace(`sha256:${record.salt}:`, "");

    const isMatch = timingSafeEqual(candidateHash, expectedHash);

    if (!isMatch) {
      const remainingAttempts = record.maxAttempts - record.attempts;
      if (remainingAttempts <= 0) {
        verificationStore.delete(cleanEmail);
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

    // Mark verified and invalidate OTP token immediately to prevent reuse
    record.verified = true;
    record.verifiedAt = Date.now();
    record.hashedToken = "";

    return {
      ok: true,
      verifiedEmail: cleanEmail,
    };
  });

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
 * Retrieves server-side HTTP Basic Auth header for Twilio Verify API
 */
function getTwilioAuthHeader(): string | null {
  const apiKeySid = process.env.TWILIO_API_KEY_SID;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (apiKeySid && apiKeySecret) {
    return `Basic ${Buffer.from(`${apiKeySid}:${apiKeySecret}`).toString("base64")}`;
  }

  if (accountSid && (authToken || apiKeySecret)) {
    return `Basic ${Buffer.from(`${accountSid}:${authToken || apiKeySecret}`).toString("base64")}`;
  }

  return null;
}

/**
 * Server Function: Dispatches a 6-digit verification code to the customer's email
 * using Twilio Verify (with Twilio SendGrid transactional email integration).
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

    const authHeader = getTwilioAuthHeader();
    const serviceSid = process.env.TWILIO_VERIFY_EMAIL_SERVICE_SID || process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!authHeader || !serviceSid) {
      console.error(
        "[Twilio Verify Email] Missing server configuration: TWILIO_VERIFY_EMAIL_SERVICE_SID or Twilio API credentials.",
      );
      return {
        ok: false,
        message:
          "Email verification service is not fully configured on the server. Please verify TWILIO_VERIFY_EMAIL_SERVICE_SID in server environment.",
        error: "Verify service unconfigured",
      };
    }

    try {
      const endpoint = `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`;

      const bodyParams = new URLSearchParams();
      bodyParams.append("To", cleanEmail);
      bodyParams.append("Channel", "email");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      let response: Response;
      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: bodyParams.toString(),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      const resData = (await response.json()) as {
        sid?: string;
        service_sid?: string;
        status?: string;
        code?: number;
        message?: string;
      };

      if (!response.ok) {
        const twilioCode = resData.code;

        if (twilioCode === 60203 || response.status === 429) {
          return {
            ok: false,
            message: "Too many verification attempts. Please wait a few minutes before requesting another code.",
            error: "Rate limit reached",
          };
        }

        if (twilioCode === 60200) {
          return {
            ok: false,
            message: "The email address provided could not be verified. Please check the spelling.",
            error: "Invalid email address",
          };
        }

        console.error(
          `[Twilio Verify Email] Request failed with HTTP ${response.status} (Code ${twilioCode}):`,
          resData.message,
        );

        return {
          ok: false,
          message: resData.message || "Failed to send email verification code. Please try again.",
          error: resData.message || "Twilio Verify dispatch error",
        };
      }

      return {
        ok: true,
        message: `A 6-digit verification code has been sent to ${cleanEmail}. Please check your inbox.`,
      };
    } catch (err: any) {
      const errorMsg =
        err.name === "AbortError"
          ? "Connection to verification service timed out."
          : err.message || "Failed to contact email verification gateway.";

      console.error("[Twilio Verify Email] Dispatch error:", errorMsg);

      return {
        ok: false,
        message: errorMsg,
        error: errorMsg,
      };
    }
  });

/**
 * Server Function: Authenticates the 6-digit OTP code submitted by the applicant
 * against Twilio Verify.
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

    const authHeader = getTwilioAuthHeader();
    const serviceSid = process.env.TWILIO_VERIFY_EMAIL_SERVICE_SID || process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!authHeader || !serviceSid) {
      console.error("[Twilio Verify Email] Missing Twilio Verify configuration for code check.");
      return {
        ok: false,
        error: "Verification service configuration missing on server.",
      };
    }

    try {
      const endpoint = `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`;

      const bodyParams = new URLSearchParams();
      bodyParams.append("To", cleanEmail);
      bodyParams.append("Code", cleanCode);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      let response: Response;
      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: bodyParams.toString(),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      const resData = (await response.json()) as {
        sid?: string;
        service_sid?: string;
        status?: string;
        valid?: boolean;
        code?: number;
        message?: string;
      };

      if (!response.ok) {
        const twilioCode = resData.code;

        if (twilioCode === 60202) {
          return {
            ok: false,
            error: "Maximum verification attempts exceeded. Please request a new verification code.",
          };
        }

        if (twilioCode === 60204 || twilioCode === 20404) {
          return {
            ok: false,
            error: "This verification code has expired. Please request a new code.",
          };
        }

        if (twilioCode === 60212) {
          return {
            ok: false,
            error: "Invalid verification code. Please check your inbox and try again.",
          };
        }

        return {
          ok: false,
          error: resData.message || "Verification check failed. Please check the code and try again.",
        };
      }

      if (resData.status === "approved" || resData.valid === true) {
        return {
          ok: true,
          verifiedEmail: cleanEmail,
        };
      }

      return {
        ok: false,
        error: "Invalid verification code. Please check your inbox and try again.",
      };
    } catch (err: any) {
      const errorMsg =
        err.name === "AbortError"
          ? "Verification check timed out. Please try again."
          : err.message || "Failed to contact verification service.";

      console.error("[Twilio Verify Email] Verification check error:", errorMsg);

      return {
        ok: false,
        error: errorMsg,
      };
    }
  });

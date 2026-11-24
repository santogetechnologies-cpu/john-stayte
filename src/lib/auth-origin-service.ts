/**
 * Auth Origin and Redirection Service for John Stayte Services
 *
 * Resolves the canonical app origin for authentication redirects and verification links.
 * Prioritizes window.location.origin in the browser, falling back to environment configuration
 * or the official production domain (https://john-stayte.vercel.app).
 */

export const AUTHORIZED_ORIGINS = [
  "https://john-stayte.vercel.app",
  "https://stayte-hub-suite.lovable.app",
  "https://www.johnstayteservices.co.uk",
  "https://johnstayteservices.co.uk",
  "http://localhost:8080",
  "http://localhost:3000",
  "http://localhost:5173",
] as const;

export function getAppOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    if (window.location.origin !== "null" && window.location.origin.startsWith("http")) {
      return window.location.origin;
    }
  }

  const envUrl =
    (typeof process !== "undefined" &&
      (process.env.APP_URL ||
        process.env.VITE_APP_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null))) ||
    (typeof import.meta !== "undefined" &&
      ((import.meta as any).env?.VITE_APP_URL || (import.meta as any).env?.APP_URL));

  if (envUrl) {
    return String(envUrl).replace(/\/$/, "");
  }

  return "https://john-stayte.vercel.app";
}

export function buildEmailConfirmationRedirectUrl(customOrigin?: string): string {
  const origin = customOrigin || getAppOrigin();
  return `${origin}/login?confirmed=true`;
}

export function isCrossDevicePkceError(errorMessage?: string | null): boolean {
  if (!errorMessage) return false;
  const lower = errorMessage.toLowerCase();
  return (
    lower.includes("code verifier") ||
    lower.includes("code_verifier") ||
    lower.includes("both auth code and code verifier should be non-empty") ||
    lower.includes("pkce")
  );
}

export function isCodeAlreadyExchangedError(errorMessage?: string | null): boolean {
  if (!errorMessage) return false;
  const lower = errorMessage.toLowerCase();
  return (
    lower.includes("already been used") ||
    lower.includes("already used") ||
    lower.includes("already exchanged")
  );
}

export function parseVerificationError(
  errorDesc?: string | null,
  errorCode?: string | null
): { isExpired: boolean; isCrossDevice: boolean; message: string } | null {
  if (!errorDesc && !errorCode) return null;

  const raw = errorDesc || "";
  const decoded = decodeURIComponent(raw.replace(/\+/g, " "));

  if (isCrossDevicePkceError(decoded)) {
    return {
      isExpired: false,
      isCrossDevice: true,
      message:
        "Email verified successfully! Please sign in with your password to continue.",
    };
  }

  const isExpired =
    decoded.toLowerCase().includes("expired") ||
    errorCode === "otp_expired" ||
    decoded.toLowerCase().includes("invalid");

  const message = isExpired
    ? "Your verification link has expired or has already been used. Please request a new confirmation email below or sign in."
    : decoded || "Verification link is invalid.";

  return { isExpired, isCrossDevice: false, message };
}


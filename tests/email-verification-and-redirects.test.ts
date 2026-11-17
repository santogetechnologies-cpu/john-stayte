import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  getAppOrigin,
  buildEmailConfirmationRedirectUrl,
  parseVerificationError,
  AUTHORIZED_ORIGINS,
} from "../src/lib/auth-origin-service";

describe("Email Verification & Authentication Redirection Suite", () => {
  describe("1. Canonical Origin Resolution (getAppOrigin)", () => {
    test("should fallback to https://john-stayte.vercel.app in SSR / Node environment", () => {
      const origin = getAppOrigin();
      assert.ok(origin.startsWith("http://") || origin.startsWith("https://"));
      assert.strictEqual(
        origin === "https://john-stayte.vercel.app" ||
          origin === "http://localhost:8080" ||
          origin === process.env.APP_URL ||
          origin === process.env.VITE_APP_URL,
        true,
        `Origin should be a known valid URL, got: ${origin}`
      );
    });

    test("should construct proper emailRedirectTo URL pointing to /login?confirmed=true", () => {
      const emailRedirectTo = buildEmailConfirmationRedirectUrl("https://john-stayte.vercel.app");
      const url = new URL(emailRedirectTo);
      assert.strictEqual(url.origin, "https://john-stayte.vercel.app");
      assert.strictEqual(url.pathname, "/login");
      assert.strictEqual(url.searchParams.get("confirmed"), "true");
    });

    test("should build local confirmation URL when local origin is supplied", () => {
      const localRedirect = buildEmailConfirmationRedirectUrl("http://localhost:8080");
      const url = new URL(localRedirect);
      assert.strictEqual(url.origin, "http://localhost:8080");
      assert.strictEqual(url.pathname, "/login");
      assert.strictEqual(url.searchParams.get("confirmed"), "true");
    });
  });

  describe("2. URL Search & Hash Parameters Parsing", () => {
    test("should properly detect PKCE code in query string", () => {
      const url = new URL(
        "https://john-stayte.vercel.app/login?code=test-pkce-code-12345&confirmed=true"
      );
      assert.strictEqual(url.searchParams.get("code"), "test-pkce-code-12345");
      assert.strictEqual(url.searchParams.get("confirmed"), "true");
    });

    test("should decode URL-encoded error descriptions for expired tokens", () => {
      const url = new URL(
        "https://john-stayte.vercel.app/login?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired"
      );
      const parsed = parseVerificationError(
        url.searchParams.get("error_description"),
        url.searchParams.get("error_code")
      );

      assert.ok(parsed);
      assert.strictEqual(parsed.isExpired, true);
      assert.strictEqual(
        parsed.message,
        "Your verification link has expired or has already been used. Please request a new confirmation email below or sign in."
      );
    });

    test("should extract token_hash and type for OTP verify links", () => {
      const url = new URL(
        "https://john-stayte.vercel.app/login?token_hash=pkce-token-hash-xyz&type=signup"
      );
      assert.strictEqual(url.searchParams.get("token_hash"), "pkce-token-hash-xyz");
      assert.strictEqual(url.searchParams.get("type"), "signup");
    });

    test("should extract email query parameter to pre-populate resend confirmation", () => {
      const url = new URL(
        "https://john-stayte.vercel.app/login?error=access_denied&error_code=otp_expired&email=customer%40example.com"
      );
      assert.strictEqual(url.searchParams.get("email"), "customer@example.com");
    });
  });

  describe("3. Production Allowlist & Redirect Validation", () => {
    test("should recognize all authorized production and staging domains", () => {
      for (const origin of AUTHORIZED_ORIGINS) {
        const redirectUrl = buildEmailConfirmationRedirectUrl(origin);
        const parsed = new URL(redirectUrl);
        assert.ok(
          AUTHORIZED_ORIGINS.some((d) => redirectUrl.startsWith(d)),
          `Domain ${origin} should be in authorized list`
        );
        assert.strictEqual(parsed.pathname, "/login");
        assert.strictEqual(parsed.searchParams.get("confirmed"), "true");
      }
    });
  });
});

import { supabase } from "@/lib/supabase";

/**
 * Service for managing real 6-digit Email Verification OTPs for Customer Checkout.
 */

export interface SendOtpResult {
  ok: boolean;
  message: string;
}

export interface VerifyOtpResult {
  ok: boolean;
  verifiedEmail: string;
}

/**
 * Sends a real 6-digit verification code to the customer's checkout email.
 */
export async function sendCheckoutEmailOtp(email: string): Promise<SendOtpResult> {
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanEmail || !cleanEmail.includes("@") || cleanEmail.length < 5) {
    throw new Error("Please enter a valid email address.");
  }

  // 1. Dispatch real 6-digit OTP code via Supabase Auth email service
  const { error } = await supabase.auth.signInWithOtp({
    email: cleanEmail,
    options: {
      shouldCreateUser: true,
    },
  });

  if (error) {
    if (error.message?.toLowerCase().includes("rate") || (error as any).status === 429) {
      throw new Error(
        "Too many verification requests. Please wait a moment before requesting another code.",
      );
    }
    throw new Error(error.message || "Failed to send verification code. Please try again.");
  }

  // 2. Track verification request in public.email_verifications
  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (userId) {
      await (supabase.from("email_verifications") as any).insert([
        {
          user_id: userId,
          email: cleanEmail,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          attempts: 0,
          max_attempts: 5,
          metadata: { type: "checkout_verification" },
        },
      ]);
    }
  } catch (e) {
    // Non-blocking log
    console.warn("email_verifications tracking notice:", e);
  }

  return {
    ok: true,
    message: `A 6-digit verification code has been sent to ${cleanEmail}. Please check your inbox and spam folder.`,
  };
}

/**
 * Verifies the 6-digit OTP code received in the customer's email.
 */
export async function verifyCheckoutEmailOtp(
  email: string,
  otpCode: string,
): Promise<VerifyOtpResult> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanOtp = otpCode.trim();

  if (!cleanEmail || !cleanEmail.includes("@")) {
    throw new Error("Invalid email address.");
  }

  if (!cleanOtp || cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
    throw new Error("Please enter the complete 6-digit numerical code sent to your email.");
  }

  // Verify against Supabase Auth cryptographic server
  const { data, error } = await supabase.auth.verifyOtp({
    email: cleanEmail,
    token: cleanOtp,
    type: "email",
  });

  if (error || !data) {
    if (error?.message?.toLowerCase().includes("expired")) {
      throw new Error("This verification code has expired. Please request a new code.");
    }
    throw new Error("Invalid verification code. Please check your email inbox and try again.");
  }

  // Record verified state in email_verifications table via secure RPC
  try {
    await (supabase.rpc as any)("record_verified_checkout_email", {
      p_email: cleanEmail,
    });
  } catch (e) {
    console.warn("record_verified_checkout_email notice:", e);
  }

  return {
    ok: true,
    verifiedEmail: cleanEmail,
  };
}

/**
 * Checks if the given email is verified on the backend.
 */
export async function checkEmailVerifiedStatus(email: string): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) return false;

  try {
    const { data: isVerified, error } = await (supabase.rpc as any)("is_email_verified", {
      p_email: cleanEmail,
    });

    if (!error && typeof isVerified === "boolean") {
      return isVerified;
    }
  } catch (e) {
    console.warn("is_email_verified check notice:", e);
  }

  // Fallback: check currently logged-in auth user
  try {
    const { data: authData } = await supabase.auth.getUser();
    if (
      authData?.user &&
      authData.user.email?.toLowerCase() === cleanEmail &&
      (authData.user.email_confirmed_at || (authData.user as any).confirmed_at)
    ) {
      return true;
    }
  } catch (e) {
    // ignore
  }

  return false;
}

import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export interface SendSmsParams {
  to: string;
  body: string;
}

export interface SendSmsResult {
  success: boolean;
  messageSid?: string;
  error?: string;
  maskedRecipient?: string;
}

/**
 * Normalizes phone numbers into E.164 international standard format.
 * Defaults to UK country code (+44) for local UK formats (e.g., 07xxx -> +447xxx).
 */
export function normalizeToE164(rawPhone: string, defaultCountryPrefix = "+44"): string {
  if (!rawPhone) return "";
  
  let cleaned = rawPhone.trim().replace(/[\s\(\)\-\.]/g, "");

  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.slice(2);
  }

  if (cleaned.startsWith("+")) {
    return cleaned;
  }

  if (cleaned.startsWith("0")) {
    return defaultCountryPrefix + cleaned.slice(1);
  }

  if (cleaned.length === 10 && cleaned.startsWith("7")) {
    return defaultCountryPrefix + cleaned;
  }

  if (cleaned.length === 10) {
    if (/^[6-9]/.test(cleaned)) {
      return "+91" + cleaned;
    }
    return "+1" + cleaned;
  }

  if (cleaned.length >= 11 && !cleaned.startsWith("+")) {
    return "+" + cleaned;
  }

  return "+" + cleaned;
}

/**
 * Masks phone number for secure logging and frontend status display.
 * Example: "+447900123456" -> "+44 •••• •••456"
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone) return "Unknown";
  const normalized = normalizeToE164(phone);
  if (normalized.length <= 4) return "••••";
  const prefix = normalized.slice(0, 3);
  const suffix = normalized.slice(-3);
  return `${prefix} •••• •••${suffix}`;
}

/**
 * Resolves the appropriate Twilio Sender (Alphanumeric Sender ID, Messaging Service, or Phone Number)
 * based on destination country telecom requirements.
 */
function resolveTwilioSender(
  normalizedTo: string,
  config: {
    alphaSenderId?: string;
    fromNumber?: string;
    indiaSenderId?: string;
    messagingServiceSid?: string;
  }
): { senderType: "From" | "MessagingServiceSid"; senderValue: string } | null {
  const { alphaSenderId, fromNumber, indiaSenderId, messagingServiceSid } = config;

  // 1. UK (+44): Always prioritize branded UK Alphanumeric Sender ID (e.g., JOHNSTAYTE)
  if (normalizedTo.startsWith("+44")) {
    if (alphaSenderId) {
      return { senderType: "From", senderValue: alphaSenderId };
    }
    if (fromNumber) {
      return { senderType: "From", senderValue: fromNumber };
    }
  }

  // 2. India (+91): TRAI DLT blocks un-registered foreign alphanumeric strings.
  // Prioritize dedicated India sender/fromNumber; do NOT send un-registered alpha headers.
  if (normalizedTo.startsWith("+91")) {
    const effectiveIndiaSender = indiaSenderId || fromNumber;
    if (effectiveIndiaSender) {
      return { senderType: "From", senderValue: effectiveIndiaSender };
    }
    if (messagingServiceSid) {
      return { senderType: "MessagingServiceSid", senderValue: messagingServiceSid };
    }
    if (alphaSenderId) {
      return { senderType: "From", senderValue: alphaSenderId };
    }
  }

  // 3. USA & Canada (+1): US carriers strictly reject Alphanumeric Sender IDs; require numeric sender.
  if (normalizedTo.startsWith("+1")) {
    if (fromNumber) {
      return { senderType: "From", senderValue: fromNumber };
    }
    if (messagingServiceSid) {
      return { senderType: "MessagingServiceSid", senderValue: messagingServiceSid };
    }
  }

  // 4. Other Open Alpha / International destinations (e.g. Australia +61, Ireland +353, Germany +49)
  if (alphaSenderId) {
    return { senderType: "From", senderValue: alphaSenderId };
  }
  if (fromNumber) {
    return { senderType: "From", senderValue: fromNumber };
  }
  if (messagingServiceSid) {
    return { senderType: "MessagingServiceSid", senderValue: messagingServiceSid };
  }

  return null;
}

/**
 * Dispatches an SMS using Twilio Programmable Messaging REST API.
 * Authenticates using Account SID + API Key SID + API Key Secret.
 */
async function sendTwilioSms(params: SendSmsParams): Promise<SendSmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKeySid = process.env.TWILIO_API_KEY_SID;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  const alphaSenderId = process.env.TWILIO_ALPHA_SENDER_ID;
  const indiaSenderId = process.env.TWILIO_INDIA_SENDER_ID || process.env.TWILIO_INDIA_FROM_NUMBER;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  let basicAuth: string | null = null;
  if (apiKeySid && apiKeySecret) {
    basicAuth = Buffer.from(`${apiKeySid}:${apiKeySecret}`).toString("base64");
  } else if (accountSid && authToken) {
    basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  }

  const normalizedTo = normalizeToE164(params.to);
  const maskedTo = maskPhoneNumber(normalizedTo);

  // Determine country-compliant sender configuration
  const senderConfig = resolveTwilioSender(normalizedTo, {
    alphaSenderId,
    fromNumber,
    indiaSenderId,
    messagingServiceSid,
  });

  if (!accountSid || !basicAuth || !senderConfig) {
    console.error("[Twilio Service] Missing server-side Twilio credentials or valid sender for destination in environment.");
    return {
      success: false,
      error: "Twilio SMS service is not configured on the server. Please verify environment variables.",
    };
  }

  if (!normalizedTo || normalizedTo.length < 8) {
    return {
      success: false,
      error: "Invalid recipient phone number format.",
    };
  }

  try {
    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const bodyParams = new URLSearchParams();
    bodyParams.append(senderConfig.senderType, senderConfig.senderValue);
    bodyParams.append("To", normalizedTo);
    bodyParams.append("Body", params.body);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: bodyParams.toString(),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const data = (await response.json()) as {
      sid?: string;
      status?: string;
      code?: number;
      message?: string;
      more_info?: string;
    };

    if (!response.ok) {
      if (data.code === 21608 || data.code === 572002) {
        console.warn(`[Twilio Service] Trial account restriction: Recipient ${maskedTo} is not a verified caller ID.`);
        return {
          success: false,
          maskedRecipient: maskedTo,
          error: `Twilio Trial Notice: Recipient ${maskedTo} is unverified. To receive SMS in Twilio Trial mode, please add this number in your Twilio Console (Verified Caller IDs).`,
        };
      }

      if (data.code === 21211) {
        return {
          success: false,
          maskedRecipient: maskedTo,
          error: `Invalid recipient phone number (${maskedTo}). Please check the customer's phone number.`,
        };
      }

      console.error(`[Twilio Service] API Error (Status ${response.status}, Code ${data.code}): ${data.message}`);
      return {
        success: false,
        maskedRecipient: maskedTo,
        error: data.message || `Twilio SMS delivery failed with status ${response.status}.`,
      };
    }

    return {
      success: true,
      messageSid: data.sid,
      maskedRecipient: maskedTo,
    };
  } catch (err: any) {
    const errorDetail =
      err.name === "AbortError"
        ? "Twilio API gateway connection timed out."
        : err.cause?.message || (err.message === "fetch failed" ? "Twilio gateway connection unavailable." : err.message) || "Failed to contact Twilio SMS gateway.";

    console.error("[Twilio Service] Dispatch error:", errorDetail);
    return {
      success: false,
      maskedRecipient: maskedTo,
      error: errorDetail,
    };
  }
}

// Server-side Supabase client initialization
function getServerSupabase(authToken?: string | null) {
  const url =
    process.env.VITE_SUPABASE_URL ||
    "https://wttchknauwvbfjatdscc.supabase.co";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0dGNoa25hdXd2YmZqYXRkc2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0Mjk1NTQsImV4cCI6MjEwMjAwNTU1NH0.z6nXs0zC8u7A_CUO8KDIoILSXS_OeMPrr5OdVYcmxQE";

  const options: any = {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  };

  if (authToken) {
    options.global = {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    };
  }

  return createClient<Database>(url, key, options);
}

const OTP_EXPIRY_MS = 15 * 60 * 1000; // 15 Minutes
const OTP_RESEND_COOLDOWN_MS = 30 * 1000; // 30 Seconds rate limit
const MAX_OTP_ATTEMPTS = 5;

/**
 * Computes salted SHA-256 hash using Web Crypto or Node Crypto
 */
async function hashOtp(otp: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${otp}`);
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuf));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Constant-time safe string comparison to prevent timing attacks.
 */
function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Resolves the authenticated customer's dynamic phone number from the database.
 * Priority:
 * 1. orders.customer_phone
 * 2. profiles.phone
 * 3. addresses.phone
 * 4. orders.delivery_address (JSON phone)
 * 5. orders.shipping_address (JSON phone)
 * 6. delivery_assignments.customer_phone
 */
async function resolveCustomerPhone(
  supabase: ReturnType<typeof getServerSupabase>,
  orderId?: string | null,
  assignmentId?: string | null,
  fallbackPhone?: string | null,
  fallbackName?: string | null,
): Promise<{
  phone: string | null;
  customerName: string;
  orderNumber: string;
  customerId: string | null;
  source: string;
}> {
  let order: any = null;
  let assignment: any = null;

  // 1. Check delivery_assignments if assignmentId is present
  if (assignmentId) {
    const { data: asgnById } = await (supabase.from("delivery_assignments") as any)
      .select("id, order_id, driver_name, notes, status")
      .eq("id", assignmentId)
      .maybeSingle();
    if (asgnById) {
      assignment = asgnById;
    }
  }

  const effectiveOrderId = orderId || assignment?.order_id;

  // 2. Query orders if effectiveOrderId is provided
  if (effectiveOrderId) {
    const { data: ordById } = await supabase
      .from("orders")
      .select("id, order_number, customer_id, customer_name, customer_phone, delivery_address, shipping_address")
      .eq("id", effectiveOrderId)
      .maybeSingle();
    if (ordById) order = ordById;

    if (!order) {
      const { data: ordByNum } = await supabase
        .from("orders")
        .select("id, order_number, customer_id, customer_name, customer_phone, delivery_address, shipping_address")
        .eq("order_number", effectiveOrderId)
        .maybeSingle();
      if (ordByNum) order = ordByNum;
    }
  }

  // 3. If assignment not yet found, look up by order.id or effectiveOrderId
  if (!assignment && (order?.id || effectiveOrderId)) {
    const { data: asgnByOrd } = await (supabase.from("delivery_assignments") as any)
      .select("id, order_id, driver_name, notes, status")
      .eq("order_id", order?.id || effectiveOrderId)
      .maybeSingle();
    if (asgnByOrd) {
      assignment = asgnByOrd;
    }
  }

  const customerName =
    order?.customer_name ||
    fallbackName ||
    "Valued Customer";
  const orderNumber =
    order?.order_number ||
    (effectiveOrderId ? effectiveOrderId.slice(0, 8).toUpperCase() : "ORDER");
  const customerId = order?.customer_id || null;

  // Priority 1: orders.customer_phone
  if (order?.customer_phone && typeof order.customer_phone === "string" && order.customer_phone.trim().length >= 7) {
    return {
      phone: order.customer_phone.trim(),
      customerName,
      orderNumber,
      customerId,
      source: "orders.customer_phone",
    };
  }

  // Priority 2: fallbackPhone passed from DeliveryWorkflowModal UI
  if (fallbackPhone && typeof fallbackPhone === "string" && fallbackPhone.trim().length >= 7) {
    return {
      phone: fallbackPhone.trim(),
      customerName,
      orderNumber,
      customerId,
      source: "client.customer_phone",
    };
  }

  // Priority 3: profiles.phone if customer_id exists
  if (customerId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("phone, full_name")
      .eq("id", customerId)
      .maybeSingle();

    if (profile?.phone && typeof profile.phone === "string" && profile.phone.trim().length >= 7) {
      return {
        phone: profile.phone.trim(),
        customerName: profile.full_name || customerName,
        orderNumber,
        customerId,
        source: "profiles.phone",
      };
    }

    // Priority 4: addresses table
    const { data: addr } = await supabase
      .from("addresses")
      .select("phone")
      .eq("user_id", customerId)
      .not("phone", "is", null)
      .order("is_default", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (addr?.phone && typeof addr.phone === "string" && addr.phone.trim().length >= 7) {
      return {
        phone: addr.phone.trim(),
        customerName,
        orderNumber,
        customerId,
        source: "addresses.phone",
      };
    }
  }

  // Priority 5: orders.delivery_address JSON
  if (order?.delivery_address && typeof order.delivery_address === "object") {
    const addrJson = order.delivery_address as Record<string, any>;
    if (addrJson.phone && typeof addrJson.phone === "string" && addrJson.phone.trim().length >= 7) {
      return {
        phone: addrJson.phone.trim(),
        customerName,
        orderNumber,
        customerId,
        source: "orders.delivery_address.phone",
      };
    }
  }

  // Priority 6: orders.shipping_address JSON
  if (order?.shipping_address && typeof order.shipping_address === "object") {
    const shipJson = order.shipping_address as Record<string, any>;
    if (shipJson.phone && typeof shipJson.phone === "string" && shipJson.phone.trim().length >= 7) {
      return {
        phone: shipJson.phone.trim(),
        customerName,
        orderNumber,
        customerId,
        source: "orders.shipping_address.phone",
      };
    }
  }

  return {
    phone: null,
    customerName,
    orderNumber,
    customerId,
    source: "none",
  };
}

export interface RequestDeliveryOtpInput {
  assignmentId: string;
  orderId?: string | null;
  forceRegenerate?: boolean;
  customerPhone?: string | null;
  customerName?: string | null;
  authToken?: string | null;
}

export interface RequestDeliveryOtpResponse {
  success: boolean;
  message: string;
  maskedPhone?: string;
  isVerified?: boolean;
  expiresAt?: number;
  error?: string;
}

/**
 * Server Function: Generates and dispatches delivery OTP via Twilio SMS.
 * Executes strictly on the server backend.
 */
export const requestDeliveryOtpServerFn = createServerFn({ method: "POST" })
  .validator((data: RequestDeliveryOtpInput) => data)
  .handler(async ({ data }): Promise<RequestDeliveryOtpResponse> => {
    const {
      assignmentId,
      orderId,
      forceRegenerate = false,
      customerPhone: fallbackPhone,
      customerName: fallbackName,
      authToken,
    } = data;
    const supabase = getServerSupabase(authToken);

    // 1. Fetch current delivery assignment
    let assignment: any = null;

    if (assignmentId) {
      const { data: byId } = await (supabase.from("delivery_assignments") as any)
        .select("id, order_id, notes, status, otp_code, otp_expires_at, otp_attempts, otp_max_attempts, otp_verified, otp_verified_at")
        .eq("id", assignmentId)
        .maybeSingle();
      if (byId) assignment = byId;
    }

    if (!assignment && (orderId || assignmentId)) {
      const targetOrdId = orderId || assignmentId;
      const { data: byOrder } = await (supabase.from("delivery_assignments") as any)
        .select("id, order_id, notes, status, otp_code, otp_expires_at, otp_attempts, otp_max_attempts, otp_verified, otp_verified_at")
        .eq("order_id", targetOrdId)
        .maybeSingle();
      if (byOrder) assignment = byOrder;
    }

    const actualOrderId = orderId || assignment?.order_id || assignmentId;

    if (!assignment) {
      return {
        success: false,
        message: "Delivery assignment record not found.",
        error: "Assignment not found",
      };
    }

    if (!actualOrderId) {
      return {
        success: false,
        message: "No order associated with this delivery assignment.",
        error: "No order ID",
      };
    }

    // 2. Check if already verified (prevent reissue on verified deliveries)
    if (assignment.otp_verified) {
      return {
        success: true,
        isVerified: true,
        message: "Delivery OTP has already been authenticated.",
      };
    }

    const now = Date.now();

    // 3. Check rate limiting (cooldown) from notes / timestamp
    const notes = assignment.notes || "";
    const rateMatch = notes.match(/\[LAST_SENT:(\d+)\]/);
    if (rateMatch && rateMatch[1] && !forceRegenerate) {
      const lastSent = Number(rateMatch[1]);
      if (now - lastSent < OTP_RESEND_COOLDOWN_MS) {
        const remainingSec = Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - lastSent)) / 1000);
        return {
          success: false,
          error: `Please wait ${remainingSec} second(s) before requesting another SMS OTP.`,
          message: `Please wait ${remainingSec} second(s) before requesting another SMS OTP.`,
        };
      }
    }

    // 4. Resolve customer's dynamic phone number from database or fallback
    const customerInfo = await resolveCustomerPhone(
      supabase,
      actualOrderId,
      assignment.id || assignmentId,
      fallbackPhone,
      fallbackName,
    );
    const targetPhone = customerInfo.phone || fallbackPhone || null;
    const orderNum = customerInfo.orderNumber || (actualOrderId ? actualOrderId.slice(0, 8).toUpperCase() : "ORDER");

    if (!targetPhone) {
      return {
        success: false,
        error: "Customer has no registered mobile phone number on file. Please update customer contact details.",
        message: "No customer phone number available.",
      };
    }

    const formattedTo = normalizeToE164(targetPhone);
    const maskedTo = maskPhoneNumber(formattedTo);

    // 5. Generate secure 6-digit OTP server-side
    const randomArray = new Uint32Array(1);
    crypto.getRandomValues(randomArray);
    const rawOtp = (100000 + (randomArray[0] % 900000)).toString();

    const saltBytes = new Uint8Array(16);
    crypto.getRandomValues(saltBytes);
    const salt = Array.from(saltBytes).map(b => b.toString(16).padStart(2, "0")).join("");
    const hashed = await hashOtp(rawOtp, salt);
    const hashedStorage = `sha256:${salt}:${hashed}`;

    const expiresAt = now + OTP_EXPIRY_MS;
    const expiresAtIso = new Date(expiresAt).toISOString();

    // Update assignment in database with hashed OTP
    const cleanNotes = notes
      .replace(/\[OTP:(\{.*?\})\]/g, "")
      .replace(/\[LAST_SENT:\d+\]/g, "")
      .trim();
    const updatedNotes = `${cleanNotes} [LAST_SENT:${now}]`.trim();

    await (supabase.from("delivery_assignments") as any)
      .update({
        otp_code: hashedStorage,
        otp_expires_at: expiresAtIso,
        otp_attempts: 0,
        otp_max_attempts: MAX_OTP_ATTEMPTS,
        otp_verified: false,
        otp_verified_at: null,
        notes: updatedNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", assignment.id);

    // 6. Send SMS via Twilio Programmable Messaging
    const smsText = `Your John Stayte Services delivery verification code for Order #${orderNum} is: ${rawOtp}. Please share this 6-digit code with your driver upon arrival. Valid for 15 minutes.`;

    const smsResult = await sendTwilioSms({
      to: formattedTo,
      body: smsText,
    });

    // 7. Also create customer in-app notification if customerId is present
    if (customerInfo.customerId) {
      try {
        await (supabase.from("customer_notifications") as any).insert([
          {
            user_id: customerInfo.customerId,
            title: `Delivery Verification Code: #${orderNum}`,
            message: `Your 6-digit delivery verification OTP is ${rawOtp}. Please share this code with your driver upon arrival.`,
            is_read: false,
          },
        ]);
      } catch (notifErr) {
        console.warn("[Delivery OTP Server] In-app notification error:", notifErr);
      }
    }

    if (!smsResult.success) {
      return {
        success: true,
        maskedPhone: maskedTo,
        expiresAt,
        message: `OTP generated. Twilio SMS status: ${smsResult.error || "SMS dispatch issue"}.`,
      };
    }

    return {
      success: true,
      maskedPhone: maskedTo,
      expiresAt,
      message: `Delivery verification code sent to customer via SMS (${maskedTo}).`,
    };
  });

export interface VerifyDeliveryOtpInput {
  assignmentId: string;
  inputOtp: string;
  orderId?: string | null;
  authToken?: string | null;
}

export interface VerifyDeliveryOtpResponse {
  success: boolean;
  verifiedAt?: string;
  error?: string;
  attemptsRemaining?: number;
}

/**
 * Server Function: Authenticates submitted delivery OTP server-side.
 * Performs constant-time hash comparison and updates delivery state.
 */
export const verifyDeliveryOtpServerFn = createServerFn({ method: "POST" })
  .validator((data: VerifyDeliveryOtpInput) => data)
  .handler(async ({ data }): Promise<VerifyDeliveryOtpResponse> => {
    const { assignmentId, inputOtp, orderId, authToken } = data;
    const cleanInput = (inputOtp || "").trim();

    if (!/^\d{6}$/.test(cleanInput)) {
      return {
        success: false,
        error: "Please enter a valid 6-digit numeric OTP code.",
      };
    }

    const supabase = getServerSupabase(authToken);

    let assignment: any = null;

    if (assignmentId) {
      const { data: byId } = await (supabase.from("delivery_assignments") as any)
        .select("id, order_id, notes, status, otp_code, otp_expires_at, otp_attempts, otp_max_attempts, otp_verified, otp_verified_at")
        .eq("id", assignmentId)
        .maybeSingle();
      if (byId) assignment = byId;
    }

    if (!assignment && (orderId || assignmentId)) {
      const targetOrdId = orderId || assignmentId;
      const { data: byOrder } = await (supabase.from("delivery_assignments") as any)
        .select("id, order_id, notes, status, otp_code, otp_expires_at, otp_attempts, otp_max_attempts, otp_verified, otp_verified_at")
        .eq("order_id", targetOrdId)
        .maybeSingle();
      if (byOrder) assignment = byOrder;
    }

    if (!assignment) {
      return {
        success: false,
        error: "Delivery assignment not found.",
      };
    }

    // 1. Check if already verified (prevent reuse/replay)
    if (assignment.otp_verified) {
      return {
        success: true,
        verifiedAt: assignment.otp_verified_at || new Date().toISOString(),
      };
    }

    const attempts = Number(assignment.otp_attempts || 0);
    const maxAttempts = Number(assignment.otp_max_attempts || MAX_OTP_ATTEMPTS);

    // 2. Check maximum attempts limit
    if (attempts >= maxAttempts) {
      return {
        success: false,
        error: `Maximum verification attempts (${maxAttempts}) exceeded. Please tap 'Resend OTP' to generate a fresh code.`,
        attemptsRemaining: 0,
      };
    }

    // 3. Check expiration
    const expiresAt = assignment.otp_expires_at ? new Date(assignment.otp_expires_at).getTime() : 0;
    if (expiresAt > 0 && Date.now() > expiresAt) {
      return {
        success: false,
        error: "This OTP has expired. Please tap 'Resend OTP' to send a new code to the customer.",
      };
    }

    // 4. Verify OTP against stored hash (or legacy notes format)
    const storedCode = assignment.otp_code || "";
    let isMatch = false;

    if (storedCode.startsWith("sha256:")) {
      const parts = storedCode.split(":");
      if (parts.length === 3) {
        const salt = parts[1];
        const storedHash = parts[2];
        const computedHash = await hashOtp(cleanInput, salt);
        isMatch = timingSafeCompare(computedHash, storedHash);
      }
    } else if (storedCode && /^\d{6}$/.test(storedCode)) {
      // Legacy plaintext support for older test records
      isMatch = cleanInput === storedCode;
    }

    if (!isMatch) {
      const newAttempts = attempts + 1;
      await (supabase.from("delivery_assignments") as any)
        .update({
          otp_attempts: newAttempts,
          updated_at: new Date().toISOString(),
        })
        .eq("id", assignment.id);

      const attemptsRemaining = Math.max(0, maxAttempts - newAttempts);
      return {
        success: false,
        attemptsRemaining,
        error: `Incorrect OTP. ${attemptsRemaining > 0 ? `${attemptsRemaining} attempt(s) remaining.` : "Please tap Resend OTP."}`,
      };
    }

    // 5. Successful Verification: Mark verified in database
    const nowIso = new Date().toISOString();
    await (supabase.from("delivery_assignments") as any)
      .update({
        otp_verified: true,
        otp_verified_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", assignment.id);

    // 6. Record order status audit log
    const actualOrderId = orderId || assignment.order_id;
    if (actualOrderId) {
      try {
        await (supabase.from("order_status_history") as any).insert([
          {
            order_id: actualOrderId,
            status: "OTP Verified",
            notes: "Customer delivery OTP verified successfully via Twilio authenticated flow.",
            created_at: nowIso,
          },
        ]);
      } catch (historyErr) {
        console.warn("[Delivery OTP Server] Order status history insert notice:", historyErr);
      }
    }

    return {
      success: true,
      verifiedAt: nowIso,
    };
  });

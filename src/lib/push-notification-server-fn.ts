import { createServerFn } from "@tanstack/react-start";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import type { Database } from "@/types/database.types";
import type {
  DispatchPushNotificationInput,
  PushDispatchEvent,
  PushDispatchResult,
  PushEventType,
  PushRole,
  RegisterDeviceTokenInput,
} from "./push-notifications-types";

// Cache for Google OAuth2 access token
let cachedOAuthToken: { token: string; expiresAt: number } | null = null;

interface FirebaseServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

/**
 * Safely parses Firebase service account credentials from environment variables.
 * Supports FIREBASE_SERVICE_ACCOUNT_KEY (JSON string or base64) or individual variables.
 */
export function getFirebaseServiceAccount(): FirebaseServiceAccount | null {
  const jsonRaw =
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (jsonRaw) {
    try {
      let rawString = jsonRaw.trim();
      if (rawString.startsWith("ey") || !rawString.startsWith("{")) {
        try {
          const decoded = Buffer.from(rawString, "base64").toString("utf-8");
          if (decoded.startsWith("{")) {
            rawString = decoded;
          }
        } catch {
          // not base64, proceed
        }
      }

      const parsed = JSON.parse(rawString);
      if (parsed.project_id && parsed.client_email && parsed.private_key) {
        return {
          project_id: parsed.project_id,
          client_email: parsed.client_email,
          private_key: parsed.private_key.replace(/\\n/g, "\n"),
        };
      }
    } catch (err) {
      console.error("[Push Service] Error parsing FIREBASE_SERVICE_ACCOUNT_KEY JSON:", err);
    }
  }

  // Fallback to discrete environment variables
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    return {
      project_id: projectId,
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n"),
    };
  }

  return null;
}

/**
 * Creates a server-side Supabase client.
 * Uses SUPABASE_SERVICE_ROLE_KEY if available for privileged backend queries.
 */
function getSupabaseServerClient(userToken?: string | null): SupabaseClient<Database> {
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "https://wttchknauwvbfjatdscc.supabase.co";

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0dGNoa25hdXd2YmZqYXRkc2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwMTA0MDIsImV4cCI6MjA2MTU4NjQwMn0.O-f8p0u2v_5Hj6xL60Dk1wD-u3Tj9iWp0x8Y5x8X0wA";

  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: userToken
      ? {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        }
      : undefined,
  });
}

function base64UrlEncode(str: string | Buffer): string {
  const base64 = typeof str === "string" ? Buffer.from(str).toString("base64") : str.toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Exchanges Google Service Account credentials for an OAuth2 access token
 * with the 'https://www.googleapis.com/auth/firebase.messaging' scope.
 */
async function getGoogleOAuth2Token(serviceAccount: FirebaseServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  if (cachedOAuthToken && cachedOAuthToken.expiresAt > now + 300) {
    return cachedOAuthToken.token;
  }

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const claimSet = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaimSet = base64UrlEncode(JSON.stringify(claimSet));
  const signInput = `${encodedHeader}.${encodedClaimSet}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signInput);
  signer.end();
  const signature = signer.sign(serviceAccount.private_key);
  const encodedSignature = base64UrlEncode(signature);

  const jwt = `${signInput}.${encodedSignature}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    const errorBody = await tokenResponse.text();
    throw new Error(`Google OAuth2 token exchange failed (${tokenResponse.status}): ${errorBody}`);
  }

  const tokenData = (await tokenResponse.json()) as { access_token: string; expires_in: number };
  cachedOAuthToken = {
    token: tokenData.access_token,
    expiresAt: now + (tokenData.expires_in || 3600),
  };

  return cachedOAuthToken.token;
}

/**
 * Dispatches a single message via Google FCM HTTP v1 API.
 */
async function sendFcmMessage(
  serviceAccount: FirebaseServiceAccount,
  accessToken: string,
  deviceToken: string,
  payload: {
    title: string;
    body: string;
    data?: Record<string, string>;
    category?: string;
    badge?: number;
  }
): Promise<{ success: boolean; isInvalidToken: boolean; error?: string }> {
  const fcmUrl = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;

  const stringData: Record<string, string> = {};
  if (payload.data) {
    for (const [key, val] of Object.entries(payload.data)) {
      stringData[key] = String(val ?? "");
    }
  }

  const messageBody = {
    message: {
      token: deviceToken,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: stringData,
      android: {
        priority: "high",
        notification: {
          channel_id: payload.category || "orders",
          sound: "default",
          default_sound: true,
          default_vibrate_timings: true,
        },
      },
      apns: {
        headers: {
          "apns-priority": "10",
        },
        payload: {
          aps: {
            alert: {
              title: payload.title,
              body: payload.body,
            },
            sound: "default",
            badge: payload.badge || 1,
            category: (payload.category || "orders").toUpperCase(),
          },
        },
      },
    },
  };

  const response = await fetch(fcmUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messageBody),
  });

  if (response.ok) {
    return { success: true, isInvalidToken: false };
  }

  const errorText = await response.text();
  let isInvalidToken = false;
  try {
    const errorJson = JSON.parse(errorText);
    const errorCode = errorJson?.error?.details?.[0]?.errorCode || errorJson?.error?.status;
    if (
      errorCode === "UNREGISTERED" ||
      errorCode === "INVALID_ARGUMENT" ||
      errorCode === "NOT_FOUND" ||
      errorText.includes("UNREGISTERED")
    ) {
      isInvalidToken = true;
    }
  } catch {
    if (errorText.includes("UNREGISTERED") || errorText.includes("registration token")) {
      isInvalidToken = true;
    }
  }

  return { success: false, isInvalidToken, error: errorText };
}

export interface AuthoritativePaymentState {
  isConfirmedPaid: boolean;
  hasFailedAttempt: boolean;
  order?: {
    id: string;
    order_number?: string;
    customer_id?: string;
    total?: number;
    status?: string;
    payment_status?: string;
  };
  recentPayments?: Array<{
    id: string;
    payment_status: string;
    amount?: number;
    created_at?: string;
  }>;
  error?: string;
}

/**
 * Centralized, authoritative server-only payment state verification.
 * 
 * Rules:
 * 1. Never treats `orders.status` (lifecycle state) as sufficient proof of successful payment.
 * 2. Checks `orders.payment_status` and `payments.payment_status`.
 * 3. Handles multiple payment attempts safely without unrestricted `.maybeSingle()` on `payments`.
 * 4. Explicitly handles database query errors without converting them to false confirmations.
 */
export async function verifyAuthoritativePaymentState(
  supabase: SupabaseClient<Database>,
  orderId: string
): Promise<AuthoritativePaymentState> {
  if (!orderId || typeof orderId !== "string" || orderId.trim() === "") {
    return {
      isConfirmedPaid: false,
      hasFailedAttempt: false,
      error: "Order ID missing or invalid for authoritative payment verification",
    };
  }

  // 1. Authoritative order lookup
  const { data: order, error: orderError } = await (supabase.from("orders") as any)
    .select("id, order_number, customer_id, total, status, payment_status")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    return {
      isConfirmedPaid: false,
      hasFailedAttempt: false,
      error: `Database error querying order ${orderId}: ${orderError.message}`,
    };
  }

  if (!order) {
    return {
      isConfirmedPaid: false,
      hasFailedAttempt: false,
      error: `Order ${orderId} not found in authoritative records`,
    };
  }

  // 2. Safe payments lookup handling multiple payment attempts per order
  // Do NOT use unrestricted .maybeSingle() which fails with PGRST116 when multiple attempts exist
  const { data: payments, error: paymentsError } = await (supabase.from("payments") as any)
    .select("id, payment_status, amount, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  if (paymentsError) {
    return {
      isConfirmedPaid: false,
      hasFailedAttempt: false,
      order,
      error: `Database error querying payments for order ${orderId}: ${paymentsError.message}`,
    };
  }

  const paymentList: Array<{ id: string; payment_status: string; amount?: number; created_at?: string }> =
    Array.isArray(payments) ? payments : [];

  // 3. Verification evaluation:
  // orders.status represents fulfillment lifecycle ("Approved", "Packed", etc.) and must NOT be used alone as proof of payment.
  // Proof of payment requires orders.payment_status === 'Paid' OR at least one payments record with payment_status === 'paid'.
  const ordPaymentStatus = String(order.payment_status || "").trim().toLowerCase();
  const orderRecordPaid = ordPaymentStatus === "paid";
  const paymentsRecordPaid = paymentList.some(
    (p) => String(p.payment_status || "").trim().toLowerCase() === "paid"
  );

  const isConfirmedPaid = orderRecordPaid || paymentsRecordPaid;
  const hasFailedAttempt = paymentList.some(
    (p) => String(p.payment_status || "").trim().toLowerCase() === "failed"
  );

  return {
    isConfirmedPaid,
    hasFailedAttempt,
    order,
    recentPayments: paymentList,
  };
}

/**
 * Validates role-based recipient isolation and security ownership.
 */
export async function validateTargetAuthorization(
  supabase: SupabaseClient<Database>,
  target: PushDispatchEvent["target"],
  eventType: PushEventType
): Promise<{ authorized: boolean; reason?: string }> {
  // 1. Customer order ownership validation
  if (target.requireOrderOwnership) {
    const { orderId, customerId } = target.requireOrderOwnership;
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, customer_id")
      .eq("id", orderId)
      .maybeSingle();

    if (error) {
      return { authorized: false, reason: `Database error querying order ${orderId}: ${error.message}` };
    }

    if (!order) {
      return { authorized: false, reason: `Order ${orderId} not found` };
    }

    if (order.customer_id !== customerId) {
      return {
        authorized: false,
        reason: `Customer ownership violation: customer ${customerId} does not own order ${orderId}`,
      };
    }
  }

  // 2. Driver assignment validation
  if (target.requireDriverAssignment) {
    const { orderId, driverId } = target.requireDriverAssignment;
    const { data: assignment, error } = await (supabase.from("delivery_assignments") as any)
      .select("id, driver_id, agent_id")
      .eq("order_id", orderId)
      .maybeSingle();

    if (error) {
      return { authorized: false, reason: `Database error querying delivery assignment for order ${orderId}: ${error.message}` };
    }

    if (!assignment) {
      return { authorized: false, reason: `No delivery assignment found for order ${orderId}` };
    }

    const matchesDriver = assignment.driver_id === driverId || assignment.agent_id === driverId;
    if (!matchesDriver) {
      return {
        authorized: false,
        reason: `Driver assignment violation: driver ${driverId} is not assigned to order ${orderId}`,
      };
    }
  }

  // 3. Prevent customer from receiving internal-only events
  const internalOnlyEvents: PushEventType[] = [
    "LOW_STOCK_ALERT",
    "ADMIN_ALERT",
    "DRIVER_OPERATIONAL_UPDATE",
  ];
  if (internalOnlyEvents.includes(eventType) && target.roles?.includes("customer")) {
    return {
      authorized: false,
      reason: `Role isolation violation: customer role cannot be targeted for internal event ${eventType}`,
    };
  }

  // 4. Strict authoritative payment state verification for PAYMENT_SUCCEEDED
  if (eventType === "PAYMENT_SUCCEEDED") {
    const orderId = target.requireOrderOwnership?.orderId;
    if (!orderId) {
      return { authorized: false, reason: "Order ID missing for payment verification" };
    }

    const verification = await verifyAuthoritativePaymentState(supabase, orderId);
    if (verification.error) {
      return { authorized: false, reason: verification.error };
    }

    if (!verification.isConfirmedPaid) {
      return {
        authorized: false,
        reason: `Payment verification failed: order ${orderId} is not confirmed paid in database`,
      };
    }
  }

  // 5. Strict authoritative check for PAYMENT_FAILED:
  // Cannot dispatch PAYMENT_FAILED for an already-paid order or after a confirmed successful payment
  if (eventType === "PAYMENT_FAILED") {
    const orderId = target.requireOrderOwnership?.orderId;
    if (orderId) {
      const verification = await verifyAuthoritativePaymentState(supabase, orderId);
      if (verification.error) {
        return { authorized: false, reason: verification.error };
      }

      if (verification.isConfirmedPaid) {
        return {
          authorized: false,
          reason: `Payment failure event rejected: order ${orderId} is already confirmed paid in database`,
        };
      }
    }
  }

  return { authorized: true };
}

/**
 * Core dispatch function with atomic reservation concurrency protection.
 */
export async function executePushDispatch(
  event: PushDispatchEvent,
  supabaseClient?: SupabaseClient<Database>
): Promise<PushDispatchResult> {
  const supabase = supabaseClient || getSupabaseServerClient();
  const { eventType, idempotencyKey, target, payload } = event;

  // 1. Fast Idempotency Pre-Check
  const { data: existingLog } = await supabase
    .from("notification_dispatch_logs")
    .select("id, status")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (
    existingLog &&
    (existingLog.status === "sent" ||
      existingLog.status === "skipped" ||
      existingLog.status === "no_tokens" ||
      existingLog.status === "pending")
  ) {
    return {
      success: true,
      idempotencyKey,
      eventType,
      recipientCount: 0,
      tokensAttempted: 0,
      tokensSucceeded: 0,
      tokensFailed: 0,
      status: "skipped",
      message: "Idempotency key already processed or in progress",
    };
  }

  // 2. Validate Target Authorization & Role Isolation BEFORE reservation
  const authValidation = await validateTargetAuthorization(supabase, target, eventType);
  if (!authValidation.authorized) {
    console.error(`[Push Service] Security isolation blocked event ${eventType}: ${authValidation.reason}`);
    return {
      success: false,
      idempotencyKey,
      eventType,
      recipientCount: 0,
      tokensAttempted: 0,
      tokensSucceeded: 0,
      tokensFailed: 0,
      status: "failed",
      message: authValidation.reason,
    };
  }

  // 3. Atomic Reservation via PostgreSQL UNIQUE constraint on idempotency_key
  if (existingLog && existingLog.status === "failed") {
    // Retry flow: atomically transition existing failed log to 'pending'
    const { data: updatedRows, error: retryErr } = await supabase
      .from("notification_dispatch_logs")
      .update({
        status: "pending",
        error_message: null,
        created_at: new Date().toISOString(),
      })
      .eq("idempotency_key", idempotencyKey)
      .eq("status", "failed")
      .select("id");

    if (retryErr || !updatedRows || updatedRows.length === 0) {
      return {
        success: true,
        idempotencyKey,
        eventType,
        recipientCount: 0,
        tokensAttempted: 0,
        tokensSucceeded: 0,
        tokensFailed: 0,
        status: "skipped",
        message: "Concurrent retry attempt suppressed",
      };
    }
  } else {
    const { error: reserveErr } = await supabase
      .from("notification_dispatch_logs")
      .insert({
        idempotency_key: idempotencyKey,
        event_type: eventType,
        recipient_user_id: target.userId || null,
        recipient_role: target.roles?.join(",") || (target.userId ? "targeted_user" : "unknown"),
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
        status: "pending",
        created_at: new Date().toISOString(),
      });

    if (reserveErr) {
      // Unique violation (PostgreSQL 23505) indicates a concurrent worker won the race
      if (
        reserveErr.code === "23505" ||
        reserveErr.message?.includes("unique") ||
        reserveErr.message?.includes("duplicate")
      ) {
        return {
          success: true,
          idempotencyKey,
          eventType,
          recipientCount: 0,
          tokensAttempted: 0,
          tokensSucceeded: 0,
          tokensFailed: 0,
          status: "skipped",
          message: "Concurrent dispatch attempt suppressed by atomic reservation lock",
        };
      }
      return {
        success: false,
        idempotencyKey,
        eventType,
        recipientCount: 0,
        tokensAttempted: 0,
        tokensSucceeded: 0,
        tokensFailed: 0,
        status: "failed",
        message: `Database reservation error: ${reserveErr.message}`,
      };
    }
  }

  try {
    // 4. Resolve Recipient Tokens
    let tokenQuery = supabase
      .from("user_device_tokens")
      .select("id, user_id, token, platform, role")
      .eq("is_active", true);

    if (target.userId) {
      tokenQuery = tokenQuery.eq("user_id", target.userId);
    } else if (target.roles && target.roles.length > 0) {
      tokenQuery = tokenQuery.in("role", target.roles);
    }

    const { data: deviceTokens, error: tokenErr } = await tokenQuery;

    if (tokenErr) {
      console.error("[Push Service] Error querying device tokens:", tokenErr);
      await supabase
        .from("notification_dispatch_logs")
        .update({
          status: "failed",
          error_message: `Failed to query device tokens: ${tokenErr.message}`,
        })
        .eq("idempotency_key", idempotencyKey);

      return {
        success: false,
        idempotencyKey,
        eventType,
        recipientCount: 0,
        tokensAttempted: 0,
        tokensSucceeded: 0,
        tokensFailed: 0,
        status: "failed",
        message: `Failed to query device tokens: ${tokenErr.message}`,
      };
    }

    if (!deviceTokens || deviceTokens.length === 0) {
      await supabase
        .from("notification_dispatch_logs")
        .update({
          status: "no_tokens",
          tokens_attempted: 0,
          tokens_succeeded: 0,
          tokens_failed: 0,
          error_message: "No active device tokens found for recipient",
          sent_at: new Date().toISOString(),
        })
        .eq("idempotency_key", idempotencyKey);

      return {
        success: true,
        idempotencyKey,
        eventType,
        recipientCount: 0,
        tokensAttempted: 0,
        tokensSucceeded: 0,
        tokensFailed: 0,
        status: "no_tokens",
        message: "No active device tokens found for recipient",
      };
    }

    // 5. Verify Firebase Credentials
    const serviceAccount = getFirebaseServiceAccount();
    if (!serviceAccount) {
      console.warn(
        `[Push Service] Firebase credentials not configured. Skipping remote push for event ${eventType}. ` +
        `Configure FIREBASE_SERVICE_ACCOUNT_KEY in environment/secrets to enable remote delivery.`
      );

      await supabase
        .from("notification_dispatch_logs")
        .update({
          status: "skipped",
          tokens_attempted: 0,
          tokens_succeeded: 0,
          tokens_failed: 0,
          error_message: "Firebase service account credentials not configured in environment",
        })
        .eq("idempotency_key", idempotencyKey);

      return {
        success: false,
        idempotencyKey,
        eventType,
        recipientCount: new Set(deviceTokens.map((d) => d.user_id)).size,
        tokensAttempted: 0,
        tokensSucceeded: 0,
        tokensFailed: 0,
        status: "skipped",
        message: "Firebase credentials not configured. Native push dispatch skipped.",
      };
    }

    // 6. Get Google OAuth2 Token & Send Messages
    let accessToken: string;
    try {
      accessToken = await getGoogleOAuth2Token(serviceAccount);
    } catch (authErr: any) {
      console.error("[Push Service] Google OAuth2 authentication error:", authErr);
      await supabase
        .from("notification_dispatch_logs")
        .update({
          status: "failed",
          tokens_attempted: deviceTokens.length,
          tokens_succeeded: 0,
          tokens_failed: deviceTokens.length,
          error_message: `Google OAuth2 authentication failed: ${authErr.message}`,
        })
        .eq("idempotency_key", idempotencyKey);

      return {
        success: false,
        idempotencyKey,
        eventType,
        recipientCount: new Set(deviceTokens.map((d) => d.user_id)).size,
        tokensAttempted: deviceTokens.length,
        tokensSucceeded: 0,
        tokensFailed: deviceTokens.length,
        status: "failed",
        message: authErr.message,
      };
    }

    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];
    const invalidTokenIds: string[] = [];

    for (const tokenRecord of deviceTokens) {
      try {
        const res = await sendFcmMessage(serviceAccount, accessToken, tokenRecord.token, payload);
        if (res.success) {
          succeeded++;
        } else {
          failed++;
          if (res.error) errors.push(res.error);
          if (res.isInvalidToken) {
            invalidTokenIds.push(tokenRecord.id);
          }
        }
      } catch (sendErr: any) {
        failed++;
        errors.push(sendErr.message || String(sendErr));
      }
    }

    // 7. Cleanup Stale/Invalid Tokens
    if (invalidTokenIds.length > 0) {
      try {
        await supabase
          .from("user_device_tokens")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .in("id", invalidTokenIds);
        console.log(`[Push Service] Deactivated ${invalidTokenIds.length} invalid/unregistered device tokens.`);
      } catch (cleanupErr) {
        console.error("[Push Service] Failed to deactivate invalid tokens:", cleanupErr);
      }
    }

    const finalStatus = succeeded > 0 ? "sent" : "failed";

    // 8. Record Final Dispatch Status on Reserved Row
    await supabase
      .from("notification_dispatch_logs")
      .update({
        status: finalStatus,
        tokens_attempted: deviceTokens.length,
        tokens_succeeded: succeeded,
        tokens_failed: failed,
        error_message: errors.length > 0 ? errors.slice(0, 3).join("; ") : null,
        sent_at: succeeded > 0 ? new Date().toISOString() : null,
      })
      .eq("idempotency_key", idempotencyKey);

    return {
      success: succeeded > 0,
      idempotencyKey,
      eventType,
      recipientCount: new Set(deviceTokens.map((d) => d.user_id)).size,
      tokensAttempted: deviceTokens.length,
      tokensSucceeded: succeeded,
      tokensFailed: failed,
      status: finalStatus,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (err: any) {
    console.error(`[Push Service] Unexpected dispatch error for ${idempotencyKey}:`, err);
    await supabase
      .from("notification_dispatch_logs")
      .update({
        status: "failed",
        error_message: `Unexpected dispatch failure: ${err.message || String(err)}`,
      })
      .eq("idempotency_key", idempotencyKey);

    return {
      success: false,
      idempotencyKey,
      eventType,
      recipientCount: 0,
      tokensAttempted: 0,
      tokensSucceeded: 0,
      tokensFailed: 0,
      status: "failed",
      message: err.message || String(err),
    };
  }
}

/**
 * Authoritative handler to register a device token in Supabase.
 * Validates inputs, authenticates caller via authToken, and calls hardened RPC.
 */
export async function handleRegisterDeviceToken(
  data: RegisterDeviceTokenInput,
  supabaseClient?: SupabaseClient<Database>
): Promise<{ success: boolean; result?: any; error?: string }> {
  if (!data.token || typeof data.token !== "string" || !data.token.trim()) {
    return { success: false, error: "Token is required" };
  }
  if (!data.platform || !["android", "ios", "web"].includes(data.platform)) {
    return { success: false, error: "Valid platform is required (android, ios, web)" };
  }

  const supabase = supabaseClient || getSupabaseServerClient(data.authToken);
  let callerUserId: string | null = null;

  if (data.authToken) {
    try {
      const { data: authData } = await supabase.auth.getUser(data.authToken);
      callerUserId = authData?.user?.id || null;
    } catch (authErr) {
      console.warn("[Push Service] Token registration auth check notice:", authErr);
    }
  }

  console.log(`[Push Service] handleRegisterDeviceToken: platform=${data.platform}, hasAuthToken=${Boolean(data.authToken)}, authenticated=${Boolean(callerUserId)}`);

  if (!callerUserId) {
    console.warn("[Push Service] Token registration rejected: Not authenticated");
    return { success: false, error: "Not authenticated" };
  }

  const { data: result, error } = await supabase.rpc("register_device_token" as any, {
    p_token: data.token.trim(),
    p_platform: data.platform,
    p_installation_id: data.installationId ? String(data.installationId).trim() : null,
    p_device_info: data.deviceInfo || {},
    p_caller_user_id: callerUserId,
  });

  if (error) {
    console.error("[Push Service] Token registration RPC error:", error);
    return { success: false, error: error.message };
  }

  console.log("[Push Service] Token registration RPC succeeded");
  return { success: true, result };
}

/**
 * Authoritative handler to deactivate a device token on logout or account switch.
 */
export async function handleDeactivateDeviceToken(
  data: { token: string; authToken?: string | null },
  supabaseClient?: SupabaseClient<Database>
): Promise<{ success: boolean; deactivated?: boolean; error?: string }> {
  if (!data.token || typeof data.token !== "string" || !data.token.trim()) {
    return { success: false, error: "Token is required" };
  }

  const supabase = supabaseClient || getSupabaseServerClient(data.authToken);
  let callerUserId: string | null = null;

  if (data.authToken) {
    try {
      const { data: authData } = await supabase.auth.getUser(data.authToken);
      callerUserId = authData?.user?.id || null;
    } catch (authErr) {
      console.warn("[Push Service] Token deactivation auth check notice:", authErr);
    }
  }

  const { data: result, error } = await supabase.rpc("deactivate_device_token" as any, {
    p_token: data.token.trim(),
    p_caller_user_id: callerUserId,
  });

  if (error) {
    console.error("[Push Service] Token deactivation RPC error:", error);
    return { success: false, error: error.message };
  }

  return { success: true, deactivated: Boolean(result) };
}

/**
 * Authenticated Server Function to register a device token.
 */
export const registerDeviceTokenServerFn = createServerFn({ method: "POST" })
  .validator((d: unknown): RegisterDeviceTokenInput => {
    if (!d || typeof d !== "object") throw new Error("Invalid request payload");
    const input = d as Record<string, any>;
    if (!input.token || typeof input.token !== "string") throw new Error("Token is required");
    if (!input.platform || !["android", "ios", "web"].includes(input.platform)) {
      throw new Error("Valid platform is required (android, ios, web)");
    }
    return {
      token: input.token.trim(),
      platform: input.platform as any,
      installationId: input.installationId ? String(input.installationId) : undefined,
      deviceInfo: input.deviceInfo || {},
      authToken: input.authToken ? String(input.authToken) : null,
    };
  })
  .handler(async ({ data }) => {
    return handleRegisterDeviceToken(data);
  });

/**
 * Authenticated Server Function to deactivate a device token on logout or account switch.
 */
export const deactivateDeviceTokenServerFn = createServerFn({ method: "POST" })
  .validator((d: unknown): { token: string; authToken?: string | null } => {
    if (!d || typeof d !== "object") throw new Error("Invalid request payload");
    const input = d as Record<string, any>;
    if (!input.token || typeof input.token !== "string") throw new Error("Token is required");
    return {
      token: input.token.trim(),
      authToken: input.authToken ? String(input.authToken) : null,
    };
  })
  .handler(async ({ data }) => {
    return handleDeactivateDeviceToken(data);
  });

// ============================================================================
// INTERNAL EVENT HANDLERS (RUN ON SERVER ONLY)
// ============================================================================

export async function triggerOrderPlacedPushInternal(params: {
  orderId: string;
  orderNumber: string;
  customerId: string;
  itemCount: number;
  totalFormatted: string;
  customerName?: string;
}): Promise<void> {
  const { orderId, orderNumber, customerId, itemCount, totalFormatted, customerName } = params;

  executePushDispatch({
    eventType: "ORDER_PLACED",
    idempotencyKey: `order_placed_cust_${orderId}`,
    target: {
      userId: customerId,
      requireOrderOwnership: { orderId, customerId },
    },
    payload: {
      title: `Order #${orderNumber} Confirmed`,
      body: `Your order for ${itemCount} item(s) totalling ${totalFormatted} has been received.`,
      category: "orders",
      data: {
        url: `/orders?orderId=${orderId}`,
        orderId,
        type: "ORDER_PLACED",
      },
    },
  }).catch((err) => console.error("[Push Service] Order placed customer push notice:", err));

  executePushDispatch({
    eventType: "ORDER_PLACED",
    idempotencyKey: `order_placed_staff_${orderId}`,
    target: {
      roles: ["admin", "manager"],
    },
    payload: {
      title: `New Order #${orderNumber}`,
      body: `${customerName || "Customer"} placed order #${orderNumber} (${itemCount} items, ${totalFormatted}).`,
      category: "orders",
      data: {
        url: `/manager/orders?orderId=${orderId}`,
        orderId,
        type: "ORDER_PLACED",
      },
    },
  }).catch((err) => console.error("[Push Service] Order placed staff push notice:", err));
}

export async function triggerPaymentStatusPushInternal(params: {
  orderId: string;
  orderNumber: string;
  customerId: string;
  status: "succeeded" | "failed";
  amountFormatted: string;
  failureReason?: string;
  paymentAttemptId?: string;
  supabaseClient?: SupabaseClient<Database>;
}): Promise<{ customerResult?: PushDispatchResult; staffResult?: PushDispatchResult; skippedReason?: string }> {
  const {
    orderId,
    orderNumber,
    customerId,
    status,
    amountFormatted,
    failureReason,
    paymentAttemptId,
    supabaseClient,
  } = params;
  const supabase = supabaseClient || getSupabaseServerClient();

  // Centralized Authoritative Database Payment Verification
  const verification = await verifyAuthoritativePaymentState(supabase, orderId);

  if (verification.error) {
    console.error(
      `[Push Service] Authoritative payment verification failed for order ${orderId}: ${verification.error}`
    );
    return { skippedReason: verification.error };
  }

  if (status === "succeeded") {
    if (!verification.isConfirmedPaid) {
      const reason = `Payment verification failed: order ${orderId} is not confirmed paid in database`;
      console.warn(`[Push Service] Suppressed PAYMENT_SUCCEEDED dispatch: ${reason}`);
      return { skippedReason: reason };
    }

    const custResult = await executePushDispatch(
      {
        eventType: "PAYMENT_SUCCEEDED",
        idempotencyKey: `payment_succeeded_cust_${orderId}`,
        target: {
          userId: customerId,
          requireOrderOwnership: { orderId, customerId },
        },
        payload: {
          title: `Payment Confirmed - #${orderNumber}`,
          body: `Payment of ${amountFormatted} was successfully confirmed for your order.`,
          category: "orders",
          data: {
            url: `/orders?orderId=${orderId}`,
            orderId,
            type: "PAYMENT_SUCCEEDED",
          },
        },
      },
      supabase
    );

    const staffResult = await executePushDispatch(
      {
        eventType: "PAYMENT_SUCCEEDED",
        idempotencyKey: `payment_succeeded_staff_${orderId}`,
        target: {
          roles: ["admin", "manager"],
        },
        payload: {
          title: `Payment Succeeded - #${orderNumber}`,
          body: `${amountFormatted} received for order #${orderNumber}.`,
          category: "orders",
          data: {
            url: `/manager/orders?orderId=${orderId}`,
            orderId,
            type: "PAYMENT_SUCCEEDED",
          },
        },
      },
      supabase
    );

    return { customerResult: custResult, staffResult: staffResult };
  } else {
    // status === "failed"
    // Task 3: PAYMENT_FAILED must never be dispatched:
    // - For an already-paid order
    // - After a confirmed successful payment
    // - From an outdated payment attempt after a later successful retry
    if (verification.isConfirmedPaid) {
      const reason = `Suppressed PAYMENT_FAILED notification: order ${orderId} is already confirmed paid in database`;
      console.warn(`[Push Service] ${reason}`);
      return { skippedReason: reason };
    }

    // Associate failure notification with specific payment attempt when provided
    const failIdempotencyKey = paymentAttemptId
      ? `payment_failed_cust_${orderId}_${paymentAttemptId}`
      : `payment_failed_cust_${orderId}`;

    const custResult = await executePushDispatch(
      {
        eventType: "PAYMENT_FAILED",
        idempotencyKey: failIdempotencyKey,
        target: {
          userId: customerId,
          requireOrderOwnership: { orderId, customerId },
        },
        payload: {
          title: `Payment Incomplete - #${orderNumber}`,
          body: `Payment could not be completed for Order #${orderNumber}. ${failureReason || "Please retry or update your payment details."}`,
          category: "orders",
          data: {
            url: `/orders?orderId=${orderId}`,
            orderId,
            type: "PAYMENT_FAILED",
            attemptId: paymentAttemptId || "",
          },
        },
      },
      supabase
    );

    return { customerResult: custResult };
  }
}

export async function triggerOrderStatusPushInternal(params: {
  orderId: string;
  orderNumber: string;
  customerId: string;
  newStatus: "Approved" | "Packed" | "Cancelled";
  reason?: string;
}): Promise<void> {
  const { orderId, orderNumber, customerId, newStatus, reason } = params;

  let eventType: PushEventType;
  let title = `Order #${orderNumber} ${newStatus}`;
  let body = `Your order status has been updated to ${newStatus}.`;

  if (newStatus === "Approved") {
    eventType = "ORDER_APPROVED";
    title = `Order #${orderNumber} Approved`;
    body = `Your order has been approved and is being prepared for fulfillment.`;
  } else if (newStatus === "Packed") {
    eventType = "ORDER_PACKED";
    title = `Order #${orderNumber} Packed`;
    body = `Your order is packed and awaiting courier collection.`;
  } else {
    eventType = "ORDER_CANCELLED";
    title = `Order #${orderNumber} Cancelled`;
    body = reason ? `Your order was cancelled: ${reason}` : `Your order #${orderNumber} has been cancelled.`;
  }

  executePushDispatch({
    eventType,
    idempotencyKey: `order_status_${newStatus.toLowerCase()}_${orderId}`,
    target: {
      userId: customerId,
      requireOrderOwnership: { orderId, customerId },
    },
    payload: {
      title,
      body,
      category: "orders",
      data: {
        url: `/orders?orderId=${orderId}`,
        orderId,
        type: eventType,
      },
    },
  }).catch((err) => console.error(`[Push Service] Order ${newStatus} customer push notice:`, err));

  if (newStatus === "Cancelled") {
    executePushDispatch({
      eventType: "ORDER_CANCELLED",
      idempotencyKey: `order_cancelled_staff_${orderId}`,
      target: {
        roles: ["admin", "manager"],
      },
      payload: {
        title: `Order #${orderNumber} Cancelled`,
        body: `Order #${orderNumber} was cancelled. ${reason ? `Reason: ${reason}` : ""}`,
        category: "orders",
        data: {
          url: `/manager/orders?orderId=${orderId}`,
          orderId,
          type: "ORDER_CANCELLED",
        },
      },
    }).catch((err) => console.error("[Push Service] Order cancelled staff push notice:", err));
  }
}

export async function triggerDeliveryAssignedPushInternal(params: {
  orderId: string;
  orderNumber: string;
  customerId?: string;
  driverId: string;
  driverName?: string;
  deliveryArea?: string;
  deliverySlot?: string;
}): Promise<void> {
  const { orderId, orderNumber, customerId, driverId, deliveryArea, deliverySlot } = params;

  executePushDispatch({
    eventType: "DELIVERY_ASSIGNED",
    idempotencyKey: `del_assigned_driver_${orderId}_${driverId}`,
    target: {
      userId: driverId,
      requireDriverAssignment: { orderId, driverId },
    },
    payload: {
      title: `New Delivery Assigned - #${orderNumber}`,
      body: `You have been assigned order #${orderNumber}${deliveryArea ? ` in ${deliveryArea}` : ""}${deliverySlot ? ` (${deliverySlot})` : ""}.`,
      category: "deliveries",
      data: {
        url: `/delivery/today`,
        orderId,
        type: "DELIVERY_ASSIGNED",
      },
    },
  }).catch((err) => console.error("[Push Service] Delivery assigned driver push notice:", err));

  if (customerId) {
    executePushDispatch({
      eventType: "DELIVERY_ASSIGNED",
      idempotencyKey: `del_assigned_cust_${orderId}`,
      target: {
        userId: customerId,
        requireOrderOwnership: { orderId, customerId },
      },
      payload: {
        title: `Delivery Scheduled - #${orderNumber}`,
        body: `Your order #${orderNumber} has been assigned for delivery${deliverySlot ? ` on ${deliverySlot}` : ""}.`,
        category: "deliveries",
        data: {
          url: `/orders?orderId=${orderId}`,
          orderId,
          type: "DELIVERY_ASSIGNED",
        },
      },
    }).catch((err) => console.error("[Push Service] Delivery assigned customer push notice:", err));
  }
}

export async function triggerOutForDeliveryPushInternal(params: {
  orderId: string;
  orderNumber: string;
  customerId: string;
  driverName?: string;
}): Promise<void> {
  const { orderId, orderNumber, customerId, driverName } = params;

  executePushDispatch({
    eventType: "OUT_FOR_DELIVERY",
    idempotencyKey: `out_for_delivery_${orderId}`,
    target: {
      userId: customerId,
      requireOrderOwnership: { orderId, customerId },
    },
    payload: {
      title: `Out for Delivery - #${orderNumber}`,
      body: `Your order #${orderNumber} is on its way${driverName ? ` with ${driverName}` : ""}!`,
      category: "deliveries",
      data: {
        url: `/orders?orderId=${orderId}`,
        orderId,
        type: "OUT_FOR_DELIVERY",
      },
    },
  }).catch((err) => console.error("[Push Service] Out for delivery customer push notice:", err));
}

export async function triggerDeliveryCompletedPushInternal(params: {
  orderId: string;
  orderNumber: string;
  customerId?: string;
  driverId?: string;
  driverName?: string;
}): Promise<void> {
  const { orderId, orderNumber, customerId, driverId, driverName } = params;

  if (customerId) {
    executePushDispatch({
      eventType: "DELIVERY_COMPLETED",
      idempotencyKey: `delivery_completed_cust_${orderId}`,
      target: {
        userId: customerId,
        requireOrderOwnership: { orderId, customerId },
      },
      payload: {
        title: `Delivery Completed - #${orderNumber}`,
        body: `Your order #${orderNumber} has been successfully delivered. Thank you for choosing John Stayte Services!`,
        category: "deliveries",
        data: {
          url: `/orders?orderId=${orderId}`,
          orderId,
          type: "DELIVERY_COMPLETED",
        },
      },
    }).catch((err) => console.error("[Push Service] Delivery completed customer push notice:", err));
  }

  executePushDispatch({
    eventType: "DELIVERY_COMPLETED",
    idempotencyKey: `delivery_completed_staff_${orderId}`,
    target: {
      roles: ["admin", "manager"],
    },
    payload: {
      title: `Order #${orderNumber} Delivered`,
      body: `Order #${orderNumber} was marked delivered${driverName ? ` by ${driverName}` : ""}.`,
      category: "deliveries",
      data: {
        url: `/manager/orders?orderId=${orderId}`,
        orderId,
        type: "DELIVERY_COMPLETED",
      },
    },
  }).catch((err) => console.error("[Push Service] Delivery completed staff push notice:", err));

  if (driverId) {
    executePushDispatch({
      eventType: "DELIVERY_COMPLETED",
      idempotencyKey: `delivery_completed_driver_${orderId}_${driverId}`,
      target: {
        userId: driverId,
      },
      payload: {
        title: `Delivery Logged - #${orderNumber}`,
        body: `Order #${orderNumber} delivery confirmed successfully.`,
        category: "deliveries",
        data: {
          url: `/delivery/today`,
          orderId,
          type: "DELIVERY_COMPLETED",
        },
      },
    }).catch((err) => console.error("[Push Service] Delivery completed driver push notice:", err));
  }
}

export async function triggerLowStockAlertPushInternal(params: {
  productId: string;
  productName: string;
  currentStock: number;
}): Promise<void> {
  const { productId, productName, currentStock } = params;

  executePushDispatch({
    eventType: "LOW_STOCK_ALERT",
    idempotencyKey: `low_stock_${productId}_${currentStock}_${new Date().toISOString().slice(0, 10)}`,
    target: {
      roles: ["admin", "manager"],
    },
    payload: {
      title: `Low Stock Alert: ${productName}`,
      body: `${productName} stock has dropped to ${currentStock} unit(s). Please review inventory levels.`,
      category: "inventory",
      data: {
        url: `/admin/inventory`,
        productId,
        type: "LOW_STOCK_ALERT",
      },
    },
  }).catch((err) => console.error("[Push Service] Low stock alert push notice:", err));
}

export async function triggerNewCustomerRegistrationPushInternal(params: {
  customerId: string;
  customerName: string;
  customerEmail: string;
}): Promise<void> {
  const { customerId, customerName, customerEmail } = params;

  executePushDispatch({
    eventType: "NEW_CUSTOMER_REGISTRATION",
    idempotencyKey: `new_customer_${customerId}`,
    target: {
      roles: ["admin", "manager"],
    },
    payload: {
      title: `New Customer Registered`,
      body: `${customerName || "A new customer"} (${customerEmail}) registered an account.`,
      category: "customers",
      data: {
        url: `/admin/customers`,
        customerId,
        type: "NEW_CUSTOMER_REGISTRATION",
      },
    },
  }).catch((err) => console.error("[Push Service] New customer push notice:", err));
}

export async function triggerDriverOperationalUpdatePushInternal(params: {
  orderId?: string;
  driverId: string;
  driverName: string;
  issueType: string;
  notes?: string;
}): Promise<void> {
  const { orderId, driverId, driverName, issueType, notes } = params;

  executePushDispatch({
    eventType: "DRIVER_OPERATIONAL_UPDATE",
    idempotencyKey: `driver_op_${orderId || driverId}_${Date.now()}`,
    target: {
      roles: ["admin", "manager"],
    },
    payload: {
      title: `Driver Alert: ${driverName}`,
      body: `${driverName} reported: ${issueType}${notes ? ` - ${notes}` : ""}.`,
      category: "deliveries",
      data: {
        url: `/manager/deliveries`,
        orderId: orderId || "",
        driverId,
        type: "DRIVER_OPERATIONAL_UPDATE",
      },
    },
  }).catch((err) => console.error("[Push Service] Driver operational update push notice:", err));
}

export async function triggerPromotionalOfferPushInternal(params: {
  promoId: string;
  title: string;
  body: string;
  targetCustomerIds?: string[];
  linkUrl?: string;
}): Promise<void> {
  const { promoId, title, body, targetCustomerIds, linkUrl } = params;

  if (targetCustomerIds && targetCustomerIds.length > 0) {
    for (const customerId of targetCustomerIds) {
      executePushDispatch({
        eventType: "PROMOTIONAL_OFFER",
        idempotencyKey: `promo_${promoId}_${customerId}`,
        target: {
          userId: customerId,
        },
        payload: {
          title,
          body,
          category: "promotions",
          data: {
            url: linkUrl || `/promotions`,
            promoId,
            type: "PROMOTIONAL_OFFER",
          },
        },
      }).catch((err) => console.error("[Push Service] Promotional offer push notice:", err));
    }
  } else {
    executePushDispatch({
      eventType: "PROMOTIONAL_OFFER",
      idempotencyKey: `promo_all_${promoId}`,
      target: {
        roles: ["customer"],
      },
      payload: {
        title,
        body,
        category: "promotions",
        data: {
          url: linkUrl || `/promotions`,
          promoId,
          type: "PROMOTIONAL_OFFER",
        },
      },
    }).catch((err) => console.error("[Push Service] Promotional offer broadcast notice:", err));
  }
}

// ============================================================================
// AUTHENTICATED SERVER FUNCTION ENTRYPOINT (CALLED FROM CLIENT VIA RPC)
// ============================================================================

/**
 * Authoritative dispatcher logic for client-invoked push notification requests.
 * Enforces role isolation, ownership verification, and strictly blocks client-initiated payment events.
 */
export async function handleDispatchPushNotification(
  data: DispatchPushNotificationInput,
  supabaseClient?: SupabaseClient<Database>
): Promise<{ success: boolean; message?: string }> {
  const supabase = supabaseClient || getSupabaseServerClient();

  // 1. Authenticate caller if authToken is provided
  let callerUserId: string | null = null;
  let callerRole: string = "customer";

  if (data.authToken) {
    try {
      const { data: authData } = await supabase.auth.getUser(data.authToken);
      callerUserId = authData?.user?.id || null;
      if (callerUserId) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", callerUserId)
          .maybeSingle();
        if (prof?.role) callerRole = prof.role;
        const { data: da } = await supabase
          .from("delivery_agents")
          .select("id, status")
          .eq("id", callerUserId)
          .maybeSingle();
        if (da && ["Active", "On Delivery", "Busy"].includes(da.status)) {
          callerRole = "delivery_agent";
        } else if (!da && authData?.user?.email) {
          const { data: daEmail } = await supabase
            .from("delivery_agents")
            .select("id, status")
            .ilike("email", authData.user.email.trim())
            .maybeSingle();
          if (daEmail && ["Active", "On Delivery", "Busy"].includes(daEmail.status)) {
            callerRole = "delivery_agent";
          }
        }
      }
    } catch (authErr) {
      console.warn("[Push Service] Auth token validation notice:", authErr);
    }
  }

  // 2. Strict Role & Authorization Enforcement per Event Type
  switch (data.eventType) {
    case "ORDER_PLACED": {
      if (!data.orderId) throw new Error("orderId is required");
      const { data: ord } = await supabase
        .from("orders")
        .select("id, order_number, customer_id, total, status")
        .eq("id", data.orderId)
        .maybeSingle();

      if (!ord) throw new Error("Order not found");
      if (!["admin", "manager"].includes(callerRole)) {
        if (!callerUserId || ord.customer_id !== callerUserId) {
          throw new Error("Unauthorized: customer does not own order");
        }
      }
      await triggerOrderPlacedPushInternal({
        orderId: ord.id,
        orderNumber: ord.order_number || ord.id.slice(0, 8),
        customerId: ord.customer_id || data.customerId || "",
        itemCount: data.itemCount || 1,
        totalFormatted: data.totalFormatted || `£${(ord.total || 0).toFixed(2)}`,
        customerName: data.customerName,
      });
      return { success: true };
    }

    case "PAYMENT_SUCCEEDED":
    case "PAYMENT_FAILED": {
      // TASK 1: PAYMENT_SUCCEEDED and PAYMENT_FAILED must never be accepted merely because
      // an authenticated client requests those events.
      // Prevent both customers and staff (admin, manager) from directly dispatching payment events.
      // Trusted server-side payment dispatch is handled exclusively by authoritative server workflows
      // (such as elavon-payment-server-fn.ts) via triggerPaymentStatusPushInternal.
      throw new Error(
        "Unauthorized: Payment push notifications cannot be dispatched from client endpoints. " +
        "Payment events are dispatched exclusively by authoritative server workflows."
      );
    }

    case "ORDER_APPROVED":
    case "ORDER_PACKED":
    case "ORDER_CANCELLED": {
      if (!["admin", "manager"].includes(callerRole)) {
        throw new Error("Unauthorized: only managers and admins can trigger order lifecycle updates");
      }
      if (!data.orderId) throw new Error("orderId is required");
      const { data: ord } = await supabase
        .from("orders")
        .select("id, order_number, customer_id")
        .eq("id", data.orderId)
        .maybeSingle();

      if (!ord || !ord.customer_id) throw new Error("Order or customer not found");
      let mappedStatus: "Approved" | "Packed" | "Cancelled" = "Approved";
      if (data.eventType === "ORDER_PACKED") mappedStatus = "Packed";
      if (data.eventType === "ORDER_CANCELLED") mappedStatus = "Cancelled";

      await triggerOrderStatusPushInternal({
        orderId: ord.id,
        orderNumber: ord.order_number || ord.id.slice(0, 8),
        customerId: ord.customer_id,
        newStatus: mappedStatus,
        reason: data.reason,
      });
      return { success: true };
    }

    case "DELIVERY_ASSIGNED": {
      if (!["admin", "manager"].includes(callerRole)) {
        throw new Error("Unauthorized: only managers and admins can trigger delivery assignment push");
      }
      if (!data.orderId || !data.driverId) throw new Error("orderId and driverId are required");
      const { data: ord } = await supabase
        .from("orders")
        .select("id, order_number, customer_id")
        .eq("id", data.orderId)
        .maybeSingle();

      await triggerDeliveryAssignedPushInternal({
        orderId: data.orderId,
        orderNumber: ord?.order_number || data.orderId.slice(0, 8),
        customerId: ord?.customer_id || data.customerId,
        driverId: data.driverId,
        driverName: data.driverName,
        deliveryArea: data.deliveryArea,
        deliverySlot: data.deliverySlot,
      });
      return { success: true };
    }

    case "OUT_FOR_DELIVERY": {
      if (!["admin", "manager", "delivery_agent"].includes(callerRole)) {
        throw new Error("Unauthorized: delivery role required");
      }
      if (!data.orderId) throw new Error("orderId is required");
      if (callerRole === "delivery_agent" && callerUserId) {
        const { data: asgn } = await supabase
          .from("delivery_assignments")
          .select("id, agent_id, driver_id")
          .eq("order_id", data.orderId)
          .maybeSingle();
        if (!asgn || (asgn.agent_id !== callerUserId && asgn.driver_id !== callerUserId)) {
          throw new Error("Unauthorized: delivery agent is not assigned to this order");
        }
      }
      const { data: ord } = await supabase
        .from("orders")
        .select("id, order_number, customer_id")
        .eq("id", data.orderId)
        .maybeSingle();

      if (!ord?.customer_id) throw new Error("Customer not found for order");
      await triggerOutForDeliveryPushInternal({
        orderId: ord.id,
        orderNumber: ord.order_number || ord.id.slice(0, 8),
        customerId: ord.customer_id,
        driverName: data.driverName,
      });
      return { success: true };
    }

    case "DELIVERY_COMPLETED": {
      if (!["admin", "manager", "delivery_agent"].includes(callerRole)) {
        throw new Error("Unauthorized: delivery role required");
      }
      if (!data.orderId) throw new Error("orderId is required");
      if (callerRole === "delivery_agent" && callerUserId) {
        const { data: asgn } = await supabase
          .from("delivery_assignments")
          .select("id, agent_id, driver_id")
          .eq("order_id", data.orderId)
          .maybeSingle();
        if (!asgn || (asgn.agent_id !== callerUserId && asgn.driver_id !== callerUserId)) {
          throw new Error("Unauthorized: delivery agent is not assigned to this order");
        }
      }
      const { data: ord } = await supabase
        .from("orders")
        .select("id, order_number, customer_id")
        .eq("id", data.orderId)
        .maybeSingle();

      await triggerDeliveryCompletedPushInternal({
        orderId: data.orderId,
        orderNumber: ord?.order_number || data.orderId.slice(0, 8),
        customerId: ord?.customer_id || data.customerId,
        driverId: data.driverId,
        driverName: data.driverName,
      });
      return { success: true };
    }

    case "LOW_STOCK_ALERT": {
      if (!["admin", "manager"].includes(callerRole)) {
        throw new Error("Unauthorized: only managers and admins can trigger low stock alerts");
      }
      if (!data.productId || !data.productName) throw new Error("productId and productName are required");
      await triggerLowStockAlertPushInternal({
        productId: data.productId,
        productName: data.productName,
        currentStock: data.currentStock ?? 0,
      });
      return { success: true };
    }

    case "NEW_CUSTOMER_REGISTRATION": {
      if (!data.customerId || !data.customerEmail) throw new Error("customerId and customerEmail are required");
      if (callerUserId && callerUserId !== data.customerId && !["admin", "manager"].includes(callerRole)) {
        throw new Error("Unauthorized: cannot trigger registration for another customer");
      }
      await triggerNewCustomerRegistrationPushInternal({
        customerId: data.customerId,
        customerName: data.customerName || "New Customer",
        customerEmail: data.customerEmail,
      });
      return { success: true };
    }

    case "DRIVER_OPERATIONAL_UPDATE": {
      if (!["admin", "manager", "delivery_agent"].includes(callerRole)) {
        throw new Error("Unauthorized: driver or staff role required");
      }
      if (callerRole === "delivery_agent" && callerUserId && data.orderId) {
        const { data: asgn } = await supabase
          .from("delivery_assignments")
          .select("id, agent_id, driver_id")
          .eq("order_id", data.orderId)
          .maybeSingle();
        if (!asgn || (asgn.agent_id !== callerUserId && asgn.driver_id !== callerUserId)) {
          throw new Error("Unauthorized: delivery agent is not assigned to this order");
        }
      }
      await triggerDriverOperationalUpdatePushInternal({
        orderId: data.orderId,
        driverId: data.driverId || callerUserId || "",
        driverName: data.driverName || "Driver",
        issueType: data.issueType || "Delivery Notice",
        notes: data.notes,
      });
      return { success: true };
    }

    case "PROMOTIONAL_OFFER": {
      if (!["admin", "manager"].includes(callerRole)) {
        throw new Error("Unauthorized: only managers and admins can trigger promotions");
      }
      await triggerPromotionalOfferPushInternal({
        promoId: data.promoId || String(Date.now()),
        title: data.title || "Special Offer",
        body: data.body || "",
        targetCustomerIds: data.targetCustomerIds,
        linkUrl: data.linkUrl,
      });
      return { success: true };
    }

    default:
      throw new Error(`Unhandled event type: ${data.eventType}`);
  }
}

export const dispatchPushNotificationServerFn = createServerFn({ method: "POST" })
  .validator((d: unknown): DispatchPushNotificationInput => {
    if (!d || typeof d !== "object") throw new Error("Invalid request payload");
    const input = d as Record<string, any>;
    if (!input.eventType || typeof input.eventType !== "string") {
      throw new Error("eventType is required");
    }
    return input as DispatchPushNotificationInput;
  })
  .handler(async ({ data }) => {
    return handleDispatchPushNotification(data);
  });

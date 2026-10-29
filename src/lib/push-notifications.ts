import { Capacitor } from "@capacitor/core";
import { PushNotifications, type ActionPerformed, type PushNotificationSchema, type Token } from "@capacitor/push-notifications";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  registerDeviceTokenServerFn,
  deactivateDeviceTokenServerFn,
  dispatchPushNotificationServerFn,
} from "./push-notification-server-fn";
import type { PushPlatform } from "./push-notifications-types";

const STORAGE_KEY_TOKEN = "jss_device_push_token";
const STORAGE_KEY_INSTALLATION_ID = "jss_installation_id";

/**
 * Resolves a valid, unexpired Supabase access token for the current user session.
 * Proactively refreshes the session if expired or near expiry (< 60s), ensuring
 * backend calls never receive an invalid or stale JWT.
 */
export async function getAuthToken(supabaseClient?: any): Promise<string | null> {
  const client = supabaseClient || supabase;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { data: sessionData, error: sessionErr } = await client.auth.getSession();
      if (sessionErr) {
        console.warn("[Push Service] Notice retrieving auth session:", sessionErr.message);
      }
      let session = sessionData?.session;

      // Check if session is missing or near expiry (within 60 seconds)
      const isExpiredOrNearExpiry =
        !session ||
        (session.expires_at && session.expires_at * 1000 - Date.now() < 60000);

      if (isExpiredOrNearExpiry) {
        try {
          const { data: refreshData, error: refreshErr } = await client.auth.refreshSession();
          if (!refreshErr && refreshData?.session?.access_token) {
            session = refreshData.session;
          }
        } catch {
          // Fallback to existing session or getUser()
        }
      }

      if (session?.access_token) {
        return session.access_token;
      }

      // Fallback check to getUser() to trigger internal session recovery if getSession returned empty
      const { data: userData } = await client.auth.getUser();
      if (userData?.user) {
        const { data: rechecked } = await client.auth.getSession();
        if (rechecked?.session?.access_token) {
          return rechecked.session.access_token;
        }
      }
    } catch (err: any) {
      console.warn("[Push Service] getAuthToken notice:", err?.message || err);
    }

    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return null;
}

let activeSyncPromise: Promise<{ success: boolean; deferred?: boolean; error?: string }> | null = null;
let lastSyncedToken: string | null = null;

/**
 * Registers or synchronizes a device token with the backend database for the current authenticated user.
 * 
 * Rules:
 * 1. Does not assume a cached token implies an active authenticated user session.
 * 2. If the user session is unavailable (unauthenticated or hydrating), defers synchronization
 *    safely without displaying misleading error toasts.
 * 3. When triggered by explicit user action (e.g. settings toggle or permission grant), surfaces
 *    user-facing feedback.
 * 4. Deduplicates concurrent sync calls and avoids redundant syncs when token is already active.
 */
export async function registerDeviceTokenToServer(
  tokenToSync?: string,
  providedAuthToken?: string | null,
  isExplicitUserAction: boolean = false
): Promise<{ success: boolean; deferred?: boolean; error?: string }> {
  if (!isNativePushSupported()) {
    return { success: false, error: "Native push not supported on this platform" };
  }

  const token =
    tokenToSync ||
    (typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY_TOKEN) : null);

  if (!token || !token.trim()) {
    return { success: false, error: "No device token available" };
  }

  // Avoid redundant network RPC if already synced during this session
  if (!isExplicitUserAction && lastSyncedToken === token.trim()) {
    console.log("[Push Service] Device token already synchronized for current session.");
    return { success: true };
  }

  // Deduplicate concurrent inflight sync calls
  if (activeSyncPromise) {
    return activeSyncPromise;
  }

  activeSyncPromise = (async () => {
    try {
      let authToken = providedAuthToken || null;
      if (!authToken) {
        authToken = await getAuthToken();
      }

      console.log(`[Push Service] Device token sync - authenticated session available: ${Boolean(authToken)}`);

      if (!authToken) {
        console.log(
          "[Push Service] Device token present but user session not yet hydrated. Deferred until authentication is available."
        );
        if (isExplicitUserAction) {
          toast.error("Please sign in to enable push notifications on this device.");
        }
        return { success: false, deferred: true, error: "Not authenticated" };
      }

      const platform: PushPlatform = Capacitor.getPlatform() === "ios" ? "ios" : "android";

      console.log(`[Push Service] Calling registerDeviceTokenServerFn (platform: ${platform})...`);
      const serverRes = await registerDeviceTokenServerFn({
        data: {
          token: token.trim(),
          platform,
          installationId: getOrCreateInstallationId(),
          deviceInfo: getDeviceMetadata(),
          authToken,
        },
      });

      console.log("[Push Service] Server function response:", {
        success: Boolean(serverRes?.success),
        hasResult: Boolean(serverRes?.result),
        error: serverRes?.error || null,
      });

      if (!serverRes || !serverRes.success) {
        const reason = serverRes?.error || "Server rejected registration";
        console.error("[Push Service] Failed to register token with backend server:", reason);
        if (isExplicitUserAction) {
          toast.error(`Push registration failed: ${reason}`);
        }
        return { success: false, error: reason };
      }

      lastSyncedToken = token.trim();
      console.log("[Push Service] Device token successfully registered in database for current user.");
      if (isExplicitUserAction) {
        toast.success("Push notifications enabled on this device.");
      }
      return { success: true };
    } catch (serverErr: any) {
      const errMsg = serverErr?.message || String(serverErr || "Network error");
      console.error("[Push Service] Exception calling registerDeviceTokenServerFn:", errMsg);
      if (isExplicitUserAction) {
        toast.error(`Push registration network error: ${errMsg}`);
      }
      return { success: false, error: errMsg };
    } finally {
      activeSyncPromise = null;
    }
  })();

  return activeSyncPromise;
}

let authListenerAttached = false;

/**
 * Listens for auth state changes (e.g. login, session refresh)
 * to automatically synchronize cached device tokens when auth hydrates.
 */
export function setupPushAuthSyncListener(): void {
  if (authListenerAttached || typeof window === "undefined") return;
  authListenerAttached = true;

  try {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (
        (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") &&
        session?.access_token &&
        isNativePushSupported()
      ) {
        const cachedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
        if (cachedToken) {
          console.log(`[Push Service] Auth state changed (${event}); synchronizing device token...`);
          await registerDeviceTokenToServer(cachedToken, session.access_token, false);
        }
      } else if (event === "SIGNED_OUT") {
        lastSyncedToken = null;
      }
    });
  } catch (err) {
    console.warn("[Push Service] Could not attach push auth sync listener:", err);
  }
}

/**
 * Checks if the current runtime environment supports native push notifications.
 * Only returns true on Capacitor native iOS and Android.
 */
export function isNativePushSupported(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Resolves or creates a persistent device installation identifier.
 */
export function getOrCreateInstallationId(): string {
  if (typeof window === "undefined") return "server-runtime";

  let installationId = localStorage.getItem(STORAGE_KEY_INSTALLATION_ID);
  if (!installationId) {
    installationId = "inst_" + Math.random().toString(36).substring(2, 15) + "_" + Date.now().toString(36);
    try {
      localStorage.setItem(STORAGE_KEY_INSTALLATION_ID, installationId);
    } catch {
      // localStorage may be disabled
    }
  }
  return installationId;
}

/**
 * Collects safe device metadata for diagnostic logs (no PII).
 */
function getDeviceMetadata(): Record<string, any> {
  if (typeof window === "undefined") return {};
  return {
    platform: Capacitor.getPlatform(),
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
    screen: typeof window !== "undefined" ? `${window.screen.width}x${window.screen.height}` : "unknown",
  };
}

/**
 * Sets up Android notification channels for Android 8.0+ (API 26+).
 */
async function setupAndroidChannels(): Promise<void> {
  if (Capacitor.getPlatform() !== "android") return;

  try {
    await PushNotifications.createChannel({
      id: "orders",
      name: "Orders & Confirmations",
      description: "Notifications about your order confirmations, updates, and cancellations",
      importance: 5, // High
      visibility: 1, // Public
      sound: "default",
      vibration: true,
      lights: true,
    });

    await PushNotifications.createChannel({
      id: "deliveries",
      name: "Delivery Updates",
      description: "Live delivery status updates, courier tracking, and completion notices",
      importance: 5,
      visibility: 1,
      sound: "default",
      vibration: true,
      lights: true,
    });

    await PushNotifications.createChannel({
      id: "inventory",
      name: "Inventory Alerts",
      description: "Low stock alerts and operational stock notifications",
      importance: 4,
      visibility: 0, // Private
      sound: "default",
      vibration: true,
    });

    await PushNotifications.createChannel({
      id: "promotions",
      name: "Promotions & Offers",
      description: "Special seasonal discounts, cylinder promotions, and gas deals",
      importance: 3, // Default
      visibility: 1,
      sound: "default",
      vibration: false,
    });
  } catch (err) {
    console.warn("[Push Service] Android notification channels registration notice:", err);
  }
}

let isInitialized = false;

/**
 * Initializes native push notifications if running on iOS or Android.
 * Sets up channels, registers listeners for foreground events and tap actions,
 * and requests registration token.
 */
export async function initializePushNotifications(options?: {
  onNavigate?: (url: string) => void;
  promptPermission?: boolean;
}): Promise<{ supported: boolean; permissionGranted?: boolean; token?: string }> {
  if (!isNativePushSupported()) {
    return { supported: false };
  }

  try {
    // 1. Configure Android Channels
    await setupAndroidChannels();

    // 2. Check or Request Permissions
    let permStatus = await PushNotifications.checkPermissions();
    console.log(`[Push Service] Initial permission check: receive=${permStatus.receive}`);

    if (
      (permStatus.receive === "prompt" || (permStatus.receive as string) === "prompt-with-rationale") &&
      options?.promptPermission
    ) {
      console.log("[Push Service] Prompting user for notification permission...");
      permStatus = await PushNotifications.requestPermissions();
      console.log(`[Push Service] Permission prompt result: receive=${permStatus.receive}`);
    }

    const permissionGranted = permStatus.receive === "granted";
    console.log(`[Push Service] Notification permission granted: ${permissionGranted}`);

    // 3. Set up event listeners once
    if (!isInitialized) {
      // Set up auth state change listener to auto-sync when session hydrates or user logs in
      setupPushAuthSyncListener();

      // Registration successful: capture FCM device token
      await PushNotifications.addListener("registration", async (token: Token) => {
        console.log(`[Push Service] Native device token registered successfully (length: ${token.value?.length || 0})`);
        try {
          localStorage.setItem(STORAGE_KEY_TOKEN, token.value);
        } catch {}

        await registerDeviceTokenToServer(token.value, null, false);
      });

      // Registration failure
      await PushNotifications.addListener("registrationError", (error: any) => {
        const errMsg =
          typeof error === "object" && error !== null
            ? error.error || error.message || JSON.stringify(error)
            : String(error || "Unknown registration error");
        console.error("[Push Service] Push notification registration error from OS/Firebase:", errMsg);
        toast.error(`Push notification registration failed: ${errMsg}`);
      });

      // Foreground notification received while the app is active
      await PushNotifications.addListener(
        "pushNotificationReceived",
        (notification: PushNotificationSchema) => {
          console.log("[Push Service] Push notification received in foreground:", notification);

          const title = notification.title || "Notification";
          const body = notification.body || "";
          const targetUrl = notification.data?.url;

          // Display rich toast alert with tap action
          toast(title, {
            description: body,
            action: targetUrl
              ? {
                  label: "View",
                  onClick: () => {
                    if (options?.onNavigate) {
                      options.onNavigate(targetUrl);
                    } else if (typeof window !== "undefined") {
                      window.location.assign(targetUrl);
                    }
                  },
                }
              : undefined,
          });
        }
      );

      // Notification action performed (user tapped the notification in system shade / lock screen)
      await PushNotifications.addListener(
        "pushNotificationActionPerformed",
        (action: ActionPerformed) => {
          console.log("[Push Service] Notification tapped:", action);
          const targetUrl = action.notification.data?.url;

          if (targetUrl) {
            // Give the app 100ms to stabilize if waking from background
            setTimeout(() => {
              if (options?.onNavigate) {
                options.onNavigate(targetUrl);
              } else if (typeof window !== "undefined") {
                window.location.assign(targetUrl);
              }
            }, 100);
          }
        }
      );

      isInitialized = true;
    }

    // 4. If permission granted, call register to obtain or refresh the token
    if (permissionGranted) {
      console.log("[Push Service] Calling PushNotifications.register() to obtain/refresh FCM token...");
      await PushNotifications.register();

      // If cached token already exists on device, attempt sync (deferred cleanly if unauthenticated)
      const cachedToken = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY_TOKEN) : null;
      if (cachedToken) {
        console.log(`[Push Service] Syncing cached device token (length: ${cachedToken.length})...`);
        await registerDeviceTokenToServer(cachedToken, null, false);
      }
    }

    const cachedToken = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY_TOKEN) : null;
    return {
      supported: true,
      permissionGranted,
      token: cachedToken || undefined,
    };
  } catch (err: any) {
    console.error("[Push Service] Initialization error:", err);
    return { supported: true, permissionGranted: false };
  }
}

/**
 * Requests push notification permission and triggers registration if granted.
 * @param isExplicitUserAction Set to true when invoked by direct user interaction (e.g. settings toggle)
 */
export async function requestPushPermissionsAndRegister(isExplicitUserAction: boolean = false): Promise<boolean> {
  if (!isNativePushSupported()) return false;

  try {
    // Ensure notification channels and listeners are always initialized first
    await initializePushNotifications({ promptPermission: true });

    let permStatus = await PushNotifications.checkPermissions();
    console.log(`[Push Service] requestPushPermissionsAndRegister checkPermissions: receive=${permStatus.receive}`);

    if (
      permStatus.receive === "prompt" ||
      (permStatus.receive as string) === "prompt-with-rationale"
    ) {
      console.log("[Push Service] requestPushPermissionsAndRegister: Requesting permissions...");
      permStatus = await PushNotifications.requestPermissions();
      console.log(`[Push Service] requestPushPermissionsAndRegister: Request result receive=${permStatus.receive}`);
    }

    if (permStatus.receive === "granted") {
      console.log("[Push Service] Calling PushNotifications.register() from requestPushPermissionsAndRegister...");
      await PushNotifications.register();

      const cachedToken = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY_TOKEN) : null;
      if (cachedToken) {
        await registerDeviceTokenToServer(cachedToken, null, isExplicitUserAction);
      }
      return true;
    }
    return false;
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    console.error("[Push Service] Permission request failed:", errMsg);
    if (isExplicitUserAction) {
      toast.error(`Push permission request failed: ${errMsg}`);
    }
    return false;
  }
}

/**
 * Deactivates the device token on server and removes listeners on logout or account switch.
 */
export async function unregisterPushNotifications(): Promise<void> {
  if (!isNativePushSupported()) return;

  try {
    const cachedToken = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY_TOKEN) : null;
    if (cachedToken) {
      const authToken = await getAuthToken();
      try {
        await deactivateDeviceTokenServerFn({
          data: { token: cachedToken, authToken },
        });
      } catch (serverErr) {
        console.warn("[Push Service] Notice deactivating token on server during logout:", serverErr);
      }
      try {
        localStorage.removeItem(STORAGE_KEY_TOKEN);
      } catch {}
      lastSyncedToken = null;
    }

    // Remove delivered notifications from system drawer
    try {
      await PushNotifications.removeAllDeliveredNotifications();
    } catch {}
  } catch (err) {
    console.error("[Push Service] Unregister error:", err);
  }
}

// ============================================================================
// CLIENT EVENT TRIGGER WRAPPERS (INVOKES SECURE SERVER FN VIA RPC)
// ============================================================================

export async function triggerOrderPlacedPush(params: {
  orderId: string;
  orderNumber: string;
  customerId: string;
  itemCount: number;
  totalFormatted: string;
  customerName?: string;
}): Promise<void> {
  const authToken = await getAuthToken();
  await dispatchPushNotificationServerFn({
    data: {
      eventType: "ORDER_PLACED",
      authToken,
      ...params,
    },
  });
}

/**
 * @deprecated Client-initiated payment push notifications have been removed for security.
 * Payment notifications are dispatched exclusively server-side upon verified capture by trusted workflows.
 */
export async function triggerPaymentStatusPush(params: {
  orderId: string;
  orderNumber: string;
  customerId: string;
  status: "succeeded" | "failed";
  amountFormatted: string;
  failureReason?: string;
}): Promise<void> {
  console.warn(
    `[Push Service] Suppressed client-initiated payment notification for order ${params.orderId}. ` +
    `Payment notifications are dispatched exclusively via authoritative server workflows.`
  );
}

export async function triggerOrderStatusPush(params: {
  orderId: string;
  orderNumber: string;
  customerId: string;
  newStatus: "Approved" | "Packed" | "Cancelled";
  reason?: string;
}): Promise<void> {
  const authToken = await getAuthToken();
  let eventType: "ORDER_APPROVED" | "ORDER_PACKED" | "ORDER_CANCELLED" = "ORDER_APPROVED";
  if (params.newStatus === "Packed") eventType = "ORDER_PACKED";
  if (params.newStatus === "Cancelled") eventType = "ORDER_CANCELLED";

  await dispatchPushNotificationServerFn({
    data: {
      eventType,
      authToken,
      ...params,
    },
  });
}

export async function triggerDeliveryAssignedPush(params: {
  orderId: string;
  orderNumber: string;
  customerId?: string;
  driverId: string;
  driverName?: string;
  deliveryArea?: string;
  deliverySlot?: string;
}): Promise<void> {
  const authToken = await getAuthToken();
  await dispatchPushNotificationServerFn({
    data: {
      eventType: "DELIVERY_ASSIGNED",
      authToken,
      ...params,
    },
  });
}

export async function triggerOutForDeliveryPush(params: {
  orderId: string;
  orderNumber: string;
  customerId: string;
  driverName?: string;
}): Promise<void> {
  const authToken = await getAuthToken();
  await dispatchPushNotificationServerFn({
    data: {
      eventType: "OUT_FOR_DELIVERY",
      authToken,
      ...params,
    },
  });
}

export async function triggerDeliveryCompletedPush(params: {
  orderId: string;
  orderNumber: string;
  customerId?: string;
  driverId?: string;
  driverName?: string;
}): Promise<void> {
  const authToken = await getAuthToken();
  await dispatchPushNotificationServerFn({
    data: {
      eventType: "DELIVERY_COMPLETED",
      authToken,
      ...params,
    },
  });
}

export async function triggerLowStockAlertPush(params: {
  productId: string;
  productName: string;
  currentStock: number;
}): Promise<void> {
  const authToken = await getAuthToken();
  await dispatchPushNotificationServerFn({
    data: {
      eventType: "LOW_STOCK_ALERT",
      authToken,
      ...params,
    },
  });
}

export async function triggerNewCustomerRegistrationPush(params: {
  customerId: string;
  customerName: string;
  customerEmail: string;
}): Promise<void> {
  const authToken = await getAuthToken();
  await dispatchPushNotificationServerFn({
    data: {
      eventType: "NEW_CUSTOMER_REGISTRATION",
      authToken,
      ...params,
    },
  });
}

export async function triggerDriverOperationalUpdatePush(params: {
  orderId?: string;
  driverId: string;
  driverName: string;
  issueType: string;
  notes?: string;
}): Promise<void> {
  const authToken = await getAuthToken();
  await dispatchPushNotificationServerFn({
    data: {
      eventType: "DRIVER_OPERATIONAL_UPDATE",
      authToken,
      ...params,
    },
  });
}

export async function triggerPromotionalOfferPush(params: {
  promoId: string;
  title: string;
  body: string;
  targetCustomerIds?: string[];
  linkUrl?: string;
}): Promise<void> {
  const authToken = await getAuthToken();
  await dispatchPushNotificationServerFn({
    data: {
      eventType: "PROMOTIONAL_OFFER",
      authToken,
      ...params,
    },
  });
}


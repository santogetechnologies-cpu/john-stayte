import { Capacitor } from "@capacitor/core";
import { PushNotifications, type ActionPerformed, type PushNotificationSchema, type Token } from "@capacitor/push-notifications";
import { toast } from "sonner";
import { registerDeviceTokenServerFn, deactivateDeviceTokenServerFn } from "./push-notification-server-fn";
import type { PushPlatform } from "./push-notifications-types";

const STORAGE_KEY_TOKEN = "jss_device_push_token";
const STORAGE_KEY_INSTALLATION_ID = "jss_installation_id";

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
      // Registration successful: capture FCM device token
      await PushNotifications.addListener("registration", async (token: Token) => {
        console.log(`[Push Service] Native device token registered successfully (length: ${token.value?.length || 0})`);
        try {
          localStorage.setItem(STORAGE_KEY_TOKEN, token.value);
        } catch {}

        // Send token to server
        const platform: PushPlatform = Capacitor.getPlatform() === "ios" ? "ios" : "android";
        try {
          const authToken = await getAuthToken();
          console.log(`[Push Service] Authenticated session available: ${Boolean(authToken)}`);
          if (!authToken) {
            console.warn("[Push Service] Registration token received before user login; saved locally for login sync.");
            return;
          }
          console.log(`[Push Service] Calling registerDeviceTokenServerFn (platform: ${platform})...`);
          const serverRes = await registerDeviceTokenServerFn({
            data: {
              token: token.value,
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
            toast.error(`Push registration failed: ${reason}`);
          } else {
            console.log("[Push Service] Token successfully registered in database for current user.");
            toast.success("Push notifications enabled on this device.");
          }
        } catch (serverErr: any) {
          const errMsg = serverErr?.message || String(serverErr);
          console.error("[Push Service] Exception calling registerDeviceTokenServerFn:", errMsg);
          toast.error(`Push registration network error: ${errMsg}`);
        }
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

      // If cached token already exists on device, ensure backend registration is up-to-date with current auth session
      const cachedToken = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY_TOKEN) : null;
      if (cachedToken) {
        console.log(`[Push Service] Syncing cached device token (length: ${cachedToken.length})...`);
        const authToken = await getAuthToken();
        console.log(`[Push Service] Cached token sync - authenticated session available: ${Boolean(authToken)}`);
        if (authToken) {
          const platform: PushPlatform = Capacitor.getPlatform() === "ios" ? "ios" : "android";
          registerDeviceTokenServerFn({
            data: {
              token: cachedToken,
              platform,
              installationId: getOrCreateInstallationId(),
              deviceInfo: getDeviceMetadata(),
              authToken,
            },
          })
            .then((res) => {
              console.log("[Push Service] Cached token sync response:", {
                success: Boolean(res?.success),
                error: res?.error || null,
              });
              if (!res || !res.success) {
                const reason = res?.error || "Server rejected registration";
                console.error("[Push Service] Cached token sync failed on server:", reason);
                toast.error(`Push sync failed: ${reason}`);
              } else {
                console.log("[Push Service] Cached token successfully synced with database.");
              }
            })
            .catch((err: any) => {
              const errMsg = err?.message || String(err || "Network error");
              console.error("[Push Service] Cached token sync network error:", errMsg);
              toast.error(`Push sync network error: ${errMsg}`);
            });
        }
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
 */
export async function requestPushPermissionsAndRegister(): Promise<boolean> {
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
      return true;
    }
    return false;
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    console.error("[Push Service] Permission request failed:", errMsg);
    toast.error(`Push permission request failed: ${errMsg}`);
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

import { supabase } from "@/lib/supabase";
import { dispatchPushNotificationServerFn } from "./push-notification-server-fn";

async function getAuthToken(): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) {
        return data.session.access_token;
      }
    } catch {
      // ignore
    }
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  return null;
}

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


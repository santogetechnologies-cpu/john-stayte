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

    if (permStatus.receive === "prompt" && options?.promptPermission) {
      permStatus = await PushNotifications.requestPermissions();
    }

    const permissionGranted = permStatus.receive === "granted";

    // 3. Set up event listeners once
    if (!isInitialized) {
      // Registration successful: capture FCM device token
      await PushNotifications.addListener("registration", async (token: Token) => {
        console.log("[Push Service] Native device token registered successfully:", token.value);
        try {
          localStorage.setItem(STORAGE_KEY_TOKEN, token.value);
        } catch {}

        // Send token to server
        const platform: PushPlatform = Capacitor.getPlatform() === "ios" ? "ios" : "android";
        try {
          await registerDeviceTokenServerFn({
            data: {
              token: token.value,
              platform,
              installationId: getOrCreateInstallationId(),
              deviceInfo: getDeviceMetadata(),
            },
          });
        } catch (serverErr) {
          console.error("[Push Service] Failed to register token with backend server:", serverErr);
        }
      });

      // Registration failure
      await PushNotifications.addListener("registrationError", (error: any) => {
        console.error("[Push Service] Push notification registration failed:", error);
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
      await PushNotifications.register();
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
    const permStatus = await PushNotifications.requestPermissions();
    if (permStatus.receive === "granted") {
      await PushNotifications.register();
      return true;
    }
    return false;
  } catch (err) {
    console.error("[Push Service] Permission request failed:", err);
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
      try {
        await deactivateDeviceTokenServerFn({
          data: { token: cachedToken },
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
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  } catch {
    return null;
  }
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


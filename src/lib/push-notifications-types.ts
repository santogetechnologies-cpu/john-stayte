/**
 * John Stayte Services - Push Notification Types & Event Contracts
 * Defines strict role isolation, events, and payload structures.
 */

export type PushPlatform = "android" | "ios" | "web";

export type PushRole = "customer" | "admin" | "manager" | "delivery_agent";

export type PushEventType =
  | "ORDER_PLACED"
  | "PAYMENT_SUCCEEDED"
  | "PAYMENT_FAILED"
  | "ORDER_APPROVED"
  | "ORDER_PACKED"
  | "DELIVERY_ASSIGNED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERY_COMPLETED"
  | "ORDER_CANCELLED"
  | "LOW_STOCK_ALERT"
  | "NEW_CUSTOMER_REGISTRATION"
  | "DRIVER_OPERATIONAL_UPDATE"
  | "ADMIN_ALERT"
  | "PROMOTIONAL_OFFER";

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  category?: string;
  clickAction?: string;
  sound?: string;
  badge?: number;
}

export interface PushDispatchTarget {
  userId?: string;
  roles?: PushRole[];
  requireOrderOwnership?: {
    orderId: string;
    customerId: string;
  };
  requireDriverAssignment?: {
    orderId: string;
    driverId: string;
  };
}

export interface PushDispatchEvent {
  eventType: PushEventType;
  idempotencyKey: string;
  target: PushDispatchTarget;
  payload: PushNotificationPayload;
}

export interface PushDispatchResult {
  success: boolean;
  idempotencyKey: string;
  eventType: PushEventType;
  recipientCount: number;
  tokensAttempted: number;
  tokensSucceeded: number;
  tokensFailed: number;
  status: "sent" | "skipped" | "failed" | "no_tokens";
  message?: string;
  errors?: string[];
}

export interface RegisterDeviceTokenInput {
  token: string;
  platform: PushPlatform;
  installationId?: string;
  deviceInfo?: Record<string, any>;
}

export interface DeviceTokenRecord {
  id: string;
  userId: string;
  token: string;
  platform: PushPlatform;
  role: PushRole;
  installationId?: string | null;
  deviceInfo: Record<string, any>;
  isActive: boolean;
  lastUsedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DispatchPushNotificationInput {
  eventType: PushEventType;
  authToken?: string | null;
  orderId?: string;
  orderNumber?: string;
  customerId?: string;
  status?: string;
  amountFormatted?: string;
  failureReason?: string;
  newStatus?: string;
  reason?: string;
  driverId?: string;
  driverName?: string;
  deliveryArea?: string;
  deliverySlot?: string;
  productId?: string;
  productName?: string;
  currentStock?: number;
  customerName?: string;
  customerEmail?: string;
  issueType?: string;
  notes?: string;
  promoId?: string;
  title?: string;
  body?: string;
  targetCustomerIds?: string[];
  linkUrl?: string;
  itemCount?: number;
  totalFormatted?: string;
}


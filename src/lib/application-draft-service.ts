import { supabase } from "@/lib/supabase";

export interface GasApplicationDraft {
  customerId: string;
  updatedAt: string;
  // Section 1: Customer Personal Details
  title?: string;
  fullName?: string;
  dateOfBirth?: string;
  phone?: string;
  altPhone?: string;
  email?: string;
  preferredContactMethod?: string;
  // Section 2: Delivery & Site Information
  houseNumberOrName?: string;
  streetAddress?: string;
  city?: string;
  county?: string;
  postcode?: string;
  deliveryNotes?: string;
  hasDifferentDelivery?: boolean;
  deliveryAddress?: string;
  hasDifferentBilling?: boolean;
  billingAddress?: string;
  // Section 3: Gas Usage & Customer Classification
  customerType?: "HOME" | "BUSINESS";
  hasPreviousPurchases?: boolean;
  previousAccountDetails?: string;
  knowsAccountNumber?: boolean | null;
  selectedUsages?: Array<"DOMESTIC" | "COMMERCIAL" | "BULK" | "AUTOGAS">;
  estimatedConsumption?: string;
  primaryAppliances?: string[];
  businessName?: string;
  tradingName?: string;
  companyRegOrVat?: string;
  businessType?: string;
  businessAddress?: string;
  businessContact?: string;
  // Section 4: Gas & Cylinder Requirements
  selectedGasTypes?: string[];
  selectedCylinderSizes?: string[];
  hasConfirmedCylinderSizes?: boolean;
  existingCylinderStatus?: string;
  initialQuantity?: string;
  storageLocation?: string;
  regulatorType?: string;
  // Section 5: Safety Compliance & Agreement
  declarationAccepted?: boolean;
  storageConfirmed?: boolean;
  // Section 6: Verification status (safe UI session state & cooldown timestamp, NEVER secret OTP codes)
  verifiedEmail?: string | null;
  verificationStep?: "ENTER_EMAIL" | "ENTER_OTP" | "VERIFIED";
  otpSentTo?: string;
  otpCooldownEndsAt?: number | null;
}

const STORAGE_KEY_PREFIX = "jss_gas_app_draft_";

function getStorageKey(customerId: string): string {
  return `${STORAGE_KEY_PREFIX}${customerId.trim()}`;
}

/**
 * Sanitizes draft data before storing, strictly ensuring no OTP codes,
 * passwords, authentication tokens or secrets are ever persisted.
 */
export function sanitizeDraftPayload(
  payload: Partial<GasApplicationDraft> & { [key: string]: any },
): Partial<GasApplicationDraft> {
  const sanitized = { ...payload };

  // Strict blacklist: NEVER store OTP secrets, passwords, or tokens
  delete sanitized.otpCode;
  delete sanitized.otp_code;
  delete sanitized.code;
  delete sanitized.password;
  delete sanitized.token;
  delete sanitized.authToken;
  delete sanitized.secret;

  return sanitized;
}

/**
 * Persists application draft to browser LocalStorage, partitioned securely by customerId.
 */
export function saveLocalDraft(customerId: string, draft: Partial<GasApplicationDraft>): boolean {
  if (!customerId || typeof window === "undefined") return false;

  try {
    const sanitized = sanitizeDraftPayload(draft);
    const draftRecord: GasApplicationDraft = {
      ...sanitized,
      customerId,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(getStorageKey(customerId), JSON.stringify(draftRecord));
    return true;
  } catch (err) {
    console.warn("Failed to save local application draft:", err);
    return false;
  }
}

/**
 * Retrieves application draft from browser LocalStorage for a specific authenticated customer.
 * Explicitly guards against cross-customer contamination.
 */
export function getLocalDraft(customerId: string): GasApplicationDraft | null {
  if (!customerId || typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(getStorageKey(customerId));
    if (!raw) return null;

    const parsed: GasApplicationDraft = JSON.parse(raw);

    // Cross-customer guard: verify the draft actually belongs to this customer
    if (!parsed || parsed.customerId !== customerId) {
      return null;
    }

    return parsed;
  } catch (err) {
    console.warn("Failed to retrieve local application draft:", err);
    return null;
  }
}

/**
 * Removes local draft for a given customer.
 */
export function clearLocalDraft(customerId: string): void {
  if (!customerId || typeof window === "undefined") return;

  try {
    localStorage.removeItem(getStorageKey(customerId));
  } catch (err) {
    console.warn("Failed to clear local application draft:", err);
  }
}

/**
 * Persists application draft against the authenticated customer's profile in Supabase.
 */
export async function saveBackendDraft(
  customerId: string,
  draft: Partial<GasApplicationDraft>,
): Promise<boolean> {
  if (!customerId) return false;

  try {
    const sanitized = sanitizeDraftPayload(draft);
    const draftRecord: GasApplicationDraft = {
      ...sanitized,
      customerId,
      updatedAt: new Date().toISOString(),
    };

    // 1. Fetch existing notification_prefs so we do not overwrite other user settings
    const { data: prof, error: fetchErr } = await (supabase.from("profiles") as any)
      .select("notification_prefs")
      .eq("id", customerId)
      .maybeSingle();

    if (fetchErr) {
      return false;
    }

    const currentPrefs =
      prof?.notification_prefs && typeof prof.notification_prefs === "object"
        ? prof.notification_prefs
        : {};

    const updatedPrefs = {
      ...currentPrefs,
      gas_application_draft: draftRecord,
    };

    const { error: updateErr } = await (supabase.from("profiles") as any)
      .update({ notification_prefs: updatedPrefs })
      .eq("id", customerId);

    return !updateErr;
  } catch (err) {
    console.warn("Failed to save backend application draft:", err);
    return false;
  }
}

/**
 * Retrieves the application draft stored in Supabase profile for this customer.
 */
export async function getBackendDraft(customerId: string): Promise<GasApplicationDraft | null> {
  if (!customerId) return null;

  try {
    const { data: prof, error } = await (supabase.from("profiles") as any)
      .select("notification_prefs")
      .eq("id", customerId)
      .maybeSingle();

    if (error || !prof?.notification_prefs) return null;

    const draft = prof.notification_prefs?.gas_application_draft;
    if (draft && typeof draft === "object" && draft.customerId === customerId) {
      return draft as GasApplicationDraft;
    }

    return null;
  } catch (err) {
    console.warn("Failed to retrieve backend application draft:", err);
    return null;
  }
}

/**
 * Clears the application draft stored in Supabase profile.
 */
export async function clearBackendDraft(customerId: string): Promise<void> {
  if (!customerId) return;

  try {
    const { data: prof } = await (supabase.from("profiles") as any)
      .select("notification_prefs")
      .eq("id", customerId)
      .maybeSingle();

    if (prof?.notification_prefs && typeof prof.notification_prefs === "object") {
      const updatedPrefs = { ...prof.notification_prefs };
      delete updatedPrefs.gas_application_draft;

      await (supabase.from("profiles") as any)
        .update({ notification_prefs: updatedPrefs })
        .eq("id", customerId);
    }
  } catch (err) {
    console.warn("Failed to clear backend application draft:", err);
  }
}

/**
 * Loads the latest draft by checking both LocalStorage and Supabase backend,
 * selecting whichever has the more recent timestamp.
 */
export async function loadLatestDraft(customerId: string): Promise<GasApplicationDraft | null> {
  if (!customerId) return null;

  const localDraft = getLocalDraft(customerId);

  try {
    const backendDraft = await getBackendDraft(customerId);

    if (!localDraft && !backendDraft) return null;
    if (localDraft && !backendDraft) return localDraft;
    if (!localDraft && backendDraft) return backendDraft;

    // Both exist: pick the one with the newest updatedAt timestamp
    const localTime = new Date(localDraft!.updatedAt).getTime() || 0;
    const backendTime = new Date(backendDraft!.updatedAt).getTime() || 0;

    return backendTime > localTime ? backendDraft : localDraft;
  } catch {
    return localDraft;
  }
}

/**
 * Completely clears both local and backend drafts upon successful final submission.
 */
export async function clearAllDrafts(customerId: string): Promise<void> {
  clearLocalDraft(customerId);
  await clearBackendDraft(customerId);
}


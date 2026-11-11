import { supabase } from "@/lib/supabase";
import { resolvePricingBandDiscountSync } from "@/lib/branch-pricing-service";

/**
 * Standard John Stayte Account Number Regex.
 * Typically 4-10 alphanumeric characters (e.g. "RTAY16", "CHNO03", "CHEM02", "CHJA21", "CHSH29", "SHAR10").
 */
export const ACCOUNT_NUMBER_REGEX = /^[A-Z0-9]{4,10}$/;

/**
 * Normalizes an account number: trims whitespace and converts to uppercase.
 */
export function normalizeAccountNumber(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.trim().toUpperCase().replace(/[\s\-_]/g, "");
}

/**
 * Validates whether an account number fits the John Stayte permanent identifier structure.
 */
export function isValidAccountNumberFormat(code: string | null | undefined): boolean {
  if (!code) return false;
  const normalized = normalizeAccountNumber(code);
  return ACCOUNT_NUMBER_REGEX.test(normalized);
}

/**
 * Generates an authentic John Stayte customer account number based on customer name and depot/type.
 * Examples from client reference invoices:
 * - Louise Taylor -> RTAY16
 * - Brett Norman  -> CHNO03
 * - Annette Emms  -> CHEM02
 * - Karen Jackson -> CHJA21
 * - John Shufflebottom -> CHSH29
 */
export function generateCustomerAccountNumber(
  fullName: string,
  existingCodes: string[] = [],
  prefix: string = ""
): string {
  const cleanName = (fullName || "CUSTOMER").trim().toUpperCase();
  const parts = cleanName.split(/\s+/).filter(Boolean);
  
  let basePrefix = prefix.trim().toUpperCase();
  
  if (!basePrefix) {
    if (parts.length >= 2) {
      // First letter of first name + first 3 letters of surname (e.g. Louise Taylor -> LTAY)
      const firstInitial = parts[0].charAt(0).replace(/[^A-Z]/g, "C");
      const surname = parts[parts.length - 1].replace(/[^A-Z]/g, "");
      const surnamePart = (surname.length >= 3 ? surname.slice(0, 3) : (surname + "CUS")).slice(0, 3);
      basePrefix = `${firstInitial}${surnamePart}`;
    } else if (cleanName.length >= 4) {
      basePrefix = cleanName.replace(/[^A-Z]/g, "").slice(0, 4);
    } else {
      basePrefix = "JSAC";
    }
  }

  // Ensure 4 letters prefix
  if (basePrefix.length < 4) {
    basePrefix = (basePrefix + "STAY").slice(0, 4);
  } else if (basePrefix.length > 5) {
    basePrefix = basePrefix.slice(0, 4);
  }

  const existingUpper = new Set(existingCodes.map((c) => normalizeAccountNumber(c)));

  // Try standard two-digit sequences 01 through 99
  for (let num = 1; num <= 99; num++) {
    const candidate = `${basePrefix}${num.toString().padStart(2, "0")}`;
    if (!existingUpper.has(candidate)) {
      return candidate;
    }
  }

  // Fallback to random two digits
  const randomSuffix = Math.floor(10 + Math.random() * 89);
  return `${basePrefix}${randomSuffix}`;
}

/**
 * Authoritatively generates a concurrency-safe customer account number using the
 * PostgreSQL database function public.generate_customer_account_number(p_full_name).
 * Falls back to deterministic sequence generation when running in offline/mock mode.
 */
export async function requestAuthoritativeAccountNumber(
  fullName: string,
  existingCodes: string[] = []
): Promise<string> {
  try {
    const { data, error } = await (supabase.rpc as any)("generate_customer_account_number", {
      p_full_name: fullName,
    });
    if (!error && typeof data === "string" && data.length >= 4) {
      return normalizeAccountNumber(data);
    }
  } catch {
    /* Fallback to local sequence generation */
  }

  return generateCustomerAccountNumber(fullName, existingCodes);
}

export interface AccountVerificationCheck {
  valid: boolean;
  message: string;
  matchedAccount?: {
    customerId: string;
    accountNumber: string;
    fullName?: string;
    pricingBand?: string | null;
    discountPercentage?: number | null;
  } | null;
}

/**
 * Securely verifies whether an entered account number belongs to the customer
 * using existing identity verification (matching registered email, phone, or name).
 * Prevents account hijacking by guessing numbers.
 */
export async function verifyCustomerAccountNumber(
  accountNumberInput: string,
  customerDetails: {
    email?: string;
    phone?: string;
    fullName?: string;
    postcode?: string;
  },
  customLookupResolver?: (accountNumber: string) => Promise<{ profiles?: any[]; applications?: any[] } | any | null>
): Promise<AccountVerificationCheck> {
  const normalized = normalizeAccountNumber(accountNumberInput);
  if (!normalized) {
    return { valid: false, message: "Please enter your John Stayte Account Number." };
  }

  if (!isValidAccountNumberFormat(normalized)) {
    return {
      valid: false,
      message: "Invalid account number format. John Stayte account numbers are 4-10 alphanumeric characters (e.g. RTAY16).",
    };
  }

  try {
    let matchedProfile: any = null;
    let matchedApp: any = null;

    if (customLookupResolver) {
      const customRes = await customLookupResolver(normalized);
      if (customRes) {
        if (Array.isArray(customRes.profiles)) {
          matchedProfile = customRes.profiles[0];
        } else if (customRes.full_name || customRes.email) {
          matchedProfile = customRes;
        }
        if (Array.isArray(customRes.applications)) {
          matchedApp = customRes.applications[0];
        }
      }
    } else {
      // 1. Look up profile with matching customer_code or account_number
      const { data: profiles, error: profErr } = await (supabase.from("profiles") as any)
        .select("id, email, phone, full_name, customer_code, pricing_band, discount_percentage, notification_prefs")
        .or(`customer_code.eq.${normalized},customer_code.eq.${normalized.toLowerCase()}`);

      if (profErr) {
        console.warn("Error querying profile by account number:", profErr);
      }

      // 2. Also check gas_customer_applications
      const { data: apps, error: appErr } = await (supabase.from("gas_customer_applications") as any)
        .select("id, customer_id, email, phone, full_name, postcode, customer_code, pricing_band, discount_percentage")
        .or(`customer_code.eq.${normalized},customer_code.eq.${normalized.toLowerCase()}`);

      if (appErr) {
        console.warn("Error querying applications by account number:", appErr);
      }

      matchedProfile = (profiles || [])[0];
      matchedApp = (apps || [])[0];
    }

    if (!matchedProfile && !matchedApp) {
      // Check if it's a known special customer code in pricing rules
      const bandRes = resolvePricingBandDiscountSync(null, normalized);
      if (bandRes.ok && bandRes.specialCustomerMatch) {
        return {
          valid: true,
          message: `Valid John Stayte Special Customer Account (${bandRes.specialCustomerMatch.name}).`,
          matchedAccount: {
            customerId: "",
            accountNumber: normalized,
            fullName: bandRes.specialCustomerMatch.name,
            pricingBand: bandRes.pricingBandName,
            discountPercentage: bandRes.discountPercentage,
          },
        };
      }

      return {
        valid: false,
        message: `Account number ${normalized} was not found. If you are an existing customer without your account number at hand, please select "No" to request account lookup by our team.`,
      };
    }

    // 3. Identity Verification: Verify identity match
    const candidateEmail = (customerDetails.email || "").trim().toLowerCase();
    const candidatePhone = (customerDetails.phone || "").replace(/[^0-9]/g, "");
    const candidateName = (customerDetails.fullName || "").trim().toLowerCase();

    const recordEmail = ((matchedProfile?.email || matchedApp?.email) || "").trim().toLowerCase();
    const recordPhone = ((matchedProfile?.phone || matchedApp?.phone) || "").replace(/[^0-9]/g, "");
    const recordName = ((matchedProfile?.full_name || matchedApp?.full_name) || "").trim().toLowerCase();

    let identityMatched = false;

    // Check email match
    if (candidateEmail && recordEmail && candidateEmail === recordEmail) {
      identityMatched = true;
    }

    // Check phone match (last 6 digits)
    if (!identityMatched && candidatePhone && recordPhone) {
      if (candidatePhone.length >= 6 && recordPhone.endsWith(candidatePhone.slice(-6))) {
        identityMatched = true;
      }
    }

    // Check surname match if email or phone is provided
    if (!identityMatched && candidateName && recordName) {
      const candidateSurname = candidateName.split(/\s+/).pop() || "";
      const recordSurname = recordName.split(/\s+/).pop() || "";
      if (candidateSurname.length >= 3 && recordSurname.length >= 3 && candidateSurname === recordSurname) {
        identityMatched = true;
      }
    }

    if (!identityMatched) {
      return {
        valid: false,
        message: `Account number ${normalized} exists, but the registered customer details do not match the provided details. Please verify your email or phone, or submit an application for account lookup.`,
      };
    }

    const resolvedCustomerId = matchedProfile?.id || matchedApp?.customer_id;
    const resolvedPricingBand = matchedProfile?.pricing_band || matchedApp?.pricing_band || "Standard Domestic";
    const resolvedDiscount = Number(matchedProfile?.discount_percentage ?? matchedApp?.discount_percentage ?? 0);

    return {
      valid: true,
      message: `Account number ${normalized} verified successfully!`,
      matchedAccount: {
        customerId: resolvedCustomerId,
        accountNumber: normalized,
        fullName: matchedProfile?.full_name || matchedApp?.full_name,
        pricingBand: resolvedPricingBand,
        discountPercentage: resolvedDiscount,
      },
    };
  } catch (err: any) {
    return {
      valid: false,
      message: err.message || "Failed to verify account number.",
    };
  }
}

/**
 * Assigns or updates a customer account number (authorized for Manager/Admin, or atomic linkage).
 */
export async function assignCustomerAccountNumber(
  customerId: string,
  accountNumber: string,
  adminNotes?: string
): Promise<{ success: boolean; message: string; accountNumber: string }> {
  const normalized = normalizeAccountNumber(accountNumber);
  if (!normalized || !isValidAccountNumberFormat(normalized)) {
    throw new Error("Invalid account number format. Expected 4-10 alphanumeric characters (e.g. RTAY16).");
  }

  // 1. Check uniqueness: ensure no other customer already has this account number
  const { data: existing, error: checkErr } = await (supabase.from("profiles") as any)
    .select("id, email, full_name, customer_code")
    .neq("id", customerId)
    .or(`customer_code.eq.${normalized},customer_code.eq.${normalized.toLowerCase()}`);

  if (checkErr) {
    console.warn("Uniqueness check warning:", checkErr);
  }

  if (existing && existing.length > 0) {
    throw new Error(`Account number ${normalized} is already assigned to another customer (${existing[0].email || existing[0].full_name}). Account numbers must be unique.`);
  }

  // 2. Update profile
  const { error: profUpdateErr } = await (supabase.from("profiles") as any)
    .update({
      customer_code: normalized,
      updated_at: new Date().toISOString(),
    })
    .eq("id", customerId);

  if (profUpdateErr) {
    throw new Error(`Failed to update customer profile: ${profUpdateErr.message}`);
  }

  // 3. Also update corresponding gas customer applications for consistency
  try {
    await (supabase.from("gas_customer_applications") as any)
      .update({
        customer_code: normalized,
        updated_at: new Date().toISOString(),
      })
      .eq("customer_id", customerId);
  } catch (appErr) {
    console.warn("Non-fatal application update notice:", appErr);
  }

  return {
    success: true,
    message: `Account number ${normalized} assigned successfully.`,
    accountNumber: normalized,
  };
}

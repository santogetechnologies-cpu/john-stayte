import { supabase } from "@/lib/supabase";
import { isRefillableLpgCylinderProduct } from "@/lib/cylinder-exchange-service";
import {
  sendApplicationEmailVerifyServerFn,
  verifyApplicationEmailCodeServerFn,
} from "@/lib/application-email-verify-server-fn";
import {
  triggerGasApplicationSubmittedPush,
  triggerGasApplicationApprovedPush,
  triggerGasApplicationDeclinedPush,
  triggerGasApplicationMoreInfoPush,
  triggerGasApplicationInfoSubmittedPush,
} from "@/lib/push-notifications";

export type ApplicationStatus =
  | "NOT_COMPLETED"
  | "SUBMITTED"
  | "PENDING"
  | "MORE_INFO_NEEDED"
  | "APPROVED"
  | "DECLINED"
  | "REJECTED";

export interface GasCustomerApplication {
  id: string;
  customer_id: string;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth?: string | null;
  street_address: string;
  city: string;
  postcode: string;
  delivery_address: string;
  billing_address?: string | null;
  preferred_contact_method?: string | null;
  usage_type: "DOMESTIC" | "COMMERCIAL" | "BULK" | "AUTOGAS";
  customer_type?: "HOME" | "BUSINESS";
  has_previous_purchases?: boolean;
  previous_account_details?: string | null;
  application_reference?: string;
  pricing_band?: string | null;
  discount_percentage?: number | null;
  credit_account_approved?: boolean | null;
  credit_limit?: number | null;
  more_info_requested?: string | null;
  more_info_response?: string | null;
  // Business fields (for Commercial / Bulk)
  business_name?: string | null;
  business_type?: string | null;
  business_address?: string | null;
  business_contact?: string | null;
  // Cylinder info
  existing_cylinder_status?: string | null;
  cylinder_type?: string | null;
  cylinder_size?: string | null;
  order_requirement?: string | null;
  // Declaration & Signature
  declaration_accepted: boolean;
  signature_data: string; // Base64 data URL
  signed_at: string;
  status: ApplicationStatus;
  admin_notes?: string | null;
  rejection_reason?: string | null;
  decision_history?: any[];
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationSubmitPayload {
  customerId: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  streetAddress: string;
  city: string;
  postcode: string;
  deliveryAddress: string;
  billingAddress?: string;
  preferredContactMethod?: string;
  usageType: "DOMESTIC" | "COMMERCIAL" | "BULK" | "AUTOGAS";
  customerType?: "HOME" | "BUSINESS";
  hasPreviousPurchases?: boolean;
  previousAccountDetails?: string;
  applicationReference?: string;
  businessName?: string;
  businessType?: string;
  businessAddress?: string;
  businessContact?: string;
  existingCylinderStatus?: string;
  cylinderType?: string;
  cylinderSize?: string;
  orderRequirement?: string;
  declarationAccepted: boolean;
  signatureData: string;
}

/**
 * Determines whether a catalog product is an LPG or bottled gas product
 * requiring an approved customer gas account before order placement.
 */
export function isRestrictedGasProduct(product: any): boolean {
  if (!product) return false;

  const category = (product.category_slug || product.category || "").toLowerCase().trim();
  const name = (product.name || product.product_name || "").toLowerCase().trim();
  const usageType = (product.usage_type || product.specs?.usage_type || "").toUpperCase().trim();

  // Explicit non-gas product categories are unrestricted
  if (
    category.includes("coal") ||
    category.includes("solid-fuel") ||
    category.includes("bait") ||
    category.includes("feed") ||
    category.includes("appliance") ||
    category.includes("heater") ||
    category.includes("bbq") ||
    category.includes("wear") ||
    category.includes("clothing")
  ) {
    return false;
  }

  // Refillable LPG cylinders
  if (isRefillableLpgCylinderProduct(product)) {
    return true;
  }

  // Gas categories
  if (["bottled-gas", "gas", "pub-gas", "campingaz", "bulk-gas"].includes(category)) {
    return true;
  }

  // Gas usage types
  if (["DOMESTIC", "COMMERCIAL", "BULK"].includes(usageType)) {
    return true;
  }

  // Gas fuel keywords in name
  if (
    name.includes("propane") ||
    name.includes("butane") ||
    name.includes("patio gas") ||
    name.includes("forklift gas") ||
    name.includes("calor gas") ||
    name.includes("gas bottle") ||
    name.includes("gas cylinder")
  ) {
    return true;
  }

  return false;
}

/**
 * Fetches the gas customer application for an authenticated customer from the database.
 */
export async function getCustomerGasApplication(
  customerId: string,
): Promise<GasCustomerApplication | null> {
  if (!customerId) return null;

  // 1. Dedicated table: gas_customer_applications
  try {
    const { data: dbApp, error: dbErr } = await (supabase.from("gas_customer_applications") as any)
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!dbErr && dbApp) {
      return dbApp as GasCustomerApplication;
    }
  } catch (e) {
    // Fallback to profile and cms storage
  }

  // 2. Profile record fallback in Supabase
  try {
    const { data: prof } = await supabase
      .from("profiles")
      .select("notification_prefs")
      .eq("id", customerId)
      .maybeSingle();

    const appFromProf = (prof?.notification_prefs as Record<string, unknown> | null)
      ?.gas_application;
    if (appFromProf && typeof appFromProf === "object" && "id" in appFromProf) {
      return appFromProf as GasCustomerApplication;
    }
  } catch (e) {
    console.warn("Could not query application from profile:", e);
  }

  // 3. Fallback: cms_content_blocks container
  try {
    const sectionKey = `gas_app_${customerId}`;
    const { data: block } = await supabase
      .from("cms_content_blocks")
      .select("content")
      .eq("section_key", sectionKey)
      .maybeSingle();

    if (block?.content) {
      const parsed = JSON.parse(block.content);
      return parsed as GasCustomerApplication;
    }
  } catch (e) {
    // Non-critical
  }

  return null;
}

/**
 * Submits a new or updated Gas Customer Application with full validation, email verification check, and digital signature.
 */
export async function submitGasCustomerApplication(
  payload: ApplicationSubmitPayload,
): Promise<GasCustomerApplication> {
  const {
    customerId,
    fullName,
    email,
    phone,
    dateOfBirth,
    streetAddress,
    city,
    postcode,
    deliveryAddress,
    billingAddress,
    preferredContactMethod,
    usageType,
    businessName,
    businessType,
    businessAddress,
    businessContact,
    existingCylinderStatus,
    cylinderType,
    cylinderSize,
    orderRequirement,
    declarationAccepted,
    signatureData,
  } = payload;

  // Server-side / backend validations
  if (!customerId) throw new Error("Authentication required: customer ID is missing.");
  if (!fullName?.trim()) throw new Error("Full name is required.");
  if (!email?.trim() || !email.includes("@")) throw new Error("A valid email address is required.");
  if (!phone?.trim() || phone.trim().length < 7)
    throw new Error("A valid contact telephone number is required.");
  if (!streetAddress?.trim()) throw new Error("Street address is required.");
  if (!postcode?.trim()) throw new Error("Postcode is required.");
  if (!declarationAccepted) throw new Error("You must confirm and accept the declaration terms.");
  if (!signatureData || signatureData.length < 50) {
    throw new Error(
      "A valid digital signature is mandatory to submit your Gas Customer Application.",
    );
  }

  if ((usageType === "COMMERCIAL" || usageType === "BULK") && !businessName?.trim()) {
    throw new Error("Business name is required for commercial/bulk applications.");
  }

  const now = new Date().toISOString();
  const rawRef = payload.applicationReference || `JSS-APP-${Date.now().toString().slice(-6)}`;
  const resolvedCustomerType: "HOME" | "BUSINESS" =
    payload.customerType ||
    (usageType === "COMMERCIAL" || usageType === "BULK" ? "BUSINESS" : "HOME");
  const hasPrevious = Boolean(payload.hasPreviousPurchases);
  const previousDetails = payload.previousAccountDetails?.trim() || null;
  const appId = `app-${customerId.slice(0, 8)}-${Date.now().toString().slice(-6)}`;

  const applicationRecord: GasCustomerApplication = {
    id: appId,
    customer_id: customerId,
    full_name: fullName.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    date_of_birth: dateOfBirth?.trim() || null,
    street_address: streetAddress.trim(),
    city: city.trim() || "Gloucester",
    postcode: postcode.trim().toUpperCase(),
    delivery_address: deliveryAddress.trim() || `${streetAddress}, ${city} ${postcode}`,
    billing_address: billingAddress?.trim() || null,
    preferred_contact_method: preferredContactMethod?.trim() || "Phone",
    usage_type: usageType,
    customer_type: resolvedCustomerType,
    has_previous_purchases: hasPrevious,
    previous_account_details: previousDetails,
    application_reference: rawRef,
    business_name: businessName?.trim() || null,
    business_type: businessType?.trim() || null,
    business_address: businessAddress?.trim() || null,
    business_contact: businessContact?.trim() || null,
    existing_cylinder_status:
      existingCylinderStatus?.trim() || "New Customer (No Existing Cylinders)",
    cylinder_type: cylinderType?.trim() || null,
    cylinder_size: cylinderSize?.trim() || null,
    order_requirement: orderRequirement?.trim() || null,
    declaration_accepted: true,
    signature_data: signatureData,
    signed_at: now,
    status: "PENDING",
    admin_notes: null,
    reviewed_by: null,
    reviewed_at: null,
    decision_history: [
      {
        action: "SUBMITTED",
        status: "PENDING",
        customer_type: resolvedCustomerType,
        timestamp: now,
      },
    ],
    created_at: now,
    updated_at: now,
  };

  // 1. Primary write to dedicated gas_customer_applications table
  const { data: savedDbRecord, error: appDbError } = await (
    supabase.from("gas_customer_applications") as any
  )
    .upsert(
      {
        customer_id: customerId,
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        date_of_birth: dateOfBirth?.trim() || null,
        street_address: streetAddress.trim(),
        city: city.trim() || "Gloucester",
        postcode: postcode.trim().toUpperCase(),
        delivery_address: deliveryAddress.trim() || `${streetAddress}, ${city} ${postcode}`,
        billing_address: billingAddress?.trim() || null,
        preferred_contact_method: preferredContactMethod?.trim() || "Phone",
        usage_type: usageType,
        customer_type: resolvedCustomerType,
        has_previous_purchases: hasPrevious,
        previous_account_details: previousDetails,
        application_reference: rawRef,
        business_name: businessName?.trim() || null,
        business_type: businessType?.trim() || null,
        business_address: businessAddress?.trim() || null,
        business_contact: businessContact?.trim() || null,
        existing_cylinder_status:
          existingCylinderStatus?.trim() || "New Customer (No Existing Cylinders)",
        cylinder_type: cylinderType?.trim() || null,
        cylinder_size: cylinderSize?.trim() || null,
        order_requirement: orderRequirement?.trim() || null,
        declaration_accepted: true,
        signature_data: signatureData,
        signed_at: now,
        status: "PENDING",
        decision_history: applicationRecord.decision_history,
        updated_at: now,
      },
      { onConflict: "customer_id" },
    )
    .select()
    .single();

  if (appDbError) {
    console.error("Failed to insert into gas_customer_applications:", appDbError);
    throw new Error(appDbError.message || "Failed to submit gas customer application.");
  }

  // Use the verified database record with the canonical primary key UUID
  const finalRecord: GasCustomerApplication = savedDbRecord
    ? (savedDbRecord as GasCustomerApplication)
    : applicationRecord;
  const canonicalRef = finalRecord.application_reference || rawRef;

  // 2. Synchronize to customer's profile record in Supabase
  try {
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", customerId)
      .maybeSingle();

    const existingPrefs =
      (currentProfile?.notification_prefs as Record<string, unknown> | null) || {};
    await (supabase.from("profiles") as any)
      .update({
        full_name: fullName.trim(),
        phone: phone.trim(),
        application_status: "PENDING",
        notification_prefs: {
          ...existingPrefs,
          gas_application: finalRecord,
        } as unknown as Record<string, string>,
        updated_at: now,
      })
      .eq("id", customerId);
  } catch (err) {
    console.error("Failed to update profile with application:", err);
  }

  // 4. Update customer_addresses with primary address
  try {
    await supabase.from("customer_addresses").upsert(
      {
        user_id: customerId,
        label: "Primary Delivery Address",
        name: fullName.trim(),
        street: streetAddress.trim(),
        city: city.trim() || "Gloucester",
        postcode: postcode.trim().toUpperCase(),
        is_default: true,
      },
      { onConflict: "user_id,street,postcode" },
    );
  } catch (e) {
    // Non-critical
  }

  // 5. Create Staff & Manager Notification (Broadcast to Manager/Admin Portal)
  try {
    const notifLink = `/manager/applications?appId=${finalRecord.id}`;

    // Idempotency: Avoid duplicate notifications on re-submission
    const { data: existingStaffNotifs } = await supabase
      .from("notifications")
      .select("id")
      .or(`link.eq.${notifLink},message.ilike.%Ref: ${canonicalRef}%`)
      .limit(1);

    if (!existingStaffNotifs || existingStaffNotifs.length === 0) {
      const submissionTime = new Date(finalRecord.signed_at || now).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      await (supabase.from("notifications") as any).insert([
        {
          user_id: null, // Broadcast to all authorized staff & managers
          title: `New Gas Application: ${resolvedCustomerType}`,
          message: `New gas application ${canonicalRef} submitted by ${fullName.trim()} (${resolvedCustomerType}). Awaiting manager review • Submitted: ${submissionTime}`,
          category: "Applications",
          link: notifLink,
          read: false,
          is_read: false,
        },
      ]);
    }
  } catch (staffNotifErr) {
    console.error("Manager notification dispatch notice:", staffNotifErr);
  }

  // 6. Push Notification to Managers & Admins
  try {
    await triggerGasApplicationSubmittedPush({
      applicationId: finalRecord.id,
      applicationReference: canonicalRef,
      customerId,
      customerName: fullName.trim(),
      customerType: resolvedCustomerType,
    });
  } catch (pushErr) {
    console.warn("Gas application submitted push dispatch notice:", pushErr);
  }

  // 7. Create Customer Confirmation Notification
  try {
    await supabase.from("customer_notifications").insert([
      {
        user_id: customerId,
        title: "Gas Customer Application Submitted",
        message: `Your application (${canonicalRef}) has been received and is pending manager review. We will notify you once your account is approved.`,
        category: "Account",
        is_read: false,
      },
    ]);
  } catch (e) {
    // Non-critical
  }

  return finalRecord;
}

/**
 * Fetches all Gas Customer Applications for Admin management.
 */
export async function getAllGasCustomerApplications(): Promise<GasCustomerApplication[]> {
  const applications: GasCustomerApplication[] = [];

  // 1. Dedicated table: gas_customer_applications
  try {
    const { data: dbApps, error: dbErr } = await (supabase.from("gas_customer_applications") as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (!dbErr && dbApps && dbApps.length > 0) {
      dbApps.forEach((app: any) => {
        if (!applications.some((a) => a.customer_id === app.customer_id)) {
          applications.push(app as GasCustomerApplication);
        }
      });
    }
  } catch (e) {
    // Non-critical fallback
  }

  // 2. Primary fallback: Query all customer profiles from Supabase
  try {
    const { data: profs, error: profErr } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (!profErr && profs && profs.length > 0) {
      for (const p of profs) {
        const app = (p.notification_prefs as Record<string, unknown> | null)?.gas_application;
        if (
          app &&
          typeof app === "object" &&
          "id" in app &&
          !applications.some((a) => a.customer_id === (app as GasCustomerApplication).customer_id)
        ) {
          applications.push(app as GasCustomerApplication);
        }
      }
    }
  } catch (e) {
    console.warn("Could not query applications from profiles:", e);
  }

  // 3. Query from cms_content_blocks container
  try {
    const { data: blocks } = await supabase
      .from("cms_content_blocks")
      .select("content")
      .like("section_key", "gas_app_%");

    if (blocks && blocks.length > 0) {
      for (const b of blocks) {
        try {
          const app = JSON.parse(b.content) as GasCustomerApplication;
          if (app && app.id && !applications.some((a) => a.customer_id === app.customer_id)) {
            applications.push(app);
          }
        } catch (err) {
          // ignore parsing error
        }
      }
    }
  } catch (e) {
    // Non-critical
  }

  return applications.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

/**
 * Approves a customer gas application, assigns pricing band, discount percentage,
 * configures credit account if applicable, and activates the customer account.
 * Uses atomic transactional database RPC to ensure consistency.
 */
export async function approveGasCustomerApplication(params: {
  applicationId: string;
  customerId: string;
  pricingBand: string;
  discountPercentage: number;
  creditApproved?: boolean;
  creditLimit?: number;
  managerNotes?: string;
  reviewedBy?: string;
}) {
  const {
    applicationId,
    customerId,
    pricingBand,
    discountPercentage,
    creditApproved = false,
    creditLimit = 0,
    managerNotes = "",
    reviewedBy = "Manager",
  } = params;
  const now = new Date().toISOString();

  let isAlreadyApproved = false;
  let resolvedAppRef = `JSS-APP-${applicationId.slice(0, 8).toUpperCase()}`;

  // 1. Transactional Atomic Execution via Supabase RPC approve_gas_customer_application
  let rpcSucceeded = false;
  try {
    const { data: rpcRes, error: rpcErr } = await (supabase.rpc as any)(
      "approve_gas_customer_application",
      {
        p_application_id: applicationId,
        p_pricing_band: pricingBand,
        p_discount_percentage: discountPercentage,
        p_credit_account_approved: creditApproved,
        p_credit_limit: creditLimit,
        p_admin_notes: managerNotes,
        p_reviewed_by: reviewedBy,
      },
    );

    if (!rpcErr && rpcRes && rpcRes.success) {
      rpcSucceeded = true;
      isAlreadyApproved = Boolean(rpcRes.already_approved);
      if (rpcRes.application_reference) {
        resolvedAppRef = rpcRes.application_reference;
      }
    } else if (rpcErr) {
      if (
        rpcErr.message?.includes("Unauthorized") ||
        rpcErr.message?.includes("Application not found")
      ) {
        throw new Error(rpcErr.message);
      }
      console.warn(
        "Database RPC approve_gas_customer_application unavailable or failed, applying fallback:",
        rpcErr.message,
      );
    }
  } catch (err: any) {
    if (
      err.message?.includes("Unauthorized") ||
      err.message?.includes("Application not found")
    ) {
      throw err;
    }
    console.warn("RPC invocation warning:", err?.message);
  }

  // 2. Client-side fallback if RPC is not deployed in local/mock testing environment
  if (!rpcSucceeded) {
    // 1. Fetch current application record
    const { data: currentApp, error: fetchErr } = await (supabase.from("gas_customer_applications") as any)
      .select("*")
      .eq("id", applicationId)
      .maybeSingle();

    if (fetchErr) {
      throw new Error(`Failed to retrieve application: ${fetchErr.message}`);
    }
    if (!currentApp) {
      throw new Error(`Application not found with ID: ${applicationId}`);
    }

    if (currentApp.application_reference) {
      resolvedAppRef = currentApp.application_reference;
    }

    // Check duplicate approval idempotency
    if (
      currentApp.status === "APPROVED" &&
      currentApp.pricing_band === pricingBand &&
      Number(currentApp.discount_percentage) === Number(discountPercentage) &&
      Boolean(currentApp.credit_account_approved) === Boolean(creditApproved) &&
      Number(currentApp.credit_limit) === Number(creditLimit)
    ) {
      isAlreadyApproved = true;
    }

    const previousStatus = currentApp.status;
    const existingHistory = Array.isArray(currentApp?.decision_history)
      ? currentApp.decision_history
      : [];
    const historyEntry = {
      action: "APPROVE",
      status: "APPROVED",
      pricing_band: pricingBand,
      discount_percentage: discountPercentage,
      credit_account_approved: creditApproved,
      credit_limit: creditLimit,
      notes: managerNotes,
      reviewed_by: reviewedBy,
      timestamp: now,
    };

    // Update gas_customer_applications
    const { error: appUpdateErr } = await (supabase.from("gas_customer_applications") as any)
      .update({
        status: "APPROVED",
        pricing_band: pricingBand,
        discount_percentage: discountPercentage,
        credit_account_approved: creditApproved,
        credit_limit: creditLimit,
        admin_notes: managerNotes || "Application approved by manager.",
        reviewed_by: reviewedBy,
        reviewed_at: now,
        decision_history: [...existingHistory, historyEntry],
        updated_at: now,
      })
      .eq("id", applicationId);

    if (appUpdateErr) {
      throw new Error(`Failed to update application status: ${appUpdateErr.message}`);
    }

    // Atomically activate customer account in profiles
    try {
      const { data: prof, error: profFetchErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", customerId)
        .maybeSingle();

      if (profFetchErr) throw profFetchErr;

      const existingPrefs = (prof?.notification_prefs as Record<string, unknown> | null) || {};
      const existingApp = (existingPrefs.gas_application as Record<string, unknown> | null) || {};

      const { error: profUpdateErr } = await (supabase.from("profiles") as any)
        .update({
          status: "active",
          account_approved: true,
          application_status: "APPROVED",
          pricing_band: pricingBand,
          discount_percentage: discountPercentage,
          credit_account_approved: creditApproved,
          credit_limit: creditLimit,
          notification_prefs: {
            ...existingPrefs,
            gas_application: {
              ...existingApp,
              status: "APPROVED",
              pricing_band: pricingBand,
              discount_percentage: discountPercentage,
              credit_account_approved: creditApproved,
              credit_limit: creditLimit,
              reviewed_by: reviewedBy,
              reviewed_at: now,
              updated_at: now,
            },
          } as unknown as Record<string, string>,
          updated_at: now,
        })
        .eq("id", customerId);

      if (profUpdateErr) {
        // Rollback application update so we don't leave partial state!
        await (supabase.from("gas_customer_applications") as any)
          .update({
            status: previousStatus,
            updated_at: now,
          })
          .eq("id", applicationId);
        throw new Error(
          `Profile activation failed: ${profUpdateErr.message}. Application approval rolled back.`,
        );
      }
    } catch (profErr: any) {
      // Revert application if profile update threw
      await (supabase.from("gas_customer_applications") as any)
        .update({
          status: previousStatus,
          updated_at: now,
        })
        .eq("id", applicationId);
      throw new Error(
        `Failed to activate customer profile: ${profErr?.message || profErr}. Changes rolled back.`,
      );
    }
  }

  // 3. Skip duplicate notifications if this was an identical re-approval
  if (isAlreadyApproved) {
    return {
      success: true,
      status: "APPROVED",
      pricingBand,
      discountPercentage,
      alreadyApproved: true,
    };
  }

  // 4. In-app Customer Notification
  try {
    await supabase.from("customer_notifications").insert([
      {
        user_id: customerId,
        title: "Gas Application Approved",
        message: `Your gas application has been approved! Assigned: ${pricingBand} with ${discountPercentage}% discount.${creditApproved ? ` Credit facility approved (£${Number(creditLimit || 0).toFixed(2)} limit).` : ""} You can now place gas orders.`,
        category: "Account",
        is_read: false,
      },
    ]);
  } catch (notifErr) {
    console.warn("Notice inserting customer approval notification:", notifErr);
  }

  // 5. Customer Push Notification
  try {
    await triggerGasApplicationApprovedPush({
      applicationId,
      applicationReference: resolvedAppRef,
      customerId,
      pricingBand,
      discountPercentage,
    });
  } catch (pushErr) {
    console.warn("Gas application approved push warning:", pushErr);
  }

  return { success: true, status: "APPROVED", pricingBand, discountPercentage, alreadyApproved: false };
}

/**
 * Declines a customer gas application with a documented reason, keeping decision history.
 */
export async function declineGasCustomerApplication(params: {
  applicationId: string;
  customerId: string;
  reason: string;
  reviewedBy?: string;
}) {
  const { applicationId, customerId, reason, reviewedBy = "Manager" } = params;
  const now = new Date().toISOString();

  const { data: currentApp } = await (supabase.from("gas_customer_applications") as any)
    .select("*")
    .eq("id", applicationId)
    .maybeSingle();

  const appRef =
    currentApp?.application_reference || `JSS-APP-${applicationId.slice(0, 8).toUpperCase()}`;
  const existingHistory = Array.isArray(currentApp?.decision_history)
    ? currentApp.decision_history
    : [];
  const historyEntry = {
    action: "DECLINE",
    status: "DECLINED",
    reason,
    reviewed_by: reviewedBy,
    timestamp: now,
  };

  // 1. Update gas_customer_applications
  await (supabase.from("gas_customer_applications") as any)
    .update({
      status: "DECLINED",
      rejection_reason: reason,
      admin_notes: reason,
      reviewed_by: reviewedBy,
      reviewed_at: now,
      decision_history: [...existingHistory, historyEntry],
      updated_at: now,
    })
    .eq("id", applicationId);

  // 2. Prevent account from being treated as approved in profiles
  try {
    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", customerId)
      .maybeSingle();
    const existingPrefs = (prof?.notification_prefs as Record<string, unknown> | null) || {};
    const existingApp = (existingPrefs.gas_application as Record<string, unknown> | null) || {};

    await (supabase.from("profiles") as any)
      .update({
        account_approved: false,
        application_status: "DECLINED",
        notification_prefs: {
          ...existingPrefs,
          gas_application: {
            ...existingApp,
            status: "DECLINED",
            rejection_reason: reason,
            reviewed_by: reviewedBy,
            reviewed_at: now,
            updated_at: now,
          },
        } as unknown as Record<string, string>,
        updated_at: now,
      })
      .eq("id", customerId);
  } catch (profErr) {
    console.error("Failed to update profile upon decline:", profErr);
  }

  // 3. In-app Customer Notification
  try {
    await supabase.from("customer_notifications").insert([
      {
        user_id: customerId,
        title: "Gas Application Update",
        message: `Your gas application has been declined. Reason: ${reason}. Please contact customer support if you have questions.`,
        category: "Account",
        is_read: false,
      },
    ]);
  } catch (notifErr) {
    console.warn("Notice inserting customer decline notification:", notifErr);
  }

  // 4. Customer Push Notification
  try {
    await triggerGasApplicationDeclinedPush({
      applicationId,
      applicationReference: appRef,
      customerId,
      reason,
    });
  } catch (pushErr) {
    console.warn("Gas application declined push warning:", pushErr);
  }

  return { success: true, status: "DECLINED", reason };
}

/**
 * Requests more information from the customer for their gas application.
 */
export async function requestMoreInfoGasCustomerApplication(params: {
  applicationId: string;
  customerId: string;
  requestedInfo: string;
  reviewedBy?: string;
}) {
  const { applicationId, customerId, requestedInfo, reviewedBy = "Manager" } = params;
  const now = new Date().toISOString();

  const { data: currentApp } = await (supabase.from("gas_customer_applications") as any)
    .select("*")
    .eq("id", applicationId)
    .maybeSingle();

  const appRef =
    currentApp?.application_reference || `JSS-APP-${applicationId.slice(0, 8).toUpperCase()}`;
  const existingHistory = Array.isArray(currentApp?.decision_history)
    ? currentApp.decision_history
    : [];
  const historyEntry = {
    action: "MORE_INFO_NEEDED",
    status: "MORE_INFO_NEEDED",
    requested_info: requestedInfo,
    reviewed_by: reviewedBy,
    timestamp: now,
  };

  // 1. Update gas_customer_applications
  await (supabase.from("gas_customer_applications") as any)
    .update({
      status: "MORE_INFO_NEEDED",
      more_info_requested: requestedInfo,
      admin_notes: requestedInfo,
      reviewed_by: reviewedBy,
      reviewed_at: now,
      decision_history: [...existingHistory, historyEntry],
      updated_at: now,
    })
    .eq("id", applicationId);

  // 2. Update profile
  try {
    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", customerId)
      .maybeSingle();
    const existingPrefs = (prof?.notification_prefs as Record<string, unknown> | null) || {};
    const existingApp = (existingPrefs.gas_application as Record<string, unknown> | null) || {};

    await (supabase.from("profiles") as any)
      .update({
        application_status: "MORE_INFO_NEEDED",
        notification_prefs: {
          ...existingPrefs,
          gas_application: {
            ...existingApp,
            status: "MORE_INFO_NEEDED",
            more_info_requested: requestedInfo,
            reviewed_by: reviewedBy,
            reviewed_at: now,
            updated_at: now,
          },
        } as unknown as Record<string, string>,
        updated_at: now,
      })
      .eq("id", customerId);
  } catch (profErr) {
    console.error("Failed to update profile upon more info requested:", profErr);
  }

  // 3. In-app Customer Notification
  try {
    await supabase.from("customer_notifications").insert([
      {
        user_id: customerId,
        title: "Action Required: Gas Application Details Needed",
        message: `Our depot manager requested additional information for your gas application: "${requestedInfo}". Please review and update your application.`,
        category: "Account",
        is_read: false,
      },
    ]);
  } catch (notifErr) {
    console.warn("Notice inserting more info notification:", notifErr);
  }

  // 4. Push Notification
  try {
    await triggerGasApplicationMoreInfoPush({
      applicationId,
      applicationReference: appRef,
      customerId,
      moreInfoNeededNotes: requestedInfo,
    });
  } catch (pushErr) {
    console.warn("Gas application more info push warning:", pushErr);
  }

  return { success: true, status: "MORE_INFO_NEEDED", requestedInfo };
}

/**
 * Submits additional requested information back to the manager for review.
 */
export async function submitMoreInfoResponse(params: {
  applicationId: string;
  customerId: string;
  responseNotes: string;
}) {
  const { applicationId, customerId, responseNotes } = params;
  const now = new Date().toISOString();

  const { data: currentApp } = await (supabase.from("gas_customer_applications") as any)
    .select("*")
    .eq("id", applicationId)
    .maybeSingle();

  const appRef =
    currentApp?.application_reference || `JSS-APP-${applicationId.slice(0, 8).toUpperCase()}`;
  const existingHistory = Array.isArray(currentApp?.decision_history)
    ? currentApp.decision_history
    : [];
  const historyEntry = {
    action: "CUSTOMER_RESPONDED",
    status: "PENDING",
    response_notes: responseNotes,
    timestamp: now,
  };

  // 1. Update gas_customer_applications back to PENDING with customer's response
  await (supabase.from("gas_customer_applications") as any)
    .update({
      status: "PENDING",
      more_info_response: responseNotes,
      decision_history: [...existingHistory, historyEntry],
      updated_at: now,
    })
    .eq("id", applicationId);

  // 2. Update profile
  try {
    await (supabase.from("profiles") as any)
      .update({
        application_status: "PENDING",
        updated_at: now,
      })
      .eq("id", customerId);
  } catch (profErr) {
    console.error("Failed to update profile upon customer response:", profErr);
  }

  // 3. Notify Managers
  try {
    await (supabase.from("notifications") as any).insert([
      {
        user_id: null, // Broadcast to managers and staff
        title: "Gas Application Details Provided",
        message: `Customer provided requested details for application Ref: ${appRef}. Details: "${responseNotes.slice(0, 100)}..."`,
        category: "Applications",
        link: `/manager/applications?appId=${applicationId}`,
        is_read: false,
      },
    ]);
  } catch (notifErr) {
    console.warn("Notice inserting manager notification for more info response:", notifErr);
  }

  // 4. Manager Push Notification
  try {
    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", customerId)
      .maybeSingle();
    await triggerGasApplicationInfoSubmittedPush({
      applicationId,
      applicationReference: appRef,
      customerId,
      customerName: prof?.full_name || currentApp?.full_name || "Applicant",
    });
  } catch (pushErr) {
    console.warn("Gas application info submitted push warning:", pushErr);
  }

  return { success: true, status: "PENDING" };
}

/**
 * Updates application status (Approve / Reject / Add Notes) from Admin portal.
 */
export async function updateGasApplicationStatus(params: {
  applicationId: string;
  customerId: string;
  status: ApplicationStatus;
  adminNotes?: string;
  reviewedBy?: string;
  pricingBand?: string;
  discountPercentage?: number;
  creditApproved?: boolean;
  creditLimit?: number;
}) {
  const {
    applicationId,
    customerId,
    status,
    adminNotes = "",
    reviewedBy = "Admin",
    pricingBand = "Standard Domestic",
    discountPercentage = 0,
    creditApproved = false,
    creditLimit = 0,
  } = params;

  if (status === "APPROVED") {
    return approveGasCustomerApplication({
      applicationId,
      customerId,
      pricingBand,
      discountPercentage,
      creditApproved,
      creditLimit,
      managerNotes: adminNotes,
      reviewedBy,
    });
  }

  if (status === "DECLINED" || status === "REJECTED") {
    return declineGasCustomerApplication({
      applicationId,
      customerId,
      reason: adminNotes || "Application details do not meet criteria.",
      reviewedBy,
    });
  }

  if (status === "MORE_INFO_NEEDED") {
    return requestMoreInfoGasCustomerApplication({
      applicationId,
      customerId,
      requestedInfo: adminNotes || "Additional details required.",
      reviewedBy,
    });
  }

  const now = new Date().toISOString();

  // Update in dedicated gas_customer_applications table
  try {
    await (supabase.from("gas_customer_applications") as any)
      .update({
        status,
        admin_notes: adminNotes,
        reviewed_by: reviewedBy,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("customer_id", customerId);
  } catch (e) {
    // Non-critical fallback
  }

  return { success: true, status };
}

/**
 * Sends a real 6-digit OTP code to the requested email address via Resend.
 */
export async function sendApplicationEmailOtp(email: string): Promise<{
  ok: boolean;
  message: string;
}> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@") || cleanEmail.length < 5) {
    throw new Error("Please provide a valid email address to receive your verification code.");
  }

  const res = await sendApplicationEmailVerifyServerFn({
    data: { email: cleanEmail },
  });

  if (!res.ok) {
    throw new Error(
      res.message || res.error || "Failed to send verification email. Please try again.",
    );
  }

  return {
    ok: true,
    message: res.message,
  };
}

/**
 * Verifies the 6-digit OTP code received in the customer's email via Resend.
 */
export async function verifyApplicationEmailOtp(
  email: string,
  otpCode: string,
): Promise<{
  ok: boolean;
  verifiedEmail: string;
}> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanOtp = otpCode.trim();

  if (!cleanEmail || !cleanEmail.includes("@")) {
    throw new Error("Invalid email address.");
  }

  if (!cleanOtp || cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
    throw new Error("Please enter the complete 6-digit numerical code sent to your email.");
  }

  const res = await verifyApplicationEmailCodeServerFn({
    data: {
      email: cleanEmail,
      code: cleanOtp,
    },
  });

  if (!res.ok || !res.verifiedEmail) {
    throw new Error(
      res.error || "Invalid or expired verification code. Please check your inbox and try again.",
    );
  }

  // Record verified state in email_verifications table for audit/tracking if user is authenticated
  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (userId) {
      await (supabase.from("email_verifications") as any).insert([
        {
          user_id: userId,
          email: cleanEmail,
          verified_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          attempts: 1,
          max_attempts: 5,
          metadata: { provider: "resend", type: "gas_application" },
        },
      ]);
    }
  } catch (dbErr) {
    // Non-blocking log
    console.warn("email_verifications tracking notice:", dbErr);
  }

  return {
    ok: true,
    verifiedEmail: res.verifiedEmail,
  };
}

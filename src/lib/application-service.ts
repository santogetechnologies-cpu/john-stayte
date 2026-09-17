import { supabase } from "@/lib/supabase";

export type ApplicationStatus = "NOT_COMPLETED" | "SUBMITTED" | "APPROVED" | "REJECTED";

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

  // Check real Supabase Auth Email Confirmation
  try {
    const { data: authData } = await supabase.auth.getUser();
    const authUser = authData?.user;
    if (authUser && !authUser.email_confirmed_at && !authUser.confirmed_at) {
      throw new Error(
        "Please verify your email address before submitting your Gas Customer Application. Check your inbox for the confirmation link.",
      );
    }
  } catch (authErr: any) {
    if (authErr.message?.includes("verify your email")) {
      throw authErr;
    }
  }

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
    status: "SUBMITTED",
    admin_notes: null,
    reviewed_by: null,
    reviewed_at: null,
    created_at: now,
    updated_at: now,
  };

  // 1. Primary write to dedicated gas_customer_applications table
  const { error: appDbError } = await (supabase.from("gas_customer_applications") as any).upsert(
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
      status: "SUBMITTED",
      updated_at: now,
    },
    { onConflict: "customer_id" },
  );

  if (appDbError) {
    console.error("Failed to insert into gas_customer_applications:", appDbError);
    throw new Error(appDbError.message || "Failed to submit gas customer application.");
  }

  // 2. Synchronize to customer's profile record in Supabase
  try {
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", customerId)
      .maybeSingle();

    const existingPrefs =
      (currentProfile?.notification_prefs as Record<string, unknown> | null) || {};
    await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        phone: phone.trim(),
        notification_prefs: {
          ...existingPrefs,
          gas_application: applicationRecord,
        } as unknown as Record<string, string>,
        updated_at: now,
      })
      .eq("id", customerId);
  } catch (err) {
    console.error("Failed to update profile with application:", err);
  }

  // 3. Persist in cms_content_blocks container if accessible
  try {
    const sectionKey = `gas_app_${customerId}`;
    await supabase.from("cms_content_blocks").upsert(
      {
        section_key: sectionKey,
        title: `Gas Application: ${fullName} (${usageType})`,
        content: JSON.stringify(applicationRecord),
        updated_at: now,
      },
      { onConflict: "section_key" },
    );
  } catch (e) {
    // Non-critical
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

  // 4. Create staff & customer notifications
  try {
    await supabase.from("notifications").insert([
      {
        user_id: customerId,
        title: `New Gas Customer Application: ${fullName}`,
        message: `${fullName} submitted a ${usageType} LPG customer application with digital signature.`,
        category: "Account",
        is_read: false,
      },
    ]);
  } catch (e) {
    // Non-critical
  }

  try {
    await supabase.from("customer_notifications").insert([
      {
        user_id: customerId,
        title: "Gas Customer Application Submitted",
        message:
          "Your gas customer application has been successfully registered. You may now proceed to order gas cylinders.",
        category: "Account",
        is_read: false,
      },
    ]);
  } catch (e) {
    // Non-critical
  }

  return applicationRecord;
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
 * Updates application status (Approve / Reject / Add Notes) from Admin portal.
 */
export async function updateGasApplicationStatus(params: {
  applicationId: string;
  customerId: string;
  status: ApplicationStatus;
  adminNotes?: string;
  reviewedBy?: string;
}) {
  const { customerId, status, adminNotes = "", reviewedBy = "Admin" } = params;
  const now = new Date().toISOString();

  // 1. Update in dedicated gas_customer_applications table
  try {
    await (supabase.from("gas_customer_applications") as any)
      .update({
        status,
        admin_notes: adminNotes,
        rejection_reason: status === "REJECTED" ? adminNotes : null,
        reviewed_by: reviewedBy,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("customer_id", customerId);
  } catch (e) {
    // Non-critical fallback
  }

  // 2. Update in customer's profile
  try {
    const { data: prof } = await supabase
      .from("profiles")
      .select("notification_prefs")
      .eq("id", customerId)
      .maybeSingle();

    if (prof) {
      const existingPrefs = (prof.notification_prefs as Record<string, unknown> | null) || {};
      const existingApp = (existingPrefs.gas_application as Record<string, unknown> | null) || {};
      const updatedApp = {
        ...existingApp,
        status,
        admin_notes: adminNotes,
        reviewed_by: reviewedBy,
        reviewed_at: now,
        updated_at: now,
      };

      await supabase
        .from("profiles")
        .update({
          notification_prefs: {
            ...existingPrefs,
            gas_application: updatedApp,
          } as unknown as Record<string, string>,
          updated_at: now,
        })
        .eq("id", customerId);
    }
  } catch (e) {
    console.error("Failed to update application in profile:", e);
  }

  // 3. Update in cms_content_blocks container
  try {
    const sectionKey = `gas_app_${customerId}`;
    const { data: existing } = await supabase
      .from("cms_content_blocks")
      .select("content")
      .eq("section_key", sectionKey)
      .maybeSingle();

    if (existing?.content) {
      try {
        const parsed = JSON.parse(existing.content);
        parsed.status = status;
        parsed.admin_notes = adminNotes;
        parsed.reviewed_by = reviewedBy;
        parsed.reviewed_at = now;
        parsed.updated_at = now;

        await supabase.from("cms_content_blocks").upsert({
          section_key: sectionKey,
          title: `Gas Application: ${parsed.full_name} (${parsed.usage_type})`,
          content: JSON.stringify(parsed),
          updated_at: now,
        });
      } catch (e) {
        // ignore
      }
    }
  } catch (e) {
    // Non-critical
  }

  // 3. Notify customer of status change
  try {
    const notifTitle =
      status === "APPROVED"
        ? "Gas Application Approved"
        : status === "REJECTED"
          ? "Gas Application Rejected"
          : "Gas Application Status Updated";

    const notifMessage =
      status === "APPROVED"
        ? "Your gas application has been approved. You can now place gas orders."
        : status === "REJECTED"
          ? adminNotes
            ? `Your gas application has been rejected. Reason: ${adminNotes}`
            : "Your gas application has been rejected. Please review and update your application details."
          : `Your gas customer application has been marked as ${status} by John Stayte Services.`;

    await supabase.from("customer_notifications").insert([
      {
        user_id: customerId,
        title: notifTitle,
        message: notifMessage,
        category: "Account",
        is_read: false,
      },
    ]);
  } catch (e) {
    // Non-critical
  }

  return { success: true, status };
}

/**
 * Sends a real 6-digit OTP code to the requested email address via Supabase Auth transactional email.
 */
export async function sendApplicationEmailOtp(email: string): Promise<{
  ok: boolean;
  message: string;
}> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@") || cleanEmail.length < 5) {
    throw new Error("Please provide a valid email address to receive your verification code.");
  }

  // 1. Dispatch real OTP email via Supabase Auth transactional SMTP
  const { error } = await supabase.auth.signInWithOtp({
    email: cleanEmail,
    options: {
      shouldCreateUser: true,
    },
  });

  if (error) {
    if (error.message?.toLowerCase().includes("rate") || (error as any).status === 429) {
      throw new Error(
        "Too many verification attempts. Please wait a moment before requesting another code.",
      );
    }
    throw new Error(error.message || "Failed to send verification email. Please try again.");
  }

  return {
    ok: true,
    message: `A 6-digit verification code has been sent to ${cleanEmail}. Please check your inbox.`,
  };
}

/**
 * Verifies the 6-digit OTP code received in the customer's email.
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
    throw new Error("Invalid or expired verification code. Please check your inbox and try again.");
  }

  // Record verified state in email_verifications table via secure RPC
  const { error: rpcError } = await (supabase.rpc as any)("record_verified_application_email", {
    p_email: cleanEmail,
  });

  if (rpcError) {
    console.error("Failed to record verified application email:", rpcError);
    throw new Error(rpcError.message || "Failed to record email verification.");
  }

  return {
    ok: true,
    verifiedEmail: cleanEmail,
  };
}


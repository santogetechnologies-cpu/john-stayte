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
  usage_type: "DOMESTIC" | "COMMERCIAL" | "BULK";
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
  usageType: "DOMESTIC" | "COMMERCIAL" | "BULK";
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
  customerId: string
): Promise<GasCustomerApplication | null> {
  if (!customerId) return null;

  try {
    // 1. Try fetching from gas_customer_applications table
    const { data, error } = await (supabase.from("gas_customer_applications" as any) as any)
      .select("*")
      .eq("customer_id", customerId)
      .maybeSingle();

    if (!error && data) {
      return {
        id: data.id,
        customer_id: data.customer_id,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        date_of_birth: data.date_of_birth || null,
        street_address: data.street_address,
        city: data.city,
        postcode: data.postcode,
        delivery_address: data.delivery_address || `${data.street_address}, ${data.city} ${data.postcode}`,
        billing_address: data.billing_address || null,
        preferred_contact_method: data.preferred_contact_method || null,
        usage_type: data.usage_type || "DOMESTIC",
        business_name: data.business_name || null,
        business_type: data.business_type || null,
        business_address: data.business_address || null,
        business_contact: data.business_contact || null,
        existing_cylinder_status: data.existing_cylinder_status || null,
        cylinder_type: data.cylinder_type || null,
        cylinder_size: data.cylinder_size || null,
        order_requirement: data.order_requirement || null,
        declaration_accepted: Boolean(data.declaration_accepted),
        signature_data: data.signature_data,
        signed_at: data.signed_at || data.created_at,
        status: (data.status as ApplicationStatus) || "SUBMITTED",
        admin_notes: data.admin_notes || null,
        reviewed_by: data.reviewed_by || null,
        reviewed_at: data.reviewed_at || null,
        created_at: data.created_at,
        updated_at: data.updated_at || data.created_at,
      };
    }
  } catch (e) {
    // Fallback query if table schema is pending
  }

  // 2. Fallback check from persistent cms_content_blocks container
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
    // No fallback found
  }

  return null;
}

/**
 * Submits a new or updated Gas Customer Application with full validation and digital signature.
 */
export async function submitGasCustomerApplication(
  payload: ApplicationSubmitPayload
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
  if (!phone?.trim() || phone.trim().length < 7) throw new Error("A valid contact telephone number is required.");
  if (!streetAddress?.trim()) throw new Error("Street address is required.");
  if (!postcode?.trim()) throw new Error("Postcode is required.");
  if (!declarationAccepted) throw new Error("You must confirm and accept the declaration terms.");
  if (!signatureData || signatureData.length < 50) {
    throw new Error("A valid digital signature is mandatory to submit your Gas Customer Application.");
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
    existing_cylinder_status: existingCylinderStatus?.trim() || "New Customer (No Cylinders)",
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

  // 1. Save to gas_customer_applications table if available
  try {
    await (supabase.from("gas_customer_applications" as any) as any).upsert(
      {
        id: appId,
        customer_id: customerId,
        full_name: applicationRecord.full_name,
        email: applicationRecord.email,
        phone: applicationRecord.phone,
        date_of_birth: applicationRecord.date_of_birth,
        street_address: applicationRecord.street_address,
        city: applicationRecord.city,
        postcode: applicationRecord.postcode,
        delivery_address: applicationRecord.delivery_address,
        billing_address: applicationRecord.billing_address,
        preferred_contact_method: applicationRecord.preferred_contact_method,
        usage_type: applicationRecord.usage_type,
        business_name: applicationRecord.business_name,
        business_type: applicationRecord.business_type,
        business_address: applicationRecord.business_address,
        business_contact: applicationRecord.business_contact,
        existing_cylinder_status: applicationRecord.existing_cylinder_status,
        cylinder_type: applicationRecord.cylinder_type,
        cylinder_size: applicationRecord.cylinder_size,
        order_requirement: applicationRecord.order_requirement,
        declaration_accepted: true,
        signature_data: applicationRecord.signature_data,
        signed_at: applicationRecord.signed_at,
        status: "SUBMITTED",
        updated_at: now,
      },
      { onConflict: "customer_id" }
    );
  } catch (e) {
    // If table not present yet, continue to persistent fallback block
  }

  // 2. Persist in cms_content_blocks for complete reliability
  const sectionKey = `gas_app_${customerId}`;
  await supabase.from("cms_content_blocks").upsert(
    {
      section_key: sectionKey,
      title: `Gas Application: ${fullName} (${usageType})`,
      content: JSON.stringify(applicationRecord),
      updated_at: now,
    },
    { onConflict: "section_key" }
  );

  // 3. Update customer_addresses with the primary address
  try {
    await (supabase.from("customer_addresses") as any).upsert(
      {
        user_id: customerId,
        label: "Primary Delivery Address",
        name: fullName.trim(),
        street: streetAddress.trim(),
        city: city.trim() || "Gloucester",
        postcode: postcode.trim().toUpperCase(),
        is_default: true,
      },
      { onConflict: "user_id,street,postcode" }
    );
  } catch (e) {
    // Non-critical
  }

  // 4. Create staff & customer notifications
  await (supabase.from("notifications") as any).insert([
    {
      title: `New Gas Customer Application: ${fullName}`,
      message: `${fullName} submitted a ${usageType} LPG customer application with digital signature.`,
      type: "application",
      link: `/admin/applications`,
    },
  ]);

  await supabase.from("customer_notifications").insert([
    {
      user_id: customerId,
      title: "Gas Customer Application Submitted",
      message:
        "Your gas customer application has been successfully saved. You may now proceed to order gas cylinders and refills.",
      category: "Account",
      is_read: false,
    },
  ]);

  return applicationRecord;
}

/**
 * Fetches all Gas Customer Applications for Admin management.
 */
export async function getAllGasCustomerApplications(): Promise<GasCustomerApplication[]> {
  const applications: GasCustomerApplication[] = [];

  // 1. Query from gas_customer_applications table
  try {
    const { data } = await (supabase.from("gas_customer_applications" as any) as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      for (const d of data) {
        applications.push({
          id: d.id,
          customer_id: d.customer_id,
          full_name: d.full_name,
          email: d.email,
          phone: d.phone,
          date_of_birth: d.date_of_birth,
          street_address: d.street_address,
          city: d.city,
          postcode: d.postcode,
          delivery_address: d.delivery_address,
          billing_address: d.billing_address,
          preferred_contact_method: d.preferred_contact_method,
          usage_type: d.usage_type || "DOMESTIC",
          business_name: d.business_name,
          business_type: d.business_type,
          business_address: d.business_address,
          business_contact: d.business_contact,
          existing_cylinder_status: d.existing_cylinder_status,
          cylinder_type: d.cylinder_type,
          cylinder_size: d.cylinder_size,
          order_requirement: d.order_requirement,
          declaration_accepted: d.declaration_accepted,
          signature_data: d.signature_data,
          signed_at: d.signed_at || d.created_at,
          status: (d.status as ApplicationStatus) || "SUBMITTED",
          admin_notes: d.admin_notes,
          reviewed_by: d.reviewed_by,
          reviewed_at: d.reviewed_at,
          created_at: d.created_at,
          updated_at: d.updated_at,
        });
      }
    }
  } catch (e) {
    // Fallback
  }

  // 2. Query from cms_content_blocks container
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
    // ignore
  }

  return applications.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
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
  const { applicationId, customerId, status, adminNotes = "", reviewedBy = "Admin" } = params;
  const now = new Date().toISOString();

  // 1. Update in table
  try {
    await (supabase.from("gas_customer_applications" as any) as any)
      .update({
        status,
        admin_notes: adminNotes,
        reviewed_by: reviewedBy,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("customer_id", customerId);
  } catch (e) {
    // ignore
  }

  // 2. Update in cms_content_blocks fallback
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

  // 3. Customer notification
  await supabase.from("customer_notifications").insert([
    {
      user_id: customerId,
      title: `Gas Application ${status === "APPROVED" ? "Approved" : status === "REJECTED" ? "Update Required" : "Status Updated"}`,
      message: `Your gas customer application has been marked as ${status} by John Stayte Services.`,
      category: "Account",
      is_read: false,
    },
  ]);

  return { success: true, status };
}

import { supabase } from "@/lib/supabase";
import { logAdminAuditAction } from "@/lib/audit";
import { isRefillableLpgCylinderProduct } from "@/lib/cylinder-exchange-service";

export interface CylinderDepositRecord {
  id: string;
  product_id: string;
  deposit_amount: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  product?: {
    id: string;
    name: string;
    slug: string;
    image_url?: string | null;
    category_slug?: string | null;
    price?: number;
    specs?: Record<string, any>;
  };
}

export interface CreateCylinderDepositParams {
  productId: string;
  depositAmount: number;
  isActive?: boolean;
  createdBy?: string;
}

export interface UpdateCylinderDepositParams {
  depositAmount?: number;
  isActive?: boolean;
  updatedBy?: string;
}

export interface ProductDepositStatus {
  depositAmount: number;
  isConfigured: boolean;
  record: CylinderDepositRecord | null;
}

export const CMS_DEPOSITS_KEY = "cylinder_security_deposits";

/**
 * Standard baseline deposit rules for initial catalog synchronization
 */
export const DEFAULT_LPG_DEPOSITS_SEED: Record<string, number> = {
  "13kg": 39.99,
  "19kg": 44.99,
  "47kg": 59.99,
  "6kg": 34.99,
  "7kg": 34.99,
  "4.5kg": 29.99,
  "18kg": 49.99,
  "907": 55.0,
  "campingaz": 55.0,
};

/**
 * Normalizes raw Supabase deposit row
 */
export function normalizeCylinderDeposit(row: any): CylinderDepositRecord {
  return {
    id: row.id,
    product_id: row.product_id,
    deposit_amount: Number(row.deposit_amount ?? 0),
    is_active: row.is_active !== false,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || row.created_at || new Date().toISOString(),
    created_by: row.created_by || null,
    updated_by: row.updated_by || null,
    product: row.product
      ? {
          id: row.product.id || row.product_id,
          name: row.product.name || "Unnamed Cylinder",
          slug: row.product.slug || "",
          image_url: row.product.image_url || null,
          category_slug: row.product.category_slug || null,
          price: Number(row.product.price ?? 0),
          specs: row.product.specs || {},
        }
      : undefined,
  };
}

/**
 * Syncs deposit records to CMS content blocks and local cache for resilient Supabase backup
 */
async function syncToCmsContentBlock(deposits: CylinderDepositRecord[]) {
  const payload = deposits.map((d) => ({
    id: d.id,
    product_id: d.product_id,
    deposit_amount: d.deposit_amount,
    is_active: d.is_active,
    created_at: d.created_at,
    updated_at: d.updated_at,
    created_by: d.created_by,
    updated_by: d.updated_by,
  }));

  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem("jss.cylinder_deposits", JSON.stringify(payload));
    }
  } catch {}

  try {
    await supabase.from("cms_content_blocks").upsert(
      {
        section_key: CMS_DEPOSITS_KEY,
        title: "Cylinder Security Deposits Configuration",
        content: JSON.stringify(payload),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "section_key" },
    );
  } catch (err) {
    console.warn("CMS content blocks deposit sync notice:", err);
  }
}

/**
 * Fetches all Cylinder Deposits from Supabase joined with Products.
 */
export async function fetchCylinderDeposits(): Promise<CylinderDepositRecord[]> {
  try {
    // 1. Fetch live products first
    const { data: productsData } = await supabase
      .from("products")
      .select("id, name, slug, image_url, category_slug, price, specs")
      .order("name", { ascending: true });

    const productsMap = new Map<string, any>();
    const eligibleCylinders: any[] = [];

    if (productsData) {
      for (const p of productsData) {
        productsMap.set(p.id, p);
        if (isRefillableLpgCylinderProduct(p)) {
          eligibleCylinders.push(p);
        }
      }
    }

    // 2. Try querying cylinder_deposits table
    let tableRows: any[] | null = null;
    try {
      const { data, error } = await (supabase.from("cylinder_deposits") as any)
        .select("*")
        .order("updated_at", { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        tableRows = data;
      }
    } catch {}

    // 3. Try querying cms_content_blocks for cylinder_security_deposits
    let cmsRows: any[] | null = null;
    try {
      const { data: cmsBlock } = await supabase
        .from("cms_content_blocks")
        .select("content")
        .eq("section_key", CMS_DEPOSITS_KEY)
        .maybeSingle();

      if (cmsBlock?.content) {
        const parsed = JSON.parse(cmsBlock.content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          cmsRows = parsed;
        }
      }
    } catch {}

    // 4. Try local storage cache
    let localRows: any[] | null = null;
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const raw = localStorage.getItem("jss.cylinder_deposits");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            localRows = parsed;
          }
        }
      }
    } catch {}

    // Merge sources, picking the most recently updated row for each deposit
    const mergedMap = new Map<string, any>();
    for (const r of tableRows || []) {
      mergedMap.set(r.product_id || r.id, r);
    }
    for (const r of cmsRows || []) {
      const key = r.product_id || r.id;
      const existing = mergedMap.get(key);
      if (!existing || new Date(r.updated_at || 0) >= new Date(existing.updated_at || 0)) {
        mergedMap.set(key, r);
      }
    }
    for (const r of localRows || []) {
      const key = r.product_id || r.id;
      const existing = mergedMap.get(key);
      if (!existing || new Date(r.updated_at || 0) >= new Date(existing.updated_at || 0)) {
        mergedMap.set(key, r);
      }
    }

    const sourceRows = Array.from(mergedMap.values());

    if (sourceRows && sourceRows.length > 0) {
      // Map deposit rows with product details
      const list: CylinderDepositRecord[] = sourceRows
        .map((row: any) => {
          const prod = productsMap.get(row.product_id);
          return normalizeCylinderDeposit({
            ...row,
            product: prod,
          });
        })
        .filter((d) => d.product && isRefillableLpgCylinderProduct(d.product));

      return list;
    }

    // 4. Initial Seed: If no records exist in DB yet, create baseline active deposit rules for all eligible LPG cylinders
    const seededList: CylinderDepositRecord[] = eligibleCylinders.map((p) => {
      const nameLower = p.name.toLowerCase();
      let defaultAmt = 39.99;
      for (const [key, val] of Object.entries(DEFAULT_LPG_DEPOSITS_SEED)) {
        if (nameLower.includes(key)) {
          defaultAmt = val;
          break;
        }
      }

      return {
        id: `dep-${p.id}`,
        product_id: p.id,
        deposit_amount: defaultAmt,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: "system_init",
        product: {
          id: p.id,
          name: p.name,
          slug: p.slug,
          image_url: p.image_url,
          category_slug: p.category_slug,
          price: Number(p.price || 0),
          specs: p.specs,
        },
      };
    });

    // Save initial configuration to Supabase
    if (seededList.length > 0) {
      syncToCmsContentBlock(seededList).catch(() => {});
      try {
        await (supabase.from("cylinder_deposits") as any).insert(
          seededList.map((d) => ({
            id: d.id,
            product_id: d.product_id,
            deposit_amount: d.deposit_amount,
            is_active: d.is_active,
            created_at: d.created_at,
            updated_at: d.updated_at,
            created_by: "system_init",
          })),
        );
      } catch {}
    }

    return seededList;
  } catch (err: any) {
    console.error("fetchCylinderDeposits error:", err);
    return [];
  }
}

/**
 * Fetches the active security deposit for a specific cylinder product directly from Supabase.
 */
export async function getActiveDepositForProduct(productId: string): Promise<ProductDepositStatus> {
  if (!productId) {
    return { depositAmount: 0, isConfigured: false, record: null };
  }

  try {
    // 1. Check all deposits from live Supabase dataset
    const allDeposits = await fetchCylinderDeposits();
    const activeDeposit = allDeposits.find(
      (d) => d.product_id === productId && d.is_active === true,
    );

    if (activeDeposit) {
      return {
        depositAmount: activeDeposit.deposit_amount,
        isConfigured: true,
        record: activeDeposit,
      };
    }

    return { depositAmount: 0, isConfigured: false, record: null };
  } catch (err: any) {
    console.warn("getActiveDepositForProduct notice:", err?.message);
    return { depositAmount: 0, isConfigured: false, record: null };
  }
}

/**
 * Creates a new Security Deposit configuration for an LPG Cylinder product.
 */
export async function createCylinderDeposit(
  params: CreateCylinderDepositParams,
): Promise<CylinderDepositRecord> {
  const { productId, depositAmount, isActive = true, createdBy } = params;

  if (!productId) {
    throw new Error("Please select an LPG Cylinder product.");
  }
  if (typeof depositAmount !== "number" || isNaN(depositAmount) || depositAmount < 0) {
    throw new Error("Security Deposit amount must be a valid non-negative number.");
  }

  const currentDeposits = await fetchCylinderDeposits();

  // If a deposit configuration already exists for this product, update it gracefully
  const existingRecord = currentDeposits.find((d) => d.product_id === productId);
  if (existingRecord) {
    return updateCylinderDeposit(existingRecord.id, {
      depositAmount,
      isActive,
      updatedBy: createdBy,
    });
  }

  const now = new Date().toISOString();
  const newRecordId = `dep-${Date.now()}`;
  const insertPayload = {
    id: newRecordId,
    product_id: productId,
    deposit_amount: depositAmount,
    is_active: isActive,
    created_at: now,
    updated_at: now,
    created_by: createdBy || null,
    updated_by: createdBy || null,
  };

  // Try direct insert into cylinder_deposits
  try {
    await (supabase.from("cylinder_deposits") as any).insert([insertPayload]);
  } catch (err) {
    console.warn("cylinder_deposits insert notice:", err);
  }

  // Sync into CMS content block and memory list
  const updatedList = [
    ...currentDeposits.filter((d) => d.id !== newRecordId),
    normalizeCylinderDeposit(insertPayload),
  ];
  await syncToCmsContentBlock(updatedList);

  // Update product specs in database
  try {
    const { data: currentProd } = await supabase
      .from("products")
      .select("specs")
      .eq("id", productId)
      .single();

    if (currentProd) {
      const currentSpecs =
        currentProd.specs && typeof currentProd.specs === "object" ? currentProd.specs : {};
      await supabase
        .from("products")
        .update({
          specs: {
            ...currentSpecs,
            deposit_price: depositAmount,
          },
          updated_at: now,
        })
        .eq("id", productId);
    }
  } catch (specErr) {
    console.warn("Product specs update notice:", specErr);
  }

  // Log Admin Audit action
  logAdminAuditAction("create", "cylinder_deposits", newRecordId, {
    productId,
    depositAmount,
    isActive,
  }).catch(() => {});

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cylinder_deposits_updated"));
  }

  return normalizeCylinderDeposit(insertPayload);
}

/**
 * Updates an existing Security Deposit configuration.
 */
export async function updateCylinderDeposit(
  id: string,
  params: UpdateCylinderDepositParams,
): Promise<CylinderDepositRecord> {
  if (!id) throw new Error("Missing deposit configuration ID.");

  const currentDeposits = await fetchCylinderDeposits();
  const targetIndex = currentDeposits.findIndex((d) => d.id === id);
  if (targetIndex === -1) {
    throw new Error("Deposit configuration not found.");
  }

  const existing = currentDeposits[targetIndex];
  const now = new Date().toISOString();

  let newAmount = existing.deposit_amount;
  if (typeof params.depositAmount === "number") {
    if (isNaN(params.depositAmount) || params.depositAmount < 0) {
      throw new Error("Deposit amount must be a valid non-negative number.");
    }
    newAmount = params.depositAmount;
  }

  const newIsActive = typeof params.isActive === "boolean" ? params.isActive : existing.is_active;

  const updatedRecord: CylinderDepositRecord = {
    ...existing,
    deposit_amount: newAmount,
    is_active: newIsActive,
    updated_at: now,
    updated_by: params.updatedBy || existing.updated_by || null,
  };

  // Try update on cylinder_deposits table
  try {
    await (supabase.from("cylinder_deposits") as any)
      .update({
        deposit_amount: newAmount,
        is_active: newIsActive,
        updated_at: now,
        updated_by: params.updatedBy || null,
      })
      .eq("id", id);
  } catch (err) {
    console.warn("cylinder_deposits update notice:", err);
  }

  // Sync to CMS Content Blocks
  const updatedList = currentDeposits.map((d) => (d.id === id ? updatedRecord : d));
  await syncToCmsContentBlock(updatedList);

  // Sync with product specs
  if (updatedRecord.product_id) {
    try {
      const { data: currentProd } = await supabase
        .from("products")
        .select("specs")
        .eq("id", updatedRecord.product_id)
        .single();

      if (currentProd) {
        const currentSpecs =
          currentProd.specs && typeof currentProd.specs === "object" ? currentProd.specs : {};
        await supabase
          .from("products")
          .update({
            specs: {
              ...currentSpecs,
              deposit_price: newAmount,
            },
            updated_at: now,
          })
          .eq("id", updatedRecord.product_id);
      }
    } catch (e) {
      console.warn("Product specs update notice:", e);
    }
  }

  // Log Admin Audit
  logAdminAuditAction("update", "cylinder_deposits", id, {
    depositAmount: newAmount,
    isActive: newIsActive,
  }).catch(() => {});

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cylinder_deposits_updated"));
  }

  return updatedRecord;
}

/**
 * Toggles a cylinder deposit status between active and inactive.
 */
export async function toggleCylinderDepositStatus(
  id: string,
  isActive: boolean,
): Promise<CylinderDepositRecord> {
  return updateCylinderDeposit(id, { isActive });
}

/**
 * Deletes a cylinder deposit configuration.
 */
export async function deleteCylinderDeposit(id: string): Promise<void> {
  if (!id) throw new Error("Missing deposit configuration ID.");

  try {
    await (supabase.from("cylinder_deposits") as any).delete().eq("id", id);
  } catch (err) {
    console.warn("cylinder_deposits delete notice:", err);
  }

  const currentDeposits = await fetchCylinderDeposits();
  const updatedList = currentDeposits.filter((d) => d.id !== id);
  await syncToCmsContentBlock(updatedList);

  logAdminAuditAction("delete", "cylinder_deposits", id, { id }).catch(() => {});

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cylinder_deposits_updated"));
  }
}

/**
 * Returns eligible LPG cylinder products for the deposit configuration modal.
 */
export async function getEligibleLpgProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, slug, category_slug, brand, subcategory, image_url, price, specs")
    .order("name", { ascending: true });

  if (error || !data) return [];

  return data.filter((p) => isRefillableLpgCylinderProduct(p));
}

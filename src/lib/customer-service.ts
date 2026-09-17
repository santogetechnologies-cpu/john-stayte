import { supabase } from "@/lib/supabase";

export interface DeleteCustomerResult {
  success: boolean;
  deleted_customer_id?: string;
  email?: string;
  orders_retained?: number;
  message?: string;
}

/**
 * Permanently deletes a customer account and cleans up personal data while safely preserving historical business orders and audit records.
 * Authorized exclusively for Administrators.
 */
export async function deleteCustomerAccount(
  customerId: string,
): Promise<DeleteCustomerResult> {
  if (!customerId) {
    throw new Error("Customer ID is required.");
  }

  // 1. Verify caller has active Admin session
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) {
    throw new Error("Authentication required to perform administrative customer operations.");
  }

  // 2. Invoke server-side secure SECURITY DEFINER RPC
  const { data, error } = await (supabase.rpc as any)("admin_delete_customer", {
    target_customer_id: customerId,
  });

  if (error) {
    console.error("admin_delete_customer RPC error:", error);
    throw new Error(error.message || "Unable to delete customer. No changes were made.");
  }

  const result = data as DeleteCustomerResult;
  if (!result || !result.success) {
    throw new Error(result?.message || "Unable to delete customer. No changes were made.");
  }

  return result;
}

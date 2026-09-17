import { supabase } from "@/lib/supabase";

export interface DeleteOrderResult {
  success: boolean;
  order_id?: string;
  order_number?: string;
  message?: string;
}

export interface DeleteDeliveryAssignmentResult {
  success: boolean;
  assignment_id?: string;
  message?: string;
}

/**
 * Permanently deletes an order and cleans up child records (items, delivery assignments, history).
 * Authorized exclusively for Administrators and Managers.
 */
export async function deleteOrder(orderId: string): Promise<DeleteOrderResult> {
  if (!orderId) {
    throw new Error("Order ID is required.");
  }

  // 1. Verify caller has active session
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) {
    throw new Error("Authentication required to perform administrative order operations.");
  }

  // 2. Attempt secure server-side RPC first
  try {
    const { data, error } = await (supabase.rpc as any)("admin_delete_order", {
      target_order_id: orderId,
    });

    if (!error && data?.success) {
      return data as DeleteOrderResult;
    }

    if (error && !error.message?.includes("function") && !error.message?.includes("does not exist")) {
      throw new Error(error.message || "Failed to delete order.");
    }
  } catch (rpcErr: any) {
    if (!rpcErr.message?.includes("function") && !rpcErr.message?.includes("does not exist")) {
      throw rpcErr;
    }
  }

  // 3. Fallback: Direct RLS-authorized deletion on public.orders with child cleanup
  // Step 3a: Decouple reviews and support tickets
  try {
    await supabase.from("reviews").update({ order_id: null }).eq("order_id", orderId);
    await supabase.from("support_tickets").update({ order_id: null }).eq("order_id", orderId);
  } catch {
    // Non-blocking
  }

  // Step 3b: Clean child records
  try {
    await supabase.from("delivery_assignments").delete().eq("order_id", orderId);
    await supabase.from("order_items").delete().eq("order_id", orderId);
    await supabase.from("order_status_history").delete().eq("order_id", orderId);
    await supabase.from("invoices").delete().eq("order_id", orderId);
    await supabase.from("payments").delete().eq("order_id", orderId);
  } catch {
    // Non-blocking
  }

  // Step 3c: Delete from orders table
  const { error: deleteErr } = await supabase.from("orders").delete().eq("id", orderId);

  if (deleteErr) {
    console.error("Direct order deletion error:", deleteErr);
    throw new Error(deleteErr.message || "Failed to delete order from database.");
  }

  return {
    success: true,
    order_id: orderId,
    message: "Order deleted successfully from database.",
  };
}

/**
 * Permanently deletes a delivery route / assignment from Supabase.
 * Authorized exclusively for Administrators and Managers.
 */
export async function deleteDeliveryAssignment(
  assignmentId: string,
): Promise<DeleteDeliveryAssignmentResult> {
  if (!assignmentId) {
    throw new Error("Delivery assignment ID is required.");
  }

  // 1. Verify caller has active session
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) {
    throw new Error("Authentication required to perform administrative delivery operations.");
  }

  // 2. Attempt secure server-side RPC first
  try {
    const { data, error } = await (supabase.rpc as any)("admin_delete_delivery_assignment", {
      target_assignment_id: assignmentId,
    });

    if (!error && data?.success) {
      return data as DeleteDeliveryAssignmentResult;
    }

    if (error && !error.message?.includes("function") && !error.message?.includes("does not exist")) {
      throw new Error(error.message || "Failed to delete delivery assignment.");
    }
  } catch (rpcErr: any) {
    if (!rpcErr.message?.includes("function") && !rpcErr.message?.includes("does not exist")) {
      throw rpcErr;
    }
  }

  // 3. Fallback: Direct RLS-authorized deletion
  // Step 3a: Fetch assignment to decouple order if needed
  try {
    const { data: assignment } = await supabase
      .from("delivery_assignments")
      .select("order_id")
      .eq("id", assignmentId)
      .maybeSingle();

    if (assignment?.order_id) {
      await supabase
        .from("orders")
        .update({ assigned_driver: null })
        .eq("id", assignment.order_id);
    }
  } catch {
    // Non-blocking
  }

  // Step 3b: Delete assignment row
  const { error: deleteErr } = await supabase
    .from("delivery_assignments")
    .delete()
    .eq("id", assignmentId);

  if (deleteErr) {
    console.error("Direct delivery assignment deletion error:", deleteErr);
    throw new Error(deleteErr.message || "Failed to delete delivery assignment from database.");
  }

  return {
    success: true,
    assignment_id: assignmentId,
    message: "Delivery assignment deleted successfully from database.",
  };
}

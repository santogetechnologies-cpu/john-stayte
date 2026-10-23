import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export interface CreateElavonSessionInput {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency?: string;
  customerEmail: string;
  customerName: string;
  returnUrl: string;
  cancelUrl: string;
}

export interface CreateElavonSessionResponse {
  ok: boolean;
  sessionId?: string;
  paymentUrl?: string;
  environment?: string;
  error?: string;
  message?: string;
}

export interface VerifyElavonPaymentInput {
  orderId: string;
  sessionId?: string;
  transactionId?: string;
}

export interface VerifyElavonPaymentResponse {
  ok: boolean;
  orderId: string;
  paymentStatus: "Paid" | "Pending" | "Failed" | "Cancelled";
  alreadyPaid?: boolean;
  transactionId?: string;
  approvalCode?: string;
  message?: string;
  error?: string;
}

/**
 * Returns a server-side Supabase client with Service Role or Anon key for authoritative payment writes.
 */
function getServerSupabase() {
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "https://wttchknauwvbfjatdscc.supabase.co";

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.warn(
      "[Supabase Configuration] SUPABASE_SERVICE_ROLE_KEY is not configured in the server environment. " +
        "Falling back to public/anon key. Database writes to protected tables (e.g. public.payments, orders) may be restricted by Row Level Security.",
    );
  }

  const supabaseKey =
    serviceRoleKey ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0dGNoa25hdXd2YmZqYXRkc2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0Mjk1NTQsImV4cCI6MjEwMjAwNTU1NH0.z6nXs0zC8u7A_CUO8KDIoILSXS_OeMPrr5OdVYcmxQE";

  return createClient<any>(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}

/**
 * Resolves the Elavon API environment and Base URL.
 */
function resolveElavonConfig() {
  const env = (process.env.ELAVON_ENV || "sandbox").trim().toLowerCase();
  const isProd = env === "production" || env === "live";

  const merchantAlias = process.env.ELAVON_MERCHANT_ALIAS?.trim();
  const secretKey = process.env.ELAVON_SECRET_KEY?.trim();
  const publicKey = process.env.ELAVON_PUBLIC_KEY?.trim();
  const processorId = process.env.ELAVON_PROCESSOR_ID?.trim();

  // Production vs Sandbox base URLs
  // Sandbox: https://api.sandbox.elavonpayments.com
  // Production: https://api.eu.elavonpayments.com or custom override
  const baseUrl = isProd
    ? process.env.ELAVON_API_BASE_URL || "https://api.eu.elavonpayments.com"
    : "https://api.sandbox.elavonpayments.com";

  return {
    isProd,
    env: isProd ? "production" : "sandbox",
    baseUrl,
    merchantAlias,
    secretKey,
    publicKey,
    processorId,
    isConfigured: Boolean(merchantAlias && secretKey),
  };
}

/**
 * Server Function: Initializes an official Elavon Hosted Payment Session.
 * Server creates the order and payment-session resources in Elavon via Basic Auth
 * and returns the secure hosted payment page URL for customer redirection.
 */
export const createElavonPaymentSessionServerFn = createServerFn({ method: "POST" })
  .validator((data: CreateElavonSessionInput) => data)
  .handler(async ({ data }): Promise<CreateElavonSessionResponse> => {
    try {
      const payload = ((data as any)?.data || data) as CreateElavonSessionInput | undefined;
      if (!payload || typeof payload !== "object") {
        return {
          ok: false,
          error: "Invalid request: missing order payment data.",
        };
      }

      const {
        orderId,
        orderNumber,
        amount,
        currency = "GBP",
        customerEmail,
        customerName,
        returnUrl,
        cancelUrl,
      } = payload;

      if (!orderId || !amount || amount <= 0) {
        return {
          ok: false,
          error: "Invalid order details or non-positive amount provided.",
        };
      }

      const config = resolveElavonConfig();
      if (!config.isConfigured || !config.merchantAlias || !config.secretKey) {
        return {
          ok: false,
          error:
            "Elavon gateway credentials are not configured on this server. Please set ELAVON_MERCHANT_ALIAS and ELAVON_SECRET_KEY.",
        };
      }

      const supabase = getServerSupabase();

      // Check if order is already Paid
      const { data: existingOrder } = await (supabase.from("orders") as any)
        .select("id, payment_status")
        .eq("id", orderId)
        .maybeSingle();

      if (existingOrder?.payment_status === "Paid") {
        return {
          ok: false,
          error: "This order has already been paid and verified. Duplicate payment prohibited.",
        };
      }

      const authHeader = `Basic ${Buffer.from(
        `${config.merchantAlias}:${config.secretKey}`,
      ).toString("base64")}`;

      // Payment Recovery / Duplicate Protection:
      // Reconcile any existing payment session for this order before creating a new one
      const { data: existingPayment } = await supabase
        .from("payments")
        .select("id, payment_intent_id, payment_status")
        .eq("order_id", orderId)
        .maybeSingle();

      if (existingPayment?.payment_intent_id) {
        try {
          const checkRes = await fetch(
            `${config.baseUrl}/payment-sessions/${existingPayment.payment_intent_id}`,
            {
              method: "GET",
              headers: {
                Authorization: authHeader,
                "Content-Type": "application/json",
              },
            },
          );

          if (checkRes.ok) {
            const checkData = (await checkRes.json()) as Record<string, any>;
            const existingTx = checkData.transaction;
            if (existingTx) {
              const txHref = typeof existingTx === "string" ? existingTx : existingTx.href;
              const txRes = await fetch(txHref, {
                method: "GET",
                headers: {
                  Authorization: authHeader,
                  "Content-Type": "application/json",
                },
              });
              if (txRes.ok) {
                const txData = (await txRes.json()) as Record<string, any>;
                const rawStatus = (txData.status || txData.state || "").toUpperCase();
                const capturedStatuses = ["CAPTURED", "FUNDED", "SETTLED", "COMPLETED"];
                if (capturedStatuses.includes(rawStatus)) {
                  return {
                    ok: false,
                    error: `Payment for this order has already been captured (Tx: ${txData.id}). Please verify the order status.`,
                  };
                }
              }
            }
          }
        } catch (reconcileErr) {
          console.warn("[Elavon] Previous session reconciliation notice:", reconcileErr);
        }
      }

      // 1. Create Order Resource in Elavon
      const orderPayload = {
        total: {
          amount: amount.toFixed(2),
          currencyCode: currency.toUpperCase(),
        },
        description: `John Stayte Services Order #${orderNumber}`,
      };

      const orderRes = await fetch(`${config.baseUrl}/orders`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderPayload),
      });

      if (!orderRes.ok) {
        const errBody = await orderRes.text().catch(() => "");
        console.error(`[Elavon] Order creation failed (${orderRes.status}):`, errBody);
        return {
          ok: false,
          error: `Payment initialization failed with Elavon (${orderRes.status}). Please try again.`,
        };
      }

      const orderData = (await orderRes.json()) as { id: string; href?: string };
      const orderHref = orderData.href || `${config.baseUrl}/orders/${orderData.id}`;

      // 2. Create Payment Session Resource in Elavon
      const cleanReturnUrl = returnUrl.includes("?")
        ? `${returnUrl}&payment=verify&orderId=${encodeURIComponent(orderId)}`
        : `${returnUrl}?payment=verify&orderId=${encodeURIComponent(orderId)}`;

      const cleanCancelUrl = cancelUrl.includes("?")
        ? `${cancelUrl}&payment=cancelled&orderId=${encodeURIComponent(orderId)}`
        : `${cancelUrl}?payment=cancelled&orderId=${encodeURIComponent(orderId)}`;

      // doCapture: true is the officially supported EPG field for auto-capture / Sale transactions
      const sessionPayload: Record<string, unknown> = {
        order: orderHref,
        hppType: "fullPageRedirect",
        returnUrl: cleanReturnUrl,
        cancelUrl: cleanCancelUrl,
        doCreateTransaction: true,
        doThreeDSecure: true,
        doCapture: true,
        shopperEmailAddress: customerEmail || undefined,
        invoiceNumber: orderNumber || undefined,
      };

      if (customerName) {
        sessionPayload.billTo = {
          fullName: customerName,
        };
      }

      const sessionRes = await fetch(`${config.baseUrl}/payment-sessions`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sessionPayload),
      });

      if (!sessionRes.ok) {
        const errBody = await sessionRes.text().catch(() => "");
        console.error(`[Elavon] Session creation failed (${sessionRes.status}):`, errBody);
        return {
          ok: false,
          error: `Failed to generate Elavon payment session (${sessionRes.status}). Please try again.`,
        };
      }

      const sessionData = (await sessionRes.json()) as { id: string; url?: string };
      const sessionId = sessionData.id;
      const paymentUrl = sessionData.url;

      if (!paymentUrl) {
        return {
          ok: false,
          error: "Elavon returned an invalid session without a hosted payment URL.",
        };
      }

      // 3. Record pending transaction in Supabase public.payments
      try {
        if (existingPayment?.id) {
          await supabase
            .from("payments")
            .update({
              payment_provider: "elavon",
              payment_intent_id: sessionId,
              payment_status: "pending",
              amount: amount,
              currency: currency.toUpperCase(),
              receipt_email: customerEmail,
              metadata: {
                orderNumber,
                orderHref,
                environment: config.env,
                sessionId,
              },
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingPayment.id);
        } else {
          await supabase.from("payments").insert([
            {
              order_id: orderId,
              payment_provider: "elavon",
              payment_intent_id: sessionId,
              payment_status: "pending",
              amount: amount,
              currency: currency.toUpperCase(),
              receipt_email: customerEmail,
              metadata: {
                orderNumber,
                orderHref,
                environment: config.env,
                sessionId,
              },
            },
          ]);
        }
      } catch (dbErr) {
        console.warn("[Elavon] Non-blocking payment table update notice:", dbErr);
      }

      return {
        ok: true,
        sessionId,
        paymentUrl,
        environment: config.env,
      };
    } catch (err: any) {
      console.error("[Elavon] Unhandled session creation error:", err);
      return {
        ok: false,
        error: err.message || "An unexpected error occurred during payment initialization.",
      };
    }
  });

/**
 * Server Function: Authoritatively verifies payment status with Elavon.
 * Never trusts client-side callbacks blindly. Performs server-to-server query
 * against Elavon to verify that the transaction was captured and matches the order.
 */
export const verifyElavonPaymentServerFn = createServerFn({ method: "POST" })
  .validator((data: VerifyElavonPaymentInput) => data)
  .handler(async ({ data }): Promise<VerifyElavonPaymentResponse> => {
    try {
      const payload = ((data as any)?.data || data) as VerifyElavonPaymentInput | undefined;
      if (!payload || typeof payload !== "object" || !payload.orderId) {
        return {
          ok: false,
          orderId: payload?.orderId || "",
          paymentStatus: "Failed",
          error: "Order identifier is required for verification.",
        };
      }

      const { orderId, sessionId } = payload;

      if (!orderId) {
        return {
          ok: false,
          orderId: "",
          paymentStatus: "Failed",
          error: "Order identifier is required for verification.",
        };
      }

      const supabase = getServerSupabase();

      // 1. Fetch current order state in Supabase
      const { data: order, error: orderErr } = await (supabase.from("orders") as any)
        .select(
          "id, order_number, total, subtotal, status, fulfillment_status, payment_status, customer_id, customer_name, customer_email, offer_id, offer_code",
        )
        .eq("id", orderId)
        .single();

      if (orderErr || !order) {
        return {
          ok: false,
          orderId,
          paymentStatus: "Failed",
          error: "Order record could not be found.",
        };
      }

      // Idempotency: If already paid, return success immediately
      if (order.payment_status === "Paid") {
        return {
          ok: true,
          orderId,
          paymentStatus: "Paid",
          alreadyPaid: true,
          message: "Order is already marked as paid.",
        };
      }

      const config = resolveElavonConfig();
      if (!config.isConfigured || !config.merchantAlias || !config.secretKey) {
        return {
          ok: false,
          orderId,
          paymentStatus: "Pending",
          error: "Elavon gateway credentials missing on server.",
        };
      }

      const authHeader = `Basic ${Buffer.from(
        `${config.merchantAlias}:${config.secretKey}`,
      ).toString("base64")}`;

      // 2. Resolve Session ID from parameters or payments record
      let activeSessionId = sessionId;
      if (!activeSessionId) {
        const { data: payRecord } = await supabase
          .from("payments")
          .select("payment_intent_id")
          .eq("order_id", orderId)
          .maybeSingle();

        activeSessionId = payRecord?.payment_intent_id || undefined;
      }

      if (!activeSessionId) {
        return {
          ok: false,
          orderId,
          paymentStatus: "Pending",
          error: "No active Elavon payment session reference found for this order.",
        };
      }

      // 3. Query Elavon Payment Session authoritatively
      const sessionUrl = `${config.baseUrl}/payment-sessions/${activeSessionId}`;
      const sessionRes = await fetch(sessionUrl, {
        method: "GET",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      });

      if (!sessionRes.ok) {
        const errText = await sessionRes.text().catch(() => "");
        console.error(`[Elavon] Session query failed (${sessionRes.status}):`, errText);
        return {
          ok: false,
          orderId,
          paymentStatus: "Pending",
          error: "Could not retrieve session status from Elavon.",
        };
      }

      const sessionData = (await sessionRes.json()) as Record<string, any>;

      // Transaction-to-Order Validation: Verify session invoice matches order number
      if (sessionData.invoiceNumber && sessionData.invoiceNumber !== order.order_number) {
        return {
          ok: false,
          orderId,
          paymentStatus: "Failed",
          error: `Payment session invoice number mismatch (${sessionData.invoiceNumber} vs expected ${order.order_number}).`,
        };
      }

      const transactionHref = sessionData.transaction;

      // Handle cancelled sessions
      const sessionState = (sessionData.status || sessionData.state || "").toLowerCase();
      if (sessionState === "cancelled" || sessionState === "canceled") {
        await supabase
          .from("payments")
          .update({
            payment_status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("order_id", orderId);

        await (supabase.from("orders") as any)
          .update({
            payment_status: "Cancelled",
            status: "Cancelled",
            notes: "[Payment: Card payment cancelled by customer]",
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId)
          .neq("payment_status", "Paid");

        try {
          await (supabase.from("invoices") as any)
            .update({ status: "Cancelled" })
            .eq("order_id", orderId);
        } catch {
          /* ignore */
        }

        try {
          await (supabase.from("delivery_assignments") as any)
            .update({ status: "Cancelled" })
            .eq("order_id", orderId);
        } catch {
          /* ignore */
        }

        return {
          ok: false,
          orderId,
          paymentStatus: "Cancelled",
          message: "Payment session was cancelled.",
        };
      }

      if (!transactionHref) {
        return {
          ok: false,
          orderId,
          paymentStatus: "Pending",
          message: "Payment is pending authorization or was not completed.",
        };
      }

      // Query the authoritative transaction resource
      const txUrl = typeof transactionHref === "string" ? transactionHref : transactionHref.href;
      const txRes = await fetch(txUrl, {
        method: "GET",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      });

      if (!txRes.ok) {
        const txErrText = await txRes.text().catch(() => "");
        console.error(`[Elavon] Transaction query failed (${txRes.status}):`, txErrText);
        return {
          ok: false,
          orderId,
          paymentStatus: "Pending",
          error: "Could not retrieve authoritative transaction details from Elavon.",
        };
      }

      const txData = (await txRes.json()) as Record<string, any>;
      const transactionId = txData.id;
      const approvalCode = txData.approvalCode || txData.authorizationCode || txData.authCode;

      // Transaction-to-Order Validation 1: Merchant reference or invoice number
      const txInvoice = txData.invoiceNumber || txData.merchantReference;
      if (txInvoice && txInvoice !== order.order_number) {
        return {
          ok: false,
          orderId,
          paymentStatus: "Failed",
          error: `Transaction invoice number mismatch (${txInvoice} vs expected ${order.order_number}).`,
        };
      }

      // Transaction-to-Order Validation 2: Exact expected amount
      const txAmount = parseFloat(txData.total?.amount || txData.amount || "0");
      const orderAmount = parseFloat(String(order.total || "0"));

      if (isNaN(txAmount) || txAmount <= 0) {
        return {
          ok: false,
          orderId,
          paymentStatus: "Failed",
          error: "Invalid or zero transaction amount returned by gateway.",
        };
      }

      if (Math.abs(txAmount - orderAmount) > 0.01) {
        console.warn(
          `[Elavon] Amount mismatch: Order £${orderAmount.toFixed(2)} vs Tx £${txAmount.toFixed(2)}`,
        );
        return {
          ok: false,
          orderId,
          paymentStatus: "Failed",
          error: `Transaction amount (£${txAmount.toFixed(2)}) does not match order total (£${orderAmount.toFixed(2)}).`,
        };
      }

      // Transaction-to-Order Validation 3: Exact GBP currency
      const txCurrency = (
        txData.total?.currencyCode ||
        txData.currencyCode ||
        txData.currency ||
        ""
      ).toUpperCase();
      if (txCurrency && txCurrency !== "GBP") {
        return {
          ok: false,
          orderId,
          paymentStatus: "Failed",
          error: `Transaction currency (${txCurrency}) does not match expected GBP currency.`,
        };
      }

      // Transaction-to-Order Validation 4: Reject duplicate transaction IDs across orders
      if (transactionId) {
        const { data: duplicateTx } = await supabase
          .from("payments")
          .select("order_id")
          .eq("payment_intent_id", transactionId)
          .neq("order_id", orderId)
          .maybeSingle();

        if (duplicateTx) {
          return {
            ok: false,
            orderId,
            paymentStatus: "Failed",
            error: `Transaction ID ${transactionId} has already been applied to another order (${duplicateTx.order_id}).`,
          };
        }
      }

      // Payment Capture & Status Verification:
      // PREAUTHORIZED and AUTHORIZED are temporary holds, NOT captured payments!
      const rawStatus = (txData.status || txData.state || "").toUpperCase();

      if (rawStatus === "PREAUTHORIZED" || rawStatus === "AUTHORIZED") {
        return {
          ok: false,
          orderId,
          paymentStatus: "Pending",
          transactionId,
          approvalCode,
          message: `Payment authorized (${rawStatus}) but not yet captured. Funds must be captured before marking order as paid.`,
        };
      }

      const capturedStatuses = ["CAPTURED", "FUNDED", "SETTLED", "COMPLETED"];
      if (!capturedStatuses.includes(rawStatus)) {
        return {
          ok: false,
          orderId,
          paymentStatus: "Failed",
          transactionId,
          error: `Payment verification failed. Unsettled transaction state: '${rawStatus}'.`,
        };
      }

      // Determine valid lifecycle status adhering strictly to orders_status_check
      // Permitted values: 'Pending', 'Approved', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled'
      let autoApprove = false;
      try {
        const { data: settingsBlock } = await supabase
          .from("cms_content_blocks")
          .select("content")
          .eq("section_key", "admin_system_settings")
          .maybeSingle();
        if (settingsBlock?.content) {
          const parsed = JSON.parse(settingsBlock.content);
          autoApprove = Boolean(parsed.autoApproveOrders);
        }
      } catch {
        /* non-blocking */
      }

      const permittedStatuses = [
        "Pending",
        "Approved",
        "Packed",
        "Out for Delivery",
        "Delivered",
        "Cancelled",
      ];
      let targetLifecycleStatus = order.status || "Pending";
      if (targetLifecycleStatus === "Pending" && autoApprove) {
        targetLifecycleStatus = "Approved";
      }
      if (!permittedStatuses.includes(targetLifecycleStatus)) {
        targetLifecycleStatus = "Pending";
      }

      // 4. Update Database State Authoritatively with Concurrency Lock
      const { data: updatedOrder, error: updateOrderErr } = await (supabase.from("orders") as any)
        .update({
          payment_status: "Paid",
          status: targetLifecycleStatus,
          notes: `[Payment: Credit / Debit Card (Elavon Verified - Auth: ${approvalCode || "Approved"}, Tx: ${transactionId || activeSessionId})]`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .neq("payment_status", "Paid")
        .select("id, payment_status, status")
        .maybeSingle();

      if (updateOrderErr) {
        console.error("[Elavon] Order payment status update database error:", updateOrderErr);
        return {
          ok: false,
          orderId,
          paymentStatus: "Pending",
          error: `Database update failed: ${updateOrderErr.message || "Failed to update order payment status."}`,
        };
      }

      // If no row was updated because it was already Paid by a concurrent process, verify and return idempotently
      if (!updatedOrder) {
        const { data: currentOrder } = await (supabase.from("orders") as any)
          .select("id, payment_status, status")
          .eq("id", orderId)
          .maybeSingle();

        if (currentOrder?.payment_status === "Paid") {
          return {
            ok: true,
            orderId,
            paymentStatus: "Paid",
            alreadyPaid: true,
            message: "Order has already been verified and marked as paid.",
          };
        }

        return {
          ok: false,
          orderId,
          paymentStatus: "Pending",
          error: "Order record not found or could not be updated to Paid.",
        };
      }

      // Update payments table (lowercase 'paid' per payments table check constraint)
      await supabase
        .from("payments")
        .update({
          payment_status: "paid",
          payment_intent_id: transactionId || activeSessionId,
          metadata: {
            ...txData,
            verifiedAt: new Date().toISOString(),
            sessionId: activeSessionId,
            approvalCode,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("order_id", orderId);

      // Add order status history
      await supabase.from("order_status_history").insert([
        {
          order_id: orderId,
          status: targetLifecycleStatus,
          notes: `Payment of £${Number(order.total).toFixed(2)} verified successfully via Elavon (Auth: ${approvalCode || "Approved"}, Tx: ${transactionId || activeSessionId}). Payment Status: Paid.`,
        },
      ]);

      // Update or insert invoice to Paid
      try {
        const { data: existingInv } = await (supabase.from("invoices") as any)
          .select("id")
          .eq("order_id", orderId)
          .maybeSingle();

        if (existingInv) {
          await (supabase.from("invoices") as any)
            .update({ status: "Paid" })
            .eq("order_id", orderId);
        } else {
          await (supabase.from("invoices") as any).insert([
            {
              invoice_number: `INV-${order.order_number?.replace("JSS-", "") || Date.now()}`,
              order_id: orderId,
              customer_id: order.customer_id || null,
              customer_name: order.customer_name || null,
              customer_email: order.customer_email || null,
              subtotal: order.subtotal || order.total,
              total_amount: order.total,
              status: "Paid",
            },
          ]);
        }
      } catch (invErr) {
        console.warn("[Elavon] Invoice status update notice:", invErr);
      }

      // 5. Authoritative Post-Payment Inventory Decrement & Offer Redemption
      // Executed strictly ONCE upon confirmed payment capture
      try {
        const { data: items } = await supabase
          .from("order_items")
          .select("product_id, quantity, product_name, unit_price, total_price")
          .eq("order_id", orderId);

        if (items && items.length > 0) {
          for (const item of items) {
            if (item.product_id) {
              const { data: currentInv } = await supabase
                .from("inventory")
                .select("current_stock")
                .eq("product_id", item.product_id)
                .single();

              if (currentInv) {
                const newStock = Math.max(
                  0,
                  (currentInv.current_stock || 0) - (item.quantity || 0),
                );
                await supabase
                  .from("inventory")
                  .update({ current_stock: newStock, updated_at: new Date().toISOString() })
                  .eq("product_id", item.product_id);
              }

              const { data: currentProd } = await supabase
                .from("products")
                .select("stock")
                .eq("id", item.product_id)
                .single();

              if (currentProd) {
                const newStock = Math.max(0, (currentProd.stock || 0) - (item.quantity || 0));
                await supabase
                  .from("products")
                  .update({ stock: newStock, updated_at: new Date().toISOString() })
                  .eq("id", item.product_id);
              }
            }
          }
        }

        // Authoritative Offer Redemption: Record redemption now that payment is confirmed
        if (order.offer_id || order.offer_code) {
          const { data: existingRedemption } = await supabase
            .from("offer_redemptions")
            .select("id")
            .eq("order_id", orderId)
            .maybeSingle();

          if (!existingRedemption) {
            await (supabase.rpc as any)("validate_and_redeem_offer", {
              p_offer_id: order.offer_id || null,
              p_code: order.offer_code || null,
              p_user_id: order.customer_id || null,
              p_email: (order.customer_email || "").trim().toLowerCase(),
              p_cart_items: (items || []).map((it: any) => ({
                product_id: it.product_id,
                product_name: it.product_name,
                quantity: it.quantity,
                unit_price: it.unit_price,
                total_price: it.total_price,
              })),
              p_subtotal: order.subtotal || order.total,
              p_order_id: orderId,
            });
          }
        }
      } catch (postPaymentErr) {
        console.warn("[Elavon] Post-payment stock/offer execution notice:", postPaymentErr);
      }

      return {
        ok: true,
        orderId,
        paymentStatus: "Paid",
        transactionId,
        approvalCode,
        message: "Payment verified successfully.",
      };
    } catch (err: any) {
      console.error("[Elavon] Payment verification unhandled error:", err);
      return {
        ok: false,
        orderId: data.orderId,
        paymentStatus: "Failed",
        error: err.message || "An unexpected error occurred during payment verification.",
      };
    }
  });

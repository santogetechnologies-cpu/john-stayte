import { supabase } from "@/lib/supabase";

export interface ReviewRecord {
  id: string;
  product_id: string;
  product_name?: string | null;
  order_id: string | null;
  user_id: string;
  customer_id?: string | null;
  user_name: string;
  customer_name?: string;
  customer_email?: string | null;
  rating: number;
  product_quality_rating?: number | null;
  delivery_agent_rating?: number | null;
  delivery_agent_id?: string | null;
  delivery_agent_name?: string | null;
  comment: string | null;
  status?: string | null;
  created_at: string;
  updated_at?: string | null;
  product?: {
    name: string;
    slug: string;
    image_url: string | null;
  };
  order?: {
    order_number: string;
    id: string;
  };
}

export interface CreateReviewParams {
  orderId: string;
  productId: string;
  userId: string;
  userName?: string;
  customerName?: string;
  rating: number;
  productQualityRating: number;
  deliveryAgentRating: number;
  deliveryAgentId?: string | null;
  deliveryAgentName?: string | null;
  comment?: string;
}

/**
 * Normalizes a review record from Supabase, parsing embedded metadata tags if columns are missing.
 */
export function normalizeReviewRecord(r: any): ReviewRecord {
  if (!r) return r;

  let orderId = r.order_id || null;
  let quality = r.product_quality_rating ? Number(r.product_quality_rating) : null;
  let agentRating = r.delivery_agent_rating ? Number(r.delivery_agent_rating) : null;
  let agentName = r.delivery_agent_name || null;
  let displayComment = r.review || r.comment || "";
  const resolvedName = r.customer_name || r.user_name || "Customer";
  const resolvedEmail = r.customer_email || r.user_email || null;
  const resolvedProdName = r.product_name || r.product?.name || null;

  if (displayComment && typeof displayComment === "string") {
    const orderMatch = displayComment.match(/\[ORDER_ID:([^\]]+)\]/);
    if (orderMatch && !orderId) orderId = orderMatch[1];

    const qualityMatch = displayComment.match(/\[QUALITY:(\d+)\]/);
    if (qualityMatch && !quality) quality = Number(qualityMatch[1]);

    const agentMatch = displayComment.match(/\[AGENT:(\d+)\|?([^\]]*)\]/);
    if (agentMatch) {
      if (!agentRating) agentRating = Number(agentMatch[1]);
      if (!agentName && agentMatch[2]) agentName = agentMatch[2];
    }

    // Strip internal metadata tags from the user-visible display comment
    displayComment = displayComment
      .replace(/\[ORDER_ID:[^\]]+\]/g, "")
      .replace(/\[QUALITY:[^\]]+\]/g, "")
      .replace(/\[AGENT:[^\]]+\]/g, "")
      .trim();
  }

  return {
    ...r,
    user_name: resolvedName,
    customer_name: resolvedName,
    customer_email: resolvedEmail,
    product_name: resolvedProdName,
    user_id: r.user_id || r.customer_id,
    order_id: orderId,
    product_quality_rating: quality,
    delivery_agent_rating: agentRating,
    delivery_agent_name: agentName,
    comment: displayComment || (r.comment ? r.comment : r.review ? r.review : null),
  };
}

/**
 * Creates a real verified customer review for a delivered order item.
 * Supports fallback to base columns if extended schema columns are not present in schema cache.
 */
export async function createCustomerReview(params: CreateReviewParams) {
  const {
    orderId,
    productId,
    userId,
    userName,
    customerName: explicitCustomerName,
    rating,
    productQualityRating,
    deliveryAgentRating,
    deliveryAgentId,
    deliveryAgentName,
    comment,
  } = params;

  // 1. Verify authenticated user
  const { data: authUser } = await supabase.auth.getUser();
  const currentAuthId = authUser?.user?.id || userId;
  const currentAuthEmail = authUser?.user?.email?.toLowerCase() || "";

  if (!currentAuthId) {
    throw new Error("You must be logged in to submit a review.");
  }

  // 2. Verify that the order exists, belongs to the customer, and is Delivered
  const { data: order, error: orderErr } = await (supabase.from("orders") as any)
    .select("id, status, customer_id, customer_email, customer_name, order_number")
    .or(`id.eq.${orderId},order_number.eq.${orderId}`)
    .maybeSingle();

  if (orderErr || !order) {
    throw new Error("Order record not found.");
  }

  const isOwner =
    (order.customer_id && order.customer_id === currentAuthId) ||
    (order.customer_email &&
      currentAuthEmail &&
      order.customer_email.toLowerCase() === currentAuthEmail);

  if (!isOwner && currentAuthId) {
    throw new Error("You can only review orders placed under your account.");
  }

  const normalizedStatus = (order.status || "").toLowerCase();
  if (normalizedStatus !== "delivered" && normalizedStatus !== "completed") {
    throw new Error("You can only rate and review products once the order has been delivered.");
  }

  // 3. Reliably resolve Customer Profile Name & Email (Never null)
  let resolvedCustomerName = explicitCustomerName?.trim() || "";
  let resolvedCustomerEmail = currentAuthEmail || order.customer_email || "";

  // Query real profile from profiles table
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", currentAuthId)
      .maybeSingle();

    if (profile?.full_name?.trim()) {
      resolvedCustomerName = profile.full_name.trim();
    }
    if (profile?.email?.trim()) {
      resolvedCustomerEmail = profile.email.trim();
    }
  } catch (profFetchErr) {
    console.warn("Notice: profile fetch for review submission:", profFetchErr);
  }

  // Check order record
  if (!resolvedCustomerName && order.customer_name?.trim()) {
    resolvedCustomerName = order.customer_name.trim();
  }

  // Check user metadata from Auth
  if (!resolvedCustomerName && authUser?.user?.user_metadata?.full_name?.trim()) {
    resolvedCustomerName = authUser.user.user_metadata.full_name.trim();
  }
  if (!resolvedCustomerName && authUser?.user?.user_metadata?.name?.trim()) {
    resolvedCustomerName = authUser.user.user_metadata.name.trim();
  }

  // Check passed-in userName if not generic
  if (
    !resolvedCustomerName &&
    userName?.trim() &&
    userName.trim().toLowerCase() !== "verified customer" &&
    userName.trim().toLowerCase() !== "customer"
  ) {
    resolvedCustomerName = userName.trim();
  }

  // Check email prefix as last profile resolution step
  if (!resolvedCustomerName && resolvedCustomerEmail) {
    resolvedCustomerName = resolvedCustomerEmail.split("@")[0];
  }

  // If customer name still cannot be found, stop and display a clean error
  if (!resolvedCustomerName) {
    throw new Error(
      "Unable to retrieve customer profile name. Please update your profile in Account Settings before submitting a review.",
    );
  }

  // Fetch product name for schema compatibility if present
  let resolvedProductName = "";
  try {
    const { data: prod } = await supabase
      .from("products")
      .select("name")
      .eq("id", productId)
      .maybeSingle();
    if (prod?.name) resolvedProductName = prod.name;
  } catch (err) {
    console.warn("Product name lookup notice:", err);
  }

  // 4. Prevent duplicate reviews for the same order and product
  try {
    const { data: existingReviews } = await (supabase.from("reviews") as any)
      .select("*")
      .eq("product_id", productId);

    if (existingReviews && existingReviews.length > 0) {
      const alreadyReviewed = existingReviews.some((r: any) => {
        const norm = normalizeReviewRecord(r);
        return (
          norm.order_id === orderId && (norm.user_id === currentAuthId || norm.user_id === userId)
        );
      });
      if (alreadyReviewed) {
        throw new Error("You have already submitted a review for this order.");
      }
    }
  } catch (dupErr: any) {
    if (dupErr?.message?.includes("already submitted")) {
      throw dupErr;
    }
  }

  // 5. Insert review into Supabase with multi-tier candidate payloads
  let newReview: any = null;

  // Build embedded fallback metadata tag in case columns are not in schema cache
  const metaTag = `[ORDER_ID:${order.id || orderId}][QUALITY:${productQualityRating}][AGENT:${deliveryAgentRating}|${deliveryAgentName || ""}]`;
  const fallbackComment = comment?.trim()
    ? `${comment.trim()}\n\n${metaTag}`
    : `Verified Customer Review\n\n${metaTag}`;

  // Candidate 1: Migration 00021 standard schema (product_id, customer_id, customer_name, customer_email, rating, title, review, status, verified_purchase)
  const migration21Payload: any = {
    product_id: productId,
    customer_id: currentAuthId,
    customer_name: resolvedCustomerName,
    customer_email: resolvedCustomerEmail || null,
    rating: Math.min(5, Math.max(1, Math.round(rating))),
    title: "Verified Customer Review",
    review: fallbackComment,
    status: "approved",
    verified_purchase: true,
  };

  // Candidate 2: Extended schema (order_id, product_quality_rating, delivery_agent_rating, etc.)
  const extendedPayload: any = {
    order_id: order.id || orderId,
    product_id: productId,
    user_id: currentAuthId,
    customer_id: currentAuthId,
    user_name: resolvedCustomerName,
    customer_name: resolvedCustomerName,
    customer_email: resolvedCustomerEmail || null,
    rating: Math.min(5, Math.max(1, Math.round(rating))),
    title: "Verified Customer Review",
    review: fallbackComment,
    comment: fallbackComment,
    status: "approved",
    verified_purchase: true,
    product_quality_rating: Math.min(5, Math.max(1, Math.round(productQualityRating))),
    delivery_agent_rating: Math.min(5, Math.max(1, Math.round(deliveryAgentRating))),
    delivery_agent_id: deliveryAgentId || null,
    delivery_agent_name: deliveryAgentName?.trim() || null,
  };
  if (resolvedProductName) {
    extendedPayload.product_name = resolvedProductName;
  }

  // Candidate 3: Minimal Migration 21 (product_id, customer_id, customer_name, rating, review)
  const minimalReviewPayload: any = {
    product_id: productId,
    customer_id: currentAuthId,
    customer_name: resolvedCustomerName,
    rating: Math.min(5, Math.max(1, Math.round(rating))),
    review: fallbackComment,
    status: "approved",
  };

  // Candidate 4: Migration 00022 comment schema (product_id, user_id, user_name, rating, comment)
  const migration22Payload: any = {
    product_id: productId,
    user_id: currentAuthId,
    user_name: resolvedCustomerName,
    customer_name: resolvedCustomerName,
    rating: Math.min(5, Math.max(1, Math.round(rating))),
    comment: fallbackComment,
  };

  const candidatePayloads = [
    migration21Payload,
    extendedPayload,
    minimalReviewPayload,
    migration22Payload,
  ];

  let lastInsertError: any = null;
  for (const payload of candidatePayloads) {
    try {
      const { data, error } = await (supabase.from("reviews") as any)
        .insert([payload])
        .select()
        .single();

      if (!error && data) {
        newReview = normalizeReviewRecord({
          ...data,
          order_id: order.id || orderId,
          product_quality_rating: productQualityRating,
          delivery_agent_rating: deliveryAgentRating,
          delivery_agent_name: deliveryAgentName,
        });
        lastInsertError = null;
        break;
      } else if (error) {
        lastInsertError = error;
      }
    } catch (e: any) {
      lastInsertError = e;
    }
  }

  if (!newReview) {
    throw new Error(lastInsertError?.message || "Failed to submit customer review.");
  }

  // 4. Update Product Rating & Reviews Count in Database
  try {
    const { data: allProdReviews } = await (supabase.from("reviews") as any)
      .select("rating")
      .eq("product_id", productId);

    if (allProdReviews && allProdReviews.length > 0) {
      const avg =
        allProdReviews.reduce((sum: number, r: any) => sum + Number(r.rating || 5), 0) /
        allProdReviews.length;
      await (supabase.from("products") as any)
        .update({
          rating: Number(avg.toFixed(2)),
          reviews_count: allProdReviews.length,
        })
        .eq("id", productId);
    }
  } catch (prodUpdateErr) {
    console.warn("Product rating recalculation notice:", prodUpdateErr);
  }

  // 5. Update Delivery Agent Rating if agent associated
  try {
    if (deliveryAgentId || deliveryAgentName) {
      const { data: allReviews } = await (supabase.from("reviews") as any).select("*");
      if (allReviews && allReviews.length > 0) {
        const normalizedList: ReviewRecord[] = allReviews.map(normalizeReviewRecord);
        const ratedReviews = normalizedList.filter(
          (r: ReviewRecord) =>
            r.delivery_agent_rating &&
            ((deliveryAgentId && r.delivery_agent_id === deliveryAgentId) ||
              (deliveryAgentName &&
                r.delivery_agent_name?.toLowerCase() === deliveryAgentName.toLowerCase()) ||
              (deliveryAgentName &&
                r.comment?.toLowerCase().includes(deliveryAgentName.toLowerCase()))),
        );

        if (ratedReviews.length > 0) {
          const agentAvg =
            ratedReviews.reduce(
              (sum: number, r: ReviewRecord) => sum + Number(r.delivery_agent_rating || 5),
              0,
            ) / ratedReviews.length;

          try {
            const metaRaw = localStorage.getItem("jss_delivery_agents_meta_v1");
            const meta = metaRaw ? JSON.parse(metaRaw) : {};
            const key = deliveryAgentId || "da-101-dave-jenkins";
            meta[key] = { ...(meta[key] || {}), rating: Number(agentAvg.toFixed(2)) };
            localStorage.setItem("jss_delivery_agents_meta_v1", JSON.stringify(meta));
          } catch {
            // ignore
          }
        }
      }
    }
  } catch (agentUpdateErr) {
    console.warn("Delivery agent rating recalculation notice:", agentUpdateErr);
  }

  // 6. Notify Staff
  try {
    await (supabase.from("notifications") as any).insert([
      {
        user_id: null,
        title: `New Customer Review (${rating}★)`,
        message: `${userName} submitted a review for Order #${order.order_number}.`,
        category: "Reviews",
        link: "/admin/reviews",
        read: false,
        is_read: false,
      },
    ]);
  } catch (notifErr) {
    console.warn("Review notification notice:", notifErr);
  }

  return newReview;
}

/**
 * Loads reviews for a specific order.
 */
export async function getOrderReviews(orderId: string): Promise<ReviewRecord[]> {
  try {
    const { data, error } = await (supabase.from("reviews") as any)
      .select("*, product:products(name, slug, image_url)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!data) return [];

    return data.map(normalizeReviewRecord).filter((r: ReviewRecord) => r.order_id === orderId);
  } catch (err) {
    console.warn("Failed to load order reviews:", err);
    return [];
  }
}

/**
 * Loads reviews for a product with breakdown statistics.
 */
export async function getProductReviews(productId: string) {
  try {
    const { data, error } = await (supabase.from("reviews") as any)
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    const rawReviews: any[] = data || [];
    const reviews: ReviewRecord[] = rawReviews.map(normalizeReviewRecord);

    const total = reviews.length;
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let qualitySum = 0;
    let qualityCount = 0;
    let agentSum = 0;
    let agentCount = 0;

    reviews.forEach((r) => {
      const rounded = Math.min(5, Math.max(1, Math.round(r.rating || 5)));
      breakdown[rounded as keyof typeof breakdown] =
        (breakdown[rounded as keyof typeof breakdown] || 0) + 1;

      if (r.product_quality_rating) {
        qualitySum += Number(r.product_quality_rating);
        qualityCount++;
      }
      if (r.delivery_agent_rating) {
        agentSum += Number(r.delivery_agent_rating);
        agentCount++;
      }
    });

    const averageRating =
      total > 0
        ? Number((reviews.reduce((sum, r) => sum + (r.rating || 5), 0) / total).toFixed(1))
        : 5.0;

    const averageQuality = qualityCount > 0 ? Number((qualitySum / qualityCount).toFixed(1)) : null;

    const averageDelivery = agentCount > 0 ? Number((agentSum / agentCount).toFixed(1)) : null;

    return {
      reviews,
      total,
      averageRating,
      averageQuality,
      averageDelivery,
      breakdown,
    };
  } catch (err) {
    console.warn("Failed to load product reviews:", err);
    return {
      reviews: [],
      total: 0,
      averageRating: 5.0,
      averageQuality: null,
      averageDelivery: null,
      breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    };
  }
}

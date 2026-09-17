import { useState } from "react";
import {
  Star,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Truck,
  Package,
  MessageSquare,
  Heart,
  Send,
  Flame,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createCustomerReview } from "@/lib/review-service";
import { useStore, gbp } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { cleanImageUrl, cn } from "@/lib/utils";

interface OrderReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  product: {
    id: string;
    name: string;
    image_url?: string | null;
  };
  deliveryAgent?: {
    id?: string | null;
    name?: string | null;
  };
  onReviewSubmitted?: (review: any) => void;
}

// Exact dynamic rating colour system:
// 0 / Default -> Neutral (Select a rating)
// 1 Star -> RED (Poor)
// 2 Stars -> RED (Below Average)
// 3 Stars -> YELLOW / AMBER (Good)
// 4 Stars -> GREEN (Very Good)
// 5 Stars -> GREEN (Excellent)
const getRatingDetails = (rating: number) => {
  if (rating === 0) {
    return {
      label: "Select a rating",
      starColor: "text-slate-200 fill-none",
      badgeClass: "bg-slate-100 text-slate-500 font-medium text-[11px]",
    };
  }
  if (rating === 1) {
    return {
      label: "Poor",
      starColor: "text-red-500 fill-red-500",
      badgeClass: "bg-red-100 text-red-700 font-extrabold text-xs shadow-2xs",
    };
  }
  if (rating === 2) {
    return {
      label: "Below Average",
      starColor: "text-red-500 fill-red-500",
      badgeClass: "bg-red-100 text-red-700 font-extrabold text-xs shadow-2xs",
    };
  }
  if (rating === 3) {
    return {
      label: "Good",
      starColor: "text-amber-400 fill-amber-400",
      badgeClass: "bg-amber-100 text-amber-800 font-extrabold text-xs shadow-2xs",
    };
  }
  if (rating === 4) {
    return {
      label: "Very Good",
      starColor: "text-emerald-500 fill-emerald-500",
      badgeClass: "bg-emerald-100 text-emerald-800 font-extrabold text-xs shadow-2xs",
    };
  }
  return {
    label: "Excellent",
    starColor: "text-emerald-500 fill-emerald-500",
    badgeClass: "bg-emerald-100 text-emerald-800 font-extrabold text-xs shadow-2xs",
  };
};

interface StarRatingSelectorProps {
  value: number;
  onChange: (val: number) => void;
}

function StarRatingSelector({ value, onChange }: StarRatingSelectorProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const activeRating = hovered !== null ? hovered : value;
  const ratingDetails = getRatingDetails(activeRating);

  return (
    <div className="flex items-center gap-3 shrink-0">
      {/* 5-Star Interactive Group */}
      <div className="flex items-center gap-1 sm:gap-1.5" onMouseLeave={() => setHovered(null)}>
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= activeRating;

          return (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              onMouseEnter={() => setHovered(star)}
              className="p-1 sm:p-1.5 rounded-xl transition-transform duration-150 active:scale-90 hover:scale-125 focus:outline-hidden touch-manipulation group"
              aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
            >
              <Star
                className={cn(
                  "h-7 w-7 sm:h-7.5 sm:w-7.5 transition-all duration-200 ease-out",
                  isFilled
                    ? `${ratingDetails.starColor} scale-105`
                    : "text-slate-200 fill-none stroke-[1.5] group-hover:text-slate-300",
                )}
              />
            </button>
          );
        })}
      </div>

      {/* Dynamic Rating Label Badge (Fixed width container prevents layout shifts) */}
      <div className="w-24 sm:w-28 flex justify-center shrink-0">
        <span
          className={cn(
            "px-3 py-1 rounded-full text-center tracking-wide transition-all duration-200 block w-full truncate",
            ratingDetails.badgeClass,
          )}
        >
          {ratingDetails.label}
        </span>
      </div>
    </div>
  );
}

export function OrderReviewModal({
  isOpen,
  onClose,
  order,
  product,
  deliveryAgent,
  onReviewSubmitted,
}: OrderReviewModalProps) {
  const { user } = useStore();

  // Ratings default to 0 (unselected)
  const [productRating, setProductRating] = useState<number>(0);
  const [qualityRating, setQualityRating] = useState<number>(0);
  const [deliveryRating, setDeliveryRating] = useState<number>(0);

  // Written review state
  const [comment, setComment] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);

  // First item details for the top card
  const firstItem = order?.order_items?.[0] || null;
  const productName =
    product?.name || firstItem?.product_name || firstItem?.name || "LPG Gas Cylinder";
  const itemQty = firstItem?.quantity || 1;
  const itemPrice = Number(firstItem?.unit_price || firstItem?.price || order?.total || 36.0);
  const itemImage = product?.image_url || firstItem?.product_info?.image_url;

  // Agent Name / ID
  const agentName =
    deliveryAgent?.name ||
    order?.delivery_assignments?.[0]?.driver_name ||
    order?.assigned_driver ||
    "Delivery Specialist";

  const agentId = deliveryAgent?.id || order?.delivery_assignments?.[0]?.agent_id || null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (productRating === 0 || qualityRating === 0 || deliveryRating === 0) {
      toast.error("Please provide a rating for all 3 categories.");
      return;
    }

    const currentUserId = user?.id || (await supabase.auth.getUser()).data.user?.id;
    if (!currentUserId) {
      toast.error("Please sign in to submit a review.");
      return;
    }

    if (!order?.id || !product?.id) {
      toast.error("Order or product reference is missing.");
      return;
    }

    setSubmitting(true);
    try {
      const review = await createCustomerReview({
        orderId: order.id,
        productId: product.id,
        userId: currentUserId,
        userName: user?.name || "",
        customerName: user?.name || "",
        rating: productRating,
        productQualityRating: qualityRating,
        deliveryAgentRating: deliveryRating,
        deliveryAgentId: agentId,
        deliveryAgentName: agentName,
        comment: comment.trim() || undefined,
      });

      setSubmitted(true);
      toast.success("Thank you! Your verified review has been submitted.");
      if (onReviewSubmitted) {
        onReviewSubmitted(review);
      }

      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 1400);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !submitting && onClose()}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-3xl border-slate-200 bg-white shadow-2xl">
        {submitted ? (
          <div className="p-10 text-center space-y-4 my-auto">
            <div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100 shadow-xs">
              <CheckCircle2 className="h-8 w-8 stroke-[2.5]" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-display font-black text-slate-900">Review Submitted!</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                Thank you for reviewing <strong className="text-slate-900">{productName}</strong>.
                Your feedback helps us continually improve our products and forecourt delivery
                service.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-6 pb-4 border-b border-slate-100 text-left relative">
              <div className="flex items-center gap-1.5 text-primary text-[11px] font-extrabold uppercase tracking-wider">
                <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                <span>SHARE YOUR FEEDBACK</span>
              </div>
              <DialogTitle className="text-xl sm:text-2xl font-display font-black text-slate-900 tracking-tight mt-1">
                Rate & Review Order #{order?.order_number || order?.id?.slice(0, 8) || ""}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-medium mt-0.5">
                Your feedback helps us serve you better!
              </DialogDescription>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[calc(92vh-160px)]">
              {/* 1. Purchased Product Info Card */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3.5">
                <div className="h-14 w-14 rounded-xl bg-white border border-slate-200/80 p-1 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                  {itemImage ? (
                    <img
                      src={cleanImageUrl(itemImage, product?.id)}
                      alt={productName}
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.svg";
                      }}
                    />
                  ) : (
                    <Flame className="h-6 w-6 text-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate leading-snug">
                    {productName}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Quantity: <span className="font-semibold text-slate-700">{itemQty}</span> |
                    Price: <span className="font-semibold text-slate-700">{gbp(itemPrice)}</span>
                  </p>
                </div>
              </div>

              {/* 2. Rating Row 1: How was the product? */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs hover:border-slate-300 transition-colors">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="h-10 w-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0 text-rose-500">
                    <Package className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                      How was the product?
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Rate your overall experience with this product.
                    </p>
                  </div>
                </div>

                <div className="self-end sm:self-center">
                  <StarRatingSelector value={productRating} onChange={setProductRating} />
                </div>
              </div>

              {/* 3. Rating Row 2: How was the product quality? */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs hover:border-slate-300 transition-colors">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 text-emerald-600">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                      How was the product quality?
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Rate the quality of the product.
                    </p>
                  </div>
                </div>

                <div className="self-end sm:self-center">
                  <StarRatingSelector value={qualityRating} onChange={setQualityRating} />
                </div>
              </div>

              {/* 4. Rating Row 3: How was the driver's service? */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs hover:border-slate-300 transition-colors">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 text-emerald-600">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                      How was the driver's service?
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Rate the driver's behaviour and delivery service.
                    </p>
                  </div>
                </div>

                <div className="self-end sm:self-center">
                  <StarRatingSelector value={deliveryRating} onChange={setDeliveryRating} />
                </div>
              </div>

              {/* 5. Written Review Section (Optional) */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0 text-slate-600 mt-0.5">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      Tell us about your experience (Optional)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Share your experience with the product and delivery. Your feedback is valuable
                      to us.
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <Textarea
                    value={comment}
                    maxLength={500}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Write your review here..."
                    className="rounded-2xl bg-white border-slate-200 text-xs min-h-[90px] focus-visible:ring-primary p-3.5 leading-relaxed"
                  />
                  <span className="absolute bottom-2.5 right-3 text-[10px] font-mono text-slate-400 font-semibold pointer-events-none">
                    {comment.length}/500
                  </span>
                </div>

                {/* Friendly Feedback Note */}
                <div className="bg-rose-50/80 border border-rose-100 rounded-xl p-2.5 px-3 flex items-center gap-2 text-rose-600 text-[11px] font-semibold">
                  <Heart className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                  <span>Thank you! Your feedback helps us improve our products and services.</span>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 sm:p-5 px-6 border-t border-slate-100 flex items-center justify-end gap-2.5 bg-white">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={submitting}
                className="rounded-full text-xs font-bold px-5 h-9 border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="rounded-full text-xs font-extrabold bg-red-600 hover:bg-red-700 text-white px-6 h-9 gap-1.5 shadow-md"
              >
                {submitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Submit Review
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

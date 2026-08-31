import { useState, useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Star,
  Search,
  Trash2,
  Filter,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Package,
  Calendar,
  User,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { logAdminAuditAction } from "@/lib/audit";

interface ReviewRecord {
  id: string;
  product_id: string;
  user_id: string;
  user_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
  product?: {
    name: string;
    slug: string;
    image_url: string | null;
  };
}

export function AdminReviewsView() {
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedReview, setSelectedReview] = useState<ReviewRecord | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadReviews = async () => {
    setLoading(true);
    try {
      // Fetch reviews with joined product information
      const { data, error } = await supabase
        .from("reviews")
        .select("*, product:products(name, slug, image_url)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReviews((data as any) || []);
    } catch (err: any) {
      console.error("Failed to load reviews:", err);
      toast.error("Failed to load reviews: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();

    // Supabase Realtime subscription on public.reviews
    const channel = supabase
      .channel("admin_reviews_live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reviews" },
        () => loadReviews()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const matchesSearch =
        (r.user_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.comment || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.product?.name || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRating =
        ratingFilter === "all" ? true : r.rating === parseInt(ratingFilter, 10);

      return matchesSearch && matchesRating;
    });
  }, [reviews, searchQuery, ratingFilter]);

  // Key performance metrics
  const stats = useMemo(() => {
    const total = reviews.length;
    if (total === 0) return { total: 0, avg: 0, fiveStar: 0, lowStar: 0 };
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    const avg = (sum / total).toFixed(1);
    const fiveStar = reviews.filter((r) => r.rating === 5).length;
    const lowStar = reviews.filter((r) => r.rating <= 2).length;
    return { total, avg, fiveStar, lowStar };
  }, [reviews]);

  const confirmDeleteReview = async () => {
    if (!selectedReview) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("reviews")
        .delete()
        .eq("id", selectedReview.id);

      if (error) throw error;

      await logAdminAuditAction("DELETE_REVIEW", "reviews", selectedReview.id, {
        userName: selectedReview.user_name,
        rating: selectedReview.rating,
        productId: selectedReview.product_id,
      });

      toast.success("Review deleted successfully.");
      setDeletingId(null);
      setSelectedReview(null);
      loadReviews();
    } catch (err: any) {
      console.error("Delete review error:", err);
      toast.error("Failed to delete review: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/admin" className="hover:text-primary transition-colors">Admin</Link>
            <span>/</span>
            <span className="text-foreground">Reviews</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Star className="h-7 w-7 text-amber-500 fill-amber-500" /> Customer Product Reviews
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Moderate, review and audit all customer product ratings and reviews submitted across the storefront.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="surface-card p-5 rounded-3xl border bg-white shadow-2xs space-y-1">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Reviews</p>
          <p className="text-3xl font-black text-slate-900">{stats.total}</p>
          <p className="text-[11px] text-muted-foreground">Submitted by verified customers</p>
        </div>

        <div className="surface-card p-5 rounded-3xl border bg-white shadow-2xs space-y-1">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Average Rating</p>
          <div className="flex items-center gap-2">
            <p className="text-3xl font-black text-slate-900">{stats.avg}</p>
            <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
          </div>
          <p className="text-[11px] text-muted-foreground">Out of 5.0 maximum</p>
        </div>

        <div className="surface-card p-5 rounded-3xl border bg-white shadow-2xs space-y-1">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">5-Star Reviews</p>
          <p className="text-3xl font-black text-emerald-600">{stats.fiveStar}</p>
          <p className="text-[11px] text-muted-foreground">Top customer satisfaction</p>
        </div>

        <div className="surface-card p-5 rounded-3xl border bg-white shadow-2xs space-y-1">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Attention Needed (1-2★)</p>
          <p className="text-3xl font-black text-red-600">{stats.lowStar}</p>
          <p className="text-[11px] text-muted-foreground">Low ratings requiring review</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="surface-card p-4 rounded-3xl border bg-white shadow-2xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer, product, or comment..."
            className="pl-9 rounded-full bg-slate-50 border-slate-200 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={ratingFilter} onValueChange={setRatingFilter}>
            <SelectTrigger className="w-40 rounded-full text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="All Ratings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ratings (1-5★)</SelectItem>
              <SelectItem value="5">5 Stars ★★★★★</SelectItem>
              <SelectItem value="4">4 Stars ★★★★☆</SelectItem>
              <SelectItem value="3">3 Stars ★★★☆☆</SelectItem>
              <SelectItem value="2">2 Stars ★★☆☆☆</SelectItem>
              <SelectItem value="1">1 Star ★☆☆☆☆</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="surface-card rounded-3xl border bg-white overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground font-bold">
            Loading reviews from Supabase...
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <h3 className="font-bold text-sm text-foreground">No customer reviews found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Reviews submitted by customers on product pages will appear here.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="font-bold text-xs">Customer</TableHead>
                <TableHead className="font-bold text-xs">Product</TableHead>
                <TableHead className="font-bold text-xs">Rating</TableHead>
                <TableHead className="font-bold text-xs">Comment</TableHead>
                <TableHead className="font-bold text-xs">Date</TableHead>
                <TableHead className="font-bold text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReviews.map((r) => (
                <TableRow key={r.id} className="hover:bg-slate-50/60 transition-colors">
                  <TableCell className="font-bold text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs">
                        {(r.user_name || "C").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-extrabold text-foreground">{r.user_name || "Customer"}</p>
                        <p className="text-[10px] text-muted-foreground font-normal">ID: {r.id.slice(0, 8)}</p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-xs font-semibold text-foreground">
                    {r.product ? (
                      <Link
                        to={`/products/${r.product.slug}` as any}
                        target="_blank"
                        className="flex items-center gap-1.5 hover:text-primary transition-colors group"
                      >
                        <span className="truncate max-w-[180px]">{typeof r.product.name === "string" ? r.product.name : String(r.product.name || "")}</span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary shrink-0" />
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Product #{r.product_id.slice(0, 8)}</span>
                    )}
                  </TableCell>

                  <TableCell className="text-xs">
                    <div className="flex items-center gap-1">
                      <span className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${
                              i < r.rating ? "text-amber-500 fill-amber-500" : "text-slate-200"
                            }`}
                          />
                        ))}
                      </span>
                      <span className="font-extrabold text-[11px] ml-1">{r.rating}/5</span>
                    </div>
                  </TableCell>

                  <TableCell className="text-xs text-slate-600 max-w-xs">
                    <p className="line-clamp-2 leading-relaxed">
                      {r.comment || <span className="italic text-muted-foreground">No written comment</span>}
                    </p>
                  </TableCell>

                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(r.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>

                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedReview(r);
                        setDeletingId(r.id);
                      }}
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Moderate / Delete Review
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to permanently remove this review by{" "}
              <strong className="text-foreground">{selectedReview?.user_name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedReview && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border text-xs space-y-1.5">
              <div className="flex items-center gap-1">
                <span className="font-bold">Rating:</span>
                <span className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3 w-3 ${
                        i < selectedReview.rating ? "text-amber-500 fill-amber-500" : "text-slate-200"
                      }`}
                    />
                  ))}
                </span>
              </div>
              <p className="text-slate-700 italic">"{typeof selectedReview.comment === "string" ? selectedReview.comment : String(selectedReview.comment || "")}"</p>
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setDeletingId(null)}
              className="rounded-full text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={actionLoading}
              onClick={confirmDeleteReview}
              className="rounded-full text-xs font-bold"
            >
              {actionLoading ? "Deleting..." : "Delete Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

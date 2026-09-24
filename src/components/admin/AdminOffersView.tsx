import { useState, useEffect, useMemo } from "react";
import {
  Tag,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Percent,
  PoundSterling,
  Sparkles,
  ShoppingBag,
  Layers,
  Award,
  Share2,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Eye,
  RefreshCw,
  Sliders,
  Check,
  X,
  Package,
  Code2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { categories as defaultCategories, products as fallbackProducts } from "@/data/catalog";
import { gbp } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import {
  fetchAllAdminOffers,
  createOffer,
  updateOffer,
  deleteOffer,
  fetchOfferRedemptions,
  type Offer,
  type OfferCategory,
  type DiscountType,
  type OfferStatus,
  type TargetScope,
  type CustomerTargetRule,
  type OfferRedemption,
  type CustomConditionLeaf,
  type CustomConditionGroup,
} from "@/lib/offer-service";

export function AdminOffersView() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [redemptions, setRedemptions] = useState<OfferRedemption[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"product_based" | "customer_target_based" | "redemptions">("product_based");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Product Picker state
  const [productSearchQuery, setProductSearchQuery] = useState("");

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState<Offer | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    code: "",
    description: "",
    badge: "Special Offer",
    offer_category: "product_based" as OfferCategory,
    discount_type: "percentage" as DiscountType,
    discount_value: 10,
    max_discount_cap: "" as string | number,
    min_order_subtotal: 0,
    status: "active" as OfferStatus,
    target_scope: "all_products" as TargetScope,
    target_category_slugs: [] as string[],
    target_product_ids: [] as string[],
    target_customer_rule: "all_customers" as CustomerTargetRule,
    spend_threshold_amount: 50,
    spend_period_days: 30,
    order_count_target: 5,
    consecutive_days_window: 30,
    custom_operator: "AND" as "AND" | "OR",
    custom_conditions: [] as CustomConditionLeaf[],
    total_usage_limit: "" as string | number,
    per_customer_limit: 1,
    is_publicly_listed: true,
    show_promotional_banner: false,
    banner_placement: "top_header",
    starts_at: "",
    ends_at: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [offersData, redemptionsData, productsRes] = await Promise.all([
        fetchAllAdminOffers(),
        fetchOfferRedemptions(),
        supabase.from("products").select("id, name, price, category_slug, sku").order("name"),
      ]);
      setOffers(offersData);
      setRedemptions(redemptionsData);

      if (productsRes.data && productsRes.data.length > 0) {
        setCatalogProducts(productsRes.data);
      } else {
        setCatalogProducts(
          fallbackProducts.map((p) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            category_slug: p.category,
            sku: (p as any).sku || "",
          }))
        );
      }
    } catch (err: any) {
      toast.error("Failed to load offers: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = (category: OfferCategory = "product_based") => {
    setEditingOffer(null);
    setProductSearchQuery("");
    setFormData({
      title: "",
      code: "",
      description: "",
      badge: category === "product_based" ? "10% Off" : "Customer Reward",
      offer_category: category,
      discount_type: "percentage",
      discount_value: 10,
      max_discount_cap: "",
      min_order_subtotal: 0,
      status: "active",
      target_scope: "all_products",
      target_category_slugs: [],
      target_product_ids: [],
      target_customer_rule: category === "customer_target_based" ? "new_customer" : "all_customers",
      spend_threshold_amount: 50,
      spend_period_days: 30,
      order_count_target: 5,
      consecutive_days_window: 30,
      custom_operator: "AND",
      custom_conditions: [
        { type: "min_cart_subtotal", value: 50 },
      ],
      total_usage_limit: "",
      per_customer_limit: 1,
      is_publicly_listed: true,
      show_promotional_banner: false,
      banner_placement: "top_header",
      starts_at: "",
      ends_at: "",
    });
    setIsCreateModalOpen(true);
  };

  const openEditModal = (offer: Offer) => {
    setEditingOffer(offer);
    setProductSearchQuery("");

    let initialOp: "AND" | "OR" = "AND";
    let initialConds: CustomConditionLeaf[] = [];

    if (offer.eligibility_conditions) {
      initialOp = offer.eligibility_conditions.operator || "AND";
      const raw = offer.eligibility_conditions.conditions || offer.eligibility_conditions.rules || [];
      if (Array.isArray(raw)) {
        initialConds = raw.map((c: any) => ({
          type: c.type || "min_cart_subtotal",
          value: c.value ?? 50,
          days: c.days ?? 30,
          category: c.category || "",
          product_id: c.product_id || "",
          code: c.code || "",
        }));
      }
    }

    setFormData({
      title: offer.title,
      code: offer.code || "",
      description: offer.description || "",
      badge: offer.badge || "Special Offer",
      offer_category: offer.offer_category || "product_based",
      discount_type: offer.discount_type || "percentage",
      discount_value: offer.discount_value,
      max_discount_cap: offer.max_discount_cap ?? "",
      min_order_subtotal: offer.min_order_subtotal || 0,
      status: offer.status || "active",
      target_scope: offer.target_scope || "all_products",
      target_category_slugs: offer.target_category_slugs || [],
      target_product_ids: offer.target_product_ids || [],
      target_customer_rule: offer.target_customer_rule || "all_customers",
      spend_threshold_amount: offer.spend_threshold_amount || 50,
      spend_period_days: offer.spend_period_days || 30,
      order_count_target: offer.order_count_target || 5,
      consecutive_days_window: offer.consecutive_days_window || 30,
      custom_operator: initialOp,
      custom_conditions: initialConds.length > 0 ? initialConds : [{ type: "min_cart_subtotal", value: 50 }],
      total_usage_limit: offer.total_usage_limit ?? "",
      per_customer_limit: offer.per_customer_limit || 1,
      is_publicly_listed: offer.is_publicly_listed !== false,
      show_promotional_banner: Boolean(offer.show_promotional_banner),
      banner_placement: offer.banner_placement || "top_header",
      starts_at: offer.starts_at ? offer.starts_at.slice(0, 16) : "",
      ends_at: offer.ends_at ? offer.ends_at.slice(0, 16) : "",
    });
    setIsCreateModalOpen(true);
  };

  // Add custom condition row
  const handleAddCondition = () => {
    setFormData((prev) => ({
      ...prev,
      custom_conditions: [
        ...prev.custom_conditions,
        { type: "min_cart_subtotal", value: 50 },
      ],
    }));
  };

  // Remove custom condition row
  const handleRemoveCondition = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      custom_conditions: prev.custom_conditions.filter((_, i) => i !== index),
    }));
  };

  // Update custom condition row
  const handleUpdateCondition = (index: number, updates: Partial<CustomConditionLeaf>) => {
    setFormData((prev) => {
      const copy = [...prev.custom_conditions];
      copy[index] = { ...copy[index], ...updates };
      return { ...prev, custom_conditions: copy };
    });
  };

  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      return toast.error("Please provide an offer title.");
    }
    if (Number(formData.discount_value) <= 0) {
      return toast.error("Discount value must be greater than 0.");
    }

    // Validation for specific products
    if (formData.target_scope === "specific_products" && formData.target_product_ids.length === 0) {
      return toast.error("Please select at least one product for Specific Products scope.");
    }

    setSubmitting(true);
    try {
      const eligibilityPayload = {
        operator: formData.custom_operator,
        conditions: formData.custom_conditions,
      };

      const payload: any = {
        title: formData.title.trim(),
        code: formData.code ? formData.code.trim().toUpperCase() : null,
        description: formData.description.trim() || null,
        badge: formData.badge.trim() || "Special Offer",
        offer_category: formData.offer_category,
        discount_type: formData.discount_type,
        discount_value: Number(formData.discount_value),
        max_discount_cap: formData.max_discount_cap ? Number(formData.max_discount_cap) : null,
        min_order_subtotal: Number(formData.min_order_subtotal || 0),
        status: formData.status,
        target_scope: formData.target_scope,
        target_category_slugs: formData.target_category_slugs,
        target_product_ids: formData.target_scope === "specific_products" ? formData.target_product_ids : [],
        target_customer_rule: formData.target_customer_rule,
        spend_threshold_amount: Number(formData.spend_threshold_amount || 0),
        spend_period_days: Number(formData.spend_period_days || 30),
        order_count_target: Number(formData.order_count_target || 1),
        consecutive_days_window: Number(formData.consecutive_days_window || 30),
        eligibility_conditions: eligibilityPayload,
        total_usage_limit: formData.total_usage_limit ? Number(formData.total_usage_limit) : null,
        per_customer_limit: Number(formData.per_customer_limit || 1),
        is_publicly_listed: formData.is_publicly_listed,
        show_promotional_banner: formData.show_promotional_banner,
        banner_placement: formData.banner_placement,
        starts_at: formData.starts_at ? new Date(formData.starts_at).toISOString() : null,
        ends_at: formData.ends_at ? new Date(formData.ends_at).toISOString() : null,
        is_active: formData.status === "active",
      };

      if (editingOffer) {
        const res = await updateOffer(editingOffer.id, payload);
        if (!res.ok) throw new Error(res.error);
        toast.success(`Offer "${formData.title}" updated successfully!`);
      } else {
        const res = await createOffer(payload);
        if (!res.ok) throw new Error(res.error);
        toast.success(`Offer "${formData.title}" created successfully!`);
      }

      setIsCreateModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save offer.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (offer: Offer) => {
    const nextStatus: OfferStatus = offer.status === "active" ? "disabled" : "active";
    try {
      const res = await updateOffer(offer.id, { status: nextStatus, is_active: nextStatus === "active" });
      if (!res.ok) throw new Error(res.error);
      toast.success(`Offer is now ${nextStatus}`);
      setOffers((prev) =>
        prev.map((o) => (o.id === offer.id ? { ...o, status: nextStatus, is_active: nextStatus === "active" } : o))
      );
    } catch (err: any) {
      toast.error("Failed to update status: " + err.message);
    }
  };

  const handleDeleteOffer = async () => {
    if (!offerToDelete) return;
    setSubmitting(true);
    try {
      const res = await deleteOffer(offerToDelete.id);
      if (!res.ok) throw new Error(res.error);
      toast.success("Offer deleted successfully.");
      setIsDeleteModalOpen(false);
      setOfferToDelete(null);
      loadData();
    } catch (err: any) {
      toast.error("Failed to delete offer: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Metrics
  const activeOffersCount = offers.filter((o) => o.status === "active").length;
  const productOffersCount = offers.filter((o) => o.offer_category === "product_based").length;
  const customerOffersCount = offers.filter((o) => o.offer_category === "customer_target_based").length;
  const totalRedemptionsCount = redemptions.length;
  const totalDiscountGiven = redemptions.reduce((sum, r) => sum + Number(r.discount_amount || 0), 0);

  // Filtered offers
  const filteredOffers = useMemo(() => {
    return offers.filter((o) => {
      if (activeTab !== "redemptions" && o.offer_category !== activeTab) return false;
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          o.title.toLowerCase().includes(q) ||
          (o.code && o.code.toLowerCase().includes(q)) ||
          (o.description && o.description.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [offers, activeTab, statusFilter, searchQuery]);

  // Filtered catalog products for specific product picker
  const filteredProducts = useMemo(() => {
    if (!productSearchQuery.trim()) return catalogProducts.slice(0, 30);
    const q = productSearchQuery.toLowerCase();
    return catalogProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.category_slug && p.category_slug.toLowerCase().includes(q))
    );
  }, [catalogProducts, productSearchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 font-display flex items-center gap-2.5">
            <Tag className="h-7 w-7 text-primary" />
            Offer & Discount Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage product-level discounts, customer loyalty rules, referral codes, custom AND/OR rules, and promotional banners.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="rounded-xl h-9 text-xs font-bold gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            onClick={() => openCreateModal(activeTab === "customer_target_based" ? "customer_target_based" : "product_based")}
            className="rounded-xl h-9 text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-white shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Create Offer
          </Button>
        </div>
      </div>

      {/* Analytics KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Offers</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-display">{activeOffersCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Live on storefront & cart</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Product Offers</span>
            <ShoppingBag className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-display">{productOffersCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Catalog, category & items</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Customer Target Offers</span>
            <Users className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-display">{customerOffersCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Loyalty, spend & custom rules</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Saved by Customers</span>
            <PoundSterling className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-display">{gbp(totalDiscountGiven)}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">{totalRedemptionsCount} total redemptions</p>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="border-b border-slate-200 px-4 sm:px-6 pt-3 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("product_based")}
              className={`pb-3 px-3.5 text-xs sm:text-sm font-black border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "product_based"
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <ShoppingBag className="h-4 w-4" />
              1. Product-Based Offers ({productOffersCount})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("customer_target_based")}
              className={`pb-3 px-3.5 text-xs sm:text-sm font-black border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "customer_target_based"
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Users className="h-4 w-4" />
              2. Customer / Target Offers ({customerOffersCount})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("redemptions")}
              className={`pb-3 px-3.5 text-xs sm:text-sm font-black border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "redemptions"
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Award className="h-4 w-4" />
              Redemption Audit Log ({totalRedemptionsCount})
            </button>
          </div>

          {activeTab !== "redemptions" && (
            <div className="flex items-center gap-2.5 pb-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <Input
                  placeholder="Search offers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs w-44 sm:w-56 bg-white"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter offers by status"
                className="h-8 text-xs font-semibold rounded-lg border border-slate-200 bg-white px-2 text-slate-700"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6">
          {activeTab === "redemptions" ? (
            /* Redemptions Audit Log Table */
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Real-time log of customer offer redemptions confirmed in checkout.</span>
                <span className="font-bold text-slate-900">{redemptions.length} records</span>
              </div>

              {redemptions.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl">
                  <Award className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">No redemptions recorded yet.</p>
                  <p className="text-[11px] text-slate-400">Offer usages will appear here when customers complete orders.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="p-3">Redeemed At</th>
                        <th className="p-3">Order #</th>
                        <th className="p-3">Customer Email</th>
                        <th className="p-3">Offer Applied</th>
                        <th className="p-3">Promo Code</th>
                        <th className="p-3 text-right">Discount Given</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {redemptions.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/50">
                          <td className="p-3 text-slate-500 whitespace-nowrap">
                            {new Date(r.redeemed_at).toLocaleString("en-GB")}
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-900">{r.order_number}</td>
                          <td className="p-3 text-slate-700">{r.customer_email}</td>
                          <td className="p-3 font-semibold text-slate-900">{r.offer_title}</td>
                          <td className="p-3 font-mono">
                            {r.applied_code ? (
                              <Badge variant="outline" className="font-mono text-[10px] bg-slate-50">
                                {r.applied_code}
                              </Badge>
                            ) : (
                              <span className="text-slate-400 italic">Auto-applied</span>
                            )}
                          </td>
                          <td className="p-3 text-right font-black text-emerald-700">
                            − {gbp(r.discount_amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* Offer Cards List */
            <div>
              {filteredOffers.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl space-y-3">
                  <Tag className="h-10 w-10 text-slate-300 mx-auto" />
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      No {activeTab === "product_based" ? "Product-Based" : "Customer/Target-Based"} Offers Found
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Create your first offer to provide discounts on gas, solid fuels, or customer milestones.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => openCreateModal(activeTab)}
                    className="rounded-xl h-8 text-xs font-bold gap-1 bg-primary hover:bg-primary/90 text-white"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create {activeTab === "product_based" ? "Product Offer" : "Customer Target Offer"}
                  </Button>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredOffers.map((offer) => {
                    const isPercentage = offer.discount_type === "percentage";
                    const isCustomerBased = offer.offer_category === "customer_target_based";

                    return (
                      <div
                        key={offer.id}
                        className={`rounded-2xl border p-4.5 space-y-3.5 transition-all shadow-xs flex flex-col justify-between ${
                          offer.status === "active"
                            ? "bg-white border-slate-200/90 hover:border-slate-300"
                            : "bg-slate-50/60 border-slate-200 opacity-75"
                        }`}
                      >
                        <div className="space-y-2.5">
                          {/* Card Top: Badges & Status */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                              {offer.badge || "Offer"}
                            </span>

                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                                  offer.status === "active"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : offer.status === "draft"
                                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                                      : "bg-slate-100 text-slate-500 border border-slate-200"
                                }`}
                              >
                                {offer.status}
                              </span>
                            </div>
                          </div>

                          {/* Title & Description */}
                          <div>
                            <h3 className="text-sm font-black text-slate-900 font-display">{offer.title}</h3>
                            {offer.description && (
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                {offer.description}
                              </p>
                            )}
                          </div>

                          {/* Discount Value Display */}
                          <div className="flex items-baseline gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                            <span className="text-lg font-black text-primary font-display">
                              {isPercentage ? `${offer.discount_value}% OFF` : `£${offer.discount_value} OFF`}
                            </span>
                            {offer.max_discount_cap ? (
                              <span className="text-[11px] text-slate-500 font-medium">
                                (Up to £{offer.max_discount_cap})
                              </span>
                            ) : null}
                          </div>

                          {/* Target Scope & Conditions */}
                          <div className="space-y-1.5 text-[11px] text-slate-600 font-medium">
                            <div className="flex items-center gap-1.5">
                              <Sliders className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span>
                                {isCustomerBased ? (
                                  <>
                                    Rule: <strong className="text-slate-800 capitalize">{offer.target_customer_rule.replace(/_/g, " ")}</strong>
                                  </>
                                ) : (
                                  <>
                                    Scope: <strong className="text-slate-800 capitalize">{offer.target_scope.replace(/_/g, " ")}</strong>
                                    {offer.target_scope === "category" && offer.target_category_slugs?.length > 0 && ` (${offer.target_category_slugs.join(", ")})`}
                                    {offer.target_scope === "specific_products" && ` (${offer.target_product_ids?.length || 0} items)`}
                                  </>
                                )}
                              </span>
                            </div>

                            {offer.min_order_subtotal > 0 && (
                              <div className="flex items-center gap-1.5 text-slate-500">
                                <span>Min spend: £{offer.min_order_subtotal}</span>
                              </div>
                            )}

                            {offer.code && (
                              <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-slate-900">
                                <span className="text-slate-400 font-normal">Code:</span>
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                  {offer.code}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                              <span>Used: <strong>{offer.total_times_used || 0}</strong>{offer.total_usage_limit ? ` / ${offer.total_usage_limit}` : " times"}</span>
                              {offer.ends_at && (
                                <span>Expires: {new Date(offer.ends_at).toLocaleDateString("en-GB")}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Card Bottom Actions */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(offer)}
                            className="text-[11px] font-bold text-slate-600 hover:text-slate-900 transition-colors"
                          >
                            {offer.status === "active" ? "Disable" : "Activate"}
                          </button>

                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditModal(offer)}
                              className="h-7 w-7 rounded-lg text-slate-600 hover:bg-slate-100"
                              title="Edit Offer"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setOfferToDelete(offer);
                                setIsDeleteModalOpen(true);
                              }}
                              className="h-7 w-7 rounded-lg text-rose-600 hover:bg-rose-50"
                              title="Delete Offer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CREATE / EDIT OFFER MODAL */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 font-display flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              {editingOffer ? "Edit Offer" : "Create New Offer"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Configure discount rules, product scope, customer targeting criteria, and scheduling.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveOffer} className="space-y-5 pt-2">
            {/* Category Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">1. Primary Offer Category</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, offer_category: "product_based" })}
                  className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                    formData.offer_category === "product_based"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <ShoppingBag className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Product-Based</span>
                    <span className="text-[10px] text-slate-500">All products, category, or specific items</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, offer_category: "customer_target_based" })}
                  className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                    formData.offer_category === "customer_target_based"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <Users className="h-4 w-4 text-purple-600 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Customer / Target-Based</span>
                    <span className="text-[10px] text-slate-500">New customer, spending tier, milestone</span>
                  </div>
                </button>
              </div>
            </div>

            {/* General Info */}
            <div className="grid sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <Label htmlFor="of-title" className="text-xs font-bold text-slate-700">
                  Offer Title *
                </Label>
                <Input
                  id="of-title"
                  required
                  placeholder="e.g. 10% Off All Gas Cylinders or Welcome First Order"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1 text-xs h-9 bg-slate-50/50"
                />
              </div>

              <div>
                <Label htmlFor="of-code" className="text-xs font-bold text-slate-700">
                  Promo Code (Optional)
                </Label>
                <Input
                  id="of-code"
                  placeholder="e.g. GAS10 or WELCOME20"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="mt-1 text-xs font-mono uppercase h-9 bg-slate-50/50"
                />
                <span className="text-[10px] text-slate-400">Leave blank for automatic cart discounts</span>
              </div>

              <div>
                <Label htmlFor="of-badge" className="text-xs font-bold text-slate-700">
                  Badge Label
                </Label>
                <Input
                  id="of-badge"
                  placeholder="e.g. 10% Off, Special Deal"
                  value={formData.badge}
                  onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                  className="mt-1 text-xs h-9 bg-slate-50/50"
                />
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="of-desc" className="text-xs font-bold text-slate-700">
                  Summary Description
                </Label>
                <Textarea
                  id="of-desc"
                  rows={2}
                  placeholder="Explain terms, savings details, and who qualifies."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 text-xs bg-slate-50/50"
                />
              </div>
            </div>

            {/* Discount Mechanism */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-3.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                2. Discount Settings
              </h4>

              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-bold text-slate-700">Discount Type</Label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as DiscountType })}
                    aria-label="Discount Type"
                    className="mt-1 w-full h-9 text-xs rounded-lg border border-slate-200 bg-white px-2.5 font-medium"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (£)</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-bold text-slate-700">
                    Discount Value ({formData.discount_type === "percentage" ? "%" : "£"}) *
                  </Label>
                  <Input
                    type="number"
                    required
                    min={0.01}
                    step="any"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                    className="mt-1 text-xs h-9 bg-white"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-slate-700">Max Discount Cap (£)</Label>
                  <Input
                    type="number"
                    placeholder="No limit"
                    min={0}
                    step="any"
                    value={formData.max_discount_cap}
                    onChange={(e) => setFormData({ ...formData, max_discount_cap: e.target.value })}
                    className="mt-1 text-xs h-9 bg-white"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-slate-700">Min Cart Subtotal (£)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={formData.min_order_subtotal}
                    onChange={(e) => setFormData({ ...formData, min_order_subtotal: Number(e.target.value) })}
                    className="mt-1 text-xs h-9 bg-white"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-slate-700">Status</Label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as OfferStatus })}
                    aria-label="Offer Status"
                    className="mt-1 w-full h-9 text-xs rounded-lg border border-slate-200 bg-white px-2.5 font-medium"
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-bold text-slate-700">Total Usage Limit</Label>
                  <Input
                    type="number"
                    placeholder="Unlimited"
                    min={1}
                    value={formData.total_usage_limit}
                    onChange={(e) => setFormData({ ...formData, total_usage_limit: e.target.value })}
                    className="mt-1 text-xs h-9 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Product-Specific Targeting Form */}
            {formData.offer_category === "product_based" ? (
              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/80 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-blue-950">
                  3. Product Scope Targeting
                </h4>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Applies To:</Label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, target_scope: "all_products" })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        formData.target_scope === "all_products"
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200"
                      }`}
                    >
                      All Products
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, target_scope: "category" })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        formData.target_scope === "category"
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200"
                      }`}
                    >
                      Entire Category
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, target_scope: "specific_products" })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                        formData.target_scope === "specific_products"
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200"
                      }`}
                    >
                      <Package className="h-3.5 w-3.5" />
                      Specific Products ({formData.target_product_ids.length})
                    </button>
                  </div>
                </div>

                {formData.target_scope === "category" && (
                  <div className="space-y-1.5 pt-1">
                    <Label className="text-xs font-bold text-slate-700">Select Categories:</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {defaultCategories.map((cat) => {
                        const isSelected = formData.target_category_slugs.includes(cat.slug);
                        return (
                          <button
                            key={cat.slug}
                            type="button"
                            onClick={() => {
                              const next = isSelected
                                ? formData.target_category_slugs.filter((s) => s !== cat.slug)
                                : [...formData.target_category_slugs, cat.slug];
                              setFormData({ ...formData, target_category_slugs: next });
                            }}
                            className={`p-2 rounded-lg border text-left text-xs font-semibold flex items-center justify-between transition-colors ${
                              isSelected
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <span>{cat.name}</span>
                            {isSelected && <Check className="h-3 w-3" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Specific Products Selector */}
                {formData.target_scope === "specific_products" && (
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-slate-700">
                        Select Qualifying Products ({formData.target_product_ids.length} selected):
                      </Label>
                      {formData.target_product_ids.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, target_product_ids: [] })}
                          className="text-[11px] text-rose-600 hover:underline font-bold"
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    {/* Selected Products Chips */}
                    {formData.target_product_ids.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-xl border border-slate-200 max-h-24 overflow-y-auto">
                        {formData.target_product_ids.map((id) => {
                          const prod = catalogProducts.find((p) => p.id === id);
                          return (
                            <span
                              key={id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-[11px] font-bold"
                            >
                              <span>{prod?.name || id.slice(0, 8)}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setFormData({
                                    ...formData,
                                    target_product_ids: formData.target_product_ids.filter((pId) => pId !== id),
                                  })
                                }
                                className="text-blue-500 hover:text-rose-600 ml-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Product Search & Picker List */}
                    <div className="space-y-1.5">
                      <div className="relative">
                        <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                        <Input
                          placeholder="Search product name or SKU..."
                          value={productSearchQuery}
                          onChange={(e) => setProductSearchQuery(e.target.value)}
                          className="h-8 pl-8 text-xs bg-white"
                        />
                      </div>

                      <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl bg-white divide-y divide-slate-100">
                        {filteredProducts.map((p) => {
                          const isSelected = formData.target_product_ids.includes(p.id);
                          return (
                            <div
                              key={p.id}
                              onClick={() => {
                                const next = isSelected
                                  ? formData.target_product_ids.filter((id) => id !== p.id)
                                  : [...formData.target_product_ids, p.id];
                                setFormData({ ...formData, target_product_ids: next });
                              }}
                              className={`p-2 sm:px-3 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                                isSelected ? "bg-blue-50/80 font-bold" : "hover:bg-slate-50"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                                    isSelected
                                      ? "bg-blue-600 border-blue-600 text-white"
                                      : "border-slate-300 bg-white"
                                  }`}
                                >
                                  {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-slate-900 font-medium">{p.name}</p>
                                  <p className="text-[10px] text-slate-400">
                                    {gbp(p.price)} {p.category_slug ? `• ${p.category_slug}` : ""}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Customer Target Rules */
              <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200/80 space-y-3.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-purple-950">
                  3. Customer Eligibility Rules
                </h4>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Eligibility Rule Type</Label>
                  <select
                    value={formData.target_customer_rule}
                    onChange={(e) => setFormData({ ...formData, target_customer_rule: e.target.value as CustomerTargetRule })}
                    aria-label="Customer Eligibility Rule"
                    className="w-full h-9 text-xs rounded-lg border border-slate-200 bg-white px-2.5 font-medium"
                  >
                    <option value="new_customer">New Customer (0 Completed Orders)</option>
                    <option value="first_order">First Order Bonus</option>
                    <option value="lifetime_spend">Customer Lifetime Spend Tier (£)</option>
                    <option value="period_spend">Recent Period Spend Tier (e.g. Last 30 Days)</option>
                    <option value="order_count_milestone">Order Count Milestone (e.g. 5th Order)</option>
                    <option value="consecutive_loyalty">Consecutive Order Loyalty</option>
                    <option value="referral">Referral Code Program</option>
                    <option value="custom_rule_builder">Custom AND / OR Condition Engine</option>
                  </select>
                </div>

                {formData.target_customer_rule === "lifetime_spend" && (
                  <div>
                    <Label className="text-xs font-bold text-slate-700">Minimum Lifetime Spend (£)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.spend_threshold_amount}
                      onChange={(e) => setFormData({ ...formData, spend_threshold_amount: Number(e.target.value) })}
                      className="mt-1 text-xs h-9 bg-white"
                    />
                  </div>
                )}

                {formData.target_customer_rule === "period_spend" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold text-slate-700">Spend Threshold (£)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={formData.spend_threshold_amount}
                        onChange={(e) => setFormData({ ...formData, spend_threshold_amount: Number(e.target.value) })}
                        className="mt-1 text-xs h-9 bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-slate-700">Period Window (Days)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={formData.spend_period_days}
                        onChange={(e) => setFormData({ ...formData, spend_period_days: Number(e.target.value) })}
                        className="mt-1 text-xs h-9 bg-white"
                      />
                    </div>
                  </div>
                )}

                {formData.target_customer_rule === "order_count_milestone" && (
                  <div>
                    <Label className="text-xs font-bold text-slate-700">Target Order Number (e.g. 5 for 5th order)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.order_count_target}
                      onChange={(e) => setFormData({ ...formData, order_count_target: Number(e.target.value) })}
                      className="mt-1 text-xs h-9 bg-white"
                    />
                  </div>
                )}

                {formData.target_customer_rule === "consecutive_loyalty" && (
                  <div>
                    <Label className="text-xs font-bold text-slate-700">Consecutive Activity Window (Days)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.consecutive_days_window}
                      onChange={(e) => setFormData({ ...formData, consecutive_days_window: Number(e.target.value) })}
                      placeholder="e.g. 30 days"
                      className="mt-1 text-xs h-9 bg-white"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Customer must have placed their last non-cancelled order within this many days.
                    </p>
                  </div>
                )}

                {/* Custom AND / OR Condition Engine Builder */}
                {formData.target_customer_rule === "custom_rule_builder" && (
                  <div className="space-y-3 pt-2 border-t border-purple-200/70">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Code2 className="h-4 w-4 text-purple-700" />
                        <span className="text-xs font-bold text-purple-950">Match Logic Operator:</span>
                      </div>
                      <div className="flex rounded-lg border border-purple-200 overflow-hidden bg-white">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, custom_operator: "AND" })}
                          className={`px-3 py-1 text-xs font-bold transition-colors ${
                            formData.custom_operator === "AND"
                              ? "bg-purple-600 text-white"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          ALL must match (AND)
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, custom_operator: "OR" })}
                          className={`px-3 py-1 text-xs font-bold transition-colors ${
                            formData.custom_operator === "OR"
                              ? "bg-purple-600 text-white"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          ANY must match (OR)
                        </button>
                      </div>
                    </div>

                    {/* Condition Rows */}
                    <div className="space-y-2">
                      {formData.custom_conditions.map((cond, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-white border border-purple-200 flex flex-col sm:flex-row sm:items-center gap-2 text-xs"
                        >
                          <select
                            value={cond.type}
                            onChange={(e) =>
                              handleUpdateCondition(idx, { type: e.target.value as any })
                            }
                            aria-label="Condition Type"
                            className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-semibold"
                          >
                            <option value="min_cart_subtotal">Cart Subtotal (≥ £)</option>
                            <option value="new_customer">New Customer (0 orders)</option>
                            <option value="lifetime_spend">Lifetime Spend (≥ £)</option>
                            <option value="period_spend">Period Spend (≥ £)</option>
                            <option value="order_count_milestone">Order Count (≥ N)</option>
                            <option value="consecutive_loyalty">Consecutive Order (within N days)</option>
                            <option value="contains_category">Cart Has Category</option>
                            <option value="contains_product">Cart Has Product ID</option>
                          </select>

                          {/* Dynamic Values */}
                          {(cond.type === "min_cart_subtotal" ||
                            cond.type === "lifetime_spend" ||
                            cond.type === "order_count_milestone") && (
                            <Input
                              type="number"
                              placeholder="Value"
                              value={cond.value ?? ""}
                              onChange={(e) => handleUpdateCondition(idx, { value: Number(e.target.value) })}
                              className="h-8 text-xs w-24 bg-white"
                            />
                          )}

                          {cond.type === "period_spend" && (
                            <div className="flex gap-1.5">
                              <Input
                                type="number"
                                placeholder="Amount £"
                                value={cond.value ?? ""}
                                onChange={(e) => handleUpdateCondition(idx, { value: Number(e.target.value) })}
                                className="h-8 text-xs w-20 bg-white"
                              />
                              <Input
                                type="number"
                                placeholder="Days"
                                value={cond.days ?? 30}
                                onChange={(e) => handleUpdateCondition(idx, { days: Number(e.target.value) })}
                                className="h-8 text-xs w-16 bg-white"
                              />
                            </div>
                          )}

                          {cond.type === "consecutive_loyalty" && (
                            <Input
                              type="number"
                              placeholder="Window Days"
                              value={cond.days ?? 30}
                              onChange={(e) => handleUpdateCondition(idx, { days: Number(e.target.value) })}
                              className="h-8 text-xs w-24 bg-white"
                            />
                          )}

                          {cond.type === "contains_category" && (
                            <select
                              value={cond.category || cond.value || ""}
                              onChange={(e) => handleUpdateCondition(idx, { category: e.target.value, value: e.target.value })}
                              aria-label="Target Category"
                              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium"
                            >
                              <option value="">Select Category</option>
                              {defaultCategories.map((c) => (
                                <option key={c.slug} value={c.slug}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          )}

                          {cond.type === "contains_product" && (
                            <Input
                              placeholder="Product UUID / ID"
                              value={cond.product_id || cond.value || ""}
                              onChange={(e) => handleUpdateCondition(idx, { product_id: e.target.value, value: e.target.value })}
                              className="h-8 text-xs flex-1 bg-white font-mono"
                            />
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoveCondition(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1 ml-auto transition-colors"
                            title="Remove condition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleAddCondition}
                      className="rounded-xl h-8 text-xs font-bold gap-1 bg-white hover:bg-purple-50 text-purple-700 border-purple-200"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Condition Clause
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Scheduling & Promotional Display */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                4. Scheduling & Display
              </h4>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-slate-700">Start Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={formData.starts_at}
                    onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                    className="mt-1 text-xs h-9 bg-white"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-slate-700">End Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={formData.ends_at}
                    onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                    className="mt-1 text-xs h-9 bg-white"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.is_publicly_listed}
                    onChange={(e) => setFormData({ ...formData, is_publicly_listed: e.target.checked })}
                    className="rounded text-primary"
                  />
                  <span>Show on public /offers page</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.show_promotional_banner}
                    onChange={(e) => setFormData({ ...formData, show_promotional_banner: e.target.checked })}
                    className="rounded text-primary"
                  />
                  <span>Display in Header Announcement Bar</span>
                </label>
              </div>
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-xl h-9 text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="rounded-xl h-9 text-xs font-bold bg-primary hover:bg-primary/90 text-white"
              >
                {submitting ? "Saving..." : editingOffer ? "Save Changes" : "Create Offer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION MODAL */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6 space-y-3">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-rose-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Delete Offer
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Are you sure you want to delete offer "{offerToDelete?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(false)}
              className="rounded-xl text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={submitting}
              onClick={handleDeleteOffer}
              className="rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
            >
              {submitting ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

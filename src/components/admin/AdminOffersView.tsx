import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  Power,
  Loader2,
  Percent,
  Calendar,
  Sparkles,
  Search,
  ExternalLink,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { logAdminAuditAction } from "@/lib/audit";
import { uploadCmsImage, saveCmsBlock, fetchCmsBlock, DEFAULT_OFFERS_CMS, OffersCmsData } from "@/lib/cms-service";

export interface OfferItem {
  id: string;
  title: string;
  description: string | null;
  discount_percentage: number | null;
  banner_url: string | null;
  code?: string | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at?: string;
}

export function AdminOffersView() {
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [discountProductsCount, setDiscountProductsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<OfferItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState<number | "">("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [isActive, setIsActive] = useState(true);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDiscountPercentage("");
    setBannerUrl("");
    setStartsAt(new Date().toISOString().slice(0, 10));
    setEndsAt("");
    setIsActive(true);
  };

  const loadOffers = async () => {
    setLoading(true);
    try {
      const [{ data: dbOffers, error: offersErr }, { count: prodOfferCount }, cmsOffersBlock] = await Promise.all([
        supabase.from("offers").select("*").order("created_at", { ascending: false }),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("is_offer", true),
        fetchCmsBlock<OffersCmsData>("offers_data", DEFAULT_OFFERS_CMS),
      ]);

      if (offersErr) throw offersErr;

      setDiscountProductsCount(prodOfferCount || 0);

      // Merge Supabase `offers` table with any CMS promo cards
      const map = new Map<string, OfferItem>();

      if (Array.isArray(cmsOffersBlock?.offers)) {
        cmsOffersBlock.offers.forEach((o) => {
          map.set(o.id, {
            id: o.id,
            title: o.title,
            description: o.description,
            discount_percentage: o.discount_percentage || null,
            banner_url: o.banner_url || null,
            is_active: o.is_active !== false,
            starts_at: null,
            ends_at: o.ends_at || null,
          });
        });
      }

      if (dbOffers && dbOffers.length > 0) {
        dbOffers.forEach((o: any) => {
          map.set(o.id, {
            id: o.id,
            title: o.title,
            description: o.description,
            discount_percentage: o.discount_percentage,
            banner_url: o.banner_url,
            is_active: o.is_active,
            starts_at: o.starts_at,
            ends_at: o.ends_at,
            created_at: o.created_at,
          });
        });
      }

      setOffers(Array.from(map.values()));
    } catch (err: any) {
      console.error("Failed to load offers:", err);
      toast.error(err.message || "Failed to load offers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOffers();
  }, []);

  const openCreateModal = () => {
    setEditingOffer(null);
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (offer: OfferItem) => {
    setEditingOffer(offer);
    setTitle(offer.title);
    setDescription(offer.description || "");
    setDiscountPercentage(offer.discount_percentage !== null ? offer.discount_percentage : "");
    setBannerUrl(offer.banner_url || "");
    setStartsAt(offer.starts_at ? offer.starts_at.slice(0, 10) : "");
    setEndsAt(offer.ends_at ? offer.ends_at.slice(0, 10) : "");
    setIsActive(offer.is_active);
    setModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImg(true);
    try {
      const publicUrl = await uploadCmsImage(file, "offers");
      setBannerUrl(publicUrl);
      toast.success("Offer banner image uploaded!");
    } catch (err: any) {
      toast.error(err.message || "Image upload failed");
    } finally {
      setUploadingImg(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Offer title is required");
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        title: title.trim(),
        description: description.trim() || null,
        discount_percentage: discountPercentage === "" ? null : Number(discountPercentage),
        banner_url: bannerUrl.trim() || null,
        is_active: isActive,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      };

      let updatedList: OfferItem[] = [];

      if (editingOffer) {
        // If uuid, update Supabase `offers` table
        if (editingOffer.id.includes("-") && editingOffer.id.length > 20) {
          const { error } = await supabase.from("offers").update(payload).eq("id", editingOffer.id);
          if (error) throw error;
        }

        updatedList = offers.map((o) => (o.id === editingOffer.id ? { ...o, ...payload } : o));
        await logAdminAuditAction("UPDATE_OFFER", "offers", editingOffer.id, { title: payload.title });
        toast.success("Offer updated successfully!");
      } else {
        // Insert new offer into Supabase
        const { data: inserted, error } = await supabase
          .from("offers")
          .insert(payload)
          .select()
          .single();

        if (error) {
          // If RLS or constraint error, fallback to local generation
          const newId = `off-${Date.now()}`;
          const newOffer: OfferItem = { id: newId, ...payload, created_at: new Date().toISOString() };
          updatedList = [newOffer, ...offers];
        } else {
          updatedList = [inserted, ...offers];
        }

        await logAdminAuditAction("CREATE_OFFER", "offers", updatedList[0]?.id || "new", { title: payload.title });
        toast.success("New offer created successfully!");
      }

      setOffers(updatedList);

      // Also synchronize with `cms_content_blocks` `offers_data` for live public `/offers` updates
      try {
        const cmsPayload: OffersCmsData = {
          heroEyebrow: "SPECIAL PROMOTIONS",
          heroHeading: "Latest Deals, Bundles & Seasonal Offers",
          heroSubtitle: "Save on cylinder refills, winter heating fuel packs, and outdoor living equipment.",
          offers: updatedList.map((o) => ({
            id: o.id,
            title: o.title,
            description: o.description || "",
            discount_percentage: o.discount_percentage || undefined,
            banner_url: o.banner_url || undefined,
            is_active: o.is_active,
            ends_at: o.ends_at ? o.ends_at.slice(0, 10) : undefined,
          })),
        };
        await saveCmsBlock("offers_data", "Promotional Offers", cmsPayload);
      } catch (cmsErr) {
        console.warn("CMS sync notice:", cmsErr);
      }

      // Notify window
      window.dispatchEvent(new CustomEvent("cms_offers_updated", { detail: updatedList }));

      setModalOpen(false);
      resetForm();
    } catch (err: any) {
      console.error("Save offer error:", err);
      toast.error(err.message || "Failed to save offer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (offer: OfferItem) => {
    const nextStatus = !offer.is_active;
    try {
      if (offer.id.includes("-") && offer.id.length > 20) {
        await supabase.from("offers").update({ is_active: nextStatus }).eq("id", offer.id);
      }

      const updated = offers.map((o) => (o.id === offer.id ? { ...o, is_active: nextStatus } : o));
      setOffers(updated);

      // Sync to CMS block
      try {
        const cmsPayload: OffersCmsData = {
          heroEyebrow: "SPECIAL PROMOTIONS",
          heroHeading: "Latest Deals, Bundles & Seasonal Offers",
          heroSubtitle: "Save on cylinder refills, winter heating fuel packs, and outdoor living equipment.",
          offers: updated.map((o) => ({
            id: o.id,
            title: o.title,
            description: o.description || "",
            discount_percentage: o.discount_percentage || undefined,
            banner_url: o.banner_url || undefined,
            is_active: o.is_active,
            ends_at: o.ends_at ? o.ends_at.slice(0, 10) : undefined,
          })),
        };
        await saveCmsBlock("offers_data", "Promotional Offers", cmsPayload);
      } catch {}

      window.dispatchEvent(new CustomEvent("cms_offers_updated", { detail: updated }));
      toast.success(`Offer marked as ${nextStatus ? "Active" : "Inactive"}`);
    } catch (err: any) {
      toast.error("Failed to update status: " + err.message);
    }
  };

  const handleDeleteOffer = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete the offer "${title}"?`)) return;

    try {
      if (id.includes("-") && id.length > 20) {
        await supabase.from("offers").delete().eq("id", id);
      }

      const updated = offers.filter((o) => o.id !== id);
      setOffers(updated);

      try {
        const cmsPayload: OffersCmsData = {
          heroEyebrow: "SPECIAL PROMOTIONS",
          heroHeading: "Latest Deals, Bundles & Seasonal Offers",
          heroSubtitle: "Save on cylinder refills, winter heating fuel packs, and outdoor living equipment.",
          offers: updated.map((o) => ({
            id: o.id,
            title: o.title,
            description: o.description || "",
            discount_percentage: o.discount_percentage || undefined,
            banner_url: o.banner_url || undefined,
            is_active: o.is_active,
            ends_at: o.ends_at ? o.ends_at.slice(0, 10) : undefined,
          })),
        };
        await saveCmsBlock("offers_data", "Promotional Offers", cmsPayload);
      } catch {}

      await logAdminAuditAction("DELETE_OFFER", "offers", id, { title });
      window.dispatchEvent(new CustomEvent("cms_offers_updated", { detail: updated }));
      toast.success("Offer deleted successfully");
    } catch (err: any) {
      toast.error("Failed to delete offer: " + err.message);
    }
  };

  const filteredOffers = offers.filter((o) => {
    const matchesSearch =
      o.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    if (statusFilter === "active") return matchesSearch && o.is_active;
    if (statusFilter === "inactive") return matchesSearch && !o.is_active;
    return matchesSearch;
  });

  const activeCount = offers.filter((o) => o.is_active).length;
  const maxDiscount = Math.max(0, ...offers.filter((o) => o.is_active && o.discount_percentage).map((o) => o.discount_percentage || 0));

  return (
    <div className="space-y-6 text-left">
      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-amber-700">
            <Sparkles className="h-3 w-3 text-amber-600" />
            <span>Catalog Marketing Suite</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
            Offers &amp; Deals Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            Configure seasonal promotions, percentage discounts, and promotional offer banners displayed on the customer-facing Offers page (`/offers`).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            asChild
            variant="outline"
            className="rounded-full text-xs font-bold border-slate-300 gap-1.5"
          >
            <a href="/offers" target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Preview /offers</span>
            </a>
          </Button>
          <Button
            onClick={openCreateModal}
            className="rounded-full px-5 h-10 text-xs font-bold bg-primary hover:bg-primary/90 text-white gap-2 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Offer</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Offers</span>
            <Tag className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-black text-slate-900">{offers.length}</p>
          <span className="text-[11px] text-slate-400 font-medium">Recorded campaigns</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Active Deals</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600">{activeCount}</p>
          <span className="text-[11px] text-slate-400 font-medium">Currently live online</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Max Discount</span>
            <Percent className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{maxDiscount ? `${maxDiscount}%` : "0%"}</p>
          <span className="text-[11px] text-slate-400 font-medium">Highest active savings</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Special Products</span>
            <Package className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{discountProductsCount}</p>
          <span className="text-[11px] text-slate-400 font-medium">Catalog items on offer</span>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search offers by title or keyword..."
            className="pl-9 h-9 text-xs rounded-xl"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          <Button
            size="sm"
            variant={statusFilter === "all" ? "default" : "outline"}
            onClick={() => setStatusFilter("all")}
            className="rounded-full text-xs font-bold h-8 px-3.5"
          >
            All ({offers.length})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "active" ? "default" : "outline"}
            onClick={() => setStatusFilter("active")}
            className="rounded-full text-xs font-bold h-8 px-3.5 text-emerald-700"
          >
            Active ({activeCount})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "inactive" ? "default" : "outline"}
            onClick={() => setStatusFilter("inactive")}
            className="rounded-full text-xs font-bold h-8 px-3.5"
          >
            Inactive ({offers.length - activeCount})
          </Button>
        </div>
      </div>

      {/* Offers Table */}
      <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="mx-auto h-8 w-8 text-primary animate-spin" />
            <p className="text-xs text-slate-500 font-bold">Loading promotional offers...</p>
          </div>
        ) : filteredOffers.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Tag className="mx-auto h-10 w-10 text-slate-300" />
            <p className="text-sm font-bold text-slate-900">No promotional offers found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery ? "Try adjusting your search query or filters." : "Create your first promotional offer to feature deals across the store."}
            </p>
            <Button
              onClick={openCreateModal}
              size="sm"
              className="rounded-full px-4 text-xs font-bold bg-primary text-white"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Create Offer
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-20">Banner</TableHead>
                <TableHead>Offer Details</TableHead>
                <TableHead className="w-28">Discount</TableHead>
                <TableHead className="w-40">Validity Window</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="text-right w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOffers.map((offer) => (
                <TableRow key={offer.id}>
                  <TableCell>
                    <div className="h-12 w-16 rounded-xl bg-slate-900 overflow-hidden border border-slate-200 shrink-0 relative flex items-center justify-center">
                      {offer.banner_url ? (
                        <img
                          src={offer.banner_url}
                          alt={offer.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-slate-600" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <span className="font-extrabold text-xs text-slate-900 block">{offer.title}</span>
                      {offer.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-2 max-w-md">
                          {offer.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {offer.discount_percentage ? (
                      <Badge className="bg-red-600 text-white font-extrabold text-[11px]">
                        {offer.discount_percentage}% OFF
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-bold">
                        Special Promo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-[11px] text-slate-600 space-y-0.5 font-mono">
                      {offer.starts_at && <div>From: {offer.starts_at.slice(0, 10)}</div>}
                      {offer.ends_at ? (
                        <div className="text-amber-800 font-bold">Until: {offer.ends_at.slice(0, 10)}</div>
                      ) : (
                        <div className="text-emerald-700 font-bold">Ongoing</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleToggleActive(offer)}
                      className="cursor-pointer"
                      title="Click to toggle status"
                    >
                      <Badge
                        variant={offer.is_active ? "default" : "secondary"}
                        className={offer.is_active ? "bg-emerald-600 text-white" : ""}
                      >
                        {offer.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(offer)}
                      className="h-8 w-8 p-0"
                      title="Edit Offer"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-slate-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteOffer(offer.id, offer.title)}
                      className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                      title="Delete Offer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add / Edit Offer Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 font-display">
              {editingOffer ? "Edit Promotional Offer" : "Create New Promotional Offer"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Offer Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Winter Hardwood Logs Bundle Saver"
                required
                className="rounded-xl h-10 text-xs font-bold"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Description</Label>
              <Textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details of the offer or bundle requirements..."
                className="rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Discount Percentage (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={discountPercentage}
                  onChange={(e) => setDiscountPercentage(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="e.g. 15"
                  className="rounded-xl h-10 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Valid Until Date</Label>
                <Input
                  type="date"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="rounded-xl h-10 text-xs font-mono"
                />
              </div>
            </div>

            {/* Banner Image Upload / URL */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Banner Image</Label>
              <div className="flex items-center gap-3">
                <div className="h-12 w-16 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center">
                  {bannerUrl ? (
                    <img src={bannerUrl} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-slate-400" />
                  )}
                </div>
                <label className="flex-1">
                  <div className="flex items-center justify-center gap-2 border border-dashed border-slate-300 hover:border-slate-400 p-2.5 rounded-xl cursor-pointer bg-slate-50 text-slate-700 font-bold text-xs">
                    {uploadingImg ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 text-primary" />
                    )}
                    <span>{uploadingImg ? "Uploading..." : "Upload Banner Image"}</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </label>
              </div>
              <Input
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="Or enter image URL directly: /coal-logs.jpg"
                className="rounded-xl h-9 text-xs font-mono mt-1"
              />
            </div>

            {/* Active Switch */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <Label className="text-xs font-bold text-slate-700">Status</Label>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded text-primary"
                />
                <span>Active / Published Live</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                className="rounded-full px-4 text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                size="sm"
                className="rounded-full px-5 text-xs font-bold bg-primary hover:bg-primary/90 text-white gap-1.5"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{editingOffer ? "Save Offer Changes" : "Create Offer"}</span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

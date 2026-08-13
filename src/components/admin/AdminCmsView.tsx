import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Image as ImageIcon,
  Tag,
  BookOpen,
  Plus,
  Layers,
  Edit2,
  Trash2,
  Power,
  Calendar,
  Percent,
  CheckCircle2,
  Loader2,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { logAdminAuditAction } from "@/lib/audit";

export function AdminCmsView() {
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [blogPosts, setBlogPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Offer Modal State
  const [createOfferOpen, setCreateOfferOpen] = useState(false);
  const [editOfferOpen, setEditOfferOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Offer Form Fields
  const [offerTitle, setOfferTitle] = useState("");
  const [offerDescription, setOfferDescription] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [applyTo, setApplyTo] = useState<"all" | "category" | "product">("all");
  const [targetId, setTargetId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<"Active" | "Scheduled" | "Disabled">("Active");
  const [bannerUrl, setBannerUrl] = useState("");

  const resetForm = () => {
    setOfferTitle("");
    setOfferDescription("");
    setDiscountType("percentage");
    setDiscountValue("");
    setApplyTo("all");
    setTargetId("");
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate("");
    setStatus("Active");
    setBannerUrl("");
  };

  const loadCmsData = async () => {
    setLoading(true);
    try {
      const [
        { data: catData },
        { data: prodData },
        { data: offerData },
        { data: bannerData },
        { data: blogData },
      ] = await Promise.all([
        supabase.from("categories").select("*").order("name"),
        supabase.from("products").select("id, name, category_slug"),
        supabase.from("offers").select("*").order("created_at", { ascending: false }),
        supabase.from("cms_banners").select("*").order("created_at", { ascending: false }),
        supabase.from("cms_blog_posts").select("*").order("created_at", { ascending: false }),
      ]);

      setCategories(catData || []);
      setProducts(prodData || []);
      setOffers(offerData || []);
      setBanners(bannerData || []);
      setBlogPosts(blogData || []);
    } catch (err: any) {
      toast.error("Failed to load CMS data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCmsData();
  }, []);

  // Handle Real Supabase Offer Creation
  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerTitle.trim()) {
      return toast.error("Please provide an offer title.");
    }
    setSubmitting(true);
    try {
      const isActive = status === "Active" || status === "Scheduled";
      const payload = {
        title: offerTitle.trim(),
        description: offerDescription.trim() || null,
        discount_percentage: Number(discountValue) || 0,
        banner_url: bannerUrl.trim() || null,
        is_active: isActive,
        starts_at: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        ends_at: endDate ? new Date(endDate).toISOString() : null,
      };

      const { data, error } = await supabase
        .from("offers")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      await logAdminAuditAction("CREATE_OFFER", "offers", data.id, { title: offerTitle });
      toast.success("Special offer created in Supabase!");
      setOffers([data, ...offers]);
      setCreateOfferOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error("Failed to create offer: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Populate form for editing
  const handleOpenEditModal = (offer: any) => {
    setSelectedOffer(offer);
    setOfferTitle(offer.title || "");
    setOfferDescription(offer.description || "");
    setDiscountValue(String(offer.discount_percentage || ""));
    setBannerUrl(offer.banner_url || "");
    setStartDate(offer.starts_at ? new Date(offer.starts_at).toISOString().slice(0, 10) : "");
    setEndDate(offer.ends_at ? new Date(offer.ends_at).toISOString().slice(0, 10) : "");
    setStatus(offer.is_active ? "Active" : "Disabled");
    setEditOfferOpen(true);
  };

  // Handle Real Supabase Offer Update
  const handleUpdateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOffer) return;
    setSubmitting(true);
    try {
      const isActive = status === "Active" || status === "Scheduled";
      const payload = {
        title: offerTitle.trim(),
        description: offerDescription.trim() || null,
        discount_percentage: Number(discountValue) || 0,
        banner_url: bannerUrl.trim() || null,
        is_active: isActive,
        starts_at: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        ends_at: endDate ? new Date(endDate).toISOString() : null,
      };

      const { error } = await supabase
        .from("offers")
        .update(payload)
        .eq("id", selectedOffer.id);

      if (error) throw error;

      await logAdminAuditAction("UPDATE_OFFER", "offers", selectedOffer.id, { title: offerTitle });
      setOffers(offers.map((o) => (o.id === selectedOffer.id ? { ...o, ...payload } : o)));
      toast.success("Offer updated successfully!");
      setEditOfferOpen(false);
      setSelectedOffer(null);
      resetForm();
    } catch (err: any) {
      toast.error("Failed to update offer: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Real Supabase Status Toggle (Enable/Disable)
  const handleToggleOfferStatus = async (offer: any) => {
    try {
      const newActive = !offer.is_active;
      const { error } = await supabase
        .from("offers")
        .update({ is_active: newActive })
        .eq("id", offer.id);

      if (error) throw error;

      await logAdminAuditAction(newActive ? "ENABLE_OFFER" : "DISABLE_OFFER", "offers", offer.id, { title: offer.title });
      setOffers(offers.map((o) => (o.id === offer.id ? { ...o, is_active: newActive } : o)));
      toast.success(`Offer "${offer.title}" ${newActive ? "enabled" : "disabled"}`);
    } catch (err: any) {
      toast.error("Failed to update offer status: " + err.message);
    }
  };

  // Handle Real Supabase Offer Deletion
  const handleDeleteOffer = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete offer "${title}"?`)) return;
    try {
      const { error } = await supabase.from("offers").delete().eq("id", id);
      if (error) throw error;

      await logAdminAuditAction("DELETE_OFFER", "offers", id, { title });
      setOffers(offers.filter((o) => o.id !== id));
      toast.success(`Offer "${title}" deleted from Supabase`);
    } catch (err: any) {
      toast.error("Failed to delete offer: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/admin" className="hover:text-primary transition-colors">
              Admin
            </Link>
            <span>/</span>
            <span className="text-foreground">CMS & Content</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            CMS & Content Management
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage category structure, promotional deals, home banners, and blog posts in Supabase.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="offers" className="space-y-6">
        <TabsList className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-2xl">
          <TabsTrigger value="offers" className="rounded-xl text-xs font-bold gap-2">
            <Tag className="h-3.5 w-3.5" /> Special Deals ({offers.length})
          </TabsTrigger>
          <TabsTrigger value="categories" className="rounded-xl text-xs font-bold gap-2">
            <Layers className="h-3.5 w-3.5" /> Categories ({categories.length})
          </TabsTrigger>
          <TabsTrigger value="banners" className="rounded-xl text-xs font-bold gap-2">
            <ImageIcon className="h-3.5 w-3.5" /> Banners ({banners.length})
          </TabsTrigger>
          <TabsTrigger value="blogs" className="rounded-xl text-xs font-bold gap-2">
            <BookOpen className="h-3.5 w-3.5" /> Blog Posts ({blogPosts.length})
          </TabsTrigger>
        </TabsList>

        {/* 1. Special Deals (OFFERS) */}
        <TabsContent value="offers" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-foreground">Special Deals & Offers</h2>
              <p className="text-xs text-muted-foreground">
                Active promotional offers are live on the customer /offers page.
              </p>
            </div>
            <Button
              onClick={() => {
                resetForm();
                setCreateOfferOpen(true);
              }}
              className="rounded-full text-xs font-extrabold gap-1.5 shadow-md bg-primary hover:bg-primary/90 text-white"
            >
              <Plus className="h-4 w-4" /> Create Offer
            </Button>
          </div>

          <div className="surface-card rounded-3xl border bg-white overflow-hidden shadow-xs">
            {loading ? (
              <div className="p-12 text-center text-xs text-muted-foreground font-bold">
                Loading offer items from Supabase...
              </div>
            ) : offers.length === 0 ? (
              <div className="p-16 text-center space-y-4">
                <div className="p-4 rounded-full bg-slate-100 text-slate-400 w-fit mx-auto">
                  <Tag className="h-10 w-10" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <h3 className="font-extrabold text-base text-foreground">No promotional offers created</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Create special deals to display discount bundles and banner offers on the customer portal.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    resetForm();
                    setCreateOfferOpen(true);
                  }}
                  className="rounded-full text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-white"
                >
                  <Plus className="h-4 w-4" /> Create First Offer
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold text-xs">Offer Title</TableHead>
                    <TableHead className="font-bold text-xs">Discount</TableHead>
                    <TableHead className="font-bold text-xs">Dates</TableHead>
                    <TableHead className="font-bold text-xs">Status</TableHead>
                    <TableHead className="text-right font-bold text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offers.map((o) => {
                    const isExpired = o.ends_at && new Date(o.ends_at) < new Date();
                    const isScheduled = o.starts_at && new Date(o.starts_at) > new Date();

                    return (
                      <TableRow key={o.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {o.banner_url ? (
                              <img
                                src={o.banner_url}
                                alt={o.title}
                                className="h-10 w-10 rounded-xl object-cover bg-slate-100 border shrink-0"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                <Tag className="h-5 w-5" />
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-extrabold text-foreground">{o.title}</p>
                              <p className="text-[11px] text-muted-foreground line-clamp-1">
                                {o.description || "No description"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-extrabold text-emerald-700">
                          {o.discount_percentage ? `${o.discount_percentage}% OFF` : "Special Deal"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {o.starts_at ? new Date(o.starts_at).toLocaleDateString("en-GB") : "Immediate"}
                          {o.ends_at ? ` - ${new Date(o.ends_at).toLocaleDateString("en-GB")}` : " (Ongoing)"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold ${
                              !o.is_active
                                ? "bg-slate-100 text-slate-600 border-slate-200"
                                : isExpired
                                ? "bg-red-50 text-red-700 border-red-200"
                                : isScheduled
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}
                          >
                            {!o.is_active ? "Disabled" : isExpired ? "Expired" : isScheduled ? "Scheduled" : "Active"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleOfferStatus(o)}
                              title={o.is_active ? "Disable offer" : "Enable offer"}
                              className={`h-8 w-8 p-0 rounded-full ${o.is_active ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"}`}
                            >
                              <Power className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenEditModal(o)}
                              className="h-8 w-8 p-0 rounded-full text-slate-600 hover:bg-slate-100"
                              title="Edit offer"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteOffer(o.id, o.title)}
                              className="h-8 w-8 p-0 rounded-full text-red-600 hover:bg-red-50"
                              title="Delete offer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* 2. Categories */}
        <TabsContent value="categories" className="space-y-4">
          <div className="surface-card rounded-3xl border bg-white overflow-hidden shadow-xs">
            {loading ? (
              <div className="p-12 text-center text-xs text-muted-foreground font-bold">
                Loading categories from Supabase...
              </div>
            ) : categories.length === 0 ? (
              <div className="p-16 text-center space-y-3">
                <Layers className="mx-auto h-10 w-10 text-muted-foreground/30" />
                <h3 className="font-bold text-sm text-foreground">No categories in database</h3>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold text-xs">Category Name</TableHead>
                    <TableHead className="font-bold text-xs">Slug</TableHead>
                    <TableHead className="font-bold text-xs">Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs font-bold text-foreground">{c.name}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{c.slug}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.description || "N/A"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* 3. Banners */}
        <TabsContent value="banners" className="space-y-4">
          <div className="surface-card rounded-3xl border bg-white overflow-hidden shadow-xs">
            {loading ? (
              <div className="p-12 text-center text-xs text-muted-foreground font-bold">
                Loading banners from Supabase...
              </div>
            ) : banners.length === 0 ? (
              <div className="p-16 text-center space-y-3">
                <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground/30" />
                <h3 className="font-bold text-sm text-foreground">No active CMS banners</h3>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold text-xs">Title</TableHead>
                    <TableHead className="font-bold text-xs">Subtitle</TableHead>
                    <TableHead className="font-bold text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {banners.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="text-xs font-bold text-foreground">{b.title}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{b.subtitle || "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-bold bg-emerald-50 text-emerald-700">
                          {b.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* 4. Blog Posts */}
        <TabsContent value="blogs" className="space-y-4">
          <div className="surface-card rounded-3xl border bg-white overflow-hidden shadow-xs">
            {loading ? (
              <div className="p-12 text-center text-xs text-muted-foreground font-bold">
                Loading blog posts from Supabase...
              </div>
            ) : blogPosts.length === 0 ? (
              <div className="p-16 text-center space-y-3">
                <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/30" />
                <h3 className="font-bold text-sm text-foreground">No published blog posts</h3>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold text-xs">Post Title</TableHead>
                    <TableHead className="font-bold text-xs">Slug</TableHead>
                    <TableHead className="font-bold text-xs">Author</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blogPosts.map((bp) => (
                    <TableRow key={bp.id}>
                      <TableCell className="text-xs font-bold text-foreground">{bp.title}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{bp.slug}</TableCell>
                      <TableCell className="text-xs font-medium text-muted-foreground">{bp.author_name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* CREATE OFFER MODAL */}
      <Dialog open={createOfferOpen} onOpenChange={setCreateOfferOpen}>
        <DialogContent className="sm:max-w-xl rounded-3xl p-6 overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="font-black text-lg flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" /> Create Special Offer
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateOffer} className="space-y-4 pt-2 text-xs font-medium">
            <div>
              <Label htmlFor="create-offer-title" className="font-bold text-slate-700">
                Offer Title *
              </Label>
              <Input
                id="create-offer-title"
                value={offerTitle}
                onChange={(e) => setOfferTitle(e.target.value)}
                placeholder="e.g. Summer Calor Gas Cylinder Sale"
                className="mt-1.5 rounded-xl text-xs font-semibold h-10 border-slate-200"
                required
              />
            </div>

            <div>
              <Label htmlFor="create-offer-desc" className="font-bold text-slate-700">
                Description
              </Label>
              <Textarea
                id="create-offer-desc"
                value={offerDescription}
                onChange={(e) => setOfferDescription(e.target.value)}
                placeholder="Brief summary of the offer, terms or eligible items..."
                className="mt-1.5 rounded-xl text-xs font-semibold border-slate-200 min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="discount-type" className="font-bold text-slate-700">
                  Discount Type *
                </Label>
                <Select value={discountType} onValueChange={(val: any) => setDiscountType(val)}>
                  <SelectTrigger id="discount-type" className="mt-1.5 rounded-xl text-xs font-semibold h-10 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="discount-value" className="font-bold text-slate-700">
                  Discount Value *
                </Label>
                <Input
                  id="discount-value"
                  type="number"
                  step="0.01"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === "percentage" ? "15 (for 15%)" : "10 (for £10 off)"}
                  className="mt-1.5 rounded-xl text-xs font-semibold h-10 border-slate-200"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="apply-to" className="font-bold text-slate-700">
                  Apply To *
                </Label>
                <Select value={applyTo} onValueChange={(val: any) => setApplyTo(val)}>
                  <SelectTrigger id="apply-to" className="mt-1.5 rounded-xl text-xs font-semibold h-10 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="all">All Products</SelectItem>
                    <SelectItem value="category">Specific Category</SelectItem>
                    <SelectItem value="product">Specific Product</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {applyTo === "category" && (
                <div>
                  <Label htmlFor="target-category" className="font-bold text-slate-700">
                    Select Category
                  </Label>
                  <Select value={targetId} onValueChange={setTargetId}>
                    <SelectTrigger id="target-category" className="mt-1.5 rounded-xl text-xs font-semibold h-10 border-slate-200">
                      <SelectValue placeholder="Choose category..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.slug}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {applyTo === "product" && (
                <div>
                  <Label htmlFor="target-product" className="font-bold text-slate-700">
                    Select Product
                  </Label>
                  <Select value={targetId} onValueChange={setTargetId}>
                    <SelectTrigger id="target-product" className="mt-1.5 rounded-xl text-xs font-semibold h-10 border-slate-200">
                      <SelectValue placeholder="Choose product..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="start-date" className="font-bold text-slate-700">
                  Start Date *
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1.5 rounded-xl text-xs font-semibold h-10 border-slate-200"
                  required
                />
              </div>

              <div>
                <Label htmlFor="end-date" className="font-bold text-slate-700">
                  End Date
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1.5 rounded-xl text-xs font-semibold h-10 border-slate-200"
                />
              </div>

              <div>
                <Label htmlFor="status" className="font-bold text-slate-700">
                  Status *
                </Label>
                <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                  <SelectTrigger id="status" className="mt-1.5 rounded-xl text-xs font-semibold h-10 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Scheduled">Scheduled</SelectItem>
                    <SelectItem value="Disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="banner-url" className="font-bold text-slate-700">
                Offer Image / Banner URL (Optional)
              </Label>
              <Input
                id="banner-url"
                type="url"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="mt-1.5 rounded-xl text-xs font-semibold h-10 border-slate-200"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateOfferOpen(false)}
                className="rounded-full text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="rounded-full font-extrabold text-xs shadow-md bg-primary hover:bg-primary/90 text-white gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" /> Create Offer
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT OFFER MODAL */}
      <Dialog open={editOfferOpen} onOpenChange={setEditOfferOpen}>
        <DialogContent className="sm:max-w-xl rounded-3xl p-6 overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="font-black text-lg flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-primary" /> Edit Special Offer
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateOffer} className="space-y-4 pt-2 text-xs font-medium">
            <div>
              <Label htmlFor="edit-offer-title" className="font-bold text-slate-700">
                Offer Title *
              </Label>
              <Input
                id="edit-offer-title"
                value={offerTitle}
                onChange={(e) => setOfferTitle(e.target.value)}
                className="mt-1.5 rounded-xl text-xs font-semibold h-10 border-slate-200"
                required
              />
            </div>

            <div>
              <Label htmlFor="edit-offer-desc" className="font-bold text-slate-700">
                Description
              </Label>
              <Textarea
                id="edit-offer-desc"
                value={offerDescription}
                onChange={(e) => setOfferDescription(e.target.value)}
                className="mt-1.5 rounded-xl text-xs font-semibold border-slate-200 min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-discount-value" className="font-bold text-slate-700">
                  Discount (%)
                </Label>
                <Input
                  id="edit-discount-value"
                  type="number"
                  step="0.01"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="mt-1.5 rounded-xl text-xs font-semibold h-10 border-slate-200"
                />
              </div>

              <div>
                <Label htmlFor="edit-status" className="font-bold text-slate-700">
                  Status *
                </Label>
                <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                  <SelectTrigger id="edit-status" className="mt-1.5 rounded-xl text-xs font-semibold h-10 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Scheduled">Scheduled</SelectItem>
                    <SelectItem value="Disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-start-date" className="font-bold text-slate-700">
                  Start Date
                </Label>
                <Input
                  id="edit-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1.5 rounded-xl text-xs font-semibold h-10 border-slate-200"
                />
              </div>

              <div>
                <Label htmlFor="edit-end-date" className="font-bold text-slate-700">
                  End Date
                </Label>
                <Input
                  id="edit-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1.5 rounded-xl text-xs font-semibold h-10 border-slate-200"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-banner-url" className="font-bold text-slate-700">
                Offer Image / Banner URL
              </Label>
              <Input
                id="edit-banner-url"
                type="url"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                className="mt-1.5 rounded-xl text-xs font-semibold h-10 border-slate-200"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditOfferOpen(false)}
                className="rounded-full text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="rounded-full font-extrabold text-xs shadow-md bg-primary hover:bg-primary/90 text-white gap-2"
              >
                {submitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

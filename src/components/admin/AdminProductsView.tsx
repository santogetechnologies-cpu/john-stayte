import { useState, useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  Save,
  RotateCcw,
  Upload,
  Image as ImageIcon,
  Loader2,
  Flame,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  Sparkles,
  Tag,
  Check,
  Building2,
  Factory,
  Home,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { gbp } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { logAdminAuditAction } from "@/lib/audit";
import { INITIAL_GAS_PRODUCTS } from "@/lib/cylinder-service";
import { cleanImageUrl } from "@/lib/utils";

const GAS_TYPE_OPTIONS = [
  "Propane",
  "Butane",
  "Patio Gas",
  "Forklift Gas",
  "Pub Gas",
  "Bulk Propane",
  "Autogas",
  "Solid Fuel",
  "Other",
];

const USAGE_TYPES = [
  {
    value: "DOMESTIC",
    label: "Domestic LPG",
    icon: Home,
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    value: "COMMERCIAL",
    label: "Commercial LPG",
    icon: Building2,
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    value: "BULK",
    label: "Bulk LPG",
    icon: Factory,
    color: "bg-purple-50 text-purple-700 border-purple-200",
  },
];

export interface AdminProductsViewProps {
  initialUsageType?: "all" | "DOMESTIC" | "COMMERCIAL" | "BULK";
  lockedUsageType?: "DOMESTIC" | "COMMERCIAL" | "BULK";
  viewTitle?: string;
  viewDescription?: string;
}

export function AdminProductsView({
  initialUsageType = "all",
  lockedUsageType,
  viewTitle,
  viewDescription,
}: AdminProductsViewProps = {}) {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [usageFilter, setUsageFilter] = useState<string>(lockedUsageType || initialUsageType);
  const [gasTypeFilter, setGasTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");

  // Keep usageFilter in sync if lockedUsageType changes
  useEffect(() => {
    if (lockedUsageType) {
      setUsageFilter(lockedUsageType);
    }
  }, [lockedUsageType]);

  // Add / Edit Modal State
  const [editProduct, setEditProduct] = useState<any | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [newFeatureInput, setNewFeatureInput] = useState("");
  const [newSuitableInput, setNewSuitableInput] = useState("");
  const [newGalleryImgInput, setNewGalleryImgInput] = useState("");

  // Delete Confirmation Modal State
  const [deleteProductTarget, setDeleteProductTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Sync / Re-seed State
  const [syncing, setSyncing] = useState(false);

  // Load real products & categories from Supabase
  const loadProductsAndCategories = async () => {
    setLoading(true);
    try {
      const [{ data: prodData, error: prodErr }, { data: catData, error: catErr }] =
        await Promise.all([
          supabase.from("products").select("*").order("created_at", { ascending: false }),
          supabase
            .from("categories")
            .select("*")
            .eq("is_active", true)
            .order("display_order", { ascending: true }),
        ]);

      if (prodErr) throw prodErr;
      if (catErr) throw catErr;

      if (!prodData || prodData.length === 0) {
        // Seed initial products if DB is completely empty
        await handleSeedInitialProducts();
      } else {
        setProducts(prodData || []);
      }
      setCategories(catData || []);
    } catch (err: any) {
      console.error("Products query error:", err);
      toast.error("Failed to load products: " + err.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedInitialProducts = async () => {
    setSyncing(true);
    try {
      let count = 0;
      for (const seed of INITIAL_GAS_PRODUCTS) {
        const payload = {
          name: seed.name,
          slug: seed.slug,
          brand: seed.brand,
          category_slug: seed.category_slug,
          subcategory: seed.subcategory,
          description: seed.description,
          price: seed.price,
          stock: seed.stock,
          image_url: seed.image_url,
          specs: {
            usage_type: seed.usage_type,
            gas_type: seed.gas_type,
            cylinder_size: seed.cylinder_size,
            deposit_price: seed.deposit_price,
            refill_price: seed.refill_price,
            delivery_charge: seed.delivery_charge,
            is_active: seed.is_active,
            images: seed.images || [seed.image_url],
            features: seed.features || [],
            suitable_for: seed.suitable_for || [],
          },
        };
        const { error } = await supabase.from("products").upsert(payload, { onConflict: "slug" });
        if (!error) count++;
      }
      const { data: refreshed } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (refreshed) setProducts(refreshed);
      toast.success(`Synced ${count} gas catalog products!`);
    } catch (e: any) {
      toast.error("Sync error: " + e.message);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadProductsAndCategories();
  }, []);

  // Compute Metrics
  const totalProducts = products.length;
  const activeProducts = products.filter((p) => {
    const specs = p.specs && typeof p.specs === "object" ? p.specs : {};
    return p.is_active !== false && specs.is_active !== false;
  }).length;
  const lowStockProducts = products.filter((p) => p.stock > 0 && p.stock <= 10).length;
  const outOfStockProducts = products.filter((p) => p.stock === 0).length;

  // Filtered and Sorted Products List
  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => {
      const specs = p.specs && typeof p.specs === "object" ? p.specs : {};
      const productUsage =
        specs.usage_type || (p.category_slug === "bulk-gas" ? "BULK" : "DOMESTIC");
      const productGasType =
        specs.gas_type || (p.name.toLowerCase().includes("butane") ? "Butane" : "Propane");
      const isActive = p.is_active !== false && specs.is_active !== false;

      const matchesSearch =
        (p.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.brand || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.slug || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesUsage = usageFilter === "all" || productUsage === usageFilter;
      const matchesGasType =
        gasTypeFilter === "all" || productGasType.toLowerCase() === gasTypeFilter.toLowerCase();
      const matchesCategory = categoryFilter === "all" || p.category_slug === categoryFilter;

      let matchesStatus = true;
      if (statusFilter === "active") matchesStatus = isActive;
      if (statusFilter === "inactive") matchesStatus = !isActive;

      let matchesStock = true;
      if (stockFilter === "in-stock") matchesStock = p.stock > 10;
      if (stockFilter === "low-stock") matchesStock = p.stock > 0 && p.stock <= 10;
      if (stockFilter === "out-of-stock") matchesStock = p.stock === 0;

      return (
        matchesSearch &&
        matchesUsage &&
        matchesGasType &&
        matchesCategory &&
        matchesStatus &&
        matchesStock
      );
    });

    if (sortOrder === "newest") {
      result.sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
      );
    } else if (sortOrder === "name-asc") {
      result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else if (sortOrder === "price-asc") {
      result.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    } else if (sortOrder === "price-desc") {
      result.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    } else if (sortOrder === "stock-desc") {
      result.sort((a, b) => Number(b.stock || 0) - Number(a.stock || 0));
    }

    return result;
  }, [
    products,
    searchQuery,
    usageFilter,
    gasTypeFilter,
    statusFilter,
    stockFilter,
    categoryFilter,
    sortOrder,
  ]);

  // Open Form for New Product
  const handleOpenNew = () => {
    const defaultUsage = lockedUsageType || (usageFilter !== "all" ? usageFilter : "DOMESTIC");
    const isBulk = defaultUsage === "BULK";
    const isCommercial = defaultUsage === "COMMERCIAL";

    setEditProduct({
      name: "",
      slug: `gas-${Date.now()}`,
      brand: isBulk ? "Stayte Bulk LPG" : "Calor",
      category_slug: isBulk ? "bulk-gas" : "bottled-gas",
      subcategory: isBulk
        ? "Bulk Tank Supply"
        : isCommercial
          ? "Commercial Propane"
          : "Propane Cylinders",
      price: isBulk ? 780.0 : isCommercial ? 94.0 : 45.0,
      stock: 25,
      image_url: isBulk
        ? "/own_vehicle_fleet_truck_1787408938768.jpg"
        : isCommercial
          ? "/safety_storage_v2.jpg"
          : "/domestic_kitchen_cylinder.jpg",
      images: [
        isBulk
          ? "/own_vehicle_fleet_truck_1787408938768.jpg"
          : isCommercial
            ? "/safety_storage_v2.jpg"
            : "/domestic_kitchen_cylinder.jpg",
      ],
      description: "",
      usage_type: defaultUsage,
      gas_type: isBulk ? "Bulk Propane" : "Propane",
      cylinder_size: isBulk ? "1,000L - 4,000L Vessel" : isCommercial ? "47kg" : "13kg",
      deposit_price: isBulk ? 0 : isCommercial ? 59.99 : 39.99,
      refill_price: isBulk ? 780.0 : isCommercial ? 94.0 : 45.0,
      delivery_charge: 0,
      is_active: true,
      features: isBulk
        ? [
            "Direct metered bulk road tanker pump delivery",
            "On-site bulk vessel replenishment across Gloucestershire",
            "Telemetry tank monitoring & automatic top-ups available",
          ]
        : isCommercial
          ? [
              "Standard POL screw fitting (Female 5/8 inch LH)",
              "Heavy-duty commercial propane for continuous commercial kitchens & heating",
              "Direct Stayte commercial supply and site delivery",
            ]
          : [
              "Standard POL screw fitting (Female 5/8 inch LH)",
              "High-performance domestic heating & cooking",
              "Direct Stayte forecourt & home delivery",
            ],
      suitable_for: isBulk
        ? [
            "Poultry & Livestock Rearing",
            "Crop & Grain Drying",
            "Commercial Glasshouses",
            "Large Rural Estates",
          ]
        : isCommercial
          ? [
              "Commercial Kitchens & Hospitality",
              "Hotels & Restaurants",
              "Holiday Parks",
              "Workshops",
            ]
          : ["Home Central Heating", "Gas Cookers", "Space Heaters"],
    });
    setNewFeatureInput("");
    setNewSuitableInput("");
    setNewGalleryImgInput("");
    setIsNew(true);
    setModalOpen(true);
  };

  // Open Form for Edit Product
  const handleOpenEdit = (prod: any) => {
    const specs = prod.specs && typeof prod.specs === "object" ? prod.specs : {};
    const rawImages =
      Array.isArray(specs.images) && specs.images.length > 0
        ? specs.images
        : Array.isArray(prod.images) && prod.images.length > 0
          ? prod.images
          : prod.image_url
            ? [prod.image_url]
            : [];

    const features =
      Array.isArray(prod.features) && prod.features.length > 0
        ? prod.features
        : Array.isArray(specs.features) && specs.features.length > 0
          ? specs.features
          : [];

    const suitableFor =
      Array.isArray(prod.suitable_for) && prod.suitable_for.length > 0
        ? prod.suitable_for
        : Array.isArray(specs.suitable_for) && specs.suitable_for.length > 0
          ? specs.suitable_for
          : Array.isArray(specs.applications) && specs.applications.length > 0
            ? specs.applications
            : [];

    setEditProduct({
      ...prod,
      usage_type: specs.usage_type || (prod.category_slug === "bulk-gas" ? "BULK" : "DOMESTIC"),
      gas_type:
        specs.gas_type || (prod.name.toLowerCase().includes("butane") ? "Butane" : "Propane"),
      cylinder_size: specs.cylinder_size || prod.name.match(/\d+(\.\d+)?kg/i)?.[0] || "13kg",
      deposit_price: Number(specs.deposit_price ?? 39.99),
      refill_price: Number(specs.refill_price ?? prod.price ?? 45.0),
      delivery_charge: Number(specs.delivery_charge ?? 0),
      is_active: prod.is_active !== false && specs.is_active !== false,
      images: rawImages,
      features: features,
      suitable_for: suitableFor,
    });
    setNewFeatureInput("");
    setNewSuitableInput("");
    setNewGalleryImgInput("");
    setIsNew(false);
    setModalOpen(true);
  };

  // Toggle Active/Inactive Status directly in Supabase
  const handleToggleActive = async (prod: any, currentActive: boolean) => {
    const newActive = !currentActive;
    try {
      const specs = prod.specs && typeof prod.specs === "object" ? { ...prod.specs } : {};
      specs.is_active = newActive;

      const { error } = await supabase
        .from("products")
        .update({
          specs,
          updated_at: new Date().toISOString(),
        })
        .eq("id", prod.id);

      if (error) throw error;

      setProducts((prev) =>
        prev.map((p) => (p.id === prod.id ? { ...p, is_active: newActive, specs } : p)),
      );
      toast.success(`${prod.name} is now ${newActive ? "Active" : "Inactive"}`);
      await logAdminAuditAction("TOGGLE_STATUS_PRODUCT", "products", prod.id, {
        active: newActive,
      });
    } catch (err: any) {
      toast.error("Failed to update status: " + err.message);
    }
  };

  // Image Upload to Supabase Storage
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isGallery = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from("product-images")
        .upload(filePath, file, { upsert: true });

      if (uploadErr) {
        // Fallback notice
        console.warn("Storage upload notice:", uploadErr);
      }

      const { data: publicUrlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      const url = publicUrlData?.publicUrl || `/uploads/${fileName}`;

      if (isGallery) {
        setEditProduct((prev: any) => ({
          ...prev,
          images: [...(prev.images || []), url],
        }));
        toast.success("Gallery image uploaded!");
      } else {
        setEditProduct((prev: any) => ({
          ...prev,
          image_url: url,
          images: prev.images && prev.images.length > 0 ? prev.images : [url],
        }));
        toast.success("Main image updated!");
      }
    } catch (err: any) {
      toast.error("Image upload notice: " + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  // Save / Update in Supabase
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!editProduct.name?.trim()) {
      return toast.error("Product Name is required.");
    }
    if (!editProduct.usage_type) {
      return toast.error("Usage Type (Domestic, Commercial, or Bulk) is mandatory.");
    }
    if (!editProduct.gas_type) {
      return toast.error("Gas Type is required.");
    }
    if (isNaN(Number(editProduct.price)) || Number(editProduct.price) <= 0) {
      return toast.error("Please enter a valid positive price.");
    }
    if (!editProduct.image_url?.trim()) {
      return toast.error("Main Product Image is required.");
    }
    if (!editProduct.description?.trim()) {
      return toast.error("Product description is required.");
    }

    setSaving(true);
    try {
      const selectedCategoryObj = categories.find((c) => c.slug === editProduct.category_slug);

      const imagesArray =
        Array.isArray(editProduct.images) && editProduct.images.length > 0
          ? editProduct.images
          : [editProduct.image_url];

      const specsPayload = {
        usage_type: editProduct.usage_type,
        gas_type: editProduct.gas_type,
        cylinder_size: editProduct.cylinder_size || "13kg",
        deposit_price: Number(editProduct.deposit_price ?? 39.99),
        refill_price: Number(editProduct.refill_price ?? editProduct.price),
        delivery_charge: Number(editProduct.delivery_charge ?? 0),
        is_gas_product: true,
        is_active: editProduct.is_active !== false,
        images: imagesArray,
        features: editProduct.features || [],
        suitable_for: editProduct.suitable_for || [],
      };

      if (isNew) {
        const slug =
          editProduct.slug?.trim() || editProduct.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

        const { error } = await supabase.from("products").insert([
          {
            name: editProduct.name.trim(),
            slug: slug,
            brand: editProduct.brand || "Calor",
            category_id: selectedCategoryObj?.id || null,
            category_slug: editProduct.category_slug || "bottled-gas",
            subcategory: editProduct.subcategory || "General",
            price: Number(editProduct.price),
            stock: Number(editProduct.stock || 0),
            image_url: editProduct.image_url.trim(),
            description: editProduct.description.trim(),
            specs: specsPayload,
          },
        ]);

        if (error) throw error;
        await logAdminAuditAction("CREATE_PRODUCT", "products", editProduct.name, {
          price: editProduct.price,
        });
        toast.success(`Product "${editProduct.name}" created successfully!`);
      } else {
        const { error } = await supabase
          .from("products")
          .update({
            name: editProduct.name.trim(),
            brand: editProduct.brand || "Calor",
            category_id: selectedCategoryObj?.id || null,
            category_slug: editProduct.category_slug,
            subcategory: editProduct.subcategory,
            price: Number(editProduct.price),
            stock: Number(editProduct.stock || 0),
            image_url: editProduct.image_url.trim(),
            description: editProduct.description.trim(),
            specs: specsPayload,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editProduct.id);

        if (error) throw error;
        await logAdminAuditAction("UPDATE_PRODUCT", "products", editProduct.id, {
          name: editProduct.name,
        });
        toast.success(`Product "${editProduct.name}" updated successfully!`);
      }

      setModalOpen(false);
      await loadProductsAndCategories();
    } catch (err: any) {
      console.error("Save product error:", err);
      toast.error("Failed to save product: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete from Supabase
  const handleConfirmDelete = async () => {
    if (!deleteProductTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("products").delete().eq("id", deleteProductTarget.id);
      if (error) throw error;
      await logAdminAuditAction("DELETE_PRODUCT", "products", deleteProductTarget.id, {
        name: deleteProductTarget.name,
      });
      toast.success(`Product "${deleteProductTarget.name}" deleted successfully.`);
      setDeleteProductTarget(null);
      await loadProductsAndCategories();
    } catch (err: any) {
      toast.error("Failed to delete product: " + err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. HEADER & TOP ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/admin" className="hover:text-primary transition-colors">
              Admin
            </Link>
            <span>/</span>
            {lockedUsageType ? (
              <>
                <span className="text-slate-400">Order Gas</span>
                <span>/</span>
                <span className="text-foreground font-bold">
                  {viewTitle || `${lockedUsageType} LPG`}
                </span>
              </>
            ) : (
              <span className="text-foreground font-bold">Products & Gas Catalog</span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground font-display">
            {viewTitle || "Product Management"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {viewDescription ||
              "Create, update, and manage all gas cylinders, bulk supplies, pricing, features, and stock."}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          <Button
            onClick={handleSeedInitialProducts}
            disabled={syncing}
            variant="outline"
            size="sm"
            className="rounded-full font-bold text-xs gap-1.5 border-slate-200 hover:bg-slate-50"
          >
            {syncing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            Sync Standard Catalog
          </Button>

          <Button
            onClick={handleOpenNew}
            size="sm"
            className="rounded-full font-bold text-xs gap-1.5 bg-[#c8102e] hover:bg-[#a50d24] text-white shadow-md"
          >
            <Plus className="h-4 w-4" />
            <span>
              {lockedUsageType === "DOMESTIC"
                ? "Add Domestic Product"
                : lockedUsageType === "COMMERCIAL"
                  ? "Add Commercial Product"
                  : lockedUsageType === "BULK"
                    ? "Add Bulk Product"
                    : "Add Gas Product"}
            </span>
          </Button>
        </div>
      </div>

      {/* 2. REAL SUPABASE KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => {
            setStockFilter("all");
            setStatusFilter("all");
            setUsageFilter("all");
          }}
          className="surface-card p-4 rounded-2xl border bg-white space-y-1 text-left cursor-pointer transition-all hover:border-slate-300 hover:shadow-xs"
        >
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Total Products
          </p>
          <p className="text-2xl font-black text-foreground">{totalProducts}</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("active")}
          className="surface-card p-4 rounded-2xl border bg-white space-y-1 text-left cursor-pointer transition-all hover:border-emerald-300 hover:shadow-xs"
        >
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Active in Order Gas
          </p>
          <p className="text-2xl font-black text-emerald-600">{activeProducts}</p>
        </button>

        <button
          type="button"
          onClick={() => setStockFilter("low-stock")}
          className="surface-card p-4 rounded-2xl border bg-white space-y-1 text-left cursor-pointer transition-all hover:border-amber-300 hover:shadow-xs"
        >
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Low Stock (&le;10)
          </p>
          <p className="text-2xl font-black text-amber-600">{lowStockProducts}</p>
        </button>

        <button
          type="button"
          onClick={() => setStockFilter("out-of-stock")}
          className="surface-card p-4 rounded-2xl border bg-white space-y-1 text-left cursor-pointer transition-all hover:border-rose-300 hover:shadow-xs"
        >
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Out of Stock
          </p>
          <p className="text-2xl font-black text-rose-600">{outOfStockProducts}</p>
        </button>
      </div>

      {/* 3. MULTI-DIMENSIONAL FILTERS & SEARCH */}
      <div className="surface-card p-4 rounded-2xl border bg-white space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search Box */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, brand, SKU..."
              className="pl-9 rounded-xl h-10 text-xs"
            />
          </div>

          {/* Usage Type Filter */}
          <div>
            <Select value={usageFilter} onValueChange={setUsageFilter}>
              <SelectTrigger className="rounded-xl h-10 text-xs bg-white">
                <SelectValue placeholder="Usage Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Usage Types</SelectItem>
                <SelectItem value="DOMESTIC">🏠 Domestic LPG</SelectItem>
                <SelectItem value="COMMERCIAL">🏨 Commercial LPG</SelectItem>
                <SelectItem value="BULK">🏭 Bulk LPG</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Gas Type Filter */}
          <div>
            <Select value={gasTypeFilter} onValueChange={setGasTypeFilter}>
              <SelectTrigger className="rounded-xl h-10 text-xs bg-white">
                <SelectValue placeholder="Gas Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Gas Types</SelectItem>
                {GAS_TYPE_OPTIONS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="rounded-xl h-10 text-xs bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort Order */}
          <div>
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="rounded-xl h-10 text-xs bg-white">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                <SelectItem value="price-asc">Price (Low-High)</SelectItem>
                <SelectItem value="price-desc">Price (High-Low)</SelectItem>
                <SelectItem value="stock-desc">Stock (Highest)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 4. PRODUCTS TABLE */}
      <div className="surface-card rounded-2xl border bg-white overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="mx-auto h-8 w-8 text-primary animate-spin" />
            <p className="text-xs text-muted-foreground font-semibold">Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Package className="mx-auto h-10 w-10 text-slate-300" />
            <p className="text-sm font-bold text-slate-800">No matching products found</p>
            <p className="text-xs text-slate-500">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="w-16">Image</TableHead>
                <TableHead>Product Details</TableHead>
                <TableHead>Usage & Gas</TableHead>
                <TableHead>Size / Format</TableHead>
                <TableHead>Price (inc. VAT)</TableHead>
                <TableHead>Stock Status</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((p) => {
                const specs = p.specs && typeof p.specs === "object" ? p.specs : {};
                const usage =
                  specs.usage_type || (p.category_slug === "bulk-gas" ? "BULK" : "DOMESTIC");
                const gasType =
                  specs.gas_type ||
                  (p.name.toLowerCase().includes("butane") ? "Butane" : "Propane");
                const size = specs.cylinder_size || p.name.match(/\d+(\.\d+)?kg/i)?.[0] || "—";
                const isActive = p.is_active !== false && specs.is_active !== false;
                const usageConfig = USAGE_TYPES.find((u) => u.value === usage) || USAGE_TYPES[0];
                const UsageIcon = usageConfig.icon;

                return (
                  <TableRow key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Image */}
                    <TableCell>
                      <div className="h-12 w-12 rounded-xl border bg-white p-1 flex items-center justify-center overflow-hidden shadow-2xs">
                        {p.image_url ? (
                          <img
                            src={cleanImageUrl(p.image_url, p.slug)}
                            alt={p.name}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <Package className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                    </TableCell>

                    {/* Details */}
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            {p.brand || "Calor"}
                          </span>
                          {p.subcategory && (
                            <span className="text-[10px] text-slate-400">• {p.subcategory}</span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-foreground leading-snug">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate max-w-xs">
                          {p.slug}
                        </p>
                      </div>
                    </TableCell>

                    {/* Usage & Gas */}
                    <TableCell>
                      <div className="space-y-1">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${usageConfig.color}`}
                        >
                          <UsageIcon className="h-3 w-3" />
                          <span>{usageConfig.label}</span>
                        </span>
                        <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                          <Flame className="h-3 w-3 text-red-500" />
                          <span>{gasType}</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Size */}
                    <TableCell>
                      <span className="text-xs font-extrabold text-slate-800 bg-slate-100 rounded-md px-2 py-1">
                        {size}
                      </span>
                    </TableCell>

                    {/* Price */}
                    <TableCell>
                      <div>
                        <p className="text-xs font-black text-foreground">{gbp(Number(p.price))}</p>
                        {specs.refill_price && (
                          <p className="text-[10px] text-slate-500 font-medium">
                            Refill: {gbp(Number(specs.refill_price))}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {/* Stock */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          p.stock > 10
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : p.stock > 0
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-red-50 text-red-700 border-red-200"
                        }`}
                      >
                        {p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}
                      </Badge>
                    </TableCell>

                    {/* Active Status */}
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(p, isActive)}
                        className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-1 rounded-full border transition-all cursor-pointer ${
                          isActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200"
                        }`}
                      >
                        {isActive ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 text-slate-400" />
                            <span>Inactive</span>
                          </>
                        )}
                      </button>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-full hover:bg-slate-100 text-slate-600"
                          onClick={() => handleOpenEdit(p)}
                          title="Edit Product"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-full hover:bg-red-50 text-red-600"
                          onClick={() => setDeleteProductTarget(p)}
                          title="Delete Product"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* 5. ADD / EDIT PRODUCT COMPLETE FORM MODAL */}
      {editProduct && (
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-3xl rounded-3xl p-6 sm:p-8 bg-white space-y-6 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl font-black text-slate-900 font-display">
                {isNew ? "Add New Gas Product" : `Edit Product: ${editProduct.name || ""}`}
              </DialogTitle>
              <p className="text-xs text-slate-500">
                All fields save directly to the real Supabase database and sync live with the
                customer Order Gas page.
              </p>
            </DialogHeader>

            <form onSubmit={handleSaveProduct} className="space-y-6 text-xs text-left">
              {/* SECTION A: BASIC INFORMATION */}
              <div className="space-y-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 font-sans flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-primary" />
                  <span>1. Basic Information</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="font-bold text-slate-800">Product Name *</label>
                    <Input
                      required
                      value={editProduct.name || ""}
                      onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })}
                      placeholder="e.g. Calor 13kg Propane Gas Cylinder"
                      className="rounded-xl h-10 text-xs bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-800">Brand</label>
                    <Input
                      value={editProduct.brand || ""}
                      onChange={(e) => setEditProduct({ ...editProduct, brand: e.target.value })}
                      placeholder="e.g. Calor / Stayte Gas / Campingaz"
                      className="rounded-xl h-10 text-xs bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-800">SKU / URL Slug *</label>
                    <Input
                      required
                      value={editProduct.slug || ""}
                      onChange={(e) => setEditProduct({ ...editProduct, slug: e.target.value })}
                      placeholder="e.g. calor-13kg-propane-cylinder"
                      className="rounded-xl h-10 text-xs bg-white font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-800">Product Category</label>
                    <Select
                      value={editProduct.category_slug || "bottled-gas"}
                      onValueChange={(v) => setEditProduct({ ...editProduct, category_slug: v })}
                    >
                      <SelectTrigger className="rounded-xl h-10 text-xs bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bottled-gas">Bottled Gas Cylinders</SelectItem>
                        <SelectItem value="bulk-gas">Bulk Gas & Tanks</SelectItem>
                        <SelectItem value="gas-appliances">Gas Appliances</SelectItem>
                        <SelectItem value="gas-spares">Gas Spares & Regulators</SelectItem>
                        <SelectItem value="coal-logs">Coal & Logs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-800">Subcategory / Range</label>
                    <Input
                      value={editProduct.subcategory || ""}
                      onChange={(e) =>
                        setEditProduct({ ...editProduct, subcategory: e.target.value })
                      }
                      placeholder="e.g. Propane Cylinders / Patio Gas / Commercial FLT"
                      className="rounded-xl h-10 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION B: USAGE TYPE & GAS SPECIFICATIONS */}
              <div className="space-y-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 font-sans flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-red-600" />
                  <span>2. Usage Type & Gas Classification (Mandatory)</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Usage Type */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-800">Usage Type *</label>
                    <Select
                      value={editProduct.usage_type || "DOMESTIC"}
                      onValueChange={(v) => setEditProduct({ ...editProduct, usage_type: v })}
                    >
                      <SelectTrigger className="rounded-xl h-10 text-xs bg-white font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DOMESTIC">🏠 DOMESTIC LPG</SelectItem>
                        <SelectItem value="COMMERCIAL">🏨 COMMERCIAL LPG</SelectItem>
                        <SelectItem value="BULK">🏭 BULK LPG</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Gas Type */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-800">Gas Type *</label>
                    <Select
                      value={editProduct.gas_type || "Propane"}
                      onValueChange={(v) => setEditProduct({ ...editProduct, gas_type: v })}
                    >
                      <SelectTrigger className="rounded-xl h-10 text-xs bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GAS_TYPE_OPTIONS.map((g) => (
                          <SelectItem key={g} value={g}>
                            {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Cylinder Size */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-800">Cylinder Size / Weight *</label>
                    <Input
                      required
                      value={editProduct.cylinder_size || "13kg"}
                      onChange={(e) =>
                        setEditProduct({ ...editProduct, cylinder_size: e.target.value })
                      }
                      placeholder="e.g. 13kg / 47kg / 15kg / 1,000L Vessel"
                      className="rounded-xl h-10 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION C: PRICING & INVENTORY */}
              <div className="space-y-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 font-sans flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-emerald-600" />
                  <span>3. Pricing & Stock</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-800">New Purchase Price (£) *</label>
                    <Input
                      type="number"
                      step="0.01"
                      required
                      value={editProduct.price || 0}
                      onChange={(e) =>
                        setEditProduct({ ...editProduct, price: parseFloat(e.target.value) || 0 })
                      }
                      className="rounded-xl h-10 text-xs bg-white font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-800">Refill / Exchange (£)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editProduct.refill_price || 0}
                      onChange={(e) =>
                        setEditProduct({
                          ...editProduct,
                          refill_price: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="rounded-xl h-10 text-xs bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-800">Cylinder Deposit (£)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editProduct.deposit_price || 0}
                      onChange={(e) =>
                        setEditProduct({
                          ...editProduct,
                          deposit_price: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="rounded-xl h-10 text-xs bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-800">Stock Quantity *</label>
                    <Input
                      type="number"
                      required
                      value={editProduct.stock || 0}
                      onChange={(e) =>
                        setEditProduct({ ...editProduct, stock: parseInt(e.target.value) || 0 })
                      }
                      className="rounded-xl h-10 text-xs bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={editProduct.is_active !== false}
                      onChange={(e) =>
                        setEditProduct({ ...editProduct, is_active: e.target.checked })
                      }
                      className="h-4 w-4 rounded text-primary"
                    />
                    <span>Active in Order Gas & Store</span>
                  </label>
                </div>
              </div>

              {/* SECTION D: DESCRIPTION & DETAILS */}
              <div className="space-y-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 font-sans flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                  <span>4. Product Description & Features</span>
                </h3>

                <div className="space-y-1">
                  <label className="font-bold text-slate-800">Product Description *</label>
                  <Textarea
                    required
                    rows={3}
                    value={editProduct.description || ""}
                    onChange={(e) =>
                      setEditProduct({ ...editProduct, description: e.target.value })
                    }
                    placeholder="Describe the cylinder's applications, fitting type, safety compliance, and gas characteristics..."
                    className="rounded-xl text-xs bg-white leading-relaxed"
                  />
                </div>

                {/* Key Features (Dynamic Repeatable List) */}
                <div className="space-y-2 pt-2">
                  <label className="font-bold text-slate-800 block">
                    Key Features (Bullet points in modal)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={newFeatureInput}
                      onChange={(e) => setNewFeatureInput(e.target.value)}
                      placeholder="e.g. 21mm Clip-on regulator fitting"
                      className="rounded-xl h-9 text-xs bg-white"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (newFeatureInput.trim()) {
                            setEditProduct({
                              ...editProduct,
                              features: [...(editProduct.features || []), newFeatureInput.trim()],
                            });
                            setNewFeatureInput("");
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        if (newFeatureInput.trim()) {
                          setEditProduct({
                            ...editProduct,
                            features: [...(editProduct.features || []), newFeatureInput.trim()],
                          });
                          setNewFeatureInput("");
                        }
                      }}
                      className="rounded-xl text-xs h-9"
                    >
                      Add
                    </Button>
                  </div>

                  {editProduct.features && editProduct.features.length > 0 && (
                    <ul className="space-y-1.5 pt-1">
                      {editProduct.features.map((f: string, idx: number) => (
                        <li
                          key={idx}
                          className="flex items-center justify-between bg-white rounded-lg p-2 border border-slate-200 text-xs"
                        >
                          <span className="flex items-center gap-1.5 text-slate-700">
                            <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                            {f}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setEditProduct({
                                ...editProduct,
                                features: editProduct.features.filter(
                                  (_: any, i: number) => i !== idx,
                                ),
                              })
                            }
                            className="text-slate-400 hover:text-red-500 transition-colors p-0.5 cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Suitable For / Recommended Uses (Dynamic Repeatable List) */}
                <div className="space-y-2 pt-2">
                  <label className="font-bold text-slate-800 block">
                    Suitable For / Recommended Uses (Tags in modal)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={newSuitableInput}
                      onChange={(e) => setNewSuitableInput(e.target.value)}
                      placeholder="e.g. Indoor Mobile Cabinet Heaters"
                      className="rounded-xl h-9 text-xs bg-white"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (newSuitableInput.trim()) {
                            setEditProduct({
                              ...editProduct,
                              suitable_for: [
                                ...(editProduct.suitable_for || []),
                                newSuitableInput.trim(),
                              ],
                            });
                            setNewSuitableInput("");
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        if (newSuitableInput.trim()) {
                          setEditProduct({
                            ...editProduct,
                            suitable_for: [
                              ...(editProduct.suitable_for || []),
                              newSuitableInput.trim(),
                            ],
                          });
                          setNewSuitableInput("");
                        }
                      }}
                      className="rounded-xl text-xs h-9"
                    >
                      Add Tag
                    </Button>
                  </div>

                  {editProduct.suitable_for && editProduct.suitable_for.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {editProduct.suitable_for.map((tagItem: string, idx: number) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1 text-xs"
                        >
                          <Flame className="h-3 w-3 text-red-500" />
                          <span>{tagItem}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setEditProduct({
                                ...editProduct,
                                suitable_for: editProduct.suitable_for.filter(
                                  (_: any, i: number) => i !== idx,
                                ),
                              })
                            }
                            className="text-slate-400 hover:text-red-500 cursor-pointer"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION E: IMAGES & GALLERY */}
              <div className="space-y-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 font-sans flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-blue-600" />
                  <span>5. Main Image & Gallery</span>
                </h3>

                {/* Main Product Image */}
                <div className="space-y-2">
                  <label className="font-bold text-slate-800 block">Main Product Image URL *</label>
                  <div className="flex gap-2">
                    <Input
                      required
                      value={editProduct.image_url || ""}
                      onChange={(e) =>
                        setEditProduct({ ...editProduct, image_url: e.target.value })
                      }
                      placeholder="e.g. /domestic_kitchen_cylinder.jpg"
                      className="rounded-xl h-10 text-xs bg-white font-mono"
                    />
                    <label className="cursor-pointer">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={uploadingImage}
                        className="rounded-xl h-10 text-xs gap-1.5 font-bold"
                        onClick={() => document.getElementById("main-image-upload")?.click()}
                      >
                        {uploadingImage ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}
                        Upload
                      </Button>
                      <input
                        id="main-image-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, false)}
                      />
                    </label>
                  </div>

                  {/* Main Image Preview */}
                  {editProduct.image_url && (
                    <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-200 w-fit">
                      <img
                        src={editProduct.image_url}
                        alt="Main Preview"
                        className="h-16 w-16 object-contain rounded-lg border bg-slate-50 p-1"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/calor-cylinders-studio.jpg";
                        }}
                      />
                      <div className="text-[11px] text-slate-600 font-medium">
                        <p className="font-bold text-slate-800">Primary Product Photo</p>
                        <p className="text-slate-400 font-mono text-[10px]">
                          {editProduct.image_url}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Gallery Images */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <label className="font-bold text-slate-800 block">
                    Additional Gallery Images
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={newGalleryImgInput}
                      onChange={(e) => setNewGalleryImgInput(e.target.value)}
                      placeholder="e.g. /safety_storage_v2.jpg"
                      className="rounded-xl h-9 text-xs bg-white font-mono"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        if (newGalleryImgInput.trim()) {
                          setEditProduct({
                            ...editProduct,
                            images: [...(editProduct.images || []), newGalleryImgInput.trim()],
                          });
                          setNewGalleryImgInput("");
                        }
                      }}
                      className="rounded-xl text-xs h-9"
                    >
                      Add URL
                    </Button>
                    <label className="cursor-pointer">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingImage}
                        className="rounded-xl h-9 text-xs"
                        onClick={() => document.getElementById("gallery-image-upload")?.click()}
                      >
                        Upload
                      </Button>
                      <input
                        id="gallery-image-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, true)}
                      />
                    </label>
                  </div>

                  {editProduct.images && editProduct.images.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {editProduct.images.map((img: string, idx: number) => (
                        <div
                          key={idx}
                          className="relative group h-16 w-16 rounded-xl border-2 bg-white p-1 overflow-hidden"
                        >
                          <img
                            src={img}
                            alt={`Gallery ${idx + 1}`}
                            className="h-full w-full object-contain"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setEditProduct({
                                ...editProduct,
                                images: editProduct.images.filter((_: any, i: number) => i !== idx),
                              })
                            }
                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* MODAL FOOTER ACTIONS */}
              <DialogFooter className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  className="rounded-full px-6 font-bold text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="rounded-full px-8 font-extrabold text-xs bg-[#c8102e] hover:bg-[#a50d24] text-white shadow-md gap-1.5"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>{isNew ? "Create Product" : "Save Product Updates"}</span>
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* 6. DELETE CONFIRMATION DIALOG */}
      <Dialog
        open={!!deleteProductTarget}
        onOpenChange={(open) => !open && setDeleteProductTarget(null)}
      >
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white space-y-4">
          <DialogHeader>
            <DialogTitle className="font-black text-lg text-slate-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-600" />
              <span>Delete Product?</span>
            </DialogTitle>
          </DialogHeader>

          {deleteProductTarget && (
            <div className="space-y-3 text-xs text-slate-600">
              <p>
                Are you sure you want to permanently delete{" "}
                <strong className="text-slate-900">{deleteProductTarget.name}</strong> from the
                catalog?
              </p>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
                <strong>Warning:</strong> This action cannot be undone. The product will no longer
                appear on the customer Order Gas page or store catalog.
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() => setDeleteProductTarget(null)}
              className="rounded-full px-5 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={deleting}
              onClick={handleConfirmDelete}
              className="rounded-full px-5 text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white shadow-md"
            >
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              <span>Confirm Delete</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

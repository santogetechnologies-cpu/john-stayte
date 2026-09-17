import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Layers,
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  Save,
  FolderOpen,
  CheckCircle2,
  XCircle,
  ArrowUpDown,
  Upload,
  Loader2,
  Image as ImageIcon,
  RotateCcw,
  ExternalLink,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { gbp } from "@/lib/store";
import { cleanImageUrl } from "@/lib/utils";
import {
  syncFullCatalogToSupabase,
  CANONICAL_CATEGORIES,
  getProductsForCategory,
  getCategoryProductCount,
} from "@/lib/catalog-source-of-truth";

const ICON_OPTIONS = [
  "Flame",
  "Building2",
  "Factory",
  "Car",
  "Home",
  "Logs",
  "Fish",
  "Dog",
  "CookingPot",
  "Wrench",
  "Sprout",
  "Utensils",
  "Truck",
  "Shirt",
  "Tent",
  "Trees",
  "Package",
];

export function AdminCategoriesView() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Selected Category for Right Pane
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Modal State for Create / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editCategory, setEditCategory] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Manual & Auto Reconciliation of All 40 Categories
  const handleSyncCategories = async () => {
    setSyncing(true);
    try {
      const res = await syncFullCatalogToSupabase(supabase);
      if (res.errors.length > 0) {
        console.warn("Sync notices:", res.errors);
      }
      toast.success(`Synchronized ${res.categoriesSynced} categories and ${res.productsSynced} products!`);
      await loadCategoryData();
    } catch (err: any) {
      toast.error("Catalogue sync error: " + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const fileName = `category-${Date.now()}.${file.name.split(".").pop()}`;
      const filePath = `categories/${fileName}`;
      const { error: uploadErr } = await supabase.storage
        .from("product-images")
        .upload(filePath, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);

      setEditCategory((prev: any) => ({
        ...prev,
        image_url: data.publicUrl,
        image: data.publicUrl,
      }));
      toast.success("Category image uploaded!");
    } catch (err: any) {
      console.warn("Storage upload notice:", err.message);
      setEditCategory((prev: any) => ({
        ...prev,
        image_url: URL.createObjectURL(file),
        image: URL.createObjectURL(file),
      }));
      toast.success("Image selected for category!");
    } finally {
      setUploadingImage(false);
    }
  };

  // Load Categories and Products from Supabase
  const loadCategoryData = async () => {
    setLoading(true);
    try {
      const [{ data: dbCats, error: catErr }, { data: dbProds, error: prodErr }] =
        await Promise.all([
          supabase.from("categories").select("*").order("display_order", { ascending: true }),
          supabase.from("products").select("id, slug, name, brand, subcategory, price, stock, image_url, category_slug, is_active, specs").order("name", { ascending: true }),
        ]);

      if (catErr) throw catErr;
      if (prodErr) throw prodErr;

      if (!dbCats || dbCats.length < 35) {
        // Auto-seed missing canonical categories on first run
        await syncFullCatalogToSupabase(supabase);
        const { data: refreshedCats } = await supabase
          .from("categories")
          .select("*")
          .order("display_order", { ascending: true });
        const { data: refreshedProds } = await supabase
          .from("products")
          .select("id, slug, name, brand, subcategory, price, stock, image_url, category_slug, is_active, specs")
          .order("name", { ascending: true });
        setCategories(refreshedCats || CANONICAL_CATEGORIES);
        setProducts(refreshedProds || []);
      } else {
        setCategories(dbCats || []);
        setProducts(dbProds || []);
      }

      if (dbCats && dbCats.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(dbCats[0].id);
      }
    } catch (err: any) {
      console.warn("Load categories error:", err);
      setCategories(CANONICAL_CATEGORIES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategoryData();
  }, []);

  // Map product counts per category using unified catalog resolver
  const productCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    categories.forEach((c) => {
      map[c.slug] = getCategoryProductCount(c.slug, products);
    });
    return map;
  }, [categories, products]);

  // KPI Calculations
  const totalCategories = categories.length;
  const activeCategories = categories.filter((c) => c.is_active !== false).length;
  const categoriesWithProducts = categories.filter(
    (c) => (productCountMap[c.slug] || 0) > 0,
  ).length;
  const emptyCategories = categories.filter((c) => (productCountMap[c.slug] || 0) === 0).length;

  // Filtered Category List for Left Pane
  const filteredCategories = useMemo(() => {
    return categories.filter(
      (c) =>
        (c.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.slug || "").toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [categories, searchQuery]);

  // Currently Selected Category object
  const selectedCategory = useMemo(() => {
    return categories.find((c) => c.id === selectedCategoryId) || categories[0] || null;
  }, [categories, selectedCategoryId]);

  const selectedCategoryProductCount = selectedCategory
    ? productCountMap[selectedCategory.slug] || 0
    : 0;

  // Selected Category's actual products
  const selectedCategoryProducts = useMemo(() => {
    if (!selectedCategory) return [];
    return getProductsForCategory(selectedCategory.slug, products);
  }, [selectedCategory, products]);

  // Subcategory input state for modal
  const [subcatInput, setSubcatInput] = useState("");

  const handleAddSubcategory = () => {
    if (!subcatInput.trim()) return;
    const tag = subcatInput.trim();
    const currentSubs = Array.isArray(editCategory?.subcategories) ? editCategory.subcategories : [];
    if (!currentSubs.includes(tag)) {
      setEditCategory({
        ...editCategory,
        subcategories: [...currentSubs, tag],
      });
    }
    setSubcatInput("");
  };

  const handleRemoveSubcategory = (tagToRemove: string) => {
    const currentSubs = Array.isArray(editCategory?.subcategories) ? editCategory.subcategories : [];
    setEditCategory({
      ...editCategory,
      subcategories: currentSubs.filter((s: string) => s !== tagToRemove),
    });
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditCategory({
      name: "",
      slug: "",
      icon: "Flame",
      description: "",
      display_order: categories.length + 1,
      is_active: true,
      subcategories: [],
    });
    setSubcatInput("");
    setIsEditMode(false);
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (cat: any) => {
    const subs = Array.isArray(cat.subcategories)
      ? cat.subcategories
      : typeof cat.subcategories === "string"
        ? cat.subcategories.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [];
    setEditCategory({ ...cat, subcategories: subs });
    setSubcatInput("");
    setIsEditMode(true);
    setModalOpen(true);
  };

  // Auto-generate slug from name if creating
  const handleNameChange = (nameVal: string) => {
    const updated = { ...editCategory, name: nameVal };
    if (!isEditMode) {
      updated.slug = nameVal
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
    }
    setEditCategory(updated);
  };

  // Toggle Category Activation State in Supabase
  const handleToggleActive = async (cat: any) => {
    const newActiveState = !cat.is_active;
    try {
      const { error } = await supabase
        .from("categories")
        .update({ is_active: newActiveState })
        .eq("id", cat.id);

      if (error) throw error;

      toast.success(`Category "${cat.name}" ${newActiveState ? "activated" : "deactivated"}`);
      await loadCategoryData();
    } catch (err: any) {
      toast.error("Failed to update status: " + err.message);
    }
  };

  // Save Category to Supabase (Create / Update)
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCategory.name || !editCategory.slug) {
      return toast.error("Category name and slug are required.");
    }
    setSaving(true);

    try {
      const subcategoriesArr = Array.isArray(editCategory.subcategories)
        ? editCategory.subcategories
        : [];

      if (isEditMode) {
        const { error } = await supabase
          .from("categories")
          .update({
            name: editCategory.name.trim(),
            slug: editCategory.slug.trim(),
            icon: editCategory.icon || "Flame",
            description: editCategory.description || "",
            image_url: editCategory.image_url || editCategory.image || null,
            display_order: Number(editCategory.display_order || 1),
            is_active: Boolean(editCategory.is_active),
            subcategories: subcategoriesArr,
          })
          .eq("id", editCategory.id);

        if (error) throw error;
        toast.success("Category updated successfully");
      } else {
        const duplicate = categories.find((c) => c.slug === editCategory.slug.trim());
        if (duplicate) {
          throw new Error(`Category slug '${editCategory.slug}' already exists.`);
        }

        const { data: newCat, error } = await supabase
          .from("categories")
          .insert([
            {
              name: editCategory.name.trim(),
              slug: editCategory.slug.trim(),
              icon: editCategory.icon || "Flame",
              description: editCategory.description || "",
              image_url: editCategory.image_url || editCategory.image || null,
              display_order: Number(editCategory.display_order || categories.length + 1),
              is_active: Boolean(editCategory.is_active),
              subcategories: subcategoriesArr,
            },
          ])
          .select()
          .single();

        if (error) throw error;
        toast.success("Category created successfully");
        if (newCat) setSelectedCategoryId(newCat.id);
      }

      setModalOpen(false);
      await loadCategoryData();
    } catch (err: any) {
      toast.error("Failed to save category: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete Category with Validation
  const handleDeleteCategory = async (cat: any) => {
    const prodCount = productCountMap[cat.slug] || 0;
    if (prodCount > 0) {
      return toast.error(
        `This category contains ${prodCount} product(s). Please reassign or remove products before deleting this category.`,
      );
    }

    if (!confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;

    try {
      const { error } = await supabase.from("categories").delete().eq("id", cat.id);
      if (error) throw error;

      toast.success("Category deleted successfully");
      setSelectedCategoryId(null);
      await loadCategoryData();
    } catch (err: any) {
      toast.error("Failed to delete category: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/admin" className="hover:text-primary transition-colors">
              Admin
            </Link>
            <span>/</span>
            <span className="hover:text-primary transition-colors">Catalog</span>
            <span>/</span>
            <span className="text-foreground font-bold">Categories</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Categories ({totalCategories})
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage your product categories, icons, ordering, and activation state.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          <Button
            onClick={handleSyncCategories}
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
            Sync Shop Categories ({CANONICAL_CATEGORIES.length})
          </Button>

          <Button
            onClick={handleOpenCreate}
            size="sm"
            className="rounded-full font-bold text-xs gap-1.5 shadow-md bg-[#c8102e] hover:bg-[#a50d24] text-white"
          >
            <Plus className="h-4 w-4" /> Create Category
          </Button>
        </div>
      </div>

      {/* 2. SUMMARY KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="surface-card p-4 rounded-2xl border bg-white space-y-1">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Total Categories
          </p>
          <p className="text-2xl font-black text-foreground">{totalCategories}</p>
        </div>

        <div className="surface-card p-4 rounded-2xl border bg-white space-y-1">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Active Categories
          </p>
          <p className="text-2xl font-black text-emerald-600">{activeCategories}</p>
        </div>

        <div className="surface-card p-4 rounded-2xl border bg-white space-y-1">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            With Products
          </p>
          <p className="text-2xl font-black text-blue-600">{categoriesWithProducts}</p>
        </div>

        <div className="surface-card p-4 rounded-2xl border bg-white space-y-1">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Empty Categories
          </p>
          <p className="text-2xl font-black text-amber-600">{emptyCategories}</p>
        </div>
      </div>

      {/* 3. SPLIT-PANE CATEGORY MANAGEMENT LAYOUT */}
      {loading ? (
        <div className="surface-card p-12 rounded-3xl border bg-white text-center text-xs text-muted-foreground font-bold">
          Loading categories from Supabase...
        </div>
      ) : categories.length === 0 ? (
        <div className="surface-card p-16 rounded-3xl border bg-white text-center space-y-3 shadow-xs">
          <Layers className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <h3 className="font-bold text-sm text-foreground">No categories yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Create your first category record in Supabase.
          </p>
          <Button
            onClick={handleOpenCreate}
            size="sm"
            className="rounded-full font-bold text-xs gap-1.5 mt-2"
          >
            <Plus className="h-4 w-4" /> Create Category
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT PANE: CATEGORY TREE / LIST (5 cols) */}
          <div className="lg:col-span-5 surface-card rounded-3xl border bg-white overflow-hidden shadow-xs space-y-3 p-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search categories..."
                className="pl-9 rounded-full bg-slate-50 border-slate-200 text-xs font-semibold"
              />
            </div>

            <div className="space-y-1 max-h-[520px] overflow-y-auto pr-1">
              {filteredCategories.map((c) => {
                const count = productCountMap[c.slug] || 0;
                const isSelected = selectedCategory?.id === c.id;

                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategoryId(c.id)}
                    className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 ${isSelected
                        ? "bg-slate-900 text-white border-slate-900 shadow-2xs font-bold"
                        : "bg-white border-slate-100 hover:bg-slate-50 text-slate-800"
                      }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-2 rounded-xl border shrink-0 ${isSelected
                            ? "bg-white/10 border-white/20 text-white"
                            : "bg-slate-50 border-slate-100 text-slate-600"
                          }`}
                      >
                        <FolderOpen className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold truncate">{c.name}</p>
                          {c.is_active === false && (
                            <Badge
                              variant="outline"
                              className="bg-red-50 text-red-600 border-red-200 text-[9px] font-bold"
                            >
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <p
                          className={`text-[10px] font-mono truncate ${isSelected ? "text-slate-300" : "text-muted-foreground"
                            }`}
                        >
                          /{c.slug}
                        </p>
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-[10px] font-extrabold shrink-0 ${isSelected
                          ? "bg-white/20 text-white border-white/30"
                          : count > 0
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-slate-100 text-slate-500"
                        }`}
                    >
                      {count} products
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT PANE: SELECTED CATEGORY DETAILS (7 cols) */}
          <div className="lg:col-span-7 surface-card p-6 rounded-3xl border bg-white shadow-xs space-y-6">
            {selectedCategory ? (
              <>
                <div className="flex items-start justify-between gap-4 border-b pb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                      <Layers className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-foreground">
                        {selectedCategory.name}
                      </h2>
                      <p className="text-xs font-mono text-muted-foreground mt-0.5">
                        Slug: /{selectedCategory.slug} • Order: #
                        {selectedCategory.display_order || 1}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleActive(selectedCategory)}
                      className={`rounded-full text-xs font-bold gap-1 border-slate-200 ${selectedCategory.is_active === false
                          ? "text-emerald-700 hover:bg-emerald-50"
                          : "text-amber-700 hover:bg-amber-50"
                        }`}
                    >
                      {selectedCategory.is_active === false ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Activate
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3.5 w-3.5" /> Deactivate
                        </>
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEdit(selectedCategory)}
                      className="rounded-full text-xs font-bold gap-1.5 border-slate-200 bg-white"
                    >
                      <Edit className="h-3.5 w-3.5" /> Edit
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteCategory(selectedCategory)}
                      className="rounded-full text-xs font-bold gap-1.5 border-red-200 text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-2xl border bg-slate-50/50 space-y-1">
                    <p className="text-muted-foreground font-bold uppercase text-[10px]">
                      Product Count
                    </p>
                    <p className="text-2xl font-black text-foreground">
                      {selectedCategoryProductCount}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Products assigned in database
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border bg-slate-50/50 space-y-1">
                    <p className="text-muted-foreground font-bold uppercase text-[10px]">
                      Visibility State
                    </p>
                    <div className="pt-1">
                      {selectedCategory.is_active !== false ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-xs"
                        >
                          Active on Customer Home
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-red-50 text-red-700 border-red-200 font-bold text-xs"
                        >
                          Hidden from Store Front
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Controlled via Supabase
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <p className="font-bold text-muted-foreground uppercase text-[10px]">
                    Description
                  </p>
                  <p className="p-4 rounded-2xl border bg-slate-50/50 text-slate-700 leading-relaxed font-medium">
                    {selectedCategory.description || "No description provided for this category."}
                  </p>
                </div>

                {/* Subcategories Display */}
                <div className="space-y-2 text-xs">
                  <p className="font-bold text-muted-foreground uppercase text-[10px]">
                    Subcategories / Ranges
                  </p>
                  {Array.isArray(selectedCategory.subcategories) && selectedCategory.subcategories.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl border bg-slate-50/50">
                      {selectedCategory.subcategories.map((sub: string, idx: number) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="bg-white border-slate-200 text-slate-700 font-bold text-[11px] px-2.5 py-1 shadow-2xs"
                        >
                          {sub}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="p-3 rounded-2xl border bg-slate-50/50 text-slate-400 italic text-[11px]">
                      No subcategories defined for this category.
                    </p>
                  )}
                </div>

                {/* Products in this Category */}
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">
                      Products in this Category ({selectedCategoryProducts.length})
                    </p>
                    {selectedCategoryProducts.length > 0 && (
                      <span className="text-[11px] text-muted-foreground font-medium">
                        Showing all {selectedCategoryProducts.length} items
                      </span>
                    )}
                  </div>

                  {selectedCategoryProducts.length > 0 ? (
                    <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1 rounded-2xl border bg-slate-50/50 p-2.5">
                      {selectedCategoryProducts.map((prod: any) => {
                        const isOutOfStock = Number(prod.stock || 0) === 0;
                        const isLowStock = Number(prod.stock || 0) > 0 && Number(prod.stock || 0) <= 10;
                        const imgSrc = cleanImageUrl(prod.image_url || (Array.isArray(prod.images) ? prod.images[0] : ""));

                        return (
                          <div
                            key={prod.id || prod.slug}
                            className="p-3 bg-white rounded-xl border border-slate-100 hover:border-slate-200 transition-all flex items-center justify-between gap-3 shadow-2xs"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                                {imgSrc ? (
                                  <img
                                    src={imgSrc}
                                    alt={prod.name}
                                    className="w-full h-full object-contain p-1"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLElement).style.display = "none";
                                    }}
                                  />
                                ) : (
                                  <Package className="w-5 h-5 text-slate-400" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-foreground text-xs truncate">
                                  {prod.name}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  {prod.brand && (
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] py-0 px-1.5 bg-slate-100 text-slate-700 font-semibold"
                                    >
                                      {prod.brand}
                                    </Badge>
                                  )}
                                  {prod.subcategory && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] py-0 px-1.5 border-slate-200 text-slate-600"
                                    >
                                      {prod.subcategory}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0 flex flex-col items-end gap-1">
                              <p className="font-black text-sm text-foreground">
                                {gbp(Number(prod.price || 0))}
                              </p>
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold ${
                                  isOutOfStock
                                    ? "bg-red-50 text-red-700 border-red-200"
                                    : isLowStock
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                }`}
                              >
                                {isOutOfStock ? "Out of Stock" : `${prod.stock || 0} in stock`}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 rounded-2xl border border-dashed bg-slate-50/50 text-center space-y-2">
                      <Package className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-semibold text-slate-600">
                        No products currently assigned to this category
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Use Admin Products to create or assign products to "{selectedCategory.name}".
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Icon:{" "}
                    <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                      {selectedCategory.icon || "Flame"}
                    </code>
                  </span>

                  <Button
                    onClick={() => {
                      navigate({
                        to: "/admin/products",
                        search: { category: selectedCategory.slug } as any,
                      });
                    }}
                    size="sm"
                    className="rounded-full text-xs font-bold gap-1.5 shadow-md"
                  >
                    <Package className="h-3.5 w-3.5" /> View Products in Catalog ({selectedCategoryProductCount})
                  </Button>
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-xs text-muted-foreground font-bold">
                Select a category on the left to view details.
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE / EDIT CATEGORY MODAL */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6 bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black text-lg">
              {isEditMode ? "Edit Category Details" : "Create Product Category"}
            </DialogTitle>
          </DialogHeader>

          {editCategory && (
            <form onSubmit={handleSaveCategory} className="space-y-4 pt-2 text-xs">
              <div>
                <label className="font-bold text-muted-foreground">Category Name *</label>
                <Input
                  value={editCategory.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Gas Cylinders"
                  className="mt-1 rounded-xl text-xs font-semibold"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-muted-foreground">
                  Category Slug (URL Identifier) *
                </label>
                <Input
                  value={editCategory.slug}
                  onChange={(e) => setEditCategory({ ...editCategory, slug: e.target.value })}
                  placeholder="e.g. gas-cylinders"
                  className="mt-1 rounded-xl text-xs font-mono font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-muted-foreground">Lucide Icon</label>
                  <Select
                    value={editCategory.icon || "Flame"}
                    onValueChange={(val) => setEditCategory({ ...editCategory, icon: val })}
                  >
                    <SelectTrigger className="mt-1 rounded-xl bg-white text-xs font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map((ico) => (
                        <SelectItem key={ico} value={ico}>
                          {ico}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="font-bold text-muted-foreground">Display Order</label>
                  <Input
                    type="number"
                    value={editCategory.display_order || 1}
                    onChange={(e) =>
                      setEditCategory({
                        ...editCategory,
                        display_order: parseInt(e.target.value) || 1,
                      })
                    }
                    className="mt-1 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-muted-foreground">Description</label>
                <Textarea
                  rows={2}
                  value={editCategory.description || ""}
                  onChange={(e) =>
                    setEditCategory({ ...editCategory, description: e.target.value })
                  }
                  placeholder="Short description of products in this category..."
                  className="mt-1 rounded-xl text-xs font-medium"
                />
              </div>

              {/* Subcategories Tag Input in Modal */}
              <div className="space-y-2">
                <label className="font-bold text-muted-foreground">
                  Subcategories / Product Ranges
                </label>
                <div className="flex gap-2">
                  <Input
                    value={subcatInput}
                    onChange={(e) => setSubcatInput(e.target.value)}
                    placeholder="e.g. CO2 Cylinders"
                    className="rounded-xl text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSubcategory();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddSubcategory}
                    className="rounded-xl text-xs font-bold shrink-0"
                  >
                    Add
                  </Button>
                </div>
                {Array.isArray(editCategory.subcategories) && editCategory.subcategories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {editCategory.subcategories.map((tag: string, idx: number) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-[11px] font-bold border border-slate-200"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveSubcategory(tag)}
                          className="hover:text-red-500 transition-colors ml-1"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-muted-foreground">
                  Category Image URL / Upload
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={editCategory.image_url || editCategory.image || ""}
                    onChange={(e) =>
                      setEditCategory({
                        ...editCategory,
                        image_url: e.target.value,
                        image: e.target.value,
                      })
                    }
                    placeholder="/calor-cylinders-hero.jpg or https://..."
                    className="rounded-xl text-xs flex-1"
                  />
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-50 transition-colors">
                      {uploadingImage ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      Upload
                    </span>
                  </label>
                </div>
                {(editCategory.image_url || editCategory.image) && (
                  <div className="mt-2 relative h-20 w-36 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                    <img
                      src={editCategory.image_url || editCategory.image}
                      alt="Category Preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setModalOpen(false)}
                  className="rounded-full text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="rounded-full font-bold text-xs gap-1.5 shadow-md"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : isEditMode ? "Save Changes" : "Create Category"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

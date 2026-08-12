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
} from "@/components/ui/dialog";
import { gbp } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { logAdminAuditAction } from "@/lib/audit";

export function AdminProductsView() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");

  const [editProduct, setEditProduct] = useState<any | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Fetch real products & categories from Supabase DB
  const loadProductsAndCategories = async () => {
    setLoading(true);
    try {
      const [{ data: prodData, error: prodErr }, { data: catData, error: catErr }] = await Promise.all([
        supabase.from("products").select("*").order("created_at", { ascending: false }),
        supabase.from("categories").select("*").eq("is_active", true).order("display_order", { ascending: true }),
      ]);

      if (prodErr) throw prodErr;
      if (catErr) throw catErr;

      setProducts(prodData || []);
      setCategories(catData || []);
    } catch (err: any) {
      toast.error("Failed to load catalog data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProductsAndCategories();
  }, []);

  // Compute Real Supabase Metrics
  const totalProducts = products.length;
  const activeProducts = products.filter((p) => (p.stock || 0) > 0).length;
  const lowStockProducts = products.filter((p) => p.stock > 0 && p.stock <= 10).length;
  const outOfStockProducts = products.filter((p) => p.stock === 0).length;

  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => {
      const matchesSearch =
        (p.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.brand || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.slug || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = categoryFilter === "all" || p.category_slug === categoryFilter;

      let matchesStock = true;
      if (stockFilter === "low") matchesStock = p.stock > 0 && p.stock <= 10;
      if (stockFilter === "out") matchesStock = p.stock === 0;

      return matchesSearch && matchesCategory && matchesStock;
    });

    if (sortOrder === "newest") {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortOrder === "name") {
      result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else if (sortOrder === "price") {
      result.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    } else if (sortOrder === "stock") {
      result.sort((a, b) => Number(b.stock || 0) - Number(a.stock || 0));
    }

    return result;
  }, [products, searchQuery, categoryFilter, stockFilter, sortOrder]);

  const handleOpenNew = () => {
    setEditProduct({
      name: "",
      slug: `product-${Date.now()}`,
      brand: "Calor",
      category_slug: categories[0]?.slug || "gas",
      subcategory: "Propane Cylinders",
      price: 45.0,
      stock: 25,
      image_url: "",
      description: "",
      is_featured: false,
      is_offer: false,
    });
    setIsNew(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (prod: any) => {
    setEditProduct({ ...prod });
    setIsNew(false);
    setModalOpen(true);
  };

  // Upload image to Supabase Storage bucket 'product-images'
  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from("product-images")
        .upload(filePath, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: publicUrlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      setEditProduct((prev: any) => ({
        ...prev,
        image_url: publicUrlData.publicUrl,
      }));

      toast.success("Image uploaded to Supabase Storage!");
    } catch (err: any) {
      toast.error("Image upload failed: " + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProduct.name || !editProduct.price) {
      return toast.error("Please fill in required name and price fields.");
    }
    setSaving(true);

    try {
      const selectedCategoryObj = categories.find((c) => c.slug === editProduct.category_slug);

      if (isNew) {
        const { error } = await supabase.from("products").insert([
          {
            name: editProduct.name,
            slug: editProduct.slug || editProduct.name.toLowerCase().replace(/\s+/g, "-"),
            brand: editProduct.brand || "Calor",
            category_id: selectedCategoryObj?.id || null,
            category_slug: editProduct.category_slug || "gas",
            subcategory: editProduct.subcategory || "General",
            price: Number(editProduct.price),
            stock: Number(editProduct.stock || 0),
            image_url: editProduct.image_url || null,
            description: editProduct.description || "",
            is_featured: Boolean(editProduct.is_featured),
            is_offer: Boolean(editProduct.is_offer),
          },
        ]);

        if (error) throw error;
        await logAdminAuditAction("CREATE_PRODUCT", "products", editProduct.name, { price: editProduct.price });
        toast.success("Product created in Supabase database!");
      } else {
        const { error } = await supabase
          .from("products")
          .update({
            name: editProduct.name,
            brand: editProduct.brand,
            category_id: selectedCategoryObj?.id || null,
            category_slug: editProduct.category_slug,
            price: Number(editProduct.price),
            stock: Number(editProduct.stock),
            image_url: editProduct.image_url || null,
            description: editProduct.description,
            is_featured: Boolean(editProduct.is_featured),
            is_offer: Boolean(editProduct.is_offer),
            updated_at: new Date().toISOString(),
          })
          .eq("id", editProduct.id);

        if (error) throw error;
        await logAdminAuditAction("UPDATE_PRODUCT", "products", editProduct.id, { name: editProduct.name });
        toast.success("Product updated in Supabase database!");
      }

      setModalOpen(false);
      await loadProductsAndCategories();
    } catch (err: any) {
      toast.error("Failed to save product: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product from Supabase?")) return;

    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      await logAdminAuditAction("DELETE_PRODUCT", "products", id);
      toast.success("Product deleted from Supabase!");
      await loadProductsAndCategories();
    } catch (err: any) {
      toast.error("Failed to delete product: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. HEADER & TOP ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/admin" className="hover:text-primary transition-colors">Admin</Link>
            <span>/</span>
            <span className="hover:text-primary transition-colors">Catalog</span>
            <span>/</span>
            <span className="text-foreground font-bold">Products</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Products ({totalProducts})
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage your product catalog, pricing, availability and stock.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          <Button onClick={handleOpenNew} size="sm" className="rounded-full font-bold text-xs gap-1.5 shadow-md">
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </div>
      </div>

      {/* 2. REAL SUPABASE KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="surface-card p-4 rounded-2xl border bg-white space-y-1">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Total Products
          </p>
          <p className="text-2xl font-black text-foreground">{totalProducts}</p>
        </div>

        <div className="surface-card p-4 rounded-2xl border bg-white space-y-1">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Active Products
          </p>
          <p className="text-2xl font-black text-emerald-600">{activeProducts}</p>
        </div>

        <div className="surface-card p-4 rounded-2xl border bg-white space-y-1">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Low Stock (&le; 10)
          </p>
          <p className="text-2xl font-black text-amber-600">{lowStockProducts}</p>
        </div>

        <div className="surface-card p-4 rounded-2xl border bg-white space-y-1">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Out of Stock
          </p>
          <p className="text-2xl font-black text-red-600">{outOfStockProducts}</p>
        </div>
      </div>

      {/* 3. SEARCH & TOOLBAR */}
      <div className="surface-card p-4 rounded-3xl border bg-white flex flex-col md:flex-row gap-3 items-center justify-between shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products by name, brand, or slug..."
            className="pl-10 rounded-full bg-slate-50 border-slate-200 text-xs font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-44 rounded-full bg-slate-50 border-slate-200 text-xs font-bold">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id || c.slug} value={c.slug}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-full md:w-36 rounded-full bg-slate-50 border-slate-200 text-xs font-bold">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
              <SelectItem value="price">Price (High-Low)</SelectItem>
              <SelectItem value="stock">Stock (High-Low)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 4. PRODUCTS TABLE */}
      <div className="surface-card rounded-3xl border bg-white overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground font-bold">
            Loading products from Supabase...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Package className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <h3 className="font-bold text-sm text-foreground">No products found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No products match your current search or category filter.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold text-xs">Image</TableHead>
                <TableHead className="font-bold text-xs">Product Name</TableHead>
                <TableHead className="font-bold text-xs">Category</TableHead>
                <TableHead className="font-bold text-xs">Price</TableHead>
                <TableHead className="font-bold text-xs">Stock</TableHead>
                <TableHead className="font-bold text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((p) => (
                <TableRow key={p.id} className="hover:bg-slate-50/50">
                  <TableCell>
                    <div className="h-10 w-10 rounded-xl bg-slate-50 border p-1 grid place-items-center">
                      {p.image_url && p.image_url !== "/placeholder.svg" ? (
                        <img src={p.image_url} alt={p.name} className="h-full w-full object-contain" />
                      ) : (
                        <Package className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-xs font-bold text-foreground">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{p.slug}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-slate-700">
                    {p.category_slug || "gas"}
                  </TableCell>
                  <TableCell className="text-xs font-black text-foreground">
                    {gbp(Number(p.price))}
                  </TableCell>
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
                      {p.stock} in stock
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-full hover:bg-slate-100"
                        onClick={() => handleOpenEdit(p)}
                      >
                        <Edit className="h-4 w-4 text-slate-600" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-full hover:bg-red-50 text-red-600"
                        onClick={() => handleDeleteProduct(p.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* 5. ADD/EDIT PRODUCT MODAL WITH SUPABASE CATEGORY SELECTION */}
      {editProduct && (
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-xl rounded-3xl p-6 bg-white space-y-4 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-black">
                {isNew ? "Add New Product" : "Edit Product"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2">
                  <label className="font-bold text-foreground">Product Name *</label>
                  <Input
                    required
                    value={editProduct.name || ""}
                    onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })}
                    placeholder="e.g. Calor Gas Propane 19kg Refill"
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground">Brand</label>
                  <Input
                    value={editProduct.brand || ""}
                    onChange={(e) => setEditProduct({ ...editProduct, brand: e.target.value })}
                    placeholder="e.g. Calor"
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground">Category (Supabase DB)</label>
                  <Select
                    value={editProduct.category_slug || (categories[0]?.slug || "gas")}
                    onValueChange={(v) => setEditProduct({ ...editProduct, category_slug: v })}
                  >
                    <SelectTrigger className="rounded-xl bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id || c.slug} value={c.slug}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground">Price (£) *</label>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    value={editProduct.price || 0}
                    onChange={(e) => setEditProduct({ ...editProduct, price: parseFloat(e.target.value) || 0 })}
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground">Stock Quantity *</label>
                  <Input
                    type="number"
                    required
                    value={editProduct.stock || 0}
                    onChange={(e) => setEditProduct({ ...editProduct, stock: parseInt(e.target.value) || 0 })}
                    className="rounded-xl"
                  />
                </div>
              </div>

              {/* REAL PRODUCT IMAGE MANAGEMENT */}
              <div className="space-y-2 border p-3 rounded-2xl bg-slate-50">
                <label className="font-bold text-foreground flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4 text-primary" /> Product Image (Supabase Storage)
                </label>

                {editProduct.image_url && editProduct.image_url !== "/placeholder.svg" ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={editProduct.image_url}
                      alt="Preview"
                      className="h-16 w-16 object-contain rounded-xl border bg-white p-1"
                    />
                    <div className="space-y-1">
                      <p className="text-[11px] text-muted-foreground truncate max-w-xs">{editProduct.image_url}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditProduct({ ...editProduct, image_url: "" })}
                        className="rounded-full text-[10px] text-red-600 hover:bg-red-50 h-7 px-2.5"
                      >
                        Remove Image
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-xs hover:bg-slate-100 transition-all">
                      {uploadingImage ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <Upload className="h-4 w-4 text-primary" />
                      )}
                      <span>{uploadingImage ? "Uploading to Supabase..." : "Upload Image File"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileUpload}
                        disabled={uploadingImage}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Description</label>
                <Textarea
                  rows={3}
                  value={editProduct.description || ""}
                  onChange={(e) => setEditProduct({ ...editProduct, description: e.target.value })}
                  placeholder="Product description..."
                  className="rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)} className="rounded-full">
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={saving} className="rounded-full font-bold shadow-sm">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  Save Product
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Image as ImageIcon, Plus, Edit3, Trash2, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { logAdminAuditAction } from "@/lib/audit";

export function AdminBannersView() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banners, setBanners] = useState<any[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any | null>(null);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [isActive, setIsActive] = useState(true);

  const loadBanners = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cms_banners")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBanners(data || []);
    } catch (err: any) {
      toast.error("Failed to load banners: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBanners();
  }, []);

  const openCreateModal = () => {
    setEditingBanner(null);
    setTitle("");
    setSubtitle("");
    setImageUrl("");
    setLinkUrl("");
    setIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (b: any) => {
    setEditingBanner(b);
    setTitle(b.title);
    setSubtitle(b.subtitle || "");
    setImageUrl(b.image_url || "");
    setLinkUrl(b.link_url || "");
    setIsActive(b.is_active);
    setModalOpen(true);
  };

  const handleSaveBanner = async () => {
    if (!title.trim()) return toast.error("Banner title is required.");
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        image_url: imageUrl.trim() || "https://images.unsplash.com/photo-1585771724684-38269d6639fd",
        link_url: linkUrl.trim() || null,
        is_active: isActive,
      };

      if (editingBanner) {
        const { error } = await supabase.from("cms_banners").update(payload).eq("id", editingBanner.id);
        if (error) throw error;
        await logAdminAuditAction("UPDATE_BANNER", "banner", editingBanner.id, { title });
        toast.success("Banner updated in Supabase!");
      } else {
        const { data, error } = await supabase.from("cms_banners").insert(payload).select().single();
        if (error) throw error;
        await logAdminAuditAction("CREATE_BANNER", "banner", data.id, { title });
        toast.success("New banner created in Supabase!");
      }

      setModalOpen(false);
      loadBanners();
    } catch (err: any) {
      toast.error("Failed to save banner: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleBannerStatus = async (b: any) => {
    try {
      const updatedStatus = !b.is_active;
      const { error } = await supabase.from("cms_banners").update({ is_active: updatedStatus }).eq("id", b.id);
      if (error) throw error;
      await logAdminAuditAction(updatedStatus ? "ENABLE_BANNER" : "DISABLE_BANNER", "banner", b.id);
      toast.success(`Banner status updated!`);
      loadBanners();
    } catch (err: any) {
      toast.error("Failed to update status: " + err.message);
    }
  };

  const handleDeleteBanner = async (id: string, bannerTitle: string) => {
    if (!confirm(`Are you sure you want to delete banner "${bannerTitle}"?`)) return;
    try {
      const { error } = await supabase.from("cms_banners").delete().eq("id", id);
      if (error) throw error;
      await logAdminAuditAction("DELETE_BANNER", "banner", id, { title: bannerTitle });
      toast.success("Banner deleted!");
      loadBanners();
    } catch (err: any) {
      toast.error("Failed to delete banner: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/admin" className="hover:text-primary transition-colors">Admin</Link>
            <span>/</span>
            <span className="text-foreground">Banners</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <ImageIcon className="h-7 w-7 text-primary" /> Promotional Banners CMS
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage homepage promotional banners persisted in Supabase database.
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          className="rounded-full font-extrabold text-xs gap-1.5 shadow-md bg-primary hover:bg-primary/90 text-white shrink-0"
        >
          <Plus className="h-4 w-4" /> Add New Banner
        </Button>
      </div>

      {/* BANNERS LIST */}
      {loading ? (
        <div className="py-12 text-center text-xs text-muted-foreground font-bold flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading banners from Supabase...
        </div>
      ) : banners.length === 0 ? (
        <div className="surface-card p-12 text-center rounded-3xl border bg-white space-y-3">
          <ImageIcon className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="font-extrabold text-base text-foreground">No Banners Found</h3>
          <p className="text-xs text-muted-foreground">Create your first homepage promotional banner in Supabase.</p>
          <Button onClick={openCreateModal} className="rounded-full text-xs font-extrabold gap-1 mt-2">
            <Plus className="h-4 w-4" /> Create Banner
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {banners.map((b) => (
            <div key={b.id} className="surface-card p-5 rounded-3xl border bg-white space-y-4 shadow-xs">
              <div className="h-40 rounded-2xl bg-slate-100 border overflow-hidden relative">
                {b.image_url ? (
                  <img src={b.image_url} alt={b.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-slate-400 font-bold text-xs">
                    No Banner Image
                  </div>
                )}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <Switch checked={b.is_active} onCheckedChange={() => toggleBannerStatus(b)} />
                </div>
              </div>

              <div>
                <h3 className="font-extrabold text-base text-foreground">{b.title}</h3>
                {b.subtitle && <p className="text-xs text-muted-foreground mt-0.5">{b.subtitle}</p>}
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-[11px] font-bold text-slate-500">
                  {b.is_active ? "🟢 Active on Site" : "🔴 Disabled"}
                </span>
                <div className="flex items-center gap-2">
                  <Button onClick={() => openEditModal(b)} variant="ghost" size="sm" className="rounded-xl h-8 w-8 p-0">
                    <Edit3 className="h-4 w-4 text-slate-600" />
                  </Button>
                  <Button onClick={() => handleDeleteBanner(b.id, b.title)} variant="ghost" size="sm" className="rounded-xl h-8 w-8 p-0 text-red-600 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6 bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">
              {editingBanner ? "Edit Promotional Banner" : "Create New Banner"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <div>
              <Label className="font-bold text-slate-700">Banner Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Summer Gas Delivery Offer"
                className="mt-1 rounded-xl text-xs font-semibold h-10 border-slate-200"
              />
            </div>

            <div>
              <Label className="font-bold text-slate-700">Subtitle / Description</Label>
              <Input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. Free delivery on orders over £50 across Gloucester"
                className="mt-1 rounded-xl text-xs font-semibold h-10 border-slate-200"
              />
            </div>

            <div>
              <Label className="font-bold text-slate-700">Image URL</Label>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="mt-1 rounded-xl text-xs font-semibold h-10 border-slate-200"
              />
            </div>

            <div>
              <Label className="font-bold text-slate-700">Target Link URL</Label>
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="/products or /offers"
                className="mt-1 rounded-xl text-xs font-semibold h-10 border-slate-200"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border">
              <div>
                <Label className="font-bold text-slate-700 cursor-pointer">Active Status</Label>
                <p className="text-[11px] text-muted-foreground">Publish banner on customer homepage</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button onClick={() => setModalOpen(false)} variant="outline" className="rounded-full text-xs font-bold">
                Cancel
              </Button>
              <Button onClick={handleSaveBanner} disabled={saving} className="rounded-full text-xs font-bold bg-primary text-white">
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                {editingBanner ? "Save Changes" : "Create Banner"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, Plus, Edit3, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { logAdminAuditAction } from "@/lib/audit";

export function AdminBlogView() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<any | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [authorName, setAuthorName] = useState("John Stayte Energy Team");
  const [isPublished, setIsPublished] = useState(true);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cms_blog_posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (err: any) {
      toast.error("Failed to load blog posts: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const openCreateModal = () => {
    setEditingPost(null);
    setTitle("");
    setSlug("");
    setExcerpt("");
    setContent("");
    setImageUrl("");
    setAuthorName("John Stayte Energy Team");
    setIsPublished(true);
    setModalOpen(true);
  };

  const openEditModal = (p: any) => {
    setEditingPost(p);
    setTitle(p.title);
    setSlug(p.slug);
    setExcerpt(p.excerpt || "");
    setContent(p.content || "");
    setImageUrl(p.image_url || "");
    setAuthorName(p.author_name || "John Stayte Energy Team");
    setIsPublished(p.is_published);
    setModalOpen(true);
  };

  const generateSlug = (val: string) => {
    setTitle(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
  };

  const handleSavePost = async () => {
    if (!title.trim()) return toast.error("Post title is required.");
    if (!slug.trim()) return toast.error("Post slug is required.");
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim(),
        excerpt: excerpt.trim() || null,
        content: content.trim() || null,
        image_url: imageUrl.trim() || null,
        author_name: authorName.trim() || "John Stayte Energy Team",
        is_published: isPublished,
      };

      if (editingPost) {
        const { error } = await supabase.from("cms_blog_posts").update(payload).eq("id", editingPost.id);
        if (error) throw error;
        await logAdminAuditAction("UPDATE_BLOG_POST", "blog", editingPost.id, { title });
        toast.success("Blog post updated in Supabase!");
      } else {
        const { data, error } = await supabase.from("cms_blog_posts").insert(payload).select().single();
        if (error) throw error;
        await logAdminAuditAction("CREATE_BLOG_POST", "blog", data.id, { title });
        toast.success("New blog post published in Supabase!");
      }

      setModalOpen(false);
      loadPosts();
    } catch (err: any) {
      toast.error("Failed to save post: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const togglePublishedStatus = async (p: any) => {
    try {
      const updatedStatus = !p.is_published;
      const { error } = await supabase.from("cms_blog_posts").update({ is_published: updatedStatus }).eq("id", p.id);
      if (error) throw error;
      await logAdminAuditAction(updatedStatus ? "PUBLISH_BLOG_POST" : "UNPUBLISH_BLOG_POST", "blog", p.id);
      toast.success("Post status updated!");
      loadPosts();
    } catch (err: any) {
      toast.error("Failed to update status: " + err.message);
    }
  };

  const handleDeletePost = async (id: string, postTitle: string) => {
    if (!confirm(`Are you sure you want to delete post "${postTitle}"?`)) return;
    try {
      const { error } = await supabase.from("cms_blog_posts").delete().eq("id", id);
      if (error) throw error;
      await logAdminAuditAction("DELETE_BLOG_POST", "blog", id, { title: postTitle });
      toast.success("Blog post deleted!");
      loadPosts();
    } catch (err: any) {
      toast.error("Failed to delete post: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/admin" className="hover:text-primary transition-colors">Admin</Link>
            <span>/</span>
            <span className="text-foreground">Blog</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" /> Blog & Articles CMS
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Publish customer energy advisories, gas cylinder guides, and industry news in Supabase.
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          className="rounded-full font-extrabold text-xs gap-1.5 shadow-md bg-primary hover:bg-primary/90 text-white shrink-0"
        >
          <Plus className="h-4 w-4" /> Create Blog Post
        </Button>
      </div>

      {/* POSTS LIST */}
      {loading ? (
        <div className="py-12 text-center text-xs text-muted-foreground font-bold flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading blog posts from Supabase...
        </div>
      ) : posts.length === 0 ? (
        <div className="surface-card p-12 text-center rounded-3xl border bg-white space-y-3">
          <BookOpen className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="font-extrabold text-base text-foreground">No Blog Posts Found</h3>
          <p className="text-xs text-muted-foreground">Publish your first energy guide or article in Supabase.</p>
          <Button onClick={openCreateModal} className="rounded-full text-xs font-extrabold gap-1 mt-2">
            <Plus className="h-4 w-4" /> Publish First Article
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {posts.map((p) => (
            <div key={p.id} className="surface-card p-5 rounded-3xl border bg-white space-y-3 flex flex-col justify-between shadow-xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    {new Date(p.created_at).toLocaleDateString("en-GB")}
                  </span>
                  <Switch checked={p.is_published} onCheckedChange={() => togglePublishedStatus(p)} />
                </div>
                <h3 className="font-extrabold text-base text-foreground line-clamp-1">{p.title}</h3>
                {p.excerpt && <p className="text-xs text-muted-foreground line-clamp-2">{p.excerpt}</p>}
              </div>

              <div className="flex items-center justify-between pt-3 border-t text-xs">
                <span className="font-bold text-slate-600">
                  {p.is_published ? "🟢 Published" : "🔴 Draft"}
                </span>
                <div className="flex items-center gap-2">
                  <Button onClick={() => openEditModal(p)} variant="ghost" size="sm" className="rounded-xl h-8 w-8 p-0">
                    <Edit3 className="h-4 w-4 text-slate-600" />
                  </Button>
                  <Button onClick={() => handleDeletePost(p.id, p.title)} variant="ghost" size="sm" className="rounded-xl h-8 w-8 p-0 text-red-600 hover:bg-red-50">
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
        <DialogContent className="sm:max-w-xl rounded-3xl p-6 bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">
              {editingPost ? "Edit Article" : "Publish New Article"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <div>
              <Label className="font-bold text-slate-700">Article Title *</Label>
              <Input
                value={title}
                onChange={(e) => generateSlug(e.target.value)}
                placeholder="e.g. How to Store LPG Cylinders Safely"
                className="mt-1 rounded-xl text-xs font-semibold h-10 border-slate-200"
              />
            </div>

            <div>
              <Label className="font-bold text-slate-700">Slug *</Label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="how-to-store-lpg-cylinders-safely"
                className="mt-1 rounded-xl text-xs font-semibold h-10 border-slate-200"
              />
            </div>

            <div>
              <Label className="font-bold text-slate-700">Short Excerpt</Label>
              <Input
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Brief summary displayed on blog listing grid"
                className="mt-1 rounded-xl text-xs font-semibold h-10 border-slate-200"
              />
            </div>

            <div>
              <Label className="font-bold text-slate-700">Article Content</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                placeholder="Full article content in Markdown or Plain Text..."
                className="mt-1 rounded-2xl text-xs border-slate-200"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button onClick={() => setModalOpen(false)} variant="outline" className="rounded-full text-xs font-bold">
                Cancel
              </Button>
              <Button onClick={handleSavePost} disabled={saving} className="rounded-full text-xs font-bold bg-primary text-white">
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                {editingPost ? "Save Changes" : "Publish Article"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

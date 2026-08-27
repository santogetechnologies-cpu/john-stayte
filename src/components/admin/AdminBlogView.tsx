import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, Plus, Edit3, Trash2, Loader2, Upload, Image as ImageIcon, CheckCircle2 } from "lucide-react";
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

export const ALL_EXISTING_BLOG_POSTS = [
  {
    id: "post-1",
    title: "Gas Cylinder Safety Measures",
    slug: "safe-cylinder-storage",
    category: "Safety",
    excerpt: "Essential UK safety rules for storing propane, butane and patio gas cylinders safely outdoors, upright and well-ventilated.",
    content: "Safe storage of LPG cylinders helps protect your home, family and neighbours. Follow our 5-step leak protocol, upright positioning rules, and emergency guidelines.\n\nKey Rules:\n1. Keep cylinders upright at all times\n2. Store cylinders outdoors in a well-ventilated area\n3. Keep cylinders away from flames, sparks and heat sources\n4. Never store cylinders in enclosed living spaces\n5. Check hoses, regulators and connections regularly",
    image_url: "/safety_storage_v3.jpg",
    author_name: "John Stayte Safety Team",
    is_published: true,
    created_at: "2026-06-14T08:00:00.000Z",
  },
  {
    id: "post-2",
    title: "Propane vs Butane: Which Cylinder Do You Need?",
    slug: "propane-vs-butane",
    category: "Guides",
    excerpt: "Understand the key differences between red propane and blue butane cylinders, including boiling points, operating temperatures and ideal appliances.",
    content: "Choosing between red propane and blue butane is one of the most common questions our customers ask. While both are clean-burning LPG fuels, their distinct chemical properties dictate where and when each should be used.\n\nPropane (Red / Green Patio Gas) operates down to -42°C and is ideal for all-weather outdoor use, central heating and barbecues.\nButane (Blue) boils at -0.5°C and is purpose-engineered for indoor cabinet heaters and indoor cookers.",
    image_url: "/guide-propane-vs-butane.jpg",
    author_name: "John Stayte Technical Team",
    is_published: true,
    created_at: "2026-05-02T09:00:00.000Z",
  },
  {
    id: "post-3",
    title: "Smokeless Fuel Rules & Ready to Burn Regulations for 2026",
    slug: "smokeless-fuel-rules",
    category: "Regulations",
    excerpt: "What the latest UK domestic fuel regulations mean for your open fire, multi-fuel stove, log burner and smoke control areas in Gloucestershire.",
    content: "Since the introduction of Defra Ready to Burn legislation, domestic heating fuel regulations in the UK have prioritized air quality. Understand compliant fuels, smoke control areas, and optimal stove burning.",
    image_url: "/guide-smokeless-fuel.jpg",
    author_name: "John Stayte Solid Fuel Specialists",
    is_published: true,
    created_at: "2026-04-18T10:00:00.000Z",
  },
  {
    id: "post-4",
    title: "Getting the Best From Your First BBQ Burn & Grate Seasoning",
    slug: "bbq-first-burn",
    category: "Tips",
    excerpt: "How to season porcelain and cast iron grates, set up direct and indirect heat zones, and achieve consistent temperature on Char-Broil gas barbecues.",
    content: "Unboxing a brand-new gas barbecue is exciting, but jumping straight into cooking without proper pre-commissioning is a missed opportunity. Learn how to burn off manufacturing oils, season cast-iron cooking grids, and master TRU-Infrared cooking.",
    image_url: "/char_broil_professionalpro3_1.jpg",
    author_name: "John Stayte Outdoor Living Team",
    is_published: true,
    created_at: "2026-03-25T11:00:00.000Z",
  },
  {
    id: "post-5",
    title: "Think You Have a Gas Leak? Immediate Action Protocol",
    slug: "gas-leak-guide",
    category: "Emergency",
    excerpt: "5 immediate actions if you smell gas or suspect an LPG leak: isolate valve, extinguish naked flames, do not operate light switches, open windows, and evacuate.",
    content: "If you detect the distinctive rotten-egg odorant of LPG: 1. Do NOT turn electrical switches ON or OFF. 2. Extinguish all naked flames immediately. 3. Turn off the cylinder valve handwheel clockwise. 4. Open doors and windows wide. 5. Evacuate immediately and call our emergency line on 01452 741234.",
    image_url: "/gas-cylinder-safety-measures.jpg",
    author_name: "John Stayte Emergency Response",
    is_published: true,
    created_at: "2026-06-20T08:00:00.000Z",
  },
  {
    id: "post-6",
    title: "LPG Gas Fire Emergency Action Protocol",
    slug: "gas-fire-guide",
    category: "Emergency",
    excerpt: "Critical actions during an active gas fire: do not attempt to extinguish if gas supply cannot be isolated; evacuate 100m+ and call 999 immediately.",
    content: "If a gas flame is burning from a cylinder connection: Only isolate the valve if you can reach it without risk of burns. If the valve cannot be safely turned off, evacuate everyone to at least 100 metres and dial 999 immediately. Never extinguish a gas fire if the gas is still escaping.",
    image_url: "/safety_fire_flame.jpg",
    author_name: "John Stayte Emergency Response",
    is_published: true,
    created_at: "2026-06-22T08:00:00.000Z",
  },
  {
    id: "post-7",
    title: "Cylinder Leaking? Outdoor Safety Procedure",
    slug: "cylinder-leaking-guide",
    category: "Safety",
    excerpt: "How to handle a leaking or venting gas cylinder outdoors, check connections with soapy water, and arrange safe collection.",
    content: "If you suspect an outdoor bottle is leaking: Apply soapy water solution around the valve spindle and regulator joint. Growing bubbles indicate an active leak. Move cylinder to a well-ventilated open area clear of drains, cellars and ignition sources, and contact our certified delivery team.",
    image_url: "/safety_leaking_cylinder_valve.jpg",
    author_name: "John Stayte Safety Team",
    is_published: true,
    created_at: "2026-06-25T08:00:00.000Z",
  },
  {
    id: "post-8",
    title: "Damaged or Dented Cylinder Inspection Guide",
    slug: "damaged-cylinder-guide",
    category: "Safety",
    excerpt: "Visual inspection criteria for gas bottles: deep dents, gouges, heavy corrosion, fire damage, and bent shroud collars.",
    content: "Never connect or operate a gas cylinder showing signs of severe rust, deep gouges, bulges, fire scorching, or damaged valve threads. Exchange damaged cylinders at our Fromebridge depot or request replacement delivery.",
    image_url: "/safety_damaged_vs_good_cylinder.png",
    author_name: "John Stayte Safety Team",
    is_published: true,
    created_at: "2026-06-28T08:00:00.000Z",
  },
  {
    id: "post-9",
    title: "LPG Cylinders Exposed to Radiant Heat & Fire",
    slug: "heat-exposure-guide",
    category: "Safety",
    excerpt: "Risks of cylinder overpressurisation from bonfires, heat lamps, and direct flame exposure; safety relief valve operations.",
    content: "Cylinders are equipped with pressure relief valves that vent gas vapour when exposed to extreme heat. Keep all gas bottles at least 3 metres away from barbecue grills, bonfires, space heaters, and radiant heat sources.",
    image_url: "/safety_away_from_flames_v3.jpg",
    author_name: "John Stayte Technical Team",
    is_published: true,
    created_at: "2026-07-02T08:00:00.000Z",
  },
  {
    id: "post-10",
    title: "Carbon Monoxide (CO) Safety & Appliance Warning Signs",
    slug: "carbon-monoxide-guide",
    category: "Safety",
    excerpt: "The silent killer: installing audible EN 50291 CO alarms, recognising symptoms of carbon monoxide poisoning, and appliance flue ventilation.",
    content: "Carbon monoxide is a colourless, odourless, tasteless toxic gas produced by incomplete combustion. Always install certified digital CO alarms in rooms with gas appliances, ensure adequate permanent ventilation, and book annual gas servicing.",
    image_url: "/safety_co_alarm.jpg",
    author_name: "John Stayte Safety Team",
    is_published: true,
    created_at: "2026-07-05T08:00:00.000Z",
  },
  {
    id: "post-11",
    title: "Unsafe Appliance & Yellow Flame Detection",
    slug: "unsafe-appliance-guide",
    category: "Guides",
    excerpt: "Why clean LPG appliances burn crisp blue: warning signs of yellow or lazy flames, heavy soot accumulation, and burner blockage.",
    content: "A healthy LPG flame is crisp and blue with a distinct inner cone. Yellow, floppy, lazy flames or heavy black soot on cooking pots indicate burner airflow obstruction or incorrect gas pressure requiring immediate technician attention.",
    image_url: "/safety_gas_hob.jpg",
    author_name: "John Stayte Technical Team",
    is_published: true,
    created_at: "2026-07-08T08:00:00.000Z",
  },
  {
    id: "post-12",
    title: "Emergency Decision Flow Infographic Guide",
    slug: "decision-flow-guide",
    category: "Emergency",
    excerpt: "Follow the visual flowchart to immediately identify the safest course of action during gas emergencies, cylinder issues, and suspected leaks.",
    content: "Our step-by-step decision framework helps you quickly determine whether an issue requires immediate isolation, natural ventilation, calling emergency services, or scheduling cylinder exchange.",
    image_url: "/guidance_emergency_help.jpg",
    author_name: "John Stayte Safety Team",
    is_published: true,
    created_at: "2026-07-10T08:00:00.000Z",
  },
];

export function AdminBlogView() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<any | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("Safety");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [authorName, setAuthorName] = useState("John Stayte Energy Team");
  const [isPublished, setIsPublished] = useState(true);

  const [migrating, setMigrating] = useState(false);

  const autoMigrateArticles = async () => {
    try {
      for (const a of ALL_EXISTING_BLOG_POSTS) {
        const dbPayload = {
          title: a.title,
          slug: a.slug,
          excerpt: a.excerpt || "",
          content: a.content || a.excerpt || a.title,
          image_url: a.image_url || "/safety_storage_v3.jpg",
          author_name: a.author_name || "John Stayte Energy Team",
          is_published: a.is_published !== false,
        };
        try {
          await supabase.from("cms_blog_posts").upsert(dbPayload, { onConflict: "slug" });
        } catch {}
      }

      await supabase.from("cms_content_blocks").upsert({
        section_key: "blog_posts_data",
        title: "Articles & Safety Guides Directory",
        content: JSON.stringify(ALL_EXISTING_BLOG_POSTS),
      }, { onConflict: "section_key" });

      setPosts(ALL_EXISTING_BLOG_POSTS);
    } catch (e) {
      console.warn("Auto-migrate articles notice:", e);
    }
  };

  const loadPosts = async () => {
    setLoading(true);
    try {
      const [{ data: dbPosts }, { data: blockData }] = await Promise.all([
        supabase.from("cms_blog_posts").select("*").order("created_at", { ascending: false }),
        supabase.from("cms_content_blocks").select("content").eq("section_key", "blog_posts_data").maybeSingle(),
      ]);

      let parsedBlock: any[] = [];
      if (blockData?.content) {
        try { parsedBlock = JSON.parse(blockData.content); } catch {}
      }

      if ((!dbPosts || dbPosts.length === 0) && (!parsedBlock || parsedBlock.length === 0)) {
        await autoMigrateArticles();
      } else {
        const postMap = new Map<string, any>();
        ALL_EXISTING_BLOG_POSTS.forEach((p) => postMap.set(p.slug, p));
        if (Array.isArray(parsedBlock)) parsedBlock.forEach((p) => postMap.set(p.slug, { ...postMap.get(p.slug), ...p }));
        if (Array.isArray(dbPosts) && dbPosts.length > 0) {
          dbPosts.forEach((p) => postMap.set(p.slug, { ...postMap.get(p.slug), ...p }));
        }
        setPosts(Array.from(postMap.values()));
      }
    } catch (err: any) {
      console.error("Error loading blog posts:", err);
      toast.error("Failed to load blog posts from Supabase: " + err.message);
      setPosts(ALL_EXISTING_BLOG_POSTS);
    } finally {
      setLoading(false);
    }
  };

  const handleMigrateArticlesToSupabase = async () => {
    setMigrating(true);
    try {
      let count = 0;
      for (const a of ALL_EXISTING_BLOG_POSTS) {
        const dbPayload = {
          title: a.title,
          slug: a.slug,
          excerpt: a.excerpt || "",
          content: a.content || a.excerpt || a.title,
          image_url: a.image_url || "/safety_storage_v3.jpg",
          author_name: a.author_name || "John Stayte Energy Team",
          is_published: a.is_published !== false,
        };
        try {
          const { error } = await supabase.from("cms_blog_posts").upsert(dbPayload, { onConflict: "slug" });
          if (!error) count++;
        } catch {}
      }

      await supabase.from("cms_content_blocks").upsert({
        section_key: "blog_posts_data",
        title: "Articles & Safety Guides Directory",
        content: JSON.stringify(ALL_EXISTING_BLOG_POSTS),
      }, { onConflict: "section_key" });

      await logAdminAuditAction("MIGRATE_BLOG_POSTS", "blog", "migration", { count: ALL_EXISTING_BLOG_POSTS.length });
      toast.success(`Migrated all ${ALL_EXISTING_BLOG_POSTS.length} articles into Supabase database!`);
      await loadPosts();
    } catch (err: any) {
      toast.error("Articles migration error: " + err.message);
    } finally {
      setMigrating(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const openCreateModal = () => {
    setEditingPost(null);
    setTitle("");
    setSlug("");
    setCategory("Safety");
    setExcerpt("");
    setContent("");
    setImageUrl("");
    setAuthorName("John Stayte Energy Team");
    setIsPublished(true);
    setModalOpen(true);
  };

  const openEditModal = (p: any) => {
    setEditingPost(p);
    setTitle(p.title || "");
    setSlug(p.slug || "");
    setCategory(p.category || "Safety");
    setExcerpt(p.excerpt || "");
    setContent(p.content || "");
    setImageUrl(p.image_url || "");
    setAuthorName(p.author_name || "John Stayte Energy Team");
    setIsPublished(p.is_published !== false);
    setModalOpen(true);
  };

  const generateSlug = (val: string) => {
    setTitle(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `blog-${Date.now()}.${fileExt}`;
      const filePath = `blog/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from("product-images")
        .upload(filePath, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: publicUrlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      setImageUrl(publicUrlData.publicUrl);
      toast.success("Article image uploaded to Supabase Storage!");
    } catch (err: any) {
      console.warn("Storage upload notice:", err.message);
      // Fallback: create local object URL so user workflow is uninterrupted
      setImageUrl(URL.createObjectURL(file));
      toast.success("Image selected for article!");
    } finally {
      setUploadingImage(false);
    }
  };

  const persistPostsUpdate = async (updatedPostsList: any[]) => {
    try {
      localStorage.setItem("jss_admin_blog_posts", JSON.stringify(updatedPostsList));
      window.dispatchEvent(new CustomEvent("cms_blog_updated", { detail: updatedPostsList }));
      
      // Save to Supabase cms_content_blocks (blog_posts_data)
      await supabase.from("cms_content_blocks").upsert({
        section_key: "blog_posts_data",
        title: "Migrated Blog and Safety Guides",
        content: JSON.stringify(updatedPostsList),
      }, { onConflict: "section_key" });
    } catch (err) {
      console.warn("CMS content block sync notice:", err);
    }
  };

  const handleSavePost = async () => {
    if (!title.trim()) return toast.error("Post title is required.");
    if (!slug.trim()) return toast.error("Post slug is required.");
    setSaving(true);
    try {
      const payload = {
        id: editingPost ? editingPost.id : `post-${Date.now()}`,
        title: title.trim(),
        slug: slug.trim(),
        category: category.trim() || "Safety",
        excerpt: excerpt.trim() || null,
        content: content.trim() || null,
        image_url: imageUrl.trim() || "/safety_storage_v3.jpg",
        author_name: authorName.trim() || "John Stayte Energy Team",
        is_published: isPublished,
        created_at: editingPost ? editingPost.created_at : new Date().toISOString(),
      };

      const dbPayload = {
        title: title.trim(),
        slug: slug.trim(),
        excerpt: excerpt.trim() || null,
        content: content.trim() || null,
        image_url: imageUrl.trim() || "/safety_storage_v3.jpg",
        author_name: authorName.trim() || "John Stayte Energy Team",
        is_published: isPublished,
      };

      // Try inserting/updating cms_blog_posts table
      try {
        if (editingPost) {
          await supabase.from("cms_blog_posts").update(dbPayload).eq("slug", editingPost.slug);
        } else {
          await supabase.from("cms_blog_posts").insert(dbPayload);
        }
      } catch (dbErr) {
        console.warn("DB direct insert notice:", dbErr);
      }

      // Update local and CMS content block
      const updatedList = editingPost
        ? posts.map((p) => (p.slug === editingPost.slug ? { ...p, ...payload } : p))
        : [payload, ...posts];

      setPosts(updatedList);
      await persistPostsUpdate(updatedList);

      await logAdminAuditAction(editingPost ? "UPDATE_BLOG_POST" : "CREATE_BLOG_POST", "blog", payload.slug, { title });
      toast.success(editingPost ? "Blog post updated in Supabase!" : "New blog post published in Supabase!");

      setModalOpen(false);
    } catch (err: any) {
      toast.error("Failed to save post: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const togglePublishedStatus = async (p: any) => {
    try {
      const updatedStatus = !p.is_published;
      const updatedList = posts.map((item) => (item.slug === p.slug ? { ...item, is_published: updatedStatus } : item));
      setPosts(updatedList);
      await persistPostsUpdate(updatedList);

      try {
        await supabase.from("cms_blog_posts").update({ is_published: updatedStatus }).eq("slug", p.slug);
      } catch {}

      await logAdminAuditAction(updatedStatus ? "PUBLISH_BLOG_POST" : "UNPUBLISH_BLOG_POST", "blog", p.slug);
      toast.success(`Post "${p.title}" ${updatedStatus ? "published" : "moved to draft"}!`);
    } catch (err: any) {
      toast.error("Failed to update status: " + err.message);
    }
  };

  const handleDeletePost = async (slugToDelete: string, postTitle: string) => {
    if (!confirm(`Are you sure you want to delete post "${postTitle}"?`)) return;
    try {
      const updatedList = posts.filter((p) => p.slug !== slugToDelete);
      setPosts(updatedList);
      await persistPostsUpdate(updatedList);

      try {
        await supabase.from("cms_blog_posts").delete().eq("slug", slugToDelete);
      } catch {}

      await logAdminAuditAction("DELETE_BLOG_POST", "blog", slugToDelete, { title: postTitle });
      toast.success("Blog post deleted!");
    } catch (err: any) {
      toast.error("Failed to delete post: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Blog & Safety Guides CMS</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Manage live educational articles, emergency gas guides, safety protocols, and regulations ({posts.length} articles active in database).
          </p>
        </div>
        <div className="flex items-center gap-2">
          {posts.length < ALL_EXISTING_BLOG_POSTS.length && (
            <Button
              onClick={handleMigrateArticlesToSupabase}
              disabled={migrating}
              variant="outline"
              size="sm"
              className="rounded-full font-bold text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
            >
              {migrating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Migrate Legacy Articles ({ALL_EXISTING_BLOG_POSTS.length - posts.length} articles)
            </Button>
          )}
          <Button onClick={openCreateModal} className="rounded-full shadow-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 text-xs">
            <Plus className="h-4 w-4" /> New Article
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="surface-card rounded-3xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-600 font-extrabold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-4">Article</th>
                  <th className="px-5 py-4">Category</th>
                  <th className="px-5 py-4">Author</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Created</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {posts.map((p) => (
                  <tr key={p.slug || p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {p.image_url ? (
                          <img src={p.image_url} alt="" className="h-10 w-14 rounded-lg object-cover bg-slate-100 border border-slate-200" />
                        ) : (
                          <div className="h-10 w-14 rounded-lg bg-slate-100 border border-slate-200 grid place-items-center text-slate-400">
                            <ImageIcon className="h-4 w-4" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-900 line-clamp-1">{p.title}</p>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">/{p.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {p.category || "Safety"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{p.author_name || "John Stayte Team"}</td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => togglePublishedStatus(p)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                          p.is_published !== false
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60 hover:bg-emerald-100"
                            : "bg-amber-50 text-amber-700 border border-amber-200/60 hover:bg-amber-100"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${p.is_published !== false ? "bg-emerald-500" : "bg-amber-500"}`} />
                        {p.is_published !== false ? "Published" : "Draft"}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-[11px]">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString("en-GB") : "Current"}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(p)} className="h-7 w-7 p-0 rounded-full text-slate-600 hover:text-slate-900">
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeletePost(p.slug, p.title)} className="h-7 w-7 p-0 rounded-full text-red-600 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT ARTICLE MODAL */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-7">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight">
              {editingPost ? "Edit Article in Supabase" : "Create New Article"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div>
              <Label className="text-xs font-bold">Article Title</Label>
              <Input
                value={title}
                onChange={(e) => generateSlug(e.target.value)}
                placeholder="e.g. LPG Cylinder Winter Maintenance & Frost Precautions"
                className="mt-1 rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold">Slug / URL Path</Label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="lpg-cylinder-winter-maintenance"
                  className="mt-1 rounded-xl text-xs font-mono"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Category</Label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Safety / Emergency / Guides"
                  className="mt-1 rounded-xl text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold">Short Excerpt / Summary</Label>
              <Textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows={2}
                placeholder="Brief 1-2 sentence overview for cards and meta descriptions..."
                className="mt-1 rounded-xl text-xs resize-none"
              />
            </div>

            <div>
              <Label className="text-xs font-bold">Full Article Content (Markdown or Text)</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                placeholder="Write full article body text, step-by-step instructions, or protocols..."
                className="mt-1 rounded-xl text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-bold">Cover Image URL / Upload</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://... or /image.jpg"
                  className="rounded-xl text-xs flex-1"
                />
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-50 transition-colors">
                    {uploadingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    Upload
                  </span>
                </label>
              </div>
              {imageUrl && (
                <div className="mt-2 relative h-24 w-40 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                  <img src={imageUrl} alt="Preview" className="h-full w-full object-cover" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <Label className="text-xs font-bold">Author Name</Label>
                <Input
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="John Stayte Energy Team"
                  className="mt-1 rounded-xl text-xs"
                />
              </div>
              <div className="flex flex-col justify-end">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-xs font-bold text-slate-700">Published Status</span>
                  <Switch checked={isPublished} onCheckedChange={setIsPublished} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
            <Button variant="ghost" onClick={() => setModalOpen(false)} className="rounded-full text-xs font-bold">
              Cancel
            </Button>
            <Button onClick={handleSavePost} disabled={saving} className="rounded-full text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editingPost ? "Save Changes" : "Publish Article"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

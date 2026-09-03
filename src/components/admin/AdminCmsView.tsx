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
  Briefcase,
  Star,
  Building2,
  Truck,
  MessageSquareQuote,
  Upload,
  Home as HomeIcon,
  Info,
  Save,
  Sparkles,
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
import { supabase } from "@/lib/supabase";
import { logAdminAuditAction } from "@/lib/audit";

export const DEFAULT_SERVICES = [
  { id: "srv-1", title: "Gas Delivery", desc: "Next-day cylinder delivery across Gloucestershire to homes, farms and commercial premises.", icon: "Truck", image: "/service_gas_delivery.jpg", status: "Active" },
  { id: "srv-2", title: "Bulk Supply", desc: "Scheduled bulk LPG for farms and large estates with automated telemetry monitoring.", icon: "Container", image: "/service_bulk_supply.jpg", status: "Active" },
  { id: "srv-3", title: "Commercial Gas", desc: "Pub, hospitality and industrial catering gas contracts with scheduled replenishment and 30-day invoicing.", icon: "Building2", image: "/service_commercial_gas.jpg", status: "Active" },
  { id: "srv-4", title: "Domestic Supply", desc: "Home heating, cooking and barbecue patio gas with prompt doorstep empty cylinder swap.", icon: "Home", image: "/service_domestic_supply.jpg", status: "Active" },
  { id: "srv-5", title: "Cylinder Exchange", desc: "Swap empty bottles instantly at any of our three forecourt depots in Fromebridge, Cambridge and Frampton.", icon: "RefreshCw", image: "/service_cylinder_exchange.jpg", status: "Active" },
  { id: "srv-6", title: "Emergency Delivery", desc: "Same-day emergency fuel runs when your tank or heating runs dry during cold snaps.", icon: "Siren", image: "/service_emergency_delivery.jpg", status: "Active" },
];

export const DEFAULT_REVIEWS = [
  { id: "rev-1", name: "Sarah H.", role: "Frampton on Severn", quote: "Ordered 19kg propane at 9am and it was on the doorstep the next morning. Faultless service.", rating: 5, status: "Published" },
  { id: "rev-2", name: "The Bell Inn", role: "Pub Customer", quote: "Our cellar gas has never run out since switching to JSS. The scheduling and changeovers are spot on.", rating: 5, status: "Published" },
  { id: "rev-3", name: "Mark T.", role: "Smallholding, Cam", quote: "Coal, logs and animal feed delivered all in one delivery. Saves me two long vehicle trips a week.", rating: 5, status: "Published" },
  { id: "rev-4", name: "David P.", role: "Stroud Customer", quote: "Excellent advice on regulator fittings and very friendly delivery driver who carried the bottle into position.", rating: 5, status: "Published" },
];

export const DEFAULT_HOME_CMS = {
  heroEyebrow: "Family run since 1972",
  heroHeading: "Order your gas delivery with us today.",
  heroSubtitle: "Calor cylinders, coal, logs, fishing baits, animal feed and appliances — supplied and delivered across Gloucestershire by a team you can actually call.",
  deliveryBadge: "Next-Day Local Delivery Available",
  primaryCtaText: "Order Gas Online",
  primaryCtaLink: "/order-gas",
  secondaryCtaText: "Browse Full Shop",
  secondaryCtaLink: "/products",
  statsYears: "50+",
  statsStations: "3",
  statsCylinders: "15k+",
  statsOnTime: "99.8%",
};

export const DEFAULT_ABOUT_CMS = {
  heroEyebrow: "ABOUT JOHN STAYTE SERVICES",
  heroHeading: "Keeping Gloucestershire moving, warm and well-equipped since 1972.",
  heroSubtitle: "More than 50 years of dependable fuel delivery, bottled gas, solid fuels, animal feed, country essentials and forecourt services from a family business that puts customer service first.",
  heritageTitle: "A family business built on local trust since 1972",
  heritageBody: "From a single delivery lorry in Whitminster to a modern logistics fleet and three forecourt operations across Gloucestershire, John Stayte Services has remained dedicated to personal service, dependable supply, and genuine customer care.",
  depotInfo: "Headquartered at Fromebridge with three forecourt locations in Fromebridge, Cambridge, and Frampton on Severn.",
};

export function AdminCmsView() {
  const [activeTab, setActiveTab] = useState("home");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // CMS Content State
  const [homeCms, setHomeCms] = useState(DEFAULT_HOME_CMS);
  const [aboutCms, setAboutCms] = useState(DEFAULT_ABOUT_CMS);
  const [services, setServices] = useState<any[]>(DEFAULT_SERVICES);
  const [reviews, setReviews] = useState<any[]>(DEFAULT_REVIEWS);
  const [offers, setOffers] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);

  // Service Modal State
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [serviceTitle, setServiceTitle] = useState("");
  const [serviceDesc, setServiceDesc] = useState("");
  const [serviceIcon, setServiceIcon] = useState("Truck");
  const [serviceImage, setServiceImage] = useState("");
  const [uploadingServiceImg, setUploadingServiceImg] = useState(false);

  // Review Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<any | null>(null);
  const [reviewName, setReviewName] = useState("");
  const [reviewRole, setReviewRole] = useState("");
  const [reviewQuote, setReviewQuote] = useState("");
  const [reviewRating, setReviewRating] = useState("5");

  // Offer Modal State
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any | null>(null);
  const [offerTitle, setOfferTitle] = useState("");
  const [offerDesc, setOfferDesc] = useState("");
  const [offerDiscount, setOfferDiscount] = useState("10");

  const loadCmsData = async () => {
    setLoading(true);
    try {
      const [
        { data: homeBlock },
        { data: aboutBlock },
        { data: srvBlock },
        { data: revBlock },
        { data: offerData },
        { data: bannerData },
      ] = await Promise.all([
        supabase.from("cms_content_blocks").select("content").eq("section_key", "home_data").maybeSingle(),
        supabase.from("cms_content_blocks").select("content").eq("section_key", "about_data").maybeSingle(),
        supabase.from("cms_content_blocks").select("content").eq("section_key", "services_data").maybeSingle(),
        supabase.from("cms_content_blocks").select("content").eq("section_key", "testimonials_data").maybeSingle(),
        supabase.from("offers").select("*").order("created_at", { ascending: false }),
        supabase.from("cms_banners").select("*").order("created_at", { ascending: false }),
      ]);

      if (homeBlock?.content) {
        try {
          const dbParsed = JSON.parse(homeBlock.content);
          // Always enforce the approved hero text — never let the DB override it.
          const fixedCms = {
            ...DEFAULT_HOME_CMS,
            ...dbParsed,
            // These three hero fields are locked to the approved values:
            heroEyebrow: DEFAULT_HOME_CMS.heroEyebrow,
            heroHeading: DEFAULT_HOME_CMS.heroHeading,
            heroSubtitle: DEFAULT_HOME_CMS.heroSubtitle,
          };
          setHomeCms(fixedCms);
          // Repair the DB record if it still contains old wrong hero text
          if (
            dbParsed.heroEyebrow !== DEFAULT_HOME_CMS.heroEyebrow ||
            dbParsed.heroHeading !== DEFAULT_HOME_CMS.heroHeading ||
            dbParsed.heroSubtitle !== DEFAULT_HOME_CMS.heroSubtitle
          ) {
            await supabase.from("cms_content_blocks").upsert({
              section_key: "home_data",
              title: "Homepage Editorial Content",
              content: JSON.stringify(fixedCms),
            }, { onConflict: "section_key" });
          }
        } catch {}
      } else {
        await supabase.from("cms_content_blocks").upsert({
          section_key: "home_data",
          title: "Home Page Content",
          content: JSON.stringify(DEFAULT_HOME_CMS),
        }, { onConflict: "section_key" });
      }

      if (aboutBlock?.content) {
        try { setAboutCms({ ...DEFAULT_ABOUT_CMS, ...JSON.parse(aboutBlock.content) }); } catch {}
      } else {
        await supabase.from("cms_content_blocks").upsert({
          section_key: "about_data",
          title: "About Page Content",
          content: JSON.stringify(DEFAULT_ABOUT_CMS),
        }, { onConflict: "section_key" });
      }

      if (srvBlock?.content) {
        try {
          const parsed = JSON.parse(srvBlock.content);
          if (Array.isArray(parsed) && parsed.length > 0) setServices(parsed);
        } catch {}
      } else {
        await supabase.from("cms_content_blocks").upsert({
          section_key: "services_data",
          title: "Services Catalog",
          content: JSON.stringify(DEFAULT_SERVICES),
        }, { onConflict: "section_key" });
      }

      if (revBlock?.content) {
        try {
          const parsed = JSON.parse(revBlock.content);
          if (Array.isArray(parsed) && parsed.length > 0) setReviews(parsed);
        } catch {}
      } else {
        await supabase.from("cms_content_blocks").upsert({
          section_key: "testimonials_data",
          title: "Customer Reviews",
          content: JSON.stringify(DEFAULT_REVIEWS),
        }, { onConflict: "section_key" });
      }

      setOffers(offerData && offerData.length > 0 ? offerData : [
        {
          id: "off-1",
          title: "Propane Cylinder Summer Discount",
          description: "10% off all 19kg and 47kg Calor propane cylinders with coupon code JSS10",
          discount_percentage: 10,
          is_active: true,
        },
      ]);

      setBanners(bannerData && bannerData.length > 0 ? bannerData : [
        {
          id: "ban-1",
          title: "Summer Fuel Promo",
          message: "Order online today for guaranteed next-day Gloucestershire delivery. Use code JSS10 for 10% off.",
          link_url: "/offers",
          is_active: true,
        },
      ]);
    } catch (err: any) {
      console.error("CMS data load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCmsData();
  }, []);

  // --- SAVE HOME CMS ---
  const handleSaveHomeCms = async () => {
    setSubmitting(true);
    try {
      window.dispatchEvent(new CustomEvent("cms_home_updated", { detail: homeCms }));

      await supabase.from("cms_content_blocks").upsert({
        section_key: "home_data",
        title: "Homepage Editorial Content",
        content: JSON.stringify(homeCms),
      }, { onConflict: "section_key" });

      await logAdminAuditAction("UPDATE_HOME_CMS", "cms", "home_data", { heading: homeCms.heroHeading });
      toast.success("Homepage content saved successfully!");
    } catch (err: any) {
      toast.error("Failed to save homepage CMS: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // --- SAVE ABOUT CMS ---
  const handleSaveAboutCms = async () => {
    setSubmitting(true);
    try {
      window.dispatchEvent(new CustomEvent("cms_about_updated", { detail: aboutCms }));

      await supabase.from("cms_content_blocks").upsert({
        section_key: "about_data",
        title: "About Page Editorial Content",
        content: JSON.stringify(aboutCms),
      }, { onConflict: "section_key" });

      await logAdminAuditAction("UPDATE_ABOUT_CMS", "cms", "about_data", { heading: aboutCms.heroHeading });
      toast.success("About page content saved successfully!");
    } catch (err: any) {
      toast.error("Failed to save about CMS: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // --- SERVICE ACTIONS ---
  const handleOpenServiceModal = (srv?: any) => {
    if (srv) {
      setEditingService(srv);
      setServiceTitle(srv.title || "");
      setServiceDesc(srv.desc || srv.description || "");
      setServiceIcon(srv.icon || "Truck");
      setServiceImage(srv.image || "");
    } else {
      setEditingService(null);
      setServiceTitle("");
      setServiceDesc("");
      setServiceIcon("Truck");
      setServiceImage("/service_gas_delivery.jpg");
    }
    setServiceModalOpen(true);
  };

  const handleUploadServiceImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingServiceImg(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `service_${Date.now()}.${fileExt}`;
      const filePath = `services/${fileName}`;
      const { error: uploadErr } = await supabase.storage.from("product-images").upload(filePath, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
      setServiceImage(data.publicUrl);
      toast.success("Service image uploaded!");
    } catch (err: any) {
      setServiceImage(URL.createObjectURL(file));
      toast.success("Image selected for service!");
    } finally {
      setUploadingServiceImg(false);
    }
  };

  const handleSaveService = async () => {
    if (!serviceTitle.trim()) return toast.error("Service title is required.");
    setSubmitting(true);
    try {
      const payload = {
        id: editingService ? editingService.id : `srv-${Date.now()}`,
        title: serviceTitle.trim(),
        desc: serviceDesc.trim(),
        description: serviceDesc.trim(),
        icon: serviceIcon,
        image: serviceImage || "/service_gas_delivery.jpg",
        status: "Active",
      };

      const updatedList = editingService
        ? services.map((s) => (s.id === editingService.id ? payload : s))
        : [...services, payload];

      setServices(updatedList);
      window.dispatchEvent(new CustomEvent("cms_services_updated", { detail: updatedList }));

      await supabase.from("cms_content_blocks").upsert({
        section_key: "services_data",
        title: "Core Gas and Fuel Services",
        content: JSON.stringify(updatedList),
      }, { onConflict: "section_key" });

      toast.success(editingService ? "Service updated successfully!" : "New service added successfully!");
      setServiceModalOpen(false);
    } catch (err: any) {
      toast.error("Failed to save service: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return;
    try {
      const updatedList = services.filter((s) => s.id !== id);
      setServices(updatedList);
      window.dispatchEvent(new CustomEvent("cms_services_updated", { detail: updatedList }));

      await supabase.from("cms_content_blocks").upsert({
        section_key: "services_data",
        title: "Core Gas and Fuel Services",
        content: JSON.stringify(updatedList),
      }, { onConflict: "section_key" });

      toast.success("Service deleted!");
    } catch (err: any) {
      toast.error("Failed to delete service: " + err.message);
    }
  };

  // --- REVIEW ACTIONS ---
  const handleOpenReviewModal = (rev?: any) => {
    if (rev) {
      setEditingReview(rev);
      setReviewName(rev.name || "");
      setReviewRole(rev.role || "");
      setReviewQuote(rev.quote || "");
      setReviewRating(String(rev.rating || 5));
    } else {
      setEditingReview(null);
      setReviewName("");
      setReviewRole("Gloucestershire Customer");
      setReviewQuote("");
      setReviewRating("5");
    }
    setReviewModalOpen(true);
  };

  const handleSaveReview = async () => {
    if (!reviewName.trim() || !reviewQuote.trim()) {
      return toast.error("Please enter reviewer name and testimonial quote.");
    }
    setSubmitting(true);
    try {
      const payload = {
        id: editingReview ? editingReview.id : `rev-${Date.now()}`,
        name: reviewName.trim(),
        role: reviewRole.trim() || "Customer",
        quote: reviewQuote.trim(),
        rating: Number(reviewRating) || 5,
        status: "Published",
      };

      const updatedList = editingReview
        ? reviews.map((r) => (r.id === editingReview.id ? payload : r))
        : [...reviews, payload];

      setReviews(updatedList);

      await supabase.from("cms_content_blocks").upsert({
        section_key: "testimonials_data",
        title: "Customer Testimonials",
        content: JSON.stringify(updatedList),
      }, { onConflict: "section_key" });

      toast.success(editingReview ? "Testimonial updated successfully!" : "New testimonial published successfully!");
      setReviewModalOpen(false);
    } catch (err: any) {
      toast.error("Failed to save testimonial: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (!confirm("Are you sure you want to delete this review?")) return;
    try {
      const updatedList = reviews.filter((r) => r.id !== id);
      setReviews(updatedList);

      await supabase.from("cms_content_blocks").upsert({
        section_key: "testimonials_data",
        title: "Customer Testimonials",
        content: JSON.stringify(updatedList),
      }, { onConflict: "section_key" });

      toast.success("Review deleted!");
    } catch (err: any) {
      toast.error("Failed to delete review: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Content Management System (CMS)</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Centralized database control for Home, About, Core Services, Customer Reviews, Offers and Banners.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-100/80 p-1 rounded-2xl flex-wrap">
          <TabsTrigger value="home" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs">
            <HomeIcon className="h-3.5 w-3.5 text-primary" /> Home Page CMS
          </TabsTrigger>
          <TabsTrigger value="about" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs">
            <Info className="h-3.5 w-3.5 text-primary" /> About Page CMS
          </TabsTrigger>
          <TabsTrigger value="services" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs">
            <Briefcase className="h-3.5 w-3.5 text-primary" /> Services ({services.length})
          </TabsTrigger>
          <TabsTrigger value="reviews" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs">
            <MessageSquareQuote className="h-3.5 w-3.5 text-primary" /> Reviews ({reviews.length})
          </TabsTrigger>
          <TabsTrigger value="offers" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs">
            <Tag className="h-3.5 w-3.5 text-primary" /> Offers & Promos ({offers.length})
          </TabsTrigger>
          <TabsTrigger value="banners" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs">
            <ImageIcon className="h-3.5 w-3.5 text-primary" /> Header Banners ({banners.length})
          </TabsTrigger>
        </TabsList>

        {/* --- HOME PAGE CMS TAB --- */}
        <TabsContent value="home" className="space-y-4">
          <div className="surface-card rounded-3xl border border-slate-200/80 bg-white p-6 space-y-5 shadow-xs">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">Homepage Hero & Section Headers</h3>
                <p className="text-xs text-slate-500">Live headlines, intro copy, delivery badges and CTA buttons</p>
              </div>
              <Button onClick={handleSaveHomeCms} disabled={submitting} className="rounded-full font-bold text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5">
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save Homepage Content
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label className="text-xs font-bold">Hero Eyebrow Label</Label>
                <Input
                  value={homeCms.heroEyebrow}
                  onChange={(e) => setHomeCms({ ...homeCms, heroEyebrow: e.target.value })}
                  className="mt-1 rounded-xl text-xs"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs font-bold">Hero Main Heading (H1)</Label>
                <Input
                  value={homeCms.heroHeading}
                  onChange={(e) => setHomeCms({ ...homeCms, heroHeading: e.target.value })}
                  className="mt-1 rounded-xl text-xs font-bold"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs font-bold">Hero Subtitle Description</Label>
                <Textarea
                  value={homeCms.heroSubtitle}
                  onChange={(e) => setHomeCms({ ...homeCms, heroSubtitle: e.target.value })}
                  rows={3}
                  className="mt-1 rounded-xl text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Delivery Badge Text</Label>
                <Input
                  value={homeCms.deliveryBadge}
                  onChange={(e) => setHomeCms({ ...homeCms, deliveryBadge: e.target.value })}
                  className="mt-1 rounded-xl text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Primary CTA Button Label</Label>
                <Input
                  value={homeCms.primaryCtaText}
                  onChange={(e) => setHomeCms({ ...homeCms, primaryCtaText: e.target.value })}
                  className="mt-1 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider mb-3">Homepage Trust Stats</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <Label className="text-[11px] font-bold">Years Active</Label>
                  <Input
                    value={homeCms.statsYears}
                    onChange={(e) => setHomeCms({ ...homeCms, statsYears: e.target.value })}
                    className="mt-1 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-bold">Forecourts</Label>
                  <Input
                    value={homeCms.statsStations}
                    onChange={(e) => setHomeCms({ ...homeCms, statsStations: e.target.value })}
                    className="mt-1 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-bold">Cylinders / Year</Label>
                  <Input
                    value={homeCms.statsCylinders}
                    onChange={(e) => setHomeCms({ ...homeCms, statsCylinders: e.target.value })}
                    className="mt-1 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-bold">On-Time %</Label>
                  <Input
                    value={homeCms.statsOnTime}
                    onChange={(e) => setHomeCms({ ...homeCms, statsOnTime: e.target.value })}
                    className="mt-1 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* --- ABOUT PAGE CMS TAB --- */}
        <TabsContent value="about" className="space-y-4">
          <div className="surface-card rounded-3xl border border-slate-200/80 bg-white p-6 space-y-5 shadow-xs">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">About Page Company Content</h3>
                <p className="text-xs text-slate-500">Manage 1972 company heritage, mission statement and depot details</p>
              </div>
              <Button onClick={handleSaveAboutCms} disabled={submitting} className="rounded-full font-bold text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5">
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save About Content
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-xs font-bold">About Main Heading (H1)</Label>
                <Input
                  value={aboutCms.heroHeading}
                  onChange={(e) => setAboutCms({ ...aboutCms, heroHeading: e.target.value })}
                  className="mt-1 rounded-xl text-xs font-bold"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Hero Subtitle</Label>
                <Textarea
                  value={aboutCms.heroSubtitle}
                  onChange={(e) => setAboutCms({ ...aboutCms, heroSubtitle: e.target.value })}
                  rows={2}
                  className="mt-1 rounded-xl text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Heritage Section Title</Label>
                <Input
                  value={aboutCms.heritageTitle}
                  onChange={(e) => setAboutCms({ ...aboutCms, heritageTitle: e.target.value })}
                  className="mt-1 rounded-xl text-xs font-bold"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Heritage Story Body</Label>
                <Textarea
                  value={aboutCms.heritageBody}
                  onChange={(e) => setAboutCms({ ...aboutCms, heritageBody: e.target.value })}
                  rows={4}
                  className="mt-1 rounded-xl text-xs leading-relaxed"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Depots & Logistics Overview</Label>
                <Input
                  value={aboutCms.depotInfo}
                  onChange={(e) => setAboutCms({ ...aboutCms, depotInfo: e.target.value })}
                  className="mt-1 rounded-xl text-xs"
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* --- SERVICES TAB --- */}
        <TabsContent value="services" className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Core Website Services ({services.length})</h3>
              <p className="text-xs text-slate-500">Displayed across `/services` and homepage feature grid</p>
            </div>
            <Button onClick={() => handleOpenServiceModal()} size="sm" className="rounded-full text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add Service
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <div key={s.id} className="surface-card rounded-2xl border border-slate-200/80 bg-white p-5 flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-xl bg-primary/10 text-primary font-bold text-xs">
                      {s.icon || "Truck"}
                    </span>
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200/60 text-[10px]">
                      {s.status || "Active"}
                    </Badge>
                  </div>
                  {s.image && (
                    <div className="h-28 w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                      <img src={s.image} alt={s.title} className="h-full w-full object-cover" />
                    </div>
                  )}
                  <h4 className="font-bold text-slate-900 text-sm">{typeof s.title === "string" ? s.title : String(s.title || "")}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{typeof (s.desc || s.description) === "string" ? (s.desc || s.description) : String(s.desc || s.description || "")}</p>
                </div>
                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
                  <Button variant="ghost" size="sm" onClick={() => handleOpenServiceModal(s)} className="h-7 w-7 p-0 rounded-full text-slate-600 hover:text-slate-900">
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteService(s.id)} className="h-7 w-7 p-0 rounded-full text-red-600 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* --- REVIEWS TAB --- */}
        <TabsContent value="reviews" className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Customer Testimonials ({reviews.length})</h3>
              <p className="text-xs text-slate-500">Live reviews shown in customer trust sections and about pages</p>
            </div>
            <Button onClick={() => handleOpenReviewModal()} size="sm" className="rounded-full text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add Review
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {reviews.map((r) => (
              <div key={r.id} className="surface-card rounded-2xl border border-slate-200/80 bg-white p-5 flex flex-col justify-between shadow-xs">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-amber-500">
                      {Array.from({ length: r.rating || 5 }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-amber-400" />
                      ))}
                    </div>
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200/60 text-[10px]">
                      {r.status || "Published"}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-700 italic leading-relaxed">"{typeof r.quote === "string" ? r.quote : String(r.quote || "")}"</p>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{typeof r.name === "string" ? r.name : String(r.name || "")}</p>
                    <p className="text-[11px] text-slate-400">{typeof r.role === "string" ? r.role : "Gloucestershire Customer"}</p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 mt-3">
                  <Button variant="ghost" size="sm" onClick={() => handleOpenReviewModal(r)} className="h-7 w-7 p-0 rounded-full text-slate-600 hover:text-slate-900">
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteReview(r.id)} className="h-7 w-7 p-0 rounded-full text-red-600 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* --- OFFERS TAB --- */}
        <TabsContent value="offers" className="space-y-4">
          <div className="surface-card rounded-2xl border border-slate-200/80 bg-white p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-900">Active Offers ({offers.length})</h3>
              <Button asChild size="sm" className="rounded-full text-xs font-bold">
                <Link to="/admin/coupons">Manage Coupon Codes →</Link>
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="text-[10px] uppercase font-bold text-slate-400">
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {offers.map((o) => (
                  <TableRow key={o.id}>
                    <td className="font-bold text-slate-900">{typeof o.title === "string" ? o.title : String(o.title || "")}</td>
                    <td className="text-slate-500 max-w-sm">{typeof o.description === "string" ? o.description : String(o.description || "")}</td>
                    <td className="font-mono font-bold text-primary">{o.discount_percentage ? `${o.discount_percentage}%` : "Special"}</td>
                    <td>
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200/60 text-[10px]">
                        {o.is_active ? "Active" : "Disabled"}
                      </Badge>
                    </td>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* --- BANNERS TAB --- */}
        <TabsContent value="banners" className="space-y-4">
          <div className="surface-card rounded-2xl border border-slate-200/80 bg-white p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-900">Header Announcement Banners ({banners.length})</h3>
              <Button asChild size="sm" className="rounded-full text-xs font-bold">
                <Link to="/admin/banners">Open Banner Editor →</Link>
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="text-[10px] uppercase font-bold text-slate-400">
                  <TableHead>Title</TableHead>
                  <TableHead>Announcement Message</TableHead>
                  <TableHead>Destination Link</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {banners.map((b) => (
                  <TableRow key={b.id}>
                    <td className="font-bold text-slate-900">{typeof b.title === "string" ? b.title : String(b.title || "")}</td>
                    <td className="text-slate-500 max-w-md">{typeof b.message === "string" ? b.message : String(b.message || "")}</td>
                    <td className="font-mono text-primary">{b.link_url || "/offers"}</td>
                    <td>
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200/60 text-[10px]">
                        {b.is_active ? "Active" : "Disabled"}
                      </Badge>
                    </td>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* SERVICE MODAL */}
      <Dialog open={serviceModalOpen} onOpenChange={setServiceModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-7">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight">
              {editingService ? "Edit Service" : "Add Service"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label className="text-xs font-bold">Service Title</Label>
              <Input
                value={serviceTitle}
                onChange={(e) => setServiceTitle(e.target.value)}
                placeholder="e.g. Gas Delivery"
                className="mt-1 rounded-xl text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-bold">Description</Label>
              <Textarea
                value={serviceDesc}
                onChange={(e) => setServiceDesc(e.target.value)}
                rows={3}
                placeholder="Detailed description of service coverage..."
                className="mt-1 rounded-xl text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Icon Name</Label>
                <Input
                  value={serviceIcon}
                  onChange={(e) => setServiceIcon(e.target.value)}
                  placeholder="Truck / Container / Building2"
                  className="mt-1 rounded-xl text-xs font-mono"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Image URL / Upload</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={serviceImage}
                    onChange={(e) => setServiceImage(e.target.value)}
                    placeholder="/service_gas_delivery.jpg"
                    className="rounded-xl text-xs flex-1"
                  />
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" onChange={handleUploadServiceImage} className="hidden" />
                    <span className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-50">
                      {uploadingServiceImg ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                    </span>
                  </label>
                </div>
              </div>
            </div>
            {serviceImage && (
              <div className="h-24 w-full rounded-xl overflow-hidden bg-slate-50 border border-slate-200">
                <img src={serviceImage} alt="Preview" className="h-full w-full object-cover" />
              </div>
            )}
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
            <Button variant="ghost" onClick={() => setServiceModalOpen(false)} className="rounded-full text-xs font-bold">
              Cancel
            </Button>
            <Button onClick={handleSaveService} disabled={submitting} className="rounded-full text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5">
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editingService ? "Save Service" : "Add Service"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* REVIEW MODAL */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-7">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight">
              {editingReview ? "Edit Review" : "Add Testimonial"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Customer Name</Label>
                <Input
                  value={reviewName}
                  onChange={(e) => setReviewName(e.target.value)}
                  placeholder="e.g. Sarah H."
                  className="mt-1 rounded-xl text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Customer Location/Role</Label>
                <Input
                  value={reviewRole}
                  onChange={(e) => setReviewRole(e.target.value)}
                  placeholder="Frampton on Severn"
                  className="mt-1 rounded-xl text-xs"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold">Testimonial Quote</Label>
              <Textarea
                value={reviewQuote}
                onChange={(e) => setReviewQuote(e.target.value)}
                rows={3}
                placeholder="Write customer feedback..."
                className="mt-1 rounded-xl text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-bold">Star Rating (1-5)</Label>
              <Input
                type="number"
                min="1"
                max="5"
                value={reviewRating}
                onChange={(e) => setReviewRating(e.target.value)}
                className="mt-1 rounded-xl text-xs font-mono"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
            <Button variant="ghost" onClick={() => setReviewModalOpen(false)} className="rounded-full text-xs font-bold">
              Cancel
            </Button>
            <Button onClick={handleSaveReview} disabled={submitting} className="rounded-full text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5">
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editingReview ? "Save Review" : "Publish Review"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

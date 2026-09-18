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
  HelpCircle,
  Phone,
  Mail,
  MapPin,
  Clock,
  ExternalLink,
  Flame,
  Fuel,
  ShieldCheck,
  Megaphone,
  Globe,
  Share2,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { logAdminAuditAction } from "@/lib/audit";
import {
  fetchCmsBlock,
  saveCmsBlock,
  uploadCmsImage,
  DEFAULT_HOME_CMS,
  DEFAULT_ABOUT_CMS,
  DEFAULT_SERVICES_CMS,
  DEFAULT_SHOP_ORDER_GAS_CMS,
  DEFAULT_STATIONS_CMS,
  DEFAULT_CONTACT_FAQS_CMS,
  DEFAULT_FOOTER_CMS,
  HomeCmsData,
  AboutCmsData,
  ServicesCmsData,
  ShopOrderGasCmsData,
  StationsCmsData,
  ContactFaqsCmsData,
  FooterCmsData,
  ServiceItem,
  FaqItem,
  ForecourtStationItem,
  AboutTimelineItem,
  AboutValueItem,
  AboutProofItem,
  HomeWhyChooseCard,
} from "@/lib/cms-service";

export function AdminCmsView() {
  const [activeTab, setActiveTab] = useState("home");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // CMS Content States
  const [homeCms, setHomeCms] = useState<HomeCmsData>(DEFAULT_HOME_CMS);
  const [aboutCms, setAboutCms] = useState<AboutCmsData>(DEFAULT_ABOUT_CMS);
  const [servicesCms, setServicesCms] = useState<ServicesCmsData>(DEFAULT_SERVICES_CMS);
  const [shopGasCms, setShopGasCms] = useState<ShopOrderGasCmsData>(DEFAULT_SHOP_ORDER_GAS_CMS);
  const [stationsCms, setStationsCms] = useState<StationsCmsData>(DEFAULT_STATIONS_CMS);
  const [contactFaqsCms, setContactFaqsCms] = useState<ContactFaqsCmsData>(DEFAULT_CONTACT_FAQS_CMS);
  const [footerCms, setFooterCms] = useState<FooterCmsData>(DEFAULT_FOOTER_CMS);
  const [reviews, setReviews] = useState<any[]>([
    {
      id: "rev-1",
      name: "Sarah H.",
      role: "Frampton on Severn",
      quote: "Ordered 19kg propane at 9am and it was on the doorstep the next morning. Faultless service.",
      rating: 5,
      status: "Published",
    },
    {
      id: "rev-2",
      name: "The Bell Inn",
      role: "Pub Customer",
      quote: "Our cellar gas has never run out since switching to JSS. The scheduling and changeovers are spot on.",
      rating: 5,
      status: "Published",
    },
    {
      id: "rev-3",
      name: "Mark T.",
      role: "Smallholding, Cam",
      quote: "Coal, logs and animal feed delivered all in one delivery. Saves me two long vehicle trips a week.",
      rating: 5,
      status: "Published",
    },
  ]);

  // Modals States
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [uploadingImg, setUploadingImg] = useState(false);

  const [faqModalOpen, setFaqModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);

  const [stationModalOpen, setStationModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<ForecourtStationItem | null>(null);

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<any | null>(null);

  const [timelineModalOpen, setTimelineModalOpen] = useState(false);
  const [editingTimeline, setEditingTimeline] = useState<AboutTimelineItem | null>(null);

  const [valueModalOpen, setValueModalOpen] = useState(false);
  const [editingValue, setEditingValue] = useState<AboutValueItem | null>(null);

  // Load all CMS blocks from Supabase on mount
  useEffect(() => {
    async function loadAllCms() {
      setLoading(true);
      try {
        const [
          hData,
          aData,
          sData,
          gData,
          stData,
          oData,
          cfData,
          fData,
          revData,
        ] = await Promise.all([
          fetchCmsBlock("home_data", DEFAULT_HOME_CMS),
          fetchCmsBlock("about_data", DEFAULT_ABOUT_CMS),
          fetchCmsBlock("services_data", DEFAULT_SERVICES_CMS),
          fetchCmsBlock("shop_order_gas_data", DEFAULT_SHOP_ORDER_GAS_CMS),
          fetchCmsBlock("stations_data", DEFAULT_STATIONS_CMS),
          fetchCmsBlock("contact_faqs_data", DEFAULT_CONTACT_FAQS_CMS),
          fetchCmsBlock("footer_data", DEFAULT_FOOTER_CMS),
          fetchCmsBlock("testimonials_data", reviews),
        ]);

        setHomeCms(hData);
        setAboutCms(aData);
        setServicesCms(sData);
        setShopGasCms(gData);
        setStationsCms(stData);
        setContactFaqsCms(cfData);
        setFooterCms(fData);
        if (Array.isArray(revData) && revData.length > 0) {
          setReviews(revData);
        }
      } catch (err) {
        console.error("Failed to load CMS blocks:", err);
      } finally {
        setLoading(false);
      }
    }

    loadAllCms();
  }, []);

  // Save handler per section
  const handleSaveSection = async (
    sectionKey: string,
    title: string,
    content: any,
    successMsg: string,
  ) => {
    setSaving(true);
    try {
      await saveCmsBlock(sectionKey, title, content);
      await logAdminAuditAction("UPDATE_CMS_CONTENT", "CMS", sectionKey, { section: title });
      toast.success(successMsg || `${title} saved and published successfully!`);
    } catch (err: any) {
      toast.error(err.message || `Failed to save ${title}`);
    } finally {
      setSaving(false);
    }
  };

  // Image upload helper
  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    folder: string,
    onSuccess: (url: string) => void,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImg(true);
    try {
      const publicUrl = await uploadCmsImage(file, folder);
      onSuccess(publicUrl);
      toast.success("Image uploaded to Supabase Storage!");
    } catch (err: any) {
      toast.error(err.message || "Image upload failed");
    } finally {
      setUploadingImg(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <Loader2 className="mx-auto h-8 w-8 text-primary animate-spin" />
        <p className="text-xs text-slate-500 font-bold">Loading complete CMS content matrix...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* CMS Header Banner */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-red-600">
            <Sparkles className="h-3 w-3 text-primary" />
            <span>Customer Website CMS Suite</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
            Content Management System
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            Live management for 100% of customer-facing pages, headings, banners, trust badges,
            forecourt details, and FAQs with real Supabase synchronization.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            asChild
            variant="outline"
            className="rounded-full text-xs font-bold border-slate-300 gap-1.5"
          >
            <a href="/" target="_blank" rel="noreferrer">
              <Eye className="h-3.5 w-3.5" />
              <span>Preview Live Site</span>
            </a>
          </Button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto">
          <TabsList className="bg-transparent h-auto p-0 flex flex-wrap gap-1 justify-start">
            <TabsTrigger
              value="home"
              className="rounded-xl px-4 py-2.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs gap-1.5"
            >
              <HomeIcon className="h-3.5 w-3.5" /> Home Page
            </TabsTrigger>
            <TabsTrigger
              value="about"
              className="rounded-xl px-4 py-2.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs gap-1.5"
            >
              <Info className="h-3.5 w-3.5" /> About Page
            </TabsTrigger>
            <TabsTrigger
              value="services"
              className="rounded-xl px-4 py-2.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs gap-1.5"
            >
              <Truck className="h-3.5 w-3.5" /> Services Page
            </TabsTrigger>
            <TabsTrigger
              value="order-gas"
              className="rounded-xl px-4 py-2.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs gap-1.5"
            >
              <Flame className="h-3.5 w-3.5 text-primary" /> Shop &amp; Order Gas
            </TabsTrigger>
            <TabsTrigger
              value="stations"
              className="rounded-xl px-4 py-2.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs gap-1.5"
            >
              <Fuel className="h-3.5 w-3.5" /> Filling Stations
            </TabsTrigger>
            <TabsTrigger
              value="contact-faqs"
              className="rounded-xl px-4 py-2.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs gap-1.5"
            >
              <HelpCircle className="h-3.5 w-3.5" /> Contact &amp; FAQs
            </TabsTrigger>
            <TabsTrigger
              value="footer"
              className="rounded-xl px-4 py-2.5 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs gap-1.5"
            >
              <Globe className="h-3.5 w-3.5" /> Footer &amp; Global
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: HOME PAGE */}
        {/* ========================================================================= */}
        <TabsContent value="home" className="space-y-6">
          {/* Hero Section */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <HomeIcon className="h-4 w-4 text-primary" /> Home Page — Main Hero &amp; Trust Header
                </h3>
                <p className="text-xs text-slate-500">Top hero banner, delivery badges and CTA links.</p>
              </div>
              <Button
                onClick={() =>
                  handleSaveSection(
                    "home_data",
                    "Home Page Content",
                    homeCms,
                    "Home Hero & content saved to Supabase!",
                  )
                }
                disabled={saving}
                className="rounded-full px-5 h-9 text-xs font-bold bg-primary hover:bg-primary/90 text-white gap-1.5"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>Save Home Content</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Hero Eyebrow Tag</Label>
                <Input
                  value={homeCms.heroEyebrow}
                  onChange={(e) => setHomeCms({ ...homeCms, heroEyebrow: e.target.value })}
                  className="rounded-xl h-10 text-xs"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-bold text-slate-700">Hero Main Heading *</Label>
                <Input
                  value={homeCms.heroHeading}
                  onChange={(e) => setHomeCms({ ...homeCms, heroHeading: e.target.value })}
                  className="rounded-xl h-10 text-xs font-bold"
                />
              </div>

              <div className="space-y-1 sm:col-span-3">
                <Label className="text-xs font-bold text-slate-700">Hero Description Subtitle</Label>
                <Textarea
                  rows={2}
                  value={homeCms.heroSubtitle}
                  onChange={(e) => setHomeCms({ ...homeCms, heroSubtitle: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Delivery Badge Label</Label>
                <Input
                  value={homeCms.deliveryBadge}
                  onChange={(e) => setHomeCms({ ...homeCms, deliveryBadge: e.target.value })}
                  className="rounded-xl h-10 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Primary CTA Label</Label>
                <Input
                  value={homeCms.primaryCtaText}
                  onChange={(e) => setHomeCms({ ...homeCms, primaryCtaText: e.target.value })}
                  className="rounded-xl h-10 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Primary CTA URL</Label>
                <Input
                  value={homeCms.primaryCtaLink}
                  onChange={(e) => setHomeCms({ ...homeCms, primaryCtaLink: e.target.value })}
                  className="rounded-xl h-10 text-xs font-mono"
                />
              </div>
            </div>

            {/* Trust Stats Bar */}
            <div className="pt-4 border-t border-slate-100">
              <Label className="text-xs font-bold text-slate-900 block mb-3">
                Hero Trust Counters (Displayed below CTA)
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Years in Business</span>
                  <Input
                    value={homeCms.statsYears}
                    onChange={(e) => setHomeCms({ ...homeCms, statsYears: e.target.value })}
                    className="rounded-lg h-9 text-xs font-black bg-white"
                  />
                </div>
                <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Forecourt Stations</span>
                  <Input
                    value={homeCms.statsStations}
                    onChange={(e) => setHomeCms({ ...homeCms, statsStations: e.target.value })}
                    className="rounded-lg h-9 text-xs font-black bg-white"
                  />
                </div>
                <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Cylinders Delivered</span>
                  <Input
                    value={homeCms.statsCylinders}
                    onChange={(e) => setHomeCms({ ...homeCms, statsCylinders: e.target.value })}
                    className="rounded-lg h-9 text-xs font-black bg-white"
                  />
                </div>
                <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">On-Time Percentage</span>
                  <Input
                    value={homeCms.statsOnTime}
                    onChange={(e) => setHomeCms({ ...homeCms, statsOnTime: e.target.value })}
                    className="rounded-lg h-9 text-xs font-black bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Section Headings Editor */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <Label className="text-xs font-bold text-slate-900 block">
                Home Page Sub-Section Titles &amp; Headings
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-800">Category Section Title</span>
                  <Input
                    value={homeCms.categoryTitle}
                    onChange={(e) => setHomeCms({ ...homeCms, categoryTitle: e.target.value })}
                    className="rounded-lg h-9 text-xs bg-white font-bold"
                  />
                  <Textarea
                    rows={2}
                    value={homeCms.categorySubtitle}
                    onChange={(e) => setHomeCms({ ...homeCms, categorySubtitle: e.target.value })}
                    className="rounded-lg text-[11px] bg-white mt-1"
                  />
                </div>

                <div className="space-y-1 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-800">Shop by Brand Section Title</span>
                  <Input
                    value={homeCms.brandTitle}
                    onChange={(e) => setHomeCms({ ...homeCms, brandTitle: e.target.value })}
                    className="rounded-lg h-9 text-xs bg-white font-bold"
                  />
                  <Textarea
                    rows={2}
                    value={homeCms.brandSubtitle}
                    onChange={(e) => setHomeCms({ ...homeCms, brandSubtitle: e.target.value })}
                    className="rounded-lg text-[11px] bg-white mt-1"
                  />
                </div>

                <div className="space-y-1 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-800">Why Choose Us Title</span>
                  <Input
                    value={homeCms.whyUsTitle}
                    onChange={(e) => setHomeCms({ ...homeCms, whyUsTitle: e.target.value })}
                    className="rounded-lg h-9 text-xs bg-white font-bold"
                  />
                  <Textarea
                    rows={2}
                    value={homeCms.whyUsSubtitle}
                    onChange={(e) => setHomeCms({ ...homeCms, whyUsSubtitle: e.target.value })}
                    className="rounded-lg text-[11px] bg-white mt-1"
                  />
                </div>

                <div className="space-y-1 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-800">Customer Support CTA Banner</span>
                  <Input
                    value={homeCms.supportCtaTitle}
                    onChange={(e) => setHomeCms({ ...homeCms, supportCtaTitle: e.target.value })}
                    className="rounded-lg h-9 text-xs bg-white font-bold"
                  />
                  <Input
                    value={homeCms.supportCtaPhone}
                    onChange={(e) => setHomeCms({ ...homeCms, supportCtaPhone: e.target.value })}
                    placeholder="Phone number"
                    className="rounded-lg h-9 text-xs bg-white mt-1 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 2: ABOUT PAGE */}
        {/* ========================================================================= */}
        <TabsContent value="about" className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" /> About Us — Complete Narrative &amp; Story
                </h3>
                <p className="text-xs text-slate-500">History since 1972, timeline, mission, values and team.</p>
              </div>
              <Button
                onClick={() =>
                  handleSaveSection(
                    "about_data",
                    "About Page Content",
                    aboutCms,
                    "About page content saved to Supabase!",
                  )
                }
                disabled={saving}
                className="rounded-full px-5 h-9 text-xs font-bold bg-primary hover:bg-primary/90 text-white gap-1.5"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>Save About Content</span>
              </Button>
            </div>

            {/* Hero & Fast Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1 sm:col-span-4">
                <Label className="text-xs font-bold text-slate-700">About Hero Heading</Label>
                <Input
                  value={aboutCms.heroHeading}
                  onChange={(e) => setAboutCms({ ...aboutCms, heroHeading: e.target.value })}
                  className="rounded-xl h-10 text-xs font-bold"
                />
              </div>

              <div className="space-y-1 sm:col-span-4">
                <Label className="text-xs font-bold text-slate-700">Hero Subtitle</Label>
                <Textarea
                  rows={2}
                  value={aboutCms.heroSubtitle}
                  onChange={(e) => setAboutCms({ ...aboutCms, heroSubtitle: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Experience Stat</span>
                <Input
                  value={aboutCms.statYears}
                  onChange={(e) => setAboutCms({ ...aboutCms, statYears: e.target.value })}
                  className="rounded-lg h-9 text-xs font-black bg-white"
                />
              </div>
              <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Forecourt Count</span>
                <Input
                  value={aboutCms.statForecourts}
                  onChange={(e) => setAboutCms({ ...aboutCms, statForecourts: e.target.value })}
                  className="rounded-lg h-9 text-xs font-black bg-white"
                />
              </div>
              <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Cylinders Delivered</span>
                <Input
                  value={aboutCms.statDeliveries}
                  onChange={(e) => setAboutCms({ ...aboutCms, statDeliveries: e.target.value })}
                  className="rounded-lg h-9 text-xs font-black bg-white"
                />
              </div>
              <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Customer Rating</span>
                <Input
                  value={aboutCms.statRating}
                  onChange={(e) => setAboutCms({ ...aboutCms, statRating: e.target.value })}
                  className="rounded-lg h-9 text-xs font-black bg-white"
                />
              </div>
            </div>

            {/* Heritage Story */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <Label className="text-xs font-bold text-slate-900 block">Heritage Story (1972 - Present)</Label>
              <Input
                value={aboutCms.heritageTitle}
                onChange={(e) => setAboutCms({ ...aboutCms, heritageTitle: e.target.value })}
                placeholder="Heritage Title"
                className="rounded-xl h-10 text-xs font-bold"
              />
              <Textarea
                rows={3}
                value={aboutCms.heritageParagraph1}
                onChange={(e) => setAboutCms({ ...aboutCms, heritageParagraph1: e.target.value })}
                placeholder="Story Paragraph 1..."
                className="rounded-xl text-xs"
              />
              <Textarea
                rows={3}
                value={aboutCms.heritageParagraph2}
                onChange={(e) => setAboutCms({ ...aboutCms, heritageParagraph2: e.target.value })}
                placeholder="Story Paragraph 2..."
                className="rounded-xl text-xs"
              />
            </div>

            {/* Mission & Vision */}
            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <Label className="text-xs font-bold text-slate-800">Mission Statement</Label>
                <Textarea
                  rows={3}
                  value={aboutCms.missionStatement}
                  onChange={(e) => setAboutCms({ ...aboutCms, missionStatement: e.target.value })}
                  className="rounded-xl text-xs bg-white"
                />
              </div>
              <div className="space-y-1 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <Label className="text-xs font-bold text-slate-800">Vision Statement</Label>
                <Textarea
                  rows={3}
                  value={aboutCms.visionStatement}
                  onChange={(e) => setAboutCms({ ...aboutCms, visionStatement: e.target.value })}
                  className="rounded-xl text-xs bg-white"
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 3: SERVICES PAGE */}
        {/* ========================================================================= */}
        <TabsContent value="services" className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary" /> Services Page &amp; Service Cards Catalog
                </h3>
                <p className="text-xs text-slate-500">
                  Manage all 6 core services, emergency notice banners, and service detail links.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    setEditingService({
                      id: `srv-${Date.now()}`,
                      title: "New Service",
                      desc: "Service description here...",
                      icon: "Truck",
                      image: "/service_gas_delivery.jpg",
                      status: "Active",
                    });
                    setServiceModalOpen(true);
                  }}
                  className="rounded-full px-4 h-9 text-xs font-bold bg-slate-900 text-white gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Service</span>
                </Button>
                <Button
                  onClick={() =>
                    handleSaveSection(
                      "services_data",
                      "Services Catalog",
                      servicesCms,
                      "Services saved and published!",
                    )
                  }
                  disabled={saving}
                  className="rounded-full px-5 h-9 text-xs font-bold bg-primary hover:bg-primary/90 text-white gap-1.5"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  <span>Save All Services</span>
                </Button>
              </div>
            </div>

            {/* Emergency Notice Editor */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-red-50/60 p-4 rounded-2xl border border-red-200">
              <div className="space-y-1 sm:col-span-1">
                <Label className="text-xs font-bold text-red-950">Emergency Notice Title</Label>
                <Input
                  value={servicesCms.emergencyTitle}
                  onChange={(e) => setServicesCms({ ...servicesCms, emergencyTitle: e.target.value })}
                  className="rounded-xl h-9 text-xs bg-white font-bold"
                />
              </div>
              <div className="space-y-1 sm:col-span-1">
                <Label className="text-xs font-bold text-red-950">Emergency Phone Number</Label>
                <Input
                  value={servicesCms.emergencyPhone}
                  onChange={(e) => setServicesCms({ ...servicesCms, emergencyPhone: e.target.value })}
                  className="rounded-xl h-9 text-xs bg-white font-mono"
                />
              </div>
              <div className="space-y-1 sm:col-span-1">
                <Label className="text-xs font-bold text-red-950">Emergency Text</Label>
                <Input
                  value={servicesCms.emergencyText}
                  onChange={(e) => setServicesCms({ ...servicesCms, emergencyText: e.target.value })}
                  className="rounded-xl h-9 text-xs bg-white"
                />
              </div>
            </div>

            {/* Services Cards Table */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-16">Image</TableHead>
                    <TableHead>Service Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>CTA Link</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="text-right w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(servicesCms?.services || []).map((srv, idx) => (
                    <TableRow key={srv.id || idx}>
                      <TableCell>
                        <div className="h-10 w-14 rounded-lg bg-slate-100 overflow-hidden border border-slate-200">
                          <img src={srv.image} alt={srv.title} className="h-full w-full object-cover" />
                        </div>
                      </TableCell>
                      <TableCell className="font-extrabold text-xs text-slate-900">{srv.title}</TableCell>
                      <TableCell className="text-xs text-slate-500 max-w-xs truncate">{srv.desc}</TableCell>
                      <TableCell className="text-xs font-mono text-slate-600">{srv.ctaLink || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={srv.status === "Active" ? "default" : "secondary"}
                          className={srv.status === "Active" ? "bg-emerald-600 text-white" : ""}
                        >
                          {srv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingService(srv);
                            setServiceModalOpen(true);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-slate-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setServicesCms({
                              ...servicesCms,
                              services: (servicesCms?.services || []).filter((s) => s.id !== srv.id),
                            });
                          }}
                          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 4: SHOP & ORDER GAS */}
        {/* ========================================================================= */}
        <TabsContent value="order-gas" className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Flame className="h-4 w-4 text-primary" /> Shop &amp; Order Gas — Operational &amp; Safety Banners
                </h3>
                <p className="text-xs text-slate-500">
                  Cutoff announcements, refill bottle exchange rules, and PSSR safety guidance text.
                </p>
              </div>
              <Button
                onClick={() =>
                  handleSaveSection(
                    "shop_order_gas_data",
                    "Shop & Order Gas Settings",
                    shopGasCms,
                    "Order Gas notices saved to Supabase!",
                  )
                }
                disabled={saving}
                className="rounded-full px-5 h-9 text-xs font-bold bg-primary hover:bg-primary/90 text-white gap-1.5"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>Save Gas Notices</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-bold text-slate-700">Order Gas Hero Subtitle</Label>
                <Textarea
                  rows={2}
                  value={shopGasCms.heroSubtitle}
                  onChange={(e) => setShopGasCms({ ...shopGasCms, heroSubtitle: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1 sm:col-span-2 bg-amber-50/60 p-4 rounded-2xl border border-amber-200">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-bold text-amber-950">
                    Live Operational Delivery Announcement Banner
                  </Label>
                  <label className="flex items-center gap-2 text-xs font-bold text-amber-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shopGasCms.announcementActive}
                      onChange={(e) =>
                        setShopGasCms({ ...shopGasCms, announcementActive: e.target.checked })
                      }
                      className="h-4 w-4 rounded text-primary"
                    />
                    <span>Show Banner on Catalogue</span>
                  </label>
                </div>
                <Input
                  value={shopGasCms.announcementTitle}
                  onChange={(e) => setShopGasCms({ ...shopGasCms, announcementTitle: e.target.value })}
                  placeholder="Banner Title..."
                  className="rounded-xl h-9 text-xs bg-white font-bold mb-2"
                />
                <Textarea
                  rows={2}
                  value={shopGasCms.announcementText}
                  onChange={(e) => setShopGasCms({ ...shopGasCms, announcementText: e.target.value })}
                  placeholder="Banner Details..."
                  className="rounded-xl text-xs bg-white"
                />
              </div>

              <div className="space-y-1 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <Label className="text-xs font-bold text-slate-800">Refill Exchange Guidance Text</Label>
                <Textarea
                  rows={3}
                  value={shopGasCms.refillExchangeNotice}
                  onChange={(e) =>
                    setShopGasCms({ ...shopGasCms, refillExchangeNotice: e.target.value })
                  }
                  className="rounded-xl text-xs bg-white"
                />
              </div>

              <div className="space-y-1 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <Label className="text-xs font-bold text-slate-800">PSSR 2000 Safety Compliance Note</Label>
                <Textarea
                  rows={3}
                  value={shopGasCms.safetyText}
                  onChange={(e) => setShopGasCms({ ...shopGasCms, safetyText: e.target.value })}
                  className="rounded-xl text-xs bg-white"
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 5: FILLING STATIONS */}
        {/* ========================================================================= */}
        <TabsContent value="stations" className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Fuel className="h-4 w-4 text-primary" /> Forecourt Filling Stations &amp; Depots
                </h3>
                <p className="text-xs text-slate-500">
                  Opening hours, telephone numbers, amenities and Google Maps links for all 3 forecourts.
                </p>
              </div>
              <Button
                onClick={() =>
                  handleSaveSection(
                    "stations_data",
                    "Filling Stations Directory",
                    stationsCms,
                    "Forecourt stations updated in Supabase!",
                  )
                }
                disabled={saving}
                className="rounded-full px-5 h-9 text-xs font-bold bg-primary hover:bg-primary/90 text-white gap-1.5"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>Save All Stations</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(stationsCms?.stations || []).map((stn, idx) => (
                <div
                  key={stn.id || idx}
                  className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-slate-900">{stn.name}</span>
                    <Badge variant="outline" className="text-[10px] font-bold">
                      {stn.town}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <Label className="text-[10px] text-slate-400 font-bold uppercase">Phone Number</Label>
                      <Input
                        value={stn.phone}
                        onChange={(e) => {
                          const updated = [...(stationsCms?.stations || [])];
                          if (updated[idx]) {
                            updated[idx].phone = e.target.value;
                            setStationsCms({ ...stationsCms, stations: updated });
                          }
                        }}
                        className="rounded-lg h-8 text-xs bg-white font-mono"
                      />
                    </div>

                    <div>
                      <Label className="text-[10px] text-slate-400 font-bold uppercase">Opening Hours</Label>
                      <Input
                        value={stn.hours}
                        onChange={(e) => {
                          const updated = [...(stationsCms?.stations || [])];
                          if (updated[idx]) {
                            updated[idx].hours = e.target.value;
                            setStationsCms({ ...stationsCms, stations: updated });
                          }
                        }}
                        className="rounded-lg h-8 text-xs bg-white"
                      />
                    </div>

                    <div>
                      <Label className="text-[10px] text-slate-400 font-bold uppercase">Address &amp; Postcode</Label>
                      <Input
                        value={stn.address}
                        onChange={(e) => {
                          const updated = [...(stationsCms?.stations || [])];
                          if (updated[idx]) {
                            updated[idx].address = e.target.value;
                            setStationsCms({ ...stationsCms, stations: updated });
                          }
                        }}
                        className="rounded-lg h-8 text-xs bg-white"
                      />
                    </div>

                    <div>
                      <Label className="text-[10px] text-slate-400 font-bold uppercase">Google Maps URL</Label>
                      <Input
                        value={stn.maps_link}
                        onChange={(e) => {
                          const updated = [...(stationsCms?.stations || [])];
                          if (updated[idx]) {
                            updated[idx].maps_link = e.target.value;
                            setStationsCms({ ...stationsCms, stations: updated });
                          }
                        }}
                        className="rounded-lg h-8 text-xs bg-white font-mono text-[11px]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>


        {/* ========================================================================= */}
        {/* TAB 7: CONTACT & FAQS */}
        {/* ========================================================================= */}
        <TabsContent value="contact-faqs" className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-primary" /> Contact Details &amp; Frequently Asked Questions
                </h3>
                <p className="text-xs text-slate-500">
                  Customer FAQ knowledge base and depot opening hours for `/contact`.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    setEditingFaq({
                      id: `faq-${Date.now()}`,
                      question: "New Frequently Asked Question?",
                      answer: "Detailed answer explaining delivery or gas specifications...",
                      category: "General",
                      is_active: true,
                    });
                    setFaqModalOpen(true);
                  }}
                  className="rounded-full px-4 h-9 text-xs font-bold bg-slate-900 text-white gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add FAQ</span>
                </Button>
                <Button
                  onClick={() =>
                    handleSaveSection(
                      "contact_faqs_data",
                      "Contact & FAQs",
                      contactFaqsCms,
                      "Contact details & FAQs saved to Supabase!",
                    )
                  }
                  disabled={saving}
                  className="rounded-full px-5 h-9 text-xs font-bold bg-primary hover:bg-primary/90 text-white gap-1.5"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  <span>Save Contact &amp; FAQs</span>
                </Button>
              </div>
            </div>

            {/* Office Contact Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Primary Contact Phone</Label>
                <Input
                  value={contactFaqsCms.phonePrimary}
                  onChange={(e) =>
                    setContactFaqsCms({ ...contactFaqsCms, phonePrimary: e.target.value })
                  }
                  className="rounded-xl h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Customer Support Email</Label>
                <Input
                  value={contactFaqsCms.emailPrimary}
                  onChange={(e) =>
                    setContactFaqsCms({ ...contactFaqsCms, emailPrimary: e.target.value })
                  }
                  className="rounded-xl h-9 text-xs"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-bold text-slate-700">Depot Address</Label>
                <Input
                  value={contactFaqsCms.headOfficeAddress}
                  onChange={(e) =>
                    setContactFaqsCms({ ...contactFaqsCms, headOfficeAddress: e.target.value })
                  }
                  className="rounded-xl h-9 text-xs"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-bold text-slate-700">Weekday Opening Hours</Label>
                <Input
                  value={contactFaqsCms.hoursWeekday}
                  onChange={(e) =>
                    setContactFaqsCms({ ...contactFaqsCms, hoursWeekday: e.target.value })
                  }
                  className="rounded-xl h-9 text-xs"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-bold text-slate-700">Weekend Opening Hours</Label>
                <Input
                  value={contactFaqsCms.hoursSaturday}
                  onChange={(e) =>
                    setContactFaqsCms({ ...contactFaqsCms, hoursSaturday: e.target.value })
                  }
                  className="rounded-xl h-9 text-xs"
                />
              </div>
            </div>

            {/* FAQs List */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <Label className="text-xs font-bold text-slate-900 block">
                Frequently Asked Questions ({(contactFaqsCms?.faqs || []).length} Questions)
              </Label>
              <div className="space-y-2">
                {(contactFaqsCms?.faqs || []).map((faq, idx) => (
                  <div
                    key={faq.id || idx}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-bold">
                          {faq.category || "General"}
                        </Badge>
                        <span className="font-extrabold text-slate-900">{faq.question}</span>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed pl-1">{faq.answer}</p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingFaq(faq);
                          setFaqModalOpen(true);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-slate-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setContactFaqsCms({
                            ...contactFaqsCms,
                            faqs: (contactFaqsCms?.faqs || []).filter((f) => f.id !== faq.id),
                          });
                        }}
                        className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 8: FOOTER & GLOBAL NOTIFICATION BANNER */}
        {/* ========================================================================= */}
        <TabsContent value="footer" className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" /> Footer Content &amp; Global Announcement Banner
                </h3>
                <p className="text-xs text-slate-500">
                  Global emergency / operational alert bar, social links, and footer biography text.
                </p>
              </div>
              <Button
                onClick={() =>
                  handleSaveSection(
                    "footer_data",
                    "Footer & Global Settings",
                    footerCms,
                    "Footer & Global alert settings saved to Supabase!",
                  )
                }
                disabled={saving}
                className="rounded-full px-5 h-9 text-xs font-bold bg-primary hover:bg-primary/90 text-white gap-1.5"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>Save Global Settings</span>
              </Button>
            </div>

            {/* Global Alert Bar */}
            <div className="bg-amber-50/70 p-5 rounded-2xl border border-amber-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-amber-700" />
                  <span className="text-xs font-black text-amber-950 uppercase tracking-wider">
                    Global Site-Wide Announcement Bar
                  </span>
                </div>
                <label className="flex items-center gap-2 text-xs font-bold text-amber-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={footerCms.bannerActive}
                    onChange={(e) => setFooterCms({ ...footerCms, bannerActive: e.target.checked })}
                    className="h-4 w-4 rounded text-primary"
                  />
                  <span>Display on Website Header</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-amber-950">Badge Tag</Label>
                  <Input
                    value={footerCms.bannerBadge}
                    onChange={(e) => setFooterCms({ ...footerCms, bannerBadge: e.target.value })}
                    className="rounded-xl h-9 text-xs bg-white font-bold"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-bold text-amber-950">Announcement Message</Label>
                  <Input
                    value={footerCms.bannerText}
                    onChange={(e) => setFooterCms({ ...footerCms, bannerText: e.target.value })}
                    className="rounded-xl h-9 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-amber-950">Action Button Label</Label>
                  <Input
                    value={footerCms.bannerLinkText}
                    onChange={(e) => setFooterCms({ ...footerCms, bannerLinkText: e.target.value })}
                    className="rounded-xl h-9 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-bold text-amber-950">Action Destination URL</Label>
                  <Input
                    value={footerCms.bannerLinkUrl}
                    onChange={(e) => setFooterCms({ ...footerCms, bannerLinkUrl: e.target.value })}
                    className="rounded-xl h-9 text-xs bg-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Footer Bio & Socials */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1 sm:col-span-3">
                <Label className="text-xs font-bold text-slate-700">Footer Company Bio</Label>
                <Textarea
                  rows={2}
                  value={footerCms.bio}
                  onChange={(e) => setFooterCms({ ...footerCms, bio: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Facebook URL</Label>
                <Input
                  value={footerCms.facebookUrl}
                  onChange={(e) => setFooterCms({ ...footerCms, facebookUrl: e.target.value })}
                  className="rounded-xl h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Instagram URL</Label>
                <Input
                  value={footerCms.instagramUrl}
                  onChange={(e) => setFooterCms({ ...footerCms, instagramUrl: e.target.value })}
                  className="rounded-xl h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">YouTube Channel URL</Label>
                <Input
                  value={footerCms.youtubeUrl}
                  onChange={(e) => setFooterCms({ ...footerCms, youtubeUrl: e.target.value })}
                  className="rounded-xl h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1 sm:col-span-3">
                <Label className="text-xs font-bold text-slate-700">Legal Notice &amp; Copyright</Label>
                <Input
                  value={footerCms.legalNotice}
                  onChange={(e) => setFooterCms({ ...footerCms, legalNotice: e.target.value })}
                  className="rounded-xl h-9 text-xs"
                />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ========================================================================= */}
      {/* SERVICE EDIT MODAL */}
      {/* ========================================================================= */}
      <Dialog open={serviceModalOpen} onOpenChange={setServiceModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900">
              {editingService?.id?.startsWith("srv-") ? "Edit Service" : "Add Service"}
            </DialogTitle>
          </DialogHeader>

          {editingService && (
            <div className="space-y-4 text-xs pt-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Service Title *</Label>
                <Input
                  value={editingService.title}
                  onChange={(e) => setEditingService({ ...editingService, title: e.target.value })}
                  className="rounded-xl h-10 text-xs font-bold"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Description *</Label>
                <Textarea
                  rows={3}
                  value={editingService.desc}
                  onChange={(e) => setEditingService({ ...editingService, desc: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Service Image</Label>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-16 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                    <img
                      src={editingService.image}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <label className="flex-1">
                    <div className="flex items-center justify-center gap-2 border border-dashed border-slate-300 hover:border-slate-400 p-2.5 rounded-xl cursor-pointer bg-slate-50 text-slate-700 font-bold text-xs">
                      {uploadingImg ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 text-primary" />
                      )}
                      <span>{uploadingImg ? "Uploading..." : "Upload New Image"}</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleImageUpload(e, "services", (url) => {
                          setEditingService({ ...editingService, image: url });
                        })
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">CTA Button Text</Label>
                  <Input
                    value={editingService.ctaText || ""}
                    onChange={(e) =>
                      setEditingService({ ...editingService, ctaText: e.target.value })
                    }
                    placeholder="e.g. Order Gas"
                    className="rounded-xl h-10 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">CTA Destination URL</Label>
                  <Input
                    value={editingService.ctaLink || ""}
                    onChange={(e) =>
                      setEditingService({ ...editingService, ctaLink: e.target.value })
                    }
                    placeholder="e.g. /order-gas"
                    className="rounded-xl h-10 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Label className="text-xs font-bold text-slate-700">Status</Label>
                <select
                  value={editingService.status}
                  onChange={(e) =>
                    setEditingService({
                      ...editingService,
                      status: e.target.value as "Active" | "Inactive",
                    })
                  }
                  className="rounded-xl h-9 border border-slate-300 px-3 text-xs font-bold bg-white"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setServiceModalOpen(false)}
                  className="rounded-full px-4 text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const currentServices = servicesCms?.services || [];
                    const exists = currentServices.find((s) => s.id === editingService.id);
                    const updated = exists
                      ? currentServices.map((s) =>
                          s.id === editingService.id ? editingService : s,
                        )
                      : [...currentServices, editingService];

                    setServicesCms({ ...servicesCms, services: updated });
                    setServiceModalOpen(false);
                    toast.success("Service card updated in state. Click 'Save All Services' to publish.");
                  }}
                  className="rounded-full px-5 text-xs font-bold bg-primary text-white"
                >
                  Apply Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>



      {/* ========================================================================= */}
      {/* FAQ EDIT MODAL */}
      {/* ========================================================================= */}
      <Dialog open={faqModalOpen} onOpenChange={setFaqModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900">
              {editingFaq?.id?.startsWith("faq-") ? "Edit FAQ" : "Add FAQ"}
            </DialogTitle>
          </DialogHeader>

          {editingFaq && (
            <div className="space-y-4 text-xs pt-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Category</Label>
                <Input
                  value={editingFaq.category || ""}
                  onChange={(e) => setEditingFaq({ ...editingFaq, category: e.target.value })}
                  placeholder="e.g. Delivery / Cylinders / Trade"
                  className="rounded-xl h-10 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Question *</Label>
                <Input
                  value={editingFaq.question}
                  onChange={(e) => setEditingFaq({ ...editingFaq, question: e.target.value })}
                  className="rounded-xl h-10 text-xs font-bold"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Answer *</Label>
                <Textarea
                  rows={4}
                  value={editingFaq.answer}
                  onChange={(e) => setEditingFaq({ ...editingFaq, answer: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFaqModalOpen(false)}
                  className="rounded-full px-4 text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const currentFaqs = contactFaqsCms?.faqs || [];
                    const exists = currentFaqs.find((f) => f.id === editingFaq.id);
                    const updated = exists
                      ? currentFaqs.map((f) => (f.id === editingFaq.id ? editingFaq : f))
                      : [...currentFaqs, editingFaq];

                    setContactFaqsCms({ ...contactFaqsCms, faqs: updated });
                    setFaqModalOpen(false);
                    toast.success("FAQ updated in state. Click 'Save Contact & FAQs' to publish.");
                  }}
                  className="rounded-full px-5 text-xs font-bold bg-primary text-white"
                >
                  Apply FAQ
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

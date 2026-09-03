import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  CalendarDays,
  Clock,
  User,
  ArrowRight,
  Copy,
  Printer,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Flame,
  Ban,
  PhoneCall,
  Wind,
  Zap,
  ChevronDown,
  ChevronRight,
  CircleOff,
  Phone,
  BookOpen,
  Siren,
  Stethoscope,
  Activity,
  Eye,
  Check,
  ShieldCheck,
  AlertOctagon,
  HelpCircle,
  Radio,
  Sparkles,
  Users,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  getBlogPostBySlug,
  getRelatedBlogPosts,
  type BlogPost,
  type BlogSection,
} from "@/data/blog";
import { cn } from "@/lib/utils";

// High-resolution photographic assets for visual storytelling
import gasCylinderSafetyPhoto from "@/assets/gas-cylinder-safety-measures.jpg";
import safetySmellGasImg from "@/assets/safety_smell_gas_v3.jpg";
import safetyGasFireImg from "@/assets/safety_away_from_flames_v3.jpg";
import safetyGasValveImg from "@/assets/safety_gas_valve.jpg";
import guidanceInspectionImg from "@/assets/guidance_checks_servicing.jpg";
import safetyStorageHeatImg from "@/assets/safety_storage_v3.jpg";
import safetyCoAlarmImg from "@/assets/safety_co_alarm.jpg";
import safetyGasHobImg from "@/assets/safety_gas_hob.jpg";
import guidanceEmergencyHelpImg from "@/assets/guidance_emergency_help.jpg";
import safetyFireFlameImg from "@/assets/safety_fire_flame.jpg";
import safetyCylinderLeakVapourImg from "@/assets/safety_cylinder_leak_vapour.jpg";
import safetyKnobTurnImg from "@/assets/safety_knob_turn.jpg";
import safetySmellWindowWomanImg from "@/assets/safety_smell_window_woman.jpg";
import safetyLeakingCylinderValveImg from "@/assets/safety_leaking_cylinder_valve.jpg";
import safetyDamagedVsGoodCylinderImg from "@/assets/safety_damaged_vs_good_cylinder.png";

export const Route = createFileRoute("/blog/$slug")({
  head: ({ params }) => {
    const post = getBlogPostBySlug(params.slug);
    const title = "Gas Cylinder Safety & Emergency Guide | John Stayte Services";
    const description =
      "Expert UK gas emergency and cylinder safety guide. Clear visual steps for gas leaks, gas fires, leaking cylinders, damaged equipment, carbon monoxide, and decision making.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  notFoundComponent: () => (
    <SiteLayout>
      <div className="container-page py-24 text-center">
        <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
          <BookOpen className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 font-display">
          Safety Guide Not Found
        </h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
          The safety guide you requested could not be located. It may have been moved or updated.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild className="rounded-full">
            <Link to="/blog">Browse All Safety Guides</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    </SiteLayout>
  ),
  component: BlogPostPage,
});

const TABLE_OF_CONTENTS = [
  { id: "think-gas-leak", label: "1. Think You Have a Leak?" },
  { id: "gas-fire-action", label: "2. If Gas Caught Fire" },
  { id: "cylinder-leaking", label: "3. Cylinder Leaking?" },
  { id: "damaged-cylinder", label: "4. Damaged Cylinder" },
  { id: "cylinder-heat-exposure", label: "5. Exposed to Heat?" },
  { id: "carbon-monoxide-danger", label: "6. Carbon Monoxide" },
  { id: "appliance-warning-signs", label: "7. Unsafe Appliance Signs" },
  { id: "emergency-decision-flow", label: "8. Decision Flow Infographic" },
  { id: "emergency-numbers", label: "9. Emergency Contacts" },
];

function GeneralBlogPostView({
  post,
  onNewsletterSubmit,
  newsletterEmail,
  setNewsletterEmail,
  subscribing,
  subscribed,
}: {
  post: BlogPost;
  onNewsletterSubmit: (e: React.FormEvent) => Promise<void>;
  newsletterEmail: string;
  setNewsletterEmail: (val: string) => void;
  subscribing: boolean;
  subscribed: boolean;
}) {
  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <SiteLayout>
      <article className="bg-[#fcfdfe] min-h-screen">
        {/* Header Hero */}
        <header className="relative w-full border-b border-slate-200/80 pt-8 pb-10 sm:pt-10 sm:pb-12 lg:pt-12 lg:pb-16 bg-[#fcfdfe]">
          <div className="container-page max-w-5xl space-y-6 text-left">
            <Breadcrumb className="text-xs text-slate-500">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link
                      to="/"
                      className="text-slate-500 hover:text-primary transition-colors font-medium"
                    >
                      Home
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link
                      to="/blog"
                      className="text-slate-500 hover:text-primary transition-colors font-medium"
                    >
                      Knowledge Centre
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-slate-900 font-bold">{post.title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <div className="inline-flex items-center gap-2 rounded-full border border-red-200/90 bg-red-50/90 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.2em] text-red-600 shadow-2xs font-display">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span>{post.tag || post.category || "GUIDE"}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-black text-slate-900 tracking-tight leading-[1.1] font-display">
              {post.title}
            </h1>

            <p className="text-slate-600 text-base sm:text-lg leading-relaxed font-normal max-w-3xl">
              {post.excerpt}
            </p>

            <div className="pt-3 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200/80 text-xs text-slate-500 font-semibold">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />{" "}
                  {post.readingTime || "4 min read"}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-slate-400" /> {post.date}
                </span>
                <span>•</span>
                <span className="text-slate-700 font-bold">
                  {post.author?.name || "John Stayte Team"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="p-2.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer"
                  title="Copy Link"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="p-2.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer"
                  title="Print Article"
                >
                  <Printer className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Featured Image */}
            <div className="mt-6 rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm aspect-[16/9] w-full bg-slate-100">
              <img src={post.heroImage} alt={post.title} className="w-full h-full object-cover" />
            </div>
          </div>
        </header>

        {/* Content Body Stream */}
        <div className="container-page max-w-5xl py-12 space-y-12 text-left">
          {/* Quick Rules if available */}
          {post.quickRules && post.quickRules.length > 0 && (
            <div className="rounded-2xl border border-red-200 bg-red-50/50 p-6 sm:p-8 space-y-4">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 font-display">
                <ShieldCheck className="h-5 w-5 text-primary" /> Key Takeaways & Quick Rules
              </h3>
              <ul className="grid sm:grid-cols-2 gap-3 text-xs sm:text-sm text-slate-700 font-medium">
                {post.quickRules.map((rule: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Body Sections */}
          <div className="space-y-10">
            {post.sections && post.sections.length > 0 ? (
              post.sections.map((sec: BlogSection, idx: number) => (
                <section key={sec.id || idx} className="space-y-4">
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">
                    {sec.title}
                  </h2>
                  <div className="text-slate-600 leading-relaxed text-sm sm:text-base whitespace-pre-line font-normal">
                    {sec.content}
                  </div>
                  {sec.bullets && sec.bullets.length > 0 && (
                    <ul className="space-y-2 pt-2 text-sm text-slate-700">
                      {sec.bullets.map((b: string, bi: number) => (
                        <li key={bi} className="flex items-start gap-2.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-2" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))
            ) : (
              <div className="text-slate-600 leading-relaxed text-base whitespace-pre-line">
                {(post as any).content || post.summary || post.excerpt}
              </div>
            )}
          </div>

          {/* Action CTAs */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h4 className="text-lg font-black text-slate-900 font-display">
                Need Gas or Fuel Advice in Gloucestershire?
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Our certified team is on hand 6 days a week to help with products and deliveries.
              </p>
            </div>
            <Button
              asChild
              className="rounded-full px-6 bg-primary hover:bg-primary/90 text-white font-bold shrink-0"
            >
              <Link to="/contact">
                Speak to our team <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Stay Informed Newsletter */}
          <section className="rounded-[28px] border border-slate-200/90 bg-white p-8 text-center space-y-4 shadow-xs">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 font-display">
              Stay Informed with Safety & Energy News
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
              Get occasional safety updates and seasonal fuel guidance directly to your inbox.
            </p>
            <form
              onSubmit={onNewsletterSubmit}
              className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto pt-2"
            >
              <Input
                type="email"
                placeholder="Your email address"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                disabled={subscribing || subscribed}
                className="h-11 rounded-full text-xs sm:text-sm bg-white border-slate-200 px-5 shadow-2xs w-full"
                required
              />
              <Button
                type="submit"
                disabled={subscribing || subscribed}
                className="h-11 rounded-full px-6 text-xs font-black font-display bg-primary hover:bg-primary/90 text-white shrink-0 shadow-xs gap-1.5 w-full sm:w-auto"
              >
                {subscribing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : subscribed ? (
                  "Subscribed"
                ) : (
                  "Subscribe"
                )}
              </Button>
            </form>
          </section>
        </div>
      </article>
    </SiteLayout>
  );
}

function BlogPostPage() {
  const { slug } = Route.useParams();
  const [dbPost, setDbPost] = useState<any | null>(null);

  useEffect(() => {
    async function loadPost() {
      try {
        const [{ data: tablePost }, { data: blockData }] = await Promise.all([
          supabase.from("cms_blog_posts").select("*").eq("slug", slug).maybeSingle(),
          supabase
            .from("cms_content_blocks")
            .select("content")
            .eq("section_key", "blog_posts_data")
            .maybeSingle(),
        ]);

        if (tablePost) {
          setDbPost(tablePost);
          return;
        }

        if (blockData?.content) {
          try {
            const parsed = JSON.parse(blockData.content);
            if (Array.isArray(parsed)) {
              const found = parsed.find((p) => p.slug === slug);
              if (found) setDbPost(found);
            }
          } catch {}
        }
      } catch {}
    }
    loadPost();
  }, [slug]);

  const fallback = useMemo(() => getBlogPostBySlug(slug), [slug]);
  const post = useMemo(() => {
    if (dbPost && fallback) {
      return {
        ...fallback,
        title: dbPost.title || fallback.title,
        excerpt: dbPost.excerpt || fallback.excerpt,
        heroImage: dbPost.image_url || fallback.heroImage,
        content: dbPost.content || fallback.summary,
      };
    }
    if (dbPost && !fallback) {
      return {
        id: dbPost.id,
        slug: dbPost.slug,
        title: dbPost.title,
        date: dbPost.created_at || new Date().toISOString(),
        tag: dbPost.tag || "Safety Guide",
        category: dbPost.category || "Safety",
        readingTime: dbPost.reading_time || "4 min read",
        author: {
          name: dbPost.author_name || "John Stayte Safety Team",
          role: dbPost.author_role || "LPG Specialists",
        },
        excerpt: dbPost.excerpt || "",
        heroImage: dbPost.image_url || gasCylinderSafetyPhoto,
        summary: dbPost.excerpt || "",
        quickRules: [
          "Always keep cylinders stored upright on a level surface",
          "Ensure adequate natural ventilation in all storage areas",
          "Keep away from sources of ignition, electrical sparks and flames",
          "Inspect connections and flexible hoses regularly for wear",
        ],
        sections: [
          {
            id: "main-content",
            title: "Article Overview",
            content: dbPost.content || dbPost.excerpt || "",
          },
        ],
      } as BlogPost;
    }
    return fallback;
  }, [slug, dbPost, fallback]);

  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState<string>("think-gas-leak");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Newsletter state
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newsletterEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setSubscribing(true);
    try {
      try {
        await supabase.from("newsletter_subscribers").insert({
          email: cleanEmail,
          source: "safety_guide",
          status: "subscribed",
        });
      } catch {}

      try {
        const { data: block } = await supabase
          .from("cms_content_blocks")
          .select("content")
          .eq("section_key", "newsletter_subscribers_data")
          .maybeSingle();

        let list = [];
        if (block?.content) {
          try {
            list = JSON.parse(block.content);
          } catch {
            list = [];
          }
        }
        if (!list.some((item: any) => item.email === cleanEmail)) {
          const updated = [
            ...list,
            { email: cleanEmail, source: "safety_guide", subscribed_at: new Date().toISOString() },
          ];
          await supabase.from("cms_content_blocks").upsert(
            {
              section_key: "newsletter_subscribers_data",
              title: "Newsletter Subscribers List",
              content: JSON.stringify(updated),
            },
            { onConflict: "section_key" },
          );
        }
      } catch {}

      setSubscribed(true);
      toast.success("Thank you for subscribing!", {
        description: "You will receive our latest gas safety updates and energy advice.",
      });
      setNewsletterEmail("");
    } catch {
      setSubscribed(true);
      toast.success("Thank you for subscribing!");
      setNewsletterEmail("");
    } finally {
      setSubscribing(false);
    }
  };

  // Track scroll progress and active section anchor
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollTop;
      const windowHeight =
        document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (windowHeight > 0) {
        const scrollPercent = (totalScroll / windowHeight) * 100;
        setScrollProgress(Math.min(100, Math.max(0, scrollPercent)));
      }

      for (const item of [...TABLE_OF_CONTENTS].reverse()) {
        const el = document.getElementById(item.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 200) {
            setActiveSection(item.id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!post) {
    throw notFound();
  }

  // If viewing any article other than the dedicated safe-cylinder-storage template, render GeneralBlogPostView
  if (slug !== "safe-cylinder-storage") {
    return (
      <GeneralBlogPostView
        post={post}
        onNewsletterSubmit={handleNewsletterSubmit}
        newsletterEmail={newsletterEmail}
        setNewsletterEmail={setNewsletterEmail}
        subscribing={subscribing}
        subscribed={subscribed}
      />
    );
  }

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!", {
        description: "You can now share this emergency safety guide.",
      });
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      setMobileMenuOpen(false);
    }
  };

  return (
    <SiteLayout>
      {/* Top Scroll Reading Progress Bar */}
      <div
        className="fixed top-0 left-0 h-1.5 bg-primary z-50 transition-all duration-150 ease-out"
        style={{ width: `${scrollProgress}%` }}
      />

      <article className="bg-slate-50/50">
        {/* =========================================================================
            1. HERO — EDITORIAL SAFETY & EMERGENCY GUIDE
        ========================================================================= */}
        {/* =========================================================================
            1. HERO — CLEAN EDITORIAL TWO-COLUMN SAFETY HERO (Light Background)
        ========================================================================= */}
        <header className="relative w-full bg-[#fcfdfe] border-b border-slate-200/80 overflow-hidden pt-8 pb-10 sm:pt-10 sm:pb-12 lg:pt-12 lg:pb-16">
          {/* Subtle Ambient Red Glow */}
          <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-red-500/[0.03] rounded-full blur-3xl pointer-events-none z-0" />

          <div className="container-page max-w-[88rem] relative z-10">
            <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-14 items-center">
              {/* Left Column: Content (approx 45% desktop width) */}
              <div className="lg:col-span-5 xl:col-span-5 space-y-5 sm:space-y-6 text-left">
                {/* Breadcrumbs */}
                <Breadcrumb className="text-xs text-slate-500">
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Link
                          to="/"
                          className="text-slate-500 hover:text-primary transition-colors font-medium"
                        >
                          Home
                        </Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Link
                          to="/blog"
                          className="text-slate-500 hover:text-primary transition-colors font-medium"
                        >
                          Knowledge Centre
                        </Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage className="text-slate-900 font-bold">
                        Safety Guide
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>

                {/* Eyebrow Badge */}
                <div className="inline-flex items-center gap-2 rounded-full border border-red-200/90 bg-red-50/90 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.2em] text-red-600 shadow-2xs font-display">
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span>SAFETY &amp; EMERGENCY</span>
                </div>

                {/* Large Premium Heading */}
                <h1 className="text-3xl sm:text-4xl lg:text-[44px] xl:text-[50px] font-black text-slate-900 tracking-tight leading-[1.08] font-display">
                  Gas Safety &amp; <span className="text-primary">Emergency Guide</span>
                </h1>

                {/* Short Description */}
                <p className="text-slate-600 text-base sm:text-lg leading-relaxed font-normal max-w-xl">
                  Clear, practical steps for gas leaks, gas fires, cylinder problems and other LPG
                  emergencies.
                </p>

                {/* Topic Pills (Hidden on mobile, visible on tablet/desktop) */}
                <div className="hidden sm:flex flex-wrap items-center gap-2 pt-0.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200/80 text-slate-700 text-xs font-bold font-display">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Gas Leak
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200/80 text-slate-700 text-xs font-bold font-display">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Gas Fire
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200/80 text-slate-700 text-xs font-bold font-display">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Cylinder Emergency
                  </span>
                </div>

                {/* Primary Red CTA & Action Buttons */}
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => scrollToSection("think-gas-leak")}
                    className="px-7 py-3.5 rounded-full bg-primary hover:bg-primary/90 text-white font-extrabold text-xs sm:text-sm shadow-[0_4px_16px_rgba(220,38,38,0.25)] hover:shadow-[0_6px_24px_rgba(220,38,38,0.35)] hover:-translate-y-0.5 transition-all cursor-pointer inline-flex items-center gap-2.5 group font-display"
                  >
                    <span>View Emergency Steps</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="p-3.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer"
                    title="Copy Link"
                    aria-label="Copy Link"
                  >
                    <Copy className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="p-3.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer"
                    title="Print Guide"
                    aria-label="Print Guide"
                  >
                    <Printer className="h-4 w-4" />
                  </button>
                </div>

                {/* Subtle Metadata Row Below */}
                <div className="pt-5 border-t border-slate-200/80 flex flex-wrap items-center gap-3 text-xs text-slate-500 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" /> 5 min emergency read
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-slate-400" /> 14 Jun 2026
                  </span>
                  <span>•</span>
                  <span className="text-slate-700 font-bold">John Stayte Safety Team</span>
                </div>
              </div>

              {/* Right Column: Hero Image (approx 55% desktop width) */}
              <div className="lg:col-span-7 xl:col-span-7">
                {/* Sharp Rectangular Image Container - Clean Photographic Visual Only */}
                <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] lg:aspect-[16/11] overflow-hidden bg-slate-100 border border-slate-200/80 shadow-sm">
                  <img
                    src={gasCylinderSafetyPhoto}
                    alt="UK Calor gas cylinder safety equipment in home setting"
                    className="w-full h-full object-cover object-center"
                    loading="eager"
                  />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Sticky Navigation Selector */}
        <div className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-xs">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-black text-slate-900 font-display cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              On This Page: {TABLE_OF_CONTENTS.find((t) => t.id === activeSection)?.label || "Menu"}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-slate-500 transition-transform",
                mobileMenuOpen && "rotate-180",
              )}
            />
          </button>
          {mobileMenuOpen && (
            <div className="mt-2 p-2 bg-white rounded-2xl border border-slate-200 shadow-xl space-y-1 max-h-80 overflow-y-auto">
              {TABLE_OF_CONTENTS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  className={cn(
                    "w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer",
                    activeSection === item.id
                      ? "bg-red-50 text-primary font-black"
                      : "text-slate-700 hover:bg-slate-100",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main Editorial Container */}
        <div className="container-page max-w-[88rem] pt-10 sm:pt-14 pb-8 sm:pb-12">
          <div className="grid gap-12 lg:grid-cols-[1fr_300px] lg:items-start">
            {/* Main Editorial Stream with High Vertical Spacing */}
            <main className="space-y-20 lg:space-y-28 min-w-0 text-left">
              {/* =========================================================================
                  SECTION 1 — GAS LEAK (Editorial Split Layout with 3 Stacked Images)
              ========================================================================= */}
              <section id="think-gas-leak" className="scroll-mt-28 space-y-6 sm:space-y-8">
                {/* On mobile: standard vertical flow (Header -> 3 Images -> 5 Cards)
                    On desktop (lg): 12-col grid with 3 images on left (col 1-5, spanning rows 1-2)
                    and Header (col 6-12, row 1) + 5 Cards (col 6-12, row 2) on right */}
                <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:gap-x-10 lg:gap-y-6 lg:items-start">
                  {/* 1. Header Block: Label + Heading + Description (First on Mobile, Top-Right on Desktop) */}
                  <div className="space-y-2 text-left lg:col-start-6 lg:col-span-7 lg:row-start-1">
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-1.5 font-display">
                      <AlertOctagon className="h-4 w-4 text-primary" /> IMMEDIATE ACTION
                    </span>
                    <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-slate-900 tracking-tight leading-tight font-display">
                      Think You Have a Gas Leak?
                    </h2>
                    <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
                      If you detect the distinctive smell of gas, hear a hissing noise, or feel
                      unwell near an appliance, follow this strict 5-step emergency sequence
                      immediately.
                    </p>
                  </div>

                  {/* 2. 3 Images Block (Second on Mobile, Left Column on Desktop spanning full height) */}
                  <div className="flex flex-col justify-between gap-3.5 sm:gap-4 lg:col-start-1 lg:col-span-5 lg:row-start-1 lg:row-span-2 lg:h-full">
                    {/* Image 1: Aligned with Cards 01-02 (Stove, open window & gas cylinder) */}
                    <div className="relative aspect-[16/9] sm:aspect-[16/10] lg:aspect-auto lg:flex-1 min-h-[160px] sm:min-h-[180px] lg:min-h-[190px] w-full rounded-2xl overflow-hidden bg-slate-100 shadow-2xs border border-slate-200/80">
                      <img
                        src={safetySmellGasImg}
                        alt="Domestic gas cooker hob with open window ventilation"
                        className="w-full h-full object-cover object-center"
                        loading="lazy"
                      />
                    </div>

                    {/* Image 2: Aligned with Cards 03-04 (Isolation valve & regulator) */}
                    <div className="relative aspect-[16/9] sm:aspect-[16/10] lg:aspect-auto lg:flex-1 min-h-[160px] sm:min-h-[180px] lg:min-h-[190px] w-full rounded-2xl overflow-hidden bg-slate-100 shadow-2xs border border-slate-200/80">
                      <img
                        src={safetyGasValveImg}
                        alt="Brass gas isolation valve and appliance pipework"
                        className="w-full h-full object-cover object-center"
                        loading="lazy"
                      />
                    </div>

                    {/* Image 3: Woman opening kitchen window due to gas smell */}
                    <div className="relative aspect-[16/9] sm:aspect-[16/10] lg:aspect-auto lg:flex-1 min-h-[160px] sm:min-h-[180px] lg:min-h-[190px] w-full rounded-2xl overflow-hidden bg-slate-100 shadow-2xs border border-slate-200/80">
                      <img
                        src={safetySmellWindowWomanImg}
                        alt="Woman opening window to ventilate gas fumes in kitchen with Calor gas cylinder"
                        className="w-full h-full object-cover object-center"
                        loading="lazy"
                      />
                    </div>
                  </div>

                  {/* 3. 5 Cards Block (Third on Mobile, Bottom-Right on Desktop) */}
                  <div className="space-y-3 pt-1 text-left lg:col-start-6 lg:col-span-7 lg:row-start-2">
                    {[
                      {
                        num: "01",
                        title: "Stop ignition sources",
                        desc: "No naked flames, cigarettes, matches, or lighters. Do not touch any electrical switches, power sockets, doorbells, or mobile phones.",
                        icon: Ban,
                      },
                      {
                        num: "02",
                        title: "If safe, isolate the supply",
                        desc: "Turn off the cylinder handwheel valve clockwise or switch the clip-on regulator to OFF. If gas is dense, skip directly to evacuation.",
                        icon: CircleOff,
                      },
                      {
                        num: "03",
                        title: "Open doors & windows if safe",
                        desc: "Allow fresh outdoor air to dilute the vapour on your immediate way out without lingering.",
                        icon: Wind,
                      },
                      {
                        num: "04",
                        title: "Get everyone outside",
                        desc: "Evacuate all occupants and pets into fresh open air well away from the building.",
                        icon: Users,
                      },
                      {
                        num: "05",
                        title: "Call for help from a safe location",
                        desc: "From an outdoor safe distance, call John Stayte Support on 01452 741234 or dial 999 for emergency services.",
                        icon: PhoneCall,
                      },
                    ].map((step) => {
                      const IconC = step.icon;
                      return (
                        <div
                          key={step.num}
                          className="flex items-start gap-4 p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-primary/40 hover:shadow-xs transition-all text-left group"
                        >
                          <span className="h-9 w-9 rounded-xl bg-red-100 text-primary font-black font-display text-sm flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                            {step.num}
                          </span>
                          <div className="space-y-1">
                            <h3 className="font-black text-base sm:text-lg text-slate-900 font-display flex items-center gap-2">
                              <span>{step.title}</span>
                              <IconC className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                              {step.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* =========================================================================
                  SECTION 2 — GAS FIRE (Major Emergency Split Layout with 3 Stacked Images)
              ========================================================================= */}
              <section id="gas-fire-action" className="scroll-mt-28 space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-10 items-stretch">
                  {/* Left Column: 3-Image Vertical Stack */}
                  <div className="lg:col-span-5 flex flex-col justify-between gap-3.5 sm:gap-4">
                    {/* Image 1: Gas stove with visible flame */}
                    <div className="relative aspect-[16/9] sm:aspect-[16/10] lg:aspect-auto lg:flex-1 min-h-[140px] sm:min-h-[160px] lg:min-h-[175px] w-full rounded-2xl overflow-hidden bg-slate-100 shadow-2xs border border-slate-200/80">
                      <img
                        src={safetyFireFlameImg}
                        alt="Gas stove burner with open high flame"
                        className="w-full h-full object-cover object-center"
                        loading="lazy"
                      />
                    </div>

                    {/* Image 2: Red LPG cylinder with gas/vapour leak */}
                    <div className="relative aspect-[16/9] sm:aspect-[16/10] lg:aspect-auto lg:flex-1 min-h-[140px] sm:min-h-[160px] lg:min-h-[175px] w-full rounded-2xl overflow-hidden bg-slate-100 shadow-2xs border border-slate-200/80">
                      <img
                        src={safetyCylinderLeakVapourImg}
                        alt="Red LPG cylinder valve emitting pressurized gas vapour leak"
                        className="w-full h-full object-cover object-center"
                        loading="lazy"
                      />
                    </div>

                    {/* Image 3: Close-up of stove control knob / hand turning the knob */}
                    <div className="relative aspect-[16/9] sm:aspect-[16/10] lg:aspect-auto lg:flex-1 min-h-[140px] sm:min-h-[160px] lg:min-h-[175px] w-full rounded-2xl overflow-hidden bg-slate-100 shadow-2xs border border-slate-200/80">
                      <img
                        src={safetyKnobTurnImg}
                        alt="Hand turning stainless steel gas appliance control knob"
                        className="w-full h-full object-cover object-center"
                        loading="lazy"
                      />
                    </div>
                  </div>

                  {/* Right: Red-Tinted Emergency Panel (Completely Unchanged) */}
                  <div className="lg:col-span-7 rounded-[28px] border-2 border-red-200 bg-red-50/50 p-6 sm:p-8 lg:p-10 space-y-6 shadow-xs flex flex-col justify-between">
                    <div className="space-y-3">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600 text-white font-black text-[11px] uppercase tracking-[0.2em] font-display shadow-2xs">
                        <Siren className="h-3.5 w-3.5" /> CRITICAL EMERGENCY
                      </span>
                      <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-display">
                        If Gas Has Caught Fire
                      </h2>
                      <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-medium">
                        Never fight a gas cylinder fire yourself. Gas escaping under high pressure
                        creates extreme thermal radiation and risk of explosion.
                      </p>
                    </div>

                    {/* Prominent Emergency Warnings */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="p-4 rounded-2xl bg-white border border-red-200/90 shadow-2xs space-y-1.5 text-left">
                        <div className="flex items-center gap-2 text-red-700 font-black text-sm font-display">
                          <Ban className="h-4 w-4 shrink-0" /> DO NOT APPROACH
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Do not approach a burning cylinder or any equipment subjected to radiant
                          heat.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white border border-red-200/90 shadow-2xs space-y-1.5 text-left">
                        <div className="flex items-center gap-2 text-red-700 font-black text-sm font-display">
                          <Ban className="h-4 w-4 shrink-0" /> DO NOT MOVE CYLINDER
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Never carry or drag a heated or burning gas bottle. High pressure weakens
                          hot metal.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white border border-red-200/90 shadow-2xs space-y-1.5 text-left">
                        <div className="flex items-center gap-2 text-emerald-800 font-black text-sm font-display">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> EVACUATE
                          THE AREA
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Move all people and animals outdoors immediately behind solid masonry
                          cover.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white border border-red-200/90 shadow-2xs space-y-1.5 text-left">
                        <div className="flex items-center gap-2 text-red-700 font-black text-sm font-display">
                          <PhoneCall className="h-4 w-4 shrink-0" /> CALL 999 FROM DISTANCE
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Inform the 999 operator that pressurized LPG cylinders are present on
                          site.
                        </p>
                      </div>
                    </div>

                    {/* Immediate Dispatch Action Bar */}
                    <div className="pt-4 border-t border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="text-xs text-slate-700 font-bold">
                        <span>Stay clear until declared safe by Fire Service.</span>
                      </div>
                      <a
                        href="tel:999"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-black text-sm shadow-xs transition-all shrink-0 font-display"
                      >
                        <PhoneCall className="h-4 w-4" /> DIAL 999 IMMEDIATELY
                      </a>
                    </div>
                  </div>
                </div>
              </section>

              {/* =========================================================================
                  SECTION 3 — LEAKING CYLINDER (Wide Split Section)
              ========================================================================= */}
              <section id="cylinder-leaking" className="scroll-mt-28 space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
                  {/* Left: Leaking LPG Cylinder Image (Clean Standalone Visual) */}
                  <div className="lg:col-span-5 relative aspect-[4/3] sm:aspect-[16/11] lg:aspect-square w-full rounded-[28px] overflow-hidden bg-slate-100 shadow-sm border border-slate-200/80">
                    <img
                      src={safetyLeakingCylinderValveImg}
                      alt="Red LPG cylinder with visible gas vapour leak escaping from the valve connection"
                      className="w-full h-full object-cover object-center hover:scale-103 transition-transform duration-700"
                      loading="lazy"
                    />
                  </div>

                  {/* Right: 4-Step Process & Strong DIY Warning */}
                  <div className="lg:col-span-7 space-y-6 text-left">
                    <div className="space-y-2">
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-1.5 font-display">
                        <Wind className="h-4 w-4 text-primary" /> VALVE &amp; HOSE LEAKS
                      </span>
                      <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-slate-900 tracking-tight leading-tight font-display">
                        Cylinder Leaking?
                      </h2>
                      <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
                        If a cylinder is hissing or leaking gas around the valve, neck spindle, or
                        regulator connection:
                      </p>
                    </div>

                    {/* 4-Step Process Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {[
                        {
                          num: "1",
                          title: "Recognise",
                          desc: "Smell gas, hear hissing, or see bubbles with soapy water leak test solution.",
                        },
                        {
                          num: "2",
                          title: "Isolate if safe",
                          desc: "Close the cylinder handwheel firmly clockwise or flip the regulator switch to OFF.",
                        },
                        {
                          num: "3",
                          title: "Move to safety",
                          desc: "Move the leaking cylinder outdoors to a well-ventilated area, 10m clear of drains.",
                        },
                        {
                          num: "4",
                          title: "Get professional help",
                          desc: "Contact John Stayte Support on 01452 741234 for safe on-site cylinder recovery.",
                        },
                      ].map((item) => (
                        <div
                          key={item.num}
                          className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1.5"
                        >
                          <span className="text-xs font-black text-primary font-display">
                            Step {item.num}
                          </span>
                          <h3 className="font-black text-base text-slate-900 font-display">
                            {item.title}
                          </h3>
                          <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                        </div>
                      ))}
                    </div>

                    {/* Strong Warning Banner */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-start gap-3.5 text-xs sm:text-sm text-amber-950">
                      <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="leading-relaxed font-medium">
                        <strong className="font-black text-amber-950 font-display uppercase tracking-wide">
                          Safety Warning:{" "}
                        </strong>
                        Never attempt to repair, dismantle, or force a leaking cylinder, valve
                        spindle, pressure regulator, or hose yourself.
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* =========================================================================
                  SECTION 4 — DAMAGED CYLINDER (Split Inspection Card + Stop Banner)
              ========================================================================= */}
              <section id="damaged-cylinder" className="scroll-mt-28 space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
                  {/* Left: Damaged vs Good Cylinder Comparison Image (Fully Contained & Visible) */}
                  <div className="lg:col-span-5 w-full">
                    <div className="relative aspect-[626/664] w-full max-w-[420px] sm:max-w-[480px] lg:max-w-none mx-auto rounded-2xl sm:rounded-[28px] overflow-hidden bg-stone-100/80 shadow-sm border border-slate-200/80 flex items-center justify-center">
                      <img
                        src={safetyDamagedVsGoodCylinderImg}
                        alt="Visual safety comparison showing a severely dented rejected gas cylinder with red cross versus a certified safe cylinder with green checkmark"
                        className="w-full h-full object-contain object-center"
                        loading="lazy"
                      />
                    </div>
                  </div>

                  {/* Right: Defect Indicators & STOP Banner */}
                  <div className="lg:col-span-7 space-y-6 text-left">
                    <div className="space-y-2">
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-1.5 font-display">
                        <CircleOff className="h-4 w-4 text-primary" /> DEFECT CRITERIA
                      </span>
                      <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-slate-900 tracking-tight leading-tight font-display">
                        Do Not Use a Damaged Cylinder
                      </h2>
                      <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
                        Damaged cylinders can fail catastrophically under internal pressure. Inspect
                        every cylinder for these critical red-flag defects:
                      </p>
                    </div>

                    {/* 6 Defect Chips Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                      {[
                        "Deep dents & creases",
                        "Severe corrosion & rust",
                        "Burn or heat marks",
                        "Damaged valve spindle",
                        "Visible leaks / hissing",
                        "Collar / foot ring distortion",
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-800 font-bold flex items-center gap-2"
                        >
                          <span className="h-2 w-2 rounded-full bg-red-600 shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>

                    {/* STOP — DO NOT USE Visual Banner */}
                    <div className="p-5 sm:p-6 rounded-[24px] bg-red-600 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-white text-red-600 flex items-center justify-center font-black text-xl shrink-0 shadow-xs font-display">
                          STOP
                        </div>
                        <div className="space-y-0.5">
                          <h3 className="font-black text-base sm:text-lg tracking-tight font-display">
                            STOP — DO NOT USE DAMAGED EQUIPMENT
                          </h3>
                          <p className="text-xs text-red-100">
                            Isolate the cylinder outdoors and contact John Stayte Services for safe
                            exchange.
                          </p>
                        </div>
                      </div>
                      <a
                        href="tel:01452741234"
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white text-slate-900 hover:bg-slate-100 font-black text-xs shadow-xs transition-all shrink-0 font-display"
                      >
                        <Phone className="h-3.5 w-3.5 text-primary" /> Report Defect
                      </a>
                    </div>
                  </div>
                </div>
              </section>

              {/* =========================================================================
                  SECTION 5 — HOT CYLINDER / HEAT EXPOSURE (Horizontal Visual Card)
              ========================================================================= */}
              <section id="cylinder-heat-exposure" className="scroll-mt-28 space-y-8">
                <div className="rounded-[32px] border border-amber-200/90 bg-amber-50/40 p-6 sm:p-8 lg:p-10 shadow-xs">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    <div className="lg:col-span-5 relative aspect-[16/10] sm:aspect-[16/11] lg:aspect-auto h-full min-h-[260px] rounded-[24px] overflow-hidden bg-slate-100 border border-amber-200/80 shadow-2xs">
                      <img
                        src={safetyStorageHeatImg}
                        alt="LPG gas cylinders in storage cage exposed to radiant fire and intense heat"
                        className="w-full h-full object-cover object-center"
                        loading="lazy"
                      />
                    </div>

                    <div className="lg:col-span-7 space-y-5 text-left">
                      <div className="space-y-2">
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-amber-800 flex items-center gap-1.5 font-display">
                          <AlertTriangle className="h-4 w-4 text-amber-700" /> THERMAL OVERPRESSURE
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-display">
                          Cylinder Exposed to Heat?
                        </h2>
                        <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                          When an LPG bottle is subjected to direct fire or intense radiant heat,
                          internal pressure rises exponentially.
                        </p>
                      </div>

                      <div className="space-y-2.5 text-xs sm:text-sm text-slate-800 font-medium">
                        <div className="flex items-start gap-2.5 p-3 bg-white rounded-xl border border-amber-200/70">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>
                            <strong>Move people away immediately:</strong> Keep a safe perimeter of
                            at least 50–100 metres behind cover.
                          </span>
                        </div>
                        <div className="flex items-start gap-2.5 p-3 bg-white rounded-xl border border-amber-200/70">
                          <Ban className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                          <span>
                            <strong>Do not touch or move the cylinder:</strong> Structural integrity
                            is compromised when steel is heated.
                          </span>
                        </div>
                        <div className="flex items-start gap-2.5 p-3 bg-white rounded-xl border border-amber-200/70">
                          <PhoneCall className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span>
                            <strong>Call 999 if immediate danger exists:</strong> State clearly that
                            heated LPG cylinders are involved.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* =========================================================================
                  SECTION 6 — CARBON MONOXIDE (Editorial Magazine Layout)
              ========================================================================= */}
              <section id="carbon-monoxide-danger" className="scroll-mt-28 space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
                  {/* Left: Modern Home CO Detector Image */}
                  <div className="lg:col-span-5 relative aspect-[4/3] sm:aspect-[16/11] lg:aspect-square w-full rounded-[28px] overflow-hidden bg-slate-100 shadow-sm border border-slate-200/80">
                    <img
                      src={safetyCoAlarmImg}
                      alt="Digital carbon monoxide detector installed in UK home"
                      className="w-full h-full object-cover object-center hover:scale-103 transition-transform duration-700"
                    />
                    <div className="absolute top-4 left-4 p-2.5 rounded-xl bg-white/90 backdrop-blur-md text-slate-900 text-xs font-black font-display shadow-xs border border-slate-200/80">
                      BS EN 50291 Audible Detector
                    </div>
                  </div>

                  {/* Right: The Silent Danger & Clean Symptom Icons */}
                  <div className="lg:col-span-7 space-y-6 text-left">
                    <div className="space-y-2">
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-1.5 font-display">
                        <Stethoscope className="h-4 w-4 text-primary" /> SILENT TOXIC GAS
                      </span>
                      <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-slate-900 tracking-tight leading-tight font-display">
                        Carbon Monoxide — The Silent Danger
                      </h2>
                      <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
                        Carbon Monoxide (CO) has no smell, taste, or colour. It starves the body of
                        oxygen without warning.
                      </p>
                    </div>

                    {/* Symptoms Icon Row */}
                    <div className="space-y-2">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-900 font-display">
                        Warning Symptoms to Recognise:
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {[
                          { label: "Headache", sub: "Tension band" },
                          { label: "Dizziness", sub: "Lightheaded" },
                          { label: "Nausea", sub: "Sickness" },
                          { label: "Weakness", sub: "Muscle fatigue" },
                          { label: "Confusion", sub: "Disoriented" },
                          { label: "Breathlessness", sub: "Short of breath" },
                        ].map((sym, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-left space-y-0.5"
                          >
                            <strong className="block text-xs font-black text-slate-900 font-display">
                              {sym.label}
                            </strong>
                            <span className="text-[11px] text-slate-500 font-medium">
                              {sym.sub}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Panel: GET INTO FRESH AIR */}
                    <div className="p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 space-y-2 text-amber-950">
                      <h3 className="font-black text-base text-amber-950 font-display flex items-center gap-2">
                        <Wind className="h-5 w-5 text-amber-700" /> GET INTO FRESH AIR IMMEDIATELY
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                        If you suspect CO poisoning, leave the building into fresh outdoor air right
                        away, seek emergency medical care (dial 999 or 111), and do not re-enter
                        until approved by specialists.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* =========================================================================
                  SECTION 7 — UNSAFE APPLIANCE (Large Image + Diagnostics)
              ========================================================================= */}
              <section id="appliance-warning-signs" className="scroll-mt-28 space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
                  {/* Left: Gas Hob Flame Diagnostic Image */}
                  <div className="lg:col-span-5 relative aspect-[4/3] sm:aspect-[16/11] lg:aspect-square w-full rounded-[28px] overflow-hidden bg-slate-100 shadow-sm border border-slate-200/80">
                    <img
                      src={safetyGasHobImg}
                      alt="Domestic gas hob showing proper blue burner flame"
                      className="w-full h-full object-cover object-center hover:scale-103 transition-transform duration-700"
                    />
                    <div className="absolute bottom-4 left-4 right-4 p-3 rounded-2xl bg-slate-950/80 backdrop-blur-md text-white text-xs border border-white/10 flex items-center gap-2">
                      <Flame className="h-4 w-4 text-blue-400 shrink-0" />
                      <span>Proper combustion should produce a crisp, steady blue flame.</span>
                    </div>
                  </div>

                  {/* Right: Know the Warning Signs */}
                  <div className="lg:col-span-7 space-y-6 text-left">
                    <div className="space-y-2">
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-1.5 font-display">
                        <Flame className="h-4 w-4 text-primary" /> APPLIANCE SAFETY
                      </span>
                      <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-slate-900 tracking-tight leading-tight font-display">
                        Know the Warning Signs
                      </h2>
                      <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
                        Never continue using a faulty appliance. Watch for these hazardous
                        operational indicators:
                      </p>
                    </div>

                    {/* 6 Visual Indicators Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {[
                        {
                          title: "Unusual Flame",
                          desc: "Lazy yellow or floppy orange flame instead of crisp blue.",
                        },
                        {
                          title: "Soot & Staining",
                          desc: "Dark black marks forming on or above the appliance.",
                        },
                        {
                          title: "Pilot Outages",
                          desc: "Pilot light repeatedly goes out or pops when lighting.",
                        },
                        {
                          title: "Unusual Smell",
                          desc: "Acrid, burning, or pungent smell while running.",
                        },
                        {
                          title: "Unusual Noises",
                          desc: "Loud popping, roaring, or hissing sounds.",
                        },
                        {
                          title: "Heavy Condensation",
                          desc: "Excessive moisture building on room windows.",
                        },
                      ].map((sign, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1"
                        >
                          <strong className="block font-black text-slate-900 text-xs font-display">
                            ⚠️ {sign.title}
                          </strong>
                          <span className="text-slate-600 leading-relaxed">{sign.desc}</span>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-4 text-xs font-bold text-slate-800">
                      <span>Turn off unsafe appliances &amp; book a Gas Safe inspection.</span>
                      <a
                        href="tel:01452741234"
                        className="text-primary hover:underline font-display shrink-0"
                      >
                        01452 741234 →
                      </a>
                    </div>
                  </div>
                </div>
              </section>

              {/* =========================================================================
                  SECTION 8 — EMERGENCY DECISION FLOW INFOGRAPHIC
              ========================================================================= */}
              <section id="emergency-decision-flow" className="scroll-mt-28 space-y-6 sm:space-y-8">
                {/* Header */}
                <div className="space-y-2 text-left">
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-1.5 font-display">
                    <HelpCircle className="h-4 w-4 text-primary" /> DECISION INFOGRAPHIC
                  </span>
                  <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-slate-900 tracking-tight leading-tight font-display">
                    What Should I Do? —{" "}
                    <span className="text-primary">Emergency Decision Flow</span>
                  </h2>
                  <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
                    Follow the visual flowchart below to immediately identify the safest course of
                    action.
                  </p>
                </div>

                {/* Main Visual Decision Flow Container */}
                <div className="rounded-[28px] sm:rounded-[32px] border border-slate-200/90 bg-white p-5 sm:p-7 lg:p-9 shadow-xs space-y-8 text-left">
                  {/* Part 1: Core Emergency Sequence (Connected Nodes) */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500 font-display">
                        <span className="h-2 w-2 rounded-full bg-primary" />
                        <span>Core Emergency Sequence</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-400 font-display hidden sm:inline-block">
                        Sequential 5-Step Action
                      </span>
                    </div>

                    {/* Step Nodes Container: Grid on desktop with connecting indicators, vertical stack on mobile */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4 relative">
                      {[
                        {
                          step: "01",
                          title: "SMELL GAS?",
                          subtitle: "Initial hazard detected",
                          icon: AlertOctagon,
                          theme: "primary", // Red accent
                        },
                        {
                          step: "02",
                          title: "AVOID IGNITION",
                          subtitle: "No switches or flames",
                          icon: Ban,
                          theme: "neutral",
                        },
                        {
                          step: "03",
                          title: "ISOLATE SUPPLY",
                          subtitle: "Close valve if safe",
                          icon: CircleOff,
                          theme: "neutral",
                        },
                        {
                          step: "04",
                          title: "MOVE OUTSIDE",
                          subtitle: "Evacuate into fresh air",
                          icon: Wind,
                          theme: "neutral",
                        },
                        {
                          step: "05",
                          title: "CALL FOR HELP",
                          subtitle: "01452 741234 or 999",
                          icon: PhoneCall,
                          theme: "primary", // Red accent
                        },
                      ].map((node, index, arr) => {
                        const IconC = node.icon;
                        const isPrimary = node.theme === "primary";

                        return (
                          <div key={node.step} className="relative flex flex-col">
                            {/* Card Node */}
                            <div
                              className={cn(
                                "p-4 sm:p-4.5 rounded-2xl border transition-all relative z-10 flex flex-col justify-between h-full group",
                                isPrimary
                                  ? "bg-gradient-to-b from-red-600 to-red-700 border-red-600 text-white shadow-xs hover:shadow-md hover:to-red-800"
                                  : "bg-slate-50/80 hover:bg-white border-slate-200/90 text-slate-900 shadow-2xs hover:border-slate-300 hover:shadow-xs",
                              )}
                            >
                              <div className="flex items-center justify-between gap-2 mb-3">
                                <span
                                  className={cn(
                                    "px-2.5 py-0.5 rounded-md text-[10px] font-black font-display tracking-wider",
                                    isPrimary
                                      ? "bg-white/20 text-white"
                                      : "bg-slate-200/80 text-slate-700",
                                  )}
                                >
                                  STEP {node.step}
                                </span>
                                <div
                                  className={cn(
                                    "h-7 w-7 rounded-lg flex items-center justify-center shrink-0",
                                    isPrimary
                                      ? "bg-white/15 text-white"
                                      : "bg-white border border-slate-200/80 text-slate-700 shadow-2xs",
                                  )}
                                >
                                  <IconC className="h-3.5 w-3.5" />
                                </div>
                              </div>

                              <div className="space-y-0.5">
                                <h3
                                  className={cn(
                                    "font-black text-xs sm:text-[13px] tracking-tight font-display",
                                    isPrimary ? "text-white" : "text-slate-900",
                                  )}
                                >
                                  {node.title}
                                </h3>
                                <p
                                  className={cn(
                                    "text-[11px] leading-tight font-medium",
                                    isPrimary ? "text-red-100" : "text-slate-500",
                                  )}
                                >
                                  {node.subtitle}
                                </p>
                              </div>
                            </div>

                            {/* Arrow Connector between steps: Horizontal for desktop, Vertical for mobile */}
                            {index < arr.length - 1 && (
                              <>
                                {/* Desktop horizontal connector */}
                                <div className="hidden lg:flex absolute -right-2.5 top-1/2 -translate-y-1/2 z-20 items-center justify-center pointer-events-none">
                                  <div className="h-5 w-5 rounded-full bg-white border border-slate-200/90 shadow-2xs flex items-center justify-center text-slate-400">
                                    <ArrowRight className="h-2.5 w-2.5" />
                                  </div>
                                </div>

                                {/* Mobile vertical connector */}
                                <div className="lg:hidden flex items-center justify-center py-1 text-slate-300">
                                  <div className="h-4 w-4 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                                    <ArrowRight className="h-2.5 w-2.5 rotate-90" />
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Branching Divider / Transition */}
                  <div className="relative pt-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200/80" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-white px-3.5 py-1 rounded-full border border-slate-200 text-[11px] font-black uppercase tracking-widest text-slate-500 font-display shadow-2xs flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Specific Emergency Scenarios
                      </span>
                    </div>
                  </div>

                  {/* Part 2: Specific Emergency Scenarios (3 Distinct Branch Cards) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                    {/* Scenario Card A: Fire Involved (Red) */}
                    <div className="p-5 sm:p-6 rounded-2xl sm:rounded-[22px] bg-red-50/60 border border-red-200/90 space-y-4 hover:border-red-300 hover:shadow-xs transition-all flex flex-col justify-between group">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-600 text-white font-black text-[10px] uppercase tracking-wider font-display shadow-2xs">
                            <Flame className="h-3 w-3" /> SCENARIO A
                          </span>
                          <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider font-display">
                            CRITICAL
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-black text-slate-900 font-display tracking-tight flex items-center gap-1.5">
                          <span>Fire Involved?</span>
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          When active flames or extreme radiant heat are threatening pressurized gas
                          bottles.
                        </p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-red-200/70 text-xs font-bold">
                        <div className="flex items-start gap-2 text-red-800 bg-white/80 p-2.5 rounded-xl border border-red-200/60">
                          <ArrowRight className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
                          <span>EVACUATE IMMEDIATELY</span>
                        </div>
                        <div className="flex items-start gap-2 text-red-800 bg-white/80 p-2.5 rounded-xl border border-red-200/60">
                          <Ban className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
                          <span>DO NOT APPROACH</span>
                        </div>
                        <div className="flex items-start gap-2 text-red-800 bg-white/80 p-2.5 rounded-xl border border-red-200/60">
                          <PhoneCall className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
                          <span>CALL 999 FROM DISTANCE</span>
                        </div>
                      </div>
                    </div>

                    {/* Scenario Card B: Cylinder Damaged (Amber) */}
                    <div className="p-5 sm:p-6 rounded-2xl sm:rounded-[22px] bg-amber-50/60 border border-amber-200/90 space-y-4 hover:border-amber-300 hover:shadow-xs transition-all flex flex-col justify-between group">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-600 text-white font-black text-[10px] uppercase tracking-wider font-display shadow-2xs">
                            <AlertTriangle className="h-3 w-3" /> SCENARIO B
                          </span>
                          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider font-display">
                            DEFECT
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-black text-slate-900 font-display tracking-tight flex items-center gap-1.5">
                          <span>Cylinder Damaged?</span>
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          For physical bottle dents, heavy rust, distorted foot rings, or damaged
                          spindles.
                        </p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-amber-200/70 text-xs font-bold">
                        <div className="flex items-start gap-2 text-amber-900 bg-white/80 p-2.5 rounded-xl border border-amber-200/60">
                          <CircleOff className="h-3.5 w-3.5 text-amber-700 shrink-0 mt-0.5" />
                          <span>DO NOT USE / CONNECT</span>
                        </div>
                        <div className="flex items-start gap-2 text-amber-900 bg-white/80 p-2.5 rounded-xl border border-amber-200/60">
                          <Users className="h-3.5 w-3.5 text-amber-700 shrink-0 mt-0.5" />
                          <span>KEEP PEOPLE AWAY</span>
                        </div>
                        <div className="flex items-start gap-2 text-amber-900 bg-white/80 p-2.5 rounded-xl border border-amber-200/60">
                          <Phone className="h-3.5 w-3.5 text-amber-700 shrink-0 mt-0.5" />
                          <span>CONTACT JOHN STAYTE</span>
                        </div>
                      </div>
                    </div>

                    {/* Scenario Card C: CO Symptoms (Blue) */}
                    <div className="p-5 sm:p-6 rounded-2xl sm:rounded-[22px] bg-sky-50/60 border border-sky-200/90 space-y-4 hover:border-sky-300 hover:shadow-xs transition-all flex flex-col justify-between group">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-700 text-white font-black text-[10px] uppercase tracking-wider font-display shadow-2xs">
                            <Activity className="h-3 w-3" /> SCENARIO C
                          </span>
                          <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider font-display">
                            MEDICAL
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-black text-slate-900 font-display tracking-tight flex items-center gap-1.5">
                          <span>CO Symptoms?</span>
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          For unexplained headaches, dizziness, nausea, confusion, or breathless
                          sensations.
                        </p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-sky-200/70 text-xs font-bold">
                        <div className="flex items-start gap-2 text-sky-950 bg-white/80 p-2.5 rounded-xl border border-sky-200/60">
                          <Wind className="h-3.5 w-3.5 text-sky-700 shrink-0 mt-0.5" />
                          <span>GET INTO FRESH AIR</span>
                        </div>
                        <div className="flex items-start gap-2 text-sky-950 bg-white/80 p-2.5 rounded-xl border border-sky-200/60">
                          <Ban className="h-3.5 w-3.5 text-sky-700 shrink-0 mt-0.5" />
                          <span>DO NOT RE-ENTER</span>
                        </div>
                        <div className="flex items-start gap-2 text-sky-950 bg-white/80 p-2.5 rounded-xl border border-sky-200/60">
                          <PhoneCall className="h-3.5 w-3.5 text-sky-700 shrink-0 mt-0.5" />
                          <span>URGENT MEDICAL HELP 999</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* =========================================================================
                  SECTION 9 — EMERGENCY CONTACTS PANEL
              ========================================================================= */}
              <section id="emergency-numbers" className="scroll-mt-28 space-y-8">
                <div className="space-y-2 text-left">
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-1.5 font-display">
                    <PhoneCall className="h-4 w-4 text-primary" /> DIRECT CONTACTS
                  </span>
                  <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-slate-900 tracking-tight font-display">
                    Emergency Support
                  </h2>
                  <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
                    Always place emergency calls from an open-air safe location outside the
                    property.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
                  {/* John Stayte Support */}
                  <div className="p-6 sm:p-8 rounded-[28px] border border-red-200 bg-red-50/40 space-y-4">
                    <div className="flex items-center gap-3.5">
                      <div className="h-12 w-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xs">
                        <Phone className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-black text-lg text-slate-900 font-display">
                          John Stayte Services
                        </h3>
                        <p className="text-xs text-slate-500">
                          Technical advice &amp; cylinder recovery
                        </p>
                      </div>
                    </div>
                    <a
                      href="tel:01452741234"
                      className="block text-center py-3.5 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-xl tracking-wider font-display shadow-xs transition-all"
                    >
                      01452 741234
                    </a>
                    <p className="text-xs text-slate-500 text-center">
                      Mon–Fri 8:00am–5:00pm | Sat 8:00am–12:30pm
                    </p>
                  </div>

                  {/* Immediate Danger / 999 */}
                  <div className="p-6 sm:p-8 rounded-[28px] border border-slate-900 bg-slate-950 text-white space-y-4">
                    <div className="flex items-center gap-3.5">
                      <div className="h-12 w-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-xs">
                        <Siren className="h-6 w-6 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="font-black text-lg text-white font-display">
                          Immediate Danger / Active Fire
                        </h3>
                        <p className="text-xs text-slate-400">
                          UK Emergency Services (Fire / Police)
                        </p>
                      </div>
                    </div>
                    <a
                      href="tel:999"
                      className="block text-center py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xl tracking-wider font-display shadow-xs transition-all"
                    >
                      DIAL 999
                    </a>
                    <p className="text-xs text-slate-400 text-center">
                      Available 24/7 UK-wide from any telephone
                    </p>
                  </div>
                </div>
              </section>
            </main>

            {/* Sticky Sidebar (Desktop On This Page Navigation) */}
            <aside className="hidden lg:block space-y-6 sticky top-28">
              <div className="rounded-[28px] border border-slate-200/90 bg-white p-6 space-y-5 shadow-xs text-left">
                <div className="flex items-center gap-2 pb-3.5 border-b border-slate-100 text-xs font-black uppercase tracking-[0.18em] text-slate-900 font-display">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span>On This Page</span>
                </div>
                <nav className="space-y-1.5">
                  {TABLE_OF_CONTENTS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => scrollToSection(item.id)}
                      className={cn(
                        "w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between group cursor-pointer",
                        activeSection === item.id
                          ? "bg-red-50 text-primary font-black shadow-2xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
                      )}
                    >
                      <span className="truncate pr-2">{item.label}</span>
                      <ChevronRight
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 transition-transform",
                          activeSection === item.id
                            ? "text-primary translate-x-0.5"
                            : "text-slate-300 opacity-0 group-hover:opacity-100",
                        )}
                      />
                    </button>
                  ))}
                </nav>
              </div>

              {/* Quick Emergency Assistance Card */}
              <div className="rounded-[28px] border border-red-200/80 bg-gradient-to-b from-red-50/80 to-white p-6 space-y-4 shadow-xs text-left">
                <div className="h-10 w-10 rounded-2xl bg-red-100 text-primary flex items-center justify-center">
                  <PhoneCall className="h-5 w-5 stroke-[2.5]" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-black text-sm text-slate-900 font-display">
                    Gas Safety Emergency?
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Direct technical assistance &amp; cylinder recovery across Gloucestershire.
                  </p>
                </div>
                <a
                  href="tel:01452741234"
                  className="block w-full text-center py-3 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-black text-xs shadow-xs transition-all font-display"
                >
                  Call 01452 741234
                </a>
              </div>
            </aside>
          </div>
        </div>

        {/* =========================================================================
            NEWSLETTER / STAY INFORMED SECTION (Directly Above Footer)
        ========================================================================= */}
        <div className="container-page max-w-[88rem] pt-4 pb-12 sm:pb-16">
          <section className="rounded-[28px] sm:rounded-[36px] border border-slate-200/90 bg-white p-7 sm:p-10 lg:p-12 space-y-5 shadow-xs text-center max-w-3xl mx-auto">
            <div className="space-y-1.5">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-primary font-display">
                STAY INFORMED
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-display tracking-tight">
                Get useful gas, fuel and home energy advice.
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed font-normal">
                Occasional safety updates, seasonal fuel recommendations, and local service alerts.
              </p>
            </div>

            <form
              onSubmit={handleNewsletterSubmit}
              className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto pt-2"
            >
              <Input
                type="email"
                placeholder="Your email address"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                disabled={subscribing || subscribed}
                className="h-12 rounded-full text-xs sm:text-sm bg-white border-slate-200 focus-visible:ring-primary px-5 shadow-2xs w-full"
                required
              />
              <Button
                type="submit"
                disabled={subscribing || subscribed}
                className="h-12 rounded-full px-7 text-xs sm:text-sm font-black font-display bg-primary hover:bg-primary/90 text-white shrink-0 shadow-xs hover:shadow-md gap-1.5 w-full sm:w-auto transition-all cursor-pointer"
              >
                {subscribing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Subscribing...
                  </>
                ) : subscribed ? (
                  <>
                    <Check className="h-4 w-4" /> Subscribed
                  </>
                ) : (
                  <>
                    Stay informed <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </section>
        </div>
      </article>
    </SiteLayout>
  );
}

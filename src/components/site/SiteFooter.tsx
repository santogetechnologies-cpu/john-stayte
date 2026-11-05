import { useState, useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Facebook, Instagram, Mail, MapPin, Phone, Youtube, Clock, ShieldCheck, Settings2 } from "lucide-react";
import logo from "@/assets/image-5.png";
import { categories as defaultCategories } from "@/data/catalog";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function RedWaveFooterBanner() {
  return (
    <div className="w-full overflow-hidden bg-transparent leading-none relative z-10 pointer-events-none select-none -mb-px">
      <svg
        viewBox="0 0 1440 110"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-14 sm:h-18 md:h-22 lg:h-26 block"
        preserveAspectRatio="none"
      >
        <defs>
          {/* Main Red Glass Base Gradient */}
          <linearGradient id="jssGlobalWaveBase" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#DC2626" stopOpacity="0.95" />
            <stop offset="30%" stopColor="#EF4444" stopOpacity="0.95" />
            <stop offset="65%" stopColor="#DC2626" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#B91C1C" stopOpacity="0.95" />
          </linearGradient>

          {/* Translucent Glass Ribbon Flow */}
          <linearGradient id="jssGlobalWaveGlass" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FECACA" stopOpacity="0.45" />
            <stop offset="35%" stopColor="#F87171" stopOpacity="0.25" />
            <stop offset="70%" stopColor="#FFFFFF" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#F87171" stopOpacity="0.3" />
          </linearGradient>

          {/* Upper Specular Glass Edge Highlight */}
          <linearGradient id="jssGlobalWaveHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FECACA" stopOpacity="0.6" />
            <stop offset="25%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#FEE2E2" stopOpacity="0.95" />
            <stop offset="85%" stopColor="#FFFFFF" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#FCA5A5" stopOpacity="0.5" />
          </linearGradient>

          {/* Secondary Ribbon Glow Line */}
          <linearGradient id="jssGlobalWaveGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.3" />
            <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.7" />
            <stop offset="80%" stopColor="#F87171" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#DC2626" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* 1. Underlying Solid Red Wave Fill transitioning into dark footer */}
        <path
          d="M 0,42 C 340,78 680,68 1020,38 C 1220,24 1360,42 1440,52 L 1440,110 L 0,110 Z"
          fill="url(#jssGlobalWaveBase)"
        />

        {/* 2. Flowing Translucent Glass Ribbon */}
        <path
          d="M 0,26 C 360,68 700,56 1040,28 C 1240,14 1370,32 1440,40 L 1440,82 C 1360,68 1220,46 1020,58 C 680,84 340,94 0,64 Z"
          fill="url(#jssGlobalWaveGlass)"
        />

        {/* 3. Top Specular Glass Edge Highlight */}
        <path
          d="M 0,26 C 360,68 700,56 1040,28 C 1240,14 1370,32 1440,40"
          fill="none"
          stroke="url(#jssGlobalWaveHighlight)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* 4. Secondary Contour Glow */}
        <path
          d="M 0,42 C 340,78 680,68 1020,38 C 1220,24 1360,42 1440,52"
          fill="none"
          stroke="url(#jssGlobalWaveGlow)"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}

export function SiteFooter({ className }: { className?: string } = {}) {
  const routerState = useRouterState();
  const [categories, setCategories] = useState<any[]>(defaultCategories);
  const [footerCms, setFooterCms] = useState({
    bio: "Family-run supplier of bottled Calor gas, solid fuel, animal feed and outdoor living since 1972. Delivering across Gloucestershire and surrounding areas.",
    companyPhone: "+44 (0)1453 822859",
    companyEmail: "info@johnstayteservices.co.uk",
    companyAddress: "Puddlesworth Lane, Eastington, Stonehouse, Gloucestershire, GL10 3AH, United Kingdom",
    companyHours: "Mon–Fri 8:00–17:00 · Sat 8:30–12:30",
    copyrightText: "John Stayte Services. All rights reserved.",
    vatNumber: "John Stayte Services (WSM) Limited · Registered in England & Wales No. 00303703 · VAT GB 207 610 984",
    facebookUrl: "https://facebook.com",
    instagramUrl: "https://instagram.com",
    youtubeUrl: "https://youtube.com",
  });

  const openCookieSettings = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("jss_open_cookie_settings"));
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [{ data: catData }, { data: footerBlock }] = await Promise.all([
          supabase
            .from("categories")
            .select("*")
            .eq("is_active", true)
            .order("display_order", { ascending: true }),
          supabase
            .from("cms_content_blocks")
            .select("content")
            .eq("section_key", "footer_data")
            .maybeSingle(),
        ]);

        if (catData && catData.length > 0) {
          setCategories(catData);
        }

        if (footerBlock?.content) {
          try {
            const parsed = JSON.parse(footerBlock.content);
            if (parsed && typeof parsed === "object") {
              setFooterCms((prev) => ({
                ...prev,
                bio: parsed.bio || prev.bio,
                companyPhone: parsed.companyPhone || prev.companyPhone,
                companyEmail: parsed.companyEmail || prev.companyEmail,
                companyAddress: parsed.companyAddress || prev.companyAddress,
                copyrightText: parsed.copyrightText || prev.copyrightText,
                vatNumber: parsed.vatNumber || prev.vatNumber,
                facebookUrl: parsed.facebookUrl || prev.facebookUrl,
                instagramUrl: parsed.instagramUrl || prev.instagramUrl,
                youtubeUrl: parsed.youtubeUrl || prev.youtubeUrl,
              }));
            }
          } catch {}
        }
      } catch {}
    }
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener("cms_footer_updated", handleUpdate);
    return () => window.removeEventListener("cms_footer_updated", handleUpdate);
  }, []);

  const pathname = routerState?.location?.pathname || "";
  const normalizedPath = pathname.replace(/\/$/, "") || "/";
  const showRedWave =
    normalizedPath === "/" || normalizedPath === "/about" || normalizedPath === "/blog";

  return (
    <div className={cn("w-full mt-16 sm:mt-20", className)}>
      {showRedWave && <RedWaveFooterBanner />}
      <footer className="bg-ink text-ink-foreground -mt-px">
        <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-5">
          {/* 1. Brand & Heritage */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3">
              <img
                src={logo}
                alt="John Stayte Services"
                className="h-10 w-10 rounded-xl"
                width={40}
                height={40}
                loading="lazy"
              />
              <span className="font-display text-lg font-extrabold tracking-tight">JOHN STAYTE SERVICES</span>
            </div>
            <p className="mt-4 max-w-xs text-xs sm:text-sm text-ink-foreground/75 leading-relaxed">
              {footerCms.bio}
            </p>
            <div className="mt-5 flex gap-2">
              {[
                { Icon: Facebook, url: footerCms.facebookUrl },
                { Icon: Instagram, url: footerCms.instagramUrl },
                { Icon: Youtube, url: footerCms.youtubeUrl },
                { Icon: Mail, url: `mailto:${footerCms.companyEmail}` },
              ].map(({ Icon, url }, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
                  aria-label="Social Link"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* 2. Shop Categories */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Shop Online</h4>
            <ul className="mt-4 space-y-2 text-xs sm:text-sm text-ink-foreground/75">
              <li>
                <Link to="/order-gas" className="hover:text-primary transition-colors">
                  Bottled Calor Gas
                </Link>
              </li>
              {categories.slice(0, 5).map((c) => (
                <li key={typeof c.slug === "string" ? c.slug : String(c.id || Math.random())}>
                  <Link
                    to="/products"
                    search={{ category: typeof c.slug === "string" ? c.slug : "" }}
                    className="hover:text-primary transition-colors"
                  >
                    {typeof c.name === "string" ? c.name : ""}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/offers" className="hover:text-primary transition-colors text-red-400 font-medium">
                  Promotions &amp; Offers
                </Link>
              </li>
            </ul>
          </div>

          {/* 3. Company & Facilities */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Information</h4>
            <ul className="mt-4 space-y-2 text-xs sm:text-sm text-ink-foreground/75">
              <li>
                <Link to="/about" className="hover:text-primary transition-colors">
                  About John Stayte Services
                </Link>
              </li>
              <li>
                <Link to="/services" className="hover:text-primary transition-colors">
                  Our Services
                </Link>
              </li>
              <li>
                <Link to="/filling-stations" className="hover:text-primary transition-colors">
                  Filling Stations &amp; Forecourts
                </Link>
              </li>
              <li>
                <Link to="/auto-gas" className="hover:text-primary transition-colors">
                  Auto Gas LPG Refuelling
                </Link>
              </li>
              <li>
                <Link to="/brands" className="hover:text-primary transition-colors">
                  Partner Brands
                </Link>
              </li>
              <li>
                <Link to="/blog" className="hover:text-primary transition-colors">
                  Knowledge Centre &amp; Guides
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-primary transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* 4. Essential Legal & Trust */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Legal &amp; Trust</h4>
            <ul className="mt-4 space-y-2 text-xs sm:text-sm text-ink-foreground/75">
              <li>
                <Link to="/privacy-policy" className="hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-primary transition-colors">
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link to="/cookie-policy" className="hover:text-primary transition-colors">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link to="/refund-policy" className="hover:text-primary transition-colors">
                  Refund &amp; Cancellation Policy
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-primary transition-colors font-medium text-white">
                  Frequently Asked Questions (FAQ)
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={openCookieSettings}
                  className="hover:text-primary transition-colors flex items-center gap-1.5 text-xs text-slate-300 pt-1"
                >
                  <Settings2 className="h-3.5 w-3.5 text-primary" />
                  <span>Cookie Settings</span>
                </button>
              </li>
            </ul>
          </div>

          {/* 5. Newsletter & Verified Contact */}
          <div className="sm:col-span-2 lg:col-span-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Stay Informed</h4>
            <p className="mt-4 text-xs text-ink-foreground/75">
              Seasonal fuel price updates and delivery schedules.
            </p>
            <form
              className="mt-3 flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const input = form.querySelector('input[type="email"]') as HTMLInputElement;
                const emailVal = input?.value?.trim();
                if (!emailVal) return;

                try {
                  const { error } = await supabase
                    .from("newsletter_subscribers")
                    .insert([{ email: emailVal, source: "website_footer", status: "active" }]);

                  if (error && error.code !== "23505") {
                    throw error;
                  }
                  toast.success("You're subscribed to John Stayte Services updates!");
                  form.reset();
                } catch (err: any) {
                  console.error("Newsletter subscription error:", err);
                  toast.error("Subscription failed: " + (err.message || "Please try again."));
                }
              }}
            >
              <Input
                required
                type="email"
                placeholder="Email address"
                className="h-10 text-xs rounded-full border-white/15 bg-white/10 text-ink-foreground placeholder:text-ink-foreground/50"
              />
              <Button type="submit" size="sm" className="h-10 rounded-full px-4 text-xs font-bold bg-primary hover:bg-primary/90 text-white">
                Join
              </Button>
            </form>
            <ul className="mt-5 space-y-2.5 text-xs text-ink-foreground/75">
              <li className="flex gap-2">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
                <span>{footerCms.companyAddress}</span>
              </li>
              <li className="flex gap-2">
                <Phone className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
                <a href={`tel:${footerCms.companyPhone.replace(/[^\d+]/g, "")}`} className="hover:text-white">
                  {footerCms.companyPhone}
                </a>
              </li>
              <li className="flex gap-2">
                <Mail className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
                <a href={`mailto:${footerCms.companyEmail}`} className="hover:text-white">
                  {footerCms.companyEmail}
                </a>
              </li>
              <li className="flex gap-2">
                <Clock className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
                <span>{footerCms.companyHours}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar with Dynamic Year and Full Legal Metadata */}
        <div className="border-t border-white/10 bg-black/20">
          <div className="container-page flex flex-col gap-3 py-6 text-xs text-ink-foreground/60 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 text-left">
              <p>© {new Date().getFullYear()} John Stayte Services. All rights reserved.</p>
              <p className="text-[11px] text-ink-foreground/50">{footerCms.vatNumber}</p>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-foreground/70">
              <Link to="/privacy-policy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <span>·</span>
              <Link to="/terms" className="hover:text-white transition-colors">
                Terms &amp; Conditions
              </Link>
              <span>·</span>
              <Link to="/cookie-policy" className="hover:text-white transition-colors">
                Cookie Policy
              </Link>
              <span>·</span>
              <Link to="/refund-policy" className="hover:text-white transition-colors">
                Refund Policy
              </Link>
              <span>·</span>
              <button
                type="button"
                onClick={openCookieSettings}
                className="hover:text-white transition-colors underline-offset-2 hover:underline"
              >
                Cookie Settings
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

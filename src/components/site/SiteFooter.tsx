import { useState, useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Facebook, Instagram, Mail, MapPin, Phone, Youtube } from "lucide-react";
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

  useEffect(() => {
    async function loadCats() {
      try {
        const { data } = await supabase
          .from("categories")
          .select("*")
          .eq("is_active", true)
          .order("display_order", { ascending: true });
        if (data && data.length > 0) {
          setCategories(data);
        }
      } catch {}
    }
    loadCats();
  }, []);

  const pathname = routerState?.location?.pathname || "";
  const normalizedPath = pathname.replace(/\/$/, "") || "/";
  const showRedWave =
    normalizedPath === "/" || normalizedPath === "/about" || normalizedPath === "/blog";

  return (
    <div className={cn("w-full mt-16 sm:mt-20", className)}>
      {showRedWave && <RedWaveFooterBanner />}
      <footer className="bg-ink text-ink-foreground -mt-px">
        <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-3">
              <img
                src={logo}
                alt="John Stayte Services"
                className="h-10 w-10 rounded-xl"
                width={40}
                height={40}
                loading="lazy"
              />
              <span className="font-display text-lg font-extrabold">JOHN STAYTE SERVICES</span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-ink-foreground/70">
              Family-run supplier of bottled gas, solid fuel, animal feed and outdoor living since
              1972. Delivering across Gloucestershire.
            </p>
            <div className="mt-5 flex gap-2">
              {[Facebook, Instagram, Youtube, Mail].map((Icon, i) => (
                <span key={i} className="grid h-9 w-9 place-items-center rounded-full bg-white/10">
                  <Icon className="h-4 w-4" />
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-primary">Shop</h4>
            <ul className="mt-4 space-y-2 text-sm text-ink-foreground/75">
              {categories.slice(0, 6).map((c) => (
                <li key={typeof c.slug === "string" ? c.slug : String(c.id || Math.random())}>
                  <Link
                    to="/products"
                    search={{ category: typeof c.slug === "string" ? c.slug : "" }}
                    className="hover:text-primary"
                  >
                    {typeof c.name === "string" ? c.name : ""}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-primary">Information</h4>
            <ul className="mt-4 space-y-2 text-sm text-ink-foreground/75">
              <li>
                <Link to="/about" className="hover:text-primary">
                  About us
                </Link>
              </li>
              <li>
                <Link to="/services" className="hover:text-primary">
                  Services
                </Link>
              </li>
              <li>
                <Link to="/filling-stations" className="hover:text-primary">
                  Filling stations
                </Link>
              </li>
              <li>
                <Link to="/offers" className="hover:text-primary">
                  Offers
                </Link>
              </li>
              <li>
                <Link to="/blog" className="hover:text-primary">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-primary">
                  Contact & FAQ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-primary">Newsletter</h4>
            <p className="mt-4 text-sm text-ink-foreground/75">
              Seasonal offers and fuel price updates.
            </p>
            <form
              className="mt-4 flex gap-2"
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
                  toast.success("You're subscribed to JSS updates!");
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
                className="h-11 rounded-full border-white/15 bg-white/10 text-ink-foreground placeholder:text-ink-foreground/50"
              />
              <Button type="submit" className="h-11 rounded-full px-5">
                Join
              </Button>
            </form>
            <ul className="mt-6 space-y-2 text-sm text-ink-foreground/75">
              <li className="flex gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-primary" /> Whitminster, Gloucester GL2 7PD
              </li>
              <li className="flex gap-2">
                <Phone className="h-4 w-4 shrink-0 text-primary" /> 01452 741234
              </li>
              <li className="flex gap-2">
                <Mail className="h-4 w-4 shrink-0 text-primary" /> sales@johnstayte.co.uk
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="container-page flex flex-col gap-2 py-5 text-xs text-ink-foreground/60 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} John Stayte Services. All rights reserved.</p>
            <p>Registered in England · VAT GB 123 4567 89</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

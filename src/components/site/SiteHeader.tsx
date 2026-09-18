import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  Menu,
  Search,
  ShoppingCart,
  Heart,
  User,
  Truck,
  Phone,
  ChevronDown,
  LogOut,
  LayoutDashboard,
} from "lucide-react";
import logo from "@/assets/image-5.png";
import { categories as defaultCategories } from "@/data/catalog";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/order-gas", label: "Shop & Order Gas" },
  { to: "/filling-stations", label: "Filling Stations" },
  { to: "/auto-gas", label: "Auto Gas" },
  { to: "/services", label: "Services" },
  { to: "/blog", label: "Blog" },
  { to: "/contact", label: "Contact" },
];

/**
 * Route-aware active navigation helper.
 * Strictly checks pathname to ensure correct nav item highlights in JSS Red.
 */
function isLinkActive(linkTo: string, currentPath: string): boolean {
  if (linkTo === "/") {
    return currentPath === "/";
  }

  if (linkTo === "/order-gas") {
    return (
      currentPath === "/order-gas" ||
      currentPath.startsWith("/order-gas/") ||
      currentPath === "/products" ||
      currentPath.startsWith("/products/")
    );
  }

  return currentPath === linkTo || currentPath.startsWith(`${linkTo}/`);
}

export function SiteHeader() {
  const { cart, user, logout, wishlist } = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<any[]>(defaultCategories);
  const count = cart.reduce((s, l) => s + l.qty, 0);
  const [activeBanner, setActiveBanner] = useState<any | null>(null);
  const [blogDropdownOpen, setBlogDropdownOpen] = useState(false);
  const [mobileBlogOpen, setMobileBlogOpen] = useState(false);
  const blogDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click/tap outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        blogDropdownRef.current &&
        !blogDropdownRef.current.contains(event.target as Node)
      ) {
        setBlogDropdownOpen(false);
      }
    }

    if (blogDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [blogDropdownOpen]);

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

  useEffect(() => {
    async function loadActiveBanner() {
      try {
        const { data, error } = await supabase
          .from("cms_banners")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          const now = new Date();
          const valid = data.find((b: any) => {
            const startOk = !b.starts_at || new Date(b.starts_at) <= now;
            const endOk = !b.expires_at || new Date(b.expires_at) >= now;
            return startOk && endOk;
          });
          setActiveBanner(valid || null);
        } else {
          setActiveBanner(null);
        }
      } catch {
        setActiveBanner(null);
      }
    }

    loadActiveBanner();

    const handleUpdate = () => loadActiveBanner();
    window.addEventListener("cms_banners_updated", handleUpdate);

    const channel = supabase
      .channel("site_header_cms_banners")
      .on("postgres_changes", { event: "*", schema: "public", table: "cms_banners" }, () =>
        loadActiveBanner(),
      )
      .subscribe();

    return () => {
      window.removeEventListener("cms_banners_updated", handleUpdate);
      supabase.removeChannel(channel);
    };
  }, []);

  // Subscribe to current router location pathname
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    setBlogDropdownOpen(false);
  }, [currentPath]);

  const dashPath =
    user?.role === "admin"
      ? "/admin"
      : user?.role === "manager"
        ? "/manager"
        : user?.role === "delivery_agent"
          ? "/delivery"
          : "/account";

  const roleLabel =
    user?.role === "delivery_agent"
      ? "Driver Account"
      : user?.role === "admin"
        ? "Administrator"
        : user?.role === "manager"
          ? "Operations Manager"
          : "Customer Account";

  const portalLabel =
    user?.role === "delivery_agent"
      ? "Delivery Portal"
      : user?.role === "admin"
        ? "Admin Control Center"
        : user?.role === "manager"
          ? "Manager Portal"
          : "My Account";

  const PortalIcon = user?.role === "delivery_agent" ? Truck : LayoutDashboard;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/products", search: { q: q || undefined } });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/85 backdrop-blur-xl">
      <div className="hidden bg-ink text-ink-foreground md:block">
        <div className="container-page flex h-9 items-center justify-between text-xs">
          {activeBanner ? (
            <p className="flex items-center gap-2 font-medium truncate">
              <Truck className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>
                {typeof (activeBanner.message || activeBanner.title) === "string"
                  ? activeBanner.message || activeBanner.title
                  : ""}
                {typeof activeBanner.subtitle === "string" && activeBanner.subtitle.trim()
                  ? ` — ${activeBanner.subtitle}`
                  : ""}
              </span>
              {activeBanner.link_url && (
                <Link
                  to={activeBanner.link_url}
                  className="underline underline-offset-2 font-bold hover:text-primary transition-colors ml-1.5"
                >
                  {activeBanner.link_text || "Learn more"}
                </Link>
              )}
            </p>
          ) : (
            <p className="flex items-center gap-2">
              <Truck className="h-3.5 w-3.5 text-primary" /> Free delivery on orders over £75 across
              Gloucestershire
            </p>
          )}
          <a
            href="tel:+441453822859"
            className="flex items-center gap-2 hover:text-primary shrink-0 ml-4"
          >
            <Phone className="h-3.5 w-3.5" /> +44 (0)1453 822859
          </a>
        </div>
      </div>

      <div className="container-page grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3 lg:grid-cols-[auto_minmax(0,1fr)_auto]">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <img
            src={logo}
            alt="John Stayte Services logo"
            className="h-11 w-11 shrink-0 rounded-xl"
            width={44}
            height={44}
          />
          <span className="min-w-0">
            <span className="block truncate font-display text-base font-extrabold leading-tight sm:text-lg">
              JOHN STAYTE SERVICES
            </span>
            <span className="block truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Order Gas Online
            </span>
          </span>
        </Link>

        <form onSubmit={submit} className="order-3 col-span-2 lg:order-none lg:col-span-1">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search cylinders, coal, baits, appliances…"
              className="h-11 rounded-full border-border bg-surface pl-10"
              aria-label="Search products"
            />
          </div>
        </form>

        <div className="flex items-center gap-1.5">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="hidden rounded-full sm:inline-flex"
          >
            <Link to={user ? (user.role === "customer" ? "/account/wishlist" : dashPath) : "/login"} aria-label="Wishlist">
              <Heart className="h-5 w-5" />
              {wishlist.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {wishlist.length}
                </span>
              )}
            </Link>
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="hidden rounded-full px-3 sm:inline-flex">
                  <User className="mr-1.5 h-4 w-4" />
                  <span className="max-w-24 truncate">{user.name.split(" ")[0]}</span>
                  <ChevronDown className="ml-1 h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5 border-border shadow-xl">
                <DropdownMenuLabel className="px-3 py-2">
                  <p className="font-extrabold text-xs text-foreground truncate">{user.name}</p>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider mt-0.5">{roleLabel}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="rounded-xl font-bold text-xs py-2 cursor-pointer">
                  <Link to={dashPath}>
                    <PortalIcon className="mr-2 h-4 w-4 text-primary" /> {portalLabel}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    logout();
                    navigate({ to: "/" });
                  }}
                  className="rounded-xl font-bold text-xs py-2 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="ghost" className="hidden rounded-full sm:inline-flex">
              <Link to="/login">
                <User className="mr-1.5 h-4 w-4" /> Sign in
              </Link>
            </Button>
          )}

          <Button asChild className="relative rounded-full">
            <Link to="/cart">
              <ShoppingCart className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Cart</span>
              <span className="ml-1 rounded-full bg-primary-foreground/20 px-1.5 text-xs font-bold">
                {count}
              </span>
            </Link>
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full lg:hidden"
                aria-label="Menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 overflow-y-auto">
              <nav className="mt-8 grid gap-1">
                {navLinks.map((l) => {
                  const isActive = isLinkActive(l.to, currentPath);
                  if (l.to === "/blog") {
                    return (
                      <div key={l.to} className="space-y-1">
                        <button
                          type="button"
                          onClick={() => setMobileBlogOpen((prev) => !prev)}
                          className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
                            isActive
                              ? "bg-primary text-primary-foreground font-extrabold"
                              : "text-slate-700 hover:bg-surface hover:text-slate-900"
                          }`}
                        >
                          <span>{l.label}</span>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 transition-transform",
                              mobileBlogOpen && "rotate-180",
                            )}
                          />
                        </button>
                        {mobileBlogOpen && (
                          <div className="pl-4 space-y-1 border-l-2 border-primary/20 ml-3 my-1">
                            <Link
                              to="/blog"
                              onClick={() => {
                                setMobileBlogOpen(false);
                                setOpen(false);
                              }}
                              className="block rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-surface hover:text-primary"
                            >
                              Knowledge Centre
                            </Link>
                            <Link
                              to="/blog/$slug"
                              params={{ slug: "safe-cylinder-storage" }}
                              onClick={() => {
                                setMobileBlogOpen(false);
                                setOpen(false);
                              }}
                              className="block rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-surface hover:text-primary"
                            >
                              Safety Guide
                            </Link>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return (
                    <Link
                      key={l.to}
                      to={l.to}
                      onClick={() => setOpen(false)}
                      className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground font-extrabold hover:bg-primary hover:text-primary-foreground"
                          : "text-slate-700 hover:bg-surface hover:text-slate-900"
                      }`}
                    >
                      {l.label}
                    </Link>
                  );
                })}
                <div className="mt-4 border-t pt-4">
                  <p className="px-3 pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Categories
                  </p>
                  {categories.map((c) => (
                    <Link
                      key={c.slug}
                      to="/products"
                      search={{ category: c.slug }}
                      onClick={() => setOpen(false)}
                      className="block rounded-xl px-3 py-2 text-sm hover:bg-surface font-medium"
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
                {user ? (
                  <div className="mt-4 grid gap-2 border-t pt-4">
                    <div className="px-3 py-2 rounded-xl bg-surface border border-border/60">
                      <p className="font-extrabold text-xs text-foreground truncate">{user.name}</p>
                      <p className="text-[10px] font-bold text-primary uppercase tracking-wider">{roleLabel}</p>
                    </div>
                    <Button asChild className="rounded-full font-bold text-xs gap-2">
                      <Link to={dashPath} onClick={() => setOpen(false)}>
                        <PortalIcon className="h-4 w-4" /> {portalLabel}
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setOpen(false);
                        logout();
                        navigate({ to: "/" });
                      }}
                      className="rounded-full text-xs font-bold text-destructive hover:bg-destructive/10 border-destructive/20 gap-2 cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </Button>
                  </div>
                ) : (
                  <div className="mt-4 grid gap-2 border-t pt-4">
                    <Button asChild variant="outline" className="rounded-full font-bold text-xs">
                      <Link to="/login" onClick={() => setOpen(false)}>
                        Sign in
                      </Link>
                    </Button>
                  </div>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <nav className="hidden border-t border-border/70 lg:block">
        <div className="container-page flex items-center gap-1 py-1.5">
          {navLinks.map((l) => {
            const isActive = isLinkActive(l.to, currentPath);
            if (l.to === "/blog") {
              return (
                <div
                  key={l.to}
                  ref={blogDropdownRef}
                  className="relative py-1"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBlogDropdownOpen((prev) => !prev);
                    }}
                    aria-expanded={blogDropdownOpen}
                    aria-haspopup="true"
                    className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] uppercase tracking-wide transition-colors inline-flex items-center gap-1 cursor-pointer outline-none select-none ${
                      isActive
                        ? "bg-primary text-primary-foreground font-extrabold hover:bg-primary hover:text-primary-foreground shadow-2xs"
                        : "text-slate-700 font-semibold hover:bg-surface hover:text-slate-900"
                    }`}
                  >
                    <span>{l.label}</span>
                    <ChevronDown
                      className={cn(
                        "h-3 w-3 transition-transform duration-200 opacity-70",
                        blogDropdownOpen && "rotate-180",
                      )}
                    />
                  </button>

                  {/* Clean, stable click-friendly dropdown menu */}
                  {blogDropdownOpen && (
                    <div className="absolute left-0 top-full pt-1.5 z-50">
                      <div className="w-52 rounded-2xl p-1.5 border border-border shadow-xl bg-white animate-in fade-in-0 duration-150">
                        <Link
                          to="/blog"
                          onClick={() => setBlogDropdownOpen(false)}
                          className="block rounded-xl font-bold text-xs py-2.5 px-3 text-slate-800 hover:bg-slate-100 hover:text-primary transition-colors cursor-pointer"
                        >
                          Knowledge Centre
                        </Link>
                        <Link
                          to="/blog/$slug"
                          params={{ slug: "safe-cylinder-storage" }}
                          onClick={() => setBlogDropdownOpen(false)}
                          className="block rounded-xl font-bold text-xs py-2.5 px-3 text-slate-800 hover:bg-slate-100 hover:text-primary transition-colors cursor-pointer"
                        >
                          Safety Guide
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            }
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] uppercase tracking-wide transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground font-extrabold hover:bg-primary hover:text-primary-foreground shadow-2xs"
                    : "text-slate-700 font-semibold hover:bg-surface hover:text-slate-900"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}

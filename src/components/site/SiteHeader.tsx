import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
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
import { categories } from "@/data/catalog";
import { useStore } from "@/lib/store";
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
  { to: "/products", label: "Shop" },
  { to: "/order-gas", label: "Order Gas" },
  { to: "/filling-stations", label: "Filling Stations" },
  { to: "/services", label: "Services" },
  { to: "/offers", label: "Offers" },
  { to: "/blog", label: "Blog" },
  { to: "/about", label: "About" },
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

  if (linkTo === "/products") {
    return (
      currentPath === "/products" ||
      currentPath.startsWith("/products/") ||
      currentPath.startsWith("/product/") ||
      currentPath.startsWith("/categories/")
    );
  }

  return currentPath === linkTo || currentPath.startsWith(`${linkTo}/`);
}

export function SiteHeader() {
  const { cart, user, logout, wishlist } = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const count = cart.reduce((s, l) => s + l.qty, 0);

  // Subscribe to current router location pathname
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  const dashPath =
    user?.role === "admin" ? "/admin" : user?.role === "manager" ? "/manager" : "/account";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/products", search: { q: q || undefined } });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/85 backdrop-blur-xl">
      <div className="hidden bg-ink text-ink-foreground md:block">
        <div className="container-page flex h-9 items-center justify-between text-xs">
          <p className="flex items-center gap-2">
            <Truck className="h-3.5 w-3.5 text-primary" /> Free delivery on orders over £75 across
            Gloucestershire
          </p>
          <a href="tel:01452741234" className="flex items-center gap-2 hover:text-primary">
            <Phone className="h-3.5 w-3.5" /> 01452 741234
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
          <Button asChild variant="ghost" size="icon" className="hidden rounded-full sm:inline-flex">
            <Link to={user ? "/account/wishlist" : "/login"} aria-label="Wishlist">
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
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="capitalize">{user.role} account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={dashPath}>
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    logout();
                    navigate({ to: "/" });
                  }}
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
              <Button variant="outline" size="icon" className="rounded-full lg:hidden" aria-label="Menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 overflow-y-auto">
              <nav className="mt-8 grid gap-1">
                {navLinks.map((l) => {
                  const isActive = isLinkActive(l.to, currentPath);
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
                <div className="mt-4 grid gap-2 border-t pt-4">
                  <Button asChild variant="outline" className="rounded-full">
                    <Link to="/login" onClick={() => setOpen(false)}>
                      Sign in
                    </Link>
                  </Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <nav className="hidden border-t border-border/70 lg:block">
        <div className="container-page flex items-center gap-1 overflow-x-auto py-1.5">
          {navLinks.map((l) => {
            const isActive = isLinkActive(l.to, currentPath);
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

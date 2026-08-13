import { useState, useEffect, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ShoppingBag,
  Truck,
  PackageCheck,
  Users,
  Package,
  Layers,
  Tag,
  Ticket,
  UserCheck,
  Building2,
  BarChart3,
  TrendingUp,
  FileCode,
  Image as ImageIcon,
  BookOpen,
  HelpCircle,
  Bell,
  ShieldCheck,
  Settings,
  Search,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LifeBuoy,
  User,
  Menu,
} from "lucide-react";
import logo from "@/assets/image-5.png";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { AdminGlobalSearch } from "./AdminGlobalSearch";
import { AdminNotificationsPopover } from "./AdminNotificationsPopover";

type NavItem = {
  title: string;
  href: string;
  icon: any;
  moduleKey?: string;
  badgeKey?: "ordersPending" | "inventoryLow" | "unreadNotifications";
  badgeColor?: string;
};

type NavGroup = {
  groupLabel: string;
  items: NavItem[];
};

const adminNavGroups: NavGroup[] = [
  {
    groupLabel: "OVERVIEW",
    items: [
      { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    groupLabel: "OPERATIONS",
    items: [
      { title: "Orders", href: "/admin/orders", icon: ShoppingBag, badgeKey: "ordersPending", badgeColor: "bg-amber-100 text-amber-800 font-bold" },
      { title: "Deliveries", href: "/admin/deliveries", icon: Truck },
      { title: "Inventory", href: "/admin/inventory", icon: PackageCheck, badgeKey: "inventoryLow", badgeColor: "bg-red-100 text-red-700 font-bold" },
      { title: "Customers", href: "/admin/customers", icon: Users },
    ],
  },
  {
    groupLabel: "CATALOG",
    items: [
      { title: "Products", href: "/admin/products", icon: Package },
      { title: "Categories", href: "/admin/categories", icon: Layers },
      { title: "Offers", href: "/admin/offers", icon: Tag, moduleKey: "offers" },
      { title: "Coupons", href: "/admin/coupons", icon: Ticket, moduleKey: "coupons" },
    ],
  },
  {
    groupLabel: "PEOPLE",
    items: [
      { title: "Managers", href: "/admin/managers", icon: UserCheck },
      { title: "Customers", href: "/admin/customers", icon: Users },
    ],
  },
  {
    groupLabel: "BUSINESS",
    items: [
      { title: "Stations", href: "/admin/stations", icon: Building2, moduleKey: "stations" },
      { title: "Reports", href: "/admin/reports", icon: BarChart3, moduleKey: "reports" },
      { title: "Analytics", href: "/admin/analytics", icon: TrendingUp, moduleKey: "analytics" },
    ],
  },
  {
    groupLabel: "CONTENT",
    items: [
      { title: "CMS", href: "/admin/cms", icon: FileCode, moduleKey: "cms" },
      { title: "Banners", href: "/admin/banners", icon: ImageIcon, moduleKey: "banners" },
      { title: "Blog", href: "/admin/blog", icon: BookOpen, moduleKey: "blog" },
      { title: "FAQs", href: "/admin/faqs", icon: HelpCircle, moduleKey: "faqs" },
    ],
  },
  {
    groupLabel: "SYSTEM",
    items: [
      { title: "Notifications", href: "/admin/notifications", icon: Bell, moduleKey: "notifications", badgeKey: "unreadNotifications", badgeColor: "bg-primary text-white font-bold" },
      { title: "Audit Logs", href: "/admin/audit", icon: ShieldCheck, moduleKey: "audit" },
      { title: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

export function AdminPortalLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useStore();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const [moduleConfig, setModuleConfig] = useState<Record<string, boolean>>({
    stations: true,
    reports: true,
    analytics: true,
    cms: true,
    banners: true,
    blog: true,
    faqs: true,
    notifications: true,
    audit: true,
  });

  const [realBadges, setRealBadges] = useState<{
    ordersPending?: number;
    inventoryLow?: number;
    unreadNotifications?: number;
  }>({});

  const loadModuleConfigAndBadges = async () => {
    try {
      const [{ data: moduleBlock }, { data: pendingOrders }, { data: lowStock }, { data: unreadNotifs }] =
        await Promise.all([
          supabase.from("cms_content_blocks").select("content").eq("section_key", "admin_modules_config").maybeSingle(),
          supabase.from("orders").select("id").eq("status", "Pending"),
          supabase.from("products").select("id").lte("stock", 5),
          supabase.from("notifications").select("id").eq("read", false),
        ]);

      if (moduleBlock?.content) {
        try {
          const parsed = JSON.parse(moduleBlock.content);
          setModuleConfig((prev) => ({ ...prev, ...parsed }));
        } catch (e) {}
      }

      setRealBadges({
        ordersPending: pendingOrders?.length || 0,
        inventoryLow: lowStock?.length || 0,
        unreadNotifications: unreadNotifs?.length || 0,
      });
    } catch (err) {
      console.error("Error loading module config:", err);
    }
  };

  useEffect(() => {
    loadModuleConfigAndBadges();
    const handleUpdate = () => loadModuleConfigAndBadges();
    window.addEventListener("admin_modules_updated", handleUpdate);
    return () => window.removeEventListener("admin_modules_updated", handleUpdate);
  }, []);

  // Fallback sign in check if not admin
  if (!user || user.role !== "admin") {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
        <div className="surface-card max-w-sm p-10 text-center shadow-2xl rounded-3xl border bg-card">
          <img src={logo} alt="JSS" className="mx-auto h-12 w-12 rounded-xl mb-4" />
          <h1 className="text-2xl font-black tracking-tight text-foreground">Admin Portal Access</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Please sign in using an Administrator account to view the Enterprise Control Center.
          </p>
          <Button asChild className="mt-6 w-full rounded-full shadow-md font-bold">
            <Link to="/login">Go to Sign In</Link>
          </Button>
        </div>
      </div>
    );
  }

  const renderNavItems = (isMobile = false) => (
    <div className="space-y-6">
      {adminNavGroups.map((group) => {
        const visibleItems = group.items.filter((item) => {
          if (!item.moduleKey) return true;
          return moduleConfig[item.moduleKey] !== false;
        });

        if (visibleItems.length === 0) return null;

        return (
          <div key={group.groupLabel} className="space-y-1">
            {(!collapsed || isMobile) && (
              <p className="px-3 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest mb-1.5 select-none">
                {group.groupLabel}
              </p>
            )}
            {visibleItems.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? currentPath === "/admin" || currentPath === "/admin/"
                  : currentPath.startsWith(item.href);

              const badgeCount = item.badgeKey ? realBadges[item.badgeKey] : undefined;
              const hasBadge = typeof badgeCount === "number" && badgeCount > 0;

              const linkContent = (
                <Link
                  key={item.href + item.title}
                  to={item.href as never}
                  className={`group flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all select-none ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  } ${collapsed && !isMobile ? "justify-center px-2 py-2.5" : ""}`}
                >
                  <item.icon className={`h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"}`} />
                  {(!collapsed || isMobile) && (
                    <span className="flex-1 truncate">{item.title}</span>
                  )}
                  {(!collapsed || isMobile) && hasBadge && (
                    <span
                      className={`ml-auto px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                        isActive
                          ? "bg-white/20 text-white"
                          : item.badgeColor || "bg-muted text-muted-foreground"
                      }`}
                    >
                      {badgeCount}
                    </span>
                  )}
                </Link>
              );

            if (collapsed && !isMobile) {
              return (
                <TooltipProvider key={item.href + item.title} delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right" className="font-bold text-xs">
                      {item.title}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            }

            return linkContent;
          })}
        </div>
        );
      })}
    </div>
  );

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50/70 text-foreground font-sans antialiased flex flex-col">
      {/* GLOBAL SEARCH DIALOG */}
      <AdminGlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

      {/* TOP FIXED HEADER */}
      <header className="h-16 shrink-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4 shadow-xs">
        {/* Left Branding */}
        <div className="flex items-center gap-3">
          {/* Mobile Sheet Trigger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden rounded-xl">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-4 pt-6 bg-white">
              <div className="flex items-center gap-3 px-2 mb-6">
                <img src={logo} alt="JSS" className="h-8 w-8 rounded-lg" />
                <div>
                  <h2 className="font-display font-extrabold text-sm tracking-tight text-foreground">JSS ADMIN PORTAL</h2>
                  <p className="text-[10px] text-muted-foreground font-medium">John Stayte Services</p>
                </div>
              </div>
              <div className="max-h-[calc(100vh-100px)] overflow-y-auto pr-1 custom-scrollbar">
                {renderNavItems(true)}
              </div>
            </SheetContent>
          </Sheet>

          <Link to="/admin" className="flex items-center gap-3 group select-none">
            <img src={logo} alt="JSS Logo" className="h-9 w-9 rounded-xl shadow-xs shrink-0 group-hover:scale-105 transition-transform" />
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-sm tracking-tight text-foreground">JSS ADMIN PORTAL</span>
                <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary text-[9px] font-black uppercase tracking-wide">
                  Enterprise
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground font-medium -mt-0.5">John Stayte Services</p>
            </div>
          </Link>
        </div>

        {/* Center Global Search Trigger */}
        <div className="flex-1 max-w-md hidden md:block">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center justify-between gap-3 px-3.5 py-2 rounded-full border border-slate-200 bg-slate-50/80 hover:bg-slate-100/80 hover:border-slate-300 transition-all text-xs text-muted-foreground group"
          >
            <span className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
              <span>Search orders, products, customers...</span>
            </span>
            <kbd className="flex items-center gap-1 rounded bg-white px-2 py-0.5 text-[10px] font-bold border text-muted-foreground shadow-2xs">
              <span>⌘</span>K
            </kbd>
          </button>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Search Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchOpen(true)}
            className="md:hidden rounded-full hover:bg-slate-100"
          >
            <Search className="h-4 w-4 text-muted-foreground" />
          </Button>

          {/* Notifications */}
          <AdminNotificationsPopover />

          {/* Help Quick Link */}
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setHelpOpen(true)}
                  className="rounded-full hover:bg-slate-100 text-muted-foreground"
                >
                  <LifeBuoy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="font-semibold text-xs">Help & Documentation</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="h-5 w-[1px] bg-slate-200 mx-1 hidden sm:block" />

          {/* Admin User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 p-1 rounded-full hover:bg-slate-100 transition-colors focus:outline-none select-none">
                <Avatar className="h-8 w-8 border border-slate-200 shadow-2xs">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-primary text-primary-foreground font-black text-xs">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden xl:block text-left pr-1">
                  <p className="text-xs font-bold leading-tight text-foreground truncate max-w-[120px]">{user.name}</p>
                  <p className="text-[10px] font-medium text-muted-foreground leading-tight capitalize">Administrator</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5 shadow-xl border bg-white">
              <DropdownMenuLabel className="p-2">
                <p className="text-xs font-bold text-foreground">{user.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                <Link to="/admin/settings" className="flex items-center gap-2 text-xs font-medium">
                  <User className="h-4 w-4 text-muted-foreground" /> Admin Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                <Link to="/" target="_blank" className="flex items-center gap-2 text-xs font-medium">
                  <ExternalLink className="h-4 w-4 text-muted-foreground" /> View Customer Site
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  logout();
                  navigate({ to: "/" });
                }}
                className="rounded-xl cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 text-xs font-semibold"
              >
                <LogOut className="h-4 w-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* BODY WRAPPER */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* DESKTOP COLLAPSIBLE FIXED SIDEBAR */}
        <aside
          className={`hidden lg:flex flex-col h-full border-r border-slate-200/80 bg-white transition-all duration-300 relative z-20 shrink-0 ${
            collapsed ? "w-18" : "w-64"
          }`}
        >
          {/* Collapse Toggle Button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-6 z-30 h-6 w-6 rounded-full border border-slate-200 bg-white shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground transition-all hover:scale-110"
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>

          {/* INDEPENDENTLY SCROLLABLE SIDEBAR NAV */}
          <div className="flex-1 overflow-y-auto min-h-0 p-3.5 space-y-6 custom-scrollbar">
            {renderNavItems(false)}
          </div>

          {/* Bottom Sidebar Footer */}
          {!collapsed && (
            <div className="shrink-0 p-3.5 border-t border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/60 shadow-2xs">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-foreground truncate">JSS System Live</p>
                  <p className="text-[10px] text-muted-foreground truncate">v2.4 Enterprise Ops</p>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* INDEPENDENTLY SCROLLABLE MAIN CONTENT AREA */}
        <main className="flex-1 h-full min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-8 animate-rise">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

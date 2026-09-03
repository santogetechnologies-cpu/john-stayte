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
  FileText,
  Star,
  Mail,
  User,
  Menu,
  Home,
  Factory,
  Flame,
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
    items: [{ title: "Home", href: "/admin", icon: LayoutDashboard }],
  },
  {
    groupLabel: "OPERATIONS",
    items: [
      {
        title: "Orders",
        href: "/admin/orders",
        icon: ShoppingBag,
        badgeKey: "ordersPending",
        badgeColor: "bg-amber-100 text-amber-800 font-extrabold",
      },
      { title: "Deliveries", href: "/admin/deliveries", icon: Truck },
      { title: "Applications", href: "/admin/applications", icon: FileText },
      {
        title: "Inventory",
        href: "/admin/inventory",
        icon: PackageCheck,
        badgeKey: "inventoryLow",
        badgeColor: "bg-red-100 text-red-700 font-extrabold",
      },
      { title: "Invoices", href: "/admin/invoices", icon: FileText },
      { title: "Enquiries", href: "/admin/enquiries", icon: LifeBuoy },
      { title: "Customers", href: "/admin/customers", icon: Users },
    ],
  },
  {
    groupLabel: "CATALOG",
    items: [
      { title: "Products", href: "/admin/products", icon: Package },
      { title: "Categories", href: "/admin/categories", icon: Layers },
      { title: "Reviews", href: "/admin/reviews", icon: Star },
      { title: "Offers", href: "/admin/offers", icon: Tag, moduleKey: "offers" },
      { title: "Coupons", href: "/admin/coupons", icon: Ticket, moduleKey: "coupons" },
    ],
  },
  {
    groupLabel: "GAS CATALOG",
    items: [
      { title: "Domestic LPG", href: "/admin/order-gas/domestic", icon: Home },
      { title: "Commercial LPG", href: "/admin/order-gas/commercial", icon: Building2 },
      { title: "Bulk LPG", href: "/admin/order-gas/bulk", icon: Factory },
    ],
  },
  {
    groupLabel: "PEOPLE",
    items: [
      { title: "Managers", href: "/admin/managers", icon: UserCheck },
      { title: "Customers", href: "/admin/customers?section=people", icon: Users },
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
      { title: "Newsletter", href: "/admin/newsletter", icon: Mail },
    ],
  },
  {
    groupLabel: "SYSTEM",
    items: [
      {
        title: "Notifications",
        href: "/admin/notifications",
        icon: Bell,
        moduleKey: "notifications",
        badgeKey: "unreadNotifications",
        badgeColor: "bg-red-600 text-white font-extrabold",
      },
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
        } catch (e) { }
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

  if (!user || user.role !== "admin") {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 px-4 font-sans">
        <div className="surface-card max-w-sm p-10 text-center shadow-2xl rounded-3xl border border-slate-200 bg-white">
          <img src={logo} alt="JSS" className="mx-auto h-12 w-12 rounded-xl mb-4 shadow-sm" />
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Admin Portal Access</h1>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
            Please sign in using an Administrator account to view the Enterprise Control Center.
          </p>
          <Button asChild className="mt-6 w-full rounded-full shadow-md font-bold bg-red-600 hover:bg-red-700 text-white">
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
              <p className="px-3.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 select-none">
                {group.groupLabel}
              </p>
            )}
            {visibleItems.map((item) => {
              const searchStr = typeof routerState.location.search === "string" ? routerState.location.search : JSON.stringify(routerState.location.search || {});
              const hasPeopleSection = searchStr.includes("people");

              let isActive = false;
              if (item.href.includes("?")) {
                isActive = currentPath === item.href.split("?")[0] && hasPeopleSection;
              } else if (item.href === "/admin") {
                isActive = (currentPath === "/admin" || currentPath === "/admin/") && !hasPeopleSection;
              } else {
                isActive = currentPath === item.href && !hasPeopleSection;
              }

              const badgeCount = item.badgeKey ? realBadges[item.badgeKey] : undefined;
              const hasBadge = typeof badgeCount === "number" && badgeCount > 0;

              const linkContent = (
                <Link
                  key={group.groupLabel + "-" + item.title}
                  to={item.href as never}
                  className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 select-none ${
                    isActive
                      ? "bg-red-600 text-white font-extrabold shadow-md shadow-red-600/20"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                  } ${collapsed && !isMobile ? "justify-center px-2 py-2.5" : ""}`}
                >
                  <item.icon
                    className={`h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                      isActive ? "text-white" : "text-slate-400 group-hover:text-slate-700"
                    }`}
                  />
                  {(!collapsed || isMobile) && <span className="flex-1 truncate">{item.title}</span>}
                  {(!collapsed || isMobile) && hasBadge && (
                    <span
                      className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        isActive ? "bg-white/20 text-white" : item.badgeColor || "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {badgeCount}
                    </span>
                  )}
                </Link>
              );

              if (collapsed && !isMobile) {
                return (
                  <TooltipProvider key={group.groupLabel + "-" + item.title} delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                      <TooltipContent side="right" className="font-extrabold text-xs bg-slate-900 text-white">
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
    <div className="h-screen w-screen overflow-hidden bg-[#fafafd] text-slate-900 font-sans antialiased flex flex-col relative">
      {/* DECORATIVE AMBIENT GLASS BACKGROUND LAYERS (Sits behind UI, pointer-events-none) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Top-Left Soft Red Ambient Glow */}
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-red-500/12 via-rose-500/8 to-transparent blur-[120px]" />
        {/* Bottom-Right Translucent Glow */}
        <div className="absolute -bottom-40 -right-40 w-[750px] h-[750px] rounded-full bg-gradient-to-tl from-red-600/10 via-rose-400/6 to-transparent blur-[140px]" />
        {/* Center Ambient Diffuse Shape */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-r from-red-500/5 via-rose-400/8 to-red-500/5 blur-[130px]" />
      </div>

      {/* GLOBAL SEARCH DIALOG */}
      <AdminGlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

      {/* TOP FIXED GLASS HEADER */}
      <header className="h-16 shrink-0 z-40 border-b border-white/70 bg-white/65 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between gap-4 shadow-2xs relative">
        {/* Left Branding & Mobile Trigger */}
        <div className="flex items-center gap-3">
          {/* Mobile Sheet Trigger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden rounded-xl text-slate-600 hover:bg-white/80">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-4 pt-6 bg-white/90 backdrop-blur-2xl border-r border-white/80">
              <div className="flex items-center gap-3 px-2 mb-6">
                <img src={logo} alt="JSS" className="h-9 w-9 rounded-xl shadow-xs" />
                <div>
                  <h2 className="font-black text-sm tracking-tight text-slate-900 leading-none">JOHN STAYTE SERVICES</h2>
                  <span className="inline-block text-[9px] font-extrabold text-red-600 uppercase tracking-widest mt-1">ADMIN PORTAL</span>
                </div>
              </div>
              <div className="max-h-[calc(100vh-100px)] overflow-y-auto pr-1 custom-scrollbar">
                {renderNavItems(true)}
              </div>
            </SheetContent>
          </Sheet>

          {/* Desktop Logo Branding */}
          <Link to="/admin" className="flex items-center gap-3 group select-none">
            <img src={logo} alt="JSS Logo" className="h-9.5 w-9.5 rounded-xl shadow-xs shrink-0 group-hover:scale-105 transition-transform" />
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-tight text-slate-900 leading-none">JOHN STAYTE SERVICES</span>
                <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 border border-red-500/20 text-[9px] font-black uppercase tracking-wider shadow-2xs">
                  ADMIN PORTAL
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Enterprise Control Center</p>
            </div>
          </Link>
        </div>

        {/* Center Global Search Trigger */}
        <div className="flex-1 max-w-md hidden md:block">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center justify-between gap-3 px-4 py-2 rounded-full border border-white/80 bg-white/60 backdrop-blur-md hover:bg-white/90 hover:border-red-500/40 hover:shadow-xs transition-all text-xs text-slate-500 group cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Search className="h-4 w-4 text-slate-400 group-hover:text-red-600 transition-colors" />
              <span>Search orders, products, inventory, customers...</span>
            </span>
            <kbd className="flex items-center gap-1 rounded-md bg-white/80 px-2 py-0.5 text-[10px] font-extrabold border border-slate-200 text-slate-500 shadow-2xs">
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
            className="md:hidden rounded-full hover:bg-white/80 text-slate-600"
          >
            <Search className="h-4 w-4" />
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
                  className="rounded-full hover:bg-white/80 text-slate-500"
                >
                  <LifeBuoy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="font-bold text-xs bg-slate-900 text-white">
                Help & Documentation
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="h-5 w-[1px] bg-slate-200/80 mx-1 hidden sm:block" />

          {/* Admin User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 p-1 rounded-full hover:bg-white/80 transition-colors focus:outline-none select-none cursor-pointer">
                <Avatar className="h-8.5 w-8.5 border border-white/80 shadow-2xs">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-gradient-to-br from-red-600 to-rose-600 text-white font-black text-xs shadow-xs">
                    {(typeof user?.name === "string" ? user.name : "A").charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden xl:block text-left pr-1">
                  <p className="text-xs font-extrabold leading-tight text-slate-900 truncate max-w-[120px]">
                    {typeof user?.name === "string" ? user.name : "Administrator"}
                  </p>
                  <p className="text-[10px] font-semibold text-slate-500 leading-tight">Administrator</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5 shadow-xl border border-white/80 bg-white/95 backdrop-blur-2xl">
              <DropdownMenuLabel className="p-2">
                <p className="text-xs font-bold text-slate-900">
                  {typeof user?.name === "string" ? user.name : "Administrator"}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {typeof user?.email === "string" ? user.email : ""}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                <Link to="/admin/settings" className="flex items-center gap-2 text-xs font-semibold">
                  <Settings className="h-4 w-4 text-slate-400" /> Admin Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                <Link to="/" target="_blank" className="flex items-center gap-2 text-xs font-semibold">
                  <ExternalLink className="h-4 w-4 text-slate-400" /> View Customer Site
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  logout();
                  navigate({ to: "/" });
                }}
                className="rounded-xl cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 text-xs font-extrabold"
              >
                <LogOut className="h-4 w-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* BODY WRAPPER */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative z-10">
        {/* DESKTOP COLLAPSIBLE FROSTED GLASS SIDEBAR */}
        <aside
          className={`hidden lg:flex flex-col h-full border-r border-white/70 bg-white/60 backdrop-blur-2xl transition-all duration-300 relative z-20 shrink-0 shadow-2xs ${collapsed ? "w-20" : "w-64"
            }`}
        >
          {/* Collapse Toggle Button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-6 z-30 h-6 w-6 rounded-full border border-white/80 bg-white/90 shadow-md flex items-center justify-center text-slate-500 hover:text-slate-900 hover:scale-110 transition-all cursor-pointer"
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
            <div className="shrink-0 p-3.5 border-t border-white/60 bg-white/40">
              <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-white/80 border border-white/90 shadow-2xs backdrop-blur-md">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold text-slate-900 truncate">JSS Enterprise System</p>
                  <p className="text-[10px] text-slate-500 truncate font-semibold">Live Operational Status</p>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* MAIN DASHBOARD CONTENT WORKSPACE */}
        <main className="flex-1 h-full min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8 relative z-10">
          <div className="w-full max-w-[1600px] mx-auto space-y-8 animate-rise">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

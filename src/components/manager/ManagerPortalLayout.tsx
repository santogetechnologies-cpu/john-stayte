import { useState, useEffect, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ShoppingBag,
  Truck,
  PackageCheck,
  Users,
  UserCheck,
  HelpCircle,
  MessageSquare,
  BarChart3,
  TrendingUp,
  Bell,
  User,
  Settings,
  Search,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LifeBuoy,
  Menu,
  Clock,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Layers,
  AlertOctagon,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { ManagerGlobalSearch } from "./ManagerGlobalSearch";
import { ManagerNotificationsPopover } from "./ManagerNotificationsPopover";

import type { LucideIcon } from "lucide-react";

type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon | React.ElementType;
  badgeKey?:
    | "pendingOrders"
    | "processingOrders"
    | "unassignedDeliveries"
    | "outForDelivery"
    | "delayedDeliveries"
    | "lowStock"
    | "openEnquiries";
};

type NavGroup = {
  groupLabel: string;
  items: NavItem[];
};

const managerNavGroups: NavGroup[] = [
  {
    groupLabel: "OVERVIEW",
    items: [{ title: "Dashboard", href: "/manager", icon: LayoutDashboard }],
  },
  {
    groupLabel: "ORDERS & DISPATCH",
    items: [
      { title: "Orders Assigned", href: "/manager/orders", icon: ShoppingBag },
      {
        title: "Pending Approval",
        href: "/manager/orders?status=Pending",
        icon: Clock,
        badgeKey: "pendingOrders",
      },
      {
        title: "Processing",
        href: "/manager/orders?status=Processing",
        icon: PackageCheck,
        badgeKey: "processingOrders",
      },
      {
        title: "Delivery Assignment",
        href: "/manager/delivery-assignment",
        icon: UserCheck,
        badgeKey: "unassignedDeliveries",
      },
      {
        title: "Drivers",
        href: "/manager/delivery-agents",
        icon: Users,
      },
    ],
  },
  {
    groupLabel: "LOGISTICS & DELIVERIES",
    items: [
      { title: "All Deliveries", href: "/manager/deliveries", icon: Truck },
      {
        title: "Out for Delivery",
        href: "/manager/deliveries?status=out_for_delivery",
        icon: Navigation,
        badgeKey: "outForDelivery",
      },
      {
        title: "Delivered Today",
        href: "/manager/deliveries?status=delivered",
        icon: CheckCircle2,
      },
      {
        title: "Delayed Deliveries",
        href: "/manager/deliveries?status=delayed",
        icon: AlertTriangle,
        badgeKey: "delayedDeliveries",
      },
    ],
  },
  {
    groupLabel: "INVENTORY & STOCK",
    items: [
      { title: "Depot Inventory", href: "/manager/inventory", icon: Layers },
      {
        title: "Low Stock Items",
        href: "/manager/inventory?status=low_stock",
        icon: AlertOctagon,
        badgeKey: "lowStock",
      },
    ],
  },
  {
    groupLabel: "CUSTOMERS & SUPPORT",
    items: [
      { title: "Customers", href: "/manager/customers", icon: Users },
      { title: "All Enquiries", href: "/manager/enquiries", icon: HelpCircle },
      {
        title: "Open Enquiries",
        href: "/manager/enquiries?status=Open",
        icon: MessageSquare,
        badgeKey: "openEnquiries",
      },
      { title: "Support Tickets", href: "/manager/support", icon: LifeBuoy },
    ],
  },
  {
    groupLabel: "PERFORMANCE",
    items: [
      { title: "Reports", href: "/manager/reports", icon: BarChart3 },
      { title: "My Performance", href: "/manager/performance", icon: TrendingUp },
    ],
  },
  {
    groupLabel: "SYSTEM",
    items: [
      { title: "Notifications", href: "/manager/notifications", icon: Bell },
      { title: "Profile", href: "/manager/profile", icon: User },
      { title: "Settings", href: "/manager/settings", icon: Settings },
    ],
  },
];

export function ManagerPortalLayout({ children }: { children: ReactNode }) {
  const { user, authLoading, logout } = useStore();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Live real-time Supabase counts for sidebar KPI badges
  const [counts, setCounts] = useState<{
    pendingOrders?: number;
    processingOrders?: number;
    unassignedDeliveries?: number;
    outForDelivery?: number;
    delayedDeliveries?: number;
    lowStock?: number;
    openEnquiries?: number;
  }>({});

  const loadSidebarCounts = async () => {
    try {
      const [
        { count: pendingCount },
        { data: processingData },
        { count: unassignedCount },
        { count: delayedCount },
        { count: outCount },
        { data: lowStockData },
        { count: openEnqCount },
      ] = await Promise.all([
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "Pending"),
        supabase.from("orders").select("id, status").or("status.eq.Approved,status.eq.Packed"),
        supabase
          .from("delivery_assignments")
          .select("*", { count: "exact", head: true })
          .or("driver_name.eq.Unassigned,agent_id.is.null"),
        supabase
          .from("delivery_assignments")
          .select("*", { count: "exact", head: true })
          .eq("status", "Delayed"),
        supabase
          .from("delivery_assignments")
          .select("*", { count: "exact", head: true })
          .eq("status", "Out for Delivery"),
        supabase.from("products").select("id, stock").gt("stock", 0).lte("stock", 10),
        supabase
          .from("support_tickets")
          .select("*", { count: "exact", head: true })
          .eq("status", "Open"),
      ]);

      setCounts({
        pendingOrders: pendingCount || 0,
        processingOrders: processingData?.length || 0,
        unassignedDeliveries: unassignedCount || 0,
        delayedDeliveries: delayedCount || 0,
        outForDelivery: outCount || 0,
        lowStock: lowStockData?.length || 0,
        openEnquiries: openEnqCount || 0,
      });
    } catch (e) {
      console.error("Failed to load sidebar counts:", e);
    }
  };

  // Guard: Auto redirect to login if not authenticated as manager or admin
  useEffect(() => {
    if (!authLoading) {
      if (!user || (user.role !== "manager" && user.role !== "admin")) {
        navigate({ to: "/login", search: { redirect: currentPath || "/manager" } });
      }
    }
  }, [user, authLoading, navigate, currentPath]);

  useEffect(() => {
    if (user && (user.role === "manager" || user.role === "admin")) {
      loadSidebarCounts();

      const handleModulesUpdated = () => loadSidebarCounts();
      window.addEventListener("admin_modules_updated", handleModulesUpdated);

      const channel = supabase
        .channel("manager_sidebar_realtime_sync")
        .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () =>
          loadSidebarCounts(),
        )
        .on("postgres_changes", { event: "*", schema: "public", table: "delivery_assignments" }, () =>
          loadSidebarCounts(),
        )
        .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () =>
          loadSidebarCounts(),
        )
        .on("postgres_changes", { event: "*", schema: "public", table: "inventory" }, () =>
          loadSidebarCounts(),
        )
        .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () =>
          loadSidebarCounts(),
        )
        .subscribe();

      return () => {
        window.removeEventListener("admin_modules_updated", handleModulesUpdated);
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  if (authLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 px-4 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-xs font-semibold text-slate-500">Verifying manager authorization...</p>
        </div>
      </div>
    );
  }

  // Protect Manager Portal: only managers and admins are allowed
  if (!user || (user.role !== "manager" && user.role !== "admin")) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 px-4 font-sans">
        <div className="surface-card max-w-sm p-8 text-center shadow-2xl rounded-3xl border border-slate-200 bg-white">
          <img src={logo} alt="JSS" className="mx-auto h-12 w-12 rounded-xl mb-4 shadow-sm" />
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            Manager Access Required
          </h1>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
            Please sign in using an Operations Manager or Administrator account to access the
            Manager Operations Portal.
          </p>
          <Button
            asChild
            className="mt-6 w-full rounded-full shadow-md font-bold bg-primary hover:bg-primary/90 text-white"
          >
            <Link to="/login" search={{ redirect: currentPath || "/manager" }}>
              Sign In to Manager Portal
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const managerName = user.name || "Manager";
  const managerEmail = user.email || "";

  const isItemActive = (href: string) => {
    const [itemBase, itemQueryStr] = href.split("?");
    const itemParams = new URLSearchParams(itemQueryStr || "");
    const itemStatus = itemParams.get("status")?.toLowerCase() || null;

    if (itemBase === "/manager") {
      return currentPath === "/manager" || currentPath === "/manager/";
    }

    if (currentPath !== itemBase) {
      return false;
    }

    // Inspect live router query search
    const currentSearchStr =
      typeof window !== "undefined" ? window.location.search : routerState.location.searchStr || "";
    const currentParams = new URLSearchParams(currentSearchStr);
    const currentStatus = currentParams.get("status")?.toLowerCase() || null;

    if (itemStatus) {
      const normItem = itemStatus.replace(/_/g, " ");
      const normCurrent = (currentStatus || "").replace(/_/g, " ");
      return normItem === normCurrent;
    }

    return !currentStatus || currentStatus === "all";
  };

  const renderNavItems = (isMobile = false) => (
    <div className="space-y-6">
      {managerNavGroups.map((group) => (
        <div key={group.groupLabel} className="space-y-1">
          {(!collapsed || isMobile) && (
            <p className="px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 select-none">
              {group.groupLabel}
            </p>
          )}
          {group.items.map((item) => {
            const isActive = isItemActive(item.href);
            const badgeCount = item.badgeKey ? counts[item.badgeKey] : undefined;

            const linkContent = (
              <Link
                key={item.href + item.title}
                to={item.href as never}
                className={`group flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all select-none ${
                  isActive
                    ? "bg-red-600 text-white font-extrabold shadow-md shadow-red-600/20"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                } ${collapsed && !isMobile ? "justify-center px-2 py-2.5" : ""}`}
              >
                <item.icon
                  className={`h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                    isActive
                      ? "text-white"
                      : "text-slate-500 group-hover:text-slate-900"
                  }`}
                />
                {(!collapsed || isMobile) && (
                  <>
                    <span className="flex-1 truncate">{item.title}</span>
                    {badgeCount !== undefined && badgeCount > 0 && (
                      <span
                        className={`ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          isActive
                            ? "bg-white/25 text-white"
                            : "bg-red-50 text-red-700 border border-red-200/60"
                        }`}
                      >
                        {badgeCount}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );

            if (collapsed && !isMobile) {
              return (
                <TooltipProvider key={item.href + item.title} delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right" className="font-bold text-xs bg-slate-900 text-white">
                      {item.title}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            }

            return linkContent;
          })}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen w-screen bg-[#fafafd] text-slate-800 font-sans antialiased flex flex-col relative selection:bg-red-500/20 selection:text-red-900">
      {/* Dynamic Ambient Background Glow Layers */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-red-600/6 via-rose-500/4 to-transparent blur-3xl" />
        <div className="absolute top-[20%] right-[-5%] w-[600px] h-[600px] rounded-full bg-gradient-to-bl from-rose-500/5 via-red-500/3 to-transparent blur-3xl" />
        <div className="absolute bottom-[-10%] left-[30%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-slate-200/40 via-red-500/2 to-transparent blur-3xl" />
      </div>

      {/* GLOBAL SEARCH DIALOG */}
      <ManagerGlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

      {/* TOP HEADER */}
      <header className="sticky top-0 z-40 h-16 border-b border-white/70 bg-white/65 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between gap-4 shadow-2xs">
        {/* Left Branding */}
        <div className="flex items-center gap-3">
          {/* Mobile Sheet Trigger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden rounded-full hover:bg-white/80">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-4 pt-6 bg-white/95 backdrop-blur-2xl border-r border-white/80">
              <div className="flex items-center gap-3 px-2 mb-6">
                <img src={logo} alt="JSS" className="h-8 w-8 rounded-xl shadow-2xs" />
                <div>
                  <h2 className="font-display font-black text-sm tracking-tight text-slate-900">
                    JSS MANAGER PORTAL
                  </h2>
                  <p className="text-[10px] text-slate-500 font-medium">
                    John Stayte Services
                  </p>
                </div>
              </div>
              <div className="max-h-[calc(100vh-100px)] overflow-y-auto pr-1">
                {renderNavItems(true)}
              </div>
            </SheetContent>
          </Sheet>

          <Link to="/manager" className="flex items-center gap-3 group select-none">
            <img
              src={logo}
              alt="JSS Logo"
              className="h-9 w-9 rounded-xl shadow-xs shrink-0 group-hover:scale-105 transition-transform"
            />
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-sm tracking-tight text-slate-900">
                  JSS MANAGER PORTAL
                </span>
                <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200/80 text-[9px] font-black uppercase tracking-wide">
                  Operations
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium -mt-0.5">
                John Stayte Services
              </p>
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
              <span>Search orders, customers, enquiries...</span>
            </span>
            <kbd className="flex items-center gap-1 rounded-md bg-white/80 px-2 py-0.5 text-[10px] font-extrabold border border-slate-200 text-slate-500 shadow-2xs">
              <span>⌘</span>K
            </kbd>
          </button>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchOpen(true)}
            className="md:hidden rounded-full hover:bg-white/80 text-slate-600"
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Notifications */}
          <ManagerNotificationsPopover />

          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-white/80 text-slate-500"
                >
                  <LifeBuoy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="font-bold text-xs bg-slate-900 text-white">
                Manager Ops Support
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="h-5 w-[1px] bg-slate-200/80 mx-1 hidden sm:block" />

          {/* Manager User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 p-1 rounded-full hover:bg-white/80 transition-colors focus:outline-none select-none cursor-pointer">
                <Avatar className="h-8.5 w-8.5 border border-white/80 shadow-2xs">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-gradient-to-br from-red-600 to-rose-600 text-white font-black text-xs shadow-xs">
                    {managerName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden xl:block text-left pr-1">
                  <p className="text-xs font-extrabold leading-tight text-slate-900 truncate max-w-[120px]">
                    {managerName}
                  </p>
                  <p className="text-[10px] font-semibold text-slate-500 leading-tight">
                    Operations Manager
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 rounded-2xl p-1.5 shadow-xl border border-white/80 bg-white/95 backdrop-blur-2xl"
            >
              <DropdownMenuLabel className="p-2">
                <p className="text-xs font-bold text-slate-900">{managerName}</p>
                <p className="text-[11px] text-slate-500 truncate">{managerEmail}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                <Link to="/manager/profile" className="flex items-center gap-2 text-xs font-semibold">
                  <User className="h-4 w-4 text-slate-400" /> My Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                <Link
                  to="/manager/settings"
                  className="flex items-center gap-2 text-xs font-semibold"
                >
                  <Settings className="h-4 w-4 text-slate-400" /> Manager Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                <Link
                  to="/"
                  target="_blank"
                  className="flex items-center gap-2 text-xs font-semibold"
                >
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
      <div className="flex-1 flex min-h-0 relative z-10">
        {/* DESKTOP COLLAPSIBLE FROSTED GLASS SIDEBAR */}
        <aside
          className={`hidden lg:flex flex-col border-r border-white/70 bg-white/60 backdrop-blur-2xl transition-all duration-300 relative z-20 shrink-0 shadow-2xs ${
            collapsed ? "w-20" : "w-64"
          }`}
        >
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-6 z-30 h-6 w-6 rounded-full border border-white/80 bg-white/90 shadow-md flex items-center justify-center text-slate-500 hover:text-slate-900 hover:scale-110 transition-all cursor-pointer"
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" />
            )}
          </button>

          <div className="flex-1 overflow-y-auto p-3.5 space-y-6">{renderNavItems(false)}</div>

          {!collapsed && (
            <div className="shrink-0 p-3.5 border-t border-white/60 bg-white/40">
              <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-white/80 border border-white/90 shadow-2xs backdrop-blur-md">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold text-slate-900 truncate">
                    Fromebridge Station
                  </p>
                  <p className="text-[10px] text-slate-500 truncate font-semibold">Depot Ops Active</p>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8 relative z-10">
          <div className="max-w-7xl mx-auto space-y-8 animate-rise">{children}</div>
        </main>
      </div>
    </div>
  );
}

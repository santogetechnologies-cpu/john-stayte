import { useState, useEffect, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ShoppingBag,
  Clock,
  PackageCheck,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  Layers,
  Repeat,
  FileCheck2,
  FileSpreadsheet,
  Bell,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Menu,
  MapPin,
  Building2,
  AlertTriangle,
  QrCode,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import {
  fetchRealBranchKpiCounts,
  isPendingBranchAssignment,
  type BranchKpiCounts,
} from "@/lib/branch-service";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon | React.ElementType;
  badgeKey?: keyof BranchKpiCounts;
};

type NavGroup = {
  groupLabel: string;
  items: NavItem[];
};

const branchNavGroups: NavGroup[] = [
  {
    groupLabel: "OVERVIEW",
    items: [{ title: "Dashboard", href: "/branch", icon: LayoutDashboard }],
  },
  {
    groupLabel: "ORDER MANAGEMENT",
    items: [
      {
        title: "New Orders",
        href: "/branch/orders?status=new",
        icon: Clock,
        badgeKey: "newOrders",
      },
      {
        title: "Preparing Orders",
        href: "/branch/orders?status=preparing",
        icon: PackageCheck,
        badgeKey: "preparing",
      },
      {
        title: "Ready for Collection",
        href: "/branch/orders?status=ready",
        icon: CheckCircle2,
        badgeKey: "readyForCollection",
      },
      {
        title: "Awaiting Customer",
        href: "/branch/orders?status=awaiting",
        icon: AlertCircle,
        badgeKey: "awaitingCustomer",
      },
      {
        title: "On Hold",
        href: "/branch/orders?status=on_hold",
        icon: PauseCircle,
        badgeKey: "onHold",
      },
      {
        title: "Completed Orders",
        href: "/branch/orders?status=completed",
        icon: CheckCircle2,
        badgeKey: "completedToday",
      },
      {
        title: "All Branch Orders",
        href: "/branch/orders",
        icon: ShoppingBag,
      },
    ],
  },
  {
    groupLabel: "CYLINDER MANAGEMENT",
    items: [
      { title: "Branch Stock", href: "/branch/stock", icon: Layers },
      { title: "Cylinder Exchange History", href: "/branch/exchange-history", icon: Repeat },
    ],
  },
  {
    groupLabel: "REPORTS",
    items: [
      { title: "Collection History", href: "/branch/collection-history", icon: FileCheck2 },
      { title: "Daily Handover Report", href: "/branch/daily-report", icon: FileSpreadsheet },
    ],
  },
  {
    groupLabel: "ACCOUNT",
    items: [
      { title: "Notifications", href: "/branch/notifications", icon: Bell },
      { title: "My Profile", href: "/branch/profile", icon: User },
    ],
  },
];

export function BranchPortalLayout({ children }: { children: ReactNode }) {
  const { user, authLoading, logout } = useStore();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const [collapsed, setCollapsed] = useState(false);
  const [counts, setCounts] = useState<BranchKpiCounts>({
    newOrders: 0,
    preparing: 0,
    readyForCollection: 0,
    awaitingCustomer: 0,
    onHold: 0,
    completedToday: 0,
  });

  const branchName = user?.assignedBranch || "Pending Confirmation";
  const isBranchPending = isPendingBranchAssignment(user?.assignedBranch);

  useEffect(() => {
    let isMounted = true;
    async function loadCounts() {
      if (user && (user.role === "branch_staff" || user.role === "admin")) {
        const res = await fetchRealBranchKpiCounts(user.assignedBranch, user.assignedBranchId);
        if (isMounted) {
          setCounts(res);
        }
      }
    }
    loadCounts();

    if (user && (user.role === "branch_staff" || user.role === "admin") && !isBranchPending) {
      const channel = supabase
        .channel("branch_sidebar_kpi_sync")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
          },
          () => {
            loadCounts();
          },
        )
        .subscribe();

      return () => {
        isMounted = false;
        supabase.removeChannel(channel);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [user, isBranchPending]);

  // Guard: Auto redirect to login if not authenticated as branch_staff or admin
  useEffect(() => {
    if (!authLoading) {
      if (!user || (user.role !== "branch_staff" && user.role !== "admin")) {
        navigate({ to: "/login", search: { redirect: currentPath || "/branch" } });
      }
    }
  }, [user, authLoading, navigate, currentPath]);

  if (authLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 px-4 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#374151] border-t-transparent" />
          <p className="text-xs font-semibold text-slate-500">Verifying branch staff authorization...</p>
        </div>
      </div>
    );
  }

  // Unauthorized Access Gate
  if (!user || (user.role !== "branch_staff" && user.role !== "admin")) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 px-4 font-sans">
        <div className="surface-card max-w-sm p-8 text-center shadow-2xl rounded-3xl border border-slate-200 bg-white">
          <img src={logo} alt="JSS" className="mx-auto h-12 w-12 rounded-xl mb-4 shadow-sm" />
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            Branch Staff Access Required
          </h1>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
            Please sign in using a verified Branch Staff or Administrator account to access the Branch Operations Portal.
          </p>
          <Button
            asChild
            className="mt-6 w-full rounded-full shadow-md font-bold bg-[#374151] hover:bg-[#1f2937] text-white"
          >
            <Link to="/login" search={{ redirect: currentPath || "/branch" }}>
              Sign In to Branch Portal
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const staffName = user.name || "Branch Staff";
  const staffEmail = user.email || "";

  const isItemActive = (href: string) => {
    const [itemBase, itemQueryStr] = href.split("?");
    const itemParams = new URLSearchParams(itemQueryStr || "");
    const itemStatus = itemParams.get("status")?.toLowerCase() || null;

    if (itemBase === "/branch") {
      return currentPath === "/branch" || currentPath === "/branch/";
    }

    if (currentPath !== itemBase) {
      return false;
    }

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
      {branchNavGroups.map((group) => (
        <div key={group.groupLabel} className="space-y-1">
          {(!collapsed || isMobile) && (
            <p className="px-3.5 text-[10px] font-black text-slate-400/90 uppercase tracking-widest mb-1.5 select-none">
              {group.groupLabel}
            </p>
          )}
          {group.items.map((item) => {
            const isActive = isItemActive(item.href);
            const badgeCount = item.badgeKey ? counts[item.badgeKey] : undefined;

            const linkContent = (
              <Link
                key={group.groupLabel + "-" + item.title}
                to={item.href as never}
                className={`group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 select-none ${
                  isActive
                    ? "bg-gradient-to-r from-red-600 via-red-600 to-rose-600 text-white font-black shadow-[0_4px_16px_rgba(225,29,72,0.28),inset_0_1px_1px_rgba(255,255,255,0.3)] border border-red-500/40"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60 hover:backdrop-blur-md hover:shadow-2xs border border-transparent hover:border-white/80"
                } ${collapsed && !isMobile ? "justify-center px-2 py-2.5" : ""}`}
              >
                <item.icon
                  className={`h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                    isActive ? "text-white" : "text-slate-400 group-hover:text-slate-700"
                  }`}
                />
                {(!collapsed || isMobile) && (
                  <>
                    <span className="flex-1 truncate">{item.title}</span>
                    {badgeCount !== undefined && badgeCount > 0 && (
                      <span
                        className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-black ${
                          isActive
                            ? "bg-white/20 text-white backdrop-blur-xs border border-white/25 shadow-2xs"
                            : "bg-red-50 text-red-700 border border-red-200/80 shadow-2xs"
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
      ))}
    </div>
  );

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#fafafd] text-slate-900 font-sans antialiased flex flex-col relative">
      {/* DECORATIVE AMBIENT GLASS BACKGROUND LAYERS (Sits behind workspace & sidebar, pointer-events-none) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -left-20 w-[550px] h-[550px] rounded-full bg-gradient-to-br from-red-500/8 via-rose-500/5 to-transparent blur-[140px]" />
        <div className="absolute -bottom-40 -right-40 w-[750px] h-[750px] rounded-full bg-gradient-to-tl from-slate-400/5 via-slate-300/3 to-transparent blur-[140px]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-r from-red-500/4 via-rose-400/5 to-red-500/4 blur-[130px]" />
      </div>

      {/* TOP FIXED GLASS HEADER */}
      <header className="h-16 shrink-0 z-40 border-b border-white/70 bg-white/65 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between gap-4 shadow-2xs relative">
        {/* Left Branding & Mobile Trigger */}
        <div className="flex items-center gap-3">
          {/* Mobile Navigation Drawer Trigger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden rounded-xl text-slate-600 hover:bg-white/80">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-4 pt-6 bg-white/90 backdrop-blur-2xl border-r border-white/80 shadow-2xl">
              <div className="flex items-center gap-3 px-2 mb-6">
                <img src={logo} alt="JSS" className="h-9 w-9 rounded-xl shadow-xs" />
                <div>
                  <h2 className="font-black text-sm tracking-tight text-slate-900 leading-none">
                    JOHN STAYTE SERVICES
                  </h2>
                  <span className="inline-block text-[9px] font-extrabold text-[#4B5563] uppercase tracking-widest mt-1">
                    BRANCH STAFF PORTAL
                  </span>
                </div>
              </div>
              <div className="max-h-[calc(100vh-100px)] overflow-y-auto pr-1 custom-scrollbar">
                {renderNavItems(true)}
              </div>
            </SheetContent>
          </Sheet>

          {/* Desktop Logo Branding */}
          <Link to="/branch" className="flex items-center gap-3 group select-none">
            <img
              src={logo}
              alt="JSS Logo"
              className="h-9.5 w-9.5 rounded-xl shadow-xs shrink-0 group-hover:scale-105 transition-transform"
            />
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-tight text-slate-900 leading-none">
                  JOHN STAYTE SERVICES
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB] text-[9px] font-black uppercase tracking-wider shadow-2xs">
                  BRANCH PORTAL
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                Click &amp; Collect Operations
              </p>
            </div>
          </Link>
        </div>

        {/* Center: Prominent & Refined Assigned Branch Badge */}
        <div className="flex items-center">
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all backdrop-blur-md shadow-2xs ${
              isBranchPending
                ? "bg-[#FFF7E6] text-[#92400E] border-[#FDE68A]"
                : "bg-emerald-50/90 text-emerald-900 border-emerald-300/80"
            }`}
          >
            <MapPin className={`h-3.5 w-3.5 shrink-0 ${isBranchPending ? "text-[#D97706]" : "text-emerald-600"}`} />
            <span className="hidden md:inline text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Branch:</span>
            <span className="font-extrabold text-slate-900 truncate max-w-[200px] sm:max-w-[280px]">
              {branchName}
            </span>
            {isBranchPending && (
              <span className="ml-1 text-[9px] bg-[#FDE68A] text-[#92400E] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wide">
                Pending
              </span>
            )}
          </div>
        </div>

        {/* Right Header Quick Actions & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notifications Quick Link */}
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/branch/notifications">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative rounded-full hover:bg-white/80 text-slate-600 h-9 w-9"
                  >
                    <Bell className="h-4 w-4" />
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="font-bold text-xs bg-slate-900 text-white">
                Branch Alerts &amp; Notifications
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="h-5 w-[1px] bg-slate-200/80 mx-1 hidden sm:block" />

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 p-1 rounded-full hover:bg-white/80 transition-colors focus:outline-none select-none cursor-pointer">
                <Avatar className="h-8.5 w-8.5 border border-white/80 shadow-2xs">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-gradient-to-br from-[#374151] to-[#1f2937] text-white font-black text-xs shadow-xs">
                    {staffName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden xl:block text-left pr-1">
                  <p className="text-xs font-extrabold leading-tight text-slate-900 truncate max-w-[130px]">
                    {staffName}
                  </p>
                  <p className="text-[10px] font-semibold text-slate-500 leading-tight">
                    Branch Staff
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 rounded-2xl p-1.5 shadow-xl border border-white/80 bg-white/95 backdrop-blur-2xl"
            >
              <DropdownMenuLabel className="p-2">
                <p className="text-xs font-bold text-slate-900">{staffName}</p>
                <p className="text-[11px] text-slate-500 truncate">{staffEmail}</p>
                <p className="text-[10px] text-[#4B5563] font-semibold mt-1">
                  📍 {branchName}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                <Link to="/branch/profile" className="flex items-center gap-2 text-xs font-semibold">
                  <User className="h-4 w-4 text-slate-400" /> My Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                <Link to="/branch/notifications" className="flex items-center gap-2 text-xs font-semibold">
                  <Bell className="h-4 w-4 text-slate-400" /> Branch Notifications
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
                  navigate({ to: "/login" });
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
        {/* DESKTOP COLLAPSIBLE FROSTED GLASS SIDEBAR (Matching Admin Portal) */}
        <aside
          className={`hidden lg:flex flex-col h-full border-r border-white/80 bg-white/55 backdrop-blur-2xl transition-all duration-300 relative z-20 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] ${
            collapsed ? "w-20" : "w-64"
          }`}
        >
          {/* Collapse Toggle Button - Floating on edge like Admin Portal */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-6 z-30 h-6 w-6 rounded-full border border-white/90 bg-white/95 shadow-md flex items-center justify-center text-slate-500 hover:text-slate-900 hover:scale-110 transition-all cursor-pointer backdrop-blur-md"
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" />
            )}
          </button>

          {/* INDEPENDENTLY SCROLLABLE SIDEBAR NAV */}
          <div className="flex-1 overflow-y-auto min-h-0 p-3.5 space-y-6 custom-scrollbar">
            {renderNavItems(false)}
          </div>

          {/* Bottom Sidebar Footer (Matching Admin Portal) */}
          {!collapsed && (
            <div className="shrink-0 p-3.5 border-t border-white/70 bg-white/30 backdrop-blur-md">
              <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-white/75 border border-white/90 shadow-[0_4px_16px_rgba(0,0,0,0.03)] backdrop-blur-xl">
                <div className="relative flex items-center justify-center shrink-0">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${
                      isBranchPending ? "bg-[#D97706]" : "bg-emerald-500"
                    }`}
                  />
                  <div
                    className={`absolute inset-0 rounded-full animate-ping ${
                      isBranchPending ? "bg-[#D97706]/40" : "bg-emerald-400/50"
                    }`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-black text-slate-900 truncate tracking-tight">
                    {isBranchPending ? "Assignment Pending" : "Live Shift Active"}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate font-semibold leading-tight mt-0.5">
                    {branchName}
                  </p>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* MAIN DASHBOARD CONTENT WORKSPACE */}
        <main className="flex-1 h-full min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8 relative z-10 custom-scrollbar">
          <div className="w-full max-w-[1600px] mx-auto space-y-8 animate-rise">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}


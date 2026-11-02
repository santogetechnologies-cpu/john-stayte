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
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
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
            className="mt-6 w-full rounded-full shadow-md font-bold bg-amber-600 hover:bg-amber-700 text-white"
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
                    ? "bg-amber-600 text-white font-extrabold shadow-md shadow-amber-600/20"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                } ${collapsed && !isMobile ? "justify-center px-2 py-2.5" : ""}`}
              >
                <item.icon
                  className={`h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                    isActive ? "text-white" : "text-slate-500 group-hover:text-slate-900"
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
                            : "bg-amber-50 text-amber-800 border border-amber-200/60"
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
    <div className="min-h-screen w-screen bg-[#fafafd] text-slate-800 font-sans antialiased flex flex-col relative selection:bg-amber-500/20 selection:text-amber-900">
      {/* Dynamic Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-amber-600/5 via-orange-500/3 to-transparent blur-3xl" />
        <div className="absolute top-[20%] right-[-5%] w-[600px] h-[600px] rounded-full bg-gradient-to-bl from-orange-500/5 via-amber-500/3 to-transparent blur-3xl" />
      </div>

      {/* TOP PORTAL HEADER */}
      <header className="sticky top-0 z-40 h-16 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between gap-4 shadow-2xs">
        {/* Left Branding & Indicator */}
        <div className="flex items-center gap-3">
          {/* Mobile Navigation Drawer Trigger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden rounded-full hover:bg-white/80">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-4 pt-6 bg-white/95 backdrop-blur-2xl border-r border-slate-200">
              <div className="flex items-center gap-3 px-2 mb-6">
                <img src={logo} alt="JSS" className="h-8 w-8 rounded-xl shadow-2xs" />
                <div>
                  <h2 className="font-display font-black text-sm tracking-tight text-slate-900">
                    BRANCH STAFF PORTAL
                  </h2>
                  <p className="text-[10px] text-slate-500 font-medium">John Stayte Services</p>
                </div>
              </div>
              <div className="max-h-[calc(100vh-100px)] overflow-y-auto pr-1">
                {renderNavItems(true)}
              </div>
            </SheetContent>
          </Sheet>

          <Link to="/branch" className="flex items-center gap-3 group select-none">
            <img
              src={logo}
              alt="JSS Logo"
              className="h-9 w-9 rounded-xl shadow-xs shrink-0 group-hover:scale-105 transition-transform"
            />
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-sm tracking-tight text-slate-900">
                  BRANCH STAFF PORTAL
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 text-[9px] font-black uppercase tracking-wide">
                  Click & Collect
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium -mt-0.5">
                John Stayte Services
              </p>
            </div>
          </Link>
        </div>

        {/* Center: Prominent Assigned Branch Badge */}
        <div className="flex items-center">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
              isBranchPending
                ? "bg-amber-50/90 text-amber-900 border-amber-300 shadow-xs"
                : "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs"
            }`}
          >
            <MapPin className={`h-3.5 w-3.5 ${isBranchPending ? "text-amber-600" : "text-emerald-600"}`} />
            <span className="hidden md:inline text-slate-500 font-medium">Assigned Branch:</span>
            <span className="font-black truncate max-w-[200px] sm:max-w-[280px]">
              {branchName}
            </span>
            {isBranchPending && (
              <span className="ml-1 text-[10px] bg-amber-200/60 text-amber-900 px-1.5 py-0.2 rounded-full font-bold">
                Assignment Pending
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
                    className="relative rounded-full hover:bg-white/80 text-slate-600"
                  >
                    <Bell className="h-4 w-4" />
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="font-bold text-xs bg-slate-900 text-white">
                Branch Alerts & Order Notifications
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="h-5 w-[1px] bg-slate-200/80 mx-1 hidden sm:block" />

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 p-1 rounded-full hover:bg-white/80 transition-colors focus:outline-none select-none cursor-pointer">
                <Avatar className="h-8.5 w-8.5 border border-slate-200 shadow-2xs">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-gradient-to-br from-amber-600 to-orange-600 text-white font-black text-xs shadow-xs">
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
              className="w-56 rounded-2xl p-1.5 shadow-xl border border-slate-200/80 bg-white/95 backdrop-blur-2xl"
            >
              <DropdownMenuLabel className="p-2">
                <p className="text-xs font-bold text-slate-900">{staffName}</p>
                <p className="text-[11px] text-slate-500 truncate">{staffEmail}</p>
                <p className="text-[10px] text-amber-700 font-semibold mt-1">
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

      {/* MAIN CONTENT AREA & SIDEBAR */}
      <div className="flex-1 flex w-full relative z-10">
        {/* Desktop Sidebar */}
        <aside
          className={`hidden lg:flex flex-col border-r border-slate-200/80 bg-white/70 backdrop-blur-xl transition-all duration-300 select-none ${
            collapsed ? "w-20" : "w-64"
          }`}
        >
          <div className="flex-1 py-6 px-3 overflow-y-auto">
            {renderNavItems(false)}
          </div>

          {/* Sidebar Collapse Toggle */}
          <div className="p-3 border-t border-slate-200/80 flex items-center justify-between">
            {!collapsed && (
              <span className="text-[11px] font-bold text-slate-400">Collapse sidebar</span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="rounded-full hover:bg-white text-slate-500 h-8 w-8 ml-auto"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
        </aside>

        {/* Page Outlet Container */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}


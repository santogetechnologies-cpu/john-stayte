import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ShoppingBag,
  Truck,
  PackageCheck,
  Users,
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
import { ManagerGlobalSearch } from "./ManagerGlobalSearch";
import { ManagerNotificationsPopover } from "./ManagerNotificationsPopover";

type NavItem = {
  title: string;
  href: string;
  icon: any;
};

type NavGroup = {
  groupLabel: string;
  items: NavItem[];
};

const managerNavGroups: NavGroup[] = [
  {
    groupLabel: "OVERVIEW",
    items: [
      { title: "Dashboard", href: "/manager", icon: LayoutDashboard },
    ],
  },
  {
    groupLabel: "OPERATIONS",
    items: [
      { title: "My Orders", href: "/manager/orders", icon: ShoppingBag },
      { title: "Deliveries", href: "/manager/deliveries", icon: Truck },
      { title: "Inventory", href: "/manager/inventory", icon: PackageCheck },
    ],
  },
  {
    groupLabel: "CUSTOMERS",
    items: [
      { title: "Customers", href: "/manager/customers", icon: Users },
      { title: "Enquiries", href: "/manager/enquiries", icon: HelpCircle },
      { title: "Support", href: "/manager/support", icon: MessageSquare },
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
  const { user, logout } = useStore();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

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
            Please sign in using an Operations Manager or Administrator account to access the Manager Operations Portal.
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

  const renderNavItems = (isMobile = false) => (
    <div className="space-y-6">
      {managerNavGroups.map((group) => (
        <div key={group.groupLabel} className="space-y-1">
          {(!collapsed || isMobile) && (
            <p className="px-3 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest mb-1.5 select-none">
              {group.groupLabel}
            </p>
          )}
          {group.items.map((item) => {
            const isActive =
              item.href === "/manager"
                ? currentPath === "/manager" || currentPath === "/manager/"
                : currentPath.startsWith(item.href);

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
                <item.icon
                  className={`h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                    isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                  }`}
                />
                {(!collapsed || isMobile) && (
                  <span className="flex-1 truncate">{item.title}</span>
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
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/70 text-foreground font-sans antialiased flex flex-col">
      {/* GLOBAL SEARCH DIALOG */}
      <ManagerGlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

      {/* TOP HEADER */}
      <header className="sticky top-0 z-40 h-16 border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4 shadow-xs">
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
                  <h2 className="font-display font-extrabold text-sm tracking-tight text-foreground">
                    JSS MANAGER PORTAL
                  </h2>
                  <p className="text-[10px] text-muted-foreground font-medium">
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
                <span className="font-display font-black text-sm tracking-tight text-foreground">
                  JSS MANAGER PORTAL
                </span>
                <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 text-[9px] font-black uppercase tracking-wide">
                  Operations
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground font-medium -mt-0.5">
                John Stayte Services
              </p>
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
              <span>Search orders, customers, enquiries...</span>
            </span>
            <kbd className="flex items-center gap-1 rounded bg-white px-2 py-0.5 text-[10px] font-bold border text-muted-foreground shadow-2xs">
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
            className="md:hidden rounded-full hover:bg-slate-100"
          >
            <Search className="h-4 w-4 text-muted-foreground" />
          </Button>

          {/* Notifications */}
          <ManagerNotificationsPopover />

          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-slate-100 text-muted-foreground"
                >
                  <LifeBuoy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="font-semibold text-xs">Manager Ops Support</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="h-5 w-[1px] bg-slate-200 mx-1 hidden sm:block" />

          {/* Manager User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 p-1 rounded-full hover:bg-slate-100 transition-colors focus:outline-none select-none">
                <Avatar className="h-8 w-8 border border-slate-200 shadow-2xs">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-blue-600 text-white font-black text-xs">
                    {managerName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden xl:block text-left pr-1">
                  <p className="text-xs font-bold leading-tight text-foreground truncate max-w-[120px]">
                    {managerName}
                  </p>
                  <p className="text-[10px] font-medium text-muted-foreground leading-tight">
                    Operations Manager
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5 shadow-xl border bg-white">
              <DropdownMenuLabel className="p-2">
                <p className="text-xs font-bold text-foreground">{managerName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{managerEmail}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                <Link to="/manager/profile" className="flex items-center gap-2 text-xs font-medium">
                  <User className="h-4 w-4 text-muted-foreground" /> My Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                <Link to="/manager/settings" className="flex items-center gap-2 text-xs font-medium">
                  <Settings className="h-4 w-4 text-muted-foreground" /> Manager Settings
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
      <div className="flex-1 flex min-h-0">
        {/* DESKTOP COLLAPSIBLE SIDEBAR */}
        <aside
          className={`hidden lg:flex flex-col border-r border-slate-200/80 bg-white transition-all duration-300 relative z-20 ${
            collapsed ? "w-18" : "w-64"
          }`}
        >
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-6 z-30 h-6 w-6 rounded-full border border-slate-200 bg-white shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground transition-all hover:scale-110"
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>

          <div className="flex-1 overflow-y-auto p-3.5 space-y-6">
            {renderNavItems(false)}
          </div>

          {!collapsed && (
            <div className="p-3.5 border-t border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/60 shadow-2xs">
                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-foreground truncate">Fromebridge Station</p>
                  <p className="text-[10px] text-muted-foreground truncate">Depot Ops Active</p>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-8 animate-rise">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

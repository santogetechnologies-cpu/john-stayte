import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ShoppingBag,
  Heart,
  FileText,
  MapPin,
  User,
  Bell,
  HelpCircle,
  Settings,
  Search,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Menu,
} from "lucide-react";
import logo from "@/assets/image-5.png";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { CustomerGlobalSearch } from "./CustomerGlobalSearch";
import { CustomerNotificationsPopover } from "./CustomerNotificationsPopover";

type NavItem = {
  title: string;
  href: string;
  icon: any;
  badge?: string | number;
};

type NavGroup = {
  groupLabel: string;
  items: NavItem[];
};

export function CustomerPortalLayout({ children }: { children: ReactNode }) {
  const { user, logout, wishlist } = useStore();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const customerName = user?.name && user.name !== "Sarah Hughes" ? user.name : "My Account";
  const customerEmail = user?.email && user.email !== "customer@jss.com" ? user.email : "customer@jss.com";

  const customerNavGroups: NavGroup[] = [
    {
      groupLabel: "OVERVIEW",
      items: [{ title: "Home", href: "/account", icon: LayoutDashboard }],
    },
    {
      groupLabel: "SHOPPING",
      items: [
        { title: "My Orders", href: "/account/orders", icon: ShoppingBag },
        { title: "Wishlist", href: "/account/wishlist", icon: Heart, badge: wishlist.length > 0 ? wishlist.length : undefined },
      ],
    },
    {
      groupLabel: "ACCOUNT",
      items: [
        { title: "Invoices", href: "/account/invoices", icon: FileText },
        { title: "Addresses", href: "/account/addresses", icon: MapPin },
        { title: "Profile", href: "/account/profile", icon: User },
      ],
    },
    {
      groupLabel: "SUPPORT",
      items: [
        { title: "Notifications", href: "/account/notifications", icon: Bell },
        { title: "Help & Support", href: "/account/support", icon: HelpCircle },
      ],
    },
    {
      groupLabel: "SETTINGS",
      items: [{ title: "Settings", href: "/account/settings", icon: Settings }],
    },
  ];

  const getBreadcrumb = () => {
    if (currentPath === "/account" || currentPath === "/account/") return "Dashboard";
    if (currentPath.includes("orders")) return "My Orders";
    if (currentPath.includes("wishlist")) return "Wishlist";
    if (currentPath.includes("invoices")) return "Invoices";
    if (currentPath.includes("addresses")) return "Addresses";
    if (currentPath.includes("profile")) return "Profile";
    if (currentPath.includes("notifications")) return "Notifications";
    if (currentPath.includes("support")) return "Help & Support";
    if (currentPath.includes("settings")) return "Settings";
    return "Account";
  };

  const renderNavItems = (isMobile = false) => (
    <div className="space-y-5">
      {customerNavGroups.map((group) => (
        <div key={group.groupLabel} className="space-y-0.5">
          {(!collapsed || isMobile) && (
            <p className="px-3 text-[9px] font-bold text-slate-400 uppercase tracking-[0.12em] mb-2 select-none">
              {group.groupLabel}
            </p>
          )}
          {group.items.map((item) => {
            const isActive =
              item.href === "/account"
                ? currentPath === "/account" || currentPath === "/account/"
                : currentPath.startsWith(item.href);

            const linkContent = (
              <Link
                key={item.href + item.title}
                to={item.href as never}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150 select-none ${
                  isActive
                    ? "bg-primary text-white shadow-sm shadow-primary/30"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                } ${collapsed && !isMobile ? "justify-center px-2.5" : ""}`}
              >
                <item.icon
                  className={`h-[17px] w-[17px] shrink-0 transition-all duration-150 ${
                    isActive
                      ? "text-white"
                      : "text-slate-400 group-hover:text-slate-700 group-hover:scale-110"
                  }`}
                />
                {(!collapsed || isMobile) && (
                  <span className="flex-1 truncate leading-none">{item.title}</span>
                )}
                {(!collapsed || isMobile) && item.badge && (
                  <span
                    className={`ml-auto px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                      isActive
                        ? "bg-white/25 text-white"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );

            if (collapsed && !isMobile) {
              return (
                <TooltipProvider key={item.href + item.title} delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right" className="font-semibold text-xs">
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
    <div className="min-h-screen bg-[#f8f8fa] text-foreground font-sans antialiased flex flex-col">
      {/* GLOBAL PORTAL SEARCH DIALOG */}
      <CustomerGlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

      {/* TOP HEADER */}
      <header className="sticky top-0 z-40 h-[60px] border-b border-slate-200/70 bg-white/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        {/* Left: Branding & Breadcrumbs */}
        <div className="flex items-center gap-3">
          {/* Mobile Sheet Trigger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden rounded-lg h-9 w-9 hover:bg-slate-100">
                <Menu className="h-[18px] w-[18px] text-slate-600" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 pt-0 bg-white border-r border-slate-200">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
                <img src={logo} alt="JSS" className="h-8 w-8 rounded-lg" />
                <div>
                  <h2 className="font-display font-extrabold text-[13px] tracking-tight text-foreground">JSS CUSTOMER PORTAL</h2>
                  <p className="text-[10px] text-slate-400 font-medium">John Stayte Services</p>
                </div>
              </div>
              <div className="p-4 max-h-[calc(100vh-80px)] overflow-y-auto">
                {renderNavItems(true)}
              </div>
            </SheetContent>
          </Sheet>

          <Link to="/account" className="flex items-center gap-2.5 group select-none">
            <img
              src={logo}
              alt="JSS Logo"
              className="h-8 w-8 rounded-lg shrink-0 group-hover:opacity-90 transition-opacity"
            />
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-[13px] tracking-tight text-foreground">
                  JSS CUSTOMER PORTAL
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium -mt-0.5">
                Account /{" "}
                <span className="text-slate-700 font-semibold">{getBreadcrumb()}</span>
              </p>
            </div>
          </Link>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-sm hidden md:block">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center justify-between gap-3 px-3.5 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all duration-150 text-[12px] text-slate-400 group"
          >
            <span className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-500 shrink-0" />
              <span>Search orders, products...</span>
            </span>
            <kbd className="flex items-center gap-0.5 rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold border border-slate-200 text-slate-400 shadow-xs">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Header Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchOpen(true)}
            className="md:hidden rounded-lg h-9 w-9 hover:bg-slate-100"
          >
            <Search className="h-4 w-4 text-slate-500" />
          </Button>

          <CustomerNotificationsPopover />

          <Button
            asChild
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex rounded-lg text-[12px] font-semibold gap-1.5 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 h-8 px-3"
          >
            <Link to="/">
              <ExternalLink className="h-3.5 w-3.5 text-primary" />
              View Site
            </Link>
          </Button>

          <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

          {/* Customer Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 transition-colors duration-150 focus:outline-none select-none">
                <Avatar className="h-7 w-7 border border-slate-200">
                  <AvatarFallback className="bg-primary text-white font-black text-[11px]">
                    {customerName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden xl:block text-left pr-0.5">
                  <p className="text-[12px] font-bold leading-tight text-foreground truncate max-w-[110px]">
                    {customerName}
                  </p>
                  <p className="text-[10px] font-medium text-slate-400 leading-tight">Customer</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-54 rounded-xl p-1.5 shadow-lg border border-slate-200 bg-white">
              <DropdownMenuLabel className="px-2.5 py-2">
                <p className="text-[12px] font-bold text-foreground">{customerName}</p>
                <p className="text-[11px] text-slate-400 truncate font-medium">{customerEmail}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                <Link to="/account/profile" className="flex items-center gap-2.5 text-[12px] font-medium px-2.5 py-2">
                  <User className="h-3.5 w-3.5 text-slate-400" /> My Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                <Link to="/account/settings" className="flex items-center gap-2.5 text-[12px] font-medium px-2.5 py-2">
                  <Settings className="h-3.5 w-3.5 text-slate-400" /> Account Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                <Link to="/" className="flex items-center gap-2.5 text-[12px] font-medium px-2.5 py-2">
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400" /> View Public Site
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem
                onClick={() => {
                  logout();
                  navigate({ to: "/" });
                }}
                className="rounded-lg cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 text-[12px] font-semibold px-2.5 py-2"
              >
                <LogOut className="h-3.5 w-3.5 mr-2" /> Sign out
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
            collapsed ? "w-[68px]" : "w-[232px]"
          }`}
        >
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-5 z-30 h-6 w-6 rounded-full border border-slate-200 bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-all duration-150 hover:scale-110"
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>

          <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {renderNavItems(false)}
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 min-w-0 overflow-y-auto p-5 sm:p-7 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-7 animate-rise">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

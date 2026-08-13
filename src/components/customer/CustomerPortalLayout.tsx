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
      items: [{ title: "Dashboard", href: "/account", icon: LayoutDashboard }],
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
    <div className="space-y-6">
      {customerNavGroups.map((group) => (
        <div key={group.groupLabel} className="space-y-1">
          {(!collapsed || isMobile) && (
            <p className="px-3 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest mb-1.5 select-none">
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
                className={`group flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all select-none ${isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-slate-100"
                  } ${collapsed && !isMobile ? "justify-center px-2 py-2.5" : ""}`}
              >
                <item.icon className={`h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"}`} />
                {(!collapsed || isMobile) && (
                  <span className="flex-1 truncate">{item.title}</span>
                )}
                {(!collapsed || isMobile) && item.badge && (
                  <span
                    className={`ml-auto px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
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
      {/* GLOBAL PORTAL SEARCH DIALOG */}
      <CustomerGlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

      {/* TOP HEADER */}
      <header className="sticky top-0 z-40 h-16 border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4 shadow-xs">
        {/* Left Branding & Breadcrumbs */}
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
                  <h2 className="font-display font-extrabold text-sm tracking-tight text-foreground">JSS CUSTOMER PORTAL</h2>
                  <p className="text-[10px] text-muted-foreground font-medium">John Stayte Services</p>
                </div>
              </div>
              <div className="max-h-[calc(100vh-100px)] overflow-y-auto pr-1">
                {renderNavItems(true)}
              </div>
            </SheetContent>
          </Sheet>

          <Link to="/account" className="flex items-center gap-3 group select-none">
            <img src={logo} alt="JSS Logo" className="h-9 w-9 rounded-xl shadow-xs shrink-0 group-hover:scale-105 transition-transform" />
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-sm tracking-tight text-foreground">JSS CUSTOMER PORTAL</span>
              </div>
              <p className="text-[11px] text-muted-foreground font-medium -mt-0.5">
                Account / <span className="text-foreground font-bold">{getBreadcrumb()}</span>
              </p>
            </div>
          </Link>
        </div>

        {/* Center Search Bar */}
        <div className="flex-1 max-w-md hidden md:block">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center justify-between gap-3 px-3.5 py-2 rounded-full border border-slate-200 bg-slate-50/80 hover:bg-slate-100/80 hover:border-slate-300 transition-all text-xs text-muted-foreground group"
          >
            <span className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
              <span>Search account, orders, products...</span>
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

          <CustomerNotificationsPopover />

          <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex rounded-full text-xs font-bold gap-1.5 border-slate-200 hover:bg-slate-50">
            <Link to="/">
              <ExternalLink className="h-3.5 w-3.5 text-primary" /> View Site
            </Link>
          </Button>

          <div className="h-5 w-[1px] bg-slate-200 mx-1 hidden sm:block" />

          {/* Customer Profile Menu Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 p-1 rounded-full hover:bg-slate-100 transition-colors focus:outline-none select-none">
                <Avatar className="h-8 w-8 border border-slate-200 shadow-2xs">
                  <AvatarFallback className="bg-primary text-white font-black text-xs">
                    {customerName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden xl:block text-left pr-1">
                  <p className="text-xs font-bold leading-tight text-foreground truncate max-w-[120px]">{customerName}</p>
                  <p className="text-[10px] font-medium text-muted-foreground leading-tight">Customer</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5 shadow-xl border bg-white">
              <DropdownMenuLabel className="p-2">
                <p className="text-xs font-bold text-foreground">{customerName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{customerEmail}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                <Link to="/account/profile" className="flex items-center gap-2 text-xs font-medium">
                  <User className="h-4 w-4 text-muted-foreground" /> My Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                <Link to="/account/settings" className="flex items-center gap-2 text-xs font-medium">
                  <Settings className="h-4 w-4 text-muted-foreground" /> Account Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                <Link to="/" className="flex items-center gap-2 text-xs font-medium">
                  <ExternalLink className="h-4 w-4 text-muted-foreground" /> View Public Site
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
          className={`hidden lg:flex flex-col border-r border-slate-200/80 bg-white transition-all duration-300 relative z-20 ${collapsed ? "w-18" : "w-64"
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

import { useState } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Menu, User, HelpCircle, LogOut, Truck, Radio, Loader2 } from "lucide-react";
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
import { useStore } from "@/lib/store";
import { getAgentInitials } from "@/lib/delivery-agent-service";
import { DeliveryNotificationsPopover } from "./DeliveryNotificationsPopover";

interface DeliveryHeaderProps {
  onOpenMobileMenu?: () => void;
}

export function DeliveryHeader({ onOpenMobileMenu }: DeliveryHeaderProps) {
  const { user, logout } = useStore();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const [signingOut, setSigningOut] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const getPageTitle = () => {
    if (pathname === "/delivery" || pathname === "/delivery/") return "Delivery Dispatch Home";
    if (pathname.includes("/delivery/deliveries")) return "My Assigned Deliveries";
    if (pathname.includes("/delivery/today")) return "Today's Delivery Timeline";
    if (pathname.includes("/delivery/completed")) return "Completed Deliveries History";
    if (pathname.includes("/delivery/returns")) return "Cylinder Verification";
    if (pathname.includes("/delivery/issues")) return "Issues & Exceptions Log";
    if (pathname.includes("/delivery/notifications")) return "Dispatch & Delivery Notifications";
    if (pathname.includes("/delivery/profile")) return "Delivery Agent Profile";
    if (pathname.includes("/delivery/support")) return "Depot Logistics & Driver Help";
    return "Delivery Agent Portal";
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      setDropdownOpen(false);
      await logout();
      navigate({ to: "/login" });
    } catch (err) {
      console.error("Sign out notice:", err);
      navigate({ to: "/login" });
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-20 h-16 border-b border-slate-200/90 bg-white/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shadow-2xs">
      {/* Left: Mobile hamburger & Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenMobileMenu}
          className="md:hidden h-9 w-9 rounded-xl text-slate-600 hover:bg-slate-100 shrink-0"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Brand mark visible on small screens */}
        <Link to="/delivery" className="md:hidden flex items-center gap-2 shrink-0">
          <img src={logo} alt="JSS" className="h-7 w-auto object-contain" />
        </Link>

        <div className="hidden sm:flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-600 flex items-center gap-1">
              <Radio className="h-3 w-3 text-red-600 animate-pulse" /> Live Dispatch
            </span>
            <span className="text-slate-300 text-xs">·</span>
            <span className="text-[11px] font-medium text-slate-500">
              Gloucestershire Delivery Unit
            </span>
          </div>
          <h1 className="font-display font-extrabold text-sm sm:text-base text-slate-900 truncate leading-tight">
            {getPageTitle()}
          </h1>
        </div>

        <div className="sm:hidden min-w-0">
          <h1 className="font-display font-bold text-xs text-slate-900 truncate">
            {getPageTitle()}
          </h1>
        </div>
      </div>

      {/* Right: Actions, Notifications, User Menu */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Status indicator badge */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-700 shadow-2xs">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Active Agent</span>
        </div>

        {/* Notifications Popover */}
        <DeliveryNotificationsPopover />

        {/* Profile Avatar / Dropdown */}
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2.5 p-1 sm:px-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Avatar className="h-8 w-8 rounded-lg bg-red-600 text-white font-bold text-xs shadow-2xs">
                <AvatarFallback className="bg-red-600 text-white font-bold text-xs">
                  {getAgentInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col text-left">
                <span className="font-bold text-xs text-slate-900 leading-tight truncate max-w-[120px]">
                  {user?.name || "Delivery Driver"}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold leading-none">
                  Delivery Agent
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-56 rounded-2xl p-1.5 border-slate-200 shadow-xl z-50 bg-white"
          >
            <DropdownMenuLabel className="px-3 py-2">
              <p className="font-display font-extrabold text-xs text-slate-900">
                {user?.name || "Dave Jenkins"}
              </p>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                {user?.email || "delivery@jss.com"}
              </p>
              <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-[9px] font-black uppercase tracking-wide text-red-600 border border-red-100">
                <Truck className="h-2.5 w-2.5" /> Delivery Agent
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem asChild className="rounded-xl font-bold text-xs py-2 cursor-pointer">
              <Link to="/delivery/profile">
                <User className="h-4 w-4 mr-2 text-slate-500" /> Driver Profile
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild className="rounded-xl font-bold text-xs py-2 cursor-pointer">
              <Link to="/delivery/support">
                <HelpCircle className="h-4 w-4 mr-2 text-slate-500" /> Depot Support & Dispatch
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              disabled={signingOut}
              onClick={handleSignOut}
              className="rounded-xl font-bold text-xs py-2 text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer disabled:opacity-50"
            >
              {signingOut ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin text-red-600" />
              ) : (
                <LogOut className="h-4 w-4 mr-2" />
              )}
              {signingOut ? "Signing Out..." : "Sign Out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

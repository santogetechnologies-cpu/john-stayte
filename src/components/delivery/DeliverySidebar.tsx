import { useState, useEffect } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Home,
  Truck,
  CalendarDays,
  CheckCircle2,
  PackageCheck,
  AlertTriangle,
  Bell,
  User,
  HelpCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  X,
  Loader2,
} from "lucide-react";
import logo from "@/assets/image-5.png";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { getAgentInitials } from "@/lib/delivery-agent-service";
import { getOrderCylinderExchangeRequirement } from "@/lib/cylinder-exchange-service";
import { cn } from "@/lib/utils";

import type { LucideIcon } from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  badgeVariant?: "default" | "amber" | "rose";
}

interface NavGroup {
  groupLabel: string;
  items: NavItem[];
}

interface DeliverySidebarProps {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  onNavigate?: () => void;
  onClose?: () => void;
  isMobileDrawer?: boolean;
}

export function DeliverySidebar({
  collapsed,
  setCollapsed,
  onNavigate,
  onClose,
  isMobileDrawer = false,
}: DeliverySidebarProps) {
  const { user, logout } = useStore();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const [signingOut, setSigningOut] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [pendingReturns, setPendingReturns] = useState(0);
  const [openIssues, setOpenIssues] = useState(0);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      if (onClose) onClose();
      await logout();
      navigate({ to: "/login" });
    } catch (err) {
      console.error("Sign out notice:", err);
      navigate({ to: "/login" });
    } finally {
      setSigningOut(false);
    }
  };

  // Live query for sidebar badges
  useEffect(() => {
    async function loadSidebarBadges() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const currentUserId = authData?.user?.id || user?.id;
        const currentUserEmail = authData?.user?.email || user?.email;

        const { data: assignments } = await (supabase.from("delivery_assignments") as any).select(
          "id, status, notes, agent_id, driver_id, driver_name",
        );

        if (assignments) {
          // Filter assignments for this specific agent
          const agentAssignments = assignments.filter((a: any) => {
            const dName = (a.driver_name || "").toLowerCase().trim();
            const uName = (user?.name || "").toLowerCase().trim();
            if (!dName || dName === "unassigned" || dName.includes("unassigned")) return false;
            return (
              (a.agent_id && a.agent_id === currentUserId) ||
              (a.driver_id && a.driver_id === currentUserId) ||
              (uName && dName === uName)
            );
          });

          // Pending empty cylinder returns (only for exchange deliveries requiring empty return)
          const pending = agentAssignments.filter((a: any) => {
            const s = (a.status || "").toLowerCase();
            const req = getOrderCylinderExchangeRequirement(a);
            return (
              req.required &&
              s !== "delivered" &&
              s !== "completed" &&
              s !== "empty cylinder verified"
            );
          }).length;
          setPendingReturns(pending);

          // Open issues / exceptions
          const issues = agentAssignments.filter((a: any) => {
            const s = (a.status || "").toLowerCase();
            return s === "exception" || (a.notes && a.notes.includes("[Exception:"));
          }).length;
          setOpenIssues(issues);
        }

        // Unread notifications for THIS authenticated agent only
        if (currentUserId || currentUserEmail) {
          const idFilters: string[] = [];
          if (currentUserId) idFilters.push(`user_id.eq.${currentUserId}`);

          if (currentUserEmail) {
            try {
              const { data: agData } = await (supabase.from("delivery_agents") as any)
                .select("id")
                .eq("email", currentUserEmail)
                .maybeSingle();
              if (agData?.id && agData.id !== currentUserId) {
                idFilters.push(`user_id.eq.${agData.id}`);
              }
            } catch {}
          }

          let notifQuery = (supabase.from("notifications") as any)
            .select("*", { count: "exact", head: true })
            .or("is_read.eq.false,read.eq.false");

          if (idFilters.length > 0) {
            notifQuery = notifQuery.or(idFilters.join(","));
            const { count } = await notifQuery;
            setUnreadNotifs(count || 0);
          } else {
            setUnreadNotifs(0);
          }
        } else {
          setUnreadNotifs(0);
        }
      } catch (err) {
        console.warn("Error loading sidebar badges:", err);
      }
    }

    loadSidebarBadges();

    const channelName = `delivery_sidebar_badges_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_assignments" }, () =>
        loadSidebarBadges(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () =>
        loadSidebarBadges(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const navGroups: NavGroup[] = [
    {
      groupLabel: "DELIVERY",
      items: [
        { title: "Home", href: "/delivery", icon: Home },
        { title: "My Deliveries", href: "/delivery/deliveries", icon: Truck },
        { title: "Today's Deliveries", href: "/delivery/today", icon: CalendarDays },
        { title: "Completed", href: "/delivery/completed", icon: CheckCircle2 },
      ],
    },
    {
      groupLabel: "OPERATIONS",
      items: [
        {
          title: "Cylinder Verification",
          href: "/delivery/returns",
          icon: PackageCheck,
          badge: pendingReturns > 0 ? pendingReturns : undefined,
          badgeVariant: "amber",
        },
        {
          title: "Issues & Exceptions",
          href: "/delivery/issues",
          icon: AlertTriangle,
          badge: openIssues > 0 ? openIssues : undefined,
          badgeVariant: "rose",
        },
        {
          title: "Notifications",
          href: "/delivery/notifications",
          icon: Bell,
          badge: unreadNotifs > 0 ? unreadNotifs : undefined,
          badgeVariant: "default",
        },
      ],
    },
    {
      groupLabel: "ACCOUNT",
      items: [
        { title: "Profile", href: "/delivery/profile", icon: User },
        { title: "Help & Support", href: "/delivery/support", icon: HelpCircle },
      ],
    },
  ];

  const isCollapsedDesktop = collapsed && !isMobileDrawer;

  return (
    <aside
      className={cn(
        "relative flex flex-col justify-between h-full bg-white border-r border-slate-200/90 transition-all duration-300 select-none",
        isMobileDrawer ? "w-full" : isCollapsedDesktop ? "w-[72px]" : "w-64",
      )}
    >
      {/* Desktop Chevron Collapse Button (Hidden on Mobile Drawer) */}
      {!isMobileDrawer && (
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex absolute -right-3 top-5 z-40 h-6 w-6 rounded-full border border-slate-200 bg-white shadow-md items-center justify-center text-slate-500 hover:text-slate-800 hover:scale-105 transition-all cursor-pointer"
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      )}

      {/* Top Header Logo */}
      <div>
        <div
          className={cn(
            "flex items-center justify-between h-16 border-b border-slate-100",
            isCollapsedDesktop ? "justify-center px-0" : "px-4",
          )}
        >
          <Link
            to="/delivery"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 overflow-hidden transition-opacity hover:opacity-90",
              isCollapsedDesktop && "justify-center",
            )}
          >
            <div className="h-9 w-9 rounded-xl bg-red-600/10 border border-red-600/20 flex items-center justify-center shrink-0">
              <img src={logo} alt="JSS Logo" className="h-6 w-auto object-contain" />
            </div>
            {!isCollapsedDesktop && (
              <div className="flex flex-col min-w-0">
                <span className="font-display font-black text-xs tracking-tight text-slate-900 leading-tight">
                  JOHN STAYTE
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-600">
                  Delivery Agent
                </span>
              </div>
            )}
          </Link>

          {/* Mobile Drawer Close Button */}
          {isMobileDrawer && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose || onNavigate}
              className="h-8 w-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0 cursor-pointer"
              title="Close Menu"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Navigation Sections */}
        <div className="py-4 px-3 space-y-6 overflow-y-auto max-h-[calc(100vh-175px)]">
          <TooltipProvider delayDuration={150}>
            {navGroups.map((group) => (
              <div key={group.groupLabel} className="space-y-1">
                {!isCollapsedDesktop && (
                  <p className="px-3 text-[10px] font-extrabold tracking-wider text-slate-400 uppercase mb-2">
                    {group.groupLabel}
                  </p>
                )}
                {group.items.map((item) => {
                  const isActive =
                    item.href === "/delivery"
                      ? currentPath === "/delivery" || currentPath === "/delivery/"
                      : currentPath.startsWith(item.href);

                  const linkContent = (
                    <Link
                      key={item.href}
                      to={item.href as never}
                      onClick={onNavigate}
                      className={cn(
                        "group flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all duration-150 cursor-pointer",
                        isActive
                          ? "bg-red-600 text-white shadow-sm shadow-red-600/20"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
                        isCollapsedDesktop && "justify-center px-0",
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <item.icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-transform group-hover:scale-110",
                            isActive ? "text-white" : "text-slate-400 group-hover:text-red-600",
                          )}
                        />
                        {!isCollapsedDesktop && <span className="truncate">{item.title}</span>}
                      </div>

                      {!isCollapsedDesktop && item.badge !== undefined && (
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded-full text-[10px] font-black shrink-0",
                            isActive
                              ? "bg-white text-red-600"
                              : item.badgeVariant === "rose"
                                ? "bg-red-50 text-red-600 border border-red-200"
                                : item.badgeVariant === "amber"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-slate-100 text-slate-700",
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );

                  if (isCollapsedDesktop) {
                    return (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                        <TooltipContent
                          side="right"
                          className="font-bold text-xs bg-slate-900 text-white z-50"
                        >
                          {item.title}
                          {item.badge !== undefined && ` (${item.badge})`}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return linkContent;
                })}
              </div>
            ))}
          </TooltipProvider>
        </div>
      </div>

      {/* Bottom Profile / Status Card */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        {!isCollapsedDesktop ? (
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative">
                <Avatar className="h-8 w-8 rounded-lg bg-red-600 text-white font-bold text-xs">
                  <AvatarFallback className="bg-red-600 text-white font-bold text-xs">
                    {getAgentInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs text-slate-900 truncate leading-tight">
                  {user?.name || "Delivery Driver"}
                </p>
                <p className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Online / Active
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              disabled={signingOut}
              onClick={handleSignOut}
              title="Sign Out"
              className="h-7 w-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 shrink-0 disabled:opacity-50"
            >
              {signingOut ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-red-600" />
              ) : (
                <LogOut className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        ) : (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="icon"
              disabled={signingOut}
              onClick={handleSignOut}
              title="Sign Out"
              className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {signingOut ? (
                <Loader2 className="h-4 w-4 animate-spin text-red-600" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}

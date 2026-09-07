import { useState, useEffect, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import logo from "@/assets/image-5.png";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useStore } from "@/lib/store";
import { ensureDefaultDeliveryAgent } from "@/lib/delivery-agent-service";
import { DeliverySidebar } from "./DeliverySidebar";
import { DeliveryHeader } from "./DeliveryHeader";

export function DeliveryPortalLayout({ children }: { children: ReactNode }) {
  const { user, authLoading } = useStore();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Self-heal default delivery agent on startup
  useEffect(() => {
    ensureDefaultDeliveryAgent();
  }, []);

  // Strict route protection: redirect unauthenticated or unauthorized users
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate({ to: "/login" });
      return;
    }

    if (user.role !== "delivery_agent" && user.role !== "admin" && user.role !== "manager") {
      navigate({ to: "/account" });
    }
  }, [user, authLoading, navigate]);

  // 1. Session verification loading state
  if (authLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 font-sans">
        <div className="flex flex-col items-center gap-3 text-slate-500 text-xs font-semibold">
          <Loader2 className="h-6 w-6 animate-spin text-red-600" />
          <span>Verifying Delivery Agent session...</span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated Gate UI (shown while navigating or if navigation is pending)
  if (!user) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 px-4 font-sans">
        <div className="max-w-sm w-full p-8 text-center shadow-2xl rounded-3xl border border-slate-200 bg-white space-y-4">
          <img src={logo} alt="JSS" className="mx-auto h-12 w-12 rounded-xl shadow-xs" />
          <h1 className="text-xl font-bold font-display text-slate-900">Delivery Agent Portal</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            Please sign in using your authorized Delivery Driver credentials to access dispatch
            routes and cylinder verification.
          </p>
          <Button
            asChild
            className="w-full rounded-xl font-bold text-xs bg-red-600 hover:bg-red-700 text-white h-10 shadow-xs"
          >
            <Link to="/login">Go to Sign In</Link>
          </Button>
        </div>
      </div>
    );
  }

  // 3. Unauthorized Role Gate UI
  if (user.role !== "delivery_agent" && user.role !== "admin" && user.role !== "manager") {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 px-4 font-sans">
        <div className="max-w-sm w-full p-8 text-center shadow-2xl rounded-3xl border border-slate-200 bg-white space-y-4">
          <img src={logo} alt="JSS" className="mx-auto h-12 w-12 rounded-xl shadow-xs" />
          <h1 className="text-xl font-bold font-display text-slate-900">Access Restricted</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            This area is reserved for delivery drivers and dispatch personnel. Your account is
            registered as a customer.
          </p>
          <Button
            asChild
            className="w-full rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white h-10 shadow-xs"
          >
            <Link to="/account">Return to Customer Portal</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-50/60 overflow-hidden font-sans">
      {/* 1. Desktop Persistent Sidebar (>= 768px tablet & desktop) */}
      <div className="hidden md:flex shrink-0 h-full">
        <DeliverySidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>

      {/* 2. Mobile Drawer (< 768px smartphones only) */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent
          side="left"
          className="p-0 w-72 max-w-[85vw] border-r border-slate-200 bg-white [&>button]:hidden"
        >
          <DeliverySidebar
            collapsed={false}
            setCollapsed={() => {}}
            onNavigate={() => setMobileMenuOpen(false)}
            onClose={() => setMobileMenuOpen(false)}
            isMobileDrawer={true}
          />
        </SheetContent>
      </Sheet>

      {/* 3. Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <DeliveryHeader onOpenMobileMenu={() => setMobileMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
          <div className="w-full space-y-5 sm:space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

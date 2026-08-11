import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import logo from "@/assets/image-5.png";
import { Button } from "@/components/ui/button";
import { useStore, type Role } from "@/lib/store";
import { statusColor, type OrderStatus } from "@/data/ops";
import { cn } from "@/lib/utils";

export function StatusPill({ status }: { status: OrderStatus }) {
  return (
    <span className={cn("inline-block whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-bold", statusColor[status])}>
      {status}
    </span>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="surface-card p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-extrabold">{value}</p>
      {hint && <p className="mt-1 text-xs text-success">{hint}</p>}
    </div>
  );
}

export function DashShell({
  role,
  title,
  subtitle,
  children,
}: {
  role: Role;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const { user, logout } = useStore();
  const navigate = useNavigate();

  if (!user || user.role !== role) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface px-4">
        <div className="surface-card max-w-sm p-10 text-center">
          <h1 className="text-xl font-extrabold">Sign in required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This dashboard is for {role} accounts. Use the demo {role} login to continue.
          </p>
          <Button asChild className="mt-6 rounded-full"><Link to="/login">Go to sign in</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-xl">
        <div className="container-page grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <img src={logo} alt="JSS" className="h-9 w-9 shrink-0 rounded-lg" width={36} height={36} />
            <span className="min-w-0">
              <span className="block truncate font-display text-sm font-extrabold">JSS {role.toUpperCase()} PORTAL</span>
              <span className="block truncate text-xs text-muted-foreground">{user.name}</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden rounded-full sm:inline-flex"><Link to="/">View site</Link></Button>
            <Button variant="outline" className="rounded-full" onClick={() => { logout(); navigate({ to: "/" }); }}>
              <LogOut className="mr-1.5 h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>
      <div className="container-page py-10">
        <h1 className="text-3xl font-extrabold">{title}</h1>
        <p className="mt-2 text-muted-foreground">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}

import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

export function SiteLayout({
  children,
  footerClassName,
}: {
  children: ReactNode;
  footerClassName?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter className={footerClassName} />
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <section className="border-b bg-surface">
      <div className="container-page py-10 md:py-14">
        {eyebrow && (
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
        )}
        <h1 className="mt-2 max-w-3xl text-3xl font-extrabold md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-4 max-w-2xl text-muted-foreground md:text-lg">{subtitle}</p>}
      </div>
    </section>
  );
}

export function SectionHead({
  badge,
  title,
  subtitle,
  desc,
  light,
  action,
}: {
  badge?: string;
  title: string;
  subtitle?: string;
  desc?: string;
  light?: boolean;
  action?: ReactNode;
}) {
  const subText = subtitle || desc;
  return (
    <div className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
      <div className="min-w-0">
        {badge && (
          <p
            className={`text-xs font-bold uppercase tracking-[0.2em] mb-1 ${light ? "text-primary-foreground/80" : "text-primary"}`}
          >
            {badge}
          </p>
        )}
        <h2
          className={`text-2xl font-extrabold md:text-3xl ${light ? "text-white" : "text-foreground"}`}
        >
          {title}
        </h2>
        {subText && (
          <p
            className={`mt-2 text-sm md:text-base ${light ? "text-slate-300" : "text-muted-foreground"}`}
          >
            {subText}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

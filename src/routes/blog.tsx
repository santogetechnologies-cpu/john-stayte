import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { blogPosts } from "@/data/catalog";
import coalLogs from "@/assets/coal-logs.jpg";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { property: "og:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { name: "twitter:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { title: "Blog, News & Safety Guides | John Stayte Services" },
      { name: "description", content: "Gas safety guides, fuel tips and company news from the John Stayte Services team." },
      { property: "og:title", content: "Blog & Safety Guides | John Stayte Services" },
      { property: "og:description", content: "Gas safety guides, fuel tips and local news." },
    ],
  }),
  component: Blog,
});

function Blog() {
  return (
    <SiteLayout>
      <PageHero eyebrow="Journal" title="News, tips & safety guides" subtitle="Practical advice from a team that's been doing this since 1972." />
      <div className="container-page grid gap-5 py-12 md:grid-cols-2 lg:grid-cols-4">
        {blogPosts.map((post) => (
          <article key={post.slug} className="surface-card overflow-hidden transition-all hover:-translate-y-1">
            <img src={coalLogs} alt="" loading="lazy" width={1024} height={1024} className="h-40 w-full bg-surface object-contain p-4" />
            <div className="p-6">
              <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold uppercase text-primary">{post.tag}</span>
              <h2 className="mt-3 text-base font-extrabold leading-snug">{post.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{post.excerpt}</p>
              <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                {new Date(post.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </article>
        ))}
      </div>
    </SiteLayout>
  );
}

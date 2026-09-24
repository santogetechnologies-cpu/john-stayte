import { createFileRoute } from "@tanstack/react-router";
import { Tag, Sparkles, Flame, ShieldCheck } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { OffersListSection } from "@/components/site/OffersListSection";

export const Route = createFileRoute("/offers")({
  head: () => ({
    meta: [
      { property: "og:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { name: "twitter:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { title: "Special Offers & Fuel Discounts | John Stayte Services" },
      {
        name: "description",
        content:
          "Save on Calor gas cylinders, smokeless coal, kiln dried logs, and customer loyalty rewards across Gloucestershire.",
      },
      { property: "og:title", content: "Special Offers & Fuel Discounts | John Stayte Services" },
      {
        property: "og:description",
        content: "Explore current seasonal promotions and exclusive discounts from John Stayte Services.",
      },
    ],
  }),
  component: OffersPage,
});

function OffersPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Promotions & Savings"
        title="Special Offers & Fuel Discounts"
        subtitle="Discover exclusive savings on Calor gas cylinders, winter fuels, and customer loyalty discounts delivered direct to your door."
      />

      <OffersListSection />
    </SiteLayout>
  );
}

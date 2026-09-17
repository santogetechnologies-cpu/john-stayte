import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { ShopByBrandSection } from "@/components/site/ShopByBrandSection";

export const Route = createFileRoute("/brands/")({
  head: () => ({
    meta: [
      { property: "og:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { name: "twitter:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { title: "Shop by Brand | Official Gas, Fuel & Appliance Partners | John Stayte Services" },
      {
        name: "description",
        content:
          "Browse products from our trusted UK brands including Calor, Air Liquide, Campingaz, Char-Broil, Homefire, Dynamite Baits and more.",
      },
      { property: "og:title", content: "Shop by Brand | John Stayte Services" },
      {
        property: "og:description",
        content: "Discover genuine products from certified UK manufacturers.",
      },
    ],
  }),
  component: BrandsPage,
});

function BrandsPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Official Stockist"
        title="Shop by Brand"
        subtitle="Explore products from our comprehensive network of authorized manufacturers and trusted partner brands."
      />
      <div className="bg-[#fcfdfe] min-h-[60vh] py-6 sm:py-10">
        <ShopByBrandSection />
      </div>
    </SiteLayout>
  );
}

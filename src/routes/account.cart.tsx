import { createFileRoute } from "@tanstack/react-router";
import { CustomerCartView } from "@/components/customer/CustomerCartView";

export const Route = createFileRoute("/account/cart")({
  head: () => ({
    meta: [
      { property: "og:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { name: "twitter:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { title: "Shopping Cart | Customer Portal | John Stayte Services" },
      {
        name: "description",
        content: "Review your selected products and arrange your gas delivery with ease.",
      },
      { property: "og:title", content: "Shopping Cart | John Stayte Services" },
      {
        property: "og:description",
        content: "Review your selected products and arrange your gas delivery with ease.",
      },
    ],
  }),
  component: CustomerCartView,
});

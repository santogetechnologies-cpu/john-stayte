import { createFileRoute, Outlet } from "@tanstack/react-router";
import { CustomerPortalLayout } from "@/components/customer/CustomerPortalLayout";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { property: "og:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { name: "twitter:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { title: "My Account | John Stayte Services" },
      {
        name: "description",
        content: "Manage your JSS customer orders, delivery addresses, invoices, wishlist and support preferences.",
      },
    ],
  }),
  component: CustomerLayout,
});

function CustomerLayout() {
  return (
    <CustomerPortalLayout>
      <Outlet />
    </CustomerPortalLayout>
  );
}

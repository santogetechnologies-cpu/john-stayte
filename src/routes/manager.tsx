import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ManagerPortalLayout } from "@/components/manager/ManagerPortalLayout";

export const Route = createFileRoute("/manager")({
  head: () => ({
    meta: [
      { property: "og:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { name: "twitter:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { title: "Manager Operations Portal | John Stayte Services" },
      {
        name: "description",
        content:
          "Manager portal for order approval, delivery operations, inventory reorder alerts, customer enquiries, and performance metrics.",
      },
      { property: "og:title", content: "Manager Portal | John Stayte Services" },
      {
        property: "og:description",
        content: "Approve orders, track truck deliveries and manage depot stock.",
      },
    ],
  }),
  component: ManagerLayout,
});

function ManagerLayout() {
  return (
    <ManagerPortalLayout>
      <Outlet />
    </ManagerPortalLayout>
  );
}

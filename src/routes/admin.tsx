import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminPortalLayout } from "@/components/admin/AdminPortalLayout";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { property: "og:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { name: "twitter:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { title: "Enterprise Admin Control Center | John Stayte Services" },
      {
        name: "description",
        content:
          "Executive administration control center: revenue analytics, order dispatch, inventory matrix, customer directory, managers, CMS, and audit logs.",
      },
      { property: "og:title", content: "Admin Dashboard | John Stayte Services" },
      { property: "og:description", content: "Enterprise ERP Control Center for JSS." },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <AdminPortalLayout>
      <Outlet />
    </AdminPortalLayout>
  );
}

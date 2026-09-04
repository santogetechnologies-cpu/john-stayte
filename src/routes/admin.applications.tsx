import { createFileRoute } from "@tanstack/react-router";
import { AdminApplicationsView } from "@/components/admin/AdminApplicationsView";

export const Route = createFileRoute("/admin/applications")({
  head: () => ({
    meta: [
      { title: "Gas Customer Applications | Admin Dashboard | John Stayte Services" },
      {
        name: "description",
        content:
          "Review, approve, and verify registered customer gas applications and submitted digital signatures.",
      },
    ],
  }),
  component: AdminApplicationsView,
});

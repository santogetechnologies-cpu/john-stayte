import { createFileRoute } from "@tanstack/react-router";
import { ManagerApplicationsView } from "@/components/manager/ManagerApplicationsView";

export const Route = createFileRoute("/manager/applications")({
  head: () => ({
    meta: [
      { title: "Gas Customer Applications | Manager Portal" },
      {
        name: "description",
        content:
          "Review, approve, and verify registered customer gas applications, assign pricing bands, and activate accounts.",
      },
    ],
  }),
  component: ManagerApplicationsView,
});

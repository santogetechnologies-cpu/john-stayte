import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BranchPortalLayout } from "@/components/branch/BranchPortalLayout";

export const Route = createFileRoute("/branch")({
  head: () => ({
    meta: [
      { property: "og:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { name: "twitter:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { title: "Branch Staff Portal | John Stayte Services" },
      {
        name: "description",
        content:
          "Official branch staff portal for John Stayte Services Click & Collect orders, cylinder handover and stock management.",
      },
      { property: "og:title", content: "Branch Staff Portal | John Stayte Services" },
      {
        property: "og:description",
        content: "Manage Click & Collect customer handovers, cylinder exchanges, and branch stock.",
      },
    ],
  }),
  component: BranchLayout,
});

function BranchLayout() {
  return (
    <BranchPortalLayout>
      <Outlet />
    </BranchPortalLayout>
  );
}


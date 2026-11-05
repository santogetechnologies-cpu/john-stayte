import { createFileRoute } from "@tanstack/react-router";
import { AdminBranchStaffView } from "@/components/admin/AdminBranchStaffView";

export const Route = createFileRoute("/admin/branch-staff")({
  head: () => ({
    meta: [
      { title: "Branch Staff Management | John Stayte Services Admin" },
      {
        name: "description",
        content:
          "Manage forecourt branch staff allocation, account lifecycle, and Click & Collect branch assignments.",
      },
    ],
  }),
  component: AdminBranchStaffView,
});


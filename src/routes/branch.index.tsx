import { createFileRoute } from "@tanstack/react-router";
import { BranchDashboardView } from "@/components/branch/BranchDashboardView";

export const Route = createFileRoute("/branch/")({
  component: BranchDashboardView,
});


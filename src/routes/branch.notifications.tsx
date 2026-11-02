import { createFileRoute } from "@tanstack/react-router";
import { BranchNotificationsView } from "@/components/branch/BranchNotificationsView";

export const Route = createFileRoute("/branch/notifications")({
  component: BranchNotificationsView,
});


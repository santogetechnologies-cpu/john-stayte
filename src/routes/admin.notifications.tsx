import { createFileRoute } from "@tanstack/react-router";
import { AdminNotificationsView } from "@/components/admin/AdminNotificationsView";

export const Route = createFileRoute("/admin/notifications")({
  component: AdminNotificationsView,
});

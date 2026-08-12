import { createFileRoute } from "@tanstack/react-router";
import { ManagerNotificationsView } from "@/components/manager/ManagerNotificationsView";

export const Route = createFileRoute("/manager/notifications")({
  component: ManagerNotificationsView,
});

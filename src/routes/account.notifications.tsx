import { createFileRoute } from "@tanstack/react-router";
import { CustomerNotificationsView } from "@/components/customer/CustomerNotificationsView";

export const Route = createFileRoute("/account/notifications")({
  component: CustomerNotificationsView,
});

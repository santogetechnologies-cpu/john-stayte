import { createFileRoute } from "@tanstack/react-router";
import { AdminDeliveriesView } from "@/components/admin/AdminDeliveriesView";

export const Route = createFileRoute("/admin/deliveries")({
  component: AdminDeliveriesView,
});

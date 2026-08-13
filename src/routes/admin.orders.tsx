import { createFileRoute } from "@tanstack/react-router";
import { AdminOrdersView } from "@/components/admin/AdminOrdersView";

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrdersView,
});

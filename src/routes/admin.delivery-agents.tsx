import { createFileRoute } from "@tanstack/react-router";
import { AdminDeliveryAgentsView } from "@/components/admin/AdminDeliveryAgentsView";

export const Route = createFileRoute("/admin/delivery-agents")({
  component: AdminDeliveryAgentsView,
});

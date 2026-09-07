import { createFileRoute } from "@tanstack/react-router";
import { ManagerDeliveryAgentsView } from "@/components/manager/ManagerDeliveryAgentsView";

export const Route = createFileRoute("/manager/delivery-agents")({
  component: ManagerDeliveryAgentsView,
});

import { createFileRoute } from "@tanstack/react-router";
import { ManagerDeliveryAssignmentView } from "@/components/manager/ManagerDeliveryAssignmentView";

export const Route = createFileRoute("/manager/delivery-assignment")({
  component: ManagerDeliveryAssignmentView,
});

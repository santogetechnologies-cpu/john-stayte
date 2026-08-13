import { createFileRoute } from "@tanstack/react-router";
import { ManagerDeliveriesView } from "@/components/manager/ManagerDeliveriesView";

export const Route = createFileRoute("/manager/deliveries")({
  component: ManagerDeliveriesView,
});

import { createFileRoute } from "@tanstack/react-router";
import { ManagerOrdersView } from "@/components/manager/ManagerOrdersView";

export const Route = createFileRoute("/manager/orders")({
  component: ManagerOrdersView,
});

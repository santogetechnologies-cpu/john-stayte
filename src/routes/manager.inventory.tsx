import { createFileRoute } from "@tanstack/react-router";
import { ManagerInventoryView } from "@/components/manager/ManagerInventoryView";

export const Route = createFileRoute("/manager/inventory")({
  component: ManagerInventoryView,
});

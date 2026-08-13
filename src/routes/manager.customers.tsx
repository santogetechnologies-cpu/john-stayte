import { createFileRoute } from "@tanstack/react-router";
import { ManagerCustomersView } from "@/components/manager/ManagerCustomersView";

export const Route = createFileRoute("/manager/customers")({
  component: ManagerCustomersView,
});

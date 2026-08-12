import { createFileRoute } from "@tanstack/react-router";
import { ManagerDashboardView } from "@/components/manager/ManagerDashboardView";

export const Route = createFileRoute("/manager/")({
  component: ManagerDashboardView,
});

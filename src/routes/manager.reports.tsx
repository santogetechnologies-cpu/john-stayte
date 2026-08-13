import { createFileRoute } from "@tanstack/react-router";
import { ManagerReportsView } from "@/components/manager/ManagerReportsView";

export const Route = createFileRoute("/manager/reports")({
  component: ManagerReportsView,
});

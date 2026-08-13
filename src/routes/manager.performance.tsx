import { createFileRoute } from "@tanstack/react-router";
import { ManagerPerformanceView } from "@/components/manager/ManagerPerformanceView";

export const Route = createFileRoute("/manager/performance")({
  component: ManagerPerformanceView,
});

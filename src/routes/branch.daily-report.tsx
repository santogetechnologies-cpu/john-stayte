import { createFileRoute } from "@tanstack/react-router";
import { BranchDailyReportView } from "@/components/branch/BranchDailyReportView";

export const Route = createFileRoute("/branch/daily-report")({
  component: BranchDailyReportView,
});


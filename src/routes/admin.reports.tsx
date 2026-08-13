import { createFileRoute } from "@tanstack/react-router";
import { AdminReportsView } from "@/components/admin/AdminReportsView";

export const Route = createFileRoute("/admin/reports")({
  component: AdminReportsView,
});

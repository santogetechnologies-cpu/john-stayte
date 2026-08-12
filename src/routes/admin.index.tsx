import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboardView } from "@/components/admin/AdminDashboardView";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboardView,
});

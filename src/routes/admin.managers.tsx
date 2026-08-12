import { createFileRoute } from "@tanstack/react-router";
import { AdminManagersView } from "@/components/admin/AdminManagersView";

export const Route = createFileRoute("/admin/managers")({
  component: AdminManagersView,
});

import { createFileRoute } from "@tanstack/react-router";
import { AdminAutoGasView } from "@/components/admin/AdminAutoGasView";

export const Route = createFileRoute("/admin/auto-gas")({
  component: AdminAutoGasView,
});

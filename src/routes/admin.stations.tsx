import { createFileRoute } from "@tanstack/react-router";
import { AdminStationsView } from "@/components/admin/AdminStationsView";

export const Route = createFileRoute("/admin/stations")({
  component: AdminStationsView,
});

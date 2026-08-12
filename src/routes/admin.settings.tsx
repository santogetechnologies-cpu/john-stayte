import { createFileRoute } from "@tanstack/react-router";
import { AdminSettingsView } from "@/components/admin/AdminSettingsView";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettingsView,
});

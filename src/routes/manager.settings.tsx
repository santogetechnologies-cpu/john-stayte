import { createFileRoute } from "@tanstack/react-router";
import { ManagerSettingsView } from "@/components/manager/ManagerSettingsView";

export const Route = createFileRoute("/manager/settings")({
  component: ManagerSettingsView,
});

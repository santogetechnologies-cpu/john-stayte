import { createFileRoute } from "@tanstack/react-router";
import { CustomerSettingsView } from "@/components/customer/CustomerSettingsView";

export const Route = createFileRoute("/account/settings")({
  component: CustomerSettingsView,
});

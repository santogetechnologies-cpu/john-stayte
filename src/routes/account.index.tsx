import { createFileRoute } from "@tanstack/react-router";
import { CustomerDashboardView } from "@/components/customer/CustomerDashboardView";

export const Route = createFileRoute("/account/")({
  component: CustomerDashboardView,
});

import { createFileRoute } from "@tanstack/react-router";
import { CustomerDeliveriesView } from "@/components/customer/CustomerDeliveriesView";

export const Route = createFileRoute("/account/deliveries")({
  component: CustomerDeliveriesView,
});

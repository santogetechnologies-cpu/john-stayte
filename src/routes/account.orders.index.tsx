import { createFileRoute } from "@tanstack/react-router";
import { CustomerOrdersView } from "@/components/customer/CustomerOrdersView";

export const Route = createFileRoute("/account/orders/")({
  component: CustomerOrdersView,
});

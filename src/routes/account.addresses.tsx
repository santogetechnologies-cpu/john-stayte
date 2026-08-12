import { createFileRoute } from "@tanstack/react-router";
import { CustomerAddressesView } from "@/components/customer/CustomerAddressesView";

export const Route = createFileRoute("/account/addresses")({
  component: CustomerAddressesView,
});

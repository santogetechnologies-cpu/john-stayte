import { createFileRoute } from "@tanstack/react-router";
import { CustomerProfileView } from "@/components/customer/CustomerProfileView";

export const Route = createFileRoute("/account/profile")({
  component: CustomerProfileView,
});

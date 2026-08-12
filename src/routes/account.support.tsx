import { createFileRoute } from "@tanstack/react-router";
import { CustomerSupportView } from "@/components/customer/CustomerSupportView";

export const Route = createFileRoute("/account/support")({
  component: CustomerSupportView,
});

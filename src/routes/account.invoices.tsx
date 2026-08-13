import { createFileRoute } from "@tanstack/react-router";
import { CustomerInvoicesView } from "@/components/customer/CustomerInvoicesView";

export const Route = createFileRoute("/account/invoices")({
  component: CustomerInvoicesView,
});

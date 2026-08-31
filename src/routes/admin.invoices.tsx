import { createFileRoute } from "@tanstack/react-router";
import { AdminInvoicesView } from "@/components/admin/AdminInvoicesView";

export const Route = createFileRoute("/admin/invoices")({
  component: AdminInvoicesView,
});

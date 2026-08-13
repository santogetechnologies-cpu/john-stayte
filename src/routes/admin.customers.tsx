import { createFileRoute } from "@tanstack/react-router";
import { AdminCustomersView } from "@/components/admin/AdminCustomersView";

export const Route = createFileRoute("/admin/customers")({
  component: AdminCustomersView,
});

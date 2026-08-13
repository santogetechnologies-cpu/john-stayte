import { createFileRoute } from "@tanstack/react-router";
import { AdminInventoryView } from "@/components/admin/AdminInventoryView";

export const Route = createFileRoute("/admin/inventory")({
  component: AdminInventoryView,
});

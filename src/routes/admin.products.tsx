import { createFileRoute } from "@tanstack/react-router";
import { AdminProductsView } from "@/components/admin/AdminProductsView";

export const Route = createFileRoute("/admin/products")({
  component: AdminProductsView,
});

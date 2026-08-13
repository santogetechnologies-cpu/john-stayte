import { createFileRoute } from "@tanstack/react-router";
import { AdminCategoriesView } from "@/components/admin/AdminCategoriesView";

export const Route = createFileRoute("/admin/categories")({
  component: AdminCategoriesView,
});

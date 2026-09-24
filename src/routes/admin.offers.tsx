import { createFileRoute } from "@tanstack/react-router";
import { AdminOffersView } from "@/components/admin/AdminOffersView";

export const Route = createFileRoute("/admin/offers")({
  component: AdminOffersView,
});

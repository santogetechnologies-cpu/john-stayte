import { createFileRoute } from "@tanstack/react-router";
import { AdminReviewsView } from "@/components/admin/AdminReviewsView";

export const Route = createFileRoute("/admin/reviews")({
  component: AdminReviewsView,
});

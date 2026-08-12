import { createFileRoute } from "@tanstack/react-router";
import { AdminFaqsView } from "@/components/admin/AdminFaqsView";

export const Route = createFileRoute("/admin/faqs")({
  component: AdminFaqsView,
});

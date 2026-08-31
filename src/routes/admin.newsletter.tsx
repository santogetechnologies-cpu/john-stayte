import { createFileRoute } from "@tanstack/react-router";
import { AdminNewsletterView } from "@/components/admin/AdminNewsletterView";

export const Route = createFileRoute("/admin/newsletter")({
  component: AdminNewsletterView,
});

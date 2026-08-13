import { createFileRoute } from "@tanstack/react-router";
import { AdminCmsView } from "@/components/admin/AdminCmsView";

export const Route = createFileRoute("/admin/cms")({
  component: AdminCmsView,
});

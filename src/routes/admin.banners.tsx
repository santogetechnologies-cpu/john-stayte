import { createFileRoute } from "@tanstack/react-router";
import { AdminBannersView } from "@/components/admin/AdminBannersView";

export const Route = createFileRoute("/admin/banners")({
  component: AdminBannersView,
});

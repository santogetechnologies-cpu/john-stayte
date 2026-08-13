import { createFileRoute } from "@tanstack/react-router";
import { AdminBlogView } from "@/components/admin/AdminBlogView";

export const Route = createFileRoute("/admin/blog")({
  component: AdminBlogView,
});

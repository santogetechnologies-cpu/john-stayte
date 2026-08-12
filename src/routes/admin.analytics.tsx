import { createFileRoute } from "@tanstack/react-router";
import { AdminAnalyticsView } from "@/components/admin/AdminAnalyticsView";

export const Route = createFileRoute("/admin/analytics")({
  component: AdminAnalyticsView,
});

import { createFileRoute } from "@tanstack/react-router";
import { DeliveryDashboardView } from "@/components/delivery/DeliveryDashboardView";

export const Route = createFileRoute("/delivery/")({
  head: () => ({
    meta: [
      { title: "Driver Home | John Stayte Services" },
      { name: "description", content: "Active delivery routes, schedule, and live dispatch." },
    ],
  }),
  component: DeliveryDashboardView,
});

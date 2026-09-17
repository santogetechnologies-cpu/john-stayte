import { createFileRoute } from "@tanstack/react-router";
import { DeliveryMyDeliveriesView } from "@/components/delivery/DeliveryMyDeliveriesView";

export const Route = createFileRoute("/delivery/today")({
  head: () => ({
    meta: [
      { title: "Today's Deliveries | John Stayte Services" },
      { name: "description", content: "Today's active transit routes and schedule." },
    ],
  }),
  component: () => <DeliveryMyDeliveriesView initialFilter="all" />,
});

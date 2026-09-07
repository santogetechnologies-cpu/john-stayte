import { createFileRoute } from "@tanstack/react-router";
import { DeliveryMyDeliveriesView } from "@/components/delivery/DeliveryMyDeliveriesView";

export const Route = createFileRoute("/delivery/completed")({
  head: () => ({
    meta: [
      { title: "Completed Deliveries | John Stayte Services" },
      { name: "description", content: "Historical successfully delivered orders." },
    ],
  }),
  component: () => <DeliveryMyDeliveriesView initialFilter="delivered" />,
});

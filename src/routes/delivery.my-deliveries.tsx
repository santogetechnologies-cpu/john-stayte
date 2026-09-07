import { createFileRoute } from "@tanstack/react-router";
import { DeliveryMyDeliveriesView } from "@/components/delivery/DeliveryMyDeliveriesView";

export const Route = createFileRoute("/delivery/my-deliveries")({
  head: () => ({
    meta: [
      { title: "My Deliveries | John Stayte Services" },
      { name: "description", content: "Assigned cylinder drop-offs and route matrix." },
    ],
  }),
  component: DeliveryMyDeliveriesView,
});

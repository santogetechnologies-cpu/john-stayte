import { createFileRoute } from "@tanstack/react-router";
import { DeliveryIssuesView } from "@/components/delivery/DeliveryIssuesView";

export const Route = createFileRoute("/delivery/issues")({
  head: () => ({
    meta: [
      { title: "Delivery Issues & Exceptions | John Stayte Services" },
      { name: "description", content: "Road obstacles and delivery exception tracking." },
    ],
  }),
  component: DeliveryIssuesView,
});

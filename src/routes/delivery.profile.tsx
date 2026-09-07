import { createFileRoute } from "@tanstack/react-router";
import { DeliveryProfileView } from "@/components/delivery/DeliveryProfileView";

export const Route = createFileRoute("/delivery/profile")({
  head: () => ({
    meta: [
      { title: "Driver Profile | John Stayte Services" },
      { name: "description", content: "Driver logistics specifications and rating record." },
    ],
  }),
  component: DeliveryProfileView,
});

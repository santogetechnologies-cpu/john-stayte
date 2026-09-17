import { createFileRoute } from "@tanstack/react-router";
import { DeliveryReturnsView } from "@/components/delivery/DeliveryReturnsView";

export const Route = createFileRoute("/delivery/returns")({
  head: () => ({
    meta: [
      { title: "Cylinder Verification | John Stayte Services" },
      {
        name: "description",
        content: "Inspect and verify empty LPG cylinders during delivery exchange.",
      },
    ],
  }),
  component: DeliveryReturnsView,
});

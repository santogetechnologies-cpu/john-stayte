import { createFileRoute } from "@tanstack/react-router";
import { DeliverySupportView } from "@/components/delivery/DeliverySupportView";

export const Route = createFileRoute("/delivery/support")({
  head: () => ({
    meta: [
      { title: "Driver & Logistics Support | John Stayte Services" },
      { name: "description", content: "Depot hotlines and LPG cylinder safety guidance." },
    ],
  }),
  component: DeliverySupportView,
});

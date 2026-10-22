import { createFileRoute } from "@tanstack/react-router";
import { AdminDeliverySlotsView } from "@/components/admin/AdminDeliverySlotsView";

export const Route = createFileRoute("/admin/delivery-slots")({
  head: () => ({
    meta: [
      { title: "Delivery Slot Management | John Stayte Services" },
      {
        name: "description",
        content:
          "Configure operational delivery time slots, capacity thresholds, working days, and date closures.",
      },
    ],
  }),
  component: AdminDeliverySlotsView,
});

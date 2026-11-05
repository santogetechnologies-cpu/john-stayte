import { createFileRoute } from "@tanstack/react-router";
import { AdminGasPricingView } from "@/components/admin/AdminGasPricingView";

export const Route = createFileRoute("/admin/gas-pricing")({
  head: () => ({
    meta: [
      { title: "Gas Pricing Management | John Stayte Services Admin" },
      {
        name: "description",
        content:
          "Manage client-based branch gas pricing, discount tiers, customer bands, VAT treatments, and delivery rules.",
      },
    ],
  }),
  component: AdminGasPricingView,
});


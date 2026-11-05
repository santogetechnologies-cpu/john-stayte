import { createFileRoute } from "@tanstack/react-router";
import { ManagerGasPricingView } from "@/components/manager/ManagerGasPricingView";

export const Route = createFileRoute("/manager/gas-pricing")({
  head: () => ({
    meta: [
      { title: "Branch Gas Pricing Directory | John Stayte Services Manager" },
      {
        name: "description",
        content:
          "View authorized branch gas pricing, customer discount bands, VAT specifications, and delivery rules.",
      },
    ],
  }),
  component: ManagerGasPricingView,
});


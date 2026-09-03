import { createFileRoute } from "@tanstack/react-router";
import { CustomerApplicationView } from "@/components/customer/CustomerApplicationView";

export const Route = createFileRoute("/account/application")({
  head: () => ({
    meta: [
      { title: "Gas Customer Application | John Stayte Services" },
      {
        name: "description",
        content:
          "Complete or view your official Gas Customer Application Form for Calor LPG supply across Gloucestershire.",
      },
    ],
  }),
  component: CustomerApplicationView,
});

import { createFileRoute } from "@tanstack/react-router";
import { CustomerOrderDetailView } from "@/components/customer/CustomerOrderDetailView";

export const Route = createFileRoute("/account/orders/$orderId")({
  head: () => ({
    meta: [
      { title: "Order Details | John Stayte Services" },
      {
        name: "description",
        content: "View tracking status, items, and delivery details for your JSS order.",
      },
    ],
  }),
  component: CustomerOrderDetailView,
});

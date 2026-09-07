import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DeliveryPortalLayout } from "@/components/delivery/DeliveryPortalLayout";

export const Route = createFileRoute("/delivery")({
  head: () => ({
    meta: [
      { title: "Delivery Agent Portal | John Stayte Services" },
      {
        name: "description",
        content:
          "Official logistics and route management console for John Stayte Services delivery drivers.",
      },
      { property: "og:title", content: "Delivery Agent Portal | John Stayte Services" },
    ],
  }),
  component: DeliveryLayout,
});

function DeliveryLayout() {
  return (
    <DeliveryPortalLayout>
      <Outlet />
    </DeliveryPortalLayout>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { AdminProductsView } from "@/components/admin/AdminProductsView";

export const Route = createFileRoute("/admin/order-gas/domestic")({
  component: DomesticOrderGasAdminView,
});

function DomesticOrderGasAdminView() {
  return (
    <AdminProductsView
      initialUsageType="DOMESTIC"
      lockedUsageType="DOMESTIC"
      viewTitle="Domestic LPG Products"
      viewDescription="Manage domestic home heating propane, portable indoor butane, and barbecue patio gas products."
    />
  );
}

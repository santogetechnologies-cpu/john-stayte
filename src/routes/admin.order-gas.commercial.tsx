import { createFileRoute } from "@tanstack/react-router";
import { AdminProductsView } from "@/components/admin/AdminProductsView";

export const Route = createFileRoute("/admin/order-gas/commercial")({
  component: CommercialOrderGasAdminView,
});

function CommercialOrderGasAdminView() {
  return (
    <AdminProductsView
      initialUsageType="COMMERCIAL"
      lockedUsageType="COMMERCIAL"
      viewTitle="Commercial LPG Products"
      viewDescription="Manage commercial 47kg/19kg propane, commercial kitchen supplies, FLT forklift gas, and cellar pub gas."
    />
  );
}

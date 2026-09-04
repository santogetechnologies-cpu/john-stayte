import { createFileRoute } from "@tanstack/react-router";
import { AdminProductsView } from "@/components/admin/AdminProductsView";

export const Route = createFileRoute("/admin/order-gas/bulk")({
  component: BulkOrderGasAdminView,
});

function BulkOrderGasAdminView() {
  return (
    <AdminProductsView
      initialUsageType="BULK"
      lockedUsageType="BULK"
      viewTitle="Bulk LPG & Tanks"
      viewDescription="Manage bulk metered road tanker vessel supply, agricultural drying, and forecourt autogas products."
    />
  );
}

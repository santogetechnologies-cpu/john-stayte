import { createFileRoute } from "@tanstack/react-router";
import { AdminProductsView } from "@/components/admin/AdminProductsView";

export const Route = createFileRoute("/admin/order-gas/autogas")({
  head: () => ({
    meta: [
      { title: "Vehicle LPG / Autogas Products | Admin Portal | John Stayte Services" },
      {
        name: "description",
        content:
          "Manage automotive LPG refuelling, commercial fleet accounts, and vehicle autogas products and services.",
      },
    ],
  }),
  component: AutogasOrderGasAdminView,
});

function AutogasOrderGasAdminView() {
  return (
    <AdminProductsView
      initialUsageType="AUTOGAS"
      lockedUsageType="AUTOGAS"
      viewTitle="Vehicle LPG / Autogas Products"
      viewDescription="Manage forecourt vehicle autogas refuelling, fleet keycard accounts, adapters, and automotive LPG products."
    />
  );
}

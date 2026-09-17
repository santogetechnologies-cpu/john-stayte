import { createFileRoute } from "@tanstack/react-router";
import { AdminCylinderDepositsView } from "@/components/admin/AdminCylinderDepositsView";

export const Route = createFileRoute("/admin/cylinder-deposits")({
  head: () => ({
    meta: [
      { title: "Cylinder Security Deposits | Admin Portal | John Stayte Services" },
      {
        name: "description",
        content:
          "Configure and manage real-time security deposits for LPG new cylinder purchases across the catalog.",
      },
    ],
  }),
  component: AdminCylinderDepositsPage,
});

function AdminCylinderDepositsPage() {
  return <AdminCylinderDepositsView />;
}

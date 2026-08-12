import { createFileRoute } from "@tanstack/react-router";
import { AdminAuditLogsView } from "@/components/admin/AdminAuditLogsView";

export const Route = createFileRoute("/admin/audit")({
  component: AdminAuditLogsView,
});

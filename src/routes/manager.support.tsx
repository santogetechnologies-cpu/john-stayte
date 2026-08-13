import { createFileRoute } from "@tanstack/react-router";
import { ManagerSupportView } from "@/components/manager/ManagerSupportView";

export const Route = createFileRoute("/manager/support")({
  component: ManagerSupportView,
});

import { createFileRoute } from "@tanstack/react-router";
import { ManagerProfileView } from "@/components/manager/ManagerProfileView";

export const Route = createFileRoute("/manager/profile")({
  component: ManagerProfileView,
});

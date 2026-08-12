import { createFileRoute } from "@tanstack/react-router";
import { ManagerEnquiriesView } from "@/components/manager/ManagerEnquiriesView";

export const Route = createFileRoute("/manager/enquiries")({
  component: ManagerEnquiriesView,
});

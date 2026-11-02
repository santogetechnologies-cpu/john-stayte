import { createFileRoute } from "@tanstack/react-router";
import { BranchOrdersView } from "@/components/branch/BranchOrdersView";

export const Route = createFileRoute("/branch/orders")({
  component: BranchOrdersView,
});


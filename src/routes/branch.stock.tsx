import { createFileRoute } from "@tanstack/react-router";
import { BranchStockView } from "@/components/branch/BranchStockView";

export const Route = createFileRoute("/branch/stock")({
  component: BranchStockView,
});


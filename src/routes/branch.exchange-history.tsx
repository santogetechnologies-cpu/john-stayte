import { createFileRoute } from "@tanstack/react-router";
import { BranchExchangeHistoryView } from "@/components/branch/BranchExchangeHistoryView";

export const Route = createFileRoute("/branch/exchange-history")({
  component: BranchExchangeHistoryView,
});


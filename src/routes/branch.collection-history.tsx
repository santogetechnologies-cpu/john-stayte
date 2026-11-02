import { createFileRoute } from "@tanstack/react-router";
import { BranchCollectionHistoryView } from "@/components/branch/BranchCollectionHistoryView";

export const Route = createFileRoute("/branch/collection-history")({
  component: BranchCollectionHistoryView,
});


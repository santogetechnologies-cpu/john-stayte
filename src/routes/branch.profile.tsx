import { createFileRoute } from "@tanstack/react-router";
import { BranchProfileView } from "@/components/branch/BranchProfileView";

export const Route = createFileRoute("/branch/profile")({
  component: BranchProfileView,
});


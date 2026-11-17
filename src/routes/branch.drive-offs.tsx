import { createFileRoute } from "@tanstack/react-router";
import { BranchDriveOffsView } from "@/components/branch/BranchDriveOffsView";

export const Route = createFileRoute("/branch/drive-offs")({
  head: () => ({
    meta: [
      { title: "Drive-Offs – Forecourt Incidents | Branch Staff Portal" },
      {
        name: "description",
        content: "Track and report fuel drive-off incidents at the forecourt.",
      },
    ],
  }),
  component: BranchDriveOffsView,
});


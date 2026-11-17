import { createFileRoute } from "@tanstack/react-router";
import { ManagerDriveOffsView } from "@/components/manager/ManagerDriveOffsView";

export const Route = createFileRoute("/manager/drive-offs")({
  head: () => ({
    meta: [
      { title: "Drive-Offs – Incident Management | Manager Portal" },
      {
        name: "description",
        content: "Track and manage fuel drive-off incidents across John Stayte forecourts.",
      },
    ],
  }),
  component: ManagerDriveOffsView,
});


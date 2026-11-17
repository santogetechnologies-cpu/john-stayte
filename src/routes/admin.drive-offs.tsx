import { createFileRoute } from "@tanstack/react-router";
import { AdminDriveOffsView } from "@/components/admin/AdminDriveOffsView";

export const Route = createFileRoute("/admin/drive-offs")({
  head: () => ({
    meta: [
      { title: "Drive-Offs – Fuel Incident Management | John Stayte Services" },
      {
        name: "description",
        content: "Track and manage fuel drive-off incidents across John Stayte forecourts.",
      },
    ],
  }),
  component: AdminDriveOffsView,
});


import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/account/returns")({
  beforeLoad: () => {
    throw redirect({ to: "/account/deliveries" });
  },
});

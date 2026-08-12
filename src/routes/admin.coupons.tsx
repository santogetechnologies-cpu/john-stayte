import { createFileRoute } from "@tanstack/react-router";
import { AdminCouponsView } from "@/components/admin/AdminCouponsView";

export const Route = createFileRoute("/admin/coupons")({
  component: AdminCouponsView,
});

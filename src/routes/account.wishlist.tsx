import { createFileRoute } from "@tanstack/react-router";
import { CustomerWishlistView } from "@/components/customer/CustomerWishlistView";

export const Route = createFileRoute("/account/wishlist")({
  component: CustomerWishlistView,
});

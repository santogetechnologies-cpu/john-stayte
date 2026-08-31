import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { products } from "@/data/catalog";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function cleanImageUrl(url?: string | null, slug?: string): string {
  const catalogMatch = slug ? products.find((p) => p.slug === slug) : undefined;

  if (!url || typeof url !== "string") {
    return catalogMatch?.image || "/placeholder.svg";
  }

  const trimmed = url.trim();
  if (!trimmed || trimmed === "/placeholder.svg") {
    return catalogMatch?.image || "/placeholder.svg";
  }

  // If the URL in DB points to a Vite source asset path like /src/assets/... or src/assets/... or @/assets/...
  if (
    trimmed.startsWith("/src/assets/") ||
    trimmed.startsWith("src/assets/") ||
    trimmed.startsWith("@/assets/")
  ) {
    // Prefer the bundled Vite asset for this product if known
    if (catalogMatch?.image) {
      return catalogMatch.image;
    }
    // Otherwise strip the src/assets prefix so it resolves to the file in /public/
    if (trimmed.startsWith("/src/assets/")) {
      return "/" + trimmed.slice("/src/assets/".length);
    }
    if (trimmed.startsWith("src/assets/")) {
      return "/" + trimmed.slice("src/assets/".length);
    }
    if (trimmed.startsWith("@/assets/")) {
      return "/" + trimmed.slice("@/assets/".length);
    }
  }

  return trimmed;
}

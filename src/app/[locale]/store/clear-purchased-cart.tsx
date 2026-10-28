"use client";

import { useEffect } from "react";
import { removeStoreCartItems } from "@/lib/store-cart";

/** Drop paid standards from the browser cart once Pesapal confirms the order. */
export function ClearPurchasedCart({ catalogItemIds }: { catalogItemIds: string }) {
  useEffect(() => {
    const ids = catalogItemIds.split(",").map((id) => id.trim()).filter(Boolean);
    if (ids.length === 0) return;
    removeStoreCartItems(ids);
  }, [catalogItemIds]);
  return null;
}

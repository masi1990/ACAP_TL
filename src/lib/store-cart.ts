"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "arso-webstore-cart";
export const STORE_CART_EVENT = "arso-webstore-cart";

export type StoreCartLine = {
  catalogItemId: string;
  editionLocale: string;
  designation: string;
  title: string;
  languageLabel: string;
  priceCents: number;
  currency: string;
};

function validLine(value: unknown): value is StoreCartLine {
  if (!value || typeof value !== "object") return false;
  const line = value as StoreCartLine;
  return Boolean(
    line.catalogItemId &&
      line.editionLocale &&
      line.designation &&
      typeof line.priceCents === "number" &&
      line.currency,
  );
}

export function readStoreCart(): StoreCartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const lines: StoreCartLine[] = [];
    for (const entry of parsed) {
      if (!validLine(entry)) continue;
      const key = `${entry.catalogItemId}:${entry.editionLocale}`;
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push(entry);
    }
    return lines;
  } catch {
    return [];
  }
}

export function writeStoreCart(lines: StoreCartLine[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  window.dispatchEvent(new Event(STORE_CART_EVENT));
}

export function addStoreCartLine(line: StoreCartLine) {
  const key = `${line.catalogItemId}:${line.editionLocale}`;
  const next = readStoreCart().filter((entry) => `${entry.catalogItemId}:${entry.editionLocale}` !== key);
  next.push(line);
  writeStoreCart(next);
}

export function removeStoreCartLine(catalogItemId: string, editionLocale: string) {
  writeStoreCart(
    readStoreCart().filter(
      (entry) => entry.catalogItemId !== catalogItemId || entry.editionLocale !== editionLocale,
    ),
  );
}

export function removeStoreCartItems(catalogItemIds: string[]) {
  const ids = new Set(catalogItemIds);
  writeStoreCart(readStoreCart().filter((entry) => !ids.has(entry.catalogItemId)));
}

export function useStoreCart() {
  const [lines, setLines] = useState<StoreCartLine[]>([]);
  useEffect(() => {
    const sync = () => setLines(readStoreCart());
    sync();
    window.addEventListener(STORE_CART_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(STORE_CART_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return lines;
}

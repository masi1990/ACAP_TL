import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { getPesapalConfig } from "@/lib/pesapal";
import { CartClient } from "./cart-client";

export default async function CartPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ payError?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const sp = await searchParams;
  const pesapal = getPesapalConfig();
  return (
    <CartClient
      locale={raw}
      pesapalReady={pesapal.configured && pesapal.appBaseUrl.startsWith("https://")}
      payError={sp.payError?.trim().slice(0, 180) || ""}
    />
  );
}

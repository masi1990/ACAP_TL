import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkoutDescription, parseCheckoutLines, quoteCartLines } from "@/lib/store-checkout";
import {
  getAccessToken,
  getPesapalConfig,
  normalizePesapalPhone,
  pesapalBillingAddress,
  resolveNotificationId,
  submitOrderRequest,
} from "@/lib/pesapal";

/**
 * Checkout: Pesapal API v3 hosted page. The standard is released only after
 * Pesapal reports COMPLETED. Card data is never stored.
 */
async function readBody(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    return { body, navigate: false };
  }
  const form = await req.formData();
  return {
    navigate: true,
    body: {
      provider: form.get("provider"),
      buyerEmail: form.get("buyerEmail"),
      buyerName: form.get("buyerName"),
      buyerPhone: form.get("buyerPhone"),
      locale: form.get("locale"),
      catalogItemId: form.getAll("catalogItemId"),
      editionLocale: form.getAll("editionLocale"),
      channel: form.get("channel"),
      next: form.get("next"),
    },
  };
}

function browserError(locale: string, next: string, message: string) {
  const path = next === "cart" ? `/${locale}/store/cart` : `/${locale}/store`;
  const dest = new URL(path, getPesapalConfig().appBaseUrl);
  dest.searchParams.set("payError", message.slice(0, 180));
  return NextResponse.redirect(dest, 303);
}

export async function POST(req: NextRequest) {
  const { body, navigate } = await readBody(req);
  const provider = String(body.provider || "");
  const buyerEmail = String(body.buyerEmail || "").toLowerCase().trim();
  const buyerName = String(body.buyerName || "").trim();
  const buyerPhone = normalizePesapalPhone(String(body.buyerPhone || ""));
  const locale = ["en", "fr", "pt", "ar"].includes(String(body.locale || "")) ? String(body.locale) : "en";
  const next = body.next === "cart" ? "cart" : "store";
  const fail = (message: string, status: number) =>
    navigate ? browserError(locale, next, message) : NextResponse.json({ error: message }, { status });

  if (provider !== "PESAPAL") {
    return fail("Pay with Pesapal to buy these standards", 400);
  }
  if (!buyerName) {
    return fail("Buyer name is required", 400);
  }
  if (!buyerEmail || !buyerEmail.includes("@")) {
    return fail("Valid buyer email is required", 400);
  }
  if (buyerPhone.replace(/\D/g, "").length < 9) {
    return fail("A phone number is required for Pesapal", 400);
  }

  const config = getPesapalConfig();
  if (!config.configured) {
    return fail("Pesapal is not configured yet. Add the live consumer key and secret, then restart the app.", 503);
  }
  if (!config.appBaseUrl.startsWith("https://")) {
    return fail("Pesapal must reach this app over https. Set APP_BASE_URL to the public address, then restart the app.", 503);
  }

  const quote = await quoteCartLines(parseCheckoutLines(body));
  if (!quote.payable) {
    return fail(quote.problems[0]?.message || quote.currencyError || "Add at least one standard", 400);
  }

  const order = await prisma.order.create({
    data: {
      buyerEmail,
      buyerName,
      buyerPhone,
      status: "CHECKOUT",
      totalCents: quote.totalCents,
      currency: quote.currency,
      locale,
      lines: {
        create: quote.lines.map((line) => ({
          catalogItemId: line.catalogItemId,
          unitPriceCents: line.unitPriceCents,
          qty: 1,
          editionLocale: line.editionLocale,
        })),
      },
      payments: {
        create: {
          provider,
          providerRef: null,
          amountCents: quote.totalCents,
          currency: quote.currency,
          status: "INITIATED",
        },
      },
    },
    include: { payments: true },
  });

  const payment = order.payments[0];

  try {
    const token = await getAccessToken(config.consumerKey, config.consumerSecret, config.env);
    const ipnUrl = `${config.appBaseUrl}/api/store/pesapal/ipn`;
    const savedIpn = config.ipnId
      ? null
      : await prisma.pesapalNotification.findUnique({
          where: {
            environment_notificationUrl: { environment: config.env, notificationUrl: ipnUrl },
          },
        });
    const notificationId = await resolveNotificationId(
      token,
      config.env,
      ipnUrl,
      config.ipnId || savedIpn?.notificationId,
    );
    await prisma.pesapalNotification.upsert({
      where: {
        environment_notificationUrl: { environment: config.env, notificationUrl: ipnUrl },
      },
      create: { environment: config.env, notificationUrl: ipnUrl, notificationId },
      update: { notificationId },
    });

    const amount = quote.totalCents / 100;
    const submitted = await submitOrderRequest(token, config.env, {
      id: order.id,
      currency: quote.currency,
      amount,
      description: checkoutDescription(quote.lines),
      callback_url: `${config.appBaseUrl}/api/store/pesapal/callback/${locale}`,
      notification_id: notificationId,
      billing_address: pesapalBillingAddress({
        email: buyerEmail,
        phone: buyerPhone,
        fullName: buyerName,
      }),
    });

    if (!submitted.redirect_url || !submitted.order_tracking_id) {
      await prisma.order.update({ where: { id: order.id }, data: { status: "FAILED" } });
      await prisma.paymentAttempt.update({
        where: { id: payment.id },
        data: { status: "FAILED", statusDetail: "NO_REDIRECT", rawJson: JSON.stringify(submitted) },
      });
      return fail(
        submitted.error?.message || submitted.message || "Pesapal did not return a redirect URL",
        502,
      );
    }

    await prisma.paymentAttempt.update({
      where: { id: payment.id },
      data: {
        providerRef: submitted.order_tracking_id,
        statusDetail: "REDIRECTED",
        rawJson: JSON.stringify(submitted),
      },
    });

    if (navigate) return NextResponse.redirect(submitted.redirect_url, 303);
    return NextResponse.json({
      message: "Redirecting to Pesapal hosted checkout",
      orderId: order.id,
      redirectUrl: submitted.redirect_url,
      providerRef: submitted.order_tracking_id,
      mode: config.env,
    });
  } catch (err) {
    await prisma.order.update({ where: { id: order.id }, data: { status: "FAILED" } });
    await prisma.paymentAttempt.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        statusDetail: "SUBMIT_FAILED",
        rawJson: JSON.stringify({ message: err instanceof Error ? err.message : "Pesapal checkout failed" }),
      },
    });
    const message = err instanceof Error ? err.message : "Pesapal checkout failed";
    return fail(message, 502);
  }
}

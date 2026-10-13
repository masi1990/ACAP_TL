import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getAccessToken,
  getPesapalConfig,
  resolveNotificationId,
  splitBuyerName,
  submitOrderRequest,
} from "@/lib/pesapal";

/**
 * Checkout: Pesapal API v3 hosted page. The standard is released only after
 * Pesapal reports COMPLETED. Card data is never stored.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const provider = String(body.provider || "");
  const buyerEmail = String(body.buyerEmail || "").toLowerCase().trim();
  const buyerName = String(body.buyerName || "").trim();
  const buyerPhone = String(body.buyerPhone || "").replace(/[^\d+]/g, "");
  const locale = ["en", "fr", "pt", "ar"].includes(String(body.locale || "")) ? String(body.locale) : "en";

  if (provider !== "PESAPAL") {
    return NextResponse.json({ error: "Pay with Pesapal to buy this standard" }, { status: 400 });
  }
  if (!buyerName) {
    return NextResponse.json({ error: "Buyer name is required" }, { status: 400 });
  }
  if (!buyerEmail || !buyerEmail.includes("@")) {
    return NextResponse.json({ error: "Valid buyer email is required" }, { status: 400 });
  }
  if (buyerPhone.replace(/\D/g, "").length < 9) {
    return NextResponse.json({ error: "A phone number is required for Pesapal" }, { status: 400 });
  }

  const config = getPesapalConfig();
  if (!config.configured) {
    return NextResponse.json(
      {
        error:
          "Pesapal is not configured yet. Add the live consumer key and secret, then restart the app.",
      },
      { status: 503 },
    );
  }
  if (!config.appBaseUrl.startsWith("https://")) {
    return NextResponse.json(
      {
        error:
          "Pesapal must reach this app over https. Set APP_BASE_URL to the public address, then restart the app.",
      },
      { status: 503 },
    );
  }

  const item = await prisma.catalogItem.findUnique({
    where: { id: String(body.catalogItemId) },
    include: { standardVersion: { include: { standard: true } } },
  });
  if (!item || !item.active) return NextResponse.json({ error: "Catalog item not found" }, { status: 404 });
  if (item.priceCents <= 0) {
    return NextResponse.json({ error: "This standard has no price yet" }, { status: 400 });
  }

  const order = await prisma.order.create({
    data: {
      buyerEmail,
      buyerName,
      buyerPhone,
      status: "CHECKOUT",
      totalCents: item.priceCents,
      currency: item.currency,
      locale,
      lines: {
        create: {
          catalogItemId: item.id,
          unitPriceCents: item.priceCents,
          qty: 1,
        },
      },
      payments: {
        create: {
          provider,
          providerRef: null,
          amountCents: item.priceCents,
          currency: item.currency,
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

    const { firstName, lastName } = splitBuyerName(buyerName);
    const amount = item.priceCents / 100;
    const submitted = await submitOrderRequest(token, config.env, {
      id: order.id,
      currency: item.currency,
      amount,
      description: `${item.standardVersion.editionLabel} — ${item.coverTitle}`.slice(0, 100),
      callback_url: `${config.appBaseUrl}/api/store/pesapal/callback?locale=${locale}`,
      notification_id: notificationId,
      billing_address: {
        email_address: buyerEmail,
        phone_number: buyerPhone,
        country_code: "KE",
        first_name: firstName,
        last_name: lastName,
      },
    });

    if (!submitted.redirect_url || !submitted.order_tracking_id) {
      await prisma.order.update({ where: { id: order.id }, data: { status: "FAILED" } });
      await prisma.paymentAttempt.update({
        where: { id: payment.id },
        data: { status: "FAILED", statusDetail: "NO_REDIRECT", rawJson: JSON.stringify(submitted) },
      });
      return NextResponse.json(
        {
          error:
            submitted.error?.message ||
            submitted.message ||
            "Pesapal did not return a redirect URL",
        },
        { status: 502 },
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
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

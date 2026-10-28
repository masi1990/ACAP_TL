/**
 * Pesapal API v3 client — ported from thebunch-ke-pesapal-woocommerce
 * `lib/pesapalV30Helper.php` (WordPress plugin cannot run in Next.js).
 */

export type PesapalEnv = "demo" | "live";

export type PesapalBillingAddress = {
  email_address: string;
  phone_number?: string;
  country_code?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  line_1?: string;
  line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  zip_code?: string;
};

export type PesapalSubmitOrderInput = {
  id: string;
  currency: string;
  amount: number;
  description: string;
  callback_url: string;
  notification_id: string;
  billing_address: PesapalBillingAddress;
  language?: string;
  account_number?: string;
  app_id?: string;
};

export type PesapalSubmitOrderResponse = {
  order_tracking_id?: string;
  merchant_reference?: string;
  redirect_url?: string;
  status?: string;
  message?: string;
  error?: { code?: string; message?: string };
};

export type PesapalTransactionStatus = {
  payment_method?: string;
  amount?: number;
  created_date?: string;
  confirmation_code?: string;
  payment_status_description?: string;
  description?: string;
  message?: string;
  payment_account?: string;
  call_back_url?: string;
  status_code?: number;
  merchant_reference?: string;
  currency?: string;
  error?: { code?: string; message?: string };
  status?: string;
};

type TokenResponse = {
  token?: string;
  expiryDate?: string;
  error?: { code?: string; message?: string };
  message?: string;
  status?: string;
};

type IpnListItem = {
  url?: string;
  ipn_id?: string;
  created_date?: string;
  ipn_notification_type?: string;
  ipn_notification_type_description?: string;
};

function baseUrl(env: PesapalEnv): string {
  return env === "live" ? "https://pay.pesapal.com/v3" : "https://cybqa.pesapal.com/pesapalv3";
}

export function getPesapalConfig() {
  const consumerKey = process.env.PESAPAL_CONSUMER_KEY?.trim() || "";
  const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET?.trim() || "";
  const env = (process.env.PESAPAL_ENV === "live" ? "live" : "demo") as PesapalEnv;
  const ipnId = process.env.PESAPAL_IPN_ID?.trim() || "";
  const appBaseUrl = (process.env.APP_BASE_URL || "http://127.0.0.1:43123").replace(/\/$/, "");
  return {
    consumerKey,
    consumerSecret,
    env,
    ipnId,
    appBaseUrl,
    configured: Boolean(consumerKey && consumerSecret),
  };
}

async function pesapalFetch<T>(
  env: PesapalEnv,
  path: string,
  opts: { method?: "GET" | "POST"; token?: string; body?: unknown } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "text/plain",
    "Content-Type": "application/json",
  };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

  let res: Response;
  try {
    res = await fetch(`${baseUrl(env)}${path}`, {
      method: opts.method ?? (opts.body ? "POST" : "GET"),
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      throw new Error("Pesapal did not respond. The payment service is not answering, so checkout cannot continue.");
    }
    throw err;
  }

  const text = await res.text();
  let data: T;
  try {
    data = JSON.parse(text) as T;
  } catch {
    throw new Error(`Pesapal returned non-JSON (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const err = data as { error?: { message?: string }; message?: string };
    throw new Error(err?.error?.message || err?.message || `Pesapal HTTP ${res.status}`);
  }
  return data;
}

export async function getAccessToken(
  consumerKey: string,
  consumerSecret: string,
  env: PesapalEnv,
): Promise<string> {
  const data = await pesapalFetch<TokenResponse>(env, "/api/Auth/RequestToken", {
    method: "POST",
    body: { consumer_key: consumerKey, consumer_secret: consumerSecret },
  });
  if (!data.token) {
    throw new Error(data.error?.message || data.message || "Pesapal auth failed — no token");
  }
  return data.token;
}

export async function getRegisteredIpn(token: string, env: PesapalEnv): Promise<IpnListItem[]> {
  const data = await pesapalFetch<IpnListItem[] | { error?: { message?: string } }>(
    env,
    "/api/URLSetup/GetIpnList",
    { token },
  );
  return Array.isArray(data) ? data : [];
}

export async function registerIpn(
  token: string,
  env: PesapalEnv,
  ipnUrl: string,
): Promise<string> {
  const data = await pesapalFetch<{ ipn_id?: string; error?: { message?: string }; message?: string }>(
    env,
    "/api/URLSetup/RegisterIPN",
    {
      method: "POST",
      token,
      body: { url: ipnUrl, ipn_notification_type: "GET" },
    },
  );
  if (!data.ipn_id) {
    throw new Error(data.error?.message || data.message || "Pesapal IPN registration failed");
  }
  return data.ipn_id;
}

/** Resolve notification_id: env cache → existing registered URL → register new. */
export async function resolveNotificationId(
  token: string,
  env: PesapalEnv,
  ipnUrl: string,
  cachedIpnId?: string,
): Promise<string> {
  if (cachedIpnId) return cachedIpnId;

  const list = await getRegisteredIpn(token, env);
  const match = list.find((item) => item.url === ipnUrl && item.ipn_id);
  if (match?.ipn_id) return match.ipn_id;

  return registerIpn(token, env, ipnUrl);
}

export async function submitOrderRequest(
  token: string,
  env: PesapalEnv,
  input: PesapalSubmitOrderInput,
): Promise<PesapalSubmitOrderResponse> {
  return pesapalFetch<PesapalSubmitOrderResponse>(env, "/api/Transactions/SubmitOrderRequest", {
    method: "POST",
    token,
    body: {
      language: input.language ?? "EN",
      currency: input.currency,
      amount: input.amount,
      id: input.id,
      description: input.description,
      account_number: input.account_number ?? "",
      app_id: input.app_id ?? "",
      billing_address: {
        phone_number: input.billing_address.phone_number ?? "",
        email_address: input.billing_address.email_address,
        country_code: input.billing_address.country_code ?? "KE",
        first_name: input.billing_address.first_name ?? "",
        middle_name: input.billing_address.middle_name ?? "",
        last_name: input.billing_address.last_name ?? "",
        line_1: input.billing_address.line_1 ?? "",
        line_2: input.billing_address.line_2 ?? "",
        city: input.billing_address.city ?? "",
        state: input.billing_address.state ?? "",
        postal_code: input.billing_address.postal_code ?? "",
        zip_code: input.billing_address.zip_code ?? "",
      },
      callback_url: input.callback_url,
      notification_id: input.notification_id,
      terms_and_conditions_id: "",
    },
  });
}

export async function getTransactionStatus(
  token: string,
  env: PesapalEnv,
  orderTrackingId: string,
): Promise<PesapalTransactionStatus> {
  return pesapalFetch<PesapalTransactionStatus>(
    env,
    `/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`,
    { token },
  );
}

export function splitBuyerName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "Buyer", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

/** Pesapal's M-Pesa box is the 9-digit number next to +254, for example 726688456. */
export function normalizePesapalPhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length >= 12) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

/**
 * Pesapal's card form rejects an empty surname, street, city, or postal code.
 * The store only collects name, email, and phone, so the Kenya sandbox
 * merchant gets a complete billing record the buyer can still edit on Pesapal.
 */
export function pesapalBillingAddress(input: {
  email: string;
  phone: string;
  fullName: string;
}): PesapalBillingAddress {
  const { firstName, lastName } = splitBuyerName(input.fullName);
  return {
    email_address: input.email,
    phone_number: normalizePesapalPhone(input.phone),
    country_code: "KE",
    first_name: firstName,
    last_name: lastName || firstName,
    line_1: "Nairobi",
    city: "Nairobi",
    postal_code: "00100",
    zip_code: "00100",
  };
}

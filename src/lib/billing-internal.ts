import { createHash, createHmac, randomBytes } from "node:crypto";

function getBillingUrl(path: string): URL {
  const baseUrl = process.env.BILLING_API_URL;
  if (!baseUrl) throw new Error("BILLING_API_URL is not configured");
  return new URL(path, baseUrl);
}

export async function billingInternalPost<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const secret = process.env.PORTAL_SESSION_SECRET;
  if (!secret) throw new Error("PORTAL_SESSION_SECRET is not configured");

  const bodyText = JSON.stringify(body);
  const timestamp = Date.now().toString();
  const nonce = randomBytes(16).toString("base64url");
  const bodyDigest = createHash("sha256").update(bodyText).digest("hex");
  const signature = createHmac("sha256", secret)
    .update(`POST.${path}.${timestamp}.${nonce}.${bodyDigest}`)
    .digest("base64url");

  const response = await fetch(getBillingUrl(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Portal-Internal-Timestamp": timestamp,
      "X-Portal-Internal-Nonce": nonce,
      "X-Portal-Internal-Signature": signature,
    },
    body: bodyText,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : `SmartBilling API returned HTTP ${response.status}`;
    throw new Error(message);
  }
  return payload as T;
}

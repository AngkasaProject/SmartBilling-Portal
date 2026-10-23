import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export interface Session {
  customerId: string;
  name: string;
  phone: string;
  exp: number;
}

export const PORTAL_SESSION_COOKIE_NAME = "portal_session";
const MAX_SESSION_COOKIE_LENGTH = 4096;

function getSessionSecret(): string {
  const secret = process.env.PORTAL_SESSION_SECRET;
  if (!secret) {
    throw new Error("PORTAL_SESSION_SECRET is not configured");
  }
  return secret;
}

function isSessionPayload(value: unknown): value is Session {
  if (typeof value !== "object" || value === null) return false;

  const payload = value as Record<string, unknown>;
  return (
    typeof payload.customerId === "string" &&
    typeof payload.name === "string" &&
    typeof payload.phone === "string" &&
    typeof payload.exp === "number" &&
    Number.isFinite(payload.exp)
  );
}

export function signSession(payload: Session): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const signature = createHmac("sha256", getSessionSecret())
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

export function verifySession(cookieValue: string): Session | null {
  if (
    !cookieValue ||
    cookieValue.length > MAX_SESSION_COOKIE_LENGTH
  ) {
    return null;
  }

  const separatorIndex = cookieValue.indexOf(".");
  if (
    separatorIndex <= 0 ||
    separatorIndex !== cookieValue.lastIndexOf(".")
  ) {
    return null;
  }

  const encodedPayload = cookieValue.slice(0, separatorIndex);
  const encodedSignature = cookieValue.slice(separatorIndex + 1);
  if (!encodedPayload || !encodedSignature) return null;

  let suppliedSignature: Buffer;
  try {
    suppliedSignature = Buffer.from(encodedSignature, "base64url");
  } catch {
    return null;
  }

  const expectedSignature = createHmac("sha256", getSessionSecret())
    .update(encodedPayload)
    .digest();
  if (
    suppliedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(suppliedSignature, expectedSignature)
  ) {
    return null;
  }

  let payload: unknown;
  try {
    payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    );
  } catch {
    return null;
  }

  if (!isSessionPayload(payload) || payload.exp <= Date.now()) {
    return null;
  }

  return payload;
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(PORTAL_SESSION_COOKIE_NAME)?.value;
  return cookieValue ? verifySession(cookieValue) : null;
}

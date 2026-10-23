import { randomBytes, randomInt } from "node:crypto";

export function generateOTP(phone: string): {
  code: string;
  verificationToken: string;
} {
  if (!phone) throw new Error("A phone number is required");
  return {
    code: randomInt(0, 1_000_000).toString().padStart(6, "0"),
    verificationToken: randomBytes(32).toString("base64url"),
  };
}

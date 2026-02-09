import crypto from "node:crypto";

/**
 * Passimpay signature:
 * platformId + ";" + JSON(body) + ";" + secret
 * HMAC-SHA256(secret, payload) -> hex
 */
export function passimpaySignature(platformId: string, body: unknown, secret: string) {
  const payload = platformId + ";" + JSON.stringify(body) + ";" + secret;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifyPassimpaySignature(
  platformId: string,
  body: unknown,
  secret: string,
  signature: string
) {
  const expected = passimpaySignature(platformId, body, secret);
  // constant-time compare
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature || "", "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

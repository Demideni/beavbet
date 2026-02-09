import crypto from "node:crypto";

/**
 * Passimpay signature (per docs):
 * payload = platformId + ";" + JSON(body) + ";" + secret
 * signature = HMAC-SHA256(secret, payload) -> hex
 *
 * IMPORTANT:
 * For webhooks we must verify against the *raw request body string*,
 * because re-serializing JSON can change key order/whitespace and break signature.
 */
export function passimpaySignature(platformId: string, body: unknown, secret: string) {
  const payload = platformId + ";" + JSON.stringify(body) + ";" + secret;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function passimpaySignatureFromRaw(platformId: string, rawJson: string, secret: string) {
  const payload = platformId + ";" + rawJson + ";" + secret;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifyPassimpaySignature(
  platformId: string,
  body: unknown,
  secret: string,
  signature: string
) {
  const expected = passimpaySignature(platformId, body, secret);
  return safeEqual(expected, signature);
}

export function verifyPassimpaySignatureFromRaw(
  platformId: string,
  rawJson: string,
  secret: string,
  signature: string
) {
  const expected = passimpaySignatureFromRaw(platformId, rawJson, secret);
  return safeEqual(expected, signature);
}

function safeEqual(expectedHex: string, gotHex: string) {
  const a = Buffer.from(expectedHex || "", "utf8");
  const b = Buffer.from(gotHex || "", "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

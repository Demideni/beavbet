import crypto from "node:crypto";

export function passimpaySignature(platformId: string, body: unknown, secret: string) {
  // Per Passimpay docs: platformId + ";" + JSON.stringify(body) + ";" + secret
  const payload = `${platformId};${JSON.stringify(body)};${secret}`;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifyPassimpaySignature(
  platformId: string,
  body: unknown,
  secret: string,
  signature: string | null | undefined
) {
  if (!signature) return false;
  const expected = passimpaySignature(platformId, body, secret);
  // constant-time compare
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

import crypto from "node:crypto";

export type GaConfig = {
  apiUrl: string;
  merchantId: string;
  merchantKey: string;
};

function envFirst(...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = process.env[k];
    if (v && v.trim()) return v.trim();
  }
  return undefined;
}

export function getGaConfig(): GaConfig {
  const apiUrl =
    envFirst("GA_API_URL", "GAME_API_URL", "GAMEROUTER_API_URL") ??
    "https://staging.gamerouter.pw/api/index.php/v1";
  const merchantId = envFirst("GA_MERCHANT_ID", "MERCHANT_ID", "GAMEROUTER_MERCHANT_ID");
  const merchantKey = envFirst("GA_MERCHANT_KEY", "MERCHANT_KEY", "GAMEROUTER_MERCHANT_KEY");

  if (!merchantId) throw new Error("GA_MERCHANT_ID is not set");
  if (!merchantKey) throw new Error("GA_MERCHANT_KEY is not set");

  return { apiUrl, merchantId, merchantKey };
}

export function gaCurrency(): string {
  return (
    envFirst("GA_CURRENCY", "GAME_CURRENCY", "CURRENCY") ??
    "EUR"
  );
}

function buildQuery(params: Record<string, string | number | boolean | null | undefined>): string {
  const entries: Array<[string, string]> = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    entries.push([k, String(v)]);
  }
  entries.sort((a, b) => a[0].localeCompare(b[0]));
  const usp = new URLSearchParams();
  for (const [k, v] of entries) usp.append(k, v);
  return usp.toString();
}

function sign(query: string, merchantKey: string): string {
  return crypto.createHmac("sha1", merchantKey).update(query).digest("hex");
}

async function gaRequest<T>(
  cfg: GaConfig,
  path: string,
  params: Record<string, any>,
  method: "GET" | "POST" = "POST",
): Promise<T> {
  const nonce = crypto.randomBytes(8).toString("hex");
  const timestamp = Math.floor(Date.now() / 1000);

  // Provider signature includes request params + these header values
  const signedParams = {
    ...params,
    "X-Merchant-Id": cfg.merchantId,
    "X-Nonce": nonce,
    "X-Timestamp": timestamp,
  };

  const query = buildQuery(signedParams);
  const xSign = sign(query, cfg.merchantKey);

  const url = new URL(cfg.apiUrl.replace(/\/$/, "") + path);
  const headers: Record<string, string> = {
    "X-Merchant-Id": cfg.merchantId,
    "X-Nonce": nonce,
    "X-Timestamp": String(timestamp),
    "X-Sign": xSign,
  };

  let res: Response;
  if (method === "GET") {
    url.search = query;
    res = await fetch(url, { method: "GET", headers, cache: "no-store" });
  } else {
    res = await fetch(url, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
      body: query,
      cache: "no-store",
    });
  }

  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`GA API non-JSON response (${res.status}): ${text.slice(0, 300)}`);
  }
  if (!res.ok) {
    throw new Error(`GA API HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  if (json?.error || json?.success === false) {
    throw new Error(`GA API error: ${text.slice(0, 400)}`);
  }
  return json as T;
}

export async function gaGames() {
  const cfg = getGaConfig();
  // Some docs use /games (POST). We'll call POST with no params.
  return gaRequest<any>(cfg, "/games", {}, "POST");
}

export async function gaInit(params: {
  game_uuid: string;
  user_id: string;
  session_id: string;
  return_url: string;
  currency: string;
  language?: string;
  is_mobile?: boolean;
}) {
  const cfg = getGaConfig();
  return gaRequest<any>(
    cfg,
    "/games/init",
    {
      game_uuid: params.game_uuid,
      user_id: params.user_id,
      session_id: params.session_id,
      return_url: params.return_url,
      currency: params.currency,
      language: params.language ?? "ru",
      is_mobile: params.is_mobile ? 1 : 0,
    },
    "POST",
  );
}

export async function gaSelfValidate(session_id: string) {
  const cfg = getGaConfig();
  return gaRequest<any>(cfg, "/self-validate", { session_id }, "POST");
}

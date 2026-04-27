import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { URL } from "node:url";

export type LegacyUpstreamResponse = {
  status: number;
  text: string;
};

/**
 * Sends a GET request with a JSON body (as Postman does for the legacy APIs).
 * Node's `fetch` disallows bodies on GET, so we fall back to http/https directly.
 */
export const sendLegacyGetWithBody = (
  url: string,
  body: string,
  token: string
): Promise<LegacyUpstreamResponse> =>
  new Promise<LegacyUpstreamResponse>((resolve, reject) => {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === "https:";
    const makeRequest = isHttps ? httpsRequest : httpRequest;

    const req = makeRequest(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: `${parsed.pathname}${parsed.search}`,
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 500,
            text: Buffer.concat(chunks).toString("utf8"),
          });
        });
      }
    );

    req.on("error", reject);
    req.write(body);
    req.end();
  });

export const parseLegacyResponse = (text: string): unknown => {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return {
      status: false,
      message: "Invalid JSON from legacy API",
      raw: text,
    };
  }
};

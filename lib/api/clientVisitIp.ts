/**
 * Resolves the client’s public/network IP in the browser and caches it for the tab.
 * Used by axios, RTK Query, and any manual fetch to the API so every call can send the same IP.
 *
 * Order: Next /api/client-ip (respects your hosting proxy) → ipify fallback.
 */

const VISIT_IP_STORAGE_KEY = "visitClientIp";

let resolved: string | null | undefined;
let inflight: Promise<string | null> | null = null;

/** Loopback / unknown — not your real LAN or public IP (common on local `next dev`). */
function isLoopbackOrUnknown(ip: string): boolean {
  const s = ip.trim().toLowerCase();
  if (!s || s === "unknown") return true;
  if (s === "localhost") return true;
  if (s === "::1" || s === "0:0:0:0:0:0:0:1") return true;
  if (/^127\.\d+\.\d+\.\d+$/.test(s)) return true;
  if (s.startsWith("::ffff:127.")) return true;
  return false;
}

async function fetchPublicIpFallback(): Promise<string | null> {
  try {
    const res = await fetch("https://api.ipify.org?format=json", { cache: "no-store" });
    const data = (await res.json()) as { ip?: string };
    const ip = data.ip?.trim();
    return ip || null;
  } catch {
    return null;
  }
}

/**
 * Cached per tab. Safe to call on every request; only one resolution runs until it completes.
 */
export async function getVisitClientIp(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  if (resolved !== undefined) {
    if (resolved === null) return null;
    if (!isLoopbackOrUnknown(resolved)) return resolved;
    resolved = undefined;
    inflight = null;
  }

  if (!inflight) {
    inflight = (async () => {
      try {
        const cached = sessionStorage.getItem(VISIT_IP_STORAGE_KEY);
        if (cached) {
          if (!isLoopbackOrUnknown(cached)) {
            resolved = cached;
            console.log("[HIIMS] Client network IP (sessionStorage):", cached);
            return cached;
          }
          sessionStorage.removeItem(VISIT_IP_STORAGE_KEY);
        }
      } catch {
        /* private mode */
      }

      let ip: string | null = null;
      let source: "/api/client-ip" | "ipify" | null = null;

      try {
        const res = await fetch(`${window.location.origin}/api/client-ip`, {
          cache: "no-store",
        });
        const data = (await res.json()) as { ip?: string };
        const v = data.ip?.trim();
        if (v && v !== "unknown") {
          if (isLoopbackOrUnknown(v)) {
            console.log(
              "[HIIMS] /api/client-ip returned loopback (%s); using public IP instead (normal on localhost).",
              v
            );
          } else {
            ip = v;
            source = "/api/client-ip";
          }
        }
      } catch {
        /* dev / static / offline */
      }

      if (!ip) {
        ip = await fetchPublicIpFallback();
        if (ip && isLoopbackOrUnknown(ip)) ip = null;
        if (ip) source = "ipify";
      }

      if (ip) {
        console.log("[HIIMS] Client network IP:", ip, `(source: ${source})`);
        try {
          sessionStorage.setItem(VISIT_IP_STORAGE_KEY, ip);
        } catch {
          /* private mode */
        }
        resolved = ip;
        return ip;
      }

      console.warn("[HIIMS] Client network IP: could not resolve (check /api/client-ip and network)");
      resolved = null;
      return null;
    })();
  }

  return inflight;
}

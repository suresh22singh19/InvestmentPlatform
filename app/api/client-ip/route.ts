import { NextRequest } from "next/server";

/**
 * Returns the client IP as seen by this Next.js server (visitor / login context).
 * Uses proxy headers when the app sits behind nginx, cloud load balancers, etc.
 */
export async function GET(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnecting = request.headers.get("cf-connecting-ip");

  let ip =
    (cfConnecting && cfConnecting.trim()) ||
    (realIp && realIp.trim()) ||
    "";

  if (!ip && forwarded) {
    ip = forwarded.split(",")[0]?.trim() ?? "";
  }

  if (!ip) {
    ip = "unknown";
  }

  return Response.json({ ip });
}

import { NextRequest } from "next/server";
import {
    LEGACY_PROJECT_API_BASE_URL,
    LEGACY_PROJECT_API_TOKEN,
    LEGACY_PROJECT_ENDPOINTS,
} from "@/lib/legacyProjectApi";
import { parseLegacyResponse, sendLegacyGetWithBody } from "@/lib/legacyHttp";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    try {
        const q = request.nextUrl.searchParams;
        const patientId = Number(q.get("patientId") ?? 0) || 0;
        const bookingId = Number(q.get("bookingId") ?? 0) || 0;

        /** Nursing note list (search + pagination) shares upstream `/prebookingDetail` with patient-scoped body. */
        const body =
            patientId > 0
                ? (() => {
                      const page = Math.max(1, Number(q.get("page") ?? 1) || 1);
                      const limit = Math.max(1, Math.min(100, Number(q.get("limit") ?? 10) || 10));
                      const metakey = (q.get("metakey") ?? "").trim();
                      const metavalue = (q.get("metavalue") ?? "").trim();
                      const nursingBody: Record<string, string | number> = {
                          patientId,
                          limit,
                          page,
                      };
                      if (metakey) nursingBody.metakey = metakey;
                      if (metavalue) nursingBody.metavalue = metavalue;
                      return nursingBody;
                  })()
                : { bookingId };

        const url = `${LEGACY_PROJECT_API_BASE_URL}${LEGACY_PROJECT_ENDPOINTS.prebookingDetail}`;
        const upstream = await sendLegacyGetWithBody(url, JSON.stringify(body), LEGACY_PROJECT_API_TOKEN);
        return Response.json(parseLegacyResponse(upstream.text), { status: upstream.status });
    } catch (error) {
        return Response.json(
            {
                status: false,
                message: "Failed to fetch prebooking detail",
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}


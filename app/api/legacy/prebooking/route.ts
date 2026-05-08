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
        const body = {
            contactNumber: q.get("contactNumber")?.trim() || "",
            patientName: q.get("patientName")?.trim() || "",
            bookingType: q.get("bookingType")?.trim() || "opd",
            bookingStatus: q.get("bookingStatus")?.trim() || "active",
            startDate: q.get("startDate")?.trim() || "",
            endDate: q.get("endDate")?.trim() || "",
            limit: Number(q.get("limit") ?? 10) || 10,
            page: Number(q.get("page") ?? 1) || 1,
        };

        const url = `${LEGACY_PROJECT_API_BASE_URL}${LEGACY_PROJECT_ENDPOINTS.prebooking}`;
        const upstream = await sendLegacyGetWithBody(url, JSON.stringify(body), LEGACY_PROJECT_API_TOKEN);
        return Response.json(parseLegacyResponse(upstream.text), { status: upstream.status });
    } catch (error) {
        return Response.json(
            {
                status: false,
                message: "Failed to fetch prebooking list",
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

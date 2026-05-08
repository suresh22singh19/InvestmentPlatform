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

        const toNumber = (value: string | null, fallback: number): number => {
            const n = Number(value);
            return Number.isFinite(n) && n > 0 ? n : fallback;
        };

        const body = {
            branchId: toNumber(q.get("branchId"), 1),
            status: q.get("status")?.trim() || "active",
            patientName: q.get("patientName")?.trim() || "",
            startDate: q.get("startDate")?.trim() || "",
            endDate: q.get("endDate")?.trim() || "",
            limit: toNumber(q.get("limit"), 10),
            page: toNumber(q.get("page"), 1),
        };

        const url = `${LEGACY_PROJECT_API_BASE_URL}${LEGACY_PROJECT_ENDPOINTS.branchLead}`;
        const upstream = await sendLegacyGetWithBody(url, JSON.stringify(body), LEGACY_PROJECT_API_TOKEN);
        return Response.json(parseLegacyResponse(upstream.text), { status: upstream.status });
    } catch (error) {
        return Response.json(
            {
                status: false,
                message: "Failed to fetch branch lead list",
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}


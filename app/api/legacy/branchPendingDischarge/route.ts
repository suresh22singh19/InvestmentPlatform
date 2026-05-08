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
        const incoming = request.nextUrl.searchParams;

        const pick = (key: string, fallback: string): string => {
            const raw = incoming.get(key);
            return raw != null && raw.trim() !== "" ? raw : fallback;
        };

        const pickNumber = (key: string, fallback: number): number => {
            const raw = incoming.get(key);
            const parsed = Number(raw);
            return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
        };

        const body = {
            branchId: pick("branchId", ""),
            uhid: pick("uhid", ""),
            patientName: pick("patientName", ""),
            limit: pickNumber("limit", 10),
            page: pickNumber("page", 1),
        };

        const url = `${LEGACY_PROJECT_API_BASE_URL}${LEGACY_PROJECT_ENDPOINTS.branchPendingDischarge}`;
        const upstream = await sendLegacyGetWithBody(
            url,
            JSON.stringify(body),
            LEGACY_PROJECT_API_TOKEN
        );

        return Response.json(parseLegacyResponse(upstream.text), { status: upstream.status });
    } catch (error) {
        return Response.json(
            {
                status: false,
                message: "Failed to fetch branch pending discharge list",
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

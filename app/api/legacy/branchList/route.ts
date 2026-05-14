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
        const branchId = Number(q.get("branchId") ?? 0);

        const url = `${LEGACY_PROJECT_API_BASE_URL}${LEGACY_PROJECT_ENDPOINTS.branchList}`;
        const upstream = await sendLegacyGetWithBody(url, JSON.stringify({ branchId }), LEGACY_PROJECT_API_TOKEN);

        return Response.json(parseLegacyResponse(upstream.text), { status: upstream.status });
    } catch (error) {
        return Response.json(
            {
                status: false,
                message: "Failed to fetch branch list",
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

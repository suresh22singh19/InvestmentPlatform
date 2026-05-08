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
        const patientId = incoming.get("patientId")?.trim() || incoming.get("id")?.trim() || "";
        const body = { patientId };

        const url = `${LEGACY_PROJECT_API_BASE_URL}${LEGACY_PROJECT_ENDPOINTS.patientPackage}`;
        const upstream = await sendLegacyGetWithBody(url, JSON.stringify(body), LEGACY_PROJECT_API_TOKEN);

        return Response.json(parseLegacyResponse(upstream.text), { status: upstream.status });
    } catch (error) {
        return Response.json(
            {
                status: false,
                message: "Failed to fetch patient package",
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

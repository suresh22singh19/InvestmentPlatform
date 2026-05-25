import { API_BASE_URL } from "@/lib/config/api";

export const NURSE_PHOTO_PLACEHOLDER = "/icons/Portrait_Placeholder.svg";

function isDefaultNursePlaceholder(imgUrl: string): boolean {
    const t = imgUrl.trim();
    if (!t || t === "default.png") return true;
    const lower = t.toLowerCase();
    return lower.endsWith("/default.png") || lower.endsWith("default.png");
}

export function fileNameFromUrl(url: string | null | undefined): string {
    const raw = (url ?? "").trim();
    if (!raw) return "";
    try {
        const path = raw.split("?")[0] ?? "";
        const seg = path.split(/[/\\]/).filter(Boolean).pop() ?? "";
        return decodeURIComponent(seg) || "";
    } catch {
        return "";
    }
}

export function resolveNursePhotoSrc(imgUrl: string | null | undefined): string {
    const raw = (imgUrl ?? "").trim();
    if (!raw || isDefaultNursePlaceholder(raw)) return NURSE_PHOTO_PLACEHOLDER;
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    const origin = API_BASE_URL.replace(/\/api\/v2\/?$/i, "");
    return `${origin}/${raw.replace(/^\//, "")}`;
}

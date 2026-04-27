import { API_BASE_URL } from "@/lib/config/api";

export const DOCTOR_PHOTO_PLACEHOLDER = "/icons/Portrait_Placeholder.svg";

/** API may send `default.png`, `doctors/default.png`, or full URL ending in `/default.png`. */
function isDefaultDoctorPlaceholder(imgUrl: string): boolean {
    const t = imgUrl.trim();
    if (!t || t === "default.png") return true;
    const lower = t.toLowerCase();
    if (lower.endsWith("/default.png") || lower.endsWith("\\default.png")) return true;
    try {
        if (lower.startsWith("http://") || lower.startsWith("https://")) {
            const path = new URL(t).pathname.toLowerCase();
            return path.endsWith("/default.png");
        }
    } catch {
        /* ignore */
    }
    return lower.endsWith("default.png");
}

/** Last path segment of a URL, for showing e.g. `1776401093525-abc.png` in file fields on edit. */
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

/** List/detail: full S3 URL, app-origin URL, relative path, or placeholder → local SVG when no real photo. */
export function resolveDoctorPhotoSrc(imgUrl: string | null | undefined): string {
    const raw = (imgUrl ?? "").trim();
    if (!raw || isDefaultDoctorPlaceholder(raw)) return DOCTOR_PHOTO_PLACEHOLDER;
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    const origin = API_BASE_URL.replace(/\/api\/v2\/?$/i, "");
    return `${origin}/${raw.replace(/^\//, "")}`;
}

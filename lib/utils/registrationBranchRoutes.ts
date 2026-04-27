/**
 * Maps settings branch `type` to the main registration list URL.
 * Used for superadmin branch switching and related flows.
 */
export function registrationListPathFromBranchType(
    typeRaw: string | null | undefined,
): "/registration" | "/registration/hospital" {
    const t = (typeRaw ?? "").toLowerCase().trim();
    if (t === "hospital") return "/registration/hospital";
    return "/registration";
}

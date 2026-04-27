/**
 * Default/system panels returned by GET /admin/settings/panel (often `isDefaultPanel: true`)
 * must not appear in the "Panel" patient-type dropdown — the user selects a real contract panel.
 */
const PANEL_DROPDOWN_EXCLUDED_NAMES = new Set(["normal", "tpa"]);

export function isPanelNameHiddenFromPanelTypeDropdown(name: string | undefined): boolean {
    return PANEL_DROPDOWN_EXCLUDED_NAMES.has((name ?? "").trim().toLowerCase());
}

/** API name for the default "Normal" row bound to patient type Private */
export const DEFAULT_PANEL_NAME_FOR_PRIVATE = "Normal";
/** API name for the default TPA row bound to patient type TPA */
export const DEFAULT_PANEL_NAME_FOR_TPA_TYPE = "TPA";

export type PanelListItem = { id: number; name: string; status?: string | undefined };

function isActivePanelStatus(status: string | undefined): boolean {
    return status === "active" || status === "Active";
}

/** Resolve numeric id for an active panel by exact name (case-insensitive). */
export function findActivePanelIdByName(
    panels: PanelListItem[] | undefined,
    name: string
): number | undefined {
    if (!panels?.length) return undefined;
    const target = name.trim().toLowerCase();
    const found = panels.find(
        (p) => isActivePanelStatus(p.status) && (p.name ?? "").trim().toLowerCase() === target
    );
    return found?.id;
}

export function findActivePanelIdStringByName(
    panels: PanelListItem[] | undefined,
    name: string
): string | undefined {
    const id = findActivePanelIdByName(panels, name);
    return id != null ? String(id) : undefined;
}

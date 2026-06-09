import type { WardCapacityItem, WardCapacityStatusColor } from "./types";
import { buildWardCapacityItem, calculateOccupancyPercentage } from "./utils";

type IpdWardCapacityOverviewResponse = {
  data?: IpdWardCapacityOverviewData | IpdWardCapacityOverviewApiItem[];
  categories?: IpdWardCapacityOverviewApiItem[];
};

type IpdWardCapacityOverviewData = {
  categories?: IpdWardCapacityOverviewApiItem[];
  roomTypes?: IpdWardCapacityOverviewApiItem[];
  wardCapacity?: IpdWardCapacityOverviewApiItem[];
  wardCapacityOverview?: IpdWardCapacityOverviewApiItem[];
  wards?: IpdWardCapacityOverviewApiItem[];
};

export type IpdWardCapacityOverviewView = {
  wardCapacity: WardCapacityItem[];
  roomTypes: WardCapacityItem[];
};

type IpdWardCapacityOverviewApiItem = {
  id?: string | number | null;
  roomCategory?: string | null;
  wardCategory?: string | null;
  roomType?: string | null;
  roomTyp?: string | null;
  wardType?: string | null;
  name?: string | null;
  label?: string | null;
  totalCapacity?: number | null;
  totalBeds?: number | null;
  total?: number | null;
  bedCount?: number | null;
  occupiedBeds?: number | null;
  occupied?: number | null;
  freeBeds?: number | null;
  free?: number | null;
  availableBeds?: number | null;
  statusColor?: string | null;
  color?: string | null;
  status?: string | null;
};

function slugifyId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseStatusColor(
  item: IpdWardCapacityOverviewApiItem
): WardCapacityStatusColor | undefined {
  const raw = item.statusColor ?? item.color ?? item.status;
  if (!raw) return undefined;
  const normalized = String(raw).toLowerCase();
  if (normalized === "green" || normalized === "low" || normalized === "available") {
    return "green";
  }
  if (
    normalized === "grey" ||
    normalized === "gray" ||
    normalized === "medium" ||
    normalized === "moderate"
  ) {
    return "grey";
  }
  if (normalized === "red" || normalized === "high" || normalized === "critical") {
    return "red";
  }
  return undefined;
}

export function deriveWardCapacityStatusColor(
  occupiedBeds: number,
  totalBeds: number
): WardCapacityStatusColor {
  if (totalBeds <= 0) return "grey";
  const occupancyPct = calculateOccupancyPercentage(occupiedBeds, totalBeds);
  if (occupancyPct >= 85) return "red";
  if (occupancyPct >= 55) return "grey";
  return "green";
}

/** e.g. `ipd-general-ward` → `General Ward`, `semi-general` → `Semi General` */
export function formatRoomTypeCategoryLabel(code: string): string {
  const normalized = code.trim().replace(/^ipd-/i, "");
  if (!normalized) return code.trim() || "Unknown";

  return normalized
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function resolveRowLabel(item: IpdWardCapacityOverviewApiItem): string {
  const rawCode =
    item.roomCategory?.trim() ||
    item.wardCategory?.trim() ||
    item.roomType?.trim() ||
    item.roomTyp?.trim() ||
    item.wardType?.trim() ||
    item.name?.trim() ||
    item.label?.trim() ||
    "";

  if (rawCode) return formatRoomTypeCategoryLabel(rawCode);
  return "Unknown";
}

function resolveBedCounts(item: IpdWardCapacityOverviewApiItem): {
  totalBeds: number;
  occupiedBeds: number;
  freeBeds: number;
} {
  const totalBeds =
    item.totalCapacity ?? item.totalBeds ?? item.total ?? item.bedCount ?? 0;
  let occupiedBeds = item.occupiedBeds ?? item.occupied;
  let freeBeds = item.freeBeds ?? item.free ?? item.availableBeds;

  if (occupiedBeds == null && freeBeds != null) {
    occupiedBeds = Math.max(0, totalBeds - freeBeds);
  }
  if (freeBeds == null && occupiedBeds != null) {
    freeBeds = Math.max(0, totalBeds - occupiedBeds);
  }

  occupiedBeds = Math.min(Math.max(occupiedBeds ?? 0, 0), totalBeds);
  freeBeds = Math.min(Math.max(freeBeds ?? totalBeds - occupiedBeds, 0), totalBeds);

  return { totalBeds, occupiedBeds, freeBeds };
}

function resolveRowCode(item: IpdWardCapacityOverviewApiItem): string {
  return (
    item.roomCategory?.trim() ||
    item.wardCategory?.trim() ||
    item.roomType?.trim() ||
    item.roomTyp?.trim() ||
    item.wardType?.trim() ||
    ""
  );
}

function mapApiItemToWardCapacityItem(
  item: IpdWardCapacityOverviewApiItem,
  index: number
): WardCapacityItem | null {
  const name = resolveRowLabel(item);
  const { totalBeds, occupiedBeds } = resolveBedCounts(item);

  if (totalBeds <= 0) return null;

  const rowCode = resolveRowCode(item);
  const id =
    item.id != null && String(item.id).trim() !== ""
      ? String(item.id)
      : slugifyId(rowCode || name) || `capacity-${index}`;

  const statusColor =
    parseStatusColor(item) ?? deriveWardCapacityStatusColor(occupiedBeds, totalBeds);

  return buildWardCapacityItem(id, name, totalBeds, occupiedBeds, statusColor);
}

function mapApiItems(items: IpdWardCapacityOverviewApiItem[] | undefined): WardCapacityItem[] {
  if (!items?.length) return [];
  return items
    .map((item, index) => mapApiItemToWardCapacityItem(item, index))
    .filter((item): item is WardCapacityItem => Boolean(item));
}

/** Maps `data.categories` (or equivalent) to progress rows for a capacity card. */
export function mapCapacityCategories(
  data: IpdWardCapacityOverviewData | IpdWardCapacityOverviewApiItem[] | undefined
): WardCapacityItem[] {
  if (!data) return [];
  if (Array.isArray(data)) return mapApiItems(data);
  return mapApiItems(
    data.categories ??
      data.roomTypes ??
      data.wardCapacity ??
      data.wardCapacityOverview ??
      data.wards
  );
}

/** @deprecated Use mapCapacityCategories for each API separately. */
export function mapIpdWardCapacityOverview(
  data: IpdWardCapacityOverviewData | IpdWardCapacityOverviewApiItem[] | undefined
): IpdWardCapacityOverviewView {
  if (!data) {
    return { wardCapacity: [], roomTypes: [] };
  }
  if (Array.isArray(data)) {
    return { wardCapacity: [], roomTypes: mapApiItems(data) };
  }
  return {
    wardCapacity: mapApiItems(
      data.wardCapacity ?? data.wardCapacityOverview ?? data.wards
    ),
    roomTypes: mapApiItems(data.categories ?? data.roomTypes),
  };
}

/** Normalizes RTK response body (`data` wrapper or root `categories`). */
export function extractCapacityOverviewPayload(
  response: IpdWardCapacityOverviewResponse | undefined
): IpdWardCapacityOverviewData | IpdWardCapacityOverviewApiItem[] | undefined {
  if (!response) return undefined;
  if (response.data != null) return response.data;
  if (response.categories?.length) return { categories: response.categories };
  return undefined;
}

/** @deprecated Use extractCapacityOverviewPayload */
export const extractRoomTypeCapacityPayload = extractCapacityOverviewPayload;

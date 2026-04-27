/**
 * Derive configuration counts from GET /branch/getBranchHierarchyTree `data[]` payload.
 * Handles `building[].floor` as a single object or an array; missing fields → null (display as "-").
 * When `insights` is present on the branch, use it for summary counts (API source of truth).
 */

export type HierarchyBed = {
  id?: number;
  bedNumber?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type HierarchyRoom = {
  id?: number;
  roomNumber?: string | null;
  roomType?: string | null;
  roomConfigStatus?: string | null;
  status?: string | null;
  bed?: HierarchyBed[] | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type HierarchyFloor = {
  id?: number;
  /** Master floor catalog id (used when updating branch–building–floor mapping) */
  floorId?: number | null;
  floor?: string | null;
  description?: string | null;
  room?: HierarchyRoom[] | HierarchyRoom | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type HierarchyBuilding = {
  id?: number;
  name?: string | null;
  floor?: HierarchyFloor | HierarchyFloor[] | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

/** Matches list + hierarchy responses; `rooms` may use `completed` or `configured`. */
export type HierarchyInsightsRooms = {
  total?: number;
  completed?: number;
  configured?: number;
  incomplete?: number;
};

export type HierarchyInsightsBeds = {
  total?: number;
  completed?: number;
  configured?: number;
  incomplete?: number;
};

export type HierarchyInsights = {
  buildings?: number;
  floors?: number;
  blocks?: number;
  departments?: number;
  rooms?: HierarchyInsightsRooms;
  beds?: HierarchyInsightsBeds;
  completionPercentage?: number;
  /** Master data counts from GET /branch/getBranchHierarchyTree */
  totalBranchHardware?: number;
  totalBranchFacility?: number;
  totalBranchRoomTypes?: number;
  /** Some APIs expose hierarchy freshness only on insights */
  updatedAt?: string | null;
  lastModified?: string | null;
};

export type HierarchyBranch = {
  id?: number;
  name?: string | null;
  building?: HierarchyBuilding[] | null;
  insights?: HierarchyInsights | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type BranchHierarchyStats = {
  buildings: number | null;
  floors: number | null;
  departments: number | null;
  blocks: number | null;
  rooms: number | null;
  configuredRooms: number | null;
  incompleteRooms: number | null;
  /** null = unknown (e.g. no roomConfigStatus on any room and no insights). */
  completionPercent: number | null;
  configuredKnown: boolean;
  lastModifiedIso: string | null;
};

export function normalizeHierarchyFloors(building: HierarchyBuilding): HierarchyFloor[] {
  const f = building.floor;
  if (f == null) return [];
  return Array.isArray(f) ? f : [f];
}

function floorRoomsList(floor: HierarchyFloor): HierarchyRoom[] {
  const rr = floor.room;
  if (rr == null) return [];
  return Array.isArray(rr) ? rr.filter((r) => r != null) : [rr];
}

function collectRooms(branch: HierarchyBranch): HierarchyRoom[] {
  const rooms: HierarchyRoom[] = [];
  for (const b of branch.building ?? []) {
    for (const floor of normalizeHierarchyFloors(b)) {
      rooms.push(...floorRoomsList(floor));
    }
  }
  return rooms;
}

function isoTimeMs(iso: string | null | undefined): number {
  if (iso == null || String(iso).trim() === "") return NaN;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? NaN : t;
}

/** Latest meaningful timestamp from branch root and nested buildings/floors/rooms (API often omits branch dates). */
function hierarchyLastModifiedIso(branch: HierarchyBranch): string | null {
  let best: string | null = null;
  let bestMs = -Infinity;
  const consider = (s: string | null | undefined) => {
    if (s == null || String(s).trim() === "") return;
    const ms = isoTimeMs(s);
    if (Number.isNaN(ms)) return;
    if (ms > bestMs) {
      bestMs = ms;
      best = String(s).trim();
    }
  };

  consider(branch.updatedAt);
  consider(branch.createdAt);
  const ins = branch.insights;
  if (ins && typeof ins === "object") {
    consider(ins.updatedAt);
    consider(ins.lastModified);
  }
  for (const b of branch.building ?? []) {
    consider(b.updatedAt);
    consider(b.createdAt);
    for (const floor of normalizeHierarchyFloors(b)) {
      consider(floor.updatedAt);
      consider(floor.createdAt);
      for (const r of floorRoomsList(floor)) {
        consider(r.updatedAt);
        consider(r.createdAt);
        const beds = r.bed;
        const bedList = Array.isArray(beds) ? beds.filter((x) => x != null) : beds != null ? [beds] : [];
        for (const bed of bedList) {
          consider(bed.updatedAt);
          consider(bed.createdAt);
        }
      }
    }
  }
  return best;
}

function countFloors(branch: HierarchyBranch): number {
  let n = 0;
  for (const b of branch.building ?? []) {
    n += normalizeHierarchyFloors(b).length;
  }
  return n;
}

export function isConfiguredStatus(s: string | null | undefined): boolean {
  const x = String(s ?? "").toLowerCase();
  return x === "complete" || x === "completed" || x === "configured";
}

function insightsRoomConfigured(meta: HierarchyInsightsRooms | undefined): number {
  if (!meta) return 0;
  if (typeof meta.configured === "number" && Number.isFinite(meta.configured)) return meta.configured;
  if (typeof meta.completed === "number" && Number.isFinite(meta.completed)) return meta.completed;
  return 0;
}

function insightsRoomIncomplete(meta: HierarchyInsightsRooms | undefined, total: number, configured: number): number {
  if (!meta) return Math.max(0, total - configured);
  if (typeof meta.incomplete === "number" && Number.isFinite(meta.incomplete)) return meta.incomplete;
  return Math.max(0, total - configured);
}

export function computeBranchHierarchyStats(
  branches: HierarchyBranch[] | null | undefined
): BranchHierarchyStats {
  const empty: BranchHierarchyStats = {
    buildings: null,
    floors: null,
    departments: null,
    blocks: null,
    rooms: null,
    configuredRooms: null,
    incompleteRooms: null,
    completionPercent: null,
    configuredKnown: false,
    lastModifiedIso: null,
  };

  if (!branches || branches.length === 0) return empty;

  const branch = branches[0];
  const buildingList = branch.building ?? [];
  const buildingCount = buildingList.length;
  const floorCount = countFloors(branch);
  const ins = branch.insights;

  if (ins && typeof ins === "object") {
    const roomsMeta = ins.rooms ?? {};
    const total =
      typeof roomsMeta.total === "number" && Number.isFinite(roomsMeta.total)
        ? roomsMeta.total
        : collectRooms(branch).length;
    const configured = insightsRoomConfigured(roomsMeta);
    const incomplete = insightsRoomIncomplete(roomsMeta, total, configured);
    const pctRaw = ins.completionPercentage;
    const pctFromInsights =
      typeof pctRaw === "number" && Number.isFinite(pctRaw)
        ? Math.min(100, Math.max(0, Math.round(pctRaw)))
        : total > 0
          ? Math.round((configured / total) * 100)
          : 0;

    return {
      buildings: typeof ins.buildings === "number" && Number.isFinite(ins.buildings) ? ins.buildings : buildingCount,
      floors: typeof ins.floors === "number" && Number.isFinite(ins.floors) ? ins.floors : floorCount,
      departments:
        typeof ins.departments === "number" && Number.isFinite(ins.departments) ? ins.departments : null,
      blocks: typeof ins.blocks === "number" && Number.isFinite(ins.blocks) ? ins.blocks : null,
      rooms: total,
      configuredRooms: configured,
      incompleteRooms: incomplete,
      completionPercent: pctFromInsights,
      configuredKnown: true,
      lastModifiedIso: branch.updatedAt ?? branch.createdAt ?? null,
    };
  }

  const rooms = collectRooms(branch);
  const roomCount = rooms.length;

  let configuredKnown = false;
  let configuredCount = 0;

  if (roomCount === 0) {
    configuredKnown = true;
    configuredCount = 0;
  } else {
    const hasAnyConfigFlag = rooms.some(
      (r) => r.roomConfigStatus != null && String(r.roomConfigStatus).trim() !== ""
    );
    if (hasAnyConfigFlag) {
      configuredKnown = true;
      configuredCount = rooms.filter((r) => isConfiguredStatus(String(r.roomConfigStatus ?? ""))).length;
    }
  }

  const completionPercent =
    configuredKnown && roomCount > 0
      ? Math.round((configuredCount / roomCount) * 100)
      : !configuredKnown && roomCount > 0
        ? null
        : configuredKnown
          ? 0
          : null;

  const incompleteRooms = configuredKnown ? Math.max(0, roomCount - configuredCount) : null;

  return {
    buildings: buildingCount,
    floors: floorCount,
    departments: null,
    blocks: null,
    rooms: roomCount,
    configuredRooms: configuredKnown ? configuredCount : null,
    incompleteRooms,
    completionPercent,
    configuredKnown,
    lastModifiedIso: hierarchyLastModifiedIso(branch),
  };
}

export function formatHierarchyLastModified(iso: string | null | undefined): string {
  if (!iso || String(iso).trim() === "") return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function statDisplay(n: number | null | undefined): string {
  if (n == null || (typeof n === "number" && Number.isNaN(n))) return "-";
  return String(n);
}

export function roomsConfiguredDisplay(
  configured: number | null | undefined,
  total: number | null | undefined,
  known: boolean
): string {
  if (total == null || total === 0) return total === 0 ? "0 / 0" : "-";
  if (!known || configured == null) return "-";
  return `${configured} / ${total}`;
}

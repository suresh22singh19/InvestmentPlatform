import { isConfiguredStatus } from "@/lib/utils/branchHierarchyStats";
import type {
  CompleteBranchHierarchyPayload,
  CompleteHierarchyBuilding,
  CompleteHierarchyRoom,
} from "@/store/api/branchSetupApi";

export type CompleteTreeNode = {
  id: string;
  name: string;
  type: "building" | "floor" | "room" | "bed";
  children?: CompleteTreeNode[];
  roomNumber?: string;
  roomType?: string;
  bedNumber?: string;
  roomConfigStatus?: string | null;
  /** API-level counts for row summary (rooms • beds) */
  branchSummary?: { rooms: number; beds: number };
};

function mapBeds(
  roomId: number,
  beds: CompleteHierarchyRoom["beds"]
): CompleteTreeNode[] | undefined {
  if (!beds?.length) return undefined;
  return beds.map((bed, idx) => ({
    id: bed.id != null ? `bed-${bed.id}` : `bed-${roomId}-${idx}`,
    name:
      bed.name?.trim() ||
      (bed.bedNumber != null && String(bed.bedNumber).trim()
        ? `Bed ${bed.bedNumber}`
        : `Bed ${idx + 1}`),
    type: "bed" as const,
    bedNumber: bed.bedNumber != null ? String(bed.bedNumber) : String(idx + 1),
  }));
}

export function mapCompleteBranchTreeToNodes(
  apiTree: CompleteHierarchyBuilding[]
): CompleteTreeNode[] {
  return apiTree.map((b) => ({
    id: `building-${b.id}`,
    name: b.name,
    type: "building" as const,
    branchSummary: b.counts
      ? { rooms: b.counts.rooms ?? 0, beds: b.counts.beds ?? 0 }
      : undefined,
    children: (b.floors ?? []).map((f) => ({
      id: `floor-${f.id}`,
      name: f.floor,
      type: "floor" as const,
      branchSummary: f.counts
        ? { rooms: f.counts.rooms ?? 0, beds: f.counts.beds ?? 0 }
        : undefined,
      children: (f.rooms ?? []).map((r) => ({
        id: `room-${r.id}`,
        name: r.roomNumber,
        type: "room" as const,
        roomNumber: r.roomNumber,
        roomType: r.roomType ?? undefined,
        roomConfigStatus: r.roomConfigStatus,
        branchSummary: r.counts
          ? { rooms: 0, beds: r.counts.beds ?? 0 }
          : undefined,
        children: mapBeds(r.id, r.beds),
      })),
    })),
  }));
}

/** Count floors across all buildings in the API tree */
export function countFloorsInPayload(tree: CompleteHierarchyBuilding[]): number {
  return tree.reduce((sum, b) => sum + (b.floors?.length ?? 0), 0);
}

/** Walk rooms for configured / incomplete counts */
export function countRoomConfigFromPayload(tree: CompleteHierarchyBuilding[]): {
  configured: number;
  incomplete: number;
} {
  let configured = 0;
  let incomplete = 0;
  for (const b of tree) {
    for (const f of b.floors ?? []) {
      for (const r of f.rooms ?? []) {
        if (isConfiguredStatus(r.roomConfigStatus)) configured += 1;
        else incomplete += 1;
      }
    }
  }
  return { configured, incomplete };
}

export function completionPercentFromRoomCounts(
  configured: number,
  incomplete: number
): number {
  const total = configured + incomplete;
  if (total <= 0) return 0;
  return Math.round((configured / total) * 100);
}


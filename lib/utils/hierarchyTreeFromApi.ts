/**
 * Map GET /branch/getBranchHierarchyTree branch payload → Structure Builder tree nodes.
 * API: building[] → floor (object | array) → room[] → bed[].
 * UI: building → floor → room → bed.
 */

import type { HierarchyBranch, HierarchyBuilding, HierarchyFloor, HierarchyRoom } from "@/lib/utils/branchHierarchyStats";
import { normalizeHierarchyFloors } from "@/lib/utils/branchHierarchyStats";

/** Matches StructureBuilder `TreeNode` shape; cast at call site. */
export type StructureTreeNode = {
  id: string;
  name: string;
  type: "building" | "block" | "floor" | "department" | "room" | "bed";
  children?: StructureTreeNode[];
  rooms?: number;
  roomType?: string;
  roomNumber?: string;
  bedNumber?: string;
  /** From API `roomConfigStatus`; drives configured vs incomplete (same as Configuration Summary). */
  roomConfigStatus?: string | null;
  /** Master floor id from hierarchy `floorId` when present */
  masterFloorId?: number;
  /** Branch-building floor mapping id (`HierarchyFloor.id`) for API mutations — tree `id` is unique per building+floor */
  floorMappingId?: number;
};

function mapBeds(room: HierarchyRoom): StructureTreeNode[] {
  const beds = room.bed;
  if (!Array.isArray(beds)) return [];
  return beds
    .filter((b) => b != null)
    .map((b, idx) => {
      const id = b.id != null ? `bed-${b.id}` : `bed-${room.id ?? "r"}-${idx}`;
      const label =
        b.bedNumber != null && String(b.bedNumber).trim() !== "" ? String(b.bedNumber) : String(idx + 1);
      return {
        id,
        name: `Bed ${label}`,
        type: "bed" as const,
        bedNumber: label,
      };
    });
}

function mapRooms(rooms: HierarchyRoom[] | HierarchyRoom | null | undefined): StructureTreeNode[] {
  if (rooms == null) return [];
  const list = Array.isArray(rooms) ? rooms : [rooms];
  return list
    .filter((r) => r != null)
    .map((r) => {
      const rid = r.id != null ? r.id : Math.random();
      const num =
        r.roomNumber != null && String(r.roomNumber).trim() !== "" ? String(r.roomNumber) : `Room-${rid}`;
      const rt = r.roomType != null && String(r.roomType).trim() !== "" ? String(r.roomType) : undefined;
      const cfg =
        r.roomConfigStatus != null && String(r.roomConfigStatus).trim() !== ""
          ? String(r.roomConfigStatus).trim()
          : null;
      const bedChildren = mapBeds(r);
      return {
        id: `room-${rid}`,
        name: num,
        type: "room" as const,
        roomNumber: num,
        roomType: rt,
        roomConfigStatus: cfg,
        children: bedChildren.length ? bedChildren : undefined,
      };
    });
}

function floorToNode(
  floor: HierarchyFloor,
  buildingKey: string | number,
  floorIndex: number,
): StructureTreeNode {
  const buildingSegment = String(buildingKey);
  const mappingNum =
    floor.id != null && Number.isFinite(Number(floor.id)) ? Number(floor.id) : null;
  const floorName =
    (floor.floor != null && String(floor.floor).trim() !== "" && String(floor.floor)) ||
    (floor.description != null && String(floor.description).trim() !== "" && String(floor.description)) ||
    (mappingNum != null ? `Floor ${mappingNum}` : `Floor ${floorIndex + 1}`);
  /** Floor mapping ids are often unique only per building; always scope tree id by building. */
  const treeIdSuffix =
    mappingNum != null ? `b${buildingSegment}-m${mappingNum}` : `b${buildingSegment}-i${floorIndex}`;
  const roomNodes = mapRooms(floor.room);
  const masterFid = floor.floorId;
  const masterFloorId =
    masterFid != null && Number.isFinite(Number(masterFid)) ? Number(masterFid) : undefined;
  return {
    id: `floor-${treeIdSuffix}`,
    name: floorName,
    type: "floor",
    masterFloorId,
    floorMappingId: mappingNum ?? undefined,
    children: roomNodes.length ? roomNodes : undefined,
  };
}

export function collectExpandableNodeIds(nodes: StructureTreeNode[]): string[] {
  const ids: string[] = [];
  const walk = (list: StructureTreeNode[]) => {
    for (const n of list) {
      if (
        n.type !== "room" &&
        n.type !== "bed" &&
        n.children &&
        n.children.length > 0
      ) {
        ids.push(n.id);
        walk(n.children);
      }
    }
  };
  walk(nodes);
  return ids;
}

export function hierarchyBranchToTreeNodes(
  branch: HierarchyBranch,
  _facilityType: "Hospital" | "Clinic"
): StructureTreeNode[] {
  const buildings = branch.building ?? [];
  return buildings.map((b: HierarchyBuilding) => {
    const bid = b.id != null ? b.id : `b-${b.name ?? Math.random()}`;
    const floorsRaw = normalizeHierarchyFloors(b);
    const floorNodes = floorsRaw.map((f, idx) => floorToNode(f, bid, idx));

    return {
      id: `building-${bid}`,
      name: b.name != null && String(b.name).trim() !== "" ? String(b.name) : `Building ${bid}`,
      type: "building" as const,
      children: floorNodes,
    };
  });
}

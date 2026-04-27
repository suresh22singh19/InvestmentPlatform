"use client";

import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import {
  Button,
  Dialog,
  FormInputField,
  FormSelectField,
  ConfigurationSummaryPanel,
  MessageDialog,
} from "@/components/ui";
import {
  useGetBranchHierarchyTreeQuery,
  useCreateBuildingMutation,
  useUpdateBuildingMutation,
  useDeleteBuildingMutation,
  useUpdateFloorMappingMutation,
  useDeleteFloorMutation,
  useGetAllFloorsQuery,
  useCreateFloorMutation,
  useGetBranchRoomTypesByBranchQuery,
  useCreateRoomsMutation,
  type BranchRoomTypeMappingRow,
} from "@/store/api/branchSetupApi";
import { displayLabelForApiRoomType } from "@/lib/utils/branchRoomTypeOptions";
import { computeBranchHierarchyStats, isConfiguredStatus } from "@/lib/utils/branchHierarchyStats";
import type { FacilityConfigurationSummarySnapshot } from "@/lib/types/facilityConfigurationSummary";
import { useFacilityConfigurationSummaryFromHierarchy } from "@/hooks/useFacilityConfigurationSummaryFromHierarchy";
import {
  hierarchyBranchToTreeNodes,
  collectExpandableNodeIds,
  type StructureTreeNode,
} from "@/lib/utils/hierarchyTreeFromApi";
import { sanitizePatientNameInput, sanitizeRoomNumberPrefixInput } from "@/lib/utils/common";

export type TreeNode = {
  id: string;
  name: string;
  type: "building" | "floor" | "room" | "bed";
  children?: TreeNode[];
  rooms?: number;
  roomType?: string;
  roomNumber?: string;
  bedNumber?: string;
  /** Hierarchy API `roomConfigStatus` — aligned with Configuration Summary room counts */
  roomConfigStatus?: string | null;
  /** Master floor catalog id when returned on hierarchy floor nodes */
  masterFloorId?: number;
  /** Branch-building floor mapping id for API (tree `id` is scoped per building to stay unique in UI). */
  floorMappingId?: number;
};

export type FloorRoomEditContext = { building: string; block: string; floor: string };

/** Building/floor API ids from tree path — required for Bed Management API mode */
export type RoomBedManagementContext = FloorRoomEditContext & {
  buildingId: number;
  floorId: number;
};

type StructureBuilderProps = {
  facilityName: string;
  /** Branch id for GET /branch/getBranchHierarchyTree/:id */
  branchId: number | null;
  canView?: boolean;
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  /** Branch room types from parent (for floor labels without waiting for add-room dialog query). */
  prefetchedBranchRoomTypes?: BranchRoomTypeMappingRow[];
  facilityType?: "Hospital" | "Clinic";
  onBack: () => void;
  /** When user clicks Edit/Configure on a room in the floor list, open Room Configuration for that room */
  onEditRoom?: (room: TreeNode, context: FloorRoomEditContext) => void;
  /** When user clicks Configure on a selected room, open Bed Management for that room */
  onOpenBedManagement?: (room: TreeNode, context: RoomBedManagementContext) => void;
  /** Optional snapshot from facility config page so the side panel matches the dashboard */
  configurationSummary?: FacilityConfigurationSummarySnapshot | null;
};

/** Find path from root to node with given id (e.g. [building, floor, room]) */
function findPathToNode(nodes: TreeNode[], targetId: string, path: TreeNode[] = []): TreeNode[] | null {
  for (const node of nodes) {
    if (node.id === targetId) return [...path, node];
    if (node.children?.length) {
      const found = findPathToNode(node.children, targetId, [...path, node]);
      if (found) return found;
    }
  }
  return null;
}

/** Building / floor names for Room Configuration (`block` kept for callers; always empty). */
function getFloorEditContext(tree: TreeNode[], floorNode: TreeNode): FloorRoomEditContext | null {
  const path = findPathToNode(tree, floorNode.id);
  if (!path || path.length < 2) return null;
  const fi = path.findIndex((n) => n.id === floorNode.id);
  if (fi < 1) return null;
  const building = path[0].name;
  return { building, block: "", floor: floorNode.name };
}

function parseTreeNodeNumericId(nodeId: string, prefix: string): number | null {
  const p = `${prefix}-`;
  if (!nodeId.startsWith(p)) return null;
  const n = parseInt(nodeId.slice(p.length), 10);
  return Number.isFinite(n) ? n : null;
}

function parseFloorMappingId(node: TreeNode): number | null {
  if (node.type !== "floor") return null;
  if (node.floorMappingId != null && Number.isFinite(node.floorMappingId)) return node.floorMappingId;
  return parseTreeNodeNumericId(node.id, "floor");
}

function getRoomBedManagementContext(tree: TreeNode[], roomNode: TreeNode): RoomBedManagementContext | null {
  const path = findPathToNode(tree, roomNode.id);
  if (!path || path.length < 3) return null;
  const buildingNode = path[0];
  const floorNode = path[1];
  const roomInPath = path[2];
  if (buildingNode.type !== "building" || floorNode.type !== "floor" || roomInPath?.id !== roomNode.id) {
    return null;
  }
  const buildingId = parseTreeNodeNumericId(buildingNode.id, "building");
  const floorId = parseFloorMappingId(floorNode);
  if (buildingId == null || floorId == null) return null;
  return {
    building: buildingNode.name,
    block: "",
    floor: floorNode.name,
    buildingId,
    floorId,
  };
}

/** Floor names for Room Configuration when the user selected a room node in the tree. */
function getFloorEditContextForRoomNode(tree: TreeNode[], roomNode: TreeNode): FloorRoomEditContext | null {
  const path = findPathToNode(tree, roomNode.id);
  if (!path || path.length < 3) return null;
  const floorNode = path[path.length - 2];
  if (floorNode.type !== "floor") return null;
  return getFloorEditContext(tree, floorNode);
}

export const StructureBuilder = ({
  facilityName,
  branchId,
  canView = true,
  canAdd = true,
  canEdit = true,
  canDelete = true,
  prefetchedBranchRoomTypes = [],
  facilityType = "Hospital",
  onBack,
  onEditRoom,
  onOpenBedManagement,
  configurationSummary = null,
}: StructureBuilderProps) => {
  const { data: hierarchyRes, isFetching: hierarchyLoading, isError: hierarchyError } =
    useGetBranchHierarchyTreeQuery(branchId ?? 0, { skip: branchId == null });

  const configurationSummaryForPanel = useFacilityConfigurationSummaryFromHierarchy(
    hierarchyRes?.success && Array.isArray(hierarchyRes.data) ? hierarchyRes.data : undefined,
    configurationSummary,
  );

  const [createBuilding, { isLoading: isCreatingBuilding }] = useCreateBuildingMutation();
  const [updateBuildingMut, { isLoading: isUpdatingBuilding }] = useUpdateBuildingMutation();
  const [deleteBuildingMut, { isLoading: isDeletingBuilding }] = useDeleteBuildingMutation();
  const [updateFloorMappingMut, { isLoading: isUpdatingFloorMapping }] = useUpdateFloorMappingMutation();
  const [deleteFloorMut, { isLoading: isDeletingFloor }] = useDeleteFloorMutation();
  const [createFloor, { isLoading: isCreatingFloor }] = useCreateFloorMutation();
  const [createRooms, { isLoading: isCreatingRooms }] = useCreateRoomsMutation();

  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addDialogType, setAddDialogType] = useState<"building" | "floor" | null>(null);
  const [addDialogParent, setAddDialogParent] = useState<TreeNode | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [selectedMasterFloorId, setSelectedMasterFloorId] = useState<string>("");
  const [addDialogError, setAddDialogError] = useState("");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
  const [apiErrorMessage, setApiErrorMessage] = useState("");
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  const [editStructure, setEditStructure] = useState<{ node: TreeNode; kind: "building" | "floor" } | null>(null);
  const [editStructureName, setEditStructureName] = useState("");
  /** Master floor catalog id when editing a floor node */
  const [editFloorMasterId, setEditFloorMasterId] = useState<string>("");
  const [deleteStructure, setDeleteStructure] = useState<{ node: TreeNode; kind: "building" | "floor" } | null>(
    null,
  );

  const structureMutationsBusy =
    isUpdatingBuilding || isDeletingBuilding || isUpdatingFloorMapping || isDeletingFloor;

  const loadFloorsList =
    branchId != null &&
    ((showAddDialog && addDialogType === "floor" && addDialogParent?.type === "building") ||
      editStructure?.kind === "floor");
  const { data: allFloorsRes, isFetching: floorsListLoading } = useGetAllFloorsQuery(undefined, {
    skip: !loadFloorsList,
  });
  
  // Add Rooms Dialog State
  const [showAddRoomsDialog, setShowAddRoomsDialog] = useState(false);
  const [addRoomsParent, setAddRoomsParent] = useState<TreeNode | null>(null);
  const [numberOfRooms, setNumberOfRooms] = useState("");
  const [roomPrefix, setRoomPrefix] = useState("");
  const [startingNumber, setStartingNumber] = useState("1");
  const [selectedRoomType, setSelectedRoomType] = useState<string | null>(null);

  const { data: branchRoomTypesRes, isFetching: branchRoomTypesLoading } = useGetBranchRoomTypesByBranchQuery(
    branchId!,
    { skip: branchId == null || !showAddRoomsDialog }
  );

  const [treeData, setTreeData] = useState<TreeNode[]>([]);

  useEffect(() => {
    if (branchId == null) {
      setTreeData([]);
      setExpandedNodes(new Set());
      setSelectedNode(null);
      return;
    }
    if (!hierarchyRes?.success || !Array.isArray(hierarchyRes.data) || hierarchyRes.data.length === 0) {
      if (!hierarchyLoading) {
        setTreeData([]);
        setExpandedNodes(new Set());
      }
      return;
    }
    const branch = hierarchyRes.data[0];
    const nodes = hierarchyBranchToTreeNodes(branch, facilityType) as TreeNode[];
    setTreeData(nodes);
    setExpandedNodes(new Set(collectExpandableNodeIds(nodes as StructureTreeNode[])));
    setSelectedNode(null);
  }, [branchId, hierarchyRes, hierarchyLoading, facilityType]);

  const summaryStats = useMemo(() => {
    if (!hierarchyRes?.success || !hierarchyRes.data?.[0]) {
      return {
        completion: null as number | null,
        buildings: 0,
        floors: 0,
        totalRooms: 0,
        configuredRooms: 0,
        incompleteRooms: 0,
        configuredKnown: false,
      };
    }
    const s = computeBranchHierarchyStats(hierarchyRes.data);
    return {
      completion: s.completionPercent,
      buildings: s.buildings ?? 0,
      floors: s.floors ?? 0,
      totalRooms: s.rooms ?? 0,
      configuredRooms: s.configuredRooms ?? 0,
      incompleteRooms: s.incompleteRooms ?? 0,
      configuredKnown: s.configuredKnown,
    };
  }, [hierarchyRes]);

  const masterFloorOptions = useMemo(() => {
    const rows = allFloorsRes?.success && Array.isArray(allFloorsRes.data) ? allFloorsRes.data : [];
    return rows.map((r) => ({
      value: String(r.id),
      label: r.floor != null && String(r.floor).trim() !== "" ? String(r.floor) : String(r.id),
    }));
  }, [allFloorsRes]);

  const branchRoomTypeRows =
    branchRoomTypesRes?.success && Array.isArray(branchRoomTypesRes.data) ? branchRoomTypesRes.data : [];

  const branchRoomTypeRowsForLabels =
    prefetchedBranchRoomTypes.length > 0 ? prefetchedBranchRoomTypes : branchRoomTypeRows;

  const branchRoomTypeOptions = useMemo(
    () =>
      branchRoomTypeRows.map((r) => ({
        value: String(r.roomtypeId),
        label:
          r.roomType?.roomType != null && String(r.roomType.roomType).trim() !== ""
            ? String(r.roomType.roomType)
            : `Room type #${r.roomtypeId}`,
      })),
    [branchRoomTypeRows]
  );

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const handleNodeClick = (node: TreeNode) => {
    setSelectedNode(node);
  };

  const handleAddClick = (type: "building" | "floor") => {
    if (!canAdd) return;
    setAddDialogType(type);
    setAddDialogParent(null);
    setNewItemName("");
    setSelectedMasterFloorId("");
    setAddDialogError("");
    setShowAddDialog(true);
  };

  const closeAddDialog = () => {
    setShowAddDialog(false);
    setNewItemName("");
    setSelectedMasterFloorId("");
    setAddDialogType(null);
    setAddDialogParent(null);
    setAddDialogError("");
  };

  const openApiError = (msg: string) => {
    setApiErrorMessage(msg);
    setShowApiErrorDialog(true);
  };

  const openEditStructure = (node: TreeNode, kind: "building" | "floor") => {
    if (!canEdit) return;
    setEditStructure({ node, kind });
    setEditStructureName(node.name);
    if (kind === "floor") {
      setEditFloorMasterId(node.masterFloorId != null ? String(node.masterFloorId) : "");
    } else {
      setEditFloorMasterId("");
    }
  };

  const closeEditStructure = () => {
    setEditStructure(null);
    setEditStructureName("");
    setEditFloorMasterId("");
  };

  const submitEditStructure = async () => {
    if (!canEdit) return;
    if (!editStructure || branchId == null) return;
    const name =
      editStructure.kind === "building"
        ? sanitizePatientNameInput(editStructureName).trim()
        : editStructureName.trim();
    if (!name) return;
    if (editStructure.kind === "building") {
      const id = parseTreeNodeNumericId(editStructure.node.id, "building");
      if (id == null) {
        openApiError("Could not determine building id.");
        return;
      }
      try {
        const res = await updateBuildingMut({ branchId, buildingId: id, name }).unwrap();
        if (!res.success) {
          openApiError(res.message ?? "Could not update building.");
          return;
        }
        closeEditStructure();
        setSuccessMessage(res.message ?? "Building updated successfully.");
        setShowSuccessDialog(true);
      } catch (e: unknown) {
        const msg =
          e && typeof e === "object" && "data" in e
            ? String((e as { data?: { message?: string } }).data?.message ?? "Request failed.")
            : "Request failed.";
        openApiError(msg);
      }
      return;
    }
    const path = findPathToNode(treeData, editStructure.node.id);
    if (!path || path.length < 2) {
      openApiError("Could not locate this floor in the hierarchy.");
      return;
    }
    const buildingNode = path[0];
    const buildingId = parseTreeNodeNumericId(buildingNode.id, "building");
    const floorMappingId = parseFloorMappingId(editStructure.node);
    const newMasterFloorId = parseInt(editFloorMasterId, 10);
    if (buildingId == null || floorMappingId == null) {
      openApiError("Could not determine building or floor id.");
      return;
    }
    if (!Number.isFinite(newMasterFloorId)) {
      openApiError("Select a floor from the master list.");
      return;
    }
    try {
      const res = await updateFloorMappingMut({
        branchId,
        buildingId,
        floorMappingId,
        newMasterFloorId,
      }).unwrap();
      if (!res.success) {
        openApiError(res.message ?? "Could not update floor mapping.");
        return;
      }
      closeEditStructure();
      setSuccessMessage(res.message ?? "Floor mapping updated successfully.");
      setShowSuccessDialog(true);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "data" in e
          ? String((e as { data?: { message?: string } }).data?.message ?? "Request failed.")
          : "Request failed.";
      openApiError(msg);
    }
  };

  const confirmDeleteStructure = async () => {
    if (!canDelete) return;
    if (!deleteStructure || branchId == null) return;
    const { node, kind } = deleteStructure;
    try {
      if (kind === "building") {
        const id = parseTreeNodeNumericId(node.id, "building");
        if (id == null) {
          openApiError("Could not determine building id.");
          return;
        }
        const res = await deleteBuildingMut({ branchId, buildingId: id }).unwrap();
        if (!res.success) {
          openApiError(res.message ?? "Could not delete building.");
          return;
        }
      } else {
        const path = findPathToNode(treeData, node.id);
        if (!path || path.length < 2) {
          openApiError("Could not locate this floor in the hierarchy.");
          return;
        }
        const buildingNode = path[0];
        const floorMappingId = parseFloorMappingId(node);
        const buildingId = parseTreeNodeNumericId(buildingNode.id, "building");
        if (floorMappingId == null || buildingId == null) {
          openApiError("Could not determine building or floor id.");
          return;
        }
        const res = await deleteFloorMut({ branchId, buildingId, floorMappingId }).unwrap();
        if (!res.success) {
          openApiError(res.message ?? "Could not remove floor.");
          return;
        }
      }
      if (selectedNode?.id === node.id) setSelectedNode(null);
      setExpandedNodes((prev) => {
        const next = new Set(prev);
        next.delete(node.id);
        return next;
      });
      setDeleteStructure(null);
      setSuccessMessage(kind === "building" ? "Building deleted." : "Floor removed from building.");
      setShowSuccessDialog(true);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "data" in e
          ? String((e as { data?: { message?: string } }).data?.message ?? "Request failed.")
          : "Request failed.";
      openApiError(msg);
    }
  };

  const handleAddItem = async () => {
    if (!canAdd) return;
    if (!addDialogType) return;

    const name =
      addDialogType === "building"
        ? sanitizePatientNameInput(newItemName).trim()
        : newItemName.trim();

    if (addDialogType === "building" && !addDialogParent && branchId != null) {
      if (!name) return;
      try {
        const res = await createBuilding({ branchId, name }).unwrap();
        if (res.success) {
          closeAddDialog();
          setSuccessMessage(res.message ?? "Building created successfully.");
          setShowSuccessDialog(true);
          return;
        }
        openApiError(res.message ?? "Could not create building.");
      } catch (e: unknown) {
        const msg =
          e && typeof e === "object" && "data" in e
            ? String((e as { data?: { message?: string } }).data?.message ?? "Request failed.")
            : "Request failed.";
        openApiError(msg);
      }
      return;
    }

    if (
      addDialogType === "floor" &&
      addDialogParent?.type === "building" &&
      branchId != null
    ) {
      if (!selectedMasterFloorId) {
        setAddDialogError("Please select a floor.");
        return;
      }
      const buildingId = parseTreeNodeNumericId(addDialogParent.id, "building");
      if (buildingId == null) {
        openApiError("Could not determine building id. Try refreshing the page.");
        return;
      }
      const floorId = parseInt(selectedMasterFloorId, 10);
      if (!Number.isFinite(floorId)) {
        setAddDialogError("Invalid floor selection.");
        return;
      }
      setAddDialogError("");
      try {
        const res = await createFloor({ branchId, buildingId, floorId }).unwrap();
        if (res.success) {
          closeAddDialog();
          setSuccessMessage(res.message ?? "Floor added successfully.");
          setShowSuccessDialog(true);
          return;
        }
        openApiError(res.message ?? "Could not add floor.");
      } catch (e: unknown) {
        const msg =
          e && typeof e === "object" && "data" in e
            ? String((e as { data?: { message?: string } }).data?.message ?? "Request failed.")
            : "Request failed.";
        openApiError(msg);
      }
      return;
    }

    if (addDialogType === "floor" && addDialogParent?.type === "building" && branchId == null) {
      if (!name) return;
      const newItem: TreeNode = {
        id: `floor-${Date.now()}`,
        name,
        type: "floor",
        children: [],
      };
      setTreeData((prev) => {
        const updateNode = (nodes: TreeNode[]): TreeNode[] => {
          return nodes.map((node) => {
            if (node.id === addDialogParent.id) {
              return {
                ...node,
                children: [...(node.children || []), newItem],
              };
            }
            if (node.children) {
              return { ...node, children: updateNode(node.children) };
            }
            return node;
          });
        };
        return updateNode(prev);
      });
      closeAddDialog();
      return;
    }

    if (!name) return;

    const newItem: TreeNode = {
      id: `${addDialogType}-${Date.now()}`,
      name,
      type: addDialogType,
      children: addDialogType === "floor" ? [] : undefined,
      rooms: undefined,
    };

    if (addDialogParent) {
    setTreeData((prev) => {
      const updateNode = (nodes: TreeNode[]): TreeNode[] => {
        return nodes.map((node) => {
            if (node.id === addDialogParent.id) {
            return {
              ...node,
                children: [...(node.children || []), newItem],
            };
          }
          if (node.children) {
            return { ...node, children: updateNode(node.children) };
          }
          return node;
        });
      };
      return updateNode(prev);
    });
    } else {
      setTreeData((prev) => [...prev, newItem]);
    }

    closeAddDialog();
  };

  const resetAddRoomsDialog = () => {
    setShowAddRoomsDialog(false);
    setNumberOfRooms("");
    setRoomPrefix("");
    setStartingNumber("1");
    setSelectedRoomType(null);
    setAddRoomsParent(null);
  };

  const handleAddRooms = async () => {
    if (!canAdd) return;
    if (!addRoomsParent || !numberOfRooms || !startingNumber || !selectedRoomType) return;
    if (branchId == null) {
      openApiError("Branch is required to add rooms.");
      return;
    }

    const path = findPathToNode(treeData, addRoomsParent.id);
    if (!path || path.length < 2) {
      openApiError("Could not find building for this floor.");
      return;
    }
    const buildingNode = path[0];
    const buildingId = parseTreeNodeNumericId(buildingNode.id, "building");
    const floorId = parseFloorMappingId(addRoomsParent);
    if (buildingId == null || floorId == null) {
      openApiError("Invalid building or floor id. Try refreshing the page.");
      return;
    }

    const numRooms = parseInt(numberOfRooms, 10);
    const startNum = parseInt(startingNumber, 10);
    if (numRooms < 1 || numRooms > 50 || !Number.isFinite(startNum)) return;

    const mappingRow = branchRoomTypeRows.find((r) => String(r.roomtypeId) === selectedRoomType);
    if (!mappingRow) {
      openApiError("Invalid room type selection. Refresh and try again.");
      return;
    }
    const rawCode = mappingRow.roomType?.roomTypeCode?.trim();
    const roomTypeForApi =
      rawCode && rawCode.length > 0
        ? rawCode.toLowerCase()
        : mappingRow.roomType?.roomType?.trim().toLowerCase().replace(/\s+/g, "-") || "general";

    const prefixSanitized = sanitizeRoomNumberPrefixInput(roomPrefix).trim();

    const roomsPayload = [];
    for (let i = 0; i < numRooms; i++) {
      const roomNum = prefixSanitized
        ? `${prefixSanitized}-${String(startNum + i).padStart(3, "0")}`
        : String(startNum + i).padStart(3, "0");
      roomsPayload.push({
        branchId,
        buildingId,
        floorId,
        roomType: roomTypeForApi,
        bedCapacity: 4,
        roomNumber: roomNum,
        roomToilet: "western",
        roomImages: "",
        sort: i + 1,
        status: "active",
      });
    }

    try {
      const res = await createRooms({ rooms: roomsPayload }).unwrap();
      resetAddRoomsDialog();
      setSuccessMessage(res.message ?? "Room created successfully.");
      setShowSuccessDialog(true);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "data" in e
          ? String((e as { data?: { message?: string } }).data?.message ?? "Request failed.")
          : "Request failed.";
      openApiError(msg);
    }
  };

  const countRoomsUnder = (n: TreeNode): number => {
    if (n.type === "room") return 1;
    if (!n.children) return 0;
    return n.children.reduce((sum, c) => sum + countRoomsUnder(c), 0);
  };

  /** Direct floor children of a building (for tree label, like room count on floors). */
  const countDirectFloors = (n: TreeNode): number => {
    if (n.type !== "building" || !n.children) return 0;
    return n.children.filter((c) => c.type === "floor").length;
  };

  const getRoomsUnderNode = (n: TreeNode): TreeNode[] => {
    if (n.type === "room") return [n];
    if (!n.children) return [];
    return n.children.flatMap(getRoomsUnderNode);
  };

  const renderTreeNode = (node: TreeNode, level: number = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const canExpand = hasChildren && (node.type !== "room" && node.type !== "bed");

    return (
      <div key={node.id} className="select-none">
        <div
          className={`flex items-center gap-2 py-1 px-2 rounded hover:bg-gray-50 cursor-pointer ${
            selectedNode?.id === node.id ? "bg-blue-50" : ""
          }`}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          onClick={() => handleNodeClick(node)}
        >
          {canExpand && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
              className="flex-shrink-0 w-5 h-5 flex items-center justify-center"
            >
              <svg
                className={`h-4 w-4 text-gray-500 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          {!canExpand && <div className="w-5 h-5" />}
          {getIcon(node.type)}
          <span className="text-sm font-medium text-gray-900 flex-1 min-w-0 truncate">{node.name}</span>
          {node.type === "building" && (
            <span className="text-xs text-gray-500 flex-shrink-0 whitespace-nowrap">
              {(() => {
                const fc = countDirectFloors(node);
                return `${fc} ${fc === 1 ? "floor" : "floors"}`;
              })()}
            </span>
          )}
          {node.type === "floor" && (
            <span className="text-xs text-gray-500 flex-shrink-0 whitespace-nowrap">
              {countRoomsUnder(node)} rooms
            </span>
          )}
          {branchId != null && (node.type === "building" || node.type === "floor") && (canEdit || canDelete) && (
            <div
              className="flex items-center gap-0.5 flex-shrink-0 ml-1"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              role="presentation"
            >
              {canEdit ? (
                <button
                  type="button"
                  className="p-1.5 rounded-md hover:bg-green-50 text-green-700 disabled:opacity-40"
                  aria-label={`Edit ${node.type}`}
                  disabled={structureMutationsBusy}
                  onClick={() => openEditStructure(node, node.type === "building" ? "building" : "floor")}
                >
                  <Image src="/icons/EditIconBlack.svg" alt="" width={18} height={18} className="pointer-events-none" />
                </button>
              ) : null}
              {canDelete ? (
                <button
                  type="button"
                  className="p-1.5 rounded-md hover:bg-red-50 text-red-600 disabled:opacity-40"
                  aria-label={`Delete ${node.type}`}
                  disabled={structureMutationsBusy}
                  onClick={() => setDeleteStructure({ node, kind: node.type === "building" ? "building" : "floor" })}
                >
                  <Image
                    src="/icons/TrashRedIcon.svg"
                    alt=""
                    width={20}
                    height={20}
                    className="pointer-events-none shrink-0"
                  />
                </button>
              ) : null}
            </div>
          )}
        </div>
        {isExpanded && hasChildren && (
          <div className="ml-4">
            {node.children!.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const getIcon = (type: string) => {
    const iconClass = "h-5 w-5 text-green-700";
    switch (type) {
      case "building":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      case "floor":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        );
      case "room":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        );
      case "bed":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getAvailableActions = () => {
    if (!selectedNode) return null;

    switch (selectedNode.type) {
      case "building":
        return (
          <>
            {canAdd ? (
              <Button
                variant="primary"
                size="small"
                onClick={() => {
                  setAddDialogType("floor");
                  setAddDialogParent(selectedNode);
                  setNewItemName("");
                  setSelectedMasterFloorId("");
                  setAddDialogError("");
                  setShowAddDialog(true);
                }}
                leftIcon={
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                }
              >
                Add Floor
              </Button>
            ) : null}
          </>
        );
      case "floor":
        return (
          canAdd ? (
            <Button
              variant="primary"
              size="small"
              onClick={() => {
                setAddRoomsParent(selectedNode);
                setNumberOfRooms("");
                setRoomPrefix("");
                setStartingNumber("1");
                setSelectedRoomType(null);
                setShowAddRoomsDialog(true);
              }}
              leftIcon={
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              Add Rooms
            </Button>
          ) : null
        );
      case "room": {
        const roomConfigured = isConfiguredStatus(selectedNode.roomConfigStatus);
        const roomConfigCtx = getFloorEditContextForRoomNode(treeData, selectedNode);
        return (
          <Button
            variant={roomConfigured ? "outline" : "primary"}
            size="small"
            disabled={roomConfigured ? !canEdit : !canAdd}
            onClick={() => {
              if (roomConfigured && !canEdit) return;
              if (!roomConfigured && !canAdd) return;
              if (onEditRoom && roomConfigCtx) {
                onEditRoom(selectedNode, roomConfigCtx);
                return;
              }
              if (onOpenBedManagement) {
                const ctx = getRoomBedManagementContext(treeData, selectedNode);
                if (ctx) {
                  onOpenBedManagement(selectedNode, ctx);
                } else {
                  setApiErrorMessage(
                    "Could not resolve building or floor for this room. Refresh the page or re-open Structure Builder.",
                  );
                  setShowApiErrorDialog(true);
                }
                return;
              }
              setTreeData((prev) => {
                // Find the current node in the tree to get the latest bed count
                const findNode = (nodes: TreeNode[]): TreeNode | null => {
                  for (const node of nodes) {
                    if (node.id === selectedNode.id) {
                      return node;
                    }
                    if (node.children) {
                      const found = findNode(node.children);
                      if (found) return found;
                    }
                  }
                  return null;
                };

                const currentNode = findNode(prev);
                const existingBeds = currentNode?.children?.filter((child) => child.type === "bed") || [];
                const nextBedNumber = existingBeds.length + 1;
                
                const newBed: TreeNode = {
                  id: `bed-${Date.now()}-${Math.random()}`,
                  name: `Bed ${nextBedNumber}`,
                  type: "bed",
                  bedNumber: String(nextBedNumber),
                };

                const updateNode = (nodes: TreeNode[]): TreeNode[] => {
                  return nodes.map((node) => {
                    if (node.id === selectedNode.id) {
                      return {
                        ...node,
                        children: [...(node.children || []), newBed],
                      };
                    }
                    if (node.children) {
                      return { ...node, children: updateNode(node.children) };
                    }
                    return node;
                  });
                };
                return updateNode(prev);
              });
            }}
            leftIcon={
              roomConfigured ? (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              )
            }
          >
            {roomConfigured ? "Edit" : "Configure"}
          </Button>
        );
      }
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "building":
        return "Building";
      case "floor":
        return "Floor";
      case "room":
        return "Room";
      case "bed":
        return "Bed";
      default:
        return "";
    }
  };

  const getTypeIcon = (type: string) => {
    const iconClass = "h-6 w-6 text-green-700";
    switch (type) {
      case "building":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      case "floor":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        );
      case "room":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        );
      case "bed":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
        );
      default:
        return null;
    }
  };


  // Generate room number preview
  const roomNumberPreview = useMemo(() => {
    if (!numberOfRooms || !startingNumber) return [];
    const numRooms = parseInt(numberOfRooms);
    const startNum = parseInt(startingNumber);
    if (isNaN(numRooms) || isNaN(startNum) || numRooms < 1 || numRooms > 50) return [];

    const prefixPreview = sanitizeRoomNumberPrefixInput(roomPrefix).trim();

    const preview: string[] = [];
    for (let i = 0; i < Math.min(numRooms, 10); i++) {
      const roomNum = prefixPreview
        ? `${prefixPreview}-${String(startNum + i).padStart(3, "0")}`
        : String(startNum + i).padStart(3, "0");
      preview.push(roomNum);
    }
    if (numRooms > 10) {
      preview.push(`... and ${numRooms - 10} more`);
    }
    return preview;
  }, [numberOfRooms, startingNumber, roomPrefix]);

  // Calculate statistics from treeData
  const stats = useMemo(() => {
    const countNodes = (nodes: TreeNode[], type: TreeNode["type"]): number => {
      let count = 0;
      for (const node of nodes) {
        if (node.type === type) count++;
        if (node.children) {
          count += countNodes(node.children, type);
        }
      }
      return count;
    };

    return {
      buildings: countNodes(treeData, "building"),
      floors: countNodes(treeData, "floor"),
      totalRooms: countNodes(treeData, "room"),
    };
  }, [treeData]);

  const pickFloorFromMaster =
    addDialogType === "floor" && addDialogParent?.type === "building" && branchId != null;
  const pickFloorLocalName =
    addDialogType === "floor" && addDialogParent?.type === "building" && branchId == null;

  const addDialogSubmitDisabled = (() => {
    if (!addDialogType) return true;
    if (pickFloorFromMaster) {
      return !selectedMasterFloorId || isCreatingFloor || floorsListLoading;
    }
    if (addDialogType === "building" && !addDialogParent && branchId != null) {
      return !newItemName.trim() || isCreatingBuilding;
    }
    return !newItemName.trim();
  })();

  const addDialogPrimaryLabel =
    pickFloorFromMaster && isCreatingFloor
      ? "Saving…"
      : addDialogType === "building" && !addDialogParent && branchId != null && isCreatingBuilding
        ? "Saving…"
        : `Add ${addDialogType || ""}`;

  return (
    <div className="flex gap-6 h-full">
      {/* Main Content */}
      <div className={`flex flex-col transition-all duration-300 ${isPanelOpen ? 'w-[80%]' : 'w-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg hover:bg-green-100 transition-colors"
            >
              <svg className="h-5 w-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Structure Builder</h1>
              <p className="text-sm text-gray-500">{facilityName}</p>
            </div>
          </div>
          {/* Toggle Panel Button - Always visible when panel is closed */}
          {!isPanelOpen && (
            <button
              onClick={() => setIsPanelOpen(true)}
              className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-full bg-green-600 shadow-lg transition-all hover:bg-green-700"
              aria-label="Open Configuration Summary"
            >
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex gap-6 flex-1">
        {/* Main Content */}
        <div className="flex gap-6 flex-1 w-full">
          {/* Left Panel: Hierarchy Tree */}
          <div className="flex-1 bg-white rounded-[12px] border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Hierarchy Tree</h2>
              <Button
                variant="primary"
                size="small"
                onClick={() => handleAddClick("building")}
                leftIcon={
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                }
              disabled={!canAdd}
              >
                Add Building
              </Button>
            </div>

            <div className="space-y-1">
              {treeData.map((node) => renderTreeNode(node))}
            </div>

            {/* Legend - same icons and green as Structure Overview panel */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>Building</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  <span>Floor</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span>Room</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Details & Actions */}
          <div className="w-[400px] flex-shrink-0 bg-white rounded-[12px] border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Details & Actions</h2>

            {selectedNode ? (
              <div className="space-y-6">
                {/* Selected Item Info */}
                <div>
                  {selectedNode.type === "room" ? (
                    <>
                      {(() => {
                        const roomConfigComplete = isConfiguredStatus(selectedNode.roomConfigStatus);
                        const statusSettled = summaryStats.configuredKnown;
                        return (
                          <>
                            <div className="flex items-center gap-3 mb-2">
                              <svg
                                className={`h-6 w-6 flex-shrink-0 ${
                                  !statusSettled
                                    ? "text-gray-400"
                                    : roomConfigComplete
                                      ? "text-green-600"
                                      : "text-orange-600"
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                                />
                              </svg>
                              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                {getTypeLabel(selectedNode.type)}
                              </span>
                            </div>
                            <div className="flex min-w-0 w-full items-center gap-2">
                              <h3 className="min-w-0 flex-1 basis-0 truncate text-xl font-semibold text-gray-900">
                                {selectedNode.name}
                              </h3>
                              {roomConfigComplete ? (
                                <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium whitespace-nowrap">
                                  Configured
                                </span>
                              ) : statusSettled ? (
                                <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-medium whitespace-nowrap">
                                  Incomplete
                                </span>
                              ) : (
                                <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium whitespace-nowrap">
                                  —
                                </span>
                              )}
                            </div>
                            {selectedNode.roomType ? (
                              <p className="text-sm text-gray-500 mt-1.5 leading-snug">
                                {branchRoomTypeRowsForLabels.length
                                  ? displayLabelForApiRoomType(
                                      selectedNode.roomType,
                                      branchRoomTypeRowsForLabels,
                                    )
                                  : selectedNode.roomType}
                              </p>
                            ) : null}
                          </>
                        );
                      })()}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 mb-2">
                        {getTypeIcon(selectedNode.type)}
                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {getTypeLabel(selectedNode.type)}
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900">{selectedNode.name}</h3>
                    </>
                  )}
                </div>

                {/* Available Actions */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Available Actions</h4>
                  <div className="flex flex-wrap gap-3">{getAvailableActions()}</div>
                </div>

                {/* Statistics - Enhanced for Floor */}
                {selectedNode.type === "floor" ? (
                  <div className="space-y-6">
                    {/* Statistics Row */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Statistics</h4>
                      <div className="flex gap-6">
                        <div>
                          <span className="text-sm text-gray-600">Rooms</span>
                          <p className="text-lg font-semibold text-gray-900">
                            {countRoomsUnder(selectedNode)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Room Type Breakdown */}
                    {(() => {
                      const rooms = getRoomsUnderNode(selectedNode);
                      const roomTypeCounts = rooms.reduce((acc: Record<string, number>, room) => {
                        const roomType = room.roomType || "Unknown";
                        acc[roomType] = (acc[roomType] || 0) + 1;
                        return acc;
                      }, {});

                      if (Object.keys(roomTypeCounts).length > 0) {
                        return (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">Room Type Breakdown</h4>
                            <div className="space-y-2">
                              {Object.entries(roomTypeCounts).map(([roomTypeKey, count]) => (
                                <div key={roomTypeKey} className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">
                                    {branchRoomTypeRowsForLabels.length
                                      ? displayLabelForApiRoomType(roomTypeKey, branchRoomTypeRowsForLabels)
                                      : roomTypeKey}
                                  </span>
                                  <span className="text-sm font-semibold text-gray-900">{count}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Floor Rooms List - Edit opens Room Configuration (Room Inventory specific room edit) */}
                    {(() => {
                      const rooms = getRoomsUnderNode(selectedNode);
                      const context = getFloorEditContext(treeData, selectedNode);
                      if (rooms.length > 0) {
                        return (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">Floor Rooms</h4>
                            <div className="space-y-2">
                              {rooms.map((room) => {
                                const roomConfigComplete = isConfiguredStatus(room.roomConfigStatus);
                                const statusSettled = summaryStats.configuredKnown;
                                return (
                                  <div
                                    key={room.id}
                                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                                  >
                                    <div className="flex items-center gap-3 flex-1">
                                      <svg
                                        className={`h-5 w-5 flex-shrink-0 ${
                                          !statusSettled
                                            ? "text-gray-400"
                                            : roomConfigComplete
                                              ? "text-green-600"
                                              : "text-orange-600"
                                        }`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                                        />
                                      </svg>
                                      <div className="flex-1 min-w-0">
                                        {/* Fixed order: room name → status badge (same row, no wrap), then room type below */}
                                        <div className="flex min-w-0 w-full items-center gap-2">
                                          <span className="min-w-0 flex-1 basis-0 truncate text-sm font-medium text-gray-900">
                                            {room.name}
                                          </span>
                                          {roomConfigComplete ? (
                                            <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium whitespace-nowrap">
                                              Configured
                                            </span>
                                          ) : statusSettled ? (
                                            <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-medium whitespace-nowrap">
                                              Incomplete
                                            </span>
                                          ) : (
                                            <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium whitespace-nowrap">
                                              —
                                            </span>
                                          )}
                                        </div>
                                        {room.roomType ? (
                                          <p className="text-xs text-gray-500 mt-1.5 leading-snug">
                                            {branchRoomTypeRowsForLabels.length
                                              ? displayLabelForApiRoomType(room.roomType, branchRoomTypeRowsForLabels)
                                              : room.roomType}
                                          </p>
                                        ) : null}
                                      </div>
                                    </div>
                                    <Button
                                      variant={roomConfigComplete ? "outline" : "primary"}
                                      size="small"
                                      disabled={roomConfigComplete ? !canEdit : !canAdd}
                                      onClick={() => {
                                        if (roomConfigComplete && !canEdit) return;
                                        if (!roomConfigComplete && !canAdd) return;
                                        if (onEditRoom && context) onEditRoom(room, context);
                                      }}
                                    >
                                      {roomConfigComplete ? "Edit" : "Configure"}
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                ) : selectedNode.type === "building" ? (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Statistics</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Rooms</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {(() => {
                                const countRooms = (nodes: TreeNode[]): number => {
                                  let count = 0;
                                  nodes.forEach((n) => {
                                    if (n.type === "room") count++;
                                    if (n.children) count += countRooms(n.children);
                                  });
                                  return count;
                                };
                                return selectedNode.children ? countRooms(selectedNode.children) : 0;
                          })()}
                        </span>
                      </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Floors</span>
                          <span className="text-sm font-semibold text-gray-900">
                            {selectedNode.children?.filter((c) => c.type === "floor").length || 0}
                          </span>
                        </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px] text-center">
                <svg className="h-16 w-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className="text-sm text-gray-500">
                  Select an item from the tree to view details and available actions
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Item Dialog */}
      <Dialog
        open={showAddDialog}
        onClose={closeAddDialog}
        title={`Add ${addDialogType ? addDialogType.charAt(0).toUpperCase() + addDialogType.slice(1) : ""}`}
        width={500}
      >
        <div className="space-y-4">
          {pickFloorFromMaster ? (
            <FormSelectField
              label="Floor"
              options={masterFloorOptions}
              value={selectedMasterFloorId}
              onChange={(value) => {
                const v = typeof value === "string" ? value : value[0] ?? "";
                setSelectedMasterFloorId(v);
                if (addDialogError) setAddDialogError("");
              }}
              placeholder={floorsListLoading ? "Loading floors…" : "Select floor"}
              disabled={floorsListLoading || masterFloorOptions.length === 0}
              emptyMessage={floorsListLoading ? "Loading…" : "No floors available"}
            />
          ) : (
          <FormInputField
            label={`${addDialogType ? addDialogType.charAt(0).toUpperCase() + addDialogType.slice(1) : ""} Name`}
            placeholder={`Enter ${addDialogType || ""} name`}
            value={newItemName}
              maxLength={addDialogType === "building" ? 100 : undefined}
              autoComplete="off"
              onChange={(e) => {
                const raw = e.target.value;
                const next = addDialogType === "building" ? sanitizePatientNameInput(raw) : raw;
                setNewItemName(next);
                if (addDialogError) setAddDialogError("");
              }}
              onBlur={
                addDialogType === "building"
                  ? (e) => {
                      const trimmed = e.target.value.trim();
                      if (trimmed !== e.target.value) setNewItemName(trimmed);
                    }
                  : undefined
              }
            />
          )}
          {pickFloorLocalName ? (
            <p className="text-xs text-gray-500">Add a branch from facility settings to pick floors from the master list.</p>
          ) : null}
          {addDialogError ? (
            <p className="text-sm text-red-600" role="alert">
              {addDialogError}
            </p>
          ) : null}
          <div className="flex gap-3 justify-end pt-4">
            <Button
              variant="outline"
              onClick={closeAddDialog}
              disabled={isCreatingBuilding || isCreatingFloor}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleAddItem()}
              disabled={addDialogSubmitDisabled}
            >
              {addDialogPrimaryLabel}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={editStructure != null}
        onClose={closeEditStructure}
        title={editStructure?.kind === "building" ? "Edit building" : "Change floor"}
        width={480}
      >
        <div className="space-y-4">
          {editStructure?.kind === "building" ? (
            <FormInputField
              label="Building name"
              value={editStructureName}
              placeholder="Name"
              maxLength={100}
              onChange={(e) => setEditStructureName(sanitizePatientNameInput(e.target.value))}
              onBlur={(e) => {
                const trimmed = e.target.value.trim();
                if (trimmed !== e.target.value) setEditStructureName(trimmed);
              }}
            />
          ) : (
            <>
              <p className="text-sm text-gray-600">
                Current: <span className="font-medium text-gray-900">{editStructureName}</span>
              </p>
              <FormSelectField
                label="Floor (master list)"
                options={masterFloorOptions}
                value={editFloorMasterId}
                onChange={(value) => {
                  const v = typeof value === "string" ? value : value[0] ?? "";
                  setEditFloorMasterId(v);
                }}
                placeholder={floorsListLoading ? "Loading floors…" : "Select floor"}
                disabled={floorsListLoading || masterFloorOptions.length === 0}
                emptyMessage={floorsListLoading ? "Loading…" : "No floors available"}
              />
            </>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={closeEditStructure} disabled={structureMutationsBusy}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => void submitEditStructure()}
              disabled={
                structureMutationsBusy ||
                (editStructure?.kind === "building" ? !editStructureName.trim() : !editFloorMasterId.trim())
              }
            >
              Save
            </Button>
          </div>
        </div>
      </Dialog>

      <MessageDialog
        open={deleteStructure != null}
        onClose={() => setDeleteStructure(null)}
        icon="/icons/TrashRedIcon.svg"
        iconBgColor="#FFEBEE"
        message={
          deleteStructure?.kind === "building"
            ? `Delete "${deleteStructure.node.name}" and everything under it? This cannot be undone.`
            : `Remove floor "${deleteStructure?.node.name}" from this building? Rooms and beds under it may be removed on the server.`
        }
        showCancel
        cancelText="Cancel"
        confirmText="Delete"
        onCancel={() => setDeleteStructure(null)}
        onConfirm={() => void confirmDeleteStructure()}
      />

      <MessageDialog
        open={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        icon="/icons/SuccessCheck.svg"
        iconBgColor="#E8F5E9"
        message={successMessage}
        confirmText="Success"
        showCancel={false}
        onConfirm={() => setShowSuccessDialog(false)}
      />

      <MessageDialog
        open={showApiErrorDialog}
        onClose={() => setShowApiErrorDialog(false)}
        icon="/icons/CrossIcon.svg"
        iconBgColor="#FFEBEE"
        message={apiErrorMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => setShowApiErrorDialog(false)}
      />

      {/* Add Rooms Dialog */}
      <Dialog
        open={showAddRoomsDialog}
        onClose={resetAddRoomsDialog}
        title="Add Rooms"
        width={600}
      >
        <div className="space-y-5">
          <p className="text-sm text-gray-600">
            Add multiple rooms to {addRoomsParent?.name || "Floor"}
          </p>

          <FormInputField
            label="Number of Rooms*"
            type="number"
            placeholder="1-50"
            value={numberOfRooms}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "" || (parseInt(val) >= 1 && parseInt(val) <= 50)) {
                setNumberOfRooms(val);
              }
            }}
            min={1}
            max={50}
            helperText="Add 1-50 rooms at once (you can configure them individually later)"
          />

          <FormInputField
            label="Room Number Prefix (Optional)"
            placeholder="e.g., G, A, B1"
            value={roomPrefix}
            maxLength={100}
            autoComplete="off"
            onChange={(e) => {
              setRoomPrefix(sanitizeRoomNumberPrefixInput(e.target.value));
            }}
            onBlur={(e) => {
              const trimmed = e.target.value.trim();
              if (trimmed !== e.target.value) setRoomPrefix(trimmed);
            }}
            helperText="Letters and digits only, max 100 characters. Prefix is added before the number (e.g., G-101)"
          />

          <div className="grid grid-cols-2 gap-4">
            <FormInputField
              label="Starting Number*"
              type="number"
              placeholder="1"
              value={startingNumber}
              onChange={(e) => setStartingNumber(e.target.value)}
              min={1}
            />
            <FormSelectField
              label="Room Type*"
              options={branchRoomTypeOptions}
              value={selectedRoomType || ""}
              onChange={(value) => {
                const selectedValue = typeof value === "string" ? value : value[0] || null;
                setSelectedRoomType(selectedValue);
              }}
              placeholder={branchRoomTypesLoading ? "Loading room types…" : "Select room type"}
              disabled={branchRoomTypesLoading}
              emptyMessage={
                branchRoomTypesLoading
                  ? "Loading…"
                  : branchRoomTypeOptions.length === 0
                    ? "No room types for this branch. Add them in Room Type Master first."
                    : "Select a room type"
              }
            />
          </div>

          {/* Preview */}
          {roomNumberPreview.length > 0 && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Preview</h4>
              <div className="flex flex-wrap gap-2 items-center">
                {roomNumberPreview.map((roomNum, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-white border border-gray-200 rounded-md text-gray-700"
                  >
                    <svg className="h-4 w-4 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    {roomNum}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4">
            <Button variant="outline" onClick={resetAddRoomsDialog} disabled={isCreatingRooms}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleAddRooms()}
              disabled={
                !numberOfRooms ||
                !startingNumber ||
                !selectedRoomType ||
                isCreatingRooms ||
                branchRoomTypesLoading ||
                branchRoomTypeOptions.length === 0
              }
            >
              {isCreatingRooms
                ? "Saving…"
                : `Add ${
                    numberOfRooms && parseInt(numberOfRooms, 10) > 0
                      ? `${numberOfRooms} Room${parseInt(numberOfRooms, 10) > 1 ? "s" : ""}`
                      : "Room"
                  }`}
            </Button>
          </div>
        </div>
      </Dialog>
      </div>

      {/* Configuration Summary Panel */}
      <ConfigurationSummaryPanel
        facilityName={facilityName}
        facilityType={facilityType}
        completionPercentage={configurationSummaryForPanel.completionPercentage}
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        buildings={configurationSummaryForPanel.buildings}
        floors={configurationSummaryForPanel.floors}
        totalRooms={configurationSummaryForPanel.totalRooms}
        configuredRooms={configurationSummaryForPanel.configuredRooms}
        incompleteRooms={configurationSummaryForPanel.incompleteRooms}
        lastModified={configurationSummaryForPanel.lastModified}
      />
    </div>
  );
};

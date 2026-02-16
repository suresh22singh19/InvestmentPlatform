"use client";

import React, { useState, useMemo } from "react";
import { Button, Dialog, FormInputField, FormSelectField, ConfigurationSummaryPanel } from "@/components/ui";

type TreeNode = {
  id: string;
  name: string;
  type: "building" | "block" | "floor" | "department" | "room" | "bed";
  children?: TreeNode[];
  rooms?: number;
  roomType?: string;
  roomNumber?: string;
  bedNumber?: string;
};

export type FloorRoomEditContext = { building: string; block: string; floor: string };

type StructureBuilderProps = {
  facilityName: string;
  facilityType?: "Hospital" | "Clinic";
  onBack: () => void;
  /** When user clicks Edit/Configure on a room in the floor list, open Room Configuration for that room */
  onEditRoom?: (room: TreeNode, context: FloorRoomEditContext) => void;
};

/** Find path from root to node with given id (e.g. [building, block, floor]) */
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

export const StructureBuilder = ({ facilityName, facilityType = "Hospital", onBack, onEditRoom }: StructureBuilderProps) => {
  // Get initial expanded nodes based on facility type
  const getInitialExpandedNodes = (): Set<string> => {
    if (facilityType === "Clinic") {
      return new Set([
        "building-1", 
        "floor-1", 
        "floor-2", 
        "dept-1", 
        "dept-2", 
        "dept-3",
        "room-1", // C-001
        "room-2", // C-002
        "room-3", // C-003
        "room-4", // LAB-001
        "room-5", // PH-001
        "room-6", // PH-002
      ]);
    } else {
      return new Set([
        "building-1", 
        "block-1", 
        "floor-1", 
        "floor-2",
        "dept-1", // Emergency
        "dept-2", // Cardiology
        "dept-3", // Radiology
        "dept-4", // Orthopedics
        "dept-5", // Surgery
        "room-1", // G-A-001
        "room-2", // G-A-002
        "room-3", // G-A-003
        "room-4", // 101-1
        "room-5", // ER-001
        "room-6", // CARD-001
        "room-7", // CARD-002
        "room-8", // RAD-001
        "room-9", // ORTH-001
        "room-10", // ORTH-002
        "room-11", // SURG-001
        "room-12", // SURG-002
        "building-2",
        "block-2",
        "floor-3",
        "dept-6", // General OPD
        "room-13", // OPD-001
        "room-14", // OPD-002
        "room-15", // OPD-003
      ]);
    }
  };

  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(getInitialExpandedNodes());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addDialogType, setAddDialogType] = useState<"building" | "block" | "floor" | "department" | null>(null);
  const [addDialogParent, setAddDialogParent] = useState<TreeNode | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  
  // Add Rooms Dialog State
  const [showAddRoomsDialog, setShowAddRoomsDialog] = useState(false);
  const [addRoomsParent, setAddRoomsParent] = useState<TreeNode | null>(null);
  const [numberOfRooms, setNumberOfRooms] = useState("");
  const [roomPrefix, setRoomPrefix] = useState("");
  const [startingNumber, setStartingNumber] = useState("1");
  const [selectedRoomType, setSelectedRoomType] = useState<string | null>(null);

  // Sample tree data - different for Hospital vs Clinic
  const getInitialTreeData = (): TreeNode[] => {
    if (facilityType === "Clinic") {
      // Clinic structure: Building -> Floor -> Department -> Room (no blocks)
      return [
        {
          id: "building-1",
          name: "Main Building",
          type: "building",
          children: [
            {
              id: "floor-1",
              name: "Ground Floor",
              type: "floor",
              children: [
                {
                  id: "dept-1",
                  name: "General Practice",
                  type: "department",
                  children: [
                  {
                    id: "room-1",
                    name: "C-001",
                    type: "room",
                    roomNumber: "C-001",
                    roomType: "Consultation Room",
                    children: [
                      {
                        id: "bed-1",
                        name: "Bed 1",
                        type: "bed",
                        bedNumber: "1",
                      },
                      {
                        id: "bed-2",
                        name: "Bed 2",
                        type: "bed",
                        bedNumber: "2",
                      },
                    ],
                  },
                  {
                    id: "room-2",
                    name: "C-002",
                    type: "room",
                    roomNumber: "C-002",
                    roomType: "Consultation Room",
                    children: [
                      {
                        id: "bed-3",
                        name: "Bed 1",
                        type: "bed",
                        bedNumber: "1",
                      },
                      {
                        id: "bed-4",
                        name: "Bed 2",
                        type: "bed",
                        bedNumber: "2",
                      },
                      {
                        id: "bed-5",
                        name: "Bed 3",
                        type: "bed",
                        bedNumber: "3",
                      },
                    ],
                  },
                  {
                    id: "room-3",
                    name: "C-003",
                    type: "room",
                    roomNumber: "C-003",
                    roomType: "Consultation Room",
                    children: [
                      {
                        id: "bed-4",
                        name: "Bed 1",
                        type: "bed",
                        bedNumber: "1",
                      },
                    ],
                  },
                  ],
                },
                {
                  id: "dept-2",
                  name: "Laboratory",
                  type: "department",
                  children: [
                    {
                      id: "room-4",
                      name: "LAB-001",
                      type: "room",
                      roomNumber: "LAB-001",
                      roomType: "Laboratory",
                      children: [
                        {
                          id: "bed-8",
                          name: "Bed 1",
                          type: "bed",
                          bedNumber: "1",
                        },
                        {
                          id: "bed-9",
                          name: "Bed 2",
                          type: "bed",
                          bedNumber: "2",
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              id: "floor-2",
              name: "First Floor",
              type: "floor",
              children: [
                {
                  id: "dept-3",
                  name: "Pharmacy",
                  type: "department",
                  children: [
                    {
                      id: "room-5",
                      name: "PH-001",
                      type: "room",
                      roomNumber: "PH-001",
                      roomType: "Pharmacy",
                      children: [
                        {
                          id: "bed-10",
                          name: "Bed 1",
                          type: "bed",
                          bedNumber: "1",
                        },
                        {
                          id: "bed-11",
                          name: "Bed 2",
                          type: "bed",
                          bedNumber: "2",
                        },
                      ],
                    },
                    {
                      id: "room-6",
                      name: "PH-002",
                      type: "room",
                      roomNumber: "PH-002",
                      roomType: "Storage",
                      children: [
                        {
                          id: "bed-12",
                          name: "Bed 1",
                          type: "bed",
                          bedNumber: "1",
                        },
                        {
                          id: "bed-13",
                          name: "Bed 2",
                          type: "bed",
                          bedNumber: "2",
                        },
                        {
                          id: "bed-14",
                          name: "Bed 3",
                          type: "bed",
                          bedNumber: "3",
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];
    } else {
      // Hospital structure: Building -> Block -> Floor -> Department -> Room
      return [
        {
          id: "building-1",
          name: "Main Building",
          type: "building",
          children: [
            {
              id: "block-1",
              name: "Block A",
              type: "block",
              children: [
                {
                  id: "floor-1",
                  name: "Ground Floor",
                  type: "floor",
                  children: [
                    {
                      id: "dept-1",
                      name: "Emergency",
                      type: "department",
                      children: [
                        {
                          id: "room-1",
                          name: "G-A-001",
                          type: "room",
                          roomNumber: "G-A-001",
                          roomType: "Consultation Room",
                          children: [
                            {
                              id: "bed-1",
                              name: "Bed 1",
                              type: "bed",
                              bedNumber: "1",
                            },
                          ],
                        },
                        {
                          id: "room-2",
                          name: "G-A-002",
                          type: "room",
                          roomNumber: "G-A-002",
                          roomType: "Consultation Room",
                          children: [
                            {
                              id: "bed-2",
                              name: "Bed 1",
                              type: "bed",
                              bedNumber: "1",
                            },
                            {
                              id: "bed-3",
                              name: "Bed 2",
                              type: "bed",
                              bedNumber: "2",
                            },
                          ],
                        },
                        {
                          id: "room-3",
                          name: "G-A-003",
                          type: "room",
                          roomNumber: "G-A-003",
                          roomType: "Consultation Room",
                          children: [
                            {
                              id: "bed-4",
                              name: "Bed 1",
                              type: "bed",
                              bedNumber: "1",
                            },
                            {
                              id: "bed-5",
                              name: "Bed 2",
                              type: "bed",
                              bedNumber: "2",
                            },
                          ],
                        },
                        {
                          id: "room-4",
                          name: "101-1",
                          type: "room",
                          roomNumber: "101-1",
                          roomType: "Ward",
                          children: [
                            {
                              id: "bed-6",
                              name: "Bed 1",
                              type: "bed",
                              bedNumber: "1",
                            },
                            {
                              id: "bed-7",
                              name: "Bed 2",
                              type: "bed",
                              bedNumber: "2",
                            },
                            {
                              id: "bed-8",
                              name: "Bed 3",
                              type: "bed",
                              bedNumber: "3",
                            },
                            {
                              id: "bed-9",
                              name: "Bed 4",
                              type: "bed",
                              bedNumber: "4",
                            },
                          ],
                        },
                        {
                          id: "room-5",
                          name: "ER-001",
                          type: "room",
                          roomNumber: "ER-001",
                          roomType: "Emergency Room",
                          children: [
                            {
                              id: "bed-10",
                              name: "Bed 1",
                              type: "bed",
                              bedNumber: "1",
                            },
                            {
                              id: "bed-11",
                              name: "Bed 2",
                              type: "bed",
                              bedNumber: "2",
                            },
                          ],
                        },
                      ],
                    },
                    {
                      id: "dept-2",
                      name: "Cardiology",
                      type: "department",
                      children: [
                        {
                          id: "room-6",
                          name: "CARD-001",
                          type: "room",
                          roomNumber: "CARD-001",
                          roomType: "Consultation Room",
                          children: [
                            {
                              id: "bed-12",
                              name: "Bed 1",
                              type: "bed",
                              bedNumber: "1",
                            },
                            {
                              id: "bed-13",
                              name: "Bed 2",
                              type: "bed",
                              bedNumber: "2",
                            },
                          ],
                        },
                        {
                          id: "room-7",
                          name: "CARD-002",
                          type: "room",
                          roomNumber: "CARD-002",
                          roomType: "ICU",
                          children: [
                            {
                              id: "bed-14",
                              name: "Bed 1",
                              type: "bed",
                              bedNumber: "1",
                            },
                            {
                              id: "bed-15",
                              name: "Bed 2",
                              type: "bed",
                              bedNumber: "2",
                            },
                            {
                              id: "bed-16",
                              name: "Bed 3",
                              type: "bed",
                              bedNumber: "3",
                            },
                          ],
                        },
                      ],
                    },
                    {
                      id: "dept-3",
                      name: "Radiology",
                      type: "department",
                      children: [
                        {
                          id: "room-8",
                          name: "RAD-001",
                          type: "room",
                          roomNumber: "RAD-001",
                          roomType: "Laboratory",
                          children: [
                            {
                              id: "bed-17",
                              name: "Bed 1",
                              type: "bed",
                              bedNumber: "1",
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  id: "floor-2",
                  name: "First Floor",
                  type: "floor",
                  children: [
                    {
                      id: "dept-4",
                      name: "Orthopedics",
                      type: "department",
                      children: [
                        {
                          id: "room-9",
                          name: "ORTH-001",
                          type: "room",
                          roomNumber: "ORTH-001",
                          roomType: "Consultation Room",
                          children: [
                            {
                              id: "bed-18",
                              name: "Bed 1",
                              type: "bed",
                              bedNumber: "1",
                            },
                            {
                              id: "bed-19",
                              name: "Bed 2",
                              type: "bed",
                              bedNumber: "2",
                            },
                          ],
                        },
                        {
                          id: "room-10",
                          name: "ORTH-002",
                          type: "room",
                          roomNumber: "ORTH-002",
                          roomType: "Ward",
                          children: [
                            {
                              id: "bed-20",
                              name: "Bed 1",
                              type: "bed",
                              bedNumber: "1",
                            },
                            {
                              id: "bed-21",
                              name: "Bed 2",
                              type: "bed",
                              bedNumber: "2",
                            },
                            {
                              id: "bed-22",
                              name: "Bed 3",
                              type: "bed",
                              bedNumber: "3",
                            },
                            {
                              id: "bed-23",
                              name: "Bed 4",
                              type: "bed",
                              bedNumber: "4",
                            },
                          ],
                        },
                      ],
                    },
                    {
                      id: "dept-5",
                      name: "Surgery",
                      type: "department",
                      children: [
                        {
                          id: "room-11",
                          name: "SURG-001",
                          type: "room",
                          roomNumber: "SURG-001",
                          roomType: "Operation Theater",
                          children: [
                            {
                              id: "bed-24",
                              name: "Bed 1",
                              type: "bed",
                              bedNumber: "1",
                            },
                          ],
                        },
                        {
                          id: "room-12",
                          name: "SURG-002",
                          type: "room",
                          roomNumber: "SURG-002",
                          roomType: "IPD - Private Room",
                          children: [
                            {
                              id: "bed-25",
                              name: "Bed 1",
                              type: "bed",
                              bedNumber: "1",
                            },
                            {
                              id: "bed-26",
                              name: "Bed 2",
                              type: "bed",
                              bedNumber: "2",
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: "building-2",
          name: "OPD Building",
          type: "building",
          children: [
            {
              id: "block-2",
              name: "Block B",
              type: "block",
              children: [
                {
                  id: "floor-3",
                  name: "Ground Floor",
                  type: "floor",
                  children: [
                    {
                      id: "dept-6",
                      name: "General OPD",
                      type: "department",
                      children: [
                        {
                          id: "room-13",
                          name: "OPD-001",
                          type: "room",
                          roomNumber: "OPD-001",
                          roomType: "Consultation Room",
                          children: [
                            {
                              id: "bed-27",
                              name: "Bed 1",
                              type: "bed",
                              bedNumber: "1",
                            },
                            {
                              id: "bed-28",
                              name: "Bed 2",
                              type: "bed",
                              bedNumber: "2",
                            },
                          ],
                        },
                        {
                          id: "room-14",
                          name: "OPD-002",
                          type: "room",
                          roomNumber: "OPD-002",
                          roomType: "Consultation Room",
                          children: [
                            {
                              id: "bed-29",
                              name: "Bed 1",
                              type: "bed",
                              bedNumber: "1",
                            },
                          ],
                        },
                        {
                          id: "room-15",
                          name: "OPD-003",
                          type: "room",
                          roomNumber: "OPD-003",
                          roomType: "Consultation Room",
                          children: [
                            {
                              id: "bed-30",
                              name: "Bed 1",
                              type: "bed",
                              bedNumber: "1",
                            },
                            {
                              id: "bed-31",
                              name: "Bed 2",
                              type: "bed",
                              bedNumber: "2",
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];
    }
  };

  const [treeData, setTreeData] = useState<TreeNode[]>(getInitialTreeData());

  const roomTypes = [
    { value: "Consultation Room", label: "Consultation Room" },
    { value: "Therapy Room", label: "Therapy Room" },
    { value: "IPD - Deluxe Room", label: "IPD - Deluxe Room" },
    { value: "IPD - Semi-Deluxe Room", label: "IPD - Semi-Deluxe Room" },
    { value: "IPD - Private Room", label: "IPD - Private Room" },
    { value: "IPD - Ward", label: "IPD - Ward" },
    { value: "Ward", label: "Ward" },
    { value: "ICU", label: "ICU" },
    { value: "Operation Theater", label: "Operation Theater" },
    { value: "Laboratory", label: "Laboratory" },
  ];

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

  const handleAddClick = (type: "building" | "block" | "floor" | "department") => {
    setAddDialogType(type);
    setAddDialogParent(null);
    setNewItemName("");
    setShowAddDialog(true);
  };

  const handleAddItem = () => {
    if (!newItemName.trim() || !addDialogType) return;

    const newItem: TreeNode = {
      id: `${addDialogType}-${Date.now()}`,
      name: newItemName.trim(),
      type: addDialogType,
      children: addDialogType === "floor" || addDialogType === "department" ? [] : undefined,
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

    setShowAddDialog(false);
    setNewItemName("");
    setAddDialogType(null);
    setAddDialogParent(null);
  };

  const handleAddRooms = () => {
    if (!addRoomsParent || !numberOfRooms || !startingNumber || !selectedRoomType) return;

    const numRooms = parseInt(numberOfRooms);
    const startNum = parseInt(startingNumber);

    if (numRooms < 1 || numRooms > 50) return;

    const newRooms: TreeNode[] = [];
    for (let i = 0; i < numRooms; i++) {
      const roomNum = roomPrefix
        ? `${roomPrefix}-${String(startNum + i).padStart(3, "0")}`
        : String(startNum + i).padStart(3, "0");

      newRooms.push({
        id: `room-${Date.now()}-${i}`,
        name: roomNum,
        type: "room",
        roomNumber: roomNum,
        roomType: selectedRoomType,
      });
    }

    setTreeData((prev) => {
      const updateNode = (nodes: TreeNode[]): TreeNode[] => {
        return nodes.map((node) => {
          if (node.id === addRoomsParent.id) {
            return {
              ...node,
              rooms: (node.rooms || 0) + numRooms,
              children: [...(node.children || []), ...newRooms],
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

    setShowAddRoomsDialog(false);
    setNumberOfRooms("");
    setRoomPrefix("");
    setStartingNumber("1");
    setSelectedRoomType(null);
    setAddRoomsParent(null);
  };

  const countRoomsUnder = (n: TreeNode): number => {
    if (n.type === "room") return 1;
    if (!n.children) return 0;
    return n.children.reduce((sum, c) => sum + countRoomsUnder(c), 0);
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
          <span className="text-sm font-medium text-gray-900 flex-1">{node.name}</span>
          {node.type === "floor" && (
            <span className="text-xs text-gray-500">{countRoomsUnder(node)} rooms</span>
          )}
        </div>
        {isExpanded && hasChildren && (
          <div className="ml-4">
            {node.children!
              .filter((child) => facilityType === "Hospital" || child.type !== "block")
              .map((child) => renderTreeNode(child, level + 1))}
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
      case "block":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        );
      case "floor":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        );
      case "department":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
      case "room":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
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
            {facilityType === "Hospital" && (
              <Button
                variant="primary"
                size="small"
                onClick={() => {
                  setAddDialogType("block");
                  setAddDialogParent(selectedNode);
                  setNewItemName("");
                  setShowAddDialog(true);
                }}
                leftIcon={
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                }
              >
                Add Block (optional)
              </Button>
            )}
            <Button
              variant="primary"
              size="small"
              onClick={() => {
                setAddDialogType("floor");
                setAddDialogParent(selectedNode);
                setNewItemName("");
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
          </>
        );
      case "block":
        return (
          <>
            <Button
              variant="primary"
              size="small"
              onClick={() => {
                setAddDialogType("floor");
                setAddDialogParent(selectedNode);
                setNewItemName("");
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
          </>
        );
      case "floor":
        return (
          <Button
            variant="primary"
            size="small"
            onClick={() => {
              setAddDialogType("department");
              setAddDialogParent(selectedNode);
              setNewItemName("");
              setShowAddDialog(true);
            }}
            leftIcon={
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            Add Department
          </Button>
        );
      case "department":
        return (
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
            Add Rooms to Department
          </Button>
        );
      case "room":
        return (
          <Button
            variant="primary"
            size="small"
            onClick={() => {
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
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            Add Bed
          </Button>
        );
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "building":
        return "Building";
      case "block":
        return "Block";
      case "floor":
        return "Floor";
      case "department":
        return "Department";
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
      case "block":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        );
      case "floor":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        );
      case "department":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
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

    const preview: string[] = [];
    for (let i = 0; i < Math.min(numRooms, 10); i++) {
      const roomNum = roomPrefix
        ? `${roomPrefix}-${String(startNum + i).padStart(3, "0")}`
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
      blocks: countNodes(treeData, "block"),
      floors: countNodes(treeData, "floor"),
      departments: countNodes(treeData, "department"),
      totalRooms: countNodes(treeData, "room"),
    };
  }, [treeData]);

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
              >
                Add Building
              </Button>
            </div>

            <div className="space-y-1">
              {treeData
                .filter((node) => facilityType === "Hospital" || node.type !== "block")
                .map((node) => {
                  // Filter blocks from children for clinics
                  if (facilityType === "Clinic" && node.children) {
                    return {
                      ...node,
                      children: node.children.filter((child) => child.type !== "block"),
                    };
                  }
                  return node;
                })
                .map((node) => renderTreeNode(node))}
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
                {facilityType === "Hospital" && (
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <span>Block (Optional)</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  <span>Floor</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span>Department</span>
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
                  <div className="flex items-center gap-3 mb-2">
                    {getTypeIcon(selectedNode.type)}
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {getTypeLabel(selectedNode.type)}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">{selectedNode.name}</h3>
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
                        <div>
                          <span className="text-sm text-gray-600">Departments</span>
                          <p className="text-lg font-semibold text-gray-900">
                            {selectedNode.children?.filter((c) => c.type === "department").length || 0}
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
                              {Object.entries(roomTypeCounts).map(([roomType, count]) => (
                                <div key={roomType} className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">{roomType}</span>
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
                      const path = findPathToNode(treeData, selectedNode.id);
                      const context: FloorRoomEditContext | null = path && path.length >= 3
                        ? { building: path[0].name, block: path[1].name, floor: path[2].name }
                        : null;
                      if (rooms.length > 0) {
                        return (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">Floor Rooms</h4>
                            <div className="space-y-2">
                              {rooms.map((room) => {
                                const isConfigured = room.roomType && room.roomType !== "";
                                return (
                                  <div
                                    key={room.id}
                                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                                  >
                                    <div className="flex items-center gap-3 flex-1">
                                      <svg
                                        className="h-5 w-5 text-orange-600 flex-shrink-0"
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
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-medium text-gray-900">{room.name}</span>
                                          {isConfigured && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                                              Configured
                                            </span>
                                          )}
                                        </div>
                                        {room.roomType && (
                                          <p className="text-xs text-gray-500 mt-0.5">{room.roomType}</p>
                                        )}
                                      </div>
                                    </div>
                                    <Button
                                      variant={isConfigured ? "outline" : "primary"}
                                      size="small"
                                      onClick={() => {
                                        if (onEditRoom && context) onEditRoom(room, context);
                                      }}
                                    >
                                      {isConfigured ? "Edit" : "Configure"}
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
                ) : (
                  /* Statistics for other node types (building, block) */
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Statistics</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Rooms</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {selectedNode.type === "building"
                            ? (() => {
                                const countRooms = (nodes: TreeNode[]): number => {
                                  let count = 0;
                                  nodes.forEach((n) => {
                                    if (n.type === "room") count++;
                                    if (n.children) count += countRooms(n.children);
                                  });
                                  return count;
                                };
                                return selectedNode.children ? countRooms(selectedNode.children) : 0;
                              })()
                            : (selectedNode.rooms ?? 0)}
                        </span>
                      </div>
                      {selectedNode.type === "building" && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Floors/Blocks</span>
                          <span className="text-sm font-semibold text-gray-900">
                            {selectedNode.children?.filter((c) => c.type === "block" || c.type === "floor").length || 0}
                          </span>
                        </div>
                      )}
                      {selectedNode.type === "block" && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Floors</span>
                          <span className="text-sm font-semibold text-gray-900">
                            {selectedNode.children?.filter((c) => c.type === "floor").length || 0}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
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
        onClose={() => {
          setShowAddDialog(false);
          setNewItemName("");
          setAddDialogType(null);
          setAddDialogParent(null);
        }}
        title={`Add ${addDialogType ? addDialogType.charAt(0).toUpperCase() + addDialogType.slice(1) : ""}`}
        width={500}
      >
        <div className="space-y-4">
          <FormInputField
            label={`${addDialogType ? addDialogType.charAt(0).toUpperCase() + addDialogType.slice(1) : ""} Name`}
            placeholder={`Enter ${addDialogType || ""} name`}
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
          />
          <div className="flex gap-3 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setNewItemName("");
                setAddDialogType(null);
                setAddDialogParent(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddItem}>
              Add {addDialogType || ""}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Add Rooms Dialog */}
      <Dialog
        open={showAddRoomsDialog}
        onClose={() => {
          setShowAddRoomsDialog(false);
          setNumberOfRooms("");
          setRoomPrefix("");
          setStartingNumber("1");
          setSelectedRoomType(null);
          setAddRoomsParent(null);
        }}
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
            onChange={(e) => setRoomPrefix(e.target.value)}
            helperText="Prefix will be added before the room number (e.g., G-101)"
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
              options={roomTypes}
              value={selectedRoomType || ""}
              onChange={(value) => {
                const selectedValue = typeof value === 'string' ? value : value[0] || null;
                setSelectedRoomType(selectedValue);
              }}
              placeholder="Select room type"
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
            <Button
              variant="outline"
              onClick={() => {
                setShowAddRoomsDialog(false);
                setNumberOfRooms("");
                setRoomPrefix("");
                setStartingNumber("1");
                setSelectedRoomType(null);
                setAddRoomsParent(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddRooms}
              disabled={!numberOfRooms || !startingNumber || !selectedRoomType}
            >
              Add {numberOfRooms && parseInt(numberOfRooms) > 0 ? `${numberOfRooms} Room${parseInt(numberOfRooms) > 1 ? 's' : ''}` : 'Room'}
            </Button>
          </div>
        </div>
      </Dialog>
      </div>

      {/* Configuration Summary Panel */}
      <ConfigurationSummaryPanel
        facilityName={facilityName}
        facilityType={facilityType}
        completionPercentage={35}
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        buildings={stats.buildings}
        blocks={facilityType === "Hospital" ? stats.blocks : undefined}
        floors={stats.floors}
        departments={stats.departments}
        totalRooms={stats.totalRooms}
        configuredRooms={1}
        incompleteRooms={1}
      />
    </div>
  );
};

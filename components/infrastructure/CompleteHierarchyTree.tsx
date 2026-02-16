"use client";

import React, { useState, useMemo } from "react";
import { Button, ConfigurationSummaryPanel } from "@/components/ui";

type TreeNode = {
  id: string;
  name: string;
  type: "building" | "block" | "floor" | "department" | "room" | "bed";
  children?: TreeNode[];
  roomNumber?: string;
  roomType?: string;
  bedNumber?: string;
};

type CompleteHierarchyTreeProps = {
  facilityName: string;
  facilityType?: "Hospital" | "Clinic";
  onBack: () => void;
};

// Get initial tree data based on facility type
const getInitialTreeData = (facilityType: "Hospital" | "Clinic"): TreeNode[] => {
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

// Get initial expanded nodes based on facility type
const getInitialExpandedNodes = (facilityType: "Hospital" | "Clinic"): Set<string> => {
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

export const CompleteHierarchyTree = ({ facilityName, facilityType = "Hospital", onBack }: CompleteHierarchyTreeProps) => {
  const [treeData] = useState<TreeNode[]>(getInitialTreeData(facilityType));
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    getInitialExpandedNodes(facilityType)
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  // Calculate statistics
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
      rooms: countNodes(treeData, "room"),
      beds: countNodes(treeData, "bed"),
    };
  }, [treeData]);

  // Expand/Collapse functions
  const getAllNodeIds = (nodes: TreeNode[]): string[] => {
    const ids: string[] = [];
    for (const node of nodes) {
      ids.push(node.id);
      if (node.children) {
        ids.push(...getAllNodeIds(node.children));
      }
    }
    return ids;
  };

  const handleExpandAll = () => {
    const allIds = getAllNodeIds(treeData);
    setExpandedNodes(new Set(allIds));
  };

  const handleCollapseAll = () => {
    setExpandedNodes(new Set());
  };

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

  // Get icon for node type (all green for consistent infrastructure theme)
  const getNodeIcon = (type: TreeNode["type"]) => {
    const iconClass = type === "room" || type === "bed" ? "h-4 w-4 text-green-700" : "h-5 w-5 text-green-700";
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

  // Count rooms and beds under a node
  const countRoomsAndBeds = (node: TreeNode): { rooms: number; beds: number } => {
    let rooms = 0;
    let beds = 0;

    const traverse = (n: TreeNode) => {
      if (n.type === "room") rooms++;
      if (n.type === "bed") beds++;
      if (n.children) {
        n.children.forEach(traverse);
      }
    };

    traverse(node);
    return { rooms, beds };
  };

  // Render tree node with clear tree structure (vertical lines and connectors)
  const renderTreeNode = (node: TreeNode, level: number = 0, isLast: boolean = false): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const { rooms, beds } = countRoomsAndBeds(node);
    const showSummary = rooms > 0 || beds > 0;

    const indent = level * 20;

    return (
      <div key={node.id} className="flex flex-col">
        <div
          className={`flex items-center gap-2 py-2 px-2 rounded-lg cursor-pointer transition-colors group ${
            level === 0 ? "font-semibold bg-gray-50/80" : "hover:bg-gray-50"
          }`}
          style={{ paddingLeft: `${indent + 8}px` }}
          onClick={() => hasChildren && toggleNode(node.id)}
        >
          {/* Expand/Collapse Icon */}
          {hasChildren ? (
            <button
              type="button"
              className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-green-100"
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
            >
              {isExpanded ? (
                <svg className="h-4 w-4 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              ) : (
                <svg className="h-4 w-4 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          ) : (
            <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            </div>
          )}

          {/* Node Icon */}
          <div className="flex-shrink-0">{getNodeIcon(node.type)}</div>

          {/* Node Name */}
          <span className="flex-1 text-sm text-gray-900 min-w-0 truncate">{node.name}</span>

          {/* Summary */}
          {showSummary && (
            <span className="text-xs text-gray-500 flex-shrink-0">
              {rooms} {rooms === 1 ? "room" : "rooms"} • {beds} {beds === 1 ? "bed" : "beds"}
            </span>
          )}
        </div>

        {/* Children with vertical line */}
        {hasChildren && isExpanded && (
          <div className="relative border-l border-gray-200 ml-3 pl-1" style={{ marginLeft: `${indent + 20}px` }}>
            {node.children!
              .filter((child) => facilityType === "Hospital" || child.type !== "block")
              .map((child, idx) => {
                const filteredSiblings = node.children!.filter((c) => facilityType === "Hospital" || c.type !== "block");
                return (
                  <div key={child.id} className="relative">
                    {renderTreeNode(child, level + 1, idx === filteredSiblings.length - 1)}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    );
  };

  // Filter tree based on search and facility type (remove blocks for clinics)
  const filteredTreeData = useMemo(() => {
    const filterNodes = (nodes: TreeNode[]): TreeNode[] => {
      const result: TreeNode[] = [];
      
      for (const node of nodes) {
        // Skip blocks for clinics
        if (facilityType === "Clinic" && node.type === "block") {
          continue;
        }

        const matchesSearch = searchQuery.trim() 
          ? node.name.toLowerCase().includes(searchQuery.toLowerCase())
          : true;
        const filteredChildren = node.children ? filterNodes(node.children) : [];

        // Filter blocks from children for clinics
        const finalChildren = facilityType === "Clinic" 
          ? filteredChildren.filter((child) => child.type !== "block")
          : filteredChildren;

        if (matchesSearch || finalChildren.length > 0) {
          result.push({
            ...node,
            children: finalChildren.length > 0 ? finalChildren : (facilityType === "Clinic" && node.children 
              ? node.children.filter((child) => child.type !== "block")
              : node.children),
          });
        }
      }
      
      return result;
    };

    return filterNodes(treeData);
  }, [treeData, searchQuery, facilityType]);

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
              <h1 className="text-xl font-semibold text-gray-900">Complete Hierarchy Tree</h1>
              <p className="text-sm text-gray-500">{facilityName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="small" onClick={handleCollapseAll}>
              Collapse All
            </Button>
            <Button variant="outline" size="small" onClick={handleExpandAll}>
              Expand All
            </Button>
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
        </div>

      {/* Search and Summary Cards */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search rooms, beds, patients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-[32px] border border-[#DFE0E2] bg-white px-6 py-3 text-sm font-medium text-[#434956] placeholder:text-[#9CA3AF] focus:border-[#0B8C00] focus:outline-none focus:ring-2 focus:ring-[#0B8C00]/20 transition-colors"
          />
          <svg
            className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Summary Cards */}
        <div className="flex gap-3">
          <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 min-w-[100px]">
            <div className="text-xs text-gray-500 mb-1">Buildings</div>
            <div className="text-lg font-semibold text-gray-900">{stats.buildings}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 min-w-[100px]">
            <div className="text-xs text-gray-500 mb-1">Rooms</div>
            <div className="text-lg font-semibold text-gray-900">{stats.rooms}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 min-w-[100px]">
            <div className="text-xs text-gray-500 mb-1">Beds</div>
            <div className="text-lg font-semibold text-gray-900">{stats.beds}</div>
          </div>
        </div>
      </div>

      {/* Tree View - general tree structure with vertical lines */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 p-6 overflow-y-auto">
        <div className="space-y-0 relative">
          {filteredTreeData.map((node) => renderTreeNode(node, 0, false))}
        </div>
      </div>
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
        totalRooms={stats.rooms}
        configuredRooms={1}
        incompleteRooms={1}
      />
    </div>
  );
};

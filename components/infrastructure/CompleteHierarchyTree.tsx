"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui";

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
  onBack: () => void;
};

// Sample tree data with beds
const initialTreeData: TreeNode[] = [
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
                    children: [],
                  },
                  {
                    id: "room-3",
                    name: "G-A-003",
                    type: "room",
                    roomNumber: "G-A-003",
                    roomType: "Consultation Room",
                    children: [],
                  },
                  {
                    id: "room-4",
                    name: "101-1",
                    type: "room",
                    roomNumber: "101-1",
                    roomType: "Ward",
                    children: [],
                  },
                ],
              },
              {
                id: "dept-2",
                name: "AJ Department",
                type: "department",
                children: [],
              },
            ],
          },
          {
            id: "floor-2",
            name: "First Floor",
            type: "floor",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "building-2",
    name: "OPD Building",
    type: "building",
    children: [],
  },
];

export const CompleteHierarchyTree = ({ facilityName, onBack }: CompleteHierarchyTreeProps) => {
  const [treeData] = useState<TreeNode[]>(initialTreeData);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set(["building-1", "block-1", "floor-1", "dept-1"])
  );
  const [searchQuery, setSearchQuery] = useState("");

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

  // Get icon for node type
  const getNodeIcon = (type: TreeNode["type"]) => {
    switch (type) {
      case "building":
        return (
          <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      case "block":
        return (
          <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        );
      case "floor":
        return (
          <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        );
      case "department":
        return (
          <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
      case "room":
        return (
          <svg className="h-4 w-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        );
      case "bed":
        return (
          <svg className="h-4 w-4 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

  // Render tree node
  const renderTreeNode = (node: TreeNode, level: number = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const { rooms, beds } = countRoomsAndBeds(node);
    const showSummary = rooms > 0 || beds > 0;

    const paddingLeft = level * 24;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 py-2 px-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors ${
            level === 0 ? "font-semibold" : ""
          }`}
          style={{ paddingLeft: `${paddingLeft}px` }}
          onClick={() => hasChildren && toggleNode(node.id)}
        >
          {/* Expand/Collapse Icon */}
          {hasChildren ? (
            <button
              className="flex-shrink-0 w-5 h-5 flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
            >
              {isExpanded ? (
                <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              ) : (
                <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          ) : (
            <div className="w-5 h-5" />
          )}

          {/* Node Icon */}
          <div className="flex-shrink-0">{getNodeIcon(node.type)}</div>

          {/* Node Name */}
          <span className="flex-1 text-sm text-gray-900">{node.name}</span>

          {/* Summary */}
          {showSummary && (
            <span className="text-xs text-gray-500">
              {rooms} {rooms === 1 ? "room" : "rooms"} • {beds} {beds === 1 ? "bed" : "beds"}
            </span>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>{node.children!.map((child) => renderTreeNode(child, level + 1))}</div>
        )}
      </div>
    );
  };

  // Filter tree based on search
  const filteredTreeData = useMemo(() => {
    if (!searchQuery.trim()) return treeData;

    const filterNodes = (nodes: TreeNode[]): TreeNode[] => {
      const result: TreeNode[] = [];
      
      for (const node of nodes) {
        const matchesSearch = node.name.toLowerCase().includes(searchQuery.toLowerCase());
        const filteredChildren = node.children ? filterNodes(node.children) : [];

        if (matchesSearch || filteredChildren.length > 0) {
          result.push({
            ...node,
            children: filteredChildren.length > 0 ? filteredChildren : node.children,
          });
        }
      }
      
      return result;
    };

    return filterNodes(treeData);
  }, [treeData, searchQuery]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Complete Hierarchy Tree</h1>
            <p className="text-sm text-gray-500">{facilityName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="small" onClick={handleCollapseAll}>
            Collapse All
          </Button>
          <Button variant="outline" size="small" onClick={handleExpandAll}>
            Expand All
          </Button>
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

      {/* Tree View */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 p-6 overflow-y-auto">
        <div className="space-y-1">
          {filteredTreeData.map((node) => renderTreeNode(node))}
        </div>
      </div>
    </div>
  );
};

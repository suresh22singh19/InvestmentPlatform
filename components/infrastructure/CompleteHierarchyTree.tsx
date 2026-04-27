"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button, ConfigurationSummaryPanel } from "@/components/ui";
import type { FacilityConfigurationSummarySnapshot } from "@/lib/types/facilityConfigurationSummary";
import { useFacilityConfigurationSummaryFromHierarchy } from "@/hooks/useFacilityConfigurationSummaryFromHierarchy";
import { useGetBranchHierarchyTreeQuery } from "@/store/api/branchSetupApi";
import { useGetCompleteBranchHierarchyTreeQuery } from "@/store/api/branchSetupApi";
import { isConfiguredStatus } from "@/lib/utils/branchHierarchyStats";
import {
  mapCompleteBranchTreeToNodes,
  type CompleteTreeNode,
  countFloorsInPayload,
} from "@/lib/utils/completeBranchHierarchyFromApi";

type TreeNode = CompleteTreeNode;

type CompleteHierarchyTreeProps = {
  branchId: number | null;
  facilityName: string;
  facilityType?: "Hospital" | "Clinic";
  onBack: () => void;
  configurationSummary?: FacilityConfigurationSummarySnapshot | null;
};

function roomConfigDotClass(status: string | null | undefined): string {
  return isConfiguredStatus(status) ? "bg-green-500" : "bg-red-500";
}

export const CompleteHierarchyTree = ({
  branchId,
  facilityName,
  facilityType = "Hospital",
  onBack,
  configurationSummary = null,
}: CompleteHierarchyTreeProps) => {
  const { data: hierarchyTreeRes } = useGetBranchHierarchyTreeQuery(branchId ?? 0, {
    skip: branchId === null,
  });
  const {
    data: hierarchyRes,
    isLoading,
    isError,
    error,
  } = useGetCompleteBranchHierarchyTreeQuery(branchId ?? 0, {
    skip: branchId === null,
  });

  const payload = hierarchyRes?.data;
  const treeData: TreeNode[] = useMemo(
    () => mapCompleteBranchTreeToNodes(payload?.tree ?? []),
    [payload?.tree]
  );

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  useEffect(() => {
    if (treeData.length === 0) {
      setExpandedNodes(new Set());
      return;
    }
    const ids = new Set<string>();
    treeData.forEach((b) => {
      ids.add(b.id);
      b.children?.forEach((f) => ids.add(f.id));
    });
    setExpandedNodes(ids);
  }, [branchId, treeData]);

  const stats = useMemo(() => {
    const summary = payload?.summary;
    const tree = payload?.tree ?? [];
    const buildings =
      summary?.buildings ??
      tree.length;
    const rooms =
      summary?.rooms ??
      tree.reduce((s, b) => s + (b.counts?.rooms ?? 0), 0);
    const beds =
      summary?.beds ??
      tree.reduce((s, b) => s + (b.counts?.beds ?? 0), 0);
    const floors =
      summary?.floors ?? countFloorsInPayload(tree);

    return { buildings, floors, rooms, beds };
  }, [payload]);

  const displayFacilityName = payload?.branch?.name?.trim() || facilityName;

  const configurationSummaryForPanel = useFacilityConfigurationSummaryFromHierarchy(
    hierarchyTreeRes?.success && Array.isArray(hierarchyTreeRes.data) ? hierarchyTreeRes.data : undefined,
    configurationSummary,
  );

  const getAllNodeIds = (nodes: TreeNode[]): string[] => {
    const ids: string[] = [];
    for (const node of nodes) {
      ids.push(node.id);
      if (node.children) ids.push(...getAllNodeIds(node.children));
    }
    return ids;
  };

  const handleExpandAll = () => {
    setExpandedNodes(new Set(getAllNodeIds(treeData)));
  };

  const handleCollapseAll = () => {
    setExpandedNodes(new Set());
  };

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const getNodeIcon = (type: TreeNode["type"]) => {
    const iconClass =
      type === "room" || type === "bed" ? "h-4 w-4 text-green-700" : "h-5 w-5 text-green-700";
    switch (type) {
      case "building":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
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
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
        );
      case "bed":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  const countRoomsAndBeds = (node: TreeNode): { rooms: number; beds: number } => {
    let rooms = 0;
    let beds = 0;
    const traverse = (n: TreeNode) => {
      if (n.type === "room") rooms++;
      if (n.type === "bed") beds++;
      n.children?.forEach(traverse);
    };
    traverse(node);
    return { rooms, beds };
  };

  const renderTreeNode = (node: TreeNode, level: number = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = Boolean(node.children?.length);
    const { rooms: childRooms, beds: childBeds } = countRoomsAndBeds(node);
    const summaryRooms =
      node.branchSummary != null ? node.branchSummary.rooms : childRooms;
    const summaryBeds = node.branchSummary != null ? node.branchSummary.beds : childBeds;
    const showSummary =
      node.branchSummary != null || childRooms > 0 || childBeds > 0;

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

          {node.type === "room" && (
            <span
              className={`h-2 w-2 rounded-full flex-shrink-0 ${roomConfigDotClass(node.roomConfigStatus)}`}
              title={node.roomConfigStatus ?? "unknown"}
            />
          )}

          <div className="flex-shrink-0">{getNodeIcon(node.type)}</div>

          <span className="flex-1 text-sm text-gray-900 min-w-0 truncate">{node.name}</span>

          {showSummary && (
            <span className="text-xs text-gray-500 flex-shrink-0">
              {node.type === "room" && node.branchSummary != null ? (
                <>
                  {summaryBeds} {summaryBeds === 1 ? "bed" : "beds"}
                </>
              ) : (
                <>
                  {summaryRooms} {summaryRooms === 1 ? "room" : "rooms"} • {summaryBeds}{" "}
                  {summaryBeds === 1 ? "bed" : "beds"}
                </>
              )}
            </span>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="relative border-l border-gray-200 ml-3 pl-1" style={{ marginLeft: `${indent + 20}px` }}>
            {node.children!.map((child) => (
                  <div key={child.id} className="relative">
                {renderTreeNode(child, level + 1)}
                  </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const filteredTreeData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filterNodes = (nodes: TreeNode[]): TreeNode[] => {
      const result: TreeNode[] = [];
      for (const node of nodes) {
        const hay = [
          node.name,
          node.roomNumber,
          node.roomType,
          node.bedNumber,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const matchesSearch = !q || hay.includes(q);
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

  const errorMessage =
    isError && error && "data" in error && error.data != null && typeof error.data === "object" && "message" in error.data
      ? String((error.data as { message?: unknown }).message)
      : isError
        ? "Failed to load hierarchy."
        : null;

  return (
    <div className="flex gap-6 h-full">
      <div className={`flex flex-col transition-all duration-300 ${isPanelOpen ? "w-[80%]" : "w-full"}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg hover:bg-green-100 transition-colors"
            >
              <svg className="h-5 w-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Complete Hierarchy Tree</h1>
              <p className="text-sm text-gray-500">{displayFacilityName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="small" onClick={handleCollapseAll} disabled={treeData.length === 0}>
              Collapse All
            </Button>
            <Button variant="outline" size="small" onClick={handleExpandAll} disabled={treeData.length === 0}>
              Expand All
            </Button>
            {!isPanelOpen && (
              <button
                type="button"
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

      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search rooms, beds, patients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-[32px] border border-[#DFE0E2] bg-white px-6 py-3 text-sm font-medium text-[#434956] placeholder:text-[#9CA3AF] focus:border-[#0B8C00] focus:outline-none focus:ring-2 focus:ring-[#0B8C00]/20 transition-colors"
              disabled={branchId === null || treeData.length === 0}
          />
          <svg
            className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
          </svg>
        </div>

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

        <div className="flex-1 bg-white rounded-xl border border-gray-200 p-6 overflow-y-auto min-h-[240px]">
          {branchId === null ? (
            <p className="text-sm text-gray-500">Select a branch to view the hierarchy tree.</p>
          ) : isLoading ? (
            <p className="text-sm text-gray-500">Loading hierarchy…</p>
          ) : errorMessage ? (
            <p className="text-sm text-red-600">{errorMessage}</p>
          ) : filteredTreeData.length === 0 ? (
            <p className="text-sm text-gray-500">
              {searchQuery.trim() ? "No matching rooms or beds." : "No buildings or rooms for this branch yet."}
            </p>
          ) : (
            <div className="space-y-0 relative">{filteredTreeData.map((node) => renderTreeNode(node, 0))}</div>
          )}
      </div>
      </div>

      <ConfigurationSummaryPanel
        facilityName={displayFacilityName}
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

"use client";

import { useMemo } from "react";
import type { FacilityConfigurationSummarySnapshot } from "@/lib/types/facilityConfigurationSummary";
import type { HierarchyBranch } from "@/lib/utils/branchHierarchyStats";
import { computeBranchHierarchyStats, formatHierarchyLastModified } from "@/lib/utils/branchHierarchyStats";

/**
 * When `configurationSummary` is passed (e.g. from `/infrastructure/config-structure`), it wins.
 * Otherwise derive live counts from GET branch hierarchy tree (same source as the main dashboard).
 */
export function useFacilityConfigurationSummaryFromHierarchy(
  hierarchyBranches: HierarchyBranch[] | undefined,
  configurationSummary?: FacilityConfigurationSummarySnapshot | null,
): FacilityConfigurationSummarySnapshot {
  return useMemo(() => {
    if (configurationSummary) return configurationSummary;
    if (!hierarchyBranches?.length) {
      return {
        completionPercentage: null,
        lastModified: undefined,
        buildings: 0,
        floors: 0,
        totalRooms: 0,
        configuredRooms: "-",
        incompleteRooms: "-",
      };
    }
    const s = computeBranchHierarchyStats(hierarchyBranches);
    return {
      completionPercentage: s.completionPercent,
      lastModified: formatHierarchyLastModified(s.lastModifiedIso),
      buildings: s.buildings ?? 0,
      floors: s.floors ?? 0,
      totalRooms: s.rooms ?? 0,
      configuredRooms: s.configuredKnown ? (s.configuredRooms ?? 0) : "-",
      incompleteRooms: s.configuredKnown ? (s.incompleteRooms ?? 0) : "-",
    };
  }, [hierarchyBranches, configurationSummary]);
}

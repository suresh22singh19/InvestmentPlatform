"use client";

import { BranchHardwareFacilityMaster } from "./BranchHardwareFacilityMaster";
import type { FacilityConfigurationSummarySnapshot } from "@/lib/types/facilityConfigurationSummary";

type HardwareMasterProps = {
  facilityName: string;
  /** Branch id for branch-specific hardware list and mapping APIs */
  branchId?: number | null;
  canView?: boolean;
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  onBack: () => void;
  configurationSummary?: FacilityConfigurationSummarySnapshot | null;
};

export const HardwareMaster = ({
  facilityName,
  branchId = null,
  canView = true,
  canAdd = true,
  canEdit = true,
  canDelete = true,
  onBack,
  configurationSummary = null,
}: HardwareMasterProps) => {
  return (
    <BranchHardwareFacilityMaster
      facilityName={facilityName}
      branchId={branchId ?? null}
      canView={canView}
      canAdd={canAdd}
      canEdit={canEdit}
      canDelete={canDelete}
      onBack={onBack}
      kind="hardware"
      configurationSummary={configurationSummary}
    />
  );
};

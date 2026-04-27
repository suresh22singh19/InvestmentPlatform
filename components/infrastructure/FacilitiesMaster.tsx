"use client";

import { BranchHardwareFacilityMaster } from "./BranchHardwareFacilityMaster";
import type { FacilityConfigurationSummarySnapshot } from "@/lib/types/facilityConfigurationSummary";

type FacilitiesMasterProps = {
  facilityName: string;
  /** Branch id for branch-specific facilities list and mapping APIs */
  branchId?: number | null;
  canView?: boolean;
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  onBack: () => void;
  configurationSummary?: FacilityConfigurationSummarySnapshot | null;
};

export const FacilitiesMaster = ({
  facilityName,
  branchId = null,
  canView = true,
  canAdd = true,
  canEdit = true,
  canDelete = true,
  onBack,
  configurationSummary = null,
}: FacilitiesMasterProps) => {
  return (
    <BranchHardwareFacilityMaster
      facilityName={facilityName}
      branchId={branchId ?? null}
      canView={canView}
      canAdd={canAdd}
      canEdit={canEdit}
      canDelete={canDelete}
      onBack={onBack}
      kind="facility"
      configurationSummary={configurationSummary}
    />
  );
};

/** Passed from facility config (or derived locally) for the Configuration Summary side panel */
export type FacilityConfigurationSummarySnapshot = {
  completionPercentage: number | null;
  lastModified?: string;
  buildings: number | string;
  floors: number | string;
  totalRooms: number | string;
  configuredRooms: number | string;
  incompleteRooms: number | string;
};

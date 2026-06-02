export type ReceptionDashboardTab =
  | "dashboard"
  | "admitted-patients"
  | "daily-operations"
  | "historical-patients";

export type AdmissionType = "TPA (HealthIns)" | "Private" | "Panel (Govt Emp)";

export type WardCapacityStatusColor = "green" | "grey" | "red";

export interface ReceptionDashboardStats {
  totalAwaiting: number;
  admittedToday: number;
  availableBeds: number;
  dischargePending: number;
  awaitingRecentCount: number;
  admittedRecentCount: number;
  generalWardFreeBeds: number;
}

export interface WardCapacityItem {
  id: string;
  name: string;
  totalBeds: number;
  occupiedBeds: number;
  freeBeds: number;
  occupancyPercentage: number;
  statusColor: WardCapacityStatusColor;
}

export interface ReceptionDashboardStatsResponse {
  success: boolean;
  data: ReceptionDashboardStats;
  message: string;
}

export interface WardCapacityResponse {
  success: boolean;
  data: WardCapacityItem[];
  message: string;
}

export interface ReceptionDashboardData {
  stats: ReceptionDashboardStats;
  wards: WardCapacityItem[];
}

export type ReceptionStatSubtextKey =
  | "awaitingSubtext"
  | "admittedSubtext"
  | "bedsSubtext"
  | "dischargeSubtext";

export type ReceptionStatSubtextIcon = "trend" | "clock" | "info";

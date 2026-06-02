export interface IpdDashboardStatCount {
  count: number;
  lastHourCount?: number;
}

export interface IpdDashboardBedBreakdownItem {
  wardType: string;
  freeCount: number;
}

export interface IpdDashboardAvailableBeds {
  count: number;
  breakdown: IpdDashboardBedBreakdownItem[];
}

export interface IpdDashboardStatsData {
  totalAwaiting: IpdDashboardStatCount;
  admittedToday: IpdDashboardStatCount;
  availableBeds: IpdDashboardAvailableBeds;
  dischargePending?: IpdDashboardStatCount;
}

export interface IpdDashboardStatsResponse {
  success: boolean;
  data: IpdDashboardStatsData;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface IpdDashboardStatsParams {
  branchId?: number;
}

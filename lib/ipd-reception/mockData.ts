import { buildWardCapacityItem } from "./utils";
import type { WardCapacityItem } from "./types";

/** Fallback for Ward Capacity Overview (left panel) until API returns wardCapacity. */
export const MOCK_WARD_CAPACITY: WardCapacityItem[] = [
  buildWardCapacityItem("general-ward", "General Ward", 40, 25, "green"),
  buildWardCapacityItem("private-suite", "Private Suite", 12, 8, "grey"),
  buildWardCapacityItem("private-ward", "Private Ward", 8, 1, "red"),
];

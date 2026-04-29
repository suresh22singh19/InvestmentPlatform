/**
 * Branch / facility setup API (create branch, etc.)
 */

import { baseApi } from "./baseApi";
import type { HierarchyBranch } from "@/lib/utils/branchHierarchyStats";

export interface CreateBranchApiResponse {
  success: boolean;
  message?: string;
  data?: unknown;
  statusCode?: number;
  timestamp?: string;
}

/** Optional list payload from GET /branch/getAllBranch (structure may grow). */
export type BranchInsights = {
  buildings?: number;
  floors?: number;
  blocks?: number;
  departments?: number;
  rooms?: { total?: number; completed?: number; configured?: number; incomplete?: number };
  beds?: { total?: number; completed?: number; configured?: number; incomplete?: number };
  completionPercentage?: number;
};

/** Row from GET /branch/getAllBranch (fields may be partial). */
export type BranchListRow = {
  id: number;
  name?: string | null;
  phoneNumber?: string | null;
  emailAddress?: string | null;
  address?: string | null;
  state?: string | null;
  district?: string | null;
  type?: string | null;
  branchStatus?: string | null;
  status?: string | null;
  branchCode?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  insights?: BranchInsights | null;
};

export type GetAllBranchesResponse = {
  success: boolean;
  data: BranchListRow[];
  total: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  message?: string;
  statusCode?: number;
  timestamp?: string;
};

export type GetAllBranchesArgs = {
  limit: number;
  offset: number;
  sort?: string;
  order?: "asc" | "desc";
  branchId?: number;
};

/** Row from GET /branch/getModulesForBranchSetup */
export type BranchSetupModuleRow = {
  id: string;
  moduleName: string;
  isActive: boolean;
  createdAt: string;
};

export type GetModulesForBranchSetupResponse = {
  success: boolean;
  data: BranchSetupModuleRow[];
  message?: string;
  timestamp?: string;
  statusCode?: number;
};

/** Row from GET /branch/getBranchListByType?branchType=hospital|clinic */
export type BranchListByTypeRow = {
  id: number;
  name: string;
};

export type GetBranchListByTypeResponse = {
  success: boolean;
  data: BranchListByTypeRow[];
  message?: string;
  timestamp?: string;
  statusCode?: number;
};

export type GetBranchListByTypeArgs = {
  branchType: "hospital" | "clinic";
};

/** Row from GET /branch/getModulesWithBranchMapping?branchId= */
export type BranchModuleMappingRow = {
  id: number;
  moduleName: string;
  isActive: number;
  branchModuleId: number | null;
};

export type GetModulesWithBranchMappingResponse = {
  success: boolean;
  data: BranchModuleMappingRow[];
  message?: string;
  timestamp?: string;
  statusCode?: number;
};

export type AssignModulesToBranchBody = {
  mappings: { branchId: number; moduleId: number }[];
};

export type AssignModulesToBranchResponse = {
  success: boolean;
  message?: string;
  timestamp?: string;
  statusCode?: number;
};

export type GetBranchHierarchyTreeResponse = {
  success: boolean;
  data: HierarchyBranch[];
  message?: string;
  statusCode?: number;
  timestamp?: string;
};

export type CompleteHierarchyCounts = {
  rooms?: number;
  beds?: number;
};

export type CompleteHierarchyBed = {
  id?: number;
  bedNumber?: string | null;
  name?: string | null;
};

export type CompleteHierarchyRoom = {
  id: number;
  roomNumber: string;
  roomType?: string | null;
  roomCurrentStatus?: string | null;
  roomConfigStatus?: string | null;
  counts?: CompleteHierarchyCounts;
  beds?: CompleteHierarchyBed[];
};

export type CompleteHierarchyFloor = {
  id: number;
  floor: string;
  counts?: CompleteHierarchyCounts;
  rooms: CompleteHierarchyRoom[];
};

export type CompleteHierarchyBuilding = {
  id: number;
  name: string;
  counts?: CompleteHierarchyCounts;
  floors: CompleteHierarchyFloor[];
};

export type CompleteBranchHierarchyPayload = {
  branch: { id: number; name?: string; code?: string };
  summary: {
    buildings?: number;
    floors?: number;
    rooms?: number;
    beds?: number;
  };
  tree: CompleteHierarchyBuilding[];
};

export type GetCompleteBranchHierarchyTreeResponse = {
  success: boolean;
  data?: CompleteBranchHierarchyPayload;
  message?: string;
  statusCode?: number;
  timestamp?: string;
};

export type BranchInsightSummary = {
  totalBranches?: number;
  totalBuildings?: number;
  totalConfiguredRooms?: number;
  /** Active branches in setup; omit / null / 0 / "0" → show "—" in UI */
  totalActiveBranches?: number | string | null;
};

export type GetBranchInsightSummaryResponse = {
  success: boolean;
  data?: BranchInsightSummary;
  message?: string;
  statusCode?: number;
  timestamp?: string;
};

export type CreateBuildingRecord = {
  id: number;
  name: string;
  branchId: number;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  deletedBy?: string | null;
  syncLastUpdatedBy?: string | null;
  syncOrigin?: string | null;
};

export type CreateBuildingResponse = {
  success: boolean;
  data?: CreateBuildingRecord;
  message?: string;
  statusCode?: number;
  timestamp?: string;
};

export type CreateBuildingArgs = {
  branchId: number;
  name: string;
};

export type FloorMasterRecord = {
  id: number;
  floor: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
};

export type GetAllFloorsResponse = {
  success: boolean;
  data: FloorMasterRecord[];
  message?: string;
  statusCode?: number;
  timestamp?: string;
};

export type CreateFloorArgs = {
  branchId: number;
  buildingId: number;
  floorId: number;
};

export type CreateFloorResponse = {
  success: boolean;
  data?: unknown;
  message?: string;
  statusCode?: number;
  timestamp?: string;
};

/** Generic ok/error envelope for simple building/floor mutations */
export type BranchStructureMutationResponse = {
  success: boolean;
  message?: string;
  statusCode?: number;
  timestamp?: string;
  data?: unknown;
};

/** PATCH /building/updateBuilding/:buildingId — body `{ name: string }` */
export type UpdateBuildingMutationResponse = CreateBuildingResponse;

/** DELETE /building/deleteBuilding/:buildingId */
export type DeleteBuildingMutationResponse = {
  success: boolean;
  data?: null;
  message?: string;
  statusCode?: number;
  timestamp?: string;
};

export type UpdateBuildingArgs = {
  branchId: number;
  buildingId: number;
  name: string;
};

export type DeleteBuildingArgs = {
  branchId: number;
  buildingId: number;
};

/** PATCH /floor/updateFloor/:branchId/:buildingId/:floorMappingId — body `{ floorId: newMasterFloorId }` */
export type UpdateFloorMappingArgs = {
  branchId: number;
  buildingId: number;
  /** Branch–building–floor row id (third path segment) */
  floorMappingId: number;
  /** New master floor id (request body `floorId`) */
  newMasterFloorId: number;
};

export type FloorMappingRecord = {
  id: number;
  branchId: number;
  buildingId: number;
  floorId: number;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  createdBy?: unknown;
  updatedBy?: unknown;
  deletedBy?: unknown;
};

export type UpdateFloorMappingResponse = {
  success: boolean;
  data?: FloorMappingRecord;
  message?: string;
  statusCode?: number;
  timestamp?: string;
};

/** DELETE /floor/deleteFloor/:branchId/:buildingId/:floorMappingId */
export type DeleteFloorMappingArgs = {
  branchId: number;
  buildingId: number;
  floorMappingId: number;
};

export type DeleteFloorMappingResponse = {
  success: boolean;
  data?: null;
  message?: string;
  statusCode?: number;
  timestamp?: string;
};

export type BranchHardwareFacilityKind = "hardware" | "facility";

export type HardwareFacilityNested = {
  id: number;
  name: string;
  description?: string | null;
  hardwareFacilitiesType?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  createdBy?: unknown;
  updatedBy?: unknown;
  deletedBy?: unknown;
};

export type BranchHardwareFacilityRow = {
  id: number;
  branchId: number;
  hardwareFacilityId: number;
  type: BranchHardwareFacilityKind;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  createdBy?: unknown;
  updatedBy?: unknown;
  deletedBy?: unknown;
  hardwareFacility?: HardwareFacilityNested | null;
};

export type GetBranchHardwareFacilityByTypeResponse = {
  success: boolean;
  data: BranchHardwareFacilityRow[];
  message?: string;
  statusCode?: number;
  timestamp?: string;
};

export type BranchHardwareFacilityCreateItem = {
  branchId: number;
  hardwareFacilityId: number;
  type: BranchHardwareFacilityKind;
};

export type CreateBranchHardwareFacilityArgs = {
  branchHardwareFacilities: BranchHardwareFacilityCreateItem[];
};

export type CreateBranchHardwareFacilityResponse = {
  success: boolean;
  data?: {
    savedBranchHardwareFacilities?: BranchHardwareFacilityRow[];
    duplicateBranchHardwareFacilities?: string[];
  };
  message?: string;
  statusCode?: number;
  timestamp?: string;
};

export type DeleteBranchHardwareFacilityResponse = {
  success: boolean;
  message?: string;
  data?: unknown;
  statusCode?: number;
  timestamp?: string;
};

export type BranchRoomTypeNested = {
  id: number;
  roomType: string;
  roomTypeCode: string;
  roomNumberPrefix: string;
  isRented: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  createdBy?: unknown;
  updatedBy?: unknown;
  deletedBy?: unknown;
};

export type BranchRoomTypeMappingRow = {
  id: number;
  branchId: number;
  roomtypeId: number;
  roomRentPrice?: number;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  createdBy?: unknown;
  updatedBy?: unknown;
  deletedBy?: unknown;
  roomType?: BranchRoomTypeNested | null;
};

export type GetBranchRoomTypesByBranchResponse = {
  success: boolean;
  data: BranchRoomTypeMappingRow[];
  message?: string;
  statusCode?: number;
  timestamp?: string;
  total?: number;
};

/** One mapping row in POST body `{ branchRoomTypes: [...] }` */
export type BranchRoomTypeCreateItem = {
  branchId: number;
  roomtypeId: number;
  roomRentPrice?: number;
};

export type CreateBranchRoomTypeArgs = {
  branchRoomTypes: BranchRoomTypeCreateItem[];
};

export type CreateBranchRoomTypeResponse = {
  success: boolean;
  data?: {
    savedBranchRoomTypes?: BranchRoomTypeMappingRow[];
    duplicateBranchRoomTypes?: string[];
  };
  message?: string;
  statusCode?: number;
  timestamp?: string;
};

export type DeleteBranchRoomTypeResponse = {
  success: boolean;
  message?: string;
  data?: unknown;
  statusCode?: number;
  timestamp?: string;
};

/** Single room row for POST /room/createRoom */
export type CreateRoomItemPayload = {
  branchId: number;
  buildingId: number;
  floorId: number;
  roomType: string;
  bedCapacity: number;
  roomNumber: string;
  roomToilet: string;
  roomImages?: string;
  sort: number;
  status: string;
};

export type CreateRoomsRequestBody = {
  rooms: CreateRoomItemPayload[];
};

export type CreateRoomsResponse = {
  success?: boolean;
  message?: string;
  statusCode?: number;
  timestamp?: string;
  data?: unknown;
};

export type BuildingByBranchRow = {
  id: number;
  name: string;
  branchId: number;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  createdBy?: unknown;
  updatedBy?: unknown;
  deletedBy?: unknown;
  syncOrigin?: string | null;
  syncLastUpdatedBy?: string | null;
};

export type GetBuildingsByBranchResponse = {
  success: boolean;
  data: BuildingByBranchRow[];
  total?: number;
  message?: string;
  statusCode?: number;
  timestamp?: string;
};

/** Row from hardwareFacilities[] on GET /room/getAllRooms/:branchId */
export type RoomHardwareFacilityLink = {
  id: number;
  roomId: number;
  hardwareFacilityId: number;
  quantity: number;
  hardwareFacilitiesType: string;
  hardwareFacility?: {
    id: number;
    name: string;
    description?: string | null;
    hardwareFacilitiesType?: string | null;
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string | null;
  } | null;
};

/** Optional nested building on GET /room/getAllRooms/:id room row */
export type RoomListNestedBuildingFloor = {
  id?: number;
  branchId?: number;
  buildingId?: number;
  floorId?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
  createdBy?: unknown;
  updatedBy?: unknown;
  deletedBy?: unknown;
};

export type RoomListNestedBuilding = {
  id: number;
  name?: string | null;
  branchId?: number;
  syncOrigin?: string | null;
  syncLastUpdatedBy?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
  createdBy?: unknown;
  updatedBy?: unknown;
  deletedBy?: unknown;
  buildingFloor?: RoomListNestedBuildingFloor | null;
};

export type BranchRoomListRow = {
  id: number;
  branchId: number;
  buildingId: number;
  floorId: number;
  roomType: string;
  bedCapacity: number;
  roomNumber: string;
  roomImages?: string | null;
  sort?: number;
  roomToilet?: string | null;
  status?: string | null;
  roomCurrentStatus?: string | null;
  roomUsage?: string | null;
  roomConfigStatus?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
  createdBy?: unknown;
  updatedBy?: unknown;
  deletedBy?: unknown;
  syncOrigin?: string | null;
  syncLastUpdatedBy?: string | null;
  hardwareFacilities?: RoomHardwareFacilityLink[];
  building?: RoomListNestedBuilding | null;
};

export type GetAllRoomsByBranchInsight = {
  totalRooms?: number;
  configured?: number;
  incomplete?: number;
  vacant?: number;
};

/** New API: `data` is `{ rooms, insight }` instead of a bare array */
export type GetAllRoomsByBranchDataEnvelope = {
  rooms: BranchRoomListRow[];
  insight?: GetAllRoomsByBranchInsight | null;
};

export type GetAllRoomsByBranchResponse = {
  success: boolean;
  data: BranchRoomListRow[] | GetAllRoomsByBranchDataEnvelope;
  message?: string;
  statusCode?: number;
  timestamp?: string;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
};

/** Query args for GET /room/getAllRooms/:branchId (page/limit + optional filters if supported by API). */
export type GetAllRoomsByBranchQueryArgs = {
  branchId: number;
  page?: number;
  limit?: number;
  search?: string;
  buildingId?: string;
  roomtypeId?: string;
  roomCurrentStatus?: string;
};

/** Supports legacy `data: Room[]` and new `data: { rooms, insight }`. */
export function parseGetAllRoomsResponse(
  data: GetAllRoomsByBranchResponse["data"] | undefined
): { rooms: BranchRoomListRow[]; insight: GetAllRoomsByBranchInsight | null } {
  if (data == null) return { rooms: [], insight: null };
  if (Array.isArray(data)) return { rooms: data, insight: null };
  const rooms = Array.isArray(data.rooms) ? data.rooms : [];
  const insight = data.insight ?? null;
  return { rooms, insight };
}

export type SingleRoomHardwareItem = {
  id: number;
  roomId: number;
  branchId?: number;
  hardwareFacilityId: number;
  quantity: number;
  hardwareFacilitiesType: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
  hardwareEntity?: {
    id: number;
    name: string;
    description?: string | null;
    hardwareFacilitiesType?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    deletedAt?: string | null;
  } | null;
};

export type SingleRoomFacilityItem = {
  id: number;
  roomId: number;
  branchId?: number;
  hardwareFacilityId: number;
  quantity: number;
  hardwareFacilitiesType: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
  facilityEntity?: {
    id: number;
    name: string;
    description?: string | null;
    hardwareFacilitiesType?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    deletedAt?: string | null;
  } | null;
};

export type SingleRoomDetail = {
  id: number;
  branchId: number;
  buildingId: number;
  floorId: number;
  roomType: string;
  bedCapacity: number;
  roomNumber: string;
  roomImages?: string | null;
  sort?: number;
  roomToilet?: string | null;
  status?: string | null;
  roomCurrentStatus?: string | null;
  roomUsage?: string | null;
  roomConfigStatus?: string | null;
  syncOrigin?: string | null;
  syncLastUpdatedBy?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
  createdBy?: unknown;
  updatedBy?: unknown;
  deletedBy?: unknown;
  hardware?: SingleRoomHardwareItem[];
  facility?: SingleRoomFacilityItem[];
};

export type GetSingleRoomResponse = {
  success: boolean;
  data: SingleRoomDetail;
  message?: string;
  statusCode?: number;
  timestamp?: string;
};

export type UpdateRoomPayload = {
  roomType: string;
  bedCapacity: number;
  roomNumber: string;
  status: string;
  roomToilet: string;
  roomCurrentStatus: string;
  roomUsage: string;
  hardwares: { hardwareId: number; quantity: number }[];
  facilities: { facilityId: number }[];
};

export type UpdateRoomResponse = {
  success?: boolean;
  data?: unknown;
  message?: string;
  statusCode?: number;
  timestamp?: string;
};

export type DeleteRoomResponse = {
  success?: boolean;
  data?: unknown;
  message?: string;
  statusCode?: number;
  timestamp?: string;
};

export type BedApiRow = {
  id: number;
  branchId: number;
  floorId: number;
  roomId: number;
  bedNumber: string;
  available: string;
  reserved: string;
  barcodeUrl?: string | null;
  status: string;
  bedNote?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
};

export type GetAllBedsResponse = {
  success: boolean;
  data: BedApiRow[];
  message?: string;
  statusCode?: number;
  timestamp?: string;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
};

export type GetAllBedsQueryArgs = {
  branchId: number;
  floorId: number;
  roomId: number;
  page?: number;
  limit?: number;
};

export type CreateBedItemPayload = {
  branchId: number;
  buildingId: number;
  floorId: number;
  roomId: number;
  bedNumber: string;
  available: string;
  reserved: string;
  barcodeUrl: string;
  status: string;
};

export type CreateBedsRequestBody = { beds: CreateBedItemPayload[] };

export type CreateBedsResponse = {
  success: boolean;
  data?: {
    savedBeds?: BedApiRow[];
    duplicateBeds?: number[];
  };
  message?: string;
  statusCode?: number;
  timestamp?: string;
};

export type DeleteBedResponse = {
  success: boolean;
  data?: unknown;
  message?: string;
  statusCode?: number;
  timestamp?: string;
};

export type UpdateBedPayload = {
  bedNumber: string;
  bedNote: string;
  available: string;
  reserved: string;
  barcodeUrl: string;
  status: string;
};

export type UpdateBedResponse = {
  success?: boolean;
  data?: BedApiRow;
  message?: string;
  statusCode?: number;
  timestamp?: string;
};

/** Row from GET /branch-services/getBranchServicesByBranchId/:branchId */
export type BranchConsultancyServiceRow = {
  id: number;
  branchId: number;
  masterServiceId: number;
  productId?: number | null;
  name?: string | null;
  prodcode?: string;
  category: string;
  subCategory: string;
  price: string;
  hsnCode?: string | null;
  gstRate?: number | null;
  sTax?: number | null;
  cTax?: number | null;
  cessTax?: number | null;
  duration?: number | null;
  mainCategory?: string | null;
  barcodeApplicable?: string;
  isActive?: string;
  isProductMapped?: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  createdBy?: unknown;
  updatedBy?: unknown;
  deletedBy?: unknown;
};

export type GetBranchServicesByBranchIdResponse = {
  success: boolean;
  data: BranchConsultancyServiceRow[];
  message?: string;
  statusCode?: number;
  timestamp?: string;
};

export type CreateBranchServiceBody = {
  branchId: number;
  masterServiceId: number;
  /** Optional price override (string per API) */
  price?: string;
};

export type CreateBranchServiceResponse = {
  success: boolean;
  data?: BranchConsultancyServiceRow;
  message?: string;
  statusCode?: number;
  timestamp?: string;
};

export type UpdateBranchServiceBody = {
  masterServiceId?: number;
  price?: string;
};

export type UpdateBranchServiceResponse = {
  success: boolean;
  data?: BranchConsultancyServiceRow;
  message?: string;
  statusCode?: number;
  timestamp?: string;
};

export type DeleteBranchServiceResponse = {
  success: boolean;
  data?: { id: number };
  message?: string;
  statusCode?: number;
  timestamp?: string;
};

export const branchSetupApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBranchHierarchyTree: builder.query<GetBranchHierarchyTreeResponse, number>({
      query: (branchId) => `/branch/getBranchHierarchyTree/${branchId}`,
      providesTags: ["Branches"],
    }),
    getCompleteBranchHierarchyTree: builder.query<GetCompleteBranchHierarchyTreeResponse, number>({
      query: (branchId) => `/branch/getCompleteBranchHierarchyTree/${branchId}`,
      providesTags: ["Branches"],
    }),
    getBranchInsightSummary: builder.query<GetBranchInsightSummaryResponse, void>({
      query: () => "/branch/getBranchInsightSummary",
      providesTags: ["Branches"],
    }),
    getAllBranches: builder.query<GetAllBranchesResponse, GetAllBranchesArgs>({
      query: ({ limit, offset, sort = "id", order = "desc", branchId }) => ({
        url: "/branch/getAllBranch",
        params: {
          limit,
          offset,
          sort,
          order,
          ...(branchId != null && Number.isFinite(branchId) ? { branchId } : {}),
        },
      }),
      providesTags: ["Branches"],
    }),
    getModulesForBranchSetup: builder.query<GetModulesForBranchSetupResponse, void>({
      query: () => "/branch/getModulesForBranchSetup",
    }),
    getBranchListByType: builder.query<GetBranchListByTypeResponse, GetBranchListByTypeArgs>({
      query: ({ branchType }) => ({
        url: "/branch/getBranchListByType",
        params: { branchType },
      }),
    }),
    getModulesWithBranchMapping: builder.query<GetModulesWithBranchMappingResponse, number>({
      query: (branchId) => ({
        url: "/branch/getModulesWithBranchMapping",
        params: { branchId },
      }),
    }),
    assignModulesToBranch: builder.mutation<AssignModulesToBranchResponse, AssignModulesToBranchBody>({
      query: (body) => ({
        url: "/branch/AssignModulesToBranch",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Branches"],
    }),
    createBranch: builder.mutation<CreateBranchApiResponse, FormData>({
      /** Body: multipart FormData. Root field `labTestSource`: `chandan_api` | `manual`. */
      query: (body) => ({
        url: "/branch/createBranch",
        method: "POST",
        body,
        prepareHeaders: (headers: Headers) => {
          headers.delete("Content-Type");
          return headers;
        },
      }),
      invalidatesTags: ["Branches"],
    }),
    createBuilding: builder.mutation<CreateBuildingResponse, CreateBuildingArgs>({
      query: (body) => ({
        url: "/building/createBuilding",
        method: "POST",
        body,
      }),
      invalidatesTags: (_res, _err, arg) => [
        "Branches",
        { type: "BranchRooms" as const, id: String(arg.branchId) },
      ],
    }),
    getAllFloors: builder.query<GetAllFloorsResponse, void>({
      query: () => "/floor/getAllFloor",
    }),
    getBuildingsByBranch: builder.query<GetBuildingsByBranchResponse, number>({
      query: (branchId) => `/building/getBuildingsByBranch/${branchId}`,
      providesTags: ["Branches"],
    }),
    getAllRoomsByBranch: builder.query<GetAllRoomsByBranchResponse, GetAllRoomsByBranchQueryArgs>({
      query: ({ branchId, page = 1, limit = 10, search, buildingId, roomtypeId, roomCurrentStatus }) => {
        const params: Record<string, string | number> = { page, limit };
        const s = search != null ? String(search).trim() : "";
        if (s !== "") params.search = s;
        if (buildingId != null && buildingId !== "" && buildingId !== "all") {
          params.buildingId = buildingId;
        }
        if (roomtypeId != null && roomtypeId !== "" && roomtypeId !== "all") {
          params.roomtypeId = roomtypeId;
        }
        if (
          roomCurrentStatus != null &&
          roomCurrentStatus !== "" &&
          roomCurrentStatus !== "all"
        ) {
          params.roomCurrentStatus = roomCurrentStatus;
        }
        return { url: `/room/getAllRooms/${branchId}`, params };
      },
      providesTags: (_res, _err, arg) => [{ type: "BranchRooms" as const, id: String(arg.branchId) }],
    }),
    createFloor: builder.mutation<CreateFloorResponse, CreateFloorArgs>({
      query: (body) => ({
        url: "/floor/createFloor",
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, arg) => [
        "Branches",
        { type: "BranchRooms" as const, id: String(arg.branchId) },
      ],
    }),
    updateBuilding: builder.mutation<UpdateBuildingMutationResponse, UpdateBuildingArgs>({
      query: ({ buildingId, name }) => ({
        url: `/building/updateBuilding/${buildingId}`,
        method: "PATCH",
        body: { name },
      }),
      invalidatesTags: (_r, _e, arg) => [
        "Branches",
        { type: "BranchRooms" as const, id: String(arg.branchId) },
      ],
    }),
    deleteBuilding: builder.mutation<DeleteBuildingMutationResponse, DeleteBuildingArgs>({
      query: ({ buildingId }) => ({
        url: `/building/deleteBuilding/${buildingId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, arg) => [
        "Branches",
        { type: "BranchRooms" as const, id: String(arg.branchId) },
      ],
    }),
    updateFloorMapping: builder.mutation<UpdateFloorMappingResponse, UpdateFloorMappingArgs>({
      query: ({ branchId, buildingId, floorMappingId, newMasterFloorId }) => ({
        url: `/floor/updateFloor/${branchId}/${buildingId}/${floorMappingId}`,
        method: "PATCH",
        body: { floorId: newMasterFloorId },
      }),
      invalidatesTags: (_r, _e, arg) => [
        "Branches",
        { type: "BranchRooms" as const, id: String(arg.branchId) },
      ],
    }),
    deleteFloor: builder.mutation<DeleteFloorMappingResponse, DeleteFloorMappingArgs>({
      query: ({ branchId, buildingId, floorMappingId }) => ({
        url: `/floor/deleteFloor/${branchId}/${buildingId}/${floorMappingId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, arg) => [
        "Branches",
        { type: "BranchRooms" as const, id: String(arg.branchId) },
      ],
    }),
    getBranchHardwareFacilityByType: builder.query<
      GetBranchHardwareFacilityByTypeResponse,
      { branchId: number; type: BranchHardwareFacilityKind }
    >({
      query: ({ branchId, type }) => ({
        url: `/branch-hardware-facility/getBranchHardwareFacilityByType/${branchId}`,
        params: { type },
      }),
      providesTags: (_res, _err, arg) => [
        { type: "BranchHardwareFacility" as const, id: `${arg.branchId}-${arg.type}` },
      ],
    }),
    createBranchHardwareFacility: builder.mutation<
      CreateBranchHardwareFacilityResponse,
      CreateBranchHardwareFacilityArgs
    >({
      query: (body) => ({
        url: "/branch-hardware-facility/createBranchHardwareFacility",
        method: "POST",
        body,
      }),
      invalidatesTags: (_res, _err, arg) => {
        const first = arg.branchHardwareFacilities[0];
        return [
          "Branches",
          ...(first != null
            ? [{ type: "BranchHardwareFacility" as const, id: `${first.branchId}-${first.type}` }]
            : []),
        ];
      },
    }),
    deleteBranchHardwareFacility: builder.mutation<
      DeleteBranchHardwareFacilityResponse,
      { id: number; branchId: number; type: BranchHardwareFacilityKind }
    >({
      query: ({ id }) => ({
        url: `/branch-hardware-facility/deleteBranchHardwareFacility/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_res, _err, arg) => [
        "Branches",
        { type: "BranchHardwareFacility" as const, id: `${arg.branchId}-${arg.type}` },
      ],
    }),
    getBranchRoomTypesByBranch: builder.query<GetBranchRoomTypesByBranchResponse, number>({
      query: (branchId) => `/branch-room-type/getBranchRoomTypeByBranchId/${branchId}`,
      providesTags: (_res, _err, branchId) => [{ type: "BranchRoomType" as const, id: String(branchId) }],
    }),
    createBranchRoomType: builder.mutation<CreateBranchRoomTypeResponse, CreateBranchRoomTypeArgs>({
      query: (body) => ({
        url: "/branch-room-type/createBranchRoomType",
        method: "POST",
        body,
      }),
      invalidatesTags: (_res, _err, arg) => {
        const branchId = arg.branchRoomTypes[0]?.branchId;
        return [
          "Branches",
          ...(branchId != null ? [{ type: "BranchRoomType" as const, id: String(branchId) }] : []),
        ];
      },
    }),
    deleteBranchRoomType: builder.mutation<DeleteBranchRoomTypeResponse, { id: number; branchId: number }>({
      query: ({ id }) => ({
        url: `/branch-room-type/deleteBranchRoomType/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_res, _err, arg) => [
        "Branches",
        { type: "BranchRoomType" as const, id: String(arg.branchId) },
      ],
    }),
    createRooms: builder.mutation<CreateRoomsResponse, CreateRoomsRequestBody>({
      query: (body) => ({
        url: "/room/createRoom",
        method: "POST",
        body,
      }),
      invalidatesTags: (_res, _err, arg) => {
        const tags: Array<"Branches" | { type: "BranchRooms"; id: string }> = ["Branches"];
        const bid = arg.rooms[0]?.branchId;
        if (bid != null) tags.push({ type: "BranchRooms", id: String(bid) });
        return tags;
      },
    }),
    getSingleRoom: builder.query<GetSingleRoomResponse, number>({
      query: (roomId) => `/room/getSingleRoom/${roomId}`,
      providesTags: (_res, _err, roomId) => [{ type: "BranchRooms" as const, id: `detail-${roomId}` }],
    }),
    updateRoom: builder.mutation<
      UpdateRoomResponse,
      { roomId: number; branchId: number; body: UpdateRoomPayload }
    >({
      query: ({ roomId, body }) => ({
        url: `/room/updateRoom/${roomId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_res, _err, arg) => [
        "Branches",
        { type: "BranchRooms", id: String(arg.branchId) },
        { type: "BranchRooms", id: `detail-${arg.roomId}` },
      ],
    }),
    deleteRoom: builder.mutation<DeleteRoomResponse, { roomId: number; branchId: number }>({
      query: ({ roomId }) => ({
        url: `/room/deleteRoom/${roomId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_res, _err, arg) => [
        "Branches",
        { type: "BranchRooms", id: String(arg.branchId) },
        { type: "BranchRooms", id: `detail-${arg.roomId}` },
      ],
    }),
    getAllBeds: builder.query<GetAllBedsResponse, GetAllBedsQueryArgs>({
      query: ({ branchId, floorId, roomId, page = 1, limit = 10 }) => ({
        url: `/bed/getAllBeds/${branchId}/${floorId}/${roomId}`,
        params: { page, limit },
      }),
      providesTags: (_res, _err, arg) => [
        {
          type: "BranchBeds" as const,
          id: `${arg.branchId}-${arg.floorId}-${arg.roomId}`,
        },
      ],
    }),
    createBeds: builder.mutation<CreateBedsResponse, CreateBedsRequestBody>({
      query: (body) => ({
        url: "/bed/createBed",
        method: "POST",
        body,
      }),
      invalidatesTags: (_res, _err, arg) => {
        const tags: Array<
          "Branches" | { type: "BranchRooms"; id: string } | { type: "BranchBeds"; id: string }
        > = ["Branches"];
        const first = arg.beds[0];
        if (first != null) {
          tags.push({ type: "BranchRooms", id: String(first.branchId) });
          tags.push({
            type: "BranchBeds",
            id: `${first.branchId}-${first.floorId}-${first.roomId}`,
          });
        }
        return tags;
      },
    }),
    deleteBed: builder.mutation<
      DeleteBedResponse,
      { bedId: number; branchId: number; floorId: number; roomId: number }
    >({
      query: ({ bedId }) => ({
        url: `/bed/deleteBed/${bedId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_res, _err, arg) => [
        "Branches",
        { type: "BranchRooms", id: String(arg.branchId) },
        {
          type: "BranchBeds",
          id: `${arg.branchId}-${arg.floorId}-${arg.roomId}`,
        },
      ],
    }),
    updateBed: builder.mutation<
      UpdateBedResponse,
      {
        bedId: number;
        branchId: number;
        floorId: number;
        roomId: number;
        body: UpdateBedPayload;
      }
    >({
      query: ({ bedId, body }) => ({
        url: `/bed/updateBed/${bedId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_res, _err, arg) => [
        "Branches",
        { type: "BranchRooms", id: String(arg.branchId) },
        {
          type: "BranchBeds",
          id: `${arg.branchId}-${arg.floorId}-${arg.roomId}`,
        },
      ],
    }),
    getBranchServicesByBranchId: builder.query<GetBranchServicesByBranchIdResponse, number>({
      query: (branchId) => `/branch-services/getBranchServicesByBranchId/${branchId}`,
      providesTags: (_res, _err, branchId) => [{ type: "BranchServices" as const, id: String(branchId) }],
    }),
    createBranchService: builder.mutation<CreateBranchServiceResponse, CreateBranchServiceBody>({
      query: (body) => ({
        url: "/branch-services/createBranchService",
        method: "POST",
        body,
      }),
      invalidatesTags: (_res, _err, arg) => [{ type: "BranchServices", id: String(arg.branchId) }],
    }),
    updateBranchService: builder.mutation<
      UpdateBranchServiceResponse,
      { branchServiceId: number; branchId: number; body: UpdateBranchServiceBody }
    >({
      query: ({ branchServiceId, body }) => ({
        url: `/branch-services/updateBranchService/${branchServiceId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_res, _err, arg) => [{ type: "BranchServices", id: String(arg.branchId) }],
    }),
    deleteBranchService: builder.mutation<
      DeleteBranchServiceResponse,
      { branchServiceId: number; branchId: number }
    >({
      query: ({ branchServiceId }) => ({
        url: `/branch-services/deleteBranchService/${branchServiceId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_res, _err, arg) => [{ type: "BranchServices", id: String(arg.branchId) }],
    }),
  }),
});

export const {
  useGetAllBranchesQuery,
  useGetModulesForBranchSetupQuery,
  useGetBranchListByTypeQuery,
  useGetModulesWithBranchMappingQuery,
  useLazyGetModulesWithBranchMappingQuery,
  useAssignModulesToBranchMutation,
  useGetBranchInsightSummaryQuery,
  useGetBranchHierarchyTreeQuery,
  useGetCompleteBranchHierarchyTreeQuery,
  useCreateBranchMutation,
  useCreateBuildingMutation,
  useGetAllFloorsQuery,
  useCreateFloorMutation,
  useUpdateBuildingMutation,
  useDeleteBuildingMutation,
  useUpdateFloorMappingMutation,
  useDeleteFloorMutation,
  useGetBuildingsByBranchQuery,
  useGetAllRoomsByBranchQuery,
  useGetBranchHardwareFacilityByTypeQuery,
  useCreateBranchHardwareFacilityMutation,
  useDeleteBranchHardwareFacilityMutation,
  useGetBranchRoomTypesByBranchQuery,
  useCreateBranchRoomTypeMutation,
  useDeleteBranchRoomTypeMutation,
  useCreateRoomsMutation,
  useGetSingleRoomQuery,
  useUpdateRoomMutation,
  useDeleteRoomMutation,
  useGetAllBedsQuery,
  useCreateBedsMutation,
  useDeleteBedMutation,
  useUpdateBedMutation,
  useGetBranchServicesByBranchIdQuery,
  useCreateBranchServiceMutation,
  useUpdateBranchServiceMutation,
  useDeleteBranchServiceMutation,
} = branchSetupApi;

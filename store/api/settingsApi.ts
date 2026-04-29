/**
 * Settings API
 * Purpose: Configuration settings API endpoints using RTK Query
 */

import { baseApi } from "./baseApi";
import type { RootState } from "../index";
import { API_BASE_URL } from "@/lib/config/api";
import { getVisitClientIp } from "@/lib/api/clientVisitIp";
import { getUserId, getAuthToken } from "../utils/apiHelpers";

interface ConfigurationResponse {
  success: boolean;
  message: string;
  timestamp: string;
  statusCode: number;
  data?: {
    id: number;
    invoiceLockedDays: number;
    sms: string;
    regCrone: number;
    saleCron: number;
    branchId: number;
  };
}

interface UpdateConfigurationRequest {
  id: number;
  invoiceLockedDays: number;
  sms: string;
  regCrone: number;
  saleCron: number;
  branchId: number;
}

interface UpdateConfigurationResponse {
  success: boolean;
  message: string;
  timestamp: string;
  statusCode: number;
}

interface Branch {
  id: number;
  name: string;
  phoneNumber: string;
  emailAddress: string | null;
  address: string;
  state: string;
  /** e.g. hospital | clinic | daycare */
  type?: string;
  branchCode: string;
  branchStatus: string;
  status: string;
}

interface BranchesResponse {
  success: boolean;
  data: Branch[];
  message: string;
  timestamp: string;
  statusCode: number;
}

/** GET /admin/settings/getBranchRoleByCategoryType */
export interface BranchAssignableRole {
  id: number;
  name: string;
  roleCategoryType: string;
  mainScope: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface GetBranchRoleByCategoryTypeResponse {
  message: string;
  statusCode: number;
  timestamp: string;
  data: BranchAssignableRole[];
}

/** Facility-scoped role lists: generic `facility` or preset slots e.g. `facility_doctor` (doctor form). */
export type FacilityScopedRoleCategoryType =
  | "facility"
  | "facility_doctor"
  | "facility_nurse"
  | "facility_therapist";

export type GetBranchRoleByCategoryTypeParams = {
  roleCategoryType: "corporate" | FacilityScopedRoleCategoryType;
  /** Required when roleCategoryType is facility-like (facility or facility_*) */
  branchId?: number;
  /** From branch `type` (GET /branches): hospital | clinic; daycare maps to hospital */
  branchType?: "hospital" | "clinic";
};

/** GET /admin/settings/getUsers */
export interface SettingsApiUserBranch {
  id: number;
  name: string;
}

export interface SettingsApiUserRole {
  id: number;
  name: string;
  roleCategoryType: string;
  mainScope: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: number | null;
  updatedBy: number | null;
}

export interface SettingsApiUser {
  id: number;
  branchId: number;
  empId: string | null;
  userName: string;
  email: string;
  phone: string;
  ipAddress: string | null;
  lastLogin: string | null;
  loginType: string;
  otp: string | null;
  otpExpire: string | null;
  status: string;
  previousEntryPermission: string | null;
  permissionDate: string | null;
  revenueStatus?: string;
  dutyAdminEmp?: string;
  dialerUsername: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: number | null;
  groupId: number | null;
  roleCategoryType: string | null;
  roleId: number | null;
  role: SettingsApiUserRole | null;
  branch: SettingsApiUserBranch | null;
  /** When API returns extended permission flags on the user row. */
  canDownload?: boolean;
}

export interface GetUsersResponse {
  success: boolean;
  data: SettingsApiUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  message: string;
  timestamp: string;
  statusCode: number;
}

/** API may return either a legacy envelope or a raw user array. */
export type GetUsersApiResponse = SettingsApiUser[] | GetUsersResponse;

export function normalizeGetUsersResponse(
  res: GetUsersApiResponse | undefined
): { rows: SettingsApiUser[]; total: number | null } {
  if (res == null) return { rows: [], total: null };
  if (Array.isArray(res)) return { rows: res, total: null };
  if (typeof res === "object" && "data" in res && Array.isArray((res as GetUsersResponse).data)) {
    const r = res as GetUsersResponse;
    return { rows: r.data, total: typeof r.total === "number" ? r.total : null };
  }
  return { rows: [], total: null };
}

export type GetUsersParams = {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
  branchId?: number;
  /** When set, filters users by facility vs corporate (e.g. `corporate` hides branch-scoped listing). */
  roleCategoryType?: "facility" | "corporate";
};

/** POST /admin/settings/addUser */
export interface AddUserRequest {
  branchId?: number;
  empId: string | null;
  userName: string;
  email: string;
  phone: string;
  groupId?: number;
  loginType: "no-auth" | "ip" | "otp" | "ip-otp";
  status: "active" | "inactive";
  roleId: number;
  roleCategoryType: "facility" | "corporate";
}

export interface AddUserResponse {
  success: boolean;
  data: unknown;
  message: string;
  timestamp: string;
  statusCode: number;
}

/** PUT /admin/settings/users/:id */
export interface UpdateUserResponse {
  success: boolean;
  message: string;
  timestamp: string;
  statusCode: number;
}

export type UpdateUserBody = Partial<{
  userName: string;
  email: string;
  phone: string;
  password: string;
  roleId: number | string;
  loginType: string;
  status: string;
  branchId: number;
  empId: string | null;
  groupId: number | null;
  roleIds: number[];
  roleCategoryType: string;
}>;

/** GET /admin/settings/generateUsersPdf */
export interface GenerateUsersPdfResponse {
  success: boolean;
  data: { url: string; filename: string };
  message: string;
  timestamp: string;
  statusCode: number;
}

interface LabTestApiItem {
  id: number;
  testName: string;
  testDescription: string;
  testFee: number | string;
  tpaPrice: number | string;
  panelPrice: number | string;
  tpaPriceEditedByAdmin: boolean;
  panelPriceEditedByAdmin: boolean;
  groupName: string;
  categoryName: string;
  externalItemId: string;
  status: string;
  tpaStatus: string;
  panelStatus: string;
  createdAt?: string;
  updatedAt?: string;
  created_at?: string;
  updated_at?: string;
  testFeeLastUpdatedAt?: string | null;
  tpaPriceLastUpdatedAt?: string | null;
  panelPriceLastUpdatedAt?: string | null;
}

interface GetLabTestsParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
  group?: string;
  category?: string;
}

interface LabTestGroupsResponse {
  success: boolean;
  data: string[];
  message?: string;
  timestamp?: string;
  statusCode?: number;
}

interface LabTestCategoriesResponse {
  success: boolean;
  data: string[];
  message?: string;
  timestamp?: string;
  statusCode?: number;
}

interface GetLabTestsByBranchParams extends GetLabTestsParams {
  branchId: number;
}

interface LabTestsResponse {
  success: boolean;
  data: LabTestApiItem[];
  message?: string;
  timestamp?: string;
  statusCode?: number;
  total?: number;
  page?: number;
  limit?: number;
}

interface LabTestSingleResponse {
  success: boolean;
  data: LabTestApiItem & { testFee?: number | string };
  message?: string;
  timestamp?: string;
  statusCode?: number;
}

interface UpdateLabTestRequest {
  id: number;
  /** Private tab: main status */
  status?: string;
  /** TPA tab: price and status */
  tpaPrice?: number;
  tpaStatus?: string;
  /** Panel tab: price and status */
  panelPrice?: number;
  panelStatus?: string;
}

interface UpdateLabTestResponse {
  success: boolean;
  data?: LabTestApiItem;
  message?: string;
  timestamp?: string;
  statusCode?: number;
}

interface UpdateLabTestByBranchRequest {
  branchId: number;
  id: number;
  tpaPrice?: number;
  panelPrice?: number;
  status?: string;
  tpaStatus?: string;
  panelStatus?: string;
}

interface UpdateLabTestByBranchResponse {
  success: boolean;
  message?: string;
  timestamp?: string;
  statusCode?: number;
}

interface BranchesWithManualLabTestSourceResponse {
  success: boolean;
  data: Array<{ id: number; name?: string | null }>;
  message?: string;
  timestamp?: string;
  statusCode?: number;
}

export interface CreateLabTestRequest {
  testName: string;
  testDescription: string;
  test_fee: number;
  tpaPrice: number;
  panelPrice: number;
  status: string;
  tpaStatus: string;
  panelStatus: string;
  groupName: string;
  categoryName: string;
  externalItemId: null;
  branchId: number;
}

interface CreateLabTestResponse {
  success: boolean;
  message?: string;
  data?: LabTestApiItem;
  timestamp?: string;
  statusCode?: number;
}

interface BranchIP {
  id: number;
  networkips: string;
  status: string;
  branch: {
    id: number;
    name: string;
    branchCode: string;
  };
}

interface BranchIPsResponse {
  success: boolean;
  data: BranchIP[];
  message: string;
  timestamp: string;
  statusCode: number;
  total?: number;
  page?: number;
  limit?: number;
}

interface GetBranchIPsParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
  branchId?: number;
}

interface CreateBranchIPRequest {
  branchId: number;
  networkips: string;
  status: "active" | "inactive";
}

interface CreateBranchIPResponse {
  success: boolean;
  message: string;
  timestamp: string;
  statusCode: number;
}

interface UpdateBranchIPRequest {
  id: number;
  branchId: number;
  networkips: string;
  status: "active" | "inactive";
}

interface UpdateBranchIPResponse {
  success: boolean;
  message: string;
  timestamp: string;
  statusCode: number;
}

interface Group {
  id: number;
  name: string;
  description: string;
}

interface GroupsResponse {
  success: boolean;
  data: Group[];
  message: string;
  timestamp: string;
  statusCode: number;
  total?: number;
  page?: number;
  limit?: number;
}

interface GetGroupsParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
}

interface CreateGroupRequest {
  name: string;
  description: string;
}

interface CreateGroupResponse {
  success: boolean;
  message: string;
  timestamp: string;
  statusCode: number;
}

interface UpdateGroupRequest {
  id: number;
  name: string;
  description: string;
}

interface UpdateGroupResponse {
  success: boolean;
  message: string;
  timestamp: string;
  statusCode: number;
}

interface DuplicateNumberException {
  id: number;
  branchId: number;
  contactNo: string;
  patientName?: string;
  relationship?: string;
  status?: "PENDING" | "APPROVED" | "REJECTED" | "pending" | "approved" | "rejected";
  requestedBy: number;
  permissionBy: number | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  branch: {
    id: number;
    name: string;
  } | null;
  requestedByUser: {
    id: number;
    userName: string;
  } | null;
  permissionByUser: {
    id: number;
    userName?: string;
    name?: string;
  } | null;
}

interface DuplicateNumberExceptionsResponse {
  success: boolean;
  data: DuplicateNumberException[];
  message: string;
  timestamp: string;
  statusCode: number;
  total?: number;
  page?: number;
  limit?: number;
}

interface GetDuplicateNumberExceptionsParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
  status?: "pending" | "approved" | "rejected";
}

interface CreateDuplicateNumberExceptionRequest {
  branchId: number;
  contactNo: string;
  permissionBy: number;
  addedBy: number;
}

interface CreateDuplicateNumberExceptionResponse {
  success: boolean;
  message: string;
  timestamp: string;
  statusCode: number;
}

interface UpdateDuplicateNumberExceptionRequest {
  id: number;
  contactNo: string;
}

interface UpdateDuplicateNumberExceptionResponse {
  success: boolean;
  message: string;
  timestamp: string;
  statusCode: number;
}

interface ApproveRejectDuplicateNumberExceptionRequest {
  id: number;
  status: "approved" | "rejected";
}

interface ApproveRejectDuplicateNumberExceptionResponse {
  success: boolean;
  message: string;
  timestamp: string;
  statusCode: number;
}

interface ContactUpdate {
  id: number;
  oldContactNo: string;
  newContactNo: string;
  status?: "PENDING" | "APPROVED" | "REJECTED" | "pending" | "approved" | "rejected";
  requestedBy: number;
  approvedBy: number | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  actionAt: string | null;
  branch?: {
    id: number;
    name: string;
  } | null;
  requestedByUser: {
    id: number;
    userName: string;
    email: string;
  } | null;
  approvedByUser: {
    id: number;
    userName?: string;
    name?: string;
    email?: string;
  } | null;
}

interface ContactUpdatesResponse {
  success: boolean;
  data: ContactUpdate[];
  message: string;
  timestamp: string;
  statusCode: number;
  total?: number;
  page?: number;
  limit?: number;
}

interface GetContactUpdatesParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
  status?: "pending" | "approved" | "rejected";
}

interface ApproveRejectContactUpdateRequest {
  id: number;
  status: "approved" | "rejected";
}

interface ApproveRejectContactUpdateResponse {
  success: boolean;
  message: string;
  timestamp: string;
  statusCode: number;
}

// Diet Category Types
interface DietFood {
  id?: number;
  diet: string;
}

interface DietCategory {
  id: number;
  dietCategory: string;
  remark: string;
  status: string;
  createdAt: string;
  dietFoods: {
    id: number;
    diet: string;
    parentId: number;
    remark: string;
    status: string;
    createdAt: string;
  }[];
  totalFoods: number;
}

interface DietCategoriesResponse {
  success: boolean;
  data: DietCategory[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  message: string;
  timestamp: string;
  statusCode: number;
}

interface GetDietCategoriesParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
  branchId?: number;
}

interface CreateDietCategoryRequest {
  dietCategory: string;
  remark: string;
  status: "active" | "inactive";
  dietFoods: DietFood[];
  branchId: number;
}

interface CreateDietCategoryResponse {
  success: boolean;
  message: string;
  timestamp: string;
  statusCode: number;
}

interface UpdateDietCategoryRequest {
  id: number;
  dietCategory: string;
  remark: string;
  status: "active" | "inactive";
  dietFoods: DietFood[];
  branchId: number;
}

interface UpdateDietCategoryResponse {
  success: boolean;
  message: string;
  timestamp: string;
  statusCode: number;
}

// Diagnosis Categories Main Types
interface DiagnosisCategoryMain {
  id: number;
  name: string;
  parentId: number;
  status: string;
  type: string;
  sort: number;
}

interface DiagnosisCategoriesMainResponse {
  success: boolean;
  data: DiagnosisCategoryMain[];
  message: string;
  timestamp: string;
  statusCode: number;
}

// Diagnosis Diet Types
interface DiagnosisDietItem {
  id: number;
  diagnosisId: number;
  diagnosisName: string;
  dietSchedule: string;
  dietDetail: number[];
  instructions: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

interface DiagnosisDietsResponse {
  success: boolean;
  data: DiagnosisDietItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  message: string;
  timestamp: string;
  statusCode: number;
}

interface GetDiagnosisDietsParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
  branchId?: number;
}

interface CreateDiagnosisDietRequest {
  diagnosisId: number;
  diagnosisName: string;
  dietSchedule: string;
  dietDetail: number[];
  instructions: string;
  status: "active" | "inactive";
  branchId: number;
}

interface CreateDiagnosisDietResponse {
  success: boolean;
  message: string;
  timestamp: string;
  statusCode: number;
}

interface UpdateDiagnosisDietRequest {
  id: number;
  dietDetail: number[];
  instructions: string;
  branchId: number;
}

interface UpdateDiagnosisDietResponse {
  success: boolean;
  message: string;
  timestamp: string;
  statusCode: number;
}

interface DeleteDiagnosisDietRequest {
  id: number;
  branchId: number;
}

interface DeleteDiagnosisDietResponse {
  success: boolean;
  message: string;
  timestamp: string;
  statusCode: number;
}

interface DeleteDietCategoryRequest {
  id: number;
  branchId: number;
}

interface DeleteDietCategoryResponse {
  success: boolean;
  message: string;
  timestamp: string;
  statusCode: number;
}

interface CreateDiscountConfigRequest {
  branchId: number;
  levelOneUserId: number;
  levelTwoUserId: number;
  createdBy: number;
}

interface CreateDiscountConfigResponse {
  success: boolean;
  message: string;
  timestamp: string;
  statusCode: number;
}

interface UpdateDiscountConfigRequest {
  id: number;
  branchId: number;
  levelOneUserId: number;
  levelTwoUserId: number;
  updatedBy: number;
}

interface UpdateDiscountConfigResponse {
  success: boolean;
  message: string;
  timestamp: string;
  statusCode: number;
}

interface Panel {
  id: number;
  name: string;
  status: "active" | "inactive" | "Active" | "Inactive";
  isDefaultPanel?: boolean;
}

interface GetPanelsParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
  branchId?: number;
}

interface PanelsResponse {
  success: boolean;
  data: Panel[];
  message: string;
  timestamp: string;
  statusCode: number;
  total?: number;
  page?: number;
  limit?: number;
}

interface CreatePanelRequest {
  name: string;
  status: "active" | "inactive";
  branchId: number;
}

interface CreatePanelResponse {
  success: boolean;
  message: string;
  timestamp: string;
  statusCode: number;
}

interface UpdatePanelRequest {
  id: number;
  name: string;
  status: "active" | "inactive";
  branchId: number;
}

interface UpdatePanelResponse {
  success: boolean;
  data: {
    id: number;
    name: string;
    status: "active" | "inactive";
  };
  message: string;
  timestamp: string;
  statusCode: number;
}

interface DeletePanelResponse {
  success: boolean;
  message: string;
  timestamp?: string;
  statusCode?: number;
}

export type HardwareFacilitiesType = "hardware" | "facility";

interface HardwareFacilitiesItem {
  id: number;
  name: string;
  description?: string | null;
  hardwareFacilitiesType: HardwareFacilitiesType;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: number | null;
  updatedBy?: number | null;
  deletedBy?: number | null;
  deletedAt?: string | null;
}

export interface GetHardwareOrFacilitiesParams {
  type: HardwareFacilitiesType;
  page?: number;
  limit?: number;
  search?: string;
}

interface HardwareOrFacilitiesListResponse {
  success: boolean;
  data: HardwareFacilitiesItem[];
  message: string;
  timestamp?: string;
  statusCode?: number;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

interface CreateHardwareOrFacilitiesRequest {
  name: string;
  hardwareFacilitiesType: HardwareFacilitiesType;
}

interface CreateHardwareOrFacilitiesResponse {
  success: boolean;
  data?: HardwareFacilitiesItem;
  message: string;
  timestamp?: string;
  statusCode?: number;
}

interface UpdateHardwareOrFacilitiesRequest {
  id: number;
  name: string;
  hardwareFacilitiesType: HardwareFacilitiesType;
}

interface UpdateHardwareOrFacilitiesResponse {
  success: boolean;
  data?: HardwareFacilitiesItem;
  message: string;
  timestamp?: string;
  statusCode?: number;
}

interface DeleteHardwareOrFacilitiesResponse {
  success: boolean;
  data?: string;
  message: string;
  timestamp?: string;
  statusCode?: number;
}

interface GetHardwareOrFacilitiesByIdResponse {
  success: boolean;
  data?: HardwareFacilitiesItem;
  message: string;
  timestamp?: string;
  statusCode?: number;
}

interface RoomTypeItem {
  id: number;
  roomType: string;
  roomTypeCode: string;
  roomNumberPrefix: string;
  isRented: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: number | null;
  updatedBy?: number | null;
  deletedBy?: number | null;
  deletedAt?: string | null;
}

interface GetAllRoomTypesParams {
  page?: number;
  limit?: number;
  search?: string;
}

interface GetAllRoomTypesResponse {
  success: boolean;
  data: RoomTypeItem[];
  message: string;
  timestamp?: string;
  statusCode?: number;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

interface CreateRoomTypeRequest {
  roomType: string;
  roomTypeCode: string;
  roomNumberPrefix: string;
  isRented: boolean;
}

interface CreateRoomTypeResponse {
  success: boolean;
  data?: RoomTypeItem;
  message: string;
  timestamp?: string;
  statusCode?: number;
}

interface UpdateRoomTypeRequest {
  id: number;
  roomType?: string;
  roomTypeCode?: string;
  roomNumberPrefix?: string;
  isRented?: boolean;
}

interface UpdateRoomTypeResponse {
  success: boolean;
  data?: RoomTypeItem;
  message: string;
  timestamp?: string;
  statusCode?: number;
}

interface DeleteRoomTypeResponse {
  success: boolean;
  data?: null;
  message: string;
  timestamp?: string;
  statusCode?: number;
}

export interface MasterServiceItem {
  id: number;
  category: string;
  subCategory: string;
  price: number;
  status: boolean;
  createdBy?: number | null;
  updatedBy?: number | null;
  deletedBy?: number | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

interface GetAllMasterServicesParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  subCategory?: string;
}

export interface GetAllMasterServicesResponse {
  success: boolean;
  data: MasterServiceItem[];
  message: string;
  timestamp?: string;
  statusCode?: number;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

interface CreateMasterServiceRequest {
  category: string;
  subCategory: string;
  price: number;
}

interface CreateMasterServiceResponse {
  success: boolean;
  data?: MasterServiceItem;
  message: string;
  timestamp?: string;
  statusCode?: number;
}

interface DiagnosisCategory {
  id: number;
  name: string;
  diagnosisCategory: string;
  parentId: number;
  status: "active" | "inactive" | "Active" | "Inactive";
  type: string;
  sort: number;
}

interface GetDiagnosisCategoriesOnlyParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
}

interface DiagnosisCategoriesOnlyResponse {
  success: boolean;
  data: DiagnosisCategory[];
  message: string;
  timestamp: string;
  statusCode: number;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

interface SubDiagnosisItem {
  id: number;
  name: string;
  parentId: number;
  status: "active" | "inactive";
  type: string;
  sort: number;
}

interface DiagnosisCategoryWithSubs {
  id: number;
  diagnosisCategory: string;
  status: "active" | "inactive";
  type: string;
  sort: number | null;
  subDiagnoses: SubDiagnosisItem[];
  totalSubDiagnoses: number;
}

interface GetDiagnosisCategoriesParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
}

interface DiagnosisCategoriesResponse {
  success: boolean;
  data: DiagnosisCategoryWithSubs[];
  message: string;
  timestamp: string;
  statusCode: number;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

interface CreateSubDiagnosisRequest {
  parentId: number;
  subDiagnoses: Array<{ name: string }>;
}

interface CreateSubDiagnosisResponse {
  success: boolean;
  message: string;
  timestamp: string;
  statusCode: number;
}

interface UpdateSubDiagnosisRequest {
  id: number;
  diagnosisCategory: string;
  status: "active" | "inactive";
  type: string;
  sort: number;
  subDiagnoses: Array<{ id?: number; name: string }>;
}

interface UpdateSubDiagnosisResponse {
  success: boolean;
  message: string;
  timestamp: string;
  statusCode: number;
}

interface CreateDiagnosisCategoryRequest {
  diagnosisCategory: string;
  status: "active" | "inactive";
  type: string;
}

interface CreateDiagnosisCategoryResponse {
  success: boolean;
  message: string;
  timestamp: string;
  statusCode: number;
}

interface UpdateDiagnosisCategoryRequest {
  id: number;
  diagnosisCategory: string;
  status: "active" | "inactive";
  type: string;
}

interface UpdateDiagnosisCategoryResponse {
  success: boolean;
  message: string;
  timestamp: string;
  statusCode: number;
}

// Arogya / Health Card types
interface GetArogyaCardsParams {
  page?: number;
  limit?: number;
  search?: string;
  branchId?: number;
}

export interface ArogyaBranchRule {
  id?: number;
  arogyaCardId?: number;
  branchId: number;
  consultantBy: number;
  productBy: number;
  serviceBy: number;
  pathologyBy: number;
  radiologyBy?: number;
  fibroscanBy?: number;
  consultantTo: number;
  productTo: number;
  serviceTo: number;
  pathologyTo: number;
  radiologyTo?: number;
  fibroscanTo?: number;
  consultantRedeem: number;
  consultantRedeemType: number;
  productRedeem: number;
  productRedeemType: number;
  serviceRedeem: number;
  serviceRedeemType: number;
  pathologyRedeem: number;
  pathologyRedeemType: number;
  radiologyRedeem?: number;
  radiologyRedeemType?: number;
  fibroscanRedeem?: number;
  fibroscanRedeemType?: number;
  status?: number;
  addedBy?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ArogyaCard {
  id: number;
  cardName: string;
  cardType: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  pointValuation: string;
  seriesStart: number;
  seriesEnd: number;
  arogyaBranchRule: ArogyaBranchRule | null;
}

interface ArogyaCardsResponse {
  success: boolean;
  data: ArogyaCard[];
  message: string;
  timestamp: string;
  statusCode: number;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

interface ArogyaBranchRulePayload {
  branchId: number;
  addedBy?: number;
  consultantBy?: number;
  consultantTo?: number;
  productBy?: number;
  productTo?: number;
  serviceBy?: number;
  serviceTo?: number;
  pathologyBy?: number;
  pathologyTo?: number;
  radiologyBy?: number;
  radiologyTo?: number;
  fibroscanBy?: number;
  fibroscanTo?: number;
  consultantRedeem?: number;
  consultantRedeemType?: number;
  productRedeem?: number;
  productRedeemType?: number;
  serviceRedeem?: number;
  serviceRedeemType?: number;
  pathologyRedeem?: number;
  pathologyRedeemType?: number;
  radiologyRedeem?: number;
  radiologyRedeemType?: number;
  fibroscanRedeem?: number;
  fibroscanRedeemType?: number;
}

interface CreateArogyaCardRequest {
  cardName: string;
  cardType: string;
  description?: string;
  pointValuation: number;
  seriesStart: string;
  seriesEnd: string;
  status: string;
  branchRule: ArogyaBranchRulePayload;
}

interface CreateArogyaCardResponse {
  success: boolean;
  data?: ArogyaCard;
  message: string;
  timestamp: string;
  statusCode: number;
}

interface UpdateArogyaCardRequest {
  id: number;
  cardName?: string;
  pointValuation?: number;
  seriesStart?: number | string;
  seriesEnd?: number | string;
  status?: string;
  branchRule: Partial<ArogyaBranchRulePayload>;
}

interface UpdateArogyaCardResponse {
  success: boolean;
  data?: null;
  message: string;
  timestamp: string;
  statusCode: number;
}

interface Therapy {
  id: number;
  medicineName: string;
  price: string;
  productCode: string;
  hsnCode: string;
  category: string;
  status: "active" | "inactive";
  tpaPrice?: number | string;
  panelPrice?: number | string;
  tpaStatus?: "active" | "inactive";
  panelStatus?: "active" | "inactive";
  createdAt: string;
  branches?: { id: number; name: string }[];
}

interface GetTherapiesParams {
  branchId?: number;
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
}

interface TherapiesResponse {
  success: boolean;
  data: Therapy[];
  message: string;
  timestamp: string;
  statusCode: number;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

interface CreateTherapyRequest {
  branchIds: number[];
  medicineName: string;
  price: string;
  productCode: string;
  hsnCode: string;
  category: string;
  status: "active" | "inactive";
  tpaPrice?: string;
  panelPrice?: string;
  tpaStatus?: "active" | "inactive";
  panelStatus?: "active" | "inactive";
}

interface CreateTherapyResponse {
  success: boolean;
  message: string;
  timestamp: string;
  statusCode: number;
}

interface UpdateTherapyRequest {
  id: number;
  branchIds?: number[]; // optional; needed if update only specific branch
  medicineName?: string;
  productCode?: string;
  hsnCode?: string;
  category?: string;
  price?: string;
  panelPrice?: string;
  tpaPrice?: string;
  status?: "active" | "inactive";
  panelStatus?: "active" | "inactive";
  tpaStatus?: "active" | "inactive";
}

interface UpdateTherapyResponse {
  success: boolean;
  data: {
    id: number;
    branchId: number;
    medicineName: string;
    price: string;
    productCode: string;
    hsnCode: string;
    category: string;
    status: "active" | "inactive";
    createdAt: string;
  };
  message: string;
  timestamp: string;
  statusCode: number;
}

interface TpaTherapy {
  id: number;
  therapyId: number;
  medicineName: string;
  price: string;
  productCode: string;
  hsnCode: string;
  category: string;
  status: "active" | "inactive";
  createdAt: string;
  therapy?: {
    id: number;
    medicineName: string;
    productCode: string;
  };
}

interface GetTpaTherapiesParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
}

interface TpaTherapiesResponse {
  success: boolean;
  data: TpaTherapy[];
  message: string;
  timestamp: string;
  statusCode: number;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

interface CreateTpaTherapyRequest {
  therapyId: number;
  medicineName: string;
  price: number | string;
  productCode: string;
  hsnCode: string;
  category: string;
  status: "active" | "inactive";
}

interface CreateTpaTherapyResponse {
  success: boolean;
  message: string;
  timestamp: string;
  statusCode: number;
}

interface UpdateTpaTherapyRequest {
  id: number;
  therapyId: number;
  medicineName: string;
  price: number | string;
  productCode: string;
  hsnCode: string;
  category: string;
  status?: "active" | "inactive";
}

interface UpdateTpaTherapyResponse {
  success: boolean;
  message: string;
  timestamp: string;
  statusCode: number;
}

interface RefundConfig {
  id: number;
  branchId: number;
  userId: number;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  updatedBy: number;
  branch: {
    id: number;
    name: string;
  };
  user: {
    id: number;
    name: string;
    email: string;
  };
}

interface GetRefundConfigsParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
  branchId?: number;
}

interface RefundConfigsResponse {
  success: boolean;
  data: RefundConfig[];
  message: string;
  timestamp: string;
  statusCode: number;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

interface CreateRefundConfigRequest {
  branchId: number;
  userId: number;
  createdBy: number;
}

interface CreateRefundConfigResponse {
  success: boolean;
  message: string;
  timestamp: string;
  statusCode: number;
}

interface UpdateRefundConfigRequest {
  id: number;
  branchId: number;
  userId: number;
  updatedBy: number;
}

interface UpdateRefundConfigResponse {
  success: boolean;
  message: string;
  timestamp: string;
  statusCode: number;
}

interface DiscountConfig {
  id: number;
  branchId: number;
  levelOneUserId: number;
  levelTwoUserId: number;
  createdBy: number;
  createdAt?: string;
  updatedAt?: string;
  branch?: {
    id: number;
    name: string;
    phoneNumber?: string;
    emailAddress?: string | null;
    address?: string;
    state?: string;
    branchCode?: string;
    branchStatus?: string;
    status?: string;
    [key: string]: any; // Allow other branch properties
  };
  levelOneUser?: {
    id: number;
    name: string;
    email: string;
    branchId?: number;
    empId?: string | null;
    phone?: string;
    status?: string;
    [key: string]: any; // Allow other user properties
  };
  levelTwoUser?: {
    id: number;
    name: string;
    email: string;
    branchId?: number;
    empId?: string | null;
    phone?: string;
    status?: string;
    [key: string]: any; // Allow other user properties
  };
}

interface GetDiscountConfigsParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
  branchId?: number | number[];
}

interface DiscountConfigsResponse {
  success: boolean;
  data: DiscountConfig[];
  message: string;
  timestamp: string;
  statusCode: number;
  total?: number;
  page?: number;
  limit?: number;
}

interface MasterSettingItem {
  id: number;
  metaKey: string;
  metaValueOne: string;
  metaValueTwo: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

interface GetMasterSettingsResponse {
  success: boolean;
  data: MasterSettingItem[];
  message?: string;
  timestamp?: string;
  statusCode?: number;
}

interface CreateMasterSettingRequest {
  metaKey: string;
  metaValueOne: string;
  metaValueTwo: string;
}

interface MasterSettingMutationResponse {
  success: boolean;
  data: null;
  message?: string;
  timestamp?: string;
  statusCode?: number;
}

interface UpdateMasterSettingRequest {
  id: number;
  metaValueOne: string;
}

export interface SupportContactItem {
  id: number;
  name: string;
  phone: string;
  role: string;
  categoryId: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface SupportCategoryWithContacts {
  id: number;
  title: string;
  description: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  contacts: SupportContactItem[];
}

export interface GetSupportContactsResponse {
  success: boolean;
  data: SupportCategoryWithContacts[];
  message?: string;
  timestamp?: string;
  statusCode?: number;
}

export interface SupportContactLookupCategory {
  id: number;
  title: string;
  description: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface SupportContactLookupItem extends SupportContactItem {
  category?: SupportContactLookupCategory;
}

export interface GetSupportContactByPhoneResponse {
  success: boolean;
  data: SupportContactLookupItem;
  message?: string;
  timestamp?: string;
  statusCode?: number;
}

export interface CreateSupportContactsRequest {
  categoryId: number;
  contacts: Array<{ name: string; phone: string; role: string }>;
}

export interface SupportContactMutationResponse {
  success: boolean;
  data: null;
  message?: string;
  timestamp?: string;
  statusCode?: number;
}

export interface UpdateSupportContactRequest {
  id: number;
  name?: string;
  phone?: string;
  role?: string;
}

export const settingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminSupportContacts: builder.query<GetSupportContactsResponse, void>({
      query: () => ({
        url: "/admin/settings/dashboard/getSupportContacts",
        method: "GET",
      }),
      providesTags: ["Settings"],
    }),
    getSupportContactByPhone: builder.query<GetSupportContactByPhoneResponse, string>({
      query: (phone) => ({
        url: "/admin/settings/dashboard/getSupportContactByphone",
        method: "GET",
        params: { phone },
      }),
    }),
    createSupportContacts: builder.mutation<
      SupportContactMutationResponse,
      CreateSupportContactsRequest
    >({
      query: (body) => ({
        url: "/admin/settings/dashboard/createSupportContacts",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Settings"],
    }),
    updateSupportContact: builder.mutation<
      SupportContactMutationResponse,
      UpdateSupportContactRequest
    >({
      query: ({ id, ...body }) => ({
        url: `/admin/settings/dashboard/updateSupportContacts/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Settings"],
    }),
    getMasterSettings: builder.query<GetMasterSettingsResponse, void>({
      query: () => ({
        url: "/admin/settings/master/getMasterSettings",
        method: "GET",
      }),
      providesTags: ["Settings"],
    }),
    createMasterSetting: builder.mutation<
      MasterSettingMutationResponse,
      CreateMasterSettingRequest
    >({
      query: (body) => ({
        url: "/admin/settings/master/createMasterSetting",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Settings"],
    }),
    updateMasterSetting: builder.mutation<
      MasterSettingMutationResponse,
      UpdateMasterSettingRequest
    >({
      query: ({ id, ...body }) => ({
        url: `/admin/settings/master/updateMasterSetting/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Settings"],
    }),
    getConfiguration: builder.query<ConfigurationResponse, void>({
      query: () => ({
        url: "/admin/settings/configuration",
        method: "GET",
      }),
      providesTags: ["Settings"],
    }),
    updateConfiguration: builder.mutation<
      UpdateConfigurationResponse,
      UpdateConfigurationRequest
    >({
      query: (payload) => ({
        url: "/admin/settings/configuration",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Settings"],
    }),
    updateProfile: builder.mutation<
      { message: string; statusCode: number },
      { userName: string; imgUrl?: File | null }
    >({
      query: ({ userName, imgUrl }) => {
        const formData = new FormData();
        formData.append("userName", userName);
        if (imgUrl) {
          formData.append("imgUrl", imgUrl);
        }
        return {
          url: "/admin/settings/updateProfile",
          method: "PUT",
          body: formData,
        };
      },
    }),
    getBranches: builder.query<BranchesResponse, void>({
      query: () => ({
        url: "/admin/settings/branches",
        method: "GET",
      }),
      providesTags: ["Settings"],
    }),
    getBranchRoleByCategoryType: builder.query<
      GetBranchRoleByCategoryTypeResponse,
      GetBranchRoleByCategoryTypeParams
    >({
      query: ({ roleCategoryType, branchId, branchType }) => {
        const params = new URLSearchParams();
        params.append("roleCategoryType", roleCategoryType);
        const needsBranchScope =
          roleCategoryType === "facility" ||
          roleCategoryType === "facility_doctor" ||
          roleCategoryType === "facility_nurse" ||
          roleCategoryType === "facility_therapist";
        if (needsBranchScope && branchId != null && Number.isFinite(branchId)) {
          params.append("branchId", String(branchId));
        }
        if (needsBranchScope && branchType) {
          params.append("branchType", branchType);
        }
        return {
          url: `/admin/settings/getBranchRoleByCategoryType?${params.toString()}`,
          method: "GET",
        };
      },
      providesTags: ["Settings"],
    }),
    getUsers: builder.query<GetUsersApiResponse, GetUsersParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.page != null) queryParams.append("page", String(params.page));
        if (params?.limit != null) queryParams.append("limit", String(params.limit));
        if (params?.sort) queryParams.append("sort", params.sort);
        if (params?.order) queryParams.append("order", params.order);
        if (params?.search) queryParams.append("search", params.search.trim());
        if (params?.roleCategoryType) {
          queryParams.append("roleCategoryType", params.roleCategoryType);
        }
        if (
          params?.branchId != null &&
          Number.isFinite(params.branchId) &&
          params.roleCategoryType !== "corporate"
        ) {
          queryParams.append("branchId", String(params.branchId));
        }
        const qs = queryParams.toString();
        return {
          url: `/admin/settings/getUsers${qs ? `?${qs}` : ""}`,
          method: "GET",
        };
      },
      providesTags: ["Settings"],
    }),
    addUser: builder.mutation<AddUserResponse, AddUserRequest>({
      query: (body) => ({
        url: "/admin/settings/addUser",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Settings"],
    }),
    updateUser: builder.mutation<UpdateUserResponse, { id: number; body: UpdateUserBody }>({
      query: ({ id, body }) => ({
        url: `/admin/settings/users/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Settings"],
    }),
    generateUsersPdf: builder.query<GenerateUsersPdfResponse, { branchId?: number } | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.branchId != null && Number.isFinite(params.branchId)) {
          queryParams.append("branchId", String(params.branchId));
        }
        const qs = queryParams.toString();
        return {
          url: `/admin/settings/generateUsersPdf${qs ? `?${qs}` : ""}`,
          method: "GET",
        };
      },
    }),
    getLabTestGroups: builder.query<LabTestGroupsResponse, void>({
      query: () => ({
        url: "/admin/settings/lab-tests/groups",
        method: "GET",
      }),
      providesTags: ["Settings"],
    }),
    getLabTestCategories: builder.query<LabTestCategoriesResponse, void>({
      query: () => ({
        url: "/admin/settings/lab-tests/categories",
        method: "GET",
      }),
      providesTags: ["Settings"],
    }),
    getBranchesWithManualLabTestSource: builder.query<BranchesWithManualLabTestSourceResponse, void>({
      query: () => ({
        url: "/admin/settings/lab-tests/getBranchesWithManualLabTestSource",
        method: "GET",
      }),
      providesTags: ["Settings"],
    }),
    getLabTests: builder.query<LabTestsResponse, GetLabTestsParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append("page", params.page.toString());
        if (params?.limit) queryParams.append("limit", params.limit.toString());
        if (params?.sort) queryParams.append("sort", params.sort);
        if (params?.order) queryParams.append("order", params.order);
        if (params?.search) queryParams.append("search", params.search);
        if (params?.group) queryParams.append("group", params.group);
        if (params?.category) queryParams.append("category", params.category);

        const queryString = queryParams.toString();
        return {
          url: `/admin/settings/lab-tests${queryString ? `?${queryString}` : ""}`,
          method: "GET",
        };
      },
      providesTags: ["Settings"],
    }),
    getLabTestsByBranch: builder.query<LabTestsResponse, GetLabTestsByBranchParams>({
      query: ({ branchId, ...params }) => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append("page", params.page.toString());
        if (params?.limit) queryParams.append("limit", params.limit.toString());
        if (params?.sort) queryParams.append("sort", params.sort);
        if (params?.order) queryParams.append("order", params.order);
        if (params?.search) queryParams.append("search", params.search);
        if (params?.group) queryParams.append("group", params.group);
        if (params?.category) queryParams.append("category", params.category);
        queryParams.append("branchId", branchId.toString());

        const queryString = queryParams.toString();
        return {
          url: `/admin/settings/branches/${branchId}/lab-tests${queryString ? `?${queryString}` : ""}`,
          method: "GET",
        };
      },
      providesTags: (_result, _err, { branchId }) => [
        "Settings",
        { type: "Settings", id: `LabTests-Branch-${branchId}` },
      ],
    }),
    getLabTest: builder.query<LabTestSingleResponse, number>({
      query: (id) => ({
        url: `/admin/settings/lab-tests/${id}`,
        method: "GET",
      }),
      providesTags: (_result, _err, id) => [{ type: "Settings", id: `LabTest-${id}` }],
    }),
    updateLabTest: builder.mutation<UpdateLabTestResponse, UpdateLabTestRequest>({
      query: ({ id, ...body }) => ({
        url: `/admin/settings/lab-tests/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Settings"],
    }),
    updateLabTestByBranch: builder.mutation<
      UpdateLabTestByBranchResponse,
      UpdateLabTestByBranchRequest
    >({
      query: ({ branchId, id, ...body }) => ({
        url: `/admin/settings/branches/${branchId}/lab-tests/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Settings"],
    }),
    createLabTest: builder.mutation<CreateLabTestResponse, CreateLabTestRequest>({
      query: (body) => ({
        url: "/admin/settings/lab-tests",
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _err, arg) => [
        "Settings",
        { type: "Settings", id: `LabTests-Branch-${arg.branchId}` },
      ],
    }),
    getBranchIPs: builder.query<BranchIPsResponse, GetBranchIPsParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append("page", params.page.toString());
        if (params?.limit) queryParams.append("limit", params.limit.toString());
        if (params?.sort) queryParams.append("sort", params.sort);
        if (params?.order) queryParams.append("order", params.order);
        if (params?.search) queryParams.append("search", params.search);
        if (params?.branchId != null && Number.isFinite(params.branchId)) {
          queryParams.append("branchId", params.branchId.toString());
        }

        const queryString = queryParams.toString();
        return {
          url: `/admin/settings/branch-ips${queryString ? `?${queryString}` : ""}`,
          method: "GET",
        };
      },
      providesTags: ["Settings"],
    }),
    createBranchIP: builder.mutation<
      CreateBranchIPResponse,
      CreateBranchIPRequest
    >({
      query: (payload) => ({
        url: "/admin/settings/branch-ips",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Settings"],
    }),
    updateBranchIP: builder.mutation<
      UpdateBranchIPResponse,
      UpdateBranchIPRequest
    >({
      query: (payload) => ({
        url: `/admin/settings/branch-ips/${payload.id}`,
        method: "PUT",
        params: {
          branchId: payload.branchId,
        },
        body: {
          networkips: payload.networkips,
          status: payload.status,
        },
      }),
      invalidatesTags: ["Settings"],
    }),
    getGroups: builder.query<GroupsResponse, GetGroupsParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append("page", params.page.toString());
        if (params?.limit) queryParams.append("limit", params.limit.toString());
        if (params?.sort) queryParams.append("sort", params.sort);
        if (params?.order) queryParams.append("order", params.order);
        if (params?.search) queryParams.append("search", params.search);

        const queryString = queryParams.toString();
        return {
          url: `/admin/settings/groups${queryString ? `?${queryString}` : ""}`,
          method: "GET",
        };
      },
      providesTags: ["Settings"],
    }),
    createGroup: builder.mutation<
      CreateGroupResponse,
      CreateGroupRequest
    >({
      query: (payload) => ({
        url: "/admin/settings/group",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Settings"],
    }),
    updateGroup: builder.mutation<
      UpdateGroupResponse,
      UpdateGroupRequest
    >({
      query: (payload) => ({
        url: `/admin/settings/groups/${payload.id}`,
        method: "PUT",
        body: {
          name: payload.name,
          description: payload.description,
        },
      }),
      invalidatesTags: ["Settings"],
    }),
    getDuplicateNumberExceptions: builder.query<DuplicateNumberExceptionsResponse, GetDuplicateNumberExceptionsParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append("page", params.page.toString());
        if (params?.limit) queryParams.append("limit", params.limit.toString());
        if (params?.sort) queryParams.append("sort", params.sort);
        if (params?.order) queryParams.append("order", params.order);
        if (params?.search) queryParams.append("search", params.search);
        if (params?.status) queryParams.append("status", params.status ? params.status.toUpperCase() : params.status);

        const queryString = queryParams.toString();
        return {
          url: `/admin/settings/duplicate-number-permission${queryString ? `?${queryString}` : ""}`,
          method: "GET",
        };
      },
      providesTags: ["Settings"],
    }),
    createDuplicateNumberException: builder.mutation<
      CreateDuplicateNumberExceptionResponse,
      CreateDuplicateNumberExceptionRequest
    >({
      query: (payload) => ({
        url: "/admin/settings/duplicate-number-exception",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Settings"],
    }),
    updateDuplicateNumberException: builder.mutation<
      UpdateDuplicateNumberExceptionResponse,
      UpdateDuplicateNumberExceptionRequest
    >({
      query: (payload) => ({
        url: `/admin/settings/duplicate-number-exception/${payload.id}`,
        method: "PUT",
        body: {
          contactNo: payload.contactNo,
        },
      }),
      invalidatesTags: ["Settings"],
    }),
    approveRejectDuplicateNumberException: builder.mutation<
      ApproveRejectDuplicateNumberExceptionResponse,
      ApproveRejectDuplicateNumberExceptionRequest
    >({
      queryFn: async (payload, api) => {
        const state = api.getState() as RootState;
        
        // Get user ID and token using helper functions
        const userId = getUserId(state);
        const token = getAuthToken(state);
        const visitIp = await getVisitClientIp();
        
        const response = await fetch(`${API_BASE_URL}/admin/settings/duplicate-number-permission/${payload.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer ${token}` : "",
            ...(visitIp ? { "x-forwarded-for": visitIp } : {}),
          },
          body: JSON.stringify({
            status: payload.status ? payload.status.toUpperCase() : payload.status,
            permissionBy: userId,
          }),
        });

        const data = await response.json();
        
        if (response.ok) {
          return { data };
        } else {
          return { error: data };
        }
      },
      invalidatesTags: ["Settings"],
    }),
    getDiscountConfigs: builder.query<DiscountConfigsResponse, GetDiscountConfigsParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append("page", params.page.toString());
        if (params?.limit) queryParams.append("limit", params.limit.toString());
        if (params?.sort) queryParams.append("sort", params.sort);
        if (params?.order) queryParams.append("order", params.order);
        if (params?.search) queryParams.append("search", params.search);
        if (params?.branchId) {
          queryParams.append("branchId", (params.branchId as number).toString());
          // Send branchId whether it's a single number or an array
          // if (Array.isArray(params.branchId) && params.branchId.length >= 1) {
          //   // Send multiple branch IDs as comma-separated string: 2,1,6 or single: 2
          //   const branchIdString = params.branchId.join(",");
          //   queryParams.append("branchId", branchIdString);
          // } else if (!Array.isArray(params.branchId)) {
          //   // Single branch ID as number, send as string
          //   queryParams.append("branchId", params.branchId.toString());
          // }
        }
        console.log(queryParams.toString(), "queryParams");
        const queryString = queryParams.toString();
        return {
          url: `/admin/settings/discount-config${queryString ? `?${queryString}` : ""}`,
          method: "GET",
        };
      },
      providesTags: ["Settings"],
    }),
    createDiscountConfig: builder.mutation<
      CreateDiscountConfigResponse,
      CreateDiscountConfigRequest
    >({
      query: (payload) => ({
        url: "/admin/settings/discount-config",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Settings"],
    }),
    updateDiscountConfig: builder.mutation<
      UpdateDiscountConfigResponse,
      UpdateDiscountConfigRequest
    >({
      query: (payload) => ({
        url: `/admin/settings/discount-config/${payload.id}`,
        method: "PUT",
        body: {
          branchId: payload.branchId,
          levelOneUserId: payload.levelOneUserId,
          levelTwoUserId: payload.levelTwoUserId,
          updatedBy: payload.updatedBy,
        },
      }),
      invalidatesTags: ["Settings"],
    }),
    getPanels: builder.query<PanelsResponse, GetPanelsParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append("page", params.page.toString());
        if (params?.limit) queryParams.append("limit", params.limit.toString());
        if (params?.sort) queryParams.append("sort", params.sort);
        if (params?.order) queryParams.append("order", params.order);
        if (params?.search) queryParams.append("search", params.search);
        if (params?.branchId != null && Number.isFinite(params.branchId)) {
          queryParams.append("branchId", String(params.branchId));
        }

        const queryString = queryParams.toString();
        return {
          url: `/admin/settings/panel${queryString ? `?${queryString}` : ""}`,
          method: "GET",
        };
      },
      providesTags: ["Settings"],
    }),
    createPanel: builder.mutation<
      CreatePanelResponse,
      CreatePanelRequest
    >({
      query: (payload) => ({
        url: "/admin/settings/panel",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Settings"],
    }),
    updatePanel: builder.mutation<
      UpdatePanelResponse,
      UpdatePanelRequest
    >({
      query: (payload) => ({
        url: `/admin/settings/panel/${payload.id}`,
        method: "PUT",
        body: {
          name: payload.name,
          status: payload.status,
          branchId: payload.branchId,
        },
      }),
      invalidatesTags: ["Settings"],
    }),
    deletePanel: builder.mutation<DeletePanelResponse, { id: number }>({
      query: (payload) => ({
        url: `/admin/settings/panel/${payload.id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Settings"],
    }),
    getHardwareOrFacilities: builder.query<
      HardwareOrFacilitiesListResponse,
      GetHardwareOrFacilitiesParams
    >({
      query: (params) => {
        const queryParams = new URLSearchParams();
        queryParams.append("type", params.type);
        if (params.page != null) queryParams.append("page", params.page.toString());
        if (params.limit != null) queryParams.append("limit", params.limit.toString());
        if (params.search) queryParams.append("search", params.search);
        return {
          url: `/admin/settings/hardware-facilities/getHardwareOrFacilities?${queryParams.toString()}`,
          method: "GET",
        };
      },
      providesTags: ["Settings"],
    }),
    getHardwareOrFacilitiesById: builder.query<
      GetHardwareOrFacilitiesByIdResponse,
      { id: number; type: HardwareFacilitiesType }
    >({
      query: ({ id, type }) => ({
        url: `/admin/settings/hardware-facilities/getHardwareOrFacilities/${id}?type=${type}`,
        method: "GET",
      }),
      providesTags: ["Settings"],
    }),
    createHardwareOrFacilities: builder.mutation<
      CreateHardwareOrFacilitiesResponse,
      CreateHardwareOrFacilitiesRequest
    >({
      query: (payload) => ({
        url: "/admin/settings/hardware-facilities/createHardwareOrFacilities",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Settings"],
    }),
    updateHardwareOrFacilities: builder.mutation<
      UpdateHardwareOrFacilitiesResponse,
      UpdateHardwareOrFacilitiesRequest
    >({
      query: (payload) => ({
        url: `/admin/settings/hardware-facilities/updateHardwareOrFacilities/${payload.id}`,
        method: "PATCH",
        body: {
          name: payload.name,
          hardwareFacilitiesType: payload.hardwareFacilitiesType,
        },
      }),
      invalidatesTags: ["Settings"],
    }),
    deleteHardwareOrFacilities: builder.mutation<
      DeleteHardwareOrFacilitiesResponse,
      { id: number }
    >({
      query: (payload) => ({
        url: `/admin/settings/hardware-facilities/deleteHardwareOrFacilities/${payload.id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Settings"],
    }),
    getAllRoomTypes: builder.query<GetAllRoomTypesResponse, GetAllRoomTypesParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.page != null) queryParams.append("page", params.page.toString());
        if (params?.limit != null) queryParams.append("limit", params.limit.toString());
        if (params?.search) queryParams.append("search", params.search);
        const queryString = queryParams.toString();
        return {
          url: `/admin/settings/room-type/getAllRoomTypes${queryString ? `?${queryString}` : ""}`,
          method: "GET",
        };
      },
      providesTags: ["Settings"],
    }),
    createRoomType: builder.mutation<CreateRoomTypeResponse, CreateRoomTypeRequest>({
      query: (payload) => ({
        url: "/admin/settings/room-type/createRoomType",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Settings"],
    }),
    updateRoomType: builder.mutation<UpdateRoomTypeResponse, UpdateRoomTypeRequest>({
      query: (payload) => {
        const { id, ...rest } = payload;
        const body: Record<string, unknown> = {};
        if (rest.roomType !== undefined) body.roomType = rest.roomType;
        if (rest.roomTypeCode !== undefined) body.roomTypeCode = rest.roomTypeCode;
        if (rest.roomNumberPrefix !== undefined) body.roomNumberPrefix = rest.roomNumberPrefix;
        if (rest.isRented !== undefined) body.isRented = rest.isRented;
        return {
          url: `/admin/settings/room-type/updateRoomType/${id}`,
          method: "PATCH",
          body,
        };
      },
      invalidatesTags: ["Settings"],
    }),
    deleteRoomType: builder.mutation<DeleteRoomTypeResponse, { id: number }>({
      query: (payload) => ({
        url: `/admin/settings/room-type/deleteRoomType/${payload.id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Settings"],
    }),
    getAllMasterServices: builder.query<GetAllMasterServicesResponse, GetAllMasterServicesParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.page != null) queryParams.append("page", params.page.toString());
        if (params?.limit != null) queryParams.append("limit", params.limit.toString());
        if (params?.search) queryParams.append("search", params.search);
        if (params?.category) queryParams.append("category", params.category);
        if (params?.subCategory) queryParams.append("subCategory", params.subCategory);
        const queryString = queryParams.toString();
        return {
          url: `/admin/settings/master-service/getAllMasterServices${queryString ? `?${queryString}` : ""}`,
          method: "GET",
        };
      },
      providesTags: ["MasterServices"],
    }),
    createMasterService: builder.mutation<CreateMasterServiceResponse, CreateMasterServiceRequest>({
      query: (payload) => ({
        url: "/admin/settings/master-service/createMasterService",
        method: "POST",
        body: payload,
      }),
    }),
    getDiagnosisCategoriesOnly: builder.query<DiagnosisCategoriesOnlyResponse, GetDiagnosisCategoriesOnlyParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append("page", params.page.toString());
        if (params?.limit) queryParams.append("limit", params.limit.toString());
        if (params?.sort) queryParams.append("sort", params.sort);
        if (params?.order) queryParams.append("order", params.order);
        if (params?.search) queryParams.append("search", params.search);

        const queryString = queryParams.toString();
        return {
          url: `/admin/settings/diagnosis-categories-only${queryString ? `?${queryString}` : ""}`,
          method: "GET",
        };
      },
      providesTags: ["Settings"],
    }),
    getDiagnosisCategories: builder.query<DiagnosisCategoriesResponse, GetDiagnosisCategoriesParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append("page", params.page.toString());
        if (params?.limit) queryParams.append("limit", params.limit.toString());
        if (params?.sort) queryParams.append("sort", params.sort);
        if (params?.order) queryParams.append("order", params.order);
        if (params?.search) queryParams.append("search", params.search);

        const queryString = queryParams.toString();
        return {
          url: `/admin/settings/diagnosis-categories${queryString ? `?${queryString}` : ""}`,
          method: "GET",
        };
      },
      providesTags: ["Settings"],
    }),
    createDiagnosisCategory: builder.mutation<
      CreateDiagnosisCategoryResponse,
      CreateDiagnosisCategoryRequest
    >({
      query: (payload) => ({
        url: "/admin/settings/diagnosis-category",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Settings"],
    }),
    updateDiagnosisCategory: builder.mutation<
      UpdateDiagnosisCategoryResponse,
      UpdateDiagnosisCategoryRequest
    >({
      query: (payload) => ({
        url: `/admin/settings/diagnosis-category/${payload.id}`,
        method: "PATCH",
        body: {
          diagnosisCategory: payload.diagnosisCategory,
          status: payload.status,
          type: payload.type,
        },
      }),
      invalidatesTags: ["Settings"],
    }),
    createSubDiagnosis: builder.mutation<
      CreateSubDiagnosisResponse,
      CreateSubDiagnosisRequest
    >({
      query: (payload) => ({
        url: "/admin/settings/sub-diagnosis",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Settings"],
    }),
    updateSubDiagnosis: builder.mutation<
      UpdateSubDiagnosisResponse,
      UpdateSubDiagnosisRequest
    >({
      query: (payload) => ({
        url: `/admin/settings/diagnosis-category/${payload.id}`,
        method: "PATCH",
        body: {
          diagnosisCategory: payload.diagnosisCategory,
          status: payload.status,
          type: payload.type,
          sort: payload.sort,
          subDiagnoses: payload.subDiagnoses,
        },
      }),
      invalidatesTags: ["Settings"],
    }),
    getTherapies: builder.query<TherapiesResponse, GetTherapiesParams | void>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.branchId != null) searchParams?.set("branchId", String(params.branchId));
        if (params?.page != null) searchParams?.set("page", String(params.page));
        if (params?.limit != null) searchParams?.set("limit", String(params.limit));
        if (params?.sort) searchParams?.set("sort", params.sort);
        if (params?.order) searchParams?.set("order", params.order);
        if (params?.search) searchParams?.set("search", params.search);
        const queryString = searchParams?.toString();
        return {
          url: `/admin/settings/therapy${queryString ? `?${queryString}` : ""}`,
          method: "GET",
        };
      },
      providesTags: ["Settings"],
    }),
    createTherapy: builder.mutation<
      CreateTherapyResponse,
      CreateTherapyRequest
    >({
      query: (payload) => ({
        url: "/admin/settings/therapy",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Settings"],
    }),
    updateTherapy: builder.mutation<
      UpdateTherapyResponse,
      UpdateTherapyRequest
    >({
      query: (payload) => {
        const { id, ...rest } = payload;
        const body: Record<string, unknown> = {};
        if (rest.branchIds != null) body.branchIds = rest.branchIds;
        if (rest.medicineName != null) body.medicineName = rest.medicineName;
        if (rest.productCode != null) body.productCode = rest.productCode;
        if (rest.hsnCode != null) body.hsnCode = rest.hsnCode;
        if (rest.category != null) body.category = rest.category;
        if (rest.price != null) body.price = rest.price;
        if (rest.panelPrice != null) body.panelPrice = rest.panelPrice;
        if (rest.tpaPrice != null) body.tpaPrice = rest.tpaPrice;
        if (rest.status != null) body.status = rest.status;
        if (rest.panelStatus != null) body.panelStatus = rest.panelStatus;
        if (rest.tpaStatus != null) body.tpaStatus = rest.tpaStatus;
        return {
          url: `/admin/settings/therapy/${id}`,
          method: "PUT",
          body,
        };
      },
      invalidatesTags: ["Settings"],
    }),
    getTpaTherapies: builder.query<TpaTherapiesResponse, GetTpaTherapiesParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append("page", params.page.toString());
        if (params?.limit) queryParams.append("limit", params.limit.toString());
        if (params?.sort) queryParams.append("sort", params.sort);
        if (params?.order) queryParams.append("order", params.order);
        if (params?.search) queryParams.append("search", params.search);

        const queryString = queryParams.toString();
        return {
          url: `/admin/settings/tpa-therapy${queryString ? `?${queryString}` : ""}`,
          method: "GET",
        };
      },
      providesTags: ["Settings"],
    }),
    createTpaTherapy: builder.mutation<
      CreateTpaTherapyResponse,
      CreateTpaTherapyRequest
    >({
      query: (payload) => ({
        url: "/admin/settings/tpa-therapy",
        method: "POST",
        body: {
          therapyId: payload.therapyId,
          medicineName: payload.medicineName,
          price: typeof payload.price === "string" ? parseFloat(payload.price) : payload.price,
          productCode: payload.productCode,
          hsnCode: payload.hsnCode,
          category: payload.category,
          status: payload.status,
        },
      }),
      invalidatesTags: ["Settings"],
    }),
    updateTpaTherapy: builder.mutation<
      UpdateTpaTherapyResponse,
      UpdateTpaTherapyRequest
    >({
      query: (payload) => ({
        url: `/admin/settings/tpa-therapy/${payload.id}`,
        method: "PUT",
        body: {
          therapyId: payload.therapyId,
          medicineName: payload.medicineName,
          price: typeof payload.price === "string" ? parseFloat(payload.price) : payload.price,
          productCode: payload.productCode,
          hsnCode: payload.hsnCode,
          category: payload.category,
          ...(payload.status && { status: payload.status }),
        },
      }),
      invalidatesTags: ["Settings"],
    }),
    getRefundConfigs: builder.query<RefundConfigsResponse, GetRefundConfigsParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append("page", params.page.toString());
        if (params?.limit) queryParams.append("limit", params.limit.toString());
        if (params?.sort) queryParams.append("sort", params.sort);
        if (params?.order) queryParams.append("order", params.order);
        if (params?.search) queryParams.append("search", params.search);
        if (params?.branchId) queryParams.append("branchId", params.branchId.toString());

        const queryString = queryParams.toString();
        return {
          url: `/admin/settings/refund-config${queryString ? `?${queryString}` : ""}`,
          method: "GET",
        };
      },
      providesTags: ["Settings"],
    }),
    createRefundConfig: builder.mutation<
      CreateRefundConfigResponse,
      CreateRefundConfigRequest
    >({
      query: (payload) => ({
        url: "/admin/settings/refund-config",
        method: "POST",
        body: {
          branchId: payload.branchId,
          userId: payload.userId,
          createdBy: payload.createdBy,
        },
      }),
      invalidatesTags: ["Settings"],
    }),
    updateRefundConfig: builder.mutation<
      UpdateRefundConfigResponse,
      UpdateRefundConfigRequest
    >({
      query: (payload) => ({
        url: `/admin/settings/refund-config/${payload.id}`,
        method: "PUT",
        body: {
          branchId: payload.branchId,
          userId: payload.userId,
          updatedBy: payload.updatedBy,
        },
      }),
      invalidatesTags: ["Settings"],
    }),
    getContactUpdates: builder.query<ContactUpdatesResponse, GetContactUpdatesParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append("page", params.page.toString());
        if (params?.limit) queryParams.append("limit", params.limit.toString());
        if (params?.sort) queryParams.append("sort", params.sort);
        if (params?.order) queryParams.append("order", params.order);
        if (params?.search) queryParams.append("search", params.search);
        if (params?.status) queryParams.append("status", params.status ? params.status.toUpperCase() : params.status);

        const queryString = queryParams.toString();
        return {
          url: `/admin/settings/contact-change-request${queryString ? `?${queryString}` : ""}`,
          method: "GET",
        };
      },
      providesTags: ["Settings"],
    }),
    approveRejectContactUpdate: builder.mutation<
      ApproveRejectContactUpdateResponse,
      ApproveRejectContactUpdateRequest
    >({
      queryFn: async (payload, api) => {
        const state = api.getState() as RootState;
        
        // Get user ID and token using helper functions
        const userId = getUserId(state);
        const token = getAuthToken(state);
        const visitIp = await getVisitClientIp();
        
        const response = await fetch(`${API_BASE_URL}/admin/settings/contact-change-request/${payload.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer ${token}` : "",
            ...(visitIp ? { "x-forwarded-for": visitIp } : {}),
          },
          body: JSON.stringify({
            status: payload.status ? payload.status.toUpperCase() : payload.status,
            approvedBy: userId,
          }),
        });

        const data = await response.json();
        
        if (response.ok) {
          return { data };
        } else {
          return { error: data };
        }
      },
      invalidatesTags: ["Settings"],
    }),
    getDietCategories: builder.query<DietCategoriesResponse, GetDietCategoriesParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append("page", params.page.toString());
        if (params?.limit) queryParams.append("limit", params.limit.toString());
        if (params?.sort) queryParams.append("sort", params.sort);
        if (params?.order) queryParams.append("order", params.order);
        if (params?.search) queryParams.append("search", params.search);
        if (params?.branchId != null && Number.isFinite(params.branchId)) {
          queryParams.append("branchId", String(params.branchId));
        }

        const queryString = queryParams.toString();
        return {
          url: `/admin/settings/diet-categories${queryString ? `?${queryString}` : ""}`,
          method: "GET",
        };
      },
      providesTags: ["Settings"],
    }),
    createDietCategory: builder.mutation<
      CreateDietCategoryResponse,
      CreateDietCategoryRequest
    >({
      query: (payload) => ({
        url: "/admin/settings/diet-category",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Settings"],
    }),
    updateDietCategory: builder.mutation<
      UpdateDietCategoryResponse,
      UpdateDietCategoryRequest
    >({
      query: (payload) => ({
        url: `/admin/settings/diet-category/${payload.id}`,
        method: "PATCH",
        body: {
          dietCategory: payload.dietCategory,
          remark: payload.remark,
          status: payload.status,
          dietFoods: payload.dietFoods,
          branchId: payload.branchId,
        },
      }),
      invalidatesTags: ["Settings"],
    }),
    getDiagnosisCategoriesMain: builder.query<DiagnosisCategoriesMainResponse, void>({
      query: () => ({
        url: "/admin/settings/diagnosis-categories/main",
        method: "GET",
      }),
      providesTags: ["Settings"],
    }),
    getDiagnosisDiets: builder.query<DiagnosisDietsResponse, GetDiagnosisDietsParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append("page", params.page.toString());
        if (params?.limit) queryParams.append("limit", params.limit.toString());
        if (params?.sort) queryParams.append("sort", params.sort);
        if (params?.order) queryParams.append("order", params.order);
        if (params?.search) queryParams.append("search", params.search);
        if (params?.branchId != null && Number.isFinite(params.branchId)) {
          queryParams.append("branchId", String(params.branchId));
        }

        const queryString = queryParams.toString();
        return {
          url: `/admin/settings/diagnosis-diet${queryString ? `?${queryString}` : ""}`,
          method: "GET",
        };
      },
      providesTags: ["Settings"],
    }),
    createDiagnosisDiet: builder.mutation<
      CreateDiagnosisDietResponse,
      CreateDiagnosisDietRequest
    >({
      query: (payload) => ({
        url: "/admin/settings/diagnosis-diet",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Settings"],
    }),
    updateDiagnosisDiet: builder.mutation<
      UpdateDiagnosisDietResponse,
      UpdateDiagnosisDietRequest
    >({
      query: (payload) => ({
        url: `/admin/settings/diagnosis-diet/${payload.id}`,
        method: "PUT",
        body: {
          dietDetail: payload.dietDetail,
          instructions: payload.instructions,
          branchId: payload.branchId,
        },
      }),
      invalidatesTags: ["Settings"],
    }),
    deleteDiagnosisDiet: builder.mutation<
      DeleteDiagnosisDietResponse,
      DeleteDiagnosisDietRequest
    >({
      query: (payload) => {
        const qs = new URLSearchParams();
        if (payload.branchId != null && Number.isFinite(payload.branchId)) {
          qs.append("branchId", String(payload.branchId));
        }
        const queryString = qs.toString();
        return {
          url: `/admin/settings/diagnosis/${payload.id}${queryString ? `?${queryString}` : ""}`,
          method: "DELETE",
        };
      },
      invalidatesTags: ["Settings"],
    }),

    deleteDietCategory: builder.mutation<
      DeleteDietCategoryResponse,
      DeleteDietCategoryRequest
    >({
      query: (payload) => {
        const qs = new URLSearchParams();
        if (payload.branchId != null && Number.isFinite(payload.branchId)) {
          qs.append("branchId", String(payload.branchId));
        }
        const queryString = qs.toString();
        return {
          url: `/admin/settings/diet-category/${payload.id}${queryString ? `?${queryString}` : ""}`,
          method: "DELETE",
        };
      },
      invalidatesTags: ["Settings"],
    }),

    getArogyaCards: builder.query<ArogyaCardsResponse, GetArogyaCardsParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.page != null) queryParams.append("page", params.page.toString());
        if (params?.limit != null) queryParams.append("limit", params.limit.toString());
        if (params?.search) queryParams.append("search", params.search);
        if (params?.branchId != null && Number.isFinite(params.branchId)) {
          queryParams.append("branchId", params.branchId.toString());
        }
        const queryString = queryParams.toString();
        return {
          url: `/admin/settings/arogya-cards${queryString ? `?${queryString}` : ""}`,
          method: "GET",
        };
      },
      providesTags: ["Settings"],
    }),
    createArogyaCard: builder.mutation<
      CreateArogyaCardResponse,
      CreateArogyaCardRequest
    >({
      queryFn: async (payload, api) => {
        const state = api.getState() as RootState;
        const userId = getUserId(state);
        const token = getAuthToken(state);
        const body = {
          ...payload,
          branchRule: {
            addedBy: userId ?? 0,
            ...payload.branchRule,
          },
        };
        const visitIp = await getVisitClientIp();
        const response = await fetch(`${API_BASE_URL}/admin/settings/arogya-card`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
            ...(visitIp ? { "x-forwarded-for": visitIp } : {}),
          },
          body: JSON.stringify(body),
        });
        const data = await response.json();
        if (response.ok) {
          return { data };
        }
        return { error: data };
      },
      invalidatesTags: ["Settings"],
    }),
    updateArogyaCard: builder.mutation<
      UpdateArogyaCardResponse,
      UpdateArogyaCardRequest
    >({
      query: (payload) => {
        const { id, ...body } = payload;
        return {
          url: `/admin/settings/arogya-card/${id}`,
          method: "PATCH",
          body,
        };
      },
      invalidatesTags: ["Settings"],
    }),
    updatePassword: builder.mutation<
      { message: string; statusCode: number },
      { userId: number; oldPassword: string; newPassword: string; confirmPassword: string }
    >({
      query: ({ userId, ...body }) => ({
        url: `/admin/settings/updatePassword/${userId}`,
        method: "PUT",
        body,
      }),
    }),
  }),
});

export const {
  useGetAdminSupportContactsQuery,
  useLazyGetSupportContactByPhoneQuery,
  useCreateSupportContactsMutation,
  useUpdateSupportContactMutation,
  useGetMasterSettingsQuery,
  useCreateMasterSettingMutation,
  useUpdateMasterSettingMutation,
  useGetConfigurationQuery,
  useUpdateConfigurationMutation,
  useUpdateProfileMutation,
  useGetBranchesQuery,
  useGetBranchRoleByCategoryTypeQuery,
  useGetUsersQuery,
  useAddUserMutation,
  useUpdateUserMutation,
  useLazyGenerateUsersPdfQuery,
  useGetLabTestsQuery,
  useGetLabTestsByBranchQuery,
  useGetLabTestQuery,
  useGetLabTestGroupsQuery,
  useGetLabTestCategoriesQuery,
  useGetBranchesWithManualLabTestSourceQuery,
  useCreateLabTestMutation,
  useUpdateLabTestMutation,
  useUpdateLabTestByBranchMutation,
  useGetBranchIPsQuery,
  useCreateBranchIPMutation,
  useUpdateBranchIPMutation,
  useGetGroupsQuery,
  useCreateGroupMutation,
  useUpdateGroupMutation,
  useGetDuplicateNumberExceptionsQuery,
  useCreateDuplicateNumberExceptionMutation,
  useUpdateDuplicateNumberExceptionMutation,
  useApproveRejectDuplicateNumberExceptionMutation,
  useGetDiscountConfigsQuery,
  useCreateDiscountConfigMutation,
  useUpdateDiscountConfigMutation,
  useGetPanelsQuery,
  useLazyGetPanelsQuery,
  useCreatePanelMutation,
  useUpdatePanelMutation,
  useDeletePanelMutation,
  useGetHardwareOrFacilitiesQuery,
  useLazyGetHardwareOrFacilitiesQuery,
  useGetHardwareOrFacilitiesByIdQuery,
  useCreateHardwareOrFacilitiesMutation,
  useUpdateHardwareOrFacilitiesMutation,
  useDeleteHardwareOrFacilitiesMutation,
  useGetAllRoomTypesQuery,
  useCreateRoomTypeMutation,
  useUpdateRoomTypeMutation,
  useDeleteRoomTypeMutation,
  useGetAllMasterServicesQuery,
  useCreateMasterServiceMutation,
  useGetDiagnosisCategoriesOnlyQuery,
  useGetDiagnosisCategoriesQuery,
  useCreateDiagnosisCategoryMutation,
  useUpdateDiagnosisCategoryMutation,
  useCreateSubDiagnosisMutation,
  useUpdateSubDiagnosisMutation,
  useGetTherapiesQuery,
  useCreateTherapyMutation,
  useUpdateTherapyMutation,
  useGetTpaTherapiesQuery,
  useCreateTpaTherapyMutation,
  useUpdateTpaTherapyMutation,
  useGetRefundConfigsQuery,
  useCreateRefundConfigMutation,
  useUpdateRefundConfigMutation,
  useGetContactUpdatesQuery,
  useApproveRejectContactUpdateMutation,
  useGetDietCategoriesQuery,
  useCreateDietCategoryMutation,
  useUpdateDietCategoryMutation,
  useDeleteDietCategoryMutation,
  useGetDiagnosisCategoriesMainQuery,
  useGetDiagnosisDietsQuery,
  useCreateDiagnosisDietMutation,
  useUpdateDiagnosisDietMutation,
  useDeleteDiagnosisDietMutation,
  useGetArogyaCardsQuery,
  useCreateArogyaCardMutation,
  useUpdateArogyaCardMutation,
  useUpdatePasswordMutation,
} = settingsApi;


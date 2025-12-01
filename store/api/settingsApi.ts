/**
 * Settings API
 * Purpose: Configuration settings API endpoints using RTK Query
 */

import { baseApi } from "./baseApi";

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

export const settingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
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
    getBranches: builder.query<BranchesResponse, void>({
      query: () => ({
        url: "/admin/settings/branches",
        method: "GET",
      }),
      providesTags: ["Settings"],
    }),
    getBranchIPs: builder.query<BranchIPsResponse, GetBranchIPsParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append("page", params.page.toString());
        if (params?.limit) queryParams.append("limit", params.limit.toString());
        if (params?.sort) queryParams.append("sort", params.sort);
        if (params?.order) queryParams.append("order", params.order);
        if (params?.search) queryParams.append("search", params.search);
        
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
     
  }),
});

export const {
  useGetConfigurationQuery,
  useUpdateConfigurationMutation,
  useGetBranchesQuery,
  useGetBranchIPsQuery,
  useCreateBranchIPMutation,
  useUpdateBranchIPMutation,
  useGetGroupsQuery,
  useCreateGroupMutation,
  useUpdateGroupMutation,
} = settingsApi;


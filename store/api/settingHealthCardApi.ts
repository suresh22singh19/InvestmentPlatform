import { baseApi } from "./baseApi";

export interface BranchRulePayload {
  branchId: number;
  consultantBy: number;
  consultantTo: number;
  productBy: number;
  productTo: number;
  serviceBy: number;
  serviceTo: number;
  pathologyBy: number;
  pathologyTo: number;
  loyalPatientConsultant: number;
  loyalPatientProduct: number;
  loyalPatientService: number;
  loyalPatientPathology: number;
  loyalPatientFibroscan: number;
  loyalPatientConsultantPackage: boolean;
  refereePatientConsultantPackage: boolean;
  isDefaultRule: boolean;
}

export interface DefaultRulePayload {
  consultantBy: number;
  consultantTo: number;
  productBy: number;
  productTo: number;
  serviceBy: number;
  serviceTo: number;
  pathologyBy: number;
  pathologyTo: number;
  loyalPatientConsultant: number;
  loyalPatientConsultantPackage: boolean;
  loyalPatientProduct: number;
  loyalPatientService: number;
  loyalPatientPathology: number;
  loyalPatientFibroscan: number;
  refereePatientConsultantPackage: boolean;
}

export interface CreateArogyaCardRequest {
  cardName: string;
  description: string;
  pointValuation: number;
  seriesStart: string;
  seriesEnd: string;
  status: string;
  pointExpiryDays: number;
  branchRules: BranchRulePayload[];
  defaultRule: DefaultRulePayload;
}

export interface CreateArogyaCardResponse {
  success: boolean;
  data: any;
  message: string;
  timestamp: string;
  statusCode: number;
}

export interface ArogyaCard {
  id: number;
  cardName: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  pointValuation: string;
  seriesStart: string;
  seriesEnd: string;
  pointExpiryDays: number;
  branchRules?: any[];
  defaultRule?: any;
  image?: string | null;
}

export interface GetArogyaCardsParams {
  page?: number;
  limit?: number;
  search?: string;
  branchId?: number;
  cardId?: number;
}

export interface ArogyaCardsResponse {
  success: boolean;
  data: ArogyaCard[];
  total: number;
  activeCardsCount: number;
  branchCount: number;
  page: number;
  limit: number;
  totalPages: number;
  message: string;
  timestamp: string;
  statusCode: number;
}

export const settingHealthCardApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getArogyaCards: builder.query<ArogyaCardsResponse, GetArogyaCardsParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.page != null) queryParams.append("page", params.page.toString());
        if (params?.limit != null) queryParams.append("limit", params.limit.toString());
        if (params?.search) queryParams.append("search", params.search);
        if (params?.branchId != null && Number.isFinite(params.branchId)) {
          queryParams.append("branchId", params.branchId.toString());
        }
        if (params?.cardId != null) {
          queryParams.append("cardId", params.cardId.toString());
        }
        const queryString = queryParams.toString();
        return {
          url: `/admin/settings/arogya-cards${queryString ? `?${queryString}` : ""}`,
          method: "GET",
        };
      },
      providesTags: ["Settings"],
    }),
    createArogyaCard: builder.mutation<CreateArogyaCardResponse, FormData>({
      query: (body) => ({
        url: "/admin/settings/arogya-card",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Settings"],
    }),
    updateArogyaCardStatus: builder.mutation<{ success: boolean; message: string; statusCode: number }, { id: number; status: boolean }>({
      query: ({ id, status }) => ({
        url: `/admin/settings/update-arogya-card-status/${id}`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: ["Settings"],
    }),
    updateArogyaCard: builder.mutation<{ success: boolean; message: string; statusCode: number }, { id: number; body: FormData }>({
      query: ({ id, body }) => ({
        url: `/admin/settings/arogya-card/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Settings"],
    }),
    deleteArogyaCard: builder.mutation<{ success: boolean; message: string; statusCode: number }, number>({
      query: (id) => ({
        url: `/admin/settings/arogya-card/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Settings"],
    }),
    getArogyaCardBranches: builder.query<{ success: boolean; data: { branchId: number; branchName: string }[]; message: string; timestamp: string; statusCode: number }, number>({
      query: (arogyaCardId) => ({
        url: `/admin/settings/arogya-card-branches?arogyaCardId=${arogyaCardId}`,
        method: "GET",
      }),
      providesTags: ["Settings"],
    }),
    allocateBranchSeries: builder.mutation<{ success: boolean; message: string; statusCode: number }, { arogyaCardId: number; branchId: number; seriesStart: string; seriesEnd: string }>({
      query: (body) => ({
        url: "/admin/settings/branch-series-allocation",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Settings"],
    }),
    getBranchSeriesAllocation: builder.query<{
      success: boolean;
      data: {
        id: number;
        cardId: number;
        cardName: string;
        branchId: number;
        branchName: string;
        seriesStart: number | string;
        seriesEnd: number | string;
        cardCount: number | string;
        issuedCardCount?: number | string;
        status: boolean;
        updatedAt: string;
        lastUpdateNote: string | null;
      }[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      message: string;
      timestamp: string;
      statusCode: number;
    }, { cardId: number; status?: boolean; page?: number; limit?: number; branchId?: number; search?: string }>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params.cardId != null) queryParams.append("cardId", params.cardId.toString());
        if (params.status !== undefined) queryParams.append("status", params.status.toString());
        if (params.page != null) queryParams.append("page", params.page.toString());
        if (params.limit != null) queryParams.append("limit", params.limit.toString());
        if (params.branchId != null) queryParams.append("branchId", params.branchId.toString());
        if (params.search) queryParams.append("search", params.search);
        return {
          url: `/admin/settings/get-branch-series-allocation?${queryParams.toString()}`,
          method: "GET",
        };
      },
      providesTags: ["Settings"],
    }),
    getCardDashboardSummary: builder.query<{
      success: boolean;
      data: {
        card: ArogyaCard;
        summary: {
          totalCardsInSeries: number;
          activeCardCount: number;
          inactiveCardCount: number;
          blockedCardCount: number;
          issuedCardCount: number;
          remainingCards: number;
        };
      };
      message: string;
      timestamp: string;
      statusCode: number;
    }, number>({
      query: (cardId) => ({
        url: `/admin/settings/get-card-dashboard-summary/${cardId}`,
        method: "GET",
      }),
      providesTags: ["Settings"],
    }),
    updateBranchSeriesAllocationStatus: builder.mutation<{ success: boolean; message: string; statusCode: number }, { id: number; status: boolean }>({
      query: ({ id, status }) => ({
        url: `/admin/settings/update-branch-series-allocation-status/${id}`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: ["Settings"],
    }),
    updateBranchSeriesAllocation: builder.mutation<{ success: boolean; message: string; statusCode: number }, { id: number; body: { seriesStart: number; seriesEnd: number; status: boolean } }>({
      query: ({ id, body }) => ({
        url: `/admin/settings/update-branch-series-allocation/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Settings"],
    }),
    extendBranchSeriesAllocation: builder.mutation<{ success: boolean; message: string; statusCode: number }, { id: number; body: { seriesEnd: string } }>({
      query: ({ id, body }) => ({
        url: `/admin/settings/extend-branch-series-allocation/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Settings"],
    }),
    deleteBranchSeriesAllocation: builder.mutation<{ success: boolean; message: string; statusCode: number }, number>({
      query: (id) => ({
        url: `/admin/settings/delete-branch-series-allocation/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Settings"],
    }),
  }),
});

export const {
  useCreateArogyaCardMutation,
  useGetArogyaCardsQuery,
  useUpdateArogyaCardStatusMutation,
  useUpdateArogyaCardMutation,
  useDeleteArogyaCardMutation,
  useGetArogyaCardBranchesQuery,
  useAllocateBranchSeriesMutation,
  useGetBranchSeriesAllocationQuery,
  useGetCardDashboardSummaryQuery,
  useUpdateBranchSeriesAllocationStatusMutation,
  useUpdateBranchSeriesAllocationMutation,
  useDeleteBranchSeriesAllocationMutation,
  useExtendBranchSeriesAllocationMutation,
} = settingHealthCardApi;

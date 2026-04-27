/**
 * Leads API
 * Purpose: Lead Request module endpoints (GetAllLeads)
 */

import { baseApi } from "./baseApi";

export interface LeadItem {
    id: number;
    branchName?: string;
    patientName?: string;
    parentPrefix?: string;
    parentName?: string;
    gender?: string;
    age?: string;
    contactNumber?: string;
    pinCode?: string | null;
    address?: string | null;
    area?: string | null;
    tehsil?: string | null;
    city?: string | null;
    state?: string | null;
    patientType?: string | null;
    patientSubType?: string | null;
    benificiaryId?: string | null;
    diagnosis?: string | null;
    remark?: string | null;
    referralUserName?: string | null;
    referralGroupName?: string | null;
    createdAt?: string | null;
    /** Set when lead is confirmed — facility where registration was confirmed. */
    confirmedBranchName?: string | null;
    confirmedBranchId?: string | number | null;
}

export interface GetAllLeadsResponse {
    success: boolean;
    data: LeadItem[];
    total: number;
    page: number;
    limit: number;
    message: string;
    statusCode: number;
}

export interface GetAllLeadsParams {
    branchId?: number;
    page?: number;
    limit?: number;
    search?: string;
    sort?: string;
    order?: "ASC" | "DESC";
    status?: "active" | "shifted" | "confirmed";
}

export const leadsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getAllLeads: builder.query<GetAllLeadsResponse, GetAllLeadsParams>({
            query: ({ branchId, page, limit, search, sort, order, status }) => ({
                url: "/admin/leads/GetAllLeads",
                params: {
                    ...(branchId !== undefined ? { branchId } : {}),
                    ...(page !== undefined ? { page } : {}),
                    ...(limit !== undefined ? { limit } : {}),
                    ...(search !== undefined ? { search } : {}),
                    ...(sort !== undefined ? { sort } : {}),
                    ...(order !== undefined ? { order } : {}),
                    ...(status !== undefined ? { status } : {}),
                },
            }),
        }),
    }),
    overrideExisting: false,
});

export const { useGetAllLeadsQuery } = leadsApi;

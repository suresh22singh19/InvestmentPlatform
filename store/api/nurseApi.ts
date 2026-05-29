/**
 * Admin Nurse API — RTK Query endpoints under `/admin/nurse/*`
 */

import { baseApi } from "./baseApi";
import {
    buildNurseFormData,
    type ApiNurseListItem,
    type UpdateNurseFiles,
} from "@/lib/nurse/mapNurseApi";

export type GetAllNursesDetailsParams = {
    page: number;
    limit: number;
    search?: string;
    branchId: number | string;
    sort?: string;
    order?: "ASC" | "DESC";
};

export type GetAllNursesDetailsResponse = {
    success: boolean;
    data: ApiNurseListItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    message?: string;
    timestamp?: string;
    statusCode?: number;
};

export type ExportNurseFileResponse = {
    success: boolean;
    data: { url: string; filename: string };
    message?: string;
    timestamp?: string;
    statusCode?: number;
};

export type ApiMessageResponse = {
    success: boolean;
    data: unknown;
    message?: string;
    timestamp?: string;
    statusCode?: number;
};

export type UpdateNursePasswordRequest = {
    oldPassword?: string;
    newPassword: string;
    confirmPassword: string;
};

function toQueryString(params: Record<string, string | number | undefined>) {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === "") return;
        sp.set(k, String(v));
    });
    const qs = sp.toString();
    return qs ? `?${qs}` : "";
}

export const nurseApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getNurses: builder.query<GetAllNursesDetailsResponse, GetAllNursesDetailsParams>({
            query: (params) => {
                const qs = toQueryString({
                    page: params.page,
                    limit: params.limit,
                    search: params.search,
                    branchId: params.branchId,
                    sort: params.sort,
                    order: params.order,
                });
                return {
                    url: `/admin/nurse/getNurses${qs}`,
                    method: "GET",
                };
            },
            providesTags: (result) =>
                result?.data
                    ? [
                          { type: "Nurses" as const, id: "LIST" },
                          ...result.data.map((d) => ({ type: "Nurses" as const, id: String(d.id) })),
                      ]
                    : [{ type: "Nurses" as const, id: "LIST" }],
        }),

        addNurse: builder.mutation<
            ApiMessageResponse,
            { body: Record<string, unknown>; files?: UpdateNurseFiles }
        >({
            query: ({ body, files }) => {
                const hasFile = files?.imgUrl instanceof File;
                if (hasFile && files) {
                    const formData = buildNurseFormData(body, files);
                    return {
                        url: "/admin/nurse/addNurse",
                        method: "POST",
                        body: formData,
                        prepareHeaders: (headers: Headers) => {
                            headers.delete("Content-Type");
                            return headers;
                        },
                    };
                }
                return {
                    url: "/admin/nurse/addNurse",
                    method: "POST",
                    body,
                };
            },
            invalidatesTags: [{ type: "Nurses", id: "LIST" }],
        }),

        updateNurse: builder.mutation<
            ApiMessageResponse,
            { id: number; body: Record<string, unknown>; files?: UpdateNurseFiles }
        >({
            query: ({ id, body, files }) => {
                const hasFile = files?.imgUrl instanceof File;
                if (hasFile && files) {
                    const formData = buildNurseFormData(body, files);
                    return {
                        url: `/admin/nurse/updateNurse/${id}`,
                        method: "PUT",
                        body: formData,
                        prepareHeaders: (headers: Headers) => {
                            headers.delete("Content-Type");
                            return headers;
                        },
                    };
                }
                return {
                    url: `/admin/nurse/updateNurse/${id}`,
                    method: "PUT",
                    body,
                };
            },
            invalidatesTags: (_r, _e, arg) => [
                { type: "Nurses", id: "LIST" },
                { type: "Nurses", id: String(arg.id) },
            ],
        }),

        updateNursePassword: builder.mutation<
            ApiMessageResponse,
            { id: number; body: UpdateNursePasswordRequest }
        >({
            query: ({ id, body }) => ({
                url: `/admin/nurse/updateNursePassword/${id}`,
                method: "PUT",
                body,
            }),
        }),

        generateNursesPdf: builder.query<ExportNurseFileResponse, { branchId?: string | number; search?: string; page?: number; limit?: number }>(
            {
                query: ({ branchId, search, page, limit }) => {
                    const qs = toQueryString({ branchId, search, page, limit });
                    return {
                        url: `/admin/nurse/generateNursesPdf${qs}`,
                        method: "GET",
                    };
                },
            }
        ),

        generateNursesCsv: builder.query<ExportNurseFileResponse, { branchId?: string | number; search?: string; page?: number; limit?: number }>(
            {
                query: ({ branchId, search, page, limit }) => {
                    const qs = toQueryString({ branchId, search, page, limit });
                    return {
                        url: `/admin/nurse/generateNursesCsv${qs}`,
                        method: "GET",
                    };
                },
            }
        ),
    }),
});

export const {
    useGetNursesQuery,
    useLazyGetNursesQuery,
    useAddNurseMutation,
    useUpdateNurseMutation,
    useUpdateNursePasswordMutation,
    useLazyGenerateNursesPdfQuery,
    useLazyGenerateNursesCsvQuery,
} = nurseApi;

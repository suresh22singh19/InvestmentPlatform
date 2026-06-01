/**
 * Admin Doctor API — RTK Query endpoints under `/admin/doctor/*`
 */

import { baseApi } from "./baseApi";
import {
    buildUpdateDoctorFormData,
    type ApiDoctorListItem,
    type UpdateDoctorFiles,
} from "@/lib/doctor/mapDoctorApi";

export type GetAllDoctorsDetailsParams = {
    page: number;
    limit: number;
    search?: string;
    branchId: number | string;
    sort?: string;
    order?: "asc" | "desc";
};

export type GetAllDoctorsDetailsResponse = {
    success: boolean;
    data: ApiDoctorListItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    message?: string;
    timestamp?: string;
    statusCode?: number;
};

export type ExportDoctorFileResponse = {
    success: boolean;
    data: { url: string; filename: string };
    message?: string;
    timestamp?: string;
    statusCode?: number;
};

export type UpdateDoctorPasswordRequest = {
    oldPassword?: string;
    newPassword: string;
    confirmPassword: string;
};

export type ApiMessageResponse = {
    success: boolean;
    data: unknown;
    message?: string;
    timestamp?: string;
    statusCode?: number;
};

/** `GET /admin/doctor/getAllDepartmentsForDoctor` — department master for doctor forms. */
export type DepartmentForDoctorItem = {
    id: number;
    name: string;
    description?: string;
    dParent?: number;
};

export type GetAllDepartmentsForDoctorResponse = {
    success: boolean;
    data: DepartmentForDoctorItem[];
    message?: string;
    timestamp?: string;
    statusCode?: number;
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

export const doctorApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getAllDepartmentsForDoctor: builder.query<GetAllDepartmentsForDoctorResponse, void>({
            query: () => ({
                url: "/admin/doctor/getAllDepartmentsForDoctor",
                method: "GET",
            }),
        }),

        getAllDoctorsDetails: builder.query<GetAllDoctorsDetailsResponse, GetAllDoctorsDetailsParams>({
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
                    url: `/admin/doctor/getAllDoctorsDetails${qs}`,
                    method: "GET",
                };
            },
            providesTags: (result) =>
                result?.data
                    ? [
                          { type: "Doctors" as const, id: "LIST" },
                          ...result.data.map((d) => ({ type: "Doctors" as const, id: String(d.id) })),
                      ]
                    : [{ type: "Doctors" as const, id: "LIST" }],
        }),

        createDoctorByBranch: builder.mutation<
            ApiMessageResponse,
            { body: Record<string, unknown>; files?: UpdateDoctorFiles }
        >({
            query: ({ body, files }) => {
                const hasFile =
                    files &&
                    (Boolean(files.imgUrl && files.imgUrl instanceof File) ||
                        Boolean(files.attachment && files.attachment instanceof File));
                if (hasFile && files) {
                    const formData = buildUpdateDoctorFormData(body, files);
                    return {
                        url: "/admin/doctor/createDoctorByBranch",
                        method: "POST",
                        body: formData,
                        prepareHeaders: (headers: Headers) => {
                            headers.delete("Content-Type");
                            return headers;
                        },
                    };
                }
                return {
                    url: "/admin/doctor/createDoctorByBranch",
                    method: "POST",
                    body,
                };
            },
            invalidatesTags: [{ type: "Doctors", id: "LIST" }],
        }),

        updateDoctorDetails: builder.mutation<
            ApiMessageResponse,
            { id: number; body: Record<string, unknown>; files?: UpdateDoctorFiles }
        >({
            query: ({ id, body, files }) => {
                const hasFile =
                    files &&
                    (Boolean(files.imgUrl && files.imgUrl instanceof File) ||
                        Boolean(files.attachment && files.attachment instanceof File));
                if (hasFile && files) {
                    const formData = buildUpdateDoctorFormData(body, files);
                    return {
                        url: `/admin/doctor/updateDoctorDetails/${id}`,
                        method: "PUT",
                        body: formData,
                        prepareHeaders: (headers: Headers) => {
                            headers.delete("Content-Type");
                            return headers;
                        },
                    };
                }
                return {
                    url: `/admin/doctor/updateDoctorDetails/${id}`,
                    method: "PUT",
                    body,
                };
            },
            invalidatesTags: (_r, _e, arg) => [
                { type: "Doctors", id: "LIST" },
                { type: "Doctors", id: String(arg.id) },
            ],
        }),

        updateDoctorPassword: builder.mutation<ApiMessageResponse, { id: number; body: UpdateDoctorPasswordRequest }>({
            query: ({ id, body }) => ({
                url: `/admin/doctor/updateDoctorPassword/${id}`,
                method: "PUT",
                body,
            }),
        }),

        generatePdfForDoctor: builder.query<ExportDoctorFileResponse, { branchId?: string | number; search?: string }>(
            {
                query: ({ branchId, search }) => {
                    const qs = toQueryString({ branchId, search });
                    return {
                        url: `/admin/doctor/generatePdfForDoctor${qs}`,
                        method: "GET",
                    };
                },
            }
        ),

        generateCsvForDoctor: builder.query<ExportDoctorFileResponse, { branchId?: string | number; search?: string }>(
            {
                query: ({ branchId, search }) => {
                    const qs = toQueryString({ branchId, search });
                    return {
                        url: `/admin/doctor/generateCsvForDoctor${qs}`,
                        method: "GET",
                    };
                },
            }
        ),
    }),
});

export const {
    useGetAllDepartmentsForDoctorQuery,
    useGetAllDoctorsDetailsQuery,
    useLazyGetAllDoctorsDetailsQuery,
    useCreateDoctorByBranchMutation,
    useUpdateDoctorDetailsMutation,
    useUpdateDoctorPasswordMutation,
    useLazyGeneratePdfForDoctorQuery,
    useLazyGenerateCsvForDoctorQuery,
} = doctorApi;

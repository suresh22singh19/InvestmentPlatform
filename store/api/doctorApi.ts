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

export type GetAppointmentsOfDoctorParams = {
    appointmentDate: string;
    doctorId: number | string;
    branchId: number | string;
    page?: number;
    limit?: number;
    sortBy?: string;
    order?: "ASC" | "DESC" | "asc" | "desc";
    search?: string;
};

export type AppointmentOfDoctorItem = {
    appointmentId: number;
    uhid: string;
    appointmentDate: string;
    timeSlot: string;
    bloodPressure: string | null;
    pulse: string | null;
    temperature: string | null;
    patientIpdId: number | null;
    registrationId?: number | null;
    doctorFee: string | null;
    diagnosisRemarks: string | null;
    createdAt: string;
    patientName: string;
    gender: string;
    age: string;
    contactNumber: string;
    aadharCardNo: string | null;
    jsHealthCardNo?: string | null;
    guardianName: string | null;
    guardianTitle: string | null;
    dietType: string | null;
    allergies: string | null;
    surgeries: string | null;
    addictionType: string | null;
    addictionSpecify: string | null;
    height: string | null;
    weight: string | null;
    bloodGroup: string | null;
    doctorId: number;
    doctorName: string;
    address: string | null;
    city: string | null;
    state: string | null;
    diagnosisId: number | null;
    diagnosisName: string | null;
    subDiagnosisId: number | null;
    subDiagnosisName: string | null;
    panelId: number | null;
    panelName: string | null;
    isDefaultPanel: boolean;
    isDoctorChecked?: boolean;
    maritalStatus?: string | null;
    benificiaryId?: string | null;
    insuranceCompany?: string | null;
    sugarLevel?: string | null;
    patientTitle?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    area?: string | null;
    tehsil?: string | null;
    country?: string | null;
    pinCode?: string | null;
    branchName?: string | null;
    source?: string | null;
    sourceOfReference?: string | null;
    subSource?: string | null;
    referralDoctor?: string | null;
    referralName?: string | null;
    referralMobile?: string | null;
};

export type GetAppointmentsOfDoctorResponse = {
    success: boolean;
    data: AppointmentOfDoctorItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    message?: string;
    timestamp?: string;
    statusCode?: number;
};

export type GetPatientReferralForDoctorResponse = {
    success: boolean;
    data: {
        id: number;
        uhid: string;
        registrationId: number;
        source: string | null;
        sourceSelected: string | null;
        referralRegistrationId: number | null;
        referralName: string | null;
        referralMobile: string | null;
        doctor?: {
            id: number;
            name: string;
            phone: string;
        } | null;
    } | null;
    message?: string;
    timestamp?: string;
    statusCode?: number;
};

export type GetDBranchTherapyListForDoctorParams = {
    branchId: number | string;
    category: string;
    search?: string;
};

export type TherapyItemForDoctor = {
    therapyId: number;
    therapyName: string;
    category: string;
};

export type GetDBranchTherapyListForDoctorResponse = {
    success: boolean;
    data: TherapyItemForDoctor[];
    message?: string;
    timestamp?: string;
    statusCode?: number;
};

export type CreateOpdAssessmentRequest = {
    appointmentId: number;
    branchId: number;
    doctorId: number;
    visitType: string;
    isEdited: boolean;
    aiResponse: Record<string, any> | null;
    updatedResponse: Record<string, any>;
    therapies?: Array<{
        uhid: string;
        appointmentId: number;
        therapyId: number;
        patientType: string;
    }>;
    opdFollowUp?: {
        opdNextFollowupDate: string;
        opdNextFollowupRemark: string;
    };
    uhid: string;
    doctorNotes?: string;
};

export type CreateOpdAssessmentResponse = {
    success: boolean;
    data: {
        opdAssessmentId: number;
    };
    message?: string;
    timestamp?: string;
    statusCode?: number;
};

export type GetPatientAssessmentHistoryParams = {
    uhid: string;
    filter: "lastSixMonths" | "lastTwelveMonths" | "all";
};

export type PatientAssessmentHistoryItem = {
    id: number;
    appointmentId: number;
    doctorId: number;
    branchId: number;
    doctorName: string | null;
    branchName: string | null;
    isEdited: boolean;
    patientPresentation?: {
        duration?: string;
        chiefComplaint?: string | any;
        symptoms?: string | string[];
        [key: string]: any;
    };
    medications?: {
        current?: string[];
        allergies?: string[];
        [key: string]: any;
    };
    systemicReview?: {
        respiratory?: string;
        cardiovascular?: string;
        [key: string]: any;
    };
    specializedHistory?: {
        pastHistory?: string;
        familyHistory?: string;
        [key: string]: any;
    };
    physicalExamination?: {
        bp?: string;
        pulse?: string;
        temperature?: string;
        [key: string]: any;
    };
    investigations?: {
        recommended?: string[];
        [key: string]: any;
    };
    treatmentPlan?: {
        advice?: string;
        followUp?: string;
        diet?: string;
        lifestyle?: string;
        yogaPranayama?: string;
        treatmentNotes?: string;
        patientEducation?: string;
        prescribedMedicines?: any[];
    };
    progressMonitoring?: {
        notes?: string;
        [key: string]: any;
    };
    createdBy: number | null;
    updatedBy: number | null;
    createdAt: string;
    updatedAt: string | null;
};

export type GetPatientAssessmentHistoryResponse = {
    success: boolean;
    data: PatientAssessmentHistoryItem[];
    message?: string;
    timestamp?: string;
    statusCode?: number;
};

export const doctorApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        createOpdAssessment: builder.mutation<CreateOpdAssessmentResponse, CreateOpdAssessmentRequest>({
            query: (body) => ({
                url: "/doctor/CreateOpdAssessment",
                method: "POST",
                body,
            }),
            invalidatesTags: ["Doctors"],
        }),

        getPatientAssessmentHistory: builder.query<GetPatientAssessmentHistoryResponse, GetPatientAssessmentHistoryParams>({
            query: (params) => ({
                url: `/doctor/GetAllAssessmentHistoryOfPatient?uhid=${params.uhid}&filter=${params.filter}`,
                method: "GET",
            }),
            providesTags: ["Doctors"],
        }),

        getSpecificAssessmentHistoryDetailOfPatient: builder.query<{ success: boolean; data: any; message?: string }, number | string>({
            query: (opdAssessmentId) => ({
                url: `/doctor/GetSpecificAssessmentHistoryDetailOfPatient?opdAssessmentId=${opdAssessmentId}`,
                method: "GET",
            }),
            providesTags: ["Doctors"],
        }),

        getAppointmentsOfDoctor: builder.query<GetAppointmentsOfDoctorResponse, GetAppointmentsOfDoctorParams>({
            query: (params) => {
                const qs = toQueryString({
                    appointmentDate: params.appointmentDate,
                    doctorId: params.doctorId,
                    branchId: params.branchId,
                    page: params.page,
                    limit: params.limit,
                    sortBy: params.sortBy,
                    order: params.order,
                    search: params.search,
                });
                return {
                    url: `/doctor/GetAppointmentsOfDoctor${qs}`,
                    method: "GET",
                };
            },
            providesTags: ["Doctors"],
        }),

        getPatientReferralForDoctor: builder.query<GetPatientReferralForDoctorResponse, { registrationId: number | string }>({
            query: ({ registrationId }) => ({
                url: `/doctor/GetPatientReferralForDoctor?registrationId=${registrationId}`,
                method: "GET",
            }),
        }),

        getDBranchTherapyListForDoctor: builder.query<GetDBranchTherapyListForDoctorResponse, GetDBranchTherapyListForDoctorParams>({
            query: (params) => {
                const qs = toQueryString({
                    branchId: params.branchId,
                    category: params.category,
                    search: params.search,
                });
                return {
                    url: `/doctor/GetBranchTherapyListForDoctor${qs}`,
                    method: "GET",
                };
            },
        }),

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

        getPatientWalletBalance: builder.query<{ success: boolean; data: any; message?: string }, string>({
            query: (uhid) => ({
                url: `/counsellor/wallet-balance/${uhid}`,
                method: "GET",
            }),
        }),
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
    useGetAppointmentsOfDoctorQuery,
    useLazyGetAppointmentsOfDoctorQuery,
    useGetPatientReferralForDoctorQuery,
    useGetDBranchTherapyListForDoctorQuery,
    useCreateOpdAssessmentMutation,
    useGetPatientAssessmentHistoryQuery,
    useLazyGetPatientAssessmentHistoryQuery,
    useGetSpecificAssessmentHistoryDetailOfPatientQuery,
    useLazyGetSpecificAssessmentHistoryDetailOfPatientQuery,
    useGetPatientWalletBalanceQuery,
} = doctorApi;

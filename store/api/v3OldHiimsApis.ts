/**
 * Legacy HIIMS v3 (`stagging.hiims.in/v3`) — proxied via `/api/legacy/*` routes.
 */

import { baseApi } from "./baseApi";

export type LegacyV3DoctorItem = {
    id: string;
    emp_id: string;
    name: string;
    email?: string;
    address?: string;
    city?: string;
    phone?: string;
    alt_phone?: string;
    experience?: string;
    department?: string;
    nabh?: string;
};

export type LegacyV3DoctorListResponse = {
    status?: boolean;
    message?: string;
    data?: LegacyV3DoctorItem[];
};

export type LegacyV3OrderDetailRecord = Record<string, string | null | undefined>;

export type LegacyV3OrderDetailResponse = {
    status?: boolean;
    message?: string;
    data?: {
        order?: LegacyV3OrderDetailRecord;
        items?: LegacyV3OrderDetailRecord[];
    };
};

export type LegacyV3OrdersRequest = {
    patientId: string;
    uhid?: string;
    saleType: "service" | "product";
    orderId?: string;
};

export type LegacyV3OrdersResponse = {
    status?: boolean;
    message?: string;
    data?: LegacyV3OrderDetailRecord[];
};

export type LegacyV3OpdIaFormResponse = {
    status?: boolean;
    message?: string;
    data?: {
        iaf_details?: string | Record<string, unknown> | null;
        [key: string]: unknown;
    } | null;
};

export type LegacyV3PatientDetailResponse = {
    status?: boolean;
    message?: string;
    data?: {
        patient?: LegacyV3OrderDetailRecord;
        registration?: LegacyV3OrderDetailRecord;
    };
};

export type LegacyV3PatientPackageItem = {
    patient_id?: string;
    doctor_id?: string;
    package_id?: string;
    package_name?: string;
    package_price?: string;
    start_date?: string;
    end_date?: string;
    remark?: string;
    status?: string;
    created_at?: string;
};

export type LegacyV3PatientPackageResponse = {
    status?: boolean;
    message?: string;
    data?: LegacyV3PatientPackageItem[];
};

export type LegacyV3PatientRoomItem = {
    patient_id?: string;
    building_name?: string | null;
    floor_name?: string | null;
    room_type?: string | null;
    room_number?: string | null;
    bed_number?: string | null;
    attendant_bed_number?: string | null;
    room_attendant_name?: string | null;
    remark?: string | null;
    status?: string | null;
    created_at?: string | null;
};

export type LegacyV3PatientRoomResponse = {
    status?: boolean;
    message?: string;
    data?: LegacyV3PatientRoomItem[];
};

export type LegacyV3PatientReportRequest = {
    patientId: string;
    uhid?: string;
    patientType: "ipd" | "day_care";
};

export type LegacyV3PatientReportItem = {
    patient_id?: string;
    patient_uhid?: string;
    report_name?: string;
    report_url?: string;
    follow_up_date?: string;
    patient_type?: string;
    remark?: string;
};

export type LegacyV3PatientReportResponse = {
    status?: boolean;
    message?: string;
    data?: LegacyV3PatientReportItem[];
};

export type LegacyV3PatientFormItem = {
    uhid?: string | null;
    report_url?: string | null;
    remark?: string | null;
    created_at?: string | null;
};

export type LegacyV3PatientFormResponse = {
    status?: boolean;
    message?: string;
    data?: LegacyV3PatientFormItem[];
};

export type LegacyV3NursingNoteItem = {
    id?: string | null;
    patient_id?: string | null;
    patient_from?: string | null;
    on_examination?: string | null;
    vitals?: string | null;
    therapy?: string | null;
    meals?: string | null;
    medication?: string | null;
    doctor_round?: string | null;
    current_status?: string | null;
    new_order?: string | null;
    handover_to?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
};

export type LegacyV3NursingNoteRequest = {
    patientId: string;
    metakey?: string;
    metavalue?: string;
    limit: number;
    page: number;
};

export type LegacyV3NursingNoteResponse = {
    status?: boolean;
    message?: string;
    total_records?: number;
    data?: LegacyV3NursingNoteItem[];
};

export type LegacyV3DoctorVisitItem = {
    id?: string | null;
    patient_id?: string | null;
    doctor_id?: string | null;
    room_attendant_id?: string | null;
    doctor_name?: string | null;
    nurse_name?: string | null;
    bp?: string | null;
    sugar?: string | null;
    pulse?: string | null;
    spo2?: string | null;
    temperature?: string | null;
    r_r?: string | null;
    abdominal_girth?: string | null;
    pain_scoring?: string | null;
    motion_history?: string | null;
    intake?: string | null;
    output?: string | null;
    remark?: string | null;
    created_at?: string | null;
};

export type LegacyV3DoctorVisitResponse = {
    status?: boolean;
    message?: string;
    data?: LegacyV3DoctorVisitItem[];
};

export type LegacyV3PatientHistoryItem = {
    id?: string | null;
    uhid?: string | null;
    chief_complaint?: string | null;
    associated_complaint?: string | null;
    general_ho?: string | null;
    stress?: string | null;
    bowel?: string | null;
    appetate?: string | null;
    micturition?: string | null;
    sleep?: string | null;
    medicine_history?: string | null;
    diagnose?: string | null;
    k_c_o?: string | null;
    gyne_obs?: string | null;
    created_at?: string | null;
};

export type LegacyV3PatientHistoryResponse = {
    status?: boolean;
    message?: string;
    data?: LegacyV3PatientHistoryItem[];
};

export type LegacyV3PatientRevisitItem = {
    id?: string | null;
    patient_id?: string | null;
    doctor_id?: string | null;
    doctor_name?: string | null;
    revisit_date?: string | null;
    revisit_time?: string | null;
    remark?: string | null;
    created_at?: string | null;
};

export type LegacyV3PatientRevisitResponse = {
    status?: boolean;
    message?: string;
    data?: LegacyV3PatientRevisitItem[];
};

export type LegacyV3PatientDietItem = {
    id?: string | null;
    patient_id?: string | null;
    uhid?: string | null;
    diagnosis_id?: string | null;
    diet_schedule?: string | null;
    diet_detail?: string | null;
    instruction?: string | null;
    diet_date?: string | null;
    created_at?: string | null;
    diet_name?: string | null;
};

export type LegacyV3PatientDietResponse = {
    status?: boolean;
    message?: string;
    data?: LegacyV3PatientDietItem[];
};

export type LegacyV3OpenFreeMedicineItem = {
    id?: string | null;
    patient_id?: string | null;
    medicine_id?: string | null;
    product_id?: string | null;
    medicine_name?: string | null;
    qty?: string | null;
    doctor_id?: string | null;
    doctor_name?: string | null;
    dosage?: string | null;
    frequency?: string | null;
    days?: string | null;
    remark?: string | null;
    patient_type?: string | null;
    status?: string | null;
    added_by?: string | null;
    group_id?: string | null;
    created_at?: string | null;
};

export type LegacyV3OpenFreeMedicineResponse = {
    status?: boolean;
    message?: string;
    data?: LegacyV3OpenFreeMedicineItem[];
};

export type LegacyV3PatientPaymentType = "opd" | "ipd" | "day_care";

export type LegacyV3PatientPaymentRequest = {
    patientId: string;
    type: LegacyV3PatientPaymentType;
};

export type LegacyV3PatientPaymentItem = {
    id?: string | null;
    uhid?: string | null;
    patient_id?: string | null;
    payment_category_id?: string | null;
    title?: string | null;
    Price?: string | null;
    price?: string | null;
    mode?: string | null;
    payment_method?: string | null;
    transaction_id?: string | null;
    response_data?: string | null;
    transaction_date?: string | null;
    status?: string | null;
    remark?: string | null;
    patient_type?: string | null;
    added_by?: string | null;
    group_id?: string | null;
    pre_booking_id?: string | null;
    pre_booking?: string | null;
    payment_url?: string | null;
    receipt_url?: string | null;
    expire_date?: string | null;
    invoice_id?: string | null;
    order_id?: string | null;
    discharge?: string | null;
    created_at?: string | null;
};

export type LegacyV3PatientPaymentResponse = {
    status?: boolean;
    message?: string;
    data?: LegacyV3PatientPaymentItem[];
};

export type LegacyV3PanelPatientServicesInvoiceItem = {
    id?: string | null;
    patient_id?: string | null;
    branch_id?: string | null;
    uhid?: string | null;
    order_id?: string | null;
    amount_with_tax?: string | null;
    amount_without_tax?: string | null;
    discount?: string | null;
    gst_amount?: string | null;
    payment_type?: string | null;
    payment_status?: string | null;
    patient_type?: string | null;
    status?: string | null;
    created?: string | null;
    modified?: string | null;
};

export type LegacyV3PanelPatientServicesInvoicesResponse = {
    status?: boolean;
    message?: string;
    data?: LegacyV3PanelPatientServicesInvoiceItem[];
};

export type LegacyV3HealthCardPointsItem = {
    id?: string | null;
    uhid?: string | null;
    contact_number?: string | null;
    coins?: string | null;
    card?: string | null;
};

export type LegacyV3HealthCardPointsResponse = {
    status?: boolean;
    message?: string;
    data?: LegacyV3HealthCardPointsItem | null;
};

export type LegacyV3HealthCardTransactionItem = {
    id?: string | null;
    arogya_id?: string | null;
    branch_id?: string | null;
    uhid?: string | null;
    phone?: string | null;
    coins?: string | null;
    slug_type?: string | null;
    entry?: string | null;
    order_id?: string | null;
    refference_table?: string | null;
    order_status?: string | null;
    is_expired?: string | null;
    remark?: string | null;
    created_at?: string | null;
};

export type LegacyV3HealthCardTransactionResponse = {
    status?: boolean;
    message?: string;
    data?: LegacyV3HealthCardTransactionItem[];
};

export type LegacyV3PrebookingListRequest = {
    branchId?: number;
    contactNumber: string;
    patientName: string;
    bookingType: "opd" | "ipd";
    bookingStatus: "active" | "confirm";
    startDate: string;
    endDate: string;
    limit: number;
    page: number;
};

export type LegacyV3PrebookingItem = {
    booking_id?: string;
    branch_id?: string;
    patient?: string;
    gender?: string;
    age?: string | null;
    contact_number?: string;
    booking_type?: string;
    status?: string;
    price?: string | null;
    doctor_name?: string | null;
    branch_name?: string;
    [key: string]: unknown;
};

export type LegacyV3PrebookingListResponse = {
    status?: boolean;
    message?: string;
    total_records?: number;
    data?: LegacyV3PrebookingItem[];
};

export type LegacyV3PrebookingDetailResponse = {
    status?: boolean;
    message?: string;
    data?: Record<string, unknown> | null;
};

export type LegacyV3LeadListRequest = {
    branchId: number;
    status: "active" | "confirmed" | "shifted";
    patientName?: string;
    startDate: string;
    endDate: string;
    limit: number;
    page: number;
};

export type LegacyV3LeadItem = {
    id?: string;
    branch_id?: string;
    patient_name?: string;
    parent_prefix?: string;
    parent_name?: string;
    gender?: string;
    age?: string;
    contact_number?: string;
    alternate_number?: string;
    pin_code?: string | null;
    address?: string | null;
    area_id?: string | null;
    area?: string | null;
    tehsil?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    appointment_state?: string | null;
    patient_type?: string | null;
    patient_sub_type?: string | null;
    benificiary_id?: string | null;
    diagnosis?: string | null;
    appointment_date?: string | null;
    source_of_reference?: string | null;
    remark?: string | null;
    status?: string | null;
    confirm_branch_id?: string | null;
    uhid?: string | null;
    confirm_date?: string | null;
    treatment_start?: string | null;
    added_by?: string | null;
    added_by_doctor_or_champ?: string | null;
    manager_id?: string | null;
    created_by?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    branch_name?: string | null;
    field_user_name?: string | null;
    user_group_name?: string | null;
    doctor_name?: string | null;
    confirm_branch_name?: string | null;
    [key: string]: unknown;
};

export type LegacyV3LeadListResponse = {
    status?: boolean;
    message?: string;
    total_records?: number;
    data?: LegacyV3LeadItem[];
};

export type LegacyV3BranchItem = {
    id?: string | null;
    name?: string | null;
    phone_number?: string | null;
    address?: string | null;
    state?: string | null;
    district?: string | null;
    type?: string | null;
    branch_code?: string | null;
};

export type LegacyV3BranchListResponse = {
    status?: boolean;
    message?: string;
    total_records?: number;
    data?: LegacyV3BranchItem[];
};

export const v3OldHiimsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getLegacyDoctorsByBranch: builder.query<LegacyV3DoctorListResponse, number>({
            queryFn: async (branchId) => {
                const id = Number(branchId);
                const safeId = Number.isFinite(id) && id > 0 ? id : 1;
                try {
                    const res = await fetch(`/api/legacy/doctorlist?branchId=${safeId}`);
                    const json = (await res.json()) as LegacyV3DoctorListResponse;
                    if (!res.ok) {
                        return { error: { status: res.status, data: json } };
                    }
                    return { data: json };
                } catch (e) {
                    return {
                        error: {
                            status: "FETCH_ERROR" as const,
                            error: e instanceof Error ? e.message : "Network error",
                        },
                    };
                }
            },
        }),
        getLegacyOrderDetail: builder.query<LegacyV3OrderDetailResponse, string>({
            queryFn: async (orderId) => {
                const safeOrderId = String(orderId ?? "").trim();
                try {
                    const res = await fetch(`/api/legacy/orderDetail?orderId=${encodeURIComponent(safeOrderId)}`);
                    const json = (await res.json()) as LegacyV3OrderDetailResponse;
                    if (!res.ok) {
                        return { error: { status: res.status, data: json } };
                    }
                    return { data: json };
                } catch (e) {
                    return {
                        error: {
                            status: "FETCH_ERROR" as const,
                            error: e instanceof Error ? e.message : "Network error",
                        },
                    };
                }
            },
        }),
        getLegacyOpdIaForm: builder.query<LegacyV3OpdIaFormResponse, string>({
            queryFn: async (opdid) => {
                const safeOpdId = String(opdid ?? "").trim();
                try {
                    const params = new URLSearchParams({
                        opdid: safeOpdId,
                    });
                    const res = await fetch(`/api/legacy/opdPatientIaForm?${params.toString()}`);
                    const json = (await res.json()) as LegacyV3OpdIaFormResponse;
                    if (!res.ok) {
                        return { error: { status: res.status, data: json } };
                    }
                    return { data: json };
                } catch (e) {
                    return {
                        error: {
                            status: "FETCH_ERROR" as const,
                            error: e instanceof Error ? e.message : "Network error",
                        },
                    };
                }
            },
        }),
        getLegacyOrders: builder.query<LegacyV3OrdersResponse, LegacyV3OrdersRequest>({
            queryFn: async ({ patientId, uhid = "", saleType, orderId = "" }) => {
                const safePatientId = String(patientId ?? "").trim();
                const safeUhid = String(uhid ?? "").trim();
                const safeOrderId = String(orderId ?? "").trim();
                try {
                    const params = new URLSearchParams({
                        patientId: safePatientId,
                        uhid: safeUhid,
                        saleType,
                        orderId: safeOrderId,
                    });
                    const res = await fetch(`/api/legacy/orders?${params.toString()}`);
                    const json = (await res.json()) as LegacyV3OrdersResponse;
                    if (!res.ok) {
                        return { error: { status: res.status, data: json } };
                    }
                    return { data: json };
                } catch (e) {
                    return {
                        error: {
                            status: "FETCH_ERROR" as const,
                            error: e instanceof Error ? e.message : "Network error",
                        },
                    };
                }
            },
        }),
        getLegacyPatientDetail: builder.query<LegacyV3PatientDetailResponse, string>({
            queryFn: async (pid) => {
                const safePid = String(pid ?? "").trim();
                try {
                    const res = await fetch(`/api/legacy/patientDetail?pid=${encodeURIComponent(safePid)}`);
                    const json = (await res.json()) as LegacyV3PatientDetailResponse;
                    if (!res.ok) {
                        return { error: { status: res.status, data: json } };
                    }
                    return { data: json };
                } catch (e) {
                    return {
                        error: {
                            status: "FETCH_ERROR" as const,
                            error: e instanceof Error ? e.message : "Network error",
                        },
                    };
                }
            },
        }),
        getLegacyPatientPackage: builder.query<LegacyV3PatientPackageResponse, string>({
            queryFn: async (patientId) => {
                const safePatientId = String(patientId ?? "").trim();
                try {
                    const res = await fetch(`/api/legacy/patientPackage?patientId=${encodeURIComponent(safePatientId)}`);
                    const json = (await res.json()) as LegacyV3PatientPackageResponse;
                    if (!res.ok) {
                        return { error: { status: res.status, data: json } };
                    }
                    return { data: json };
                } catch (e) {
                    return {
                        error: {
                            status: "FETCH_ERROR" as const,
                            error: e instanceof Error ? e.message : "Network error",
                        },
                    };
                }
            },
        }),
        getLegacyPatientRoom: builder.query<LegacyV3PatientRoomResponse, string>({
            queryFn: async (patientId) => {
                const safePatientId = String(patientId ?? "").trim();
                try {
                    const res = await fetch(`/api/legacy/patientRoom?patientId=${encodeURIComponent(safePatientId)}`);
                    const json = (await res.json()) as LegacyV3PatientRoomResponse;
                    if (!res.ok) {
                        return { error: { status: res.status, data: json } };
                    }
                    return { data: json };
                } catch (e) {
                    return {
                        error: {
                            status: "FETCH_ERROR" as const,
                            error: e instanceof Error ? e.message : "Network error",
                        },
                    };
                }
            },
        }),
        getLegacyPatientReport: builder.query<LegacyV3PatientReportResponse, LegacyV3PatientReportRequest>({
            queryFn: async ({ patientId, uhid = "", patientType }) => {
                const safePatientId = String(patientId ?? "").trim();
                const safeUhid = String(uhid ?? "").trim();
                try {
                    const params = new URLSearchParams({
                        patientId: safePatientId,
                        uhid: safeUhid,
                        patientType,
                    });
                    const res = await fetch(`/api/legacy/patientReport?${params.toString()}`);
                    const json = (await res.json()) as LegacyV3PatientReportResponse;
                    if (!res.ok) {
                        return { error: { status: res.status, data: json } };
                    }
                    return { data: json };
                } catch (e) {
                    return {
                        error: {
                            status: "FETCH_ERROR" as const,
                            error: e instanceof Error ? e.message : "Network error",
                        },
                    };
                }
            },
        }),
        getLegacyPatientForm: builder.query<LegacyV3PatientFormResponse, string>({
            queryFn: async (patientId) => {
                const safePatientId = String(patientId ?? "").trim();
                try {
                    const params = new URLSearchParams({
                        patientId: safePatientId,
                    });
                    const res = await fetch(`/api/legacy/patientForm?${params.toString()}`);
                    const json = (await res.json()) as LegacyV3PatientFormResponse;
                    if (!res.ok) {
                        return { error: { status: res.status, data: json } };
                    }
                    return { data: json };
                } catch (e) {
                    return {
                        error: {
                            status: "FETCH_ERROR" as const,
                            error: e instanceof Error ? e.message : "Network error",
                        },
                    };
                }
            },
        }),
        getLegacyNursingNote: builder.query<LegacyV3NursingNoteResponse, LegacyV3NursingNoteRequest>({
            queryFn: async ({ patientId, metakey, metavalue, limit, page }) => {
                const safePatientId = String(patientId ?? "").trim();
                try {
                    const params = new URLSearchParams({
                        patientId: safePatientId,
                        limit: String(limit),
                        page: String(page),
                    });
                    if (metakey) params.set("metakey", metakey);
                    if (metavalue) params.set("metavalue", metavalue);
                    const res = await fetch(`/api/legacy/nursingNote?${params.toString()}`);
                    const json = (await res.json()) as LegacyV3NursingNoteResponse;
                    if (!res.ok) {
                        return { error: { status: res.status, data: json } };
                    }
                    return { data: json };
                } catch (e) {
                    return {
                        error: {
                            status: "FETCH_ERROR" as const,
                            error: e instanceof Error ? e.message : "Network error",
                        },
                    };
                }
            },
        }),
        getLegacyDoctorVisit: builder.query<LegacyV3DoctorVisitResponse, string>({
            queryFn: async (patientId) => {
                const safePatientId = String(patientId ?? "").trim();
                try {
                    const params = new URLSearchParams({
                        patientId: safePatientId,
                    });
                    const res = await fetch(`/api/legacy/doctorVisit?${params.toString()}`);
                    const json = (await res.json()) as LegacyV3DoctorVisitResponse;
                    if (!res.ok) {
                        return { error: { status: res.status, data: json } };
                    }
                    return { data: json };
                } catch (e) {
                    return {
                        error: {
                            status: "FETCH_ERROR" as const,
                            error: e instanceof Error ? e.message : "Network error",
                        },
                    };
                }
            },
        }),
        getLegacyPatientHistory: builder.query<LegacyV3PatientHistoryResponse, string>({
            queryFn: async (patientId) => {
                const safePatientId = String(patientId ?? "").trim();
                try {
                    const params = new URLSearchParams({
                        patientId: safePatientId,
                    });
                    const res = await fetch(`/api/legacy/patientHistory?${params.toString()}`);
                    const json = (await res.json()) as LegacyV3PatientHistoryResponse;
                    if (!res.ok) {
                        return { error: { status: res.status, data: json } };
                    }
                    return { data: json };
                } catch (e) {
                    return {
                        error: {
                            status: "FETCH_ERROR" as const,
                            error: e instanceof Error ? e.message : "Network error",
                        },
                    };
                }
            },
        }),
        getLegacyPatientRevisit: builder.query<LegacyV3PatientRevisitResponse, string>({
            queryFn: async (patientId) => {
                const safePatientId = String(patientId ?? "").trim();
                try {
                    const params = new URLSearchParams({
                        patientId: safePatientId,
                    });
                    const res = await fetch(`/api/legacy/patientRevisit?${params.toString()}`);
                    const json = (await res.json()) as LegacyV3PatientRevisitResponse;
                    if (!res.ok) {
                        return { error: { status: res.status, data: json } };
                    }
                    return { data: json };
                } catch (e) {
                    return {
                        error: {
                            status: "FETCH_ERROR" as const,
                            error: e instanceof Error ? e.message : "Network error",
                        },
                    };
                }
            },
        }),
        getLegacyPatientDiet: builder.query<LegacyV3PatientDietResponse, string>({
            queryFn: async (patientId) => {
                const safePatientId = String(patientId ?? "").trim();
                try {
                    const params = new URLSearchParams({
                        patientId: safePatientId,
                    });
                    const res = await fetch(`/api/legacy/patientDiet?${params.toString()}`);
                    const json = (await res.json()) as LegacyV3PatientDietResponse;
                    if (!res.ok) {
                        return { error: { status: res.status, data: json } };
                    }
                    return { data: json };
                } catch (e) {
                    return {
                        error: {
                            status: "FETCH_ERROR" as const,
                            error: e instanceof Error ? e.message : "Network error",
                        },
                    };
                }
            },
        }),
        getLegacyOpenFreeMedicine: builder.query<LegacyV3OpenFreeMedicineResponse, string>({
            queryFn: async (patientId) => {
                const safePatientId = String(patientId ?? "").trim();
                try {
                    const params = new URLSearchParams({
                        patientId: safePatientId,
                    });
                    const res = await fetch(`/api/legacy/openFreeMedicine?${params.toString()}`);
                    const json = (await res.json()) as LegacyV3OpenFreeMedicineResponse;
                    if (!res.ok) {
                        return { error: { status: res.status, data: json } };
                    }
                    return { data: json };
                } catch (e) {
                    return {
                        error: {
                            status: "FETCH_ERROR" as const,
                            error: e instanceof Error ? e.message : "Network error",
                        },
                    };
                }
            },
        }),
        getLegacyPatientPayment: builder.query<LegacyV3PatientPaymentResponse, LegacyV3PatientPaymentRequest>({
            queryFn: async ({ patientId, type }) => {
                const safePatientId = String(patientId ?? "").trim();
                try {
                    const params = new URLSearchParams({
                        patientId: safePatientId,
                        type,
                    });
                    const res = await fetch(`/api/legacy/patientPayment?${params.toString()}`);
                    const json = (await res.json()) as LegacyV3PatientPaymentResponse;
                    if (!res.ok) {
                        return { error: { status: res.status, data: json } };
                    }
                    return { data: json };
                } catch (e) {
                    return {
                        error: {
                            status: "FETCH_ERROR" as const,
                            error: e instanceof Error ? e.message : "Network error",
                        },
                    };
                }
            },
        }),
        getLegacyPanelPatientServicesInvoices: builder.query<LegacyV3PanelPatientServicesInvoicesResponse, string>({
            queryFn: async (patientId) => {
                const safePatientId = String(patientId ?? "").trim();
                try {
                    const params = new URLSearchParams({
                        patientId: safePatientId,
                    });
                    const res = await fetch(`/api/legacy/panelPatientServicesInvoices?${params.toString()}`);
                    const json = (await res.json()) as LegacyV3PanelPatientServicesInvoicesResponse;
                    if (!res.ok) {
                        return { error: { status: res.status, data: json } };
                    }
                    return { data: json };
                } catch (e) {
                    return {
                        error: {
                            status: "FETCH_ERROR" as const,
                            error: e instanceof Error ? e.message : "Network error",
                        },
                    };
                }
            },
        }),
        getLegacyHealthCardPoints: builder.query<LegacyV3HealthCardPointsResponse, string>({
            queryFn: async (uhid) => {
                const safeUhid = String(uhid ?? "").trim();
                try {
                    const params = new URLSearchParams({ uhid: safeUhid });
                    const res = await fetch(`/api/legacy/healthCardPoints?${params.toString()}`);
                    const json = (await res.json()) as LegacyV3HealthCardPointsResponse;
                    if (!res.ok) {
                        return { error: { status: res.status, data: json } };
                    }
                    return { data: json };
                } catch (e) {
                    return {
                        error: {
                            status: "FETCH_ERROR" as const,
                            error: e instanceof Error ? e.message : "Network error",
                        },
                    };
                }
            },
        }),
        getLegacyHealthCardTransaction: builder.query<LegacyV3HealthCardTransactionResponse, string>({
            queryFn: async (uhid) => {
                const safeUhid = String(uhid ?? "").trim();
                try {
                    const params = new URLSearchParams({ uhid: safeUhid });
                    const res = await fetch(`/api/legacy/healthCardTransaction?${params.toString()}`);
                    const json = (await res.json()) as LegacyV3HealthCardTransactionResponse;
                    if (!res.ok) {
                        return { error: { status: res.status, data: json } };
                    }
                    return { data: json };
                } catch (e) {
                    return {
                        error: {
                            status: "FETCH_ERROR" as const,
                            error: e instanceof Error ? e.message : "Network error",
                        },
                    };
                }
            },
        }),
        getLegacyPrebookingList: builder.query<LegacyV3PrebookingListResponse, LegacyV3PrebookingListRequest>({
            queryFn: async (payload) => {
                try {
                    const params = new URLSearchParams({
                        branchId: String(payload.branchId ?? 0),
                        contactNumber: payload.contactNumber,
                        patientName: payload.patientName,
                        bookingType: payload.bookingType,
                        bookingStatus: payload.bookingStatus,
                        startDate: payload.startDate,
                        endDate: payload.endDate,
                        limit: String(payload.limit),
                        page: String(payload.page),
                    });
                    const res = await fetch(`/api/legacy/prebooking?${params.toString()}`);
                    const json = (await res.json()) as LegacyV3PrebookingListResponse;
                    if (!res.ok) {
                        return { error: { status: res.status, data: json } };
                    }
                    return { data: json };
                } catch (e) {
                    return {
                        error: {
                            status: "FETCH_ERROR" as const,
                            error: e instanceof Error ? e.message : "Network error",
                        },
                    };
                }
            },
        }),
        getLegacyPrebookingDetail: builder.query<LegacyV3PrebookingDetailResponse, number>({
            queryFn: async (bookingId) => {
                try {
                    const params = new URLSearchParams({
                        bookingId: String(bookingId),
                    });
                    const res = await fetch(`/api/legacy/prebookingDetail?${params.toString()}`);
                    const json = (await res.json()) as LegacyV3PrebookingDetailResponse;
                    if (!res.ok) {
                        return { error: { status: res.status, data: json } };
                    }
                    return { data: json };
                } catch (e) {
                    return {
                        error: {
                            status: "FETCH_ERROR" as const,
                            error: e instanceof Error ? e.message : "Network error",
                        },
                    };
                }
            },
        }),
        getLegacyLeadList: builder.query<LegacyV3LeadListResponse, LegacyV3LeadListRequest>({
            queryFn: async (payload) => {
                try {
                    const params = new URLSearchParams({
                        branchId: String(payload.branchId),
                        status: payload.status,
                        patientName: payload.patientName ?? "",
                        startDate: payload.startDate,
                        endDate: payload.endDate,
                        limit: String(payload.limit),
                        page: String(payload.page),
                    });
                    const res = await fetch(`/api/legacy/branchLead?${params.toString()}`);
                    const json = (await res.json()) as LegacyV3LeadListResponse;
                    if (!res.ok) {
                        return { error: { status: res.status, data: json } };
                    }
                    return { data: json };
                } catch (e) {
                    return {
                        error: {
                            status: "FETCH_ERROR" as const,
                            error: e instanceof Error ? e.message : "Network error",
                        },
                    };
                }
            },
        }),
        getLegacyBranchList: builder.query<LegacyV3BranchListResponse, void>({
            queryFn: async () => {
                try {
                    const res = await fetch(`/api/legacy/branchList?branchId=0`);
                    const json = (await res.json()) as LegacyV3BranchListResponse;
                    if (!res.ok) {
                        return { error: { status: res.status, data: json } };
                    }
                    return { data: json };
                } catch (e) {
                    return {
                        error: {
                            status: "FETCH_ERROR" as const,
                            error: e instanceof Error ? e.message : "Network error",
                        },
                    };
                }
            },
        }),
    }),
    overrideExisting: false,
});

export const {
    useGetLegacyDoctorsByBranchQuery,
    useLazyGetLegacyDoctorsByBranchQuery,
    useLazyGetLegacyOrderDetailQuery,
    useLazyGetLegacyOpdIaFormQuery,
    useLazyGetLegacyOrdersQuery,
    useLazyGetLegacyPatientDetailQuery,
    useLazyGetLegacyPatientPackageQuery,
    useLazyGetLegacyPatientRoomQuery,
    useLazyGetLegacyPatientReportQuery,
    useLazyGetLegacyPatientFormQuery,
    useLazyGetLegacyNursingNoteQuery,
    useLazyGetLegacyDoctorVisitQuery,
    useLazyGetLegacyPatientHistoryQuery,
    useLazyGetLegacyPatientRevisitQuery,
    useLazyGetLegacyPatientDietQuery,
    useLazyGetLegacyOpenFreeMedicineQuery,
    useLazyGetLegacyPatientPaymentQuery,
    useLazyGetLegacyPanelPatientServicesInvoicesQuery,
    useLazyGetLegacyHealthCardPointsQuery,
    useLazyGetLegacyHealthCardTransactionQuery,
    useGetLegacyPrebookingListQuery,
    useLazyGetLegacyPrebookingDetailQuery,
    useGetLegacyLeadListQuery,
    useGetLegacyBranchListQuery,
} = v3OldHiimsApi;

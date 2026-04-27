import type { SelectOption } from "@/components/ui/FormSelectField";

export type EducationEntry = {
    id: string;
    qualification: string;
    college: string;
    completionYears: string;
};

export type SpecializationEntry = {
    id: string;
    specialization: string;
};

export type RegistrationEntry = {
    id: string;
    councilRegistrationNumber: string;
    councilName: string;
    year: string;
};

/** Doctor form: salutation is always Dr (single option). */
export const DOCTOR_NAME_TITLE_OPTIONS: SelectOption[] = [{ value: "Dr", label: "Dr" }];

export const DOCTOR_NAME_TITLE_VALUES = ["Dr"] as const;

/** Full doctor record used in list, forms, and view (static / client state). */
export type DoctorRecord = {
    id: number;
    branchId: string;
    profileImageUrl: string | null;
    /** Certificate / PDF URL from API (`attachment`); used on edit to show existing filename. */
    attachmentUrl: string | null;
    /** Salutation shown before name (e.g. Dr, Mr). */
    nameTitle: string;
    /** Given / family name without title prefix. */
    name: string;
    email: string;
    nabhRegistered: boolean;
    contact: string;
    altContact: string;
    yearsExperience: string;
    department: string;
    opdFee: string;
    loginType: string;
    doctorType: string;
    selectTeam: string;
    employeeId: string;
    status: "Active" | "Inactive";
    createdAt?: string;
    address: string;
    city: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    education: EducationEntry[];
    specializations: SpecializationEntry[];
    registrations: RegistrationEntry[];
};

/**
 * Single display/API string from title + name: `"Dr Ajeet"` (one space, no period).
 * Create/update doctor payloads use this for the `name` field.
 */
export function doctorDisplayName(r: Pick<DoctorRecord, "nameTitle" | "name">): string {
    const title = (r.nameTitle ?? "").trim();
    const rest = (r.name ?? "").trim();
    if (!title) return rest;
    return `${title} ${rest}`.replace(/\s+/g, " ").trim();
}

export const STATIC_BRANCH_FILTER_OPTIONS: SelectOption[] = [
    { value: "", label: "All Branches" },
    { value: "1", label: "Jeena Ahmedabad" },
    { value: "2", label: "Navi Mumbai" },
    { value: "3", label: "Gurugram Haryana" },
    { value: "4", label: "East Campus" },
];

export const BRANCH_OPTIONS_FORM: SelectOption[] = STATIC_BRANCH_FILTER_OPTIONS.filter((o) => o.value !== "");

export const DEPARTMENT_OPTIONS: SelectOption[] = [
    { value: "", label: "--Select--" },
    { value: "opd-ipd", label: "OPD/IPD" },
    { value: "dietitian", label: "Dietitian" },
    { value: "ac-fan-service", label: "Ac/Fan Service" },
    { value: "phone-service", label: "Phone Service" },
    { value: "bell-service", label: "Bell Service" },
    { value: "housekeeping", label: "Housekeeping" },
    { value: "admin", label: "Admin" },
    { value: "naturopathy", label: "Naturopathy" },
    { value: "panchkarma", label: "Panchkarma" },
    { value: "ipd", label: "IPD" },
    { value: "opd", label: "OPD" },
];

/** Values allowed for `department` (matches `DEPARTMENT_OPTIONS`). */
export const DEPARTMENT_ALLOWED_VALUES: string[] = DEPARTMENT_OPTIONS.map((o) => o.value);

export const LOGIN_TYPE_OPTIONS: SelectOption[] = [
    { value: "no-auth", label: "No auth" },
    { value: "ip", label: "IP" },
    { value: "otp", label: "OTP" },
    { value: "ip-otp", label: "IP + OTP" },
];

export const DOCTOR_TYPE_OPTIONS: SelectOption[] = [
    { value: "team", label: "Team" },
    { value: "individual", label: "Individual" },
];

export const TEAM_OPTIONS: SelectOption[] = [
    { value: "", label: "Select" },
    { value: "dr-neha", label: "Dr. Neha" },
    { value: "dr-raj", label: "Dr. Raj" },
];

export const QUALIFICATION_OPTIONS: SelectOption[] = [
    { value: "", label: "--Select--" },
    { value: "bams", label: "BAMS" },
    { value: "bachelor-of-medicine", label: "Bachelor of Medicine" },
    { value: "pgdip", label: "PGDIP" },
    { value: "doctor-of-medicine-by-research", label: "Doctor of Medicine By Research" },
    { value: "doctor-of-philosophy", label: "Doctor of Philosophy" },
    { value: "master-of-clinical-medicine", label: "Master of clinical Medicine" },
];

export const SPECIALIZATION_DROPDOWN_OPTIONS: SelectOption[] = [
    { value: "cardiology", label: "Cardiology" },
    { value: "orthopedics", label: "Orthopedics" },
    { value: "general", label: "General" },
    { value: "pediatrics", label: "Pediatrics" },
    { value: "dermatology", label: "Dermatology" },
    { value: "ent", label: "ENT" },
];

export const STATUS_OPTIONS: SelectOption[] = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
];

let idCounter = 0;
function eid(): string {
    idCounter += 1;
    return `e-${idCounter}`;
}

export const SEED_DOCTORS: DoctorRecord[] = [
    {
        id: 1,
        branchId: "1",
        profileImageUrl: null,
        attachmentUrl: null,
        nameTitle: "Dr",
        name: "Shiv Ram Singh",
        email: "shivramsingh@jeenasikho.com",
        nabhRegistered: false,
        contact: "9462115565",
        altContact: "9462115565",
        yearsExperience: "2",
        department: "opd",
        opdFee: "0",
        loginType: "no-auth",
        doctorType: "team",
        selectTeam: "dr-neha",
        employeeId: "JS20752",
        status: "Active",
        createdAt: "19-03-2026 01:01 PM",
        address: "Ahmedabad",
        city: "Ahmedabad",
        bankName: "UCO",
        accountNumber: "059312345678",
        ifscCode: "UCO1234",
        education: [{ id: eid(), qualification: "bams", college: "College", completionYears: "4" }],
        specializations: [{ id: eid(), specialization: "general" }],
        registrations: [{ id: eid(), councilRegistrationNumber: "26958", councilName: "Council", year: "2020" }],
    },
    {
        id: 2,
        branchId: "2",
        profileImageUrl: null,
        attachmentUrl: null,
        nameTitle: "Dr",
        name: "Aakash Dave",
        email: "aakash@jeenasikho.com",
        nabhRegistered: true,
        contact: "9810000001",
        altContact: "",
        yearsExperience: "5",
        department: "opd",
        opdFee: "500",
        loginType: "no-auth",
        doctorType: "individual",
        selectTeam: "",
        employeeId: "JS30102",
        status: "Active",
        createdAt: "10-03-2026 10:00 AM",
        address: "Navi Mumbai",
        city: "Mumbai",
        bankName: "SBI",
        accountNumber: "1234567890",
        ifscCode: "SBIN0001",
        education: [{ id: eid(), qualification: "bachelor-of-medicine", college: "AIIMS", completionYears: "2015" }],
        specializations: [{ id: eid(), specialization: "orthopedics" }],
        registrations: [{ id: eid(), councilRegistrationNumber: "11223", councilName: "MCI", year: "2016" }],
    },
    {
        id: 3,
        branchId: "3",
        profileImageUrl: null,
        attachmentUrl: null,
        nameTitle: "Dr",
        name: "Priya Sharma",
        email: "priya.sharma@jeenasikho.com",
        nabhRegistered: false,
        contact: "9820000002",
        altContact: "9820000003",
        yearsExperience: "8",
        department: "ipd",
        opdFee: "700",
        loginType: "otp",
        doctorType: "team",
        selectTeam: "dr-raj",
        employeeId: "JS40111",
        status: "Active",
        createdAt: "05-02-2026 03:15 PM",
        address: "Sector 29",
        city: "Gurugram",
        bankName: "HDFC",
        accountNumber: "9988776655",
        ifscCode: "HDFC00099",
        education: [{ id: eid(), qualification: "doctor-of-medicine-by-research", college: "GMCH", completionYears: "2012" }],
        specializations: [{ id: eid(), specialization: "cardiology" }],
        registrations: [{ id: eid(), councilRegistrationNumber: "44556", councilName: "State Council", year: "2013" }],
    },
    {
        id: 4,
        branchId: "2",
        profileImageUrl: null,
        attachmentUrl: null,
        nameTitle: "Dr",
        name: "Rahul Verma",
        email: "rahul.verma@jeenasikho.com",
        nabhRegistered: true,
        contact: "9770000004",
        altContact: "",
        yearsExperience: "3",
        department: "opd",
        opdFee: "400",
        loginType: "no-auth",
        doctorType: "team",
        selectTeam: "dr-neha",
        employeeId: "JS51200",
        status: "Inactive",
        createdAt: "01-01-2026 09:00 AM",
        address: "Thane",
        city: "Mumbai",
        bankName: "",
        accountNumber: "",
        ifscCode: "",
        education: [{ id: eid(), qualification: "bachelor-of-medicine", college: "KEM", completionYears: "2018" }],
        specializations: [{ id: eid(), specialization: "general" }],
        registrations: [{ id: eid(), councilRegistrationNumber: "77889", councilName: "Council", year: "2019" }],
    },
    {
        id: 5,
        branchId: "1",
        profileImageUrl: null,
        attachmentUrl: null,
        nameTitle: "Dr",
        name: "Neha Gupta",
        email: "neha.gupta@jeenasikho.com",
        nabhRegistered: false,
        contact: "9650000005",
        altContact: "9650000006",
        yearsExperience: "6",
        department: "naturopathy",
        opdFee: "600",
        loginType: "ip-otp",
        doctorType: "individual",
        selectTeam: "",
        employeeId: "JS62001",
        status: "Active",
        createdAt: "12-12-2025 11:30 AM",
        address: "Bopal",
        city: "Ahmedabad",
        bankName: "ICICI",
        accountNumber: "5544332211",
        ifscCode: "ICIC0007",
        education: [{ id: eid(), qualification: "pgdip", college: "College", completionYears: "2014" }],
        specializations: [{ id: eid(), specialization: "orthopedics" }],
        registrations: [{ id: eid(), councilRegistrationNumber: "33445", councilName: "NMC", year: "2015" }],
    },
    {
        id: 6,
        branchId: "3",
        profileImageUrl: null,
        attachmentUrl: null,
        nameTitle: "Dr",
        name: "Vikram Singh",
        email: "vikram.singh@jeenasikho.com",
        nabhRegistered: false,
        contact: "9500000006",
        altContact: "",
        yearsExperience: "1",
        department: "opd",
        opdFee: "350",
        loginType: "no-auth",
        doctorType: "team",
        selectTeam: "dr-raj",
        employeeId: "JS73055",
        status: "Active",
        createdAt: "20-04-2026 08:45 AM",
        address: "DLF Phase 3",
        city: "Gurugram",
        bankName: "PNB",
        accountNumber: "1122334455",
        ifscCode: "PUNB0123",
        education: [{ id: eid(), qualification: "bachelor-of-medicine", college: "DU", completionYears: "2022" }],
        specializations: [{ id: eid(), specialization: "general" }],
        registrations: [{ id: eid(), councilRegistrationNumber: "99001", councilName: "Council", year: "2023" }],
    },
];

export function branchLabel(branchId: string): string {
    return STATIC_BRANCH_FILTER_OPTIONS.find((o) => o.value === branchId)?.label ?? "";
}

export function optionLabel(options: SelectOption[], value: string): string {
    return options.find((o) => o.value === value)?.label ?? value;
}

export type DoctorPayload = Omit<DoctorRecord, "id" | "createdAt">;

export function doctorRecordToPayload(record: DoctorRecord): DoctorPayload {
    const { id: _id, createdAt: _c, ...rest } = record;
    return rest;
}

export function createEmptyDoctorPayload(): DoctorPayload {
    const rid = () => Math.random().toString(36).slice(2, 11);
    return {
        branchId: "",
        profileImageUrl: null,
        attachmentUrl: null,
        nameTitle: "Dr",
        name: "",
        email: "",
        nabhRegistered: false,
        contact: "",
        altContact: "",
        yearsExperience: "",
        department: "",
        opdFee: "",
        loginType: "no-auth",
        doctorType: "team",
        selectTeam: "",
        employeeId: "",
        status: "Active",
        address: "",
        city: "",
        bankName: "",
        accountNumber: "",
        ifscCode: "",
        education: [{ id: rid(), qualification: "", college: "", completionYears: "" }],
        specializations: [{ id: rid(), specialization: "" }],
        registrations: [{ id: rid(), councilRegistrationNumber: "", councilName: "", year: "" }],
    };
}

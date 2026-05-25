import type { SelectOption } from "@/components/ui/FormSelectField";

export type NurseStatus = "Active" | "Inactive";

/** Form / client state for nurse add & edit. */
export type NursePayload = {
    branchId: string;
    /** Optional — profile image file is not required. */
    imgUrl: string | null;
    name: string;
    email: string;
    address: string;
    phone: string;
    empId: string;
    loginType: string;
    /** Selected role id for API `roleId`. */
    roleId: string;
    status: NurseStatus;
};

/** API values: `ip` | `otp` | `ip-otp` | `no-auth` */
export const NURSE_LOGIN_TYPE_OPTIONS: SelectOption[] = [
    { value: "ip", label: "IP" },
    { value: "otp", label: "OTP" },
    { value: "ip-otp", label: "IP/OTP" },
    { value: "no-auth", label: "No Authentication" },
];

export const NURSE_STATUS_OPTIONS: SelectOption[] = [
    { value: "Active", label: "Active" },
    { value: "Inactive", label: "Inactive" },
];

export function createEmptyNursePayload(): NursePayload {
    return {
        branchId: "",
        imgUrl: null,
        name: "",
        email: "",
        address: "",
        phone: "",
        empId: "",
        loginType: "ip",
        roleId: "",
        status: "Active",
    };
}

/** Local seed row for camp / visit mock lists. */
export type NurseRecord = NursePayload & {
    id: number;
    createdAt?: string;
};

export const SEED_NURSES: NurseRecord[] = [
    {
        id: 1,
        branchId: "2",
        imgUrl: null,
        name: "Priya Sharma",
        email: "priya.sharma@jeenasikho.com",
        address: "Navi Mumbai",
        phone: "9876543210",
        empId: "NS10001",
        loginType: "ip",
        roleId: "3",
        status: "Active",
        createdAt: "19-03-2026 01:01 PM",
    },
];

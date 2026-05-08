import { createElement, type ReactNode } from "react";
import type { AppointmentDetailItem } from "@/components/ui/AppointmentDetailCard";
import type { PatientWalletDetailItem } from "@/components/ui/PatientWalletInformationCard";
import type { ReferralPatientInfoItem } from "@/components/ui/referralPatientInfo";
import type { OtherInformationItem } from "@/components/ui/OtherInformationCard";
import type { PatientDetailsBadge, PatientDetailsInfoItem } from "@/components/ui/PatientDetailsCard";
import type { VitalItem } from "@/components/ui/VitalsCard";
import type { MedicalInformationItem } from "@/components/ui/MedicalInformationCard";
import type { PatientFileItem } from "@/components/ui/PatientFilesCard";
import type { JsHealthCardPointsItem } from "@/components/ui/JsHealthCardPointsCard";
import type { PatientSummaryInfoItem } from "@/components/ui/PatientSummaryHeaderCard";
import type { TableListingSection } from "@/components/ui/TableListingCard";

export type LegacyOpdAppointmentApi = Record<string, string | null | undefined>;
export type LegacyOpdRegistrationApi = Record<string, string | null | undefined>;

export type LegacyOpdPatientDetailData = {
    appointment?: LegacyOpdAppointmentApi;
    registration?: LegacyOpdRegistrationApi;
};

export type LegacyPatientFileApi = {
    uhid?: string | null;
    fileName?: string | null;
    path?: string | null;
    fileType?: string | null;
    description?: string | null;
    added_by?: string | null;
    uploadedBy?: string | null;
    created_at?: string | null;
};

export type LegacyWalletPackageApi = Record<string, string | null | undefined>;
export type LegacyWalletInstallmentApi = Record<string, string | null | undefined>;
export type LegacyWalletOrderApi = Record<string, string | null | undefined>;
export type LegacyWalletRefundApi = Record<string, string | null | undefined>;

export type LegacyPatientWalletData = {
    package?: LegacyWalletPackageApi[];
    installment?: LegacyWalletInstallmentApi[];
    orders?: LegacyWalletOrderApi[];
    refund?: LegacyWalletRefundApi[];
};

export function dash(v: string | null | undefined): string {
    const t = (v ?? "").trim();
    return t || "-";
}

const TABLE_EMPTY = "No Data Available";

function patientFileDownloadCell(path: string | null | undefined, fileLabel: string): ReactNode {
    const url = (path ?? "").trim();
    if (!url) return "-";
    return createElement(
        "a",
        {
            href: url,
            target: "_blank",
            rel: "noopener noreferrer",
            className:
                "inline-flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(11,140,0,0.05)] shadow-[0px_6px_30px_rgba(0,0,0,0.08)] transition-colors hover:bg-[rgba(11,140,0,0.12)]",
            "aria-label": `Download ${fileLabel}`,
        },
        createElement("img", {
            src: "/icons/filedownload.svg",
            alt: "Download",
            width: 20,
            height: 20,
            className: "h-5 w-5",
        })
    );
}

function walletOrderHistoryViewActionCell(
    rowKey: string,
    orderId: string | null | undefined,
    onViewOrderDetail?: (orderId: string) => void
): ReactNode {
    const normalizedOrderId = (orderId ?? "").trim();
    return createElement(
        "button",
        {
            key: `wallet-order-view-${rowKey}`,
            type: "button",
            onClick:
                normalizedOrderId && onViewOrderDetail
                    ? () => onViewOrderDetail(normalizedOrderId)
                    : undefined,
            disabled: !normalizedOrderId || !onViewOrderDetail,
            className:
                "flex h-6 w-6 items-center justify-center cursor-pointer rounded transition-colors hover:bg-[#F7FAF7]",
            "aria-label": "View order details",
        },
        createElement("img", {
            src: "/icons/ViewEyeIcon.svg",
            alt: "View",
            width: 20,
            height: 20,
        })
    );
}

function walletPackageStatusCell(status: string | null | undefined): ReactNode {
    const s = (status ?? "").trim();
    const label = s === "0" ? "Active" : s === "1" ? "Inactive" : dash(status);
    if (label === "-") return "-";
    const active = s === "0";
    return createElement(
        "span",
        {
            className: `inline-flex h-[30px] min-w-[76px] items-center justify-center rounded-[30px] border py-2 px-5 text-xs leading-[120%] ${
                active ? "border-[#0B8C00]/20 bg-white text-[#0B8C00]" : "border-[#9CA3AF]/20 bg-white text-[#9CA3AF]"
            }`,
        },
        label
    );
}

function decodeHtmlEntities(s: string): string {
    return s
        .replace(/&#0*39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&");
}

function maskContact(phone: string | null | undefined): string {
    const cleaned = (phone ?? "").replace(/\D/g, "");
    if (cleaned.length < 4) return dash(phone);
    return "XXXXXX" + cleaned.slice(-4);
}

const BLOOD_BADGE_CLASS =
    "inline-flex h-[30px] min-w-[86px] me-2 items-center justify-center rounded-[30px] border px-5 text-xs font-medium border-[#F6776E]/24 bg-[#F6776E0D] text-[#F6776E]";
const TYPE_BADGE_CLASS =
    "inline-flex h-[30px] min-w-[76px] items-center justify-center rounded-[30px] border py-2 px-5 text-xs leading-[120%] border-[#0B8C00]/20 bg-white text-[#0B8C00]";

export function buildAppointmentDetailItems(appt: LegacyOpdAppointmentApi | undefined): AppointmentDetailItem[] {
    if (!appt) return [];
    const created = dash(appt.created_at);
    return [
        { label: "UHID", value: dash(appt.uhid) },
        { label: "OPD ID", value: dash(appt.id) },
        { label: "Branch", value: dash(appt.branch_name) },
        { label: "Doctor", value: dash(appt.doctor_name) },
        { label: "Doctor OPD Fee", value: dash(appt.doctor_fee) },
        { label: "Entry Fee", value: dash(appt.entry_fee) },
        { label: "Appointment Date", value: dash(appt.date_app) },
        { label: "Time Slot", value: dash(appt.time_slot) },
        { label: "Created Date", value: created },
        {
            label: "Remark",
            value: dash(appt.remark),
            multiline: true,
        },
    ];
}

export function buildPatientDetailsFromRegistration(reg: LegacyOpdRegistrationApi | undefined): {
    name: string;
    subtitle: string;
    badges: PatientDetailsBadge[];
    infoItems: PatientDetailsInfoItem[];
} {
    if (!reg) {
        return { name: "-", subtitle: "-", badges: [], infoItems: [] };
    }
    const contact = maskContact(reg.contact_number as string);
    const addrParts = [reg.address, reg.area, reg.city, reg.state, reg.country].map((x) => (x ?? "").trim()).filter(Boolean);
    const address = addrParts.join(", ") || "-";

    const badges: PatientDetailsBadge[] = [];
    const bg = dash(reg.blood_group as string);
    if (bg !== "-") badges.push({ label: bg, className: BLOOD_BADGE_CLASS });
    const pt = dash(reg.patient_type as string);
    if (pt !== "-") badges.push({ label: pt, className: TYPE_BADGE_CLASS });

    const infoItems: PatientDetailsInfoItem[] = [
        {
            iconSrc: "/icons/UserGear.svg",
            iconAlt: "Parent",
            label: "Father’s/Husband’s Name",
            value: dash(reg.parent_name as string),
        },
        {
            iconSrc: "/icons/gendericon.svg",
            iconAlt: "Marital",
            label: "Marital Status",
            value: dash(reg.marital_status as string),
        },
        {
            iconSrc: "/icons/mapicon.svg",
            iconAlt: "Address",
            label: "Address",
            value: address,
        },
        {
            iconSrc: "/icons/adharcardicon.svg",
            iconAlt: "Aadhar",
            label: "Aadhar Card Number",
            value: dash(reg.aadhar_card_no as string),
        },
    ];

    return {
        name: dash(reg.patient as string),
        subtitle: `Contact Number: ${contact} • Age : ${dash(reg.age as string)} Years • Gender : ${dash(reg.gender as string)}`,
        badges,
        infoItems,
    };
}

export function buildVitals(
    appt: LegacyOpdAppointmentApi | undefined,
    reg: LegacyOpdRegistrationApi | undefined
): VitalItem[] {
    return [
        { label: "Blood Pressure", value: dash(appt?.blood_pressure as string), unit: "bp" },
        { label: "Sugar Level", value: dash(appt?.sugar_level as string), unit: "mg/dL" },
        { label: "Temperature", value: dash(appt?.temperature as string), unit: "" },
        { label: "Heart Rate", value: dash(reg?.pulse as string), unit: "bpm" },
    ];
}

export function buildReferralItems(reg: LegacyOpdRegistrationApi | undefined): ReferralPatientInfoItem[] {
    return [
        { label: "Source", value: dash(reg?.source as string) },
        { label: "Sub Source", value: dash(reg?.api_source as string) },
        { label: "Referral Clinic", value: dash(reg?.referral_clinic as string) },
        { label: "Referral Name", value: dash(reg?.agent_id as string) },
        { label: "Mobile", value: reg?.contact_number ? maskContact(reg.contact_number as string) : "-" },
    ];
}

export function buildOtherInformationItems(reg: LegacyOpdRegistrationApi | undefined): OtherInformationItem[] {
    return [
        { label: "Patient Type", value: dash(reg?.patient_type as string) },
        { label: "Patient Sub Type", value: dash(reg?.patient_sub_type as string) },
        { label: "Benificiary ID", value: dash(reg?.benificiary_id as string) },
        { label: "Insurance Company", value: dash(reg?.insurance_company as string) },
        { label: "Ayush Covered", value: dash(reg?.ayush_covered as string) },
        { label: "Scheme Type", value: dash(reg?.scheme_type as string) },
    ];
}

export function buildMedicalItems(reg: LegacyOpdRegistrationApi | undefined): MedicalInformationItem[] {
    if (!reg) return [];
    const heightRaw = decodeHtmlEntities(dash(reg.height as string));
    return [
        { label: "Diagnosis", value: dash(reg.diagnosis as string) },
        { label: "Sub Diagnosis", value: dash(reg.sub_diagnosis as string) },
        { label: "Blood Group", value: dash(reg.blood_group as string) },
        { label: "Allergies", value: dash(reg.allergies as string) },
        { label: "Surgeries", value: dash(reg.surgeries as string) },
        { label: "Addiction", value: dash(reg.addiction as string).replace(/;+$/, "") },
        { label: "Height", value: heightRaw },
        { label: "Weight", value: dash(reg.weight as string) },
        { label: "Diet Type", value: dash(reg.diet_type as string) },
        {
            label: "Remark",
            value: dash(reg.remark as string),
            multiline: true,
        },
    ];
}

export function buildPatientFileCardItems(files: LegacyPatientFileApi[]): PatientFileItem[] {
    return files.map((f, i) => ({
        name: dash(f.fileName),
        size: [dash(f.fileType), f.created_at ? String(f.created_at).split(" ")[0] : ""].filter((x) => x && x !== "-").join(" · ") || "-",
        downloadUrl: (f.path ?? "").trim() || undefined,
    }));
}

export function buildPatientWalletCardProps(wallet: LegacyPatientWalletData | null): {
    remainingAmount: string;
    details: PatientWalletDetailItem[];
} {
    const first = wallet?.package?.[0];
    const remaining = dash(first?.remaning_amount as string);
    const details: PatientWalletDetailItem[] = first
        ? [
              { label: "Package", value: dash(first.package_name as string) },
              { label: "Amount", value: dash(first.amount as string) },
              { label: "Discount", value: dash(first.discount as string) },
              { label: "Expire", value: dash(first.expire as string)?.split(" ")[0] ?? "-" },
              { label: "Months", value: dash(first.months as string) },
              { label: "Status", value: dash(first.status as string) },
          ]
        : [{ label: "Package", value: "-" }];

    const rupee = remaining !== "-" && remaining !== "" && !remaining.startsWith("Rs") ? `Rs. ${remaining}` : remaining;
    return {
        remainingAmount: rupee === "-" ? "Rs. 0.00" : rupee,
        details,
    };
}

export function buildJsHealthCardItems(wallet: LegacyPatientWalletData | null): JsHealthCardPointsItem[] {
    const p = wallet?.package?.[0];
    if (!p) {
        return [
            { id: "empty", label: "Package", value: "-" },
            { id: "e2", label: "Amount", value: "-" },
            { id: "e3", label: "Discount", value: "-" },
            { id: "e4", label: "Expire", value: "-" },
        ];
    }
    return [
        { id: "pkg", label: "Package", value: dash(p.package_name as string) },
        { id: "amt", label: "Amount", value: dash(p.amount as string) },
        { id: "disc", label: "Discount", value: dash(p.discount as string) },
        { id: "exp", label: "Expire", value: (dash(p.expire as string) || "-").split(" ")[0] },
    ];
}

export function buildPatientSummaryItems(uhid: string, contact: string): PatientSummaryInfoItem[] {
    return [
        {
            id: "sum-uhid",
            iconSrc: "/icons/uhidicon.svg",
            iconAlt: "UHID",
            label: "UHID",
            value: dash(uhid),
        },
        {
            id: "sum-contact",
            iconSrc: "/icons/iconcontact.svg",
            iconAlt: "Contact",
            label: "Contact",
            value: contact ? maskContact(contact) : "-",
        },
    ];
}

export function buildPatientFilesTableSection(files: LegacyPatientFileApi[]): TableListingSection {
    const rows = files.map((f, index) => [
        String(index + 1),
        dash(f.uhid),
        dash(f.fileName),
        dash(f.fileType),
        (f.path ?? "").trim().split("/").pop() || "-",
        dash(f.uploadedBy),
        dash(f.added_by),
        (f.created_at ?? "").split(" ")[0] || "-",
        patientFileDownloadCell(f.path, dash(f.fileName)),
    ]);

    return {
        id: "patient-files-dynamic",
        title: "Patient Files",
        columns: [
            { label: "Sr no.", position: "first" },
            { label: "UHID" },
            { label: "File Name" },
            { label: "File Type" },
            { label: "File" },
            { label: "Uploaded By" },
            { label: "Added By" },
            { label: "Date" },
            { label: "Action", position: "last" },
        ],
        rows,
        emptyMessage: files.length === 0 ? TABLE_EMPTY : undefined,
    };
}

const WALLET_PACKAGE_COLUMNS = [
    { label: "Sr no.", position: "first" as const },
    { label: "Package" },
    { label: "Total₹" },
    { label: "Discount%" },
    { label: "Package₹" },
    { label: "Wallet₹" },
    { label: "Pending₹" },
    { label: "Join Date" },
    { label: "Added By (Branch)" },
    { label: "Add Amount" },
    { label: "Status" },
    { label: "Action", position: "last" as const },
];

const WALLET_INSTALLMENT_COLUMNS = [
    { label: "Sr no.", position: "first" as const },
    { label: "Deposit" },
    { label: "Payment Method" },
    { label: "Transaction" },
    { label: "Remark" },
    { label: "Date", position: "last" as const },
];

const WALLET_ORDER_COLUMNS = [
    { label: "Order#", position: "first" as const },
    { label: "Sell Type" },
    { label: "Wallet Id" },
    { label: "Order₹" },
    { label: "Pay₹" },
    { label: "Discount" },
    { label: "Outstanding Method" },
    { label: "Outstanding₹" },
    { label: "Transactions" },
    { label: "Payment Status" },
    { label: "Purchase Date" },
    { label: "Action", position: "last" as const },
];

const WALLET_REFUND_COLUMNS = [
    { label: "Wallet Id#", position: "first" as const },
    { label: "Requested By" },
    { label: "Approved By" },
    { label: "Refund Amount" },
    { label: "Reason" },
    { label: "Method" },
    { label: "Bank Name" },
    { label: "Bank Account" },
    { label: "IFSC Code" },
    { label: "Status" },
    { label: "Date", position: "last" as const },
];

/** Wallet tab: Package → Installments → Order History → Refund; empty sections show “No Data Available”. */
export function buildWalletTabTableSections(
    wallet: LegacyPatientWalletData | null | undefined,
    onViewOrderDetail?: (orderId: string) => void
): TableListingSection[] {
    const w: LegacyPatientWalletData = wallet ?? {
        package: [],
        installment: [],
        orders: [],
        refund: [],
    };

    const packageRows =
        w.package?.map((p, i) => [
            String(i + 1),
            dash(p.package_name as string),
            dash(p.totalamount as string),
            dash(p.discount as string),
            dash(p.package_amount as string),
            dash(p.amount as string),
            dash(p.remaning_amount as string),
            (p.created_at ?? "").split(" ")[0] || "-",
            dash(p.added_by as string),
            dash(p.amount as string),
            walletPackageStatusCell(p.status as string),
            "-",
        ]) ?? [];

    const installmentRows =
        w.installment?.map((ins, i) => [
            String(i + 1),
            dash(ins.deposit as string),
            dash(ins.payment_method as string),
            dash(ins.transaction as string),
            dash(ins.remark as string),
            (ins.created_at ?? "").split(" ")[0] || "-",
        ]) ?? [];

    const orderRows =
        w.orders?.map((o, idx) => {
            const rowKey = `${String(o.order_id ?? "").trim() || "row"}-${idx}`;
            return [
                dash(o.order_id as string),
                dash(o.transaction as string),
                dash(o.patient_wallet_id as string),
                dash(o.before_discount_ammount as string),
                dash(o.after_discount_amount as string),
                "-",
                dash(o.outstandingMethod as string),
                dash(o.outstandingAmount as string),
                dash(o.arogya_coins as string),
                dash(o.full_deduction as string),
                (o.created_at ?? "").split(" ")[0] || "-",
                walletOrderHistoryViewActionCell(rowKey, o.order_id as string, onViewOrderDetail),
            ];
        }) ?? [];

    const refundRows =
        w.refund?.map((r) => [
            dash(r.id as string),
            dash(r.request as string),
            dash(r.approved as string),
            dash(r.refund_amount as string),
            dash(r.reason as string),
            dash(r.payment_method as string),
            dash(r.bank_name as string),
            dash(r.bank_account as string),
            dash(r.bank_ifsc as string),
            dash(r.status as string),
            (r.created_at ?? "").split(" ")[0] || "-",
        ]) ?? [];

    return [
        {
            id: "wallet-package",
            title: "Package",
            columns: WALLET_PACKAGE_COLUMNS,
            rows: packageRows,
            emptyMessage: packageRows.length === 0 ? TABLE_EMPTY : undefined,
        },
        {
            id: "wallet-installment",
            title: "Installments",
            columns: WALLET_INSTALLMENT_COLUMNS,
            rows: installmentRows,
            emptyMessage: installmentRows.length === 0 ? TABLE_EMPTY : undefined,
        },
        {
            id: "wallet-order-history",
            title: "Order History",
            columns: WALLET_ORDER_COLUMNS,
            rows: orderRows,
            emptyMessage: orderRows.length === 0 ? TABLE_EMPTY : undefined,
        },
        {
            id: "wallet-refund",
            title: "Refund",
            columns: WALLET_REFUND_COLUMNS,
            rows: refundRows,
            emptyMessage: refundRows.length === 0 ? TABLE_EMPTY : undefined,
        },
    ];
}

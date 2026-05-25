"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";

import {
    AppointmentDetailCard,
    type AppointmentDetailItem,
    Button,
    DietPlanCard,
    type DietPlanEntry,
    type DietPlanHeaderAction,
    DietHistoryCard,
    type DietHistoryVisit,
    FormSelectField,
    HealthCardPreview,
    IafQuestionSectionsCard,
    IafTonguePulseExamCard,
    JsHealthCardPointsCard,
    type IafExplainAboutGridBlock,
    type IafTonguePulseExamFieldItem,
    type JsHealthCardPointsItem,
    MedicalInformationCard,
    type MedicalInformationItem,
    MedicineCard,
    type MedicineCardItem,
    NutritionalAssessmentCard,
    type NutritionalAssessmentItem,
    PatientFilesCard,
    type PatientFileItem,
    PatientFullHistoryCard,
    type PatientFullHistoryFieldItem,
    PatientSummaryHeaderCard,
    type PatientSummaryInfoItem,
    TableListingCard,
    type TableListingSection,
    Pagination,
    RefreshButton,
    BackToPreviousPageButton,
    Table,
    TableBody,
    TableData,
    TableHead,
    TableHeader,
    TableRow,
    TableSearchInput,
    OtherInformationCard,
    type OtherInformationItem,
    ReferralPatientInfoCard,
    type ReferralPatientInfoItem,
    PatientDetailsCard,
    PatientInformationTimelineCard,
    type PatientInformationTimelineItem,
    type PatientDetailsBadge,
    type PatientDetailsInfoItem,
    type PatientWalletDetailItem,
    PatientWalletInformationCard,
    type VitalItem,
    VitalsCard,
    Tooltip, Tabs,
    SpinnerLoader,
    WalletOrderDetailsView,
    type WalletOrderDetailItemRecord,
    type WalletOrderDetailRecord,
    LabTestNoDataCard,
    PatientPackageListingCard,
    type PatientPackageListingItem,
    PatientRoomListingCard,
    type PatientRoomListingItem,
    PatientReportListingCard,
    type PatientReportListingItem,
} from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import DateFilterDropdown from "@/components/registration/DateFilterDropdown";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { useDebounce } from "@/hooks/useDebounce";
import { useGetBranchesQuery } from "@/store/api/settingsApi";
import type { SelectOption } from "@/components/ui/FormSelectField";
import {
    buildAppointmentDetailItems,
    buildJsHealthCardItems,
    buildMedicalItems,
    buildOtherInformationItems,
    buildPatientDetailsFromRegistration,
    buildPatientFileCardItems,
    buildPatientFilesTableSection,
    buildPatientSummaryItems,
    buildPatientWalletCardProps,
    buildReferralItems,
    buildVitals,
    buildWalletTabTableSections,
    maskContact,
    type LegacyOpdPatientDetailData,
    type LegacyPatientFileApi,
    type LegacyPatientWalletData,
} from "@/lib/patientOpdLegacyUi";
import {
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
} from "@/store/api/v3OldHiimsApis";
import BillOfSupplyPDF, { type BillOfSupplyHandle, type BillOfSupplyProps } from "@/lib/utils/billOfSupplypdf";
import TaxInvoice, { type TaxInvoiceHandle, type TaxInvoiceProps } from "@/lib/utils/taxInvoice";
import InvoiceSinglePaymentReceipt, { type BillOfSupplyHandle as SankalpSingleHandle, type WalletInvoiceData } from "@/lib/utils/invoiceShuddhiSankalpSinglePaymentReceipt";
import InvoiceWallet, { type BillOfSupplyHandle as SankalpWalletHandle } from "@/lib/utils/invoiceShuddhiSankalpWallet";

type OldOpdRow = {
    id: number;
    branchId: number;
    uhid: string;
    token: string;
    opdId: string;
    name: string;
    doctor: string;
    appointmentDate: string;
    appointmentTime: string;
    gender: string;
    age: string;
    type: string;
    city: string;
    state: string;
    country: string;
    createdAt: string;
};

type LegacyOpdApiItem = {
    id: string;
    uhid: string | null;
    branch_id: string | null;
    patient_ipd_id: string | null;
    doctor_id: string | null;
    date_app: string | null;
    time_slot: string | null;
    token: string | null;
    created_at: string | null;
    patient_name: string | null;
    gender: string | null;
    age: string | null;
    patient_panel: string | null;
};

type LegacyOpdApiResponse = {
    status?: boolean;
    message?: string;
    total_records?: number;
    data?: LegacyOpdApiItem[];
};

type LegacyPatientDetailApiResponse = {
    status?: boolean;
    message?: string;
    data?: {
        patient?: Record<string, string | null | undefined>;
        registration?: Record<string, string | null | undefined>;
    };
};

const DOCTOR_OPTIONS = [
    { value: "all", label: "Select Doctor" },

];

const APPOINTMENT_DETAIL_ITEMS: AppointmentDetailItem[] = [
    { label: "UHID", value: "JSDB50352025" },
    { label: "OPD ID", value: "863471" },
    { label: "Branch", value: "HIIMS Derabassi" },
    { label: "Doctor", value: "Dr.Suyash Pratap Singh" },
    { label: "Doctor OPD Fee", value: "500" },
    { label: "Entry Fee", value: "100" },
    { label: "Appointment Date", value: "26-11-2025" },
    { label: "Time Slot", value: "10:11:53" },
    { label: "Created Date", value: "26-11-2025 10:34 AM" },
    {
        label: "Remark",
        value: "Mild abdominal discomfort and reduced appetite for the past 24 hours.",
        multiline: true,
    },
];

const PATIENT_WALLET_DETAILS: PatientWalletDetailItem[] = [
    { label: "Package", value: "Gold Health Package" },
    { label: "Amount", value: "5000" },
    { label: "Discount", value: "20%" },
    { label: "Expire", value: "30-12-2025" },
];

const REFERRAL_DETAIL_ITEMS: ReferralPatientInfoItem[] = [
    { label: "Source", value: "N/A" },
    { label: "Sub Source", value: "N/A" },
    { label: "Referral Doctor", value: "N/A" },
    { label: "Referral Name", value: "N/A" },
    { label: "Mobile", value: "N/A" },
];

const OTHER_INFORMATION_ITEMS: OtherInformationItem[] = [
    { label: "Patient Type", value: "Private" },
    { label: "Patient Sub Type", value: "N\\A" },
    { label: "Benificiary ID", value: "N\\A" },
    { label: "Insurance Company", value: "N\\A" },
    { label: "Ayush Covered", value: "N\\A" },
];

const PATIENT_DETAILS_BADGES: PatientDetailsBadge[] = [
    {
        label: "AB+",
        className:
            "inline-flex h-[30px] min-w-[86px] me-2 items-center justify-center rounded-[30px] border px-5 text-xs font-medium border-[#F6776E]/24 bg-[#F6776E0D] text-[#F6776E]",
    },
    {
        label: "N/A",
        className:
            "inline-flex h-[30px] min-w-[76px] items-center justify-center rounded-[30px] border py-2 px-5 text-xs leading-[120%] border-[#0B8C00]/20 bg-white text-[#0B8C00]",
    },
];

const PATIENT_DETAILS_INFO_ITEMS: PatientDetailsInfoItem[] = [
    {
        iconSrc: "/icons/UserGear.svg",
        iconAlt: "UserGear Details",
        label: "Father’s/Husband’s Name",
        value: "Edward jones",
    },
    {
        iconSrc: "/icons/gendericon.svg",
        iconAlt: "Marital Details",
        label: "Marital Status",
        value: "Married",
    },
    {
        iconSrc: "/icons/mapicon.svg",
        iconAlt: "mapicon Details",
        label: "Address",
        value: "123 Main Street, City, State, ZIP",
    },
    {
        iconSrc: "/icons/adharcardicon.svg",
        iconAlt: "Adhar Card Details",
        label: "Aadhar Card Number",
        value: "135331313131",
    },
];

const VITALS_ITEMS: VitalItem[] = [
    { label: "Blood Pressure", value: "125/85", unit: "bp" },
    { label: "Sugar Level", value: "115", unit: "mg/dL" },
    { label: "Temperature", value: "98.6", unit: "°C" },
    { label: "Heart Rate", value: "72", unit: "bpm" },
];

const DIET_PLAN_HEADER_ACTIONS: DietPlanHeaderAction[] = [
    { iconSrc: "/icons/dietedit.svg", iconAlt: "Diet Edit", href: "#" },
    { iconSrc: "/icons/dietprint.svg", iconAlt: "Diet Print", href: "#" },
    { iconSrc: "/icons/dietadd.svg", iconAlt: "Diet Add", href: "#" },
];

const DIET_PLAN_ROWS: DietPlanEntry[][] = [
    [
        { label: "Dinner Time", value: "09:00" },
        { label: "Sleeping time", value: "10:00" },
        { label: "Wake up time", value: "06:00" },
    ],
    [
        { label: "Little Millet", value: "6 days" },
        { label: "Barnyard Millet", value: "5 days" },
        { label: "Kodo Millet", value: "5 days" },
    ],
    [
        { label: "Foxtail Millet", value: "6 days" },
        { label: "Browtop Millet", value: "5 days" },
        { label: "Room Service", value: "Yes" },
    ],
];

const PATIENT_INFORMATION_TIMELINE_ITEMS: PatientInformationTimelineItem[] = [
    {
        dateLabel: "21/10/2024 – Follow-up Visit",
        detail: {
            primaryComplaintTitle: "Primary Complaint",
            primaryComplaintText: "Mild abdominal discomfort and reduced appetite for the past 24 hours.",
            detailsTitle: "Details",
            detailsItems: [
                "Intermittent abdominal cramps",
                "Mild nausea, no vomiting",
                "Feeling weak and less active",
            ],
            actionsTitle: "Actions",
            actionItems: [
                "Vitals recorded – normal",
                "Initial OPD examination",
                "Advised hydration & observation",
            ],
        },
    },
    { dateLabel: "22/10/2024" },
    { dateLabel: "23/10/2024" },
];

const MEDICAL_INFORMATION_ITEMS: MedicalInformationItem[] = [
    { label: "Diagnosis", value: "Alopecia" },
    { label: "Disease", value: "Alopecia Areata" },
    { label: "Blood Group", value: "A+" },
    { label: "Allergies", value: "No" },
    { label: "Surgeries", value: "No" },
    { label: "Addiction", value: "No" },
    { label: "Height", value: "5.8" },
    { label: "Weight", value: "80kg" },
    { label: "Diet Type", value: "Vegetarian" },
    {
        label: "Remark",
        value: "Mild abdominal discomfort and reduced appetite for the past 24 hours.",
        multiline: true,
    },
];

const MEDICINE_ITEMS: MedicineCardItem[] = [
    {
        name: "Dr. BP Care Tablet 60 Tab.",
        description: "Manage patient prescriptions and medications.",
    },
    {
        name: "Dr. BP Care Tablet 60 Tab.",
        description: "Manage patient prescriptions and medications.",
    },
];

const PATIENT_FILE_ITEMS: PatientFileItem[] = [
    { name: "Checkup Result.pdf", size: "230kb" },
    { name: "dental x-ray result.pdf", size: "230kb" },
];

const NUTRITIONAL_ASSESSMENT_ITEMS: NutritionalAssessmentItem[] = [
    {
        id: "iaf-nutrition-diabetes",
        label: "Diabetes",
        status: "Yes",
        remarks:
            "Diagnosed 2 years ago. Currently on oral medication. Blood sugar moderately controlled.",
    },
    {
        id: "iaf-nutrition-htn",
        label: "HTN – Hypertension",
        status: "Yes",
        remarks: "On regular medication. Average BP 130/90 mmHg. No recent complications.",
    },
    {
        id: "iaf-nutrition-cad",
        label: "Coronary Artery Disease",
        status: "No",
        remarks: "No history of chest pain or cardiac events.",
    },
    {
        id: "iaf-nutrition-thyroid",
        label: "Thyroid",
        status: "Yes",
        remarks: "Taking daily thyroxine. TSH within normal range.",
    },
    {
        id: "iaf-nutrition-menstrual",
        label: "Menstrual",
        status: "Yes",
        remarks: "No pain, normal cycle of 28-30 days.",
    },
];

const DIET_HISTORY_VISITS: DietHistoryVisit[] = [
    {
        id: "diet-visit-1",
        date: "2026-05-04",
        dietDetail: "test diet details",
    },
];

const IAF_GENERAL_QUESTION_ITEMS: NutritionalAssessmentItem[] = [
    {
        id: "iaf-gen-allergy-food",
        label: "Are you allergic to any food or drink?",
        status: "Yes",
        remarks: "Allergic to peanuts and soy products.",
    },
    {
        id: "iaf-gen-vitamins",
        label: "Do you take any vitamins, minerals and/or food supplements?",
        status: "No",
        remarks: "No vitamins or supplements currently taken.",
    },
    {
        id: "iaf-gen-injuries",
        label: "Have you had any major injuries, hospitalizations, or operations?",
        status: "Yes",
        remarks: "History of major injuries and surgeries.",
    },
    {
        id: "iaf-gen-chronic",
        label: "Do you have any chronic illnesses?",
        status: "Yes",
        remarks: "Mild asthma since childhood, uses inhaler occasionally.",
    },
    {
        id: "iaf-gen-meds-yes",
        label: "Do you take any medications on a regular basis?",
        status: "Yes",
        remarks: "Thyroid medicine (Thyroxine 50 mcg daily).",
    },
    {
        id: "iaf-gen-meds-no",
        label: "Do you take any medications on a regular basis?",
        status: "No",
        remarks: "N/A",
    },
    {
        id: "iaf-gen-depression",
        label: "Have you ever been diagnosed or do you suffer from depression?",
        status: "No",
        remarks: "N/A",
    },
    {
        id: "iaf-gen-eating-disorder",
        label: "Have you been diagnosed with an eating disorder (anorexia, bulimia, binge eating)?",
        status: "No",
        remarks: "N/A",
    },
];

const IAF_EXPLAIN_ABOUT_GRIDS: IafExplainAboutGridBlock[] = [
    {
        columns: 2,
        items: [
            {
                id: "iaf-explain-appetite",
                label: "Appetite",
                text: "Moderate appetite, usually feels hungry on time.",
            },
            {
                id: "iaf-explain-food-habits",
                label: "Food Habits",
                text: "Vegetarian, prefers home-cooked meals, avoids oily food.",
            },
            {
                id: "iaf-explain-working-hours",
                label: "Daily Working Hours",
                text: "8–9 hours per day, mostly desk work.",
            },
            {
                id: "iaf-explain-exercise",
                label: "Exercise",
                text: "Walks 30 minutes daily, occasional yoga on weekends.",
            },
        ],
    },
    {
        columns: 3,
        className: "mt-4",
        items: [
            {
                id: "iaf-explain-job-profile",
                label: "Job Profile",
                text: "Software Developer",
            },
            {
                id: "iaf-explain-height",
                label: "Height",
                text: "5 feet 6 inches",
            },
            {
                id: "iaf-explain-weight",
                label: "Weight",
                text: "68 kg",
            },
        ],
    },
];

const IAF_TONGUE_PULSE_EXAM_ITEMS: IafTonguePulseExamFieldItem[] = [
    { id: "iaf-tongue-color-coating", label: "Color Of Coating", value: "Whitish-yellow coating" },
    { id: "iaf-tongue-swelling", label: "Swelling", value: "Mild swelling present on the lateral edges" },
    { id: "iaf-tongue-ulcers", label: "Ulcers", value: "Small superficial ulcers on the right side" },
    { id: "iaf-tongue-coating-thickness", label: "Coating Thickness", value: "Medium thickness coating evenly spread" },
    { id: "iaf-tongue-shape", label: "Shape", value: "Slightly enlarged with rounded edges" },
    { id: "iaf-tongue-texture", label: "Texture", value: "Moist and smooth surface" },
    { id: "iaf-tongue-saliva", label: "Saliva", value: "Excessive salivation noted" },
    { id: "iaf-tongue-sublingual-vein", label: "Sublingual Vein", value: "Prominent and slightly darkened veins" },
    { id: "iaf-tongue-red-dot", label: "Red Dot Tongue", value: "Few red papules present on the tip" },
];

const PATIENT_FULL_HISTORY_CHIEF_COMPLAINTS: PatientFullHistoryFieldItem[] = [
    {
        id: "iaf-history-symptoms-1",
        label: "Symptoms",
        value: "Whitish-yellow coating",
    },
    {
        id: "iaf-history-days-duration-1",
        label: "Days Duration",
        value: "18 days",
    },
    {
        id: "iaf-history-symptoms-2",
        label: "Symptoms",
        value: "Abdominal discomfort, occasional bloating, and loss of appetite.",
    },
    {
        id: "iaf-history-days-duration-2",
        label: "Days Duration",
        value: "21 days",
    },
];

const PATIENT_SUMMARY_INFO_ITEMS: PatientSummaryInfoItem[] = [
    {
        id: "patient-summary-uhid",
        iconSrc: "/icons/uhidicon.svg",
        iconAlt: "UHID",
        label: "UHID",
        value: "JSDB25602026",
    },
    {
        id: "patient-summary-contact",
        iconSrc: "/icons/iconcontact.svg",
        iconAlt: "Contact",
        label: "Contact",
        value: "XXXXX73434",
    },
];

const PATIENT_DEPOSIT_DETAILS_SECTIONS: TableListingSection[] = [
    {
        id: "patient-deposit-details",
        title: "Patient Deposit Details",
        columns: [
            { label: "Sr no.", position: "first" },
            { label: "Payment Title" },
            { label: "Price" },
            { label: "Mode" },
            { label: "Method" },
            { label: "Transaction ID" },
            { label: "Transaction Date" },
            { label: "Status" },
            { label: "Remark" },
            { label: "Created Date" },
            { label: "Action", position: "last" },
        ],
        rows: [
            [
                "1",
                "Consultation Fee",
                "500",
                "Online",
                "UPI",
                "TXN123456",
                "2026-04-20",
                <span
                    key="patient-deposit-success"
                    className="inline-flex h-[30px] min-w-[76px] items-center justify-center rounded-[30px] border py-2 px-5 text-xs leading-[120%] border-[#0B8C00]/20 bg-white text-[#0B8C00]"
                >
                    Success
                </span>,
                "First Visit",
                "2026-04-20",
                <div key="patient-deposit-actions" className="flex items-center gap-2">
                    <button className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]">
                        <Image src="/icons/EditIconBlack.svg" alt="edit" width={20} height={20} />
                    </button>
                    <button className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]">
                        <Image src="/icons/trashicon.svg" alt="delete" width={24} height={24} />
                    </button>
                </div>,
            ],
        ],
    },
];

const PATIENT_SERVICES_TITLE_ACTION = (
    <button
        type="button"
        className="flex h-11 items-center gap-2 rounded-[32px] border border-[#9A7909] bg-white px-6 text-sm font-medium text-[#9A7909] transition-colors hover:bg-[#F2F8F2]"
    >
        <span className="text-hide">Discharge</span>
    </button>
);

const PATIENT_SERVICES_AND_INVOICE_SECTIONS: TableListingSection[] = [
    // {
    //     id: "patient-services",
    //     title: "Patient Services",
    //     titleRightContent: PATIENT_SERVICES_TITLE_ACTION,
    //     columns: [
    //         { label: "Sr no.", position: "first" },
    //         { label: "Services" },
    //         { label: "Product Code" },
    //         { label: "HSN Code" },
    //         { label: "Qty" },
    //         { label: "Total Amount" },
    //         { label: "Created Date", position: "last" },
    //     ],
    //     rows: [["1", "General Checkup", "PRD001", "9983", "1", "500", "20-04-2026"]],
    // },
    {
        id: "service-invoice-details",
        title: "Service Invoice Details",
        columns: [
            { label: "Sr no.", position: "first" },
            { label: "UHID" },
            { label: "Amount(₹)" },
            { label: "Discount(₹)" },
            { label: "Final Price(₹)" },
            { label: "GST Amount(₹)" },
            { label: "Order ID" },
            { label: "Invoice ID" },
            { label: "Payment Method" },
            { label: "Transaction ID" },
            { label: "Date" },
            { label: "Action", position: "last" },
        ],
        rows: [
            [
                "1",
                "JSDB25242026",
                "2000",
                "0.00",
                "2000.00",
                "N\\A",
                "3806815",
                "JS-2026-04-2004983",
                "Other",
                "TXN123456",
                "13-04-2026 03:06 AM",
                <button
                    key="service-invoice-print"
                    className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                >
                    <Image src="/icons/billprinticon.svg" alt="Print" width={20} height={20} />
                </button>,
            ],
        ],
    },
];

const PRODUCT_BILL_HEADER_RIGHT = (
    <div>
        <span className="relative inline-flex h-[14px] w-[14px] shrink-0 items-center justify-center">
            <input
                type="checkbox"
                checked={true}
                readOnly
                className="absolute inset-0 m-0 h-[14px] w-[14px] opacity-0 pointer-events-none"
            />
            <span
                aria-hidden
                className="flex h-[14px] w-[14px] items-center justify-center rounded border border-[#0B8C00] bg-[rgba(11,140,0,0.1)]"
            >
                <svg
                    className="h-[10px] w-[10px] text-[#0B8C00]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            </span>
        </span>
        <span className="ms-2 font-normal text-[14px] leading-[120%] text-[#525763]">Show Expiry Date & Batch No</span>
    </div>
);

const PRODUCT_BILL_DETAILS_SECTIONS: TableListingSection[] = [
    {
        id: "product-bill-details",
        title: "Product Bill Details",
        titleRightContent: PRODUCT_BILL_HEADER_RIGHT,
        columns: [
            { label: "Sr no.", position: "first" },
            { label: "Medicine" },
            { label: "Expery date" },
            { label: "Batch No" },
            { label: "HSN" },
            { label: "GST" },
            { label: "Quantity" },
            { label: "Unit Price Ind(All tax)" },
            { label: "Discount" },
            { label: "Amount", position: "last" },
        ],
        rows: [["1", "Paracetamol 500mg", "2027-03-31", "BATCH001", "3004", "5%", "10", "5.00", "0%", "50"]],
    },
];

const PRODUCT_INVOICE_DETAILS_SECTIONS: TableListingSection[] = [
    {
        id: "product-invoice-details",
        title: "Product Invoice Details",
        columns: [
            { label: "Sr no.", position: "first" },
            { label: "UHID" },
            { label: "Order ID" },
            { label: "Invoice Id" },
            { label: "Amount" },
            { label: "Discount" },
            { label: "JS Points" },
            { label: "Payment Method" },
            { label: "Transaction Id" },
            { label: "Final Amount" },
            { label: "Date" },
            { label: "Action", position: "last" },
        ],
        rows: [
            [
                "1",
                "JSDB25242026",
                "3806814",
                "JS-2026-04-2004982",
                "620",
                "0",
                "0",
                "Other",
                "TXN947847373",
                "620",
                "13-04-2026 12:41:55",
                <button
                    key="product-invoice-print"
                    className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                >
                    <Image src="/icons/billprinticon.svg" alt="Print" width={20} height={20} />
                </button>,
            ],
        ],
    },
];

const MEDICINE_MAIN_COLUMNS = [
    { label: "Sr no.", position: "first" as const },
    { label: "Medicine" },
    { label: "QTY" },
    { label: "By Doctor" },
    { label: "Dosage" },
    { label: "Frequency" },
    { label: "Days" },
    { label: "Remark" },
    { label: "Status" },
    { label: "Barcode" },
    { label: "Price" },
    { label: "Date" },
];

const MEDICINE_FREE_COLUMNS = [
    { label: "Sr no.", position: "first" as const },
    { label: "Medicine" },
    { label: "QTY" },
    { label: "By Doctor" },
    { label: "Dosage" },
    { label: "Frequency" },
    { label: "Days" },
    { label: "Type" },
    { label: "Remark" },
    { label: "Status" },
    { label: "Date" },
];

const MEDICINE_PRODUCT_BILL_COLUMNS = [
    { label: "Sr no.", position: "first" as const },
    { label: "Medicine" },
    { label: "Expiry Date" },
    { label: "Batch No" },
    { label: "HSN" },
    { label: "GST" },
    { label: "Quantity" },
    { label: "Unit Price incl(All tax)" },
    { label: "Discount" },
    { label: "Amount", position: "last" as const },
];

const MEDICINE_TAB_STATIC_SECTIONS: TableListingSection[] = [
    {
        id: "medicine-tab-table-1",
        title: "Medicine",
        columns: MEDICINE_MAIN_COLUMNS,
        rows: [],
        emptyMessage: "No Data Available",
    },
    {
        id: "medicine-tab-table-2",
        title: "Patient Open Free Medicine Details",
        columns: MEDICINE_FREE_COLUMNS,
        rows: [],
        emptyMessage: "No Data Available",
    },
    {
        id: "medicine-tab-table-3",
        title: "Product Bill Details",
        columns: MEDICINE_PRODUCT_BILL_COLUMNS,
        rows: [],
        emptyMessage: "No Data Available",
    },
];

const PATIENT_FILES_SECTIONS: TableListingSection[] = [
    {
        id: "patient-files",
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
        rows: [
            [
                "1",
                "JSDB25602026",
                "Blood_Report.pdf",
                "PDF",
                "blood_report_001.pdf",
                "Dr. Divya Sharma",
                "Admin",
                "2026-04-20",
                <div key="patient-files-actions" className="flex items-center gap-2">
                    <button className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]">
                        <Image src="/icons/billprinticon.svg" alt="Print" width={18} height={18} />
                    </button>
                </div>,
            ],
        ],
    },
];

const JS_HEALTH_CARD_POINTS_ITEMS: JsHealthCardPointsItem[] = [
    {
        id: "js-health-package",
        label: "Package",
        value: "Shuddhi Membership 1 - ₹(20000 - 39999) (3 Months)",
    },
    {
        id: "js-health-amount",
        label: "Amount",
        value: "Rs. 33000",
    },
    {
        id: "js-health-discount",
        label: "Discount",
        value: "0%",
    },
    {
        id: "js-health-expire",
        label: "Expire",
        value: "01 May 2026",
    },
];

const WALLET_PACKAGE_SECTIONS: TableListingSection[] = [
    {
        id: "wallet-package",
        title: "Package",
        columns: [
            { label: "Sr no.", position: "first" },
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
            { label: "Action", position: "last" },
        ],
        rows: [
            [
                "1",
                "Shuddhi Membership 1 - ₹(20000 - 39999) (3 Months)",
                "20000",
                "10%",
                "20000 - 39999",
                "1000",
                "3500",
                "2026-04-20",
                "Chandigarh",
                "500",
                <span
                    key="wallet-package-status"
                    className="inline-flex h-[30px] min-w-[76px] items-center justify-center rounded-[30px] border py-2 px-5 text-xs leading-[120%] border-[#0B8C00]/20 bg-white text-[#0B8C00]"
                >
                    Active
                </span>,
                <div key="wallet-package-actions" className="flex items-center gap-2">
                    <Tooltip content="View Package" position="top">
                        <button className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]">
                            <Image src="/icons/ViewEyeIcon.svg" alt="view" width={20} height={20} />
                        </button>
                    </Tooltip>
                    <Tooltip content="Download" position="top">
                        <button className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]">
                            <Image src="/icons/Download.svg" alt="download" width={20} height={20} />
                        </button>
                    </Tooltip>
                    <Tooltip content="Edit" position="top">
                        <button className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]">
                            <Image src="/icons/EditIconBlack.svg" alt="edit" width={20} height={20} />
                        </button>
                    </Tooltip>
                    <Tooltip content="Delete" position="top">
                        <button className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]">
                            <Image src="/icons/trashicon.svg" alt="delete" width={24} height={24} />
                        </button>
                    </Tooltip>
                </div>,
            ],
        ],
    },
];

const WALLET_REFUND_SECTIONS: TableListingSection[] = [
    {
        id: "wallet-refund",
        title: "Refund",
        columns: [
            { label: "Wallet Id#", position: "first" },
            { label: "Requested By" },
            { label: "Approved By" },
            { label: "Refund Amount" },
            { label: "Reason" },
            { label: "Method" },
            { label: "Bank Name" },
            { label: "Bank Account" },
            { label: "IFSC Code" },
            { label: "Status" },
            { label: "Date", position: "last" },
        ],
        rows: [
            [
                "101",
                "Amit Sharma",
                "Raj Verma",
                "2000",
                "Package Cancellation",
                "Bank Transfer",
                "HDFC Bank",
                "50123456789",
                "HDFC0001234",
                <span
                    key="wallet-refund-status"
                    className="inline-flex h-[30px] min-w-[76px] items-center justify-center rounded-[30px] border py-2 px-5 text-xs leading-[120%] border-[#0B8C00]/20 bg-white text-[#0B8C00]"
                >
                    Approved
                </span>,
                "20-04-2026",
            ],
        ],
    },
];

const WALLET_ORDER_HISTORY_SECTIONS: TableListingSection[] = [
    {
        id: "wallet-order-history",
        title: "Order History",
        columns: [
            { label: "Order#", position: "first" },
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
            { label: "Action", position: "last" },
        ],
        rows: [
            [
                "INV-2024-001",
                "OPD Consultation",
                "PAT-9921",
                "1,200",
                "1,200",
                "0",
                "None",
                "0",
                "TXN-HOSP-8821",
                <span
                    key="wallet-order-status"
                    className="inline-flex h-[30px] min-w-[76px] items-center justify-center rounded-[30px] border py-2 px-5 text-xs leading-[120%] border-[#CA8A04]/20 bg-white text-[#CA8A04]"
                >
                    Pending
                </span>,
                "20-04-2026",
                <div key="wallet-order-actions" className="flex items-center gap-2">
                    <Tooltip content="View Order Details" position="top">
                        <button
                            type="button"
                            className="flex h-6 w-6 items-center justify-center cursor-pointer rounded transition-colors hover:bg-[#F7FAF7]"
                            aria-label="View order details"
                        >
                            <Image src="/icons/ViewEyeIcon.svg" alt="View" width={20} height={20} />
                        </button>
                    </Tooltip>
                    <Tooltip content="Download Invoice" position="top">
                        <button
                            type="button"
                            className="flex h-6 w-6 items-center justify-center cursor-pointer rounded transition-colors hover:bg-[#F7FAF7]"
                            aria-label="Download invoice"
                        >
                            <Image src="/icons/Download.svg" alt="Download" width={20} height={20} />
                        </button>
                    </Tooltip>
                </div>,
            ],
        ],
    },
];

const WALLET_HEALTH_CARD_TRANSACTION_SECTIONS: TableListingSection[] = [
    {
        id: "wallet-health-card-transaction",
        title: "JS Health Card Transaction",
        columns: [
            { label: "Sr no.", position: "first" },
            { label: "Points" },
            { label: "Earn By" },
            { label: "TXN" },
            { label: "Order ID" },
            { label: "Order Return" },
            { label: "Is Expired" },
            { label: "Created at", position: "last" },
        ],
        rows: [
            [
                "1",
                "500",
                "Consultant (Earn)",
                <span
                    key="wallet-health-card-transaction-type"
                    className="inline-flex h-[30px] min-w-[76px] items-center justify-center rounded-[30px] border py-2 px-5 text-xs leading-[120%] border-[#0B8C00]/20 bg-white text-[#0B8C00]"
                >
                    Credit
                </span>,
                "3895779",
                "No",
                "No",
                "20-04-2026 12:41:55",
            ],
        ],
    },
];

const PATIENT_FORM_STATIC_ROWS = [
    {
        id: 1,
        fileName: "Patient Form File",
        remark: "N/A",
        date: "N/A",
    },
];

const NURSING_NOTE_SEARCH_KEY_OPTIONS: SelectOption[] = [
    { value: "", label: "None" },
    { value: "on_examination", label: "ON Examination" },
    { value: "vitals", label: "Vitals" },
    { value: "therapy", label: "Therapy" },
    { value: "meals", label: "Meal" },
    { value: "medication", label: "Medication" },
    { value: "doctor_round", label: "Doctor Round" },
    { value: "current_status", label: "Current Status" },
    { value: "new_order", label: "New Order" },
    { value: "handover_to", label: "Handover to" },
];

const NURSING_NOTE_COLUMNS = [
    { label: "#", position: "first" as const },
    { label: "Patient" },
    { label: "ON Examination" },
    { label: "Vitals" },
    { label: "Therapy" },
    { label: "Meal" },
    { label: "Medication" },
    { label: "Doctor Round" },
    { label: "Current Status" },
    { label: "New Order" },
    { label: "Handover to" },
    { label: "Created At", position: "last" as const },
    // { label: "Action", position: "last" as const },
];

const DOCTOR_VISIT_COLUMNS = [
    { label: "Doctor", position: "first" as const },
    { label: "Nurse" },
    { label: "BP" },
    { label: "Sugar" },
    { label: "Pulse" },
    { label: "Spo2" },
    { label: "Temp" },
    { label: "R/R" },
    { label: "Abdominal Girth" },
    { label: "Pain Scoring" },
    { label: "Motion History" },
    { label: "Intake" },
    { label: "Output" },
    { label: "Remark" },
    { label: "Date", position: "last" as const },
];

const HISTORY_COLUMNS = [
    { label: "Chief Complaint", position: "first" as const },
    { label: "Associated Complaint" },
    { label: "General H/O" },
    { label: "Stress" },
    { label: "Bowel" },
    { label: "Appetite" },
    { label: "Micturition" },
    { label: "Sleep" },
    { label: "Medicine History" },
    { label: "Diagnose" },
    { label: "K/C/O" },
    { label: "Gyne/obs" },
    { label: "Date", position: "last" as const },
];

const REVISIT_COLUMNS = [
    { label: "Doctor", position: "first" as const },
    { label: "Date" },
    { label: "Time" },
    { label: "Remark" },
    { label: "Date", position: "last" as const },
];

const DIET_COLUMNS = [
    { label: "#", position: "first" as const },
    { label: "Diet Schedule" },
    { label: "Diet Details" },
    { label: "Instruction" },
    { label: "Date", position: "last" as const },
];

export default function IpdPage() {
    const {
        selectedBranchFilter,
        setSelectedBranchFilter,
        branchFilterOptions,
        isLoadingBranches,
        isBranchFilterDisabled,
        isSuperAdmin: isBranchFilterSuperAdmin,
        branchFilterPersistReady,
    } = useBranchFilter();
    const { data: branchesData } = useGetBranchesQuery(undefined, {
        skip: !isBranchFilterSuperAdmin,
    });
    const branchOptions: SelectOption[] = useMemo(
        () => branchFilterOptions.filter((o) => o.value !== ""),
        [branchFilterOptions]
    );
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("overview");
    const [selectedDoctor, setSelectedDoctor] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [rows, setRows] = useState<OldOpdRow[]>([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [isLoadingRows, setIsLoadingRows] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const filterRef = useRef<HTMLDivElement>(null);

    const searchParams = useSearchParams();
    const opdRouteOpdId = searchParams?.get("id")?.trim() ?? "";
    const detailSource = (searchParams?.get("source")?.trim() ?? "").toLowerCase();
    const isOpdPatientDetailRoute = detailSource === "opd" && opdRouteOpdId.length > 0;
    const isIpdPatientDetailRoute = detailSource === "ipd" && opdRouteOpdId.length > 0;
    const isDayCarePatientDetailRoute = detailSource === "daycare" && opdRouteOpdId.length > 0;
    const isDischargePatientDetailRoute = detailSource === "discharge" && opdRouteOpdId.length > 0;
    const isLegacyPatientDetailRoute = isOpdPatientDetailRoute || isIpdPatientDetailRoute || isDayCarePatientDetailRoute;

    const [opdDetailData, setOpdDetailData] = useState<LegacyOpdPatientDetailData | null>(null);
    const [opdFilesList, setOpdFilesList] = useState<LegacyPatientFileApi[]>([]);
    const [opdWalletPayload, setOpdWalletPayload] = useState<LegacyPatientWalletData | null>(null);
    const [opdDetailLoadState, setOpdDetailLoadState] = useState<"idle" | "loading" | "error" | "ready">("idle");
    const [opdDetailLoadError, setOpdDetailLoadError] = useState<string | null>(null);
    const [selectedWalletOrderId, setSelectedWalletOrderId] = useState<string | null>(null);
    const [walletOrderDetail, setWalletOrderDetail] = useState<WalletOrderDetailRecord | null>(null);
    const [walletOrderItems, setWalletOrderItems] = useState<WalletOrderDetailItemRecord[]>([]);
    const [walletOrderLoadState, setWalletOrderLoadState] = useState<"idle" | "loading" | "error" | "ready">("idle");
    const [walletOrderLoadError, setWalletOrderLoadError] = useState<string | null>(null);
    const [packageItems, setPackageItems] = useState<PatientPackageListingItem[]>([]);
    const [packageLoadState, setPackageLoadState] = useState<"idle" | "loading" | "error" | "ready">("idle");
    const [packageLoadError, setPackageLoadError] = useState<string | null>(null);
    const [roomItems, setRoomItems] = useState<PatientRoomListingItem[]>([]);
    const [roomLoadState, setRoomLoadState] = useState<"idle" | "loading" | "error" | "ready">("idle");
    const [roomLoadError, setRoomLoadError] = useState<string | null>(null);
    const [reportItems, setReportItems] = useState<PatientReportListingItem[]>([]);
    const [reportLoadState, setReportLoadState] = useState<"idle" | "loading" | "error" | "ready">("idle");
    const [reportLoadError, setReportLoadError] = useState<string | null>(null);
    const [billServiceOrders, setBillServiceOrders] = useState<WalletOrderDetailRecord[]>([]);
    const [billProductOrders, setBillProductOrders] = useState<WalletOrderDetailRecord[]>([]);
    const [panelPatientServiceInvoices, setPanelPatientServiceInvoices] = useState<WalletOrderDetailRecord[]>([]);
    const [panelPatientServiceInvoicesLoadState, setPanelPatientServiceInvoicesLoadState] = useState<
        "idle" | "loading" | "error" | "ready"
    >("idle");
    const [panelPatientServiceInvoicesLoadError, setPanelPatientServiceInvoicesLoadError] = useState<string | null>(null);
    const [billOrdersLoadState, setBillOrdersLoadState] = useState<"idle" | "loading" | "error" | "ready">("idle");
    const [billOrdersLoadError, setBillOrdersLoadError] = useState<string | null>(null);
    const [downloadingServiceOrderId, setDownloadingServiceOrderId] = useState<string | null>(null);
    const [downloadingProductOrderId, setDownloadingProductOrderId] = useState<string | null>(null);
    const [downloadingWalletPackageRowKey, setDownloadingWalletPackageRowKey] = useState<string | null>(null);
    const [downloadingWalletInstallmentRowKey, setDownloadingWalletInstallmentRowKey] = useState<string | null>(null);
    const [billOfSupplyPayload, setBillOfSupplyPayload] = useState<BillOfSupplyProps | null>(null);
    const [taxInvoicePayload, setTaxInvoicePayload] = useState<TaxInvoiceProps | null>(null);
    const [walletSinglePayload, setWalletSinglePayload] = useState<WalletInvoiceData | null>(null);
    const [walletAdvancePayload, setWalletAdvancePayload] = useState<WalletInvoiceData | null>(null);
    const [walletAdvanceShowDate, setWalletAdvanceShowDate] = useState(true);
    const [walletSingleShowDate, setWalletSingleShowDate] = useState(true);
    const billOfSupplyRef = useRef<BillOfSupplyHandle | null>(null);
    const taxInvoiceRef = useRef<TaxInvoiceHandle | null>(null);
    const sankalpSingleRef = useRef<SankalpSingleHandle | null>(null);
    const sankalpWalletRef = useRef<SankalpWalletHandle | null>(null);
    const [getLegacyOrderDetail] = useLazyGetLegacyOrderDetailQuery();
    const [getLegacyOpdIaForm] = useLazyGetLegacyOpdIaFormQuery();
    const [getLegacyOrders] = useLazyGetLegacyOrdersQuery();
    const [getLegacyPatientDetail] = useLazyGetLegacyPatientDetailQuery();
    const [getLegacyPatientPackage] = useLazyGetLegacyPatientPackageQuery();
    const [getLegacyPatientRoom] = useLazyGetLegacyPatientRoomQuery();
    const [getLegacyPatientReport] = useLazyGetLegacyPatientReportQuery();
    const [getLegacyPatientForm] = useLazyGetLegacyPatientFormQuery();
    const [getLegacyNursingNote] = useLazyGetLegacyNursingNoteQuery();
    const [getLegacyDoctorVisit] = useLazyGetLegacyDoctorVisitQuery();
    const [getLegacyPatientHistory] = useLazyGetLegacyPatientHistoryQuery();
    const [getLegacyPatientRevisit] = useLazyGetLegacyPatientRevisitQuery();
    const [getLegacyPatientDiet] = useLazyGetLegacyPatientDietQuery();
    const [getLegacyOpenFreeMedicine] = useLazyGetLegacyOpenFreeMedicineQuery();
    const [getLegacyPatientPayment] = useLazyGetLegacyPatientPaymentQuery();
    const [getLegacyPanelPatientServicesInvoices] = useLazyGetLegacyPanelPatientServicesInvoicesQuery();
    const [getLegacyHealthCardPoints] = useLazyGetLegacyHealthCardPointsQuery();
    const [getLegacyHealthCardTransaction] = useLazyGetLegacyHealthCardTransactionQuery();

    const [patientFormRows, setPatientFormRows] = useState<
        { uhid: string; reportUrl: string; remark: string; createdAt: string }[]
    >([]);
    const [patientFormLoadState, setPatientFormLoadState] = useState<"idle" | "loading" | "error" | "ready">("idle");
    const [patientFormLoadError, setPatientFormLoadError] = useState<string | null>(null);
    const [nursingNoteRows, setNursingNoteRows] = useState<
        {
            patientFrom: string;
            onExamination: string;
            vitals: string;
            therapy: string;
            meals: string;
            medication: string;
            doctorRound: string;
            currentStatus: string;
            newOrder: string;
            handoverTo: string;
            createdAt: string;
        }[]
    >([]);
    const [nursingNoteLoadState, setNursingNoteLoadState] = useState<"idle" | "loading" | "error" | "ready">("idle");
    const [nursingNoteLoadError, setNursingNoteLoadError] = useState<string | null>(null);
    const [nursingNoteFilters, setNursingNoteFilters] = useState({ page: 1, limit: 10, metakey: "", metavalue: "" });
    const [nursingNoteTotalRecords, setNursingNoteTotalRecords] = useState(0);
    const debouncedNursingNoteMetavalue = useDebounce(nursingNoteFilters.metavalue, 300);
    const [doctorVisitRows, setDoctorVisitRows] = useState<
        {
            doctor: string;
            nurse: string;
            bp: string;
            sugar: string;
            pulse: string;
            spo2: string;
            temp: string;
            rr: string;
            abdominalGirth: string;
            painScoring: string;
            motionHistory: string;
            intake: string;
            output: string;
            remark: string;
            createdAt: string;
        }[]
    >([]);
    const [doctorVisitLoadState, setDoctorVisitLoadState] = useState<"idle" | "loading" | "error" | "ready">("idle");
    const [doctorVisitLoadError, setDoctorVisitLoadError] = useState<string | null>(null);
    const [historyRows, setHistoryRows] = useState<
        {
            chiefComplaint: string;
            associatedComplaint: string;
            generalHo: string;
            stress: string;
            bowel: string;
            appetite: string;
            micturition: string;
            sleep: string;
            medicineHistory: string;
            diagnose: string;
            kco: string;
            gyneObs: string;
            createdAt: string;
        }[]
    >([]);
    const [historyLoadState, setHistoryLoadState] = useState<"idle" | "loading" | "error" | "ready">("idle");
    const [historyLoadError, setHistoryLoadError] = useState<string | null>(null);
    const [revisitRows, setRevisitRows] = useState<
        { doctor: string; revisitDate: string; revisitTime: string; remark: string; createdAt: string }[]
    >([]);
    const [revisitLoadState, setRevisitLoadState] = useState<"idle" | "loading" | "error" | "ready">("idle");
    const [revisitLoadError, setRevisitLoadError] = useState<string | null>(null);
    const [dietRows, setDietRows] = useState<
        { schedule: string; details: string; instruction: string; dietDate: string }[]
    >([]);
    const [dietLoadState, setDietLoadState] = useState<"idle" | "loading" | "error" | "ready">("idle");
    const [dietLoadError, setDietLoadError] = useState<string | null>(null);
    const [openFreeMedicineRows, setOpenFreeMedicineRows] = useState<
        {
            medicine: string;
            qty: string;
            doctor: string;
            dosage: string;
            frequency: string;
            days: string;
            type: string;
            remark: string;
            status: string;
            date: string;
        }[]
    >([]);
    const [openFreeMedicineLoadState, setOpenFreeMedicineLoadState] = useState<"idle" | "loading" | "error" | "ready">(
        "idle"
    );
    const [openFreeMedicineLoadError, setOpenFreeMedicineLoadError] = useState<string | null>(null);
    const [patientPaymentRows, setPatientPaymentRows] = useState<
        {
            title: string;
            price: string;
            mode: string;
            method: string;
            transactionId: string;
            transactionDate: string;
            status: string;
            remark: string;
            createdAt: string;
        }[]
    >([]);
    const [patientPaymentLoadState, setPatientPaymentLoadState] = useState<"idle" | "loading" | "error" | "ready">(
        "idle"
    );
    const [patientPaymentLoadError, setPatientPaymentLoadError] = useState<string | null>(null);
    const [healthCardPointsRow, setHealthCardPointsRow] = useState<
        | {
            id: string;
            uhid: string;
            contactNumber: string;
            points: string;
            cardNo: string;
            status: string;
        }
        | null
    >(null);
    const [healthCardPointsLoadState, setHealthCardPointsLoadState] = useState<
        "idle" | "loading" | "error" | "ready"
    >("idle");
    const [healthCardPointsLoadError, setHealthCardPointsLoadError] = useState<string | null>(null);
    const [healthCardTransactionRows, setHealthCardTransactionRows] = useState<
        {
            points: string;
            earnBy: string;
            txn: string;
            orderId: string;
            orderReturn: string;
            isExpired: string;
            createdAt: string;
        }[]
    >([]);
    const [healthCardTransactionLoadState, setHealthCardTransactionLoadState] = useState<
        "idle" | "loading" | "error" | "ready"
    >("idle");
    const [healthCardTransactionLoadError, setHealthCardTransactionLoadError] = useState<string | null>(null);
    const [iafMedicalItems, setIafMedicalItems] = useState<NutritionalAssessmentItem[]>(NUTRITIONAL_ASSESSMENT_ITEMS);
    const [iafDietVisits, setIafDietVisits] = useState<DietHistoryVisit[]>(DIET_HISTORY_VISITS);
    const [iafLoadState, setIafLoadState] = useState<"idle" | "loading" | "error" | "ready">("idle");
    const [iafLoadError, setIafLoadError] = useState<string | null>(null);

    useEffect(() => {
        if (activeTab !== "patient_form") return;
        if (!isLegacyPatientDetailRoute) return;
        const patientId = opdRouteOpdId.trim();
        if (!patientId) return;

        let cancelled = false;
        (async () => {
            setPatientFormLoadState("loading");
            setPatientFormLoadError(null);
            setPatientFormRows([]);
            try {
                const payload = await getLegacyPatientForm(patientId).unwrap();
                if (payload?.status === false) {
                    throw new Error(payload?.message || "Failed to load patient form");
                }
                const rows = Array.isArray(payload?.data) ? payload.data : [];
                if (cancelled) return;
                setPatientFormRows(
                    rows.map((row) => ({
                        uhid: String(row.uhid ?? "").trim() || "N/A",
                        reportUrl: String(row.report_url ?? "").trim(),
                        remark: String(row.remark ?? "").trim() || "N/A",
                        createdAt: String(row.created_at ?? "").trim() || "N/A",
                    }))
                );
                setPatientFormLoadState("ready");
            } catch (e) {
                if (cancelled) return;
                setPatientFormRows([]);
                setPatientFormLoadState("error");
                setPatientFormLoadError(e instanceof Error ? e.message : "Failed to load patient form");
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [activeTab, isLegacyPatientDetailRoute, opdRouteOpdId, getLegacyPatientForm]);

    useEffect(() => {
        if (activeTab !== "nursing_note") return;
        if (!isLegacyPatientDetailRoute) return;
        const patientId = opdRouteOpdId.trim();
        if (!patientId) return;
        if (nursingNoteFilters.metakey && !debouncedNursingNoteMetavalue.trim()) return;

        let cancelled = false;
        (async () => {
            setNursingNoteLoadState("loading");
            setNursingNoteLoadError(null);
            setNursingNoteRows([]);
            try {
                const payload = await getLegacyNursingNote({
                    patientId,
                    metakey: nursingNoteFilters.metakey || undefined,
                    metavalue: debouncedNursingNoteMetavalue.trim() || undefined,
                    limit: nursingNoteFilters.limit,
                    page: nursingNoteFilters.page,
                }).unwrap();
                const message = String(payload?.message ?? "").toLowerCase();
                if (payload?.status === false && !message.includes("no record")) {
                    throw new Error(payload?.message || "Failed to load nursing note");
                }
                const rows = Array.isArray(payload?.data) ? payload.data : [];
                if (cancelled) return;
                const asDisplay = (value: string | null | undefined) => (value ?? "").trim() || "N/A";
                setNursingNoteRows(
                    rows.map((row) => ({
                        patientFrom: asDisplay(row.patient_from),
                        onExamination: asDisplay(row.on_examination),
                        vitals: asDisplay(row.vitals).replace(/&amp;/g, "&"),
                        therapy: asDisplay(row.therapy),
                        meals: asDisplay(row.meals),
                        medication: asDisplay(row.medication),
                        doctorRound: asDisplay(row.doctor_round),
                        currentStatus: asDisplay(row.current_status),
                        newOrder: asDisplay(row.new_order),
                        handoverTo: asDisplay(row.handover_to),
                        createdAt: asDisplay(row.created_at),
                    }))
                );
                setNursingNoteTotalRecords(payload?.total_records ?? rows.length);
                setNursingNoteLoadState("ready");
            } catch (e) {
                if (cancelled) return;
                setNursingNoteRows([]);
                setNursingNoteLoadState("error");
                setNursingNoteLoadError(e instanceof Error ? e.message : "Failed to load nursing note");
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [
        activeTab,
        isLegacyPatientDetailRoute,
        opdRouteOpdId,
        getLegacyNursingNote,
        nursingNoteFilters.page,
        nursingNoteFilters.limit,
        nursingNoteFilters.metakey,
        debouncedNursingNoteMetavalue,
    ]);

    useEffect(() => {
        if (activeTab !== "doctor_visit") return;
        if (!isLegacyPatientDetailRoute) return;
        const patientId = opdRouteOpdId.trim();
        if (!patientId) return;

        let cancelled = false;
        (async () => {
            setDoctorVisitLoadState("loading");
            setDoctorVisitLoadError(null);
            setDoctorVisitRows([]);
            try {
                const payload = await getLegacyDoctorVisit(patientId).unwrap();
                const message = String(payload?.message ?? "").toLowerCase();
                if (payload?.status === false && !message.includes("no record")) {
                    throw new Error(payload?.message || "Failed to load doctor visit");
                }
                const rows = Array.isArray(payload?.data) ? payload.data : [];
                if (cancelled) return;
                const asDisplay = (value: string | null | undefined) => (value ?? "").trim() || "N/A";
                setDoctorVisitRows(
                    rows.map((row) => ({
                        doctor: asDisplay(row.doctor_name) === "N/A" ? asDisplay(row.doctor_id) : asDisplay(row.doctor_name),
                        nurse: asDisplay(row.nurse_name) === "N/A" ? asDisplay(row.room_attendant_id) : asDisplay(row.nurse_name),
                        bp: asDisplay(row.bp),
                        sugar: asDisplay(row.sugar),
                        pulse: asDisplay(row.pulse),
                        spo2: asDisplay(row.spo2),
                        temp: asDisplay(row.temperature),
                        rr: asDisplay(row.r_r),
                        abdominalGirth: asDisplay(row.abdominal_girth),
                        painScoring: asDisplay(row.pain_scoring),
                        motionHistory: asDisplay(row.motion_history),
                        intake: asDisplay(row.intake),
                        output: asDisplay(row.output),
                        remark: asDisplay(row.remark),
                        createdAt: asDisplay(row.created_at),
                    }))
                );
                setDoctorVisitLoadState("ready");
            } catch (e) {
                if (cancelled) return;
                setDoctorVisitRows([]);
                setDoctorVisitLoadState("error");
                setDoctorVisitLoadError(e instanceof Error ? e.message : "Failed to load doctor visit");
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [activeTab, isLegacyPatientDetailRoute, opdRouteOpdId, getLegacyDoctorVisit]);

    useEffect(() => {
        if (activeTab !== "history") return;
        if (!isLegacyPatientDetailRoute) return;
        const patientId = opdRouteOpdId.trim();
        if (!patientId) return;

        let cancelled = false;
        (async () => {
            setHistoryLoadState("loading");
            setHistoryLoadError(null);
            setHistoryRows([]);
            try {
                const payload = await getLegacyPatientHistory(patientId).unwrap();
                const message = String(payload?.message ?? "").toLowerCase();
                if (payload?.status === false && !message.includes("no record")) {
                    throw new Error(payload?.message || "Failed to load patient history");
                }
                const rows = Array.isArray(payload?.data) ? payload.data : [];
                if (cancelled) return;
                const asDisplay = (value: string | null | undefined) => (value ?? "").trim() || "N/A";
                setHistoryRows(
                    rows.map((row) => ({
                        chiefComplaint: asDisplay(row.chief_complaint),
                        associatedComplaint: asDisplay(row.associated_complaint),
                        generalHo: asDisplay(row.general_ho),
                        stress: asDisplay(row.stress),
                        bowel: asDisplay(row.bowel),
                        appetite: asDisplay(row.appetate),
                        micturition: asDisplay(row.micturition),
                        sleep: asDisplay(row.sleep),
                        medicineHistory: asDisplay(row.medicine_history),
                        diagnose: asDisplay(row.diagnose),
                        kco: asDisplay(row.k_c_o),
                        gyneObs: asDisplay(row.gyne_obs),
                        createdAt: asDisplay(row.created_at),
                    }))
                );
                setHistoryLoadState("ready");
            } catch (e) {
                if (cancelled) return;
                setHistoryRows([]);
                setHistoryLoadState("error");
                setHistoryLoadError(e instanceof Error ? e.message : "Failed to load patient history");
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [activeTab, isLegacyPatientDetailRoute, opdRouteOpdId, getLegacyPatientHistory]);

    useEffect(() => {
        if (activeTab !== "revist") return;
        if (!isLegacyPatientDetailRoute) return;
        const patientId = opdRouteOpdId.trim();
        if (!patientId) return;

        let cancelled = false;
        (async () => {
            setRevisitLoadState("loading");
            setRevisitLoadError(null);
            setRevisitRows([]);
            try {
                const payload = await getLegacyPatientRevisit(patientId).unwrap();
                const message = String(payload?.message ?? "").toLowerCase();
                if (payload?.status === false && !message.includes("no record")) {
                    throw new Error(payload?.message || "Failed to load patient revisit");
                }
                const rows = Array.isArray(payload?.data) ? payload.data : [];
                if (cancelled) return;
                const asDisplay = (value: string | null | undefined) => (value ?? "").trim() || "N/A";
                setRevisitRows(
                    rows.map((row) => ({
                        doctor: asDisplay(row.doctor_name) === "N/A" ? asDisplay(row.doctor_id) : asDisplay(row.doctor_name),
                        revisitDate: asDisplay(row.revisit_date),
                        revisitTime: asDisplay(row.revisit_time),
                        remark: asDisplay(row.remark),
                        createdAt: asDisplay(row.created_at),
                    }))
                );
                setRevisitLoadState("ready");
            } catch (e) {
                if (cancelled) return;
                setRevisitRows([]);
                setRevisitLoadState("error");
                setRevisitLoadError(e instanceof Error ? e.message : "Failed to load patient revisit");
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [activeTab, isLegacyPatientDetailRoute, opdRouteOpdId, getLegacyPatientRevisit]);

    useEffect(() => {
        const shouldLoadForOverview = activeTab === "overview" && isIpdPatientDetailRoute;
        if (activeTab !== "diet" && !shouldLoadForOverview) return;
        if (!isLegacyPatientDetailRoute) return;
        const patientId = opdRouteOpdId.trim();
        if (!patientId) return;

        let cancelled = false;
        (async () => {
            setDietLoadState("loading");
            setDietLoadError(null);
            setDietRows([]);
            try {
                const payload = await getLegacyPatientDiet(patientId).unwrap();
                const message = String(payload?.message ?? "").toLowerCase();
                if (payload?.status === false && !message.includes("no record")) {
                    throw new Error(payload?.message || "Failed to load patient diet");
                }
                const rows = Array.isArray(payload?.data) ? payload.data : [];
                if (cancelled) return;
                const asDisplay = (value: string | null | undefined) => (value ?? "").trim() || "N/A";
                setDietRows(
                    rows.map((row) => ({
                        schedule: asDisplay(row.diet_schedule),
                        details: asDisplay(row.diet_name),
                        instruction: asDisplay(row.instruction),
                        dietDate: asDisplay(row.diet_date),
                    }))
                );
                setDietLoadState("ready");
            } catch (e) {
                if (cancelled) return;
                setDietRows([]);
                setDietLoadState("error");
                setDietLoadError(e instanceof Error ? e.message : "Failed to load patient diet");
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [activeTab, isIpdPatientDetailRoute, isLegacyPatientDetailRoute, opdRouteOpdId, getLegacyPatientDiet]);

    useEffect(() => {
        if (activeTab !== "medicine") return;
        if (!isLegacyPatientDetailRoute) return;
        const patientId = opdRouteOpdId.trim();
        if (!patientId) return;

        let cancelled = false;
        (async () => {
            setOpenFreeMedicineLoadState("loading");
            setOpenFreeMedicineLoadError(null);
            setOpenFreeMedicineRows([]);
            try {
                const payload = await getLegacyOpenFreeMedicine(patientId).unwrap();
                const message = String(payload?.message ?? "").toLowerCase();
                const isNoRecord = message.includes("no record") || message.includes("not found");
                if (payload?.status === false && !isNoRecord) {
                    throw new Error(payload?.message || "Failed to load open free medicine details");
                }
                const rows = Array.isArray(payload?.data) ? payload.data : [];
                if (cancelled) return;
                const asDisplay = (value: string | null | undefined) => (value ?? "").trim() || "N/A";
                const formatType = (value: string | null | undefined) => {
                    const raw = (value ?? "").trim();
                    if (!raw) return "N/A";
                    return raw
                        .split(/[_\s]+/)
                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                        .join(" ");
                };
                const formatStatus = (value: string | null | undefined) => {
                    const raw = (value ?? "").trim();
                    if (!raw) return "N/A";
                    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
                };
                setOpenFreeMedicineRows(
                    rows.map((row) => ({
                        medicine: asDisplay(row.medicine_name),
                        qty: asDisplay(row.qty),
                        doctor: asDisplay(row.doctor_name ?? (row.doctor_id ? `Doctor ${row.doctor_id}` : undefined)),
                        dosage: asDisplay(row.dosage),
                        frequency: asDisplay(row.frequency),
                        days: asDisplay(row.days),
                        type: formatType(row.patient_type),
                        remark: asDisplay(row.remark),
                        status: formatStatus(row.status),
                        date: asDisplay(row.created_at),
                    }))
                );
                setOpenFreeMedicineLoadState("ready");
            } catch (e) {
                if (cancelled) return;
                setOpenFreeMedicineRows([]);
                setOpenFreeMedicineLoadState("error");
                setOpenFreeMedicineLoadError(
                    e instanceof Error ? e.message : "Failed to load open free medicine details"
                );
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [activeTab, isLegacyPatientDetailRoute, opdRouteOpdId, getLegacyOpenFreeMedicine]);

    useEffect(() => {
        if (activeTab !== "bill Details") return;
        if (!isLegacyPatientDetailRoute) return;
        const patientId = opdRouteOpdId.trim();
        if (!patientId) return;
        const paymentType: "opd" | "ipd" | "day_care" | null = isOpdPatientDetailRoute
            ? "opd"
            : isIpdPatientDetailRoute
                ? "ipd"
                : isDayCarePatientDetailRoute
                    ? "day_care"
                    : null;
        if (!paymentType) return;

        let cancelled = false;
        (async () => {
            setPatientPaymentLoadState("loading");
            setPatientPaymentLoadError(null);
            setPatientPaymentRows([]);
            try {
                const payload = await getLegacyPatientPayment({ patientId, type: paymentType }).unwrap();
                const message = String(payload?.message ?? "").toLowerCase();
                const isNoRecord = message.includes("no record") || message.includes("not found");
                if (payload?.status === false && !isNoRecord) {
                    throw new Error(payload?.message || "Failed to load patient payment details");
                }
                const rows = Array.isArray(payload?.data) ? payload.data : [];
                if (cancelled) return;
                const asDisplay = (value: string | null | undefined) => (value ?? "").trim() || "N/A";
                const capitalize = (value: string | null | undefined) => {
                    const raw = (value ?? "").trim();
                    if (!raw) return "N/A";
                    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
                };
                setPatientPaymentRows(
                    rows.map((row) => ({
                        title: asDisplay(row.title),
                        price: asDisplay((row.Price ?? row.price) as string | null | undefined),
                        mode: capitalize(row.mode),
                        method: asDisplay(row.payment_method),
                        transactionId: asDisplay(row.transaction_id),
                        transactionDate: asDisplay(row.transaction_date),
                        status: capitalize(row.status),
                        remark: asDisplay(row.remark),
                        createdAt: asDisplay(row.created_at),
                    }))
                );
                setPatientPaymentLoadState("ready");
            } catch (e) {
                if (cancelled) return;
                setPatientPaymentRows([]);
                setPatientPaymentLoadState("error");
                setPatientPaymentLoadError(
                    e instanceof Error ? e.message : "Failed to load patient payment details"
                );
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [
        activeTab,
        isLegacyPatientDetailRoute,
        isOpdPatientDetailRoute,
        isIpdPatientDetailRoute,
        isDayCarePatientDetailRoute,
        opdRouteOpdId,
        getLegacyPatientPayment,
    ]);

    useEffect(() => {
        if (activeTab !== "iaf") return;
        if (!isOpdPatientDetailRoute) return;
        const opdid = opdRouteOpdId.trim();
        if (!opdid) return;

        let cancelled = false;
        const asDisplay = (value: unknown) => String(value ?? "").trim() || "N/A";
        const parseJsonObject = (value: unknown): Record<string, unknown> => {
            if (value && typeof value === "object") return value as Record<string, unknown>;
            if (typeof value === "string") {
                try {
                    const parsed = JSON.parse(value) as unknown;
                    if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
                } catch {
                    return {};
                }
            }
            return {};
        };

        (async () => {
            setIafLoadState("loading");
            setIafLoadError(null);
            try {
                const payload = await getLegacyOpdIaForm(opdid).unwrap();
                const message = String(payload?.message ?? "").toLowerCase();
                if (payload?.status === false && !message.includes("no record")) {
                    throw new Error(payload?.message || "Failed to load IAF details");
                }

                const iafDetails = parseJsonObject(payload?.data?.iaf_details);
                const medicalHistory = parseJsonObject(iafDetails["Medical_History"]);
                const normalizeYesNo = (value: unknown) => {
                    const raw = String(value ?? "").trim().toLowerCase();
                    if (raw === "yes") return "Yes";
                    if (raw === "no") return "No";
                    return asDisplay(value);
                };
                const capitalizeFirst = (value: unknown) => {
                    const text = asDisplay(value);
                    if (text === "N/A") return text;
                    return text.charAt(0).toUpperCase() + text.slice(1);
                };
                const toMedicalItem = (id: string, label: string, key: string): NutritionalAssessmentItem => {
                    const section = parseJsonObject(medicalHistory[key]);
                    return {
                        id,
                        label,
                        status: normalizeYesNo(section.dropdown),
                        remarks: asDisplay(section.remark),
                    };
                };
                const nextMedicalItems: NutritionalAssessmentItem[] = [
                    toMedicalItem("iaf-nutrition-diabetes", "Diabetes", "Diabetes"),
                    toMedicalItem("iaf-nutrition-htn", "HTN – Hypertension", "HTN"),
                    toMedicalItem("iaf-nutrition-cad", "Coronary Artery Disease", "Coronary_Artery_Disease"),
                    toMedicalItem("iaf-nutrition-thyroid", "Thyroid", "Thyroid"),
                    toMedicalItem("iaf-nutrition-menstrual", "Menstrual", "Menstrual"),
                ];

                const dietHistory = parseJsonObject(iafDetails["diet_history"]);
                const rawDates = Array.isArray(dietHistory["Date"]) ? (dietHistory["Date"] as unknown[]) : [];
                const rawDetails = Array.isArray(dietHistory["Diet-Detail"]) ? (dietHistory["Diet-Detail"] as unknown[]) : [];
                const maxLen = Math.max(rawDates.length, rawDetails.length);
                const nextDietVisits: DietHistoryVisit[] = Array.from({ length: maxLen }, (_, idx) => ({
                    id: `diet-visit-${idx + 1}`,
                    date: asDisplay(rawDates[idx]),
                    dietDetail: capitalizeFirst(rawDetails[idx]),
                }));

                if (cancelled) return;
                setIafMedicalItems(nextMedicalItems);
                setIafDietVisits(nextDietVisits);
                setIafLoadState("ready");
            } catch (e) {
                if (cancelled) return;
                setIafLoadState("error");
                setIafLoadError(e instanceof Error ? e.message : "Failed to load IAF details");
                setIafMedicalItems([
                    {
                        id: "iaf-nutrition-fallback",
                        label: "Medical History",
                        status: "N/A",
                        remarks: "N/A",
                    },
                ]);
                setIafDietVisits([]);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [activeTab, isOpdPatientDetailRoute, opdRouteOpdId, getLegacyOpdIaForm]);

    useEffect(() => {
        if (!isOpdPatientDetailRoute) {
            setOpdDetailData(null);
            setOpdFilesList([]);
            setOpdWalletPayload(null);
            setOpdDetailLoadState("idle");
            setOpdDetailLoadError(null);
            return;
        }
        const ac = new AbortController();
        let cancelled = false;
        const doctorFallback = ((opdDetailData?.appointment?.doctor_name ?? "") as string).trim();
        (async () => {
            setOpdDetailLoadState("loading");
            setOpdDetailLoadError(null);
            try {
                const detailRes = await fetch(
                    `/api/legacy/opdPatientDetail?opdid=${encodeURIComponent(opdRouteOpdId)}`,
                    { signal: ac.signal }
                );
                const detailJson = await detailRes.json();
                if (!detailRes.ok || detailJson?.status === false) {
                    throw new Error(detailJson?.message || "Failed to load OPD patient detail");
                }
                const data = detailJson.data as LegacyOpdPatientDetailData | undefined;
                if (cancelled) return;
                setOpdDetailData(data ?? null);
                const uhid =
                    ((data?.registration?.uhid ?? data?.appointment?.uhid) as string | undefined)?.trim() ?? "";
                if (uhid) {
                    const [filesRes, walletRes] = await Promise.all([
                        fetch(`/api/legacy/patientFiles?uhid=${encodeURIComponent(uhid)}`, { signal: ac.signal }),
                        fetch(`/api/legacy/patientWallet?uhid=${encodeURIComponent(uhid)}`, { signal: ac.signal }),
                    ]);
                    const filesJson = await filesRes.json();
                    const walletJson = await walletRes.json();
                    if (cancelled) return;
                    if (filesRes.ok && filesJson?.status !== false && Array.isArray(filesJson?.data)) {
                        setOpdFilesList(filesJson.data as LegacyPatientFileApi[]);
                    } else {
                        setOpdFilesList([]);
                    }
                    if (walletRes.ok && walletJson?.status !== false && walletJson?.data) {
                        setOpdWalletPayload(walletJson.data as LegacyPatientWalletData);
                    } else {
                        setOpdWalletPayload(null);
                    }
                } else {
                    setOpdFilesList([]);
                    setOpdWalletPayload(null);
                }
                setOpdDetailLoadState("ready");
            } catch (e) {
                if ((e as { name?: string }).name === "AbortError") return;
                if (cancelled) return;
                setOpdDetailLoadError(e instanceof Error ? e.message : "Failed to load patient");
                setOpdDetailLoadState("error");
                setOpdDetailData(null);
                setOpdFilesList([]);
                setOpdWalletPayload(null);
            }
        })();
        return () => {
            cancelled = true;
            ac.abort();
        };
    }, [isOpdPatientDetailRoute, opdRouteOpdId]);

    useEffect(() => {
        if (!isIpdPatientDetailRoute && !isDayCarePatientDetailRoute) return;
        let cancelled = false;
        const ac = new AbortController();

        (async () => {
            setOpdDetailLoadState("loading");
            setOpdDetailLoadError(null);
            try {
                const payload = (await getLegacyPatientDetail(opdRouteOpdId).unwrap()) as LegacyPatientDetailApiResponse;
                if (payload?.status === false) {
                    throw new Error(payload?.message || "Failed to load patient detail");
                }
                const patient = payload?.data?.patient;
                const registration = payload?.data?.registration;
                const mapped: LegacyOpdPatientDetailData = {
                    appointment: patient,
                    registration,
                };
                if (cancelled) return;
                setOpdDetailData(mapped);

                const uhid = ((registration?.uhid ?? patient?.uhid) as string | undefined)?.trim() ?? "";
                if (uhid) {
                    const [filesRes, walletRes] = await Promise.all([
                        fetch(`/api/legacy/patientFiles?uhid=${encodeURIComponent(uhid)}`, { signal: ac.signal }),
                        fetch(`/api/legacy/patientWallet?uhid=${encodeURIComponent(uhid)}`, { signal: ac.signal }),
                    ]);
                    const filesJson = await filesRes.json();
                    const walletJson = await walletRes.json();
                    if (cancelled) return;
                    setOpdFilesList(filesRes.ok && filesJson?.status !== false && Array.isArray(filesJson?.data) ? filesJson.data : []);
                    setOpdWalletPayload(walletRes.ok && walletJson?.status !== false && walletJson?.data ? walletJson.data : null);
                } else {
                    setOpdFilesList([]);
                    setOpdWalletPayload(null);
                }
                setOpdDetailLoadState("ready");
            } catch (e) {
                if ((e as { name?: string }).name === "AbortError") return;
                if (cancelled) return;
                setOpdDetailLoadError(e instanceof Error ? e.message : "Failed to load patient");
                setOpdDetailLoadState("error");
                setOpdDetailData(null);
                setOpdFilesList([]);
                setOpdWalletPayload(null);
            }
        })();

        return () => {
            cancelled = true;
            ac.abort();
        };
    }, [isIpdPatientDetailRoute, isDayCarePatientDetailRoute, opdRouteOpdId, getLegacyPatientDetail]);

    const parseDdMmYyyy = (value: string): Date | null => {
        if (!value) return null;
        const [dd, mm, yyyy] = value.split("-");
        if (!dd || !mm || !yyyy) return null;
        const day = Number(dd);
        const month = Number(mm);
        const year = Number(yyyy);
        if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return null;
        const parsed = new Date(year, month - 1, day);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const toApiDate = (value: string): string => {
        const parsed = parseDdMmYyyy(value);
        if (!parsed) return "";
        const yyyy = parsed.getFullYear();
        const mm = String(parsed.getMonth() + 1).padStart(2, "0");
        const dd = String(parsed.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    };

    const handleFilterClick = () => setIsFilterOpen((prev) => !prev);
    const handleFilter = (newFromDate: string, newToDate: string) => {
        setFromDate(newFromDate);
        setToDate(newToDate);
        setCurrentPage(1);
        setIsFilterOpen(false);
    };
    const handleClear = () => {
        setFromDate("");
        setToDate("");
        setCurrentPage(1);
        setIsFilterOpen(false);
    };
    const handleRefresh = () => {
        if (branchOptions.length > 0) {
            setSelectedBranchFilter(String(branchOptions[0].value));
        }
        setSelectedDoctor("all");
        setSearchTerm("");
        setFromDate("");
        setToDate("");
        setCurrentPage(1);
        setIsFilterOpen(false);
    };

    useEffect(() => {
        const controller = new AbortController();

        const loadRows = async () => {
            setIsLoadingRows(true);
            setLoadError(null);
            try {
                const params = new URLSearchParams({
                    branchName: selectedBranchFilter || "1",
                    startDate: toApiDate(fromDate),
                    endDate: toApiDate(toDate),
                    limit: String(itemsPerPage),
                    page: String(currentPage),
                });

                const response = await fetch(`/api/legacy/opdlist?${params.toString()}`, {
                    method: "GET",
                    signal: controller.signal,
                });

                const payload = (await response.json()) as LegacyOpdApiResponse;
                if (!response.ok || payload?.status === false) {
                    throw new Error(payload?.message || "Failed to fetch OPD list");
                }

                const mappedRows: OldOpdRow[] = (payload.data ?? []).map((item) => ({
                    id: Number(item.id) || 0,
                    branchId: Number(item.branch_id) || 0,
                    uhid: item.uhid ?? "-",
                    token: item.token ?? "-",
                    opdId: item.patient_ipd_id ?? "-",
                    name: item.patient_name ?? "-",
                    doctor: item.doctor_id ? `Doctor ${item.doctor_id}` : "-",
                    appointmentDate: item.date_app ?? "-",
                    appointmentTime: item.time_slot ?? "-",
                    gender: item.gender ?? "-",
                    age: item.age ?? "-",
                    type: item.patient_panel ?? "-",
                    city: "-",
                    state: "-",
                    country: "-",
                    createdAt: item.created_at ?? "-",
                }));

                setRows(mappedRows);
                setTotalRecords(Number(payload.total_records) || 0);
            } catch (error) {
                if ((error as { name?: string })?.name === "AbortError") return;
                setRows([]);
                setTotalRecords(0);
                setLoadError(error instanceof Error ? error.message : "Failed to fetch OPD list");
            } finally {
                setIsLoadingRows(false);
            }
        };

        loadRows();
        return () => controller.abort();
    }, [currentPage, fromDate, itemsPerPage, searchTerm, selectedBranchFilter, selectedDoctor, toDate]);

    useEffect(() => {
        if (!branchFilterPersistReady) return;
        if (!isBranchFilterSuperAdmin) return;
        if (isLoadingBranches) return;
        const rows = branchesData?.data;
        if (!Array.isArray(rows) || rows.length === 0) return;
        if (selectedBranchFilter !== "") {
            const valid = rows.some((b) => String(b.id) === selectedBranchFilter);
            if (!valid) setSelectedBranchFilter(String(rows[0].id));
            return;
        }
        setSelectedBranchFilter(String(rows[0].id));
    }, [
        branchFilterPersistReady,
        isBranchFilterSuperAdmin,
        isLoadingBranches,
        branchesData,
        selectedBranchFilter,
        setSelectedBranchFilter,
    ]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!filterRef.current) return;
            if (!filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (activeTab !== "wallet") {
            setSelectedWalletOrderId(null);
            setWalletOrderDetail(null);
            setWalletOrderItems([]);
            setWalletOrderLoadState("idle");
            setWalletOrderLoadError(null);
        }
    }, [activeTab]);

    useEffect(() => {
        if (activeTab !== "bill Details" && activeTab !== "medicine") return;
        if (!isLegacyPatientDetailRoute) return;
        if (opdDetailLoadState !== "ready") return;

        const patientId = opdRouteOpdId.trim();

        if (!patientId) {
            setBillServiceOrders([]);
            setBillProductOrders([]);
            setBillOrdersLoadState("ready");
            setBillOrdersLoadError(null);
            return;
        }

        let cancelled = false;
        (async () => {
            const shouldFetchService = activeTab === "bill Details";
            setBillOrdersLoadState("loading");
            setBillOrdersLoadError(null);
            setBillServiceOrders([]);
            setBillProductOrders([]);
            try {
                let serviceResult: PromiseSettledResult<any> | null = null;
                let productResult: PromiseSettledResult<any>;
                if (shouldFetchService) {
                    const results = await Promise.allSettled([
                        getLegacyOrders({
                            patientId,
                            uhid: "",
                            saleType: "service",
                            orderId: "",
                        }).unwrap(),
                        getLegacyOrders({
                            patientId,
                            uhid: "",
                            saleType: "product",
                            orderId: "",
                        }).unwrap(),
                    ]);
                    serviceResult = results[0];
                    productResult = results[1];
                } else {
                    const results = await Promise.allSettled([
                        getLegacyOrders({
                            patientId,
                            uhid: "",
                            saleType: "product",
                            orderId: "",
                        }).unwrap(),
                    ]);
                    productResult = results[0];
                }

                if (cancelled) return;
                let errorMessage: string | null = null;

                if (shouldFetchService && serviceResult) {
                    if (serviceResult.status === "fulfilled") {
                        const payload = serviceResult.value;
                        const msg = (payload?.message ?? "").trim().toLowerCase();
                        const isNoRecord = msg === "no record found";
                        if (payload?.status === false && !isNoRecord) {
                            errorMessage = payload?.message || "Failed to load service invoice details";
                            setBillServiceOrders([]);
                        } else {
                            setBillServiceOrders(Array.isArray(payload?.data) ? payload.data : []);
                        }
                    } else {
                        errorMessage =
                            serviceResult.reason instanceof Error
                                ? serviceResult.reason.message
                                : "Failed to load service invoice details";
                        setBillServiceOrders([]);
                    }
                } else {
                    setBillServiceOrders([]);
                }

                if (productResult.status === "fulfilled") {
                    const payload = productResult.value;
                    const msg = (payload?.message ?? "").trim().toLowerCase();
                    const isNoRecord = msg === "no record found";
                    if (payload?.status === false && !isNoRecord) {
                        if (!errorMessage) {
                            errorMessage = payload?.message || "Failed to load product invoice details";
                        }
                        setBillProductOrders([]);
                    } else {
                        setBillProductOrders(Array.isArray(payload?.data) ? payload.data : []);
                    }
                } else {
                    if (!errorMessage) {
                        errorMessage =
                            productResult.reason instanceof Error
                                ? productResult.reason.message
                                : "Failed to load product invoice details";
                    }
                    setBillProductOrders([]);
                }

                setBillOrdersLoadError(errorMessage);
                setBillOrdersLoadState("ready");
            } catch (error) {
                if (cancelled) return;
                setBillServiceOrders([]);
                setBillProductOrders([]);
                setBillOrdersLoadState("error");
                setBillOrdersLoadError(error instanceof Error ? error.message : "Failed to load bill details");
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [activeTab, isLegacyPatientDetailRoute, opdDetailLoadState, opdDetailData, opdRouteOpdId, getLegacyOrders]);

    useEffect(() => {
        if (activeTab !== "bill Details") return;
        if (!isLegacyPatientDetailRoute) return;
        if (opdDetailLoadState !== "ready") return;
        const patientId = opdRouteOpdId.trim();
        const panel = String(opdDetailData?.appointment?.patient_panel ?? "").trim().toLowerCase();
        const isNormalOrTpaPanel = panel === "normal" || panel === "tpa" || panel === "npa";

        if (!patientId || isNormalOrTpaPanel) {
            setPanelPatientServiceInvoices([]);
            setPanelPatientServiceInvoicesLoadState("ready");
            setPanelPatientServiceInvoicesLoadError(null);
            return;
        }

        let cancelled = false;
        (async () => {
            setPanelPatientServiceInvoicesLoadState("loading");
            setPanelPatientServiceInvoicesLoadError(null);
            setPanelPatientServiceInvoices([]);
            try {
                const payload = await getLegacyPanelPatientServicesInvoices(patientId).unwrap();
                const msg = String(payload?.message ?? "").trim().toLowerCase();
                const isNoRecord = msg.includes("no record");
                if (payload?.status === false && !isNoRecord) {
                    throw new Error(payload?.message || "Failed to load patient care");
                }
                if (cancelled) return;
                setPanelPatientServiceInvoices(Array.isArray(payload?.data) ? payload.data : []);
                setPanelPatientServiceInvoicesLoadState("ready");
            } catch (error) {
                if (cancelled) return;
                setPanelPatientServiceInvoices([]);
                setPanelPatientServiceInvoicesLoadState("error");
                setPanelPatientServiceInvoicesLoadError(
                    error instanceof Error ? error.message : "Failed to load patient care"
                );
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [
        activeTab,
        isLegacyPatientDetailRoute,
        opdDetailLoadState,
        opdRouteOpdId,
        opdDetailData,
        getLegacyPanelPatientServicesInvoices,
    ]);

    useEffect(() => {
        if (activeTab !== "package") return;
        if (!isIpdPatientDetailRoute && !isDayCarePatientDetailRoute) return;
        const patientId = opdRouteOpdId.trim();
        if (!patientId) return;

        let cancelled = false;
        const doctorFallback = ((opdDetailData?.appointment?.doctor_name ?? "") as string).trim();
        (async () => {
            setPackageLoadState("loading");
            setPackageLoadError(null);
            setPackageItems([]);
            try {
                const payload = await getLegacyPatientPackage(patientId).unwrap();
                if (payload?.status === false) {
                    throw new Error(payload?.message || "Failed to load package listing");
                }
                const rows = Array.isArray(payload?.data) ? payload.data : [];
                if (cancelled) return;
                setPackageItems(
                    rows.map((row) => ({
                        packageName: (row.package_name ?? "").trim() || "N/A",
                        doctor: doctorFallback || (row.doctor_id ?? "").trim() || "N/A",
                        startDate: (row.start_date ?? "").trim() || "N/A",
                        endDate: (row.end_date ?? "").trim() || "N/A",
                        remark: (row.remark ?? "").trim() || "N/A",
                        createdDate: (row.created_at ?? "").trim() || "N/A",
                        status: (row.status ?? "").trim() || "N/A",
                    }))
                );
                setPackageLoadState("ready");
            } catch (error) {
                if (cancelled) return;
                setPackageLoadState("error");
                setPackageLoadError(error instanceof Error ? error.message : "Failed to load package listing");
                setPackageItems([]);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [activeTab, isIpdPatientDetailRoute, isDayCarePatientDetailRoute, opdRouteOpdId, getLegacyPatientPackage, opdDetailData]);

    useEffect(() => {
        if (activeTab !== "room") return;
        if (!isIpdPatientDetailRoute) return;
        const patientId = opdRouteOpdId.trim();
        if (!patientId) return;

        let cancelled = false;
        (async () => {
            setRoomLoadState("loading");
            setRoomLoadError(null);
            setRoomItems([]);
            try {
                const payload = await getLegacyPatientRoom(patientId).unwrap();
                const message = String(payload?.message ?? "").toLowerCase();
                const isNoRecord = message.includes("no record") || message.includes("not found");
                if (payload?.status === false && !isNoRecord) {
                    throw new Error(payload?.message || "Failed to load room details");
                }
                const rows = Array.isArray(payload?.data) ? payload.data : [];
                if (cancelled) return;
                setRoomItems(
                    rows.map((row) => ({
                        building: (row.building_name ?? "").trim() || "N/A",
                        floor: (row.floor_name ?? "").trim() || "N/A",
                        room: [row.room_type, row.room_number].map((v) => (v ?? "").trim()).filter(Boolean).join(" ") || "N/A",
                        bedNo: (row.bed_number ?? "").trim() || "N/A",
                        nurse: (row.room_attendant_name ?? "").trim() || "N/A",
                        attendantBedNo: (row.attendant_bed_number ?? "").trim() || "N/A",
                        remark: (row.remark ?? "").trim() || "N/A",
                        status: (row.status ?? "").trim() || "N/A",
                        allotmentDate: (row.created_at ?? "").trim() || "N/A",
                    }))
                );
                setRoomLoadState("ready");
            } catch (error) {
                if (cancelled) return;
                setRoomLoadState("error");
                setRoomLoadError(error instanceof Error ? error.message : "Failed to load room details");
                setRoomItems([]);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [activeTab, isIpdPatientDetailRoute, opdRouteOpdId, getLegacyPatientRoom]);

    useEffect(() => {
        if (activeTab !== "report") return;
        if (!isIpdPatientDetailRoute && !isDayCarePatientDetailRoute) return;
        const patientId = opdRouteOpdId.trim();
        if (!patientId) return;

        let cancelled = false;
        (async () => {
            setReportLoadState("loading");
            setReportLoadError(null);
            setReportItems([]);
            try {
                const payload = await getLegacyPatientReport({
                    patientId,
                    uhid: "",
                    patientType: isIpdPatientDetailRoute ? "ipd" : "day_care",
                }).unwrap();
                if (payload?.status === false) {
                    const message = (payload?.message ?? "").trim().toLowerCase();
                    if (message === "no record found") {
                        if (cancelled) return;
                        setReportItems([]);
                        setReportLoadState("ready");
                        setReportLoadError(null);
                        return;
                    }
                    throw new Error(payload?.message || "Failed to load report details");
                }
                const rows = Array.isArray(payload?.data) ? payload.data : [];
                if (cancelled) return;
                setReportItems(
                    rows.map((row) => ({
                        category: (row.report_name ?? "").trim() || "N/A",
                        reportUrl: (row.report_url ?? "").trim(),
                        followUp: (row.follow_up_date ?? "").trim() || "N/A",
                        remark: (row.remark ?? "").trim() || "N/A",
                        date: (row.follow_up_date ?? "").trim() || "N/A",
                    }))
                );
                setReportLoadState("ready");
            } catch (error) {
                if (cancelled) return;
                setReportLoadState("error");
                setReportLoadError(error instanceof Error ? error.message : "Failed to load report details");
                setReportItems([]);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [
        activeTab,
        isIpdPatientDetailRoute,
        isDayCarePatientDetailRoute,
        opdRouteOpdId,
        getLegacyPatientReport,
    ]);

    const openWalletOrderDetails = async (orderId: string) => {
        const normalizedOrderId = orderId.trim();
        if (!normalizedOrderId) return;

        setSelectedWalletOrderId(normalizedOrderId);
        setWalletOrderLoadState("loading");
        setWalletOrderLoadError(null);
        setWalletOrderDetail(null);
        setWalletOrderItems([]);

        try {
            const payload = await getLegacyOrderDetail(normalizedOrderId).unwrap();
            if (payload?.status === false) {
                throw new Error(payload?.message || "Failed to fetch order details");
            }

            setWalletOrderDetail(payload?.data?.order ?? null);
            setWalletOrderItems(Array.isArray(payload?.data?.items) ? payload.data.items : []);
            setWalletOrderLoadState("ready");
        } catch (error) {
            setWalletOrderLoadState("error");
            setWalletOrderLoadError(error instanceof Error ? error.message : "Failed to fetch order details");
        }
    };

    const reg = opdDetailData?.registration;
    const appt = opdDetailData?.appointment;
    const summaryName = reg?.patient ? String(reg.patient).trim() : "Ms kavita";
    const summaryUhid = (reg?.uhid ?? appt?.uhid ?? "") as string;
    const summaryContact = (reg?.contact_number ?? "") as string;

    useEffect(() => {
        if (activeTab !== "wallet") return;
        if (!isLegacyPatientDetailRoute) return;
        const uhid = (summaryUhid ?? "").trim();
        if (!uhid) return;

        let cancelled = false;
        const asDisplay = (value: string | null | undefined) => (value ?? "").trim() || "N/A";
        const yesNoFlag = (value: string | null | undefined) => {
            const raw = (value ?? "").trim();
            if (!raw) return "N/A";
            if (raw === "1" || raw.toLowerCase() === "yes") return "Yes";
            if (raw === "0" || raw.toLowerCase() === "no") return "No";
            return raw;
        };
        const earnByLabel = (slug: string | null | undefined) => {
            const raw = (slug ?? "").trim();
            if (!raw) return "N/A";
            const base = raw.replace(/_(to|from|in|out)$/i, "");
            const pretty = base
                .split(/[_\s]+/)
                .filter(Boolean)
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(" ");
            return pretty ? `${pretty} (Earn)` : "N/A";
        };

        (async () => {
            setHealthCardPointsLoadState("loading");
            setHealthCardPointsLoadError(null);
            setHealthCardPointsRow(null);
            setHealthCardTransactionLoadState("loading");
            setHealthCardTransactionLoadError(null);
            setHealthCardTransactionRows([]);

            const [pointsResult, txnResult] = await Promise.allSettled([
                getLegacyHealthCardPoints(uhid).unwrap(),
                getLegacyHealthCardTransaction(uhid).unwrap(),
            ]);

            if (cancelled) return;

            if (pointsResult.status === "fulfilled") {
                const payload = pointsResult.value;
                const msg = String(payload?.message ?? "").toLowerCase();
                const isNoRecord = msg.includes("no record") || msg.includes("not found");
                if (payload?.status === false && !isNoRecord) {
                    setHealthCardPointsLoadError(payload?.message || "Failed to load health card points");
                    setHealthCardPointsLoadState("error");
                } else {
                    const data = payload?.data && typeof payload.data === "object" ? payload.data : null;
                    if (data && (data.uhid || data.coins || data.card || data.contact_number)) {
                        const rawContact = (data.contact_number ?? "").trim();
                        setHealthCardPointsRow({
                            id: asDisplay(data.id),
                            uhid: asDisplay(data.uhid),
                            contactNumber: rawContact ? maskContact(rawContact) : "N/A",
                            points: asDisplay(data.coins),
                            cardNo: asDisplay(data.card),
                            status: "Active",
                        });
                    } else {
                        setHealthCardPointsRow(null);
                    }
                    setHealthCardPointsLoadState("ready");
                }
            } else {
                setHealthCardPointsLoadError(
                    pointsResult.reason instanceof Error
                        ? pointsResult.reason.message
                        : "Failed to load health card points"
                );
                setHealthCardPointsLoadState("error");
            }

            if (txnResult.status === "fulfilled") {
                const payload = txnResult.value;
                const msg = String(payload?.message ?? "").toLowerCase();
                const isNoRecord = msg.includes("no record") || msg.includes("not found");
                if (payload?.status === false && !isNoRecord) {
                    setHealthCardTransactionLoadError(
                        payload?.message || "Failed to load health card transactions"
                    );
                    setHealthCardTransactionLoadState("error");
                } else {
                    const rows = Array.isArray(payload?.data) ? payload.data : [];
                    setHealthCardTransactionRows(
                        rows.map((row) => ({
                            points: asDisplay(row.coins),
                            earnBy: earnByLabel(row.slug_type),
                            txn: asDisplay(row.entry),
                            orderId: asDisplay(row.order_id),
                            orderReturn: yesNoFlag(row.order_status),
                            isExpired: yesNoFlag(row.is_expired),
                            createdAt: asDisplay(row.created_at),
                        }))
                    );
                    setHealthCardTransactionLoadState("ready");
                }
            } else {
                setHealthCardTransactionLoadError(
                    txnResult.reason instanceof Error
                        ? txnResult.reason.message
                        : "Failed to load health card transactions"
                );
                setHealthCardTransactionLoadState("error");
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [
        activeTab,
        isLegacyPatientDetailRoute,
        summaryUhid,
        getLegacyHealthCardPoints,
        getLegacyHealthCardTransaction,
    ]);

    const opdAppointmentItems = useMemo(() => {
        if (!isLegacyPatientDetailRoute) return null;
        if (opdDetailLoadState === "loading" || opdDetailLoadState === "idle") {
            return [{ label: "Status", value: "Loading patient details…" }];
        }
        if (opdDetailLoadState === "error") {
            return [{ label: "Error", value: opdDetailLoadError ?? "Failed to load" }];
        }
        return buildAppointmentDetailItems(appt);
    }, [isLegacyPatientDetailRoute, opdDetailLoadState, opdDetailLoadError, appt]);

    const opdPatientDetailsView = useMemo(
        () => (isLegacyPatientDetailRoute && opdDetailLoadState === "ready" ? buildPatientDetailsFromRegistration(reg) : null),
        [isLegacyPatientDetailRoute, opdDetailLoadState, reg]
    );

    const opdVitalsItems = useMemo(
        () => (isLegacyPatientDetailRoute && opdDetailLoadState === "ready" ? buildVitals(appt, reg) : null),
        [isLegacyPatientDetailRoute, opdDetailLoadState, appt, reg]
    );

    const opdReferralItems = useMemo(
        () => (isLegacyPatientDetailRoute && opdDetailLoadState === "ready" ? buildReferralItems(reg) : null),
        [isLegacyPatientDetailRoute, opdDetailLoadState, reg]
    );

    const opdOtherInfoItems = useMemo(
        () => (isLegacyPatientDetailRoute && opdDetailLoadState === "ready" ? buildOtherInformationItems(reg) : null),
        [isLegacyPatientDetailRoute, opdDetailLoadState, reg]
    );

    const opdMedicalItems = useMemo(
        () => (isLegacyPatientDetailRoute && opdDetailLoadState === "ready" ? buildMedicalItems(reg) : null),
        [isLegacyPatientDetailRoute, opdDetailLoadState, reg]
    );

    const opdHealthCardNo = useMemo(() => {
        if (!isLegacyPatientDetailRoute || opdDetailLoadState !== "ready") return "N/A";
        const raw = (reg?.jshealth_card_no as string | undefined)?.trim();
        return raw && raw.length > 0 ? raw : "N/A";
    }, [isLegacyPatientDetailRoute, opdDetailLoadState, reg]);

    const opdFileCardItems = useMemo(() => {
        if (!isLegacyPatientDetailRoute || opdDetailLoadState !== "ready") return null;
        return buildPatientFileCardItems(opdFilesList);
    }, [isLegacyPatientDetailRoute, opdDetailLoadState, opdFilesList]);

    const opdWalletCard = useMemo(() => {
        if (!isLegacyPatientDetailRoute || opdDetailLoadState !== "ready") return null;
        return buildPatientWalletCardProps(opdWalletPayload);
    }, [isLegacyPatientDetailRoute, opdDetailLoadState, opdWalletPayload]);

    const opdSummaryInfoItems = useMemo(() => {
        if (!isLegacyPatientDetailRoute || opdDetailLoadState !== "ready") {
            return PATIENT_SUMMARY_INFO_ITEMS;
        }
        return buildPatientSummaryItems(summaryUhid, summaryContact);
    }, [isLegacyPatientDetailRoute, opdDetailLoadState, summaryUhid, summaryContact]);

    const opdPatientFilesTableSections = useMemo(() => {
        if (!isLegacyPatientDetailRoute || opdDetailLoadState !== "ready") {
            return PATIENT_FILES_SECTIONS;
        }
        return [buildPatientFilesTableSection(opdFilesList)];
    }, [isLegacyPatientDetailRoute, opdDetailLoadState, opdFilesList]);

    const handleWalletPackageDownload = useCallback(async (idx: number) => {
        if (downloadingWalletPackageRowKey) return;
        const pkg = opdWalletPayload?.package?.[idx];
        const packageId = String(pkg?.id ?? pkg?.pwid ?? "").trim();
        if (!packageId) return;
        const rowKey = `wallet-package-${idx}`;
        try {
            setDownloadingWalletPackageRowKey(rowKey);
            setWalletAdvancePayload(null);
            setWalletSinglePayload(null);
            await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(null))));
            const res = await fetch(`/api/legacy/walletPackageDetail?packageId=${encodeURIComponent(packageId)}`, { cache: "no-store" });
            const json = await res.json();
            const invoiceData: WalletInvoiceData = json?.data ?? {};
            const isAdvance = (invoiceData.sanklp_type ?? "").toLowerCase() === "advance"
                || (invoiceData.type ?? "").toLowerCase().includes("jeena sikho wallet");
            if (isAdvance) {
                setWalletAdvanceShowDate(true);
                setWalletAdvancePayload(invoiceData);
                await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(null))));
                await sankalpWalletRef.current?.downloadPdf();
            } else {
                setWalletSingleShowDate(true);
                setWalletSinglePayload(invoiceData);
                await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(null))));
                await sankalpSingleRef.current?.downloadPdf();
            }
        } finally {
            setDownloadingWalletPackageRowKey(null);
        }
    }, [downloadingWalletPackageRowKey, opdWalletPayload]);

    const handleWalletInstallmentDownload = useCallback(async (idx: number) => {
        if (downloadingWalletInstallmentRowKey) return;
        const ins = opdWalletPayload?.installment?.[idx];
        const paymentId = String(ins?.id ?? ins?.receipt_no ?? ins?.transaction ?? "").trim();
        if (!paymentId) return;
        const rowKey = `wallet-installment-${idx}`;
        try {
            setDownloadingWalletInstallmentRowKey(rowKey);
            setWalletAdvancePayload(null);
            setWalletSinglePayload(null);
            await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(null))));
            const res = await fetch(`/api/legacy/walletPackagePayment?paymentId=${encodeURIComponent(paymentId)}`, { cache: "no-store" });
            const json = await res.json();
            const invoiceData: WalletInvoiceData = json?.data ?? {};
            const isAdvance = (invoiceData.sanklp_type ?? "").toLowerCase() === "advance"
                || (invoiceData.type ?? "").toLowerCase().includes("jeena sikho wallet");
            if (isAdvance) {
                setWalletAdvanceShowDate(false);
                setWalletAdvancePayload(invoiceData);
                await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(null))));
                await sankalpWalletRef.current?.downloadPdf();
            } else {
                setWalletSingleShowDate(false);
                setWalletSinglePayload(invoiceData);
                await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(null))));
                await sankalpSingleRef.current?.downloadPdf();
            }
        } finally {
            setDownloadingWalletInstallmentRowKey(null);
        }
    }, [downloadingWalletInstallmentRowKey, opdWalletPayload]);

    const opdWalletTabTableSections = useMemo(() => {
        if (!isLegacyPatientDetailRoute || opdDetailLoadState !== "ready") return null;
        const baseSections = buildWalletTabTableSections(opdWalletPayload, openWalletOrderDetails);
        return baseSections.map((section) => {
            if (section.id === "wallet-package") {
                const rows = (section.rows ?? []).map((row, idx) => {
                    const rowKey = `wallet-package-${idx}`;
                    const withAction = [...row];
                    withAction[withAction.length - 1] = (
                        <div key={`wallet-package-action-${rowKey}`} className="flex items-center gap-2">
                            <Tooltip content="View Package" position="top">
                                <button
                                    type="button"
                                    className="rounded p-1 transition-colors hover:bg-[#F2F7F1] cursor-pointer"
                                    aria-label="View package"
                                >
                                    <Image src="/icons/ViewEyeIcon.svg" alt="View" width={18} height={18} />
                                </button>
                            </Tooltip>
                            <Tooltip content="Download Invoice" position="top">
                                <button
                                    type="button"
                                    className="rounded p-1 transition-colors hover:bg-[#F2F7F1] cursor-pointer"
                                    aria-label="Download invoice"
                                    onClick={() => handleWalletPackageDownload(idx)}
                                    disabled={Boolean(downloadingWalletPackageRowKey)}
                                >
                                    {downloadingWalletPackageRowKey === rowKey ? (
                                        <SpinnerLoader className="h-[18px] w-[18px]" />
                                    ) : (
                                        <Image src="/icons/Download.svg" alt="Download" width={18} height={18} />
                                    )}
                                </button>
                            </Tooltip>
                        </div>
                    );
                    return withAction;
                });
                return { ...section, rows };
            }

            if (section.id === "wallet-installment") {
                const columns: TableListingSection["columns"] = (section.columns ?? []).map((column, index) => {
                    if (index === 0) return { ...column, position: "first" as const };
                    return { ...column, position: "middle" as const };
                });
                columns.push({ label: "Action", position: "last" as const });
                const rows = (section.rows ?? []).map((row, idx) => {
                    const rowKey = `wallet-installment-${idx}`;
                    return [
                        ...row,
                        <div key={`wallet-installment-action-${rowKey}`} className="flex items-center gap-2">
                            <Tooltip content="View Payment Details" position="top">
                                <button
                                    type="button"
                                    className="rounded p-1 transition-colors hover:bg-[#F2F7F1] cursor-pointer"
                                    aria-label="View payment details"
                                >
                                    <Image src="/icons/ViewEyeIcon.svg" alt="View" width={18} height={18} />
                                </button>
                            </Tooltip>
                            <Tooltip content="Download Invoice" position="top">
                                <button
                                    type="button"
                                    className="rounded p-1 transition-colors hover:bg-[#F2F7F1] cursor-pointer"
                                    aria-label="Download invoice"
                                    onClick={() => handleWalletInstallmentDownload(idx)}
                                    disabled={Boolean(downloadingWalletInstallmentRowKey)}
                                >
                                    {downloadingWalletInstallmentRowKey === rowKey ? (
                                        <SpinnerLoader className="h-[18px] w-[18px]" />
                                    ) : (
                                        <Image src="/icons/Download.svg" alt="Download" width={18} height={18} />
                                    )}
                                </button>
                            </Tooltip>
                        </div>,
                    ];
                });
                return { ...section, columns, rows };
            }

            return section;
        });
    }, [
        isLegacyPatientDetailRoute,
        opdDetailLoadState,
        opdWalletPayload,
        openWalletOrderDetails,
        handleWalletPackageDownload,
        handleWalletInstallmentDownload,
        downloadingWalletPackageRowKey,
        downloadingWalletInstallmentRowKey,
    ]);

    const opdJsHealthItems = useMemo(() => {
        if (!isLegacyPatientDetailRoute || opdDetailLoadState !== "ready") return JS_HEALTH_CARD_POINTS_ITEMS;
        return buildJsHealthCardItems(opdWalletPayload);
    }, [isLegacyPatientDetailRoute, opdDetailLoadState, opdWalletPayload]);

    const buildBillPdfPayload = (row: WalletOrderDetailRecord): BillOfSupplyProps => {
        const nowIso = new Date().toISOString();
        return {
            branch: {
                address: ((row.address ?? "") as string).trim() || "N/A",
                district: ((row.district ?? "") as string).trim() || "N/A",
                state: ((row.state ?? "") as string).trim() || "N/A",
                pin_code: ((row.pin_code ?? "") as string).trim() || "N/A",
                phone_number: "N/A",
                type: "clinic",
            },
            patient: {
                patient: ((row.customer_name ?? "") as string).trim() || "N/A",
                parent_name: "N/A",
                bp: "N/A",
                sl: "N/A",
                weight: "N/A",
                height: "N/A",
                uhid: ((row.patient_uhid ?? "") as string).trim() || "N/A",
                opdId: ((row.id ?? "") as string).trim() || "N/A",
                age: ((row.age ?? "") as string).trim() || "N/A",
                gender: ((row.gender ?? "") as string).trim() || "N/A",
            },
            doctor: {
                name: "N/A",
                education: [],
                reg_no: "",
            },
            appointment: {
                created_at: ((row.created_at ?? "") as string).trim() || nowIso,
            },
            diagnosis: "N/A",
            showDownloadButton: false,
        };
    };

    const downloadServiceInvoicePdf = async (orderId: string) => {
        const normalizedOrderId = orderId.trim();
        if (!normalizedOrderId || downloadingServiceOrderId) return;
        try {
            setDownloadingServiceOrderId(normalizedOrderId);
            const payload = await getLegacyOrders({
                patientId: "",
                uhid: "",
                saleType: "service",
                orderId: normalizedOrderId,
            }).unwrap();
            if (payload?.status === false) {
                throw new Error(payload?.message || "Failed to load service invoice details");
            }
            const row = Array.isArray(payload?.data) ? payload.data[0] : null;
            if (!row) {
                throw new Error("No service invoice data found");
            }
            setBillOfSupplyPayload(buildBillPdfPayload(row));
            await new Promise((resolve) => setTimeout(resolve, 0));
            await billOfSupplyRef.current?.downloadPdf();
        } catch (error) {
            console.error("Service invoice download failed", error);
        } finally {
            setDownloadingServiceOrderId(null);
        }
    };

    const downloadProductInvoicePdf = async (orderId: string) => {
        const normalizedOrderId = orderId.trim();
        if (!normalizedOrderId || downloadingProductOrderId) return;
        try {
            setDownloadingProductOrderId(normalizedOrderId);
            const payload = await getLegacyOrders({
                patientId: "",
                uhid: "",
                saleType: "product",
                orderId: normalizedOrderId,
            }).unwrap();
            if (payload?.status === false) {
                throw new Error(payload?.message || "Failed to load product invoice details");
            }
            const row = Array.isArray(payload?.data) ? payload.data[0] : null;
            if (!row) {
                throw new Error("No product invoice data found");
            }
            setTaxInvoicePayload(buildBillPdfPayload(row));
            await new Promise((resolve) => setTimeout(resolve, 0));
            await taxInvoiceRef.current?.downloadPdf();
        } catch (error) {
            console.error("Product invoice download failed", error);
        } finally {
            setDownloadingProductOrderId(null);
        }
    };

    const shouldShowPatientCareSection = useMemo(() => {
        if (!isLegacyPatientDetailRoute || opdDetailLoadState !== "ready") return false;
        const panel = String(appt?.patient_panel ?? "").trim().toLowerCase();
        return panel !== "normal" && panel !== "tpa" && panel !== "npa";
    }, [isLegacyPatientDetailRoute, opdDetailLoadState, appt]);

    const patientCareSections = useMemo<TableListingSection[]>(() => {
        const asDisplay = (value: string | null | undefined) => (value ?? "").trim() || "N/A";
        if (panelPatientServiceInvoicesLoadState === "loading") {
            return [
                {
                    id: "patient-care",
                    title: "Patient Care",
                    columns: [
                        { label: "Sr no.", position: "first" },
                        { label: "Services" },
                        { label: "Total Amount" },
                        { label: "Created Date", position: "last" },
                    ],
                    rows: [],
                    emptyMessage: "Loading...",
                },
            ];
        }
        if (panelPatientServiceInvoicesLoadState === "error") {
            return [
                {
                    id: "patient-care",
                    title: "Patient Care",
                    columns: [
                        { label: "Sr no.", position: "first" },
                        { label: "Services" },
                        { label: "Total Amount" },
                        { label: "Created Date", position: "last" },
                    ],
                    rows: [],
                    emptyMessage: panelPatientServiceInvoicesLoadError || "Failed to load",
                },
            ];
        }

        const rows = panelPatientServiceInvoices.map((item, idx) => [
            String(idx + 1),
            `${asDisplay(item.payment_type)} (${asDisplay(item.order_id ?? item.id)})`,
            asDisplay(item.amount_with_tax),
            asDisplay(item.created),
        ]);
        return [
            {
                id: "patient-care",
                title: "Patient Care",
                columns: [
                    { label: "Sr no.", position: "first" },
                    { label: "Services" },
                    { label: "Total Amount" },
                    { label: "Created Date", position: "last" },
                ],
                rows,
                emptyMessage: rows.length === 0 ? "No Data Available" : undefined,
            },
        ];
    }, [panelPatientServiceInvoices, panelPatientServiceInvoicesLoadState, panelPatientServiceInvoicesLoadError]);

    const serviceInvoiceSections = useMemo<TableListingSection[]>(() => {
        const asDisplay = (value: string | null | undefined) => (value ?? "").trim() || "N/A";
        const toInvoiceId = (row: WalletOrderDetailRecord) => {
            const serial = asDisplay(row.serial_no);
            const year = asDisplay(row.year);
            const month = asDisplay(row.month);
            if (serial === "N/A" || year === "N/A" || month === "N/A") return "N/A";
            return `JS-${year}-${month}-${serial}`;
        };
        const section = PATIENT_SERVICES_AND_INVOICE_SECTIONS[0];
        if (!section) return [];
        if (billOrdersLoadState === "loading") {
            return [{ ...section, rows: [], emptyMessage: "Loading..." }];
        }
        if (billOrdersLoadState === "error") {
            return [{ ...section, rows: [], emptyMessage: billOrdersLoadError || "Failed to load data" }];
        }

        const rows = billServiceOrders.map((row, idx) => [
            String(idx + 1),
            asDisplay(row.patient_uhid),
            asDisplay(row.order_price),
            asDisplay(row.discount),
            asDisplay(row.recieved_amount),
            "N/A",
            asDisplay(row.id),
            toInvoiceId(row),
            asDisplay(row.payment_method),
            "N/A",
            asDisplay(row.created_at),
            <button
                key={`service-invoice-print-${String(row.id ?? idx)}`}
                className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                onClick={() => downloadServiceInvoicePdf(asDisplay(row.id))}
                disabled={downloadingServiceOrderId === asDisplay(row.id)}
            >
                {downloadingServiceOrderId === asDisplay(row.id) ? (
                    <SpinnerLoader />
                ) : (
                    <Image src="/icons/billprinticon.svg" alt="Print" width={20} height={20} />
                )}
            </button>,
        ]);
        return [{ ...section, rows, emptyMessage: rows.length === 0 ? "No Data Available" : undefined }];
    }, [billServiceOrders, billOrdersLoadState, billOrdersLoadError, downloadingServiceOrderId]);

    const productInvoiceSections = useMemo<TableListingSection[]>(() => {
        const asDisplay = (value: string | null | undefined) => (value ?? "").trim() || "N/A";
        const toInvoiceId = (row: WalletOrderDetailRecord) => {
            const serial = asDisplay(row.serial_no);
            const year = asDisplay(row.year);
            const month = asDisplay(row.month);
            if (serial === "N/A" || year === "N/A" || month === "N/A") return "N/A";
            return `JS-${year}-${month}-${serial}`;
        };
        const section = PRODUCT_INVOICE_DETAILS_SECTIONS[0];
        if (!section) return [];
        if (billOrdersLoadState === "loading") {
            return [{ ...section, rows: [], emptyMessage: "Loading..." }];
        }
        if (billOrdersLoadState === "error") {
            return [{ ...section, rows: [], emptyMessage: billOrdersLoadError || "Failed to load data" }];
        }

        const rows = billProductOrders.map((row, idx) => [
            String(idx + 1),
            asDisplay(row.patient_uhid),
            asDisplay(row.id),
            toInvoiceId(row),
            asDisplay(row.order_price),
            asDisplay(row.discount),
            asDisplay(row.arogya_points),
            asDisplay(row.payment_method),
            "N/A",
            asDisplay(row.recieved_amount),
            asDisplay(row.created_at),
            <button
                key={`product-invoice-print-${String(row.id ?? idx)}`}
                className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                onClick={() => downloadProductInvoicePdf(asDisplay(row.id))}
                disabled={downloadingProductOrderId === asDisplay(row.id)}
            >
                {downloadingProductOrderId === asDisplay(row.id) ? (
                    <SpinnerLoader />
                ) : (
                    <Image src="/icons/billprinticon.svg" alt="Print" width={20} height={20} />
                )}
            </button>,
        ]);
        return [{ ...section, rows, emptyMessage: rows.length === 0 ? "No Data Available" : undefined }];
    }, [billProductOrders, billOrdersLoadState, billOrdersLoadError, downloadingProductOrderId]);

    const nursingNoteSections = useMemo<TableListingSection[]>(() => {
        const createdAt = ((reg?.created_at as string | undefined) ?? "").trim() || "N/A";
        return [
            {
                id: "nursing-note-details",
                title: ` Registration Date: ${createdAt}`,
                titleRightContent: (
                    <div className="flex items-center gap-3">
                        <FormSelectField
                            label=""
                            hideLabel
                            options={NURSING_NOTE_SEARCH_KEY_OPTIONS}
                            value={nursingNoteFilters.metakey}
                            onChange={(value) => {
                                const v = Array.isArray(value) ? value[0] : value || "";
                                setNursingNoteFilters((prev) => ({ ...prev, metakey: v, page: 1 }));
                            }}
                            placeholder="Select Column"
                            mode="single"
                            background="normal"
                            width={300}
                        />
                        <div className="flex-shrink-0" style={{ width: "300px" }}>
                            <TableSearchInput
                                value={nursingNoteFilters.metavalue}
                                onChange={(value) =>
                                    setNursingNoteFilters((prev) => ({
                                        ...prev,
                                        metavalue: value,
                                        metakey: value.trim() ? prev.metakey : "",
                                        page: prev.metavalue !== value ? 1 : prev.page,
                                    }))
                                }
                                placeholder="Search Here..."
                            />
                        </div>
                    </div>
                ),
                columns: NURSING_NOTE_COLUMNS,
                rows: nursingNoteRows.map((row, idx) => [
                    String((nursingNoteFilters.page - 1) * nursingNoteFilters.limit + idx + 1),
                    (summaryName || "N/A").trim(),
                    row.onExamination,
                    row.vitals,
                    row.therapy,
                    row.meals,
                    row.medication,
                    row.doctorRound,
                    row.currentStatus,
                    row.newOrder,
                    row.handoverTo,
                    row.createdAt,
                    // "N/A",
                ]),
                emptyMessage:
                    nursingNoteLoadState === "loading"
                        ? "Loading..."
                        : nursingNoteLoadState === "error"
                            ? nursingNoteLoadError || "Failed to load"
                            : "No Data Available",
            },
        ];
    }, [reg?.created_at, summaryName, nursingNoteRows, nursingNoteLoadState, nursingNoteLoadError, nursingNoteFilters, setNursingNoteFilters]);

    const doctorVisitSections = useMemo<TableListingSection[]>(() => {
        const patientName = (summaryName || "N/A").trim();
        const createdAt = ((reg?.created_at as string | undefined) ?? "").trim() || "N/A";
        return [
            {
                id: "doctor-visit-details",
                title: `Registration Date: ${createdAt}`,
                columns: DOCTOR_VISIT_COLUMNS,
                rows: doctorVisitRows.map((row) => [
                    row.doctor,
                    row.nurse,
                    row.bp,
                    row.sugar,
                    row.pulse,
                    row.spo2,
                    row.temp,
                    row.rr,
                    row.abdominalGirth,
                    row.painScoring,
                    row.motionHistory,
                    row.intake,
                    row.output,
                    row.remark,
                    row.createdAt,
                ]),
                emptyMessage:
                    doctorVisitLoadState === "loading"
                        ? "Loading..."
                        : doctorVisitLoadState === "error"
                            ? doctorVisitLoadError || "Failed to load"
                            : "No Data Available",
            },
        ];
    }, [summaryName, reg?.created_at, doctorVisitRows, doctorVisitLoadState, doctorVisitLoadError]);

    const historySections = useMemo<TableListingSection[]>(() => {
        const patientName = (summaryName || "N/A").trim();
        const createdAt = ((reg?.created_at as string | undefined) ?? "").trim() || "N/A";
        return [
            {
                id: "history-details",
                title: ` Registration Date: ${createdAt}`,
                columns: HISTORY_COLUMNS,
                rows: historyRows.map((row) => [
                    row.chiefComplaint,
                    row.associatedComplaint,
                    row.generalHo,
                    row.stress,
                    row.bowel,
                    row.appetite,
                    row.micturition,
                    row.sleep,
                    row.medicineHistory,
                    row.diagnose,
                    row.kco,
                    row.gyneObs,
                    row.createdAt,
                ]),
                emptyMessage:
                    historyLoadState === "loading"
                        ? "Loading..."
                        : historyLoadState === "error"
                            ? historyLoadError || "Failed to load"
                            : "No Data Available",
            },
        ];
    }, [summaryName, reg?.created_at, historyRows, historyLoadState, historyLoadError]);

    const revisitSections = useMemo<TableListingSection[]>(() => {
        const createdAt = ((reg?.created_at as string | undefined) ?? "").trim() || "N/A";
        return [
            {
                id: "revisit-details",
                title: `Registration Date: ${createdAt}`,
                columns: REVISIT_COLUMNS,
                rows: revisitRows.map((row) => [
                    row.doctor,
                    row.revisitDate,
                    row.revisitTime,
                    row.remark,
                    row.createdAt,
                ]),
                emptyMessage:
                    revisitLoadState === "loading"
                        ? "Loading..."
                        : revisitLoadState === "error"
                            ? revisitLoadError || "Failed to load"
                            : "No Data Available",
            },
        ];
    }, [reg?.created_at, revisitRows, revisitLoadState, revisitLoadError]);

    const dietSections = useMemo<TableListingSection[]>(() => {
        const createdAt = ((reg?.created_at as string | undefined) ?? "").trim() || "N/A";
        return [
            {
                id: "diet-details",
                title: `Registration Date: ${createdAt}`,
                columns: DIET_COLUMNS,
                rows: dietRows.map((row, idx) => [
                    String(idx + 1),
                    row.schedule,
                    row.details,
                    row.instruction,
                    row.dietDate,
                ]),
                emptyMessage:
                    dietLoadState === "loading"
                        ? "Loading..."
                        : dietLoadState === "error"
                            ? dietLoadError || "Failed to load"
                            : "No Data Available",
            },
        ];
    }, [reg?.created_at, dietRows, dietLoadState, dietLoadError]);

    const medicineTabSections = useMemo<TableListingSection[]>(() => {
        const freeRows = openFreeMedicineRows.map((row, idx) => [
            String(idx + 1),
            row.medicine,
            row.qty,
            row.doctor,
            row.dosage,
            row.frequency,
            row.days,
            row.type,
            row.remark,
            row.status,
            row.date,
        ]);
        const freeEmptyMessage =
            openFreeMedicineLoadState === "loading"
                ? "Loading..."
                : openFreeMedicineLoadState === "error"
                    ? openFreeMedicineLoadError || "Failed to load"
                    : "No Data Available";
        return [
            MEDICINE_TAB_STATIC_SECTIONS[0],
            {
                id: "medicine-tab-table-2",
                title: "Patient Open Free Medicine Details",
                columns: MEDICINE_FREE_COLUMNS,
                rows: freeRows,
                emptyMessage: freeEmptyMessage,
            },
            MEDICINE_TAB_STATIC_SECTIONS[2],
        ];
    }, [openFreeMedicineRows, openFreeMedicineLoadState, openFreeMedicineLoadError]);

    const healthCardPointsSections = useMemo<TableListingSection[]>(() => {
        const row = healthCardPointsRow;
        const rows: TableListingSection["rows"] = row
            ? [
                [
                    row.id,
                    row.uhid,
                    row.contactNumber,
                    row.points,
                    row.cardNo,
                    <span
                        key="health-card-points-status"
                        className="inline-flex h-[30px] min-w-[76px] items-center justify-center rounded-[30px] border py-2 px-5 text-xs leading-[120%] border-[#0B8C00]/20 bg-white text-[#0B8C00]"
                    >
                        {row.status}
                    </span>,
                ],
            ]
            : [];
        return [
            {
                id: "wallet-js-health-card-points",
                title: "JS Health Card Points",
                columns: [
                    { label: "#", position: "first" as const },
                    { label: "UHID" },
                    { label: "Contact Number" },
                    { label: "Points" },
                    { label: "Card No" },
                    { label: "Status", position: "last" as const },
                ],
                rows,
                emptyMessage:
                    healthCardPointsLoadState === "loading"
                        ? "Loading..."
                        : healthCardPointsLoadState === "error"
                            ? healthCardPointsLoadError || "Failed to load"
                            : "No Data Available",
            },
        ];
    }, [healthCardPointsRow, healthCardPointsLoadState, healthCardPointsLoadError]);

    const healthCardTransactionSections = useMemo<TableListingSection[]>(() => {
        return [
            {
                id: "wallet-js-health-card-transaction",
                title: "JS Health Card Transaction",
                columns: [
                    { label: "Sr no.", position: "first" as const },
                    { label: "Points" },
                    { label: "Earn By" },
                    { label: "TXN" },
                    { label: "Order ID" },
                    { label: "Order Return" },
                    { label: "Is Expired" },
                    { label: "Created at", position: "last" as const },
                ],
                rows: healthCardTransactionRows.map((row, idx) => [
                    String(idx + 1),
                    row.points,
                    row.earnBy,
                    <span
                        key={`health-card-txn-entry-${idx}`}
                        className="inline-flex h-[30px] min-w-[76px] items-center justify-center rounded-[30px] border py-2 px-5 text-xs leading-[120%] border-[#0B8C00]/20 bg-white text-[#0B8C00] capitalize"
                    >
                        {row.txn}
                    </span>,
                    row.orderId,
                    row.orderReturn,
                    row.isExpired,
                    row.createdAt,
                ]),
                emptyMessage:
                    healthCardTransactionLoadState === "loading"
                        ? "Loading..."
                        : healthCardTransactionLoadState === "error"
                            ? healthCardTransactionLoadError || "Failed to load"
                            : "No Data Available",
            },
        ];
    }, [healthCardTransactionRows, healthCardTransactionLoadState, healthCardTransactionLoadError]);

    const patientDepositSections = useMemo<TableListingSection[]>(() => {
        const statusCellClass = (status: string) => {
            const normalized = status.toLowerCase();
            if (normalized === "paid" || normalized === "success") {
                return "inline-flex h-[30px] min-w-[76px] items-center justify-center rounded-[30px] border py-2 px-5 text-xs leading-[120%] border-[#0B8C00]/20 bg-white text-[#0B8C00]";
            }
            if (normalized === "pending") {
                return "inline-flex h-[30px] min-w-[76px] items-center justify-center rounded-[30px] border py-2 px-5 text-xs leading-[120%] border-[#9A7909]/20 bg-white text-[#9A7909]";
            }
            if (normalized === "failed" || normalized === "cancelled") {
                return "inline-flex h-[30px] min-w-[76px] items-center justify-center rounded-[30px] border py-2 px-5 text-xs leading-[120%] border-[#DC2626]/20 bg-white text-[#DC2626]";
            }
            return "inline-flex h-[30px] min-w-[76px] items-center justify-center rounded-[30px] border py-2 px-5 text-xs leading-[120%] border-[#6B7280]/20 bg-white text-[#374151]";
        };
        return [
            {
                id: "patient-deposit-details",
                title: "Patient Deposit Details",
                columns: [
                    { label: "Sr no.", position: "first" as const },
                    { label: "Payment Title" },
                    { label: "Price" },
                    { label: "Mode" },
                    { label: "Method" },
                    { label: "Transaction ID" },
                    { label: "Transaction Date" },
                    { label: "Status" },
                    { label: "Remark" },
                    { label: "Created Date", position: "last" as const },
                ],
                rows: patientPaymentRows.map((row, idx) => [
                    String(idx + 1),
                    row.title,
                    row.price,
                    row.mode,
                    row.method,
                    row.transactionId,
                    row.transactionDate,
                    <span
                        key={`patient-deposit-status-${idx}`}
                        className={statusCellClass(row.status)}
                    >
                        {row.status}
                    </span>,
                    row.remark,
                    row.createdAt,
                ]),
                emptyMessage:
                    patientPaymentLoadState === "loading"
                        ? "Loading..."
                        : patientPaymentLoadState === "error"
                            ? patientPaymentLoadError || "Failed to load"
                            : "No Data Available",
            },
        ];
    }, [patientPaymentRows, patientPaymentLoadState, patientPaymentLoadError]);

    const overviewDietPlanRows = useMemo<DietPlanEntry[][]>(() => {
        const entries: DietPlanEntry[] = dietRows.map((row) => ({
            label: row.schedule,
            value: row.details,
        }));
        if (entries.length === 0) {
            return [];
        }
        const rows: DietPlanEntry[][] = [];
        for (let i = 0; i < entries.length; i += 3) {
            rows.push(entries.slice(i, i + 3));
        }
        return rows;
    }, [dietRows]);

    const tabOptions = useMemo(() => {
        if (isDischargePatientDetailRoute) {
            return [
                { value: "overview", label: "Overview" },
                { value: "history", label: "History" },
                { value: "medicine", label: "Medicine" },
                { value: "bill Details", label: "Bill Details" },
                { value: "patient_files", label: "Patient Files" },
                { value: "wallet", label: "Wallet" },
            ];
        }
        if (isIpdPatientDetailRoute) {
            return [
                { value: "overview", label: "Overview" },
                { value: "patient_form", label: "Patient Form" },
                { value: "diet", label: "Diet" },
                { value: "nursing_note", label: "Nursing Note" },
                { value: "package", label: "Package" },
                { value: "room", label: "Room" },
                { value: "doctor_visit", label: "Doctor Visit" },
                { value: "medicine", label: "Medicine" },
                { value: "report", label: "Report" },
                { value: "history", label: "History" },
                { value: "bill Details", label: "Bill Details" },
                { value: "lab_test", label: "Lab Test" },
                { value: "patient_files", label: "Patient Files" },
                { value: "wallet", label: "Wallet" },
            ];
        }
        if (isDayCarePatientDetailRoute) {
            return [
                { value: "overview", label: "Overview" },
                { value: "patient_form", label: "Patient Form" },
                { value: "revist", label: "Revist" },
                { value: "package", label: "Package" },
                { value: "doctor_visit", label: "Doctor Visit" },
                { value: "medicine", label: "Medicine" },
                { value: "report", label: "Report" },
                { value: "history", label: "History" },
                { value: "bill Details", label: "Bill Details" },
                { value: "lab_test", label: "Lab Test" },
                { value: "patient_files", label: "Patient Files" },
                { value: "wallet", label: "Wallet" },
            ];
        }
        return [
            { value: "overview", label: "Overview" },
            { value: "iaf", label: "IAF" },
            { value: "bill Details", label: "Bill Details" },
            { value: "lab_test", label: "Lab Test" },
            { value: "patient_files", label: "Patient Files" },
            { value: "wallet", label: "Wallet" },
        ];
    }, [isDischargePatientDetailRoute, isIpdPatientDetailRoute, isDayCarePatientDetailRoute]);

    useEffect(() => {
        if (!tabOptions.some((tab) => tab.value === activeTab)) {
            setActiveTab("overview");
        }
    }, [tabOptions, activeTab]);

    const noDataTabs = useMemo(
        () =>
            new Set([
                "patient_file",
            ]),
        []
    );

    const showOverviewVitals = !isIpdPatientDetailRoute && !isDayCarePatientDetailRoute;
    const showOverviewDietPlan = isIpdPatientDetailRoute;
    const showOverviewMedicine = isIpdPatientDetailRoute || isDayCarePatientDetailRoute;
    const linkedOpdIdFromPatientDetail = String(appt?.patient_opd_id ?? "").trim();
    const viewOpdDetailsId = linkedOpdIdFromPatientDetail || opdRouteOpdId;
    const shouldShowViewOpdDetailsButton =
        (isIpdPatientDetailRoute || isDayCarePatientDetailRoute) && viewOpdDetailsId.length > 0;

    const renderViewAppointmentHeader = (showBranchIcon = false) => (
        <>
            <div className="flex items-start justify-between">
                <PageHeading title="View Appointment" />
                <div className="flex items-center gap-3">
                    {shouldShowViewOpdDetailsButton ? (
                        <Button
                            type="button"
                            variant="outline"
                            size="medium"
                            className=""
                            onClick={() => router.push(`/patient/details?id=${encodeURIComponent(viewOpdDetailsId)}&source=opd`)}
                        >
                            View OPD Details
                        </Button>
                    ) : null}
                    <BackToPreviousPageButton
                        text="List"
                        className=" hover:bg-[#F2F8F2]"
                        onClick={() => router.back()}
                    />
                    {/* <button
                            type="button"
                            className="flex h-11 items-center gap-2 rounded-[32px] border border-[#9A7909] bg-white px-6 text-sm font-medium text-[#9A7909] transition-colors hover:bg-[#F2F8F2]"
                        >
                            <span className="text-hide">Shift to IPD</span>
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M11.2495 4.24976C11.2164 4.24988 11.185 4.26347 11.1616 4.28687C11.1382 4.31028 11.1246 4.34167 11.1245 4.37476C11.1245 4.408 11.1381 4.44012 11.1616 4.46362L15.7202 9.02124L16.5737 9.87476H3.12451C3.09153 9.87488 3.05995 9.88854 3.03662 9.91187C3.0133 9.93522 2.9996 9.96676 2.99951 9.99976C2.99951 10.0329 3.01318 10.0652 3.03662 10.0886C3.05994 10.1119 3.09157 10.1246 3.12451 10.1248H16.5737L11.1616 15.5369C11.1501 15.5484 11.1406 15.5618 11.1343 15.5769C11.128 15.592 11.1246 15.6084 11.1245 15.6248C11.1245 15.6411 11.1281 15.6575 11.1343 15.6726C11.1406 15.6878 11.15 15.702 11.1616 15.7136C11.1732 15.7252 11.1866 15.7347 11.2017 15.741C11.2167 15.7472 11.2332 15.7507 11.2495 15.7507C11.266 15.7507 11.2831 15.7473 11.2983 15.741C11.3134 15.7347 11.3268 15.7252 11.3384 15.7136L16.9634 10.0886C16.975 10.077 16.9844 10.0628 16.9907 10.0476C16.997 10.0325 17.0005 10.0161 17.0005 9.99976C17.0004 9.98345 16.997 9.96697 16.9907 9.9519C16.9844 9.93687 16.9749 9.92338 16.9634 9.91187L11.3384 4.28687C11.3149 4.26336 11.2828 4.24976 11.2495 4.24976Z" stroke="#9A7909" />
                            </svg>
                        </button>
                        <button
                            type="button"
                            className="flex h-11 items-center gap-2 rounded-[32px] border border-[#9A7909] bg-white px-6 text-sm font-medium text-[#9A7909] transition-colors hover:bg-[#F2F8F2]"
                        >
                            <span className="text-hide">Shift to DayCare</span>
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M11.2495 4.24976C11.2164 4.24988 11.185 4.26347 11.1616 4.28687C11.1382 4.31028 11.1246 4.34167 11.1245 4.37476C11.1245 4.408 11.1381 4.44012 11.1616 4.46362L15.7202 9.02124L16.5737 9.87476H3.12451C3.09153 9.87488 3.05995 9.88854 3.03662 9.91187C3.0133 9.93522 2.9996 9.96676 2.99951 9.99976C2.99951 10.0329 3.01318 10.0652 3.03662 10.0886C3.05994 10.1119 3.09157 10.1246 3.12451 10.1248H16.5737L11.1616 15.5369C11.1501 15.5484 11.1406 15.5618 11.1343 15.5769C11.128 15.592 11.1246 15.6084 11.1245 15.6248C11.1245 15.6411 11.1281 15.6575 11.1343 15.6726C11.1406 15.6878 11.15 15.702 11.1616 15.7136C11.1732 15.7252 11.1866 15.7347 11.2017 15.741C11.2167 15.7472 11.2332 15.7507 11.2495 15.7507C11.266 15.7507 11.2831 15.7473 11.2983 15.741C11.3134 15.7347 11.3268 15.7252 11.3384 15.7136L16.9634 10.0886C16.975 10.077 16.9844 10.0628 16.9907 10.0476C16.997 10.0325 17.0005 10.0161 17.0005 9.99976C17.0004 9.98345 16.997 9.96697 16.9907 9.9519C16.9844 9.93687 16.9749 9.92338 16.9634 9.91187L11.3384 4.28687C11.3149 4.26336 11.2828 4.24976 11.2495 4.24976Z" stroke="#9A7909" />
                            </svg>
                        </button>
                        <button
                            type="button"
                            className="flex h-11 items-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium text-[#0B8C00] transition-colors hover:bg-[#F2F8F2]"
                        >
                            <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} />
                            <span className="text-hide">Branch Shifting</span>
                    </button> */}
                </div>
            </div>
            <div className="mb-6">
                <Tabs options={tabOptions} value={activeTab} onChange={setActiveTab} />
            </div>
        </>
    );

    return (
        <AppShell>
            {activeTab === "overview" && (
                <div className="space-y-8">
                    {renderViewAppointmentHeader(true)}
                    {isLegacyPatientDetailRoute && opdDetailLoadState === "loading" ? (
                        <p className="text-sm text-[#6B7280]">Loading patient details…</p>
                    ) : null}

                    <div className="grid grid-cols-5 gap-4">
                        <div className="col-span-1">
                            <AppointmentDetailCard items={opdAppointmentItems ?? APPOINTMENT_DETAIL_ITEMS} />

                            <PatientWalletInformationCard
                                remainingAmount={opdWalletCard?.remainingAmount ?? "Rs. 0"}
                                details={opdWalletCard?.details ?? PATIENT_WALLET_DETAILS}
                                onActionClick={() => setActiveTab("wallet")}
                            />
                            <ReferralPatientInfoCard items={opdReferralItems ?? REFERRAL_DETAIL_ITEMS} />

                        </div>

                        <div className="col-span-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className={showOverviewVitals ? "" : "col-span-2"}>
                                    <PatientDetailsCard
                                        name={opdPatientDetailsView?.name ?? "N/A"}
                                        subtitle={
                                            opdPatientDetailsView?.subtitle ??
                                            "Contact Number: XXXXXXXXXX • Age : N/A • Gender : N/A"
                                        }
                                        badges={
                                            opdPatientDetailsView && opdPatientDetailsView.badges.length > 0
                                                ? opdPatientDetailsView.badges
                                                : []
                                                // : PATIENT_DETAILS_BADGES
                                        }
                                        infoItems={
                                            opdPatientDetailsView && opdPatientDetailsView.infoItems.length > 0
                                                ? opdPatientDetailsView.infoItems
                                                :[]
                                                // : PATIENT_DETAILS_INFO_ITEMS
                                        }
                                    />

                              
                                </div>
                                {showOverviewVitals ? <VitalsCard items={opdVitalsItems ?? VITALS_ITEMS} /> : null}
                            </div>
                            <PatientFilesCard
                                    items={opdFileCardItems ?? (isLegacyPatientDetailRoute ? [] : PATIENT_FILE_ITEMS)}
                                    emptyMessage={
                                        isLegacyPatientDetailRoute && opdDetailLoadState === "loading"
                                            ? "Loading..."
                                            : "No Data Available"
                                    }
                                    plainEmptyState={true}
                                />
                            {showOverviewDietPlan ? (
                                <DietPlanCard
                                    decoctionValue="Kadha"
                                    headerActions={DIET_PLAN_HEADER_ACTIONS}
                                    rows={overviewDietPlanRows}
                                    roomService={(() => {
                                        const raw = String(appt?.room_service ?? "").trim().toLowerCase();
                                        if (raw === "yes" || raw === "1") return "Yes";
                                        if (raw === "no" || raw === "0") return "No";
                                        return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "N/A";
                                    })()}
                                />
                            ) : null}

                            {/* <PatientInformationTimelineCard items={PATIENT_INFORMATION_TIMELINE_ITEMS} /> */}
                        </div>

                        <div className="col-span-1">
                            <HealthCardPreview cardNumber={opdHealthCardNo} />

                            <MedicalInformationCard items={opdMedicalItems ?? MEDICAL_INFORMATION_ITEMS} />

                            {/* {showOverviewMedicine ?
                                <MedicineCard items={MEDICINE_ITEMS} /> : null} */}


                            <OtherInformationCard items={opdOtherInfoItems ?? OTHER_INFORMATION_ITEMS} />

                        </div>
                    </div>


                </div>
            )}


            {activeTab === "iaf" && (
                <div className="space-y-8">
                    {renderViewAppointmentHeader(true)}

                    <div className="grid grid-cols-1 gap-4">
                        {/* <h4 className="not-italic font-semibold text-[24px] leading-[120%] text-[#262D3B]">IAF Information</h4> */}
                        <NutritionalAssessmentCard items={iafMedicalItems} />
                        <DietHistoryCard visits={iafDietVisits} />
                        {iafLoadState === "error" ? (
                            <p className="px-1 text-sm text-[#B91C1C]">{iafLoadError || "Failed to load IAF details"}</p>
                        ) : null}
                        {/* <IafQuestionSectionsCard
                            generalItems={IAF_GENERAL_QUESTION_ITEMS}
                            explainGrids={IAF_EXPLAIN_ABOUT_GRIDS}
                        />
                        <IafTonguePulseExamCard cardNumber="505030301234" items={IAF_TONGUE_PULSE_EXAM_ITEMS} />
                        <PatientFullHistoryCard items={PATIENT_FULL_HISTORY_CHIEF_COMPLAINTS} /> */}
                    </div>


                </div>



            )}

            {activeTab === "patient_form" && (
                <div className="space-y-8">
                    {renderViewAppointmentHeader(false)}
                    <div className="grid grid-cols-1 gap-4">
                        <PatientSummaryHeaderCard
                            patientName={
                                isLegacyPatientDetailRoute && opdDetailLoadState === "ready" ? summaryName : "Ms kavita"
                            }
                            infoItems={opdSummaryInfoItems}
                        />

                        <TableListingCard
                            sections={[
                                {
                                    id: "patient-form-static",
                                    title: `Admit Date: ${((appt?.created_at as string | undefined) ?? "").trim() || "N/A"
                                        }`,
                                    columns: [
                                        { label: "Sr no.", position: "first" },
                                        { label: "Patient Form File" },
                                        { label: "Remark" },
                                        { label: "Date", position: "last" },
                                    ],
                                    rows: patientFormRows.map((r, idx) => [
                                        String(idx + 1),
                                        r.reportUrl ? (
                                            <a
                                                key={`patient-form-file-${idx}`}
                                                href={r.reportUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(11,140,0,0.05)] shadow-[0px_6px_30px_rgba(0,0,0,0.08)] transition-colors hover:bg-[rgba(11,140,0,0.12)]"
                                                aria-label="Open patient form file"
                                            >
                                                <Image src="/icons/PdfIcon.svg" alt="File" width={18} height={18} />
                                            </a>
                                        ) : (
                                            "N/A"
                                        ),
                                        r.remark,
                                        r.createdAt,
                                    ]),
                                    emptyMessage:
                                        patientFormLoadState === "loading"
                                            ? "Loading..."
                                            : patientFormLoadState === "error"
                                                ? patientFormLoadError || "Failed to load"
                                                : "No Data Available",
                                },
                            ]}
                        />
                    </div>
                </div>
            )}

            {activeTab === "package" && (
                <div className="space-y-8">
                    {renderViewAppointmentHeader(false)}
                    <div className="grid grid-cols-1 gap-4">
                        <PatientSummaryHeaderCard
                            patientName={
                                isLegacyPatientDetailRoute && opdDetailLoadState === "ready" ? summaryName : "Ms kavita"
                            }
                            infoItems={opdSummaryInfoItems}
                        // balanceValue={opdWalletCard?.remainingAmount ?? "Rs. 7000.00"}
                        />
                        <PatientPackageListingCard
                            patientName={summaryName}
                            uhid={summaryUhid || "N/A"}
                            registrationDate={((reg?.created_at as string | undefined) ?? "").trim() || "N/A"}
                            items={packageItems}
                            isLoading={packageLoadState === "loading"}
                            error={packageLoadError}
                        />
                    </div>
                </div>
            )}

            {activeTab === "room" && (
                <div className="space-y-8">
                    {renderViewAppointmentHeader(false)}
                    <div className="grid grid-cols-1 gap-4">
                        <PatientSummaryHeaderCard
                            patientName={
                                isLegacyPatientDetailRoute && opdDetailLoadState === "ready" ? summaryName : "Ms kavita"
                            }
                            infoItems={opdSummaryInfoItems}
                        // balanceValue={opdWalletCard?.remainingAmount ?? "Rs. 7000.00"}
                        />
                        <PatientRoomListingCard
                            patientName={summaryName}
                            uhid={summaryUhid || "N/A"}
                            registrationDate={((reg?.created_at as string | undefined) ?? "").trim() || "N/A"}
                            items={roomItems}
                            isLoading={roomLoadState === "loading"}
                            error={roomLoadError}
                        />
                    </div>
                </div>
            )}

            {activeTab === "report" && (
                <div className="space-y-8">
                    {renderViewAppointmentHeader(false)}
                    <div className="grid grid-cols-1 gap-4">
                        <PatientSummaryHeaderCard
                            patientName={
                                isLegacyPatientDetailRoute && opdDetailLoadState === "ready" ? summaryName : "Ms kavita"
                            }
                            infoItems={opdSummaryInfoItems}
                        // balanceValue={opdWalletCard?.remainingAmount ?? "Rs. 7000.00"}
                        />
                        <PatientReportListingCard
                            patientName={summaryName}
                            uhid={summaryUhid || "N/A"}
                            registrationDate={((reg?.created_at as string | undefined) ?? "").trim() || "N/A"}
                            items={reportItems}
                            isLoading={reportLoadState === "loading"}
                            error={reportLoadError}
                        />
                    </div>
                </div>
            )}

            {activeTab === "medicine" && (
                <div className="space-y-8">
                    {renderViewAppointmentHeader(false)}
                    <div className="grid grid-cols-1 gap-4">
                        <PatientSummaryHeaderCard
                            patientName={
                                isLegacyPatientDetailRoute && opdDetailLoadState === "ready" ? summaryName : "Ms kavita"
                            }
                            infoItems={opdSummaryInfoItems}
                        // balanceValue={opdWalletCard?.remainingAmount ?? "Rs. 7000.00"}
                        />
                        {medicineTabSections.map((section) => (
                            <TableListingCard key={section.id} sections={[section]} />
                        ))}
                        <TableListingCard sections={productInvoiceSections} />
                    </div>
                </div>
            )}

            {activeTab === "nursing_note" && (
                <div className="space-y-8">
                    {renderViewAppointmentHeader(false)}
                    <div className="grid grid-cols-1 gap-4">
                        <PatientSummaryHeaderCard
                            patientName={
                                isLegacyPatientDetailRoute && opdDetailLoadState === "ready" ? summaryName : "N/A"
                            }
                            infoItems={opdSummaryInfoItems}
                        />
                        <TableListingCard sections={nursingNoteSections} />
                        {nursingNoteTotalRecords > 0 && (
                            <Pagination
                                currentPage={nursingNoteFilters.page}
                                totalItems={nursingNoteTotalRecords}
                                itemsPerPage={nursingNoteFilters.limit}
                                onPageChange={(page) =>
                                    setNursingNoteFilters((prev) => ({ ...prev, page }))
                                }
                                onItemsPerPageChange={(limit) =>
                                    setNursingNoteFilters((prev) => ({ ...prev, limit, page: 1 }))
                                }
                            />
                        )}
                    </div>
                </div>
            )}

            {activeTab === "doctor_visit" && (
                <div className="space-y-8">
                    {renderViewAppointmentHeader(false)}
                    <div className="grid grid-cols-1 gap-4">
                        <PatientSummaryHeaderCard
                            patientName={
                                isLegacyPatientDetailRoute && opdDetailLoadState === "ready" ? summaryName : "N/A"
                            }
                            infoItems={opdSummaryInfoItems}
                        />
                        <TableListingCard sections={doctorVisitSections} />
                    </div>
                </div>
            )}

            {activeTab === "history" && (
                <div className="space-y-8">
                    {renderViewAppointmentHeader(false)}
                    <div className="grid grid-cols-1 gap-4">
                        <PatientSummaryHeaderCard
                            patientName={
                                isLegacyPatientDetailRoute && opdDetailLoadState === "ready" ? summaryName : "N/A"
                            }
                            infoItems={opdSummaryInfoItems}
                        />
                        <TableListingCard sections={historySections} />
                    </div>
                </div>
            )}

            {activeTab === "revist" && (
                <div className="space-y-8">
                    {renderViewAppointmentHeader(false)}
                    <div className="grid grid-cols-1 gap-4">
                        <PatientSummaryHeaderCard
                            patientName={
                                isLegacyPatientDetailRoute && opdDetailLoadState === "ready" ? summaryName : "N/A"
                            }
                            infoItems={opdSummaryInfoItems}
                        />
                        <TableListingCard sections={revisitSections} />
                    </div>
                </div>
            )}

            {activeTab === "diet" && (
                <div className="space-y-8">
                    {renderViewAppointmentHeader(false)}
                    <div className="grid grid-cols-1 gap-4">
                        <PatientSummaryHeaderCard
                            patientName={
                                isLegacyPatientDetailRoute && opdDetailLoadState === "ready" ? summaryName : "N/A"
                            }
                            infoItems={opdSummaryInfoItems}
                        />
                        <TableListingCard sections={dietSections} />
                    </div>
                </div>
            )}

            {noDataTabs.has(activeTab) && (
                <div className="space-y-8">
                    {renderViewAppointmentHeader(false)}
                    <div className="grid grid-cols-1 gap-4">
                        <PatientSummaryHeaderCard
                            patientName={
                                isLegacyPatientDetailRoute && opdDetailLoadState === "ready" ? summaryName : "Ms kavita"
                            }
                            infoItems={opdSummaryInfoItems}
                            balanceValue={opdWalletCard?.remainingAmount ?? "Rs. 7000.00"}
                        />
                        <LabTestNoDataCard />
                    </div>
                </div>
            )}


            {activeTab === "bill Details" && (
                <div className="space-y-8">
                    {renderViewAppointmentHeader(false)}


                    <div className="grid grid-cols-1 gap-4">
                        <PatientSummaryHeaderCard
                            patientName={
                                isLegacyPatientDetailRoute && opdDetailLoadState === "ready" ? summaryName : "Ms kavita"
                            }
                            infoItems={opdSummaryInfoItems}
                        // balanceValue="662"
                        />
                        {shouldShowPatientCareSection ? <TableListingCard sections={patientCareSections} /> : null}
                        <TableListingCard sections={patientDepositSections} />
                        <TableListingCard sections={serviceInvoiceSections} />
                        {/* <TableListingCard sections={PRODUCT_BILL_DETAILS_SECTIONS} /> */}
                        <TableListingCard sections={productInvoiceSections} />

                    </div>
                </div>
            )}
            {activeTab === "lab_test" && (
                <div className="space-y-8">
                    {renderViewAppointmentHeader(false)}

                    <div className="grid grid-cols-1 gap-4">
                        <PatientSummaryHeaderCard
                            patientName={
                                isLegacyPatientDetailRoute && opdDetailLoadState === "ready" ? summaryName : "Ms kavita"
                            }
                            infoItems={opdSummaryInfoItems}
                        // balanceValue={opdWalletCard?.remainingAmount ?? "Rs. 7000.00"}
                        />
                        <LabTestNoDataCard />
                    </div>
                </div>
            )}
            {activeTab === "patient_files" && (
                <div className="space-y-8">
                    {renderViewAppointmentHeader(false)}


                    <div className="grid grid-cols-1 gap-4">
                        <PatientSummaryHeaderCard
                            patientName={
                                isLegacyPatientDetailRoute && opdDetailLoadState === "ready" ? summaryName : "Ms kavita"
                            }
                            infoItems={opdSummaryInfoItems}
                        // balanceValue="662"
                        />
                        <TableListingCard sections={opdPatientFilesTableSections} />
                    </div>
                </div>
            )}
            {activeTab === "wallet" && (
                <div className="space-y-8">
                    {renderViewAppointmentHeader(false)}

                    <div className="grid grid-cols-1 gap-4">
                        <PatientSummaryHeaderCard
                            patientName={
                                isLegacyPatientDetailRoute && opdDetailLoadState === "ready" ? summaryName : "Ms kavita"
                            }
                            infoItems={opdSummaryInfoItems}
                            balanceValue={opdWalletCard?.remainingAmount ?? "Rs. 7000.00"}
                        />
                        {selectedWalletOrderId ? (
                            <WalletOrderDetailsView
                                order={walletOrderDetail}
                                items={walletOrderItems}
                                isLoading={walletOrderLoadState === "loading"}
                                error={walletOrderLoadError}
                                onBack={() => {
                                    setSelectedWalletOrderId(null);
                                    setWalletOrderDetail(null);
                                    setWalletOrderItems([]);
                                    setWalletOrderLoadState("idle");
                                    setWalletOrderLoadError(null);
                                }}
                            />
                        ) : isLegacyPatientDetailRoute && opdDetailLoadState === "ready" ? (
                            <>
                              
                                {(opdWalletTabTableSections ?? []).map((section) => (
                                    <TableListingCard key={section.id} sections={[section]} />
                                ))}
                                  <TableListingCard sections={healthCardPointsSections} />
                                  <TableListingCard sections={healthCardTransactionSections} />
                            </>
                        ) : (
                            <>
                                <JsHealthCardPointsCard
                                    remainingAmount="Rs. 0"
                                    items={JS_HEALTH_CARD_POINTS_ITEMS}
                                />
                                <TableListingCard sections={WALLET_PACKAGE_SECTIONS} />
                                <TableListingCard sections={WALLET_REFUND_SECTIONS} />
                                <TableListingCard sections={WALLET_ORDER_HISTORY_SECTIONS} />
                                <TableListingCard sections={WALLET_HEALTH_CARD_TRANSACTION_SECTIONS} />
                            </>
                        )}
                    </div>
                </div>
            )}


            {billOfSupplyPayload ? <BillOfSupplyPDF ref={billOfSupplyRef} {...billOfSupplyPayload} /> : null}
            {taxInvoicePayload ? <TaxInvoice ref={taxInvoiceRef} {...taxInvoicePayload} /> : null}
            {walletSinglePayload ? <InvoiceSinglePaymentReceipt ref={sankalpSingleRef} data={walletSinglePayload} showDownloadButton={false} showDateColumn={walletSingleShowDate} /> : null}
            {walletAdvancePayload ? <InvoiceWallet ref={sankalpWalletRef} data={walletAdvancePayload} showDownloadButton={false} showDateColumn={walletAdvanceShowDate} /> : null}
        </AppShell>
    );
}


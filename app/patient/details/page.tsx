"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";

import {
    AppointmentDetailCard,
    type AppointmentDetailItem,
    Button,
    DietPlanCard,
    type DietPlanEntry,
    type DietPlanHeaderAction,
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
    Tooltip, Tabs
} from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import DateFilterDropdown from "@/components/registration/DateFilterDropdown";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { useGetBranchesQuery } from "@/store/api/settingsApi";
import type { SelectOption } from "@/components/ui/FormSelectField";

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
        label: "Private",
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
        { label: "Kodo Millet", value: "5 days", hidden: true },
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
    {
        id: "patient-services",
        title: "Patient Services",
        titleRightContent: PATIENT_SERVICES_TITLE_ACTION,
        columns: [
            { label: "Sr no.", position: "first" },
            { label: "Services" },
            { label: "Product Code" },
            { label: "HSN Code" },
            { label: "Qty" },
            { label: "Total Amount" },
            { label: "Created Date", position: "last" },
        ],
        rows: [["1", "General Checkup", "PRD001", "9983", "1", "500", "20-04-2026"]],
    },
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
            { label: "Purchase Date", position: "last" },
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
    const tabOptions = [
        { value: "overview", label: "Overview" },
        { value: "iaf", label: "IAF" },
        { value: "bill Details", label: "Bill Details" },
        { value: "patient_files", label: "Patient Files" },
        { value: "wallet", label: "Wallet" },
    ];

    const renderViewAppointmentHeader = (showBranchIcon = false) => (
        <>
            <div className="flex items-start justify-between">
                <PageHeading title="View Appointment" />
                <div className="flex items-center gap-3">
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


                    <div className="grid grid-cols-5 gap-4">
                        <div className="col-span-1">
                            <AppointmentDetailCard items={APPOINTMENT_DETAIL_ITEMS} />

                            <PatientWalletInformationCard
                                remainingAmount="Rs. 7000.00"
                                details={PATIENT_WALLET_DETAILS}
                            />
                            <ReferralPatientInfoCard items={REFERRAL_DETAIL_ITEMS} />

                            <OtherInformationCard items={OTHER_INFORMATION_ITEMS} />
                        </div>

                        <div className="col-span-3">
                            <div className="grid grid-cols-2 gap-3">
                                <PatientDetailsCard
                                    name="Jacob Jones"
                                    subtitle="Contact Number: XXXXX35353 • Age : 40 Years • Gender : Male"
                                    badges={PATIENT_DETAILS_BADGES}
                                    infoItems={PATIENT_DETAILS_INFO_ITEMS}
                                />

                                <VitalsCard items={VITALS_ITEMS} />
                            </div>

                            <DietPlanCard
                                decoctionValue="Kadha"
                                headerActions={DIET_PLAN_HEADER_ACTIONS}
                                rows={DIET_PLAN_ROWS}
                            />

                            <PatientInformationTimelineCard items={PATIENT_INFORMATION_TIMELINE_ITEMS} />
                        </div>

                        <div className="col-span-1">
                            <HealthCardPreview cardNumber="505030301234" />

                            <MedicalInformationCard items={MEDICAL_INFORMATION_ITEMS} />

                            <MedicineCard items={MEDICINE_ITEMS} />

                            <PatientFilesCard items={PATIENT_FILE_ITEMS} />
                        </div>
                    </div>


                </div>
            )}


            {activeTab === "iaf" && (
                <div className="space-y-8">
                    {renderViewAppointmentHeader(true)}

                    <div className="grid grid-cols-1 gap-4">
                        {/* <h4 className="not-italic font-semibold text-[24px] leading-[120%] text-[#262D3B]">IAF Information</h4> */}
                        <NutritionalAssessmentCard items={NUTRITIONAL_ASSESSMENT_ITEMS} />

                        <IafQuestionSectionsCard
                            generalItems={IAF_GENERAL_QUESTION_ITEMS}
                            explainGrids={IAF_EXPLAIN_ABOUT_GRIDS}
                        />
                        <IafTonguePulseExamCard cardNumber="505030301234" items={IAF_TONGUE_PULSE_EXAM_ITEMS} />
                        <PatientFullHistoryCard items={PATIENT_FULL_HISTORY_CHIEF_COMPLAINTS} />
                    </div>


                </div>



            )}


            {activeTab === "bill Details" && (
                <div className="space-y-8">
                    {renderViewAppointmentHeader(false)}


                    <div className="grid grid-cols-1 gap-4">
                        <PatientSummaryHeaderCard
                            patientName="Ms kavita"
                            infoItems={PATIENT_SUMMARY_INFO_ITEMS}
                            balanceValue="662"
                        />
                        <TableListingCard sections={PATIENT_DEPOSIT_DETAILS_SECTIONS} />
                        <TableListingCard sections={PATIENT_SERVICES_AND_INVOICE_SECTIONS} />
                        <TableListingCard sections={PRODUCT_BILL_DETAILS_SECTIONS} />
                        <TableListingCard sections={PRODUCT_INVOICE_DETAILS_SECTIONS} />

                    </div>
                </div>
            )}
            {activeTab === "patient_files" && (
                <div className="space-y-8">
                    {renderViewAppointmentHeader(false)}


                    <div className="grid grid-cols-1 gap-4">
                        <PatientSummaryHeaderCard
                            patientName="Ms kavita"
                            infoItems={PATIENT_SUMMARY_INFO_ITEMS}
                            // balanceValue="662"
                        />
                        <TableListingCard sections={PATIENT_FILES_SECTIONS} />
                    </div>
                </div>
            )}
            {activeTab === "wallet" && (
                <div className="space-y-8">
                    {renderViewAppointmentHeader(false)}


                    <div className="grid grid-cols-1 gap-4">
                        <PatientSummaryHeaderCard
                            patientName="Ms kavita"
                            infoItems={PATIENT_SUMMARY_INFO_ITEMS}
                            balanceValue="Rs. 7000.00"
                        />
                        <JsHealthCardPointsCard remainingAmount="Rs. 7000.00" items={JS_HEALTH_CARD_POINTS_ITEMS} />
                        <TableListingCard sections={WALLET_PACKAGE_SECTIONS} />
                        <TableListingCard sections={WALLET_REFUND_SECTIONS} />
                        <TableListingCard sections={WALLET_ORDER_HISTORY_SECTIONS} />
                        <TableListingCard sections={WALLET_HEALTH_CARD_TRANSACTION_SECTIONS} />

                    </div>
                </div>
            )}


        </AppShell>
    );
}


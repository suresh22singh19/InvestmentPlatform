"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
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
    MedicalInformationCard,
    type MedicalInformationItem,
    MedicineCard,
    type MedicineCardItem,
    PatientFilesCard,
    type PatientFileItem,
    Pagination,
    RefreshButton,
    Table,
    TableBody,
    TableData,
    TableHead,
    TableHeader,
    TableRow,
    TableSearchInput,
    OtherInformationCard,
    type OtherInformationItem,
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

    return (
        <AppShell>
            <div className="space-y-8">
                <div className="flex items-start justify-between">
                    <PageHeading title="View Appointment" />
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            className="flex h-11 items-center gap-2 rounded-[32px] border border-[#9A7909] bg-white px-6 text-sm font-medium text-[#9A7909] transition-colors hover:bg-[#F2F8F2]"
                        >
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M8.75049 4.24976C8.78356 4.24988 8.81499 4.26347 8.83838 4.28687C8.86176 4.31028 8.8754 4.34167 8.87549 4.37476C8.87549 4.408 8.86189 4.44012 8.83838 4.46362L4.27979 9.02124L3.42627 9.87476H16.8755C16.9085 9.87488 16.9401 9.88854 16.9634 9.91187C16.9867 9.93522 17.0004 9.96676 17.0005 9.99976C17.0005 10.0329 16.9868 10.0652 16.9634 10.0886C16.9401 10.1119 16.9084 10.1246 16.8755 10.1248H3.42627L8.83838 15.5369C8.84993 15.5484 8.85944 15.5618 8.86572 15.5769C8.87198 15.592 8.87544 15.6084 8.87549 15.6248C8.87549 15.6411 8.87192 15.6575 8.86572 15.6726C8.85942 15.6878 8.85002 15.702 8.83838 15.7136C8.82683 15.7252 8.8134 15.7347 8.79834 15.741C8.78328 15.7472 8.76678 15.7507 8.75049 15.7507C8.73403 15.7507 8.71687 15.7473 8.70166 15.741C8.6866 15.7347 8.67317 15.7252 8.66162 15.7136L3.03662 10.0886C3.025 10.077 3.01557 10.0628 3.00928 10.0476C3.00305 10.0325 2.99951 10.0161 2.99951 9.99976C2.99956 9.98345 3.00303 9.96697 3.00928 9.9519C3.01556 9.93687 3.02509 9.92338 3.03662 9.91187L8.66162 4.28687C8.68513 4.26336 8.71724 4.24976 8.75049 4.24976Z" stroke="#9A7909" />
                            </svg>

                            <span className="text-hide">List</span>

                        </button>
                        <button
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
                        </button>
                    </div>
                </div>
                <div className="mb-6">
                    <Tabs options={tabOptions} value={activeTab} onChange={setActiveTab} />
                </div>


                <div className="grid grid-cols-5 gap-4">
                    <div className="col-span-1">
                        <AppointmentDetailCard items={APPOINTMENT_DETAIL_ITEMS} />

                        <PatientWalletInformationCard
                            remainingAmount="Rs. 7000.00"
                            details={PATIENT_WALLET_DETAILS}
                        />

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

            {/* <div className="space-y-8">
                <div className="flex items-start justify-between">
                    <PageHeading title="View Appointment" />
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            className="flex h-11 items-center gap-2 rounded-[32px] border border-[#9A7909] bg-white px-6 text-sm font-medium text-[#9A7909] transition-colors hover:bg-[#F2F8F2]"
                        >
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M8.75049 4.24976C8.78356 4.24988 8.81499 4.26347 8.83838 4.28687C8.86176 4.31028 8.8754 4.34167 8.87549 4.37476C8.87549 4.408 8.86189 4.44012 8.83838 4.46362L4.27979 9.02124L3.42627 9.87476H16.8755C16.9085 9.87488 16.9401 9.88854 16.9634 9.91187C16.9867 9.93522 17.0004 9.96676 17.0005 9.99976C17.0005 10.0329 16.9868 10.0652 16.9634 10.0886C16.9401 10.1119 16.9084 10.1246 16.8755 10.1248H3.42627L8.83838 15.5369C8.84993 15.5484 8.85944 15.5618 8.86572 15.5769C8.87198 15.592 8.87544 15.6084 8.87549 15.6248C8.87549 15.6411 8.87192 15.6575 8.86572 15.6726C8.85942 15.6878 8.85002 15.702 8.83838 15.7136C8.82683 15.7252 8.8134 15.7347 8.79834 15.741C8.78328 15.7472 8.76678 15.7507 8.75049 15.7507C8.73403 15.7507 8.71687 15.7473 8.70166 15.741C8.6866 15.7347 8.67317 15.7252 8.66162 15.7136L3.03662 10.0886C3.025 10.077 3.01557 10.0628 3.00928 10.0476C3.00305 10.0325 2.99951 10.0161 2.99951 9.99976C2.99956 9.98345 3.00303 9.96697 3.00928 9.9519C3.01556 9.93687 3.02509 9.92338 3.03662 9.91187L8.66162 4.28687C8.68513 4.26336 8.71724 4.24976 8.75049 4.24976Z" stroke="#9A7909" />
                            </svg>

                            <span className="text-hide">List</span>

                        </button>
                        <button
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
                        </button>
                    </div>
                </div>
                <div className="mb-6">
                    <Tabs options={tabOptions} value={activeTab} onChange={setActiveTab} />
                </div>


                <div className="grid grid-cols-1 gap-4">
                    <h4 className="not-italic font-semibold text-[24px] leading-[120%] text-[#262D3B]">IAF Information</h4>
                    <div className="mb-4 w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5">
                        <div
                            className="flex items-center justify-between gap-2 cursor-pointer">
                            <div className="flex items-center gap-2 ">
                                <Image src="/icons/Bedicon.svg" alt="Appointment" width={20} height={20} />
                                <h2 className="font-inter font-medium text-base leading-[120%] text-[#262D3B]">Nutritional Assessment</h2>
                            </div>
                        </div>
                        <div className="Room-content mt-5">
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label htmlFor="diabetes" className="block mb-2 font-normal font-medium text-[14px] leading-[120%] text-[#262D3B]">
                                        Diabetes
                                    </label>
                                    <div className="px-4 py-4 bg-[rgba(11,140,0,0.05)] border border-[#EBECED] rounded-lg">
                                        <h5 className="font-medium text-[14px] leading-[120%] text-[#6E7480]">Status: <span className="text-[#262D3B]">Yes</span></h5>
                                        <h5 className="font-medium text-[14px] leading-[120%] text-[#6E7480] mt-1">Remarks: <span className="text-[#262D3B]">Diagnosed 2 years ago. Currently on oral medication. Blood sugar moderately controlled.</span></h5>
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="HTN – Hypertension" className="block mb-2 font-normal font-medium text-[14px] leading-[120%] text-[#262D3B]">
                                        HTN – Hypertension
                                    </label>
                                    <div className="px-4 py-4 bg-[rgba(11,140,0,0.05)] border border-[#EBECED] rounded-lg">
                                        <h5 className="font-medium text-[14px] leading-[120%] text-[#6E7480]">Status: <span className="text-[#262D3B]">Yes</span></h5>
                                        <h5 className="font-medium text-[14px] leading-[120%] text-[#6E7480] mt-1">Remarks: <span className="text-[#262D3B]">On regular medication. Average BP 130/90 mmHg. No recent complications.</span></h5>
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="HTN – Hypertension" className="block mb-2 font-normal font-medium text-[14px] leading-[120%] text-[#262D3B]">
                                        Coronary Artery Disease
                                    </label>
                                    <div className="px-4 py-4 bg-[rgba(11,140,0,0.05)] border border-[#EBECED] rounded-lg">
                                        <h5 className="font-medium text-[14px] leading-[120%] text-[#6E7480]">Status: <span className="text-[#262D3B]">No</span></h5>
                                        <h5 className="font-medium text-[14px] leading-[120%] text-[#6E7480] mt-1">Remarks: <span className="text-[#262D3B]">No history of chest pain or cardiac events.</span></h5>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="HTN – Hypertension" className="block mb-2 font-normal font-medium text-[14px] leading-[120%] text-[#262D3B]">
                                        Thyroid
                                    </label>
                                    <div className="px-4 py-4 bg-[rgba(11,140,0,0.05)] border border-[#EBECED] rounded-lg">
                                        <h5 className="font-medium text-[14px] leading-[120%] text-[#6E7480]">Status: <span className="text-[#262D3B]">Yes</span></h5>
                                        <h5 className="font-medium text-[14px] leading-[120%] text-[#6E7480] mt-1">Remarks: <span className="text-[#262D3B]">Taking daily thyroxine. TSH within normal range.</span></h5>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="HTN – Hypertension" className="block mb-2 font-normal font-medium text-[14px] leading-[120%] text-[#262D3B]">
                                        Menstrual
                                    </label>
                                    <div className="px-4 py-4 bg-[rgba(11,140,0,0.05)] border border-[#EBECED] rounded-lg">
                                        <h5 className="font-medium text-[14px] leading-[120%] text-[#6E7480]">Status: <span className="text-[#262D3B]">Yes</span></h5>
                                        <h5 className="font-medium text-[14px] leading-[120%] text-[#6E7480] mt-1">Remarks: <span className="text-[#262D3B]">No pain, normal cycle of 28-30 days.</span></h5>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mb-4 w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5">
                        <div className="mb-4">
                            <div
                                className="flex items-center justify-between gap-2 cursor-pointer">
                                <div className="flex items-center gap-2 ">
                                    <Image src="/icons/Bedicon.svg" alt="Appointment" width={20} height={20} />
                                    <h2 className="font-inter font-medium text-base leading-[120%] text-[#262D3B]">General Questions</h2>
                                </div>
                            </div>
                            <div className="Room-content mt-5">
                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label htmlFor="diabetes" className="block mb-2 font-normal font-medium text-[14px] leading-[120%] text-[#262D3B]">
                                            Are you allergic to any food or drink?
                                        </label>
                                        <div className="px-4 py-4 bg-[rgba(11,140,0,0.05)] border border-[#EBECED] rounded-lg">
                                            <h5 className="font-medium text-[14px] leading-[120%] text-[#6E7480]">Status: <span className="text-[#262D3B]">Yes</span></h5>
                                            <h5 className="font-medium text-[14px] leading-[120%] text-[#6E7480] mt-1">Remarks: <span className="text-[#262D3B]">Allergic to peanuts and soy products.</span></h5>
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="HTN – Hypertension" className="block mb-2 font-normal font-medium text-[14px] leading-[120%] text-[#262D3B]">
                                            Do you take any vitamins, minerals and/or food supplements?
                                        </label>
                                        <div className="px-4 py-4 bg-[rgba(11,140,0,0.05)] border border-[#EBECED] rounded-lg">
                                            <h5 className="font-medium text-[14px] leading-[120%] text-[#6E7480]">Status: <span className="text-[#262D3B]">No</span></h5>
                                            <h5 className="font-medium text-[14px] leading-[120%] text-[#6E7480] mt-1">Remarks: <span className="text-[#262D3B]">No vitamins or supplements currently taken.</span></h5>
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="HTN – Hypertension" className="block mb-2 font-normal font-medium text-[14px] leading-[120%] text-[#262D3B]">
                                            Have you had any major injuries, hospitalizations, or operations?
                                        </label>
                                        <div className="px-4 py-4 bg-[rgba(11,140,0,0.05)] border border-[#EBECED] rounded-lg">
                                            <h5 className="font-medium text-[14px] leading-[120%] text-[#6E7480]">Status: <span className="text-[#262D3B]">Yes</span></h5>
                                            <h5 className="font-medium text-[14px] leading-[120%] text-[#6E7480] mt-1">Remarks: <span className="text-[#262D3B]">History of major injuries and surgeries.</span></h5>
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="HTN – Hypertension" className="block mb-2 font-normal font-medium text-[14px] leading-[120%] text-[#262D3B]">
                                            Do you have any chronic illnesses?
                                        </label>
                                        <div className="px-4 py-4 bg-[rgba(11,140,0,0.05)] border border-[#EBECED] rounded-lg">
                                            <h5 className="font-medium text-[14px] leading-[120%] text-[#6E7480]">Status: <span className="text-[#262D3B]">Yes</span></h5>
                                            <h5 className="font-medium text-[14px] leading-[120%] text-[#6E7480] mt-1">Remarks: <span className="text-[#262D3B]">Mild asthma since childhood, uses inhaler occasionally.</span></h5>
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="HTN – Hypertension" className="block mb-2 font-normal font-medium text-[14px] leading-[120%] text-[#262D3B]">
                                            Do you take any medications on a regular basis?
                                        </label>
                                        <div className="px-4 py-4 bg-[rgba(11,140,0,0.05)] border border-[#EBECED] rounded-lg">
                                            <h5 className="font-medium text-[14px] leading-[120%] text-[#6E7480]">Status: <span className="text-[#262D3B]">Yes</span></h5>
                                            <h5 className="font-medium text-[14px] leading-[120%] text-[#6E7480] mt-1">Remarks: <span className="text-[#262D3B]">Thyroid medicine (Thyroxine 50 mcg daily).</span></h5>
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="HTN – Hypertension" className="block mb-2 font-normal font-medium text-[14px] leading-[120%] text-[#262D3B]">
                                            Do you take any medications on a regular basis?
                                        </label>
                                        <div className="px-4 py-4 bg-[rgba(11,140,0,0.05)] border border-[#EBECED] rounded-lg">
                                            <h5 className="font-medium text-[14px] leading-[120%] text-[#6E7480]">Status: <span className="text-[#262D3B]">No</span></h5>
                                            <h5 className="font-medium text-[14px] leading-[120%] text-[#6E7480] mt-1">Remarks: <span className="text-[#262D3B]">N/A</span></h5>
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="HTN – Hypertension" className="block mb-2 font-normal font-medium text-[14px] leading-[120%] text-[#262D3B]">
                                            Have you ever been diagnosed or do you suffer from depression?
                                        </label>
                                        <div className="px-4 py-4 bg-[rgba(11,140,0,0.05)] border border-[#EBECED] rounded-lg">
                                            <h5 className="font-medium text-[14px] leading-[120%] text-[#6E7480]">Status: <span className="text-[#262D3B]">No</span></h5>
                                            <h5 className="font-medium text-[14px] leading-[120%] text-[#6E7480] mt-1">Remarks: <span className="text-[#262D3B]">N/A</span></h5>
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="HTN – Hypertension" className="block mb-2 font-normal font-medium text-[14px] leading-[120%] text-[#262D3B]">
                                            Have you been diagnosed with an eating disorder (anorexia, bulimia, binge eating)?
                                        </label>
                                        <div className="px-4 py-4 bg-[rgba(11,140,0,0.05)] border border-[#EBECED] rounded-lg">
                                            <h5 className="font-medium text-[14px] leading-[120%] text-[#6E7480]">Status: <span className="text-[#262D3B]">No</span></h5>
                                            <h5 className="font-medium text-[14px] leading-[120%] text-[#6E7480] mt-1">Remarks: <span className="text-[#262D3B]">N/A</span></h5>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div
                                className="flex items-center justify-between gap-2 cursor-pointer">
                                <div className="flex items-center gap-2 ">
                                    <Image src="/icons/Bedicon.svg" alt="Appointment" width={20} height={20} />
                                    <h2 className="font-inter font-medium text-base leading-[120%] text-[#262D3B]">Please Explain About</h2>
                                </div>
                            </div>
                            <div className="Room-content mt-5">
                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label htmlFor="diabetes" className="block mb-2 font-normal font-medium text-[14px] leading-[120%] text-[#262D3B]">
                                            Appetite
                                        </label>
                                        <div className="px-4 py-4 bg-[rgba(11,140,0,0.05)] border border-[#EBECED] rounded-lg">
                                            <h5 className="font-medium text-[14px] leading-[120%] text-[#262D3B]">Moderate appetite, usually feels hungry on time.</h5>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    </div>
                </div>


            </div> */}
        </AppShell>
    );
}


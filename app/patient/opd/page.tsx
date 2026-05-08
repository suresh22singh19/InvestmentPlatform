"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
    Button,
    Dialog,
    FormSelectField,
    Pagination,
    RefreshButton,
    SpinnerLoader,
    Table,
    TableBody,
    TableData,
    TableHead,
    TableHeader,
    TableRow,
    TableSearchInput,
    Tooltip,
} from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import DateFilterDropdown from "@/components/registration/DateFilterDropdown";
import { PaymentReceiptCapture } from "@/components/registration/PaymentReceiptCapture";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { usePermission } from "@/hooks/usePermission";
import { useGetBranchesQuery } from "@/store/api/settingsApi";
import { useGetLegacyDoctorsByBranchQuery } from "@/store/api/v3OldHiimsApis";
import type { SelectOption } from "@/components/ui/FormSelectField";
import { downloadPaymentReceiptPdfFromElement } from "@/lib/utils/downloadPaymentReceiptPdf";
import NewOPDPatientForm, {
    type NewOPDPatientFormHandle,
    type NewOPDPatientFormProps,
} from "@/lib/utils/newOPDpatientForm";
import PatientCGHS, {
    type PatientCGHSHandle,
    type PatientCGHSProps,
} from "@/lib/utils/patientForm";

type OldOpdRow = {
    id: number;
    branchId: number;
    uhid: string;
    token: string;
    opdId: string;
    name: string;
    doctor: string;
    doctorFee: string;
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
    patient_id?: string | null;
    patient_ipd_id: string | null;
    doctor_id: string | null;
    doctor_name: string | null;
    doctor_fee?: string | null;
    entry_fee?: string | null;
    date_app: string | null;
    time_slot: string | null;
    token: string | null;
    created_at: string | null;
    patient_name: string | null;
    gender: string | null;
    age: string | null;
    patient_panel: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
};

type LegacyOpdApiResponse = {
    status?: boolean;
    message?: string;
    total_records?: number;
    data?: LegacyOpdApiItem[];
};

export default function IpdPage() {
    const patientPermission = usePermission("Patient");
    const opdPermission = usePermission("Patient", { subModule: "Opd" });
    const canView = patientPermission.canView || opdPermission.canView;
    const canDownload = patientPermission.canDownload || opdPermission.canDownload;

    const {
        selectedBranchFilter,
        setSelectedBranchFilter,
        branchFilterOptions,
        isLoadingBranches,
        isBranchFilterDisabled,
        isSuperAdmin: isBranchFilterSuperAdmin,
        branchFilterPersistReady,
        filterBranchId,
    } = useBranchFilter();
    const { data: branchesData } = useGetBranchesQuery(undefined, {
        skip: !isBranchFilterSuperAdmin,
    });
    const branchOptions: SelectOption[] = useMemo(
        () => branchFilterOptions.filter((o) => o.value !== ""),
        [branchFilterOptions]
    );
    const effectiveBranchId = filterBranchId ?? 1;
    const { data: legacyDoctorsResponse, isLoading: isLoadingDoctors } = useGetLegacyDoctorsByBranchQuery(
        effectiveBranchId,
        { skip: !branchFilterPersistReady }
    );
    const doctorOptions: SelectOption[] = useMemo(() => {
        const allDoctors: SelectOption = { value: "all", label: "All Doctor" };
        const rows = legacyDoctorsResponse?.data ?? [];
        if (rows.length === 0) return [allDoctors];
        return [
            allDoctors,
            ...rows.map((d) => ({
                value: d.id,
                label: d.name?.trim() ? d.name.trim() : `Doctor ${d.id}`,
            })),
        ];
    }, [legacyDoctorsResponse]);
    const router = useRouter();
    const handleViewPatient = useCallback(
        (row: OldOpdRow) => {
            router.push(`/patient/details?id=${row.id}&source=opd`);
        },
        [router]
    );
    const [selectedDoctor, setSelectedDoctor] = useState("all");
    const [searchType, setSearchType] = useState<"uhid" | "patientName">("uhid");
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedUhid, setDebouncedUhid] = useState("");
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [rows, setRows] = useState<OldOpdRow[]>([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [isLoadingRows, setIsLoadingRows] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [downloadingRowId, setDownloadingRowId] = useState<number | null>(null);
    const [downloadFormPayload, setDownloadFormPayload] = useState<NewOPDPatientFormProps | null>(null);
    const [prescriptionPadPayload, setPrescriptionPadPayload] = useState<PatientCGHSProps | null>(null);
    const [isInvoicePrescriptionDialogOpen, setIsInvoicePrescriptionDialogOpen] = useState(false);
    const [selectedInvoiceRow, setSelectedInvoiceRow] = useState<OldOpdRow | null>(null);
    const [invoiceCaptureRow, setInvoiceCaptureRow] = useState<OldOpdRow | null>(null);
    const [isInvoicePdfDownloading, setIsInvoicePdfDownloading] = useState(false);
    const [isPrescriptionPadDownloading, setIsPrescriptionPadDownloading] = useState(false);
    const downloadFormRef = useRef<NewOPDPatientFormHandle | null>(null);
    const prescriptionPadRef = useRef<PatientCGHSHandle | null>(null);
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
        if (!value) return "";
        // DatePicker already returns YYYY-MM-DD — pass it through directly
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
        // Legacy dd-mm-yyyy path
        const parsed = parseDdMmYyyy(value);
        if (!parsed) return "";
        const yyyy = parsed.getFullYear();
        const mm = String(parsed.getMonth() + 1).padStart(2, "0");
        const dd = String(parsed.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    };

    const SEARCH_TYPE_OPTIONS = [
        { value: "uhid", label: "UHID", placeholder: "Search by UHID" },
        { value: "patientName", label: "Patient Name", placeholder: "Search by Patient Name" },
    ] as const;

    const currentSearchConfig = SEARCH_TYPE_OPTIONS.find((o) => o.value === searchType) ?? SEARCH_TYPE_OPTIONS[0];

    const handleSearchChange = useCallback((value: string) => {
        const sanitized = searchType === "patientName" ? value.replace(/[^a-zA-Z\s]/g, "") : value;
        setSearchTerm(sanitized);
        setCurrentPage(1);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setDebouncedUhid(sanitized.trim());
        }, 500);
    }, [searchType]);

    const handleSearchTypeChange = (value: string) => {
        setSearchType(value as "uhid" | "patientName");
        setSearchTerm("");
        setDebouncedUhid("");
        setCurrentPage(1);
        if (debounceRef.current) clearTimeout(debounceRef.current);
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
        setSearchType("uhid");
        setSearchTerm("");
        setDebouncedUhid("");
        if (debounceRef.current) clearTimeout(debounceRef.current);
        setFromDate("");
        setToDate("");
        setCurrentPage(1);
        setIsFilterOpen(false);
    };

    const buildDownloadPayload = useCallback((row: OldOpdRow): NewOPDPatientFormProps => {
        return {
            patient: {
                patient: row.name?.trim() || "N/A",
                parent_name: "N/A",
                bp: "N/A",
                sl: "N/A",
                weight: "N/A",
                height: "N/A",
                uhid: row.uhid?.trim() || "N/A",
                opdId: row.opdId?.trim() || "N/A",
                age: row.age?.trim() || "N/A",
                gender: row.gender?.trim() || "N/A",
            },
            doctor: {
                name: row.doctor?.trim() || "N/A",
                education: [],
                reg_no: "",
            },
            appointment: {
                created_at: row.createdAt?.trim() || new Date().toISOString(),
            },
        };
    }, []);

    const handleDownloadPatientForm = useCallback(async (row: OldOpdRow) => {
        if (downloadingRowId !== null) return;
        try {
            setDownloadingRowId(row.id);
            setDownloadFormPayload(buildDownloadPayload(row));
            await new Promise((resolve) => setTimeout(resolve, 0));
            await downloadFormRef.current?.downloadPdf();
        } finally {
            setDownloadingRowId(null);
        }
    }, [buildDownloadPayload, downloadingRowId]);

    const openInvoicePrescriptionDialog = useCallback((row: OldOpdRow) => {
        setSelectedInvoiceRow(row);
        setIsInvoicePrescriptionDialogOpen(true);
    }, []);

    const buildPrescriptionPadPayload = useCallback((row: OldOpdRow): PatientCGHSProps => {
        return {
            patient: {
                patient: row.name?.trim() || "N/A",
                parent_name: "N/A",
                bp: "N/A",
                sl: "N/A",
                weight: "N/A",
                height: "N/A",
                uhid: row.uhid?.trim() || "N/A",
                opdId: row.opdId?.trim() || "N/A",
                age: row.age?.trim() || "N/A",
                gender: row.gender?.trim() || "N/A",
            },
            doctor: {
                name: row.doctor?.trim() || "N/A",
                education: [],
                reg_no: "",
            },
            appointment: {
                created_at: row.createdAt?.trim() || new Date().toISOString(),
            },
            showDownloadButton: false,
        };
    }, []);

    const handleDownloadPrescriptionPad = useCallback(async (row: OldOpdRow) => {
        try {
            setIsPrescriptionPadDownloading(true);
            setPrescriptionPadPayload(buildPrescriptionPadPayload(row));
            await new Promise((resolve) => setTimeout(resolve, 0));
            await prescriptionPadRef.current?.downloadPdf();
        } finally {
            setIsPrescriptionPadDownloading(false);
        }
    }, [buildPrescriptionPadPayload]);

    useEffect(() => {
        if (!invoiceCaptureRow) return;
        let cancelled = false;
        let raf2Id = 0;
        let timeoutId: number | null = null;
        const raf1Id = requestAnimationFrame(() => {
            raf2Id = requestAnimationFrame(() => {
                timeoutId = window.setTimeout(() => {
                    if (cancelled) return;
                    void (async () => {
                        try {
                            await downloadPaymentReceiptPdfFromElement(
                                "opd-list-invoice-capture",
                                invoiceCaptureRow.uhid || String(invoiceCaptureRow.id),
                            );
                        } finally {
                            if (!cancelled) {
                                setInvoiceCaptureRow(null);
                                setIsInvoicePdfDownloading(false);
                            }
                        }
                    })();
                }, 0);
            });
        });
        return () => {
            cancelled = true;
            cancelAnimationFrame(raf1Id);
            cancelAnimationFrame(raf2Id);
            if (timeoutId !== null) window.clearTimeout(timeoutId);
        };
    }, [invoiceCaptureRow]);

    useEffect(() => {
        const controller = new AbortController();

        const loadRows = async () => {
            if (!canView) {
                setRows([]);
                setTotalRecords(0);
                setLoadError(null);
                setIsLoadingRows(false);
                return;
            }
            setIsLoadingRows(true);
            setLoadError(null);
            try {
                const params = new URLSearchParams({
                    branchId: String(effectiveBranchId),
                    uhid: searchType === "uhid" ? debouncedUhid : "",
                    patientName: searchType === "patientName" ? debouncedUhid : "",
                    doctorId: selectedDoctor === "all" ? "" : selectedDoctor,
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

                const mappedRows: OldOpdRow[] = (payload.data ?? []).map((item) => {
                    const doctorDisplay = item.doctor_name?.trim()
                        ? item.doctor_name.trim()
                        : item.doctor_id
                          ? `Doctor ${item.doctor_id}`
                          : "-";
                    return {
                        id: Number(item.id) || 0,
                        branchId: Number(item.branch_id) || 0,
                        uhid: item.uhid ?? "-",
                        token: item.token ?? "-",
                        opdId: item.id ?? "-",
                        name: item.patient_name ?? "-",
                        doctor: doctorDisplay,
                        doctorFee: (item.doctor_fee ?? "").trim() || "-",
                        appointmentDate: item.date_app ?? "-",
                        appointmentTime: item.time_slot ?? "-",
                        gender: item.gender ?? "-",
                        age: item.age ?? "-",
                        type: item.patient_panel ?? "-",
                        city: item.city?.trim() ? item.city : "-",
                        state: item.state?.trim() ? item.state : "-",
                        country: item.country?.trim() ? item.country : "-",
                        createdAt: item.created_at ?? "-",
                    };
                });

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
    }, [branchFilterPersistReady, canView, currentPage, debouncedUhid, effectiveBranchId, fromDate, itemsPerPage, searchType, selectedDoctor, toDate]);

    useEffect(() => {
        setSelectedDoctor("all");
    }, [effectiveBranchId]);

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

    if (!canView) {
        return (
            <AppShell>
                <div className="rounded-[20px] border border-[#E3EEE1] bg-white px-6 py-10 text-center text-sm text-[#9CA3AF]">
                    You don&apos;t have permission to view Old OPD.
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <div className="space-y-8">
                <div className="flex items-start justify-between">
                    <PageHeading title="Old OPD Patient" />
                </div>

                <ListBorder as="section" className="px-4 py-4">
                    <div className="w-full rounded-[16px] border border-[#E3EEE1] bg-white px-5 pb-5 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
                        <div className="mb-6 flex flex-wrap items-center justify-end gap-3">
                            {/* <div className="w-[300px] max-w-full">
                                <FormSelectField
                                    label=""
                                    hideLabel
                                    options={branchOptions}
                                    value={selectedBranchFilter}
                                    onChange={(value) => {
                                        setSelectedBranchFilter(Array.isArray(value) ? value[0] : value || "");
                                        setCurrentPage(1);
                                    }}
                                    placeholder={isLoadingBranches ? "Loading branches..." : "Select Branch"}
                                    mode="single"
                                    background="normal"
                                    width={300}
                                    disabled={isBranchFilterDisabled || isLoadingBranches}
                                />
                            </div> */}

                            <div className="w-[260px] max-w-full">
                                <FormSelectField
                                    label=""
                                    hideLabel
                                    options={doctorOptions}
                                    value={selectedDoctor}
                                    onChange={(value) => {
                                        setSelectedDoctor(Array.isArray(value) ? value[0] : value || "all");
                                        setCurrentPage(1);
                                    }}
                                    mode="single"
                                    background="normal"
                                    placeholder={isLoadingDoctors ? "Loading doctors..." : "Select Doctor"}
                                    disabled={isLoadingDoctors}
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="w-[260px] max-w-full">
                                    <FormSelectField
                                        label=""
                                        hideLabel
                                        options={[
                                            { value: "uhid", label: "UHID" },
                                            { value: "patientName", label: "Patient Name" },
                                        ]}
                                        value={searchType}
                                        onChange={(value) =>
                                            handleSearchTypeChange(Array.isArray(value) ? value[0] : value || "uhid")
                                        }
                                        mode="single"
                                        background="normal"
                                        placeholder="Search by"
                                    />
                                </div>
                                <div className="w-[260px] max-w-full">
                                    <TableSearchInput
                                        value={searchTerm}
                                        onChange={handleSearchChange}
                                        placeholder={currentSearchConfig.placeholder}
                                    />
                                </div>
                                <div className="relative" ref={filterRef}>
                                    <Button type="button" variant="outline" onClick={handleFilterClick}>
                                        <div className="flex items-center justify-center gap-2">
                                            <Image src="/icons/FilterIcon.svg" alt="Filter" width={16} height={16} />
                                            <span>Filter</span>
                                        </div>
                                    </Button>
                                    {isFilterOpen && (
                                        <div className="absolute right-0 top-full mt-2 z-50">
                                            <DateFilterDropdown
                                                onFilter={handleFilter}
                                                onClear={handleClear}
                                                initialFromDate={fromDate}
                                                initialToDate={toDate}
                                            />
                                        </div>
                                    )}
                                </div>
                                <RefreshButton onClick={handleRefresh} />
                            </div>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow className="bg-white">
                                    <TableHead position="first">Sr no.</TableHead>
                                    <TableHead>UHID</TableHead>
                                    <TableHead>Token</TableHead>
                                    <TableHead>OPD ID</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Doctor</TableHead>
                                    <TableHead>Appointment Date</TableHead>
                                    <TableHead>Appointment Time</TableHead>
                                    <TableHead>Gender</TableHead>
                                    <TableHead>Age</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>City</TableHead>
                                    <TableHead>State</TableHead>
                                    <TableHead>Country</TableHead>
                                    <TableHead>Created At</TableHead>
                                    <TableHead position="last">Action</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {isLoadingRows ? (
                                    <TableRow>
                                        <TableData colSpan={16} className="py-12 text-center text-sm text-[#9CA3AF]">
                                            <div className="flex items-center justify-center">
                                                <SpinnerLoader />
                                            </div>
                                        </TableData>
                                    </TableRow>
                                ) : loadError ? (
                                    <TableRow>
                                        <TableData colSpan={16} className="py-12 text-center text-sm text-[#F6776E]">
                                            {loadError}
                                        </TableData>
                                    </TableRow>
                                ) : rows.length === 0 ? (
                                    <TableRow>
                                        <TableData colSpan={16} className="py-12 text-center text-sm text-[#9CA3AF]">
                                            No patient records found.
                                        </TableData>
                                    </TableRow>
                                ) : (
                                    rows.map((row, index) => (
                                        <TableRow key={row.id} className="bg-white transition-colors hover:bg-[#F7FAF7]">
                                            <TableData variant="primary">{(currentPage - 1) * itemsPerPage + index + 1}</TableData>
                                            <TableData onClick={canView ? () => handleViewPatient(row) : undefined}>
                                                <span className="font-medium text-[#0B8C00]">{row.uhid}</span>
                                            </TableData>
                                            <TableData>{row.token}</TableData>
                                            <TableData>{row.opdId}</TableData>
                                            <TableData>{row.name}</TableData>
                                            <TableData>{row.doctor}</TableData>
                                            <TableData>{row.appointmentDate}</TableData>
                                            <TableData>{row.appointmentTime}</TableData>
                                            <TableData>{row.gender}</TableData>
                                            <TableData>{row.age}</TableData>
                                            <TableData>{row.type}</TableData>
                                            <TableData>{row.city}</TableData>
                                            <TableData>{row.state}</TableData>
                                            <TableData>{row.country}</TableData>
                                            <TableData>{row.createdAt}</TableData>
                                            <TableData>
                                                <div className="flex items-center gap-2">
                                                    <Tooltip content="Patient View" position="top" delay={0}>
                                                        <button
                                                            type="button"
                                                            className="rounded p-1 transition-colors hover:bg-[#F2F7F1] cursor-pointer"
                                                            aria-label="Patient View"
                                                            onClick={() => handleViewPatient(row)}
                                                        >
                                                            <Image src="/icons/ViewEyeIcon.svg" alt="Patient View" width={18} height={18} />
                                                        </button>
                                                    </Tooltip>
                                                    {canDownload && (
                                                    <Tooltip content="Patient Form" position="top" delay={0}>
                                                        <button
                                                            type="button"
                                                            className="rounded p-1 transition-colors hover:bg-[#F2F7F1] cursor-pointer"
                                                            aria-label="Patient Form"
                                                            onClick={() => handleDownloadPatientForm(row)}
                                                            disabled={downloadingRowId !== null}
                                                        >
                                                            {downloadingRowId === row.id ? (
                                                                <SpinnerLoader className="h-[18px] w-[18px]" />
                                                            ) : (
                                                                <Image src="/icons/Download.svg" alt="Download" width={18} height={18} />
                                                            )}
                                                        </button>
                                                    </Tooltip>
                                                    )}
                                                    {canDownload && (
                                                    <Tooltip content="Invoice & Prescription" position="top" delay={0}>
                                                        <button
                                                            type="button"
                                                            className="rounded p-1 transition-colors hover:bg-[#F2F7F1] cursor-pointer"
                                                            aria-label="Print Invoice & Prescription Pad"
                                                            onClick={() => openInvoicePrescriptionDialog(row)}
                                                        >
                                                            <Image src="/icons/InvoiceDownloadIcon.svg" alt="Print Invoice & Prescription Pad" width={15} height={15} />
                                                        </button>
                                                    </Tooltip>
                                                    )}
                                                    {/* <Tooltip content="OPD Confirm" position="top" delay={0}>
                                                        <button
                                                            type="button"
                                                            className="rounded p-1 transition-colors hover:bg-[#F2F7F1] cursor-pointer"
                                                            aria-label="OPD Confirm"
                                                        >
                                                            <Image src="/icons/opdConfirmIcon.svg" alt="OPD Confirm" width={18} height={18} />
                                                        </button>
                                                    </Tooltip>
                                                    <Tooltip content="Doctor Change" position="top" delay={0}>
                                                        <button
                                                            type="button"
                                                            className="rounded p-1 transition-colors hover:bg-[#F2F7F1] cursor-pointer"
                                                            aria-label="Doctor Change"
                                                        >
                                                            <Image src="/icons/doctorIcon.svg" alt="Doctor Change" width={18} height={18} />
                                                        </button>
                                                    </Tooltip> */}
                                                </div>
                                            </TableData>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        <Pagination
                            currentPage={currentPage}
                            totalItems={totalRecords}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                            onItemsPerPageChange={(items) => {
                                setItemsPerPage(items);
                                setCurrentPage(1);
                            }}
                            itemsPerPageOptions={[10, 20,50,100]}
                        />
                    </div>
                </ListBorder>
            </div>
            {downloadFormPayload ? (
                <div className="pointer-events-none fixed -left-[10000px] top-0 opacity-0">
                    <NewOPDPatientForm
                        ref={downloadFormRef}
                        showDownloadButton={false}
                        branch={downloadFormPayload.branch}
                        patient={downloadFormPayload.patient}
                        doctor={downloadFormPayload.doctor}
                        appointment={downloadFormPayload.appointment}
                        diagnosis={downloadFormPayload.diagnosis}
                    />
                </div>
            ) : null}
            <Dialog
                open={isInvoicePrescriptionDialogOpen}
                onClose={() => {
                    setIsInvoicePrescriptionDialogOpen(false);
                    setSelectedInvoiceRow(null);
                }}
                title="Appointment Receipt Details"
                width={480}
                contentPadding="px-6 pb-6 pt-2"
            >
                <div className="space-y-4">
                    <div className="space-y-3 text-sm">
                        <div className="text-[#434956]">
                            Dr. {(selectedInvoiceRow?.doctor ?? "N/A")} Fee ₹{(selectedInvoiceRow?.doctorFee ?? "N/A")}
                            <br />
                            Token Number: {(selectedInvoiceRow?.token ?? "N/A")}
                        </div>
                        <p className="text-[#434956]">Transaction ID: N/A</p>
                        <p className="text-[#434956]">
                            Transaction Date: {(() => {
                                const d = (selectedInvoiceRow?.appointmentDate ?? "").trim();
                                if (d && d !== "-") return d;
                                const created = (selectedInvoiceRow?.createdAt ?? "").trim();
                                if (created && created !== "-") return created.split(" ")[0];
                                return "N/A";
                            })()}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                if (!selectedInvoiceRow) return;
                                setIsInvoicePdfDownloading(true);
                                setInvoiceCaptureRow(selectedInvoiceRow);
                            }}
                            disabled={isInvoicePdfDownloading || isPrescriptionPadDownloading}
                            className={`flex h-10 shrink-0 items-center justify-center gap-2 rounded-[32px] border border-[#9A7909] bg-white px-6 font-inter text-sm font-medium leading-[120%] text-[#9A7909] transition-colors hover:bg-[#FEF9E7] ${
                                isInvoicePdfDownloading || isPrescriptionPadDownloading
                                    ? "cursor-not-allowed opacity-60"
                                    : "cursor-pointer"
                            }`}
                        >
                            {isInvoicePdfDownloading ? (
                                <SpinnerLoader className="h-4 w-4 text-[#9A7909]" />
                            ) : (
                                <>
                                    <Image
                                        src="/icons/DownloadExport.svg"
                                        alt="Print invoice"
                                        width={20}
                                        height={20}
                                        className="shrink-0"
                                    />
                                     Invoice
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            disabled={isInvoicePdfDownloading || isPrescriptionPadDownloading}
                            className={`flex h-10 shrink-0 items-center justify-center gap-2 rounded-[32px] border border-[#9A7909] bg-white px-6 font-inter text-sm font-medium leading-[120%] text-[#9A7909] transition-colors hover:bg-[#FEF9E7] ${
                                isInvoicePdfDownloading || isPrescriptionPadDownloading
                                    ? "cursor-not-allowed opacity-60"
                                    : "cursor-pointer"
                            }`}
                            onClick={() => {
                                if (!selectedInvoiceRow) return;
                                void handleDownloadPrescriptionPad(selectedInvoiceRow);
                            }}
                        >
                            {isPrescriptionPadDownloading ? (
                                <SpinnerLoader className="h-4 w-4 text-[#9A7909]" />
                            ) : (
                                <>
                                    <Image
                                        src="/icons/DownloadExport.svg"
                                        alt="Print prescription pads"
                                        width={20}
                                        height={20}
                                        className="shrink-0"
                                    />
                                    Prescription Pads
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </Dialog>
            {prescriptionPadPayload ? (
                <PatientCGHS ref={prescriptionPadRef} {...prescriptionPadPayload} />
            ) : null}
            {invoiceCaptureRow ? (
                <div
                    className="pointer-events-none fixed left-[-10000px] top-0 z-[-1] w-[min(720px,100vw)] overflow-visible"
                    aria-hidden
                >
                    <div className="invoice-content flex w-full min-w-0 flex-col gap-[16px]">
                        <PaymentReceiptCapture
                            captureId="opd-list-invoice-capture"
                            patientName={invoiceCaptureRow.name || "N/A"}
                            address="N/A"
                            cityName={invoiceCaptureRow.city || "N/A"}
                            stateName={invoiceCaptureRow.state || "N/A"}
                            jsHealthCardNo={invoiceCaptureRow.uhid || "N/A"}
                            uhid={invoiceCaptureRow.uhid || "N/A"}
                            invoiceNumber={invoiceCaptureRow.opdId || "N/A"}
                            consultationCharges={Number(invoiceCaptureRow.doctorFee) || 0}
                            subtotal={Number(invoiceCaptureRow.doctorFee) || 0}
                            tax={0}
                            totalAmount={Number(invoiceCaptureRow.doctorFee) || 0}
                            billDate={invoiceCaptureRow.appointmentDate || "N/A"}
                            transactionId="N/A"
                        />
                    </div>
                </div>
            ) : null}
        </AppShell>
    );
}


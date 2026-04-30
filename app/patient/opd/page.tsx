"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
    Button,
    FormSelectField,
    Pagination,
    RefreshButton,
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

const DOCTOR_OPTIONS = [
    { value: "all", label: "Select Doctor" },

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
    const handleViewPatient = useCallback(
        (row: OldOpdRow) => {
            router.push(`/patient/details?id=${row.id}`);
        },
        [router]
    );
    const [selectedDoctor, setSelectedDoctor] = useState("all");
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

    const handleSearchChange = useCallback((value: string) => {
        setSearchTerm(value);
        setCurrentPage(1);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setDebouncedUhid(value.trim());
        }, 500);
    }, []);

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
        setDebouncedUhid("");
        if (debounceRef.current) clearTimeout(debounceRef.current);
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
                    branchId: "1",
                    uhid: debouncedUhid,
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
                    opdId: item.id ?? "-",
                    name: item.patient_name ?? "-",
                    doctor: item.doctor_id ? `Doctor ${item.doctor_id}` : "-",
                    appointmentDate: item.date_app ?? "-",
                    appointmentTime: item.time_slot ?? "-",
                    gender: item.gender ?? "-",
                    age: item.age ?? "-",
                    type: item.patient_panel ?? "-",
                    city: item.city?.trim() ? item.city : "-",
                    state: item.state?.trim() ? item.state : "-",
                    country: item.country?.trim() ? item.country : "-",
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
    }, [currentPage, debouncedUhid, fromDate, itemsPerPage, selectedDoctor, toDate]);

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
                                    options={DOCTOR_OPTIONS}
                                    value={selectedDoctor}
                                    onChange={(value) => {
                                        setSelectedDoctor(Array.isArray(value) ? value[0] : value || "all");
                                        setCurrentPage(1);
                                    }}
                                    mode="single"
                                    background="normal"
                                    placeholder="Select Doctor"
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="w-[280px] max-w-full">
                                    <TableSearchInput
                                        value={searchTerm}
                                        onChange={handleSearchChange}
                                        placeholder="Search by UHID" />
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
                                            Loading...
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
                                            <TableData onClick={() => handleViewPatient(row)}>
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
                                                    <Tooltip content="Patient Form" position="top" delay={0}>
                                                        <button
                                                            type="button"
                                                            className="rounded p-1 transition-colors hover:bg-[#F2F7F1] cursor-pointer"
                                                            aria-label="Patient Form"
                                                        >
                                                            <Image src="/icons/Download.svg" alt="Download" width={18} height={18} />
                                                        </button>
                                                    </Tooltip>
                                                    <Tooltip content="OPD Confirm" position="top" delay={0}>
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
                                                    </Tooltip>
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
        </AppShell>
    );
}


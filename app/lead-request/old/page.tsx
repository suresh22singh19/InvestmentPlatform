"use client";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
    Pagination,
    Table,
    TableBody,
    TableData,
    TableHead,
    TableHeader,
    TableRow,
    TableSearchInput,
    FormSelectField,
    Tabs,
    Tooltip,
    Dialog
} from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import { useState, useMemo, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { LeadItem } from "@/store/api/leadsApi";
import { useGetLegacyLeadListQuery, type LegacyV3LeadItem } from "@/store/api/v3OldHiimsApis";
import type { SelectOption } from "@/components/ui/FormSelectField";
import { useAppSelector } from "@/store/hooks";
import { selectUserBranchId, selectUserEmail } from "@/store/slices/authSlice";
import { useDebounce } from "@/hooks/useDebounce";
import { usePermission } from "@/hooks/usePermission";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { useGetBranchesQuery } from "@/store/api/settingsApi";
import { registrationListPathFromBranchType } from "@/lib/utils/registrationBranchRoutes";
import DateFilterDropdown from "@/components/registration/DateFilterDropdown";

const EMAIL_REGISTRATION_ROUTE: Record<string, string> = {
    "superadminhiims@dikonia.in": "/registration",
    "superadminhiims2@dikonia.in": "/registration/hospital",
};

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Patient type label for lead list / view dialog.
 * API may send NORMAL for a private patient — show as PRIVATE.
 * PRIVATE (any case) → PRIVATE. TPA / PANEL shown as expected; other values unchanged.
 */
function formatLeadPatientTypeDisplay(patientType: string | null | undefined): string {
    if (patientType == null || String(patientType).trim() === "") return "";
    const upper = String(patientType).trim().toUpperCase();
    if (upper === "NORMAL") return "PRIVATE";
    if (upper === "PRIVATE") return "PRIVATE";
    if (upper === "TPA") return "TPA";
    if (upper === "PANEL") return "Panel";
    return String(patientType).trim();
}

/** First letter of each word upper, rest lower (e.g. vinod → Vinod, male → Male). */
function formatTitleCaseWords(value: string | null | undefined): string {
    if (value == null || String(value).trim() === "") return "";
    return String(value)
        .trim()
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
}

function formatDisplayName(value: string | null | undefined): string {
    const s = formatTitleCaseWords(value);
    return s || "—";
}

function formatDisplayDate(iso: string | null | undefined): string {
    if (!iso) return "—";
    try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return "—";
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        return `${day}-${month}-${year} ${hh}:${mm} AM`;
    } catch {
        return "—";
    }
}

function capitalizeFirst(str: string | null | undefined): string {
    if (str == null || str === "") return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function branchSelectLabel(name: string, typeRaw: string | null | undefined): string {
    const t = (typeRaw ?? "").trim();
    if (!t) return name;
    return `${name} (${capitalizeFirst(t)})`;
}

function getYmdFromDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function getTodayYmd(): string {
    return getYmdFromDate(new Date());
}

function getPastYmd(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return getYmdFromDate(d);
}
function mapLegacyLeadToLeadItem(item: LegacyV3LeadItem): LeadItem {
    return {
        id: Number(item.id) || 0,
        branchName: item.branch_name ?? undefined,
        patientName: item.patient_name ?? undefined,
        parentPrefix: item.parent_prefix ?? undefined,
        parentName: item.parent_name ?? undefined,
        gender: item.gender ?? undefined,
        age: item.age ?? undefined,
        contactNumber: item.contact_number ?? undefined,
        pinCode: (item.pin_code as string | null) ?? null,
        address: item.address ?? null,
        area: item.area ?? null,
        tehsil: item.tehsil ?? null,
        city: item.city ?? null,
        state: item.state ?? null,
        patientType: item.patient_type ?? null,
        patientSubType: item.patient_sub_type ?? null,
        benificiaryId: item.benificiary_id ?? null,
        diagnosis: item.diagnosis ?? null,
        remark: item.remark ?? null,
        referralUserName: item.field_user_name ?? null,
        referralGroupName: item.user_group_name ?? null,
        createdAt: item.created_at ?? null,
        confirmedBranchName: (item.confirm_branch_name as string | null | undefined) ?? null,
        confirmedBranchId: (item.confirm_branch_id as string | null | undefined) ?? null,
    };
}

// ─── Page ────────────────────────────────────────────────────────────────────

const TAB_STATUS_MAP: Record<string, "active" | "confirmed" | "shifted"> = {
    "active-leads": "active",
    "confirmed-leads": "confirmed",
    "shifted-leads": "shifted",
};

export default function LeadRequestPage() {
    const router = useRouter();
    const leadRequestPermission = usePermission("Lead Request");
    const leadRequestSubPermission = usePermission("Lead Request", { subModule: "Lead Request" });
    const canView = leadRequestPermission.canView || leadRequestSubPermission.canView;
    const canEdit = leadRequestPermission.canEdit || leadRequestSubPermission.canEdit;
    const userBranchId = useAppSelector(selectUserBranchId);
    const branchId = userBranchId ?? 1;
    const userEmail = useAppSelector(selectUserEmail);

    const [activeTab, setActiveTab] = useState("active-leads");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState("");
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [fromDate, setFromDate] = useState<string>(() => getPastYmd(30));
    const [toDate, setToDate] = useState<string>(() => getTodayYmd());
    const filterRef = useRef<HTMLDivElement>(null);
    const {
        selectedBranchFilter,
        setSelectedBranchFilter,
        branchFilterOptions,
        isLoadingBranches,
        isBranchFilterDisabled,
        filterBranchId: hookFilterBranchId,
        isSuperAdmin: isBranchFilterSuperAdmin,
    } = useBranchFilter();

    const { data: branchesListData } = useGetBranchesQuery(undefined);

    /** Superadmin: no "All Branches"; labels include facility type (e.g. Hospital / Clinic). */
    const leadRequestBranchOptions = useMemo((): SelectOption[] => {
        const rows = branchesListData?.data;
        if (!isBranchFilterSuperAdmin) {
            if (!Array.isArray(rows) || rows.length === 0) return branchFilterOptions;
            return branchFilterOptions.map((opt) => {
                const id = parseInt(String(opt.value), 10);
                if (!Number.isFinite(id)) return opt;
                const b = rows.find((x) => Number(x.id) === id) as { name?: string; type?: string } | undefined;
                if (!b?.name) return opt;
                return {
                    value: opt.value,
                    label: branchSelectLabel(String(b.name), b.type),
                };
            });
        }
        if (!Array.isArray(rows) || rows.length === 0) return [];
        return rows.map((b) => {
            const row = b as { id: number; name?: string; type?: string };
            return {
                value: String(row.id),
                label: branchSelectLabel(String(row.name ?? ""), row.type),
            };
        });
    }, [isBranchFilterSuperAdmin, branchesListData, branchFilterOptions]);

    useEffect(() => {
        if (!isBranchFilterSuperAdmin) return;
        if (isLoadingBranches) return;
        const rows = branchesListData?.data;
        if (!Array.isArray(rows) || rows.length === 0) return;
        if (selectedBranchFilter !== "") return;
        setSelectedBranchFilter(String(rows[0].id));
    }, [
        isBranchFilterSuperAdmin,
        isLoadingBranches,
        branchesListData,
        selectedBranchFilter,
        setSelectedBranchFilter,
    ]);

    const [viewLead, setViewLead] = useState<LeadItem | null>(null);

    const debouncedSearch = useDebounce(searchTerm, 500);

    const apiStatus = TAB_STATUS_MAP[activeTab] ?? "active";

    const effectiveBranchId =
        isBranchFilterSuperAdmin && hookFilterBranchId && Number.isFinite(hookFilterBranchId) && hookFilterBranchId > 0
            ? hookFilterBranchId
            : branchId;

    const leadsQuerySkip = !canView || !effectiveBranchId || effectiveBranchId < 1;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
        };

        if (isFilterOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isFilterOpen]);

    const handleFilterClick = () => {
        setIsFilterOpen((v) => !v);
    };

    const handleFilter = (filterFromDate: string, filterToDate: string) => {
        setFromDate(filterFromDate);
        setToDate(filterToDate);
        setCurrentPage(1);
        setIsFilterOpen(false);
    };

    const handleClear = () => {
        setFromDate("");
        setToDate("");
        setCurrentPage(1);
        setIsFilterOpen(false);
    };

    const { data, isFetching, isError, refetch } = useGetLegacyLeadListQuery(
        {
            branchId: effectiveBranchId || 1,
            status: apiStatus,
            patientName: debouncedSearch.trim(),
            startDate: fromDate,
            endDate: toDate,
            limit: itemsPerPage,
            page: currentPage,
        },
        { skip: leadsQuerySkip },
    );

    const skipTabRefetchOnMount = useRef(true);
    useEffect(() => {
        if (skipTabRefetchOnMount.current) {
            skipTabRefetchOnMount.current = false;
            return;
        }
        if (leadsQuerySkip) return;
        void refetch();
    }, [activeTab, refetch, leadsQuerySkip]);

    const rows: LeadItem[] = useMemo(
        () => (data?.data ?? []).map((item) => mapLegacyLeadToLeadItem(item)),
        [data],
    );
    const total = data?.total_records ?? 0;

    const tabOptions = [
        { value: "active-leads", label: "Active Leads" },
        { value: "confirmed-leads", label: "Confirmed Leads" },
        { value: "shifted-leads", label: "Shifted Leads" },
    ];

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        setCurrentPage(1);
    };

    const showActionCheck = activeTab !== "confirmed-leads";
    const showConfirmedBranchColumn = activeTab === "confirmed-leads";

    const tableColumnCount =
        10 + (showConfirmedBranchColumn ? 1 : 0) + (canView || canEdit ? 1 : 0);
    const emailBasedRoute = userEmail ? (EMAIL_REGISTRATION_ROUTE[userEmail.toLowerCase()] ?? null) : null;

    const handleConfirmLead = (row: LeadItem) => {
        if (!canEdit) return;
        const branchIdNum =
            hookFilterBranchId != null &&
            Number.isFinite(hookFilterBranchId) &&
            hookFilterBranchId > 0
                ? hookFilterBranchId
                : null;

        const leadData: {
            contactNumber: string;
            leadId: number;
            source: string;
            branchId?: number;
        } = {
            contactNumber: row.contactNumber ?? "",
            leadId: row.id,
            source: activeTab,
        };
        if (branchIdNum != null) {
            leadData.branchId = branchIdNum;
        }
        localStorage.setItem("ACTIVE_LEAD_DATA", JSON.stringify(leadData));

        const regQuery = branchIdNum != null ? `?regBranch=${branchIdNum}` : "";

        // Same order as pre-booking Confirm: branch type from settings API wins over email-only route.
        const rows = branchesListData?.data;
        let targetPath: "/registration" | "/registration/hospital" =
            registrationListPathFromBranchType(undefined);
        let routedFromSelectedBranch = false;
        if (branchIdNum != null && Array.isArray(rows)) {
            const b = rows.find((x) => Number(x.id) === branchIdNum);
            if (b) {
                targetPath = registrationListPathFromBranchType((b as { type?: string }).type);
                routedFromSelectedBranch = true;
            }
        }
        if (routedFromSelectedBranch) {
            router.push(`${targetPath}${regQuery}`);
            return;
        }

        if (emailBasedRoute) {
            router.push(`${emailBasedRoute}${regQuery}`);
            return;
        }

        router.push(`${targetPath}${regQuery}`);
    };
    // Helper function to mask phone number (show last 4 digits, mask first 6 with 'x')
    const maskPhoneNumber = (phoneNumber: string | null | undefined): string => {
        if (!phoneNumber) return "N/A";
        const cleaned = phoneNumber.replace(/\D/g, ""); // Remove non-digits
        if (cleaned.length < 4) return phoneNumber; // If less than 4 digits, return as is
        const last4 = cleaned.slice(-4);
        const masked = "XXXXXX" + last4;
        return masked;
    };

    return (
        <AppShell>
            {!canView ? (
                <div className="rounded-[20px] border border-[#E3EEE1] bg-white px-6 py-10 text-center text-sm text-[#9CA3AF]">
                    You don&apos;t have permission to view lead requests.
                </div>
            ) : (
            <>
            <div className="space-y-8">
                <div className="flex items-start justify-between">
                    <PageHeading title="Lead Request" />
                </div>

                <ListBorder as="section" className="px-4 py-4" style={{ overflow: "visible" }}>
                    <div className="w-full rounded-[16px] border border-[#E3EEE1] bg-white px-5 pb-5 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">

                        {/* Top bar */}
                        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
                            <div className="w-[580px] max-w-full">
                                <Tabs options={tabOptions} value={activeTab} onChange={handleTabChange} />
                            </div>
                            <div className="flex items-center gap-3">
                                {/* <FormSelectField
                                    label=""
                                    hideLabel
                                    options={leadRequestBranchOptions}
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
                                /> */}
                                <div className="relative" ref={filterRef}>
                                    <button
                                        onClick={handleFilterClick}
                                        className="cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center w-[108px] h-10 rounded-[32px] border border-[#0B8C00] bg-white hover:bg-[#F7FAF7] relative z-10"
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            <Image src="/icons/FilterIcon.svg" alt="filter" width={24} height={24} />
                                            <span className="font-inter font-medium text-sm leading-[120%] text-[#0B8C00]">Filter</span>
                                        </div>
                                    </button>
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
                                <div className="flex-shrink-0" style={{ width: "280px" }}>
                                    <TableSearchInput
                                        value={searchTerm}
                                        onChange={(value) => {
                                            setSearchTerm(value);
                                            setCurrentPage(1);
                                        }}
                                        placeholder="Search here..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-white">
                                    <TableHead position="first">Sr no.</TableHead>
                                    <TableHead>Req. ID</TableHead>
                                    <TableHead>Patient</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Referred Branch</TableHead>
                                    {showConfirmedBranchColumn ? (
                                        <TableHead>Confirm Branch</TableHead>
                                    ) : null}
                                    <TableHead>Gender</TableHead>
                                    <TableHead>City</TableHead>
                                    <TableHead>State</TableHead>
                                    <TableHead>Referral User</TableHead>
                                    <TableHead>Created At</TableHead>
                                    {canView || canEdit ? <TableHead position="last">Action</TableHead> : null}
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {isFetching ? (
                                    <TableRow>
                                        <TableData colSpan={tableColumnCount} className="py-12 text-center text-sm text-[#9CA3AF]">
                                            Loading...
                                        </TableData>
                                    </TableRow>
                                ) : isError ? (
                                    <TableRow>
                                        <TableData colSpan={tableColumnCount} className="py-12 text-center text-sm text-red-600">
                                            Failed to load leads. Please try again.
                                        </TableData>
                                    </TableRow>
                                ) : rows.length === 0 ? (
                                    <TableRow>
                                        <TableData colSpan={tableColumnCount} className="py-12 text-center text-sm text-[#9CA3AF]">
                                            No leads found.
                                        </TableData>
                                    </TableRow>
                                ) : (
                                    rows.map((row, index) => (
                                        <TableRow
                                            key={row.id}
                                            className="bg-white transition-colors hover:bg-[#F7FAF7]"
                                        >
                                            <TableData variant="primary">
                                                {(currentPage - 1) * itemsPerPage + index + 1}
                                            </TableData>
                                            <TableData>{row.id}</TableData>
                                            <TableData>
                                                <Tooltip content={formatDisplayName(row.patientName)} position="top" delay={0}>
                                                    <div className="max-w-[180px] truncate font-medium inline-block align-top">
                                                        {formatDisplayName(row.patientName)}
                                                    </div>
                                                </Tooltip>
                                            </TableData>
                                            <TableData>{row.contactNumber ? maskPhoneNumber(row.contactNumber) : "—"}</TableData>
                                            <TableData>{row.branchName || "—"}</TableData>
                                            {showConfirmedBranchColumn ? (
                                                <TableData>
                                                    <div className="max-w-[180px] truncate" title={row.confirmedBranchName ?? ""}>
                                                        {row.confirmedBranchName?.trim() || "—"}
                                                    </div>
                                                </TableData>
                                            ) : null}
                                            <TableData>
                                                {formatDisplayName(row.gender)}
                                            </TableData>
                                            <TableData>
                                                <div className="max-w-[160px] truncate" title={row.city ?? ""}>
                                                    {row.city || "—"}
                                                </div>
                                            </TableData>
                                            <TableData>{row.state || "—"}</TableData>
                                            <TableData>
                                                <Tooltip
                                                    content={row.referralUserName ? `${row.referralUserName}${row.referralGroupName ? ` (${row.referralGroupName})` : ""}` : "—"}
                                                    position="top"
                                                    delay={0}
                                                >
                                                    <div className="max-w-[180px] truncate inline-block align-top">
                                                        {row.referralUserName
                                                            ? `${row.referralUserName}${row.referralGroupName ? ` (${row.referralGroupName})` : ""}`
                                                            : "—"}
                                                    </div>
                                                </Tooltip>
                                            </TableData>
                                            <TableData>{formatDisplayDate(row.createdAt)}</TableData>
                                            {canView || canEdit ? (
                                                <TableData className="flex gap-1">
                                                    {canView ? (
                                                        <Tooltip content="View" position="top" delay={0}>
                                                            <button
                                                                type="button"
                                                                onClick={() => setViewLead(row)}
                                                                className="cursor-pointer p-1 rounded hover:bg-[#F7FAF7] transition-colors"
                                                                aria-label="View lead"
                                                            >
                                                                <Image src="/icons/ViewEyeIcon.svg" alt="View" width={20} height={20} />
                                                            </button>
                                                        </Tooltip>
                                                    ) : null}
                                                    {/* {canEdit && showActionCheck ? (
                                                        <Tooltip content="Confirm" position="top" delay={0}>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleConfirmLead(row)}
                                                                className="cursor-pointer p-1 rounded hover:bg-[#F7FAF7] transition-colors"
                                                                aria-label="Confirm lead"
                                                            >
                                                                <Image src="/icons/check.svg" alt="Confirm" width={20} height={20} />
                                                            </button>
                                                        </Tooltip>
                                                    ) : null} */}
                                                </TableData>
                                            ) : null}
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        {/* Pagination */}
                        {total > 0 && (
                            <Pagination
                                currentPage={currentPage}
                                totalItems={total}
                                itemsPerPage={itemsPerPage}
                                onPageChange={(page) => setCurrentPage(page)}
                                onItemsPerPageChange={(items) => {
                                    setItemsPerPage(items);
                                    setCurrentPage(1);
                                }}
                                itemsPerPageOptions={[10, 20, 50, 100]}
                            />
                        )}
                    </div>
                </ListBorder>
            </div>

            {/* View Lead Dialog */}
            <Dialog
                open={!!viewLead && canView}
                onClose={() => setViewLead(null)}
                title="View Lead Request"
                width={580}
                contentPadding="px-6 pb-6"
            >
                {viewLead && (() => {
                    const fullAddress = [
                        viewLead.address,
                        viewLead.area,
                        viewLead.tehsil,
                        viewLead.city,
                        viewLead.state,
                        viewLead.pinCode,
                    ].filter(Boolean).join(", ");
                    const patientTypeLabel = formatLeadPatientTypeDisplay(viewLead.patientType);

                    return (
                        <div className="flex w-full flex-col gap-4">
                            {/* Patient header: name + tags on one row; contact row full width below */}
                            <div className="flex w-full flex-col gap-2">
                                <div className="flex w-full items-start justify-between gap-4">
                                    <p className="min-w-0 flex-1 text-lg font-semibold text-[#262D3B]">
                                        {/* {viewLead.parentPrefix ? `${viewLead.parentPrefix} ` : ""} */}
                                        {formatDisplayName(viewLead.patientName)}
                                    </p>
                                    <div className="flex shrink-0 gap-2">
                                        {patientTypeLabel && (
                                            <span className="rounded-full border border-[#0B8C00]/30 bg-white px-3 py-1 text-xs font-medium text-[#0B8C00]">
                                                {patientTypeLabel}
                                            </span>
                                        )}
                                        {viewLead.patientSubType && (
                                            <span className="rounded-full border border-[#0B8C00]/30 bg-white px-3 py-1 text-xs font-medium text-[#0B8C00]">
                                                {viewLead.patientSubType}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <p className="w-full text-sm text-[#6B7280]">
                                    Contact Number: {viewLead.contactNumber || "—"} &nbsp;•&nbsp; Age: {viewLead.age || "—"} Years &nbsp;•&nbsp; Gender: {formatDisplayName(viewLead.gender)}
                                </p>
                            </div>

                            <hr className="border-[#E3EEE1]" />

                            {/* Detail grid */}
                            <div className="grid grid-cols-3 gap-x-6 gap-y-5">
                                {/* Request ID */}
                                <div className="flex items-start gap-2">
                                    <Image src="/icons/RegistrationDarkIcon.svg" alt="Req ID" width={16} height={16} className="mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs text-[#9CA3AF]">Request ID</p>
                                        <p className="text-sm font-medium text-[#262D3B]">#{viewLead.id}</p>
                                    </div>
                                </div>
                                {/* Branch */}
                                <div className="flex items-start gap-2">
                                    <Image src="/icons/patientinfo.svg" alt="Branch" width={16} height={16} className="mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs text-[#9CA3AF]">Branch</p>
                                        <p className="text-sm font-medium text-[#262D3B]">{viewLead.branchName || "—"}</p>
                                    </div>
                                </div>
                                {viewLead.confirmedBranchName?.trim() ? (
                                    <div className="flex items-start gap-2">
                                        <Image src="/icons/patientinfo.svg" alt="Confirm branch" width={16} height={16} className="mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-xs text-[#9CA3AF]">Confirm Branch Name</p>
                                            <p className="text-sm font-medium text-[#262D3B]">{viewLead.confirmedBranchName.trim()}</p>
                                        </div>
                                    </div>
                                ) : null}
                                {/* Father's Name */}
                                <div className="flex items-start gap-2">
                                    <Image src="/icons/patientinfo.svg" alt="Father" width={16} height={16} className="mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs text-[#9CA3AF]">Father's/Husband's Name</p>
                                        <p className="text-sm font-medium text-[#262D3B]">
                                            {viewLead.parentName ? `${viewLead.parentPrefix || ""} ${viewLead.parentName}`.trim() : "—"}
                                        </p>
                                    </div>
                                </div>
                                {/* Address */}
                                <div className="flex items-start gap-2">
                                    <Image src="/icons/patientinfo.svg" alt="Address" width={16} height={16} className="mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs text-[#9CA3AF]">Address</p>
                                        <p className="text-sm font-medium text-[#262D3B]">{fullAddress || "—"}</p>
                                    </div>
                                </div>
                                {/* Beneficiary ID */}
                                <div className="flex items-start gap-2">
                                    <Image src="/icons/patientinfo.svg" alt="Beneficiary" width={16} height={16} className="mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs text-[#9CA3AF]">Beneficiary ID</p>
                                        <p className="text-sm font-medium text-[#262D3B]">{viewLead.benificiaryId || "N/A"}</p>
                                    </div>
                                </div>
                                {/* Diagnosis */}
                                <div className="flex items-start gap-2">
                                    <Image src="/icons/DiagnosisDarkIcon.svg" alt="Diagnosis" width={16} height={16} className="mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs text-[#9CA3AF]">Diagnosis</p>
                                        <p className="text-sm font-medium text-[#262D3B]">{viewLead.diagnosis || "N/A"}</p>
                                    </div>
                                </div>
                                {/* Remark */}
                                {viewLead.remark && (
                                    <div className="flex items-start gap-2 col-span-3">
                                        <Image src="/icons/patientinfo.svg" alt="Remark" width={16} height={16} className="mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-xs text-[#9CA3AF]">Remark</p>
                                            <p className="text-sm font-medium text-[#262D3B]">{viewLead.remark}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}
            </Dialog>
            </>
            )}
        </AppShell>
    );
}

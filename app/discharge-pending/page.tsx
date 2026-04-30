"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
  Button,
  ExportButton,
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
} from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import DateFilterDropdown from "@/components/registration/DateFilterDropdown";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { useExport, type ExportColumn } from "@/hooks/useExport";
import { useGetBranchesQuery } from "@/store/api/settingsApi";
import type { SelectOption } from "@/components/ui/FormSelectField";

type DischargePendingRow = {
  id: number;
  patientId: number | null;
  branchId: string;
  uhid: string;
  patientName: string;
  parentName: string;
  patientStatus: string;
  patientType: string;
  dischargedDate: string;
};

type LegacyDischargeApiItem = {
  id: string;
  patient_id: string | null;
  branch_id: string | null;
  uhid: string | null;
  patient_name: string | null;
  gender: string | null;
  age: string | null;
  status: string | null;
  discharge_date: string | null;
  created_at: string | null;
  group_id: string | null;
};

type LegacyDischargeApiResponse = {
  status?: boolean;
  message?: string;
  total_records?: number;
  data?: LegacyDischargeApiItem[];
};

const DISCHARGE_PENDING_EXPORT_COLUMNS: ExportColumn[] = [
  { key: "sr", label: "Sr no." },
  { key: "uhid", label: "UHID" },
  { key: "patientName", label: "Patient Name" },
  { key: "parentName", label: "Parent Name" },
  { key: "patientStatus", label: "Patient Status" },
  { key: "patientType", label: "Patient Type" },
  { key: "dischargedDate", label: "Discharged Date" },
];

export default function DischargePendingPage() {
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
  const [searchType, setSearchType] = useState<"uhid" | "patientName">("uhid");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [rows, setRows] = useState<DischargePendingRow[]>([]);
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
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = parseDdMmYyyy(value);
    if (!parsed) return "";
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, "0");
    const dd = String(parsed.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const mapApiItemToRow = (item: LegacyDischargeApiItem): DischargePendingRow => {
    const dischargeRaw = (item.discharge_date ?? "").trim();
    const fallbackRaw = (item.created_at ?? "").trim();
    const rawDate = dischargeRaw || fallbackRaw;
    const dischargedDate = rawDate ? rawDate.split(" ")[0] : "-";
    const statusLabel = (item.status ?? "").trim();
    const patientIdRaw = item.patient_id?.trim();
    const patientIdParsed =
      patientIdRaw && patientIdRaw !== "" ? Number(patientIdRaw) : NaN;
    return {
      id: Number(item.id) || 0,
      patientId: Number.isFinite(patientIdParsed) ? patientIdParsed : null,
      branchId: item.branch_id ?? "",
      uhid: item.uhid ?? "-",
      patientName: item.patient_name ?? "-",
      parentName: "-",
      patientStatus: statusLabel ? statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1) : "-",
      patientType: "-",
      dischargedDate,
    };
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
      setDebouncedSearch(sanitized.trim());
    }, 500);
  }, [searchType]);

  const handleSearchTypeChange = (value: string) => {
    setSearchType(value as "uhid" | "patientName");
    setSearchTerm("");
    setDebouncedSearch("");
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
    setSearchType("uhid");
    setSearchTerm("");
    setDebouncedSearch("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
    setIsFilterOpen(false);
  };

  const buildApiParams = useCallback(
    (page: number, limit: number) => {
      const params = new URLSearchParams({
        branchId: "1",
        patientId: "",
        contactNumber: "",
        uhid: searchType === "uhid" ? debouncedSearch : "",
        patientName: searchType === "patientName" ? debouncedSearch : "",
        startDate: toApiDate(fromDate),
        endDate: toApiDate(toDate),
        limit: String(limit),
        page: String(page),
      });
      return params;
    },
    [debouncedSearch, searchType, fromDate, toDate]
  );

  const buildApiParamsRef = useRef(buildApiParams);
  useEffect(() => {
    buildApiParamsRef.current = buildApiParams;
  }, [buildApiParams]);

  useEffect(() => {
    const controller = new AbortController();

    const loadRows = async () => {
      setIsLoadingRows(true);
      setLoadError(null);
      try {
        const params = buildApiParamsRef.current(currentPage, itemsPerPage);
        const response = await fetch(`/api/legacy/dischargelist?${params.toString()}`, {
          method: "GET",
          signal: controller.signal,
        });

        const payload = (await response.json()) as LegacyDischargeApiResponse;
        if (!response.ok || payload?.status === false) {
          throw new Error(payload?.message || "Failed to fetch discharge list");
        }

        const mappedRows: DischargePendingRow[] = (payload.data ?? []).map(mapApiItemToRow);
        setRows(mappedRows);
        setTotalRecords(Number(payload.total_records) || 0);
      } catch (error) {
        if ((error as { name?: string })?.name === "AbortError") return;
        setRows([]);
        setTotalRecords(0);
        setLoadError(error instanceof Error ? error.message : "Failed to fetch discharge list");
      } finally {
        setIsLoadingRows(false);
      }
    };

    loadRows();
    return () => controller.abort();
  }, [debouncedSearch, fromDate, toDate, currentPage, itemsPerPage]);

  useEffect(() => {
    if (!branchFilterPersistReady) return;
    if (!isBranchFilterSuperAdmin) return;
    if (isLoadingBranches) return;
    const branchRows = branchesData?.data;
    if (!Array.isArray(branchRows) || branchRows.length === 0) return;
    if (selectedBranchFilter !== "") {
      const valid = branchRows.some((b) => String(b.id) === selectedBranchFilter);
      if (!valid) setSelectedBranchFilter(String(branchRows[0].id));
      return;
    }
    setSelectedBranchFilter(String(branchRows[0].id));
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

  const branchNameForExport = useMemo(() => {
    const opt = branchOptions.find((o) => String(o.value) === String(selectedBranchFilter));
    const label = opt?.label?.trim();
    return label || undefined;
  }, [branchOptions, selectedBranchFilter]);

  const fetchDataForExport = useCallback(async (): Promise<DischargePendingRow[]> => {
    const exportLimit = Math.max(totalRecords || 0, 1000);
    const params = buildApiParamsRef.current(1, exportLimit);
    const response = await fetch(`/api/legacy/dischargelist?${params.toString()}`, {
      method: "GET",
    });
    const payload = (await response.json()) as LegacyDischargeApiResponse;
    if (!response.ok || payload?.status === false) {
      return rows;
    }
    return (payload.data ?? []).map(mapApiItemToRow);
  }, [rows, totalRecords]);

  const { handleExportCSV, isLoadingCSV } = useExport({
    title: "Discharge Pending",
    fileName: "discharge_pending",
    columns: DISCHARGE_PENDING_EXPORT_COLUMNS,
    fetchData: fetchDataForExport,
    logoUrl: "/images/logo.png",
    branchName: branchNameForExport,
  });

  const COLUMN_COUNT = 8;

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <PageHeading title="Discharge Pending" />
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
                    onChange={(value) => handleSearchTypeChange(Array.isArray(value) ? value[0] : value || "uhid")}
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
                <div className="shrink-0">
                  <ExportButton onExportCSV={handleExportCSV} isLoadingCSV={isLoadingCSV} />
                </div>
                <RefreshButton onClick={handleRefresh} />
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="bg-white">
                  <TableHead position="first">Sr no.</TableHead>
                  <TableHead>UHID</TableHead>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Parent Name</TableHead>
                  <TableHead>Patient Status</TableHead>
                  <TableHead>Patient Type</TableHead>
                  <TableHead>Discharged Date</TableHead>
                  <TableHead position="last">Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoadingRows ? (
                  <TableRow>
                    <TableData colSpan={COLUMN_COUNT} className="py-12 text-center text-sm text-[#6B7280]">
                      Loading discharge records...
                    </TableData>
                  </TableRow>
                ) : loadError ? (
                  <TableRow>
                    <TableData colSpan={COLUMN_COUNT} className="py-12 text-center text-sm text-[#DC2626]">
                      {loadError}
                    </TableData>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableData colSpan={COLUMN_COUNT} className="py-12 text-center text-sm text-[#9CA3AF]">
                      No patient records found.
                    </TableData>
                  </TableRow>
                ) : (
                  rows.map((row, index) => (
                    <TableRow key={row.id} className="bg-white transition-colors hover:bg-[#F7FAF7]">
                      <TableData variant="primary">{(currentPage - 1) * itemsPerPage + index + 1}</TableData>
                      <TableData>{row.uhid}</TableData>
                      <TableData>{row.patientName}</TableData>
                      <TableData>{row.parentName}</TableData>
                      <TableData>{row.patientStatus}</TableData>
                      <TableData>{row.patientType}</TableData>
                      <TableData>{row.dischargedDate}</TableData>
                      <TableData>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded p-1 transition-colors hover:bg-[#F2F7F1]"
                            aria-label="View details"
                            onClick={() =>
                              router.push(`/patient/details?id=${row.patientId ?? row.id}`)
                            }
                          >
                            <Image src="/icons/ViewEyeIcon.svg" alt="View" width={18} height={18} />
                          </button>
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
              itemsPerPageOptions={[10, 20, 50]}
            />
          </div>
        </ListBorder>
      </div>
    </AppShell>
  );
}

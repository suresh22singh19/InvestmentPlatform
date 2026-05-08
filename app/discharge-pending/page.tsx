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
  SpinnerLoader,
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
import { usePermission } from "@/hooks/usePermission";
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
  /** Raw `type` from API: "ipd" | "day_care" | "daycare" | etc. */
  rawType: string;
};

type LegacyDischargeApiItem = {
  branch_name?: string | null;
  patient_id: string | null;
  uhid: string | null;
  patient: string | null;
  parent_name: string | null;
  type: string | null;
  patient_status: string | null;
  end_date: string | null;
  branch_id?: string | null;
  id?: string;
  patient_name?: string | null;
  status?: string | null;
  discharge_date?: string | null;
  created_at?: string | null;
  group_id?: string | null;
};

type LegacyDischargeApiResponse = {
  status?: boolean;
  message?: string;
  total_records?: number;
  data?: LegacyDischargeApiItem[];
};

const asDisplay = (value: string | null | undefined): string => {
  const normalized = (value ?? "").trim();
  return normalized === "" ? "N/A" : normalized;
};

const normalizePatientStatus = (value: string | null | undefined): string => {
  const raw = asDisplay(value);
  if (raw === "N/A") return raw;
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

const normalizePatientType = (value: string | null | undefined): string => {
  const raw = asDisplay(value);
  if (raw === "N/A") return raw;
  return raw.toUpperCase();
};

const normalizeDate = (value: string | null | undefined): string => {
  const raw = (value ?? "").trim();
  if (!raw) return "N/A";
  return raw.split(" ")[0] || "N/A";
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
  const dischargePendingPerm = usePermission("Discharge Pending", {
    subModule: "Discharge Pending",
  });
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
  const router = useRouter();
  const resolveSource = (rawType: string): string => {
    if (rawType === "ipd") return "ipd";
    if (rawType === "day_care" || rawType === "daycare") return "daycare";
    return "ipd";
  };

  const handleViewPatient = useCallback(
    (row: DischargePendingRow) => {
      const source = resolveSource(row.rawType);
      router.push(`/patient/details?id=${row.patientId ?? row.id}&source=${source}`);
    },
    [router]
  );
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
  const [isLoadingRows, setIsLoadingRows] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const mapApiItemToRow = (item: LegacyDischargeApiItem): DischargePendingRow => {
    const patientIdRaw = item.patient_id?.trim();
    const patientIdParsed =
      patientIdRaw && patientIdRaw !== "" ? Number(patientIdRaw) : NaN;
    return {
      id: Number(patientIdParsed) || 0,
      patientId: Number.isFinite(patientIdParsed) ? patientIdParsed : null,
      branchId: asDisplay(item.branch_id),
      uhid: asDisplay(item.uhid),
      patientName: asDisplay(item.patient),
      parentName: asDisplay(item.parent_name),
      patientStatus: normalizePatientStatus(item.patient_status),
      patientType: normalizePatientType(item.type),
      dischargedDate: normalizeDate(item.end_date),
      rawType: (item.type ?? "").trim().toLowerCase(),
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
        branchId: String(effectiveBranchId),
        uhid: searchType === "uhid" ? debouncedSearch : "",
        patientName: searchType === "patientName" ? debouncedSearch : "",
        limit: String(limit),
        page: String(page),
      });
      return params;
    },
    [debouncedSearch, searchType, effectiveBranchId]
  );

  const buildApiParamsRef = useRef(buildApiParams);
  useEffect(() => {
    buildApiParamsRef.current = buildApiParams;
  }, [buildApiParams]);

  useEffect(() => {
    const controller = new AbortController();

    const loadRows = async () => {
      if (!dischargePendingPerm.canView) {
        setRows([]);
        setTotalRecords(0);
        setLoadError(null);
        setIsLoadingRows(false);
        return;
      }
      setIsLoadingRows(true);
      setLoadError(null);
      try {
        const params = buildApiParamsRef.current(currentPage, itemsPerPage);
        const response = await fetch(`/api/legacy/branchPendingDischarge?${params.toString()}`, {
          method: "GET",
          signal: controller.signal,
        });

        const payload = (await response.json()) as LegacyDischargeApiResponse;
        if (!response.ok || payload?.status === false) {
          throw new Error(payload?.message || "Failed to fetch discharge pending list");
        }

        const mappedRows: DischargePendingRow[] = (payload.data ?? []).map(mapApiItemToRow);
        setRows(mappedRows);
        setTotalRecords(Number(payload.total_records) || mappedRows.length);
      } catch (error) {
        if ((error as { name?: string })?.name === "AbortError") return;
        setRows([]);
        setTotalRecords(0);
        setLoadError(error instanceof Error ? error.message : "Failed to fetch discharge pending list");
      } finally {
        setIsLoadingRows(false);
      }
    };

    loadRows();
    return () => controller.abort();
  }, [
    debouncedSearch,
    currentPage,
    itemsPerPage,
    dischargePendingPerm.canView,
    effectiveBranchId,
  ]);

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
    const response = await fetch(`/api/legacy/branchPendingDischarge?${params.toString()}`, {
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

  if (!dischargePendingPerm.canView) {
    return (
      <AppShell>
        <div className="rounded-[20px] border border-[#E3EEE1] bg-white px-6 py-10 text-center text-sm text-[#9CA3AF]">
          You don&apos;t have permission to view Discharge Pending.
        </div>
      </AppShell>
    );
  }

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
                {dischargePendingPerm.canDownload && (
                  <div className="shrink-0">
                    <ExportButton onExportCSV={handleExportCSV} isLoadingCSV={isLoadingCSV} />
                  </div>
                )}
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
                      <div className="flex items-center justify-center">
                        <SpinnerLoader />
                      </div>
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
                      <TableData onClick={() => handleViewPatient(row)}>
                        <span className="cursor-pointer font-medium text-[#0B8C00]">{row.uhid}</span>
                      </TableData>
                      <TableData>{row.patientName}</TableData>
                      <TableData>{row.parentName}</TableData>
                      <TableData>{row.patientStatus}</TableData>
                      <TableData>{row.patientType}</TableData>
                      <TableData>{row.dischargedDate}</TableData>
                      <TableData>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded p-1 transition-colors hover:bg-[#F2F7F1] cursor-pointer"
                            aria-label="View details"
                            onClick={() => handleViewPatient(row)}
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

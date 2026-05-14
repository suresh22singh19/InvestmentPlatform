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
  Tooltip,
} from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import DateFilterDropdown from "@/components/registration/DateFilterDropdown";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { useExport, type ExportColumn } from "@/hooks/useExport";
import { usePermission } from "@/hooks/usePermission";
import { useGetLegacyBranchListQuery } from "@/store/api/v3OldHiimsApis";
import type { SelectOption } from "@/components/ui/FormSelectField";
import PatientDischargeForm, {
  type PatientForm2Handle,
  type PatientForm2Props,
} from "@/lib/utils/patinetDischargeForm";

type DischargePendingRow = {
  id: number;
  patientId: number | null;
  branchId: string;
  uhid: string;
  dcId: string;
  patientName: string;
  parentName: string;
  contactNumber: string;
  dischargedBy: string;
  dischargedRemark: string;
  dischargedDate: string;
  patientType: string;
  rawPatientType: string;
  gender: string;
  age: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
};

type LegacyDischargeApiItem = {
  id: string;
  patient_id: string | null;
  branch_id: string | null;
  uhid: string | null;
  patient_name: string | null;
  parent_name?: string | null;
  father_name?: string | null;
  guardian_name?: string | null;
  contact_number?: string | null;
  mobile?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pin_code?: string | null;
  blood_group?: string | null;
  gender: string | null;
  age: string | null;
  status: string | null;
  discharge_date: string | null;
  discharge_remark?: string | null;
  discharged_by?: string | null;
  created_at: string | null;
  group_id: string | null;
  patient_type?: string | null;
};

type LegacyDischargeApiResponse = {
  status?: boolean;
  message?: string;
  total_records?: number;
  data?: LegacyDischargeApiItem[] | LegacyDischargeApiItem | null;
};

const maskPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 4) return phone;
  return "XXXXXX" + cleaned.slice(-4);
};

const DISCHARGE_PENDING_EXPORT_COLUMNS: ExportColumn[] = [
  { key: "sr", label: "Sr no." },
  { key: "uhid", label: "UHID" },
  { key: "dcId", label: "DC ID" },
  { key: "patientName", label: "Patient" },
  { key: "parentName", label: "Parent Name" },
  { key: "contactNumber", label: "Contact Number" },
  { key: "dischargedBy", label: "Discharged by" },
  { key: "dischargedRemark", label: "Discharged Remark" },
  { key: "dischargedDate", label: "Discharged Date" },
  { key: "patientType", label: "Type" },
];

export default function DischargePendingPage() {
  const patientPermission = usePermission("Patient");
  const dischargePermission = usePermission("Patient", { subModule: "Discharge" });
  /** Same pattern as `patient/ipd`: parent Patient **or** route submodule may grant access */
  const canView = patientPermission.canView || dischargePermission.canView;
  const canDownload = patientPermission.canDownload || dischargePermission.canDownload;

  const {
    selectedBranchFilter,
    setSelectedBranchFilter,
    branchFilterOptions,
    isBranchFilterDisabled,
    isSuperAdmin: isBranchFilterSuperAdmin,
    filterBranchId,
  } = useBranchFilter();
  const { data: legacyBranchData, isLoading: isLoadingLegacyBranches } = useGetLegacyBranchListQuery(
    undefined,
    { skip: !isBranchFilterSuperAdmin }
  );
  const branchOptions: SelectOption[] = useMemo(() => {
    if (!isBranchFilterSuperAdmin) return branchFilterOptions;
    const rows = legacyBranchData?.data ?? [];
    return [
      { value: "", label: "All Branches" },
      ...rows.map((b) => {
        const name = b.name?.trim() || `Branch ${b.id}`;
        const type = b.type?.trim();
        const label = type
          ? `${name} (${type.charAt(0).toUpperCase()}${type.slice(1)})`
          : name;
        return { value: b.id ?? "", label };
      }),
    ];
  }, [isBranchFilterSuperAdmin, branchFilterOptions, legacyBranchData]);
  const effectiveBranchId = filterBranchId ?? 0;
  const router = useRouter();
  const handleViewPatient = useCallback(
    (row: DischargePendingRow) => {
      const normalizedType = row.rawPatientType.toLowerCase();
      const source = normalizedType === "ipd" ? "ipd" : "daycare";
      const patientId = row.patientId ?? row.id;
      router.push(`/patient/details?id=${patientId}&source=${source}`);
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
  const [downloadingRowId, setDownloadingRowId] = useState<number | null>(null);
  const [downloadFormPayload, setDownloadFormPayload] = useState<PatientForm2Props | null>(null);
  const downloadFormRef = useRef<PatientForm2Handle | null>(null);
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
    const dischargedDate = rawDate ? rawDate.split(" ")[0] : "N/A";
    const patientIdRaw = item.patient_id?.trim();
    const patientIdParsed =
      patientIdRaw && patientIdRaw !== "" ? Number(patientIdRaw) : NaN;
    const parentName =
      (item.parent_name ?? "").trim() ||
      (item.father_name ?? "").trim() ||
      (item.guardian_name ?? "").trim() ||
      "N/A";
    const contactNumber =
      (item.contact_number ?? "").trim() ||
      (item.mobile ?? "").trim() ||
      (item.phone ?? "").trim() ||
      "N/A";
    const dischargedBy = (item.discharged_by ?? "").trim() || "N/A";
    const dischargedRemark = (item.discharge_remark ?? "").trim() || "N/A";
    const rawPatientType = (item.patient_type ?? "").trim().toLowerCase();
    const patientType =
      rawPatientType === "day_care"
        ? "Daycare"
        : rawPatientType === "ipd"
          ? "IPD"
          : rawPatientType
            ? rawPatientType.replace(/_/g, " ")
            : "N/A";
    return {
      id: Number(item.id) || 0,
      patientId: Number.isFinite(patientIdParsed) ? patientIdParsed : null,
      branchId: (item.branch_id ?? "").trim() || "N/A",
      uhid: (item.uhid ?? "").trim() || "N/A",
      dcId: String(item.id ?? "").trim() || "N/A",
      patientName: (item.patient_name ?? "").trim() || "N/A",
      parentName,
      contactNumber,
      dischargedBy,
      dischargedRemark,
      dischargedDate: dischargedDate || "N/A",
      patientType,
      rawPatientType,
      gender: (item.gender ?? "").trim() || "N/A",
      age: (item.age ?? "").trim() || "N/A",
      address: (item.address ?? "").trim() || "N/A",
      city: (item.city ?? "").trim() || "N/A",
      state: (item.state ?? "").trim() || "N/A",
      pinCode: (item.pin_code ?? "").trim() || "N/A",
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
    if (isBranchFilterSuperAdmin) setSelectedBranchFilter("");
    setSearchType("uhid");
    setSearchTerm("");
    setDebouncedSearch("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
    setIsFilterOpen(false);
  };

  const buildDownloadPayload = useCallback((row: DischargePendingRow): PatientForm2Props => {
    return {
      patient: {
        patient: row.patientName?.trim() || "N/A",
        parent_name: row.parentName?.trim() || "N/A",
        bp: "N/A",
        sl: "N/A",
        weight: "N/A",
        height: "N/A",
        uhid: row.uhid?.trim() || "N/A",
        opdId: row.dcId?.trim() || "N/A",
        age: row.age?.trim() || "N/A",
        gender: row.gender?.trim() || "N/A",
        contactNumber: row.contactNumber?.trim() && row.contactNumber !== "N/A" ? row.contactNumber.trim() : "",
        address: row.address?.trim() || "N/A",
        city: row.city?.trim() || "N/A",
        state: row.state?.trim() || "N/A",
        pinCode: row.pinCode?.trim() || "N/A",
      },
      doctor: {
        name: row.dischargedBy?.trim() || "N/A",
        education: [],
        reg_no: "",
      },
      appointment: {
        created_at: row.dischargedDate?.trim() || new Date().toISOString(),
      },
      diagnosis: row.dischargedRemark?.trim() && row.dischargedRemark !== "N/A" ? row.dischargedRemark : "",
    };
  }, []);

  const handleDownloadPatientForm = useCallback(
    async (row: DischargePendingRow) => {
      if (downloadingRowId !== null) return;
      try {
        setDownloadingRowId(row.id);
        setDownloadFormPayload(buildDownloadPayload(row));
        await new Promise((resolve) => setTimeout(resolve, 0));
        await downloadFormRef.current?.downloadPdf();
      } finally {
        setDownloadingRowId(null);
      }
    },
    [buildDownloadPayload, downloadingRowId]
  );

  const buildApiParams = useCallback(
    (page: number, limit: number) => {
      const params = new URLSearchParams({
        branchId: String(effectiveBranchId),
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
    [effectiveBranchId, debouncedSearch, searchType, fromDate, toDate]
  );

  const buildApiParamsRef = useRef(buildApiParams);
  useEffect(() => {
    buildApiParamsRef.current = buildApiParams;
  }, [buildApiParams]);

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
        const params = buildApiParamsRef.current(currentPage, itemsPerPage);
        const response = await fetch(`/api/legacy/dischargelist?${params.toString()}`, {
          method: "GET",
          signal: controller.signal,
        });

        const payload = (await response.json()) as LegacyDischargeApiResponse;
        if (!response.ok || payload?.status === false) {
          throw new Error(payload?.message || "Failed to fetch discharge list");
        }

        const rawData = Array.isArray(payload.data)
          ? payload.data
          : payload.data
            ? [payload.data]
            : [];
        const mappedRows: DischargePendingRow[] = rawData.map(mapApiItemToRow);
        setRows(mappedRows);
        setTotalRecords(Number(payload.total_records) || mappedRows.length);
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
  }, [effectiveBranchId, debouncedSearch, fromDate, toDate, currentPage, itemsPerPage, canView]);

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
    const rawData = Array.isArray(payload.data)
      ? payload.data
      : payload.data
        ? [payload.data]
        : [];
    return rawData.map(mapApiItemToRow);
  }, [rows, totalRecords]);

  const { handleExportCSV, isLoadingCSV } = useExport({
    title: "Discharge Pending",
    fileName: "discharge_pending",
    columns: DISCHARGE_PENDING_EXPORT_COLUMNS,
    fetchData: fetchDataForExport,
    logoUrl: "/images/logo.png",
    branchName: branchNameForExport,
  });

  const COLUMN_COUNT = 11;

  if (!canView) {
    return (
      <AppShell>
        <div className="rounded-[20px] border border-[#E3EEE1] bg-white px-6 py-10 text-center text-sm text-[#9CA3AF]">
          You don&apos;t have permission to view Discharge Patient.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <PageHeading title="Discharge Patient" />
        </div>

        <ListBorder as="section" className="px-4 py-4">
          <div className="w-full rounded-[16px] border border-[#E3EEE1] bg-white px-5 pb-5 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
            <div className="mb-6 flex flex-wrap items-center justify-end gap-3">
              
              <div className="flex items-center gap-3">
              <div className="w-[260px] max-w-full">
                <FormSelectField
                  label=""
                  hideLabel
                  options={branchOptions}
                  value={selectedBranchFilter}
                  onChange={(value) => {
                    setSelectedBranchFilter(Array.isArray(value) ? value[0] : value || "");
                    setCurrentPage(1);
                  }}
                  placeholder={isLoadingLegacyBranches ? "Loading branches..." : "Select Branch"}
                  mode="single"
                  background="normal"
                  width={260}
                  disabled={isBranchFilterDisabled || isLoadingLegacyBranches}
                />
              </div>
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
                {canDownload && (
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
                  <TableHead>DC ID</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Parent Name</TableHead>
                  <TableHead>Contact Number</TableHead>
                  <TableHead>Discharged by</TableHead>
                  <TableHead>Discharged Remark</TableHead>
                  <TableHead>Discharged Date</TableHead>
                  <TableHead>Type</TableHead>
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
                        <span className="font-medium text-[#0B8C00]">{row.uhid}</span>
                      </TableData>
                      <TableData>{row.dcId}</TableData>
                      <TableData>{row.patientName}</TableData>
                      <TableData>{row.parentName}</TableData>
                      <TableData>
                        {row.contactNumber === "N/A" ? "N/A" : maskPhone(row.contactNumber)}
                      </TableData>
                      <TableData>{row.dischargedBy}</TableData>
                      <TableData>{row.dischargedRemark}</TableData>
                      <TableData>{row.dischargedDate}</TableData>
                      <TableData>{row.patientType}</TableData>
                      <TableData>
                        <div className="flex items-center gap-2">
                          <Tooltip content="View" position="top" delay={0}>
                            <button
                              type="button"
                              className="rounded p-1 transition-colors hover:bg-[#F2F7F1] cursor-pointer"
                              aria-label="View details"
                              onClick={() => handleViewPatient(row)}
                            >
                              <Image src="/icons/ViewEyeIcon.svg" alt="View" width={18} height={18} />
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
      {downloadFormPayload ? (
        <div className="pointer-events-none fixed -left-[10000px] top-0 opacity-0">
          <PatientDischargeForm
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
    </AppShell>
  );
}

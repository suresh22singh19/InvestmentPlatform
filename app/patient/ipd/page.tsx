"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { usePermission } from "@/hooks/usePermission";
import { useGetBranchesQuery } from "@/store/api/settingsApi";
import type { SelectOption } from "@/components/ui/FormSelectField";

type IpdRow = {
  id: number;
  branchId: number;
  uhid: string;
  ipdId: string;
  name: string;
  doctorId: string;
  doctor: string;
  room: string;
  bed: string;
  type: string;
  sex: string;
  age: string;
  bloodGroup: string;
  admitDate: string;
  isVip: boolean;
};

type LegacyIpdApiItem = {
  id: string;
  uhid: string | null;
  branch_id: string | null;
  patient_id: string | null;
  doctor_id: string | null;
  doctor_name: string | null;
  patient_opd_id: string | null;
  patient_name: string | null;
  patient_panel: string | null;
  type: string | null;
  gender: string | null;
  age: string | null;
  blood_group: string | null;
  room_type: string | null;
  room_number: string | null;
  bed_number: string | null;
  vip: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type LegacyIpdApiResponse = {
  status?: boolean;
  message?: string;
  total_records?: number;
  data?: LegacyIpdApiItem[];
};

const DOCTOR_OPTIONS = [
  { value: "all", label: "Select Doctor" },
  // { value: "122", label: "Doctor ID 122" },
  // { value: "135", label: "Doctor ID 135" },
  // { value: "191", label: "Doctor ID 191" },
  // { value: "121", label: "Doctor ID 121" },
  // { value: "916", label: "Doctor ID 916" },
];

export default function IpdPage() {
  const router = useRouter();
  const patientPermission = usePermission("Patient");
  const opdPermission = usePermission("Patient", { subModule: "Opd" });
  const canView = patientPermission.canView || opdPermission.canView;

  const handleView = useCallback(
    (row: IpdRow) => {
      if (!canView || !row.id) return;
      router.push(`/patient/details?id=${row.id}`);
    },
    [canView, router]
  );

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
  const [selectedDoctor, setSelectedDoctor] = useState("all");
  const [searchType, setSearchType] = useState<"uhid" | "contactNumber" | "patientName">("uhid");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [rows, setRows] = useState<IpdRow[]>([]);
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

  const SEARCH_TYPE_OPTIONS = [
    { value: "uhid", label: "UHID", placeholder: "Search by UHID" },
    { value: "contactNumber", label: "Contact Number", placeholder: "Search by Contact No." },
    { value: "patientName", label: "Patient Name", placeholder: "Search by Patient Name" },
  ] as const;

  const currentSearchConfig = SEARCH_TYPE_OPTIONS.find((o) => o.value === searchType) ?? SEARCH_TYPE_OPTIONS[0];

  const handleSearchChange = useCallback((value: string) => {
    let sanitized = value;
    if (searchType === "contactNumber") {
      sanitized = value.replace(/\D/g, "").slice(0, 10);
    } else if (searchType === "patientName") {
      sanitized = value.replace(/[^a-zA-Z\s]/g, "");
    }
    setSearchTerm(sanitized);
    setCurrentPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(sanitized.trim());
    }, 500);
  }, [searchType]);

  const handleSearchTypeChange = (value: string) => {
    setSearchType(value as "uhid" | "contactNumber" | "patientName");
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
    setSelectedDoctor("all");
    setSearchType("uhid");
    setSearchTerm("");
    setDebouncedSearch("");
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
          uhid: searchType === "uhid" ? debouncedSearch : "",
          doctorId: selectedDoctor === "all" ? "" : selectedDoctor,
          contactNumber: searchType === "contactNumber" ? debouncedSearch : "",
          patientName: searchType === "patientName" ? debouncedSearch : "",
          startDate: toApiDate(fromDate),
          endDate: toApiDate(toDate),
          limit: String(itemsPerPage),
          page: String(currentPage),
        });

        const response = await fetch(`/api/legacy/ipdlist?${params.toString()}`, {
          method: "GET",
          signal: controller.signal,
        });

        const payload = (await response.json()) as LegacyIpdApiResponse;
        if (!response.ok || payload?.status === false) {
          throw new Error(payload?.message || "Failed to fetch IPD list");
        }

        const mappedRows: IpdRow[] = (payload.data ?? []).map((item) => {
          const roomType = item.room_type?.trim();
          const roomNum = item.room_number?.trim();
          let roomDisplay = "-";
          if (roomType && roomNum) roomDisplay = `${roomType} (${roomNum})`;
          else if (roomType) roomDisplay = roomType;
          else if (roomNum) roomDisplay = roomNum;

          const doctorDisplay = item.doctor_name?.trim()
            ? item.doctor_name.trim()
            : item.doctor_id
              ? `Doctor ${item.doctor_id}`
              : "-";

          return {
            id: Number(item.id) || 0,
            branchId: Number(item.branch_id) || 0,
            uhid: item.uhid ?? "-",
            ipdId: item.id ?? "-",
            name: item.patient_name ?? "-",
            doctorId: item.doctor_id ?? "",
            doctor: doctorDisplay,
            room: roomDisplay,
            bed: item.bed_number?.trim() ? item.bed_number : "-",
            type: item.patient_panel ?? item.type ?? "-",
            sex: item.gender ?? "-",
            age: item.age ?? "-",
            bloodGroup: item.blood_group?.trim() ? item.blood_group : "-",
            admitDate: (item.created_at ?? "").split(" ")[0] || "-",
            isVip: (item.vip ?? "").toLowerCase() === "yes",
          };
        });

        setRows(mappedRows);
        setTotalRecords(Number(payload.total_records) || 0);
      } catch (error) {
        if ((error as { name?: string })?.name === "AbortError") return;
        setRows([]);
        setTotalRecords(0);
        setLoadError(error instanceof Error ? error.message : "Failed to fetch IPD list");
      } finally {
        setIsLoadingRows(false);
      }
    };

    loadRows();
    return () => controller.abort();
  }, [currentPage, debouncedSearch, fromDate, itemsPerPage, selectedDoctor, toDate]);

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

  const COLUMN_COUNT = 14;

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <PageHeading title="IPD Patient" />
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
                <div className="w-[260px] max-w-full">
                  <FormSelectField
                    label=""
                    hideLabel
                    options={[
                      { value: "uhid", label: "UHID" },
                      { value: "contactNumber", label: "Contact Number" },
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
                <RefreshButton onClick={handleRefresh} />
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="bg-white">
                  <TableHead position="first">Sr no.</TableHead>
                  <TableHead>UHID</TableHead>
                  <TableHead>IPD ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Bed</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Blood Group</TableHead>
                  <TableHead>Consent</TableHead>
                  <TableHead>Admit Date</TableHead>
                  <TableHead position="last">Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoadingRows ? (
                  <TableRow>
                    <TableData colSpan={COLUMN_COUNT} className="py-12 text-center text-sm text-[#6B7280]">
                      Loading IPD patients...
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
                      <TableData onClick={canView ? () => handleView(row) : undefined}>
                        <span className="font-medium text-[#0B8C00]">{row.uhid}</span>
                      </TableData>
                      <TableData>{row.ipdId}</TableData>
                      <TableData>{row.name}</TableData>
                      <TableData>{row.doctor}</TableData>
                      <TableData>{row.room}</TableData>
                      <TableData>{row.bed}</TableData>
                      <TableData>{row.type}</TableData>
                      <TableData>{row.sex}</TableData>
                      <TableData>{row.age}</TableData>
                      <TableData>{row.bloodGroup}</TableData>
                      <TableData>-</TableData>
                      <TableData>{row.admitDate}</TableData>
                      <TableData>
                        <div className="flex items-center gap-2">
                          <Tooltip content={row.isVip ? "VIP Patient" : "Normal Patient"} position="top" delay={0}>
                            <button
                              type="button"
                              className="rounded p-1 transition-colors hover:bg-[#F2F7F1]"
                              aria-label="Patient VIP Status"
                            >
                              <Image
                                src={row.isVip ? "/icons/vipPatientIcon.svg" : "/icons/StarIcon.svg"}
                                alt="Patient VIP Status"
                                width={20}
                                height={20}
                              />
                            </button>
                          </Tooltip>
                          <Tooltip content="View" position="top" delay={0}>
                            <button
                              type="button"
                              className="rounded p-1 transition-colors hover:bg-[#F2F7F1] cursor-pointer"
                              aria-label="View details"
                              onClick={() => handleView(row)}
                            >
                              <Image src="/icons/ViewEyeIcon.svg" alt="View" width={18} height={18} />
                            </button>
                          </Tooltip>
                          <Tooltip content="Patient Form" position="top" delay={0}>
                            <button
                              type="button"
                              className="rounded p-1 transition-colors hover:bg-[#F2F7F1] cursor-pointer"
                              aria-label="Download"
                            >
                              <Image src="/icons/Download.svg" alt="Download" width={18} height={18} />
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
              itemsPerPageOptions={[10, 20, 50]}
            />
          </div>
        </ListBorder>
      </div>
    </AppShell>
  );
}

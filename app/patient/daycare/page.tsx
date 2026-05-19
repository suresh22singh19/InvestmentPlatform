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
import { useGetLegacyDoctorsByBranchQuery, useGetLegacyBranchListQuery } from "@/store/api/v3OldHiimsApis";
import type { SelectOption } from "@/components/ui/FormSelectField";
import PatientDaycareForm, {
  type PatientForm2Handle,
  type PatientForm2Props,
} from "@/lib/utils/patientDaycareForm";

type DayCareRow = {
  id: number;
  branchId: number;
  uhid: string;
  regId: string;
  name: string;
  doctorId: string;
  doctor: string;
  address: string;
  contactNumber: string;
  sex: string;
  age: string;
  bloodGroup: string;
  type: string;
  admitDate: string;
};

type LegacyDayCareApiItem = {
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
  address: string | null;
  contact_number: string | null;
  vip: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type LegacyDayCareApiResponse = {
  status?: boolean;
  message?: string;
  total_records?: number;
  data?: LegacyDayCareApiItem[];
};

const maskPhoneNumber = (phoneNumber: string | null | undefined): string => {
  if (!phoneNumber) return "N/A";
  const cleaned = phoneNumber.replace(/\D/g, "");
  if (cleaned.length < 4) return phoneNumber;
  const last4 = cleaned.slice(-4);
  return "XXXXXX" + last4;
};

export default function DayCarePage() {
  const {
    selectedBranchFilter,
    setSelectedBranchFilter,
    branchFilterOptions,
    isBranchFilterDisabled,
    isSuperAdmin: isBranchFilterSuperAdmin,
    branchFilterPersistReady,
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
        const label = type ? `${name} (${type.charAt(0).toUpperCase()}${type.slice(1)})` : name;
        return { value: b.id ?? "", label };
      }),
    ];
  }, [isBranchFilterSuperAdmin, branchFilterOptions, legacyBranchData]);
  const effectiveBranchId = filterBranchId ?? 0;
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
    (row: DayCareRow) => {
      router.push(`/patient/details?id=${row.id}&source=daycare`);
    },
    [router]
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
  const [rows, setRows] = useState<DayCareRow[]>([]);
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

  const buildDownloadPayload = useCallback((row: DayCareRow): PatientForm2Props => {
    return {
      patient: {
        patient: row.name?.trim() || "N/A",
        parent_name: "N/A",
        bp: "N/A",
        sl: "N/A",
        weight: "N/A",
        height: "N/A",
        uhid: row.uhid?.trim() || "N/A",
        opdId: row.regId?.trim() || "N/A",
        age: row.age?.trim() || "N/A",
        gender: row.sex?.trim() || "N/A",
        contactNumber: row.contactNumber?.trim() && row.contactNumber !== "-" ? row.contactNumber.trim() : "",
        address: row.address?.trim() && row.address !== "-" ? row.address.trim() : "N/A",
        city: "N/A",
        state: "N/A",
        pinCode: "N/A",
        bloodGroup: row.bloodGroup?.trim() && row.bloodGroup !== "-" ? row.bloodGroup.trim() : "N/A",
      },
      doctor: {
        name: row.doctor?.trim() || "N/A",
        education: [],
        reg_no: "",
      },
      appointment: {
        created_at: row.admitDate?.trim() || new Date().toISOString(),
      },
      diagnosis: "",
    };
  }, []);

  const handleDownloadPatientForm = useCallback(
    async (row: DayCareRow) => {
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

  useEffect(() => {
    const controller = new AbortController();

    const loadRows = async () => {
      setIsLoadingRows(true);
      setLoadError(null);
      try {
        const params = new URLSearchParams({
          branchId: String(effectiveBranchId),
          uhid: searchType === "uhid" ? debouncedSearch : "",
          doctorId: selectedDoctor === "all" ? "" : selectedDoctor,
          contactNumber: searchType === "contactNumber" ? debouncedSearch : "",
          patientName: searchType === "patientName" ? debouncedSearch : "",
          startDate: toApiDate(fromDate),
          endDate: toApiDate(toDate),
          limit: String(itemsPerPage),
          page: String(currentPage),
        });

        const response = await fetch(`/api/legacy/daycarelist?${params.toString()}`, {
          method: "GET",
          signal: controller.signal,
        });

        const payload = (await response.json()) as LegacyDayCareApiResponse;
        if (!response.ok || payload?.status === false) {
          throw new Error(payload?.message || "Failed to fetch Day Care list");
        }

        const mappedRows: DayCareRow[] = (payload.data ?? []).map((item) => {
          const doctorDisplay = item.doctor_name?.trim()
            ? item.doctor_name.trim()
            : item.doctor_id
              ? `Doctor ${item.doctor_id}`
              : "-";
          return {
            id: Number(item.id) || 0,
            branchId: Number(item.branch_id) || 0,
            uhid: item.uhid ?? "-",
            regId: item.id ?? "-",
            name: item.patient_name ?? "-",
            doctorId: item.doctor_id ?? "",
            doctor: doctorDisplay,
            address: item.address?.trim() ? item.address.trim() : "-",
            contactNumber: item.contact_number?.trim() ? item.contact_number.trim() : "-",
            sex: item.gender ?? "-",
            age: item.age ?? "-",
            bloodGroup: item.blood_group?.trim() ? item.blood_group : "-",
            type: item.patient_panel ?? item.type ?? "-",
            admitDate: (item.created_at ?? "").split(" ")[0] || "-",
          };
        });

        if (!controller.signal.aborted) {
          setRows(mappedRows);
          setTotalRecords(Number(payload.total_records) || 0);
        }
      } catch (error) {
        if (controller.signal.aborted || (error as { name?: string })?.name === "AbortError") return;
        setRows([]);
        setTotalRecords(0);
        setLoadError(error instanceof Error ? error.message : "Failed to fetch Day Care list");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingRows(false);
        }
      }
    };

    loadRows();
    return () => controller.abort();
  }, [currentPage, debouncedSearch, effectiveBranchId, fromDate, itemsPerPage, selectedDoctor, toDate, searchType]);

  useEffect(() => {
    setSelectedDoctor("all");
  }, [effectiveBranchId]);


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

  const COLUMN_COUNT = 13;

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <PageHeading title="Daycare Patient" />
        </div>

        <ListBorder as="section" className="px-4 py-4">
          <div className="w-full rounded-[16px] border border-[#E3EEE1] bg-white px-5 pb-5 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
            <div className="mb-6 flex flex-wrap items-center justify-end gap-3">
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
                  <TableHead>REG ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Blood Group</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Admit Date</TableHead>
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
                      <TableData>{row.regId}</TableData>
                      <TableData>{row.name}</TableData>
                      <TableData>{row.doctor}</TableData>
                      <TableData className="max-w-[min(28rem,40vw)]">
                        <span className="block whitespace-normal break-words" title={row.address !== "-" ? row.address : undefined}>
                          {row.address}
                        </span>
                      </TableData>
                      <TableData className="whitespace-nowrap">
                        {row.contactNumber === "-" ? "-" : maskPhoneNumber(row.contactNumber)}
                      </TableData>
                      <TableData>{row.sex}</TableData>
                      <TableData>{row.age}</TableData>
                      <TableData>{row.bloodGroup}</TableData>
                      <TableData>{row.type}</TableData>
                      <TableData>{row.admitDate}</TableData>
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
                          <Tooltip content="Patient Form" position="top" delay={0}>
                            <button
                              type="button"
                              className="rounded p-1 transition-colors hover:bg-[#F2F7F1] cursor-pointer"
                              aria-label="Download"
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
          <PatientDaycareForm
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

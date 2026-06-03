"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { WardCapacityOverview } from "./WardCapacityOverview";
import {
  Badge,
  Button,
  Pagination,
  SpinnerLoader,
  StatCard,
  Table,
  TableBody,
  TableData,
  TableHead,
  TableHeader,
  TableRow,
  TableSearchInput,
} from "@/components/ui";
import { useDebounce } from "@/hooks/useDebounce";
import { useAppSelector } from "@/store/hooks";
import { selectSelectedBranch, selectUserBranchId } from "@/store/slices/authSlice";
import { resolveReceptionBranchId } from "@/lib/ipd-reception/resolveReceptionBranchId";
import {
  useGetIpdAwaitingPatientsQuery,
  useGetIpdReceptionDashboardStatsQuery,
  useGetIpdRoomCapacityOverviewQuery,
  useGetIpdRoomTypeCapacityOverviewQuery,
} from "@/store/api/ipdReceptionApi";
import {
  mapIpdDashboardStatsToView,
  formatIpdDashboardStatValue,
  getIpdDashboardStatSubtext,
} from "@/lib/ipd-reception/mapIpdDashboardStats";
import { RECEPTION_STAT_CARDS } from "@/lib/ipd-reception/constants";
import {
  getRtkErrorMessage,
  mapAwaitingPatientsToTableRows,
} from "@/lib/ipd-reception/mapIpdAwaitingPatients";
import {
  extractCapacityOverviewPayload,
  mapCapacityCategories,
} from "@/lib/ipd-reception/mapIpdWardCapacityOverview";
import type { IpdAwaitingPatientTableRow } from "@/lib/ipd-reception/types";

const RECEPTION_DASHBOARD_QUERY_OPTIONS = {
  refetchOnMountOrArgChange: true as const,
};

const AWAITING_TABLE_COLUMN_COUNT = 7;

type SortOrder = "asc" | "desc";

type AwaitingTableFilters = {
  searchTerm: string;
  currentPage: number;
  itemsPerPage: number;
  sortField: string;
  sortOrder: SortOrder;
};

function getAdmissionTypeVariant(
  type: string | null | undefined
): "success" | "neutral" | "info" {
  const normalized = (type ?? "").toLowerCase();
  if (normalized.includes("tpa") || normalized.includes("health")) return "success";
  if (normalized.includes("panel") || normalized.includes("govt")) return "info";
  return "neutral";
}

function renderPatientActions(patient: IpdAwaitingPatientTableRow) {
  const patientHref = `/ipd-reception/patient/${patient.patientId}`;
  const nonCompliantHref = `${patientHref}/file?mode=non-compliant`;

  console.log("Patient Compliance Status:", patient?.patientComplianceStatus);

  // if (isPatientCompliant(patient.patientComplianceStatus)) {
  if (patient.isPatientAdmitted?.toLowerCase() === "yes" ) {
    return (
      <div className="flex flex-wrap items-center gap-2">
       
        <Link href={patientHref}>
          <Button variant="primary" size="xsmall" className="!min-w-0 whitespace-nowrap">
            View Patient
          </Button>
        </Link>
         
      { 
        patient?.patientComplianceStatus?.toLowerCase() === "non_compliant" && 
        <Link href={nonCompliantHref}>
          <Button
            variant="outline"
            size="xsmall"
            className="!min-w-0 whitespace-nowrap !border-[#EF4444] !text-[#DC2626] hover:!bg-[#FEF2F2]"
          >
            Non Compliant
          </Button>
        </Link>
      }
      
      </div>
    );
  }

  return (
    <Link href={`${patientHref}/file`}>
      <Button variant="outline" size="xsmall" className="!min-w-0 whitespace-nowrap">
        Open File
      </Button>
    </Link>
  );
}

export default function ReceptionDashboardPage() {
  const [filters, setFilters] = useState<AwaitingTableFilters>({
    searchTerm: "",
    currentPage: 1,
    itemsPerPage: 10,
    sortField: "patientName",
    sortOrder: "asc",
  });

  const selectedBranch = useAppSelector(selectSelectedBranch);
  const userBranchId = useAppSelector(selectUserBranchId);
  const branchId = useMemo(
    () =>
      resolveReceptionBranchId({
        selectedBranchId: selectedBranch?.id,
        userBranchId,
      }),
    [selectedBranch?.id, userBranchId]
  );

  const debouncedSearch = useDebounce(filters.searchTerm, 500);

  useEffect(() => {
    setFilters((prev) => ({ ...prev, currentPage: 1 }));
  }, [debouncedSearch, branchId, filters.itemsPerPage, filters.sortField, filters.sortOrder]);

  const { data: statsResponse, isLoading: isStatsLoading } =
    useGetIpdReceptionDashboardStatsQuery({ branchId }, RECEPTION_DASHBOARD_QUERY_OPTIONS);

  const stats = useMemo(
    () => mapIpdDashboardStatsToView(statsResponse?.data),
    [statsResponse?.data]
  );

  const {
    data: wardCapacityResponse,
    isLoading: isWardCapacityLoading,
    isError: isWardCapacityError,
    error: wardCapacityError,
  } = useGetIpdRoomCapacityOverviewQuery({ branchId }, RECEPTION_DASHBOARD_QUERY_OPTIONS);

  const {
    data: roomTypeResponse,
    isLoading: isRoomTypesLoading,
    isError: isRoomTypesError,
    error: roomTypesError,
  } = useGetIpdRoomTypeCapacityOverviewQuery({ branchId }, RECEPTION_DASHBOARD_QUERY_OPTIONS);

  const wardCapacity = useMemo(
    () => mapCapacityCategories(extractCapacityOverviewPayload(wardCapacityResponse)),
    [wardCapacityResponse]
  );

  const roomTypes = useMemo(
    () => mapCapacityCategories(extractCapacityOverviewPayload(roomTypeResponse)),
    [roomTypeResponse]
  );

  const awaitingQueryArgs = useMemo(
    () => ({
      search: debouncedSearch.trim() || undefined,
      page: filters.currentPage,
      limit: filters.itemsPerPage,
      sort: filters.sortField || undefined,
      order: filters.sortField ? filters.sortOrder : undefined,
      branchId,
      patientType: "ipd" as const,
    }),
    [
      debouncedSearch,
      filters.currentPage,
      filters.itemsPerPage,
      filters.sortField,
      filters.sortOrder,
      branchId,
    ]
  );

  const {
    data: awaitingResponse,
    isLoading: isAwaitingLoading,
    isError: isAwaitingError,
    error: awaitingError,
  } = useGetIpdAwaitingPatientsQuery(awaitingQueryArgs, RECEPTION_DASHBOARD_QUERY_OPTIONS);

  const awaitingPatients = useMemo(
    () => mapAwaitingPatientsToTableRows(awaitingResponse?.data ?? []),
    [awaitingResponse?.data]
  );

  const totalAwaitingPatients = awaitingResponse?.total ?? 0;

  const getSortDirection = useCallback(
    (field: string): "asc" | "desc" | null => {
      if (filters.sortField === field) {
        return filters.sortOrder;
      }
      return null;
    },
    [filters.sortField, filters.sortOrder]
  );

  const handleSort = useCallback((field: string) => {
    setFilters((prev) => ({
      ...prev,
      sortField: field,
      sortOrder: prev.sortField === field && prev.sortOrder === "asc" ? "desc" : "asc",
      currentPage: 1,
    }));
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, currentPage: page }));
  }, []);

  const handleItemsPerPageChange = useCallback((items: number) => {
    setFilters((prev) => ({ ...prev, itemsPerPage: items, currentPage: 1 }));
  }, []);

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <PageHeading title="IPD Reception Dashboard" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {RECEPTION_STAT_CARDS.map((card) => {
            const rawValue = stats?.[card.dataKey];
            const subtext = getIpdDashboardStatSubtext(card.subtextKey, stats);

            return (
              <StatCard
                key={card.id}
                title={card.title}
                value={formatIpdDashboardStatValue(rawValue, card.padValue)}
                iconSrc={card.iconSrc}
                subtext={subtext.text}
                subtextTone={subtext.tone}
                subtextIcon={card.subtextIcon}
                isLoading={isStatsLoading}
              />
            );
          })}
        </div>

        <section className="w-full shrink-0">
          <div className="w-full rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-medium leading-[120%] text-[#262D3B]">
                Admissions
              </h2>

              <div className="w-full sm:w-[300px] sm:flex-shrink-0">
                <TableSearchInput
                  value={filters.searchTerm}
                  onChange={(value) => {
                    const trimmedValue = value.trimStart();
                    setFilters((prev) => ({
                      ...prev,
                      searchTerm: trimmedValue,
                      currentPage: 1,
                    }));
                  }}
                  placeholder="Search Here..."
                />
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="bg-white">
                  <TableHead position="first">Sr no.</TableHead>
                  <TableHead
                    sortable
                    onSort={() => handleSort("patientName")}
                    sortDirection={getSortDirection("patientName")}
                  >
                    Patient Name
                  </TableHead>
                  <TableHead>Patient UHID</TableHead>
                  <TableHead>Admission Type</TableHead>
                  <TableHead>Counsellor</TableHead>
                  <TableHead>Waiting Time</TableHead>
                  <TableHead position="last">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isAwaitingLoading ? (
                  <TableRow>
                    <TableData
                      colSpan={AWAITING_TABLE_COLUMN_COUNT}
                      className="py-12 text-center text-sm text-[#9CA3AF]"
                    >
                      <div className="flex items-center justify-center">
                        <SpinnerLoader />
                      </div>
                    </TableData>
                  </TableRow>
                ) : isAwaitingError ? (
                  <TableRow>
                    <TableData
                      colSpan={AWAITING_TABLE_COLUMN_COUNT}
                      className="py-12 text-center text-sm text-[#9CA3AF]"
                    >
                      {getRtkErrorMessage(awaitingError, "Error loading awaiting patients")}
                    </TableData>
                  </TableRow>
                ) : awaitingPatients.length === 0 ? (
                  <TableRow>
                    <TableData
                      colSpan={AWAITING_TABLE_COLUMN_COUNT}
                      className="py-12 text-center text-sm text-[#9CA3AF]"
                    >
                      No awaiting IPD patients found.
                    </TableData>
                  </TableRow>
                ) : (
                  awaitingPatients.map((patient, index) => {
                    const srNo = String(
                      (filters.currentPage - 1) * filters.itemsPerPage + index + 1
                    ).padStart(2, "0");

                    return (
                      <TableRow
                        key={patient.patientId}
                        className="bg-white transition-colors hover:bg-[#F7FAF7]"
                      >
                        <TableData variant="primary">{srNo}</TableData>
                        <TableData>{patient.patientName}</TableData>
                        <TableData>{patient.patientUhid}</TableData>
                        <TableData>
                          <Badge
                            variant={getAdmissionTypeVariant(patient.admissionType)}
                            className="font-medium"
                          >
                            {patient.admissionType || "—"}
                          </Badge>
                        </TableData>
                        <TableData>{patient.counsellorName || "—"}</TableData>
                        <TableData>{patient.waitingTimeLabel}</TableData>
                        <TableData>{renderPatientActions(patient)}</TableData>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            {!isAwaitingLoading && !isAwaitingError && totalAwaitingPatients > 0 && (
              <Pagination
                currentPage={filters.currentPage}
                totalItems={totalAwaitingPatients}
                itemsPerPage={filters.itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            )}
          </div>
        </section>

        <WardCapacityOverview
          wardCapacity={wardCapacity}
          roomTypes={roomTypes}
          isWardCapacityLoading={isWardCapacityLoading}
          isRoomTypesLoading={isRoomTypesLoading}
          isWardCapacityError={isWardCapacityError}
          wardCapacityErrorMessage={
            isWardCapacityError
              ? getRtkErrorMessage(wardCapacityError, "Failed to load ward capacity overview.")
              : undefined
          }
          isRoomTypesError={isRoomTypesError}
          roomTypesErrorMessage={
            isRoomTypesError
              ? getRtkErrorMessage(roomTypesError, "Failed to load room types.")
              : undefined
          }
        />
      </div>
    </AppShell>
  );
}

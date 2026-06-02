"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useAppSelector } from "@/store/hooks";
import { resolveReceptionBranchId } from "@/lib/ipd-reception/resolveReceptionBranchId";
import { selectSelectedBranch, selectUserBranchId } from "@/store/slices/authSlice";
import {
  useGetIpdAwaitingPatientsQuery,
  useGetIpdReceptionDashboardStatsQuery,
  useGetIpdRoomCapacityOverviewQuery,
  useGetIpdRoomTypeCapacityOverviewQuery,
} from "@/store/api/ipdReceptionApi";
import { DEFAULT_ITEMS_PER_PAGE } from "@/lib/ipd-reception/constants";
import { mapIpdDashboardStatsToView } from "@/lib/ipd-reception/mapIpdDashboardStats";
import {
  getRtkErrorMessage,
  mapAwaitingPatientsToTableRows,
} from "@/lib/ipd-reception/mapIpdAwaitingPatients";
import {
  extractCapacityOverviewPayload,
  mapCapacityCategories,
} from "@/lib/ipd-reception/mapIpdWardCapacityOverview";

type SortOrder = "asc" | "desc";

/** Same as registration list / dashboard pages — refetch when the page mounts or filters change. */
const RECEPTION_DASHBOARD_QUERY_OPTIONS = {
  refetchOnMountOrArgChange: true as const,
};

export function useReceptionDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
  const [sort, setSort] = useState<string | undefined>("patientName");
  const [order, setOrder] = useState<SortOrder | undefined>("asc");

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

  const debouncedSearch = useDebounce(searchTerm, 400);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, branchId, itemsPerPage, sort, order]);

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
      page: currentPage,
      limit: itemsPerPage,
      sort,
      order,
      branchId,
      patientType: "ipd" as const,
    }),
    [debouncedSearch, currentPage, itemsPerPage, sort, order, branchId]
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

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  const sortDirection: "asc" | "desc" | null = order ?? null;

  const handlePatientNameSort = useCallback(() => {
    setSort("patientName");
    setOrder((prev) => {
      if (prev === "asc") return "desc";
      if (prev === "desc") return "asc";
      return "asc";
    });
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    handleItemsPerPageChange,
    stats,
    wardCapacity,
    roomTypes,
    awaitingPatients,
    totalAwaitingPatients: awaitingResponse?.total ?? 0,
    isStatsLoading,
    isWardCapacityLoading,
    isRoomTypesLoading,
    isWardCapacityError,
    wardCapacityErrorMessage: isWardCapacityError
      ? getRtkErrorMessage(wardCapacityError, "Failed to load ward capacity overview.")
      : undefined,
    isRoomTypesError,
    roomTypesErrorMessage: isRoomTypesError
      ? getRtkErrorMessage(roomTypesError, "Failed to load room types.")
      : undefined,
    isAwaitingLoading,
    isAwaitingError,
    awaitingErrorMessage: isAwaitingError
      ? getRtkErrorMessage(awaitingError, "Failed to load awaiting IPD patients.")
      : undefined,
    sortDirection,
    handlePatientNameSort,
  };
}

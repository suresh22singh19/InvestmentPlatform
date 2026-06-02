"use client";

import { useEffect, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { DEFAULT_ITEMS_PER_PAGE } from "@/lib/ipd-reception/constants";
import {
  MOCK_PENDING_DISCHARGES,
  MOCK_PENDING_DISCHARGES_TOTAL,
} from "@/lib/ipd-reception/pendingDischargesMock";

function filterPendingDischarges(
  items: typeof MOCK_PENDING_DISCHARGES,
  search: string
) {
  const term = search.trim().toLowerCase();
  if (!term) return items;

  return items.filter(
    (item) =>
      item.patientName.toLowerCase().includes(term) ||
      item.patientUhid.toLowerCase().includes(term) ||
      item.wardBed.toLowerCase().includes(term)
  );
}

function paginateItems<T>(items: T[], page: number, limit: number): T[] {
  const start = (page - 1) * limit;
  return items.slice(start, start + limit);
}

export function usePendingDischarges() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);

  const debouncedSearch = useDebounce(searchTerm, 400);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const filtered = filterPendingDischarges(MOCK_PENDING_DISCHARGES, debouncedSearch);

  const totalItems = debouncedSearch.trim() ? filtered.length : MOCK_PENDING_DISCHARGES_TOTAL;

  const pageData = paginateItems(filtered, currentPage, itemsPerPage);

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  return {
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    handleItemsPerPageChange,
    patients: pageData,
    totalItems,
    isLoading: false,
  };
}

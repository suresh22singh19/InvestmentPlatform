"use client";

import { useEffect, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { DEFAULT_ITEMS_PER_PAGE } from "@/lib/ipd-reception/constants";
import {
  MOCK_HISTORICAL_PATIENTS,
  MOCK_HISTORICAL_PATIENTS_TOTAL,
} from "@/lib/ipd-reception/historicalPatientsMock";

function filterHistoricalPatients(
  items: typeof MOCK_HISTORICAL_PATIENTS,
  search: string,
  datePeriod: string,
  dischargeOutcome: string,
  consultant: string
) {
  const term = search.trim().toLowerCase();
  return items.filter((item) => {
    const matchesOutcome = !dischargeOutcome || item.outcome === dischargeOutcome;
    const matchesConsultant =
      !consultant ||
      (consultant === "dr-aditi" && item.attendingConsultant.includes("Aditi")) ||
      (consultant === "dr-rahul" && item.attendingConsultant.includes("Rahul")) ||
      (consultant === "dr-manas" && item.attendingConsultant.includes("Manas")) ||
      (consultant === "dr-meera" && item.attendingConsultant.includes("Meera"));

    const matchesDate = !datePeriod;

    if (!term) {
      return matchesOutcome && matchesConsultant && matchesDate;
    }

    return (
      matchesOutcome &&
      matchesConsultant &&
      matchesDate &&
      (item.patientName.toLowerCase().includes(term) ||
        item.patientUhid.toLowerCase().includes(term))
    );
  });
}

function paginateItems<T>(items: T[], page: number, limit: number): T[] {
  const start = (page - 1) * limit;
  return items.slice(start, start + limit);
}

export function useHistoricalPatientsRegistry() {
  const [searchTerm, setSearchTerm] = useState("");
  const [datePeriod, setDatePeriod] = useState("");
  const [dischargeOutcome, setDischargeOutcome] = useState("");
  const [consultant, setConsultant] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);

  const debouncedSearch = useDebounce(searchTerm, 400);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, datePeriod, dischargeOutcome, consultant]);

  const filtered = filterHistoricalPatients(
    MOCK_HISTORICAL_PATIENTS,
    debouncedSearch,
    datePeriod,
    dischargeOutcome,
    consultant
  );

  const hasFilters =
    debouncedSearch.trim() || datePeriod || dischargeOutcome || consultant;

  const totalItems = hasFilters ? filtered.length : MOCK_HISTORICAL_PATIENTS_TOTAL;
  const pageData = paginateItems(filtered, currentPage, itemsPerPage);

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  return {
    searchTerm,
    setSearchTerm,
    datePeriod,
    setDatePeriod,
    dischargeOutcome,
    setDischargeOutcome,
    consultant,
    setConsultant,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    handleItemsPerPageChange,
    patients: pageData,
    totalItems,
    isLoading: false,
  };
}

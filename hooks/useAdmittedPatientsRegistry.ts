"use client";

import { useEffect, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { DEFAULT_ITEMS_PER_PAGE } from "@/lib/ipd-reception/constants";
import {
  ADMITTED_PATIENTS_REGISTRY_STATS,
  MOCK_ADMITTED_PATIENTS,
  MOCK_ADMITTED_PATIENTS_TOTAL,
} from "@/lib/ipd-reception/admittedPatientsMock";
import type { AdmittedPatientsRegistryStats } from "@/lib/ipd-reception/admittedPatientsTypes";

function filterAdmittedPatients(
  items: typeof MOCK_ADMITTED_PATIENTS,
  search: string,
  wardType: string,
  consultant: string
) {
  const term = search.trim().toLowerCase();
  return items.filter((item) => {
    const matchesWard = !wardType || item.wardType === wardType;
    const matchesConsultant =
      !consultant ||
      (consultant === "dr-aditi" && item.primaryConsultant.includes("Aditi")) ||
      (consultant === "dr-rahul" && item.primaryConsultant.includes("Rahul")) ||
      (consultant === "dr-manas" && item.primaryConsultant.includes("Manas"));

    if (!term) return matchesWard && matchesConsultant;

    return (
      matchesWard &&
      matchesConsultant &&
      (item.patientName.toLowerCase().includes(term) ||
        item.patientUhid.toLowerCase().includes(term) ||
        item.wardBed.toLowerCase().includes(term))
    );
  });
}

function paginateItems<T>(items: T[], page: number, limit: number): T[] {
  const start = (page - 1) * limit;
  return items.slice(start, start + limit);
}

export function useAdmittedPatientsRegistry() {
  const [searchTerm, setSearchTerm] = useState("");
  const [wardType, setWardType] = useState("");
  const [consultant, setConsultant] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);

  const debouncedSearch = useDebounce(searchTerm, 400);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, wardType, consultant]);

  const filtered = filterAdmittedPatients(
    MOCK_ADMITTED_PATIENTS,
    debouncedSearch,
    wardType,
    consultant
  );

  const totalItems =
    debouncedSearch.trim() || wardType || consultant
      ? filtered.length
      : MOCK_ADMITTED_PATIENTS_TOTAL;

  const pageData = paginateItems(filtered, currentPage, itemsPerPage);

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  const stats: AdmittedPatientsRegistryStats = ADMITTED_PATIENTS_REGISTRY_STATS;

  return {
    searchTerm,
    setSearchTerm,
    wardType,
    setWardType,
    consultant,
    setConsultant,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    handleItemsPerPageChange,
    patients: pageData,
    totalItems,
    stats,
    isLoading: false,
  };
}

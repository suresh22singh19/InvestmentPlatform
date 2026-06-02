"use client";

import { TableListingCard, TableSearchInput } from "@/components/ui";
import { buildAwaitingAdmissionTableSection } from "@/lib/ipd-reception/tableConfig";
import type { IpdAwaitingPatientTableRow } from "@/lib/ipd-reception/ipdAwaitingPatientsTypes";

type AwaitingAdmissionTableProps = {
  patients: IpdAwaitingPatientTableRow[];
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  sortDirection?: "asc" | "desc" | null;
  onPatientNameSort?: () => void;
};

export function AwaitingAdmissionTable({
  patients,
  totalItems,
  currentPage,
  itemsPerPage,
  searchTerm,
  onSearchChange,
  onPageChange,
  onItemsPerPageChange,
  isLoading,
  isError,
  errorMessage,
  sortDirection,
  onPatientNameSort,
}: AwaitingAdmissionTableProps) {
  const searchInput = (
    <div className="w-full sm:w-[300px]">
      <TableSearchInput
        value={searchTerm}
        onChange={onSearchChange}
        placeholder="Search Here..."
      />
    </div>
  );

  const section = buildAwaitingAdmissionTableSection({
    patients,
    currentPage,
    itemsPerPage,
    totalItems,
    onPageChange,
    onItemsPerPageChange,
    isLoading,
    isError,
    errorMessage,
    searchInput,
    sortDirection,
    onPatientNameSort,
  });

  return <TableListingCard sections={[section]} />;
}

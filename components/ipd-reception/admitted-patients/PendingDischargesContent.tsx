"use client";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { TableListingCard, TableSearchInput } from "@/components/ui";
import { usePendingDischarges } from "@/hooks/usePendingDischarges";
import { buildPendingDischargesTableSection } from "@/lib/ipd-reception/pendingDischargesTableConfig";

export function PendingDischargesContent() {
  const {
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    handleItemsPerPageChange,
    patients,
    totalItems,
    isLoading,
  } = usePendingDischarges();

  const searchContent = (
    <div className="w-full sm:w-[300px]">
      <TableSearchInput
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Search by Name, UHID, or Bed No..."
      />
    </div>
  );

  const tableSection = buildPendingDischargesTableSection({
    patients,
    currentPage,
    itemsPerPage,
    totalItems,
    onPageChange: setCurrentPage,
    onItemsPerPageChange: handleItemsPerPageChange,
    isLoading,
    searchContent,
  });

  return (
    <AppShell>
      <div className="mb-6">
        <PageHeading title="Pending Discharges" />
      </div>

      <TableListingCard sections={[tableSection]} />
    </AppShell>
  );
}

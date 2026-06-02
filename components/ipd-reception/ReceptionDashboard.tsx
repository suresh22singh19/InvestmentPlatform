"use client";

import { AppShell } from "@/components/layout/AppShell";
import { DashboardHeader } from "@/components/ipd-reception/DashboardHeader";
import { ReceptionStatsGrid } from "@/components/ipd-reception/ReceptionStatCard";
import { AwaitingAdmissionTable } from "@/components/ipd-reception/AwaitingAdmissionTable";
import { WardCapacityOverview } from "@/components/ipd-reception/WardCapacityOverview";
import { useReceptionDashboard } from "@/hooks/useReceptionDashboard";

export function ReceptionDashboard() {
  const {
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
    totalAwaitingPatients,
    isStatsLoading,
    isWardCapacityLoading,
    isRoomTypesLoading,
    isWardCapacityError,
    wardCapacityErrorMessage,
    isRoomTypesError,
    roomTypesErrorMessage,
    isAwaitingLoading,
    isAwaitingError,
    awaitingErrorMessage,
    sortDirection,
    handlePatientNameSort,
  } = useReceptionDashboard();

  return (
    <AppShell>
      <DashboardHeader onNewAdmission={() => undefined} />

      <ReceptionStatsGrid stats={stats} isLoading={isStatsLoading} />

      <div className="mb-6">
        <AwaitingAdmissionTable
          patients={awaitingPatients}
          totalItems={totalAwaitingPatients}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={handleItemsPerPageChange}
          isLoading={isAwaitingLoading}
          isError={isAwaitingError}
          errorMessage={awaitingErrorMessage}
          sortDirection={sortDirection}
          onPatientNameSort={handlePatientNameSort}
        />
      </div>

      <WardCapacityOverview
        wardCapacity={wardCapacity}
        roomTypes={roomTypes}
        isWardCapacityLoading={isWardCapacityLoading}
        isRoomTypesLoading={isRoomTypesLoading}
        isWardCapacityError={isWardCapacityError}
        wardCapacityErrorMessage={wardCapacityErrorMessage}
        isRoomTypesError={isRoomTypesError}
        roomTypesErrorMessage={roomTypesErrorMessage}
      />
    </AppShell>
  );
}

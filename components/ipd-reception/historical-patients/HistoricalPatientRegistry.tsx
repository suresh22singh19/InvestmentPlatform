"use client";

import Image from "next/image";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { FormSelectField, TableListingCard, TableSearchInput } from "@/components/ui";
import { useHistoricalPatientsRegistry } from "@/hooks/useHistoricalPatientsRegistry";
import { buildHistoricalPatientsTableSection } from "@/lib/ipd-reception/historicalPatientsTableConfig";
import {
  HISTORICAL_CONSULTANT_OPTIONS,
  HISTORICAL_DATE_PERIOD_OPTIONS,
  HISTORICAL_DISCHARGE_OUTCOME_OPTIONS,
} from "@/lib/ipd-reception/historicalPatientsMock";

export function HistoricalPatientRegistry() {
  const {
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
    patients,
    totalItems,
    isLoading,
  } = useHistoricalPatientsRegistry();

  const filtersContent = (
    <div className="flex w-full flex-col gap-3 xl:flex-row xl:flex-wrap xl:items-center xl:justify-end">
      <div className="w-full sm:w-[160px]">
        <FormSelectField
          label=""
          hideLabel
          options={HISTORICAL_DATE_PERIOD_OPTIONS}
          value={datePeriod}
          onChange={(v) => setDatePeriod(String(v))}
          mode="single"
          background="normal"
        />
      </div>
      <div className="w-full sm:w-[180px]">
        <FormSelectField
          label=""
          hideLabel
          options={HISTORICAL_DISCHARGE_OUTCOME_OPTIONS}
          value={dischargeOutcome}
          onChange={(v) => setDischargeOutcome(String(v))}
          mode="single"
          background="normal"
        />
      </div>
      <div className="w-full sm:w-[200px]">
        <FormSelectField
          label=""
          hideLabel
          options={HISTORICAL_CONSULTANT_OPTIONS}
          value={consultant}
          onChange={(v) => setConsultant(String(v))}
          mode="single"
          background="normal"
        />
      </div>
      <div className="w-full sm:w-[260px]">
        <TableSearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Patient Name or UHID..."
        />
      </div>
    </div>
  );

  const tableSection = buildHistoricalPatientsTableSection({
    patients,
    currentPage,
    itemsPerPage,
    totalItems,
    onPageChange: setCurrentPage,
    onItemsPerPageChange: handleItemsPerPageChange,
    isLoading,
    filtersContent,
  });

  return (
    <AppShell>
      <div className="-mx-4 -mt-2 min-h-[calc(100vh-120px)] bg-gradient-to-b from-[#F4FAF4] via-[#FAFCFA] to-white px-4 pb-8 pt-2 sm:-mx-6 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <PageHeading title="Historical Patient Registry" />
          <button
            type="button"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[32px] border border-[#9A7909] bg-white px-6 text-sm font-medium text-[#9A7909] shadow-sm transition-colors hover:bg-[#FDF8E8]"
          >
            <Image src="/icons/DownloadExport.svg" alt="" width={18} height={18} />
            Export Registry
          </button>
        </div>

        <TableListingCard sections={[tableSection]} />
      </div>
    </AppShell>
  );
}

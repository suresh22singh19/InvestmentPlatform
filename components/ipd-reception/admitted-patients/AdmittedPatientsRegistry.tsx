"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
  Button,
  FormSelectField,
  TableListingCard,
  TableSearchInput,
} from "@/components/ui";
import { AdmittedPatientsStatsGrid } from "@/components/ipd-reception/admitted-patients/AdmittedPatientsStatsGrid";
import { SelectDischargeTypeDialog } from "@/components/ipd-reception/admitted-patients/SelectDischargeTypeDialog";
import { useAdmittedPatientsRegistry } from "@/hooks/useAdmittedPatientsRegistry";
import { buildAdmittedPatientsTableSection } from "@/lib/ipd-reception/admittedPatientsTableConfig";
import type { AdmittedPatientRegistryItem } from "@/lib/ipd-reception/admittedPatientsTypes";
import type { DischargeTypeValue } from "@/lib/ipd-reception/dischargeTypeOptions";
import {
  ADMITTED_PATIENTS_CONSULTANT_OPTIONS,
  ADMITTED_PATIENTS_WARD_OPTIONS,
} from "@/lib/ipd-reception/admittedPatientsMock";

export function AdmittedPatientsRegistry() {
  const router = useRouter();
  const [dischargePatient, setDischargePatient] = useState<AdmittedPatientRegistryItem | null>(
    null
  );

  const {
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
    patients,
    totalItems,
    stats,
    isLoading,
  } = useAdmittedPatientsRegistry();

  const filtersContent = (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-end">
      <div className="w-full sm:w-[200px]">
        <FormSelectField
          label=""
          hideLabel
          options={ADMITTED_PATIENTS_WARD_OPTIONS}
          value={wardType}
          onChange={(v) => setWardType(String(v))}
          mode="single"
          background="normal"
        />
      </div>
      <div className="w-full sm:w-[220px]">
        <FormSelectField
          label=""
          hideLabel
          options={ADMITTED_PATIENTS_CONSULTANT_OPTIONS}
          value={consultant}
          onChange={(v) => setConsultant(String(v))}
          mode="single"
          background="normal"
        />
      </div>
      <div className="w-full sm:w-[300px]">
        <TableSearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search by Name, UHID, or Bed No..."
        />
      </div>
    </div>
  );

  const handleDischargeContinue = (dischargeType: DischargeTypeValue) => {
    if (!dischargePatient) return;
    setDischargePatient(null);
    router.push(
      `/ipd-reception/patient/${dischargePatient.id}/discharge?type=${encodeURIComponent(dischargeType)}`
    );
  };

  const tableSection = buildAdmittedPatientsTableSection({
    patients,
    currentPage,
    itemsPerPage,
    totalItems,
    onPageChange: setCurrentPage,
    onItemsPerPageChange: handleItemsPerPageChange,
    onInitiateDischarge: setDischargePatient,
    isLoading,
    filtersContent,
  });

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeading title="Patient Registry" />
        <Button
          variant="outline"
          size="medium"
          className="!min-w-0 shrink-0"
          leftIcon={<Image src="/icons/DownloadExport.svg" alt="" width={18} height={18} />}
        >
          Export Report
        </Button>
      </div>

      <AdmittedPatientsStatsGrid stats={stats} />

      <TableListingCard sections={[tableSection]} />

      <SelectDischargeTypeDialog
        open={dischargePatient !== null}
        patient={dischargePatient}
        onClose={() => setDischargePatient(null)}
        onContinue={handleDischargeContinue}
      />
    </AppShell>
  );
}

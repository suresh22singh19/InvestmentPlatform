"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import type { TableListingSection } from "@/components/ui";
import { ITEMS_PER_PAGE_OPTIONS } from "@/lib/ipd-reception/constants";
import type { AdmittedPatientRegistryItem } from "@/lib/ipd-reception/admittedPatientsTypes";

type BuildAdmittedPatientsTableSectionParams = {
  patients: AdmittedPatientRegistryItem[];
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
  onInitiateDischarge: (patient: AdmittedPatientRegistryItem) => void;
  isLoading?: boolean;
  filtersContent: ReactNode;
};

export function buildAdmittedPatientsTableSection({
  patients,
  currentPage,
  itemsPerPage,
  totalItems,
  onPageChange,
  onItemsPerPageChange,
  onInitiateDischarge,
  isLoading,
  filtersContent,
}: BuildAdmittedPatientsTableSectionParams): TableListingSection {
  const columns: TableListingSection["columns"] = [
    { label: "Sr no.", position: "first" },
    {
      label: "Patient Name",
      sortable: true,
      sortDirection: null,
    },
    { label: "Patient UHID" },
    { label: "Ward/Bed" },
    { label: "Diagnosis" },
    { label: "Admission Date" },
    { label: "Primary Consultant" },
    { label: "Action", position: "last" },
  ];

  const rows: TableListingSection["rows"] = patients.map((patient, index) => {
    const srNo = String((currentPage - 1) * itemsPerPage + index + 1).padStart(2, "0");

    const actions = (
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/ipd-reception/patient/${patient.id}/care-record`}>
          <Button variant="primary" size="xsmall" className="!min-w-0 whitespace-nowrap">
            List View
          </Button>
        </Link>
        <Button
          variant="outline"
          size="xsmall"
          className="!min-w-0 whitespace-nowrap"
          onClick={() => onInitiateDischarge(patient)}
        >
          Initiate Discharge
        </Button>
      </div>
    );

    return [
      srNo,
      patient.patientName,
      <span key={`uhid-${patient.id}`} className="font-medium text-[#262D3B]">
        {patient.patientUhid}
      </span>,
      patient.wardBed,
      patient.diagnosis,
      patient.admissionDate,
      patient.primaryConsultant,
      actions,
    ];
  });

  return {
    id: "admitted-patients-registry",
    title: "Active Patient List",
    titleRightContent: filtersContent,
    columns,
    rows,
    emptyMessage: "No admitted patients found",
    isLoading,
    pagination: {
      currentPage,
      totalItems,
      itemsPerPage,
      onPageChange,
      onItemsPerPageChange,
      itemsPerPageOptions: ITEMS_PER_PAGE_OPTIONS,
    },
  };
}

"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Badge, Button } from "@/components/ui";
import type { TableListingSection } from "@/components/ui";
import type { IpdAwaitingPatientTableRow } from "@/lib/ipd-reception/ipdAwaitingPatientsTypes";
import { ITEMS_PER_PAGE_OPTIONS } from "@/lib/ipd-reception/constants";
import { isPatientCompliant } from "@/lib/ipd-reception/mapIpdAwaitingPatients";

function getAdmissionTypeVariant(
  type: string
): "success" | "neutral" | "info" {
  const normalized = type.toLowerCase();
  if (normalized.includes("tpa") || normalized.includes("health")) return "success";
  if (normalized.includes("panel") || normalized.includes("govt")) return "info";
  return "neutral";
}

function renderPatientActions(patient: IpdAwaitingPatientTableRow) {
  const patientHref = `/ipd-reception/patient/${patient.patientId}`;

  if (isPatientCompliant(patient.patientComplianceStatus)) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Link href={patientHref}>
          <Button variant="primary" size="xsmall" className="!min-w-0 whitespace-nowrap">
            View Patient
          </Button>
        </Link>
        <Button
          variant="outline"
          size="xsmall"
          className="!min-w-0 whitespace-nowrap !border-[#EF4444] !text-[#DC2626] hover:!bg-[#FEF2F2]"
        >
          Non Compliant
        </Button>
      </div>
    );
  }

  return (
    <Link href={`${patientHref}/file`}>
      <Button variant="outline" size="xsmall" className="!min-w-0 whitespace-nowrap">
        Open File
      </Button>
    </Link>
  );
}

type BuildAwaitingTableSectionParams = {
  patients: IpdAwaitingPatientTableRow[];
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  searchInput: ReactNode;
  sortDirection?: "asc" | "desc" | null;
  onPatientNameSort?: () => void;
};

export function buildAwaitingAdmissionTableSection({
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
  sortDirection = null,
  onPatientNameSort,
}: BuildAwaitingTableSectionParams): TableListingSection {
  const columns: TableListingSection["columns"] = [
    { label: "Sr no.", position: "first" },
    {
      label: "Patient Name",
      sortable: true,
      sortDirection,
      onSort: onPatientNameSort,
    },
    { label: "Patient UHID" },
    { label: "Admission Type" },
    { label: "Counsellor" },
    { label: "Waiting Time" },
    { label: "Action", position: "last" },
  ];

  const rows: TableListingSection["rows"] = patients.map((patient, index) => {
    const srNo = String((currentPage - 1) * itemsPerPage + index + 1).padStart(2, "0");

    const uhid = (
      <span className="font-medium text-[#262D3B]">{patient.patientUhid}</span>
    );

    const admissionTypeBadge = (
      <Badge variant={getAdmissionTypeVariant(patient.admissionType)} className="font-medium">
        {patient.admissionType || "—"}
      </Badge>
    );

    return [
      srNo,
      patient.patientName,
      uhid,
      admissionTypeBadge,
      patient.counsellorName || "—",
      patient.waitingTimeLabel,
      renderPatientActions(patient),
    ];
  });

  return {
    id: "awaiting-admission",
    title: "Awaiting Admission",
    titleRightContent: searchInput,
    columns,
    rows,
    emptyMessage: "No awaiting IPD patients found.",
    isLoading,
    isError,
    errorMessage,
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

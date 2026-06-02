"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui";
import type { TableListingSection } from "@/components/ui";
import { ITEMS_PER_PAGE_OPTIONS } from "@/lib/ipd-reception/constants";
import { DISCHARGE_TYPE_LABELS } from "@/lib/ipd-reception/dischargeTypeOptions";
import type { HistoricalPatientRegistryItem } from "@/lib/ipd-reception/historicalPatientsTypes";

function OutcomeBadge({ outcome }: { outcome: HistoricalPatientRegistryItem["outcome"] }) {
  const label = DISCHARGE_TYPE_LABELS[outcome];
  const variant =
    outcome === "normal" ? "success" : outcome === "lama" || outcome === "dama" ? "danger" : "neutral";

  return (
    <Badge variant={variant} className="font-medium whitespace-nowrap">
      {label}
    </Badge>
  );
}

type BuildHistoricalPatientsTableSectionParams = {
  patients: HistoricalPatientRegistryItem[];
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
  isLoading?: boolean;
  filtersContent: ReactNode;
};

export function buildHistoricalPatientsTableSection({
  patients,
  currentPage,
  itemsPerPage,
  totalItems,
  onPageChange,
  onItemsPerPageChange,
  isLoading,
  filtersContent,
}: BuildHistoricalPatientsTableSectionParams): TableListingSection {
  const columns: TableListingSection["columns"] = [
    { label: "Sr no.", position: "first" },
    { label: "Patient Name", sortable: true, sortDirection: null },
    { label: "Patient UHID" },
    { label: "Adm / Disch Date" },
    { label: "Final Diagnosis" },
    { label: "Attending Consultant" },
    { label: "Outcome" },
    { label: "Action", position: "last" },
  ];

  const rows: TableListingSection["rows"] = patients.map((patient, index) => {
    const srNo = String((currentPage - 1) * itemsPerPage + index + 1).padStart(2, "0");

    const admDischDates = (
      <div key={`dates-${patient.id}`} className="text-sm leading-relaxed">
        <p>
          <span className="font-medium text-[#0B8C00]">Adm:</span>{" "}
          <span className="text-[#434956]">{patient.admissionDate}</span>
        </p>
        <p className="mt-0.5">
          <span className="font-medium text-[#434956]">Disch:</span>{" "}
          <span className="text-[#525763]">{patient.dischargeDate}</span>
        </p>
      </div>
    );

    const consultantCell = (
      <div key={`consultant-${patient.id}`}>
        <p className="text-sm font-medium text-[#262D3B]">{patient.attendingConsultant}</p>
        {patient.consultantSpecialty ? (
          <p className="text-xs text-[#9FA2AB]">{patient.consultantSpecialty}</p>
        ) : null}
      </div>
    );

    const viewAction = (
      <Link
        key={`view-${patient.id}`}
        href={`/ipd-reception/patient/${patient.id}`}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E3EEE1] bg-[#FAFBFA] text-[#787E8C] transition-colors hover:border-[#0B8C00]/40 hover:bg-[#F4FAF4]"
        aria-label={`View ${patient.patientName}`}
      >
        <Image src="/icons/ViewEyeIcon.svg" alt="" width={18} height={18} />
      </Link>
    );

    return [
      srNo,
      patient.patientName,
      <span key={`uhid-${patient.id}`} className="font-medium text-[#262D3B]">
        {patient.patientUhid}
      </span>,
      admDischDates,
      patient.finalDiagnosis,
      consultantCell,
      <OutcomeBadge key={`outcome-${patient.id}`} outcome={patient.outcome} />,
      viewAction,
    ];
  });

  return {
    id: "historical-patient-registry",
    title: "Historical Admission Logs",
    titleRightContent: filtersContent,
    columns,
    rows,
    emptyMessage: "No historical admission records found",
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

"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Badge, Button } from "@/components/ui";
import type { TableListingSection } from "@/components/ui";
import { ITEMS_PER_PAGE_OPTIONS } from "@/lib/ipd-reception/constants";
import type {
  DischargeStepStatus,
  PendingDischargePatient,
} from "@/lib/ipd-reception/pendingDischargesTypes";

function DischargeStatusPill({ status }: { status: DischargeStepStatus }) {
  const label = status === "complete" ? "Complete" : "Pending";
  return (
    <Badge variant={status === "complete" ? "success" : "warning"} className="font-medium">
      {label}
    </Badge>
  );
}

type BuildPendingDischargesTableSectionParams = {
  patients: PendingDischargePatient[];
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
  isLoading?: boolean;
  searchContent: ReactNode;
};

export function buildPendingDischargesTableSection({
  patients,
  currentPage,
  itemsPerPage,
  totalItems,
  onPageChange,
  onItemsPerPageChange,
  isLoading,
  searchContent,
}: BuildPendingDischargesTableSectionParams): TableListingSection {
  const columns: TableListingSection["columns"] = [
    { label: "Sr no.", position: "first" },
    { label: "Patient Name" },
    { label: "Patient UHID" },
    { label: "Age/Gender" },
    { label: "Ward/Bed" },
    { label: "Doctor" },
    { label: "Diagnosis" },
    { label: "Admission Date" },
    { label: "Doctor Approval" },
    { label: "Final Vitals" },
    { label: "Bill Status" },
    { label: "Action", position: "last" },
  ];

  const rows: TableListingSection["rows"] = patients.map((patient, index) => {
    const srNo = String((currentPage - 1) * itemsPerPage + index + 1).padStart(2, "0");

    const actions = (
      <Link href={`/ipd-reception/patient/${patient.id}/discharge`}>
        <Button variant="outline" size="xsmall" className="!min-w-0 whitespace-nowrap">
          Final Discharge
        </Button>
      </Link>
    );

    return [
      srNo,
      patient.patientName,
      <Link
        key={`uhid-${patient.id}`}
        href={`/ipd-reception/patient/${patient.id}/discharge`}
        className="font-medium text-[#0B8C00] hover:underline"
      >
        {patient.patientUhid}
      </Link>,
      patient.ageGender,
      patient.wardBed,
      patient.doctor,
      patient.diagnosis,
      patient.admissionDate,
      <DischargeStatusPill key={`approval-${patient.id}`} status={patient.doctorApproval} />,
      <DischargeStatusPill key={`vitals-${patient.id}`} status={patient.finalVitals} />,
      <DischargeStatusPill key={`bill-${patient.id}`} status={patient.billStatus} />,
      actions,
    ];
  });

  return {
    id: "pending-discharges-list",
    title: "Active Patient List",
    titleRightContent: searchContent,
    columns,
    rows,
    emptyMessage: "No pending discharges found",
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

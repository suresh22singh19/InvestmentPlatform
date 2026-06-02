"use client";

import Link from "next/link";
import { Badge, Button } from "@/components/ui";
import type { DischargePatientProfile } from "@/lib/ipd-reception/dischargeTypes";

type DischargePatientHeaderProps = {
  patient: DischargePatientProfile;
  showViewProfile?: boolean;
};

export function DischargePatientHeader({
  patient,
  showViewProfile = false,
}: DischargePatientHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-[#262D3B]">{patient.patientName}</h1>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#525763]">
          <span>
            <span className="font-medium text-[#434956]">UHID:</span> {patient.uhid}
          </span>
          <span>
            <span className="font-medium text-[#434956]">Age:</span> {patient.age}
          </span>
          <span>
            <span className="font-medium text-[#434956]">Gender:</span> {patient.gender}
          </span>
          <span>
            <span className="font-medium text-[#434956]">Contact Number:</span>{" "}
            {patient.contactNumber}
          </span>
          <span>
            <span className="font-medium text-[#434956]">Admission Number:</span>{" "}
            {patient.admissionNumber}
          </span>
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-3">
        {showViewProfile ? (
          <Link href={`/ipd-reception/patient/${patient.id}`}>
            <Button variant="outline" size="medium" className="!min-w-0 whitespace-nowrap">
              View Full Profile
            </Button>
          </Link>
        ) : null}
        <Badge variant="success" className="font-medium">
          {patient.dischargeType}
        </Badge>
      </div>
    </div>
  );
}

"use client";

import { Badge, DatePicker } from "@/components/ui";
import type { PatientCareRecordProfile } from "@/lib/ipd-reception/patientCareRecordTypes";

type PatientCareRecordHeaderProps = {
  patient: PatientCareRecordProfile;
  selectedDate: string;
  onDateChange: (value: string) => void;
};

export function PatientCareRecordHeader({
  patient,
  selectedDate,
  onDateChange,
}: PatientCareRecordHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 rounded-[20px] border border-[#E3EEE1] bg-[#F8F6F0] p-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-[#262D3B]">{patient.patientName}</h1>
          <Badge variant="success" className="font-semibold uppercase tracking-wide">
            {patient.status}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-[#525763]">
          <span className="font-medium text-[#434956]">UHID:</span> {patient.uhid}
          <span className="mx-2 text-[#DFE0E2]">•</span>
          <span className="font-medium text-[#434956]">Age:</span> {patient.age}
          <span className="mx-2 text-[#DFE0E2]">•</span>
          <span className="font-medium text-[#434956]">Gender:</span> {patient.gender}
          <span className="mx-2 text-[#DFE0E2]">•</span>
          <span className="font-medium text-[#434956]">Bed Number:</span> {patient.bedNumber}
        </p>
        <p className="mt-1 text-sm text-[#525763]">
          <span className="font-medium text-[#434956]">Diagnosis:</span> {patient.diagnosis}
          <span className="mx-2 text-[#DFE0E2]">•</span>
          <span className="font-medium text-[#434956]">Admission Date:</span>{" "}
          {patient.admissionDate}
        </p>
      </div>

      <div className="w-full shrink-0 sm:w-[200px]">
        <DatePicker
          label="Date"
          value={selectedDate}
          onChange={onDateChange}
          placeholder="DD/MM/YY"
          width="100%"
          disablePastDates={false}
        />
      </div>
    </div>
  );
}

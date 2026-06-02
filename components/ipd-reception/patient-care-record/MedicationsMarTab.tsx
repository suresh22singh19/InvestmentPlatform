"use client";

import Image from "next/image";
import { useState } from "react";
import { FormSelectField } from "@/components/ui";
import {
  ADMITTED_PATIENTS_CONSULTANT_OPTIONS,
  ADMITTED_PATIENTS_WARD_OPTIONS,
} from "@/lib/ipd-reception/admittedPatientsMock";
import {
  MAR_DATE_LABEL,
  MAR_MEDICATION_ROWS,
  MAR_TIME_SLOTS,
} from "@/lib/ipd-reception/patientCareRecordMarMock";
import type { MarCategoryTag, MarDoseCell } from "@/lib/ipd-reception/patientCareRecordTypes";

function CategoryTag({ tag }: { tag: MarCategoryTag }) {
  const classes =
    tag.variant === "success"
      ? "border-[#0B8C00]/30 bg-[#F4FAF4] text-[#0B8C00]"
      : tag.variant === "warning"
        ? "border-[#EA580C]/30 bg-[#FFF7ED] text-[#EA580C]"
        : "border-[#FCA5A5]/40 bg-[#FEF2F2] text-[#EF4444]";

  return (
    <span
      className={`mt-1.5 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${classes}`}
    >
      {tag.label}
    </span>
  );
}

function MarDoseStatusCell({ cell }: { cell: MarDoseCell | null }) {
  if (!cell) {
    return <div className="min-h-[72px]" />;
  }

  const { status, displayTime, scheduledTime, administeredBy, overdueLabel } = cell;

  if (status === "administered") {
    return (
      <div className="mx-auto flex min-h-[72px] max-w-[110px] flex-col items-center justify-center gap-1 rounded-[12px] border border-[#0B8C00]/30 bg-[#F4FAF4] px-2 py-2">
        <span className="text-[10px] font-semibold uppercase text-[#0B8C00]">Administered</span>
        <Image src="/icons/check.svg" alt="" width={16} height={16} />
        <span className="text-center text-[10px] font-medium text-[#434956]">
          {displayTime}
          {administeredBy ? ` • ${administeredBy}` : ""}
        </span>
      </div>
    );
  }

  if (status === "due-now") {
    return (
      <div className="mx-auto flex min-h-[72px] max-w-[110px] flex-col items-center justify-center gap-0.5 rounded-[12px] border-2 border-[#0B8C00] bg-[#F4FAF4] px-2 py-2">
        <span className="text-[10px] font-bold uppercase text-[#0B8C00]">Due Now</span>
        <Image src="/icons/documents.svg" alt="" width={18} height={18} />
        <span className="text-center text-[10px] font-medium text-[#0B8C00]">Tap to Admin</span>
      </div>
    );
  }

  if (status === "overdue") {
    return (
      <div className="mx-auto flex min-h-[72px] max-w-[110px] flex-col items-center justify-center gap-0.5 rounded-[12px] border border-[#FCA5A5] bg-[#FEF2F2] px-2 py-2">
        <span className="text-[10px] font-bold uppercase text-[#EF4444]">Overdue</span>
        <span className="text-sm font-bold text-[#EF4444]">!</span>
        <span className="text-center text-[10px] font-medium text-[#EF4444]">
          {overdueLabel ?? scheduledTime}
        </span>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[72px] max-w-[110px] flex-col items-center justify-center gap-1 rounded-[12px] border border-[#E3EEE1] bg-[#FAFBFA] px-2 py-2">
      <span className="text-[10px] font-semibold text-[#9FA2AB]">Scheduled</span>
      <Image src="/icons/calendarCheck.svg" alt="" width={16} height={16} className="opacity-50" />
    </div>
  );
}

export function MedicationsMarTab() {
  const [wardType, setWardType] = useState("");
  const [consultant, setConsultant] = useState("");

  return (
    <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-4 shadow-sm md:p-6">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-lg font-semibold text-[#262D3B]">{MAR_DATE_LABEL}</h2>
        <div className="flex flex-wrap gap-2">
          <div className="w-full min-w-[160px] sm:w-[180px]">
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
          <div className="w-full min-w-[180px] sm:w-[200px]">
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
        </div>
      </div>

      <p className="mb-4 text-sm font-medium text-[#434956]">Medication Timetable</p>

      <div className="overflow-x-auto rounded-[12px] border border-[#E3EEE1]">
        <table className="w-full min-w-[960px] border-collapse text-left">
          <thead>
            <tr className="bg-[#FAFBFA]">
              <th className="sticky left-0 z-10 min-w-[220px] border-b border-r border-[#E3EEE1] bg-[#FAFBFA] px-4 py-3 text-left text-xs font-semibold text-[#9FA2AB]">
                Medication Details
              </th>
              {MAR_TIME_SLOTS.map((slot) => (
                <th
                  key={slot.id}
                  className="min-w-[108px] border-b border-[#E3EEE1] px-2 py-3 text-center"
                >
                  <div className="text-xs font-bold text-[#262D3B]">{slot.time}</div>
                  <div className="text-[10px] font-medium text-[#9FA2AB]">{slot.label}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MAR_MEDICATION_ROWS.map((row) => (
              <tr key={row.id} className="border-b border-[#F0F2F0] last:border-0">
                <td className="sticky left-0 z-10 border-r border-[#E3EEE1] bg-white px-4 py-4">
                  <p className="text-sm font-semibold text-[#262D3B]">{row.name}</p>
                  <p className="mt-0.5 text-xs text-[#525763]">
                    {row.dosage} • {row.route}
                    {row.instructions ? ` • ${row.instructions}` : ""}
                  </p>
                  {row.categoryTag ? <CategoryTag tag={row.categoryTag} /> : null}
                </td>
                {MAR_TIME_SLOTS.map((slot) => (
                  <td key={slot.id} className="border-[#F0F2F0] px-1 py-3 align-middle">
                    <MarDoseStatusCell cell={row.doses[slot.id] ?? null} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

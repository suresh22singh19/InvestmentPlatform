"use client";

import Image from "next/image";
import type { PrescribedMedicineItem } from "@/lib/ipd-reception/viewPatientMock";

type PrescribedMedicinesSectionProps = {
  items: PrescribedMedicineItem[];
  className?: string;
};

export function PrescribedMedicinesSection({ items, className = "" }: PrescribedMedicinesSectionProps) {
  return (
    <div className={`mb-4 rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] ${className}`}>
      <div className="mb-4 flex items-center gap-2">
        <Image src="/icons/medicons.svg" alt="" width={20} height={20} />
        <h3 className="text-base font-medium text-[#262D3B]">Medicines Prescribed</h3>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {items.map((medicine) => (
          <div
            key={medicine.id}
            className="rounded-xl border border-[#EBECED] bg-[#FAFBFA] p-4"
          >
            <div className="mb-3 flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgba(11,140,0,0.05)]">
                <Image src="/icons/medicons.svg" alt="" width={18} height={18} />
              </div>
              <p className="text-sm font-semibold text-[#262D3B]">{medicine.name}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-[#E3EEE1] bg-white px-3 py-1 text-xs font-medium text-[#434956]">
                {medicine.dosage}
              </span>
              <span className="rounded-full border border-[#E3EEE1] bg-white px-3 py-1 text-xs font-medium text-[#434956]">
                {medicine.frequency}
              </span>
              <span className="rounded-full border border-[#E3EEE1] bg-white px-3 py-1 text-xs font-medium text-[#434956]">
                {medicine.timing}
              </span>
              <span className="rounded-full border border-[#EA580C]/30 bg-[#FFF7ED] px-3 py-1 text-xs font-semibold text-[#EA580C]">
                {medicine.duration}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { PATIENT_CARE_RECORD_TABS } from "@/lib/ipd-reception/patientCareRecordMock";
import type { PatientCareRecordTab } from "@/lib/ipd-reception/patientCareRecordTypes";

type PatientCareRecordTabsProps = {
  activeTab: PatientCareRecordTab;
  onTabChange: (tab: PatientCareRecordTab) => void;
};

export function PatientCareRecordTabs({ activeTab, onTabChange }: PatientCareRecordTabsProps) {
  return (
    <div className="mb-6 w-full" role="tablist">
      <div className="grid w-full grid-cols-4 gap-1 rounded-[32px] border border-[#E3EEE1] bg-white p-1">
        {PATIENT_CARE_RECORD_TABS.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab.value)}
              className={`w-full rounded-[28px] px-2 py-3 text-center text-xs font-semibold transition-colors sm:px-4 sm:text-sm ${
                isActive
                  ? "bg-[#0B8C00] text-white shadow-sm"
                  : "bg-transparent text-[#787E8C] hover:bg-[#F4FAF4]"
              }`}
            >
              <span className="block truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

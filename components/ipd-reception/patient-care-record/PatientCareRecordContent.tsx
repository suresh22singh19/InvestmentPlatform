"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { BackToPreviousPageButton } from "@/components/ui";
import { PatientCareRecordHeader } from "@/components/ipd-reception/patient-care-record/PatientCareRecordHeader";
import { PatientCareRecordTabs } from "@/components/ipd-reception/patient-care-record/PatientCareRecordTabs";
import { HistoryVisitsTab } from "@/components/ipd-reception/patient-care-record/HistoryVisitsTab";
import { MedicationsMarTab } from "@/components/ipd-reception/patient-care-record/MedicationsMarTab";
import { PatientCareTimelineOverview } from "@/components/ipd-reception/patient-care-record/PatientCareTimelineOverview";
import { TherapiesScheduleTab } from "@/components/ipd-reception/patient-care-record/TherapiesScheduleTab";
import {
  getPatientCareRecordProfile,
  MOCK_PATIENT_CARE_TIMELINE,
} from "@/lib/ipd-reception/patientCareRecordMock";
import type { PatientCareRecordTab } from "@/lib/ipd-reception/patientCareRecordTypes";

type PatientCareRecordContentProps = {
  patientId: string;
};

export function PatientCareRecordContent({ patientId }: PatientCareRecordContentProps) {
  const router = useRouter();
  const patient = getPatientCareRecordProfile(patientId);
  const [activeTab, setActiveTab] = useState<PatientCareRecordTab>("patient-summary");
  const [selectedDate, setSelectedDate] = useState("");

  return (
    <AppShell>
      <div className="mb-4">
        <BackToPreviousPageButton text="Back" onClick={() => router.back()} />
      </div>

      <PatientCareRecordHeader
        patient={patient}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
      />

      <PatientCareRecordTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "patient-summary" ? (
        <PatientCareTimelineOverview days={MOCK_PATIENT_CARE_TIMELINE} />
      ) : null}
      {activeTab === "medications" ? <MedicationsMarTab /> : null}
      {activeTab === "therapies" ? <TherapiesScheduleTab /> : null}
      {activeTab === "history" ? <HistoryVisitsTab /> : null}
    </AppShell>
  );
}

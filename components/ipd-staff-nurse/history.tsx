"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { DatePicker, SpinnerLoader } from "@/components/ui";
import { useStaffNurseGetPatientHistoryQuery } from "@/store/api/ipdStaffNurseAPI";
import { mapApiTimelineDayToUi, TimelineDayContent, type TimelineDay } from "./timeline";

type HistoryAdmission = {
  id: string;
  periodLabel: string;
  primaryDiagnosis: string;
  seniorConsultant: string;
  archived?: boolean;
  days: TimelineDay[];
};

function formatAdmissionDate(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDiagnosisName(diagnosisName: string, subDiagnosisName: string | null) {
  if (!diagnosisName?.trim()) return "N/A";
  if (!subDiagnosisName?.trim()) return diagnosisName;
  return `${diagnosisName} - ${subDiagnosisName}`;
}

export function PatientHistoryTab({
  patientId,
  branchId,
}: {
  patientId?: number;
  branchId?: number | null;
}) {
  const [historyDate, setHistoryDate] = useState("");
  const [expandedHistoryAdmissionIds, setExpandedHistoryAdmissionIds] = useState<string[]>([]);
  const [expandedHistoryDayIds, setExpandedHistoryDayIds] = useState<string[]>([]);

  const {
    data: patientHistoryRes,
    isLoading: isPatientHistoryLoading,
    isFetching: isPatientHistoryFetching,
  } = useStaffNurseGetPatientHistoryQuery(
    {
      patientId: patientId ?? 0,
      branchId: branchId ?? 0,
      fromDate: historyDate || undefined,
      toDate: historyDate || undefined,
    },
    {
      skip: !patientId || branchId == null,
      refetchOnMountOrArgChange: true,
    }
  );

  const historyAdmissions = useMemo<HistoryAdmission[]>(() => {
    const historyData = patientHistoryRes?.data;
    if (!historyData) return [];

    return [
      {
        id: `admission-${historyData.admissionDate}`,
        periodLabel: formatAdmissionDate(historyData.admissionDate),
        primaryDiagnosis: formatDiagnosisName(
          historyData.diagnosisName,
          historyData.subDiagnosisName
        ),
        seniorConsultant: historyData.doctorName || "N/A",
        days: historyData.history.map(mapApiTimelineDayToUi),
      },
    ];
  }, [patientHistoryRes?.data]);

  useEffect(() => {
    if (historyAdmissions.length === 0) {
      setExpandedHistoryAdmissionIds([]);
      setExpandedHistoryDayIds([]);
      return;
    }

    const admission = historyAdmissions[0];
    setExpandedHistoryAdmissionIds([admission.id]);
    setExpandedHistoryDayIds(admission.days[0] ? [admission.days[0].id] : []);
  }, [historyAdmissions]);

  const toggleHistoryAdmission = (admissionId: string) => {
    setExpandedHistoryAdmissionIds((prev) =>
      prev.includes(admissionId) ? prev.filter((id) => id !== admissionId) : [...prev, admissionId]
    );
  };

  const toggleHistoryDay = (dayId: string) => {
    setExpandedHistoryDayIds((prev) =>
      prev.includes(dayId) ? prev.filter((id) => id !== dayId) : [...prev, dayId]
    );
  };

  const isHistoryLoading = isPatientHistoryLoading || isPatientHistoryFetching;

  return (
    <div className="space-y-5">
      <section className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.06)]">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-medium text-[#262D3B]">Previous Visit History</h3>
          <div className="w-full sm:w-[220px]">
            <DatePicker
              label="Date"
              value={historyDate}
              onChange={setHistoryDate}
              placeholder="DD/MM/YY"
              // background="white"
              width="100%"
              disablePastDates={false}
            />
          </div>
        </div>

        {isHistoryLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#9CA3AF]">
            <SpinnerLoader size={18} />
            Loading patient history...
          </div>
        ) : historyAdmissions.length === 0 ? (
          <p className="py-16 text-center text-sm text-[#9CA3AF]">No patient history found.</p>
        ) : (
          <div className="space-y-4">
            {historyAdmissions.map((admission) => {
              const isAdmissionExpanded = expandedHistoryAdmissionIds.includes(admission.id);

              return (
                <div key={admission.id} className="overflow-hidden rounded-[16px] border border-[#EDF3EA] bg-white">
                  <button
                    type="button"
                    onClick={() => toggleHistoryAdmission(admission.id)}
                    className="flex w-full items-start justify-between gap-4 bg-[#F7FAF7] px-4 py-4 text-left transition-colors hover:bg-[#F2F8F2]"
                  >
                    <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-3">
                      <div>
                        <p className="text-[11px] text-[#9FA2AB]">Admission Period</p>
                        <p className="mt-1 text-sm font-semibold text-[#262D3B]">{admission.periodLabel}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-[#9FA2AB]">Primary Diagnosis</p>
                        <p className="mt-1 text-sm font-medium text-[#262D3B]">{admission.primaryDiagnosis}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-[#9FA2AB]">Senior Consultant</p>
                        <p className="mt-1 text-sm font-medium text-[#262D3B]">{admission.seniorConsultant}</p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {admission.archived ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#B4530933] bg-white px-2.5 py-1 text-[11px] font-medium text-[#B45309]">
                          <Image src="/icons/archivedDarkIcon.svg" alt="" width={12} height={12} />
                          Archived
                        </span>
                      ) : null}
                      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#0B8C00] text-[#0B8C00]">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path
                            d={isAdmissionExpanded ? "M6 15L12 9L18 15" : "M6 9L12 15L18 9"}
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    </div>
                  </button>

                  {isAdmissionExpanded ? (
                    <div className="relative space-y-5 border-t border-[#EDF3EA] p-4 pl-10">
                      <div className="absolute bottom-4 left-[23px] top-4 w-px bg-[#C8DFC5]" />

                      {admission.days.length === 0 ? (
                        <p className="py-8 text-center text-sm text-[#9CA3AF]">
                          {/* No history entries found for this admission. */}
                           No history record found.
                        </p>
                      ) : (
                        admission.days.map((day) => {
                          const isDayExpanded = expandedHistoryDayIds.includes(day.id);

                          return (
                            <div key={day.id} className="relative">
                              <button
                                type="button"
                                onClick={() => toggleHistoryDay(day.id)}
                                className="absolute -left-8 top-1 flex h-6 w-6 items-center justify-center rounded-full border border-[#0B8C00] bg-white text-[#0B8C00]"
                                aria-label={isDayExpanded ? `Collapse ${day.label}` : `Expand ${day.label}`}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                                  <path
                                    d={isDayExpanded ? "M6 15L12 9L18 15" : "M6 9L12 15L18 9"}
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </button>

                              <div className="mb-3 flex flex-wrap items-center gap-3">
                                <h4 className="text-sm font-semibold text-[#262D3B]">{day.label}</h4>
                                {day.badge ? (
                                  <span className="rounded-full border border-[#0B8C0033] bg-[#E8F5E9] px-2.5 py-1 text-[11px] font-medium text-[#0B8C00]">
                                    {day.badge}
                                  </span>
                                ) : null}
                              </div>

                              {isDayExpanded ? (
                                <TimelineDayContent day={day} query="" layout="history" />
                              ) : (
                                <div className="flex flex-col gap-3 rounded-[14px] border border-[#EDF3EA] bg-[#FCFDFC] p-4 lg:flex-row lg:items-center lg:justify-between">
                                  <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                    <div>
                                      <p className="text-[11px] text-[#9FA2AB]">Blood Pressure</p>
                                      <p className="mt-1 text-sm font-medium text-[#262D3B]">
                                        {day.summary.bloodPressure}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-[11px] text-[#9FA2AB]">Pulse Rate</p>
                                      <p className="mt-1 text-sm font-medium text-[#262D3B]">
                                        {day.summary.pulseRate}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-[11px] text-[#9FA2AB]">Therapies</p>
                                      <p className="mt-1 text-sm font-medium text-[#262D3B]">
                                        {day.summary.therapies}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-[11px] text-[#9FA2AB]">Notes</p>
                                      <p className="mt-1 text-sm font-medium text-[#262D3B]">
                                        {day.summary.notes}
                                      </p>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => toggleHistoryDay(day.id)}
                                    className="text-xs font-semibold tracking-wide text-[#0B8C00] hover:underline"
                                  >
                                    EXPAND DAY
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

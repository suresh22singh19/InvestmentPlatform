"use client";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { ActivityLogSection } from "@/components/ipd-reception/daily-operations/ActivityLogSection";
import { ClinicalRoundsSection } from "@/components/ipd-reception/daily-operations/ClinicalRoundsSection";
import { DailyOperationsStatsGrid } from "@/components/ipd-reception/daily-operations/DailyOperationsStatsGrid";
import { MedRoundsSummarySection } from "@/components/ipd-reception/daily-operations/MedRoundsSummarySection";
import { ScheduledTherapiesSection } from "@/components/ipd-reception/daily-operations/ScheduledTherapiesSection";
import {
  CLINICAL_ROUNDS_STATUS,
  DAILY_ACTIVITY_LOG,
  DAILY_OPERATIONS_STATS,
  MED_ROUNDS_SUMMARY,
  SCHEDULED_THERAPIES_TODAY,
} from "@/lib/ipd-reception/dailyOperationsMock";

export function DailyOperationsSummary() {
  return (
    <AppShell>
      <div className="mb-6">
        <PageHeading title="Daily Operations Summary" />
      </div>

      <DailyOperationsStatsGrid stats={DAILY_OPERATIONS_STATS} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <ScheduledTherapiesSection therapies={SCHEDULED_THERAPIES_TODAY} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <MedRoundsSummarySection wards={MED_ROUNDS_SUMMARY} />
            <ClinicalRoundsSection rounds={CLINICAL_ROUNDS_STATUS} />
          </div>
        </div>

        <div className="xl:col-span-1">
          <ActivityLogSection items={DAILY_ACTIVITY_LOG} />
        </div>
      </div>
    </AppShell>
  );
}

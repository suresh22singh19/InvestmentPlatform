"use client";

import { Badge } from "@/components/ui";
import type { ClinicalRoundItem } from "@/lib/ipd-reception/dailyOperationsTypes";

type ClinicalRoundsSectionProps = {
  rounds: ClinicalRoundItem[];
};

export function ClinicalRoundsSection({ rounds }: ClinicalRoundsSectionProps) {
  return (
    <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-[#262D3B]">Clinical Rounds Status</h2>
      <ul className="space-y-4">
        {rounds.map((round) => (
          <li
            key={round.id}
            className="border-b border-[#F0F2F0] pb-4 last:border-0 last:pb-0"
          >
            <p className="text-sm font-semibold text-[#262D3B]">{round.doctorName}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-[#9FA2AB]">STATUS:</span>
              <Badge
                variant={round.status === "completed" ? "success" : "neutral"}
                className="font-semibold uppercase"
              >
                {round.status}
              </Badge>
            </div>
            {round.lastRound ? (
              <p className="mt-1 text-xs text-[#525763]">
                <span className="font-medium text-[#434956]">Last Round:</span> {round.lastRound}
              </p>
            ) : null}
            {round.startTime ? (
              <p className="mt-1 text-xs text-[#525763]">
                <span className="font-medium text-[#434956]">Start Time:</span> {round.startTime}
              </p>
            ) : null}
            {round.patientsLabel ? (
              <p className="mt-0.5 text-xs font-medium text-[#0B8C00]">{round.patientsLabel}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

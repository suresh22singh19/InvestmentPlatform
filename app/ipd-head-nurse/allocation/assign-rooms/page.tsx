"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { AllNurseAllocation } from "@/components/ipd-head-nurse/allnurseAllocation";
import { useIPDNurseResolvedBranchId } from "@/hooks/useBranchFilter";

const VALID_SHIFTS = ["morning", "evening", "night"] as const;

export default function AssignRoomsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resolvedFilterBranchId } = useIPDNurseResolvedBranchId();

  const shiftParam = searchParams.get("shift");
  const initialShift = VALID_SHIFTS.find((shift) => shift === shiftParam);

  return (
    <AppShell>
      <AllNurseAllocation
        branchId={resolvedFilterBranchId}
        initialShift={initialShift}
        onBack={() => router.push("/ipd-head-nurse/nurse-coverage")}
        onConfirm={() => router.push("/ipd-head-nurse/nurse-coverage")}
      />
    </AppShell>
  );
}

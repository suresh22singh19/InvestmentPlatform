"use client";

import Image from "next/image";
import { Button } from "@/components/ui";
import { PageHeading } from "@/components/layout/PageHeading";

type DashboardHeaderProps = {
  onNewAdmission?: () => void;
};

export function DashboardHeader({ onNewAdmission }: DashboardHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <PageHeading title="IPD Reception Dashboard" />
      <Button
        variant="outline"
        size="medium"
        className="!min-w-0 shrink-0 whitespace-nowrap"
        leftIcon={<Image src="/icons/AddIcon.svg" alt="" width={18} height={18} />}
        onClick={onNewAdmission}
      >
        New Admission
      </Button>
    </div>
  );
}

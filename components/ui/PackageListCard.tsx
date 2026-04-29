"use client";

import Image from "next/image";
import { Tooltip } from "@/components/ui";

export type PackageCard = {
  id: number;
  name: string;
  description: string;
  priceLabel: string;
  updatedLabel: string;
  status: "Active" | "Draft" | "Archived";
  statusClassName: string;
  branchName: string;
};

type PackageListCardProps = {
  pkg: PackageCard;
  rowNum: number;
  showActions: boolean;
  onEdit: (pkg: PackageCard) => void;
  onArchive: (pkg: PackageCard) => void;
};

export function PackageListCard({ pkg, rowNum, showActions, onEdit, onArchive }: PackageListCardProps) {
  return (
    <div className="w-full rounded-[20px] border border-[#DFE0E2] bg-white p-5 shadow-[0px_1px_8px_rgba(25,33,61,0.06)]">
      <div className="-mx-5 mb-5 flex items-start justify-between gap-3 border-b border-[#DFE0E2] px-5 pb-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#EBECED] bg-[#F2F8F2] text-sm font-medium text-[#7B8088]">
            {rowNum}
          </div>
          <div className="min-w-0 flex-1 overflow-hidden leading-[16px]">
            <Tooltip
              position="top"
              content={
                <span className="inline-block w-max whitespace-normal break-words text-left text-inherit">
                  {pkg.name}
                </span>
              }
            >
              <h3 className="block w-full truncate text-base font-semibold leading-[120%] text-[#434956]">
                {pkg.name}
              </h3>
            </Tooltip>
            <p className="text-xs leading-[120%] text-[#525763]">{pkg.updatedLabel}</p>
          </div>
        </div>
        <span
          className={`inline-flex h-[30px] min-w-[76px] shrink-0 items-center justify-center rounded-[30px] border px-5 text-xs font-medium leading-[120%] ${pkg.statusClassName}`}
        >
          {pkg.status}
        </span>
      </div>

      <div className="mb-5 flex items-center justify-between gap-3">
        <span className="shrink-0 text-sm font-medium leading-[120%] text-[#7B8088]">Branch</span>
        <span className="min-w-0 truncate text-right text-sm font-semibold leading-[120%] text-[#434956]">
          {pkg.branchName}
        </span>
      </div>

      <div className="mb-5 gap-6">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 flex-1 truncate font-normal font-medium text-[14px] leading-[120%] text-[#262D3B]">
            {pkg.description}
          </p>
          <p className="shrink-0 whitespace-nowrap font-normal font-medium text-[14px] leading-[120%] text-[#262D3B]">
            {pkg.priceLabel}
          </p>
        </div>
      </div>

      {showActions ? (
        <div className="-mx-5 flex items-center gap-2  px-5 pt-5">
          <button
            type="button"
            onClick={() => onEdit(pkg)}
            className="cursor-pointer flex h-[30px] flex-1 items-center justify-center gap-1 rounded-[32px] bg-[#0B8C00] px-4 text-xs font-medium leading-[120%] text-white transition-colors hover:bg-[#0A7F00]"
          >
            <Image src="/icons/EditLightIcon.svg" alt="Edit" width={14} height={14} className="shrink-0" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => onArchive(pkg)}
            disabled={pkg.status === "Archived"}
            className="cursor-pointer flex h-[30px] flex-1 items-center justify-center gap-1 rounded-[32px] bg-[#0B8C00] px-4 text-xs font-medium leading-[120%] text-white transition-colors hover:bg-[#0A7F00] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Image src="/icons/archivedicon.svg" alt="Archive" width={14} height={14} className="shrink-0" />
            Archive
          </button>
        </div>
      ) : null}
    </div>
  );
}

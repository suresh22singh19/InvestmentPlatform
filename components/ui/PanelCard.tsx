"use client";

import Image from "next/image";

type PanelCardProps = {
  id: number;
  name: string;
  status: "Active" | "Inactive";
  onView: () => void;
  onEdit: () => void;
};

export const PanelCard = ({
  id,
  name,
  status,
  onView,
  onEdit,
}: PanelCardProps) => {
  return (
    <div className="relative flex w-full flex-col overflow-hidden rounded-[12px] border border-[#DFE0E2] bg-white pt-4 pb-6 px-4 shadow-[0px_6px_40px_rgba(0,0,0,0.02)]">
      <div className="mb-6 flex items-start justify-between">
        {status === "Active" ? (
          <span
            className="inline-flex h-[30px] min-w-[86px] shrink-0 items-center justify-center rounded-[30px] rounded-l-none border border-t border-r border-b border-l-0 border-[#0B8C00]/20 bg-[#0B8C000D] px-5 text-xs font-medium leading-[120%] text-[#0B8C00] -ml-4"
          >
            {status}
          </span>
        ) : (
          <span></span>
        )}
        {status === "Inactive" ? (
          <span
            className="inline-flex h-[30px] min-w-[86px] shrink-0 items-center justify-center rounded-[30px] rounded-r-none border border-t border-l border-b border-r-0 border-[#F6776E]/24 bg-[#F6776E0D] px-5 text-xs font-medium leading-[120%] text-[#F6776E] -mr-4"
          >
            {status}
          </span>
        ) : (
          <span></span>
        )}
      </div>

      <div className="mb-6 flex-1">
        <h3 className="text-center text-xl font-semibold leading-[130%] text-[#262D3B]">{name}</h3>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onView}
          className="flex h-[30px] flex-1 items-center justify-center gap-1 rounded-[32px] bg-[#0B8C00] px-4 text-xs font-medium leading-[120%] text-white transition-colors hover:bg-[#0A7F00]"
        >
          <Image src="/icons/ViewLightIcon.svg" alt="View" width={14} height={14} className="shrink-0" />
          View
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="flex h-[30px] flex-1 items-center justify-center gap-1 rounded-[32px] bg-[#0B8C00] px-4 text-xs font-medium leading-[120%] text-white transition-colors hover:bg-[#0A7F00]"
        >
          <Image src="/icons/EditLightIcon.svg" alt="Edit" width={14} height={14} className="shrink-0" />
          Edit
        </button>
      </div>
    </div>
  );
};


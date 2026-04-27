"use client";

import Image from "next/image";
import { Tooltip } from "./Tooltip";

type PanelCardProps = {
  id: number;
  name: string;
  status: "Active" | "Inactive";
  isDefaultPanel?: boolean;
  onEdit: () => void;
  /** Default: View + Edit. `edit-delete` for Edit + Delete. `view-edit-delete` for all three actions. */
  variant?: "view-edit" | "edit-delete" | "view-edit-delete";
  onView?: () => void;
  onDelete?: () => void;
  /** When false, Active/Inactive pill is hidden (e.g. Facilities). Default true. */
  showStatusBadge?: boolean;
  /** Hide View action (e.g. permission-based). Default true. */
  showViewButton?: boolean;
  /** Hide Edit action (e.g. permission-based). Default true. */
  showEditButton?: boolean;
  /**
   * `chargeable`: show Yes/No with hover tooltips (Chargeable / Non-Chargeable). Room type master.
   * `standard`: show Active/Inactive text (default).
   */
  statusBadgeVariant?: "standard" | "chargeable";
  /** When `statusBadgeVariant` is chargeable; default Chargeable / Non-Chargeable. */
  statusYesNoTooltips?: { yes: string; no: string };
};

export const PanelCard = ({
  id,
  name,
  status,
  isDefaultPanel = false,
  variant = "view-edit",
  onView,
  onEdit,
  onDelete,
  showStatusBadge = true,
  showViewButton = true,
  showEditButton = true,
  statusBadgeVariant = "standard",
  statusYesNoTooltips = { yes: "Chargeable", no: "Non-Chargeable" },
}: PanelCardProps) => {
  const activeBadgeClass =
    "inline-flex h-[30px] min-w-[86px] shrink-0 cursor-default items-center justify-center rounded-[30px] rounded-l-none border border-t border-r border-b border-l-0 border-[#0B8C00]/20 bg-[#0B8C000D] px-5 text-xs font-medium leading-[120%] text-[#0B8C00] -ml-4";
  const inactiveBadgeClass =
    "inline-flex h-[30px] min-w-[86px] shrink-0 cursor-default items-center justify-center rounded-[30px] rounded-r-none border border-t border-l border-b border-r-0 border-[#F6776E]/24 bg-[#F6776E0D] px-5 text-xs font-medium leading-[120%] text-[#F6776E] -mr-4";

  return (
    <div className={`relative flex w-full flex-col overflow-hidden rounded-[12px] border border-[#DFE0E2] bg-white pt-4 pb-6 px-4 shadow-[0px_6px_40px_rgba(0,0,0,0.02)] ${isDefaultPanel ? 'cursor-not-allowed' : ''}`}>
      {showStatusBadge ? (
        <div className="mb-6 flex items-start justify-between">
          {status === "Active" ? (
            statusBadgeVariant === "chargeable" ? (
              <Tooltip content={statusYesNoTooltips.yes} position="top">
                <span className={activeBadgeClass}>Yes</span>
              </Tooltip>
            ) : (
              <span className={activeBadgeClass}>{status}</span>
            )
          ) : (
            <span></span>
          )}
          {status === "Inactive" ? (
            statusBadgeVariant === "chargeable" ? (
              <Tooltip content={statusYesNoTooltips.no} position="top">
                <span className={inactiveBadgeClass}>No</span>
              </Tooltip>
            ) : (
              <span className={inactiveBadgeClass}>{status}</span>
            )
          ) : (
            <span></span>
          )}
        </div>
      ) : (
        <div className="mb-6 h-[30px] shrink-0" aria-hidden />
      )}

      <div className="mb-6 flex-1">
        <h3 className="text-center text-xl font-semibold leading-[130%] text-[#262D3B]">{name}</h3>
      </div>

      <div className="flex items-center gap-3">
        {variant === "edit-delete" ? (
          <>
            <button
              type="button"
              onClick={isDefaultPanel ? undefined : onEdit}
              disabled={isDefaultPanel}
              className={`flex h-[30px] flex-1 items-center justify-center gap-1 rounded-[32px] bg-[#0B8C00] px-4 text-xs font-medium leading-[120%] text-white transition-colors ${
                isDefaultPanel
                  ? "cursor-not-allowed opacity-70"
                  : "cursor-pointer hover:bg-[#0A7F00]"
              }`}
            >
              <Image src="/icons/EditLightIcon.svg" alt="Edit" width={14} height={14} className="shrink-0" />
              Edit
            </button>
            {onDelete ? (
              <button
                type="button"
                onClick={isDefaultPanel ? undefined : onDelete}
                disabled={isDefaultPanel}
                className={`flex h-[30px] flex-1 items-center justify-center gap-1 rounded-[32px] bg-[#0B8C00] px-4 text-xs font-medium leading-[120%] text-white transition-colors ${
                  isDefaultPanel
                    ? "cursor-not-allowed opacity-70"
                    : "cursor-pointer hover:bg-[#0A7F00]"
                }`}
              >
                <Image src="/icons/DeleteWhiteIcon.svg" alt="Delete" width={14} height={15} className="shrink-0" />
                Delete
              </button>
            ) : null}
          </>
        ) : variant === "view-edit-delete" ? (
          <>
            {showViewButton ? (
              <button
                type="button"
                onClick={onView}
                className="flex h-[30px] flex-1 items-center justify-center gap-1 rounded-[32px] bg-[#0B8C00] px-3 text-xs font-medium leading-[120%] text-white transition-colors hover:bg-[#0A7F00]"
              >
                <Image src="/icons/ViewLightIcon.svg" alt="View" width={14} height={14} className="shrink-0" />
                View
              </button>
            ) : null}
            {showEditButton ? (
              <button
                type="button"
                onClick={isDefaultPanel ? undefined : onEdit}
                disabled={isDefaultPanel}
                className={`flex h-[30px] flex-1 items-center justify-center gap-1 rounded-[32px] bg-[#0B8C00] px-3 text-xs font-medium leading-[120%] text-white transition-colors ${
                  isDefaultPanel
                    ? "cursor-not-allowed opacity-70"
                    : "cursor-pointer hover:bg-[#0A7F00]"
                }`}
              >
                <Image src="/icons/EditLightIcon.svg" alt="Edit" width={14} height={14} className="shrink-0" />
                Edit
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                onClick={isDefaultPanel ? undefined : onDelete}
                disabled={isDefaultPanel}
                className={`flex h-[30px] flex-1 items-center justify-center gap-1 rounded-[32px] bg-[#0B8C00] px-3 text-xs font-medium leading-[120%] text-white transition-colors ${
                  isDefaultPanel
                    ? "cursor-not-allowed opacity-70"
                    : "cursor-pointer hover:bg-[#0A7F00]"
                }`}
              >
                <Image src="/icons/DeleteWhiteIcon.svg" alt="Delete" width={14} height={15} className="shrink-0" />
                Delete
              </button>
            ) : null}
          </>
        ) : (
          <>
            {showViewButton ? (
              <button
                type="button"
                onClick={onView}
                className="flex h-[30px] flex-1 items-center justify-center gap-1 rounded-[32px] bg-[#0B8C00] px-4 text-xs font-medium leading-[120%] text-white transition-colors hover:bg-[#0A7F00]"
              >
                <Image src="/icons/ViewLightIcon.svg" alt="View" width={14} height={14} className="shrink-0" />
                View
              </button>
            ) : null}
            {showEditButton ? (
              <button
                type="button"
                onClick={isDefaultPanel ? undefined : onEdit}
                disabled={isDefaultPanel}
                className={`flex h-[30px] flex-1 items-center justify-center gap-1 rounded-[32px] bg-[#0B8C00] px-4 text-xs font-medium leading-[120%] text-white transition-colors ${
                  isDefaultPanel
                    ? "cursor-not-allowed"
                    : "hover:bg-[#0A7F00] cursor-pointer"
                }`}
              >
                <Image src="/icons/EditLightIcon.svg" alt="Edit" width={14} height={14} className="shrink-0" />
                Edit
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};


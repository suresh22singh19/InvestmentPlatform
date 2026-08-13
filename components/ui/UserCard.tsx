"use client";

import Image from "next/image";
import { useState } from "react";
import { Tooltip } from "@/components/ui";
import { MessageDialog } from "@/components/ui/MessageDialog";

/** Long names wrap inside the tooltip up to this width; short names stay tight to the text. */
const USER_CARD_NAME_TOOLTIP_MAX_WIDTH_PX = 240;

type UserCardProps = {
  id: number;
  name: string;
  email: string;
  branch: string;
  phone: string;
  groupRole: string;
  permissionDate: string;
  lastLogin: string;
  status: "Active" | "Inactive";
  onView: () => void;
  onEdit: () => void;
  onSetDate: () => void;
  onStatusToggle?: () => void;
  isTogglingStatus?: boolean;
  showViewButton?: boolean;
  showEditButton?: boolean;
};

export const UserCard = ({
  id,
  name,
  email,
  branch,
  phone,
  groupRole,
  permissionDate,
  lastLogin,
  status,
  onView,
  onEdit,
  onStatusToggle,
  isTogglingStatus = false,
  showViewButton = true,
  showEditButton = true,
}: UserCardProps) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const nextStatus = status === "Active" ? "Inactive" : "Active";

  const handleStatusClick = () => {
    if (!onStatusToggle || isTogglingStatus) return;
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    onStatusToggle?.();
  };

  return (
    <div className="w-full rounded-[20px] border border-[#DFE0E2] bg-white p-5 shadow-[0px_1px_8px_rgba(25,33,61,0.06)]">
      <div className="-mx-5 mb-5 flex items-start justify-between gap-3 border-b border-[#DFE0E2] px-5 pb-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F2F8F2] text-sm font-medium text-[#0B8C00]">
            {id}
          </div>
          <div className="min-w-0 flex-1">
            <Tooltip
              position="top"
              maxWidth={USER_CARD_NAME_TOOLTIP_MAX_WIDTH_PX + 48}
              content={
                <span
                  className="inline-block w-max whitespace-normal break-words text-left text-inherit"
                  style={{ maxWidth: USER_CARD_NAME_TOOLTIP_MAX_WIDTH_PX }}
                >
                  {name}
                </span>
              }
            >
              <h3 className="inline-block w-max max-w-full truncate text-base font-semibold leading-[120%] text-[#434956]">
                {name}
              </h3>
            </Tooltip>
            <p className="mt-0.5 text-xs leading-[120%] text-[#525763]">{email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleStatusClick}
          disabled={isTogglingStatus || !onStatusToggle}
          className={`inline-flex h-[30px] min-w-[76px] shrink-0 items-center justify-center rounded-[30px] border px-5 text-xs font-medium leading-[120%] transition-colors ${status === "Active"
              ? "border-[#0B8C00]/20 bg-[#F2F8F2] text-[#0B8C00] hover:bg-[#E8F5E9]"
              : "border-[#F6776E] bg-white text-[#F6776E] hover:bg-[#FFF0EF]"
            } ${onStatusToggle ? "cursor-pointer" : "cursor-default"} ${isTogglingStatus ? "opacity-50 pointer-events-none" : ""}`}
        >
          {isTogglingStatus ? "..." : status}
        </button>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-6">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F2F8F2]">
            <Image src="/icons/CallDarkIcon.svg" alt="Branch" width={16} height={16} />
          </div>
          <div className="min-w-0">
            <p className="text-xs leading-[120%] text-[#7B8089]">Branch</p>
            <p className="mt-0.5 text-sm font-medium leading-[120%] text-[#434956]">{branch}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F2F8F2]">
            <Image src="/icons/CallDarkIcon.svg" alt="Phone" width={16} height={16} />
          </div>
          <div className="min-w-0">
            <p className="text-xs leading-[120%] text-[#7B8089]">Phone</p>
            <p className="mt-0.5 text-sm font-medium leading-[120%] text-[#434956]">{phone}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F2F8F2]">
            <Image src="/icons/CalendarDarkIcon.svg" alt="Group/Role" width={16} height={16} />
          </div>
          <div className="min-w-0">
            <p className="text-xs leading-[120%] text-[#7B8089]">Group/Role</p>
            <p className="mt-0.5 text-sm font-medium leading-[120%] text-[#434956]">{groupRole}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F2F8F2]">
            <Image src="/icons/CalendarDarkIcon.svg" alt="Permission date" width={16} height={16} />
          </div>
          <div className="min-w-0">
            <p className="text-xs leading-[120%] text-[#7B8089]">Created At</p>
            <p className="mt-0.5 text-sm font-medium leading-[120%] text-[#434956]">{permissionDate}</p>
          </div>
        </div>

        <div className="col-span-2 flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F2F8F2]">
            <Image src="/icons/CalendarDarkIcon.svg" alt="Last Login" width={16} height={16} />
          </div>
          <div className="min-w-0">
            <p className="text-xs leading-[120%] text-[#7B8089]">Last Login</p>
            <p className="mt-0.5 text-sm font-medium leading-[120%] text-[#434956]">{lastLogin}</p>
          </div>
        </div>
      </div>

      <div className="-mx-5 flex items-center gap-2 border-t border-[#DFE0E2] px-5 pt-5">
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
            onClick={onEdit}
            className="flex h-[30px] flex-1 items-center justify-center gap-1 rounded-[32px] bg-[#0B8C00] px-4 text-xs font-medium leading-[120%] text-white transition-colors hover:bg-[#0A7F00]"
          >
            <Image src="/icons/EditLightIcon.svg" alt="Edit" width={14} height={14} className="shrink-0" />
            Edit
          </button>
        ) : null}
      </div>

      <MessageDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        icon="/icons/questionMark.svg"
        iconBgColor="#E8F5E9"
        message={`Are you sure you want to ${nextStatus === "Active" ? "Activate" : "Inactive"} this user?`}
        confirmText={`Yes, ${nextStatus === "Active" ? "Activate" : "Inactive"}`}
        cancelText="Cancel"
        showCancel
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
        isActionLoading={isTogglingStatus}
      />
    </div>
  );
};

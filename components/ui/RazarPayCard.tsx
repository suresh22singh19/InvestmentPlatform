"use client";

import Image from "next/image";

type RazarPayCardProps = {
  /** Sequential display position in the list (1, 2, 3, ...), not the record's database id. */
  index: number;
  roleName: string;
  username: string;
  branch: string;
  password: string;
  razarpayTid: string;
  razarpayDeviceId: string;
  assignUser: string;
  createdAt: string;
  status: "Active" | "Inactive";
  onEdit: () => void;
  onView: () => void;
  canView?: boolean;
  canEdit?: boolean;
};

export const RazarPayCard = ({
  index,
  roleName,
  username,
  branch,
  password,
  razarpayTid,
  razarpayDeviceId,
  assignUser,
  createdAt,
  status,
  onEdit,
  onView,
  canView = true,
  canEdit = true,
}: RazarPayCardProps) => {
  return (
    <div className="w-full rounded-[20px] border border-[#DFE0E2] bg-white p-5 shadow-[0px_1px_8px_rgba(25,33,61,0.06)]">
      {/* Header Section */}
      <div className="-mx-5 mb-5 flex items-start justify-between border-b border-[#DFE0E2] px-5 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F2F8F2] text-sm font-medium text-[#0B8C00]">
            {index}
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold leading-[120%] text-[#434956]">{roleName}</h3>
            <p className="mt-0.5 text-xs leading-[120%] text-[#525763]">{username}</p>
          </div>
        </div>
        <span
          className={`inline-flex h-[30px] min-w-[76px] shrink-0 items-center justify-center rounded-[30px] border px-5 text-xs font-medium leading-[120%] ${
            status === "Active"
              ? "border-[#0B8C00]/20 bg-[#0B8C000D] text-[#0B8C00]"
              : "border-[#F6776E]/24 bg-[#F6776E0D] text-[#F6776E]"
          }`}
        >
          {status}
        </span>
      </div>

      {/* Details Section - Two Columns */}
      <div className="mb-5 grid grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          <div>
            <p className="text-xs leading-[120%] text-[#7B8089]">Branch</p>
            <p className="mt-0.5 text-sm font-medium leading-[120%] text-[#262D3B]">{branch}</p>
          </div>
          <div>
            <p className="text-xs leading-[120%] text-[#7B8089]">Razarpay Tid</p>
            <p className="mt-0.5 text-sm font-medium leading-[120%] text-[#262D3B]">{razarpayTid}</p>
          </div>
          <div>
            <p className="text-xs leading-[120%] text-[#7B8089]">Assign User</p>
            <p className="mt-0.5 text-sm font-medium leading-[120%] text-[#262D3B]">{assignUser}</p>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <div>
            <p className="text-xs leading-[120%] text-[#7B8089]">Password</p>
            <p className="mt-0.5 text-sm font-medium leading-[120%] text-[#262D3B]">{password}</p>
          </div>
          <div>
            <p className="text-xs leading-[120%] text-[#7B8089]">Razarpay DeviceId</p>
            <p className="mt-0.5 text-sm font-medium leading-[120%] text-[#262D3B]">{razarpayDeviceId}</p>
          </div>
          <div>
            <p className="text-xs leading-[120%] text-[#7B8089]">Created At</p>
            <p className="mt-0.5 text-sm font-medium leading-[120%] text-[#262D3B]">{createdAt}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {(canView || canEdit) && (
        <div className="-mx-5 flex items-center gap-3 border-t border-[#DFE0E2] px-5 pt-5">
          {canView && (
            <button
              type="button"
              onClick={onView}
              className="flex h-[30px] flex-1 items-center justify-center gap-1 rounded-[32px] bg-[#0B8C00] px-4 text-xs font-medium leading-[120%] text-white transition-colors hover:bg-[#0A7F00]"
            >
              <Image
                src="/icons/ViewEyeIcon.svg"
                alt="View"
                width={14}
                height={14}
                className="shrink-0 brightness-0 invert"
              />
              View
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="flex h-[30px] flex-1 items-center justify-center gap-1 rounded-[32px] bg-[#0B8C00] px-4 text-xs font-medium leading-[120%] text-white transition-colors hover:bg-[#0A7F00]"
            >
              <Image src="/icons/EditLightIcon.svg" alt="Edit" width={14} height={14} className="shrink-0" />
              Edit
            </button>
          )}
        </div>
      )}
    </div>
  );
};



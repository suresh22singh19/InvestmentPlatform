"use client";

import Image from "next/image";

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
  onSetDate,
}: UserCardProps) => {
  return (
    <div className="w-full rounded-[20px] border border-[#DFE0E2] bg-white p-5 shadow-[0px_1px_8px_rgba(25,33,61,0.06)]">
      <div className="-mx-5 mb-5 flex items-start justify-between border-b border-[#DFE0E2] px-5 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F2F8F2] text-sm font-medium text-[#0B8C00]">
            {id}
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold leading-[120%] text-[#434956]">{name}</h3>
            <p className="mt-0.5 text-xs leading-[120%] text-[#525763]">{email}</p>
          </div>
        </div>
        <span
          className={`inline-flex h-[30px] min-w-[76px] shrink-0 items-center justify-center rounded-[30px] border px-5 text-xs font-medium leading-[120%] ${
            status === "Active"
              ? "border-[#0B8C00]/20 bg-[#F2F8F2] text-[#0B8C00]"
              : "border-[#F6776E] bg-white text-[#F6776E]"
          }`}
        >
          {status}
        </span>
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
            <p className="text-xs leading-[120%] text-[#7B8089]">Permission date</p>
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
        <button
          type="button"
          onClick={onSetDate}
          className="flex h-[30px] flex-1 items-center justify-center gap-1 rounded-[32px] bg-[#0B8C00] px-4 text-xs font-medium leading-[120%] text-white transition-colors hover:bg-[#0A7F00]"
        >
          <Image src="/icons/CalenderLightIcon.svg" alt="Set Date" width={14} height={14} className="shrink-0" />
          Set Date
        </button>
      </div>
    </div>
  );
};


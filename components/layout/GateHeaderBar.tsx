"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import ScrollableContainer from "@/components/ui/ScrollableContainer";
import { MessageDialog } from "@/components/ui/MessageDialog";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import {
  selectBranchAccess,
  selectSelectedBranch,
  selectUser,
  setSelectedBranch,
} from "@/store/slices/authSlice";
import { baseApi } from "@/store/api/baseApi";
import { useLogoutMutation } from "@/store/api/authApi";

type GateHeaderBarProps = {
  userName?: string | null;
  userRole?: string;
  onLogout?: () => void;
};

export function GateHeaderBar({
  userName,
  userRole = "Admin",
  onLogout,
}: GateHeaderBarProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const branchAccess = useAppSelector(selectBranchAccess) ?? [];
  const selectedBranch = useAppSelector(selectSelectedBranch);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [profileImageFailed, setProfileImageFailed] = useState(false);
  const [showLogoutSuccess, setShowLogoutSuccess] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const [logoutApi] = useLogoutMutation();

  useEffect(() => {
    setProfileImageFailed(false);
  }, [user?.imgUrl]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = useMemo(() => {
    if (userName) return userName;
    return "User";
  }, [userName]);

  return (
    <header className="flex w-full items-center justify-between gap-4 px-5 py-3">
      <div className="flex items-center">
        <Logo width={140} height={53} />
      </div>

      <div className="flex items-center gap-3">
        <div
          ref={accountMenuRef}
          className="relative flex items-center gap-3"
        >
          {user?.imgUrl && !profileImageFailed ? (
            <Image
              src={user.imgUrl}
              alt=""
              width={44}
              height={44}
              className="h-11 w-11 rounded-full object-cover"
              unoptimized
              onError={() => setProfileImageFailed(true)}
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0B8C00] text-base font-semibold text-white">
              {userName?.[0]?.toUpperCase() ?? "A"}
            </div>
          )}
          <div
            className="text-left text-sm cursor-pointer"
            onClick={() => setIsAccountMenuOpen((prev) => !prev)}
          >
            <p className="font-semibold text-[#262D3B]">{`Welcome ${displayName}`}</p>
            <p className="text-xs text-[#8A8F9B]">{userRole}</p>
          </div>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center text-[#262D3B] transition cursor-pointer"
            aria-label="Account menu"
            aria-expanded={isAccountMenuOpen}
            onClick={() => setIsAccountMenuOpen((prev) => !prev)}
          >
            <Image
              src="/icons/ArrowDown.svg"
              alt="Expand menu"
              width={16}
              height={16}
              className={`transition-transform ${isAccountMenuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {isAccountMenuOpen && (
            <div className="absolute right-0 top-full mt-3 w-[200px] overflow-hidden rounded-2xl border border-[#ECF0ED] bg-white shadow-[0px_24px_48px_rgba(34,56,43,0.12)] z-50">
              {branchAccess.length > 0 && (
                <div className="px-2 py-2 border-b border-[#ECF0ED]">
                  <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8A8F9B]">
                    Branch Access ({branchAccess.length})
                  </p>
                  <ScrollableContainer maxHeight="220px">
                    {branchAccess.map((branch) => {
                      const isActiveBranch = selectedBranch?.id === branch.id;
                      return (
                        <button
                          key={branch.id}
                          type="button"
                          className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-xs transition ${
                            isActiveBranch
                              ? "bg-[#E9F8E8] text-[#0B8C00] font-semibold"
                              : "text-[#434956] hover:bg-[#F2F8F2]"
                          }`}
                          onClick={() => {
                            dispatch(setSelectedBranch(branch.id));
                            dispatch(baseApi.util.resetApiState());
                            setIsAccountMenuOpen(false);
                          }}
                        >
                          <span className="min-w-0">
                            <span className="block truncate">{branch.name}</span>
                            <span className="block text-[10px] uppercase tracking-[0.06em] text-[#8A8F9B]">
                              {branch.type}
                            </span>
                          </span>
                          {isActiveBranch && (
                            <Image src="/icons/check.svg" alt="Selected branch" width={14} height={14} />
                          )}
                        </button>
                      );
                    })}
                  </ScrollableContainer>
                </div>
              )}
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-[#262D3B] transition hover:bg-[#F2F8F2] cursor-pointer"
                onClick={() => {
                  setIsAccountMenuOpen(false);
                  router.push("/profile");
                }}
              >
                <Image src="/icons/ProfileIcon.svg" alt="My profile" width={20} height={20} />
                My Profile
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-[#D14D4F] transition hover:bg-[#FFF2F2] cursor-pointer"
                onClick={async () => {
                  setIsAccountMenuOpen(false);
                  try {
                    await logoutApi().unwrap();
                  } catch {
                    // proceed with logout even if API fails
                  }
                  setShowLogoutSuccess(true);
                }}
              >
                <Image src="/icons/LogOutIcon.svg" alt="Logout" width={20} height={20} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      <MessageDialog
        open={showLogoutSuccess}
        onClose={() => {
          setShowLogoutSuccess(false);
          onLogout?.();
        }}
  icon="/icons/SuccessCheck.svg"
        iconBgColor="#E9F8E8"
        message="Logout successfully"
        confirmText="OK"
        showCancel={false}
        onConfirm={() => {
          setShowLogoutSuccess(false);
          onLogout?.();
        }}
      />
    </header>
  );
}

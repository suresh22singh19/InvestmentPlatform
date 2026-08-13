"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Logo } from "@/components/ui/Logo";
import { SearchBar } from "@/components/ui/SearchBar";
import { FormSelectField } from "@/components/ui/FormSelectField";
import type { SelectOption } from "@/components/ui/FormSelectField";
import { NotificationDropdown } from "./Notification";
import PatientAlreadyExistsDialog from "@/components/registration/PatientAlreadyExistsDialog";
import { MessageDialog } from "@/components/ui/MessageDialog";
import ScrollableContainer from "@/components/ui/ScrollableContainer";
import { baseApi } from "@/store/api/baseApi";
import { useLazyGlobalPatientSearchQuery, useGetArogyaCardSeriesQuery } from "@/store/api/registrationApi";
import type { GlobalPatientSearchAppointment } from "@/store/api/registrationApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectBranchAccess,
  selectSelectedBranch,
  selectUser,
  setSelectedBranch,
} from "@/store/slices/authSlice";
import { useLogoutMutation } from "@/store/api/authApi";
import { logoutJatayu } from "@/store/api/jatayuApi";
import { ThreeDotLoader } from "@/components/ui/ThreeDotLoader";
import { FaCrown } from "react-icons/fa";
import { FiBell, FiChevronDown } from "react-icons/fi";

const GLOBAL_SEARCH_TYPE_OPTIONS: SelectOption[] = [
  { label: "None", value: "" },
  { label: "UHID", value: "uhid" },
  { label: "Phone No.", value: "phone" },
  { label: "Patient Name", value: "patientname" },
  { label: "Pre-booking", value: "prebooking" },
  { label: "Health Card No.", value: "jsHealthCardNo" },
  { label: "OPD Number", value: "opdNumber" },

];



type HeaderAction = {
  key: string;
  iconSrc: string;
  alt: string;
  badge?: number;
  onClick?: () => void;
};

type HeaderBarProps = {
  userEmail?: string | null;
  userRole?: string;
  onLogout?: () => void;
  actions?: HeaderAction[];
  onToggleNav?: () => void;
};

export function HeaderBar({
  userEmail,
  userRole = "",
  onLogout,
  actions,
  onToggleNav,
}: HeaderBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const branchAccess = useAppSelector(selectBranchAccess) ?? [];
  const selectedBranch = useAppSelector(selectSelectedBranch);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [isPatientDialogOpen, setIsPatientDialogOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<GlobalPatientSearchAppointment[]>([]);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showLogoutSuccess, setShowLogoutSuccess] = useState(false);
  const [profileImageFailed, setProfileImageFailed] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const notificationRef = useRef<HTMLDivElement | null>(null);

  const [triggerGlobalSearch, { isLoading: isSearching }] = useLazyGlobalPatientSearchQuery();
  const [logoutApi] = useLogoutMutation();

  const { data: arogyaCardSeries } = useGetArogyaCardSeriesQuery(
    { id: 21, branchId: selectedBranch?.id ? Number(selectedBranch?.id) : undefined },
    { skip: !selectedBranch?.id || Number(selectedBranch?.id) === 0 || !pathname?.startsWith("/registration") }
  );

  const cardLengthInfo = useMemo(() => {
    const d = arogyaCardSeries?.data;
    if (Array.isArray(d) && d.length > 0) {
      let absoluteMin = 12;
      let absoluteMax = 12;
      d.forEach((series, idx) => {
        const s = String(series.seriesStart || "").replace(/\D/g, "");
        const e = series.seriesEnd != null ? String(series.seriesEnd || "").replace(/\D/g, "") : s;
        if (s) {
          const currentMin = Math.min(s.length, e.length);
          const currentMax = Math.max(s.length, e.length);
          if (idx === 0) {
            absoluteMin = currentMin;
            absoluteMax = currentMax;
          } else {
            absoluteMin = Math.min(absoluteMin, currentMin);
            absoluteMax = Math.max(absoluteMax, currentMax);
          }
        }
      });
      return { min: absoluteMin, max: absoluteMax };
    }

    const singleSeries = d as any;
    if (singleSeries && singleSeries.seriesStart) {
      const s = String(singleSeries.seriesStart).replace(/\D/g, "");
      const e = singleSeries.seriesEnd != null ? String(singleSeries.seriesEnd).replace(/\D/g, "") : s;
      return {
        min: Math.min(s.length, e.length),
        max: Math.max(s.length, e.length),
      };
    }

    return { min: 12, max: 12 };
  }, [arogyaCardSeries]);

  const searchValidationSchema = useMemo(() => {
    return Yup.object().shape({
      searchType: Yup.string().nullable().test(
        "required-when-search-has-value",
        "Please select a option",
        function (value) {
          const { searchValue } = this.parent;
          if (searchValue && searchValue.trim().length > 0) {
            return value !== null && value !== undefined && value !== "";
          }
          return true;
        }
      ),
      searchValue: Yup.string()
        .optional()
        .test(
          "validate-by-search-type",
          function (value) {
            const { searchType } = this.parent;
            if (!searchType || searchType === "" || !value || value.trim().length === 0) {
              return true;
            }
            if (searchType === "uhid") {
              if (value.length < 2 || value.length > 20) {
                return this.createError({ message: "UHID must be between 2 and 20 characters" });
              }
            } else if (searchType === "phone") {
              if (value.length !== 10) {
                return this.createError({ message: "Phone No. must be exactly 10 digits" });
              }
              if (!/^\d+$/.test(value)) {
                return this.createError({ message: "Phone No. must contain only digits" });
              }
            } else if (searchType === "prebooking") {
              if (value.length < 2) {
                return this.createError({ message: "Pre-booking must be at least 2 characters" });
              }
              if (!/^[a-zA-Z0-9]+$/.test(value)) {
                return this.createError({ message: "Pre-booking must contain only letters and digits" });
              }
            } else if (searchType === "patientname") {
              if (!/^[a-zA-Z\s]+$/.test(value)) {
                return this.createError({ message: "Patient Name must contain only letters and spaces" });
              }
              if (value.trim().length < 2) {
                return this.createError({ message: "Patient Name must be at least 2 characters" });
              }
            } else if (searchType === "jsHealthCardNo") {
              const { min, max } = cardLengthInfo;
              if (value.length < min || value.length > max) {
                const msg = min === max
                  ? `Health Card No. must be exactly ${min} digits`
                  : `Health Card No. must be ${min}-${max} digits`;
                return this.createError({ message: msg });
              }
              if (!/^\d+$/.test(value)) {
                return this.createError({ message: "Health Card No. must contain only digits" });
              }
            } else if (searchType === "opdNumber") {
              if (value.length < 1 || value.length > 11) {
                return this.createError({ message: "OPD Number must be between 1 and 11 digits" });
              }
              if (!/^\d+$/.test(value)) {
                return this.createError({ message: "OPD Number must contain only digits" });
              }
            }
            return true;
          }
        )
    });
  }, [cardLengthInfo]);

  // Map frontend search types to API search types
  const mapSearchTypeToAPI = (searchType: string | null): string => {
    if (!searchType) return "";
    const mapping: Record<string, string> = {
      "phone": "contactNumber",
      "prebooking": "preBookingId",
      "patientname": "patientName",
      "uhid": "uhid",
    };
    return mapping[searchType] || searchType;
  };

  // Helper function to check if search is ready based on search type and value length
  const checkSearchReady = (searchType: string | null, searchValue: string): boolean => {
    if (!searchType || !searchValue || searchType === "") {
      return false;
    }

    const trimmedValue = searchValue.trim();
    if (trimmedValue.length === 0) {
      return false;
    }

    // Check based on search type
    if (searchType === "phone") {
      return trimmedValue.length === 10 && /^\d+$/.test(trimmedValue);
    } else if (searchType === "uhid") {
      return trimmedValue.length >= 2 && trimmedValue.length <= 20;
    } else if (searchType === "prebooking") {
      return trimmedValue.length >= 2 && /^[a-zA-Z0-9]+$/.test(trimmedValue);
    } else if (searchType === "patientname") {
      return trimmedValue.length >= 2 && /^[a-zA-Z\s]+$/.test(trimmedValue);
    } else if (searchType === "jsHealthCardNo") {
      return trimmedValue.length >= cardLengthInfo.min && trimmedValue.length <= cardLengthInfo.max && /^\d+$/.test(trimmedValue);
    } else if (searchType === "opdNumber") {
      return trimmedValue.length >= 1 && trimmedValue.length <= 11 && /^\d+$/.test(trimmedValue);
    }

    return false;
  };

  const formik = useFormik({
    initialValues: {
      searchType: null as string | null,
      searchValue: "",
    },
    validationSchema: searchValidationSchema,
    validateOnChange: false,
    validateOnBlur: true,
    onSubmit: async () => {
      // Handle search submission - only call API if search is ready
      const searchReady = checkSearchReady(formik.values.searchType, formik.values.searchValue);
      if (searchReady && formik.values.searchType && formik.values.searchValue) {
        try {
          // Map frontend search type to API search type
          const apiSearchType = mapSearchTypeToAPI(formik.values.searchType);
          const isSuperAdmin =
            (user?.roleCategoryType ?? "").toLowerCase() === "superadmin";
          const effectiveBranchId = user?.branchId != null ? Number(user.branchId) : NaN;
          const result = await triggerGlobalSearch({
            searchType: apiSearchType,
            search: formik.values.searchValue.trim(),
            ...(!isSuperAdmin && Number.isFinite(effectiveBranchId) && effectiveBranchId > 0
              ? { branchId: effectiveBranchId }
              : {}),
          }).unwrap();

          if (result.success && result.data) {
            setSearchResults(result.data);
            setIsPatientDialogOpen(true);
          }
        } catch (error: unknown) {
          console.error("Global search error:", error);
          // Extract error message from API response
          let errorMsg = "An error occurred while searching. Please try again.";
          if (
            typeof error === "object" &&
            error !== null &&
            "data" in error &&
            typeof (error as { data?: { message?: string } }).data?.message === "string"
          ) {
            errorMsg = (error as { data: { message: string } }).data.message;
          } else if (
            typeof error === "object" &&
            error !== null &&
            "message" in error &&
            typeof (error as { message?: string }).message === "string"
          ) {
            errorMsg = (error as { message: string }).message;
          }
          setErrorMessage(errorMsg);
          setShowErrorDialog(true);
        }
      }
    },
  });

  // Calculate if search is ready for UI (button disabled state)
  const isSearchReady = useMemo(() => {
    return checkSearchReady(formik.values.searchType, formik.values.searchValue);
  }, [formik.values.searchType, formik.values.searchValue]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (accountMenuRef.current && !accountMenuRef.current.contains(target)) {
        setIsAccountMenuOpen(false);
      }

      if (notificationRef.current && !notificationRef.current.contains(target)) {
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setProfileImageFailed(false);
  }, [user?.imgUrl]);

  const displayName = useMemo(() => {
    if (!userEmail) return "User";
    const namePart = userEmail.split("@")[0];
    return namePart
      .split(/[._-]/)
      .filter(Boolean)
      .map((chunk: string) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
      .join(" ");
  }, [userEmail]);

  /** Prefer API `user.role.name` (login payload); fall back to `userRole` prop (e.g. group name). */
  const roleDisplayName = useMemo(() => {
    const fromApi = user?.role?.name?.trim();
    if (fromApi) return fromApi;
    return userRole?.trim() ?? "";
  }, [user?.role?.name, userRole]);

  const headerActions = actions?.length
    ? actions
      .filter((action) => action.key !== "chat")
      .map((action) => {
        // Override badge for bell icon with dynamic count
        if (action.key === "bell") {
          return { ...action, badge: notificationCount > 0 ? notificationCount : undefined };
        }
        return action;
      })
    : [
      // {
      //   key: "night",
      //   iconSrc: "/icons/NightIcon.svg",
      //   alt: "Night mode",
      // },
      {
        key: "bell",
        iconSrc: "/icons/Bell.svg",
        alt: "Notifications",
        badge: notificationCount > 0 ? notificationCount : undefined,
      },
      // {
      //   key: "settings",
      //   iconSrc: "/icons/Settings.svg",
      //   alt: "Settings",
      // },
    ];

  return (
    <header className="flex w-full items-center justify-between gap-4 px-6 py-3 bg-slate-950 border-b border-slate-800 shadow-md text-white">
      {/* Logo on left */}
      <div className="flex items-center">
        <Logo />
      </div>

      {/* Icons and User on right */}
      <div className="flex items-center gap-3.5">
        {headerActions.map((action) => {
          // Special handling for notification bell icon
          if (action.key === "bell") {
            return (
              <div
                key={action.key}
                ref={notificationRef}
                className="relative"
              >
                <button
                  type="button"
                  className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-amber-400 border border-slate-800 shadow-md transition hover:bg-slate-800 hover:border-amber-400/50"
                  aria-label={action.alt}
                  onClick={() => {
                    setIsNotificationOpen((prev) => !prev);
                    action.onClick?.();
                  }}
                >
                  <FiBell className="text-lg text-amber-400" />
                  {action.badge ? (
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-black text-white shadow animate-pulse">
                      {action.badge}
                    </span>
                  ) : null}
                </button>
                <NotificationDropdown
                  isOpen={isNotificationOpen}
                  onClose={() => setIsNotificationOpen(false)}
                  notificationCount={notificationCount}
                  onNotificationCountChange={setNotificationCount}
                  onMarkAllAsRead={() => {
                    console.log("Mark all as read");
                  }}
                />
              </div>
            );
          }

          return (
            <button
              key={action.key}
              type="button"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-amber-400 border border-slate-800 shadow-md transition hover:bg-slate-800"
              aria-label={action.alt}
              onClick={action.onClick}
            >
              <Image src={action.iconSrc} alt={action.alt} width={18} height={18} />
              {action.badge ? (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-black text-white shadow">
                  {action.badge}
                </span>
              ) : null}
            </button>
          );
        })}

        {/* User VIP Profile Card */}
        <div
          ref={accountMenuRef}
          className="relative flex items-center gap-3 p-1.5 px-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-400/80 transition-all cursor-pointer shadow-md group"
          onClick={() => setIsAccountMenuOpen((prev) => !prev)}
        >
          {user?.imgUrl && !profileImageFailed ? (
            <Image
              src={user.imgUrl}
              alt=""
              width={40}
              height={40}
              className="h-9 w-9 rounded-xl object-cover border border-amber-400"
              unoptimized
              onError={() => setProfileImageFailed(true)}
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 font-black text-sm border border-amber-300 shadow">
              {userEmail?.[0]?.toUpperCase() ?? "S"}
            </div>
          )}

          <div className="text-left text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-white group-hover:text-amber-400 transition-colors">
                {displayName}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-400 border border-amber-400/40 text-[9px] font-black uppercase flex items-center gap-0.5">
                <FaCrown className="text-[9px] text-amber-400" /> VIP
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
              {roleDisplayName || "Super Admin Shareholder"}
            </span>
          </div>

          <FiChevronDown className={`text-slate-400 group-hover:text-amber-400 text-sm transition-transform ${isAccountMenuOpen ? "rotate-180" : ""}`} />

          {isAccountMenuOpen ? (
            <div className="absolute right-0 top-full mt-3 w-[220px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 text-white shadow-2xl z-50">
              {branchAccess.length > 0 ? (
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
                          className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-xs transition ${isActiveBranch
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
                          {isActiveBranch ? (
                            <Image src="/icons/check.svg" alt="Selected branch" width={14} height={14} />
                          ) : null}
                        </button>
                      );
                    })}
                  </ScrollableContainer>
                </div>
              ) : null}

              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-[#D14D4F] transition hover:bg-[#FFF2F2] cursor-pointer disabled:cursor-not-allowed disabled:opacity-75"
                disabled={isLoggingOut}
                onClick={async () => {
                  setIsLoggingOut(true);
                  try {
                    try {
                      await logoutJatayu();
                    } catch (e) {
                      console.error("Jatayu logout failed:", e);
                    }
                    await logoutApi().unwrap();
                    setIsAccountMenuOpen(false);
                    setShowLogoutSuccess(true);
                  } catch (err: any) {
                    const errMsg = err?.data?.message || err?.message || "Failed to logout. Please try again.";
                    setErrorMessage(errMsg);
                    setShowErrorDialog(true);
                  } finally {
                    setIsLoggingOut(false);
                  }
                }}
              >
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Image src="/icons/LogOutIcon.svg" alt="Logout" width={20} height={20} />
                    <span>Logout</span>
                  </div>
                  {isLoggingOut && (
                    <ThreeDotLoader color="green" size="small" className="ml-auto" />
                  )}
                </div>
              </button>
            </div>
          ) : null}
        </div>
        <button onClick={onToggleNav} className="web-hide relative flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#262D3B] shadow-[0px_15px_30px_rgba(34,56,43,0.08)] transition hover:bg-[#E8F0EA]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#262D3B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
        </button>
      </div>

      {/* Patient Details Dialog */}
      <PatientAlreadyExistsDialog
        open={isPatientDialogOpen}
        onClose={() => {
          setIsPatientDialogOpen(false);
          setSearchResults([]);
        }}
        appointments={searchResults}
        showPatientDetails={true}
        onView={(appointment) => {
          // Handle view action - you can navigate to patient details page or show more info
          console.log("View appointment:", appointment);
          // Example: router.push(`/registration/registrationList/${appointment.registrationId}/view`);
        }}
      />

      {/* API Error Dialog */}
      <MessageDialog
        open={showErrorDialog}
        onClose={() => {
          setShowErrorDialog(false);
        }}
        icon="/icons/CrossIcon.svg"
        iconBgColor="#FFEBEE"
        message={errorMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => {
          setShowErrorDialog(false);
        }}
      />

      {/* Logout Success Dialog */}
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


"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import { useLazyGlobalPatientSearchQuery } from "@/store/api/registrationApi";
import type { GlobalPatientSearchAppointment } from "@/store/api/registrationApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectBranchAccess,
  selectSelectedBranch,
  selectUser,
  setSelectedBranch,
} from "@/store/slices/authSlice";
import { useLogoutMutation } from "@/store/api/authApi";

const GLOBAL_SEARCH_TYPE_OPTIONS: SelectOption[] = [
  { label: "None", value: "" },
  { label: "UHID", value: "uhid" },
  { label: "Phone No.", value: "phone" },
  { label: "Patient Name", value: "patientname" },
  { label: "Pre-booking", value: "prebooking" },
  { label: "JS Health Card No.", value: "jsHealthCardNo" },
  { label: "OPD Number", value: "opdNumber" },

];

const searchValidationSchema = Yup.object().shape({
  searchType: Yup.string().nullable().test(
    "required-when-search-has-value",
    "Please select a option",
    function (value) {
      const { searchValue } = this.parent;
      // Only require searchType if searchValue has text
      if (searchValue && searchValue.trim().length > 0) {
        // Empty string (None) is not a valid option when there's a search value
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
        
        // No validation needed if no search type selected or search value is empty
        if (!searchType || searchType === "" || !value || value.trim().length === 0) {
          return true;
        }
        
        // Validate based on search type
        if (searchType === "uhid") {
          if (value.length !== 11) {
            return this.createError({
              message: "UHID must be exactly 11 characters",
            });
          }
          // UHID allows alphanumeric (characters and digits)
          if (!/^[a-zA-Z0-9]+$/.test(value)) {
            return this.createError({
              message: "UHID must contain only letters and digits",
            });
          }
        } else if (searchType === "phone") {
          if (value.length !== 10) {
            return this.createError({
              message: "Phone No. must be exactly 10 digits",
            });
          }
          if (!/^\d+$/.test(value)) {
            return this.createError({
              message: "Phone No. must contain only digits",
            });
          }
        } else if (searchType === "prebooking") {
          // Pre-booking requires minimum 2 characters
          if (value.length < 2) {
            return this.createError({
              message: "Pre-booking must be at least 2 characters",
            });
          }
          // Pre-booking allows alphanumeric (characters and digits)
          if (!/^[a-zA-Z0-9]+$/.test(value)) {
            return this.createError({
              message: "Pre-booking must contain only letters and digits",
            });
          }
        } else if (searchType === "patientname") {
          // Patient Name allows letters and spaces only, no special characters or digits
          if (!/^[a-zA-Z\s]+$/.test(value)) {
            return this.createError({
              message: "Patient Name must contain only letters and spaces",
            });
          }
          // Minimum 2 characters required
          if (value.trim().length < 2) {
            return this.createError({
              message: "Patient Name must be at least 2 characters",
            });
          }
        } else if (searchType === "jsHealthCardNo") {
          // JS Health Card No. must be exactly 12 digits starting with 50503030
          if (value.length !== 12) {
            return this.createError({
              message: "JS Health Card No. must be exactly 12 digits",
            });
          }
          if (!/^\d+$/.test(value)) {
            return this.createError({
              message: "JS Health Card No. must contain only digits",
            });
          }
          if (!/^50503030\d{4}$/.test(value)) {
            return this.createError({
              message: "JS Health Card No. must start with 50503030 followed by 4 digits",
            });
          }
        } else if (searchType === "opdNumber") {
          // OPD Number must be between 1 and 11 digits
          if (value.length < 1 || value.length > 11) {
            return this.createError({
              message: "OPD Number must be between 1 and 11 digits",
            });
          }
          if (!/^\d+$/.test(value)) {
            return this.createError({
              message: "OPD Number must contain only digits",
            });
          }
        }
        
        return true;
      }
    ),
});

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
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const notificationRef = useRef<HTMLDivElement | null>(null);
  
  const [triggerGlobalSearch, { isLoading: isSearching }] = useLazyGlobalPatientSearchQuery();
  const [logoutApi] = useLogoutMutation();

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
      return trimmedValue.length === 11 && /^[a-zA-Z0-9]+$/.test(trimmedValue);
    } else if (searchType === "prebooking") {
      return trimmedValue.length >= 2 && /^[a-zA-Z0-9]+$/.test(trimmedValue);
    } else if (searchType === "patientname") {
      return trimmedValue.length >= 2 && /^[a-zA-Z\s]+$/.test(trimmedValue);
    } else if (searchType === "jsHealthCardNo") {
      return trimmedValue.length === 12 && /^50503030\d{4}$/.test(trimmedValue);
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

  const headerActions = actions?.length
    ? actions.map((action) => {
        // Override badge for bell icon with dynamic count
        if (action.key === "bell") {
          return { ...action, badge: notificationCount > 0 ? notificationCount : undefined };
        }
        return action;
      })
    : [
        {
          key: "chat",
          iconSrc: "/icons/Message.svg",
          alt: "Messages",
        },
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
    <header className="flex w-full items-center justify-between gap-4 px-5 py-3 border-b border-[#E6E6E6]">
      {/* Logo on left */}
      <div className="flex items-center">
        <Logo width={140} height={53} />
      </div>

      {/* Search in center */}
      <div className="flex flex-1 items-start justify-center gap-2 md:hidden lg:flex">
        <div className="max-w-[347px]">
          <FormSelectField
            label=""
            hideLabel
            options={GLOBAL_SEARCH_TYPE_OPTIONS}
            placeholder="Select"
            value={formik.values.searchType}
            onChange={(value) => {
              const selectedValue = typeof value === "string" ? value : null;
              formik.setFieldValue("searchType", selectedValue);
              // Clear search value whenever select option changes
              formik.setFieldValue("searchValue", "");
              // Clear error when valid option is selected
              if (selectedValue && selectedValue !== "") {
                formik.setFieldError("searchType", undefined);
              }
              // Validate to ensure error is cleared
              formik.validateField("searchType");
            }}
            onBlur={() => {
              formik.setFieldTouched("searchType", true);
              // Trigger validation on blur
              formik.validateField("searchType");
              formik.validateField("searchValue");
            }}
            error={formik.touched.searchType && formik.errors.searchType ? formik.errors.searchType : undefined}
            width={320}
            height={44}
            background="white"
          />
        </div>
      
        <div className="min-w-0 flex-1 max-w-[320px] self-start">
          <SearchBar 
            className="w-full"
            value={formik.values.searchValue}
            onChange={(value) => {
              const hasSearchType = formik.values.searchType && formik.values.searchType !== "";
              
              // Only set value if search type is selected
              if (hasSearchType) {
                formik.setFieldValue("searchValue", value, false);
              }
            }}
            onAttemptInput={() => {
              // When user tries to type without selecting an option, show error
              const hasSearchType = formik.values.searchType && formik.values.searchType !== "";
              if (!hasSearchType) {
                formik.setFieldTouched("searchType", true, false);
                // Set error directly since validation schema requires searchValue to have text
                formik.setFieldError("searchType", "Please select a option");
              }
            }}
            onBlur={() => {
              formik.setFieldTouched("searchValue", true);
              formik.setFieldTouched("searchType", true);
              // Trigger validation on blur
              formik.validateField("searchType");
              formik.validateField("searchValue");
            }}
            onSubmit={() => {
              // Only submit if search is ready
              if (isSearchReady) {
                formik.validateForm().then(() => {
                  if (formik.isValid && formik.values.searchType && formik.values.searchValue) {
                    formik.submitForm();
                  }
                });
              }
            }}
            error={formik.touched.searchValue && formik.errors.searchValue ? formik.errors.searchValue : undefined}
            allowOnlyDigits={
              formik.values.searchType === "phone" || 
              formik.values.searchType === "jsHealthCardNo" || 
              formik.values.searchType === "opdNumber"
            }
            allowLettersAndSpaces={formik.values.searchType === "patientname"}
            maxLength={
              formik.values.searchType === "phone" 
                ? 10 
                : formik.values.searchType === "uhid" 
                ? 11 
                : formik.values.searchType === "jsHealthCardNo"
                ? 9
                : formik.values.searchType === "opdNumber"
                ? 11
                : formik.values.searchType === "prebooking"
                ? undefined // No max length for prebooking
                : undefined
            }
            disabled={!formik.values.searchType || formik.values.searchType === ""}
            searchButtonDisabled={!isSearchReady || isSearching}
          />
        </div>
      </div>

      {/* Icons and User on right */}
      <div className="flex items-center gap-3">
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
                  className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#262D3B] shadow-[0px_15px_30px_rgba(34,56,43,0.08)] transition hover:bg-[#E8F0EA]"
                  aria-label={action.alt}
                  onClick={() => {
                    setIsNotificationOpen((prev) => !prev);
                    action.onClick?.();
                  }}
                >
                  <Image src={action.iconSrc} alt={action.alt} width={20} height={20} />
                  {action.badge ? (
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#F3696F] px-1 text-xs font-semibold text-white">
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
                    // Handle mark all as read
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
              className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#262D3B] shadow-[0px_15px_30px_rgba(34,56,43,0.08)] transition hover:bg-[#E8F0EA]"
              aria-label={action.alt}
              onClick={action.onClick}
            >
              <Image src={action.iconSrc} alt={action.alt} width={20} height={20} />
              {action.badge ? (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#F3696F] px-1 text-xs font-semibold text-white">
                  {action.badge}
                </span>
              ) : null}
            </button>
          );
        })}

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
              {userEmail?.[0]?.toUpperCase() ?? "A"}
            </div>
          )}
          <div className="text-left text-sm" aria-expanded={isAccountMenuOpen}
            onClick={() => setIsAccountMenuOpen((prev) => !prev)}>
            <p className="font-semibold text-[#262D3B]">{displayName}</p>
            {userRole && <p className="text-xs text-[#8A8F9B]">{userRole}</p>}
          </div>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center text-[#262D3B] transition "
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
          {isAccountMenuOpen ? (
            <div className="absolute right-0 top-full mt-3 w-[200px] overflow-hidden rounded-2xl border border-[#ECF0ED] bg-white shadow-[0px_24px_48px_rgba(34,56,43,0.12)] z-50">
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
          ) : null}
        </div>
        <button onClick={onToggleNav}  className="web-hide relative flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#262D3B] shadow-[0px_15px_30px_rgba(34,56,43,0.08)] transition hover:bg-[#E8F0EA]">
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


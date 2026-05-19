import { useState, useMemo, useCallback, useEffect } from "react";
import { useAppSelector } from "@/store/hooks";
import {
  selectSelectedBranch,
  selectRoleCategoryType,
} from "@/store/slices/authSlice";
import { useGetBranchesQuery } from "@/store/api/settingsApi";
import type { SelectOption } from "@/components/ui/FormSelectField";

/** Session key for super-admin branch selection on `/doctor` so it survives navigate away and back. */
export const DOCTOR_LIST_BRANCH_STORAGE_KEY = "hiims-doctor-list-branch-filter";

/** Session key for super-admin branch selection on `/registration/registrationList`. */
export const REGISTRATION_LIST_BRANCH_STORAGE_KEY = "hiims-registration-list-branch-filter";

/** Session key for branch on `/pre-booking` — shared with `/pre-booking/new` so selection survives navigation. */
export const PRE_BOOKING_LIST_BRANCH_STORAGE_KEY = "hiims-pre-booking-list-branch-filter";

function readPersistedBranchId(key: string | undefined): string {
  if (typeof window === "undefined" || !key) return "";
  try {
    const v = sessionStorage.getItem(key);
    return v && /^\d+$/.test(v) ? v : "";
  } catch {
    return "";
  }
}

function writePersistedBranchId(key: string | undefined, val: string) {
  if (typeof window === "undefined" || !key) return;
  try {
    if (val) sessionStorage.setItem(key, val);
    else sessionStorage.removeItem(key);
  } catch {
    /* ignore quota / private mode */
  }
}

/** Read a persisted numeric branch id for keys exported from this module (e.g. pre-booking new page). */
export function readPersistedBranchFilterSelection(key: string): string {
  return readPersistedBranchId(key);
}

/** Write branch id for list ↔ detail flows (super-admin list filters). */
export function writePersistedBranchFilterSelection(key: string, val: string): void {
  writePersistedBranchId(key, val);
}

export interface UseBranchFilterOptions {
  /** When set (e.g. doctor list), super-admin branch choice is restored from sessionStorage after navigation. */
  persistSuperAdminSelectionKey?: string;
}

export interface UseBranchFilterReturn {
  selectedBranchFilter: string;
  setSelectedBranchFilter: (val: string) => void;
  branchFilterOptions: SelectOption[];
  isLoadingBranches: boolean;
  isBranchFilterDisabled: boolean;
  filterBranchId: number | undefined;
  isSuperAdmin: boolean;
  /**
   * False only while optional persisted value is being read (super admin + persist key).
   * Wait before applying “default to first branch” so the stored id is not overwritten.
   */
  branchFilterPersistReady: boolean;
}

export function useBranchFilter(options?: UseBranchFilterOptions): UseBranchFilterReturn {
  const persistKey = options?.persistSuperAdminSelectionKey;
  const roleCategoryType = useAppSelector(selectRoleCategoryType);
  const selectedBranch = useAppSelector(selectSelectedBranch);

  const isSuperAdmin = roleCategoryType?.toLowerCase() === "superadmin";

  const [superAdminFilter, setSuperAdminFilter] = useState("");
  const [branchFilterPersistReady, setBranchFilterPersistReady] = useState(
    () => !persistKey || !isSuperAdmin
  );

  const { data: branchesData, isLoading: isLoadingBranches } = useGetBranchesQuery(undefined, {
    skip: !isSuperAdmin,
  });

  const branchFilterOptions: SelectOption[] = useMemo(() => {
    if (isSuperAdmin) {
      const options: SelectOption[] = [{ value: "", label: "All Branches" }];
      if (branchesData?.data) {
        for (const b of branchesData.data) {
          const typeLabel = b.type ? b.type.charAt(0).toUpperCase() + b.type.slice(1).toLowerCase() : "";
          const label = typeLabel ? `${b.name} (${typeLabel})` : b.name;
          options.push({ value: b.id.toString(), label });
        }
      }
      return options;
    }
    if (selectedBranch) {
      const typeLabel = selectedBranch.type ? selectedBranch.type.charAt(0).toUpperCase() + selectedBranch.type.slice(1).toLowerCase() : "";
      const label = typeLabel ? `${selectedBranch.name} (${typeLabel})` : selectedBranch.name;
      return [
        {
          value: selectedBranch.id.toString(),
          label,
        },
      ];
    }
    return [];
  }, [isSuperAdmin, branchesData, selectedBranch]);

  const selectedBranchFilter = isSuperAdmin
    ? superAdminFilter
    : selectedBranch
      ? selectedBranch.id.toString()
      : "";

  useEffect(() => {
    if (!persistKey || !isSuperAdmin) {
      setBranchFilterPersistReady(true);
      return;
    }
    try {
      const v = readPersistedBranchId(persistKey);
      if (v) setSuperAdminFilter(v);
    } finally {
      setBranchFilterPersistReady(true);
    }
  }, [persistKey, isSuperAdmin]);

  const setSelectedBranchFilter = useCallback(
    (val: string) => {
      if (isSuperAdmin) {
        setSuperAdminFilter(val);
        writePersistedBranchId(persistKey, val);
      }
    },
    [isSuperAdmin, persistKey]
  );

  const filterBranchId = useMemo(() => {
    if (!selectedBranchFilter) return undefined;
    const n = parseInt(selectedBranchFilter, 10);
    return Number.isFinite(n) ? n : undefined;
  }, [selectedBranchFilter]);

  return {
    selectedBranchFilter,
    setSelectedBranchFilter,
    branchFilterOptions,
    isLoadingBranches,
    isBranchFilterDisabled: !isSuperAdmin,
    filterBranchId,
    isSuperAdmin,
    branchFilterPersistReady,
  };
}

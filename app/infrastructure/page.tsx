"use client";

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFormik, setNestedObjectValues, type FormikTouched } from "formik";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { FacilityCard, StatCard, Button, Dialog, MessageDialog, Pagination, ScrollableContainer, FormSelectField } from "@/components/ui";
import AddressDetails from "@/components/forms/AddressDetails";
import BranchBasicInformation from "@/components/forms/BranchBasicInformation";
import type { PhotoCaptureRef } from "@/components/forms/PhotoCapture";
import BranchBankInformation from "@/components/forms/BranchBankInformation";
import {
  branchFacilityFormSchema,
  initialBranchFacilityValues,
  BRANCH_FACILITY_FIELD_ORDER,
  flattenBranchFacilityErrors,
  pickMandatoryBranchFacilityErrors,
  pickOptionalOnlyBranchFacilityErrors,
  type BranchFacilityFormValues,
  type BranchLabTestSource,
} from "@/lib/validation/branchFacilitySchemas";
import { formatIndianAmount, parseIndianAmount } from "@/store/utils/formatIndianAmount";
import { useGetStatesQuery, useGetCitiesQuery, useGetTehsilsQuery, useGetAreasQuery } from "@/store/api/publicApi";
import {
  useAssignModulesToBranchMutation,
  useCreateBranchMutation,
  useUpdateBranchMutation,
  useGetAllBranchesQuery,
  useGetBranchInsightSummaryQuery,
  useLazyGetModulesWithBranchMappingQuery,
  type BranchListRow,
} from "@/store/api/branchSetupApi";
import { useGetBranchesQuery } from "@/store/api/settingsApi";
import type { SelectOption } from "@/components/ui/FormSelectField";
import { usePermission } from "@/hooks/usePermission";
import { useBranchFilter } from "@/hooks/useBranchFilter";

const INDIA = "6";

/** Stable string for comparing module id selections (order-independent). */
function normalizeSortedModuleIds(ids: string[]): string {
  return [...new Set(ids.map(String))]
    .sort((a, b) => {
      const na = parseInt(a, 10);
      const nb = parseInt(b, 10);
      if (Number.isFinite(na) && Number.isFinite(nb) && String(na) === a && String(nb) === b) {
        return na - nb;
      }
      return a.localeCompare(b);
    })
    .join(",");
}

function textOrNA(v: unknown): string {
  if (v == null) return "N/A";
  const s = String(v).trim();
  return s === "" ? "N/A" : s;
}

function formatFacilityType(type: string | null | undefined): string {
  if (type == null || String(type).trim() === "") return "N/A";
  const t = String(type).trim().toLowerCase();
  if (t === "hospital") return "Hospital";
  if (t === "clinic") return "Clinic";
  if (t === "daycare") return "Daycare";
  const raw = String(type).trim();
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

function formatBranchDate(iso: string | null | undefined): string {
  if (!iso || String(iso).trim() === "") return "N/A";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Title-case API status (e.g. branchStatus/status: "active" → "Active"). */
function formatBranchStatusLabel(v: unknown): string {
  const raw = textOrNA(v);
  if (raw === "N/A") return raw;
  return raw
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/** Map API row → FacilityCard props; `insights` from getAllBranch drives structure metrics. */
function branchRowToFacilityCardProps(row: BranchListRow) {
  const addressParts = [row.address, row.state].filter((p) => p != null && String(p).trim() !== "");
  const address = addressParts.length ? addressParts.map(String).join(", ") : "N/A";
  const updated = row.updatedAt ?? row.createdAt;
  const ins = row.insights;
  if (ins && typeof ins === "object") {
    const rooms = ins.rooms ?? {};
    const roomsTotal = rooms.total ?? 0;
    const roomsCompleted = rooms.configured ?? rooms.completed ?? 0;
    const pct = ins.completionPercentage;
    return {
      name: textOrNA(row.name),
      type: formatFacilityType(row.type ?? undefined),
      address,
      setupStatus: formatBranchStatusLabel(row.branchStatus ?? row.status),
      setupDate: formatBranchDate(updated ?? null),
      completionPercentage:
        typeof pct === "number" && Number.isFinite(pct) ? Math.min(100, Math.max(0, Math.round(pct))) : 0,
      buildings: ins.buildings ?? 0,
      floors: ins.floors ?? 0,
      roomsConfigured: roomsCompleted,
      totalRooms: roomsTotal,
    };
  }
  return {
    name: textOrNA(row.name),
    type: formatFacilityType(row.type ?? undefined),
    address,
    setupStatus: formatBranchStatusLabel(row.branchStatus ?? row.status),
    setupDate: formatBranchDate(updated ?? null),
    completionPercentage: null as number | null,
    buildings: "-",
    floors: "-",
    roomsConfigured: "-",
    totalRooms: "-",
  };
}

function mergeBranchFacilityTouchedForKeys(
  current: FormikTouched<BranchFacilityFormValues> | undefined,
  flatKeys: string[]
): FormikTouched<BranchFacilityFormValues> {
  const cur = current ?? {};
  const result = { ...cur } as Record<string, unknown>;
  const addressSubs = new Set<string>();

  for (const key of flatKeys) {
    if (key.startsWith("address.")) {
      addressSubs.add(key.slice("address.".length));
    } else {
      result[key] = true;
    }
  }

  if (addressSubs.size > 0) {
    const prevAddr =
      typeof cur.address === "object" && cur.address !== null
        ? { ...(cur.address as Record<string, boolean>) }
        : {};
    for (const sub of addressSubs) {
      prevAddr[sub] = true;
    }
    result.address = prevAddr;
  }

  return result as FormikTouched<BranchFacilityFormValues>;
}

function scrollToFirstBranchError(flatErrors: Record<string, string>) {
  if (Object.keys(flatErrors).length === 0) return;
  const firstKey =
    BRANCH_FACILITY_FIELD_ORDER.find((k) => flatErrors[k]) ?? Object.keys(flatErrors)[0];
  const element = document.querySelector(`[data-field="${firstKey}"]`);
  if (element instanceof HTMLElement) {
    setTimeout(() => {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        element.focus();
      } else {
        const inputOrTextarea = element.querySelector("input, textarea");
        if (inputOrTextarea instanceof HTMLInputElement || inputOrTextarea instanceof HTMLTextAreaElement) {
          setTimeout(() => inputOrTextarea.focus(), 150);
        } else {
          const trigger = element.querySelector('button[type="button"], [role="combobox"]');
          if (trigger instanceof HTMLElement) {
            setTimeout(() => trigger.focus(), 150);
          }
        }
      }
    }, 100);
  }
}

/** POST /branch/createBranch — root `labTestSource`: `chandan_api` | `manual`. */
function normalizeLabTestSourceForCreateBranch(raw: string): BranchLabTestSource {
  const t = raw.trim();
  return t === "manual" ? "manual" : "chandan_api";
}

/** POST /branch/createBranch — wifi: `active` | `deactive` (legacy `inactive` → `deactive`). */
function normalizeWifiStatusForCreateBranch(raw: string): "active" | "deactive" {
  const t = raw.trim().toLowerCase();
  if (t === "deactive" || t === "inactive") return "deactive";
  return "active";
}

/** Branch row status: `active` | `inactive`. */
function normalizeBranchStatusForCreateBranch(raw: string): "active" | "inactive" {
  const t = raw.trim().toLowerCase();
  return t === "inactive" ? "inactive" : "active";
}

/** API Status form field → payload key `status` only (`active` | `inactive`). */
function normalizeApiStatusForCreateBranch(raw: string): "active" | "inactive" {
  const t = raw.trim().toLowerCase();
  return t === "inactive" ? "inactive" : "active";
}

function normalizeIsFranchiseForCreateBranch(raw: string): "yes" | "no" {
  return raw.trim().toLowerCase() === "yes" ? "yes" : "no";
}

function buildCreateBranchFormData(
  values: BranchFacilityFormValues,
  resolved: {
    stateName: string;
    districtName: string;
    tehsilName: string;
    areaName: string;
    areaId: number;
  },
  editingBranchId?: number | null
): FormData {
  const fd = new FormData();
  if (editingBranchId != null) {
    if (!values.branchId.trim()) {
      fd.append("branchId", String(editingBranchId));
    }
  }
  const a = values.address;
  const isIndia = a.country === INDIA;

  const wifiStatus = normalizeWifiStatusForCreateBranch(values.wifiStatus);
  const branchStatus = normalizeBranchStatusForCreateBranch(values.branchStatus);
  const apiStatus = normalizeApiStatusForCreateBranch(values.apiStatus);
  const isFranchise = normalizeIsFranchiseForCreateBranch(values.isFranchise);

  fd.append("name", values.name.trim());
  fd.append("phoneNumber", values.phoneNumber.trim());
  fd.append("emailAddress", values.emailAddress.trim());
  fd.append("panNo", values.panNo.trim().toUpperCase());
  fd.append(
    "address",
    isIndia
      ? a.address.trim()
      : [a.addressLine1?.trim() ?? "", a.addressLine2?.trim() ?? ""].filter(Boolean).join(", ")
  );
  fd.append("state", resolved.stateName);
  fd.append("district", resolved.districtName);
  fd.append("tehsil", resolved.tehsilName);
  fd.append("area", resolved.areaName);
  fd.append("areaId", String(resolved.areaId));
  fd.append("pinCode", a.pinCode.trim());
  fd.append("firmName", values.firmName.trim());
  fd.append("firmNameBillFooter", "");
  fd.append("tinNo", values.tinNo.trim());
  fd.append("tat", values.tat.trim());
  fd.append("cstNo", values.cstNo.trim());
  fd.append("creditLimit", parseIndianAmount(values.creditLimit).trim());
  fd.append("description", values.description.trim());
  fd.append("type", values.facilityType.toLowerCase());
  fd.append("bankName", values.bankName.trim());
  fd.append("accNo", values.accNo.trim());
  fd.append("ifscCode", values.ifscCode.trim().toUpperCase());
  fd.append("bankBranchName", values.bankBranchName.trim());
  fd.append("gstNumber", values.gstNumber.trim());
  fd.append("stock", values.stock.trim() || "");
  fd.append("dp", values.dp.trim() || "");
  fd.append("warehouse", values.warehouse.trim());
  fd.append("bypassMapping", "no");
  fd.append("bypassDrScheme", "no");
  fd.append("courierApplication", "enabled");
  fd.append("sms", values.sms === "ON" ? "enabled" : "disabled");
  fd.append("stateCode", values.stateCode.trim());
  fd.append("branchCode", values.branchCode.trim());
  fd.append("branchId", values.branchId.trim());
  fd.append("branchStatus", branchStatus);
  fd.append("branchUser", values.branchUser.trim());
  fd.append("userPassword", values.userPassword);
  fd.append("advancedReferralAmount", parseIndianAmount(values.advancedReferralAmount).trim() || "0");
  fd.append("referralAmountInPercent", values.referralAmountInPercent.trim() || "");
  fd.append("isPanel", "no");
  fd.append("panel", "");
  fd.append("showToAgent", values.showToAgent.trim() || "yes");
  fd.append("status", apiStatus);
  fd.append("isFranchise", isFranchise);
  fd.append("shuddhiUuid", "");
  fd.append("isDialer", "1");
  fd.append("maplink", values.maplink.trim());
  fd.append("crone", "yes");
  fd.append("salesforceId", "");
  fd.append("wifiStatus", wifiStatus);
  fd.append("labTestSource", normalizeLabTestSourceForCreateBranch(values.labTestSource));

  const stateIdRaw = String(a.state ?? "").trim();
  const stateIdNum = parseInt(stateIdRaw, 10);
  fd.append("stateId", Number.isFinite(stateIdNum) ? String(stateIdNum) : stateIdRaw);

  if (editingBranchId == null) {
    const moduleNumericIds = values.moduleIds
      .map((id) => parseInt(String(id), 10))
      .filter((n) => Number.isFinite(n));
    for (const id of moduleNumericIds) {
      fd.append("moduleIds", String(id));
    }
  }

  const cloneIdRaw = values.cloneBranchId.trim();
  if (cloneIdRaw !== "") {
    const cloneN = parseInt(cloneIdRaw, 10);
    if (Number.isFinite(cloneN)) {
      fd.append("cloneBranchId", String(cloneN));
    }
  }

  if (values.branchLogo instanceof File) {
    fd.append("branchLogo", values.branchLogo);
  } else {
    fd.append("branchLogo", "");
  }
  if (values.branchLogo2 instanceof File) {
    fd.append("branchLogo_2", values.branchLogo2);
  } else {
    fd.append("branchLogo_2", "");
  }

  return fd;
}

const page = () => {
  const router = useRouter();
  const infrastructurePermission = usePermission("Settings");
  const infrastructureSubPermission = usePermission("Settings", { subModule: "Add Hospital/Clinic" });
  const canView = infrastructurePermission.canView || infrastructureSubPermission.canView;
  const canAdd = infrastructurePermission.canAdd || infrastructureSubPermission.canAdd;
  const canEditBranchModules =
    infrastructurePermission.canEdit || infrastructureSubPermission.canEdit;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [msgSuccess, setMsgSuccess] = useState(true);
  const branchPhotoCaptureRef = useRef<PhotoCaptureRef>(null);
  const [branchPhotoCaptureErrors, setBranchPhotoCaptureErrors] = useState<{
    vehiclePhoto?: string;
    aadharPhoto?: string;
  }>({});
  const [facilitiesPage, setFacilitiesPage] = useState(1);
  const [facilitiesPerPage, setFacilitiesPerPage] = useState(10);
  const {
    selectedBranchFilter,
    setSelectedBranchFilter,
    branchFilterOptions,
    isLoadingBranches: isLoadingBranchFilter,
    isBranchFilterDisabled,
    filterBranchId,
  } = useBranchFilter();

  const branchListParams = useMemo(
    () => ({
      limit: facilitiesPerPage,
      offset: (facilitiesPage - 1) * facilitiesPerPage,
      sort: "id",
      order: "desc" as const,
      ...(Number.isFinite(filterBranchId) ? { branchId: filterBranchId } : {}),
    }),
    [facilitiesPerPage, facilitiesPage, filterBranchId]
  );

  const {
    data: branchesRes,
    isFetching,
    isError,
    refetch,
  } = useGetAllBranchesQuery(branchListParams, { skip: !canView });

  const { data: insightRes } = useGetBranchInsightSummaryQuery(undefined, { skip: !canView });

  const [createBranch, { isLoading: isCreating }] = useCreateBranchMutation();
  const [updateBranch, { isLoading: isUpdating }] = useUpdateBranchMutation();
  const [editingBranchId, setEditingBranchId] = useState<number | null>(null);
  const canEditBranch = infrastructurePermission.canEdit || infrastructureSubPermission.canEdit || canAdd;
  const [modulesDialogBranch, setModulesDialogBranch] = useState<BranchListRow | null>(null);
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);
  /** Snapshot from GET when dialog syncs; used to enable "Update modules" only when selection changes. */
  const [initialModuleSelectionKey, setInitialModuleSelectionKey] = useState<string | null>(null);
  const modulesSaveInFlightRef = useRef(false);
  const [assignModules, { isLoading: isSavingModules }] = useAssignModulesToBranchMutation();

  const modulesBranchId = modulesDialogBranch?.id;
  const [fetchModulesMapping, modulesMappingLazy] = useLazyGetModulesWithBranchMappingQuery();
  const modulesMappingRes = modulesMappingLazy.data;
  const isLoadingModules = modulesMappingLazy.isFetching;
  const isModulesMappingError = modulesMappingLazy.isError;

  const handleOpenEditModules = useCallback(
    (row: BranchListRow) => {
      setModulesDialogBranch(row);
      setSelectedModuleIds([]);
      setInitialModuleSelectionKey(null);
      /** `false` = do not use cache; always GET fresh module list for this branch. */
      void fetchModulesMapping(row.id, false);
    },
    [fetchModulesMapping]
  );

  const branchListTotal = branchesRes?.total ?? 0;
  const branchRows = branchesRes?.data ?? [];

  useEffect(() => {
    if (!branchesRes?.success) return;
    const total = branchesRes.total ?? 0;
    if (total === 0) return;
    const tp =
      branchesRes.totalPages ?? Math.max(1, Math.ceil(total / facilitiesPerPage));
    if (tp > 0 && facilitiesPage > tp) {
      setFacilitiesPage(tp);
    }
  }, [
    branchesRes?.success,
    branchesRes?.total,
    branchesRes?.totalPages,
    facilitiesPage,
    facilitiesPerPage,
  ]);

  const formik = useFormik<BranchFacilityFormValues>({
    initialValues: initialBranchFacilityValues,
    validationSchema: branchFacilityFormSchema,
    validateOnChange: true,
    validateOnBlur: true,
    onSubmit: () => { },
  });

  const addr = formik.values.address;
  const infraAddrIsIndia = addr.country === INDIA;
  const { data: statesData } = useGetStatesQuery(
    addr.country && infraAddrIsIndia ? { countryId: addr.country } : undefined,
    { skip: !addr.country || !infraAddrIsIndia || !isDialogOpen }
  );
  const { data: citiesData } = useGetCitiesQuery(
    addr.state && infraAddrIsIndia ? { stateId: addr.state } : undefined,
    { skip: !addr.state || !infraAddrIsIndia || !isDialogOpen, refetchOnMountOrArgChange: true }
  );
  const { data: tehsilsData } = useGetTehsilsQuery(
    addr.city && addr.country === INDIA
      ? { districtId: addr.city, ...(addr.pinCode ? { pincode: addr.pinCode.replace(/\D/g, "") } : {}) }
      : undefined,
    { skip: !addr.city || addr.country !== INDIA || !isDialogOpen, refetchOnMountOrArgChange: true }
  );
  const { data: areasData } = useGetAreasQuery(
    addr.tehsil && addr.country === INDIA
      ? { tehsilId: addr.tehsil, ...(addr.pinCode ? { pincode: addr.pinCode.replace(/\D/g, "") } : {}) }
      : undefined,
    { skip: !addr.tehsil || addr.country !== INDIA || !isDialogOpen }
  );

  const resolvedAddressLabels = useMemo(() => {
    const stateName =
      statesData?.data?.find((s) => String(s.id) === String(addr.state))?.name?.trim() ?? "";
    const districtName =
      citiesData?.data?.find((c) => String(c.id) === String(addr.city))?.name?.trim() ?? "";
    const tehsilName =
      tehsilsData?.data?.find((t) => String(t.id) === String(addr.tehsil))?.name?.trim() ?? "";
    const areaRow = areasData?.data?.find((ar) => String(ar.id) === String(addr.area));
    const areaName = areaRow?.name?.trim() ?? "";
    const areaId = areaRow?.id != null ? Number(areaRow.id) : addr.area ? parseInt(String(addr.area), 10) : 0;
    return { stateName, districtName, tehsilName, areaName, areaId: Number.isFinite(areaId) ? areaId : 0 };
  }, [statesData, citiesData, tehsilsData, areasData, addr.state, addr.city, addr.tehsil, addr.area]);

  useEffect(() => {
    if (!isDialogOpen || editingBranchId == null) return;
    const currentCity = formik.values.address.city;
    if (citiesData?.data && currentCity) {
      const match = citiesData.data.find(
        (c) => String(c.id) === currentCity || c.name.toLowerCase() === currentCity.toLowerCase()
      );
      if (match && currentCity !== String(match.id)) {
        void formik.setFieldValue("address.city", String(match.id));
      }
    }
  }, [isDialogOpen, editingBranchId, citiesData, formik.values.address.city]);

  useEffect(() => {
    if (!isDialogOpen || editingBranchId == null) return;
    const currentTehsil = formik.values.address.tehsil;
    if (tehsilsData?.data && currentTehsil) {
      const match = tehsilsData.data.find(
        (t) => String(t.id) === currentTehsil || t.name.toLowerCase() === currentTehsil.toLowerCase()
      );
      if (match && currentTehsil !== String(match.id)) {
        void formik.setFieldValue("address.tehsil", String(match.id));
      }
    }
  }, [isDialogOpen, editingBranchId, tehsilsData, formik.values.address.tehsil]);

  useEffect(() => {
    if (!isDialogOpen || editingBranchId == null) return;
    const currentArea = formik.values.address.area;
    if (areasData?.data && currentArea) {
      const match = areasData.data.find(
        (a) => String(a.id) === currentArea || a.name.toLowerCase() === currentArea.toLowerCase()
      );
      if (match && currentArea !== String(match.id)) {
        void formik.setFieldValue("address.area", String(match.id));
      }
    }
  }, [isDialogOpen, editingBranchId, areasData, formik.values.address.area]);

  const resetFacilityForm = () => {
    formik.resetForm({
      values: {
        ...initialBranchFacilityValues,
        address: { ...initialBranchFacilityValues.address },
      },
    });
  };

  const handleAddNew = () => {
    if (!canAdd) return;
    setEditingBranchId(null);
    resetFacilityForm();
    setIsDialogOpen(true);
  };

  const editingBranchModuleOptions: SelectOption[] = useMemo(() => {
    if (editingBranchId == null) return [];
    if (!modulesMappingRes?.success || !Array.isArray(modulesMappingRes.data)) return [];
    return modulesMappingRes.data.map((m) => ({
      value: String(m.id),
      label: m.moduleName,
      disabled: m.branchModuleId != null,
    }));
  }, [editingBranchId, modulesMappingRes]);

  useEffect(() => {
    if (editingBranchId == null || !isDialogOpen) return;
    if (!modulesMappingRes?.success || !Array.isArray(modulesMappingRes.data)) return;
    const assignedIds = modulesMappingRes.data
      .filter((m) => m.branchModuleId != null)
      .map((m) => String(m.id));
    void formik.setFieldValue("moduleIds", assignedIds);
  }, [editingBranchId, isDialogOpen, modulesMappingRes]);

  const handleEditFacility = (row: BranchListRow) => {
    if (!canEditBranch) return;
    setEditingBranchId(row.id);
    void fetchModulesMapping(row.id, false);
    const r = row as Record<string, any>;
    let facilityType: "Hospital" | "Clinic" | "Daycare" = "Hospital";
    const rawType = (r.type || "").toString().toLowerCase();
    if (rawType === "clinic") facilityType = "Clinic";
    else if (rawType === "daycare") facilityType = "Daycare";

    formik.resetForm({
      values: {
        ...initialBranchFacilityValues,
        facilityType,
        name: r.name || "",
        phoneNumber: r.phoneNumber || "",
        emailAddress: r.emailAddress || "",
        firmName: r.firmName || "",
        panNo: r.panNo || "",
        description: r.description || "",
        creditLimit: r.creditLimit != null && String(r.creditLimit).trim() !== "" ? formatIndianAmount(r.creditLimit) : "",
        cstNo: r.cstNo || "",
        tinNo: r.tinNo || "",
        tat: r.tat || "",
        gstNumber: r.gstNumber || "",
        stock: r.stock != null ? String(r.stock) : "",
        dp: r.dp != null ? String(r.dp) : "",
        stateCode: r.stateCode || "",
        branchCode: r.branchCode || "",
        branchId: r.branchId != null ? String(r.branchId) : String(r.id || ""),
        branchUser: r.branchUser || "",
        userPassword: r.userPassword || "",
        warehouse: r.warehouse || "",
        sms: r.sms === "disabled" ? "OFF" : "ON",
        advancedReferralAmount: r.advancedReferralAmount != null && String(r.advancedReferralAmount).trim() !== "" ? formatIndianAmount(r.advancedReferralAmount) : "",
        referralAmountInPercent: r.referralAmountInPercent != null ? String(r.referralAmountInPercent) : "",
        showToAgent: r.showToAgent || "yes",
        isFranchise: r.isFranchise || "no",
        branchStatus: r.branchStatus || r.status || "active",
        wifiStatus: r.wifiStatus || "",
        labTestSource: r.labTestSource || "",
        apiStatus: r.status || "active",
        maplink: r.maplink || "",
        bankName: r.bankName || "",
        accNo: r.accNo || "",
        ifscCode: r.ifscCode || "",
        bankBranchName: r.bankBranchName || "",
        address: {
          pinCode: r.pinCode || "",
          country: r.countryId != null ? String(r.countryId) : (r.country || INDIA),
          state: r.stateId != null ? String(r.stateId) : (r.state || ""),
          city: r.districtId != null ? String(r.districtId) : (r.district || ""),
          tehsil: r.tehsilId != null ? String(r.tehsilId) : (r.tehsil || ""),
          area: r.areaId != null ? String(r.areaId) : (r.area || ""),
          address: r.address || "",
          addressLine1: r.addressLine1 || "",
          addressLine2: r.addressLine2 || "",
        },
      },
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingBranchId(null);
    resetFacilityForm();
  };

  const submitFacility = async () => {
    if (editingBranchId != null ? !canEditBranch : !canAdd) return;
    const hasBranchPhotoErrors =
      branchPhotoCaptureRef.current?.hasErrors() ||
      !!(branchPhotoCaptureErrors.vehiclePhoto || branchPhotoCaptureErrors.aadharPhoto);
    if (hasBranchPhotoErrors) {
      branchPhotoCaptureRef.current?.scrollToError();
      return;
    }

    const errors = await formik.validateForm();
    const flat = flattenBranchFacilityErrors(errors);
    const mandatoryFlat = pickMandatoryBranchFacilityErrors(flat);
    const optionalFlat = pickOptionalOnlyBranchFacilityErrors(flat);

    if (Object.keys(mandatoryFlat).length > 0) {
      await formik.setTouched(
        mergeBranchFacilityTouchedForKeys(formik.touched, Object.keys(mandatoryFlat)),
        false
      );
      scrollToFirstBranchError(mandatoryFlat);
      return;
    }
    if (Object.keys(optionalFlat).length > 0) {
      await formik.setTouched(setNestedObjectValues(formik.values, true), false);
      scrollToFirstBranchError(optionalFlat);
      return;
    }

    const fd = buildCreateBranchFormData(formik.values, resolvedAddressLabels, editingBranchId);

    const branchPayloadPreview: Record<string, string | string[]> = {};
    for (const [key, value] of fd.entries()) {
      const v =
        value instanceof File ? `File:${value.name} (${value.size} bytes)` : String(value);
      const existing = branchPayloadPreview[key];
      if (existing === undefined) {
        branchPayloadPreview[key] = v;
      } else if (Array.isArray(existing)) {
        existing.push(v);
      } else {
        branchPayloadPreview[key] = [existing, v];
      }
    }
    console.log(`[${editingBranchId != null ? "updateBranch" : "createBranch"}] about to submit`, branchPayloadPreview);

    try {
      const res =
        editingBranchId != null
          ? await updateBranch({ id: editingBranchId, body: fd }).unwrap()
          : await createBranch(fd).unwrap();
      if (res.success) {
        if (editingBranchId != null && modulesMappingRes?.success && Array.isArray(modulesMappingRes.data)) {
          const initialAssignedSet = new Set(
            modulesMappingRes.data.filter((m) => m.branchModuleId != null).map((m) => String(m.id))
          );
          const newlyAddedModuleIds = formik.values.moduleIds.filter((id) => !initialAssignedSet.has(id));
          if (newlyAddedModuleIds.length > 0) {
            const mappings = newlyAddedModuleIds.map((id) => ({
              branchId: editingBranchId,
              moduleId: parseInt(id, 10),
            }));
            await assignModules({ mappings }).unwrap();
          }
        }
        setFacilitiesPage(1);
        setMsgSuccess(true);
        setMsgText(res.message || (editingBranchId != null ? "Facility updated successfully." : "Facility created successfully."));
        setMsgOpen(true);
        handleCloseDialog();
      } else {
        setMsgSuccess(false);
        setMsgText(res.message || (editingBranchId != null ? "Could not update facility." : "Could not create facility."));
        setMsgOpen(true);
      }
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "data" in e
          ? String((e as { data?: { message?: string } }).data?.message ?? "Request failed.")
          : "Request failed.";
      setMsgSuccess(false);
      setMsgText(msg);
      setMsgOpen(true);
    }
  };

  const infrastructureStats = useMemo(() => {
    const insight =
      insightRes?.success && insightRes.data && typeof insightRes.data === "object"
        ? insightRes.data
        : null;
    const metric = (n: unknown): number | string => {
      if (insight == null) return "-";
      if (typeof n === "number" && Number.isFinite(n)) return n;
      return 0;
    };
    const activeSetup = (raw: unknown): string | number => {
      if (insight == null) return "-";
      if (raw == null) return "-";
      if (typeof raw === "string") {
        const t = raw.trim();
        if (t === "") return "-";
        const n = parseInt(t, 10);
        if (!Number.isFinite(n) || n <= 0) return "-";
        return n;
      }
      if (typeof raw === "number") {
        if (!Number.isFinite(raw) || raw <= 0) return "-";
        return raw;
      }
      return "-";
    };
    return [
      { title: "Total Facilities", value: metric(insight?.totalBranches) },
      { title: "Active Setup", value: activeSetup(insight?.totalActiveBranches) },
      { title: "Total Buildings", value: metric(insight?.totalBuildings) },
      { title: "Configured Rooms", value: metric(insight?.totalConfiguredRooms) },
    ];
  }, [insightRes]);

  const moduleSelectOptions: SelectOption[] = useMemo(() => {
    if (isLoadingModules) return [];
    if (!modulesMappingRes?.success || !Array.isArray(modulesMappingRes.data)) return [];
    return modulesMappingRes.data.map((m) => ({
      value: String(m.id),
      label: m.moduleName,
      /** Already assigned to this branch — cannot be toggled off in the UI. */
      disabled: m.branchModuleId != null,
    }));
  }, [modulesMappingRes, isLoadingModules]);

  useEffect(() => {
    if (modulesBranchId == null) {
      setSelectedModuleIds([]);
      setInitialModuleSelectionKey(null);
      return;
    }
    if (!modulesMappingRes?.success || !Array.isArray(modulesMappingRes.data)) return;
    const next = modulesMappingRes.data
      .filter((m) => m.branchModuleId != null)
      .map((m) => String(m.id));
    setSelectedModuleIds(next);
    setInitialModuleSelectionKey(normalizeSortedModuleIds(next));
  }, [modulesBranchId, modulesMappingRes]);

  const isModulesSelectionDirty = useMemo(() => {
    if (initialModuleSelectionKey == null) return false;
    return normalizeSortedModuleIds(selectedModuleIds) !== initialModuleSelectionKey;
  }, [initialModuleSelectionKey, selectedModuleIds]);

  const handleCloseModulesDialog = () => {
    setModulesDialogBranch(null);
    setSelectedModuleIds([]);
    setInitialModuleSelectionKey(null);
    modulesSaveInFlightRef.current = false;
  };

  const handleSaveBranchModules = async () => {
    if (!modulesDialogBranch || modulesSaveInFlightRef.current || isSavingModules) return;
    const initialAssignedIds =
      initialModuleSelectionKey != null && initialModuleSelectionKey !== ""
        ? initialModuleSelectionKey.split(",").filter(Boolean)
        : [];
    const initialAssignedSet = new Set(initialAssignedIds);
    const newlyAddedModuleIds = selectedModuleIds.filter((id) => !initialAssignedSet.has(id));
    const mappings = newlyAddedModuleIds.map((id) => ({
      branchId: modulesDialogBranch.id,
      moduleId: parseInt(id, 10),
    }));
    if (mappings.length === 0) {
      return;
    }
    modulesSaveInFlightRef.current = true;
    try {
      const res = await assignModules({
        mappings,
      }).unwrap();
      if (res.success) {
        setMsgSuccess(true);
        setMsgText(res.message || "Branch modules saved successfully.");
        setMsgOpen(true);
        handleCloseModulesDialog();
      } else {
        setMsgSuccess(false);
        setMsgText(res.message || "Could not update modules.");
        setMsgOpen(true);
      }
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "data" in e
          ? String((e as { data?: { message?: string } }).data?.message ?? "Request failed.")
          : "Request failed.";
      setMsgSuccess(false);
      setMsgText(msg);
      setMsgOpen(true);
    } finally {
      modulesSaveInFlightRef.current = false;
    }
  };

  const handleFacilityClick = (row: BranchListRow) => {
    if (!canView) return;
    const p = branchRowToFacilityCardProps(row);
    const tr = p.totalRooms;
    const cr = p.roomsConfigured;
    const totalRoomsNum = typeof tr === "number" ? tr : parseInt(String(tr), 10);
    const configuredNum = typeof cr === "number" ? cr : parseInt(String(cr), 10);
    const trOk = Number.isFinite(totalRoomsNum);
    const crOk = Number.isFinite(configuredNum);
    const incomplete = trOk && crOk ? Math.max(0, totalRoomsNum - configuredNum) : 0;
    const params = new URLSearchParams({
      branchId: String(row.id),
      facility: p.name,
      type: p.type,
      address: p.address,
      completion: p.completionPercentage != null ? String(p.completionPercentage) : "0",
      buildings: String(p.buildings),
      floors: String(p.floors),
      totalRooms: String(p.totalRooms),
      configuredRooms: String(p.roomsConfigured),
      incompleteRooms: String(incomplete),
    });
    router.push(`/infrastructure/config-structure?${params.toString()}`);
  };

  return (
    <AppShell>
      {!canView ? (
        <div className="rounded-[20px] border border-[#E3EEE1] bg-white px-6 py-10 text-center text-sm text-[#9CA3AF]">
          You don&apos;t have permission to view infrastructure.
        </div>
      ) : (
        <>
          <div className="flex min-h-[calc(100vh-12rem)] flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <div>
                <PageHeading title="Hospital Management System" />
                <p className="mt-0 text-gray-400">Configure and manage hospitals, clinics, and their infrastructure</p>
              </div>
              <div className="flex items-center gap-3">
                <FormSelectField
                  label=""
                  hideLabel
                  options={branchFilterOptions}
                  value={selectedBranchFilter}
                  onChange={(value) => {
                    setSelectedBranchFilter(Array.isArray(value) ? value[0] : value || "");
                    setFacilitiesPage(1);
                  }}
                  placeholder={isLoadingBranchFilter ? "Loading branches..." : "Select Branch"}
                  mode="single"
                  background="normal"
                  width={300}
                  disabled={isBranchFilterDisabled || isLoadingBranchFilter}
                />
                {canAdd ? (
                  <Button
                    variant="primary"
                    size="medium"
                    onClick={handleAddNew}
                    leftIcon={
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    }
                  >
                    Add Hospital/Clinic
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* {infrastructureStats.map((stat) => (
            <StatCard key={stat.title} title={stat.title} value={stat.value} />
          ))} */}
            </div>
            <div className="mb-10 mt-6">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">All Hospitals & Clinics</h2>
              {isError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  Could not load facilities.{" "}
                  <button type="button" className="font-medium underline" onClick={() => void refetch()}>
                    Retry
                  </button>
                </div>
              ) : null}
              <div className="space-y-4">
                {isFetching && branchRows.length === 0 ? (
                  <p className="text-sm text-gray-500">Loading facilities…</p>
                ) : null}
                {branchRows.map((row) => {
                  const card = branchRowToFacilityCardProps(row);
                  return (
                    <FacilityCard
                      key={row.id}
                      name={card.name}
                      type={card.type}
                      address={card.address}
                      setupStatus={card.setupStatus}
                      setupDate={card.setupDate}
                      completionPercentage={card.completionPercentage}
                      buildings={card.buildings}
                      floors={card.floors}
                      roomsConfigured={card.roomsConfigured}
                      totalRooms={card.totalRooms}
                      onClick={() => handleFacilityClick(row)}
                      onEdit={canEditBranch ? () => handleEditFacility(row) : undefined}
                      onEditModules={
                        canEditBranchModules ? () => handleOpenEditModules(row) : undefined
                      }
                    />
                  );
                })}
                {!isFetching && !isError && branchRows.length === 0 ? (
                  <p className="text-sm text-gray-500">No hospitals or clinics found.</p>
                ) : null}
              </div>
              {branchListTotal > 0 ? (
                <Pagination
                  currentPage={facilitiesPage}
                  totalItems={branchListTotal}
                  itemsPerPage={facilitiesPerPage}
                  onPageChange={setFacilitiesPage}
                  onItemsPerPageChange={(n) => {
                    setFacilitiesPerPage(n);
                    setFacilitiesPage(1);
                  }}
                  itemsPerPageOptions={[10, 20, 50, 100]}
                />
              ) : null}
            </div>
          </div>

          <Dialog
            open={isDialogOpen && (editingBranchId != null ? canEditBranch : canAdd)}
            onClose={handleCloseDialog}
            title={editingBranchId != null ? "Edit Facility" : "Add New Facility"}
            width={1300}
            contentPadding="px-6 py-6"
            contentOverflow="hidden"
            closeOnOutsideClick={false}
            closeOnEscape={false}
          >
            <div className="flex min-h-0 flex-1 flex-col gap-6">
              <ScrollableContainer maxHeight="none" className="flex min-h-0 flex-1 flex-col gap-6 pr-1">
                <BranchBasicInformation
                  formik={formik}
                  photoCaptureRef={branchPhotoCaptureRef}
                  onPhotoValidationChange={(_hasErrors, errs) => setBranchPhotoCaptureErrors(errs)}
                  moduleOptions={editingBranchId != null ? editingBranchModuleOptions : undefined}
                  isLoadingModules={editingBranchId != null ? isLoadingModules : undefined}
                  isEditing={editingBranchId != null}
                />
                <BranchBankInformation formik={formik} />
                <AddressDetails
                  formData={formik.values.address}
                  onChange={(field, value) => formik.setFieldValue(`address.${field}`, value)}
                  onBlur={(field) => formik.setFieldTouched(`address.${field}`, true)}
                  dataFieldPrefix="address."
                  nationality="Indian"
                  title="Address"
                  errors={{
                    pinCode: formik.touched.address?.pinCode ? formik.errors.address?.pinCode : undefined,
                    country: formik.touched.address?.country ? formik.errors.address?.country : undefined,
                    state: formik.touched.address?.state ? formik.errors.address?.state : undefined,
                    city: formik.touched.address?.city ? formik.errors.address?.city : undefined,
                    tehsil: formik.touched.address?.tehsil ? formik.errors.address?.tehsil : undefined,
                    area: formik.touched.address?.area ? formik.errors.address?.area : undefined,
                    address: formik.touched.address?.address ? formik.errors.address?.address : undefined,
                    addressLine1: formik.touched.address?.addressLine1 ? formik.errors.address?.addressLine1 : undefined,
                    addressLine2: formik.touched.address?.addressLine2 ? formik.errors.address?.addressLine2 : undefined,
                  }}
                />
              </ScrollableContainer>

              <div className="flex shrink-0 justify-end gap-3 border-t border-gray-200 pt-4">
                <Button
                  variant="outline"
                  onClick={handleCloseDialog}
                  className="min-w-[100px]"
                  disabled={isCreating || isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="button"
                  onClick={() => void submitFacility()}
                  className="min-w-[160px]"
                  disabled={isCreating || isUpdating}
                >
                  {editingBranchId != null
                    ? isUpdating
                      ? "Updating…"
                      : "Update facility"
                    : isCreating
                      ? "Saving…"
                      : "Create facility"}
                </Button>
              </div>
            </div>
          </Dialog>

          <Dialog
            open={modulesDialogBranch != null && canEditBranchModules}
            onClose={handleCloseModulesDialog}
            title={
              modulesDialogBranch
                ? `Edit modules — ${textOrNA(modulesDialogBranch.name)}`
                : "Edit modules"
            }
            width={520}
            contentPadding="px-6 py-6"
            closeOnOutsideClick={false}
          >
            <div className="flex flex-col gap-4">
              <p className="text-sm text-gray-500">
                Select one or more modules to assign to this branch.
              </p>
              {isLoadingModules ? (
                <p className="text-sm text-gray-500">Loading modules…</p>
              ) : isModulesMappingError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  Could not load modules.{" "}
                  <button
                    type="button"
                    className="font-medium underline"
                    onClick={() => {
                      if (modulesBranchId != null) void fetchModulesMapping(modulesBranchId, false);
                    }}
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <FormSelectField
                  label="Modules*"
                  mode="multiple"
                  options={moduleSelectOptions}
                  value={selectedModuleIds}
                  onChange={(value) => setSelectedModuleIds(Array.isArray(value) ? value : value ? [value] : [])}
                  placeholder="Select module(s)"
                  background="normal"
                  disabled={isSavingModules}
                />
              )}
              <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
                <Button
                  variant="outline"
                  onClick={handleCloseModulesDialog}
                  className="min-w-[100px]"
                  disabled={isSavingModules}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="button"
                  onClick={() => void handleSaveBranchModules()}
                  className="min-w-[140px]"
                  isLoading={isSavingModules}
                  disabled={
                    isSavingModules ||
                    isLoadingModules ||
                    isModulesMappingError ||
                    modulesDialogBranch == null ||
                    !isModulesSelectionDirty
                  }
                >
                  Update modules
                </Button>
              </div>
            </div>
          </Dialog>

          <MessageDialog
            open={msgOpen}
            onClose={() => setMsgOpen(false)}
            message={msgText}
            icon={msgSuccess ? "/icons/SuccessCheck.svg" : "/icons/CrossIcon.svg"}
            iconBgColor={msgSuccess ? "#E8F5E9" : "#FEE2E2"}
            showCancel={false}
            confirmText="OK"
            onConfirm={() => setMsgOpen(false)}
          />
        </>
      )}
    </AppShell>
  );
};

export default page;

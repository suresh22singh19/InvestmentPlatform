"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect, useRef } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
  Button,
  Dialog,
  FormInputField,
  FormSelectField,
  Table,
  TableBody,
  TableData,
  TableHead,
  TableHeader,
  TableRow,
  TableSearchInput,
  Pagination,
  MessageDialog,
  Tooltip,
  ExportButton,
  Tabs,
} from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import type { SelectOption } from "@/components/ui/FormSelectField";
import {
  useGetBranchesQuery,
  useGetTherapistEntriesQuery,
  useGetTherapistRoleByBranchQuery,
  useGetTherapiesQuery,
  useUpdateTherapistMutation,
  useLazyGeneratePdfForTherapistQuery,
  useLazyGenerateCsvForTherapistQuery,
} from "@/store/api/settingsApi";
import { useDebounce } from "@/hooks/useDebounce";
import { usePermission } from "@/hooks/usePermission";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { sanitizePatientNameInput, sanitizeDigitsOnlyInput } from "@/lib/utils/common";

type TherapistStatus = "Active" | "Inactive";
type TherapistLoginType = "no-auth" | "ip" | "otp" | "ip-otp";

type PanelTherapist = {
  id: number;
  branchId?: number;
  branch?: string;
  therapistName: string;
  speciality: string;
  email: string;
  phone: string;
  employeeId: string;
  experience: string;
  status: TherapistStatus;
  roleId: number | null;
  roleName: string;
  loginType: TherapistLoginType;
  createdAt?: string;
  branches?: { id: number; name: string }[];
  certifications: string[];
  therapyIds: number[];
};

type TherapistFormValues = {
  branch: string;
  roleId: string;
  therapistName: string;
  speciality: string;
  email: string;
  phone: string;
  employeeId: string;
  experience: string;
  loginType: TherapistLoginType;
  status: "active" | "inactive";
};

const EMPTY_FORM_VALUES: TherapistFormValues = {
  branch: "",
  roleId: "",
  therapistName: "",
  speciality: "",
  email: "",
  phone: "",
  employeeId: "",
  experience: "",
  loginType: "no-auth",
  status: "inactive",
};

const loginTypeOptions: SelectOption[] = [
  { value: "no-auth", label: "No auth" },
  { value: "ip", label: "IP" },
  { value: "otp", label: "OTP" },
  { value: "ip-otp", label: "IP + OTP" },
];

const statusOptions: SelectOption[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const TABLE_COLUMN_COUNT = 9;

function normalizeContactNumberForForm(phone: string): string {
  return sanitizeDigitsOnlyInput(phone, 10);
}

function formatPhoneForApi(digitsField: string): string {
  const digits = digitsField.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  return digitsField.trim().startsWith("+") ? digitsField.trim() : `+${digits}`;
}

function parseLoginTypeFromApi(raw: string | undefined): TherapistLoginType {
  const v = raw?.toLowerCase();
  if (v === "ip-otp" || v === "no-auth" || v === "ip" || v === "otp") return v;
  return "no-auth";
}

function getRtkErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "data" in err) {
    const d = (err as { data?: { message?: string | string[] } }).data;
    const m = d?.message;
    if (typeof m === "string" && m.trim()) return m.trim();
    if (Array.isArray(m) && m.length > 0) {
      const parts = m.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
      if (parts.length) return parts.join(" ");
    }
  }
  return fallback;
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = date.getHours() >= 12 ? "PM" : "AM";
    const displayHours = String(date.getHours() % 12 || 12).padStart(2, "0");
    return `${day}-${month}-${year} ${displayHours}:${minutes} ${ampm}`;
  } catch {
    return dateString;
  }
}

function displayValue(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

function extractTherapyIdsFromTherapist(therapist: {
  therapyIds?: number[];
  therapies?: Array<{ id?: number; therapyId?: number }>;
}): number[] {
  if (Array.isArray(therapist.therapyIds) && therapist.therapyIds.length > 0) {
    return therapist.therapyIds.filter((id) => Number.isFinite(id));
  }
  if (Array.isArray(therapist.therapies)) {
    return therapist.therapies
      .map((therapy) => therapy.id ?? therapy.therapyId)
      .filter((id): id is number => id != null && Number.isFinite(id));
  }
  return [];
}

function mapTherapistToRow(therapist: {
  id: number;
  userName?: string;
  therapistName?: string;
  email?: string;
  phone?: string;
  empId?: string;
  employeeId?: string;
  experience?: string;
  speciality?: string;
  category?: string;
  status: "active" | "inactive";
  createdAt: string;
  branchId?: number;
  roleId?: number;
  roleName?: string;
  loginType?: string;
  role?: { id: number; name: string };
  branch?: { id: number; name: string };
  branches?: { id: number; name: string }[];
  certifications?: string[];
  therapyIds?: number[];
  therapies?: Array<{ id?: number; therapyId?: number; therapyName?: string }>;
}): PanelTherapist {
  const branchId = therapist.branchId ?? therapist.branch?.id ?? therapist.branches?.[0]?.id;
  const branchName = therapist.branch?.name ?? therapist.branches?.[0]?.name;
  const phoneDigits = therapist.phone ? therapist.phone.replace(/\D/g, "") : "";
  const phone10 = phoneDigits.length >= 10 ? phoneDigits.slice(-10) : phoneDigits;

  return {
    id: therapist.id,
    branchId,
    branch: branchName,
    therapistName: displayValue(therapist.userName ?? therapist.therapistName),
    speciality: displayValue(therapist.speciality ?? therapist.category),
    email: displayValue(therapist.email),
    phone: phone10 || therapist.phone || "—",
    employeeId: displayValue(therapist.empId ?? therapist.employeeId),
    experience: displayValue(therapist.experience),
    status: therapist.status === "active" ? "Active" : "Inactive",
    roleId: therapist.roleId ?? therapist.role?.id ?? null,
    roleName: displayValue((therapist.roleName ?? therapist.role?.name)?.toUpperCase()),
    loginType: parseLoginTypeFromApi(therapist.loginType),
    createdAt: formatDate(therapist.createdAt),
    branches: therapist.branches ?? [],
    certifications: Array.isArray(therapist.certifications)
      ? therapist.certifications.filter((item) => item?.trim())
      : [],
    therapyIds: extractTherapyIdsFromTherapist(therapist),
  };
}

function TruncatedTherapistName({ name }: { name: string }) {
  const value = name?.trim() ? name.trim() : "—";
  const textRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;

    const checkTruncation = () => {
      setIsTruncated(element.scrollWidth > element.clientWidth + 1);
    };

    checkTruncation();

    const observer = new ResizeObserver(checkTruncation);
    observer.observe(element);
    return () => observer.disconnect();
  }, [value]);

  return (
    <Tooltip
      position="top"
      maxWidth={360}
      disabled={!isTruncated}
      className="!overflow-visible !py-2.5"
      content={
        <p className="m-0 max-w-[340px] whitespace-normal break-words text-left text-xs leading-[1.6] text-[#262D3B]">
          {value}
        </p>
      }
    >
      <div
        className="flex min-w-0 items-center w-[150px] max-w-[150px]"
      >
        <span ref={textRef} className="min-w-0 flex-1 overflow-hidden whitespace-nowrap">
          {value}
        </span>
        {isTruncated ? <span className="shrink-0 pl-1.5 text-[#434956]">...</span> : null}
      </div>
    </Tooltip>
  );
}

const panelTabOptions = [
  { value: "users", label: "Users" },
  { value: "doctors", label: "Doctors" },
  { value: "nurses", label: "Nurses" },
  { value: "therapist", label: "Therapists" },
];

const tabRoutes: Record<string, string> = {
  users: "/settings/users",
  doctors: "/settings/doctor",
  nurses: "/settings/nurse",
  therapist: "/settings/therapist",
};

function TruncatedTherapyLabel({ text }: { text: string }) {
  const value = text.trim();
  const textRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;

    const checkTruncation = () => {
      setIsTruncated(element.scrollWidth > element.clientWidth + 1);
    };

    checkTruncation();

    const observer = new ResizeObserver(checkTruncation);
    observer.observe(element);
    return () => observer.disconnect();
  }, [value]);

  if (!value) return null;

  return (
    <Tooltip
      position="top"
      maxWidth={280}
      disabled={!isTruncated}
      className="!overflow-visible !py-2.5"
      content={
        <p className="m-0 max-w-[260px] whitespace-normal break-words text-left text-xs leading-[1.6] text-[#262D3B]">
          {value}
        </p>
      }
    >
      <span ref={textRef} className="block min-w-0 w-full truncate">
        {value}
      </span>
    </Tooltip>
  );
}


export default function PanelTherapistPage() {
  const router = useRouter();
  const therapistPermission = usePermission("settings", { subModule: "users" });
  const canView = therapistPermission.canView;
  const canAdd = therapistPermission.canAdd;
  const canEdit = therapistPermission.canEdit;
  const canDownload = therapistPermission.canDownload;
  const [searchTerm, setSearchTerm] = useState("");
  const {
    selectedBranchFilter: selectedBranch,
    setSelectedBranchFilter: setSelectedBranch,
    branchFilterOptions: hookBranchFilterOptions,
    isLoadingBranches: isLoadingBranchFilter,
    isBranchFilterDisabled,
    filterBranchId: hookFilterBranchId,
  } = useBranchFilter();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [dialogMode, setDialogMode] = useState<"edit" | "view" | null>(null);
  const [selectedTherapist, setSelectedTherapist] = useState<PanelTherapist | null>(null);
  const [formValues, setFormValues] = useState<TherapistFormValues>(EMPTY_FORM_VALUES);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
  const [apiErrorMessage, setApiErrorMessage] = useState("");
  const [certifications, setCertifications] = useState<string[]>([""]);
  const [selectedTherapyIds, setSelectedTherapyIds] = useState<number[]>([]);
  const [certError, setCertError] = useState("");
  const [therapyError, setTherapyError] = useState("");
  const [exportError, setExportError] = useState("");
  const [showExportErrorDialog, setShowExportErrorDialog] = useState(false);
  const [exportButtonKey, setExportButtonKey] = useState(0);

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedBranch, sortField, sortOrder]);

  const { data: branchesData, isLoading: isLoadingBranches } = useGetBranchesQuery(undefined, {
    skip: !canView && !canAdd && !canEdit,
  });

  const selectedBranchId = hookFilterBranchId;

  const { data: therapistsData, isLoading: isLoadingTherapists, refetch: refetchTherapists } =
    useGetTherapistEntriesQuery(
      {
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearchTerm || undefined,
        branchId: selectedBranchId,
        sort: sortField,
        order: sortOrder,
      },
      {
        skip: !canView && !canAdd && !canEdit,
      }
    );

  const [updateTherapist, { isLoading: isUpdating }] = useUpdateTherapistMutation();
  const [triggerPdf, { isFetching: pdfLoading }] = useLazyGeneratePdfForTherapistQuery();
  const [triggerCsv, { isFetching: csvLoading }] = useLazyGenerateCsvForTherapistQuery();

  const branchOptions: SelectOption[] = useMemo(() => {
    const rows = branchesData?.data ?? [];
    return rows.map((b) => {
      const typeLabel = (b as { type?: string }).type
        ? String((b as { type?: string }).type)
          .charAt(0)
          .toUpperCase() + String((b as { type?: string }).type).slice(1).toLowerCase()
        : "";
      const label = typeLabel ? `${b.name} (${typeLabel})` : b.name;
      return { value: String(b.id), label };
    });
  }, [branchesData]);

  const resolveBranchFormValue = (stored: string | number | undefined): string => {
    if (stored == null || stored === "") return "";
    const asStr = String(stored);
    if (branchOptions.some((o) => o.value === asStr)) return asStr;
    return branchOptions.find((o) => o.label === asStr)?.value ?? asStr;
  };

  const editBranchId = useMemo(() => {
    const parsed = Number.parseInt(formValues.branch, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }, [formValues.branch]);

  const { data: rolesData, isFetching: isLoadingRoles } = useGetTherapistRoleByBranchQuery(
    { branchId: editBranchId ?? 0 },
    {
      skip: dialogMode === null || !editBranchId,
      refetchOnMountOrArgChange: true,
    }
  );

  const { data: therapiesData } = useGetTherapiesQuery(
    { branchId: editBranchId },
    { skip: dialogMode === null || !editBranchId }
  );

  const therapyList = useMemo(() => therapiesData?.data ?? [], [therapiesData]);

  const roleOptions: SelectOption[] = useMemo(() => {
    const fromApi = (rolesData?.data ?? []).map((role) => ({
      value: String(role.roleId),
      label: (role.roleName ?? "").toUpperCase(),
    }));

    if (
      formValues.roleId &&
      !fromApi.some((option) => option.value === formValues.roleId) &&
      selectedTherapist?.roleName &&
      selectedTherapist.roleName !== "—"
    ) {
      return [{ value: formValues.roleId, label: selectedTherapist.roleName.toUpperCase() }, ...fromApi];
    }

    return fromApi;
  }, [rolesData, formValues.roleId, selectedTherapist?.roleName]);

  const branchOptionsWithSelected: SelectOption[] = useMemo(() => {
    if (
      formValues.branch &&
      !branchOptions.some((option) => option.value === formValues.branch) &&
      selectedTherapist?.branch
    ) {
      return [{ value: formValues.branch, label: selectedTherapist.branch }, ...branchOptions];
    }
    return branchOptions;
  }, [branchOptions, formValues.branch, selectedTherapist?.branch]);

  const isEditMode = dialogMode === "edit";
  const isViewMode = dialogMode === "view";

  const addCertification = () => setCertifications((prev) => [...prev, ""]);
  const removeCertification = (idx: number) => {
    setCertifications((prev) => prev.filter((_, i) => i !== idx));
    setCertError("");
  };
  const updateCertification = (idx: number, value: string) => {
    setCertifications((prev) => prev.map((c, i) => (i === idx ? value : c)));
    setCertError("");
  };
  const toggleTherapy = (id: number) => {
    if (isViewMode) return;
    setSelectedTherapyIds((prev) =>
      prev.includes(id) ? prev.filter((therapyId) => therapyId !== id) : [...prev, id]
    );
    setTherapyError("");
  };

  const therapists: PanelTherapist[] = useMemo(() => {
    if (!therapistsData?.data?.length) {
      return [];
    }

    return therapistsData.data.map(mapTherapistToRow);
  }, [therapistsData]);

  const paginatedTherapists = therapists;
  const totalItems = therapistsData?.data?.length
    ? therapistsData?.total || therapists.length
    : therapists.length;

  const showActionColumn = canView || canEdit;
  const tableColSpan = showActionColumn ? TABLE_COLUMN_COUNT : TABLE_COLUMN_COUNT - 1;

  const handleEdit = (therapist: PanelTherapist) => {
    if (!canEdit) return;
    setSelectedTherapist(therapist);

    const branchValue =
      therapist.branchId != null
        ? resolveBranchFormValue(therapist.branchId)
        : therapist.branches?.[0]?.id != null
          ? resolveBranchFormValue(therapist.branches[0].id)
          : selectedBranch
            ? resolveBranchFormValue(selectedBranch)
            : "";

    setFormValues({
      branch: branchValue,
      roleId: therapist.roleId != null ? String(therapist.roleId) : "",
      therapistName: therapist.therapistName === "—" ? "" : therapist.therapistName,
      speciality: therapist.speciality === "—" ? "" : therapist.speciality,
      email: therapist.email === "—" ? "" : therapist.email,
      phone: normalizeContactNumberForForm(therapist.phone === "—" ? "" : therapist.phone),
      employeeId: therapist.employeeId === "—" ? "" : therapist.employeeId,
      experience: therapist.experience === "—" ? "" : therapist.experience,
      loginType: therapist.loginType,
      status: therapist.status === "Active" ? "active" : "inactive",
    });
    setCertifications(
      therapist.certifications.length > 0 ? [...therapist.certifications] : [""]
    );
    setSelectedTherapyIds([...therapist.therapyIds]);
    setCertError("");
    setTherapyError("");
    setFormErrors({});
    setDialogMode("edit");
  };

  const handleView = (therapist: PanelTherapist) => {
    if (!canView) return;
    setSelectedTherapist(therapist);

    const branchValue =
      therapist.branchId != null
        ? resolveBranchFormValue(therapist.branchId)
        : therapist.branches?.[0]?.id != null
          ? resolveBranchFormValue(therapist.branches[0].id)
          : "";

    setFormValues({
      branch: branchValue,
      roleId: therapist.roleId != null ? String(therapist.roleId) : "",
      therapistName: therapist.therapistName === "—" ? "" : therapist.therapistName,
      speciality: therapist.speciality === "—" ? "" : therapist.speciality,
      email: therapist.email === "—" ? "" : therapist.email,
      phone: normalizeContactNumberForForm(therapist.phone === "—" ? "" : therapist.phone),
      employeeId: therapist.employeeId === "—" ? "" : therapist.employeeId,
      experience: therapist.experience === "—" ? "" : therapist.experience,
      loginType: therapist.loginType,
      status: therapist.status === "Active" ? "active" : "inactive",
    });
    setCertifications(
      therapist.certifications.length > 0 ? [...therapist.certifications] : [""]
    );
    setSelectedTherapyIds([...therapist.therapyIds]);
    setCertError("");
    setTherapyError("");
    setFormErrors({});
    setDialogMode("view");
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    const therapistNameTrim = formValues.therapistName.trim();
    if (!therapistNameTrim) {
      errors.therapistName = "Therapist name is required";
    } else if (!/^[a-zA-Z\s]+$/.test(therapistNameTrim)) {
      errors.therapistName = "Only letters and spaces are allowed";
    } else if (therapistNameTrim.length > 100) {
      errors.therapistName = "Therapist name cannot exceed 100 characters";
    }

    if (!isEditMode) {
      if (!formValues.branch) errors.branch = "Branch is required";
      if (!formValues.roleId.trim()) errors.roleId = "Role is required";
    }

    if (isEditMode) {
      const specialityTrim = formValues.speciality.trim();
      if (!specialityTrim) {
        errors.speciality = "Speciality is required";
      } else if (!/^[a-zA-Z\s]+$/.test(specialityTrim)) {
        errors.speciality = "Only letters and spaces are allowed";
      }

      if (!formValues.experience.trim()) {
        errors.experience = "Experience is required";
      }
    }

    const filledCerts = certifications.filter((item) => item.trim());
    if (isEditMode && filledCerts.length === 0) {
      setCertError("At least one certification is required.");
    } else {
      setCertError("");
    }

    if (isEditMode && selectedTherapyIds.length === 0) {
      setTherapyError("At least one therapy must be selected.");
    } else {
      setTherapyError("");
    }

    setFormErrors(errors);
    return (
      Object.keys(errors).length === 0 &&
      (!isEditMode || (filledCerts.length > 0 && selectedTherapyIds.length > 0))
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit || !selectedTherapist) return;
    if (!validateForm()) return;

    const branchIdNum = Number.parseInt(formValues.branch, 10);
    if (!Number.isFinite(branchIdNum) || branchIdNum <= 0) {
      setFormErrors((prev) => ({ ...prev, branch: "Branch is required" }));
      return;
    }

    const phoneDigits = formValues.phone.trim();
    if (!phoneDigits) {
      setFormErrors((prev) => ({ ...prev, phone: "Phone is required" }));
      return;
    }

    try {
      const result = await updateTherapist({
        id: selectedTherapist.id,
        body: {
          branchId: branchIdNum,
          userName: formValues.therapistName.trim(),
          phone: formatPhoneForApi(phoneDigits),
          loginType: formValues.loginType,
          status: formValues.status,
          experience: formValues.experience.trim(),
          speciality: formValues.speciality.trim(),
          certifications: certifications.map((item) => item.trim()).filter(Boolean),
          therapyIds: selectedTherapyIds,
        },
      }).unwrap();

      setSuccessMessage(result?.message || "Therapist updated successfully");
      setShowSuccessDialog(true);
      await refetchTherapists();

      closeDialog();
    } catch (error: unknown) {
      console.error("Failed to update therapist:", error);
      setApiErrorMessage(getRtkErrorMessage(error, "Failed to update therapist. Please try again."));
      setShowApiErrorDialog(true);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  const closeExportMenu = () => {
    setExportButtonKey((key) => key + 1);
  };

  const handleExportPDF = async () => {
    closeExportMenu();
    if (selectedBranchId == null) {
      setExportError("Select a branch to export.");
      setShowExportErrorDialog(true);
      return;
    }
    try {
      const res = await triggerPdf({
        branchId: selectedBranchId,
        search: debouncedSearchTerm.trim(),
      }).unwrap();
      if (res?.data?.url) {
        window.open(res.data.url, "_blank", "noopener,noreferrer");
      }
    } catch (error: unknown) {
      setExportError(getRtkErrorMessage(error, "Failed to export PDF. Please try again."));
      setShowExportErrorDialog(true);
    }
  };

  const handleExportCSV = async () => {
    closeExportMenu();
    if (selectedBranchId == null) {
      setExportError("Select a branch to export.");
      setShowExportErrorDialog(true);
      return;
    }
    try {
      const res = await triggerCsv({
        branchId: selectedBranchId,
        search: debouncedSearchTerm.trim(),
      }).unwrap();
      if (res?.data?.url) {
        window.open(res.data.url, "_blank", "noopener,noreferrer");
      }
    } catch (error: unknown) {
      setExportError(getRtkErrorMessage(error, "Failed to export CSV. Please try again."));
      setShowExportErrorDialog(true);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const getStatusBadgeClass = (status: TherapistStatus) =>
    status === "Active"
      ? "border-[#0B8C00]/20 bg-[#0B8C000D] text-[#0B8C00]"
      : "border-[#F6776E]/24 bg-[#F6776E0D] text-[#F6776E]";

  const getSortDirection = (field: string): "asc" | "desc" | null => {
    if (sortField === field) {
      return sortOrder;
    }
    return null;
  };

  const handleTabChange = (value: string) => {
    const route = tabRoutes[value];
    if (route && route !== "/settings/therapist") {
      router.push(route);
    }
  };

  const closeDialog = () => {
    setDialogMode(null);
    setSelectedTherapist(null);
    setFormErrors({});
    setFormValues(EMPTY_FORM_VALUES);
    setCertifications([""]);
    setSelectedTherapyIds([]);
    setCertError("");
    setTherapyError("");
  };

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <PageHeading title="Therapists" />
        </div>

        <ListBorder as="section" className="px-4 py-4">
          <div className="mb-4 w-full max-w-[600px]">
            <Tabs options={panelTabOptions} value="therapist" onChange={handleTabChange} />
          </div>

          <div className="w-full overflow-hidden rounded-[16px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold leading-[120%] text-[#434956]"></h2>

              <div className="flex items-center gap-3">
                <div className="flex-shrink-0" style={{ width: "300px" }}>
                  <FormSelectField
                    label=""
                    value={selectedBranch}
                    onChange={(value) => {
                      const newValue = Array.isArray(value) ? value[0] : value || "";
                      setSelectedBranch(newValue);
                      setCurrentPage(1);
                    }}
                    options={hookBranchFilterOptions}
                    placeholder={isLoadingBranchFilter ? "Loading..." : "Select Branch"}
                    mode="single"
                    background="normal"
                    width={300}
                    disabled={isBranchFilterDisabled || isLoadingBranchFilter}
                  />
                </div>
                <div className="flex-shrink-0" style={{ width: "300px" }}>
                  <TableSearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search Here..." />
                </div>
                {canAdd ? (
                  <button
                    type="button"
                    className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] whitespace-nowrap"
                    onClick={() => router.push("/settings/therapist/add")}
                  >
                    <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                    <span className="text-hide">Add Therapist</span>
                  </button>
                ) : null}
                {canDownload ? (
                  <ExportButton
                    key={exportButtonKey}
                    onExportPDF={handleExportPDF}
                    onExportCSV={handleExportCSV}
                    isLoadingPDF={pdfLoading}
                    isLoadingCSV={csvLoading}
                  />
                ) : null}
              </div>
            </div>

            {!canView ? (
              <div className="py-12 text-center text-sm text-[#9CA3AF]">
                You don&apos;t have permission to view therapists.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead position="first" className="whitespace-nowrap">
                      S.no.
                    </TableHead>
                    <TableHead
                      sortable
                      sortDirection={getSortDirection("userName")}
                      onSort={() => handleSort("userName")}
                      className="whitespace-nowrap w-[200px] max-w-[200px]"
                    >
                      Therapist
                    </TableHead>
                    <TableHead
                      sortable
                      sortDirection={getSortDirection("email")}
                      onSort={() => handleSort("email")}
                    >
                      Email
                    </TableHead>
                    <TableHead
                      sortable
                      sortDirection={getSortDirection("phone")}
                      onSort={() => handleSort("phone")}
                    >
                      Phone
                    </TableHead>
                    <TableHead
                      sortable
                      sortDirection={getSortDirection("empId")}
                      onSort={() => handleSort("empId")}
                    >
                      Employee ID
                    </TableHead>
                    <TableHead
                      sortable
                      sortDirection={getSortDirection("experience")}
                      onSort={() => handleSort("experience")}
                    >
                      Experience
                    </TableHead>
                    <TableHead
                      sortable
                      sortDirection={getSortDirection("speciality")}
                      onSort={() => handleSort("speciality")}
                    >
                      Speciality
                    </TableHead>
                    <TableHead
                      sortable
                      sortDirection={getSortDirection("status")}
                      onSort={() => handleSort("status")}
                    >
                      Status
                    </TableHead>
                    {showActionColumn ? <TableHead position="last">Action</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingTherapists ? (
                    <TableRow>
                      <TableData colSpan={tableColSpan} className="py-12 text-center text-sm text-[#9CA3AF]">
                        Loading...
                      </TableData>
                    </TableRow>
                  ) : paginatedTherapists.length === 0 ? (
                    <TableRow>
                      <TableData colSpan={tableColSpan} className="py-12 text-center text-sm text-[#9CA3AF]">
                        No therapists found
                      </TableData>
                    </TableRow>
                  ) : (
                    paginatedTherapists.map((therapist, index) => (
                      <TableRow key={therapist.id}>
                        <TableData position="first">{(currentPage - 1) * itemsPerPage + index + 1}</TableData>
                        <TableData className="w-[220px]">
                          <Tooltip content={therapist.therapistName || "—"} position="top">
                            <span className="inline-block max-w-[220px] truncate align-middle font-medium text-[#262D3B]">
                              {/* {therapist.therapistName || "—"} */}
                                  {
                                    therapist.therapistName
                                      ? therapist.therapistName
                                          .split(" ")
                                          .map(
                                            (word) =>
                                              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                                          )
                                          .join(" ")
                                      : "—"
                                  } 
                               </span>
                          </Tooltip>
                        </TableData>
                        <TableData className="max-w-[220px]">
                          <Tooltip content={therapist.email || "—"} position="top">
                            <span className="inline-block max-w-[220px] truncate align-middle">
                              {therapist.email || "—"}
                            </span>
                          </Tooltip>
                        </TableData>
                        <TableData className="whitespace-nowrap">{therapist.phone}</TableData>
                        <TableData className="max-w-[130px]">
                          <Tooltip content={therapist.employeeId || "—"} position="top">
                            <span className="inline-block max-w-[110px] truncate align-middle">
                              {therapist.employeeId || "—"}
                            </span>
                          </Tooltip>
                        </TableData>
                        <TableData className="whitespace-nowrap">{therapist.experience}</TableData>
                        <TableData className="max-w-[180px]">
                          <Tooltip content={therapist.speciality || "—"} position="top">
                            <span className="inline-block max-w-[160px] truncate align-middle">
                              {therapist.speciality || "—"}
                            </span>
                          </Tooltip>
                        </TableData>
                        <TableData>
                          <span
                            className={`inline-flex h-[24px] min-w-[86px] items-center justify-center rounded-[30px] border px-5 text-xs font-medium ${getStatusBadgeClass(therapist.status)}`}
                          >
                            {therapist.status}
                          </span>
                        </TableData>
                        {showActionColumn ? (
                          <TableData position="last">
                            <div className="flex items-center gap-3">
                              {canView ? (
                                <Tooltip content="View" position="top" delay={0}>
                                  <button
                                    type="button"
                                    className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                                    onClick={() => handleView(therapist)}
                                    aria-label="View therapist"
                                  >
                                    <Image src="/icons/ViewEyeIcon.svg" alt="View" width={16} height={16} />
                                  </button>
                                </Tooltip>
                              ) : null}
                              {canEdit ? (
                                <Tooltip content="Edit" position="top" delay={0}>
                                  <button
                                    type="button"
                                    className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                                    onClick={() => handleEdit(therapist)}
                                    aria-label="Edit therapist"
                                  >
                                    <Image src="/icons/EditIconBlack.svg" alt="Edit" width={16} height={16} />
                                  </button>
                                </Tooltip>
                              ) : null}
                            </div>
                          </TableData>
                        ) : null}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}

            {canView && !isLoadingTherapists && totalItems > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
                itemsPerPageOptions={[10, 20, 50, 100]}
              />
            )}
          </div>
        </ListBorder>
      </div>

      <Dialog
        open={
          dialogMode !== null &&
          ((dialogMode === "view" && canView) || (dialogMode === "edit" && canEdit))
        }
        onClose={closeDialog}
        title={dialogMode === "edit" ? "Edit Therapist" : "View Therapist"}
        width={1601}
      >
        <form
          noValidate
          onSubmit={dialogMode === "edit" ? handleSubmit : (e) => e.preventDefault()}
          className="space-y-6"
        >
          <div className="flex items-stretch gap-4">
            <div className="min-w-0 flex-1">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <FormSelectField
                    label="Branch *"
                    value={formValues.branch}
                    onChange={(value) => {
                      if (dialogMode === "view" || isEditMode) return;
                      const next = Array.isArray(value) ? value[0] : value || "";
                      setFormValues((prev) => ({
                        ...prev,
                        branch: next,
                        roleId: "",
                      }));
                      setFormErrors((prev) => ({ ...prev, branch: "", roleId: "" }));
                    }}
                    options={branchOptionsWithSelected}
                    placeholder={isLoadingBranches ? "Loading branches..." : "Select branch"}
                    mode="single"
                    background="white"
                    disabled={dialogMode === "view" || isEditMode || isLoadingBranches}
                  />
                  {formErrors.branch && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.branch}</p>}
                </div>

                <div>
                  <FormSelectField
                    label="Role *"
                    value={formValues.roleId}
                    onChange={(value) => {
                      if (dialogMode === "view" || isEditMode) return;
                      const next = Array.isArray(value) ? value[0] : value || "";
                      setFormValues((prev) => ({ ...prev, roleId: next }));
                      setFormErrors((prev) => ({ ...prev, roleId: "" }));
                    }}
                    options={roleOptions}
                    placeholder={
                      isLoadingRoles
                        ? "Loading roles..."
                        : !formValues.branch
                          ? "Select branch first"
                          : roleOptions.length === 0
                            ? "No roles available"
                            : "Select role"
                    }
                    mode="single"
                    background="white"
                    disabled={
                      dialogMode === "view" ||
                      isEditMode ||
                      isLoadingRoles ||
                      !formValues.branch ||
                      roleOptions.length === 0
                    }
                  />
                  {formErrors.roleId && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.roleId}</p>}
                </div>

                <div>
                  <FormInputField
                    label="Therapist Name *"
                    value={formValues.therapistName}
                    onChange={(event) => {
                      if (dialogMode === "view") return;
                      setFormValues((prev) => ({
                        ...prev,
                        therapistName: sanitizePatientNameInput(event.target.value),
                      }));
                      setFormErrors((prev) => ({ ...prev, therapistName: "" }));
                    }}
                    onBlur={(event) => {
                      if (dialogMode === "view") return;
                      const trimmed = event.target.value.trim();
                      if (trimmed !== event.target.value) {
                        setFormValues((prev) => ({ ...prev, therapistName: trimmed }));
                      }
                    }}
                    height={44}
                    placeholder="Therapist Name"
                    required={dialogMode === "edit"}
                    disabled={dialogMode === "view"}
                    maxLength={100}
                    type="text"
                  />
                  {formErrors.therapistName && (
                    <p className="mt-1 text-xs text-[#F6776E]">{formErrors.therapistName}</p>
                  )}
                </div>

                <div>
                  <FormInputField
                    label="Speciality *"
                    value={formValues.speciality}
                    onChange={(event) => {
                      if (dialogMode === "view") return;
                      setFormValues((prev) => ({ ...prev, speciality: event.target.value }));
                      setFormErrors((prev) => ({ ...prev, speciality: "" }));
                    }}
                    height={44}
                    placeholder="Speciality"
                    required={dialogMode === "edit"}
                    disabled={dialogMode === "view"}
                  />
                  {formErrors.speciality && (
                    <p className="mt-1 text-xs text-[#F6776E]">{formErrors.speciality}</p>
                  )}
                </div>

                <div>
                  <FormInputField
                    label="Email *"
                    value={formValues.email}
                    height={44}
                    placeholder="Email"
                    disabled
                  />
                </div>

                <div>
                  <FormInputField
                    label="Phone *"
                    value={formValues.phone}
                    onChange={(event) => {
                      if (dialogMode === "view") return;
                      setFormValues((prev) => ({
                        ...prev,
                        phone: sanitizeDigitsOnlyInput(event.target.value, 10),
                      }));
                      setFormErrors((prev) => ({ ...prev, phone: "" }));
                    }}
                    height={44}
                    placeholder="Phone"
                    disabled
                    type="tel"
                    maxLength={10}
                  />
                  {formErrors.phone && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.phone}</p>}
                </div>

                <div>
                  <FormInputField
                    label="Employee ID *"
                    value={formValues.employeeId}
                    height={44}
                    placeholder="Employee ID"
                    disabled
                  />
                </div>

                <div>
                  <FormInputField
                    label="Experience *"
                    value={formValues.experience}
                    onChange={(event) => {
                      if (dialogMode === "view") return;
                      setFormValues((prev) => ({ ...prev, experience: event.target.value }));
                      setFormErrors((prev) => ({ ...prev, experience: "" }));
                    }}
                    height={44}
                    placeholder="Experience"
                    required={dialogMode === "edit"}
                    disabled={dialogMode === "view"}
                  />
                  {formErrors.experience && (
                    <p className="mt-1 text-xs text-[#F6776E]">{formErrors.experience}</p>
                  )}
                </div>

                <div>
                  <FormSelectField
                    label="Login Type *"
                    value={formValues.loginType}
                    onChange={(value) => {
                      if (dialogMode === "view") return;
                      const v = Array.isArray(value) ? value[0] : value;
                      setFormValues((prev) => ({
                        ...prev,
                        loginType:
                          v === "no-auth" || v === "ip" || v === "otp" || v === "ip-otp"
                            ? v
                            : "no-auth",
                      }));
                    }}
                    options={loginTypeOptions}
                    placeholder="Login Type"
                    mode="single"
                    background="white"
                    disabled={dialogMode === "view"}
                  />
                </div>
                <div>
                  <FormSelectField
                    label="Status *"
                    value={formValues.status}
                    onChange={(value) => {
                      if (dialogMode === "view") return;
                      const next = (Array.isArray(value) ? value[0] : value || "inactive") as
                        | "active"
                        | "inactive";
                      setFormValues((prev) => ({ ...prev, status: next }));
                    }}
                    options={statusOptions}
                    placeholder="Status"
                    mode="single"
                    background="white"
                    disabled={dialogMode === "view"}
                  />
                </div>
              </div>

              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#1A1A1A]">Certifications <span className="text-[#F6776E]">*</span></span>
                  {!isViewMode ? (
                    <button
                      type="button"
                      onClick={addCertification}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-[#0B8C00] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2]"
                      title="Add certification"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M8 3.333v9.334M3.333 8h9.334"
                          stroke="#0B8C00"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  ) : null}
                </div>
                <div className="space-y-3">
                  {certifications.map((cert, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="flex-1">
                        <FormInputField
                          label=""
                          value={cert}
                          onChange={(event) => updateCertification(idx, event.target.value)}
                          placeholder="Certification"
                          height={44}
                          disabled={isViewMode}
                        />
                      </div>
                      {!isViewMode ? (
                        <button
                          type="button"
                          onClick={() => removeCertification(idx)}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0B8C00] transition-colors hover:bg-[#097200]"
                          title="Remove"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path
                              d="M2 4h12M5.333 4V2.667h5.334V4M6.667 7.333v4M9.333 7.333v4M3.333 4l.667 9.333h8l.667-9.333H3.333z"
                              stroke="white"
                              strokeWidth="1.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
                {certError ? <p className="mt-1.5 text-xs text-red-500">{certError}</p> : null}
              </div>
            </div>

            <div className="w-[390px] shrink-0 rounded-[20px] border border-[#E3EEE1] bg-white p-5">
              <p className="mb-1 text-sm font-semibold text-[#1A1A1A]">Specializations <span className="text-[#F6776E]">*</span></p>
              {!therapyError ? <div className="mb-3" /> : null}
              {therapyList.length === 0 ? (
                <p className="text-xs text-[#9CA3AF]">
                  {editBranchId
                    ? "No therapies available for this branch."
                    : "Select a branch to load therapies."}
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {therapyList.map((therapy) => {
                    const active = selectedTherapyIds.includes(therapy.id);
                    const label = therapy.therapyName
                      ? therapy.therapyName.charAt(0).toUpperCase() + therapy.therapyName.slice(1)
                      : "";

                    return (
                      <button
                        key={therapy.id}
                        type="button"
                        onClick={() => toggleTherapy(therapy.id)}
                        disabled={isViewMode}
                        className={`min-w-0 w-full rounded-full border px-2 py-1 text-center text-xs font-normal text-[#525763] transition-colors ${active
                          ? "border-[#0B8C00] bg-[#0B8C00] text-white"
                          : "border-[#D1D5DB] bg-white text-[#374151] hover:border-[#0B8C00] hover:text-[#0B8C00]"
                          } ${isViewMode ? "cursor-default" : ""}`}
                      >
                        <TruncatedTherapyLabel text={label} />
                      </button>
                    );
                  })}
                </div>
              )}
              {therapyError ? <p className="mb-3 mt-2 text-xs text-red-500">{therapyError}</p> : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {dialogMode === "view" ? (
              <Button type="button" variant="outline" onClick={closeDialog}>
                Close
              </Button>
            ) : (
              <>
                <Button type="submit" variant="primary" isLoading={isUpdating} disabled={isUpdating}>
                  Update Therapist
                </Button>
                <Button type="button" variant="outline" onClick={closeDialog} disabled={isUpdating}>
                  Cancel
                </Button>
              </>
            )}
          </div>
        </form>
      </Dialog>

      <MessageDialog
        open={showSuccessDialog}
        onClose={() => {
          setShowSuccessDialog(false);
        }}
        icon="/icons/SuccessCheck.svg"
        iconBgColor="#E8F5E9"
        message={successMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => {
          setShowSuccessDialog(false);
        }}
      />

      <MessageDialog
        open={showExportErrorDialog}
        onClose={() => setShowExportErrorDialog(false)}
        icon="/icons/CrossIcon.svg"
        iconBgColor="#FFEBEE"
        message={exportError}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => setShowExportErrorDialog(false)}
      />

      <MessageDialog
        open={showApiErrorDialog}
        onClose={() => {
          setShowApiErrorDialog(false);
        }}
        icon="/icons/CrossIcon.svg"
        iconBgColor="#FFEBEE"
        message={apiErrorMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => {
          setShowApiErrorDialog(false);
        }}
      />
    </AppShell>
  );
}

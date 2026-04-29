"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { FormTextareaField, Tabs, Button, Dialog, FormInputField, FormSelectField, TableSearchInput, Pagination, ExportButton, UserCard, MessageDialog } from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import type { SelectOption } from "@/components/ui/FormSelectField";
import { Toggle } from "@/components/ui/Toggle";
import {
  useGetBranchesQuery,
  useGetBranchRoleByCategoryTypeQuery,
  useGetUsersQuery,
  useAddUserMutation,
  useUpdateUserMutation,
  useLazyGenerateUsersPdfQuery,
  normalizeGetUsersResponse,
  type GetBranchRoleByCategoryTypeParams,
  type SettingsApiUser,
  type UpdateUserBody,
  type GetUsersParams,
} from "@/store/api/settingsApi";
import { API_BASE_URL } from "@/lib/config/api";
import { sanitizePatientNameInput, sanitizeDigitsOnlyInput } from "@/lib/utils/common";
import { sanitizeEmailInput, isValidEmailAddress } from "@/lib/utils/emailValidation";
import { usePermission } from "@/hooks/usePermission";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { PackageListCard, type PackageCard } from "@/components/ui/PackageListCard";

type User = {
  id: number;
  name: string;
  email: string;
  branch: string;
  phone: string;
  groupRole: string;
  assignableRoleId: number | null;
  permissionDate: string;
  lastLogin: string;
  status: "Active" | "Inactive";
  userType: "Facility" | "Corporate";
  branches: string[];
  employeeId: string;
  loginType: "no-auth" | "ip" | "otp" | "ip-otp";
};

function normalizeContactNumberForForm(phone: string): string {
  return sanitizeDigitsOnlyInput(phone, 10);
}

function formatPhoneForApi(digitsField: string): string {
  const digits = digitsField.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  return digitsField.trim().startsWith("+") ? digitsField.trim() : `+${digits}`;
}

function formatApiDateDisplay(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatApiDateTimeDisplay(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function parseLoginTypeFromApi(raw: string): User["loginType"] {
  const v = raw?.toLowerCase();
  if (v === "ip-otp" || v === "no-auth" || v === "ip" || v === "otp") return v;
  return "no-auth";
}

function mapApiUserToCardUser(u: SettingsApiUser): User {
  const branchLabel = u.branch?.name ?? "—";
  const branchIdStr =
    u.branch?.id != null
      ? String(u.branch.id)
      : u.branchId != null && u.branchId > 0
        ? String(u.branchId)
        : "";
  const roleId = u.roleId ?? u.role?.id ?? null;
  const rc = (u.roleCategoryType ?? "").toLowerCase();
  const userType: User["userType"] = rc === "corporate" ? "Corporate" : "Facility";
  const phoneDigits = u.phone ? u.phone.replace(/\D/g, "") : "";
  const phone10 = phoneDigits.length >= 10 ? phoneDigits.slice(-10) : phoneDigits;
  const empTrim = (u.empId ?? "").replace(/\s+/g, " ").trim();
  return {
    id: u.id,
    name: (u.userName ?? "").trim() || u.email,
    email: u.email,
    branch: branchLabel,
    phone: phone10 || u.phone || "",
    groupRole: u.role?.name ?? "—",
    assignableRoleId: roleId,
    permissionDate: formatApiDateDisplay(u.permissionDate ?? u.createdAt),
    lastLogin: formatApiDateTimeDisplay(u.lastLogin),
    status: u.status?.toLowerCase() === "active" ? "Active" : "Inactive",
    userType,
    branches: branchIdStr ? [branchIdStr] : [],
    employeeId: empTrim,
    loginType: parseLoginTypeFromApi(u.loginType),
  };
}

type AddPackageFormState = {
  diseaseCategory: string;
  packageName: string;
  description: string;
  medicinePrice: string;
  therapyLoad: string;
  therapyPrice: string;
  medicineEnabled: boolean;
  mealsEnabled: boolean;
  doctorFeesEnabled: boolean;
  nurseFeesEnabled: boolean;
  attendantFeesEnabled: boolean;
  therapyEnabled: boolean;
};

function defaultAddPackageForm(): AddPackageFormState {
  return {
    diseaseCategory: "",
    packageName: "",
    description: "",
    medicinePrice: "",
    therapyLoad: "",
    therapyPrice: "",
    medicineEnabled: true,
    mealsEnabled: false,
    doctorFeesEnabled: false,
    nurseFeesEnabled: false,
    attendantFeesEnabled: false,
    therapyEnabled: true,
  };
}

function parsePriceLabelToNumberField(label: string): string {
  const digits = label.replace(/[^\d.]/g, "");
  return digits || "";
}

function formatRsDisplayFromNumericInput(raw: string): string {
  const n = Number.parseFloat(String(raw).replace(/,/g, "").trim());
  if (!Number.isFinite(n)) return "Rs 0";
  return `Rs ${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

/** Best-effort hint for the disease category select when opening Edit from a card. */
function inferDiseaseCategoryFromPackageName(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("oncolog")) return "oncology";
  if (n.includes("cardiac") || n.includes("heart") || n.includes("dialysis")) return "cardiology";
  if (n.includes("neurolog")) return "neurology";
  if (n.includes("orthopedic")) return "orthopedics";
  return "";
}

const MOCK_PACKAGE_CARDS: PackageCard[] = [
  {
    id: 1,
    name: "Oncology Premium Care",
    description: "Comprehensive cancer treatment bundle...",
    priceLabel: "Rs 14,200",
    updatedLabel: "Updated 2h ago",
    status: "Active",
    statusClassName: "border-[#0B8C00]/20 bg-[#F2F8F2] text-[#0B8C00]",
    branchName: "HIIMS",
  },
  {
    id: 2,
    name: "General Recovery Lite",
    description: "Comprehensive cancer treatment bundle...",
    priceLabel: "Rs 14,200",
    updatedLabel: "Updated 1d ago",
    status: "Draft",
    statusClassName: "border-[#0B8C00]/20 bg-[#F2F8F2] text-[#3F3F3F]",
    branchName: "HIIMS Ambala",
  },
  {
    id: 3,
    name: "Cardiac Rehab Standard",
    description: "Post-surgery monitoring and therapy bundle...",
    priceLabel: "Rs 9,450",
    updatedLabel: "Updated 3d ago",
    status: "Active",
    statusClassName: "border-[#0B8C00]/20 bg-[#F2F8F2] text-[#0B8C00]",
    branchName: "HIIMS Panchkula",
  },
  {
    id: 4,
    name: "Orthopedic Mobility Plus",
    description: "Joint care, physio sessions, and room tier...",
    priceLabel: "Rs 11,800",
    updatedLabel: "Updated 5h ago",
    status: "Active",
    statusClassName: "border-[#0B8C00]/20 bg-[#F2F8F2] text-[#0B8C00]",
    branchName: "RDC Ghaziabad UP",
  },
  {
    id: 5,
    name: "Neurology Observation Pack",
    description: "ICU step-down with specialist consults...",
    priceLabel: "Rs 18,300",
    updatedLabel: "Updated 1w ago",
    status: "Draft",
    statusClassName: "border-[#0B8C00]/20 bg-[#F2F8F2] text-[#3F3F3F]",
    branchName: "Vaishali UP",
  },
  {
    id: 6,
    name: "Maternity Comfort",
    description: "Deluxe room, meals, and newborn essentials...",
    priceLabel: "Rs 22,000",
    updatedLabel: "Updated 12h ago",
    status: "Active",
    statusClassName: "border-[#0B8C00]/20 bg-[#F2F8F2] text-[#0B8C00]",
    branchName: "Prashant Vihar",
  },
  {
    id: 7,
    name: "Dialysis Day Package",
    description: "Same-day dialysis with nursing support...",
    priceLabel: "Rs 6,200",
    updatedLabel: "Updated 4d ago",
    status: "Active",
    statusClassName: "border-[#0B8C00]/20 bg-[#F2F8F2] text-[#0B8C00]",
    branchName: "Camp Jeena",
  },
  {
    id: 8,
    name: "Executive Health Check-In",
    description: "Private suite, diagnostics, and meals...",
    priceLabel: "Rs 15,900",
    updatedLabel: "Updated 6h ago",
    status: "Draft",
    statusClassName: "border-[#0B8C00]/20 bg-[#F2F8F2] text-[#3F3F3F]",
    branchName: "Shastri Nagar Delhi",
  },
  {
    id: 9,
    name: "Pediatric Care Basic",
    description: "Child-friendly ward with parent stay...",
    priceLabel: "Rs 7,400",
    updatedLabel: "Updated 2d ago",
    status: "Active",
    statusClassName: "border-[#0B8C00]/20 bg-[#F2F8F2] text-[#0B8C00]",
    branchName: "Sonipat",
  },
  {
    id: 10,
    name: "Senior Wellness Stay",
    description: "Extended stay with therapy and meals...",
    priceLabel: "Rs 10,100",
    updatedLabel: "Updated 8h ago",
    status: "Active",
    statusClassName: "border-[#0B8C00]/20 bg-[#F2F8F2] text-[#0B8C00]",
    branchName: "HIIMS",
  },
  {
    id: 11,
    name: "ICU Step-Down Bundle",
    description: "Monitored recovery after critical care...",
    priceLabel: "Rs 24,500",
    updatedLabel: "Updated 1d ago",
    status: "Draft",
    statusClassName: "border-[#0B8C00]/20 bg-[#F2F8F2] text-[#3F3F3F]",
    branchName: "MURAD NAGAR UP",
  },
  {
    id: 12,
    name: "Outpatient Surgery Pack",
    description: "Same-day procedure with observation slot...",
    priceLabel: "Rs 5,600",
    updatedLabel: "Updated 3h ago",
    status: "Active",
    statusClassName: "border-[#0B8C00]/20 bg-[#F2F8F2] text-[#0B8C00]",
    branchName: "HIIMS",
  },
];

function addPackageFormFromCard(pkg: PackageCard): AddPackageFormState {
  return {
    ...defaultAddPackageForm(),
    packageName: pkg.name,
    description: pkg.description,
    therapyPrice: parsePriceLabelToNumberField(pkg.priceLabel),
    diseaseCategory: inferDiseaseCategoryFromPackageName(pkg.name),
    therapyEnabled: pkg.status === "Active",
    medicineEnabled: pkg.status === "Active",
  };
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

/** Map GET /branches `type` to getBranchRoleByCategoryType `branchType` (API: hospital | clinic). */
function branchRecordTypeToRoleApiBranchType(apiType: string | undefined): "hospital" | "clinic" {
  const t = (apiType ?? "").toLowerCase().trim();
  if (t === "clinic") return "clinic";
  return "hospital";
}

function resolveAbsolutePdfUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  try {
    const base = new URL(API_BASE_URL);
    const path = url.startsWith("/") ? url : `/${url}`;
    return `${base.origin}${path}`;
  } catch {
    return new URL(url, window.location.origin).href;
  }
}

async function blobLooksLikePdf(blob: Blob): Promise<boolean> {
  if (blob.size < 5) return false;
  const head = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
  return head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46;
}

/**
 * Prefer blob download (same-origin or CORS-friendly). If fetch fails (typical: localhost → API host CORS),
 * fall back to opening the file URL in a new tab so the user can view/save the PDF.
 */
async function downloadPdfFromApiUrl(url: string, filename: string) {
  const absoluteUrl = resolveAbsolutePdfUrl(url);
  const safeName = filename?.trim() ? filename.trim() : "users-report.pdf";
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("authToken") || sessionStorage.getItem("authToken")
      : null;

  const saveBlob = (blob: Blob) => {
    const objectUrl = URL.createObjectURL(blob);
    try {
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = safeName;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  const tryFetchBlob = async (withBearer: boolean): Promise<Blob | null> => {
    const headers: HeadersInit = {};
    if (withBearer && token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(absoluteUrl, {
      credentials: "include",
      headers,
      mode: "cors",
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.blob();
  };

  for (const withBearer of [true, false]) {
    try {
      const blob = await tryFetchBlob(withBearer);
      if (blob && blob.size > 0 && (await blobLooksLikePdf(blob))) {
        saveBlob(blob);
        return;
      }
    } catch {
      /* CORS, network, blocked */
    }
  }

  const w = window.open(absoluteUrl, "_blank", "noopener,noreferrer");
  if (!w) {
    const a = document.createElement("a");
    a.href = absoluteUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

const EMPLOYEE_ID_MAX_LEN = 25;

/** Letters, digits, space, hyphen, underscore only (Employee Id); no more than 2 identical chars in a row; API max 25 characters. */
function sanitizeEmployeeIdInput(raw: string): string {
  let value = raw.replace(/[^a-zA-Z0-9 _-]/g, "");
  value = value.replace(/(.)\1{2,}/g, "$1$1");
  return value.slice(0, EMPLOYEE_ID_MAX_LEN);
}

const loginTypeOptions: SelectOption[] = [
  { value: "no-auth", label: "No auth" },
  { value: "ip", label: "IP" },
  { value: "otp", label: "OTP" },
  { value: "ip-otp", label: "IP + OTP" },
];

const statusOptions: SelectOption[] = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
];

const userTypeOptions: SelectOption[] = [
  { value: "Facility", label: "Facility" },
  { value: "Corporate", label: "Corporate" },
];

export default function PackagePage() {
  const usersPermission = usePermission("settings", { subModule: "users" });
  const canView = usersPermission.canView;
  const canAdd = usersPermission.canAdd;
  const canEdit = usersPermission.canEdit;
  const canDownload = usersPermission.canDownload;

  const { data: branchesRes, isLoading: isLoadingBranches } = useGetBranchesQuery(undefined, {
    skip: !canView && !canAdd && !canEdit,
  });

  const branchOptions: SelectOption[] = useMemo(() => {
    const rows = branchesRes?.success && Array.isArray(branchesRes.data) ? branchesRes.data : [];
    return rows.map((b) => ({ value: String(b.id), label: b.name }));
  }, [branchesRes]);

  /** None + API branches: toolbar filter and facility user branch field */
  const branchOptionsWithNone: SelectOption[] = useMemo(
    () => [{ value: "", label: "None" }, ...branchOptions],
    [branchOptions]
  );

  const resolveBranchFormValue = (stored: string): string => {
    if (!stored || stored === "None") return "";
    if (branchOptions.some((o) => o.value === stored)) return stored;
    return branchOptions.find((o) => o.label === stored)?.value ?? "";
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  /** Toolbar: none (all) | facility | corporate — matches getUsers `roleCategoryType`. */
  const [listRoleCatFilter, setListRoleCatFilter] = useState<"facility" | "corporate" | null>(null);
  const {
    selectedBranchFilter: selectedBranch,
    setSelectedBranchFilter: setSelectedBranch,
    branchFilterOptions: hookBranchFilterOptions,
    isLoadingBranches: isLoadingBranchFilter,
    isBranchFilterDisabled,
    filterBranchId: hookFilterBranchId,
  } = useBranchFilter();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);
  const [packagesCurrentPage, setPackagesCurrentPage] = useState(1);
  const [packagesItemsPerPage, setPackagesItemsPerPage] = useState(10);
  const [dialogMode, setDialogMode] = useState<"add" | "edit" | "view" | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formValues, setFormValues] = useState({
    assignableRoleId: "",
    fullName: "",
    username: "",
    phone: "",
    branch: "",
    branches: [] as string[],
    employeeId: "",
    loginType: "no-auth",
    status: "Active",
    userType: "Facility",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [messageDialog, setMessageDialog] = useState<{
    open: boolean;
    variant: "success" | "error";
    message: string;
  }>({ open: false, variant: "success", message: "" });

  const [activePackageCards, setActivePackageCards] = useState<PackageCard[]>(() => [...MOCK_PACKAGE_CARDS]);
  const [archivedPackageCards, setArchivedPackageCards] = useState<PackageCard[]>([]);
  const [packageArchiveConfirm, setPackageArchiveConfirm] = useState<PackageCard | null>(null);
  const [showArchiveSuccessDialog, setShowArchiveSuccessDialog] = useState(false);
  const [archiveSuccessMessage, setArchiveSuccessMessage] = useState("");
  const [showSavePackageSuccessDialog, setShowSavePackageSuccessDialog] = useState(false);
  const [savePackageSuccessMessage, setSavePackageSuccessMessage] = useState("");
  const [showSavePackageErrorDialog, setShowSavePackageErrorDialog] = useState(false);
  const [savePackageErrorMessage, setSavePackageErrorMessage] = useState("");
  const [editingPackageId, setEditingPackageId] = useState<number | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchTerm), 350);
    return () => window.clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedBranch, itemsPerPage, listRoleCatFilter]);

  const listBranchId = hookFilterBranchId;

  const getUsersQueryParams = useMemo((): GetUsersParams => {
    const base: GetUsersParams = {
      page: currentPage,
      limit: itemsPerPage,
      sort: "id",
      order: "desc",
      search: debouncedSearch.trim() || undefined,
    };
    if (listRoleCatFilter === "corporate") {
      return { ...base, roleCategoryType: "corporate" };
    }
    if (listRoleCatFilter === "facility") {
      return {
        ...base,
        roleCategoryType: "facility",
        ...(listBranchId != null ? { branchId: listBranchId } : {}),
      };
    }
    return {
      ...base,
      ...(listBranchId != null ? { branchId: listBranchId } : {}),
    };
  }, [currentPage, itemsPerPage, debouncedSearch, listBranchId, listRoleCatFilter]);

  const { data: usersRes, isLoading: isLoadingUsers, isFetching: isFetchingUsers } = useGetUsersQuery(
    getUsersQueryParams,
    { skip: !canView }
  );

  const { usersList, totalUsers } = useMemo(() => {
    const { rows, total: apiTotal } = normalizeGetUsersResponse(usersRes);
    const list = rows.map(mapApiUserToCardUser);
    let total: number;
    if (apiTotal != null) {
      total = apiTotal;
    } else if (rows.length < itemsPerPage) {
      total = (currentPage - 1) * itemsPerPage + rows.length;
    } else {
      total = currentPage * itemsPerPage + 1;
    }
    return { usersList: list, totalUsers: total };
  }, [usersRes, itemsPerPage, currentPage]);

  const [addUser, { isLoading: isAddingUser }] = useAddUserMutation();
  const [updateUser, { isLoading: isUpdatingUser }] = useUpdateUserMutation();
  const [triggerUsersPdf] = useLazyGenerateUsersPdfQuery();

  /** Corporate: only `roleCategoryType` (no `branchId` key). Facility: include `branchId` only when a valid branch is selected. */
  const assignableRolesQueryArgs = useMemo((): GetBranchRoleByCategoryTypeParams => {
    if (formValues.userType === "Corporate") {
      return { roleCategoryType: "corporate" };
    }
    if (!formValues.branch) {
      return { roleCategoryType: "facility" };
    }
    const n = Number.parseInt(formValues.branch, 10);
    if (!Number.isFinite(n)) {
      return { roleCategoryType: "facility" };
    }
    const rows = branchesRes?.success && Array.isArray(branchesRes.data) ? branchesRes.data : [];
    const branchRow = rows.find((b) => b.id === n);
    const branchType = branchRecordTypeToRoleApiBranchType(branchRow?.type);
    return { roleCategoryType: "facility", branchId: n, branchType };
  }, [formValues.userType, formValues.branch, branchesRes]);

  const { data: assignableRolesRes, isFetching: isLoadingAssignableRoles } = useGetBranchRoleByCategoryTypeQuery(
    assignableRolesQueryArgs,
    {
      skip:
        dialogMode === null ||
        (formValues.userType === "Facility" && !("branchId" in assignableRolesQueryArgs)),
      refetchOnMountOrArgChange: true,
    }
  );

  const assignableRoleOptions: SelectOption[] = useMemo(() => {
    const rows = Array.isArray(assignableRolesRes?.data) ? assignableRolesRes.data : [];
    return rows
      .filter((r) => r.isActive !== false)
      .map((r) => ({ value: String(r.id), label: r.name }));
  }, [assignableRolesRes]);

  const dismissMessageDialog = () => {
    setMessageDialog((m) => ({ ...m, open: false }));
  };

  const handleAddNew = () => {
    if (!canAdd) return;
    setFormValues({
      assignableRoleId: "",
      fullName: "",
      username: "",
      phone: "",
      branch: "",
      branches: [],
      employeeId: "",
      loginType: "no-auth",
      status: "Active",
      userType: "Facility",
    });
    setFormErrors({});
    setSelectedUser(null);
    setDialogMode("add");
  };

  const handleEdit = (user: User) => {
    if (!canEdit) return;
    setSelectedUser(user);
    setFormValues({
      assignableRoleId: user.assignableRoleId != null ? String(user.assignableRoleId) : "",
      fullName: user.name,
      username: user.email,
      phone: normalizeContactNumberForForm(user.phone),
      branch: resolveBranchFormValue(user.branches[0] || user.branch),
      branches: user.branches.map((b) => resolveBranchFormValue(b)).filter(Boolean),
      employeeId: user.employeeId,
      loginType: user.loginType,
      status: user.status,
      userType: user.userType,
    });
    setFormErrors({});
    setDialogMode("edit");
  };

  const handleView = (user: User) => {
    if (!canView) return;
    setSelectedUser(user);
    setFormValues({
      assignableRoleId: user.assignableRoleId != null ? String(user.assignableRoleId) : "",
      fullName: user.name,
      username: user.email,
      phone: normalizeContactNumberForForm(user.phone),
      branch: resolveBranchFormValue(user.branches[0] || user.branch),
      branches: user.branches,
      employeeId: user.employeeId,
      loginType: user.loginType,
      status: user.status,
      userType: user.userType,
    });
    setDialogMode("view");
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const isEditMode = dialogMode === "edit";

    if (!isEditMode) {
      if (formValues.userType === "Facility" && !formValues.branch) {
        errors.branch = "Branch is required for facility users";
      }

      const roleIdParsed = Number.parseInt(formValues.assignableRoleId, 10);
      if (!formValues.assignableRoleId.trim() || !Number.isFinite(roleIdParsed)) {
        errors.role = "Role is required";
      }

      if (formValues.userType === "Facility" && formValues.branch) {
        const bid = Number.parseInt(formValues.branch, 10);
        if (!Number.isFinite(bid)) {
          errors.branch = "Invalid branch selection";
        }
      }
    }

    const fullNameTrim = formValues.fullName.trim();
    if (!fullNameTrim) {
      errors.fullName = "Full Name is required";
    } else if (!/^[a-zA-Z\s]+$/.test(fullNameTrim)) {
      errors.fullName = "Only letters and spaces are allowed";
    } else if (fullNameTrim.length > 100) {
      errors.fullName = "Patient Name cannot exceed 100 characters";
    }

    if (!isEditMode) {
      const emailTrim = formValues.username.trim();
      if (!emailTrim) {
        errors.username = "Username/Email is required";
      } else if (!isValidEmailAddress(emailTrim)) {
        errors.username = "Please enter a valid email address";
      } else if (emailTrim.length > 100) {
        errors.username = "Email Address cannot exceed 100 characters";
      }

      const phoneDigits = formValues.phone.trim();
      if (!phoneDigits) {
        errors.phone = "Contact Number is required";
      } else if (!/^\d+$/.test(phoneDigits) || phoneDigits.length < 10) {
        errors.phone = "Contact Number must be at least 10 digits";
      } else if (phoneDigits.length > 10) {
        errors.phone = "Contact Number cannot exceed 10 digits";
      }

      const employeeIdTrim = formValues.employeeId.trim();
      if (!employeeIdTrim) {
        errors.employeeId = "Employee Id is required";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetFormAfterClose = () => {
    setFormValues({
      assignableRoleId: "",
      fullName: "",
      username: "",
      phone: "",
      branch: "",
      branches: [],
      employeeId: "",
      loginType: "no-auth",
      status: "Active",
      userType: "Facility",
    });
    setFormErrors({});
    setSelectedUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dialogMode === "add" && !canAdd) return;
    if (dialogMode === "edit" && !canEdit) return;

    if (!validateForm()) {
      return;
    }

    const loginTypeSaved: User["loginType"] =
      formValues.loginType === "no-auth" ||
        formValues.loginType === "ip" ||
        formValues.loginType === "otp" ||
        formValues.loginType === "ip-otp"
        ? formValues.loginType
        : "no-auth";

    const roleCategoryType = formValues.userType === "Facility" ? "facility" : "corporate";
    const statusApi = formValues.status === "Active" ? "active" : "inactive";
    const roleIdNum = Number.parseInt(formValues.assignableRoleId, 10);
    if (!Number.isFinite(roleIdNum)) {
      setFormErrors((prev) => ({ ...prev, role: "Please select a valid role." }));
      return;
    }

    try {
      if (dialogMode === "add") {
        const base = {
          empId: formValues.employeeId.trim() || null,
          userName: formValues.fullName.trim(),
          email: formValues.username.trim(),
          phone: formatPhoneForApi(formValues.phone),
          loginType: loginTypeSaved,
          status: statusApi as "active" | "inactive",
          roleId: roleIdNum,
          roleCategoryType: roleCategoryType as "facility" | "corporate",
        };
        const payload =
          formValues.userType === "Facility"
            ? { ...base, branchId: Number.parseInt(formValues.branch, 10) }
            : base;
        await addUser(payload).unwrap();
        setMessageDialog({ open: true, variant: "success", message: "User registered successfully" });
      } else if (dialogMode === "edit" && selectedUser) {
        const body: UpdateUserBody = {
          userName: formValues.fullName.trim(),
          email: formValues.username.trim(),
          phone: formatPhoneForApi(formValues.phone),
          empId: formValues.employeeId.trim() || null,
          loginType: loginTypeSaved,
          status: statusApi,
          roleId: roleIdNum,
          roleCategoryType,
        };
        if (formValues.userType === "Facility" && formValues.branch) {
          body.branchId = Number.parseInt(formValues.branch, 10);
        }
        await updateUser({ id: selectedUser.id, body }).unwrap();
        setMessageDialog({ open: true, variant: "success", message: "User updated successfully" });
      }

      setDialogMode(null);
      resetFormAfterClose();
    } catch (err) {
      setMessageDialog({
        open: true,
        variant: "error",
        message: getRtkErrorMessage(err, "Request failed"),
      });
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  const handleExportPDF = async () => {
    if (!canDownload) return;
    try {
      const res = await triggerUsersPdf(
        listRoleCatFilter === "corporate"
          ? undefined
          : listBranchId != null
            ? { branchId: listBranchId }
            : undefined
      ).unwrap();
      if (res.success && res.data?.url) {
        await downloadPdfFromApiUrl(res.data.url, res.data.filename ?? "users-report.pdf");
      }
    } catch (err) {
      const fallback = "Could not generate or download PDF";
      const message =
        err instanceof Error && err.message ? err.message : getRtkErrorMessage(err, fallback);
      setMessageDialog({
        open: true,
        variant: "error",
        message: message || fallback,
      });
    }
  };

  const isEditMode = dialogMode === "edit";

  const assignableRoleField = (
    <div>
      <FormSelectField
        label="Role *"
        value={formValues.assignableRoleId}
        onChange={(value) => {
          if (dialogMode === "view") return;
          const id = Array.isArray(value) ? value[0] : value;
          setFormValues((prev) => ({
            ...prev,
            assignableRoleId: id || "",
          }));
          setFormErrors((prev) => ({ ...prev, role: "" }));
        }}
        options={assignableRoleOptions}
        placeholder={
          isLoadingAssignableRoles
            ? "Loading roles..."
            : formValues.userType === "Facility" && !formValues.branch
              ? "Select branch first"
              : "Select role"
        }
        mode="single"
        background="white"
        disabled={
          dialogMode === "view" ||
          isEditMode ||
          isLoadingAssignableRoles ||
          assignableRoleOptions.length === 0 ||
          (formValues.userType === "Facility" && !formValues.branch)
        }
      />
      {formErrors.role && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.role}</p>}
    </div>
  );
  const [isAddPackageDialogOpen, setIsAddPackageDialogOpen] = useState(false);
  const [packageDialogMode, setPackageDialogMode] = useState<"add" | "edit">("add");
  const [addPackageForm, setAddPackageForm] = useState<AddPackageFormState>(defaultAddPackageForm);

  const [activeTab, setActiveTab] = useState("existing-packages");
  const [activeTab2, setActiveTab2] = useState("existing-packages");
  const tabOptions = [
    { value: "existing-packages", label: "Existing Packages" },
    { value: "archived-packages", label: "Archived Packages" },
  ];
  const tabOptions2 = [
    { value: "private-suite", label: "Private Suite" },
    { value: "semi-private-ward", label: "Semi-Private Ward" },
    { value: "premium-deluxe-selected", label: "Premium Deluxe (Selected)" },
    { value: "private-cottage", label: "Private Cottage" },
    { value: "general-ward", label: "General Ward" },
    { value: "executive-room", label: "Executive Room" },
    { value: "icu-room", label: "ICU Room" },
    { value: "deluxe-twin-sharing-room", label: "Deluxe Twin Sharing Room" }
  ];
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };
  const handleTabChange2 = (value: string) => {
    setActiveTab2(value);
  };

  const closeAddPackageDialog = () => {
    setIsAddPackageDialogOpen(false);
    setPackageDialogMode("add");
    setEditingPackageId(null);
    setAddPackageForm(defaultAddPackageForm());
  };

  const openAddPackageDialog = () => {
    setPackageDialogMode("add");
    setEditingPackageId(null);
    setAddPackageForm(defaultAddPackageForm());
    setIsAddPackageDialogOpen(true);
  };

  const openEditPackageDialog = (pkg: PackageCard) => {
    setPackageDialogMode("edit");
    setEditingPackageId(pkg.id);
    setAddPackageForm(addPackageFormFromCard(pkg));
    setIsAddPackageDialogOpen(true);
  };

  const validatePackageForm = (): string | null => {
    if (!addPackageForm.packageName.trim()) {
      return "Package name is required.";
    }
    if (!addPackageForm.diseaseCategory.trim()) {
      return "Please select a disease category.";
    }
    return null;
  };

  const handleSavePackage = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validatePackageForm();
    if (err) {
      setSavePackageErrorMessage(err);
      setShowSavePackageErrorDialog(true);
      return;
    }
    try {
      if (packageDialogMode === "edit" && editingPackageId != null) {
        const patch = (p: PackageCard): PackageCard =>
          p.id === editingPackageId
            ? {
                ...p,
                name: addPackageForm.packageName.trim(),
                description: addPackageForm.description.trim(),
                priceLabel: formatRsDisplayFromNumericInput(addPackageForm.therapyPrice),
                updatedLabel: "Updated just now",
              }
            : p;
        setActivePackageCards((prev) => prev.map(patch));
        setArchivedPackageCards((prev) => prev.map(patch));
      } else {
        const newId =
          Math.max(
            0,
            ...activePackageCards.map((p) => p.id),
            ...archivedPackageCards.map((p) => p.id)
          ) + 1;
        setActivePackageCards((prev) => [
          ...prev,
          {
            id: newId,
            name: addPackageForm.packageName.trim(),
            description: addPackageForm.description.trim(),
            priceLabel: formatRsDisplayFromNumericInput(addPackageForm.therapyPrice),
            updatedLabel: "Created just now",
            status: "Active",
            statusClassName: "border-[#0B8C00]/20 bg-[#F2F8F2] text-[#0B8C00]",
            branchName: "HIIMS",
          },
        ]);
      }
      setSavePackageSuccessMessage(
        packageDialogMode === "edit" ? "Package updated successfully." : "Package added successfully."
      );
      closeAddPackageDialog();
      setShowSavePackageSuccessDialog(true);
    } catch {
      setSavePackageErrorMessage("Something went wrong. Please try again.");
      setShowSavePackageErrorDialog(true);
    }
  };

  const confirmArchivePackage = () => {
    if (!packageArchiveConfirm) return;
    const pkg = packageArchiveConfirm;
    setActivePackageCards((prev) => prev.filter((p) => p.id !== pkg.id));
    setArchivedPackageCards((prev) => [
      {
        ...pkg,
        status: "Archived",
        statusClassName: "border-[#9CA3AF]/40 bg-[#F9FAFB] text-[#6B7280]",
        updatedLabel: "Archived just now",
      },
      ...prev,
    ]);
    setPackageArchiveConfirm(null);
    setArchiveSuccessMessage(`"${pkg.name}" has been archived successfully.`);
    setShowArchiveSuccessDialog(true);
  };

  const filteredPackageCards = useMemo(() => {
    const base = activeTab === "existing-packages" ? activePackageCards : archivedPackageCards;
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.priceLabel.toLowerCase().includes(q) ||
        p.branchName.toLowerCase().includes(q)
    );
  }, [activeTab, debouncedSearch, activePackageCards, archivedPackageCards]);

  const totalFilteredPackages = filteredPackageCards.length;

  const paginatedPackageCards = useMemo(() => {
    const start = (packagesCurrentPage - 1) * packagesItemsPerPage;
    return filteredPackageCards.slice(start, start + packagesItemsPerPage);
  }, [filteredPackageCards, packagesCurrentPage, packagesItemsPerPage]);

  useEffect(() => {
    setPackagesCurrentPage(1);
  }, [debouncedSearch, packagesItemsPerPage, activeTab]);

  const handlePackagePageChange = (page: number) => {
    setPackagesCurrentPage(page);
  };

  const handlePackageItemsPerPageChange = (items: number) => {
    setPackagesItemsPerPage(items);
    setPackagesCurrentPage(1);
  };

  return (
    <AppShell>
    


      {/* Package Configuration */}
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <PageHeading title="Package Configuration" />
        </div>

        <ListBorder as="section" className="px-4 py-4">
          <div className="mb-6 w-[450px]">
            <Tabs options={tabOptions} value={activeTab} onChange={handleTabChange} />
          </div>
          <div className="w-full overflow-hidden rounded-[16px] border border-[#E3EEE1] bg-white px-5 pb-5 pt-5">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <h4 className="font-semibold text-[18px] leading-[120%] text-[#434956]">
                {activeTab === "existing-packages" ? "Existing Packages" : "Archived Packages"}{" "}
                <span className="font-regular text-[15px] leading-[120%] text-[#525763]">
                  ({String(totalFilteredPackages).padStart(2, "0")})
                </span>
              </h4>
              <div className="flex flex-wrap items-center gap-3">
                <TableSearchInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search Here..."
                  className="!w-[280px] min-w-[280px] max-w-[280px] shrink-0"
                />
                <button
                  type="button"
                  className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] whitespace-nowrap"
                  onClick={openAddPackageDialog}
                >
                  <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                  <span className="text-hide hide-text-overflow">Add New Package</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4">
              {totalFilteredPackages === 0 ? (
                <div className="col-span-full py-12 text-center text-sm text-[#9CA3AF]">
                  {activeTab === "archived-packages"
                    ? "No archived packages"
                    : debouncedSearch.trim()
                      ? "No packages match your search"
                      : "No existing packages"}
                </div>
              ) : (
                paginatedPackageCards.map((pkg, index) => {
                  const rowNum = (packagesCurrentPage - 1) * packagesItemsPerPage + index + 1;
                  return (
                    <PackageListCard
                      key={pkg.id}
                      pkg={pkg}
                      rowNum={rowNum}
                      showActions={activeTab === "existing-packages"}
                      onEdit={openEditPackageDialog}
                      onArchive={setPackageArchiveConfirm}
                    />
                  );
                })
              )}
            </div>

            {totalFilteredPackages > 0 && (
              <Pagination
                currentPage={packagesCurrentPage}
                totalItems={totalFilteredPackages}
                itemsPerPage={packagesItemsPerPage}
                onPageChange={handlePackagePageChange}
                onItemsPerPageChange={handlePackageItemsPerPageChange}
                itemsPerPageOptions={[10, 20, 50, 100]}
              />
            )}
          </div>
        </ListBorder>
      </div>

      {/* add package  */}
      <Dialog
        open={isAddPackageDialogOpen}
        onClose={closeAddPackageDialog}
        title={packageDialogMode === "edit" ? "Edit Package" : "Add Package"}
        width={949}
      >
        <form
          noValidate
          className="space-y-6"
          onSubmit={handleSavePackage}
        >
          <div className="grid grid-cols-2 gap-6">
            <div>
              <FormSelectField
                label="Disease Category"
                value={addPackageForm.diseaseCategory}
                onChange={(value) => {
                  const id = Array.isArray(value) ? value[0] : value;
                  setAddPackageForm((p) => ({ ...p, diseaseCategory: id ?? "" }));
                }}
                options={[
                  { label: "Cardiology", value: "cardiology" },
                  { label: "Neurology", value: "neurology" },
                  { label: "Oncology", value: "oncology" },
                  { label: "Orthopedics", value: "orthopedics" }
                ]}
                placeholder="Select Disease Category"
                mode="single"
                background="white"
              />
            </div>

            <div>
              <FormInputField
                label="Package Name"
                value={addPackageForm.packageName}
                onChange={(e) =>
                  setAddPackageForm((p) => ({ ...p, packageName: e.target.value }))
                }
                height={44}
                placeholder="Package Name"
                type="text"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6">
            <div className="w-full">
              <FormTextareaField
                label="Description"
                value={addPackageForm.description}
                onChange={(e) =>
                  setAddPackageForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Description"
                height={60}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2">

            <h4 className="font-medium text-[14px] leading-[120%] text-[#262D3B]">Room Type Selection</h4>

            <div>
              <Tabs options={tabOptions2} value={activeTab2} onChange={handleTabChange2} className="border-0 !grid !grid-cols-4 !h-full" tabBorder={true} />
            </div>
          </div>

          <h4 className="font-medium text-[14px] leading-[120%] text-[#262D3B] mb-2">Clinical Configurations</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex gap-[32px] h-[37px]">
              <div className="flex items-center justify-between">
                <Toggle
                  checked={addPackageForm.medicineEnabled}
                  onChange={(checked) =>
                    setAddPackageForm((p) => ({ ...p, medicineEnabled: checked }))
                  }
                  label="Medicine"
                  className="!w-10 !h-6 "
                  width="w-[16px]"
                  height="h-[16px]"
                  fontsize="text-[12px]"
                  transform={addPackageForm.medicineEnabled ? "!translate-x-[20px]" : undefined}
                />
              </div>
              <div className="relative w-[216]">
                <FormInputField
                  label={""}
                  value={addPackageForm.medicinePrice}
                  onChange={(e) =>
                    setAddPackageForm((p) => ({ ...p, medicinePrice: e.target.value }))
                  }
                  placeholder="Price"
                  type="number"
                  height={37}
                />
                <span className="absolute right-6 top-[0px] font-inter not-italic font-normal text-[12px] leading-[120%] text-[#525763] pointer-events-none flex items-center" style={{ height: '37px' }}>
                  ₹
                </span>
              </div>
            </div>

            <div className="flex gap-[32px] h-[37px]">
              <div className="flex items-center justify-between">
                <Toggle
                  checked={addPackageForm.mealsEnabled}
                  onChange={(checked) =>
                    setAddPackageForm((p) => ({ ...p, mealsEnabled: checked }))
                  }
                  label="Meals"
                  className="!w-10 !h-6 "
                  width="w-[16px]"
                  height="h-[16px]"
                  fontsize="text-[12px]"
                  transform={addPackageForm.mealsEnabled ? "!translate-x-[20px]" : undefined}
                />
              </div>
            </div>

            <div className="flex gap-[32px] h-[37px]">
              <div className="flex items-center justify-between">
                <Toggle
                  checked={addPackageForm.doctorFeesEnabled}
                  onChange={(checked) =>
                    setAddPackageForm((p) => ({ ...p, doctorFeesEnabled: checked }))
                  }
                  label="Doctor Fees"
                  className="!w-10 !h-6 "
                  width="w-[16px]"
                  height="h-[16px]"
                  fontsize="text-[12px]"
                  transform={addPackageForm.doctorFeesEnabled ? "!translate-x-[20px]" : undefined}
                />
              </div>
            </div>
            <div className="flex gap-[32px] h-[37px]">
              <div className="flex items-center justify-between">
                <Toggle
                  checked={addPackageForm.nurseFeesEnabled}
                  onChange={(checked) =>
                    setAddPackageForm((p) => ({ ...p, nurseFeesEnabled: checked }))
                  }
                  label="Nurse Fees"
                  className="!w-10 !h-6 "
                  width="w-[16px]"
                  height="h-[16px]"
                  fontsize="text-[12px]"
                  transform={addPackageForm.nurseFeesEnabled ? "!translate-x-[20px]" : undefined}
                />
              </div>
            </div>
            <div className="flex gap-[32px] h-[37px]">
              <div className="flex items-center justify-between">
                <Toggle
                  checked={addPackageForm.attendantFeesEnabled}
                  onChange={(checked) =>
                    setAddPackageForm((p) => ({ ...p, attendantFeesEnabled: checked }))
                  }
                  label="Attendant Fees"
                  className="!w-10 !h-6 "
                  width="w-[16px]"
                  height="h-[16px]"
                  fontsize="text-[12px]"
                  transform={addPackageForm.attendantFeesEnabled ? "!translate-x-[20px]" : undefined}
                />
              </div>
            </div>
            <div className="flex gap-[32px] h-[37px]">
              <div className="flex items-center justify-between">
                <Toggle
                  checked={addPackageForm.therapyEnabled}
                  onChange={(checked) =>
                    setAddPackageForm((p) => ({ ...p, therapyEnabled: checked }))
                  }
                  label="Therapy"
                  className="!w-10 !h-6 "
                  width="w-[16px]"
                  height="h-[16px]"
                  fontsize="text-[12px]"
                  transform={addPackageForm.therapyEnabled ? "!translate-x-[20px]" : undefined}
                />
              </div>
            </div>

          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="relative">
              <FormInputField
                label={"Therapy Load"}
                value={addPackageForm.therapyLoad}
                onChange={(e) =>
                  setAddPackageForm((p) => ({ ...p, therapyLoad: e.target.value }))
                }
                placeholder="Therapy Load"
                type="text"
              />
              <span className="absolute right-6 top-[0px] font-inter not-italic font-normal text-[12px] leading-[120%] text-[#525763] pointer-events-none flex items-center" style={{ height: '44px' }}>
                Sessions / Day
              </span>
            </div>
            <div className="relative">
              <FormInputField
                label={"Price"}
                value={addPackageForm.therapyPrice}
                onChange={(e) =>
                  setAddPackageForm((p) => ({ ...p, therapyPrice: e.target.value }))
                }
                placeholder="Price"
                type="number"
              />
              <span className="absolute right-6 top-[0px] font-inter not-italic font-normal text-[12px] leading-[120%] text-[#525763] pointer-events-none flex items-center" style={{ height: '44px' }}>
                ₹
              </span>
            </div>
          </div>

          <div className="w-[300px] p-4 bg-[#0B8C00] shadow-[0px_6px_40px_rgba(0,0,0,0.02)] rounded-2xl">
            <div className="flex items-center gap-2 ">
              <Image src="/icons/PreBookingCheck.svg" alt="Summary" width={16} height={16} className="filter brightness-0 invert" />
              <h2 className="font-inter font-medium text-base leading-[120%] text-[#fff]">Financial Summary</h2>
            </div>
            <div className="flex justify-between items-center mt-4">
              <h5 className="not-italic font-medium text-[12px] leading-[120%] text-white">Daily Rate</h5>
              <h4 className="not-italic font-semibold text-[16px] leading-[120%] text-white">Rs. 0</h4>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <>
              <Button type="submit" variant="primary">
                {packageDialogMode === "edit" ? "Update Package" : "Add Package"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={closeAddPackageDialog}
              >
                Cancel
              </Button>
            </>
          </div>
        </form>
      </Dialog>
      {/* add package  */}

      <MessageDialog
        open={messageDialog.open}
        onClose={dismissMessageDialog}
        message={messageDialog.message}
        icon={messageDialog.variant === "success" ? "/icons/SuccessCheck.svg" : "/icons/ErrorIcon.svg"}
        iconBgColor={messageDialog.variant === "success" ? "#E8F5E9" : "#FFEBEE"}
        showCancel={false}
        confirmText="OK"
        onConfirm={dismissMessageDialog}
      />

      <MessageDialog
        open={packageArchiveConfirm != null}
        onClose={() => setPackageArchiveConfirm(null)}
        iconSlot={
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0B8C00]">
            <Image
              src="/icons/archivedicon.svg"
              alt=""
              width={24}
              height={24}
              className="brightness-0 invert"
            />
          </div>
        }
        message={
          packageArchiveConfirm
            ? `Are you sure you want to archive "${packageArchiveConfirm.name}"? You can still find it under Archived Packages.`
            : ""
        }
        confirmText="Yes, archive"
        cancelText="Cancel"
        showCancel
        onConfirm={confirmArchivePackage}
        onCancel={() => setPackageArchiveConfirm(null)}
      />

      <MessageDialog
        open={showArchiveSuccessDialog}
        onClose={() => setShowArchiveSuccessDialog(false)}
        icon="/icons/SuccessCheck.svg"
        iconBgColor="#E8F5E9"
        message={archiveSuccessMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => setShowArchiveSuccessDialog(false)}
      />

      <MessageDialog
        open={showSavePackageSuccessDialog}
        onClose={() => setShowSavePackageSuccessDialog(false)}
        icon="/icons/SuccessCheck.svg"
        iconBgColor="#E8F5E9"
        message={savePackageSuccessMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => setShowSavePackageSuccessDialog(false)}
      />

      <MessageDialog
        open={showSavePackageErrorDialog}
        onClose={() => setShowSavePackageErrorDialog(false)}
        icon="/icons/CrossIcon.svg"
        iconBgColor="#FFEBEE"
        message={savePackageErrorMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => setShowSavePackageErrorDialog(false)}
      />

     
     
    </AppShell>
  );
}


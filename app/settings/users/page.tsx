"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { Button, Dialog, FormInputField, FormSelectField, TableSearchInput, Pagination, ExportButton, UserCard, MessageDialog } from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import type { SelectOption } from "@/components/ui/FormSelectField";
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

export default function UsersPage() {
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
    return rows.map((b) => {
      const typeLabel = b.type ? b.type.charAt(0).toUpperCase() + b.type.slice(1).toLowerCase() : "";
      const label = typeLabel ? `${b.name} (${typeLabel})` : b.name;
      return { value: String(b.id), label };
    });
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

  return (
    <AppShell>
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

      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <PageHeading title="Users" />
        </div>

        <ListBorder as="section" className="px-4 py-4">
          {!canView ? (
            <div className="rounded-[16px] border border-[#E3EEE1] bg-white px-6 py-10 text-center text-sm text-[#9CA3AF]">
              You don&apos;t have permission to view users.
            </div>
          ) : (
          <div className="w-full overflow-hidden rounded-[16px] border border-[#E3EEE1] bg-white px-5 pb-5 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
            <div className="mb-6 flex flex-wrap items-center justify-end gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                <div className="flex-shrink-0" style={{ width: 280 }}>
                  <FormSelectField
                    label=""
                    hideLabel
                    options={[
                      { label: "None", value: "" },
                      { label: "Facility", value: "facility" },
                      { label: "Corporate", value: "corporate" },
                    ]}
                    placeholder="Select Group Role"
                    mode="single"
                    background="normal"
                    width={280}
                    value={listRoleCatFilter ?? ""}
                    onChange={(val) => {
                      const v = typeof val === "string" ? val : "";
                      if (v === "facility" || v === "corporate") {
                        setListRoleCatFilter(v);
                      } else {
                        setListRoleCatFilter(null);
                      }
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {listRoleCatFilter !== "corporate" ? (
                  <FormSelectField
                    label=""
                    hideLabel
                    options={hookBranchFilterOptions}
                    value={selectedBranch}
                    onChange={(value) => setSelectedBranch(Array.isArray(value) ? value[0] : value || "")}
                    placeholder={isLoadingBranchFilter ? "Loading branches..." : "Select Branch"}
                    mode="single"
                    background="normal"
                    width={280}
                    disabled={isBranchFilterDisabled || isLoadingBranchFilter}
                  />
                ) : null}
                <TableSearchInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search Here..."
                  className="!w-[280px] min-w-[280px] max-w-[280px] shrink-0"
                />
                {canDownload ? <ExportButton onExportPDF={handleExportPDF} /> : null}
                {canAdd ? (
                  <button
                    type="button"
                    className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] whitespace-nowrap"
                    onClick={handleAddNew}
                  >
                    <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                    <span className="text-hide hide-text-overflow">Add User</span>
                  </button>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {(isLoadingUsers || isFetchingUsers) && usersList.length === 0 ? (
                <div className="col-span-full py-12 text-center text-sm text-[#9CA3AF]">Loading users…</div>
              ) : (
                usersList.map((user) => (
                  <UserCard
                    key={user.id}
                    id={user.id}
                    name={user.name}
                    email={user.email}
                    branch={user.branch}
                    phone={user.phone}
                    groupRole={user.groupRole}
                    permissionDate={user.permissionDate}
                    lastLogin={user.lastLogin}
                    status={user.status}
                    onView={() => handleView(user)}
                    onEdit={() => handleEdit(user)}
                    onSetDate={() => {}}
                    showViewButton={canView}
                    showEditButton={canEdit}
                  />
                ))
              )}
            </div>

            {!isLoadingUsers && usersList.length === 0 && (
              <div className="py-12 text-center text-sm text-[#9CA3AF]">No users found</div>
            )}

            {totalUsers > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={totalUsers}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            )}
          </div>
          )}
        </ListBorder>
      </div>

      {/* Unified User Dialog (Add/Edit/View) */}
      <Dialog
        open={
          (dialogMode === "add" && canAdd) ||
          (dialogMode === "edit" && canEdit) ||
          (dialogMode === "view" && canView)
        }
        onClose={() => {
          setDialogMode(null);
          resetFormAfterClose();
        }}
        title={dialogMode === "add" ? "Add User" : dialogMode === "edit" ? "Edit User" : "View User"}
        width={1601}
      >
        <form
          noValidate
          onSubmit={dialogMode !== "view" ? handleSubmit : (e) => e.preventDefault()}
          className="space-y-6"
        >
          <div className="grid grid-cols-2 gap-6">
            <div>
              <FormSelectField
                label="User Type"
                value={formValues.userType}
                onChange={(value) => {
                  if (dialogMode === "view") return;
                  const next = (Array.isArray(value) ? value[0] : value || "Facility") as "Facility" | "Corporate";
                  setFormValues((prev) => ({
                    ...prev,
                    userType: next,
                    assignableRoleId: "",
                    ...(next === "Corporate" ? { branch: "", branches: [] } : {}),
                  }));
                  setFormErrors((prev) => ({ ...prev, branch: "", branches: "", role: "" }));
                }}
                options={userTypeOptions}
                placeholder="User Type"
                mode="single"
                background="white"
                disabled={dialogMode === "view" || isEditMode}
              />
            </div>

            {formValues.userType === "Facility" ? (
              <>
                <div>
                  <FormSelectField
                    label="Branch *"
                    value={formValues.branch}
                    onChange={(value) => {
                      if (dialogMode === "view") return;
                      setFormValues((prev) => ({
                        ...prev,
                        branch: Array.isArray(value) ? value[0] : value || "",
                        assignableRoleId: "",
                        branches: [],
                      }));
                      setFormErrors((prev) => ({ ...prev, branch: "", role: "" }));
                    }}
                    options={branchOptionsWithNone}
                    placeholder={isLoadingBranches ? "Loading branches..." : "Select branch"}
                    mode="single"
                    background="white"
                    disabled={dialogMode === "view" || isEditMode || isLoadingBranches}
                  />
                  {formErrors.branch && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.branch}</p>}
                </div>
                {assignableRoleField}
              </>
            ) : (
              assignableRoleField
            )}

            <div>
              <FormInputField
                label="Full Name *"
                value={formValues.fullName}
                onChange={(event) => {
                  if (dialogMode === "view") return;
                  setFormValues((prev) => ({
                    ...prev,
                    fullName: sanitizePatientNameInput(event.target.value),
                  }));
                  setFormErrors((prev) => ({ ...prev, fullName: "" }));
                }}
                onBlur={(event) => {
                  if (dialogMode === "view") return;
                  const trimmed = event.target.value.trim();
                  if (trimmed !== event.target.value) {
                    setFormValues((prev) => ({ ...prev, fullName: trimmed }));
                  }
                }}
                height={44}
                placeholder="Full Name"
                required={dialogMode !== "view"}
                disabled={dialogMode === "view"}
                maxLength={100}
                type="text"
              />
              {formErrors.fullName && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.fullName}</p>}
            </div>

            <div>
              <FormInputField
                label="Email *"
                value={formValues.username}
                onChange={(event) => {
                  if (dialogMode === "view") return;
                  setFormValues((prev) => ({
                    ...prev,
                    username: sanitizeEmailInput(event.target.value),
                  }));
                  setFormErrors((prev) => ({ ...prev, username: "" }));
                }}
                onKeyDown={(event) => {
                  if (dialogMode === "view") return;
                  if (event.key === " ") {
                    event.preventDefault();
                  }
                }}
                onPaste={(event) => {
                  if (dialogMode === "view") return;
                  event.preventDefault();
                  const pastedText = event.clipboardData.getData("text");
                  const currentValue = formValues.username || "";
                  setFormValues((prev) => ({
                    ...prev,
                    username: sanitizeEmailInput(`${currentValue}${pastedText}`),
                  }));
                  setFormErrors((prev) => ({ ...prev, username: "" }));
                }}
                height={44}
                placeholder="Email Address"
                required={dialogMode !== "view"}
                disabled={dialogMode === "view" || isEditMode}
                maxLength={100}
                type="email"
              />
              {formErrors.username && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.username}</p>}
            </div>

            <div>
              <FormInputField
                label="Contact Number *"
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
                placeholder="Contact Number"
                required={dialogMode !== "view"}
                disabled={dialogMode === "view" || isEditMode}
                type="tel"
                maxLength={10}
              />
              {formErrors.phone && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.phone}</p>}
            </div>

            <div>
              <FormInputField
                label="Employee Id *"
                value={formValues.employeeId}
                onChange={(event) => {
                  if (dialogMode === "view") return;
                  setFormValues((prev) => ({
                    ...prev,
                    employeeId: sanitizeEmployeeIdInput(event.target.value),
                  }));
                  setFormErrors((prev) => ({ ...prev, employeeId: "" }));
                }}
                height={44}
                placeholder="Employee Id"
                maxLength={EMPLOYEE_ID_MAX_LEN}
                required={dialogMode !== "view"}
                disabled={dialogMode === "view" || isEditMode}
              />
              {formErrors.employeeId && (
                <p className="mt-1 text-xs text-[#F6776E]">{formErrors.employeeId}</p>
              )}
            </div>

            <div>
              <FormSelectField
                label="Login Type"
                value={formValues.loginType}
                onChange={(value) => {
                  if (dialogMode === "view") return;
                  const v = Array.isArray(value) ? value[0] : value;
                  setFormValues((prev) => ({
                    ...prev,
                    loginType:
                      v === "no-auth" || v === "ip" || v === "otp" || v === "ip-otp" ? v : "no-auth",
                  }));
                }}
                options={loginTypeOptions}
                placeholder="Login Type"
                mode="single"
                background="white"
                disabled={dialogMode === "view"}
              />
            </div>

            <div
              className={
                formValues.userType === "Facility" ? "col-span-2 w-full" : undefined
              }
            >
              <FormSelectField
                label="Status"
                value={formValues.status}
                onChange={(value) => {
                  if (dialogMode === "view") return;
                  setFormValues((prev) => ({
                    ...prev,
                    status: Array.isArray(value) ? value[0] : value || "Active",
                  }));
                }}
                options={statusOptions}
                placeholder="Status"
                mode="single"
                background="white"
                disabled={dialogMode === "view" || isEditMode}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {dialogMode === "view" ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogMode(null);
                  resetFormAfterClose();
                }}
              >
                Close
              </Button>
            ) : (
              <>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={dialogMode === "add" ? isAddingUser : isUpdatingUser}
                >
                  {dialogMode === "add" ? "Add User" : "Update User"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogMode(null);
                    resetFormAfterClose();
                  }}
                  disabled={isAddingUser || isUpdatingUser}
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </form>
      </Dialog>
    </AppShell>
  );
}


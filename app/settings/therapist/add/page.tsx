"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { FormInputField, FormSelectField, MessageDialog } from "@/components/ui";
import { BackToPreviousPageButton } from "@/components/ui/Buttons";
import { ListBorder } from "@/components/ui/ListBorder";
import { Tooltip } from "@/components/ui/Tooltip";
import type { SelectOption } from "@/components/ui/FormSelectField";
import {
  useCreateTherapistMutation,
  useGetBranchesQuery,
  useGetBranchRoleByCategoryTypeQuery,
  useGetTherapiesQuery,
} from "@/store/api/settingsApi";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { sanitizeEmailInput, isValidEmailAddress } from "@/lib/utils/emailValidation";

// ─── Input formatters ─────────────────────────────────────────────────────────

function formatAlphaInput(raw: string, maxLen = 150): string {
  return raw.replace(/[^a-zA-Z\s]/g, "").replace(/^\s+/, "").slice(0, maxLen);
}

function formatPhoneInput(raw: string): string {
  return raw.replace(/\D/g, "").replace(/^0+/, "").slice(0, 10);
}

function formatEmpIdInput(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9\-]/g, "").slice(0, 20);
}

// ─── Static options ───────────────────────────────────────────────────────────

function capitalizeFirst(str: string | null | undefined): string {
  if (str == null || str === "") return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function branchSelectLabel(name: string, typeRaw: string | null | undefined): string {
  const t = (typeRaw ?? "").trim();
  if (!t) return name;
  return `${name} (${capitalizeFirst(t)})`;
}

const statusOptions: SelectOption[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const loginTypeOptions: SelectOption[] = [
  { value: "no-auth", label: "No Auth" },
  { value: "ip", label: "IP" },
  { value: "otp", label: "OTP" },
  { value: "ip-otp", label: "IP + OTP" },
];

// ─── Form state ───────────────────────────────────────────────────────────────

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  speciality: "",
  role: "",
  loginType: "",
  employeeId: "",
  experience: "",
  status: "active" as "active" | "inactive",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AddTherapistPage() {
  const router = useRouter();
  const [formValues, setFormValues] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [certifications, setCertifications] = useState<string[]>([""]);
  const [certError, setCertError] = useState("");
  const [selectedTherapyIds, setSelectedTherapyIds] = useState<number[]>([]);
  const [therapyError, setTherapyError] = useState("");
  const [formBranchId, setFormBranchId] = useState("");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
  const [apiErrorMessage, setApiErrorMessage] = useState("");

  const {
    selectedBranchFilter,
    setSelectedBranchFilter,
    branchFilterOptions,
    isLoadingBranches,
    isBranchFilterDisabled,
    filterBranchId,
    isSuperAdmin: isBranchFilterSuperAdmin,
  } = useBranchFilter({ persistSuperAdminSelectionKey: "hiims-settings-create-therapist-branch" });

  const { data: branchesListData } = useGetBranchesQuery(undefined);

  const therapistBranchOptions = useMemo((): SelectOption[] => {
    const rows = branchesListData?.data;
    if (!isBranchFilterSuperAdmin) {
      if (!Array.isArray(rows) || rows.length === 0) return branchFilterOptions;
      return branchFilterOptions.map((opt) => {
        const id = parseInt(String(opt.value), 10);
        if (!Number.isFinite(id)) return opt;
        const b = rows.find((x) => Number(x.id) === id) as { name?: string; type?: string } | undefined;
        if (!b?.name) return opt;
        return { value: opt.value, label: branchSelectLabel(String(b.name), b.type) };
      });
    }
    if (!Array.isArray(rows) || rows.length === 0) return [];
    return rows.map((b) => {
      const row = b as { id: number; name?: string; type?: string };
      return { value: String(row.id), label: branchSelectLabel(String(row.name ?? ""), row.type) };
    });
  }, [isBranchFilterSuperAdmin, branchesListData, branchFilterOptions]);

  useEffect(() => {
    if (!isBranchFilterSuperAdmin) return;
    if (isLoadingBranches) return;
    const rows = branchesListData?.data;
    if (!Array.isArray(rows) || rows.length === 0) return;
    if (selectedBranchFilter !== "") return;
    setSelectedBranchFilter(String(rows[0].id));
  }, [isBranchFilterSuperAdmin, isLoadingBranches, branchesListData, selectedBranchFilter, setSelectedBranchFilter]);

  useEffect(() => {
    const defaultBranchId =
      selectedBranchFilter && /^\d+$/.test(selectedBranchFilter)
        ? selectedBranchFilter
        : filterBranchId != null && Number.isFinite(filterBranchId) && filterBranchId >= 1
          ? String(filterBranchId)
          : "";
    setFormBranchId(defaultBranchId);
  }, [selectedBranchFilter, filterBranchId]);

  const resolvedBranchId = useMemo(() => {
    const n = parseInt(formBranchId, 10);
    return Number.isFinite(n) && n >= 1 ? n : undefined;
  }, [formBranchId]);

  const selectedBranchData = useMemo(() => {
    if (!resolvedBranchId || !branchesListData?.data) return null;
    return branchesListData.data.find((b) => b.id === resolvedBranchId) ?? null;
  }, [resolvedBranchId, branchesListData]);

  const branchType = useMemo((): "hospital" | "clinic" | undefined => {
    const t = (selectedBranchData as { type?: string } | null)?.type;
    if (!t) return undefined;
    return t === "clinic" ? "clinic" : "hospital";
  }, [selectedBranchData]);

  const { data: rolesData, isFetching: isLoadingRoles } = useGetBranchRoleByCategoryTypeQuery(
    { roleCategoryType: "facility_therapist", branchId: resolvedBranchId, branchType },
    { skip: !resolvedBranchId, refetchOnMountOrArgChange: true }
  );

  const { data: therapiesData } = useGetTherapiesQuery(
    { branchId: resolvedBranchId },
    { skip: !resolvedBranchId }
  );

  const roleOptions = useMemo((): SelectOption[] =>
    (rolesData?.data ?? [])
      .filter((r) => r.isActive !== false)
      .map((r) => ({ value: String(r.id), label: r.name })),
    [rolesData]
  );

  const therapyList = useMemo(() => therapiesData?.data ?? [], [therapiesData]);

  useEffect(() => {
    setFormValues((prev) => ({ ...prev, role: "" }));
    setSelectedTherapyIds([]);
    setTherapyError("");
    setFormErrors((prev) => ({ ...prev, role: "" }));
  }, [resolvedBranchId]);

  const roleFieldDisabled = !resolvedBranchId || isLoadingRoles || roleOptions.length === 0;

  const [createTherapist, { isLoading: isCreating }] = useCreateTherapistMutation();

  const setField = (field: keyof typeof emptyForm, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const toggleTherapy = (id: number) => {
    setSelectedTherapyIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
    setTherapyError("");
  };

  const addCertification = () => setCertifications((prev) => [...prev, ""]);
  const removeCertification = (idx: number) => {
    setCertifications((prev) => prev.filter((_, i) => i !== idx));
    setCertError("");
  };
  const updateCertification = (idx: number, value: string) => {
    setCertifications((prev) => prev.map((c, i) => (i === idx ? value : c)));
    setCertError("");
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formValues.name.trim()) {
      errors.name = "Therapist name is required.";
    } else if (!/^[a-zA-Z\s]+$/.test(formValues.name.trim())) {
      errors.name = "Name must contain only letters and spaces.";
    }

    if (!formValues.speciality.trim()) {
      errors.speciality = "Speciality is required.";
    } else if (!/^[a-zA-Z\s]+$/.test(formValues.speciality.trim())) {
      errors.speciality = "Speciality must contain only letters and spaces.";
    }

    if (!formValues.email.trim()) {
      errors.email = "Email is required.";
    } else if (!isValidEmailAddress(formValues.email.trim())) {
      errors.email = "Enter a valid email address.";
    }

    if (!formValues.phone.trim()) {
      errors.phone = "Contact is required.";
    } else if (formValues.phone.trim().length !== 10) {
      errors.phone = "Contact must be 10 digits.";
    }

    if (!formValues.role) {
      errors.role = "Role is required.";
    }

    if (!formValues.loginType) {
      errors.loginType = "Login type is required.";
    }

    if (!formValues.employeeId.trim()) {
      errors.employeeId = "Employee ID is required.";
    }

    if (!formValues.experience.trim()) {
      errors.experience = "Experience is required.";
    }

    const filledCerts = certifications.filter((c) => c.trim());
    if (filledCerts.length === 0) {
      setCertError("At least one certification is required.");
    } else {
      setCertError("");
    }

    if (selectedTherapyIds.length === 0) {
      setTherapyError("At least one therapy must be selected.");
    } else {
      setTherapyError("");
    }

    setFormErrors(errors);

    const filledCertsOk = certifications.filter((c) => c.trim()).length > 0;
    return (
      Object.keys(errors).length === 0 &&
      filledCertsOk &&
      selectedTherapyIds.length > 0
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const branchId = isBranchFilterSuperAdmin
      ? (() => {
          const n = parseInt(formBranchId, 10);
          return Number.isFinite(n) && n >= 1 ? n : undefined;
        })()
      : filterBranchId;

    if (branchId === undefined || !Number.isFinite(branchId) || branchId < 1) {
      setApiErrorMessage("Please select a branch before saving.");
      setShowApiErrorDialog(true);
      return;
    }

    const roleId = parseInt(formValues.role, 10);

    try {
      const result = await createTherapist({
        branchId,
        userName: formValues.name.trim(),
        phone: formValues.phone.trim(),
        email: formValues.email.trim(),
        roleId,
        roleTypeId: roleId,
        empId: formValues.employeeId.trim(),
        loginType: formValues.loginType,
        status: formValues.status,
        experience: formValues.experience.trim(),
        speciality: formValues.speciality.trim(),
        certifications: certifications.filter((c) => c.trim()),
        therapyIds: selectedTherapyIds,
      }).unwrap();

      setSuccessMessage(result?.message || "Therapist added successfully.");
      setShowSuccessDialog(true);
      setFormValues(emptyForm);
      setCertifications([""]);
      setCertError("");
      setSelectedTherapyIds([]);
      setTherapyError("");
      setFormErrors({});
    } catch (error: unknown) {
      const typedError = error as { data?: { message?: string | string[]; error?: string } };
      const raw = typedError?.data?.message;
      const errorMsg = Array.isArray(raw)
        ? raw.join(" ")
        : raw || typedError?.data?.error || "Failed to add therapist. Please try again.";
      setApiErrorMessage(errorMsg);
      setShowApiErrorDialog(true);
    }
  };

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <PageHeading title="Add Therapist" />
          <BackToPreviousPageButton text="List" onClick={() => router.push("/settings/therapist")} />
        </div>

        <ListBorder as="section" className="px-4 py-4">
          <form onSubmit={handleSubmit} noValidate>
            <div className="flex gap-4 items-stretch">

              {/* ── Left: main form ── */}
              <div className="flex-1 min-w-0 overflow-visible rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
                <div className="grid grid-cols-3 gap-x-4 gap-y-5 overflow-visible">

                  {/* Row 1 */}
                  <div className="overflow-visible pt-3">
                    <FormSelectField
                      label="Branch *"
                      options={therapistBranchOptions}
                      value={formBranchId}
                      onChange={(value) => {
                        if (!isBranchFilterSuperAdmin) return;
                        setFormBranchId(Array.isArray(value) ? value[0] : value || "");
                      }}
                      placeholder={isLoadingBranches ? "Loading branches…" : "Select"}
                      mode="single"
                      background="white"
                      disabled={isBranchFilterDisabled || isLoadingBranches || !isBranchFilterSuperAdmin}
                    />
                  </div>

                  <div className="overflow-visible pt-3">
                    <FormSelectField
                      label="Role *"
                      options={roleOptions}
                      value={formValues.role}
                      onChange={(value) =>
                        setField("role", Array.isArray(value) ? value[0] : value || "")
                      }
                      placeholder={
                        !resolvedBranchId
                          ? "Select branch first"
                          : isLoadingRoles
                            ? "Loading roles…"
                            : "Select Role"
                      }
                      mode="single"
                      background="white"
                      disabled={roleFieldDisabled}
                      error={formErrors.role}
                    />
                  </div>

                  <div className="overflow-visible pt-3">
                    <FormInputField
                      label="Therapist Name *"
                      value={formValues.name}
                      onChange={(e) => setField("name", formatAlphaInput(e.target.value, 100))}
                      placeholder="Therapist Name"
                      height={44}
                      error={formErrors.name}
                    />
                  </div>

                  {/* Row 2 */}
                  <div className="overflow-visible pt-3">
                    <FormInputField
                      label="Speciality *"
                      value={formValues.speciality}
                      onChange={(e) => setField("speciality", formatAlphaInput(e.target.value, 150))}
                      placeholder="Speciality"
                      height={44}
                      error={formErrors.speciality}
                    />
                  </div>

                  <div className="overflow-visible pt-3">
                    <FormInputField
                      label="Email *"
                      value={formValues.email}
                      onChange={(e) => setField("email", sanitizeEmailInput(e.target.value))}
                      placeholder="Email"
                      height={44}
                      error={formErrors.email}
                    />
                  </div>

                  <div className="overflow-visible pt-3">
                    <FormInputField
                      label="Contact *"
                      value={formValues.phone}
                      onChange={(e) => setField("phone", formatPhoneInput(e.target.value))}
                      placeholder="Contact"
                      height={44}
                      error={formErrors.phone}
                    />
                  </div>

                  {/* Row 3 */}
                  <div className="overflow-visible pt-3">
                    <FormSelectField
                      label="Login Type *"
                      options={loginTypeOptions}
                      value={formValues.loginType}
                      onChange={(value) =>
                        setField("loginType", Array.isArray(value) ? value[0] : value || "")
                      }
                      placeholder="Select"
                      mode="single"
                      background="white"
                      error={formErrors.loginType}
                      labelSlot={
                        <Tooltip
                          position="top"
                          content={
                            <div className="text-left text-[10px]" style={{ whiteSpace: "nowrap" }}>
                              <p className="mb-1 font-semibold">Login Type determines how the therapist can log in.</p>
                              <p><span className="font-semibold">IP</span> — Login allowed only from registered hospital IP address.</p>
                              <p><span className="font-semibold">OTP</span> — Login using One-Time Password verification.</p>
                              <p><span className="font-semibold">IP/OTP</span> — Both IP restriction and OTP verification required.</p>
                              <p><span className="font-semibold">No Auth</span> — Login without IP restriction or OTP verification.</p>
                            </div>
                          }
                          maxWidth={420}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cursor-default text-[#7B8089]">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                          </svg>
                        </Tooltip>
                      }
                    />
                  </div>

                  <div className="overflow-visible pt-3">
                    <FormInputField
                      label="Employee Id *"
                      value={formValues.employeeId}
                      onChange={(e) => setField("employeeId", formatEmpIdInput(e.target.value))}
                      placeholder="Employee Id"
                      height={44}
                      error={formErrors.employeeId}
                    />
                  </div>

                  <div className="overflow-visible pt-3">
                    <FormInputField
                      label="Experience *"
                      value={formValues.experience}
                      onChange={(e) => setField("experience", e.target.value.slice(0, 100))}
                      placeholder="Experience"
                      height={44}
                      error={formErrors.experience}
                    />
                  </div>

                  {/* Row 4 — Status */}
                  <div className="col-span-3 overflow-visible pt-3">
                    <FormSelectField
                      label="Status *"
                      options={statusOptions}
                      value={formValues.status}
                      onChange={(value) =>
                        setField("status", (Array.isArray(value) ? value[0] : value || "active") as string)
                      }
                      mode="single"
                      background="white"
                    />
                  </div>
                </div>

                {/* Certifications */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-[#1A1A1A]">Certifications</span>
                    <button
                      type="button"
                      onClick={addCertification}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-[#0B8C00] text-[#0B8C00] hover:bg-[#F2F8F2] transition-colors"
                      title="Add certification"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 3.333v9.334M3.333 8h9.334" stroke="#0B8C00" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                  <div className="space-y-3">
                    {certifications.map((cert, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="flex-1">
                          <FormInputField
                            label=""
                            value={cert}
                            onChange={(e) => updateCertification(idx, e.target.value)}
                            placeholder="Certification"
                            height={44}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCertification(idx)}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0B8C00] hover:bg-[#097200] transition-colors"
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
                      </div>
                    ))}
                  </div>
                  {certError && (
                    <p className="mt-1.5 text-xs text-red-500">{certError}</p>
                  )}
                </div>
              </div>

              {/* ── Right: therapy selection ── */}
              <div className="w-[390px] shrink-0 rounded-[20px] border border-[#E3EEE1] bg-white p-5">
                <p className="mb-1 text-sm font-semibold text-[#1A1A1A]">Specializations</p>
                {therapyError && (
                  <p className="mb-3 text-xs text-red-500">{therapyError}</p>
                )}
                {!therapyError && <div className="mb-3" />}
                {therapyList.length === 0 ? (
                  <p className="text-xs text-[#9CA3AF]">
                    {resolvedBranchId
                      ? "No therapies available for this branch."
                      : "Select a branch to load therapies."}
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {therapyList.map((therapy) => {
                      const active = selectedTherapyIds.includes(therapy.id);
                      const label = therapy.therapyName ?? therapy.medicineName;
                      return (
                        <button
                          key={therapy.id}
                          type="button"
                          onClick={() => toggleTherapy(therapy.id)}
                          title={label}
                          className={`rounded-full border px-2 py-1 text-xs font-medium transition-colors text-center truncate ${
                            active
                              ? "border-[#0B8C00] bg-[#0B8C00] text-white"
                              : "border-[#D1D5DB] bg-white text-[#374151] hover:border-[#0B8C00] hover:text-[#0B8C00]"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={isCreating}
                className="flex h-11 items-center justify-center rounded-[32px] bg-[#0B8C00] px-8 text-sm font-semibold text-white transition-colors hover:bg-[#097200] disabled:opacity-60"
              >
                {isCreating ? "Adding…" : "Add Therapist"}
              </button>
            </div>
          </form>
        </ListBorder>
      </div>

      <MessageDialog
        open={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        icon="/icons/SuccessCheck.svg"
        iconBgColor="#E8F5E9"
        message={successMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => {
          setShowSuccessDialog(false);
          router.push("/settings/therapist");
        }}
      />

      <MessageDialog
        open={showApiErrorDialog}
        onClose={() => setShowApiErrorDialog(false)}
        icon="/icons/CrossIcon.svg"
        iconBgColor="#FFEBEE"
        message={apiErrorMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => setShowApiErrorDialog(false)}
      />
    </AppShell>
  );
}

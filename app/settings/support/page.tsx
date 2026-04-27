"use client";

import Image from "next/image";
import { useState, useEffect, useMemo } from "react";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { Button, Dialog, FormInputField, FormSelectField, MessageDialog } from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import {
  useGetConfigurationQuery,
  useGetAdminSupportContactsQuery,
  useLazyGetSupportContactByPhoneQuery,
  useCreateSupportContactsMutation,
  useUpdateSupportContactMutation,
  useUpdateConfigurationMutation,
  type SupportCategoryWithContacts,
  type SupportContactItem,
} from "@/store/api/settingsApi";
import {
  filterSupportNameInput,
  filterSupportPhoneInput,
  filterSupportRoleInput,
  validateSupportContactName,
  validateSupportContactPhone,
  validateSupportContactRole,
} from "@/lib/validation/supportContactForm";
import { usePermission } from "@/hooks/usePermission";

type SupportDraftRow = {
  rowKey: string;
  serverId?: number;
  name: string;
  phone: string;
  role: string;
};

type SupportFieldTouched = { name?: boolean; phone?: boolean; role?: boolean };

function normalizePhone(phone: string): string {
  return phone.trim().replace(/\s+/g, "");
}

/** Row keys whose Contact matches another row (non-empty phone only). */
function getDuplicatePhoneRowKeys(rows: SupportDraftRow[]): Set<string> {
  const byPhone = new Map<string, string[]>();
  for (const r of rows) {
    const p = normalizePhone(r.phone);
    if (!p) continue;
    if (!byPhone.has(p)) byPhone.set(p, []);
    byPhone.get(p)!.push(r.rowKey);
  }
  const dup = new Set<string>();
  for (const keys of byPhone.values()) {
    if (keys.length > 1) {
      for (const k of keys) dup.add(k);
    }
  }
  return dup;
}

const SUPPORT_CATEGORY_IDS: readonly [1, 2, 3] = [1, 2, 3];

const FALLBACK_SUPPORT_TITLE: Record<number, string> = {
  1: "Support Level 1",
  2: "Support Level 2",
};

const LEVEL_OTHER_SECTION_HEADING =
  "If there is no response, kindly call the below-mentioned number.";

function chunkContactsIntoPairs(contacts: SupportContactItem[]): Array<[SupportContactItem, SupportContactItem?]> {
  const rows: Array<[SupportContactItem, SupportContactItem?]> = [];
  for (let i = 0; i < contacts.length; i += 2) {
    rows.push([contacts[i], contacts[i + 1]]);
  }
  return rows;
}

function getSupportSectionTitle(
  categoryId: number,
  apiCategory: SupportCategoryWithContacts | undefined,
): string {
  if (categoryId === 3) return LEVEL_OTHER_SECTION_HEADING;
  const fromApi = apiCategory?.title?.trim();
  if (fromApi) return fromApi;
  return FALLBACK_SUPPORT_TITLE[categoryId] ?? `Support (${categoryId})`;
}

function formatContactLabel(contact: SupportContactItem): string {
  const role = contact.role?.trim();
  return role ? `${contact.name} (${role})` : contact.name;
}

export default function SettingsConfigurationPage() {
  const supportPermission = usePermission("settings", { subModule: "support" });
  const canView = supportPermission.canView;
  const canAdd = supportPermission.canAdd;
  const canEdit = supportPermission.canEdit;

  const { data: configurationData, isLoading, refetch } = useGetConfigurationQuery(undefined, {
    skip: !canView,
  });
  const {
    data: supportContactsResponse,
    isLoading: isSupportContactsLoading,
    isError: isSupportContactsError,
    error: supportContactsError,
  } = useGetAdminSupportContactsQuery(undefined, { skip: !canView });
  const [triggerLookupPhone] = useLazyGetSupportContactByPhoneQuery();
  const [createSupportContacts] = useCreateSupportContactsMutation();
  const [updateSupportContact] = useUpdateSupportContactMutation();
  const [updateConfiguration, { isLoading: isUpdating }] = useUpdateConfigurationMutation();
  const [supportmodal, setSupportmodal] = useState(false);
  const [supportAddCategoryId, setSupportAddCategoryId] = useState<number | null>(null);
  const [supportModalMode, setSupportModalMode] = useState<"add" | "edit">("add");
  const [supportDraftRows, setSupportDraftRows] = useState<SupportDraftRow[]>([]);
  const [supportFormError, setSupportFormError] = useState("");
  const [supportFormSubmitting, setSupportFormSubmitting] = useState(false);
  const duplicatePhoneRowKeys = useMemo(
    () => getDuplicatePhoneRowKeys(supportDraftRows),
    [supportDraftRows],
  );
  const hasDuplicatePhonesInForm = duplicatePhoneRowKeys.size > 0;

  const [supportFieldsTouched, setSupportFieldsTouched] = useState<
    Record<string, SupportFieldTouched>
  >({});
  const [supportSubmitAttempted, setSupportSubmitAttempted] = useState(false);

  const shouldShowDuplicateFormBanner =
    hasDuplicatePhonesInForm &&
    (supportSubmitAttempted ||
      [...duplicatePhoneRowKeys].some((rk) => supportFieldsTouched[rk]?.phone));

  const supportRowFieldErrors = useMemo(() => {
    const m: Record<string, { name?: string; phone?: string; role?: string }> = {};
    for (const r of supportDraftRows) {
      const t = supportFieldsTouched[r.rowKey] ?? {};
      const showName = supportSubmitAttempted || Boolean(t.name);
      const showRole = supportSubmitAttempted || Boolean(t.role);
      const showPhone = supportSubmitAttempted || Boolean(t.phone);

      let phoneMsg: string | undefined;
      if (showPhone) {
        phoneMsg = duplicatePhoneRowKeys.has(r.rowKey)
          ? "This number is already used in another row."
          : validateSupportContactPhone(r.phone) || undefined;
      }

      m[r.rowKey] = {
        name: showName ? validateSupportContactName(r.name) || undefined : undefined,
        role: showRole ? validateSupportContactRole(r.role) || undefined : undefined,
        phone: phoneMsg,
      };
    }
    return m;
  }, [supportDraftRows, duplicatePhoneRowKeys, supportFieldsTouched, supportSubmitAttempted]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [apiErrorMessage, setApiErrorMessage] = useState("");
  const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
  const [invoiceLockedDaysError, setInvoiceLockedDaysError] = useState("");
  const [formValues, setFormValues] = useState({
    id: 0,
    invoiceLockedDays: "",
    smsChannel: "off",
    branchId: 1,
  });

  // Update form values when configuration data is loaded
  useEffect(() => {
    if (configurationData?.data) {
      const data = configurationData.data;
      setFormValues({
        id: data.id,
        invoiceLockedDays: String(data.invoiceLockedDays),
        smsChannel: data.sms.toLowerCase(),
        branchId: data.branchId,
      });
    }
  }, [configurationData]);

  const smsChannelOptions = [
    { value: "off", label: "Off" },
    { value: "on", label: "On" },
  ];

  const handleInvoiceDaysChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;

    // Only allow numeric input (0-9)
    if (value === "" || /^\d+$/.test(value)) {
      // Limit to 3 digits
      if (value.length <= 3) {
        setFormValues((prev) => ({
          ...prev,
          invoiceLockedDays: value,
        }));
        // Clear error when valid input is entered
        if (invoiceLockedDaysError) {
          setInvoiceLockedDaysError("");
        }
      }
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit) return;

    // Clear previous errors
    setInvoiceLockedDaysError("");

    // Validate invoice locked days field
    if (!formValues.invoiceLockedDays.trim()) {
      setInvoiceLockedDaysError("Invoice locked days is required");
      return;
    }

    const daysValue = Number(formValues.invoiceLockedDays);

    // Validate it's a valid number
    if (isNaN(daysValue)) {
      setInvoiceLockedDaysError("Please enter a valid number");
      return;
    }

    // Validate range (0-999)
    if (daysValue < 0 || daysValue > 999) {
      setInvoiceLockedDaysError("Please enter a number between 0 and 999");
      return;
    }

    if (formValues.id === 0) {
      setApiErrorMessage("Configuration data not loaded. Please refresh the page.");
      setShowApiErrorDialog(true);
      return;
    }

    try {
      const result = await updateConfiguration({
        id: formValues.id,
        invoiceLockedDays: Number(formValues.invoiceLockedDays),
        sms: formValues.smsChannel,
        regCrone: configurationData?.data?.regCrone ?? 0,
        saleCron: configurationData?.data?.saleCron ?? 0,
        branchId: formValues.branchId,
      }).unwrap();

      setSuccessMessage(result?.message || "Configuration saved successfully");
      setShowSuccessDialog(true);
      setIsDialogOpen(false);

      // Refetch configuration data to update the display
      refetch();
    } catch (error: any) {
      console.error("Update configuration error:", error);
      const errorMessage = error?.data?.message || error?.data?.error || "Failed to update configuration";
      setApiErrorMessage(errorMessage);
      setShowApiErrorDialog(true);
    }
  };

  const supportCategories = supportContactsResponse?.data ?? [];
  const supportCategoryById = new Map<number, SupportCategoryWithContacts>(
    supportCategories.map((c) => [c.id, c]),
  );

  const verifyPhoneNotRegistered = async (
    phone: string,
    excludeContactId?: number,
  ): Promise<string | null> => {
    const trimmed = normalizePhone(phone);
    if (!trimmed) return "Phone is required";
    const result = await triggerLookupPhone(trimmed);
    if ("error" in result && result.error) {
      const fe = result.error as FetchBaseQueryError;
      if (fe.status === 404) return null;
      return "Unable to verify if this phone number is already in use.";
    }
    const payload = "data" in result ? result.data : undefined;
    if (payload?.success && payload.data && typeof payload.data.id === "number") {
      if (excludeContactId != null && payload.data.id === excludeContactId) return null;
      const catTitle = payload.data.category?.title;
      return `This phone number is already registered${catTitle ? ` (${catTitle})` : ""}.`;
    }
    return null;
  };

  const openSupportModal = (categoryId: number) => {
    setSupportAddCategoryId(categoryId);
    const cat = supportCategoryById.get(categoryId);
    const list = cat?.contacts ?? [];
    if (list.length > 0 && !canEdit) return;
    if (list.length === 0 && !canAdd) return;
    if (list.length === 0) {
      setSupportModalMode("add");
      setSupportDraftRows([{ rowKey: `r-${Date.now()}`, name: "", phone: "", role: "" }]);
    } else {
      setSupportModalMode("edit");
      setSupportDraftRows(
        list.map((c) => ({
          rowKey: `srv-${c.id}`,
          serverId: c.id,
          name: c.name,
          phone: c.phone,
          role: c.role ?? "",
        })),
      );
    }
    setSupportFormError("");
    setSupportFieldsTouched({});
    setSupportSubmitAttempted(false);
    setSupportmodal(true);
  };

  const closeSupportModal = () => {
    setSupportmodal(false);
    setSupportAddCategoryId(null);
    setSupportDraftRows([]);
    setSupportModalMode("add");
    setSupportFormError("");
    setSupportFieldsTouched({});
    setSupportSubmitAttempted(false);
    setInvoiceLockedDaysError("");
  };

  const markSupportFieldTouched = (rowKey: string, field: keyof SupportFieldTouched) => {
    setSupportFieldsTouched((prev: Record<string, SupportFieldTouched>) => ({
      ...prev,
      [rowKey]: { ...prev[rowKey], [field]: true },
    }));
  };

  const addSupportDraftRow = () => {
    setSupportDraftRows((prev) => [
      ...prev,
      { rowKey: `r-${Date.now()}-${prev.length}`, name: "", phone: "", role: "" },
    ]);
  };

  const removeSupportDraftRow = (rowKey: string) => {
    setSupportDraftRows((prev) => {
      const row = prev.find((r) => r.rowKey === rowKey);
      if (row?.serverId != null) return prev;
      const next = prev.filter((r) => r.rowKey !== rowKey);
      return next.length > 0 ? next : prev;
    });
  };

  const updateSupportDraftRow = (
    rowKey: string,
    field: keyof Pick<SupportDraftRow, "name" | "phone" | "role">,
    value: string,
  ) => {
    setSupportFormError("");
    let next = value;
    if (field === "name") next = filterSupportNameInput(value);
    else if (field === "role") next = filterSupportRoleInput(value);
    else if (field === "phone") next = filterSupportPhoneInput(value);
    setSupportDraftRows((prev) =>
      prev.map((r) => (r.rowKey === rowKey ? { ...r, [field]: next } : r)),
    );
  };

  const handleSupportFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (supportAddCategoryId == null) return;
    if (supportModalMode === "add" && !canAdd) return;
    if (supportModalMode === "edit" && !canEdit) return;

    setSupportSubmitAttempted(true);
    setSupportFormError("");

    if (duplicatePhoneRowKeys.size > 0) {
      setSupportFormError("Please fix duplicate phone numbers in the form.");
      return;
    }

    for (const r of supportDraftRows) {
      if (
        validateSupportContactName(r.name) ||
        validateSupportContactRole(r.role) ||
        validateSupportContactPhone(r.phone)
      ) {
        setSupportFormError("Please fix the errors highlighted below.");
        return;
      }
    }

    setSupportFormSubmitting(true);
    try {
      for (const r of supportDraftRows) {
        const msg = await verifyPhoneNotRegistered(r.phone, r.serverId);
        if (msg) {
          setSupportFormError(msg);
          setSupportFormSubmitting(false);
          return;
        }
      }

      if (supportModalMode === "add") {
        const result = await createSupportContacts({
          categoryId: supportAddCategoryId,
          contacts: supportDraftRows.map((r) => ({
            name: r.name.trim(),
            phone: normalizePhone(r.phone),
            role: r.role.trim(),
          })),
        }).unwrap();
        setSuccessMessage(result?.message || "Support contacts created successfully");
        setShowSuccessDialog(true);
        closeSupportModal();
        return;
      }

      const original = supportCategoryById.get(supportAddCategoryId)?.contacts ?? [];
      const origById = new Map(original.map((c) => [c.id, c]));

      for (const r of supportDraftRows) {
        if (r.serverId == null) continue;
        const o = origById.get(r.serverId);
        if (!o) continue;
        const changed =
          o.name !== r.name.trim() ||
          normalizePhone(o.phone) !== normalizePhone(r.phone) ||
          (o.role ?? "") !== r.role.trim();
        if (changed) {
          await updateSupportContact({
            id: r.serverId,
            name: r.name.trim(),
            phone: normalizePhone(r.phone),
            role: r.role.trim(),
          }).unwrap();
        }
      }

      const newOnly = supportDraftRows.filter((r) => r.serverId == null);
      if (newOnly.length > 0) {
        const result = await createSupportContacts({
          categoryId: supportAddCategoryId,
          contacts: newOnly.map((row) => ({
            name: row.name.trim(),
            phone: normalizePhone(row.phone),
            role: row.role.trim(),
          })),
        }).unwrap();
        setSuccessMessage(result?.message || "Support contacts saved successfully");
      } else {
        setSuccessMessage("Support contacts updated successfully");
      }
      setShowSuccessDialog(true);
      closeSupportModal();
    } catch (err: unknown) {
      console.error("Support contacts save error:", err);
      const e = err as { data?: { message?: string; error?: string } };
      setApiErrorMessage(
        e?.data?.message || e?.data?.error || "Failed to save support contacts",
      );
      setShowApiErrorDialog(true);
    } finally {
      setSupportFormSubmitting(false);
    }
  };

  const supportDialogTitle =
    supportAddCategoryId === 1
      ? supportModalMode === "add"
        ? "Add Support — Support Level 1"
        : "Edit Support — Support Level 1"
      : supportAddCategoryId === 2
        ? supportModalMode === "add"
          ? "Add Support — Support Level 2"
          : "Edit Support — Support Level 2"
        : supportAddCategoryId === 3
          ? supportModalMode === "add"
            ? "Add Support — Other"
            : "Edit Support — Other"
          : "Support";

  return (
    <AppShell>
 

      {/* Support  */}
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <PageHeading title="Support" />
        </div>

        <ListBorder as="section" className="px-4 py-4">
          {!canView ? (
            <div className="rounded-[20px] border border-[#E3EEE1] bg-white px-6 py-10 text-center text-sm text-[#9CA3AF]">
              You don&apos;t have permission to view support.
            </div>
          ) : (
            <>
              {isSupportContactsError ? (
                <div className="mb-4 rounded-[20px] border border-[#F6776E]/40 bg-[#FFF5F5] px-6 py-4 text-sm text-[#434956]">
                  {(supportContactsError as { data?: { message?: string } })?.data?.message ||
                    "Could not load support contacts. Please try again."}
                </div>
              ) : null}

              {SUPPORT_CATEGORY_IDS.map((categoryId) => {
            const apiCategory = supportCategoryById.get(categoryId);
            const contacts = apiCategory?.contacts ?? [];
            const sectionTitle = getSupportSectionTitle(categoryId, apiCategory);
            const pairs = chunkContactsIntoPairs(contacts);

            return (
              <div
                key={categoryId}
                className="mb-4 w-full rounded-[20px] border border-[#E3EEE1] bg-white p-6 last:mb-0"
              >
                <div className="mb-6 flex items-start justify-between gap-4">
                  <h2 className="text-base font-semibold leading-snug text-[#262D3B]">{sectionTitle}</h2>
                  <button
                    type="button"
                    onClick={() => openSupportModal(categoryId)}
                    disabled={
                      isSupportContactsLoading ||
                      (contacts.length > 0 ? !canEdit : !canAdd)
                    }
                    className="flex h-11 w-11 shrink-0 cursor-pointer flex-row items-center justify-center gap-1 rounded-[32px] border border-[#0B8C00] transition-colors hover:bg-[#0B8C00]/10 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={
                      contacts.length > 0
                        ? `Edit contacts for category ${categoryId}`
                        : `Add contact for category ${categoryId}`
                    }
                  >
                    {contacts.length > 0 ? (
                      <Image src="/icons/EditPencil.svg" alt="Edit" width={20} height={20} className="shrink-0" />
                    ) : (
                      <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                    )}
                  </button>
                </div>

                {isSupportContactsLoading ? (
                  <div className="border-b border-t border-[#E9F3E6] px-5 py-[18px] text-sm text-[#8B939E]">
                    Loading…
                  </div>
                ) : pairs.length === 0 ? (
                  <div className="border-b border-t border-[#E9F3E6] px-5 py-[18px] text-sm text-[#8B939E]">
                    No contacts added yet.
                  </div>
                ) : (
                  <div className="divide-y divide-[#EDF3EA] border-b border-t border-[#E9F3E6]">
                    {pairs.map(([left, right], rowIdx) => (
                      <div key={`${categoryId}-${rowIdx}-${left.id}`} className="grid grid-cols-2 items-center text-sm">
                        <div className="flex items-center justify-between border-r border-[#EBECED] px-5 py-[18px]">
                          <span className="text-sm text-[#434956]">{formatContactLabel(left)}</span>
                          <span className="text-sm font-medium text-[#434956]">{left.phone}</span>
                        </div>
                        {right ? (
                          <div className="flex items-center justify-between px-5 py-[18px]">
                            <span className="text-sm text-[#434956]">{formatContactLabel(right)}</span>
                            <span className="text-sm font-medium text-[#434956]">{right.phone}</span>
                          </div>
                        ) : (
                          <div className="px-5 py-[18px]" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
              })}
            </>
          )}
        </ListBorder>
      </div>



      <Dialog
        open={supportmodal && ((supportModalMode === "add" && canAdd) || (supportModalMode === "edit" && canEdit))}
        onClose={closeSupportModal}
        title={supportDialogTitle}
        width={950}
      >
        <form onSubmit={handleSupportFormSubmit} className="space-y-6">
          {shouldShowDuplicateFormBanner ? (
            <p className="text-sm text-[#C62828]" role="alert">
              Each contact must have a unique phone number. Change or remove duplicate values in the
              highlighted fields.
            </p>
          ) : null}
          {supportFormError ? (
            <p className="text-sm text-[#C62828]" role="alert">
              {supportFormError}
            </p>
          ) : null}
          <div className="container_support">
            {supportDraftRows.map((row, index) => (
              <div
                key={row.rowKey}
                className="mb-4 grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-4 max-md:grid-cols-1"
              >
                <FormInputField
                  label="Name *"
                  placeholder="Name"
                  type="text"
                  maxLength={100}
                  height={44}
                  value={row.name}
                  onChange={(e) => updateSupportDraftRow(row.rowKey, "name", e.target.value)}
                  onBlur={() => markSupportFieldTouched(row.rowKey, "name")}
                  disabled={supportFormSubmitting}
                  error={supportRowFieldErrors[row.rowKey]?.name}
                />
                <FormInputField
                  label="Contact *"
                  placeholder="10-digit mobile number"
                  type="text"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={10}
                  height={44}
                  value={row.phone}
                  onChange={(e) => updateSupportDraftRow(row.rowKey, "phone", e.target.value)}
                  onBlur={() => markSupportFieldTouched(row.rowKey, "phone")}
                  disabled={supportFormSubmitting}
                  error={supportRowFieldErrors[row.rowKey]?.phone}
                />
                <FormInputField
                  label="Role *"
                  placeholder="Role"
                  type="text"
                  maxLength={100}
                  height={44}
                  value={row.role}
                  onChange={(e) => updateSupportDraftRow(row.rowKey, "role", e.target.value)}
                  onBlur={() => markSupportFieldTouched(row.rowKey, "role")}
                  disabled={supportFormSubmitting}
                  error={supportRowFieldErrors[row.rowKey]?.role}
                />
                {index === 0 ? (
                  <button
                    type="button"
                    onClick={addSupportDraftRow}
                    disabled={supportFormSubmitting}
                    className="flex h-11 w-11 cursor-pointer items-center justify-center self-end rounded-[32px] bg-[#0B8C00] disabled:opacity-50 max-md:self-start"
                    aria-label="Add another row"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M17.5 8.125H11.875V2.5C11.875 1.80977 11.3152 1.25 10.625 1.25H9.375C8.68477 1.25 8.125 1.80977 8.125 2.5V8.125H2.5C1.80977 8.125 1.25 8.68477 1.25 9.375V10.625C1.25 11.3152 1.80977 11.875 2.5 11.875H8.125V17.5C8.125 18.1902 8.68477 18.75 9.375 18.75H10.625C11.3152 18.75 11.875 18.1902 11.875 17.5V11.875H17.5C18.1902 11.875 18.75 11.3152 18.75 10.625V9.375C18.75 8.68477 18.1902 8.125 17.5 8.125Z"
                        fill="white"
                      />
                    </svg>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => removeSupportDraftRow(row.rowKey)}
                    disabled={supportFormSubmitting || row.serverId != null}
                    title={row.serverId != null ? "Saved contacts cannot be removed here" : "Remove row"}
                    className="flex h-11 w-11 cursor-pointer items-center justify-center self-end rounded-[32px] bg-[#F6776E] disabled:cursor-not-allowed disabled:opacity-50 max-md:self-start"
                    aria-label="Remove row"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M13.3333 5.0013V4.33464C13.3333 3.40121 13.3333 2.9345 13.1517 2.57798C12.9919 2.26438 12.7369 2.00941 12.4233 1.84962C12.0668 1.66797 11.6001 1.66797 10.6667 1.66797H9.33333C8.39991 1.66797 7.9332 1.66797 7.57668 1.84962C7.26308 2.00941 7.00811 2.26438 6.84832 2.57798C6.66667 2.9345 6.66667 3.40121 6.66667 4.33464V5.0013M8.33333 9.58464V13.7513M11.6667 9.58464V13.7513M2.5 5.0013H17.5M15.8333 5.0013V14.3346C15.8333 15.7348 15.8333 16.4348 15.5608 16.9696C15.3212 17.44 14.9387 17.8225 14.4683 18.0622C13.9335 18.3346 13.2335 18.3346 11.8333 18.3346H8.16667C6.76654 18.3346 6.06647 18.3346 5.53169 18.0622C5.06129 17.8225 4.67883 17.44 4.43915 16.9696C4.16667 16.4348 4.16667 15.7348 4.16667 14.3346V5.0013"
                        stroke="white"
                        strokeWidth="1.66667"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              variant="primary"
              isLoading={supportFormSubmitting}
              disabled={supportFormSubmitting}
            >
              {supportModalMode === "add" ? "Add Support" : "Save changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={closeSupportModal}
              disabled={supportFormSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Support  */}






      <Dialog
        open={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setInvoiceLockedDaysError("");
        }}
        title="Edit Configuration"
        width={686}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <FormInputField
              label="Invoice locked After days *"
              type="number"
              min="0"
              max="999"
              maxLength={3}
              required
              value={formValues.invoiceLockedDays}
              onChange={handleInvoiceDaysChange}
              height={44}
              disabled={isUpdating}
              error={invoiceLockedDaysError}
            />

            <FormSelectField
              label="SMS/Whatsapp"
              options={smsChannelOptions}
              value={formValues.smsChannel}
              onChange={(value) => {
                if (typeof value === "string") {
                  setFormValues((prev) => ({
                    ...prev,
                    smsChannel: value,
                  }));
                }
              }}
              background="white"
              disabled={isUpdating}
            />
          </div>

       
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              variant="primary"
              isLoading={isUpdating}
              disabled={isUpdating}
            >
              Update
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setInvoiceLockedDaysError("");
              }}
              disabled={isUpdating}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Success Dialog */}
      <MessageDialog
        open={showSuccessDialog}
        onClose={() => {
          setShowSuccessDialog(false);
        }}
        icon="/icons/SuccessCheck.svg"
        iconBgColor="#E8F5E9"
        message={successMessage}
        confirmText="Success"
        showCancel={false}
        onConfirm={() => {
          setShowSuccessDialog(false);
        }}
      />

      {/* API Error Dialog - Only for API errors, not validation errors */}
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


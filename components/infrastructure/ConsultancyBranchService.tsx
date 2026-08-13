"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button, Dialog, FormSelectField, ConfigurationSummaryPanel, MessageDialog, Tooltip } from "@/components/ui";
import type { SelectOption } from "@/components/ui/FormSelectField";
import type { FacilityConfigurationSummarySnapshot } from "@/lib/types/facilityConfigurationSummary";
import { useFacilityConfigurationSummaryFromHierarchy } from "@/hooks/useFacilityConfigurationSummaryFromHierarchy";
import {
  useGetBranchServicesByBranchIdQuery,
  useGetBranchHierarchyTreeQuery,
  useCreateBranchServiceMutation,
  useUpdateBranchServiceMutation,
  useDeleteBranchServiceMutation,
  type CreateBranchServiceBody,
} from "@/store/api/branchSetupApi";
import { useGetAllMasterServicesQuery } from "@/store/api/settingsApi";
import { RupeeCircleIcon } from "@/components/icons/RupeeCircleIcon";
import { formatIndianAmount, formatIndianCurrency, parseIndianAmount } from "@/store/utils/formatIndianAmount";

export type ConsultancyBranchServiceProps = {
  facilityName: string;
  branchId: number | null;
  canView?: boolean;
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  onBack: () => void;
  configurationSummary?: FacilityConfigurationSummarySnapshot | null;
};

function sanitizeAmountInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits === "") return "";
  if (digits === "0") return "0";
  return digits.replace(/^0+/, "") || "0";
}

function rtkErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const d = err as { data?: { message?: string }; message?: string };
    if (typeof d.data?.message === "string" && d.data.message) return d.data.message;
    if (typeof d.message === "string" && d.message) return d.message;
  }
  return "Something went wrong. Please try again.";
}

export function ConsultancyBranchService({
  facilityName,
  branchId,
  canView = true,
  canAdd = true,
  canEdit = true,
  canDelete = true,
  onBack,
  configurationSummary = null,
}: ConsultancyBranchServiceProps) {
  const noBranch = branchId == null;
  const noViewAccess = !canView;
  const branchIdNum = branchId ?? 0;

  const { data: hierarchyTreeRes } = useGetBranchHierarchyTreeQuery(branchIdNum, {
    skip: noBranch || noViewAccess,
  });
  const configurationSummaryForPanel = useFacilityConfigurationSummaryFromHierarchy(
    hierarchyTreeRes?.success && Array.isArray(hierarchyTreeRes.data) ? hierarchyTreeRes.data : undefined,
    configurationSummary,
  );

  const {
    data: branchServicesRes,
    isLoading: branchServicesLoading,
    isFetching: branchServicesFetching,
  } = useGetBranchServicesByBranchIdQuery(branchIdNum, {
    skip: noBranch || noViewAccess,
    refetchOnMountOrArgChange: true,
  });

  const { data: masterServicesRes, isLoading: mastersLoading } = useGetAllMasterServicesQuery(
    { category: "service", subCategory: "consultancy", limit: 100, page: 1 },
    { refetchOnMountOrArgChange: true },
  );

  const [createBranchService] = useCreateBranchServiceMutation();
  const [updateBranchService] = useUpdateBranchServiceMutation();
  const [deleteBranchService] = useDeleteBranchServiceMutation();

  const consultancyMasters = useMemo(() => {
    const list = masterServicesRes?.data ?? [];
    return list
      .filter((m) => m.subCategory === "consultancy" && m.status === true)
      .slice()
      .sort((a, b) => a.price - b.price);
  }, [masterServicesRes?.data]);

  const branchConsultancyRows = useMemo(() => {
    const list = branchServicesRes?.data ?? [];
    return list.filter((r) => r.subCategory === "consultancy");
  }, [branchServicesRes?.data]);

  const existingMasterIds = useMemo(
    () => new Set(branchConsultancyRows.map((r) => r.masterServiceId)),
    [branchConsultancyRows],
  );

  const existingPriceSet = useMemo(() => {
    const s = new Set<number>();
    for (const r of branchConsultancyRows) {
      const n = Number(r.price);
      if (Number.isFinite(n)) s.add(n);
    }
    return s;
  }, [branchConsultancyRows]);

  const availablePresetOptions: SelectOption[] = useMemo(
    () =>
      consultancyMasters
        .filter((m) => !existingMasterIds.has(m.id))
        .map((m) => ({
          label: formatIndianCurrency(m.price),
          value: String(m.id),
        })),
    [consultancyMasters, existingMasterIds],
  );

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedPresetAmounts, setSelectedPresetAmounts] = useState<string[]>([]);
  const [otherAmountInput, setOtherAmountInput] = useState("");
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteConfirmAmount, setDeleteConfirmAmount] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editDialog, setEditDialog] = useState<{ id: number; amountInput: string; oldAmount: number } | null>(null);

  const allowedPresetValues = useMemo(() => new Set(availablePresetOptions.map((o) => o.value)), [availablePresetOptions]);

  useEffect(() => {
    if (!showAddDialog) return;
    setSelectedPresetAmounts((prev) => {
      const next = prev.filter((v) => allowedPresetValues.has(v));
      return next.length === prev.length ? prev : next;
    });
  }, [showAddDialog, allowedPresetValues]);

  const handleAddOpen = () => {
    if (!canAdd) return;
    setSelectedPresetAmounts([]);
    setOtherAmountInput("");
    setShowAddDialog(true);
  };

  const handleCloseAdd = () => {
    setShowAddDialog(false);
    setSelectedPresetAmounts([]);
    setOtherAmountInput("");
  };

  const handleAddSubmit = async () => {
    if (!canAdd) return;
    if (noBranch || branchId == null) return;

    const usedMasterIds = new Set<number>();
    const toCreate: CreateBranchServiceBody[] = [];

    for (const idStr of selectedPresetAmounts) {
      const masterServiceId = parseInt(idStr, 10);
      if (!Number.isFinite(masterServiceId)) continue;
      if (usedMasterIds.has(masterServiceId)) continue;
      if (existingMasterIds.has(masterServiceId)) continue;
      usedMasterIds.add(masterServiceId);
      toCreate.push({ branchId, masterServiceId });
    }

    const otherStr = otherAmountInput.trim();
    if (otherStr !== "") {
      const n = parseInt(sanitizeAmountInput(otherStr) || otherStr, 10);
      if (Number.isFinite(n) && n >= 0 && !existingPriceSet.has(n)) {
        const matchMaster = consultancyMasters.find((m) => m.price === n);
        if (matchMaster) {
          if (!usedMasterIds.has(matchMaster.id) && !existingMasterIds.has(matchMaster.id)) {
            usedMasterIds.add(matchMaster.id);
            toCreate.push({ branchId, masterServiceId: matchMaster.id });
          }
        } else {
          const template = consultancyMasters[0];
          if (!template) {
            setFeedback({
              kind: "error",
              message: "No consultancy fee templates are configured in settings. Add master consultancy services first.",
            });
            return;
          }
          toCreate.push({
            branchId,
            masterServiceId: template.id,
            price: String(n),
          });
        }
      }
    }

    if (toCreate.length === 0) {
      setFeedback({
        kind: "error",
        message:
          "Nothing new to add. Choose a standard option you have not added yet, or enter a different optional amount.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      for (const body of toCreate) {
        await createBranchService(body).unwrap();
      }
      handleCloseAdd();
      const addedLabels = toCreate.map((b) => {
        if (b.price != null && b.price !== "") {
          const n = Number(b.price);
          if (Number.isFinite(n)) return formatIndianCurrency(n);
        }
        const masterPrice = consultancyMasters.find((m) => m.id === b.masterServiceId)?.price;
        if (masterPrice != null && Number.isFinite(masterPrice)) return formatIndianCurrency(masterPrice);
        return `service #${b.masterServiceId}`;
      });
      const labelText = addedLabels.join(", ");
      setFeedback({
        kind: "success",
        message:
          toCreate.length === 1 ? `Added consultancy fee ${labelText}.` : `Added consultancy fees: ${labelText}.`,
      });
    } catch (e) {
      setFeedback({ kind: "error", message: rtkErrorMessage(e) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDelete = (id: number, amount: number) => {
    if (!canDelete) return;
    setDeleteConfirmId(id);
    setDeleteConfirmAmount(amount);
  };

  const closeDelete = () => {
    setDeleteConfirmId(null);
    setDeleteConfirmAmount(null);
  };

  const confirmDelete = async () => {
    if (!canDelete) return;
    if (deleteConfirmId == null || noBranch || branchId == null) return;
    const id = deleteConfirmId;
    const amt = deleteConfirmAmount;
    closeDelete();
    try {
      await deleteBranchService({ branchServiceId: id, branchId }).unwrap();
      setFeedback({
        kind: "success",
        message:
          amt != null
            ? `Consultancy fee of ${formatIndianCurrency(amt)} was removed from this branch.`
            : "Consultancy fee was removed from this branch.",
      });
    } catch (e) {
      setFeedback({ kind: "error", message: rtkErrorMessage(e) });
    }
  };

  const closeFeedback = () => setFeedback(null);

  const openEdit = (id: number, amount: number) => {
    if (!canEdit) return;
    setEditDialog({ id, amountInput: formatIndianAmount(amount), oldAmount: amount });
  };

  const closeEdit = () => setEditDialog(null);

  const confirmEdit = async () => {
    if (!canEdit || !editDialog) return;
    const raw = parseIndianAmount(editDialog.amountInput);
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 0) {
      setFeedback({ kind: "error", message: "Enter a valid consultancy amount." });
      return;
    }
    try {
      await updateBranchService({
        branchServiceId: editDialog.id,
        branchId: branchIdNum,
        body: { price: String(n) },
      }).unwrap();
      closeEdit();
      setFeedback({
        kind: "success",
        message: `Consultancy fee updated to ${formatIndianCurrency(n)}.`,
      });
    } catch (e) {
      setFeedback({ kind: "error", message: rtkErrorMessage(e) });
    }
  };

  const otherParsed =
    otherAmountInput.trim() === "" ? null : parseInt(sanitizeAmountInput(otherAmountInput) || otherAmountInput, 10);
  const otherValid = otherAmountInput.trim() === "" || (otherParsed != null && Number.isFinite(otherParsed) && otherParsed >= 0);

  const hasNewPresetSelection = selectedPresetAmounts.some((v) => allowedPresetValues.has(v));
  const hasNewOther =
    otherAmountInput.trim() !== "" &&
    otherParsed != null &&
    Number.isFinite(otherParsed) &&
    otherParsed >= 0 &&
    !existingPriceSet.has(otherParsed);

  const addDisabled =
    isSubmitting ||
    mastersLoading ||
    !otherValid ||
    (!hasNewPresetSelection && !hasNewOther);

  const listLoading = !noBranch && (branchServicesLoading || branchServicesFetching);

  const masterPriceHint = useMemo(() => {
    if (consultancyMasters.length === 0) return "";
    const parts = consultancyMasters.map((m) => formatIndianCurrency(m.price));
    return parts.join(", ");
  }, [consultancyMasters]);

  return (
    <div className="flex gap-6 h-full">
      <div className={`flex flex-col transition-all duration-300 ${isPanelOpen ? "w-[80%]" : "w-full"}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Tooltip content="Back to Previous Page">
              <button
                type="button"
                onClick={onBack}
                className="cursor-pointer flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg hover:bg-green-100 transition-colors"
                aria-label="Back to Previous Page"
              >
                <svg className="h-5 w-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </Tooltip>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Branch Consultancy Service</h1>
              <p className="text-sm text-gray-500">{facilityName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {canAdd ? (
              <Tooltip content="Add Consultancy Fee">
                <Button
                  variant="primary"
                  size="small"
                  className="cursor-pointer"
                  onClick={handleAddOpen}
                  disabled={noBranch || mastersLoading}
                  leftIcon={
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  }
                >
                  Add Consultancy Fee
                </Button>
              </Tooltip>
            ) : null}
            {!isPanelOpen && (
              <Tooltip content="Open Configuration Summary">
                <button
                  type="button"
                  onClick={() => setIsPanelOpen(true)}
                  className="cursor-pointer flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-full bg-green-600 shadow-lg transition-all hover:bg-green-700"
                  aria-label="Open Configuration Summary"
                >
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </Tooltip>
            )}
          </div>
        </div>

        {noViewAccess ? (
          <div className="rounded-[12px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            You do not have permission to view consultancy services.
          </div>
        ) : noBranch ? (
          <div className="rounded-[12px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Open this page from a branch (with branch id) to manage consultancy fees.
          </div>
        ) : null}

        <div className="rounded-[12px] border border-gray-200 bg-white p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-1">About Consultancy Fees</h3>
          <p className="text-sm text-gray-700">
            Consultancy fees apply at branch level for doctor or clinical consultations. Standard amounts come from
            master consultancy services in Settings
            {masterPriceHint ? ` (${masterPriceHint})` : ""}. You can also add a custom rupee amount where the product
            allows it. Fees already linked to this branch are omitted from the picker.
          </p>
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold text-green-900">Consultancy Fees</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
              {branchConsultancyRows.length}
            </span>
          </div>

          {listLoading ? (
            <div className="flex justify-center py-16 text-sm text-gray-500">Loading consultancy fees…</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {branchConsultancyRows.map((row) => {
                  const amount = Number(row.price);
                  const displayAmount = Number.isFinite(amount) ? amount : 0;
                  return (
                    <div
                      key={row.id}
                      className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                            <RupeeCircleIcon className="h-5 w-5 text-green-700" />
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-gray-900">
                              {formatIndianCurrency(displayAmount)}
                            </h3>
                            <p className="text-xs text-gray-500 mt-0.5">Branch consultancy fee</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-2">
                        {canEdit ? (
                          <Tooltip content="Edit Consultancy Fee">
                            <Button
                              variant="outline"
                              size="small"
                              className="cursor-pointer"
                              onClick={() => openEdit(row.id, displayAmount)}
                            >
                              Edit
                            </Button>
                          </Tooltip>
                        ) : null}
                        {canDelete ? (
                          <Tooltip content="Delete Consultancy Fee">
                            <Button
                              variant="outline"
                              size="small"
                              onClick={() => openDelete(row.id, displayAmount)}
                              disabled={deleteConfirmId != null}
                              className="cursor-pointer text-red-600 border-red-200 hover:bg-red-50"
                              leftIcon={
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              }
                            >
                              Delete
                            </Button>
                          </Tooltip>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              {!noBranch && branchConsultancyRows.length === 0 && !listLoading && (
                <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-gray-200">
                  <RupeeCircleIcon className="h-16 w-16 text-gray-300 mb-4" />
                  <p className="text-sm text-gray-500 mb-4">No consultancy fees for this branch</p>
                  {canAdd ? (
                    <Button variant="primary" onClick={handleAddOpen} disabled={mastersLoading}>
                      Add Consultancy Fee
                    </Button>
                  ) : null}
                </div>
              )}
            </>
          )}
        </div>

        <Dialog open={showAddDialog} onClose={handleCloseAdd} title="Add Consultancy Fee" width={500} closeOnOutsideClick={false}>
          <div className="space-y-5">

            <FormSelectField
              label="Amount (₹)"
              mode="multiple"
              placeholder="Select amounts…"
              options={availablePresetOptions}
              value={selectedPresetAmounts}
              onChange={(vals) => setSelectedPresetAmounts(Array.isArray(vals) ? vals : vals ? [vals] : [])}
              emptyMessage="All master consultancy amounts are already added to this branch. Use “Another amount” below if needed."
              disabled={mastersLoading}
            />
            {/* <FormInputField
              label="Another amount (₹, optional)"
              placeholder="Leave blank if not needed"
              value={otherAmountInput}
              onChange={(e) => setOtherAmountInput(sanitizeAmountInput(e.target.value))}
              type="text"
              inputMode="numeric"
              // helperText="Whole rupees only. If it matches a master price, that master is used; otherwise the price is sent with a template master. Duplicates already on this branch are skipped."
            /> */}
            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={handleCloseAdd} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => void handleAddSubmit()} disabled={addDisabled}>
                {isSubmitting ? "Saving…" : "Add Consultancy Fee"}
              </Button>
            </div>
          </div>
        </Dialog>

        <Dialog open={editDialog != null} onClose={closeEdit} title="Edit Consultancy Fee" width={420} closeOnOutsideClick={false}>
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">Amount (₹)</label>
            <input
              value={editDialog?.amountInput ?? ""}
              onChange={(e) =>
                setEditDialog((prev) =>
                  prev ? { ...prev, amountInput: sanitizeAmountInput(e.target.value) } : prev,
                )
              }
              className="w-full rounded-[12px] border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-600"
              inputMode="numeric"
              placeholder="Enter amount"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={closeEdit}>Cancel</Button>
              <Button
                variant="primary"
                onClick={() => void confirmEdit()}
                disabled={!editDialog?.amountInput || isSubmitting}
              >
                Save
              </Button>
            </div>
          </div>
        </Dialog>
      </div>

      <ConfigurationSummaryPanel
        facilityName={facilityName}
        completionPercentage={configurationSummaryForPanel.completionPercentage}
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        buildings={configurationSummaryForPanel.buildings}
        floors={configurationSummaryForPanel.floors}
        totalRooms={configurationSummaryForPanel.totalRooms}
        configuredRooms={configurationSummaryForPanel.configuredRooms}
        incompleteRooms={configurationSummaryForPanel.incompleteRooms}
        lastModified={configurationSummaryForPanel.lastModified}
      />

      <MessageDialog
        open={deleteConfirmId != null}
        onClose={closeDelete}
        icon="/icons/transhExtraDarkIcon.svg"
        iconBgColor="#FFF8E1"
        message={
          deleteConfirmAmount != null
            ? `Remove consultancy fee of ${formatIndianCurrency(deleteConfirmAmount)} from this branch?`
            : ""
        }
        showCancel
        cancelText="Cancel"
        confirmText="Confirm"
        onCancel={closeDelete}
        onConfirm={() => void confirmDelete()}
        closeOnOutsideClick={false}
      />

      <MessageDialog
        open={feedback != null}
        onClose={closeFeedback}
        icon={feedback?.kind === "error" ? "/icons/ErrorIcon.svg" : "/icons/SuccessCheck.svg"}
        iconBgColor={feedback?.kind === "error" ? "#FFEBEE" : "#E8F5E9"}
        message={feedback?.message ?? ""}
        showCancel={false}
        confirmText="OK"
        onConfirm={closeFeedback}
      />
    </div>
  );
}

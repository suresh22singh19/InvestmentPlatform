"use client";

import React, { useMemo, useState } from "react";
import {
  Button,
  Dialog,
  FormSelectField,
  ConfigurationSummaryPanel,
  MessageDialog,
  Tooltip,
} from "@/components/ui";
import { useGetHardwareOrFacilitiesQuery } from "@/store/api/settingsApi";
import type { BranchHardwareFacilityKind } from "@/store/api/branchSetupApi";
import {
  useGetBranchHardwareFacilityByTypeQuery,
  useGetBranchHierarchyTreeQuery,
  useCreateBranchHardwareFacilityMutation,
  useDeleteBranchHardwareFacilityMutation,
} from "@/store/api/branchSetupApi";
import type { FacilityConfigurationSummarySnapshot } from "@/lib/types/facilityConfigurationSummary";
import { useFacilityConfigurationSummaryFromHierarchy } from "@/hooks/useFacilityConfigurationSummaryFromHierarchy";

const COPY: Record<
  BranchHardwareFacilityKind,
  {
    pageTitle: string;
    bannerTitle: string;
    bannerBody: string;
    sectionTitle: string;
    addLabel: string;
    addDialogTitle: string;
    addDescription: string;
    selectLabel: string;
    selectPlaceholder: string;
    submitLabel: string;
    loadingMasters: string;
    emptyMasters: string;
    emptyBranchTitle: string;
    emptyBranchCta: string;
    noBranchHint: string;
  }
> = {
  hardware: {
    pageTitle: "Hardware Master",
    bannerTitle: "About Hardware Master",
    bannerBody:
      "Attach hardware from the master list to this branch. These items are available when configuring rooms.",
    sectionTitle: "Hardware Items",
    addLabel: "Add Hardware",
    addDialogTitle: "Add Hardware",
    addDescription:
      "Select one or more hardware items from the master list to add to this branch.",
    selectLabel: "Hardware",
    selectPlaceholder: "Select hardware item(s)",
    submitLabel: "Add Hardware",
    loadingMasters: "Loading hardware list…",
    emptyMasters: "No hardware available to add (all may already be attached).",
    emptyBranchTitle: "No hardware items for this branch",
    emptyBranchCta: "Add Hardware",
    noBranchHint: "Open this page from a branch (with branch id) to manage hardware.",
  },
  facility: {
    pageTitle: "Facilities Master",
    bannerTitle: "About Facilities Master",
    bannerBody:
      "Attach facilities from the master list to this branch. These items are available when configuring rooms.",
    sectionTitle: "Facility Items",
    addLabel: "Add Facility",
    addDialogTitle: "Add Facility",
    addDescription:
      "Select one or more facilities from the master list to add to this branch.",
    selectLabel: "Facility",
    selectPlaceholder: "Select facility item(s)",
    submitLabel: "Add Facility",
    loadingMasters: "Loading facilities list…",
    emptyMasters: "No facilities available to add (all may already be attached).",
    emptyBranchTitle: "No facility items for this branch",
    emptyBranchCta: "Add Facility",
    noBranchHint: "Open this page from a branch (with branch id) to manage facilities.",
  },
};

type BranchHardwareFacilityMasterProps = {
  facilityName: string;
  branchId: number | null;
  canView?: boolean;
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  onBack: () => void;
  kind: BranchHardwareFacilityKind;
  configurationSummary?: FacilityConfigurationSummarySnapshot | null;
};

export function BranchHardwareFacilityMaster({
  facilityName,
  branchId,
  canView = true,
  canAdd = true,
  canEdit = true,
  canDelete = true,
  onBack,
  kind,
  configurationSummary = null,
}: BranchHardwareFacilityMasterProps) {
  const { data: hierarchyTreeRes } = useGetBranchHierarchyTreeQuery(branchId ?? 0, {
    skip: branchId == null || !canView,
  });
  const configurationSummaryForPanel = useFacilityConfigurationSummaryFromHierarchy(
    hierarchyTreeRes?.success && Array.isArray(hierarchyTreeRes.data) ? hierarchyTreeRes.data : undefined,
    configurationSummary,
  );

  const copy = COPY[kind];
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedMasterIds, setSelectedMasterIds] = useState<string[]>([]);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
  const [apiErrorMessage, setApiErrorMessage] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [editDialog, setEditDialog] = useState<{
    mappingId: number;
    oldName: string;
    oldMasterId: number;
    nextMasterId: string;
  } | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: branchListRes, isFetching: branchListLoading } = useGetBranchHardwareFacilityByTypeQuery(
    { branchId: branchId!, type: kind },
    { skip: branchId == null || !canView }
  );

  const { data: masterRes, isFetching: masterLoading } = useGetHardwareOrFacilitiesQuery(
    { type: kind, page: 1, limit: 100 },
    { skip: (!showAddDialog && editDialog == null) || branchId == null || !canView }
  );

  const [createMapping, { isLoading: creating }] = useCreateBranchHardwareFacilityMutation();
  const [deleteMapping] = useDeleteBranchHardwareFacilityMutation();

  const rows =
    branchId != null && branchListRes?.success && Array.isArray(branchListRes.data)
      ? branchListRes.data
      : [];

  const masterOptions = useMemo(() => {
    const masters =
      masterRes?.success && Array.isArray(masterRes.data) ? masterRes.data : [];
    const used = new Set(rows.map((r) => r.hardwareFacilityId));
    return masters
      .filter((m) => !used.has(m.id))
      .map((m) => ({
        value: String(m.id),
        label: m.name != null && String(m.name).trim() !== "" ? String(m.name) : String(m.id),
      }));
  }, [masterRes, rows]);

  const openApiError = (msg: string) => {
    setApiErrorMessage(msg);
    setShowApiErrorDialog(true);
  };

  const handleCloseAdd = () => {
    setShowAddDialog(false);
    setSelectedMasterIds([]);
  };

  const handleAddOpen = () => {
    if (!canAdd) return;
    setSelectedMasterIds([]);
    setShowAddDialog(true);
  };

  const handleSelectChange = (value: string | string[]) => {
    const arr = Array.isArray(value) ? value : value ? [value] : [];
    setSelectedMasterIds(arr);
  };

  const handleAddSubmit = async () => {
    if (!canAdd) return;
    if (branchId == null || selectedMasterIds.length === 0) return;

    const branchHardwareFacilities = selectedMasterIds.flatMap((idStr) => {
      const hardwareFacilityId = parseInt(idStr, 10);
      if (!Number.isFinite(hardwareFacilityId)) return [];
      return [{ branchId, hardwareFacilityId, type: kind }];
    });

    if (branchHardwareFacilities.length === 0) return;

    try {
      const res = await createMapping({ branchHardwareFacilities }).unwrap();
      if (res.success) {
        const dupRaw = res.data?.duplicateBranchHardwareFacilities;
        const dup = Array.isArray(dupRaw) ? dupRaw : [];
        const saved = res.data?.savedBranchHardwareFacilities?.length ?? 0;
        let msg =
          res.message ??
          (kind === "hardware"
            ? "Hardware / facility mapping(s) created successfully."
            : "Facility mapping(s) created successfully.");
        if (dup.length > 0) {
          msg +=
            saved > 0
              ? ` ${dup.length} item(s) were already on this branch (${dup.join(", ")}).`
              : ` None added; all selected items are already mapped (${dup.join(", ")}).`;
        }
        handleCloseAdd();
        setSuccessMessage(msg);
        setShowSuccessDialog(true);
        return;
      }
      openApiError(res.message ?? "Could not add item(s).");
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "data" in e
          ? String((e as { data?: { message?: string } }).data?.message ?? "Request failed.")
          : "Request failed.";
      openApiError(msg);
    }
  };

  const openDeleteConfirm = (mappingId: number, itemName: string) => {
    if (!canDelete) return;
    setDeleteConfirmId(mappingId);
    setDeleteConfirmName(itemName);
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirmId(null);
    setDeleteConfirmName("");
  };

  const handleDeleteConfirmed = async () => {
    if (!canDelete) return;
    const mappingId = deleteConfirmId;
    if (mappingId == null || branchId == null) return;
    closeDeleteConfirm();
    setDeletingId(mappingId);
    try {
      const res = await deleteMapping({ id: mappingId, branchId, type: kind }).unwrap();
      if (res.success) {
        setSuccessMessage(
          res.message ??
          (kind === "hardware"
            ? "Branch hardware facility mapping deleted successfully."
            : "Branch facility mapping deleted successfully.")
        );
        setShowSuccessDialog(true);
        return;
      }
      openApiError(res.message ?? "Delete failed.");
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "data" in e
          ? String((e as { data?: { message?: string } }).data?.message ?? "Request failed.")
          : "Request failed.";
      openApiError(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const noBranch = branchId == null;
  const noView = !canView;

  const editOptions = useMemo(() => {
    if (!editDialog) return [];
    const masters =
      masterRes?.success && Array.isArray(masterRes.data) ? masterRes.data : [];
    const used = new Set(rows.map((r) => r.hardwareFacilityId));
    return masters
      .filter((m) => m.id === editDialog.oldMasterId || !used.has(m.id))
      .map((m) => ({
        value: String(m.id),
        label: m.name != null && String(m.name).trim() !== "" ? String(m.name) : String(m.id),
      }));
  }, [editDialog, masterRes, rows]);

  const openEditDialog = (mappingId: number, oldMasterId: number, oldName: string) => {
    if (!canEdit) return;
    setEditDialog({
      mappingId,
      oldMasterId,
      oldName,
      nextMasterId: String(oldMasterId),
    });
  };

  const closeEditDialog = () => setEditDialog(null);

  const handleEditSubmit = async () => {
    if (!canEdit || !editDialog || branchId == null) return;
    const nextId = parseInt(editDialog.nextMasterId, 10);
    if (!Number.isFinite(nextId)) return;
    if (nextId === editDialog.oldMasterId) {
      closeEditDialog();
      return;
    }
    setEditingId(editDialog.mappingId);
    try {
      // No direct update endpoint for mapping; replace old mapping with new mapping.
      await deleteMapping({ id: editDialog.mappingId, branchId, type: kind }).unwrap();
      const res = await createMapping({
        branchHardwareFacilities: [{ branchId, hardwareFacilityId: nextId, type: kind }],
      }).unwrap();
      if (res.success) {
        closeEditDialog();
        setSuccessMessage(res.message ?? "Mapping updated successfully.");
        setShowSuccessDialog(true);
        return;
      }
      openApiError(res.message ?? "Could not update item.");
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "data" in e
          ? String((e as { data?: { message?: string } }).data?.message ?? "Request failed.")
          : "Request failed.";
      openApiError(msg);
    } finally {
      setEditingId(null);
    }
  };

  const GearIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );

  const StarIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
      />
    </svg>
  );

  const HeaderIcon = kind === "hardware" ? GearIcon : StarIcon;

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
              <h1 className="text-xl font-semibold text-gray-900">{copy.pageTitle}</h1>
              <p className="text-sm text-gray-500">{facilityName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {canAdd ? (
              <Tooltip content={copy.addLabel}>
                <Button
                  variant="primary"
                  size="small"
                  className="cursor-pointer"
                  onClick={handleAddOpen}
                  disabled={noBranch}
                  leftIcon={
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  }
                >
                  {copy.addLabel}
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

        {noView ? (
          <div className="rounded-[12px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            You do not have permission to view this page.
          </div>
        ) : noBranch ? (
          <div className="rounded-[12px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {copy.noBranchHint}
          </div>
        ) : null}

        <div className="rounded-[12px] border border-gray-200 bg-white p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-1">{copy.bannerTitle}</h3>
          <p className="text-sm text-gray-700">{copy.bannerBody}</p>
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-3 mb-4">
            <HeaderIcon className="h-5 w-5 text-green-700" />
            <h2 className="text-lg font-semibold text-green-900">{copy.sectionTitle}</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
              {branchListLoading ? "…" : rows.length}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rows.map((row) => {
              const name = row.hardwareFacility?.name ?? `Item #${row.hardwareFacilityId}`;
              return (
                <div
                  key={row.id}
                  className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <HeaderIcon className="h-5 w-5 text-green-700" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">{name}</h3>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canEdit ? (
                      <Tooltip content={`Edit ${kind === "hardware" ? "Hardware" : "Facility"}`}>
                        <Button
                          variant="outline"
                          size="small"
                          className="cursor-pointer"
                          onClick={() => openEditDialog(row.id, row.hardwareFacilityId, name)}
                          disabled={editingId === row.id}
                        >
                          {editingId === row.id ? "Saving..." : "Edit"}
                        </Button>
                      </Tooltip>
                    ) : null}
                    {canDelete ? (
                      <Tooltip content={`Delete ${kind === "hardware" ? "Hardware" : "Facility"}`}>
                        <Button
                          variant="outline"
                          size="small"
                          onClick={() => openDeleteConfirm(row.id, name)}
                          disabled={deletingId === row.id || deleteConfirmId != null}
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
                          className="cursor-pointer text-red-600 border-red-200 hover:bg-red-50"
                        >
                          {deletingId === row.id ? "Removing…" : "Delete"}
                        </Button>
                      </Tooltip>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {!branchListLoading && !noBranch && rows.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-gray-200">
              <HeaderIcon className="h-16 w-16 text-gray-300 mb-4" />
              <p className="text-sm text-gray-500 mb-4">{copy.emptyBranchTitle}</p>
              {canAdd ? (
                <Button variant="primary" onClick={handleAddOpen}>
                  {copy.emptyBranchCta}
                </Button>
              ) : null}
            </div>
          )}
        </div>

        <Dialog open={showAddDialog} onClose={handleCloseAdd} title={copy.addDialogTitle} width={500} closeOnOutsideClick={false}>
          <div className="space-y-5">
            <p className="text-sm text-gray-600">{copy.addDescription}</p>
            <FormSelectField
              mode="multiple"
              label={kind === "hardware" ? "Hardware*" : "Facilities*"}
              options={masterOptions}
              value={selectedMasterIds}
              onChange={handleSelectChange}
              placeholder={masterLoading ? copy.loadingMasters : copy.selectPlaceholder}
              disabled={masterLoading}
              emptyMessage={masterLoading ? copy.loadingMasters : copy.emptyMasters}
            />
            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={handleCloseAdd} disabled={creating}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => void handleAddSubmit()}
                disabled={creating || masterLoading || selectedMasterIds.length === 0}
              >
                {creating ? "Saving…" : copy.submitLabel}
              </Button>
            </div>
          </div>
        </Dialog>

        <Dialog open={editDialog != null} onClose={closeEditDialog} title={`Edit ${kind}`} width={460} closeOnOutsideClick={false}>
          {editDialog ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Current: <span className="font-medium text-gray-900">{editDialog.oldName}</span></p>
              <FormSelectField
                label={copy.selectLabel}
                options={editOptions}
                value={editDialog.nextMasterId}
                onChange={(value) => {
                  const v = typeof value === "string" ? value : value[0] ?? "";
                  setEditDialog((prev) => (prev ? { ...prev, nextMasterId: v } : prev));
                }}
                placeholder={masterLoading ? copy.loadingMasters : copy.selectPlaceholder}
                disabled={masterLoading || editOptions.length === 0}
                emptyMessage={masterLoading ? copy.loadingMasters : copy.emptyMasters}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={closeEditDialog} disabled={editingId != null}>Cancel</Button>
                <Button
                  variant="primary"
                  onClick={() => void handleEditSubmit()}
                  disabled={editingId != null || !editDialog.nextMasterId}
                >
                  {editingId != null ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          ) : null}
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
        onClose={closeDeleteConfirm}
        icon="/icons/transhExtraDarkIcon.svg"
        iconBgColor="#FFF8E1"
        message={`Are you sure you want to delete "${deleteConfirmName}"?`}
        showCancel
        cancelText="Cancel"
        confirmText="Confirm"
        onCancel={closeDeleteConfirm}
        onConfirm={() => void handleDeleteConfirmed()}
        closeOnOutsideClick={false}
      />

      <MessageDialog
        open={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        icon="/icons/SuccessCheck.svg"
        iconBgColor="#E8F5E9"
        message={successMessage}
        confirmText="Success"
        showCancel={false}
        onConfirm={() => setShowSuccessDialog(false)}
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
    </div>
  );
}

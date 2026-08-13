"use client";

import React, { useMemo, useState } from "react";
import {
  Button,
  Dialog,
  FormInputField,
  FormSelectField,
  ConfigurationSummaryPanel,
  MessageDialog,
  Tooltip,
} from "@/components/ui";
import { useGetAllRoomTypesQuery } from "@/store/api/settingsApi";
import {
  useGetBranchRoomTypesByBranchQuery,
  useGetBranchHierarchyTreeQuery,
  useCreateBranchRoomTypeMutation,
  useDeleteBranchRoomTypeMutation,
} from "@/store/api/branchSetupApi";
import type { FacilityConfigurationSummarySnapshot } from "@/lib/types/facilityConfigurationSummary";
import { useFacilityConfigurationSummaryFromHierarchy } from "@/hooks/useFacilityConfigurationSummaryFromHierarchy";
import { formatIndianAmount, formatIndianCurrency, parseIndianAmount } from "@/store/utils/formatIndianAmount";

type RoomTypeMasterProps = {
  facilityName: string;
  branchId: number | null;
  canView?: boolean;
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  onBack: () => void;
  configurationSummary?: FacilityConfigurationSummarySnapshot | null;
};

/** Up to 7 digits; first digit must be 1–9 (no leading zero). */
const ROOM_RENT_MAX_DIGITS = 7;
const ROOM_RENT_VALID = /^[1-9]\d{0,6}$/;

function sanitizeRoomRentInput(raw: string): string {
  const digitsOnly = raw.replace(/\D/g, "").slice(0, ROOM_RENT_MAX_DIGITS);
  if (digitsOnly.length === 0) return "";
  const noLeadingZeros = digitsOnly.replace(/^0+/, "");
  if (noLeadingZeros.length === 0) return "";
  return noLeadingZeros.slice(0, ROOM_RENT_MAX_DIGITS);
}

function isValidRoomRent(value: string): boolean {
  return ROOM_RENT_VALID.test(value);
}

const TagIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
    />
  </svg>
);

export const RoomTypeMaster = ({
  facilityName,
  branchId,
  canView = true,
  canAdd = true,
  canEdit = true,
  canDelete = true,
  onBack,
  configurationSummary = null,
}: RoomTypeMasterProps) => {
  const { data: hierarchyTreeRes } = useGetBranchHierarchyTreeQuery(branchId ?? 0, {
    skip: branchId == null || !canView,
  });
  const configurationSummaryForPanel = useFacilityConfigurationSummaryFromHierarchy(
    hierarchyTreeRes?.success && Array.isArray(hierarchyTreeRes.data) ? hierarchyTreeRes.data : undefined,
    configurationSummary,
  );

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedMasterIds, setSelectedMasterIds] = useState<string[]>([]);
  /** Rent input per master id (string key) — only used when that type is `isRented`. */
  const [roomRentByTypeId, setRoomRentByTypeId] = useState<Record<string, string>>({});
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
    roomtypeId: number;
    title: string;
    isRented: boolean;
    rentInput: string;
  } | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: branchListRes, isFetching: branchListLoading } = useGetBranchRoomTypesByBranchQuery(
    branchId!,
    { skip: branchId == null || !canView }
  );

  const { data: masterRes, isFetching: masterLoading } = useGetAllRoomTypesQuery(
    { page: 1, limit: 100 },
    { skip: !showAddDialog || branchId == null }
  );

  const [createMapping, { isLoading: creating }] = useCreateBranchRoomTypeMutation();
  const [deleteMapping] = useDeleteBranchRoomTypeMutation();

  const rows =
    branchId != null && branchListRes?.success && Array.isArray(branchListRes.data)
      ? branchListRes.data
      : [];

  const masters = useMemo(() => {
    return masterRes?.success && Array.isArray(masterRes.data) ? masterRes.data : [];
  }, [masterRes]);

  const masterOptions = useMemo(() => {
    const used = new Set(rows.map((r) => r.roomtypeId));
    return masters
      .filter((m) => !used.has(m.id))
      .map((m) => ({
        value: String(m.id),
        label: m.roomType?.trim() ? m.roomType : String(m.id),
      }));
  }, [masters, rows]);

  const selectedRentedEntries = useMemo(() => {
    return selectedMasterIds.flatMap((idStr) => {
      const id = parseInt(idStr, 10);
      if (!Number.isFinite(id)) return [];
      const m = masters.find((x) => x.id === id);
      if (!m || m.isRented !== true) return [];
      return [{ idStr, master: m }];
    });
  }, [selectedMasterIds, masters]);

  const openApiError = (msg: string) => {
    setApiErrorMessage(msg);
    setShowApiErrorDialog(true);
  };

  const handleCloseAdd = () => {
    setShowAddDialog(false);
    setSelectedMasterIds([]);
    setRoomRentByTypeId({});
  };

  const handleAddOpen = () => {
    if (!canAdd) return;
    setSelectedMasterIds([]);
    setRoomRentByTypeId({});
    setShowAddDialog(true);
  };

  const handleSelectChange = (value: string | string[]) => {
    const arr = Array.isArray(value) ? value : value ? [value] : [];
    setSelectedMasterIds(arr);
    setRoomRentByTypeId((prev) => {
      const next: Record<string, string> = {};
      for (const id of arr) {
        if (prev[id] !== undefined) next[id] = prev[id];
      }
      return next;
    });
  };

  const handleAddSubmit = async () => {
    if (!canAdd) return;
    if (branchId == null || selectedMasterIds.length === 0) return;

    const branchRoomTypes: { branchId: number; roomtypeId: number; roomRentPrice: number }[] = [];

    for (const idStr of selectedMasterIds) {
      const roomtypeId = parseInt(idStr, 10);
      if (!Number.isFinite(roomtypeId)) continue;
      const master = masters.find((m) => m.id === roomtypeId);
      if (!master) continue;

      const rented = master.isRented === true;
      let roomRentPrice = 0;
      if (rented) {
        const trimmed = parseIndianAmount(roomRentByTypeId[idStr] ?? "").trim();
        if (!isValidRoomRent(trimmed)) {
          const label = master.roomType?.trim() ? master.roomType : String(master.id);
          openApiError(
            `Room rent for "${label}" must be 1–7 digits only, starting with 1–9 (no leading zero).`
          );
          return;
        }
        roomRentPrice = parseInt(trimmed, 10);
      }

      branchRoomTypes.push({ branchId, roomtypeId, roomRentPrice: rented ? roomRentPrice : 0 });
    }

    if (branchRoomTypes.length === 0) return;

    try {
      const res = await createMapping({ branchRoomTypes }).unwrap();
      if (res.success) {
        const dup = res.data?.duplicateBranchRoomTypes;
        const saved = res.data?.savedBranchRoomTypes?.length ?? 0;
        let msg = res.message ?? "Branch room type mapping(s) created successfully.";
        if (dup && dup.length > 0) {
          msg +=
            saved > 0
              ? ` ${dup.length} type(s) were already on this branch (${dup.join(", ")}).`
              : ` None added; all selected types are already mapped (${dup.join(", ")}).`;
        }
        handleCloseAdd();
        setSuccessMessage(msg);
        setShowSuccessDialog(true);
        return;
      }
      openApiError(res.message ?? "Could not add room type(s).");
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
      const res = await deleteMapping({ id: mappingId, branchId }).unwrap();
      if (res.success) {
        setSuccessMessage(res.message ?? "Branch room type mapping deleted successfully.");
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

  const openEditDialog = (row: (typeof rows)[number]) => {
    if (!canEdit) return;
    const rt = row.roomType;
    const title = rt?.roomType ?? `Room type #${row.roomtypeId}`;
    const isRented = rt?.isRented === true;
    const rent = row.roomRentPrice ?? 0;
    setEditDialog({
      mappingId: row.id,
      roomtypeId: row.roomtypeId,
      title,
      isRented,
      rentInput: isRented && rent > 0 ? formatIndianAmount(rent) : "",
    });
  };

  const closeEditDialog = () => setEditDialog(null);

  const submitEditDialog = async () => {
    if (!canEdit || !editDialog || branchId == null) return;
    let roomRentPrice = 0;
    if (editDialog.isRented) {
      const trimmed = parseIndianAmount(editDialog.rentInput).trim();
      if (!isValidRoomRent(trimmed)) {
        openApiError(
          `Room rent for "${editDialog.title}" must be 1–7 digits only, starting with 1–9 (no leading zero).`,
        );
        return;
      }
      roomRentPrice = parseInt(trimmed, 10);
    }

    setEditingId(editDialog.mappingId);
    try {
      // No direct update API for branch-room-type mapping; replace mapping atomically in UI flow.
      await deleteMapping({ id: editDialog.mappingId, branchId }).unwrap();
      const createRes = await createMapping({
        branchRoomTypes: [{ branchId, roomtypeId: editDialog.roomtypeId, roomRentPrice }],
      }).unwrap();
      if (createRes.success) {
        closeEditDialog();
        setSuccessMessage(createRes.message ?? "Branch room type updated successfully.");
        setShowSuccessDialog(true);
      } else {
        openApiError(createRes.message ?? "Could not update room type.");
      }
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

  const addDisabled =
    creating ||
    masterLoading ||
    selectedMasterIds.length === 0 ||
    selectedRentedEntries.some(({ idStr }) => !isValidRoomRent((roomRentByTypeId[idStr] ?? "").trim()));

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
              <h1 className="text-xl font-semibold text-gray-900">Room Type Master</h1>
              <p className="text-sm text-gray-500">{facilityName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {canAdd ? (
              <Tooltip content="Add Room Type">
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
                  Add Room Type
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
            You do not have permission to view room types.
          </div>
        ) : noBranch ? (
          <div className="rounded-[12px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Open this page from a branch (with branch id) to manage room types.
          </div>
        ) : null}

        <div className="rounded-[12px] border border-gray-200 bg-white p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-1">About Room Types</h3>
          <p className="text-sm text-gray-700">
            Room types categorize rooms in your hospital. Add types from the master list to this branch. Rented
            room types let you set a rent amount used for billing reference.
          </p>
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold text-green-900">Room Types</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
              {branchListLoading ? "…" : rows.length}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rows.map((row) => {
              const rt = row.roomType;
              const title = rt?.roomType ?? `Room type #${row.roomtypeId}`;
              const rent = row.roomRentPrice ?? 0;
              const showRent = rt?.isRented === true || rent > 0;
              return (
                <div
                  key={row.id}
                  className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <TagIcon className="h-5 w-5 text-green-700" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold text-gray-900 break-words">{title}</h3>
                      </div>
                    </div>
                  </div>

                  {showRent ? (
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-sm text-gray-500">Rent:</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {formatIndianCurrency(rent)}
                      </span>
                    </div>
                  ) : null}

                  <div className="flex items-center gap-2">
                    {/* {canEdit ? (
                      <Tooltip content="Edit Room Type">
                        <Button
                          variant="outline"
                          size="small"
                          className="cursor-pointer"
                          onClick={() => openEditDialog(row)}
                          disabled={editingId === row.id}
                        >
                          {editingId === row.id ? "Saving…" : "Edit"}
                        </Button>
                      </Tooltip>
                    ) : null} */}
                    {canDelete ? (
                      <Tooltip content="Delete Room Type">
                        <Button
                          variant="outline"
                          size="small"
                          onClick={() => openDeleteConfirm(row.id, title)}
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
              <TagIcon className="h-16 w-16 text-gray-300 mb-4" />
              <p className="text-sm text-gray-500 mb-4">No room types for this branch</p>
              {canAdd ? (
                <Button variant="primary" onClick={handleAddOpen}>
                  Add Room Type
                </Button>
              ) : null}
            </div>
          )}
        </div>

        <Dialog open={showAddDialog} onClose={handleCloseAdd} title="Add Room Type" width={500} closeOnOutsideClick={false}>
          <div className="space-y-5">
            <p className="text-sm text-gray-600">
              Select one or more room types from the master list to add to this branch.
            </p>
            <FormSelectField
              mode="multiple"
              label="Room types*"
              options={masterOptions}
              value={selectedMasterIds}
              onChange={handleSelectChange}
              placeholder={masterLoading ? "Loading room types…" : "Select room type(s)"}
              disabled={masterLoading}
              emptyMessage={masterLoading ? "Loading room types…" : "No room types available to add."}
            />
            {selectedRentedEntries.length > 0 ? (
              <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50/80 p-3">
                <p className="text-xs font-medium text-gray-700">Rent (required for rented types)</p>
                {selectedRentedEntries.map(({ idStr, master }) => {
                  const label = master.roomType?.trim() ? master.roomType : String(master.id);
                  return (
                    <FormInputField
                      key={idStr}
                      label={`Room rent (₹) — ${label}*`}
                      placeholder="e.g. 5,000"
                      value={roomRentByTypeId[idStr] ?? ""}
                      onChange={(e) => {
                        const raw = parseIndianAmount(e.target.value).replace(/\D/g, "").slice(0, ROOM_RENT_MAX_DIGITS);
                        const noLeadingZero = raw.replace(/^0+/, "");
                        const formatted = noLeadingZero ? formatIndianAmount(noLeadingZero) : "";
                        setRoomRentByTypeId((prev) => ({
                          ...prev,
                          [idStr]: formatted,
                        }));
                      }}
                      helperText="Digits only, max 7; first digit 1–9 (no leading zero)."
                      type="text"
                      inputMode="numeric"
                      maxLength={11}
                    />
                  );
                })}
              </div>
            ) : null}
            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={handleCloseAdd} disabled={creating}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => void handleAddSubmit()}
                disabled={addDisabled}
              >
                {creating ? "Saving…" : "Add room type(s)"}
              </Button>
            </div>
          </div>
        </Dialog>

        <Dialog open={editDialog != null} onClose={closeEditDialog} title="Edit Room Type" width={480} closeOnOutsideClick={false}>
          {editDialog ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-700">
                {editDialog.title}
              </p>
              {editDialog.isRented ? (
                <FormInputField
                  label="Room rent (₹)*"
                  placeholder="e.g. 5,000"
                  value={editDialog.rentInput}
                  onChange={(e) => {
                    const raw = parseIndianAmount(e.target.value).replace(/\D/g, "").slice(0, ROOM_RENT_MAX_DIGITS);
                    const noLeadingZero = raw.replace(/^0+/, "");
                    const formatted = noLeadingZero ? formatIndianAmount(noLeadingZero) : "";
                    setEditDialog((prev) =>
                      prev ? { ...prev, rentInput: formatted } : prev,
                    );
                  }}
                  helperText="Digits only, max 7; first digit 1-9 (no leading zero)."
                  type="text"
                  inputMode="numeric"
                  maxLength={11}
                />
              ) : (
                <p className="text-xs text-gray-500">No editable rent for non-rented room types.</p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={closeEditDialog} disabled={editingId != null}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => void submitEditDialog()}
                  disabled={editingId != null || (editDialog.isRented && !isValidRoomRent(parseIndianAmount(editDialog.rentInput).trim()))}
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
};

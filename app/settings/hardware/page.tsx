"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
  Button,
  Dialog,
  FormInputField,
  TableSearchInput,
  Pagination,
  PanelCard,
  MessageDialog,
} from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import {
  useGetHardwareOrFacilitiesQuery,
  useCreateHardwareOrFacilitiesMutation,
  useUpdateHardwareOrFacilitiesMutation,
  useDeleteHardwareOrFacilitiesMutation,
} from "@/store/api/settingsApi";
import { useDebounce } from "@/hooks/useDebounce";
import { usePermission } from "@/hooks/usePermission";

const HARDWARE_FACILITIES_TYPE = "hardware" as const;

type RowItem = {
  id: number;
  name: string;
  status: "Active" | "Inactive";
  isDefaultPanel: boolean;
};

const STORAGE_KEY = "hardware-master-page-state";

type StoredState = {
  searchTerm: string;
  currentPage: number;
  itemsPerPage: number;
};

const loadState = (): StoredState => {
  if (typeof window === "undefined") {
    return {
      searchTerm: "",
      currentPage: 1,
      itemsPerPage: 10,
    };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.itemsPerPage < 10) {
        parsed.itemsPerPage = 10;
      }
      return parsed;
    }
  } catch (error) {
    console.error("Failed to load state from localStorage:", error);
  }

  return {
    searchTerm: "",
    currentPage: 1,
    itemsPerPage: 10,
  };
};

const saveState = (state: StoredState) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save state to localStorage:", error);
  }
};

export default function HardwarePage() {
  const hardwarePermission = usePermission("settings", { subModule: "hardware" });
  const canView = hardwarePermission.canView;
  const canAdd = hardwarePermission.canAdd;
  const canEdit = hardwarePermission.canEdit;
  const canDelete = hardwarePermission.canDelete;

  const [searchTerm, setSearchTerm] = useState<string>(() => loadState().searchTerm);
  const [currentPage, setCurrentPage] = useState<number>(() => loadState().currentPage);
  const [itemsPerPage, setItemsPerPage] = useState<number>(() => loadState().itemsPerPage);
  const [dialogMode, setDialogMode] = useState<"add" | "edit" | "view" | null>(null);
  const [selectedRow, setSelectedRow] = useState<RowItem | null>(null);
  const [formValues, setFormValues] = useState({ name: "" });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
  const [apiErrorMessage, setApiErrorMessage] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<RowItem | null>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const trimmedSearchTerm = debouncedSearchTerm.trim();
  const searchParam = trimmedSearchTerm || undefined;

  useEffect(() => {
    saveState({
      searchTerm,
      currentPage,
      itemsPerPage,
    });
  }, [searchTerm, currentPage, itemsPerPage]);

  const { data: listData, isLoading: isLoadingList, refetch: refetchList } =
    useGetHardwareOrFacilitiesQuery(
      {
        type: HARDWARE_FACILITIES_TYPE,
        page: currentPage,
        limit: itemsPerPage,
        search: searchParam,
      },
      { skip: !canView }
    );

  const [createItem, { isLoading: isCreating }] = useCreateHardwareOrFacilitiesMutation();
  const [updateItem, { isLoading: isUpdating }] = useUpdateHardwareOrFacilitiesMutation();
  const [deleteItem, { isLoading: isDeleting }] = useDeleteHardwareOrFacilitiesMutation();

  const rows: RowItem[] =
    listData?.data?.map((item) => ({
      id: item.id,
      name: item.name,
      status: "Active" as const,
      isDefaultPanel: false,
    })) ?? [];

  const filteredRows = rows;
  const paginatedRows = rows;

  const handleAddNew = () => {
    if (!canAdd) return;
    setFormValues({ name: "" });
    setFormErrors({});
    setSelectedRow(null);
    setDialogMode("add");
  };

  const handleEdit = (row: RowItem) => {
    if (!canEdit) return;
    setSelectedRow(row);
    setFormValues({ name: row.name });
    setFormErrors({});
    setDialogMode("edit");
  };

  const handleView = (row: RowItem) => {
    if (!canView) return;
    setSelectedRow(row);
    setFormValues({ name: row.name });
    setFormErrors({});
    setDialogMode("view");
  };

  const handleDelete = (row: RowItem) => {
    if (!canDelete) return;
    setItemToDelete(row);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const result = await deleteItem({ id: itemToDelete.id }).unwrap();
      setSuccessMessage(result?.message || "Hardware deleted successfully");
      setShowSuccessDialog(true);
      setShowDeleteConfirm(false);
      setItemToDelete(null);
      await refetchList();
    } catch (error: any) {
      console.error("Failed to delete hardware:", error);
      let errorMsg = "Failed to delete hardware. Please try again.";
      if (error?.data?.message) {
        errorMsg = error.data.message;
      } else if (error?.data?.error) {
        errorMsg = error.data.error;
      } else if (error?.error) {
        errorMsg = error.error;
      } else if (error?.message) {
        errorMsg = error.message;
      }
      setApiErrorMessage(errorMsg);
      setShowApiErrorDialog(true);
      setShowDeleteConfirm(false);
      setItemToDelete(null);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formValues.name.trim()) {
      errors.name = "Name is required";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dialogMode === "add" && !canAdd) return;
    if (dialogMode === "edit" && !canEdit) return;

    if (!validateForm()) {
      return;
    }

    try {
      let result;

      if (dialogMode === "add") {
        result = await createItem({
          name: formValues.name.trim(),
          hardwareFacilitiesType: HARDWARE_FACILITIES_TYPE,
        }).unwrap();
        setSuccessMessage(result?.message || "Hardware created successfully");
      } else if (dialogMode === "edit" && selectedRow) {
        result = await updateItem({
          id: selectedRow.id,
          name: formValues.name.trim(),
          hardwareFacilitiesType: HARDWARE_FACILITIES_TYPE,
        }).unwrap();
        setSuccessMessage(result?.message || "Hardware updated successfully");
      }

      setShowSuccessDialog(true);
      await refetchList();

      setDialogMode(null);
      setFormValues({ name: "" });
      setFormErrors({});
      setSelectedRow(null);
    } catch (error: any) {
      console.error(`Failed to ${dialogMode === "add" ? "create" : "update"} hardware:`, error);

      let errorMsg = `Failed to ${dialogMode === "add" ? "create" : "update"} hardware. Please try again.`;

      if (error?.data?.message) {
        errorMsg = error.data.message;
      } else if (error?.data?.error) {
        errorMsg = error.data.error;
      } else if (error?.error) {
        errorMsg = error.error;
      } else if (error?.message) {
        errorMsg = error.message;
      }

      setApiErrorMessage(errorMsg);
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

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <PageHeading title="Hardware Master" />
        </div>

        <ListBorder as="section" className="px-4 py-4">
          {!canView ? (
            <div className="rounded-[20px] border border-[#E3EEE1] bg-white px-6 py-10 text-center text-sm text-[#9CA3AF]">
              You don&apos;t have permission to view hardware.
            </div>
          ) : (
            <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold leading-[120%] text-[#434956]"></h2>

                <div className="flex items-center gap-3">
                  <TableSearchInput
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="Search Here..."
                  />
                  {canAdd ? (
                    <button
                      type="button"
                      className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] whitespace-nowrap whitespace-nowrap"
                      onClick={handleAddNew}
                    >
                      <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                      <span className="text-hide">Add Hardware</span>
                    </button>
                  ) : null}
                </div>
              </div>

              {isLoadingList ? (
                <div className="py-12 text-center text-sm text-[#9CA3AF]">Loading...</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                    {paginatedRows.map((row) => (
                      <PanelCard
                        key={row.id}
                        id={row.id}
                        name={row.name}
                        status={row.status}
                        isDefaultPanel={row.isDefaultPanel}
                        showStatusBadge={false}
                        variant="view-edit-delete"
                        showViewButton={canView}
                        showEditButton={canEdit}
                        onView={() => handleView(row)}
                        onEdit={() => handleEdit(row)}
                        onDelete={canDelete ? () => handleDelete(row) : undefined}
                      />
                    ))}
                  </div>

                  {filteredRows.length === 0 && (
                    <div className="py-12 text-center text-sm text-[#9CA3AF]">No hardware found</div>
                  )}
                </>
              )}

              {!isLoadingList && (listData?.total ?? filteredRows.length) > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalItems={listData?.total ?? filteredRows.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={handlePageChange}
                  onItemsPerPageChange={handleItemsPerPageChange}
                  itemsPerPageOptions={[10, 20, 50, 100]}
                />
              )}
            </div>
          )}
        </ListBorder>
      </div>

      <Dialog
        open={
          (dialogMode === "add" && canAdd) ||
          (dialogMode === "edit" && canEdit) ||
          (dialogMode === "view" && canView)
        }
        onClose={() => {
          setDialogMode(null);
          setFormErrors({});
          setSelectedRow(null);
        }}
        title={dialogMode === "add" ? "Add Hardware" : dialogMode === "view" ? "View Hardware" : "Edit Hardware"}
        width={686}
        closeOnOutsideClick={false}
      >
        <form onSubmit={dialogMode === "view" ? (e) => e.preventDefault() : handleSubmit} className="space-y-6">
          <div className="space-y-6">
            <div>
              <FormInputField
                label="Name *"
                value={formValues.name}
                onChange={(event) => {
                  if (dialogMode === "view") return;
                  let value = event.target.value.replace(/[^a-zA-Z\s]/g, "");
                  value = value.replace(/^\s+/, "");
                  value = value.replace(/(.)\1{2,}/g, "$1$1");
                  if (value.length > 0) {
                    value = value.charAt(0).toUpperCase() + value.slice(1);
                  }
                  value = value.slice(0, 100);
                  setFormValues((prev) => ({ ...prev, name: value }));
                  setFormErrors((prev) => ({ ...prev, name: "" }));
                }}
                height={44}
                placeholder="Name"
                maxLength={100}
                required={dialogMode !== "view"}
                disabled={dialogMode === "view"}
                error={formErrors.name}
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
                  setFormErrors({});
                  setSelectedRow(null);
                }}
              >
                Close
              </Button>
            ) : (
              <>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isCreating || isUpdating}
                  disabled={isCreating || isUpdating}
                >
                  {dialogMode === "add" ? "Save" : "Update"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogMode(null);
                    setFormErrors({});
                    setSelectedRow(null);
                  }}
                  disabled={isCreating || isUpdating}
                >
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
        confirmText="Success"
        showCancel={false}
        onConfirm={() => {
          setShowSuccessDialog(false);
        }}
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

      <MessageDialog
        open={showDeleteConfirm}
        onClose={() => {
          if (isDeleting) return;
          setShowDeleteConfirm(false);
          setItemToDelete(null);
        }}
        closeOnOutsideClick={false}
        icon="/icons/transhExtraDarkIcon.svg"
        iconBgColor="#FFEBEE"
        message={
          itemToDelete ? (
            <span>
              Are you sure you want to delete this hardware?

            </span>
          ) : (
            ""
          )
        }
        confirmText="Confirm"
        cancelText="Cancel"
        showCancel={true}
        isActionLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setItemToDelete(null);
        }}
      />
    </AppShell>
  );
}

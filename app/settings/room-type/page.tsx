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
  Toggle,
} from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import {
  useGetAllRoomTypesQuery,
  useCreateRoomTypeMutation,
  useUpdateRoomTypeMutation,
  useDeleteRoomTypeMutation,
} from "@/store/api/settingsApi";
import { useDebounce } from "@/hooks/useDebounce";
import { usePermission } from "@/hooks/usePermission";

type RoomTypeRow = {
  id: number;
  roomType: string;
  roomTypeCode: string;
  roomNumberPrefix: string;
  isRented: boolean;
};

type CardRow = {
  id: number;
  name: string;
  status: "Active" | "Inactive";
  room: RoomTypeRow;
};

const STORAGE_KEY = "room-type-page-state";

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
      return {
        ...parsed,
        currentPage: 1, // Always reset to page 1 when navigating to this screen
      };
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

/**
 * Derive `roomTypeCode` (lowercase kebab-case) and `roomNumberPrefix` from the display name.
 * Examples: "IPD Test User" → code "ipd-test-user"; "The - Deluxe Room" → "the-deluxe-room".
 */
function deriveRoomTypeCodes(roomType: string): { roomTypeCode: string; roomNumberPrefix: string } {
  const slug = roomType
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s\-]/g, "")
    .replace(/[\s\-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const roomTypeCode = (slug.length > 0 ? slug : "room").slice(0, 120);
  /** Uppercase version of the same segments (for room number prefix / legacy consumers). */
  const roomNumberPrefix = roomTypeCode.toUpperCase().slice(0, 25);
  return { roomTypeCode, roomNumberPrefix };
}

export default function RoomTypePage() {
  const roomTypePermission = usePermission("settings", { subModule: "room-type-master" });
  const canView = roomTypePermission.canView;
  const canAdd = roomTypePermission.canAdd;
  const canEdit = roomTypePermission.canEdit;
  const canDelete = roomTypePermission.canDelete;

  const [searchTerm, setSearchTerm] = useState<string>(() => loadState().searchTerm);
  const [currentPage, setCurrentPage] = useState<number>(() => loadState().currentPage);
  const [itemsPerPage, setItemsPerPage] = useState<number>(() => loadState().itemsPerPage);
  const [dialogMode, setDialogMode] = useState<"add" | "edit" | "view" | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomTypeRow | null>(null);
  const [formValues, setFormValues] = useState({
    roomType: "",
    isRented: false,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
  const [apiErrorMessage, setApiErrorMessage] = useState("");

  const [itemToDelete, setItemToDelete] = useState<RoomTypeRow | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  const { data: listData, isLoading: isLoadingList, refetch: refetchList } = useGetAllRoomTypesQuery(
    {
      page: currentPage,
      limit: itemsPerPage,
      search: searchParam,
    },
    { skip: !canView }
  );

  const [createRoomType, { isLoading: isCreating }] = useCreateRoomTypeMutation();
  const [updateRoomType, { isLoading: isUpdating }] = useUpdateRoomTypeMutation();
  const [deleteRoomType, { isLoading: isDeleting }] = useDeleteRoomTypeMutation();

  const handleDelete = (room: RoomTypeRow) => {
    if (!canDelete) return;
    setItemToDelete(room);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const result = await deleteRoomType({ id: itemToDelete.id }).unwrap();
      setSuccessMessage(result?.message || "Room type deleted successfully");
      setShowSuccessDialog(true);
      setShowDeleteConfirm(false);
      setItemToDelete(null);
      await refetchList();
    } catch (error: any) {
      console.error("Failed to delete room type:", error);
      let errorMsg = "Failed to delete room type. Please try again.";
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

  const cardRows: CardRow[] =
    listData?.data?.map((item) => ({
      id: item.id,
      name: item.roomType,
      status: item.isRented ? "Active" : "Inactive",
      room: {
        id: item.id,
        roomType: item.roomType,
        roomTypeCode: item.roomTypeCode,
        roomNumberPrefix: item.roomNumberPrefix,
        isRented: item.isRented,
      },
    })) ?? [];

  const handleAddNew = () => {
    if (!canAdd) return;
    setFormValues({
      roomType: "",
      isRented: false,
    });
    setFormErrors({});
    setSelectedRoom(null);
    setDialogMode("add");
  };

  const openForm = (room: RoomTypeRow, mode: "edit" | "view") => {
    if (mode === "edit" && !canEdit) return;
    if (mode === "view" && !canView) return;
    setSelectedRoom(room);
    setFormValues({
      roomType: room.roomType,
      isRented: room.isRented,
    });
    setFormErrors({});
    setDialogMode(mode);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formValues.roomType.trim()) {
      errors.roomType = "Room type is required";
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

      const trimmedType = formValues.roomType.trim();
      const { roomTypeCode, roomNumberPrefix } = deriveRoomTypeCodes(trimmedType);

      if (dialogMode === "add") {
        result = await createRoomType({
          roomType: trimmedType,
          roomTypeCode,
          roomNumberPrefix,
          isRented: formValues.isRented,
        }).unwrap();
        setSuccessMessage(result?.message || "Room type created successfully");
      } else if (dialogMode === "edit" && selectedRoom) {
        result = await updateRoomType({
          id: selectedRoom.id,
          roomType: trimmedType,
          roomTypeCode,
          roomNumberPrefix,
          isRented: formValues.isRented,
        }).unwrap();
        setSuccessMessage(result?.message || "Room type updated successfully");
      }

      setShowSuccessDialog(true);
      await refetchList();

      setDialogMode(null);
      setFormValues({
        roomType: "",
        isRented: false,
      });
      setFormErrors({});
      setSelectedRoom(null);
    } catch (error: any) {
      console.error(`Failed to ${dialogMode === "add" ? "create" : "update"} room type:`, error);

      let errorMsg = `Failed to ${dialogMode === "add" ? "create" : "update"} room type. Please try again.`;

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

  const formDisabled = dialogMode === "view";

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <PageHeading title="Room Type Master" />
        </div>

        <ListBorder as="section" className="px-4 py-4">
          {!canView ? (
            <div className="rounded-[20px] border border-[#E3EEE1] bg-white px-6 py-10 text-center text-sm text-[#9CA3AF]">
              You don&apos;t have permission to view room type.
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
                    className="!w-[300px] min-w-[300px] max-w-[300px] shrink-0"
                  />

                  {canAdd ? (
                    <button
                      type="button"
                      className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] whitespace-nowrap whitespace-nowrap"
                      onClick={handleAddNew}
                    >
                      <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                      <span className="text-hide">Add Room Type</span>
                    </button>
                  ) : null}
                </div>
              </div>

              {isLoadingList ? (
                <div className="py-12 text-center text-sm text-[#9CA3AF]">Loading...</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                    {cardRows.map((row) => (
                      <PanelCard
                        key={row.id}
                        id={row.id}
                        name={row.name}
                        status={row.status}
                        isDefaultPanel={false}
                        statusBadgeVariant="chargeable"
                        statusYesNoTooltips={{ yes: "Rented", no: "Not Rented" }}
                        variant="view-edit-delete"
                        onView={() => openForm(row.room, "view")}
                        onEdit={() => openForm(row.room, "edit")}
                        onDelete={canDelete ? () => handleDelete(row.room) : undefined}
                        showViewButton={canView}
                        showEditButton={canEdit}
                      />
                    ))}
                  </div>

                  {cardRows.length === 0 && (
                    <div className="py-12 text-center text-sm text-[#9CA3AF]">No room types found</div>
                  )}
                </>
              )}

              {!isLoadingList && (listData?.total ?? cardRows.length) > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalItems={listData?.total ?? cardRows.length}
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
          setSelectedRoom(null);
        }}
        title={dialogMode === "add" ? "Add Room Type" : dialogMode === "edit" ? "Edit Room Type" : "View Room Type"}
        width={686}
        closeOnOutsideClick={false}
      >
        <form onSubmit={dialogMode !== "view" ? handleSubmit : (e) => e.preventDefault()} className="space-y-6">
          <div className="space-y-6">
            <div>
              <FormInputField
                label="Room type *"
                value={formValues.roomType}
                onChange={(event) => {
                  if (formDisabled) return;
                  let value = event.target.value.replace(/[^a-zA-Z0-9\s\-]/g, "");
                  value = value.replace(/^\s+/, "");
                  value = value.replace(/(.)\1{2,}/g, "$1$1");
                  if (value.length > 0) {
                    value = value.charAt(0).toUpperCase() + value.slice(1);
                  }
                  value = value.slice(0, 100);
                  setFormValues((prev) => ({ ...prev, roomType: value }));
                  setFormErrors((prev) => ({ ...prev, roomType: "" }));
                }}
                height={44}
                placeholder="e.g. IPD - Ward"
                maxLength={100}
                required={dialogMode !== "view"}
                disabled={formDisabled}
                error={formErrors.roomType}
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-[12px] bg-white px-4">
              <span className="text-sm font-medium leading-[120%] text-[#434956]">Is Chargeable</span>
              <Toggle
                checked={formValues.isRented}
                onChange={(checked) => setFormValues((prev) => ({ ...prev, isRented: checked }))}
                disabled={formDisabled}
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
                  setSelectedRoom(null);
                }}
              >
                Close
              </Button>
            ) : (
              <>
                <Button type="submit" variant="primary" isLoading={isCreating || isUpdating} disabled={isCreating || isUpdating}>
                  {dialogMode === "add" ? "Add Room Type" : "Update"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogMode(null);
                    setFormErrors({});
                    setSelectedRoom(null);
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
              Are you sure you want to delete this room type?
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

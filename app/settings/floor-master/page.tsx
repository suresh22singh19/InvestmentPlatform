"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
    Button,
    Dialog,
    FormInputField,
    FormSelectField,
    FormTextareaField,
    TableSearchInput,
    Pagination,
    PanelCard,
    MessageDialog,
    Toggle,
} from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import {
    useGetAllFloorMastersQuery,
    useCreateFloorMasterMutation,
    useUpdateFloorMasterMutation,
    useDeleteFloorMasterMutation,
    type FloorMasterItem,
} from "@/store/api/settingsApi";
import { useDebounce } from "@/hooks/useDebounce";
import { usePermission } from "@/hooks/usePermission";

const FLOOR_CODE_OPTIONS: { label: string; value: string }[] = [
    { label: "B2 (Basement 2)", value: "-2" },
    { label: "B1 (Basement 1)", value: "-1" },
    { label: "GF (Ground Floor)", value: "0" },
    ...Array.from({ length: 25 }, (_, i) => {
        const num = i + 1;
        let suffix = "th";
        if (num === 1) suffix = "st";
        else if (num === 2) suffix = "nd";
        else if (num === 3) suffix = "rd";
        return {
            label: `F${num} (${num}${suffix} Floor)`,
            value: String(num),
        };
    }),
];

const STORAGE_KEY = "floor-master-page-state";

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

export default function FloorMasterPage() {
    const floorPermission = usePermission("settings", { subModule: "floor-master" });
    const canView = floorPermission.canView;
    const canAdd = floorPermission.canAdd;
    const canEdit = floorPermission.canEdit;
    const canDelete = floorPermission.canDelete;

    const [searchTerm, setSearchTerm] = useState<string>(() => loadState().searchTerm);
    const [currentPage, setCurrentPage] = useState<number>(() => loadState().currentPage);
    const [itemsPerPage, setItemsPerPage] = useState<number>(() => loadState().itemsPerPage);
    const [dialogMode, setDialogMode] = useState<"add" | "edit" | "view" | null>(null);
    const [selectedFloor, setSelectedFloor] = useState<FloorMasterItem | null>(null);
    const [formValues, setFormValues] = useState({
        floor: "",
        floorNumber: "",
        description: "",
        isActive: true,
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
    const [apiErrorMessage, setApiErrorMessage] = useState("");

    const [itemToDelete, setItemToDelete] = useState<FloorMasterItem | null>(null);
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

    const { data: listData, isLoading: isLoadingList, refetch: refetchList } = useGetAllFloorMastersQuery(
        {
            page: currentPage,
            limit: itemsPerPage,
            search: searchParam,
            sortBy: "floorNumber",
            order: "ASC",
        },
        { skip: !canView }
    );

    const [createFloorMaster, { isLoading: isCreating }] = useCreateFloorMasterMutation();
    const [updateFloorMaster, { isLoading: isUpdating }] = useUpdateFloorMasterMutation();
    const [deleteFloorMaster, { isLoading: isDeleting }] = useDeleteFloorMasterMutation();

    const isSubmitting = isCreating || isUpdating || isDeleting;

    const handleDelete = (floor: FloorMasterItem) => {
        if (!canDelete) return;
        setItemToDelete(floor);
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            const result = await deleteFloorMaster({ id: itemToDelete.id }).unwrap();
            setSuccessMessage(result?.message || "Floor deleted successfully");
            setShowSuccessDialog(true);
            setShowDeleteConfirm(false);
            setItemToDelete(null);
            await refetchList();
        } catch (error: any) {
            console.error("Failed to delete floor master:", error);
            let errorMsg = "Failed to delete floor. Please try again.";
            if (error?.data?.message) {
                errorMsg = Array.isArray(error.data.message) ? error.data.message.join(", ") : error.data.message;
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

    const handleAddNew = () => {
        if (!canAdd) return;
        setFormValues({
            floor: "",
            floorNumber: "",
            description: "",
            isActive: true,
        });
        setFormErrors({});
        setSelectedFloor(null);
        setDialogMode("add");
    };

    const openForm = (item: FloorMasterItem, mode: "edit" | "view") => {
        if (mode === "edit" && !canEdit) return;
        if (mode === "view" && !canView) return;
        setSelectedFloor(item);
        setFormValues({
            floor: item.floor || "",
            floorNumber: item.floorNumber !== undefined && item.floorNumber !== null ? String(item.floorNumber) : "",
            description: item.description || "",
            isActive: item.isActive ?? true,
        });
        setFormErrors({});
        setDialogMode(mode);
    };

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};
        if (!formValues.floor.trim()) {
            errors.floor = "Floor name is required";
        }
        if (formValues.floorNumber.trim() === "") {
            errors.floorNumber = "Floor number is required";
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
            const trimmedFloor = formValues.floor.trim();
            const parsedNum = parseInt(formValues.floorNumber.trim(), 10);
            const floorNum = isNaN(parsedNum) ? 0 : parsedNum;
            const desc = formValues.description.trim();

            if (dialogMode === "add") {
                result = await createFloorMaster({
                    floor: trimmedFloor,
                    floorNumber: floorNum,
                    description: desc,
                    isActive: formValues.isActive,
                }).unwrap();
                setSuccessMessage(result?.message || "Floor created successfully");
            } else if (dialogMode === "edit" && selectedFloor) {
                result = await updateFloorMaster({
                    id: selectedFloor.id,
                    floor: trimmedFloor,
                    floorNumber: floorNum,
                    description: desc,
                    isActive: formValues.isActive,
                }).unwrap();
                setSuccessMessage(result?.message || "Floor updated successfully");
            }

            setShowSuccessDialog(true);
            await refetchList();

            setDialogMode(null);
            setFormValues({
                floor: "",
                floorNumber: "",
                description: "",
                isActive: true,
            });
            setFormErrors({});
            setSelectedFloor(null);
        } catch (error: any) {
            console.error(`Failed to ${dialogMode === "add" ? "create" : "update"} floor master:`, error);
            let errorMsg = `Failed to ${dialogMode === "add" ? "create" : "update"} floor master. Please try again.`;

            if (error?.data?.message) {
                errorMsg = Array.isArray(error.data.message) ? error.data.message.join(", ") : error.data.message;
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
    const cardRows = listData?.data ?? [];

    return (
        <AppShell>
            <div className="space-y-8">
                <div className="flex items-start justify-between">
                    <PageHeading title="Floor Master" />
                </div>

                <ListBorder as="section" className="px-4 py-4">
                    {!canView ? (
                        <div className="rounded-[20px] border border-[#E3EEE1] bg-white px-6 py-10 text-center text-sm text-[#9CA3AF]">
                            You don&apos;t have permission to view floor master.
                        </div>
                    ) : (
                        <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
                            <div className="mb-6 flex items-center justify-end gap-3">
                                <TableSearchInput
                                    value={searchTerm}
                                    onChange={setSearchTerm}
                                    placeholder="Search Here..."
                                    className="!w-[300px] min-w-[300px] max-w-[300px] shrink-0"
                                />

                                {canAdd ? (
                                    <button
                                        type="button"
                                        className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] whitespace-nowrap"
                                        onClick={handleAddNew}
                                    >
                                        <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                                        <span>Add Floor</span>
                                    </button>
                                ) : null}
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
                                                name={row.floor}
                                                status={row.isActive ? "Active" : "Inactive"}
                                                isDefaultPanel={false}
                                                statusBadgeVariant="standard"
                                                variant="view-edit-delete"
                                                onView={() => openForm(row, "view")}
                                                onEdit={() => openForm(row, "edit")}
                                                onDelete={canDelete ? () => handleDelete(row) : undefined}
                                                showViewButton={canView}
                                                showEditButton={canEdit}
                                            />
                                        ))}
                                    </div>

                                    {cardRows.length === 0 && (
                                        <div className="py-12 text-center text-sm text-[#9CA3AF]">No floors found</div>
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
                    setSelectedFloor(null);
                }}
                title={dialogMode === "add" ? "Add Floor Master" : dialogMode === "edit" ? "Edit Floor Master" : "View Floor Details"}
                width={686}
                closeOnOutsideClick={false}
            >
                <form onSubmit={dialogMode !== "view" ? handleSubmit : (e) => e.preventDefault()} className="space-y-6">
                    <div className="space-y-6">
                        <div>
                            <FormInputField
                                label="Floor *"
                                value={formValues.floor}
                                onChange={(event) => {
                                    if (formDisabled) return;
                                    let value = event.target.value.replace(/[^a-zA-Z0-9\s\-]/g, "");
                                    value = value.replace(/^\s+/, "");
                                    value = value.replace(/(.)\1{2,}/g, "$1$1");
                                    if (value.length > 0) {
                                        value = value.charAt(0).toUpperCase() + value.slice(1);
                                    }
                                    value = value.slice(0, 50);
                                    setFormValues((prev) => ({ ...prev, floor: value }));
                                    setFormErrors((prev) => ({ ...prev, floor: "" }));
                                }}
                                height={44}
                                placeholder="e.g. Ground Floor"
                                maxLength={50}
                                required={dialogMode !== "view"}
                                disabled={formDisabled}
                                error={formErrors.floor}
                            />
                        </div>

                        <div>
                            <FormSelectField
                                label="Floor Code *"
                                options={FLOOR_CODE_OPTIONS}
                                background={"white"}
                                value={formValues.floorNumber}
                                onChange={(val) => {
                                    if (formDisabled || dialogMode === "edit") return;
                                    const selectedVal = (Array.isArray(val) ? val[0] : val) || "";
                                    setFormValues((prev) => ({ ...prev, floorNumber: selectedVal }));
                                    setFormErrors((prev) => ({ ...prev, floorNumber: "" }));
                                }}
                                height={44}
                                placeholder="Select Floor Code"
                                disabled={formDisabled || dialogMode === "edit"}
                                error={formErrors.floorNumber}
                            />
                        </div>

                        <div>
                            <FormTextareaField
                                label="Description"
                                value={formValues.description}
                                onChange={(event) => {
                                    if (formDisabled) return;
                                    let value = event.target.value.replace(/[^a-zA-Z\s]/g, "");
                                    value = value.replace(/^\s+/, "");
                                    value = value.replace(/(.)\1{2,}/g, "$1$1");
                                    if (value.length > 0) {
                                        value = value.charAt(0).toUpperCase() + value.slice(1);
                                    }
                                    value = value.slice(0, 255);
                                    setFormValues((prev) => ({ ...prev, description: value }));
                                }}
                                placeholder="Description"
                                maxLength={255}
                                disabled={formDisabled}
                                rows={3}
                            />
                        </div>

                        <div className="flex items-center justify-between gap-4 rounded-[12px] bg-white px-4">
                            <span className="text-sm font-medium leading-[120%] text-[#434956]">Active Status</span>
                            <Toggle
                                checked={formValues.isActive}
                                onChange={(checked) => setFormValues((prev) => ({ ...prev, isActive: checked }))}
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
                                    setSelectedFloor(null);
                                }}
                            >
                                Close
                            </Button>
                        ) : (
                            <>
                                <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting}>
                                    {dialogMode === "add" ? "Add Floor Master" : "Update Floor Master"}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={isSubmitting}
                                    onClick={() => {
                                        setDialogMode(null);
                                        setFormErrors({});
                                        setSelectedFloor(null);
                                    }}
                                >
                                    Cancel
                                </Button>
                            </>
                        )}
                    </div>
                </form>
            </Dialog>

            <MessageDialog
                open={showDeleteConfirm}
                onClose={() => {
                    if (!isDeleting) {
                        setShowDeleteConfirm(false);
                        setItemToDelete(null);
                    }
                }}
                closeOnOutsideClick={false}
                icon="/icons/transhExtraDarkIcon.svg"
                iconBgColor="#FFEBEE"
                message={
                    itemToDelete ? (
                        <span>
                            Are you sure you want to delete <strong className="text-[#262D3B]">{itemToDelete.floor}</strong>?
                        </span>
                    ) : (
                        "Are you sure you want to delete this floor?"
                    )
                }
                confirmText="Delete"
                cancelText="Cancel"
                showCancel={true}
                isActionLoading={isDeleting}
                onConfirm={handleConfirmDelete}
                onCancel={() => {
                    setShowDeleteConfirm(false);
                    setItemToDelete(null);
                }}
            />

            <MessageDialog
                open={showSuccessDialog}
                onClose={() => setShowSuccessDialog(false)}
                icon="/icons/SuccessCheck.svg"
                iconBgColor="#E8F5E9"
                message={successMessage}
                confirmText="OK"
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
        </AppShell>
    );
}

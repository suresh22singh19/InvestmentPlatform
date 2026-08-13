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
    TableSearchInput,
    Pagination,
    PanelCard,
    MessageDialog,
} from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import type { SelectOption } from "@/components/ui/FormSelectField";
import {
    useGetDiagnosisCategoriesQuery,
    useCreateDiagnosisCategoryMutation,
    useUpdateDiagnosisCategoryMutation
} from "@/store/api/settingsApi";
import { useDebounce } from "@/hooks/useDebounce";
import { usePermission } from "@/hooks/usePermission";

type Diagnosis = {
    id: number;
    name: string;
    status: "Active" | "Inactive";
};

const statusOptions: SelectOption[] = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
];

const STORAGE_KEY = "diagnosis-page-state";

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

const StatusFilterSelect = ({
    value,
    onChange,
}: {
    value: string;
    onChange: (nextValue: string) => void;
}) => {
    return (
        <>
            <style jsx global>{`
        .diagnosis-filter-select button > span:last-child {
          display: none !important;
        }
      `}</style>
            <div className="diagnosis-filter-select relative w-[300px]">
                <FormSelectField
                    label=""
                    options={statusOptions}
                    value={value || null}
                    onChange={(nextValue) => {
                        const finalValue = Array.isArray(nextValue) ? nextValue[0] : nextValue;
                        onChange(finalValue || "");
                    }}
                    placeholder="Select Status"
                    width="100%"
                    height={44}
                    background="normal"
                />
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                    <Image src="/icons/ArrowDown.svg" alt="Arrow Down" width={20} height={20} />
                </div>
            </div>
        </>
    );
};

export default function DiagnosisPage() {
    const diagnosisPermission = usePermission("settings", { subModule: "diagnosis" });
    const canView = diagnosisPermission.canView;
    const canAdd = diagnosisPermission.canAdd;
    const canEdit = diagnosisPermission.canEdit;

    const [searchTerm, setSearchTerm] = useState<string>(() => loadState().searchTerm);
    const [currentPage, setCurrentPage] = useState<number>(() => loadState().currentPage);
    const [itemsPerPage, setItemsPerPage] = useState<number>(() => loadState().itemsPerPage);
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [dialogMode, setDialogMode] = useState<"add" | "edit" | "view" | null>(null);
    const [selectedDiagnosis, setSelectedDiagnosis] = useState<Diagnosis | null>(null);
    const [formValues, setFormValues] = useState({
        name: "",
        status: "active" as "active" | "inactive",
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
    const [apiErrorMessage, setApiErrorMessage] = useState("");

    // Debounce search to avoid too many API calls
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    // Trim the debounced search term to remove leading and trailing spaces
    const trimmedSearchTerm = debouncedSearchTerm.trim();
    const searchParam = trimmedSearchTerm || undefined;

    // Save state to localStorage whenever it changes
    useEffect(() => {
        saveState({
            searchTerm,
            currentPage,
            itemsPerPage,
        });
    }, [searchTerm, currentPage, itemsPerPage]);

    // Fetch diagnosis categories from API
    const { data: diagnosisData, isLoading: isLoadingDiagnosis, refetch: refetchDiagnosis } = useGetDiagnosisCategoriesQuery(
        {
            page: currentPage,
            limit: itemsPerPage,
            search: searchParam,
            sort: "createdAt",
            order: "desc",
        },
        { skip: !canView }
    );

    // Create diagnosis mutation
    const [createDiagnosisCategory, { isLoading: isCreating }] = useCreateDiagnosisCategoryMutation();

    // Update diagnosis mutation
    const [updateDiagnosisCategory, { isLoading: isUpdating }] = useUpdateDiagnosisCategoryMutation();

    // Map API data to Diagnosis format
    const diagnoses: Diagnosis[] = diagnosisData?.data?.map((diagnosis) => ({
        id: diagnosis.id,
        name: diagnosis.diagnosisCategory,
        status: diagnosis.status === "active" ? "Active" : "Inactive",
    })) || [];

    // Store full diagnosis data for edit (to get type field)
    const fullDiagnosisData = diagnosisData?.data || [];

    // Filter by status if statusFilter is set
    const filteredDiagnoses = statusFilter
        ? diagnoses.filter((diagnosis) =>
            diagnosis.status.toLowerCase() === statusFilter.toLowerCase()
        )
        : diagnoses;

    const handleAddNew = () => {
        if (!canAdd) return;
        setFormValues({
            name: "",
            status: "active",
        });
        setFormErrors({});
        setSelectedDiagnosis(null);
        setDialogMode("add");
    };

    const handleEdit = (diagnosis: Diagnosis) => {
        if (!canEdit) return;
        setSelectedDiagnosis(diagnosis);
        setFormValues({
            name: diagnosis.name,
            status: diagnosis.status === "Active" ? "active" : "inactive",
        });
        setFormErrors({});
        setDialogMode("edit");
    };

    const handleView = (diagnosis: Diagnosis) => {
        if (!canView) return;
        setSelectedDiagnosis(diagnosis);
        setFormValues({
            name: diagnosis.name,
            status: diagnosis.status === "Active" ? "active" : "inactive",
        });
        setDialogMode("view");
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
                const payload = {
                    diagnosisCategory: formValues.name.trim(),
                    status: formValues.status,
                    type: "doctor", // Default type as per requirement
                };

                result = await createDiagnosisCategory(payload).unwrap();
                setSuccessMessage(result?.message || "Diagnosis created successfully");
            } else if (dialogMode === "edit" && selectedDiagnosis) {
                const fullDiagnosis = fullDiagnosisData.find((d) => d.id === selectedDiagnosis.id);
                const payload = {
                    id: selectedDiagnosis.id,
                    diagnosisCategory: formValues.name.trim(),
                    status: formValues.status,
                    type: fullDiagnosis?.type || "doctor", // Use existing type or default to doctor
                };

                result = await updateDiagnosisCategory(payload).unwrap();
                setSuccessMessage(result?.message || "Diagnosis updated successfully");
            }

            // Show success message
            setShowSuccessDialog(true);

            // Refetch data after successful creation/update
            await refetchDiagnosis();

            setDialogMode(null);
            setFormValues({
                name: "",
                status: "active",
            });
            setFormErrors({});
            setSelectedDiagnosis(null);
        } catch (error: unknown) {
            console.error(`Failed to ${dialogMode === "add" ? "create" : "update"} diagnosis:`, error);

            let errorMsg = `Failed to ${dialogMode === "add" ? "create" : "update"} diagnosis. Please try again.`;
            const err = error as {
                data?: { message?: string; error?: string };
                error?: string;
                message?: string;
            };
            if (err?.data?.message) {
                errorMsg = err.data.message;
            } else if (err?.data?.error) {
                errorMsg = err.data.error;
            } else if (err?.error) {
                errorMsg = err.error;
            } else if (err?.message) {
                errorMsg = err.message;
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
                    <PageHeading title="Diagnosis" />
                </div>

                <ListBorder as="section" className="px-4 py-4">
                    {!canView ? (
                        <div className="rounded-[16px] border border-[#E3EEE1] bg-white px-6 py-10 text-center text-sm text-[#9CA3AF]">
                            You don&apos;t have permission to view diagnosis.
                        </div>
                    ) : (
                        <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
                            <div className="mb-6 flex items-center justify-between">
                                <h2 className="text-lg font-semibold leading-[120%] text-[#434956]"></h2>

                                <div className="flex items-center gap-3">
                                    <StatusFilterSelect
                                        value={statusFilter}
                                        onChange={(next) => {
                                            setStatusFilter(next);
                                            setCurrentPage(1);
                                        }}
                                    />
                                    <div className="w-[300px]">
                                        <TableSearchInput
                                            value={searchTerm}
                                            onChange={(value) => {
                                                setSearchTerm((prev) => {
                                                    if (prev !== value) setCurrentPage(1);
                                                    return value;
                                                });
                                            }}
                                            placeholder="Search Here..."
                                        />
                                    </div>

                                    {canAdd ? (
                                        <button
                                            type="button"
                                            className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] whitespace-nowrap"
                                            onClick={handleAddNew}
                                        >
                                            <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                                            <span className="text-hide">Add Diagnosis</span>
                                        </button>
                                    ) : null}
                                </div>
                            </div>

                            {isLoadingDiagnosis ? (
                                <div className="py-12 text-center text-sm text-[#9CA3AF]">Loading...</div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                                        {filteredDiagnoses.map((diagnosis) => (
                                            <PanelCard
                                                key={diagnosis.id}
                                                id={diagnosis.id}
                                                name={diagnosis.name}
                                                status={diagnosis.status}
                                                showViewButton={canView}
                                                showEditButton={canEdit}
                                                onView={() => handleView(diagnosis)}
                                                onEdit={() => handleEdit(diagnosis)}
                                            />
                                        ))}
                                    </div>

                                    {filteredDiagnoses.length === 0 && (
                                        <div className="py-12 text-center text-sm text-[#9CA3AF]">No diagnoses found</div>
                                    )}
                                </>
                            )}

                            {!isLoadingDiagnosis && (diagnosisData?.total || filteredDiagnoses.length) > 0 && (
                                <Pagination
                                    currentPage={currentPage}
                                    totalItems={diagnosisData?.total || filteredDiagnoses.length}
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

            {/* Add/Edit/View Dialog */}
            <Dialog
                open={
                    dialogMode !== null &&
                    (dialogMode === "add"
                        ? canAdd
                        : dialogMode === "edit"
                            ? canEdit
                            : canView)
                }
                onClose={() => {
                    setDialogMode(null);
                    setFormErrors({});
                    setSelectedDiagnosis(null);
                }}
                title={dialogMode === "add" ? "Add Diagnosis" : dialogMode === "edit" ? "Edit Diagnosis" : "View Sub Diagnoses"}
                width={686}
                closeOnOutsideClick={false}
            >
                {dialogMode === "view" ? (
                    <div className="space-y-4">
                        {(() => {
                            const selectedDiagnosisData = fullDiagnosisData.find((d) => d.id === selectedDiagnosis?.id);
                            const subDiagnoses = selectedDiagnosisData?.subDiagnoses || [];

                            if (subDiagnoses.length === 0) {
                                return (
                                    <div className="py-8 text-center text-sm text-[#9CA3AF]">
                                        No Sub-Diagnosis available
                                    </div>
                                );
                            }

                            return (
                                <div className="flex flex-wrap gap-2">
                                    {subDiagnoses.map((subDiagnosis) => (
                                        <span
                                            key={subDiagnosis.id}
                                            className="inline-flex h-[30px] items-center justify-center rounded-[30px] border border-[#FDC70F]/32 bg-[#FDC70F]/5 px-5 text-xs font-semibold leading-[120%] text-[#9A7909]"
                                        >
                                            {subDiagnosis.name}
                                        </span>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-6">
                            <div>
                                <FormInputField
                                    label="Name *"
                                    value={formValues.name}
                                    onChange={(event) => {
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
                                    required
                                    error={formErrors.name}
                                />
                            </div>

                            <div>
                                <FormSelectField
                                    label="Status"
                                    value={formValues.status}
                                    onChange={(value) => {
                                        setFormValues((prev) => ({
                                            ...prev,
                                            status: (Array.isArray(value) ? value[0] : value || "active") as "active" | "inactive",
                                        }));
                                    }}
                                    options={statusOptions}
                                    placeholder="Status"
                                    mode="single"
                                    background="white"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
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
                                }}
                                disabled={isCreating || isUpdating}
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                )}
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

            {/* API Error Dialog */}
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


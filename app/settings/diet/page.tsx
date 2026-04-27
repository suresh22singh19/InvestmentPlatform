"use client";

import Image from "next/image";
import { useMemo, useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
  Button,
  Dialog,
  FormSelectField,
  FormTextareaField,
  Table,
  TableBody,
  TableData,
  TableHead,
  TableHeader,
  TableRow,
  TableSearchInput,
  Pagination,
  MessageDialog,
  Tooltip,
} from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import type { SelectOption } from "@/components/ui/FormSelectField";
import {
  useGetDietCategoriesQuery,
  useGetDiagnosisCategoriesMainQuery,
  useGetDiagnosisDietsQuery,
  useCreateDiagnosisDietMutation,
  useUpdateDiagnosisDietMutation,
  useDeleteDiagnosisDietMutation,
  useGetBranchesQuery,
} from "@/store/api/settingsApi";
import { useDebounce } from "@/hooks/useDebounce";
import { usePermission } from "@/hooks/usePermission";
import { useBranchFilter } from "@/hooks/useBranchFilter";

type DietFood = {
  id: number;
  diet: string;
};

type DietCategory = {
  id: number;
  dietCategory: string;
  dietFoods: DietFood[];
};

type DiagnosisDietItem = {
  id: number;
  diagnosisId: number;
  diagnosisName: string;
  dietSchedule: string;
  dietDetail: number[];
  instructions: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

const sanitizeInstructionText = (value: string) =>
  value
    .replace(/[^a-zA-Z\s]/g, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, 100);

function capitalizeFirst(str: string | null | undefined): string {
  if (str == null || str === "") return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function branchSelectLabel(name: string, typeRaw: string | null | undefined): string {
  const t = (typeRaw ?? "").trim();
  if (!t) return name;
  return `${name} (${capitalizeFirst(t)})`;
}

const dietScheduleOptions: SelectOption[] = [
  { value: "Early Morning", label: "Early Morning(5:45-7:15 Am)" },
  { value: "Breakfast", label: "Breakfast(8:00-9:30 Am)" },
  { value: "Morning Snacks", label: "Morning Snacks(11:00-11:20 AM)" },
  { value: "Lunch", label: "Lunch(01:00 - 2 :00 Pm)" },
  { value: "Evening Snacks", label: "Evening Snacks(4:00-4:20 Pm)" },
  { value: "Dinner", label: "Dinner(06:15-7:30 Pm)" },
];

export default function DietPage() {
  const diagnosisDietPermission = usePermission("settings", { subModule: "diagnosis-diet" });
  const canView = diagnosisDietPermission.canView;
  const canAdd = diagnosisDietPermission.canAdd;
  const canEdit = diagnosisDietPermission.canEdit;
  const canDelete = diagnosisDietPermission.canDelete;

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingDietId, setEditingDietId] = useState<number | null>(null);
  const [formValues, setFormValues] = useState({
    diagnosis: "",
    diagnosisId: 0,
    diagnosisName: "",
    dietSchedule: "",
    selectedFoodIds: [] as number[],
    instructions: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
  const [apiErrorMessage, setApiErrorMessage] = useState("");
  const [viewingDiet, setViewingDiet] = useState<DiagnosisDietItem | null>(null);
  /** Add/Edit form: super admin can change; others locked to the page branch (disabled). */
  const [formBranchId, setFormBranchId] = useState("");

  const {
    selectedBranchFilter,
    setSelectedBranchFilter,
    branchFilterOptions,
    isLoadingBranches,
    isBranchFilterDisabled,
    filterBranchId,
    isSuperAdmin: isBranchFilterSuperAdmin,
    branchFilterPersistReady,
  } = useBranchFilter({ persistSuperAdminSelectionKey: "hiims-settings-diagnosis-diet-branch" });

  const { data: branchesListData } = useGetBranchesQuery(undefined);

  const diagnosisDietBranchOptions = useMemo((): SelectOption[] => {
    const rows = branchesListData?.data;
    if (!isBranchFilterSuperAdmin) {
      if (!Array.isArray(rows) || rows.length === 0) return branchFilterOptions;
      return branchFilterOptions.map((opt) => {
        const id = parseInt(String(opt.value), 10);
        if (!Number.isFinite(id)) return opt;
        const b = rows.find((x) => Number(x.id) === id) as { name?: string; type?: string } | undefined;
        if (!b?.name) return opt;
        return {
          value: opt.value,
          label: branchSelectLabel(String(b.name), b.type),
        };
      });
    }
    if (!Array.isArray(rows) || rows.length === 0) return [];
    return rows.map((b) => {
      const row = b as { id: number; name?: string; type?: string };
      return {
        value: String(row.id),
        label: branchSelectLabel(String(row.name ?? ""), row.type),
      };
    });
  }, [isBranchFilterSuperAdmin, branchesListData, branchFilterOptions]);

  useEffect(() => {
    if (!isBranchFilterSuperAdmin) return;
    if (isLoadingBranches) return;
    const rows = branchesListData?.data;
    if (!Array.isArray(rows) || rows.length === 0) return;
    if (selectedBranchFilter !== "") return;
    setSelectedBranchFilter(String(rows[0].id));
  }, [
    isBranchFilterSuperAdmin,
    isLoadingBranches,
    branchesListData,
    selectedBranchFilter,
    setSelectedBranchFilter,
  ]);

  const hasValidBranch =
    branchFilterPersistReady &&
    filterBranchId !== undefined &&
    Number.isFinite(filterBranchId) &&
    filterBranchId >= 1;

  const resolveDefaultFormBranchId = () => {
    if (selectedBranchFilter && /^\d+$/.test(selectedBranchFilter)) {
      return selectedBranchFilter;
    }
    if (filterBranchId != null && Number.isFinite(filterBranchId) && filterBranchId >= 1) {
      return String(filterBranchId);
    }
    return "";
  };

  /** Branch for diet-categories (food chips): page filter, or form branch for super while add/edit. */
  const dietCategoriesBranchId = useMemo((): number | undefined => {
    if (showForm && isBranchFilterSuperAdmin) {
      const n = parseInt(formBranchId, 10);
      if (Number.isFinite(n) && n >= 1) return n;
    }
    if (
      filterBranchId != null &&
      Number.isFinite(filterBranchId) &&
      filterBranchId >= 1
    ) {
      return filterBranchId;
    }
    return undefined;
  }, [showForm, isBranchFilterSuperAdmin, formBranchId, filterBranchId]);

  const hasDietCategoriesBranch =
    dietCategoriesBranchId != null &&
    Number.isFinite(dietCategoriesBranchId) &&
    dietCategoriesBranchId >= 1;

  // Debounce search to avoid too many API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Fetch diagnosis categories from API (add/edit form)
  const { data: diagnosisData, isLoading: isLoadingDiagnosis } = useGetDiagnosisCategoriesMainQuery(undefined, {
    skip: !canView || (!canAdd && !canEdit),
  });

  // Fetch diagnosis diets from API for table (scoped by branch)
  const { data: diagnosisDietsData, isLoading: isLoadingDiagnosisDiets, refetch: refetchDiagnosisDiets } =
    useGetDiagnosisDietsQuery(
      {
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearchTerm || undefined,
        sort: sortField,
        order: sortOrder,
        ...(hasValidBranch ? { branchId: filterBranchId } : {}),
      },
      {
        skip: !canView || !hasValidBranch,
        refetchOnMountOrArgChange: true,
      }
    );

  // Fetch diet categories for selected branch (form / view dialog)
  const { data: dietCategoriesData, isLoading: isLoadingDietCategories } = useGetDietCategoriesQuery(
    {
      limit: 100,
      ...(hasDietCategoriesBranch ? { branchId: dietCategoriesBranchId! } : {}),
    },
    {
      skip:
        !canView ||
        !hasDietCategoriesBranch ||
        (!(canAdd || canEdit) && !viewingDiet),
      refetchOnMountOrArgChange: true,
    }
  );

  // Create, update, and delete diagnosis diet mutations
  const [createDiagnosisDiet, { isLoading: isCreating }] = useCreateDiagnosisDietMutation();
  const [updateDiagnosisDiet, { isLoading: isUpdating }] = useUpdateDiagnosisDietMutation();
  const [deleteDiagnosisDiet, { isLoading: isDeleting }] = useDeleteDiagnosisDietMutation();

  // Map diagnosis data to SelectOption format
  const diagnosisOptions: SelectOption[] = useMemo(() => {
    if (!diagnosisData?.data) return [];
    return diagnosisData.data.map((item) => ({
      value: item.id.toString(),
      label: item.name,
    }));
  }, [diagnosisData]);

  // Map diet categories data
  const dietCategories: DietCategory[] = useMemo(() => {
    if (!dietCategoriesData?.data) return [];
    return dietCategoriesData.data.map((category) => ({
      id: category.id,
      dietCategory: category.dietCategory,
      dietFoods: category.dietFoods,
    }));
  }, [dietCategoriesData]);

  const foodLabelById = useMemo(() => {
    const map = new Map<number, string>();
    dietCategories.forEach((category) => {
      category.dietFoods.forEach((food) => {
        map.set(food.id, food.diet);
      });
    });
    return map;
  }, [dietCategories]);

  const handleAdd = () => {
    if (!canAdd) return;
    setFormBranchId(resolveDefaultFormBranchId());
    setIsEditing(false);
    setEditingDietId(null);
    setFormValues({
      diagnosis: "",
      diagnosisId: 0,
      diagnosisName: "",
      dietSchedule: "",
      selectedFoodIds: [],
      instructions: "",
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleView = (diet: DiagnosisDietItem) => {
    if (!canView) return;
    setViewingDiet(diet);
  };

  const handleEdit = (diet: DiagnosisDietItem) => {
    if (!canEdit) return;
    setFormBranchId(resolveDefaultFormBranchId());
    setIsEditing(true);
    setEditingDietId(diet.id);
    setFormValues({
      diagnosis: diet.diagnosisId.toString(),
      diagnosisId: diet.diagnosisId,
      diagnosisName: diet.diagnosisName,
      dietSchedule: diet.dietSchedule,
      selectedFoodIds: diet.dietDetail || [],
      instructions: diet.instructions || "",
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setIsEditing(false);
    setEditingDietId(null);
    setFormBranchId("");
    setFormValues({
      diagnosis: "",
      diagnosisId: 0,
      diagnosisName: "",
      dietSchedule: "",
      selectedFoodIds: [],
      instructions: "",
    });
    setFormErrors({});
  };

  const toggleFood = (foodId: number) => {
    setFormValues((prev) => {
      const isSelected = prev.selectedFoodIds.includes(foodId);
      return {
        ...prev,
        selectedFoodIds: isSelected
          ? prev.selectedFoodIds.filter((id) => id !== foodId)
          : [...prev.selectedFoodIds, foodId],
      };
    });
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formValues.diagnosis) errors.diagnosis = "Diagnosis is required";
    if (!formValues.dietSchedule) errors.dietSchedule = "Diet Schedule is required";
    if (formValues.selectedFoodIds.length === 0) errors.selectedFoodIds = "At least one diet food is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isEditing && !canEdit) return;
    if (!isEditing && !canAdd) return;
    if (!validateForm()) return;

    const branchId = isBranchFilterSuperAdmin
      ? (() => {
          const n = parseInt(formBranchId, 10);
          return Number.isFinite(n) && n >= 1 ? n : undefined;
        })()
      : filterBranchId;

    if (branchId === undefined || !Number.isFinite(branchId) || branchId < 1) {
      setApiErrorMessage("Select a branch before saving.");
      setShowApiErrorDialog(true);
      return;
    }

    try {
      let result;
      
      if (isEditing && editingDietId) {
        // Update existing diagnosis diet
        const payload = {
          id: editingDietId,
          dietDetail: formValues.selectedFoodIds,
          instructions: formValues.instructions.trim(),
          branchId,
        };

        result = await updateDiagnosisDiet(payload).unwrap();
        setSuccessMessage(result?.message || "Diagnosis diet updated successfully");
      } else {
        // Create new diagnosis diet
        const payload = {
          diagnosisId: formValues.diagnosisId,
          diagnosisName: formValues.diagnosisName,
          dietSchedule: formValues.dietSchedule,
          dietDetail: formValues.selectedFoodIds,
          instructions: formValues.instructions.trim(),
          status: "active" as "active" | "inactive",
          branchId,
        };

        result = await createDiagnosisDiet(payload).unwrap();
        setSuccessMessage(result?.message || "Diagnosis diet created successfully");
      }

      setShowSuccessDialog(true);

      // Refetch table data after successful creation/update
      await refetchDiagnosisDiets();

      // Reset form after success
      handleCancel();
    } catch (error: unknown) {
      console.error(`Failed to ${isEditing ? "update" : "create"} diagnosis diet:`, error);

      let errorMsg = `Failed to ${isEditing ? "update" : "create"} diagnosis diet. Please try again.`;
      const err = error as {
        data?: { message?: string; error?: string };
        error?: string;
        message?: string;
      };
      if (err?.data?.message != null) {
        const m = err.data.message;
        errorMsg = Array.isArray(m) ? m.map(String).join(" ") : String(m);
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

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const getSortDirection = (field: string): "asc" | "desc" | null => {
    if (sortField === field) {
      return sortOrder;
    }
    return null;
  };

  const getDietScheduleLabel = (value: string) => {
    return dietScheduleOptions.find((opt) => opt.value === value)?.label || value;
  };

  const totalItems = diagnosisDietsData?.total || 0;
  const diagnosisDiets = diagnosisDietsData?.data || [];

  const handleDiagnosisChange = (value: string | string[]) => {
    const diagnosisValue = Array.isArray(value) ? value[0] : value || "";
    const selectedDiagnosis = diagnosisData?.data?.find(
      (item) => item.id.toString() === diagnosisValue
    );
    
    setFormValues((prev) => ({
      ...prev,
      diagnosis: diagnosisValue,
      diagnosisId: selectedDiagnosis?.id || 0,
      diagnosisName: selectedDiagnosis?.name || "",
    }));
    setFormErrors((prev) => ({ ...prev, diagnosis: "" }));
  };

  const handleDelete = async (id: number) => {
    if (!canDelete) return;
    if (!hasValidBranch) {
      setApiErrorMessage("Select a branch before deleting.");
      setShowApiErrorDialog(true);
      return;
    }
    try {
      const result = await deleteDiagnosisDiet({ id, branchId: filterBranchId as number }).unwrap();
      setSuccessMessage(result?.message || "Diagnosis diet deleted successfully");
      setShowSuccessDialog(true);
      await refetchDiagnosisDiets();
    } catch (error: unknown) {
      console.error("Failed to delete diagnosis diet:", error);

      let errorMsg = "Failed to delete diagnosis diet. Please try again.";
      const err = error as {
        data?: { message?: string | string[]; error?: string };
        error?: string;
        message?: string;
      };
      if (err?.data?.message != null) {
        const m = err.data.message;
        errorMsg = Array.isArray(m) ? m.map(String).join(" ") : String(m);
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

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <PageHeading title="Diagnosis Diet" />
        </div>

        {!showForm ? (
          <ListBorder as="section" className="px-4 py-4">
            {!canView ? (
              <div className="rounded-[16px] border border-[#E3EEE1] bg-white px-6 py-10 text-center text-sm text-[#9CA3AF]">
                You don&apos;t have permission to view diagnosis diet.
              </div>
            ) : (
            <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
              <div className="mb-6 flex min-w-0 flex-nowrap items-center justify-end gap-3 overflow-x-auto">
                <div className="relative shrink-0">
                  <FormSelectField
                    label=""
                    hideLabel
                    options={diagnosisDietBranchOptions}
                    value={selectedBranchFilter}
                    onChange={(value) => {
                      setSelectedBranchFilter(Array.isArray(value) ? value[0] : value || "");
                      setCurrentPage(1);
                    }}
                    placeholder={isLoadingBranches ? "Loading branches..." : "Select Branch"}
                    mode="single"
                    background="normal"
                    width={300}
                    disabled={isBranchFilterDisabled || isLoadingBranches}
                  />
                </div>
                <div className="w-[280px] shrink-0 min-w-[200px]">
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
                    className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[#0B8C00]/20"
                    onClick={handleAdd}
                  >
                    <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                    <span className="text-hide">Add New Diet</span>
                  </button>
                ) : null}
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead position="first" className="whitespace-nowrap">
                      Sr no.
                    </TableHead>
                    <TableHead 
                      sortable 
                      sortDirection={getSortDirection("diagnosisName")} 
                      onSort={() => handleSort("diagnosisName")}
                    >
                      Diagnosis
                    </TableHead>
                    <TableHead 
                      sortable 
                      sortDirection={getSortDirection("dietSchedule")} 
                      onSort={() => handleSort("dietSchedule")}
                    >
                      Diet Schedule
                    </TableHead>
                    <TableHead position="last">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingDiagnosisDiets ? (
                    <TableRow>
                      <TableData colSpan={4} className="py-12 text-center text-sm text-[#9CA3AF]">
                        Loading...
                      </TableData>
                    </TableRow>
                  ) : diagnosisDiets.length === 0 ? (
                    <TableRow>
                      <TableData colSpan={4} className="py-12 text-center text-sm text-[#9CA3AF]">
                        No diets found
                      </TableData>
                    </TableRow>
                  ) : (
                    diagnosisDiets.map((diet, index) => (
                      <TableRow key={diet.id}>
                        <TableData position="first">{(currentPage - 1) * itemsPerPage + index + 1}</TableData>
                        <TableData>{diet.diagnosisName}</TableData>
                        <TableData>{getDietScheduleLabel(diet.dietSchedule)}</TableData>
                        <TableData position="last">
                          <div className="flex items-center gap-3">
                            {canView ? (
                              <Tooltip content="View" position="top" delay={0}>
                                <button
                                  type="button"
                                  onClick={() => handleView(diet)}
                                  className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                                  aria-label="View diagnosis diet"
                                >
                                  <Image
                                    src="/icons/ViewEyeIcon.svg"
                                    alt="View"
                                    width={20}
                                    height={20}
                                  />
                                </button>
                              </Tooltip>
                            ) : null}
                            {canEdit ? (
                              <Tooltip content="Edit" position="top" delay={0}>
                                <button
                                  type="button"
                                  onClick={() => handleEdit(diet)}
                                  className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                                  aria-label="Edit diagnosis diet"
                                >
                                  <Image
                                    src="/icons/EditIconBlack.svg"
                                    alt="Edit"
                                    width={20}
                                    height={20}
                                  />
                                </button>
                              </Tooltip>
                            ) : null}
                            {canDelete ? (
                              <Tooltip content="Delete" position="top" delay={0}>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(diet.id)}
                                  className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7] disabled:opacity-50 disabled:cursor-not-allowed"
                                  aria-label="Delete diagnosis diet"
                                  disabled={isDeleting}
                                >
                                  <Image src="/icons/TrashBlackIcon.svg" alt="Delete" width={20} height={20} className="shrink-0" />
                                </button>
                              </Tooltip>
                            ) : null}
                          </div>
                        </TableData>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {!isLoadingDiagnosisDiets && totalItems > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  onPageChange={handlePageChange}
                  onItemsPerPageChange={handleItemsPerPageChange}
                  itemsPerPageOptions={[10, 20, 50, 100]}
                />
              )}
            </div>
            )}
          </ListBorder>
        ) : (
          <ListBorder as="section" className="px-4 py-4">
            <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold leading-[120%] text-[#434956]">
                  {isEditing ? "Edit Diagnosis Diet" : "Add Diagnosis Diet"}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <FormSelectField
                    label="Branch *"
                    options={diagnosisDietBranchOptions}
                    value={formBranchId}
                    onChange={(value) => {
                      if (!isBranchFilterSuperAdmin) return;
                      const next = Array.isArray(value) ? value[0] : value || "";
                      setFormBranchId(next);
                      setFormValues((prev) => ({ ...prev, selectedFoodIds: [] }));
                    }}
                    placeholder={isLoadingBranches ? "Loading branches..." : "Select Branch"}
                    mode="single"
                    background="white"
                    disabled={
                      isLoadingBranches ||
                      isCreating ||
                      isUpdating ||
                      !isBranchFilterSuperAdmin ||
                      isEditing
                    }
                  />
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <FormSelectField
                      label="Diagnosis"
                      value={formValues.diagnosis}
                      onChange={handleDiagnosisChange}
                      options={diagnosisOptions}
                      placeholder="Select Diagnosis"
                      mode="single"
                      background="white"
                      disabled={isLoadingDiagnosis || isCreating || isUpdating || isEditing}
                    />
                    {formErrors.diagnosis && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.diagnosis}</p>}
                  </div>

                  <div>
                    <FormSelectField
                      label="Diet Schedule"
                      value={formValues.dietSchedule}
                      onChange={(value) => {
                        setFormValues((prev) => ({
                          ...prev,
                          dietSchedule: Array.isArray(value) ? value[0] : value || "",
                        }));
                        setFormErrors((prev) => ({ ...prev, dietSchedule: "" }));
                      }}
                      options={dietScheduleOptions}
                      placeholder="Select Diet Schedule"
                      mode="single"
                      background="white"
                      disabled={isCreating || isUpdating || isEditing}
                    />
                    {formErrors.dietSchedule && (
                      <p className="mt-1 text-xs text-[#F6776E]">{formErrors.dietSchedule}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold leading-[120%] text-[#262D3B]">Diet Categories</h3>
                  {isLoadingDietCategories ? (
                    <div className="py-8 text-center text-sm text-[#9CA3AF]">Loading diet categories...</div>
                  ) : (
                    <div className="space-y-6">
                      {dietCategories.map((category) => (
                        <div key={category.id} className="space-y-3">
                          <h4 className="text-xs font-medium text-[#434956]">{category.dietCategory}</h4>
                          <div className="flex flex-wrap gap-2">
                            {category.dietFoods.map((food) => {
                              const isSelected = formValues.selectedFoodIds.includes(food.id);
                              return (
                                <button
                                  key={food.id}
                                  type="button"
                                  onClick={() => toggleFood(food.id)}
                                  disabled={isCreating || isUpdating}
                                  className={`inline-flex h-[30px] items-center justify-center rounded-[30px] border px-4 text-xs font-semibold leading-[120%] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                    isSelected
                                      ? "border-[#0B8C00] bg-[#0B8C00] text-white"
                                      : "border-[#0B8C00]/20 bg-[#0B8C00]/20 text-[#0B8C00] hover:bg-[#0B8C00]/30"
                                  }`}
                                >
                                  {food.diet}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {formErrors.selectedFoodIds && (
                    <p className="mt-1 text-xs text-[#F6776E]">{formErrors.selectedFoodIds}</p>
                  )}
                </div>

                <div>
                  <FormTextareaField
                    label="Special Instructions"
                    value={formValues.instructions}
                    onChange={(event) => {
                      setFormValues((prev) => ({
                        ...prev,
                        instructions: sanitizeInstructionText(event.target.value),
                      }));
                    }}
                    height={73}
                    placeholder="Special Instructions"
                    maxLength={100}
                    disabled={isCreating || isUpdating}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button 
                    type="submit" 
                    variant="primary" 
                    isLoading={isCreating || isUpdating} 
                    disabled={isCreating || isUpdating}
                  >
                    {isEditing ? "Update Diet" : "Add Diet"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleCancel} 
                    disabled={isCreating || isUpdating}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </ListBorder>
        )}
      </div>

      <Dialog
        open={Boolean(viewingDiet) && canView}
        onClose={() => setViewingDiet(null)}
        title="View Diagnosis Diet"
        width={686}
      >
        {viewingDiet ? (
          <div className="space-y-5 text-sm text-[#434956]">
            {isLoadingDietCategories ? (
              <div className="py-8 text-center text-[#9CA3AF]">Loading...</div>
            ) : (
              <>
                <div>
                  <p className="text-xs font-medium text-[#7B8089]">Diagnosis</p>
                  <p className="mt-1 font-medium text-[#262D3B]">{viewingDiet.diagnosisName}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-[#7B8089]">Diet schedule</p>
                  <p className="mt-1 font-medium text-[#262D3B]">
                    {getDietScheduleLabel(viewingDiet.dietSchedule)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-[#7B8089]">Diet foods</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(viewingDiet.dietDetail?.length ? viewingDiet.dietDetail : []).map((foodId) => (
                      <span
                        key={foodId}
                        className="inline-flex h-[30px] items-center rounded-[30px] border border-[#0B8C00]/20 bg-[#0B8C00]/10 px-4 text-xs font-semibold text-[#0B8C00]"
                      >
                        {foodLabelById.get(foodId) ?? `Food #${foodId}`}
                      </span>
                    ))}
                    {!(viewingDiet.dietDetail?.length) && (
                      <span className="text-xs text-[#9CA3AF]">None selected</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-[#7B8089]">Special instructions</p>
                  <p className="mt-1 whitespace-pre-wrap text-[#262D3B]">
                    {viewingDiet.instructions?.trim() || "—"}
                  </p>
                </div>
                <div className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setViewingDiet(null)}>
                    Close
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : null}
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
        confirmText="OK"
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

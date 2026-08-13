"use client";

import Image from "next/image";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import type { SelectOption } from "@/components/ui/FormSelectField";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
  Button,
  Dialog,
  FormInputField,
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
  FormSelectField,
} from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import {
  useGetDietCategoriesQuery,
  useCreateDietCategoryMutation,
  useUpdateDietCategoryMutation,
  useDeleteDietCategoryMutation,
  useGetBranchesQuery,
} from "@/store/api/settingsApi";
import { useDebounce } from "@/hooks/useDebounce";
import { useArrowKeyNavigation } from "@/hooks/useArrowKeyNavigation";
import { usePermission } from "@/hooks/usePermission";
import { useBranchFilter } from "@/hooks/useBranchFilter";

type DietCategory = {
  id: number;
  dietCategory: string;
  dietFood: string[];
  remark: string;
};

const sanitizeAlphaText = (raw: string, maxLen = 100) => {
  let value = raw.replace(/[^a-zA-Z\s]/g, "");
  value = value.replace(/^\s+/, "");
  value = value.replace(/(.)\1{2,}/g, "$1$1");
  if (value.length > 0) {
    value = value.charAt(0).toUpperCase() + value.slice(1);
  }
  return value.slice(0, maxLen);
};

function capitalizeFirst(str: string | null | undefined): string {
  if (str == null || str === "") return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function branchSelectLabel(name: string, typeRaw: string | null | undefined): string {
  const t = (typeRaw ?? "").trim();
  if (!t) return name;
  return `${name} (${capitalizeFirst(t)})`;
}

// Extracted outside to avoid re-creating on every parent render
const DynamicFoodItems = ({ foodItems, onViewAll }: { foodItems: string[]; onViewAll: (items: string[]) => void }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const [visibleCount, setVisibleCount] = useState(foodItems.length);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const calculateVisibleItems = useCallback(() => {
    if (!containerRef.current || foodItems.length === 0) {
      setVisibleCount(foodItems.length);
      setIsOverflowing(false);
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;
        const containerWidth = container.offsetWidth;
        const gap = 8;
        const basePadding = 32;
        const charWidth = 7;
        const viewAllButtonBaseWidth = 90;

        let totalWidth = 0;
        let count = 0;

        for (let i = 0; i < foodItems.length; i++) {
          const itemElement = itemsRef.current[i];
          let itemWidth: number;

          if (itemElement && itemElement.offsetWidth > 0) {
            itemWidth = itemElement.offsetWidth + gap;
          } else {
            const textWidth = foodItems[i].length * charWidth;
            itemWidth = Math.max(60, textWidth + basePadding) + gap;
          }

          const needsViewAllButton = i < foodItems.length - 1;
          const viewAllButtonWidth = needsViewAllButton
            ? viewAllButtonBaseWidth + (foodItems.length - i - 1).toString().length * charWidth + gap
            : 0;

          const requiredWidth = totalWidth + itemWidth + viewAllButtonWidth;

          if (requiredWidth > containerWidth && i > 0) {
            count = i;
            setIsOverflowing(true);
            break;
          }

          totalWidth += itemWidth;
          count = i + 1;
        }

        if (count === foodItems.length) {
          setIsOverflowing(false);
        } else if (count === 0 && foodItems.length > 0) {
          count = 1;
          setIsOverflowing(true);
        }

        setVisibleCount(count);
      });
    });
  }, [foodItems]);

  useEffect(() => {
    itemsRef.current = new Array(foodItems.length).fill(null);

    const timeoutId = setTimeout(() => {
      calculateVisibleItems();
    }, 50);

    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        calculateVisibleItems();
      }, 100);
    };

    window.addEventListener("resize", handleResize);

    let resizeObserver: ResizeObserver | null = null;
    if (containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        calculateVisibleItems();
      });
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(resizeTimeout);
      window.removeEventListener("resize", handleResize);
      if (resizeObserver && containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, [calculateVisibleItems, foodItems]);

  const visibleItems = foodItems.slice(0, visibleCount);
  const remainingCount = foodItems.length - visibleCount;

  return (
    <div ref={containerRef} className="flex flex-wrap items-center gap-2 w-full min-w-0">
      {visibleItems.map((food, index) => (
        <Tooltip key={`${food}-${index}`} content={food} position="top">
          <span
            ref={(el) => {
              itemsRef.current[index] = el;
            }}
            className="inline-block h-[30px] max-w-[140px] truncate rounded-[30px] border border-[#FDC70F]/32 bg-[#FDC70F]/5 px-4 py-1.5 text-xs font-semibold leading-[120%] text-[#9A7909] align-middle"
          >
            {food}
          </span>
        </Tooltip>
      ))}
      {isOverflowing && remainingCount > 0 && (
        <button
          type="button"
          onClick={() => onViewAll(foodItems)}
          className="inline-flex h-[30px] items-center justify-center rounded-[30px] border border-[#FDC70F]/32 bg-[#FDC70F]/5 px-4 text-xs font-semibold leading-[120%] text-[#9A7909] whitespace-nowrap"
        >
          View all +{remainingCount}
        </button>
      )}
    </div>
  );
};

export default function DietCategoryPage() {
  const dietCategoryPermission = usePermission("settings", { subModule: "diet-category" });
  const canView = dietCategoryPermission.canView;
  const canAdd = dietCategoryPermission.canAdd;
  const canEdit = dietCategoryPermission.canEdit;
  const canDelete = dietCategoryPermission.canDelete;

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewFoodDialogOpen, setViewFoodDialogOpen] = useState(false);
  const [selectedDietCategory, setSelectedDietCategory] = useState<DietCategory | null>(null);
  const [selectedFoodItems, setSelectedFoodItems] = useState<string[]>([]);
  const [formValues, setFormValues] = useState({
    dietCategory: "",
    dietFoodItems: [] as string[],
    remark: "",
  });
  // Ref to track latest form values to avoid stale state issues
  const formValuesRef = useRef(formValues);

  // Update ref whenever formValues changes
  useEffect(() => {
    formValuesRef.current = formValues;
  }, [formValues]);

  const [dietFoodInput, setDietFoodInput] = useState("");
  /** Add/Edit dialog: super admin can change; others locked to the page branch (disabled). */
  const [formBranchId, setFormBranchId] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
  const [apiErrorMessage, setApiErrorMessage] = useState("");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const {
    selectedBranchFilter,
    setSelectedBranchFilter,
    branchFilterOptions,
    isLoadingBranches,
    isBranchFilterDisabled,
    filterBranchId,
    isSuperAdmin: isBranchFilterSuperAdmin,
    branchFilterPersistReady,
  } = useBranchFilter({ persistSuperAdminSelectionKey: "hiims-settings-diet-category-branch" });

  const { data: branchesListData } = useGetBranchesQuery(undefined);

  const dietCategoryBranchOptions = useMemo((): SelectOption[] => {
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

  const shouldSkipDietCategoriesQuery =
    !canView ||
    !branchFilterPersistReady ||
    filterBranchId === undefined ||
    !Number.isFinite(filterBranchId) ||
    filterBranchId < 1;

  // Form refs for arrow key navigation
  const addFormRef = useRef<HTMLFormElement>(null);
  const editFormRef = useRef<HTMLFormElement>(null);

  // Enable arrow key navigation for forms
  useArrowKeyNavigation(addFormRef, addDialogOpen);
  useArrowKeyNavigation(editFormRef, editDialogOpen);

  // Debounce search to avoid too many API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Fetch diet categories from API (scoped by branch)
  const { data: dietCategoriesData, isLoading: isLoadingDietCategories, refetch: refetchDietCategories } =
    useGetDietCategoriesQuery(
      {
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearchTerm || undefined,
        sort: "createdAt",
        ...(filterBranchId != null && Number.isFinite(filterBranchId) && filterBranchId >= 1
          ? { branchId: filterBranchId }
          : {}),
      },
      {
        skip: shouldSkipDietCategoriesQuery,
        /** Fresh GET whenever branch (or other args) change; avoid stale list after switching branch. */
        refetchOnMountOrArgChange: true,
      }
    );

  // Create, update, and delete mutations
  const [createDietCategory, { isLoading: isCreating }] = useCreateDietCategoryMutation();
  const [updateDietCategory, { isLoading: isUpdating }] = useUpdateDietCategoryMutation();
  const [deleteDietCategory, { isLoading: isDeleting }] = useDeleteDietCategoryMutation();

  // Map API data to DietCategory format and apply sorting
  const dietCategories: DietCategory[] = useMemo(() => {
    if (!dietCategoriesData?.data) {
      return [];
    }
    let mapped = dietCategoriesData.data.map((category) => ({
      id: category.id,
      dietCategory: category.dietCategory,
      dietFood: category.dietFoods.map((food) => food.diet),
      remark: category.remark,
    }));

    // Apply sorting
    if (sortField) {
      mapped = [...mapped].sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortField) {
          case "dietCategory":
            aValue = a.dietCategory.toLowerCase();
            bValue = b.dietCategory.toLowerCase();
            break;
          case "remark":
            aValue = a.remark.toLowerCase();
            bValue = b.remark.toLowerCase();
            break;
          case "dietFood":
            // Sort by first food item alphabetically, or empty string if no items
            aValue = a.dietFood.length > 0 ? a.dietFood[0].toLowerCase() : "";
            bValue = b.dietFood.length > 0 ? b.dietFood[0].toLowerCase() : "";
            break;
          default:
            return 0;
        }

        if (aValue < bValue) {
          return sortOrder === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortOrder === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    return mapped;
  }, [dietCategoriesData, sortField, sortOrder]);

  const totalItems = dietCategoriesData?.total || 0;
  const paginatedDietCategories = dietCategories;

  const resolveDefaultFormBranchId = () => {
    if (selectedBranchFilter && /^\d+$/.test(selectedBranchFilter)) {
      return selectedBranchFilter;
    }
    if (filterBranchId != null && Number.isFinite(filterBranchId) && filterBranchId >= 1) {
      return String(filterBranchId);
    }
    return "";
  };

  const handleViewFood = (foodItems: string[]) => {
    if (!canView) return;
    setSelectedFoodItems(foodItems);
    setViewFoodDialogOpen(true);
  };

  const handleEdit = (category: DietCategory) => {
    if (!canEdit) return;
    setFormBranchId(resolveDefaultFormBranchId());
    setSelectedDietCategory(category);
    const initialValues = {
      dietCategory: category.dietCategory,
      dietFoodItems: [...category.dietFood],
      remark: category.remark,
    };
    // Update ref immediately
    formValuesRef.current = initialValues;
    setFormValues(initialValues);
    setDietFoodInput("");
    setFormErrors({});
    setEditDialogOpen(true);
  };

  const handleAdd = () => {
    if (!canAdd) return;
    setFormBranchId(resolveDefaultFormBranchId());
    setSelectedDietCategory(null);
    const initialValues = {
      dietCategory: "",
      dietFoodItems: [],
      remark: "",
    };
    // Update ref immediately
    formValuesRef.current = initialValues;
    setFormValues(initialValues);
    setDietFoodInput("");
    setFormErrors({});
    setAddDialogOpen(true);
  };

  const handleAddFoodItem = () => {
    const trimmedInput = dietFoodInput.trim();
    if (trimmedInput) {
      const newFood = trimmedInput;

      setFormValues((prev) => {
        const updated = {
          ...prev,
          dietFoodItems: [...prev.dietFoodItems, newFood],
        };
        // Update ref immediately to avoid stale state
        formValuesRef.current = updated;
        return updated;
      });
      setDietFoodInput("");
      setFormErrors((prev) => ({ ...prev, dietFood: "" }));
    } else {
      console.warn("Attempted to add empty food item");
    }
  };

  const handleRemoveFoodItem = (index: number) => {
    setFormValues((prev) => {
      const updated = {
        ...prev,
        dietFoodItems: prev.dietFoodItems.filter((_, i) => i !== index),
      };
      // Update ref immediately to avoid stale state
      formValuesRef.current = updated;
      return updated;
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Use ref to get the latest form values to avoid stale state issues
    // Also check state as fallback to ensure we have the latest data
    let currentFormValues = formValuesRef.current;

    // Double-check: if ref seems stale, use state (though ref should always be up-to-date)
    // This is a safety measure
    if (!currentFormValues || !Array.isArray(currentFormValues.dietFoodItems)) {
      console.warn("Ref appears stale, using state instead");
      currentFormValues = formValues;
    }

    // Final safety: ensure we have the latest from state if ref is empty but state has data
    if (currentFormValues.dietFoodItems.length === 0 && formValues.dietFoodItems.length > 0) {
      console.warn("Ref has empty array but state has items, using state");
      currentFormValues = formValues;
    }

    // Re-validate with latest values
    const errors: Record<string, string> = {};
    if (!currentFormValues.dietCategory.trim()) {
      errors.dietCategory = "Diet Category is required";
    } else if (!/^[a-zA-Z\s]+$/.test(currentFormValues.dietCategory.trim())) {
      errors.dietCategory = "Diet Category must contain only letters and spaces";
    } else if (currentFormValues.dietCategory.trim().length > 100) {
      errors.dietCategory = "Diet Category cannot exceed 100 characters";
    }

    if (currentFormValues.dietFoodItems.length === 0) {
      errors.dietFood = "At least one diet food item is required";
    } else if (
      currentFormValues.dietFoodItems.some(
        (food) => !food.trim() || food.trim().length > 100 || !/^[a-zA-Z\s]+$/.test(food.trim())
      )
    ) {
      errors.dietFood = "Diet Food must contain only letters and spaces, max 100 characters";
    }

    if (!currentFormValues.remark.trim()) {
      errors.remark = "Remark is required";
    } else if (!/^[a-zA-Z\s]+$/.test(currentFormValues.remark.trim())) {
      errors.remark = "Remark must contain only letters and spaces";
    } else if (currentFormValues.remark.trim().length > 150) {
      errors.remark = "Remark cannot exceed 150 characters";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (selectedDietCategory && !canEdit) return;
    if (!selectedDietCategory && !canAdd) return;

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

      // Use latest form values from ref
      const dietFoods = currentFormValues.dietFoodItems.map((food) => ({ diet: food }));

      if (selectedDietCategory) {
        // Update existing category
        // For updates, we need to map existing foods with their IDs if they exist
        const existingCategory = dietCategoriesData?.data?.find((cat) => cat.id === selectedDietCategory.id);

        // Debug: Log current form values from ref

        // Ensure we have a valid array
        const foodItems = Array.isArray(currentFormValues.dietFoodItems)
          ? currentFormValues.dietFoodItems
          : [];

        const updatedDietFoods = foodItems.map((food) => {
          if (!food || typeof food !== 'string') {
            console.warn("Invalid food item:", food);
            return null;
          }
          const trimmedFood = food.trim();
          if (!trimmedFood) {
            console.warn("Empty food item after trim");
            return null;
          }
          // Try to find existing food by diet name to preserve ID
          const existingFood = existingCategory?.dietFoods?.find((f) => f.diet === trimmedFood);
          if (existingFood && existingFood.id) {
            return { id: existingFood.id, diet: trimmedFood };
          }
          // New food item without ID
          return { diet: trimmedFood };
        }).filter((food): food is { id?: number; diet: string } => food !== null);

        if (updatedDietFoods.length === 0) {
          console.error("No valid diet foods to update! Original array:", foodItems);
        }

        const payload = {
          id: selectedDietCategory.id,
          dietCategory: currentFormValues.dietCategory.trim(),
          remark: currentFormValues.remark.trim(),
          status: "active" as "active" | "inactive",
          dietFoods: updatedDietFoods,
          branchId,
        };

        // Debug log to verify payload

        result = await updateDietCategory(payload).unwrap();
        setSuccessMessage(result?.message || "Diet category updated successfully");
        setEditDialogOpen(false);
      } else {
        // Add new category
        const payload = {
          dietCategory: currentFormValues.dietCategory.trim(),
          remark: currentFormValues.remark.trim(),
          status: "active" as "active" | "inactive",
          dietFoods: dietFoods,
          branchId,
        };

        // Debug log to verify payload

        result = await createDietCategory(payload).unwrap();
        setSuccessMessage(result?.message || "Diet category created successfully");
        setAddDialogOpen(false);
      }

      // Show success message
      setShowSuccessDialog(true);

      // Refetch data after successful creation/update
      await refetchDietCategories();

      setFormValues({
        dietCategory: "",
        dietFoodItems: [],
        remark: "",
      });
      setDietFoodInput("");
      setFormErrors({});
      setFormBranchId("");
      setSelectedDietCategory(null);
    } catch (error: unknown) {
      console.error(`Failed to ${selectedDietCategory ? "update" : "create"} diet category:`, error);

      let errorMsg = `Failed to ${selectedDietCategory ? "update" : "create"} diet category. Please try again.`;
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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  const handleSort = (column: string) => {
    if (sortField === column) {
      // Toggle sort order if same field
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Set new sort field with ascending order
      setSortField(column);
      setSortOrder("asc");
    }
    // Reset to first page when sorting changes
    setCurrentPage(1);
  };

  const getSortDirection = (column: string): "asc" | "desc" | null => {
    if (sortField === column) {
      return sortOrder;
    }
    return null;
  };

  const handleDelete = async (id: number) => {
    if (!canDelete) return;
    if (
      filterBranchId === undefined ||
      !Number.isFinite(filterBranchId) ||
      filterBranchId < 1
    ) {
      setApiErrorMessage("Select a branch before deleting.");
      setShowApiErrorDialog(true);
      return;
    }
    try {
      const result = await deleteDietCategory({ id, branchId: filterBranchId }).unwrap();
      setSuccessMessage(result?.message || "Diet category deleted successfully");
      setShowSuccessDialog(true);
      await refetchDietCategories();
    } catch (error: unknown) {
      console.error("Failed to delete diet category:", error);

      let errorMsg = "Failed to delete diet category. Please try again.";
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

  const isSubmitting = isCreating || isUpdating;

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <PageHeading title="Diet Category" />
        </div>

        <ListBorder as="section" className="px-4 py-4">
          {!canView ? (
            <div className="rounded-[16px] border border-[#E3EEE1] bg-white px-6 py-10 text-center text-sm text-[#9CA3AF]">
              You don&apos;t have permission to view diet category.
            </div>
          ) : (
            <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
              <div className="mb-6 flex min-w-0 flex-nowrap items-center justify-end gap-3 overflow-x-auto">
                <div className="relative shrink-0">
                  <FormSelectField
                    label=""
                    hideLabel
                    options={dietCategoryBranchOptions}
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
                    className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleAdd}
                    disabled={isSubmitting}
                  >
                    <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                    <span className="text-hide">Add Diet Category</span>
                  </button>
                ) : null}
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead position="first" className="whitespace-nowrap w-[80px]">
                      Sr no.
                    </TableHead>
                    <TableHead sortable sortDirection={getSortDirection("dietCategory")} onSort={() => handleSort("dietCategory")} className="w-[200px]">
                      Diet Category
                    </TableHead>
                    <TableHead sortable sortDirection={getSortDirection("dietFood")} onSort={() => handleSort("dietFood")} className="w-[300px]">
                      Diet Food
                    </TableHead>
                    <TableHead sortable sortDirection={getSortDirection("remark")} onSort={() => handleSort("remark")} className="w-[250px]">
                      Remark
                    </TableHead>
                    <TableHead position="last" className="w-[120px]">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingDietCategories ? (
                    <TableRow>
                      <TableData colSpan={5} className="py-12 text-center text-sm text-[#9CA3AF]">
                        Loading...
                      </TableData>
                    </TableRow>
                  ) : paginatedDietCategories.length === 0 ? (
                    <TableRow>
                      <TableData colSpan={5} className="py-12 text-center text-sm text-[#9CA3AF]">
                        No diet categories found
                      </TableData>
                    </TableRow>
                  ) : (
                    paginatedDietCategories.map((category, index) => (
                      <TableRow key={category.id}>
                        <TableData position="first" className="w-[80px]">{(currentPage - 1) * itemsPerPage + index + 1}</TableData>
                        <TableData className="w-[200px]">
                          <Tooltip content={category.dietCategory} position="top">
                            <span className="inline-block max-w-[180px] truncate align-middle">
                              {category.dietCategory}
                            </span>
                          </Tooltip>
                        </TableData>
                        <TableData className="w-[300px]">
                          <DynamicFoodItems foodItems={category.dietFood} onViewAll={handleViewFood} />
                        </TableData>
                        <TableData className="w-[250px]">
                          <Tooltip content={category.remark} position="top">
                            <span className="inline-block max-w-[230px] truncate align-middle">
                              {category.remark}
                            </span>
                          </Tooltip>
                        </TableData>
                        <TableData position="last" className="w-[120px]">
                          <div className="flex items-center gap-3">
                            {canEdit ? (
                              <Tooltip content="Edit" position="top" delay={0}>
                                <button
                                  type="button"
                                  onClick={() => handleEdit(category)}
                                  className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7] disabled:opacity-50 disabled:cursor-not-allowed"
                                  aria-label="Edit diet category"
                                  disabled={isSubmitting}
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
                                  onClick={() => handleDelete(category.id)}
                                  className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7] disabled:opacity-50 disabled:cursor-not-allowed"
                                  aria-label="Delete diet category"
                                  disabled={isDeleting || isSubmitting}
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

              {!isLoadingDietCategories && totalItems > 0 && (
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
      </div>

      {/* View Food Items Dialog */}
      <Dialog
        open={viewFoodDialogOpen && canView}
        onClose={() => {
          setViewFoodDialogOpen(false);
          setSelectedFoodItems([]);
        }}
        title="View Diet Food"
        width={772}
      >
        <div className="flex flex-wrap gap-2">
          {selectedFoodItems.map((food, index) => (
            <span
              key={index}
              className="inline-flex h-[30px] items-center justify-center rounded-[30px] border border-[#FDC70F]/32 bg-[#FDC70F]/5 px-5 text-xs font-semibold leading-[120%] text-[#9A7909]"
            >
              {food}
            </span>
          ))}
        </div>
      </Dialog>

      {/* Add Diet Category Dialog */}
      <Dialog
        open={addDialogOpen && canAdd}
        onClose={() => {
          if (isSubmitting) return;
          setAddDialogOpen(false);
          setFormErrors({});
          setFormBranchId("");
          setSelectedDietCategory(null);
          setDietFoodInput("");
        }}
        title="Add Diet Category"
        width={949}
        closeOnOutsideClick={false}
      >
        <form ref={addFormRef} onSubmit={handleSubmit} className="space-y-6">
          <div>
            <FormSelectField
              label="Branch *"
              options={dietCategoryBranchOptions}
              value={formBranchId}
              onChange={(value) => {
                if (!isBranchFilterSuperAdmin) return;
                setFormBranchId(Array.isArray(value) ? value[0] : value || "");
              }}
              placeholder={isLoadingBranches ? "Loading branches..." : "Select Branch"}
              mode="single"
              background="white"
              disabled={isLoadingBranches || isSubmitting || !isBranchFilterSuperAdmin}
            />
          </div>

          <div>
            <FormInputField
              label="Diet Category *"
              value={formValues.dietCategory}
              onChange={(event) => {
                const value = sanitizeAlphaText(event.target.value);
                setFormValues((prev) => {
                  const updated = { ...prev, dietCategory: value };
                  formValuesRef.current = updated;
                  return updated;
                });
                setFormErrors((prev) => ({ ...prev, dietCategory: "" }));
              }}
              height={44}
              placeholder="Diet Category"
              maxLength={100}
              required
              disabled={isSubmitting}
            />
            {formErrors.dietCategory && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.dietCategory}</p>}
          </div>

          <div className="space-y-3">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <FormInputField
                  label="Diet Food *"
                  value={dietFoodInput}
                  onChange={(event) => {
                    const value = sanitizeAlphaText(event.target.value);
                    setDietFoodInput(value);
                    setFormErrors((prev) => ({ ...prev, dietFood: "" }));
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !isSubmitting) {
                      event.preventDefault();
                      handleAddFoodItem();
                    }
                  }}
                  height={44}
                  placeholder="Diet Food"
                  maxLength={100}
                  disabled={isSubmitting}
                />
              </div>
              <button
                type="button"
                onClick={handleAddFoodItem}
                className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[#0B8C00]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                Add
              </button>
            </div>
            {formValues.dietFoodItems.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-semibold leading-[120%] text-[#262D3B]">Diet Food *</label>
                <div className="flex flex-wrap gap-2">
                  {formValues.dietFoodItems.map((food, index) => (
                    <span
                      key={index}
                      className="inline-flex h-[30px] items-center justify-center gap-2 rounded-[30px] border border-[#FDC70F]/32 bg-[#FDC70F]/5 px-4 text-xs font-semibold leading-[120%] text-[#9A7909]"
                    >
                      {food}
                      <button
                        type="button"
                        onClick={() => handleRemoveFoodItem(index)}
                        className="flex h-4 w-4 items-center justify-center transition-colors hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Remove food item"
                        disabled={isSubmitting}
                      >
                        <Image src="/icons/TrashRedIcon.svg" alt="Remove" width={14} height={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {formErrors.dietFood && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.dietFood}</p>}
          </div>

          <div>
            <FormTextareaField
              label="Remark *"
              value={formValues.remark}
              onChange={(event) => {
                const value = sanitizeAlphaText(event.target.value, 150);
                setFormValues((prev) => {
                  const updated = { ...prev, remark: value };
                  formValuesRef.current = updated;
                  return updated;
                });
                setFormErrors((prev) => ({ ...prev, remark: "" }));
              }}
              height={73}
              placeholder="Remark"
              maxLength={150}
              required
              disabled={isSubmitting}
            />
            {formErrors.remark && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.remark}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="primary" isLoading={isCreating} disabled={isSubmitting}>
              Add Diet Category
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAddDialogOpen(false);
                setFormErrors({});
                setFormBranchId("");
                setSelectedDietCategory(null);
                setDietFoodInput("");
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Edit Diet Category Dialog */}
      <Dialog
        open={editDialogOpen && canEdit}
        onClose={() => {
          if (isSubmitting) return;
          setEditDialogOpen(false);
          setFormErrors({});
          setFormBranchId("");
          setSelectedDietCategory(null);
          setDietFoodInput("");
        }}
        title="Edit Diet Category"
        width={949}
        closeOnOutsideClick={false}
      >
        <form ref={editFormRef} onSubmit={handleSubmit} className="space-y-6">
          <div>
            <FormSelectField
              label="Branch *"
              options={dietCategoryBranchOptions}
              value={formBranchId}
              onChange={(value) => {
                if (!isBranchFilterSuperAdmin) return;
                setFormBranchId(Array.isArray(value) ? value[0] : value || "");
              }}
              placeholder={isLoadingBranches ? "Loading branches..." : "Select Branch"}
              mode="single"
              background="white"
              disabled={
                isLoadingBranches || isSubmitting || !isBranchFilterSuperAdmin || editDialogOpen
              }
            />
          </div>

          <div>
            <FormInputField
              label="Diet Category *"
              value={formValues.dietCategory}
              onChange={(event) => {
                const value = sanitizeAlphaText(event.target.value);
                setFormValues((prev) => {
                  const updated = { ...prev, dietCategory: value };
                  formValuesRef.current = updated;
                  return updated;
                });
                setFormErrors((prev) => ({ ...prev, dietCategory: "" }));
              }}
              height={44}
              placeholder="Diet Category"
              maxLength={100}
              required
              disabled={isSubmitting}
            />
            {formErrors.dietCategory && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.dietCategory}</p>}
          </div>

          <div className="space-y-3">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <FormInputField
                  label="Diet Food *"
                  value={dietFoodInput}
                  onChange={(event) => {
                    const value = sanitizeAlphaText(event.target.value);
                    setDietFoodInput(value);
                    setFormErrors((prev) => ({ ...prev, dietFood: "" }));
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !isSubmitting) {
                      event.preventDefault();
                      handleAddFoodItem();
                    }
                  }}
                  height={44}
                  placeholder="Diet Food"
                  maxLength={100}
                  disabled={isSubmitting}
                />
              </div>
              <button
                type="button"
                onClick={handleAddFoodItem}
                className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[#0B8C00]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                Add
              </button>
            </div>
            {formValues.dietFoodItems.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-semibold leading-[120%] text-[#262D3B]">Diet Food *</label>
                <div className="flex flex-wrap gap-2">
                  {formValues.dietFoodItems.map((food, index) => (
                    <span
                      key={index}
                      className="inline-flex h-[30px] items-center justify-center gap-2 rounded-[30px] border border-[#FDC70F]/32 bg-[#FDC70F]/5 px-4 text-xs font-semibold leading-[120%] text-[#9A7909]"
                    >
                      {food}
                      <button
                        type="button"
                        onClick={() => handleRemoveFoodItem(index)}
                        className="flex h-4 w-4 items-center justify-center transition-colors hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Remove food item"
                        disabled={isSubmitting}
                      >
                        <Image src="/icons/TrashRedIcon.svg" alt="Remove" width={14} height={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {formErrors.dietFood && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.dietFood}</p>}
          </div>

          <div>
            <FormTextareaField
              label="Remark *"
              value={formValues.remark}
              onChange={(event) => {
                const value = sanitizeAlphaText(event.target.value, 150);
                setFormValues((prev) => {
                  const updated = { ...prev, remark: value };
                  formValuesRef.current = updated;
                  return updated;
                });
                setFormErrors((prev) => ({ ...prev, remark: "" }));
              }}
              height={73}
              placeholder="Remark"
              maxLength={150}
              required
              disabled={isSubmitting}
            />
            {formErrors.remark && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.remark}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="primary" isLoading={isUpdating} disabled={isSubmitting}>
              Update Diet Category
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setFormErrors({});
                setFormBranchId("");
                setSelectedDietCategory(null);
                setDietFoodInput("");
              }}
              disabled={isSubmitting}
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

"use client";

import Image from "next/image";
import { useMemo, useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
  Button,
  FormInputField,
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
} from "@/store/api/settingsApi";
import { useDebounce } from "@/hooks/useDebounce";

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

const dietScheduleOptions: SelectOption[] = [
  { value: "Early Morning", label: "Early Morning(5:45-7:15 Am)" },
  { value: "Breakfast", label: "Breakfast(8:00-9:30 Am)" },
  { value: "Morning Snacks", label: "Morning Snacks(11:00-11:20 AM)" },
  { value: "Lunch", label: "Lunch(01:00 - 2 :00 Pm)" },
  { value: "Evening Snacks", label: "Evening Snacks(4:00-4:20 Pm)" },
  { value: "Dinner", label: "Dinner(06:15-7:30 Pm)" },
];

export default function DietPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string>("id");
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

  // Debounce search to avoid too many API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Reset to first page when search term or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, sortField, sortOrder]);

  // Fetch diagnosis categories from API
  const { data: diagnosisData, isLoading: isLoadingDiagnosis } = useGetDiagnosisCategoriesMainQuery();
  
  // Fetch diagnosis diets from API for table
  const { data: diagnosisDietsData, isLoading: isLoadingDiagnosisDiets, refetch: refetchDiagnosisDiets } = useGetDiagnosisDietsQuery({
    page: currentPage,
    limit: itemsPerPage,
    search: debouncedSearchTerm || undefined,
    sort: sortField,
    order: sortOrder,
  });
  
  // Fetch diet categories from API with limit 100 for form
  const { data: dietCategoriesData, isLoading: isLoadingDietCategories } = useGetDietCategoriesQuery({
    limit: 100,
  });

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

  const handleAdd = () => {
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

  const handleEdit = (diet: DiagnosisDietItem) => {
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
    if (!validateForm()) return;

    try {
      let result;
      
      if (isEditing && editingDietId) {
        // Update existing diagnosis diet
        const payload = {
          id: editingDietId,
          dietDetail: formValues.selectedFoodIds,
          instructions: formValues.instructions.trim(),
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
        };

        result = await createDiagnosisDiet(payload).unwrap();
        setSuccessMessage(result?.message || "Diagnosis diet created successfully");
      }

      setShowSuccessDialog(true);

      // Refetch table data after successful creation/update
      await refetchDiagnosisDiets();

      // Reset form after success
      handleCancel();
    } catch (error: any) {
      console.error(`Failed to ${isEditing ? "update" : "create"} diagnosis diet:`, error);
      
      let errorMsg = `Failed to ${isEditing ? "update" : "create"} diagnosis diet. Please try again.`;
      
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

  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle order if same field
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Set new field with ascending order
      setSortField(field);
      setSortOrder("asc");
    }
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
    try {
      const result = await deleteDiagnosisDiet({ id }).unwrap();
      setSuccessMessage(result?.message || "Diagnosis diet deleted successfully");
      setShowSuccessDialog(true);
      await refetchDiagnosisDiets();
    } catch (error: any) {
      console.error("Failed to delete diagnosis diet:", error);
      
      let errorMsg = "Failed to delete diagnosis diet. Please try again.";
      
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

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <PageHeading title="Diagnosis Diet" />
        </div>

        {!showForm ? (
          <ListBorder as="section" className="px-4 py-4">
            <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold leading-[120%] text-[#434956]"></h2>

                <div className="flex items-center gap-3">
                  <TableSearchInput
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="Search Here..."
                  />
                  <button
                    type="button"
                    className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[#0B8C00]/20"
                    onClick={handleAdd}
                  >
                    <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                    Add New Diet
                  </button>
                </div>
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
                            <button
                              type="button"
                              onClick={() => handleDelete(diet.id)}
                              className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7] disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label="Delete diagnosis diet"
                              disabled={isDeleting}
                            >
                              <Image src="/icons/TrashBlackIcon.svg" alt="Delete" width={20} height={20} className="shrink-0" />
                            </button>
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
                      setFormValues((prev) => ({ ...prev, instructions: event.target.value }));
                    }}
                    height={73}
                    placeholder="Special Instructions"
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

"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
  Button,
  FormInputField,
  FormSelectField,
  Table,
  TableBody,
  TableData,
  TableHead,
  TableHeader,
  TableRow,
  TableSearchInput,
  Pagination,
} from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import type { SelectOption } from "@/components/ui/FormSelectField";

type Diet = {
  id: number;
  name: string;
  diagnosis: string;
  dietSchedule: string;
  selectedCategories: string[];
};

const initialDiets: Diet[] = [
  {
    id: 1,
    name: "Oats with Fruits",
    diagnosis: "diabetes",
    dietSchedule: "morning",
    selectedCategories: ["MILLET DIET", "CARROT", "BEETROOT", "FRUIT SALAD"],
  },
  {
    id: 2,
    name: "Green Salad",
    diagnosis: "hypertension",
    dietSchedule: "afternoon",
    selectedCategories: ["VEGETABLE SALAD", "CUCUMBER", "BROCCOLI"],
  },
  {
    id: 3,
    name: "Vegetable Smoothie",
    diagnosis: "obesity",
    dietSchedule: "evening",
    selectedCategories: ["GREEN JUICE", "CARROT", "CELERY"],
  },
  {
    id: 4,
    name: "Detox Salad",
    diagnosis: "addiction",
    dietSchedule: "full-day",
    selectedCategories: ["DETOX DRINK", "VEGETABLE SALAD"],
  },
  {
    id: 5,
    name: "Boiled Eggs",
    diagnosis: "thyroid",
    dietSchedule: "morning",
    selectedCategories: ["ALMOND", "WALNUT"],
  },
  {
    id: 6,
    name: "Fresh Juice",
    diagnosis: "cardiac",
    dietSchedule: "evening",
    selectedCategories: ["RED JUICE", "GREEN JUICE", "FRUIT SALAD"],
  },
];

const diagnosisOptions: SelectOption[] = [
  { value: "diabetes", label: "Diabetes" },
  { value: "hypertension", label: "Hypertension" },
  { value: "obesity", label: "Obesity" },
  { value: "addiction", label: "Addiction" },
  { value: "thyroid", label: "Thyroid" },
  { value: "cardiac", label: "Cardiac" },
  { value: "cancer", label: "Cancer" },
];

const dietScheduleOptions: SelectOption[] = [
  { value: "early-morning", label: "Early Morning" },
  { value: "morning", label: "Morning - Low-sugar meal plan" },
  { value: "afternoon", label: "Afternoon - Low-salt diet" },
  { value: "evening", label: "Evening - High-fiber plan" },
  { value: "full-day", label: "Full Day - Detox diet" },
];

const dietCategories = {
  "PLATE2": ["MILLET DIET"],
  "PLATE 1": ["CARROT", "BEETROOT", "CUCUMBER", "RAW PAPAYA", "ASHGOURD", "RED BELL PEPPER", "YELLOW BELL PEPPER", "BROCCOLI", "Salad"],
  "MILLET": ["LITTLE MILLET", "BARNYAD MILLET", "KODO MILLET", "FOXTAIL MILLET", "BROWNTOP MILLET", "SORGHUM MILLET"],
  "WATER": ["MINERAL WATER", "ALKALINE WATER", "LIVING WATER"],
  "JUICE": ["RED JUICE", "GREEN JUICE", "YELLOW JUICE", "BLACK JUICE", "MOONG DAL WATER", "MIX JUICE"],
  "MILK": ["COCONUT MILK", "ALMOND MILK", "CASHEW MILK", "OAT MILK", "PEANUT MILK"],
  "SALAD": ["SPROUTS SALAD", "FRUIT SALAD", "VEGETABLE SALAD", "NORMAL SALAD", "SALAD SMOOTHIE"],
  "FRUITS": ["PAPAYA", "APPLE", "PINEAPPLE", "POMEGRANATE", "KIWI", "GUAVA", "STRAWBERRIES", "ORANGE", "MANGO", "GRAPES", "WATER MELON", "MUSKMELON", "PEAR"],
  "SOAKED DRY FRUITS": ["ALMOND", "WALNUT", "RAISINS"],
  "SPICES": ["TURMERIC", "CINNAMON", "CLOVES", "CUMIN SEEDS", "CARDAMON GREEN", "CAROM SEEDS", "GINGER", "GARLIC"],
  "DETOX DRINK": ["COCONUT WATER", "TURMERIC WATER", "LEMON AND GINGER DRINK"],
  "HERBAL TEA": ["HERBAL TEA 32", "CURRY LEAVES"],
};

export default function DietPage() {
  const [diets, setDiets] = useState<Diet[]>(initialDiets);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedDiet, setSelectedDiet] = useState<Diet | null>(null);
  const [formValues, setFormValues] = useState({
    name: "",
    diagnosis: "",
    dietSchedule: "",
    selectedCategories: [] as string[],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const filteredDiets = useMemo(() => {
    return diets.filter((diet) => {
      return (
        diet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        diet.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()) ||
        diet.dietSchedule.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [diets, searchTerm]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDiets = filteredDiets.slice(startIndex, startIndex + itemsPerPage);

  const handleAdd = () => {
    setSelectedDiet(null);
    setIsEditing(false);
    setFormValues({
      name: "",
      diagnosis: "",
      dietSchedule: "",
      selectedCategories: [],
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleEdit = (diet: Diet) => {
    setSelectedDiet(diet);
    setIsEditing(true);
    setFormValues({
      name: diet.name,
      diagnosis: diet.diagnosis,
      dietSchedule: diet.dietSchedule,
      selectedCategories: [...diet.selectedCategories],
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setIsEditing(false);
    setSelectedDiet(null);
    setFormValues({
      name: "",
      diagnosis: "",
      dietSchedule: "",
      selectedCategories: [],
    });
    setFormErrors({});
  };

  const toggleCategory = (category: string) => {
    setFormValues((prev) => {
      const isSelected = prev.selectedCategories.includes(category);
      return {
        ...prev,
        selectedCategories: isSelected
          ? prev.selectedCategories.filter((c) => c !== category)
          : [...prev.selectedCategories, category],
      };
    });
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formValues.name.trim()) errors.name = "Name is required";
    if (!formValues.diagnosis) errors.diagnosis = "Diagnosis is required";
    if (!formValues.dietSchedule) errors.dietSchedule = "Diet Schedule is required";
    if (formValues.selectedCategories.length === 0) errors.selectedCategories = "At least one diet category is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;

    if (isEditing && selectedDiet) {
      setDiets((prev) =>
        prev.map((diet) =>
          diet.id === selectedDiet.id
            ? {
                ...diet,
                name: formValues.name.trim(),
                diagnosis: formValues.diagnosis,
                dietSchedule: formValues.dietSchedule,
                selectedCategories: formValues.selectedCategories,
              }
            : diet
        )
      );
    } else {
      const newDiet: Diet = {
        id: diets.length + 1,
        name: formValues.name.trim(),
        diagnosis: formValues.diagnosis,
        dietSchedule: formValues.dietSchedule,
        selectedCategories: formValues.selectedCategories,
      };
      setDiets((prev) => [...prev, newDiet]);
    }

    handleCancel();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  const getSortDirection = (column: string): "asc" | "desc" | null => {
    return null;
  };

  const getDiagnosisLabel = (value: string) => {
    return diagnosisOptions.find((opt) => opt.value === value)?.label || value;
  };

  const getDietScheduleLabel = (value: string) => {
    return dietScheduleOptions.find((opt) => opt.value === value)?.label || value;
  };

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <PageHeading title="Settings" />
        </div>

        {!showForm ? (
          <ListBorder as="section" className="px-4 py-4">
            <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold leading-[120%] text-[#434956]">Diet</h2>

                <div className="flex items-center gap-3">
                  <TableSearchInput
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="Search Here..."
                  />
                  <button
                    type="button"
                    className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] focus:outline-none focus:ring-2 focus:ring-[#0B8C00]/20"
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
                    <TableHead sortable sortDirection={getSortDirection("name")} onSort={() => {}}>
                      Diet Name
                    </TableHead>
                    <TableHead sortable sortDirection={getSortDirection("diagnosis")} onSort={() => {}}>
                      Diagnosis
                    </TableHead>
                    <TableHead sortable sortDirection={getSortDirection("dietSchedule")} onSort={() => {}}>
                      Diet Schedule
                    </TableHead>
                    <TableHead position="last">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedDiets.length === 0 ? (
                    <TableRow>
                      <TableData colSpan={5} className="py-12 text-center text-sm text-[#9CA3AF]">
                        No diets found
                      </TableData>
                    </TableRow>
                  ) : (
                    paginatedDiets.map((diet, index) => (
                      <TableRow key={diet.id}>
                        <TableData position="first">{startIndex + index + 1}</TableData>
                        <TableData>{diet.name}</TableData>
                        <TableData>{getDiagnosisLabel(diet.diagnosis)}</TableData>
                        <TableData>{getDietScheduleLabel(diet.dietSchedule)}</TableData>
                        <TableData position="last">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleEdit(diet)}
                              className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                              aria-label="Edit diet"
                            >
                              <Image
                                src="/icons/EditIconBlack.svg"
                                alt="Edit"
                                width={20}
                                height={20}
                              />
                            </button>
                          </div>
                        </TableData>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {filteredDiets.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalItems={filteredDiets.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={handlePageChange}
                  onItemsPerPageChange={handleItemsPerPageChange}
                  itemsPerPageOptions={[6, 10, 20, 50]}
                />
              )}
            </div>
          </ListBorder>
        ) : (
          <ListBorder as="section" className="px-4 py-4">
            <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold leading-[120%] text-[#434956]">
                  {isEditing ? "Edit Diet" : "Add Diet"}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <FormInputField
                      label="Name"
                      value={formValues.name}
                      onChange={(event) => {
                        setFormValues((prev) => ({ ...prev, name: event.target.value }));
                        setFormErrors((prev) => ({ ...prev, name: "" }));
                      }}
                      height={44}
                      placeholder="Name"
                      required
                    />
                    {formErrors.name && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.name}</p>}
                  </div>

                  <div>
                    <FormSelectField
                      label="Diagnosis"
                      value={formValues.diagnosis}
                      onChange={(value) => {
                        setFormValues((prev) => ({
                          ...prev,
                          diagnosis: Array.isArray(value) ? value[0] : value || "",
                        }));
                        setFormErrors((prev) => ({ ...prev, diagnosis: "" }));
                      }}
                      options={diagnosisOptions}
                      placeholder="Select Diagnosis"
                      mode="single"
                      background="white"
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
                    />
                    {formErrors.dietSchedule && (
                      <p className="mt-1 text-xs text-[#F6776E]">{formErrors.dietSchedule}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold leading-[120%] text-[#262D3B]">Diet Categories</h3>
                  <div className="space-y-6">
                    {Object.entries(dietCategories).map(([categoryName, items]) => (
                      <div key={categoryName} className="space-y-3">
                        <h4 className="text-xs font-medium text-[#434956]">{categoryName}</h4>
                        <div className="flex flex-wrap gap-2">
                          {items.map((item) => {
                            const isSelected = formValues.selectedCategories.includes(item);
                            return (
                              <button
                                key={item}
                                type="button"
                                onClick={() => toggleCategory(item)}
                                className={`inline-flex h-[30px] items-center justify-center rounded-[30px] border px-4 text-xs font-semibold leading-[120%] transition-colors ${
                                  isSelected
                                    ? "border-[#0B8C00] bg-[#0B8C00] text-white"
                                    : "border-[#0B8C00]/20 bg-[#0B8C00]/20 text-[#0B8C00] hover:bg-[#0B8C00]/30"
                                }`}
                              >
                                {item}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  {formErrors.selectedCategories && (
                    <p className="mt-1 text-xs text-[#F6776E]">{formErrors.selectedCategories}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" variant="primary">
                    {isEditing ? "Update Diet" : "Add Diet"}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </ListBorder>
        )}
      </div>
    </AppShell>
  );
}


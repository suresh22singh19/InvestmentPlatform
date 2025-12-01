"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
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
} from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";

type DietCategory = {
  id: number;
  dietCategory: string;
  dietFood: string[];
  remark: string;
};

const initialDietCategories: DietCategory[] = [
  {
    id: 1,
    dietCategory: "Oats with Fruits",
    dietFood: ["Salad", "Salad", "Salad", "Salad", "Salad", "Fruit", "Yogurt", "Nuts", "Honey", "Berries", "Banana", "Apple", "Oats", "Milk", "Granola"],
    remark: "Lorem Ipsum is simply dummy text of the printing",
  },
  {
    id: 2,
    dietCategory: "Green Salad",
    dietFood: ["Salad", "Salad", "Salad", "Salad", "Salad", "Lettuce", "Spinach", "Cucumber", "Tomato", "Avocado", "Olive Oil", "Lemon", "Pepper", "Salt", "Herbs"],
    remark: "Lorem Ipsum is simply dummy text of the printing",
  },
  {
    id: 3,
    dietCategory: "Vegetable Smoothie",
    dietFood: ["Salad", "Salad", "Salad", "Salad", "Salad", "Carrot", "Celery", "Kale", "Spinach", "Ginger", "Lemon", "Apple", "Cucumber", "Beetroot", "Water"],
    remark: "Lorem Ipsum is simply dummy text of the printing",
  },
  {
    id: 4,
    dietCategory: "Detox Salad",
    dietFood: ["Salad", "Salad", "Salad", "Salad", "Salad", "Cabbage", "Carrot", "Radish", "Bell Pepper", "Cilantro", "Lime", "Salt", "Pepper", "Olive Oil", "Vinegar"],
    remark: "Lorem Ipsum is simply dummy text of the printing",
  },
  {
    id: 5,
    dietCategory: "Boiled Eggs",
    dietFood: ["Salad", "Salad", "Salad", "Salad", "Salad", "Eggs", "Salt", "Pepper", "Butter", "Bread", "Cheese", "Ham", "Tomato", "Lettuce", "Mayonnaise"],
    remark: "Lorem Ipsum is simply dummy text of the printing",
  },
  {
    id: 6,
    dietCategory: "Fresh Juice",
    dietFood: ["Salad", "Salad", "Salad", "Salad", "Salad", "Orange", "Apple", "Carrot", "Beetroot", "Ginger", "Lemon", "Mint", "Water", "Ice", "Sugar"],
    remark: "Lorem Ipsum is simply dummy text of the printing",
  },
];

export default function DietCategoryPage() {
  const [dietCategories, setDietCategories] = useState<DietCategory[]>(initialDietCategories);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
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
  const [dietFoodInput, setDietFoodInput] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const filteredDietCategories = useMemo(() => {
    return dietCategories.filter((category) => {
      return (
        category.dietCategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.remark.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [dietCategories, searchTerm]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDietCategories = filteredDietCategories.slice(startIndex, startIndex + itemsPerPage);

  const handleViewFood = (foodItems: string[]) => {
    setSelectedFoodItems(foodItems);
    setViewFoodDialogOpen(true);
  };

  const handleEdit = (category: DietCategory) => {
    setSelectedDietCategory(category);
    setFormValues({
      dietCategory: category.dietCategory,
      dietFoodItems: [...category.dietFood],
      remark: category.remark,
    });
    setDietFoodInput("");
    setFormErrors({});
    setEditDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedDietCategory(null);
    setFormValues({
      dietCategory: "",
      dietFoodItems: [],
      remark: "",
    });
    setDietFoodInput("");
    setFormErrors({});
    setAddDialogOpen(true);
  };

  const handleAddFoodItem = () => {
    if (dietFoodInput.trim()) {
      setFormValues((prev) => ({
        ...prev,
        dietFoodItems: [...prev.dietFoodItems, dietFoodInput.trim()],
      }));
      setDietFoodInput("");
      setFormErrors((prev) => ({ ...prev, dietFood: "" }));
    }
  };

  const handleRemoveFoodItem = (index: number) => {
    setFormValues((prev) => ({
      ...prev,
      dietFoodItems: prev.dietFoodItems.filter((_, i) => i !== index),
    }));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formValues.dietCategory.trim()) errors.dietCategory = "Diet Category is required";
    if (formValues.dietFoodItems.length === 0) errors.dietFood = "At least one diet food item is required";
    if (!formValues.remark.trim()) errors.remark = "Remark is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;

    if (selectedDietCategory) {
      // Update existing category
      setDietCategories((prev) =>
        prev.map((cat) =>
          cat.id === selectedDietCategory.id
            ? {
                ...cat,
                dietCategory: formValues.dietCategory.trim(),
                dietFood: formValues.dietFoodItems,
                remark: formValues.remark.trim(),
              }
            : cat
        )
      );
      setEditDialogOpen(false);
    } else {
      // Add new category
      const newCategory: DietCategory = {
        id: dietCategories.length + 1,
        dietCategory: formValues.dietCategory.trim(),
        dietFood: formValues.dietFoodItems,
        remark: formValues.remark.trim(),
      };
      setDietCategories((prev) => [...prev, newCategory]);
      setAddDialogOpen(false);
    }

    setFormValues({
      dietCategory: "",
      dietFoodItems: [],
      remark: "",
    });
    setDietFoodInput("");
    setFormErrors({});
    setSelectedDietCategory(null);
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

  // Display first 5 food items, then show "View all +X"
  const displayFoodItems = (foodItems: string[]) => {
    const visibleItems = foodItems.slice(0, 5);
    const remainingCount = foodItems.length - 5;

    return (
      <div className="flex flex-wrap items-center gap-2">
        {visibleItems.map((food, index) => (
          <span
            key={index}
            className="inline-flex h-[30px] items-center justify-center rounded-[30px] border border-[#FDC70F]/32 bg-[#FDC70F]/5 px-4 text-xs font-semibold leading-[120%] text-[#9A7909]"
          >
            {food}
          </span>
        ))}
        {remainingCount > 0 && (
          <button
            type="button"
            onClick={() => handleViewFood(foodItems)}
            className="inline-flex h-[30px] items-center justify-center rounded-[30px] border border-[#FDC70F]/32 bg-[#FDC70F]/5 px-4 text-xs font-semibold leading-[120%] text-[#9A7909]"
          >
            View all +{remainingCount}
          </button>
        )}
      </div>
    );
  };

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <PageHeading title="Settings" />
        </div>

        <ListBorder as="section" className="px-4 py-4">
          <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold leading-[120%] text-[#434956]">Diet Category</h2>

              <div className="flex items-center gap-3">
                <TableSearchInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search Here..."
                />
               
                <button
                  type="button"
                  className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2]"
                  onClick={handleAdd}
                >
                  <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                  Add Diet Category
                </button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead position="first" className="whitespace-nowrap">
                    Sr no.
                  </TableHead>
                  <TableHead sortable sortDirection={getSortDirection("dietCategory")} onSort={() => {}}>
                    Diet Category
                  </TableHead>
                  <TableHead sortable sortDirection={getSortDirection("dietFood")} onSort={() => {}}>
                    Diet Food
                  </TableHead>
                  <TableHead sortable sortDirection={getSortDirection("remark")} onSort={() => {}}>
                    Remark
                  </TableHead>
                  <TableHead position="last" >
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDietCategories.length === 0 ? (
                  <TableRow>
                    <TableData colSpan={5} className="py-12 text-center text-sm text-[#9CA3AF]">
                      No diet categories found
                    </TableData>
                  </TableRow>
                ) : (
                  paginatedDietCategories.map((category, index) => (
                    <TableRow key={category.id}>
                      <TableData position="first">{startIndex + index + 1}</TableData>
                      <TableData>{category.dietCategory}</TableData>
                      <TableData>{displayFoodItems(category.dietFood)}</TableData>
                      <TableData>{category.remark}</TableData>
                      <TableData position="last">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleEdit(category)}
                            className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                            aria-label="Edit diet category"
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

            {filteredDietCategories.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={filteredDietCategories.length}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
                itemsPerPageOptions={[6, 10, 20, 50]}
              />
            )}
          </div>
        </ListBorder>
      </div>

      {/* View Food Items Dialog */}
      <Dialog
        open={viewFoodDialogOpen}
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
        open={addDialogOpen}
        onClose={() => {
          setAddDialogOpen(false);
          setFormErrors({});
          setSelectedDietCategory(null);
          setDietFoodInput("");
        }}
        title="Add Diet Category"
        width={949}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <FormInputField
              label="Diet Category"
              value={formValues.dietCategory}
              onChange={(event) => {
                setFormValues((prev) => ({ ...prev, dietCategory: event.target.value }));
                setFormErrors((prev) => ({ ...prev, dietCategory: "" }));
              }}
              height={44}
              placeholder="Diet Category"
              required
            />
            {formErrors.dietCategory && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.dietCategory}</p>}
          </div>

          <div className="space-y-3">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <FormInputField
                  label="Diet Food"
                  value={dietFoodInput}
                  onChange={(event) => {
                    setDietFoodInput(event.target.value);
                    setFormErrors((prev) => ({ ...prev, dietFood: "" }));
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleAddFoodItem();
                    }
                  }}
                  height={44}
                  placeholder="Diet Food"
                />
              </div>
              <button
                type="button"
                onClick={handleAddFoodItem}
                className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] focus:outline-none focus:ring-2 focus:ring-[#0B8C00]/20"
              >
                <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                Add
              </button>
            </div>
            {formValues.dietFoodItems.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-semibold leading-[120%] text-[#262D3B]">Diet Food</label>
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
                        className="flex h-4 w-4 items-center justify-center transition-colors hover:opacity-80"
                        aria-label="Remove food item"
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
              label="Remark"
              value={formValues.remark}
              onChange={(event) => {
                setFormValues((prev) => ({ ...prev, remark: event.target.value }));
                setFormErrors((prev) => ({ ...prev, remark: "" }));
              }}
              height={73}
              placeholder="Remark"
              required
            />
            {formErrors.remark && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.remark}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="primary">
              Add Diet Category
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAddDialogOpen(false);
                setFormErrors({});
                setSelectedDietCategory(null);
                setDietFoodInput("");
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Edit Diet Category Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setFormErrors({});
          setSelectedDietCategory(null);
          setDietFoodInput("");
        }}
        title="Edit Diet Category"
        width={949}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <FormInputField
              label="Diet Category"
              value={formValues.dietCategory}
              onChange={(event) => {
                setFormValues((prev) => ({ ...prev, dietCategory: event.target.value }));
                setFormErrors((prev) => ({ ...prev, dietCategory: "" }));
              }}
              height={44}
              placeholder="Diet Category"
              required
            />
            {formErrors.dietCategory && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.dietCategory}</p>}
          </div>

          <div className="space-y-3">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <FormInputField
                  label="Diet Food"
                  value={dietFoodInput}
                  onChange={(event) => {
                    setDietFoodInput(event.target.value);
                    setFormErrors((prev) => ({ ...prev, dietFood: "" }));
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleAddFoodItem();
                    }
                  }}
                  height={44}
                  placeholder="Diet Food"
                />
              </div>
              <button
                type="button"
                onClick={handleAddFoodItem}
                className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] focus:outline-none focus:ring-2 focus:ring-[#0B8C00]/20"
              >
                <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                Add
              </button>
            </div>
            {formValues.dietFoodItems.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-semibold leading-[120%] text-[#262D3B]">Diet Food</label>
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
                        className="flex h-4 w-4 items-center justify-center transition-colors hover:opacity-80"
                        aria-label="Remove food item"
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
              label="Remark"
              value={formValues.remark}
              onChange={(event) => {
                setFormValues((prev) => ({ ...prev, remark: event.target.value }));
                setFormErrors((prev) => ({ ...prev, remark: "" }));
              }}
              height={73}
              placeholder="Remark"
              required
            />
            {formErrors.remark && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.remark}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="primary">
              Update Diet Category
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setFormErrors({});
                setSelectedDietCategory(null);
                setDietFoodInput("");
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Dialog>
    </AppShell>
  );
}


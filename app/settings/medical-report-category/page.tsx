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

type MedicalReportCategory = {
  id: number;
  category: string;
  description: string;
  status: "Active" | "Inactive";
  createdAt: string;
};

const statusOptions: SelectOption[] = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
];

const initialCategories: MedicalReportCategory[] = [
  {
    id: 1,
    category: "BLOOD SUGAR",
    description: "BLOOD SUGAR",
    status: "Active",
    createdAt: "11-05-2023",
  },
  {
    id: 2,
    category: "CBC",
    description: "CBC",
    status: "Active",
    createdAt: "11-05-2023",
  },
  {
    id: 3,
    category: "CRP",
    description: "CRP",
    status: "Inactive",
    createdAt: "11-05-2023",
  },
  {
    id: 4,
    category: "DTPA SCAN",
    description: "DTPA SCAN",
    status: "Active",
    createdAt: "11-05-2023",
  },
  {
    id: 5,
    category: "ECG",
    description: "ECG",
    status: "Active",
    createdAt: "11-05-2023",
  },
  {
    id: 6,
    category: "ECHO",
    description: "ECHO",
    status: "Active",
    createdAt: "11-05-2023",
  },
];

export default function MedicalReportCategoryPage() {
  const [categories, setCategories] = useState<MedicalReportCategory[]>(initialCategories);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [dialogMode, setDialogMode] = useState<"add" | "edit" | "view" | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<MedicalReportCategory | null>(null);
  const [formValues, setFormValues] = useState({
    category: "",
    description: "",
    status: "Active" as "Active" | "Inactive",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      return (
        cat.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [categories, searchTerm]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCategories = filteredCategories.slice(startIndex, startIndex + itemsPerPage);

  const handleAddNew = () => {
    setFormValues({
      category: "",
      description: "",
      status: "Active",
    });
    setFormErrors({});
    setSelectedCategory(null);
    setDialogMode("add");
  };

  const handleEdit = (category: MedicalReportCategory) => {
    setSelectedCategory(category);
    setFormValues({
      category: category.category,
      description: category.description,
      status: category.status,
    });
    setFormErrors({});
    setDialogMode("edit");
  };

  const handleView = (category: MedicalReportCategory) => {
    setSelectedCategory(category);
    setFormValues({
      category: category.category,
      description: category.description,
      status: category.status,
    });
    setFormErrors({});
    setDialogMode("view");
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formValues.category.trim()) errors.category = "Category is required";
    if (!formValues.description.trim()) errors.description = "Description is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;

    if (dialogMode === "edit" && selectedCategory) {
      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === selectedCategory.id
            ? {
                ...cat,
                category: formValues.category.trim(),
                description: formValues.description.trim(),
                status: formValues.status,
              }
            : cat
        )
      );
    } else if (dialogMode === "add") {
      const newId = Math.max(...categories.map((cat) => cat.id), 0) + 1;
      setCategories((prev) => [
        ...prev,
        {
          id: newId,
          category: formValues.category.trim(),
          description: formValues.description.trim(),
          status: formValues.status,
          createdAt: new Date().toLocaleString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }),
        },
      ]);
    }

    setDialogMode(null);
    setFormValues({
      category: "",
      description: "",
      status: "Active",
    });
    setFormErrors({});
    setSelectedCategory(null);
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

  const getStatusBadgeClass = (status: "Active" | "Inactive") => {
    switch (status) {
      case "Active":
        return "border-[#0B8C00]/20 bg-[#0B8C000D] text-[#0B8C00]";
      case "Inactive":
        return "border-[#F6776E]/24 bg-[#F6776E0D] text-[#F6776E]";
      default:
        return "";
    }
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
              <h2 className="text-lg font-semibold leading-[120%] text-[#434956]">Medical Report Category</h2>

              <div className="flex items-center gap-3">
                <TableSearchInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search Here..."
                />
                <button
                  type="button"
                  className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2]"
                  onClick={handleAddNew}
                >
                  <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                  Add Medical Report Category
                </button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead position="first" className="whitespace-nowrap">
                    Sr no.
                  </TableHead>
                  <TableHead sortable sortDirection={getSortDirection("category")} onSort={() => {}}>
                    Category
                  </TableHead>
                  <TableHead sortable sortDirection={getSortDirection("description")} onSort={() => {}}>
                    Description
                  </TableHead>
                  <TableHead sortable sortDirection={getSortDirection("status")} onSort={() => {}}>
                    Status
                  </TableHead>
                  <TableHead sortable sortDirection={getSortDirection("createdAt")} onSort={() => {}}>
                    Created Date
                  </TableHead>
                  <TableHead position="last" sortable sortDirection={null} onSort={() => {}}>
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCategories.length === 0 ? (
                  <TableRow>
                    <TableData colSpan={6} className="py-12 text-center text-sm text-[#9CA3AF]">
                      No medical report categories found
                    </TableData>
                  </TableRow>
                ) : (
                  paginatedCategories.map((category, index) => (
                    <TableRow key={category.id}>
                      <TableData position="first">{startIndex + index + 1}</TableData>
                      <TableData>{category.category}</TableData>
                      <TableData>{category.description}</TableData>
                      <TableData>
                        <span
                          className={`inline-flex h-[30px] min-w-[86px] items-center justify-center rounded-[30px] border px-5 text-xs font-medium leading-[120%] ${getStatusBadgeClass(category.status)}`}
                        >
                          {category.status}
                        </span>
                      </TableData>
                      <TableData className="whitespace-nowrap">{category.createdAt}</TableData>
                      <TableData position="last">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleView(category)}
                            className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                            aria-label="View category"
                          >
                            <Image
                              src="/icons/ViewEyeIcon.svg"
                              alt="View"
                              width={20}
                              height={20}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEdit(category)}
                            className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                            aria-label="Edit category"
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

            {filteredCategories.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={filteredCategories.length}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
                itemsPerPageOptions={[6, 10, 20, 50]}
              />
            )}
          </div>
        </ListBorder>
      </div>

      {/* Add/Edit/View Dialog */}
      <Dialog
        open={dialogMode !== null}
        onClose={() => {
          setDialogMode(null);
          setFormErrors({});
          setSelectedCategory(null);
        }}
        title={
          dialogMode === "add"
            ? "Add Medical Report Category"
            : dialogMode === "edit"
              ? "Edit Medical Report Category"
              : "View Medical Report Category"
        }
        width={949}
      >
        <form onSubmit={dialogMode !== "view" ? handleSubmit : (e) => e.preventDefault()} className="space-y-6">
          <div className="space-y-6">
            <div>
              <FormInputField
                label="Category"
                value={formValues.category}
                onChange={(event) => {
                  if (dialogMode === "view") return;
                  setFormValues((prev) => ({ ...prev, category: event.target.value }));
                  setFormErrors((prev) => ({ ...prev, category: "" }));
                }}
                height={44}
                placeholder="Category"
                required={dialogMode !== "view"}
                disabled={dialogMode === "view"}
              />
              {formErrors.category && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.category}</p>}
            </div>

            <div>
              <FormInputField
                label="Description"
                value={formValues.description}
                onChange={(event) => {
                  if (dialogMode === "view") return;
                  setFormValues((prev) => ({ ...prev, description: event.target.value }));
                  setFormErrors((prev) => ({ ...prev, description: "" }));
                }}
                height={44}
                placeholder="Description"
                required={dialogMode !== "view"}
                disabled={dialogMode === "view"}
              />
              {formErrors.description && (
                <p className="mt-1 text-xs text-[#F6776E]">{formErrors.description}</p>
              )}
            </div>

            <div>
              <FormSelectField
                label="Status"
                value={formValues.status}
                onChange={(value) => {
                  if (dialogMode === "view") return;
                  setFormValues((prev) => ({
                    ...prev,
                    status: (Array.isArray(value) ? value[0] : value || "Active") as "Active" | "Inactive",
                  }));
                }}
                options={statusOptions}
                placeholder="Status"
                mode="single"
                background="white"
                disabled={dialogMode === "view"}
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
                  setSelectedCategory(null);
                }}
              >
                Close
              </Button>
            ) : (
              <>
                <Button type="submit" variant="primary">
                  {dialogMode === "add" ? "Add Medical Report Category" : "Update Medical Report Category"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogMode(null);
                    setFormErrors({});
                    setSelectedCategory(null);
                  }}
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </form>
      </Dialog>
    </AppShell>
  );
}


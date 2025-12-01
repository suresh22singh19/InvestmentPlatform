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
  ExportButton,
  PanelCard,
} from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import type { SelectOption } from "@/components/ui/FormSelectField";

type Panel = {
  id: number;
  name: string;
  status: "Active" | "Inactive";
};

const initialPanels: Panel[] = [
  { id: 1, name: "NORMAL", status: "Active" },
  { id: 2, name: "CGHS", status: "Inactive" },
  { id: 3, name: "DGHS", status: "Active" },
  { id: 4, name: "CAPF", status: "Active" },
  { id: 5, name: "RGHS", status: "Active" },
  { id: 6, name: "NDMC", status: "Active" },
  { id: 7, name: "DJB", status: "Active" },
  { id: 8, name: "DDA", status: "Active" },
  { id: 9, name: "PGE", status: "Active" },
  { id: 10, name: "Himachal Govt Employees", status: "Active" },
  { id: 11, name: "UGE", status: "Active" },
  { id: 12, name: "HGE", status: "Active" },
  { id: 13, name: "DGE", status: "Active" },
  { id: 14, name: "RGE", status: "Active" },
  { id: 15, name: "UPGE", status: "Active" },
];

const statusOptions: SelectOption[] = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
];

const STORAGE_KEY = "panel-page-state";

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
      // If stored itemsPerPage is less than 10, update to 10 for new default
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

export default function PanelPage() {
  const [panels, setPanels] = useState<Panel[]>(initialPanels);
  const [searchTerm, setSearchTerm] = useState<string>(() => loadState().searchTerm);
  const [currentPage, setCurrentPage] = useState<number>(() => loadState().currentPage);
  const [itemsPerPage, setItemsPerPage] = useState<number>(() => loadState().itemsPerPage);
  const [dialogMode, setDialogMode] = useState<"add" | "edit" | "view" | null>(null);
  const [selectedPanel, setSelectedPanel] = useState<Panel | null>(null);
  const [formValues, setFormValues] = useState({
    name: "",
    status: "Active" as "Active" | "Inactive",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Save state to localStorage whenever it changes
  useEffect(() => {
    saveState({
      searchTerm,
      currentPage,
      itemsPerPage,
    });
  }, [searchTerm, currentPage, itemsPerPage]);

  // Filter panels based on search
  const filteredPanels = panels.filter((panel) => {
    const matchesSearch = panel.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Paginate data
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPanels = filteredPanels.slice(startIndex, endIndex);

  const handleAddNew = () => {
    setFormValues({
      name: "",
      status: "Active",
    });
    setFormErrors({});
    setSelectedPanel(null);
    setDialogMode("add");
  };

  const handleEdit = (panel: Panel) => {
    setSelectedPanel(panel);
    setFormValues({
      name: panel.name,
      status: panel.status,
    });
    setFormErrors({});
    setDialogMode("edit");
  };

  const handleView = (panel: Panel) => {
    setSelectedPanel(panel);
    setFormValues({
      name: panel.name,
      status: panel.status,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (dialogMode === "edit" && selectedPanel) {
      setPanels((prev) =>
        prev.map((panel) =>
          panel.id === selectedPanel.id
            ? {
                ...panel,
                name: formValues.name.trim(),
                status: formValues.status,
              }
            : panel
        )
      );
    } else if (dialogMode === "add") {
      const newId = Math.max(...panels.map((panel) => panel.id), 0) + 1;
      setPanels((prev) => [
        ...prev,
        {
          id: newId,
          name: formValues.name.trim(),
          status: formValues.status,
        },
      ]);
    }

    setDialogMode(null);
    setFormValues({
      name: "",
      status: "Active",
    });
    setFormErrors({});
    setSelectedPanel(null);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  const handleExport = () => {
    // Export functionality
    console.log("Exporting panels...", filteredPanels);
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
              <h2 className="text-lg font-semibold leading-[120%] text-[#434956]">Panel</h2>

              <div className="flex items-center gap-3">
                <TableSearchInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search Here..."
                />
                <ExportButton onClick={handleExport} />
                <button
                  type="button"
                  className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2]"
                  onClick={handleAddNew}
                >
                  <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                  Add Panel
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {paginatedPanels.map((panel) => (
                <PanelCard
                  key={panel.id}
                  id={panel.id}
                  name={panel.name}
                  status={panel.status}
                  onView={() => handleView(panel)}
                  onEdit={() => handleEdit(panel)}
                />
              ))}
            </div>

            {filteredPanels.length === 0 && (
              <div className="py-12 text-center text-sm text-[#9CA3AF]">No panels found</div>
            )}

            {filteredPanels.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={filteredPanels.length}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
                itemsPerPageOptions={[10, 20, 50,100]}
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
          setSelectedPanel(null);
        }}
        title={dialogMode === "add" ? "Add Panel" : dialogMode === "edit" ? "Edit Panel" : "View Panel"}
        width={686}
      >
        <form onSubmit={dialogMode !== "view" ? handleSubmit : (e) => e.preventDefault()} className="space-y-6">
          <div className="space-y-6">
            <div>
              <FormInputField
                label="Name"
                value={formValues.name}
                onChange={(event) => {
                  if (dialogMode === "view") return;
                  setFormValues((prev) => ({ ...prev, name: event.target.value }));
                  setFormErrors((prev) => ({ ...prev, name: "" }));
                }}
                height={44}
                placeholder="Name"
                required={dialogMode !== "view"}
                disabled={dialogMode === "view"}
              />
              {formErrors.name && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.name}</p>}
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
                  setSelectedPanel(null);
                }}
              >
                Close
              </Button>
            ) : (
              <>
                <Button type="submit" variant="primary">
                  {dialogMode === "add" ? "Save" : "Update"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogMode(null);
                    setFormErrors({});
                    setSelectedPanel(null);
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


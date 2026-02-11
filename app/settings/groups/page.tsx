"use client";

import Image from "next/image";
import { useState, useEffect, useRef, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
  Button,
  Dialog,
  FormInputField,
  FormTextareaField,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableData,
  TableSearchInput,
  Pagination,
  ExportButton,
} from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import { useGetGroupsQuery, useCreateGroupMutation, useUpdateGroupMutation } from "@/store/api/settingsApi";
import { useDebounce } from "@/hooks/useDebounce";

type Group = {
  id: number;
  name: string;
  description: string;
};

const STORAGE_KEY = "groups-page-state";

type Filters = {
  searchTerm: string;
  currentPage: number;
  itemsPerPage: number;
  sortField: string;
  sortOrder: "asc" | "desc";
};

const loadState = (): Filters => {
  if (typeof window === "undefined") {
    return {
      searchTerm: "",
      currentPage: 1,
      itemsPerPage: 10,
      sortField: "",
      sortOrder: "asc",
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
    sortField: "",
    sortOrder: "asc",
  };
};

const saveState = (state: Filters) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save state to localStorage:", error);
  }
};

export default function GroupsPage() {
  const [filters, setFilters] = useState<Filters>(() => loadState());
  const [dialogMode, setDialogMode] = useState<"add" | "edit" | "view" | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [formValues, setFormValues] = useState({
    name: "",
    description: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Debounce search to avoid too many API calls
  const debouncedSearchTerm = useDebounce(filters.searchTerm, 500);
  const prevSearchTermRef = useRef(filters.searchTerm);

  // Reset to first page when search term changes
  useEffect(() => {
    if (prevSearchTermRef.current !== filters.searchTerm) {
      prevSearchTermRef.current = filters.searchTerm;
      setFilters((prev) => ({ ...prev, currentPage: 1 }));
    }
  }, [filters.searchTerm]);

  // Fetch groups from API
  const { data: groupsData, isLoading: isLoadingGroups, refetch: refetchGroups } = useGetGroupsQuery({
    page: filters.currentPage,
    limit: filters.itemsPerPage,
    sort: filters.sortField || undefined,
    order: filters.sortField ? filters.sortOrder : undefined,
    search: debouncedSearchTerm || undefined,
  });
  const [createGroup, { isLoading: isCreating }] = useCreateGroupMutation();
  const [updateGroup, { isLoading: isUpdating }] = useUpdateGroupMutation();

  // Map API data to UI format with safety checks
  const groups: Group[] = useMemo(() => {
    try {
      if (!groupsData?.data || !Array.isArray(groupsData.data)) {
        return [];
      }
      // Ensure each group has required fields
      return groupsData.data.filter((group): group is Group => 
        group && typeof group === "object" && "id" in group
      );
    } catch (error) {
      console.error("Error processing groups data:", error);
      return [];
    }
  }, [groupsData]);

  const totalItems = groupsData?.total || 0;

  // Save state to localStorage whenever it changes
  useEffect(() => {
    saveState(filters);
  }, [filters]);

  const handleSort = (field: string) => {
    setFilters((prev) => {
      if (prev.sortField === field) {
        // Toggle order if same field
        return { ...prev, sortOrder: prev.sortOrder === "asc" ? "desc" : "asc" };
      } else {
        // Set new field with ascending order
        return { ...prev, sortField: field, sortOrder: "asc" };
      }
    });
  };

  const handleAddNew = () => {
    setFormValues({
      name: "",
      description: "",
    });
    setFormErrors({});
    setSelectedGroup(null);
    setDialogMode("add");
  };

  const handleEdit = (group: Group) => {
    if (!group) return;
    setSelectedGroup(group);
    setFormValues({
      name: group?.name || "",
      description: group?.description || "",
    });
    setFormErrors({});
    setDialogMode("edit");
  };

  const handleView = (group: Group) => {
    if (!group) return;
    setSelectedGroup(group);
    setFormValues({
      name: group?.name || "",
      description: group?.description || "",
    });
    setDialogMode("view");
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formValues.name.trim()) {
      errors.name = "Name is required";
    }

    if (!formValues.description.trim()) {
      errors.description = "Description is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      if (dialogMode === "edit" && selectedGroup) {
        await updateGroup({
          id: selectedGroup.id,
          name: formValues.name.trim(),
          description: formValues.description.trim(),
        }).unwrap();
      } else if (dialogMode === "add") {
        await createGroup({
          name: formValues.name.trim(),
          description: formValues.description.trim(),
        }).unwrap();
      }

      // Refetch the data after successful create/update
      // Wrap in try-catch to prevent page break if refetch fails
      try {
        await refetchGroups();
      } catch (refetchError) {
        // Log but don't break the flow - data was already saved
        console.warn("Failed to refetch groups after save:", refetchError);
      }

      // Only close dialog and reset if save was successful
      setDialogMode(null);
      setFormValues({
        name: "",
        description: "",
      });
      setFormErrors({});
      setSelectedGroup(null);
    } catch (error: any) {
      // Prevent page break by safely extracting error message
      let errorMessage = "Failed to save group. Please try again.";
      
      try {
        if (error && typeof error === "object") {
          // RTK Query errors have a specific structure
          if (error.data) {
            errorMessage = error.data.message || errorMessage;
          } else if (error.message) {
            errorMessage = error.message;
          } else if (error.status) {
            errorMessage = `Server error (${error.status}). Please try again.`;
          }
        } else if (typeof error === "string") {
          errorMessage = error;
        }
      } catch (parseError) {
        // If error parsing fails, use default message
        console.warn("Error parsing error object:", parseError);
      }
      
      // Log error details for debugging
      console.error("Error saving group:", {
        error,
        errorMessage,
        status: error?.status,
        data: error?.data,
      });
      
      // Set form errors to display to user - keep dialog open so user can retry
      setFormErrors({
        submit: errorMessage,
      });
      
      // Don't close dialog or reset form - let user see the error and retry
    }
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, currentPage: page }));
  };

  const handleItemsPerPageChange = (items: number) => {
    setFilters((prev) => ({ ...prev, itemsPerPage: items, currentPage: 1 }));
  };

  const handleExportPDF = () => {
    // Export to PDF functionality
    console.log("Exporting groups to PDF...", groups);
  };

  const handleExportCSV = () => {
    // Export to CSV functionality
    console.log("Exporting groups to CSV...", groups);
  };

  const getSortDirection = (field: string): "asc" | "desc" | null => {
    if (filters.sortField === field) {
      return filters.sortOrder;
    }
    return null;
  };

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <PageHeading title="Groups" />
        </div>

        <ListBorder as="section" className="px-4 py-4">
          <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold leading-[120%] text-[#434956]"></h2>

              <div className="flex items-center gap-3">
                <TableSearchInput
                  value={filters.searchTerm}
                  onChange={(value) => setFilters((prev) => ({ ...prev, searchTerm: value }))}
                  placeholder="Search Here..."
                />
                <ExportButton onExportPDF={handleExportPDF} onExportCSV={handleExportCSV} />
                <button
                  type="button"
                  className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] whitespace-nowrap"
                  onClick={handleAddNew}
                >
                  <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                  Add Groups
                </button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead position="first" className="w-20">
                    Sr no.
                  </TableHead>
                  <TableHead
                    sortable
                    sortDirection={getSortDirection("name")}
                    onSort={() => handleSort("name")}
                  >
                    Name
                  </TableHead>
                  <TableHead
                    sortable
                    sortDirection={getSortDirection("description")}
                    onSort={() => handleSort("description")}
                  >
                    Description
                  </TableHead>
                  <TableHead
                    position="last"
                    // sortable

                    className="w-32"
                  >
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingGroups ? (
                  <TableRow>
                    <TableData colSpan={4} className="text-center text-sm text-[#9CA3AF] py-8">
                      Loading...
                    </TableData>
                  </TableRow>
                ) : groups.length === 0 ? (
                  <TableRow>
                    <TableData colSpan={4} className="text-center text-sm text-[#9CA3AF] py-8">
                      No groups found
                    </TableData>
                  </TableRow>
                ) : (
                  groups.map((group, index) => (
                    <TableRow key={group?.id || `group-${index}`}>
                      <TableData position="first">{(filters.currentPage - 1) * filters.itemsPerPage + index + 1}</TableData>
                      <TableData>{group?.name ? group.name : "-"}</TableData>
                      <TableData>{group?.description ? group.description : "-"}</TableData>
                      <TableData position="last">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleView(group)}
                            className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                            aria-label="View group"
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
                            onClick={() => handleEdit(group)}
                            className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                            aria-label="Edit group"
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

            {totalItems > 0 && (
              <Pagination
                currentPage={filters.currentPage}
                totalItems={totalItems}
                itemsPerPage={filters.itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
                itemsPerPageOptions={[10, 20, 50, 100]}
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
          setFormValues({
            name: "",
            description: "",
          });
          setSelectedGroup(null);
        }}
        title={dialogMode === "add" ? "Add Groups" : dialogMode === "edit" ? "Edit Groups" : "View Group"}
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
              <FormTextareaField
                label="Description"
                value={formValues.description}
                onChange={(event) => {
                  if (dialogMode === "view") return;
                  setFormValues((prev) => ({ ...prev, description: event.target.value }));
                  setFormErrors((prev) => ({ ...prev, description: "" }));
                }}
                height={94}
                placeholder="Write a description..."
                required={dialogMode !== "view"}
                disabled={dialogMode === "view"}
              />
              {formErrors.description && (
                <p className="mt-1 text-xs text-[#F6776E]">{formErrors.description}</p>
              )}
            </div>

            {formErrors.submit && (
              <div className="rounded-md bg-[#FEF2F2] border border-[#FECACA] p-3">
                <p className="text-sm text-[#F6776E]">{formErrors.submit}</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {dialogMode === "view" ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogMode(null);
                  setFormErrors({});
                  setSelectedGroup(null);
                }}
              >
                Close
              </Button>
            ) : (
              <>
                <Button type="submit" variant="primary" disabled={isCreating || isUpdating}>
                  {(isCreating || isUpdating) ? "Saving..." : dialogMode === "add" ? "Save" : "Update"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogMode(null);
                    setFormErrors({});
                    setSelectedGroup(null);
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
    </AppShell>
  );
}


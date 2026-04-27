"use client";

import Image from "next/image";
import { useState, useEffect, useMemo } from "react";
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
  MessageDialog,
} from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import type { SelectOption } from "@/components/ui/FormSelectField";
import {
  useGetPanelsQuery,
  useCreatePanelMutation,
  useUpdatePanelMutation,
  useGetBranchesQuery,
} from "@/store/api/settingsApi";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { useDebounce } from "@/hooks/useDebounce";
import { useExport, type ExportColumn } from "@/hooks/useExport";
import { API_BASE_URL } from "@/lib/config/api";
import { getVisitClientIp } from "@/lib/api/clientVisitIp";
import { usePermission } from "@/hooks/usePermission";

type Panel = {
  id: number;
  name: string;
  status: "Active" | "Inactive";
  isDefaultPanel?: boolean;
};

const statusOptions: SelectOption[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
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

function capitalizeFirst(str: string | null | undefined): string {
  if (str == null || str === "") return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function branchSelectLabel(name: string, typeRaw: string | null | undefined): string {
  const t = (typeRaw ?? "").trim();
  if (!t) return name;
  return `${name} (${capitalizeFirst(t)})`;
}

export default function PanelPage() {
  const panelPermission = usePermission("settings", { subModule: "panel" });
  const canView = panelPermission.canView;
  const canAdd = panelPermission.canAdd;
  const canEdit = panelPermission.canEdit;
  const canDownload = panelPermission.canDownload;

  const [searchTerm, setSearchTerm] = useState<string>(() => loadState().searchTerm);
  const [currentPage, setCurrentPage] = useState<number>(() => loadState().currentPage);
  const [itemsPerPage, setItemsPerPage] = useState<number>(() => loadState().itemsPerPage);
  const [dialogMode, setDialogMode] = useState<"add" | "edit" | "view" | null>(null);
  const [selectedPanel, setSelectedPanel] = useState<Panel | null>(null);
  const [formValues, setFormValues] = useState({
    name: "",
    status: "active" as "active" | "inactive",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  /** Add/Edit/View dialog: super admin can change; others locked to the page branch (disabled). */
  const [formBranchId, setFormBranchId] = useState("");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
  const [apiErrorMessage, setApiErrorMessage] = useState("");

  const {
    selectedBranchFilter,
    setSelectedBranchFilter,
    branchFilterOptions,
    isLoadingBranches,
    isBranchFilterDisabled,
    filterBranchId,
    isSuperAdmin: isBranchFilterSuperAdmin,
    branchFilterPersistReady,
  } = useBranchFilter({ persistSuperAdminSelectionKey: "hiims-settings-panel-branch" });

  const { data: branchesListData } = useGetBranchesQuery(undefined);

  /** Superadmin: no "All Branches"; labels include facility type. Non–super-admin: single branch, disabled select. */
  const panelBranchOptions = useMemo((): SelectOption[] => {
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

  const shouldSkipPanelsQuery =
    !canView ||
    !branchFilterPersistReady ||
    filterBranchId === undefined ||
    !Number.isFinite(filterBranchId) ||
    filterBranchId < 1;

  // Debounce search to avoid too many API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  // Trim the debounced search term to remove leading and trailing spaces
  // Only pass to API if trimmed value is not empty (don't hit API for spaces only)
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

  // Fetch panels from API (scoped by branch for super-admin and facility users)
  const { data: panelsData, isLoading: isLoadingPanels, refetch: refetchPanels } = useGetPanelsQuery(
    {
      page: currentPage,
      limit: itemsPerPage,
      search: searchParam,
      sort: "createdAt",
      order: "desc",
      ...(filterBranchId != null && Number.isFinite(filterBranchId) && filterBranchId >= 1
        ? { branchId: filterBranchId }
        : {}),
    },
    {
      skip: shouldSkipPanelsQuery,
      /** Fresh GET whenever branch (or other args) change; avoid stale list after switching branch. */
      refetchOnMountOrArgChange: true,
    }
  );

  // Create panel mutation
  const [createPanel, { isLoading: isCreating }] = useCreatePanelMutation();
  
  // Update panel mutation
  const [updatePanel, { isLoading: isUpdating }] = useUpdatePanelMutation();

  // Map API data to Panel format
  const panels: Panel[] = panelsData?.data?.map((panel: any) => {
    const mappedPanel: Panel = {
      id: panel.id,
      name: panel.name,
      status: panel.status === "active" || panel.status === "Active" ? "Active" : "Inactive",
      isDefaultPanel: (panel as any).isDefaultPanel || false,
    };
    return mappedPanel;
  }) || [];

  // Use panels from API
  const filteredPanels = panels;
  const paginatedPanels = panels;

  const resolveDefaultFormBranchId = () => {
    if (selectedBranchFilter && /^\d+$/.test(selectedBranchFilter)) {
      return selectedBranchFilter;
    }
    if (filterBranchId != null && Number.isFinite(filterBranchId) && filterBranchId >= 1) {
      return String(filterBranchId);
    }
    return "";
  };

  const handleAddNew = () => {
    if (!canAdd) return;
    setFormBranchId(resolveDefaultFormBranchId());
    setFormValues({
      name: "",
      status: "active",
    });
    setFormErrors({});
    setSelectedPanel(null);
    setDialogMode("add");
  };

  const handleEdit = (panel: Panel) => {
    if (!canEdit) return;
    // Prevent editing default panels
    if (panel.isDefaultPanel) {
      return;
    }
    setFormBranchId(resolveDefaultFormBranchId());
    setSelectedPanel(panel);
    setFormValues({
      name: panel.name,
      status: panel.status === "Active" ? "active" : "inactive",
    });
    setFormErrors({});
    setDialogMode("edit");
  };

  const handleView = (panel: Panel) => {
    if (!canView) return;
    setFormBranchId(resolveDefaultFormBranchId());
    setSelectedPanel(panel);
    setFormValues({
      name: panel.name,
      status: panel.status === "Active" ? "active" : "inactive",
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
      
      if (dialogMode === "add") {
        const payload = {
          name: formValues.name.trim(),
          status: formValues.status,
          branchId,
        };

        result = await createPanel(payload).unwrap();
        setSuccessMessage(result?.message || "Panel created successfully");
      } else if (dialogMode === "edit" && selectedPanel) {
        // Prevent updating default panels
        if (selectedPanel.isDefaultPanel) {
          return;
        }
        const payload = {
          id: selectedPanel.id,
          name: formValues.name.trim(),
          status: formValues.status,
          branchId,
        };

        result = await updatePanel(payload).unwrap();
        setSuccessMessage(result?.message || "Panel updated successfully");
      }

      // Show success message
      setShowSuccessDialog(true);

      // Refetch data after successful creation/update
      await refetchPanels();

      setDialogMode(null);
      setFormValues({
        name: "",
        status: "active",
      });
      setFormErrors({});
      setFormBranchId("");
      setSelectedPanel(null);
    } catch (error: any) {
      console.error(`Failed to ${dialogMode === "add" ? "create" : "update"} panel:`, error);
      
      // Handle error - show error message
      let errorMsg = `Failed to ${dialogMode === "add" ? "create" : "update"} panel. Please try again.`;
      
      if (error?.data?.message != null) {
        const m = error.data.message;
        errorMsg = Array.isArray(m) ? m.map(String).join(" ") : String(m);
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

  // Fetch all data for export (without limit)
  const fetchAllDataForExport = async (): Promise<Panel[]> => {
    if (!canDownload) return [];
    try {
      const allPanels: Panel[] = [];
      let page = 1;
      let hasMore = true;
      const limit = 100;
      
      while (hasMore) {
        try {
          const token = typeof window !== 'undefined' 
            ? (localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '')
            : '';
          const visitIp = await getVisitClientIp();
          
          const branchParam =
            filterBranchId != null && Number.isFinite(filterBranchId) && filterBranchId >= 1
              ? `&branchId=${filterBranchId}`
              : "";
          const response = await fetch(
            `${API_BASE_URL}/admin/settings/panel?page=${page}&limit=${limit}&sort=createdAt${branchParam}${trimmedSearchTerm ? `&search=${encodeURIComponent(trimmedSearchTerm)}` : ""}`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : '',
                ...(visitIp ? { 'x-forwarded-for': visitIp } : {}),
              },
            }
          );
          
          if (!response.ok) {
            throw new Error('Failed to fetch data');
          }
          
          const data = await response.json();
          
          if (data?.data && Array.isArray(data.data)) {
            const pagePanels = data.data.map((panel: any) => ({
              id: panel.id,
              name: panel.name,
              status: panel.status === "active" || panel.status === "Active" ? "Active" : "Inactive",
              isDefaultPanel: panel.isDefaultPanel || false,
            }));
            allPanels.push(...pagePanels);
            
            const total = data.total || 0;
            hasMore = allPanels.length < total && pagePanels.length === limit;
            page++;
          } else {
            hasMore = false;
          }
        } catch (error) {
          console.error(`Error fetching page ${page}:`, error);
          hasMore = false;
        }
      }
      
      return allPanels.length > 0 ? allPanels : panels;
    } catch (error) {
      console.error("Error fetching data for export:", error);
      return panels;
    }
  };

  // Export configuration
  const exportColumns: ExportColumn[] = [
    { key: "sr", label: "Sr no." },
    { key: "name", label: "Name" },
    { key: "status", label: "Status" },
  ];

  // Use export hook
  const { handleExportPDF, handleExportCSV, isLoadingPDF, isLoadingCSV } = useExport({
    title: "Panel Reports",
    fileName: "panel_reports",
    columns: exportColumns,
    fetchData: fetchAllDataForExport,
    logoUrl: "/images/logo.png",
  });


  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <PageHeading title="Panel" />
        </div>

        <ListBorder as="section" className="px-4 py-4">
          {!canView ? (
            <div className="rounded-[20px] border border-[#E3EEE1] bg-white px-6 py-10 text-center text-sm text-[#9CA3AF]">
              You don&apos;t have permission to view panel.
            </div>
          ) : (
          <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
            <div className="mb-6 flex min-w-0 flex-nowrap items-center justify-end gap-3 overflow-x-auto">
              <div className="relative shrink-0">
                <FormSelectField
                  label=""
                  hideLabel
                  options={panelBranchOptions}
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
                  onChange={setSearchTerm}
                  placeholder="Search Here..."
                />
              </div>
              {canDownload ? (
                <div className="shrink-0">
                  <ExportButton
                    onExportPDF={handleExportPDF}
                    onExportCSV={handleExportCSV}
                    isLoadingPDF={isLoadingPDF}
                    isLoadingCSV={isLoadingCSV}
                  />
                </div>
              ) : null}
              {canAdd ? (
                <button
                  type="button"
                  className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] whitespace-nowrap"
                  onClick={handleAddNew}
                >
                  <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                  <span className="text-hide">Add Panel</span>
                </button>
              ) : null}
            </div>

            {isLoadingPanels ? (
              <div className="py-12 text-center text-sm text-[#9CA3AF]">Loading...</div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {paginatedPanels.map((panel) => (
                    <PanelCard
                      key={panel.id}
                      id={panel.id}
                      name={panel.name}
                      status={panel.status}
                      isDefaultPanel={panel.isDefaultPanel || false}
                      onView={() => handleView(panel)}
                      onEdit={() => handleEdit(panel)}
                      showViewButton={canView}
                      showEditButton={canEdit}
                    />
                  ))}
                </div>

                {filteredPanels.length === 0 && (
                  <div className="py-12 text-center text-sm text-[#9CA3AF]">No panels found</div>
                )}
              </>
            )}

            {!isLoadingPanels && (panelsData?.total || filteredPanels.length) > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={panelsData?.total || filteredPanels.length}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
                itemsPerPageOptions={[10, 20, 50,100]}
              />
            )}
          </div>
          )}
        </ListBorder>
      </div>

      {/* Add/Edit/View Dialog */}
      <Dialog
        open={
          (dialogMode === "add" && canAdd) ||
          (dialogMode === "edit" && canEdit) ||
          (dialogMode === "view" && canView)
        }
        onClose={() => {
          setDialogMode(null);
          setFormErrors({});
          setFormBranchId("");
          setSelectedPanel(null);
        }}
        title={dialogMode === "add" ? "Add Panel" : dialogMode === "edit" ? "Edit Panel" : "View Panel"}
        width={686}
      >
        <form onSubmit={dialogMode !== "view" ? handleSubmit : (e) => e.preventDefault()} className="space-y-6">
          <div className="space-y-6">
            <div>
              <FormSelectField
                label="Branch *"
                options={panelBranchOptions}
                value={formBranchId}
                onChange={(value) => {
                  if (!isBranchFilterSuperAdmin || dialogMode === "view" || dialogMode === "edit") return;
                  setFormBranchId(Array.isArray(value) ? value[0] : value || "");
                }}
                placeholder={isLoadingBranches ? "Loading branches..." : "Select Branch"}
                mode="single"
                background="white"
                disabled={
                  isLoadingBranches ||
                  dialogMode === "view" ||
                  dialogMode === "edit" ||
                  !isBranchFilterSuperAdmin
                }
              />
            </div>

            <div>
              <FormInputField
                label="Name *"
                value={formValues.name}
                onChange={(event) => {
                  if (dialogMode === "view" || selectedPanel?.isDefaultPanel) return;
                  let value = event.target.value.replace(/[^a-zA-Z\s]/g, "");
                  value = value.slice(0, 100);
                  setFormValues((prev) => ({ ...prev, name: value }));
                  setFormErrors((prev) => ({ ...prev, name: "" }));
                }}
                height={44}
                placeholder="Name"
                maxLength={100}
                required={dialogMode !== "view"}
                disabled={dialogMode === "view" || selectedPanel?.isDefaultPanel}
                error={formErrors.name}
              />
            </div>

            <div>
              <FormSelectField
                label="Status"
                value={formValues.status}
                onChange={(value) => {
                  if (dialogMode === "view" || selectedPanel?.isDefaultPanel) return;
                  setFormValues((prev) => ({
                    ...prev,
                    status: (Array.isArray(value) ? value[0] : value || "active") as "active" | "inactive",
                  }));
                }}
                options={statusOptions}
                placeholder="Status"
                mode="single"
                background="white"
                disabled={dialogMode === "view" || selectedPanel?.isDefaultPanel}
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
                    setFormBranchId("");
                    setSelectedPanel(null);
                  }}
                >
                Close
              </Button>
            ) : (
              <>
                <Button 
                  type="submit" 
                  variant="primary"
                  isLoading={isCreating || isUpdating}
                  disabled={isCreating || isUpdating || selectedPanel?.isDefaultPanel}
                >
                  {dialogMode === "add" ? "Save" : "Update"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogMode(null);
                    setFormErrors({});
                    setFormBranchId("");
                    setSelectedPanel(null);
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


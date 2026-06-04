"use client";

import Image from "next/image";
import { useMemo, useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
  Button,
  Dialog,
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
  MessageDialog,
  Tabs,
  Tooltip,
} from "@/components/ui";
import { PatientTypeButtonGroup } from "@/components/ui/PatientTypeButtonGroup";
import { ListBorder } from "@/components/ui/ListBorder";
import type { SelectOption } from "@/components/ui/FormSelectField";
import { useGetBranchesQuery, useGetTherapiesQuery, useCreateTherapyMutation, useUpdateTherapyMutation } from "@/store/api/settingsApi";
import { useDebounce } from "@/hooks/useDebounce";
import { usePermission } from "@/hooks/usePermission";
import { useBranchFilter } from "@/hooks/useBranchFilter";

type PanelTherapy = {
  id: number;
  branchId?: number;
  branch?: string;
  therapyName: string;
  price: string;
  productCode: string;
  hsnCode: string;
  category: string;
  status: "Active" | "Inactive";
  createdAt: string;
  privatePrice?: string;
  panelPrice?: string;
  tpaPrice?: string;
  privateStatus?: "Active" | "Inactive";
  panelStatus?: "Active" | "Inactive";
  tpaStatus?: "Active" | "Inactive";
  branches?: { id: number; name: string }[];
};

const statusOptions: SelectOption[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const categoryOptions: SelectOption[] = [
  { value: "panchkarma", label: "Panchkarma" },
  { value: "naturopathy", label: "Naturopathy" },
];

const panelTabOptions = [
  { value: "private", label: "Private" },
  { value: "panel", label: "Panel" },
  { value: "tpa", label: "TPA" },
  { value: "all", label: "All" },
];

export default function PanelTherapyPage() {
  const therapyPermission = usePermission("settings", { subModule: "therapy" });
  const canView = therapyPermission.canView;
  const canAdd = therapyPermission.canAdd;
  const canEdit = therapyPermission.canEdit;
  const [searchTerm, setSearchTerm] = useState("");
  const {
    selectedBranchFilter: selectedBranch,
    setSelectedBranchFilter: setSelectedBranch,
    branchFilterOptions: hookBranchFilterOptions,
    isLoadingBranches: isLoadingBranchFilter,
    isBranchFilterDisabled,
    filterBranchId: hookFilterBranchId,
  } = useBranchFilter();
  const [activeTab, setActiveTab] = useState<string>("private");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [dialogMode, setDialogMode] = useState<"add" | "edit" | "view" | null>(null);
  const [selectedTherapy, setSelectedTherapy] = useState<PanelTherapy | null>(null);
  const [formValues, setFormValues] = useState({
    branchIds: [] as string[],
    therapyName: "",
    productCode: "",
    hsnCode: "",
    category: "",
    status: "inactive" as "active" | "inactive",
    privatePrice: "",
    panelPrice: "",
    tpaPrice: "",
    privateStatus: "inactive" as "active" | "inactive",
    panelStatus: "inactive" as "active" | "inactive",
    tpaStatus: "inactive" as "active" | "inactive",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
  const [apiErrorMessage, setApiErrorMessage] = useState("");

  // Debounce search to avoid too many API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Reset to first page when search term, branch, or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedBranch, sortField, sortOrder]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // Fetch branches from API
  const { data: branchesData, isLoading: isLoadingBranches } = useGetBranchesQuery(undefined, {
    skip: !canView && !canAdd && !canEdit,
  });

  // Get selected branch ID for filtering
  const selectedBranchId = hookFilterBranchId;

  // Fetch therapies from API
  const { data: therapiesData, isLoading: isLoadingTherapies, refetch: refetchTherapies } = useGetTherapiesQuery({
    page: currentPage,
    limit: itemsPerPage,
    search: debouncedSearchTerm || undefined,
    branchId: selectedBranchId,
    sort: sortField,
    order: sortOrder,
  }, {
    skip: !canView && !canAdd && !canEdit,
  });

  // Create and update mutations
  const [createTherapy, { isLoading: isCreating }] = useCreateTherapyMutation();
  const [updateTherapy, { isLoading: isUpdating }] = useUpdateTherapyMutation();

  // Convert branches data to select options
  const branchOptions: SelectOption[] = useMemo(() => {
    return [
      { value: "", label: "None" },
      ...(branchesData?.data ?? []).map((branch) => ({
        value: branch.id.toString(),
        label: branch.name,
      })),
    ];
  }, [branchesData]);

  // Name of the branch currently selected in the filter (for View Therapy display)
  const selectedBranchName = useMemo(() => {
    if (!selectedBranch) return undefined;
    const id = parseInt(selectedBranch, 10);
    if (isNaN(id)) return undefined;
    return branchesData?.data?.find((b) => b.id === id)?.name;
  }, [selectedBranch, branchesData?.data]);

  // Map API data to PanelTherapy format
  const therapies: PanelTherapy[] = useMemo(() => {
    const formatDate = (dateString: string) => {
      try {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        const ampm = date.getHours() >= 12 ? "PM" : "AM";
        const displayHours = String(date.getHours() % 12 || 12).padStart(2, "0");
        return `${day}-${month}-${year} ${displayHours}:${minutes} ${ampm}`;
      } catch {
        return dateString;
      }
    };

    if (!therapiesData?.data?.length) {
      return [];
    }

    return therapiesData.data.map((therapy) => {
      const priceStr = therapy.price != null ? `₹ ${therapy.price}` : "";
      const statusVal = therapy.status === "active" ? "Active" : "Inactive";
      const privatePriceStr = therapy.price != null ? `₹ ${therapy.price}` : "";
      const panelPriceStr =
        therapy.panelPrice != null ? `₹ ${therapy.panelPrice}` : privatePriceStr;
      const tpaPriceStr =
        therapy.tpaPrice != null ? `₹ ${therapy.tpaPrice}` : privatePriceStr;
      const panelStatusVal =
        therapy.panelStatus === "active" ? "Active" : "Inactive";
      const tpaStatusVal =
        therapy.tpaStatus === "active" ? "Active" : "Inactive";

      return {
        id: therapy.id,
        branchId: therapy.branches?.[0]?.id,
        branch: therapy.branches?.[0]?.name,
        therapyName: therapy.therapyName ?? "",
        price: priceStr,
        productCode: therapy.productCode,
        hsnCode: therapy.hsnCode,
        category: therapy.category,
        status: statusVal,
        createdAt: formatDate(therapy.createdAt),
        privatePrice: privatePriceStr,
        panelPrice: panelPriceStr,
        tpaPrice: tpaPriceStr,
        privateStatus: statusVal,
        panelStatus: panelStatusVal,
        tpaStatus: tpaStatusVal,
        branches: therapy.branches ?? [],
      };
    });
  }, [therapiesData]);

  const paginatedTherapies = therapies;
  const totalItems = therapiesData?.data?.length ? (therapiesData?.total || therapies.length) : therapies.length;

  const handleAddNew = () => {
    if (!canAdd) return;
    setFormValues({
      branchIds: [],
      therapyName: "",
      productCode: "",
      hsnCode: "",
      category: "",
      status: "inactive",
      privatePrice: "",
      panelPrice: "",
      tpaPrice: "",
      privateStatus: "inactive",
      panelStatus: "inactive",
      tpaStatus: "inactive",
    });
    setFormErrors({});
    setSelectedTherapy(null);
    setDialogMode("add");
  };

  const handleEdit = (therapy: PanelTherapy) => {
    if (!canEdit) return;
    setSelectedTherapy(therapy);

    // When a branch is selected in the page filter, show only that branch in Edit (and it will be non-editable)
    const branchIds = selectedBranch
      ? [selectedBranch]
      : therapy.branches?.map((b) => b.id.toString()) ?? (therapy.branchId && therapy.branchId > 0 ? [therapy.branchId.toString()] : []);
    const toRawPrice = (v: string | undefined) => (v || "").replace(/[₹,\s]/g, "") || "";
    const privatePriceRaw = toRawPrice(therapy.privatePrice ?? therapy.price);
    const panelPriceRaw = toRawPrice(therapy.panelPrice ?? therapy.price);
    const tpaPriceRaw = toRawPrice(therapy.tpaPrice ?? therapy.price);
    const toStatus = (v: string | undefined) => (v === "Active" ? "active" : "inactive");
    const privateStatusVal = toStatus(therapy.privateStatus ?? therapy.status);
    const panelStatusVal = toStatus(therapy.panelStatus ?? therapy.status);
    const tpaStatusVal = toStatus(therapy.tpaStatus ?? therapy.status);

    setFormValues({
      branchIds,
      therapyName: therapy.therapyName,
      productCode: therapy.productCode,
      hsnCode: therapy.hsnCode,
      category: therapy.category || "",
      status: privateStatusVal,
      privatePrice: privatePriceRaw,
      panelPrice: panelPriceRaw,
      tpaPrice: tpaPriceRaw,
      privateStatus: privateStatusVal,
      panelStatus: panelStatusVal,
      tpaStatus: tpaStatusVal,
    });
    setFormErrors({});
    setDialogMode("edit");
  };

  const handleView = (therapy: PanelTherapy) => {
    if (!canView) return;
    setSelectedTherapy(therapy);
    setDialogMode("view");
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formValues.branchIds?.length) errors.branchId = "At least one branch is required";
    if (!formValues.therapyName.trim()) errors.therapyName = "Therapy name is required";
    if (!formValues.productCode.trim()) errors.productCode = "Product code is required";
    if (!formValues.hsnCode.trim()) errors.hsnCode = "HSN code is required";
    if (!formValues.category) errors.category = "Category is required";
    // Price required when corresponding status is Active (only validate visible fields; in edit mode validate by tab)
    const isEdit = dialogMode === "edit";
    if (!isEdit || activeTab === "private" || activeTab === "all") {
      if (!formValues.privatePrice?.trim()) {
        errors.privatePrice = "Private price is required";
      }
    }
    if (!isEdit || activeTab === "panel" || activeTab === "all") {
      if (formValues.panelStatus === "active" && !formValues.panelPrice?.trim()) {
        errors.panelPrice = "Price is required when Panel status is Active";
      }
    }
    if (!isEdit || activeTab === "tpa" || activeTab === "all") {
      if (formValues.tpaStatus === "active" && !formValues.tpaPrice?.trim()) {
        errors.tpaPrice = "Price is required when TPA status is Active";
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (dialogMode === "add" && !canAdd) return;
    if (dialogMode === "edit" && !canEdit) return;
    if (!validateForm()) return;

    try {
      let result;

      if (dialogMode === "add") {
        const branchIds = (formValues.branchIds || [])
          .map((id) => parseInt(id, 10))
          .filter((id) => !isNaN(id));
        if (branchIds.length === 0) {
          setApiErrorMessage("Please select at least one valid branch");
          setShowApiErrorDialog(true);
          return;
        }

        const payload = {
          branchIds,
          therapyName: formValues.therapyName.trim(),
          price: formValues.privatePrice.trim(),
          productCode: formValues.productCode.trim(),
          hsnCode: formValues.hsnCode.trim(),
          category: formValues.category,
          status: formValues.privateStatus,
          tpaPrice: formValues.tpaPrice.trim() || undefined,
          panelPrice: formValues.panelPrice.trim() || undefined,
          tpaStatus: formValues.tpaStatus,
          panelStatus: formValues.panelStatus,
        };

        result = await createTherapy(payload).unwrap();
        setSuccessMessage(result?.message || "Therapy created successfully");
      } else if (dialogMode === "edit" && selectedTherapy) {
        const branchIds = (formValues.branchIds ?? [])
          .map((id) => parseInt(id, 10))
          .filter((id) => !isNaN(id));
        const basePayload: Parameters<typeof updateTherapy>[0] = {
          id: selectedTherapy.id,
          branchIds,
        };
        let payload: Parameters<typeof updateTherapy>[0];
        if (activeTab === "private") {
          payload = {
            ...basePayload,
            price: formValues.privatePrice.trim(),
            status: formValues.privateStatus,
          };
        } else if (activeTab === "panel") {
          payload = {
            ...basePayload,
            panelPrice: formValues.panelPrice.trim(),
            panelStatus: formValues.panelStatus,
          };
        } else if (activeTab === "tpa") {
          payload = {
            ...basePayload,
            tpaPrice: formValues.tpaPrice.trim(),
            tpaStatus: formValues.tpaStatus,
          };
        } else {
          payload = {
            ...basePayload,
            price: formValues.privatePrice.trim(),
            panelPrice: formValues.panelPrice.trim(),
            tpaPrice: formValues.tpaPrice.trim(),
            status: formValues.privateStatus,
            panelStatus: formValues.panelStatus,
            tpaStatus: formValues.tpaStatus,
          };
        }

        result = await updateTherapy(payload).unwrap();
        setSuccessMessage(result?.message || "Therapy updated successfully");
      }

      // Show success message
      setShowSuccessDialog(true);

      // Refetch data after successful creation/update
      await refetchTherapies();

      setDialogMode(null);
      setSelectedTherapy(null);
      setFormValues({
        branchIds: [],
        therapyName: "",
        productCode: "",
        hsnCode: "",
        category: "",
        status: "inactive",
        privatePrice: "",
        panelPrice: "",
        tpaPrice: "",
        privateStatus: "inactive",
        panelStatus: "inactive",
        tpaStatus: "inactive",
      });
      setFormErrors({});
    } catch (error: any) {
      console.error(`Failed to ${dialogMode === "add" ? "create" : "update"} therapy:`, error);

      // Handle error - show error message
      let errorMsg = `Failed to ${dialogMode === "add" ? "create" : "update"} therapy. Please try again.`;

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

  const getStatusBadgeClass = (status: "Active" | "Inactive") =>
    status === "Active" ? "border-[#0B8C00]/20 bg-[#0B8C000D] text-[#0B8C00]" : "border-[#F6776E]/24 bg-[#F6776E0D] text-[#F6776E]";

  const getSortDirection = (field: string): "asc" | "desc" | null => {
    if (sortField === field) {
      return sortOrder;
    }
    return null;
  };

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <PageHeading title="Therapies" />
        </div>

        <ListBorder as="section" className="px-4 py-4">
          <div className="mb-4 w-full max-w-[600px]">
            <Tabs options={panelTabOptions} value={activeTab} onChange={handleTabChange} />
          </div>
          <div className="w-full overflow-hidden rounded-[16px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold leading-[120%] text-[#434956]"></h2>

              <div className="flex items-center gap-3">
                <div className="flex-shrink-0" style={{ width: "300px" }}>
                  <FormSelectField
                    label=""
                    value={selectedBranch}
                    onChange={(value) => {
                      const newValue = Array.isArray(value) ? value[0] : value || "";
                      setSelectedBranch(newValue);
                      setCurrentPage(1);
                    }}
                    options={hookBranchFilterOptions}
                    placeholder={isLoadingBranchFilter ? "Loading..." : "Select Branch"}
                    mode="single"
                    background="normal"
                    width={300}
                    disabled={isBranchFilterDisabled || isLoadingBranchFilter}
                  />
                </div>
                <div className="flex-shrink-0" style={{ width: "300px" }}>
                  <TableSearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search Here..." />
                </div>
                {canAdd ? (
                  <button
                    type="button"
                    className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] whitespace-nowrap"
                    onClick={handleAddNew}
                  >
                    <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                    <span className="text-hide">Add Therapy</span>
                  </button>
                ) : null}
              </div>
            </div>

            {!canView ? (
              <div className="py-12 text-center text-sm text-[#9CA3AF]">
                You don&apos;t have permission to view therapies.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {activeTab === "all" ? (
                      <>
                        <TableHead position="first" className="whitespace-nowrap">Sr no.</TableHead>
                        <TableHead>Therapy</TableHead>
                        <TableHead>Private Price</TableHead>
                        <TableHead>Private Status</TableHead>
                        <TableHead>Panel Price</TableHead>
                        <TableHead>Panel Status</TableHead>
                        <TableHead>TPA Price</TableHead>
                        <TableHead>TPA Status</TableHead>
                        <TableHead>Product Code</TableHead>
                        <TableHead>HSN Code</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Created At</TableHead>
                        {canView || canEdit ? <TableHead position="last">Action</TableHead> : null}
                      </>
                    ) : (
                      <>
                        <TableHead position="first" className="whitespace-nowrap">Sr no.</TableHead>
                        <TableHead sortable sortDirection={getSortDirection("therapyName")} onSort={() => handleSort("therapyName")}>Therapy</TableHead>
                        <TableHead sortable sortDirection={getSortDirection("price")} onSort={() => handleSort("price")}>Price</TableHead>
                        <TableHead sortable sortDirection={getSortDirection("productCode")} onSort={() => handleSort("productCode")}>Product Code</TableHead>
                        <TableHead className="whitespace-nowrap" sortable sortDirection={getSortDirection("hsnCode")} onSort={() => handleSort("hsnCode")}>HSN Code</TableHead>
                        <TableHead sortable sortDirection={getSortDirection("category")} onSort={() => handleSort("category")}>Category</TableHead>
                        <TableHead sortable sortDirection={getSortDirection("status")} onSort={() => handleSort("status")}>Status</TableHead>
                        <TableHead sortable sortDirection={getSortDirection("createdAt")} onSort={() => handleSort("createdAt")}>Created At</TableHead>
                        {canView || canEdit ? <TableHead position="last">Action</TableHead> : null}
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingTherapies ? (
                    <TableRow>
                      <TableData colSpan={activeTab === "all" ? (canView || canEdit ? 13 : 12) : (canView || canEdit ? 9 : 8)} className="py-12 text-center text-sm text-[#9CA3AF]">
                        Loading...
                      </TableData>
                    </TableRow>
                  ) : paginatedTherapies.length === 0 ? (
                    <TableRow>
                      <TableData colSpan={activeTab === "all" ? (canView || canEdit ? 13 : 12) : (canView || canEdit ? 9 : 8)} className="py-12 text-center text-sm text-[#9CA3AF]">
                        No panel therapies found
                      </TableData>
                    </TableRow>
                  ) : activeTab === "all" ? (
                    paginatedTherapies.map((therapy, index) => (
                      <TableRow key={therapy.id}>
                        <TableData position="first">{(currentPage - 1) * itemsPerPage + index + 1}</TableData>
                        <TableData>{therapy.therapyName}</TableData>
                        <TableData className="whitespace-nowrap">{therapy.privatePrice ?? therapy.price}</TableData>
                        <TableData>
                          <span className={`inline-flex h-[24px] min-w-[86px] items-center justify-center rounded-[30px] border px-5 text-xs font-medium ${getStatusBadgeClass(therapy.privateStatus ?? therapy.status)}`}>
                            {therapy.privateStatus ?? therapy.status}
                          </span>
                        </TableData>
                        <TableData className="whitespace-nowrap">{therapy.panelPrice ?? therapy.price}</TableData>
                        <TableData>
                          <span className={`inline-flex h-[24px] min-w-[86px] items-center justify-center rounded-[30px] border px-5 text-xs font-medium ${getStatusBadgeClass(therapy.panelStatus ?? therapy.status)}`}>
                            {therapy.panelStatus ?? therapy.status}
                          </span>
                        </TableData>
                        <TableData className="whitespace-nowrap">{therapy.tpaPrice ?? therapy.price}</TableData>
                        <TableData>
                          <span className={`inline-flex h-[24px] min-w-[86px] items-center justify-center rounded-[30px] border px-5 text-xs font-medium ${getStatusBadgeClass(therapy.tpaStatus ?? therapy.status)}`}>
                            {therapy.tpaStatus ?? therapy.status}
                          </span>
                        </TableData>
                        <TableData className="whitespace-nowrap">{therapy.productCode}</TableData>
                        <TableData className="whitespace-nowrap">{therapy.hsnCode}</TableData>
                        <TableData>{therapy.category}</TableData>
                        <TableData className="whitespace-nowrap">{therapy.createdAt}</TableData>
                        {canView || canEdit ? (
                          <TableData position="last">
                            <div className="flex items-center gap-3">
                              {canView ? (
                                <Tooltip content="View" position="top" delay={0}>
                                  <button
                                    type="button"
                                    className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                                    onClick={() => handleView(therapy)}
                                    aria-label="View therapy"
                                  >
                                    <Image src="/icons/ViewEyeIcon.svg" alt="View" width={16} height={16} />
                                  </button>
                                </Tooltip>
                              ) : null}
                              {canEdit ? (
                                <Tooltip content="Edit" position="top" delay={0}>
                                  <button
                                    type="button"
                                    className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                                    onClick={() => handleEdit(therapy)}
                                    aria-label="Edit therapy"
                                  >
                                    <Image src="/icons/EditIconBlack.svg" alt="Edit" width={16} height={16} />
                                  </button>
                                </Tooltip>
                              ) : null}
                            </div>
                          </TableData>
                        ) : null}
                      </TableRow>
                    ))
                  ) : (
                    paginatedTherapies.map((therapy, index) => {
                      const priceForTab = activeTab === "private" ? (therapy.privatePrice ?? therapy.price) : activeTab === "panel" ? (therapy.panelPrice ?? therapy.price) : (therapy.tpaPrice ?? therapy.price);
                      const statusForTab = activeTab === "private" ? (therapy.privateStatus ?? therapy.status) : activeTab === "panel" ? (therapy.panelStatus ?? therapy.status) : (therapy.tpaStatus ?? therapy.status);
                      return (
                        <TableRow key={therapy.id}>
                          <TableData position="first">{(currentPage - 1) * itemsPerPage + index + 1}</TableData>
                          <TableData>{therapy.therapyName}</TableData>
                          <TableData className="whitespace-nowrap">{priceForTab}</TableData>
                          <TableData className="whitespace-nowrap">{therapy.productCode}</TableData>
                          <TableData className="whitespace-nowrap">{therapy.hsnCode}</TableData>
                          <TableData>{therapy.category}</TableData>
                          <TableData>
                            <span className={`inline-flex h-[24px] min-w-[86px] items-center justify-center rounded-[30px] border px-5 text-xs font-medium ${getStatusBadgeClass(statusForTab)}`}>
                              {statusForTab}
                            </span>
                          </TableData>
                          <TableData className="whitespace-nowrap">{therapy.createdAt}</TableData>
                          {canView || canEdit ? (
                            <TableData position="last">
                              <div className="flex items-center gap-3">
                                {canView ? (
                                  <Tooltip content="View" position="top" delay={0}>
                                    <button type="button" className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]" onClick={() => handleView(therapy)} aria-label="View therapy">
                                      <Image src="/icons/ViewEyeIcon.svg" alt="View" width={16} height={16} />
                                    </button>
                                  </Tooltip>
                                ) : null}
                                {canEdit ? (
                                  <Tooltip content="Edit" position="top" delay={0}>
                                    <button type="button" className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]" onClick={() => handleEdit(therapy)} aria-label="Edit therapy">
                                      <Image src="/icons/EditIconBlack.svg" alt="Edit" width={16} height={16} />
                                    </button>
                                  </Tooltip>
                                ) : null}
                              </div>
                            </TableData>
                          ) : null}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}

            {canView && !isLoadingTherapies && totalItems > 0 && (
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
      </div>

      <Dialog
        open={
          dialogMode !== null &&
          ((dialogMode === "view" && canView) ||
            (dialogMode === "add" && canAdd) ||
            (dialogMode === "edit" && canEdit))
        }
        onClose={() => {
          setDialogMode(null);
          setSelectedTherapy(null);
          setFormErrors({});
          setFormValues({
            branchIds: [],
            therapyName: "",
            productCode: "",
            hsnCode: "",
            category: "",
            status: "inactive",
            privatePrice: "",
            panelPrice: "",
            tpaPrice: "",
            privateStatus: "inactive",
            panelStatus: "inactive",
            tpaStatus: "inactive",
          });
        }}
        title={
          dialogMode === "add" ? "Add Therapy" : dialogMode === "edit" ? "Edit Therapy" : "View Therapy"
        }
        width={949}
      >
        {dialogMode === "view" && selectedTherapy ? (
          <div className="grid grid-cols-2 gap-6">
            {selectedBranch && selectedBranchName ? (
              <div>
                <p className="text-sm text-[#7B8089]">Branch Name</p>
                <p className="text-base font-medium text-[#262D3B]">{selectedBranchName}</p>
              </div>
            ) : null}
            <div>
              <p className="text-sm text-[#7B8089]">Therapy</p>
              <p className="text-base font-medium text-[#262D3B]">{selectedTherapy.therapyName}</p>
            </div>
            <div>
              <p className="text-sm text-[#7B8089]">Product Code</p>
              <p className="text-base font-medium text-[#262D3B]">{selectedTherapy.productCode}</p>
            </div>
            <div>
              <p className="text-sm text-[#7B8089]">HSN Code</p>
              <p className="text-base font-medium text-[#262D3B]">{selectedTherapy.hsnCode}</p>
            </div>
            <div>
              <p className="text-sm text-[#7B8089]">Category</p>
              <p className="text-base font-medium text-[#262D3B]">{selectedTherapy.category}</p>
            </div>
            {(activeTab === "private" || activeTab === "all") && (
              <>
                <div>
                  <p className="text-sm text-[#7B8089]">Private Price</p>
                  <p className="text-base font-medium text-[#262D3B]">{selectedTherapy.privatePrice ?? selectedTherapy.price}</p>
                </div>
                <div>
                  <p className="text-sm text-[#7B8089]">Private Status</p>
                  <p className="text-base font-medium text-[#262D3B]">{selectedTherapy.privateStatus ?? selectedTherapy.status}</p>
                </div>
              </>
            )}
            {(activeTab === "panel" || activeTab === "all") && (
              <>
                <div>
                  <p className="text-sm text-[#7B8089]">Panel Price</p>
                  <p className="text-base font-medium text-[#262D3B]">{selectedTherapy.panelPrice ?? selectedTherapy.price}</p>
                </div>
                <div>
                  <p className="text-sm text-[#7B8089]">Panel Status</p>
                  <p className="text-base font-medium text-[#262D3B]">{selectedTherapy.panelStatus ?? selectedTherapy.status}</p>
                </div>
              </>
            )}
            {(activeTab === "tpa" || activeTab === "all") && (
              <>
                <div>
                  <p className="text-sm text-[#7B8089]">TPA Price</p>
                  <p className="text-base font-medium text-[#262D3B]">{selectedTherapy.tpaPrice ?? selectedTherapy.price}</p>
                </div>
                <div>
                  <p className="text-sm text-[#7B8089]">TPA Status</p>
                  <p className="text-base font-medium text-[#262D3B]">{selectedTherapy.tpaStatus ?? selectedTherapy.status}</p>
                </div>
              </>
            )}
            <div>
              <p className="text-sm text-[#7B8089]">Created At</p>
              <p className="text-base font-medium text-[#262D3B]">{selectedTherapy.createdAt}</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">
            <div className="col-span-2">
              <FormSelectField
                label="Branch *"
                value={formValues.branchIds}
                onChange={(value) => {
                  if (dialogMode === "view" || (dialogMode === "edit" && selectedBranch)) return;
                  const ids = Array.isArray(value) ? value : value ? [value] : [];
                  setFormValues((prev) => ({ ...prev, branchIds: ids }));
                  setFormErrors((prev) => ({ ...prev, branchId: "" }));
                }}
                options={branchOptions.filter((o) => o.value !== "")}
                placeholder={isLoadingBranches ? "Loading branches..." : "Select branches"}
                mode="multiple"
                background="white"
                disabled={dialogMode === "view" || (dialogMode === "edit" && !!selectedBranch) || isLoadingBranches}
              />
              {formErrors.branchId && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.branchId}</p>}
            </div>
            <div>
              <FormInputField
                label="Therapy *"
                value={formValues.therapyName}
                onChange={(event) => {
                  if (dialogMode === "view" || dialogMode === "edit") return;
                  let value = event.target.value.replace(/[^a-zA-Z\s]/g, "");
                  value = value.slice(0, 100);
                  setFormValues((prev) => ({ ...prev, therapyName: value }));
                  setFormErrors((prev) => ({ ...prev, therapyName: "" }));
                }}
                height={44}
                placeholder="Therapy"
                maxLength={100}
                required={dialogMode !== "view"}
                disabled={dialogMode === "view" || dialogMode === "edit"}
              />
              {formErrors.therapyName && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.therapyName}</p>}
            </div>
            <div>
              <FormInputField
                label="Product Code *"
                value={formValues.productCode}
                onChange={(event) => {
                  if (dialogMode === "view" || dialogMode === "edit") return;
                  let value = event.target.value.replace(/[^a-zA-Z0-9]/g, "");
                  value = value.slice(0, 100);
                  setFormValues((prev) => ({ ...prev, productCode: value }));
                  setFormErrors((prev) => ({ ...prev, productCode: "" }));
                }}
                height={44}
                placeholder="Product Code"
                maxLength={100}
                required={dialogMode !== "view"}
                disabled={dialogMode === "view" || dialogMode === "edit"}
              />
              {formErrors.productCode && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.productCode}</p>}
            </div>
            <div>
              <FormInputField
                label="HSN Code *"
                value={formValues.hsnCode}
                onChange={(event) => {
                  if (dialogMode === "view" || dialogMode === "edit") return;
                  let value = event.target.value.replace(/[^a-zA-Z0-9]/g, "");
                  value = value.slice(0, 100);
                  setFormValues((prev) => ({ ...prev, hsnCode: value }));
                  setFormErrors((prev) => ({ ...prev, hsnCode: "" }));
                }}
                height={44}
                placeholder="HSN Code"
                maxLength={100}
                required={dialogMode !== "view"}
                disabled={dialogMode === "view" || dialogMode === "edit"}
              />
              {formErrors.hsnCode && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.hsnCode}</p>}
            </div>
            <div>
              <FormSelectField
                label="Category *"
                value={formValues.category}
                onChange={(value) => {
                  if (dialogMode === "view" || dialogMode === "edit") return;
                  setFormValues((prev) => ({
                    ...prev,
                    category: Array.isArray(value) ? value[0] : value || "",
                  }));
                  setFormErrors((prev) => ({ ...prev, category: "" }));
                }}
                options={categoryOptions}
                placeholder="Category"
                mode="single"
                background="white"
                disabled={dialogMode === "view" || dialogMode === "edit"}
              />
              {formErrors.category && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.category}</p>}
            </div>
            {(dialogMode === "add" || (dialogMode === "edit" && (activeTab === "private" || activeTab === "all"))) && (
              <>
                <div>
                  <FormInputField
                    label="Private Price *"
                    value={formValues.privatePrice}
                    onChange={(event) => {
                      const v = event.target.value.replace(/[^0-9.]/g, "");
                      setFormValues((prev) => ({ ...prev, privatePrice: v }));
                      setFormErrors((prev) => ({ ...prev, privatePrice: "" }));
                    }}
                    height={44}
                    placeholder="Private Price"
                  />
                  {formErrors.privatePrice && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.privatePrice}</p>}
                </div>
                <div className="inline-flex w-full flex-col gap-2">
                  <PatientTypeButtonGroup
                    label="Private Status"
                    options={["Active", "Inactive"]}
                    value={formValues.privateStatus}
                    onChange={(val) => {
                      const status = (val === "active" ? "active" : "inactive") as "active" | "inactive";
                      setFormValues((prev) => ({ ...prev, privateStatus: status }));
                      setFormErrors((prev) => ({ ...prev, privatePrice: "" }));
                    }}
                  />
                </div>
              </>
            )}
            {(dialogMode === "add" || (dialogMode === "edit" && (activeTab === "panel" || activeTab === "all"))) && (
              <>
                <div>
                  <FormInputField
                    label="Panel Price"
                    value={formValues.panelPrice}
                    onChange={(event) => {
                      const v = event.target.value.replace(/[^0-9.]/g, "");
                      setFormValues((prev) => ({ ...prev, panelPrice: v }));
                      setFormErrors((prev) => ({ ...prev, panelPrice: "" }));
                    }}
                    height={44}
                    placeholder="Panel Price"
                  />
                  {formErrors.panelPrice && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.panelPrice}</p>}
                </div>
                <div className="inline-flex w-full flex-col gap-2">
                  <PatientTypeButtonGroup
                    label="Panel Status"
                    options={["Active", "Inactive"]}
                    value={formValues.panelStatus}
                    onChange={(val) => {
                      const status = (val === "active" ? "active" : "inactive") as "active" | "inactive";
                      setFormValues((prev) => ({ ...prev, panelStatus: status }));
                      setFormErrors((prev) => ({ ...prev, panelPrice: "" }));
                    }}
                  />
                </div>
              </>
            )}
            {(dialogMode === "add" || (dialogMode === "edit" && (activeTab === "tpa" || activeTab === "all"))) && (
              <>
                <div>
                  <FormInputField
                    label="TPA Price"
                    value={formValues.tpaPrice}
                    onChange={(event) => {
                      const v = event.target.value.replace(/[^0-9.]/g, "");
                      setFormValues((prev) => ({ ...prev, tpaPrice: v }));
                      setFormErrors((prev) => ({ ...prev, tpaPrice: "" }));
                    }}
                    height={44}
                    placeholder="TPA Price"
                  />
                  {formErrors.tpaPrice && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.tpaPrice}</p>}
                </div>
                <div className="inline-flex w-full flex-col gap-2">
                  <PatientTypeButtonGroup
                    label="TPA Status"
                    options={["Active", "Inactive"]}
                    value={formValues.tpaStatus}
                    onChange={(val) => {
                      const status = (val === "active" ? "active" : "inactive") as "active" | "inactive";
                      setFormValues((prev) => ({ ...prev, tpaStatus: status }));
                      setFormErrors((prev) => ({ ...prev, tpaPrice: "" }));
                    }}
                  />
                </div>
              </>
            )}

            <div className="col-span-2 flex gap-3">
              <Button
                type="submit"
                variant="primary"
                isLoading={isCreating || isUpdating}
                disabled={isCreating || isUpdating}
              >
                {dialogMode === "add" ? "Add therapy" : "Update therapy"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogMode(null);
                  setSelectedTherapy(null);
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


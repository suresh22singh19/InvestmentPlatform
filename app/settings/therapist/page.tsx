"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
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
  Tooltip,
} from "@/components/ui";
import { PatientTypeButtonGroup } from "@/components/ui/PatientTypeButtonGroup";
import { ListBorder } from "@/components/ui/ListBorder";
import type { SelectOption } from "@/components/ui/FormSelectField";
import {
  useGetBranchesQuery,
  useGetTherapistEntriesQuery,
  useUpdateTherapistEntryMutation,
} from "@/store/api/settingsApi";
import { useDebounce } from "@/hooks/useDebounce";
import { usePermission } from "@/hooks/usePermission";
import { useBranchFilter } from "@/hooks/useBranchFilter";

type PanelTherapist = {
  id: number;
  branchId?: number;
  branch?: string;
  therapistName: string;
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

const categoryOptions: SelectOption[] = [
  { value: "panchkarma", label: "Panchkarma" },
  { value: "naturopathy", label: "Naturopathy" },
];

export default function PanelTherapistPage() {
  const router = useRouter();
  const therapistPermission = usePermission("settings", { subModule: "therapist" });
  const canView = therapistPermission.canView;
  const canAdd = therapistPermission.canAdd;
  const canEdit = therapistPermission.canEdit;
  const [searchTerm, setSearchTerm] = useState("");
  const {
    selectedBranchFilter: selectedBranch,
    setSelectedBranchFilter: setSelectedBranch,
    branchFilterOptions: hookBranchFilterOptions,
    isLoadingBranches: isLoadingBranchFilter,
    isBranchFilterDisabled,
    filterBranchId: hookFilterBranchId,
  } = useBranchFilter();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [dialogMode, setDialogMode] = useState<"edit" | "view" | null>(null);
  const [selectedTherapist, setSelectedTherapist] = useState<PanelTherapist | null>(null);
  const [formValues, setFormValues] = useState({
    branchIds: [] as string[],
    therapistName: "",
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

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedBranch, sortField, sortOrder]);

  const { data: branchesData, isLoading: isLoadingBranches } = useGetBranchesQuery(undefined, {
    skip: !canView && !canAdd && !canEdit,
  });

  const selectedBranchId = hookFilterBranchId;

  const { data: therapistsData, isLoading: isLoadingTherapists, refetch: refetchTherapists } = useGetTherapistEntriesQuery({
    page: currentPage,
    limit: itemsPerPage,
    search: debouncedSearchTerm || undefined,
    branchId: selectedBranchId,
    sort: sortField,
    order: sortOrder,
  }, {
    skip: !canView && !canAdd && !canEdit,
  });

  const [updateTherapistEntry, { isLoading: isUpdating }] = useUpdateTherapistEntryMutation();

  const branchOptions: SelectOption[] = useMemo(() => {
    return [
      { value: "", label: "None" },
      ...(branchesData?.data ?? []).map((branch) => ({
        value: branch.id.toString(),
        label: branch.name,
      })),
    ];
  }, [branchesData]);

  const selectedBranchName = useMemo(() => {
    if (!selectedBranch) return undefined;
    const id = parseInt(selectedBranch, 10);
    if (isNaN(id)) return undefined;
    return branchesData?.data?.find((b) => b.id === id)?.name;
  }, [selectedBranch, branchesData?.data]);

  const therapists: PanelTherapist[] = useMemo(() => {
    const formatDate = (dateString: string) => {
      try {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        const minutes = String(date.getMinutes()).padStart(2, "0");
        const ampm = date.getHours() >= 12 ? "PM" : "AM";
        const displayHours = String(date.getHours() % 12 || 12).padStart(2, "0");
        return `${day}-${month}-${year} ${displayHours}:${minutes} ${ampm}`;
      } catch {
        return dateString;
      }
    };

    if (!therapistsData?.data?.length) {
      return [];
    }

    return therapistsData.data.map((therapist) => {
      const priceStr = therapist.price != null ? `₹ ${therapist.price}` : "";
      const statusVal = therapist.status === "active" ? "Active" : "Inactive";
      const privatePriceStr = therapist.price != null ? `₹ ${therapist.price}` : "";
      const panelPriceStr =
        therapist.panelPrice != null ? `₹ ${therapist.panelPrice}` : privatePriceStr;
      const tpaPriceStr =
        therapist.tpaPrice != null ? `₹ ${therapist.tpaPrice}` : privatePriceStr;
      const panelStatusVal =
        therapist.panelStatus === "active" ? "Active" : "Inactive";
      const tpaStatusVal =
        therapist.tpaStatus === "active" ? "Active" : "Inactive";

      return {
        id: therapist.id,
        branchId: therapist.branches?.[0]?.id,
        branch: therapist.branches?.[0]?.name,
        therapistName: therapist.therapistName ?? "",
        price: priceStr,
        productCode: therapist.productCode,
        hsnCode: therapist.hsnCode,
        category: therapist.category,
        status: statusVal,
        createdAt: formatDate(therapist.createdAt),
        privatePrice: privatePriceStr,
        panelPrice: panelPriceStr,
        tpaPrice: tpaPriceStr,
        privateStatus: statusVal,
        panelStatus: panelStatusVal,
        tpaStatus: tpaStatusVal,
        branches: therapist.branches ?? [],
      };
    });
  }, [therapistsData]);

  const paginatedTherapists = therapists;
  const totalItems = therapistsData?.data?.length ? (therapistsData?.total || therapists.length) : therapists.length;

  const handleEdit = (therapist: PanelTherapist) => {
    if (!canEdit) return;
    setSelectedTherapist(therapist);

    const branchIds = selectedBranch
      ? [selectedBranch]
      : (branchesData?.data ?? []).length > 0
        ? (branchesData?.data ?? []).map((b) => b.id.toString())
        : therapist.branches?.map((b) => b.id.toString()) ?? (therapist.branchId && therapist.branchId > 0 ? [therapist.branchId.toString()] : []);
    const toRawPrice = (v: string | undefined) => (v || "").replace(/[₹,\s]/g, "") || "";
    const privatePriceRaw = toRawPrice(therapist.privatePrice ?? therapist.price);
    const panelPriceRaw = toRawPrice(therapist.panelPrice ?? therapist.price);
    const tpaPriceRaw = toRawPrice(therapist.tpaPrice ?? therapist.price);
    const toStatus = (v: string | undefined) => (v === "Active" ? "active" : "inactive");
    const privateStatusVal = toStatus(therapist.privateStatus ?? therapist.status);
    const panelStatusVal = toStatus(therapist.panelStatus ?? therapist.status);
    const tpaStatusVal = toStatus(therapist.tpaStatus ?? therapist.status);

    setFormValues({
      branchIds,
      therapistName: therapist.therapistName,
      productCode: therapist.productCode,
      hsnCode: therapist.hsnCode,
      category: therapist.category || "",
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

  const handleView = (therapist: PanelTherapist) => {
    if (!canView) return;
    setSelectedTherapist(therapist);
    setDialogMode("view");
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formValues.branchIds?.length) errors.branchId = "At least one branch is required";
    if (!formValues.therapistName.trim()) errors.therapistName = "Therapist name is required";
    if (!formValues.productCode.trim()) errors.productCode = "Product code is required";
    if (!formValues.hsnCode.trim()) errors.hsnCode = "HSN code is required";
    if (!formValues.category) errors.category = "Category is required";
    if (!formValues.privatePrice?.trim()) {
      errors.privatePrice = "Private price is required";
    }
    if (formValues.panelStatus === "active" && !formValues.panelPrice?.trim()) {
      errors.panelPrice = "Price is required when Panel status is Active";
    }
    if (formValues.tpaStatus === "active" && !formValues.tpaPrice?.trim()) {
      errors.tpaPrice = "Price is required when TPA status is Active";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit) return;
    if (!validateForm()) return;

    try {
      const branchIds = (formValues.branchIds || [])
        .map((id) => parseInt(id, 10))
        .filter((id) => !isNaN(id));
      const payload: Parameters<typeof updateTherapistEntry>[0] = {
        id: selectedTherapist!.id,
        branchIds: selectedBranch === "" ? [] : branchIds,
        price: formValues.privatePrice.trim(),
        panelPrice: formValues.panelPrice.trim(),
        tpaPrice: formValues.tpaPrice.trim(),
        status: formValues.privateStatus,
        panelStatus: formValues.panelStatus,
        tpaStatus: formValues.tpaStatus,
      };

      const result = await updateTherapistEntry(payload).unwrap();
      setSuccessMessage(result?.message || "Therapist updated successfully");
      setShowSuccessDialog(true);
      await refetchTherapists();

      setDialogMode(null);
      setSelectedTherapist(null);
      setFormValues({
        branchIds: [],
        therapistName: "",
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
      console.error("Failed to update therapist:", error);
      const errorMsg =
        error?.data?.message || error?.data?.error || error?.error || error?.message ||
        "Failed to update therapist. Please try again.";
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
          <PageHeading title="Therapists" />
        </div>

        <ListBorder as="section" className="px-4 py-4">
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
                    onClick={() => router.push("/settings/therapist/add")}
                  >
                    <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                    <span className="text-hide">Add Therapist</span>
                  </button>
                ) : null}
              </div>
            </div>

            {!canView ? (
              <div className="py-12 text-center text-sm text-[#9CA3AF]">
                You don&apos;t have permission to view therapists.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead position="first" className="whitespace-nowrap">Sr no.</TableHead>
                    <TableHead sortable sortDirection={getSortDirection("therapistName")} onSort={() => handleSort("therapistName")}>Therapist</TableHead>
                    <TableHead sortable sortDirection={getSortDirection("email")} onSort={() => handleSort("email")}>Email</TableHead>
                    <TableHead sortable sortDirection={getSortDirection("phone")} onSort={() => handleSort("phone")}>Phone no.</TableHead>
                    <TableHead sortable sortDirection={getSortDirection("employeeId")} onSort={() => handleSort("employeeId")}>Employee ID</TableHead>
                    <TableHead sortable sortDirection={getSortDirection("status")} onSort={() => handleSort("status")}>Status</TableHead>
                    <TableHead sortable sortDirection={getSortDirection("createdAt")} onSort={() => handleSort("createdAt")}>Created At</TableHead>
                    {canView || canEdit ? <TableHead position="last">Action</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingTherapists ? (
                    <TableRow>
                      <TableData colSpan={canView || canEdit ? 8 : 7} className="py-12 text-center text-sm text-[#9CA3AF]">
                        Loading...
                      </TableData>
                    </TableRow>
                  ) : paginatedTherapists.length === 0 ? (
                    <TableRow>
                      <TableData colSpan={canView || canEdit ? 8 : 7} className="py-12 text-center text-sm text-[#9CA3AF]">
                        No panel therapists found
                      </TableData>
                    </TableRow>
                  ) : (
                    paginatedTherapists.map((therapist, index) => (
                      <TableRow key={therapist.id}>
                        <TableData position="first">{(currentPage - 1) * itemsPerPage + index + 1}</TableData>
                        <TableData>{therapist.therapistName}</TableData>
                        <TableData className="whitespace-nowrap">{therapist.privatePrice ?? therapist.price}</TableData>
                        <TableData className="whitespace-nowrap">{therapist.productCode}</TableData>
                        <TableData className="whitespace-nowrap">{therapist.hsnCode}</TableData>
                        <TableData>
                          <span className={`inline-flex h-[24px] min-w-[86px] items-center justify-center rounded-[30px] border px-5 text-xs font-medium ${getStatusBadgeClass(therapist.privateStatus ?? therapist.status)}`}>
                            {therapist.privateStatus ?? therapist.status}
                          </span>
                        </TableData>
                        <TableData className="whitespace-nowrap">{therapist.createdAt}</TableData>
                        {canView || canEdit ? (
                          <TableData position="last">
                            <div className="flex items-center gap-3">
                              {canView ? (
                                <Tooltip content="View" position="top" delay={0}>
                                  <button type="button" className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]" onClick={() => handleView(therapist)} aria-label="View therapist">
                                    <Image src="/icons/ViewEyeIcon.svg" alt="View" width={16} height={16} />
                                  </button>
                                </Tooltip>
                              ) : null}
                              {canEdit ? (
                                <Tooltip content="Edit" position="top" delay={0}>
                                  <button type="button" className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]" onClick={() => handleEdit(therapist)} aria-label="Edit therapist">
                                    <Image src="/icons/EditIconBlack.svg" alt="Edit" width={16} height={16} />
                                  </button>
                                </Tooltip>
                              ) : null}
                            </div>
                          </TableData>
                        ) : null}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}

            {canView && !isLoadingTherapists && totalItems > 0 && (
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
            (dialogMode === "edit" && canEdit))
        }
        onClose={() => {
          setDialogMode(null);
          setSelectedTherapist(null);
          setFormErrors({});
          setFormValues({
            branchIds: [],
            therapistName: "",
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
        title={dialogMode === "edit" ? "Edit Therapist" : "View Therapist"}
        width={949}
      >
        {dialogMode === "view" && selectedTherapist ? (
          <div className="grid grid-cols-2 gap-6">
            {selectedBranch && selectedBranchName ? (
              <div>
                <p className="text-sm text-[#7B8089]">Branch Name</p>
                <p className="text-base font-medium text-[#262D3B]">{selectedBranchName}</p>
              </div>
            ) : null}
            <div>
              <p className="text-sm text-[#7B8089]">Therapist</p>
              <p className="text-base font-medium text-[#262D3B]">{selectedTherapist.therapistName}</p>
            </div>
            <div>
              <p className="text-sm text-[#7B8089]">Product Code</p>
              <p className="text-base font-medium text-[#262D3B]">{selectedTherapist.productCode}</p>
            </div>
            <div>
              <p className="text-sm text-[#7B8089]">HSN Code</p>
              <p className="text-base font-medium text-[#262D3B]">{selectedTherapist.hsnCode}</p>
            </div>
            <div>
              <p className="text-sm text-[#7B8089]">Category</p>
              <p className="text-base font-medium text-[#262D3B]">{selectedTherapist.category}</p>
            </div>
            <div>
              <p className="text-sm text-[#7B8089]">Private Price</p>
              <p className="text-base font-medium text-[#262D3B]">{selectedTherapist.privatePrice ?? selectedTherapist.price}</p>
            </div>
            <div>
              <p className="text-sm text-[#7B8089]">Private Status</p>
              <p className="text-base font-medium text-[#262D3B]">{selectedTherapist.privateStatus ?? selectedTherapist.status}</p>
            </div>
            <div>
              <p className="text-sm text-[#7B8089]">Panel Price</p>
              <p className="text-base font-medium text-[#262D3B]">{selectedTherapist.panelPrice ?? selectedTherapist.price}</p>
            </div>
            <div>
              <p className="text-sm text-[#7B8089]">Panel Status</p>
              <p className="text-base font-medium text-[#262D3B]">{selectedTherapist.panelStatus ?? selectedTherapist.status}</p>
            </div>
            <div>
              <p className="text-sm text-[#7B8089]">TPA Price</p>
              <p className="text-base font-medium text-[#262D3B]">{selectedTherapist.tpaPrice ?? selectedTherapist.price}</p>
            </div>
            <div>
              <p className="text-sm text-[#7B8089]">TPA Status</p>
              <p className="text-base font-medium text-[#262D3B]">{selectedTherapist.tpaStatus ?? selectedTherapist.status}</p>
            </div>
            <div>
              <p className="text-sm text-[#7B8089]">Created At</p>
              <p className="text-base font-medium text-[#262D3B]">{selectedTherapist.createdAt}</p>
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
                label="Therapist *"
                value={formValues.therapistName}
                onChange={(event) => {
                  if (dialogMode === "view" || dialogMode === "edit") return;
                  let value = event.target.value.replace(/[^a-zA-Z\s]/g, "");
                  value = value.slice(0, 100);
                  setFormValues((prev) => ({ ...prev, therapistName: value }));
                  setFormErrors((prev) => ({ ...prev, therapistName: "" }));
                }}
                height={44}
                placeholder="Therapist"
                maxLength={100}
                required={dialogMode !== "view"}
                disabled={dialogMode === "view" || dialogMode === "edit"}
              />
              {formErrors.therapistName && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.therapistName}</p>}
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

            <div className="col-span-2 flex gap-3">
              <Button
                type="submit"
                variant="primary"
                isLoading={isUpdating}
                disabled={isUpdating}
              >
                Update therapist
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogMode(null);
                  setSelectedTherapist(null);
                  setFormErrors({});
                }}
                disabled={isUpdating}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Dialog>

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

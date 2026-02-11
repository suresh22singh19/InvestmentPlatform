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
} from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import type { SelectOption } from "@/components/ui/FormSelectField";
import { useGetTpaTherapiesQuery, useCreateTpaTherapyMutation, useUpdateTpaTherapyMutation } from "@/store/api/settingsApi";
import { useDebounce } from "@/hooks/useDebounce";

type TpaTherapy = {
  id: number;
  therapyId: number;
  therapyName: string;
  price: string;
  productCode: string;
  hsnCode: string;
  category: string;
  status: "Active" | "Inactive";
  createdAt: string;
  originalTherapyId?: number; // Store original therapyId for API calls
};

const statusOptions: SelectOption[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const categoryOptions: SelectOption[] = [
  { value: "Panchkarma", label: "Panchkarma" },
  { value: "Naturopathy", label: "Naturopathy" },
];

export default function TpaTherapyPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [dialogMode, setDialogMode] = useState<"add" | "edit" | "view" | null>(null);
  const [selectedTherapy, setSelectedTherapy] = useState<TpaTherapy | null>(null);
  const [formValues, setFormValues] = useState({
    therapyId: "",
    price: "",
    productCode: "",
    hsnCode: "",
    category: "",
    status: "active" as "active" | "inactive",
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

  // Fetch TPA therapies from API
  const { data: tpaTherapiesData, isLoading: isLoadingTpaTherapies, refetch: refetchTpaTherapies } = useGetTpaTherapiesQuery({
    page: currentPage,
    limit: itemsPerPage,
    search: debouncedSearchTerm || undefined,
    sort: sortField,
    order: sortField ? sortOrder : undefined,
  });

  // Create and update mutations
  const [createTpaTherapy, { isLoading: isCreating }] = useCreateTpaTherapyMutation();
  const [updateTpaTherapy, { isLoading: isUpdating }] = useUpdateTpaTherapyMutation();

  // Map API data to TpaTherapy format
  const therapies: TpaTherapy[] = useMemo(() => {
    if (!tpaTherapiesData?.data) {
      return [];
    }
    return tpaTherapiesData.data.map((tpaTherapy) => {

      const formatDate = (dateString: string) => {
        try {
          const date = new Date(dateString);
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
          const displayHours = String(date.getHours() % 12 || 12).padStart(2, '0');
          return `${day}-${month}-${year} ${displayHours}:${minutes} ${ampm}`;
        } catch {
          return dateString;
        }
      };
      
      return {
        id: tpaTherapy.id,
        therapyId: tpaTherapy.therapyId,
        therapyName: tpaTherapy.medicineName,
        price: `₹ ${tpaTherapy.price}`,
        productCode: tpaTherapy.productCode,
        hsnCode: tpaTherapy.hsnCode,
        category: tpaTherapy.category,
        status: tpaTherapy.status === "active" ? "Active" : "Inactive",
        createdAt: formatDate(tpaTherapy.createdAt),
        originalTherapyId: tpaTherapy.therapyId, // Store original for API calls
      };
    });
  }, [tpaTherapiesData]);

  // Use therapies from API (already paginated and filtered)
  const paginatedTherapies = therapies;
  const totalItems = tpaTherapiesData?.total || 0;

  const handleAddNew = () => {
    setFormValues({
      therapyId: "",
      price: "",
      productCode: "",
      hsnCode: "",
      category: "",
      status: "active",
    });
    setFormErrors({});
    setSelectedTherapy(null);
    setDialogMode("add");
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

  const handleEdit = (therapy: TpaTherapy) => {
    setSelectedTherapy(therapy);
    // Set therapyId field to medicineName (therapyName) for display/editing
    // Store original therapyId in selectedTherapy for API submission
    setFormValues({
      therapyId: therapy.therapyName, // Use medicineName (therapyName) for the text field
      price: therapy.price.replace(/[₹\s]/g, ""),
      productCode: therapy.productCode,
      hsnCode: therapy.hsnCode,
      category: therapy.category || "",
      status: therapy.status === "Active" ? "active" : "inactive",
    });
    setFormErrors({});
    setDialogMode("edit");
  };

  const handleView = (therapy: TpaTherapy) => {
    setSelectedTherapy(therapy);
    setDialogMode("view");
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formValues.therapyId.trim()) errors.therapyId = "Therapy is required";
    if (!formValues.price.trim()) errors.price = "Price is required";
    if (!formValues.productCode.trim()) errors.productCode = "Product code is required";
    if (!formValues.hsnCode.trim()) errors.hsnCode = "HSN code is required";
    if (!formValues.category) errors.category = "Category is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;

    try {
      let result;
      
      if (dialogMode === "add") {
        // Try to parse therapyId as number, but allow text if it's not a number
        const therapyIdNum = parseInt(formValues.therapyId.trim(), 10);
        const therapyId = !isNaN(therapyIdNum) && therapyIdNum > 0 ? therapyIdNum : 0; // Default to 0 if not a valid number

        const payload = {
          therapyId: therapyId,
          medicineName: formValues.therapyId.trim(), // Using therapy text as medicineName
          price: formValues.price.trim(),
          productCode: formValues.productCode.trim(),
          hsnCode: formValues.hsnCode.trim(),
          category: formValues.category,
          status: formValues.status,
        };

        result = await createTpaTherapy(payload).unwrap();
        setSuccessMessage(result?.message || "TPA Therapy created successfully");
      } else if (dialogMode === "edit" && selectedTherapy) {
        // Use the original therapyId from the selected therapy for API
        // The therapyId field in formValues actually contains the medicineName text
        const therapyId = selectedTherapy.originalTherapyId || selectedTherapy.therapyId;

        const payload = {
          id: selectedTherapy.id,
          therapyId: therapyId,
          medicineName: formValues.therapyId.trim(), // Therapy field contains medicineName text
          price: formValues.price.trim(),
          productCode: formValues.productCode.trim(),
          hsnCode: formValues.hsnCode.trim(),
          category: formValues.category,
          status: formValues.status,
        };

        result = await updateTpaTherapy(payload).unwrap();
        setSuccessMessage(result?.message || "TPA Therapy updated successfully");
      }

      // Show success message
      setShowSuccessDialog(true);

      // Refetch data after successful creation/update
      await refetchTpaTherapies();

      setDialogMode(null);
      setSelectedTherapy(null);
      setFormValues({
        therapyId: "",
        price: "",
        productCode: "",
        hsnCode: "",
        category: "",
        status: "active",
      });
      setFormErrors({});
    } catch (error: any) {
      console.error(`Failed to ${dialogMode === "add" ? "create" : "update"} TPA therapy:`, error);
      
      // Handle error - show error message
      let errorMsg = `Failed to ${dialogMode === "add" ? "create" : "update"} TPA therapy. Please try again.`;
      
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

  const getStatusStyles = (status: "Active" | "Inactive") => {
    if (status === "Active") {
      return "border-[#0B8C00]/20 text-[#0B8C00] bg-[#0B8C000F]";
    }
    return "border-[#F6776E]/24 text-[#F6776E] bg-[#F6776E0F]";
  };

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <PageHeading title="TPA Therapy" />
        </div>

        <ListBorder as="section" className="px-4 py-4">
          <div className="w-full overflow-hidden rounded-[16px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold leading-[120%] text-[#434956]"></h2>

              <div className="flex items-center gap-3">
                <TableSearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search Here..." />
                <button
                  type="button"
                  className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] whitespace-nowrap"
                  onClick={handleAddNew}
                >
                  <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                  Add TPA Therapy
                </button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead position="first" className="whitespace-nowrap" >Sr no.</TableHead>
                  <TableHead 
                    sortable 
                    sortDirection={getSortDirection("medicineName")} 
                    onSort={() => handleSort("medicineName")}
                  >
                    Therapy
                  </TableHead>
                  <TableHead 
                    sortable 
                    sortDirection={getSortDirection("price")} 
                    onSort={() => handleSort("price")}
                  >
                    Price
                  </TableHead>
                  <TableHead 
                    sortable 
                    sortDirection={getSortDirection("productCode")} 
                    onSort={() => handleSort("productCode")}
                  >
                    Product Code
                  </TableHead>
                  <TableHead 
                    className="whitespace-nowrap"
                    sortable 
                    sortDirection={getSortDirection("hsnCode")} 
                    onSort={() => handleSort("hsnCode")}
                  >
                    HSN Code
                  </TableHead>
                  <TableHead 
                    sortable 
                    sortDirection={getSortDirection("category")} 
                    onSort={() => handleSort("category")}
                  >
                    Category
                  </TableHead>
                  <TableHead 
                    sortable 
                    sortDirection={getSortDirection("status")} 
                    onSort={() => handleSort("status")}
                  >
                    Status
                  </TableHead>
                  <TableHead 
                    sortable 
                    sortDirection={getSortDirection("createdAt")} 
                    onSort={() => handleSort("createdAt")}
                  >
                    Created At
                  </TableHead>
                  <TableHead position="last">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingTpaTherapies ? (
                  <TableRow>
                    <TableData colSpan={9} className="py-12 text-center text-sm text-[#9CA3AF]">
                      Loading...
                    </TableData>
                  </TableRow>
                ) : paginatedTherapies.length === 0 ? (
                  <TableRow>
                    <TableData colSpan={9} className="py-12 text-center text-sm text-[#9CA3AF]">
                      No therapies found
                    </TableData>
                  </TableRow>
                ) : (
                  paginatedTherapies.map((therapy, index) => (
                    <TableRow key={therapy.id}>
                      <TableData position="first">{(currentPage - 1) * itemsPerPage + index + 1}</TableData>
                      <TableData>{therapy.therapyName}</TableData>
                      <TableData className="whitespace-nowrap">{therapy.price}</TableData>
                      <TableData className="whitespace-nowrap">{therapy.productCode}</TableData>
                      <TableData className="whitespace-nowrap">{therapy.hsnCode}</TableData>
                      <TableData>{therapy.category}</TableData>
                      <TableData>
                        <span
                          className={`inline-flex h-[30px] items-center rounded-full border px-4 text-xs font-medium leading-[120%] ${getStatusStyles(therapy.status)}`}
                        >
                          {therapy.status}
                        </span>
                      </TableData>
                      <TableData className="whitespace-nowrap">{therapy.createdAt}</TableData>
                      <TableData position="last">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                            onClick={() => handleView(therapy)}
                            aria-label="View therapy"
                          >
                            <Image src="/icons/ViewEyeIcon.svg" alt="View" width={16} height={16} />
                          </button>
                          <button
                            type="button"
                            className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                            onClick={() => handleEdit(therapy)}
                            aria-label="Edit therapy"
                          >
                            <Image src="/icons/EditIconBlack.svg" alt="Edit" width={16} height={16} />
                          </button>
                        </div>
                      </TableData>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {!isLoadingTpaTherapies && totalItems > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={handleItemsPerPageChange}
                itemsPerPageOptions={[10, 20, 50, 100]}
              />
            )}
          </div>
        </ListBorder>
      </div>

      <Dialog
        open={dialogMode !== null}
        onClose={() => {
          setDialogMode(null);
          setFormErrors({});
          setSelectedTherapy(null);
          setFormValues({
            therapyId: "",
            price: "",
            productCode: "",
            hsnCode: "",
            category: "",
            status: "active",
          });
        }}
        title={dialogMode === "add" ? "Add TPA Therapy" : dialogMode === "edit" ? "Edit TPA Therapy" : "View therapy"}
        width={901}
      >
        {dialogMode === "view" && selectedTherapy ? (
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-[#7B8089]">Therapy</p>
              <p className="text-base font-medium text-[#262D3B]">{selectedTherapy.therapyName}</p>
            </div>
            <div>
              <p className="text-sm text-[#7B8089]">Price</p>
              <p className="text-base font-medium text-[#262D3B]">{selectedTherapy.price}</p>
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
            <div>
              <p className="text-sm text-[#7B8089]">Status</p>
              <p className="text-base font-medium text-[#262D3B]">{selectedTherapy.status}</p>
            </div>
            <div>
              <p className="text-sm text-[#7B8089]">Created At</p>
              <p className="text-base font-medium text-[#262D3B]">{selectedTherapy.createdAt}</p>
            </div>
            <div className="col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogMode(null);
                  setSelectedTherapy(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">
            <div className="col-span-2">
              <FormInputField
                label="Therapy"
                value={formValues.therapyId}
                onChange={(event) => {
                  if (dialogMode === "view") return;
                  setFormValues((prev) => ({ ...prev, therapyId: event.target.value }));
                  setFormErrors((prev) => ({ ...prev, therapyId: "" }));
                }}
                height={44}
                placeholder="Therapy"
                required={dialogMode !== "view"}
                disabled={dialogMode === "view"}
              />
              {formErrors.therapyId && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.therapyId}</p>}
            </div>
            <FormInputField
              label="Price"
              value={formValues.price}
              onChange={(event) => {
                if (dialogMode === "view") return;
                setFormValues((prev) => ({ ...prev, price: event.target.value }));
                setFormErrors((prev) => ({ ...prev, price: "" }));
              }}
              height={44}
              placeholder="Price"
              required={dialogMode !== "view"}
              disabled={dialogMode === "view"}
            />
            {formErrors.price && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.price}</p>}
            <FormInputField
              label="Product Code"
              value={formValues.productCode}
              onChange={(event) => {
                if (dialogMode === "view") return;
                setFormValues((prev) => ({ ...prev, productCode: event.target.value }));
                setFormErrors((prev) => ({ ...prev, productCode: "" }));
              }}
              height={44}
              placeholder="Product Code"
              required={dialogMode !== "view"}
              disabled={dialogMode === "view"}
            />
            {formErrors.productCode && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.productCode}</p>}
            <FormInputField
              label="HSN Code"
              value={formValues.hsnCode}
              onChange={(event) => {
                if (dialogMode === "view") return;
                setFormValues((prev) => ({ ...prev, hsnCode: event.target.value }));
                setFormErrors((prev) => ({ ...prev, hsnCode: "" }));
              }}
              height={44}
              placeholder="HSN Code"
              required={dialogMode !== "view"}
              disabled={dialogMode === "view"}
            />
            {formErrors.hsnCode && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.hsnCode}</p>}
            <FormSelectField
              label="Category"
              value={formValues.category}
              onChange={(value) => {
                if (dialogMode === "view") return;
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
              disabled={dialogMode === "view"}
            />
            {formErrors.category && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.category}</p>}
            <div className="col-span-2">
              <FormSelectField
                label="Status"
                value={formValues.status}
                onChange={(value) => {
                  if (dialogMode === "view") return;
                  setFormValues((prev) => ({
                    ...prev,
                    status: (Array.isArray(value) ? value[0] : value || "active") as "active" | "inactive",
                  }));
                }}
                options={statusOptions}
                placeholder="Status"
                mode="single"
                background="white"
                disabled={dialogMode === "view"}
              />
            </div>

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
                  setFormValues({
                    therapyId: "",
                    price: "",
                    productCode: "",
                    hsnCode: "",
                    category: "",
                    status: "active",
                  });
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


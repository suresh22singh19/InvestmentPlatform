"use client";

import Image from "next/image";
import { useState, useEffect, useMemo } from "react";
import { useAppDispatch } from "@/store/hooks";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
  Button,
  Dialog,
  FormInputField,
  TableSearchInput,
  Pagination,
  PanelCard,
  MessageDialog,
  FormSelectField,
} from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import {
  settingsApi,
  useGetAllMasterServicesQuery,
  useCreateMasterServiceMutation,
  useUpdateMasterServiceMutation,
  type GetAllMasterServicesResponse,
} from "@/store/api/settingsApi";
import { useDebounce } from "@/hooks/useDebounce";
import { usePermission } from "@/hooks/usePermission";
import { formatIndianAmount, formatIndianCurrency, parseIndianAmount } from "@/store/utils/formatIndianAmount";

const MASTER_CATEGORY = "service";
const MASTER_SUBCATEGORY = "consultancy";

type MasterServiceRow = {
  id: number;
  category: string;
  subCategory: string;
  price: number;
  status: boolean;
};

type CardRow = {
  id: number;
  name: string;
  status: "Active" | "Inactive";
  service: MasterServiceRow;
};

const STORAGE_KEY = "consultancy-service-page-state";

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

function formatRupee(amount: number | string): string {
  return formatIndianCurrency(amount);
}

export default function ConsultancyServiceSettingsPage() {
  const consultancyPermission = usePermission("settings", { subModule: "consultancy-service" });
  const canView = consultancyPermission.canView;
  const canAdd = consultancyPermission.canAdd;
  const canEdit = consultancyPermission.canEdit;

  const dispatch = useAppDispatch();
  const [searchTerm, setSearchTerm] = useState<string>(() => loadState().searchTerm);
  const [currentPage, setCurrentPage] = useState<number>(() => loadState().currentPage);
  const [itemsPerPage, setItemsPerPage] = useState<number>(() => loadState().itemsPerPage);
  const [dialogMode, setDialogMode] = useState<"add" | "view" | "edit" | null>(null);
  const [selectedService, setSelectedService] = useState<MasterServiceRow | null>(null);
  const [formValues, setFormValues] = useState({
    price: "",
    status: "true",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
  const [apiErrorMessage, setApiErrorMessage] = useState("");

  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const trimmedSearchTerm = debouncedSearchTerm.trim().toLowerCase();

  useEffect(() => {
    saveState({
      searchTerm,
      currentPage,
      itemsPerPage,
    });
  }, [searchTerm, currentPage, itemsPerPage]);

  /** Bare GET — no query string; loads once (no refetch on focus / mount churn / pagination). */
  const { data: listData, isLoading: isLoadingList } = useGetAllMasterServicesQuery(undefined, {
    skip: !canView,
    refetchOnFocus: false,
    refetchOnReconnect: false,
    refetchOnMountOrArgChange: false,
  });

  const [createMasterService, { isLoading: isCreating }] = useCreateMasterServiceMutation();
  const [updateMasterService, { isLoading: isUpdating }] = useUpdateMasterServiceMutation();

  const consultancyFiltered = useMemo(() => {
    const list =
      listData?.data?.filter(
        (item) => item.category === MASTER_CATEGORY && item.subCategory === MASTER_SUBCATEGORY
      ) ?? [];
    if (!trimmedSearchTerm) return list;
    return list.filter((item) => {
      const priceLabel = formatRupee(item.price).toLowerCase();
      const idStr = String(item.id);
      return (
        priceLabel.includes(trimmedSearchTerm) ||
        idStr.includes(trimmedSearchTerm) ||
        String(item.price).includes(trimmedSearchTerm)
      );
    });
  }, [listData?.data, trimmedSearchTerm]);

  const totalForPagination = consultancyFiltered.length;
  const pageSlice = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return consultancyFiltered.slice(start, start + itemsPerPage);
  }, [consultancyFiltered, currentPage, itemsPerPage]);

  const consultancyRows: CardRow[] = pageSlice.map((item) => ({
    id: item.id,
    name: formatRupee(item.price),
    status: item.status ? "Active" : "Inactive",
    service: {
      id: item.id,
      category: item.category,
      subCategory: item.subCategory,
      price: item.price,
      status: item.status,
    },
  }));

  const handleAddNew = () => {
    if (!canAdd) return;
    setFormValues({ price: "", status: "true" });
    setFormErrors({});
    setSelectedService(null);
    setDialogMode("add");
  };

  const openView = (service: MasterServiceRow) => {
    if (!canView && !canEdit) return;
    setSelectedService(service);
    setFormValues({ price: formatIndianAmount(service.price), status: String(service.status) });
    setFormErrors({});
    setDialogMode("view");
  };

  const openEdit = (service: MasterServiceRow) => {
    if (!canEdit) return;
    setSelectedService(service);
    setFormValues({ price: formatIndianAmount(service.price), status: String(service.status) });
    setFormErrors({});
    setDialogMode("edit");
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const raw = parseIndianAmount(formValues.price).trim();
    if (!raw) {
      errors.price = "Price is required";
    } else if (!/^\d{1,6}(\.\d{1,2})?$/.test(raw)) {
      errors.price = "Enter a valid amount (max 6 digits before decimal)";
    } else {
      const n = Number(raw);
      if (n < 0) {
        errors.price = "Price cannot be negative";
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canAdd) return;

    if (!validateForm()) {
      return;
    }

    try {
      const price = Number(parseIndianAmount(formValues.price).trim());
      const result = await createMasterService({
        category: MASTER_CATEGORY,
        subCategory: MASTER_SUBCATEGORY,
        price,
      }).unwrap();

      setSuccessMessage(result?.message || "Consultancy service created successfully");
      setShowSuccessDialog(true);

      if (result?.data) {
        dispatch(
          settingsApi.util.updateQueryData(
            "getAllMasterServices",
            undefined,
            (draft: GetAllMasterServicesResponse) => {
              if (!draft.data) draft.data = [];
              draft.data = [result.data!, ...draft.data];
              if (typeof draft.total === "number") draft.total += 1;
            }
          )
        );
      }

      setDialogMode(null);
      setFormValues({ price: "", status: "true" });
      setFormErrors({});
      setSelectedService(null);
    } catch (error: unknown) {
      console.error("Failed to create master service:", error);

      let errorMsg = "Failed to create consultancy service. Please try again.";
      const err = error as {
        data?: { message?: string; error?: string };
        error?: string;
        message?: string;
      };
      if (err?.data?.message) {
        errorMsg = err.data.message;
      } else if (err?.data?.error) {
        errorMsg = err.data.error;
      } else if (err?.error) {
        errorMsg = err.error;
      } else if (err?.message) {
        errorMsg = err.message;
      }

      setApiErrorMessage(errorMsg);
      setShowApiErrorDialog(true);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canEdit || !selectedService) return;

    if (!validateForm()) {
      return;
    }

    try {
      const price = Number(parseIndianAmount(formValues.price).trim());
      const status = formValues.status === "true";
      const result = await updateMasterService({
        id: selectedService.id,
        price,
        status,
      }).unwrap();

      setSuccessMessage(result?.message || "Consultancy service updated successfully");
      setShowSuccessDialog(true);

      if (result?.data) {
        dispatch(
          settingsApi.util.updateQueryData(
            "getAllMasterServices",
            undefined,
            (draft: GetAllMasterServicesResponse) => {
              if (Array.isArray(draft.data)) {
                const idx = draft.data.findIndex((item) => item.id === result.data!.id);
                if (idx !== -1) {
                  draft.data[idx] = result.data!;
                }
              }
            }
          )
        );
      }

      setDialogMode(null);
      setFormValues({ price: "", status: "true" });
      setFormErrors({});
      setSelectedService(null);
    } catch (error: unknown) {
      console.error("Failed to update master service:", error);

      let errorMsg = "Failed to update consultancy service. Please try again.";
      const err = error as {
        data?: { message?: string; error?: string };
        error?: string;
        message?: string;
      };
      if (err?.data?.message) {
        errorMsg = err.data.message;
      } else if (err?.data?.error) {
        errorMsg = err.data.error;
      } else if (err?.error) {
        errorMsg = err.error;
      } else if (err?.message) {
        errorMsg = err.message;
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

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <PageHeading title="Consultancy Service" />
        </div>

        <ListBorder as="section" className="px-4 py-4">
          {!canView ? (
            <div className="rounded-[16px] border border-[#E3EEE1] bg-white px-6 py-10 text-center text-sm text-[#9CA3AF]">
              You don&apos;t have permission to view consultancy service.
            </div>
          ) : (
            <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold leading-[120%] text-[#434956]"></h2>

                <div className="flex items-center gap-3">
                  <TableSearchInput
                    value={searchTerm}
                    onChange={(value) => {
                      setSearchTerm((prev) => {
                        if (prev !== value) setCurrentPage(1);
                        return value;
                      });
                    }}
                    placeholder="Search Here..."
                  />

                  {canAdd ? (
                    <button
                      type="button"
                      className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] whitespace-nowrap"
                      onClick={handleAddNew}
                    >
                      <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                      <span className="text-hide">Add Consultancy Fee</span>
                    </button>
                  ) : null}
                </div>
              </div>

              {isLoadingList ? (
                <div className="py-12 text-center text-sm text-[#9CA3AF]">Loading...</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                    {consultancyRows.map((row) => (
                      <PanelCard
                        key={row.id}
                        id={row.id}
                        name={row.name}
                        status={row.status}
                        isDefaultPanel
                        showStatusBadge
                        statusBadgeVariant="standard"
                        showViewButton={canView}
                        showEditButton={canEdit}
                        onView={() => openView(row.service)}
                        onEdit={() => openEdit(row.service)}
                      />
                    ))}
                  </div>

                  {consultancyRows.length === 0 && (
                    <div className="py-12 text-center text-sm text-[#9CA3AF]">
                      No consultancy fee entries found
                    </div>
                  )}
                </>
              )}

              {!isLoadingList && totalForPagination > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalItems={totalForPagination}
                  itemsPerPage={itemsPerPage}
                  onPageChange={handlePageChange}
                  onItemsPerPageChange={handleItemsPerPageChange}
                  itemsPerPageOptions={[10, 20, 50, 100]}
                />
              )}
            </div>
          )}
        </ListBorder>
      </div>

      <Dialog
        open={
          dialogMode !== null &&
          (dialogMode === "add" ? canAdd : canView || canEdit)
        }
        onClose={() => {
          setDialogMode(null);
          setFormErrors({});
          setSelectedService(null);
        }}
        title={
          dialogMode === "add"
            ? "Add Consultancy Fee"
            : dialogMode === "edit"
              ? "Edit Consultancy Fee"
              : "View Consultancy Fee"
        }
        width={686}
        closeOnOutsideClick={false}
      >
        <form
          onSubmit={
            dialogMode === "add"
              ? handleSubmit
              : dialogMode === "edit"
                ? handleEditSubmit
                : (e) => e.preventDefault()
          }
          className="space-y-6"
        >
          <div className="space-y-6">
            <div className="rounded-[12px] border border-[#E3EEE1] bg-[#F9FAF9] px-4 py-3 text-sm text-[#434956]">
              <p className="font-medium text-[#262D3B]">Master service</p>
              <p className="mt-1">
                Category: <span className="font-medium capitalize">{MASTER_CATEGORY}</span>
                {" · "}
                Sub-category: <span className="font-medium capitalize">{MASTER_SUBCATEGORY}</span>
              </p>
            </div>

            <div>
              <FormInputField
                label="Price *"
                value={formValues.price}
                onChange={(event) => {
                  if (dialogMode === "view") return;
                  const raw = parseIndianAmount(event.target.value).replace(/[^\d.]/g, "");
                  const parts = raw.split(".");
                  let integerPart = parts[0];
                  if (integerPart.startsWith("0")) {
                    integerPart = integerPart.replace(/^0+/, "");
                  }
                  if (integerPart.length > 6) {
                    integerPart = integerPart.slice(0, 6);
                  }
                  let fractionalPart = parts[1];
                  if (fractionalPart !== undefined) {
                    if (fractionalPart.length > 2) {
                      fractionalPart = fractionalPart.slice(0, 2);
                    }
                  }
                  const normalized =
                    fractionalPart !== undefined ? `${integerPart}.${fractionalPart}` : integerPart;
                  const formatted = normalized ? formatIndianAmount(normalized) : "";
                  setFormValues((prev) => ({ ...prev, price: formatted }));
                  setFormErrors((prev) => ({ ...prev, price: "" }));
                }}
                height={44}
                placeholder="e.g. 500"
                required={dialogMode === "add" || dialogMode === "edit"}
                disabled={dialogMode === "view"}
                error={formErrors.price}
                inputMode="decimal"
              />
            </div>

            {(dialogMode === "view" || dialogMode === "edit") && (
              <div>
                <FormSelectField
                  label="Status *"
                  options={[
                    { label: "Active", value: "true" },
                    { label: "Inactive", value: "false" },
                  ]}
                  placeholder="Select status"
                  mode="single"
                  background="white"
                  width="100%"
                  value={formValues.status}
                  onChange={(value) => {
                    if (dialogMode === "view") return;
                    const val = typeof value === "string" ? value : Array.isArray(value) ? value[0] ?? "" : "";
                    setFormValues((prev) => ({ ...prev, status: val }));
                    setFormErrors((prev) => ({ ...prev, status: "" }));
                  }}
                  disabled={dialogMode === "view"}
                  error={formErrors.status}
                />
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
                  setSelectedService(null);
                }}
              >
                Close
              </Button>
            ) : dialogMode === "edit" ? (
              <>
                <Button type="submit" variant="primary" isLoading={isUpdating} disabled={isUpdating}>
                  Update Consultancy Fee
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogMode(null);
                    setFormErrors({});
                    setSelectedService(null);
                  }}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button type="submit" variant="primary" isLoading={isCreating} disabled={isCreating}>
                  Add Consultancy Fee
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogMode(null);
                    setFormErrors({});
                    setSelectedService(null);
                  }}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </form>
      </Dialog>

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

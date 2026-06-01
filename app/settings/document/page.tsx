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
  FormTextareaField,
  TableSearchInput,
  Pagination,
  PanelCard as DocumentCard,
  MessageDialog,
} from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import type { SelectOption } from "@/components/ui/FormSelectField";
import {
  useGetAllDocumentsQuery,
  useAddDocumentMutation,
  useUpdateDocumentMutation,
} from "@/store/api/settingsApi";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { useDebounce } from "@/hooks/useDebounce";
import { usePermission } from "@/hooks/usePermission";

type Document = {
  id: number;
  branchId?: number;
  name: string;
  description: string;
  documentType: string;
  mandatory: boolean;
  status: "Active" | "Inactive";
  isDefaultDocument?: boolean;
};

const activeOptions: SelectOption[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const documentTypeOptions: SelectOption[] = [
  { value: "ipd_admission", label: "IPD Admission" }
];

const STORAGE_KEY = "document-page-state";

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

export default function DocumentPage() {
  const documentPermission = usePermission("settings", { subModule: "document-master" });
  const canView = documentPermission.canView 
  const canAdd = documentPermission.canAdd 
  const canEdit = documentPermission.canEdit 

  const { filterBranchId, branchFilterPersistReady } = useBranchFilter({
    persistSuperAdminSelectionKey: "hiims-settings-document-branch",
  });

  const shouldSkipDocumentsQuery = !branchFilterPersistReady;

  const [searchTerm, setSearchTerm] = useState<string>(() => loadState().searchTerm);
  const [currentPage, setCurrentPage] = useState<number>(() => loadState().currentPage);
  const [itemsPerPage, setItemsPerPage] = useState<number>(() => loadState().itemsPerPage);
  const [dialogMode, setDialogMode] = useState<"add" | "edit" | "view" | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [formValues, setFormValues] = useState({
    name: "",
    description: "",
    documentType: "",
    mandatory: false,
    active: "active" as "active" | "inactive",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  /** Add/Edit/View dialog: super admin can change; others locked to the page branch (disabled). */
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
  const [apiErrorMessage, setApiErrorMessage] = useState("");


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

  // Fetch documents from API (scoped by branch for super-admin and facility users)
  const { data: documentsData, isLoading: isLoadingDocuments, refetch: refetchDocuments } = useGetAllDocumentsQuery(
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
      skip: shouldSkipDocumentsQuery,
      /** Fresh GET whenever branch (or other args) change; avoid stale list after switching branch. */
      refetchOnMountOrArgChange: true,
    }
  );

  // Create document mutation
  const [createDocument, { isLoading: isCreating }] = useAddDocumentMutation();
  
  // Update document mutation
  const [updateDocument, { isLoading: isUpdating }] = useUpdateDocumentMutation();

  // Map API data to Document format
  const documents: Document[] = documentsData?.data?.map((document: any) => {
    const mappedDocument: Document = {
      id: document.id,
      branchId: document.branchId ?? document.branch?.id,
      name: document.documentName ?? document.name ?? "",
      description: String(document.description ?? ""),
      documentType: String(document.documentType ?? document.type ?? ""),
      mandatory: Boolean(document.isMandatory ?? document.mandatory ?? false),
      status: document.isActive === true || document.status === "active" || document.status === "Active" ? "Active" : "Inactive",
      isDefaultDocument: (document as any).isDefaultPanel || false,
    };
    return mappedDocument;
  }) || [];

  // Use documents from API
  const filteredDocuments = documents;
  const paginatedDocuments = documents;

  const handleAddNew = () => {
    if (!canAdd) return;
    setFormValues({
      name: "",
      description: "",
      documentType: "",
      mandatory: false,
      active: "active",
    });
    setFormErrors({});
    setSelectedDocument(null);
    setDialogMode("add");
  };

  const handleEdit = (document: Document) => {
    if (!canEdit) return;
    // Prevent editing default documents
    if (document.isDefaultDocument) {
      return;
    }
    setSelectedDocument(document);
    setFormValues({
      name: document.name,
      description: document.description,
      documentType: document.documentType,
      mandatory: document.mandatory,
      active: document.status === "Active" ? "active" : "inactive",
    });
    setFormErrors({});
    setDialogMode("edit");
  };

  const handleView = (document: Document) => {
    if (!canView) return;
    setSelectedDocument(document);
    setFormValues({
      name: document.name,
      description: document.description,
      documentType: document.documentType,
      mandatory: document.mandatory,
      active: document.status === "Active" ? "active" : "inactive",
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
    if (!formValues.documentType.trim()) {
      errors.documentType = "Document type is required";
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





    try {
      let result;
      
      if (dialogMode === "add") {
        const payload = {
          documentName: formValues.name.trim(),
          description: formValues.description.trim(),
          documentType: formValues.documentType,
          isMandatory: formValues.mandatory,
          isActive: formValues.active === "active",
        };

        result = await createDocument(payload).unwrap();
        setSuccessMessage(result?.message || "Document created successfully");
      } else if (dialogMode === "edit" && selectedDocument) {
        // Prevent updating default documents
        if (selectedDocument.isDefaultDocument) {
          return;
        }
        const payload = {
          id: selectedDocument.id,
          documentName: formValues.name.trim(),
          description: formValues.description.trim(),
          documentType: formValues.documentType,
          isMandatory: formValues.mandatory,
          isActive: formValues.active === "active",
        };

        result = await updateDocument(payload).unwrap();
        setSuccessMessage(result?.message || "Document updated successfully");
      }

      // Show success message
      setShowSuccessDialog(true);

      // Refetch data after successful creation/update
      await refetchDocuments();

      setDialogMode(null);
      setFormValues({
        name: "",
        description: "",
        documentType: "",
        mandatory: false,
        active: "active",
      });
      setFormErrors({});
      setSelectedDocument(null);
    } catch (error: any) {
      console.error(`Failed to ${dialogMode === "add" ? "create" : "update"} document:`, error);
      
      // Handle error - show error message
      let errorMsg = `Failed to ${dialogMode === "add" ? "create" : "update"} document. Please try again.`;
      
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




  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <PageHeading title="Document Master" />
        </div>

        <ListBorder as="section" className="px-4 py-4">
          {!canView ? (
            <div className="rounded-[20px] border border-[#E3EEE1] bg-white px-6 py-10 text-center text-sm text-[#9CA3AF]">
              You don&apos;t have permission to view document.
            </div>
          ) : (
          <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
            <div className="mb-6 flex min-w-0 flex-nowrap items-center justify-end gap-3 overflow-x-auto">

              <div className="w-[280px] shrink-0 min-w-[200px]">
                <TableSearchInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search Here..."
                />
              </div>
              {canAdd ? (
                <button
                  type="button"
                  className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] whitespace-nowrap"
                  onClick={handleAddNew}
                >
                  <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                  <span className="text-hide">Add Document</span>
                </button>
              ) : null}
            </div>

            {isLoadingDocuments ? (
              <div className="py-12 text-center text-sm text-[#9CA3AF]">Loading...</div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {paginatedDocuments.map((document) => (
                    <DocumentCard
                      key={document.id}
                      id={document.id}
                      name={document.name}
                      status={document.status}
                      isDefaultPanel={document.isDefaultDocument || false}
                      onView={() => handleView(document)}
                      onEdit={() => handleEdit(document)}
                      showViewButton={canView}
                      showEditButton={canEdit}
                    />
                  ))}
                </div>

                {filteredDocuments.length === 0 && (
                  <div className="py-12 text-center text-sm text-[#9CA3AF]">No documents found</div>
                )}
              </>
            )}

            {!isLoadingDocuments && (documentsData?.total || filteredDocuments.length) > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={documentsData?.total || filteredDocuments.length}
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
          setSelectedDocument(null);
        }}
        title={dialogMode === "add" ? "Add Document" : dialogMode === "edit" ? "Edit Document" : "View Document"}
        width={686}
      >
        <form onSubmit={dialogMode !== "view" ? handleSubmit : (e) => e.preventDefault()} className="space-y-6">
          <div className="space-y-5 md:space-y-6">
            <div>
              <FormInputField
                label="Name *"
                value={formValues.name}
                onChange={(event) => {
                  if (dialogMode === "view" || selectedDocument?.isDefaultDocument) return;
                  let value = event.target.value.replace(/[^a-zA-Z\s]/g, "");
                  value = value.slice(0, 100);
                  setFormValues((prev) => ({ ...prev, name: value }));
                  setFormErrors((prev) => ({ ...prev, name: "" }));
                }}
                height={44}
                placeholder="Name"
                maxLength={100}
                required={dialogMode !== "view"}
                disabled={dialogMode === "view" || selectedDocument?.isDefaultDocument}
                error={formErrors.name}
              />
            </div>

            <div>
              <FormSelectField
                label="Type *"
                value={formValues.documentType}
                onChange={(value) => {
                  if (dialogMode === "view" || selectedDocument?.isDefaultDocument) return;
                  setFormValues((prev) => ({
                    ...prev,
                    documentType: (Array.isArray(value) ? value[0] : value || ""),
                  }));
                  setFormErrors((prev) => ({ ...prev, documentType: "" }));
                }}
                options={documentTypeOptions}
                placeholder="Type"
                mode="single"
                background="white"
                disabled={dialogMode === "view" || selectedDocument?.isDefaultDocument}
                error={formErrors.documentType}
              />
            </div>

       

            <div>
              <FormSelectField
                label="Active *"
                value={formValues.active}
                onChange={(value) => {
                  if (dialogMode === "view" || selectedDocument?.isDefaultDocument) return;
                  setFormValues((prev) => ({
                    ...prev,
                    active: (Array.isArray(value) ? value[0] : value || "active") as "active" | "inactive",
                  }));
                }}
                options={activeOptions}
                placeholder="Active"
                mode="single"
                background="white"
                disabled={dialogMode === "view" || selectedDocument?.isDefaultDocument}
              />
            </div>

            <div>
              <FormTextareaField
                label="Description *"
                value={formValues.description}
                onChange={(event) => {
                  if (dialogMode === "view" || selectedDocument?.isDefaultDocument) return;
                  const value = event.target.value.slice(0, 500);
                  setFormValues((prev) => ({ ...prev, description: value }));
                  setFormErrors((prev) => ({ ...prev, description: "" }));
                }}
                placeholder="Description"
                maxLength={500}
                required={dialogMode !== "view"}
                disabled={dialogMode === "view" || selectedDocument?.isDefaultDocument}
                error={formErrors.description}
              />
            </div>
                 <div className="flex items-center gap-3 pt-0 pb-2 mb-5 ms-5">
              <p className="text-xs font-medium text-[#7B8089]">Mandatory</p>
              <button
                type="button"
                role="switch"
                aria-checked={formValues.mandatory}
                onClick={() => {
                  if (dialogMode === "view" || selectedDocument?.isDefaultDocument) return;
                  setFormValues((prev) => ({ ...prev, mandatory: !prev.mandatory }));
                }}
                disabled={dialogMode === "view" || selectedDocument?.isDefaultDocument}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formValues.mandatory ? "bg-[#0B8C00]" : "bg-[#E5E7EB]"
                } ${dialogMode === "view" || selectedDocument?.isDefaultDocument ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formValues.mandatory ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span className="text-sm font-medium text-[#262D3B]">{formValues.mandatory ? "Yes" : "No"}</span>
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
                    setSelectedDocument(null);
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
                  disabled={isCreating || isUpdating || selectedDocument?.isDefaultDocument}
                >
                  {dialogMode === "add" ? "Save" : "Update"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogMode(null);
                    setFormErrors({});
                    setSelectedDocument(null);
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


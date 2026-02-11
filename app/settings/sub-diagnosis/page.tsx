"use client";

import Image from "next/image";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
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
import { 
  useGetDiagnosisCategoriesQuery,
  useCreateSubDiagnosisMutation,
  useUpdateSubDiagnosisMutation
} from "@/store/api/settingsApi";
import { useDebounce } from "@/hooks/useDebounce";

type SubDiagnosisItem = {
  id?: number;
  name: string;
};

type SubDiagnosis = {
  id: number;
  diagnosis: string;
  diagnosisId: number;
  status: "active" | "inactive";
  type: string;
  sort: number | null;
  subDiagnoses: SubDiagnosisItem[];
};

export default function SubDiagnosisPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [diagnosisFilter, setDiagnosisFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [viewAllDialogOpen, setViewAllDialogOpen] = useState(false);
  const [chipsDialogItems, setChipsDialogItems] = useState<string[]>([]); // For display only
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSubDiagnosis, setSelectedSubDiagnosis] = useState<SubDiagnosis | null>(null);
  const [formValues, setFormValues] = useState({
    diagnosis: "",
    diagnosisId: 0,
    status: "active" as "active" | "inactive",
    type: "doctor",
    sort: 0,
    subDiagnoses: [] as SubDiagnosisItem[],
  });
  const [subDiagnosisInput, setSubDiagnosisInput] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
  const [apiErrorMessage, setApiErrorMessage] = useState("");

  // Debounce search to avoid too many API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const trimmedSearchTerm = debouncedSearchTerm.trim();
  const searchParam = trimmedSearchTerm || undefined;

  // Fetch diagnosis categories with sub-diagnoses from API
  const { data: diagnosisCategoriesData, isLoading: isLoadingDiagnosis, refetch: refetchDiagnosis } = useGetDiagnosisCategoriesQuery({
    page: currentPage,
    limit: itemsPerPage,
    search: searchParam,
    sort: sortBy || undefined,
    order: sortBy ? sortOrder : undefined,
  });

  // Create sub-diagnosis mutation
  const [createSubDiagnosis, { isLoading: isCreating }] = useCreateSubDiagnosisMutation();
  
  // Update sub-diagnosis mutation
  const [updateSubDiagnosis, { isLoading: isUpdating }] = useUpdateSubDiagnosisMutation();

  // Transform API data to SubDiagnosis format
  const subDiagnoses: SubDiagnosis[] = useMemo(() => {
    if (!diagnosisCategoriesData?.data) return [];
    
    return diagnosisCategoriesData.data.map((category) => ({
      id: category.id,
      diagnosis: category.diagnosisCategory,
      diagnosisId: category.id,
      status: category.status,
      type: category.type,
      sort: category.sort || 0,
      subDiagnoses: category.subDiagnoses.map((sub) => ({
        id: sub.id,
        name: sub.name,
      })),
    }));
  }, [diagnosisCategoriesData]);

  // Get diagnosis options for dropdown
  const diagnosisOptions: SelectOption[] = useMemo(() => {
    if (!diagnosisCategoriesData?.data) return [];
    
    return diagnosisCategoriesData.data.map((category) => ({
      value: category.id.toString(),
      label: category.diagnosisCategory,
    }));
  }, [diagnosisCategoriesData]);

  const filteredData = useMemo(() => {
    let filtered = subDiagnoses.filter((item) => {
      const matchesDiagnosis = diagnosisFilter ? item.diagnosisId.toString() === diagnosisFilter : true;
      const matchesSearch =
        item.diagnosis.toLowerCase().includes(trimmedSearchTerm.toLowerCase()) ||
        item.subDiagnoses.some((sub) => sub.name.toLowerCase().includes(trimmedSearchTerm.toLowerCase()));
      return matchesDiagnosis && matchesSearch;
    });

    // Apply client-side sorting if sortBy is set
    if (sortBy) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        if (sortBy === "diagnosis") {
          aValue = a.diagnosis.toLowerCase();
          bValue = b.diagnosis.toLowerCase();
        } else if (sortBy === "subDiagnoses") {
          aValue = a.subDiagnoses.length;
          bValue = b.subDiagnoses.length;
        } else {
          return 0;
        }

        if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
        if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [subDiagnoses, diagnosisFilter, trimmedSearchTerm, sortBy, sortOrder]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSubDiagnoses = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const handleOpenViewAll = (items: SubDiagnosisItem[]) => {
    setChipsDialogItems(items.map(item => item.name));
    setViewAllDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedSubDiagnosis(null);
    setFormValues({ 
      diagnosis: "", 
      diagnosisId: 0, 
      status: "active",
      type: "doctor",
      sort: 0,
      subDiagnoses: [] 
    });
    setSubDiagnosisInput("");
    setFormErrors({});
    setAddDialogOpen(true);
  };

  const handleEdit = (entry: SubDiagnosis) => {
    setSelectedSubDiagnosis(entry);
    setFormValues({ 
      diagnosis: entry.diagnosis, 
      diagnosisId: entry.diagnosisId,
      status: entry.status,
      type: entry.type,
      sort: entry.sort || 0,
      subDiagnoses: entry.subDiagnoses.map(sub => ({ ...sub })) // Preserve IDs
    });
    setSubDiagnosisInput("");
    setFormErrors({});
    setEditDialogOpen(true);
  };

  const handleAddChip = () => {
    if (!subDiagnosisInput.trim()) {
      return;
    }
    setFormValues((prev) => ({
      ...prev,
      subDiagnoses: [...prev.subDiagnoses, { name: subDiagnosisInput.trim() }], // New items don't have IDs
    }));
    setSubDiagnosisInput("");
    setFormErrors((prev) => ({ ...prev, subDiagnoses: "" }));
  };

  const handleRemoveChip = (index: number) => {
    setFormValues((prev) => ({
      ...prev,
      subDiagnoses: prev.subDiagnoses.filter((_, i) => i !== index),
    }));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    // Only validate diagnosis for add mode (not edit mode)
    if (!selectedSubDiagnosis && (!formValues.diagnosisId || formValues.diagnosisId === 0)) {
      errors.diagnosis = "Diagnosis is required";
    }
    if (formValues.subDiagnoses.length === 0) errors.subDiagnoses = "At least one sub diagnosis is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;

    try {
      let result;
      
      if (!selectedSubDiagnosis) {
        // Add new sub-diagnoses
        const payload = {
          parentId: formValues.diagnosisId,
          subDiagnoses: formValues.subDiagnoses.map((sub) => ({ name: sub.name })),
        };

        result = await createSubDiagnosis(payload).unwrap();
        setSuccessMessage(result?.message || "Sub diagnosis created successfully");
        
        // Refetch data after successful creation
        await refetchDiagnosis();

        setAddDialogOpen(false);
      } else {
        // Update existing sub-diagnoses
        const payload = {
          id: selectedSubDiagnosis.diagnosisId,
          diagnosisCategory: formValues.diagnosis,
          status: formValues.status,
          type: formValues.type,
          sort: formValues.sort,
          subDiagnoses: formValues.subDiagnoses.map((sub) => {
            // Preserve ID for existing items, omit for new items
            if (sub.id) {
              return { id: sub.id, name: sub.name };
            }
            return { name: sub.name };
          }),
        };

        result = await updateSubDiagnosis(payload).unwrap();
        setSuccessMessage(result?.message || "Sub diagnosis updated successfully");
        
        // Refetch data after successful update
        await refetchDiagnosis();

        setEditDialogOpen(false);
      }

      setShowSuccessDialog(true);
      setSelectedSubDiagnosis(null);
      setFormValues({ 
        diagnosis: "", 
        diagnosisId: 0, 
        status: "active",
        type: "doctor",
        sort: 0,
        subDiagnoses: [] 
      });
      setSubDiagnosisInput("");
      setFormErrors({});
    } catch (error: any) {
      console.error(`Failed to ${selectedSubDiagnosis ? "update" : "create"} sub diagnosis:`, error);
      
      let errorMsg = `Failed to ${selectedSubDiagnosis ? "update" : "create"} sub diagnosis. Please try again.`;
      
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

  const handleSort = (column: string) => {
    if (sortBy === column) {
      // Toggle sort order if same column
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Set new column and default to ascending
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const getSortDirection = (column: string): "asc" | "desc" | null => {
    if (sortBy === column) {
      return sortOrder;
    }
    return null;
  };

  // Dynamic component to display sub-diagnosis items based on available space
  const DynamicSubDiagnosisItems = ({ items }: { items: SubDiagnosisItem[] }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const itemsRef = useRef<(HTMLSpanElement | null)[]>([]);
    const [visibleCount, setVisibleCount] = useState(items.length);
    const [isOverflowing, setIsOverflowing] = useState(false);

    const calculateVisibleItems = useCallback(() => {
      if (!containerRef.current || items.length === 0) {
        setVisibleCount(items.length);
        setIsOverflowing(false);
        return;
      }

      // Use double RAF to ensure DOM is fully updated
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!containerRef.current) return;

          const container = containerRef.current;
          const containerWidth = container.offsetWidth;
          const gap = 8; // gap-2 = 8px
          const basePadding = 32; // px-4 = 16px on each side
          const charWidth = 7; // Approximate character width for text-xs
          const viewAllButtonBaseWidth = 90; // Base width for "View all" button

          let totalWidth = 0;
          let count = 0;

          // Calculate how many items can fit
          for (let i = 0; i < items.length; i++) {
            const itemElement = itemsRef.current[i];
            let itemWidth: number;
            
            if (itemElement && itemElement.offsetWidth > 0) {
              // Use actual measured width
              itemWidth = itemElement.offsetWidth + gap;
            } else {
              // Estimate width based on text length
              const textWidth = items[i].name.length * charWidth;
              itemWidth = Math.max(60, textWidth + basePadding) + gap;
            }

            // Check if we need to show "View all" button
            const needsViewAllButton = i < items.length - 1;
            const viewAllButtonWidth = needsViewAllButton 
              ? viewAllButtonBaseWidth + (items.length - i - 1).toString().length * charWidth + gap
              : 0;

            const requiredWidth = totalWidth + itemWidth + viewAllButtonWidth;

            if (requiredWidth > containerWidth && i > 0) {
              // We need to show "View all" button, so stop here
              count = i;
              setIsOverflowing(true);
              break;
            }

            totalWidth += itemWidth;
            count = i + 1;
          }

          // If all items fit, no overflow
          if (count === items.length) {
            setIsOverflowing(false);
          } else if (count === 0 && items.length > 0) {
            // Even first item doesn't fit, show at least one with "View all"
            count = 1;
            setIsOverflowing(true);
          }

          setVisibleCount(count);
        });
      });
    }, [items]);

    useEffect(() => {
      // Reset refs array when items change
      itemsRef.current = new Array(items.length).fill(null);
      
      // Initial calculation
      const timeoutId = setTimeout(() => {
        calculateVisibleItems();
      }, 50); // Small delay to ensure container is rendered

      // Recalculate on window resize with debounce
      let resizeTimeout: NodeJS.Timeout;
      const handleResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          calculateVisibleItems();
        }, 100);
      };
      
      window.addEventListener('resize', handleResize);
      
      // Use ResizeObserver to detect container size changes
      let resizeObserver: ResizeObserver | null = null;
      if (containerRef.current) {
        resizeObserver = new ResizeObserver(() => {
          calculateVisibleItems();
        });
        resizeObserver.observe(containerRef.current);
      }

      return () => {
        clearTimeout(timeoutId);
        clearTimeout(resizeTimeout);
        window.removeEventListener('resize', handleResize);
        if (resizeObserver && containerRef.current) {
          resizeObserver.unobserve(containerRef.current);
        }
      };
    }, [calculateVisibleItems, items]);

    const visibleItems = items.slice(0, visibleCount);
    const remainingCount = items.length - visibleCount;

    return (
      <div ref={containerRef} className="flex flex-wrap items-center gap-2 w-full min-w-0">
        {visibleItems.map((item, index) => (
          <span
            key={`${item.id || item.name}-${index}`}
            ref={(el) => {
              itemsRef.current[index] = el;
            }}
            className="inline-flex h-[30px] items-center justify-center rounded-[30px] border border-[#FDC70F]/32 bg-[#FDC70F]/5 px-4 text-xs font-semibold leading-[120%] text-[#9A7909] whitespace-nowrap"
          >
            {item.name}
          </span>
        ))}
        {isOverflowing && remainingCount > 0 && (
          <button
            type="button"
            onClick={() => handleOpenViewAll(items)}
            className="inline-flex h-[30px] items-center justify-center rounded-[30px] border border-[#FDC70F]/32 bg-[#FDC70F]/5 px-4 text-xs font-semibold leading-[120%] text-[#9A7909] whitespace-nowrap"
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
          <PageHeading title="Sub Diagnosis" />
        </div>

        <ListBorder as="section" className="px-4 py-4">
          <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
            <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <h2 className="text-lg font-semibold leading-[120%] text-[#434956]"></h2>

              <div className="flex items-center gap-3">
                <div className="w-[300px]">
                  <FormSelectField
                    label=""
                    options={[{ value: "", label: "All" }, ...diagnosisOptions]}
                    value={diagnosisFilter || null}
                    onChange={(value) => {
                      const next = Array.isArray(value) ? value[0] : value;
                      setDiagnosisFilter(next || "");
                      setCurrentPage(1);
                    }}
                    placeholder="Select Diagnosis"
                    background="normal"
                  />
                </div>

                <div className="w-[300px]">
                  <TableSearchInput
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="Search Here..."
                  />
                </div>

                    <div className="w-full lg:w-auto lg:flex-shrink-0">
                  <button
                    type="button"
                    className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[#0B8C00]/20"
                    onClick={handleAdd}
                  >
                    <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                    Add Sub Diagnosis
                  </button>
                </div>
              </div>
            </div>

            {isLoadingDiagnosis ? (
              <div className="py-12 text-center text-sm text-[#9CA3AF]">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead position="first">Sr no.</TableHead>
                    <TableHead 
                      sortable 
                      sortDirection={getSortDirection("diagnosis")} 
                      onSort={() => handleSort("diagnosis")}
                    >
                      Diagnosis
                    </TableHead>
                    <TableHead 
                      sortable 
                      sortDirection={getSortDirection("subDiagnoses")} 
                      onSort={() => handleSort("subDiagnoses")}
                    >
                      Sub Diagnosis
                    </TableHead>
                    <TableHead position="last">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSubDiagnoses.length === 0 ? (
                    <TableRow>
                      <TableData colSpan={4} className="py-12 text-center text-sm text-[#9CA3AF]">
                        No sub diagnoses found
                      </TableData>
                    </TableRow>
                  ) : (
                    paginatedSubDiagnoses.map((entry, index) => (
                      <TableRow key={entry.id}>
                        <TableData position="first">{startIndex + index + 1}</TableData>
                        <TableData>{entry.diagnosis}</TableData>
                        <TableData>
                          <DynamicSubDiagnosisItems items={entry.subDiagnoses} />
                        </TableData>
                        <TableData position="last">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleEdit(entry)}
                              className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                              aria-label="Edit sub diagnosis"
                            >
                              <Image src="/icons/EditIconBlack.svg" alt="Edit" width={20} height={20} />
                            </button>
                          </div>
                        </TableData>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}

            {!isLoadingDiagnosis && (diagnosisCategoriesData?.total || filteredData.length) > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={diagnosisCategoriesData?.total || filteredData.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(items) => {
                  setItemsPerPage(items);
                  setCurrentPage(1);
                }}
                itemsPerPageOptions={[10, 20, 50,100]}
              />
            )}
          </div>
        </ListBorder>
      </div>

      <Dialog
        open={viewAllDialogOpen}
        onClose={() => {
          setViewAllDialogOpen(false);
          setChipsDialogItems([]);
        }}
        title="View Sub Diagnoses"
        width={772}
      >
        <div className="flex flex-wrap gap-2">
          {chipsDialogItems.map((item, idx) => (
            <span
              key={`${item}-${idx}`}
              className="inline-flex h-[30px] items-center justify-center rounded-[30px] border border-[#FDC70F]/32 bg-[#FDC70F]/5 px-5 text-xs font-semibold leading-[120%] text-[#9A7909]"
            >
              {item}
            </span>
          ))}
        </div>
      </Dialog>

      <Dialog
        open={addDialogOpen}
        onClose={() => {
          setAddDialogOpen(false);
          setFormErrors({});
          setSubDiagnosisInput("");
          setFormValues({ 
            diagnosis: "", 
            diagnosisId: 0, 
            status: "active",
            type: "doctor",
            sort: 0,
            subDiagnoses: [] 
          });
        }}
        title="Add Sub Diagnosis"
        width={949}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <FormSelectField
              label="Diagnosis"
              value={formValues.diagnosisId > 0 ? formValues.diagnosisId.toString() : ""}
              onChange={(value) => {
                const next = Array.isArray(value) ? value[0] : value;
                const selectedOption = diagnosisOptions.find((opt) => opt.value === next);
                setFormValues((prev) => ({ 
                  ...prev, 
                  diagnosis: selectedOption?.label || "",
                  diagnosisId: next ? parseInt(next) : 0
                }));
                setFormErrors((prev) => ({ ...prev, diagnosis: "" }));
              }}
              options={diagnosisOptions}
              placeholder="Select Diagnosis"
              mode="single"
              background="white"
            />
            {formErrors.diagnosis && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.diagnosis}</p>}
          </div>

          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <FormInputField
                  label="Sub Diagnosis"
                  value={subDiagnosisInput}
                  onChange={(event) => {
                    setSubDiagnosisInput(event.target.value);
                    setFormErrors((prev) => ({ ...prev, subDiagnoses: "" }));
                  }}
                  height={44}
                  placeholder="Sub Diagnosis"
                />
              </div>
              <button
                type="button"
                onClick={handleAddChip}
                className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] whitespace-nowrap"
              >
                <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                Add
              </button>
            </div>

            {formErrors.subDiagnoses && <p className="text-xs text-[#F6776E]">{formErrors.subDiagnoses}</p>}

            {formValues.subDiagnoses.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formValues.subDiagnoses.map((item, index) => (
                  <span
                    key={`${item.id || item.name}-${index}`}
                    className="inline-flex h-[30px] items-center gap-2 rounded-[30px] border border-[#FDC70F]/32 bg-[#FDC70F]/5 px-4 text-xs font-semibold leading-[120%] text-[#9A7909]"
                  >
                    {item.name}
                    <button
                      type="button"
                      onClick={() => handleRemoveChip(index)}
                      className="text-[#F6776E] transition-colors hover:text-[#D94F46]"
                      aria-label={`Remove ${item.name}`}
                    >
                      <Image src="/icons/TrashRedIcon.svg" alt="Remove" width={14} height={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button 
              type="submit" 
              variant="primary"
              isLoading={isCreating}
              disabled={isCreating}
            >
              Add Sub Diagnosis
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAddDialogOpen(false);
                setFormErrors({});
                setSubDiagnosisInput("");
                setFormValues({ 
                  diagnosis: "", 
                  diagnosisId: 0, 
                  status: "active",
                  type: "doctor",
                  sort: 0,
                  subDiagnoses: [] 
                });
              }}
              disabled={isCreating}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedSubDiagnosis(null);
          setSubDiagnosisInput("");
          setFormErrors({});
        }}
        title="Edit Sub Diagnosis"
        width={949}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <FormSelectField
              label="Diagnosis"
              value={formValues.diagnosisId > 0 ? formValues.diagnosisId.toString() : ""}
              onChange={(value) => {
                const next = Array.isArray(value) ? value[0] : value;
                const selectedOption = diagnosisOptions.find((opt) => opt.value === next);
                setFormValues((prev) => ({ 
                  ...prev, 
                  diagnosis: selectedOption?.label || "",
                  diagnosisId: next ? parseInt(next) : 0
                }));
                setFormErrors((prev) => ({ ...prev, diagnosis: "" }));
              }}
              options={diagnosisOptions}
              placeholder="Select Diagnosis"
              mode="single"
              background="white"
              disabled={true}
            />
            {formErrors.diagnosis && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.diagnosis}</p>}
          </div>

          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <FormInputField
                  label="Sub Diagnosis"
                  value={subDiagnosisInput}
                  onChange={(event) => {
                    setSubDiagnosisInput(event.target.value);
                    setFormErrors((prev) => ({ ...prev, subDiagnoses: "" }));
                  }}
                  height={44}
                  placeholder="Sub Diagnosis"
                  disabled={isUpdating}
                />
              </div>
              <button
                type="button"
                onClick={handleAddChip}
                className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isUpdating}
              >
                <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                Add
              </button>
            </div>

            {formErrors.subDiagnoses && <p className="text-xs text-[#F6776E]">{formErrors.subDiagnoses}</p>}

            {formValues.subDiagnoses.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formValues.subDiagnoses.map((item, index) => (
                  <span
                    key={`${item.id || item.name}-${index}`}
                    className="inline-flex h-[30px] items-center gap-2 rounded-[30px] border border-[#FDC70F]/32 bg-[#FDC70F]/5 px-4 text-xs font-semibold leading-[120%] text-[#9A7909]"
                  >
                    {item.name}
                    <button
                      type="button"
                      onClick={() => handleRemoveChip(index)}
                      className="text-[#F6776E] transition-colors hover:text-[#D94F46] disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={`Remove ${item.name}`}
                      disabled={isUpdating}
                    >
                      <Image src="/icons/TrashRedIcon.svg" alt="Remove" width={14} height={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button 
              type="submit" 
              variant="primary"
              isLoading={isUpdating}
              disabled={isUpdating}
            >
              Update Sub Diagnosis
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setSelectedSubDiagnosis(null);
                setSubDiagnosisInput("");
                setFormErrors({});
              }}
            >
              Cancel
            </Button>
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


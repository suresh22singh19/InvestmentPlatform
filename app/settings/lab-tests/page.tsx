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

type LabTestStatus = "Active" | "Inactive" | "Pending";

type LabTest = {
  id: number;
  testName: string;
  description: string;
  price: string;
  status: LabTestStatus;
  createdAt: string;
};

const statusOptions: SelectOption[] = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
  { value: "Pending", label: "Pending" },
];

const initialLabTests: LabTest[] = [
  {
    id: 1,
    testName: "(CA) Cyfra 21-1 Lung Cancer Marker (L)",
    description: "(CA) Cyfra 21-1 Lung Cancer Marker (L)",
    price: "₹ 3,000.00",
    status: "Active",
    createdAt: "13-04-2025 06:37 AM",
  },
  {
    id: 2,
    testName: "13 BETA D GLUCAN Serum",
    description: "13 BETA D GLUCAN Serum",
    price: "₹ 10,000.00",
    status: "Active",
    createdAt: "13-04-2025 06:37 AM",
  },
  {
    id: 3,
    testName: "16s RRNA Sequencing Bacterial (M)",
    description: "16s RRNA Sequencing Bacterial (M)",
    price: "₹ 3,270.00",
    status: "Inactive",
    createdAt: "13-04-2025 06:37 AM",
  },
  {
    id: 4,
    testName: "17 - Hydroxyprogesterone (17-OHP)",
    description: "17 - Hydroxyprogesterone (17-OHP)",
    price: "₹ 1,400.00",
    status: "Pending",
    createdAt: "13-04-2025 06:37 AM",
  },
  {
    id: 5,
    testName: "17-H-Corticosteriods & 17-Ketosteriods Urine-(L)",
    description: "17-H-Corticosteriods & 17-Ketosteriods Urine-(L)",
    price: "₹ 13,200.00",
    status: "Active",
    createdAt: "13-04-2025 06:37 AM",
  },
  {
    id: 6,
    testName: "17-Ketosteroids 24-Hour Urine (L)",
    description: "17-Ketosteroids 24-Hour Urine (L)",
    price: "₹ 5,700.00",
    status: "Active",
    createdAt: "13-04-2025 06:37 AM",
  },
];

export default function LabTestsPage() {
  const [labTests, setLabTests] = useState<LabTest[]>(initialLabTests);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [dialogMode, setDialogMode] = useState<"add" | "edit" | "view" | null>(null);
  const [selectedLabTest, setSelectedLabTest] = useState<LabTest | null>(null);
  const [formValues, setFormValues] = useState({
    testName: "",
    description: "",
    fee: "",
    status: "Active" as LabTestStatus,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const filteredLabTests = useMemo(() => {
    return labTests.filter((test) => {
      return (
        test.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        test.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [labTests, searchTerm]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLabTests = filteredLabTests.slice(startIndex, startIndex + itemsPerPage);

  const handleAddNew = () => {
    setFormValues({
      testName: "",
      description: "",
      fee: "",
      status: "Active",
    });
    setFormErrors({});
    setSelectedLabTest(null);
    setDialogMode("add");
  };

  const handleEdit = (test: LabTest) => {
    setSelectedLabTest(test);
    setFormValues({
      testName: test.testName,
      description: test.description,
      fee: test.price.replace(/[₹,\s]/g, ""),
      status: test.status,
    });
    setFormErrors({});
    setDialogMode("edit");
  };

  const handleView = (test: LabTest) => {
    setSelectedLabTest(test);
    setDialogMode("view");
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formValues.testName.trim()) errors.testName = "Test name is required";
    if (!formValues.description.trim()) errors.description = "Description is required";
    if (!formValues.fee.trim()) errors.fee = "Fee is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;

    const formattedPrice = `₹ ${parseFloat(formValues.fee).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    if (dialogMode === "edit" && selectedLabTest) {
      setLabTests((prev) =>
        prev.map((test) =>
          test.id === selectedLabTest.id
            ? {
                ...test,
                testName: formValues.testName.trim(),
                description: formValues.description.trim(),
                price: formattedPrice,
                status: formValues.status,
              }
            : test
        )
      );
    } else if (dialogMode === "add") {
      const newId = Math.max(...labTests.map((test) => test.id), 0) + 1;
      setLabTests((prev) => [
        ...prev,
        {
          id: newId,
          testName: formValues.testName.trim(),
          description: formValues.description.trim(),
          price: formattedPrice,
          status: formValues.status,
          createdAt: new Date().toLocaleString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }),
        },
      ]);
    }

    setDialogMode(null);
    setFormValues({
      testName: "",
      description: "",
      fee: "",
      status: "Active",
    });
    setFormErrors({});
    setSelectedLabTest(null);
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

  const getStatusBadgeClass = (status: LabTestStatus) => {
    switch (status) {
      case "Active":
        return "border-[#0B8C00]/20 bg-[#0B8C000D] text-[#0B8C00]";
      case "Inactive":
        return "border-[#F6776E]/24 bg-[#F6776E0D] text-[#F6776E]";
      case "Pending":
        return "border-[#FDC70F]/60 bg-[#FDC70F0D] text-[#9A7909]";
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
              <h2 className="text-lg font-semibold leading-[120%] text-[#434956]">Lab Tests</h2>

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
                  Add Test
                </button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead position="first" className="whitespace-nowrap">
                    Sr no.
                  </TableHead>
                  <TableHead sortable sortDirection={getSortDirection("testName")} onSort={() => {}}>
                    Test Name
                  </TableHead>
                  <TableHead sortable sortDirection={getSortDirection("description")} onSort={() => {}}>
                    Description
                  </TableHead>
                  <TableHead sortable sortDirection={getSortDirection("price")} onSort={() => {}}>
                    Price
                  </TableHead>
                  <TableHead sortable sortDirection={getSortDirection("status")} onSort={() => {}}>
                    Status
                  </TableHead>
                  <TableHead sortable sortDirection={getSortDirection("createdAt")} onSort={() => {}}>
                    Created At
                  </TableHead>
                  <TableHead position="last" sortable sortDirection={null} onSort={() => {}}>
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLabTests.length === 0 ? (
                  <TableRow>
                    <TableData colSpan={7} className="py-12 text-center text-sm text-[#9CA3AF]">
                      No lab tests found
                    </TableData>
                  </TableRow>
                ) : (
                  paginatedLabTests.map((test, index) => (
                    <TableRow key={test.id}>
                      <TableData position="first">{startIndex + index + 1}</TableData>
                      <TableData>{test.testName}</TableData>
                      <TableData>{test.description}</TableData>
                      <TableData className="whitespace-nowrap">{test.price}</TableData>
                      <TableData>
                        <span
                          className={`inline-flex h-[30px] min-w-[86px] items-center justify-center rounded-[30px] border px-5 text-xs font-medium leading-[120%] ${getStatusBadgeClass(test.status)}`}
                        >
                          {test.status}
                        </span>
                      </TableData>
                      <TableData className="whitespace-nowrap">{test.createdAt}</TableData>
                      <TableData position="last">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleEdit(test)}
                            className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                            aria-label="Edit lab test"
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

            {filteredLabTests.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={filteredLabTests.length}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
                itemsPerPageOptions={[6, 10, 20, 50]}
              />
            )}
          </div>
        </ListBorder>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog
        open={dialogMode !== null}
        onClose={() => {
          setDialogMode(null);
          setFormErrors({});
          setSelectedLabTest(null);
        }}
        title={dialogMode === "add" ? "Add Lab Tests" : dialogMode === "edit" ? "Edit Lab Tests" : "View Lab Test"}
        width={949}
      >
        <form onSubmit={dialogMode !== "view" ? handleSubmit : (e) => e.preventDefault()} className="space-y-6">
          <div className="space-y-6">
            <div>
              <FormInputField
                label="Test Name"
                value={formValues.testName}
                onChange={(event) => {
                  if (dialogMode === "view") return;
                  setFormValues((prev) => ({ ...prev, testName: event.target.value }));
                  setFormErrors((prev) => ({ ...prev, testName: "" }));
                }}
                height={44}
                placeholder="Test Name"
                required={dialogMode !== "view"}
                disabled={dialogMode === "view"}
              />
              {formErrors.testName && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.testName}</p>}
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

            <div>
              <FormInputField
                label="Fee"
                value={formValues.fee}
                onChange={(event) => {
                  if (dialogMode === "view") return;
                  setFormValues((prev) => ({ ...prev, fee: event.target.value }));
                  setFormErrors((prev) => ({ ...prev, fee: "" }));
                }}
                height={44}
                placeholder="Fee"
                required={dialogMode !== "view"}
                disabled={dialogMode === "view"}
                type="number"
              />
              {formErrors.fee && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.fee}</p>}
            </div>

            <div>
              <FormSelectField
                label="Status"
                value={formValues.status}
                onChange={(value) => {
                  if (dialogMode === "view") return;
                  setFormValues((prev) => ({
                    ...prev,
                    status: (Array.isArray(value) ? value[0] : value || "Active") as LabTestStatus,
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
                  setSelectedLabTest(null);
                }}
              >
                Close
              </Button>
            ) : (
              <>
                <Button type="submit" variant="primary">
                  {dialogMode === "add" ? "Add Lab Test" : "Update Lab Test"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogMode(null);
                    setFormErrors({});
                    setSelectedLabTest(null);
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


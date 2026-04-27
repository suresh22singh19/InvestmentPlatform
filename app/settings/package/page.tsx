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

type Package = {
  id: number;
  branch: string;
  packageName: string;
  price: string;
  day: number;
  remark: string;
  createdAt: string;
};

const branchOptions: SelectOption[] = [
  { value: "ambala", label: "Ambala" },
  { value: "murad-nagar", label: "MURAD NAGAR UP" },
  { value: "vaishali", label: "Vaishali UP" },
  { value: "sonipat", label: "Sonipat" },
  { value: "shastri-nagar", label: "Shastri Nagar Delhi" },
  { value: "rdc-ghaziabad", label: "RDC Ghaziabad UP" },
  { value: "prashant-vihar", label: "Prashant Vihar" },
  { value: "panchkula", label: "HIIMS PANCHKULA" },
  { value: "camp-jeena", label: "Camp Jeena" },
];

const initialPackages: Package[] = [
  {
    id: 1,
    branch: "Ambala",
    packageName: "Private room Package",
    price: "₹ 6,000.00",
    day: 1,
    remark: "Private room Package",
    createdAt: "13-04-2025 06:37 AM",
  },
  {
    id: 2,
    branch: "Ambala",
    packageName: "Private room Package",
    price: "₹ 10,000.00",
    day: 3,
    remark: "Private room Package",
    createdAt: "13-04-2025 06:37 AM",
  },
  {
    id: 3,
    branch: "Ambala",
    packageName: "Semi Private",
    price: "₹ 3,270.00",
    day: 1,
    remark: "Private room Package",
    createdAt: "13-04-2025 06:37 AM",
  },
  {
    id: 4,
    branch: "Ambala",
    packageName: "Private room Package",
    price: "₹ 1,400.00",
    day: 2,
    remark: "Private room Package",
    createdAt: "13-04-2025 06:37 AM",
  },
  {
    id: 5,
    branch: "Ambala",
    packageName: "Private room Package",
    price: "₹ 13,200.00",
    day: 1,
    remark: "Private room Package",
    createdAt: "13-04-2025 06:37 AM",
  },
  {
    id: 6,
    branch: "Ambala",
    packageName: "Private + Dual Attendant",
    price: "₹ 5,700.00",
    day: 2,
    remark: "Private room Package",
    createdAt: "13-04-2025 06:37 AM",
  },
];

export default function PackagePage() {
  const [packages, setPackages] = useState<Package[]>(initialPackages);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [dialogMode, setDialogMode] = useState<"add" | "edit" | "view" | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [formValues, setFormValues] = useState({
    branch: "",
    packageName: "",
    price: "",
    day: "",
    remark: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      return (
        pkg.branch.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pkg.packageName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pkg.remark.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [packages, searchTerm]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPackages = filteredPackages.slice(startIndex, startIndex + itemsPerPage);

  const handleAddNew = () => {
    setFormValues({
      branch: "",
      packageName: "",
      price: "",
      day: "",
      remark: "",
    });
    setFormErrors({});
    setSelectedPackage(null);
    setDialogMode("add");
  };

  const handleEdit = (pkg: Package) => {
    setSelectedPackage(pkg);
    setFormValues({
      branch: branchOptions.find((opt) => opt.label === pkg.branch)?.value || "",
      packageName: pkg.packageName,
      price: pkg.price.replace(/[₹,\s]/g, ""),
      day: pkg.day.toString(),
      remark: pkg.remark,
    });
    setFormErrors({});
    setDialogMode("edit");
  };

  const handleView = (pkg: Package) => {
    setSelectedPackage(pkg);
    setFormValues({
      branch: branchOptions.find((opt) => opt.label === pkg.branch)?.value || "",
      packageName: pkg.packageName,
      price: pkg.price.replace(/[₹,\s]/g, ""),
      day: pkg.day.toString(),
      remark: pkg.remark,
    });
    setDialogMode("view");
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formValues.branch) errors.branch = "Branch is required";
    if (!formValues.packageName.trim()) errors.packageName = "Package name is required";
    if (!formValues.price.trim()) errors.price = "Price is required";
    if (!formValues.day.trim()) errors.day = "Days is required";
    if (!formValues.remark.trim()) errors.remark = "Remark is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;

    const branchLabel = branchOptions.find((opt) => opt.value === formValues.branch)?.label || formValues.branch;
    const formattedPrice = `₹ ${parseFloat(formValues.price).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    if (dialogMode === "edit" && selectedPackage) {
      setPackages((prev) =>
        prev.map((pkg) =>
          pkg.id === selectedPackage.id
            ? {
                ...pkg,
                branch: branchLabel,
                packageName: formValues.packageName.trim(),
                price: formattedPrice,
                day: parseInt(formValues.day, 10),
                remark: formValues.remark.trim(),
              }
            : pkg
        )
      );
    } else if (dialogMode === "add") {
      const newId = Math.max(...packages.map((pkg) => pkg.id), 0) + 1;
      setPackages((prev) => [
        ...prev,
        {
          id: newId,
          branch: branchLabel,
          packageName: formValues.packageName.trim(),
          price: formattedPrice,
          day: parseInt(formValues.day, 10),
          remark: formValues.remark.trim(),
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
      branch: "",
      packageName: "",
      price: "",
      day: "",
      remark: "",
    });
    setFormErrors({});
    setSelectedPackage(null);
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

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <PageHeading title="Package" />
        </div>

        <ListBorder as="section" className="px-4 py-4">
          <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold leading-[120%] text-[#434956]"></h2>

              <div className="flex items-center gap-3">
                <TableSearchInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search Here..."
                />
                <button
                  type="button"
                  className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] whitespace-nowrap"
                  onClick={handleAddNew}
                >
                  <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                  <span className="text-hide">Add Package</span>
                </button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead position="first" className="whitespace-nowrap">
                    Sr no.
                  </TableHead>
                  <TableHead sortable sortDirection={getSortDirection("branch")} onSort={() => {}}>
                    Branch
                  </TableHead>
                  <TableHead sortable sortDirection={getSortDirection("packageName")} onSort={() => {}}>
                    Package Name
                  </TableHead>
                  <TableHead sortable sortDirection={getSortDirection("price")} onSort={() => {}}>
                    Price
                  </TableHead>
                  <TableHead sortable sortDirection={getSortDirection("day")} onSort={() => {}}>
                    Day
                  </TableHead>
                  <TableHead sortable sortDirection={getSortDirection("remark")} onSort={() => {}}>
                    Remark
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
                {paginatedPackages.length === 0 ? (
                  <TableRow>
                    <TableData colSpan={8} className="py-12 text-center text-sm text-[#9CA3AF]">
                      No packages found
                    </TableData>
                  </TableRow>
                ) : (
                  paginatedPackages.map((pkg, index) => (
                    <TableRow key={pkg.id}>
                      <TableData position="first">{startIndex + index + 1}</TableData>
                      <TableData>{pkg.branch}</TableData>
                      <TableData>{pkg.packageName}</TableData>
                      <TableData className="whitespace-nowrap">{pkg.price}</TableData>
                      <TableData>{pkg.day}</TableData>
                      <TableData>{pkg.remark}</TableData>
                      <TableData className="whitespace-nowrap">{pkg.createdAt}</TableData>
                      <TableData position="last">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleView(pkg)}
                            className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                            aria-label="View package"
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
                            onClick={() => handleEdit(pkg)}
                            className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                            aria-label="Edit package"
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

            {filteredPackages.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={filteredPackages.length}
                itemsPerPage={itemsPerPage}
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
          setSelectedPackage(null);
        }}
        title={dialogMode === "add" ? "Add Package" : dialogMode === "edit" ? "Edit Package" : "View Package"}
        width={949}
      >
        <form onSubmit={dialogMode !== "view" ? handleSubmit : (e) => e.preventDefault()} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <FormSelectField
                label="Branch"
                value={formValues.branch}
                onChange={(value) => {
                  if (dialogMode === "view") return;
                  setFormValues((prev) => ({
                    ...prev,
                    branch: Array.isArray(value) ? value[0] : value || "",
                  }));
                  setFormErrors((prev) => ({ ...prev, branch: "" }));
                }}
                options={branchOptions}
                placeholder="Select"
                mode="single"
                background="white"
                disabled={dialogMode === "view"}
              />
              {formErrors.branch && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.branch}</p>}
            </div>

            <div>
              <FormInputField
                label="Package"
                value={formValues.packageName}
                onChange={(event) => {
                  if (dialogMode === "view") return;
                  setFormValues((prev) => ({ ...prev, packageName: event.target.value }));
                  setFormErrors((prev) => ({ ...prev, packageName: "" }));
                }}
                height={44}
                placeholder="Package"
                required={dialogMode !== "view"}
                disabled={dialogMode === "view"}
              />
              {formErrors.packageName && (
                <p className="mt-1 text-xs text-[#F6776E]">{formErrors.packageName}</p>
              )}
            </div>

            <div>
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
                type="number"
              />
              {formErrors.price && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.price}</p>}
            </div>

            <div>
              <FormInputField
                label="Days"
                value={formValues.day}
                onChange={(event) => {
                  if (dialogMode === "view") return;
                  setFormValues((prev) => ({ ...prev, day: event.target.value }));
                  setFormErrors((prev) => ({ ...prev, day: "" }));
                }}
                height={44}
                placeholder="Days"
                required={dialogMode !== "view"}
                disabled={dialogMode === "view"}
                type="number"
              />
              {formErrors.day && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.day}</p>}
            </div>

            <div className="col-span-2">
              <FormTextareaField
                label="Remark"
                value={formValues.remark}
                onChange={(event) => {
                  if (dialogMode === "view") return;
                  setFormValues((prev) => ({ ...prev, remark: event.target.value }));
                  setFormErrors((prev) => ({ ...prev, remark: "" }));
                }}
                height={94}
                placeholder="Remark"
                required={dialogMode !== "view"}
                disabled={dialogMode === "view"}
              />
              {formErrors.remark && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.remark}</p>}
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
                  setSelectedPackage(null);
                }}
              >
                Close
              </Button>
            ) : (
              <>
                <Button type="submit" variant="primary">
                  {dialogMode === "add" ? "Add Package" : "Update Package"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogMode(null);
                    setFormErrors({});
                    setSelectedPackage(null);
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


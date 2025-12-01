"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
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
} from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import type { SelectOption } from "@/components/ui/FormSelectField";

type PanelTherapy = {
  id: number;
  branch: string;
  therapyName: string;
  price: string;
  productCode: string;
  hsnCode: string;
  category: string;
  status: "Active" | "Inactive";
  createdAt: string;
};

const branchOptions: SelectOption[] = [
  { value: "murad-nagar", label: "MURAD NAGAR UP" },
  { value: "vaishali", label: "Vaishali UP" },
  { value: "sonipat", label: "Sonipat" },
  { value: "shastri-nagar", label: "Shastri Nagar Delhi" },
  { value: "rdc-ghaziabad", label: "RDC Ghaziabad UP" },
  { value: "prashant-vihar", label: "Prashant Vihar" },
  { value: "panchkula", label: "HIIMS PANCHKULA" },
];

const categoryOptions: SelectOption[] = [
  { value: "panchakarma", label: "Panchakarma" },
  { value: "therapy", label: "Therapy" },
  { value: "service", label: "Service" },
];

const statusOptions: SelectOption[] = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
];

const initialTherapies: PanelTherapy[] = [
  {
    id: 1,
    branch: "MURAD NAGAR UP",
    therapyName: "Panel Patient File Charges",
    price: "₹ 1000",
    productCode: "PPFC-001-00",
    hsnCode: "999311",
    category: "Panchakarma",
    status: "Active",
    createdAt: "13-04-2025 06:37 AM",
  },
  {
    id: 2,
    branch: "Vaishali UP",
    therapyName: "Kashayavasthi (Niroohavasthi) Different varieties",
    price: "₹ 1000",
    productCode: "PPFC-001-00",
    hsnCode: "82",
    category: "Panchakarma",
    status: "Active",
    createdAt: "13-04-2025 06:37 AM",
  },
  {
    id: 3,
    branch: "Sonipat",
    therapyName: "Panel Patient File Charges",
    price: "₹ 1000",
    productCode: "PPFC-001-00",
    hsnCode: "82",
    category: "Panchakarma",
    status: "Inactive",
    createdAt: "13-04-2025 06:37 AM",
  },
  {
    id: 4,
    branch: "Shastri Nagar Delhi",
    therapyName: "Panel Patient File Charges",
    price: "₹ 1000",
    productCode: "PPFC-001-00",
    hsnCode: "82",
    category: "Panchakarma",
    status: "Active",
    createdAt: "13-04-2025 06:37 AM",
  },
  {
    id: 5,
    branch: "RDC Ghaziabad UP",
    therapyName: "Panel Patient File Charges",
    price: "₹ 1000",
    productCode: "PPFC-001-00",
    hsnCode: "82",
    category: "Panchakarma",
    status: "Active",
    createdAt: "13-04-2025 06:37 AM",
  },
  {
    id: 6,
    branch: "Prashant Vihar",
    therapyName: "Panel Patient File Charges",
    price: "₹ 1000",
    productCode: "PPFC-001-00",
    hsnCode: "82",
    category: "Panchakarma",
    status: "Active",
    createdAt: "13-04-2025 06:37 AM",
  },
];

export default function PanelTherapyPage() {
  const [therapies, setTherapies] = useState<PanelTherapy[]>(initialTherapies);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [dialogMode, setDialogMode] = useState<"add" | "edit" | "view" | null>(null);
  const [selectedTherapy, setSelectedTherapy] = useState<PanelTherapy | null>(null);
  const [formValues, setFormValues] = useState({
    branch: "",
    therapyName: "",
    price: "",
    productCode: "",
    hsnCode: "",
    category: "",
    status: "Active",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const filteredTherapies = useMemo(() => {
    return therapies.filter((therapy) => {
      const matchesSearch =
        therapy.branch.toLowerCase().includes(searchTerm.toLowerCase()) ||
        therapy.therapyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        therapy.productCode.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBranch = !selectedBranch || therapy.branch === selectedBranch;
      return matchesSearch && matchesBranch;
    });
  }, [therapies, searchTerm, selectedBranch]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTherapies = filteredTherapies.slice(startIndex, startIndex + itemsPerPage);

  const handleAddNew = () => {
    setFormValues({
      branch: "",
      therapyName: "",
      price: "",
      productCode: "",
      hsnCode: "",
      category: "",
      status: "Active",
    });
    setFormErrors({});
    setSelectedTherapy(null);
    setDialogMode("add");
  };

  const handleEdit = (therapy: PanelTherapy) => {
    setSelectedTherapy(therapy);
    setFormValues({
      branch: therapy.branch,
      therapyName: therapy.therapyName,
      price: therapy.price.replace(/[₹\s]/g, ""),
      productCode: therapy.productCode,
      hsnCode: therapy.hsnCode,
      category: therapy.category,
      status: therapy.status,
    });
    setFormErrors({});
    setDialogMode("edit");
  };

  const handleView = (therapy: PanelTherapy) => {
    setSelectedTherapy(therapy);
    setDialogMode("view");
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formValues.branch) errors.branch = "Branch is required";
    if (!formValues.therapyName) errors.therapyName = "Therapy name is required";
    if (!formValues.price) errors.price = "Price is required";
    if (!formValues.productCode) errors.productCode = "Product code is required";
    if (!formValues.hsnCode) errors.hsnCode = "HSN code is required";
    if (!formValues.category) errors.category = "Category is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;

    if (dialogMode === "edit" && selectedTherapy) {
      setTherapies((prev) =>
        prev.map((therapy) =>
          therapy.id === selectedTherapy.id
            ? {
                ...therapy,
                branch: formValues.branch,
                therapyName: formValues.therapyName,
                price: `₹ ${formValues.price}`,
                productCode: formValues.productCode,
                hsnCode: formValues.hsnCode,
                category: formValues.category,
                status: formValues.status as "Active" | "Inactive",
              }
            : therapy
        )
      );
    } else if (dialogMode === "add") {
      const newId = Math.max(...therapies.map((therapy) => therapy.id), 0) + 1;
      setTherapies((prev) => [
        ...prev,
        {
          id: newId,
          branch: formValues.branch,
          therapyName: formValues.therapyName,
          price: `₹ ${formValues.price}`,
          productCode: formValues.productCode,
          hsnCode: formValues.hsnCode,
          category: formValues.category,
          status: formValues.status as "Active" | "Inactive",
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
    setSelectedTherapy(null);
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
          <PageHeading title="Settings" />
        </div>

        <ListBorder as="section" className="px-4 py-4">
          <div className="w-full overflow-hidden rounded-[16px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold leading-[120%] text-[#434956]">Panel Therapy</h2>

              <div className="flex items-center gap-3">
                <FormSelectField
                  label=""
                  value={selectedBranch}
                  onChange={(value) => setSelectedBranch(Array.isArray(value) ? value[0] : value || "")}
                  options={branchOptions}
                  placeholder="Select Branch"
                  mode="single"
                  background="normal"
                  width={300}
                />
                <TableSearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search Here..." />
                <button
                  type="button"
                  className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2]"
                  onClick={handleAddNew}
                >
                  <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                  Add Panel Therapy
                </button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead position="first" className="whitespace-nowrap" >Sr no.</TableHead>
                  <TableHead sortable>Branch</TableHead>
                  <TableHead sortable>Panel Therapy</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Product Code</TableHead>
                  <TableHead className="whitespace-nowrap">HSN Code</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead position="last">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTherapies.length === 0 ? (
                  <TableRow>
                    <TableData colSpan={10} className="py-6 text-center text-sm text-[#9CA3AF]">
                      No panel therapies found
                    </TableData>
                  </TableRow>
                ) : (
                  paginatedTherapies.map((therapy, index) => (
                    <TableRow key={therapy.id}>
                      <TableData position="first">{startIndex + index + 1}</TableData>
                      <TableData>{therapy.branch}</TableData>
                      <TableData>{therapy.therapyName}</TableData>
                      <TableData className="whitespace-nowrap">{therapy.price}</TableData>
                      <TableData className="whitespace-nowrap">{therapy.productCode}</TableData>
                      <TableData className="whitespace-nowrap">{therapy.hsnCode}</TableData>
                      <TableData>{therapy.category}</TableData>
                      <TableData>
                        <span
                          className={`inline-flex h-[24px] items-center rounded-full px-3 text-xs font-medium ${
                            therapy.status === "Active"
                              ? "bg-[#0B8C000F] text-[#0B8C00]"
                              : "bg-[#F6776E0F] text-[#F6776E]"
                          }`}
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

            {filteredTherapies.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={filteredTherapies.length}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            )}
          </div>
        </ListBorder>
      </div>

      <Dialog
        open={dialogMode !== null}
        onClose={() => {
          setDialogMode(null);
          setSelectedTherapy(null);
          setFormErrors({});
        }}
        title={
          dialogMode === "add" ? "Add Panel Therapy" : dialogMode === "edit" ? "Edit Panel Therapy" : "View Panel Therapy"
        }
        width={949}
      >
        {dialogMode === "view" && selectedTherapy ? (
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-[#7B8089]">Branch Name</p>
              <p className="text-base font-medium text-[#262D3B]">{selectedTherapy.branch}</p>
            </div>
            <div>
              <p className="text-sm text-[#7B8089]">Panel Therapy</p>
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
            <FormSelectField
              label="Branch"
              value={formValues.branch}
              onChange={(value) =>
                setFormValues((prev) => ({
                  ...prev,
                  branch: Array.isArray(value) ? value[0] : value || "",
                }))
              }
              options={branchOptions}
              placeholder="Select"
              mode="single"
              background="white"
              disabled={dialogMode === "view"}
            />
            <FormInputField
              label="Panel Therapy"
              value={formValues.therapyName}
              onChange={(event) => setFormValues((prev) => ({ ...prev, therapyName: event.target.value }))}
              height={44}
              placeholder="Panel Therapy"
            />
            <FormInputField
              label="Price"
              value={formValues.price}
              onChange={(event) => setFormValues((prev) => ({ ...prev, price: event.target.value }))}
              height={44}
              placeholder="Price"
            />
            <FormInputField
              label="Product Code"
              value={formValues.productCode}
              onChange={(event) => setFormValues((prev) => ({ ...prev, productCode: event.target.value }))}
              height={44}
              placeholder="Product Code"
            />
            <FormInputField
              label="HSN Code"
              value={formValues.hsnCode}
              onChange={(event) => setFormValues((prev) => ({ ...prev, hsnCode: event.target.value }))}
              height={44}
              placeholder="HSN Code"
            />
            <FormSelectField
              label="Category"
              value={formValues.category}
              onChange={(value) =>
                setFormValues((prev) => ({
                  ...prev,
                  category: Array.isArray(value) ? value[0] : value || "",
                }))
              }
              options={categoryOptions}
              placeholder="Category"
              mode="single"
              background="white"
            />
            <FormSelectField
              label="Status"
              value={formValues.status}
              onChange={(value) =>
                setFormValues((prev) => ({
                  ...prev,
                  status: (Array.isArray(value) ? value[0] : value || "Active") as "Active" | "Inactive",
                }))
              }
              options={statusOptions}
              placeholder="Status"
              mode="single"
              background="white"
            />

            <div className="col-span-2 flex gap-3">
              <Button type="submit" variant="primary">
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
              >
                Cancel
              </Button>
            </div>

            {Object.entries(formErrors).length > 0 && (
              <div className="col-span-2 text-sm text-[#F6776E]">Please fill all required fields.</div>
            )}
          </form>
        )}
      </Dialog>
    </AppShell>
  );
}


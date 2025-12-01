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

type TherapyStatus = "Active" | "Inactive" | "Pending";

type TpaTherapy = {
  id: number;
  therapyName: string;
  price: string;
  productCode: string;
  hsnCode: string;
  category: string;
  status: TherapyStatus;
  createdAt: string;
};

const categoryOptions: SelectOption[] = [
  { value: "panchakarma", label: "Panchakarma" },
  { value: "therapy", label: "Therapy" },
  { value: "service", label: "Service" },
];

const statusOptions: SelectOption[] = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
  { value: "Pending", label: "Pending" },
];

const initialTherapies: TpaTherapy[] = [
  {
    id: 1,
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
    therapyName: "Panel Patient File Charges",
    price: "₹ 1000",
    productCode: "PPFC-001-00",
    hsnCode: "82",
    category: "Panchakarma",
    status: "Pending",
    createdAt: "13-04-2025 06:37 AM",
  },
  {
    id: 5,
    therapyName: "Agnikarma-High frequency Coagulation (Package rate for full Course of treatment)",
    price: "₹ 1000",
    productCode: "PPFC-001-00",
    hsnCode: "82",
    category: "Panchakarma",
    status: "Active",
    createdAt: "13-04-2025 06:37 AM",
  },
  {
    id: 6,
    therapyName: "Panel Patient File Charges",
    price: "₹ 1000",
    productCode: "PPFC-001-00",
    hsnCode: "82",
    category: "Panchakarma",
    status: "Active",
    createdAt: "13-04-2025 06:37 AM",
  },
];

export default function TpaTherapyPage() {
  const [therapies, setTherapies] = useState<TpaTherapy[]>(initialTherapies);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [dialogMode, setDialogMode] = useState<"add" | "edit" | "view" | null>(null);
  const [selectedTherapy, setSelectedTherapy] = useState<TpaTherapy | null>(null);
  const [formValues, setFormValues] = useState({
    therapyName: "",
    price: "",
    productCode: "",
    hsnCode: "",
    category: "",
    status: "Active" as TherapyStatus,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const filteredTherapies = useMemo(() => {
    return therapies.filter((therapy) => {
      return (
        therapy.therapyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        therapy.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        therapy.hsnCode.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [therapies, searchTerm]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTherapies = filteredTherapies.slice(startIndex, startIndex + itemsPerPage);

  const handleAddNew = () => {
    setFormValues({
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

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  const handleEdit = (therapy: TpaTherapy) => {
    setSelectedTherapy(therapy);
    setFormValues({
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

  const handleView = (therapy: TpaTherapy) => {
    setSelectedTherapy(therapy);
    setDialogMode("view");
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
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
                therapyName: formValues.therapyName,
                price: `₹ ${formValues.price}`,
                productCode: formValues.productCode,
                hsnCode: formValues.hsnCode,
                category: formValues.category,
                status: formValues.status,
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
          therapyName: formValues.therapyName,
          price: `₹ ${formValues.price}`,
          productCode: formValues.productCode,
          hsnCode: formValues.hsnCode,
          category: formValues.category,
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
    setSelectedTherapy(null);
  };

  const getStatusStyles = (status: TherapyStatus) => {
    if (status === "Active") {
      return "border-[#0B8C00]/20 text-[#0B8C00] bg-[#0B8C000F]";
    } else if (status === "Inactive") {
      return "border-[#F6776E]/24 text-[#F6776E] bg-[#F6776E0F]";
    }
    return "border-[#FDC70F]/60 text-[#9A7909] bg-[#FDC70F1A]";
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
              <h2 className="text-lg font-semibold leading-[120%] text-[#434956]">TPA Therapy</h2>

              <div className="flex items-center gap-3">
                <TableSearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search Here..." />
                <button
                  type="button"
                  className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2]"
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
                  <TableHead sortable>Therapy</TableHead>
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
                    <TableData colSpan={9} className="py-6 text-center text-sm text-[#9CA3AF]">
                      No therapies found
                    </TableData>
                  </TableRow>
                ) : (
                  paginatedTherapies.map((therapy, index) => (
                    <TableRow key={therapy.id}>
                      <TableData position="first">{startIndex + index + 1}</TableData>
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

            {filteredTherapies.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={filteredTherapies.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
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
          setFormErrors({});
          setSelectedTherapy(null);
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
            <FormInputField
              label="Therapy"
              value={formValues.therapyName}
              onChange={(event) => setFormValues((prev) => ({ ...prev, therapyName: event.target.value }))}
              height={44}
              placeholder="Therapy"
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
                  status: (Array.isArray(value) ? value[0] : value || "Active") as TherapyStatus,
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


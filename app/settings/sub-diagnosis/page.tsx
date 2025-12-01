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

type SubDiagnosis = {
  id: number;
  diagnosis: string;
  subDiagnoses: string[];
};

const diagnosisOptions: SelectOption[] = [
  { value: "addiction", label: "Addiction" },
  { value: "allergy", label: "Allergy" },
  { value: "alopecia", label: "Alopecia" },
];

const initialSubDiagnoses: SubDiagnosis[] = [
  {
    id: 1,
    diagnosis: "Addiction",
    subDiagnoses: ["Alcohol Addiction", "Drug Addiction", "Nicotine Addiction", "Withdrawal Symptoms", "Behavioural Addiction", "Prescription Misuse"],
  },
  {
    id: 2,
    diagnosis: "Allergy",
    subDiagnoses: ["Food Allergy", "Skin Allergy", "Dust Allergy", "Pollen Allergy", "Seasonal Allergy", "Pet Allergy"],
  },
  {
    id: 3,
    diagnosis: "Alopecia",
    subDiagnoses: ["Alopecia Areata", "Male Pattern Baldness", "Telogen Effluvium", "Scarring Alopecia", "Traction Alopecia"],
  },
  {
    id: 4,
    diagnosis: "Allergy",
    subDiagnoses: ["Food Allergy", "Skin Allergy", "Dust Allergy", "Pollen Allergy"],
  },
  {
    id: 5,
    diagnosis: "Addiction",
    subDiagnoses: ["Alcohol Addiction", "Drug Addiction", "Nicotine Addiction", "Withdrawal Symptoms"],
  },
  {
    id: 6,
    diagnosis: "Alopecia",
    subDiagnoses: ["Alopecia Areata", "Male Pattern Baldness", "Telogen Effluvium", "Scarring Alopecia"],
  },
];

export default function SubDiagnosisPage() {
  const [subDiagnoses, setSubDiagnoses] = useState<SubDiagnosis[]>(initialSubDiagnoses);
  const [searchTerm, setSearchTerm] = useState("");
  const [diagnosisFilter, setDiagnosisFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [viewAllDialogOpen, setViewAllDialogOpen] = useState(false);
  const [chipsDialogItems, setChipsDialogItems] = useState<string[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSubDiagnosis, setSelectedSubDiagnosis] = useState<SubDiagnosis | null>(null);
  const [formValues, setFormValues] = useState({
    diagnosis: "",
    subDiagnoses: [] as string[],
  });
  const [subDiagnosisInput, setSubDiagnosisInput] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const filteredData = useMemo(() => {
    return subDiagnoses.filter((item) => {
      const matchesDiagnosis = diagnosisFilter ? item.diagnosis === diagnosisFilter : true;
      const matchesSearch =
        item.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.subDiagnoses.some((sub) => sub.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesDiagnosis && matchesSearch;
    });
  }, [subDiagnoses, diagnosisFilter, searchTerm]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSubDiagnoses = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const handleOpenViewAll = (items: string[]) => {
    setChipsDialogItems(items);
    setViewAllDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedSubDiagnosis(null);
    setFormValues({ diagnosis: "", subDiagnoses: [] });
    setSubDiagnosisInput("");
    setFormErrors({});
    setAddDialogOpen(true);
  };

  const handleEdit = (entry: SubDiagnosis) => {
    setSelectedSubDiagnosis(entry);
    setFormValues({ diagnosis: entry.diagnosis, subDiagnoses: [...entry.subDiagnoses] });
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
      subDiagnoses: [...prev.subDiagnoses, subDiagnosisInput.trim()],
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
    if (!formValues.diagnosis) errors.diagnosis = "Diagnosis is required";
    if (formValues.subDiagnoses.length === 0) errors.subDiagnoses = "At least one sub diagnosis is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;

    if (selectedSubDiagnosis) {
      setSubDiagnoses((prev) =>
        prev.map((item) =>
          item.id === selectedSubDiagnosis.id
            ? { ...item, diagnosis: formValues.diagnosis, subDiagnoses: formValues.subDiagnoses }
            : item
        )
      );
      setEditDialogOpen(false);
    } else {
      const newEntry: SubDiagnosis = {
        id: subDiagnoses.length + 1,
        diagnosis: formValues.diagnosis,
        subDiagnoses: formValues.subDiagnoses,
      };
      setSubDiagnoses((prev) => [...prev, newEntry]);
      setAddDialogOpen(false);
    }

    setSelectedSubDiagnosis(null);
    setFormValues({ diagnosis: "", subDiagnoses: [] });
    setSubDiagnosisInput("");
    setFormErrors({});
  };

  const renderSubDiagnosisChips = (items: string[]) => {
    const visible = items.slice(0, 4);
    const remaining = items.length - visible.length;

    return (
      <div className="flex flex-wrap gap-2">
        {visible.map((item, index) => (
          <span
            key={`${item}-${index}`}
            className="inline-flex h-[30px] items-center justify-center gap-2 rounded-[30px] border border-[#FDC70F]/32 bg-[#FDC70F]/5 px-4 text-xs font-semibold leading-[120%] text-[#9A7909]"
          >
            {item}
          </span>
        ))}
        {remaining > 0 && (
          <button
            type="button"
            onClick={() => handleOpenViewAll(items)}
            className="inline-flex h-[30px] items-center justify-center gap-2 rounded-[30px] border border-[#FDC70F]/32 bg-[#FDC70F]/5 px-4 text-xs font-semibold leading-[120%] text-[#9A7909]"
          >
            View all +{remaining}
          </button>
        )}
      </div>
    );
  };

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <PageHeading title="Settings" />
        </div>

        <ListBorder as="section" className="px-4 py-4">
          <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
            <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <h2 className="text-lg font-semibold leading-[120%] text-[#434956]">Sub Diagnosis</h2>

              <div className="flex items-center gap-3">
                <div className="w-full lg:w-[300px]">
                  <FormSelectField
                    label=""
                    options={[{ value: "", label: "All" }, ...diagnosisOptions]}
                    value={diagnosisFilter || null}
                    onChange={(value) => {
                      const next = Array.isArray(value) ? value[0] : value;
                      setDiagnosisFilter(next || "");
                    }}
                    placeholder="Select Diagnosis"
                    background="normal"
                  />
                </div>

                  <TableSearchInput
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="Search Here..."
                  />

                    <div className="w-full lg:w-auto lg:flex-shrink-0">
                  <button
                    type="button"
                    className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] focus:outline-none focus:ring-2 focus:ring-[#0B8C00]/20"
                    onClick={handleAdd}
                  >
                    <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                    Add Sub Diagnosis
                  </button>
                </div>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead position="first">Sr no.</TableHead>
                  <TableHead sortable sortDirection={null} onSort={() => {}}>
                    Sub Diagnosis
                  </TableHead>
                  <TableHead sortable sortDirection={null} onSort={() => {}}>
                    Diagnosis
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
                      <TableData>{renderSubDiagnosisChips(entry.subDiagnoses)}</TableData>
                      <TableData>{entry.diagnosis}</TableData>
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

            {filteredData.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={filteredData.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(items) => {
                  setItemsPerPage(items);
                  setCurrentPage(1);
                }}
                itemsPerPageOptions={[6, 10, 20, 50]}
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
          setFormValues({ diagnosis: "", subDiagnoses: [] });
        }}
        title="Add Sub Diagnosis"
        width={949}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <FormSelectField
              label="Diagnosis"
              value={formValues.diagnosis}
              onChange={(value) => {
                const next = Array.isArray(value) ? value[0] : value;
                setFormValues((prev) => ({ ...prev, diagnosis: next || "" }));
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
                className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2]"
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
                    key={`${item}-${index}`}
                    className="inline-flex h-[30px] items-center gap-2 rounded-[30px] border border-[#FDC70F]/32 bg-[#FDC70F]/5 px-4 text-xs font-semibold leading-[120%] text-[#9A7909]"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() => handleRemoveChip(index)}
                      className="text-[#F6776E] transition-colors hover:text-[#D94F46]"
                      aria-label={`Remove ${item}`}
                    >
                      <Image src="/icons/TrashRedIcon.svg" alt="Remove" width={14} height={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="primary">
              Add Sub Diagnosis
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAddDialogOpen(false);
                setFormErrors({});
                setSubDiagnosisInput("");
                setFormValues({ diagnosis: "", subDiagnoses: [] });
              }}
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
              value={formValues.diagnosis}
              onChange={(value) => {
                const next = Array.isArray(value) ? value[0] : value;
                setFormValues((prev) => ({ ...prev, diagnosis: next || "" }));
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
                className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2]"
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
                    key={`${item}-${index}`}
                    className="inline-flex h-[30px] items-center gap-2 rounded-[30px] border border-[#FDC70F]/32 bg-[#FDC70F]/5 px-4 text-xs font-semibold leading-[120%] text-[#9A7909]"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() => handleRemoveChip(index)}
                      className="text-[#F6776E] transition-colors hover:text-[#D94F46]"
                      aria-label={`Remove ${item}`}
                    >
                      <Image src="/icons/TrashRedIcon.svg" alt="Remove" width={14} height={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="primary">
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
    </AppShell>
  );
}


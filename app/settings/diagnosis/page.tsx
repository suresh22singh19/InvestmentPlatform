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

type Diagnosis = {
    id: number;
    name: string;
    type: "Doctor" | "Agent";
    status: "Active" | "Inactive";
};

const diagnosisTypeOptions: SelectOption[] = [
    { value: "Doctor", label: "Doctor" },
    { value: "Agent", label: "Agent" },
];

const statusOptions: SelectOption[] = [
    { value: "Active", label: "Active" },
    { value: "Inactive", label: "Inactive" },
];

const initialDiagnoses: Diagnosis[] = [
    { id: 1, name: "Addiction", type: "Doctor", status: "Active" },
    { id: 2, name: "Addiction", type: "Agent", status: "Active" },
    { id: 3, name: "Addiction", type: "Doctor", status: "Inactive" },
    { id: 4, name: "Addiction", type: "Agent", status: "Active" },
    { id: 5, name: "Addiction", type: "Doctor", status: "Active" },
    { id: 6, name: "Addiction", type: "Agent", status: "Active" },
];

const StatusFilterSelect = ({
    value,
    onChange,
}: {
    value: string;
    onChange: (nextValue: string) => void;
}) => {
    return (
        <>
            <style jsx global>{`
        .diagnosis-filter-select button > span:last-child {
          display: none !important;
        }
      `}</style>
            <div className="diagnosis-filter-select relative w-full md:w-[300px]">
                <FormSelectField
                    label=""
                    options={statusOptions}
                    value={value || null}
                    onChange={(nextValue) => {
                        const finalValue = Array.isArray(nextValue) ? nextValue[0] : nextValue;
                        onChange(finalValue || "");
                    }}
                    placeholder="Select"
                    width="100%"
                    height={44}
                    background="normal"
                />
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                    <Image src="/icons/ArrowDown.svg" alt="Arrow Down" width={20} height={20} />
                </div>
            </div>
        </>
    );
};

export default function DiagnosisPage() {
    const [diagnoses, setDiagnoses] = useState<Diagnosis[]>(initialDiagnoses);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(6);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedDiagnosis, setSelectedDiagnosis] = useState<Diagnosis | null>(null);
    const [formValues, setFormValues] = useState({
        name: "",
        type: "Doctor" as "Doctor" | "Agent",
        status: "Active" as "Active" | "Inactive",
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const filteredDiagnoses = useMemo(() => {
        return diagnoses.filter((diagnosis) => {
            const matchesSearch =
                diagnosis.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                diagnosis.type.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter ? diagnosis.status === statusFilter : true;
            return matchesSearch && matchesStatus;
        });
    }, [diagnoses, searchTerm, statusFilter]);

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedDiagnoses = filteredDiagnoses.slice(startIndex, startIndex + itemsPerPage);

    const handleAdd = () => {
        setFormValues({
            name: "",
            type: "Doctor",
            status: "Active",
        });
        setFormErrors({});
        setSelectedDiagnosis(null);
        setAddDialogOpen(true);
    };

    const handleEdit = (diagnosis: Diagnosis) => {
        setSelectedDiagnosis(diagnosis);
        setFormValues({
            name: diagnosis.name,
            type: diagnosis.type,
            status: diagnosis.status,
        });
        setFormErrors({});
        setEditDialogOpen(true);
    };

    const validateForm = () => {
        const errors: Record<string, string> = {};
        if (!formValues.name.trim()) errors.name = "Name is required";
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!validateForm()) return;

        if (selectedDiagnosis) {
            setDiagnoses((prev) =>
                prev.map((diagnosis) =>
                    diagnosis.id === selectedDiagnosis.id
                        ? {
                            ...diagnosis,
                            name: formValues.name.trim(),
                            type: formValues.type,
                            status: formValues.status,
                        }
                        : diagnosis
                )
            );
            setEditDialogOpen(false);
        } else {
            const newDiagnosis: Diagnosis = {
                id: diagnoses.length + 1,
                name: formValues.name.trim(),
                type: formValues.type,
                status: formValues.status,
            };
            setDiagnoses((prev) => [...prev, newDiagnosis]);
            setAddDialogOpen(false);
        }

        setSelectedDiagnosis(null);
        setFormValues({
            name: "",
            type: "Doctor",
            status: "Active",
        });
        setFormErrors({});
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

    const getStatusBadgeClass = (status: "Active" | "Inactive") => {
        switch (status) {
            case "Active":
                return "border-[#0B8C00]/20 bg-[#0B8C000D] text-[#0B8C00]";
            case "Inactive":
                return "border-[#F6776E]/24 bg-[#F6776E0D] text-[#F6776E]";
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
                        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <h2 className="text-lg font-semibold leading-[120%] text-[#434956]">Diagnosis</h2>

                            <div className="flex items-center gap-3">
                                <div className="w-full lg:max-w-[300px]">
                                    <StatusFilterSelect value={statusFilter} onChange={setStatusFilter} />
                                </div>

                                <div className="flex-1 min-w-[240px] lg:max-w-[320px]">
                                    <TableSearchInput
                                        value={searchTerm}
                                        onChange={setSearchTerm}
                                        placeholder="Search Here..."
                                    />
                                </div>

                                <div className="w-full lg:w-auto">
                                    <button
                                        type="button"
                                        className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] focus:outline-none focus:ring-2 focus:ring-[#0B8C00]/20"
                                        onClick={handleAdd}
                                    >
                                        <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                                        Add Diagnosis
                                    </button>
                                </div>
                            </div>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead position="first" className="whitespace-nowrap">
                                        Sr no.
                                    </TableHead>
                                    <TableHead sortable sortDirection={getSortDirection("name")} onSort={() => { }}>
                                        Name
                                    </TableHead>
                                    <TableHead sortable sortDirection={getSortDirection("type")} onSort={() => { }}>
                                        Type
                                    </TableHead>
                                    <TableHead sortable sortDirection={getSortDirection("status")} onSort={() => { }}>
                                        Status
                                    </TableHead>
                                    <TableHead position="last">Action</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {paginatedDiagnoses.length === 0 ? (
                                    <TableRow>
                                        <TableData colSpan={5} className="py-12 text-center text-sm text-[#9CA3AF]">
                                            No diagnoses found
                                        </TableData>
                                    </TableRow>
                                ) : (
                                    paginatedDiagnoses.map((diagnosis, index) => (
                                        <TableRow key={diagnosis.id}>
                                            <TableData position="first">{startIndex + index + 1}</TableData>
                                            <TableData>{diagnosis.name}</TableData>
                                            <TableData>{diagnosis.type}</TableData>
                                            <TableData>
                                                <span
                                                    className={`inline-flex h-[30px] min-w-[86px] items-center justify-center rounded-[30px] border px-5 text-xs font-medium leading-[120%] ${getStatusBadgeClass(
                                                        diagnosis.status
                                                    )}`}
                                                >
                                                    {diagnosis.status}
                                                </span>
                                            </TableData>
                                            <TableData position="last">
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEdit(diagnosis)}
                                                        className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                                                        aria-label="Edit diagnosis"
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

                        {filteredDiagnoses.length > 0 && (
                            <Pagination
                                currentPage={currentPage}
                                totalItems={filteredDiagnoses.length}
                                itemsPerPage={itemsPerPage}
                                onPageChange={handlePageChange}
                                onItemsPerPageChange={handleItemsPerPageChange}
                                itemsPerPageOptions={[6, 10, 20, 50]}
                            />
                        )}
                    </div>
                </ListBorder>
            </div>

            {/* Add Diagnosis Dialog */}
            <Dialog
                open={addDialogOpen}
                onClose={() => {
                    setAddDialogOpen(false);
                    setFormErrors({});
                }}
                title="Add Diagnosis"
                width={949}
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <FormInputField
                            label="Name"
                            value={formValues.name}
                            onChange={(event) => {
                                setFormValues((prev) => ({ ...prev, name: event.target.value }));
                                setFormErrors((prev) => ({ ...prev, name: "" }));
                            }}
                            height={44}
                            placeholder="Name"
                            required
                        />
                        {formErrors.name && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.name}</p>}
                    </div>

                    <div >
                        <FormSelectField
                            label="Type"
                            value={formValues.type}
                            onChange={(value) => {
                                setFormValues((prev) => ({
                                    ...prev,
                                    type: ((Array.isArray(value) ? value[0] : value) as "Doctor" | "Agent") || "Doctor",
                                }));
                            }}
                            options={diagnosisTypeOptions}
                            placeholder="Select Type"
                            mode="single"
                            background="white"
                        />

                    </div>
                    <div>
                        <FormSelectField
                            label="Status"
                            value={formValues.status}
                            onChange={(value) => {
                                setFormValues((prev) => ({
                                    ...prev,
                                    status: ((Array.isArray(value) ? value[0] : value) as "Active" | "Inactive") || "Active",
                                }));
                            }}
                            options={statusOptions}
                            placeholder="Select Status"
                            mode="single"
                            background="white"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Button type="submit" variant="primary">
                            Add Diagnosis
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setAddDialogOpen(false);
                                setFormErrors({});
                            }}
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            </Dialog>

            {/* Edit Diagnosis Dialog */}
            <Dialog
                open={editDialogOpen}
                onClose={() => {
                    setEditDialogOpen(false);
                    setSelectedDiagnosis(null);
                    setFormErrors({});
                }}
                title="Edit Diagnosis"
                width={949}
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <FormInputField
                            label="Name"
                            value={formValues.name}
                            onChange={(event) => {
                                setFormValues((prev) => ({ ...prev, name: event.target.value }));
                                setFormErrors((prev) => ({ ...prev, name: "" }));
                            }}
                            height={44}
                            placeholder="Name"
                            required
                        />
                        {formErrors.name && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.name}</p>}
                    </div>

                    <div >
                        <FormSelectField
                            label="Type"
                            value={formValues.type}
                            onChange={(value) => {
                                setFormValues((prev) => ({
                                    ...prev,
                                    type: ((Array.isArray(value) ? value[0] : value) as "Doctor" | "Agent") || "Doctor",
                                }));
                            }}
                            options={diagnosisTypeOptions}
                            placeholder="Select Type"
                            mode="single"
                            background="white"
                        />
                    </div>
                    <div>
                        <FormSelectField
                            label="Status"
                            value={formValues.status}
                            onChange={(value) => {
                                setFormValues((prev) => ({
                                    ...prev,
                                    status: ((Array.isArray(value) ? value[0] : value) as "Active" | "Inactive") || "Active",
                                }));
                            }}
                            options={statusOptions}
                            placeholder="Select Status"
                            mode="single"
                            background="white"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Button type="submit" variant="primary">
                            Update Diagnosis
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setEditDialogOpen(false);
                                setSelectedDiagnosis(null);
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


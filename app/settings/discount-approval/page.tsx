"use client";

import Image from "next/image";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { Button, Dialog, FormInputField, FormSelectField, Table, TableHeader, TableBody, TableRow, TableHead, TableData, TableSearchInput, Pagination } from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import type { SelectOption } from "@/components/ui/FormSelectField";

type DiscountApproval = {
    id: number;
    branchName: string;
    level1: string;
    level2: string;
};

const initialDiscountApprovals: DiscountApproval[] = [
    {
        id: 1,
        branchName: "MURAD NAGAR UP",
        level1: "test@jeenaShiko.in",
        level2: "test@jeenaShiko.in",
    },
    {
        id: 2,
        branchName: "Vaishali UP",
        level1: "testdiscount-approval",
        level2: "testdiscount-approval",
    },
    {
        id: 3,
        branchName: "Sonipat",
        level1: "usha_campjeena@jeenasikho.com",
        level2: "usha_campjeena@jeenasikho.com",
    },
    {
        id: 4,
        branchName: "Shastri Nagar Delhi",
        level1: "satyam@jeenasikho.com",
        level2: "satyam@jeenasikho.com",
    },
    {
        id: 5,
        branchName: "RDC Ghaziabad UP",
        level1: "manu@jeenasikho.com",
        level2: "manu@jeenasikho.com",
    },
    {
        id: 6,
        branchName: "Prashant Vihar",
        level1: "discountapprovaltest",
        level2: "discountapprovaltest",
    },
];

const branchOptions: SelectOption[] = [
    { value: "murad-nagar", label: "MURAD NAGAR UP" },
    { value: "vaishali", label: "Vaishali UP" },
    { value: "sonipat", label: "Sonipat" },
    { value: "shastri-nagar", label: "Shastri Nagar Delhi" },
    { value: "rdc-ghaziabad", label: "RDC Ghaziabad UP" },
    { value: "prashant-vihar", label: "Prashant Vihar" },
];

// Custom Select Component with ArrowDown icon
const CustomSelect = ({
    options,
    value,
    onChange,
    placeholder = "Select",
    width = 300,
}: {
    options: SelectOption[];
    value: string[];
    onChange: (value: string[]) => void;
    placeholder?: string;
    width?: number;
}) => {
    return (
        <>
            <style jsx global>{`
                .custom-select-with-arrow button > span:last-child {
                    display: none !important;
                }
            `}</style>
            <div className="relative custom-select-with-arrow" style={{ width: `${width}px` }}>
                <FormSelectField
                    label=""
                    options={options}
                    mode="multiple"
                    value={value}
                    onChange={(val) => {
                        if (Array.isArray(val)) {
                            onChange(val);
                        }
                    }}
                    placeholder={placeholder}
                    width={width}
                    height={44}
                />
                <div 
                    className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none z-10 flex items-center" 
                    style={{ height: '44px' }}
                >
                    <Image src="/icons/ArrowDown.svg" alt="Arrow down" width={20} height={20} />
                </div>
            </div>
        </>
    );
};

export default function DiscountApprovalPage() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [discountApprovals, setDiscountApprovals] = useState<DiscountApproval[]>(initialDiscountApprovals);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(6);
    const [formValues, setFormValues] = useState({
        branchName: "",
        level1: "",
        level2: "",
    });

    // Filter data based on search and selected branches
    const filteredData = discountApprovals.filter((item) => {
        const matchesSearch =
            item.branchName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.level1.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.level2.toLowerCase().includes(searchTerm.toLowerCase());
        
        // If no branches selected, show all. Otherwise, filter by selected branches
        const matchesBranch =
            selectedBranches.length === 0 ||
            selectedBranches.some((branchValue) => {
                const branchOption = branchOptions.find((opt) => opt.value === branchValue);
                return branchOption && item.branchName.toLowerCase() === branchOption.label.toLowerCase();
            });
        
        return matchesSearch && matchesBranch;
    });

    // Paginate data
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    const handleAddNew = () => {
        setIsEditMode(false);
        setEditingId(null);
        setFormValues({
            branchName: "",
            level1: "",
            level2: "",
        });
        setIsDialogOpen(true);
    };

    const handleEdit = (approval: DiscountApproval) => {
        setIsEditMode(true);
        setEditingId(approval.id);
        setFormValues({
            branchName: approval.branchName,
            level1: approval.level1,
            level2: approval.level2,
        });
        setIsDialogOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (isEditMode && editingId !== null) {
            setDiscountApprovals((prev) =>
                prev.map((item) =>
                    item.id === editingId
                        ? {
                            ...item,
                            ...formValues,
                        }
                        : item
                )
            );
        } else {
            const newId = Math.max(...discountApprovals.map((item) => item.id), 0) + 1;
            setDiscountApprovals((prev) => [
                ...prev,
                {
                    id: newId,
                    ...formValues,
                },
            ]);
        }

        setIsDialogOpen(false);
        setIsEditMode(false);
        setEditingId(null);
        setFormValues({
            branchName: "",
            level1: "",
            level2: "",
        });
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
                    <div className="w-full overflow-hidden rounded-[16px] border border-[#E3EEE1] bg-white px-5 pb-5 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-[#434956]">Discount Approval Configuration</h2>

                            <div className="flex items-center gap-3">
                                <CustomSelect
                                    options={branchOptions}
                                    value={selectedBranches}
                                    onChange={setSelectedBranches}
                                    placeholder="Select"
                                    width={300}
                                />
                                <TableSearchInput
                                    value={searchTerm}
                                    onChange={setSearchTerm}
                                    placeholder="Search Here..."
                                />
                                <button
                                    type="button"
                                    className="flex h-11 items-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium text-[#0B8C00] transition-colors hover:bg-[#F2F8F2]"
                                    onClick={handleAddNew}
                                >
                                    <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} />
                                    Add Discount Approval Configuration
                                </button>
                            </div>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow className="bg-white">
                                    <TableHead position="first">
                                        Sr no.
                                    </TableHead>
                                    <TableHead sortable>
                                        Branch Name
                                    </TableHead>
                                    <TableHead sortable>
                                        Level 1
                                    </TableHead>
                                    <TableHead sortable>
                                        Level 2
                                    </TableHead>
                                    <TableHead position="last">
                                        Action
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedData.length === 0 ? (
                                    <TableRow>
                                        <TableData
                                            colSpan={5}
                                            className="py-12 text-center text-sm text-[#9CA3AF]"
                                        >
                                            No discount approvals found
                                        </TableData>
                                    </TableRow>
                                ) : (
                                    paginatedData.map((approval, index) => (
                                        <TableRow
                                            key={approval.id}
                                            className="bg-white transition-colors hover:bg-[#F7FAF7]"
                                        >
                                            <TableData variant="primary">
                                                {startIndex + index + 1}
                                            </TableData>
                                            <TableData>
                                                {approval.branchName}
                                            </TableData>
                                            <TableData>
                                                {approval.level1}
                                            </TableData>
                                            <TableData>
                                                {approval.level2}
                                            </TableData>
                                            <TableData>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEdit(approval)}
                                                        className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                                                        aria-label="Edit"
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

                        {filteredData.length > 0 && (
                            <Pagination
                                currentPage={currentPage}
                                totalItems={filteredData.length}
                                itemsPerPage={itemsPerPage}
                                onPageChange={handlePageChange}
                                onItemsPerPageChange={handleItemsPerPageChange}
                            />
                        )}
                    </div>
                </ListBorder>
            </div>

            <Dialog
                open={isDialogOpen}
                onClose={() => {
                    setIsDialogOpen(false);
                    setIsEditMode(false);
                    setEditingId(null);
                }}
                title={isEditMode ? "Edit Discount Approval Configuration" : "Add Discount Approval Configuration"}
                width={686}
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div>
                            <FormSelectField
                                label="Branch"
                                value={formValues.branchName}
                                onChange={(value) =>
                                    setFormValues((prev) => ({
                                        ...prev,
                                        branchName: Array.isArray(value) ? value[0] : value,
                                    }))
                                }
                                options={branchOptions.map((opt) => ({
                                    value: opt.value,
                                    label: opt.label,
                                }))}
                                placeholder="Select"
                                mode="single"
                                background="white"
                            />
                        </div>

                        <div>
                            <FormInputField
                                label="Level 1"
                                value={formValues.level1}
                                onChange={(event) =>
                                    setFormValues((prev) => ({
                                        ...prev,
                                        level1: event.target.value,
                                    }))
                                }
                                height={44}
                                placeholder="Level 1"
                                required
                            />
                        </div>

                        <div>
                            <FormInputField
                                label="Level 2"
                                value={formValues.level2}
                                onChange={(event) =>
                                    setFormValues((prev) => ({
                                        ...prev,
                                        level2: event.target.value,
                                    }))
                                }
                                height={44}
                                placeholder="Level 2"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Button type="submit" variant="primary">
                            {isEditMode ? "Update" : "Save"}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setIsDialogOpen(false);
                                setIsEditMode(false);
                                setEditingId(null);
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


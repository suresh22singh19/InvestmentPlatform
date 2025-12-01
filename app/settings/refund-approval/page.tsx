"use client";

import Image from "next/image";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { Button, Dialog, FormInputField, FormSelectField, Table, TableHeader, TableBody, TableRow, TableHead, TableData, TableSearchInput, Pagination } from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import type { SelectOption } from "@/components/ui/FormSelectField";

type RefundApproval = {
    id: number;
    branchName: string;
    username: string;
};

const initialRefundApprovals: RefundApproval[] = [
    {
        id: 1,
        branchName: "MURAD NAGAR UP",
        username: "test@jeenaShiko.in",
    },
    {
        id: 2,
        branchName: "Vaishali UP",
        username: "testdiscount-approval",
    },
    {
        id: 3,
        branchName: "Sonipat",
        username: "discountapprovaltest",
    },
    {
        id: 4,
        branchName: "Shastri Nagar Delhi",
        username: "usha_campjeena@jeenasikho.com",
    },
    {
        id: 5,
        branchName: "RDC Ghaziabad UP",
        username: "satyam@jeenasikho.com",
    },
    {
        id: 6,
        branchName: "Prashant Vihar",
        username: "manu@jeenasikho.com",
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

const usernameOptions: SelectOption[] = [
    { value: "test@jeenaShiko.in", label: "test@jeenaShiko.in" },
    { value: "testdiscount-approval", label: "testdiscount-approval" },
    { value: "discountapprovaltest", label: "discountapprovaltest" },
    { value: "usha_campjeena@jeenasikho.com", label: "usha_campjeena@jeenasikho.com" },
    { value: "satyam@jeenasikho.com", label: "satyam@jeenasikho.com" },
    { value: "manu@jeenasikho.com", label: "manu@jeenasikho.com" },
];

export default function RefundApprovalPage() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [refundApprovals, setRefundApprovals] = useState<RefundApproval[]>(initialRefundApprovals);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(6);
    const [formValues, setFormValues] = useState({
        branchName: "",
        username: "",
    });

    // Filter data based on search
    const filteredData = refundApprovals.filter((item) => {
        const matchesSearch =
            item.branchName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.username.toLowerCase().includes(searchTerm.toLowerCase());
        
        return matchesSearch;
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
            username: "",
        });
        setIsDialogOpen(true);
    };

    const handleEdit = (approval: RefundApproval) => {
        setIsEditMode(true);
        setEditingId(approval.id);
        setFormValues({
            branchName: approval.branchName,
            username: approval.username,
        });
        setIsDialogOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (isEditMode && editingId !== null) {
            setRefundApprovals((prev) =>
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
            const newId = Math.max(...refundApprovals.map((item) => item.id), 0) + 1;
            setRefundApprovals((prev) => [
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
            username: "",
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
                            <h2 className="text-lg font-semibold text-[#434956]">Refund Approval Configuration</h2>

                            <div className="flex items-center gap-3">
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
                                    Add Refund Approval Configuration
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
                                        Username
                                    </TableHead>
                                    <TableHead position="last" >
                                        Action
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedData.length === 0 ? (
                                    <TableRow>
                                        <TableData
                                            colSpan={4}
                                            className="py-12 text-center text-sm text-[#9CA3AF]"
                                        >
                                            No refund approvals found
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
                                                {approval.username}
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
                title={isEditMode ? "Edit Refund Approval Configuration" : "Add Refund Approval Configuration"}
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
                                label="Configuration refund approval username"
                                value={formValues.username}
                                onChange={(event) =>
                                    setFormValues((prev) => ({
                                        ...prev,
                                        username: event.target.value,
                                    }))
                                }
                                height={44}
                                placeholder="Configuration refund approval username"
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


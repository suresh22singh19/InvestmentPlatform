"use client";

import Image from "next/image";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { Button, Dialog, FormInputField, FormSelectField, Table, TableHeader, TableBody, TableRow, TableHead, TableData, TableSearchInput, Pagination } from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import { useGetBranchesQuery } from "@/store/api/settingsApi";
import type { SelectOption } from "@/components/ui/FormSelectField";

type MemberRegistration = {
    id: number;
    branchName: string;
    phoneNumber: string;
    permissionBy: string;
    addedBy: string;
};

const initialMemberRegistrations: MemberRegistration[] = [
    {
        id: 1,
        branchName: "MURAD NAGAR UP",
        phoneNumber: "9418418040",
        permissionBy: "development@jeenasikho.co.in",
        addedBy: "development@jeenasikho.co.in",
    },
    {
        id: 2,
        branchName: "Vaishali UP",
        phoneNumber: "9876543210",
        permissionBy: "development@jeenasikho.co.in",
        addedBy: "development@jeenasikho.co.in",
    },
    {
        id: 3,
        branchName: "Sonipat",
        phoneNumber: "9418418040",
        permissionBy: "development@jeenasikho.co.in",
        addedBy: "development@jeenasikho.co.in",
    },
    {
        id: 4,
        branchName: "Shastri Nagar Delhi",
        phoneNumber: "9876543210",
        permissionBy: "development@jeenasikho.co.in",
        addedBy: "development@jeenasikho.co.in",
    },
    {
        id: 5,
        branchName: "RDC Ghaziabad UP",
        phoneNumber: "9876543210",
        permissionBy: "development@jeenasikho.co.in",
        addedBy: "development@jeenasikho.co.in",
    },
    {
        id: 6,
        branchName: "Prashant Vihar",
        phoneNumber: "9876543210",
        permissionBy: "development@jeenasikho.co.in",
        addedBy: "development@jeenasikho.co.in",
    },
];

export default function AddMemberPage() {
    const { data: branchesData, isLoading: isLoadingBranches } = useGetBranchesQuery();
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [memberRegistrations, setMemberRegistrations] = useState<MemberRegistration[]>(initialMemberRegistrations);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(6);
    const [formValues, setFormValues] = useState({
        branchName: "",
        phoneNumber: "",
    });

    // Convert branches data to select options
    const branchOptions: SelectOption[] = useMemo(() => {
        if (!branchesData?.data) {
            return [];
        }
        return branchesData.data.map((branch) => ({
            value: branch.name,
            label: branch.name,
        }));
    }, [branchesData]);

    // Filter data based on search
    const filteredData = memberRegistrations.filter(
        (item) =>
            item.branchName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.permissionBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.addedBy.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Paginate data
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    const handleAddNew = () => {
        setFormValues({
            branchName: "",
            phoneNumber: "",
        });
        setIsDialogOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const newId = Math.max(...memberRegistrations.map((item) => item.id), 0) + 1;
        // In a real app, these would come from authentication context
        const currentUser = "development@jeenasikho.co.in";
        setMemberRegistrations((prev) => [
            ...prev,
            {
                id: newId,
                ...formValues,
                permissionBy: currentUser,
                addedBy: currentUser,
            },
        ]);

        setIsDialogOpen(false);
        setFormValues({
            branchName: "",
            phoneNumber: "",
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
                            <h2 className="text-lg font-semibold text-[#434956]">Add Member Registration</h2>

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
                                    Add Member Permission List
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
                                        Phone Number
                                    </TableHead>
                                    <TableHead sortable>
                                        Permission By
                                    </TableHead>
                                    <TableHead position="last" sortable>
                                        Added By
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
                                            No member registrations found
                                        </TableData>
                                    </TableRow>
                                ) : (
                                    paginatedData.map((member, index) => (
                                        <TableRow
                                            key={member.id}
                                            className="bg-white transition-colors hover:bg-[#F7FAF7]"
                                        >
                                            <TableData variant="primary">
                                                {startIndex + index + 1}
                                            </TableData>
                                            <TableData>
                                                {member.branchName}
                                            </TableData>
                                            <TableData>
                                                {member.phoneNumber}
                                            </TableData>
                                            <TableData>
                                                {member.permissionBy}
                                            </TableData>
                                            <TableData>
                                                {member.addedBy}
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
                }}
                title="Add Member Registration"
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
                                        branchName: typeof value === "string" ? value : Array.isArray(value) ? value[0] : "",
                                    }))
                                }
                                options={branchOptions}
                                placeholder={isLoadingBranches ? "Loading branches..." : "Select"}
                                mode="single"
                                background="white"
                                disabled={isLoadingBranches}
                            />
                        </div>

                        <div>
                            <FormInputField
                                label="Phone Number"
                                value={formValues.phoneNumber}
                                onChange={(event) =>
                                    setFormValues((prev) => ({
                                        ...prev,
                                        phoneNumber: event.target.value,
                                    }))
                                }
                                height={44}
                                placeholder="Phone Number"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Button type="submit" variant="primary">
                            Save
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setIsDialogOpen(false);
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


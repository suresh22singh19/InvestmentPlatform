"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
    ExportButton,
    RefreshButton,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableData,
    TableSearchInput,
    Pagination,
    Tooltip,
    FormSelectField, DatePicker, FileUploadField, Dialog, Button,
    FormInputField,
} from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import { useDebounce } from "@/hooks/useDebounce";
import {
    STATIC_BRANCH_FILTER_OPTIONS,
    branchLabel,
    DEPARTMENT_OPTIONS,
    doctorDisplayName,
    optionLabel,
} from "@/lib/doctor/doctorStatic";
import type { DoctorRecord } from "@/lib/doctor/doctorStatic";
import { useDoctorRecords } from "../DoctorRecordsContext";

export default function DoctorListPage() {
    const router = useRouter();
    const { doctors, resetToSeed } = useDoctorRecords();
    const [open, setOpen] = useState(false);
    const [selectedBranchFilter, setSelectedBranchFilter] = useState("");
    const [filters, setFilters] = useState({
        searchTerm: "",
        currentPage: 1,
        itemsPerPage: 10,
        sortField: "",
        sortOrder: "asc" as "asc" | "desc",
    });

    const debouncedSearchTerm = useDebounce(filters.searchTerm, 300);
    const trimmedSearch = debouncedSearchTerm.trim().toLowerCase();

    const filteredSorted = useMemo(() => {
        let rows = [...doctors];

        if (selectedBranchFilter) {
            rows = rows.filter((d) => d.branchId === selectedBranchFilter);
        }

        if (trimmedSearch) {
            rows = rows.filter((d) => {
                const hay = [
                    d.name,
                    d.email,
                    d.contact,
                    d.employeeId,
                    d.department,
                    branchLabel(d.branchId),
                ]
                    .join(" ")
                    .toLowerCase();
                return hay.includes(trimmedSearch);
            });
        }

        const field = filters.sortField;
        if (field) {
            const mult = filters.sortOrder === "asc" ? 1 : -1;
            rows.sort((a, b) => {
                let av = "";
                let bv = "";
                if (field === "name") {
                    av = doctorDisplayName(a).toLowerCase();
                    bv = doctorDisplayName(b).toLowerCase();
                } else if (field === "department") {
                    av = a.department.toLowerCase();
                    bv = b.department.toLowerCase();
                } else if (field === "email") {
                    av = a.email.toLowerCase();
                    bv = b.email.toLowerCase();
                } else if (field === "status") {
                    av = a.status;
                    bv = b.status;
                } else {
                    return 0;
                }
                if (av < bv) return -1 * mult;
                if (av > bv) return 1 * mult;
                return 0;
            });
        }

        return rows;
    }, [doctors, selectedBranchFilter, trimmedSearch, filters.sortField, filters.sortOrder]);

    const totalItems = filteredSorted.length;

    const paginatedRows = useMemo(() => {
        const start = (filters.currentPage - 1) * filters.itemsPerPage;
        return filteredSorted.slice(start, start + filters.itemsPerPage);
    }, [filteredSorted, filters.currentPage, filters.itemsPerPage]);

    const handlePageChange = (page: number) => {
        setFilters((prev) => ({ ...prev, currentPage: page }));
    };

    const handleItemsPerPageChange = (items: number) => {
        setFilters((prev) => ({ ...prev, itemsPerPage: items, currentPage: 1 }));
    };

    const handleSort = (field: string) => {
        setFilters((prev) => {
            if (prev.sortField === field) {
                return { ...prev, sortOrder: prev.sortOrder === "asc" ? "desc" : "asc" };
            }
            return { ...prev, sortField: field, sortOrder: "asc" };
        });
    };

    const getSortDirection = (field: string): "asc" | "desc" | null => {
        if (filters.sortField === field) {
            return filters.sortOrder;
        }
        return null;
    };

    const handleExportPDF = async () => { };

    const handleRefresh = () => {
        resetToSeed();
        setFilters((prev) => ({ ...prev, currentPage: 1 }));
    };

    const goView = (row: DoctorRecord) => router.push(`/doctor/${row.id}`);
    const goCredentials = (row: DoctorRecord) =>
        router.push(`/doctor/${row.id}?section=credentials`);
    const goEdit = (row: DoctorRecord) => router.push(`/doctor/${row.id}/edit`);

    return (
        <AppShell>



            {/* Doctor Visit  */}
            <div className="space-y-8">
                <div className="flex items-start justify-between">
                    <PageHeading title="Doctor Visit" />
                </div>

                <ListBorder as="section" className="px-4 py-4">
                    <div className="w-full overflow-hidden rounded-[16px] border border-[#E3EEE1] bg-white px-5 pb-5 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-[#434956]"></h2>

                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    type="button"
                                    className="cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center w-[108px] h-10 rounded-[32px] border border-[#0B8C00] bg-white hover:bg-[#F7FAF7] relative z-10"
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <Image src="/icons/FilterIcon.svg" alt="filter" width={24} height={24} />
                                        <span className="font-inter font-medium text-sm leading-[120%] text-[#0B8C00] text-hide">Filter</span>
                                    </div>
                                </button>

                                <div className="flex-shrink-0" style={{ width: "300px" }}>
                                    <TableSearchInput
                                        value={filters.searchTerm}
                                        onChange={(value) =>
                                            setFilters((prev) => ({
                                                ...prev,
                                                searchTerm: value,
                                                currentPage: prev.searchTerm !== value ? 1 : prev.currentPage,
                                            }))
                                        }
                                        placeholder="Search Here..."
                                    />
                                </div>
                                <button
                                    type="button"
                                    className="flex h-11 items-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium text-[#0B8C00] transition-colors hover:bg-[#F2F8F2]"
                                    onClick={() => setOpen(true)}>
                                    <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} />
                                    <span className="text-hide">Add New</span>
                                </button>
                                <RefreshButton onClick={handleRefresh} />
                            </div>
                        </div>

                        <div className="w-full overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-white">
                                        <TableHead position="first">Sr no.</TableHead>
                                        <TableHead>Doctor Name</TableHead>
                                        <TableHead>Branch</TableHead>
                                        <TableHead>Visit Branch</TableHead>
                                        <TableHead>Visit Date</TableHead>
                                        <TableHead>Created At</TableHead>
                                        <TableHead position="last">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableData>1</TableData>
                                        <TableData>Dr Shiv Ram Singh</TableData>
                                        <TableData>Navi Mumbai</TableData>
                                        <TableData>Navi Mumbai</TableData>
                                        <TableData>2025-10-07</TableData>
                                        <TableData>2025-10-07</TableData>
                                        <TableData>-</TableData>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>

                        {totalItems > 0 && (
                            <Pagination
                                currentPage={filters.currentPage}
                                totalItems={totalItems}
                                itemsPerPage={filters.itemsPerPage}
                                onPageChange={handlePageChange}
                                onItemsPerPageChange={handleItemsPerPageChange}
                            />
                        )}
                    </div>
                </ListBorder>
            </div>
            {/* Doctor Visit  */}




            {/* Doctor Visit  */}
            <Dialog
                open={open}
                onClose={() => {
                    setOpen(false);
                }}
                title={"Add New Doctor Visit Request"}
                width={949}
            >
                <form
                    noValidate
                    className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <FormSelectField
                                label="Doctor *"
                                value={""}
                                options={[]}
                                placeholder="Select"
                                mode="single"
                                background="white"
                            />
                        </div>
                        <div>
                            <FormSelectField
                                label="Branch *"
                                value={""}
                                options={[]}
                                placeholder="Select"
                                mode="single"
                                background="white"
                            />
                        </div>
                        <div>
                            <FormSelectField
                                label="Visit Branch *"
                                value={""}
                                options={[]}
                                placeholder="Select"
                                mode="single"
                                background="white"
                            />
                        </div>

                        <div>
                            <DatePicker label="Visit Date" placeholder="DD/MM/YY"
                                value={''} required={false} background="white" width="100%"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <FormInputField
                                label="Camp Description"
                                value={''}
                                height={44}
                                placeholder="Camp Description"
                                type="text"
                            />
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <Button
                            type="button"
                            variant="primary"
                        >
                            Save
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                    </div>
                </form>
            </Dialog>
            {/* Doctor Visit  */}
        </AppShell>
    );
}

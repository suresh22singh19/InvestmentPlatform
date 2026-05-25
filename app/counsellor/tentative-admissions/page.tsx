"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
    TableSearchInput,
    TableListingCard,
} from "@/components/ui";
import { useGetTentativeOrArchivedListQuery } from "@/store/api/counsellorApi";
import { useDebounce } from "@/hooks/useDebounce";

export default function CounsellorTentativeAdmissionsPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearch = useDebounce(searchTerm, 500);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10); // 6 items shown as in reference image
    const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("ASC");
    const [sortBy, setSortBy] = useState<string>("patientName");

    // Reset page on search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch]);

    // Integrate backend query hook
    const {
        data: listRes,
        isLoading,
        isError
    } = useGetTentativeOrArchivedListQuery({
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearch.trim() || undefined,
        sortBy: sortBy === "patientName" ? "patientName" : undefined,
        order: sortOrder,
        type: "tentative",
    });

    const currentList = listRes?.data || [];
    const totalItems = listRes?.total || 0;

    // Button style class matching the dashboard action items
    const btnCls = "px-4 py-1.5 rounded-[32px] border border-[#0B8C00] text-[#0B8C00] text-xs font-medium hover:bg-[#F2F8F2] transition-colors whitespace-nowrap";

    // Setup columns
    const columns = [
        { label: "Sr no.", position: "first" as const },
        {
            label: "Patient Name",
            sortable: true,
            sortDirection: sortBy === "patientName" ? (sortOrder.toLowerCase() as "asc" | "desc") : null,
            onSort: () => {
                setSortBy("patientName");
                setSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"));
                setCurrentPage(1);
            },
        },
        { label: "Patient UHID" },
        { label: "Patient Contact Number" },
        { label: "Referring Doctor" },
        { label: "Chief Complaint" },
        { label: "Action", position: "last" as const, className: "cursor-pointer" },
    ];

    // Setup rows dynamically mapped from API response
    const rows = currentList.map((item, index) => {
        const sr = (currentPage - 1) * itemsPerPage + index + 1;

        // Custom green styled link for patient UHID
        const uhid = (
            <span className="text-[#0B8C00] font-medium cursor-pointer hover:underline">
                {item.patientUhid || "N/A"}
            </span>
        );

        // Action Buttons: View & Start Admission (green-outlined pills)
        const actions = (
            <div className="flex items-center gap-2">
                <button type="button" className={btnCls}>View</button>
                <button type="button" className={btnCls}>Start Admission</button>
            </div>
        );

        return [
            sr,
            item.patientName || "N/A",
            uhid,
            item.contactNumber || "N/A",
            item.doctorName || "N/A",
            item.diagnosis || "N/A", // API "diagnosis" field maps to Chief Complaint
            actions,
        ];
    });

    return (
        <AppShell>
            <div className="flex flex-col gap-6 ">
                {/* Page Heading */}
                <div className="flex items-start justify-between">
                    <PageHeading title="Tentative Admissions" />
                </div>

                {/* Table Listing Card */}
                <div className="w-full rounded-[20px] border border-[#E3EEE1] p-2">
                    <TableListingCard
                        sections={[
                            {
                                id: "tentative-admissions-list",
                                title: "Tentative Admissions",
                                titleRightContent: (
                                    <div style={{ width: "300px" }}>
                                        <TableSearchInput
                                            value={searchTerm}
                                            onChange={setSearchTerm}
                                            placeholder="Search Here..."
                                        />
                                    </div>
                                ),
                                columns,
                                rows,
                                isLoading,
                                isError,
                                errorMessage: "Facing server API error",
                                emptyMessage: "No tentative admissions found",
                                pagination: {
                                    currentPage,
                                    totalItems,
                                    itemsPerPage,
                                    onPageChange: setCurrentPage,
                                    onItemsPerPageChange: (items: number) => {
                                        setItemsPerPage(items);
                                        setCurrentPage(1);
                                    },
                                    itemsPerPageOptions: [10, 20, 50, 100],
                                },
                            },
                        ]}
                    />
                </div>

            </div>
        </AppShell>
    );
}

"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
    TableSearchInput,
    TableListingCard,
    Button,
    Badge,
    Dialog,
} from "@/components/ui";
import { useDebounce } from "@/hooks/useDebounce";
import { useGetTreatmentPackagesQuery } from "@/store/api/counsellorApi";

// Helper component to render the package category icon
interface PackageIconProps {
    src: string;
    alt: string;
}

function PackageIcon({ src, alt }: PackageIconProps) {
    return (
        <div className="w-10 h-10 rounded-full bg-[#0B8C000D] border border-[#0B8C0026] flex items-center justify-center shrink-0">
            <Image
                src={src}
                alt={alt}
                width={24}
                height={24}
                className="object-contain"
            />
        </div>
    );
}

// StatCard Component matching future-admissions page patterns
interface StatCardProps {
    label: string;
    value: string | number;
    iconSrc: string;
}

function TreatmentStatCard({ label, value, iconSrc }: StatCardProps) {
    return (
        <div className="rounded-[20px] p-6 bg-white border border-[#E3EEE1] flex justify-between items-center transition-all duration-200 hover:shadow-md select-none">
            <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-[#737A8B]">{label}</span>
                <h4 className="font-bold text-[32px] leading-[120%] text-[#262D3B]">
                    {value}
                </h4>
            </div>
            <div>
                <Image
                    src={iconSrc}
                    alt={label}
                    width={48}
                    height={48}
                    className="object-contain"
                />
            </div>
        </div>
    );
}

// Package Card Grid Item component
interface PackageCardProps {
    item: {
        id: number;
        packageName: string;
        totalPerDayCost: string;
        activePatients: number;
        totalAdmissions: number;
        category?: string;
        progress?: number;
        iconSrc?: string;
        description?: string;
    };
    onViewDetails: (item: any) => void;
}

function PackageCard({ item, onViewDetails }: PackageCardProps) {
    const category = item.category || "Standard";
    const progress = item.progress !== undefined ? item.progress : 50;
    const iconSrc = item.iconSrc || "/icons/cardiacGoldIcon.svg";

    return (
        <div className="w-full flex flex-col rounded-[20px] border border-[#DFE0E2] bg-white shadow-sm hover:shadow-md hover:border-[#CBD5E1] transition-all duration-200 select-none">
            {/* Header section: Title, Icon and Category Badge */}
            <div className="p-5 flex justify-between items-center gap-3">
                <div className="flex items-center gap-3 truncate">
                    <PackageIcon src={iconSrc} alt={item.packageName} />
                    <h4 className="font-bold text-base text-[#262D3B] truncate leading-[130%]" title={item.packageName}>
                        {item.packageName || "N/A"}
                    </h4>
                </div>
                <Badge
                    variant="success"
                    className="bg-transparent border border-[#0B8C0033] text-[#0B8C00] px-3 py-1 font-normal rounded-full text-xs whitespace-nowrap"
                >
                    {category}
                </Badge>
            </div>

            {/* Edge-to-edge Header Divider */}
            <div className="border-b border-[#DFE0E2]" />

            {/* Middle content section: Total Per-day Cost + Progress Bar & Active/Total stats */}
            <div className="p-5 flex flex-col gap-5">
                {/* Total Per-day Cost + Progress Bar */}
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-sm font-semibold text-[#787E8C]">
                        <span>Total Per-Day Cost</span>
                        <span className="text-[#262D3B] font-extrabold text-base">
                            {item.totalPerDayCost || "₹0"}
                        </span>
                    </div>
                    {/* Horizontal Progress Bar */}
                    <div className="h-1.5 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[#0B8C00] rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* Active Patients & Total Admissions */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-[#787E8C]">Active Patients</span>
                        <span className="text-lg font-bold text-[#262D3B]">{item.activePatients ?? 0}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-[#787E8C]">Total Admissions</span>
                        <span className="text-lg font-bold text-[#262D3B]">
                            {item.totalAdmissions !== undefined && item.totalAdmissions !== null
                                ? item.totalAdmissions.toLocaleString()
                                : "0"
                            }
                        </span>
                    </div>
                </div>
            </div>

            {/* Edge-to-edge Footer Divider */}
            <div className="border-b border-[#DFE0E2]" />

            {/* Footer action section: View Details Button */}
            <div className="p-5">
                <Button
                    variant="primary"
                    className="!font-normal"
                    size="large"
                    fullWidth
                    leftIcon={<Image src="/icons/Eye.svg" className="brightness-0 invert" alt="" width={16} height={16} />}
                    onClick={() => onViewDetails(item)}
                >
                    View Details
                </Button>
            </div>
        </div>
    );
}

export default function TreatmentPackagesPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearch = useDebounce(searchTerm, 500);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(8);

    // Selected package for detailing popup dialog
    const [selectedPackage, setSelectedPackage] = useState<any>(null);

    // API Query params
    const queryParams = {
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearch.trim() || undefined,
        sortBy: undefined,
        order: "ASC" as const,
        branchId: undefined, // Branch ID can be set if needed
    };

    // Query Hook call
    const { data: apiResponse, isLoading: isPackagesLoading } = useGetTreatmentPackagesQuery(queryParams);

    const metrics = apiResponse?.data?.metrics;
    const listingData = apiResponse?.data?.listing?.data || [];
    const listingTotal = apiResponse?.data?.listing?.total || 0;

    const paginatedList = listingData;
    const totalItems = listingTotal;

    const handleViewDetails = (item: any) => {
        setSelectedPackage(item);
    };

    return (
        <AppShell>
            {/* Page Heading */}
            <div className="flex items-center justify-between">
                <PageHeading title="Treatment Packages" />
            </div>

            {/* Top Stat Cards (packages.svg and patients.svg) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <TreatmentStatCard
                    label="Total Service Portfolio"
                    value={isPackagesLoading ? "..." : `${metrics?.totalPackages ?? 0} Packages`}
                    iconSrc="/icons/packages.svg"
                />
                <TreatmentStatCard
                    label="Active Enrollments"
                    value={isPackagesLoading ? "..." : `${metrics?.activeEnrollments ?? 0} Patients`}
                    iconSrc="/icons/patients.svg"
                />
            </div>

            {/* Table Listing Card carrying the Custom Grid */}
            <div className="mt-0">
                <TableListingCard
                    sections={[
                        {
                            id: "treatment-packages-grid",
                            title: "Treatment Packages",
                            titleRightContent: (
                                <div className="w-[300px]">
                                    <TableSearchInput
                                        value={searchTerm}
                                        onChange={(val) => {
                                            setSearchTerm(val);
                                            setCurrentPage(1);
                                        }}
                                        placeholder="Search..."
                                    />
                                </div>
                            ),
                            emptyMessage: "No treatment packages found",
                            isLoading: isPackagesLoading,
                            customContent: paginatedList.length === 0 ? (
                                <div className="py-16 text-center text-sm font-normal text-[#9FA2AB]">
                                    No treatment packages found
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                                    {paginatedList.map((pkg) => (
                                        <PackageCard
                                            key={pkg.id}
                                            item={pkg}
                                            onViewDetails={handleViewDetails}
                                        />
                                    ))}
                                </div>
                            ),
                            pagination: {
                                currentPage,
                                totalItems,
                                itemsPerPage,
                                onPageChange: setCurrentPage,
                                onItemsPerPageChange: (items: number) => {
                                    setItemsPerPage(items);
                                    setCurrentPage(1);
                                },
                                itemsPerPageOptions: [8, 16, 24, 60],
                            },
                        },
                    ]}
                />
            </div>

            {/* Interactive Premium Details Dialog */}
            <Dialog
                open={!!selectedPackage}
                onClose={() => setSelectedPackage(null)}
                title="Package Details"
                width={600}
            >
                {selectedPackage && (
                    <div className="flex flex-col text-left gap-5">
                        <div className="flex justify-between items-center border-b border-[#DFE0E2] pb-3">
                            <h3 className="font-extrabold text-lg text-[#262D3B]">{selectedPackage.packageName}</h3>
                            <Badge variant="success" className="bg-transparent border border-[#0B8C0033] text-[#0B8C00] px-3 py-1 font-normal rounded-full text-xs">
                                {selectedPackage.category || "Standard"}
                            </Badge>
                        </div>
                        <div className="flex flex-col gap-2">
                            <span className="text-xs font-semibold text-[#787E8C] uppercase tracking-wider">Description</span>
                            <p className="text-sm font-medium text-[#4B5563] leading-relaxed">
                                {selectedPackage.description || "Specialized therapeutic package designed for optimized inpatient or outpatient recovery, routine wellness check-ups, and holistic medical care."}
                            </p>
                        </div>
                        <div className="grid grid-cols-3 gap-3 border-t border-[#DFE0E2] pt-4">
                            <div className="flex flex-col gap-1 bg-[#F9FAFB] p-2.5 rounded-lg border border-[#E5E7EB]">
                                <span className="text-[10px] font-bold text-[#6B7280] uppercase">Cost / Day</span>
                                <span className="text-sm font-extrabold text-[#0B8C00]">{selectedPackage.totalPerDayCost || "₹0"}</span>
                            </div>
                            <div className="flex flex-col gap-1 bg-[#F9FAFB] p-2.5 rounded-lg border border-[#E5E7EB]">
                                <span className="text-[10px] font-bold text-[#6B7280] uppercase">Active</span>
                                <span className="text-sm font-extrabold text-[#111827]">{selectedPackage.activePatients ?? 0} Patients</span>
                            </div>
                            <div className="flex flex-col gap-1 bg-[#F9FAFB] p-2.5 rounded-lg border border-[#E5E7EB]">
                                <span className="text-[10px] font-bold text-[#6B7280] uppercase">Admissions</span>
                                <span className="text-sm font-extrabold text-[#111827]">
                                    {selectedPackage.totalAdmissions !== undefined && selectedPackage.totalAdmissions !== null
                                        ? selectedPackage.totalAdmissions.toLocaleString()
                                        : "0"
                                    }
                                </span>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-4">
                            <Button
                                variant="primary"
                                onClick={() => setSelectedPackage(null)}
                                className="px-6"
                            >
                                Done
                            </Button>
                        </div>
                    </div>
                )}
            </Dialog>
        </AppShell>
    );
}

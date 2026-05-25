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
    MessageDialog,
} from "@/components/ui";
import { useDebounce } from "@/hooks/useDebounce";

// Static mock data representing treatment packages matching Figma mockup
const STATIC_TREATMENT_PACKAGES = [
    {
        id: 1,
        name: "Cardiac Platinum",
        category: "Critical Care",
        perDayCost: 18500,
        progress: 75,
        activePatients: 24,
        totalAdmissions: 1240,
        iconSrc: "/icons/cardiacPlatinumIcon.svg",
        description: "Comprehensive critical care package for advanced cardiovascular treatment, including round-the-clock ICU support, high-dependency care, and expert cardiologist supervision.",
    },
    {
        id: 2,
        name: "Cardiac Gold",
        category: "Surgical",
        perDayCost: 12200,
        progress: 50,
        activePatients: 42,
        totalAdmissions: 3110,
        iconSrc: "/icons/cardiacGoldIcon.svg",
        description: "Specialized surgical package for invasive coronary treatments, covering operation theater fees, post-operative ward care, and dedicated nurse fees.",
    },
    {
        id: 3,
        name: "Cardiac Silver",
        category: "Standard",
        perDayCost: 8500,
        progress: 65,
        activePatients: 18,
        totalAdmissions: 5820,
        iconSrc: "/icons/cardiacSilverIcon.svg",
        description: "Standard ward cardiovascular recovery package designed for non-invasive treatments, routine heart checks, and basic therapeutic maintenance.",
    },
    {
        id: 4,
        name: "Neonatal Elite",
        category: "Pediatric",
        perDayCost: 15000,
        progress: 80,
        activePatients: 12,
        totalAdmissions: 840,
        iconSrc: "/icons/neonatalEliteIcon.svg",
        description: "State-of-the-art neonatal care with advanced incubators, phototherapy units, specialized pediatric nursing, and dedicated pediatric consultants.",
    },
    {
        id: 5,
        name: "Neuro-Recovery",
        category: "Rehabilitation",
        perDayCost: 9800,
        progress: 45,
        activePatients: 24,
        totalAdmissions: 1240,
        iconSrc: "/icons/neuroRecoveryIcon.svg",
        description: "Comprehensive neuro-rehabilitation services designed to restore motor skills, improve cognitive functions, and enhance quality of life post-stroke or surgery.",
    },
    {
        id: 6,
        name: "Oncology Daycare",
        category: "Executive",
        perDayCost: 6400,
        progress: 30,
        activePatients: 56,
        totalAdmissions: 8900,
        iconSrc: "/icons/oncologyDaycareIcon.svg",
        description: "Outpatient oncology and chemotherapy daycare suite, offering executive lounge access, customized diet plans, and highly qualified nursing assistance.",
    },
];

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
    item: typeof STATIC_TREATMENT_PACKAGES[0];
    onViewDetails: (item: any) => void;
}

function PackageCard({ item, onViewDetails }: PackageCardProps) {
    return (
        <div className="w-full flex flex-col rounded-[20px] border border-[#DFE0E2] bg-white shadow-sm hover:shadow-md hover:border-[#CBD5E1] transition-all duration-200 select-none">
            {/* Header section: Title, Icon and Category Badge */}
            <div className="p-5 flex justify-between items-center gap-3">
                <div className="flex items-center gap-3 truncate">
                    <PackageIcon src={item.iconSrc} alt={item.name} />
                    <h4 className="font-bold text-base text-[#262D3B] truncate leading-[130%]" title={item.name}>
                        {item.name}
                    </h4>
                </div>
                <Badge
                    variant="success"
                    className="bg-transparent border border-[#0B8C0033] text-[#0B8C00] px-3 py-1 font-normal rounded-full text-xs whitespace-nowrap"
                >
                    {item.category}
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
                            ₹{item.perDayCost.toLocaleString()}
                        </span>
                    </div>
                    {/* Horizontal Progress Bar */}
                    <div className="h-1.5 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[#0B8C00] rounded-full transition-all duration-500"
                            style={{ width: `${item.progress}%` }}
                        />
                    </div>
                </div>

                {/* Active Patients & Total Admissions */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-[#787E8C]">Active Patients</span>
                        <span className="text-lg font-bold text-[#262D3B]">{item.activePatients}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-[#787E8C]">Total Admissions</span>
                        <span className="text-lg font-bold text-[#262D3B]">{item.totalAdmissions.toLocaleString()}</span>
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
    const [selectedPackage, setSelectedPackage] = useState<typeof STATIC_TREATMENT_PACKAGES[0] | null>(null);

    // Client-side dynamic search filtering
    const filteredList = useMemo(() => {
        const query = debouncedSearch.trim().toLowerCase();
        if (!query) return STATIC_TREATMENT_PACKAGES;
        return STATIC_TREATMENT_PACKAGES.filter(
            (item) =>
                item.name.toLowerCase().includes(query) ||
                item.category.toLowerCase().includes(query) ||
                item.description.toLowerCase().includes(query)
        );
    }, [debouncedSearch]);

    const totalItems = filteredList.length;

    const paginatedList = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredList.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredList, currentPage, itemsPerPage]);

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
                    value="12 Packages"
                    iconSrc="/icons/packages.svg"
                />
                <TreatmentStatCard
                    label="Active Enrollments"
                    value="342 Patients"
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
                                        onChange={setSearchTerm}
                                        placeholder="Search..."
                                    />
                                </div>
                            ),
                            emptyMessage: "No treatment packages found",
                            isLoading: false,
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
                                            onViewDetails={setSelectedPackage}
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
            <MessageDialog
                open={!!selectedPackage}
                onClose={() => setSelectedPackage(null)}
                icon="/icons/SuccessCheck.svg"
                iconBgColor="#E8F5E9"
                message={
                    selectedPackage && (
                        <div className="flex flex-col text-left gap-4">
                            <div className="flex justify-between items-center border-b border-[#DFE0E2] pb-3">
                                <h3 className="font-extrabold text-lg text-[#262D3B]">{selectedPackage.name}</h3>
                                <Badge variant="success" className="bg-transparent border border-[#0B8C0033] text-[#0B8C00] px-3 py-1 font-normal rounded-full text-xs">
                                    {selectedPackage.category}
                                </Badge>
                            </div>
                            <div className="flex flex-col gap-2">
                                <span className="text-xs font-semibold text-[#787E8C] uppercase tracking-wider">Description</span>
                                <p className="text-sm font-medium text-[#4B5563] leading-relaxed">
                                    {selectedPackage.description}
                                </p>
                            </div>
                            <div className="grid grid-cols-3 gap-3 border-t border-[#DFE0E2] pt-4">
                                <div className="flex flex-col gap-1 bg-[#F9FAFB] p-2.5 rounded-lg border border-[#E5E7EB]">
                                    <span className="text-[10px] font-bold text-[#6B7280] uppercase">Cost / Day</span>
                                    <span className="text-sm font-extrabold text-[#0B8C00]">₹{selectedPackage.perDayCost.toLocaleString()}</span>
                                </div>
                                <div className="flex flex-col gap-1 bg-[#F9FAFB] p-2.5 rounded-lg border border-[#E5E7EB]">
                                    <span className="text-[10px] font-bold text-[#6B7280] uppercase">Active</span>
                                    <span className="text-sm font-extrabold text-[#111827]">{selectedPackage.activePatients} Patients</span>
                                </div>
                                <div className="flex flex-col gap-1 bg-[#F9FAFB] p-2.5 rounded-lg border border-[#E5E7EB]">
                                    <span className="text-[10px] font-bold text-[#6B7280] uppercase">Admissions</span>
                                    <span className="text-sm font-extrabold text-[#111827]">{selectedPackage.totalAdmissions.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    )
                }
                confirmText="Done"
                showCancel={false}
                onConfirm={() => setSelectedPackage(null)}
            />
        </AppShell>
    );
}

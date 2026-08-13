"use client";

import Image from "next/image";
import { useState, useEffect, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
    TableSearchInput,
    TableListingCard,
    Tooltip,
    FormSelectField,
} from "@/components/ui";
import { useGetCounsellorAllPackagesQuery } from "@/store/api/counsellorApi";
import { useGetPanelsQuery } from "@/store/api/settingsApi";
import { useCounsellorResolvedBranchId } from "@/hooks/useBranchFilter";
import { useDebounce } from "@/hooks/useDebounce";
import type { SelectOption } from "@/components/ui/FormSelectField";
import { formatIndianAmount } from "@/store/utils/formatIndianAmount";

// ─── Package Card Component ───────────────────────────────────────────────────
type PackageListCardProps = {
    item: any;
};

function PackageListCard({ item }: PackageListCardProps) {
    const roomRent = item.branchRoomType?.roomRentPrice ? Number(item.branchRoomType.roomRentPrice) : 0;
    const medicine = item.medicineEnabled ? Number(item.medicinePrice) : 0;
    const meals = item.mealsEnabled ? Number(item.mealsPrice) : 0;
    const doctor = item.doctorFeeEnabled ? Number(item.doctorFeePrice) : 0;
    const nurse = item.nurseFeeEnabled ? Number(item.nurseFeePrice) : 0;
    const attendant = item.attendantFeeEnabled ? Number(item.attendantFeePrice) : 0;
    const therapy = item.therapyEnabled ? Number(item.therapyPrice) : 0;
    const totalPrice = roomRent + medicine + meals + doctor + nurse + attendant + therapy;

    const isPremium = item.packageName?.toLowerCase().includes("premium");

    console.log("itemfdyfgys",item)

    return (
        <div className="w-full flex flex-col gap-6 p-5 rounded-[20px] border border-[#DFE0E2] bg-white shadow-sm hover:shadow-md hover:border-[#CBD5E1] transition-all duration-200 select-none">
            {/* Card Header */}
            <div className="border-b border-[#DFE0E2] pb-6 flex justify-between items-center gap-4">
                <h4 className="font-bold text-lg text-[#262D3B] truncate max-w-[70%]" title={item.packageName}>
                    {item.packageName || "N/A"}
                </h4>
                {isPremium && (
                    <span className="bg-[#0B8C0012] text-[#0B8C00] border border-[#0B8C0026] px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                        Recommended
                    </span>
                )}
            </div>
       {/* Scrollable content */}
               <div className="max-h-[260px] custom-scroll overflow-y-auto">

            <div className="flex flex-col border border-[#DFE0E2] rounded-lg overflow-hidden">
                {/* <div className="flex justify-between items-center px-4 py-3 border-b border-[#DFE0E2] text-sm bg-white">
                    <span className="text-[14px] font-normal leading-[120%] tracking-[0px] text-[#434956]">Package Name</span> */}
                    {/* <Tooltip
                        position="top"
                        content={
                            <span className="inline-block w-max whitespace-normal break-words text-left text-inherit">
                                {item.diseaseCategoryType || "N/A"}
                            </span>
                        }
                    > */}
                        {/* <span className="text-[#262D3B] font-bold truncate max-w-[60%] select-none">
                            {item.packageName || "N/A"}
                        </span> */}
                    {/* </Tooltip> */}
                {/* </div> */}
                <div className="flex justify-between items-center px-4 py-3 border-b border-[#DFE0E2] text-sm bg-white">
                    <span className="text-[14px] font-normal leading-[120%] tracking-[0px] text-[#434956]">Room Type Selection</span>
                         <Tooltip
                        position="top"
                        content={
                            <span className="inline-block w-max whitespace-normal break-words text-left text-inherit">
                                {item?.roomType?.name || "N/A"}
                            </span>
                        }
                    >
                    <span className="text-[#262D3B] font-bold uppercase truncate max-w-[60%]">{item?.roomType?.name  || "N/A"}</span>
                       </Tooltip>
                </div>
                <div className="flex justify-between items-center px-4 py-3 border-b border-[#DFE0E2] text-sm bg-white">
                    <span className="text-[14px] font-normal leading-[120%] tracking-[0px] text-[#434956]">Medicine</span>
                    <span className="text-[#262D3B] font-bold">
                        {medicine > 0 ? `₹ ${formatIndianAmount(medicine)}` : "N/A"}
                    </span>
                </div>
                <div className="flex justify-between items-center px-4 py-3 border-b border-[#DFE0E2] text-sm bg-white">
                    <span className="text-[14px] font-normal leading-[120%] tracking-[0px] text-[#434956]">Doctor Fees</span>
                    <span className="text-[#262D3B] font-bold">
                        {doctor > 0 ? `₹ ${formatIndianAmount(doctor)}` : "N/A"}
                    </span>
                </div>
                <div className="flex justify-between items-center px-4 py-3 border-b border-[#DFE0E2] text-sm bg-white">
                    <span className="text-[14px] font-normal leading-[120%] tracking-[0px] text-[#434956]">Nurse Fees</span>
                    <span className="text-[#262D3B] font-bold">
                        {nurse > 0 ? `₹ ${formatIndianAmount(nurse)}` : "N/A"}
                    </span>
                </div>
      
                  <div className="flex justify-between items-center px-4 py-3 border-b border-[#DFE0E2] text-sm bg-white">
                    <span className="text-[14px] font-normal leading-[120%] tracking-[0px] text-[#434956]">Meals</span>
                    <span className="text-[#262D3B] font-bold">
                        {meals > 0 ? `₹ ${formatIndianAmount(meals)}` : "N/A"}
                    </span>
                </div>
                 <div className="flex justify-between items-center px-4 py-3 border-b border-[#DFE0E2] text-sm bg-white">
                    <span className="text-[14px] font-normal leading-[120%] tracking-[0px] text-[#434956]">Therapy Charges</span>
                    <span className="text-[#262D3B] font-bold">
                        {therapy > 0 ? `₹ ${formatIndianAmount(therapy)}` : "N/A"}
                    </span>
                </div>
                    <div className="flex justify-between items-center px-4 py-3 border-b border-[#DFE0E2] text-sm bg-white">
                    <span className="text-[14px] font-normal leading-[120%] tracking-[0px] text-[#434956]">Attendant Charges</span>
                    <span className="text-[#262D3B] font-bold">
                        {attendant > 0 ? `₹ ${formatIndianAmount(attendant)}` : "N/A"}
                    </span>
                </div>
                    <div className="flex justify-between items-center px-4 py-3 border-b border-[#DFE0E2] text-sm bg-white">
                    <span className="text-[14px] font-normal leading-[120%] tracking-[0px] text-[#434956]">Room Rent</span>
                    <span className="text-[#262D3B] font-bold">
                        {roomRent > 0 ? `₹ ${formatIndianAmount(roomRent)}` : "N/A"}
                    </span>
                </div>
                {/* <div className="flex justify-between items-center px-4 py-3 text-sm bg-white">
                    <span className="text-[14px] font-normal leading-[120%] tracking-[0px] text-[#434956]">Price</span>
                    <span className="text-[#262D3B] font-bold">
                        {roomRent > 0 ? `₹ ${formatIndianAmount(roomRent)}` : "N/A"}
                    </span>
                </div> */}
            </div>
        </div>

            {/* Description Section */}
            <div className="flex flex-col gap-1 items-start">
                <span className="text-sm font-bold text-[#262D3B]">Description</span>
                <Tooltip
                    position="top"
                    content={
                        <span className="inline-block w-max whitespace-normal break-words text-left text-inherit max-w-[300px]">
                            {item.remark || "No description provided."}
                        </span>
                    }
                >
                    <p className="text-xs font-medium text-[#787E8C] leading-relaxed line-clamp-3 cursor-pointer select-none w-fit">
                        {item.remark || "No description provided."}
                    </p>
                </Tooltip>
            </div>

            {/* Total Price Section (Green box, black text) */}
            <div className="h-14 px-4 bg-[#E3EEE1] flex justify-between items-center rounded-lg font-semibold text-sm mt-auto">
                <span className="text-[#262D3B] font-bold">Total Price</span>
                <span className="text-[#262D3B] font-extrabold text-lg">
                    ₹ {formatIndianAmount(totalPrice)}
                </span>
            </div>
        </div>
    );
}

// ─── Main Page Component ──────────────────────────────────────────────────────
export default function CounsellorPackagesPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearch = useDebounce(searchTerm, 500);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10); // 8 items to perfectly render 2 full rows of 4 columns

    const {
        selectedBranchFilter: selectedBranch,
        setSelectedBranchFilter: setSelectedBranch,
        branchFilterOptions: hookBranchFilterOptions,
        isLoadingBranches: isLoadingBranchFilter,
        isBranchFilterDisabled,
        resolvedFilterBranchId,
    } = useCounsellorResolvedBranchId();

    const [selectedPackageTypeFilter, setSelectedPackageTypeFilter] = useState("");
    const [selectedDiseaseCategoryFilter, setSelectedDiseaseCategoryFilter] = useState("");
    const [selectedPanel, setSelectedPanel] = useState("");

    const { data: filterPanelsRes, isLoading: isLoadingFilterPanels } = useGetPanelsQuery(
        resolvedFilterBranchId != null ? { page: 1, limit: 100, branchId: resolvedFilterBranchId } : undefined,
        { skip: resolvedFilterBranchId == null }
    );

    const filterPanelOptions: SelectOption[] = useMemo(() => {
        if (!filterPanelsRes?.success || !Array.isArray(filterPanelsRes.data)) return [];
        return [
            { value: "", label: "All Panels" },
            ...filterPanelsRes.data
                .filter((p) => p.status === "active" || p.status === "Active")
                .map((p) => ({ value: String(p.id), label: p.name })),
        ];
    }, [filterPanelsRes]);

    useEffect(() => {
        if (!selectedBranch) {
            setSelectedPanel("");
        }
    }, [selectedBranch]);

    // Reset page when search or filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, selectedBranch, selectedPackageTypeFilter, selectedDiseaseCategoryFilter, selectedPanel]);

    // Active query parameters (displays active packages)
    const getAllPackagesParams = {
        page: currentPage,
        limit: itemsPerPage,
        sortBy: "",
        order: "ASC" as const,
        search: debouncedSearch.trim() || undefined,
        branchId: resolvedFilterBranchId,
        packageType: selectedPackageTypeFilter || undefined,
        diseaseCategoryType: selectedDiseaseCategoryFilter || undefined,
        panelId: selectedPanel ? Number.parseInt(selectedPanel, 10) : undefined,
        isPackageActive: true,
    };

    const { data: packagesRes, isLoading: isPackagesLoading, isError: isPackagesError, error: packagesQueryError } = useGetCounsellorAllPackagesQuery(getAllPackagesParams,  {
    skip: resolvedFilterBranchId == null,
    refetchOnMountOrArgChange: true,
  });
    const currentList = packagesRes?.data || [];
    const totalItems = packagesRes?.total || 0;



    return (
        <AppShell>
            {/* Page Heading */}
            <div className="flex items-center justify-between">
                <PageHeading title="Packages" />
            </div>

            {/* Packages Custom Card Grid inside TableListingCard */}
            <div className="mt-0">
                <TableListingCard
                    sections={[
                        {
                            id: "packages-list",
                            title: "Packages",
                            titleRightContent: (
                                <div className="flex flex-wrap items-center gap-3">
                                    <FormSelectField
                                        label=""
                                        hideLabel
                                        options={hookBranchFilterOptions}
                                        value={selectedBranch}
                                        onChange={(value) => {
                                            setSelectedBranch(Array.isArray(value) ? value[0] : value || "");
                                        }}
                                        placeholder={isLoadingBranchFilter ? "Loading branches..." : "Select Branch"}
                                        mode="single"
                                        background="normal"
                                        width={280}
                                        disabled={isBranchFilterDisabled || isLoadingBranchFilter}
                                    />
                                    <FormSelectField
                                        label=""
                                        hideLabel
                                        options={filterPanelOptions}
                                        value={selectedPanel}
                                        onChange={(value) => {
                                            setSelectedPanel(Array.isArray(value) ? value[0] : value || "");
                                        }}
                                        placeholder={
                                            !selectedBranch
                                                ? "Select Branch First"
                                                : isLoadingFilterPanels
                                                  ? "Loading Panels..."
                                                  : "Select Panel"
                                        }
                                        mode="single"
                                        background="normal"
                                        width={280}
                                        disabled={!selectedBranch || isLoadingFilterPanels}
                                    />
                                    <FormSelectField
                                        label=""
                                        hideLabel
                                        options={[
                                            { value: "", label: "All Types" },
                                            { value: "ipd", label: "IPD" },
                                            { value: "daycare", label: "DayCare" },
                                        ]}
                                        value={selectedPackageTypeFilter}
                                        onChange={(value) => {
                                            setSelectedPackageTypeFilter(Array.isArray(value) ? value[0] : value || "");
                                        }}
                                        placeholder="Package Type"
                                        mode="single"
                                        background="normal"
                                        width={280}
                                    />
                                    <FormSelectField
                                        label=""
                                        hideLabel
                                        options={[
                                            { value: "", label: "All Categories" },
                                            { value: "ckd", label: "CKD" },
                                            { value: "others", label: "Others" },
                                        ]}
                                        value={selectedDiseaseCategoryFilter}
                                        onChange={(value) => {
                                            setSelectedDiseaseCategoryFilter(Array.isArray(value) ? value[0] : value || "");
                                        }}
                                        placeholder="Disease Category"
                                        mode="single"
                                        background="normal"
                                        width={280}
                                    />
                                    <TableSearchInput
                                        value={searchTerm}
                                        onChange={setSearchTerm}
                                        placeholder="Search Here..."
                                        className="!w-[280px] min-w-[280px] max-w-[280px] shrink-0"
                                    />
                                </div>
                            ),

                            isError: isPackagesError,
                            errorMessage: "Facing server API error",
                            isLoading: isPackagesLoading,
                            emptyMessage: "No packages found",
                            customContent: currentList.length === 0 ? (
                                <div className="py-12 text-center text-sm font-normal leading-[120%] text-[#9FA2AB]">
                                    No packages found
                                </div>
                            ) : (
                                <div className="grid grid-cols-4 gap-6 mb-6">
                                    {currentList.map((item, index) => (
                                        <PackageListCard key={item.id || index} item={item} />
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
                                itemsPerPageOptions: [10, 30, 50, 100],
                            },
                        },
                    ]}
                />
            </div>
        </AppShell>
    );
}

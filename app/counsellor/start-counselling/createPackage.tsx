"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import {
    Tabs,
    Toggle,
    Tooltip,
    FormInputField,
    FormSelectField,
    Button,
    Badge,
    Pagination,
    SpinnerLoader,
    Dialog,
} from "@/components/ui";
import {
    useGetCounsellorAllPackagesQuery,
    useGetActiveOfferListQuery,
    type ActiveOfferItem,
} from "@/store/api/counsellorApi";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import type { OfferPromotionType, PackageItem } from "@/store/api/settingsApi";
import AddressDetails, { type AddressFormData } from "@/components/forms/AddressDetails";

export interface AttendantDetailsFormData {
    attendantName: string;
    gender: string;
    phoneNumber: string;
    emailId: string;
    relationWithPatient: string;
    address: AddressFormData;
}

const EMPTY_ATTENDANT_ADDRESS: AddressFormData = {
    pinCode: "",
    country: "",
    state: "",
    city: "",
    tehsil: "",
    area: "",
    address: "",
};

const EMPTY_ATTENDANT_FORM: AttendantDetailsFormData = {
    attendantName: "",
    gender: "",
    phoneNumber: "",
    emailId: "",
    relationWithPatient: "",
    address: { ...EMPTY_ATTENDANT_ADDRESS },
};

const ATTENDANT_GENDER_OPTIONS = [
    { label: "Male", value: "Male" },
    { label: "Female", value: "Female" },
    { label: "Other", value: "Other" },
];

const ATTENDANT_RELATION_OPTIONS = [
    { label: "Father", value: "Father" },
    { label: "Mother", value: "Mother" },
    { label: "Spouse", value: "Spouse" },
    { label: "Son", value: "Son" },
    { label: "Daughter", value: "Daughter" },
    { label: "Brother", value: "Brother" },
    { label: "Sister", value: "Sister" },
    { label: "Other", value: "Other" },
];

// ─── CONSTANTS & TYPES ────────────────────────────────────────────────────────
function mapDiseaseTypeToApi(tab: string): string | undefined {
    if (tab === "ckd") return "ckd";
    if (tab === "other") return "others";
    return undefined;
}

function mapAdmissionTypeToApi(tab: string): string | undefined {
    if (tab === "ipd") return "ipd";
    if (tab === "day_care") return "daycare";
    return undefined;
}

function getPackageTotalPrice(item: PackageItem): number {
    const roomRent = item.branchRoomType?.roomRentPrice ? Number(item.branchRoomType.roomRentPrice) : 0;
    const medicine = item.medicineEnabled ? Number(item.medicinePrice) : 0;
    const meals = item.mealsEnabled ? Number(item.mealsPrice) : 0;
    const doctor = item.doctorFeeEnabled ? Number(item.doctorFeePrice) : 0;
    const nurse = item.nurseFeeEnabled ? Number(item.nurseFeePrice) : 0;
    const attendant = item.attendantFeeEnabled ? Number(item.attendantFeePrice) : 0;
    const therapy = item.therapyEnabled ? Number(item.therapyPrice) : 0;
    return roomRent + medicine + meals + doctor + nurse + attendant + therapy;
}

interface OfferItem {
    id: string;
    badge: string;
    isRecommended: boolean;
    title: string;
    subtitle: string;
    bonusValue: number;
    appliedDiscount: number;
    bonusLabel: string;
}

function mapOfferTabToPromotionType(tab: string): OfferPromotionType {
    if (tab === "flat") return "flat_discount";
    if (tab === "conditional") return "conditional_billing";
    return "bundled_stay";
}

function mapPatientCategoryToPanelName(category: string): string | undefined {
    const panelMap: Record<string, string> = {
        normal: "normal",
        panel: "panel",
        tpa: "tpa",
    };
    return panelMap[category];
}

function buildOfferSubtitle(offer: ActiveOfferItem): string {
    if (offer.promotionType === "bundled_stay") {
        return `Pay for ${offer.bundledStayDuration ?? 0} days, get ${offer.bundledFreeDays ?? 0} complimentary day(s). Applies to base room charges.`;
    }
    if (offer.promotionType === "flat_discount") {
        return `Flat ${offer.flatDiscountPercentage ?? 0}% discount on total package pricing. Applicable to all services.`;
    }
    return `Minimum billing of ₹ ${(offer.condMinBillingAmount ?? 0).toLocaleString()}. Discount up to ₹ ${(offer.condMaxDiscountCap ?? 0).toLocaleString()}.`;
}

function getOfferBadge(offer: ActiveOfferItem, numberOfDays: number) {
    if (offer.promotionType === "bundled_stay") {
        const duration = offer.bundledStayDuration ?? 0;
        if (numberOfDays >= duration) {
            return { badge: `RECOMMENDED FOR ${duration}+ DAYS`, isRecommended: true };
        }
        return { badge: "LONG TERM RECOVERY", isRecommended: false };
    }
    if (offer.promotionType === "flat_discount") {
        return { badge: "FLAT DISCOUNT", isRecommended: true };
    }
    return { badge: "CONDITIONAL OFFER", isRecommended: true };
}

function calculateOfferAmounts(
    offer: ActiveOfferItem,
    originalTotal: number,
    numberOfDays: number,
    roomRentPerDay: number
) {
    if (offer.promotionType === "bundled_stay") {
        const duration = offer.bundledStayDuration ?? 0;
        const freeDays = offer.bundledFreeDays ?? 0;
        const bonusValue = numberOfDays >= duration ? freeDays * roomRentPerDay : 0;
        return {
            bonusValue,
            appliedDiscount: 0,
            bonusLabel: `${duration}+${freeDays}`,
        };
    }
    if (offer.promotionType === "flat_discount") {
        const pct = offer.flatDiscountPercentage ?? 0;
        return {
            bonusValue: 0,
            appliedDiscount: Math.round(originalTotal * pct / 100),
            bonusLabel: `Flat ${pct}%`,
        };
    }
    const minBill = offer.condMinBillingAmount ?? 0;
    let appliedDiscount = 0;
    if (originalTotal >= minBill) {
        const discountValue = offer.condDiscountValue ?? 0;
        const maxCap = offer.condMaxDiscountCap ?? discountValue;
        appliedDiscount = Math.min(discountValue, maxCap);
    }
    return { bonusValue: 0, appliedDiscount, bonusLabel: "Conditional" };
}

function mapApiOfferToOfferItem(
    offer: ActiveOfferItem,
    originalTotal: number,
    numberOfDays: number,
    roomRentPerDay: number
): OfferItem {
    const { badge, isRecommended } = getOfferBadge(offer, numberOfDays);
    const amounts = calculateOfferAmounts(offer, originalTotal, numberOfDays, roomRentPerDay);
    return {
        id: String(offer.id),
        badge,
        isRecommended,
        title: offer.offerName,
        subtitle: buildOfferSubtitle(offer),
        ...amounts,
    };
}

const ADMISSION_TYPE_OPTIONS = [
    {
        type: "immediate" as const,
        title: "Immediate",
        description: "Direct admission for urgent procedures"
    },
    {
        type: "scheduled" as const,
        title: "Scheduled",
        description: "Pre-planned surgical admission"
    },
    {
        type: "tentative" as const,
        title: "Tentative",
        description: "Waiting list or pending approval"
    }
];

// ─── HELPER CARD COMPONENTS ──────────────────────────────────────────────────
interface PackageListCardProps {
    item: PackageItem;
    isSelected: boolean;
    onSelect: () => void;
}

function PackageListCard({ item, isSelected, onSelect }: PackageListCardProps) {
    const roomRent = item.branchRoomType?.roomRentPrice ? Number(item.branchRoomType.roomRentPrice) : 0;
    const medicine = item.medicineEnabled ? Number(item.medicinePrice) : 0;
    const meals = item.mealsEnabled ? Number(item.mealsPrice) : 0;
    const doctor = item.doctorFeeEnabled ? Number(item.doctorFeePrice) : 0;
    const nurse = item.nurseFeeEnabled ? Number(item.nurseFeePrice) : 0;
    const attendant = item.attendantFeeEnabled ? Number(item.attendantFeePrice) : 0;
    const therapy = item.therapyEnabled ? Number(item.therapyPrice) : 0;
    const totalPrice = roomRent + medicine + meals + doctor + nurse + attendant + therapy;

    const isPremium = item.packageName?.toLowerCase().includes("premium");

    return (
        <div className={`w-full flex flex-col gap-6 p-5 rounded-[20px] border bg-white shadow-sm hover:shadow-md transition-all duration-200 select-none ${isSelected ? "border-[#0B8C00] ring-2 ring-[#0B8C00]/10" : "border-[#DFE0E2] hover:border-[#CBD5E1]"
            }`}>
            {/* Card Header */}
            <div className="border-b border-[#DFE0E2] pb-6 flex justify-between items-center gap-4">
                <h4 className="font-bold text-lg text-[#262D3B] truncate max-w-[70%]" title={item.packageName}>
                    {item.packageName || "N/A"}
                </h4>
                {isPremium && (
                    <Badge variant="success" className="text-xs font-semibold uppercase tracking-wider">
                        Recommended
                    </Badge>
                )}
            </div>

            {/* Details Table */}
            <div className="flex flex-col border border-[#DFE0E2] rounded-lg overflow-hidden">
                <div className="flex justify-between items-center px-4 py-3 border-b border-[#DFE0E2] text-sm bg-white">
                    <span className="text-[#787E8C] font-medium">Branch</span>
                    <Tooltip
                        position="top"
                        content={
                            <span className="inline-block w-max whitespace-normal break-words text-left text-inherit">
                                {item.branchName || "N/A"}
                            </span>
                        }
                    >
                        <span className="text-[#262D3B] font-bold truncate max-w-[60%] cursor-pointer select-none">
                            {item.branchName || "N/A"}
                        </span>
                    </Tooltip>
                </div>
                <div className="flex justify-between items-center px-4 py-3 border-b border-[#DFE0E2] text-sm bg-white">
                    <span className="text-[#787E8C] font-medium">Disease Category</span>
                    <Tooltip
                        position="top"
                        content={
                            <span className="inline-block w-max whitespace-normal break-words text-left text-inherit">
                                {item.diseaseCategoryType || "N/A"}
                            </span>
                        }
                    >
                        <span className="text-[#262D3B] font-bold truncate max-w-[60%] cursor-pointer select-none">
                            {item.diseaseCategoryType || "N/A"}
                        </span>
                    </Tooltip>
                </div>
                <div className="flex justify-between items-center px-4 py-3 border-b border-[#DFE0E2] text-sm bg-white">
                    <span className="text-[#787E8C] font-medium">Room Type Selection</span>
                    <span className="text-[#262D3B] font-bold uppercase truncate max-w-[60%]">{item.packageType || "N/A"}</span>
                </div>
                <div className="flex justify-between items-center px-4 py-3 border-b border-[#DFE0E2] text-sm bg-white">
                    <span className="text-[#787E8C] font-medium">Medicine</span>
                    <span className="text-[#262D3B] font-bold">
                        {medicine > 0 ? `₹ ${medicine.toLocaleString()}` : "N/A"}
                    </span>
                </div>
                <div className="flex justify-between items-center px-4 py-3 border-b border-[#DFE0E2] text-sm bg-white">
                    <span className="text-[#787E8C] font-medium">Doctor Fees</span>
                    <span className="text-[#262D3B] font-bold">
                        {doctor > 0 ? `₹ ${doctor.toLocaleString()}` : "N/A"}
                    </span>
                </div>
                <div className="flex justify-between items-center px-4 py-3 text-sm bg-white">
                    <span className="text-[#787E8C] font-medium">Price</span>
                    <span className="text-[#262D3B] font-bold">
                        {roomRent > 0 ? `₹ ${roomRent.toLocaleString()}` : "N/A"}
                    </span>
                </div>
            </div>

            {/* Description */}
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

            {/* Total Price Section */}
            <div className="h-14 px-4 bg-[#E3EEE1] flex justify-between items-center rounded-lg font-semibold text-sm mt-auto">
                <span className="text-[#262D3B] font-bold">Total Price</span>
                <span className="text-[#262D3B] font-extrabold text-lg">
                    ₹ {totalPrice.toLocaleString()}
                </span>
            </div>

            {/* Action button */}
            <button
                type="button"
                onClick={onSelect}
                className={`w-full h-11 rounded-[100px] font-bold transition-all duration-200 flex items-center justify-center gap-2 text-sm ${isSelected
                    ? "bg-[#0B8C00] text-white hover:bg-[#097300]"
                    : "border border-[#0B8C00] text-[#0B8C00] bg-white hover:bg-[#F2FAF2]"
                    }`}
            >
                {isSelected ? "Selected Package" : "Select Package >"}
            </button>
        </div>
    );
}

interface OfferCardProps {
    offer: OfferItem;
    isSelected: boolean;
    onClick: () => void;
}

function OfferCard({ offer, isSelected, onClick }: OfferCardProps) {
    const formattedTitle =
        offer.title.charAt(0).toUpperCase() + offer.title.slice(1).toLowerCase();

    return (
        <div
            onClick={onClick}
            className={`relative flex flex-col gap-2.5 p-5 rounded-[16px] cursor-pointer select-none transition-all duration-200 ${
                isSelected
                    ? "border-2 border-[#0B8C00] bg-[#F2FAF2]"
                    : "border border-[#DFE0E2] bg-white hover:border-[#CBD5E1]"
            }`}
        >
            <span
                className={`text-[10px] font-extrabold uppercase tracking-wider ${
                    isSelected ? "text-[#0B8C00]" : "text-[#262D3B]"
                }`}
            >
                {offer.badge}
            </span>

            <h4 className="text-lg font-bold text-[#262D3B] leading-snug">
                {formattedTitle}
            </h4>

            <p className="text-xs font-semibold text-[#787E8C] leading-relaxed">
                {offer.subtitle}
            </p>
        </div>
    );
}

interface AdmissionTypeCardProps {
    type: "immediate" | "scheduled" | "tentative";
    title: string;
    description: string;
    isSelected: boolean;
    onClick: () => void;
}

function AdmissionTypeCard({ type, title, description, isSelected, onClick }: AdmissionTypeCardProps) {
    const renderIcon = () => {
        if (type === "immediate") {
            return (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 2L3 14H12V22L21 10H12L13 2Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            );
        }
        if (type === "scheduled") {
            return (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
                    <path d="M8 2V6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M16 2V6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M3 9H21" stroke="currentColor" strokeWidth="2.5" />
                    <circle cx="7.5" cy="13.5" r="1.25" fill="currentColor" />
                    <circle cx="12" cy="13.5" r="1.25" fill="currentColor" />
                    <circle cx="16.5" cy="13.5" r="1.25" fill="currentColor" />
                    <circle cx="7.5" cy="17.5" r="1.25" fill="currentColor" />
                    <circle cx="12" cy="17.5" r="1.25" fill="currentColor" />
                    <circle cx="16.5" cy="17.5" r="1.25" fill="currentColor" />
                </svg>
            );
        }
        return (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4H8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <rect x="8" y="2" width="8" height="4" rx="1.5" fill="currentColor" />
                <circle cx="16" cy="16" r="5" fill={isSelected ? "#0B8C00" : "#E3EEE1"} stroke="currentColor" strokeWidth="2.5" />
                <path d="M16 13.5V16L18 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    };

    return (
        <div
            onClick={onClick}
            className={`p-6 rounded-[20px] border flex flex-col items-center gap-3 text-center bg-white cursor-pointer transition-all duration-200 ${isSelected
                ? "border-[#0B8C00] bg-[#F2FAF2]/30 ring-2 ring-[#0B8C00]/10 shadow-sm"
                : "border-[#DFE0E2] hover:border-[#CBD5E1]"
                }`}
        >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm transition-all duration-200 ${isSelected ? "bg-[#0B8C00] text-white" : "bg-[#E3EEE1] text-[#0B8C00]"
                }`}>
                {renderIcon()}
            </div>
            <h4 className="font-extrabold text-[#262D3B]">{title}</h4>
            <p className="text-xs font-semibold text-[#787E8C] leading-normal max-w-[200px]">
                {description}
            </p>
        </div>
    );
}

// ─── MAIN CREATE PACKAGE COMPONENT ───────────────────────────────────────────
interface CreatePackageProps {
    selectedPackageId: string;
    setSelectedPackageId: (id: string) => void;
    numberOfDays: number;
    setNumberOfDays: (days: number) => void;
    applyOffer: boolean;
    setApplyOffer: (apply: boolean) => void;
    offerTab: string;
    setOfferTab: (tab: string) => void;
    selectedOfferId: string;
    setSelectedOfferId: (id: string) => void;
    admissionType: string;
    setAdmissionType: (type: string) => void;
    onNext: () => void;
    onCancel?: () => void;
    onViewPatientOverview?: () => void | Promise<void>;
    isViewPatientLoading?: boolean;
    onActivePackageChange?: (pkg: PackageItem | null) => void;
    onFinalAmountPayableChange?: (amount: number) => void;
    onAttendantDetailsChange?: (data: AttendantDetailsFormData | null) => void;
    onCounsellingMetaChange?: (meta: {
        patientCategory: string;
        diseaseType: string;
        packageAdmissionType: string;
        applyOfferLabel: string;
    }) => void;
    getpatientBranchId?: string | number;
}

export default function CreatePackage({
    selectedPackageId,
    setSelectedPackageId,
    numberOfDays,
    setNumberOfDays,
    applyOffer,
    setApplyOffer,
    offerTab,
    setOfferTab,
    selectedOfferId,
    setSelectedOfferId,
    admissionType,
    setAdmissionType,
    onNext,
    onCancel,
    onViewPatientOverview,
    isViewPatientLoading = false,
    onActivePackageChange,
    onFinalAmountPayableChange,
    onAttendantDetailsChange,
    onCounsellingMetaChange,
    getpatientBranchId
}: CreatePackageProps) {
    const [isAttendantsDialogOpen, setIsAttendantsDialogOpen] = useState(false);
    const [attendantDetails, setAttendantDetails] = useState<AttendantDetailsFormData | null>(null);
    const [attendantFormData, setAttendantFormData] = useState<AttendantDetailsFormData>(EMPTY_ATTENDANT_FORM);
    const [attendantFormErrors, setAttendantFormErrors] = useState<Record<string, string>>({});

    // Local step 1 filter states
    const [patientCategory, setPatientCategory] = useState("panel");
    const [diseaseType, setDiseaseType] = useState("other");
    const [admissionFilterType, setAdmissionFilterType] = useState("day_care");
    const [sortBy, setSortBy] = useState("default");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const { filterBranchId } = useBranchFilter();

    useEffect(() => {
        setCurrentPage(1);
    }, [patientCategory, diseaseType, admissionFilterType]);

    const getAllPackagesParams = useMemo(() => ({
        page: currentPage,
        limit: itemsPerPage,
        sortBy: "",
        order: "ASC" as const,
        branchId: filterBranchId,
        packageType: mapAdmissionTypeToApi(admissionFilterType),
        diseaseCategoryType: mapDiseaseTypeToApi(diseaseType),
        isPackageActive: true,
    }), [currentPage, itemsPerPage, filterBranchId, admissionFilterType, diseaseType]);

    const {
        data: packagesRes,
        isLoading: isPackagesLoading,
        isError: isPackagesError,
    } = useGetCounsellorAllPackagesQuery(getAllPackagesParams);

    const packagesList = packagesRes?.data || [];
    const totalPackages = packagesRes?.total || 0;

    const offerListParams = useMemo(() => ({
        page: "",
        limit: "",
        sortBy: "",
        order: "asc" as const,
        // branchId: getpatientBranchId || 2,
        branchId: 2,
        promotionType: mapOfferTabToPromotionType(offerTab),
        panelName: mapPatientCategoryToPanelName(patientCategory),
        // panelName : getpatientName
    }), [offerTab, patientCategory, getpatientBranchId]);

    // console.log("Offer List Params:", getpatientName);

    const {
        data: offersRes,
        isLoading: isOffersLoading,
        isError: isOffersError,
    } = useGetActiveOfferListQuery(offerListParams, { skip: !applyOffer });

    // Options for Custom Tabs Component
    const patientCategoryOptions = [
        { value: "normal", label: "Normal" },
        { value: "panel", label: "Panel" },
        { value: "tpa", label: "TPA" }
    ];

    const diseaseTypeOptions = [
        { value: "ckd", label: "CKD" },
        { value: "other", label: "Other" }
    ];

    const admissionFilterOptions = [
        { value: "ipd", label: "IPD" },
        { value: "day_care", label: "Day Care" }
    ];

    const offerTabOptions = [
        { value: "bundled", label: "Bundled Stay" },
        { value: "flat", label: "Flat Discount" },
        { value: "conditional", label: "Conditional Offer" }
    ];

    // Sorting functionality (client-side on current page results)
    const sortedPackages = useMemo(() => {
        const sorted = [...packagesList];
        if (sortBy === "high-to-low") {
            sorted.sort((a, b) => getPackageTotalPrice(b) - getPackageTotalPrice(a));
        } else if (sortBy === "low-to-high") {
            sorted.sort((a, b) => getPackageTotalPrice(a) - getPackageTotalPrice(b));
        }
        return sorted;
    }, [packagesList, sortBy]);

    useEffect(() => {
        if (sortedPackages.length === 0) return;
        const currentExists = sortedPackages.some((pkg) => String(pkg.id) === selectedPackageId);
        if (!currentExists) {
            setSelectedPackageId(String(sortedPackages[0].id));
        }
    }, [sortedPackages, selectedPackageId, setSelectedPackageId]);

    // Price summary calculations
    const activePackage = useMemo(() => {
        return sortedPackages.find((pkg) => String(pkg.id) === selectedPackageId) || sortedPackages[0] || null;
    }, [sortedPackages, selectedPackageId]);

    useEffect(() => {
        onActivePackageChange?.(activePackage);
    }, [activePackage, onActivePackageChange]);

    const roomRentPerDay = activePackage?.branchRoomType?.roomRentPrice ? Number(activePackage.branchRoomType.roomRentPrice) : 0;
    const medicinePerDay = activePackage?.medicineEnabled ? Number(activePackage.medicinePrice) : 0;
    const mealsPerDay = activePackage?.mealsEnabled ? Number(activePackage.mealsPrice) : 0;
    const doctorFee = activePackage?.doctorFeeEnabled ? Number(activePackage.doctorFeePrice) : 0;
    const nurseFee = activePackage?.nurseFeeEnabled ? Number(activePackage.nurseFeePrice) : 0;
    const attendantFee = activePackage?.attendantFeeEnabled ? Number(activePackage.attendantFeePrice) : 0;
    const therapyFee = activePackage?.therapyEnabled ? Number(activePackage.therapyPrice) : 0;

    const originalTotal = useMemo(() => {
        return (roomRentPerDay + medicinePerDay + mealsPerDay) * numberOfDays + doctorFee + nurseFee + attendantFee + therapyFee;
    }, [roomRentPerDay, medicinePerDay, mealsPerDay, numberOfDays, doctorFee, nurseFee, attendantFee, therapyFee]);

    const activeCategoryOffers = useMemo(() => {
        return (offersRes?.data || []).map((offer) =>
            mapApiOfferToOfferItem(offer, originalTotal, numberOfDays, roomRentPerDay)
        );
    }, [offersRes?.data, originalTotal, numberOfDays, roomRentPerDay]);

    useEffect(() => {
        if (!applyOffer || activeCategoryOffers.length === 0) return;
        const currentExists = activeCategoryOffers.some((offer) => offer.id === selectedOfferId);
        if (!currentExists) {
            setSelectedOfferId(activeCategoryOffers[0].id);
        }
    }, [applyOffer, activeCategoryOffers, selectedOfferId, setSelectedOfferId]);

    const activeOffer = useMemo(() => {
        return activeCategoryOffers.find(off => off.id === selectedOfferId) || activeCategoryOffers[0] || {
            bonusValue: 0,
            appliedDiscount: 0,
            bonusLabel: "N/A"
        };
    }, [activeCategoryOffers, selectedOfferId]);

    const stayBonus = useMemo(() => {
        return applyOffer ? activeOffer.bonusValue : 0;
    }, [applyOffer, activeOffer]);

    const packageAppliedDiscount = useMemo(() => {
        return applyOffer ? activeOffer.appliedDiscount : 0;
    }, [applyOffer, activeOffer]);

    const finalAmountPayable = useMemo(() => {
        return Math.max(0, originalTotal - stayBonus - packageAppliedDiscount);
    }, [originalTotal, stayBonus, packageAppliedDiscount]);

    useEffect(() => {
        onFinalAmountPayableChange?.(finalAmountPayable);
    }, [finalAmountPayable, onFinalAmountPayableChange]);

    useEffect(() => {
        onCounsellingMetaChange?.({
            patientCategory:
                patientCategoryOptions.find((o) => o.value === patientCategory)?.label ?? "N/A",
            diseaseType:
                diseaseTypeOptions.find((o) => o.value === diseaseType)?.label ?? "N/A",
            packageAdmissionType:
                admissionFilterOptions.find((o) => o.value === admissionFilterType)?.label ?? "N/A",
            applyOfferLabel: applyOffer ? activeOffer.title || "Applied" : "Not Applied",
        });
    }, [
        patientCategory,
        diseaseType,
        admissionFilterType,
        applyOffer,
        activeOffer.title,
        onCounsellingMetaChange,
    ]);

    const offerBonusLabel = activeOffer.bonusLabel;

    useEffect(() => {
        if (isAttendantsDialogOpen) {
            setAttendantFormData(attendantDetails ?? EMPTY_ATTENDANT_FORM);
            setAttendantFormErrors({});
        }
    }, [isAttendantsDialogOpen, attendantDetails]);

    const handleAdmissionTypeSelect = (type: typeof ADMISSION_TYPE_OPTIONS[number]["type"]) => {
        setAdmissionType(type);
        if (type === "immediate") {
            setIsAttendantsDialogOpen(true);
        } else {
            setIsAttendantsDialogOpen(false);
        }
    };

    const validateAttendantForm = () => {
        const nextErrors: Record<string, string> = {};

        if (!attendantFormData.attendantName.trim()) {
            nextErrors.attendantName = "Attendant name is required";
        }
        if (!attendantFormData.gender) {
            nextErrors.gender = "Gender is required";
        }
        if (!attendantFormData.phoneNumber.trim()) {
            nextErrors.phoneNumber = "Phone number is required";
        }
        if (!attendantFormData.address.country) {
            nextErrors.country = "Country is required";
        }
        if (!attendantFormData.address.pinCode.trim()) {
            nextErrors.pinCode = "Pin code is required";
        }
        if (!attendantFormData.address.state) {
            nextErrors.state = "State is required";
        }
        if (!attendantFormData.address.city) {
            nextErrors.city = "City is required";
        }
        if (!attendantFormData.address.address.trim()) {
            nextErrors.address = "Address is required";
        }

        setAttendantFormErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleAttendantDetailsSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateAttendantForm()) return;
        setAttendantDetails(attendantFormData);
        onAttendantDetailsChange?.(attendantFormData);
        setIsAttendantsDialogOpen(false);
    };

    const handleAttendantDialogClose = () => {
        setAttendantFormErrors({});
        setIsAttendantsDialogOpen(false);
        if (!attendantDetails) {
            setAdmissionType("");
        }
    };

    return (
        <div className="w-full rounded-[20px] border border-[#E3EEE1] p-3 mt-6">
            {/* 2. THREE FILTERS SECTION */}
            <div className="w-full rounded-[20px] flex flex-wrap items-center gap-8 pb-4">
                {/* Patient Category */}
                <div className="flex flex-col gap-2 min-w-[350px] p-2 rounded-[8px] border border-[#E3EEE1]">
                    <span className="text-xs font-bold text-[#787E8C] uppercase tracking-wider px-1 pt-2">Patient Category</span>
                    <div className="w-[450px] shrink-0">
                        <Tabs
                            options={patientCategoryOptions}
                            value={patientCategory}
                            onChange={(val) => setPatientCategory(val)}
                            className="border-0 !h-full"
                            tabBorder={true}
                        />
                    </div>
                </div>

                {/* Disease Type */}
                <div className="flex flex-col gap-2 min-w-[350px] p-2 rounded-[8px] border border-[#E3EEE1]">
                    <span className="text-xs font-bold text-[#787E8C] uppercase tracking-wider px-1 pt-2">Disease Type</span>
                    <div className="w-[450px] shrink-0">
                        <Tabs
                            options={diseaseTypeOptions}
                            value={diseaseType}
                            onChange={(val) => setDiseaseType(val)}
                            className="border-0 !h-full"
                            tabBorder={true}
                        />
                    </div>
                </div>

                {/* Admission Type */}
                <div className="flex flex-col gap-2 min-w-[350px] p-2 rounded-[8px] border border-[#E3EEE1]">
                    <span className="text-xs font-bold text-[#787E8C] uppercase tracking-wider px-1 pt-2">Patient Type</span>
                    <div className="w-[450px] shrink-0">
                        <Tabs
                            options={admissionFilterOptions}
                            value={admissionFilterType}
                            onChange={(val) => setAdmissionFilterType(val)}
                            className="border-0 !h-full"
                            tabBorder={true}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-[16px]">
                {/* 3. PACKAGES HEADER & LISTING SECTION */}
                <div className="w-full flex flex-col gap-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <h3 className="text-2xl font-bold text-[#262D3B] tracking-tight">Select Package</h3>

                        <div className="flex items-center gap-4 flex-wrap select-none">
                            <Button
                                variant="primary"
                                size="medium"
                                className="!min-w-fit"
                                leftIcon={
                                    isViewPatientLoading ? (
                                        <SpinnerLoader size={16} className="text-white" />
                                    ) : (
                                        <Image
                                            src="/icons/openEye.svg"
                                            alt=""
                                            width={16}
                                            height={16}
                                            style={{ filter: "brightness(0) invert(1)" }}
                                        />
                                    )
                                }
                                onClick={onViewPatientOverview}
                                disabled={isViewPatientLoading}
                            >
                                View Patient Overview
                            </Button>

                            <div className="w-[280px] shrink-0">
                                <FormSelectField
                                    label="Sort By"
                                    hideLabel
                                    options={[
                                        { value: "default", label: "Sort By Price: Default" },
                                        { value: "high-to-low", label: "Sort By Price: High to Low" },
                                        { value: "low-to-high", label: "Sort By Price: Low to High" }
                                    ]}
                                    value={sortBy}
                                    onChange={(val) => setSortBy(Array.isArray(val) ? val[0] : val || "default")}
                                    placeholder="Sort By"
                                    mode="single"
                                    background="normal"
                                />
                            </div>

                            <span className="text-sm font-bold">
                                {totalPackages} Package{totalPackages === 1 ? "" : "s"} available
                            </span>
                        </div>
                    </div>

                    {isPackagesLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <SpinnerLoader size={32} />
                        </div>
                    ) : isPackagesError ? (
                        <div className="py-12 text-center text-sm font-normal leading-[120%] text-[#9FA2AB]">
                            Facing server API error
                        </div>
                    ) : sortedPackages.length === 0 ? (
                        <div className="py-12 text-center text-sm font-normal leading-[120%] text-[#9FA2AB]">
                            No packages found
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {sortedPackages.map((pkg) => (
                                    <PackageListCard
                                        key={pkg.id}
                                        item={pkg}
                                        isSelected={selectedPackageId === String(pkg.id)}
                                        onSelect={() => setSelectedPackageId(String(pkg.id))}
                                    />
                                ))}
                            </div>
                            {totalPackages > itemsPerPage && (
                                <Pagination
                                    currentPage={currentPage}
                                    totalItems={totalPackages}
                                    itemsPerPage={itemsPerPage}
                                    onPageChange={setCurrentPage}
                                    onItemsPerPageChange={(items) => {
                                        setItemsPerPage(items);
                                        setCurrentPage(1);
                                    }}
                                    itemsPerPageOptions={[10, 20, 50, 100]}
                                />
                            )}
                        </>
                    )}
                </div>

                {/* 4. NUMBER OF DAYS INPUT */}
                <div className="w-full bg-white py-6 rounded-[20px] flex flex-col gap-3">
                    <span className="text-xl font-bold text-[#262D3B]">Number of Days</span>
                    <FormInputField
                        label=""
                        type="number"
                        value={numberOfDays}
                        onChange={(e) => setNumberOfDays(Math.max(1, Number(e.target.value)))}
                        height={52}
                    />
                </div>

                {/* 5. APPLY SPECIAL OFFER SECTION */}
                <div className="w-full flex flex-col gap-6">
                    <div className="flex items-center gap-3 select-none">
                        <span className="text-xl font-bold text-[#262D3B]">Apply Special Offer</span>
                        <Toggle
                            checked={applyOffer}
                            onChange={(val) => setApplyOffer(val)}
                            className="!w-10 !h-6"
                            width="w-[16px]"
                            height="h-[16px]"
                            fontsize="text-[12px]"
                            transform={applyOffer ? "!translate-x-[20px]" : undefined}
                        />
                    </div>

                    {applyOffer && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                            <div className="lg:col-span-2 flex flex-col gap-6 bg-white p-6 rounded-[20px] border border-[#DFE0E2] shadow-sm">
                                <div className="w-[600px] shrink-0">
                                    <Tabs
                                        options={offerTabOptions}
                                        value={offerTab}
                                        onChange={(val) => setOfferTab(val)}
                                    />
                                </div>

                                {isOffersLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <SpinnerLoader size={32} />
                                    </div>
                                ) : isOffersError ? (
                                    <div className="py-12 text-center text-sm font-normal leading-[120%] text-[#9FA2AB]">
                                        Facing server API error
                                    </div>
                                ) : activeCategoryOffers.length === 0 ? (
                                    <div className="py-12 text-center text-sm font-normal leading-[120%] text-[#9FA2AB]">
                                        No offers found
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {activeCategoryOffers.map((offer) => (
                                            <OfferCard
                                                key={offer.id}
                                                offer={offer}
                                                isSelected={selectedOfferId === offer.id}
                                                onClick={() => setSelectedOfferId(offer.id)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="w-full rounded-[24px] bg-[#0B8C00] text-white p-7 flex flex-col shadow-md justify-between self-stretch">
                                <div className="flex flex-col">
                                    <div className="flex justify-between items-center border-b border-white pb-4 select-none">
                                        <h3 className="text-2xl font-bold tracking-tight">Price Summary</h3>
                                        <span className="text-xs font-bold uppercase tracking-wider text-white">
                                            {numberOfDays} Days Plan
                                        </span>
                                    </div>

                                    <div className="flex flex-col">
                                        <div className="flex justify-between items-center py-4 border-b border-white text-base">
                                            <span className="font-medium text-white/90">Original Total</span>
                                            <span className="font-bold text-lg">₹ {originalTotal.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-4 border-b border-white text-base">
                                            <span className="font-bold">Stay Duration Bonus({offerBonusLabel})</span>
                                            <span className="font-bold text-lg">- ₹ {stayBonus.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-4 border-b border-white text-base">
                                            <span className="font-bold">Package Applied Discount</span>
                                            <span className="font-bold text-lg">- ₹ {packageAppliedDiscount.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col mt-4">
                                    <div className="flex justify-between items-end py-4 border-b border-white">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs text-white/90 font-medium">Final Amount Payable</span>
                                            <span className="text-2xl font-black leading-none">₹ {finalAmountPayable.toLocaleString()}</span>
                                        </div>
                                        <span className="text-sm font-bold tracking-wide mb-1 select-none">
                                            Tax Included
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={onNext}
                                        className="w-full h-12 bg-white text-[#0B8C00] rounded-full font-bold text-sm hover:bg-opacity-95 hover:scale-[1.005] transition-all duration-200 flex items-center justify-center gap-2 mt-5 shadow-sm select-none"
                                    >
                                        Confirm Selection &gt;
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 6. SELECT ADMISSION TYPE COMPONENT */}
                <div className="w-full flex flex-col gap-4 mt-6">
                    <h3 className="text-xl font-bold text-[#262D3B]">Select Admission Type</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 select-none">
                        {ADMISSION_TYPE_OPTIONS.map((opt) => (
                            <AdmissionTypeCard
                                key={opt.type}
                                type={opt.type}
                                title={opt.title}
                                description={opt.description}
                                isSelected={admissionType === opt.type}
                                onClick={() => handleAdmissionTypeSelect(opt.type)}
                            />
                        ))}
                    </div>
                </div>

                <Dialog
                    open={isAttendantsDialogOpen}
                    onClose={handleAttendantDialogClose}
                    title="Attendants details"
                    width={920}
                    contentPadding="px-6 pb-6 pt-4"
                    contentOverflow="auto"
                >
                    <form onSubmit={handleAttendantDetailsSubmit} className="flex flex-col gap-8 text-left">
                        <div className="flex flex-col gap-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <FormInputField
                                    label="Attendant Name *"
                                    type="text"
                                    placeholder="Attendant Name"
                                    value={attendantFormData.attendantName}
                                    onChange={(e) =>
                                        setAttendantFormData((prev) => ({ ...prev, attendantName: e.target.value }))
                                    }
                                    height={44}
                                />
                                <FormSelectField
                                    label="Gender *"
                                    options={ATTENDANT_GENDER_OPTIONS}
                                    value={attendantFormData.gender || null}
                                    onChange={(val) =>
                                        setAttendantFormData((prev) => ({
                                            ...prev,
                                            gender: Array.isArray(val) ? val[0] : val || "",
                                        }))
                                    }
                                    placeholder="Gender"
                                    mode="single"
                                    background="white"
                                />
                                <FormInputField
                                    label="Phone Number *"
                                    type="text"
                                    placeholder="Phone Number"
                                    value={attendantFormData.phoneNumber}
                                    onChange={(e) =>
                                        setAttendantFormData((prev) => ({ ...prev, phoneNumber: e.target.value }))
                                    }
                                    height={44}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormInputField
                                    label="Email ID"
                                    type="email"
                                    placeholder="Email ID"
                                    value={attendantFormData.emailId}
                                    onChange={(e) =>
                                        setAttendantFormData((prev) => ({ ...prev, emailId: e.target.value }))
                                    }
                                    height={44}
                                />
                                <FormSelectField
                                    label="Relation with Patient"
                                    options={ATTENDANT_RELATION_OPTIONS}
                                    value={attendantFormData.relationWithPatient || null}
                                    onChange={(val) =>
                                        setAttendantFormData((prev) => ({
                                            ...prev,
                                            relationWithPatient: Array.isArray(val) ? val[0] : val || "",
                                        }))
                                    }
                                    placeholder="Relation with Patient"
                                    mode="single"
                                    background="white"
                                />
                            </div>

                            {(attendantFormErrors.attendantName || attendantFormErrors.gender || attendantFormErrors.phoneNumber) && (
                                <div className="flex flex-col gap-1">
                                    {attendantFormErrors.attendantName && (
                                        <p className="text-xs text-[#F6776E]">{attendantFormErrors.attendantName}</p>
                                    )}
                                    {attendantFormErrors.gender && (
                                        <p className="text-xs text-[#F6776E]">{attendantFormErrors.gender}</p>
                                    )}
                                    {attendantFormErrors.phoneNumber && (
                                        <p className="text-xs text-[#F6776E]">{attendantFormErrors.phoneNumber}</p>
                                    )}
                                </div>
                            )}
                        </div>

                        <AddressDetails
                            title="Address Information"
                            nationality="Indian"
                            formData={attendantFormData.address}
                            onChange={(field, value) =>
                                setAttendantFormData((prev) => ({
                                    ...prev,
                                    address: { ...prev.address, [field]: value },
                                }))
                            }
                            errors={{
                                country: attendantFormErrors.country,
                                pinCode: attendantFormErrors.pinCode,
                                state: attendantFormErrors.state,
                                city: attendantFormErrors.city,
                                address: attendantFormErrors.address,
                            }}
                        />

                        <div className="flex flex-wrap items-center gap-3 pt-2">
                            <Button type="submit" variant="primary">
                                Next
                            </Button>
                            <Button type="button" variant="outline" onClick={handleAttendantDialogClose}>
                                Cancel
                            </Button>
                        </div>
                    </form>
                </Dialog>

                {/* 7. BOTTOM ACTION NAVIGATION FOOTER */}
                <div className="w-full flex items-center justify-end gap-4 pt-6 mt-4 select-none">
                    <Button
                        type="button"
                        variant="outline"
                        className="!border-[#DFE0E2] !text-[#434956] hover:!bg-gray-50 !shadow-sm"
                        onClick={onCancel}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="primary"
                        rightIcon={<span>➔</span>}
                        onClick={onNext}
                    >
                        Next: Basic Information
                    </Button>
                </div>
            </div>
        </div>
    );
}

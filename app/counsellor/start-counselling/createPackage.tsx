"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import {
    Tabs,
    Toggle,
    Tooltip,
    FormInputField,
    FormSelectField,
    Button,
    Badge,
} from "@/components/ui";

// ─── CONSTANTS & TYPES ────────────────────────────────────────────────────────
interface PackageItem {
    id: string;
    packageName: string;
    diseaseCategoryType: string;
    packageType: string;
    branchName: string;
    remark: string;
    medicineEnabled: boolean;
    medicinePrice: number;
    mealsEnabled: boolean;
    mealsPrice: number;
    doctorFeeEnabled: boolean;
    doctorFeePrice: number;
    nurseFeeEnabled: boolean;
    nurseFeePrice: number;
    attendantFeeEnabled: boolean;
    attendantFeePrice: number;
    therapyEnabled: boolean;
    therapyPrice: number;
    branchRoomType: { roomRentPrice: number };
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

const MOCK_PACKAGES: PackageItem[] = [
    {
        id: "pkg-1",
        packageName: "Cardiac Premium Care",
        diseaseCategoryType: "Cardiology",
        packageType: "IPD",
        branchName: "HIIMS Dera Bassi",
        remark: "Comprehensive premium recovery package including private suite room stay, daily specialty doctor consultations, medicine charges, full nursing support, customized meal plans, and daily physiotherapy sessions.",
        medicineEnabled: true,
        medicinePrice: 2500,
        mealsEnabled: true,
        mealsPrice: 1500,
        doctorFeeEnabled: true,
        doctorFeePrice: 3000,
        nurseFeeEnabled: true,
        nurseFeePrice: 2500,
        attendantFeeEnabled: true,
        attendantFeePrice: 2500,
        therapyEnabled: true,
        therapyPrice: 3000,
        branchRoomType: { roomRentPrice: 1500 }
    },
    {
        id: "pkg-2",
        packageName: "Cardiac Standard",
        diseaseCategoryType: "Cardiology",
        packageType: "IPD",
        branchName: "HIIMS Dera Bassi",
        remark: "Standard cardiac care package with semi-private room stay, essential medicine coverage, meals, standard nursing care, and doctor visits included.",
        medicineEnabled: true,
        medicinePrice: 2000,
        mealsEnabled: true,
        mealsPrice: 1000,
        doctorFeeEnabled: true,
        doctorFeePrice: 2000,
        nurseFeeEnabled: true,
        nurseFeePrice: 1500,
        attendantFeeEnabled: true,
        attendantFeePrice: 1500,
        therapyEnabled: true,
        therapyPrice: 2000,
        branchRoomType: { roomRentPrice: 1000 }
    },
    {
        id: "pkg-3",
        packageName: "Cardiac Advanced Care",
        diseaseCategoryType: "Cardiology",
        packageType: "IPD",
        branchName: "HIIMS Dera Bassi",
        remark: "Advanced rehabilitation and recovery package featuring deluxe suite stay, high-frequency physical therapy, senior physician consultations, and premium amenities.",
        medicineEnabled: true,
        medicinePrice: 3500,
        mealsEnabled: true,
        mealsPrice: 2000,
        doctorFeeEnabled: true,
        doctorFeePrice: 4000,
        nurseFeeEnabled: true,
        nurseFeePrice: 3000,
        attendantFeeEnabled: true,
        attendantFeePrice: 3000,
        therapyEnabled: true,
        therapyPrice: 4000,
        branchRoomType: { roomRentPrice: 2000 }
    },
    {
        id: "pkg-4",
        packageName: "Cardiac Basic Care",
        diseaseCategoryType: "Cardiology",
        packageType: "IPD",
        branchName: "HIIMS Dera Bassi",
        remark: "Basic cardiac care package with general ward accommodation, essential medication support, meals, and routine nursing visits.",
        medicineEnabled: true,
        medicinePrice: 1500,
        mealsEnabled: true,
        mealsPrice: 800,
        doctorFeeEnabled: true,
        doctorFeePrice: 1500,
        nurseFeeEnabled: true,
        nurseFeePrice: 1000,
        attendantFeeEnabled: true,
        attendantFeePrice: 1000,
        therapyEnabled: true,
        therapyPrice: 1000,
        branchRoomType: { roomRentPrice: 700 }
    }
];

const MOCK_OFFERS: Record<string, OfferItem[]> = {
    bundled: [
        {
            id: "off-b1",
            badge: "RECOMMENDED FOR 7+ DAYS",
            isRecommended: true,
            title: "7 + 1 Free Stay",
            subtitle: "Pay for 7 days, get the 8th day stay complimentary. Applies to base room charges.",
            bonusValue: 15000,
            appliedDiscount: 4500,
            bonusLabel: "7+1"
        },
        {
            id: "off-b2",
            badge: "LONG TERM RECOVERY",
            isRecommended: false,
            title: "10 + 2 Free Stay",
            subtitle: "Complimentary 11th & 12th nights on staying for 10 nights. Best for post-op rehab.",
            bonusValue: 30000,
            appliedDiscount: 9000,
            bonusLabel: "10+2"
        },
        {
            id: "off-b3",
            badge: "LONG TERM RECOVERY",
            isRecommended: false,
            title: "10 + 2 Free Stay",
            subtitle: "Complimentary 11th & 12th nights on staying for 10 nights. Best for post-op rehab.",
            bonusValue: 30000,
            appliedDiscount: 9000,
            bonusLabel: "10+2"
        },
        {
            id: "off-b4",
            badge: "LONG TERM RECOVERY",
            isRecommended: false,
            title: "10 + 2 Free Stay",
            subtitle: "Complimentary 11th & 12th nights on staying for 10 nights. Best for post-op rehab.",
            bonusValue: 30000,
            appliedDiscount: 9000,
            bonusLabel: "10+2"
        }
    ],
    flat: [
        {
            id: "off-f1",
            badge: "LIMITED PERIOD OFFER",
            isRecommended: true,
            title: "Flat 10% Off",
            subtitle: "Flat 10% discount on total package pricing. Applicable to all services.",
            bonusValue: 0,
            appliedDiscount: 10500,
            bonusLabel: "Flat 10%"
        },
        {
            id: "off-f2",
            badge: "FLAT DISCOUNT",
            isRecommended: false,
            title: "Flat 15% Off",
            subtitle: "Special summer wellness package discount of flat 15% off base pricing.",
            bonusValue: 0,
            appliedDiscount: 15750,
            bonusLabel: "Flat 15%"
        }
    ],
    conditional: [
        {
            id: "off-c1",
            badge: "SENIOR CITIZEN SCHEME",
            isRecommended: true,
            title: "Senior Citizen Special",
            subtitle: "Additional 5% concession on all medical therapies and consultations for age 60+.",
            bonusValue: 5000,
            appliedDiscount: 2500,
            bonusLabel: "Senior"
        },
        {
            id: "off-c2",
            badge: "FAMILY CARE DISCOUNT",
            isRecommended: false,
            title: "Family Multi-Consultation",
            subtitle: "Book two or more sibling packages to obtain dynamic referral discount benefits.",
            bonusValue: 8000,
            appliedDiscount: 4000,
            bonusLabel: "Family"
        }
    ]
};

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
    return (
        <div
            onClick={onClick}
            className={`relative flex flex-col gap-3 p-5 rounded-[20px] border bg-white cursor-pointer select-none transition-all duration-200 ${isSelected
                ? "border-[#0B8C00] bg-[#F2FAF2]/30 ring-1 ring-[#0B8C00]/20 shadow-sm"
                : "border-[#DFE0E2] hover:border-[#CBD5E1]"
                }`}
        >
            <Badge
                variant={offer.isRecommended ? "success" : "neutral"}
                className="text-[10px] font-extrabold uppercase tracking-wider w-fit"
            >
                {offer.badge}
            </Badge>
            <h4 className="text-lg font-bold text-[#262D3B]">{offer.title}</h4>
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
    onViewPatientOverview?: () => void;
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
    onViewPatientOverview
}: CreatePackageProps) {
    // Local step 1 filter states
    const [patientCategory, setPatientCategory] = useState("panel");
    const [diseaseType, setDiseaseType] = useState("other");
    const [admissionFilterType, setAdmissionFilterType] = useState("day_care");
    const [sortBy, setSortBy] = useState("default");

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

    // Sorting functionality
    const sortedPackages = useMemo(() => {
        const sorted = [...MOCK_PACKAGES].sort((a, b) => {
            const getSum = (item: PackageItem) => {
                const roomRent = item.branchRoomType?.roomRentPrice ? Number(item.branchRoomType.roomRentPrice) : 0;
                const medicine = item.medicineEnabled ? Number(item.medicinePrice) : 0;
                const meals = item.mealsEnabled ? Number(item.mealsPrice) : 0;
                const doctor = item.doctorFeeEnabled ? Number(item.doctorFeePrice) : 0;
                const nurse = item.nurseFeeEnabled ? Number(item.nurseFeePrice) : 0;
                const attendant = item.attendantFeeEnabled ? Number(item.attendantFeePrice) : 0;
                const therapy = item.therapyEnabled ? Number(item.therapyPrice) : 0;
                return roomRent + medicine + meals + doctor + nurse + attendant + therapy;
            };

            if (sortBy === "high-to-low") {
                return getSum(b) - getSum(a);
            } else if (sortBy === "low-to-high") {
                return getSum(a) - getSum(b);
            }
            return 0; // default order
        });
        return sorted;
    }, [sortBy]);

    // Price summary calculations
    const activePackage = useMemo(() => {
        return MOCK_PACKAGES.find(pkg => pkg.id === selectedPackageId) || MOCK_PACKAGES[0];
    }, [selectedPackageId]);

    const roomRentPerDay = activePackage.branchRoomType?.roomRentPrice ? Number(activePackage.branchRoomType.roomRentPrice) : 0;
    const medicinePerDay = activePackage.medicineEnabled ? Number(activePackage.medicinePrice) : 0;
    const mealsPerDay = activePackage.mealsEnabled ? Number(activePackage.mealsPrice) : 0;
    const doctorFee = activePackage.doctorFeeEnabled ? Number(activePackage.doctorFeePrice) : 0;
    const nurseFee = activePackage.nurseFeeEnabled ? Number(activePackage.nurseFeePrice) : 0;
    const attendantFee = activePackage.attendantFeeEnabled ? Number(activePackage.attendantFeePrice) : 0;
    const therapyFee = activePackage.therapyEnabled ? Number(activePackage.therapyPrice) : 0;

    const originalTotal = useMemo(() => {
        return (roomRentPerDay + medicinePerDay + mealsPerDay) * numberOfDays + doctorFee + nurseFee + attendantFee + therapyFee;
    }, [roomRentPerDay, medicinePerDay, mealsPerDay, numberOfDays, doctorFee, nurseFee, attendantFee, therapyFee]);

    const activeCategoryOffers = useMemo(() => {
        return MOCK_OFFERS[offerTab] || [];
    }, [offerTab]);

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

    const offerBonusLabel = activeOffer.bonusLabel;

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
                    <span className="text-xs font-bold text-[#787E8C] uppercase tracking-wider px-1 pt-2">Admission Type</span>
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
                                    <Image
                                        src="/icons/openEye.svg"
                                        alt=""
                                        width={16}
                                        height={16}
                                        style={{ filter: "brightness(0) invert(1)" }}
                                    />
                                }
                                onClick={onViewPatientOverview}
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
                                {sortedPackages.length} Packages available
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {sortedPackages.map((pkg) => (
                            <PackageListCard
                                key={pkg.id}
                                item={pkg}
                                isSelected={selectedPackageId === pkg.id}
                                onSelect={() => setSelectedPackageId(pkg.id)}
                            />
                        ))}
                    </div>
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
                                        onChange={(val) => {
                                            setOfferTab(val);
                                            const newOffers = MOCK_OFFERS[val] || [];
                                            if (newOffers.length > 0) {
                                                setSelectedOfferId(newOffers[0].id);
                                            }
                                        }}
                                    />
                                </div>

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
                                onClick={() => setAdmissionType(opt.type)}
                            />
                        ))}
                    </div>
                </div>

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

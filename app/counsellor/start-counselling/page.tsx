"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import PaymentDialogDetails from "@/components/registration/PaymentDialogDetails";
import {
    Tabs,
    Toggle,
    Tooltip,
    FormInputField,
    FormSelectField,
    FormTextareaField,
    Button,
    Badge,
    SegmentedToggle,
    BackToPreviousPageButton,
    TableListingCard
} from "@/components/ui";

// ─── TYPES & INTERFACES ──────────────────────────────────────────────────────
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

interface PackageListCardProps {
    item: PackageItem;
    isSelected: boolean;
    onSelect: () => void;
}

// ─── PACKAGE LIST CARD COMPONENT ─────────────────────────────────────────────
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
                    <Badge
                        variant="success"
                        className="text-xs font-semibold uppercase tracking-wider"
                    >
                        Recommended
                    </Badge>
                )}
            </div>

            {/* Card Details (Rectangle shape with border complete) */}
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
                    <span className="text-[#787E8C] font-medium">Package Name</span>
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
                    ₹ {totalPrice.toLocaleString()}
                </span>
            </div>

            {/* Select / Selected Button */}
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

// ─── ADMISSION TYPE CARD COMPONENT ───────────────────────────────────────────
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
        // tentative
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

// ─── OFFER CARD COMPONENT ────────────────────────────────────────────────────
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
            {/* Offer recommended pill */}
            <Badge
                variant={offer.isRecommended ? "success" : "neutral"}
                className="text-[10px] font-extrabold uppercase tracking-wider w-fit"
            >
                {offer.badge}
            </Badge>

            {/* Title */}
            <h4 className="text-lg font-bold text-[#262D3B]">{offer.title}</h4>

            {/* Description */}
            <p className="text-xs font-semibold text-[#787E8C] leading-relaxed">
                {offer.subtitle}
            </p>
        </div>
    );
}

// ─── MOCK DATA CONSTANTS ─────────────────────────────────────────────────────
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

// Static mock data representing rooms matching Figma mockups
const MOCK_ROOMS = [
    {
        id: 1,
        roomNumber: "GW-101",
        status: "Available" as const,
        floor: "Floor 2",
        wardType: "General Ward",
        totalBeds: 10,
        availableBeds: 4,
    },
    {
        id: 2,
        roomNumber: "GW-102",
        status: "Limited" as const,
        floor: "Floor 2",
        wardType: "General Ward",
        totalBeds: 8,
        availableBeds: 2,
    },
    {
        id: 3,
        roomNumber: "GW-103",
        status: "Full" as const,
        floor: "Floor 2",
        wardType: "General Ward",
        totalBeds: 10,
        availableBeds: 0,
    },
    {
        id: 4,
        roomNumber: "GW-103",
        status: "Full" as const,
        floor: "Floor 2",
        wardType: "General Ward",
        totalBeds: 10,
        availableBeds: 0,
    },
    {
        id: 5,
        roomNumber: "GW-102",
        status: "Limited" as const,
        floor: "Floor 2",
        wardType: "General Ward",
        totalBeds: 8,
        availableBeds: 2,
    },
    {
        id: 6,
        roomNumber: "GW-103",
        status: "Full" as const,
        floor: "Floor 2",
        wardType: "General Ward",
        totalBeds: 10,
        availableBeds: 0,
    },
];

// Static mock data for Bed Allocation layout
const MOCK_BEDS = [
    // Row A
    { id: "A1", label: "A1", status: "Available" as const, row: "Row A" },
    { id: "A2", label: "A2", status: "Occupied" as const, patientName: "Rahul Sharma", row: "Row A" },
    { id: "A3", label: "A3", status: "Available" as const, row: "Row A" },
    { id: "A4", label: "A4", status: "Reserved" as const, patientName: "Reserved on Hold", row: "Row A" },
    // Row B
    { id: "B1", label: "B1", status: "Available" as const, row: "Row B" },
    { id: "B2", label: "B2", status: "Occupied" as const, patientName: "Amit Kumar", row: "Row B" },
    { id: "B3", label: "B3", status: "Available" as const, row: "Row B" },
    { id: "B4", label: "B4", status: "Available" as const, row: "Row B" },
    // Row C
    { id: "C1", label: "C1", status: "Occupied" as const, patientName: "Vikram Singh", row: "Row C" },
    { id: "C2", label: "C2", status: "Occupied" as const, patientName: "Neeraj Pandey", row: "Row C" },
    { id: "C3", label: "C3", status: "Available" as const, row: "Row C" },
    { id: "C4", label: "C4", status: "Available" as const, row: "Row C" },
];

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function StartCounsellingPage() {
    // Top Filter States
    const [patientCategory, setPatientCategory] = useState("panel");
    const [diseaseType, setDiseaseType] = useState("other");
    const [admissionFilterType, setAdmissionFilterType] = useState("day_care");

    // Package List States
    const [selectedPackageId, setSelectedPackageId] = useState("pkg-1");
    const [sortBy, setSortBy] = useState("default");

    // Days Input
    const [numberOfDays, setNumberOfDays] = useState(5);

    // Offer States
    const [applyOffer, setApplyOffer] = useState(true);
    const [offerTab, setOfferTab] = useState("bundled");
    const [selectedOfferId, setSelectedOfferId] = useState("off-b1");

    // Admission Pick State
    const [admissionType, setAdmissionType] = useState("immediate");

    // Stepper State
    const [currentStep, setCurrentStep] = useState(1);

    // Step 2 states
    const [admissionDate, setAdmissionDate] = useState("");
    const [advancePaymentInput, setAdvancePaymentInput] = useState("2500");
    const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
    const [paymentMode, setPaymentMode] = useState("complete"); // "complete" | "split"
    const [selectedMethod, setSelectedMethod] = useState("cash"); // "cash" | "credit_card" | "upi"

    // Complete mode payment states
    const [cashPaymentStatus, setCashPaymentStatus] = useState<"pending" | "verified">("pending");
    const [creditCardPaymentStatus, setCreditCardPaymentStatus] = useState<"ready" | "success">("ready");
    const [upiPaymentStatus, setUpiPaymentStatus] = useState<"ready" | "success">("ready");

    // Split mode payment amounts and statuses
    const [splitCashAmount, setSplitCashAmount] = useState("15000");
    const [splitCashStatus, setSplitCashStatus] = useState<"pending" | "verified">("pending");
    const [splitUpiAmount, setSplitUpiAmount] = useState("15000");
    const [splitUpiStatus, setSplitUpiStatus] = useState<"ready" | "success">("ready");
    const [splitCardAmount, setSplitCardAmount] = useState("2500");
    const [splitCardStatus, setSplitCardStatus] = useState<"ready" | "success">("ready");
    const [selectedOnlineSplitMethod, setSelectedOnlineSplitMethod] = useState<"razorpay" | "payu">("razorpay");

    const [specialInstructions, setSpecialInstructions] = useState("");

    // Step 3 states
    const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
    const [selectedBed, setSelectedBed] = useState<string | null>("A1");
    const [selectedWing, setSelectedWing] = useState("");
    const [selectedFloor, setSelectedFloor] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");
    const [roomCurrentPage, setRoomCurrentPage] = useState(1);
    const [roomItemsPerPage, setRoomItemsPerPage] = useState(6);

    const handleAmountChange = (value: string, setter: (val: string) => void) => {
        if (value === "") {
            setter("");
            return;
        }
        const regex = /^\d{0,15}(\.\d{0,2})?$/;
        if (regex.test(value)) {
            setter(value);
        }
    };

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
    const sortedPackages = [...MOCK_PACKAGES].sort((a, b) => {
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

    // Dynamic Price Summary calculations based on selection
    const activePackage = MOCK_PACKAGES.find(pkg => pkg.id === selectedPackageId) || MOCK_PACKAGES[0];
    const roomRentPerDay = activePackage.branchRoomType?.roomRentPrice ? Number(activePackage.branchRoomType.roomRentPrice) : 0;
    const medicinePerDay = activePackage.medicineEnabled ? Number(activePackage.medicinePrice) : 0;
    const mealsPerDay = activePackage.mealsEnabled ? Number(activePackage.mealsPrice) : 0;
    const doctorFee = activePackage.doctorFeeEnabled ? Number(activePackage.doctorFeePrice) : 0;
    const nurseFee = activePackage.nurseFeeEnabled ? Number(activePackage.nurseFeePrice) : 0;
    const attendantFee = activePackage.attendantFeeEnabled ? Number(activePackage.attendantFeePrice) : 0;
    const therapyFee = activePackage.therapyEnabled ? Number(activePackage.therapyPrice) : 0;

    // Calculate total price based on active package and selected number of days
    // Assume room rent, medicine and meals are per day, while doctor, nurse, attendant, and therapy are one-time/package fees
    const originalTotal = (roomRentPerDay + medicinePerDay + mealsPerDay) * numberOfDays + doctorFee + nurseFee + attendantFee + therapyFee;

    // Offer Calculations
    const activeCategoryOffers = MOCK_OFFERS[offerTab] || [];
    const activeOffer = activeCategoryOffers.find(off => off.id === selectedOfferId) || activeCategoryOffers[0] || {
        bonusValue: 0,
        appliedDiscount: 0,
        bonusLabel: "N/A"
    };

    const stayBonus = applyOffer ? activeOffer.bonusValue : 0;
    const packageAppliedDiscount = applyOffer ? activeOffer.appliedDiscount : 0;
    const finalAmountPayable = Math.max(0, originalTotal - stayBonus - packageAppliedDiscount);
    const offerBonusLabel = activeOffer.bonusLabel;

    // Dynamic calculations for split mode
    const totalReceivedSplit =
        (splitCashStatus === "verified" ? Number(splitCashAmount) : 0) +
        (selectedOnlineSplitMethod === "razorpay" && splitUpiStatus === "success" ? Number(splitUpiAmount) : 0) +
        (selectedOnlineSplitMethod === "payu" && splitCardStatus === "success" ? Number(splitCardAmount) : 0);

    const balanceOutstandingSplit = Math.max(0, finalAmountPayable - totalReceivedSplit);

    // Find the currently selected room
    const selectedRoom = useMemo(() => {
        return MOCK_ROOMS.find(r => r.id === selectedRoomId);
    }, [selectedRoomId]);

    // Group beds for current room
    const bedsByRow = useMemo(() => {
        const rows = ["Row A", "Row B", "Row C"];
        return rows.map(r => ({
            rowName: r,
            beds: MOCK_BEDS.filter(b => b.row === r),
        }));
    }, []);

    // Filter rooms dynamically
    const filteredRooms = useMemo(() => {
        return MOCK_ROOMS.filter(room => {
            if (selectedFloor && room.floor !== selectedFloor) return false;
            if (selectedStatus && room.status !== selectedStatus) return false;
            return true;
        });
    }, [selectedFloor, selectedStatus]);

    // Paginate filtered rooms dynamically
    const paginatedRooms = useMemo(() => {
        const startIndex = (roomCurrentPage - 1) * roomItemsPerPage;
        if (startIndex >= filteredRooms.length && filteredRooms.length > 0) {
            return filteredRooms.slice(0, roomItemsPerPage);
        }
        return filteredRooms.slice(startIndex, startIndex + roomItemsPerPage);
    }, [filteredRooms, roomCurrentPage, roomItemsPerPage]);

    return (
        <AppShell>
            {/* 1. TOP HEADER & STEPPER SECTION */}
            <div className="w-full flex flex-col md:flex-row justify-between items-start md:items-center rounded-[20px] gap-6 select-none">
                {/* Left Side: Header Dynamic Title */}
                {currentStep === 1 ? (
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-[8px] bg-[#E3EEE1] text-[#0B8C00] font-extrabold text-xl flex items-center justify-center select-none shadow-inner">
                            JD
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-bold text-[#262D3B]">John Doe</h2>
                                <Badge
                                    variant="success"
                                    className="text-xs font-semibold uppercase tracking-wider select-none"
                                >
                                    Active
                                </Badge>
                            </div>
                            <p className="text-xs font-semibold text-[#787E8C] tracking-wide">
                                UHID: <span className="text-[#262D3B] font-bold">JSKL41712025</span> • Diagnosis: <span className="text-[#262D3B] font-bold">Cardiology Chronic Hypertension</span>
                            </p>
                        </div>
                    </div>
                ) : currentStep === 2 ? (
                    <PageHeading title="Admission & Payment" />
                ) : (
                    <PageHeading title="Room Allocation" />
                )}

                {/* Right Side: Stepper Progress */}
                <div className="flex items-start gap-2 select-none md:self-center pr-2">
                    {/* Step 1 */}
                    <div className="flex flex-col items-center gap-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${currentStep >= 1 ? "bg-[#0B8C00] text-white" : "bg-white text-[#787E8C] border border-[#DFE0E2]"
                            }`}>
                            1
                        </div>
                        <span className={`text-xs font-semibold ${currentStep >= 1 ? "text-[#0B8C00]" : "text-[#787E8C]"}`}>Details</span>
                    </div>

                    {/* Connection bar 1 */}
                    <div className={`w-20 rounded-full mx-1 mt-[13px] transition-all duration-200 ${currentStep > 1 ? "h-1 bg-[#0B8C00]" : "h-[2px] bg-[#DFE0E2]"
                        }`}></div>

                    {/* Step 2 */}
                    <div className="flex flex-col items-center gap-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${currentStep >= 2 ? "bg-[#0B8C00] text-white" : "bg-white text-[#787E8C] border border-[#DFE0E2] opacity-50"
                            }`}>
                            2
                        </div>
                        <span className={`text-xs font-semibold ${currentStep >= 2 ? "text-[#0B8C00]" : "text-[#787E8C] opacity-50"}`}>Payment</span>
                    </div>

                    {/* Connection bar 2 */}
                    <div className={`w-20 rounded-full mx-1 mt-[13px] transition-all duration-200 ${currentStep > 2 ? "h-1 bg-[#0B8C00]" : "h-[2px] bg-[#DFE0E2]"
                        }`}></div>

                    {/* Step 3 */}
                    <div className="flex flex-col items-center gap-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${currentStep >= 3 ? "bg-[#0B8C00] text-white" : "bg-white text-[#787E8C] border border-[#DFE0E2] opacity-50"
                            }`}>
                            3
                        </div>
                        <span className={`text-xs font-semibold ${currentStep >= 3 ? "text-[#0B8C00]" : "text-[#787E8C] opacity-50"}`}>Room</span>
                    </div>
                </div>
            </div>

            {currentStep === 1 ? (
                <div className="w-full rounded-[20px] border border-[#E3EEE1] p-3 mt-6">
                    {/* 2. THREE FILTERS SECTION WITH GREEN CONTAINER BORDER */}
                    <div className="w-full rounded-[20px] flex flex-wrap items-center gap-8 pb-4">
                        {/* Patient Category */}
                        <div className="flex flex-col gap-2 min-w-[350px] p-2 rounded-[8px] border border-[#E3EEE1]  ">
                            <span className="text-xs font-bold text-[#787E8C] uppercase tracking-wider px-1 pt-2">Patient Category</span>
                            <div className="w-[450px] shrink-0">
                                <Tabs
                                    options={patientCategoryOptions}
                                    value={patientCategory}
                                    onChange={(val) => setPatientCategory(val)}
                                    className="border-0  !h-full"
                                    tabBorder={true}
                                />
                            </div>
                        </div>

                        {/* Disease Type */}
                        <div className="flex flex-col gap-2 min-w-[350px] p-2 rounded-[8px] border border-[#E3EEE1] ">
                            <span className="text-xs font-bold text-[#787E8C] uppercase tracking-wider px-1 pt-2">Disease Type</span>
                            <div className="w-[450px] shrink-0">
                                <Tabs
                                    options={diseaseTypeOptions}
                                    value={diseaseType}
                                    onChange={(val) => setDiseaseType(val)}
                                    className="border-0  !h-full"
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
                            {/* Header Actions */}
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <h3 className="text-2xl font-bold text-[#262D3B] tracking-tight">Select Package</h3>

                                <div className="flex items-center gap-4 flex-wrap select-none">
                                    {/* View Patient Overview Button */}
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
                                    >
                                        View Patient Overview
                                    </Button>

                                    {/* Sort Dropdown */}
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

                                    {/* Count available */}
                                    <span className="text-sm font-bold ">
                                        {sortedPackages.length} Packages available
                                    </span>
                                </div>
                            </div>

                            {/* Horizontal Packages Row (Show 4 horizontally) */}
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
                        <div className="w-full bg-white py-6 rounded-[20px]  flex flex-col gap-3">
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
                            {/* Toggle section */}
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

                            {/* Offer Tabs + Price Summary box */}
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
                                                onClick={() => setCurrentStep(2)}
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
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="primary"
                                rightIcon={<span>➔</span>}
                                onClick={() => setCurrentStep(2)}
                            >
                                Next: Basic Information
                            </Button>
                        </div>
                    </div>
                </div>
            ) : currentStep === 2 ? (
                /* STEP 2 - ADMISSION & PAYMENT CONTENT */
                <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 items-start">
                    {/* Left Column: Financial Processing (takes 2 columns) */}
                    <div className="lg:col-span-2 flex flex-col gap-6">
                        <div className="w-full rounded-[20px] border border-[#DFE0E2] bg-white p-6 shadow-sm flex flex-col gap-6">
                            <h3 className="text-xl font-semibold text-[#262D3B]">Financial Processing</h3>

                            {/* Top row: admission date & advance amount */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex flex-col gap-2">
                                    <FormInputField
                                        label="Proposed Admission Date"
                                        type="date"
                                        value={admissionDate}
                                        onChange={(e) => setAdmissionDate(e.target.value)}
                                        height={52}
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="relative">
                                        <FormInputField
                                            label="Advance Payment Amount"
                                            type="number"
                                            value={advancePaymentInput}
                                            onChange={(e) => setAdvancePaymentInput(e.target.value)}
                                            height={52}
                                            className="pr-10 font-bold text-[#262D3B]"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#787E8C] font-extrabold text-base">₹</span>
                                    </div>
                                </div>
                            </div>

                            {/* Mode tab selection */}
                            <div className="flex flex-col gap-2.5">
                                <span className="text-sm font-semibold text-[#787E8C] tracking-wider px-1">Mode</span>
                                <SegmentedToggle
                                    options={[
                                        { label: "Complete Payment", value: "complete" },
                                        { label: "Split Payment", value: "split" }
                                    ]}
                                    value={paymentMode as "complete" | "split"}
                                    onChange={(val) => setPaymentMode(val)}
                                    width="440px"
                                />
                            </div>

                            {/* Mode Specific Payment Methods list */}
                            {paymentMode === "complete" ? (
                                <div className="flex flex-col gap-4 border border-[#E3EEE1] rounded-[20px] p-5 bg-[#F2FAF2]/10 select-none">
                                    <span className="text-xs font-bold text-[#787E8C] uppercase tracking-wider px-1">Payment Method</span>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* Cash */}
                                        <button
                                            type="button"
                                            onClick={() => setSelectedMethod("cash")}
                                            className={`flex items-center justify-center gap-2 h-[35px] px-[10px] rounded-[12px] border text-sm font-medium transition-all duration-200 ${selectedMethod === "cash"
                                                ? "border-[#0B8C00] bg-[#0B8C00] text-white shadow-sm"
                                                : "border-[#DFE0E2] bg-white text-[#262D3B] hover:bg-[#F8FAFC] hover:border-[#CBD5E1]"
                                                }`}
                                        >
                                            <svg width="18" height="13" viewBox="0 0 18 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M10.6364 7.3125C9.95455 7.3125 9.375 7.07552 8.89773 6.60156C8.42045 6.1276 8.18182 5.55208 8.18182 4.875C8.18182 4.19792 8.42045 3.6224 8.89773 3.14844C9.375 2.67448 9.95455 2.4375 10.6364 2.4375C11.3182 2.4375 11.8977 2.67448 12.375 3.14844C12.8523 3.6224 13.0909 4.19792 13.0909 4.875C13.0909 5.55208 12.8523 6.1276 12.375 6.60156C11.8977 7.07552 11.3182 7.3125 10.6364 7.3125ZM4.90909 9.75C4.45909 9.75 4.07386 9.59089 3.75341 9.27266C3.43295 8.95443 3.27273 8.57187 3.27273 8.125V1.625C3.27273 1.17812 3.43295 0.795573 3.75341 0.477344C4.07386 0.159115 4.45909 0 4.90909 0H16.3636C16.8136 0 17.1989 0.159115 17.5193 0.477344C17.8398 0.795573 18 1.17812 18 1.625V8.125C18 8.57187 17.8398 8.95443 17.5193 9.27266C17.1989 9.59089 16.8136 9.75 16.3636 9.75H4.90909ZM6.54545 8.125H14.7273C14.7273 7.67812 14.8875 7.29557 15.208 6.97734C15.5284 6.65911 15.9136 6.5 16.3636 6.5V3.25C15.9136 3.25 15.5284 3.09089 15.208 2.77266C14.8875 2.45443 14.7273 2.07187 14.7273 1.625H6.54545C6.54545 2.07187 6.38523 2.45443 6.06477 2.77266C5.74432 3.09089 5.35909 3.25 4.90909 3.25V6.5C5.35909 6.5 5.74432 6.65911 6.06477 6.97734C6.38523 7.29557 6.54545 7.67812 6.54545 8.125ZM15.5455 13H1.63636C1.18636 13 0.801136 12.8409 0.480682 12.5227C0.160227 12.2044 0 11.8219 0 11.375V2.4375H1.63636V11.375H15.5455V13Z" fill="currentColor" />
                                            </svg>
                                            Cash
                                        </button>

                                        {/* PayU */}
                                        <button
                                            type="button"
                                            onClick={() => setSelectedMethod("credit_card")}
                                            className={`flex items-center justify-center gap-2 h-[35px] px-[10px] rounded-[12px] border text-sm font-medium transition-all duration-200 ${selectedMethod === "credit_card"
                                                ? "border-[#0B8C00] bg-[#0B8C00] text-white shadow-sm"
                                                : "border-[#DFE0E2] bg-white text-[#262D3B] hover:bg-[#F8FAFC] hover:border-[#CBD5E1]"
                                                }`}
                                        >
                                            <Image src="/icons/payU.svg" alt="PayU" width={16} height={16} className="object-contain" />
                                            PayU
                                        </button>

                                        {/* Razor Pay */}
                                        <button
                                            type="button"
                                            onClick={() => setSelectedMethod("upi")}
                                            className={`flex items-center justify-center gap-2 h-[35px] px-[10px] rounded-[12px] border text-sm font-medium transition-all duration-200 ${selectedMethod === "upi"
                                                ? "border-[#0B8C00] bg-[#0B8C00] text-white shadow-sm"
                                                : "border-[#DFE0E2] bg-white text-[#262D3B] hover:bg-[#F8FAFC] hover:border-[#CBD5E1]"
                                                }`}
                                        >
                                            <Image src="/icons/razorpay.svg" alt="Razor Pay" width={16} height={16} className="object-contain font-medium" />
                                            Razor Pay
                                        </button>
                                    </div>

                                    {/* Selected Method Details Card */}
                                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white py-[8px] px-[12px] rounded-[15px] border border-[#DFE0E2] mt-2">
                                        <div className="flex items-center gap-3">
                                            <span className="w-10 h-10 rounded-xl bg-[#E3EEE1] text-[#0B8C00] flex items-center justify-center">
                                                {selectedMethod === "cash" && (
                                                    <svg width="18" height="13" viewBox="0 0 18 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M10.6364 7.3125C9.95455 7.3125 9.375 7.07552 8.89773 6.60156C8.42045 6.1276 8.18182 5.55208 8.18182 4.875C8.18182 4.19792 8.42045 3.6224 8.89773 3.14844C9.375 2.67448 9.95455 2.4375 10.6364 2.4375C11.3182 2.4375 11.8977 2.67448 12.375 3.14844C12.8523 3.6224 13.0909 4.19792 13.0909 4.875C13.0909 5.55208 12.8523 6.1276 12.375 6.60156C11.8977 7.07552 11.3182 7.3125 10.6364 7.3125ZM4.90909 9.75C4.45909 9.75 4.07386 9.59089 3.75341 9.27266C3.43295 8.95443 3.27273 8.57187 3.27273 8.125V1.625C3.27273 1.17812 3.43295 0.795573 3.75341 0.477344C4.07386 0.159115 4.45909 0 4.90909 0H16.3636C16.8136 0 17.1989 0.159115 17.5193 0.477344C17.8398 0.795573 18 1.17812 18 1.625V8.125C18 8.57187 17.8398 8.95443 17.5193 9.27266C17.1989 9.59089 16.8136 9.75 16.3636 9.75H4.90909ZM6.54545 8.125H14.7273C14.7273 7.67812 14.8875 7.29557 15.208 6.97734C15.5284 6.65911 15.9136 6.5 16.3636 6.5V3.25C15.9136 3.25 15.5284 3.09089 15.208 2.77266C14.8875 2.45443 14.7273 2.07187 14.7273 1.625H6.54545C6.54545 2.07187 6.38523 2.45443 6.06477 2.77266C5.74432 3.09089 5.35909 3.25 4.90909 3.25V6.5C5.35909 6.5 5.74432 6.65911 6.06477 6.97734C6.38523 7.29557 6.54545 7.67812 6.54545 8.125ZM15.5455 13H1.63636C1.18636 13 0.801136 12.8409 0.480682 12.5227C0.160227 12.2044 0 11.8219 0 11.375V2.4375H1.63636V11.375H15.5455V13Z" fill="currentColor" />
                                                    </svg>
                                                )}
                                                {selectedMethod === "credit_card" && (
                                                    <Image src="/icons/payU.svg" alt="PayU" width={24} height={24} className="object-contain" />
                                                )}
                                                {selectedMethod === "upi" && (
                                                    <Image src="/icons/razorpay.svg" alt="Razor Pay" width={24} height={24} className="object-contain font-medium" />
                                                )}
                                            </span>
                                            <div className="flex flex-col">
                                                <span className="font-extrabold text-[#262D3B] text-sm">
                                                    {selectedMethod === "cash" && "Cash Payment"}
                                                    {selectedMethod === "credit_card" && "PayU"}
                                                    {selectedMethod === "upi" && "Razor Pay"}
                                                </span>
                                                <span className="text-xs font-semibold text-[#787E8C]">
                                                    {selectedMethod === "cash" && (cashPaymentStatus === "verified" ? "Physical Cash Received" : "Pending Confirmation")}
                                                    {selectedMethod === "credit_card" && (creditCardPaymentStatus === "success" ? "Transaction Successful" : "Ready to Pay")}
                                                    {selectedMethod === "upi" && (upiPaymentStatus === "success" ? "Transaction Successful" : "Ready to Pay")}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {/* Interactivity of Complete Payment */}
                                            {((selectedMethod === "cash" && cashPaymentStatus !== "verified") ||
                                                (selectedMethod === "credit_card" && creditCardPaymentStatus !== "success") ||
                                                (selectedMethod === "upi" && upiPaymentStatus !== "success")) ? (
                                                <>
                                                    <div className="relative w-[250px]">
                                                        <FormInputField
                                                            label=""
                                                            type="text"
                                                            inputMode="decimal"
                                                            value={advancePaymentInput}
                                                            onChange={(e) => handleAmountChange(e.target.value, setAdvancePaymentInput)}
                                                            height={38}
                                                            width={250}
                                                            className="font-bold text-xs"
                                                            suffix={<span className="text-xs font-bold text-[#787E8C]">₹</span>}
                                                        />
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="primary"
                                                        className="h-[38px]"
                                                        size="medium"
                                                        onClick={() => {
                                                            if (selectedMethod === "cash") setCashPaymentStatus("verified");
                                                            if (selectedMethod === "credit_card") setCreditCardPaymentStatus("success");
                                                            if (selectedMethod === "upi") setUpiPaymentStatus("success");
                                                        }}
                                                    >
                                                        {selectedMethod === "cash" ? "Confirm" : "Pay Now"}
                                                    </Button>
                                                </>
                                            ) : (
                                                <div className="flex items-center gap-2 text-[#0B8C00] font-extrabold text-sm select-none">
                                                    <span>₹ {Number(advancePaymentInput).toLocaleString()}</span>
                                                    <Badge variant="success" className="text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                                                        ✓ {selectedMethod === "cash" ? "Verified" : "Success"}
                                                    </Badge>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* SPLIT PAYMENT MODE */
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-2 select-none items-stretch">
                                    {/* Left side: three split rows */}
                                    <div className="flex flex-col gap-4">
                                        {/* Cash Split Row */}
                                        <div className="flex items-center justify-between gap-4 p-4 border border-[#DFE0E2] rounded-[15px] bg-white">
                                            <div className="flex items-center gap-3">
                                                <span className="w-10 h-10 rounded-xl bg-[#E3EEE1] text-[#0B8C00] flex items-center justify-center">
                                                    <svg width="18" height="13" viewBox="0 0 18 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M10.6364 7.3125C9.95455 7.3125 9.375 7.07552 8.89773 6.60156C8.42045 6.1276 8.18182 5.55208 8.18182 4.875C8.18182 4.19792 8.42045 3.6224 8.89773 3.14844C9.375 2.67448 9.95455 2.4375 10.6364 2.4375C11.3182 2.4375 11.8977 2.67448 12.375 3.14844C12.8523 3.6224 13.0909 4.19792 13.0909 4.875C13.0909 5.55208 12.8523 6.1276 12.375 6.60156C11.8977 7.07552 11.3182 7.3125 10.6364 7.3125ZM4.90909 9.75C4.45909 9.75 4.07386 9.59089 3.75341 9.27266C3.43295 8.95443 3.27273 8.57187 3.27273 8.125V1.625C3.27273 1.17812 3.43295 0.795573 3.75341 0.477344C4.07386 0.159115 4.45909 0 4.90909 0H16.3636C16.8136 0 17.1989 0.159115 17.5193 0.477344C17.8398 0.795573 18 1.17812 18 1.625V8.125C18 8.57187 17.8398 8.95443 17.5193 9.27266C17.1989 9.59089 16.8136 9.75 16.3636 9.75H4.90909ZM6.54545 8.125H14.7273C14.7273 7.67812 14.8875 7.29557 15.208 6.97734C15.5284 6.65911 15.9136 6.5 16.3636 6.5V3.25C15.9136 3.25 15.5284 3.09089 15.208 2.77266C14.8875 2.45443 14.7273 2.07187 14.7273 1.625H6.54545C6.54545 2.07187 6.38523 2.45443 6.06477 2.77266C5.74432 3.09089 5.35909 3.25 4.90909 3.25V6.5C5.35909 6.5 5.74432 6.65911 6.06477 6.97734C6.38523 7.29557 6.54545 7.67812 6.54545 8.125ZM15.5455 13H1.63636C1.18636 13 0.801136 12.8409 0.480682 12.5227C0.160227 12.2044 0 11.8219 0 11.375V2.4375H1.63636V11.375H15.5455V13Z" fill="currentColor" />
                                                    </svg>
                                                </span>
                                                <div className="flex flex-col">
                                                    <span className="font-extrabold text-[#262D3B] text-sm">Cash Payment</span>
                                                    <span className="text-xs font-semibold text-[#787E8C]">
                                                        {splitCashStatus === "verified" ? "Physical Cash Received" : "Pending Confirmation"}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                {splitCashStatus !== "verified" ? (
                                                    <>
                                                        <div className="relative w-[120px]">
                                                            <FormInputField
                                                                label=""
                                                                type="text"
                                                                inputMode="decimal"
                                                                value={splitCashAmount}
                                                                onChange={(e) => handleAmountChange(e.target.value, setSplitCashAmount)}
                                                                height={38}
                                                                width={120}
                                                                className="font-bold text-xs"
                                                                suffix={<span className="text-xs font-bold text-[#787E8C]">₹</span>}
                                                            />
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="primary"
                                                            className="h-[38px]"
                                                            size="medium"
                                                            onClick={() => setSplitCashStatus("verified")}
                                                        >
                                                            Confirm
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-[#0B8C00] font-extrabold text-sm select-none">
                                                        <span>₹ {Number(splitCashAmount).toLocaleString()}</span>
                                                        <Badge variant="success" className="text-[10px] font-extrabold uppercase tracking-wider">
                                                            ✓ Verified
                                                        </Badge>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Razor Pay Split Row */}
                                        <div
                                            onClick={() => {
                                                if (splitUpiStatus !== "success" && splitCardStatus !== "success") {
                                                    setSelectedOnlineSplitMethod("razorpay");
                                                }
                                            }}
                                            className={`flex items-center justify-between gap-4 p-4 border rounded-[15px] transition-all duration-200 ${selectedOnlineSplitMethod === "razorpay"
                                                ? "border-[#0B8C00] bg-[#F2FAF2]/10"
                                                : "border-[#DFE0E2] bg-white opacity-55 cursor-pointer hover:border-[#CBD5E1]"
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                {/* Custom Radio Circle */}
                                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-200 ${selectedOnlineSplitMethod === "razorpay" ? "border-[#0B8C00] bg-white" : "border-[#DFE0E2] bg-white"
                                                    }`}>
                                                    {selectedOnlineSplitMethod === "razorpay" && <div className="w-2.5 h-2.5 rounded-full bg-[#0B8C00]" />}
                                                </div>

                                                <span className="w-10 h-10 rounded-xl bg-[#E3EEE1] text-[#0B8C00] flex items-center justify-center p-1">
                                                    <Image src="/icons/razorpay.svg" alt="Razor Pay" width={24} height={24} className="object-contain font-medium" />
                                                </span>
                                                <div className="flex flex-col">
                                                    <span className="font-extrabold text-[#262D3B] text-sm">Razor Pay</span>
                                                    <span className="text-xs font-semibold text-[#787E8C]">
                                                        {splitUpiStatus === "success" ? "Transaction Successfull" : "Ready to Pay"}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3" onClick={(e) => selectedOnlineSplitMethod !== "razorpay" && e.stopPropagation()}>
                                                {splitUpiStatus !== "success" ? (
                                                    <>
                                                        <div className="relative w-[120px]">
                                                            <FormInputField
                                                                label=""
                                                                type="text"
                                                                inputMode="decimal"
                                                                value={selectedOnlineSplitMethod === "razorpay" ? splitUpiAmount : "0"}
                                                                onChange={(e) => handleAmountChange(e.target.value, setSplitUpiAmount)}
                                                                height={38}
                                                                width={120}
                                                                className="font-bold text-xs"
                                                                suffix={<span className="text-xs font-bold text-[#787E8C]">₹</span>}
                                                                disabled={selectedOnlineSplitMethod !== "razorpay"}
                                                            />
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="primary"
                                                            className="h-[38px]"
                                                            size="medium"
                                                            onClick={() => setSplitUpiStatus("success")}
                                                            disabled={selectedOnlineSplitMethod !== "razorpay"}
                                                        >
                                                            Pay Now
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-[#0B8C00] font-extrabold text-sm select-none">
                                                        <span>₹ {Number(splitUpiAmount).toLocaleString()}</span>
                                                        <Badge variant="success" className="text-[10px] font-extrabold uppercase tracking-wider">
                                                            ✓ Success
                                                        </Badge>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* PayU Split Row */}
                                        <div
                                            onClick={() => {
                                                if (splitUpiStatus !== "success" && splitCardStatus !== "success") {
                                                    setSelectedOnlineSplitMethod("payu");
                                                }
                                            }}
                                            className={`flex items-center justify-between gap-4 p-4 border rounded-[15px] transition-all duration-200 ${selectedOnlineSplitMethod === "payu"
                                                ? "border-[#0B8C00] bg-[#F2FAF2]/10"
                                                : "border-[#DFE0E2] bg-white opacity-55 cursor-pointer hover:border-[#CBD5E1]"
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                {/* Custom Radio Circle */}
                                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-200 ${selectedOnlineSplitMethod === "payu" ? "border-[#0B8C00] bg-white" : "border-[#DFE0E2] bg-white"
                                                    }`}>
                                                    {selectedOnlineSplitMethod === "payu" && <div className="w-2.5 h-2.5 rounded-full bg-[#0B8C00]" />}
                                                </div>

                                                <span className="w-10 h-10 rounded-xl bg-[#F2F8F2] flex items-center justify-center p-1">
                                                    <Image src="/icons/payU.svg" alt="PayU" width={24} height={24} className="object-contain" />
                                                </span>
                                                <div className="flex flex-col">
                                                    <span className="font-extrabold text-[#262D3B] text-sm">PayU</span>
                                                    <span className="text-xs font-semibold text-[#787E8C]">
                                                        {splitCardStatus === "success" ? "Transaction Successful" : "Ready to Pay"}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3" onClick={(e) => selectedOnlineSplitMethod !== "payu" && e.stopPropagation()}>
                                                {splitCardStatus !== "success" ? (
                                                    <>
                                                        <div className="relative w-[120px]">
                                                            <FormInputField
                                                                label=""
                                                                type="text"
                                                                inputMode="decimal"
                                                                value={selectedOnlineSplitMethod === "payu" ? splitCardAmount : "0"}
                                                                onChange={(e) => handleAmountChange(e.target.value, setSplitCardAmount)}
                                                                height={38}
                                                                width={120}
                                                                className="font-bold text-xs"
                                                                suffix={<span className="text-xs font-bold text-[#787E8C]">₹</span>}
                                                                disabled={selectedOnlineSplitMethod !== "payu"}
                                                            />
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="primary"
                                                            className="h-[38px]"
                                                            size="medium"
                                                            onClick={() => setSplitCardStatus("success")}
                                                            disabled={selectedOnlineSplitMethod !== "payu"}
                                                        >
                                                            Pay Now
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-[#0B8C00] font-extrabold text-sm select-none">
                                                        <span>₹ {Number(splitCardAmount).toLocaleString()}</span>
                                                        <Badge variant="success" className="text-[10px] font-extrabold uppercase tracking-wider">
                                                            ✓ Success
                                                        </Badge>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right side: Payment Summary Green Card */}
                                    <div className="w-full rounded-[24px] bg-[#0B8C00] text-white p-6 flex flex-col justify-between shadow-md self-stretch">
                                        <div className="flex flex-col gap-5">
                                            <h4 className="text-xl font-bold border-b border-white/20 pb-3">Payment Summary</h4>

                                            <div className="flex flex-col gap-4 text-sm">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-white/90">Total Advance</span>
                                                    <span className="font-extrabold text-base">₹ {finalAmountPayable.toLocaleString()}</span>
                                                </div>

                                                <div className="flex justify-between items-center">
                                                    <span className="text-white/90">Total Received</span>
                                                    <span className="font-extrabold text-base">₹ {totalReceivedSplit.toLocaleString()}</span>
                                                </div>

                                                {/* Payment Breakdown Box */}
                                                <div className="border border-white/25 rounded-[12px] p-4 flex flex-col gap-3">
                                                    <span className="font-extrabold text-sm">Payment Breakdown</span>
                                                    <div className="flex flex-col gap-2 text-xs text-white/90">
                                                        <div className="flex justify-between items-center">
                                                            <span>Cash</span>
                                                            <span className="font-bold">₹ {(splitCashStatus === "verified" ? Number(splitCashAmount) : 0).toLocaleString()}</span>
                                                        </div>
                                                        {selectedOnlineSplitMethod === "razorpay" && (
                                                            <div className="flex justify-between items-center">
                                                                <span>Razor Pay</span>
                                                                <span className="font-bold">₹ {(splitUpiStatus === "success" ? Number(splitUpiAmount) : 0).toLocaleString()}</span>
                                                            </div>
                                                        )}
                                                        {selectedOnlineSplitMethod === "payu" && (
                                                            <div className="flex justify-between items-center">
                                                                <span>PayU</span>
                                                                <span className="font-bold">₹ {(splitCardStatus === "success" ? Number(splitCardAmount) : 0).toLocaleString()}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-center">
                                                    <span className="text-white/90">Allocated Not Paid</span>
                                                    <span className="font-extrabold text-base">₹ {balanceOutstandingSplit.toLocaleString()}</span>
                                                </div>

                                                <div className="border-t border-white/20 my-1"></div>

                                                <div className="flex justify-between items-center text-sm font-bold">
                                                    <span>Balance Outstanding</span>
                                                    <span className="font-extrabold text-base">₹ {balanceOutstandingSplit.toLocaleString()}</span>
                                                </div>

                                                <div className="flex justify-between items-start gap-4 text-xs font-bold mt-1">
                                                    <span className="text-white/90 shrink-0">Amount in Words</span>
                                                    <span className="text-right text-white select-all">{numberToWords(finalAmountPayable)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 mt-8">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSplitCashStatus("verified");
                                                    if (selectedOnlineSplitMethod === "razorpay") {
                                                        setSplitUpiStatus("success");
                                                        setSplitCardStatus("ready");
                                                    } else {
                                                        setSplitCardStatus("success");
                                                        setSplitUpiStatus("ready");
                                                    }
                                                }}
                                                className="h-12 bg-white text-[#0B8C00] rounded-full font-bold text-sm hover:bg-opacity-95 hover:scale-[1.01] transition-all flex items-center justify-center shadow-sm"
                                            >
                                                Confirm & Finalize
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSplitCashStatus("pending");
                                                    setSplitUpiStatus("ready");
                                                    setSplitCardStatus("ready");
                                                }}
                                                className="h-12 border border-white text-white rounded-full font-bold text-sm hover:bg-white/10 transition-colors flex items-center justify-center"
                                            >
                                                Cancel Session
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Special instructions field */}
                            <div className="mt-6 select-none">
                                <FormTextareaField
                                    label="Special Admission Instructions (Internal Only)"
                                    value={specialInstructions}
                                    onChange={(e) => setSpecialInstructions(e.target.value)}
                                    placeholder="Any specific requirements or notes for the ward nurses..."
                                    height={96}
                                    className="font-semibold text-xs"
                                />
                            </div>
                        </div>

                        {/* Bottom Actions footer */}
                        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 select-none">
                            <BackToPreviousPageButton
                                text="Back"
                                onClick={() => setCurrentStep(1)}
                            />

                            <div className="flex items-center gap-4">
                                {/* <Button
                                    type="button"
                                    variant="outline"
                                    className="!border-[#0B8C00] !text-[#0B8C00] hover:!bg-[#F2FAF2] !shadow-sm"
                                    leftIcon={<Image src="/icons/Printer.svg" alt="Print" width={18} height={18} className="shrink-0" />}
                                    onClick={() => alert("Invoice print triggered.")}
                                >
                                    Print Invoice
                                </Button> */}
                                <Button
                                    type="button"
                                    variant="primary"
                                    rightIcon={<span>➔</span>}
                                    onClick={() => setIsInvoiceDialogOpen(true)}
                                >
                                    Proceed to Room Allocation
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Premium Sticky Package Summary Card */}
                    <div className="w-full flex flex-col gap-6 sticky top-6">
                        <div className="w-full rounded-[20px] border border-[#DFE0E2] bg-white p-6 shadow-sm flex flex-col gap-6 select-none">
                            {/* Header */}
                            <div className="border-b border-[#DFE0E2] pb-4 flex flex-col gap-1">
                                <h3 className="text-xl font-bold text-[#262D3B]">
                                    {activePackage.packageName || "Cardiac Premium Care"}
                                </h3>
                                <span className="text-sm font-semibold text-[#787E8C]">
                                    {roomRentPerDay > 0 ? `${roomRentPerDay}rs /day` : "N/A"}
                                </span>
                            </div>

                            {/* Details Table */}
                            <div className="flex flex-col border border-[#DFE0E2] rounded-lg overflow-hidden">
                                <div className="flex justify-between items-center px-4 py-3 border-b border-[#DFE0E2] text-sm bg-white">
                                    <span className="text-[#787E8C] font-medium">Package Name</span>
                                    <span className="text-[#262D3B] font-bold truncate max-w-[60%]">
                                        {activePackage.packageName || "N/A"}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center px-4 py-3 border-b border-[#DFE0E2] text-sm bg-white">
                                    <span className="text-[#787E8C] font-medium">Room Type Selection</span>
                                    <span className="text-[#262D3B] font-bold uppercase truncate max-w-[60%]">
                                        {activePackage.packageType || "N/A"}
                                    </span>
                                </div>
                                {medicinePerDay > 0 && (
                                    <div className="flex justify-between items-center px-4 py-3 border-b border-[#DFE0E2] text-sm bg-white">
                                        <span className="text-[#787E8C] font-medium">Medicine</span>
                                        <span className="text-[#262D3B] font-bold">₹ {medicinePerDay.toLocaleString()}</span>
                                    </div>
                                )}
                                {doctorFee > 0 && (
                                    <div className="flex justify-between items-center px-4 py-3 border-b border-[#DFE0E2] text-sm bg-white">
                                        <span className="text-[#787E8C] font-medium">Doctor Fees</span>
                                        <span className="text-[#262D3B] font-bold">₹ {doctorFee.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center px-4 py-3 text-sm bg-white">
                                    <span className="text-[#787E8C] font-medium">Price</span>
                                    <span className="text-[#262D3B] font-bold">₹ {roomRentPerDay.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="flex flex-col gap-1 items-start">
                                <span className="text-sm font-bold text-[#262D3B]">Description</span>
                                <p className="text-xs font-semibold text-[#787E8C] leading-relaxed">
                                    {activePackage.remark || "No description provided."}
                                </p>
                            </div>

                            {/* Total Price Section */}
                            <div className="h-14 px-4 bg-[#E3EEE1] flex justify-between items-center rounded-lg font-semibold text-sm">
                                <span className="text-[#262D3B] font-bold">Total Price</span>
                                <span className="text-[#262D3B] font-extrabold text-lg">
                                    ₹ {finalAmountPayable.toLocaleString()}
                                </span>
                            </div>

                            {/* Selected Button */}
                            <button
                                type="button"
                                className="w-full h-11 bg-[#0B8C00] text-white hover:bg-[#097300] transition-colors rounded-[100px] font-bold text-sm flex items-center justify-center gap-2"
                            >
                                Selected Package
                            </button>
                        </div>

                        {/* Next Steps Info Alert */}
                        <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-xl flex gap-3 text-xs font-semibold text-[#64748B]">
                            <span className="text-lg leading-none select-none">ℹ️</span>
                            <div className="flex flex-col gap-1">
                                <span className="font-bold text-[#334155]">Next Steps</span>
                                <p className="leading-normal">
                                    After clicking next, you will be redirected to the room allocation grid to allocate a specific ward and bed number based on this selection.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* STEP 3 - ROOM ALLOCATION CONTENT */
                <div className="flex flex-col gap-6 select-none mt-6">
                    {/* Selected Package Banner (Green background, white text) */}
                    <div className="w-full rounded-[20px] bg-[#0B8C00] text-white p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm select-none">
                        <div className="flex items-center gap-4">
                            <div className="w-[80px] h-[80px] rounded-xl bg-white/20 flex items-center justify-center">
                                <Image
                                    src="/icons/bedDarkIcon.svg"
                                    alt=""
                                    width={42}
                                    height={42}
                                    style={{ filter: "brightness(0) invert(1)" }}
                                />
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-bold text-white/80 uppercase tracking-wider">Package Selected</span>
                                <h3 className="text-xl font-bold">{activePackage.packageName || "Deluxe Single"}</h3>
                                <Tooltip
                                    position="top"
                                    maxWidth={600}
                                    content={
                                        <span className="inline-block w-max whitespace-normal break-words text-left text-inherit max-w-[600px]">
                                            {activePackage.remark || "Premium suite with private lounge and high-dependency monitoring equipment."}
                                        </span>
                                    }
                                >
                                    <p className="text-xs text-white/90 font-medium leading-relaxed whitespace-nowrap truncate max-w-[1200px] cursor-pointer" >
                                        {activePackage.remark || "Premium suite with private lounge and high-dependency monitoring equipment."}
                                    </p>
                                </Tooltip>
                            </div>
                        </div>
                        <div className="flex flex-col md:items-end gap-0.5">
                            <span className="text-lg font-normal  tracking-wider">Daily Rate</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black">₹ {((activePackage.branchRoomType?.roomRentPrice || 1500) * 9).toLocaleString()}</span>
                                <span className="text-lg font-normal">/day</span>
                            </div>
                        </div>
                    </div>

                    {/* 4 Top Stat Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        {[
                            { label: "Total Capacity", value: "150", iconSrc: "/icons/addPatient.svg" },
                            { label: "Total Available", value: "45", iconSrc: "/icons/bedDarkIcon.svg" },
                            { label: "Total Occupied", value: "88", iconSrc: "/icons/bedDarkIcon.svg" },
                            { label: "Total Reserved", value: "17", iconSrc: "/icons/bedDarkIcon.svg" },
                        ].map((card) => (
                            <ManageRoomStatCard
                                key={card.label}
                                label={card.label}
                                value={card.value}
                                iconSrc={card.iconSrc}
                            />
                        ))}
                    </div>

                    {/* Main Split Grid Section */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                        {/* Left Card: Rooms Grid Card (col-span-2 when room selected, col-span-3 otherwise) */}
                        <TableListingCard
                            className={selectedRoomId ? "xl:col-span-2 !mb-0" : "xl:col-span-3 !mb-0"}
                            sections={[
                                {
                                    id: "rooms-list",
                                    title: "Rooms",
                                    titleRightContent: (
                                        <div className="flex items-center gap-3 w-full justify-end flex-wrap md:flex-nowrap">
                                            <div className="w-[220px] md:w-[250px] shrink-0">
                                                <FormSelectField
                                                    label="Wing / Department"
                                                    hideLabel
                                                    options={[
                                                        { label: "Wing / Department", value: "" },
                                                        { label: "General Ward", value: "general" },
                                                        { label: "Cardiology", value: "cardiology" },
                                                        { label: "ICU", value: "icu" }
                                                    ]}
                                                    placeholder="Wing / Department"
                                                    mode="single"
                                                    background="normal"
                                                    value={selectedWing}
                                                    onChange={(val) => {
                                                        setSelectedWing(String(val));
                                                        setRoomCurrentPage(1);
                                                    }}
                                                />
                                            </div>
                                            <div className="w-[220px] md:w-[250px] shrink-0">
                                                <FormSelectField
                                                    label="Floor"
                                                    hideLabel
                                                    options={[
                                                        { label: "Floor", value: "" },
                                                        { label: "Floor 1", value: "Floor 1" },
                                                        { label: "Floor 2", value: "Floor 2" },
                                                        { label: "Floor 3", value: "Floor 3" }
                                                    ]}
                                                    placeholder="Floor"
                                                    mode="single"
                                                    background="normal"
                                                    value={selectedFloor}
                                                    onChange={(val) => {
                                                        setSelectedFloor(String(val));
                                                        setRoomCurrentPage(1);
                                                    }}
                                                />
                                            </div>
                                            <div className="w-[220px] md:w-[250px] shrink-0">
                                                <FormSelectField
                                                    label="Room Status"
                                                    hideLabel
                                                    options={[
                                                        { label: "Room Status", value: "" },
                                                        { label: "Available", value: "Available" },
                                                        { label: "Occupied", value: "Occupied" },
                                                        { label: "Under Cleaning", value: "Under Cleaning" },
                                                        { label: "Checkout", value: "Checkout" },
                                                        { label: "Not Available", value: "Not Available" }
                                                    ]}
                                                    placeholder="Room Status"
                                                    mode="single"
                                                    background="normal"
                                                    value={selectedStatus}
                                                    onChange={(val) => {
                                                        setSelectedStatus(String(val));
                                                        setRoomCurrentPage(1);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ),
                                    customContent: (
                                        <div className={`grid grid-cols-1 md:grid-cols-2 ${selectedRoomId ? "lg:grid-cols-3" : "lg:grid-cols-4"} gap-6 pb-2`}>
                                            {paginatedRooms.map((room) => (
                                                <RoomCard
                                                    key={room.id}
                                                    room={room}
                                                    isSelected={selectedRoomId === room.id}
                                                    onClick={() => {
                                                        setSelectedRoomId(room.id === selectedRoomId ? null : room.id);
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    ),
                                    pagination: {
                                        currentPage: roomCurrentPage,
                                        totalItems: filteredRooms.length,
                                        itemsPerPage: roomItemsPerPage,
                                        onPageChange: (page) => setRoomCurrentPage(page),
                                        onItemsPerPageChange: (size) => setRoomItemsPerPage(size),
                                        itemsPerPageOptions: [6, 12, 24],
                                    }
                                }
                            ]}
                        />

                        {/* Right Card: Bed Allocation Sidebar (only rendered when a Room is selected) */}
                        {selectedRoom && (
                            <div className="xl:col-span-1 bg-white p-6 rounded-[24px] border border-[#DFE0E2] shadow-sm flex flex-col gap-6 transition-all duration-200">
                                {/* Header details */}
                                <div className="flex justify-between items-start pb-0">
                                    <div className="flex flex-col gap-1">
                                        <h3 className="text-base font-semibold text-[#262D3B]">
                                            Bed Allocation - {selectedRoom.roomNumber}
                                        </h3>
                                        <span className="text-xs font-semibold text-[#787E8C]">
                                            General Ward • {selectedRoom.floor} • Total Beds: 10
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedRoomId(null)}
                                        className="w-8 h-8 rounded-full hover:bg-gray-50 flex items-center justify-center text-[#787E8C] transition-colors"
                                    >
                                        ✕
                                    </button>
                                </div>

                                {/* Bed Stat Widgets */}
                                <div className="grid grid-cols-4 gap-2 text-center p-3 rounded-xl border border-[#E3EEE1] bg-white shadow-sm">
                                    {[
                                        { label: "Total Beds", value: "10", labelColor: "text-[#787E8C]", valueColor: "text-[#262D3B]" },
                                        { label: "Available", value: "4", labelColor: "text-[#0B8C00]", valueColor: "text-[#0B8C00]" },
                                        { label: "Occupied", value: "5", labelColor: "text-[#787E8C]", valueColor: "text-[#EF4444]" },
                                        { label: "Reserved", value: "1", labelColor: "text-[#787E8C]", valueColor: "text-[#D97706]" },
                                    ].map((stat) => (
                                        <div key={stat.label} className="flex flex-col gap-0.5">
                                            <span className={`text-xs font-semibold ${stat.labelColor}`}>{stat.label}</span>
                                            <span className={`text-sm font-semibold ${stat.valueColor}`}>{stat.value}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Bed Layout Grid */}
                                <div className="flex flex-col gap-5">
                                    <h4 className="text-sm font-semibold text-[#262D3B]">Bed Layout</h4>

                                    {bedsByRow.map((row) => (
                                        <div key={row.rowName} className="flex flex-col gap-2">
                                            <span className="text-sm font-semibold text-[#434956]">{row.rowName}</span>
                                            <div className="grid grid-cols-4 gap-3">
                                                {row.beds.map((bed) => (
                                                    <BedCard
                                                        key={bed.id}
                                                        bed={bed}
                                                        isBedSelected={selectedBed === bed.id}
                                                        onClick={() => {
                                                            if (bed.status === "Available") {
                                                                setSelectedBed(bed.id);
                                                            } else {
                                                                alert(`Bed ${bed.id} is currently ${bed.status === "Occupied" ? "Occupied by " + bed.patientName : "Reserved on Hold"}.`);
                                                            }
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Action Buttons inside Sidebar */}
                                    <div className="flex items-center gap-3 mt-4 select-none">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-full !border-[#0B8C00] !text-[#0B8C00] hover:!bg-[#F2FAF2]"
                                            onClick={() => {
                                                setSelectedBed(null);
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="primary"
                                            className="w-full"
                                            onClick={() => {
                                                alert(`Bed ${selectedBed} in Room ${selectedRoom.roomNumber} allocated successfully!`);
                                            }}
                                            disabled={!selectedBed}
                                        >
                                            Confirm Bed Allocation ➔
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bottom Status / Confirmation Bar */}
                    <div className="w-full rounded-[20px] border border-[#DFE0E2] bg-white p-4 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 mt-0">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-[#0B8C00] flex items-center justify-center">
                                <Image
                                    src="/icons/bedDarkIcon.svg"
                                    alt=""
                                    width={24}
                                    height={24}
                                    className="shrink-0"
                                    style={{ filter: "brightness(0) invert(1)" }}
                                />
                            </div>
                            <div className="flex flex-col select-none">
                                <span className="text-xs font-semibold text-[#787E8C]">Confirming Allocation for</span>
                                <h4 className="font-extrabold text-[#262D3B] text-base">
                                    {selectedRoomId ? `Room ${selectedRoom?.roomNumber} (${activePackage.packageName || "Deluxe Single"})` : "Select an Available Room"}
                                </h4>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 select-none">
                            <Button
                                type="button"
                                variant="outline"
                                className="!border-[#0B8C00] !text-[#0B8C00] hover:!bg-[#F2FAF2] px-6 h-11 rounded-full font-bold"
                                onClick={() => {
                                    setSelectedRoomId(null);
                                    setSelectedBed(null);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="primary"
                                className="px-6 h-11 rounded-full font-bold"
                                disabled={!selectedRoomId}
                                onClick={() => {
                                    alert(`Room ${selectedRoom?.roomNumber} allocated successfully! Allocation Process Complete.`);
                                }}
                            >
                                Confirm Allocation ➔
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <PaymentDialogDetails
                open={isInvoiceDialogOpen}
                onClose={() => setIsInvoiceDialogOpen(false)}
                patientName="John Doe"
                address="House No. 123, Sector 62"
                cityName="S.A.S Nagar (Mohali)"
                stateName="Punjab"
                jsHealthCardNo=""
                uhid="JSKL41712025"
                consultationCharges={finalAmountPayable}
                subtotal={finalAmountPayable}
                tax={0}
                totalAmount={finalAmountPayable}
                billDate={new Date().toLocaleDateString("en-IN") + " " + new Date().toLocaleTimeString("en-IN")}
                transactionId={paymentMode === "split" ? "Split Payment" : (selectedMethod === "cash" ? "" : "TXN" + Date.now())}
                paymentMode={paymentMode}
                gstBilling={false}
                onPrint={() => window.print()}
                onSaveAndNext={() => {
                    setIsInvoiceDialogOpen(false);
                    setCurrentStep(3);
                }}
                onDownload={() => alert("Downloading invoice...")}
                canDownload={true}
                submitLabel="Save & Next"
                splitCashAmount={splitCashAmount}
                splitCashStatus={splitCashStatus}
                splitUpiAmount={splitUpiAmount}
                splitUpiStatus={splitUpiStatus}
                splitCardAmount={splitCardAmount}
                splitCardStatus={splitCardStatus}
                selectedOnlineSplitMethod={selectedOnlineSplitMethod}
            />
        </AppShell>
    );
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function numberToWords(num: number): string {
    if (num === 0) return "Zero Only";
    const a = [
        "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
        "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
    ];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    const format = (n: number): string => {
        if (n < 20) return a[n];
        const digit = n % 10;
        return b[Math.floor(n / 10)] + (digit !== 0 ? " " + a[digit] : "");
    };

    let words = "";

    const crore = Math.floor(num / 10000000);
    num %= 10000000;
    if (crore > 0) {
        words += format(crore) + " Crore ";
    }

    const lakh = Math.floor(num / 100000);
    num %= 100000;
    if (lakh > 0) {
        words += format(lakh) + " Lakh ";
    }

    const thousand = Math.floor(num / 1000);
    num %= 1000;
    if (thousand > 0) {
        words += format(thousand) + " Thousand ";
    }

    const hundred = Math.floor(num / 100);
    num %= 100;
    if (hundred > 0) {
        words += format(hundred) + " Hundred ";
    }

    if (num > 0) {
        if (words !== "") words += "and ";
        words += format(num) + " ";
    }

    return words.trim() + " Rupees Only";
}

// ─── STEP 3 HELPER SUB-COMPONENTS ────────────────────────────────────────────
interface StatCardProps {
    label: string;
    value: string | number;
    iconSrc: string;
}

function ManageRoomStatCard({ label, value, iconSrc }: StatCardProps) {
    return (
        <div className="rounded-[20px] p-5 bg-white flex justify-between items-center transition-all duration-200 hover:shadow-md select-none border border-[#E3EEE1]">
            <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-[#737A8B]">{label}</span>
                <h4 className="font-semibold text-[32px] leading-[120%] text-[#262D3B]">
                    {value}
                </h4>
            </div>
            <div className=" flex items-center justify-center">
                <Image
                    src={iconSrc}
                    alt={label}
                    width={42}
                    height={42}
                    className="shrink-0"
                />
            </div>
        </div>
    );
}

interface RoomItem {
    id: number;
    roomNumber: string;
    status: "Available" | "Limited" | "Full";
    floor: string;
    wardType: string;
    totalBeds: number;
    availableBeds: number;
}

interface RoomCardProps {
    room: RoomItem;
    isSelected: boolean;
    onClick: () => void;
}

function RoomCard({ room, isSelected, onClick }: RoomCardProps) {
    const borderClass = isSelected
        ? "border-[#0B8C00] ring-2 ring-[#0B8C00]/10"
        : "border-[#DFE0E2] hover:border-[#CBD5E1]";

    let badgeClass = "";
    if (room.status === "Available") {
        badgeClass = "text-[#0B8C00] border border-[#0B8C00]/30 bg-[#E3EEE1]/30";
    } else if (room.status === "Limited") {
        badgeClass = "text-[#D97706] border border-[#E8D7CA] bg-[#FFFBEB]";
    } else if (room.status === "Full") {
        badgeClass = "text-[#EF4444] border border-[#FCA5A5] bg-[#FEF2F2]";
    }

    return (
        <div
            onClick={onClick}
            className={`rounded-[20px] border bg-white flex flex-col select-none cursor-pointer transition-all duration-200 ${borderClass}`}
        >
            {/* 1. Header Row */}
            <div className="p-5 flex justify-between items-center border-b border-[#DFE0E2] gap-2 h-[72px]">
                <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-[#F5F6F8] text-[#787E8C] font-semibold text-sm flex items-center justify-center">
                        {room.id}
                    </span>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-[#787E8C] uppercase tracking-wider">Ward Room</span>
                        <span className="font-semibold text-sm text-[#262D3B]">{room.roomNumber}</span>
                    </div>
                </div>

                {/* Status Badge */}
                <span className={`text-[11px] font-semibold px-3 py-1 rounded-full ${badgeClass}`}>
                    {room.status}
                </span>
            </div>

            {/* 2. Middle Row (Body Info Grid) */}
            <div className="p-5 border-b border-[#DFE0E2] text-xs leading-normal flex flex-col justify-center h-[115px]">
                <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[#787E8C] font-semibold text-[10px]">Ward Type</span>
                        <span className="font-semibold text-[#262D3B] text-sm">{room.wardType}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[#787E8C] font-semibold text-[10px]">Floor</span>
                        <span className="font-semibold text-[#262D3B] text-sm">{room.floor}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[#787E8C] font-semibold text-[10px]">Total Beds</span>
                        <span className="font-bold text-[#262D3B] text-sm">{room.totalBeds}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[#787E8C] font-semibold text-[10px]">Available Beds</span>
                        <span className="font-bold text-[#262D3B] text-sm">{room.availableBeds}</span>
                    </div>
                </div>
            </div>

            {/* 3. Bottom Row (Full-width action button) */}
            <div className="p-4 flex items-center justify-center h-[68px]">
                <button
                    type="button"
                    className="w-full py-2.5 rounded-[100px] border border-[#0B8C00] text-[#0B8C00] bg-white font-extrabold text-xs hover:bg-[#F2FAF2] flex items-center justify-center gap-1.5 transition-all duration-200 shadow-sm"
                >
                    View Beds ➔
                </button>
            </div>
        </div>
    );
}

interface BedItem {
    id: string;
    label: string;
    status: "Available" | "Occupied" | "Reserved";
    patientName?: string;
    row: string;
}

interface BedCardProps {
    bed: BedItem;
    isBedSelected: boolean;
    onClick: () => void;
}

function BedCard({ bed, isBedSelected, onClick }: BedCardProps) {
    let styleClass = "";
    if (bed.status === "Available") {
        styleClass = isBedSelected
            ? "border-[#0B8C00] bg-[#E3EEE1]/40 ring-2 ring-[#0B8C00]/10"
            : "border-[#0B8C00] bg-[#F7FAF7] hover:bg-[#F2FAF2]";
    } else if (bed.status === "Occupied") {
        styleClass = "border-[#FCA5A5] bg-[#FEF2F2]";
    } else if (bed.status === "Reserved") {
        styleClass = "border-[#E8D7CA] bg-[#FFFBEB]";
    }

    return (
        <div
            onClick={onClick}
            className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-center cursor-pointer transition-all duration-200 min-h-[96px] justify-center ${styleClass}`}
        >
            <div className="w-5 h-5 flex items-center justify-center">
                <Image
                    src="/icons/bedDarkIcon.svg"
                    alt=""
                    width={16}
                    height={16}
                    className="shrink-0"
                    style={{
                        filter: bed.status === "Occupied"
                            ? "invert(31%) sepia(94%) saturate(4633%) hue-rotate(349deg) brightness(97%) contrast(93%)"
                            : "invert(36%) sepia(90%) saturate(1814%) hue-rotate(86deg) brightness(95%) contrast(101%)"
                    }}
                />
            </div>

            <span className={`font-semibold text-xs ${bed.status === "Occupied" ? "text-[#EF4444]" : "text-[#262D3B]"}`}>
                {bed.id}
            </span>

            <span className={`text-[10px] font-medium leading-tight ${bed.status === "Occupied"
                ? "text-[#EF4444]"
                : bed.status === "Reserved"
                    ? "text-[#D97706]"
                    : "text-[#434956]"
                }`}>
                {bed.status === "Reserved" ? "Reserved on Hold" : bed.status}
            </span>

            {bed.status === "Occupied" && bed.patientName && (
                <span className="text-[9px] font-normal text-[#787E8C] truncate max-w-full leading-tight">
                    {bed.patientName}
                </span>
            )}
        </div>
    );
}

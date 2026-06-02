"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { Badge } from "@/components/ui";
import RoomAllocation from "./roomAllowcation";
import AdmissionPayment from "./admission&payment";
import CreatePackage from "./createPackage";

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

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function StartCounsellingPage() {
    // Controlled Package Selection States
    const [selectedPackageId, setSelectedPackageId] = useState("pkg-1");
    const [numberOfDays, setNumberOfDays] = useState(5);
    const [applyOffer, setApplyOffer] = useState(true);
    const [offerTab, setOfferTab] = useState("bundled");
    const [selectedOfferId, setSelectedOfferId] = useState("off-b1");
    const [admissionType, setAdmissionType] = useState("immediate");

    // Stepper State
    const [currentStep, setCurrentStep] = useState(1);

    // Dynamic calculations based on selection
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
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                            currentStep >= 1 ? "bg-[#0B8C00] text-white" : "bg-white text-[#787E8C] border border-[#DFE0E2]"
                        }`}>
                            1
                        </div>
                        <span className={`text-xs font-semibold ${currentStep >= 1 ? "text-[#0B8C00]" : "text-[#787E8C]"}`}>Details</span>
                    </div>

                    {/* Connection bar 1 */}
                    <div className={`w-20 rounded-full mx-1 mt-[13px] transition-all duration-200 ${
                        currentStep > 1 ? "h-1 bg-[#0B8C00]" : "h-[2px] bg-[#DFE0E2]"
                    }`}></div>

                    {/* Step 2 */}
                    <div className="flex flex-col items-center gap-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                            currentStep >= 2 ? "bg-[#0B8C00] text-white" : "bg-white text-[#787E8C] border border-[#DFE0E2] opacity-50"
                        }`}>
                            2
                        </div>
                        <span className={`text-xs font-semibold ${currentStep >= 2 ? "text-[#0B8C00]" : "text-[#787E8C] opacity-50"}`}>Payment</span>
                    </div>

                    {/* Connection bar 2 */}
                    <div className={`w-20 rounded-full mx-1 mt-[13px] transition-all duration-200 ${
                        currentStep > 2 ? "h-1 bg-[#0B8C00]" : "h-[2px] bg-[#DFE0E2]"
                    }`}></div>

                    {/* Step 3 */}
                    <div className="flex flex-col items-center gap-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                            currentStep >= 3 ? "bg-[#0B8C00] text-white" : "bg-white text-[#787E8C] border border-[#DFE0E2] opacity-50"
                        }`}>
                            3
                        </div>
                        <span className={`text-xs font-semibold ${currentStep >= 3 ? "text-[#0B8C00]" : "text-[#787E8C] opacity-50"}`}>Room</span>
                    </div>
                </div>
            </div>

            {currentStep === 1 ? (
                /* STEP 1 - CREATE PACKAGE CONTENT */
                <CreatePackage
                    selectedPackageId={selectedPackageId}
                    setSelectedPackageId={setSelectedPackageId}
                    numberOfDays={numberOfDays}
                    setNumberOfDays={setNumberOfDays}
                    applyOffer={applyOffer}
                    setApplyOffer={setApplyOffer}
                    offerTab={offerTab}
                    setOfferTab={setOfferTab}
                    selectedOfferId={selectedOfferId}
                    setSelectedOfferId={setSelectedOfferId}
                    admissionType={admissionType}
                    setAdmissionType={setAdmissionType}
                    onNext={() => setCurrentStep(2)}
                    onCancel={() => alert("Cancellation triggered.")}
                />
            ) : currentStep === 2 ? (
                /* STEP 2 - ADMISSION & PAYMENT CONTENT */
                <AdmissionPayment
                    activePackage={activePackage}
                    finalAmountPayable={finalAmountPayable}
                    roomRentPerDay={roomRentPerDay}
                    medicinePerDay={medicinePerDay}
                    mealsPerDay={mealsPerDay}
                    doctorFee={doctorFee}
                    onNext={() => setCurrentStep(3)}
                    onBack={() => setCurrentStep(1)}
                />
            ) : (
                /* STEP 3 - ROOM ALLOCATION CONTENT */
                <RoomAllocation
                    activePackage={activePackage}
                    onConfirmAllocation={(allocation) => {
                        alert(`Bed \${allocation.bedNumber} in Room \${allocation.roomNumber} allocated successfully! Allocation Process Complete.`);
                    }}
                    onCancel={() => {
                        setCurrentStep(2);
                    }}
                />
            )}
        </AppShell>
    );
}

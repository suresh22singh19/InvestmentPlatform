"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { formatIndianAmount } from "@/store/utils/formatIndianAmount";
import { useFormik, type FormikErrors, type FormikProps, type FormikTouched } from "formik";
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
    MessageDialog,
    BackToPreviousPageButton,
} from "@/components/ui";
import {
    useGetCounsellorAllPackagesQuery,
    useGetActiveOfferListQuery,
    useCompletePatientAdmissionMutation,
    type ActiveOfferItem,
    type CompletePatientAdmissionRequest,
} from "@/store/api/counsellorApi";
import type { OfferPromotionType, PackageItem } from "@/store/api/settingsApi";
import { useGetPanelsQuery } from "@/store/api/settingsApi";
import {
    isPanelNameHiddenFromPanelTypeDropdown,
    findActivePanelIdByName,
    DEFAULT_PANEL_NAME_FOR_PRIVATE,
    DEFAULT_PANEL_NAME_FOR_TPA_TYPE,
} from "@/lib/registration/panelDropdownFilter";
import AddressDetails, { type AddressFormData } from "@/components/forms/AddressDetails";
import { isValidEmailAddress, sanitizeEmailInput } from "@/lib/utils/emailValidation";
import { useSearchParams, useRouter } from "next/navigation";

export interface AttendantDetailsFormData {
    attendantName: string;
    gender: string;
    phoneNumber: string;
    emailId: string;
    relationWithPatient: string;
    address: AddressFormData;
}

interface AttendantsFormValues {
    attendants: AttendantDetailsFormData[];
}

export interface EditAdmissionPrefill {
    diseaseType: string;
    admissionFilterType: string;
    packageId: string;
    offerApplied: boolean;
    offerId?: string;
    patientCategory?: string;
    panelId?: number;
    editPackage?: PackageItem;
}

const EMPTY_ATTENDANT_ADDRESS: AddressFormData = {
    pinCode: "",
    country: "6", // India — default for attendant address
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

function createEmptyAttendantForm(): AttendantDetailsFormData {
    return {
        attendantName: "",
        gender: "",
        phoneNumber: "",
        emailId: "",
        relationWithPatient: "",
        address: { ...EMPTY_ATTENDANT_ADDRESS },
    };
}

function createAttendantsInitialValues(
    attendantDetails: AttendantDetailsFormData[] | null
): AttendantsFormValues {
    return {
        attendants:
            attendantDetails && attendantDetails.length > 0
                ? attendantDetails.map((attendant) => ({
                      ...attendant,
                      address: { ...attendant.address },
                  }))
                : [createEmptyAttendantForm()],
    };
}

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

function getPackageTotalForDays(item: PackageItem | null | undefined, days: number): number {
    if (!item || days <= 0) return 0;
    return getPackageTotalPrice(item) * days;
}

interface OfferItem {
    id: string;
    badge: string;
    isRecommended: boolean;
    title: string;
    subtitle: string;
    complimentaryDays: number;
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

function mapPanelNameToPatientCategory(panelName?: string | null): string {
    const normalized = panelName?.trim().toLowerCase() ?? "";
    if (!normalized) return "";
    if (normalized === "tpa") return "tpa";
    if (normalized === "normal" || normalized === "private") return "normal";
    return "panel";
}

function mapPromotionTypeToOfferTab(promotionType: ActiveOfferItem["promotionType"]): string {
    if (promotionType === "flat_discount") return "flat";
    if (promotionType === "conditional_billing") return "conditional";
    return "bundled";
}

function normalizeOfferId(id: string | number | null | undefined): string {
    if (id == null || id === "") return "";
    return String(id);
}

function parseOfferNumber(value: number | string | null | undefined): number {
    if (value == null || value === "") return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function buildOfferSubtitle(offer: ActiveOfferItem): string {
    if (offer.promotionType === "bundled_stay") {
        return `Pay for ${offer.bundledStayDuration ?? 0} days, get ${offer.bundledFreeDays ?? 0} complimentary day(s). Applies to base room charges.`;
    }
    if (offer.promotionType === "flat_discount") {
        return `Flat ${parseOfferNumber(offer.flatDiscountPercentage)}% discount on total package pricing. Applicable to all services.`;
    }
    const minBill = parseOfferNumber(offer.condMinBillingAmount);
    const pct = parseOfferNumber(offer.flatDiscountPercentage);
    if (pct > 0) {
        const maxCap = parseOfferNumber(offer.condMaxDiscountCap);
        return `Minimum billing of ₹ ${minBill.toLocaleString()}. ${pct}% discount${maxCap > 0 ? ` up to ₹ ${maxCap.toLocaleString()}` : ""}.`;
    }
    return `Minimum billing of ₹ ${minBill.toLocaleString()}. Discount up to ₹ ${parseOfferNumber(offer.condMaxDiscountCap).toLocaleString()}.`;
}

function calculateBundledComplimentaryDays(
    numberOfDays: number,
    bundledStayDuration: number,
    bundledFreeDays: number
): number {
    if (numberOfDays <= 0 || bundledStayDuration <= 0 || bundledFreeDays <= 0) {
        return 0;
    }
    if (numberOfDays < bundledStayDuration) {
        return 0;
    }
    const bundleCount = Math.floor(numberOfDays / bundledStayDuration);
    return bundleCount * bundledFreeDays;
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
    numberOfDays: number
) {
    if (offer.promotionType === "bundled_stay") {
        const duration = offer.bundledStayDuration ?? 0;
        const freeDays = offer.bundledFreeDays ?? 0;
        const complimentaryDays = calculateBundledComplimentaryDays(
            numberOfDays,
            duration,
            freeDays
        );
        return {
            complimentaryDays,
            appliedDiscount: 0,
            bonusLabel:
                complimentaryDays > 0 ? `${numberOfDays}+${complimentaryDays}` : `${duration}+${freeDays}`,
        };
    }
    if (offer.promotionType === "flat_discount") {
        const pct = parseOfferNumber(offer.flatDiscountPercentage);
        return {
            complimentaryDays: 0,
            appliedDiscount: Math.round(originalTotal * pct / 100),
            bonusLabel: `Flat ${pct}%`,
        };
    }
    const minBill = parseOfferNumber(offer.condMinBillingAmount);
    if (originalTotal < minBill) {
        return { complimentaryDays: 0, appliedDiscount: 0, bonusLabel: "Conditional" };
    }

    const pct = parseOfferNumber(offer.flatDiscountPercentage);
    if (pct > 0) {
        let appliedDiscount = Math.round(originalTotal * pct / 100);
        const maxCap = parseOfferNumber(offer.condMaxDiscountCap);
        if (maxCap > 0) {
            appliedDiscount = Math.min(appliedDiscount, maxCap);
        }
        return {
            complimentaryDays: 0,
            appliedDiscount,
            bonusLabel: `${pct}%`,
        };
    }

    const discountValue = parseOfferNumber(offer.condDiscountValue);
    const maxCap = parseOfferNumber(offer.condMaxDiscountCap) || discountValue;
    const appliedDiscount = Math.min(discountValue, maxCap);
    return { complimentaryDays: 0, appliedDiscount, bonusLabel: "Conditional" };
}

function mapApiOfferToOfferItem(
    offer: ActiveOfferItem,
    originalTotal: number,
    numberOfDays: number
): OfferItem {
    const { badge, isRecommended } = getOfferBadge(offer, numberOfDays);
    const amounts = calculateOfferAmounts(offer, originalTotal, numberOfDays);
    return {
        id: String(offer.id),
        badge,
        isRecommended,
        title: offer.offerName,
        subtitle: buildOfferSubtitle(offer),
        ...amounts,
    };
}

function isSelectedOfferEffectivelyApplied(
    applyOffer: boolean,
    selectedOfferId: string,
    offerTab: string,
    complimentaryDays: number,
    packageAppliedDiscount: number
): boolean {
    if (!applyOffer || !selectedOfferId) return true;
    if (offerTab === "bundled") {
        return complimentaryDays > 0;
    }
    return packageAppliedDiscount > 0;
}

function buildOfferNotAppliedErrorMessage(
    offerTab: string,
    offerTitle: string,
    selectedOfferId: string,
    apiOffers: ActiveOfferItem[]
): string {
    const selectedApiOffer = apiOffers.find(
        (offer) => normalizeOfferId(offer.id) === normalizeOfferId(selectedOfferId)
    );
    const title = offerTitle || "Selected offer";
    if (offerTab === "bundled") {
        const minDays = selectedApiOffer?.bundledStayDuration ?? 0;
        return `${title} requires at least ${minDays} day(s) to apply. Increase the number of days or choose a different offer.`;
    }
    return `${title} does not apply to the current package and number of days. Choose a different offer or turn off Apply Special Offer.`;
}

const OFFER_SELECTION_REQUIRED_MESSAGE =
    "Please select an offer or turn off Apply Special Offer.";

function getOfferSelectionError(applyOffer: boolean, selectedOfferId: string): string | null {
    if (applyOffer && !selectedOfferId) {
        return OFFER_SELECTION_REQUIRED_MESSAGE;
    }
    return null;
}

function scrollToOfferValidationError() {
    const element = document.querySelector('[data-field="offerValidation"]');
    if (!(element instanceof HTMLElement)) return;
    setTimeout(() => {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
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
const TRUNCATED_TABLE_CELL_WIDTH = 412;
function TruncatedTableCell({ text }: { text: string }) {
  const value = text?.trim() ? text.trim() : "N/A";
  const textRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;

    const checkTruncation = () => {
      setIsTruncated(element.scrollWidth > element.clientWidth + 1);
    };

    checkTruncation();

    const observer = new ResizeObserver(checkTruncation);
    observer.observe(element);
    return () => observer.disconnect();
  }, [value]);

  return (
    <Tooltip
      position="top"
      maxWidth={360}
      disabled={!isTruncated}
      className="!overflow-visible !py-2.5"
      content={
        <p className="m-0 max-w-[340px] whitespace-normal break-words text-left text-xs leading-[1.6] text-[#262D3B]">
          {value}
        </p>
      }
    >
      <div
        className="flex min-w-0 items-center"
        style={{ width: TRUNCATED_TABLE_CELL_WIDTH, maxWidth: TRUNCATED_TABLE_CELL_WIDTH }}
      >
        <span
          ref={textRef}
          className="min-w-0 flex-1 overflow-hidden whitespace-nowrap"
        >
          {value}
        </span>
        {isTruncated ? <span className="shrink-0 pl-1.5 text-[#434956]">...</span> : null}
      </div>
    </Tooltip>
  );
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
    console.log("itemfyeyyet", item);
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
                {/* <div className="flex justify-between items-center px-4 py-3 border-b border-[#DFE0E2] text-sm bg-white">
            <span className="text-[14px] font-normal leading-[120%] tracking-[0px] text-[#434956]">
                Package Name
            </span>
                <span className="text-[14px] text-[#434956] font-bold truncate max-w-[60%] select-none">
                {item.packageName
                ? item.packageName.replace(/\b\w/g, (char) => char.toUpperCase())
                : "N/A"}
                </span>
                    
                </div> */}
                {/* Scrollable content */}
                <div className="max-h-[260px] custom-scroll overflow-y-auto">
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
                            <span className="text-[#262D3B] font-bold uppercase truncate max-w-[60%]">{item?.roomType?.name || "N/A"}</span>
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

            {/* Description */}
            <div className="flex flex-col gap-1 items-start">
                <span className="text-[16px] font-medium text-[#262D3B]">Description</span>
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
                <span className="text-[20px] text-[#262D3B] font-bold">Total Price</span>
                <span className="text-[18px] text-[#434956] font-bold">
                    ₹ {formatIndianAmount(totalPrice)}
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
            className={`relative flex flex-col gap-2.5 p-5 rounded-[16px] cursor-pointer select-none transition-all duration-200 ${isSelected
                    ? "border-2 border-[#0B8C00] bg-[#F2FAF2]"
                    : "border border-[#DFE0E2] bg-white hover:border-[#CBD5E1]"
                }`}
        >
            <span
                className={`text-[10px] font-extrabold uppercase tracking-wider ${isSelected ? "text-[#0B8C00]" : "text-[#262D3B]"
                    }`}
            >
                {offer.badge}
            </span>

            <h4 className="text-lg font-bold text-[#262D3B] leading-snug">
                {/* {formattedTitle} */}
                <TruncatedTableCell text={formattedTitle} />
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

interface PriceSummaryPanelProps {
    effectiveNumberOfDays: number;
    totalStayDays: number;
    complimentaryDays: number;
    originalTotal: number;
    packageAppliedDiscount: number;
    offerBonusLabel: string;
    finalAmountPayable: number;
    showOfferDiscounts: boolean;
    offerTab: string;
    showConfirmButton: boolean;
    admissionType: string;
    onConfirm: () => void;
    className?: string;
}

function PriceSummaryPanel({
    effectiveNumberOfDays,
    totalStayDays,
    complimentaryDays,
    originalTotal,
    packageAppliedDiscount,
    offerBonusLabel,
    finalAmountPayable,
    showOfferDiscounts,
    offerTab,
    showConfirmButton,
    admissionType,
    onConfirm,
    className = "",
}: PriceSummaryPanelProps) {
    const showComplimentaryDays =
        showOfferDiscounts && offerTab === "bundled" && complimentaryDays > 0;
    const showPackageAppliedDiscount =
        showOfferDiscounts && offerTab !== "bundled" && packageAppliedDiscount > 0;
    const hasOfferDetailRows = showComplimentaryDays || showPackageAppliedDiscount;
    const planLabel =
        complimentaryDays > 0
            ? `${totalStayDays} Days Total Stay`
            : `${effectiveNumberOfDays} Days Plan`;

    return (
        <div className={`w-full rounded-[24px] bg-[#0B8C00] text-white p-7 flex flex-col shadow-md justify-between ${className}`}>
            <div className="flex flex-col">
                <div className="flex justify-between items-center border-b border-white pb-4 select-none">
                    <h3 className="text-2xl font-bold tracking-tight">Price Summary</h3>
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                        {planLabel}
                    </span>
                </div>

                <div className="flex flex-col">
                    <div
                        className={`flex justify-between items-center py-4 text-base ${hasOfferDetailRows ? "border-b border-white" : ""
                            }`}
                    >
                        <span className="font-medium text-white/90">Original Total</span>
                        <span className="font-bold text-lg">₹ {originalTotal.toLocaleString()}</span>
                    </div>
                    {showComplimentaryDays ? (
                        <div className="flex justify-between items-center py-4 border-b border-white text-base">
                            <span className="font-bold">Complimentary Days ({offerBonusLabel})</span>
                            <span className="font-bold text-lg">+ {complimentaryDays} day(s)</span>
                        </div>
                    ) : null}
                    {showPackageAppliedDiscount ? (
                        <div className="flex justify-between items-center py-4 border-b border-white text-base">
                            <span className="font-bold">
                                Package Applied Discount
                                {offerBonusLabel && offerBonusLabel !== "Conditional" && offerBonusLabel !== "N/A"
                                    ? ` (${offerBonusLabel})`
                                    : ""}
                            </span>
                            <span className="font-bold text-lg">- ₹ {packageAppliedDiscount.toLocaleString()}</span>
                        </div>
                    ) : null}
                </div>
            </div>

            <div className={`flex flex-col ${showConfirmButton ? "mt-4" : ""}`}>
                <div
                    className={`flex justify-between items-end py-4 ${showConfirmButton
                            ? `${hasOfferDetailRows ? "" : "border-t border-white"} border-b border-white`
                            : "mt-4 border-t border-white"
                        }`}
                >
                    <div className="flex flex-col gap-1">
                        <span className="text-xs text-white/90 font-medium">Final Amount Payable</span>
                        <span className="text-2xl font-black leading-none">₹ {finalAmountPayable.toLocaleString()}</span>
                    </div>
                    <span className="text-sm font-bold tracking-wide mb-1 select-none">
                        Tax Included
                    </span>
                </div>

                {/* {showConfirmButton ? (
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={admissionType !== "scheduled"}
                        className={`w-full h-12 bg-white text-[#0B8C00] rounded-full font-bold text-sm flex items-center justify-center gap-2 mt-5 shadow-sm select-none transition-all duration-200 ${
                            admissionType !== "scheduled"
                                ? "cursor-not-allowed opacity-50"
                                : "cursor-pointer hover:bg-opacity-95 hover:scale-[1.005]"
                        }`}
                    >
                        Confirm Selection &gt;
                    </button>
                ) : null} */}
            </div>
        </div>
    );
}

// ─── MAIN CREATE PACKAGE COMPONENT ───────────────────────────────────────────
interface CreatePackageProps {
    patientCategory?:string;
    setPatientCategory: React.Dispatch<React.SetStateAction<string>>;
    initialAdmissionFilterType?: string;
    selectedPackageId: string;
    setSelectedPackageId: (id: string) => void;
    numberOfDays: number | null;
    setNumberOfDays: (days: number | null) => void;
    applyOffer: boolean;
    setApplyOffer: (apply: boolean) => void;
    offerTab: string;
    setOfferTab: (tab: string) => void;
    selectedOfferId: string;
    setSelectedOfferId: (id: string) => void;
    admissionType: string;
    setAdmissionType: (type: string) => void;
    onNext: () => void;
    onBack?: () => void;
    // onCancel?: () => void;
    onViewPatientOverview?: () => void | Promise<void>;
    isViewPatientLoading?: boolean;
    onActivePackageChange?: (pkg: PackageItem | null) => void;
    onFinalAmountPayableChange?: (amount: number) => void;
    onAttendantDetailsChange?: (data: AttendantDetailsFormData[] | null) => void;
    onCounsellingMetaChange?: (meta: {
        patientCategory: string;
        diseaseType: string;
        packageAdmissionType: string;
        applyOfferLabel: string;
    }) => void;
    onCounsellingDataChange?: (data: {
        patientType: string;
        diseaseType: string;
        originalAmount: number;
        discountAmount: number;
    }) => void;
    onAdmissionOfferChange?: (offer: { offerApplied: boolean; offerId?: number }) => void;
    getpatientBranchId?: string | number;
    appointmentId?: number;
    branchId?: string | number;
    editPrefill?: EditAdmissionPrefill | null;
    onPanelIdChange?: (panelId: number | undefined) => void;
    initialPanelId?: string | number;
}

interface CreatePackageStepFormValues {
    selectedPackageId: string;
    numberOfDays: string;
    admissionType: string;
}

const CREATE_PACKAGE_FIELD_ORDER: (keyof CreatePackageStepFormValues)[] = [
    "selectedPackageId",
    "numberOfDays",
    "admissionType",
];

function scrollToFirstCreatePackageError(
    errors: Partial<Record<keyof CreatePackageStepFormValues, string>>
) {
    const firstKey =
        CREATE_PACKAGE_FIELD_ORDER.find((key) => errors[key]) ??
        (Object.keys(errors)[0] as keyof CreatePackageStepFormValues | undefined);

    if (!firstKey) return;

    const element = document.querySelector(`[data-field="${firstKey}"]`);
    if (!(element instanceof HTMLElement)) return;

    setTimeout(() => {
        element.scrollIntoView({ behavior: "smooth", block: "center" });

        if (firstKey === "numberOfDays") {
            const input = element.querySelector("input");
            if (input instanceof HTMLInputElement) {
                setTimeout(() => input.focus(), 150);
            }
        }
    }, 100);
}

const ATTENDANT_FIELD_SUFFIXES = [
    "attendantName",
    "gender",
    "phoneNumber",
    "country",
    "pinCode",
    "state",
    "city",
    "address",
] as const;

function getAttendantDataField(index: number, suffix: (typeof ATTENDANT_FIELD_SUFFIXES)[number]) {
    return `attendant-${index}-${suffix}`;
}

function getAttendantAllTouched(attendants: AttendantDetailsFormData[]): FormikTouched<AttendantsFormValues> {
    return {
        attendants: attendants.map(() => ({
            attendantName: true,
            gender: true,
            phoneNumber: true,
            emailId: true,
            relationWithPatient: true,
            address: {
                pinCode: true,
                country: true,
                state: true,
                city: true,
                tehsil: true,
                area: true,
                address: true,
            },
        })),
    };
}

function validateAttendantDetails(values: AttendantDetailsFormData): FormikErrors<AttendantDetailsFormData> {
    const errors: FormikErrors<AttendantDetailsFormData> = {};
    const addressErrors: FormikErrors<AddressFormData> = {};

    if (!values.attendantName.trim()) {
        errors.attendantName = "Attendant name is required";
    }

    if (!values.gender) {
        errors.gender = "Gender is required";
    }

    if (!values.phoneNumber.trim()) {
        errors.phoneNumber = "Phone number is required";
    } else if (!/^[6-9]\d{9}$/.test(values.phoneNumber)) {
        errors.phoneNumber = "Phone number must be a valid 10-digit number starting with 6, 7, 8, or 9";
    }

    if (values.emailId.trim() && !isValidEmailAddress(values.emailId)) {
        errors.emailId = "Please enter a valid email address";
    }

    if (!values.address.country) {
        addressErrors.country = "Country is required";
    }
    if (!values.address.pinCode.trim()) {
        addressErrors.pinCode = "Pin code is required";
    }
    if (!values.address.state) {
        addressErrors.state = "State is required";
    }
    if (!values.address.city) {
        addressErrors.city = "City is required";
    }
    if (!values.address.address.trim()) {
        addressErrors.address = "Address is required";
    }

    if (Object.keys(addressErrors).length > 0) {
        errors.address = addressErrors;
    }

    return errors;
}

function validateAttendantsForm(values: AttendantsFormValues): FormikErrors<AttendantsFormValues> {
    const attendantErrors = values.attendants.map((attendant) => validateAttendantDetails(attendant));
    const hasErrors = attendantErrors.some((error) => Object.keys(error).length > 0);

    return hasErrors ? { attendants: attendantErrors } : {};
}

function getAttendantFieldError(
    formik: FormikProps<AttendantsFormValues>,
    index: number,
    field: keyof AttendantDetailsFormData
): string {
    const touched = formik.touched.attendants?.[index]?.[field];
    const attendantErrors = formik.errors.attendants?.[index];
    const error =
        attendantErrors && typeof attendantErrors === "object" && !Array.isArray(attendantErrors)
            ? attendantErrors[field]
            : undefined;

    return touched && typeof error === "string" ? error : "";
}

function getAttendantAddressFieldError(
    formik: FormikProps<AttendantsFormValues>,
    index: number,
    field: keyof AddressFormData
): string | undefined {
    const touched = formik.touched.attendants?.[index]?.address?.[field];
    const attendantErrors = formik.errors.attendants?.[index];
    const addressErrors =
        attendantErrors && typeof attendantErrors === "object" && !Array.isArray(attendantErrors)
            ? attendantErrors.address
            : undefined;
    const error =
        addressErrors && typeof addressErrors === "object" && !Array.isArray(addressErrors)
            ? addressErrors[field]
            : undefined;

    return touched && typeof error === "string" ? error : undefined;
}

function scrollToFirstAttendantError(errors: FormikErrors<AttendantsFormValues>) {
    if (!Array.isArray(errors.attendants)) return;

    for (let index = 0; index < errors.attendants.length; index += 1) {
        const attendantErrors = errors.attendants[index];
        if (!attendantErrors || typeof attendantErrors !== "object" || Array.isArray(attendantErrors)) {
            continue;
        }

        const flatErrors: Record<string, string> = {};

        if (typeof attendantErrors.attendantName === "string") {
            flatErrors[getAttendantDataField(index, "attendantName")] = attendantErrors.attendantName;
        }
        if (typeof attendantErrors.gender === "string") {
            flatErrors[getAttendantDataField(index, "gender")] = attendantErrors.gender;
        }
        if (typeof attendantErrors.phoneNumber === "string") {
            flatErrors[getAttendantDataField(index, "phoneNumber")] = attendantErrors.phoneNumber;
        }

        if (
            attendantErrors.address &&
            typeof attendantErrors.address === "object" &&
            !Array.isArray(attendantErrors.address)
        ) {
            if (typeof attendantErrors.address.country === "string") {
                flatErrors[getAttendantDataField(index, "country")] = attendantErrors.address.country;
            }
            if (typeof attendantErrors.address.pinCode === "string") {
                flatErrors[getAttendantDataField(index, "pinCode")] = attendantErrors.address.pinCode;
            }
            if (typeof attendantErrors.address.state === "string") {
                flatErrors[getAttendantDataField(index, "state")] = attendantErrors.address.state;
            }
            if (typeof attendantErrors.address.city === "string") {
                flatErrors[getAttendantDataField(index, "city")] = attendantErrors.address.city;
            }
            if (typeof attendantErrors.address.address === "string") {
                flatErrors[getAttendantDataField(index, "address")] = attendantErrors.address.address;
            }
        }

        const firstKey = ATTENDANT_FIELD_SUFFIXES.map((suffix) => getAttendantDataField(index, suffix)).find(
            (key) => flatErrors[key]
        );
        if (!firstKey) continue;

        const element = document.querySelector(`[data-field="${firstKey}"]`);
        if (!(element instanceof HTMLElement)) continue;

        setTimeout(() => {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            const input = element.querySelector("input, textarea");
            if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
                setTimeout(() => input.focus(), 150);
            } else {
                const trigger = element.querySelector('button[type="button"], [role="combobox"]');
                if (trigger instanceof HTMLElement) {
                    setTimeout(() => trigger.focus(), 150);
                }
            }
        }, 100);
        return;
    }
}

export default function CreatePackage({
    patientCategory,
    setPatientCategory,
    initialAdmissionFilterType = "",
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
    onBack,
    // onCancel,
    onViewPatientOverview,
    isViewPatientLoading = false,
    onActivePackageChange,
    onFinalAmountPayableChange,
    onAttendantDetailsChange,
    onCounsellingMetaChange,
    onCounsellingDataChange,
    onAdmissionOfferChange,
    appointmentId = 0,
    branchId,
    editPrefill = null,
    onPanelIdChange,
    initialPanelId,
}: CreatePackageProps) {
    const [completePatientAdmission, { isLoading: isTentativeSubmitting }] = useCompletePatientAdmissionMutation();
    const searchParams = useSearchParams();
    const [isAttendantsDialogOpen, setIsAttendantsDialogOpen] = useState(false);
    const [showAttendantConfirmDialog, setShowAttendantConfirmDialog] = useState(false);
    const [isTentativeDialogOpen, setIsTentativeDialogOpen] = useState(false);
    const [tentativeAdmissionDate, setTentativeAdmissionDate] = useState("");
    const [tentativeDateError, setTentativeDateError] = useState("");
    const [showTentativeSuccessDialog, setShowTentativeSuccessDialog] = useState(false);
    const [showTentativeErrorDialog, setShowTentativeErrorDialog] = useState(false);
    const [tentativeErrorMessage, setTentativeErrorMessage] = useState("");
    const [attendantDetails, setAttendantDetails] = useState<AttendantDetailsFormData[] | null>(null);
    const [offerValidationError, setOfferValidationError] = useState("");

    const [diseaseType, setDiseaseType] = useState("ckd");
    const [admissionFilterType, setAdmissionFilterType] = useState("ipd");
    const [sortBy, setSortBy] = useState("default");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [editPrefillApplied, setEditPrefillApplied] = useState(false);
    const [editOfferMetaApplied, setEditOfferMetaApplied] = useState(false);
    const [selectedPanelId, setSelectedPanelId] = useState("");
    // const branchhid = Number(searchParams?.get("branchId")) || null;
    const router = useRouter();
    // const authUserBranchId = useAppSelector(selectUserBranchId);
    const authUserBranchId = branchId;

    const resolvedQueryBranchId = useMemo(() => {
        const fromProp = Number(branchId);
        if (Number.isFinite(fromProp) && fromProp > 0) return fromProp;
        const fromAuth = Number(authUserBranchId);
        return Number.isFinite(fromAuth) && fromAuth > 0 ? fromAuth : 0;
    }, [branchId, authUserBranchId]);

    const isBranchIdReady = resolvedQueryBranchId > 0;

    const { data: panelsRes, isLoading: isLoadingPanels } = useGetPanelsQuery(
        isBranchIdReady ? { page: 1, limit: 100, branchId: resolvedQueryBranchId } : undefined,
        { skip: !isBranchIdReady }
    );

    const panelOptions = useMemo(() => {
        if (!panelsRes?.success || !Array.isArray(panelsRes.data)) return [];
        return panelsRes.data
            .filter(
                (p) =>
                    (p.status === "active" || p.status === "Active") &&
                    !isPanelNameHiddenFromPanelTypeDropdown(p.name)
            )
            .map((p) => ({ value: String(p.id), label: p.name }));
    }, [panelsRes]);

    const privateDefaultPanelId = useMemo(
        () => findActivePanelIdByName(panelsRes?.data, DEFAULT_PANEL_NAME_FOR_PRIVATE),
        [panelsRes?.data]
    );
    const tpaDefaultPanelId = useMemo(
        () => findActivePanelIdByName(panelsRes?.data, DEFAULT_PANEL_NAME_FOR_TPA_TYPE),
        [panelsRes?.data]
    );

    const resolvedPackagePanelId = useMemo(() => {
        if (patientCategory === "panel" && selectedPanelId) {
            const parsed = Number.parseInt(selectedPanelId, 10);
            return Number.isFinite(parsed) ? parsed : undefined;
        }
        if (patientCategory === "tpa") return tpaDefaultPanelId;
        if (patientCategory === "normal") return privateDefaultPanelId;
        return undefined;
    }, [patientCategory, selectedPanelId, tpaDefaultPanelId, privateDefaultPanelId]);

    // const shouldSkipPackagesQuery =
    //     !isBranchIdReady ||
    //     (patientCategory === "panel" && !selectedPanelId) ||
    //     ((patientCategory === "tpa" || patientCategory === "normal") &&
    //         (isLoadingPanels || resolvedPackagePanelId == null));

 const shouldSkipPackagesQuery =
  !resolvedPackagePanelId || !Number.isFinite(resolvedPackagePanelId);

    useEffect(() => {
        onPanelIdChange?.(resolvedPackagePanelId);
    }, [resolvedPackagePanelId, onPanelIdChange]);

    // console.log("applyOfferhfajjash",applyOffer)

    useEffect(() => {
        if (initialPanelId == null || initialPanelId === "") return;
        const panelIdStr = String(initialPanelId);
        if (!panelOptions.some((option) => option.value === panelIdStr)) return;
        setSelectedPanelId(panelIdStr);
    }, [initialPanelId, panelOptions]);

    useEffect(() => {
        if (!editPrefill?.panelId || editPrefill.patientCategory !== "panel") return;
        const panelIdStr = String(editPrefill.panelId);
        if (!panelOptions.some((option) => option.value === panelIdStr)) return;
        setSelectedPanelId(panelIdStr);
    }, [editPrefill?.panelId, editPrefill?.patientCategory, panelOptions]);

    useEffect(() => {
        if (!initialAdmissionFilterType || editPrefill) return;
        setAdmissionFilterType(initialAdmissionFilterType);
    }, [initialAdmissionFilterType, editPrefill]);

    useEffect(() => {
        if (!editPrefill || editPrefillApplied) return;
        setDiseaseType(editPrefill.diseaseType);
        setAdmissionFilterType(editPrefill.admissionFilterType);
        if (editPrefill.patientCategory) {
            setPatientCategory(editPrefill.patientCategory);
        }
        if (editPrefill.patientCategory === "panel" && editPrefill.panelId != null) {
            setSelectedPanelId(String(editPrefill.panelId));
        }
        setSelectedPackageId(editPrefill.packageId);
        setApplyOffer(editPrefill.offerApplied);
        if (editPrefill.offerId) {
            setSelectedOfferId(normalizeOfferId(editPrefill.offerId));
        }
        setEditPrefillApplied(true);
    }, [
        editPrefill,
        editPrefillApplied,
        setPatientCategory,
        setSelectedPackageId,
        setApplyOffer,
        setSelectedOfferId,
    ]);

    const { data: allOffersForEditRes } = useGetActiveOfferListQuery(
        {
            page: "",
            limit: "",
            sortBy: "",
            order: "asc" as const,
            branchId: resolvedQueryBranchId,
        },
        {
            skip: !editPrefill?.offerId || !isBranchIdReady,
        }
    );

    useEffect(() => {
        if (!editPrefill?.offerId || !allOffersForEditRes?.data?.length || editOfferMetaApplied) return;
        const normalizedEditId = normalizeOfferId(editPrefill.offerId);
        const match = allOffersForEditRes.data.find(
            (offer) => normalizeOfferId(offer.id) === normalizedEditId
        );
        if (!match) return;

        setPatientCategory(mapPanelNameToPatientCategory(match.panelName));
        setOfferTab(mapPromotionTypeToOfferTab(match.promotionType));
        if (!selectedOfferId) {
            setSelectedOfferId(normalizedEditId);
        }
        setEditOfferMetaApplied(true);
    }, [
        allOffersForEditRes?.data,
        editPrefill?.offerId,
        editOfferMetaApplied,
        selectedOfferId,
        setOfferTab,
        setSelectedOfferId,
    ]);

    useEffect(() => {
        if (patientCategory && patientCategory !== "panel") {
            setSelectedPanelId("");
        }
    }, [patientCategory]);

    useEffect(() => {
        setCurrentPage(1);
    }, [patientCategory, diseaseType, admissionFilterType, selectedPanelId]);

    // console.log("resolvedQueryBranchIdgsydgysg",resolvedQueryBranchId)

    const getAllPackagesParams = useMemo(() => ({
        page: currentPage,
        limit: itemsPerPage,
        sortBy: "",
        order: "ASC" as const,
        branchId: resolvedQueryBranchId,
        packageType: mapAdmissionTypeToApi(admissionFilterType),
        diseaseCategoryType: mapDiseaseTypeToApi(diseaseType),
        ...(resolvedPackagePanelId != null && Number.isFinite(resolvedPackagePanelId)
            ? { panelId: resolvedPackagePanelId }
            : {}),
        isPackageActive: true,
    }), [
        currentPage,
        itemsPerPage,
        resolvedQueryBranchId,
        admissionFilterType,
        diseaseType,
        resolvedPackagePanelId,
    ]);

    const {
        data: packagesRes,
        isLoading: isPackagesLoading,
        isError: isPackagesError,
    } = useGetCounsellorAllPackagesQuery(getAllPackagesParams, { skip: shouldSkipPackagesQuery });

    const packagesList = packagesRes?.data || [];
    const totalPackages = packagesRes?.total || 0;
    const isAwaitingPanelSelection = patientCategory === "panel" && !selectedPanelId;

    const packagesForDisplay = useMemo(() => {
        const list = [...packagesList];
        const editPkg = editPrefill?.editPackage;
        if (!editPkg) return list;
        const exists = list.some((pkg) => String(pkg.id) === String(editPkg.id));
        if (exists) return list;
        return [editPkg, ...list];
    }, [packagesList, editPrefill?.editPackage]);

    useEffect(() => {
        if (!editPrefill || !editPrefillApplied || patientCategory) return;
        const pkg =
            packagesForDisplay.find((p) => String(p.id) === editPrefill.packageId) ??
            editPrefill.editPackage;
        if (!pkg) return;

        const category = editPrefill.patientCategory || mapPanelNameToPatientCategory(pkg.panelName);
        if (category) {
            setPatientCategory(category);
        }
        if (category === "panel") {
            const panelId = editPrefill.panelId ?? pkg.panelId;
            if (panelId != null) {
                setSelectedPanelId(String(panelId));
            }
        }
    }, [editPrefill, editPrefillApplied, packagesForDisplay, patientCategory, setPatientCategory]);

    const resolvedOfferPanelName = useMemo(() => {
        if (!patientCategory) return undefined;
        if (patientCategory === "panel") {
            if (!selectedPanelId) return undefined;
            return panelOptions.find((option) => option.value === selectedPanelId)?.label;
        }
        return mapPatientCategoryToPanelName(patientCategory);
    }, [patientCategory, selectedPanelId, panelOptions]);

    const offerListParams = useMemo(() => ({
        page: "",
        limit: "",
        sortBy: "",
        order: "asc" as const,
        branchId: resolvedQueryBranchId,
        promotionType: mapOfferTabToPromotionType(offerTab),
        panelName: resolvedOfferPanelName,
    }), [offerTab, resolvedOfferPanelName, resolvedQueryBranchId]);

    const shouldSkipOfferListQuery =
        !(applyOffer && isBranchIdReady) ||
        (patientCategory === "panel" && !selectedPanelId);

    const {
        data: offersRes,
        isLoading: isOffersLoading,
        isError: isOffersError,
    } = useGetActiveOfferListQuery(offerListParams, {
        skip: shouldSkipOfferListQuery,
    });

    useEffect(() => {
        if (!onAdmissionOfferChange) return;

        if (!applyOffer || !selectedOfferId) {
            onAdmissionOfferChange({ offerApplied: false });
            return;
        }

        if (isOffersLoading || offersRes === undefined) return;

        const apiOffers = offersRes.data ?? [];
        const offerExists = apiOffers.some(
            (offer) => normalizeOfferId(offer.id) === normalizeOfferId(selectedOfferId)
        );

        if (!apiOffers.length || !offerExists) {
            onAdmissionOfferChange({ offerApplied: false });
            return;
        }

        onAdmissionOfferChange({
            offerApplied: true,
            offerId: Number(selectedOfferId),
        });
    }, [
        onAdmissionOfferChange,
        applyOffer,
        selectedOfferId,
        isOffersLoading,
        offersRes,
    ]);

    // Options for Custom Tabs Component
    const patientCategoryOptions = [
        { value: "normal", label: "Private" },
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
        const sorted = [...packagesForDisplay];
        if (sortBy === "high-to-low") {
            sorted.sort((a, b) => getPackageTotalPrice(b) - getPackageTotalPrice(a));
        } else if (sortBy === "low-to-high") {
            sorted.sort((a, b) => getPackageTotalPrice(a) - getPackageTotalPrice(b));
        }
        return sorted;
    }, [packagesForDisplay, sortBy]);

    useEffect(() => {
        if (sortedPackages.length === 0) return;
        if (!selectedPackageId) return;
        const isEditPrefillPackage =
            editPrefill?.packageId != null && selectedPackageId === editPrefill.packageId;
        const currentExists = sortedPackages.some((pkg) => String(pkg.id) === selectedPackageId);
        if (!currentExists && isEditPrefillPackage && editPrefill?.editPackage) return;
        if (!currentExists) {
            setSelectedPackageId("");
        }
    }, [sortedPackages, selectedPackageId, setSelectedPackageId, editPrefill]);

    // Price summary calculations
    const activePackage = useMemo(() => {
        if (!selectedPackageId) return null;
        return sortedPackages.find((pkg) => String(pkg.id) === selectedPackageId) ?? null;
    }, [sortedPackages, selectedPackageId]);

    console.log("activePackagesdfsdh",activePackage)

    useEffect(() => {
        onActivePackageChange?.(activePackage);
    }, [activePackage, onActivePackageChange]);

    const effectiveNumberOfDays = numberOfDays ?? 0;

    const originalTotal = useMemo(() => {
        return getPackageTotalForDays(activePackage, effectiveNumberOfDays);
    }, [activePackage, effectiveNumberOfDays]);

    const activeCategoryOffers = useMemo(() => {
        return (offersRes?.data || []).map((offer) =>
            mapApiOfferToOfferItem(offer, originalTotal, effectiveNumberOfDays)
        );
    }, [offersRes?.data, originalTotal, effectiveNumberOfDays]);

    useEffect(() => {
        if (!applyOffer || activeCategoryOffers.length === 0) return;
        const normalizedSelectedId = normalizeOfferId(selectedOfferId);
        if (!normalizedSelectedId) return;
        const currentExists = activeCategoryOffers.some(
            (offer) => normalizeOfferId(offer.id) === normalizedSelectedId
        );
        if (!currentExists) {
            setSelectedOfferId("");
        }
    }, [
        applyOffer,
        activeCategoryOffers,
        selectedOfferId,
        setSelectedOfferId,
    ]);

    const activeOffer = useMemo(() => {
        const emptyOffer = {
            complimentaryDays: 0,
            appliedDiscount: 0,
            bonusLabel: "N/A",
            title: "",
        };
        if (!applyOffer || activeCategoryOffers.length === 0 || !selectedOfferId) {
            return emptyOffer;
        }
        const normalizedSelectedId = normalizeOfferId(selectedOfferId);
        return (
            activeCategoryOffers.find(
                (off) => normalizeOfferId(off.id) === normalizedSelectedId
            ) ?? emptyOffer
        );
    }, [applyOffer, activeCategoryOffers, selectedOfferId]);

    const complimentaryDays = useMemo(() => {
        return applyOffer && offerTab === "bundled" ? activeOffer.complimentaryDays : 0;
    }, [applyOffer, offerTab, activeOffer.complimentaryDays]);

    const totalStayDays = effectiveNumberOfDays + complimentaryDays;

    const packageAppliedDiscount = useMemo(() => {
        return applyOffer && offerTab !== "bundled" ? activeOffer.appliedDiscount : 0;
    }, [applyOffer, offerTab, activeOffer.appliedDiscount]);

    const finalAmountPayable = useMemo(() => {
        return Math.max(0, originalTotal - packageAppliedDiscount);
    }, [originalTotal, packageAppliedDiscount]);

    useEffect(() => {
        onFinalAmountPayableChange?.(finalAmountPayable);
    }, [finalAmountPayable, onFinalAmountPayableChange]);

    console.log("activeOffer", activeOffer)

    useEffect(() => {
        onCounsellingMetaChange?.({
            patientCategory:
                patientCategoryOptions.find((o) => o.value === patientCategory)?.label ?? "N/A",
            diseaseType:
                diseaseTypeOptions.find((o) => o.value === diseaseType)?.label ?? "N/A",
            packageAdmissionType:
                admissionFilterOptions.find((o) => o.value === admissionFilterType)?.label ?? "N/A",
            applyOfferLabel: applyOffer && selectedOfferId ? activeOffer.title || "Applied" : "Not Applied",
        });
    }, [
        patientCategory,
        diseaseType,
        admissionFilterType,
        applyOffer,
        selectedOfferId,
        activeOffer.title,
        onCounsellingMetaChange,
    ]);

    useEffect(() => {
        onCounsellingDataChange?.({
            patientType: admissionFilterType,
            diseaseType: mapDiseaseTypeToApi(diseaseType) || diseaseType,
            originalAmount: originalTotal,
            discountAmount: packageAppliedDiscount,
        });
    }, [
        admissionFilterType,
        diseaseType,
        originalTotal,
        packageAppliedDiscount,
        onCounsellingDataChange,
    ]);

    const offerBonusLabel = activeOffer.bonusLabel;

    const attendantFormik = useFormik<AttendantsFormValues>({
        enableReinitialize: true,
        initialValues: createAttendantsInitialValues(attendantDetails),
        validate: validateAttendantsForm,
        onSubmit: (values) => {
            const nextAttendants = values.attendants.map((attendant) => ({
                ...attendant,
                address: { ...attendant.address },
            }));
            setAttendantDetails(nextAttendants);
            onAttendantDetailsChange?.(nextAttendants);
            setIsAttendantsDialogOpen(false);
            const offerSelectionError = getOfferSelectionError(applyOffer, selectedOfferId);
            if (offerSelectionError) {
                setOfferValidationError(offerSelectionError);
                scrollToOfferValidationError();
                return;
            }
            onNext();
        },
    });

    useEffect(() => {
        if (!isAttendantsDialogOpen) return;
        void attendantFormik.resetForm({
            values: createAttendantsInitialValues(attendantDetails),
            touched: {},
            errors: {},
        });
    }, [isAttendantsDialogOpen, attendantDetails]);

    const handleAddAttendant = () => {
        if (attendantFormik.values.attendants.length >= 5) return;
        void attendantFormik.setFieldValue("attendants", [
            ...attendantFormik.values.attendants,
            createEmptyAttendantForm(),
        ]);
    };

    const handleRemoveAttendant = (index: number) => {
        if (attendantFormik.values.attendants.length <= 1) return;
        void attendantFormik.setFieldValue(
            "attendants",
            attendantFormik.values.attendants.filter((_, attendantIndex) => attendantIndex !== index)
        );
    };

    const formik = useFormik<CreatePackageStepFormValues>({
        enableReinitialize: true,
        initialValues: {
            selectedPackageId,
            numberOfDays: numberOfDays === null ? "" : String(numberOfDays),
            admissionType,
        },
        validate: (values) => {
            const errors: Partial<Record<keyof CreatePackageStepFormValues, string>> = {};

            if (values.admissionType === "tentative") {
                return errors;
            }

            if (!values.selectedPackageId) {
                errors.selectedPackageId = "Please select a package.";
            }

            if (!values.numberOfDays.trim()) {
                errors.numberOfDays = "Please enter number of days.";
            } else if (Number(values.numberOfDays) <= 0) {
                errors.numberOfDays = "Number of days must be greater than 0.";
            }

            if (!values.admissionType) {
                errors.admissionType = "Please select admission type.";
            }

            return errors;
        },
        onSubmit: (values) => {
            if (values.admissionType === "immediate") {
                setShowAttendantConfirmDialog(true);
                return;
            }

            if (values.admissionType === "tentative") {
                setTentativeAdmissionDate("");
                setTentativeDateError("");
                setIsTentativeDialogOpen(true);
                return;
            }

            onNext();
        },
    });

    const packageFieldError =
        formik.touched.selectedPackageId && formik.errors.selectedPackageId
            ? formik.errors.selectedPackageId
            : "";
    const numberOfDaysFieldError =
        formik.touched.numberOfDays && formik.errors.numberOfDays
            ? formik.errors.numberOfDays
            : "";
    const admissionTypeFieldError =
        formik.touched.admissionType && formik.errors.admissionType
            ? formik.errors.admissionType
            : "";

    const handleAdmissionTypeSelect = (type: typeof ADMISSION_TYPE_OPTIONS[number]["type"]) => {
        setAdmissionType(type);
        void formik.setFieldValue("admissionType", type, false);
        void formik.setFieldTouched("admissionType", true, false);
        setIsAttendantsDialogOpen(false);
        setShowAttendantConfirmDialog(false);
        setIsTentativeDialogOpen(false);
    };

    const validateOfferSelectionOrSetError = (): boolean => {
        const offerSelectionError = getOfferSelectionError(applyOffer, selectedOfferId);
        if (offerSelectionError) {
            setOfferValidationError(offerSelectionError);
            scrollToOfferValidationError();
            return false;
        }
        return true;
    };

    const handleNextClick = async () => {
        if (admissionType === "tentative") {
            if (!validateOfferSelectionOrSetError()) return;
            setTentativeAdmissionDate("");
            setTentativeDateError("");
            setIsTentativeDialogOpen(true);
            return;
        }

        const errors = await formik.validateForm();

        await formik.setTouched(
            {
                selectedPackageId: true,
                numberOfDays: true,
                admissionType: true,
            },
            false
        );

        if (Object.keys(errors).length > 0) {
            scrollToFirstCreatePackageError(errors);
            return;
        }

        if (!validateOfferSelectionOrSetError()) {
            return;
        }

        if (
            applyOffer &&
            selectedOfferId &&
            !isSelectedOfferEffectivelyApplied(
                applyOffer,
                selectedOfferId,
                offerTab,
                complimentaryDays,
                packageAppliedDiscount
            )
        ) {
            setOfferValidationError(
                buildOfferNotAppliedErrorMessage(
                    offerTab,
                    activeOffer.title,
                    selectedOfferId,
                    offersRes?.data ?? []
                )
            );
            setSelectedOfferId("");
            scrollToOfferValidationError();
            return;
        }

        setOfferValidationError("");
        formik.handleSubmit();
    };

    const handleAttendantDetailsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const errors = await attendantFormik.validateForm();
        attendantFormik.setErrors(errors);
        await attendantFormik.setTouched(
            getAttendantAllTouched(attendantFormik.values.attendants),
            false
        );

        if (Object.keys(errors).length > 0) {
            scrollToFirstAttendantError(errors);
            return;
        }

        attendantFormik.handleSubmit();
    };

    const handleAttendantDialogClose = () => {
        attendantFormik.resetForm();
        setIsAttendantsDialogOpen(false);
        if (!attendantDetails) {
            setAdmissionType("");
            void formik.setFieldValue("admissionType", "", false);
        }
    };

    const handleTentativeDialogClose = () => {
        setTentativeDateError("");
        setTentativeAdmissionDate("");
        setIsTentativeDialogOpen(false);
        setAdmissionType("");
    };

    const handleTentativeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tentativeAdmissionDate) {
            setTentativeDateError("Please select a proposed admission date.");
            return;
        }
        if (!validateOfferSelectionOrSetError()) {
            setIsTentativeDialogOpen(false);
            return;
        }
        if (!appointmentId) {
            setTentativeErrorMessage("Appointment ID is missing. Please return to the dashboard and select a patient.");
            setShowTentativeErrorDialog(true);
            return;
        }

        const apiOffers = offersRes?.data ?? [];
        const includeOffer = Boolean(
            selectedPackageId &&
            applyOffer &&
            selectedOfferId &&
            apiOffers.length > 0 &&
            apiOffers.some((offer) => String(offer.id) === selectedOfferId)
        );
        const payload: CompletePatientAdmissionRequest = {
            branchId: resolvedQueryBranchId,
            appointmentId,
            patientType: admissionFilterType,
            diseaseType: mapDiseaseTypeToApi(diseaseType) || diseaseType,
            packageId: Number(selectedPackageId) || 0,
            numberOfDays: effectiveNumberOfDays,
            offerApplied: includeOffer,
            ...(includeOffer ? { offerId: Number(selectedOfferId) } : {}),

            // panelID

            // ...(resolvedPackagePanelId != null && Number.isFinite(resolvedPackagePanelId)
            //     ? { panelId: resolvedPackagePanelId }
            //     : {}),

            admissionType: "Tentative",
            admissionDate: tentativeAdmissionDate,
            originalAmount: originalTotal,
            discountAmount: packageAppliedDiscount,
            netPayable: finalAmountPayable,
            paymentMode: "completed",
            paymentMethod: "Cash",
            transactionId: "",
            paymentStatus: "Pending",
            receivedAmount: 0,
        };

        try {
            const res = await completePatientAdmission(payload).unwrap();
            if (res.success) {
                setIsTentativeDialogOpen(false);
                setShowTentativeSuccessDialog(true);
            } else {
                setTentativeErrorMessage(res.message || "Failed to submit tentative admission.");
                setShowTentativeErrorDialog(true);
            }
        } catch (err: unknown) {
            const apiErr = err as { data?: { message?: string }; message?: string };
            setTentativeErrorMessage(
                apiErr?.data?.message || apiErr?.message || "An error occurred while submitting tentative admission."
            );
            setShowTentativeErrorDialog(true);
        }
    };

    // const handleDetailsCancel = () => {
    //     setIsAttendantsDialogOpen(false);
    //     setIsTentativeDialogOpen(false);
    //     setTentativeAdmissionDate("");
    //     setTentativeDateError("");
    //     setAttendantDetails(null);
    //     // setAttendantFormData({ ...EMPTY_ATTENDANT_FORM, address: { ...EMPTY_ATTENDANT_ADDRESS } });
    //     // setAttendantFormErrors({});
    //     setPatientCategory("panel");
    //     setDiseaseType("other");
    //     setAdmissionFilterType("day_care");
    //     setSortBy("default");
    //     setCurrentPage(1);
    //     setItemsPerPage(10);
    //     onAttendantDetailsChange?.(null);
    //     onCancel?.();
    // };

    return (
        <div className="w-full rounded-[20px] border border-[#DFE0E2] p-3 mt-6">
            {/* 2. THREE FILTERS SECTION */}
            <div className="w-full rounded-[20px] flex flex-wrap items-center gap-8 pb-4">
                {/* Patient Category */}
                <div className="flex flex-col gap-2 min-w-[350px] p-2 rounded-[8px] border border-[#DFE0E2]">
                    <span className="text-xs font-normal text-[#525763] tracking-wider px-1 pt-2">Patient Category</span>
                    <div className="w-[450px] shrink-0">
                        <Tabs
                            options={patientCategoryOptions}
                            value={patientCategory || "" }
                            onChange={(val) => setPatientCategory(val)}
                            className="border-0 !h-full"
                            tabBorder={true}
                        />
                    </div>
                    {patientCategory === "panel" && (
                        <div className="w-[450px] shrink-0 px-1 pb-2">
                            <FormSelectField
                                label=""
                                value={selectedPanelId || null}
                                onChange={(val) => {
                                    const v = Array.isArray(val) ? (val[0] ?? "") : (val ?? "");
                                    setSelectedPanelId(v);
                                }}
                                options={panelOptions}
                                placeholder={
                                    isLoadingPanels
                                        ? "Loading panels..."
                                        : !isBranchIdReady
                                          ? "Branch not available"
                                          : "Select Panel"
                                }
                                mode="single"
                                background="white"
                                disabled={!isBranchIdReady || isLoadingPanels}
                            />
                        </div>
                    )}
                </div>

                {/* Disease Type */}
                <div className="flex flex-col gap-2 min-w-[350px] p-2 rounded-[8px] border border-[#DFE0E2]">
                    <span className="text-xs font-normal text-[#525763] tracking-wider px-1 pt-2">Disease Type</span>
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
                <div className="flex flex-col gap-2 min-w-[350px] p-2 rounded-[8px] border border-[#DFE0E2]">
                    <span className="text-xs font-normal text-[#525763] tracking-wider px-1 pt-2">Patient Type</span>
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
                        <h3 className="text-[18px] font-semibold text-[#434956]" style={{ marginBottom: 2 }}>Filter</h3>

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
                                {isAwaitingPanelSelection
                                    ? "Select a panel to view packages"
                                    : `${totalPackages} Package${totalPackages === 1 ? "" : "s"} available`}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-4 scroll-mt-6" data-field="selectedPackageId">
                        <div
                            className="w-full text-[24px] font-semibold text-[#262D3B]"
                            style={{ marginBottom: "-14px" }}
                        >
                            Select Package
                        </div>

                        {isPackagesLoading ? (
                            <div className="flex items-center justify-center py-16">
                                <SpinnerLoader size={32} />
                            </div>
                        ) : isPackagesError ? (
                            <div className="py-12 text-center text-sm font-normal leading-[120%] text-[#9FA2AB]">
                                Facing server API error
                            </div>
                        ) : isAwaitingPanelSelection ? (
                            <div className="py-12 text-center text-sm font-normal leading-[120%] text-[#9FA2AB]">
                                Please select a panel to view packages
                            </div>
                        ) : sortedPackages.length === 0 ? (
                            formik.touched.selectedPackageId ? (
                                <div className="py-12 text-center text-sm font-normal leading-[120%] text-[#F87171]">
                                    No package found. Please add a package before proceeding.
                                </div>
                            ) : (
                                <div className="py-12 text-center text-sm font-normal leading-[120%] text-[#9FA2AB]">
                                    No package found.
                                </div>
                            )
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {sortedPackages.map((pkg) => (
                                        <PackageListCard
                                            key={pkg.id}
                                            item={pkg}
                                            isSelected={selectedPackageId === String(pkg.id)}
                                            onSelect={() => {
                                                setSelectedPackageId(String(pkg.id));
                                                void formik.setFieldValue("selectedPackageId", String(pkg.id), false);
                                                void formik.setFieldTouched("selectedPackageId", true, false);
                                            }}
                                        />
                                    ))}
                                </div>
                                {packageFieldError ? (
                                    <p className="text-sm text-[#F6776E]">{packageFieldError}</p>
                                ) : null}
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
                </div>

                {/* 4. NUMBER OF DAYS INPUT */}
                <div
                    className="w-full bg-white py-6 rounded-[20px] flex flex-col gap-3 scroll-mt-6"
                    data-field="numberOfDays"
                >
                    <span className="text-xl font-bold text-[#262D3B]">Number of Days</span>
                    <FormInputField
                        label=""
                        type="text"
                        inputMode="numeric"
                        placeholder="Enter number of days"
                        value={numberOfDays === null ? "" : String(numberOfDays)}
                        onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "");
                            setNumberOfDays(value === "" ? null : Number(value));
                            setOfferValidationError("");
                            void formik.setFieldValue("numberOfDays", value, false);
                            void formik.setFieldTouched("numberOfDays", true, false);
                        }}
                        height={52}
                        error={numberOfDaysFieldError}
                    />
                </div>

                {/* 5. APPLY SPECIAL OFFER SECTION */}
                <div className="w-full flex flex-col gap-6">
                    <div className="flex items-center gap-3 select-none">
                        <span className="text-xl font-bold text-[#262D3B]">Apply Special Offer</span>
                        <Toggle
                            checked={applyOffer}
                            onChange={(val) => {
                                setApplyOffer(val);
                                setOfferValidationError("");
                            }}
                            className="!w-10 !h-6"
                            width="w-[16px]"
                            height="h-[16px]"
                            fontsize="text-[12px]"
                            transform={applyOffer ? "!translate-x-[20px]" : undefined}
                        />
                    </div>

                    {applyOffer ? (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                            <div className="lg:col-span-2 flex flex-col gap-6 bg-white p-6 rounded-[20px] border border-[#DFE0E2] shadow-sm">
                                <div className="w-[600px] shrink-0">
                                    <Tabs
                                        options={offerTabOptions}
                                        value={offerTab}
                                        onChange={(val) => {
                                            setOfferTab(val);
                                            setOfferValidationError("");
                                        }}
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
                                                isSelected={
                                                    normalizeOfferId(selectedOfferId) ===
                                                    normalizeOfferId(offer.id)
                                                }
                                                onClick={() => {
                                                    setSelectedOfferId(offer.id);
                                                    setOfferValidationError("");
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}
                                {offerValidationError ? (
                                    <p
                                        data-field="offerValidation"
                                        className="text-sm font-medium leading-[140%] text-[#F6776E]"
                                    >
                                        {offerValidationError}
                                    </p>
                                ) : null}
                            </div>

                            <PriceSummaryPanel
                                effectiveNumberOfDays={effectiveNumberOfDays}
                                totalStayDays={totalStayDays}
                                complimentaryDays={complimentaryDays}
                                originalTotal={originalTotal}
                                packageAppliedDiscount={packageAppliedDiscount}
                                offerBonusLabel={offerBonusLabel}
                                finalAmountPayable={finalAmountPayable}
                                showOfferDiscounts
                                offerTab={offerTab}
                                showConfirmButton
                                admissionType={admissionType}
                                onConfirm={handleNextClick}
                                className="self-stretch"
                            />
                        </div>
                    ) : (
                        <PriceSummaryPanel
                            effectiveNumberOfDays={effectiveNumberOfDays}
                            totalStayDays={totalStayDays}
                            complimentaryDays={complimentaryDays}
                            originalTotal={originalTotal}
                            packageAppliedDiscount={packageAppliedDiscount}
                            offerBonusLabel={offerBonusLabel}
                            finalAmountPayable={finalAmountPayable}
                            showOfferDiscounts={false}
                            offerTab={offerTab}
                            showConfirmButton={false}
                            admissionType={admissionType}
                            onConfirm={handleNextClick}
                            className="max-w-md"
                        />
                    )}
                </div>

                {/* 6. SELECT ADMISSION TYPE COMPONENT */}
                <div className="w-full flex flex-col gap-4 mt-6 scroll-mt-6" data-field="admissionType">
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
                    {admissionTypeFieldError ? (
                        <p className="text-sm text-[#F6776E]">{admissionTypeFieldError}</p>
                    ) : null}
                </div>

                <Dialog
                    open={isAttendantsDialogOpen}
                    onClose={handleAttendantDialogClose}
                    title="Attendants details"
                    width={920}
                    contentPadding="px-6 pb-6 pt-4"
                    contentOverflow="auto"
                >
                    <form noValidate onSubmit={handleAttendantDetailsSubmit} className="flex flex-col gap-8 text-left">
                        {attendantFormik.values.attendants.map((attendant, index) => (
                            <div
                                key={`attendant-section-${index}`}
                                className="rounded-[16px] border border-[#E3EEE1] p-5"
                            >
                                <div className="mb-6 flex items-center justify-between gap-3">
                                    <h4 className="text-base font-medium text-[#262D3B]">
                                        Attendant {index + 1}
                                    </h4>
                                    {index === 0 ? (
                                        attendantFormik.values.attendants.length < 5 ? (
                                            <Tooltip content="Add More Attendants" position="top" delay={0}>
                                                <button
                                                    type="button"
                                                    onClick={handleAddAttendant}
                                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0B8C00] transition-colors hover:bg-[#097300]"
                                                    aria-label="Add attendant"
                                                >
                                                    <Image
                                                        src="/icons/AddIconWhite.svg"
                                                        alt="Add attendant"
                                                        width={22}
                                                        height={22}
                                                    />
                                                </button>
                                            </Tooltip>
                                        ) : null
                                    ) : (
                                        <Tooltip content="Delete Attendant" position="top" delay={0}>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveAttendant(index)}
                                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F28B82] transition-colors hover:bg-[#e87a70]"
                                                aria-label="Remove attendant"
                                            >
                                                <Image
                                                    src="/icons/TrashRedIcon.svg"
                                                    alt="Remove attendant"
                                                    width={20}
                                                    height={20}
                                                    className="brightness-0 invert"
                                                />
                                            </button>
                                        </Tooltip>
                                    )}
                                </div>

                                <div className="flex flex-col gap-6">
                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                                        <div
                                            data-field={getAttendantDataField(index, "attendantName")}
                                            className="scroll-mt-4"
                                        >
                                            <FormInputField
                                                label="Attendant Name *"
                                                type="text"
                                                placeholder="Attendant Name"
                                                value={attendant.attendantName}
                                                onChange={(e) => {
                                                    const value = e.target.value;

                                                    if (/^[A-Za-z\s]*$/.test(value)) {
                                                        void attendantFormik.setFieldValue(
                                                            `attendants.${index}.attendantName`,
                                                            value
                                                        );
                                                    }
                                                }}
                                                onBlur={() =>
                                                    void attendantFormik.setFieldTouched(
                                                        `attendants.${index}.attendantName`,
                                                        true
                                                    )
                                                }
                                                height={44}
                                                error={getAttendantFieldError(
                                                    attendantFormik,
                                                    index,
                                                    "attendantName"
                                                )}
                                            />
                                        </div>
                                        <div
                                            data-field={getAttendantDataField(index, "gender")}
                                            className="scroll-mt-4"
                                        >
                                            <FormSelectField
                                                label="Gender *"
                                                options={ATTENDANT_GENDER_OPTIONS}
                                                value={attendant.gender || null}
                                                onChange={(val) => {
                                                    void attendantFormik.setFieldValue(
                                                        `attendants.${index}.gender`,
                                                        Array.isArray(val) ? val[0] : val || ""
                                                    );
                                                    void attendantFormik.setFieldTouched(
                                                        `attendants.${index}.gender`,
                                                        true,
                                                        false
                                                    );
                                                }}
                                                placeholder="Gender"
                                                mode="single"
                                                background="white"
                                                error={getAttendantFieldError(attendantFormik, index, "gender")}
                                            />
                                        </div>
                                        <div
                                            data-field={getAttendantDataField(index, "phoneNumber")}
                                            className="scroll-mt-4"
                                        >
                                            <FormInputField
                                                label="Phone Number *"
                                                type="text"
                                                inputMode="numeric"
                                                placeholder="Phone Number"
                                                value={attendant.phoneNumber}
                                                onChange={(e) => {
                                                    const value = e.target.value
                                                        .replace(/\D/g, "")
                                                        .slice(0, 10);
                                                    void attendantFormik.setFieldValue(
                                                        `attendants.${index}.phoneNumber`,
                                                        value
                                                    );
                                                }}
                                                onBlur={() =>
                                                    void attendantFormik.setFieldTouched(
                                                        `attendants.${index}.phoneNumber`,
                                                        true
                                                    )
                                                }
                                                maxLength={10}
                                                height={44}
                                                error={getAttendantFieldError(
                                                    attendantFormik,
                                                    index,
                                                    "phoneNumber"
                                                )}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                        <FormInputField
                                            label="Email ID"
                                            type="email"
                                            placeholder="Email ID"
                                            value={attendant.emailId}
                                            onChange={(e) => {
                                                const value = sanitizeEmailInput(e.target.value);
                                                void attendantFormik.setFieldValue(
                                                    `attendants.${index}.emailId`,
                                                    value
                                                );
                                                void attendantFormik.setFieldTouched(
                                                    `attendants.${index}.emailId`,
                                                    true,
                                                    false
                                                );
                                                void attendantFormik.validateField(
                                                    `attendants.${index}.emailId`
                                                );
                                            }}
                                            onBlur={() =>
                                                void attendantFormik.setFieldTouched(
                                                    `attendants.${index}.emailId`,
                                                    true
                                                )
                                            }
                                            height={44}
                                            error={getAttendantFieldError(attendantFormik, index, "emailId")}
                                        />
                                        <FormSelectField
                                            label="Relation with Patient"
                                            options={ATTENDANT_RELATION_OPTIONS}
                                            value={attendant.relationWithPatient || null}
                                            onChange={(val) =>
                                                void attendantFormik.setFieldValue(
                                                    `attendants.${index}.relationWithPatient`,
                                                    Array.isArray(val) ? val[0] : val || ""
                                                )
                                            }
                                            placeholder="Relation with Patient"
                                            mode="single"
                                            background="white"
                                        />
                                    </div>

                                    <AddressDetails
                                        title="Address Information"
                                        nationality="Indian"
                                        designedBycounsellormodule={true}
                                        dataFieldPrefix={`attendant-${index}-`}
                                        formData={attendant.address}
                                        onChange={(field, value) => {
                                            void attendantFormik.setFieldValue(
                                                `attendants.${index}.address.${field}`,
                                                value
                                            );
                                        }}
                                        onBlur={(field) => {
                                            void attendantFormik.setFieldTouched(
                                                `attendants.${index}.address.${field}`,
                                                true,
                                                false
                                            );
                                        }}
                                        errors={{
                                            country: getAttendantAddressFieldError(
                                                attendantFormik,
                                                index,
                                                "country"
                                            ),
                                            pinCode: getAttendantAddressFieldError(
                                                attendantFormik,
                                                index,
                                                "pinCode"
                                            ),
                                            state: getAttendantAddressFieldError(
                                                attendantFormik,
                                                index,
                                                "state"
                                            ),
                                            city: getAttendantAddressFieldError(
                                                attendantFormik,
                                                index,
                                                "city"
                                            ),
                                            address: getAttendantAddressFieldError(
                                                attendantFormik,
                                                index,
                                                "address"
                                            ),
                                        }}
                                    />
                                </div>
                            </div>
                        ))}

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

                <Dialog
                    open={isTentativeDialogOpen}
                    onClose={handleTentativeDialogClose}
                    title="Tentative Admission"
                    width={520}
                    contentPadding="px-6 pb-6 pt-4"
                >
                    <form onSubmit={handleTentativeSubmit} className="flex flex-col gap-6 text-left">
                        <FormInputField
                            label="Proposed Admission Date"
                            type="date"
                            value={tentativeAdmissionDate}
                            onChange={(e) => {
                                setTentativeAdmissionDate(e.target.value);
                                if (tentativeDateError) setTentativeDateError("");
                            }}
                            min={new Date().toISOString().split("T")[0]}
                            height={44}
                        />
                        {tentativeDateError && (
                            <p className="text-xs text-[#F6776E]" style={{ marginTop: "-20px" }}>{tentativeDateError}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 pt-2">
                            <Button type="submit" variant="primary" disabled={isTentativeSubmitting}>
                                {isTentativeSubmitting ? "Submitting..." : "Submit"}
                            </Button>
                            <Button type="button" variant="outline" onClick={handleTentativeDialogClose}>
                                Cancel
                            </Button>
                        </div>
                    </form>
                </Dialog>

                <MessageDialog
                    open={showAttendantConfirmDialog}
                    onClose={() => setShowAttendantConfirmDialog(false)}
                    icon="/icons/questionMark.svg"
                    iconBgColor="#E8F5E9"
                    message="Do you want to add attendant details?"
                    confirmText="Yes"
                    cancelText="No"
                    showCancel
                    onConfirm={() => {
                        setShowAttendantConfirmDialog(false);
                        setIsAttendantsDialogOpen(true);
                    }}
                    onCancel={() => {
                        setShowAttendantConfirmDialog(false);
                        setAttendantDetails(null);
                        onAttendantDetailsChange?.(null);
                        if (!validateOfferSelectionOrSetError()) return;
                        onNext();
                    }}
                />

                <MessageDialog
                    open={showTentativeErrorDialog}
                    onClose={() => setShowTentativeErrorDialog(false)}
                    icon="/icons/CrossIcon.svg"
                    iconBgColor="#FFEBEE"
                    message={tentativeErrorMessage}
                    confirmText="OK"
                    showCancel={false}
                    onConfirm={() => setShowTentativeErrorDialog(false)}
                />

                <MessageDialog
                    open={showTentativeSuccessDialog}
                    onClose={() => setShowTentativeSuccessDialog(false)}
                    icon="/icons/SuccessCheck.svg"
                    iconBgColor="#E8F5E9"
                    message={
                        <div className="flex flex-col items-center text-center">
                            <span className="text-lg font-bold text-[#1E293B] mb-1">Tentative Admission Submitted</span>
                            <span className="text-sm text-[#475569]">
                                The tentative admission has been recorded successfully.
                            </span>
                        </div>
                    }
                    confirmText="OK"
                    showCancel={false}
                    onConfirm={() => {
                        setShowTentativeSuccessDialog(false);
                        router.push("/counsellor/dashboard");
                    }}
                />

                {/* 7. BOTTOM ACTION NAVIGATION FOOTER */}
                <div className="w-full flex items-center justify-end gap-4 pt-6 mt-4 select-none">
                    {/* <Button
                        type="button"
                        variant="outline"
                        className="!border-[#DFE0E2] !text-[#434956] hover:!bg-gray-50 !shadow-sm"
                        onClick={handleDetailsCancel}
                    >
                        Cancel
                    </Button> */}
                     <BackToPreviousPageButton text="Back" onClick={onBack} />
                    <Button
                        type="button"
                        variant="primary"
                        rightIcon={<span>➔</span>}
                        onClick={handleNextClick}
                    >
                        Next: Basic Information
                    </Button>
                </div>
            </div>
        </div>
    );
}

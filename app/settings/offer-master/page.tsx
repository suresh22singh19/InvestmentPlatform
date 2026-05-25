"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
    Tabs,
    Toggle,
    TableSearchInput,
    FormSelectField,
    TableListingCard,
    type TableListingSection,
    Button,
    Dialog,
    FormInputField,
    DatePicker,
    MessageDialog,
} from "@/components/ui";
import type { SelectOption } from "@/components/ui/FormSelectField";
import { PatientTypeButtonGroup } from "@/components/ui/PatientTypeButtonGroup";
import {
    useGetBranchesQuery,
    useGetPanelsQuery,
    useGetAllOfferMastersQuery,
    useCreateOfferMasterMutation,
    useUpdateOfferMasterMutation,
    useUpdateOfferMasterStatusMutation,
    type OfferMasterItem,
    type OfferPromotionType,
} from "@/store/api/settingsApi";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import {
    isPanelNameHiddenFromPanelTypeDropdown,
    findActivePanelIdStringByName,
    DEFAULT_PANEL_NAME_FOR_PRIVATE,
    DEFAULT_PANEL_NAME_FOR_TPA_TYPE,
} from "@/lib/registration/panelDropdownFilter";

// ─── Tab config ───────────────────────────────────────────────────────────────
const TAB_OPTIONS = [
    { value: "all-offers", label: "All Offers" },
    { value: "bundled-stay", label: "Bundled Stay" },
    { value: "flat-discount", label: "Flat Discount" },
    { value: "conditional-billing", label: "Conditional Billing" },
];

const PATIENT_TYPE_OPTIONS = ["Private", "Panel", "TPA"];

// ─── Form types ───────────────────────────────────────────────────────────────
type PatientType = "private" | "tpa" | "panel";

type BundledStayForm = {
    branch: string; offerName: string;
    stayDuration: string; freeDays: string;
    startDate: string; endDate: string;
    patientType: PatientType; panelId: string;
};

type FlatDiscountForm = {
    branch: string; offerName: string;
    discountPercentage: string;
    startDate: string; endDate: string;
    patientType: PatientType; panelId: string;
};

type ConditionalBillingForm = {
    branch: string; offerName: string;
    minBillAmount: string;
    discount: string; maxCap: string;
    startDate: string; endDate: string;
    patientType: PatientType; panelId: string;
};

// ─── Error types ──────────────────────────────────────────────────────────────
type BundledStayErrors = {
    branch?: string; offerName?: string;
    stayDuration?: string; freeDays?: string;
    startDate?: string; endDate?: string; panelId?: string;
};
type FlatDiscountErrors = {
    branch?: string; offerName?: string;
    discountPercentage?: string;
    startDate?: string; endDate?: string; panelId?: string;
};
type ConditionalBillingErrors = {
    branch?: string; offerName?: string;
    minBillAmount?: string;
    discount?: string; maxCap?: string;
    startDate?: string; endDate?: string; panelId?: string;
};

// ─── Validation helpers ───────────────────────────────────────────────────────
const DIGITS_ONLY = /^\d+$/;
const DECIMAL_PERCENTAGE = /^\d+(\.\d{1,2})?$/;
// Intermediate typing pattern: allows empty, digits, trailing dot, up to 2 decimal places
const DECIMAL_PERCENTAGE_INPUT = /^\d*\.?\d{0,2}$/;
// Amount fields: up to 15 integer digits + optional up to 2 decimal places
const DECIMAL_AMOUNT = /^\d{1,15}(\.\d{1,2})?$/;
const DECIMAL_AMOUNT_INPUT = /^\d{0,15}(\.\d{0,2})?$/;
// Offer name: letters, numbers, spaces, and common symbols (+, -, (, ), /, ., %, ₹)
const OFFER_NAME_RE = /^[a-zA-Z0-9\s+\-()/.,₹%]+$/;

function validateBundledStay(f: BundledStayForm, isEdit: boolean): BundledStayErrors {
    const e: BundledStayErrors = {};
    if (!isEdit && !f.branch) e.branch = "Branch is required";
    if (!f.offerName.trim()) {
        e.offerName = "Offer Name is required";
    } else if (f.offerName.trim().length > 100) {
        e.offerName = "Offer Name cannot exceed 100 characters";
    } else if (!OFFER_NAME_RE.test(f.offerName.trim())) {
        e.offerName = "Only letters, numbers and common symbols allowed";
    }
    if (!f.stayDuration) {
        e.stayDuration = "Stay Duration is required";
    } else if (!DIGITS_ONLY.test(f.stayDuration)) {
        e.stayDuration = "Must contain only digits";
    } else {
        const v = parseInt(f.stayDuration, 10);
        if (v < 1 || v > 365) e.stayDuration = "Must be between 1 and 365";
    }
    if (f.freeDays === "") {
        e.freeDays = "Free Days is required";
    } else if (!DIGITS_ONLY.test(f.freeDays)) {
        e.freeDays = "Must contain only digits";
    } else {
        const v = parseInt(f.freeDays, 10);
        if (v < 1 || v > 365) e.freeDays = "Must be between 1 and 365";
    }
    if (f.patientType === "panel" && !f.panelId) e.panelId = "Panel is required";
    if (!f.startDate) e.startDate = "Start Date is required";
    if (!f.endDate) {
        e.endDate = "End Date is required";
    } else if (f.startDate && f.endDate < f.startDate) {
        e.endDate = "End Date must be on or after Start Date";
    }
    return e;
}

function validateFlatDiscount(f: FlatDiscountForm, isEdit: boolean): FlatDiscountErrors {
    const e: FlatDiscountErrors = {};
    if (!isEdit && !f.branch) e.branch = "Branch is required";
    if (!f.offerName.trim()) {
        e.offerName = "Offer Name is required";
    } else if (f.offerName.trim().length > 100) {
        e.offerName = "Offer Name cannot exceed 100 characters";
    } else if (!OFFER_NAME_RE.test(f.offerName.trim())) {
        e.offerName = "Only letters, numbers and common symbols allowed";
    }
    if (!f.discountPercentage) {
        e.discountPercentage = "Discount Percentage is required";
    } else if (!DECIMAL_PERCENTAGE.test(f.discountPercentage)) {
        e.discountPercentage = "Must be a valid number";
    } else {
        const v = parseFloat(f.discountPercentage);
        if (v < 1 || v > 100) e.discountPercentage = "Must be between 1 and 100";
    }
    if (f.patientType === "panel" && !f.panelId) e.panelId = "Panel is required";
    if (!f.startDate) e.startDate = "Start Date is required";
    if (!f.endDate) {
        e.endDate = "End Date is required";
    } else if (f.startDate && f.endDate < f.startDate) {
        e.endDate = "End Date must be on or after Start Date";
    }
    return e;
}

function validateConditionalBilling(f: ConditionalBillingForm, isEdit: boolean): ConditionalBillingErrors {
    const e: ConditionalBillingErrors = {};
    if (!isEdit && !f.branch) e.branch = "Branch is required";
    if (!f.offerName.trim()) {
        e.offerName = "Offer Name is required";
    } else if (f.offerName.trim().length > 100) {
        e.offerName = "Offer Name cannot exceed 100 characters";
    } else if (!OFFER_NAME_RE.test(f.offerName.trim())) {
        e.offerName = "Only letters, numbers and common symbols allowed";
    }
    if (!f.minBillAmount) {
        e.minBillAmount = "Minimum Bill Amount is required";
    } else if (!DECIMAL_AMOUNT.test(f.minBillAmount) || parseFloat(f.minBillAmount) < 1) {
        e.minBillAmount = "Must be a number ≥ 1";
    }
    if (!f.discount) {
        e.discount = "Discount is required";
    } else if (!DECIMAL_PERCENTAGE.test(f.discount)) {
        e.discount = "Must be a valid number";
    } else {
        const v = parseFloat(f.discount);
        if (v < 1 || v > 100) e.discount = "Must be between 1 and 100";
    }
    if (!f.maxCap) {
        e.maxCap = "Max Cap is required";
    } else if (!DECIMAL_AMOUNT.test(f.maxCap) || parseFloat(f.maxCap) < 1) {
        e.maxCap = "Must be a number ≥ 1";
    }
    if (f.patientType === "panel" && !f.panelId) e.panelId = "Panel is required";
    if (!f.startDate) e.startDate = "Start Date is required";
    if (!f.endDate) {
        e.endDate = "End Date is required";
    } else if (f.startDate && f.endDate < f.startDate) {
        e.endDate = "End Date must be on or after Start Date";
    }
    return e;
}

const hasErrors = (errs: Record<string, string | undefined>) =>
    Object.values(errs).some(Boolean);

// Block e, E, +, -, . in number inputs (keep digits only)
const blockNonDigits = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["e", "E", "+", "-", "."].includes(e.key)) e.preventDefault();
};
// Block e, E, +, - but allow . for decimal percentage inputs
const blockNonDecimalDigits = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
};

// ─── Default forms ────────────────────────────────────────────────────────────
const defaultBundledStay = (): BundledStayForm => ({
    branch: "", offerName: "", stayDuration: "", freeDays: "",
    startDate: "", endDate: "", patientType: "private", panelId: "",
});
const defaultFlatDiscount = (): FlatDiscountForm => ({
    branch: "", offerName: "", discountPercentage: "",
    startDate: "", endDate: "", patientType: "private", panelId: "",
});
const defaultConditionalBilling = (): ConditionalBillingForm => ({
    branch: "", offerName: "", minBillAmount: "", discount: "", maxCap: "",
    startDate: "", endDate: "", patientType: "private", panelId: "",
});

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function OfferMasterPage() {
    // ── Table state ──
    const [activeTab, setActiveTab] = useState("all-offers");
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [offerStatuses, setOfferStatuses] = useState<Record<number, boolean>>({});

    // ── Dialog state ──
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
    const [editingOfferId, setEditingOfferId] = useState<number | null>(null);
    const [bundledStayForm, setBundledStayForm] = useState<BundledStayForm>(defaultBundledStay());
    const [flatDiscountForm, setFlatDiscountForm] = useState<FlatDiscountForm>(defaultFlatDiscount());
    const [conditionalBillingForm, setConditionalBillingForm] = useState<ConditionalBillingForm>(defaultConditionalBilling());

    // ── Validation errors ──
    const [bundledStayErrors, setBundledStayErrors] = useState<BundledStayErrors>({});
    const [flatDiscountErrors, setFlatDiscountErrors] = useState<FlatDiscountErrors>({});
    const [conditionalBillingErrors, setConditionalBillingErrors] = useState<ConditionalBillingErrors>({});

    const isEditMode = dialogMode === "edit";

    // ── Toggle confirmation dialogs ──
    const [pendingToggle, setPendingToggle] = useState<{ offerId: number; newStatus: boolean } | null>(null);
    const [showToggleSuccessDialog, setShowToggleSuccessDialog] = useState(false);
    const [toggleSuccessMessage, setToggleSuccessMessage] = useState("");
    const [showToggleErrorDialog, setShowToggleErrorDialog] = useState(false);
    const [toggleErrorMessage, setToggleErrorMessage] = useState("");

    // ── Submit result dialogs ──
    const [showSubmitSuccessDialog, setShowSubmitSuccessDialog] = useState(false);
    const [submitSuccessMessage, setSubmitSuccessMessage] = useState("");
    const [showSubmitErrorDialog, setShowSubmitErrorDialog] = useState(false);
    const [submitErrorMessage, setSubmitErrorMessage] = useState("");

    // ── Branch data ──
    // For the dialog: all branches from API (single select, no "All Branches")
    const { data: branchesRes, isLoading: isLoadingBranches } = useGetBranchesQuery(undefined);
    const branchOptions: SelectOption[] = useMemo(() => {
        const rows = branchesRes?.success && Array.isArray(branchesRes.data) ? branchesRes.data : [];
        return rows.map((b) => {
            const typeLabel = b.type ? b.type.charAt(0).toUpperCase() + b.type.slice(1).toLowerCase() : "";
            return { value: String(b.id), label: typeLabel ? `${b.name} (${typeLabel})` : b.name };
        });
    }, [branchesRes]);

    // For the dialog: fetch panels by the currently-selected branch in the active form
    const dialogBranchId = useMemo(() => {
        if (!isDialogOpen) return null;
        let branch = "";
        if (activeTab === "bundled-stay") branch = bundledStayForm.branch;
        else if (activeTab === "flat-discount") branch = flatDiscountForm.branch;
        else if (activeTab === "conditional-billing") branch = conditionalBillingForm.branch;
        const id = parseInt(branch, 10);
        return Number.isFinite(id) && id > 0 ? id : null;
    }, [isDialogOpen, activeTab, bundledStayForm.branch, flatDiscountForm.branch, conditionalBillingForm.branch]);

    const { data: panelsRes, isLoading: isLoadingPanels } = useGetPanelsQuery(
        dialogBranchId != null ? { page: 1, limit: 100, branchId: dialogBranchId } : undefined
    );
    // Panel dropdown: only real contract panels (exclude Normal and TPA defaults)
    const panelOptions: SelectOption[] = useMemo(() => {
        if (!panelsRes?.success || !Array.isArray(panelsRes.data)) return [];
        return panelsRes.data
            .filter((p) =>
                (p.status === "active" || p.status === "Active") &&
                !isPanelNameHiddenFromPanelTypeDropdown(p.name)
            )
            .map((p) => ({ value: String(p.id), label: p.name }));
    }, [panelsRes]);
    // Resolved IDs for default panels (auto-assigned for Private / TPA types)
    const privateDefaultPanelId = useMemo(
        () => findActivePanelIdStringByName(panelsRes?.data, DEFAULT_PANEL_NAME_FOR_PRIVATE),
        [panelsRes?.data]
    );
    const tpaDefaultPanelId = useMemo(
        () => findActivePanelIdStringByName(panelsRes?.data, DEFAULT_PANEL_NAME_FOR_TPA_TYPE),
        [panelsRes?.data]
    );
    // When panels load after branch selection, auto-assign panelId for Private/TPA types
    // (the PatientTypeButtonGroup onChange only runs when the type *changes*, not on first load)
    useEffect(() => {
        if (!isDialogOpen) return;
        const autoAssign = (patientType: string, setPanelId: (id: string) => void) => {
            if (patientType === "private" && privateDefaultPanelId) setPanelId(privateDefaultPanelId);
            else if (patientType === "tpa" && tpaDefaultPanelId) setPanelId(tpaDefaultPanelId);
        };
        if (activeTab === "bundled-stay") {
            autoAssign(bundledStayForm.patientType, (id) => setBundledStayForm((p) => ({ ...p, panelId: id })));
        } else if (activeTab === "flat-discount") {
            autoAssign(flatDiscountForm.patientType, (id) => setFlatDiscountForm((p) => ({ ...p, panelId: id })));
        } else if (activeTab === "conditional-billing") {
            autoAssign(conditionalBillingForm.patientType, (id) => setConditionalBillingForm((p) => ({ ...p, panelId: id })));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [privateDefaultPanelId, tpaDefaultPanelId]);

    // For the table filter: respects superadmin vs regular user via useBranchFilter
    const {
        selectedBranchFilter,
        setSelectedBranchFilter,
        branchFilterOptions,
        isLoadingBranches: isLoadingBranchFilter,
        isBranchFilterDisabled,
        filterBranchId,
    } = useBranchFilter();

    // ── Offer Master API ──
    const promotionTypeFilter: OfferPromotionType | "" =
        activeTab === "bundled-stay" ? "bundled_stay"
            : activeTab === "flat-discount" ? "flat_discount"
                : activeTab === "conditional-billing" ? "conditional_billing" : "";

    const { data: offersRes, isLoading: isLoadingOffers } = useGetAllOfferMastersQuery({
        page: currentPage,
        limit: itemsPerPage,
        sortBy: "branchName",
        order: sortOrder === "asc" ? "ASC" : "DESC",
        ...(searchTerm ? { search: searchTerm } : {}),
        ...(filterBranchId ? { branchId: filterBranchId } : {}),
        ...(promotionTypeFilter ? { promotionType: promotionTypeFilter } : {}),
    });
    const [createOfferMaster, { isLoading: isCreating }] = useCreateOfferMasterMutation();
    const [updateOfferMaster, { isLoading: isUpdating }] = useUpdateOfferMasterMutation();
    const [updateOfferMasterStatus, { isLoading: isTogglingStatus }] = useUpdateOfferMasterStatusMutation();
    const isSubmitting = isCreating || isUpdating;

    const clearAllErrors = () => {
        setBundledStayErrors({});
        setFlatDiscountErrors({});
        setConditionalBillingErrors({});
    };

    // ── Helpers ──
    const activeTabLabel = TAB_OPTIONS.find((t) => t.value === activeTab)?.label ?? "All Offers";

    const openCreateDialog = () => {
        setDialogMode("add");
        setEditingOfferId(null);
        setBundledStayForm(defaultBundledStay());
        setFlatDiscountForm(defaultFlatDiscount());
        setConditionalBillingForm(defaultConditionalBilling());
        clearAllErrors();
        setIsDialogOpen(true);
    };

    const openEditDialog = (item: OfferMasterItem) => {
        // Switch to the correct sub-tab so the right dialog form renders
        const tabMap: Record<string, string> = {
            bundled_stay: "bundled-stay",
            flat_discount: "flat-discount",
            conditional_billing: "conditional-billing",
        };
        const targetTab = tabMap[item.promotion_type];
        if (targetTab) setActiveTab(targetTab);

        setDialogMode("edit");
        setEditingOfferId(item.id);
        clearAllErrors();

        const editPanelId = item.panel_id != null ? String(item.panel_id) : "";
        const panelNameLower = (item.panelName ?? "").trim().toLowerCase();
        const editPatientType: PatientType =
            panelNameLower === "tpa" ? "tpa" :
                panelNameLower === "normal" ? "private" :
                    editPanelId ? "panel" : "private";

        if (item.promotion_type === "bundled_stay") {
            setBundledStayForm({
                branch: String(item.branch_id),
                offerName: item.offer_name,
                stayDuration: String(item.bundled_stay_duration ?? ""),
                freeDays: String(item.bundled_free_days ?? ""),
                startDate: item.valid_from.split("T")[0],
                endDate: item.valid_to.split("T")[0],
                patientType: editPatientType,
                panelId: editPanelId,
            });
        } else if (item.promotion_type === "flat_discount") {
            setFlatDiscountForm({
                branch: String(item.branch_id),
                offerName: item.offer_name,
                discountPercentage: String(item.flat_discount_percentage ?? ""),
                startDate: item.valid_from.split("T")[0],
                endDate: item.valid_to.split("T")[0],
                patientType: editPatientType,
                panelId: editPanelId,
            });
        } else if (item.promotion_type === "conditional_billing") {
            setConditionalBillingForm({
                branch: String(item.branch_id),
                offerName: item.offer_name,
                minBillAmount: String(item.cond_min_billing_amount ?? ""),
                discount: String(item.cond_discount_value ?? ""),
                maxCap: String(item.cond_max_discount_cap ?? ""),
                startDate: item.valid_from.split("T")[0],
                endDate: item.valid_to.split("T")[0],
                patientType: editPatientType,
                panelId: editPanelId,
            });
        }
        setIsDialogOpen(true);
    };

    const handleDialogClose = () => {
        clearAllErrors();
        setIsDialogOpen(false);
    };

    const handleSubmit = async () => {
        // Validation phase (sync — no loading state yet)
        if (activeTab === "bundled-stay") {
            const errs = validateBundledStay(bundledStayForm, isEditMode);
            setBundledStayErrors(errs);
            if (hasErrors(errs)) return;
        } else if (activeTab === "flat-discount") {
            const errs = validateFlatDiscount(flatDiscountForm, isEditMode);
            setFlatDiscountErrors(errs);
            if (hasErrors(errs)) return;
        } else if (activeTab === "conditional-billing") {
            const errs = validateConditionalBilling(conditionalBillingForm, isEditMode);
            setConditionalBillingErrors(errs);
            if (hasErrors(errs)) return;
        } else {
            return;
        }

        try {
            if (activeTab === "bundled-stay") {
                const bPanelIdStr =
                    bundledStayForm.patientType === "panel" ? bundledStayForm.panelId :
                        bundledStayForm.patientType === "private" ? privateDefaultPanelId :
                            bundledStayForm.patientType === "tpa" ? tpaDefaultPanelId : undefined;
                const bPanelId = bPanelIdStr ? parseInt(bPanelIdStr, 10) : undefined;
                if (isEditMode && editingOfferId != null) {
                    await updateOfferMaster({
                        id: editingOfferId,
                        offerName: bundledStayForm.offerName.trim(),
                        bundledStayDuration: parseInt(bundledStayForm.stayDuration, 10),
                        bundledFreeDays: parseInt(bundledStayForm.freeDays, 10),
                        validFrom: new Date(bundledStayForm.startDate).toISOString(),
                        validTo: new Date(bundledStayForm.endDate).toISOString(),
                    }).unwrap();
                } else {
                    await createOfferMaster({
                        branchId: parseInt(bundledStayForm.branch, 10),
                        ...(bPanelId != null ? { panelId: bPanelId } : {}),
                        promotionType: "bundled_stay",
                        offerName: bundledStayForm.offerName.trim(),
                        bundledStayDuration: parseInt(bundledStayForm.stayDuration, 10),
                        bundledFreeDays: parseInt(bundledStayForm.freeDays, 10),
                        validFrom: new Date(bundledStayForm.startDate).toISOString(),
                        validTo: new Date(bundledStayForm.endDate).toISOString(),
                    }).unwrap();
                }
            } else if (activeTab === "flat-discount") {
                const fPanelIdStr =
                    flatDiscountForm.patientType === "panel" ? flatDiscountForm.panelId :
                        flatDiscountForm.patientType === "private" ? privateDefaultPanelId :
                            flatDiscountForm.patientType === "tpa" ? tpaDefaultPanelId : undefined;
                const fPanelId = fPanelIdStr ? parseInt(fPanelIdStr, 10) : undefined;
                if (isEditMode && editingOfferId != null) {
                    await updateOfferMaster({
                        id: editingOfferId,
                        offerName: flatDiscountForm.offerName.trim(),
                        flatDiscountPercentage: parseFloat(flatDiscountForm.discountPercentage),
                        validFrom: new Date(flatDiscountForm.startDate).toISOString(),
                        validTo: new Date(flatDiscountForm.endDate).toISOString(),
                    }).unwrap();
                } else {
                    await createOfferMaster({
                        branchId: parseInt(flatDiscountForm.branch, 10),
                        ...(fPanelId != null ? { panelId: fPanelId } : {}),
                        promotionType: "flat_discount",
                        offerName: flatDiscountForm.offerName.trim(),
                        flatDiscountPercentage: parseFloat(flatDiscountForm.discountPercentage),
                        validFrom: new Date(flatDiscountForm.startDate).toISOString(),
                        validTo: new Date(flatDiscountForm.endDate).toISOString(),
                    }).unwrap();
                }
            } else if (activeTab === "conditional-billing") {
                const cPanelIdStr =
                    conditionalBillingForm.patientType === "panel" ? conditionalBillingForm.panelId :
                        conditionalBillingForm.patientType === "private" ? privateDefaultPanelId :
                            conditionalBillingForm.patientType === "tpa" ? tpaDefaultPanelId : undefined;
                const cPanelId = cPanelIdStr ? parseInt(cPanelIdStr, 10) : undefined;
                if (isEditMode && editingOfferId != null) {
                    await updateOfferMaster({
                        id: editingOfferId,
                        offerName: conditionalBillingForm.offerName.trim(),
                        condMinBillingAmount: parseFloat(conditionalBillingForm.minBillAmount),
                        condDiscountValue: parseFloat(conditionalBillingForm.discount),
                        condMaxDiscountCap: parseFloat(conditionalBillingForm.maxCap),
                        validFrom: new Date(conditionalBillingForm.startDate).toISOString(),
                        validTo: new Date(conditionalBillingForm.endDate).toISOString(),
                    }).unwrap();
                } else {
                    await createOfferMaster({
                        branchId: parseInt(conditionalBillingForm.branch, 10),
                        ...(cPanelId != null ? { panelId: cPanelId } : {}),
                        promotionType: "conditional_billing",
                        offerName: conditionalBillingForm.offerName.trim(),
                        condMinBillingAmount: parseFloat(conditionalBillingForm.minBillAmount),
                        condDiscountValue: parseFloat(conditionalBillingForm.discount),
                        condMaxDiscountCap: parseFloat(conditionalBillingForm.maxCap),
                        validFrom: new Date(conditionalBillingForm.startDate).toISOString(),
                        validTo: new Date(conditionalBillingForm.endDate).toISOString(),
                    }).unwrap();
                }
            }
            setIsDialogOpen(false);
            setSubmitSuccessMessage(isEditMode ? "Offer updated successfully." : "Offer created successfully.");
            setShowSubmitSuccessDialog(true);
        } catch (err: unknown) {
            const msg = (err as { data?: { message?: string } })?.data?.message ?? "Something went wrong. Please try again.";
            setSubmitErrorMessage(msg);
            setShowSubmitErrorDialog(true);
        }
    };

    // ── Dialog submit label ──
    const submitLabel = activeTab === "bundled-stay" ? "Publish Offer" : "Launch Promotion";

    // ── Table data ──
    const apiItems = offersRes?.success && Array.isArray(offersRes.data) ? offersRes.data : [];
    const totalItems = offersRes?.total ?? 0;

    const today = new Date().toISOString().split("T")[0];
    const fmtDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
    };

    const columns: TableListingSection["columns"] = [
        { label: "Sr no.", position: "first" },
        {
            label: "Branch Name",
            sortable: true,
            sortDirection: sortOrder,
            onSort: () => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc")),
        },
        { label: "Offer Name" },
        { label: "Patient Type" },
        { label: "Logic Detail" },
        { label: "Validity" },
        { label: "Status" },
        { label: "Action", position: "last", className: "cursor-pointer" },
    ];

    const rows: TableListingSection["rows"] = apiItems.map((item, index) => {
        const sr = (currentPage - 1) * itemsPerPage + index + 1;

        const validFrom = item.valid_from.split("T")[0];
        const validTo = item.valid_to.split("T")[0];
        let validityStatus: "Ongoing" | "Scheduled" | "Expired";
        if (today < validFrom) validityStatus = "Scheduled";
        else if (today > validTo) validityStatus = "Expired";
        else validityStatus = "Ongoing";

        let logicDetail = "";
        if (item.promotion_type === "bundled_stay") {
            logicDetail = `Pay ${item.bundled_stay_duration}, Get ${item.bundled_free_days} Free`;
        } else if (item.promotion_type === "flat_discount") {
            logicDetail = `Flat ${item.flat_discount_percentage}% Off`;
        } else if (item.promotion_type === "conditional_billing") {
            logicDetail = `${item.cond_discount_value}% off (min ₹${item.cond_min_billing_amount}, cap ₹${item.cond_max_discount_cap})`;
        }

        const validity = (
            <span className="text-sm text-[#434956]">
                {fmtDate(item.valid_from)} – {fmtDate(item.valid_to)}
                <span className={`ml-1 text-xs font-medium ${validityStatus === "Ongoing" ? "text-[#0B8C00]" : validityStatus === "Expired" ? "text-[#EF4444]" : "text-[#F59E0B]"}`}>
                    · {validityStatus}
                </span>
            </span>
        );

        const currentStatus = offerStatuses[item.id] ?? item.is_active;
        const statusToggle = (
            <Toggle
                checked={currentStatus}
                onChange={(val) => setPendingToggle({ offerId: item.id, newStatus: val })}
                className="!w-10 !h-6"
                width="w-[16px]"
                height="h-[16px]"
                fontsize="text-[12px]"
                transform={currentStatus ? "!translate-x-[20px]" : undefined}
            />
        );

        const action = (
            <button
                type="button"
                className="cursor-pointer p-1 rounded hover:bg-[#F2F8F2] transition-colors"
                aria-label="Edit offer"
                onClick={() => openEditDialog(item)}
            >
                <Image src="/icons/EditIconBlack.svg" alt="Edit" width={20} height={20} />
            </button>
        );

        const patientTypeLabel = item.panelName ?? "Private";

        return [sr, item.branchName, item.offer_name, patientTypeLabel, logicDetail, validity, statusToggle, action];
    });

    // ── Bundled stay scenario ──
    const stayNum = parseInt(bundledStayForm.stayDuration, 10) || 0;
    const freeNum = parseInt(bundledStayForm.freeDays, 10) || 0;
    const showScenario = stayNum > 0 || freeNum > 0;

    return (
        <AppShell>
            <div className="space-y-6 ">
                {/* Heading */}
                <div className="flex items-center justify-between">
                    <PageHeading title="Offer Master" />
                </div>

                {/* Tabs */}
                <div className="w-full rounded-[20px] border border-[#E3EEE1] p-2">
                    <div style={{ width: "800px", marginBottom: "10px", marginTop: "10px" }}>
                        <Tabs
                            options={TAB_OPTIONS}
                            value={activeTab}
                            onChange={(val) => {
                                setActiveTab(val);
                                setCurrentPage(1);
                                setSearchTerm("");
                            }}
                        />
                    </div>

                    {/* Table */}

                    <TableListingCard
                        sections={[
                            {
                                id: activeTab,
                                title: activeTabLabel,
                                titleRightContent: (
                                    <div className="flex items-center gap-3">
                                        <div style={{ width: "300px" }}>
                                            <FormSelectField
                                                label=""
                                                hideLabel
                                                value={selectedBranchFilter}
                                                onChange={(val) => {
                                                    setSelectedBranchFilter(Array.isArray(val) ? (val[0] ?? "") : (val ?? ""));
                                                    setCurrentPage(1);
                                                }}
                                                options={branchFilterOptions}
                                                placeholder={isLoadingBranchFilter ? "Loading branches..." : "Select Branch"}
                                                mode="single"
                                                background="normal"
                                                disabled={isBranchFilterDisabled || isLoadingBranchFilter}
                                            />
                                        </div>
                                        <div style={{ width: "300px" }}>
                                            <TableSearchInput
                                                value={searchTerm}
                                                onChange={(val) => { setSearchTerm(val); setCurrentPage(1); }}
                                                placeholder="Search Here..."
                                            />
                                        </div>
                                        {activeTab !== "all-offers" && (
                                            <Button
                                                variant="outline"
                                                leftIcon={<Image src="/icons/AddIcon.svg" alt="" width={20} height={20} />}
                                                onClick={openCreateDialog}
                                            >
                                                Create New Offer
                                            </Button>
                                        )}
                                    </div>
                                ),
                                columns,
                                rows,
                                emptyMessage: "Data not available",
                                isLoading: isLoadingOffers,
                                pagination: {
                                    currentPage,
                                    totalItems,
                                    itemsPerPage,
                                    onPageChange: setCurrentPage,
                                    onItemsPerPageChange: (items: number) => { setItemsPerPage(items); setCurrentPage(1); },
                                    itemsPerPageOptions: [6, 10, 20, 50],
                                },
                            },
                        ]}
                    />
                </div>

            </div>

            {/* ── Create / Edit Dialog ─────────────────────────────────────── */}
            <Dialog
                open={isDialogOpen}
                onClose={handleDialogClose}
                title={isEditMode ? "Edit Offer" : "Create New Offer"}
                width={750}
                contentPadding="px-6 py-5"
            >
                {/* ── Bundled Stay ── */}
                {activeTab === "bundled-stay" && (
                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormSelectField
                                label="Branch *"
                                value={bundledStayForm.branch}
                                onChange={(val) => {
                                    setBundledStayForm((p) => ({ ...p, branch: Array.isArray(val) ? (val[0] ?? "") : (val ?? "") }));
                                    if (bundledStayErrors.branch) setBundledStayErrors((p) => ({ ...p, branch: undefined }));
                                }}
                                options={branchOptions}
                                placeholder={isLoadingBranches ? "Loading branches..." : "Select Branch"}
                                mode="single"
                                background="white"
                                disabled={isEditMode || isLoadingBranches}
                                error={bundledStayErrors.branch}
                            />
                            <FormInputField
                                label="Offer Name *"
                                placeholder="Enter offer name"
                                value={bundledStayForm.offerName}
                                maxLength={100}
                                onChange={(e) => {
                                    setBundledStayForm((p) => ({ ...p, offerName: e.target.value }));
                                    if (bundledStayErrors.offerName) setBundledStayErrors((p) => ({ ...p, offerName: undefined }));
                                }}
                                onBlur={() => setBundledStayForm((p) => ({ ...p, offerName: p.offerName.trim() }))}
                                error={bundledStayErrors.offerName}
                            />
                        </div>

                        <p className="text-sm font-semibold text-[#262D3B]">Bundle Stay Logic</p>

                        <div className="grid grid-cols-2 gap-4">
                            <FormInputField
                                label="Stay Duration (X days) *"
                                placeholder="1 – 365"
                                type="number"
                                min="1"
                                max="365"
                                value={bundledStayForm.stayDuration}
                                onKeyDown={blockNonDigits}
                                onChange={(e) => {
                                    setBundledStayForm((p) => ({ ...p, stayDuration: e.target.value }));
                                    if (bundledStayErrors.stayDuration) setBundledStayErrors((p) => ({ ...p, stayDuration: undefined }));
                                }}
                                error={bundledStayErrors.stayDuration}
                            />
                            <FormInputField
                                label="Free Days (Y days) *"
                                placeholder="1 – 365"
                                type="number"
                                min="1"
                                max="365"
                                value={bundledStayForm.freeDays}
                                onKeyDown={blockNonDigits}
                                onChange={(e) => {
                                    setBundledStayForm((p) => ({ ...p, freeDays: e.target.value }));
                                    if (bundledStayErrors.freeDays) setBundledStayErrors((p) => ({ ...p, freeDays: undefined }));
                                }}
                                error={bundledStayErrors.freeDays}
                            />
                        </div>

                        {showScenario && (
                            <div className="rounded-[10px] bg-[#F2F8F2] border border-[#C8E6C9] px-4 py-3 text-sm text-[#434956]">
                                <span className="font-bold text-[#262D3B]">Scenario:</span>{" "}
                                Patient pays for{" "}
                                <span className="font-bold text-[#262D3B]">{stayNum} days</span>,
                                stays for{" "}
                                <span className="font-bold text-[#262D3B]">{stayNum + freeNum} days</span> total.
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <DatePicker
                                label="Start Date"
                                placeholder="DD/MM/YY"
                                value={bundledStayForm.startDate}
                                required
                                disablePastDates
                                onChange={(val) => {
                                    setBundledStayForm((p) => ({ ...p, startDate: val, endDate: p.endDate < val ? "" : p.endDate }));
                                    if (bundledStayErrors.startDate) setBundledStayErrors((p) => ({ ...p, startDate: undefined }));
                                    if (bundledStayErrors.endDate) setBundledStayErrors((p) => ({ ...p, endDate: undefined }));
                                }}
                                background="white"
                                width="100%"
                                error={bundledStayErrors.startDate}
                            />
                            <DatePicker
                                label="End Date"
                                placeholder="DD/MM/YY"
                                value={bundledStayForm.endDate}
                                required
                                minDate={bundledStayForm.startDate || undefined}
                                onChange={(val) => {
                                    setBundledStayForm((p) => ({ ...p, endDate: val }));
                                    if (bundledStayErrors.endDate) setBundledStayErrors((p) => ({ ...p, endDate: undefined }));
                                }}
                                background="white"
                                width="100%"
                                error={bundledStayErrors.endDate}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4 ">
                            <div className="">
                                <PatientTypeButtonGroup
                                    label="Applicable Patient Type"
                                    options={PATIENT_TYPE_OPTIONS}
                                    value={bundledStayForm.patientType}
                                    onChange={(val) => {
                                        const t = val as PatientType;
                                        const autoId = t === "private" ? (privateDefaultPanelId ?? "") : t === "tpa" ? (tpaDefaultPanelId ?? "") : "";
                                        setBundledStayForm((p) => ({ ...p, patientType: t, panelId: autoId }));
                                        if (bundledStayErrors.panelId) setBundledStayErrors((p) => ({ ...p, panelId: undefined }));
                                    }}
                                />
                            </div>

                            {bundledStayForm.patientType === "panel" && (
                                <div className="">
                                    <FormSelectField
                                        label="Panel *"
                                        value={bundledStayForm.panelId || null}
                                        onChange={(val) => {
                                            const v = Array.isArray(val) ? (val[0] ?? "") : (val ?? "");
                                            setBundledStayForm((p) => ({ ...p, panelId: v }));
                                            if (bundledStayErrors.panelId) setBundledStayErrors((p) => ({ ...p, panelId: undefined }));
                                        }}
                                        options={panelOptions}
                                        placeholder={isLoadingPanels ? "Loading panels..." : !bundledStayForm.branch ? "Select branch first" : "Select Panel"}
                                        mode="single"
                                        background="white"
                                        disabled={!bundledStayForm.branch || isLoadingPanels}
                                        error={bundledStayErrors.panelId}
                                    />
                                </div>
                            )}
                        </div>


                        <div className="flex items-center gap-3 pt-2">
                            <Button variant="primary" onClick={handleSubmit} isLoading={isSubmitting}>{submitLabel}</Button>
                            <Button variant="outline" onClick={handleDialogClose} disabled={isSubmitting}>Cancel</Button>
                        </div>
                    </div>
                )}

                {/* ── Flat Discount ── */}
                {activeTab === "flat-discount" && (
                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormSelectField
                                label="Branch *"
                                value={flatDiscountForm.branch}
                                onChange={(val) => {
                                    setFlatDiscountForm((p) => ({ ...p, branch: Array.isArray(val) ? (val[0] ?? "") : (val ?? "") }));
                                    if (flatDiscountErrors.branch) setFlatDiscountErrors((p) => ({ ...p, branch: undefined }));
                                }}
                                options={branchOptions}
                                placeholder={isLoadingBranches ? "Loading branches..." : "Select Branch"}
                                mode="single"
                                background="white"
                                disabled={isEditMode || isLoadingBranches}
                                error={flatDiscountErrors.branch}
                            />
                            <FormInputField
                                label="Offer Name *"
                                placeholder="Enter offer name"
                                value={flatDiscountForm.offerName}
                                maxLength={100}
                                onChange={(e) => {
                                    setFlatDiscountForm((p) => ({ ...p, offerName: e.target.value }));
                                    if (flatDiscountErrors.offerName) setFlatDiscountErrors((p) => ({ ...p, offerName: undefined }));
                                }}
                                onBlur={() => setFlatDiscountForm((p) => ({ ...p, offerName: p.offerName.trim() }))}
                                error={flatDiscountErrors.offerName}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormInputField
                                label="Discount Percentage *"
                                placeholder="1 – 100"
                                type="number"
                                min="1"
                                max="100"
                                step="any"
                                value={flatDiscountForm.discountPercentage}
                                onKeyDown={blockNonDecimalDigits}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (!DECIMAL_PERCENTAGE_INPUT.test(val)) return;
                                    setFlatDiscountForm((p) => ({ ...p, discountPercentage: val }));
                                    if (flatDiscountErrors.discountPercentage) setFlatDiscountErrors((p) => ({ ...p, discountPercentage: undefined }));
                                }}
                                suffix={<span className="text-sm text-[#7B8089]">%</span>}
                                error={flatDiscountErrors.discountPercentage}
                            />
                            <PatientTypeButtonGroup
                                label="Applicable Patient Type"
                                options={PATIENT_TYPE_OPTIONS}
                                value={flatDiscountForm.patientType}
                                onChange={(val) => {
                                    const t = val as PatientType;
                                    const autoId = t === "private" ? (privateDefaultPanelId ?? "") : t === "tpa" ? (tpaDefaultPanelId ?? "") : "";
                                    setFlatDiscountForm((p) => ({ ...p, patientType: t, panelId: autoId }));
                                    if (flatDiscountErrors.panelId) setFlatDiscountErrors((p) => ({ ...p, panelId: undefined }));
                                }}
                            />
                        </div>



                        <div className={`grid ${flatDiscountForm.patientType === "panel" ? "grid-cols-2 " : "grid-cols-2"}  gap-4`}>
                            {flatDiscountForm.patientType === "panel" && (
                                <div className="">
                                    <FormSelectField
                                        label="Panel *"
                                        value={flatDiscountForm.panelId || null}
                                        onChange={(val) => {
                                            const v = Array.isArray(val) ? (val[0] ?? "") : (val ?? "");
                                            setFlatDiscountForm((p) => ({ ...p, panelId: v }));
                                            if (flatDiscountErrors.panelId) setFlatDiscountErrors((p) => ({ ...p, panelId: undefined }));
                                        }}
                                        options={panelOptions}
                                        placeholder={isLoadingPanels ? "Loading panels..." : !flatDiscountForm.branch ? "Select branch first" : "Select Panel"}
                                        mode="single"
                                        background="white"
                                        disabled={!flatDiscountForm.branch || isLoadingPanels}
                                        error={flatDiscountErrors.panelId}
                                    />
                                </div>
                            )}
                            <DatePicker
                                label="Start Date"
                                placeholder="DD/MM/YY"
                                value={flatDiscountForm.startDate}
                                required
                                disablePastDates
                                onChange={(val) => {
                                    setFlatDiscountForm((p) => ({ ...p, startDate: val, endDate: p.endDate < val ? "" : p.endDate }));
                                    if (flatDiscountErrors.startDate) setFlatDiscountErrors((p) => ({ ...p, startDate: undefined }));
                                    if (flatDiscountErrors.endDate) setFlatDiscountErrors((p) => ({ ...p, endDate: undefined }));
                                }}
                                background="white"
                                width="100%"
                                error={flatDiscountErrors.startDate}
                            />
                            <DatePicker
                                label="End Date"
                                placeholder="DD/MM/YY"
                                value={flatDiscountForm.endDate}
                                required
                                minDate={flatDiscountForm.startDate || undefined}
                                onChange={(val) => {
                                    setFlatDiscountForm((p) => ({ ...p, endDate: val }));
                                    if (flatDiscountErrors.endDate) setFlatDiscountErrors((p) => ({ ...p, endDate: undefined }));
                                }}
                                background="white"
                                width="100%"
                                error={flatDiscountErrors.endDate}
                            />
                        </div>



                        <div className="flex items-center gap-3 pt-2">
                            <Button variant="primary" onClick={handleSubmit} isLoading={isSubmitting}>{submitLabel}</Button>
                            <Button variant="outline" onClick={handleDialogClose} disabled={isSubmitting}>Cancel</Button>
                        </div>
                    </div>
                )}

                {/* ── Conditional Billing ── */}
                {activeTab === "conditional-billing" && (
                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormSelectField
                                label="Branch *"
                                value={conditionalBillingForm.branch}
                                onChange={(val) => {
                                    setConditionalBillingForm((p) => ({ ...p, branch: Array.isArray(val) ? (val[0] ?? "") : (val ?? "") }));
                                    if (conditionalBillingErrors.branch) setConditionalBillingErrors((p) => ({ ...p, branch: undefined }));
                                }}
                                options={branchOptions}
                                placeholder={isLoadingBranches ? "Loading branches..." : "Select Branch"}
                                mode="single"
                                background="white"
                                disabled={isEditMode || isLoadingBranches}
                                error={conditionalBillingErrors.branch}
                            />
                            <FormInputField
                                label="Offer Name *"
                                placeholder="Enter offer name"
                                value={conditionalBillingForm.offerName}
                                maxLength={100}
                                onChange={(e) => {
                                    setConditionalBillingForm((p) => ({ ...p, offerName: e.target.value }));
                                    if (conditionalBillingErrors.offerName) setConditionalBillingErrors((p) => ({ ...p, offerName: undefined }));
                                }}
                                onBlur={() => setConditionalBillingForm((p) => ({ ...p, offerName: p.offerName.trim() }))}
                                error={conditionalBillingErrors.offerName}
                            />

                            <FormInputField
                                label="Minimum Bill Amount *"
                                placeholder="Min 1"
                                type="number"
                                min="1"
                                step="any"
                                value={conditionalBillingForm.minBillAmount}
                                onKeyDown={blockNonDecimalDigits}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (!DECIMAL_AMOUNT_INPUT.test(val)) return;
                                    setConditionalBillingForm((p) => ({ ...p, minBillAmount: val }));
                                    if (conditionalBillingErrors.minBillAmount) setConditionalBillingErrors((p) => ({ ...p, minBillAmount: undefined }));
                                }}
                                suffix={<span className="text-sm text-[#7B8089]">₹</span>}
                                error={conditionalBillingErrors.minBillAmount}
                            />
                            <PatientTypeButtonGroup
                                label="Applicable Patient Type"
                                options={PATIENT_TYPE_OPTIONS}
                                value={conditionalBillingForm.patientType}
                                onChange={(val) => {
                                    const t = val as PatientType;
                                    const autoId = t === "private" ? (privateDefaultPanelId ?? "") : t === "tpa" ? (tpaDefaultPanelId ?? "") : "";
                                    setConditionalBillingForm((p) => ({ ...p, patientType: t, panelId: autoId }));
                                    if (conditionalBillingErrors.panelId) setConditionalBillingErrors((p) => ({ ...p, panelId: undefined }));
                                }}
                            />

                            {conditionalBillingForm.patientType === "panel" && (
                                <FormSelectField
                                    label="Panel *"
                                    value={conditionalBillingForm.panelId || null}
                                    onChange={(val) => {
                                        const v = Array.isArray(val) ? (val[0] ?? "") : (val ?? "");
                                        setConditionalBillingForm((p) => ({ ...p, panelId: v }));
                                        if (conditionalBillingErrors.panelId) setConditionalBillingErrors((p) => ({ ...p, panelId: undefined }));
                                    }}
                                    options={panelOptions}
                                    placeholder={isLoadingPanels ? "Loading panels..." : !conditionalBillingForm.branch ? "Select branch first" : "Select Panel"}
                                    mode="single"
                                    background="white"
                                    disabled={!conditionalBillingForm.branch || isLoadingPanels}
                                    error={conditionalBillingErrors.panelId}
                                />
                            )}

                            <FormInputField
                                label="Discount *"
                                placeholder="1 – 100"
                                type="number"
                                min="1"
                                max="100"
                                step="any"
                                value={conditionalBillingForm.discount}
                                onKeyDown={blockNonDecimalDigits}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (!DECIMAL_PERCENTAGE_INPUT.test(val)) return;
                                    setConditionalBillingForm((p) => ({ ...p, discount: val }));
                                    if (conditionalBillingErrors.discount) setConditionalBillingErrors((p) => ({ ...p, discount: undefined }));
                                }}
                                suffix={<span className="text-sm text-[#7B8089]">%</span>}
                                error={conditionalBillingErrors.discount}
                            />
                            <FormInputField
                                label="Max Cap *"
                                placeholder="Min 1"
                                type="number"
                                min="1"
                                step="any"
                                value={conditionalBillingForm.maxCap}
                                onKeyDown={blockNonDecimalDigits}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (!DECIMAL_AMOUNT_INPUT.test(val)) return;
                                    setConditionalBillingForm((p) => ({ ...p, maxCap: val }));
                                    if (conditionalBillingErrors.maxCap) setConditionalBillingErrors((p) => ({ ...p, maxCap: undefined }));
                                }}
                                suffix={<span className="text-sm text-[#7B8089]">₹</span>}
                                error={conditionalBillingErrors.maxCap}
                            />

                            <DatePicker
                                label="Start Date"
                                placeholder="DD/MM/YY"
                                value={conditionalBillingForm.startDate}
                                required
                                disablePastDates
                                onChange={(val) => {
                                    setConditionalBillingForm((p) => ({ ...p, startDate: val, endDate: p.endDate < val ? "" : p.endDate }));
                                    if (conditionalBillingErrors.startDate) setConditionalBillingErrors((p) => ({ ...p, startDate: undefined }));
                                    if (conditionalBillingErrors.endDate) setConditionalBillingErrors((p) => ({ ...p, endDate: undefined }));
                                }}
                                background="white"
                                width="100%"
                                error={conditionalBillingErrors.startDate}
                            />
                            <DatePicker
                                label="End Date"
                                placeholder="DD/MM/YY"
                                value={conditionalBillingForm.endDate}
                                required
                                minDate={conditionalBillingForm.startDate || undefined}
                                onChange={(val) => {
                                    setConditionalBillingForm((p) => ({ ...p, endDate: val }));
                                    if (conditionalBillingErrors.endDate) setConditionalBillingErrors((p) => ({ ...p, endDate: undefined }));
                                }}
                                background="white"
                                width="100%"
                                error={conditionalBillingErrors.endDate}
                            />
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <Button variant="primary" onClick={handleSubmit} isLoading={isSubmitting}>{submitLabel}</Button>
                            <Button variant="outline" onClick={handleDialogClose} disabled={isSubmitting}>Cancel</Button>
                        </div>
                    </div>
                )}

                {activeTab === "all-offers" && (
                    <div className="py-4 text-center text-sm text-[#9FA2AB]">
                        Please select a specific offer type tab to create an offer.
                    </div>
                )}
            </Dialog>

            {/* ── Toggle confirmation dialog ── */}
            <MessageDialog
                open={!!pendingToggle}
                onClose={() => { if (!isTogglingStatus) setPendingToggle(null); }}
                icon="/icons/questionMark.svg"
                iconBgColor="#FFF8E1"
                message={
                    pendingToggle
                        ? `Are you sure you want to ${pendingToggle.newStatus ? "activate" : "deactivate"} this offer?`
                        : ""
                }
                confirmText="Confirm"
                cancelText="Cancel"
                showCancel
                isActionLoading={isTogglingStatus}
                onConfirm={async () => {
                    if (!pendingToggle || isTogglingStatus) return;
                    try {
                        await updateOfferMasterStatus({
                            id: pendingToggle.offerId,
                            isActive: pendingToggle.newStatus,
                        }).unwrap();
                        setOfferStatuses((prev) => ({ ...prev, [pendingToggle.offerId]: pendingToggle.newStatus }));
                        setToggleSuccessMessage(
                            `Offer has been ${pendingToggle.newStatus ? "activated" : "deactivated"} successfully.`
                        );
                        setPendingToggle(null);
                        setShowToggleSuccessDialog(true);
                    } catch (err: unknown) {
                        const msg = (err as { data?: { message?: string } })?.data?.message ?? "Something went wrong. Please try again.";
                        setPendingToggle(null);
                        setToggleErrorMessage(msg);
                        setShowToggleErrorDialog(true);
                    }
                }}
                onCancel={() => { if (!isTogglingStatus) setPendingToggle(null); }}
            />

            {/* ── Toggle success dialog ── */}
            <MessageDialog
                open={showToggleSuccessDialog}
                onClose={() => setShowToggleSuccessDialog(false)}
                icon="/icons/SuccessCheck.svg"
                iconBgColor="#E8F5E9"
                message={toggleSuccessMessage}
                confirmText="OK"
                showCancel={false}
                onConfirm={() => setShowToggleSuccessDialog(false)}
            />

            {/* ── Toggle error dialog ── */}
            <MessageDialog
                open={showToggleErrorDialog}
                onClose={() => setShowToggleErrorDialog(false)}
                icon="/icons/CrossIcon.svg"
                iconBgColor="#FFEBEE"
                message={toggleErrorMessage}
                confirmText="OK"
                showCancel={false}
                onConfirm={() => setShowToggleErrorDialog(false)}
            />

            {/* ── Submit success dialog ── */}
            <MessageDialog
                open={showSubmitSuccessDialog}
                onClose={() => setShowSubmitSuccessDialog(false)}
                icon="/icons/SuccessCheck.svg"
                iconBgColor="#E8F5E9"
                message={submitSuccessMessage}
                confirmText="OK"
                showCancel={false}
                onConfirm={() => setShowSubmitSuccessDialog(false)}
            />

            {/* ── Submit error dialog ── */}
            <MessageDialog
                open={showSubmitErrorDialog}
                onClose={() => setShowSubmitErrorDialog(false)}
                icon="/icons/CrossIcon.svg"
                iconBgColor="#FFEBEE"
                message={submitErrorMessage}
                confirmText="OK"
                showCancel={false}
                onConfirm={() => setShowSubmitErrorDialog(false)}
            />
        </AppShell>
    );
}

"use client";

import Image from "next/image";
import { useState, useEffect, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
    Button,
    Dialog,
    FormInputField,
    FormSelectField,
    TableSearchInput,
    Pagination,
    MessageDialog,
    Toggle,
    Tooltip,
} from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import type { SelectOption } from "@/components/ui/FormSelectField";
import {
    useGetArogyaCardsQuery,
    useCreateArogyaCardMutation,
    useUpdateArogyaCardMutation,
    useGetBranchesQuery,
} from "@/store/api/settingsApi";
import { useDebounce } from "@/hooks/useDebounce";
import type { ArogyaCard, ArogyaBranchRule } from "@/store/api/settingsApi";
import { usePermission } from "@/hooks/usePermission";
import { useBranchFilter } from "@/hooks/useBranchFilter";

const statusOptions: SelectOption[] = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
];

const POLICY_KEYS = [
    { key: "consultant", label: "Consultancy" },
    { key: "service", label: "Services" },
    { key: "product", label: "Products" },
    { key: "pathology", label: "Lab Tests and Pathology" },
] as const;

type PolicyKey = (typeof POLICY_KEYS)[number]["key"];

const STORAGE_KEY = "health-card-management-state";

type StoredState = {
    searchTerm: string;
    currentPage: number;
    itemsPerPage: number;
};

const loadState = (): StoredState => {
    if (typeof window === "undefined") {
        return { searchTerm: "", currentPage: 1, itemsPerPage: 10 };
    }
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.itemsPerPage < 10) parsed.itemsPerPage = 10;
            return parsed;
        }
    } catch (e) {
        console.error("Failed to load state:", e);
    }
    return { searchTerm: "", currentPage: 1, itemsPerPage: 10 };
};

const saveState = (state: StoredState) => {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error("Failed to save state:", e);
    }
};

function formatDate(iso: string) {
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hour = d.getHours();
    const min = String(d.getMinutes()).padStart(2, "0");
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 || 12;
    return `${day}-${month}-${year} ${h12}:${min} ${ampm}`;
}

function getTotalCards(seriesStart: number, seriesEnd: number): number {
    if (seriesEnd < seriesStart) return 0;
    return seriesEnd - seriesStart + 1;
}

const defaultBranchRule = (branchId: number) => ({
    branchId,
    consultantBy: 0,
    consultantTo: 0,
    productBy: 0,
    productTo: 0,
    serviceBy: 0,
    serviceTo: 0,
    pathologyBy: 0,
    pathologyTo: 0,
    consultantRedeem: 0,
    consultantRedeemType: 0,
    productRedeem: 0,
    productRedeemType: 0,
    serviceRedeem: 0,
    serviceRedeemType: 0,
    pathologyRedeem: 0,
    pathologyRedeemType: 0,
});

type BranchRuleForm = ReturnType<typeof defaultBranchRule>;

function ruleFromApi(r: ArogyaBranchRule | null, branchId: number): BranchRuleForm {
    if (!r) return defaultBranchRule(branchId);
    return {
        branchId: r.branchId ?? branchId,
        consultantBy: r.consultantBy ?? 0,
        consultantTo: r.consultantTo ?? 0,
        productBy: r.productBy ?? 0,
        productTo: r.productTo ?? 0,
        serviceBy: r.serviceBy ?? 0,
        serviceTo: r.serviceTo ?? 0,
        pathologyBy: r.pathologyBy ?? 0,
        pathologyTo: r.pathologyTo ?? 0,
        consultantRedeem: r.consultantRedeem ?? 0,
        consultantRedeemType: r.consultantRedeemType ?? 0,
        productRedeem: r.productRedeem ?? 0,
        productRedeemType: r.productRedeemType ?? 0,
        serviceRedeem: r.serviceRedeem ?? 0,
        serviceRedeemType: r.serviceRedeemType ?? 0,
        pathologyRedeem: r.pathologyRedeem ?? 0,
        pathologyRedeemType: r.pathologyRedeemType ?? 0,
    };
}

export default function HealthCardManagementPage() {
    const healthCardPermission = usePermission("settings", { subModule: "health-card-management" });
    const canView = healthCardPermission.canView;
    const canAdd = healthCardPermission.canAdd;
    const canEdit = healthCardPermission.canEdit;

    const [searchTerm, setSearchTerm] = useState<string>(() => loadState().searchTerm);
    const [currentPage, setCurrentPage] = useState<number>(() => loadState().currentPage);
    const [itemsPerPage, setItemsPerPage] = useState<number>(() => loadState().itemsPerPage);
    const {
        selectedBranchFilter,
        setSelectedBranchFilter,
        branchFilterOptions: hookBranchFilterOptions,
        isLoadingBranches: isLoadingBranchFilter,
        isBranchFilterDisabled,
        filterBranchId: hookFilterBranchId,
    } = useBranchFilter();
    const [dialogMode, setDialogMode] = useState<"add" | "edit" | "view" | null>(null);
    const [selectedCard, setSelectedCard] = useState<ArogyaCard | null>(null);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
    const [apiErrorMessage, setApiErrorMessage] = useState("");

    const [formValues, setFormValues] = useState({
        cardName: "",
        cardType: "gold",
        description: "",
        status: "active" as string,
        seriesStart: "",
        seriesEnd: "",
        pointValuation: "",
        branchId: 1,
        branchRule: defaultBranchRule(1),
    });

    const debouncedSearch = useDebounce(searchTerm, 500);
    const searchParam = debouncedSearch.trim() || undefined;

    const seriesRangeError = useMemo(() => {
        const s = formValues.seriesStart.trim();
        const e = formValues.seriesEnd.trim();
        if (!s || !e) return "";
        if (!/^\d+$/.test(s) || !/^\d+$/.test(e)) return "";
        if (Number(e) < Number(s)) {
            return "Series End cannot be less than Series Start";
        }
        return "";
    }, [formValues.seriesStart, formValues.seriesEnd]);

    useEffect(() => {
        saveState({ searchTerm, currentPage, itemsPerPage });
    }, [searchTerm, currentPage, itemsPerPage]);

    const { data: cardsData, isLoading: isLoadingCards, refetch: refetchCards } = useGetArogyaCardsQuery({
        page: currentPage,
        limit: itemsPerPage,
        search: searchParam,
        branchId: hookFilterBranchId,
    }, { skip: !canView });

    const [createCard, { isLoading: isCreating }] = useCreateArogyaCardMutation();
    const [updateCard, { isLoading: isUpdating }] = useUpdateArogyaCardMutation();
    const isSubmitting = isCreating || isUpdating;

    const cards: ArogyaCard[] = cardsData?.data ?? [];
    const totalItems = cardsData?.total ?? cards.length;
    const totalPages = cardsData?.totalPages ?? (Math.ceil(totalItems / itemsPerPage) || 1);

    const handleAddNew = () => {
        if (!canAdd) return;
        const defaultBranchId = 1;
        setFormValues({
            cardName: "",
            cardType: "gold",
            description: "",
            status: "active",
            seriesStart: "",
            seriesEnd: "",
            pointValuation: "",
            branchId: defaultBranchId,
            branchRule: defaultBranchRule(defaultBranchId),
        });
        setFormErrors({});
        setSelectedCard(null);
        setDialogMode("add");
    };

    const handleEdit = (card: ArogyaCard) => {
        if (!canEdit) return;
        setSelectedCard(card);
        const branchId = card.arogyaBranchRule?.branchId ?? 1;
        setFormValues({
            cardName: card.cardName,
            cardType: card.cardType || "gold",
            description: card.description ?? "",
            status: card.status ?? "active",
            seriesStart: String(card.seriesStart),
            seriesEnd: String(card.seriesEnd),
            pointValuation: String(card.pointValuation ?? ""),
            branchId,
            branchRule: ruleFromApi(card.arogyaBranchRule, branchId),
        });
        setFormErrors({});
        setDialogMode("edit");
    };

    const handleView = (card: ArogyaCard) => {
        if (!canView) return;
        setSelectedCard(card);
        const branchId = card.arogyaBranchRule?.branchId ?? 1;
        setFormValues({
            cardName: card.cardName,
            cardType: card.cardType || "gold",
            description: card.description ?? "",
            status: card.status ?? "active",
            seriesStart: String(card.seriesStart),
            seriesEnd: String(card.seriesEnd),
            pointValuation: String(card.pointValuation ?? ""),
            branchId,
            branchRule: ruleFromApi(card.arogyaBranchRule, branchId),
        });
        setFormErrors({});
        setDialogMode("view");
    };

    const setBranchRule = (updater: (prev: BranchRuleForm) => BranchRuleForm) => {
        setFormValues((prev) => ({ ...prev, branchRule: updater(prev.branchRule) }));
    };

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};
        if (!formValues.cardName.trim()) errors.cardName = "Health Card Name is required";
        if (!formValues.seriesStart.trim()) errors.seriesStart = "Series Start is required";
        else if (!/^\d+$/.test(formValues.seriesStart)) errors.seriesStart = "Enter a valid number";
        if (!formValues.seriesEnd.trim()) errors.seriesEnd = "Series End is required";
        else if (!/^\d+$/.test(formValues.seriesEnd)) errors.seriesEnd = "Enter a valid number";
        else if (
            /^\d+$/.test(formValues.seriesStart) &&
            /^\d+$/.test(formValues.seriesEnd) &&
            Number(formValues.seriesEnd) < Number(formValues.seriesStart)
        ) {
            errors.seriesEnd = "Series End cannot be less than Series Start";
        }
        if (dialogMode === "add") {
            if (!formValues.pointValuation.trim()) errors.pointValuation = "Point Valuation is required";
            else if (Number.isNaN(Number(formValues.pointValuation)) || Number(formValues.pointValuation) < 0) {
                errors.pointValuation = "Enter a valid number";
            }
        }
        if (dialogMode === "edit" && selectedCard) {
            if (formValues.pointValuation.trim() && (Number.isNaN(Number(formValues.pointValuation)) || Number(formValues.pointValuation) < 0)) {
                errors.pointValuation = "Enter a valid number";
            }
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (dialogMode === "add" && !canAdd) return;
        if (dialogMode === "edit" && !canEdit) return;
        if (!validateForm() || isSubmitting) return;

        const branchRule = formValues.branchRule;
        const branchRulePayload = {
            branchId: formValues.branchId,
            consultantBy: branchRule.consultantBy,
            consultantTo: branchRule.consultantTo,
            productBy: branchRule.productBy,
            productTo: branchRule.productTo,
            serviceBy: branchRule.serviceBy,
            serviceTo: branchRule.serviceTo,
            pathologyBy: branchRule.pathologyBy,
            pathologyTo: branchRule.pathologyTo,
            consultantRedeem: branchRule.consultantRedeem,
            consultantRedeemType: branchRule.consultantRedeemType,
            productRedeem: branchRule.productRedeem,
            productRedeemType: branchRule.productRedeemType,
            serviceRedeem: branchRule.serviceRedeem,
            serviceRedeemType: branchRule.serviceRedeemType,
            pathologyRedeem: branchRule.pathologyRedeem,
            pathologyRedeemType: branchRule.pathologyRedeemType,
        };

        try {
            if (dialogMode === "add") {
                const payload = {
                    cardName: formValues.cardName.trim(),
                    cardType: formValues.cardType,
                    description: formValues.description.trim() || undefined,
                    pointValuation: Number(formValues.pointValuation),
                    seriesStart: formValues.seriesStart,
                    seriesEnd: formValues.seriesEnd,
                    status: formValues.status,
                    branchRule: branchRulePayload,
                };
                const result = await createCard(payload).unwrap();
                setSuccessMessage(result?.message ?? "Health card created successfully");
            } else if (dialogMode === "edit" && selectedCard) {
                const payload = {
                    id: selectedCard.id,
                    cardName: formValues.cardName.trim(),
                    pointValuation: formValues.pointValuation.trim() ? Number(formValues.pointValuation) : undefined,
                    seriesStart: formValues.seriesStart.trim() || undefined,
                    seriesEnd: formValues.seriesEnd.trim() || undefined,
                    status: formValues.status,
                    branchRule: branchRulePayload,  
                };
                const result = await updateCard(payload).unwrap();
                setSuccessMessage(result?.message ?? "Health card updated successfully");
            }
            setShowSuccessDialog(true);
            await refetchCards();
            setDialogMode(null);
            setSelectedCard(null);
        } catch (err: unknown) {
            const error = err as { data?: { message?: string }; message?: string };
            const msg = error?.data?.message ?? error?.message ?? "Something went wrong. Please try again.";
            setApiErrorMessage(msg);
            setShowApiErrorDialog(true);
        }
    };

    const handlePageChange = (page: number) => setCurrentPage(page);
    const handleItemsPerPageChange = (items: number) => {
        setItemsPerPage(items);
        setCurrentPage(1);
    };

    const closeDialog = () => {
        if (!isSubmitting) {
            setDialogMode(null);
            setFormErrors({});
            setSelectedCard(null);
        }
    };

    return (
        <AppShell>
            <div className="space-y-8">
                <div className="flex items-start justify-between">
                    <PageHeading title="Health Card Management" />
                </div>

                <ListBorder as="section" className="px-4 py-4">
                    {!canView ? (
                        <div className="rounded-[20px] border border-[#E3EEE1] bg-white px-6 py-10 text-center text-sm text-[#9CA3AF]">
                            You don&apos;t have permission to view health card management.
                        </div>
                    ) : (
                    <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-lg font-semibold leading-[120%] text-[#434956]"></h2>
                            <div className="flex items-center gap-3">
                                <FormSelectField
                                    label=""
                                    hideLabel
                                    options={hookBranchFilterOptions}
                                    value={selectedBranchFilter}
                                    onChange={(value) => {
                                        setSelectedBranchFilter(Array.isArray(value) ? value[0] : value || "");
                                        setCurrentPage(1);
                                    }}
                                    placeholder={isLoadingBranchFilter ? "Loading branches..." : "Select Branch"}
                                    mode="single"
                                    background="normal"
                                    width={300}
                                    disabled={isBranchFilterDisabled || isLoadingBranchFilter}
                                />
                                <div className="w-[300px]">
                                    <TableSearchInput
                                        value={searchTerm}
                                        onChange={setSearchTerm}
                                        placeholder="Search Here..."
                                    />
                                </div>
                                {canAdd ? (
                                    <button
                                        type="button"
                                        className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] whitespace-nowrap"
                                        onClick={handleAddNew}
                                    >
                                        <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                                        <span>Add Health Card</span>
                                    </button>
                                ) : null}
                            </div>
                        </div>

                        {isLoadingCards ? (
                            <div className="py-12 text-center text-sm text-[#9CA3AF]">Loading...</div>
                        ) : (
                            <>
                                <div className="space-y-4">
                                    {cards.map((card, index) => {
                                        const r = card.arogyaBranchRule;
                                        const totalCards = getTotalCards(card.seriesStart, card.seriesEnd);
                                        const statusLabel = card.status === "active" ? "Active" : "Inactive";
                                        return (
                                            <div
                                                key={card.id}
                                                className="w-full rounded-[20px] border border-[#DFE0E2] bg-white p-5 shadow-[0px_1px_8px_rgba(25,33,61,0.06)]"
                                            >
                                                <div className="-mx-5 mb-5 flex items-start justify-between border-b border-[#DFE0E2] px-5 pb-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F2F8F2] text-sm font-medium text-[#0B8C00]">
                                                            {(currentPage - 1) * itemsPerPage + index + 1}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h3 className="text-base font-semibold leading-[120%] text-[#434956]">{card.cardName}</h3>
                                                            <p className="mt-0.5 text-xs leading-[120%] text-[#525763]">
                                                                Series: {card.seriesStart} - {card.seriesEnd}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className={`inline-flex h-[30px] min-w-[76px] shrink-0 items-center justify-center rounded-[30px] border px-5 text-xs font-medium leading-[120%] ${
                                                                card.status === "active"
                                                                    ? "border-[#0B8C00]/20 bg-[#0B8C000D] text-[#0B8C00]"
                                                                    : "border-[#F6776E]/24 bg-[#F6776E0D] text-[#F6776E]"
                                                            }`}
                                                        >
                                                            {statusLabel}
                                                        </span>
                                                        {canView ? (
                                                            <Tooltip content="View" position="top" delay={0}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleView(card)}
                                                                    className="flex h-8 w-8 items-center justify-center rounded-[12px] border border-[#DFE0E2] transition-colors hover:bg-gray-50"
                                                                    aria-label="View"
                                                                >
                                                                    <Image src="/icons/ViewLightIcon.svg" alt="View" width={16} height={16} />
                                                                </button>
                                                            </Tooltip>
                                                        ) : null}
                                                        {canEdit ? (
                                                            <Tooltip content="Edit" position="top" delay={0}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleEdit(card)}
                                                                    className="flex h-8 w-8 items-center justify-center rounded-[12px] border border-[#DFE0E2] transition-colors hover:bg-gray-50"
                                                                    aria-label="Edit"
                                                                >
                                                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                        <path d="M10.707 1.5625C10.8302 1.5625 10.9526 1.58666 11.0664 1.63379C11.18 1.68089 11.2832 1.74999 11.3701 1.83691L14.1631 4.62988C14.2501 4.71685 14.3191 4.81998 14.3662 4.93359C14.4133 5.04735 14.4375 5.16984 14.4375 5.29297C14.4375 5.416 14.4133 5.53771 14.3662 5.65137C14.3191 5.76511 14.2502 5.86901 14.1631 5.95605L7.05664 13.0625H13.5C13.616 13.0625 13.7275 13.1084 13.8096 13.1904C13.8916 13.2725 13.9375 13.384 13.9375 13.5C13.9375 13.616 13.8916 13.7276 13.8096 13.8096C13.7275 13.8916 13.616 13.9375 13.5 13.9375H3C2.7514 13.9375 2.51272 13.8389 2.33691 13.6631C2.16113 13.4873 2.06254 13.2486 2.0625 13V10.2061C2.06217 10.0831 2.0867 9.96121 2.13379 9.84766C2.18094 9.73407 2.2496 9.63056 2.33691 9.54395L10.0439 1.83691C10.131 1.74984 10.2349 1.68092 10.3486 1.63379C10.4623 1.58675 10.584 1.56252 10.707 1.5625ZM2.9375 10.1807V13.0625H5.81934L5.83691 13.0439L11.3369 7.54395L11.3818 7.5L11.3369 7.45605L8.54395 4.66211L8.5 4.61816L2.9375 10.1807ZM10.6631 2.45605L9.11914 4L11.9561 6.83691L12 6.88184L12.0439 6.83691L13.5439 5.33691L13.5889 5.29297L13.5439 5.24902L10.752 2.45605L10.707 2.41113L10.6631 2.45605Z" fill="#434956" stroke="#434956" strokeWidth="0.125" />
                                                                    </svg>
                                                                </button>
                                                            </Tooltip>
                                                        ) : null}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-6 mb-5">
                                                    <div>
                                                        <p className="text-xs leading-[120%] text-[#7B8089]">Point Valuation</p>
                                                        <p className="mt-0.5 text-sm font-medium leading-[120%] text-[#262D3B]">1 Point = ₹ {Number(card.pointValuation).toFixed(2)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs leading-[120%] text-[#7B8089]">Total Cards in Series</p>
                                                        <p className="mt-0.5 text-sm font-medium leading-[120%] text-[#262D3B]">{totalCards}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs leading-[120%] text-[#7B8089]">Created At</p>
                                                        <p className="mt-0.5 text-sm font-medium leading-[120%] text-[#262D3B]">{formatDate(card.createdAt)}</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <p className="text-md font-medium leading-[120%] text-[#262D3B]">Earning Policies</p>
                                                    <div className="grid grid-cols-2 gap-6">
                                                        {POLICY_KEYS.map(({ key, label }) => {
                                                            const by = key === "consultant" ? r?.consultantBy : key === "service" ? r?.serviceBy : key === "product" ? r?.productBy : r?.pathologyBy;
                                                            const to = key === "consultant" ? r?.consultantTo : key === "service" ? r?.serviceTo : key === "product" ? r?.productTo : r?.pathologyTo;
                                                            const redeem = key === "consultant" ? r?.consultantRedeem : key === "service" ? r?.serviceRedeem : key === "product" ? r?.productRedeem : r?.pathologyRedeem;
                                                            return (
                                                                <div key={key} className="w-full rounded-[20px] border border-[#DFE0E2] bg-[#0B8C00]/5 p-5 shadow-[0px_1px_8px_rgba(25,33,61,0.06)]">
                                                                    <p className="mt-0.5 text-sm font-medium leading-[120%] text-[#262D3B] mb-3">{label}</p>
                                                                    <div className="grid grid-cols-3 gap-6">
                                                                        <div>
                                                                            <p className="text-xs leading-[120%] text-[#7B8089]">Referrer</p>
                                                                            <p className="mt-0.5 text-sm font-medium leading-[120%] text-[#262D3B]">{by ?? 0}%</p>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-xs leading-[120%] text-[#7B8089]">Referee</p>
                                                                            <p className="mt-0.5 text-sm font-medium leading-[120%] text-[#262D3B]">{to ?? 0}%</p>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-xs leading-[120%] text-[#7B8089]">Daily Pts</p>
                                                                            <p className="mt-0.5 text-sm font-medium leading-[120%] text-[#262D3B]">{redeem ?? 0}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {cards.length === 0 && (
                                    <div className="py-12 text-center text-sm text-[#9CA3AF]">No health cards found</div>
                                )}
                            </>
                        )}

                        {!isLoadingCards && totalItems > 0 && (
                            <Pagination
                                currentPage={currentPage}
                                totalItems={totalItems}
                                itemsPerPage={itemsPerPage}
                                onPageChange={handlePageChange}
                                onItemsPerPageChange={handleItemsPerPageChange}
                                itemsPerPageOptions={[10, 20, 50, 100]}
                            />
                        )}
                    </div>
                    )}
                </ListBorder>
            </div>

            <Dialog
                open={
                    (dialogMode === "add" && canAdd) ||
                    (dialogMode === "edit" && canEdit) ||
                    (dialogMode === "view" && canView)
                }
                onClose={closeDialog}
                title={dialogMode === "add" ? "Add Health Card" : dialogMode === "view" ? "View Health Card" : "Edit Health Card"}
                width={950}
            >
                <form onSubmit={dialogMode === "view" ? (e) => e.preventDefault() : handleSubmit} className="space-y-6">
                    <p className="text-sm font-medium leading-[120%] text-[#262D3B] mb-4">Basic Information</p>
                    <div className="grid grid-cols-2 gap-4 mb-5">
                        <FormInputField
                            label="Health Card Name"
                            value={formValues.cardName}
                            onChange={(e) => {
                                if (dialogMode === "view") return;
                                setFormValues((prev) => ({ ...prev, cardName: e.target.value }));
                                setFormErrors((prev) => ({ ...prev, cardName: "" }));
                            }}
                            height={44}
                            placeholder="Health Card Name"
                            required={dialogMode !== "view"}
                            disabled={dialogMode === "view"}
                            error={formErrors.cardName}
                        />
                        <FormSelectField
                            label="Status"
                            value={formValues.status}
                            onChange={(v) => {
                                if (dialogMode === "view") return;
                                setFormValues((prev) => ({ ...prev, status: (Array.isArray(v) ? v[0] : v) || "active" }));
                            }}
                            options={statusOptions}
                            placeholder="Status"
                            mode="single"
                            background="white"
                            disabled={dialogMode === "view"}
                        />
                        <FormInputField
                            label="Series Start"
                            value={formValues.seriesStart}
                            onChange={(e) => {
                                if (dialogMode === "view") return;
                                const v = e.target.value.replace(/\D/g, "").slice(0, 15);
                                setFormValues((prev) => ({ ...prev, seriesStart: v }));
                                setFormErrors((prev) => ({ ...prev, seriesStart: "" }));
                            }}
                            height={44}
                            placeholder="Series Start"
                            required={dialogMode !== "view"}
                            disabled={dialogMode === "view"}
                            error={formErrors.seriesStart}
                        />
                        <FormInputField
                            label="Series End"
                            value={formValues.seriesEnd}
                            onChange={(e) => {
                                if (dialogMode === "view") return;
                                const v = e.target.value.replace(/\D/g, "").slice(0, 15);
                                setFormValues((prev) => ({ ...prev, seriesEnd: v }));
                                setFormErrors((prev) => ({ ...prev, seriesEnd: "" }));
                            }}
                            height={44}
                            placeholder="Series End"
                            required={dialogMode !== "view"}
                            disabled={dialogMode === "view"}
                            error={formErrors.seriesEnd || seriesRangeError}
                        />
                        <div className="col-span-2">
                            {dialogMode === "add" && (
                                <FormInputField
                                    label="Point Valuation (₹)"
                                    value={formValues.pointValuation}
                                    onChange={(e) => {
                                        const v = e.target.value.replace(/[^\d.]/g, "").slice(0, 10);
                                        setFormValues((prev) => ({ ...prev, pointValuation: v }));
                                        setFormErrors((prev) => ({ ...prev, pointValuation: "" }));
                                    }}
                                    height={44}
                                    placeholder="e.g. 1.00"
                                    required
                                    error={formErrors.pointValuation}
                                />
                            )}
                            {dialogMode === "edit" && (
                                <FormInputField
                                    label="Point Valuation (₹)"
                                    value={formValues.pointValuation}
                                    onChange={(e) => {
                                        const v = e.target.value.replace(/[^\d.]/g, "").slice(0, 10);
                                        setFormValues((prev) => ({ ...prev, pointValuation: v }));
                                        setFormErrors((prev) => ({ ...prev, pointValuation: "" }));
                                    }}
                                    height={44}
                                    placeholder="e.g. 1.00"
                                    error={formErrors.pointValuation}
                                />
                            )}
                        </div>
                    </div>
                    {dialogMode === "add" && formValues.seriesStart && formValues.seriesEnd && /^\d+$/.test(formValues.seriesStart) && /^\d+$/.test(formValues.seriesEnd) && !seriesRangeError && (
                        <p className="text-sm text-[#0B8C00] mb-4">
                            Total cards in series: {getTotalCards(Number(formValues.seriesStart), Number(formValues.seriesEnd))}
                        </p>
                    )}
                    {dialogMode === "edit" && formValues.seriesStart && formValues.seriesEnd && /^\d+$/.test(formValues.seriesStart) && /^\d+$/.test(formValues.seriesEnd) && !seriesRangeError && (
                        <p className="text-sm text-[#0B8C00] mb-4">
                            Total cards in series: {getTotalCards(Number(formValues.seriesStart), Number(formValues.seriesEnd))}
                        </p>
                    )}

                    <div className="w-full rounded-[20px] border border-[#DFE0E2] bg-[#0B8C00]/5 p-5 shadow-[0px_1px_8px_rgba(25,33,61,0.06)]">
                        <p className="text-sm font-medium leading-[120%] text-[#262D3B] mb-4">Earning Policies Configuration</p>
                        {POLICY_KEYS.map(({ key, label }) => {
                            const byKey = `${key}By` as keyof BranchRuleForm;
                            const toKey = `${key}To` as keyof BranchRuleForm;
                            const redeemKey = `${key}Redeem` as keyof BranchRuleForm;
                            const typeKey = `${key}RedeemType` as keyof BranchRuleForm;
                            const byVal = formValues.branchRule[byKey] as number;
                            const toVal = formValues.branchRule[toKey] as number;
                            const redeemVal = formValues.branchRule[redeemKey] as number;
                            const typeVal = formValues.branchRule[typeKey] as number;
                            const isPercent = typeVal === 1;
                            return (
                                <div key={key} className="w-full rounded-[20px] border border-[#DFE0E2] bg-white p-5 shadow-[0px_1px_8px_rgba(25,33,61,0.06)] mb-4 last:mb-0">
                                    <p className="text-sm font-medium leading-[120%] text-[#262D3B] mb-4">{label}</p>
                                    <div className="grid grid-cols-3 gap-4 items-end">
                                        <FormInputField
                                            label="Referrer Gets (%)"
                                            value={String(byVal)}
                                            onChange={(e) => {
                                                if (dialogMode === "view") return;
                                                const v = e.target.value.replace(/[^\d.]/g, "").slice(0, 6);
                                                setBranchRule((prev) => ({ ...prev, [byKey]: Number(v) || 0 }));
                                            }}
                                            height={44}
                                            placeholder="0"
                                            disabled={dialogMode === "view"}
                                        />
                                        <FormInputField
                                            label="Referee Gets (%)"
                                            value={String(toVal)}
                                            onChange={(e) => {
                                                if (dialogMode === "view") return;
                                                const v = e.target.value.replace(/[^\d.]/g, "").slice(0, 6);
                                                setBranchRule((prev) => ({ ...prev, [toKey]: Number(v) || 0 }));
                                            }}
                                            height={44}
                                            placeholder="0"
                                            disabled={dialogMode === "view"}
                                        />
                                        <div className="flex flex-col gap-2">
                                            <FormInputField
                                                label={isPercent ? "Daily Redeemable Points %" : "Daily Redeemable Points"}
                                                value={String(redeemVal)}
                                                onChange={(e) => {
                                                    if (dialogMode === "view") return;
                                                    const v = e.target.value.replace(/[^\d.]/g, "").slice(0, 10);
                                                    setBranchRule((prev) => ({ ...prev, [redeemKey]: Number(v) || 0 }));
                                                }}
                                                height={44}
                                                placeholder={isPercent ? "%" : "Absolute"}
                                                disabled={dialogMode === "view"}
                                            />
                                           
                                        </div>
                                    </div>
                                    <div className="flex gap-3 items-center flex-wrap justify-end mt-3">
                                                <span className="text-sm text-[#262D3B]">Absolute Value</span>
                                                <Toggle
                                                    checked={isPercent}
                                                    onChange={(checked) => {
                                                        if (dialogMode === "view") return;
                                                        setBranchRule((prev) => ({ ...prev, [typeKey]: checked ? 1 : 0 }));
                                                    }}
                                                    label="% Value"
                                                />
                                            </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {dialogMode === "view" ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeDialog}
                            >
                                Close
                            </Button>
                        ) : (
                            <>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    isLoading={isSubmitting}
                                    disabled={isSubmitting || !!seriesRangeError}
                                >
                                    {dialogMode === "add" ? "Add Health Card" : "Update Health Card"}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={closeDialog}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </Button>
                            </>
                        )}
                    </div>
                </form>
            </Dialog>

            <MessageDialog
                open={showSuccessDialog}
                onClose={() => setShowSuccessDialog(false)}
                icon="/icons/SuccessCheck.svg"
                iconBgColor="#E8F5E9"
                message={successMessage}
                confirmText="Success"
                showCancel={false}
                onConfirm={() => setShowSuccessDialog(false)}
            />
            <MessageDialog
                open={showApiErrorDialog}
                onClose={() => setShowApiErrorDialog(false)}
                icon="/icons/CrossIcon.svg"
                iconBgColor="#FFEBEE"
                message={apiErrorMessage}
                confirmText="OK"
                showCancel={false}
                onConfirm={() => setShowApiErrorDialog(false)}
            />
        </AppShell>
    );
}

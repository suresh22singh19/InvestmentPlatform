"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { MessageDialog } from "@/components/ui/MessageDialog";
import { Badge } from "@/components/ui/Badge";
import { Toggle } from "@/components/ui/Toggle";
import { BackToPreviousPageButton } from "@/components/ui/Buttons";
import { Tabs } from "@/components/ui/Tabs";
import { ListBorder } from "@/components/ui/ListBorder";
import { FormInputField } from "@/components/ui/FormInputField";
import { TableSearchInput } from "@/components/ui/TableSearchInput";
import { FormSelectField } from "@/components/ui/FormSelectField";
import { Pagination } from "@/components/ui/Pagination";
import { Tooltip } from "@/components/ui/Tooltip";
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableData,
} from "@/components/ui/Table";
import { Button } from "@/components/ui";
import { Checkbox } from "@/components/ui/CustomCheckbox";
import { Dialog } from "@/components/ui/Dialog";
import { useGetBranchesQuery } from "@/store/api/settingsApi";
import { useGetArogyaCardBranchesQuery, useAllocateBranchSeriesMutation, useGetBranchSeriesAllocationQuery, useGetCardDashboardSummaryQuery, useUpdateBranchSeriesAllocationStatusMutation, useDeleteBranchSeriesAllocationMutation, useExtendBranchSeriesAllocationMutation } from "@/store/api/settingHealthCardApi";
import { useDebounce } from "@/hooks/useDebounce";

interface CardRange {
    id: string;
    start: number;
    end: number;
    cards: number;
    branchScope: string;
    issued: number;
    note: string;
    updatedText: string;
    status: "Active" | "Inactive";
}

const INITIAL_RANGES: CardRange[] = [
    {
        id: "1",
        start: 100001,
        end: 109000,
        cards: 9000,
        branchScope: "All Branches",
        issued: 0,
        note: "Initial launch batch",
        updatedText: "5 days ago",
        status: "Inactive",
    },
    {
        id: "2",
        start: 109001,
        end: 116000,
        cards: 7000,
        branchScope: "Chandigarh",
        issued: 3150, // 45%
        note: "Held — reprint pending",
        updatedText: "1 wk ago",
        status: "Inactive",
    },
    {
        id: "3",
        start: 116001,
        end: 127500,
        cards: 11500,
        branchScope: "Delhi",
        issued: 1150, // 10%
        note: "Delhi NCR allocation",
        updatedText: "2 wks ago",
        status: "Active",
    },
    {
        id: "4",
        start: 127501,
        end: 136000,
        cards: 8500,
        branchScope: "All Branches",
        issued: 5100, // 60%
        note: "Secondary distribution batch",
        updatedText: "3 wks ago",
        status: "Active",
    },
    {
        id: "5",
        start: 136001,
        end: 145000,
        cards: 9000,
        branchScope: "Mumbai",
        issued: 0,
        note: "West region allocation",
        updatedText: "1 month ago",
        status: "Inactive",
    },
    {
        id: "6",
        start: 145001,
        end: 150000,
        cards: 5000,
        branchScope: "Delhi",
        issued: 2500, // 50%
        note: "East Delhi extension",
        updatedText: "1 month ago",
        status: "Active",
    }
];


export default function CardSeriesPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const cardId = Number(searchParams?.get("cardId") || "0");

    const { data: branchesResponse } = useGetBranchesQuery();
    const { data: cardBranchesResponse } = useGetArogyaCardBranchesQuery(cardId, { skip: !cardId });
    const { data: dashboardSummaryResponse } = useGetCardDashboardSummaryQuery(cardId, { skip: !cardId });

    const cardData = dashboardSummaryResponse?.data?.card;
    const cardName = cardData?.cardName || "Health Card";
    const seriesStart = Number(cardData?.seriesStart || "0");
    const seriesEnd = Number(cardData?.seriesEnd || "0");
    const totalCardsCount = dashboardSummaryResponse?.data?.summary?.totalCardsInSeries || (seriesEnd ? (seriesEnd - seriesStart + 1) : 0);

    const urlStatusQuery = (searchParams?.get("status") || "").trim().toLowerCase();
    const cardStatusFromApi = (cardData?.status || "").trim().toLowerCase();
    const isCardInactive =
        urlStatusQuery === "inactive" ||
        urlStatusQuery === "false" ||
        urlStatusQuery === "0" ||
        cardStatusFromApi === "inactive" ||
        cardStatusFromApi === "false";

    const BRANCH_OPTIONS = useMemo(() => [
        { value: "all", label: "All Branch" },
        ...(cardBranchesResponse?.data || []).map((b) => ({
            value: String(b.branchId),
            label: b.branchName,
        })),
    ], [cardBranchesResponse]);

    // State variables
    const [allocateBranchSeries, { isLoading: isAllocating }] = useAllocateBranchSeriesMutation();
    const [updateBranchSeriesAllocationStatus, { isLoading: isUpdatingStatus }] = useUpdateBranchSeriesAllocationStatusMutation();
    const [extendBranchSeriesAllocation, { isLoading: isExtendingAllocation }] = useExtendBranchSeriesAllocationMutation();
    const [deleteBranchSeriesAllocation, { isLoading: isDeletingAllocation }] = useDeleteBranchSeriesAllocationMutation();
    const [ranges, setRanges] = useState<CardRange[]>(INITIAL_RANGES);
    const [selectedTab, setSelectedTab] = useState<"all" | "active" | "inactive">("all");
    const [branchFilter, setBranchFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const statusParam = selectedTab === "active" ? true : selectedTab === "inactive" ? false : undefined;
    const branchIdParam = branchFilter === "all" ? undefined : Number(branchFilter);

    const { data: allocationResponse } = useGetBranchSeriesAllocationQuery({
        cardId,
        status: statusParam,
        page: currentPage,
        limit: itemsPerPage,
        branchId: branchIdParam,
        search: debouncedSearchTerm || undefined,
    }, { skip: !cardId });

    const rangesFromApi: CardRange[] = useMemo(() => {
        return (allocationResponse?.data || []).map((item) => {
            const cardsCount = typeof item.cardCount === "number"
                ? item.cardCount
                : parseInt(String(item.cardCount || "0"), 10) || 0;
            const issuedCount = typeof item.issuedCardCount === "number"
                ? item.issuedCardCount
                : parseInt(String(item.issuedCardCount || "0"), 10) || 0;

            const startVal = typeof item.seriesStart === "number"
                ? item.seriesStart
                : parseInt(String(item.seriesStart || "0"), 10) || item.seriesStart;
            const endVal = typeof item.seriesEnd === "number"
                ? item.seriesEnd
                : parseInt(String(item.seriesEnd || "0"), 10) || item.seriesEnd;

            return {
                id: String(item.id),
                start: startVal as any,
                end: endVal as any,
                cards: cardsCount,
                branchScope: item.branchName,
                issued: issuedCount,
                note: item.lastUpdateNote || "N/A",
                updatedText: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString("en-GB") : "N/A",
                status: item.status ? "Active" : "Inactive"
            };
        });
    }, [allocationResponse]);

    const totalItems = allocationResponse?.total ?? 0;

    // Modal state for Create / Edit
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"add" | "edit">("add");
    const [editRangeId, setEditRangeId] = useState<string | null>(null);
    const [formCard, setFormCard] = useState("Select Card");
    const [formStart, setFormStart] = useState("");
    const [formEnd, setFormEnd] = useState("");
    const [formBranch, setFormBranch] = useState("All Branches");
    const [formNote, setFormNote] = useState("");
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const formCardRef = useRef(formCard);
    const formBranchRef = useRef(formBranch);
    const formStartRef = useRef(formStart);
    const formEndRef = useRef(formEnd);

    formCardRef.current = formCard;
    formBranchRef.current = formBranch;
    formStartRef.current = formStart;
    formEndRef.current = formEnd;

    const seriesCount = useMemo(() => {
        const s = parseInt(formStart);
        const e = parseInt(formEnd);
        if (isNaN(s) || isNaN(e)) return 0;
        return Math.max(0, e - s + 1);
    }, [formStart, formEnd]);

    const cardOptions = useMemo(() => {
        const rawOptions = [
            { value: "Select Card", label: "Select Card" },
            { value: cardName, label: cardName },
            { value: "Gold Health Card", label: "Gold Health Card" },
            { value: "Silver Health Card", label: "Silver Health Card" },
            { value: "Platinum Health Card", label: "Platinum Health Card" },
        ];
        const seen = new Set<string>();
        return rawOptions.filter(opt => {
            if (!opt.value) return false;
            if (seen.has(opt.value)) return false;
            seen.add(opt.value);
            return true;
        });
    }, [cardName]);

    const modalBranchOptions = useMemo(() => [
        { value: "Select Branch", label: "Select Branch" },

        ...(cardBranchesResponse?.data || []).map((b) => ({
            value: b.branchName,
            label: b.branchName,
        })),
    ], [cardBranchesResponse]);

    // Dialog messages
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

    // Status Update Modal state
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [statusModalRange, setStatusModalRange] = useState<CardRange | null>(null);
    const [statusModalValue, setStatusModalValue] = useState<"Active" | "Inactive">("Active");

    const summaryData = dashboardSummaryResponse?.data?.summary;
    // Calculate aggregated metrics in real-time
    const stats = useMemo(() => {
        const total = summaryData?.totalCardsInSeries ?? totalCardsCount;
        const active = summaryData?.activeCardCount ?? 0;
        const inactive = summaryData?.inactiveCardCount ?? 0;
        const issued = summaryData?.issuedCardCount ?? 0;
        const notIssued = summaryData?.remainingCards ?? Math.max(0, total - issued);

        return {
            total,
            active,
            inactive,
            issued,
            notIssued,
            activePercent: Math.round((active / total) * 100) || 0,
            inactivePercent: Math.round((inactive / total) * 100) || 0,
            issuedPercent: Math.round((issued / total) * 100) || 0,
            notIssuedPercent: Math.round((notIssued / total) * 100) || 0
        };
    }, [summaryData, totalCardsCount]);

    // Handle single row checkbox toggle
    const handleToggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    // Handle select all checkbox
    const handleSelectAll = (checked: boolean, filteredIds: string[]) => {
        if (checked) {
            setSelectedIds(filteredIds);
        } else {
            setSelectedIds([]);
        }
    };

    // Handle range status toggle switch (opens status update modal)
    const handleOpenStatusModal = (range: CardRange) => {
        if (isCardInactive) return;
        setStatusModalRange(range);
        setStatusModalValue(range.status);
        setIsStatusModalOpen(true);
    };

    const handleUpdateStatusConfirm = () => {
        if (!statusModalRange) return;

        // Mock error condition if trying to activate range starting at 109001
        if (statusModalRange.start === 109001 && statusModalValue === "Active") {
            setIsStatusModalOpen(false);
            setSuccessMessage("Failed to update status: Card range contains printed cards that are marked as damaged.");
            setShowErrorDialog(true);
            return;
        }

        if (statusModalValue === "Inactive") {
            setIsStatusModalOpen(false);
            setShowDeactivateConfirm(true);
            return;
        }

        updateBranchSeriesAllocationStatus({ id: Number(statusModalRange.id), status: true })
            .unwrap()
            .then((res) => {
                setRanges(prev =>
                    prev.map(r => (r.id === statusModalRange.id ? { ...r, status: "Active" } : r))
                );
                setIsStatusModalOpen(false);
                setSuccessMessage(res.message || "Range status updated successfully!");
                setShowSuccessDialog(true);
            })
            .catch((err) => {
                setIsStatusModalOpen(false);
                setErrorMessage(err?.data?.message || err?.message || "Failed to update range status.");
                setShowErrorDialog(true);
            });
    };

    const handleDeactivateConfirm = () => {
        if (!statusModalRange) return;
        updateBranchSeriesAllocationStatus({ id: Number(statusModalRange.id), status: false })
            .unwrap()
            .then((res) => {
                setRanges(prev =>
                    prev.map(r => (r.id === statusModalRange.id ? { ...r, status: "Inactive" } : r))
                );
                setShowDeactivateConfirm(false);
                setSuccessMessage(res.message || "Range status updated successfully!");
                setShowSuccessDialog(true);
            })
            .catch((err) => {
                setShowDeactivateConfirm(false);
                setErrorMessage(err?.data?.message || err?.message || "Failed to deactivate range status.");
                setShowErrorDialog(true);
            });
    };

    // Bulk status operations
    const handleBulkStatusChange = (status: "Active" | "Inactive") => {
        if (selectedIds.length === 0) return;
        setRanges(prev =>
            prev.map(r => (selectedIds.includes(r.id) ? { ...r, status } : r))
        );
        setSelectedIds([]);
        setSuccessMessage(`Successfully updated status of ${selectedIds.length} ranges to ${status}.`);
        setShowSuccessDialog(true);
    };

    // Blur validation handlers for the Card Issuance inputs
    const handleCardBlur = () => {
        const currentCard = formCardRef.current;
        setFormErrors(prev => {
            const next = { ...prev };
            if (!currentCard || currentCard === "Select Card") {
                next.card = "Please select a card.";
            } else {
                next.card = "";
            }
            return next;
        });
    };

    const handleBranchBlur = () => {
        const currentBranch = formBranchRef.current;
        setFormErrors(prev => {
            const next = { ...prev };
            if (!currentBranch || currentBranch === "Select Branch") {
                next.branch = "Please select a branch.";
            } else {
                next.branch = "";
            }
            return next;
        });
    };

    const validateStartOnChange = (val: string, endVal: string, currentErrors: Record<string, string>) => {
        const next = { ...currentErrors };
        const startVal = val.trim();

        if (!startVal) {
            next.start = "Series Start is required";
        } else if (!/^\d+$/.test(startVal)) {
            next.start = "Series Start must contain only digits";
        } else if (startVal.length !== 12) {
            next.start = "Series Start must be exactly 12 digits";
        } else {
            const sNum = Number(startVal);
            if (seriesStart && seriesEnd && (sNum < seriesStart || sNum > seriesEnd)) {
                next.start = `Must be between ${cardData?.seriesStart || seriesStart} and ${cardData?.seriesEnd || seriesEnd}`;
            } else {
                next.start = "";
            }
        }

        // Only validate relationship if both are present and valid 12-digit numbers
        if (startVal && endVal.trim() && /^\d+$/.test(startVal) && /^\d+$/.test(endVal.trim()) && startVal.length === 12 && endVal.trim().length === 12) {
            const sNum = Number(startVal);
            const eNum = Number(endVal.trim());
            if (seriesStart && seriesEnd && sNum >= seriesStart && sNum <= seriesEnd && eNum >= seriesStart && eNum <= seriesEnd) {
                if (startVal === endVal.trim()) {
                    next.end = "Series Start and End cannot be the same";
                } else if (eNum < sNum) {
                    next.end = "Series End must be greater than Start Series";
                } else if (next.end === "Series End must be greater than Start Series" || next.end === "Series Start and End cannot be the same") {
                    next.end = "";
                }
            }
        }

        return next;
    };

    const validateEndOnChange = (val: string, startVal: string, currentErrors: Record<string, string>) => {
        const next = { ...currentErrors };
        const endVal = val.trim();

        if (!endVal) {
            next.end = "Series End is required";
        } else if (!/^\d+$/.test(endVal)) {
            next.end = "Series End must contain only digits";
        } else if (endVal.length !== 12) {
            next.end = "Series End must be exactly 12 digits";
        } else {
            const eNum = Number(endVal);
            if (seriesStart && seriesEnd && (eNum < seriesStart || eNum > seriesEnd)) {
                next.end = `Must be between ${cardData?.seriesStart || seriesStart} and ${cardData?.seriesEnd || seriesEnd}`;
            } else {
                next.end = "";
            }
        }

        // Only validate relationship if both are present and valid 12-digit numbers
        if (startVal.trim() && endVal && /^\d+$/.test(startVal.trim()) && /^\d+$/.test(endVal) && startVal.trim().length === 12 && endVal.length === 12) {
            const sNum = Number(startVal.trim());
            const eNum = Number(endVal);
            if (seriesStart && seriesEnd && sNum >= seriesStart && sNum <= seriesEnd && eNum >= seriesStart && eNum <= seriesEnd) {
                if (startVal.trim() === endVal) {
                    next.end = "Series Start and End cannot be the same";
                } else if (eNum < sNum) {
                    next.end = "Series End must be greater than Start Series";
                } else if (next.end === "Series End must be greater than Start Series" || next.end === "Series Start and End cannot be the same") {
                    next.end = "";
                }
            }
        }

        return next;
    };

    const handleSeriesStartBlur = () => {
        const startVal = formStartRef.current.trim();
        const endVal = formEndRef.current.trim();
        setFormErrors(prev => validateStartOnChange(startVal, endVal, prev));
    };

    const handleSeriesEndBlur = () => {
        const startVal = formStartRef.current.trim();
        const endVal = formEndRef.current.trim();
        setFormErrors(prev => validateEndOnChange(endVal, startVal, prev));
    };

    // Modal submit handler (Add / Edit)
    const handleSaveRange = () => {
        const errors: Record<string, string> = {};
        const startVal = Number(formStart);
        const endVal = Number(formEnd);


        if (!formCard || formCard === "Select Card") {
            errors.card = "Please select a card.";
        }

        if (!formBranch || formBranch === "Select Branch") {
            errors.branch = "Please select a branch.";
        }

        if (!formStart.trim()) {
            errors.start = "Start range is required";
        } else if (isNaN(startVal)) {
            errors.start = "Must be a valid number";
        } else if (formStart.trim().length !== 12) {
            errors.start = "Series Start must be exactly 12 digits";
        } else if (seriesStart && seriesEnd && (startVal < seriesStart || startVal > seriesEnd)) {
            errors.start = `Must be between ${cardData?.seriesStart || seriesStart} and ${cardData?.seriesEnd || seriesEnd}`;
        }

        if (!formEnd.trim()) {
            errors.end = "End range is required";
        } else if (isNaN(endVal)) {
            errors.end = "Must be a valid number";
        } else if (formEnd.trim().length !== 12) {
            errors.end = "Series End must be exactly 12 digits";
        } else if (seriesStart && seriesEnd && (endVal < seriesStart || endVal > seriesEnd)) {
            errors.end = `Must be between ${cardData?.seriesStart || seriesStart} and ${cardData?.seriesEnd || seriesEnd}`;
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        let modalError = "";

        if (formStart.trim() && formEnd.trim() && !isNaN(startVal) && !isNaN(endVal) && formStart.trim().length === 12 && formEnd.trim().length === 12) {
            // Check 1: Series End must be greater than Series Start
            if (formStart.trim() === formEnd.trim()) {
                modalError = "Series Start and End cannot be the same";
            } else if (endVal < startVal) {
                modalError = "Series End must be greater than Series Start.";
            }

            // Check 2: Overlap check
            if (!modalError) {
                let isOverlapping = false;
                let overlappingWithActive = false;
                ranges.forEach(r => {
                    if (r.id === editRangeId) return;
                    const startOverlaps = startVal >= r.start && startVal <= r.end;
                    const endOverlaps = endVal >= r.start && endVal <= r.end;
                    const wrapsAround = startVal <= r.start && endVal >= r.end;
                    if (startOverlaps || endOverlaps || wrapsAround) {
                        isOverlapping = true;
                        if (r.status === "Active") {
                            overlappingWithActive = true;
                        }
                    }
                });

                if (isOverlapping) {
                    modalError = "This Series is already Allocated to another Branch";
                } else if (overlappingWithActive) {
                    modalError = "This card is already activated.";
                }
            }
        }

        if (modalError) {
            setErrorMessage(modalError);
            setShowErrorDialog(true);
            return;
        }

        const cardsCount = endVal - startVal + 1;

        if (modalMode === "add") {
            const branchObj = (cardBranchesResponse?.data || []).find((b: any) => b.branchName === formBranch)
                || (branchesResponse?.data || []).find((b: any) => b.name === formBranch);
            const branchId = branchObj ? ((branchObj as any).branchId || (branchObj as any).id) : 0;

            const body = {
                arogyaCardId: cardId,
                branchId: Number(branchId),
                seriesStart: formStart,
                seriesEnd: formEnd,
            };

            allocateBranchSeries(body)
                .unwrap()
                .then((res) => {
                    const newRange: CardRange = {
                        id: String(Date.now()),
                        start: startVal,
                        end: endVal,
                        cards: cardsCount,
                        branchScope: formBranch,
                        issued: 0,
                        note: formNote || "Allocated via Card Issuance",
                        updatedText: "Just now",
                        status: "Active"
                    };
                    setRanges(prev => [newRange, ...prev]);
                    setSuccessMessage(res.message || "Card range created successfully!");
                    setIsModalOpen(false);
                    setShowSuccessDialog(true);
                })
                .catch((err) => {
                    const errMsg = err?.data?.message || err?.message || "Failed to allocate branch series";
                    setErrorMessage(errMsg);
                    setShowErrorDialog(true);
                });
        } else {
            if (!editRangeId) return;

            const body = {
                seriesEnd: formEnd,
            };

            extendBranchSeriesAllocation({ id: Number(editRangeId), body })
                .unwrap()
                .then((res) => {
                    setRanges(prev =>
                        prev.map(r =>
                            r.id === editRangeId
                                ? {
                                    ...r,
                                    start: startVal,
                                    end: endVal,
                                    cards: cardsCount,
                                    branchScope: formBranch,
                                    note: formNote,
                                    updatedText: "Just now"
                                }
                                : r
                        )
                    );
                    setSuccessMessage(res.message || "Card range updated successfully!");
                    setIsModalOpen(false);
                    setShowSuccessDialog(true);
                })
                .catch((err) => {
                    const errMsg = err?.data?.message || err?.message || "Failed to update branch series allocation";
                    setErrorMessage(errMsg);
                    setShowErrorDialog(true);
                });
        }
    };

    // Open add range modal
    const openAddModal = () => {
        if (isCardInactive) return;
        setModalMode("add");
        setEditRangeId(null);
        setFormCard(cardName);
        setFormStart("");
        setFormEnd("");
        setFormBranch("Select Branch");
        setFormNote("");
        setFormErrors({});
        setIsModalOpen(true);
    };

    // Open edit range modal
    const openEditModal = (r: CardRange) => {
        if (isCardInactive) return;
        setModalMode("edit");
        setEditRangeId(r.id);
        setFormCard(cardName);
        setFormStart(String(r.start));
        setFormEnd(String(r.end));
        setFormBranch(r.branchScope);
        setFormNote(r.note);
        setFormErrors({});
        setIsModalOpen(true);
    };

    // Trigger delete card range
    const triggerDelete = (id: string) => {
        setDeleteTargetId(id);
        setShowDeleteConfirm(true);
    };

    // Execute delete card range
    const executeDelete = () => {
        if (!deleteTargetId) return;
        deleteBranchSeriesAllocation(Number(deleteTargetId))
            .unwrap()
            .then((res) => {
                setRanges(prev => prev.filter(r => r.id !== deleteTargetId));
                setSelectedIds(prev => prev.filter(id => id !== deleteTargetId));
                setShowDeleteConfirm(false);
                setDeleteTargetId(null);
                setSuccessMessage(res.message || "Card range deleted successfully!");
                setShowSuccessDialog(true);
            })
            .catch((err) => {
                setShowDeleteConfirm(false);
                setDeleteTargetId(null);
                setErrorMessage(err?.data?.message || err?.message || "Failed to delete card range.");
                setShowErrorDialog(true);
            });
    };

    // Filters logic
    const filteredRanges = rangesFromApi;

    // Paginated list
    const paginatedRanges = rangesFromApi;

    // Visual blocks for Series map
    const seriesBlocks = useMemo(() => {
        // Calculate percentages and visual segments for ranges
        return rangesFromApi.map(r => {
            const ratio = (r.cards / (totalCardsCount || 1)) * 100;
            // Determine segment color: Active -> Green, Inactive -> Pink/Red
            const isGreen = r.status === "Active";
            return {
                id: r.id,
                label: r.cards.toLocaleString(),
                width: `${ratio}%`,
                bgColor: isGreen ? "bg-[#0B8C00]" : r.id === "2" || r.id === "5" ? "bg-[#F6776E]" : "bg-[#FF8A80]",
                hoverText: `${r.start} - ${r.end} (${r.cards.toLocaleString()} cards) · ${r.branchScope} · ${r.status}`
            };
        });
    }, [rangesFromApi, totalCardsCount]);

    return (
        <AppShell>
            <div className="flex flex-col gap-6 w-full pb-8">
                {/* Heading Row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div>
                            <h1 className="font-bold text-2xl text-[#262D3B]">{cardName} — Card Series</h1>
                            <p className="text-xs font-semibold text-[#7B8089] mt-1">
                                Activate or deactivate ranges within series {seriesStart} - {seriesEnd} · {totalCardsCount.toLocaleString()} cards
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2 items-center justify-between">
                        <BackToPreviousPageButton onClick={() => router.push("/settings/health-card-management")} />

                        <Button
                            variant="outline"
                            size="medium"
                            onClick={openAddModal}
                            disabled={isCardInactive}
                            className="!bg-transparent cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                            leftIcon={<Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} />}
                        >
                            Card Issuance
                        </Button>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Active Cards */}
                    <div className="border border-[#E5E7EB] bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm">
                        <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-[#7B8089]">Actived</span>
                            <div className="flex items-baseline gap-1.5">
                                <span className="font-bold text-xl text-[#262D3B]">{stats.active.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-[#EAF7E8] flex items-center justify-center">
                            <Image src="/icons/SuccessCheck.svg" alt="Actived" width={22} height={22} />
                        </div>
                    </div>

                    {/* Inactive Cards */}
                    <div className="border border-[#E5E7EB] bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm">
                        <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-[#7B8089]">Inactive</span>
                            <div className="flex items-baseline gap-1.5">
                                <span className="font-bold text-xl text-[#262D3B]">{stats.inactive.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-[#EAF7E8] flex items-center justify-center">
                            <Image src="/icons/pauseGreenIcon.svg" alt="Inactive" width={22} height={22} />
                        </div>
                    </div>

                    {/* Issued Cards */}
                    <div className="border border-[#E5E7EB] bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm">
                        <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-[#7B8089]">Issue</span>
                            <div className="flex items-baseline gap-1.5">
                                <span className="font-bold text-xl text-[#262D3B]">{stats.issued.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-[#EAF7E8] flex items-center justify-center">
                            <Image src="/icons/StartsIcons.svg" alt="Issue" width={22} height={22} />
                        </div>
                    </div>

                    {/* Not Issued Cards */}
                    <div className="border border-[#E5E7EB] bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm">
                        <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-[#7B8089]">Not Issue</span>
                            <div className="flex items-baseline gap-1.5">
                                <span className="font-bold text-xl text-[#262D3B]">{stats.notIssued.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-[#EAF7E8] flex items-center justify-center">
                            <Image src="/icons/SecurityIcon.svg" alt="Not Issue" width={22} height={22} />
                        </div>
                    </div>
                </div>



                {/* Table Control and listing block */}
                <ListBorder className="bg-white p-6 shadow-sm space-y-6">
                    {/* Controls Row */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Tabs list (All, Active, Inactive) */}
                        <div className="w-[450px]">
                            <Tabs
                                options={[
                                    { value: "all", label: "All" },
                                    { value: "active", label: "Active" },
                                    { value: "inactive", label: "Inactive" },
                                ]}
                                value={selectedTab}
                                onChange={(val) => {
                                    setSelectedTab(val as any);
                                    setCurrentPage(1);
                                }}
                                className="  self-start"
                            />

                        </div>

                        {/* Search and Branch option fields */}
                        <div className="flex flex-col sm:flex-row items-center gap-4 flex-1 justify-end">
                            {/* Branch filter */}
                            <div className="w-full sm:w-[300px]">
                                <FormSelectField
                                    label="Branch Scope"
                                    options={BRANCH_OPTIONS}
                                    value={branchFilter}
                                    onChange={(val) => {
                                        const selectedVal = Array.isArray(val) ? val[0] : val;
                                        setBranchFilter(selectedVal || "all");
                                        setCurrentPage(1);
                                    }}
                                    hideLabel={true}
                                    width="100%"
                                />
                            </div>

                            {/* Search box */}
                            <div className="w-full sm:w-[320px]">
                                <TableSearchInput
                                    value={searchTerm}
                                    placeholder="Search by card number or note (e.g. 100250)"
                                    onChange={(val) => {
                                        setSearchTerm(val);
                                        setCurrentPage(1);
                                    }}
                                    sanitize={false}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Bulk selections bar */}
                    {selectedIds.length > 0 && (
                        <div className="flex items-center justify-between bg-[#0B8C00]/5 border border-[#0B8C00]/10 rounded-xl p-3 px-4">
                            <span className="text-xs font-semibold text-[#0B8C00] flex items-center gap-1.5">
                                <span className="inline-block w-4 h-4 rounded-full bg-[#0B8C00] text-white text-[10px] leading-[16px] text-center font-bold">✓</span>
                                {selectedIds.length} range{selectedIds.length > 1 ? "s" : ""} selected
                            </span>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => handleBulkStatusChange("Active")}
                                    disabled={isCardInactive}
                                    className={`border border-[#0B8C00] text-[#0B8C00] px-4 py-1.5 rounded-full font-bold text-xs transition ${isCardInactive ? "opacity-40 cursor-not-allowed" : "hover:bg-[#0B8C00]/5 cursor-pointer"}`}
                                >
                                    Activate
                                </button>
                                <button
                                    onClick={() => handleBulkStatusChange("Inactive")}
                                    disabled={isCardInactive}
                                    className={`border border-[#0B8C00] text-[#0B8C00] px-4 py-1.5 rounded-full font-bold text-xs transition ${isCardInactive ? "opacity-40 cursor-not-allowed" : "hover:bg-[#0B8C00]/5 cursor-pointer"}`}
                                >
                                    Deactivate
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Table list */}
                    <div className="border border-[#DFE0E2] rounded-xl overflow-hidden bg-white">
                        <Table>
                            <TableHeader>
                                <TableRow className="">
                                    <TableHead className="w-[50px] text-center">
                                        <Checkbox
                                            checked={
                                                paginatedRanges.length > 0 &&
                                                paginatedRanges.every(r => selectedIds.includes(r.id))
                                            }
                                            onChange={(checked) =>
                                                handleSelectAll(
                                                    checked,
                                                    paginatedRanges.map(r => r.id)
                                                )
                                            }
                                        />
                                    </TableHead>
                                    <TableHead className="h-[48px] text-center w-[90px]">Sr no.</TableHead>
                                    <TableHead className="text-left">Range</TableHead>
                                    <TableHead className="text-left">Cards</TableHead>
                                    <TableHead className="text-left">Branch scope</TableHead>
                                    <TableHead className="text-left w-[200px]">Issued</TableHead>
                                    {/* <TableHead className="text-left">Note</TableHead> */}
                                    <TableHead className="text-left">Updated</TableHead>
                                    <TableHead className="text-left">Status</TableHead>
                                    <TableHead className="text-left">Activate/Deactivate</TableHead>
                                    <TableHead className="text-left w-[100px]">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedRanges.length > 0 ? (
                                    paginatedRanges.map((range, index) => {
                                        const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
                                        const isSelected = selectedIds.includes(range.id);
                                        const isRangeActive = range.status === "Active";

                                        // Issued percent
                                        const totalCards = Number(range.cards) || 0;
                                        const issuedCount = Number(range.issued) || 0;
                                        const issuedPercent = totalCards > 0 ? Math.min(100, Math.max(0, Math.round((issuedCount / totalCards) * 100))) : 0;
                                        const isIssuedHigh = issuedPercent >= 40;
                                        const isIssuedMid = issuedPercent > 0 && issuedPercent < 40;

                                        return (
                                            <TableRow
                                                key={range.id}
                                                className={`hover:bg-gray-50/30 transition text-xs font-semibold text-[#434956] ${isSelected ? "bg-[#0B8C00]/5" : ""
                                                    }`}
                                            >
                                                <TableData className="text-center">
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onChange={() => handleToggleSelect(range.id)}
                                                    />
                                                </TableData>
                                                <TableData className="text-left h-[54px]">{globalIndex}</TableData>
                                                <TableData className="text-left font-bold text-gray-800">
                                                    {range.start} – {range.end}
                                                </TableData>
                                                <TableData className="text-left text-[#575962] font-mono">
                                                    {range.cards.toLocaleString()}
                                                </TableData>
                                                <TableData className="text-left">
                                                    <Badge variant="warning" className="border-none bg-[#FFF5D7] !text-[11px] !font-bold !text-[#9A7909] px-2 py-0.5">
                                                        {range.branchScope}
                                                    </Badge>
                                                </TableData>
                                                <TableData className="text-left">
                                                    <div className="flex flex-col gap-1 w-full">
                                                        <div className="flex justify-between items-center text-[10px] text-gray-500">
                                                            <span>{range.issued.toLocaleString()} ({issuedPercent}%)</span>
                                                        </div>
                                                        <div className="w-full bg-[#EBECED] h-1.5 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-300 ${isIssuedHigh ? "bg-[#0B8C00]" : isIssuedMid ? "bg-[#FF9800]" : "bg-gray-400"
                                                                    }`}
                                                                style={{ width: `${issuedPercent}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </TableData>
                                                {/* <TableData className="text-left text-gray-500 font-medium max-w-[200px] truncate">
                                                    {range.note}
                                                </TableData> */}
                                                <TableData className="text-left text-gray-400 font-medium">
                                                    {range.updatedText}
                                                </TableData>
                                                <TableData className="text-left">
                                                    <Badge variant={isRangeActive ? "success" : "neutral"} className={isRangeActive ? "" : "bg-[#FFEBEE]/50 !text-[#C62828] !border-[#FFEBEE]"}>
                                                        {range.status}
                                                    </Badge>
                                                </TableData>
                                                <TableData className="text-left">
                                                    <div className="flex items-left justify-left">
                                                        <Toggle
                                                            checked={isRangeActive}
                                                            onChange={() => !isCardInactive && handleOpenStatusModal(range)}
                                                            disabled={isCardInactive}
                                                            className="!w-10 !h-6"
                                                            width="w-[16px]"
                                                            height="h-[16px]"
                                                            transform={isRangeActive ? "!translate-x-[20px]" : "!translate-x-[4px]"}
                                                        />
                                                    </div>
                                                </TableData>
                                                <TableData className="text-left">
                                                    <div className="flex items-center justify-left gap-1.5">
                                                        {/* Edit Range */}
                                                        <Tooltip content={isCardInactive ? "Health card is inactive" : "Edit Range"}>
                                                            <button
                                                                onClick={() => !isCardInactive && openEditModal(range)}
                                                                disabled={isCardInactive}
                                                                className={`w-8 h-8 flex items-center justify-center rounded-[10px] bg-white border border-[#DFE0E2] transition ${isCardInactive ? "opacity-40 cursor-not-allowed text-gray-400" : "cursor-pointer hover:bg-gray-50 text-gray-600"}`}
                                                            >
                                                                <Image src="/icons/EditIconBlack.svg" alt="Edit" width={14} height={14} className={isCardInactive ? "opacity-40" : ""} />
                                                            </button>
                                                        </Tooltip>

                                                        {/* Delete Range */}
                                                        {/* <Tooltip content="Delete Range">
                                                            <button
                                                                onClick={() => triggerDelete(range.id)}
                                                                className="cursor-pointer w-8 h-8 flex items-center justify-center rounded-[10px] bg-white border border-[#DFE0E2] hover:bg-gray-50 text-gray-600 transition"
                                                            >
                                                                <Image src="/icons/transhExtraDarkIcon.svg" alt="Delete" width={14} height={14} />
                                                            </button>
                                                        </Tooltip> */}
                                                    </div>
                                                </TableData>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableData colSpan={11} className="text-center py-8 text-gray-400 font-semibold">
                                            No ranges found matching criteria.
                                        </TableData>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {totalItems > 0 && (
                        <Pagination
                            currentPage={currentPage}
                            totalItems={totalItems}
                            itemsPerPage={itemsPerPage}
                            onPageChange={(page) => setCurrentPage(page)}
                            onItemsPerPageChange={(items) => {
                                setItemsPerPage(items);
                                setCurrentPage(1);
                            }}
                        />
                    )}
                </ListBorder>
            </div>

            {/* Create / Edit Modal */}
            <Dialog
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={modalMode === "add" ? "Card Issuance" : "Edit Series Range"}
                width={638}
                closeOnOutsideClick={false}
            >
                <div className="flex flex-col gap-1">
                    {/* Input Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormSelectField
                            label="Card *"
                            options={cardOptions}
                            value={formCard}
                            onChange={(val) => {
                                const selectedVal = Array.isArray(val) ? val[0] : val;
                                setFormCard(selectedVal || "Select Card");
                                if (selectedVal && selectedVal !== "Select Card") {
                                    setFormErrors(prev => ({ ...prev, card: "" }));
                                }
                            }}
                            onBlur={handleCardBlur}
                            error={formErrors.card}
                            background="white"
                            disabled={true}
                        />
                        <FormSelectField
                            label="Branch *"
                            options={modalBranchOptions}
                            value={formBranch}
                            onChange={(val) => {
                                const selectedVal = Array.isArray(val) ? val[0] : val;
                                setFormBranch(selectedVal || "Select Branch");
                                if (selectedVal && selectedVal !== "Select Branch") {
                                    setFormErrors(prev => ({ ...prev, branch: "" }));
                                }
                            }}
                            onBlur={handleBranchBlur}
                            error={formErrors.branch}
                            background="white"
                            disabled={modalMode === "edit"}
                        />
                        <FormInputField
                            label="Series Start *"
                            placeholder="Series Start"
                            value={formStart}
                            onChange={(e) => {
                                const val = e.target.value;
                                // Digits only, and the first digit cannot be 0 (no leading zero).
                                if (val === "" || /^[1-9]\d*$/.test(val)) {
                                    if (val.length <= 12) {
                                        setFormStart(val);
                                        setFormErrors(prev => validateStartOnChange(val, formEnd, prev));
                                    }
                                }
                            }}
                            onBlur={handleSeriesStartBlur}
                            error={formErrors.start}
                            maxLength={12}
                            disabled={modalMode === "edit"}
                        />
                        <FormInputField
                            label="Series End *"
                            placeholder="Series End"
                            value={formEnd}
                            onChange={(e) => {
                                const val = e.target.value;
                                // Digits only, and the first digit cannot be 0 (no leading zero).
                                if (val === "" || /^[1-9]\d*$/.test(val)) {
                                    if (val.length <= 12) {
                                        setFormEnd(val);
                                        setFormErrors(prev => validateEndOnChange(val, formStart, prev));
                                    }
                                }
                            }}
                            onBlur={handleSeriesEndBlur}
                            error={formErrors.end}
                            maxLength={12}
                        />
                    </div>

                    {/* Series Count indicator */}
                    <div className="flex justify-end text-sm text-[#7B8089] font-medium mt-1">
                        Card Count: <span className="font-bold text-[#262D3B] ml-1">{seriesCount.toLocaleString()}</span>
                    </div>



                    {/* Action buttons (left aligned) */}
                    <div className="flex items-center gap-3 mt-4 self-start">
                        <Button
                            variant="primary"
                            size="medium"
                            onClick={handleSaveRange}
                            isLoading={isAllocating || isExtendingAllocation}
                        >
                            {modalMode === "add" ? "Activate Card" : "Save Changes"}
                        </Button>
                        <Button
                            variant="outline"
                            size="medium"
                            onClick={() => setIsModalOpen(false)}
                            disabled={isAllocating || isExtendingAllocation}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </Dialog>

            {/* Update Status Modal */}
            <Dialog
                open={isStatusModalOpen}
                onClose={() => setIsStatusModalOpen(false)}
                title="Update Range Status"
                width={460}
            >
                {statusModalRange && (
                    <div className="flex flex-col gap-6">
                        {/* Description */}
                        <p className="text-sm font-medium text-[#7B8089]">
                            Update status for range <span className="font-bold text-[#262D3B]">{statusModalRange.start} - {statusModalRange.end}</span>:
                        </p>

                        {/* Select field */}
                        <FormSelectField
                            label="Status *"
                            options={[
                                { value: "Active", label: "Active" },
                                { value: "Inactive", label: "Inactive" }
                            ]}
                            value={statusModalValue}
                            onChange={(val) => {
                                const selectedVal = Array.isArray(val) ? val[0] : val;
                                setStatusModalValue(selectedVal as any);
                            }}
                            background={"white"}
                        />

                        {/* Footer Buttons */}
                        <div className="flex items-center justify-end gap-3 mt-2">
                            <Button
                                variant="outline"
                                size="medium"
                                onClick={() => setIsStatusModalOpen(false)}
                                disabled={isUpdatingStatus}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                size="medium"
                                onClick={handleUpdateStatusConfirm}
                                isLoading={isUpdatingStatus}
                            >
                                Update
                            </Button>
                        </div>
                    </div>
                )}
            </Dialog>

            {/* Error Dialog */}
            <MessageDialog
                open={showErrorDialog}
                onClose={() => setShowErrorDialog(false)}
                icon="/icons/ErrorIcon.svg"
                iconBgColor="#FFEBEE"
                message={errorMessage}
                confirmText="OK"
                showCancel={false}
                onConfirm={() => setShowErrorDialog(false)}
            />

            {/* Success Dialog */}
            <MessageDialog
                open={showSuccessDialog}
                onClose={() => setShowSuccessDialog(false)}
                icon="/icons/SuccessCheck.svg"
                iconBgColor="#E8F5E9"
                message={successMessage}
                confirmText="OK"
                showCancel={false}
                onConfirm={() => setShowSuccessDialog(false)}
            />

            <MessageDialog
                open={showDeactivateConfirm}
                onClose={() => setShowDeactivateConfirm(false)}
                iconSlot={
                    <div className="w-12 h-12 rounded-full bg-[#0B8C00] flex items-center justify-center text-white text-2xl font-black">
                        ?
                    </div>
                }
                message={
                    <span className="flex flex-col items-center gap-1.5">
                        <span className="text-lg font-bold text-[#262D3B]">Are you sure?</span>
                        <span className="text-sm font-medium text-[#7B8089]">
                            Do you want to deactivate this card?
                        </span>
                    </span>
                }
                confirmText="Confirm"
                cancelText="Close"
                onConfirm={handleDeactivateConfirm}
                onCancel={() => setShowDeactivateConfirm(false)}
                isActionLoading={isUpdatingStatus}
                width={400}
            />

            {/* Delete Confirm Dialog */}
            <MessageDialog
                open={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                icon="/icons/transhExtraDarkIcon.svg"
                iconBgColor="#FFEBEE"
                message="Are you sure you want to delete this series range? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                showCancel={true}
                onConfirm={executeDelete}
                onCancel={() => setShowDeleteConfirm(false)}
                isActionLoading={isDeletingAllocation}
            />
        </AppShell>
    );
}

"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { useGetDBranchTherapyListForDoctorQuery } from "@/store/api/doctorApi";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { MessageDialog } from "./MessageDialog";
import { FormSelectField } from "./FormSelectField";
import { FormInputField } from "./FormInputField";

export interface TherapiesCardProps {
    therapies: Array<{
        therapyId: number;
        therapyName: string;
        therapyCategory?: string;
        therapySessions?: number;
        therapyDays?: number;
        jatayuTherapyCode?: string;
        isNotAvailable?: boolean;
        addedViaAi?: boolean;
    }>;
    onTherapiesChange?: (therapies: Array<{
        therapyId: number;
        therapyName: string;
        therapyCategory?: string;
        therapySessions?: number;
        therapyDays?: number;
        jatayuTherapyCode?: string;
        isNotAvailable?: boolean;
        addedViaAi?: boolean;
    }>) => void;
    className?: string;
    branchId?: number | string;
    panelName?: string | null;
    onValidationErrorChange?: (hasErrors: boolean) => void;
}

const THERAPY_OPTIONS = [
    { label: "Panchakarma", value: "Panchakarma" },
    { label: "Shirodhara", value: "Shirodhara" },
    { label: "Abhyanga", value: "Abhyanga" },
    { label: "Nadi Sweda", value: "Nadi Sweda" },
    { label: "Greeva Basti", value: "Greeva Basti" },
    { label: "Janu Basti", value: "Janu Basti" },
    { label: "Udvartana", value: "Udvartana" },
    { label: "Kadi Basti", value: "Kadi Basti" },
];

export function TherapiesCard({
    therapies,
    onTherapiesChange,
    className = "",
    branchId,
    panelName,
    onValidationErrorChange,
}: TherapiesCardProps) {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [selectedTherapies, setSelectedTherapies] = useState<string[]>([]);
    const [category, setCategory] = useState<string>("panchkarma");
    const [selectedTherapyDetails, setSelectedTherapyDetails] = useState<Record<string, { days?: string; sessions?: string }>>({});

    // Edit Therapy states
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingTherapyIndex, setEditingTherapyIndex] = useState<number | null>(null);
    const [editDays, setEditDays] = useState<string>("");
    const [editSessions, setEditSessions] = useState<string>("");

    // Message Dialog states
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    // Fetch therapies list from API dynamically based on active category
    const resolvedBranchId = branchId || 2;
    const { data: therapiesData, isLoading: isLoadingTherapies } = useGetDBranchTherapyListForDoctorQuery(
        { branchId: resolvedBranchId },
        { skip: !resolvedBranchId }
    );

    const getTherapyValidationForPatient = (therapy: any, patientPanelName?: string | null) => {
        const type = (patientPanelName || "").trim().toLowerCase();

        let price: any = null;
        let status = "inactive";

        if (type === "tpa") {
            price = therapy.tpaPrice;
            status = therapy.tpaStatus || "inactive";
        } else if (type === "" || type === "normal" || type === "private") {
            price = therapy.price;
            status = therapy.status || "inactive";
        } else {
            price = therapy.panelPrice;
            status = therapy.panelStatus || "inactive";
        }

        const isPriceMissing = price === null || price === undefined || String(price).trim() === "" || Number(price) === 0;
        const isInactive = status.toLowerCase() !== "active";

        if (isPriceMissing) {
            return {
                disabled: true,
                description: "This therapy is not valid because this therapy price is not set yet"
            };
        }

        if (isInactive) {
            return {
                disabled: true,
                description: "This therapy is not valid because this therapy is inactive"
            };
        }

        return {
            disabled: false,
            description: undefined
        };
    };

    useEffect(() => {
        let hasError = false;
        for (const t of therapies) {
            if (t.isNotAvailable) {
                hasError = true;
                break;
            }
            const match = therapiesData?.data?.find(
                item => item.therapyName.toLowerCase().trim() === t.therapyName.toLowerCase().trim() ||
                        (item.jatayuTherapyCode && t.jatayuTherapyCode && item.jatayuTherapyCode.toLowerCase().trim() === t.jatayuTherapyCode.toLowerCase().trim())
            );
            if (match) {
                const validation = getTherapyValidationForPatient(match, panelName);
                if (validation.disabled) {
                    hasError = true;
                    break;
                }
            } else {
                // If it is not in the db and not explicitly allowed, it's an error
                hasError = true;
                break;
            }
        }
        onValidationErrorChange?.(hasError);
    }, [therapies, therapiesData, panelName, onValidationErrorChange]);

    const therapyOptions = useMemo(() => {
        const addedNames = new Set(therapies.map((t) => t.therapyName.toLowerCase().trim()));

        let allOptions: { label: string; value: string; disabled?: boolean; description?: string }[] = [];
        if (!therapiesData?.data || therapiesData.data.length === 0) {
            allOptions = THERAPY_OPTIONS.map(opt => ({ ...opt }));
        } else {
            // Filter by the selected category state ("panchkarma" or "naturopathy")
            const filteredData = therapiesData.data.filter(
                (item) => (item.category || "").toLowerCase() === category.toLowerCase()
            );

            allOptions = filteredData
                .map((item) => {
                    if (!item.therapyName) return null;
                    const validation = getTherapyValidationForPatient(item, panelName);
                    return {
                        label: item.therapyName,
                        value: item.therapyName,
                        disabled: validation.disabled,
                        description: validation.description
                    };
                })
                .filter(Boolean) as { label: string; value: string; disabled?: boolean; description?: string }[];
        }

        // Filter out already added options
        return allOptions.filter((opt) => !addedNames.has(opt.value.toLowerCase().trim()));
    }, [therapiesData, therapies, category, panelName]);

    const currentCategoryLabel = useMemo(() => {
        return category === "panchkarma" ? "Panchakarma" : category === "naturopathy" ? "Naturopathy" : "";
    }, [category]);

    // Check if all therapies in the category have been added
    const isAllTherapiesAdded = useMemo(() => {
        let allOptions: { label: string; value: string }[] = [];
        if (!therapiesData?.data || therapiesData.data.length === 0) {
            allOptions = THERAPY_OPTIONS.map(opt => ({ ...opt }));
        } else {
            const filteredData = therapiesData.data.filter(
                (item) => (item.category || "").toLowerCase() === category.toLowerCase()
            );

            allOptions = filteredData
                .map((item) => {
                    if (!item.therapyName) return null;
                    return { label: item.therapyName, value: item.therapyName };
                })
                .filter(Boolean) as { label: string; value: string }[];
        }
        if (allOptions.length === 0) return false;

        const addedNames = new Set(therapies.map((t) => t.therapyName.toLowerCase().trim()));
        return allOptions.every((opt) => addedNames.has(opt.value.toLowerCase().trim()));
    }, [therapiesData, therapies, category]);

    const emptyTherapyMessage = useMemo(() => {
        if (isAllTherapiesAdded) {
            return currentCategoryLabel
                ? `All ${currentCategoryLabel} therapies have already been added.`
                : "All therapies in this category have already been added.";
        }
        return isLoadingTherapies ? "Loading therapies..." : "No results found";
    }, [isAllTherapiesAdded, currentCategoryLabel, isLoadingTherapies]);

    const handleOpenDialog = () => {
        setSelectedTherapies([]);
        setCategory("panchkarma");
        setSelectedTherapyDetails({});
        setIsAddDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsAddDialogOpen(false);
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedTherapies || selectedTherapies.length === 0) {
            setErrorMessage("Please select at least one therapy from the list.");
            setShowErrorDialog(true);
            return;
        }

        // Check which selected therapies are already added
        const duplicateNames = selectedTherapies.filter(name => therapies.some(t => t.therapyName === name));
        const newTherapyNames = selectedTherapies.filter(name => !therapies.some(t => t.therapyName === name));

        if (newTherapyNames.length === 0) {
            setErrorMessage("All selected therapies are already added for this session.");
            setShowErrorDialog(true);
            return;
        }

        const newTherapies = newTherapyNames.map(name => {
            const match = therapiesData?.data?.find(item => item.therapyName === name);
            let id = match?.therapyId;
            if (id === undefined) {
                const defaultIdx = THERAPY_OPTIONS.findIndex(opt => opt.value === name);
                id = defaultIdx >= 0 ? defaultIdx + 1 : 5;
            }
            const details = selectedTherapyDetails[name];

            let displayCategory = match?.category || category || "";
            if (displayCategory.toLowerCase() === "panchkarma") displayCategory = "Panchakarma";
            else if (displayCategory.toLowerCase() === "naturopathy") displayCategory = "Naturopathy";
            else if (displayCategory) displayCategory = displayCategory.charAt(0).toUpperCase() + displayCategory.slice(1);

            return {
                therapyId: id,
                therapyName: name,
                therapyCategory: displayCategory,
                therapyDays: details?.days ? Number(details.days) : undefined,
                therapySessions: details?.sessions ? Number(details.sessions) : undefined,
                jatayuTherapyCode: match?.jatayuTherapyCode,
            };
        });

        // Add the therapies and update the parent
        onTherapiesChange?.([...therapies, ...newTherapies]);
        setIsAddDialogOpen(false);
        setShowSuccessDialog(true);
    };

    const handleRemoveTherapy = (indexToRemove: number) => {
        const updated = therapies.filter((_, idx) => idx !== indexToRemove);
        onTherapiesChange?.(updated);
    };

    const handleOpenEditDialog = (index: number) => {
        const item = therapies[index];
        setEditingTherapyIndex(index);
        setEditDays(item.therapyDays !== undefined ? String(item.therapyDays) : "");
        setEditSessions(item.therapySessions !== undefined ? String(item.therapySessions) : "");
        setIsEditDialogOpen(true);
    };

    const handleEditFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingTherapyIndex === null) return;

        const updated = [...therapies];
        updated[editingTherapyIndex] = {
            ...updated[editingTherapyIndex],
            therapyDays: editDays ? Number(editDays) : undefined,
            therapySessions: editSessions ? Number(editSessions) : undefined,
        };
        onTherapiesChange?.(updated);
        setIsEditDialogOpen(false);
    };

    return (
        <div className={`rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] ${className}`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Image src="/icons/therapies.svg" alt="Therapies Icon" width={20} height={20} />
                    <h2 className="font-inter font-semibold text-base text-[#262D3B]">Therapies</h2>
                </div>
                {therapies.length > 0 && (

                    <Button
                        type="button"
                        variant="outline"
                        size="large"
                        width="auto"
                        onClick={handleOpenDialog}
                        leftIcon={<Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />}
                        className="!rounded-[32px] !border-[#0B8C00] !text-[#0B8C00] hover:bg-[#0B8C00]/10 lg:!h-[36px] md:!h-[36px] !px-6 !min-w-0"
                    >
                        <span className="font-[Inter] font-medium text-sm leading-[120%] text-center text-[#0B8C00] text-hide">Add More</span>
                    </Button>
                )}
            </div>

            {therapies.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center gap-4">
                    <Image src="/icons/therapiesGreenIcon.svg" alt="Therapies Icon" width={74} height={74} />
                    <Button
                        variant="outline"
                        size="medium"
                        onClick={handleOpenDialog}
                        leftIcon={
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="16" />
                                <line x1="8" y1="12" x2="16" y2="12" />
                            </svg>
                        }
                        className="mt-1 border-[#0B8C00] text-[#0B8C00] hover:bg-[#F2F8F2] font-semibold"
                    >
                        Add Therapy
                    </Button>
                </div>
            ) : (
                <div className="flex flex-col gap-4 py-2 w-full">
                    {therapies.map((t, idx) => (
                        <div key={idx} className="flex justify-between items-center gap-4 w-full border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                            {/* Left Column: Therapy Info */}
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-full bg-[#E9F3E6] flex items-center justify-center shrink-0">
                                    <Image src="/icons/therapies.svg" alt="Therapy" width={18} height={18} />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="font-inter font-semibold text-[15px] text-[#262D3B] truncate">
                                        {t.therapyName}
                                    </span>
                                    {(() => {
                                        if (t.isNotAvailable) {
                                            return (
                                                <div className="text-[12px] text-[#EF4444] font-semibold mt-0.5 text-left">
                                                    This "{t.therapyName}" is not available
                                                </div>
                                            );
                                        }

                                        const match = therapiesData?.data?.find(
                                            item => item.therapyName.toLowerCase().trim() === t.therapyName.toLowerCase().trim() ||
                                                    (item.jatayuTherapyCode && t.jatayuTherapyCode && item.jatayuTherapyCode.toLowerCase().trim() === t.jatayuTherapyCode.toLowerCase().trim())
                                        );

                                        if (match) {
                                            const validation = getTherapyValidationForPatient(match, panelName);
                                            if (validation.disabled) {
                                                return (
                                                    <div className="text-[12px] text-[#EF4444] font-semibold mt-0.5 text-left">
                                                        {validation.description}
                                                    </div>
                                                );
                                            }
                                        }

                                        let cat = t.therapyCategory || match?.category || "";
                                        if (cat.toLowerCase() === "panchkarma") cat = "Panchakarma";
                                        else if (cat.toLowerCase() === "naturopathy") cat = "Naturopathy";
                                        else if (cat) cat = cat.charAt(0).toUpperCase() + cat.slice(1);

                                        return (
                                            <div className="text-[11px] text-gray-500 font-medium mt-0.5 truncate text-left">
                                                {cat && <span className="text-[#0B8C00] font-semibold">{cat}</span>}
                                                {cat && (t.therapyDays !== undefined || t.therapySessions !== undefined) && " | "}
                                                {t.therapyDays !== undefined && `${t.therapyDays} Days`}
                                                {t.therapyDays !== undefined && t.therapySessions !== undefined && " | "}
                                                {t.therapySessions !== undefined && `${t.therapySessions} Sessions/Day`}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Right Column: Edit & Delete Actions */}
                            <div className="flex items-center gap-2 shrink-0">
                                 {(() => {
                                     if (t.isNotAvailable) return null;

                                     const match = therapiesData?.data?.find(
                                         item => item.therapyName.toLowerCase().trim() === t.therapyName.toLowerCase().trim() ||
                                                 (item.jatayuTherapyCode && t.jatayuTherapyCode && item.jatayuTherapyCode.toLowerCase().trim() === t.jatayuTherapyCode.toLowerCase().trim())
                                     );

                                     if (match) {
                                         const validation = getTherapyValidationForPatient(match, panelName);
                                         if (validation.disabled) return null; // Hide Edit button
                                     }

                                     return (
                                         <button
                                             type="button"
                                             onClick={() => handleOpenEditDialog(idx)}
                                             className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                                             title="Edit therapy"
                                         >
                                             <Image src="/icons/EditIconBlack.svg" alt="Edit" width={18} height={18} />
                                         </button>
                                     );
                                 })()}
                                <button
                                    type="button"
                                    onClick={() => handleRemoveTherapy(idx)}
                                    className="p-2 hover:bg-[#FFEBEE] rounded-full transition-colors duration-200"
                                    title="Remove therapy"
                                >
                                    <Image src="/icons/trashicon.svg" alt="Remove" width={25} height={25} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Therapy Modal Dialog */}
            <Dialog
                open={isAddDialogOpen}
                onClose={handleCloseDialog}
                title="Add Therapy"
                width={560}
                closeOnOutsideClick={false}
            >
                <form onSubmit={handleFormSubmit} className="space-y-6">
                    <div className="pt-2 space-y-4">
                        <FormSelectField
                            label="Category"
                            placeholder="Select Category"
                            options={[
                                { label: "Panchakarma", value: "panchkarma" },
                                { label: "Naturopathy", value: "naturopathy" },
                            ]}
                            mode="single"
                            value={category}
                            onChange={(val) => {
                                const selectedVal = Array.isArray(val) ? val[0] : val;
                                setCategory(selectedVal || "panchkarma");
                                setSelectedTherapies([]); // Clear selected therapies when category changes
                                setSelectedTherapyDetails({});
                            }}
                            background="white"
                            width="100%"
                        />

                        <FormSelectField
                            label="Therapy"
                            placeholder={isLoadingTherapies ? "Loading therapies..." : "Select Therapies"}
                            options={therapyOptions}
                            mode="multiple"
                            value={selectedTherapies}
                            onChange={(val) => {
                                const list = val as string[];
                                setSelectedTherapies(list);
                                setSelectedTherapyDetails(prev => {
                                    const next = { ...prev };
                                    Object.keys(next).forEach(k => {
                                        if (!list.includes(k)) {
                                            delete next[k];
                                        }
                                    });
                                    list.forEach(name => {
                                        if (!next[name]) {
                                            next[name] = { days: "", sessions: "" };
                                        }
                                    });
                                    return next;
                                });
                            }}
                            background="white"
                            width="100%"
                            disabled={isLoadingTherapies}
                            emptyMessage={emptyTherapyMessage}
                        />

                        {selectedTherapies.length > 0 && (
                            <div className="flex flex-col pt-1 mt-3">
                                <p className="text-xs font-semibold text-[#7B8089] mb-2">Therapy Duration & Sessions</p>
                                <div className="space-y-4 p-4 bg-[#F7FAF7] rounded-[16px] border border-[#E3EEE1] max-h-[240px] overflow-y-auto pr-1.5">
                                    {selectedTherapies.map((name) => {
                                        const details = selectedTherapyDetails[name] || { days: "", sessions: "" };
                                        return (
                                            <div key={name} className="flex flex-col gap-3 pb-3 border-b border-[#E3EEE1]/50 last:border-0 last:pb-0">
                                                <span className="font-semibold text-sm text-[#262D3B]">{name}</span>
                                                <div className="grid grid-cols-2 gap-3 mt-1">
                                                    <FormInputField
                                                        label="Day"
                                                        placeholder="0-365"
                                                        value={details.days || ""}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            if (val === "" || (/^\d+$/.test(val) && Number(val) <= 365)) {
                                                                setSelectedTherapyDetails(prev => ({
                                                                    ...prev,
                                                                    [name]: { ...prev[name], days: val }
                                                                }));
                                                            }
                                                        }}
                                                        maxLength={3}
                                                        suffix={<span className="text-xs text-gray-400 font-semibold select-none">days</span>}
                                                    />
                                                    <FormInputField
                                                        label="Session"
                                                        placeholder="0-100"
                                                        value={details.sessions || ""}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            if (val === "" || (/^\d+$/.test(val) && Number(val) <= 100)) {
                                                                setSelectedTherapyDetails(prev => ({
                                                                    ...prev,
                                                                    [name]: { ...prev[name], sessions: val }
                                                                }));
                                                            }
                                                        }}
                                                        maxLength={3}
                                                        suffix={<span className="text-xs text-gray-400 font-semibold select-none">sessions</span>}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <Button
                            type="submit"
                            variant="primary"
                            size="large"
                            className="flex-1"
                        >
                            Add Therapy
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="large"
                            onClick={handleCloseDialog}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            </Dialog>

            {/* Success Dialog */}
            <MessageDialog
                open={showSuccessDialog}
                onClose={() => setShowSuccessDialog(false)}
                icon="/icons/SuccessCheck.svg"
                iconBgColor="#E8F5E9"
                message="Therapy added successfully!"
                confirmText="Success"
                showCancel={false}
                onConfirm={() => setShowSuccessDialog(false)}
            />

            {/* Edit Therapy Modal Dialog */}
            <Dialog
                open={isEditDialogOpen}
                onClose={() => setIsEditDialogOpen(false)}
                title="Edit Therapy"
                width={560}
                closeOnOutsideClick={false}
            >
                <form onSubmit={handleEditFormSubmit} className="space-y-6">
                    <div className="pt-2 space-y-4">
                        {editingTherapyIndex !== null && therapies[editingTherapyIndex] && (
                            <div className="flex flex-col pt-1">
                                <p className="text-xs font-semibold text-[#7B8089] mb-2">Therapy Duration & Sessions</p>
                                <div className="space-y-4 p-4 bg-[#F7FAF7] rounded-[16px] border border-[#E3EEE1]">
                                    <div className="flex flex-col gap-3">
                                        <span className="font-semibold text-sm text-[#262D3B]">
                                            {therapies[editingTherapyIndex].therapyName}
                                        </span>
                                        <div className="grid grid-cols-2 gap-3 mt-1">
                                            <FormInputField
                                                label="Day"
                                                placeholder="0-365"
                                                value={editDays}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val === "" || (/^\d+$/.test(val) && Number(val) <= 365)) {
                                                        setEditDays(val);
                                                    }
                                                }}
                                                maxLength={3}
                                                suffix={<span className="text-xs text-gray-400 font-semibold select-none">days</span>}
                                            />
                                            <FormInputField
                                                label="Session"
                                                placeholder="0-100"
                                                value={editSessions}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val === "" || (/^\d+$/.test(val) && Number(val) <= 100)) {
                                                        setEditSessions(val);
                                                    }
                                                }}
                                                maxLength={3}
                                                suffix={<span className="text-xs text-gray-400 font-semibold select-none">sessions</span>}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <Button
                            type="submit"
                            variant="primary"
                            size="large"
                            className="flex-1"
                        >
                            Save Changes
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="large"
                            onClick={() => setIsEditDialogOpen(false)}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            </Dialog>

            {/* Error Dialog */}
            <MessageDialog
                open={showErrorDialog}
                onClose={() => setShowErrorDialog(false)}
                icon="/icons/CrossIcon.svg"
                iconBgColor="#FFEBEE"
                message={errorMessage}
                confirmText="OK"
                showCancel={false}
                onConfirm={() => setShowErrorDialog(false)}
            />
        </div>
    );
}

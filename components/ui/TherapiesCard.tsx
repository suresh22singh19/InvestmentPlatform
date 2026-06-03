"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { MessageDialog } from "./MessageDialog";
import { FormSelectField } from "./FormSelectField";

export interface TherapiesCardProps {
    therapies: string[];
    onTherapiesChange?: (therapies: string[]) => void;
    className?: string;
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
}: TherapiesCardProps) {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [selectedTherapies, setSelectedTherapies] = useState<string[]>([]);

    // Message Dialog states
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const handleOpenDialog = () => {
        setSelectedTherapies([]);
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
        const duplicates = selectedTherapies.filter(t => therapies.includes(t));
        const newTherapies = selectedTherapies.filter(t => !therapies.includes(t));

        if (newTherapies.length === 0) {
            setErrorMessage("All selected therapies are already added for this session.");
            setShowErrorDialog(true);
            return;
        }

        // Add the therapies and update the parent
        onTherapiesChange?.([...therapies, ...newTherapies]);
        setIsAddDialogOpen(false);
        setShowSuccessDialog(true);
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
                <div className="flex flex-col gap-3 py-2 w-full">
                    {therapies.map((t, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#E9F3E6] flex items-center justify-center shrink-0">
                                <Image src="/icons/therapies.svg" alt="Therapy" width={18} height={18} />
                            </div>
                            <span className="font-inter font-medium text-[15px] text-[#262D3B]">
                                {t}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Therapy Modal Dialog */}
            <Dialog
                open={isAddDialogOpen}
                onClose={handleCloseDialog}
                title="Add Therapy"
                width={480}
            >
                <form onSubmit={handleFormSubmit} className="space-y-6">
                    <div className="pt-2">
                        <FormSelectField
                            label="Therapy"
                            placeholder="Select Therapies"
                            options={THERAPY_OPTIONS}
                            mode="multiple"
                            value={selectedTherapies}
                            onChange={(val) => setSelectedTherapies(val as string[])}
                            background="white"
                            width="100%"
                        />
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

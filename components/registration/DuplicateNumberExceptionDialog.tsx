"use client";

import { useState, useEffect } from "react";
import { Dialog, FormInputField, FormSelectField, Button } from "@/components/ui";
import type { SelectOption } from "@/components/ui/FormSelectField";

interface DuplicateNumberExceptionDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (name: string, relationship: string) => Promise<void>;
    isLoading?: boolean;
    relationshipOptions?: SelectOption[];
}

const defaultRelationshipOptions: SelectOption[] = [
    { value: "Father", label: "Father" },
    { value: "Mother", label: "Mother" },
    { value: "Brother", label: "Brother" },
    { value: "Sister", label: "Sister" },
    { value: "Friend", label: "Friend" },
    { value: "Guardian", label: "Guardian" },
    { value: "Teacher", label: "Teacher" },
    { value: "Other", label: "Other" },
];

export default function DuplicateNumberExceptionDialog({
    open,
    onClose,
    onSubmit,
    isLoading = false,
    relationshipOptions = defaultRelationshipOptions,
}: DuplicateNumberExceptionDialogProps) {
    const [name, setName] = useState("");
    const [relationship, setRelationship] = useState("");

    // Reset form when dialog opens/closes
    useEffect(() => {
        if (!open) {
            setName("");
            setRelationship("");
        }
    }, [open]);

    const handleSubmit = async () => {
        if (!name.trim() || !relationship) {
            return;
        }
        await onSubmit(name.trim(), relationship);
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            title="Duplicate Number Exception"
            width={577}
        >
            <div className="flex flex-col gap-6">
                <div>
                    <FormInputField
                        label="Name"
                        value={name}
                        onChange={(e) => {
                            // Same validation as Father's/Husband's Name on registration/hospital
                            let value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                            value = value.replace(/^\s+/, "");
                            // Collapse consecutive repeated characters to max 2 (e.g. "sddddddssssssss" -> "sdds")
                            value = value.replace(/(.)\1{2,}/g, "$1$1");
                            value = value.slice(0, 100);
                            // First letter of each word capital (title case)
                            value = value
                                .toLowerCase()
                                .replace(/(?:^|\s)\S/g, (c) => c.toUpperCase());
                            setName(value);
                        }}
                        onBlur={(e) => {
                            const trimmed = e.target.value.trim();
                            if (trimmed !== e.target.value) setName(trimmed);
                        }}
                        placeholder="Name"
                        type="text"
                        maxLength={100}
                    />
                </div>
                
                <div>
                    <FormSelectField
                        label="Relationship"
                        options={relationshipOptions}
                        value={relationship || null}
                        onChange={(value) => {
                            const selectedValue = typeof value === "string" ? value : Array.isArray(value) ? value[0] : "";
                            setRelationship(selectedValue || "");
                        }}
                        placeholder="Type to search..."
                        mode="single"
                        background="white"
                    />
                </div>
                
                <div className="flex items-center justify-end gap-3 pt-4">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="border-[#0B8C00] text-[#0B8C00] hover:bg-[#F2F8F2]"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSubmit}
                        disabled={!name.trim() || !relationship || isLoading}
                        isLoading={isLoading}
                    >
                        Request Permission
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}


"use client";

import Image from "next/image";
import { DatePicker } from "./DatePicker";
import { FormTextareaField } from "./FormTextareaField";

export interface FollowUpCardProps {
    followUpDate: string;
    onFollowUpDateChange: (date: string) => void;
    followUpRemarks: string;
    onFollowUpRemarksChange: (remarks: string) => void;
    className?: string;
}

export function FollowUpCard({
    followUpDate,
    onFollowUpDateChange,
    followUpRemarks,
    onFollowUpRemarksChange,
    className = "",
}: FollowUpCardProps) {
    return (
        <div className={`rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] ${className}`}>
            <div className="flex items-center gap-2 mb-4">
                <Image src="/icons/followUp.svg" alt="Follow Up Icon" width={20} height={20} />
                <h2 className="font-inter font-semibold text-base text-[#262D3B]">Follow-Up</h2>
            </div>
            <div className="space-y-4">
                <DatePicker
                    label="Next Visit Date"
                    placeholder="DD-MM-YYYY"
                    value={followUpDate}
                    onChange={onFollowUpDateChange}
                    background="white"
                    width="100%"
                    disablePastDates={true}
                />
                <FormTextareaField
                    label="Remarks"
                    placeholder="Instructions for next visit..."
                    value={followUpRemarks}
                    onChange={(e) => onFollowUpRemarksChange(e.target.value)}
                    height={94}
                    width="100%"
                />
            </div>
        </div>
    );
}

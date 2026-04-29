"use client";

import Image from "next/image";
import { useMemo, useEffect } from "react";
import { FormSelectField, DatePicker } from "@/components/ui";
import type { SelectOption } from "@/components/ui/FormSelectField";

export interface AppointmentInformationFormData {
    doctor: string;
    appointmentDate: string;
    timeSlot: string;
}

interface AppointmentInformationProps {
    formData: AppointmentInformationFormData;
    onChange: (field: keyof AppointmentInformationFormData, value: string) => void;
    onBlur?: (field: keyof AppointmentInformationFormData) => void;
    doctorOptions?: SelectOption[];
    fieldRefs?: {
        doctor?: React.RefObject<HTMLDivElement | null>;
        appointmentDate?: React.RefObject<HTMLDivElement | null>;
        timeSlot?: React.RefObject<HTMLDivElement | null>;
    };
    errors?: Record<string, string>;
}

// All available time slots (value sent to API as-is, e.g. "10:00am - 12:00pm")
const ALL_TIME_SLOTS: SelectOption[] = [
    { value: "10:00am - 12:00pm", label: "10:00am - 12:00pm" },
    { value: "11:00am - 01:00pm", label: "11:00am - 01:00pm" },
    { value: "12:00pm - 02:00pm", label: "12:00pm - 02:00pm" },
    { value: "01:00pm - 03:00pm", label: "01:00pm - 03:00pm" },
    { value: "02:00pm - 04:00pm", label: "02:00pm - 04:00pm" },
    { value: "03:00pm - 05:00pm", label: "03:00pm - 05:00pm" },
    { value: "04:00pm - 06:00pm", label: "04:00pm - 06:00pm" },
];

// Parse time string like "12:00pm" or "01:00pm" to 24h hour (12 -> 12, 01:00pm -> 13)
const parseTimeToHour = (s: string): number | null => {
    const t = s.trim().toLowerCase();
    const pm = t.endsWith("pm");
    const am = t.endsWith("am");
    if (!pm && !am) return null;
    const numPart = t.replace(/(am|pm)$/, "").trim();
    const match = numPart.match(/^(\d{1,2})(?::(\d{2}))?/);
    if (!match) return null;
    let h = parseInt(match[1], 10);
    if (isNaN(h) || h < 1 || h > 12) return null;
    if (pm && h !== 12) h += 12;
    if (am && h === 12) h = 0;
    return h;
};

// Helper function to parse time slot value (e.g., "10:00am - 12:00pm" -> { start: 10, end: 12 })
const parseTimeSlot = (value: string): { start: number; end: number } | null => {
    const parts = value.split(/\s*-\s*/);
    if (parts.length !== 2) return null;
    const start = parseTimeToHour(parts[0].trim());
    const end = parseTimeToHour(parts[1].trim());
    if (start == null || end == null) return null;
    return { start, end };
};

// Helper function to check if a time slot has passed
const isTimeSlotPassed = (timeSlotValue: string): boolean => {
    const parsed = parseTimeSlot(timeSlotValue);
    if (!parsed) return false;
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    
    // Convert slot end time to minutes (assuming 24-hour format)
    const slotEndInMinutes = parsed.end * 60;
    
    // If current time is past the slot end time, the slot has passed
    return currentTimeInMinutes >= slotEndInMinutes;
};

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDate = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function AppointmentInformation({
    formData,
    onChange,
    onBlur,
    doctorOptions = [],
    fieldRefs,
    errors,
}: AppointmentInformationProps) {
    // Auto-set today's date whenever appointmentDate is empty
    useEffect(() => {
        if (!formData.appointmentDate) {
            onChange("appointmentDate", getTodayDate());
        }
    }, [formData.appointmentDate]); // eslint-disable-line react-hooks/exhaustive-deps

    // Filter time slots based on current time if appointment date is today
    const availableTimeSlots = useMemo(() => {
        if (!formData.appointmentDate) {
            // If no date selected, show all slots
            return ALL_TIME_SLOTS;
        }
        
        const appointmentDate = new Date(formData.appointmentDate);
        const today = new Date();
        
        // Reset time to compare dates only
        const appointmentDateOnly = new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate());
        const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        // If appointment date is in the future, show all slots
        if (appointmentDateOnly > todayOnly) {
            return ALL_TIME_SLOTS;
        }
        
        // If appointment date is today, filter out past time slots and show all available slots from current time to end
        if (appointmentDateOnly.getTime() === todayOnly.getTime()) {
            // Show all time slots that haven't ended yet
            return ALL_TIME_SLOTS.filter(slot => !isTimeSlotPassed(slot.value));
        }
        
        // If appointment date is in the past, show all slots (though this shouldn't happen due to disablePastDates)
        return ALL_TIME_SLOTS;
    }, [formData.appointmentDate]);

    // Clear selected time slot if it's no longer available
    useEffect(() => {
        if (formData.timeSlot) {
            const isSlotAvailable = availableTimeSlots.some(slot => slot.value === formData.timeSlot);
            if (!isSlotAvailable) {
                // Clear the time slot if it's no longer available
                onChange("timeSlot", "");
            }
        }
    }, [availableTimeSlots, formData.timeSlot, onChange]);

    return (
        <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 mt-4">
            <h2 className="text-base font-medium leading-[120%] text-[#262D3B] flex gap-2 items-center mb-5">
                <Image src="/icons/CalendarDarkIcon.svg" alt="Appointment info" width={20} height={20} /> Appointment Information
            </h2>

            {/* First row: 3 fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div data-field="doctor" className="scroll-mt-4 w-full" ref={fieldRefs?.doctor}>
                    <FormSelectField
                        label="Doctor *"
                        options={doctorOptions}
                        value={formData.doctor || null}
                        onChange={(value) => {
                            const selectedValue = Array.isArray(value) ? value[0] : value;
                            onChange("doctor", selectedValue || "");
                            if (selectedValue) {
                                setTimeout(() => {
                                    onBlur?.("doctor");
                                }, 0);
                            }
                        }}
                        onBlur={() => onBlur?.("doctor")}
                        placeholder="Select"
                        mode="single"
                        background="white"
                    />
                    {errors?.doctor && (
                        <p className="mt-1 text-xs text-[#F6776E]">{errors.doctor}</p>
                    )}
                </div>

                <div data-field="appointmentDate" className="scroll-mt-4 w-full" ref={fieldRefs?.appointmentDate}>
                    <DatePicker
                        label="Appointment Date"
                        value={formData.appointmentDate || undefined}
                        onChange={(value) => {
                            onChange("appointmentDate", value || "");
                            if (value) {
                                setTimeout(() => {
                                    onBlur?.("appointmentDate");
                                }, 0);
                            }
                        }}
                        onBlur={() => onBlur?.("appointmentDate")}
                        placeholder="Select"
                        background="white"
                        required
                        width="100%"
                        minDate={getTodayDate()}
                        maxDate={getTodayDate()}    
                    />
                    {errors?.appointmentDate && (
                        <p className="mt-1 text-xs text-[#F6776E]">{errors.appointmentDate}</p>
                    )}
                </div>

                <div data-field="timeSlot" className="scroll-mt-4 w-full" ref={fieldRefs?.timeSlot}>
                    <FormSelectField
                        label="Time Slot *"
                        options={availableTimeSlots}
                        value={formData.timeSlot || null}
                        onChange={(value) => {
                            const selectedValue = Array.isArray(value) ? value[0] : value;
                            onChange("timeSlot", selectedValue || "");
                            if (selectedValue) {
                                setTimeout(() => {
                                    onBlur?.("timeSlot");
                                }, 0);
                            }
                        }}
                        onBlur={() => onBlur?.("timeSlot")}
                        placeholder="Select"
                        mode="single"
                        background="white"
                        emptyMessage={
                            availableTimeSlots.length === 0 && formData.appointmentDate
                                ? "No time slots available for today. Please select a future date."
                                : "No results found"
                        }
                    />
                    {errors?.timeSlot && (
                        <p className="mt-1 text-xs text-[#F6776E]">{errors.timeSlot}</p>
                    )}
                </div>
            </div>
        </div>
    );
}


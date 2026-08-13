"use client";

// Reusable therapist session scheduling page component supporting add, edit, and view modes.
import { useState, useMemo, useRef, useEffect } from "react";
import Image from "next/image";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { BackToPreviousPageButton } from "@/components/ui";
import { AppointmentDetailCard } from "@/components/ui/AppointmentDetailCard";
import ScrollableContainer from "@/components/ui/ScrollableContainer";
import { Dialog } from "@/components/ui/Dialog";
import { MessageDialog } from "@/components/ui/MessageDialog";
import { FormSelectField } from "@/components/ui/FormSelectField";
import moment from "moment";

// Preconfigured Mock Options
const PACKAGE_ITEMS = [
    { label: "Package Name", value: "Cardiac Premium Care" },
    { label: "Start Date", value: "14 July 2026" },
    { label: "End Date", value: "24 July 2026" }
];

const THERAPY_OPTIONS = [
    { id: "t1", name: "Kashayavasthi (Niroohavasthi) Different varieties" },
    { id: "t2", name: "ShashtikapindaSweda / Navarakkizhi-Ekangam / Sthanikam" },
    { id: "t3", name: "ShashtikapindaSweda Full Body" }
];

const THERAPIST_OPTIONS = [
    { id: "th1", name: "Prachi Arora", subtitle: "Senior Therapist" },
    { id: "th2", name: "Rohit Singh", subtitle: "Associate Therapist" },
    { id: "th3", name: "Pankaj Kumar", subtitle: "Junior Therapist" }
];

const ALTERNATE_THERAPIST_OPTIONS = [
    { id: "ath1", name: "Neelam Rani", subtitle: "Senior Therapist" },
    { id: "ath2", name: "Anjali Sharma", subtitle: "Associate Therapist" },
    { id: "ath3", name: "Ajeet Kumar", subtitle: "Junior Therapist" }
];

const ROOM_OPTIONS = [
    { id: "r1", name: "Lotus Room 1", subtitle: "Equipped for Abhyanga" },
    { id: "r2", name: "Lotus Room 2", subtitle: "Occupied", status: "occupied" },
    { id: "r3", name: "Sandalwood 4", subtitle: "Standard Room" },
    { id: "r4", name: "Vata Suite 1", subtitle: "Premium Service" }
];

interface Slot {
    time: string;
    status: "available" | "disabled";
}

const MOCK_SLOTS: Slot[] = [
    { time: "09:00 AM", status: "available" },
    { time: "10:00 AM", status: "available" },
    { time: "11:00 AM", status: "available" },
    { time: "12:00 PM", status: "available" },
    { time: "01:00 PM", status: "available" },
    { time: "02:00 PM", status: "available" },
    { time: "03:00 PM", status: "available" },
    { time: "04:00 PM", status: "available" },
    { time: "05:00 PM", status: "available" },
    { time: "06:00 PM", status: "available" },
    { time: "07:00 PM", status: "available" },
];

// Reusable Select Panel Component (for Therapy, Therapist, Alternate Therapist, and Therapy Room)
interface ResourceOption {
    id: string;
    name: string;
    subtitle?: string;
    status?: string;
}

interface ResourceSelectPanelProps {
    type: "therapy" | "therapist" | "room";
    title: string;
    options: ResourceOption[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    multiple?: boolean;
    mode?: "add" | "edit" | "view";
}

function ResourceSelectPanel({
    type,
    title,
    options,
    selectedIds,
    onChange,
    multiple = false,
    mode = "add",
}: ResourceSelectPanelProps) {
    const handleOptionClick = (option: ResourceOption) => {
        if (mode === "view") return;
        if (option.status === "occupied") return;

        if (multiple) {
            if (selectedIds.includes(option.id)) {
                onChange(selectedIds.filter((id) => id !== option.id));
            } else {
                onChange([...selectedIds, option.id]);
            }
        } else {
            onChange([option.id]);
        }
    };

    const isGrid = type === "room";

    return (
        <div className="flex flex-col gap-3 text-left">
            <h4 className="font-inter font-semibold text-[16px] leading-[120%] text-[#262D3B]">
                {title}
            </h4>
            <ScrollableContainer maxHeight="180px" overflowX="hidden" className="pr-1.5 py-0.5">
                <div className={isGrid ? "grid grid-cols-2 gap-4" : "flex flex-col gap-3"}>
                    {options.map((option) => {
                        const isSelected = selectedIds.includes(option.id);
                        const isOccupied = option.status === "occupied";

                        let borderClass = "border-[#DFE0E2] bg-white";
                        if (isSelected) {
                            borderClass = "border-[#0B8C00] bg-white";
                        } else if (isOccupied) {
                            borderClass = "border-[#DFE0E2] bg-[#F8F9FA] cursor-not-allowed opacity-60";
                        }

                        return (
                            <div
                                key={option.id}
                                onClick={() => handleOptionClick(option)}
                                className={`rounded-[12px] border p-4 transition-all duration-200 ${
                                    isOccupied || mode === "view" ? "" : "cursor-pointer hover:shadow-sm"
                                } ${borderClass} flex items-center justify-between gap-3`}
                            >
                                <div className="flex flex-col gap-1 min-w-0 text-left">
                                    <span
                                        className={`font-inter font-semibold text-[14px] leading-[120%] ${isSelected ? "text-[#0B8C00]" : "text-[#262D3B]"
                                            } truncate`}
                                    >
                                        {option.name}
                                    </span>
                                    {option.subtitle && (
                                        <span
                                            className={`font-inter text-[12px] leading-[120%] ${isOccupied
                                                ? "text-[#EF4444] font-bold"
                                                : "text-[#525763] font-medium"
                                                }`}
                                        >
                                            {option.subtitle}
                                        </span>
                                    )}
                                </div>

                                {!isGrid && isSelected && (
                                    <div className="shrink-0 flex items-center justify-center">
                                        <svg
                                            width="20"
                                            height="20"
                                            viewBox="0 0 20 20"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <circle
                                                cx="10"
                                                cy="10"
                                                r="9"
                                                stroke="#0B8C00"
                                                strokeWidth="2"
                                                fill="none"
                                            />
                                            <path
                                                d="M6 10l3 3 5-5"
                                                stroke="#0B8C00"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                fill="none"
                                            />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </ScrollableContainer>
        </div>
    );
}

// Custom Mini Calendar Picker Component
function CustomMiniCalendar({
    selectedDates,
    activeDate,
    onSelectDate,
    onDeleteDate,
    mode = "add",
    packageItems = PACKAGE_ITEMS,
}: {
    selectedDates: Date[];
    activeDate: Date;
    onSelectDate: (date: Date) => void;
    onDeleteDate: (date: Date, e: React.MouseEvent) => void;
    mode?: "add" | "edit" | "view";
    packageItems?: { label: string; value: string }[];
}) {
    const [monthOffset, setMonthOffset] = useState(0);

    const activeMonth = useMemo(() => {
        return moment().startOf("month").add(monthOffset, "months").toDate();
    }, [monthOffset]);

    const monthLabel = useMemo(() => {
        return moment(activeMonth).format("MMMM YYYY");
    }, [activeMonth]);

    const daysInMonth = useMemo(() => {
        const startOfMonth = moment(activeMonth).startOf("month");
        const endOfMonth = moment(activeMonth).endOf("month");
        const days = [];

        const startDayOfWeek = startOfMonth.day();
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push(null);
        }

        const totalDays = endOfMonth.date();
        for (let i = 1; i <= totalDays; i++) {
            days.push(new Date(activeMonth.getFullYear(), activeMonth.getMonth(), i));
        }

        return days;
    }, [activeMonth]);

    const isPrevDisabled = monthOffset <= 0;
    const handlePrev = () => {
        if (!isPrevDisabled) setMonthOffset((o) => o - 1);
    };
    const handleNext = () => setMonthOffset((o) => o + 1);

    const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

    return (
        <div className="flex flex-col gap-4 text-left select-none">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F4EF]">
                <span className="font-inter font-semibold text-[16px] text-[#262D3B]">
                    {monthLabel}
                </span>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={handlePrev}
                        disabled={isPrevDisabled}
                        className={`p-1.5 rounded-lg transition-colors border-none bg-transparent cursor-pointer text-[#434956] ${isPrevDisabled ? "opacity-30 cursor-not-allowed pointer-events-none" : "hover:bg-[#F2F8F2]"}`}
                    >
                        <Image src="/icons/LeftArrowIcon.svg" alt="Prev" width={14} height={14} />
                    </button>
                    <button
                        type="button"
                        onClick={handleNext}
                        className="p-1.5 hover:bg-[#F2F8F2] rounded-lg transition-colors border-none bg-transparent cursor-pointer text-[#434956]"
                    >
                        <Image src="/icons/LeftArrowIcon.svg" alt="Next" width={14} height={14} className="rotate-180" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-y-4 text-center">
                {daysOfWeek.map((day) => (
                    <span
                        key={day}
                        className="font-inter font-semibold text-[15px] text-[#787E8C]"
                    >
                        {day}
                    </span>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-y-[32px] text-center">
                {daysInMonth.map((day, idx) => {
                    if (!day) return <div key={`empty-${idx}`} />;
                    const isSelected = selectedDates.some((d) => moment(d).isSame(day, "day"));
                    const isActive = moment(day).isSame(activeDate, "day");
                    const isToday = moment(day).isSame(new Date(), "day");
                    const isPastDate = moment(day).isBefore(moment(), "day");

                    // Parse start & end dates dynamically
                    const startVal = packageItems.find((item) => item.label === "Start Date")?.value;
                    const endVal = packageItems.find((item) => item.label === "End Date")?.value;
                    const packageStart = startVal ? moment(startVal, "DD MMMM YYYY") : null;
                    const packageEnd = endVal ? moment(endVal, "DD MMMM YYYY") : null;
                    const isWithinPackageRange = packageStart && packageEnd && moment(day).isBetween(packageStart, packageEnd, "day", "[]");
                    const isViewModeDisabled = mode === "view" && !isSelected;
                    const isDisabled = !isWithinPackageRange || isPastDate || isViewModeDisabled;

                    let cellClass = "text-[#262D3B] hover:bg-[#0B8C00]/5 hover:text-[#0B8C00]";
                    if (isDisabled) {
                        cellClass = "text-[#C8CAD0] cursor-not-allowed pointer-events-none opacity-50";
                    } else if (isActive) {
                        cellClass = "bg-[#E6F4E6] text-[#0B8C00] font-bold rounded-lg border border-[#0B8C00]/20 relative";
                    } else if (isSelected) {
                        cellClass = "bg-[#E6F4E6]/50 text-[#0B8C00] font-semibold rounded-lg relative";
                    } else if (isToday) {
                        cellClass = "font-bold text-[#0B8C00] border-b border-[#0B8C00]";
                    }

                    return (
                        <div
                            key={day.toISOString()}
                            onClick={() => !isDisabled && onSelectDate(day)}
                            className={`h-[72px] w-[72px] flex items-center justify-center text-[18px] font-medium transition-all duration-200 rounded-lg ${isDisabled ? "" : "cursor-pointer"} ${cellClass}`}
                        >
                            {day.getDate()}
                            {isSelected && selectedDates.length > 1 && mode !== "view" && (
                                <span
                                    onClick={(e) => onDeleteDate(day, e)}
                                    className="absolute bottom-1 right-1.5 w-4.5 h-4.5 flex items-center justify-center rounded-full bg-[#EF4444] hover:bg-[#DC2626] text-white font-extrabold text-[12px] leading-none transition-colors cursor-pointer select-none"
                                    title="Remove selection"
                                >
                                    ×
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Slots Grid Component
function SlotsGrid({
    slots,
    selectedSlot,
    onSelectSlot,
    selectedDate,
    bookedSlots = [],
    mode = "add",
}: {
    slots: Slot[];
    selectedSlot: string;
    onSelectSlot: (time: string) => void;
    selectedDate: Date;
    bookedSlots?: string[];
    mode?: "add" | "edit" | "view";
}) {
    const handleSlotClick = (time: string) => {
        if (mode === "view") return;
        onSelectSlot(time);
    };

    return (
        <div className="flex flex-col gap-4 text-left select-none">
            <h4 className="font-inter font-semibold text-[16px] leading-[120%] text-[#262D3B]">
                Slots
            </h4>
            <div className="grid grid-cols-2 gap-3">
                {slots.map((slot) => {
                    const isToday = moment(selectedDate).isSame(moment(), "day");
                    const slotTimeMoment = moment(slot.time, "hh:mm A");
                    const isTimePassed = isToday && slotTimeMoment.hour() < moment().hour();
                    const isSelected = selectedSlot === slot.time;
                    const isBooked = bookedSlots.includes(slot.time);
                    const isDisabled = slot.status === "disabled" || isTimePassed || isBooked;

                    let borderClass = "border-[#DFE0E2] bg-white";
                    if (isSelected) {
                        borderClass = "border-[#0B8C00] bg-[#E6F4E6]/10";
                    } else if (isDisabled) {
                        borderClass = "border-[#DFE0E2] bg-[#F8F9FA] cursor-not-allowed opacity-50";
                    }

                    return (
                        <div
                            key={slot.time}
                            onClick={() => !isDisabled && handleSlotClick(slot.time)}
                            className={`flex items-center justify-between rounded-[12px] border px-4 py-3 text-[14px] font-medium transition-all duration-200 ${
                                isDisabled || mode === "view" ? "" : "cursor-pointer hover:shadow-sm"
                            } ${borderClass}`}
                        >
                            <span className={isSelected ? "text-[#0B8C00] font-bold" : "text-[#434956]"}>
                                {slot.time}
                            </span>
                            {isSelected ? (
                                <span className="text-[#0B8C00] font-bold">✓</span>
                            ) : isBooked ? (
                                <span className="text-[#E53E3E] text-[11px] font-bold bg-[#FFF0EB] px-2 py-0.5 rounded-full">Booked</span>
                            ) : isDisabled ? (
                                <span className="text-[#9FA2AB]">🚫</span>
                            ) : (
                                <span className="text-[#9FA2AB] text-[12px]">60m</span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

interface SessionConfig {
    slot: string;
    roomIds: string[];
    therapyIds: string[];
    therapistIds: string[];
    altTherapistIds: string[];
}

const createDefaultConfig = (date: Date): SessionConfig => ({
    slot: "",
    roomIds: [],
    therapyIds: [],
    therapistIds: [],
    altTherapistIds: [],
});

// CounselorCalendarPage Root Component
interface CounselorCalendarPageProps {
    mode?: "add" | "edit" | "view";
    patient?: any;
    onBack?: () => void;
    onSave?: (data: { selectedDates: Date[]; configs: Record<string, SessionConfig[]>; recurrence: string }) => void;
    initialConfigs?: Record<string, SessionConfig[]>;
    initialSelectedDates?: Date[];
    initialRecurrence?: string;
    title?: string;
    packageItems?: { label: string; value: string }[];
    therapyOptions?: ResourceOption[];
    therapistOptions?: ResourceOption[];
    alternateTherapistOptions?: ResourceOption[];
    roomOptions?: ResourceOption[];
    slots?: Slot[];
}

const getFirstAvailableSlot = (date: Date, slots: Slot[] = MOCK_SLOTS) => {
    const isToday = moment(date).isSame(moment(), "day");
    for (const slot of slots) {
        const slotTimeMoment = moment(slot.time, "hh:mm A");
        const isTimePassed = isToday && slotTimeMoment.hour() < moment().hour();
        if (!isTimePassed && slot.status !== "disabled") {
            return slot.time;
        }
    }
    return "";
};

export default function CounselorCalendarPage({
    mode = "add",
    patient,
    onBack,
    onSave,
    initialConfigs,
    initialSelectedDates,
    initialRecurrence = "single",
    title = "Book New Session - Schedule & Resources",
    packageItems = PACKAGE_ITEMS,
    therapyOptions = THERAPY_OPTIONS,
    therapistOptions = THERAPIST_OPTIONS,
    alternateTherapistOptions = ALTERNATE_THERAPIST_OPTIONS,
    roomOptions = ROOM_OPTIONS,
    slots = MOCK_SLOTS,
}: CounselorCalendarPageProps = {}) {
    const [selectedDates, setSelectedDates] = useState<Date[]>(() => {
        if (initialSelectedDates && initialSelectedDates.length > 0) {
            return initialSelectedDates;
        }
        const startVal = packageItems.find((item) => item.label === "Start Date")?.value;
        const initialDate = startVal ? moment(startVal, "DD MMMM YYYY").toDate() : new Date();
        return [initialDate];
    });

    const slotPanelRef = useRef<HTMLDivElement>(null);
    const roomPanelRef = useRef<HTMLDivElement>(null);
    const therapyPanelRef = useRef<HTMLDivElement>(null);
    const therapistPanelRef = useRef<HTMLDivElement>(null);
    const altTherapistPanelRef = useRef<HTMLDivElement>(null);

    const [activeDate, setActiveDate] = useState<Date>(() => {
        if (initialSelectedDates && initialSelectedDates.length > 0) {
            return initialSelectedDates[0];
        }
        const startVal = packageItems.find((item) => item.label === "Start Date")?.value;
        return startVal ? moment(startVal, "DD MMMM YYYY").toDate() : new Date();
    });

    const activeDateKey = useMemo(() => {
        return moment(activeDate).format("YYYY-MM-DD");
    }, [activeDate]);

    const [configs, setConfigs] = useState<Record<string, SessionConfig[]>>(() => {
        if (initialConfigs && Object.keys(initialConfigs).length > 0) {
            return initialConfigs;
        }
        const startVal = packageItems.find((item) => item.label === "Start Date")?.value;
        const initialDate = startVal ? moment(startVal, "DD MMMM YYYY").toDate() : new Date();
        const initialKey = moment(initialDate).format("YYYY-MM-DD");
        return {
            [initialKey]: [createDefaultConfig(initialDate)],
        };
    });

    const [recurrence, setRecurrence] = useState(initialRecurrence);
    const [selectedTargetDates, setSelectedTargetDates] = useState<string[]>([]);
    const [activeConfigIndex, setActiveConfigIndex] = useState<number>(0);

    useEffect(() => {
        setSelectedTargetDates([]);
        setActiveConfigIndex(0);
    }, [activeDateKey]);

    const packageStart = useMemo(() => {
        const startVal = packageItems.find((item) => item.label === "Start Date")?.value;
        return startVal ? moment(startVal, "DD MMMM YYYY").toDate() : new Date();
    }, [packageItems]);

    const packageEnd = useMemo(() => {
        const endVal = packageItems.find((item) => item.label === "End Date")?.value;
        return endVal ? moment(endVal, "DD MMMM YYYY").toDate() : new Date();
    }, [packageItems]);

    const dailySeriesDates = useMemo(() => {
        const dates: Date[] = [];
        const startMoment = moment(packageStart);
        for (let i = 0; i < 7; i++) {
            const current = moment(startMoment).add(i, "days");
            if (current.isSameOrBefore(packageEnd, "day")) {
                dates.push(current.toDate());
            }
        }
        return dates;
    }, [packageStart, packageEnd]);

    const isSlotAvailable = (date: Date, slotTime: string): boolean => {
        const today = moment().startOf("day");
        const dateMoment = moment(date).startOf("day");
        if (dateMoment.isBefore(today)) return false;

        if (dateMoment.isSame(today)) {
            const slotHour = moment(slotTime, "hh:mm A").hour();
            const currentHour = moment().hour();
            if (slotHour < currentHour) return false;
        }

        const slotObj = slots.find((s) => s.time === slotTime);
        if (slotObj && slotObj.status === "disabled") {
            return false;
        }

        return true;
    };

    const handleRecurrenceChange = (val: string) => {
        setRecurrence(val);
        if (val === "daily") {
            setSelectedDates((prev) => {
                const otherDates = prev.filter(
                    (d) => !dailySeriesDates.some((ds) => moment(ds).isSame(d, "day"))
                );
                return [...dailySeriesDates, ...otherDates];
            });

            setConfigs((prev) => {
                const next = { ...prev };
                const startKey = moment(packageStart).format("YYYY-MM-DD");
                const baseConfigs = prev[startKey] || [createDefaultConfig(packageStart)];

                dailySeriesDates.forEach((date) => {
                    const dateKey = moment(date).format("YYYY-MM-DD");
                    if (dateKey === startKey) return;

                    next[dateKey] = baseConfigs.map(cfg => {
                        const slotAvail = cfg.slot ? isSlotAvailable(date, cfg.slot) : false;
                        return {
                            ...cfg,
                            date,
                            slot: slotAvail ? cfg.slot : "",
                            roomIds: [...cfg.roomIds],
                            therapyIds: [...cfg.therapyIds],
                            therapistIds: [...cfg.therapistIds],
                            altTherapistIds: [...cfg.altTherapistIds],
                        };
                    });
                });

                return next;
            });
        }
    };

    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [validationTriggered, setValidationTriggered] = useState(false);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [isBookingLoading, setIsBookingLoading] = useState(false);

    // Dynamic selections text
    const selectedDateFormatted = useMemo(() => {
        return selectedDates
            .map((d) => moment(d).format("MMM D, YYYY"))
            .join(", ");
    }, [selectedDates]);

    const activeConfig = useMemo(() => {
        const list = configs[activeDateKey] || [];
        return list[activeConfigIndex] || createDefaultConfig(activeDate);
    }, [configs, activeDateKey, activeConfigIndex, activeDate]);

    const activeConfigs = useMemo(() => {
        return configs[activeDateKey] || [createDefaultConfig(activeDate)];
    }, [configs, activeDateKey, activeDate]);

    const activeTherapistName = useMemo(() => {
        return therapistOptions.find((t) => activeConfig.therapistIds.includes(t.id))?.name || "None";
    }, [activeConfig.therapistIds, therapistOptions]);

    const activeRoomName = useMemo(() => {
        return roomOptions.find((r) => activeConfig.roomIds.includes(r.id))?.name || "None";
    }, [activeConfig.roomIds, roomOptions]);

    const activeTherapyName = useMemo(() => {
        const selected = therapyOptions.filter((t) => activeConfig.therapyIds.includes(t.id));
        if (selected.length === 0) return "None";
        return selected.map((t) => t.name).join(", ");
    }, [activeConfig.therapyIds, therapyOptions]);

    const activeAltTherapistName = useMemo(() => {
        return alternateTherapistOptions.find((at) => activeConfig.altTherapistIds.includes(at.id))?.name || "None";
    }, [activeConfig.altTherapistIds, alternateTherapistOptions]);

    const activeRecurrenceLabel = recurrence === "single" ? "Single Session" : "Daily Series";

    const selectedTimeSlotRange = useMemo(() => {
        const slot = activeConfig.slot;
        if (!slot) return "N/A";
        const start = moment(slot, "hh:mm A");
        const end = moment(start).add(1, "hour");
        return `${start.format("hh:mm A")} - ${end.format("hh:mm A")}`;
    }, [activeConfig.slot]);

    const updateConfig = (key: string, updates: Partial<SessionConfig>) => {
        setConfigs((prev) => {
            const list = prev[key] ? [...prev[key]] : [createDefaultConfig(activeDate)];
            if (!list[activeConfigIndex]) {
                list[activeConfigIndex] = createDefaultConfig(activeDate);
            }
            list[activeConfigIndex] = {
                ...list[activeConfigIndex],
                ...updates,
            };
            const next = {
                ...prev,
                [key]: list,
            };

            const startKey = moment(packageStart).format("YYYY-MM-DD");
            if (recurrence === "daily" && key === startKey) {
                dailySeriesDates.forEach((date) => {
                    const dateKey = moment(date).format("YYYY-MM-DD");
                    if (dateKey === startKey) return;

                    next[dateKey] = list.map(cfg => {
                        const slotAvail = cfg.slot ? isSlotAvailable(date, cfg.slot) : false;
                        return {
                            ...cfg,
                            date,
                            slot: slotAvail ? cfg.slot : "",
                        };
                    });
                });
            }
            return next;
        });
    };

    const handleSelectDate = (date: Date) => {
        const isSelected = selectedDates.some((d) => moment(d).isSame(date, "day"));
        const dateKey = moment(date).format("YYYY-MM-DD");

        if (isSelected) {
            setActiveDate(date);
        } else {
            setSelectedDates((prev) => [...prev, date]);
            setActiveDate(date);
            setConfigs((prev) => {
                if (prev[dateKey]) return prev;
                return {
                    ...prev,
                    [dateKey]: [createDefaultConfig(date)],
                };
            });
        }
    };

    const handleDeleteDate = (date: Date, e: React.MouseEvent) => {
        e.stopPropagation();
        const dateKey = moment(date).format("YYYY-MM-DD");

        if (selectedDates.length <= 1) {
            // Only 1 date selected: just clear its configuration details (make data empty)
            setConfigs((prev) => ({
                ...prev,
                [dateKey]: [createDefaultConfig(date)],
            }));
            return;
        }

        const isRemovingActive = moment(activeDate).isSame(date, "day");
        const updatedDates = selectedDates.filter((d) => !moment(d).isSame(date, "day"));
        setSelectedDates(updatedDates);

        setConfigs((prev) => {
            const next = { ...prev };
            delete next[dateKey];
            return next;
        });

        if (isRemovingActive && updatedDates.length > 0) {
            setActiveDate(updatedDates[0]);
        }
    };

    const handleSelectSlot = (time: string) => {
        updateConfig(activeDateKey, { slot: time });
    };

    const siblingBookedSlots = useMemo(() => {
        const list = configs[activeDateKey] || [];
        return list
            .filter((_, idx) => idx !== activeConfigIndex)
            .map((cfg) => cfg.slot)
            .filter(Boolean) as string[];
    }, [configs, activeDateKey, activeConfigIndex]);

    const otherSelectedDates = useMemo(() => {
        return selectedDates.filter((d) => !moment(d).isSame(activeDate, "day"));
    }, [selectedDates, activeDate]);

    const isDateConfigComplete = (date: Date) => {
        const dateKey = moment(date).format("YYYY-MM-DD");
        const list = configs[dateKey];
        if (!list || list.length === 0) return false;
        return list.every(config => 
            !!config.slot &&
            config.roomIds && config.roomIds.length > 0 &&
            config.therapyIds && config.therapyIds.length > 0 &&
            config.therapistIds && config.therapistIds.length > 0 &&
            config.altTherapistIds && config.altTherapistIds.length > 0
        );
    };

    const handleToggleTargetDate = (dateKey: string) => {
        setSelectedTargetDates((prev) =>
            prev.includes(dateKey)
                ? prev.filter((k) => k !== dateKey)
                : [...prev, dateKey]
        );
    };

    const handleToggleAllTargets = () => {
        const allKeys = otherSelectedDates.map(d => moment(d).format("YYYY-MM-DD"));
        if (selectedTargetDates.length === allKeys.length) {
            setSelectedTargetDates([]);
        } else {
            setSelectedTargetDates(allKeys);
        }
    };

    const handleAddMoreTherapy = () => {
        const activeConfigs = configs[activeDateKey] || [];
        if (activeConfigs.length >= 5) {
            setErrorMessage("You can book a maximum of 5 therapies per day.");
            setShowErrorDialog(true);
            return;
        }
        if (!isDateConfigComplete(activeDate)) {
            setErrorMessage("Please complete all details for the current therapy before adding another.");
            setShowErrorDialog(true);
            return;
        }

        setConfigs((prev) => {
            const next = { ...prev };
            const list = prev[activeDateKey] ? [...prev[activeDateKey]] : [];
            const newConfig = createDefaultConfig(activeDate);
            list.push(newConfig);
            next[activeDateKey] = list;

            const startKey = moment(packageStart).format("YYYY-MM-DD");
            if (recurrence === "daily" && activeDateKey === startKey) {
                dailySeriesDates.forEach((date) => {
                    const dateKey = moment(date).format("YYYY-MM-DD");
                    if (dateKey === startKey) return;

                    const dateList = prev[dateKey] ? [...prev[dateKey]] : [];
                    dateList.push(createDefaultConfig(date));
                    next[dateKey] = dateList;
                });
            }
            return next;
        });
        setActiveConfigIndex(activeConfigs.length);
    };

    const handleRemoveTherapy = (indexToRemove: number) => {
        setConfigs((prev) => {
            const next = { ...prev };
            const list = prev[activeDateKey] ? [...prev[activeDateKey]] : [];
            if (list.length <= 1) return prev;
            list.splice(indexToRemove, 1);
            next[activeDateKey] = list;

            const startKey = moment(packageStart).format("YYYY-MM-DD");
            if (recurrence === "daily" && activeDateKey === startKey) {
                dailySeriesDates.forEach((date) => {
                    const dateKey = moment(date).format("YYYY-MM-DD");
                    if (dateKey === startKey) return;

                    const dateList = prev[dateKey] ? [...prev[dateKey]] : [];
                    if (dateList.length > indexToRemove) {
                        dateList.splice(indexToRemove, 1);
                    }
                    next[dateKey] = dateList;
                });
            }
            return next;
        });
        setActiveConfigIndex((prev) => {
            if (prev >= indexToRemove && prev > 0) {
                return prev - 1;
            }
            return prev;
        });
    };

    const handleCopySelected = () => {
        const activeConfigs = configs[activeDateKey] || [createDefaultConfig(activeDate)];
        const unavailableDates: string[] = [];

        setConfigs((prev) => {
            const next = { ...prev };
            selectedTargetDates.forEach((dateKey) => {
                const targetDate = moment(dateKey, "YYYY-MM-DD").toDate();

                next[dateKey] = activeConfigs.map((activeConfig) => {
                    const slotAvail = activeConfig.slot ? isSlotAvailable(targetDate, activeConfig.slot) : false;

                    if (activeConfig.slot && !slotAvail) {
                        unavailableDates.push(moment(targetDate).format("D MMM"));
                    }

                    return {
                        ...activeConfig,
                        date: targetDate,
                        slot: slotAvail ? activeConfig.slot : "",
                        roomIds: [...activeConfig.roomIds],
                        therapyIds: [...activeConfig.therapyIds],
                        therapistIds: [...activeConfig.therapistIds],
                        altTherapistIds: [...activeConfig.altTherapistIds],
                    };
                });
            });
            return next;
        });

        // Reset target selections
        setSelectedTargetDates([]);

        if (unavailableDates.length > 0) {
            setErrorMessage(`Details copied. However, some time slot(s) were not available on: ${unavailableDates.join(", ")} and have been cleared.`);
            setShowErrorDialog(true);
        }
    };

    const isConfigInvalid = (config: SessionConfig | undefined) => {
        if (!config) return true;
        return (
            !config.slot ||
            !config.roomIds || config.roomIds.length === 0 ||
            !config.therapyIds || config.therapyIds.length === 0 ||
            !config.therapistIds || config.therapistIds.length === 0 ||
            !config.altTherapistIds || config.altTherapistIds.length === 0
        );
    };

    const scrollToInvalidField = (field: "slot" | "room" | "therapy" | "therapist" | "altTherapist") => {
        const refMap = {
            slot: slotPanelRef,
            room: roomPanelRef,
            therapy: therapyPanelRef,
            therapist: therapistPanelRef,
            altTherapist: altTherapistPanelRef,
        };
        const ref = refMap[field];
        if (ref && ref.current) {
            ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    };

    const handleSubmit = () => {
        setValidationTriggered(true);

        // 1. Verify activeDate first
        const activeKey = moment(activeDate).format("YYYY-MM-DD");
        const activeConfigsList = configs[activeKey] || [createDefaultConfig(activeDate)];

        for (let i = 0; i < activeConfigsList.length; i++) {
            const cfg = activeConfigsList[i];
            if (!cfg.slot) {
                setActiveConfigIndex(i);
                scrollToInvalidField("slot");
                return;
            }
            if (!cfg.roomIds || cfg.roomIds.length === 0) {
                setActiveConfigIndex(i);
                scrollToInvalidField("room");
                return;
            }
            if (!cfg.therapyIds || cfg.therapyIds.length === 0) {
                setActiveConfigIndex(i);
                scrollToInvalidField("therapy");
                return;
            }
            if (!cfg.therapistIds || cfg.therapistIds.length === 0) {
                setActiveConfigIndex(i);
                scrollToInvalidField("therapist");
                return;
            }
            if (!cfg.altTherapistIds || cfg.altTherapistIds.length === 0) {
                setActiveConfigIndex(i);
                scrollToInvalidField("altTherapist");
                return;
            }
        }

        // 2. Verify all other selected dates one by one in chronological order
        let firstInvalidDate: Date | null = null;
        let firstInvalidIndex = 0;
        let firstInvalidField: "slot" | "room" | "therapy" | "therapist" | "altTherapist" | null = null;

        for (const date of selectedDates) {
            if (moment(date).isSame(activeDate, "day")) continue; // already verified activeDate
            const dateKey = moment(date).format("YYYY-MM-DD");
            const dateConfigsList = configs[dateKey] || [createDefaultConfig(date)];

            for (let i = 0; i < dateConfigsList.length; i++) {
                const cfg = dateConfigsList[i];
                if (!cfg.slot) {
                    firstInvalidDate = date;
                    firstInvalidIndex = i;
                    firstInvalidField = "slot";
                    break;
                }
                if (!cfg.roomIds || cfg.roomIds.length === 0) {
                    firstInvalidDate = date;
                    firstInvalidIndex = i;
                    firstInvalidField = "room";
                    break;
                }
                if (!cfg.therapyIds || cfg.therapyIds.length === 0) {
                    firstInvalidDate = date;
                    firstInvalidIndex = i;
                    firstInvalidField = "therapy";
                    break;
                }
                if (!cfg.therapistIds || cfg.therapistIds.length === 0) {
                    firstInvalidDate = date;
                    firstInvalidIndex = i;
                    firstInvalidField = "therapist";
                    break;
                }
                if (!cfg.altTherapistIds || cfg.altTherapistIds.length === 0) {
                    firstInvalidDate = date;
                    firstInvalidIndex = i;
                    firstInvalidField = "altTherapist";
                    break;
                }
            }
            if (firstInvalidDate) break;
        }

        if (firstInvalidDate && firstInvalidField) {
            setActiveDate(firstInvalidDate);
            setActiveConfigIndex(firstInvalidIndex);
            setTimeout(() => {
                scrollToInvalidField(firstInvalidField!);
            }, 100);
            return;
        }

        // 3. All selected dates are fully valid! Clear validationTriggered flag and open confirm dialog
        setValidationTriggered(false);
        setIsConfirmOpen(true);
    };

    const handleConfirmBooking = () => {
        setIsBookingLoading(true);
        if (onSave) {
            try {
                onSave({ selectedDates, configs, recurrence });
            } catch (err) {
                console.error("Error in onSave callback:", err);
            }
        }
        setTimeout(() => {
            setIsBookingLoading(false);
            setIsConfirmOpen(false);
            setShowSuccessDialog(true);
        }, 1500);
    };

    const handleConfirmSuccess = () => {
        setShowSuccessDialog(false);
        if (onBack) onBack();
    };

    return (
        <AppShell>
            <div className="w-full space-y-6 pb-28">
                <div className="flex items-start justify-between">
                    <PageHeading title={title} />

                    <div className="flex items-center gap-2 w-full md:w-auto justify-end">

                        {onBack && (
                            <BackToPreviousPageButton
                                text="Back"
                                onClick={onBack}
                            />
                        )}

                    </div>

                </div>

                {/* Main 2-Column Layout Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-start">
                    {/* Left Column: Calendar & Slots + Room + Recurrence (8 cols) */}
                    <div className="xl:col-span-8 space-y-3">
                        {/* Calendar & Slots in One Panel */}
                        <div className="bg-white border border-[#DFE0E2] rounded-[20px] p-6 shadow-sm flex flex-col md:flex-row gap-6">
                            {/* Calendar Side */}
                            <div className="flex-1">
                                <CustomMiniCalendar
                                    selectedDates={selectedDates}
                                    activeDate={activeDate}
                                    onSelectDate={handleSelectDate}
                                    onDeleteDate={handleDeleteDate}
                                    mode={mode}
                                    packageItems={packageItems}
                                />
                            </div>

                            {/* Vertical Divider */}
                            <div className="hidden md:block w-[1px] bg-[#DFE0E2] self-stretch" />

                            {/* Slots Side */}
                            <div ref={slotPanelRef} className="w-full md:w-[320px] xl:w-[360px] shrink-0 flex flex-col">
                                {activeConfigs.length > 1 && (
                                    <div className="flex flex-col gap-2 mb-4 text-left">
                                        <span className="font-inter font-semibold text-[13px] text-[#4A5568]">
                                            Configure Therapy Session:
                                        </span>
                                        <div className="flex flex-wrap gap-2.5 p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[15px]">
                                            {activeConfigs.map((cfg, index) => {
                                                const isSelected = index === activeConfigIndex;
                                                const slotTime = cfg.slot || "Select Slot";
                                                
                                                return (
                                                    <div 
                                                        key={index}
                                                        onClick={() => setActiveConfigIndex(index)}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold cursor-pointer transition-all border shadow-sm select-none ${
                                                            isSelected 
                                                                ? "bg-[#0B8C00] text-white border-[#0B8C00]" 
                                                                : "bg-white text-[#4A5568] border-[#DFE0E2] hover:bg-[#F7FAF7]"
                                                        }`}
                                                    >
                                                        <span>T{index + 1}: {slotTime}</span>
                                                        {activeConfigs.length > 1 && mode !== "view" && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleRemoveTherapy(index);
                                                                }}
                                                                className={`p-0.5 rounded-full hover:bg-black/10 transition-colors ${
                                                                    isSelected ? "text-white" : "text-[#E53E3E] hover:text-[#C53030]"
                                                                }`}
                                                                title="Delete this session slot"
                                                            >
                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                                <SlotsGrid
                                    slots={slots}
                                    selectedSlot={activeConfig.slot || ""}
                                    onSelectSlot={handleSelectSlot}
                                    selectedDate={activeDate}
                                    bookedSlots={siblingBookedSlots}
                                    mode={mode}
                                />
                                {validationTriggered && !activeConfig.slot && (
                                    <div className="text-[#EF4444] text-[13px] font-semibold mt-2.5 ml-1 animate-pulse">
                                        Select Atleast One
                                    </div>
                                )}

                                {/* Copy / Apply Schedule Tool */}
                                {mode !== "view" && selectedDates.length > 1 && selectedDates.some(d => isDateConfigComplete(d)) && (
                                    <div className="mt-6 pt-4 border-t border-[#DFE0E2] flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <label className="font-inter font-semibold text-[13px] text-[#4A5568] flex items-center gap-1.5">
                                                <svg className="w-4 h-4 text-[#2B6CB0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                                </svg>
                                                Copy Details from {moment(activeDate).format("D MMM")}
                                             </label>
                                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isDateConfigComplete(activeDate)
                                                ? "bg-[#E6F4E6] text-[#0B8C00]"
                                                : "bg-[#FFF0EB] text-[#E53E3E]"
                                                }`}>
                                                {isDateConfigComplete(activeDate) ? "Active Date Complete" : "Active Date Incomplete"}
                                            </span>
                                        </div>

                                        {isDateConfigComplete(activeDate) ? (
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center justify-between text-[11px] text-[#718096]">
                                                    <span>Select dates to apply current {moment(activeDate).format("D MMM")} details to:</span>
                                                    {otherSelectedDates.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={handleToggleAllTargets}
                                                            className="text-[#2B6CB0] hover:underline font-semibold cursor-pointer border-none bg-transparent"
                                                        >
                                                            {selectedTargetDates.length === otherSelectedDates.length ? "Deselect All" : "Select All"}
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Checkboxes list container */}
                                                <div className="flex flex-col gap-2 border border-[#E2E8F0] rounded-[10px] p-2.5 bg-[#F8FAFC] max-h-[150px] overflow-y-auto">
                                                    {otherSelectedDates.map((date) => {
                                                        const dateKey = moment(date).format("YYYY-MM-DD");
                                                        const isComplete = isDateConfigComplete(date);
                                                        const isChecked = selectedTargetDates.includes(dateKey);

                                                        return (
                                                            <label
                                                                key={dateKey}
                                                                className="flex items-center justify-between cursor-pointer hover:bg-white p-1.5 rounded-[6px] transition-colors"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isChecked}
                                                                        onChange={() => handleToggleTargetDate(dateKey)}
                                                                        className="w-4 h-4 text-[#0B8C00] border-gray-300 rounded focus:ring-[#0B8C00] cursor-pointer"
                                                                    />
                                                                    <span className="font-inter text-[12px] font-semibold text-[#2D3748]">
                                                                        {moment(date).format("D MMM YYYY")}
                                                                    </span>
                                                                </div>
                                                                <span className={`text-[10px] font-semibold ${isChecked
                                                                    ? "text-[#2B6CB0]"
                                                                    : isComplete ? "text-[#0B8C00]" : "text-[#718096]"
                                                                    }`}>
                                                                    {isChecked
                                                                        ? `Copy from ${moment(activeDate).format("D MMMM")}`
                                                                        : isComplete ? "✓ Configured" : "Not Configured"
                                                                    }
                                                                </span>
                                                            </label>
                                                        );
                                                    })}
                                                </div>

                                                {/* Copy Button */}
                                                <button
                                                    type="button"
                                                    onClick={handleCopySelected}
                                                    disabled={selectedTargetDates.length === 0}
                                                    className={`w-full py-2 px-3 rounded-[10px] text-white font-inter font-semibold text-[12px] transition-colors text-center flex items-center justify-center gap-1.5 border shadow-sm ${selectedTargetDates.length === 0
                                                        ? "bg-[#CBD5E0] border-[#CBD5E0] cursor-not-allowed text-[#718096]"
                                                        : "bg-[#0B8C00] border-[#0B8C00] hover:bg-[#097300] cursor-pointer"
                                                        }`}
                                                >
                                                    Copy to {selectedTargetDates.length} Selected Date(s)
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="text-center py-4 text-[#E53E3E] text-[12px] bg-[#FFF0EB] rounded-[15px] border border-[#FFDAD1] px-4 font-inter font-medium leading-relaxed">
                                                Active date details are incomplete. Click a completed date on the calendar to copy details from.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Therapy Room Panel */}
                        <div ref={roomPanelRef} className="bg-white border border-[#DFE0E2] rounded-[20px] p-5 shadow-sm">
                            <ResourceSelectPanel
                                type="room"
                                title="Therapy Room"
                                options={roomOptions}
                                selectedIds={activeConfig.roomIds || []}
                                onChange={(ids) => updateConfig(activeDateKey, { roomIds: ids })}
                                multiple={false}
                                mode={mode}
                            />
                            {validationTriggered && (!activeConfig.roomIds || activeConfig.roomIds.length === 0) && (
                                <div className="text-[#EF4444] text-[13px] font-semibold mt-2.5 ml-1">
                                    Select Atleast one
                                </div>
                            )}
                        </div>

                        {/* Recurrence Selection */}
                        <div className="bg-white border border-[#DFE0E2] rounded-[20px] p-5 shadow-sm text-left flex flex-col gap-4">
                            <h4 className="font-inter font-semibold text-[16px] leading-[120%] text-[#262D3B]">
                                Recurrence
                            </h4>
                            <div className={mode === "view" ? "pointer-events-none opacity-80" : "w-[450px]"}>
                                <Tabs
                                    options={[
                                        { value: "single", label: "Single Session" },
                                        { value: "daily", label: "Daily Series" }
                                    ]}
                                    value={recurrence}
                                    onChange={handleRecurrenceChange}
                                />
                            </div>
                            <p className="font-inter font-medium text-[12px] leading-[140%] text-[#787E8C] italic">
                                Choosing a Daily Series will automatically book the same slot for 7 consecutive days.
                            </p>
                        </div>
                    </div>

                    {/* Right Column: Allocation Cards Panel (4 cols) */}
                    <div className="xl:col-span-4 space-y-3">
                        {/* Current Package */}
                        <AppointmentDetailCard
                            title="Current Package"
                            iconSrc="/icons/packages.svg"
                            items={packageItems}
                            className="!pb-0"
                        />

                        {/* Therapy Panel */}
                        <div ref={therapyPanelRef} className="bg-white border border-[#DFE0E2] rounded-[20px] p-5 shadow-sm">
                            <ResourceSelectPanel
                                type="therapy"
                                title="Therapy"
                                options={therapyOptions}
                                selectedIds={activeConfig.therapyIds || []}
                                onChange={(ids) => updateConfig(activeDateKey, { therapyIds: ids })}
                                multiple={true}
                                mode={mode}
                            />
                            {validationTriggered && (!activeConfig.therapyIds || activeConfig.therapyIds.length === 0) && (
                                <div className="text-[#EF4444] text-[13px] font-semibold mt-2.5 ml-1">
                                    Select Atleast One
                                </div>
                            )}
                        </div>

                        {/* Therapist Panel */}
                        <div ref={therapistPanelRef} className="bg-white border border-[#DFE0E2] rounded-[20px] p-5 shadow-sm">
                            <ResourceSelectPanel
                                type="therapist"
                                title="Therapist"
                                options={therapistOptions}
                                selectedIds={activeConfig.therapistIds || []}
                                onChange={(ids) => updateConfig(activeDateKey, { therapistIds: ids })}
                                multiple={false}
                                mode={mode}
                            />
                            {validationTriggered && (!activeConfig.therapistIds || activeConfig.therapistIds.length === 0) && (
                                <div className="text-[#EF4444] text-[13px] font-semibold mt-2.5 ml-1">
                                    Select Atleast One
                                </div>
                            )}
                        </div>

                        {/* Alternate Therapist Panel */}
                        <div ref={altTherapistPanelRef} className="bg-white border border-[#DFE0E2] rounded-[20px] p-5 shadow-sm">
                            <ResourceSelectPanel
                                type="therapist"
                                title="Alternate Therapists"
                                options={alternateTherapistOptions}
                                selectedIds={activeConfig.altTherapistIds || []}
                                onChange={(ids) => updateConfig(activeDateKey, { altTherapistIds: ids })}
                                multiple={false}
                                mode={mode}
                            />
                            {validationTriggered && (!activeConfig.altTherapistIds || activeConfig.altTherapistIds.length === 0) && (
                                <div className="text-[#EF4444] text-[13px] font-semibold mt-2.5 ml-1">
                                    Select Atleast One
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Submit button section below grid */}
                <div className="flex items-center justify-end pt-4">
                    {mode !== "view" && (
                        <>
                            {/* Add More Therapy Button */}
                            <Button
                                variant="outline"
                                size="large"
                                onClick={handleAddMoreTherapy}
                                disabled={!isDateConfigComplete(activeDate) || activeConfigs.length >= 5}
                                className="mr-3 !rounded-full !text-[#0B8C00] !border-[#0B8C00] hover:!bg-[#E6F4E6]/20 shadow-sm font-inter font-semibold"
                            >
                                Add More Therapy ({activeConfigs.length}/5)
                            </Button>
                            <Button
                                variant="primary"
                                size="large"
                                onClick={handleSubmit}
                                className="!rounded-full !bg-[#0B8C00] hover:!bg-[#097300] text-white min-w-[140px] shadow-md"
                            >
                                Save
                            </Button>
                        </>
                    )}
                    {mode === "view" && onBack && (
                        <Button
                            variant="outline"
                            size="large"
                            onClick={onBack}
                            className="!rounded-full font-inter font-semibold min-w-[120px] border-[#DFE0E2] hover:bg-[#F8F9FA] text-[#525763]"
                        >
                            Close
                        </Button>
                    )}
                </div>

                {/* Confirm Booking Dialog popup */}
                <Dialog
                    open={isConfirmOpen}
                    onClose={() => setIsConfirmOpen(false)}
                    title="Confirm Session Booking"
                    customHeader={
                        <div className="flex shrink-0 items-start justify-between px-6 pt-6 pb-2 text-left">
                            <div className="flex flex-col gap-1">
                                <h2 className="font-inter font-semibold text-[20px] leading-[120%] text-[#262D3B]">
                                    Confirm Session Booking
                                </h2>
                                <p className="font-inter text-[14px] leading-[140%] text-[#787E8C]">
                                    Please review the session details below before confirming.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsConfirmOpen(false)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent bg-transparent hover:bg-[#F2F8F2] transition-colors cursor-pointer text-[#787E8C]"
                            >
                                <Image src="/icons/CrossIcon.svg" alt="Close" width={14} height={14} />
                            </button>
                        </div>
                    }
                    width={638}
                >
                    <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1 py-2">
                        <div className="flex flex-col gap-1 border-b border-[#F0F4EF] pb-4">
                            <span className="text-[12px] font-semibold text-[#787E8C]">Package Name</span>
                            <span className="text-[15px] font-bold text-[#262D3B]">Cardiac Premium Care</span>
                        </div>
                        {selectedDates.map((date, dateIndex) => {
                            const dateKey = moment(date).format("YYYY-MM-DD");
                            const dateConfigs = configs[dateKey] || [createDefaultConfig(date)];
                            const dateFormatted = moment(date).format("DD MMM YYYY");

                            return (
                                <div key={dateKey} className="border-b border-[#F0F4EF] pb-4 last:border-b-0 last:pb-0">
                                    <h4 className="text-[14px] font-bold text-[#0B8C00] mb-3">Session {dateIndex + 1}: {dateFormatted}</h4>
                                    
                                    <div className="flex flex-col gap-3">
                                        {dateConfigs.map((config, configIndex) => {
                                            const therapyNames = therapyOptions.filter((t) => config.therapyIds.includes(t.id)).map((t) => t.name).join(", ") || "None";
                                            const therapistName = therapistOptions.find((t) => config.therapistIds.includes(t.id))?.name || "None";
                                            const altTherapistName = alternateTherapistOptions.find((at) => config.altTherapistIds.includes(at.id))?.name || "None";
                                            const roomName = roomOptions.find((r) => config.roomIds.includes(r.id))?.name || "None";

                                            const startSlot = moment(config.slot, "hh:mm A");
                                            const endSlot = moment(startSlot).add(1, "hour");
                                            const slotRange = config.slot ? `${startSlot.format("hh:mm A")} - ${endSlot.format("hh:mm A")}` : "N/A";

                                            return (
                                                <div key={configIndex} className="bg-[#F8FAFC] p-3.5 rounded-[12px] border border-[#E2E8F0] space-y-3.5">
                                                    <div className="font-bold text-[12px] text-[#4A5568] border-b border-[#E2E8F0] pb-1">
                                                        Therapy Slot {configIndex + 1}: {slotRange}
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-x-8 gap-y-3.5 text-left font-inter">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-[11px] font-semibold text-[#787E8C]">Therapy Room</span>
                                                            <span className="text-[13.5px] font-bold text-[#262D3B]">{roomName}</span>
                                                        </div>
                                                        <div className="flex flex-col gap-1 col-span-2">
                                                            <span className="text-[11px] font-semibold text-[#787E8C]">Therapy</span>
                                                            <span className="text-[13.5px] font-bold text-[#262D3B]">{therapyNames}</span>
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-[11px] font-semibold text-[#787E8C]">Therapist</span>
                                                            <span className="text-[13.5px] font-bold text-[#262D3B]">{therapistName}</span>
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-[11px] font-semibold text-[#787E8C]">Alternate Therapist</span>
                                                            <span className="text-[13.5px] font-bold text-[#262D3B]">{altTherapistName}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex items-center gap-3 mt-8 pb-2">
                        <Button
                            variant="primary"
                            size="large"
                            onClick={handleConfirmBooking}
                            className="!rounded-full !bg-[#0B8C00] hover:!bg-[#0A7F00] text-white"
                            isLoading={isBookingLoading}
                            disabled={isBookingLoading}
                        >
                            Submit
                        </Button>
                        <Button
                            variant="outline"
                            size="large"
                            onClick={() => setIsConfirmOpen(false)}
                            className="!rounded-full"
                            disabled={isBookingLoading}
                        >
                            Cancel
                        </Button>
                    </div>
                </Dialog>

                {/* Booking Success Message Dialog */}
                <MessageDialog
                    open={showSuccessDialog}
                    onClose={handleConfirmSuccess}
                    icon="/icons/SuccessCheck.svg"
                    iconBgColor="#E8F5E9"
                    message={`Session Booked successfully for ${patient?.name || "Patient"} for ${selectedDates.length} selected date(s) (${selectedDateFormatted})!`}
                    confirmText="OK"
                    showCancel={false}
                    onConfirm={handleConfirmSuccess}
                />

                {/* Booking Error Message Dialog */}
                <MessageDialog
                    open={showErrorDialog}
                    onClose={() => setShowErrorDialog(false)}
                    icon="/icons/CrossIcon.svg"
                    iconBgColor="#FFEBEE"
                    message={errorMessage || "In that booking API facing error so currently this booking did not work"}
                    confirmText="OK"
                    showCancel={false}
                    onConfirm={() => setShowErrorDialog(false)}
                />

            </div>
        </AppShell>
    );
}

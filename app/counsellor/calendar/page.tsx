"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
    Button,
    Dialog,
    FormInputField,
    FormTextareaField,
    TableSearchInput,
    MessageDialog,
} from "@/components/ui";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
// @ts-ignore: CSS import for react-big-calendar side effects
import "react-big-calendar/lib/css/react-big-calendar.css";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { useAppSelector } from "@/store/hooks";
import { selectSelectedBranch, selectUserBranchId } from "@/store/slices/authSlice";
import { useGetSchedulePatientQuery, useUpdateSchedulePatientMutation } from "@/store/api/counsellorApi";
import { useDebounce } from "@/hooks/useDebounce";

// Initialize localizer for react-big-calendar
const localizer = momentLocalizer(moment);

// Dynamic today references to automatically keep calendar active and relevant
const todayRef = new Date();
const currentYear = todayRef.getFullYear();
const currentMonth = todayRef.getMonth();

// High-fidelity preconfigured Mock Events representing the visual data in the mockup
const MOCK_EVENTS = [
    {
        id: 1,
        title: "James Anderson",
        type: "Therapy",
        start: new Date(currentYear, currentMonth, 1),
        end: new Date(currentYear, currentMonth, 1),
        allDay: true,
        patientName: "James Anderson",
        uhid: "JA-8872-9102",
        age: 34,
        reason: "Physical Therapy Follow-Up",
        details: "Assess progress on knee extension and joint mobility.",
        phone: "9876543210",
        department: "Physiotherapy - Rehab Center",
        color: "orange",
    },
    {
        id: 2,
        title: "Maria Garcia - Wound...",
        type: "Package Check",
        start: new Date(currentYear, currentMonth, 1),
        end: new Date(currentYear, currentMonth, 1),
        allDay: true,
        patientName: "Maria Garcia",
        uhid: "MG-2210-9943",
        age: 50,
        reason: "Wound Dressing Change & Cleanse",
        details: "Cleanse surgical wound on lower limb and apply sterile dressing.",
        phone: "9876543211",
        department: "General Surgery - West Wing",
        color: "blue",
    },
    {
        id: 3,
        title: "Robert Chen - BP",
        type: "Appointment",
        start: new Date(currentYear, currentMonth, 4),
        end: new Date(currentYear, currentMonth, 4),
        allDay: true,
        patientName: "Robert Chen",
        uhid: "RC-1102-3948",
        age: 62,
        reason: "Blood Pressure Monitoring & Consultation",
        details: "Routine checkup to adjust anti-hypertensive dosage.",
        phone: "9876543212",
        department: "Cardiology - Clinic B",
        color: "green",
    },
    {
        id: 4,
        title: "Robert Chen - BP",
        type: "Appointment",
        start: new Date(currentYear, currentMonth, 14),
        end: new Date(currentYear, currentMonth, 14),
        allDay: true,
        patientName: "Robert Chen",
        uhid: "RC-1102-3948",
        age: 62,
        reason: "Blood Pressure Monitoring & Consultation",
        details: "Follow-up visit to review BP logs.",
        phone: "9876543212",
        department: "Cardiology - Clinic B",
        color: "green",
    },
    {
        id: 5,
        title: "Amit Sharma",
        type: "Appointment",
        start: new Date(currentYear, currentMonth, 8),
        end: new Date(currentYear, currentMonth, 8),
        allDay: true,
        patientName: "Amit Sharma",
        uhid: "AS-9921-0812",
        age: 48,
        reason: "Post-Op Wound Check",
        details: "Verify Heading of surgical site from appended to my Performed on 09/26",
        phone: "9876543210",
        department: "General Surgery - East Wing",
        color: "green",
        avatar: "/patient_amit_sharma.png"
    }
];

export default function CounselorCalendarPage() {
    const selectedBranch = useAppSelector(selectSelectedBranch);
    const userBranchId = useAppSelector(selectUserBranchId);
    const branchId = selectedBranch?.id || userBranchId || null;

    // Current date set to today's date dynamically
    const [currentDate, setCurrentDate] = useState(() => new Date());
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearch = useDebounce(searchQuery, 500);

    // Active state elements for interactive modals
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
    const [showNoteDialog, setShowNoteDialog] = useState(false);
    const [noteValue, setNoteValue] = useState("");

    // Reschedule dialog states
    const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
    const [newScheduleDate, setNewScheduleDate] = useState("");

    // Success feedback Dialog elements
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    // Calculate first and last date of current currentDate month
    const fromDate = useMemo(() => {
        return moment(currentDate).startOf("month").format("YYYY-MM-DD");
    }, [currentDate]);

    const toDate = useMemo(() => {
        return moment(currentDate).endOf("month").format("YYYY-MM-DD");
    }, [currentDate]);

    // Dynamic schedule patients query from API
    const { data: scheduleRes, isLoading, refetch } = useGetSchedulePatientQuery({
        fromDate,
        toDate,
        branchId: branchId || undefined,
        search: debouncedSearch.trim() || undefined,
    });

    // Update appointment mutation
    const [updateSchedulePatient, { isLoading: isUpdating }] = useUpdateSchedulePatientMutation();

    // Map API appointments to React Big Calendar events
    const calendarEvents = useMemo(() => {
        const appts = scheduleRes?.data?.appointments || [];
        return appts.map((appt) => {
            const apptDate = moment(appt.date).toDate();
            return {
                ...appt,
                title: appt.patientName,
                start: apptDate,
                end: apptDate,
                allDay: true,
                color: appt.status === "done" ? "green" : appt.status === "pending" ? "blue" : "red",
            };
        });
    }, [scheduleRes]);

    // Custom toolbar rendering matching mockup navigation chevrons and title
    const CustomToolbar = ({ label, onNavigate }: { label: string; onNavigate: (action: any) => void }) => {
        return (
            <div className="flex items-center justify-center gap-5 mb-6">
                <button
                    onClick={() => onNavigate("PREV")}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#0B8C00] text-white hover:bg-[#097300] transition-colors shadow-sm cursor-pointer border-none"
                    aria-label="Previous Month"
                >
                    <FaChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[#262D3B] text-lg font-bold min-w-[155px] text-center select-none">
                    {label}
                </span>
                <button
                    onClick={() => onNavigate("NEXT")}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#0B8C00] text-white hover:bg-[#097300] transition-colors shadow-sm cursor-pointer border-none"
                    aria-label="Next Month"
                >
                    <FaChevronRight className="w-3.5 h-3.5" />
                </button>
            </div>
        );
    };

    // Custom component inside cells for date headers to allow white selected text
    const CustomDateHeader = ({ label, date }: { label: string; date: Date }) => {
        const isToday = moment(date).isSame(moment(), "day");
        return (
            <span className={`font-semibold text-sm ${isToday ? "text-white" : "text-[#787E8C]"}`}>
                {label}
            </span>
        );
    };

    // Custom Calendar Event Pill showing custom colored dots and text matching standard mockup status colors
    const CustomEventComponent = ({ event }: { event: any }) => {
        let bgColor = "#E6F4E6";
        let dotColor = "#0B8C00";
        let textColor = "#0B8C00";

        if (event.status === "pending") {
            bgColor = "#EFF6FF"; // Very light blue background matching mockup
            dotColor = "#2563EB"; // Solid blue dot
            textColor = "#1D4ED8"; // Deep blue text matching mockup
        } else if (event.status === "cancel") {
            bgColor = "#FEF2F2"; // Very light red background
            dotColor = "#EF4444"; // Solid red dot
            textColor = "#991B1B"; // Deep red text
        }

        return (
            <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-[6px] text-xs font-semibold select-none leading-none overflow-hidden h-7 hover:shadow-sm transition-all"
                style={{ backgroundColor: bgColor }}
            >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                <span className="truncate" style={{ color: textColor }}>
                    {event.title}
                </span>
            </div>
        );
    };

    // Custom stylings based on event type
    const eventStyleGetter = () => {
        return {
            style: {
                backgroundColor: "transparent",
                border: "none",
                padding: "0px",
                margin: "1px 0",
                display: "block",
            },
        };
    };

    const dayPropGetter = (date: Date) => {
        const isToday = moment(date).isSame(moment(), "day");
        const hasEvents = calendarEvents.some((event) => moment(event.start).isSame(date, "day"));

        // Highlight Today's actual date ONLY in solid green
        if (isToday) {
            return {
                style: {
                    backgroundColor: "#0B8C00",
                },
            };
        }
        // Highlight active event days in light mint background tint
        if (hasEvents && date.getMonth() === currentDate.getMonth()) {
            return {
                style: {
                    backgroundColor: "#F2FAF2",
                },
            };
        }
        return {};
    };

    // Suffix green call dialer button
    const PhoneSuffix = () => (
        <button
            type="button"
            onClick={() => alert("Dialer initiated. Contacting patient...")}
            className="flex items-center justify-center w-6 h-6 hover:opacity-90 transition-all cursor-pointer mr-1 border-none bg-transparent p-0"
            title="Call Patient"
        >
            <Image
                src="/icons/telephoneIcons.svg"
                alt="Call"
                width={24}
                height={24}
                className="object-contain"
            />
        </button>
    );

    // Event Actions
    const handleMarkAsComplete = async () => {
        if (!selectedEvent) return;
        try {
            const res = await updateSchedulePatient({
                patientScheduleId: selectedEvent.id,
                status: "done",
            }).unwrap();
            if (res.success) {
                setSuccessMessage(`Appointment for ${selectedEvent.patientName} has been successfully completed!`);
                setSelectedEvent(null);
                setShowSuccessDialog(true);
                refetch();
            }
        } catch (e: any) {
            alert(e?.data?.message || e?.message || "Failed to complete appointment.");
        }
    };

    const handleRescheduleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEvent || !newScheduleDate) return;
        try {
            const res = await updateSchedulePatient({
                patientScheduleId: selectedEvent.id,
                scheduleDate: newScheduleDate,
            }).unwrap();
            if (res.success) {
                setSuccessMessage(`Appointment rescheduled successfully to ${newScheduleDate}!`);
                setShowRescheduleDialog(false);
                setNewScheduleDate("");
                setSelectedEvent(null);
                setShowSuccessDialog(true);
                refetch();
            }
        } catch (e: any) {
            alert(e?.data?.message || e?.message || "Failed to reschedule appointment.");
        }
    };

    const handleNoteSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEvent || !noteValue.trim()) return;
        try {
            const res = await updateSchedulePatient({
                patientScheduleId: selectedEvent.id,
                notes: noteValue.trim(),
            }).unwrap();
            if (res.success) {
                setSuccessMessage(`Clinical note added successfully for ${selectedEvent.patientName}!`);
                setShowNoteDialog(false);
                setNoteValue("");
                setSelectedEvent(null);
                setShowSuccessDialog(true);
                refetch();
            }
        } catch (e: any) {
            alert(e?.data?.message || e?.message || "Failed to update appointment notes.");
        }
    };

    return (
        <AppShell>
            {/* Custom Global CSS tags to override react-big-calendar default styling */}
            <style>{`
                .rbc-calendar {
                    font-family: inherit !important;
                }
                .rbc-month-view {
                    border: 1px solid #E2E8F0 !important;
                    border-radius: 20px !important;
                    overflow: hidden !important;
                    background-color: #FFFFFF !important;
                    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
                }
                .rbc-header {
                    padding: 14px 16px !important;
                    font-weight: 700 !important;
                    text-transform: uppercase !important;
                    font-size: 11px !important;
                    color: #787E8C !important;
                    border-bottom: 1px solid #E2E8F0 !important;
                    text-align: left !important;
                    background-color: #FFFFFF !important;
                }
                .rbc-header + .rbc-header {
                    border-left: 1px solid #E2E8F0 !important;
                }
                .rbc-month-row {
                    border-top: 1px solid #E2E8F0 !important;
                }
                .rbc-day-bg {
                    transition: background-color 0.2s ease !important;
                }
                .rbc-day-bg + .rbc-day-bg {
                    border-left: 1px solid #E2E8F0 !important;
                }
                .rbc-date-cell {
                    text-align: left !important;
                    padding: 12px 0 0 16px !important;
                    font-weight: 600 !important;
                    font-size: 14px !important;
                }
                .rbc-off-range-bg {
                    background-color: #F8FAFC !important;
                }
                .rbc-off-range .rbc-date-cell span {
                    color: #CBD5E1 !important;
                }
                .rbc-row-content {
                    z-index: 4 !important;
                }
                .rbc-row-segment {
                    padding: 2px 4px !important;
                }
                .rbc-event {
                    background: transparent !important;
                    padding: 0 !important;
                }
                .rbc-event-content {
                    overflow: visible !important;
                }
                .rbc-today {
                    background-color: #0B8C00 !important;
                }
                .rbc-show-more {
                    color: #0B8C00 !important;
                    font-weight: 600 !important;
                    font-size: 11px !important;
                    margin-left: 16px !important;
                    margin-top: 4px !important;
                }
            `}</style>

            <div className="space-y-6">
                <div className="flex items-start justify-between">
                    <PageHeading title="Calendar" />
                </div>

                {/* Standard card wrapper container matching general UI guidelines */}
                <div className="relative flex w-full flex-col overflow-hidden rounded-[20px] border border-[#E2E8F0] bg-white p-6 shadow-sm">
                    {/* Top Row: Packages Dropdown & Table Search Input */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5">
                        <div className="flex items-center gap-2">
                            <span className="text-[#262D3B] font-bold text-lg leading-none select-none">
                                Packages
                            </span>
                        </div>
                        <div className="w-80">
                            <TableSearchInput
                                value={searchQuery}
                                onChange={setSearchQuery}
                                placeholder="Search Here..."
                            />
                        </div>
                    </div>

                    {/* React Big Calendar Container */}
                    <div className="h-[760px]">
                        <Calendar
                            localizer={localizer}
                            events={calendarEvents}
                            startAccessor="start"
                            endAccessor="end"
                            date={currentDate}
                            onNavigate={(newDate) => setCurrentDate(newDate)}
                            views={["month"]}
                            defaultView="month"
                            eventPropGetter={eventStyleGetter}
                            dayPropGetter={dayPropGetter}
                            onSelectEvent={(event) => setSelectedEvent(event)}
                            components={{
                                toolbar: CustomToolbar,
                                event: CustomEventComponent,
                                month: {
                                    dateHeader: CustomDateHeader,
                                },
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* ── Dialog A: Appointment Details Modal ──────────────────────── */}
            <Dialog
                open={!!selectedEvent && !showNoteDialog}
                onClose={() => setSelectedEvent(null)}
                title="Appointment Details"
                width={700}
                contentPadding="px-6 pb-6 pt-4"
            >
                {selectedEvent && (
                    <div className="flex flex-col text-left gap-5 select-none">
                        {/* Elite Portrait Header Banner */}
                        <div className="flex items-center gap-4 bg-[#0B8C000D] border border-[#0B8C001A] p-5 rounded-[20px]">
                            <Image
                                src={selectedEvent.avatar || "/patient_amit_sharma.png"}
                                alt={selectedEvent.patientName}
                                width={68}
                                height={68}
                                className="rounded-xl object-cover border-2 border-white shadow-sm"
                            />
                            <div className="flex flex-col gap-1 text-left">
                                <h3 className="font-extrabold text-xl text-[#262D3B] tracking-tight">
                                    {selectedEvent.patientName}
                                </h3>
                                <span className="text-xs font-semibold text-[#787E8C]">
                                    UHID: <span className="text-black font-bold">{selectedEvent.uhid}</span> • Age: <span className="text-black font-bold">{selectedEvent.age}</span>
                                </span>
                            </div>
                        </div>

                        {/* Follow-Up Reason Box with Dashed Outline */}
                        <div className="flex flex-col gap-2">
                            <span className="text-xs font-semibold text-[#787E8C] uppercase tracking-wider">
                                Follow-Up Reason
                            </span>
                            <div className="border border-dashed border-[#DFE0E2] rounded-[16px] p-4 bg-white text-left flex flex-col gap-1.5 shadow-sm">
                                <span className="text-sm font-bold text-[#262D3B]">
                                    {selectedEvent.reason}
                                </span>
                                <span className="text-xs font-medium text-[#7B8089] leading-relaxed">
                                    {selectedEvent.details || "Verify surgical site condition and progress report details."}
                                </span>
                            </div>
                        </div>

                        {/* Read-Only FormInputField with custom dialer suffix */}
                        <div className="flex flex-col gap-2">
                            <FormInputField
                                label="Contact Information"
                                type="text"
                                value={selectedEvent.phone}
                                readOnly
                                suffix={<PhoneSuffix />}
                                height={44}
                            />
                        </div>

                        {/* Department Info */}
                        <div className="flex flex-col gap-1 text-left">
                            <span className="text-xs font-semibold text-[#787E8C]  tracking-wider">
                                Department
                            </span>
                            <span className="text-sm font-semibold text-[#262D3B]">
                                {selectedEvent.department}
                            </span>
                        </div>

                        {/* Actions Row */}
                        <div className="flex flex-col sm:flex-row justify-between gap-3 mt-4 border-t border-[#E2E8F0] pt-4">
                            {selectedEvent.status === "done" ? (
                                <Button
                                    variant="primary"
                                    disabled
                                    className="bg-[#E2E8F0] text-[#94A3B8] rounded-full text-xs !font-semibold py-2 px-6 flex-1 cursor-not-allowed border-none"
                                >
                                    Complete
                                </Button>
                            ) : (
                                <Button
                                    variant="primary"
                                    onClick={handleMarkAsComplete}
                                    disabled={selectedEvent.status === "cancel" || isUpdating}
                                    className="bg-[#0B8C00] hover:bg-[#097300] text-white rounded-full text-xs !font-semibold py-2 px-6 flex-1 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Mark As Complete
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setNewScheduleDate(selectedEvent.date || moment().format("YYYY-MM-DD"));
                                    setShowRescheduleDialog(true);
                                }}
                                disabled={selectedEvent.status === "cancel" || selectedEvent.status === "done" || isUpdating}
                                className="border-[#0B8C00] text-[#0B8C00] hover:bg-[#0B8C0008] rounded-full text-xs !font-semibold py-2 px-6 flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Reschedule
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setNoteValue(selectedEvent.notes || "");
                                    setShowNoteDialog(true);
                                }}
                                disabled={selectedEvent.status === "cancel" || isUpdating}
                                className="border-[#0B8C00] text-[#0B8C00] hover:bg-[#0B8C0008] rounded-full text-xs !font-semibold py-2 px-6 flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Add Notes
                            </Button>
                        </div>
                    </div>
                )}
            </Dialog>

            {/* ── Dialog B: Add Note Modal ───────────────────────────────── */}
            <Dialog
                open={showNoteDialog}
                onClose={() => setShowNoteDialog(false)}
                title="Add Note"
                width={600}
                contentPadding="px-6 pb-6 pt-4"
            >
                {selectedEvent && (
                    <form onSubmit={handleNoteSubmit} className="flex flex-col text-left gap-6 select-none">
                        <div className="mt-2">
                            <FormTextareaField
                                label="Notes"
                                placeholder="Write Note here..."
                                value={noteValue}
                                onChange={(e) => setNoteValue(e.target.value)}
                                required
                                height={120}
                            />
                        </div>

                        {/* Action buttons */}
                        <div className="flex justify-start gap-3 ">
                            <Button
                                variant="primary"
                                type="submit"
                                className="bg-[#0B8C00] hover:bg-[#097300] text-white rounded-full text-xs !font-semibold py-2 px-6"
                            >
                                Submit
                            </Button>
                            <Button
                                variant="outline"
                                type="button"
                                onClick={() => {
                                    setShowNoteDialog(false);
                                    setNoteValue("");
                                }}
                                className="border-[#0B8C00] text-[#0B8C00] hover:bg-[#0B8C0008] rounded-full text-xs !font-semibold py-2 px-6"
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                )}
            </Dialog>

            {/* ── Dialog C: MessageDialog (Success Notifications) ──────────── */}
            <MessageDialog
                open={showSuccessDialog}
                onClose={() => setShowSuccessDialog(false)}
                icon="/icons/SuccessCheck.svg"
                iconBgColor="#E8F5E9"
                message={successMessage}
                confirmText="Done"
                showCancel={false}
                onConfirm={() => setShowSuccessDialog(false)}
            />

            {/* ── Dialog D: Reschedule Modal ───────────────────────────────── */}
            <Dialog
                open={showRescheduleDialog}
                onClose={() => setShowRescheduleDialog(false)}
                title="Reschedule Appointment"
                width={600}
                contentPadding="px-6 pb-6 pt-4"
            >
                {selectedEvent && (
                    <form onSubmit={handleRescheduleSubmit} className="flex flex-col text-left gap-6 select-none">
                        <div className="mt-2">
                            <FormInputField
                                label="New Date"
                                type="date"
                                value={newScheduleDate}
                                onChange={(e) => setNewScheduleDate(e.target.value)}
                                required
                                height={44}
                            />
                        </div>

                        {/* Action buttons */}
                        <div className="flex justify-start gap-3 ">
                            <Button
                                variant="primary"
                                type="submit"
                                className="bg-[#0B8C00] hover:bg-[#097300] text-white rounded-full text-xs !font-semibold py-2 px-6"
                                disabled={isUpdating}
                            >
                                {isUpdating ? "Saving..." : "Submit"}
                            </Button>
                            <Button
                                variant="outline"
                                type="button"
                                onClick={() => {
                                    setShowRescheduleDialog(false);
                                    setNewScheduleDate("");
                                }}
                                className="border-[#0B8C00] text-[#0B8C00] hover:bg-[#0B8C0008] rounded-full text-xs !font-semibold py-2 px-6"
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                )}
            </Dialog>
        </AppShell>
    );
}

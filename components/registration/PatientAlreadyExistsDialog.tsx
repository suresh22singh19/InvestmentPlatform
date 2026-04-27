"use client";

import Image from "next/image";
import { useMemo } from "react";
import { Dialog, Table, TableHeader, TableBody, TableRow, TableHead, TableData, Tooltip } from "@/components/ui";
import type { ExistingPatient } from "@/store/api/gateApi";
import type { GlobalPatientSearchAppointment } from "@/store/api/registrationApi";
import { useGetBranchesQuery } from "@/store/api/settingsApi";
import { useAppSelector } from "@/store/hooks";
import { selectUserBranchName, selectRoleCategoryType } from "@/store/slices/authSlice";

interface PatientAlreadyExistsDialogProps {
    open: boolean;
    onClose: () => void;
    existingPatients?: ExistingPatient[];
    appointments?: GlobalPatientSearchAppointment[]; // New prop for appointment data
    onRevisit?: (patient: ExistingPatient) => void;
    onAddNewMember?: () => void;
    onView?: (appointment: GlobalPatientSearchAppointment) => void; // New prop for view action
    isUserLeadData?: boolean; // Flag to show "User Lead Data" instead of "Patient Already Exists"
    showPatientDetails?: boolean; // Flag to show "Patient Details" instead of "Patient Already Exists"
    disableRevisit?: boolean; // Flag to disable the Revisit button
    revisitTooltipText?: string; // Tooltip text to show when Revisit button is disabled
    customTitle?: string; // Override the dialog title entirely when provided
}

export default function PatientAlreadyExistsDialog({
    open,
    onClose,
    existingPatients = [],
    appointments = [],
    onRevisit,
    onAddNewMember,
    onView,
    isUserLeadData = false,
    showPatientDetails = false,
    disableRevisit = false,
    revisitTooltipText = "",
    customTitle,
}: PatientAlreadyExistsDialogProps) {
    const userBranchName = useAppSelector(selectUserBranchName);
    const roleCategoryType = useAppSelector(selectRoleCategoryType);
    const isSuperAdmin = roleCategoryType?.toLowerCase() === "superadmin";

    const { data: branchesResponse } = useGetBranchesQuery(undefined, {
        skip: !isSuperAdmin,
    });

    const branchIdToName = useMemo(() => {
        const map = new Map<number, string>();
        const rows = branchesResponse?.data as { id?: number; name?: string }[] | undefined;
        if (!Array.isArray(rows)) return map;
        for (const b of rows) {
            if (b?.id != null && b.name) {
                const id = Number(b.id);
                if (Number.isFinite(id) && id > 0) map.set(id, String(b.name));
            }
        }
        return map;
    }, [branchesResponse]);

    const isAppointmentMode = appointments.length > 0 || showPatientDetails;
    const displayData = isAppointmentMode ? appointments : existingPatients;

    /**
     * Prefer row branch name from API.
     * Superadmin: if name is missing / "N/A", resolve from settings branches list using `rowBranchId` (not login branch).
     * Facility / corporate: fall back to logged-in user's branch name when row has no usable name.
     */
    const resolveBranchDisplay = (
        branchFromRow: string | null | undefined,
        rowBranchId?: number | null | undefined,
        emptyLabel: string = "N/A"
    ): string => {
        const raw = branchFromRow != null ? String(branchFromRow).trim() : "";
        if (raw && raw.toUpperCase() !== "N/A") return raw;

        if (isSuperAdmin && rowBranchId != null) {
            const id = Number(rowBranchId);
            if (Number.isFinite(id) && id > 0) {
                const fromDirectory = branchIdToName.get(id);
                if (fromDirectory) return fromDirectory;
                return emptyLabel;
            }
        }

        const fromAuth = userBranchName?.trim() ?? "";
        return fromAuth || emptyLabel;
    };
    
    const getTitle = () => {
        if (customTitle) return customTitle;
        if (showPatientDetails) return "Patient Details";
        if (isUserLeadData) return "User Lead Data";
        return "Patient Already Exists";
    };

    // Format date to DD-MM-YYYY
    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    };

    // Mask phone number to show only last 4 digits
    const maskPhoneNumber = (phoneNumber: string | null | undefined): string => {
        if (!phoneNumber) return "-";
        const cleaned = phoneNumber.replace(/\D/g, ""); // Remove non-digits
        if (cleaned.length < 4) return phoneNumber; // If less than 4 digits, return as is
        const last4 = cleaned.slice(-4);
        const masked = "XXXXXX" + last4;
        return masked;
    };

    /** Title-case each word (e.g. vinod → Vinod). */
    const formatPatientNameDisplay = (value: string | null | undefined): string => {
        if (value == null || String(value).trim() === "") return "";
        return String(value)
            .trim()
            .split(/\s+/)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(" ");
    };

    const getExistingPatientNameCell = (patient: (typeof existingPatients)[number]) => {
        const rawName = patient.patientName || (patient as { name?: string }).name;
        // User Lead Data: show patient name only (no S/O, D/O, etc. from patientTitle)
        if (isUserLeadData) {
            return formatPatientNameDisplay(rawName) || "-";
        }
        return [patient.patientTitle, rawName].filter(Boolean).join(" ") || "-";
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            title=""
            width={showPatientDetails ? 2000 : 1440}
        >
            <div className="space-y-6">
                <div className="flex items-center justify-center rounded-[8px] border border-[#0B8C00]/20 bg-[#0B8C00]/20 px-5 py-4">
                    <p className="text-[28px] font-medium leading-[120%] text-[#0B8C00]">
                        {getTitle()}
                    </p>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow className="bg-white">
                            <TableHead position="first">Sr no.</TableHead>
                            {isAppointmentMode ? (
                                <>
                                    <TableHead sortable>UHID</TableHead>
                                    <TableHead sortable>Patient Name</TableHead>
                                    <TableHead sortable>Contact Number</TableHead>
                                    <TableHead sortable>Branch Name</TableHead>
                                    {/* <TableHead sortable>Patient Type</TableHead> */}
                                    <TableHead sortable>Appointment Token</TableHead>
                                    <TableHead sortable>Doctor Name</TableHead>
                                    <TableHead sortable>Appointment Date</TableHead>
                                    {/* <TableHead sortable>Status</TableHead> */}
                                    <TableHead position="last">Action</TableHead>
                                </>
                            ) : (
                                <>
                                    <TableHead sortable>UHID</TableHead>
                                    <TableHead sortable>Name</TableHead>
                                    <TableHead sortable>Branch Name</TableHead>
                                    <TableHead position="last">Action</TableHead>
                                </>
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {displayData.length === 0 ? (
                            <TableRow>
                                <TableData
                                    colSpan={isAppointmentMode ? 11 : 5}
                                    className="py-12 text-center text-sm text-[#9CA3AF]"
                                >
                                    No patients found
                                </TableData>
                            </TableRow>
                        ) : isAppointmentMode ? (
                            appointments.map((appointment, index) => (
                                <TableRow
                                    key={appointment.appointmentId}
                                    className="bg-white transition-colors hover:bg-[#F7FAF7]"
                                >
                                    <TableData variant="primary">{index + 1}</TableData>
                                    <TableData>{appointment.uhid || "-"}</TableData>
                                    <TableData>{appointment.patientName || "-"}</TableData>
                                    <TableData>{maskPhoneNumber(appointment.contactNumber)}</TableData>
                                    <TableData>
                                        {resolveBranchDisplay(appointment.branchName, appointment.branchId, "-")}
                                    </TableData>
                                    {/* <TableData>{appointment.patientType || "-"}</TableData> */}
                                    <TableData>{appointment.appointmentToken || "-"}</TableData>
                                    <TableData>{appointment.doctorName || "-"}</TableData>
                                    <TableData>
                                        {appointment.appointmentDate
                                            ? formatDate(appointment.appointmentDate)
                                            : "-"}
                                    </TableData>
                                    {/* <TableData>
                                        <span
                                            className={`inline-flex h-[30px] min-w-[76px] shrink-0 items-center justify-center rounded-[30px] border px-5 text-xs font-medium leading-[120%] border-[#0B8C00]/20 bg-[#F2F8F2] text-[#0B8C00] ${
                                                appointment.status === "active"
                                                    ? "bg-[#0B8C00]/10 text-[#0B8C00] border border-[#0B8C00]/20"
                                                    : "bg-gray-100 text-gray-700 border border-gray-300"
                                            }`}
                                        >
                                            {appointment.status 
                                                ? appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1).toLowerCase()
                                                : "-"}
                                        </span>
                                    </TableData> */}
                                    <TableData>
                                        {onView && (
                                            <button
                                                type="button"
                                                onClick={() => onView(appointment)}
                                                disabled={true}
                                                className="flex h-7 w-7 items-center justify-center bg-white text-[#0B8C00]/30 transition-colors cursor-not-allowed opacity-50"
                                                title="View Details (Temporarily disabled)"
                                            >
                                                <Image src="/icons/Eye.svg" alt="View" width={20} height={20} />
                                            </button>
                                        )}
                                    </TableData>
                                </TableRow>
                            ))
                        ) : (
                            existingPatients.map((patient, index) => (
                                <TableRow
                                    key={patient.id}
                                    className="bg-white transition-colors hover:bg-[#F7FAF7]"
                                >
                                    <TableData variant="primary">{index + 1}</TableData>
                                    <TableData>{patient.uhid || "-"}</TableData>
                                    <TableData>
                                        <div className="flex items-center gap-2">
                                            {getExistingPatientNameCell(patient)}
                                            {patient.isPreBooking && (
                                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-[#0B8C00]/10 text-[#0B8C00] border border-[#0B8C00]/20">
                                                    Pre-Booking
                                                </span>
                                            )}
                                        </div>
                                    </TableData>
                                    <TableData>
                                        {resolveBranchDisplay(patient.branchName, patient.branchId)}
                                    </TableData>
                                    <TableData>
                                        {isUserLeadData ? (
                                            // For userLead data, show only "Visit" button
                                            <button
                                                type="button"
                                                onClick={() => onRevisit?.(patient)}
                                                className="flex h-7 items-center justify-center rounded-[32px] border border-[#0B8C00] bg-white px-4 text-sm font-medium text-[#0B8C00] transition-colors hover:bg-[#F2F8F2]"
                                            >
                                                Visit
                                            </button>
                                        ) : (
                                            // For existing patients, show both buttons
                                            <div className="flex items-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => onRevisit?.(patient)}
                                                    className="flex h-7 items-center justify-center rounded-[32px] border border-[#0B8C00] bg-white px-4 text-sm font-medium text-[#0B8C00] transition-colors hover:bg-[#F2F8F2]"
                                                >
                                                    Revisit
                                                </button>
                                                {onAddNewMember && (
                                                    <button
                                                        type="button"
                                                        onClick={onAddNewMember}
                                                        className="flex h-7 items-center justify-center gap-1 rounded-[32px] border border-[#0B8C00] bg-white px-4 text-sm font-medium text-[#0B8C00] transition-colors hover:bg-[#F2F8F2]"
                                                    >
                                                        <Image src="/icons/AddIcon.svg" alt="Add" width={16} height={16} />
                                                        Add New Member
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </TableData>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </Dialog>
    );
}


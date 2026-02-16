"use client";

import Image from "next/image";
import { Dialog, Table, TableHeader, TableBody, TableRow, TableHead, TableData, Tooltip } from "@/components/ui";
import type { ExistingPatient } from "@/store/api/gateApi";

interface PatientAlreadyExistsDialogProps {
    open: boolean;
    onClose: () => void;
    existingPatients: ExistingPatient[];
    onRevisit: (patient: ExistingPatient) => void;
    onAddNewMember: () => void;
    isUserLeadData?: boolean; // Flag to show "User Lead Data" instead of "Patient Already Exists"
    disableRevisit?: boolean; // Flag to disable the Revisit button
    revisitTooltipText?: string; // Tooltip text to show when Revisit button is disabled
}

export default function PatientAlreadyExistsDialog({
    open,
    onClose,
    existingPatients,
    onRevisit,
    onAddNewMember,
    isUserLeadData = false,
    disableRevisit = false,
    revisitTooltipText = "",
}: PatientAlreadyExistsDialogProps) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            title="Patient"
            width={1440}
        >
            <div className="space-y-6">
                <div className="flex items-center justify-center rounded-[8px] border border-[#0B8C00]/20 bg-[#0B8C00]/20 px-5 py-4">
                    <p className="text-[28px] font-medium leading-[120%] text-[#0B8C00]">
                        {isUserLeadData ? "User Lead Data" : "Patient Already Exists"}
                    </p>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow className="bg-white">
                            <TableHead position="first">Sr no.</TableHead>
                            <TableHead sortable>UHID</TableHead>
                            <TableHead sortable>Name</TableHead>
                            <TableHead sortable>Branch Name</TableHead>
                            <TableHead position="last">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {existingPatients.length === 0 ? (
                            <TableRow>
                                <TableData
                                    colSpan={5}
                                    className="py-12 text-center text-sm text-[#9CA3AF]"
                                >
                                    No patients found
                                </TableData>
                            </TableRow>
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
                                            {patient.patientName || patient.name || "-"}
                                            {patient.isPreBooking && (
                                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-[#0B8C00]/10 text-[#0B8C00] border border-[#0B8C00]/20">
                                                    Pre-Booking
                                                </span>
                                            )}
                                        </div>
                                    </TableData>
                                    <TableData>{patient.branchName || "N/A"}</TableData>
                                    <TableData>
                                        {isUserLeadData ? (
                                            // For userLead data, show only "Visit" button
                                            <button
                                                type="button"
                                                onClick={() => onRevisit(patient)}
                                                className="flex h-7 items-center justify-center rounded-[32px] border border-[#0B8C00] bg-white px-4 text-sm font-medium text-[#0B8C00] transition-colors hover:bg-[#F2F8F2]"
                                            >
                                                Visit
                                            </button>
                                        ) : (
                                            // For existing patients, show both buttons
                                            <div className="flex items-center gap-3">
                                                {disableRevisit ? (
                                                    // Disabled Revisit button with tooltip
                                                    <Tooltip
                                                        content={revisitTooltipText}
                                                        position="top"
                                                        maxWidth={800}
                                                        contentClassName="whitespace-normal"
                                                    >
                                                        <button
                                                            type="button"
                                                            disabled
                                                            className="flex h-7 items-center justify-center rounded-[32px] border border-[#0B8C00]/30 bg-white px-4 text-sm font-medium text-[#0B8C00]/50 transition-colors cursor-not-allowed"
                                                        >
                                                            Revisit
                                                        </button>
                                                    </Tooltip>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => onRevisit(patient)}
                                                        className="flex h-7 items-center justify-center rounded-[32px] border border-[#0B8C00] bg-white px-4 text-sm font-medium text-[#0B8C00] transition-colors hover:bg-[#F2F8F2]"
                                                    >
                                                        Revisit
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={onAddNewMember}
                                                    className="flex h-7 items-center justify-center gap-1 rounded-[32px] border border-[#0B8C00] bg-white px-4 text-sm font-medium text-[#0B8C00] transition-colors hover:bg-[#F2F8F2]"
                                                >
                                                    <Image src="/icons/AddIcon.svg" alt="Add" width={16} height={16} />
                                                    Add New Member
                                                </button>
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


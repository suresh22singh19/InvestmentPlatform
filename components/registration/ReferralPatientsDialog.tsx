"use client";

import { Dialog, Table, TableHeader, TableBody, TableRow, TableHead, TableData } from "@/components/ui";

export interface ReferralPatient {
    id: number;
    sUhid?: string | null;
    uhid: string;
    patientName: string;
    emailAddress?: string | null;
    createdAt: string;
}

interface ReferralPatientsDialogProps {
    open: boolean;
    onClose: () => void;
    referralPatients: ReferralPatient[];
    onSelect: (patient: ReferralPatient) => void;
    phoneNumber: string;
}

export default function ReferralPatientsDialog({
    open,
    onClose,
    referralPatients,
    onSelect,
    phoneNumber,
}: ReferralPatientsDialogProps) {
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
                        Referral patients
                    </p>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow className="bg-white">
                            <TableHead position="first">Sr no.</TableHead>
                            <TableHead sortable>UHID</TableHead>
                            <TableHead sortable>Name</TableHead>
                            <TableHead sortable>Phone Number</TableHead>
                            <TableHead position="last">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {referralPatients.length === 0 ? (
                            <TableRow>
                                <TableData
                                    colSpan={5}
                                    className="py-12 text-center text-sm text-[#9CA3AF]"
                                >
                                    No patients found
                                </TableData>
                            </TableRow>
                        ) : (
                            referralPatients.map((patient, index) => (
                                <TableRow
                                    key={patient.id}
                                    className="bg-white transition-colors hover:bg-[#F7FAF7]"
                                >
                                    <TableData variant="primary">{index + 1}</TableData>
                                    <TableData>{patient.uhid || "-"}</TableData>
                                    <TableData>{patient.patientName || "-"}</TableData>
                                    <TableData>{phoneNumber || "-"}</TableData>
                                    <TableData>
                                        <button
                                            type="button"
                                            onClick={() => onSelect(patient)}
                                            disabled={!patient.uhid || patient.uhid.trim() === ""}
                                            className={`flex h-7 items-center justify-center rounded-[32px] border border-[#0B8C00] px-4 text-sm font-medium transition-colors ${
                                                patient.uhid && patient.uhid.trim() !== ""
                                                    ? "bg-white text-[#0B8C00] hover:bg-[#F2F8F2] cursor-pointer"
                                                    : "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300"
                                            }`}
                                        >
                                            Select
                                        </button>
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

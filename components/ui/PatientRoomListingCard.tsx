"use client";

import { Table, TableBody, TableData, TableHead, TableHeader, TableRow } from "./Table";

export type PatientRoomListingItem = {
    building: string;
    floor: string;
    room: string;
    bedNo: string;
    nurse: string;
    attendantBedNo: string;
    remark: string;
    status: string;
    allotmentDate: string;
};

interface PatientRoomListingCardProps {
    patientName: string;
    uhid: string;
    registrationDate: string;
    items: PatientRoomListingItem[];
    isLoading?: boolean;
    error?: string | null;
}

const asDisplay = (value: string | null | undefined): string => {
    const normalized = (value ?? "").trim();
    return normalized.length > 0 ? normalized : "N/A";
};

export function PatientRoomListingCard({
    patientName,
    uhid,
    registrationDate,
    items,
    isLoading = false,
    error = null,
}: PatientRoomListingCardProps) {
    return (
        <div className="rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5">
            <div className="mb-3 flex items-center gap-2">
                <h2 className="font-inter font-medium text-base leading-[120%] text-[#262D3B]">
                    Registration Date: {asDisplay(registrationDate)}
                </h2>
            </div>

            <Table>
                <TableHeader>
                    <TableRow className="bg-white">
                        <TableHead position="first">Sr no.</TableHead>
                        <TableHead>Building</TableHead>
                        <TableHead>Floor</TableHead>
                        <TableHead>Room</TableHead>
                        <TableHead>Bed No.</TableHead>
                        <TableHead>Nurse</TableHead>
                        <TableHead>Attendent Bed No.</TableHead>
                        <TableHead>Remark</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead position="last">Allotment Date</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading || error || items.length === 0
                        ? null
                        : items.map((item, index) => (
                            <TableRow key={`patient-room-row-${index}`}>
                                <TableData>{String(index + 1)}</TableData>
                                <TableData>{asDisplay(item.building)}</TableData>
                                <TableData>{asDisplay(item.floor)}</TableData>
                                <TableData>{asDisplay(item.room)}</TableData>
                                <TableData>{asDisplay(item.bedNo)}</TableData>
                                <TableData>{asDisplay(item.nurse)}</TableData>
                                <TableData>{asDisplay(item.attendantBedNo)}</TableData>
                                <TableData>{asDisplay(item.remark)}</TableData>
                                <TableData>{asDisplay(item.status)}</TableData>
                                <TableData>{asDisplay(item.allotmentDate)}</TableData>
                            </TableRow>
                        ))}
                </TableBody>
            </Table>
            {isLoading ? (
                <p className="py-10 text-center text-sm font-normal leading-[120%] text-[#9FA2AB]">Loading room data...</p>
            ) : error ? (
                <p className="py-10 text-center text-sm font-normal leading-[120%] text-[#DC2626]">{error}</p>
            ) : items.length === 0 ? (
                <p className="py-10 text-center text-sm font-normal leading-[120%] text-[#9FA2AB]">No Data Available</p>
            ) : null}
        </div>
    );
}

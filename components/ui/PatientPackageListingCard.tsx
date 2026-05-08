"use client";

import { Table, TableBody, TableData, TableHead, TableHeader, TableRow } from "./Table";

export type PatientPackageListingItem = {
    packageName: string;
    doctor: string;
    startDate: string;
    endDate: string;
    remark: string;
    createdDate: string;
    status: string;
};

interface PatientPackageListingCardProps {
    patientName: string;
    uhid: string;
    registrationDate: string;
    items: PatientPackageListingItem[];
    isLoading?: boolean;
    error?: string | null;
}

const asDisplay = (value: string | null | undefined): string => {
    const normalized = (value ?? "").trim();
    return normalized.length > 0 ? normalized : "N/A";
};

export function PatientPackageListingCard({
    patientName,
    uhid,
    registrationDate,
    items,
    isLoading = false,
    error = null,
}: PatientPackageListingCardProps) {
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
                        <TableHead>Package</TableHead>
                        <TableHead>Doctor</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Remark</TableHead>
                        <TableHead>Created Date</TableHead>
                        <TableHead position="last">Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow>
                            <TableData colSpan={8} className="py-10 text-center text-sm text-[#6B7280]">
                                Loading package data...
                            </TableData>
                        </TableRow>
                    ) : error ? (
                        <TableRow>
                            <TableData colSpan={8} className="py-10 text-center text-sm text-[#DC2626]">
                                {error}
                            </TableData>
                        </TableRow>
                    ) : items.length === 0 ? (
                        <TableRow>
                            <TableData colSpan={8} className="py-10 text-center text-sm text-[#9FA2AB]">
                                No Data Available
                            </TableData>
                        </TableRow>
                    ) : (
                        items.map((item, index) => (
                            <TableRow key={`patient-package-row-${index}`}>
                                <TableData>{String(index + 1)}</TableData>
                                <TableData>{asDisplay(item.packageName)}</TableData>
                                <TableData>{asDisplay(item.doctor)}</TableData>
                                <TableData>{asDisplay(item.startDate)}</TableData>
                                <TableData>{asDisplay(item.endDate)}</TableData>
                                <TableData>{asDisplay(item.remark)}</TableData>
                                <TableData>{asDisplay(item.createdDate)}</TableData>
                                <TableData>{asDisplay(item.status)}</TableData>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

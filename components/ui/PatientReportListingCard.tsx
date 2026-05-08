"use client";

import Image from "next/image";
import { Table, TableBody, TableData, TableHead, TableHeader, TableRow } from "./Table";

export type PatientReportListingItem = {
    category: string;
    reportUrl: string;
    followUp: string;
    remark: string;
    date: string;
};

interface PatientReportListingCardProps {
    patientName: string;
    uhid: string;
    registrationDate: string;
    items: PatientReportListingItem[];
    isLoading?: boolean;
    error?: string | null;
}

const asDisplay = (value: string | null | undefined): string => {
    const normalized = (value ?? "").trim();
    return normalized.length > 0 ? normalized : "N/A";
};

export function PatientReportListingCard({
    patientName,
    uhid,
    registrationDate,
    items,
    isLoading = false,
    error = null,
}: PatientReportListingCardProps) {
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
                        <TableHead>Category</TableHead>
                        <TableHead>Report File</TableHead>
                        <TableHead>Follow Up</TableHead>
                        <TableHead>Remark</TableHead>
                        <TableHead position="last">Date</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow>
                            <TableData colSpan={6} className="py-10 text-center text-sm text-[#6B7280]">
                                Loading report data...
                            </TableData>
                        </TableRow>
                    ) : error ? (
                        <TableRow>
                            <TableData colSpan={6} className="py-10 text-center text-sm text-[#DC2626]">
                                {error}
                            </TableData>
                        </TableRow>
                    ) : (
                        items.map((item, index) => (
                            <TableRow key={`patient-report-row-${index}`}>
                                <TableData>{String(index + 1)}</TableData>
                                <TableData>{asDisplay(item.category)}</TableData>
                                <TableData>
                                    {item.reportUrl ? (
                                        <a href={item.reportUrl} target="_blank" rel="noopener noreferrer" className="inline-flex">
                                            <Image src="/icons/PdfIcon.svg" alt="PDF" width={18} height={18} />
                                        </a>
                                    ) : (
                                        "N/A"
                                    )}
                                </TableData>
                                <TableData>{asDisplay(item.followUp)}</TableData>
                                <TableData>{asDisplay(item.remark)}</TableData>
                                <TableData>{asDisplay(item.date)}</TableData>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
            {!isLoading && !error && items.length === 0 ? (
                <p className="py-10 text-center text-sm font-normal leading-[120%] text-[#9FA2AB]">No Data Available</p>
            ) : null}
        </div>
    );
}

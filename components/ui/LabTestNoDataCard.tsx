"use client";

import { Table, TableBody, TableData, TableHead, TableHeader, TableRow } from "./Table";

export function LabTestNoDataCard() {
    return (
        <div className="rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5">
            <Table>
                {/* <TableHeader>
                    <TableRow className="bg-white">
                        <TableHead position="first">Sr no.</TableHead>
                        <TableHead position="first">Name</TableHead>
                        <TableHead>Group</TableHead>
                        <TableHead>Sub Category</TableHead>
                        <TableHead position="last">Rate</TableHead>
                    </TableRow>
                </TableHeader> */}
                <TableBody>
                    <TableRow>
                        <TableData colSpan={4} className="h-auto min-h-[120px] border-b-0 py-12 align-middle text-center">
                            <p className="text-sm font-normal leading-[120%] text-[#9FA2AB]">No Data Avaible</p>
                        </TableData>
                    </TableRow>
                </TableBody>
            </Table>
        </div>
    );
}

"use client";

import Image from "next/image";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
    RefreshButton,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableData,
    TableSearchInput,
    Dialog,
    Button,
    FormInputField,
    FormSelectField,
    DatePicker,
} from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";

/** Placeholder camp list — wire to nurse camp API when available. */
const MOCK_CAMP_NURSES = [
    {
        branch: "Navi Mumbai",
        imgUrl: null as string | null,
        name: "Priya Sharma",
        email: "priya.sharma@jeenasikho.com",
        address: "Navi Mumbai",
        phone: "9876543210",
        empId: "NS10001",
        status: "Active",
    },
];

export default function NurseCampPage() {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    return (
        <AppShell>
            <div className="space-y-8">
                <div className="flex items-start justify-between">
                    <PageHeading title="Camp Nurse" />
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            className="flex h-11 items-center gap-2 rounded-[32px] border border-[#0B8C00] px-6 text-sm font-medium text-[#0B8C00] transition-colors hover:bg-[#F2F8F2]"
                            onClick={() => setOpen(true)}
                        >
                            <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} />
                            <span className="text-hide">Add New</span>
                        </button>
                        <RefreshButton onClick={() => {}} className="!bg-transparent" />
                    </div>
                </div>

                <ListBorder as="section" className="px-4 py-4">
                    <div className="w-full overflow-hidden rounded-[16px] border border-[#E3EEE1] bg-white px-5 pb-5 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
                        <div className="mb-6 flex justify-end">
                            <div className="w-[300px]">
                                <TableSearchInput
                                    value={searchTerm}
                                    onChange={setSearchTerm}
                                    placeholder="Search Here..."
                                />
                            </div>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-white">
                                    <TableHead position="first">Branch</TableHead>
                                    <TableHead>Img Url</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Address</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Emp ID</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead position="last">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {MOCK_CAMP_NURSES.map((row) => (
                                    <TableRow key={row.empId}>
                                        <TableData>{row.branch}</TableData>
                                        <TableData>—</TableData>
                                        <TableData>{row.name}</TableData>
                                        <TableData>{row.email}</TableData>
                                        <TableData>{row.address}</TableData>
                                        <TableData>{row.phone}</TableData>
                                        <TableData>{row.empId}</TableData>
                                        <TableData>{row.status}</TableData>
                                        <TableData>—</TableData>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </ListBorder>
            </div>

            <Dialog open={open} onClose={() => setOpen(false)} title="Add Camp Nurse" width={949}>
                <form noValidate className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <FormSelectField
                            label="Branch *"
                            value=""
                            options={[]}
                            placeholder="Select"
                            mode="single"
                            background="white"
                        />
                        <FormInputField label="Name *" value="" height={44} placeholder="Name" />
                        <FormInputField label="Email *" value="" height={44} placeholder="Email" />
                        <FormInputField label="Phone *" value="" height={44} placeholder="Phone" />
                        <FormInputField label="Emp ID *" value="" height={44} placeholder="Emp ID" />
                        <FormInputField label="Address *" value="" height={44} placeholder="Address" />
                        <DatePicker
                            label="Camp Date"
                            placeholder="Select date"
                            value=""
                            required={false}
                            background="white"
                            width="100%"
                        />
                        <FormSelectField
                            label="Status"
                            value=""
                            options={[]}
                            placeholder="Select"
                            mode="single"
                            background="white"
                        />
                    </div>
                    <div className="flex gap-3">
                        <Button type="button" variant="primary">
                            Save
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                    </div>
                </form>
            </Dialog>
        </AppShell>
    );
}

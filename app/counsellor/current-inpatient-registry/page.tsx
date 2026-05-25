"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
    TableSearchInput,
    TableListingCard,
    Button,
    Badge,
    Dialog,
    MessageDialog,
    FormSelectField,
    ExportButton,
} from "@/components/ui";
import { useDebounce } from "@/hooks/useDebounce";

// Mock data representing the inpatient registry matching mockup design
const STATIC_INPATIENT_REGISTRY = [
    {
        id: 1,
        patientName: "Ajay Kumar",
        patientUhid: "JSKL41712025",
        room: "Room 402",
        floor: "Floor 4",
        building: "West Wing",
        diagnosis: "Chronic Hypertension",
        attendingDoctor: "Dr Shiv Ram Singh",
        admissionDate: "12-01-2026",
        expDischarge: "12-01-2026",
        status: "Admitted",
    },
    {
        id: 2,
        patientName: "Rohit Singh",
        patientUhid: "JSKL41712025",
        room: "Room 403",
        floor: "Floor 4",
        building: "West Wing",
        diagnosis: "Post-Op Hip Replacement",
        attendingDoctor: "Dr. Aakash Dave",
        admissionDate: "12-01-2026",
        expDischarge: "12-01-2026",
        status: "Sch. Discharge",
    },
    {
        id: 3,
        patientName: "Ajeet Kumar",
        patientUhid: "JSKL41712025",
        room: "Room 404",
        floor: "Floor 4",
        building: "West Wing",
        diagnosis: "Acute Myocarditis",
        attendingDoctor: "Dr Heera Singh",
        admissionDate: "12-01-2026",
        expDischarge: "12-01-2026",
        status: "Admitted",
    },
    {
        id: 4,
        patientName: "Manish Soni",
        patientUhid: "JSKL41712025",
        room: "Room 405",
        floor: "Floor 4",
        building: "West Wing",
        diagnosis: "Post-Op Hip Replacement",
        attendingDoctor: "Dr Alok Ashok Tripathi",
        admissionDate: "12-01-2026",
        expDischarge: "12-01-2026",
        status: "Admitted",
    },
    {
        id: 5,
        patientName: "Pankaj Kumar",
        patientUhid: "JSKL41712026",
        room: "Room 406",
        floor: "Floor 3",
        building: "East Wing",
        diagnosis: "Cardiac Arrhythmia",
        attendingDoctor: "Dr Shiv Ram Singh",
        admissionDate: "13-01-2026",
        expDischarge: "15-01-2026",
        status: "Admitted",
    },
    {
        id: 6,
        patientName: "Aman Singh",
        patientUhid: "JSKL41712027",
        room: "Room 407",
        floor: "Floor 2",
        building: "West Wing",
        diagnosis: "Neonatal Jaundice",
        attendingDoctor: "Dr. Aakash Dave",
        admissionDate: "14-01-2026",
        expDischarge: "18-01-2026",
        status: "Sch. Discharge",
    },
];

export default function CurrentInpatientRegistryPage() {
    // Search and dynamic filtering states
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearch = useDebounce(searchTerm, 500);
    const [selectedDoctor, setSelectedDoctor] = useState("");
    const [selectedFloor, setSelectedFloor] = useState("");
    const [selectedBuilding, setSelectedBuilding] = useState("");

    // Pagination & Sorting states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(6);
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [sortBy, setSortBy] = useState<"patientName" | "">("patientName");

    // Interactive overlays states
    const [selectedPatient, setSelectedPatient] = useState<typeof STATIC_INPATIENT_REGISTRY[0] | null>(null);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Direct admission and export simulation
    const handleDirectAdmission = async () => {
        setIsLoading(true);
        await new Promise((resolve) => setTimeout(resolve, 800));
        setIsLoading(false);
        setSuccessMessage("Direct Admission flow initiated successfully!");
        setShowSuccessDialog(true);
    };

    const handleExportList = async () => {
        setIsLoading(true);
        await new Promise((resolve) => setTimeout(resolve, 800));
        setIsLoading(false);
        setSuccessMessage("Inpatient Registry list exported successfully!");
        setShowSuccessDialog(true);
    };

    const handleViewERStatus = () => {
        setSuccessMessage("ER Status Overview: 3 Active Critical Care Patients");
        setShowSuccessDialog(true);
    };

    // Client-side filtering & sorting logic
    const filteredAndSortedList = useMemo(() => {
        let result = [...STATIC_INPATIENT_REGISTRY];

        // Search text matching
        const query = debouncedSearch.trim().toLowerCase();
        if (query) {
            result = result.filter(
                (item) =>
                    item.patientName.toLowerCase().includes(query) ||
                    item.patientUhid.toLowerCase().includes(query) ||
                    item.room.toLowerCase().includes(query) ||
                    item.diagnosis.toLowerCase().includes(query)
            );
        }

        // Dropdown selection filters
        if (selectedDoctor) {
            result = result.filter((item) => item.attendingDoctor === selectedDoctor);
        }
        if (selectedFloor) {
            result = result.filter((item) => item.floor === selectedFloor);
        }
        if (selectedBuilding) {
            result = result.filter((item) => item.building === selectedBuilding);
        }

        // Sorting
        if (sortBy === "patientName") {
            result.sort((a, b) => {
                const nameA = a.patientName.toLowerCase();
                const nameB = b.patientName.toLowerCase();
                if (nameA < nameB) return sortOrder === "asc" ? -1 : 1;
                if (nameA > nameB) return sortOrder === "asc" ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [debouncedSearch, selectedDoctor, selectedFloor, selectedBuilding, sortBy, sortOrder]);

    const totalItems = filteredAndSortedList.length;

    const paginatedList = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredAndSortedList.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredAndSortedList, currentPage, itemsPerPage]);

    // Table Headers configuration
    const columns = [
        { label: "Sr no.", position: "first" as const },
        {
            label: "Patient Name",
            sortable: true,
            sortDirection: sortBy === "patientName" ? sortOrder : null,
            onSort: () => {
                setSortBy("patientName");
                setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                setCurrentPage(1);
            },
        },
        { label: "Patient UHID" },
        { label: "Room & Floor" },
        { label: "Diagnosis" },
        { label: "Attending Doctor" },
        { label: "Admission Date" },
        { label: "Exp. Discharge" },
        { label: "Status" },
        { label: "Action", position: "last" as const },
    ];

    // Table Rows mapped dynamically
    const rows = paginatedList.map((item, index) => {
        const sr = (currentPage - 1) * itemsPerPage + index + 1;

        const patientUhidLink = (
            <span
                onClick={() => setSelectedPatient(item)}
                className="text-[#0B8C00] font-medium cursor-pointer hover:underline"
            >
                {item.patientUhid}
            </span>
        );

        const roomAndFloorCol = (
            <div className="flex flex-col gap-0.5">
                <span className="font-bold text-[#262D3B] text-sm">{item.room}</span>
                <span className="text-[#787E8C] text-xs">
                    {item.floor} - {item.building}
                </span>
            </div>
        );

        const statusBadge = (
            <Badge
                variant={item.status === "Admitted" ? "success" : "neutral"}
                className={`bg-transparent font-normal ${item.status === "Admitted" ? "border-[#0B8C0033]" : ""
                    }`}
            >
                {item.status}
            </Badge>
        );

        const viewActionBtn = (
            <Button
                variant="primary"
                size="xsmall"
                onClick={() => setSelectedPatient(item)}
                className="!font-normal min-w-[70px]"
                width={80}
            >
                View
            </Button>
        );

        return [
            sr,
            item.patientName,
            patientUhidLink,
            roomAndFloorCol,
            item.diagnosis,
            item.attendingDoctor,
            item.admissionDate,
            item.expDischarge,
            statusBadge,
            viewActionBtn,
        ];
    });

    return (
        <AppShell>
            <div className="flex flex-col gap-6">
                {/* Page Header and Action Buttons */}
                <div className="flex items-center justify-between">
                    <PageHeading title="Current Inpatient Registry" />
                    <div className="flex items-center gap-3">
                        <ExportButton onExportPDF={handleExportList} isLoadingPDF={isLoading} />
                        <Button
                            variant="primary"
                            size="medium"
                            leftIcon={
                                <Image
                                    src="/icons/addPatient.svg"
                                    className="brightness-0 invert"
                                    alt=""
                                    width={16}
                                    height={16}
                                />
                            }
                            onClick={handleDirectAdmission}
                            isLoading={isLoading}
                        >
                            Direct Admission
                        </Button>
                    </div>
                </div>

                {/* Table Filter row inside TableListingCard */}
                <div className="mt-0">
                    <TableListingCard
                        sections={[
                            {
                                id: "inpatient-registry-table",
                                titleRightContent: (
                                    <div className="flex items-center gap-3 w-full justify-end flex-wrap md:flex-nowrap">
                                        {/* Attending Doctor dropdown selector */}
                                        <FormSelectField
                                            label=""
                                            hideLabel
                                            options={[
                                                { label: "Attending Doctor", value: "" },
                                                { label: "Dr Shiv Ram Singh", value: "Dr Shiv Ram Singh" },
                                                { label: "Dr. Aakash Dave", value: "Dr. Aakash Dave" },
                                                { label: "Dr Heera Singh", value: "Dr Heera Singh" },
                                                { label: "Dr Alok Ashok Tripathi", value: "Dr Alok Ashok Tripathi" },
                                            ]}
                                            placeholder="Attending Doctor"
                                            mode="single"
                                            background="normal"
                                            width={280}
                                            value={selectedDoctor}
                                            onChange={(val) => {
                                                const v = typeof val === "string" ? val : "";
                                                setSelectedDoctor(v);
                                                setCurrentPage(1);
                                            }}
                                        />

                                        {/* Floor dropdown selector */}
                                        <FormSelectField
                                            label=""
                                            hideLabel
                                            options={[
                                                { label: "Floor", value: "" },
                                                { label: "Floor 4", value: "Floor 4" },
                                                { label: "Floor 3", value: "Floor 3" },
                                                { label: "Floor 2", value: "Floor 2" },
                                            ]}
                                            placeholder="Floor"
                                            mode="single"
                                            background="normal"
                                            width={280}
                                            value={selectedFloor}
                                            onChange={(val) => {
                                                const v = typeof val === "string" ? val : "";
                                                setSelectedFloor(v);
                                                setCurrentPage(1);
                                            }}
                                        />

                                        {/* Building dropdown selector */}
                                        <FormSelectField
                                            label=""
                                            hideLabel
                                            options={[
                                                { label: "Building", value: "" },
                                                { label: "West Wing", value: "West Wing" },
                                                { label: "East Wing", value: "East Wing" },
                                            ]}
                                            placeholder="Building"
                                            mode="single"
                                            background="normal"
                                            width={280}
                                            value={selectedBuilding}
                                            onChange={(val) => {
                                                const v = typeof val === "string" ? val : "";
                                                setSelectedBuilding(v);
                                                setCurrentPage(1);
                                            }}
                                        />

                                        {/* Dynamic Search Box */}
                                        <div className="w-[280px]">
                                            <TableSearchInput
                                                value={searchTerm}
                                                onChange={(val) => {
                                                    setSearchTerm(val);
                                                    setCurrentPage(1);
                                                }}
                                                placeholder="Search Patient Name or ID..."
                                            />
                                        </div>
                                    </div>
                                ),
                                columns,
                                rows,
                                emptyMessage: "No inpatients match your search criteria",
                                pagination: {
                                    currentPage,
                                    totalItems,
                                    itemsPerPage,
                                    onPageChange: setCurrentPage,
                                    onItemsPerPageChange: (items: number) => {
                                        setItemsPerPage(items);
                                        setCurrentPage(1);
                                    },
                                    itemsPerPageOptions: [6, 12, 18, 30],
                                },
                            },
                        ]}
                    />
                </div>

                {/* Bottom 3-Card Grid matching mockup exactly */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
                    {/* Card 1: 84% Occupancy Capacity */}
                    <div className="rounded-[20px] p-5 bg-white border border-[#E3EEE1] flex flex-col justify-between transition-all duration-200 hover:shadow-md select-none h-full relative">
                        <div className="absolute top-5 right-5">
                            <Badge
                                variant="success"
                                className="bg-transparent border border-[#0B8C0033] text-[#0B8C00] font-normal px-2.5 py-0.5 rounded-full text-[10px]"
                            >
                                Normal
                            </Badge>
                        </div>

                        {/* Icon & Title */}
                        <div className="flex flex-col gap-4">
                            <div className="w-12 h-12 rounded-full bg-[#0B8C000D] border border-[#0B8C0026] flex items-center justify-center shrink-0">
                                <Image
                                    src="/icons/patientBed.svg"
                                    alt="Bed icon"
                                    width={24}
                                    height={24}
                                    className="object-contain"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <h4 className="font-extrabold text-[32px] leading-[120%] text-[#262D3B]">
                                    84% Capacity
                                </h4>
                                <p className="text-xs font-medium text-[#787E8C]">
                                    Current occupancy of admitted inpatients.
                                </p>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-1.5 w-full bg-[#F1F5F9] rounded-full overflow-hidden mt-6">
                            <div
                                className="h-full bg-[#0B8C00] rounded-full transition-all duration-500"
                                style={{ width: "84%" }}
                            />
                        </div>
                    </div>

                    {/* Card 2: 12 Discharges */}
                    <div className="rounded-[20px] p-5 bg-white border border-[#E3EEE1] flex flex-col justify-between transition-all duration-200 hover:shadow-md select-none h-full relative">
                        <div className="absolute top-5 right-5">
                            <Badge
                                variant="success"
                                className="bg-transparent border border-[#0B8C0033] text-[#0B8C00] font-normal px-2.5 py-0.5 rounded-full text-[10px]"
                            >
                                Normal
                            </Badge>
                        </div>

                        {/* Icon & Title */}
                        <div className="flex flex-col gap-4">
                            <div className="w-12 h-12 rounded-full bg-[#0B8C000D] border border-[#0B8C0026] flex items-center justify-center shrink-0">
                                <Image
                                    src="/icons/exitIcon.svg"
                                    alt="Exit icon"
                                    width={24}
                                    height={24}
                                    className="object-contain"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <h4 className="font-extrabold text-[32px] leading-[120%] text-[#262D3B]">
                                    12 Discharges
                                </h4>
                                <p className="text-xs font-medium text-[#787E8C]">
                                    Admitted patients scheduled for release today.
                                </p>
                            </div>
                        </div>

                        {/* Overlapping Initials Avatars */}
                        <div className="flex items-center -space-x-2.5 mt-6">
                            <div className="w-8 h-8 rounded-full border-2 border-white bg-[#E8F5E9] flex items-center justify-center font-extrabold text-xs text-[#0B8C00] select-none">
                                AK
                            </div>
                            <div className="w-8 h-8 rounded-full border-2 border-white bg-[#EFF6FF] flex items-center justify-center font-extrabold text-xs text-[#1D4ED8] select-none">
                                RS
                            </div>
                            <div className="w-8 h-8 rounded-full border-2 border-white bg-[#FFF7ED] flex items-center justify-center font-extrabold text-xs text-[#EA580C] select-none">
                                AS
                            </div>
                            <div className="w-8 h-8 rounded-full border-2 border-white bg-black flex items-center justify-center font-extrabold text-[10px] text-white select-none">
                                +9
                            </div>
                        </div>
                    </div>

                    {/* Card 3: Critical Care */}
                    <div className="rounded-[20px] p-5 bg-white border border-[#E3EEE1] flex flex-col justify-between transition-all duration-200 hover:shadow-md select-none h-full relative">
                        <div className="absolute top-5 right-5">
                            <Badge
                                variant="danger"
                                className="bg-transparent border border-[#EF444433] text-[#DC2626] font-normal px-2.5 py-0.5 rounded-full text-[10px]"
                            >
                                Alert
                            </Badge>
                        </div>

                        {/* Icon & Title */}
                        <div className="flex flex-col gap-4">
                            <div className="w-12 h-12 rounded-full bg-[#0B8C000D] border border-[#0B8C0026] flex items-center justify-center shrink-0">
                                <Image
                                    src="/icons/asteriskIcon.svg"
                                    alt="Asterisk icon"
                                    width={24}
                                    height={24}
                                    className="object-contain"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <h4 className="font-extrabold text-2xl leading-[120%] text-[#262D3B]">
                                    Critical Care
                                </h4>
                                <p className="text-xs font-medium text-[#787E8C]">
                                    3 admitted patients currently in critical care units.
                                </p>
                            </div>
                        </div>

                        {/* View ER Status Button */}
                        <div className="mt-6">
                            <Button
                                variant="primary"
                                size="medium"
                                fullWidth
                                leftIcon={
                                    <Image
                                        src="/icons/Eye.svg"
                                        className="brightness-0 invert"
                                        alt=""
                                        width={16}
                                        height={16}
                                    />
                                }
                                onClick={handleViewERStatus}
                            >
                                View ER Status
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Inpatient details information dialog overlay */}
            <Dialog
                open={!!selectedPatient}
                onClose={() => setSelectedPatient(null)}
                title="Inpatient Details"
                width={500}
                contentPadding="px-6 pb-6 pt-4"
            >
                {selectedPatient && (
                    <div className="flex flex-col text-left gap-4">
                        <div className="flex justify-between items-center border-b border-[#DFE0E2] pb-3">
                            <h3 className="font-extrabold text-lg text-[#262D3B]">
                                {selectedPatient.patientName}
                            </h3>
                            <Badge
                                variant={selectedPatient.status === "Admitted" ? "success" : "neutral"}
                                className={`bg-transparent font-normal ${selectedPatient.status === "Admitted" ? "border-[#0B8C0033]" : ""
                                    }`}
                            >
                                {selectedPatient.status}
                            </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-semibold text-[#787E8C] uppercase tracking-wider">
                                    Patient UHID
                                </span>
                                <span className="text-sm font-medium text-[#262D3B]">
                                    {selectedPatient.patientUhid}
                                </span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-semibold text-[#787E8C] uppercase tracking-wider">
                                    Attending Doctor
                                </span>
                                <span className="text-sm font-medium text-[#262D3B]">
                                    {selectedPatient.attendingDoctor}
                                </span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-semibold text-[#787E8C] uppercase tracking-wider">
                                    Room Allocation
                                </span>
                                <span className="text-sm font-medium text-[#262D3B]">
                                    {selectedPatient.room} ({selectedPatient.floor} - {selectedPatient.building})
                                </span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-semibold text-[#787E8C] uppercase tracking-wider">
                                    Diagnosis
                                </span>
                                <span className="text-sm font-medium text-[#262D3B]">
                                    {selectedPatient.diagnosis}
                                </span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-semibold text-[#787E8C] uppercase tracking-wider">
                                    Admission Date
                                </span>
                                <span className="text-sm font-medium text-[#262D3B]">
                                    {selectedPatient.admissionDate}
                                </span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-semibold text-[#787E8C] uppercase tracking-wider">
                                    Exp. Discharge
                                </span>
                                <span className="text-sm font-medium text-[#262D3B]">
                                    {selectedPatient.expDischarge}
                                </span>
                            </div>
                        </div>
                        {/* <div className="flex justify-end mt-4 border-t border-[#DFE0E2] pt-4">
                            <Button
                                variant="primary"
                                onClick={() => setSelectedPatient(null)}
                                className="min-w-[100px]"
                            >
                                Done
                            </Button>
                        </div> */}
                    </div>
                )}
            </Dialog>

            {/* Standard Success / Simulated execution feedback Dialog overlay */}
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
        </AppShell>
    );
}

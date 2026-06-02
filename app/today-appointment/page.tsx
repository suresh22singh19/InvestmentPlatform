"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
    TableSearchInput,
    TableListingCard,
    Button,
    RefreshButton,
} from "@/components/ui";

const MOCK_LISTING_DATA = [
    {
        sr: 1,
        patient: "Amit Sharma",
        uhid: "JSKL41712025",
        patientPer: "Regular",
        opdId: "OPD5001",
        doctor: "Dr Shiv Ram Singh",
        appDateTime: "01-Jun-2026 09:00 AM",
        gender: "Male",
        age: 35,
        contact: "9876543210",
        type: "OPD",
        city: "Delhi",
        state: "Delhi",
        createdAt: "01-Jun-2026 08:30 AM"
    },
    {
        sr: 2,
        patient: "Priya Verma",
        uhid: "JSKL41712025",
        patientPer: "New",
        opdId: "OPD5002",
        doctor: "Dr. Aakash Dave",
        appDateTime: "01-Jun-2026 09:00 AM",
        gender: "Female",
        age: 28,
        contact: "9876543211",
        type: "OPD",
        city: "Jaipur",
        state: "Rajasthan",
        createdAt: "01-Jun-2026 08:30 AM"
    },
    {
        sr: 3,
        patient: "Rohit Gupta",
        uhid: "JSKL41712025",
        patientPer: "Follow-up",
        opdId: "OPD5003",
        doctor: "Dr Heera Singh",
        appDateTime: "01-Jun-2026 09:00 AM",
        gender: "Male",
        age: 42,
        contact: "9876543212",
        type: "OPD",
        city: "Lucknow",
        state: "Uttar Pradesh",
        createdAt: "01-Jun-2026 08:30 AM"
    },
    {
        sr: 4,
        patient: "Sunita Devi",
        uhid: "JSKL41712025",
        patientPer: "Regular",
        opdId: "OPD5004",
        doctor: "Dr. Neha Singh",
        appDateTime: "01-Jun-2026 09:00 AM",
        gender: "Female",
        age: 51,
        contact: "9876543213",
        type: "OPD",
        city: "Chandigarh",
        state: "Chandigarh",
        createdAt: "01-Jun-2026 08:30 AM"
    },
    {
        sr: 5,
        patient: "Ankit Jain",
        uhid: "JSKL41712025",
        patientPer: "New",
        opdId: "OPD5005",
        doctor: "Dr. Rajesh Kumar",
        appDateTime: "01-Jun-2026 09:00 AM",
        gender: "Male",
        age: 31,
        contact: "9876543214",
        type: "OPD",
        city: "Indore",
        state: "Madhya Pradesh",
        createdAt: "01-Jun-2026 08:30 AM"
    },
    {
        sr: 6,
        patient: "Pooja Mishra",
        uhid: "JSKL41712025",
        patientPer: "Follow-up",
        opdId: "OPD5006",
        doctor: "Dr Kadambaree",
        appDateTime: "01-Jun-2026 09:00 AM",
        gender: "Female",
        age: 39,
        contact: "9876543215",
        type: "OPD",
        city: "Patna",
        state: "Bihar",
        createdAt: "01-Jun-2026 08:30 AM"
    }
];

export default function DoctorListingPage() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(6);

    const filteredData = MOCK_LISTING_DATA.filter((item) =>
        item.patient.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.uhid.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.doctor.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const columns = [
        { label: "Sr no.", position: "first" as const },
        { label: "Patient" },
        { label: "UHID" },
        { label: "Patient Per." },
        { label: "OPD ID" },
        { label: "Doctor" },
        { label: "App Date/Time" },
        { label: "Gender" },
        { label: "Age" },
        { label: "Contact" },
        { label: "Type" },
        { label: "City" },
        { label: "State" },
        { label: "Created At" },
        { label: "Action", position: "last" as const }
    ];

    const rows = filteredData.map((item) => {
        const uhid = (
            <span className="text-[#0B8C00] font-medium cursor-pointer hover:underline" onClick={() => router.push("/today-appointment/new")}>
                {item.uhid}
            </span>
        );

        const actions = (
            <div className="flex items-center gap-2">
                <Button
                    variant="primary"
                    size="xsmall"
                    className="whitespace-nowrap"
                    onClick={() => router.push("/today-appointment/new")}
                >
                    View Patient
                </Button>
                <Button
                    variant="outline"
                    size="xsmall"
                    className="whitespace-nowrap"
                    onClick={() => alert(`Start Consultation for ${item.patient}`)}
                >
                    Start Consultation
                </Button>
            </div>
        );

        return [
            item.sr,
            item.patient,
            uhid,
            item.patientPer,
            item.opdId,
            item.doctor,
            item.appDateTime,
            item.gender,
            item.age,
            item.contact,
            item.type,
            item.city,
            item.state,
            item.createdAt,
            actions
        ];
    });

    return (
        <AppShell>
            <div className="flex flex-col gap-6">
                {/* Page Heading */}
                <div className="flex items-start justify-between">
                    <PageHeading title="Today Appointment" />
                </div>

                {/* Table Listing Card */}
                <div className="w-full rounded-[20px] border border-[#E3EEE1] p-2">
                    <TableListingCard
                        sections={[
                            {
                                id: "doctor-patients-list",
                                title: "",
                                titleRightContent: (
                                    <div className="flex items-center gap-3">
                                        <div style={{ width: "300px" }}>
                                            <TableSearchInput
                                                value={searchTerm}
                                                onChange={setSearchTerm}
                                                placeholder="Search Here..."
                                            />
                                        </div>
                                        <RefreshButton onClick={() => alert("Refreshed listing data!")} />
                                    </div>
                                ),
                                columns,
                                rows,
                                isLoading: false,
                                isError: false,
                                errorMessage: "Facing server API error",
                                emptyMessage: "No appointments found",
                                pagination: {
                                    currentPage,
                                    totalItems: 1000,
                                    itemsPerPage,
                                    onPageChange: setCurrentPage,
                                    onItemsPerPageChange: (items: number) => {
                                        setItemsPerPage(items);
                                        setCurrentPage(1);
                                    },
                                    itemsPerPageOptions: [10, 20, 50, 100],
                                },
                            },
                        ]}
                    />
                </div>
            </div>
        </AppShell>
    );
}

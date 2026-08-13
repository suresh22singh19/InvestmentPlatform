"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { TableSearchInput, Button, TableListingCard, type TableListingSection } from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import CounselorCalendarPage from "./Schedule&Resources";

const MOCK_PATIENTS = [
    {
        id: 1,
        name: "Aditi Rao",
        age: 34,
        gender: "Female",
        uhid: "AS-9921-0812",
        therapyName: "Chronic Back Pain (Pitta)",
    },
    {
        id: 2,
        name: "Rajesh Kumar",
        age: 52,
        gender: "Male",
        uhid: "AS-9921-0812",
        therapyName: "Arthritis Management (Kapha)",
    },
    {
        id: 3,
        name: "Meera Joshi",
        age: 29,
        gender: "Female",
        uhid: "AS-9921-0812",
        therapyName: "Post-Viral Fatigue (Vata)",
    },
    {
        id: 4,
        name: "Vikram Singh",
        age: 45,
        gender: "Male",
        uhid: "AS-9921-0812",
        therapyName: "Hypertension Routine",
    },
    {
        id: 5,
        name: "Aditi Rao",
        age: 34,
        gender: "Female",
        uhid: "AS-9921-0812",
        therapyName: "Chronic Back Pain (Pitta)",
    },
    {
        id: 6,
        name: "Rajesh Kumar",
        age: 52,
        gender: "Male",
        uhid: "AS-9921-0812",
        therapyName: "Arthritis Management (Kapha)",
    },
    {
        id: 7,
        name: "Meera Joshi",
        age: 29,
        gender: "Female",
        uhid: "AS-9921-0812",
        therapyName: "Post-Viral Fatigue (Vata)",
    },
    {
        id: 8,
        name: "Vikram Singh",
        age: 45,
        gender: "Male",
        uhid: "AS-9921-0812",
        therapyName: "Hypertension Routine",
    }
];

function getTherapyIcon(therapyName: string) {
    const lower = therapyName.toLowerCase();
    if (lower.includes("pitta") || lower.includes("back pain")) {
        return (
            <Image
                src="/icons/TherapyIcon.svg"
                alt="Pitta"
                width={20}
                height={20}
                className="shrink-0"
            />
        );
    }
    if (lower.includes("kapha") || lower.includes("arthritis")) {
        return (
            <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="shrink-0"
            >
                <path
                    d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"
                    stroke="#434956"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        );
    }
    if (lower.includes("vata") || lower.includes("fatigue")) {
        return (
            <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="shrink-0"
            >
                <path
                    d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"
                    stroke="#434956"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        );
    }
    return (
        <Image
            src="/icons/VitalsIcon.svg"
            alt="Pulse"
            width={20}
            height={20}
            className="shrink-0"
        />
    );
}

interface PatientCardProps {
    name: string;
    age: number;
    gender: string;
    uhid: string;
    therapyName: string;
    onSelect: () => void;
}

function PatientCard({ name, age, gender, uhid, therapyName, onSelect }: PatientCardProps) {
    return (
        <div className="flex flex-col gap-4 rounded-[20px] border border-[#DFE0E2] bg-white p-5 shadow-[0px_6px_40px_rgba(34,56,43,0.02)] transition-all duration-200 hover:shadow-[0px_20px_40px_rgba(34,56,43,0.08)] hover:border-[#0B8C00]/30 select-none">
            {/* Top Row: Profile photo & patient info */}
            <div className="flex items-center gap-4 h-[70px] w-full">
                {/* Green Profile Icon Wrapper */}
                <div className="w-[70px] h-[70px] bg-[#F4F9F4] rounded-[16px] flex items-center justify-center shrink-0">
                    <Image
                        src="/icons/ProfileGreenIcon.svg"
                        alt="Profile"
                        width={32}
                        height={32}
                        className="shrink-0"
                    />
                </div>

                {/* Patient details */}
                <div className="flex flex-col gap-1 min-w-0">
                    <h3 className="font-inter font-semibold text-[24px] leading-[120%] text-[#0B8C00] truncate">
                        {name}
                    </h3>
                    <p className="font-inter font-medium text-[14px] leading-[120%] text-[#434956]">
                        {age} Years • {gender} • {uhid}
                    </p>
                </div>
            </div>

            {/* Second Row: Therapy information */}
            <div className="flex items-center gap-2 h-6">
                {getTherapyIcon(therapyName)}
                <span className="font-inter font-semibold text-[16px] leading-[120%] text-[#262D3B]">
                    {therapyName}
                </span>
            </div>

            {/* Third Row: Action button */}
            <Button
                variant="outline"
                size="large"
                fullWidth
                onClick={onSelect}
                className="!rounded-full !border-[#0B8C00] !text-[#0B8C00] hover:!bg-[#0B8C00]/10"
            >
                Select
            </Button>
        </div>
    );
}

export default function SelectPatientPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    const [selectedPatient, setSelectedPatient] = useState<any | null>(null);

    // Filter patients based on search
    const filteredPatients = useMemo(() => {
        const query = searchTerm.toLowerCase().trim();
        if (!query) return MOCK_PATIENTS;
        return MOCK_PATIENTS.filter(
            (p) =>
                p.name.toLowerCase().includes(query) ||
                p.uhid.toLowerCase().includes(query) ||
                p.therapyName.toLowerCase().includes(query)
        );
    }, [searchTerm]);

    // Paginate patients
    const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
    const paginatedPatients = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredPatients.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredPatients, currentPage]);

    const handleSelect = (patient: any) => {
        setSelectedPatient(patient);
    };

    const sections: TableListingSection[] = useMemo(() => [
        {
            id: "recent-patients-section",
            title: "Recent Patients",
            titleRightContent: (
                <div className="w-full sm:w-[320px] md:w-[400px]">
                    <TableSearchInput
                        value={searchTerm}
                        onChange={(val) => {
                            setSearchTerm(val);
                            setCurrentPage(1);
                        }}
                        placeholder="Search by patient name"
                        className="w-full"
                    />
                </div>
            ),
            customContent: paginatedPatients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-[#525763] text-sm">
                    No patients found matching your search.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    {paginatedPatients.map((patient, index) => (
                        <PatientCard
                            key={`${patient.id}-${index}`}
                            name={patient.name}
                            age={patient.age}
                            gender={patient.gender}
                            uhid={patient.uhid}
                            therapyName={patient.therapyName}
                            onSelect={() => handleSelect(patient)}
                        />
                    ))}
                </div>
            ),
            pagination: {
                currentPage,
                totalItems: filteredPatients.length,
                itemsPerPage,
                onPageChange: setCurrentPage,
                onItemsPerPageChange: () => { },
                itemsPerPageOptions: [6],
            },
        }
    ], [searchTerm, currentPage, filteredPatients, paginatedPatients]);

    if (selectedPatient) {
        return (
            <CounselorCalendarPage
                patient={selectedPatient}
                onBack={() => setSelectedPatient(null)}
            />
        );
    }

    return (
        <AppShell>
            <div className="w-full space-y-6">
                {/* Page Heading */}
                <div className="flex items-center justify-between">
                    <PageHeading title="Book New Session - Select Patient" />
                </div>
                <ListBorder as="section" className="px-4 py-4">


                    {/* Main Content Area */}
                    <TableListingCard sections={sections} />
                </ListBorder>
            </div>
        </AppShell>
    );
}

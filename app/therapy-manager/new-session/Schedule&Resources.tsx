"use client";

import SharedCounselorCalendarPage from "@/components/therapy-manager/Schedule&Resources";

const PACKAGE_ITEMS = [
    { label: "Package Name", value: "Cardiac Premium Care" },
    { label: "Start Date", value: "14 July 2026" },
    { label: "End Date", value: "24 July 2026" }
];

const THERAPY_OPTIONS = [
    { id: "t1", name: "Kashayavasthi (Niroohavasthi) Different varieties" },
    { id: "t2", name: "ShashtikapindaSweda / Navarakkizhi-Ekangam / Sthanikam" },
    { id: "t3", name: "ShashtikapindaSweda Full Body" }
];

const THERAPIST_OPTIONS = [
    { id: "th1", name: "Prachi Arora", subtitle: "Senior Therapist" },
    { id: "th2", name: "Rohit Singh", subtitle: "Associate Therapist" },
    { id: "th3", name: "Pankaj Kumar", subtitle: "Junior Therapist" }
];

const ALTERNATE_THERAPIST_OPTIONS = [
    { id: "ath1", name: "Neelam Rani", subtitle: "Senior Therapist" },
    { id: "ath2", name: "Anjali Sharma", subtitle: "Associate Therapist" },
    { id: "ath3", name: "Ajeet Kumar", subtitle: "Junior Therapist" }
];

const ROOM_OPTIONS = [
    { id: "r1", name: "Lotus Room 1", subtitle: "Equipped for Abhyanga" },
    { id: "r2", name: "Lotus Room 2", subtitle: "Occupied", status: "occupied" },
    { id: "r3", name: "Sandalwood 4", subtitle: "Standard Room" },
    { id: "r4", name: "Vata Suite 1", subtitle: "Premium Service" }
];

interface CounselorCalendarPageProps {
    patient?: any;
    onBack?: () => void;
}

export default function CounselorCalendarPage({ patient, onBack }: CounselorCalendarPageProps) {
    return (
        <SharedCounselorCalendarPage
            patient={patient}
            onBack={onBack}
            mode="add"
            packageItems={PACKAGE_ITEMS}
            therapyOptions={THERAPY_OPTIONS}
            therapistOptions={THERAPIST_OPTIONS}
            alternateTherapistOptions={ALTERNATE_THERAPIST_OPTIONS}
            roomOptions={ROOM_OPTIONS}
        />
    );
}

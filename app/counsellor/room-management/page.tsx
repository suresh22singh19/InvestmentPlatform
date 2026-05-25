"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
    Button,
    Badge,
    Dialog,
    MessageDialog,
    FormInputField,
    FormSelectField,
    Tabs,
} from "@/components/ui";

// Static mock data representing room ground floor status
const STATIC_ROOMS_DATA: Record<string, Record<string, {
    superDeluxe: any[];
    ward1: any[];
    deluxe: any[];
}>> = {
    "Building A": {
        "Ground Floor": {
            superDeluxe: [
                { id: 1, roomNo: "ROOM 201", type: "Super Deluxe", status: "Occupied", patient: "Ajay Saini", admissionDate: "12-01-2026" },
                { id: 2, roomNo: "ROOM 202", type: "Super Deluxe", status: "Available", cleaning: "Ready for Cleaning" },
                { id: 3, roomNo: "ROOM 203", type: "Super Deluxe", status: "Available", cleaning: "Ready for Cleaning" },
                { id: 4, roomNo: "ROOM 204", type: "Super Deluxe", status: "Occupied", patient: "Prachi Arora", admissionDate: "12-01-2026" },
            ],
            ward1: [
                { id: 1, bedNo: "BED W1-01", status: "Occupied", patient: "Rohit Singh", gender: "Male", age: 45 },
                { id: 2, bedNo: "BED W1-02", status: "Occupied", patient: "Ritika", gender: "Female", age: 39 },
                { id: 3, bedNo: "BED W1-03", status: "Available" },
                { id: 4, bedNo: "BED W1-04", status: "Available" },
            ],
            deluxe: [
                { id: 1, roomNo: "ROOM 201", type: "IPD Deluxe Room", status: "Occupied", patient: "Sarah Jenkins", admissionDate: "12-01-2026" },
                { id: 2, roomNo: "ROOM 202", type: "IPD Deluxe Room", status: "Available", cleaning: "Ready for Cleaning" },
                { id: 3, roomNo: "ROOM 203", type: "IPD Deluxe Room", status: "Available", cleaning: "Ready for Cleaning" },
                { id: 4, roomNo: "ROOM 212", type: "Deluxe Single", status: "Maintenance", notes: "AC servicing and painting" },
            ]
        },
        "1st Floor (General)": {
            superDeluxe: [
                { id: 1, roomNo: "ROOM 301", type: "Super Deluxe", status: "Available", cleaning: "Ready for Cleaning" },
                { id: 2, roomNo: "ROOM 302", type: "Super Deluxe", status: "Occupied", patient: "Vijay Sharma", admissionDate: "14-01-2026" },
                { id: 3, roomNo: "ROOM 303", type: "Super Deluxe", status: "Occupied", patient: "Sanjay Dutt", admissionDate: "15-01-2026" },
                { id: 4, roomNo: "ROOM 304", type: "Super Deluxe", status: "Available", cleaning: "Ready for Cleaning" },
            ],
            ward1: [
                { id: 1, bedNo: "BED W2-01", status: "Available" },
                { id: 2, bedNo: "BED W2-02", status: "Occupied", patient: "Devendra", gender: "Male", age: 52 },
                { id: 3, bedNo: "BED W2-03", status: "Occupied", patient: "Sumitra", gender: "Female", age: 61 },
                { id: 4, bedNo: "BED W2-04", status: "Available" },
            ],
            deluxe: [
                { id: 1, roomNo: "ROOM 301", type: "IPD Deluxe Room", status: "Available", cleaning: "Ready for Cleaning" },
                { id: 2, roomNo: "ROOM 302", type: "IPD Deluxe Room", status: "Occupied", patient: "Aaradhya", admissionDate: "16-01-2026" },
                { id: 3, roomNo: "ROOM 303", type: "IPD Deluxe Room", status: "Maintenance", notes: "Plumbing repair" },
                { id: 4, roomNo: "ROOM 312", type: "Deluxe Single", status: "Available", cleaning: "Ready for Cleaning" },
            ]
        }
    }
};

// Fallback dynamic generator to ensure Building B / Building C / other floors work perfectly
const getRoomsData = (building: string, floor: string) => {
    if (STATIC_ROOMS_DATA[building] && STATIC_ROOMS_DATA[building][floor]) {
        return STATIC_ROOMS_DATA[building][floor];
    }

    const isB = building === "Building B";
    const isC = building === "Building C";
    const prefix = floor.split(" ")[0] || "1st";

    return {
        superDeluxe: [
            { id: 1, roomNo: `ROOM ${isB ? 4 : isC ? 5 : 2}01`, type: "Super Deluxe", status: "Available", cleaning: "Ready for Cleaning" },
            { id: 2, roomNo: `ROOM ${isB ? 4 : isC ? 5 : 2}02`, type: "Super Deluxe", status: "Occupied", patient: `${building} ${prefix} Patient 1`, admissionDate: "18-01-2026" },
            { id: 3, roomNo: `ROOM ${isB ? 4 : isC ? 5 : 2}03`, type: "Super Deluxe", status: "Occupied", patient: `${building} ${prefix} Patient 2`, admissionDate: "19-01-2026" },
            { id: 4, roomNo: `ROOM ${isB ? 4 : isC ? 5 : 2}04`, type: "Super Deluxe", status: "Available", cleaning: "Ready for Cleaning" },
        ],
        ward1: [
            { id: 1, bedNo: `BED W-${isB ? "B" : "C"}1`, status: "Occupied", patient: "Karan Johar", gender: "Male", age: 48 },
            { id: 2, bedNo: `BED W-${isB ? "B" : "C"}2`, status: "Available" },
            { id: 3, bedNo: `BED W-${isB ? "B" : "C"}3`, status: "Available" },
            { id: 4, bedNo: `BED W-${isB ? "B" : "C"}4`, status: "Occupied", patient: "Alia Bhatt", gender: "Female", age: 31 },
        ],
        deluxe: [
            { id: 1, roomNo: `ROOM ${isB ? 4 : isC ? 5 : 2}10`, type: "IPD Deluxe Room", status: "Occupied", patient: "Ranbir Kapoor", admissionDate: "20-01-2026" },
            { id: 2, roomNo: `ROOM ${isB ? 4 : isC ? 5 : 2}11`, type: "IPD Deluxe Room", status: "Available", cleaning: "Ready for Cleaning" },
            { id: 3, roomNo: `ROOM ${isB ? 4 : isC ? 5 : 2}12`, type: "IPD Deluxe Room", status: "Available", cleaning: "Ready for Cleaning" },
            { id: 4, roomNo: `ROOM ${isB ? 4 : isC ? 5 : 2}20`, type: "Deluxe Single", status: "Maintenance", notes: "Floor deep cleaning" },
        ]
    };
};

// Green bed SVG icon for available ward beds
const GreenBedIcon = () => (
    <div className="flex items-center justify-center py-2 select-none">
        <Image
            src="/icons/bedDarkIcon.svg"
            alt="Patient Bed"
            width={45}
            height={42}
            className="object-contain"
        />
    </div>
);

type AllocationCardProps = {
    item: any;
    onAssignPatient: (item: any) => void;
    onViewPatientInfo: (item: any) => void;
    onViewMaintenanceDetails?: (item: any) => void;
    onShowVitals?: (patientName: string) => void;
};

const AllocationCard = ({
    item,
    onAssignPatient,
    onViewPatientInfo,
    onViewMaintenanceDetails,
    onShowVitals,
}: AllocationCardProps) => {
    const isBed = !!item.bedNo;
    const isOccupied = item.status === "Occupied";
    const isMaintenance = item.status === "Maintenance";
    const isAvailable = item.status === "Available";

    // Determine badge variant
    let badgeVariant: "success" | "neutral" | "warning" = "neutral";
    let badgeClass = "border-[#CBD5E1] text-[#64748B]";
    if (isAvailable) {
        badgeVariant = "success";
        badgeClass = "border-[#0B8C0033] text-[#0B8C00]";
    } else if (isMaintenance) {
        badgeVariant = "warning";
        badgeClass = "border-[#EA580C33] text-[#EA580C]";
    }

    return (
        <div className="border border-[#E2E8F0] rounded-[20px] bg-white flex flex-col justify-between hover:shadow-md transition-all duration-200 overflow-hidden">
            {/* Header: Circle numbering + Info + Badge */}
            <div className="p-5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#0B8C000D] border border-[#E2E8F0] flex items-center justify-center font-normal text-[#94A3B8] text-xs">
                        {item.id}
                    </div>
                    {isBed ? (
                        <span className="font-semibold text-[#262D3B] text-sm leading-none">{item.bedNo}</span>
                    ) : (
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[#787E8C] text-[10px] font-bold uppercase tracking-wider">{item.roomNo}</span>
                            <span className="font-semibold text-[#262D3B] text-sm leading-tight">{item.type}</span>
                        </div>
                    )}
                </div>
                <Badge
                    variant={badgeVariant}
                    className={`bg-transparent font-normal border ${badgeClass}`}
                >
                    {item.status}
                </Badge>
            </div>

            {/* Divider line 1 */}
            <div className="border-t border-[#E2E8F0]" />

            {/* Middle Section */}
            <div className={`px-5 py-[22px] flex flex-col justify-center text-left ${isBed ? "min-h-[88px]" : "min-h-[76px]"}`}>
                {isOccupied ? (
                    isBed ? (
                        <div className="grid grid-cols-2 gap-x-2 gap-y-3 text-left">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-semibold text-[#787E8C] uppercase tracking-wider">Patient</span>
                                <span className="text-sm font-semibold text-[#262D3B] truncate">{item.patient}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-semibold text-[#787E8C] uppercase tracking-wider">Gender</span>
                                <span className="text-sm font-semibold text-[#262D3B]">{item.gender}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-semibold text-[#787E8C] uppercase tracking-wider">Age</span>
                                <span className="text-sm font-semibold text-[#262D3B]">{item.age}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2 text-left">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-semibold text-[#787E8C] uppercase tracking-wider">Patient</span>
                                <span className="text-sm font-semibold text-[#262D3B] truncate">{item.patient}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-semibold text-[#787E8C] uppercase tracking-wider">Admission Date</span>
                                <span className="text-sm font-semibold text-[#262D3B]">{item.admissionDate}</span>
                            </div>
                        </div>
                    )
                ) : isMaintenance ? (
                    <div className="flex flex-col text-left gap-0.5">
                        <span className="text-[10px] font-semibold text-[#787E8C] uppercase tracking-wider">Status</span>
                        <span className="text-sm font-semibold text-[#EA580C]">Maintenance</span>
                    </div>
                ) : isBed ? (
                    <GreenBedIcon />
                ) : (
                    <div className="flex flex-col text-left gap-0.5">
                        <span className="text-[10px] font-semibold text-[#787E8C] uppercase tracking-wider">Cleaning</span>
                        <span className="text-sm font-semibold text-[#262D3B]">{item.cleaning}</span>
                    </div>
                )}
            </div>

            {/* Divider line 2 */}
            <div className="border-t border-[#E2E8F0]" />

            {/* Actions Footer */}
            <div className="p-5">
                {isOccupied ? (
                    isBed ? (
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                variant="primary"
                                size="medium"
                                fullWidth
                                className="!font-semibold text-xs rounded-full"
                                onClick={() => onViewPatientInfo({
                                    name: item.patient,
                                    roomNo: item.bedNo,
                                    type: "General Bed",
                                    uhid: "JSKL41712025",
                                    admissionDate: "12-01-2026",
                                    attendingDoctor: "Dr. Aakash Dave",
                                    diagnosis: "Recovery Care",
                                    vitals: { bp: "115/75 mmHg", hr: "68 bpm", temp: "98.4 °F", spo2: "98%" }
                                })}
                            >
                                Chart
                            </Button>
                            <Button
                                variant="primary"
                                size="medium"
                                fullWidth
                                className="!font-semibold text-xs rounded-full"
                                onClick={() => onShowVitals && onShowVitals(item.patient)}
                            >
                                Vitals
                            </Button>
                        </div>
                    ) : (
                        <Button
                            variant="primary"
                            size="medium"
                            fullWidth
                            className="!font-semibold text-xs rounded-full"
                            onClick={() => onViewPatientInfo({
                                name: item.patient,
                                roomNo: item.roomNo,
                                type: item.type,
                                uhid: "JSKL41712025",
                                admissionDate: item.admissionDate,
                                attendingDoctor: item.type === "Super Deluxe" ? "Dr Shiv Ram Singh" : "Dr Heera Singh",
                                diagnosis: item.type === "Super Deluxe" ? "Chronic Hypertension" : "Cardiology Monitoring",
                                vitals: item.type === "Super Deluxe"
                                    ? { bp: "120/80 mmHg", hr: "72 bpm", temp: "98.6 °F", spo2: "99%" }
                                    : { bp: "125/82 mmHg", hr: "74 bpm", temp: "98.7 °F", spo2: "99%" }
                            })}
                        >
                            View Patient Info
                        </Button>
                    )
                ) : isMaintenance ? (
                    <Button
                        variant="outline"
                        size="medium"
                        fullWidth
                        className="border-[#0B8C00] text-[#0B8C00] hover:bg-[#0B8C0008] text-xs !font-semibold rounded-full"
                        onClick={() => onViewMaintenanceDetails && onViewMaintenanceDetails({
                            roomNo: item.roomNo,
                            type: item.type,
                            issue: item.notes || "AC servicing & painting",
                            startDate: "22-05-2026",
                            estCompletion: "24-05-2026"
                        })}
                    >
                        Details
                    </Button>
                ) : (
                    <Button
                        variant="primary"
                        size="medium"
                        fullWidth
                        className="!font-semibold text-xs rounded-full bg-[#0B8C00] hover:bg-[#097300]"
                        onClick={() => onAssignPatient(
                            isBed
                                ? { bedNo: item.bedNo, type: "General Ward Bed" }
                                : { roomNo: item.roomNo, type: item.type }
                        )}
                    >
                        Assign Patient
                    </Button>
                )}
            </div>
        </div>
    );
};

const buildingOptions = [
    { value: "Building A", label: "Building A" },
    { value: "Building B", label: "Building B" },
    { value: "Building C", label: "Building C" },
];

const floorOptions = [
    { value: "Ground Floor", label: "Ground Floor" },
    { value: "1st Floor (General)", label: "1st Floor (General)" },
    { value: "2nd Floor (IPD)", label: "2nd Floor (IPD)" },
    { value: "3rd Floor (Surgery)", label: "3rd Floor (Surgery)" },
    { value: "4th Floor (ICU)", label: "4th Floor (ICU)" },
];

export default function RoomManagementPage() {
    // Nav Filters
    const [selectedBuilding, setSelectedBuilding] = useState("Building A");
    const [selectedFloor, setSelectedFloor] = useState("Ground Floor");

    // Dynamic state logic
    const roomsData = useMemo(() => {
        return getRoomsData(selectedBuilding, selectedFloor);
    }, [selectedBuilding, selectedFloor]);

    // UI Interactive overlays
    const [selectedPatientInfo, setSelectedPatientInfo] = useState<any | null>(null);
    const [selectedAssignRoom, setSelectedAssignRoom] = useState<any | null>(null);
    const [selectedMaintenanceDetails, setSelectedMaintenanceDetails] = useState<any | null>(null);
    const [showPricingModal, setShowPricingModal] = useState(false);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form inputs state for Assign Patient
    const [assignForm, setAssignForm] = useState({
        patientName: "",
        patientUhid: "",
        gender: "Male",
        age: "",
        attendingDoctor: "",
        diagnosis: "",
        admissionDate: "12-01-2026",
    });

    const handleAssignSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!assignForm.patientName || !assignForm.patientUhid) {
            alert("Please fill in the Patient Name and UHID Number.");
            return;
        }

        setIsSubmitting(true);
        // Simulated loading spinner timeout
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setIsSubmitting(false);

        const roomLabel = selectedAssignRoom.roomNo || selectedAssignRoom.bedNo;
        setSuccessMessage(`Patient ${assignForm.patientName} assigned to ${roomLabel} successfully!`);
        setSelectedAssignRoom(null);
        setShowSuccessDialog(true);

        // Reset form
        setAssignForm({
            patientName: "",
            patientUhid: "",
            gender: "Male",
            age: "",
            attendingDoctor: "",
            diagnosis: "",
            admissionDate: "12-01-2026",
        });
    };

    const sections = [
        {
            key: "superDeluxe",
            title: "IPD Super Deluxe",
            titleFont: "font-semibold",
            data: roomsData.superDeluxe,
            hasPricing: true,
        },
        {
            key: "ward1",
            title: "IPD Ward 1",
            titleFont: "font-extrabold",
            data: roomsData.ward1,
            subtitle: "Ward 1 - East Wing",
            capacity: "General Ward Capacity: 4 Beds",
        },
        {
            key: "deluxe",
            title: "IPD Deluxe Room",
            titleFont: "font-extrabold",
            data: roomsData.deluxe,
        },
    ];

    return (
        <AppShell>
            <div className="flex flex-col gap-6 select-none">
                {/* ── Heading and Top Building Filters Row ──────────────────────── */}
                <div className="flex items-center justify-between">
                    <PageHeading title="Room Management" />

                    {/* Building Pills Selector */}
                    <div className="w-[480px] shrink-0">
                        <Tabs
                            options={buildingOptions}
                            value={selectedBuilding}
                            onChange={setSelectedBuilding}
                        />
                    </div>
                </div>

                {/* ── Floor Filter Sub-Row ─────────────────────────────────────── */}
                <div className="w-[900px] shrink-0">
                    <Tabs
                        options={floorOptions}
                        value={selectedFloor}
                        onChange={setSelectedFloor}
                    />
                </div>

                {/* ── Room Sections Grid Looping ─────────────────────────────────── */}
                {sections.map((sec) => (
                    <div key={sec.key} className="bg-white border border-[#E2E8F0] rounded-[20px] p-6 flex flex-col gap-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-0.5">
                                <h3 className={`text-[#262D3B] text-lg ${sec.titleFont}`}>{sec.title}</h3>
                            </div>
                            {sec.hasPricing ? (
                                <Button
                                    variant="outline"
                                    size="xsmall"
                                    width="auto"
                                    className="border-[#0B8C00] text-[#0B8C00] hover:bg-[#0B8C0008] px-4 py-1.5 text-xs !font-semibold transition-all"
                                    onClick={() => setShowPricingModal(true)}
                                >
                                    View Pricing
                                </Button>
                            ) : sec.subtitle || sec.capacity ? (
                                <div className="flex flex-col items-end gap-0.5 text-right">
                                    {sec.subtitle && (
                                        <span className="text-xs font-extrabold text-[#262D3B]">{sec.subtitle}</span>
                                    )}
                                    {sec.capacity && (
                                        <span className="text-[10px] font-medium text-[#787E8C]">{sec.capacity}</span>
                                    )}
                                </div>
                            ) : null}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {sec.data.map((item) => (
                                <AllocationCard
                                    key={item.id}
                                    item={item}
                                    onAssignPatient={setSelectedAssignRoom}
                                    onViewPatientInfo={setSelectedPatientInfo}
                                    onViewMaintenanceDetails={setSelectedMaintenanceDetails}
                                    onShowVitals={(patientName) => {
                                        setSuccessMessage(`Latest Vitals for ${patientName}: BP 120/80, SpO2 99%, HR 72 bpm`);
                                        setShowSuccessDialog(true);
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Dialog 1: View Patient Info / Chart / Vitals Details Modal ──── */}
            <Dialog
                open={!!selectedPatientInfo}
                onClose={() => setSelectedPatientInfo(null)}
                title="Inpatient Information Overview"
                width={550}
                contentPadding="px-6 pb-6 pt-4"
            >
                {selectedPatientInfo && (
                    <div className="flex flex-col text-left gap-5">
                        {/* Title block */}
                        <div className="flex justify-between items-center border-b border-[#DFE0E2] pb-3.5">
                            <h3 className="font-extrabold text-lg text-[#262D3B]">
                                {selectedPatientInfo.name}
                            </h3>
                            <Badge variant="success" className="bg-[#0B8C000D] border border-[#0B8C0033] text-[#0B8C00] font-semibold px-3 py-1">
                                {selectedPatientInfo.roomNo}
                            </Badge>
                        </div>

                        {/* General details grid */}
                        <div className="grid grid-cols-2 gap-4 bg-[#F8FAFC] p-4 rounded-xl border border-[#DFE0E2]">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-bold text-[#787E8C] uppercase tracking-wider">Patient UHID</span>
                                <span className="text-sm font-semibold text-[#262D3B]">{selectedPatientInfo.uhid}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-bold text-[#787E8C] uppercase tracking-wider">Room Allocation</span>
                                <span className="text-sm font-semibold text-[#262D3B]">{selectedPatientInfo.type}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-bold text-[#787E8C] uppercase tracking-wider">Diagnosis</span>
                                <span className="text-sm font-semibold text-[#262D3B]">{selectedPatientInfo.diagnosis}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-bold text-[#787E8C] uppercase tracking-wider">Attending Doctor</span>
                                <span className="text-sm font-semibold text-[#262D3B]">{selectedPatientInfo.attendingDoctor}</span>
                            </div>
                        </div>

                        {/* Vitals information block */}
                        <div className="flex flex-col gap-2">
                            <span className="text-xs font-bold text-[#262D3B]">Current Measured Vitals</span>
                            <div className="grid grid-cols-4 gap-3">
                                <div className="bg-[#EFF6FF] border border-[#BFDBFE] p-2.5 rounded-lg text-center flex flex-col gap-0.5">
                                    <span className="text-[9px] font-bold text-[#1D4ED8] uppercase">BP</span>
                                    <span className="text-xs font-extrabold text-[#1E40AF]">{selectedPatientInfo.vitals.bp}</span>
                                </div>
                                <div className="bg-[#FEF2F2] border border-[#FECACA] p-2.5 rounded-lg text-center flex flex-col gap-0.5">
                                    <span className="text-[9px] font-bold text-[#DC2626] uppercase">Heart Rate</span>
                                    <span className="text-xs font-extrabold text-[#991B1B]">{selectedPatientInfo.vitals.hr}</span>
                                </div>
                                <div className="bg-[#FFF7ED] border border-[#FFEDD5] p-2.5 rounded-lg text-center flex flex-col gap-0.5">
                                    <span className="text-[9px] font-bold text-[#EA580C] uppercase">Temp</span>
                                    <span className="text-xs font-extrabold text-[#9A3412]">{selectedPatientInfo.vitals.temp}</span>
                                </div>
                                <div className="bg-[#ECFDF5] border border-[#A7F3D0] p-2.5 rounded-lg text-center flex flex-col gap-0.5">
                                    <span className="text-[9px] font-bold text-[#059669] uppercase">SpO2</span>
                                    <span className="text-xs font-extrabold text-[#065F46]">{selectedPatientInfo.vitals.spo2}</span>
                                </div>
                            </div>
                        </div>


                    </div>
                )}
            </Dialog>

            {/* ── Dialog 2: Assign Patient Interactive Form Modal ───────────────── */}
            <Dialog
                open={!!selectedAssignRoom}
                onClose={() => setSelectedAssignRoom(null)}
                title={`Assign Inpatient`}
                width={700}
                contentPadding="px-6 pb-6 pt-4"
            >
                {selectedAssignRoom && (
                    <form onSubmit={handleAssignSubmit} className="flex flex-col text-left gap-6">
                        {/* Heading summary */}
                        <div className="flex justify-between items-center border-b border-[#DFE0E2] pb-3 mb-2">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-[#787E8C]">Assigning to Allocation</span>
                                <span className="font-extrabold text-base text-[#262D3B]">
                                    {selectedAssignRoom.roomNo || selectedAssignRoom.bedNo}
                                </span>
                            </div>
                            <Badge variant="success" className="bg-[#0B8C000D] border border-[#0B8C0033] text-[#0B8C00] font-semibold px-3 py-1">
                                {selectedAssignRoom.type}
                            </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            {/* Patient Name */}
                            <div>
                                <FormInputField
                                    label="Patient Name *"
                                    type="text"
                                    required
                                    placeholder="Enter Patient Full Name"
                                    value={assignForm.patientName}
                                    onChange={(e) => setAssignForm({ ...assignForm, patientName: e.target.value })}
                                    height={44}
                                />
                            </div>

                            {/* UHID Number */}
                            <div>
                                <FormInputField
                                    label="Patient UHID *"
                                    type="text"
                                    required
                                    placeholder="JSKL41712025"
                                    value={assignForm.patientUhid}
                                    onChange={(e) => setAssignForm({ ...assignForm, patientUhid: e.target.value })}
                                    height={44}
                                />
                            </div>

                            {/* Gender */}
                            <div>
                                <FormSelectField
                                    label="Gender *"
                                    value={assignForm.gender}
                                    options={[
                                        { label: "Male", value: "Male" },
                                        { label: "Female", value: "Female" },
                                        { label: "Other", value: "Other" },
                                    ]}
                                    mode="single"
                                    placeholder="Select Gender"
                                    onChange={(val) => setAssignForm({ ...assignForm, gender: typeof val === "string" ? val : "Male" })}
                                    background="white"
                                />
                            </div>

                            {/* Age */}
                            <div>
                                <FormInputField
                                    label="Age *"
                                    type="number"
                                    required
                                    placeholder="e.g. 45"
                                    value={assignForm.age}
                                    onChange={(e) => setAssignForm({ ...assignForm, age: e.target.value })}
                                    height={44}
                                />
                            </div>
                        </div>

                        {/* Attending Doctor Selector */}
                        <div>
                            <FormSelectField
                                label="Attending Doctor"
                                value={assignForm.attendingDoctor}
                                options={[
                                    { label: "Dr Shiv Ram Singh", value: "Dr Shiv Ram Singh" },
                                    { label: "Dr. Aakash Dave", value: "Dr. Aakash Dave" },
                                    { label: "Dr Heera Singh", value: "Dr Heera Singh" },
                                    { label: "Dr Alok Ashok Tripathi", value: "Dr Alok Ashok Tripathi" },
                                ]}
                                mode="single"
                                placeholder="Select Attending Doctor"
                                onChange={(val) => setAssignForm({ ...assignForm, attendingDoctor: typeof val === "string" ? val : "" })}
                                background="white"
                            />
                        </div>

                        {/* Diagnosis */}
                        <div>
                            <FormInputField
                                label="Initial Diagnosis"
                                type="text"
                                placeholder="Diagnosis reason"
                                value={assignForm.diagnosis}
                                onChange={(e) => setAssignForm({ ...assignForm, diagnosis: e.target.value })}
                                height={44}
                            />
                        </div>

                        {/* Action buttons */}
                        <div className="flex justify-end gap-3 mt-4 border-t border-[#DFE0E2] pt-4">
                            <Button
                                variant="outline"
                                type="button"
                                onClick={() => setSelectedAssignRoom(null)}
                                className="!font-semibold min-w-[90px]"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                type="submit"
                                className="!font-semibold min-w-[120px]"
                                isLoading={isSubmitting}
                            >
                                Assign Patient
                            </Button>
                        </div>
                    </form>
                )}
            </Dialog>

            {/* ── Dialog 3: Maintenance Room Details Modal ────────────────────── */}
            <Dialog
                open={!!selectedMaintenanceDetails}
                onClose={() => setSelectedMaintenanceDetails(null)}
                title="Room Maintenance Details"
                width={480}
                contentPadding="px-6 pb-6 pt-4"
            >
                {selectedMaintenanceDetails && (
                    <div className="flex flex-col text-left gap-5">
                        <div className="flex justify-between items-center border-b border-[#DFE0E2] pb-3">
                            <h3 className="font-extrabold text-lg text-[#EA580C]">
                                Under Maintenance
                            </h3>
                            <Badge variant="warning" className="bg-[#FFF7ED] border border-[#EA580C33] text-[#EA580C] font-semibold">
                                {selectedMaintenanceDetails.roomNo}
                            </Badge>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-bold text-[#787E8C] uppercase tracking-wider">Room Class</span>
                                <span className="text-sm font-semibold text-[#262D3B]">{selectedMaintenanceDetails.type}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-bold text-[#787E8C] uppercase tracking-wider">Reported Issue</span>
                                <span className="text-sm font-semibold text-[#262D3B] bg-[#FFF7ED] p-3 rounded-lg border border-[#EA580C26]">
                                    {selectedMaintenanceDetails.issue}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] font-bold text-[#787E8C] uppercase tracking-wider">Start Date</span>
                                    <span className="text-sm font-semibold text-[#262D3B]">{selectedMaintenanceDetails.startDate}</span>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] font-bold text-[#787E8C] uppercase tracking-wider">Est. Completion</span>
                                    <span className="text-sm font-semibold text-[#262D3B]">{selectedMaintenanceDetails.estCompletion}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-2 border-t border-[#DFE0E2] pt-4">
                            <Button
                                variant="outline"
                                onClick={() => setSelectedMaintenanceDetails(null)}
                                className="!font-semibold min-w-[90px]"
                            >
                                Close
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() => {
                                    setSelectedMaintenanceDetails(null);
                                    setSuccessMessage(`Maintenance job for ${selectedMaintenanceDetails.roomNo} escalated to supervisor.`);
                                    setShowSuccessDialog(true);
                                }}
                                className="!font-semibold min-w-[120px]"
                            >
                                Escalated Issue
                            </Button>
                        </div>
                    </div>
                )}
            </Dialog>

            {/* ── Dialog 4: Pricing Rates Details Modal ────────────────────────── */}
            <Dialog
                open={showPricingModal}
                onClose={() => setShowPricingModal(false)}
                title="Room Tariff & Rates Pricing Sheet"
                width={500}
                contentPadding="px-6 pb-6 pt-4"
            >
                <div className="flex flex-col text-left gap-4">
                    <div className="border-b border-[#DFE0E2] pb-3">
                        <span className="text-xs font-bold text-[#787E8C]">Active Pricing Grid</span>
                        <h3 className="font-extrabold text-base text-[#262D3B]">IPD Room Daily Charges</h3>
                    </div>

                    <div className="flex flex-col border border-[#DFE0E2] rounded-xl overflow-hidden shadow-sm">
                        {/* Table Header */}
                        <div className="grid grid-cols-2 bg-[#F8FAFC] border-b border-[#DFE0E2] px-4 py-2.5 text-xs font-extrabold text-[#787E8C] uppercase tracking-wider">
                            <span>Room Category</span>
                            <span className="text-right">Price per Day (INR)</span>
                        </div>
                        {/* Table Content */}
                        <div className="divide-y divide-[#DFE0E2] text-sm font-medium text-[#262D3B]">
                            <div className="grid grid-cols-2 px-4 py-3">
                                <span>Super Deluxe Private</span>
                                <span className="text-right font-extrabold text-[#0B8C00]">₹12,500</span>
                            </div>
                            <div className="grid grid-cols-2 px-4 py-3">
                                <span>IPD Deluxe Room</span>
                                <span className="text-right font-extrabold text-[#0B8C00]">₹8,500</span>
                            </div>
                            <div className="grid grid-cols-2 px-4 py-3">
                                <span>Semi-Private Ward Bed</span>
                                <span className="text-right font-extrabold text-[#0B8C00]">₹4,500</span>
                            </div>
                            <div className="grid grid-cols-2 px-4 py-3">
                                <span>General Ward Bed</span>
                                <span className="text-right font-extrabold text-[#0B8C00]">₹2,500</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end mt-4 border-t border-[#DFE0E2] pt-4">
                        <Button
                            variant="primary"
                            onClick={() => setShowPricingModal(false)}
                            className="!font-semibold min-w-[100px]"
                        >
                            Done
                        </Button>
                    </div>
                </div>
            </Dialog>

            {/* ── Success Feedback Modal Overlay ─────────────────────────────── */}
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

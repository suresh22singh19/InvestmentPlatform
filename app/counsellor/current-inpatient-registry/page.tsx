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
    Tabs,
    ViewAppointment,
    BackToPreviousPageButton,
    SpinnerLoader,
} from "@/components/ui";
import { useDebounce } from "@/hooks/useDebounce";
import {
    useGetPatientAdmissionsQuery,
    PatientAdmissionItem,
    useLazyGetPatientDetailQuery,
} from "@/store/api/counsellorApi";
import { useAppSelector } from "@/store/hooks";
import { selectUserBranchId } from "@/store/slices/authSlice";
import {
    useGetBuildingDropdownQuery,
    useGetFloorDropdownQuery,
    useGetDoctorDropdownQuery,
} from "@/store/api/commonApi";



export default function CurrentInpatientRegistryPage() {
    // Search and dynamic filtering states
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearch = useDebounce(searchTerm, 500);
    const [selectedDoctor, setSelectedDoctor] = useState("");
    const [selectedFloor, setSelectedFloor] = useState("");
    const [selectedBuilding, setSelectedBuilding] = useState("");
    const [type, setType] = useState<"ipd" | "day_care">("ipd");

    const userBranchId = useAppSelector(selectUserBranchId);

    // Fetch building, floor, doctor dropdown options from common api
    const { data: buildingData } = useGetBuildingDropdownQuery({ branchId: userBranchId });
    const { data: floorData } = useGetFloorDropdownQuery({ branchId: userBranchId });
    const { data: doctorData } = useGetDoctorDropdownQuery({ branchId: userBranchId });

    // Pagination & Sorting states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [sortBy, setSortBy] = useState<"patientName" | "">("patientName");

    // Interactive overlays states
    const [selectedPatient, setSelectedPatient] = useState<PatientAdmissionItem | null>(null);
    const [viewAppointmentMode, setViewAppointmentMode] = useState(false);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Dynamic detailed patient data loading states
    const [getPatientDetail] = useLazyGetPatientDetailQuery();
    const [loadingPatientId, setLoadingPatientId] = useState<number | string | null>(null);
    const [fetchedPatientData, setFetchedPatientData] = useState<any>(null);
    const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
    const [apiErrorMessage, setApiErrorMessage] = useState("");

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

    // Date formatter helper
    const formatAdmissionDate = (dateStr: string) => {
        if (!dateStr) return "N/A";
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}-${month}-${year}`;
        } catch (e) {
            return dateStr;
        }
    };

    // Room parser helper to extract Floor and Wing dynamically
    const getFloorAndBuilding = (roomNumber: string) => {
        if (!roomNumber) return { floor: "N/A", building: "Main Wing" };
        const lower = roomNumber.toLowerCase();
        let floor = "Floor 1";
        let building = "Main Wing";

        if (lower.startsWith("g")) {
            floor = "Ground Floor";
        } else if (lower.startsWith("f") || lower.startsWith("1")) {
            floor = "Floor 1";
        } else if (lower.startsWith("s") || lower.startsWith("2")) {
            floor = "Floor 2";
        } else if (lower.startsWith("t") || lower.startsWith("3")) {
            floor = "Floor 3";
        } else if (lower.startsWith("4")) {
            floor = "Floor 4";
        }

        if (lower.includes("w") || lower.includes("west")) {
            building = "West Wing";
        } else if (lower.includes("e") || lower.includes("east")) {
            building = "East Wing";
        } else {
            building = "Main Wing";
        }

        return { floor, building };
    };

    // API Query params
    const queryParams = {
        sortBy: sortBy || undefined,
        order: sortOrder.toUpperCase() as "ASC" | "DESC",
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearch.trim() || undefined,
        type: type,
        branchId: undefined, // Branch ID can be set if needed
    };

    // Query Hook call
    const { data: apiResponse, isLoading: isAdmissionsLoading } = useGetPatientAdmissionsQuery(queryParams);

    const listingData = apiResponse?.data || [];
    const listingTotal = apiResponse?.total || 0;

    // Compile dynamic doctor filter options from common API
    const doctorOptions = useMemo(() => {
        const opts = [{ label: "Attending Doctor", value: "" }];
        const list = doctorData?.data || [];
        list.forEach((doc) => {
            opts.push({ label: doc.name, value: doc.name });
        });
        return opts;
    }, [doctorData]);

    const normalizeFloorName = (name?: string) => {
        if (!name) return "";
        const lower = name.toLowerCase();
        if (lower.includes("ground")) return "Ground Floor";
        if (lower.includes("first") || lower.includes("1")) return "Floor 1";
        if (lower.includes("second") || lower.includes("2")) return "Floor 2";
        if (lower.includes("third") || lower.includes("3")) return "Floor 3";
        if (lower.includes("fourth") || lower.includes("4")) return "Floor 4";
        return name;
    };

    const floorOptions = useMemo(() => {
        const opts = [{ label: "Floor", value: "" }];
        const list = floorData?.data || [];
        list.forEach((f) => {
            const capitalized = f.name ? f.name.charAt(0).toUpperCase() + f.name.slice(1) : "";
            const normalized = normalizeFloorName(f.name);
            opts.push({ label: capitalized, value: normalized });
        });
        return opts;
    }, [floorData]);

    const buildingOptions = useMemo(() => {
        const opts = [{ label: "Building", value: "" }];
        const list = buildingData?.data || [];
        list.forEach((b) => {
            opts.push({ label: b.name, value: b.name });
        });
        return opts;
    }, [buildingData]);

    // Client-side filtering logic on fetched data
    const filteredList = useMemo(() => {
        let result = [...listingData];

        // 1. Dropdown selection filter for Attending Doctor
        if (selectedDoctor) {
            result = result.filter((item) => (item.doctorName || "").toLowerCase() === selectedDoctor.toLowerCase());
        }

        // 2. Dropdown selection filter for Floor
        if (selectedFloor) {
            result = result.filter((item) => {
                const { floor } = getFloorAndBuilding(item.roomNumber);
                return floor === selectedFloor;
            });
        }

        // 3. Dropdown selection filter for Building
        if (selectedBuilding) {
            result = result.filter((item) => {
                const roomLower = (item.roomNumber || "").toLowerCase();
                const selectedLower = selectedBuilding.toLowerCase();
                const match = selectedLower.match(/building-(\d+)/) || selectedLower.match(/building\s*(\d+)/) || selectedLower.match(/(\d+)/);
                if (match && match[1]) {
                    const num = match[1];
                    return roomLower.startsWith(num + "-") || roomLower.includes("-" + num + "-") || roomLower.includes("building-" + num);
                }
                const { building } = getFloorAndBuilding(item.roomNumber);
                return building.toLowerCase() === selectedLower || roomLower.includes(selectedLower);
            });
        }

        return result;
    }, [listingData, selectedDoctor, selectedFloor, selectedBuilding]);

    const totalItems = (selectedDoctor || selectedFloor || selectedBuilding) ? filteredList.length : listingTotal;
    const paginatedList = filteredList;

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
        { label: "Type" },
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
                {item.uhid}
            </span>
        );

        const typeBadge = (
            <Badge
                variant={item.type === "ipd" ? "success" : "neutral"}
                className={`bg-transparent font-normal uppercase ${item.type === "ipd" ? "border-[#0B8C0033]" : ""}`}
            >
                {item.type === "ipd" ? "IPD" : "Day Care"}
            </Badge>
        );

        const { floor, building } = getFloorAndBuilding(item.roomNumber);
        const roomAndFloorCol = (
            <div className="flex flex-col gap-0.5">
                <span className="font-bold text-[#262D3B] text-sm">
                    {item.roomNumber ? `Room ${item.roomNumber}` : "N/A"} {item.bedNumber ? ` (Bed ${item.bedNumber})` : ""}
                </span>
                <span className="text-[#787E8C] text-xs">
                    {floor} - {building}
                </span>
            </div>
        );

        const displayStatus = item.status === "active" ? "Admitted" : item.status;
        const statusBadge = (
            <Badge
                variant={displayStatus === "Admitted" ? "success" : "neutral"}
                className={`bg-transparent font-normal ${displayStatus === "Admitted" ? "border-[#0B8C0033]" : ""}`}
            >
                {displayStatus}
            </Badge>
        );

        const isButtonLoading = loadingPatientId === (item.patientId || item.id);
        const viewActionBtn = (
            <Button
                variant="primary"
                size="xsmall"
                onClick={async () => {
                    const idToFetch = item.patientId || item.id;
                    if (!idToFetch) return;
                    setLoadingPatientId(idToFetch);
                    try {
                        const res = await getPatientDetail(idToFetch).unwrap();
                        if (res && res.success) {
                            setFetchedPatientData(res.data);
                            setSelectedPatient(item);
                            setViewAppointmentMode(true);
                        } else {
                            setApiErrorMessage(res?.message || "Failed to load patient details.");
                            setShowApiErrorDialog(true);
                        }
                    } catch (err: any) {
                        console.error("Error fetching patient details:", err);
                        const msg = err?.data?.message || err?.message || "An error occurred while fetching patient details.";
                        setApiErrorMessage(msg);
                        setShowApiErrorDialog(true);
                    } finally {
                        setLoadingPatientId(null);
                    }
                }}
                disabled={isButtonLoading}
                className="!font-normal min-w-[70px] flex items-center justify-center"
                width={80}
            >
                {isButtonLoading ? (
                    <SpinnerLoader size={16} color="white" />
                ) : (
                    "View"
                )}
            </Button>
        );

        return [
            sr,
            item.patientName || "N/A",
            patientUhidLink,
            typeBadge,
            roomAndFloorCol,
            item.diagnosis || "N/A",
            item.doctorName || "N/A",
            formatAdmissionDate(item.admissionDate),
            "N/A",
            statusBadge,
            viewActionBtn,
        ];
    });

    return (
        <AppShell>
            {viewAppointmentMode ? (() => {
                const appDetail = fetchedPatientData?.appointmentDetail || {};
                const patDetails = fetchedPatientData?.patientDetails || {};
                const refDetail = fetchedPatientData?.referralDetail || {};
                const medInfo = fetchedPatientData?.medicalInfo || {};
                const otherInfo = fetchedPatientData?.otherInformation || {};

                const appointmentItems = [
                    { label: "UHID", value: appDetail.uhid || "N/A" },
                    { label: "OPD ID", value: appDetail.opid?.toString() || "N/A" },
                    { label: "Branch", value: appDetail.branch || "N/A" },
                    { label: "Doctor", value: appDetail.doctor || "N/A" },
                    { label: "Doctor OPD Fee", value: appDetail.doctorCpdFee !== undefined ? `Rs. ${appDetail.doctorCpdFee}` : "N/A" },
                    // { label: "Entry Fee", value: appDetail.entryFee !== undefined ? `Rs. ${appDetail.entryFee}` : "N/A" },
                    { label: "Appointment Date", value: appDetail.appointmentDate || "N/A" },
                    { label: "Time Slot", value: appDetail.timeSlot || "N/A" },
                    { label: "Created Date", value: appDetail.createdDate ? new Date(appDetail.createdDate).toLocaleString() : "N/A" },
                    { label: "Remark", value: appDetail.remark || "N/A", multiline: true },
                ];

                const referralItems = [
                    { label: "Source", value: refDetail.source || "N/A" },
                    { label: "Sub Source", value: refDetail.subSource || "N/A" },
                    { label: "Referral Doctor", value: refDetail.referralDoctor || "N/A" },
                    { label: "Referral Name", value: refDetail.referralName || "N/A" },
                    { label: "Mobile", value: refDetail.mobile || "N/A" },
                ];

                const patientName = patDetails.name || "N/A";
                const patientSubtitle = `Contact Number: ${patDetails.contactNumber || "N/A"} • Age : ${patDetails.age || "N/A"} Years • Gender : ${patDetails.gender || "N/A"}`;

                const patientBadges = [
                    ...(medInfo.bloodGroup && medInfo.bloodGroup !== "N/A" ? [{
                        label: medInfo.bloodGroup,
                        className: "inline-flex h-[30px] min-w-[76px] me-2 items-center justify-center rounded-[30px] border px-4 text-xs font-semibold border-[#F6776E]/24 bg-[#F6776E0D] text-[#F6776E]"
                    }] : []),
                    ...(otherInfo.patientType ? [{
                        label: otherInfo.patientType,
                        className: "inline-flex h-[30px] min-w-[76px] items-center justify-center rounded-[30px] border px-4 text-xs font-semibold border-[#0B8C00]/20 bg-white text-[#0B8C00]"
                    }] : [])
                ];

                const patientInfoItems = [
                    {
                        iconSrc: "/icons/UserGear.svg",
                        iconAlt: "Father/Husband",
                        label: "Father’s/Husband’s Name",
                        value: patDetails.fatherHusbandName || "N/A",
                    },
                    {
                        iconSrc: "/icons/gendericon.svg",
                        iconAlt: "Marital Status",
                        label: "Marital Status",
                        value: patDetails.maritalStatus || "N/A",
                    },
                    {
                        iconSrc: "/icons/mapicon.svg",
                        iconAlt: "Address",
                        label: "Address",
                        value: patDetails.address || "N/A",
                    },
                    {
                        iconSrc: "/icons/adharcardicon.svg",
                        iconAlt: "Aadhar Card Number",
                        label: "Aadhar Card Number",
                        value: patDetails.aadharCardNumber || "N/A",
                    },
                ];

                const vitalsItems = [
                    { label: "Blood Pressure", value: patDetails.bloodPressure || "N/A", unit: "bp" },
                    { label: "Sugar Level", value: patDetails.sugarLevel || "N/A", unit: "mg/dL" },
                    { label: "Temperature", value: patDetails.temperature || "N/A", unit: "" },
                    { label: "Heart Rate", value: patDetails.heartRate || "N/A", unit: "bpm" },
                ];

                const medicalItems = [
                    { label: "Diagnosis", value: medInfo.diagnosis || "N/A" },
                    { label: "Disease", value: medInfo.disease || "N/A" },
                    { label: "Blood Group", value: medInfo.bloodGroup || "N/A" },
                    { label: "Allergies", value: medInfo.allergies || "N/A" },
                    { label: "Surgeries", value: medInfo.surgeries || "N/A" },
                    { label: "Addiction", value: medInfo.addiction || "N/A" },
                    { label: "Height", value: medInfo.height || "N/A" },
                    { label: "Weight", value: medInfo.weight || "N/A" },
                    { label: "Diet Type", value: medInfo.dietType || "N/A" },
                    { label: "Remark", value: medInfo.remark || "N/A", multiline: true },
                ];

                const otherInfoItems = [
                    { label: "Patient Type", value: otherInfo.patientType || "N/A" },
                    { label: "Patient Sub Type", value: otherInfo.patientSubType || "N/A" },
                    { label: "Beneficiary ID", value: otherInfo.beneficiaryId || "N/A" },
                    { label: "Insurance Company", value: otherInfo.insuranceCompany || "N/A" },
                    { label: "Ayush Covered", value: otherInfo.ayushCovered || "N/A" },
                ];

                const timelineItems = fetchedPatientData?.patientHistory?.map((h: any) => ({
                    dateLabel: h.date || h.createdDate || "N/A",
                    detail: {
                        primaryComplaintTitle: "Chief Complaint",
                        primaryComplaintText: h.chiefComplaint || h.remark || "N/A",
                        detailsTitle: "Symptoms",
                        detailsItems: Array.isArray(h.symptoms) ? h.symptoms : (h.symptoms ? [h.symptoms] : ["N/A"]),
                        actionsTitle: "Medicines Prescribed",
                        actionItems: Array.isArray(h.medicines) ? h.medicines : (h.medicines ? [h.medicines] : ["N/A"]),
                    }
                })) || [];

                const healthCardNo = patDetails.jsHealthCardNo || "N/A";

                return (
                    <div className="flex flex-col gap-6">
                        <div className="flex items-start justify-between">
                            <PageHeading title="View" />
                            <BackToPreviousPageButton
                                text="Back"
                                onClick={() => {
                                    setViewAppointmentMode(false);
                                    setSelectedPatient(null);
                                }}
                            />
                        </div>
                        <ViewAppointment
                            appointmentItems={appointmentItems}
                            walletRemainingAmount="Rs. 0"
                            walletDetails={undefined}
                            referralItems={referralItems}
                            patientName={patientName}
                            patientSubtitle={patientSubtitle}
                            patientBadges={patientBadges}
                            patientInfoItems={patientInfoItems}
                            showVitals={true}
                            vitalsItems={vitalsItems}
                            timelineItems={timelineItems.length > 0 ? timelineItems : undefined}
                            healthCardNo={healthCardNo}
                            medicalItems={medicalItems}
                            fileItems={[]}
                            otherInfoItems={otherInfoItems}
                        />
                    </div>
                );
            })() : (
                <div className="flex flex-col">
                    {/* Page Header and Action Buttons */}
                    <div className="flex items-center justify-between mb-6">
                        <PageHeading title="Current Inpatient Registry" />
                    </div>

                    <div className="flex justify-between mb-3">
                        <div className="w-[280px]">
                            <Tabs
                                options={[
                                    { label: "IPD", value: "ipd" },
                                    { label: "Day Care", value: "day_care" },
                                ]}
                                value={type}
                                onChange={(val) => {
                                    setType(val as "ipd" | "day_care");
                                    setCurrentPage(1);
                                }}
                            />
                        </div>

                    </div>

                    {/* Table Filter row inside TableListingCard */}
                    <div className="mt-0">
                        <TableListingCard
                            sections={[
                                {
                                    id: "inpatient-registry-table",
                                    // leftSideContent: (
                                    //     <div className="w-[280px]">
                                    //         <Tabs
                                    //             options={[
                                    //                 { label: "IPD", value: "ipd" },
                                    //                 { label: "Day Care", value: "day_care" },
                                    //             ]}
                                    //             value={type}
                                    //             onChange={(val) => {
                                    //                 setType(val as "ipd" | "day_care");
                                    //                 setCurrentPage(1);
                                    //             }}
                                    //         />
                                    //     </div>
                                    // ),
                                    titleRightContent: (
                                        <div className="flex items-center gap-3 w-full justify-end flex-wrap md:flex-nowrap">
                                            {/* Attending Doctor dropdown selector */}
                                            <FormSelectField
                                                label=""
                                                hideLabel
                                                options={doctorOptions}
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
                                                options={floorOptions}
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
                                                options={buildingOptions}
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
                                    isLoading: isAdmissionsLoading,
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
                                        itemsPerPageOptions: [10, 20, 50, 100],
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

                    </div>
                </div>
            )}


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

            {/* API Error Dialog */}
            <MessageDialog
                open={showApiErrorDialog}
                onClose={() => setShowApiErrorDialog(false)}
                icon="/icons/CrossIcon.svg"
                iconBgColor="#FFEBEE"
                message={apiErrorMessage}
                confirmText="OK"
                showCancel={false}
                onConfirm={() => setShowApiErrorDialog(false)}
            />
        </AppShell >
    );
}

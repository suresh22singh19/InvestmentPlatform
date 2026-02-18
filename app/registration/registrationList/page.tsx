"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect, useRef } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableData, TableSearchInput, Pagination, FormSelectField, Button, Dialog, FormInputField, BackToPreviousPageButton, MessageDialog } from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import type { SelectOption } from "@/components/ui/FormSelectField";
import { useGetDoctorsQuery, useGetAppointmentsListQuery, useUpdateAppointmentDoctorMutation, type AppointmentRegistration } from "@/store/api/registrationApi";
import { useDebounce } from "@/hooks/useDebounce";
import DateFilterDropdown from "@/components/registration/DateFilterDropdown";
import { useAppSelector } from "@/store/hooks";
import { selectLoginType } from "@/store/slices/authSlice";
import { generatePatientReportPDF } from "@/lib/utils/generatePatientReportPDF";

type PatientRegistration = {
    id: number;
    registrationId: number | string | null; // Registration ID for view/edit pages
    srNo: number;
    uhid: string;
    patientName: string;
    diagnosis: string;
    doctorName: string;
    token: string;
    appointmentTime: string;
    checkInTime: string;
    vitalsStatus: "add" | "done";
    patientStatus: "OPD Waiting" | "OPD In Progress" | "Pharmacy Pending" | "IPD Recommended" | "IPD Admission In Progress" | "Medicine Taken" | "Admitted";
    gender?: string; // Patient gender for conditional field display
};

// Helper function to format timeSlot (e.g., "10-12" to "10:00am - 12:00pm")
const formatTimeSlot = (timeSlot: string | undefined | null): string => {
    if (!timeSlot || timeSlot === "-") return "N/A";

    const timeSlotMap: Record<string, string> = {
        "10-12": "10:00am - 12:00pm",
        "11-13": "11:00am - 01:00pm",
        "12-14": "12:00pm - 02:00pm",
        "13-15": "01:00pm - 03:00pm",
        "14-16": "02:00pm - 04:00pm",
        "15-17": "03:00pm - 05:00pm",
        "16-18": "04:00pm - 06:00pm",
    };

    return timeSlotMap[timeSlot] || timeSlot;
};

// Helper function to format date to time string (HH:MM AM/PM)
const formatTimeFromDate = (dateString: string | undefined): string => {
    if (!dateString) return "N/A";
    try {
        const date = new Date(dateString);
        const hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${String(displayHours).padStart(2, '0')}:${minutes} ${ampm}`;
    } catch (error) {
        return "N/A";
    }
};

// Helper function to format date to date string (DD-MM-YYYY)
const formatDateFromDate = (dateString: string | undefined): string => {
    if (!dateString) return "N/A";
    try {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    } catch (error) {
        return "N/A";
    }
};

// Helper function to format name with title
const formatNameWithTitle = (name: string | undefined | null, title: string | undefined | null): string => {
    if (!name) return "";
    const trimmedName = name.trim();
    const trimmedTitle = title && title.trim() ? title.trim() : null;
    
    if (!trimmedTitle) {
        return trimmedName;
    }
    
    return `${trimmedTitle} ${trimmedName}`;
};

// Patient status options for filter
const patientStatusOptions: SelectOption[] = [
    { value: "OPD Waiting", label: "OPD Waiting" },
    { value: "OPD In Progress", label: "OPD In Progress" },
    { value: "Pharmacy Pending", label: "Pharmacy Pending" },
    { value: "IPD Recommended", label: "IPD Recommended" },
    { value: "IPD Admission In Progress", label: "IPD Admission In Progress" },
    { value: "Medicine Taken", label: "Medicine Taken" },
    { value: "Admitted", label: "Admitted" },
];

// Get status badge color classes
const getStatusBadgeClasses = (status: PatientRegistration["patientStatus"]) => {
    const baseClasses = "inline-flex items-center justify-center px-5 py-2 rounded-[30px] text-xs font-medium border";

    switch (status) {
        case "OPD Waiting":
            return `${baseClasses} border-[#FFC107] text-[#FFC107] bg-white`;
        case "OPD In Progress":
            return `${baseClasses} border-[#42A5F5] text-[#42A5F5] bg-white`;
        case "Pharmacy Pending":
            return `${baseClasses} border-[#FF9800] text-[#FF9800] bg-white`;
        case "IPD Recommended":
            return `${baseClasses} border-[#9C27B0] text-[#9C27B0] bg-white`;
        case "IPD Admission In Progress":
            return `${baseClasses} border-[#2196F3] text-[#2196F3] bg-white`;
        case "Medicine Taken":
            return `${baseClasses} border-[#4CAF50] text-[#4CAF50] bg-white`;
        case "Admitted":
            return `${baseClasses} border-[#F44336] text-[#F44336] bg-white`;
        default:
            return `${baseClasses} border-[#9CA3AF] text-[#9CA3AF] bg-white`;
    }
};

export default function RegistrationListPage() {
    const router = useRouter();
    const loginType = useAppSelector(selectLoginType);
    const isNurse = loginType?.toLowerCase() === "nurse";
    const [filters, setFilters] = useState({
        searchTerm: "",
        patientStatus: "",
        currentPage: 1,
        itemsPerPage: 10,
        sortField: "",
        sortOrder: "asc" as "asc" | "desc",
    });
    const prevSearchTermRef = useRef(filters.searchTerm);

    // Date filter state - load from sessionStorage or default to today
    const getTodayDate = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Initialize dates from sessionStorage or default to today
    // Only use stored dates if there's a navigation flag (meaning user navigated back, not refreshed)
    const initializeDates = () => {
        if (typeof window === "undefined") {
            const today = getTodayDate();
            return { fromDate: today, toDate: today };
        }
        
        // Check if this is a navigation back (not a page refresh)
        const navigationFlag = sessionStorage.getItem("registrationList_navigationFlag");
        const navigationTimestamp = sessionStorage.getItem("registrationList_navigationTimestamp");
        
        // If navigation flag exists and timestamp is recent (within last 5 seconds), use stored dates
        // Otherwise, treat as page refresh and reset to today
        const isNavigationBack = navigationFlag === "true" && navigationTimestamp;
        if (isNavigationBack) {
            const timestamp = parseInt(navigationTimestamp || "0", 10);
            const now = Date.now();
            // If timestamp is within last 5 seconds, it's likely a navigation back
            if (now - timestamp < 5000) {
                const storedFromDate = sessionStorage.getItem("registrationList_fromDate");
                const storedToDate = sessionStorage.getItem("registrationList_toDate");
                // Clear the flag after using it
                sessionStorage.removeItem("registrationList_navigationFlag");
                sessionStorage.removeItem("registrationList_navigationTimestamp");
                // If dates are stored (even if empty string), use them. Otherwise default to today.
                return {
                    fromDate: storedFromDate !== null ? storedFromDate : getTodayDate(),
                    toDate: storedToDate !== null ? storedToDate : getTodayDate(),
                };
            }
        }
        
        // Page refresh or first visit - reset to today
        const today = getTodayDate();
        return { fromDate: today, toDate: today };
    };

    const initialDates = initializeDates();
    const [fromDate, setFromDate] = useState<string>(initialDates.fromDate);
    const [toDate, setToDate] = useState<string>(initialDates.toDate);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);

    // Save dates to sessionStorage whenever they change
    useEffect(() => {
        if (typeof window !== "undefined") {
            sessionStorage.setItem("registrationList_fromDate", fromDate);
            sessionStorage.setItem("registrationList_toDate", toDate);
        }
    }, [fromDate, toDate]);

    // Dialog state for Doctor Exchange
    const [isDoctorDialogOpen, setIsDoctorDialogOpen] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<PatientRegistration | null>(null);
    const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | string | null>(null);
    const [currentDoctorId, setCurrentDoctorId] = useState<number | string | null>(null);
    const [selectedDoctor, setSelectedDoctor] = useState<string>("");

    // Success/Error dialog state
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    // Debounce search to avoid too many API calls
    const debouncedSearchTerm = useDebounce(filters.searchTerm, 500);

    // Trim the debounced search term to remove leading and trailing spaces
    const trimmedSearchTerm = debouncedSearchTerm.trim();
    const searchParam = trimmedSearchTerm || "";

    // Reset to first page when search term changes
    useEffect(() => {
        if (prevSearchTermRef.current !== filters.searchTerm) {
            prevSearchTermRef.current = filters.searchTerm;
            setFilters((prev) => ({ ...prev, currentPage: 1 }));
        }
    }, [filters.searchTerm]);

    // Handle click outside filter dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
        };

        if (isFilterOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isFilterOpen]);

    const handleFilterClick = () => {
        setIsFilterOpen(!isFilterOpen);
    };

    const handleFilter = (filterFromDate: string, filterToDate: string) => {
        setFromDate(filterFromDate);
        setToDate(filterToDate);
        // Save to sessionStorage immediately
        if (typeof window !== "undefined") {
            sessionStorage.setItem("registrationList_fromDate", filterFromDate);
            sessionStorage.setItem("registrationList_toDate", filterToDate);
        }
        setFilters((prev) => ({ ...prev, currentPage: 1 })); // Reset to first page when filter is applied
        setIsFilterOpen(false);
    };

    const handleClear = () => {
        // Clear dates to empty strings to match DateFilterDropdown behavior
        // Empty strings will be converted to undefined in API call, which means no date filter
        setFromDate("");
        setToDate("");
        // Save empty strings to sessionStorage to preserve cleared state
        if (typeof window !== "undefined") {
            sessionStorage.setItem("registrationList_fromDate", "");
            sessionStorage.setItem("registrationList_toDate", "");
        }
        setFilters((prev) => ({ ...prev, currentPage: 1 })); // Reset to first page when filter is cleared
    };

    // Map sort field to API sortBy field names
    const getSortByFieldForAPI = (field: string): string | undefined => {
        const fieldMap: Record<string, string> = {
            "uhid": "uhid",
            "patientName": "patient",
            "diagnosis": "diagnosis",
            "doctorName": "doctor",
            "token": "token",
            "appointmentTime": "appointmentDate",
            "checkInTime": "createdAt",
            "vitalsStatus": "status",
            "patientStatus": "status",
        };
        return fieldMap[field] || undefined;
    };

    // Fetch appointments list from API
    // Convert empty strings to undefined for API (empty string means no filter, undefined means no date filter)
    const { data: appointmentsData, isLoading, isError, refetch: refetchAppointments } = useGetAppointmentsListQuery(
        {
            branchId: 1,
            search: searchParam,
            page: filters.currentPage,
            limit: filters.itemsPerPage,
            sortBy: filters.sortField ? getSortByFieldForAPI(filters.sortField) : undefined,
            sortOrder: filters.sortField ? (filters.sortOrder.toUpperCase() as "ASC" | "DESC") : undefined,
            fromDate: fromDate && fromDate.trim() !== "" ? fromDate : undefined,
            toDate: toDate && toDate.trim() !== "" ? toDate : undefined,
        },
        {
            // Always refetch when this page mounts or filters change,
            // so the list reflects latest vitals/medical updates
            refetchOnMountOrArgChange: true,
        }
    );

    // Mutation for updating doctor
    const [updateAppointmentDoctor, { isLoading: isUpdatingDoctor }] = useUpdateAppointmentDoctorMutation();

    // Fetch doctors list
    const { data: doctorsData } = useGetDoctorsQuery();

    // Transform doctors to SelectOption format
    const doctorOptions: SelectOption[] = useMemo(() => {
        return doctorsData?.data?.map((doctor) => {
            const userName = doctor.userName || "";
            const groupName = doctor.group?.name || "";
            const groupId = doctor.group?.id || "";
            const email = doctor.email || "";
            const id = doctor.id || "";

            return {
                value: String(id),
                label: email
                    ? `${userName} (${groupId || id}) - ${email}`
                    : `${userName}${groupName ? ` (${groupName})` : ""}`,
            };
        }) || [];
    }, [doctorsData]);

    // Transform API data to PatientRegistration format
    const transformedData: PatientRegistration[] = useMemo(() => {
        if (!appointmentsData?.data || !Array.isArray(appointmentsData.data)) {
            return [];
        }

        return appointmentsData.data.map((appointment: AppointmentRegistration, index: number) => {
            // Determine vitals status based on isVitalMedicalAdded flag
            const vitalsStatus: "add" | "done" = appointment.isVitalMedicalAdded ? "done" : "add";

            // Map status to patientStatus (handle both lowercase and mixed case)
            const statusMap: Record<string, PatientRegistration["patientStatus"]> = {
                "active": "OPD Waiting",
                "in-progress": "OPD In Progress",
                "in_progress": "OPD In Progress",
                "completed": "Medicine Taken",
                "pharmacy-pending": "Pharmacy Pending",
                "pharmacy_pending": "Pharmacy Pending",
                "ipd-recommended": "IPD Recommended",
                "ipd_recommended": "IPD Recommended",
                "ipd-admission-in-progress": "IPD Admission In Progress",
                "ipd_admission_in_progress": "IPD Admission In Progress",
                "medicine-taken": "Medicine Taken",
                "medicine_taken": "Medicine Taken",
                "admitted": "Admitted",
                // Add more mappings as needed
            };
            const statusKey = (appointment.status || "").toLowerCase();
            const patientStatus = statusMap[statusKey] || "OPD Waiting";

            // Format appointment time from timeSlot (e.g., "10-12" to "10:00am - 12:00pm")
            const appointmentTime = formatTimeSlot(appointment.timeSlot);

            // Format check-in time from createdAt
            const checkInTime = formatTimeFromDate(appointment.createdAt);

            // Get patient name and title from registration
            const rawPatientName = appointment.registration?.patientName || appointment.registration?.patient || "";
            const patientTitle = appointment.registration?.patientTitle || null;
            const formattedPatientName = formatNameWithTitle(rawPatientName, patientTitle);
            // Get gender from registration
            const gender = appointment.registration?.gender || "";

            return {
                id: Number(appointment.id) || index + 1,
                registrationId: appointment.registration?.id || appointment.registrationId || null,
                srNo: (filters.currentPage - 1) * filters.itemsPerPage + index + 1,
                uhid: appointment.uhid || appointment.registration?.uhid || "",
                patientName: formattedPatientName,
                diagnosis: appointment.diagnosis?.name || "",
                doctorName: appointment.doctor?.userName || appointment.doctor?.name || `Dr. User ${appointment.doctorUserId}`,
                token: appointment.token || "-",
                appointmentTime: appointmentTime,
                checkInTime: checkInTime,
                vitalsStatus: vitalsStatus,
                patientStatus: patientStatus,
                gender: gender,
            };
        });
    }, [appointmentsData, filters.currentPage, filters.itemsPerPage]);

    // Apply client-side status filter (if API doesn't support it)
    const filteredData = useMemo(() => {
        let data = [...transformedData];

        // Apply patient status filter (client-side if API doesn't support it)
        if (filters.patientStatus) {
            data = data.filter((patient) => patient.patientStatus === filters.patientStatus);
        }

        return data;
    }, [transformedData, filters.patientStatus]);

    // Get total items from API or filtered data
    const totalItems = appointmentsData?.total || filteredData.length;

    const getSortDirection = (field: string): "asc" | "desc" | null => {
        if (filters.sortField === field) {
            return filters.sortOrder;
        }
        return null;
    };

    const handleSort = (field: string) => {
        setFilters((prev) => ({
            ...prev,
            sortField: field,
            sortOrder: prev.sortField === field && prev.sortOrder === "asc" ? "desc" : "asc",
            currentPage: 1,
        }));
    };

    const handlePageChange = (page: number) => {
        setFilters((prev) => ({ ...prev, currentPage: page }));
    };

    const handleItemsPerPageChange = (items: number) => {
        setFilters((prev) => ({ ...prev, itemsPerPage: items, currentPage: 1 }));
    };

    const handleVitalsAction = (patientId: number, currentStatus: "add" | "done", patientName: string, gender?: string) => {
        // Set navigation flag before navigating away
        if (typeof window !== "undefined") {
            sessionStorage.setItem("registrationList_navigationFlag", "true");
            sessionStorage.setItem("registrationList_navigationTimestamp", Date.now().toString());
        }
        // Navigate to vitals & medical info page if status is "add"
        // patientId here is actually the appointment ID
        if (currentStatus === "add") {
            // Include gender as query parameter if available
            const genderParam = gender ? `?gender=${encodeURIComponent(gender)}` : "";
            router.push(`/registration/registrationList/vitals-medical/${patientId}${genderParam}`);
        } else {
            // If "done", maybe show view/edit page or do nothing
            console.log(`Viewing vitals for patient ${patientId}`);
        }
    };

    const handleDoctorAction = (patientId: number) => {
        // Find the appointment from the original API data
        const appointment = appointmentsData?.data?.find((apt: AppointmentRegistration) => Number(apt.id) === patientId);
        // Find the patient data from transformed data
        const patient = filteredData.find((p) => p.id === patientId);
        if (patient && appointment) {
            setSelectedPatient(patient);
            setSelectedAppointmentId(Number(appointment.id));
            setCurrentDoctorId(appointment.doctorUserId || null);
            setSelectedDoctor("");
            setIsDoctorDialogOpen(true);
        }
    };

    const handleDoctorDialogSubmit = async () => {
        if (selectedPatient && selectedDoctor && selectedAppointmentId) {
            // Prevent selecting the same doctor
            if (currentDoctorId && Number(selectedDoctor) === Number(currentDoctorId)) {
                setErrorMessage("Please select a different doctor.");
                setShowErrorDialog(true);
                return;
            }

            try {
                const result = await updateAppointmentDoctor({
                    appointmentId: selectedAppointmentId,
                    doctorUserId: Number(selectedDoctor),
                }).unwrap();

                // Close the doctor exchange dialog
                setIsDoctorDialogOpen(false);
                setSelectedPatient(null);
                setSelectedAppointmentId(null);
                setCurrentDoctorId(null);
                setSelectedDoctor("");

                // Show success message
                setSuccessMessage(result.message || "Doctor updated successfully");
                setShowSuccessDialog(true);

                // Re-fetch appointments list
                refetchAppointments();
            } catch (error: any) {
                // Close the doctor exchange dialog
                setIsDoctorDialogOpen(false);
                setSelectedPatient(null);
                setSelectedAppointmentId(null);
                setCurrentDoctorId(null);
                setSelectedDoctor("");

                // Show error message
                const errorMsg = error?.data?.message || error?.message || "Failed to update doctor. Please try again.";
                setErrorMessage(errorMsg);
                setShowErrorDialog(true);
            }
        }
    };

    const handleDoctorDialogCancel = () => {
        setIsDoctorDialogOpen(false);
        setSelectedPatient(null);
        setSelectedAppointmentId(null);
        setCurrentDoctorId(null);
        setSelectedDoctor("");
    };

    const handleView = (patient: PatientRegistration) => {
        // Set navigation flag before navigating away
        if (typeof window !== "undefined") {
            sessionStorage.setItem("registrationList_navigationFlag", "true");
            sessionStorage.setItem("registrationList_navigationTimestamp", Date.now().toString());
        }
        // Use appointmentId (patient.id) instead of registrationId
        if (!patient.id) {
            console.error("Appointment ID not found for patient:", patient);
            return;
        }
        router.push(`/registration/registrationList/${patient.id}/view`);
    };

    const handleEdit = (patient: PatientRegistration) => {
        // Set navigation flag before navigating away
        if (typeof window !== "undefined") {
            sessionStorage.setItem("registrationList_navigationFlag", "true");
            sessionStorage.setItem("registrationList_navigationTimestamp", Date.now().toString());
        }
        if (!patient.registrationId) {
            console.error("Registration ID not found for patient:", patient);
            return;
        }
        router.push(`/registration/registrationList/${patient.registrationId}/edit`);
    };

    const handleDownloadPDF = (patient: PatientRegistration) => {
        // Find the raw appointment data from the API response
        const appointment = appointmentsData?.data?.find(
            (apt: AppointmentRegistration) => Number(apt.id) === patient.id
        );

        const now = new Date();
        const day = String(now.getDate()).padStart(2, "0");
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const year = now.getFullYear();
        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        const seconds = String(now.getSeconds()).padStart(2, "0");
        const dateStr = `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;

        generatePatientReportPDF({
            patientName: patient.patientName || "",
            guardianLabel: "W/o,D/o,S/o",
            guardianName: "",
            chiefComplaint: "",
            history: "",
            menstrualHistory: "",
            diagnosis: patient.diagnosis || "",
            doctorName: patient.doctorName || "",
            doctorQualification: "BAMS",
            doctorRegNo: "",
            uhid: patient.uhid || "",
            opdNo: String(appointment?.id || patient.id || ""),
            age: appointment?.registration?.age || "",
            gender: patient.gender || appointment?.registration?.gender || "",
            date: dateStr,
            bloodPressure: appointment?.bloodPressure ? String(appointment.bloodPressure) : "",
            sugarLevel: appointment?.sugarLevel ? String(appointment.sugarLevel) : "",
            weight: "",
            height: "",
            rbs: "",
        });
    };

    return (
        <AppShell>
            <div className="space-y-8">
                <div className="flex items-start justify-between">
                    <PageHeading title="Registration List" />
                    {/* Only show back button if user is NOT a nurse */}
                    {!isNurse && (
                        <div className="px-5">
                            <BackToPreviousPageButton
                                iconOnly={true}
                                onClick={() => router.back()}
                            />
                        </div>
                    )}
                </div>

                <ListBorder as="section" className="px-4 py-4" style={{ overflow: 'visible' }}>
                    <div className="w-full rounded-[16px] border border-[#E3EEE1] bg-white px-5 pb-5 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]" style={{ overflow: 'visible' }}>
                        <div className="mb-6 flex items-center justify-between" style={{ overflow: 'visible' }}>
                            <h2 className="text-lg font-semibold text-[#434956]"></h2>

                            <div className="flex items-center gap-3 relative">
                                {/* Date Filter - Left side of Select Patient Status */}
                                <div className="relative" ref={filterRef}>
                                    <button
                                        onClick={handleFilterClick}
                                        className="cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center w-[108px] h-10 rounded-[32px] border border-[#0B8C00] bg-white hover:bg-[#F7FAF7] relative z-10"
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            <Image src="/icons/FilterIcon.svg" alt="filter" width={24} height={24} />
                                            <span className="font-inter font-medium text-sm leading-[120%] text-[#0B8C00]">Filter</span>
                                        </div>
                                    </button>
                                    {isFilterOpen && (
                                        <div className="absolute right-0 top-full mt-2 z-50">
                                            <DateFilterDropdown
                                                onFilter={handleFilter}
                                                onClear={handleClear}
                                                initialFromDate={fromDate}
                                                initialToDate={toDate}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="lg:w-[300px] lg:flex-shrink-0">
                                    <FormSelectField
                                        label=""
                                        options={patientStatusOptions}
                                        value={filters.patientStatus || null}
                                        onChange={(value) => {
                                            const selectedValue = typeof value === "string" ? value : Array.isArray(value) ? value[0] : "";
                                            setFilters((prev) => ({ ...prev, patientStatus: selectedValue, currentPage: 1 }));
                                        }}
                                        placeholder="Select patient Status"
                                        background="normal"
                                        width={300}
                                    />
                                </div>
                                <div className="lg:w-[300px] lg:flex-shrink-0">
                                    <TableSearchInput
                                        value={filters.searchTerm}
                                        onChange={(value) => {
                                            // Trim leading spaces from input value
                                            const trimmedValue = value.trimStart();
                                            setFilters((prev) => ({ ...prev, searchTerm: trimmedValue, currentPage: 1 }));
                                        }}
                                        placeholder="Search Here..."
                                    />
                                </div>
                            </div>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow className="bg-white">
                                    <TableHead position="first">Sr no.</TableHead>
                                    <TableHead
                                        sortable
                                        onSort={() => handleSort("uhid")}
                                        sortDirection={getSortDirection("uhid")}
                                    >
                                        UHID
                                    </TableHead>
                                    <TableHead
                                    // sortable
                                    // onSort={() => handleSort("patientName")}
                                    // sortDirection={getSortDirection("patientName")}
                                    >
                                        Patient Name
                                    </TableHead>
                                    <TableHead>
                                        Token
                                    </TableHead>
                                    <TableHead>
                                        Vitals & Medical
                                    </TableHead>
                                    <TableHead
                                    // sortable
                                    // onSort={() => handleSort("doctorName")}
                                    // sortDirection={getSortDirection("doctorName")}
                                    >
                                        Doctor Name
                                    </TableHead>
                                    <TableHead
                                    // sortable
                                    // onSort={() => handleSort("appointmentTime")}
                                    // sortDirection={getSortDirection("appointmentTime")}
                                    >
                                        Appointment Time
                                    </TableHead>
                                    <TableHead
                                    // sortable
                                    // onSort={() => handleSort("checkInTime")}
                                    // sortDirection={getSortDirection("checkInTime")}
                                    >
                                        Check-In Time
                                    </TableHead>
                                    <TableHead>
                                        Diagnosis
                                    </TableHead>
                                    <TableHead>
                                        Patient Status
                                    </TableHead>
                                    <TableHead position="last">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableData
                                            colSpan={11}
                                            className="py-12 text-center text-sm text-[#9CA3AF]"
                                        >
                                            Loading appointments...
                                        </TableData>
                                    </TableRow>
                                ) : isError ? (
                                    <TableRow>
                                        <TableData
                                            colSpan={11}
                                            className="py-12 text-center text-sm text-[#9CA3AF]"
                                        >
                                            Error loading appointments
                                        </TableData>
                                    </TableRow>
                                ) : filteredData.length === 0 ? (
                                    <TableRow>
                                        <TableData
                                            colSpan={11}
                                            className="py-12 text-center text-sm text-[#9CA3AF]"
                                        >
                                            No patient registrations found
                                        </TableData>
                                    </TableRow>
                                ) : (
                                    filteredData.map((patient) => (
                                        <TableRow
                                            key={patient.id}
                                            className="bg-white transition-colors hover:bg-[#F7FAF7]"
                                        >
                                            <TableData variant="primary">
                                                {patient.srNo}
                                            </TableData>
                                            <TableData onClick={() => handleView(patient)}>{patient.uhid}</TableData>
                                            <TableData onClick={() => handleView(patient)}>{patient.patientName}</TableData>
                                            <TableData>
                                                {patient.token && patient.token !== "-" ? (
                                                    <span className="inline-flex items-center justify-center h-6 px-5 py-2 rounded-[30px] bg-white border border-[#0B8C00]/20 text-xs font-normal text-[#0B8C00] leading-[120%] whitespace-nowrap">
                                                        {patient.token}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-normal text-[#434956]">-</span>
                                                )}
                                            </TableData>
                                            <TableData>
                                                {patient.vitalsStatus === "add" ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleVitalsAction(patient.id, patient.vitalsStatus, patient.patientName, patient.gender)}
                                                        className="flex items-center justify-center gap-1 h-6 px-3 py-2 rounded-[32px] text-xs font-medium text-white bg-[#0B8C00] border border-[#0B8C00] hover:bg-[#0A7F00] transition-colors"
                                                    >
                                                        <Image
                                                            src="/icons/AddIconWhite.svg"
                                                            alt="Add"
                                                            width={14}
                                                            height={14}
                                                            className="shrink-0"
                                                        />
                                                        <span>Add</span>
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleVitalsAction(patient.id, patient.vitalsStatus, patient.patientName, patient.gender)}
                                                        className="flex items-center justify-center h-6 px-5 py-2 rounded-[30px] text-xs font-medium text-[#0B8C00] bg-white border border-[#0B8C00]/20 hover:bg-[#F2F8F2] transition-colors"
                                                    >
                                                        Done
                                                    </button>
                                                )}
                                            </TableData>
                                            <TableData>{patient.doctorName}</TableData>
                                            <TableData>{patient.appointmentTime}</TableData>
                                            <TableData>{patient.checkInTime}</TableData>
                                            <TableData>{patient.diagnosis ? patient.diagnosis : "-"}</TableData>
                                            <TableData>
                                                <span className={getStatusBadgeClasses(patient.patientStatus)}>
                                                    {patient.patientStatus}
                                                </span>
                                            </TableData>
                                            <TableData className="">
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleView(patient)}
                                                        className="cursor-pointer flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                                                        aria-label="View"
                                                    >
                                                        <Image
                                                            src="/icons/ViewEyeIcon.svg"
                                                            alt="View"
                                                            width={20}
                                                            height={20}
                                                        />
                                                    </button>
                                                    {/* Only show Edit and Doctor Change buttons if user is NOT a nurse */}
                                                    {!isNurse && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleEdit(patient)}
                                                                className="cursor-pointer flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                                                                aria-label="Edit"
                                                            >
                                                                <Image
                                                                    src="/icons/EditIconBlack.svg"
                                                                    alt="Edit"
                                                                    width={20}
                                                                    height={20}
                                                                />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDoctorAction(patient.id)}
                                                                className="cursor-pointer flex items-center justify-center w-8 h-8 rounded-[8px] hover:bg-[#F2F8F2] transition-colors"
                                                                aria-label="Doctor Action"
                                                            >
                                                                <Image
                                                                    src="/icons/doctorIcon.svg"
                                                                    alt="Doctor"
                                                                    width={20}
                                                                    height={20}
                                                                    className="text-[#434956]"
                                                                />
                                                            </button>
                                                        </>
                                                    )}
                                                    <button
                                                        onClick={() => handleDownloadPDF(patient)}
                                                        className="cursor-pointer flex items-center justify-center w-8 h-8 rounded-[8px] hover:bg-[#F2F8F2] transition-colors"
                                                        aria-label="Download PDF"
                                                        title="Download PDF"
                                                    >
                                                        <Image
                                                            src="/icons/DownloadExport.svg"
                                                            alt="Download PDF"
                                                            width={20}
                                                            height={20}
                                                        />
                                                    </button>
                                                </div>
                                            </TableData>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        {!isLoading && !isError && totalItems > 0 && (
                            <Pagination
                                currentPage={filters.currentPage}
                                totalItems={totalItems}
                                itemsPerPage={filters.itemsPerPage}
                                onPageChange={handlePageChange}
                                onItemsPerPageChange={handleItemsPerPageChange}
                            />
                        )}
                    </div>
                </ListBorder>
            </div>

            {/* Doctor Exchange Dialog */}
            <Dialog
                open={isDoctorDialogOpen}
                onClose={handleDoctorDialogCancel}
                title="Doctor Exchange"
                width={577}
            >
                <div className="flex flex-col gap-6">
                    {/* Current Doctor */}
                    <div>
                        <FormInputField
                            label="Current Doctor"
                            value={selectedPatient?.doctorName || ""}
                            onChange={() => { }}
                            placeholder=""
                            type="text"
                            disabled
                            className="!cursor-not-allowed"
                        />
                    </div>

                    {/* To Section */}
                    <div>
                        <FormSelectField
                            label="Choose Doctor"
                            options={doctorOptions}
                            value={selectedDoctor || null}
                            onChange={(value) => {
                                const selectedValue = typeof value === "string" ? value : Array.isArray(value) ? value[0] : "";
                                setSelectedDoctor(selectedValue || "");
                            }}
                            placeholder="Select Doctor"
                            mode="single"
                            background="white"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-4">
                        <Button
                            variant="outline"
                            onClick={handleDoctorDialogCancel}
                            className="border-[#0B8C00] text-[#0B8C00] hover:bg-[#F2F8F2]"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleDoctorDialogSubmit}
                            disabled={!selectedDoctor || isUpdatingDoctor}
                            isLoading={isUpdatingDoctor}
                        >
                            Submit
                        </Button>
                    </div>
                </div>
            </Dialog>

            {/* Success Dialog */}
            <MessageDialog
                open={showSuccessDialog}
                onClose={() => setShowSuccessDialog(false)}
                icon="/icons/SuccessCheck.svg"
                iconBgColor="#E8F5E9"
                message={successMessage}
                confirmText="OK"
                showCancel={false}
                onConfirm={() => setShowSuccessDialog(false)}
            />

            {/* Error Dialog */}
            <MessageDialog
                open={showErrorDialog}
                onClose={() => setShowErrorDialog(false)}
                icon="/icons/ErrorIcon.svg"
                iconBgColor="#FFEBEE"
                message={errorMessage}
                confirmText="OK"
                showCancel={false}
                onConfirm={() => setShowErrorDialog(false)}
            />
        </AppShell>
    );
}

"use client";

import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { BackToPreviousPageButton, Dialog, MessageDialog, FormSelectField, FormInputField, FormTextareaField, DatePicker, Button } from "@/components/ui";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useGetAppointmentWithRegistrationQuery } from "@/store/api/registrationApi";
import type { AppointmentWithRegistration } from "@/store/api/registrationApi";
import { useMemo, useState } from "react";
import { formatIndianAmount } from "@/store/utils/formatIndianAmount";

// Static pre-booking view data (matches static list on /pre-booking) – used when API has no data
const STATIC_PRE_BOOKING_VIEW: Record<string, AppointmentWithRegistration> = {
    "62269": {
        id: 62269,
        uhid: "PB-62269",
        branchId: 1,
        registrationId: 1,
        doctorUserId: 1,
        doctorFee: 500,
        appointmentDate: "2026-01-13",
        timeSlot: "10:00-11:00",
        token: "1",
        status: "Pre-booking",
        isVitalMedicalAdded: false,
        doctor: { id: 1, userName: "Dr. Suyash Pratap Singh", email: "suyash@example.com" },
        registration: {
            id: 1,
            uhid: "PB-62269",
            branchId: 1,
            patientName: "Test Patient Thirteenth January Two",
            patientTitle: "Mr.",
            guardianName: "Guardian Name",
            guardianTitle: "Mr.",
            contactNumber: "9876581469",
            whatsappNo: "9876581469",
            aadharCardNo: "",
            gender: "Male",
            age: "30",
            maritalStatus: "Single",
            religion: "Hindu",
            occupation: "Engineer",
            emailAddress: "patient@example.com",
            jsHealthCardNo: "",
            address: { id: 1, address: "Sample Address", city: "S.A.S NAGAR", pinCode: "160062", state: "Punjab", country: "India", tehsil: "Mohali", area: "Phase 1" },
            patientType: "opd",
            panelId: null,
            patientSubType: null,
            benificiaryId: null,
            isReferral: false,
            payment: { doctorFee: 500, paymentMode: "Cash", transactionId: "", gstNumber: undefined, companyName: "", billingAddress: "", state: "", city: "", pincode: "" },
            patientReferral: {} as any,
        },
    },
    "62270": {
        id: 62270,
        uhid: "PB-62270",
        branchId: 1,
        registrationId: 2,
        doctorUserId: 2,
        doctorFee: 500,
        appointmentDate: "2026-01-13",
        timeSlot: "10:00-11:00",
        token: "2",
        status: "Active Leads",
        isVitalMedicalAdded: false,
        doctor: { id: 2, userName: "Dr. Aatish Vashisht", email: "aatish@example.com" },
        registration: {
            id: 2,
            uhid: "PB-62270",
            branchId: 1,
            patientName: "Ajay Saini",
            patientTitle: "Mr.",
            guardianName: "Guardian Name",
            guardianTitle: "Mr.",
            contactNumber: "9876581468",
            whatsappNo: "9876581468",
            aadharCardNo: "",
            gender: "Male",
            age: "28",
            maritalStatus: "Married",
            religion: "Hindu",
            occupation: "Business",
            emailAddress: "",
            jsHealthCardNo: "",
            address: { id: 2, address: "Address", city: "S.A.S NAGAR", pinCode: "160062", state: "Punjab", country: "India", tehsil: "Mohali", area: "Phase 1" },
            patientType: "opd",
            panelId: null,
            patientSubType: null,
            benificiaryId: null,
            isReferral: false,
            payment: { doctorFee: 500, paymentMode: "Cash", transactionId: "", gstNumber: undefined, companyName: "", billingAddress: "", state: "", city: "", pincode: "" },
            patientReferral: {} as any,
        },
    },
    "62271": {
        id: 62271,
        uhid: "PB-62271",
        branchId: 1,
        registrationId: 3,
        doctorUserId: 1,
        doctorFee: 300,
        appointmentDate: "2026-01-13",
        timeSlot: "11:00-12:00",
        token: "3",
        status: "Pre-booking",
        isVitalMedicalAdded: false,
        doctor: { id: 1, userName: "Dr. Suyash Pratap Singh", email: "suyash@example.com" },
        registration: {
            id: 3,
            uhid: "PB-62271",
            branchId: 1,
            patientName: "Ritika Samkria",
            patientTitle: "Mrs.",
            guardianName: "Spouse Name",
            guardianTitle: "Mr.",
            contactNumber: "9876550052",
            whatsappNo: "9876550052",
            aadharCardNo: "",
            gender: "Female",
            age: "32",
            maritalStatus: "Married",
            religion: "Hindu",
            occupation: "Teacher",
            emailAddress: "",
            jsHealthCardNo: "",
            address: { id: 3, address: "Address", city: "S.A.S NAGAR", pinCode: "160062", state: "Punjab", country: "India", tehsil: "Mohali", area: "Phase 1" },
            patientType: "ipd",
            panelId: null,
            patientSubType: null,
            benificiaryId: null,
            isReferral: false,
            payment: { doctorFee: 300, paymentMode: "Cash", transactionId: "", gstNumber: undefined, companyName: "", billingAddress: "", state: "", city: "", pincode: "" },
            patientReferral: {} as any,
        },
    },
    "62272": {
        id: 62272,
        uhid: "PB-62272",
        branchId: 1,
        registrationId: 4,
        doctorUserId: 2,
        doctorFee: 0,
        appointmentDate: "2026-01-13",
        timeSlot: "09:00-10:00",
        token: "4",
        status: "Active Leads",
        isVitalMedicalAdded: false,
        doctor: { id: 2, userName: "Dr. Aatish Vashisht", email: "aatish@example.com" },
        registration: {
            id: 4,
            uhid: "PB-62272",
            branchId: 1,
            patientName: "Ajeet Kumar",
            patientTitle: "Mr.",
            guardianName: "Guardian Name",
            guardianTitle: "Mr.",
            contactNumber: "9876538922",
            whatsappNo: "9876538922",
            aadharCardNo: "",
            gender: "Male",
            age: "35",
            maritalStatus: "Married",
            religion: "Hindu",
            occupation: "Service",
            emailAddress: "",
            jsHealthCardNo: "",
            address: { id: 4, address: "Address", city: "S.A.S NAGAR", pinCode: "160062", state: "Punjab", country: "India", tehsil: "Mohali", area: "Phase 1" },
            patientType: "opd",
            panelId: null,
            patientSubType: null,
            benificiaryId: null,
            isReferral: false,
            payment: { doctorFee: 0, paymentMode: "N/A", transactionId: "", gstNumber: undefined, companyName: "", billingAddress: "", state: "", city: "", pincode: "" },
            patientReferral: {} as any,
        },
    },
    "62273": {
        id: 62273,
        uhid: "PB-62273",
        branchId: 1,
        registrationId: 5,
        doctorUserId: 1,
        doctorFee: 500,
        appointmentDate: "2026-01-13",
        timeSlot: "14:00-15:00",
        token: "5",
        status: "Pre-booking",
        isVitalMedicalAdded: false,
        doctor: { id: 1, userName: "Dr. Suyash Pratap Singh", email: "suyash@example.com" },
        registration: {
            id: 5,
            uhid: "PB-62273",
            branchId: 1,
            patientName: "Manish Kumar",
            patientTitle: "Mr.",
            guardianName: "Guardian Name",
            guardianTitle: "Mr.",
            contactNumber: "9876582086",
            whatsappNo: "9876582086",
            aadharCardNo: "",
            gender: "Male",
            age: "40",
            maritalStatus: "Married",
            religion: "Hindu",
            occupation: "Engineer",
            emailAddress: "",
            jsHealthCardNo: "",
            address: { id: 5, address: "Address", city: "Chandigarh", pinCode: "160017", state: "Chandigarh", country: "India", tehsil: "", area: "Sector 17" },
            patientType: "opd",
            panelId: null,
            patientSubType: null,
            benificiaryId: null,
            isReferral: false,
            payment: { doctorFee: 500, paymentMode: "Cash", transactionId: "", gstNumber: undefined, companyName: "", billingAddress: "", state: "", city: "", pincode: "" },
            patientReferral: {} as any,
        },
    },
    "62274": {
        id: 62274,
        uhid: "PB-62274",
        branchId: 1,
        registrationId: 6,
        doctorUserId: 2,
        doctorFee: 500,
        appointmentDate: "2026-01-13",
        timeSlot: "15:00-16:00",
        token: "6",
        status: "Active Leads",
        isVitalMedicalAdded: false,
        doctor: { id: 2, userName: "Dr. Aatish Vashisht", email: "aatish@example.com" },
        registration: {
            id: 6,
            uhid: "PB-62274",
            branchId: 1,
            patientName: "Tania Srangal",
            patientTitle: "Mrs.",
            guardianName: "Spouse Name",
            guardianTitle: "Mr.",
            contactNumber: "9876582086",
            whatsappNo: "9876582086",
            aadharCardNo: "",
            gender: "Female",
            age: "29",
            maritalStatus: "Married",
            religion: "Hindu",
            occupation: "Homemaker",
            emailAddress: "",
            jsHealthCardNo: "",
            address: { id: 6, address: "Address", city: "Chandigarh", pinCode: "160017", state: "Chandigarh", country: "India", tehsil: "", area: "Sector 17" },
            patientType: "opd",
            panelId: null,
            patientSubType: null,
            benificiaryId: null,
            isReferral: false,
            payment: { doctorFee: 500, paymentMode: "Cash", transactionId: "", gstNumber: undefined, companyName: "", billingAddress: "", state: "", city: "", pincode: "" },
            patientReferral: {} as any,
        },
    },
};

// Helper function to format date
const formatDate = (dateString: string | undefined | null): string => {
    if (!dateString) return "N/A";
    try {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    } catch {
        return dateString;
    }
};

// Helper function to format time slot
const formatTimeSlot = (timeSlot: string | undefined | null): string => {
    if (!timeSlot) return "N/A";
    const timeSlotMap: { [key: string]: string } = {
        "09:00-10:00": "09:00am - 10:00am",
        "10:00-11:00": "10:00am - 11:00am",
        "11:00-12:00": "11:00am - 12:00pm",
        "12:00-13:00": "12:00pm - 01:00pm",
        "13:00-14:00": "01:00pm - 02:00pm",
        "14:00-15:00": "02:00pm - 03:00pm",
        "15:00-16:00": "03:00pm - 04:00pm",
        "16:00-17:00": "04:00pm - 05:00pm",
        "17:00-18:00": "05:00pm - 06:00pm",
    };
    return timeSlotMap[timeSlot] || timeSlot;
};

// Helper function to convert height to feet and inches
const formatHeight = (height: string | null | undefined): string => {
    if (!height) return "N/A";
    try {
        const heightNum = parseFloat(height);
        if (isNaN(heightNum)) return height;
        // Check if height is in decimal format (feet.inches format like 5.8 for 5ft 8in)
        const feet = Math.floor(heightNum);
        const inches = Math.round((heightNum - feet) * 12);
        if (inches > 0) {
            return `${feet} ft ${inches} in`;
        }
        return `${feet} ft`;
    } catch {
        return height;
    }
};

// Helper function to format blood group
const formatBloodGroup = (bloodGroup: string | null | undefined): string => {
    if (!bloodGroup) return "N/A";
    // Convert from lowercase format (e.g., "o-positive") to display format (e.g., "O+")
    const parts = bloodGroup.split("-");
    if (parts.length === 2) {
        const group = parts[0].toUpperCase();
        const sign = parts[1] === "positive" ? "+" : "-";
        return `${group}${sign}`;
    }
    return bloodGroup;
};

// Helper function to capitalize first letter
const capitalizeFirstLetter = (str: string | null | undefined): string => {
    if (!str) return "N/A";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Capitalize first letter of each word for Gender, Marital Status, Religion, Occupation (if value exists)
const capitalizeWords = (str: string | null | undefined): string => {
    if (!str || typeof str !== "string" || !str.trim()) return "N/A";
    return str
        .trim()
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
};

// Helper function to mask phone number (show last 4 digits, mask first 6 with 'x')
const maskPhoneNumber = (phoneNumber: string | null | undefined): string => {
    if (!phoneNumber) return "N/A";
    const cleaned = phoneNumber.replace(/\D/g, ""); // Remove non-digits
    if (cleaned.length < 4) return phoneNumber; // If less than 4 digits, return as is
    const last4 = cleaned.slice(-4);
    const masked = "XXXXXX" + last4;
    return masked;
};

export default function ViewRegistrationFormPage() {
    const router = useRouter();
    const params = useParams();
    const appointmentId = params?.patientId as string; // Note: patientId param now contains appointmentId (bookingId)

    const staticAppointment = appointmentId ? STATIC_PRE_BOOKING_VIEW[appointmentId] : undefined;

    // Fetch appointment with registration details (skip when static data is used)
    const { data: appointmentData, isLoading, isError } = useGetAppointmentWithRegistrationQuery(
        { appointmentId: appointmentId || "" },
        { skip: !appointmentId || !!staticAppointment }
    );

    const apiAppointment = appointmentData?.data;
    const appointment = staticAppointment ?? apiAppointment;
    const patientData = appointment?.registration; // Registration data is nested in appointment

    // Check if vitals and medical are added - use isVitalMedicalAdded from appointment
    const isVitalsMedicalComplete = useMemo(() => {
        if (!appointment) return false;
        return appointment.isVitalMedicalAdded === true;
    }, [appointment]);

    // Send Address & Confirm Booking dialogs
    const [sendAddressConfirmOpen, setSendAddressConfirmOpen] = useState(false);
    const [confirmBookingDialogOpen, setConfirmBookingDialogOpen] = useState(false);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
    const [apiErrorMessage, setApiErrorMessage] = useState("");
    const [confirmBookingForm, setConfirmBookingForm] = useState({
        jsHealthCard: "",
        doctor: "",
        govtEmpanelment: "",
        startDate: "",
        paymentRemark: "",
        bookingType: "",
        consultancyFee: "",
        packageOption: "",
        endDate: "",
    });

    const handleSendAddressConfirm = () => {
        setSendAddressConfirmOpen(false);
        setShowSuccessDialog(true);
        setSuccessMessage("Booking confirmed successfully.");
    };

    const handleConfirmBookingSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setConfirmBookingDialogOpen(false);
        // Simulate API: show success or error (e.g. based on required fields). For demo, show success.
        const hasRequired = confirmBookingForm.jsHealthCard.trim() && confirmBookingForm.govtEmpanelment;
        if (hasRequired) {
            setSuccessMessage("Booking confirmed successfully.");
            setShowSuccessDialog(true);
        } else {
            setApiErrorMessage("Please fill required fields (Health Card and Govt Empanelment).");
            setShowApiErrorDialog(true);
        }
    };

    const closeConfirmBookingDialog = () => {
        setConfirmBookingDialogOpen(false);
    };

    if (!appointmentId) {
        return (
            <AppShell>
                <div className="flex items-center justify-center min-h-screen">
                    <p>Invalid pre-booking ID.</p>
                </div>
            </AppShell>
        );
    }

    if (!staticAppointment && isLoading) {
        return (
            <AppShell>
                <div className="flex items-center justify-center min-h-screen">
                    <p>Loading...</p>
                </div>
            </AppShell>
        );
    }

    if (!staticAppointment && (isError || !apiAppointment) && !appointment) {
        return (
            <AppShell>
                <div className="flex items-center justify-center min-h-screen">
                    <p>Error loading appointment details. Please try again.</p>
                </div>
            </AppShell>
        );
    }

    if (!patientData) {
        return (
            <AppShell>
                <div className="flex items-center justify-center min-h-screen">
                    <p>No registration data found for this pre-booking.</p>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <div className="space-y-8">
                <div className="flex items-start justify-between">
                    <PageHeading title="View Pre Booking Form" />
                    <div className="px-5 flex items-center gap-3">

                        <button
                            type="button"
                            className="cursor-pointer flex flex-row justify-center items-center px-6 py-3 gap-2 bg-[#0B8C00] rounded-[32px] font-inter font-medium text-sm leading-[120%] text-center text-white hover:bg-[#0A7A00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => setSendAddressConfirmOpen(true)}
                        >
                            <span>Send Address</span>
                        </button>
                        <button
                            type="button"
                            className="cursor-pointer flex flex-row justify-center items-center px-6 py-3 gap-2 bg-[#0B8C00] rounded-[32px] font-inter font-medium text-sm leading-[120%] text-center text-white hover:bg-[#0A7A00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => setConfirmBookingDialogOpen(true)}
                        >
                            <span>Confirm Pre Booking</span>
                        </button>
                        <BackToPreviousPageButton
                            iconOnly={true}
                            onClick={() => router.back()}
                        />
                    </div>
                </div>
                <div className="view-registration-container">
                    {/* personal details  */}
                    <div className="w-full overflow-hidden lg:rounded-[20px] lg:border lg:border-[#E3EEE1] lg:p-4 mb-4">
                        {/* <h3 className="font-inter font-semibold text-[18px] md:text-[20px] lg:text-[24px] leading-[120%] text-[#262D3B] mb-4">Personal Information</h3> */}

                        <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-4 mb-4">
                            <h4 className="text-base font-medium leading-[120%] text-[#262D3B] flex gap-2 items-center mb-5">
                                <Image src="/icons/CalendarIconDark.svg" alt="patient info" width={20} height={20} /> Pre Booking Patient Detail
                            </h4>
                            <div className="space-y-4">
                                {/* Grid 1 */}
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 border-t border-b border-[#DFE0E2] mb-4">
                                    <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0 break-words">
                                        <p className="text-xs font-medium text-[#7B8089]">Pre Booking ID</p>
                                        <p className="text-sm font-medium text-[#262D3B]">62267</p>
                                    </div>

                                    <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                        <p className="text-xs font-medium text-[#7B8089]">Branch</p>
                                        <p className="text-sm font-medium text-[#262D3B]">Hiims Derabassi</p>
                                    </div>

                                    <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                        <p className="text-xs font-medium text-[#7B8089]">Booking Type</p>
                                        <p className="text-sm font-medium text-[#262D3B]">OPD</p>
                                    </div>

                                    <div className="space-y-1 last:border-0 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 break-words">
                                        <p className="text-xs font-medium text-[#7B8089]">Doctor</p>
                                        <p className="text-sm font-medium text-[#262D3B]">Dr.Suyash Pratap Singh</p>
                                    </div>
                                </div>

                                {/* Grid 2 */}
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 border-t border-b border-[#DFE0E2] mb-4">
                                    <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0 break-words">
                                        <p className="text-xs font-medium text-[#7B8089]">Appointment Date & Time</p>
                                        <p className="text-sm font-medium text-[#262D3B]">13-01-2026 11:53 AM</p>
                                    </div>

                                    <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                        <p className="text-xs font-medium text-[#7B8089]">Created Date</p>
                                        <p className="text-sm font-medium text-[#262D3B]">10-01-2026 04:49 PM</p>
                                    </div>

                                    <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                        <p className="text-xs font-medium text-[#7B8089]">Remark</p>
                                        <p className="text-sm font-medium text-[#262D3B]">Lorem ipsum is a dummy text</p>
                                    </div>

                                    {/*  */}
                                </div>



                            </div>
                        </div>
                        <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-4 mb-4">
                            <h4 className="text-base font-medium leading-[120%] text-[#262D3B] flex gap-2 items-center mb-5">
                                <Image src="/icons/patientinfo.svg" alt="patient info" width={20} height={20} />Patient Information
                            </h4>
                            <div className="space-y-4">
                                {/* Grid 1 */}
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 border-t border-b border-[#DFE0E2] mb-4">
                                    <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0 break-words">
                                        <p className="text-xs font-medium text-[#7B8089]">Contact Number</p>
                                        <p className="text-sm font-medium text-[#262D3B]">{maskPhoneNumber(patientData.contactNumber)}</p>
                                    </div>

                                    <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                        <p className="text-xs font-medium text-[#7B8089]">Whatsapp No</p>
                                        <p className="text-sm font-medium text-[#262D3B]">{maskPhoneNumber(patientData.whatsappNo)}</p>
                                    </div>

                                    <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                        <p className="text-xs font-medium text-[#7B8089]">Aadhar Card Number</p>
                                        <p className="text-sm font-medium text-[#262D3B]">{patientData.aadharCardNo || "N/A"}</p>
                                    </div>

                                    <div className="space-y-1 last:border-0 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 break-words">
                                        <p className="text-xs font-medium text-[#7B8089]">Patient Name</p>
                                        <p className="text-sm font-medium text-[#262D3B]">{patientData.patientTitle || ""} {capitalizeWords(patientData.patientName)}</p>
                                    </div>
                                </div>

                                {/* Grid 2 */}
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 border-t border-b border-[#DFE0E2] mb-4">
                                    <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0 break-words">
                                        <p className="text-xs font-medium text-[#7B8089]">Father / Husband's Name</p>
                                        <p className="text-sm font-medium text-[#262D3B]">{patientData.guardianTitle || ""} {capitalizeWords(patientData.guardianName)}</p>
                                    </div>

                                    <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                        <p className="text-xs font-medium text-[#7B8089]">Gender</p>
                                        <p className="text-sm font-medium text-[#262D3B]">{capitalizeWords(patientData.gender)}</p>
                                    </div>

                                    <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                        <p className="text-xs font-medium text-[#7B8089]">Age</p>
                                        <p className="text-sm font-medium text-[#262D3B]">{patientData.age || "N/A"}</p>
                                    </div>

                                    <div className="space-y-1 last:border-0 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4">
                                        <p className="text-xs font-medium text-[#7B8089]">Marital Status</p>
                                        <p className="text-sm font-medium text-[#262D3B]">{capitalizeWords(patientData.maritalStatus)}</p>
                                    </div>
                                </div>

                                {/* Grid 3 */}
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 border-t border-b border-[#DFE0E2] mb-4">
                                    <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                        <p className="text-xs font-medium text-[#7B8089]">Religion</p>
                                        <p className="text-sm font-medium text-[#262D3B]">{capitalizeWords(patientData.religion)}</p>
                                    </div>

                                    <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                        <p className="text-xs font-medium text-[#7B8089]">Occupation</p>
                                        <p className="text-sm font-medium text-[#262D3B]">{capitalizeWords(patientData.occupation)}</p>
                                    </div>

                                    <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                        <p className="text-xs font-medium text-[#7B8089]">Email Address</p>
                                        <p className="text-sm font-medium text-[#262D3B]">{patientData.emailAddress || "N/A"}</p>
                                    </div>

                                    <div className="space-y-1 last:border-0 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4">
                                        <p className="text-xs font-medium text-[#7B8089]">Health Card No.</p>
                                        <p className="text-sm font-medium text-[#262D3B]">{patientData.jsHealthCardNo || "N/A"}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 border-t border-b border-[#DFE0E2] mb-4">
                                    <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                        <p className="text-xs font-medium text-[#7B8089]">UHID</p>
                                        <p className="text-sm font-medium text-[#262D3B]">{patientData.uhid || "N/A"}</p>
                                    </div>


                                </div>

                            </div>
                        </div>
                        <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-4 mb-4">
                            <h4 className="text-base font-medium leading-[120%] text-[#262D3B] flex gap-2 items-center mb-5">
                                <Image src="/icons/addressicon.svg" alt="Address info" width={20} height={20} /> Address Information
                            </h4>
                            <div className="space-y-4">
                                {(() => {
                                    const addr = patientData.address;
                                    const isIndia = addr?.country === "India" || addr?.country === "6";
                                    const pinCodeLabel = isIndia ? "Pin Code" : "ZIP/Postal Code";
                                    const cityLabel = isIndia ? "District" : "City";
                                    return (
                                        <>
                                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 border-t border-b border-[#DFE0E2] mb-4">
                                                <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                                    <p className="text-xs font-medium text-[#7B8089]">Country</p>
                                                    <p className="text-sm font-medium text-[#262D3B]">{addr?.country || "N/A"}</p>
                                                </div>

                                                <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                                    <p className="text-xs font-medium text-[#7B8089]">{pinCodeLabel}</p>
                                                    <p className="text-sm font-medium text-[#262D3B]">{addr?.pinCode || "N/A"}</p>
                                                </div>

                                                <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                                    <p className="text-xs font-medium text-[#7B8089]">State</p>
                                                    <p className="text-sm font-medium text-[#262D3B]">{addr?.state || "N/A"}</p>
                                                </div>

                                                <div className="space-y-1 last:border-0 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4">
                                                    <p className="text-xs font-medium text-[#7B8089]">{cityLabel}</p>
                                                    <p className="text-sm font-medium text-[#262D3B]">{addr?.city || "N/A"}</p>
                                                </div>
                                            </div>
                                            {isIndia ? (
                                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4 border-t border-b border-[#DFE0E2] mb-4">
                                                    <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                                        <p className="text-xs font-medium text-[#7B8089]">Tehsil</p>
                                                        <p className="text-sm font-medium text-[#262D3B]">{addr?.tehsil || "N/A"}</p>
                                                    </div>
                                                    <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                                        <p className="text-xs font-medium text-[#7B8089]">Area</p>
                                                        <p className="text-sm font-medium text-[#262D3B]">{addr?.area || "N/A"}</p>
                                                    </div>
                                                    <div className="space-y-1 last:border-0 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4">
                                                        <p className="text-xs font-medium text-[#7B8089]">Address</p>
                                                        <p className="text-sm font-medium text-[#262D3B]">{addr?.address || "N/A"}</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 border-t border-b border-[#DFE0E2] mb-4">
                                                    <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                                        <p className="text-xs font-medium text-[#7B8089]">Address Line 1</p>
                                                        <p className="text-sm font-medium text-[#262D3B]">{(addr as any)?.addressLine1?.trim() || "N/A"}</p>
                                                    </div>
                                                    <div className="space-y-1 last:border-0 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4">
                                                        <p className="text-xs font-medium text-[#7B8089]">Address Line 2</p>
                                                        <p className="text-sm font-medium text-[#262D3B]">{(addr as any)?.addressLine2?.trim() || "N/A"}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                        <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-4 mb-4">
                            <h4 className="text-base font-medium leading-[120%] text-[#262D3B] flex gap-2 items-center mb-5">
                                <Image src="/icons/patientinfo.svg" alt="patient info" width={20} height={20} /> Patient Type
                            </h4>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 border-t border-b border-[#DFE0E2] mb-4">
                                    <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                        <p className="text-xs font-medium text-[#7B8089]">Patient Type</p>
                                        <p className="text-sm font-medium text-[#262D3B]">{capitalizeFirstLetter(patientData.patientType)}</p>
                                    </div>

                                    <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                        <p className="text-xs font-medium text-[#7B8089]">Panel</p>
                                        <p className="text-sm font-medium text-[#262D3B]">{patientData.panelId ? "Yes" : "No"}</p>
                                    </div>

                                    <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                        <p className="text-xs font-medium text-[#7B8089]">Patient Sub Type</p>
                                        <p className="text-sm font-medium text-[#262D3B]">{patientData.patientSubType || "N/A"}</p>
                                    </div>

                                    <div className="space-y-1 last:border-0 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4">
                                        <p className="text-xs font-medium text-[#7B8089]">Benificiary ID</p>
                                        <p className="text-sm font-medium text-[#262D3B]">{patientData.benificiaryId || "N/A"}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {patientData.isReferral && (
                            <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-4 mb-4">
                                <h4 className="text-base font-medium leading-[120%] text-[#262D3B] flex gap-2 items-center mb-5">
                                    <Image src="/icons/Referral.svg" alt="Referral info" width={20} height={20} /> Referral
                                </h4>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 border-t border-b border-[#DFE0E2] mb-4">
                                        <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                            <p className="text-xs font-medium text-[#7B8089]">Referral</p>
                                            <p className="text-sm font-medium text-[#262D3B]">{patientData.isReferral ? "Yes" : "No"}</p>
                                        </div>

                                        <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                            <p className="text-xs font-medium text-[#7B8089]">Source</p>
                                            <p className="text-sm font-medium text-[#262D3B]">
                                                {(() => {
                                                    const ref = appointment?.patientReferral as any;
                                                    const source: string | null | undefined = ref?.source ?? patientData.source;
                                                    const sourceSelected: string | null | undefined = ref?.sourceSelected ?? patientData.referralSourceInfo;

                                                    // Special cases for source
                                                    if (source === "Referral") return "Patient Referral";
                                                    if (source === "Doctor") return "Doctor Referral";

                                                    if (source && sourceSelected) return `${source} (${sourceSelected})`;
                                                    if (source) return source;
                                                    if (sourceSelected) return sourceSelected;

                                                    return "N/A";
                                                })()}
                                            </p>
                                        </div>

                                        <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                            <p className="text-xs font-medium text-[#7B8089]"> Patient Referral Name</p>
                                            <p className="text-sm font-medium text-[#262D3B]">{(appointment?.patientReferral as any)?.referralName ?? patientData.referralName ?? "N/A"}</p>
                                        </div>

                                        <div className="space-y-1 last:border-0 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4">
                                            <p className="text-xs font-medium text-[#7B8089]"> Patient Referral Mobile</p>
                                            <p className="text-sm font-medium text-[#262D3B]">{(appointment?.patientReferral as any)?.referralMobile ?? patientData.referralMobile ?? "N/A"}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* Appointment Information - from appointment object */}
                        <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-4 mb-4">
                            <h4 className="text-base font-medium leading-[120%] text-[#262D3B] flex gap-2 items-center mb-5">
                                <Image src="/icons/CalendarDarkIcon.svg" alt="Appointment info" width={20} height={20} /> Appointment Information
                            </h4>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 border-t border-b border-[#DFE0E2] mb-4">
                                    <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                        <p className="text-xs font-medium text-[#7B8089]">Doctor </p>
                                        <p className="text-sm font-medium text-[#262D3B]">{appointment?.doctor?.userName || appointment?.doctor?.email || "N/A"}</p>
                                        {/* appointment.doctor?.name || appointment.doctor?.email || "N/A" */}
                                    </div>

                                    <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                        <p className="text-xs font-medium text-[#7B8089]">Appointment Date</p>
                                        <p className="text-sm font-medium text-[#262D3B]">{formatDate(appointment.appointmentDate)}</p>
                                    </div>

                                    <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                        <p className="text-xs font-medium text-[#7B8089]">Appointment Time</p>
                                        <p className="text-sm font-medium text-[#262D3B]">{appointment.timeSlot || "N/A"}</p>
                                    </div>

                                    <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                        <p className="text-xs font-medium text-[#7B8089]">Token</p>
                                        <p className="text-sm font-medium text-[#262D3B]">{appointment.token || "N/A"}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* personal details  */}

                    {/* Payment details - Always show */}
                    <div className="w-full overflow-hidden lg:rounded-[20px] lg:border lg:border-[#E3EEE1] lg:p-4 mb-4">
                        <h3 className="font-inter font-semibold text-[18px] md:text-[20px] lg:text-[24px] leading-[120%] text-[#262D3B] mb-4">Payment Information</h3>
                        <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-4 mb-4">
                            <h4 className="text-base font-medium leading-[120%] text-[#262D3B] flex gap-2 items-center mb-5">
                                <Image src="/icons/PaymnetIcon.svg" alt="Payment info" width={20} height={20} /> Payment Details
                            </h4>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 border-t border-b border-[#DFE0E2] mb-4">
                                        <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                            <p className="text-xs font-medium text-[#7B8089]">Consultation Charges</p>
                                            <p className="text-sm font-medium text-[#262D3B]">{formatIndianAmount(appointment.doctorFee || patientData.payment?.doctorFee || "0")}</p>
                                    </div>

                                    <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                        <p className="text-xs font-medium text-[#7B8089]">Payment Mode</p>
                                        <p className="text-sm font-medium text-[#262D3B]">
                                            {Number(appointment?.doctorFee ?? patientData.payment?.doctorFee ?? 0) === 0
                                                ? "0"
                                                : capitalizeWords(patientData.payment?.paymentMode || patientData.schemeType || "Cash")}
                                        </p>
                                    </div>

                                    <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                        <p className="text-xs font-medium text-[#7B8089]">Transaction ID</p>
                                        <p className="text-sm font-medium text-[#262D3B]">{patientData.payment?.transactionId || "N/A"}</p>
                                    </div>

                                    <div className="space-y-1 last:border-0 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4">
                                        <p className="text-xs font-medium text-[#7B8089]">GST Billing</p>
                                        <p className="text-sm font-medium text-[#262D3B]">{patientData.payment?.gstNumber || patientData.gstNumber ? "Yes" : "No"}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {(patientData.payment?.gstNumber || patientData.gstNumber) && (
                            <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-4 mb-4">
                                <h4 className="text-base font-medium leading-[120%] text-[#262D3B] flex gap-2 items-center mb-5">
                                    <Image src="/icons/patientinfo.svg" alt="Billing info" width={20} height={20} /> Billing Information
                                </h4>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 border-t border-b border-[#DFE0E2] mb-4">
                                        <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                            <p className="text-xs font-medium text-[#7B8089]">GST Number</p>
                                            <p className="text-sm font-medium text-[#262D3B]">{patientData.payment?.gstNumber || patientData.gstNumber || "N/A"}</p>
                                        </div>

                                        <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                            <p className="text-xs font-medium text-[#7B8089]">Company Name</p>
                                            <p className="text-sm font-medium text-[#262D3B]">{patientData.payment?.companyName || "N/A"}</p>
                                        </div>

                                        <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                            <p className="text-xs font-medium text-[#7B8089]">State</p>
                                            <p className="text-sm font-medium text-[#262D3B]">{patientData.payment?.state || "N/A"}</p>
                                        </div>

                                        <div className="space-y-1 last:border-0 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4">
                                            <p className="text-xs font-medium text-[#7B8089]">City</p>
                                            <p className="text-sm font-medium text-[#262D3B]">{patientData.payment?.city || "N/A"}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-4 border-t border-b border-[#DFE0E2] mb-4">
                                        <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                            <p className="text-xs font-medium text-[#7B8089]">Pincode</p>
                                            <p className="text-sm font-medium text-[#262D3B]">{patientData.payment?.pincode || "N/A"}</p>
                                        </div>
                                        <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                            <p className="text-xs font-medium text-[#7B8089]">Billing Address</p>
                                            <p className="text-sm font-medium text-[#262D3B]">{patientData.payment?.billingAddress || "N/A"}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Payment details  */}

                    {/* Vitals details - Only show if both vitals and medical info are complete */}
                    {isVitalsMedicalComplete && (
                        <div className="w-full overflow-hidden lg:rounded-[20px] lg:border lg:border-[#E3EEE1] lg:p-4 mb-4">
                            <h3 className="font-inter font-semibold text-[18px] md:text-[20px] lg:text-[24px] leading-[120%] text-[#262D3B] mb-4">Vitals Information</h3>
                            <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-4 mb-4">
                                <h4 className="text-base font-medium leading-[120%] text-[#262D3B] flex gap-2 items-center mb-5">
                                    <Image src="/icons/VitalsIcon.svg" alt="Vital info" width={20} height={20} /> Vitals
                                </h4>
                                <div className="space-y-4">
                                    {/* Grid 1 */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 border-t border-b border-[#DFE0E2] mb-4">
                                        <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                            <p className="text-xs font-medium text-[#7B8089]">Height</p>
                                            <p className="text-sm font-medium text-[#262D3B]">{formatHeight(patientData.height)}</p>
                                        </div>

                                        <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                            <p className="text-xs font-medium text-[#7B8089]">Weight</p>
                                            <p className="text-sm font-medium text-[#262D3B]">{patientData.weight ? `${patientData.weight} kg` : "N/A"}</p>
                                        </div>

                                        <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                            <p className="text-xs font-medium text-[#7B8089]">Blood Group</p>
                                            <p className="text-sm font-medium text-[#262D3B]">{formatBloodGroup(patientData.bloodGroup)}</p>
                                        </div>

                                        <div className="space-y-1 last:border-0 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4">
                                            <p className="text-xs font-medium text-[#7B8089]">Allergies</p>
                                            <p className="text-sm font-medium text-[#262D3B]">{patientData.allergies || "No"}</p>
                                        </div>
                                    </div>
                                    {/* Grid 2 */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 border-t border-b border-[#DFE0E2] mb-4">
                                        <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                            <p className="text-xs font-medium text-[#7B8089]">Surgeries</p>
                                            <p className="text-sm font-medium text-[#262D3B]">{patientData.surgeries || "No"}</p>
                                        </div>

                                        <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                            <p className="text-xs font-medium text-[#7B8089]">Diet Type</p>
                                            <p className="text-sm font-medium text-[#262D3B]">{patientData.dietType || "N/A"}</p>
                                            {patientData?.lastDayFullDiet && (
                                                <p className="text-xs font-medium text-[#7B8089] mt-0.5 break-words">{patientData.lastDayFullDiet}</p>
                                            )}
                                        </div>

                                        <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                            <p className="text-xs font-medium text-[#7B8089]">Blood Pressure</p>
                                            <p className="text-sm font-medium text-[#262D3B]">{appointment.bloodPressure || patientData.bloodPressure ? `${appointment.bloodPressure || patientData.bloodPressure} mmHg` : "N/A"}</p>
                                        </div>

                                        <div className="space-y-1 last:border-0 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4">
                                            <p className="text-xs font-medium text-[#7B8089]">Sugar Level</p>
                                            <p className="text-sm font-medium text-[#262D3B]">{appointment.sugarLevel || patientData.sugarLevel ? `${appointment.sugarLevel || patientData.sugarLevel} mg/dL` : "N/A"}</p>
                                        </div>
                                    </div>
                                    {/* Grid 3 */}
                                    {(appointment.temperature || appointment.pulse || appointment.spo2 || patientData.temperature || patientData.pulse || patientData.spo2) && (
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 border-t border-b border-[#DFE0E2] mb-4">
                                            {(appointment.temperature || patientData.temperature) && (
                                                <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                                    <p className="text-xs font-medium text-[#7B8089]">Temperature</p>
                                                    <p className="text-sm font-medium text-[#262D3B]">{appointment.temperature || patientData.temperature} °F</p>
                                                </div>
                                            )}

                                            {(appointment.pulse || patientData.pulse) && (
                                                <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                                    <p className="text-xs font-medium text-[#7B8089]">Pulse</p>
                                                    <p className="text-sm font-medium text-[#262D3B]">{appointment.pulse || patientData.pulse} bpm</p>
                                                </div>
                                            )}

                                            {(appointment.spo2 || patientData.spo2) && (
                                                <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                                    <p className="text-xs font-medium text-[#7B8089]">SPO2</p>
                                                    <p className="text-sm font-medium text-[#262D3B]">{appointment.spo2 || patientData.spo2} %</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Vitals details  */}

                    {/* Medical details - Only show if both vitals and medical info are complete */}
                    {isVitalsMedicalComplete && (
                        <div className="w-full overflow-hidden lg:rounded-[20px] lg:border lg:border-[#E3EEE1] lg:p-4 mb-4">
                            <h3 className="font-inter font-semibold text-[18px] md:text-[20px] lg:text-[24px] leading-[120%] text-[#262D3B] mb-4">Medical Information</h3>
                            <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-4 mb-4">
                                <h4 className="text-base font-medium leading-[120%] text-[#262D3B] flex gap-2 items-center mb-5">
                                    <Image src="/icons/medicalIcon.svg" alt="Medical info" width={20} height={20} /> Medical Information
                                </h4>
                                <div className="space-y-4">
                                    {appointment.isDiabetes !== undefined && appointment.isDiabetes !== null && (
                                        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-4 border-t border-b border-[#DFE0E2] mb-4">
                                            <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                                <p className="text-xs font-medium text-[#7B8089]">Diabetes</p>
                                                <p className="text-sm font-medium text-[#262D3B]">{appointment.isDiabetes ? "Yes" : "No"}</p>
                                            </div>
                                            <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                                <p className="text-xs font-medium text-[#7B8089]">Remarks</p>
                                                <p className="text-sm font-medium text-[#262D3B]">{appointment.diabetesRemarks || "N/A"}</p>
                                            </div>
                                        </div>
                                    )}
                                    {appointment.isHypertension !== undefined && appointment.isHypertension !== null && (
                                        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-4 border-t border-b border-[#DFE0E2] mb-4">
                                            <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                                <p className="text-xs font-medium text-[#7B8089]">HTN (Hypertension)</p>
                                                <p className="text-sm font-medium text-[#262D3B]">{appointment.isHypertension ? "Yes" : "No"}</p>
                                            </div>
                                            <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                                <p className="text-xs font-medium text-[#7B8089]">Remarks</p>
                                                <p className="text-sm font-medium text-[#262D3B]">{appointment.hypertensionRemarks || "N/A"}</p>
                                            </div>
                                        </div>
                                    )}
                                    {appointment.isCad !== undefined && appointment.isCad !== null && (
                                        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-4 border-t border-b border-[#DFE0E2] mb-4">
                                            <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                                <p className="text-xs font-medium text-[#7B8089]">Coronary Artery Disease</p>
                                                <p className="text-sm font-medium text-[#262D3B]">{appointment.isCad ? "Yes" : "No"}</p>
                                            </div>
                                            <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                                <p className="text-xs font-medium text-[#7B8089]">Remarks</p>
                                                <p className="text-sm font-medium text-[#262D3B]">{appointment.cadRemarks || "N/A"}</p>
                                            </div>
                                        </div>
                                    )}
                                    {appointment.isThyroid !== undefined && appointment.isThyroid !== null && (
                                        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-4 border-t border-b border-[#DFE0E2] mb-4">
                                            <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                                <p className="text-xs font-medium text-[#7B8089]">Thyroid</p>
                                                <p className="text-sm font-medium text-[#262D3B]">{appointment.isThyroid ? "Yes" : "No"}</p>
                                            </div>
                                            <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                                <p className="text-xs font-medium text-[#7B8089]">Remarks</p>
                                                <p className="text-sm font-medium text-[#262D3B]">{appointment.thyroidRemarks || "N/A"}</p>
                                            </div>
                                        </div>
                                    )}
                                    {appointment.isMenstrual !== undefined && appointment.isMenstrual !== null && (
                                        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-4 border-t border-b border-[#DFE0E2] mb-4">
                                            <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                                <p className="text-xs font-medium text-[#7B8089]">Menstrual</p>
                                                <p className="text-sm font-medium text-[#262D3B]">{appointment.isMenstrual ? "Yes" : "No"}</p>
                                            </div>
                                            <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                                <p className="text-xs font-medium text-[#7B8089]">Remarks</p>
                                                <p className="text-sm font-medium text-[#262D3B]">{appointment.menstrualRemarks || "N/A"}</p>
                                            </div>
                                        </div>
                                    )}
                                    {(patientData.addictionType?.length || patientData.addictionSpecify) && (
                                        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-4 border-t border-b border-[#DFE0E2] mb-4">
                                            <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                                <p className="text-xs font-medium text-[#7B8089]">Addiction</p>
                                                <p className="text-sm font-medium text-[#262D3B]">
                                                    {patientData.addictionType?.length
                                                        ? patientData.addictionType.map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(", ")
                                                        : "Other"}
                                                </p>
                                            </div>
                                            <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                                <p className="text-xs font-medium text-[#7B8089]">Specify</p>
                                                <p className="text-sm font-medium text-[#262D3B]">{patientData.addictionSpecify || "N/A"}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {(appointment.diagnosis?.name || patientData.diagnosis || appointment.subDiagnosis?.name || appointment.diagnosisSymptoms) && (
                                <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-4 mb-4">
                                    <h4 className="text-base font-medium leading-[120%] text-[#262D3B] flex gap-2 items-center mb-5">
                                        <Image src="/icons/patientinfo.svg" alt="Diagnosis info" width={20} height={20} /> Diagnosis Information
                                    </h4>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 border-t border-b border-[#DFE0E2] mb-4">
                                            <div className="space-y-1 border-r border-[#DFE0E2] last:border-0 py-[10px] px-4">
                                                <p className="text-xs font-medium text-[#7B8089]">Diagnosis</p>
                                                <p className="text-sm font-medium text-[#262D3B]">{appointment.diagnosis?.name || patientData.diagnosis || "N/A"}</p>
                                            </div>

                                            <div className="space-y-1 border-r border-[#DFE0E2] last:border-0 py-[10px] px-4">
                                                <p className="text-xs font-medium text-[#7B8089]">Sub Diagnosis</p>
                                                <p className="text-sm font-medium text-[#262D3B]">{appointment.subDiagnosis?.name || "N/A"}</p>
                                            </div>
                                            <div className="space-y-1 border-r border-[#DFE0E2] last:border-0 py-[10px] px-4">
                                                <p className="text-xs font-medium text-[#7B8089]">Symptoms</p>
                                                <p className="text-sm font-medium text-[#262D3B]">{appointment.diagnosisSymptoms || "N/A"}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {/* Medical details  */}

                </div>

            </div>

            {/* Send Address confirmation dialog */}
            <MessageDialog
                open={sendAddressConfirmOpen}
                onClose={() => setSendAddressConfirmOpen(false)}
                icon="/icons/Send.svg"
                iconBgColor="#E8F5E9"
                message="Are you sure you want to Send Address?"
                confirmText="Yes"
                cancelText="No"
                showCancel={true}
                onConfirm={handleSendAddressConfirm}
            />

            {/* Confirm Booking Details dialog */}
            <Dialog
                open={confirmBookingDialogOpen}
                onClose={closeConfirmBookingDialog}
                title="Confirm Booking Details"
                width={950}
            >
                <form onSubmit={handleConfirmBookingSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <FormInputField
                                label="Health Card *"
                                value={confirmBookingForm.jsHealthCard}
                                onChange={(e) => setConfirmBookingForm((prev) => ({ ...prev, jsHealthCard: e.target.value }))}
                                placeholder="Health Card"
                                required
                                height={44}
                            />
                            <FormSelectField
                                label="Doctor"
                                value={confirmBookingForm.doctor}
                                onChange={(value) => setConfirmBookingForm((prev) => ({ ...prev, doctor: typeof value === "string" ? value : Array.isArray(value) ? value[0] ?? "" : "" }))}
                                options={[{ label: "Dr. Suyash Pratap Singh", value: "1" }, { label: "Dr. Aatish Vashisht", value: "2" }]}
                                placeholder="Select"
                                mode="single"
                                background="white"
                            />
                            <FormSelectField
                                label="Govt Empanelment *"
                                value={confirmBookingForm.govtEmpanelment}
                                onChange={(value) => setConfirmBookingForm((prev) => ({ ...prev, govtEmpanelment: typeof value === "string" ? value : Array.isArray(value) ? value[0] ?? "" : "" }))}
                                options={[{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]}
                                placeholder="Select"
                                mode="single"
                                background="white"
                            />
                        </div>
                        <div className="space-y-4">
                            <FormSelectField
                                label="Booking Type"
                                value={confirmBookingForm.bookingType}
                                onChange={(value) => setConfirmBookingForm((prev) => ({ ...prev, bookingType: typeof value === "string" ? value : Array.isArray(value) ? value[0] ?? "" : "" }))}
                                options={[{ label: "OPD", value: "opd" }, { label: "IPD", value: "ipd" }]}
                                placeholder="Select"
                                mode="single"
                                background="white"
                            />
                            <FormSelectField
                                label="Consultancy Fee"
                                value={confirmBookingForm.consultancyFee}
                                onChange={(value) => setConfirmBookingForm((prev) => ({ ...prev, consultancyFee: typeof value === "string" ? value : Array.isArray(value) ? value[0] ?? "" : "" }))}
                                options={[{ label: "300", value: "300" }, { label: "500", value: "500" }]}
                                placeholder="Select"
                                mode="single"
                                background="white"
                            />
                            <FormSelectField
                                label="Package"
                                value={confirmBookingForm.packageOption}
                                onChange={(value) => setConfirmBookingForm((prev) => ({ ...prev, packageOption: typeof value === "string" ? value : Array.isArray(value) ? value[0] ?? "" : "" }))}
                                options={[{ label: "Basic", value: "basic" }, { label: "Standard", value: "standard" }]}
                                placeholder="Select"
                                mode="single"
                                background="white"
                            />
                        </div>
                    </div>
                    {/* Start Date and End Date: 50% width each, full row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                        <div className="min-w-0 w-full">
                            <DatePicker
                                label="Start Date"
                                value={confirmBookingForm.startDate}
                                onChange={(value) => setConfirmBookingForm((prev) => ({ ...prev, startDate: value }))}
                                placeholder="DD/MM/YY"
                                background="white"
                                width="100%"
                            />
                        </div>
                        <div className="min-w-0 w-full">
                            <DatePicker
                                label="End Date"
                                value={confirmBookingForm.endDate}
                                onChange={(value) => setConfirmBookingForm((prev) => ({ ...prev, endDate: value }))}
                                placeholder="DD/MM/YY"
                                background="white"
                                width="100%"
                            />
                        </div>
                    </div>
                    {/* Payment Remark: full width */}
                    <div className="w-full">
                        <FormTextareaField
                            label="Payment Remark"
                            value={confirmBookingForm.paymentRemark}
                            onChange={(e) => setConfirmBookingForm((prev) => ({ ...prev, paymentRemark: e.target.value }))}
                            placeholder="Payment Remark..."
                            height={94}
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="outline" size="large" type="button" onClick={closeConfirmBookingDialog}>
                            Cancel
                        </Button>
                        <Button variant="primary" size="large" type="submit">
                            Submit
                        </Button>
                    </div>
                </form>
            </Dialog>

            {/* Success Dialog */}
            <MessageDialog
                open={showSuccessDialog}
                onClose={() => setShowSuccessDialog(false)}
                icon="/icons/SuccessCheck.svg"
                iconBgColor="#E8F5E9"
                message={successMessage}
                confirmText="Success"
                showCancel={false}
                onConfirm={() => setShowSuccessDialog(false)}
            />

            {/* Error Dialog */}
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
        </AppShell>
    );
}

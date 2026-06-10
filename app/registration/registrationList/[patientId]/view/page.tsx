"use client";

import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { BackToPreviousPageButton } from "@/components/ui";
import { TableListingCard } from "@/components/ui/TableListingCard";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useGetAppointmentWithRegistrationQuery } from "@/store/api/registrationApi";
import { useLazyGetPresignedUrlQuery, useGetPatientFilesQuery } from "@/store/api/commonApi";
import { useMemo, useState, useCallback } from "react";

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
    const appointmentId = params?.patientId as string; // Note: patientId param now contains appointmentId

    // Fetch appointment with registration details
    const { data: appointmentData, isLoading, isError } = useGetAppointmentWithRegistrationQuery(
        { appointmentId: appointmentId || "" },
        { skip: !appointmentId }
    );

    const appointment = appointmentData?.data;
    const patientData = appointment?.registration; // Registration data is nested in appointment

    // Check if vitals and medical are added - use isVitalMedicalAdded from appointment
    const isVitalsMedicalComplete = useMemo(() => {
        if (!appointment) return false;
        return appointment.isVitalMedicalAdded === true;
    }, [appointment]);

    const uhid = patientData?.uhid ?? "";

    // Fetch patient files — tag-based invalidation ensures fresh data after upload
    const { data: patientFilesData, isLoading: isLoadingFiles } = useGetPatientFilesQuery(
        { uhid },
        { skip: !uhid, refetchOnMountOrArgChange: true }
    );

    const [getPresignedUrl] = useLazyGetPresignedUrlQuery();
    const [loadingFileId, setLoadingFileId] = useState<number | null>(null);

    const handleViewFile = useCallback(async (fileId: number, filePath: string) => {
        if (loadingFileId !== null) return; // prevent concurrent clicks
        setLoadingFileId(fileId);
        try {
            const result = await getPresignedUrl({ key: filePath }).unwrap();
            const signedUrl = result?.data?.signedUrl;
            if (signedUrl) {
                window.open(signedUrl, "_blank", "noopener,noreferrer");
            }
        } catch (err) {
            console.error("Failed to get presigned URL:", err);
        } finally {
            setLoadingFileId(null);
        }
    }, [getPresignedUrl, loadingFileId]);

    const patientFileRows = useMemo(() => {
        const files = patientFilesData?.data;
        if (!Array.isArray(files) || files.length === 0) return [];
        return files.map((file, index) => [
            <span key={`sr-${file.id}`} className="text-sm font-medium text-[#262D3B]">{index + 1}</span>,
            <span key={`fn-${file.id}`} className="text-sm font-medium text-[#262D3B]">{file.fileName || "—"}</span>,
            <span key={`ft-${file.id}`} className="text-sm font-medium text-[#262D3B]">{file.fileType || "—"}</span>,
            <span key={`ab-${file.id}`} className="text-sm font-medium text-[#262D3B]">{file.createdByName || "—"}</span>,
            <span key={`dt-${file.id}`} className="text-sm font-medium text-[#262D3B]">
                {file.createdAt
                    ? new Date(file.createdAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                    })
                    : "—"}
            </span>,
            <button
                key={`view-${file.id}`}
                type="button"
                disabled={loadingFileId !== null}
                onClick={() => handleViewFile(file.id, file.path)}
                className="inline-flex min-w-[60px] items-center justify-center rounded-[30px] bg-[#0B8C00] px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#096e00] disabled:cursor-not-allowed disabled:opacity-70"
            >
                {loadingFileId === file.id ? (
                    <span className="inline-flex items-center gap-[3px]">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white [animation-delay:-0.3s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white [animation-delay:-0.15s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white" />
                    </span>
                ) : (
                    "View"
                )}
            </button>,
        ]);
    }, [patientFilesData, loadingFileId, handleViewFile]);

    if (isLoading) {
        return (
            <AppShell>
                <div className="flex items-center justify-center min-h-screen">
                    <p>Loading...</p>
                </div>
            </AppShell>
        );
    }

    if (isError || !appointment || !patientData) {
        return (
            <AppShell>
                <div className="flex items-center justify-center min-h-screen">
                    <p>Error loading appointment details. Please try again.</p>
                </div>
            </AppShell>
        );
    }

    const jsHealthCardNoDisplay =
        typeof patientData.jsHealthCardNo === "string" ? patientData.jsHealthCardNo.trim() : "";
    const showHealthCardPreview = jsHealthCardNoDisplay.length > 0;

    return (
        <AppShell>
            <div className="space-y-8">
                <div className="flex items-start justify-between">
                    <PageHeading title="View Registration Form" />
                    <div className="px-5">
                        <BackToPreviousPageButton
                            iconOnly={true}
                            onClick={() => router.back()}
                        />
                    </div>
                </div>
                <div className="view-registration-container">
                    {/* personal details  */}
                    <div className="w-full overflow-hidden lg:rounded-[20px] lg:border lg:border-[#E3EEE1] lg:p-4 mb-4">
                        <h3 className="font-inter font-semibold text-[18px] md:text-[20px] lg:text-[24px] leading-[120%] text-[#262D3B] mb-4">Personal Information</h3>
                        <div className="grid grid-cols-12 gap-4 mb-4">
                            <div className={showHealthCardPreview ? "col-span-12 lg:col-span-9" : "col-span-12"}>
                                <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-4">
                                    <h4 className="text-base font-medium leading-[120%] text-[#262D3B] flex gap-2 items-center mb-5">
                                        <Image src="/icons/patientinfo.svg" alt="patient info" width={20} height={20} /> Patient Information
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
                                                <p className="text-xs font-medium text-[#7B8089]">JS Health Card No.</p>
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
                            </div>
                            {showHealthCardPreview && (
                                <div className="col-span-12 lg:col-span-3">
                                    <div className="flex h-full w-full items-center justify-center rounded-[20px] border border-[#E3EEE1] bg-white p-4">
                                        <div className="relative inline-block max-w-full">
                                            <Image
                                                src="/images/HealthCard.jpeg"
                                                alt="Health card preview"
                                                width={380}
                                                height={380}
                                                className="h-auto max-h-[380px] w-full max-w-[380px] object-contain"
                                            />
                                            <p
                                                className="absolute bottom-3 left-[22px] text-[13px] font-semibold tracking-[3px] text-[#fff71f] drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] sm:text-[15px] sm:tracking-[4px]"
                                                aria-label={`JS Health Card ${jsHealthCardNoDisplay}`}
                                            >
                                                {jsHealthCardNoDisplay}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
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
                                    <Image src="/icons/Referral.svg" alt="Referral info" width={20} height={20} /> Lead Source
                                </h4>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 border-t border-b border-[#DFE0E2] mb-4">
                                        <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                            <p className="text-xs font-medium text-[#7B8089]">Referral</p>
                                            <p className="text-sm font-medium text-[#262D3B]">{patientData.isReferral ? "Yes" : "No"}</p>
                                        </div>

                                        <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                            <p className="text-xs font-medium text-[#7B8089]">Lead Source</p>
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
                                        <p className="text-sm font-medium text-[#262D3B]">{appointment.doctor?.name || appointment.doctor?.userName || appointment.doctor?.email || "N/A"}</p>
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
                                        <p className="text-sm font-medium text-[#262D3B]">{appointment.doctorFee || patientData.payment?.doctorFee || "0"}</p>
                                    </div>

                                    <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                        <p className="text-xs font-medium text-[#7B8089]">Payment Mode</p>
                                        <p className="text-sm font-medium text-[#262D3B]">
                                            {String(appointment?.isConsultancyVoucherApplied ?? "").toLowerCase() === "yes"
                                                ? "OPD Voucher Applied"
                                                : Number(appointment?.doctorFee ?? patientData.payment?.doctorFee ?? 0) === 0
                                                    ? "0"
                                                    : capitalizeWords(patientData.payment?.paymentMode || patientData.schemeType || "Cash") +
                                                    (patientData.payment?.paymentMode === "credit" ? " (Online Payment)" : "")}
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
                                            <p className="text-sm font-medium text-[#262D3B]">{typeof appointment.allergies === "string" && appointment.allergies.trim() ? appointment.allergies.trim() : "No"}</p>
                                        </div>
                                    </div>
                                    {/* Grid 2 */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 border-t border-b border-[#DFE0E2] mb-4">
                                        <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                            <p className="text-xs font-medium text-[#7B8089]">Surgeries</p>
                                            <p className="text-sm font-medium text-[#262D3B]">{typeof appointment.surgeries === "string" && appointment.surgeries.trim() ? appointment.surgeries.trim() : "No"}</p>
                                        </div>

                                        <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4 md:px-0 lg:px-4 last:border-0">
                                            <p className="text-xs font-medium text-[#7B8089]">Diet Type</p>
                                            <p className="text-sm font-medium text-[#262D3B]">{patientData.dietType || "N/A"}</p>
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

                    {/* Patient Files Details */}
                    <div className="w-full overflow-hidden lg:rounded-[20px] lg:border lg:border-[#E3EEE1] lg:p-4 mb-4">
                        <h3 className="font-inter font-semibold text-[18px] md:text-[20px] lg:text-[24px] leading-[120%] text-[#262D3B] mb-4">Patient Files Details</h3>
                        <TableListingCard
                            sections={[
                                {
                                    id: "patient-files",
                                    isLoading: isLoadingFiles,
                                    columns: [
                                        { label: "Sr. No." },
                                        { label: "File Name" },
                                        { label: "File Type" },
                                        { label: "Added By" },
                                        { label: "Date" },
                                        { label: "File" },
                                    ],
                                    rows: patientFileRows,
                                    emptyMessage: "No patient files found.",
                                },
                            ]}
                        />
                    </div>
                    {/* Patient Files Details */}


                </div>

            </div>
        </AppShell>
    );
}

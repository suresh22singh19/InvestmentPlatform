"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { uploadAudioReturn } from "@/store/api/jatayuApi";
import {
    AppointmentDetailCard,
    type AppointmentDetailItem,
    DietPlanCard,
    type DietPlanEntry,
    type DietPlanHeaderAction,
    HealthCardPreview,
    MedicalInformationCard,
    type MedicalInformationItem,
    OtherInformationCard,
    type OtherInformationItem,
    PatientDetailsCard,
    type PatientDetailsBadge,
    type PatientDetailsInfoItem,
    type PatientWalletDetailItem,
    PatientWalletInformationCard,
    ReferralPatientInfoCard,
    type ReferralPatientInfoItem,
    VitalsCard,
    type VitalItem,
    PatientFilesCard,
    Button,
    BackToPreviousPageButton,
    VoiceDoctorNotesCard,
    FollowUpCard,
    TherapiesCard,
    DoctorConsultationFormCard,
    SpecializedPhysicalExamCard,
    ClinicalAssessmentRecord,
    SpinnerLoader,
    MessageDialog,
} from "@/components/ui";

async function convertBlobToFloat32Array(blob: Blob): Promise<number[]> {
    const arrayBuffer = await blob.arrayBuffer();
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
        throw new Error("Web Audio API is not supported in this browser.");
    }
    const audioCtx = new AudioContextClass();

    try {
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        const targetSampleRate = 16000;
        const numberOfChannels = 1; // mono

        const offlineCtx = new OfflineAudioContext(
            numberOfChannels,
            audioBuffer.duration * targetSampleRate,
            targetSampleRate
        );

        const bufferSource = offlineCtx.createBufferSource();
        bufferSource.buffer = audioBuffer;
        bufferSource.connect(offlineCtx.destination);
        bufferSource.start();

        const renderedBuffer = await offlineCtx.startRendering();
        const float32Data = renderedBuffer.getChannelData(0);
        return Array.from(float32Data);
    } finally {
        await audioCtx.close();
    }
}

export interface DoctorActivityProps {
    appointment: any;
    onBack: () => void;
    branchName?: string;
}

export default function DoctorActivity({
    appointment,
    onBack,
    branchName,
}: DoctorActivityProps) {
    const router = useRouter();
    const appData = appointment || {};

    // Consultation view step (1: Voice Record & Notes, 2: Diagnosis & Medicines, 3: Specialized & Physical Exam)
    const [step, setStep] = useState<1 | 2 | 3>(1);

    // Audio recording lifted state
    const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
    const [recordedDuration, setRecordedDuration] = useState(0);

    // API Upload state
    const [isUploading, setIsUploading] = useState(false);
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [apiErrorMessage, setApiErrorMessage] = useState("");

    // Therapies state
    const [therapies, setTherapies] = useState<string[]>([]);

    // Follow-Up Form state
    const [followUpDate, setFollowUpDate] = useState("");
    const [followUpRemarks, setFollowUpRemarks] = useState("");

    const consultationFormRef = useRef<{ validate: () => boolean }>(null);

    const handleSaveNextClick = async () => {
        if (step === 1) {
            if (recordedAudio) {
                setIsUploading(true);
                try {
                    const audioArray = await convertBlobToFloat32Array(recordedAudio);
                    const patientParts = (appData.patientName || "").trim().split(/\s+/);
                    const patientFirstName = patientParts[0] || "";
                    const patientLastName = patientParts.slice(1).join(" ") || "";

                    const doctorParts = (appData.doctorName || "").trim().split(/\s+/);
                    const doctorFirstName = doctorParts[0] || "";
                    const doctorLastName = doctorParts.slice(1).join(" ") || "";

                    let genderValue: "Male" | "Female" | "Other" = "Other";
                    if (appData.gender) {
                        const g = appData.gender.trim().toLowerCase();
                        if (g === "male") genderValue = "Male";
                        else if (g === "female") genderValue = "Female";
                    }

                    const ageValue = Number(appData.age) || 0;

                    const fieldsObject = {
                        doctorInfo: {
                            emailID: "jeena1sikho@gmail.com",
                            doctorID: String(appData.doctorId || ""),
                            firstName: doctorFirstName,
                            lastName: doctorLastName,
                            clinicName: "HIIMS",
                            clinicLocation: appData.branchName || branchName || "",
                            doctorSpecialization: "",
                            clinicPincode: "",
                            remarks: ""
                        },
                        metadata: {
                            visitId: String(appData.appointmentId || ""),
                            visitType: "first",
                            timestamp: new Date().toISOString(),
                            timezone: "Asia/Kolkata",
                            provider: {
                                doctorName: appData.doctorName || "",
                                doctorId: String(appData.doctorId || "")
                            },
                            language: "en",
                            source: "VoiceDocAI",
                            version: "1.0",
                            transcriptKey: ""
                        },
                        patientInfo: {
                            patientID: String(appData.uhid || ""),
                            firstName: patientFirstName,
                            lastName: patientLastName,
                            gender: genderValue,
                            age: ageValue,
                            language: "en",
                            remarks: ""
                        }
                    };

                    await uploadAudioReturn({
                        audio: audioArray,
                        email: "jeena1sikho@gmail.com",
                        fields: fieldsObject,
                        name: `appointment_${appData.appointmentId || "recording"}.wav`,
                        source: "med",
                    });
                    setStep(2);
                } catch (err: any) {
                    console.error("Audio processing API error:", err);
                    setApiErrorMessage(err.message || "Failed to process voice recording.");
                    setShowErrorDialog(true);
                } finally {
                    setIsUploading(false);
                }
            } else {
                setStep(2);
            }
        } else if (step === 2) {
            if (consultationFormRef.current) {
                const isValid = consultationFormRef.current.validate();
                if (!isValid) {
                    return; // Prevent transitioning to next step if validation fails
                }
            }
            setStep(3);
        } else {
            onBack();
        }
    };

    // Helpers
    const BLOOD_GROUP_MAP: Record<string, string> = {
        "a-positive": "A+",
        "a-negative": "A-",
        "b-positive": "B+",
        "b-negative": "B-",
        "ab-positive": "AB+",
        "ab-negative": "AB-",
        "o-positive": "O+",
        "o-negative": "O-",
    };

    const getBloodGroupLabel = (val: string) => {
        if (!val) return "N/A";
        const key = val.toLowerCase().trim();
        return BLOOD_GROUP_MAP[key] || val;
    };

    const capitalizeFirstLetter = (str: string) => {
        if (!str) return "N/A";
        const val = str.toLowerCase().trim();
        return val.charAt(0).toUpperCase() + val.slice(1);
    };

    const formatAddiction = (val: any) => {
        if (!val) return "N/A";
        let items: string[] = [];
        if (Array.isArray(val)) {
            items = val;
        } else if (typeof val === "string") {
            const trimmedVal = val.trim();
            if (trimmedVal.startsWith("[") && trimmedVal.endsWith("]")) {
                try {
                    items = JSON.parse(trimmedVal);
                } catch (e) {
                    items = trimmedVal.split(",");
                }
            } else {
                items = trimmedVal.split(",");
            }
        } else {
            return "N/A";
        }

        const formatted = items
            .map((item) => {
                if (typeof item !== "string") return "";
                const t = item.trim().toLowerCase();
                if (!t) return "";
                return t.charAt(0).toUpperCase() + t.slice(1);
            })
            .filter(Boolean);

        return formatted.length > 0 ? formatted.join(", ") : "N/A";
    };

    // 1. Patient Details Card
    const patientName = appData.patientName || "N/A";
    const genderLabel = capitalizeFirstLetter(appData.gender);
    const patientSubtitle = `Contact Number: ${appData.contactNumber || "N/A"} • Age : ${appData.age || "N/A"} Years • Gender : ${genderLabel}`;
    const bloodGroupLabel = getBloodGroupLabel(appData.bloodGroup);
    const patientBadges: PatientDetailsBadge[] = [
        ...(bloodGroupLabel && bloodGroupLabel !== "N/A" ? [{
            label: bloodGroupLabel,
            className: "inline-flex h-[30px] min-w-[76px] me-2 items-center justify-center rounded-[30px] border px-4 text-xs font-semibold border-[#F6776E]/20 bg-[#F6776E0D] text-[#F6776E]"
        }] : []),
        ...(appData.panelName ? [{
            label: appData.panelName,
            className: "inline-flex h-[30px] min-w-[76px] items-center justify-center rounded-[30px] border px-4 text-xs font-semibold border-[#0B8C00]/20 bg-[rgba(11,140,0,0.05)] text-[#0B8C00]"
        }] : [])
    ];
    const patientInfoItems: PatientDetailsInfoItem[] = [
        {
            iconSrc: "/icons/UserGear.svg",
            iconAlt: "Father/Husband",
            label: "Father’s/Husband’s Name",
            value: appData.guardianName ? `${appData.guardianTitle || ""} ${appData.guardianName}`.trim() : "N/A",
        },
        {
            iconSrc: "/icons/gendericon.svg",
            iconAlt: "Marital Status",
            label: "Marital Status",
            value: capitalizeFirstLetter(appData.maritalStatus),
        },
        {
            iconSrc: "/icons/mapicon.svg",
            iconAlt: "Address",
            label: "Address",
            value: [
                appData.address,
                appData.addressLine1,
                appData.addressLine2,
                appData.area,
                appData.tehsil,
                appData.city,
                appData.state,
                appData.country,
                appData.pinCode
            ].filter((val) => val && val.toString().trim().toLowerCase() !== "null")
                .map((v) => v.toString().trim())
                .filter(Boolean)
                .join(", ") || "N/A",
        },
        {
            iconSrc: "/icons/adharcardicon.svg",
            iconAlt: "Aadhar Card Number",
            label: "Aadhar Card Number",
            value: appData.aadharCardNo || "N/A",
        },
    ];

    // 2. Vitals Card
    const vitalsItems: VitalItem[] = [
        { label: "Blood Pressure", value: appData.bloodPressure || "N/A", unit: "bp" },
        { label: "Sugar Level", value: appData.sugarLevel || "N/A", unit: "mg/dL" },
        { label: "Temperature", value: appData.temperature || "N/A", unit: "" },
        { label: "Heart Rate", value: appData.pulse || "N/A", unit: "bpm" },
    ];

    // 3. Medical Information Card
    const medicalItems: MedicalInformationItem[] = [
        { label: "Diagnosis", value: appData.diagnosisName || "N/A" },
        { label: "Disease", value: appData.subDiagnosisName || "N/A" },
        { label: "Blood Group", value: getBloodGroupLabel(appData.bloodGroup) },
        { label: "Allergies", value: appData.allergies || "N/A" },
        { label: "Surgeries", value: appData.surgeries || "N/A" },
        {
            label: "Addiction",
            value: (() => {
                const formatted = formatAddiction(appData.addictionType);
                if (formatted === "N/A") return "N/A";
                return appData.addictionSpecify
                    ? `${formatted} (${appData.addictionSpecify})`
                    : formatted;
            })(),
        },
        { label: "Height", value: appData.height || "N/A" },
        { label: "Weight", value: appData.weight || "N/A" },
        { label: "Diet Type", value: appData.dietType || "N/A" },
        { label: "Remarks", value: appData.diagnosisRemarks || "N/A", multiline: true },
    ];

    // 4. Other Information Card
    const otherInfoItems: OtherInformationItem[] = [
        { label: "Patient Type", value: appData.panelName || "N/A" },
        // { label: "Patient Sub Type", value: "N/A" },
        { label: "Beneficiary ID", value: appData.benificiaryId || "N/A" },
        { label: "Insurance Company", value: appData.insuranceCompany || "N/A" },
        // { label: "Agent Name", value: "N/A" },
    ];

    // 5. Diet Plan Card
    const dietPlanHeaderActions: DietPlanHeaderAction[] = [
        { iconSrc: "/icons/dietedit.svg", iconAlt: "Diet Edit", href: "#" },
        { iconSrc: "/icons/dietprint.svg", iconAlt: "Diet Print", href: "#" },
        { iconSrc: "/icons/dietadd.svg", iconAlt: "Diet Add", href: "#" },
    ];
    const dietPlanRows: DietPlanEntry[][] = [
        [
            { label: "Dinner Time", value: "N/A" },
            { label: "Sleeping time", value: "N/A" },
            { label: "Wake up time", value: "N/A" },
        ],
        [
            { label: "Little Millet", value: "N/A" },
            { label: "Barnyard Millet", value: "N/A" },
            { label: "Kodo Millet", value: "N/A" },
        ],
    ];

    // 6. Appointment Detail Card
    const appointmentItems: AppointmentDetailItem[] = [
        { label: "UHID", value: appData.uhid || "N/A" },
        { label: "OPD ID", value: appData.appointmentId?.toString() || "N/A" },
        { label: "Branch", value: appData.branchName || branchName || "N/A" },
        { label: "Doctor", value: appData.doctorName || "N/A" },
        { label: "Doctor OPD Fee", value: appData.doctorFee || "N/A" },
        { label: "Appointment Date", value: appData.appointmentDate ? new Date(appData.appointmentDate).toLocaleDateString('en-GB') : "N/A" },
        { label: "Time Slot", value: appData.timeSlot || "N/A" },
        { label: "Created Date", value: appData.createdAt ? new Date(appData.createdAt).toLocaleDateString('en-GB') : "N/A" },
        { label: "Remark", value: appData.diagnosisRemarks || "N/A", multiline: true },
    ];

    // 7. Patient Wallet Information Card
    const walletDetails: PatientWalletDetailItem[] = [
        { label: "Package", value: "N/A" },
        { label: "Amount", value: "N/A" },
        { label: "Discount", value: "N/A" },
        { label: "Expire", value: "N/A" },
    ];

    // 8. Referral Detail Card
    const referralItems: ReferralPatientInfoItem[] = [
        { label: "Source", value: appData.source || appData.sourceOfReference || "N/A" },
        { label: "Sub Source", value: appData.subSource || "N/A" },
        { label: "Referral Doctor", value: appData.referralDoctor || "N/A" },
        { label: "Referral Name", value: appData.referralName || "N/A" },
        { label: "Mobile", value: appData.referralMobile || "N/A" },
    ];

    return (
        <AppShell>
            <div className="space-y-6 max-w-full mx-auto pb-10">

                {/* Header Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <PageHeading title="New Appointment" />
                    </div>
                    <BackToPreviousPageButton
                        text="Back"
                        onClick={onBack}
                    />
                </div>

                {/* 2-Column Responsive Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

                    {/* Left Column (col-span-8) */}
                    <div className="lg:col-span-8 space-y-0">

                        <div className="grid grid-cols-2 gap-4">

                            <PatientDetailsCard
                                name={patientName}
                                subtitle={patientSubtitle}
                                badges={patientBadges}
                                infoItems={patientInfoItems}
                            />

                            {/* Vitals Card */}
                            <VitalsCard items={vitalsItems} />
                        </div>

                        {/* Dynamic Step View Container */}
                        {step === 1 && (
                            <>
                                <VoiceDoctorNotesCard
                                    onAudioBlobChange={(blob, duration) => {
                                        setRecordedAudio(blob);
                                        setRecordedDuration(duration);
                                    }}
                                />
                            </>
                        )}
                        {step === 2 && (
                            <>
                                <DoctorConsultationFormCard ref={consultationFormRef} />
                            </>
                        )}
                        {step === 3 && (
                            <>
                                <ClinicalAssessmentRecord
                                    onComplete={handleSaveNextClick}
                                    initialGender={appData.gender ? (appData.gender.charAt(0).toUpperCase() + appData.gender.slice(1).toLowerCase()) : "Male"}
                                />
                            </>
                        )}
                        {step !== 3 && (
                            <div className="flex justify-end pt-5">
                                <Button
                                    variant="primary"
                                    size="large"
                                    onClick={handleSaveNextClick}
                                    disabled={isUploading}
                                    className="flex items-center gap-2"
                                >
                                    {isUploading ? (
                                        <>
                                            <SpinnerLoader size={16} color="white" />
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <span>Save & Next</span>
                                    )}
                                </Button>
                            </div>
                        )}

                    </div>

                    {/* Right Column (col-span-4) */}
                    <div className="lg:col-span-4 space-y-6">

                        {/* Health Card Preview */}
                        <HealthCardPreview cardNumber={appData.jsHealthCardNo || "N/A"} />

                        {/* Medical Information */}
                        <MedicalInformationCard items={medicalItems} />

                        {/* Patient Files (Empty state) */}
                        <PatientFilesCard items={[]} plainEmptyState={true} />

                        {/* Other Information */}
                        <OtherInformationCard items={otherInfoItems} />


                        {/* Appointment Detail */}
                        <AppointmentDetailCard items={appointmentItems} />

                        {/* Patient Wallet Information */}
                        <PatientWalletInformationCard
                            remainingAmount="N/A"
                            details={walletDetails}
                            onActionClick={() => alert("Wallet details click (Demo Only)")}
                        />

                        {/* Referral Detail */}
                        <ReferralPatientInfoCard items={referralItems} />

                        {/* Custom Follow-Up Card */}
                        <FollowUpCard
                            followUpDate={followUpDate}
                            onFollowUpDateChange={setFollowUpDate}
                            followUpRemarks={followUpRemarks}
                            onFollowUpRemarksChange={setFollowUpRemarks}
                        />

                        {/* Custom Therapies Card */}
                        <TherapiesCard
                            therapies={therapies}
                            onTherapiesChange={setTherapies}
                        />

                    </div>

                </div>

            </div>
            {/* API Upload Error Dialog */}
            <MessageDialog
                open={showErrorDialog}
                onClose={() => setShowErrorDialog(false)}
                icon="/icons/CrossIcon.svg"
                iconBgColor="#FFEBEE"
                message={apiErrorMessage || "Failed to process voice recording."}
                confirmText="OK"
                showCancel={false}
                onConfirm={() => setShowErrorDialog(false)}
            />
        </AppShell>
    );
}

"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
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
    type PatientFileItem,
    Button,
    VoiceDoctorNotesCard,
    FollowUpCard,
    TherapiesCard,
    DoctorConsultationFormCard,
    SpecializedPhysicalExamCard,
    ClinicalAssessmentRecord,
} from "@/components/ui";

// Mock data to match user's screenshot exactly
const APPOINTMENT_DETAIL_ITEMS: AppointmentDetailItem[] = [
    { label: "UHID", value: "450560563035" },
    { label: "OPD ID", value: "653471" },
    { label: "Branch", value: "Jeena Sikho H.Q." },
    { label: "Doctor", value: "Dr. Jayesh Pratap Singh" },
    { label: "Doctor OPD Fee", value: "300" },
    { label: "Entry Fee", value: "100" },
    { label: "Appointment Date", value: "28-07-2025" },
    { label: "Time Slot", value: "10:11:53" },
    { label: "Consent Date", value: "28-07-2025 10:34 AM" },
    {
        label: "Remark",
        value: "Mild stomach discomfort and reduced appetite for the past 24 hours.",
        multiline: true,
    },
];

const PATIENT_WALLET_DETAILS: PatientWalletDetailItem[] = [
    { label: "Package", value: "Naturopathy Male" },
    { label: "Amount", value: "Rs. 22000" },
    { label: "Discount", value: "0%" },
    { label: "Expire", value: "01 May 2026" },
];

const REFERRAL_DETAIL_ITEMS: ReferralPatientInfoItem[] = [
    { label: "Source", value: "N/A" },
    { label: "Sub Source", value: "N/A" },
    { label: "Referral Doctor", value: "N/A" },
    { label: "Referral Name", value: "N/A" },
    { label: "Mobile", value: "N/A" },
];

const OTHER_INFORMATION_ITEMS: OtherInformationItem[] = [
    { label: "Patient Type", value: "Private" },
    { label: "Patient Sub Type", value: "N/A" },
    { label: "Beneficiary ID", value: "N/A" },
    { label: "Insurance Company", value: "N/A" },
    { label: "Agent Name", value: "N/A" },
];

const PATIENT_DETAILS_BADGES: PatientDetailsBadge[] = [
    {
        label: "AB+",
        className:
            "inline-flex h-[30px] min-w-[76px] me-2 items-center justify-center rounded-[30px] border px-4 text-xs font-semibold border-[#F6776E]/20 bg-[#F6776E0D] text-[#F6776E]",
    },
    {
        label: "Private",
        className:
            "inline-flex h-[30px] min-w-[76px] items-center justify-center rounded-[30px] border px-4 text-xs font-semibold border-[#0B8C00]/20 bg-[rgba(11,140,0,0.05)] text-[#0B8C00]",
    },
];

const PATIENT_DETAILS_INFO_ITEMS: PatientDetailsInfoItem[] = [
    {
        iconSrc: "/icons/UserGear.svg",
        iconAlt: "Father/Husband",
        label: "Father’s/Husband’s Name",
        value: "Edward jones",
    },
    {
        iconSrc: "/icons/gendericon.svg",
        iconAlt: "Marital Status",
        label: "Marital Status",
        value: "Married",
    },
    {
        iconSrc: "/icons/mapicon.svg",
        iconAlt: "Address",
        label: "Address",
        value: "D-238 , Street no.-10 , pitampura , Delhi-110092",
    },
    {
        iconSrc: "/icons/adharcardicon.svg",
        iconAlt: "Aadhar Card Number",
        label: "Aadhar Card Number",
        value: "135331313131",
    },
];

const VITALS_ITEMS: VitalItem[] = [
    { label: "Blood Pressure", value: "125/85", unit: "bp" },
    { label: "Sugar Level", value: "115", unit: "mg/dL" },
    { label: "Temperature", value: "98", unit: "" },
    { label: "Heart Rate", value: "92", unit: "bpm" },
];

const DIET_PLAN_HEADER_ACTIONS: DietPlanHeaderAction[] = [
    { iconSrc: "/icons/dietedit.svg", iconAlt: "Diet Edit", href: "#" },
    { iconSrc: "/icons/dietprint.svg", iconAlt: "Diet Print", href: "#" },
    { iconSrc: "/icons/dietadd.svg", iconAlt: "Diet Add", href: "#" },
];

const DIET_PLAN_ROWS: DietPlanEntry[][] = [
    [
        { label: "Dinner Time", value: "09:00" },
        { label: "Sleeping time", value: "10:00" },
        { label: "Wake up time", value: "06:00" },
    ],
    [
        { label: "Little Millet", value: "6 days" },
        { label: "Barnyard Millet", value: "5 days" },
        { label: "Kodo Millet", value: "5 days" },
    ],
    [
        { label: "Foxtail Millet", value: "6 days" },
        { label: "Browtop Millet", value: "5 days" },
        { label: "Room Service", value: "Yes" },
    ],
];

const MEDICAL_INFORMATION_ITEMS: MedicalInformationItem[] = [
    { label: "Diagnosis", value: "Alopecia" },
    { label: "Disease", value: "Alopecia Areata" },
    { label: "Blood Group", value: "A+" },
    { label: "Allergies", value: "No" },
    { label: "Surgeries", value: "No" },
    { label: "Addiction", value: "No" },
    { label: "Height", value: "5.8" },
    { label: "Weight", value: "80kg" },
    { label: "Diet Type", value: "Vegetarian" },
    {
        label: "Remarks",
        value: "Mild stomach discomfort and reduced appetite for the past 24 hours.",
        multiline: true,
    },
];

const PATIENT_FILE_ITEMS: PatientFileItem[] = [
    { name: "Checkup Result.pdf", size: "230kb" },
    { name: "dental x-ray result.pdf", size: "230kb" },
    { name: "Medical Presentation.pdf", size: "150kb" },
    { name: "dental x-ray result.pdf", size: "150kb" },
    { name: "Medical Prescription.pdf", size: "150kb" },
];

function TodayAppointmentContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const patientName = searchParams?.get("name") || "Jacob Jones";
    const patientGender = searchParams?.get("gender") || "Male";
    const patientAge = searchParams?.get("age") || "40";
    const patientContact = searchParams?.get("contact") || "XXXXX35353";

    // Consultation view step (1: Voice Record & Notes, 2: Diagnosis & Medicines, 3: Specialized & Physical Exam)
    const [step, setStep] = useState<1 | 2 | 3>(1);

    // Therapies state
    const [therapies, setTherapies] = useState<string[]>([]);
    const [showAddTherapy, setShowAddTherapy] = useState(false);

    // Follow-Up Form state
    const [followUpDate, setFollowUpDate] = useState("");
    const [followUpRemarks, setFollowUpRemarks] = useState("");

    const consultationFormRef = useRef<{ validate: () => boolean }>(null);

    const handleSaveNextClick = () => {
        if (step === 1) {
            setStep(2);
        } else if (step === 2) {
            if (consultationFormRef.current) {
                const isValid = consultationFormRef.current.validate();
                if (!isValid) {
                    return; // Prevent transitioning to next step if validation fails
                }
            }
            setStep(3);
        } else {
            router.push("/today-appointment");
        }
    };

    return (
        <AppShell>
            <div className="space-y-6 max-w-full mx-auto pb-10">

                {/* Header Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <PageHeading title="New Appointment" />
                    </div>

                </div>

                {/* 2-Column Responsive Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

                    {/* Left Column (col-span-8) */}
                    <div className=" lg:col-span-8 space-y-0">

                        <div className="grid grid-cols-2 gap-4">

                            <PatientDetailsCard
                                name={patientName}
                                subtitle={`Contact Number: ${patientContact} • Age : ${patientAge} Years • Gender : ${patientGender}`}
                                badges={PATIENT_DETAILS_BADGES}
                                infoItems={PATIENT_DETAILS_INFO_ITEMS}
                            />

                            {/* Vitals Card */}
                            <VitalsCard items={VITALS_ITEMS} />
                        </div>
                        {/* Patient Details Card */}

                        {/* Dynamic Step View Container */}
                        {step === 1 && (
                            <>
                                {/* This is Step 1 */}
                                {/* Merged Voice Recording and Doctor's Notes Card Section */}
                                <VoiceDoctorNotesCard />
                                {/* This is Step 1 */}
                            </>
                        )}
                        {step === 2 && (
                            <>
                                {/* This is Step 2 */}
                                <DoctorConsultationFormCard ref={consultationFormRef} />
                                {/* This is Step 2 */}
                            </>
                        )}
                        {step === 3 && (
                            <>
                                {/* This is Step 3 */}
                                <ClinicalAssessmentRecord onComplete={handleSaveNextClick} initialGender={patientGender} />
                                {/* This is Step 3 */}
                            </>
                        )}
                        {step !== 3 && (
                            <div className="flex justify-end pt-5">
                                <Button variant="primary" size="large" onClick={handleSaveNextClick}>
                                    Save & Next
                                </Button>
                            </div>
                        )}

                    </div>

                    {/* Right Column (col-span-4) */}
                    <div className="lg:col-span-4 space-y-6">

                        {/* Health Card Preview */}
                        <HealthCardPreview cardNumber="505030333879" />

                        {/* Medical Information */}
                        <MedicalInformationCard items={MEDICAL_INFORMATION_ITEMS} />

                        {/* Patient Files */}
                        <PatientFilesCard items={PATIENT_FILE_ITEMS} plainEmptyState={true} />

                        {/* Other Information */}
                        <OtherInformationCard items={OTHER_INFORMATION_ITEMS} />

                        {/* Diet Plan */}
                        <DietPlanCard
                            decoctionValue="Kadha"
                            headerActions={DIET_PLAN_HEADER_ACTIONS}
                            rows={DIET_PLAN_ROWS}
                            roomService="Yes"
                        />

                        {/* Appointment Detail */}
                        <AppointmentDetailCard items={APPOINTMENT_DETAIL_ITEMS} />

                        {/* Patient Wallet Information */}
                        <PatientWalletInformationCard
                            remainingAmount="Rs. 7000.00"
                            details={PATIENT_WALLET_DETAILS}
                            onActionClick={() => alert("Wallet details click (Demo Only)")}
                        />

                        {/* Referral Detail */}
                        <ReferralPatientInfoCard items={REFERRAL_DETAIL_ITEMS} />

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
        </AppShell>
    );
}

export default function TodayAppointmentPage() {
    return (
        <Suspense fallback={
            <AppShell>
                <div className="py-12 text-center text-sm text-[#9CA3AF]">
                    Loading appointment details...
                </div>
            </AppShell>
        }>
            <TodayAppointmentContent />
        </Suspense>
    );
}

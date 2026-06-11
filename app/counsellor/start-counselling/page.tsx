"use client";

import { useState, useMemo, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { Badge, ViewAppointment, BackToPreviousPageButton, MessageDialog } from "@/components/ui";
import RoomAllocation from "./roomAllowcation";
import AdmissionPayment from "./admission&payment";
import CreatePackage from "./createPackage";
import { useSearchParams } from "next/navigation";
import {
    useGetReferredPatientsQuery,
    useLazyGetPatientDetailQuery,
    useLazyGetPatientDetailByAppointmentQuery,
    type CounsellorPatientListItem,
} from "@/store/api/counsellorApi";
import type { PackageItem } from "@/store/api/settingsApi";

function findReferredPatientRow(
    data: CounsellorPatientListItem[] | undefined,
    patientIdParam: number | null
) {
    if (!data || patientIdParam == null) return undefined;
    return data.find(
        (d) => Number(d.patientId) === patientIdParam || Number(d.id) === patientIdParam
    );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function StartCounsellingPage() {
    // Controlled Package Selection States
    const [selectedPackageId, setSelectedPackageId] = useState("");
    const [activePackage, setActivePackage] = useState<PackageItem | null>(null);
    const [numberOfDays, setNumberOfDays] = useState(5);
    const [applyOffer, setApplyOffer] = useState(true);
    const [offerTab, setOfferTab] = useState("bundled");
    const [selectedOfferId, setSelectedOfferId] = useState("");
    const [finalAmountPayable, setFinalAmountPayable] = useState(0);
    const [admissionType, setAdmissionType] = useState("");
    const [counsellingMeta, setCounsellingMeta] = useState({
        patientCategory: "Panel",
        diseaseType: "Other",
        packageAdmissionType: "Day Care",
        applyOfferLabel: "Not Applied",
    });
    const searchParams = useSearchParams();
    const patientIdParam = Number(searchParams?.get("patientID")) || null;
    const counsellingRecordIdParam = Number(searchParams?.get("id")) || null;
    // const activeCard = searchParams?.get("activeCard") || "referred";

    const referredParams = {
    search: undefined,
    sortBy: "",
    order: "ASC" as const,
    page: 1,
    limit: 500,
  };

  const {
    data: referredRes,
    isLoading: isReferredLoading,
  } = useGetReferredPatientsQuery(referredParams, { skip: !patientIdParam });

  const rowfilterbyId = useMemo(
    () => findReferredPatientRow(referredRes?.data, patientIdParam),
    [referredRes, patientIdParam]
  );
  const getpatientName = rowfilterbyId ? `${rowfilterbyId.patientName || "N/A"}` : "N/A";
  const getpatientUhid = rowfilterbyId ? `${rowfilterbyId.patientUhid || "N/A" }` : "N/A";
  const getdiagnosisSymptoms = rowfilterbyId ? `${rowfilterbyId.diagnosisSymptoms || "N/A"} ` : "N/A";
  const getpatientBranchId = rowfilterbyId ? `${rowfilterbyId.branchId || "N/A"} ` : "N/A";
  const getpatientStatus = rowfilterbyId ? `${rowfilterbyId.status || "N/A"} ` : "N/A";


    // Stepper State
    const [currentStep, setCurrentStep] = useState(1);
    const showRoomStep = admissionType !== "scheduled";
    const paymentStepNumber = showRoomStep ? 3 : 2;
    const isOnRoomStep = showRoomStep && currentStep === 2;
    const isOnPaymentStep = currentStep === paymentStepNumber;

    useEffect(() => {
        if (!showRoomStep && currentStep === 3) {
            setCurrentStep(2);
        }
    }, [showRoomStep, currentStep]);
    const [viewAppointmentMode, setViewAppointmentMode] = useState(false);
    const [getPatientDetail] = useLazyGetPatientDetailQuery();
    const [getPatientDetailByAppointment] = useLazyGetPatientDetailByAppointmentQuery();
    const [isViewPatientLoading, setIsViewPatientLoading] = useState(false);
    const [fetchedPatientData, setFetchedPatientData] = useState<any>(null);
    const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
    const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
    const [apiErrorMessage, setApiErrorMessage] = useState("");

    const patientDetailId =
        counsellingRecordIdParam ||
        rowfilterbyId?.patientId ||
        patientIdParam;

    const handleViewPatientOverview = async () => {
        // const isReferredFlow = activeCard === "referred";
           const isReferredFlow = patientIdParam !== null;
        const idToFetch = isReferredFlow ? patientIdParam : patientDetailId;

        if (!idToFetch) {
            setApiErrorMessage("Patient ID not found. Please return to the dashboard and select a patient.");
            setShowApiErrorDialog(true);
            return;
        }

        setIsViewPatientLoading(true);
        try {
            const res = isReferredFlow
                ? await getPatientDetailByAppointment(patientIdParam!).unwrap()
                : await getPatientDetail(idToFetch).unwrap();
            if (res && res.success) {
                setFetchedPatientData(res.data);
                const opid = res.data?.appointmentDetail?.opid;
                setSelectedAppointmentId(
                    opid != null && opid !== ""
                        ? Number(opid)
                        : isReferredFlow
                            ? patientIdParam
                            : null
                );
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
            setIsViewPatientLoading(false);
        }
    };

    // Dynamic calculations based on selection
    const roomRentPerDay = activePackage?.branchRoomType?.roomRentPrice ? Number(activePackage.branchRoomType.roomRentPrice) : 0;
    const medicinePerDay = activePackage?.medicineEnabled ? Number(activePackage.medicinePrice) : 0;
    const mealsPerDay = activePackage?.mealsEnabled ? Number(activePackage.mealsPrice) : 0;
    const doctorFee = activePackage?.doctorFeeEnabled ? Number(activePackage.doctorFeePrice) : 0;
    const nurseFee = activePackage?.nurseFeeEnabled ? Number(activePackage.nurseFeePrice) : 0;
    const attendantFee = activePackage?.attendantFeeEnabled ? Number(activePackage.attendantFeePrice) : 0;
    const therapyFee = activePackage?.therapyEnabled ? Number(activePackage.therapyPrice) : 0;

    return (
        <AppShell>
            {viewAppointmentMode ? (
                <div className="flex flex-col gap-6">
                    <div className="flex items-start justify-between">
                        <PageHeading title="View" />
                        <BackToPreviousPageButton
                            text="Back"
                            onClick={() => {
                                setViewAppointmentMode(false);
                                setFetchedPatientData(null);
                                setSelectedAppointmentId(null);
                            }}
                        />
                    </div>
                    {(() => {
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
                                value: patDetails.fatherHusbandName || patDetails.guardianName || "N/A",
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
                            { label: "Height", value: patDetails.height || medInfo.height || "N/A" },
                            { label: "Weight", value: patDetails.weight || medInfo.weight || "N/A" },
                            { label: "Diet Type", value: medInfo.dietType || "N/A" },
                            { label: "Remark", value: medInfo.remark || "N/A", multiline: true },
                        ];

                        const otherInfoItems = [
                            { label: "Patient Type", value: otherInfo.patientType || "N/A" },
                            { label: "Patient Sub Type", value: otherInfo.patientSubType || "N/A" },
                            { label: "Beneficiary ID", value: "N/A" },
                            { label: "Insurance Company", value: "N/A" },
                            { label: "Ayush Covered", value: "N/A" },
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
                            <ViewAppointment
                                appointmentId={selectedAppointmentId ?? undefined}
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
                        );
                    })()}
                </div>
            ) : (
                <>
                    {/* 1. TOP HEADER & STEPPER SECTION */}
                    <div className="w-full flex flex-col md:flex-row justify-between items-start md:items-center rounded-[20px] gap-6 select-none">
                        {/* Left Side: Header Dynamic Title */}
                        {currentStep === 1 ? (
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-[8px] bg-[#E3EEE1] text-[#0B8C00] font-extrabold text-xl flex items-center justify-center select-none shadow-inner">
                                    {getpatientName
                                        .trim()
                                        .split(/\s+/)
                                        .map((word) => word.charAt(0).toUpperCase())
                                        .slice(0, 2)
                                        .join("")}
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-xl font-bold text-[#262D3B]">{getpatientName}</h2>
                                        <Badge
                                            variant="success"
                                            className="text-xs font-semibold uppercase tracking-wider select-none"
                                        >
                                            {getpatientStatus}
                                        </Badge>
                                    </div>
                                    <p className="text-xs font-semibold text-[#787E8C] tracking-wide">
                                        UHID: <span className="text-[#262D3B] font-bold">{getpatientUhid}</span> • Diagnosis: <span className="text-[#262D3B] font-bold">{getdiagnosisSymptoms}</span>
                                    </p>
                                </div>
                            </div>
                        ) : isOnRoomStep ? (
                            <PageHeading title="Room Allocation" />
                        ) : isOnPaymentStep ? (
                            <PageHeading title="Admission & Payment" />
                        ) : null}

                        {/* Right Side: Stepper Progress */}
                        <div className="flex items-start gap-2 select-none md:self-center pr-2">
                            {/* Step 1 */}
                            <div className="flex flex-col items-center gap-1">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${currentStep >= 1 ? "bg-[#0B8C00] text-white" : "bg-white text-[#787E8C] border border-[#DFE0E2]"
                                    }`}>
                                    1
                                </div>
                                <span className={`text-xs font-semibold ${currentStep >= 1 ? "text-[#0B8C00]" : "text-[#787E8C]"}`}>Details</span>
                            </div>

                            {/* Connection bar 1 */}
                            <div className={`w-20 rounded-full mx-1 mt-[13px] transition-all duration-200 ${currentStep > 1 ? "h-1 bg-[#0B8C00]" : "h-[2px] bg-[#DFE0E2]"
                                }`}></div>

                            {showRoomStep && (
                                <>
                                    {/* Step 2 - Room */}
                                    <div className="flex flex-col items-center gap-1">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${currentStep >= 2 ? "bg-[#0B8C00] text-white" : "bg-white text-[#787E8C] border border-[#DFE0E2] opacity-50"
                                            }`}>
                                            2
                                        </div>
                                        <span className={`text-xs font-semibold ${currentStep >= 2 ? "text-[#0B8C00]" : "text-[#787E8C] opacity-50"}`}>Room</span>
                                    </div>

                                    {/* Connection bar 2 */}
                                    <div className={`w-20 rounded-full mx-1 mt-[13px] transition-all duration-200 ${currentStep > 2 ? "h-1 bg-[#0B8C00]" : "h-[2px] bg-[#DFE0E2]"
                                        }`}></div>
                                </>
                            )}

                            {/* Payment step */}
                            <div className="flex flex-col items-center gap-1">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${currentStep >= paymentStepNumber ? "bg-[#0B8C00] text-white" : "bg-white text-[#787E8C] border border-[#DFE0E2] opacity-50"
                                    }`}>
                                    {paymentStepNumber}
                                </div>
                                <span className={`text-xs font-semibold ${currentStep >= paymentStepNumber ? "text-[#0B8C00]" : "text-[#787E8C] opacity-50"}`}>Payment</span>
                            </div>
                        </div>
                    </div>

                    {currentStep === 1 ? (
                        /* STEP 1 - CREATE PACKAGE CONTENT */
                        <CreatePackage
                            selectedPackageId={selectedPackageId}
                            setSelectedPackageId={setSelectedPackageId}
                            numberOfDays={numberOfDays}
                            setNumberOfDays={setNumberOfDays}
                            applyOffer={applyOffer}
                            setApplyOffer={setApplyOffer}
                            offerTab={offerTab}
                            setOfferTab={setOfferTab}
                            selectedOfferId={selectedOfferId}
                            setSelectedOfferId={setSelectedOfferId}
                            admissionType={admissionType}
                            setAdmissionType={setAdmissionType}
                            onNext={() => setCurrentStep(showRoomStep ? 2 : paymentStepNumber)}
                            onCancel={() => alert("Cancellation triggered.")}
                            onViewPatientOverview={handleViewPatientOverview}
                            isViewPatientLoading={isViewPatientLoading}
                            onActivePackageChange={setActivePackage}
                            onFinalAmountPayableChange={setFinalAmountPayable}
                            onCounsellingMetaChange={setCounsellingMeta}
                            getpatientBranchId={getpatientBranchId}
                        />
                    ) : isOnRoomStep ? (
                        /* STEP 2 - ROOM ALLOCATION CONTENT */
                        <RoomAllocation
                            activePackage={
                                activePackage
                                    ? { ...activePackage, id: String(activePackage.id) }
                                    : { id: "0", packageName: "", remark: "", branchRoomType: { roomRentPrice: 0 } }
                            }
                            patientDetails={{
                                patientName: getpatientName,
                                patientUhid: getpatientUhid,
                                diagnosis: getdiagnosisSymptoms,
                            }}
                            counsellingSummary={{
                                ...counsellingMeta,
                                numberOfDays,
                                finalAmountPayable,
                            }}
                            patientId={patientIdParam ?? undefined}
                            onSuccess={() => setCurrentStep(paymentStepNumber)}
                            onCancel={() => setCurrentStep(1)}
                        />
                    ) : isOnPaymentStep ? (
                        /* ADMISSION & PAYMENT CONTENT */
                        <AdmissionPayment
                            activePackage={activePackage ?? { packageName: "", packageType: "", remark: "" }}
                            finalAmountPayable={finalAmountPayable}
                            roomRentPerDay={roomRentPerDay}
                            medicinePerDay={medicinePerDay}
                            mealsPerDay={mealsPerDay}
                            doctorFee={doctorFee}
                            onNext={() => {
                                alert("Payment completed successfully!");
                            }}
                            onBack={() => setCurrentStep(showRoomStep ? 2 : 1)}
                        />
                    ) : null}
                </>
            )}
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

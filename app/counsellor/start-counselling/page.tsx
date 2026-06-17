"use client";

import { useState, useMemo, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { Badge, ViewAppointment, BackToPreviousPageButton, MessageDialog, SpinnerLoader, PatientWalletDetailItem } from "@/components/ui";
import RoomAllocation from "./roomAllowcation";
import AdmissionPayment from "./admission&payment";
import CreatePackage, { type AttendantDetailsFormData, type EditAdmissionPrefill } from "./createPackage";
import IpdAdmissionStep from "./IpdAdmissionStep";
import { useSearchParams } from "next/navigation";
import {
    useGetReferredPatientsQuery,
    useLazyGetPatientDetailQuery,
    useLazyGetPatientDetailByAppointmentQuery,
    useGetAdmissionDetailsQuery,
    type CounsellorPatientListItem,
    type CompletePatientAdmissionRoom,
    type AdmissionDetailsData,
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
function mapApiAdmissionTypeToUi(type: string): string {
    const normalized = type.trim().toLowerCase();
    if (normalized === "immediate") return "immediate";
    if (normalized === "schedule" || normalized === "scheduled") return "scheduled";
    if (normalized === "tentative") return "tentative";
    return "";
}

function mapApiPatientTypeToUi(type: string): string {
    const normalized = type.trim().toLowerCase();
    if (normalized === "daycare" || normalized === "day_care") return "day_care";
    if (normalized === "ipd") return "ipd";
    return normalized;
}

function mapApiDiseaseTypeToUi(type: string): string {
    const normalized = type.trim().toLowerCase();
    if (normalized === "ckd") return "ckd";
    if (normalized === "others" || normalized === "other") return "other";
    return "other";
}

function formatAdmissionDateInput(iso?: string): string {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function buildEditPrefill(data: AdmissionDetailsData): EditAdmissionPrefill {
    return {
        diseaseType: mapApiDiseaseTypeToUi(data.diseaseType),
        admissionFilterType: mapApiPatientTypeToUi(data.patientType),
        packageId: String(data.packageId),
        offerApplied: Boolean(data.offerApplied),
        ...(data.offerId != null ? { offerId: String(data.offerId) } : {}),
    };
}

interface CounsellingPatientContext {
    patientName: string;
    patientUhid: string;
    diagnosis: string;
    status: string;
    branchId: number;
    appointmentId: number;
}

function extractPatientContextFromApiData(
    data: Record<string, any> | undefined,
    fallbackAppointmentId: number | null
): CounsellingPatientContext | null {
    if (!data) return null;

    const appDetail = data.appointmentDetail || {};
    const patDetails = data.patientDetails || {};
    const medInfo = data.medicalInfo || {};
    const otherInfo = data.otherInformation || {};

    const patientName = patDetails.name?.trim();
    const patientUhid = appDetail.uhid || patDetails.uhid;
    if (!patientName && !patientUhid) return null;

    return {
        patientName: patientName || "N/A",
        patientUhid: patientUhid || "N/A",
        diagnosis: medInfo.diagnosis || medInfo.disease || "N/A",
        status: otherInfo.patientType || appDetail.status || "Referred",
        branchId: Number(appDetail.branchId) || 1,
        appointmentId: Number(appDetail.opid ?? fallbackAppointmentId) || 0,
    };
}

function extractPatientContextFromReferredRow(
    row: CounsellorPatientListItem,
    patientIdParam: number
): CounsellingPatientContext {
    return {
        patientName: row.patientName || "N/A",
        patientUhid: row.patientUhid || "N/A",
        diagnosis: row.diagnosisSymptoms || "N/A",
        status: row.status || "Referred",
        branchId: Number(row.branchId) || 1,
        appointmentId: Number(row.appointmentId ?? row.id ?? patientIdParam) || 0,
    };
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
    const [counsellingData, setCounsellingData] = useState({
        patientType: "ipd",
        diseaseType: "others",
        originalAmount: 0,
        discountAmount: 0,
    });
    const [roomAllocation, setRoomAllocation] = useState<CompletePatientAdmissionRoom | null>(null);
    const [attendantDetails, setAttendantDetails] = useState<AttendantDetailsFormData | null>(null);
    const [admissionOffer, setAdmissionOffer] = useState<{ offerApplied: boolean; offerId?: number }>({
        offerApplied: false,
    });
    const searchParams = useSearchParams();
    const patientIdParam = Number(searchParams?.get("patientID")) || null;
    const appointmentIdParam = Number(searchParams?.get("appointmentID")) || null;
    const editPatientIdParam = Number(searchParams?.get("editpatientID")) || null;
    const isEditMode = editPatientIdParam != null;
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
  } = useGetReferredPatientsQuery(referredParams, { skip: !patientIdParam || isEditMode });

  const {
    data: editAdmissionRes,
    isLoading: isEditAdmissionLoading,
    isError: isEditAdmissionError,
  } = useGetAdmissionDetailsQuery(editPatientIdParam!, { skip: !editPatientIdParam });

    const editAdmissionData = editAdmissionRes?.success ? editAdmissionRes.data : undefined;
    const editPrefill = useMemo(
    () => (editAdmissionData ? buildEditPrefill(editAdmissionData) : null),
    [editAdmissionData]
  );
  const [editAdmissionPrefillApplied, setEditAdmissionPrefillApplied] = useState(false);
  const [editAdmissionDate, setEditAdmissionDate] = useState("");
  const [editSpecialInstructions, setEditSpecialInstructions] = useState("");
  const [editPaymentAmounts, setEditPaymentAmounts] = useState<{
    advanceAmount?: number;
    receivedAmount?: number;
    remainingAmount?: number;
  } | null>(null);

  const rowfilterbyId = useMemo(
    () => findReferredPatientRow(referredRes?.data, patientIdParam),
    [referredRes, patientIdParam]
  );
  const [patientContext, setPatientContext] = useState<CounsellingPatientContext | null>(null);
  const [isPatientContextLoading, setIsPatientContextLoading] = useState(false);

  useEffect(() => {
    if (!patientIdParam || isEditMode) {
      setPatientContext(null);
      setIsPatientContextLoading(false);
      return;
    }

    if (rowfilterbyId) {
      setPatientContext(extractPatientContextFromReferredRow(rowfilterbyId, patientIdParam));
    }
  }, [patientIdParam, isEditMode, rowfilterbyId]);

  const resolvedAppointmentLookupId = useMemo(() => {
    if (appointmentIdParam) return appointmentIdParam;
    if (rowfilterbyId?.appointmentId != null && rowfilterbyId.appointmentId !== "") {
      return Number(rowfilterbyId.appointmentId);
    }
    return null;
  }, [appointmentIdParam, rowfilterbyId]);

  const getpatientName = isEditMode
    ? (editAdmissionData?.patient?.name || "N/A")
    : isPatientContextLoading && !patientContext
      ? "Loading..."
      : (patientContext?.patientName || "N/A");
  const getpatientUhid = isEditMode
    ? (editAdmissionData?.patient?.uhid || "N/A")
    : (patientContext?.patientUhid || "N/A");
  const getdiagnosisSymptoms = isEditMode
    ? "N/A"
    : (patientContext?.diagnosis || "N/A");
  const getpatientBranchId = isEditMode
    ? String(editAdmissionData?.branchId ?? "N/A")
    : String(patientContext?.branchId ?? "N/A");
  const getpatientStatus = isEditMode
    ? "Edit Admission"
    : isPatientContextLoading && !patientContext
      ? "Loading..."
      : (patientContext?.status || "N/A");
  const editPatientSubtitle = isEditMode && editAdmissionData?.patient
    ? `Contact: ${editAdmissionData.patient.contactNumber || "N/A"} • Age: ${editAdmissionData.patient.age || "N/A"} Years • Gender: ${editAdmissionData.patient.gender || "N/A"}`
    : null;

    // Stepper State
    const [currentStep, setCurrentStep] = useState(1);
    const [hasVisitedRoomStep, setHasVisitedRoomStep] = useState(false);
    const [hasVisitedPaymentStep, setHasVisitedPaymentStep] = useState(false);
    const [hasVisitedIpdAdmissionStep, setHasVisitedIpdAdmissionStep] = useState(false);
    const showRoomStep = admissionType !== "scheduled";
    const paymentStepNumber = showRoomStep ? 3 : 2;
    const ipdAdmissionStepNumber = showRoomStep ? 4 : 3;
    const isOnRoomStep = showRoomStep && currentStep === 2;
    const isOnPaymentStep = currentStep === paymentStepNumber;
    const isOnIpdAdmissionStep = currentStep === ipdAdmissionStepNumber;

    useEffect(() => {
        if (isOnRoomStep) {
            setHasVisitedRoomStep(true);
        }
    }, [isOnRoomStep]);

    useEffect(() => {
        if (isOnPaymentStep) {
            setHasVisitedPaymentStep(true);
        }
    }, [isOnPaymentStep]);

    useEffect(() => {
        if (isOnIpdAdmissionStep) {
            setHasVisitedIpdAdmissionStep(true);
        }
    }, [isOnIpdAdmissionStep]);

    // When admission type changes to scheduled (room hidden), payment step number shifts.
    // If we are still on the old payment step number (3) and IPD step hasn't started yet, move to payment (2).
    useEffect(() => {
        if (!showRoomStep && currentStep === 3 && !hasVisitedIpdAdmissionStep && hasVisitedPaymentStep) {
            setCurrentStep(2);
        }
    }, [showRoomStep, currentStep, hasVisitedIpdAdmissionStep, hasVisitedPaymentStep]);

    console.log("djfisdjfsd",editAdmissionData)

    useEffect(() => {
        if (!editAdmissionData || editAdmissionPrefillApplied) return;

        setSelectedPackageId(String(editAdmissionData.packageId));
        setNumberOfDays(editAdmissionData.numberOfDays);
        setApplyOffer(Boolean(editAdmissionData.offerApplied));
        setSelectedOfferId(editAdmissionData.offerId != null ? String(editAdmissionData.offerId) : "");
        setAdmissionType(mapApiAdmissionTypeToUi(editAdmissionData.admissionType));
        setFinalAmountPayable(editAdmissionData.netPayable);
        setCounsellingData({
            patientType: mapApiPatientTypeToUi(editAdmissionData.patientType),
            diseaseType: editAdmissionData.diseaseType,
            originalAmount: editAdmissionData.originalAmount,
            discountAmount: editAdmissionData.discountAmount,
        });
        setCounsellingMeta((prev) => ({
            ...prev,
            diseaseType: mapApiDiseaseTypeToUi(editAdmissionData.diseaseType) === "ckd" ? "CKD" : "Other",
            packageAdmissionType:
                mapApiPatientTypeToUi(editAdmissionData.patientType) === "ipd" ? "IPD" : "Day Care",
            applyOfferLabel: editAdmissionData.offerApplied ? "Applied" : "Not Applied",
        }));
        setEditAdmissionDate(formatAdmissionDateInput(editAdmissionData.admissionDate));
        setEditSpecialInstructions(editAdmissionData.specialInstructions || "");
        setEditPaymentAmounts({
            advanceAmount: editAdmissionData.advanceAmount,
            receivedAmount: editAdmissionData.receivedAmount,
            remainingAmount: editAdmissionData.remainingAmount,
        });
        if (editAdmissionData.room) {
            setRoomAllocation(editAdmissionData.room);
        }
        setEditAdmissionPrefillApplied(true);
    }, [editAdmissionData, editAdmissionPrefillApplied]);
    const [viewAppointmentMode, setViewAppointmentMode] = useState(false);
    const [getPatientDetail] = useLazyGetPatientDetailQuery();
    const [getPatientDetailByAppointment] = useLazyGetPatientDetailByAppointmentQuery();
    const [isViewPatientLoading, setIsViewPatientLoading] = useState(false);
    const [fetchedPatientData, setFetchedPatientData] = useState<any>(null);
    const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
    const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
    const [apiErrorMessage, setApiErrorMessage] = useState("");

    useEffect(() => {
        if (!patientIdParam || isEditMode) return;

        let cancelled = false;

        const loadPatientContext = async () => {
            setIsPatientContextLoading(true);
            try {
                if (resolvedAppointmentLookupId) {
                    try {
                        const byAppointment = await getPatientDetailByAppointment(
                            resolvedAppointmentLookupId
                        ).unwrap();
                        if (!cancelled && byAppointment?.success) {
                            const ctx = extractPatientContextFromApiData(
                                byAppointment.data,
                                resolvedAppointmentLookupId
                            );
                            if (ctx) {
                                setPatientContext(ctx);
                                return;
                            }
                        }
                    } catch {
                        // Fall back to patient detail lookup.
                    }
                }

                if (patientIdParam) {
                    const byPatient = await getPatientDetail(patientIdParam).unwrap();
                    if (!cancelled && byPatient?.success) {
                        const ctx = extractPatientContextFromApiData(byPatient.data, patientIdParam);
                        if (ctx) {
                            setPatientContext(ctx);
                        }
                    }
                }
            } catch {
                // Keep referred-list context when direct lookup fails.
            } finally {
                if (!cancelled) {
                    setIsPatientContextLoading(false);
                }
            }
        };

        void loadPatientContext();

        return () => {
            cancelled = true;
        };
    }, [
        patientIdParam,
        isEditMode,
        resolvedAppointmentLookupId,
        getPatientDetailByAppointment,
        getPatientDetail,
    ]);

    const patientDetailId =
        counsellingRecordIdParam ||
        rowfilterbyId?.patientId ||
        patientIdParam ||
        editPatientIdParam;

    const resolvedBranchId = isEditMode
        ? Number(editAdmissionData?.branchId) || 1
        : patientContext?.branchId || Number(rowfilterbyId?.branchId) || 1;
    const resolvedAppointmentId = isEditMode
        ? Number(editAdmissionData?.appointmentId) || 0
        : patientContext?.appointmentId ||
            resolvedAppointmentLookupId ||
            Number(rowfilterbyId?.appointmentId ?? counsellingRecordIdParam) ||
            0;

    const handleDetailsStepCancel = () => {
        setSelectedPackageId("");
        setActivePackage(null);
        setNumberOfDays(5);
        setApplyOffer(true);
        setOfferTab("bundled");
        setSelectedOfferId("");
        setFinalAmountPayable(0);
        setAdmissionType("");
        setCounsellingMeta({
            patientCategory: "Panel",
            diseaseType: "Other",
            packageAdmissionType: "Day Care",
            applyOfferLabel: "Not Applied",
        });
        setCounsellingData({
            patientType: "ipd",
            diseaseType: "others",
            originalAmount: 0,
            discountAmount: 0,
        });
        setRoomAllocation(null);
        setAttendantDetails(null);
        setHasVisitedRoomStep(false);
        setHasVisitedPaymentStep(false);
        setHasVisitedIpdAdmissionStep(false);
        setCurrentStep(1);
    };

    const handleViewPatientOverview = async () => {
        const isReferredFlow = patientIdParam !== null && !isEditMode;
        const idToFetch = isEditMode
            ? editPatientIdParam
            : isReferredFlow
                ? patientIdParam
                : patientDetailId;

        if (!idToFetch) {
            setApiErrorMessage("Patient ID not found. Please return to the dashboard and select a patient.");
            setShowApiErrorDialog(true);
            return;
        }

        setIsViewPatientLoading(true);
        try {
            const viewByAppointmentId = resolvedAppointmentLookupId;
            const res =
                isReferredFlow && viewByAppointmentId
                    ? await getPatientDetailByAppointment(viewByAppointmentId).unwrap()
                    : await getPatientDetail(idToFetch).unwrap();
            if (res && res.success) {
                setFetchedPatientData(res.data);
                const opid = res.data?.appointmentDetail?.opid;
                setSelectedAppointmentId(
                    opid != null && opid !== ""
                        ? Number(opid)
                        : isReferredFlow
                            ? viewByAppointmentId
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

    if (isEditMode && isEditAdmissionLoading) {
        return (
            <AppShell>
                <div className="flex min-h-[320px] items-center justify-center">
                    <SpinnerLoader size={40} />
                </div>
            </AppShell>
        );
    }

    if (isEditMode && (isEditAdmissionError || (!isEditAdmissionLoading && !editAdmissionData))) {
        return (
            <AppShell>
                <div className="flex min-h-[320px] flex-col items-center justify-center gap-4">
                    <p className="text-sm font-medium text-[#787E8C]">
                        {editAdmissionRes?.message || "Failed to load admission details for editing."}
                    </p>
                    <BackToPreviousPageButton text="Back" />
                </div>
            </AppShell>
        );
    }

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
                        const walletInfo = fetchedPatientData?.wallet || {};

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

                            //Patient Wallet Information Card
                            const remainingAmount =  walletInfo?.walletExists && walletInfo.availableBalance !== undefined
                                ? `Rs. ${walletInfo.availableBalance}`
                                : "N/A";
                        
                            const walletDetails: PatientWalletDetailItem[] = walletInfo?.walletExists
                                ? [
                                    { label: "Current Balance", value: `Rs. ${walletInfo.currentBalance ?? 0}` },
                                    { label: "Hold Amount", value: `Rs. ${walletInfo.holdAmount ?? 0}` },
                                    { label: "Total Credit", value: `Rs. ${walletInfo.totalCredit ?? 0}` },
                                    { label: "Total Debit", value: `Rs. ${walletInfo.totalDebit ?? 0}` },
                                    { label: "Last Updated", value: walletInfo.lastUpdated ? new Date(walletInfo.lastUpdated).toLocaleDateString('en-GB') : "N/A" },
                                ]
                                : [
                                    { label: "Package", value: "N/A" },
                                    { label: "Amount", value: "N/A" },
                                    { label: "Discount", value: "N/A" },
                                    { label: "Expire", value: "N/A" },
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
                                walletRemainingAmount={remainingAmount}
                                walletDetails={walletDetails}
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
                                        {editPatientSubtitle ? (
                                            <>
                                                UHID: <span className="text-[#262D3B] font-bold">{getpatientUhid}</span> • {editPatientSubtitle}
                                            </>
                                        ) : (
                                            <>
                                                UHID: <span className="text-[#262D3B] font-bold">{getpatientUhid}</span> • Diagnosis: <span className="text-[#262D3B] font-bold">{getdiagnosisSymptoms}</span>
                                            </>
                                        )}
                                    </p>
                                </div>
                            </div>
                        ) : isOnRoomStep ? (
                            <PageHeading title="Room Allocation" />
                        ) : isOnPaymentStep ? (
                            <PageHeading title="Admission & Payment" />
                        ) : isOnIpdAdmissionStep ? (
                            <PageHeading title="IPD Admission" />
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

                            {/* Connection bar: Payment -> IPD Admission */}
                            <div
                                className={`w-20 rounded-full mx-1 mt-[13px] transition-all duration-200 ${
                                    currentStep > paymentStepNumber ? "h-1 bg-[#0B8C00]" : "h-[2px] bg-[#DFE0E2]"
                                }`}
                            ></div>

                            {/* IPD Admission step */}
                            <div className="flex flex-col items-center gap-1">
                                <div
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                                        currentStep >= ipdAdmissionStepNumber
                                            ? "bg-[#0B8C00] text-white"
                                            : "bg-white text-[#787E8C] border border-[#DFE0E2] opacity-50"
                                    }`}
                                >
                                    {ipdAdmissionStepNumber}
                                </div>
                                <span
                                    className={`text-xs font-semibold ${
                                        currentStep >= ipdAdmissionStepNumber
                                            ? "text-[#0B8C00]"
                                            : "text-[#787E8C] opacity-50"
                                    }`}
                                >
                                    IPD Admission
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className={currentStep === 1 ? undefined : "hidden"}>
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
                            onCancel={handleDetailsStepCancel}
                            onViewPatientOverview={handleViewPatientOverview}
                            isViewPatientLoading={isViewPatientLoading}
                            onActivePackageChange={setActivePackage}
                            onFinalAmountPayableChange={setFinalAmountPayable}
                            onCounsellingMetaChange={setCounsellingMeta}
                            onCounsellingDataChange={setCounsellingData}
                            onAttendantDetailsChange={setAttendantDetails}
                            onAdmissionOfferChange={setAdmissionOffer}
                            getpatientBranchId={getpatientBranchId}
                            appointmentId={resolvedAppointmentId}
                            branchId={resolvedBranchId}
                            editPrefill={isEditMode ? editPrefill : null}
                        />
                    </div>

                    {showRoomStep && hasVisitedRoomStep && (
                        <div className={isOnRoomStep ? undefined : "hidden"}>
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
                            patientId={isEditMode ? editPatientIdParam ?? undefined : patientIdParam ?? undefined}
                            onConfirmAllocation={(allocation) => {
                                setRoomAllocation({
                                    buildingId: allocation.buildingId,
                                    floorId: allocation.floorId,
                                    roomId: allocation.roomId,
                                    bedId: allocation.bedId,
                                });
                            }}
                            onSuccess={() => setCurrentStep(paymentStepNumber)}
                            onBack={() => setCurrentStep(1)}
                        />
                        </div>
                    )}
                

                    {hasVisitedPaymentStep && (
                        <div className={isOnPaymentStep ? undefined : "hidden"}>
                            <AdmissionPayment
                            activePackage={activePackage ?? { packageName: "", packageType: "", remark: "" }}
                            finalAmountPayable={finalAmountPayable}
                            roomRentPerDay={roomRentPerDay}
                            medicinePerDay={medicinePerDay}
                            mealsPerDay={mealsPerDay}
                            doctorFee={doctorFee}
                            patientName={getpatientName}
                            patientUhid={getpatientUhid}
                            branchId={resolvedBranchId}
                            appointmentId={resolvedAppointmentId}
                            packageId={Number(selectedPackageId) || 0}
                            numberOfDays={numberOfDays}
                            offerApplied={admissionOffer.offerApplied}
                            offerId={admissionOffer.offerId}
                            admissionType={admissionType}
                            patientType={counsellingData.patientType}
                            diseaseType={counsellingData.diseaseType}
                            originalAmount={counsellingData.originalAmount}
                            discountAmount={counsellingData.discountAmount}
                            netPayable={finalAmountPayable}
                            roomAllocation={showRoomStep ? roomAllocation : null}
                            attendantDetails={attendantDetails}
                            requireRoomAllocation={showRoomStep}
                            initialAdmissionDate={isEditMode ? editAdmissionDate : undefined}
                            initialSpecialInstructions={isEditMode ? editSpecialInstructions : undefined}
                            editPaymentAmounts={isEditMode ? editPaymentAmounts : null}
                            isEditMode={isEditMode}
                            editPatientId={isEditMode ? editPatientIdParam ?? undefined : undefined}
                            onNext={() => {
                                setCurrentStep(ipdAdmissionStepNumber);
                                setHasVisitedIpdAdmissionStep(true);
                            }}
                            onBack={() => setCurrentStep(showRoomStep ? 2 : 1)}
                        />
                        </div>
                    )}

                    {hasVisitedIpdAdmissionStep && (
                        <div className={isOnIpdAdmissionStep ? undefined : "hidden"}>
                            <IpdAdmissionStep
                                patientId={
                                    isEditMode
                                        ? Number(editAdmissionData?.patient?.id ?? 0)
                                        : patientIdParam
                                }
                                onBack={() => setCurrentStep(paymentStepNumber)}
                            />
                        </div>
                    )}
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

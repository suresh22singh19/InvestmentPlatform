"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { uploadAudioReturn, refreshJatayuToken, forceLogoutJatayu } from "@/store/api/jatayuApi";
import { useLogoutMutation } from "@/store/api/authApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout, selectUser, selectLoginType, selectUserEmail, selectUserId } from "@/store/slices/authSlice";
import { registerOngoingConsultation, unregisterOngoingConsultation } from "@/lib/utils/consultationTabTracker";
import {
    selectMedicines,
    selectDosageList,
    selectFrequencyList,
    selectDurationList,
    selectTimingList
} from "@/store/slices/medicineSlice";
import {
    parseDosageComponents,
    parseDurationComponents,
    normalizeFrequencyValue,
    normalizeTimingValue,
} from "@/lib/medicineUtils";
import {
    useGetPatientReferralForDoctorQuery,
    useGetPatientAssessmentHistoryQuery,
    useGetPatientWalletBalanceQuery,
    useGetDBranchTherapyListForDoctorQuery,
} from "@/store/api/doctorApi";
import { useGetPatientFilesQuery, useLazyGetPresignedUrlQuery } from "@/store/api/commonApi";
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
    PatientDetailsVitalsCard,
    CommunicableDiseaseCard,
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
    PatientHeaderSummaryCard,
    FollowUpCard,
    TherapiesCard,
    DoctorConsultationFormCard,
    SpecializedPhysicalExamCard,
    ClinicalAssessmentRecord,
    SpinnerLoader,
    MessageDialog,
    Dialog,
    PatientInformationTimelineCard,
    IafDetailsDialog,
    NetworkStatus,
} from "@/components/ui";

const maskPhoneNumber = (phoneNumber: string | null | undefined): string => {
    if (!phoneNumber) return "N/A";
    const cleaned = phoneNumber.replace(/\D/g, ""); // Remove non-digits
    if (cleaned.length < 4) return phoneNumber; // If less than 4 digits, return as is
    const last4 = cleaned.slice(-4);
    const masked = "XXXXXX" + last4;
    return masked;
};

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

const parseAiFollowUpDate = (rawDateStr: string | null | undefined): string => {
    if (!rawDateStr || typeof rawDateStr !== "string") return "";
    const str = rawDateStr.trim();
    if (!str || str.toLowerCase() === "nil" || str.toLowerCase() === "n/a" || str.toLowerCase() === "none") return "";

    // If DD-MM-YYYY or DD/MM/YYYY (e.g. "25-08-2026" or "25/08/2026")
    const ddmmyyyyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (ddmmyyyyMatch) {
        const day = ddmmyyyyMatch[1].padStart(2, "0");
        const month = ddmmyyyyMatch[2].padStart(2, "0");
        const year = ddmmyyyyMatch[3];
        return `${year}-${month}-${day}`;
    }

    // If YYYY-MM-DD or YYYY/MM/DD (e.g. "2026-08-25")
    const yyyymmddMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (yyyymmddMatch) {
        const year = yyyymmddMatch[1];
        const month = yyyymmddMatch[2].padStart(2, "0");
        const day = yyyymmddMatch[3].padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    // Fallback: try parsing with Date
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    return "";
};

export interface DoctorActivityProps {
    appointment: any;
    onBack: () => void;
    branchName?: string;
    branchId?: number | string;
    hasJatayuAccess?: boolean;
}

export default function DoctorActivity({
    appointment,
    onBack,
    branchName,
    branchId,
    hasJatayuAccess: propHasJatayuAccess = true,
}: DoctorActivityProps) {
    const router = useRouter();
    const appData = appointment || {};

    const dispatch = useAppDispatch();
    const [logoutHIIMS] = useLogoutMutation();

    const user = useAppSelector(selectUser);
    const loginType = useAppSelector(selectLoginType);
    const userEmail = useAppSelector(selectUserEmail);
    const authDoctorId = useAppSelector(selectUserId);

    const medicinesList = useAppSelector(selectMedicines);
    const dosageList = useAppSelector(selectDosageList);
    const frequencyList = useAppSelector(selectFrequencyList);
    const durationList = useAppSelector(selectDurationList);
    const timingList = useAppSelector(selectTimingList);

    const isDoctor = loginType?.toLowerCase() === "doctor";
    const aiVoiceActivated = user?.aiVoiceActivated === true || user?.aiVoiceActivated === "true";

    const [hasJatayuAccess, setHasJatayuAccess] = useState(propHasJatayuAccess);
    const [showSessionExpiredDialog, setShowSessionExpiredDialog] = useState(false);
    const [showJatayuSuccessDialog, setShowJatayuSuccessDialog] = useState(false);
    const [showJatayuErrorDialog, setShowJatayuErrorDialog] = useState(false);
    const [isJatayuActionLoading, setIsJatayuActionLoading] = useState(false);
    const [jatayuErrorMessage, setJatayuErrorMessage] = useState("");
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        setHasJatayuAccess(propHasJatayuAccess);
    }, [propHasJatayuAccess]);

    useEffect(() => {
        const checkToken = async () => {
            if (!isDoctor || !aiVoiceActivated) {
                setHasJatayuAccess(false);
                return;
            }
            try {
                await refreshJatayuToken({ silent: true });
                setHasJatayuAccess(true);
            } catch (err: any) {
                console.error("Failed to refresh Jatayu token on start:", err);
                setHasJatayuAccess(false);
                if (err?.message === "JATAYU_SESSION_EXPIRED") {
                    setShowSessionExpiredDialog(true);
                }
            }
        };
        checkToken();
    }, [isDoctor, aiVoiceActivated]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const handleInitialSessionExpired = () => {
            setShowSessionExpiredDialog(true);
        };
        window.addEventListener("jatayu:initial_session_expired", handleInitialSessionExpired);
        return () => {
            window.removeEventListener("jatayu:initial_session_expired", handleInitialSessionExpired);
        };
    }, []);

    const handleCancelJatayuReLogin = () => {
        setShowSessionExpiredDialog(false);
        setHasJatayuAccess(false);
    };

    const handleConfirmJatayuReLogin = async () => {
        setIsJatayuActionLoading(true);
        const getUser = typeof window !== "undefined" ? localStorage.getItem("user") : null;
        const userData = getUser ? JSON.parse(getUser) : null;
        try {
            await forceLogoutJatayu(userData?.email);
        } catch (err) {
            console.error("Jatayu logout failed on confirm:", err);
        }

        try {
            await logoutHIIMS().unwrap();
        } catch (err) {
            console.error("HIIMS logout failed on confirm:", err);
        } finally {
            setIsJatayuActionLoading(false);
            setShowSessionExpiredDialog(false);
            dispatch(logout());
            router.push("/");
        }
    };

    const handleConfirmJatayuSuccess = () => {
        setShowJatayuSuccessDialog(false);
    };

    const handleConfirmJatayuError = () => {
        setShowJatayuErrorDialog(false);
    };

    const { data: walletResponse } = useGetPatientWalletBalanceQuery(
        appData.uhid || "",
        { skip: true }
    );

    const { data: patientFilesResponse } = useGetPatientFilesQuery(
        { uhid: appData.uhid || "" },
        { skip: !appData.uhid, refetchOnMountOrArgChange: true }
    );
    const [getPresignedUrl] = useLazyGetPresignedUrlQuery();

    const handleViewFile = async (filePath: string) => {
        try {
            const result = await getPresignedUrl({ key: filePath }).unwrap();
            const signedUrl = result?.data?.signedUrl;
            if (signedUrl) {
                window.open(signedUrl, "_blank", "noopener,noreferrer");
            }
        } catch (err) {
            console.error("Failed to get presigned URL:", err);
            alert("Failed to open file. Please try again.");
        }
    };

    const patientFilesItems = useMemo(() => {
        const files = patientFilesResponse?.data;
        if (!Array.isArray(files)) return [];
        return files.map((file) => {
            const formattedDate = file.createdAt
                ? new Date(file.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                : "";
            return {
                name: file.fileName || "File",
                size: `${file.fileType || "Document"} • ${formattedDate}`,
                onClick: () => handleViewFile(file.path),
                actionIconSrc: "/icons/ViewEyeIcon.svg",
                actionIconAlt: "View File",
            };
        });
    }, [patientFilesResponse, getPresignedUrl]);

    // Consultation view step (1: Voice Record & Notes, 2: Diagnosis & Medicines, 3: Specialized & Physical Exam)
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [isSkipped, setIsSkipped] = useState(false);
    const voiceCardRef = useRef<any>(null);

    const appId = appData.appointmentId || appData.id;

    // Register active consultation and refresh heartbeat every 3s
    useEffect(() => {
        if (!appId) return;

        registerOngoingConsultation(appId, { step, patientName: appData.patientName });

        const interval = setInterval(() => {
            registerOngoingConsultation(appId, { step, patientName: appData.patientName });
        }, 3000);

        return () => {
            clearInterval(interval);
        };
    }, [appId, step, appData.patientName]);

    // Unregister ONLY when DoctorActivity actually unmounts or browser tab closes/navigates away
    useEffect(() => {
        if (!appId) return;

        const handleUnload = () => {
            unregisterOngoingConsultation(appId);
        };

        window.addEventListener("beforeunload", handleUnload);
        window.addEventListener("pagehide", handleUnload);

        return () => {
            window.removeEventListener("beforeunload", handleUnload);
            window.removeEventListener("pagehide", handleUnload);
            unregisterOngoingConsultation(appId);
        };
    }, [appId]);

    // Audio recording lifted state
    const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
    const [recordedDuration, setRecordedDuration] = useState(0);

    // API Upload state
    const [isUploading, setIsUploading] = useState(false);
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [showStartRecordingDialog, setShowStartRecordingDialog] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showBusyDialog, setShowBusyDialog] = useState(false);
    const [apiErrorMessage, setApiErrorMessage] = useState("");
    const [showExitConfirmDialog, setShowExitConfirmDialog] = useState(false);

    // Therapies state
    const [therapies, setTherapies] = useState<Array<{
        therapyId: number;
        therapyName: string;
        therapyCategory?: string;
        therapySessions?: number;
        therapyDays?: number;
        jatayuTherapyCode?: string;
        isNotAvailable?: boolean;
        addedViaAi?: boolean;
    }>>([]);

    // Patient History Timeline state & queries
    const [timeframe, setTimeframe] = useState<"6m" | "1y" | "lifetime">("6m");
    const [selectedIafId, setSelectedIafId] = useState<string | null>(null);

    const isPatientOld = (data: any): boolean => {
        if (!data) return false;
        const appTimeStr = data.appointmentCreatedAt || data.createdAt;
        const regTimeStr = data.registrationCreatedAt;
        if (!appTimeStr || !regTimeStr) return false;

        const appTime = new Date(appTimeStr).getTime();
        const regTime = new Date(regTimeStr).getTime();
        if (isNaN(appTime) || isNaN(regTime)) return false;

        const oneHourInMs = 60 * 60 * 1000;
        return (appTime - regTime) > oneHourInMs;
    };

    const isOldPatient = isPatientOld(appData);

    const apiFilter = useMemo(() => {
        if (timeframe === "6m") return "lastSixMonths";
        if (timeframe === "1y") return "lastTwelveMonths";
        return "all";
    }, [timeframe]);

    const { data: assessmentHistoryRes } = useGetPatientAssessmentHistoryQuery(
        { uhid: appData.uhid || "", filter: apiFilter },
        { skip: !appData.uhid }
    );



    const resolvedBranchIdForTherapies = branchId || appData.branchId || 2;
    const { data: branchTherapiesData } = useGetDBranchTherapyListForDoctorQuery(
        { branchId: resolvedBranchIdForTherapies },
        { skip: !resolvedBranchIdForTherapies }
    );

    const formattedTimelineItems = useMemo(() => {
        const uhid = appData.uhid;
        if (!uhid) {
            return [];
        }

        const historyData = assessmentHistoryRes?.data;
        if (!historyData || historyData.length === 0) {
            return [];
        }

        const formatDate = (dateStr?: string) => {
            if (!dateStr) return "N/A";
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            const day = String(d.getDate()).padStart(2, "0");
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const month = months[d.getMonth()];
            const year = d.getFullYear();
            return `${day}/${month}/${year}`;
        };

        const formatFollowupDate = (dateStr?: string | null): string => {
            if (!dateStr || dateStr.trim() === "" || dateStr === "N/A" || dateStr === "NA") return "NA";
            const parsed = new Date(dateStr);
            if (isNaN(parsed.getTime())) return dateStr;
            const dateOnlyPart = dateStr.split("T")[0];
            const parts = dateOnlyPart.split("-");
            if (parts.length === 3) {
                const year = parts[0];
                const month = parts[1].padStart(2, "0");
                const day = parts[2].padStart(2, "0");
                if (year && month && day) {
                    return `${day}/${month}/${year}`;
                }
            }
            const day = String(parsed.getDate()).padStart(2, "0");
            const month = String(parsed.getMonth() + 1).padStart(2, "0");
            const year = parsed.getFullYear();
            return `${day}/${month}/${year}`;
        };

        const parseMedicineString = (itemStr: string) => {
            const detailsMatch = itemStr.match(/^(.*?)\s*-\s*(.*?)\s*\((Dosage|dosage):\s*(.*?),\s*(Frequency|frequency):\s*(.*?),\s*(Timing|timing):\s*(.*?)\)$/i);
            if (detailsMatch) {
                return {
                    medicineName: detailsMatch[1].trim(),
                    medicineDuration: detailsMatch[2].trim(),
                    medicineDosage: detailsMatch[4].trim(),
                    medicineFrequency: detailsMatch[6].trim(),
                    medicineTiming: detailsMatch[8].trim()
                };
            }

            const nameMatch = itemStr.split(" - ");
            const name = nameMatch[0]?.trim() || itemStr;
            let duration = "N/A";
            let dosage = "N/A";
            let frequency = "N/A";
            let timing = "N/A";

            const durationMatch = itemStr.match(/-\s*([^(]+)/);
            if (durationMatch) {
                duration = durationMatch[1].trim();
            }
            const dosageMatch = itemStr.match(/Dosage:\s*([^,)]+)/i);
            if (dosageMatch) {
                dosage = dosageMatch[1].trim();
            }
            const freqMatch = itemStr.match(/Frequency:\s*([^,)]+)/i);
            if (freqMatch) {
                frequency = freqMatch[1].trim();
            }
            const timingMatch = itemStr.match(/Timing:\s*([^,)]+)/i);
            if (timingMatch) {
                timing = timingMatch[1].trim();
            }

            return {
                medicineName: name,
                medicineDuration: duration,
                medicineDosage: dosage,
                medicineFrequency: frequency,
                medicineTiming: timing
            };
        };

        return historyData.map((h, index) => {
            const dateStr = formatDate(h.createdAt);
            const dateLabel = dateStr;

            let chiefComplaintText = "N/A";
            if (h.patientPresentation?.chiefComplaint) {
                if (Array.isArray(h.patientPresentation.chiefComplaint)) {
                    chiefComplaintText = h.patientPresentation.chiefComplaint
                        .map((cc: any) => cc?.complaint || "")
                        .filter(Boolean)
                        .join(", ");
                } else if (typeof h.patientPresentation.chiefComplaint === "string") {
                    chiefComplaintText = h.patientPresentation.chiefComplaint;
                }
            }

            let symptomsText = "";
            if (h.patientPresentation?.symptoms) {
                if (Array.isArray(h.patientPresentation.symptoms)) {
                    symptomsText = h.patientPresentation.symptoms.filter(Boolean).join(", ");
                } else if (typeof h.patientPresentation.symptoms === "string") {
                    symptomsText = h.patientPresentation.symptoms;
                }
            }

            const detailsItems: string[] = [];

            if (h.medications?.allergies && h.medications.allergies.length > 0) {
                const nonNilAllergies = h.medications.allergies.filter((x: string) => x && x.trim().toLowerCase() !== "nil" && x.trim() !== "");
                if (nonNilAllergies.length > 0) {
                    detailsItems.push(`Allergies: ${nonNilAllergies.join(", ")}`);
                }
            }

            if (h.physicalExamination) {
                const parts: string[] = [];
                if (h.physicalExamination.bp && h.physicalExamination.bp !== "N/A") parts.push(`BP: ${h.physicalExamination.bp}`);
                if (h.physicalExamination.pulse && h.physicalExamination.pulse !== "N/A") parts.push(`Pulse: ${h.physicalExamination.pulse}`);
                if (h.physicalExamination.temperature && h.physicalExamination.temperature !== "N/A") parts.push(`Temp: ${h.physicalExamination.temperature}`);
                if (parts.length > 0) detailsItems.push(`Physical Exam: ${parts.join(" | ")}`);
            }

            if (h.systemicReview) {
                const parts: string[] = [];
                if (h.systemicReview.respiratory && h.systemicReview.respiratory.toLowerCase() !== "nil") parts.push(`Respiratory: ${h.systemicReview.respiratory}`);
                if (h.systemicReview.cardiovascular && h.systemicReview.cardiovascular.toLowerCase() !== "nil") parts.push(`Cardiovascular: ${h.systemicReview.cardiovascular}`);
                if (parts.length > 0) detailsItems.push(`Systemic Review: ${parts.join(" | ")}`);
            }

            if (h.specializedHistory) {
                const parts: string[] = [];
                if (h.specializedHistory.pastHistory && h.specializedHistory.pastHistory.toLowerCase() !== "nil") parts.push(`Past History: ${h.specializedHistory.pastHistory}`);
                if (h.specializedHistory.familyHistory && h.specializedHistory.familyHistory.toLowerCase() !== "nil") parts.push(`Family History: ${h.specializedHistory.familyHistory}`);
                if (parts.length > 0) detailsItems.push(`Specialized History: ${parts.join(" | ")}`);
            }

            if (h.investigations?.recommended && h.investigations.recommended.length > 0) {
                const nonNilInvest = h.investigations.recommended.filter((x: string) => x && x.trim().toLowerCase() !== "nil" && x.trim() !== "");
                if (nonNilInvest.length > 0) {
                    detailsItems.push(`Recommended Investigations: ${nonNilInvest.join(", ")}`);
                }
            }

            if (h.treatmentPlan) {
                const parts: string[] = [];
                if (h.treatmentPlan.advice && h.treatmentPlan.advice.toLowerCase() !== "nil") parts.push(`Advice: ${h.treatmentPlan.advice}`);
                if (h.treatmentPlan.followUp && h.treatmentPlan.followUp.toLowerCase() !== "nil") parts.push(`Follow-up: ${h.treatmentPlan.followUp}`);
                if (parts.length > 0) detailsItems.push(`Treatment Plan: ${parts.join(" | ")}`);
            }

            if (h.progressMonitoring?.notes && h.progressMonitoring.notes.toLowerCase() !== "nil") {
                detailsItems.push(`Progress Notes: ${h.progressMonitoring.notes}`);
            }

            let prescribedMedicines: any[] = [];
            const rawMeds = (h.treatmentPlan && Array.isArray(h.treatmentPlan.prescribedMedicines) && h.treatmentPlan.prescribedMedicines.length > 0)
                ? h.treatmentPlan.prescribedMedicines
                : (Array.isArray(h.patientMedicinesPres) && h.patientMedicinesPres.length > 0)
                    ? h.patientMedicinesPres
                    : [];

            if (rawMeds.length > 0) {
                prescribedMedicines = rawMeds.map((m: any) => {
                    const formatUnit = (val: string) => {
                        if (!val) return "";
                        return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
                    };

                    const dosageVal = m.dosageValue !== undefined && m.dosageValue !== null ? m.dosageValue : (m.dosageAmount || "");
                    const dosageUnitStr = m.dosageUnit ? formatUnit(String(m.dosageUnit)) : "";
                    const dosage = m.medicineDosage || [dosageVal, dosageUnitStr].filter(Boolean).join(" ");

                    const freq = m.medicineFrequency || m.frequencyKey || m.frequency || m.frequencyType || "N/A";

                    const rawTiming = m.medicineTiming || m.timingKey || m.timingType || m.timing;
                    let timing = "N/A";
                    if (rawTiming) {
                        const str = String(rawTiming).trim();
                        if (str === "BFM_HN" || str === "before_meals_honey") timing = "Before Meals with Honey";
                        else if (str === "AFM_HN" || str === "after_meals_honey") timing = "After Meals with Honey";
                        else if (str === "BFM_MLK" || str === "before_meals_milk") timing = "Before Meals with Milk";
                        else if (str === "AFM_MLK" || str === "after_meals_milk") timing = "After Meals with Milk";
                        else if (str === "BFM_WTR" || str === "before_meals_water") timing = "Before Meals with Water";
                        else if (str === "AFM_WTR" || str === "after_meals_water") timing = "After Meals with Water";
                        else if (str === "BFM" || str === "before_meals") timing = "Before Meals";
                        else if (str === "AFM" || str === "after_meals") timing = "After Meals";
                        else if (str === "EM_STM" || str === "empty_stomach") timing = "Empty Stomach";
                        else if (str === "BED_TIME" || str === "at_bedtime") timing = "At Bedtime";
                        else if (str.includes("_")) {
                            timing = str.split("_").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
                        } else {
                            timing = str;
                        }
                    }

                    const durationVal = m.durationValue !== undefined && m.durationValue !== null ? m.durationValue : (m.durationAmount || "");
                    const durationUnitFormatted = formatUnit(String(m.durationUnit || ""));
                    const durationSuffix = durationUnitFormatted ? (durationUnitFormatted + (Number(durationVal) !== 1 ? "s" : "")) : "";
                    const duration = m.medicineDuration || [durationVal, durationSuffix].filter(Boolean).join(" ");

                    return {
                        medicineName: m.medicineName || m.name || "N/A",
                        medicineDosage: dosage || "N/A",
                        medicineFrequency: String(freq || "N/A"),
                        medicineTiming: String(timing || "N/A"),
                        medicineDuration: duration || "N/A",
                    };
                });
            } else if (Array.isArray(h.medications?.current) && h.medications.current.length > 0) {
                prescribedMedicines = h.medications.current.map((medStr: string) => parseMedicineString(medStr));
            }

            return {
                dateLabel,
                detail: {
                    primaryComplaintTitle: "Chief Complaint",
                    primaryComplaintText: chiefComplaintText,
                    detailsTitle: "Clinical & Assessment Details",
                    detailsItems: detailsItems.length > 0 ? detailsItems : undefined,
                    actionsTitle: "Medicines Prescribed",
                    branch: h.branchName || "N/A",
                    doctorName: h.doctorName || "N/A",
                    iafDate: h.createdAt,
                    chiefComplaint: chiefComplaintText,
                    symptoms: symptomsText || undefined,
                    prescribedMedicines,
                    opdAssessmentId: h.id,
                    doctorNotes: h.doctorNotes ?? undefined,
                    opdNextFollowupDate: formatFollowupDate(h.opdNextFollowupDate),
                    opdNextFollowupRemark: (h.opdNextFollowupRemark && h.opdNextFollowupRemark.trim() !== "") ? h.opdNextFollowupRemark : "NA",
                    communicableDiseases: (h as any).communicableDiseases || undefined,
                    communicableDiseasesRemark: (h as any).communicableDiseasesRemark || undefined,
                }
            };
        });
    }, [assessmentHistoryRes, appData.appointmentId]);

    const { data: referralData } = useGetPatientReferralForDoctorQuery(
        { registrationId: appointment?.registrationId || appointment?.appointmentId || 0 },
        { skip: true }
    );

    const resolvedBranchId = branchId || appData.branchId || 2;

    // Follow-Up Form state
    const [followUpDate, setFollowUpDate] = useState("");
    const [followUpRemarks, setFollowUpRemarks] = useState("");

    // Shared states between Step 2 and Step 3
    const [chiefComplaint, setChiefComplaint] = useState("");
    const [symptoms, setSymptoms] = useState("");
    const [currentMedication, setCurrentMedication] = useState("");
    const [finalDiagnosis, setFinalDiagnosis] = useState("");
    const [doctorNotes, setDoctorNotes] = useState("");
    const parseCommunicableDiseases = (raw: any): string[] => {
        if (!raw) return [];
        if (Array.isArray(raw)) {
            return raw.map(s => String(s).replace(/[{}"']/g, "").trim()).filter(Boolean);
        }
        if (typeof raw === "string" && raw.trim()) {
            return raw.replace(/[{}"']/g, "").split(",").map(s => s.trim()).filter(Boolean);
        }
        return [];
    };

    const [communicableDiseases, setCommunicableDiseases] = useState<string[]>(() => {
        const raw = appData?.lastCommunicableDiseases || appData?.communicableDiseases;
        return parseCommunicableDiseases(raw);
    });
    const [hasTherapyError, setHasTherapyError] = useState(false);

    // Section 2 State (Systemic Review)
    const [diabetes, setDiabetes] = useState<"yes" | "no" | "">("");
    const [bloodPressure, setBloodPressure] = useState<"high" | "low" | "no" | "">("");
    const [thyroid, setThyroid] = useState<"hypo" | "hyper" | "no" | "">("");
    const [allergy, setAllergy] = useState<"food" | "drug" | "skin" | "other" | "no" | "">("");

    // Section 3 State (Physical Exam)
    const [sitting, setSitting] = useState<"normal" | "abnormal" | "">("");
    const [standing, setStanding] = useState<"normal" | "abnormal" | "">("");
    const [walking, setWalking] = useState<"normal" | "abnormal" | "">("");

    // Section 4 State (Medicines)
    const [medicines, setMedicines] = useState<Array<{ name: string; dosage: string; frequency: string; timing: string; duration: string; remarks?: string; unmatchedName?: string }>>([
        { name: "", dosage: "", frequency: "", timing: "", duration: "", remarks: "" },
    ]);

    // AI Response tracked in parent
    const [aiResponse, setAiResponse] = useState<any>(null);

    const [isDraftLoaded, setIsDraftLoaded] = useState(false);

    useEffect(() => {
        const raw = appData?.lastCommunicableDiseases || appData?.communicableDiseases;
        if (raw) {
            const parsed = parseCommunicableDiseases(raw);
            if (parsed.length > 0) {
                setCommunicableDiseases(parsed);
            }
        }
    }, [appData?.lastCommunicableDiseases, appData?.communicableDiseases]);

    const hasAnyContent = () => {
        return (
            chiefComplaint.trim() !== "" ||
            symptoms.trim() !== "" ||
            currentMedication.trim() !== "" ||
            finalDiagnosis.trim() !== "" ||
            doctorNotes.trim() !== "" ||
            diabetes !== "" ||
            bloodPressure !== "" ||
            thyroid !== "" ||
            allergy !== "" ||
            sitting !== "" ||
            standing !== "" ||
            walking !== "" ||
            (medicines.length > 0 && medicines.some(m => m.name !== "" || m.dosage !== "" || m.frequency !== "" || m.timing !== "" || m.duration !== "" || m.remarks !== "")) ||
            (therapies.length > 0) ||
            followUpDate !== "" ||
            followUpRemarks !== "" ||
            communicableDiseases.length > 0 ||
            aiResponse !== null ||
            step > 1 ||
            isSkipped
        );
    };

    // Load draft or clear if starting fresh on mount
    useEffect(() => {
        if (typeof window === "undefined") {
            setIsDraftLoaded(true);
            return;
        }

        const docId = appData.doctorId || authDoctorId || 0;
        const appId = appData.appointmentId || 0;

        if (!docId || !appId) {
            setIsDraftLoaded(true);
            return;
        }

        const draftKey = `draft_consultation_${docId}_${appId}`;

        if (appointment?.resumeDraft) {
            const savedDraft = localStorage.getItem(draftKey);
            if (savedDraft) {
                try {
                    const draft = JSON.parse(savedDraft);
                    if (draft.step) {
                        if (draft.step === 1 && draft.aiResponse) {
                            setStep(2);
                        } else {
                            setStep(draft.step);
                        }
                    }
                    if (draft.isSkipped !== undefined) setIsSkipped(draft.isSkipped);
                    if (draft.chiefComplaint) setChiefComplaint(draft.chiefComplaint);
                    if (draft.symptoms) setSymptoms(draft.symptoms);
                    if (draft.currentMedication) setCurrentMedication(draft.currentMedication);
                    if (draft.finalDiagnosis) setFinalDiagnosis(draft.finalDiagnosis);
                    if (draft.doctorNotes) setDoctorNotes(draft.doctorNotes);
                    if (draft.diabetes) setDiabetes(draft.diabetes);
                    if (draft.bloodPressure) setBloodPressure(draft.bloodPressure);
                    if (draft.thyroid) setThyroid(draft.thyroid);
                    if (draft.allergy) setAllergy(draft.allergy);
                    if (draft.sitting) setSitting(draft.sitting);
                    if (draft.standing) setStanding(draft.standing);
                    if (draft.walking) setWalking(draft.walking);
                    if (draft.medicines) setMedicines(draft.medicines);
                    if (draft.therapies) setTherapies(draft.therapies);
                    if (draft.aiResponse) setAiResponse(draft.aiResponse);
                    if (draft.followUpDate) setFollowUpDate(draft.followUpDate);
                    if (draft.followUpRemarks) setFollowUpRemarks(draft.followUpRemarks);
                    if (draft.communicableDiseases) {
                        setCommunicableDiseases(parseCommunicableDiseases(draft.communicableDiseases));
                    } else {
                        const apiData = parseCommunicableDiseases(appData?.lastCommunicableDiseases || appData?.communicableDiseases);
                        if (apiData.length > 0) setCommunicableDiseases(apiData);
                    }
                } catch (e) {
                    console.error("Error parsing saved draft:", e);
                }
            }
        } else {
            // Fresh start: wipe out any stale draft for safety
            localStorage.removeItem(draftKey);
            window.dispatchEvent(new CustomEvent("draft_consultation_changed"));

            const apiData = parseCommunicableDiseases(appData?.lastCommunicableDiseases || appData?.communicableDiseases);
            if (apiData.length > 0) {
                setCommunicableDiseases(apiData);
            }
        }
        setIsDraftLoaded(true);
    }, [appointment, appData.doctorId, appData.appointmentId, appData?.lastCommunicableDiseases, appData?.communicableDiseases, authDoctorId]);

    // Save draft continuously as inputs change
    useEffect(() => {
        if (!isDraftLoaded || typeof window === "undefined") return;
        if (step === 1) {
            const hasStep1Content = followUpDate !== "" || followUpRemarks !== "" || therapies.length > 0 || communicableDiseases.length > 0;
            if (!hasStep1Content) {
                return;
            }
        }
        const docId = appData.doctorId || authDoctorId || 0;
        const appId = appData.appointmentId || 0;
        if (!docId || !appId) return;

        const draftKey = `draft_consultation_${docId}_${appId}`;
        const existingRaw = localStorage.getItem(draftKey);
        const existing = existingRaw ? JSON.parse(existingRaw) : {};

        const draftData = {
            ...existing,
            step,
            isSkipped,
            chiefComplaint,
            symptoms,
            currentMedication,
            finalDiagnosis,
            doctorNotes,
            diabetes,
            bloodPressure,
            thyroid,
            allergy,
            sitting,
            standing,
            walking,
            medicines,
            therapies,
            aiResponse,
            followUpDate,
            followUpRemarks,
            communicableDiseases
        };
        localStorage.setItem(draftKey, JSON.stringify(draftData));
        window.dispatchEvent(new CustomEvent("draft_consultation_changed"));
    }, [
        isDraftLoaded,
        step,
        isSkipped,
        chiefComplaint,
        symptoms,
        currentMedication,
        finalDiagnosis,
        doctorNotes,
        diabetes,
        bloodPressure,
        thyroid,
        allergy,
        sitting,
        standing,
        walking,
        medicines,
        therapies,
        aiResponse,
        followUpDate,
        followUpRemarks,
        communicableDiseases,
        appData.doctorId,
        appData.appointmentId,
        authDoctorId
    ]);

    const consultationFormRef = useRef<{ validate: () => boolean }>(null);
    const clinicalAssessmentRef = useRef<{ submit: () => void }>(null);
    const therapiesCardRef = useRef<HTMLDivElement>(null);
    const [highlightTherapies, setHighlightTherapies] = useState(false);

    const handleCloseErrorDialog = () => {
        setShowErrorDialog(false);
        const lowerMsg = (apiErrorMessage || "").toLowerCase();
        if (lowerMsg.includes("unavailable therapies") || lowerMsg.includes("invalid therapies")) {
            setTimeout(() => {
                therapiesCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                setHighlightTherapies(true);
                setTimeout(() => setHighlightTherapies(false), 2000);
            }, 100);
        }
    };



    const handleTranscriptionComplete = (summary: any, transcriptText: string) => {
        if (transcriptText) {
            setDoctorNotes(transcriptText);
        }
        if (!summary) return;
        let summaryObj = summary;
        if (typeof summary === "string") {
            try {
                summaryObj = JSON.parse(summary);
            } catch (e) {
                console.error("Failed to parse summary string as JSON:", e);
                summaryObj = {};
            }
        }

        // 1. chiefComplaint
        let chiefVal = "";
        if (Array.isArray(summaryObj.patientPresentation?.chiefComplaint)) {
            chiefVal = summaryObj.patientPresentation.chiefComplaint.map((c: any) => c.complaint || c).join(", ");
        } else if (typeof summaryObj.patientPresentation?.chiefComplaint === "string") {
            chiefVal = summaryObj.patientPresentation.chiefComplaint;
        } else if (summaryObj.chiefComplaints) {
            chiefVal = summaryObj.chiefComplaints;
        }
        if (chiefVal) setChiefComplaint(chiefVal);

        // 2. symptoms
        let symptomsVal = "";
        if (Array.isArray(summaryObj.patientPresentation?.symptoms)) {
            symptomsVal = summaryObj.patientPresentation.symptoms.join(", ");
        } else if (typeof summaryObj.patientPresentation?.symptoms === "string") {
            symptomsVal = summaryObj.patientPresentation.symptoms;
        }
        if (symptomsVal) setSymptoms(symptomsVal);

        // 3. currentMedication
        const rawCurrentMed = summaryObj.medications?.currentMedication || summaryObj.medications?.currentMedications || "NO";
        const isCurrentMedYes = String(rawCurrentMed).toLowerCase() === "yes" || String(rawCurrentMed).toLowerCase() === "true";
        const currentMedStatus = isCurrentMedYes ? "yes" : "no";

        let docNotes = "";
        const rawRemarks = summaryObj.medications?.remarks || summaryObj.medications?.doctorNotes;
        if (Array.isArray(rawRemarks)) {
            docNotes = rawRemarks.map((r: any) => String(r).trim()).filter(Boolean).join(", ");
        } else if (typeof rawRemarks === "string") {
            docNotes = rawRemarks.trim();
        }

        const currentMedsList = summaryObj.medications?.currentMedicines || [];
        const medsParagraph = Array.isArray(currentMedsList)
            ? currentMedsList.map((m: any) => {
                const parts = [
                    m.medicineName || m.name,
                    m.medicineDosage || m.dosage,
                    m.medicineFrequency || m.frequency,
                    m.medicineTiming || m.timing
                ].filter(Boolean);
                const duration = m.medicineDuration || m.duration;
                const durationStr = duration ? `for ${duration}` : "";
                const rem = m.remarks || m.medicineRemarks || "";
                const remStr = rem ? `(${rem})` : "";

                return `${parts.join(", ")} ${durationStr} ${remStr}`.replace(/\s+/g, " ").trim();
            }).filter(Boolean).join("; ")
            : "";

        const currentMedParts: string[] = [currentMedStatus];
        if (docNotes) {
            currentMedParts.push(docNotes);
        }
        if (medsParagraph) {
            currentMedParts.push(medsParagraph);
        }
        const formattedMedicationString = currentMedParts.join(", ");
        setCurrentMedication(formattedMedicationString);

        // 4. finalDiagnosis
        const diagVal = summaryObj.investigations?.diagnosis?.final || summaryObj.investigations?.diagnosis?.provisional || "";
        if (diagVal) setFinalDiagnosis(diagVal);

        // 5. systemicReview -> diabetes
        let diabetesVal: "yes" | "no" | "" = "";
        const rawDiabetes = summaryObj.systemicReview?.diabetes?.status;
        if (rawDiabetes) {
            const low = String(rawDiabetes).toLowerCase();
            if (low === "yes" || low === "true") diabetesVal = "yes";
            else if (low === "no" || low === "false") diabetesVal = "no";
        }
        if (diabetesVal) setDiabetes(diabetesVal);

        // 6. systemicReview -> bloodPressure
        let bpVal: "high" | "low" | "no" | "" = "";
        const rawBp = summaryObj.systemicReview?.bloodPressure?.status;
        if (rawBp) {
            const low = String(rawBp).toLowerCase();
            if (low.includes("high")) bpVal = "high";
            else if (low.includes("low")) bpVal = "low";
            else if (low.includes("no") || low === "normal") bpVal = "no";
        }
        if (bpVal) setBloodPressure(bpVal);

        // 7. systemicReview -> thyroid
        let thyroidVal: "hypo" | "hyper" | "no" | "" = "";
        const rawThyroid = summaryObj.systemicReview?.thyroid?.status;
        if (rawThyroid) {
            const low = String(rawThyroid).toLowerCase();
            if (low.includes("hypo")) thyroidVal = "hypo";
            else if (low.includes("hyper")) thyroidVal = "hyper";
            else if (low.includes("no")) thyroidVal = "no";
        }
        if (thyroidVal) setThyroid(thyroidVal);

        // 8. systemicReview -> allergy
        let allergyVal: "food" | "drug" | "skin" | "other" | "no" | "" = "";
        const rawAllergyTypes = summaryObj.systemicReview?.allergy?.types;
        let allergyStr = "";
        if (Array.isArray(rawAllergyTypes)) {
            allergyStr = rawAllergyTypes.map((t: any) => t.type || t).join(", ").toLowerCase();
        } else if (typeof rawAllergyTypes === "string") {
            allergyStr = rawAllergyTypes.toLowerCase();
        }
        if (allergyStr) {
            if (allergyStr.includes("food")) allergyVal = "food";
            else if (allergyStr.includes("drug")) allergyVal = "drug";
            else if (allergyStr.includes("skin") || allergyStr.includes("other")) allergyVal = "other";
            else if (allergyStr.includes("nil") || allergyStr.includes("no")) allergyVal = "no";
        }
        if (allergyVal) setAllergy(allergyVal);

        // 9. physicalExamination -> balanceMobility
        let sittingVal: "normal" | "abnormal" | "" = "";
        const rawSitting = summaryObj.physicalExamination?.balanceMobility?.sitting;
        if (rawSitting) {
            const low = String(rawSitting).toLowerCase();
            if (low.includes("abnormal")) sittingVal = "abnormal";
            else if (low.includes("normal")) sittingVal = "normal";
        }
        if (sittingVal) setSitting(sittingVal);

        let standingVal: "normal" | "abnormal" | "" = "";
        const rawStanding = summaryObj.physicalExamination?.balanceMobility?.standing;
        if (rawStanding) {
            const low = String(rawStanding).toLowerCase();
            if (low.includes("abnormal")) standingVal = "abnormal";
            else if (low.includes("normal")) standingVal = "normal";
        }
        if (standingVal) setStanding(standingVal);

        let walkingVal: "normal" | "abnormal" | "" = "";
        const rawWalking = summaryObj.physicalExamination?.balanceMobility?.walking;
        if (rawWalking) {
            const low = String(rawWalking).toLowerCase();
            if (low.includes("abnormal")) walkingVal = "abnormal";
            else if (low.includes("normal")) walkingVal = "normal";
        }
        if (walkingVal) setWalking(walkingVal);

        // 10. medicines
        const rawMedicines = summaryObj.treatmentPlan?.prescribedMedicines || summaryObj.medications?.currentMedicines;
        if (Array.isArray(rawMedicines) && rawMedicines.length > 0) {
            const getMatchedValue = (key: string, rawText: string, lookupList: { key: string; value: string }[]) => {
                const cleanKey = (key || "").trim().toLowerCase();
                const cleanText = (rawText || "").trim().toLowerCase();

                if (cleanKey && Array.isArray(lookupList)) {
                    const found = lookupList.find(item => item.key.toLowerCase() === cleanKey);
                    if (found) return found.value;
                }

                if (cleanText && Array.isArray(lookupList)) {
                    const found = lookupList.find(
                        item => item.value.toLowerCase() === cleanText || item.key.toLowerCase() === cleanText
                    );
                    if (found) return found.value;
                }

                return rawText || "";
            };

            const mappedMeds = rawMedicines.map((m: any) => {
                const rawName = m.medicineName || m.name || m.stamp?.Std_Name || "";

                // Find matched name in medicinesList
                let matchedName = "";
                let unmatchedName: string | undefined = undefined;
                let isMatched = false;

                if (rawName && Array.isArray(medicinesList)) {
                    const target = rawName.trim().toLowerCase();
                    let matched = medicinesList.find(dbMed => (dbMed.name || "").trim().toLowerCase() === target);

                    if (!matched && m.stamp?.Std_Name) {
                        const stdTarget = String(m.stamp.Std_Name).trim().toLowerCase();
                        matched = medicinesList.find(dbMed => (dbMed.name || "").trim().toLowerCase() === stdTarget);
                    }

                    if (!matched) {
                        const targetAlpha = target.replace(/[^a-z0-9]/g, "");
                        if (targetAlpha) {
                            matched = medicinesList.find(dbMed => {
                                const dbAlpha = (dbMed.name || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
                                return dbAlpha === targetAlpha;
                            });
                        }
                    }
                    if (matched) {
                        matchedName = matched.name;
                        isMatched = true;
                    }
                }

                if (!isMatched && rawName) {
                    matchedName = "";
                    unmatchedName = rawName;
                }

                const { amount: dVal, unit: dUnit } = parseDosageComponents(m.dosageValue || m.medicineDosage || m.dosage, m.dosageUnit);
                const matchedDosage = dVal ? `${dVal} ${dUnit}` : (getMatchedValue(m.dosageKey, m.medicineDosage || m.dosage, dosageList) || "");

                const rawFreq = m.frequencyKey || m.medicineFrequency || m.frequency;
                const matchedFrequency = normalizeFrequencyValue(rawFreq) || getMatchedValue(m.frequencyKey, rawFreq, frequencyList) || "";

                const rawTiming = m.timingKey || m.medicineTiming || m.timing;
                const matchedTiming = normalizeTimingValue(rawTiming) || getMatchedValue(m.timingKey, rawTiming, timingList) || "";

                const { amount: durVal, unit: durUnit } = parseDurationComponents(m.durationValue || m.medicineDuration || m.duration, m.durationUnit);
                const matchedDuration = durVal ? `${durVal} ${durUnit}` : (getMatchedValue(m.durationKey, m.medicineDuration || m.duration, durationList) || "");

                const matchedRemarks = m.remarks || m.medicineRemarks || "";

                return {
                    name: matchedName,
                    dosage: matchedDosage,
                    frequency: matchedFrequency,
                    timing: matchedTiming,
                    duration: matchedDuration,
                    remarks: matchedRemarks,
                    unmatchedName: unmatchedName
                };
            });
            setMedicines(mappedMeds);
        }

        // 11. prescribedTherapies mapping
        const rawPrescribedTherapies = summaryObj.treatmentPlan?.prescribedTherapies || summaryObj.prescribedTherapies;
        if (Array.isArray(rawPrescribedTherapies) && rawPrescribedTherapies.length > 0) {
            const mappedTherapies = rawPrescribedTherapies.map((pt: any) => {
                const jatayuCode = (pt.Jatayu_Codes || pt.stamp?.Jatayu_Codes || "").trim().toLowerCase();
                const therapyName = pt.therapyName || "";

                // Parse days and sessions
                let therapyDays = undefined;
                if (pt.days) {
                    const parsedDays = parseInt(String(pt.days).replace(/[^0-9]/g, ""), 10);
                    if (!isNaN(parsedDays)) {
                        therapyDays = parsedDays;
                    }
                }

                let therapySessions = undefined;
                if (pt.session) {
                    const parsedSessions = parseInt(String(pt.session).replace(/[^0-9]/g, ""), 10);
                    if (!isNaN(parsedSessions)) {
                        therapySessions = parsedSessions;
                    }
                }

                let matchedTherapy = null;
                if (branchTherapiesData?.data && Array.isArray(branchTherapiesData.data)) {
                    const cleanJatayuCode = (pt.Jatayu_Codes || pt.stamp?.Jatayu_Codes || "").trim().toLowerCase();
                    const cleanPtName = (pt.therapyName || "").trim().toLowerCase();
                    const cleanStdName = (pt.stamp?.Std_Name || "").trim().toLowerCase();

                    // 1. Match by Jatayu Code
                    if (cleanJatayuCode) {
                        matchedTherapy = branchTherapiesData.data.find(
                            (bt: any) => (bt.jatayuTherapyCode || "").trim().toLowerCase() === cleanJatayuCode
                        );
                    }

                    // 2. Match by exact therapy name
                    if (!matchedTherapy && cleanPtName) {
                        matchedTherapy = branchTherapiesData.data.find(
                            (bt: any) => (bt.therapyName || "").trim().toLowerCase() === cleanPtName
                        );
                    }

                    // 3. Match by standard name (Std_Name)
                    if (!matchedTherapy && cleanStdName) {
                        matchedTherapy = branchTherapiesData.data.find(
                            (bt: any) => (bt.therapyName || "").trim().toLowerCase() === cleanStdName
                        );
                    }

                    // 4. Match by alphanumeric name
                    if (!matchedTherapy) {
                        const ptNameAlpha = cleanPtName.replace(/[^a-z0-9]/g, "");
                        const stdNameAlpha = cleanStdName.replace(/[^a-z0-9]/g, "");

                        matchedTherapy = branchTherapiesData.data.find((bt: any) => {
                            const btAlpha = (bt.therapyName || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
                            return (ptNameAlpha && btAlpha === ptNameAlpha) || (stdNameAlpha && btAlpha === stdNameAlpha);
                        });
                    }
                }

                if (pt.match_source === "none" || !matchedTherapy) {
                    // Unavailable therapy
                    return {
                        therapyId: -Math.floor(Math.random() * 100000) - 1,
                        therapyName: therapyName,
                        therapyCategory: pt.stamp?.Category || pt.stamp?.Sub_Category || "Panchakarma",
                        therapyDays: therapyDays || 1,
                        therapySessions: therapySessions || 1,
                        jatayuTherapyCode: pt.Jatayu_Codes || pt.stamp?.Jatayu_Codes || "",
                        isNotAvailable: true,
                        addedViaAi: true
                    };
                } else {
                    // Valid matched therapy
                    return {
                        therapyId: matchedTherapy.therapyId,
                        therapyName: matchedTherapy.therapyName,
                        therapyCategory: matchedTherapy.category || "panchkarma",
                        therapyDays: therapyDays || 1,
                        therapySessions: therapySessions || 1,
                        jatayuTherapyCode: matchedTherapy.jatayuTherapyCode || "",
                        addedViaAi: true
                    };
                }
            });

            setTherapies(mappedTherapies);
        }

        // 12. progressMonitoring -> followUpDate
        const rawFollowUpDate =
            summaryObj.progressMonitoring?.followUpDate ||
            summaryObj.progressMonitoring?.followupDate ||
            summaryObj.followUpDate ||
            summaryObj.treatmentPlan?.followUpDate;
        if (rawFollowUpDate) {
            const formattedDate = parseAiFollowUpDate(String(rawFollowUpDate));
            if (formattedDate) {
                setFollowUpDate(formattedDate);
            }
        }
        //commented for now for Follow up remark
        // const rawFollowUpNotes =
        //     summaryObj.progressMonitoring?.followUpRemarks;
        // if (rawFollowUpNotes && typeof rawFollowUpNotes === "string" && rawFollowUpNotes.trim().toLowerCase() !== "nil" && rawFollowUpNotes.trim().toLowerCase() !== "n/a") {
        //     setFollowUpRemarks(rawFollowUpNotes.trim());
        // }

        // Set the exact complete summary object under aiResponse in the parent state
        setAiResponse(summaryObj);
    };

    const handleSaveNextClick = async () => {
        if (step === 1) {
            if (!hasJatayuAccess) {
                setIsSkipped(true);
                setStep(3);
                return;
            }
            if (recordedAudio) {
                if (aiResponse) {
                    setStep(2);
                    return;
                }
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
                            emailID: userEmail,
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

                    const res = await uploadAudioReturn({
                        audio: audioArray,
                        email: userEmail || "",
                        fields: fieldsObject,
                        name: `appointment_${appData.appointmentId || "recording"}.wav`,
                        source: "med",
                    });
                    if (res && res.summary) {
                        let summaryObj: any = res.summary;
                        if (typeof res.summary === "string") {
                            try {
                                summaryObj = JSON.parse(res.summary);
                            } catch (e) {
                                summaryObj = {};
                            }
                        }
                        handleTranscriptionComplete(summaryObj, res.transcript || "");

                        const chief = summaryObj.chiefComplaints || "";
                        const meds = summaryObj.medicines || "";

                        setAiResponse({
                            metadata: {
                                timestamp: new Date().toISOString(),
                                source: "jatayu-voice-ai"
                            },
                            patientPresentation: {
                                chiefComplaint: chief || "",
                                duration: ""
                            },
                            medications: {
                                current: meds ? [meds] : [],
                                allergies: []
                            },
                            systemicReview: {
                                cardiovascular: "normal",
                                respiratory: "normal"
                            },
                            specializedHistory: {
                                familyHistory: "",
                                pastHistory: ""
                            },
                            physicalExamination: {
                                bp: appData.bloodPressure || "",
                                pulse: appData.pulse || "",
                                temperature: appData.temperature || ""
                            },
                            investigations: {
                                recommended: []
                            },
                            treatmentPlan: {
                                advice: "",
                                followUp: ""
                            },
                            progressMonitoring: {
                                notes: ""
                            }
                        });
                    }
                    setStep(2);
                } catch (err: any) {
                    console.error("Audio processing API error:", err);
                    setApiErrorMessage(err.message || "Failed to process voice recording.");
                    setShowErrorDialog(true);
                } finally {
                    setIsUploading(false);
                }
            } else {
                setShowStartRecordingDialog(true);
            }
        } else if (step === 2) {
            if (consultationFormRef.current) {
                const isValid = consultationFormRef.current.validate();
                if (!isValid) {
                    return; // Prevent transitioning to next step if validation fails
                }
            }
            if (hasTherapyError) {
                setApiErrorMessage("Please resolve or delete the invalid therapies (marked in red) before proceeding.");
                setShowErrorDialog(true);
                return;
            }
            setStep(3);
        } else {
            onBack();
        }
    };

    // Helpers
    const BLOOD_GROUP_MAP: Record<string, string> = {
        "a-positive": "A-POSITIVE",
        "a-negative": "A-NEGATIVE",
        "b-positive": "B-POSITIVE",
        "b-negative": "B-NEGATIVE",
        "ab-positive": "AB-POSITIVE",
        "ab-negative": "AB-NEGATIVE",
        "o-positive": "O-POSITIVE",
        "o-negative": "O-NEGATIVE",
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
    const patientName =
        `${appData.patientTitle || appData.patientName
            ? `${appData.patientTitle || ""} ${appData.patientName || ""}`.trim()
            : "N/A"}`
    const genderLabel = capitalizeFirstLetter(appData.gender);
    const guardianLabel = appData.guardianName ? `${appData.guardianTitle || ""} ${appData.guardianName}`.trim() : "N/A";
    const maritalLabel = capitalizeFirstLetter(appData.maritalStatus);
    const patientSubtitle = `Age : ${appData.age || "N/A"} Years • Gender : ${genderLabel}`;
    const bloodGroupLabel = getBloodGroupLabel(appData.bloodGroup);
    const patientBadges: PatientDetailsBadge[] = [
        ...(appData.panelName ? [{
            label: appData.panelName,
            className: "inline-flex h-[30px] min-w-[76px] items-center justify-center rounded-[30px] border px-4 text-xs font-semibold border-[#0B8C00]/20 bg-[rgba(11,140,0,0.05)] text-[#0B8C00]"
        }] : [])
    ];

    const getMedicalBoolValue = (val: any) => {
        if (val === true || String(val).toLowerCase() === "true" || val === 1 || val === "1") {
            return "Yes";
        }
        if (val === false || String(val).toLowerCase() === "false" || val === 0 || val === "0") {
            return "No";
        }
        return "N/A";
    };

    const getMedicalRemark = (val: any, remarks: string | null | undefined) => {
        if (val === true || String(val).toLowerCase() === "true" || val === 1 || val === "1") {
            return remarks && remarks.trim() ? remarks.trim() : undefined;
        }
        return undefined;
    };

    const getAllergiesSurgeriesValue = (val: string | null | undefined) => {
        if (!val || val.trim() === "" || val.toLowerCase() === "null") return "N/A";
        if (val.toLowerCase() === "no" || val.toLowerCase() === "none") return "No";
        return "Yes";
    };

    const getAllergiesSurgeriesRemark = (val: string | null | undefined) => {
        if (!val || val.trim() === "" || val.toLowerCase() === "null") return undefined;
        if (val.toLowerCase() === "no" || val.toLowerCase() === "none") return undefined;
        return val.trim();
    };

    // console.log("appData", appData);
    const patientInfoItems: PatientDetailsInfoItem[] = [
        {
            iconSrc: "/icons/UserGear.svg",
            iconAlt: "Father/Husband",
            label: "Father’s/Husband’s Name",
            value: guardianLabel,
        },
        {
            iconSrc: "/icons/gendericon.svg",
            iconAlt: "Marital Status",
            label: "Marital Status",
            value: maritalLabel,
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
    const getFinalDiagActivity = (opdData: any): string => {
        if (!opdData) return "";
        let data = opdData;
        if (typeof data === "string") {
            try { data = JSON.parse(data); } catch {
                return (data.trim() && data.trim().toLowerCase() !== "null") ? data.trim() : "";
            }
        }
        if (typeof data === "object" && data !== null) {
            const val = data?.investigations?.diagnosis?.final || data?.diagnosis?.final || data?.finalDiagnosis || (typeof data?.investigations === "string" ? data.investigations : null);
            return (typeof val === "string" && val.trim() && val.trim().toLowerCase() !== "null") ? val.trim() : "";
        }
        return "";
    };
    const finalDiagnosisVal = getFinalDiagActivity(appData?.opdAssessmentData);
    const hasFinalDiagnosis = Boolean(finalDiagnosisVal);

    const diagnosisItems: MedicalInformationItem[] = hasFinalDiagnosis
        ? [{ label: "Final Diagnosis", value: finalDiagnosisVal, multiline: true }]
        : [
            { label: "Diagnosis", value: appData.diagnosisName || "N/A" },
            { label: "Sub-Diagnosis", value: appData.subDiagnosisName || "N/A" },
        ];

    const rawMedicalItems: MedicalInformationItem[] = [
        ...diagnosisItems,
        { label: "Blood Group", value: getBloodGroupLabel(appData.bloodGroup) },
        { label: "Allergies", value: getAllergiesSurgeriesValue(appData.allergies), remark: getAllergiesSurgeriesRemark(appData.allergies) },
        { label: "Surgeries", value: getAllergiesSurgeriesValue(appData.surgeries), remark: getAllergiesSurgeriesRemark(appData.surgeries) },
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
        { label: "Diet Type", value: appData.dietType || "N/A", remark: appData.lastDayFullDiet || undefined },
        { label: "Diabetes", value: getMedicalBoolValue(appData.isDiabetes), remark: getMedicalRemark(appData.isDiabetes, appData.diabetesRemarks) },
        { label: "HTN(hypertension)", value: getMedicalBoolValue(appData.isHypertension), remark: getMedicalRemark(appData.isHypertension, appData.hypertensionRemarks) },
        { label: "Coronary Artery Disease", value: getMedicalBoolValue(appData.isCad), remark: getMedicalRemark(appData.isCad, appData.cadRemarks) },
        { label: "Thyroid", value: getMedicalBoolValue(appData.isThyroid), remark: getMedicalRemark(appData.isThyroid, appData.thyroidRemarks) },
        ...(appData.gender?.toLowerCase() === "female" ? [{ label: "Menstrual", value: getMedicalBoolValue(appData.isMenstrual), remark: getMedicalRemark(appData.isMenstrual, appData.menstrualRemarks) }] : []),
        // { label: "Addiction", value: appData.addictionType.length > 0 ? appData.addictionType.join(", ") : "N/A" },
        { label: "Remarks", value: appData.diagnosisRemarks || "N/A", multiline: true },
    ];

    const shouldHideMedicalDetails = !isOldPatient && !appData.isDoctorChecked;
    const medicalItems = shouldHideMedicalDetails
        ? rawMedicalItems.filter(item => !["Allergies", "Surgeries", "Diabetes", "HTN(hypertension)", "Coronary Artery Disease", "Thyroid"].includes(item.label))
        : rawMedicalItems;

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
        { label: "Appointment Date", value: appData.appointmentDate ? new Date(appData.appointmentDate).toLocaleDateString('en-GB') : "N/A" },
        { label: "Time Slot", value: appData.timeSlot || "N/A" },
        {
            label: "Created Date",
            value: appData.createdAt
                ? (() => {
                    const d = new Date(appData.createdAt);
                    if (isNaN(d.getTime())) return appData.createdAt;
                    const day = String(d.getDate()).padStart(2, "0");
                    const month = String(d.getMonth() + 1).padStart(2, "0");
                    const year = d.getFullYear();
                    const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
                    return `${day}/${month}/${year}, ${timeStr}`;
                })()
                : "N/A"
        },
        // { label: "Remark", value: appData.diagnosisRemarks || "N/A", multiline: true },
    ];

    // 7. Patient Wallet Information Card
    const walletInfo = walletResponse?.data;
    const remainingAmount = walletInfo?.walletExists && walletInfo.availableBalance !== undefined
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

    // 8. Referral Detail Card
    const referralInfo = referralData?.data;
    const referralItems: ReferralPatientInfoItem[] = [
        { label: "Source", value: referralInfo?.source || appData.source || appData.sourceOfReference || "N/A" },
        { label: "Sub Source", value: referralInfo?.sourceSelected || appData.subSource || "N/A" },
        { label: "Referral Doctor", value: referralInfo?.doctor?.name || appData.referralDoctor || "N/A" },
        { label: "Referral Name", value: referralInfo?.referralName || appData.referralName || "N/A" },
        { label: "Mobile", value: referralInfo?.referralMobile || appData.referralMobile || "N/A" },
    ];

    return (
        <>
            <div className="flex flex-col w-full max-w-full mx-auto gap-0 pb-4 h-[calc(100vh-80px)] overflow-hidden">

                {/* Header Bar (Fixed at Top) */}
                <div className={`shrink-0 transition-all duration-600 ease-[cubic-bezier(0.25,1,0.5,1)] ${!isScrolled ? 'pt-2 pb-2' : 'pt-2 pb-0'}`}>
                    <div className="flex items-center justify-between gap-4">
                        <div className="relative flex-1 min-h-[48px] flex items-center overflow-hidden">
                            <div
                                className={`w-full transition-all duration-600 ease-[cubic-bezier(0.25,1,0.5,1)] [will-change:opacity,transform] ${isScrolled
                                    ? "opacity-100 translate-y-0 relative pointer-events-auto"
                                    : "opacity-0 -translate-y-1.5 absolute inset-x-0 pointer-events-none"
                                    }`}
                            >
                                <PatientHeaderSummaryCard
                                    patientName={patientName}
                                    patientSubtitle={patientSubtitle}
                                    patientBadges={patientBadges}
                                    patientInfoItems={patientInfoItems}
                                    vitalsItems={vitalsItems}
                                    communicableDiseases={communicableDiseases}
                                    bloodGroup={bloodGroupLabel || appData?.bloodGroup || appData?.blood_group}
                                />
                            </div>

                            <div
                                className={`transition-all duration-600 ease-[cubic-bezier(0.25,1,0.5,1)] [will-change:opacity,transform] ${!isScrolled
                                    ? "opacity-100 translate-y-0 relative pointer-events-auto"
                                    : "opacity-0 translate-y-1.5 absolute inset-x-0 pointer-events-none"
                                    }`}
                            >
                                <PageHeading title="New Appointment" />
                            </div>
                        </div>

                        <div className="pr-4 shrink-0">
                            <BackToPreviousPageButton
                                text="Back"
                                width={90}
                                height={36}
                                onClick={() => setShowExitConfirmDialog(true)}
                            />
                        </div>
                    </div>
                </div>

                {/* Scrollable Content Area (Starts AFTER Header Bar) */}
                <div
                    className="flex-1 overflow-y-auto custom-scroll pr-1 pb-6"
                    onScroll={(e) => {
                        const scrollTop = e.currentTarget.scrollTop;
                        setIsScrolled(scrollTop > 20);
                    }}
                >
                    {/* Patient Details & Vitals Combined Single Card + Communicable Disease */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch mb-4">
                        <div className="lg:col-span-8 flex flex-col">
                            <PatientDetailsVitalsCard
                                name={patientName}
                                subtitle={patientSubtitle}
                                badges={patientBadges}
                                infoItems={patientInfoItems}
                                vitalsItems={vitalsItems}
                                className="h-full"
                            />
                        </div>
                        {/* Communicable Disease */}
                        <div className="lg:col-span-4 flex flex-col">
                            <CommunicableDiseaseCard
                                value={communicableDiseases}
                                onChange={(val) => setCommunicableDiseases(val)}
                                className="h-full"
                            />
                        </div>
                    </div>

                    {/* 2-Column Responsive Grid Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start pb-6">

                        {/* Left Column (col-span-8) */}
                        <div className="lg:col-span-8 flex flex-col gap-0">
                            <div className="pr-0">
                                <div className="space-y-4 pt-0 pb-0">
                                    {/* Add here that Patient history card view only for old patient ok if the patient is new then its hide  */}
                                    {isOldPatient && (
                                        <div className="mt-0 mb-4">
                                            <PatientInformationTimelineCard
                                                title="Patient History"
                                                items={formattedTimelineItems}
                                                onViewIaf={(iafId) => {
                                                    const isNumeric = /^\d+$/.test(iafId);
                                                    if (isNumeric) {
                                                        setSelectedIafId(iafId);
                                                    }
                                                }}
                                                timeframe={timeframe}
                                                onTimeframeChange={setTimeframe}
                                                disableClientSideFilter={!!appData.appointmentId}
                                            />
                                        </div>
                                    )}
                                    {/* Dynamic Step View Container */}
                                    {step === 1 && (
                                        <>
                                            <VoiceDoctorNotesCard
                                                ref={voiceCardRef}
                                                appointment={appData}
                                                onTranscriptionComplete={handleTranscriptionComplete}
                                                onAudioBlobChange={(blob, duration) => {
                                                    setRecordedAudio(blob);
                                                    setRecordedDuration(duration);
                                                }}
                                                onDeleteRecording={() => {
                                                    setTherapies((prev) => prev.filter((t) => !t.addedViaAi));
                                                }}
                                                onSkip={() => {
                                                    setIsSkipped(true);
                                                    setStep(3);
                                                }}
                                                onStateChange={({ isRecording, isProcessing }) => {
                                                    setIsRecording(isRecording);
                                                    setIsProcessing(isProcessing);
                                                }}
                                                onSessionExpired={() => {
                                                    onBack();
                                                }}
                                                hasJatayuAccess={hasJatayuAccess}
                                                isFirstSessionExpiredDialogOpen={showSessionExpiredDialog}
                                            />
                                        </>
                                    )}
                                    {step === 2 && (
                                        <>
                                            <DoctorConsultationFormCard
                                                ref={consultationFormRef}
                                                chiefComplaint={chiefComplaint}
                                                setChiefComplaint={setChiefComplaint}
                                                symptoms={symptoms}
                                                setSymptoms={setSymptoms}
                                                currentMedication={currentMedication}
                                                setCurrentMedication={setCurrentMedication}
                                                finalDiagnosis={finalDiagnosis}
                                                setFinalDiagnosis={setFinalDiagnosis}
                                                diabetes={diabetes}
                                                setDiabetes={setDiabetes}
                                                bloodPressure={bloodPressure}
                                                setBloodPressure={setBloodPressure}
                                                thyroid={thyroid}
                                                setThyroid={setThyroid}
                                                allergy={allergy}
                                                setAllergy={setAllergy}
                                                sitting={sitting}
                                                setSitting={setSitting}
                                                standing={standing}
                                                setStanding={setStanding}
                                                walking={walking}
                                                setWalking={setWalking}
                                                medicines={medicines}
                                                setMedicines={setMedicines}
                                                doctorNotes={doctorNotes}
                                            />
                                        </>
                                    )}
                                    {step === 3 && (
                                        <>
                                            <ClinicalAssessmentRecord
                                                ref={clinicalAssessmentRef}
                                                onComplete={handleSaveNextClick}
                                                initialGender={appData.gender ? (appData.gender.charAt(0).toUpperCase() + appData.gender.slice(1).toLowerCase()) : "Male"}
                                                appData={appData}
                                                branchId={resolvedBranchId}
                                                branchName={branchName}
                                                chiefComplaint={chiefComplaint}
                                                setChiefComplaint={setChiefComplaint}
                                                symptoms={symptoms}
                                                setSymptoms={setSymptoms}
                                                finalDiagnosis={finalDiagnosis}
                                                setFinalDiagnosis={setFinalDiagnosis}
                                                diabetes={diabetes}
                                                setDiabetes={setDiabetes}
                                                bloodPressure={bloodPressure}
                                                setBloodPressure={setBloodPressure}
                                                thyroid={thyroid}
                                                setThyroid={setThyroid}
                                                allergy={allergy}
                                                setAllergy={setAllergy}
                                                sitting={sitting}
                                                setSitting={setSitting}
                                                standing={standing}
                                                setStanding={setStanding}
                                                walking={walking}
                                                setWalking={setWalking}
                                                medicines={medicines}
                                                setMedicines={setMedicines}
                                                followUpDate={followUpDate}
                                                followUpRemarks={followUpRemarks}
                                                aiResponse={aiResponse}
                                                therapies={therapies}
                                                doctorNotes={doctorNotes}
                                                communicableDiseases={communicableDiseases}
                                                setCommunicableDiseases={setCommunicableDiseases}
                                            />
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-5 items-center">
                                {step === 3 && !isSkipped && (
                                    <BackToPreviousPageButton
                                        text="Back"
                                        onClick={() => setStep(2)}
                                    />
                                )}
                                <Button
                                    variant="primary"
                                    size="large"
                                    onClick={() => {
                                        if (step === 1) {
                                            if (isRecording || isProcessing || isUploading) {
                                                setShowBusyDialog(true);
                                            } else {
                                                handleSaveNextClick();
                                            }
                                        } else if (step === 2) {
                                            handleSaveNextClick();
                                        } else if (step === 3) {
                                            if (hasTherapyError) {
                                                setApiErrorMessage("Please resolve or delete the invalid therapies (marked in red) before submitting.");
                                                setShowErrorDialog(true);
                                                return;
                                            }
                                            clinicalAssessmentRef.current?.submit();
                                        }
                                    }}
                                    disabled={step === 1 ? false : isUploading}
                                    className="flex items-center gap-2"
                                >
                                    {isUploading ? (
                                        <>
                                            <SpinnerLoader size={16} color="white" />
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <span>{step === 3 ? "Submit" : "Next"}</span>
                                    )}
                                </Button>
                            </div>

                        </div>

                        {/* Right Column (col-span-4) */}
                        <div className="lg:col-span-4">
                            <div className="pr-2">
                                <div className="space-y-6 pt-0 pb-1">
                                    {/* Health Card Preview */}
                                    {/* <HealthCardPreview cardNumber={appData.jsHealthCardNo || "N/A"} /> */}



                                    {/* Medical Information */}
                                    <MedicalInformationCard items={medicalItems} />

                                    {/* Patient Files */}
                                    <PatientFilesCard items={patientFilesItems} plainEmptyState={true} />

                                    {/* Other Information */}
                                    {/* <OtherInformationCard items={otherInfoItems} /> */}

                                    {/* Appointment Detail */}
                                    {/* <AppointmentDetailCard items={appointmentItems} /> */}

                                    {/* Patient Wallet Information */}
                                    {/* <PatientWalletInformationCard
                                    remainingAmount={remainingAmount}
                                    details={walletDetails}
                                    onActionClick={() => alert("Wallet details click (Demo Only)")}
                                /> */}

                                    {/* Referral Detail */}
                                    {/* <ReferralPatientInfoCard items={referralItems} /> */}

                                    {/* Custom Follow-Up Card */}
                                    <FollowUpCard
                                        followUpDate={followUpDate}
                                        onFollowUpDateChange={setFollowUpDate}
                                        followUpRemarks={followUpRemarks}
                                        onFollowUpRemarksChange={setFollowUpRemarks}
                                    />

                                    {/* Custom Therapies Card */}
                                    <div
                                        ref={therapiesCardRef}
                                        className={`transition-all duration-500 rounded-xl ${highlightTherapies
                                            ? "ring-2 ring-red-500 ring-offset-2 scale-[1.02] shadow-lg shadow-red-100"
                                            : ""
                                            }`}
                                    >
                                        <TherapiesCard
                                            therapies={therapies}
                                            onTherapiesChange={setTherapies}
                                            branchId={resolvedBranchId}
                                            panelName={appData?.panelName}
                                            onValidationErrorChange={setHasTherapyError}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
            {/* API Upload Error Dialog */}
            <MessageDialog
                open={showErrorDialog}
                onClose={handleCloseErrorDialog}
                icon="/icons/CrossIcon.svg"
                iconBgColor="#FFEBEE"
                message={apiErrorMessage || "Failed to process voice recording."}
                confirmText="OK"
                showCancel={false}
                onConfirm={handleCloseErrorDialog}
            />
            {/* Exit Confirmation Dialog */}
            {showExitConfirmDialog && step === 1 && !(followUpDate !== "" || followUpRemarks !== "" || therapies.length > 0) && (
                <MessageDialog
                    open={showExitConfirmDialog}
                    onClose={() => setShowExitConfirmDialog(false)}
                    icon="/icons/questionMark.svg"
                    message="Are you sure you want to exit? Any unsaved changes will be lost."
                    confirmText="Exit"
                    cancelText="Cancel"
                    showCancel={true}
                    onConfirm={() => {
                        setShowExitConfirmDialog(false);
                        if (typeof window !== "undefined") {
                            const docId = appData.doctorId || authDoctorId || 0;
                            const appId = appData.appointmentId || 0;
                            localStorage.removeItem(`draft_consultation_${docId}_${appId}`);
                            window.dispatchEvent(new CustomEvent("draft_consultation_changed"));
                        }
                        onBack();
                    }}
                    onCancel={() => setShowExitConfirmDialog(false)}
                    closeOnOutsideClick={false}
                />
            )}

            {showExitConfirmDialog && (step === 2 || step === 3 || (step === 1 && (followUpDate !== "" || followUpRemarks !== "" || therapies.length > 0))) && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1323]/70 px-4"
                    onClick={() => setShowExitConfirmDialog(false)}
                >
                    <div
                        className="relative flex w-full flex-col overflow-hidden rounded-[12px] bg-white shadow-[0px_32px_80px_rgba(47,72,61,0.18)] animate-in fade-in duration-200"
                        style={{ width: "420px" }}
                        role="dialog"
                        aria-modal="true"
                        onClick={(event) => event.stopPropagation()}
                    >
                        {/* Close Button */}
                        <button
                            type="button"
                            onClick={() => setShowExitConfirmDialog(false)}
                            className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-lg transition-colors duration-200 hover:bg-[#F2F8F2]"
                            aria-label="Close dialog"
                        >
                            <Image src="/icons/CrossIcon.svg" alt="Close dialog" width={24} height={24} />
                        </button>

                        {/* Content */}
                        <div className="flex flex-col items-center px-6 pt-6 pb-4">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#FFEBEE]">
                                <Image src="/icons/questionMark.svg" width={36} height={36} alt="Icon" />
                            </div>
                            <p className="text-center text-base font-semibold leading-[150%] text-[#262D3B]">
                                Exit Consultation?
                            </p>
                            <p className="text-center text-xs text-[#7B8089] leading-[150%] mt-2 px-2">
                                You can save your draft to resume later or exit without saving.
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-3 px-6 pb-6 pt-[18px]">
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    size="large"
                                    fullWidth
                                    onClick={() => setShowExitConfirmDialog(false)}
                                    className="flex-1 !rounded-[24px] !border-[#E3EEE1] !text-[#434956]"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    size="large"
                                    fullWidth
                                    onClick={() => {
                                        setShowExitConfirmDialog(false);
                                        if (typeof window !== "undefined") {
                                            const docId = appData.doctorId || authDoctorId || 0;
                                            const appId = appData.appointmentId || 0;
                                            localStorage.removeItem(`draft_consultation_${docId}_${appId}`);
                                            window.dispatchEvent(new CustomEvent("draft_consultation_changed"));
                                        }
                                        onBack();
                                    }}
                                    className="flex-1 !bg-[#EF4444] !border-[#EF4444] hover:!bg-red-600 !rounded-[24px]"
                                >
                                    Exit
                                </Button>
                            </div>
                            <Button
                                variant="outline"
                                size="large"
                                fullWidth
                                onClick={() => {
                                    setShowExitConfirmDialog(false);
                                    if (typeof window !== "undefined") {
                                        const docId = appData.doctorId || authDoctorId || 0;
                                        const appId = appData.appointmentId || 0;
                                        const draftKey = `draft_consultation_${docId}_${appId}`;
                                        const existingRaw = localStorage.getItem(draftKey);
                                        const existing = existingRaw ? JSON.parse(existingRaw) : {};
                                        const draftData = {
                                            ...existing,
                                            step,
                                            isSkipped,
                                            chiefComplaint,
                                            symptoms,
                                            currentMedication,
                                            finalDiagnosis,
                                            doctorNotes,
                                            diabetes,
                                            bloodPressure,
                                            thyroid,
                                            allergy,
                                            sitting,
                                            standing,
                                            walking,
                                            medicines,
                                            therapies,
                                            aiResponse,
                                            followUpDate,
                                            followUpRemarks
                                        };
                                        localStorage.setItem(draftKey, JSON.stringify(draftData));
                                        window.dispatchEvent(new CustomEvent("draft_consultation_changed"));
                                    }
                                    onBack();
                                }}
                                className="w-full !border-[#0B8C00] !text-[#0B8C00] hover:!bg-[#F2F8F2] font-semibold !rounded-[24px]"
                            >
                                Save Draft & Back
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            {/* Start Recording Reminder Dialog */}
            <MessageDialog
                open={showStartRecordingDialog}
                onClose={() => setShowStartRecordingDialog(false)}
                icon="/icons/questionMark.svg"
                message="Please start the AI voice recording to proceed, or choose to skip."
                confirmText="Start Recording"
                cancelText="Skip AI Recording"
                showCancel={true}
                width={480}
                onConfirm={() => {
                    setShowStartRecordingDialog(false);
                    voiceCardRef.current?.startRecording?.();
                }}
                onCancel={() => {
                    setShowStartRecordingDialog(false);
                    setIsSkipped(true);
                    setStep(3);
                }}
            />
            {/* Busy / Processing Dialog */}
            <MessageDialog
                open={showBusyDialog}
                onClose={() => setShowBusyDialog(false)}
                icon="/icons/questionMark.svg"
                message="please wait unitl the processing of the recorded audio then u are able to move on next step"
                confirmText="OK"
                showCancel={false}
                onConfirm={() => setShowBusyDialog(false)}
            />
            {selectedIafId && (
                <IafDetailsDialog
                    opdAssessmentId={Number(selectedIafId)}
                    onClose={() => setSelectedIafId(null)}
                />
            )}
            {/* Jatayu Session Expired Dialog */}
            <Dialog
                open={showSessionExpiredDialog}
                onClose={handleCancelJatayuReLogin}
                title="Session Expired"
                width={480}
                closeOnOutsideClick={false}
            >
                <div className="space-y-6">
                    <p className="text-sm text-[#434956] leading-relaxed">
                        Your Jatayu session has expired. You need to log in again to restore active voice services. Please confirm if you want to log in to Jatayu again.
                    </p>
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <Button
                            variant="outline"
                            size="medium"
                            onClick={handleCancelJatayuReLogin}
                            disabled={isJatayuActionLoading}
                            className="!border-[#E3EEE1] !text-[#434956] hover:!bg-[#F2F8F2] hover:!border-[#0B8C00]/30 hover:!text-[#0B8C00] !rounded-[24px]"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            size="medium"
                            onClick={handleConfirmJatayuReLogin}
                            isLoading={isJatayuActionLoading}
                            disabled={isJatayuActionLoading}
                            className="!rounded-[24px]"
                        >
                            Confirm
                        </Button>
                    </div>
                </div>
            </Dialog>

            {/* Jatayu Success Message Dialog */}
            <MessageDialog
                open={showJatayuSuccessDialog}
                onClose={handleConfirmJatayuSuccess}
                icon="/icons/SuccessCheck.svg"
                iconBgColor="#E8F5E9"
                message="Jatayu session restored successfully."
                confirmText="OK"
                showCancel={false}
                onConfirm={handleConfirmJatayuSuccess}
            />

            {/* Jatayu Error Message Dialog */}
            <MessageDialog
                open={showJatayuErrorDialog}
                onClose={handleConfirmJatayuError}
                icon="/icons/CrossIcon.svg"
                iconBgColor="#FFEBEE"
                message={jatayuErrorMessage}
                confirmText="OK"
                showCancel={false}
                onConfirm={handleConfirmJatayuError}
            />
        </>
    );
}

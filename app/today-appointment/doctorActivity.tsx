"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { uploadAudioReturn, refreshJatayuToken, forceLogoutJatayu } from "@/store/api/jatayuApi";
import { useLogoutMutation } from "@/store/api/authApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout, selectUser, selectLoginType } from "@/store/slices/authSlice";
import {
    useGetPatientReferralForDoctorQuery,
    useGetPatientAssessmentHistoryQuery,
    useGetPatientWalletBalanceQuery,
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
    Dialog,
    PatientInformationTimelineCard,
    IafDetailsDialog,
    ScrollableContainer,
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

    const isDoctor = loginType?.toLowerCase() === "doctor";
    const aiVoiceActivated = user?.aiVoiceActivated === true || user?.aiVoiceActivated === "true";

    const [hasJatayuAccess, setHasJatayuAccess] = useState(propHasJatayuAccess);
    const [showSessionExpiredDialog, setShowSessionExpiredDialog] = useState(false);
    const [showJatayuSuccessDialog, setShowJatayuSuccessDialog] = useState(false);
    const [showJatayuErrorDialog, setShowJatayuErrorDialog] = useState(false);
    const [isJatayuActionLoading, setIsJatayuActionLoading] = useState(false);
    const [jatayuErrorMessage, setJatayuErrorMessage] = useState("");

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
                await refreshJatayuToken();
                setHasJatayuAccess(true);
            } catch (err: any) {
                console.error("Failed to refresh Jatayu token on start:", err);
                if (err?.message === "JATAYU_SESSION_EXPIRED") {
                    setShowSessionExpiredDialog(true);
                } else {
                    setHasJatayuAccess(false);
                }
            }
        };
        checkToken();
    }, [isDoctor, aiVoiceActivated]);

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
        { skip: !appData.uhid }
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
    const [therapies, setTherapies] = useState<Array<{ therapyId: number; therapyName: string }>>([]);

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
            const visitTypeSuffix = index === 0 ? " - First Visit" : " - Follow-up Visit";
            const dateLabel = `${dateStr}${visitTypeSuffix}`;

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
            if (h.treatmentPlan?.prescribedMedicines && h.treatmentPlan.prescribedMedicines.length > 0) {
                prescribedMedicines = h.treatmentPlan.prescribedMedicines.map((m: any) => ({
                    medicineName: m.medicineName || "N/A",
                    medicineDosage: m.medicineDosage || "N/A",
                    medicineFrequency: m.medicineFrequency || "N/A",
                    medicineTiming: m.timing || m.medicineTiming || "N/A",
                    medicineDuration: m.medicineDuration || "N/A"
                }));
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
                    opdAssessmentId: h.id
                }
            };
        });
    }, [assessmentHistoryRes, appData.appointmentId]);

    const { data: referralData } = useGetPatientReferralForDoctorQuery(
        { registrationId: appointment?.registrationId || appointment?.appointmentId || 0 },
        { skip: !appointment?.registrationId && !appointment?.appointmentId }
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

    // Section 2 State (Systemic Review)
    const [diabetes, setDiabetes] = useState<"yes" | "no" | "">("");
    const [bloodPressure, setBloodPressure] = useState<"high" | "low" | "no" | "">("");
    const [thyroid, setThyroid] = useState<"hypo" | "hyper" | "no" | "">("");
    const [allergy, setAllergy] = useState<"food" | "drug" | "skin" | "no" | "">("");

    // Section 3 State (Physical Exam)
    const [sitting, setSitting] = useState<"normal" | "abnormal" | "">("");
    const [standing, setStanding] = useState<"normal" | "abnormal" | "">("");
    const [walking, setWalking] = useState<"normal" | "abnormal" | "">("");

    // Section 4 State (Medicines)
    const [medicines, setMedicines] = useState([
        { name: "", dosage: "", frequency: "", timing: "", duration: "" },
    ]);

    // AI Response tracked in parent
    const [aiResponse, setAiResponse] = useState<any>(null);

    const consultationFormRef = useRef<{ validate: () => boolean }>(null);
    const clinicalAssessmentRef = useRef<{ submit: () => void }>(null);

    const handleTranscriptionComplete = (summary: any, transcriptText: string) => {
        if (transcriptText) {
            setDoctorNotes(transcriptText);
        }
        if (!summary) return;
        const summaryObj = typeof summary === "string" ? {} : summary;

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
        let currentMedVal: "yes" | "no" | "" = "";
        const rawCurrentMed = summaryObj.medications?.currentMedication || summaryObj.medications?.currentMedications;
        if (rawCurrentMed) {
            const low = String(rawCurrentMed).toLowerCase();
            if (low === "yes" || low === "true") currentMedVal = "yes";
            else if (low === "no" || low === "false") currentMedVal = "no";
        }
        if (currentMedVal) setCurrentMedication(currentMedVal);

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
        let allergyVal: "food" | "drug" | "skin" | "no" | "" = "";
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
            else if (allergyStr.includes("skin")) allergyVal = "skin";
            else if (allergyStr.includes("nil") || allergyStr.includes("no")) allergyVal = "no";
        }
        if (allergyVal) setAllergy(allergyVal);

        // 9. physicalExamination -> balanceMobility
        let sittingVal: "normal" | "abnormal" | "" = "";
        const rawSitting = summaryObj.physicalExamination?.balanceMobility?.sitting;
        if (rawSitting) {
            const low = String(rawSitting).toLowerCase();
            if (low.includes("normal")) sittingVal = "normal";
            else if (low.includes("abnormal")) sittingVal = "abnormal";
        }
        if (sittingVal) setSitting(sittingVal);

        let standingVal: "normal" | "abnormal" | "" = "";
        const rawStanding = summaryObj.physicalExamination?.balanceMobility?.standing;
        if (rawStanding) {
            const low = String(rawStanding).toLowerCase();
            if (low.includes("normal")) standingVal = "normal";
            else if (low.includes("abnormal")) standingVal = "abnormal";
        }
        if (standingVal) setStanding(standingVal);

        let walkingVal: "normal" | "abnormal" | "" = "";
        const rawWalking = summaryObj.physicalExamination?.balanceMobility?.walking;
        if (rawWalking) {
            const low = String(rawWalking).toLowerCase();
            if (low.includes("normal")) walkingVal = "normal";
            else if (low.includes("abnormal")) walkingVal = "abnormal";
        }
        if (walkingVal) setWalking(walkingVal);

        // 10. medicines
        const rawMedicines = summaryObj.medications?.currentMedicines || summaryObj.treatmentPlan?.prescribedMedicines;
        if (Array.isArray(rawMedicines) && rawMedicines.length > 0) {
            const mappedMeds = rawMedicines.map((m: any) => ({
                name: m.medicineName || m.name || "",
                dosage: m.medicineDosage || m.dosage || "",
                frequency: m.medicineFrequency || m.frequency || "",
                timing: m.medicineTiming || m.timing || "",
                duration: m.medicineDuration || m.duration || "",
            }));
            setMedicines(mappedMeds);
        }

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

                    const res = await uploadAudioReturn({
                        audio: audioArray,
                        email: "jeena1sikho@gmail.com",
                        fields: fieldsObject,
                        name: `appointment_${appData.appointmentId || "recording"}.wav`,
                        source: "med",
                    });
                    if (res && res.summary) {
                        const summaryObj = typeof res.summary === "string" ? {} : res.summary;
                        const chief = summaryObj.chiefComplaints || "";
                        const meds = summaryObj.medicines || "";
                        if (chief) setChiefComplaint(chief);
                        if (meds) setCurrentMedication(meds);
                        if (res.transcript) setDoctorNotes(res.transcript);

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
    const patientName =
        `${appData.patientTitle || appData.patientName
            ? `${appData.patientTitle || ""} ${appData.patientName || ""}`.trim()
            : "N/A"}`
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

    console.log("appData", appData);
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
        { label: "Diabetes", value: appData.isDiabetes || "N/A" },
        { label: "HTN(hypertension)", value: appData.isHypertension || "N/A" },
        { label: "Coronary Artery Disease", value: appData.isCad || "N/A" },
        { label: "Thyroid", value: appData.isThyroid || "N/A" },
        { label: "Menstrual", value: appData.isMenstrual || "N/A" },
        // { label: "Addiction", value: appData.addictionType.length > 0 ? appData.addictionType.join(", ") : "N/A" },
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
        <AppShell>
            <div className="space-y-6 max-w-full mx-auto pb-10">

                {/* Header Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <PageHeading title="New Appointment" />
                    </div>
                    <BackToPreviousPageButton
                        text="Back"
                        onClick={() => setShowExitConfirmDialog(true)}
                    />
                </div>

                {/* 2-Column Responsive Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

                    {/* Left Column (col-span-8) */}
                    <div className="lg:col-span-8 space-y-0">
                        <ScrollableContainer maxHeight="none" className="lg:max-h-[calc(100vh-270px)] max-h-none pr-2">
                            <div className="space-y-4 pt-1 pb-1">
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
                                {/* Add here that Patient history card view only for old patient ok if the patient is new then its hide  */}
                                {isOldPatient && (
                                    <div className="mt-4 mb-4">
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
                                            appointment={appData}
                                            onTranscriptionComplete={handleTranscriptionComplete}
                                            onAudioBlobChange={(blob, duration) => {
                                                setRecordedAudio(blob);
                                                setRecordedDuration(duration);
                                            }}
                                            onSkip={() => {
                                                setIsSkipped(true);
                                                setStep(3);
                                            }}
                                            onStateChange={({ isRecording, isProcessing }) => {
                                                setIsRecording(isRecording);
                                                setIsProcessing(isProcessing);
                                            }}
                                            hasJatayuAccess={hasJatayuAccess}
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
                                        />
                                    </>
                                )}
                            </div>
                        </ScrollableContainer>
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
                        <ScrollableContainer maxHeight="none" className="lg:max-h-[calc(100vh-200px)] max-h-none pr-2">
                            <div className="space-y-6 pt-1 pb-1">
                                {/* Health Card Preview */}
                                <HealthCardPreview cardNumber={appData.jsHealthCardNo || "N/A"} />

                                {/* Medical Information */}
                                <MedicalInformationCard items={medicalItems} />

                                {/* Patient Files */}
                                <PatientFilesCard items={patientFilesItems} plainEmptyState={true} />

                                {/* Other Information */}
                                <OtherInformationCard items={otherInfoItems} />

                                {/* Appointment Detail */}
                                <AppointmentDetailCard items={appointmentItems} />

                                {/* Patient Wallet Information */}
                                <PatientWalletInformationCard
                                    remainingAmount={remainingAmount}
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
                                    branchId={resolvedBranchId}
                                />
                            </div>
                        </ScrollableContainer>
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
            {/* Exit Confirmation Dialog */}
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
                    onBack();
                }}
                onCancel={() => setShowExitConfirmDialog(false)}
            />
            {/* Start Recording Reminder Dialog */}
            <MessageDialog
                open={showStartRecordingDialog}
                onClose={() => setShowStartRecordingDialog(false)}
                icon="/icons/questionMark.svg"
                message="Please start the ai voice recording"
                confirmText="OK"
                showCancel={false}
                onConfirm={() => setShowStartRecordingDialog(false)}
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
        </AppShell>
    );
}

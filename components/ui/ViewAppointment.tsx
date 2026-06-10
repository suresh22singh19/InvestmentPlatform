"use client";

import {
    AppointmentDetailCard,
    type AppointmentDetailItem,
    PatientWalletInformationCard,
    type PatientWalletDetailItem,
    ReferralPatientInfoCard,
    type ReferralPatientInfoItem,
    PatientDetailsCard,
    type PatientDetailsBadge,
    type PatientDetailsInfoItem,
    VitalsCard,
    type VitalItem,
    PatientInformationTimelineCard,
    type PatientInformationTimelineItem,
    HealthCardPreview,
    MedicalInformationCard,
    type MedicalInformationItem,
    PatientFilesCard,
    type PatientFileItem,
    OtherInformationCard,
    type OtherInformationItem,
    DietPlanCard,
    type DietPlanEntry,
    type DietPlanHeaderAction,
    IafDetailsDialog,
} from "@/components/ui";
import { IAFCard, type IAFItem } from "./IAFCard";
import { useMemo, useState } from "react";
import { useGetPatientAssessmentHistoryQuery } from "@/store/api/doctorApi";

export interface ViewAppointmentProps {
    appointmentId?: number;
    uhid?: string;
    // Left column
    appointmentItems?: AppointmentDetailItem[];
    walletRemainingAmount?: string;
    walletDetails?: PatientWalletDetailItem[];
    onWalletActionClick?: () => void;
    referralItems?: ReferralPatientInfoItem[];
    iafItems?: IAFItem[];
    showIAF?: boolean;
    onIAFViewClick?: (item: IAFItem) => void;

    // Middle column
    patientName?: string;
    patientSubtitle?: string;
    patientBadges?: PatientDetailsBadge[];
    patientInfoItems?: PatientDetailsInfoItem[];
    showVitals?: boolean;
    vitalsItems?: VitalItem[];
    timelineItems?: PatientInformationTimelineItem[];
    showDietPlan?: boolean;
    dietPlanDecoctionValue?: string;
    dietPlanHeaderActions?: DietPlanHeaderAction[];
    dietPlanRows?: DietPlanEntry[][];
    dietPlanRoomService?: string;

    // Right column
    healthCardNo?: string;
    medicalItems?: MedicalInformationItem[];
    fileItems?: PatientFileItem[];
    fileEmptyMessage?: string;
    filePlainEmptyState?: boolean;
    otherInfoItems?: OtherInformationItem[];
}

export function ViewAppointment({
    appointmentId,
    uhid,
    // Left column
    appointmentItems,
    walletRemainingAmount = "Rs. 0",
    walletDetails,
    onWalletActionClick,
    referralItems,
    iafItems,
    showIAF = false,
    onIAFViewClick,

    // Middle column
    patientName = "N/A",
    patientSubtitle = "Contact Number: XXXXXXXXXX • Age : N/A • Gender : N/A",
    patientBadges = [],
    patientInfoItems = [],
    showVitals = true,
    vitalsItems,
    timelineItems,
    showDietPlan = false,
    dietPlanDecoctionValue = "Kadha",
    dietPlanHeaderActions = [],
    dietPlanRows = [],
    dietPlanRoomService = "N/A",

    // Right column
    healthCardNo = "",
    medicalItems,
    fileItems,
    fileEmptyMessage = "No Data Available",
    filePlainEmptyState = true,
    otherInfoItems,
}: ViewAppointmentProps) {
    const [timeframe, setTimeframe] = useState<"6m" | "1y" | "lifetime">("6m");
    const [selectedIafId, setSelectedIafId] = useState<string | null>(null);

    const apiFilter = useMemo(() => {
        if (timeframe === "6m") return "lastSixMonths";
        if (timeframe === "1y") return "lastTwelveMonths";
        return "all";
    }, [timeframe]);

    const resolvedUhid = (uhid || appointmentItems?.find(item => item.label === "UHID")?.value || "").trim();
    const isUhidValid = resolvedUhid !== "" && resolvedUhid !== "N/A";

    const { data: assessmentHistoryRes } = useGetPatientAssessmentHistoryQuery(
        { uhid: resolvedUhid, filter: apiFilter },
        { skip: !isUhidValid }
    );

    const formattedTimelineItems = useMemo(() => {
        if (!isUhidValid) {
            return timelineItems || [];
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
                    medicineTiming: m.medicineTiming || "N/A",
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
    }, [assessmentHistoryRes, appointmentId, timelineItems]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Left Column */}
            <div className="col-span-1">
                {appointmentItems && (
                    <AppointmentDetailCard items={appointmentItems} />
                )}

                {walletDetails && (
                    <PatientWalletInformationCard
                        remainingAmount={"N/A"}
                        details={walletDetails}
                        onActionClick={onWalletActionClick}
                    />
                )}

                {referralItems && (
                    <ReferralPatientInfoCard items={referralItems} />
                )}

                {/* {showIAF && (
                    <IAFCard items={iafItems} onViewClick={onIAFViewClick} />
                )} */}
            </div>

            {/* Middle Column */}
            <div className="col-span-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <div className={showVitals ? "" : "md:col-span-2"}>
                        <PatientDetailsCard
                            name={patientName}
                            subtitle={patientSubtitle}
                            badges={patientBadges}
                            infoItems={patientInfoItems}
                        />
                    </div>
                    {showVitals && vitalsItems && (
                        <VitalsCard items={vitalsItems} />
                    )}
                </div>

                <PatientInformationTimelineCard
                    title="Patient History"
                    items={formattedTimelineItems}
                    onViewIaf={(iafId) => {
                        const isNumeric = /^\d+$/.test(iafId);
                        if (isNumeric) {
                            setSelectedIafId(iafId);
                        } else if (onIAFViewClick) {
                            onIAFViewClick({ date: iafId } as any);
                        }
                    }}
                    timeframe={timeframe}
                    onTimeframeChange={setTimeframe}
                    disableClientSideFilter={!!appointmentId}
                />

                {showDietPlan && (
                    <DietPlanCard
                        decoctionValue={dietPlanDecoctionValue}
                        headerActions={dietPlanHeaderActions}
                        rows={dietPlanRows}
                        roomService={dietPlanRoomService}
                    />
                )}
            </div>

            {/* Right Column */}
            <div className="col-span-1">
                <HealthCardPreview cardNumber={healthCardNo} />

                {medicalItems && (
                    <MedicalInformationCard items={medicalItems} />
                )}

                {fileItems && (
                    <PatientFilesCard
                        items={fileItems}
                        emptyMessage={fileEmptyMessage}
                        plainEmptyState={filePlainEmptyState}
                    />
                )}

                {otherInfoItems && (
                    <OtherInformationCard items={otherInfoItems} />
                )}
            </div>

            {selectedIafId && (
                <IafDetailsDialog
                    opdAssessmentId={Number(selectedIafId)}
                    onClose={() => setSelectedIafId(null)}
                />
            )}
        </div>
    );
}

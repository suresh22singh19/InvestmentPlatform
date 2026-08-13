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
    CommunicableDiseaseCard,
    PatientDetailsVitalsCard,
} from "@/components/ui";
import { IAFCard, type IAFItem } from "./IAFCard";
import { useMemo, useState } from "react";
import { useGetPatientAssessmentHistoryQuery } from "@/store/api/doctorApi";

export interface ViewAppointmentProps {
    appointmentId?: number;
    uhid?: string;
    healthCardImageUrl?: string;
    isHealthCardLoading?: boolean;
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
    showCommunicableDisease?: boolean;
    communicableDiseases?: string[] | string;
    onCommunicableDiseaseChange?: (val: string[]) => void;

    // Right column
    healthCardNo?: string;
    medicalItems?: MedicalInformationItem[];
    fileItems?: PatientFileItem[];
    fileEmptyMessage?: string;
    filePlainEmptyState?: boolean;
    otherInfoItems?: OtherInformationItem[];
    vitalsSingleRow?: boolean;
    hideReferralCard?: boolean;
    hideWalletCard?: boolean;
    hideHealthCardPreview?: boolean;
    hideContactNumber?: boolean;
    hideAddress?: boolean;
    hideAadharCard?: boolean;
    hideBloodGroup?: boolean;
    showPatientDetailsVitalsCombined?: boolean;
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
    showCommunicableDisease = true,
    communicableDiseases: communicableDiseasesProp,
    onCommunicableDiseaseChange,

    // Right column
    healthCardNo = "",
    healthCardImageUrl,
    isHealthCardLoading,
    medicalItems,
    fileItems,
    fileEmptyMessage = "No Data Available",
    filePlainEmptyState = true,
    otherInfoItems,
    vitalsSingleRow = false,
    hideReferralCard = false,
    hideWalletCard = false,
    hideHealthCardPreview = false,
    hideContactNumber = false,
    hideAddress = false,
    hideAadharCard = false,
    hideBloodGroup = false,
    showPatientDetailsVitalsCombined = false,
}: ViewAppointmentProps) {
    const isBloodGroup = (label: string) => {
        const clean = label.trim().toUpperCase();
        return ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "A-POSITIVE", "B-POSITIVE", "AB-POSITIVE", "O-POSITIVE", "A-NEGATIVE", "B-NEGATIVE", "AB-NEGATIVE", "O-NEGATIVE"].includes(clean);
    };

    // Filter subtitle, badges, and infoItems based on props
    const displaySubtitle = useMemo(() => {
        if (!hideContactNumber) return patientSubtitle;
        return patientSubtitle.replace(/^Contact Number:\s*[^\u2022•]+\s*[\u2022•]\s*/i, "");
    }, [patientSubtitle, hideContactNumber]);

    const displayBadges = useMemo(() => {
        if (!hideBloodGroup) return patientBadges;
        return patientBadges.filter(badge => !isBloodGroup(badge.label));
    }, [patientBadges, hideBloodGroup]);

    const displayInfoItems = useMemo(() => {
        if (!hideAddress && !hideAadharCard) return patientInfoItems;
        return patientInfoItems.filter(item => {
            const lowerLabel = item.label.toLowerCase();
            if (hideAddress && lowerLabel === "address") {
                return false;
            }
            if (hideAadharCard && (lowerLabel === "aadhar card number" || lowerLabel.includes("aadhar") || lowerLabel.includes("adhar"))) {
                return false;
            }
            return true;
        });
    }, [patientInfoItems, hideAddress, hideAadharCard]);

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
    }, [assessmentHistoryRes, appointmentId, timelineItems]);

    // console.log("walletDetails", walletDetails);

    const communicableDiseasesValue = useMemo(() => {
        const raw = communicableDiseasesProp || (assessmentHistoryRes?.data?.[0] as any)?.communicableDiseases;
        if (!raw) return [];
        if (Array.isArray(raw)) {
            return raw.map(s => String(s).replace(/[{}"']/g, "").trim()).filter(Boolean);
        }
        if (typeof raw === "string" && raw.trim()) {
            return raw.replace(/[{}"']/g, "").split(",").map(s => s.trim()).filter(Boolean);
        }
        return [];
    }, [communicableDiseasesProp, assessmentHistoryRes]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Left Column */}
            <div className="col-span-1">
                {medicalItems && (
                    <MedicalInformationCard items={medicalItems} />
                )}

                {!hideReferralCard && referralItems && (
                    <ReferralPatientInfoCard items={referralItems} />
                )}

                {/* {showIAF && (
                    <IAFCard items={iafItems} onViewClick={onIAFViewClick} />
                )} */}
            </div>

            {/* Middle Column */}
            <div className="col-span-3">
                {showPatientDetailsVitalsCombined ? (
                    <div className="mb-4">
                        <PatientDetailsVitalsCard
                            name={patientName}
                            subtitle={displaySubtitle}
                            badges={displayBadges}
                            infoItems={displayInfoItems}
                            vitalsItems={showVitals && vitalsItems ? vitalsItems : []}
                            className="h-full"
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 items-stretch">
                        <div className={showVitals ? "h-full" : "md:col-span-2 h-full"}>
                            <PatientDetailsCard
                                name={patientName}
                                subtitle={displaySubtitle}
                                badges={displayBadges}
                                infoItems={displayInfoItems}
                                className="h-full !mb-0"
                            />
                        </div>
                        {showVitals && vitalsItems && (
                            <div className="h-full">
                                <VitalsCard items={vitalsItems} singleRow={vitalsSingleRow} className="h-full !mb-0" />
                            </div>
                        )}
                    </div>
                )}

                {showCommunicableDisease && (
                    <div className="mb-4">
                        <CommunicableDiseaseCard
                            value={communicableDiseasesValue}
                            onChange={onCommunicableDiseaseChange}
                        />
                    </div>
                )}

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
                {!hideHealthCardPreview && (
                    <HealthCardPreview cardNumber={healthCardNo} imageSrc={healthCardImageUrl} isHealthCardLoading={isHealthCardLoading} />
                )}


                {appointmentItems && (
                    <AppointmentDetailCard items={appointmentItems} />
                )}

                {!hideWalletCard && walletDetails && (
                    <PatientWalletInformationCard
                        remainingAmount={walletRemainingAmount}
                        details={walletDetails}
                        onActionClick={onWalletActionClick}
                    />
                )}
                {fileItems && (
                    <PatientFilesCard
                        items={fileItems}
                        emptyMessage={fileEmptyMessage}
                        plainEmptyState={filePlainEmptyState}
                    />
                )}

                {/* {otherInfoItems && (
                    <OtherInformationCard items={otherInfoItems} />
                )} */}
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

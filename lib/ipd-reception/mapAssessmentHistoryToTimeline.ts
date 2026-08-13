import type {
  PatientInformationTimelineItem,
  PrescribedMedicine,
} from "@/components/ui/PatientInformationTimelineCard";
import type { PatientAssessmentHistoryItem } from "@/store/api/doctorApi";

function formatHistoryDate(dateStr?: string): string {
  if (!dateStr) return "N/A";
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  const day = String(parsed.getDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[parsed.getMonth()];
  const year = parsed.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatFollowupDate(dateStr?: string | null): string {
  if (!dateStr || dateStr.trim() === "" || dateStr === "N/A" || dateStr === "NA") return "NA";
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
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
}

function parseMedicineString(itemStr: string) {
  const detailsMatch = itemStr.match(
    /^(.*?)\s*-\s*(.*?)\s*\((Dosage|dosage):\s*(.*?),\s*(Frequency|frequency):\s*(.*?),\s*(Timing|timing):\s*(.*?)\)$/i
  );
  if (detailsMatch) {
    return {
      medicineName: detailsMatch[1].trim(),
      medicineDuration: detailsMatch[2].trim(),
      medicineDosage: detailsMatch[4].trim(),
      medicineFrequency: detailsMatch[6].trim(),
      medicineTiming: detailsMatch[8].trim(),
    };
  }

  const nameMatch = itemStr.split(" - ");
  const name = nameMatch[0]?.trim() || itemStr;
  let duration = "N/A";
  let dosage = "N/A";
  let frequency = "N/A";
  let timing = "N/A";

  const durationMatch = itemStr.match(/-\s*([^(]+)/);
  if (durationMatch) duration = durationMatch[1].trim();
  const dosageMatch = itemStr.match(/Dosage:\s*([^,)]+)/i);
  if (dosageMatch) dosage = dosageMatch[1].trim();
  const freqMatch = itemStr.match(/Frequency:\s*([^,)]+)/i);
  if (freqMatch) frequency = freqMatch[1].trim();
  const timingMatch = itemStr.match(/Timing:\s*([^,)]+)/i);
  if (timingMatch) timing = timingMatch[1].trim();

  return {
    medicineName: name,
    medicineDuration: duration,
    medicineDosage: dosage,
    medicineFrequency: frequency,
    medicineTiming: timing,
  };
}

export function mapAssessmentHistoryToTimeline(
  historyData: PatientAssessmentHistoryItem[] | undefined
): PatientInformationTimelineItem[] {
  if (!historyData?.length) return [];

  return historyData.map((h, index) => {
    const dateStr = formatHistoryDate(h.createdAt);
    const visitTypeSuffix = index === 0 ? " - First Visit" : " - Follow-up Visit";
    const dateLabel = `${dateStr}${visitTypeSuffix}`;

    let chiefComplaintText = "N/A";
    if (h.patientPresentation?.chiefComplaint) {
      if (Array.isArray(h.patientPresentation.chiefComplaint)) {
        chiefComplaintText = h.patientPresentation.chiefComplaint
          .map((cc: { complaint?: string }) => cc?.complaint || "")
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

    if (h.medications?.allergies?.length) {
      const nonNilAllergies = h.medications.allergies.filter(
        (x) => x && x.trim().toLowerCase() !== "nil" && x.trim() !== ""
      );
      if (nonNilAllergies.length > 0) {
        detailsItems.push(`Allergies: ${nonNilAllergies.join(", ")}`);
      }
    }

    if (h.physicalExamination) {
      const parts: string[] = [];
      if (h.physicalExamination.bp && h.physicalExamination.bp !== "N/A") {
        parts.push(`BP: ${h.physicalExamination.bp}`);
      }
      if (h.physicalExamination.pulse && h.physicalExamination.pulse !== "N/A") {
        parts.push(`Pulse: ${h.physicalExamination.pulse}`);
      }
      if (h.physicalExamination.temperature && h.physicalExamination.temperature !== "N/A") {
        parts.push(`Temp: ${h.physicalExamination.temperature}`);
      }
      if (parts.length > 0) detailsItems.push(`Physical Exam: ${parts.join(" | ")}`);
    }

    if (h.systemicReview) {
      const parts: string[] = [];
      if (h.systemicReview.respiratory && h.systemicReview.respiratory.toLowerCase() !== "nil") {
        parts.push(`Respiratory: ${h.systemicReview.respiratory}`);
      }
      if (h.systemicReview.cardiovascular && h.systemicReview.cardiovascular.toLowerCase() !== "nil") {
        parts.push(`Cardiovascular: ${h.systemicReview.cardiovascular}`);
      }
      if (parts.length > 0) detailsItems.push(`Systemic Review: ${parts.join(" | ")}`);
    }

    if (h.specializedHistory) {
      const parts: string[] = [];
      if (h.specializedHistory.pastHistory && h.specializedHistory.pastHistory.toLowerCase() !== "nil") {
        parts.push(`Past History: ${h.specializedHistory.pastHistory}`);
      }
      if (h.specializedHistory.familyHistory && h.specializedHistory.familyHistory.toLowerCase() !== "nil") {
        parts.push(`Family History: ${h.specializedHistory.familyHistory}`);
      }
      if (parts.length > 0) detailsItems.push(`Specialized History: ${parts.join(" | ")}`);
    }

    if (h.investigations?.recommended?.length) {
      const nonNilInvest = h.investigations.recommended.filter(
        (x) => x && x.trim().toLowerCase() !== "nil" && x.trim() !== ""
      );
      if (nonNilInvest.length > 0) {
        detailsItems.push(`Recommended Investigations: ${nonNilInvest.join(", ")}`);
      }
    }

    if (h.treatmentPlan) {
      const parts: string[] = [];
      if (h.treatmentPlan.advice && h.treatmentPlan.advice.toLowerCase() !== "nil") {
        parts.push(`Advice: ${h.treatmentPlan.advice}`);
      }
      if (h.treatmentPlan.followUp && h.treatmentPlan.followUp.toLowerCase() !== "nil") {
        parts.push(`Follow-up: ${h.treatmentPlan.followUp}`);
      }
      if (parts.length > 0) detailsItems.push(`Treatment Plan: ${parts.join(" | ")}`);
    }

    if (h.progressMonitoring?.notes && h.progressMonitoring.notes.toLowerCase() !== "nil") {
      detailsItems.push(`Progress Notes: ${h.progressMonitoring.notes}`);
    }

    let prescribedMedicines: PrescribedMedicine[] = [];
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
          medicineName: String(m.medicineName || m.name || "N/A"),
          medicineDosage: String(dosage || "N/A"),
          medicineFrequency: String(freq || "N/A"),
          medicineTiming: String(timing || "N/A"),
          medicineDuration: String(duration || "N/A"),
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
        opdNextFollowupDate: formatFollowupDate(h.opdNextFollowupDate),
        opdNextFollowupRemark: (h.opdNextFollowupRemark && h.opdNextFollowupRemark.trim() !== "") ? h.opdNextFollowupRemark : "NA",
        communicableDiseases: (h as any).communicableDiseases || undefined,
        communicableDiseasesRemark: (h as any).communicableDiseasesRemark || undefined,
      },
    };
  });
}

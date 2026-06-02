import type { RequiredDocumentItem } from "./ipdAwaitingPatientsTypes";
import type { CreateIpdAdmissionPayload } from "./createIpdAdmissionTypes";
import type { OpenFileStep1Form } from "./openFileTypes";

type BuildCreateIpdAdmissionPayloadArgs = {
  patientId: number;
  branchId: number;
  patientName: string;
  step1Form: OpenFileStep1Form;
  requiredDocuments: RequiredDocumentItem[];
  selectedDocuments: Record<string, boolean>;
};

export function buildCreateIpdAdmissionPayload({
  patientId,
  branchId,
  patientName,
  step1Form,
  requiredDocuments,
  selectedDocuments,
}: BuildCreateIpdAdmissionPayloadArgs): CreateIpdAdmissionPayload {
  const { vitals, dietary } = step1Form;

  const documents = requiredDocuments.map((doc) => ({
    documentMasterId: doc.documentMasterId,
    isSubmitted: Boolean(selectedDocuments[String(doc.documentMasterId)]),
  }));

  return {
    patientId,
    branchId,
    patientName: patientName.trim() || "—",
    documents,
    vitals: {
      bloodPressure: vitals.bloodPressure.trim(),
      sugarLevel: vitals.sugarLevel.trim(),
      temperature: vitals.temperature.trim(),
      pulse: vitals.pulseRate.trim(),
      spo2: vitals.spo2.trim(),
      vitalsNote: dietary.clinicalNote.trim(),
      source: "ipd_reception",
    },
  };
}

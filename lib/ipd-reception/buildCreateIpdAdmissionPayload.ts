import type {
  CreateIpdAdmissionPayload,
  OpenFileStep1Form,
} from "@/lib/ipd-reception/types";

type BuildCreateIpdAdmissionPayloadArgs = {
  patientId: number;
  branchId: number;
  patientName: string;
  admissionNo: string;
  step1Form: OpenFileStep1Form;
};

export function buildCreateIpdAdmissionPayload({
  patientId,
  branchId,
  patientName,
  admissionNo,
  step1Form,
}: BuildCreateIpdAdmissionPayloadArgs): CreateIpdAdmissionPayload {
  const patientTagId = Number(step1Form.patientIdTagNumber?.trim());

  return {
    patientId,
    branchId,
    patientName: patientName.trim() || "—",
    admissionNo: admissionNo.trim(),
    patientTagId: Number.isFinite(patientTagId) ? patientTagId : 0,
  };
}

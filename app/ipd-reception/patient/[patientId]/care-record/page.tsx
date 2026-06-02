"use client";

import { useParams } from "next/navigation";
import { PatientCareRecordContent } from "@/components/ipd-reception/patient-care-record/PatientCareRecordContent";

export default function PatientCareRecordPage() {
  const params = useParams();
  const patientId = typeof params.patientId === "string" ? params.patientId : "";

  return <PatientCareRecordContent patientId={patientId} />;
}

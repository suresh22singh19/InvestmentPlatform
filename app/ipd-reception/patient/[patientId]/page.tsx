"use client";

import { useParams } from "next/navigation";
import { ViewPatientContent } from "@/components/ipd-reception/ViewPatientContent";

export default function ReceptionViewPatientPage() {
  const params = useParams();
  const patientId = typeof params.patientId === "string" ? params.patientId : "";

  return <ViewPatientContent patientId={patientId} />;
}

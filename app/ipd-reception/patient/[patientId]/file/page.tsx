"use client";

import { useParams } from "next/navigation";
import { OpenFileFlow } from "@/components/ipd-reception/open-file/OpenFileFlow";

export default function ReceptionOpenFilePage() {
  const params = useParams();
  const patientId = typeof params.patientId === "string" ? params.patientId : "";

  return <OpenFileFlow patientId={patientId} />;
}

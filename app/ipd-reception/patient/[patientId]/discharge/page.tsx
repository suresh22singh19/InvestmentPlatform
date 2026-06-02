"use client";

import { useParams } from "next/navigation";
import { DischargeFlow } from "@/components/ipd-reception/discharge/DischargeFlow";

export default function ReceptionDischargePage() {
  const params = useParams();
  const patientId = typeof params.patientId === "string" ? params.patientId : "";

  return <DischargeFlow patientId={patientId} />;
}

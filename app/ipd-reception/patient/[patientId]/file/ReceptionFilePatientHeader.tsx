"use client";

import { useEffect, useRef, useState } from "react";
import { Tooltip } from "@/components/ui";
import type { OpenFilePatientDetails } from "@/lib/ipd-reception/types";

type ReceptionFilePatientHeaderProps = {
  patient: OpenFilePatientDetails;
};

function TruncatedPatientName({ name }: { name: string }) {
  const value = name?.trim() ? name.trim() : "—";
  const textRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;

    const checkTruncation = () => {
      setIsTruncated(element.scrollWidth > element.clientWidth + 1);
    };

    checkTruncation();

    const observer = new ResizeObserver(checkTruncation);
    observer.observe(element);
    return () => observer.disconnect();
  }, [value]);

  return (
    <Tooltip
      position="top"
      maxWidth={360}
      disabled={!isTruncated}
      className="!overflow-visible !py-2.5"
      content={
        <p className="m-0 max-w-[340px] whitespace-normal break-words text-left text-xs leading-[1.6] text-[#262D3B]">
          {value}
        </p>
      }
    >
      <div className="flex min-w-0 w-fit max-w-[600px] items-center">
        <h2 className="m-0 min-w-0 text-xl font-bold text-[#262D3B] text-[26px]">
          <span ref={textRef} className="block overflow-hidden whitespace-nowrap">
            {value}
          </span>
        </h2>
        {isTruncated ? <span className="shrink-0 pl-1.5 text-[#434956]">...</span> : null}
      </div>
    </Tooltip>
  );
}

function MetaValue({ children }: { children: string }) {
  return <span className="font-bold text-[#262D3B]">{children}</span>;
}

export function ReceptionFilePatientHeader({ patient }: ReceptionFilePatientHeaderProps) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        <TruncatedPatientName name={patient.patientName} />
        <p className="text-xs text-[#262D3B]">
          <span>UHID: </span>
          <MetaValue>{patient.uhid}</MetaValue>
          {" • Age: "}
          <MetaValue>{patient.age}</MetaValue>
          {" • Gender: "}
          <MetaValue>{patient.gender}</MetaValue>
          {" • Bed Number: "}
          <MetaValue>{patient.bedNumber}</MetaValue>
        </p>
        <p className="text-xs text-[#262D3B]">
          <span>Room Number: </span>
          <MetaValue>{patient.roomNumber}</MetaValue>
          {" • Admission Date: "}
          <MetaValue>{patient.admissionDate}</MetaValue>
          {" • OPD Doctor: "}
          <MetaValue>{patient.opdDoctor}</MetaValue>
        </p>
      </div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function GateManagementPanel() {
  const router = useRouter();

  const handleViewReports = () => {
    router.push("/gate/reports");
  };

  return (
    <div className="w-full max-w-[590px] mx-auto">
      <div className="bg-white rounded-[32px] p-8 flex flex-col gap-[32px]">
        {/* Header Section */}
        <div className="flex flex-col gap-4">
          <h1 className="text-[24px] font-semibold leading-[130%] text-[#434956]">
            Gate Management Panel
          </h1>
          <p className="text-[14px] font-normal leading-[120%] text-[#434956]">
            Manage and record all patient and visitor entries.
          </p>
        </div>

        {/* Entry Type Buttons */}
        <div className="flex flex-col gap-[32px]">
          {/* Row 1: New Patient and Revisit Patient */}
          <div className="flex gap-[32px]">
            <Button
              variant="outline"
              fullWidth
              onClick={() => router.push("/gate/new-patient")}
              className="h-[51px] rounded-[32px] text-base font-medium !rounded-[32px] flex-1"
            >
              New Patient
            </Button>
            <Button
              variant="outline"
              fullWidth
              onClick={() => router.push("/gate/revisit-patient")}
              className="h-[51px] rounded-[32px] text-base font-medium !rounded-[32px] flex-1"
            >
              Revisit Patient
            </Button>
          </div>

          {/* Row 2: Patient Visitor and IPD Visitor */}
          <div className="flex gap-[32px]">
            <Button
              variant="outline"
              fullWidth
              onClick={() => router.push("/gate/patient-visitor")}
              className="h-[51px] rounded-[32px] text-base font-medium !rounded-[32px] flex-1"
            >
              Patient Visitor
            </Button>
            <Button
              variant="outline"
              fullWidth
              onClick={() => router.push("/gate/ipd-visitor")}
              className="h-[51px] rounded-[32px] text-base font-medium !rounded-[32px] flex-1"
            >
              IPD Visitor
            </Button>
          </div>

          {/* Row 3: Other and Patient Medicine type */}
          <div className="flex gap-[32px]">
            <Button
              variant="outline"
              fullWidth
              onClick={() => router.push("/gate/other")}
              className="h-[51px] rounded-[32px] text-base font-medium !rounded-[32px] flex-1"
            >
              Other
            </Button>
            <Button
              variant="outline"
              fullWidth
              onClick={() => router.push("/gate/patient-medicine-type")}
              className="h-[51px] rounded-[32px] text-base font-medium !rounded-[32px] flex-1"
            >
              Patient Medicine Type
            </Button>
          </div>
        </div>

        {/* Separator */}
        <div className="flex items-center justify-center gap-2">
          <div className="flex-1 border-t border-[#E6E6E6]"></div>
          <span className="text-sm text-[#8A8F9B] px-2">Or</span>
          <div className="flex-1 border-t border-[#E6E6E6]"></div>
        </div>

        {/* View Daily Reports Button */}
        <Button
          variant="primary"
          fullWidth
          onClick={handleViewReports}
          className="h-[51px] rounded-[32px] text-base font-medium !rounded-[32px]"
        >
          View Daily Reports
        </Button>
      </div>
    </div>
  );
}


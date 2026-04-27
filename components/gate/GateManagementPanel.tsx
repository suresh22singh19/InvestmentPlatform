"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useAppSelector } from "@/store/hooks";
import { selectPermissionsMap } from "@/store/slices/authSlice";
import { getSubModulePermissions } from "@/utils/permission";

const GATE_MODULE = "Gate";

const GATE_BUTTONS: {
  label: string;
  subModule: string;
  route: string;
}[] = [
  { label: "New Patient", subModule: "New Patient", route: "/gate/new-patient" },
  { label: "Revisit Patient", subModule: "Revisit Patient", route: "/gate/revisit-patient" },
  { label: "OPD Visitor", subModule: "OPD Visitor", route: "/gate/patient-visitor" },
  { label: "IPD Visitor", subModule: "IPD Visitor", route: "/gate/ipd-visitor" },
  { label: "Other Visitor", subModule: "Other Visitor", route: "/gate/other" },
  { label: "Patient Medicine Type", subModule: "Patient Medicine Type", route: "/gate/patient-medicine-type" },
];

export function GateManagementPanel() {
  const router = useRouter();
  const permissionsMap = useAppSelector(selectPermissionsMap);

  const visibleButtons = useMemo(
    () =>
      GATE_BUTTONS.filter(
        (btn) => getSubModulePermissions(permissionsMap, GATE_MODULE, btn.subModule).canAdd
      ),
    [permissionsMap]
  );

  const canViewReports = useMemo(
    () => getSubModulePermissions(permissionsMap, GATE_MODULE, "View Daily Reports").canView,
    [permissionsMap]
  );

  const rows: { label: string; route: string }[][] = [];
  for (let i = 0; i < visibleButtons.length; i += 2) {
    rows.push(visibleButtons.slice(i, i + 2));
  }

  return (
    <div className="w-full max-w-[590px] mx-auto">
      <div className="bg-white rounded-[32px] p-8 flex flex-col gap-[32px]">
        <div className="flex flex-col gap-4">
          <h1 className="text-[24px] font-semibold leading-[130%] text-[#434956]">
            Gate Management Panel
          </h1>
          <p className="text-[14px] font-normal leading-[120%] text-[#434956]">
            Manage and record all patient and visitor entries.
          </p>
        </div>

        {rows.length > 0 && (
          <div className="flex flex-col gap-[32px]">
            {rows.map((row, idx) => (
              <div key={idx} className="flex gap-[32px]">
                {row.map((btn) => (
                  <div key={btn.route} className="flex-1">
                    <Button
                      variant="outline"
                      fullWidth
                      onClick={() => router.push(btn.route)}
                      className="h-[51px] rounded-[32px] text-base font-medium !rounded-[32px]"
                    >
                      {btn.label}
                    </Button>
                  </div>
                ))}
                {row.length === 1 && <div className="flex-1" />}
              </div>
            ))}
          </div>
        )}

        {canViewReports && rows.length > 0 && (
          <div className="flex items-center justify-center gap-2">
            <div className="flex-1 border-t border-[#E6E6E6]"></div>
            <span className="text-sm text-[#8A8F9B] px-2">Or</span>
            <div className="flex-1 border-t border-[#E6E6E6]"></div>
          </div>
        )}

        {canViewReports && (
          <Button
            variant="primary"
            fullWidth
            onClick={() => router.push("/gate/reports")}
            className="h-[51px] rounded-[32px] text-base font-medium !rounded-[32px]"
          >
            View Daily Reports
          </Button>
        )}

        {rows.length === 0 && !canViewReports && (
          <p className="text-center text-[15px] text-[#8A8F9B] py-4">
            You don&apos;t have access to any gate modules. Please contact your administrator.
          </p>
        )}
      </div>
    </div>
  );
}


"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import GateEntryLayout from "@/components/gate/GateEntryLayout";
import { GoToHomeButton, Dialog, Table, TableHeader, TableBody, TableRow, TableHead, TableData } from "@/components/ui";
import { useGetRegistrationsByPhoneQuery } from "@/store/api/gateApi";
import { useAppSelector } from "@/store/hooks";
import { selectUserBranchId } from "@/store/slices/authSlice";

export default function GateRegistrationsByPhonePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phoneNumber = searchParams?.get("phoneNumber");
  const userBranchId = useAppSelector(selectUserBranchId);
  const branchId = userBranchId ?? 1;
  
  const [showRevisitDataDialog, setShowRevisitDataDialog] = useState(true); // Show dialog by default when page loads
  
  // Fetch revisit patient data when phoneNumber is in URL
  const { data: revisitData, isLoading: isLoadingRevisitData } = useGetRegistrationsByPhoneQuery(
    { branchId, phoneNumber: phoneNumber || "" },
    { skip: !phoneNumber }
  );

  const handleGoToHome = () => {
    router.push("/gate");
  };

  const handleCloseDialog = () => {
    setShowRevisitDataDialog(false);
    router.push("/gate/new-patient");
  };

  return (
    <GateEntryLayout title="" subModuleName="New Patient">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[24px] font-semibold leading-[130%] text-[#434956]">Revisit Patient</h1>
          <GoToHomeButton onClick={handleGoToHome} />
        </div>

        {/* Revisit Patient Data Dialog */}
        <Dialog
          open={showRevisitDataDialog}
          onClose={handleCloseDialog}
          title="Patient"
          width={1440}
        >
          <div className="space-y-6">
            <div className="flex items-center justify-center rounded-[8px] border border-[#0B8C00]/20 bg-[#0B8C00]/20 px-5 py-4">
              <p className="text-[28px] font-medium leading-[120%] text-[#0B8C00]">
                Patient Already Exists
              </p>
            </div>

            {isLoadingRevisitData ? (
              <div className="py-12 text-center text-sm text-[#9CA3AF]">
                Loading revisit patient data...
              </div>
            ) : revisitData?.success && revisitData?.data && revisitData.data.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-white">
                    <TableHead position="first">Sr no.</TableHead>
                    <TableHead sortable>UHID</TableHead>
                    <TableHead sortable>Name</TableHead>
                    <TableHead sortable>Branch Name</TableHead>
                    <TableHead position="last">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revisitData.data.map((item: any, index: number) => (
                    <TableRow
                      key={item.id || index}
                      className="bg-white transition-colors hover:bg-[#F7FAF7]"
                    >
                      <TableData variant="primary">{index + 1}</TableData>
                      <TableData>{item.uhid || "-"}</TableData>
                      <TableData>{item.name || item.patientName || "-"}</TableData>
                      <TableData>{item.branchName || "-"}</TableData>
                      <TableData>
                        <button
                          type="button"
                          className="flex h-7 items-center justify-center rounded-[32px] border border-[#0B8C00] bg-white px-4 text-sm font-medium text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] whitespace-nowrap"
                        >
                          Revisit
                        </button>
                      </TableData>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-12 text-center text-sm text-[#9CA3AF]">
                No revisit patient data found
              </div>
            )}
          </div>
        </Dialog>
      </div>
    </GateEntryLayout>
  );
}

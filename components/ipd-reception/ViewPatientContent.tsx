"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
  AppointmentDetailCard,
  BackToPreviousPageButton,
  DietPlanCard,
  HealthCardPreview,
  MedicalInformationCard,
  OtherInformationCard,
  PatientDetailsCard,
  PatientFilesCard,
  PatientInformationTimelineCard,
  PatientWalletInformationCard,
  ReferralPatientInfoCard,
  VitalsCard,
} from "@/components/ui";
import { useGetIpdPatientOverviewQuery } from "@/store/api/ipdReceptionApi";
import { useAppSelector } from "@/store/hooks";
import { resolveReceptionBranchId } from "@/lib/ipd-reception/resolveReceptionBranchId";
import { selectSelectedBranch, selectUserBranchId } from "@/store/slices/authSlice";
import { getRtkErrorMessage } from "@/lib/ipd-reception/mapIpdAwaitingPatients";
import { mapIpdPatientOverviewToView } from "@/lib/ipd-reception/mapIpdPatientOverview";
import {
  RECEPTION_VIEW_PATIENT_DEFAULT,
  RECEPTION_VIEW_PATIENT_FILES,
  RECEPTION_VIEW_PATIENT_WALLET_DETAILS,
} from "@/lib/ipd-reception/viewPatientMock";

type ViewPatientContentProps = {
  patientId: string;
};

export function ViewPatientContent({ patientId }: ViewPatientContentProps) {
  const router = useRouter();
  const selectedBranch = useAppSelector(selectSelectedBranch);
  const userBranchId = useAppSelector(selectUserBranchId);

  const numericPatientId = Number(patientId);
  const isValidPatientId = Number.isFinite(numericPatientId) && numericPatientId > 0;

  const branchIdFromAuth = useMemo(
    () =>
      resolveReceptionBranchId({
        selectedBranchId: selectedBranch?.id,
        userBranchId,
      }),
    [selectedBranch?.id, userBranchId]
  );

  const { data: overviewResponse, isLoading, isError, error } = useGetIpdPatientOverviewQuery(
    { patientId: numericPatientId, branchId: branchIdFromAuth },
    { skip: !isValidPatientId, refetchOnMountOrArgChange: true }
  );

  const patientView = useMemo(
    () => mapIpdPatientOverviewToView(overviewResponse?.data),
    [overviewResponse?.data]
  );

  const errorMessage = isError
    ? getRtkErrorMessage(error, "Failed to load patient overview.")
    : !isValidPatientId
      ? "Invalid patient ID."
      : undefined;

  if (isLoading) {
    return (
      <AppShell>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <PageHeading title="View" />
          <BackToPreviousPageButton text="Back" onClick={() => router.back()} />
        </div>
        <p className="text-sm text-[#9FA2AB]">Loading patient details...</p>
      </AppShell>
    );
  }

  if (errorMessage || !patientView) {
    return (
      <AppShell>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <PageHeading title="View" />
          <BackToPreviousPageButton text="Back" onClick={() => router.back()} />
        </div>
        <p className="text-sm text-[#EF4444]">{errorMessage ?? "Patient details not found."}</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeading title="View" />
        <BackToPreviousPageButton text="Back" onClick={() => router.back()} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="xl:col-span-1">
          <AppointmentDetailCard items={patientView.appointmentItems} />
          <PatientWalletInformationCard
            remainingAmount={RECEPTION_VIEW_PATIENT_DEFAULT.walletRemaining}
            details={RECEPTION_VIEW_PATIENT_WALLET_DETAILS}
          />
          <ReferralPatientInfoCard items={patientView.referralItems} />
        </div>

        <div className="xl:col-span-3">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <PatientDetailsCard
              name={patientView.name}
              subtitle={patientView.subtitle}
              badges={patientView.badges}
              infoItems={patientView.infoItems}
            />
            <VitalsCard items={patientView.vitals} />
          </div>

          <DietPlanCard
            decoctionValue={patientView.dietDecoction}
            rows={patientView.dietRows}
            roomService={null}
          />

          {patientView.timelineItems.length > 0 ? (
            <PatientInformationTimelineCard
              title="Patient History"
              items={patientView.timelineItems}
            />
          ) : null}
        </div>

        <div className="xl:col-span-1">
          <HealthCardPreview cardNumber={patientView.healthCardNumber} />
          <MedicalInformationCard items={patientView.medicalItems} />
          <PatientFilesCard items={RECEPTION_VIEW_PATIENT_FILES} />
          <OtherInformationCard items={patientView.otherItems} />
        </div>
      </div>
    </AppShell>
  );
}

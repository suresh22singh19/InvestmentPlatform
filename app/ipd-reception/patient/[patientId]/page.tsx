"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
  AppointmentDetailCard,
  BackToPreviousPageButton,
  DietPlanCard,
  HealthCardPreview,
  IafDetailsDialog,
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
import { useGetPatientAssessmentHistoryQuery } from "@/store/api/doctorApi";
import { useAppSelector } from "@/store/hooks";
import { resolveReceptionBranchId } from "@/lib/ipd-reception/resolveReceptionBranchId";
import { selectSelectedBranch, selectUserBranchId } from "@/store/slices/authSlice";
import { getRtkErrorMessage } from "@/lib/ipd-reception/mapIpdAwaitingPatients";
import { mapIpdPatientOverviewToView } from "@/lib/ipd-reception/mapIpdPatientOverview";
import { mapAssessmentHistoryToTimeline } from "@/lib/ipd-reception/mapAssessmentHistoryToTimeline";
import { useGetPatientFilesQuery, useGetPatientHealthCardByUhidQuery, useGetPatientWalletDataQuery, useLazyGetPresignedUrlQuery } from "@/store/api/commonApi";


// Helper function to extract S3 key from image URL or key string
const extractS3Key = (imageStr: string | null | undefined): string | null => {
    if (!imageStr || !imageStr.trim()) return null;
    let raw = imageStr.trim().split('?')[0];
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
        try {
            const urlObj = new URL(raw);
            return urlObj.pathname.replace(/^\//, "");
        } catch {
            const match = raw.match(/amazonaws\.com\/(.+)/);
            if (match && match[1]) return match[1];
        }
    }
    return raw;
};

export default function ReceptionViewPatientPage() {
  const params = useParams();
  const patientId = typeof params?.patientId === "string" ? params?.patientId : "";

  const router = useRouter();
  const selectedBranch = useAppSelector(selectSelectedBranch);
  const userBranchId = useAppSelector(selectUserBranchId);
  const [timeframe, setTimeframe] = useState<"6m" | "1y" | "lifetime">("6m");
  const [selectedIafId, setSelectedIafId] = useState<string | null>(null);
  const [cardImageUrl, setCardImageUrl] = useState<string | null>(null);
  const [isFetchingPresignedImage, setIsFetchingPresignedImage] = useState<boolean>(false);

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

  const overviewData = overviewResponse?.data;
  const resolvedUhid = (overviewData?.uhid || "").trim();
  const isUhidValid = resolvedUhid !== "" && resolvedUhid !== "N/A";
  const canFetchWallet = isUhidValid;

  const { data: walletResponse } = useGetPatientWalletDataQuery(
    {
      uhid: resolvedUhid,
      ...(branchIdFromAuth != null ? { branchId: branchIdFromAuth } : {}),
    },
    { skip: !canFetchWallet, refetchOnMountOrArgChange: true }
  );

  const patientView = useMemo(
    () => mapIpdPatientOverviewToView(overviewData, walletResponse?.data),
    [overviewData, walletResponse?.data]
  );

  const apiFilter = useMemo(() => {
    if (timeframe === "6m") return "lastSixMonths" as const;
    if (timeframe === "1y") return "lastTwelveMonths" as const;
    return "all" as const;
  }, [timeframe]);

  const { data: assessmentHistoryRes } = useGetPatientAssessmentHistoryQuery(
    { uhid: resolvedUhid, filter: apiFilter },
    { skip: !isUhidValid }
  );

  const timelineItems = useMemo(
    () => mapAssessmentHistoryToTimeline(assessmentHistoryRes?.data),
    [assessmentHistoryRes?.data]
  );

  const [getPresignedUrl] = useLazyGetPresignedUrlQuery();
  const { data: patientFilesResponse } = useGetPatientFilesQuery(
    { uhid: resolvedUhid },
    { skip: !isUhidValid, refetchOnMountOrArgChange: true }
  );

  // Fetch health card details by UHID
    const { data: healthCardResponse, isLoading: isFetchingHealthCard } = useGetPatientHealthCardByUhidQuery(
        { uhid: resolvedUhid },
        { skip: !isUhidValid }
    );
    const healthCardData = healthCardResponse?.data;

      useEffect(() => {
            const rawImage = healthCardData?.image;
            if (!rawImage) {
                setCardImageUrl(null);
                return;
            }
    
            const key = extractS3Key(rawImage);
            if (!key) {
                setCardImageUrl(null);
                return;
            }
    
            let isMounted = true;
            setIsFetchingPresignedImage(true);
    
            getPresignedUrl({ key })
                .unwrap()
                .then((res) => {
                    if (isMounted) {
                        if (res?.data?.signedUrl) {
                            setCardImageUrl(res.data.signedUrl);
                        } else {
                            setCardImageUrl(null);
                        }
                    }
                })
                .catch((err) => {
                    console.error("Failed to fetch presigned URL for health card image:", err);
                    if (isMounted) setCardImageUrl(null);
                })
                .finally(() => {
                    if (isMounted) setIsFetchingPresignedImage(false);
                });
    
            return () => {
                isMounted = false;
            };
        }, [healthCardData?.image, getPresignedUrl]);

      const isHealthCardLoading = isFetchingHealthCard || isFetchingPresignedImage;


  const handleViewFile = async (filePath: string) => {
    try {
      const result = await getPresignedUrl({ key: filePath }).unwrap();
      const signedUrl = result?.data?.signedUrl;
      if (signedUrl) {
        window.open(signedUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      console.error("Failed to get presigned URL:", err);
      alert("Failed to open file. Please try again.");
    }
  };

  const patientFilesItems = useMemo(() => {
    const files = patientFilesResponse?.data;
    if (!Array.isArray(files)) return [];
    return files.map((file) => {
      const formattedDate = file.createdAt
        ? new Date(file.createdAt).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "";
      return {
        name: file.fileName || "File",
        size: `${file.fileType || "Document"} • ${formattedDate}`,
        onClick: () => handleViewFile(file.path),
        actionIconSrc: "/icons/ViewEyeIcon.svg",
        actionIconAlt: "View File",
      };
    });
  }, [patientFilesResponse]);

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
          <PatientWalletInformationCard remainingAmount={patientView?.remainingAmount || "N/A" } details={patientView?.walletItems} />
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

          <PatientInformationTimelineCard
            title="Patient History"
            items={timelineItems}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
            disableClientSideFilter
            onViewIaf={(iafId) => {
              if (/^\d+$/.test(iafId)) {
                setSelectedIafId(iafId);
              }
            }}
          />
        </div>

        <div className="xl:col-span-1">
          <HealthCardPreview cardNumber={patientView.healthCardNumber} isHealthCardLoading={isHealthCardLoading}  />
          <MedicalInformationCard items={patientView.medicalItems} />
          <PatientFilesCard items={patientFilesItems} />
          <OtherInformationCard items={patientView.otherItems} />
        </div>
      </div>

      {selectedIafId ? (
        <IafDetailsDialog
          opdAssessmentId={Number(selectedIafId)}
          onClose={() => setSelectedIafId(null)}
        />
      ) : null}
    </AppShell>
  );
}

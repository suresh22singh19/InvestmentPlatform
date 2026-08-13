"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { Badge, ViewAppointment, BackToPreviousPageButton, MessageDialog, SpinnerLoader, PatientWalletDetailItem, Tooltip } from "@/components/ui";
import RoomAllocation from "./roomAllowcation";
import AdmissionPayment from "./admission&payment";
import CreatePackage, { type AttendantDetailsFormData, type EditAdmissionPrefill } from "./createPackage";
import IpdAdmissionStep from "./IpdAdmissionStep";
import { useSearchParams, useRouter } from "next/navigation";
import {
    useGetReferredPatientsQuery,
    useLazyGetPatientDetailQuery,
    useLazyGetPatientDetailByAppointmentQuery,
    useGetAdmissionDetailsQuery,
    useLazyGetAdmissionDetailsQuery,
    useGetTentativeDetailsByPatientIdQuery,
    type CounsellorPatientListItem,
    type CompletePatientAdmissionRoom,
    type AdmissionDetailsData,
} from "@/store/api/counsellorApi";
import type { PackageItem } from "@/store/api/settingsApi";
import { useAppSelector } from "@/store/hooks";
import { selectUserBranchId } from "@/store/slices/authSlice";
import { useGetPatientFilesQuery, useGetPatientHealthCardByUhidQuery, useLazyGetPresignedUrlQuery } from "@/store/api/commonApi";

function findReferredPatientRow(
    data: CounsellorPatientListItem[] | undefined,
    patientIdParam: number | null,
    branchIdParam: number | null
) {
    if (!data || patientIdParam == null) return undefined;
    // return data.find(
    //     (d) => Number(d.patientId) === patientIdParam || Number(d.id) === patientIdParam
    // );

    // console.log("datafeueye",data,patientIdParam,branchIdParam)

    return data.find((d) => Number(d.patientId) === patientIdParam && Number(d.branchId) === branchIdParam);
}
function mapApiAdmissionTypeToUi(type: string): string {
    const normalized = type.trim().toLowerCase();
    if (normalized === "immediate") return "immediate";
    if (normalized === "schedule" || normalized === "scheduled") return "scheduled";
    if (normalized === "tentative") return "tentative";
    return "";
}

function mapApiPatientTypeToUi(type: string): string {
    const normalized = type.trim().toLowerCase();
    if (normalized === "daycare" || normalized === "day_care") return "day_care";
    if (normalized === "ipd") return "ipd";
    return normalized;
}

function isDayCarePackageType(type?: string | null): boolean {
    return mapApiPatientTypeToUi(type ?? "") === "day_care";
}

function mapApiPatientCategoryToUi(value?: string | null): string {
    const normalized = value?.trim().toLowerCase() ?? "";
    if (!normalized) return "";
    if (normalized === "tpa") return "tpa";
    if (normalized === "normal" || normalized === "private") return "normal";
    if (normalized === "panel") return "panel";
    return "";
}

function resolvePatientTypeFromApi(value?: string | null): {
    category: string;
    admissionFilterType: string;
} {
    const normalized = value?.trim().toLowerCase().replace(/-/g, "_") ?? "";
    if (!normalized) return { category: "", admissionFilterType: "" };
    if (normalized === "ipd") return { category: "", admissionFilterType: "ipd" };
    if (normalized === "daycare" || normalized === "day_care") {
        return { category: "", admissionFilterType: "day_care" };
    }
    return {
        category: mapApiPatientCategoryToUi(value),
        admissionFilterType: "",
    };
}


function TruncatedPatientName({ name }: { name: string }) {
    const value = name?.trim() ? name.trim() : "N/A";
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
            <div
                className="flex min-w-0 w-fit max-w-[600px] items-center"
            >
                <h2 className="m-0 min-w-0 text-xl font-bold text-[#262D3B]">
                    <span ref={textRef} className="block overflow-hidden whitespace-nowrap">
                        {value}
                    </span>
                </h2>
                {isTruncated ? <span className="shrink-0 pl-1.5 text-[#434956]">...</span> : null}
            </div>
        </Tooltip>
    );
}

function mapApiDiseaseTypeToUi(type: string): string {
    const normalized = type.trim().toLowerCase();
    if (normalized === "ckd") return "ckd";
    if (normalized === "others" || normalized === "other") return "other";
    return "other";
}

function formatAdmissionDateInput(iso?: string): string {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatCounsellingAppointmentDate(dateString?: string | null): string {
    if (!dateString?.trim()) return "N/A";
    const trimmed = dateString.trim();
    const isoDateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoDateMatch) {
        const [, year, month, day] = isoDateMatch;
        return `${day}/${month}/${year}`;
    }
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return trimmed;
    const day = String(parsed.getDate()).padStart(2, "0");
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const year = parsed.getFullYear();
    return `${day}/${month}/${year}`;
}

function formatCounsellingCreatedDate(dateString?: string | null): string {
    if (!dateString?.trim()) return "N/A";
    const trimmed = dateString.trim();
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return trimmed;
    const day = String(parsed.getDate()).padStart(2, "0");
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const year = parsed.getFullYear();
    const hours = String(parsed.getHours()).padStart(2, "0");
    const minutes = String(parsed.getMinutes()).padStart(2, "0");
    const seconds = String(parsed.getSeconds()).padStart(2, "0");
    return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
}

function resolveInitialRoomTypeForAllocation(
    activePackage: PackageItem | null,
    editAdmissionRoomType?: { id?: number; key?: string; name?: string }
): { id?: number; key?: string; name?: string } | undefined {
    if (editAdmissionRoomType?.key?.trim() || editAdmissionRoomType?.name?.trim()) {
        return editAdmissionRoomType;
    }

    const pkgRoomType = activePackage?.roomType;
    if (!pkgRoomType) return undefined;

    const key = pkgRoomType.key?.trim() || undefined;
    const name = pkgRoomType.name?.trim() || undefined;
    if (!key && !name) return undefined;

    return { key, name };
}

function mapPanelNameToPatientCategory(panelName?: string | null): string {
    const normalized = panelName?.trim().toLowerCase() ?? "";
    if (!normalized) return "";
    if (normalized === "tpa") return "tpa";
    if (normalized === "normal" || normalized === "private") return "normal";
    if (normalized === "panel") return "panel";
    return "panel";
}

function resolvePatientCategoryFromAdmissionDetails(data: AdmissionDetailsData): string {
    const fromCategory = mapApiPatientCategoryToUi(data.patientCategory);
    if (fromCategory) return fromCategory;

    const fromPatient = mapApiPatientCategoryToUi(data.patient?.patientType);
    if (fromPatient) return fromPatient;

    if (data.package?.panelName?.trim()) {
        return mapPanelNameToPatientCategory(data.package.panelName);
    }

    if (data.panelName?.trim()) {
        return mapPanelNameToPatientCategory(data.panelName);
    }

    if (data.panelId != null && Number(data.panelId) > 0) {
        return "panel";
    }

    return "";
}

function resolveAdmissionPanelId(data: AdmissionDetailsData): number | undefined {
    const fromPatient = data.patient?.panelId != null ? Number(data.patient.panelId) : undefined;
    if (fromPatient != null && fromPatient > 0) return fromPatient;

    const topLevel = data.panelId != null ? Number(data.panelId) : undefined;
    if (topLevel != null && topLevel > 0) return topLevel;

    const fromPackage = data.package?.panelId != null ? Number(data.package.panelId) : undefined;
    if (fromPackage != null && fromPackage > 0) return fromPackage;

    return undefined;
}

function mapAdmissionPackageToPackageItem(
    pkg: NonNullable<AdmissionDetailsData["package"]>
): PackageItem {
    const toFlag = (value: boolean | number | undefined) => (value ? 1 : 0);
    return {
        id: pkg.id,
        branchId: pkg.branchId,
        branchRoomTypeId: pkg.branchRoomTypeId ?? 0,
        diseaseCategoryType: pkg.diseaseCategoryType ?? "",
        packageType: pkg.packageType ?? "ipd",
        packageName: pkg.packageName ?? "",
        remark: pkg.remark ?? "",
        medicineEnabled: toFlag(pkg.medicineEnabled),
        medicinePrice: pkg.medicinePrice ?? "0",
        mealsEnabled: toFlag(pkg.mealsEnabled),
        mealsPrice: pkg.mealsPrice ?? "0",
        doctorFeeEnabled: toFlag(pkg.doctorFeeEnabled),
        doctorFeePrice: pkg.doctorFeePrice ?? "0",
        nurseFeeEnabled: toFlag(pkg.nurseFeeEnabled),
        nurseFeePrice: pkg.nurseFeePrice ?? "0",
        attendantFeeEnabled: toFlag(pkg.attendantFeeEnabled),
        attendantFeePrice: pkg.attendantFeePrice ?? "0",
        therapyEnabled: toFlag(pkg.therapyEnabled),
        therapyLoad: pkg.therapyLoad ?? 1,
        therapySessionsPerDay: pkg.therapySessionsPerDay ?? 0,
        therapyPrice: pkg.therapyPrice ?? "0",
        branchRoomType: pkg.branchRoomType?.roomRentPrice != null
            ? { id: pkg.branchRoomType.id ?? 0, roomRentPrice: Number(pkg.branchRoomType.roomRentPrice) }
            : undefined,
        isPackageActive: pkg.isPackageActive ?? true,
        branchName: pkg.branchName ?? "",
        createdAt: pkg.createdAt ?? "",
        updatedAt: pkg.updatedAt ?? "",
        panelId: pkg.panelId ?? undefined,
        panelName: pkg.panelName ?? undefined,
        ...(pkg.roomType?.key?.trim() || pkg.roomType?.name?.trim()
            ? {
                  roomType: {
                      ...(pkg.roomType.key?.trim() ? { key: pkg.roomType.key.trim() } : {}),
                      ...(pkg.roomType.name?.trim() ? { name: pkg.roomType.name.trim() } : {}),
                  },
              }
            : {}),
    };
}

function buildEditPrefill(data: AdmissionDetailsData): EditAdmissionPrefill {
    const patientCategory = resolvePatientCategoryFromAdmissionDetails(data);
    const resolvedPanelId = resolveAdmissionPanelId(data);
    return {
        diseaseType: mapApiDiseaseTypeToUi(data.diseaseType),
        admissionFilterType: mapApiPatientTypeToUi(data.patientType),
        packageId: String(data.packageId),
        offerApplied: Boolean(data.offerApplied),
        ...(patientCategory ? { patientCategory } : {}),
        ...(patientCategory === "panel" && resolvedPanelId != null
            ? { panelId: resolvedPanelId }
            : {}),
        ...(data.package ? { editPackage: mapAdmissionPackageToPackageItem(data.package) } : {}),
        ...(data.offerId != null ? { offerId: String(data.offerId) } : {}),
    };
}

interface CounsellingPatientContext {
    panelId?:number;
    patientName: string;
    patientUhid: string;
    diagnosis: string;
    status: string;
    branchId: number;
    appointmentId: number;
    patientTitle?:string;
    patientType?:string;
}

function extractPatientContextFromApiData(
    data: Record<string, any> | undefined,
    fallbackAppointmentId: number | null
): CounsellingPatientContext | null {
    if (!data) return null;

    const appDetail = data.appointmentDetail || {};
    const patDetails = data.patientDetails || {};
    const medInfo = data.medicalInfo || {};

    const patientName = patDetails.name?.trim();
    const patientUhid = appDetail.uhid || patDetails.uhid;
    const patientTitle = patDetails?.patientTitle;
    const patientType = appDetail?.patientType;
    if (!patientName && !patientUhid) return null;
    // console.log("dhsaggas",data)

    return {
        patientName: patientName || "N/A",
        patientUhid: patientUhid || "N/A",
        patientType:patientType,
        patientTitle:patientTitle,
        diagnosis: medInfo.diagnosis || medInfo.disease || "N/A",
        status: appDetail.status || patDetails.status || "",
        branchId: Number(appDetail.branchId) > 0 ? Number(appDetail.branchId) : 0,
        appointmentId: Number(appDetail.opid ?? fallbackAppointmentId) || 0,
    };
}

function extractPatientContextFromReferredRow(
    row: CounsellorPatientListItem,
    patientIdParam: number
): CounsellingPatientContext {
    console.log("rowedeeygeyeg",row)
    return {
        panelId:row.panelId,
        patientName: row.patientName || "N/A",
        patientUhid: row.patientUhid || "N/A",
        diagnosis: row.diagnosisSymptoms || "N/A",
        patientTitle: row.patientTitle || "N/A",
        patientType: row.patientType || "",
        status: row.status || "",
        branchId: Number(row.branchId) > 0 ? Number(row.branchId) : 0,
        appointmentId: Number(row.appointmentId ?? row.id ?? patientIdParam) || 0,
    };
}

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

function mergePatientContextWithReferredFallback(
    apiContext: CounsellingPatientContext,
    fallback: CounsellingPatientContext | null | undefined
): CounsellingPatientContext {

    console.log("gsdgsd",fallback)
    if (!fallback) {
        return {
            ...apiContext,
            branchId: apiContext.branchId > 0 ? apiContext.branchId : 0,
        };
    }

    return {
        ...apiContext,
        diagnosis:
            fallback.diagnosis && fallback.diagnosis !== "N/A"
                ? fallback.diagnosis
                : apiContext.diagnosis,
        status:
            fallback.status && fallback.status !== "N/A"
                ? fallback.status
                : apiContext.status,
        branchId:
            fallback.branchId > 0
                ? fallback.branchId
                : apiContext.branchId > 0
                  ? apiContext.branchId
                  : 0,
        patientType:
            apiContext.patientType?.trim()
                ? apiContext.patientType
                : fallback.patientType || "",
    };
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function StartCounsellingPage() {
    // Controlled Package Selection States
    const [selectedPackageId, setSelectedPackageId] = useState("");
    const [activePackage, setActivePackage] = useState<PackageItem | null>(null);
    const [numberOfDays, setNumberOfDays] = useState<number | null>(1);
    const [applyOffer, setApplyOffer] = useState(false);
    const [offerTab, setOfferTab] = useState("bundled");
    const [selectedOfferId, setSelectedOfferId] = useState("");
    const [finalAmountPayable, setFinalAmountPayable] = useState(0);
    const [admissionType, setAdmissionType] = useState("");
    const [counsellingMeta, setCounsellingMeta] = useState({
        patientCategory: "Panel",
        diseaseType: "Other",
        packageAdmissionType: "Day Care",
        applyOfferLabel: "Not Applied",
    });
    const [counsellingData, setCounsellingData] = useState({
        patientType: "",
        diseaseType: "others",
        originalAmount: 0,
        discountAmount: 0,
    });
    const [roomAllocation, setRoomAllocation] = useState<CompletePatientAdmissionRoom | null>(null);
    const [attendantDetails, setAttendantDetails] = useState<AttendantDetailsFormData[] | null>(null);
    const [admissionOffer, setAdmissionOffer] = useState<{ offerApplied: boolean; offerId?: number }>({
        offerApplied: false,
    });
    const [admittedPatientId, setAdmittedPatientId] = useState<number | null>(null);
    const searchParams = useSearchParams();
    const router = useRouter();
    const patientIdParam = Number(searchParams?.get("patientID")) || null;
    const appointmentIdParam = Number(searchParams?.get("appointmentID")) || null;
    const editPatientIdParam = Number(searchParams?.get("editpatientID")) || null;
    const tentativePatientIdParam = Number(searchParams?.get("tentativepatientID")) || null;
    const branchId = Number(searchParams?.get("branchId")) || null;
    const isEditMode = editPatientIdParam != null;
    const isTentativeMode = tentativePatientIdParam != null;
    const counsellingRecordIdParam = Number(searchParams?.get("id")) || null;

    // const authUserBranchId = useAppSelector(selectUserBranchId);
    const authUserBranchId = branchId;

    const referredParams = {
    search: undefined,
    sortBy: "",
    order: "ASC" as const,
    page: 1,
    limit: 500,
    branchId:  !Number.isFinite(authUserBranchId) ? 0 : Number(authUserBranchId),
  };

  const {
    data: referredRes,
    isLoading: isReferredLoading,
  } = useGetReferredPatientsQuery(referredParams, {
    skip: !patientIdParam || isEditMode || isTentativeMode,
  });

  const {
    data: editAdmissionRes,
    isLoading: isEditAdmissionLoading,
    isError: isEditAdmissionError,
  } = useGetAdmissionDetailsQuery(editPatientIdParam!, { skip: !editPatientIdParam });

  const {
    data: tentativeDetailsRes,
    isLoading: isTentativeDetailsLoading,
    isError: isTentativeDetailsError,
  } = useGetTentativeDetailsByPatientIdQuery(tentativePatientIdParam!, {
    skip: !tentativePatientIdParam,
  });

    const editAdmissionData = editAdmissionRes?.success ? editAdmissionRes.data : undefined;
    const tentativeDetailsData = tentativeDetailsRes?.success ? tentativeDetailsRes.data : undefined;
    const editPrefill = useMemo(
    () => (editAdmissionData ? buildEditPrefill(editAdmissionData) : null),
    [editAdmissionData]
  );

  const [patientCategory, setPatientCategory] = useState("");
  const [prefilledAdmissionFilterType, setPrefilledAdmissionFilterType] = useState("");
  const [selectedPanelId, setSelectedPanelId] = useState<number | undefined>(undefined);
  const [editAdmissionPrefillApplied, setEditAdmissionPrefillApplied] = useState(false);
  const [tentativePrefillApplied, setTentativePrefillApplied] = useState(false);
  const [editAdmissionDate, setEditAdmissionDate] = useState("");
  const [editSpecialInstructions, setEditSpecialInstructions] = useState("");
  const [editPaymentAmounts, setEditPaymentAmounts] = useState<{
    advanceAmount?: number;
    receivedAmount?: number;
    remainingAmount?: number;
  } | null>(null);

  const rowfilterbyId = useMemo(
    () => findReferredPatientRow(referredRes?.data, patientIdParam, authUserBranchId),
    [referredRes, patientIdParam, authUserBranchId]
  );

//   console.log("rowfilterbyId",rowfilterbyId)

  const [patientContext, setPatientContext] = useState<CounsellingPatientContext | null>(null);
  const [isPatientContextLoading, setIsPatientContextLoading] = useState(false);
//   console.log("patientContext",patientContext?.panelId)

  useEffect(() => {
    if (isTentativeMode) {
      setPatientContext(null);
      setIsPatientContextLoading(false);
      return;
    }

    if (isEditMode) {
      setPatientContext(null);
      setIsPatientContextLoading(false);
      return;
    }

    if (!patientIdParam) {
      setPatientContext(null);
      setIsPatientContextLoading(false);
      setPatientCategory("");
      setPrefilledAdmissionFilterType("");
      setSelectedPanelId(undefined);
      return;
    }

    if (rowfilterbyId) {
      const ctx = extractPatientContextFromReferredRow(rowfilterbyId, patientIdParam);
      setPatientContext(ctx);
      let { category, admissionFilterType } = resolvePatientTypeFromApi(ctx.patientType);
      if (!category && ctx.panelId != null && Number(ctx.panelId) > 0) {
        category = "panel";
      }
      setPatientCategory(category);
      setPrefilledAdmissionFilterType(admissionFilterType);
      if (category === "panel" && ctx.panelId != null && Number(ctx.panelId) > 0) {
        setSelectedPanelId(Number(ctx.panelId));
      }
    }
  }, [patientIdParam, isEditMode, isTentativeMode, rowfilterbyId]);

//   console.log("rowfilterbyIdwqeqw",patientContext?.patientType)

// console.log("isTentativeMode",isTentativeMode,tentativeDetailsData?.patient?.patientTitle)

  const resolvedBranchId = useMemo(() => {
    const fromUrl = Number(authUserBranchId);
    if (Number.isFinite(fromUrl) && fromUrl > 0) return fromUrl;
    if (isEditMode && editAdmissionData) {
      const fromPackage = Number(editAdmissionData.package?.branchId);
      if (Number.isFinite(fromPackage) && fromPackage > 0) return fromPackage;
      const fromAdmission = Number(editAdmissionData.branchId);
      if (Number.isFinite(fromAdmission) && fromAdmission > 0) return fromAdmission;
    }
    return "";
  }, [authUserBranchId, isEditMode, editAdmissionData]);

  const resolvedAppointmentLookupId = useMemo(() => {
    if (isTentativeMode && tentativeDetailsData?.appointmentId) {
      return Number(tentativeDetailsData.appointmentId);
    }
    if (appointmentIdParam) return appointmentIdParam;
    if (rowfilterbyId?.appointmentId != null && rowfilterbyId.appointmentId !== "") {
      return Number(rowfilterbyId.appointmentId);
    }
    return null;
  }, [isTentativeMode, tentativeDetailsData?.appointmentId, appointmentIdParam, rowfilterbyId]);
   console.log("editAdmissionData",editAdmissionData)

  const getpatientName = isEditMode
    ? (  `${ editAdmissionData?.patient?.patientTitle || ""} ${editAdmissionData?.patient?.name}` || "N/A")
    : isTentativeMode
      ? (`${tentativeDetailsData?.patient?.patientTitle} ${tentativeDetailsData?.patient?.name}` || (isTentativeDetailsLoading ? "Loading..." : "N/A"))
      : isPatientContextLoading && !patientContext
        ? "Loading..."
        : (`${patientContext?.patientTitle || ""} ${patientContext?.patientName || "N/A"}`);
  const getpatientUhid = isEditMode
    ? (editAdmissionData?.patient?.uhid || "N/A")
    : isTentativeMode
      ? (tentativeDetailsData?.patient?.uhid || "N/A")
      : (patientContext?.patientUhid || "N/A");

  const getdiagnosisSymptoms = isEditMode 
    ? editAdmissionData?.patient?.diagnosis 
    :isTentativeMode ?
     (tentativeDetailsData?.patient?.diagnosisSymptoms || tentativeDetailsData?.patient?.diagnosis)
    : (rowfilterbyId?.diagnosisSymptoms || patientContext?.diagnosis || "N/A");

  const getpatientBranchId = isEditMode
    ? String(editAdmissionData?.branchId ?? "N/A")
    : isTentativeMode
      ? String(tentativeDetailsData?.branchId ?? resolvedBranchId ?? "N/A")
      : String(patientContext?.branchId ?? rowfilterbyId?.branchId ?? "N/A");

  const getpatientStatus = isEditMode
    ? editAdmissionData?.patient?.status 
    : isTentativeMode
      ? isTentativeDetailsLoading && !tentativeDetailsData
        ? "Loading..."
        : (tentativeDetailsData?.patient?.status || "Tentative")
      : isPatientContextLoading && !patientContext && !rowfilterbyId
        ? "Loading..."
        : (rowfilterbyId?.status || patientContext?.status || "N/A");


  const resolvedAdmissionType =
    admissionType ||
    (isTentativeMode && tentativeDetailsData
      ? mapApiAdmissionTypeToUi(tentativeDetailsData.admissionType)
      : "");

  const resolvedPackagePatientType = useMemo(() => {
    if (counsellingData.patientType === "day_care") return "day_care";
    if (counsellingData.patientType === "ipd") return "ipd";
    if (prefilledAdmissionFilterType === "day_care") return "day_care";
    if (prefilledAdmissionFilterType === "ipd") return "ipd";
    if (isEditMode && editAdmissionData?.patientType) {
      return mapApiPatientTypeToUi(editAdmissionData.patientType);
    }
    return "ipd";
  }, [
    counsellingData.patientType,
    prefilledAdmissionFilterType,
    isEditMode,
    editAdmissionData?.patientType,
  ]);

    // Stepper State
    const [currentStep, setCurrentStep] = useState(1);
    const [hasVisitedRoomStep, setHasVisitedRoomStep] = useState(false);
    const [hasVisitedPaymentStep, setHasVisitedPaymentStep] = useState(false);
    const [hasVisitedIpdAdmissionStep, setHasVisitedIpdAdmissionStep] = useState(false);
    const showRoomStep =
        resolvedAdmissionType !== "scheduled" && !isDayCarePackageType(resolvedPackagePatientType);
    const showIpdAdmissionStep = resolvedAdmissionType === "immediate";
    const paymentStepNumber = showRoomStep ? 3 : 2;
    const ipdAdmissionStepNumber = showRoomStep ? 4 : 3;
    const isOnRoomStep = showRoomStep && currentStep === 2;
    const isOnPaymentStep = currentStep === paymentStepNumber;
    const isOnIpdAdmissionStep = currentStep === ipdAdmissionStepNumber;

    // console.log("patientContext",patientContext?.patientType)

    useEffect(() => {
        if (isOnRoomStep) {
            setHasVisitedRoomStep(true);
        }
    }, [isOnRoomStep]);

    useEffect(() => {
        if (isOnPaymentStep) {
            setHasVisitedPaymentStep(true);
        }
    }, [isOnPaymentStep]);

    useEffect(() => {
        if (isOnIpdAdmissionStep) {
            setHasVisitedIpdAdmissionStep(true);
        }
    }, [isOnIpdAdmissionStep]);

    // When admission type changes to scheduled (room hidden), payment step number shifts.
    // If we are still on the old payment step number (3) and IPD step hasn't started yet, move to payment (2).
    useEffect(() => {
        if (!showRoomStep && currentStep === 3 && !hasVisitedIpdAdmissionStep && hasVisitedPaymentStep) {
            setCurrentStep(2);
        }
    }, [showRoomStep, currentStep, hasVisitedIpdAdmissionStep, hasVisitedPaymentStep]);

    // When Day Care is selected (room hidden) while on the room step, move to payment.
    useEffect(() => {
        if (!showRoomStep && currentStep === 2 && hasVisitedRoomStep && !hasVisitedPaymentStep) {
            setCurrentStep(paymentStepNumber);
        }
    }, [showRoomStep, currentStep, hasVisitedRoomStep, hasVisitedPaymentStep, paymentStepNumber]);

    useEffect(() => {
        if (!showIpdAdmissionStep && isOnIpdAdmissionStep) {
            setCurrentStep(paymentStepNumber);
        }
    }, [showIpdAdmissionStep, isOnIpdAdmissionStep, paymentStepNumber]);

    useEffect(() => {
        if (!tentativeDetailsData || tentativePrefillApplied) return;
        setAdmissionType(mapApiAdmissionTypeToUi(tentativeDetailsData.admissionType));
        const patientType = tentativeDetailsData.patient?.patientType;
        let { category, admissionFilterType } = resolvePatientTypeFromApi(patientType);
        const panelId = tentativeDetailsData.patient?.panelId;
        if (!category && panelId != null && Number(panelId) > 0) {
            category = "panel";
        }
        if (category) {
            setPatientCategory(category);
        }
        if (admissionFilterType) {
            setPrefilledAdmissionFilterType(admissionFilterType);
        }
        if (category === "panel" && panelId != null && Number(panelId) > 0) {
            setSelectedPanelId(Number(panelId));
        }
        setTentativePrefillApplied(true);
    }, [tentativeDetailsData, tentativePrefillApplied]);

    useEffect(() => {
        if (!editAdmissionData || editAdmissionPrefillApplied) return;

        const category = resolvePatientCategoryFromAdmissionDetails(editAdmissionData);
        if (category) {
            setPatientCategory(category);
        }
        setPrefilledAdmissionFilterType(mapApiPatientTypeToUi(editAdmissionData.patientType));
        const resolvedPanelId = resolveAdmissionPanelId(editAdmissionData);
        if (category === "panel" && resolvedPanelId != null) {
            setSelectedPanelId(resolvedPanelId);
        }

        setSelectedPackageId(String(editAdmissionData.packageId));
        setNumberOfDays(editAdmissionData.numberOfDays);
        setApplyOffer(Boolean(editAdmissionData.offerApplied));
        setSelectedOfferId(editAdmissionData.offerId != null ? String(editAdmissionData.offerId) : "");
        setAdmissionType(mapApiAdmissionTypeToUi(editAdmissionData.admissionType));
        setFinalAmountPayable(editAdmissionData.netPayable);
        setCounsellingData({
            patientType: mapApiPatientTypeToUi(editAdmissionData.patientType),
            diseaseType: editAdmissionData.diseaseType,
            originalAmount: editAdmissionData.originalAmount,
            discountAmount: editAdmissionData.discountAmount,
        });
        setCounsellingMeta((prev) => ({
            ...prev,
            patientCategory: category
                ? category === "normal"
                    ? "Private"
                    : category === "tpa"
                      ? "TPA"
                      : "Panel"
                : prev.patientCategory,
            diseaseType: mapApiDiseaseTypeToUi(editAdmissionData.diseaseType) === "ckd" ? "CKD" : "Other",
            packageAdmissionType:
                mapApiPatientTypeToUi(editAdmissionData.patientType) === "ipd" ? "IPD" : "Day Care",
            applyOfferLabel: editAdmissionData.offerApplied ? "Applied" : "Not Applied",
        }));
        setEditAdmissionDate(formatAdmissionDateInput(editAdmissionData.admissionDate));
        setEditSpecialInstructions(editAdmissionData.specialInstructions || "");
        setEditPaymentAmounts({
            advanceAmount: editAdmissionData.advanceAmount,
            receivedAmount: editAdmissionData.receivedAmount,
            remainingAmount: editAdmissionData.remainingAmount,
        });
        if (editAdmissionData.room) {
            setRoomAllocation(editAdmissionData.room);
        }
        setEditAdmissionPrefillApplied(true);
    }, [editAdmissionData, editAdmissionPrefillApplied]);
    
    const [viewAppointmentMode, setViewAppointmentMode] = useState(false);
    const [getPatientDetail] = useLazyGetPatientDetailQuery();
    const [getPatientDetailByAppointment] = useLazyGetPatientDetailByAppointmentQuery();
    const [isViewPatientLoading, setIsViewPatientLoading] = useState(false);
    const [fetchedPatientData, setFetchedPatientData] = useState<any>(null);
    const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
    const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
    const [apiErrorMessage, setApiErrorMessage] = useState("");
    const [cardImageUrl, setCardImageUrl] = useState<string | null>(null);
    const [isFetchingPresignedImage, setIsFetchingPresignedImage] = useState<boolean>(false);

    const [getPresignedUrl] = useLazyGetPresignedUrlQuery();
    const { data: patientFilesResponse } = useGetPatientFilesQuery(
        { uhid: fetchedPatientData?.appointmentDetail?.uhid || "" },
        { skip: !fetchedPatientData?.appointmentDetail?.uhid , refetchOnMountOrArgChange: true }
    );

    // Fetch health card details by UHID
        const { data: healthCardResponse, isLoading: isFetchingHealthCard } = useGetPatientHealthCardByUhidQuery(
            { uhid: fetchedPatientData?.appointmentDetail?.uhid },
            { skip: !fetchedPatientData?.appointmentDetail?.uhid }
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
                ? new Date(file.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
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

    // useEffect(() => {
    //     if (!patientIdParam || isEditMode || isTentativeMode) return;

    //     let cancelled = false;

    //     const loadPatientContext = async () => {
    //         setIsPatientContextLoading(true);
    //         try {
    //             if (resolvedAppointmentLookupId) {
    //                 try {
    //                     const byAppointment = await getPatientDetailByAppointment(
    //                         resolvedAppointmentLookupId
    //                     ).unwrap();
    //                     if (!cancelled && byAppointment?.success) {
    //                         const ctx = extractPatientContextFromApiData(
    //                             byAppointment.data,
    //                             resolvedAppointmentLookupId
    //                         );
    //                         if (ctx) {
    //                             setPatientContext((prev) =>
    //                                 mergePatientContextWithReferredFallback(ctx, prev)
    //                             );
    //                             return;
    //                         }
    //                     }
    //                 } catch {
    //                     // Fall back to patient detail lookup.
    //                 }
    //             }

    //             if (patientIdParam) {
    //                 const byPatient = await getPatientDetail(patientIdParam).unwrap();
    //                 if (!cancelled && byPatient?.success) {
    //                     const ctx = extractPatientContextFromApiData(byPatient.data, patientIdParam);
    //                     if (ctx) {
    //                         setPatientContext((prev) =>
    //                             mergePatientContextWithReferredFallback(ctx, prev)
    //                         );
    //                     }
    //                 }
    //             }
    //         } catch {
    //             // Keep referred-list context when direct lookup fails.
    //         } finally {
    //             if (!cancelled) {
    //                 setIsPatientContextLoading(false);
    //             }
    //         }
    //     };

    //     void loadPatientContext();

    //     return () => {
    //         cancelled = true;
    //     };
    // }, [
    //     patientIdParam,
    //     isEditMode,
    //     isTentativeMode,
    //     resolvedAppointmentLookupId,
    //     getPatientDetailByAppointment,
    //     getPatientDetail,
    // ]);

    const patientDetailId =
        counsellingRecordIdParam ||
        rowfilterbyId?.patientId ||
        patientIdParam ||
        editPatientIdParam ||
        tentativePatientIdParam;

    const resolvedAppointmentId = isEditMode
        ? Number(editAdmissionData?.appointmentId) || 0
        : isTentativeMode
            ? Number(tentativeDetailsData?.appointmentId) || 0
            : patientContext?.appointmentId ||
                resolvedAppointmentLookupId ||
                Number(rowfilterbyId?.appointmentId ?? counsellingRecordIdParam) ||
                0;

    // const handleDetailsStepCancel = () => {
    //     setSelectedPackageId("");
    //     setActivePackage(null);
    //     setNumberOfDays(null);
    //     setApplyOffer(false);
    //     setOfferTab("bundled");
    //     setSelectedOfferId("");
    //     setFinalAmountPayable(0);
    //     setAdmissionType("");
    //     setCounsellingMeta({
    //         patientCategory: "Panel",
    //         diseaseType: "Other",
    //         packageAdmissionType: "Day Care",
    //         applyOfferLabel: "Not Applied",
    //     });
    //     setCounsellingData({
    //         patientType: "ipd",
    //         diseaseType: "others",
    //         originalAmount: 0,
    //         discountAmount: 0,
    //     });
    //     setRoomAllocation(null);
    //     setAttendantDetails(null);
    //     setHasVisitedRoomStep(false);
    //     setHasVisitedPaymentStep(false);
    //     setHasVisitedIpdAdmissionStep(false);
    //     setAdmittedPatientId(null);
    //     setCurrentStep(1);
    // };

    // console.log("sduuagdyagys", patientContext?.patientType)

    const handleViewPatientOverview = async () => {
        const isReferredFlow = patientIdParam !== null && !isEditMode && !isTentativeMode;
        const idToFetch = isEditMode
            ? editPatientIdParam
            : isTentativeMode
                ? tentativeDetailsData?.patient?.id ?? tentativePatientIdParam
                : isReferredFlow
                    ? patientIdParam
                    : patientDetailId;

        if (!idToFetch) {
            setApiErrorMessage("Patient ID not found. Please return to the dashboard and select a patient.");
            setShowApiErrorDialog(true);
            return;
        }

        setIsViewPatientLoading(true);
        try {
            const viewByAppointmentId = isTentativeMode
                ? Number(tentativeDetailsData?.appointmentId) || null
                : resolvedAppointmentLookupId;
            const res =
                (isReferredFlow || isTentativeMode) && viewByAppointmentId
                    ? await getPatientDetailByAppointment(viewByAppointmentId).unwrap()
                    : await getPatientDetail(idToFetch).unwrap();
            if (res && res.success) {
                setFetchedPatientData(res.data);
                const opid = res.data?.appointmentDetail?.opid;
                setSelectedAppointmentId(
                    opid != null && opid !== ""
                        ? Number(opid)
                        : isReferredFlow || isTentativeMode
                            ? viewByAppointmentId
                            : null
                );
                setViewAppointmentMode(true);
            } else {
                setApiErrorMessage(res?.message || "Failed to load patient details.");
                setShowApiErrorDialog(true);
            }
        } catch (err: any) {
            console.error("Error fetching patient details:", err);
            const msg = err?.data?.message || err?.message || "An error occurred while fetching patient details.";
            setApiErrorMessage(msg);
            setShowApiErrorDialog(true);
        } finally {
            setIsViewPatientLoading(false);
        }
    };

    // Dynamic calculations based on selection
    const roomRentPerDay = activePackage?.branchRoomType?.roomRentPrice ? Number(activePackage.branchRoomType.roomRentPrice) : 0;
    const medicinePerDay = activePackage?.medicineEnabled ? Number(activePackage.medicinePrice) : 0;
    const mealsPerDay = activePackage?.mealsEnabled ? Number(activePackage.mealsPrice) : 0;
    const doctorFee = activePackage?.doctorFeeEnabled ? Number(activePackage.doctorFeePrice) : 0;
    const nurseFee = activePackage?.nurseFeeEnabled ? Number(activePackage.nurseFeePrice) : 0;
    const attendantFee = activePackage?.attendantFeeEnabled ? Number(activePackage.attendantFeePrice) : 0;
    const therapyFee = activePackage?.therapyEnabled ? Number(activePackage.therapyPrice) : 0;
    const roomtype = activePackage?.roomType?.name ? String(activePackage?.roomType?.name) : "";
     
    const totalPrice:any = roomRentPerDay + medicinePerDay + mealsPerDay + doctorFee + nurseFee + attendantFee + therapyFee;

    const initialRoomTypeForAllocation = useMemo(
        () =>
            resolveInitialRoomTypeForAllocation(
                activePackage,
                isEditMode ? editAdmissionData?.roomType : undefined
            ),
        [activePackage, isEditMode, editAdmissionData?.roomType]
    );

    // console.log("gvhgdhf",totalPrice)



    if ((isEditMode && isEditAdmissionLoading) || (isTentativeMode && isTentativeDetailsLoading)) {
        return (
            <AppShell>
                <div className="flex min-h-[320px] items-center justify-center">
                    <SpinnerLoader size={40} />
                </div>
            </AppShell>
        );
    }

    if (
        (isEditMode && (isEditAdmissionError || (!isEditAdmissionLoading && !editAdmissionData))) ||
        (isTentativeMode &&
            (isTentativeDetailsError || (!isTentativeDetailsLoading && !tentativeDetailsData)))
    ) {
        return (
            <AppShell>
                <div className="flex min-h-[320px] flex-col items-center justify-center gap-4">
                    <p className="text-sm font-medium text-[#787E8C]">
                        {isTentativeMode
                            ? tentativeDetailsRes?.message || "Failed to load tentative admission details."
                            : editAdmissionRes?.message || "Failed to load admission details for editing."}
                    </p>
                    <BackToPreviousPageButton text="Back" />
                </div>
            </AppShell>
        );
    }

    console.log("sjdfhjshfsjiiiiiiiiiiii",activePackage)

    return (
        <AppShell>
            {viewAppointmentMode ? (
                <div className="flex flex-col gap-6">
                    <div className="flex items-start justify-between">
                        <PageHeading title="View" />
                        <BackToPreviousPageButton
                            text="Back"
                            onClick={() => {
                                setViewAppointmentMode(false);
                                setFetchedPatientData(null);
                                setSelectedAppointmentId(null);
                            }}
                        />
                    </div>
                    {(() => {
                        const appDetail = fetchedPatientData?.appointmentDetail || {};
                        const patDetails = fetchedPatientData?.patientDetails || {};
                        const refDetail = fetchedPatientData?.referralDetail || {};
                        const medInfo = fetchedPatientData?.medicalInfo || {};
                        const otherInfo = fetchedPatientData?.otherInformation || {};
                        const walletInfo = fetchedPatientData?.wallet || {};
                        const walletExists = !!fetchedPatientData?.wallet;
                         const packageDetails = fetchedPatientData?.patientPackage || {};

                        const appointmentItems = [
                            { label: "UHID", value: appDetail.uhid || "N/A" },
                            { label: "OPD ID", value: appDetail.opid?.toString() || "N/A" },
                            { label: "Branch", value: appDetail.branch || "N/A" },
                            { label: "Doctor", value: appDetail.doctor || "N/A" },
                            { label: "Doctor OPD Fee", value: appDetail.doctorCpdFee !== undefined ? `Rs. ${appDetail.doctorCpdFee}` : "N/A" },
                            // { label: "Entry Fee", value: appDetail.entryFee !== undefined ? `Rs. ${appDetail.entryFee}` : "N/A" },
                            { label: "Appointment Date", value: formatCounsellingAppointmentDate(appDetail.appointmentDate) },
                            { label: "Time Slot", value: appDetail.timeSlot || "N/A" },
                            { label: "Created Date", value: formatCounsellingCreatedDate(appDetail.createdDate) },
                            { label: "Remark", value: appDetail.remark || "N/A", multiline: true },
                        ];

                        const referralItems = [
                            { label: "Source", value: refDetail.source || "N/A" },
                            { label: "Sub Source", value: refDetail.subSource || "N/A" },
                            { label: "Referral Doctor", value: refDetail.referralDoctor || "N/A" },
                            { label: "Referral Name", value: refDetail.referralName || "N/A" },
                            { label: "Mobile", value: refDetail.mobile || "N/A" },
                        ];

                        // const patientName = `${patDetails.patientTitle} ${patDetails.name || "N/A"}`;
                         const patientName = patDetails?.name
                        ? `${patDetails?.patientTitle || ""} ${patDetails.name}`.trim()
                        : "N/A";
                        const patientSubtitle = `Contact Number: ${patDetails.contactNumber || "N/A"} • Age : ${patDetails.age || "N/A"} Years • Gender : ${patDetails.gender || "N/A"}`;

                        const patientBadges = [
                            ...(medInfo.bloodGroup && medInfo.bloodGroup !== "N/A" ? [{
                                label: medInfo.bloodGroup,
                                className: "inline-flex h-[30px] min-w-[76px] me-2 items-center justify-center rounded-[30px] border px-4 text-xs font-semibold border-[#F6776E]/24 bg-[#F6776E0D] text-[#F6776E]"
                            }] : []),
                            ...(otherInfo.patientType ? [{
                                label: otherInfo.patientType,
                                className: "inline-flex h-[30px] min-w-[76px] items-center justify-center rounded-[30px] border px-4 text-xs font-semibold border-[#0B8C00]/20 bg-white text-[#0B8C00]"
                            }] : [])
                        ];

                        const patientInfoItems = [
                            {
                                iconSrc: "/icons/UserGear.svg",
                                iconAlt: "Father/Husband",
                                label: "Father’s/Husband’s Name",
                                value:  `${patDetails?.guardianTitle || ""} ${
                                    patDetails?.fatherHusbandName || patDetails?.guardianName || ""
                                }`.trim() || "N/A",
                            },
                            {
                                iconSrc: "/icons/gendericon.svg",
                                iconAlt: "Marital Status",
                                label: "Marital Status",
                                value: patDetails.maritalStatus || "N/A",
                            },
                            {
                                iconSrc: "/icons/mapicon.svg",
                                iconAlt: "Address",
                                label: "Address",
                                value: patDetails.address || "N/A",
                            },
                            {
                                iconSrc: "/icons/adharcardicon.svg",
                                iconAlt: "Aadhar Card Number",
                                label: "Aadhar Card Number",
                                value: patDetails.aadharCardNumber || "N/A",
                            },
                        ];

                        const vitalsItems = [
                            { label: "Blood Pressure", value: patDetails.bloodPressure || "N/A", unit: "bp" },
                            { label: "Sugar Level", value: patDetails.sugarLevel || "N/A", unit: "mg/dL" },
                            { label: "Temperature", value: patDetails.temperature || "N/A", unit: "" },
                            { label: "Heart Rate", value: patDetails.heartRate || "N/A", unit: "bpm" },
                        ];

                            //Patient Wallet Information Card
                            // const remainingAmount =  walletExists && walletInfo.availableBalance !== undefined
                            //     ? `Rs. ${walletInfo.availableBalance}`
                            //     : "N/A";
                        
                            // const walletDetails: PatientWalletDetailItem[] = walletExists
                            //     ? [
                            //         { label: "Current Balance", value: `Rs. ${walletInfo.currentBalance ?? 0}` },
                            //         { label: "Hold Amount", value: `Rs. ${walletInfo.holdAmount ?? 0}` },
                            //         { label: "Total Credit", value: `Rs. ${walletInfo.totalCredit ?? 0}` },
                            //         { label: "Total Debit", value: `Rs. ${walletInfo.totalDebit ?? 0}` },
                            //         { label: "Last Updated", value: walletInfo.lastUpdated ? new Date(walletInfo.lastUpdated).toLocaleDateString('en-GB') : "N/A" },
                            //     ]
                            //     : [
                            //         { label: "Package", value: "N/A" },
                            //         { label: "Amount", value: "N/A" },
                            //         { label: "Discount", value: "N/A" },
                            //         { label: "Expire", value: "N/A" },
                            //     ];
                                    const remainingAmount =  walletInfo?.currentBalance !== undefined ? `Rs. ${walletInfo.currentBalance}`  : "N/A";
                                        const walletDetails: PatientWalletDetailItem[] =
                                                [
                                                { label: "Package", value: packageDetails?.packageName || "N/A" },
                                                {
                                                    label: "Amount",
                                                    value: packageDetails?.packagePrice != null
                                                        ? `Rs. ${packageDetails.packagePrice}`
                                                        : "N/A",
                                                    },
                                                { label: "Discount",
                                                    value: packageDetails?.discountPercentage != null
                                                    ? `${packageDetails.discountPercentage}%`
                                                    : packageDetails?.discountFixed != null
                                                    ? `${packageDetails.discountFixed}`
                                                    : "N/A",
                                                },
                                                // { label: "Expire", value: packageDetails?.expireDate || "N/A" },
                                                    {
                                                    label: "Expire",
                                                    value: packageDetails?.expireDate
                                                        ? new Date(packageDetails.expireDate).toLocaleDateString("en-GB", {
                                                            day: "2-digit",
                                                            month: "short",
                                                            year: "numeric",
                                                        })
                                                        : "N/A",
                                                    }
                                            ]

                        const medicalItems = [
                            { label: "Diagnosis", value: medInfo.diagnosis || "N/A" },
                            { label: "Disease", value: medInfo.disease || "N/A" },
                            { label: "Blood Group", value: medInfo.bloodGroup || "N/A" },
                            { label: "Allergies", value: medInfo.allergies || "N/A" },
                            { label: "Surgeries", value: medInfo.surgeries || "N/A" },
                            { label: "Addiction", value: medInfo.addiction || "N/A" },
                            { label: "Height", value: patDetails.height || medInfo.height || "N/A" },
                            { label: "Weight", value: patDetails.weight || medInfo.weight || "N/A" },
                            { label: "Diet Type", value: medInfo.dietType || "N/A" },
                            { label: "Remark", value: medInfo.remark || "N/A", multiline: true },
                        ];

                        const otherInfoItems = [
                            { label: "Patient Type", value: otherInfo.patientType || "N/A" },
                            { label: "Patient Sub Type", value: otherInfo.patientSubType || "N/A" },
                            { label: "Beneficiary ID", value: "N/A" },
                            { label: "Insurance Company", value: "N/A" },
                            { label: "Ayush Covered", value: "N/A" },
                        ];

                        const timelineItems = fetchedPatientData?.patientHistory?.map((h: any) => ({
                            dateLabel: h.date || h.createdDate || "N/A",
                            detail: {
                                primaryComplaintTitle: "Chief Complaint",
                                primaryComplaintText: h.chiefComplaint || h.remark || "N/A",
                                detailsTitle: "Symptoms",
                                detailsItems: Array.isArray(h.symptoms) ? h.symptoms : (h.symptoms ? [h.symptoms] : ["N/A"]),
                                actionsTitle: "Medicines Prescribed",
                                actionItems: Array.isArray(h.medicines) ? h.medicines : (h.medicines ? [h.medicines] : ["N/A"]),
                            }
                        })) || [];

                        const healthCardNo = patDetails.jsHealthCardNo || "N/A";

                        return (
                            <ViewAppointment
                                appointmentId={selectedAppointmentId ?? undefined}
                                appointmentItems={appointmentItems}
                                walletRemainingAmount={remainingAmount}
                                walletDetails={walletDetails}
                                referralItems={referralItems}
                                patientName={patientName}
                                patientSubtitle={patientSubtitle}
                                patientBadges={patientBadges}
                                patientInfoItems={patientInfoItems}
                                showVitals={true}
                                vitalsItems={vitalsItems}
                                timelineItems={timelineItems.length > 0 ? timelineItems : undefined}
                                healthCardNo={healthCardNo}
                                healthCardImageUrl={cardImageUrl || undefined}
                                isHealthCardLoading={isHealthCardLoading}
                                medicalItems={medicalItems}
                                fileItems={patientFilesItems}
                                otherInfoItems={otherInfoItems}
                            />
                        );
                    })()}
                </div>
            ) : (
                <>
                    {/* 1. TOP HEADER & STEPPER SECTION */}
                    <div className="w-full flex flex-col md:flex-row justify-between items-start md:items-center rounded-[20px] gap-6 select-none">
                        {/* Left Side: Header Dynamic Title */}
                        {currentStep === 1 ? (
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-2">
                                        <TruncatedPatientName name={getpatientName} />
                                        <Badge
                                            variant="success"
                                            className="shrink-0 text-xs font-semibold tracking-wider select-none"
                                            style={{ fontSize: "10px" }}
                                        >
                                        {getpatientStatus
                                            ? getpatientStatus.charAt(0).toUpperCase() + getpatientStatus.slice(1).toLowerCase()
                                            : ""}
                                        </Badge>
                                    </div>
                                    <p className="text-xs">
                                        <span className="text-[#262D3B]">UHID: </span>
                                        <span className="text-[#262D3B] font-bold">{getpatientUhid}</span>
                                        {" • Diagnosis: "}
                                        <span className="text-[#262D3B] font-bold">{getdiagnosisSymptoms}</span>
                                    </p>
                                </div>
                            </div>
                        ) : isOnRoomStep ? (
                            <PageHeading title="Room Allocation" />
                        ) : isOnPaymentStep ? (
                            <PageHeading title="Admission & Payment" />
                        ) : isOnIpdAdmissionStep ? (
                            <PageHeading title="IPD Admission" />
                        ) : null}

                        {/* Right Side: Stepper Progress */}
                        <div className="flex items-start gap-2 select-none md:self-center pr-2">
                            {/* Step 1 */}
                            <div className="flex flex-col items-center gap-1">
                                <div className={`w-7 h-7 rounded-[30%] flex items-center justify-center text-xs font-bold transition-all duration-200 ${currentStep >= 1 ? "bg-[#0B8C00] text-white" : "bg-white text-[#787E8C] border border-[#DFE0E2]"
                                    }`}
                                    >
                                    1
                                </div>
                                <span className={`text-xs font-semibold ${currentStep >= 1 ? "text-[#0B8C00]" : "text-[#787E8C]"}`}>Details</span>
                            </div>

                            {/* Connection bar 1 */}
                            <div className={`w-20 rounded-[30%] mx-1 mt-[13px] transition-all duration-200 ${currentStep > 1 ? "h-1 bg-[#0B8C00]" : "h-[2px] bg-[#DFE0E2]"
                                }`}></div>

                            {showRoomStep && (
                                <>
                                    {/* Step 2 - Room */}
                                    <div className="flex flex-col items-center gap-1">
                                        <div className={`w-7 h-7 rounded-[30%] flex items-center justify-center text-xs font-bold transition-all duration-200 ${currentStep >= 2 ? "bg-[#0B8C00] text-white" : "bg-white text-[#787E8C] border border-[#DFE0E2] opacity-50"
                                            }`}>
                                            2
                                        </div>
                                        <span className={`text-xs font-semibold ${currentStep >= 2 ? "text-[#0B8C00]" : "text-[#787E8C] opacity-50"}`}>Room</span>
                                    </div>

                                    {/* Connection bar 2 */}
                                    <div className={`w-20 rounded-[30%] mx-1 mt-[13px] transition-all duration-200 ${currentStep > 2 ? "h-1 bg-[#0B8C00]" : "h-[2px] bg-[#DFE0E2]"
                                        }`}></div>
                                </>
                            )}

                            {/* Payment step */}
                            <div className="flex flex-col items-center gap-1">
                                <div className={`w-7 h-7 rounded-[30%] flex items-center justify-center text-xs font-bold transition-all duration-200 ${currentStep >= paymentStepNumber ? "bg-[#0B8C00] text-white" : "bg-white text-[#787E8C] border border-[#DFE0E2] opacity-50"
                                    }`}>
                                    {paymentStepNumber}
                                </div>
                                <span className={`text-xs font-semibold ${currentStep >= paymentStepNumber ? "text-[#0B8C00]" : "text-[#787E8C] opacity-50"}`}>Payment</span>
                            </div>

                            {/* Connection bar: Payment -> IPD Admission */}
                            {showIpdAdmissionStep ? (
                                <>
                                    <div
                                        className={`w-20 rounded-[30%] mx-1 mt-[13px] transition-all duration-200 ${
                                            currentStep > paymentStepNumber ? "h-1 bg-[#0B8C00]" : "h-[2px] bg-[#DFE0E2]"
                                        }`}
                                    ></div>

                                    {/* IPD Admission step */}
                                    <div className="flex flex-col items-center gap-1">
                                        <div
                                            className={`w-7 h-7 rounded-[30%] flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                                                currentStep >= ipdAdmissionStepNumber
                                                    ? "bg-[#0B8C00] text-white"
                                                    : "bg-white text-[#787E8C] border border-[#DFE0E2] opacity-50"
                                            }`}
                                        >
                                            {ipdAdmissionStepNumber}
                                        </div>
                                        <span
                                            className={`text-xs font-semibold ${
                                                currentStep >= ipdAdmissionStepNumber
                                                    ? "text-[#0B8C00]"
                                                    : "text-[#787E8C] opacity-50"
                                            }`}
                                        >
                                            IPD Admission
                                        </span>
                                    </div>
                                </>
                            ) : null}
                        </div>
                    </div>

                    <div className={currentStep === 1 ? undefined : "hidden"}>
                        <CreatePackage
                            patientCategory={patientCategory}
                            setPatientCategory={setPatientCategory}
                            initialAdmissionFilterType={prefilledAdmissionFilterType}
                            selectedPackageId={selectedPackageId}
                            setSelectedPackageId={setSelectedPackageId}
                            numberOfDays={numberOfDays}
                            setNumberOfDays={setNumberOfDays}
                            applyOffer={applyOffer}
                            setApplyOffer={setApplyOffer}
                            offerTab={offerTab}
                            setOfferTab={setOfferTab}
                            selectedOfferId={selectedOfferId}
                            setSelectedOfferId={setSelectedOfferId}
                            admissionType={admissionType}
                            setAdmissionType={setAdmissionType}
                            onNext={() => {
                                const nextStep = showRoomStep ? 2 : paymentStepNumber;
                                setCurrentStep(nextStep);
                                if (showRoomStep) {
                                    setHasVisitedRoomStep(true);
                                } else {
                                    setHasVisitedPaymentStep(true);
                                }
                            }}
                            // onCancel={handleDetailsStepCancel}
                            onViewPatientOverview={handleViewPatientOverview}
                            isViewPatientLoading={isViewPatientLoading}
                            onActivePackageChange={setActivePackage}
                            onFinalAmountPayableChange={setFinalAmountPayable}
                            onCounsellingMetaChange={setCounsellingMeta}
                            onCounsellingDataChange={setCounsellingData}
                            onAttendantDetailsChange={setAttendantDetails}
                            onAdmissionOfferChange={setAdmissionOffer}
                            getpatientBranchId={getpatientBranchId}
                            appointmentId={resolvedAppointmentId}
                            branchId={resolvedBranchId}
                            editPrefill={isEditMode ? editPrefill : null}
                            initialPanelId={
                                isEditMode &&
                                editAdmissionData &&
                                resolvePatientCategoryFromAdmissionDetails(editAdmissionData) === "panel"
                                    ? resolveAdmissionPanelId(editAdmissionData) ?? selectedPanelId
                                    : patientCategory === "panel"
                                      ? (selectedPanelId ??
                                        patientContext?.panelId ??
                                        tentativeDetailsData?.patient?.panelId)
                                      : undefined
                            }
                            onPanelIdChange={setSelectedPanelId}
                            onBack={() => router.push("/counsellor/dashboard")}
                        />
                    </div>

                    {showRoomStep && hasVisitedRoomStep && (
                        <div className={isOnRoomStep ? undefined : "hidden"}>
                            <RoomAllocation
                            branchIdd={resolvedBranchId || 0}
                            activePackage={
                                activePackage
                                    ? { ...activePackage, id: String(activePackage.id) }
                                    : { id: "0", packageName: "", remark: "", branchRoomType: { roomRentPrice: 0 } }
                            }
                            packagetotalPrice={totalPrice}
                            patientDetails={{
                                patientName: getpatientName,
                                patientUhid: getpatientUhid,
                                diagnosis: getdiagnosisSymptoms,
                            }}
                            counsellingSummary={{
                                ...counsellingMeta,
                                numberOfDays: numberOfDays ?? 0,
                                finalAmountPayable,
                            }}
                            patientId={
                                isEditMode
                                    ? editPatientIdParam ?? undefined
                                    : isTentativeMode
                                        ? tentativePatientIdParam ?? undefined
                                        : patientIdParam ?? undefined
                            }
                            onConfirmAllocation={(allocation) => {
                                setRoomAllocation({
                                    buildingId: allocation.buildingId,
                                    floorId: allocation.floorId,
                                    roomId: allocation.roomId,
                                    bedId: allocation.bedId,
                                });
                            }}
                            onSuccess={() => setCurrentStep(paymentStepNumber)}
                            onBack={() => setCurrentStep(1)}
                            initialRoomType={initialRoomTypeForAllocation}
                        />
                        </div>
                    )}
                

                    {hasVisitedPaymentStep && (
                        <div className={isOnPaymentStep ? undefined : "hidden"}>
                            <AdmissionPayment
                            activePackage={activePackage ?? { packageName: "", packageType: "", remark: "" }}
                            finalAmountPayable={finalAmountPayable}

                            roomRentPerDay={roomRentPerDay}
                            medicinePerDay={medicinePerDay}
                            mealsPerDay={mealsPerDay}
                            doctorFee={doctorFee}
                            nurseFee={nurseFee}
                            roomtype={roomtype}
                            attendantFee={attendantFee}
                            therapyFee={therapyFee}
                            packagetotalPrice={totalPrice}
                            patientName={getpatientName}
                            patientUhid={getpatientUhid}
                            branchId={resolvedBranchId}
                            appointmentId={resolvedAppointmentId}
                            packageId={Number(selectedPackageId) || 0}
                            numberOfDays={numberOfDays ?? 0}
                            offerApplied={admissionOffer.offerApplied}
                            offerId={admissionOffer.offerId}
                            admissionType={admissionType}
                            patientType={counsellingData.patientType}
                            diseaseType={counsellingData.diseaseType}
                            originalAmount={counsellingData.originalAmount}
                            discountAmount={counsellingData.discountAmount}
                            netPayable={finalAmountPayable}
                            panelId={selectedPanelId}
                            roomAllocation={showRoomStep ? roomAllocation : null}
                            attendantDetails={attendantDetails}
                            requireRoomAllocation={showRoomStep}
                            initialAdmissionDate={isEditMode ? editAdmissionDate : undefined}
                            initialSpecialInstructions={isEditMode ? editSpecialInstructions : undefined}
                            editPaymentAmounts={isEditMode ? editPaymentAmounts : null}
                            isEditMode={isEditMode}
                            editPatientId={isEditMode ? editPatientIdParam ?? undefined : undefined}
                            onAdmissionComplete={setAdmittedPatientId}
                            onNext={() => {
                                if (!showIpdAdmissionStep) return;
                                setCurrentStep(ipdAdmissionStepNumber);
                                setHasVisitedIpdAdmissionStep(true);
                            }}
                            onBack={() => setCurrentStep(showRoomStep ? 2 : 1)}
                            onExit={() => router.push("/counsellor/dashboard")}
                        />
                        </div>
                    )}

                    {showIpdAdmissionStep && hasVisitedIpdAdmissionStep && (
                        <div className={isOnIpdAdmissionStep ? undefined : "hidden"}>
                            <IpdAdmissionStep
                                patientId={
                                    admittedPatientId ??
                                    (isEditMode
                                        ? Number(editAdmissionData?.patient?.id ?? editPatientIdParam ?? 0) || null
                                        : isTentativeMode
                                            ? Number(
                                                  tentativeDetailsData?.patient?.id ??
                                                      tentativePatientIdParam ??
                                                      0
                                              ) || null
                                            : patientIdParam)
                                }
                                onBack={() => setCurrentStep(paymentStepNumber)}
                            />
                        </div>
                    )}
                </>
            )}
            <MessageDialog
                open={showApiErrorDialog}
                onClose={() => setShowApiErrorDialog(false)}
                icon="/icons/CrossIcon.svg"
                iconBgColor="#FFEBEE"
                message={apiErrorMessage}
                confirmText="OK"
                showCancel={false}
                onConfirm={() => setShowApiErrorDialog(false)}
            />
        </AppShell>
    );
}

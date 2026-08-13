"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
    TableSearchInput,
    TableListingCard,
    Button,
    MessageDialog,
    ViewAppointment,
    BackToPreviousPageButton,
    SpinnerLoader,
    Tooltip,
    FormSelectField,
} from "@/components/ui";
import {
    useGetTentativeOrArchivedListQuery,
    useRevertToOpdMutation,
    useLazyGetPatientDetailByAppointmentQuery,
    type CounsellorTentativeOrArchivedItem,
} from "@/store/api/counsellorApi";
import { useDebounce } from "@/hooks/useDebounce";
import { useCounsellorResolvedBranchId } from "@/hooks/useBranchFilter";
import {
    buildCounsellorViewAppointmentData,
    resolveCounsellorAppointmentId,
} from "@/lib/counsellor/patientView";
import { useGetPatientFilesQuery, useGetPatientHealthCardByUhidQuery, useLazyGetPresignedUrlQuery } from "@/store/api/commonApi";


const TRUNCATED_TABLE_CELL_WIDTH = 150;

function formatTableDate(dateStr?: string | null): string {
    if (!dateStr) return "N/A";
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) return dateStr;
    const day = String(parsed.getDate()).padStart(2, "0");
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const year = parsed.getFullYear();
    return `${day}-${month}-${year}`;
}

function formatTableDateTime(dateStr?: string | null): string {
    if (!dateStr) return "N/A";
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) return dateStr;
    const day = String(parsed.getDate()).padStart(2, "0");
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const year = parsed.getFullYear();
    let hours = parsed.getHours();
    const minutes = String(parsed.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const formattedHours = String(hours).padStart(2, "0");
    return `${day}-${month}-${year} ${formattedHours}:${minutes} ${ampm}`;
}

function TruncatedTableCell({ text }: { text: string }) {
  const value = text?.trim() ? text.trim() : "N/A";
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
        className="flex min-w-0 items-center"
        style={{ width: TRUNCATED_TABLE_CELL_WIDTH, maxWidth: TRUNCATED_TABLE_CELL_WIDTH }}
      >
        <span
          ref={textRef}
          className="min-w-0 flex-1 overflow-hidden whitespace-nowrap"
        >
          {value}
        </span>
        {isTruncated ? <span className="shrink-0 pl-1.5 text-[#434956]">...</span> : null}
      </div>
    </Tooltip>
  );
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

export default function CounsellorTentativeAdmissionsPage() {
    const router = useRouter();

    const {
        selectedBranchFilter: selectedBranch,
        setSelectedBranchFilter: setSelectedBranch,
        branchFilterOptions: hookBranchFilterOptions,
        isLoadingBranches: isLoadingBranchFilter,
        isBranchFilterDisabled,
        resolvedFilterBranchId,
    } = useCounsellorResolvedBranchId();

    const [searchTerm, setSearchTerm] = useState("");
    const [viewAppointmentMode, setViewAppointmentMode] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<CounsellorTentativeOrArchivedItem | null>(null);
    const debouncedSearch = useDebounce(searchTerm, 500);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10); // 6 items shown as in reference image
    const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("ASC");
    const [sortBy, setSortBy] = useState<string>("patientName");
    const [pendingAction, setPendingAction] = useState<{ type: "refer"; item: CounsellorTentativeOrArchivedItem } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successDialogConfig, setSuccessDialogConfig] = useState<{
        message: React.ReactNode;
        confirmText?: string;
        cancelText?: string;
        showCancel?: boolean;
        onConfirm?: () => void;
        onCancel?: () => void;
    } | null>(null);
    const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
    const [apiErrorMessage, setApiErrorMessage] = useState("");

    // Dynamic detailed patient data loading states
    const [getPatientDetailByAppointment] = useLazyGetPatientDetailByAppointmentQuery();
    const [loadingPatientId, setLoadingPatientId] = useState<number | string | null>(null);
    const [fetchedPatientData, setFetchedPatientData] = useState<any>(null);
    const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
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



    const [revertToOpd] = useRevertToOpdMutation();

    const handleViewPatient = async (item: CounsellorTentativeOrArchivedItem) => {
        const appointmentLookupId = resolveCounsellorAppointmentId(item);
        if (!appointmentLookupId) {
            setApiErrorMessage("Appointment ID not found for this patient.");
            setShowApiErrorDialog(true);
            return;
        }

        setLoadingPatientId(item.id);
        try {
            const res = await getPatientDetailByAppointment(appointmentLookupId).unwrap();
            if (res?.success) {
                setFetchedPatientData(res.data);
                setSelectedPatient(item);
                setSelectedAppointmentId(appointmentLookupId);
                setViewAppointmentMode(true);
            } else {
                setApiErrorMessage(res?.message || "Failed to load patient details.");
                setShowApiErrorDialog(true);
            }
        } catch (err: unknown) {
            const apiErr = err as { data?: { message?: string }; message?: string };
            setApiErrorMessage(
                apiErr?.data?.message || apiErr?.message || "An error occurred while fetching patient details."
            );
            setShowApiErrorDialog(true);
        } finally {
            setLoadingPatientId(null);
        }
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, selectedBranch]);

    // Integrate backend query hook
    const {
        data: listRes,
        isLoading,
        isError,
        refetch
    } = useGetTentativeOrArchivedListQuery({
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearch.trim() || undefined,
        sortBy: sortBy === "patientName" ? "patientName" : undefined,
        order: sortOrder,
        type: "tentative",
        ...(resolvedFilterBranchId != null ? { branchId: resolvedFilterBranchId } : {}),
    }, {
    skip: resolvedFilterBranchId == null,
    refetchOnMountOrArgChange: true,
    });

    const currentList = listRes?.data || [];
    const totalItems = listRes?.total || 0;

    const handleReferToOPD = async (item: CounsellorTentativeOrArchivedItem) => {
        setIsSubmitting(true);
        try {
            const res = await revertToOpd(item.id).unwrap();
            if (res.success) {
                setSuccessDialogConfig({
                    message: res.message || `Patient ${item.patientName} referred to OPD successfully!`,
                    confirmText: "OK",
                    showCancel: false,
                });
                try {
                    refetch();
                } catch (e) {
                    console.warn("Failed to refetch tentative admissions list:", e);
                }
            } else {
                setApiErrorMessage(res.message || "Failed to revert patient to OPD.");
                setShowApiErrorDialog(true);
            }
        } catch (err: any) {
            console.error("Error reverting patient to OPD:", err);
            setApiErrorMessage(err?.data?.message || err?.message || "An error occurred while reverting patient to OPD.");
            setShowApiErrorDialog(true);
        } finally {
            setIsSubmitting(false);
        }
    };



    const handleStartAdmission = (item: CounsellorTentativeOrArchivedItem) => {
            console.log("itemegfwyegyeg",item)
        if (!item.id) return;
        router.push(`/counsellor/start-counselling?tentativepatientID=${item.id}&branchId=${item.branchId}`);
    };

    // Button style class matching the dashboard action items
    const btnCls = "px-4 py-1.5 rounded-[32px] border border-[#0B8C00] text-[#0B8C00] text-xs font-medium hover:bg-[#F2F8F2] transition-colors whitespace-nowrap";

    // Setup columns
    const columns = [
        { label: "Sr no.", position: "first" as const, className:"w-[80px] max-w-[80px]" },
        {
            label: "Patient Name",
            className: "w-[150px] max-w-[150px]",
            sortable: true,
            sortDirection: sortBy === "patientName" ? (sortOrder.toLowerCase() as "asc" | "desc") : null,
            onSort: () => {
                setSortBy("patientName");
                setSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"));
                setCurrentPage(1);
            },
        },
        { label: "Patient UHID" },
        { label: "Patient Contact Number" },
        { label: "Referring Doctor" },
        { label: "Chief Complaint" },
        { label: "Admission Date" },
        { label: "Created At" },
        { label: "Action", position: "last" as const, className: "cursor-pointer" },
    ];

    // Setup rows dynamically mapped from API response
    const rows = currentList.map((item, index) => {
        const sr = (currentPage - 1) * itemsPerPage + index + 1;

        // Custom green styled link for patient UHID
        const isUhidLoading = loadingPatientId === item.id;
        const uhid = (
            <button
                type="button"
                className="inline-flex items-center gap-1.5 text-[#0B8C00] font-medium hover:underline cursor-pointer disabled:opacity-60"
                onClick={() => void handleViewPatient(item)}
                disabled={isUhidLoading}
            >
                {isUhidLoading ? <SpinnerLoader size={14} /> : null}
                {item.patientUhid || "N/A"}
            </button>
        );

        const isButtonLoading = loadingPatientId === item.id;
        // Action buttons
        const actions = (
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="xsmall"
                    className="whitespace-nowrap"
                    onClick={() => setPendingAction({ type: "refer", item })}
                >
                    Refer to OPD
                </Button>
                <Button
                    variant="outline"
                    size="xsmall"
                    className="whitespace-nowrap flex items-center justify-center min-w-[50px]"
                    onClick={() => void handleViewPatient(item)}
                    disabled={isButtonLoading}
                >
                    {isButtonLoading ? (
                        <SpinnerLoader size={16} />
                    ) : (
                        "View"
                    )}
                </Button>
                <Button
                    variant="primary"
                    size="xsmall"
                    className="whitespace-nowrap"
                    onClick={() => handleStartAdmission(item)}
                >
                    Start Counselling
                </Button>
            </div>
        );

        return [
            sr,
            // item.patientName || "N/A",
            <TruncatedTableCell key={`tentative-${item.id ?? index}`} text={`${item.patientTitle} ${item.patientName || "N/A"}`} />,
            uhid,
            item.contactNumber || "N/A",
            item.doctorName || "N/A",
            // item.diagnosis || "N/A", // API "diagnosis" field maps to Chief Complaint
            <TruncatedTableCell key={`tentative-${item.id ?? index}`} text={item.diagnosis || "N/A"} />,
            formatTableDate(item.admissionDate),
            formatTableDateTime(item.createdAt),
            actions,
        ];
    });

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
                                setSelectedPatient(null);
                                setFetchedPatientData(null);
                                setSelectedAppointmentId(null);
                            }}
                        />
                    </div>
                    {(() => {
                        const viewData = buildCounsellorViewAppointmentData(fetchedPatientData);

                        return (
                            <ViewAppointment
                                appointmentId={selectedAppointmentId ?? undefined}
                                appointmentItems={viewData.appointmentItems}
                                walletRemainingAmount={viewData.remainingAmount}
                                walletDetails={viewData.walletDetails}
                                referralItems={viewData.referralItems}
                                patientName={viewData.patientName}
                                patientSubtitle={viewData.patientSubtitle}
                                patientBadges={viewData.patientBadges}
                                patientInfoItems={viewData.patientInfoItems}
                                showVitals={true}
                                vitalsItems={viewData.vitalsItems}
                                timelineItems={viewData.timelineItems.length > 0 ? viewData.timelineItems : undefined}
                                healthCardNo={viewData.healthCardNo}
                                healthCardImageUrl={cardImageUrl || undefined}
                                isHealthCardLoading={isHealthCardLoading}
                                medicalItems={viewData.medicalItems}
                                fileItems={patientFilesItems}
                                otherInfoItems={viewData.otherInfoItems}
                            />
                        );
                    })()}
                </div>
            ) : (
                <div className="flex flex-col gap-6 ">
                    {/* Page Heading */}
                    <div className="flex items-start justify-between">
                        <PageHeading title="Tentative Admissions" />
                    </div>

                    {/* Table Listing Card */}
                    <div className="w-full rounded-[20px] border border-[#E3EEE1] p-2">
                        <TableListingCard
                            sections={[
                                {
                                    id: "tentative-admissions-list",
                                    title: "Tentative Admissions",
                                    titleRightContent: (
                                        <div className="flex flex-wrap items-center gap-3">
                                            <FormSelectField
                                                label=""
                                                hideLabel
                                                options={hookBranchFilterOptions}
                                                value={selectedBranch}
                                                onChange={(value) => {
                                                    setSelectedBranch(Array.isArray(value) ? value[0] : value || "");
                                                    setCurrentPage(1);
                                                }}
                                                placeholder={isLoadingBranchFilter ? "Loading branches..." : "Select Branch"}
                                                mode="single"
                                                background="normal"
                                                width={280}
                                                disabled={isBranchFilterDisabled || isLoadingBranchFilter}
                                            />
                                            <div className="!w-[280px] min-w-[280px] max-w-[280px] shrink-0">
                                                <TableSearchInput
                                                    value={searchTerm}
                                                    onChange={setSearchTerm}
                                                    placeholder="Search Here..."
                                                    className="!w-full"
                                                />
                                            </div>
                                        </div>
                                    ),
                                    columns,
                                    rows,
                                    isLoading,
                                    isError,
                                    errorMessage: "Facing server API error",
                                    emptyMessage: "No tentative admissions found",
                                    pagination: {
                                        currentPage,
                                        totalItems,
                                        itemsPerPage,
                                        onPageChange: setCurrentPage,
                                        onItemsPerPageChange: (items: number) => {
                                            setItemsPerPage(items);
                                            setCurrentPage(1);
                                        },
                                        itemsPerPageOptions: [10, 30, 50, 100],
                                    },
                                },
                            ]}
                        />
                    </div>
                </div>
            )}

            {/* Action Confirmation Dialog */}
            <MessageDialog
                open={!!pendingAction}
                onClose={() => { if (!isSubmitting) setPendingAction(null); }}
                icon="/icons/questionMark.svg"
                iconBgColor="transparent"
                message={
                    pendingAction ? (
                        <div className="flex flex-col items-center text-center">
                            <span className="text-lg font-bold text-[#1E293B] mb-1">Refer to OPD</span>
                            <span className="text-sm text-[#475569] max-w-[290px]">
                                Are you sure you want to refer{" "}
                                <strong className="text-[#0B8C00]">
                                    {pendingAction.item.patientName || "this patient"}
                                </strong>{" "}
                                back to OPD?
                            </span>
                        </div>
                    ) : null
                }
                confirmText="Confirm"
                cancelText="Cancel"
                showCancel
                isActionLoading={isSubmitting}
                onConfirm={async () => {
                    if (!pendingAction || isSubmitting) return;
                    await handleReferToOPD(pendingAction.item);
                    setPendingAction(null);
                }}
                onCancel={() => { if (!isSubmitting) setPendingAction(null); }}
            />

            {/* Standard Feedback Dialogs */}
            <MessageDialog
                open={!!successDialogConfig}
                onClose={() => setSuccessDialogConfig(null)}
                icon="/icons/SuccessCheck.svg"
                iconBgColor="#E8F5E9"
                message={successDialogConfig?.message || ""}
                confirmText={successDialogConfig?.confirmText || "OK"}
                cancelText={successDialogConfig?.cancelText || "Close"}
                showCancel={successDialogConfig?.showCancel ?? false}
                onConfirm={() => {
                    if (successDialogConfig?.onConfirm) {
                        successDialogConfig.onConfirm();
                    }
                    setSuccessDialogConfig(null);
                }}
                onCancel={() => {
                    if (successDialogConfig?.onCancel) {
                        successDialogConfig.onCancel();
                    }
                    setSuccessDialogConfig(null);
                }}
            />

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

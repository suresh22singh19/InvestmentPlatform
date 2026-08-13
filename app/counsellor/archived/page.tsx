"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
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
    useLazyCheckFirstDayPaymentQuery,
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
import RoomAllocation from "../start-counselling/roomAllowcation";
import DateFilterDropdown from "@/components/registration/DateFilterDropdown";

const TRUNCATED_TABLE_CELL_WIDTH = 150;

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

export default function CounsellorArchivedPage() {
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
    const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
    const debouncedSearch = useDebounce(searchTerm, 500);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10); // Displays 10 items as in reference image
    const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("ASC");
    const [sortBy, setSortBy] = useState<string>("patientName");
    const [activeAllocationPatient, setActiveAllocationPatient] = useState<{ patient: any; payment: any } | null>(null);

    // Date Filter State
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleFilterClick = () => setIsFilterOpen((prev) => !prev);
    const handleFilter = (from: string, to: string) => {
        setFromDate(from);
        setToDate(to);
        setIsFilterOpen(false);
        setCurrentPage(1);
    };
    const handleClear = () => {
        setFromDate("");
        setToDate("");
        setIsFilterOpen(false);
        setCurrentPage(1);
    };

    // Confirmation dialog and submitting states
    const [pendingAction, setPendingAction] = useState<{ type: "refer" | "startAdmission"; item: any } | null>(null);
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
        { skip: !fetchedPatientData?.appointmentDetail?.uhid, refetchOnMountOrArgChange: true }
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

    const [revertToOpd] = useRevertToOpdMutation();
    const [checkFirstDayPayment] = useLazyCheckFirstDayPaymentQuery();

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
        type: "archived",
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        ...(resolvedFilterBranchId != null ? { branchId: resolvedFilterBranchId } : {}),
    },
   {
    skip: resolvedFilterBranchId == null,
    refetchOnMountOrArgChange: true,
  }
);

    const currentList = listRes?.data || [];
    const totalItems = listRes?.total || 0;

    const handleReferToOPD = async (item: any) => {
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
                    console.warn("Failed to refetch archived list:", e);
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

    const handleStartAdmission = async (item: any) => {
        setIsSubmitting(true);
        try {
            const res = await checkFirstDayPayment(item.id).unwrap();
            if (res.success) {
                const remaining = parseFloat(res.data.remainingForFirstDay || "0");
                const complete = res.data.firstDayPaymentComplete;

                if (remaining > 0 || !complete) {
                    // Case A: Payment not completed
                    setSuccessDialogConfig({
                        message: (
                            <div className="flex flex-col items-center text-center">
                                <span className="text-sm text-[#475569]">
                                    First day payment is not completed. Please complete the remaining amount{" "}
                                    <strong className="text-[#F6776E]">{res.data.remainingForFirstDay || "1500.00"}</strong> first, then proceed with room allocation.
                                </span>
                            </div>
                        ),
                        confirmText: "OK",
                        showCancel: false,
                    });
                } else {
                    // Case B: Payment completed
                    setSuccessDialogConfig({
                        message: (
                            <div className="flex flex-col items-center text-center">
                                <span className="text-sm text-[#475569]">
                                    Admission started for{" "}
                                    <strong className="text-[#0B8C00]">{item.patientName || "patient"}</strong>{" "}
                                    successfully! You can now proceed with room allocation.
                                </span>
                            </div>
                        ),
                        confirmText: "Assign Room & Bed",
                        cancelText: "Close",
                        showCancel: true,
                        onConfirm: () => {
                            setActiveAllocationPatient({
                                patient: item,
                                payment: res.data
                            });
                        },
                    });
                }
            } else {
                setApiErrorMessage(res.message || "Failed to check payment status.");
                setShowApiErrorDialog(true);
            }
        } catch (err: any) {
            console.error("Error checking first day payment:", err);
            setApiErrorMessage(err?.data?.message || err?.message || "An error occurred while starting admission.");
            setShowApiErrorDialog(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Action button style class
    const btnCls = "px-4 py-1.5 rounded-[32px] border border-[#0B8C00] text-[#0B8C00] text-xs font-medium hover:bg-[#F2F8F2] transition-colors whitespace-nowrap";

    // Setup columns
    const columns = [
        { label: "Sr no.", position: "first" as const },
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
        { label: "Chief Complaint", className: "w-[150px] max-w-[150px]"},
        { label: "Action", position: "last" as const, className: "cursor-pointer" },
    ];

    // Setup rows dynamically mapped from API response
    const rows = currentList.map((item, index) => {
        const sr = (currentPage - 1) * itemsPerPage + index + 1;

        // Clickable green UHID
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
                {/* <Button
                    variant="outline"
                    size="xsmall"
                    className="whitespace-nowrap"
                    onClick={() => setPendingAction({ type: "refer", item })}
                >
                    Refer to OPD
                </Button> */}

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

                {/* <Button
                    variant="primary"
                    size="xsmall"
                    className="whitespace-nowrap"
                    onClick={() => setPendingAction({ type: "startAdmission", item })}
                >
                    Start Admission
                </Button> */}
            </div>
        );

        return [
            sr,
            // item.patientName || "N/A",
            <TruncatedTableCell key={`archived-${item.id ?? index}`} text={`${item.patientTitle} ${item.patientName || "N/A"}`}  />,
            uhid,
            item.contactNumber || "N/A",
            item.doctorName || "N/A",
            // item.diagnosis || "N/A", // API "diagnosis" field maps to Chief Complaint
            <TruncatedTableCell key={`archived-${item.id ?? index}`} text={item.diagnosis || "N/A"} />,
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
            ) : activeAllocationPatient ? (
                <div className="flex flex-col gap-6">
                    <div className="flex items-start justify-between">
                        <PageHeading title={`Room Allocation - ${activeAllocationPatient.patient.patientName || "Patient"}`} />
                        <Button
                            variant="outline"
                            onClick={() => setActiveAllocationPatient(null)}
                        >
                            ← Back to Archived
                        </Button>
                    </div>

                    <RoomAllocation
                        activePackage={{
                            id: activeAllocationPatient.payment?.patientPackageId?.toString(),
                            packageName: activeAllocationPatient.patient?.packageName || "Selected Package",
                            branchRoomType: {
                                roomRentPrice: parseFloat(activeAllocationPatient.payment?.perDayCost || "1500")
                            }
                        }}
                        patientId={activeAllocationPatient.patient?.patientId || activeAllocationPatient.patient?.id}
                        patientPackageId={activeAllocationPatient.payment?.patientPackageId}
                        patientDetails={{
                            patientName: activeAllocationPatient.patient?.patientName,
                            patientUhid: activeAllocationPatient.patient?.patientUhid,
                            contactNumber: activeAllocationPatient.patient?.contactNumber,
                            diagnosis: activeAllocationPatient.patient?.diagnosis,
                            doctorName: activeAllocationPatient.patient?.doctorName,
                        }}
                        onSuccess={() => {
                            setActiveAllocationPatient(null);
                            try {
                                refetch();
                            } catch (e) {
                                console.warn("Failed to refetch:", e);
                            }
                        }}
                        onCancel={() => setActiveAllocationPatient(null)}
                    />
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {/* Page Heading */}
                    <div className="flex items-start justify-between">
                        <PageHeading title="Archived" />
                    </div>

                    {/* Table Listing Card */}
                    <div className="w-full rounded-[20px] border border-[#E3EEE1] p-2">
                        <TableListingCard
                            sections={[
                                {
                                    id: "archived-patients-list",
                                    title: "Archived",
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
                                            <div className="relative" ref={filterRef}>
                                                <button
                                                    onClick={handleFilterClick}
                                                    className="cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center w-[108px] h-10 rounded-[32px] border border-[#0B8C00] bg-white hover:bg-[#F7FAF7] relative z-10"
                                                >
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Image src="/icons/FilterIcon.svg" alt="filter" width={24} height={24} />
                                                        <span className="font-inter font-medium text-sm leading-[120%] text-[#0B8C00]">Filter</span>
                                                    </div>
                                                </button>
                                                {isFilterOpen && (
                                                    <div className="absolute right-0 top-full mt-2 z-50">
                                                        <DateFilterDropdown
                                                            onFilter={handleFilter}
                                                            onClear={handleClear}
                                                            initialFromDate={fromDate}
                                                            initialToDate={toDate}
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            <div style={{ width: "300px" }}>
                                                <TableSearchInput
                                                    value={searchTerm}
                                                    onChange={setSearchTerm}
                                                    placeholder="Search Here..."
                                                />
                                            </div>
                                        </div>
                                    ),
                                    columns,
                                    rows,
                                    isLoading,
                                    isError,
                                    errorMessage: "Facing server API error",
                                    emptyMessage: "No archived patients found",
                                    pagination: {
                                        currentPage,
                                        totalItems,
                                        itemsPerPage,
                                        onPageChange: setCurrentPage,
                                        onItemsPerPageChange: (items: number) => {
                                            setItemsPerPage(items);
                                            setCurrentPage(1);
                                        },
                                        itemsPerPageOptions: [10, 20, 50, 100],
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
                        pendingAction.type === "refer" ? (
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
                        ) : (
                            <div className="flex flex-col items-center text-center">
                                <span className="text-lg font-bold text-[#1E293B] mb-1">Confirm Admission</span>
                                <span className="text-sm text-[#475569] max-w-[290px]">
                                    Are you sure you want to proceed with the admission process for{" "}
                                    <strong className="text-[#0B8C00]">
                                        {pendingAction.item.patientName || "this patient"}
                                    </strong>
                                    ?
                                </span>
                            </div>
                        )
                    ) : null
                }
                confirmText="Confirm"
                cancelText="Cancel"
                showCancel
                isActionLoading={isSubmitting}
                onConfirm={async () => {
                    if (!pendingAction || isSubmitting) return;
                    if (pendingAction.type === "refer") {
                        await handleReferToOPD(pendingAction.item);
                    } else if (pendingAction.type === "startAdmission") {
                        await handleStartAdmission(pendingAction.item);
                    }
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

"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
    Button,
    FormInputField,
    FormSelectField,
    DatePicker,
    MessageDialog,
} from "@/components/ui";
import type { SelectOption } from "@/components/ui/FormSelectField";
import { useAppSelector } from "@/store/hooks";
import { selectUserBranchId } from "@/store/slices/authSlice";
import { useGetBranchesQuery } from "@/store/api/settingsApi";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { usePermission } from "@/hooks/usePermission";
import {
    useLazyGenerateCsvForOldAndNewPatientQuery,
    useLazyGenerateCsvForHealthCardIssuesQuery,
    useLazyGenerateCsvForDoctorAssigningQuery,
    useLazyGenerateCsvForBranchConsultancyQuery,
    useLazyGenerateCsvForPatientTimeStampingQuery,
} from "@/store/api/reportsApi";

const REPORT_TYPE_OPTIONS: SelectOption[] = [
    { value: "old-new-registration", label: "Old / New Registration Report" },
    { value: "health-card-issues", label: "JS Health Card Issue Report" },
    { value: "doctor-assigning", label: "Doctor Assigning Report" },
    { value: "branch-consultancy", label: "Branch Consultancy Report" },
    { value: "patient-time-stamping", label: "Time Stamping Report" },
];

const DATE_PRESET_OPTIONS: SelectOption[] = [
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "custom", label: "Custom" },
];

function getTodayYYYYMMDD(): string {
    return new Date().toISOString().split("T")[0];
}

function getYesterdayYYYYMMDD(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
}

/** Add one year to a YYYY-MM-DD date string. */
function addOneYear(dateStr: string): string {
    const d = new Date(dateStr + "T12:00:00");
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split("T")[0];
}

function capitalizeFirst(str: string | null | undefined): string {
    if (str == null || str === "") return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export default function ReportPage() {
    const reportsPerm = usePermission("Reports", { subModule: "Report" });
    const authBranchId = useAppSelector(selectUserBranchId);

    const {
        selectedBranchFilter: selectedBranchId,
        setSelectedBranchFilter: setSelectedBranchId,
        branchFilterOptions: branchOptions,
        isLoadingBranches,
        isBranchFilterDisabled,
        filterBranchId: hookFilterBranchId,
        isSuperAdmin: isReportsSuperAdmin,
    } = useBranchFilter();

    const { data: branchesData } = useGetBranchesQuery(undefined, {
        skip: !isReportsSuperAdmin,
    });

    const branchOptionsWithType = useMemo((): SelectOption[] => {
        const rows = branchesData?.data;
        const mapped =
            !Array.isArray(rows) || rows.length === 0
                ? branchOptions
                : branchOptions.map((opt) => {
                      if (opt.value === "") return opt;
                      const id = parseInt(String(opt.value), 10);
                      if (!Number.isFinite(id)) return opt;
                      const b = rows.find((x) => Number(x.id) === id);
                      const t = b?.type?.trim();
                      if (!b || !t) return opt;
                      return {
                          value: opt.value,
                          label: `${b.name} (${capitalizeFirst(t)})`,
                      };
                  });
        if (isReportsSuperAdmin) {
            return mapped.filter((o) => o.value !== "");
        }
        return mapped;
    }, [branchOptions, branchesData, isReportsSuperAdmin]);

    /** Super Admin: default to first branch (no "All Branches"). */
    useEffect(() => {
        if (!isReportsSuperAdmin) return;
        if (isLoadingBranches) return;
        const rows = branchesData?.data;
        if (!Array.isArray(rows) || rows.length === 0) return;
        if (selectedBranchId !== "") return;
        setSelectedBranchId(String(rows[0].id));
    }, [
        isReportsSuperAdmin,
        isLoadingBranches,
        branchesData,
        selectedBranchId,
        setSelectedBranchId,
    ]);

    const reportBranchId = useMemo((): number | null => {
        if (isReportsSuperAdmin) {
            if (
                hookFilterBranchId != null &&
                Number.isFinite(hookFilterBranchId) &&
                hookFilterBranchId > 0
            ) {
                return hookFilterBranchId;
            }
            return null;
        }
        const n = Number(authBranchId);
        return Number.isFinite(n) && n > 0 ? n : null;
    }, [isReportsSuperAdmin, hookFilterBranchId, authBranchId]);
    const [reportType, setReportType] = useState<string>("old-new-registration");
    const [uhid, setUhid] = useState<string>("");
    const [datePreset, setDatePreset] = useState<string>("");
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [showErrorDialog, setShowErrorDialog] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string>("");

    const [generateOldNewCsv, { isLoading: isGeneratingOldNew }] = useLazyGenerateCsvForOldAndNewPatientQuery();
    const [generateHealthCardCsv, { isLoading: isGeneratingHealthCard }] = useLazyGenerateCsvForHealthCardIssuesQuery();
    const [generateDoctorAssigningCsv, { isLoading: isGeneratingDoctorAssigning }] =
        useLazyGenerateCsvForDoctorAssigningQuery();
    const [generateBranchConsultancyCsv, { isLoading: isGeneratingBranchConsultancy }] =
        useLazyGenerateCsvForBranchConsultancyQuery();
    const [generatePatientTimeStampingCsv, { isLoading: isGeneratingPatientTimeStamping }] =
        useLazyGenerateCsvForPatientTimeStampingQuery();
    const isGenerating =
        isGeneratingOldNew ||
        isGeneratingHealthCard ||
        isGeneratingDoctorAssigning ||
        isGeneratingBranchConsultancy ||
        isGeneratingPatientTimeStamping;

    const reportTitle =
        REPORT_TYPE_OPTIONS.find((o) => o.value === reportType)?.label ??
        "Old / New Registration Report";

    const getFromToDates = (): { fromDate: string; toDate: string } | null => {
        if (datePreset === "today") {
            const t = getTodayYYYYMMDD();
            return { fromDate: t, toDate: t };
        }
        if (datePreset === "yesterday") {
            const y = getYesterdayYYYYMMDD();
            return { fromDate: y, toDate: y };
        }
        if (datePreset === "custom" && startDate && endDate) {
            return { fromDate: startDate, toDate: endDate };
        }
        return null;
    };

    const handleDownload = async () => {
        if (isSubmitting || isGenerating) return;
        if (!reportsPerm.canDownload) return;
        if (reportBranchId == null) return;
        const dates = getFromToDates();
        if (!dates) return;

        setIsSubmitting(true);
        const payload = {
            branchId: reportBranchId,
            fromDate: dates.fromDate,
            toDate: dates.toDate,
            uhid: uhid.trim(),
        };
        try {
            const result =
                reportType === "health-card-issues"
                    ? await generateHealthCardCsv(payload).unwrap()
                    : reportType === "doctor-assigning"
                      ? await generateDoctorAssigningCsv(payload).unwrap()
                      : reportType === "branch-consultancy"
                        ? await generateBranchConsultancyCsv(payload).unwrap()
                        : reportType === "patient-time-stamping"
                          ? await generatePatientTimeStampingCsv(payload).unwrap()
                          : await generateOldNewCsv(payload).unwrap();
            if (!result?.success) {
                setErrorMessage(result?.message || "Something went wrong.");
                setShowErrorDialog(true);
                return;
            }
            if (result?.data?.url) {
                window.open(result.data.url, "_blank", "noopener,noreferrer");
            } else {
                setErrorMessage(result?.message || "Download link not found.");
                setShowErrorDialog(true);
            }
        } catch (err: any) {
            const msg =
                err?.data?.message ||
                err?.error?.message ||
                err?.message ||
                "Something went wrong.";
            setErrorMessage(msg);
            setShowErrorDialog(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    const datesReady = datePreset === "today" || datePreset === "yesterday" || (datePreset === "custom" && startDate && endDate);
    const canDownload = reportBranchId != null && datesReady && reportsPerm.canDownload;

    if (!reportsPerm.canView) {
        return (
            <AppShell>
                <div className="rounded-[20px] border border-[#E3EEE1] bg-white px-6 py-10 text-center text-sm text-[#9CA3AF]">
                    You don&apos;t have permission to view reports.
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <div className="">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <PageHeading title="Reports" />
                    <div className="flex flex-wrap items-start justify-end gap-3">
                        {isReportsSuperAdmin ? (
                            <div className="flex-shrink-0" style={{ width: "300px" }}>
                                <FormSelectField
                                    label=""
                                    hideLabel
                                    value={selectedBranchId}
                                    onChange={(value) => {
                                        const newValue = Array.isArray(value) ? value[0] : value ?? "";
                                        setSelectedBranchId(newValue);
                                    }}
                                    options={branchOptionsWithType}
                                    placeholder={isLoadingBranches ? "Loading branches..." : "Select branch"}
                                    mode="single"
                                    background="normal"
                                    disabled={isBranchFilterDisabled || isLoadingBranches}
                                />
                            </div>
                        ) : null}
                        <div className="flex-shrink-0" style={{ width: "300px" }}>
                            <FormSelectField
                                label=""
                                value={reportType}
                                onChange={(value) => {
                                    const newValue = Array.isArray(value) ? value[0] : value || "";
                                    setReportType(newValue);
                                }}
                                options={REPORT_TYPE_OPTIONS}
                                placeholder="Select Report"
                                mode="single"
                                background="white"
                                width={300}
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-6 rounded-[12px] border border-[#DFE0E2] bg-white p-6 shadow-[0px_6px_40px_rgba(0,0,0,0.02)]">
                    <h2 className="mb-6 text-xl font-semibold leading-tight text-[#262D3B]">
                        {reportTitle}
                    </h2>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <FormSelectField
                            label="Date"
                            value={datePreset}
                            onChange={(value) => {
                                const newValue = Array.isArray(value) ? value[0] : value || "";
                                setDatePreset(newValue);
                                if (newValue !== "custom") {
                                    setStartDate("");
                                    setEndDate("");
                                }
                            }}
                            options={DATE_PRESET_OPTIONS}
                            placeholder="Select"
                            mode="single"
                            background="white"
                            width="100%"
                        />
                        <FormInputField
                            label="UHID"
                            placeholder="Enter UHID"
                            value={uhid}
                            onChange={(e) => {
                                let value = e.target.value
                                    .replace(/\s/g, "")
                                    .replace(/[^a-zA-Z0-9]/g, "")
                                    .toUpperCase();
                                value = value.replace(/^0+/, "");
                                value = value.slice(0, 20);
                                setUhid(value);
                            }}
                            type="text"
                            maxLength={20}
                            width="100%"
                        />
                      
                        {datePreset === "custom" && (
                            <>
                                <DatePicker
                                    background="white"
                                    label="Start Date"
                                    placeholder="Choose date"
                                    value={startDate}
                                    onChange={(value) => {
                                        setStartDate(value);
                                        if (value && endDate && endDate < value) setEndDate("");
                                    }}
                                    width="100%"
                                    maxDate={endDate || undefined}
                                />
                                <DatePicker
                                    background="white"
                                    label="End Date"
                                    placeholder="Choose date"
                                    value={endDate}
                                    onChange={(value) => {
                                        setEndDate(value);
                                        if (value && startDate && value < startDate) setStartDate("");
                                    }}
                                    width="100%"
                                    minDate={startDate || undefined}
                                    maxDate={startDate ? addOneYear(startDate) : undefined}
                                />
                            </>
                        )}
                    </div>

                    <div className="mt-6 flex justify-end">
                        <Button
                            variant="primary"
                            size="large"
                            leftIcon={
                                <Image
                                    src="/icons/DownloadWhiteIcon.svg"
                                    alt="Download"
                                    width={20}
                                    height={20}
                                />
                            }
                            onClick={handleDownload}
                            disabled={!canDownload || isGenerating || isSubmitting}
                            isLoading={isGenerating || isSubmitting}
                        >
                            Download
                        </Button>
                    </div>
                </div>
            </div>

            <MessageDialog
                open={showErrorDialog}
                onClose={() => {
                    setShowErrorDialog(false);
                }}
                icon="/icons/CrossIcon.svg"
                iconBgColor="#FFEBEE"
                message={errorMessage}
                confirmText="OK"
                showCancel={false}
                onConfirm={() => {
                    setShowErrorDialog(false);
                }}
            />
        </AppShell>
    );
}

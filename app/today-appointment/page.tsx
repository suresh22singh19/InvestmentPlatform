"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { usePermission } from "@/hooks/usePermission";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
    TableSearchInput,
    TableListingCard,
    Button,
    RefreshButton,
    FormSelectField,
    BackToPreviousPageButton,
    ViewAppointment,
    Dialog,
    MessageDialog,
    Tabs,
    Tooltip,
    PatientHeaderSummaryCard,
} from "@/components/ui";
import DoctorActivity from "./doctorActivity";
import { openDatabase, clearAllChunksFromDB } from "@/hooks/useAudioRecorder";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { selectUserId, selectUserBranchId, selectRoleCategoryType, selectUserBranchName } from "@/store/slices/authSlice";
import { useGetAppointmentsOfDoctorQuery, useGetPatientReferralForDoctorQuery, useGetPatientWalletBalanceQuery } from "@/store/api/doctorApi";
import { useGetBranchesQuery } from "@/store/api/settingsApi";
import { useGetDoctorsByBranchQuery } from "@/store/api/registrationApi";
import { useGetPatientFilesQuery, useLazyGetPresignedUrlQuery, useGetAllMedicineByBranchListQuery } from "@/store/api/commonApi";
import { setMedicines } from "@/store/slices/medicineSlice";
import { useDebounce } from "@/hooks/useDebounce";
import DateFilterDropdown from "@/components/registration/DateFilterDropdown";
import { getOngoingInOtherTabsAppointmentIds, isConsultationOngoingInAnotherTab } from "@/lib/utils/consultationTabTracker";

const maskPhoneNumber = (phoneNumber: string | null | undefined): string => {
    if (!phoneNumber) return "N/A";
    const cleaned = phoneNumber.replace(/\D/g, ""); // Remove non-digits
    if (cleaned.length < 4) return phoneNumber; // If less than 4 digits, return as is
    const last4 = cleaned.slice(-4);
    const masked = "XXXXXX" + last4;
    return masked;
};

export default function DoctorListingPage() {
    const router = useRouter();

    const [draftAppointmentIds, setDraftAppointmentIds] = useState<Set<number>>(new Set());
    const [ongoingInOtherTabs, setOngoingInOtherTabs] = useState<Set<string>>(new Set());

    useEffect(() => {
        const updateOngoing = () => {
            setOngoingInOtherTabs(getOngoingInOtherTabsAppointmentIds());
        };

        updateOngoing();

        window.addEventListener("storage", updateOngoing);
        window.addEventListener("ongoing_consultations_changed", updateOngoing);
        window.addEventListener("focus", updateOngoing);
        window.addEventListener("visibilitychange", updateOngoing);

        const interval = setInterval(updateOngoing, 1000);

        return () => {
            window.removeEventListener("storage", updateOngoing);
            window.removeEventListener("ongoing_consultations_changed", updateOngoing);
            window.removeEventListener("focus", updateOngoing);
            window.removeEventListener("visibilitychange", updateOngoing);
            clearInterval(interval);
        };
    }, []);

    const handleStartConsultation = (item: any) => {
        const appIdStr = String(item.appointmentId || (item as any).id || "");
        if (appIdStr && isConsultationOngoingInAnotherTab(appIdStr)) {
            return;
        }
        setSelectedPatient(item);
    };

    const todayAppointmentPermission = usePermission("Today Appointment");
    const todayAppointmentSubPermission = usePermission("Today Appointment", { subModule: "Today Appointment" });
    const canView = todayAppointmentPermission.canView || todayAppointmentSubPermission.canView;
    const canAdd = todayAppointmentPermission.canAdd || todayAppointmentSubPermission.canAdd;

    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearch = useDebounce(searchTerm, 500);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
    const [selectedPatientView, setSelectedPatientView] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        if (!selectedPatientView) {
            setIsScrolled(false);
            return;
        }

        const handleScroll = () => {
            const scrollContainer = document.querySelector('[data-app-shell-scroll]');
            const scrollTop = scrollContainer ? scrollContainer.scrollTop : (window.scrollY || document.documentElement.scrollTop || 0);
            setIsScrolled(scrollTop > 20);
        };

        const scrollContainer = document.querySelector('[data-app-shell-scroll]');
        if (scrollContainer) {
            scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
        }
        window.addEventListener("scroll", handleScroll, { passive: true });

        handleScroll();

        return () => {
            if (scrollContainer) {
                scrollContainer.removeEventListener("scroll", handleScroll);
            }
            window.removeEventListener("scroll", handleScroll);
        };
    }, [selectedPatientView]);

    const getTodayYmd = () => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    };

    const getYesterdayYmd = () => {
        const date = new Date();
        date.setDate(date.getDate() - 1);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const dd = String(date.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    };

    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const filterRef = useRef<HTMLDivElement>(null);

    const handleFilterClick = () => setIsFilterOpen((prev) => !prev);
    const handleFilter = (newFromDate: string, newToDate: string) => {
        setFromDate(newFromDate);
        setToDate(newToDate);
        setCurrentPage(1);
        setIsFilterOpen(false);
    };
    const handleClear = () => {
        setFromDate("");
        setToDate("");
        setCurrentPage(1);
        setIsFilterOpen(false);
    };

    // Click outside handler for DateFilterDropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!filterRef.current) return;
            if (!filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const tabOptions2 = [
        { value: "Present", label: "Today Appointment" },
        { value: "Past", label: "Past Appointment" },
    ];
    const [activeTab2, setActiveTab2] = useState("Present");
    const [periodLockedWithSearch, setPeriodLockedWithSearch] = useState(false);
    const periodLockSearchSnapshotRef = useRef<string | null>(null);

    const isSearchingUi = searchTerm.trim() !== "";

    const handleTabChange2 = (value: string) => {
        setActiveTab2(value);
        setCurrentPage(1);
        setFromDate("");
        setToDate("");
        if (searchTerm.trim() !== "") {
            setPeriodLockedWithSearch(true);
            periodLockSearchSnapshotRef.current = debouncedSearch.trim();
        } else {
            setPeriodLockedWithSearch(false);
            periodLockSearchSnapshotRef.current = null;
        }
    };

    useEffect(() => {
        const curr = debouncedSearch.trim();
        if (curr === "") {
            setPeriodLockedWithSearch(false);
            periodLockSearchSnapshotRef.current = null;
            return;
        }
        const snap = periodLockSearchSnapshotRef.current;
        if (snap != null && curr !== snap) {
            setPeriodLockedWithSearch(false);
            periodLockSearchSnapshotRef.current = null;
        }
    }, [debouncedSearch]);

    const { data: referralData } = useGetPatientReferralForDoctorQuery(
        { registrationId: selectedItem?.registrationId || selectedItem?.appointmentId || 0 },
        { skip: true }
    );

    const { data: viewWalletResponse } = useGetPatientWalletBalanceQuery(
        selectedItem?.uhid || "",
        { skip: true }
    );

    const { data: patientFilesResponse } = useGetPatientFilesQuery(
        { uhid: selectedItem?.uhid || "" },
        { skip: !selectedItem?.uhid || !selectedPatientView, refetchOnMountOrArgChange: true }
    );

    const [getPresignedUrl] = useLazyGetPresignedUrlQuery();

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

    const authDoctorId = useAppSelector(selectUserId) || 3;
    const authBranchId = useAppSelector(selectUserBranchId) || 1;
    const roleCategoryType = useAppSelector(selectRoleCategoryType);
    const isSuperAdmin = roleCategoryType?.toLowerCase() === "superadmin";
    const userBranchName = useAppSelector(selectUserBranchName);

    const { data: medicinesData } = useGetAllMedicineByBranchListQuery({ branchId: authBranchId, search: "" });
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (medicinesData?.success && medicinesData.data) {
            dispatch(setMedicines(medicinesData.data));
        }
    }, [medicinesData, dispatch]);

    // Clear any stale IndexedDB voice chunks when loading the patient listing page
    useEffect(() => {
        if (authDoctorId) {
            openDatabase(authDoctorId).then(async (db) => {
                await clearAllChunksFromDB(db);
                console.log(`Cleared IndexedDB chunks for doctor ${authDoctorId} on patient listing page load`);
            }).catch((err) => {
                console.error("Error clearing DB on listing page mount:", err);
            });
        }
    }, [authDoctorId]);

    const appointmentDate = "";

    // Branch select filter state & query hook
    const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>("");
    const { data: branchesData, isLoading: isLoadingBranches } = useGetBranchesQuery(undefined, {
        skip: !isSuperAdmin,
    });

    const branchOptions = useMemo(() => {
        if (!branchesData?.data) return [];
        return branchesData.data.map((b: any) => {
            const typeLabel = b.type ? b.type.charAt(0).toUpperCase() + b.type.slice(1).toLowerCase() : "";
            const label = typeLabel ? `${b.name} (${typeLabel})` : b.name;
            return { value: b.id.toString(), label };
        });
    }, [branchesData]);

    const resolvedBranchName = useMemo(() => {
        if (isSuperAdmin) {
            const foundObj = branchesData?.data?.find((b: any) => b.id.toString() === selectedBranchFilter);
            if (foundObj?.name) return foundObj.name;
            const foundOpt = branchOptions.find((opt) => opt.value === selectedBranchFilter);
            if (foundOpt) return foundOpt.label;
        }
        return userBranchName || "";
    }, [isSuperAdmin, branchesData, branchOptions, selectedBranchFilter, userBranchName]);

    // Select default branch
    useEffect(() => {
        if (isSuperAdmin) {
            if (branchOptions.length > 0 && !selectedBranchFilter) {
                setSelectedBranchFilter(branchOptions[0].value);
            }
        } else {
            setSelectedBranchFilter(authBranchId.toString());
        }
    }, [isSuperAdmin, branchOptions, selectedBranchFilter, authBranchId]);

    // Doctor select filter state & query hook
    const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>("");
    const { data: doctorsData, isLoading: isLoadingDoctors } = useGetDoctorsByBranchQuery(
        { branchId: selectedBranchFilter },
        { skip: !isSuperAdmin || !selectedBranchFilter }
    );

    const doctorOptions = useMemo(() => {
        if (!doctorsData?.data) return [];
        return doctorsData.data.map((doc: any) => ({
            value: doc.id.toString(),
            label: doc.name,
        }));
    }, [doctorsData]);

    // Automatically select default doctor
    useEffect(() => {
        if (isSuperAdmin) {
            if (doctorOptions.length > 0) {
                const hasSelectedDoctor = doctorOptions.some((d) => d.value === selectedDoctorFilter);
                if (!hasSelectedDoctor) {
                    setSelectedDoctorFilter(doctorOptions[0].value);
                }
            } else {
                setSelectedDoctorFilter("");
            }
        } else {
            setSelectedDoctorFilter(authDoctorId.toString());
        }
    }, [isSuperAdmin, doctorOptions, selectedDoctorFilter, authDoctorId]);

    const queryParams = {
        appointmentDate,
        doctorId: selectedDoctorFilter,
        branchId: selectedBranchFilter,
        page: currentPage,
        limit: itemsPerPage,
        sortBy: "createdAt",
        order: "DESC" as const,
        search: debouncedSearch.trim() || undefined,
        startDate: fromDate || undefined,
        endDate: toDate || undefined,
        detailType: activeTab2 === "Past" ? "past" : "today",
    };

    const { data: apiResponse, isLoading, isError, refetch } = useGetAppointmentsOfDoctorQuery(
        queryParams,
        { skip: !selectedBranchFilter || !selectedDoctorFilter }
    );

    const isPageLoading = isLoading || (isSuperAdmin && (isLoadingBranches || isLoadingDoctors));

    const checkDrafts = useCallback(() => {
        if (typeof window === "undefined") return;
        const newDrafts = new Set<number>();

        if (apiResponse?.data && Array.isArray(apiResponse.data)) {
            apiResponse.data.forEach((item: any) => {
                const docId = item.doctorId || authDoctorId;
                const appId = item.appointmentId || item.id;
                const draft1 = localStorage.getItem(`draft_consultation_${authDoctorId}_${appId}`);
                const draft2 = docId ? localStorage.getItem(`draft_consultation_${docId}_${appId}`) : null;
                if (draft1 || draft2) {
                    newDrafts.add(Number(appId));
                }
            });
        }

        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith("draft_consultation_")) {
                    const parts = key.split("_");
                    const appId = Number(parts[parts.length - 1]);
                    if (!isNaN(appId) && appId > 0) {
                        newDrafts.add(appId);
                    }
                }
            }
        } catch (e) {
            // Ignore storage errors
        }

        setDraftAppointmentIds(newDrafts);
    }, [apiResponse, authDoctorId]);

    useEffect(() => {
        checkDrafts();

        const handleStorageOrDraftChange = () => {
            checkDrafts();
        };

        window.addEventListener("storage", handleStorageOrDraftChange);
        window.addEventListener("ongoing_consultations_changed", handleStorageOrDraftChange);
        window.addEventListener("draft_consultation_changed", handleStorageOrDraftChange);
        window.addEventListener("focus", handleStorageOrDraftChange);
        window.addEventListener("visibilitychange", handleStorageOrDraftChange);

        const interval = setInterval(checkDrafts, 1000);

        return () => {
            window.removeEventListener("storage", handleStorageOrDraftChange);
            window.removeEventListener("ongoing_consultations_changed", handleStorageOrDraftChange);
            window.removeEventListener("draft_consultation_changed", handleStorageOrDraftChange);
            window.removeEventListener("focus", handleStorageOrDraftChange);
            window.removeEventListener("visibilitychange", handleStorageOrDraftChange);
            clearInterval(interval);
        };
    }, [checkDrafts, selectedPatient]);

    const appointmentsList = apiResponse?.data || [];
    const totalItems = apiResponse?.total || 0;

    const filteredData = appointmentsList;

    const columns = [
        { label: "Sr no.", position: "first" as const },
        { label: "Patient Name" },
        { label: "Appointment" },
        // { label: "Patient Per." },
        // { label: "OPD ID" },
        // { label: "Doctor" },
        { label: "App Date/Time" },
        { label: "Age/Gender" },
        { label: "Contact" },
        // { label: "Type" },
        { label: "Location" },
        // { label: "Created At" },
        ...(canAdd ? [{ label: "Action", position: "last" as const }] : [])
    ];

    const rows = filteredData.map((item, index) => {
        const sr = (currentPage - 1) * itemsPerPage + index + 1;

        const isToday = (() => {
            if (!item.appointmentDate) return false;
            const appDateStr = item.appointmentDate.split('T')[0];
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, "0");
            const dd = String(today.getDate()).padStart(2, "0");
            const todayStr = `${yyyy}-${mm}-${dd}`;
            return appDateStr === todayStr;
        })();

        const rawPatientType = (
            item.patientType ||
            (item as any).patient_type ||
            (item as any).type ||
            ""
        ).toString().trim().toLowerCase();

        let displayPatientType = "OPD";
        if (rawPatientType === "ipd") displayPatientType = "IPD";
        else if (rawPatientType === "daycare") displayPatientType = "Daycare";
        else if (rawPatientType === "opd") displayPatientType = "OPD";

        const opdCell = (
            <div className="flex flex-col items-start justify-start text-left">
                <span className="text-gray-800 font-normal">
                    {item.appointmentId ? item.appointmentId : "N/A"}
                </span>
                <span className="text-xs text-gray-800 font-normal mt-0.5 uppercase">
                    {displayPatientType}
                </span>
            </div>
        );

        const appIdStr = String(item.appointmentId || (item as any).id || "").trim();
        const isAlreadyOpenInAnotherTab = ongoingInOtherTabs.has(appIdStr);
        const hasDraft = draftAppointmentIds.has(Number(item.appointmentId)) ||
            draftAppointmentIds.has(Number((item as any).id)) ||
            (appIdStr !== "" && draftAppointmentIds.has(Number(appIdStr)));

        const actions = (
            <div className="flex items-center gap-2">
                {item.isDoctorChecked ? (
                    <Tooltip content="Consultation Completed" position="top" delay={0}>
                        <span className="inline-block cursor-not-allowed">
                            <Button
                                variant="outline"
                                size="xsmall"
                                width={32}
                                className="!min-w-[32px] !p-0 flex items-center justify-center cursor-not-allowed !border-none !bg-transparent pointer-events-none"
                                disabled={true}
                            >
                                <Image src="/icons/CheckSuccessIcon.svg" alt="Consultation Completed" width={22} height={22} />
                            </Button>
                        </span>
                    </Tooltip>
                ) : isAlreadyOpenInAnotherTab ? (
                    hasDraft && activeTab2 !== "Past" ? (
                        <Tooltip content="This patient's consultation is already ongoing in another tab" position="top" delay={0}>
                            <span className="inline-block cursor-not-allowed">
                                <Button
                                    variant="outline"
                                    size="xsmall"
                                    width={32}
                                    className="!min-w-[32px] !p-0 flex items-center justify-center cursor-not-allowed opacity-50 !border-none !bg-transparent pointer-events-none"
                                    disabled={true}
                                >
                                    <Image src="/icons/EditIconBlack.svg" alt="Resume Draft" width={21} height={21} />
                                </Button>
                            </span>
                        </Tooltip>
                    ) : (
                        <Tooltip content="This patient's consultation is already ongoing in another tab" position="top" delay={0}>
                            <span className="inline-block cursor-not-allowed">
                                <Button
                                    variant="outline"
                                    size="xsmall"
                                    width={32}
                                    className="!min-w-[32px] !p-0 flex items-center justify-center cursor-not-allowed opacity-50 !border-none !bg-transparent pointer-events-none"
                                    disabled={true}
                                >
                                    <Image src="/icons/doctorIcon.svg" alt="Start Consultation" width={22} height={22} />
                                </Button>
                            </span>
                        </Tooltip>
                    )
                ) : (
                    hasDraft && activeTab2 !== "Past" ? (
                        <Tooltip content="Resume Draft Consultation" position="top" delay={0}>
                            <Button
                                variant="outline"
                                size="xsmall"
                                width={32}
                                className="!min-w-[32px] !p-0 flex items-center justify-center hover:scale-105 transition-transform !border-none !bg-transparent"
                                onClick={() => handleStartConsultation({ ...item, resumeDraft: true })}
                            >
                                <Image src="/icons/EditIconBlack.svg" alt="Resume Draft" width={21} height={21} />
                            </Button>
                        </Tooltip>
                    ) : (!isToday || activeTab2 === "Past") ? (
                        <Tooltip content="Start Consultation" position="top" delay={0}>
                            <span className="inline-block cursor-not-allowed">
                                <Button
                                    variant="outline"
                                    size="xsmall"
                                    width={32}
                                    className="!min-w-[32px] !p-0 flex items-center justify-center cursor-not-allowed opacity-50 !border-none !bg-transparent pointer-events-none"
                                    disabled={true}
                                >
                                    <Image src="/icons/doctorIcon.svg" alt="Start Consultation" width={22} height={22} />
                                </Button>
                            </span>
                        </Tooltip>
                    ) : (
                        <Tooltip content="Start Consultation" position="top" delay={0}>
                            <Button
                                variant="outline"
                                size="xsmall"
                                width={32}
                                className="!min-w-[32px] !p-0 flex items-center justify-center hover:scale-105 transition-transform !border-none !bg-transparent"
                                onClick={() => {
                                    if (typeof window !== "undefined") {
                                        localStorage.removeItem(`draft_consultation_${authDoctorId}_${item.appointmentId}`);
                                        if (item.doctorId) {
                                            localStorage.removeItem(`draft_consultation_${item.doctorId}_${item.appointmentId}`);
                                        }
                                        window.dispatchEvent(new CustomEvent("draft_consultation_changed"));
                                    }
                                    handleStartConsultation(item);
                                }}
                            >
                                <Image src="/icons/doctorIcon.svg" alt="Start Consultation" width={22} height={22} />
                            </Button>
                        </Tooltip>
                    )
                )}

                <Tooltip content="View Patient" position="top" delay={0}>
                    <Button
                        variant="outline"
                        size="xsmall"
                        width={32}
                        className="!min-w-[32px] !p-0 flex items-center justify-center hover:scale-105 transition-transform !border-none !bg-transparent"
                        onClick={() => { setSelectedItem(item); setSelectedPatientView(true); }}
                    >
                        <Image src="/icons/EyeOpenIcon.svg" alt="View Patient" width={22} height={22} />
                    </Button>
                </Tooltip>
            </div>
        );

        const patientNameText = item.patientTitle || item.patientName
            ? `${item.patientTitle || ""} ${item.patientName || ""}`.trim()
            : "N/A";
        const patientNameEl = (
            <div className="flex flex-col items-start text-left">
                <Tooltip content={patientNameText} position="top" delay={0}>
                    <div className="max-w-[200px] truncate inline-block align-top font-semibold">
                        {patientNameText}
                    </div>
                </Tooltip>
                {item.uhid && (
                    <span
                        className="text-xs text-[#0B8C00] font-medium cursor-pointer hover:underline mt-0.5"
                        onClick={() => {
                            if (canAdd) {
                                setSelectedItem(item);
                                setSelectedPatientView(true);
                            }
                        }}
                    >
                        {item.uhid}
                    </span>
                )}
            </div>
        );

        const doctorNameText = item.doctorName || "N/A";
        const doctorNameEl = (
            <Tooltip content={doctorNameText} position="top" delay={0}>
                <div className="max-w-[180px] truncate inline-block align-top">
                    {doctorNameText}
                </div>
            </Tooltip>
        );

        const appDateTimeEl = item.appointmentDate ? (
            <div className="flex flex-col items-start justify-start text-left">
                <span>{new Date(item.appointmentDate).toLocaleDateString('en-GB')}</span>
                {item.timeSlot && (
                    <span className="text-xs text-gray-500 font-normal mt-0.5">
                        {item.timeSlot}
                    </span>
                )}
            </div>
        ) : "N/A";

        const ageGenderCell = (
            <div className="flex flex-col items-start text-left text-[12px]">
                <div className="flex items-center gap-1">
                    <span className="text-[#0B8C00] font-medium">Age:</span>
                    <span className="text-gray-700 font-normal">{item.age ? `${item.age}Y` : "N/A"}</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-[#0B8C00] font-medium">Gender:</span>
                    <span className="text-gray-700 font-normal">
                        {item.gender ? (item.gender.charAt(0).toUpperCase() + item.gender.slice(1).toLowerCase()) : "N/A"}
                    </span>
                </div>
            </div>
        );

        return [
            sr,
            patientNameEl, opdCell,
            // "N/A",
            // item.appointmentId?.toString() || "N/A",
            // doctorNameEl,
            appDateTimeEl,
            ageGenderCell,
            maskPhoneNumber(item.contactNumber),
            // "OPD",
            (() => {
                const parts = [item.city, item.state].map(p => p?.trim()).filter(Boolean);
                return parts.length > 0 ? parts.join(", ") : "N/A";
            })(),
            // item.createdAt ? new Date(item.createdAt).toLocaleString('en-GB') : "N/A",
            ...(canAdd ? [actions] : [])
        ];
    });

    return (
        <AppShell pt={selectedPatient ? "pt-0" : "pt-0"} scrollable={!selectedPatientView && !selectedPatient}>
            {selectedPatient ? (
                <DoctorActivity
                    appointment={selectedPatient}
                    branchName={resolvedBranchName}
                    branchId={selectedBranchFilter}
                    onBack={() => setSelectedPatient(null)}
                />
            ) : (
                <div className="flex flex-col gap-4">
                    {/* Page Heading */}


                    {!canView ? (
                        <div className="rounded-[20px] border border-[#E3EEE1] bg-white px-6 py-10 text-center text-sm text-[#9CA3AF]">
                            You don&apos;t have permission to view today appointments.
                        </div>
                    ) : (

                        selectedPatientView ? (
                            (() => {
                                const appointmentItems = [
                                    { label: "UHID", value: selectedItem?.uhid || "N/A" },
                                    { label: "Appointment ID", value: selectedItem?.appointmentId?.toString() || "N/A" },
                                    { label: "Branch", value: resolvedBranchName || "N/A" },
                                    { label: "Appointment Date", value: selectedItem?.appointmentDate ? new Date(selectedItem.appointmentDate).toLocaleDateString('en-GB') : "N/A" },
                                    { label: "Time Slot", value: selectedItem?.timeSlot || "N/A" },
                                    {
                                        label: "Created Date",
                                        value: selectedItem?.createdAt
                                            ? (() => {
                                                const d = new Date(selectedItem.createdAt);
                                                if (isNaN(d.getTime())) return selectedItem.createdAt;
                                                const day = String(d.getDate()).padStart(2, "0");
                                                const month = String(d.getMonth() + 1).padStart(2, "0");
                                                const year = d.getFullYear();
                                                const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
                                                return `${day}/${month}/${year}, ${timeStr}`;
                                            })()
                                            : "N/A"
                                    },
                                    // { label: "Remark", value: selectedItem?.diagnosisRemarks || "N/A", multiline: true },
                                ];

                                const referralInfo = referralData?.data;
                                const referralItems = [
                                    { label: "Source", value: referralInfo?.source || selectedItem?.source || "N/A" },
                                    { label: "Sub Source", value: referralInfo?.sourceSelected || selectedItem?.subSource || "N/A" },
                                    { label: "Referral Doctor", value: referralInfo?.doctor?.name || selectedItem?.referralDoctor || "N/A" },
                                    { label: "Referral Name", value: referralInfo?.referralName || selectedItem?.referralName || "N/A" },
                                    { label: "Mobile", value: referralInfo?.referralMobile || selectedItem?.mobile || "N/A" },
                                ];

                                const patientName = selectedItem?.patientName
                                    ? `${selectedItem.patientTitle || ""} ${selectedItem.patientName}`.trim()
                                    : "N/A";
                                const patientSubtitle = `Contact Number: ${maskPhoneNumber(selectedItem?.contactNumber)} • Age : ${selectedItem?.age || "N/A"} Years • Gender : ${selectedItem?.gender ? (selectedItem.gender.charAt(0).toUpperCase() + selectedItem.gender.slice(1).toLowerCase()) : "N/A"}`;

                                const patientBadges = [
                                    ...(selectedItem?.bloodGroup && selectedItem?.bloodGroup !== "N/A" ? [{
                                        label: selectedItem.bloodGroup.toUpperCase(),
                                        className: "bg-[#F3F4F6] text-[#374151] font-bold text-xs px-2.5 py-1 rounded-full border border-[#E5E7EB]",
                                    }] : []),
                                    ...(selectedItem?.panelName && selectedItem?.panelName !== "N/A" ? [{
                                        label: selectedItem.panelName,
                                        className: "bg-[#E6F4EA] text-[#137333] font-[Inter] font-medium text-xs px-2.5 py-1 rounded-full border border-[#CEEAD6]",
                                    }] : []),
                                ];

                                const formatDiseaseTerm = (term: string) => {
                                    const clean = term.trim().toLowerCase();
                                    if (clean === "hiv") return "HIV";
                                    if (clean === "tb") return "TB";
                                    if (clean === "hepatitis") return "Hepatitis";
                                    if (clean === "normal") return "Normal";
                                    if (!clean) return "";
                                    return clean.charAt(0).toUpperCase() + clean.slice(1);
                                };

                                const rawCommunicable = selectedItem?.lastCommunicableDiseases || selectedItem?.communicableDiseases || selectedItem?.communicable_diseases;
                                let communicableDiseasesText = "Normal";
                                if (rawCommunicable) {
                                    let rawList: string[] = [];
                                    if (Array.isArray(rawCommunicable)) {
                                        rawList = rawCommunicable.map((s: any) => String(s).replace(/[{}"']/g, "").trim()).filter(Boolean);
                                    } else if (typeof rawCommunicable === "string" && rawCommunicable.trim()) {
                                        rawList = rawCommunicable.replace(/[{}"']/g, "").split(",").map((s: string) => s.trim()).filter(Boolean);
                                    }
                                    const formattedList = rawList.map(formatDiseaseTerm).filter(Boolean);
                                    if (formattedList.length > 0) {
                                        communicableDiseasesText = formattedList.join(", ");
                                    }
                                }

                                const patientInfoItems = [
                                    {
                                        iconSrc: "/icons/UserGear.svg",
                                        iconAlt: "Father/Husband",
                                        label: "Father’s/Husband’s Name",
                                        value: selectedItem?.guardianName
                                            ? `${selectedItem.guardianTitle || ""} ${selectedItem.guardianName}`.trim()
                                            : "N/A",
                                    },
                                    {
                                        iconSrc: "/icons/gendericon.svg",
                                        iconAlt: "Marital Status",
                                        label: "Marital Status",
                                        value: selectedItem?.maritalStatus
                                            ? (selectedItem.maritalStatus.charAt(0).toUpperCase() + selectedItem.maritalStatus.slice(1).toLowerCase())
                                            : "N/A",
                                    },
                                    {
                                        iconSrc: "/icons/patient_history.svg",
                                        iconAlt: "Communicable Disease",
                                        label: "Communicable Disease",
                                        value: communicableDiseasesText,
                                    },
                                    {
                                        iconSrc: "/icons/mapicon.svg",
                                        iconAlt: "Address",
                                        label: "Address",
                                        value: [
                                            selectedItem?.address,
                                            selectedItem?.addressLine1,
                                            selectedItem?.addressLine2,
                                            selectedItem?.area,
                                            selectedItem?.tehsil,
                                            selectedItem?.city,
                                            selectedItem?.state,
                                            selectedItem?.country,
                                            selectedItem?.pinCode
                                        ].filter(Boolean).join(", ") || "N/A",
                                    },
                                    {
                                        iconSrc: "/icons/adharcardicon.svg",
                                        iconAlt: "Aadhar Card Number",
                                        label: "Aadhar Card Number",
                                        value: selectedItem?.aadharCardNo || "N/A",
                                    },
                                ];

                                const vitalsItems = [
                                    { label: "Blood Pressure", value: selectedItem?.bloodPressure || "N/A", unit: "bp" },
                                    { label: "Sugar Level", value: selectedItem?.sugarLevel || "N/A", unit: "mg/dL" },
                                    { label: "Temperature", value: selectedItem?.temperature || "N/A", unit: "" },
                                    { label: "Heart Rate", value: selectedItem?.pulse || "N/A", unit: "bpm" },
                                ];

                                let addictionVal = "N/A";
                                if (selectedItem?.addictionType) {
                                    const types = Array.isArray(selectedItem.addictionType)
                                        ? selectedItem.addictionType.join(", ")
                                        : String(selectedItem.addictionType);
                                    const specify = selectedItem.addictionSpecify ? ` (${selectedItem.addictionSpecify})` : "";
                                    addictionVal = (types || specify) ? `${types}${specify}`.trim() : "N/A";
                                }

                                const getMedicalBoolValue = (val: any) => {
                                    if (val === true || String(val).toLowerCase() === "true" || val === 1 || val === "1") {
                                        return "Yes";
                                    }
                                    if (val === false || String(val).toLowerCase() === "false" || val === 0 || val === "0") {
                                        return "No";
                                    }
                                    return "N/A";
                                };

                                const getMedicalRemark = (val: any, remarks: string | null | undefined) => {
                                    if (val === true || String(val).toLowerCase() === "true" || val === 1 || val === "1") {
                                        return remarks && remarks.trim() ? remarks.trim() : undefined;
                                    }
                                    return undefined;
                                };

                                const getAllergiesSurgeriesValue = (val: string | null | undefined) => {
                                    if (!val || val.trim() === "" || val.toLowerCase() === "null") return "N/A";
                                    if (val.toLowerCase() === "no" || val.toLowerCase() === "none") return "No";
                                    return "Yes";
                                };

                                const getAllergiesSurgeriesRemark = (val: string | null | undefined) => {
                                    if (!val || val.trim() === "" || val.toLowerCase() === "null") return undefined;
                                    if (val.toLowerCase() === "no" || val.toLowerCase() === "none") return undefined;
                                    return val.trim();
                                };

                                const isPatientOld = (data: any): boolean => {
                                    if (!data) return false;
                                    const appTimeStr = data.appointmentCreatedAt || data.createdAt;
                                    const regTimeStr = data.registrationCreatedAt;
                                    if (!appTimeStr || !regTimeStr) return false;

                                    const appTime = new Date(appTimeStr).getTime();
                                    const regTime = new Date(regTimeStr).getTime();
                                    if (isNaN(appTime) || isNaN(regTime)) return false;

                                    const oneHourInMs = 60 * 60 * 1000;
                                    return (appTime - regTime) > oneHourInMs;
                                };

                                const isOldPatient = isPatientOld(selectedItem);
                                const shouldHideMedicalDetails = !isOldPatient && !selectedItem?.isDoctorChecked;

                                const getFinalDiag = (opdData: any): string => {
                                    if (!opdData) return "";
                                    let data = opdData;
                                    if (typeof data === "string") {
                                        try { data = JSON.parse(data); } catch {
                                            return (data.trim() && data.trim().toLowerCase() !== "null") ? data.trim() : "";
                                        }
                                    }
                                    if (typeof data === "object" && data !== null) {
                                        const val = data?.investigations?.diagnosis?.final || data?.diagnosis?.final || data?.finalDiagnosis || (typeof data?.investigations === "string" ? data.investigations : null);
                                        return (typeof val === "string" && val.trim() && val.trim().toLowerCase() !== "null") ? val.trim() : "";
                                    }
                                    return "";
                                };
                                const finalDiagnosisVal = getFinalDiag(selectedItem?.opdAssessmentData);
                                const hasFinalDiagnosis = Boolean(finalDiagnosisVal);

                                const diagnosisItems = hasFinalDiagnosis
                                    ? [{ label: "Final Diagnosis", value: finalDiagnosisVal, multiline: true }]
                                    : [
                                        { label: "Diagnosis", value: selectedItem?.diagnosisName || "N/A" },
                                        { label: "Sub-Diagnosis", value: selectedItem?.subDiagnosisName || "N/A" },
                                    ];

                                const rawMedicalItems = [
                                    ...diagnosisItems,
                                    { label: "Blood Group", value: selectedItem?.bloodGroup?.toUpperCase() || "N/A" },
                                    { label: "Allergies", value: getAllergiesSurgeriesValue(selectedItem?.allergies), remark: getAllergiesSurgeriesRemark(selectedItem?.allergies) },
                                    { label: "Surgeries", value: getAllergiesSurgeriesValue(selectedItem?.surgeries), remark: getAllergiesSurgeriesRemark(selectedItem?.surgeries) },
                                    { label: "Addiction", value: addictionVal },
                                    { label: "Height", value: selectedItem?.height || "N/A" },
                                    { label: "Weight", value: selectedItem?.weight || "N/A" },
                                    { label: "Diet Type", value: selectedItem?.dietType || "N/A", remark: selectedItem?.lastDayFullDiet || undefined },
                                    { label: "Diabetes", value: getMedicalBoolValue(selectedItem?.isDiabetes), remark: getMedicalRemark(selectedItem?.isDiabetes, selectedItem?.diabetesRemarks) },
                                    { label: "HTN(hypertension)", value: getMedicalBoolValue(selectedItem?.isHypertension), remark: getMedicalRemark(selectedItem?.isHypertension, selectedItem?.hypertensionRemarks) },
                                    { label: "Coronary Artery Disease", value: getMedicalBoolValue(selectedItem?.isCad), remark: getMedicalRemark(selectedItem?.isCad, selectedItem?.cadRemarks) },
                                    { label: "Thyroid", value: getMedicalBoolValue(selectedItem?.isThyroid), remark: getMedicalRemark(selectedItem?.isThyroid, selectedItem?.thyroidRemarks) },
                                    ...(selectedItem?.gender?.toLowerCase() === "female" ? [{ label: "Menstrual", value: getMedicalBoolValue(selectedItem?.isMenstrual), remark: getMedicalRemark(selectedItem?.isMenstrual, selectedItem?.menstrualRemarks) }] : []),
                                    // { label: "Addiction", value:    "N/A" },
                                    { label: "Remark", value: selectedItem?.diagnosisRemarks || "N/A", multiline: true },
                                ];

                                const medicalItems = shouldHideMedicalDetails
                                    ? rawMedicalItems.filter(item => !["Allergies", "Surgeries", "Diabetes", "HTN(hypertension)", "Coronary Artery Disease", "Thyroid"].includes(item.label))
                                    : rawMedicalItems;

                                const otherInfoItems = [
                                    { label: "Patient Type", value: selectedItem?.panelName || "N/A" },
                                    { label: "Patient Sub Type", value: "N/A" },
                                    { label: "Beneficiary ID", value: selectedItem?.benificiaryId || "N/A" },
                                    { label: "Insurance Company", value: selectedItem?.insuranceCompany || "N/A" },
                                    { label: "Ayush Covered", value: "N/A" },
                                ];

                                const viewWalletInfo = viewWalletResponse?.data;
                                const walletRemainingAmount = viewWalletInfo?.walletExists && viewWalletInfo.availableBalance !== undefined
                                    ? `Rs. ${viewWalletInfo.availableBalance}`
                                    : "N/A";

                                const walletDetails = viewWalletInfo?.walletExists
                                    ? [
                                        { label: "Current Balance", value: `Rs. ${viewWalletInfo.currentBalance ?? 0}` },
                                        { label: "Hold Amount", value: `Rs. ${viewWalletInfo.holdAmount ?? 0}` },
                                        { label: "Total Credit", value: `Rs. ${viewWalletInfo.totalCredit ?? 0}` },
                                        { label: "Total Debit", value: `Rs. ${viewWalletInfo.totalDebit ?? 0}` },
                                        { label: "Last Updated", value: viewWalletInfo.lastUpdated ? new Date(viewWalletInfo.lastUpdated).toLocaleDateString('en-GB') : "N/A" },
                                    ]
                                    : [
                                        { label: "Package", value: "N/A" },
                                        { label: "Start Date", value: "N/A" },
                                        { label: "End Date", value: "N/A" },
                                    ];

                                const iafItems = [
                                    { srNo: 1, date: "01-Jun-2026" },
                                    { srNo: 2, date: "02-Jun-2026" },
                                ];

                                return (
                                    <div className="flex flex-col h-[calc(100vh-100px)] overflow-hidden gap-2">
                                        {/* Fixed Header Bar (Non-scrolling) */}
                                        <div className={`shrink-0 transition-all duration-600 ease-[cubic-bezier(0.25,1,0.5,1)] ${!isScrolled ? 'pt-2 pb-2' : 'pt-2 pb-0'}`}>
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="relative flex-1 min-h-[48px] flex items-center overflow-hidden">
                                                    <div
                                                        className={`w-full transition-all duration-600 ease-[cubic-bezier(0.25,1,0.5,1)] [will-change:opacity,transform] ${isScrolled
                                                            ? "opacity-100 translate-y-0 relative pointer-events-auto"
                                                            : "opacity-0 -translate-y-1.5 absolute inset-x-0 pointer-events-none"
                                                            }`}
                                                    >
                                                        <PatientHeaderSummaryCard
                                                            patientName={patientName}
                                                            patientSubtitle={patientSubtitle}
                                                            patientBadges={patientBadges}
                                                            patientInfoItems={patientInfoItems}
                                                            vitalsItems={vitalsItems}
                                                            communicableDiseases={selectedItem?.lastCommunicableDiseases || selectedItem?.communicableDiseases || selectedItem?.communicable_diseases}
                                                            bloodGroup={selectedItem?.bloodGroup || selectedItem?.blood_group || selectedItem?.jsBloodGroup}
                                                        />
                                                    </div>

                                                    <div
                                                        className={`transition-all duration-600 ease-[cubic-bezier(0.25,1,0.5,1)] [will-change:opacity,transform] ${!isScrolled
                                                            ? "opacity-100 translate-y-0 relative pointer-events-auto"
                                                            : "opacity-0 translate-y-1.5 absolute inset-x-0 pointer-events-none"
                                                            }`}
                                                    >
                                                        <PageHeading title="View" />
                                                    </div>
                                                </div>

                                                <div className="pr-4 shrink-0">
                                                    <BackToPreviousPageButton
                                                        text="Back"
                                                        width={90}
                                                        height={36}
                                                        onClick={() => {
                                                            setSelectedPatientView(false);
                                                            setSelectedItem(null);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Inner Scrollable Area for ViewAppointment */}
                                        <div
                                            className="flex-1 overflow-y-auto pr-1 pb-6 custom-scroll"
                                            onScroll={(e) => {
                                                const scrollTop = e.currentTarget.scrollTop;
                                                setIsScrolled(scrollTop > 20);
                                            }}
                                        >
                                            <ViewAppointment
                                                appointmentId={selectedItem?.appointmentId}
                                                uhid={selectedItem?.uhid}
                                                appointmentItems={appointmentItems}
                                                walletRemainingAmount={walletRemainingAmount}
                                                walletDetails={walletDetails}
                                                referralItems={referralItems}
                                                showIAF={true}
                                                iafItems={iafItems}
                                                onIAFViewClick={(item) => alert(`View IAF for Date: ${item.date}`)}
                                                patientName={patientName}
                                                patientSubtitle={patientSubtitle}
                                                patientBadges={patientBadges}
                                                patientInfoItems={patientInfoItems}
                                                showVitals={true}
                                                vitalsItems={vitalsItems}
                                                timelineItems={[]}
                                                healthCardNo={selectedItem?.jsHealthCardNo || "N/A"}
                                                medicalItems={medicalItems}
                                                fileItems={patientFilesItems}
                                                otherInfoItems={otherInfoItems}
                                                showCommunicableDisease={false}
                                                communicableDiseases={selectedItem?.lastCommunicableDiseases || selectedItem?.communicableDiseases || selectedItem?.communicable_diseases}
                                                hideReferralCard={true}
                                                hideWalletCard={true}
                                                hideHealthCardPreview={true}
                                                hideContactNumber={true}
                                                hideAddress={true}
                                                hideAadharCard={true}
                                                hideBloodGroup={true}
                                                showPatientDetailsVitalsCombined={true}
                                            />
                                        </div>
                                    </div>
                                );
                            })()
                        ) : (<>
                            <div className="flex items-start justify-between  gap-2 pt-3">
                                <PageHeading title={activeTab2 === "Past" ? "Past Appointment" : "Today Appointment"} />

                            </div>
                            <div className="w-[460px] shrink-0">
                                <Tabs
                                    options={tabOptions2}
                                    value={isSearchingUi && !periodLockedWithSearch ? "" : activeTab2}
                                    onChange={handleTabChange2}
                                />
                            </div>
                            <div className="w-full rounded-[20px] border border-[#E3EEE1] p-2">
                                <TableListingCard
                                    sections={[
                                        {
                                            id: "doctor-patients-list",
                                            title: "",

                                            titleRightContent: (
                                                <div className="flex gap-2">
                                                    {/* Branch Filter */}
                                                    {isSuperAdmin && (
                                                        <div style={{ width: "280px" }}>
                                                            <FormSelectField
                                                                label=""
                                                                hideLabel
                                                                options={branchOptions}
                                                                value={selectedBranchFilter}
                                                                onChange={(value) => {
                                                                    setSelectedBranchFilter(Array.isArray(value) ? value[0] : value || "");
                                                                    setCurrentPage(1);
                                                                }}
                                                                placeholder={isLoadingBranches ? "Loading branches..." : "Select Branch"}
                                                                mode="single"
                                                                background="normal"
                                                                width={280}
                                                                disabled={isLoadingBranches}
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Doctor Filter */}
                                                    {isSuperAdmin && (
                                                        <div style={{ width: "280px" }}>
                                                            <FormSelectField
                                                                label=""
                                                                hideLabel
                                                                options={doctorOptions}
                                                                value={selectedDoctorFilter}
                                                                onChange={(value) => {
                                                                    setSelectedDoctorFilter(Array.isArray(value) ? value[0] : value || "");
                                                                    setCurrentPage(1);
                                                                }}
                                                                placeholder={isLoadingDoctors ? "Loading doctors..." : "Select Doctor"}
                                                                mode="single"
                                                                background="normal"
                                                                width={280}
                                                                disabled={isLoadingDoctors || !selectedBranchFilter}
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Search Input */}
                                                    <div style={{ width: "280px" }}>
                                                        <TableSearchInput
                                                            value={searchTerm}
                                                            onChange={(val) => {
                                                                setSearchTerm(val);
                                                                setCurrentPage(1);
                                                            }}
                                                            placeholder="Search Here..."
                                                        />
                                                    </div>
                                                    {activeTab2 === "Past" && (
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
                                                    )}
                                                    <RefreshButton onClick={() => {
                                                        setSearchTerm("");
                                                        setCurrentPage(1);
                                                        setFromDate(getTodayYmd());
                                                        setToDate(getTodayYmd());
                                                        setActiveTab2("Present");
                                                        setPeriodLockedWithSearch(false);
                                                        periodLockSearchSnapshotRef.current = null;
                                                        if (isSuperAdmin) {
                                                            setSelectedBranchFilter(branchOptions[0]?.value || "");
                                                            setSelectedDoctorFilter("");
                                                        } else {
                                                            setSelectedBranchFilter(authBranchId.toString());
                                                            setSelectedDoctorFilter(authDoctorId.toString());
                                                        }
                                                        refetch();
                                                    }} />
                                                </div>
                                            ),
                                            columns,
                                            rows,
                                            isLoading: isPageLoading,
                                            isError,
                                            errorMessage: "Facing server API error",
                                            emptyMessage: "No appointments found",
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
                        </>
                        )
                    )}
                </div>
            )}
        </AppShell>
    );
}

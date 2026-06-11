"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
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
    MessageDialog
} from "@/components/ui";
import DoctorActivity from "./doctorActivity";
import { useAppSelector } from "@/store/hooks";
import { selectUserId, selectUserBranchId, selectRoleCategoryType, selectUserBranchName } from "@/store/slices/authSlice";
import { useGetAppointmentsOfDoctorQuery, useGetPatientReferralForDoctorQuery, useGetPatientWalletBalanceQuery } from "@/store/api/doctorApi";
import { useGetBranchesQuery } from "@/store/api/settingsApi";
import { useGetDoctorsByBranchQuery } from "@/store/api/registrationApi";
import { useDebounce } from "@/hooks/useDebounce";




export default function DoctorListingPage() {
    const router = useRouter();

    const handleStartConsultation = (item: any) => {
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

    const { data: referralData } = useGetPatientReferralForDoctorQuery(
        { registrationId: selectedItem?.registrationId || selectedItem?.appointmentId || 0 },
        { skip: !selectedItem }
    );

    const { data: viewWalletResponse } = useGetPatientWalletBalanceQuery(
        selectedItem?.uhid || "",
        { skip: !selectedItem }
    );

    const authDoctorId = useAppSelector(selectUserId) || 3;
    const authBranchId = useAppSelector(selectUserBranchId) || 1;
    const roleCategoryType = useAppSelector(selectRoleCategoryType);
    const isSuperAdmin = roleCategoryType?.toLowerCase() === "superadmin";
    const userBranchName = useAppSelector(selectUserBranchName);
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
    };

    const { data: apiResponse, isLoading, isError, refetch } = useGetAppointmentsOfDoctorQuery(
        queryParams,
        { skip: !selectedBranchFilter || !selectedDoctorFilter }
    );

    const isPageLoading = isLoading || (isSuperAdmin && (isLoadingBranches || isLoadingDoctors));

    const appointmentsList = apiResponse?.data || [];
    const totalItems = apiResponse?.total || 0;

    const filteredData = appointmentsList;

    const columns = [
        { label: "Sr no.", position: "first" as const },
        { label: "Patient" },
        { label: "UHID" },
        // { label: "Patient Per." },
        { label: "OPD ID" },
        { label: "Doctor" },
        { label: "App Date/Time" },
        { label: "Gender" },
        { label: "Age" },
        { label: "Contact" },
        { label: "Type" },
        { label: "City" },
        { label: "State" },
        { label: "Created At" },
        ...(canAdd ? [{ label: "Action", position: "last" as const }] : [])
    ];

    const rows = filteredData.map((item, index) => {
        const sr = (currentPage - 1) * itemsPerPage + index + 1;

        const uhid = (
            <span className="text-[#0B8C00] font-medium cursor-pointer hover:underline" onClick={() => {
                if (canAdd) {
                    setSelectedItem(item); setSelectedPatientView(true);
                    // handleStartConsultation(item);
                }
            }}>
                {item.uhid || "N/A"}
            </span>
        );

        const actions = (
            <div className="flex items-center gap-2">
                <Button
                    variant="primary"
                    size="xsmall"
                    className="whitespace-nowrap"
                    onClick={() => { setSelectedItem(item); setSelectedPatientView(true); }}
                >
                    View Patient
                </Button>
                {item.isDoctorChecked ? (
                    <Button
                        variant="outline"
                        size="xsmall"
                        className="whitespace-nowrap cursor-not-allowed opacity-100"
                        disabled={true}
                    >
                        Completed
                    </Button>
                ) : (
                    <Button
                        variant="outline"
                        size="xsmall"
                        className="whitespace-nowrap"
                        onClick={() => handleStartConsultation(item)}
                    >
                        Start Consultation
                    </Button>
                )}
            </div>
        );

        return [
            sr,
            `${item.patientTitle || item.patientName
                ? `${item.patientTitle || ""} ${item.patientName || ""}`.trim()
                : "N/A"}`, uhid,
            // "N/A",
            item.appointmentId?.toString() || "N/A",
            item.doctorName || "N/A",
            item.appointmentDate ? new Date(item.appointmentDate).toLocaleDateString('en-GB') + " " + (item.timeSlot || "") : "N/A",
            item.gender ? (item.gender.charAt(0).toUpperCase() + item.gender.slice(1).toLowerCase()) : "N/A",
            item.age || "N/A",
            item.contactNumber || "N/A",
            "OPD",
            item.city || "N/A",
            item.state || "N/A",
            item.createdAt ? new Date(item.createdAt).toLocaleString('en-GB') : "N/A",
            ...(canAdd ? [actions] : [])
        ];
    });

    if (selectedPatient) {
        return (
            <DoctorActivity
                appointment={selectedPatient}
                branchName={resolvedBranchName}
                branchId={selectedBranchFilter}
                onBack={() => setSelectedPatient(null)}
            />
        );
    }

    return (
        <AppShell>
            <div className="flex flex-col gap-6">
                {/* Page Heading */}


                {!canView ? (
                    <div className="rounded-[20px] border border-[#E3EEE1] bg-white px-6 py-10 text-center text-sm text-[#9CA3AF]">
                        You don&apos;t have permission to view today appointments.
                    </div>
                ) : (

                    selectedPatientView ? (<div className="flex flex-col gap-6">
                        <div className="flex items-start justify-between">
                            <PageHeading title="View" />
                            <BackToPreviousPageButton
                                text="Back"
                                onClick={() => {
                                    setSelectedPatientView(false);
                                    setSelectedItem(null);
                                }}
                            />
                        </div>
                        {(() => {
                            const appointmentItems = [
                                { label: "UHID", value: selectedItem?.uhid || "N/A" },
                                { label: "OPD ID", value: selectedItem?.appointmentId?.toString() || "N/A" },
                                { label: "Branch", value: resolvedBranchName || "N/A" },
                                { label: "Doctor", value: selectedItem?.doctorName || "N/A" },
                                { label: "Doctor OPD Fee", value: selectedItem?.doctorFee !== undefined ? `Rs. ${selectedItem.doctorFee}` : "N/A" },
                                { label: "Appointment Date", value: selectedItem?.appointmentDate ? new Date(selectedItem.appointmentDate).toLocaleDateString('en-GB') : "N/A" },
                                { label: "Time Slot", value: selectedItem?.timeSlot || "N/A" },
                                { label: "Created Date", value: selectedItem?.createdAt ? new Date(selectedItem.createdAt).toLocaleString() : "N/A" },
                                { label: "Remark", value: selectedItem?.diagnosisRemarks || "N/A", multiline: true },
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
                            const patientSubtitle = `Contact Number: ${selectedItem?.contactNumber || "N/A"} • WhatsApp: ${selectedItem?.whatsappNumber || "N/A"} • Age : ${selectedItem?.age || "N/A"} Years • Gender : ${selectedItem?.gender ? (selectedItem.gender.charAt(0).toUpperCase() + selectedItem.gender.slice(1).toLowerCase()) : "N/A"}`;

                            const patientBadges = [
                                ...(selectedItem?.bloodGroup && selectedItem?.bloodGroup !== "N/A" ? [{
                                    label: selectedItem.bloodGroup.toUpperCase(),
                                    className: "inline-flex h-[30px] min-w-[76px] me-2 items-center justify-center rounded-[30px] border px-4 text-xs font-semibold border-[#F6776E]/24 bg-[#F6776E0D] text-[#F6776E]"
                                }] : []),
                                ...(selectedItem?.panelName ? [{
                                    label: selectedItem.panelName,
                                    className: "inline-flex h-[30px] min-w-[76px] items-center justify-center rounded-[30px] border px-4 text-xs font-semibold border-[#0B8C00]/20 bg-white text-[#0B8C00]"
                                }] : [])
                            ];

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

                            const medicalItems = [
                                { label: "Diagnosis", value: selectedItem?.diagnosisName || "N/A" },
                                { label: "Disease", value: selectedItem?.subDiagnosisName || "N/A" },
                                { label: "Blood Group", value: selectedItem?.bloodGroup?.toUpperCase() || "N/A" },
                                { label: "Allergies", value: selectedItem?.allergies || "N/A" },
                                { label: "Surgeries", value: selectedItem?.surgeries || "N/A" },
                                { label: "Addiction", value: addictionVal },
                                { label: "Height", value: selectedItem?.height || "N/A" },
                                { label: "Weight", value: selectedItem?.weight || "N/A" },
                                { label: "Diet Type", value: selectedItem?.dietType || "N/A" },
                                { label: "Remark", value: selectedItem?.diagnosisRemarks || "N/A", multiline: true },
                            ];

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
                                    fileItems={[]}
                                    otherInfoItems={otherInfoItems}
                                />
                            );
                        })()}
                    </div>) : (<>
                        <div className="flex items-start justify-between">
                            <PageHeading title="Today Appointment" />
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
                                                <RefreshButton onClick={() => {
                                                    setSearchTerm("");
                                                    setCurrentPage(1);
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


        </AppShell>
    );
}

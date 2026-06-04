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
} from "@/components/ui";
import DoctorActivity from "./doctorActivity";
import { useAppSelector } from "@/store/hooks";
import { selectUserId, selectUserBranchId, selectRoleCategoryType, selectUserBranchName } from "@/store/slices/authSlice";
import { useGetAppointmentsOfDoctorQuery } from "@/store/api/doctorApi";
import { useGetBranchesQuery } from "@/store/api/settingsApi";
import { useGetDoctorsByBranchQuery } from "@/store/api/registrationApi";
import { useDebounce } from "@/hooks/useDebounce";



export default function DoctorListingPage() {
    const router = useRouter();
    const todayAppointmentPermission = usePermission("Today Appointment");
    const todayAppointmentSubPermission = usePermission("Today Appointment", { subModule: "Today Appointment" });
    const canView = todayAppointmentPermission.canView || todayAppointmentSubPermission.canView;
    const canAdd = todayAppointmentPermission.canAdd || todayAppointmentSubPermission.canAdd;

    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearch = useDebounce(searchTerm, 500);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selectedPatient, setSelectedPatient] = useState<any | null>(null);

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
        { label: "Patient Per." },
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
                    setSelectedPatient(item);
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
                    disabled={true}
                // onClick={() => setSelectedPatient(item)}
                >
                    View Patient
                </Button>
                <Button
                    variant="outline"
                    size="xsmall"
                    className="whitespace-nowrap"
                    onClick={() => setSelectedPatient(item)}
                >
                    Start Consultation
                </Button>
            </div>
        );

        return [
            sr,
            item.patientName || "N/A",
            uhid,
            "N/A",
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
                onBack={() => setSelectedPatient(null)}
            />
        );
    }

    return (
        <AppShell>
            <div className="flex flex-col gap-6">
                {/* Page Heading */}
                <div className="flex items-start justify-between">
                    <PageHeading title="Today Appointment" />
                </div>

                {!canView ? (
                    <div className="rounded-[20px] border border-[#E3EEE1] bg-white px-6 py-10 text-center text-sm text-[#9CA3AF]">
                        You don&apos;t have permission to view today appointments.
                    </div>
                ) : (
                    /* Table Listing Card */
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
                                            <RefreshButton onClick={() => refetch()} />
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
                )}
            </div>
        </AppShell>
    );
}

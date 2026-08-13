"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
  Button,
  Dialog,
  FormInputField,
  FormSelectField,
  Table,
  TableBody,
  TableData,
  TableHead,
  TableHeader,
  TableRow,
  TableSearchInput,
  Pagination,
  RefreshButton,
  RazarPayCard,
  MessageDialog,
  Tooltip,
} from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import DateFilterDropdown from "@/components/registration/DateFilterDropdown";
import type { SelectOption } from "@/components/ui/FormSelectField";
import {
  useGetRazorpayPosMachinesQuery,
  useCreateRazorpayPosMachineMutation,
  useUpdateRazorpayPosMachineMutation,
  useGetRazorpayPosPaymentLogsQuery,
} from "@/store/api/settingsApi";
import { useGetUserDropdownListQuery } from "@/store/api/commonApi";
import { useDebounce } from "@/hooks/useDebounce";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { usePermission } from "@/hooks/usePermission";

type RazarPayPosMachine = {
  id: number;
  roleName: string;
  /** Display value for the card subtitle, e.g. "[pos_user_001]". */
  username: string;
  /** Raw Razorpay username, used to prefill the edit form. */
  razarpayUsername: string;
  branchId: number;
  branch: string;
  password: string;
  razarpayTid: string;
  razarpayDeviceId: string;
  assignUser: string;
  assignUserIds: number[];
  createdAt: string;
  status: "Active" | "Inactive";
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMachineStatus(status: string): "Active" | "Inactive" {
  return status?.toLowerCase() === "active" ? "Active" : "Inactive";
}

function formatPaymentLogStatus(status: string): "SUCCESS" | "FAILED" {
  return status?.toLowerCase() === "success" ? "SUCCESS" : "FAILED";
}

type PaymentLog = {
  id: number;
  branch: string;
  patientName: string;
  patientUhid: string;
  amount: number;
  txnId: string;
  machineAlignedTo: string;
  role: string;
  paymentType: string;
  status: "SUCCESS" | "FAILED";
  createdDate: string;
};

const statusOptions: SelectOption[] = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
];

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export default function RazarpayPosMachinePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [showPaymentLogTable, setShowPaymentLogTable] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<RazarPayPosMachine | null>(null);
  const [viewMachineDialogOpen, setViewMachineDialogOpen] = useState(false);
  const [viewingMachine, setViewingMachine] = useState<RazarPayPosMachine | null>(null);
  const usersPermission = usePermission("settings", { subModule: "razorpay-pos-machine"});
  // console.log("usersPermission", usersPermission);  
  const canView = usersPermission.canView;
  const canAdd = usersPermission.canAdd;
  const canEdit = usersPermission.canEdit;
  // const canDownload = usersPermission.canDownload;

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const {
    selectedBranchFilter,
    setSelectedBranchFilter,
    branchFilterOptions,
    isLoadingBranches,
    isBranchFilterDisabled,
    filterBranchId,
  } = useBranchFilter({
    persistSuperAdminSelectionKey: "hiims-settings-razorpay-pos-machine-branch",
    excludeAllBranches: true,
    defaultToFirstBranch: true,
  });

 const {
  data: machinesData,
  isLoading: isLoadingMachines,
  isFetching: isFetchingMachines,
  error: machinesError,
  refetch: refetchMachines,
} = useGetRazorpayPosMachinesQuery(
  {
    page: currentPage,
    limit: itemsPerPage,
    search: debouncedSearchTerm || undefined,
    ...(filterBranchId != null && Number.isFinite(filterBranchId)
      ? { branchId: filterBranchId }
      : {}),
  },
  {
    skip: filterBranchId == null || !Number.isFinite(filterBranchId),
    refetchOnMountOrArgChange: true,
  }
);

  const machines: RazarPayPosMachine[] = useMemo(() => {
    const rows = machinesData?.data ?? [];
    return rows.map((item) => {
      const assignUser = item.users?.length ? item.users.map((u) => u.name).join(", ") : "-";
      return {
        id: item.id,
        roleName: assignUser,
        username: `[${item.username}]`,
        razarpayUsername: item.username,
        branchId: item.branchId,
        branch: item.branchName,
        password: item.password,
        razarpayTid: item.razarpayTid,
        razarpayDeviceId: item.deviceId,
        assignUser,
        assignUserIds: item.users?.map((u) => u.id) ?? [],
        createdAt: formatDateTime(item.createdAt),
        status: formatMachineStatus(item.status),
      };
    });
  }, [machinesData]);

  const totalMachines = machinesData?.total ?? 0;
  const [formValues, setFormValues] = useState({
    branch: "",
    userIds: [] as number[],
    razarpayUsername: "",
    razarpayPassword: "",
    razarpayTid: "",
    razarpayDeviceId: "",
    status: "Active" as "Active" | "Inactive",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showRazarpayPassword, setShowRazarpayPassword] = useState(false);
  const [showViewPassword, setShowViewPassword] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
  const [apiErrorMessage, setApiErrorMessage] = useState("");

  const [createRazorpayPosMachine, { isLoading: isCreatingMachine }] = useCreateRazorpayPosMachineMutation();
  const [updateRazorpayPosMachine, { isLoading: isUpdatingMachine }] = useUpdateRazorpayPosMachineMutation();

  const formBranchId = useMemo(() => {
    const n = parseInt(formValues.branch, 10);
    return Number.isFinite(n) && n >= 1 ? n : undefined;
  }, [formValues.branch]);

  const { data: formUsersData, isLoading: isLoadingFormUsers } = useGetUserDropdownListQuery(
    formBranchId != null ? { branchId: formBranchId } : undefined,
    { skip: !(addDialogOpen || editDialogOpen) || formBranchId == null }
  );

  // console.log("formUsersData",formUsersData)

  const formUserOptions: SelectOption[] = useMemo(() => {
    const rows = formUsersData?.data ?? [];
    return rows.map((u) => ({ value: String(u.id), label: u.name }));
  }, [formUsersData]);

  // Payment Log states
  const [paymentLogSearchTerm, setPaymentLogSearchTerm] = useState("");
  const [paymentLogFromDate, setPaymentLogFromDate] = useState("");
  const [paymentLogToDate, setPaymentLogToDate] = useState("");
  const [paymentLogCurrentPage, setPaymentLogCurrentPage] = useState(1);
  const [paymentLogItemsPerPage, setPaymentLogItemsPerPage] = useState(10);
  const [paymentLogSortField, setPaymentLogSortField] = useState<string>("");
  const [paymentLogSortOrder, setPaymentLogSortOrder] = useState<"ASC" | "DESC">("ASC");
  const [viewDetailsDialogOpen, setViewDetailsDialogOpen] = useState(false);
  const [selectedPaymentLog, setSelectedPaymentLog] = useState<PaymentLog | null>(null);
  const [isPaymentLogFilterOpen, setIsPaymentLogFilterOpen] = useState(false);
  const paymentLogFilterRef = useRef<HTMLDivElement>(null);

  const handlePaymentLogFilterClick = () => setIsPaymentLogFilterOpen((prev) => !prev);
  const handlePaymentLogFilter = (newFromDate: string, newToDate: string) => {
    setPaymentLogFromDate(newFromDate);
    setPaymentLogToDate(newToDate);
    setPaymentLogCurrentPage(1);
    setIsPaymentLogFilterOpen(false);
  };
  const handlePaymentLogFilterClear = () => {
    setPaymentLogFromDate("");
    setPaymentLogToDate("");
    setPaymentLogCurrentPage(1);
    setIsPaymentLogFilterOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!paymentLogFilterRef.current) return;
      if (!paymentLogFilterRef.current.contains(event.target as Node)) {
        setIsPaymentLogFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handlePaymentLogSort = (field: string) => {
    if (paymentLogSortField === field) {
      setPaymentLogSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"));
    } else {
      setPaymentLogSortField(field);
      setPaymentLogSortOrder("ASC");
    }
    setPaymentLogCurrentPage(1);
  };

  const getPaymentLogSortDirection = (field: string): "asc" | "desc" | null => {
    if (paymentLogSortField !== field) return null;
    return paymentLogSortOrder === "ASC" ? "asc" : "desc";
  };

  const debouncedPaymentLogSearchTerm = useDebounce(paymentLogSearchTerm, 500);

  const {
    selectedBranchFilter: paymentLogBranchFilter,
    setSelectedBranchFilter: setPaymentLogBranchFilter,
    branchFilterOptions: paymentLogBranchFilterOptions,
    isLoadingBranches: isLoadingPaymentLogBranches,
    isBranchFilterDisabled: isPaymentLogBranchFilterDisabled,
    filterBranchId: paymentLogFilterBranchId,
  } = useBranchFilter({
    persistSuperAdminSelectionKey: "hiims-settings-razorpay-payment-log-branch",
    excludeAllBranches: true,
    defaultToFirstBranch: true,
  });

  const {
    data: paymentLogsData,
    isLoading: isLoadingPaymentLogs,
    isFetching: isFetchingPaymentLogs,
    error: paymentLogsError,
    refetch: refetchPaymentLogs,
  } = useGetRazorpayPosPaymentLogsQuery(
    {
      page: paymentLogCurrentPage,
      limit: paymentLogItemsPerPage,
      search: debouncedPaymentLogSearchTerm || undefined,
      fromDate: paymentLogFromDate || undefined,
      toDate: paymentLogToDate || undefined,
      sort: paymentLogSortField || undefined,
      order: paymentLogSortField ? paymentLogSortOrder : undefined,
      ...(paymentLogFilterBranchId != null && Number.isFinite(paymentLogFilterBranchId)
        ? { branchId: paymentLogFilterBranchId }
        : {}),
    },
    { skip: !showPaymentLogTable }
  );

  const paymentLogs: PaymentLog[] = useMemo(() => {
    const rows = paymentLogsData?.data ?? [];
    return rows.map((item) => ({
      id: item.id,
      branch: item.branchName,
      patientName: [item.patientTitle, item.patientName].filter(Boolean).join(" "),
      patientUhid: item.patientUhid,
      amount: Number(item.amount) || 0,
      txnId: item.transactionId,
      machineAlignedTo: item.machineAssignedUserName || "-",
      role: item.roleName || "-",
      paymentType: item.paymentType,
      status: formatPaymentLogStatus(item.paymentStatus),
      createdDate: formatDateTime(item.createdAt),
    }));
  }, [paymentLogsData]);

  const totalPaymentLogs = paymentLogsData?.total ?? 0;

  const handleAdd = () => {
    setSelectedMachine(null);
    setFormValues({
      branch: "",
      userIds: [],
      razarpayUsername: "",
      razarpayPassword: "",
      razarpayTid: "",
      razarpayDeviceId: "",
      status: "Active",
    });
    setFormErrors({});
    setAddDialogOpen(true);
  };

  const handleEdit = (machine: RazarPayPosMachine) => {
    setSelectedMachine(machine);
    setFormValues({
      branch: String(machine.branchId),
      userIds: machine.assignUserIds,
      razarpayUsername: machine.razarpayUsername,
      razarpayPassword: machine.password,
      razarpayTid: machine.razarpayTid,
      razarpayDeviceId: machine.razarpayDeviceId,
      status: machine.status,
    });
    setFormErrors({});
    setEditDialogOpen(true);
  };

  const handleView = (machine: RazarPayPosMachine) => {
    setViewingMachine(machine);
    setViewMachineDialogOpen(true);
  };

  const handleRefresh = () => {
    void refetchMachines();
  };

  const handleRefreshPaymentLog = () => {
    void refetchPaymentLogs();
  };

  const handlePaymentLogHistory = () => {
    setShowPaymentLogTable(true);
  };

  const handleBackToCards = () => {
    setShowPaymentLogTable(false);
    setPaymentLogSearchTerm("");
    setPaymentLogBranchFilter("");
    setPaymentLogFromDate("");
    setPaymentLogToDate("");
    setPaymentLogCurrentPage(1);
  };

  const handleViewDetails = (log: PaymentLog) => {
    setSelectedPaymentLog(log);
    setViewDetailsDialogOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formValues.branch) errors.branch = "Branch is required";
    if (formValues.userIds.length === 0) errors.userIds = "Assign User is required";
    if (!formValues.razarpayUsername) errors.razarpayUsername = "Razorpay Username is required";
    if (!formValues.razarpayPassword) {
      errors.razarpayPassword = "Razorpay Password is required";
    } else if (!PASSWORD_REGEX.test(formValues.razarpayPassword)) {
      errors.razarpayPassword =
        "Password must be at least 8 characters and include uppercase, lowercase, number, and special character";
    }
    if (!formValues.razarpayTid) errors.razarpayTid = "Razorpay Tid is required";
    if (!formValues.razarpayDeviceId) errors.razarpayDeviceId = "Razorpay DeviceId is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setSelectedMachine(null);
    setFormValues({
      branch: "",
      userIds: [],
      razarpayUsername: "",
      razarpayPassword: "",
      razarpayTid: "",
      razarpayDeviceId: "",
      status: "Active",
    });
    setFormErrors({});
  };

  const extractApiErrorMessage = (error: unknown, fallback: string): string => {
    const err = error as {
      data?: { message?: string | string[]; error?: string };
      error?: string;
      message?: string;
    };
    if (err?.data?.message != null) {
      const m = err.data.message;
      return Array.isArray(m) ? m.map(String).join(" ") : String(m);
    }
    if (err?.data?.error) return err.data.error;
    if (err?.error) return err.error;
    if (err?.message) return err.message;
    return fallback;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;

    const payload = {
      branchId: formBranchId as number,
      userIds: formValues.userIds,
      username: formValues.razarpayUsername,
      password: formValues.razarpayPassword,
      razarpayTid: formValues.razarpayTid,
      deviceId: formValues.razarpayDeviceId,
      status: formValues.status.toLowerCase() as "active" | "inactive",
    };

    if (selectedMachine) {
      try {
        const result = await updateRazorpayPosMachine({ id: selectedMachine.id, ...payload }).unwrap();

        setEditDialogOpen(false);
        resetForm();
        setSuccessMessage(result?.message || "Razorpay POS machine updated successfully");
        setShowSuccessDialog(true);
      } catch (error: unknown) {
        console.error("Failed to update Razorpay POS machine:", error);
        setApiErrorMessage(
          extractApiErrorMessage(error, "Failed to update Razorpay POS machine. Please try again.")
        );
        setShowApiErrorDialog(true);
      }
      return;
    }

    try {
      const result = await createRazorpayPosMachine(payload).unwrap();

      setAddDialogOpen(false);
      resetForm();
      setSuccessMessage(result?.message || "Razorpay POS machine created successfully");
      setShowSuccessDialog(true);
    } catch (error: unknown) {
      console.error("Failed to create Razorpay POS machine:", error);
      setApiErrorMessage(
        extractApiErrorMessage(error, "Failed to create Razorpay POS machine. Please try again.")
      );
      setShowApiErrorDialog(true);
    }
  };

  const getStatusBadgeClass = (status: "SUCCESS" | "FAILED") => {
    switch (status) {
      case "SUCCESS":
        return "border-[#0B8C00]/20 bg-[#0B8C000D] text-[#0B8C00]";
      case "FAILED":
        return "border-[#F6776E]/24 bg-[#F6776E0D] text-[#F6776E]";
      default:
        return "";
    }
  };

  if (!canView) {
    return (
      <AppShell>
        <div className="space-y-8">
          <div className="flex items-start justify-between">
            <PageHeading title="Razorpay Pos Machine" />
          </div>

          <ListBorder as="section" className="px-4 py-4">
            <div className="rounded-[20px] border border-[#E3EEE1] bg-white px-6 py-10 text-center text-sm text-[#9CA3AF]">
              You don&apos;t have permission to view Razorpay POS machines.
            </div>
          </ListBorder>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <PageHeading title={showPaymentLogTable ? "Payment History" : "Razorpay Pos Machine"} />
        </div>

        <ListBorder as="section" className="px-4 py-4">
          <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <h2 className="text-lg font-semibold leading-[120%] text-[#434956]">
                
              </h2>

              <div className="flex flex-nowrap lg:flex-wrap items-center gap-3">
                {showPaymentLogTable ? (
                  <>
                    <div className="w-[300px]">
                      <FormSelectField
                        label=""
                        hideLabel
                        options={paymentLogBranchFilterOptions}
                        value={paymentLogBranchFilter}
                        onChange={(value) => {
                          setPaymentLogBranchFilter(Array.isArray(value) ? value[0] : value || "");
                          setPaymentLogCurrentPage(1);
                        }}
                        placeholder={isLoadingPaymentLogBranches ? "Loading branches..." : "Select Branch"}
                        mode="single"
                        background="normal"
                        disabled={isPaymentLogBranchFilterDisabled || isLoadingPaymentLogBranches}
                      />
                    </div>

                    <div className="relative" ref={paymentLogFilterRef}>
                      <Button type="button" variant="outline" onClick={handlePaymentLogFilterClick}>
                        <div className="flex items-center justify-center gap-2">
                          <Image src="/icons/FilterIcon.svg" alt="Filter" width={16} height={16} />
                          <span>Filter</span>
                        </div>
                      </Button>
                      {isPaymentLogFilterOpen && (
                        <div className="absolute right-0 top-full mt-2 z-50">
                          <DateFilterDropdown
                            onFilter={handlePaymentLogFilter}
                            onClear={handlePaymentLogFilterClear}
                            initialFromDate={paymentLogFromDate}
                            initialToDate={paymentLogToDate}
                          />
                        </div>
                      )}
                    </div>

                    <div className="w-[300px]">
                      <TableSearchInput
                        value={paymentLogSearchTerm}
                        onChange={(value) => {
                          setPaymentLogSearchTerm(value);
                          setPaymentLogCurrentPage(1);
                        }}
                        placeholder="Search Here..."
                      />
                    </div>

                    <div className="w-full lg:w-auto">
                      <button
                        type="button"
                        className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[#0B8C00]/20"
                        onClick={handleBackToCards}
                      >
                        Back
                      </button>
                    </div>

                    <div className="w-full lg:w-auto">
                      <RefreshButton onClick={handleRefreshPaymentLog} className="cursor-pointer" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-[300px]">
                      <FormSelectField
                        label=""
                        hideLabel
                        options={branchFilterOptions}
                        value={selectedBranchFilter}
                        onChange={(value) => {
                          setSelectedBranchFilter(Array.isArray(value) ? value[0] : value || "");
                          setCurrentPage(1);
                        }}
                        placeholder={isLoadingBranches ? "Loading branches..." : "Select Branch"}
                        mode="single"
                        background="normal"
                        disabled={isBranchFilterDisabled || isLoadingBranches}
                      />
                    </div>

                    <div className="flex-1 min-w-[240px] lg:max-w-[300px]">
                      <TableSearchInput
                        value={searchTerm}
                        onChange={(value) => {
                          setSearchTerm(value);
                          setCurrentPage(1);
                        }}
                        placeholder="Search Here..."
                      />
                    </div>

                    {canAdd && (
                      <div className="w-full lg:w-auto">
                        <button
                          type="button"
                          className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[#0B8C00]/20"
                          onClick={handleAdd}
                        >
                          <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                          <span className="text-hide">Add Razorpay Pos Machine</span>
                        </button>
                      </div>
                    )}

                    <div className="w-full lg:w-auto">
                      <button
                        type="button"
                        className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[#0B8C00]/20"
                        onClick={handlePaymentLogHistory}
                      >
                        Payment Log History
                      </button>
                    </div>

                    <div className="w-full lg:w-auto">
                      <RefreshButton onClick={handleRefresh} className="cursor-pointer" />
                    </div>
                  </>
                )}
              </div>
            </div>

            {showPaymentLogTable ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead position="first">Sr no.</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead
                        sortable
                        sortDirection={getPaymentLogSortDirection("patientName")}
                        onSort={() => handlePaymentLogSort("patientName")}
                      >
                        Patient Name
                      </TableHead>
                      <TableHead>Patient Uhid</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>TxnId</TableHead>
                      <TableHead>Machine Aligned To</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Payment Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created Date</TableHead>
                      <TableHead position="last">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingPaymentLogs || isFetchingPaymentLogs ? (
                      <TableRow>
                        <TableData colSpan={13} className="py-12 text-center text-sm text-[#9CA3AF]">
                          Loading...
                        </TableData>
                      </TableRow>
                    ) : paymentLogsError ? (
                      <TableRow>
                        <TableData colSpan={13} className="py-12 text-center text-sm text-[#DC2626]">
                          {extractApiErrorMessage(paymentLogsError, "Failed to load payment logs.")}
                        </TableData>
                      </TableRow>
                    ) : paymentLogs.length === 0 ? (
                      <TableRow>
                        <TableData colSpan={13} className="py-12 text-center text-sm text-[#9CA3AF]">
                          No payment logs found
                        </TableData>
                      </TableRow>
                    ) : (
                      paymentLogs.map((log, index) => (
                        <TableRow key={log.id}>
                          <TableData position="first">
                            {(paymentLogCurrentPage - 1) * paymentLogItemsPerPage + index + 1}
                          </TableData>
                          <TableData>{log.branch}</TableData>
                          <TableData>
                            <Tooltip content={log.patientName} position="top" delay={0}>
                              <div className="max-w-[150px] truncate">{log.patientName}</div>
                            </Tooltip>
                          </TableData>
                          <TableData>{log.patientUhid}</TableData>
                          <TableData>₹{log.amount}</TableData>
                          <TableData>{log.txnId}</TableData>
                          <TableData>{log.machineAlignedTo}</TableData>
                          <TableData>{log.role}</TableData>
                          <TableData>{log.paymentType}</TableData>
                          <TableData>
                            <span
                              className={`inline-flex h-[28px] min-w-[86px] items-center justify-center bg-[#ffff] rounded-[30px] border px-5 text-xs font-medium leading-[120%] ${getStatusBadgeClass(
                                log.status
                              )}`}
                            >
                              {log.status}
                            </span>
                          </TableData>
                          <TableData>{log.createdDate}</TableData>
                          <TableData position="last">
                            <button
                              type="button"
                              className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                              aria-label="View details"
                              onClick={() => handleViewDetails(log)}
                            >
                              <Image src="/icons/ViewEyeIcon.svg" alt="View" width={20} height={20} />
                            </button>
                          </TableData>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {!isLoadingPaymentLogs && totalPaymentLogs > 0 && (
                  <Pagination
                    currentPage={paymentLogCurrentPage}
                    totalItems={totalPaymentLogs}
                    itemsPerPage={paymentLogItemsPerPage}
                    onPageChange={setPaymentLogCurrentPage}
                    onItemsPerPageChange={(items) => {
                      setPaymentLogItemsPerPage(items);
                      setPaymentLogCurrentPage(1);
                    }}
                    itemsPerPageOptions={[10, 20, 50, 100]}
                  />
                )}
              </>
            ) : (
              <>
                {isLoadingMachines || isFetchingMachines ? (
                  <div className="py-12 text-center text-sm text-[#9CA3AF]">Loading...</div>
                ) : machinesError ? (
                  <div className="py-12 text-center text-sm text-[#DC2626]">
                    {extractApiErrorMessage(machinesError, "Failed to load Razorpay POS machines.")}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {machines.map((machine, index) => (
                        <RazarPayCard
                          key={machine.id}
                          index={(currentPage - 1) * itemsPerPage + index + 1}
                          roleName={machine.roleName}
                          username={machine.username}
                          branch={machine.branch}
                          password={machine.password}
                          razarpayTid={machine.razarpayTid}
                          razarpayDeviceId={machine.razarpayDeviceId}
                          assignUser={machine.assignUser}
                          createdAt={machine.createdAt}
                          status={machine.status}
                          onEdit={() => handleEdit(machine)}
                          onView={() => handleView(machine)}
                          canView={canView}
                          canEdit={canEdit}
                        />
                      ))}
                    </div>

                    {machines.length === 0 && (
                      <div className="py-12 text-center text-sm text-[#9CA3AF]">No machines found</div>
                    )}
                  </>
                )}

                {!isLoadingMachines && totalMachines > 0 && (
                  <Pagination
                    currentPage={currentPage}
                    totalItems={totalMachines}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={(items) => {
                      setItemsPerPage(items);
                      setCurrentPage(1);
                    }}
                    itemsPerPageOptions={[10, 20, 50, 100]}
                  />
                )}
              </>
            )}
          </div>
        </ListBorder>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog
        open={addDialogOpen || editDialogOpen}
        onClose={() => {
          setAddDialogOpen(false);
          setEditDialogOpen(false);
          resetForm();
        }}
        title={selectedMachine ? "Edit Razorpay Pos Machine" : "Add Razorpay Pos Machine"}
        width={949}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FormSelectField
                label="Branch *"
                value={formValues.branch}
                onChange={(value) => {
                  const next = Array.isArray(value) ? value[0] : value;
                  setFormValues((prev) => ({ ...prev, branch: next || "", userIds: [] }));
                  setFormErrors((prev) => ({ ...prev, branch: "" }));
                }}
                options={branchFilterOptions}
                placeholder={isLoadingBranches ? "Loading branches..." : "Select Branch"}
                mode="single"
                background="white"
                disabled={isLoadingBranches}
                error={formErrors.branch}
              />
            </div>

            <div>
              <FormSelectField
                label="Assign User *"
                value={formValues.userIds.length ? String(formValues.userIds[0]) : ""}
                onChange={(value) => {
                  const next = Array.isArray(value) ? value[0] : value;
                  setFormValues((prev) => ({ ...prev, userIds: next ? [Number(next)] : [] }));
                  setFormErrors((prev) => ({ ...prev, userIds: "" }));
                }}
                options={formUserOptions}
                placeholder={
                  !formValues.branch
                    ? "Select branch first"
                    : isLoadingFormUsers
                      ? "Loading users..."
                      : "Select user"
                }
                mode="single"
                background="white"
                disabled={!formValues.branch || isLoadingFormUsers}
                error={formErrors.userIds}
              />
            </div>

            <div>
              <FormInputField
                label="Razorpay Username *"
                value={formValues.razarpayUsername}
                onChange={(event) => {
                  setFormValues((prev) => ({ ...prev, razarpayUsername: event.target.value }));
                  setFormErrors((prev) => ({ ...prev, razarpayUsername: "" }));
                }}
                height={44}
                placeholder="Razorpay Username"
                error={formErrors.razarpayUsername}
              />
            </div>

            <div>
              <FormInputField
                label="Razorpay Password *"
                value={formValues.razarpayPassword}
                onChange={(event) => {
                  const value = event.target.value;
                  setFormValues((prev) => ({ ...prev, razarpayPassword: value }));
                  setFormErrors((prev) => ({
                    ...prev,
                    razarpayPassword:
                      value && !PASSWORD_REGEX.test(value)
                        ? "Password must be at least 8 characters and include uppercase, lowercase, number, and special character"
                        : "",
                  }));
                }}
                height={44}
                placeholder="Razorpay Password"
                type={showRazarpayPassword ? "text" : "password"}
                error={formErrors.razarpayPassword}
                suffix={
                  <button
                    type="button"
                    onClick={() => setShowRazarpayPassword((prev) => !prev)}
                    className="flex h-5 w-5 items-center justify-center"
                  >
                    <Image
                      src={showRazarpayPassword ? "/icons/openEye.svg" : "/icons/closeEye.svg"}
                      alt={showRazarpayPassword ? "Hide password" : "Show password"}
                      width={20}
                      height={20}
                    />
                  </button>
                }
              />
            </div>

            <div>
              <FormInputField
                label="Razorpay Tid *"
                value={formValues.razarpayTid}
                onChange={(event) => {
                  setFormValues((prev) => ({ ...prev, razarpayTid: event.target.value.toUpperCase() }));
                  setFormErrors((prev) => ({ ...prev, razarpayTid: "" }));
                }}
                height={44}
                placeholder="Razorpay Tid"
                error={formErrors.razarpayTid}
              />
            </div>

            <div>
              <FormInputField
                label="Razorpay DeviceId *"
                value={formValues.razarpayDeviceId}
                onChange={(event) => {
                  setFormValues((prev) => ({ ...prev, razarpayDeviceId: event.target.value.toUpperCase() }));
                  setFormErrors((prev) => ({ ...prev, razarpayDeviceId: "" }));
                }}
                height={44}
                placeholder="Razorpay DeviceId"
                error={formErrors.razarpayDeviceId}
              />
            </div>

            <div>
              <FormSelectField
                label="Status *"
                value={formValues.status}
                onChange={(value) => {
                  const next = Array.isArray(value) ? value[0] : value;
                  setFormValues((prev) => ({
                    ...prev,
                    status: (next || "Active") as "Active" | "Inactive",
                  }));
                }}
                options={statusOptions}
                placeholder="Status"
                mode="single"
                background="white"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              variant="primary"
              isLoading={isCreatingMachine || isUpdatingMachine}
              disabled={isCreatingMachine || isUpdatingMachine}
            >
              {/* {selectedMachine ? "Update Razarpay Pos Machine" : "Add Razarpay Pos Machine"} */}
              {selectedMachine ? "Update" : "Submit"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isCreatingMachine || isUpdatingMachine}
              onClick={() => {
                setAddDialogOpen(false);
                setEditDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Dialog>

      {/* View Razarpay Pos Machine Dialog */}
      <Dialog
        open={viewMachineDialogOpen}
        onClose={() => {
          setViewMachineDialogOpen(false);
          setViewingMachine(null);
          setShowViewPassword(false);
        }}
        title="Razarpay Pos Machine Details"
        width={686}
      >
        {viewingMachine && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium leading-[120%] text-[#7B8089]">Branch</p>
                <p className="mt-1 text-sm font-semibold leading-[120%] text-[#262D3B]">{viewingMachine.branch}</p>
              </div>
              <div>
                <p className="text-xs font-medium leading-[120%] text-[#7B8089]">Assign User</p>
                <p className="mt-1 text-sm font-semibold leading-[120%] text-[#262D3B]">{viewingMachine.assignUser}</p>
              </div>
              <div>
                <p className="text-xs font-medium leading-[120%] text-[#7B8089]">Razorpay Username</p>
                <p className="mt-1 text-sm font-semibold leading-[120%] text-[#262D3B]">
                  {viewingMachine.razarpayUsername}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium leading-[120%] text-[#7B8089]">Razorpay Password</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-semibold leading-[120%] text-[#262D3B]">
                  {showViewPassword ? viewingMachine.password : "••••••••"}
                  <button
                    type="button"
                    onClick={() => setShowViewPassword((prev) => !prev)}
                    className="flex h-5 w-5 items-center justify-center"
                  >
                    <Image
                      src={showViewPassword ? "/icons/openEye.svg" : "/icons/closeEye.svg"}
                      alt={showViewPassword ? "Hide password" : "Show password"}
                      width={16}
                      height={16}
                    />
                  </button>
                </p>
              </div>
              <div>
                <p className="text-xs font-medium leading-[120%] text-[#7B8089]">Razorpay Tid</p>
                <p className="mt-1 text-sm font-semibold leading-[120%] text-[#262D3B]">{viewingMachine.razarpayTid}</p>
              </div>
              <div>
                <p className="text-xs font-medium leading-[120%] text-[#7B8089]">Razorpay DeviceId</p>
                <p className="mt-1 text-sm font-semibold leading-[120%] text-[#262D3B]">
                  {viewingMachine.razarpayDeviceId}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium leading-[120%] text-[#7B8089]">Status</p>
                {/* <p className="mt-1">
                  <span
                    className={`inline-flex h-[30px] min-w-[76px] items-center justify-center rounded-[30px] border px-5 text-xs font-medium leading-[120%] ${
                      viewingMachine.status === "Active"
                        ? "border-[#0B8C00]/20 bg-[#0B8C000D] text-[#0B8C00]"
                        : "border-[#F6776E]/24 bg-[#F6776E0D] text-[#F6776E]"
                    }`}
                  >
                    {viewingMachine.status}
                  </span>
                </p> */}
                <p className="mt-1 text-sm font-semibold leading-[120%] text-[#262D3B]">{viewingMachine.status}</p>
              </div>
              <div>
                <p className="text-xs font-medium leading-[120%] text-[#7B8089]">Created At</p>
                <p className="mt-1 text-sm font-semibold leading-[120%] text-[#262D3B]">{viewingMachine.createdAt}</p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setViewMachineDialogOpen(false);
                  setViewingMachine(null);
                  setShowViewPassword(false);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* View Details Dialog */}
      <Dialog
        open={viewDetailsDialogOpen}
        onClose={() => {
          setViewDetailsDialogOpen(false);
          setSelectedPaymentLog(null);
        }}
        title="View Details"
        width={686}
      >
        {selectedPaymentLog && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium leading-[120%] text-[#7B8089]">Branch</p>
                <p className="mt-1 text-sm font-semibold leading-[120%] text-[#262D3B]">{selectedPaymentLog.branch}</p>
              </div>
              <div>
                <p className="text-xs font-medium leading-[120%] text-[#7B8089]">Patient Name</p>
                <p className="mt-1 text-sm font-semibold leading-[120%] text-[#262D3B]">{selectedPaymentLog.patientName}</p>
              </div>
              <div>
                <p className="text-xs font-medium leading-[120%] text-[#7B8089]">Patient Uhid</p>
                <p className="mt-1 text-sm font-semibold leading-[120%] text-[#262D3B]">{selectedPaymentLog.patientUhid}</p>
              </div>
              <div>
                <p className="text-xs font-medium leading-[120%] text-[#7B8089]">Amount</p>
                <p className="mt-1 text-sm font-semibold leading-[120%] text-[#262D3B]">₹{selectedPaymentLog.amount}</p>
              </div>
              <div>
                <p className="text-xs font-medium leading-[120%] text-[#7B8089]">Transaction ID</p>
                <p className="mt-1 text-sm font-semibold leading-[120%] text-[#262D3B]">{selectedPaymentLog.txnId}</p>
              </div>
              <div>
                <p className="text-xs font-medium leading-[120%] text-[#7B8089]">Transaction Date</p>
                <p className="mt-1 text-sm font-semibold leading-[120%] text-[#262D3B]">
                  {selectedPaymentLog.createdDate}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium leading-[120%] text-[#7B8089]">Role</p>
                <p className="mt-1 text-sm font-semibold leading-[120%] text-[#262D3B]">{selectedPaymentLog.role}</p>
              </div>
              <div>
                <p className="text-xs font-medium leading-[120%] text-[#7B8089]">Payment Type</p>
                <p className="mt-1 text-sm font-semibold leading-[120%] text-[#262D3B]">{selectedPaymentLog.paymentType}</p>
              </div>
              <div>
                <p className="text-xs font-medium leading-[120%] text-[#7B8089]">Status</p>
                {/* <p className="mt-1">
                  <span
                    className={`inline-flex h-[30px] min-w-[86px] items-center justify-center rounded-[30px] border px-5 text-xs font-medium leading-[120%] ${getStatusBadgeClass(
                      selectedPaymentLog.status
                    )}`}
                  >
                    {selectedPaymentLog.status}
                  </span>
                </p> */}
                 <p className="mt-1 text-sm font-semibold leading-[120%] text-[#262D3B]">{selectedPaymentLog.status}</p>
              </div>
              <div>
                <p className="text-xs font-medium leading-[120%] text-[#7B8089]">Machine Aligned To</p>
                <p className="mt-1 text-sm font-semibold leading-[120%] text-[#262D3B]">{selectedPaymentLog.machineAlignedTo}</p>
              </div>
            </div>

            <div className="border-t border-[#E9F3E6] pt-6">
              <h3 className="mb-4 text-base font-semibold leading-[120%] text-[#262D3B]">Bank Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium leading-[120%] text-[#7B8089]">Card Type</p>
                  <p className="mt-1 text-sm font-semibold leading-[120%] text-[#262D3B]">DEBIT</p>
                </div>
                <div>
                  <p className="text-xs font-medium leading-[120%] text-[#7B8089]">Card Brand</p>
                  <p className="mt-1 text-sm font-semibold leading-[120%] text-[#262D3B]">RUPAY</p>
                </div>
                <div>
                  <p className="text-xs font-medium leading-[120%] text-[#7B8089]">Bank</p>
                  <p className="mt-1 text-sm font-semibold leading-[120%] text-[#262D3B]">Yes</p>
                </div>
                <div>
                  <p className="text-xs font-medium leading-[120%] text-[#7B8089]">Payer Name</p>
                  <p className="mt-1 text-sm font-semibold leading-[120%] text-[#262D3B]">ANKUR KUMAR</p>
                </div>
                <div>
                  <p className="text-xs font-medium leading-[120%] text-[#7B8089]">Payment Mode</p>
                  <p className="mt-1 text-sm font-semibold leading-[120%] text-[#262D3B]">CARD</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setViewDetailsDialogOpen(false);
                  setSelectedPaymentLog(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Success Dialog */}
      <MessageDialog
        open={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        icon="/icons/SuccessCheck.svg"
        iconBgColor="#E8F5E9"
        message={successMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => {
          setShowSuccessDialog(false);
          refetchMachines();
        }}
      />

      {/* API Error Dialog */}
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


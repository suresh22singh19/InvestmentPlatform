"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
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
  DatePicker,
  RefreshButton,
  RazarPayCard,
} from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import type { SelectOption } from "@/components/ui/FormSelectField";

type RazarPayPosMachine = {
  id: number;
  roleName: string;
  username: string;
  branch: string;
  password: string;
  razarpayTid: string;
  razarpayDeviceId: string;
  assignUser: string;
  createdAt: string;
  status: "Active" | "Inactive";
};

type PaymentLog = {
  id: number;
  srNo: number;
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
  date: string;
};

const branchOptions: SelectOption[] = [
  { value: "ambala", label: "Ambala" },
  { value: "murad-nagar", label: "MURAD NAGAR UP" },
  { value: "vaishali", label: "Vaishali UP" },
  { value: "sonipat", label: "Sonipat" },
  { value: "shastri-nagar", label: "Shastri Nagar Delhi" },
  { value: "rdc-ghaziabad", label: "RDC Ghaziabad UP" },
  { value: "prashant-vihar", label: "Prashant Vihar" },
  { value: "panchkula", label: "HIIMS PANCHKULA" },
  { value: "camp-jeena", label: "Camp Jeena" },
];

const groupOptions: SelectOption[] = [
  { value: "group1", label: "Group 1" },
  { value: "group2", label: "Group 2" },
  { value: "group3", label: "Group 3" },
];

const assignUserOptions: SelectOption[] = [
  { value: "manish", label: "Manish" },
  { value: "harsh", label: "Harsh" },
  { value: "admin", label: "Admin" },
];

const smsTypeOptions: SelectOption[] = [
  { value: "sms1", label: "SMS Type 1" },
  { value: "sms2", label: "SMS Type 2" },
];

const statusOptions: SelectOption[] = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
];

const initialRazarPayMachines: RazarPayPosMachine[] = [
  {
    id: 1,
    roleName: "[Role Name]",
    username: "[Username]",
    branch: "Branch Chandigarh",
    password: "123456Q",
    razarpayTid: "2745850A",
    razarpayDeviceId: "1495039627",
    assignUser: "Manish",
    createdAt: "06-05-2025 10:18 AM",
    status: "Active",
  },
  {
    id: 2,
    roleName: "[Role Name]",
    username: "[Username]",
    branch: "Branch Chandigarh",
    password: "123456Q",
    razarpayTid: "2745850A",
    razarpayDeviceId: "1495039627",
    assignUser: "Manish",
    createdAt: "06-05-2025 10:18 AM",
    status: "Active",
  },
  {
    id: 3,
    roleName: "[Role Name]",
    username: "[Username]",
    branch: "Branch Chandigarh",
    password: "123456Q",
    razarpayTid: "2745850A",
    razarpayDeviceId: "1495039627",
    assignUser: "Manish",
    createdAt: "06-05-2025 10:18 AM",
    status: "Active",
  },
  {
    id: 4,
    roleName: "[Role Name]",
    username: "[Username]",
    branch: "Branch Chandigarh",
    password: "123456Q",
    razarpayTid: "2745850A",
    razarpayDeviceId: "1495039627",
    assignUser: "Manish",
    createdAt: "06-05-2025 10:18 AM",
    status: "Active",
  },
  {
    id: 5,
    roleName: "[Role Name]",
    username: "[Username]",
    branch: "Branch Chandigarh",
    password: "123456Q",
    razarpayTid: "2745850A",
    razarpayDeviceId: "1495039627",
    assignUser: "Manish",
    createdAt: "06-05-2025 10:18 AM",
    status: "Active",
  },
  {
    id: 6,
    roleName: "[Role Name]",
    username: "[Username]",
    branch: "Branch Chandigarh",
    password: "123456Q",
    razarpayTid: "2745850A",
    razarpayDeviceId: "1495039627",
    assignUser: "Manish",
    createdAt: "06-05-2025 10:18 AM",
    status: "Active",
  },
];

const initialPaymentLogs: PaymentLog[] = [
  {
    id: 1,
    srNo: 1,
    branch: "MURAD NAGAR UP",
    patientName: "Mr xyz",
    patientUhid: "JSKL41712025",
    amount: 300,
    txnId: "251028111219265E680316810",
    machineAlignedTo: "Harsh",
    role: "Accountant",
    paymentType: "service_order_fee",
    status: "SUCCESS",
    createdDate: "11-05-2023",
    date: "11-05-2023",
  },
  {
    id: 2,
    srNo: 2,
    branch: "MURAD NAGAR UP",
    patientName: "Mr xyz",
    patientUhid: "JSKL41712025",
    amount: 300,
    txnId: "251028111219265E680316810",
    machineAlignedTo: "Harsh",
    role: "Clinic Receptionist",
    paymentType: "medicine_order_fee",
    status: "SUCCESS",
    createdDate: "11-05-2023",
    date: "11-05-2023",
  },
  {
    id: 3,
    srNo: 3,
    branch: "MURAD NAGAR UP",
    patientName: "Mr xyz",
    patientUhid: "JSKL41712025",
    amount: 300,
    txnId: "251028111219265E680316810",
    machineAlignedTo: "Harsh",
    role: "Clinic Receptionist",
    paymentType: "medicine_order_fee",
    status: "FAILED",
    createdDate: "11-05-2023",
    date: "11-05-2023",
  },
  {
    id: 4,
    srNo: 4,
    branch: "MURAD NAGAR UP",
    patientName: "Mr xyz",
    patientUhid: "JSKL41712025",
    amount: 300,
    txnId: "251028111219265E680316810",
    machineAlignedTo: "Harsh",
    role: "Clinic Receptionist",
    paymentType: "medicine_order_fee",
    status: "SUCCESS",
    createdDate: "11-05-2023",
    date: "11-05-2023",
  },
  {
    id: 5,
    srNo: 5,
    branch: "MURAD NAGAR UP",
    patientName: "Mr xyz",
    patientUhid: "JSKL41712025",
    amount: 300,
    txnId: "251028111219265E680316810",
    machineAlignedTo: "Harsh",
    role: "Clinic Receptionist",
    paymentType: "medicine_order_fee",
    status: "SUCCESS",
    createdDate: "11-05-2023",
    date: "11-05-2023",
  },
  {
    id: 6,
    srNo: 6,
    branch: "MURAD NAGAR UP",
    patientName: "Mr xyz",
    patientUhid: "JSKL41712025",
    amount: 300,
    txnId: "251028111219265E680316810",
    machineAlignedTo: "Harsh",
    role: "Clinic Receptionist",
    paymentType: "medicine_order_fee",
    status: "SUCCESS",
    createdDate: "11-05-2023",
    date: "11-05-2023",
  },
];

export default function RazarpayPosMachinePage() {
  const [machines, setMachines] = useState<RazarPayPosMachine[]>(initialRazarPayMachines);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [showPaymentLogTable, setShowPaymentLogTable] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<RazarPayPosMachine | null>(null);
  const [formValues, setFormValues] = useState({
    branch: "",
    group: "",
    assignUser: "",
    razarpayUsername: "",
    razarpayPassword: "",
    razarpayTid: "",
    razarpayDeviceId: "",
    smsType: "",
    status: "Active" as "Active" | "Inactive",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Payment Log states
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>(initialPaymentLogs);
  const [paymentLogSearchTerm, setPaymentLogSearchTerm] = useState("");
  const [paymentLogBranchFilter, setPaymentLogBranchFilter] = useState("");
  const [paymentLogDateFilter, setPaymentLogDateFilter] = useState("");
  const [paymentLogCurrentPage, setPaymentLogCurrentPage] = useState(1);
  const [paymentLogItemsPerPage, setPaymentLogItemsPerPage] = useState(6);
  const [viewDetailsDialogOpen, setViewDetailsDialogOpen] = useState(false);
  const [selectedPaymentLog, setSelectedPaymentLog] = useState<PaymentLog | null>(null);

  const filteredMachines = useMemo(() => {
    return machines.filter((machine) => {
      const matchesSearch =
        machine.roleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        machine.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        machine.branch.toLowerCase().includes(searchTerm.toLowerCase()) ||
        machine.assignUser.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [machines, searchTerm]);

  const filteredPaymentLogs = useMemo(() => {
    return paymentLogs.filter((log) => {
      const matchesBranch = paymentLogBranchFilter ? log.branch === paymentLogBranchFilter : true;
      const matchesDate = paymentLogDateFilter ? log.date === paymentLogDateFilter : true;
      const matchesSearch =
        log.patientName.toLowerCase().includes(paymentLogSearchTerm.toLowerCase()) ||
        log.patientUhid.toLowerCase().includes(paymentLogSearchTerm.toLowerCase()) ||
        log.txnId.toLowerCase().includes(paymentLogSearchTerm.toLowerCase());
      return matchesBranch && matchesDate && matchesSearch;
    });
  }, [paymentLogs, paymentLogBranchFilter, paymentLogDateFilter, paymentLogSearchTerm]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMachines = filteredMachines.slice(startIndex, startIndex + itemsPerPage);

  const paymentLogStartIndex = (paymentLogCurrentPage - 1) * paymentLogItemsPerPage;
  const paginatedPaymentLogs = filteredPaymentLogs.slice(
    paymentLogStartIndex,
    paymentLogStartIndex + paymentLogItemsPerPage
  );

  const handleAdd = () => {
    setSelectedMachine(null);
    setFormValues({
      branch: "",
      group: "",
      assignUser: "",
      razarpayUsername: "",
      razarpayPassword: "",
      razarpayTid: "",
      razarpayDeviceId: "",
      smsType: "",
      status: "Active",
    });
    setFormErrors({});
    setAddDialogOpen(true);
  };

  const handleEdit = (machine: RazarPayPosMachine) => {
    setSelectedMachine(machine);
    setFormValues({
      branch: machine.branch,
      group: "",
      assignUser: machine.assignUser,
      razarpayUsername: machine.username,
      razarpayPassword: machine.password,
      razarpayTid: machine.razarpayTid,
      razarpayDeviceId: machine.razarpayDeviceId,
      smsType: "",
      status: machine.status,
    });
    setFormErrors({});
    setEditDialogOpen(true);
  };

  const handleRefresh = () => {
    // Refresh logic here
    console.log("Refreshing data...");
  };

  const handlePaymentLogHistory = () => {
    setShowPaymentLogTable(true);
  };

  const handleBackToCards = () => {
    setShowPaymentLogTable(false);
    setPaymentLogSearchTerm("");
    setPaymentLogBranchFilter("");
    setPaymentLogDateFilter("");
    setPaymentLogCurrentPage(1);
  };

  const handleViewDetails = (log: PaymentLog) => {
    setSelectedPaymentLog(log);
    setViewDetailsDialogOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formValues.branch) errors.branch = "Branch is required";
    if (!formValues.assignUser) errors.assignUser = "Assign User is required";
    if (!formValues.razarpayUsername) errors.razarpayUsername = "Razarpay Username is required";
    if (!formValues.razarpayPassword) errors.razarpayPassword = "Razarpay Password is required";
    if (!formValues.razarpayTid) errors.razarpayTid = "Razarpay Tid is required";
    if (!formValues.razarpayDeviceId) errors.razarpayDeviceId = "Razarpay DeviceId is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;

    if (selectedMachine) {
      setMachines((prev) =>
        prev.map((machine) =>
          machine.id === selectedMachine.id
            ? {
                ...machine,
                branch: formValues.branch,
                username: formValues.razarpayUsername,
                password: formValues.razarpayPassword,
                razarpayTid: formValues.razarpayTid,
                razarpayDeviceId: formValues.razarpayDeviceId,
                assignUser: formValues.assignUser,
                status: formValues.status,
              }
            : machine
        )
      );
      setEditDialogOpen(false);
    } else {
      const newMachine: RazarPayPosMachine = {
        id: machines.length + 1,
        roleName: "[Role Name]",
        username: formValues.razarpayUsername,
        branch: formValues.branch,
        password: formValues.razarpayPassword,
        razarpayTid: formValues.razarpayTid,
        razarpayDeviceId: formValues.razarpayDeviceId,
        assignUser: formValues.assignUser,
        createdAt: new Date().toLocaleString("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: formValues.status,
      };
      setMachines((prev) => [...prev, newMachine]);
      setAddDialogOpen(false);
    }

    setSelectedMachine(null);
    setFormValues({
      branch: "",
      group: "",
      assignUser: "",
      razarpayUsername: "",
      razarpayPassword: "",
      razarpayTid: "",
      razarpayDeviceId: "",
      smsType: "",
      status: "Active",
    });
    setFormErrors({});
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

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <PageHeading title={showPaymentLogTable ? "Payment History" : "Razarpay Pos Machine"} />
        </div>

        <ListBorder as="section" className="px-4 py-4">
          <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <h2 className="text-lg font-semibold leading-[120%] text-[#434956]">
                
              </h2>

              <div className="flex flex-wrap items-center gap-3">
                {showPaymentLogTable ? (
                  <>
                    <div className="w-[300px]">
                      <FormSelectField
                        label=""
                        options={[{ value: "", label: "All" }, ...branchOptions]}
                        value={paymentLogBranchFilter || null}
                        onChange={(value) => {
                          const next = Array.isArray(value) ? value[0] : value;
                          setPaymentLogBranchFilter(next || "");
                          setPaymentLogCurrentPage(1);
                        }}
                        placeholder="Select Branch"
                        background="normal"
                      />
                    </div>

                    <div className="w-[300px]">
                      <DatePicker
                        value={paymentLogDateFilter}
                        onChange={(value) => {
                          setPaymentLogDateFilter(value);
                          setPaymentLogCurrentPage(1);
                        }}
                        placeholder="Date"
                      />
                    </div>

                    <div className="w-[300px]">
                      <TableSearchInput
                        value={paymentLogSearchTerm}
                        onChange={setPaymentLogSearchTerm}
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
                      <RefreshButton
                        onClick={() => {
                          setPaymentLogSearchTerm("");
                          setPaymentLogBranchFilter("");
                          setPaymentLogDateFilter("");
                          setPaymentLogCurrentPage(1);
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-[240px] lg:max-w-[300px]">
                      <TableSearchInput
                        value={searchTerm}
                        onChange={setSearchTerm}
                        placeholder="Search Here..."
                      />
                    </div>

                    <div className="w-full lg:w-auto">
                      <button
                        type="button"
                        className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[#0B8C00]/20"
                        onClick={handleAdd}
                      >
                        <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                        Add Razarpay Pos Machine
                      </button>
                    </div>

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
                      <RefreshButton onClick={handleRefresh} />
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
                      <TableHead>Patient Name</TableHead>
                      <TableHead>Patient Uhid</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>TxnId</TableHead>
                      <TableHead>Machine Aligned To</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Payment Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created Date</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead position="last">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPaymentLogs.length === 0 ? (
                      <TableRow>
                        <TableData colSpan={13} className="py-12 text-center text-sm text-[#9CA3AF]">
                          No payment logs found
                        </TableData>
                      </TableRow>
                    ) : (
                      paginatedPaymentLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableData position="first">{log.srNo}</TableData>
                          <TableData>{log.branch}</TableData>
                          <TableData>{log.patientName}</TableData>
                          <TableData>{log.patientUhid}</TableData>
                          <TableData>₹{log.amount}</TableData>
                          <TableData>{log.txnId}</TableData>
                          <TableData>{log.machineAlignedTo}</TableData>
                          <TableData>{log.role}</TableData>
                          <TableData>{log.paymentType}</TableData>
                          <TableData>
                            <span
                              className={`inline-flex h-[30px] min-w-[86px] items-center justify-center rounded-[30px] border px-5 text-xs font-medium leading-[120%] ${getStatusBadgeClass(
                                log.status
                              )}`}
                            >
                              {log.status}
                            </span>
                          </TableData>
                          <TableData>{log.createdDate}</TableData>
                          <TableData>{log.date}</TableData>
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

                {filteredPaymentLogs.length > 0 && (
                  <Pagination
                    currentPage={paymentLogCurrentPage}
                    totalItems={filteredPaymentLogs.length}
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
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {paginatedMachines.map((machine) => (
                    <RazarPayCard
                      key={machine.id}
                      id={machine.id}
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
                    />
                  ))}
                </div>

                {filteredMachines.length === 0 && (
                  <div className="py-12 text-center text-sm text-[#9CA3AF]">No machines found</div>
                )}

                {filteredMachines.length > 0 && (
                  <Pagination
                    currentPage={currentPage}
                    totalItems={filteredMachines.length}
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
          setFormErrors({});
          setSelectedMachine(null);
        }}
        title={selectedMachine ? "Edit Razarpay Pos Machine" : "Add Razarpay Pos Machine"}
        width={949}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FormSelectField
                label="Branch"
                value={formValues.branch}
                onChange={(value) => {
                  const next = Array.isArray(value) ? value[0] : value;
                  setFormValues((prev) => ({ ...prev, branch: next || "" }));
                  setFormErrors((prev) => ({ ...prev, branch: "" }));
                }}
                options={branchOptions}
                placeholder="Branch"
                mode="single"
                background="white"
              />
              {formErrors.branch && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.branch}</p>}
            </div>

            <div>
              <FormSelectField
                label="Group"
                value={formValues.group}
                onChange={(value) => {
                  const next = Array.isArray(value) ? value[0] : value;
                  setFormValues((prev) => ({ ...prev, group: next || "" }));
                }}
                options={groupOptions}
                placeholder="Group"
                mode="single"
                background="white"
              />
            </div>

            <div>
              <FormSelectField
                label="Assign User"
                value={formValues.assignUser}
                onChange={(value) => {
                  const next = Array.isArray(value) ? value[0] : value;
                  setFormValues((prev) => ({ ...prev, assignUser: next || "" }));
                  setFormErrors((prev) => ({ ...prev, assignUser: "" }));
                }}
                options={assignUserOptions}
                placeholder="Assign User"
                mode="single"
                background="white"
              />
              {formErrors.assignUser && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.assignUser}</p>}
            </div>

            <div>
              <FormInputField
                label="Razarpay Username"
                value={formValues.razarpayUsername}
                onChange={(event) => {
                  setFormValues((prev) => ({ ...prev, razarpayUsername: event.target.value }));
                  setFormErrors((prev) => ({ ...prev, razarpayUsername: "" }));
                }}
                height={44}
                placeholder="Razarpay Username"
              />
              {formErrors.razarpayUsername && (
                <p className="mt-1 text-xs text-[#F6776E]">{formErrors.razarpayUsername}</p>
              )}
            </div>

            <div>
              <FormInputField
                label="Razarpay Password"
                value={formValues.razarpayPassword}
                onChange={(event) => {
                  setFormValues((prev) => ({ ...prev, razarpayPassword: event.target.value }));
                  setFormErrors((prev) => ({ ...prev, razarpayPassword: "" }));
                }}
                height={44}
                placeholder="Razarpay Password"
                type="password"
              />
              {formErrors.razarpayPassword && (
                <p className="mt-1 text-xs text-[#F6776E]">{formErrors.razarpayPassword}</p>
              )}
            </div>

            <div>
              <FormInputField
                label="Razarpay Tid"
                value={formValues.razarpayTid}
                onChange={(event) => {
                  setFormValues((prev) => ({ ...prev, razarpayTid: event.target.value }));
                  setFormErrors((prev) => ({ ...prev, razarpayTid: "" }));
                }}
                height={44}
                placeholder="Razarpay Tid"
              />
              {formErrors.razarpayTid && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.razarpayTid}</p>}
            </div>

            <div>
              <FormInputField
                label="Razarpay DeviceId"
                value={formValues.razarpayDeviceId}
                onChange={(event) => {
                  setFormValues((prev) => ({ ...prev, razarpayDeviceId: event.target.value }));
                  setFormErrors((prev) => ({ ...prev, razarpayDeviceId: "" }));
                }}
                height={44}
                placeholder="Razarpay DeviceId"
              />
              {formErrors.razarpayDeviceId && (
                <p className="mt-1 text-xs text-[#F6776E]">{formErrors.razarpayDeviceId}</p>
              )}
            </div>

            <div>
              <FormSelectField
                label="SMS Type"
                value={formValues.smsType}
                onChange={(value) => {
                  const next = Array.isArray(value) ? value[0] : value;
                  setFormValues((prev) => ({ ...prev, smsType: next || "" }));
                }}
                options={smsTypeOptions}
                placeholder="SMS Type"
                mode="single"
                background="white"
              />
            </div>

            <div>
              <FormSelectField
                label="Status"
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
            <Button type="submit" variant="primary">
              {selectedMachine ? "Update Razarpay Pos Machine" : "Add Razarpay Pos Machine"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAddDialogOpen(false);
                setEditDialogOpen(false);
                setFormErrors({});
                setSelectedMachine(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
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
                <p className="text-xs font-medium leading-[120%] text-[#7B8089]">Patient</p>
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
                  {selectedPaymentLog.createdDate} {selectedPaymentLog.date ? `(${selectedPaymentLog.date})` : ""}
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
                <p className="mt-1">
                  <span
                    className={`inline-flex h-[30px] min-w-[86px] items-center justify-center rounded-[30px] border px-5 text-xs font-medium leading-[120%] ${getStatusBadgeClass(
                      selectedPaymentLog.status
                    )}`}
                  >
                    {selectedPaymentLog.status}
                  </span>
                </p>
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

    </AppShell>
  );
}


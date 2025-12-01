"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
  Button,
  Dialog,
  FormInputField,
  FormTextareaField,
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
} from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import type { SelectOption } from "@/components/ui/FormSelectField";

type Notification = {
  id: number;
  title: string;
  roles: string[];
  message: string;
  startDate: string;
  endDate: string;
  status: "Active" | "Inactive";
  createdAt: string;
};

const statusOptions: SelectOption[] = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
];

const roleOptions: SelectOption[] = [
  { value: "Branch Admin", label: "Branch Admin" },
  { value: "Pharmacist", label: "Pharmacist" },
  { value: "Accountant", label: "Accountant" },
  { value: "Receptionist", label: "Receptionist" },
  { value: "Therapist", label: "Therapist" },
  { value: "Clinic Receptionist", label: "Clinic Receptionist" },
  { value: "Clinic Pharmacist", label: "Clinic Pharmacist" },
  { value: "Account Department", label: "Account Department" },
  { value: "Clinic Super Admin", label: "Clinic Super Admin" },
  { value: "Approver", label: "Approver" },
];

const initialNotifications: Notification[] = [
  {
    id: 1,
    title: "Portal scheduled maintenance",
    roles: ["Branch Admin", "Pharmacist", "Accountant", "Receptionist", "Therapist", "Clinic Receptionist", "Clinic Pharmacist", "Account Department", "Clinic Super Admin"],
    message: "HIIMS Portal will be undergoing scheduled maintenance from 26-05-2025 time 7:30 pm to 27-05-2025 time 10:00 am. During this time, you may experience temporary disruptions. We apologize for any inconvenience",
    startDate: "11-05-2023",
    endDate: "12-05-2023",
    status: "Active",
    createdAt: "11-05-2023",
  },
  {
    id: 2,
    title: "Portal scheduled maintenance",
    roles: ["Clinic Super Admin", "Approver"],
    message: "HIIMS Portal will be undergoing scheduled maintenance from 26-05-2025 time 7:30 pm to 27-05-2025 time 10:00 am. During this time, you may experience temporary disruptions. We apologize for any inconvenience",
    startDate: "11-05-2023",
    endDate: "12-05-2023",
    status: "Active",
    createdAt: "11-05-2023",
  },
  {
    id: 3,
    title: "Portal scheduled maintenance",
    roles: ["Branch Admin", "Pharmacist"],
    message: "HIIMS Portal will be undergoing scheduled maintenance from 26-05-2025 time 7:30 pm to 27-05-2025 time 10:00 am. During this time, you may experience temporary disruptions. We apologize for any inconvenience",
    startDate: "11-05-2023",
    endDate: "12-05-2023",
    status: "Inactive",
    createdAt: "11-05-2023",
  },
  {
    id: 4,
    title: "Portal scheduled maintenance",
    roles: ["Clinic Super Admin", "Approver"],
    message: "HIIMS Portal will be undergoing scheduled maintenance from 26-05-2025 time 7:30 pm to 27-05-2025 time 10:00 am. During this time, you may experience temporary disruptions. We apologize for any inconvenience",
    startDate: "11-05-2023",
    endDate: "12-05-2023",
    status: "Active",
    createdAt: "11-05-2023",
  },
  {
    id: 5,
    title: "Portal scheduled maintenance",
    roles: ["Branch Admin", "Pharmacist"],
    message: "HIIMS Portal will be undergoing scheduled maintenance from 26-05-2025 time 7:30 pm to 27-05-2025 time 10:00 am. During this time, you may experience temporary disruptions. We apologize for any inconvenience",
    startDate: "11-05-2023",
    endDate: "12-05-2023",
    status: "Active",
    createdAt: "11-05-2023",
  },
  {
    id: 6,
    title: "Portal scheduled maintenance",
    roles: ["Clinic Super Admin", "Approver"],
    message: "HIIMS Portal will be undergoing scheduled maintenance from 26-05-2025 time 7:30 pm to 27-05-2025 time 10:00 am. During this time, you may experience temporary disruptions. We apologize for any inconvenience",
    startDate: "11-05-2023",
    endDate: "12-05-2023",
    status: "Active",
    createdAt: "11-05-2023",
  },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewRoleDialogOpen, setViewRoleDialogOpen] = useState(false);
  const [viewMessageDialogOpen, setViewMessageDialogOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedMessage, setSelectedMessage] = useState("");
  const [formValues, setFormValues] = useState({
    title: "",
    roles: [] as string[],
    message: "",
    startDate: "",
    endDate: "",
    status: "Active" as "Active" | "Inactive",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      return (
        notif.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notif.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [notifications, searchTerm]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedNotifications = filteredNotifications.slice(startIndex, startIndex + itemsPerPage);

  const handleViewRole = (notification: Notification) => {
    setSelectedRoles(notification.roles);
    setViewRoleDialogOpen(true);
  };

  const handleViewMessage = (notification: Notification) => {
    setSelectedMessage(notification.message);
    setViewMessageDialogOpen(true);
  };

  const handleEdit = (notification: Notification) => {
    setSelectedNotification(notification);
    setFormValues({
      title: notification.title,
      roles: notification.roles,
      message: notification.message,
      startDate: notification.startDate,
      endDate: notification.endDate,
      status: notification.status,
    });
    setFormErrors({});
    setEditDialogOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formValues.title.trim()) errors.title = "Title is required";
    if (formValues.roles.length === 0) errors.roles = "At least one role is required";
    if (!formValues.message.trim()) errors.message = "Message is required";
    if (!formValues.startDate) errors.startDate = "Start date is required";
    if (!formValues.endDate) errors.endDate = "End date is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;

    if (selectedNotification) {
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === selectedNotification.id
            ? {
                ...notif,
                title: formValues.title.trim(),
                roles: formValues.roles,
                message: formValues.message.trim(),
                startDate: formValues.startDate,
                endDate: formValues.endDate,
                status: formValues.status,
              }
            : notif
        )
      );
    }

    setEditDialogOpen(false);
    setFormValues({
      title: "",
      roles: [],
      message: "",
      startDate: "",
      endDate: "",
      status: "Active",
    });
    setFormErrors({});
    setSelectedNotification(null);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  const getSortDirection = (column: string): "asc" | "desc" | null => {
    return null;
  };

  const getStatusBadgeClass = (status: "Active" | "Inactive") => {
    switch (status) {
      case "Active":
        return "border-[#0B8C00]/20 bg-[#0B8C000D] text-[#0B8C00]";
      case "Inactive":
        return "border-[#F6776E]/24 bg-[#F6776E0D] text-[#F6776E]";
      default:
        return "";
    }
  };

  // Format date from DD-MM-YYYY to YYYY-MM-DD for date input
  const formatDateForInput = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  // Format date from YYYY-MM-DD to DD-MM-YYYY for display
  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <PageHeading title="Settings" />
        </div>

        <ListBorder as="section" className="px-4 py-4">
          <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold leading-[120%] text-[#434956]">Notifications</h2>

              <div className="flex items-center gap-3">
                <TableSearchInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search Here..."
                />
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead position="first" className="whitespace-nowrap">
                    Sr no.
                  </TableHead>
                  <TableHead sortable sortDirection={getSortDirection("title")} onSort={() => {}}>
                    Title
                  </TableHead>
                  <TableHead sortable sortDirection={getSortDirection("role")} onSort={() => {}}>
                    Role
                  </TableHead>
                  <TableHead sortable sortDirection={getSortDirection("message")} onSort={() => {}}>
                    Message
                  </TableHead>
                  <TableHead sortable sortDirection={getSortDirection("startDate")} onSort={() => {}}>
                    Start Date
                  </TableHead>
                  <TableHead sortable sortDirection={getSortDirection("endDate")} onSort={() => {}}>
                    End Date
                  </TableHead>
                  <TableHead sortable sortDirection={getSortDirection("status")} onSort={() => {}}>
                    Status
                  </TableHead>
                  <TableHead sortable sortDirection={getSortDirection("createdAt")} onSort={() => {}}>
                    Created Date
                  </TableHead>
                  <TableHead position="last" sortable sortDirection={null} onSort={() => {}}>
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedNotifications.length === 0 ? (
                  <TableRow>
                    <TableData colSpan={9} className="py-12 text-center text-sm text-[#9CA3AF]">
                      No notifications found
                    </TableData>
                  </TableRow>
                ) : (
                  paginatedNotifications.map((notification, index) => (
                    <TableRow key={notification.id}>
                      <TableData position="first">{startIndex + index + 1}</TableData>
                      <TableData>{notification.title}</TableData>
                      <TableData>
                        <button
                          type="button"
                          onClick={() => handleViewRole(notification)}
                          className="inline-flex h-[30px] items-center justify-center rounded-[30px] border border-[#0B8C00]/20 bg-[#0B8C00] px-5 text-xs font-medium leading-[120%] text-white transition-colors hover:bg-[#0A7F00]"
                        >
                          View Role
                        </button>
                      </TableData>
                      <TableData>
                        <button
                          type="button"
                          onClick={() => handleViewMessage(notification)}
                          className="inline-flex h-[30px] items-center justify-center rounded-[30px] border border-[#0B8C00]/20 bg-[#0B8C00] px-5 text-xs font-medium leading-[120%] text-white transition-colors hover:bg-[#0A7F00]"
                        >
                          View Message
                        </button>
                      </TableData>
                      <TableData className="whitespace-nowrap">{notification.startDate}</TableData>
                      <TableData className="whitespace-nowrap">{notification.endDate}</TableData>
                      <TableData>
                        <span
                          className={`inline-flex h-[30px] min-w-[86px] items-center justify-center rounded-[30px] border px-5 text-xs font-medium leading-[120%] ${getStatusBadgeClass(notification.status)}`}
                        >
                          {notification.status}
                        </span>
                      </TableData>
                      <TableData className="whitespace-nowrap">{notification.createdAt}</TableData>
                      <TableData position="last">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleEdit(notification)}
                            className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                            aria-label="Edit notification"
                          >
                            <Image
                              src="/icons/EditIconBlack.svg"
                              alt="Edit"
                              width={20}
                              height={20}
                            />
                          </button>
                        </div>
                      </TableData>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {filteredNotifications.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={filteredNotifications.length}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
                itemsPerPageOptions={[6, 10, 20, 50]}
              />
            )}
          </div>
        </ListBorder>
      </div>

      {/* View Role Dialog */}
      <Dialog
        open={viewRoleDialogOpen}
        onClose={() => {
          setViewRoleDialogOpen(false);
          setSelectedRoles([]);
        }}
        title="View Role"
        width={772}
      >
        <div className="flex flex-wrap gap-2">
          {selectedRoles.map((role, index) => (
            <span
              key={index}
              className="inline-flex h-[30px] items-center justify-center rounded-[30px] border border-[#0B8C00]/20 bg-[#0B8C00]/20 px-5 text-xs font-medium leading-[120%] text-[#0B8C00]"
            >
              {role}
            </span>
          ))}
        </div>
      </Dialog>

      {/* View Message Dialog */}
      <Dialog
        open={viewMessageDialogOpen}
        onClose={() => {
          setViewMessageDialogOpen(false);
          setSelectedMessage("");
        }}
        title="View Message"
        width={506}
      >
        <p className="text-sm font-medium leading-[120%] text-[#262D3B]">{selectedMessage}</p>
      </Dialog>

      {/* Edit Notification Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setFormErrors({});
          setSelectedNotification(null);
        }}
        title="Edit Notification"
        width={949}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <FormInputField
                label="Title"
                value={formValues.title}
                onChange={(event) => {
                  setFormValues((prev) => ({ ...prev, title: event.target.value }));
                  setFormErrors((prev) => ({ ...prev, title: "" }));
                }}
                height={44}
                placeholder="Title"
                required
              />
              {formErrors.title && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.title}</p>}
            </div>

            <div>
              <FormSelectField
                label="Group/Role"
                value={formValues.roles}
                onChange={(value) => {
                  setFormValues((prev) => ({
                    ...prev,
                    roles: Array.isArray(value) ? value : value ? [value] : [],
                  }));
                  setFormErrors((prev) => ({ ...prev, roles: "" }));
                }}
                options={roleOptions}
                placeholder="Select roles"
                mode="multiple"
                background="white"
              />
              {formErrors.roles && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.roles}</p>}
            </div>
          </div>

          <div>
            <FormTextareaField
              label="Message"
              value={formValues.message}
              onChange={(event) => {
                setFormValues((prev) => ({ ...prev, message: event.target.value }));
                setFormErrors((prev) => ({ ...prev, message: "" }));
              }}
              height={73}
              placeholder="Message"
              required
            />
            {formErrors.message && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <DatePicker
                label="Start Date"
                value={formatDateForInput(formValues.startDate)}
                onChange={(value) => {
                  setFormValues((prev) => ({ ...prev, startDate: formatDateForDisplay(value) }));
                  setFormErrors((prev) => ({ ...prev, startDate: "" }));
                }}
                placeholder="Start Date"
                required
              />
              {formErrors.startDate && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.startDate}</p>}
            </div>

            <div>
              <DatePicker
                label="End Date"
                value={formatDateForInput(formValues.endDate)}
                onChange={(value) => {
                  setFormValues((prev) => ({ ...prev, endDate: formatDateForDisplay(value) }));
                  setFormErrors((prev) => ({ ...prev, endDate: "" }));
                }}
                placeholder="End Date"
                required
              />
              {formErrors.endDate && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.endDate}</p>}
            </div>
          </div>

          <div>
            <FormSelectField
              label="Status"
              value={formValues.status}
              onChange={(value) => {
                setFormValues((prev) => ({
                  ...prev,
                  status: (Array.isArray(value) ? value[0] : value || "Active") as "Active" | "Inactive",
                }));
              }}
              options={statusOptions}
              placeholder="Status"
              mode="single"
              background="white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="primary">
              Update Notification
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setFormErrors({});
                setSelectedNotification(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Dialog>
    </AppShell>
  );
}


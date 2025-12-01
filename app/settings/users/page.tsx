"use client";

import Image from "next/image";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { Button, Dialog, FormInputField, FormSelectField, TableSearchInput, Pagination, DatePicker, ExportButton, UserCard } from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import type { SelectOption } from "@/components/ui/FormSelectField";

type User = {
  id: number;
  name: string;
  email: string;
  branch: string;
  phone: string;
  groupRole: string;
  permissionDate: string;
  lastLogin: string;
  status: "Active" | "Inactive";
  role: "Single Branch" | "Multi Branch";
  branches: string[];
  password?: string;
  employeeId: string;
  loginType: string;
};

const initialUsers: User[] = [
  {
    id: 1,
    name: "Aaarti",
    email: "aartipanchkula@jeenasikho.com",
    branch: "HIIMS PANCHKULA",
    phone: "(217) 555-0113",
    groupRole: "Accountant",
    permissionDate: "23 Apr, 2025",
    lastLogin: "19-09-2025 12:17 PM",
    status: "Active",
    role: "Single Branch",
    branches: ["HIIMS PANCHKULA"],
    employeeId: "AARTI",
    loginType: "NO-AUTH",
  },
  {
    id: 2,
    name: "Aaarti",
    email: "aartipanchkula@jeenasikho.com",
    branch: "HIIMS PANCHKULA",
    phone: "(217) 555-0113",
    groupRole: "Accountant",
    permissionDate: "23 Apr, 2025",
    lastLogin: "19-09-2025 12:17 PM",
    status: "Active",
    role: "Single Branch",
    branches: ["HIIMS PANCHKULA"],
    employeeId: "AARTI",
    loginType: "NO-AUTH",
  },
  {
    id: 3,
    name: "Aaarti",
    email: "aartipanchkula@jeenasikho.com",
    branch: "HIIMS PANCHKULA",
    phone: "(217) 555-0113",
    groupRole: "Accountant",
    permissionDate: "23 Apr, 2025",
    lastLogin: "19-09-2025 12:17 PM",
    status: "Active",
    role: "Single Branch",
    branches: ["HIIMS PANCHKULA"],
    employeeId: "AARTI",
    loginType: "NO-AUTH",
  },
  {
    id: 4,
    name: "Aaarti",
    email: "aartipanchkula@jeenasikho.com",
    branch: "HIIMS PANCHKULA",
    phone: "(217) 555-0113",
    groupRole: "Accountant",
    permissionDate: "23 Apr, 2025",
    lastLogin: "19-09-2025 12:17 PM",
    status: "Active",
    role: "Single Branch",
    branches: ["HIIMS PANCHKULA"],
    employeeId: "AARTI",
    loginType: "NO-AUTH",
  },
  {
    id: 5,
    name: "Aaarti",
    email: "aartipanchkula@jeenasikho.com",
    branch: "HIIMS PANCHKULA",
    phone: "(217) 555-0113",
    groupRole: "Accountant",
    permissionDate: "23 Apr, 2025",
    lastLogin: "19-09-2025 12:17 PM",
    status: "Active",
    role: "Single Branch",
    branches: ["HIIMS PANCHKULA"],
    employeeId: "AARTI",
    loginType: "NO-AUTH",
  },
  {
    id: 6,
    name: "Aaarti",
    email: "aartipanchkula@jeenasikho.com",
    branch: "HIIMS PANCHKULA",
    phone: "(217) 555-0113",
    groupRole: "Accountant",
    permissionDate: "23 Apr, 2025",
    lastLogin: "19-09-2025 12:17 PM",
    status: "Active",
    role: "Single Branch",
    branches: ["HIIMS PANCHKULA"],
    employeeId: "AARTI",
    loginType: "NO-AUTH",
  },
];

const branchOptions: SelectOption[] = [
  { value: "murad-nagar", label: "MURAD NAGAR UP" },
  { value: "vaishali", label: "Vaishali UP" },
  { value: "sonipat", label: "Sonipat" },
  { value: "shastri-nagar", label: "Shastri Nagar Delhi" },
  { value: "rdc-ghaziabad", label: "RDC Ghaziabad UP" },
  { value: "prashant-vihar", label: "Prashant Vihar" },
  { value: "panchkula", label: "HIIMS PANCHKULA" },
];

const roleOptions: SelectOption[] = [
  { value: "Single Branch", label: "Single Branch" },
  { value: "Multi Branch", label: "Multi Branch" },
];

const groupRoleOptions: SelectOption[] = [
  { value: "Accountant", label: "Accountant" },
  { value: "Admin", label: "Admin" },
  { value: "Manager", label: "Manager" },
];

const loginTypeOptions: SelectOption[] = [
  { value: "NO-AUTH", label: "NO-AUTH" },
  { value: "AUTH", label: "AUTH" },
];

const statusOptions: SelectOption[] = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [dialogMode, setDialogMode] = useState<"add" | "edit" | "view" | null>(null);
  const [isSetDateDialogOpen, setIsSetDateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [setDateUser, setSetDateUser] = useState<User | null>(null);
  const [formValues, setFormValues] = useState({
    role: "",
    fullName: "",
    username: "",
    password: "",
    phone: "",
    branch: "",
    branches: [] as string[],
    group: "",
    employeeId: "",
    loginType: "",
    status: "Active",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [dateValue, setDateValue] = useState("");

  // Filter users based on search and branch
  const filteredData = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.branch.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBranch = !selectedBranch || user.branch === selectedBranch;

    return matchesSearch && matchesBranch;
  });

  // Paginate data
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  const handleAddNew = () => {
    setFormValues({
      role: "",
      fullName: "",
      username: "",
      password: "",
      phone: "",
      branch: "",
      branches: [],
      group: "",
      employeeId: "",
      loginType: "",
      status: "Active",
    });
    setFormErrors({});
    setSelectedUser(null);
    setDialogMode("add");
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setFormValues({
      role: user.role,
      fullName: user.name,
      username: user.email,
      password: "",
      phone: user.phone,
      branch: user.branches[0] || "",
      branches: user.branches,
      group: user.groupRole,
      employeeId: user.employeeId,
      loginType: user.loginType,
      status: user.status,
    });
    setFormErrors({});
    setDialogMode("edit");
  };

  const handleView = (user: User) => {
    setSelectedUser(user);
    setFormValues({
      role: user.role,
      fullName: user.name,
      username: user.email,
      password: "",
      phone: user.phone,
      branch: user.branches[0] || "",
      branches: user.branches,
      group: user.groupRole,
      employeeId: user.employeeId,
      loginType: user.loginType,
      status: user.status,
    });
    setDialogMode("view");
  };

  const handleSetDate = (user: User) => {
    setSetDateUser(user);
    // Convert "23 Apr, 2025" to YYYY-MM-DD format
    const dateParts = user.permissionDate.split(" ");
    if (dateParts.length === 3) {
      const day = dateParts[0].padStart(2, "0");
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = (monthNames.indexOf(dateParts[1]) + 1).toString().padStart(2, "0");
      const year = dateParts[2];
      setDateValue(`${year}-${month}-${day}`);
    } else {
      setDateValue("");
    }
    setIsSetDateDialogOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formValues.role) {
      errors.role = "Role selection is mandatory";
    }

    if (formValues.role === "Single Branch" && !formValues.branch) {
      errors.branch = "Branch selection is required for Single Branch role";
    }

    if (formValues.role === "Multi Branch" && formValues.branches.length === 0) {
      errors.branches = "At least one branch must be selected for Multi Branch role";
    }

    if (!formValues.fullName) {
      errors.fullName = "Full Name is required";
    }

    if (!formValues.username) {
      errors.username = "Username/Email is required";
    }

    if (dialogMode === "add" && !formValues.password) {
      errors.password = "Password is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const branchName =
      formValues.role === "Single Branch"
        ? branchOptions.find((opt) => opt.value === formValues.branch)?.label || ""
        : formValues.branches
            .map((b) => branchOptions.find((opt) => opt.value === b)?.label || "")
            .join(", ");

    if (dialogMode === "edit" && selectedUser) {
      setUsers((prev) =>
        prev.map((user) =>
          user.id === selectedUser.id
            ? {
                ...user,
                name: formValues.fullName,
                email: formValues.username,
                phone: formValues.phone,
                branch: branchName,
                branches: formValues.role === "Single Branch" ? [formValues.branch] : formValues.branches,
                groupRole: formValues.group,
                employeeId: formValues.employeeId,
                loginType: formValues.loginType,
                status: formValues.status as "Active" | "Inactive",
                role: formValues.role as "Single Branch" | "Multi Branch",
              }
            : user
        )
      );
    } else if (dialogMode === "add") {
      const newId = Math.max(...users.map((user) => user.id), 0) + 1;
      setUsers((prev) => [
        ...prev,
        {
          id: newId,
          name: formValues.fullName,
          email: formValues.username,
          phone: formValues.phone,
          branch: branchName,
          branches: formValues.role === "Single Branch" ? [formValues.branch] : formValues.branches,
          groupRole: formValues.group,
          employeeId: formValues.employeeId,
          loginType: formValues.loginType,
          status: formValues.status as "Active" | "Inactive",
          role: formValues.role as "Single Branch" | "Multi Branch",
          permissionDate: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
          lastLogin: new Date().toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }),
        },
      ]);
    }

    setDialogMode(null);

    setFormValues({
      role: "",
      fullName: "",
      username: "",
      password: "",
      phone: "",
      branch: "",
      branches: [],
      group: "",
      employeeId: "",
      loginType: "",
      status: "Active",
    });
    setFormErrors({});
  };

  const handleSetDateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (setDateUser && dateValue) {
      const formattedDate = new Date(dateValue).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      setUsers((prev) =>
        prev.map((user) =>
          user.id === setDateUser.id ? { ...user, permissionDate: formattedDate } : user
        )
      );
      setIsSetDateDialogOpen(false);
      setDateValue("");
      setSetDateUser(null);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  const handleExport = () => {
    // Export functionality
    console.log("Exporting users...");
  };

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <PageHeading title="Settings" />
        </div>

        <ListBorder as="section" className="px-4 py-4">
          <div className="w-full overflow-hidden rounded-[16px] border border-[#E3EEE1] bg-white px-5 pb-5 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold leading-[120%] text-[#434956]">Users</h2>

              <div className="flex items-center gap-3">
                <FormSelectField
                  label=""
                  options={branchOptions}
                  value={selectedBranch}
                  onChange={(value) => setSelectedBranch(Array.isArray(value) ? value[0] : value || "")}
                  placeholder="Select Branch"
                  mode="single"
                  background="normal"
                  width={300}
                />
                <TableSearchInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search Here..."
                />
                <ExportButton onClick={handleExport} />
                <button
                  type="button"
                  className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2]"
                  onClick={handleAddNew}
                >
                  <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                  Add User
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {paginatedData.map((user) => (
                <UserCard
                  key={user.id}
                  id={user.id}
                  name={user.name}
                  email={user.email}
                  branch={user.branch}
                  phone={user.phone}
                  groupRole={user.groupRole}
                  permissionDate={user.permissionDate}
                  lastLogin={user.lastLogin}
                  status={user.status}
                  onView={() => handleView(user)}
                  onEdit={() => handleEdit(user)}
                  onSetDate={() => handleSetDate(user)}
                />
              ))}
            </div>

            {filteredData.length === 0 && (
              <div className="py-12 text-center text-sm text-[#9CA3AF]">No users found</div>
            )}

            {filteredData.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={filteredData.length}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            )}
          </div>
        </ListBorder>
      </div>

      {/* Unified User Dialog (Add/Edit/View) */}
      <Dialog
        open={dialogMode !== null}
        onClose={() => {
          setDialogMode(null);
          setFormErrors({});
          setSelectedUser(null);
        }}
        title={dialogMode === "add" ? "Add User" : dialogMode === "edit" ? "Edit User" : "View User"}
        width={1601}
      >
        <form onSubmit={dialogMode !== "view" ? handleSubmit : (e) => e.preventDefault()} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <FormSelectField
                label="Role"
                value={formValues.role}
                onChange={(value) => {
                  if (dialogMode === "view") return;
                  const role = Array.isArray(value) ? value[0] : value;
                  setFormValues((prev) => ({
                    ...prev,
                    role: role || "",
                    branch: "",
                    branches: [],
                  }));
                  setFormErrors((prev) => ({ ...prev, role: "", branch: "", branches: "" }));
                }}
                options={roleOptions}
                placeholder="Select Role"
                mode="single"
                background="white"
                disabled={dialogMode === "view"}
              />
              {formErrors.role && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.role}</p>}
            </div>

            <div>
              {formValues.role === "Single Branch" ? (
                <FormSelectField
                  label="Branch"
                  value={formValues.branch}
                  onChange={(value) => {
                    if (dialogMode === "view") return;
                    setFormValues((prev) => ({
                      ...prev,
                      branch: Array.isArray(value) ? value[0] : value || "",
                    }));
                    setFormErrors((prev) => ({ ...prev, branch: "" }));
                  }}
                  options={branchOptions}
                  placeholder="Select"
                  mode="single"
                  background="white"
                  disabled={dialogMode === "view"}
                />
              ) : formValues.role === "Multi Branch" ? (
                <FormSelectField
                  label="Branch"
                  value={formValues.branches}
                  onChange={(value) => {
                    if (dialogMode === "view") return;
                    setFormValues((prev) => ({
                      ...prev,
                      branches: Array.isArray(value) ? value : [],
                    }));
                    setFormErrors((prev) => ({ ...prev, branches: "" }));
                  }}
                  options={branchOptions}
                  placeholder="Select Branches"
                  mode="multiple"
                  background="white"
                  disabled={dialogMode === "view"}
                />
              ) : (
                <FormSelectField
                  label="Branch"
                  value=""
                  onChange={() => {}}
                  options={[]}
                  placeholder="Select"
                  mode="single"
                  background="white"
                  disabled
                />
              )}
              {formErrors.branch && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.branch}</p>}
              {formErrors.branches && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.branches}</p>}
            </div>

            <div>
              <FormInputField
                label="Full Name"
                value={formValues.fullName}
                onChange={(event) => {
                  if (dialogMode === "view") return;
                  setFormValues((prev) => ({ ...prev, fullName: event.target.value }));
                  setFormErrors((prev) => ({ ...prev, fullName: "" }));
                }}
                height={44}
                placeholder="Full Name"
                required={dialogMode !== "view"}
                disabled={dialogMode === "view"}
              />
              {formErrors.fullName && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.fullName}</p>}
            </div>

            <div>
              <FormInputField
                label="Username/Email"
                value={formValues.username}
                onChange={(event) => {
                  if (dialogMode === "view") return;
                  setFormValues((prev) => ({ ...prev, username: event.target.value }));
                  setFormErrors((prev) => ({ ...prev, username: "" }));
                }}
                height={44}
                placeholder="Username/Email"
                required={dialogMode !== "view"}
                disabled={dialogMode === "view"}
              />
              {formErrors.username && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.username}</p>}
            </div>

            {dialogMode !== "view" && (
              <div>
                <FormInputField
                  label="Password"
                  type="password"
                  value={formValues.password}
                  onChange={(event) => {
                    setFormValues((prev) => ({ ...prev, password: event.target.value }));
                    setFormErrors((prev) => ({ ...prev, password: "" }));
                  }}
                  height={44}
                  placeholder="Password"
                  required={dialogMode === "add"}
                />
                {formErrors.password && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.password}</p>}
              </div>
            )}

            <div>
              <FormInputField
                label="Phone"
                value={formValues.phone}
                onChange={(event) => {
                  if (dialogMode === "view") return;
                  setFormValues((prev) => ({ ...prev, phone: event.target.value }));
                }}
                height={44}
                placeholder="Phone"
                disabled={dialogMode === "view"}
              />
            </div>

            <div>
              <FormSelectField
                label="Group"
                value={formValues.group}
                onChange={(value) => {
                  if (dialogMode === "view") return;
                  setFormValues((prev) => ({
                    ...prev,
                    group: Array.isArray(value) ? value[0] : value || "",
                  }));
                }}
                options={groupRoleOptions}
                placeholder="Group"
                mode="single"
                background="white"
                disabled={dialogMode === "view"}
              />
            </div>

            <div>
              <FormInputField
                label="Employee Id"
                value={formValues.employeeId}
                onChange={(event) => {
                  if (dialogMode === "view") return;
                  setFormValues((prev) => ({ ...prev, employeeId: event.target.value }));
                }}
                height={44}
                placeholder="Employee Id"
                disabled={dialogMode === "view"}
              />
            </div>

            <div>
              <FormSelectField
                label="Login Type"
                value={formValues.loginType}
                onChange={(value) => {
                  if (dialogMode === "view") return;
                  setFormValues((prev) => ({
                    ...prev,
                    loginType: Array.isArray(value) ? value[0] : value || "",
                  }));
                }}
                options={loginTypeOptions}
                placeholder="Login Type"
                mode="single"
                background="white"
                disabled={dialogMode === "view"}
              />
            </div>

            <div>
              <FormSelectField
                label="Status"
                value={formValues.status}
                onChange={(value) => {
                  if (dialogMode === "view") return;
                  setFormValues((prev) => ({
                    ...prev,
                    status: Array.isArray(value) ? value[0] : value || "Active",
                  }));
                }}
                options={statusOptions}
                placeholder="Status"
                mode="single"
                background="white"
                disabled={dialogMode === "view"}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {dialogMode === "view" ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogMode(null);
                  setFormErrors({});
                  setSelectedUser(null);
                }}
              >
                Close
              </Button>
            ) : (
              <>
                <Button type="submit" variant="primary">
                  {dialogMode === "add" ? "Add User" : "Update User"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogMode(null);
                    setFormErrors({});
                    setSelectedUser(null);
                  }}
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </form>
      </Dialog>

      {/* Set Date Dialog */}
      <Dialog
        open={isSetDateDialogOpen}
        onClose={() => {
          setIsSetDateDialogOpen(false);
          setDateValue("");
          setSetDateUser(null);
        }}
        title="Set Date"
        width={686}
      >
        <form onSubmit={handleSetDateSubmit} className="space-y-6">
          <DatePicker
            label="Date"
            value={dateValue}
            onChange={setDateValue}
            placeholder="Choose date"
            required
          />

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="primary">
              Save
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsSetDateDialogOpen(false);
                setDateValue("");
                setSetDateUser(null);
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


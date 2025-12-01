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
  TableSearchInput,
  Pagination,
  FieldUserCard,
} from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import type { SelectOption } from "@/components/ui/FormSelectField";

type FieldUser = {
  id: number;
  name: string;
  gender: string;
  email: string;
  phone: string;
  username: string;
  branch: string;
  manager: string;
  group: string;
  createdAt: string;
  status: "Active" | "Inactive";
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

const genderOptions: SelectOption[] = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
];

const groupOptions: SelectOption[] = [
  { value: "Manager", label: "Manager" },
  { value: "Admin", label: "Admin" },
  { value: "User", label: "User" },
  { value: "Field User", label: "Field User" },
];

const statusOptions: SelectOption[] = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
];

const initialFieldUsers: FieldUser[] = [
  {
    id: 1,
    name: "Ashok",
    gender: "Male",
    email: "ashok@jeenasikho.co.in",
    phone: "8824560949",
    username: "ashok@jeenasikho.co.in",
    branch: "HIIMS PANCHKULA",
    manager: "N/A",
    group: "Manager",
    createdAt: "31-12-2022",
    status: "Active",
  },
  {
    id: 2,
    name: "Ashok",
    gender: "Male",
    email: "ashok@jeenasikho.co.in",
    phone: "8824560949",
    username: "ashok@jeenasikho.co.in",
    branch: "HIIMS PANCHKULA",
    manager: "N/A",
    group: "Manager",
    createdAt: "31-12-2022",
    status: "Active",
  },
  {
    id: 3,
    name: "Ashok",
    gender: "Male",
    email: "ashok@jeenasikho.co.in",
    phone: "8824560949",
    username: "ashok@jeenasikho.co.in",
    branch: "HIIMS PANCHKULA",
    manager: "N/A",
    group: "Manager",
    createdAt: "31-12-2022",
    status: "Active",
  },
  {
    id: 4,
    name: "Ashok",
    gender: "Male",
    email: "ashok@jeenasikho.co.in",
    phone: "8824560949",
    username: "ashok@jeenasikho.co.in",
    branch: "HIIMS PANCHKULA",
    manager: "N/A",
    group: "Manager",
    createdAt: "31-12-2022",
    status: "Active",
  },
  {
    id: 5,
    name: "Ashok",
    gender: "Male",
    email: "ashok@jeenasikho.co.in",
    phone: "8824560949",
    username: "ashok@jeenasikho.co.in",
    branch: "HIIMS PANCHKULA",
    manager: "N/A",
    group: "Manager",
    createdAt: "31-12-2022",
    status: "Active",
  },
  {
    id: 6,
    name: "Ashok",
    gender: "Male",
    email: "ashok@jeenasikho.co.in",
    phone: "8824560949",
    username: "ashok@jeenasikho.co.in",
    branch: "HIIMS PANCHKULA",
    manager: "N/A",
    group: "Manager",
    createdAt: "31-12-2022",
    status: "Active",
  },
];

export default function FieldUsersPage() {
  const [fieldUsers, setFieldUsers] = useState<FieldUser[]>(initialFieldUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [dialogMode, setDialogMode] = useState<"add" | "edit" | "view" | null>(null);
  const [selectedFieldUser, setSelectedFieldUser] = useState<FieldUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formValues, setFormValues] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    gender: "",
    phone: "",
    branch: "",
    manager: "",
    group: "",
    status: "Active",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const filteredFieldUsers = useMemo(() => {
    return fieldUsers.filter((user) => {
      return (
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.branch.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [fieldUsers, searchTerm]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedFieldUsers = filteredFieldUsers.slice(startIndex, startIndex + itemsPerPage);

  const handleAddNew = () => {
    setFormValues({
      name: "",
      email: "",
      username: "",
      password: "",
      gender: "",
      phone: "",
      branch: "",
      manager: "",
      group: "",
      status: "Active",
    });
    setFormErrors({});
    setSelectedFieldUser(null);
    setShowPassword(false);
    setDialogMode("add");
  };

  const handleEdit = (user: FieldUser) => {
    setSelectedFieldUser(user);
    setFormValues({
      name: user.name,
      email: user.email,
      username: user.username,
      password: "1234567890", // In real app, this would be hidden
      gender: user.gender,
      phone: user.phone,
      branch: branchOptions.find((opt) => opt.label === user.branch)?.value || "",
      manager: user.manager,
      group: user.group,
      status: user.status,
    });
    setFormErrors({});
    setShowPassword(false);
    setDialogMode("edit");
  };

  const handleView = (user: FieldUser) => {
    setSelectedFieldUser(user);
    setFormValues({
      name: user.name,
      email: user.email,
      username: user.username,
      password: "••••••••", // Hidden in view mode
      gender: user.gender,
      phone: user.phone,
      branch: branchOptions.find((opt) => opt.label === user.branch)?.value || "",
      manager: user.manager,
      group: user.group,
      status: user.status,
    });
    setShowPassword(false);
    setDialogMode("view");
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formValues.name.trim()) errors.name = "Name is required";
    if (!formValues.email.trim()) errors.email = "Email is required";
    if (!formValues.username.trim()) {
      errors.username = "Username is required";
    } else if (formValues.username.length < 6) {
      errors.username = "Username must be at least 6 characters";
    }
    if (dialogMode === "add" && !formValues.password.trim()) {
      errors.password = "Password is required";
    } else if (dialogMode === "add" && formValues.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }
    if (!formValues.gender) errors.gender = "Gender is required";
    if (!formValues.phone.trim()) errors.phone = "Phone number is required";
    if (!formValues.branch) errors.branch = "Branch is required";
    if (!formValues.group) errors.group = "Group is required";
    if (!formValues.status) errors.status = "Status is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;

    const branchLabel = branchOptions.find((opt) => opt.value === formValues.branch)?.label || formValues.branch;

    if (dialogMode === "edit" && selectedFieldUser) {
      setFieldUsers((prev) =>
        prev.map((user) =>
          user.id === selectedFieldUser.id
            ? {
                ...user,
                name: formValues.name.trim(),
                email: formValues.email.trim(),
                username: formValues.username.trim(),
                gender: formValues.gender,
                phone: formValues.phone.trim(),
                branch: branchLabel,
                manager: formValues.manager.trim() || "N/A",
                group: formValues.group,
                status: formValues.status as "Active" | "Inactive",
              }
            : user
        )
      );
    } else if (dialogMode === "add") {
      const newId = Math.max(...fieldUsers.map((user) => user.id), 0) + 1;
      setFieldUsers((prev) => [
        ...prev,
        {
          id: newId,
          name: formValues.name.trim(),
          email: formValues.email.trim(),
          username: formValues.username.trim(),
          gender: formValues.gender,
          phone: formValues.phone.trim(),
          branch: branchLabel,
          manager: formValues.manager.trim() || "N/A",
          group: formValues.group,
          createdAt: new Date().toLocaleString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }),
          status: formValues.status as "Active" | "Inactive",
        },
      ]);
    }

    setDialogMode(null);
    setFormValues({
      name: "",
      email: "",
      username: "",
      password: "",
      gender: "",
      phone: "",
      branch: "",
      manager: "",
      group: "",
      status: "Active",
    });
    setFormErrors({});
    setSelectedFieldUser(null);
    setShowPassword(false);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
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
              <h2 className="text-lg font-semibold leading-[120%] text-[#434956]">Field Users</h2>

              <div className="flex items-center gap-3">
                <TableSearchInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search Here..."
                />
                <button
                  type="button"
                  className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2]"
                  onClick={handleAddNew}
                >
                  <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                  Add Field Users
                </button>
              </div>
            </div>

            {/* Cards Grid */}
            {paginatedFieldUsers.length === 0 ? (
              <div className="py-12 text-center text-sm text-[#9CA3AF]">No field users found</div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {paginatedFieldUsers.map((user) => (
                  <FieldUserCard
                    key={user.id}
                    id={user.id}
                    name={user.name}
                    gender={user.gender}
                    email={user.email}
                    phone={user.phone}
                    username={user.username}
                    branch={user.branch}
                    manager={user.manager}
                    group={user.group}
                    createdAt={user.createdAt}
                    status={user.status}
                    onView={() => handleView(user)}
                    onEdit={() => handleEdit(user)}
                  />
                ))}
              </div>
            )}

            {filteredFieldUsers.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={filteredFieldUsers.length}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
                itemsPerPageOptions={[6, 10, 20, 50]}
              />
            )}
          </div>
        </ListBorder>
      </div>

      {/* Add/Edit/View Dialog */}
      <Dialog
        open={dialogMode !== null}
        onClose={() => {
          setDialogMode(null);
          setFormErrors({});
          setSelectedFieldUser(null);
          setShowPassword(false);
        }}
        title={dialogMode === "add" ? "Add Field User" : dialogMode === "edit" ? "Edit Field User" : "View Field User"}
        width={949}
      >
        <form onSubmit={dialogMode !== "view" ? handleSubmit : (e) => e.preventDefault()} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column */}
            <div>
              <FormInputField
                label="Name"
                value={formValues.name}
                onChange={(event) => {
                  if (dialogMode === "view") return;
                  setFormValues((prev) => ({ ...prev, name: event.target.value }));
                  setFormErrors((prev) => ({ ...prev, name: "" }));
                }}
                height={44}
                placeholder="Name"
                required={dialogMode !== "view"}
                disabled={dialogMode === "view"}
              />
              {formErrors.name && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.name}</p>}
            </div>

            {dialogMode === "view" ? (
              <div>
                <FormInputField
                  label="Email"
                  value={formValues.email}
                  onChange={() => {}}
                  height={44}
                  placeholder="Email"
                  disabled={true}
                />
              </div>
            ) : (
              <div>
                <FormSelectField
                  label="Gender"
                  value={formValues.gender}
                  onChange={(value) => {
                    setFormValues((prev) => ({
                      ...prev,
                      gender: Array.isArray(value) ? value[0] : value || "",
                    }));
                    setFormErrors((prev) => ({ ...prev, gender: "" }));
                  }}
                  options={genderOptions}
                  placeholder="Gender"
                  mode="single"
                  background="white"
                />
                {formErrors.gender && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.gender}</p>}
              </div>
            )}

            {dialogMode === "view" ? (
              <div>
                <FormInputField
                  label="Gender"
                  value={formValues.gender}
                  onChange={() => {}}
                  height={44}
                  placeholder="Gender"
                  disabled={true}
                />
              </div>
            ) : (
              <div>
                <FormInputField
                  label="Email"
                  value={formValues.email}
                  onChange={(event) => {
                    setFormValues((prev) => ({ ...prev, email: event.target.value }));
                    setFormErrors((prev) => ({ ...prev, email: "" }));
                  }}
                  height={44}
                  placeholder="Email"
                  required
                  type="email"
                />
                {formErrors.email && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.email}</p>}
              </div>
            )}

            {dialogMode === "view" ? (
              <div>
                <FormInputField
                  label="User Name"
                  value={formValues.username}
                  onChange={() => {}}
                  height={44}
                  placeholder="User Name"
                  disabled={true}
                />
              </div>
            ) : (
              <div>
                <FormInputField
                  label="Phone Number"
                  value={formValues.phone}
                  onChange={(event) => {
                    setFormValues((prev) => ({ ...prev, phone: event.target.value }));
                    setFormErrors((prev) => ({ ...prev, phone: "" }));
                  }}
                  height={44}
                  placeholder="Phone Number"
                  required
                  type="tel"
                />
                {formErrors.phone && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.phone}</p>}
              </div>
            )}

            {dialogMode === "view" ? (
              <div>
                <FormInputField
                  label="Group"
                  value={formValues.group}
                  onChange={() => {}}
                  height={44}
                  placeholder="Group"
                  disabled={true}
                />
              </div>
            ) : (
              <div>
                <FormInputField
                  label="User Name"
                  value={formValues.username}
                  onChange={(event) => {
                    setFormValues((prev) => ({ ...prev, username: event.target.value }));
                    setFormErrors((prev) => ({ ...prev, username: "" }));
                  }}
                  height={44}
                  placeholder="User Name"
                  required
                />
                <p className="mt-1 text-xs text-[#7B8089]">(Username length should be min 6 letter)</p>
                {formErrors.username && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.username}</p>}
              </div>
            )}

            {dialogMode === "view" ? (
              <>
                <div>
                  <FormInputField
                    label="Phone Number"
                    value={formValues.phone}
                    onChange={() => {}}
                    height={44}
                    placeholder="Phone Number"
                    disabled={true}
                  />
                </div>
                <div>
                  <FormInputField
                    label="Manager"
                    value={formValues.manager}
                    onChange={() => {}}
                    height={44}
                    placeholder="Manager"
                    disabled={true}
                  />
                </div>
                <div>
                  <FormInputField
                    label="Status"
                    value={formValues.status}
                    onChange={() => {}}
                    height={44}
                    placeholder="Status"
                    disabled={true}
                  />
                </div>
                <div>
                  <FormInputField
                    label="Created At"
                    value={selectedFieldUser?.createdAt || ""}
                    onChange={() => {}}
                    height={44}
                    placeholder="Created At"
                    disabled={true}
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <div className="relative [&>div>div]:relative">
                    <FormInputField
                      label="Password"
                      value={formValues.password}
                      onChange={(event) => {
                        setFormValues((prev) => ({ ...prev, password: event.target.value }));
                        setFormErrors((prev) => ({ ...prev, password: "" }));
                      }}
                      height={44}
                      placeholder="Password"
                      required={dialogMode === "add"}
                      type={showPassword ? "text" : "password"}
                      className="pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-[12px] flex h-5 w-5 items-center justify-center"
                    >
                      <Image
                        src={showPassword ? "/icons/openEye.svg" : "/icons/closeEye.svg"}
                        alt={showPassword ? "Hide password" : "Show password"}
                        width={20}
                        height={20}
                      />
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-[#7B8089]">(Password length should be min 6 letter)</p>
                  {formErrors.password && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.password}</p>}
                </div>

                <div>
                  <FormSelectField
                    label="Status"
                    value={formValues.status}
                    onChange={(value) => {
                      setFormValues((prev) => ({
                        ...prev,
                        status: Array.isArray(value) ? value[0] : value || "Active",
                      }));
                      setFormErrors((prev) => ({ ...prev, status: "" }));
                    }}
                    options={statusOptions}
                    placeholder="Status"
                    mode="single"
                    background="white"
                  />
                  {formErrors.status && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.status}</p>}
                </div>

                <div>
                  <FormSelectField
                    label="Group"
                    value={formValues.group}
                    onChange={(value) => {
                      setFormValues((prev) => ({
                        ...prev,
                        group: Array.isArray(value) ? value[0] : value || "",
                      }));
                      setFormErrors((prev) => ({ ...prev, group: "" }));
                    }}
                    options={groupOptions}
                    placeholder="Select Group"
                    mode="single"
                    background="white"
                  />
                  {formErrors.group && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.group}</p>}
                </div>

                <div className="col-span-2">
                  <FormSelectField
                    label="Branch"
                    value={formValues.branch}
                    onChange={(value) => {
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
                  />
                  {formErrors.branch && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.branch}</p>}
                </div>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {dialogMode === "view" ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogMode(null);
                  setFormErrors({});
                  setSelectedFieldUser(null);
                  setShowPassword(false);
                }}
              >
                Close
              </Button>
            ) : (
              <>
                <Button type="submit" variant="primary">
                  {dialogMode === "add" ? "Add Field User" : "Update Field User"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogMode(null);
                    setFormErrors({});
                    setSelectedFieldUser(null);
                    setShowPassword(false);
                  }}
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </form>
      </Dialog>
    </AppShell>
  );
}


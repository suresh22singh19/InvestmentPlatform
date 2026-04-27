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
  RefreshButton,
} from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import type { SelectOption } from "@/components/ui/FormSelectField";

type Module = {
  id: number;
  moduleName: string;
  moduleBranch: string[];
  groups: string;
  status: "Active" | "Inactive";
  createdAt: string;
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
  { value: "gate-keeper", label: "Gate Keeper" },
  { value: "receptionist", label: "Receptionist" },
  { value: "admin", label: "Admin" },
];

const statusOptions: SelectOption[] = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
];

const initialModules: Module[] = [
  {
    id: 1,
    moduleName: "Gate",
    moduleBranch: ["MURAD NAGAR UP", "MURAD NAGAR UP", "MURAD NAGAR UP"],
    groups: "Gate Keeper",
    status: "Active",
    createdAt: "2025-06-27 15:45:17",
  },
  {
    id: 2,
    moduleName: "Gate",
    moduleBranch: ["MURAD NAGAR UP", "MURAD NAGAR UP", "MURAD NAGAR UP"],
    groups: "Gate Keeper",
    status: "Active",
    createdAt: "2025-06-27 15:45:17",
  },
  {
    id: 3,
    moduleName: "Gate",
    moduleBranch: ["MURAD NAGAR UP", "MURAD NAGAR UP", "MURAD NAGAR UP"],
    groups: "Gate Keeper",
    status: "Inactive",
    createdAt: "2025-06-27 15:45:17",
  },
  {
    id: 4,
    moduleName: "Gate",
    moduleBranch: ["MURAD NAGAR UP", "MURAD NAGAR UP", "MURAD NAGAR UP"],
    groups: "Gate Keeper",
    status: "Active",
    createdAt: "2025-06-27 15:45:17",
  },
  {
    id: 5,
    moduleName: "Gate",
    moduleBranch: ["MURAD NAGAR UP", "MURAD NAGAR UP", "MURAD NAGAR UP"],
    groups: "Gate Keeper",
    status: "Active",
    createdAt: "2025-06-27 15:45:17",
  },
  {
    id: 6,
    moduleName: "Gate",
    moduleBranch: ["MURAD NAGAR UP", "MURAD NAGAR UP", "MURAD NAGAR UP"],
    groups: "Gate Keeper",
    status: "Active",
    createdAt: "2025-06-27 15:45:17",
  },
];

export default function ModuleSettingsPage() {
  const [modules, setModules] = useState<Module[]>(initialModules);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [formValues, setFormValues] = useState({
    moduleName: "",
    branch: [] as string[],
    groups: "",
    status: "Active" as "Active" | "Inactive",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const filteredModules = useMemo(() => {
    return modules.filter((module) => {
      const matchesSearch =
        module.moduleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        module.groups.toLowerCase().includes(searchTerm.toLowerCase()) ||
        module.moduleBranch.some((branch) => branch.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch;
    });
  }, [modules, searchTerm]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedModules = filteredModules.slice(startIndex, startIndex + itemsPerPage);

  const handleAdd = () => {
    setSelectedModule(null);
    setFormValues({
      moduleName: "",
      branch: [],
      groups: "",
      status: "Active",
    });
    setFormErrors({});
    setAddDialogOpen(true);
  };

  const handleEdit = (module: Module) => {
    setSelectedModule(module);
    setFormValues({
      moduleName: module.moduleName,
      branch: module.moduleBranch,
      groups: module.groups,
      status: module.status,
    });
    setFormErrors({});
    setEditDialogOpen(true);
  };

  const handleView = (module: Module) => {
    setSelectedModule(module);
    setViewDialogOpen(true);
  };

  const handleRefresh = () => {
    // Refresh logic here
    console.log("Refreshing modules...");
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formValues.moduleName.trim()) errors.moduleName = "Module Name is required";
    if (formValues.branch.length === 0) errors.branch = "At least one branch is required";
    if (!formValues.groups) errors.groups = "Groups is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;

    if (selectedModule) {
      setModules((prev) =>
        prev.map((module) =>
          module.id === selectedModule.id
            ? {
                ...module,
                moduleName: formValues.moduleName.trim(),
                moduleBranch: formValues.branch,
                groups: formValues.groups,
                status: formValues.status,
              }
            : module
        )
      );
      setEditDialogOpen(false);
    } else {
      const newModule: Module = {
        id: modules.length + 1,
        moduleName: formValues.moduleName.trim(),
        moduleBranch: formValues.branch,
        groups: formValues.groups,
        status: formValues.status,
        createdAt: new Date().toLocaleString("en-IN", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).replace(/,/g, ""),
      };
      setModules((prev) => [...prev, newModule]);
      setAddDialogOpen(false);
    }

    setSelectedModule(null);
    setFormValues({
      moduleName: "",
      branch: [],
      groups: "",
      status: "Active",
    });
    setFormErrors({});
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

  const formatBranchDisplay = (branches: string[]) => {
    if (branches.length === 0) return "";
    if (branches.length <= 3) return branches.join(", ");
    return `${branches.slice(0, 3).join(", ")}, ...`;
  };

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <PageHeading title="Modules" />
        </div>

        <ListBorder as="section" className="px-4 py-4">
          <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <h2 className="text-lg font-semibold leading-[120%] text-[#434956]"></h2>

              <div className="flex flex-wrap items-center gap-3">
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
                    <span className="text-hide">Add Modules</span>
                  </button>
                </div>

                <div className="w-full lg:w-auto">
                  <RefreshButton onClick={handleRefresh} />
                </div>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead position="first" sortable sortDirection={null} onSort={() => {}}>
                    Sr no.
                  </TableHead>
                  <TableHead sortable sortDirection={null} onSort={() => {}}>
                    Module Name
                  </TableHead>
                  <TableHead sortable sortDirection={null} onSort={() => {}}>
                    Module Branch
                  </TableHead>
                  <TableHead sortable sortDirection={null} onSort={() => {}}>
                    Module Status
                  </TableHead>
                  <TableHead sortable sortDirection={null} onSort={() => {}}>
                    Created At
                  </TableHead>
                  <TableHead position="last">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedModules.length === 0 ? (
                  <TableRow>
                    <TableData colSpan={6} className="py-12 text-center text-sm text-[#9CA3AF]">
                      No modules found
                    </TableData>
                  </TableRow>
                ) : (
                  paginatedModules.map((module, index) => (
                    <TableRow key={module.id}>
                      <TableData position="first">{startIndex + index + 1}</TableData>
                      <TableData>{module.moduleName}</TableData>
                      <TableData>
                        <span className="text-sm font-medium leading-[120%] text-[#262D3B]">
                          {formatBranchDisplay(module.moduleBranch)}
                        </span>
                      </TableData>
                      <TableData>
                        <span
                          className={`inline-flex h-[30px] min-w-[86px] items-center justify-center rounded-[30px] border px-5 text-xs font-medium leading-[120%] ${getStatusBadgeClass(
                            module.status
                          )}`}
                        >
                          {module.status}
                        </span>
                      </TableData>
                      <TableData>{module.createdAt}</TableData>
                      <TableData position="last">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleView(module)}
                            className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                            aria-label="View module"
                          >
                            <Image src="/icons/ViewEyeIcon.svg" alt="View" width={20} height={20} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEdit(module)}
                            className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                            aria-label="Edit module"
                          >
                            <Image src="/icons/EditIconBlack.svg" alt="Edit" width={20} height={20} />
                          </button>
                        </div>
                      </TableData>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {filteredModules.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={filteredModules.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(items) => {
                  setItemsPerPage(items);
                  setCurrentPage(1);
                }}
                itemsPerPageOptions={[10, 20, 50, 100]}
              />
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
          setSelectedModule(null);
        }}
        title={selectedModule ? "Update Module" : "Add Module"}
        width={949}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <FormInputField
              label="Module Name"
              value={formValues.moduleName}
              onChange={(event) => {
                setFormValues((prev) => ({ ...prev, moduleName: event.target.value }));
                setFormErrors((prev) => ({ ...prev, moduleName: "" }));
              }}
              height={44}
              placeholder="Module Name"
            />
            {formErrors.moduleName && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.moduleName}</p>}
          </div>

          <div>
            <FormSelectField
              label="Branch"
              value={formValues.branch}
              onChange={(value) => {
                const next = Array.isArray(value) ? value : [value].filter(Boolean);
                setFormValues((prev) => ({ ...prev, branch: next }));
                setFormErrors((prev) => ({ ...prev, branch: "" }));
              }}
              options={branchOptions}
              placeholder="Branch"
              mode="multiple"
              background="white"
            />
            {formErrors.branch && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.branch}</p>}
            {formValues.branch.length > 0 && (
              <p className="mt-2 text-xs text-[#7B8089]">
                {formValues.branch.length} branch{formValues.branch.length > 1 ? "es" : ""} selected
              </p>
            )}
          </div>

          <div>
            <FormSelectField
              label="Groups"
              value={formValues.groups}
              onChange={(value) => {
                const next = Array.isArray(value) ? value[0] : value;
                setFormValues((prev) => ({ ...prev, groups: next || "" }));
                setFormErrors((prev) => ({ ...prev, groups: "" }));
              }}
              options={groupOptions}
              placeholder="Groups"
              mode="single"
              background="white"
            />
            {formErrors.groups && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.groups}</p>}
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

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="primary">
              {selectedModule ? "Update Module" : "Add Module"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAddDialogOpen(false);
                setEditDialogOpen(false);
                setFormErrors({});
                setSelectedModule(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Dialog>

      {/* View Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => {
          setViewDialogOpen(false);
          setSelectedModule(null);
        }}
        title="View Module"
        width={992}
      >
        {selectedModule && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium leading-[120%] text-[#7B8089]">Module Name</p>
                <p className="mt-1 text-sm font-semibold leading-[120%] text-[#262D3B]">{selectedModule.moduleName}</p>
              </div>
              <div>
                <p className="text-xs font-medium leading-[120%] text-[#7B8089]">Branch</p>
                <p className="mt-1 text-sm font-semibold leading-[120%] text-[#262D3B]">
                  {selectedModule.moduleBranch.join(", ")}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium leading-[120%] text-[#7B8089]">Status</p>
                <p className="mt-1">
                  <span
                    className={`inline-flex h-[30px] min-w-[86px] items-center justify-center rounded-[30px] border px-5 text-xs font-medium leading-[120%] ${getStatusBadgeClass(
                      selectedModule.status
                    )}`}
                  >
                    {selectedModule.status}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs font-medium leading-[120%] text-[#7B8089]">Created At</p>
                <p className="mt-1 text-sm font-semibold leading-[120%] text-[#262D3B]">{selectedModule.createdAt}</p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setViewDialogOpen(false);
                  setSelectedModule(null);
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


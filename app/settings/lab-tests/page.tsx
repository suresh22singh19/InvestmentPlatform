"use client";

import Image from "next/image";
import { useMemo, useState, useEffect } from "react";
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
  Tabs,
  Tooltip,
} from "@/components/ui";
import { PatientTypeButtonGroup } from "@/components/ui/PatientTypeButtonGroup";
import { ListBorder } from "@/components/ui/ListBorder";
import type { SelectOption } from "@/components/ui/FormSelectField";
import { useGetBranchesQuery, useGetLabTestsQuery, useGetLabTestsByBranchQuery, useGetLabTestQuery, useGetLabTestGroupsQuery, useGetLabTestCategoriesQuery, useUpdateLabTestMutation, useUpdateLabTestByBranchMutation } from "@/store/api/settingsApi";
import { useDebounce } from "@/hooks/useDebounce";
import { usePermission } from "@/hooks/usePermission";
import { useBranchFilter } from "@/hooks/useBranchFilter";

type LabTestStatus = "Active" | "Inactive" | "Pending";

type LabTest = {
  id: number;
  testName: string;
  description: string;
  price: string;
  status: LabTestStatus;
  updatedAt: string;
  privateUpdatedAt?: string;
  panelUpdatedAt?: string;
  tpaUpdatedAt?: string;
  groupId?: number;
  groupName?: string;
  categoryName?: string;
  // For "All" tab: separate price/status per type
  privatePrice?: string;
  privateStatus?: LabTestStatus;
  panelPrice?: string;
  panelStatus?: LabTestStatus;
  tpaPrice?: string;
  tpaStatus?: LabTestStatus;
};

const statusOptions: SelectOption[] = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
  { value: "Pending", label: "Pending" },
];

function formatPrice(n: number): string {
  return `₹ ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function capitalizeStatus(s: string): LabTestStatus {
  if (!s) return "Pending";
  const lower = s.toLowerCase();
  if (lower === "active") return "Active";
  if (lower === "inactive") return "Inactive";
  return (s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()) as LabTestStatus;
}

function formatDateOnly(iso: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function LabTestsPage() {
  const labTestsPermission = usePermission("settings", { subModule: "lab-tests" });
  const canView = labTestsPermission.canView;
  const canAdd = labTestsPermission.canAdd;
  const canEdit = labTestsPermission.canEdit;

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [dialogMode, setDialogMode] = useState<"add" | "edit" | "view" | null>(null);
  const [selectedLabTest, setSelectedLabTest] = useState<LabTest | null>(null);
  const [formValues, setFormValues] = useState({
    testName: "",
    description: "",
    fee: "",
    status: "Active" as LabTestStatus,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const {
    selectedBranchFilter: selectedBranch,
    setSelectedBranchFilter: setSelectedBranch,
    branchFilterOptions: hookBranchFilterOptions,
    isLoadingBranches: isLoadingBranchFilter,
    isBranchFilterDisabled,
    filterBranchId: hookFilterBranchId,
    isSuperAdmin: isBranchFilterSuperAdmin,
  } = useBranchFilter();
  const [selectedTestName, setSelectedTestName] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("private");

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedBranch, selectedGroupId, selectedCategory, selectedTestName]);

  const panelTabOptions = [
    { value: "private", label: "Private" },
    { value: "panel", label: "Panel" },
    { value: "tpa", label: "TPA" },
    { value: "all", label: "All" },
  ];

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const { data: branchesData, isLoading: isLoadingBranches } = useGetBranchesQuery(undefined, {
    skip: !canView && !canAdd && !canEdit,
  });

  /** Super admin: hide "All Branches"; list only real branches (first is default). */
  const branchFilterDisplayOptions = useMemo((): SelectOption[] => {
    if (!isBranchFilterSuperAdmin) return hookBranchFilterOptions;
    return hookBranchFilterOptions.filter((o) => o.value !== "");
  }, [hookBranchFilterOptions, isBranchFilterSuperAdmin]);

  useEffect(() => {
    if (!isBranchFilterSuperAdmin) return;
    if (isLoadingBranchFilter || isLoadingBranches) return;
    const rows = branchesData?.data;
    if (!Array.isArray(rows) || rows.length === 0) return;
    if (selectedBranch !== "") return;
    setSelectedBranch(String(rows[0].id));
  }, [
    isBranchFilterSuperAdmin,
    isLoadingBranchFilter,
    isLoadingBranches,
    branchesData,
    selectedBranch,
    setSelectedBranch,
  ]);
  const { data: groupsData, isLoading: isLoadingGroups } = useGetLabTestGroupsQuery(undefined, {
    skip: !canView && !canAdd && !canEdit,
  });
  const { data: categoriesData, isLoading: isLoadingCategories } = useGetLabTestCategoriesQuery(undefined, {
    skip: !canView && !canAdd && !canEdit,
  });

  const selectedBranchId = hookFilterBranchId ?? null;
  const isBranchIdValid = selectedBranchId != null;

  const {
    data: labTestsDataAll,
    isLoading: isLoadingLabTestsAll,
    refetch: refetchLabTestsAll,
  } = useGetLabTestsQuery(
    {
      page: currentPage,
      limit: itemsPerPage,
      search: debouncedSearchTerm || undefined,
      sort: "createdAt",
      group: selectedGroupId || undefined,
      category: selectedCategory || undefined,
    },
    { skip: isBranchIdValid || !canView }
  );

  const {
    data: labTestsDataBranch,
    isLoading: isLoadingLabTestsBranch,
    refetch: refetchLabTestsBranch,
  } = useGetLabTestsByBranchQuery(
    {
      branchId: selectedBranchId!,
      page: currentPage,
      limit: itemsPerPage,
      search: debouncedSearchTerm || undefined,
      sort: "createdAt",
      group: selectedGroupId || undefined,
      category: selectedCategory || undefined,
    },
    {
      skip: !isBranchIdValid || !canView,
      refetchOnMountOrArgChange: true,
    }
  );

  const labTestsData = isBranchIdValid ? labTestsDataBranch : labTestsDataAll;
  const isLoadingLabTests = isBranchIdValid ? isLoadingLabTestsBranch : isLoadingLabTestsAll;
  const refetchLabTests = isBranchIdValid ? refetchLabTestsBranch : refetchLabTestsAll;

  const [updateLabTest, { isLoading: isUpdatingLabTest }] = useUpdateLabTestMutation();
  const [updateLabTestByBranch, { isLoading: isUpdatingLabTestByBranch }] = useUpdateLabTestByBranchMutation();

  const selectedLabTestId = selectedLabTest?.id;
  useGetLabTestQuery(selectedLabTestId!, {
    skip: !selectedLabTestId || dialogMode !== "edit",
  });

  const branchOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: "None" },
      ...(branchesData?.data ?? []).map((branch) => ({
        value: branch.id.toString(),
        label: branch.name,
      })),
    ],
    [branchesData?.data]
  );

  const toNum = (v: number | string | undefined): number =>
    typeof v === "string" ? parseFloat(v) || 0 : v ?? 0;

  const labTests: LabTest[] = useMemo(() => {
    if (!labTestsData?.data) return [];
    return labTestsData.data.map((item) => ({
      id: item.id,
      testName: item.testName,
      description: item.testDescription ?? "",
      price: formatPrice(toNum(item.testFee)),
      status: capitalizeStatus(item.status),
      updatedAt: formatDateOnly(
        item.updatedAt ?? item.updated_at ?? item.createdAt ?? item.created_at ?? ""
      ),
      privateUpdatedAt: formatDateOnly(
        item.testFeeLastUpdatedAt ?? ""
      ),
      panelUpdatedAt: formatDateOnly(
        item.panelPriceLastUpdatedAt ??
          item.updatedAt ??
          item.updated_at ??
          item.createdAt ??
          item.created_at ??
          ""
      ),
      tpaUpdatedAt: formatDateOnly(
        item.tpaPriceLastUpdatedAt ??
          item.updatedAt ??
          item.updated_at ??
          item.createdAt ??
          item.created_at ??
          ""
      ),
      groupName: item.groupName,
      categoryName: item.categoryName,
      privatePrice: formatPrice(toNum(item.testFee)),
      privateStatus: capitalizeStatus(item.status),
      panelPrice: formatPrice(toNum(item.panelPrice)),
      panelStatus: capitalizeStatus(item.panelStatus),
      tpaPrice: formatPrice(toNum(item.tpaPrice)),
      tpaStatus: capitalizeStatus(item.tpaStatus),
    }));
  }, [labTestsData?.data]);

  const filteredLabTests = useMemo(() => {
    return labTests.filter((test) => {
      const matchesTestName = !selectedTestName || test.testName === selectedTestName;
      const matchesCategory = !selectedCategory || test.categoryName === selectedCategory;
      const matchesGroup = !selectedGroupId || test.groupName === selectedGroupId;
      return matchesTestName && matchesCategory && matchesGroup;
    });
  }, [labTests, selectedTestName, selectedCategory, selectedGroupId]);

  const totalItems = labTestsData?.total ?? labTestsData?.data?.length ?? 0;
  const paginatedLabTests = filteredLabTests;
  const startIndex = (currentPage - 1) * itemsPerPage;

  const testNameOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: "All Tests" },
      ...labTests.map((test) => ({ value: test.testName, label: test.testName })),
    ],
    [labTests]
  );

  const groupOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: "None" },
      ...(groupsData?.data ?? []).map((name) => ({ value: name, label: name })),
    ],
    [groupsData?.data]
  );

  const categoryOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: "None" },
      ...(categoriesData?.data ?? []).map((name) => ({ value: name, label: name })),
    ],
    [categoriesData?.data]
  );

  const handleAddNew = () => {
    if (!canAdd) return;
    setFormValues({
      testName: "",
      description: "",
      fee: "",
      status: "Active",
    });
    setFormErrors({});
    setSelectedLabTest(null);
    setDialogMode("add");
  };

  const handleEdit = (test: LabTest) => {
    if (!canEdit) return;
    setSelectedLabTest(test);
    const priceForTab =
      activeTab === "panel"
        ? (test.panelPrice ?? test.price)
        : activeTab === "tpa"
          ? (test.tpaPrice ?? test.price)
          : test.price;
    const statusForTab =
      activeTab === "panel"
        ? (test.panelStatus ?? test.status)
        : activeTab === "tpa"
          ? (test.tpaStatus ?? test.status)
          : test.status;
    const feeRaw = (priceForTab || "").replace(/[₹,\s]/g, "") || "";
    setFormValues({
      testName: test.testName,
      description: test.description ?? "",
      fee: feeRaw,
      status: statusForTab,
    });
    setFormErrors({});
    setDialogMode("edit");
  };

  const handleView = (test: LabTest) => {
    if (!canView) return;
    setSelectedLabTest(test);
    setDialogMode("view");
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formValues.testName.trim()) errors.testName = "Test name is required";
    if (!formValues.description.trim()) errors.description = "Description is required";
    if (!formValues.fee.trim()) errors.fee = "Fee is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const parsePriceFromFormatted = (s: string | undefined): number => {
    if (!s) return 0;
    const num = parseFloat((s || "").replace(/[₹,\s]/g, ""));
    return isNaN(num) ? 0 : num;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (dialogMode === "add" && !canAdd) return;
    if (dialogMode === "edit" && !canEdit) return;

    if (dialogMode === "edit" && selectedLabTest) {
      if (activeTab === "panel" || activeTab === "tpa") {
        if (!formValues.fee.trim()) {
          setFormErrors((prev) => ({ ...prev, fee: "Fee is required" }));
          return;
        }
      }
      const statusVal = formValues.status.toLowerCase() as "active" | "inactive";
      try {
        if (isBranchIdValid && selectedBranchId != null) {
          // Branch selected: send only the field(s) for the current tab (one thing at a time)
          const branchPayload: {
            branchId: number;
            id: number;
            status?: string;
            tpaPrice?: number;
            tpaStatus?: string;
            panelPrice?: number;
            panelStatus?: string;
          } = { branchId: selectedBranchId, id: selectedLabTest.id };
          if (activeTab === "private") {
            branchPayload.status = statusVal;
          } else if (activeTab === "tpa") {
            branchPayload.tpaPrice = parseFloat(formValues.fee) || 0;
            branchPayload.tpaStatus = statusVal;
          } else if (activeTab === "panel") {
            branchPayload.panelPrice = parseFloat(formValues.fee) || 0;
            branchPayload.panelStatus = statusVal;
          }
          await updateLabTestByBranch(branchPayload).unwrap();
        } else {
          const payload: { id: number; status?: string; tpaPrice?: number; tpaStatus?: string; panelPrice?: number; panelStatus?: string } = {
            id: selectedLabTest.id,
          };
          if (activeTab === "private") {
            payload.status = statusVal;
          } else if (activeTab === "tpa") {
            payload.tpaPrice = parseFloat(formValues.fee) || 0;
            payload.tpaStatus = statusVal;
          } else if (activeTab === "panel") {
            payload.panelPrice = parseFloat(formValues.fee) || 0;
            payload.panelStatus = statusVal;
          }
          await updateLabTest(payload).unwrap();
        }
        setDialogMode(null);
        setFormValues({ testName: "", description: "", fee: "", status: "Active" });
        setFormErrors({});
        setSelectedLabTest(null);
        refetchLabTests();
      } catch {
        setFormErrors((prev) => ({ ...prev, fee: "Update failed. Please try again." }));
      }
      return;
    }
    if (dialogMode === "add") {
      if (!validateForm()) return;
      // TODO: call create lab test API when available
    }

    setDialogMode(null);
    setFormValues({
      testName: "",
      description: "",
      fee: "",
      status: "Active",
    });
    setFormErrors({});
    setSelectedLabTest(null);
    refetchLabTests();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  const getStatusBadgeClass = (status: LabTestStatus) => {
    switch (status) {
      case "Active":
        return "border-[#0B8C00]/20 bg-[#0B8C000D] text-[#0B8C00]";
      case "Inactive":
        return "border-[#F6776E]/24 bg-[#F6776E0D] text-[#F6776E]";
      case "Pending":
        return "border-[#FDC70F]/60 bg-[#FDC70F0D] text-[#9A7909]";
      default:
        return "";
    }
  };

  const isPrivateEdit = dialogMode === "edit" && activeTab === "private";
  const isPanelOrTpaEdit = dialogMode === "edit" && (activeTab === "panel" || activeTab === "tpa");
  const isAllView = dialogMode === "view" && activeTab === "all";

  const dialogTitle =
    dialogMode === "add"
      ? "Add Lab Tests"
      : isAllView
        ? "View Lab Tests"
        : dialogMode === "edit"
          ? "Edit Lab Tests"
          : "View Lab Test";

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <PageHeading title="Lab Tests" />
        </div>

        <ListBorder as="section" className="px-4 py-4">
          {!canView ? (
            <div className="rounded-[20px] border border-[#E3EEE1] bg-white px-6 py-10 text-center text-sm text-[#9CA3AF]">
              You don&apos;t have permission to view lab tests.
            </div>
          ) : (
          <>
          <div className="mb-4 w-full max-w-[600px]">
            <Tabs options={panelTabOptions} value={activeTab} onChange={handleTabChange} />
          </div>
          <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold leading-[120%] text-[#434956]"></h2>
              <div className="flex flex-wrap items-center gap-3 min-w-0 flex-1 justify-end">
                <div className="flex-[1_1_300px] min-w-[200px] max-w-[260px]">
                  <FormSelectField
                    label=""
                    options={branchFilterDisplayOptions}
                    mode="single"
                    value={selectedBranch}
                    onChange={(val) => setSelectedBranch(typeof val === "string" ? val : val?.[0] ?? "")}
                    placeholder={isLoadingBranchFilter ? "Loading..." : "Select Branch"}
                    disabled={isBranchFilterDisabled || isLoadingBranchFilter}
                    width="100%"
                    height={44}
                  />
                </div>
                <div className="flex-[1_1_300px] min-w-[200px] max-w-[260px]">
                  <FormSelectField
                    label=""
                    options={groupOptions}
                    mode="single"
                    value={selectedGroupId}
                    onChange={(val) => setSelectedGroupId(typeof val === "string" ? val : val?.[0] ?? "")}
                    placeholder={isLoadingGroups ? "Loading..." : "Select group"}
                    width="100%"
                    height={44}
                  />
                </div>
                <div className="flex-[1_1_300px] min-w-[200px] max-w-[260px]">
                  <FormSelectField
                    label=""
                    options={categoryOptions}
                    mode="single"
                    value={selectedCategory}
                    onChange={(val) => setSelectedCategory(typeof val === "string" ? val : val?.[0] ?? "")}
                    placeholder={isLoadingCategories ? "Loading..." : "Select Category"}
                    width="100%"
                    height={44}
                  />
                </div>

                <div className="flex-[1_1_300px] min-w-[200px] max-w-[260px] relative z-10">
                  <TableSearchInput
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="Search Here..."
                  />
                </div>
                {/* {canAdd ? (
                  <button
                    type="button"
                    className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] whitespace-nowrap"
                    onClick={handleAddNew}
                  >
                    <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                    <span>Add Lab Test</span>
                  </button>
                ) : null} */}
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead position="first" className="whitespace-nowrap">
                    Sr no.
                  </TableHead>
                  <TableHead>Group Name</TableHead>
                  <TableHead>Category Name</TableHead>
                  <TableHead>Test Name</TableHead>
                  {activeTab === "all" ? (
                    <>
                      <TableHead>Private Price</TableHead>
                      <TableHead>Private Status</TableHead>
                      <TableHead>Panel Price</TableHead>
                      <TableHead>Panel Status</TableHead>
                      <TableHead>TPA Price</TableHead>
                      <TableHead>TPA Status</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                    </>
                  )}
                  <TableHead>{activeTab === "all" ? "Last Synced" : "Updated At"}</TableHead>
                  {(activeTab === "all" ? canView : canEdit) ? (
                    <TableHead position="last">Action</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingLabTests ? (
                  <TableRow>
                    <TableData
                      colSpan={activeTab === "all" ? ((activeTab === "all" ? canView : canEdit) ? 12 : 11) : ((activeTab === "all" ? canView : canEdit) ? 8 : 7)}
                      className="py-12 text-center text-sm text-[#9CA3AF]"
                    >
                      Loading...
                    </TableData>
                  </TableRow>
                ) : paginatedLabTests.length === 0 ? (
                  <TableRow>
                    <TableData
                      colSpan={activeTab === "all" ? ((activeTab === "all" ? canView : canEdit) ? 12 : 11) : ((activeTab === "all" ? canView : canEdit) ? 8 : 7)}
                      className="py-12 text-center text-sm text-[#9CA3AF]"
                    >
                      No lab tests found
                    </TableData>
                  </TableRow>
                ) : (
                  paginatedLabTests.map((test, index) => (
                    <TableRow key={test.id}>
                      <TableData position="first">{startIndex + index + 1}</TableData>
                      <TableData>{test.groupName ?? "—"}</TableData>
                      <TableData>{test.categoryName ?? "—"}</TableData>
                      <TableData>{test.testName}</TableData>
                      {activeTab === "all" ? (
                        <>
                          <TableData className="whitespace-nowrap">{test.privatePrice ?? test.price}</TableData>
                          <TableData>
                            <span
                              className={`inline-flex h-[30px] min-w-[86px] items-center justify-center rounded-[30px] border px-5 text-xs font-medium leading-[120%] ${getStatusBadgeClass(test.privateStatus ?? test.status)}`}
                            >
                              {test.privateStatus ?? test.status}
                            </span>
                          </TableData>
                          <TableData className="whitespace-nowrap">{test.panelPrice ?? test.price}</TableData>
                          <TableData>
                            <span
                              className={`inline-flex h-[30px] min-w-[86px] items-center justify-center rounded-[30px] border px-5 text-xs font-medium leading-[120%] ${getStatusBadgeClass(test.panelStatus ?? test.status)}`}
                            >
                              {test.panelStatus ?? test.status}
                            </span>
                          </TableData>
                          <TableData className="whitespace-nowrap">{test.tpaPrice ?? test.price}</TableData>
                          <TableData>
                            <span
                              className={`inline-flex h-[30px] min-w-[86px] items-center justify-center rounded-[30px] border px-5 text-xs font-medium leading-[120%] ${getStatusBadgeClass(test.tpaStatus ?? test.status)}`}
                            >
                              {test.tpaStatus ?? test.status}
                            </span>
                          </TableData>
                        </>
                      ) : (
                        <>
                          <TableData className="whitespace-nowrap">
                            {activeTab === "private"
                              ? (test.privatePrice ?? test.price)
                              : activeTab === "panel"
                                ? (test.panelPrice ?? test.price)
                                : (test.tpaPrice ?? test.price)}
                          </TableData>
                          <TableData>
                            <span
                              className={`inline-flex h-[30px] min-w-[86px] items-center justify-center rounded-[30px] border px-5 text-xs font-medium leading-[120%] ${getStatusBadgeClass(
                                activeTab === "private"
                                  ? (test.privateStatus ?? test.status)
                                  : activeTab === "panel"
                                    ? (test.panelStatus ?? test.status)
                                    : (test.tpaStatus ?? test.status)
                              )}`}
                            >
                              {activeTab === "private"
                                ? (test.privateStatus ?? test.status)
                                : activeTab === "panel"
                                  ? (test.panelStatus ?? test.status)
                                  : (test.tpaStatus ?? test.status)}
                            </span>
                          </TableData>
                        </>
                      )}
                      <TableData className="whitespace-nowrap">
                        {activeTab === "private"
                          ? (test.privateUpdatedAt ?? test.updatedAt)
                          : activeTab === "panel"
                            ? (test.panelUpdatedAt ?? test.updatedAt)
                            : activeTab === "tpa"
                              ? (test.tpaUpdatedAt ?? test.updatedAt)
                              : test.updatedAt}
                      </TableData>
                      {(activeTab === "all" ? canView : canEdit) ? (
                        <TableData position="last">
                          <div className="flex items-center gap-3">
                            {activeTab === "all" ? (
                              <Tooltip content="View" position="top" delay={0}>
                                <button
                                  type="button"
                                  onClick={() => handleView(test)}
                                  className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                                  aria-label="View lab test"
                                >
                                  <Image src="/icons/ViewEyeIcon.svg" alt="View" width={20} height={20} />
                                </button>
                              </Tooltip>
                            ) : (
                              <Tooltip content="Edit" position="top" delay={0}>
                                <button
                                  type="button"
                                  onClick={() => handleEdit(test)}
                                  className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                                  aria-label="Edit lab test"
                                >
                                  <Image
                                    src="/icons/EditIconBlack.svg"
                                    alt="Edit"
                                    width={20}
                                    height={20}
                                  />
                                </button>
                              </Tooltip>
                            )}
                          </div>
                        </TableData>
                      ) : null}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {totalItems > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
                itemsPerPageOptions={[10, 20, 50, 100]}
              />
            )}
          </div>
          </>
          )}
        </ListBorder>
      </div>

      {/* Add / Edit (Private) / Edit (Panel|TPA) / View (All) Dialog */}
      <Dialog
        open={
          (dialogMode === "add" && canAdd) ||
          (dialogMode === "edit" && canEdit) ||
          (dialogMode === "view" && canView)
        }
        onClose={() => {
          setDialogMode(null);
          setFormErrors({});
          setSelectedLabTest(null);
        }}
        title={dialogTitle}
        width={949}
      >
        {isAllView && selectedLabTest ? (
          <>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-[#7B8088]">Group Name</p>
                  <p className="mt-1 text-sm font-medium text-[#262D3B]">{selectedLabTest.groupName ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-[#7B8088]">Test Name</p>
                  <p className="mt-1 text-sm font-medium text-[#262D3B]">{selectedLabTest.testName}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-[#7B8088]">Private Price</p>
                  <p className="mt-1 text-sm font-medium text-[#262D3B]">{selectedLabTest.privatePrice ?? selectedLabTest.price}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-[#7B8088]">Panel Price</p>
                  <p className="mt-1 text-sm font-medium text-[#262D3B]">{selectedLabTest.panelPrice ?? selectedLabTest.price}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-[#7B8088]">TPA Price</p>
                  <p className="mt-1 text-sm font-medium text-[#262D3B]">{selectedLabTest.tpaPrice ?? selectedLabTest.price}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-[#7B8088]">Category Name</p>
                  <p className="mt-1 text-sm font-medium text-[#262D3B]">{selectedLabTest.categoryName ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-[#7B8088]">Private Status</p>
                  <p className="mt-1 text-sm font-medium text-[#262D3B]">{selectedLabTest.privateStatus ?? selectedLabTest.status}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-[#7B8088]">Panel Status</p>
                  <p className="mt-1 text-sm font-medium text-[#262D3B]">{selectedLabTest.panelStatus ?? selectedLabTest.status}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-[#7B8088]">TPA Status</p>
                  <p className="mt-1 text-sm font-medium text-[#262D3B]">{selectedLabTest.tpaStatus ?? selectedLabTest.status}</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <form onSubmit={(dialogMode === "edit" || dialogMode === "add") ? handleSubmit : (e) => e.preventDefault()} className="space-y-6">
            {/* Private tab edit: read-only Group, Test, Category, Price; Status toggle only */}
            {isPrivateEdit && selectedLabTest && (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-medium text-[#7B8088]">Group Name</p>
                  <p className="mt-1 text-sm font-medium text-[#262D3B]">{selectedLabTest.groupName ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-[#7B8088]">Category Name</p>
                  <p className="mt-1 text-sm font-medium text-[#262D3B]">{selectedLabTest.categoryName ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-[#7B8088]">Test Name</p>
                  <p className="mt-1 text-sm font-medium text-[#262D3B]">{selectedLabTest.testName}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-[#7B8088]">Price</p>
                  <p className="mt-1 text-sm font-medium text-[#262D3B]">{selectedLabTest.price}</p>
                </div>
                <div className="w-3/4">
                  <PatientTypeButtonGroup
                    label="Status"
                    options={["Active", "Inactive"]}
                    value={formValues.status.toLowerCase()}
                    onChange={(val) =>
                      setFormValues((prev) => ({ ...prev, status: (val === "active" ? "Active" : "Inactive") as LabTestStatus }))
                    }
                  />
                </div>
              </div>
            )}

            {/* Panel / TPA tab edit: read-only Group, Category, Test Name; editable Price, Status */}
            {isPanelOrTpaEdit && selectedLabTest && (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-medium text-[#7B8088]">Group Name</p>
                  <p className="mt-1 text-sm font-medium text-[#262D3B]">{selectedLabTest.groupName ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-[#7B8088]">Category Name</p>
                  <p className="mt-1 text-sm font-medium text-[#262D3B]">{selectedLabTest.categoryName ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-[#7B8088]">Test Name</p>
                  <p className="mt-1 text-sm font-medium text-[#262D3B]">{selectedLabTest.testName}</p>
                </div>
                <div>
                  <FormInputField
                    label="Price"
                    value={formValues.fee}
                    onChange={(e) => {
                      let v = e.target.value.replace(/[^0-9.]/g, "");
                      const dotCount = (v.match(/\./g) || []).length;
                      if (dotCount > 1) {
                        const [first, ...rest] = v.split(".");
                        v = first + "." + rest.join("").replace(/\./g, "");
                      }
                      setFormValues((prev) => ({ ...prev, fee: v }));
                    }}
                    height={44}
                    placeholder="Price"
                    type="text"
                    inputMode="decimal"
                  />
                  {formErrors.fee && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.fee}</p>}
                </div>
                <div className="w-3/4">
                  <PatientTypeButtonGroup
                    label="Status"
                    options={["Active", "Inactive"]}
                    value={formValues.status.toLowerCase()}
                    onChange={(val) =>
                      setFormValues((prev) => ({ ...prev, status: (val === "active" ? "Active" : "Inactive") as LabTestStatus }))
                    }
                  />
                </div>
              </div>
            )}

            {/* Add mode: full form */}
            {dialogMode === "add" && (
              <div className="space-y-6">
                <div>
                  <FormInputField
                    label="Test Name"
                    value={formValues.testName}
                    onChange={(e) => {
                      setFormValues((prev) => ({ ...prev, testName: e.target.value }));
                      setFormErrors((prev) => ({ ...prev, testName: "" }));
                    }}
                    height={44}
                    placeholder="Test Name"
                    required
                  />
                  {formErrors.testName && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.testName}</p>}
                </div>
                <div>
                  <FormTextareaField
                    label="Description"
                    value={formValues.description}
                    onChange={(e) => {
                      setFormValues((prev) => ({ ...prev, description: e.target.value }));
                      setFormErrors((prev) => ({ ...prev, description: "" }));
                    }}
                    height={94}
                    placeholder="Write a description..."
                    required
                  />
                  {formErrors.description && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.description}</p>}
                </div>
                <div>
                  <FormInputField
                    label="Fee"
                    value={formValues.fee}
                    onChange={(e) => {
                      let v = e.target.value.replace(/[^0-9.]/g, "");
                      const dotCount = (v.match(/\./g) || []).length;
                      if (dotCount > 1) {
                        const [first, ...rest] = v.split(".");
                        v = first + "." + rest.join("").replace(/\./g, "");
                      }
                      setFormValues((prev) => ({ ...prev, fee: v }));
                      setFormErrors((prev) => ({ ...prev, fee: "" }));
                    }}
                    height={44}
                    placeholder="Fee"
                    required
                    type="text"
                    inputMode="decimal"
                  />
                  {formErrors.fee && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.fee}</p>}
                </div>
                <div>
                  <FormSelectField
                    label="Status"
                    value={formValues.status}
                    onChange={(value) =>
                      setFormValues((prev) => ({
                        ...prev,
                        status: (Array.isArray(value) ? value[0] : value || "Active") as LabTestStatus,
                      }))
                    }
                    options={statusOptions}
                    placeholder="Status"
                    mode="single"
                    background="white"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              {dialogMode === "view" && !isAllView ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogMode(null);
                    setFormErrors({});
                    setSelectedLabTest(null);
                  }}
                >
                  Close
                </Button>
              ) : (
                <>
                  <Button type="submit" variant="primary" disabled={isUpdatingLabTest || isUpdatingLabTestByBranch}>
                    {dialogMode === "add" ? "Add Lab Test" : (isUpdatingLabTest || isUpdatingLabTestByBranch) ? "Updating..." : "Update Lab Test"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogMode(null);
                      setFormErrors({});
                      setSelectedLabTest(null);
                    }}
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </form>
        )}
      </Dialog>
    </AppShell>
  );
}


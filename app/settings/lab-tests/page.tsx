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
  MessageDialog,
} from "@/components/ui";
import { PatientTypeButtonGroup } from "@/components/ui/PatientTypeButtonGroup";
import { ListBorder } from "@/components/ui/ListBorder";
import type { SelectOption } from "@/components/ui/FormSelectField";
import { useGetBranchesQuery, useGetLabTestsQuery, useGetLabTestsByBranchQuery, useGetLabTestQuery, useGetLabTestGroupsQuery, useGetLabTestCategoriesQuery, useGetBranchesWithManualLabTestSourceQuery, useUpdateLabTestMutation, useUpdateLabTestByBranchMutation, useCreateLabTestMutation } from "@/store/api/settingsApi";
import { useDebounce } from "@/hooks/useDebounce";
import { usePermission } from "@/hooks/usePermission";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { formatIndianAmount } from "@/store/utils/formatIndianAmount";

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
  testFeeLastUpdatedBy?: string | null;
  panelPriceLastUpdatedBy?: string | null;
  tpaPriceLastUpdatedBy?: string | null;
};

/** API may return camelCase or snake_case for these fields */
type LabTestApiItemRow = {
  testFeeLastUpdatedBy?: string | null;
  panelPriceLastUpdatedBy?: string | null;
  tpaPriceLastUpdatedBy?: string | null;
  test_fee_last_updated_by?: string | null;
  panel_price_last_updated_by?: string | null;
  tpa_price_last_updated_by?: string | null;
};

function formatPriceVal(val?: string | number | null): string {
  if (val === null || val === undefined || val === "" || val === "—") return "—";
  return formatIndianAmount(val);
}

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

function displayUpdatedBy(test: LabTest, tab: string): string {
  if (tab === "private") {
    return test.testFeeLastUpdatedBy?.trim() || "—";
  }
  if (tab === "panel") {
    return test.panelPriceLastUpdatedBy?.trim() || "—";
  }
  if (tab === "tpa") {
    return test.tpaPriceLastUpdatedBy?.trim() || "—";
  }
  return "—";
}

/** List "Last synced" / "Updated at": All → row `updatedAt`; other tabs → that price channel’s last update */
function displayLastSyncDate(test: LabTest, tab: string): string {
  if (tab === "all") return test.updatedAt;
  if (tab === "private") return test.privateUpdatedAt ?? "—";
  if (tab === "panel") return test.panelUpdatedAt ?? "—";
  if (tab === "tpa") return test.tpaUpdatedAt ?? "—";
  return "—";
}

function sanitizeDecimalInput(raw: string): string {
  const value = raw.replace(/[^\d.]/g, "");
  const parts = value.split(".");
  let integerPart = parts[0];
  if (integerPart.startsWith("0") && integerPart.length > 1) {
    integerPart = integerPart.replace(/^0+/, "") || "0";
  }
  if (integerPart.length > 6) {
    integerPart = integerPart.slice(0, 6);
  }
  let fractionalPart = parts[1];
  if (fractionalPart !== undefined) {
    if (fractionalPart.length > 2) {
      fractionalPart = fractionalPart.slice(0, 2);
    }
  }
  return fractionalPart !== undefined ? `${integerPart}.${fractionalPart}` : integerPart;
}

type AddLabTestFormState = {
  branchId: string;
  groupName: string;
  categoryName: string;
  testName: string;
  testDescription: string;
  privatePrice: string;
  privateStatus: "active" | "inactive";
  panelPrice: string;
  panelStatus: "active" | "inactive";
  tpaPrice: string;
  tpaStatus: "active" | "inactive";
};

function emptyAddLabTestForm(): AddLabTestFormState {
  return {
    branchId: "",
    groupName: "",
    categoryName: "",
    testName: "",
    testDescription: "",
    privatePrice: "",
    privateStatus: "active",
    panelPrice: "",
    panelStatus: "active",
    tpaPrice: "",
    tpaStatus: "active",
  };
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
  const [dialogMode, setDialogMode] = useState<"edit" | "view" | null>(null);
  const [isAddLabTestDialogOpen, setIsAddLabTestDialogOpen] = useState(false);
  const [addLabTestForm, setAddLabTestForm] = useState<AddLabTestFormState>(emptyAddLabTestForm);
  const [addLabTestErrors, setAddLabTestErrors] = useState<Record<string, string>>({});
  const [showCreateLabTestSuccessDialog, setShowCreateLabTestSuccessDialog] = useState(false);
  const [createLabTestSuccessMessage, setCreateLabTestSuccessMessage] = useState("");
  const [showCreateLabTestErrorDialog, setShowCreateLabTestErrorDialog] = useState(false);
  const [createLabTestErrorMessage, setCreateLabTestErrorMessage] = useState("");
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

  const selectedBranchRowForLabSource = useMemo(() => {
    if (hookFilterBranchId == null) return undefined;
    const rows = branchesData?.data;
    if (!Array.isArray(rows)) return undefined;
    return rows.find((b) => b.id === hookFilterBranchId);
  }, [hookFilterBranchId, branchesData?.data]);

  const showAddLabTestButton =
    canAdd &&
    hookFilterBranchId != null &&
    String(selectedBranchRowForLabSource?.labTestSource ?? "").toLowerCase() === "manual";

  useEffect(() => {
    if (!isAddLabTestDialogOpen) return;
    if (showAddLabTestButton) return;
    setIsAddLabTestDialogOpen(false);
    setAddLabTestForm(emptyAddLabTestForm());
    setAddLabTestErrors({});
  }, [showAddLabTestButton, isAddLabTestDialogOpen]);

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

  const { data: manualBranchRes, isFetching: isLoadingManualBranches } = useGetBranchesWithManualLabTestSourceQuery(
    undefined,
    { skip: !canAdd || !isAddLabTestDialogOpen }
  );
  const [createLabTest, { isLoading: isCreatingLabTest }] = useCreateLabTestMutation();
  const [updateLabTest, { isLoading: isUpdatingLabTest }] = useUpdateLabTestMutation();
  const [updateLabTestByBranch, { isLoading: isUpdatingLabTestByBranch }] = useUpdateLabTestByBranchMutation();

  const selectedLabTestId = selectedLabTest?.id;
  useGetLabTestQuery(selectedLabTestId!, {
    skip: !selectedLabTestId || dialogMode !== "edit",
  });

  const toNum = (v: number | string | undefined): number =>
    typeof v === "string" ? parseFloat(v) || 0 : v ?? 0;

  const labTests: LabTest[] = useMemo(() => {
    if (!labTestsData?.data) return [];
    return labTestsData.data.map((item) => {
      const row = item as LabTestApiItemRow;
      return {
      id: item.id,
      testName: item.testName,
      description: item.testDescription ?? "",
      price: formatPrice(toNum(item.testFee)),
      status: capitalizeStatus(item.status),
      updatedAt: formatDateOnly(
        item.updatedAt ?? item.updated_at ?? item.createdAt ?? item.created_at ?? ""
      ),
      privateUpdatedAt: formatDateOnly(item.testFeeLastUpdatedAt ?? ""),
      panelUpdatedAt: formatDateOnly(item.panelPriceLastUpdatedAt ?? ""),
      tpaUpdatedAt: formatDateOnly(item.tpaPriceLastUpdatedAt ?? ""),
      groupName: item.groupName,
      categoryName: item.categoryName,
      privatePrice: formatPrice(toNum(item.testFee)),
      privateStatus: capitalizeStatus(item.status),
      panelPrice: formatPrice(toNum(item.panelPrice)),
      panelStatus: capitalizeStatus(item.panelStatus),
      tpaPrice: formatPrice(toNum(item.tpaPrice)),
      tpaStatus: capitalizeStatus(item.tpaStatus),
      testFeeLastUpdatedBy: row.testFeeLastUpdatedBy ?? row.test_fee_last_updated_by ?? null,
      panelPriceLastUpdatedBy: row.panelPriceLastUpdatedBy ?? row.panel_price_last_updated_by ?? null,
      tpaPriceLastUpdatedBy: row.tpaPriceLastUpdatedBy ?? row.tpa_price_last_updated_by ?? null,
    };
    });
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

  const addManualBranchOptions: SelectOption[] = useMemo(() => {
    const rows = manualBranchRes?.success && Array.isArray(manualBranchRes.data) ? manualBranchRes.data : [];
    return rows.map((b) => ({
      value: String(b.id),
      label: (b.name && String(b.name).trim()) || `Branch ${b.id}`,
    }));
  }, [manualBranchRes]);

  const addGroupSelectOptions: SelectOption[] = useMemo(
    () => (groupsData?.data ?? []).map((name) => ({ value: name, label: name })),
    [groupsData?.data]
  );

  const addCategorySelectOptions: SelectOption[] = useMemo(
    () => (categoriesData?.data ?? []).map((name) => ({ value: name, label: name })),
    [categoriesData?.data]
  );

  const closeAddLabTestDialog = () => {
    setIsAddLabTestDialogOpen(false);
    setAddLabTestForm(emptyAddLabTestForm());
    setAddLabTestErrors({});
  };

  const handleAddNew = () => {
    if (!canAdd || !showAddLabTestButton) return;
    setAddLabTestForm(emptyAddLabTestForm());
    setAddLabTestErrors({});
    setDialogMode(null);
    setSelectedLabTest(null);
    setIsAddLabTestDialogOpen(true);
  };

  const validateAddLabTestForm = (): boolean => {
    const err: Record<string, string> = {};
    if (!addLabTestForm.branchId.trim()) err.branchId = "Branch is required";
    if (!addLabTestForm.groupName.trim()) err.groupName = "Group name is required";
    if (!addLabTestForm.categoryName.trim()) err.categoryName = "Category is required";
    if (!addLabTestForm.testName.trim()) err.testName = "Test name is required";
    if (!addLabTestForm.testDescription.trim()) err.testDescription = "Description is required";
    if (!addLabTestForm.privatePrice.trim()) {
      err.privatePrice = "Private price is required";
    } else if (!/^\d{1,6}(\.\d{1,2})?$/.test(addLabTestForm.privatePrice.trim())) {
      err.privatePrice = "Enter a valid amount (max 6 digits before decimal)";
    }
    if (!addLabTestForm.panelPrice.trim()) {
      err.panelPrice = "Panel price is required";
    } else if (!/^\d{1,6}(\.\d{1,2})?$/.test(addLabTestForm.panelPrice.trim())) {
      err.panelPrice = "Enter a valid amount (max 6 digits before decimal)";
    }
    if (!addLabTestForm.tpaPrice.trim()) {
      err.tpaPrice = "TPA price is required";
    } else if (!/^\d{1,6}(\.\d{1,2})?$/.test(addLabTestForm.tpaPrice.trim())) {
      err.tpaPrice = "Enter a valid amount (max 6 digits before decimal)";
    }
    setAddLabTestErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleAddLabTestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAdd || !showAddLabTestButton || !validateAddLabTestForm()) return;
    const branchId = parseInt(addLabTestForm.branchId, 10);
    if (!Number.isFinite(branchId)) {
      setAddLabTestErrors((prev) => ({ ...prev, branchId: "Select a valid branch" }));
      return;
    }
    const test_fee = parseFloat(addLabTestForm.privatePrice) || 0;
    const panelPrice = parseFloat(addLabTestForm.panelPrice) || 0;
    const tpaPrice = parseFloat(addLabTestForm.tpaPrice) || 0;
    try {
      const res = await createLabTest({
        testName: addLabTestForm.testName.trim(),
        testDescription: addLabTestForm.testDescription.trim(),
        test_fee,
        tpaPrice,
        panelPrice,
        status: addLabTestForm.privateStatus,
        tpaStatus: addLabTestForm.tpaStatus,
        panelStatus: addLabTestForm.panelStatus,
        groupName: addLabTestForm.groupName.trim(),
        categoryName: addLabTestForm.categoryName.trim(),
        externalItemId: null,
        branchId,
      }).unwrap();
      if (res.success) {
        closeAddLabTestDialog();
        refetchLabTests();
        setCreateLabTestSuccessMessage(res.message || "Lab test created successfully.");
        setShowCreateLabTestSuccessDialog(true);
      } else {
        setCreateLabTestErrorMessage(res.message || "Could not create lab test.");
        setShowCreateLabTestErrorDialog(true);
      }
    } catch (unknownErr: unknown) {
      const msg =
        unknownErr && typeof unknownErr === "object" && "data" in unknownErr
          ? String((unknownErr as { data?: { message?: string } }).data?.message ?? "Request failed.")
          : "Request failed.";
      setCreateLabTestErrorMessage(msg);
      setShowCreateLabTestErrorDialog(true);
    }
  };

  const handleEdit = (test: LabTest) => {
    if (!canEdit) return;
    setIsAddLabTestDialogOpen(false);
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
    setIsAddLabTestDialogOpen(false);
    setSelectedLabTest(test);
    setDialogMode("view");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
    }
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

  const dialogTitle = isAllView
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
                {showAddLabTestButton ? (
                  <button
                    type="button"
                    className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] whitespace-nowrap"
                    onClick={handleAddNew}
                  >
                    <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                    <span>Add Lab Test</span>
                  </button>
                ) : null}
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
                  {activeTab !== "all" ? (
                    <TableHead className="min-w-[100px] max-w-[320px]">Updated By</TableHead>
                  ) : null}
                  {(activeTab === "all" ? canView : canEdit) ? (
                    <TableHead position="last">Action</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingLabTests ? (
                  <TableRow>
                    <TableData
                      colSpan={activeTab === "all" ? (canView ? 12 : 11) : canEdit ? 9 : 8}
                      className="py-12 text-center text-sm text-[#9CA3AF]"
                    >
                      Loading...
                    </TableData>
                  </TableRow>
                ) : paginatedLabTests.length === 0 ? (
                  <TableRow>
                    <TableData
                      colSpan={activeTab === "all" ? (canView ? 12 : 11) : canEdit ? 9 : 8}
                      className="py-12 text-center text-sm text-[#9CA3AF]"
                    >
                      No lab tests found
                    </TableData>
                  </TableRow>
                ) : (
                  paginatedLabTests.map((test, index) => {
                    const updatedByLabel = displayUpdatedBy(test, activeTab);
                    return (
                    <TableRow key={test.id}>
                      <TableData position="first">{startIndex + index + 1}</TableData>
                      <TableData>{test.groupName ?? "—"}</TableData>
                      <TableData>{test.categoryName ?? "—"}</TableData>
                      <TableData>{test.testName}</TableData>
                      {activeTab === "all" ? (
                        <>
                          <TableData className="whitespace-nowrap">{formatPriceVal(test.privatePrice ?? test.price)}</TableData>
                          <TableData>
                            <span
                              className={`inline-flex h-[30px] min-w-[86px] items-center justify-center rounded-[30px] border px-5 text-xs font-medium leading-[120%] ${getStatusBadgeClass(test.privateStatus ?? test.status)}`}
                            >
                              {test.privateStatus ?? test.status}
                            </span>
                          </TableData>
                          <TableData className="whitespace-nowrap">{formatPriceVal(test.panelPrice ?? test.price)}</TableData>
                          <TableData>
                            <span
                              className={`inline-flex h-[30px] min-w-[86px] items-center justify-center rounded-[30px] border px-5 text-xs font-medium leading-[120%] ${getStatusBadgeClass(test.panelStatus ?? test.status)}`}
                            >
                              {test.panelStatus ?? test.status}
                            </span>
                          </TableData>
                          <TableData className="whitespace-nowrap">{formatPriceVal(test.tpaPrice ?? test.price)}</TableData>
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
                            {formatPriceVal(
                              activeTab === "private"
                                ? (test.privatePrice ?? test.price)
                                : activeTab === "panel"
                                  ? (test.panelPrice ?? test.price)
                                  : (test.tpaPrice ?? test.price)
                            )}
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
                        {displayLastSyncDate(test, activeTab)}
                      </TableData>
                      {activeTab !== "all" ? (
                        <TableData className="max-w-[320px] text-sm text-[#434956]">
                          <span
                            className="line-clamp-2 break-words"
                            title={updatedByLabel !== "—" ? updatedByLabel : undefined}
                          >
                            {updatedByLabel}
                          </span>
                        </TableData>
                      ) : null}
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
                    );
                  })
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

      {/* Add Lab Test — branches with manual labTestSource, prices + status rows */}
      <Dialog
        open={isAddLabTestDialogOpen && showAddLabTestButton}
        onClose={closeAddLabTestDialog}
        title="Add Lab Test"
        width={949}
      >
        <form onSubmit={handleAddLabTestSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            <FormSelectField
              label="Branch *"
              options={addManualBranchOptions}
              mode="single"
              value={addLabTestForm.branchId || null}
              onChange={(val) => {
                const v = typeof val === "string" ? val : val?.[0] ?? "";
                setAddLabTestForm((p) => ({ ...p, branchId: v }));
                setAddLabTestErrors((prev) => ({ ...prev, branchId: "" }));
              }}
              placeholder={isLoadingManualBranches ? "Loading branches…" : "Select branch"}
              background="white"
              width="100%"
              disabled={isLoadingManualBranches || addManualBranchOptions.length === 0}
              emptyMessage="No branches with manual lab source"
              error={addLabTestErrors.branchId}
            />
            <FormSelectField
              label="Group Name *"
              options={[{ value: "", label: "Select group" }, ...addGroupSelectOptions]}
              mode="single"
              value={addLabTestForm.groupName || null}
              onChange={(val) => {
                const v = typeof val === "string" ? val : val?.[0] ?? "";
                setAddLabTestForm((p) => ({ ...p, groupName: v }));
                setAddLabTestErrors((prev) => ({ ...prev, groupName: "" }));
              }}
              placeholder="Select group"
              background="white"
              width="100%"
              disabled={isLoadingGroups}
              error={addLabTestErrors.groupName}
            />
            <FormSelectField
              label="Category Name *"
              options={[{ value: "", label: "Select category" }, ...addCategorySelectOptions]}
              mode="single"
              value={addLabTestForm.categoryName || null}
              onChange={(val) => {
                const v = typeof val === "string" ? val : val?.[0] ?? "";
                setAddLabTestForm((p) => ({ ...p, categoryName: v }));
                setAddLabTestErrors((prev) => ({ ...prev, categoryName: "" }));
              }}
              placeholder="Select category"
              background="white"
              width="100%"
              disabled={isLoadingCategories}
              error={addLabTestErrors.categoryName}
            />
            <FormInputField
              label="Test Name *"
              value={addLabTestForm.testName}
              onChange={(e) => {
                setAddLabTestForm((p) => ({ ...p, testName: e.target.value }));
                setAddLabTestErrors((prev) => ({ ...prev, testName: "" }));
              }}
              height={44}
              placeholder="Test Name"
              error={addLabTestErrors.testName}
            />
          </div>

          <FormTextareaField
            label="Description *"
            value={addLabTestForm.testDescription}
            onChange={(e) => {
              setAddLabTestForm((p) => ({ ...p, testDescription: e.target.value }));
              setAddLabTestErrors((prev) => ({ ...prev, testDescription: "" }));
            }}
            height={94}
            placeholder="Write a description..."
            error={addLabTestErrors.testDescription}
          />

          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 md:items-end">
              <FormInputField
                label="Private Price *"
                value={addLabTestForm.privatePrice}
                onChange={(e) => {
                  setAddLabTestForm((p) => ({
                    ...p,
                    privatePrice: sanitizeDecimalInput(e.target.value),
                  }));
                  setAddLabTestErrors((prev) => ({ ...prev, privatePrice: "" }));
                }}
                height={44}
                placeholder="Private Price"
                type="text"
                inputMode="decimal"
                error={addLabTestErrors.privatePrice}
              />
              <PatientTypeButtonGroup
                label="Private Status"
                options={["Active", "Inactive"]}
                value={addLabTestForm.privateStatus}
                onChange={(val) =>
                  setAddLabTestForm((p) => ({
                    ...p,
                    privateStatus: (val === "inactive" ? "inactive" : "active") as "active" | "inactive",
                  }))
                }
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 md:items-end">
              <FormInputField
                label="Panel Price *"
                value={addLabTestForm.panelPrice}
                onChange={(e) => {
                  setAddLabTestForm((p) => ({
                    ...p,
                    panelPrice: sanitizeDecimalInput(e.target.value),
                  }));
                  setAddLabTestErrors((prev) => ({ ...prev, panelPrice: "" }));
                }}
                height={44}
                placeholder="Panel Price"
                type="text"
                inputMode="decimal"
                error={addLabTestErrors.panelPrice}
              />
              <PatientTypeButtonGroup
                label="Panel Status"
                options={["Active", "Inactive"]}
                value={addLabTestForm.panelStatus}
                onChange={(val) =>
                  setAddLabTestForm((p) => ({
                    ...p,
                    panelStatus: (val === "inactive" ? "inactive" : "active") as "active" | "inactive",
                  }))
                }
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 md:items-end">
              <FormInputField
                label="TPA Price *"
                value={addLabTestForm.tpaPrice}
                onChange={(e) => {
                  setAddLabTestForm((p) => ({
                    ...p,
                    tpaPrice: sanitizeDecimalInput(e.target.value),
                  }));
                  setAddLabTestErrors((prev) => ({ ...prev, tpaPrice: "" }));
                }}
                height={44}
                placeholder="TPA Price"
                type="text"
                inputMode="decimal"
                error={addLabTestErrors.tpaPrice}
              />
              <PatientTypeButtonGroup
                label="TPA Status"
                options={["Active", "Inactive"]}
                value={addLabTestForm.tpaStatus}
                onChange={(val) =>
                  setAddLabTestForm((p) => ({
                    ...p,
                    tpaStatus: (val === "inactive" ? "inactive" : "active") as "active" | "inactive",
                  }))
                }
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="primary" disabled={isCreatingLabTest}>
              {isCreatingLabTest ? "Adding…" : "Add Lab Test"}
            </Button>
            <Button type="button" variant="outline" onClick={closeAddLabTestDialog} disabled={isCreatingLabTest}>
              Cancel
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Edit (Private) / Edit (Panel|TPA) / View (All) Dialog */}
      <Dialog
        open={(dialogMode === "edit" && canEdit) || (dialogMode === "view" && canView)}
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
                  <p className="mt-1 text-sm font-medium text-[#262D3B]">{formatPriceVal(selectedLabTest.privatePrice ?? selectedLabTest.price)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-[#7B8088]">Panel Price</p>
                  <p className="mt-1 text-sm font-medium text-[#262D3B]">{formatPriceVal(selectedLabTest.panelPrice ?? selectedLabTest.price)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-[#7B8088]">TPA Price</p>
                  <p className="mt-1 text-sm font-medium text-[#262D3B]">{formatPriceVal(selectedLabTest.tpaPrice ?? selectedLabTest.price)}</p>
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
          <form onSubmit={dialogMode === "edit" ? handleSubmit : (e) => e.preventDefault()} className="space-y-6">
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
                    {(isUpdatingLabTest || isUpdatingLabTestByBranch) ? "Updating..." : "Update Lab Test"}
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

      <MessageDialog
        open={showCreateLabTestSuccessDialog}
        onClose={() => setShowCreateLabTestSuccessDialog(false)}
        icon="/icons/SuccessCheck.svg"
        iconBgColor="#E8F5E9"
        message={createLabTestSuccessMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => setShowCreateLabTestSuccessDialog(false)}
      />

      <MessageDialog
        open={showCreateLabTestErrorDialog}
        onClose={() => setShowCreateLabTestErrorDialog(false)}
        icon="/icons/CrossIcon.svg"
        iconBgColor="#FFEBEE"
        message={createLabTestErrorMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => setShowCreateLabTestErrorDialog(false)}
      />
    </AppShell>
  );
}


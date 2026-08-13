"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  Button,
  FormInputField,
  FormSelectField,
  MessageDialog,
  Pagination,
  SpinnerLoader,
  Table,
  TableBody,
  TableData,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
} from "@/components/ui";
import {
  useStaffNurseCreateLabTestMutation,
  useStaffNurseGetDistinctLabTestCategoriesQuery,
  useStaffNurseGetLabTestListingQuery,
  useGetPatientListQuery,
} from "@/store/api/ipdStaffNurseAPI";

const LAB_TEST_LISTING_PAGINATION_OPTIONS = [6, 10, 20, 50];

export type NewLabRequestPatient = {
  id: number;
  patientTitle?: string | null;
  patientName: string;
  patientUhid: string;
  patientType?: string | null;
  age?: string | null;
};

type NewLabRequestScreenProps = {
  onClose: () => void;
  onSuccess: () => void;
  branchId: number | null | undefined;
  /** When provided, patient select is locked to this patient (Assigned Patient flow). */
  patient?: NewLabRequestPatient | null;
};

export function NewLabRequestScreen({
  onClose,
  onSuccess,
  branchId,
  patient = null,
}: NewLabRequestScreenProps) {
  const isPatientLocked = patient != null;

  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(patient?.id ?? null);
  const [labCategory, setLabCategory] = useState("all");
  const [labTestListingFilters, setLabTestListingFilters] = useState({
    page: 1,
    limit: 10,
    search: "",
  });
  const [selectedTestIds, setSelectedTestIds] = useState<number[]>([]);
  const [labTestDialogMessage, setLabTestDialogMessage] = useState("");
  const [showLabTestSuccessDialog, setShowLabTestSuccessDialog] = useState(false);
  const [showLabTestErrorDialog, setShowLabTestErrorDialog] = useState(false);

  const [createLabTest, { isLoading: isCreatingLabTest }] = useStaffNurseCreateLabTestMutation();

  const { data: labCategoriesRes } = useStaffNurseGetDistinctLabTestCategoriesQuery();

  const { data: patientsRes, isLoading: isPatientsLoading } = useGetPatientListQuery(
    {
      branchId: branchId!,
      page: 1,
      limit: 100,
      sortBy: "patientName",
      order: "ASC",
    },
    {
      skip: isPatientLocked || branchId == null,
      refetchOnMountOrArgChange: true,
    }
  );

  const patientOptions: NewLabRequestPatient[] = useMemo(() => {
    if (isPatientLocked && patient) {
      return [patient];
    }

    return (patientsRes?.data ?? []).map((item) => ({
      id: item.id,
      patientTitle: item.patientTitle,
      patientName: item.patientName,
      patientUhid: item.uhid,
      patientType: item.type || "Normal Patient",
      age: item.age,
    }));
  }, [isPatientLocked, patient, patientsRes?.data]);

  const labCategoryOptions = useMemo(() => {
    const categories = labCategoriesRes?.data ?? [];

    return [
      { label: "All Categories", value: "all" },
      ...categories.map((category) => ({
        label: category,
        value: category,
      })),
    ];
  }, [labCategoriesRes?.data]);

  const resolvedSelectedPatientId = selectedPatientId ?? patientOptions[0]?.id ?? null;

  const selectedPatient = useMemo(
    () =>
      patientOptions.find((p) => p.id === resolvedSelectedPatientId) ?? patientOptions[0] ?? null,
    [patientOptions, resolvedSelectedPatientId]
  );

  const {
    data: labTestListingRes,
    isLoading: isLabTestListingLoading,
  } = useStaffNurseGetLabTestListingQuery(
    {
      page: labTestListingFilters.page,
      limit: labTestListingFilters.limit,
      search: labTestListingFilters.search.trim() || undefined,
      categoryName: labCategory === "all" ? undefined : labCategory,
    },
    {
      refetchOnMountOrArgChange: true,
    }
  );

  const labTestListing = labTestListingRes?.data ?? [];
  const labTestListingTotal = Number(labTestListingRes?.total ?? 0);

  const toggleTest = (testId: number) => {
    setSelectedTestIds((prev) =>
      prev.includes(testId) ? prev.filter((id) => id !== testId) : [...prev, testId]
    );
  };

  const selectedCount = selectedTestIds.length;

  const handleSubmitLabRequest = async () => {
    if (selectedCount === 0 || resolvedSelectedPatientId == null) return;

    if (branchId == null) {
      setLabTestDialogMessage("Please select a branch before submitting the lab request.");
      setShowLabTestErrorDialog(true);
      return;
    }

    try {
      const result = await createLabTest({
        patientId: resolvedSelectedPatientId,
        branchId,
        labTestIds: selectedTestIds,
      }).unwrap();

      setLabTestDialogMessage(result.message || "Lab test created successfully");
      setShowLabTestSuccessDialog(true);
      setSelectedTestIds([]);
    } catch (error) {
      const message =
        error && typeof error === "object" && "data" in error
          ? (error as { data?: { message?: string } }).data?.message
          : "Failed to create lab test. Please try again.";

      setLabTestDialogMessage(message || "Failed to create lab test. Please try again.");
      setShowLabTestErrorDialog(true);
    }
  };

  const selectedPatientDisplayName = [
    selectedPatient?.patientTitle,
    selectedPatient?.patientName,
  ]
    .filter(Boolean)
    .join(" ") || "N/A";

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-[22px] font-semibold leading-tight text-[#262D3B] md:text-[24px]">
          New Lab Request
        </h1>

        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-[#F2F8F2]"
          aria-label="Close"
        >
          <Image src="/icons/CrossIcon.svg" alt="Close" width={18} height={18} />
        </button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <section className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.06)]">
            <h3 className="text-sm font-medium text-[#262D3B]">Patient Selection</h3>

            <div className="mt-4">
              <Tooltip
                position="top"
                content={
                  <span className="max-w-xs whitespace-normal break-words">
                    {selectedPatientDisplayName}
                  </span>
                }
              >
                <div className="w-full">
                  <FormSelectField
                    label="Patient Name"
                    width="100%"
                    disabled={isPatientLocked || isPatientsLoading}
                    value={resolvedSelectedPatientId != null ? String(resolvedSelectedPatientId) : ""}
                    options={patientOptions.map((p) => ({
                      label: `${p.patientTitle ? `${p.patientTitle} ` : ""}${p.patientName || ""}`,
                      value: String(p.id),
                    }))}
                    onChange={(value) => {
                      const next = Number(Array.isArray(value) ? value[0] : value);
                      if (!Number.isNaN(next)) setSelectedPatientId(next);
                    }}
                    placeholder={isPatientsLoading ? "Loading patients..." : "Select Patient"}
                    className={isPatientLocked ? "!bg-[#F2F4F7]" : undefined}
                  />
                </div>
              </Tooltip>
            </div>
          </section>

          <section className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.06)]">
            <h3 className="text-sm font-medium text-[#262D3B]">Patient Details</h3>

            {/* <div className="mt-4 overflow-hidden rounded-xl border-l-4 border-l-[#0B8C00] bg-[#0B8C000D] px-5 py-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-[#7B8089]">Patient Name</p>
                  <Tooltip
                    position="top"
                    content={
                      <span className="max-w-xs whitespace-normal break-words">
                        {selectedPatientDisplayName}
                      </span>
                    }
                  >
                    <p className="mt-1.5 cursor-default truncate text-sm font-semibold text-[#262D3B]">
                      {selectedPatientDisplayName}
                    </p>
                  </Tooltip>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-[#7B8089]">Patient UHID</p>
                  <p className="mt-1.5 truncate text-sm font-semibold text-[#262D3B]">
                    {selectedPatient?.patientUhid || "N/A"}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-[#7B8089]">Patient Type</p>
                  <div className="mt-1.5">
                    <span className="inline-flex rounded-full border border-[#E3EEE1] bg-white px-3 py-1 text-xs font-medium uppercase text-[#0B8C00]">
                      {selectedPatient?.patientType || "Normal Patient"}
                    </span>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-[#7B8089]">Age</p>
                  <p className="mt-1.5 truncate text-sm font-semibold text-[#262D3B]">
                    {selectedPatient?.age || "N/A"}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-[#7B8089]">Type</p>
                  <p className="mt-1.5 truncate text-sm font-semibold uppercase text-[#262D3B]">
                    {selectedPatient?.patientType || "N/A"}
                  </p>
                </div>
              </div>
            </div> */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mt-4 overflow-hidden rounded-xl border-l-4 border-l-[#0B8C00] bg-[#0B8C000D] px-5 py-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-[#7B8089]">Patient Name</p>
                  <Tooltip
                    position="top"
                    content={
                      <span className="max-w-xs whitespace-normal break-words">
                        {[selectedPatient?.patientTitle, selectedPatient?.patientName]
                          .filter(Boolean)
                          .join(" ") || "N/A"}
                      </span>
                    }
                  >
                    <p className="mt-1.5 cursor-default truncate text-sm font-semibold text-[#262D3B]">
                      {[selectedPatient?.patientTitle, selectedPatient?.patientName]
                        .filter(Boolean)
                        .join(" ") || "N/A"}
                    </p>
                  </Tooltip>
                </div>
  
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-[#7B8089]">Patient UHID</p>
                  <p className="mt-1.5 truncate text-sm font-semibold text-[#262D3B]">
                    {selectedPatient?.patientUhid || "N/A"}
                  </p>
                </div>
  
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-[#7B8089]">Patient Type</p>
                  <div className="mt-1.5">
                    <span className="inline-flex rounded-full border border-[#E3EEE1] bg-white px-3 py-1 text-xs font-medium uppercase text-[#0B8C00]">
                      {selectedPatient?.patientType || "N/A"}
                    </span>
                  </div>
                </div>

                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-[#7B8089]">Age</p>
                  <p className="mt-1.5 truncate text-sm font-semibold text-[#262D3B]">
                    {selectedPatient?.age || "N/A"}
                  </p>
                </div>
              </div>
          </section>
        </div>

        <section className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.06)]">
          <h3 className="text-sm font-medium text-[#262D3B]">Form</h3>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <FormSelectField
              label="Lab Category"
              width="100%"
              value={labCategory}
              options={labCategoryOptions}
              onChange={(value) => {
                setLabCategory(String(Array.isArray(value) ? value[0] : value));
                setLabTestListingFilters((prev) => ({ ...prev, page: 1 }));
              }}
            />

            <FormInputField
              label="Search Specific Test"
              width="100%"
              value={labTestListingFilters.search}
              placeholder="e.g. CBC, HbA1c..."
              onChange={(e) =>
                setLabTestListingFilters((prev) => ({
                  ...prev,
                  search: e.target.value,
                  page: 1,
                }))
              }
              className="!bg-[#0B8C00]/5"
            />
          </div>

          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="text-sm font-medium text-[#262D3B]">Select Tests</h4>
              <p className="text-xs font-medium text-[#7B8089]">
                {selectedCount === 1 ? "1 Test Selected" : `${selectedCount} Tests Selected`}
              </p>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="bg-white">
                  <TableHead position="first">Sr no.</TableHead>
                  <TableHead>Test Name</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLabTestListingLoading ? (
                  <TableRow className="bg-white">
                    <TableData colSpan={3}>
                      <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#9CA3AF]">
                        <SpinnerLoader size={18} />
                        Loading lab tests...
                      </div>
                    </TableData>
                  </TableRow>
                ) : labTestListing.length === 0 ? (
                  <TableRow className="bg-white">
                    <TableData colSpan={3}>
                      <p className="py-10 text-center text-sm text-[#9CA3AF]">No lab tests found.</p>
                    </TableData>
                  </TableRow>
                ) : (
                  labTestListing.map((test, index) => {
                    const serialNumber =
                      (labTestListingFilters.page - 1) * labTestListingFilters.limit + index + 1;
                    const testNameLabel = [test.name, test.category].filter(Boolean).join(" - ");

                    return (
                      <TableRow
                        key={test.id}
                        className="bg-white transition-colors hover:bg-[#F7FAF7]"
                      >
                        <TableData variant="primary">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedTestIds.includes(test.id)}
                              onChange={() => toggleTest(test.id)}
                              className="h-4 w-4 rounded border-[#D1D5DB] accent-[#0B8C00]"
                              aria-label={`Select ${testNameLabel}`}
                            />
                            <span>{String(serialNumber).padStart(2, "0")}</span>
                          </div>
                        </TableData>
                        <TableData>{testNameLabel || "N/A"}</TableData>
                        <TableData>{test.description || "N/A"}</TableData>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            {!isLabTestListingLoading && labTestListing.length > 0 ? (
              <div className="mt-4 border-t border-[#EDF3EA] pt-4">
                <Pagination
                  currentPage={labTestListingFilters.page}
                  totalItems={labTestListingTotal > 0 ? labTestListingTotal : labTestListing.length}
                  itemsPerPage={labTestListingFilters.limit}
                  itemsPerPageOptions={LAB_TEST_LISTING_PAGINATION_OPTIONS}
                  onPageChange={(page) =>
                    setLabTestListingFilters((prev) => ({ ...prev, page }))
                  }
                  onItemsPerPageChange={(limit) =>
                    setLabTestListingFilters((prev) => ({ ...prev, limit, page: 1 }))
                  }
                />
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 items-center justify-center gap-2 rounded-[32px] border border-[#9A7909] px-6 text-sm font-medium leading-[120%] text-[#9A7909] transition-colors hover:bg-[#FDF8E8] focus:outline-none focus:ring-2 focus:ring-[#9A7909]/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Image src="/icons/LeftArrowIcon.svg" alt="Back" width={20} height={20} className="shrink-0" />
              Back
            </button>
            <Button
              variant="primary"
              size="small"
              className="!min-w-0 whitespace-nowrap"
              disabled={
                selectedCount === 0 ||
                isCreatingLabTest ||
                resolvedSelectedPatientId == null
              }
              onClick={() => void handleSubmitLabRequest()}
            >
              {isCreatingLabTest ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </section>
      </div>

      <MessageDialog
        open={showLabTestSuccessDialog}
        onClose={() => {
          setShowLabTestSuccessDialog(false);
          onSuccess();
        }}
        icon="/icons/SuccessCheck.svg"
        iconBgColor="#E8F5E9"
        message={labTestDialogMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => {
          setShowLabTestSuccessDialog(false);
          onSuccess();
        }}
      />

      <MessageDialog
        open={showLabTestErrorDialog}
        onClose={() => setShowLabTestErrorDialog(false)}
        icon="/icons/ErrorIcon.svg"
        iconBgColor="#FEE2E2"
        message={labTestDialogMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => setShowLabTestErrorDialog(false)}
      />
    </div>
  );
}

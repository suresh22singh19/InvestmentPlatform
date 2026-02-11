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
  FormTextareaField,
  TableSearchInput,
  Pagination,
  SMSCard,
} from "@/components/ui";
import { ListBorder } from "@/components/ui/ListBorder";
import type { SelectOption } from "@/components/ui/FormSelectField";

type SMS = {
  id: number;
  templateId: string;
  templateName: string;
  smsTitle: string;
  smsHeader: string;
  smsType: string;
  branch: string;
  createdDate: string;
  content: string;
  status: "Active" | "Inactive";
};

const branchOptions: SelectOption[] = [
  { value: "agartala-clinic", label: "Agartala Clinic" },
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

const smsTypeOptions: SelectOption[] = [
  { value: "text", label: "Text" },
  { value: "unicode", label: "Unicode" },
];

const statusOptions: SelectOption[] = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
];

const initialSMS: SMS[] = [
  {
    id: 1,
    templateId: "1007158081068881020",
    templateName: "Clinic Address",
    smsTitle: "Agartala Clinic",
    smsHeader: "Agartala",
    smsType: "text",
    branch: "Agartala Clinic",
    createdDate: "15-06-2023",
    content:
      "Shuddhi Clinic Address, Nabin Kutir Ground Floor, R.K Mission Road, Near Joyguru, City\\Village and Dist-Agartala Opp.Ramakrishna Vivekananda Vidyamandir State-Tripura. MAP: jsl1.in/SWCAGTL Call: 986270341",
    status: "Active",
  },
  {
    id: 2,
    templateId: "1007158081068881020",
    templateName: "Clinic Address",
    smsTitle: "Agartala Clinic",
    smsHeader: "Agartala",
    smsType: "text",
    branch: "Agartala Clinic",
    createdDate: "15-06-2023",
    content:
      "Shuddhi Clinic Address, Nabin Kutir Ground Floor, R.K Mission Road, Near Joyguru, City\\Village and Dist-Agartala Opp.Ramakrishna Vivekananda Vidyamandir State-Tripura. MAP: jsl1.in/SWCAGTL Call: 986270341",
    status: "Active",
  },
  {
    id: 3,
    templateId: "1007158081068881020",
    templateName: "Clinic Address",
    smsTitle: "Agartala Clinic",
    smsHeader: "Agartala",
    smsType: "text",
    branch: "Agartala Clinic",
    createdDate: "15-06-2023",
    content:
      "Shuddhi Clinic Address, Nabin Kutir Ground Floor, R.K Mission Road, Near Joyguru, City\\Village and Dist-Agartala Opp.Ramakrishna Vivekananda Vidyamandir State-Tripura. MAP: jsl1.in/SWCAGTL Call: 986270341",
    status: "Active",
  },
  {
    id: 4,
    templateId: "1007158081068881020",
    templateName: "Clinic Address",
    smsTitle: "Agartala Clinic",
    smsHeader: "Agartala",
    smsType: "text",
    branch: "Agartala Clinic",
    createdDate: "15-06-2023",
    content:
      "Shuddhi Clinic Address, Nabin Kutir Ground Floor, R.K Mission Road, Near Joyguru, City\\Village and Dist-Agartala Opp.Ramakrishna Vivekananda Vidyamandir State-Tripura. MAP: jsl1.in/SWCAGTL Call: 986270341",
    status: "Active",
  },
  {
    id: 5,
    templateId: "1007158081068881020",
    templateName: "Clinic Address",
    smsTitle: "Agartala Clinic",
    smsHeader: "Agartala",
    smsType: "text",
    branch: "Agartala Clinic",
    createdDate: "15-06-2023",
    content:
      "Shuddhi Clinic Address, Nabin Kutir Ground Floor, R.K Mission Road, Near Joyguru, City\\Village and Dist-Agartala Opp.Ramakrishna Vivekananda Vidyamandir State-Tripura. MAP: jsl1.in/SWCAGTL Call: 986270341",
    status: "Active",
  },
  {
    id: 6,
    templateId: "1007158081068881020",
    templateName: "Clinic Address",
    smsTitle: "Agartala Clinic",
    smsHeader: "Agartala",
    smsType: "text",
    branch: "Agartala Clinic",
    createdDate: "15-06-2023",
    content:
      "Shuddhi Clinic Address, Nabin Kutir Ground Floor, R.K Mission Road, Near Joyguru, City\\Village and Dist-Agartala Opp.Ramakrishna Vivekananda Vidyamandir State-Tripura. MAP: jsl1.in/SWCAGTL Call: 986270341",
    status: "Active",
  },
];

export default function SMSPage() {
  const [smsList, setSmsList] = useState<SMS[]>(initialSMS);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [dialogMode, setDialogMode] = useState<"add" | "edit" | "view" | null>(null);
  const [selectedSMS, setSelectedSMS] = useState<SMS | null>(null);
  const [formValues, setFormValues] = useState({
    smsTitle: "",
    smsHeader: "",
    templateId: "",
    templateName: "",
    branch: "",
    smsType: "",
    content: "",
    status: "Active",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const filteredSMS = useMemo(() => {
    return smsList.filter((sms) => {
      return (
        sms.smsTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sms.smsHeader.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sms.templateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sms.templateId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sms.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [smsList, searchTerm]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSMS = filteredSMS.slice(startIndex, startIndex + itemsPerPage);

  const handleAddNew = () => {
    setFormValues({
      smsTitle: "",
      smsHeader: "",
      templateId: "",
      templateName: "",
      branch: "",
      smsType: "",
      content: "",
      status: "Active",
    });
    setFormErrors({});
    setSelectedSMS(null);
    setDialogMode("add");
  };

  const handleEdit = (sms: SMS) => {
    setSelectedSMS(sms);
    setFormValues({
      smsTitle: sms.smsTitle,
      smsHeader: sms.smsHeader,
      templateId: sms.templateId,
      templateName: sms.templateName,
      branch: branchOptions.find((opt) => opt.label === sms.branch)?.value || "",
      smsType: sms.smsType,
      content: sms.content,
      status: sms.status,
    });
    setFormErrors({});
    setDialogMode("edit");
  };

  const handleView = (sms: SMS) => {
    setSelectedSMS(sms);
    setFormValues({
      smsTitle: sms.smsTitle,
      smsHeader: sms.smsHeader,
      templateId: sms.templateId,
      templateName: sms.templateName,
      branch: branchOptions.find((opt) => opt.label === sms.branch)?.value || "",
      smsType: sms.smsType,
      content: sms.content,
      status: sms.status,
    });
    setFormErrors({});
    setDialogMode("view");
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formValues.smsTitle.trim()) errors.smsTitle = "SMS Title is required";
    if (!formValues.smsHeader.trim()) errors.smsHeader = "SMS Header is required";
    if (!formValues.templateId.trim()) errors.templateId = "Template ID is required";
    if (!formValues.templateName.trim()) errors.templateName = "Template Name is required";
    if (!formValues.branch) errors.branch = "Branch is required";
    if (!formValues.smsType) errors.smsType = "SMS Type is required";
    if (!formValues.content.trim()) errors.content = "Content is required";
    if (!formValues.status) errors.status = "Status is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;

    const branchLabel = branchOptions.find((opt) => opt.value === formValues.branch)?.label || formValues.branch;
    const smsTypeLabel = smsTypeOptions.find((opt) => opt.value === formValues.smsType)?.label || formValues.smsType;

    if (dialogMode === "edit" && selectedSMS) {
      setSmsList((prev) =>
        prev.map((sms) =>
          sms.id === selectedSMS.id
            ? {
                ...sms,
                smsTitle: formValues.smsTitle.trim(),
                smsHeader: formValues.smsHeader.trim(),
                templateId: formValues.templateId.trim(),
                templateName: formValues.templateName.trim(),
                branch: branchLabel,
                smsType: smsTypeLabel,
                content: formValues.content.trim(),
                status: formValues.status as "Active" | "Inactive",
              }
            : sms
        )
      );
    } else if (dialogMode === "add") {
      const newId = Math.max(...smsList.map((sms) => sms.id), 0) + 1;
      setSmsList((prev) => [
        ...prev,
        {
          id: newId,
          smsTitle: formValues.smsTitle.trim(),
          smsHeader: formValues.smsHeader.trim(),
          templateId: formValues.templateId.trim(),
          templateName: formValues.templateName.trim(),
          branch: branchLabel,
          smsType: smsTypeLabel,
          createdDate: new Date().toLocaleString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }),
          content: formValues.content.trim(),
          status: formValues.status as "Active" | "Inactive",
        },
      ]);
    }

    setDialogMode(null);
    setFormValues({
      smsTitle: "",
      smsHeader: "",
      templateId: "",
      templateName: "",
      branch: "",
      smsType: "",
      content: "",
      status: "Active",
    });
    setFormErrors({});
    setSelectedSMS(null);
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
          <PageHeading title="SMS" />
        </div>

        <ListBorder as="section" className="px-4 py-4">
          <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold leading-[120%] text-[#434956]"></h2>

              <div className="flex items-center gap-3">
                <TableSearchInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search Here..."
                />
                <button
                  type="button"
                  className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-white px-6 text-sm font-medium leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#F2F8F2] whitespace-nowrap"
                  onClick={handleAddNew}
                >
                  <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
                  Add SMS
                </button>
              </div>
            </div>

            {/* Cards Grid */}
            {paginatedSMS.length === 0 ? (
              <div className="py-12 text-center text-sm text-[#9CA3AF]">No SMS found</div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {paginatedSMS.map((sms) => (
                  <SMSCard
                    key={sms.id}
                    id={sms.id}
                    templateId={sms.templateId}
                    templateName={sms.templateName}
                    smsTitle={sms.smsTitle}
                    smsHeader={sms.smsHeader}
                    smsType={sms.smsType}
                    createdDate={sms.createdDate}
                    content={sms.content}
                    status={sms.status}
                    onView={() => handleView(sms)}
                    onEdit={() => handleEdit(sms)}
                  />
                ))}
              </div>
            )}

            {filteredSMS.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={filteredSMS.length}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
                itemsPerPageOptions={[10, 20, 50, 100]}
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
          setSelectedSMS(null);
        }}
        title={dialogMode === "add" ? "Add SMS" : dialogMode === "edit" ? "Edit SMS" : "View SMS"}
        width={949}
      >
        <form onSubmit={dialogMode !== "view" ? handleSubmit : (e) => e.preventDefault()} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column */}
            <div>
              <FormInputField
                label="SMS Title"
                value={formValues.smsTitle}
                onChange={(event) => {
                  if (dialogMode === "view") return;
                  setFormValues((prev) => ({ ...prev, smsTitle: event.target.value }));
                  setFormErrors((prev) => ({ ...prev, smsTitle: "" }));
                }}
                height={44}
                placeholder="SMS Title"
                required={dialogMode !== "view"}
                disabled={dialogMode === "view"}
              />
              {formErrors.smsTitle && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.smsTitle}</p>}
            </div>

            <div>
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
                placeholder="Branch"
                mode="single"
                background="white"
                disabled={dialogMode === "view"}
              />
              {formErrors.branch && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.branch}</p>}
            </div>

            <div>
              <FormInputField
                label="SMS Header"
                value={formValues.smsHeader}
                onChange={(event) => {
                  if (dialogMode === "view") return;
                  setFormValues((prev) => ({ ...prev, smsHeader: event.target.value }));
                  setFormErrors((prev) => ({ ...prev, smsHeader: "" }));
                }}
                height={44}
                placeholder="SMS Header"
                required={dialogMode !== "view"}
                disabled={dialogMode === "view"}
              />
              {formErrors.smsHeader && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.smsHeader}</p>}
            </div>

            <div>
              <FormInputField
                label="Template Name"
                value={formValues.templateName}
                onChange={(event) => {
                  if (dialogMode === "view") return;
                  setFormValues((prev) => ({ ...prev, templateName: event.target.value }));
                  setFormErrors((prev) => ({ ...prev, templateName: "" }));
                }}
                height={44}
                placeholder="Template Name"
                required={dialogMode !== "view"}
                disabled={dialogMode === "view"}
              />
              {formErrors.templateName && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.templateName}</p>}
            </div>

            <div>
              <FormInputField
                label="Template ID"
                value={formValues.templateId}
                onChange={(event) => {
                  if (dialogMode === "view") return;
                  setFormValues((prev) => ({ ...prev, templateId: event.target.value }));
                  setFormErrors((prev) => ({ ...prev, templateId: "" }));
                }}
                height={44}
                placeholder="Template ID"
                required={dialogMode !== "view"}
                disabled={dialogMode === "view"}
              />
              {formErrors.templateId && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.templateId}</p>}
            </div>

            <div>
              <FormSelectField
                label="SMS Type"
                value={formValues.smsType}
                onChange={(value) => {
                  if (dialogMode === "view") return;
                  setFormValues((prev) => ({
                    ...prev,
                    smsType: Array.isArray(value) ? value[0] : value || "",
                  }));
                  setFormErrors((prev) => ({ ...prev, smsType: "" }));
                }}
                options={smsTypeOptions}
                placeholder="SMS Type"
                mode="single"
                background="white"
                disabled={dialogMode === "view"}
              />
              {formErrors.smsType && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.smsType}</p>}
            </div>

            <div className={dialogMode === "view" ? "" : "col-span-2"}>
              <FormSelectField
                label="Status"
                value={formValues.status}
                onChange={(value) => {
                  if (dialogMode === "view") return;
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
                disabled={dialogMode === "view"}
              />
              {formErrors.status && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.status}</p>}
            </div>

            {dialogMode === "view" && (
              <div>
                <FormInputField
                  label="Created Date"
                  value={selectedSMS?.createdDate || ""}
                  onChange={() => {}}
                  height={44}
                  placeholder="Created Date"
                  disabled={true}
                />
              </div>
            )}
          </div>

          {/* Content Field - Full Width */}
          <div>
            <FormTextareaField
              label="Content"
              value={formValues.content}
              onChange={(event) => {
                if (dialogMode === "view") return;
                setFormValues((prev) => ({ ...prev, content: event.target.value }));
                setFormErrors((prev) => ({ ...prev, content: "" }));
              }}
              height={73}
              placeholder="Content"
              required={dialogMode !== "view"}
              disabled={dialogMode === "view"}
            />
            {formErrors.content && <p className="mt-1 text-xs text-[#F6776E]">{formErrors.content}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {dialogMode === "view" ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogMode(null);
                  setFormErrors({});
                  setSelectedSMS(null);
                }}
              >
                Close
              </Button>
            ) : (
              <>
                <Button type="submit" variant="primary">
                  {dialogMode === "add" ? "Add SMS" : "Update SMS"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogMode(null);
                    setFormErrors({});
                    setSelectedSMS(null);
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


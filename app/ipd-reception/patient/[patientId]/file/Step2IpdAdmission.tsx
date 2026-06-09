"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { Button, Checkbox, SpinnerLoader } from "@/components/ui";
import type { OpenFileAdmissionSummary, RequiredDocumentItem } from "@/lib/ipd-reception/types";

const FINALIZE_DISCLAIMER =
  "By clicking Finalize, you confirm that all physical documents have been collected.";

type Step2IpdAdmissionProps = {
  admissionSummary: OpenFileAdmissionSummary;
  requiredDocuments: RequiredDocumentItem[];
  isDocumentsLoading?: boolean;
  selectedDocuments: Record<string, boolean>;
  onToggleDocument: (documentMasterId: number) => void;
  confirmConsentsReceived: boolean;
  onConfirmConsentsReceivedChange: (checked: boolean) => void;
  confirmIdTag: boolean;
  onConfirmIdTagChange: (checked: boolean) => void;
  onBack: () => void;
  onFinalize: () => void;
  canFinalize: boolean;
  isFinalizing?: boolean;
  documentsValidationError?: string | null;
  nonCompliantMode?: boolean;
};

function SectionCard({
  title,
  iconSrc,
  children,
  className = "",
}: {
  title: string;
  iconSrc: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-sm md:p-6 ${className}`}
    >
      <div className="mb-5 flex items-center gap-2">
        <Image src={iconSrc} alt="" width={20} height={20} />
        <h2 className="text-base font-medium text-[#262D3B]">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export function Step2IpdAdmission({
  admissionSummary,
  requiredDocuments,
  isDocumentsLoading = false,
  selectedDocuments,
  onToggleDocument,
  confirmConsentsReceived,
  onConfirmConsentsReceivedChange,
  confirmIdTag,
  onConfirmIdTagChange,
  onBack,
  onFinalize,
  canFinalize,
  isFinalizing = false,
  documentsValidationError,
  nonCompliantMode = false,
}: Step2IpdAdmissionProps) {
  const documentGridClassName = nonCompliantMode
    ? "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
    : "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className="space-y-6">
      <div
        className={
          nonCompliantMode
            ? "grid grid-cols-1 gap-4"
            : "grid grid-cols-1 gap-4 lg:grid-cols-[65%_1fr] lg:items-start"
        }
      >
        <div className="min-w-0 space-y-4">
          <SectionCard title="Required Documents" iconSrc="/icons/documents.svg">
            {isDocumentsLoading ? (
              <div className="flex min-h-[120px] items-center justify-center">
                <SpinnerLoader size={24} />
              </div>
            ) : requiredDocuments.length === 0 ? (
              <p className="text-sm text-[#787E8C]">No required documents for this patient.</p>
            ) : (
              <div className={documentGridClassName}>
                {requiredDocuments.map((doc) => {
                  const docKey = String(doc.documentMasterId);
                  const checked = Boolean(selectedDocuments[docKey]);
                  return (
                    <div
                      key={docKey}
                      role="button"
                      tabIndex={0}
                      onClick={() => onToggleDocument(doc.documentMasterId)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onToggleDocument(doc.documentMasterId);
                        }
                      }}
                      className={`flex min-h-[42px] cursor-pointer items-center gap-2 rounded-[4px] border px-4 py-2 text-left transition-colors ${
                        checked
                          ? "border-[#0B8C00] bg-[#F4FAF4]"
                          : "border-[#EBECED] bg-white hover:border-[#0B8C00]/40"
                      }`}
                    >
                      <span onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={checked}
                          onChange={() => onToggleDocument(doc.documentMasterId)}
                        />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-sm font-medium leading-snug text-[#262D3B]">
                          {doc.documentName}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {documentsValidationError ? (
              <p className="mt-3 text-sm text-[#EF4444]" role="alert">
                {documentsValidationError}
              </p>
            ) : null}

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-[6px] border border-[#0B8C00]/50 bg-[#F4FAF4] p-4">
              <Checkbox
                checked={confirmConsentsReceived}
                onChange={onConfirmConsentsReceivedChange}
              />
              <span className="text-sm leading-relaxed text-[#434956]">
                I confirm that I have received the signed consent forms from the patient or their
                attendant.
              </span>
            </label>
          </SectionCard>

          {!nonCompliantMode ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { label: "Ward Assigned", value: admissionSummary.wardAssigned },
                { label: "Billing Type", value: admissionSummary.billingType },
                { label: "Consultant", value: admissionSummary.consultant },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-[#0B8C00]/20 bg-[#F4FAF4] px-4 py-3"
                >
                  <p className="text-xs font-medium text-[#434956]">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold text-[#262D3B]">{item.value}</p>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex min-w-0 flex-col gap-4 overflow-x-auto sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            {!nonCompliantMode ? (
              <>
                <div className="flex shrink-0 flex-row flex-wrap gap-3">
                  <Button
                    variant="primary"
                    size="medium"
                    className="!min-w-0"
                    onClick={onFinalize}
                    disabled={!canFinalize || isFinalizing}
                    isLoading={isFinalizing}
                  >
                    Finalize Admission
                  </Button>
                  <Button
                    variant="outline"
                    size="medium"
                    className="!min-w-0 !border-[#9A7909] !bg-white !text-[#9A7909] shadow-none hover:!bg-[#FBF8F2] active:!bg-[#F5F0E6]"
                    onClick={onBack}
                    leftIcon={<Image src="/icons/LeftArrowIcon.svg" alt="" width={16} height={16} />}
                  >
                    Back
                  </Button>
                </div>
                <p className="shrink-0 whitespace-nowrap text-right text-xs italic leading-relaxed text-[#9FA2AB]">
                  {FINALIZE_DISCLAIMER}
                </p>
              </>
            ) : (
              <div className="flex shrink-0 flex-row flex-wrap gap-3">
                <Button
                  variant="primary"
                  size="small"
                  className="!min-w-0 !rounded-full !px-5"
                  onClick={onFinalize}
                  disabled={!canFinalize || isFinalizing}
                  isLoading={isFinalizing}
                >
                  Update Document
                </Button>
                <Button
                  variant="outline"
                  size="small"
                  className="!min-w-0 !rounded-full !border-[#9A7909] !bg-white !px-5 !text-[#9A7909] shadow-none hover:!bg-[#FBF8F2] active:!bg-[#F5F0E6]"
                  onClick={onBack}
                  leftIcon={<Image src="/icons/LeftArrowIcon.svg" alt="" width={16} height={16} />}
                >
                  Back
                </Button>
              </div>
            )}
          </div>
        </div>

        {!nonCompliantMode ? (
          <SectionCard
            title="Patient ID Tag"
            iconSrc="/icons/PatientIcon.svg"
            className="min-w-0 h-[220px] self-start"
          >
            <p className="mb-4 text-sm leading-relaxed text-[#434956]">
              Confirm that the physical identification wristband has been printed and securely
              attached to the patient.
            </p>
            <button
              type="button"
              onClick={() => onConfirmIdTagChange(!confirmIdTag)}
              className={`flex w-full items-center gap-3 rounded-xl border p-5 text-left transition-colors ${
                confirmIdTag
                  ? "border-[#0B8C00] bg-[#F4FAF4]"
                  : "border-[#EBECED] bg-white hover:border-[#0B8C00]/40"
              }`}
            >
              <Checkbox checked={confirmIdTag} onChange={onConfirmIdTagChange} />
              <span className="text-sm font-medium text-[#262D3B]">
                I confirm that the Patient ID Tag has been issued.
              </span>
            </button>
          </SectionCard>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { Button, Checkbox, SpinnerLoader, BackToPreviousPageButton } from "@/components/ui";
import type { OpenFileAdmissionSummary, RequiredDocumentItem } from "@/lib/ipd-reception/types";
import type { DocumentSelection } from "@/lib/ipd-reception/requiredDocumentsUtils";

const FINALIZE_DISCLAIMER =
  "By clicking Finalize, you confirm that all physical documents have been collected.";

type Step2IpdAdmissionProps = {
  admissionSummary: OpenFileAdmissionSummary;
  requiredDocuments: RequiredDocumentItem[];
  isDocumentsLoading?: boolean;
  documentSelections: Record<number, DocumentSelection | undefined>;
  onRequiredChange: (documentMasterId: number, checked: boolean) => void;
  onNotRequiredChange: (documentMasterId: number, checked: boolean) => void;
  confirmConsentsReceived: boolean;
  onConfirmConsentsReceivedChange: (checked: boolean) => void;
  onBack: () => void;
  onFinalize: () => void;
  canFinalize: boolean;
  isFinalizing?: boolean;
  documentsValidationError?: string | null;
  validationAttempted?: boolean;
  nonCompliantMode?: boolean;
  hideActions?: boolean;
};

const DOCUMENTS_TABLE_GRID =
  "grid w-full grid-cols-3 items-center gap-x-8 sm:gap-x-12 md:gap-x-16";

function SectionCard({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-sm md:p-6 ${className}`}
    >
      {title ? (
        <h2 className="mb-5 text-base font-medium text-[#262D3B]">{title}</h2>
      ) : null}
      {children}
    </div>
  );
}

export function Step2IpdAdmission({
  admissionSummary,
  requiredDocuments,
  isDocumentsLoading = false,
  documentSelections,
  onRequiredChange,
  onNotRequiredChange,
  confirmConsentsReceived,
  onConfirmConsentsReceivedChange,
  onBack,
  onFinalize,
  canFinalize,
  isFinalizing = false,
  documentsValidationError,
  validationAttempted = false,
  nonCompliantMode = false,
  hideActions = false,
}: Step2IpdAdmissionProps) {
  const finalizeLabel = nonCompliantMode ? "Update Document" : "Finalize Admission";

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Documents">
        {isDocumentsLoading ? (
          <div className="flex min-h-[160px] items-center justify-center">
            <SpinnerLoader size={24} />
          </div>
        ) : requiredDocuments.length === 0 ? (
          <div className="flex min-h-[120px] items-center justify-center">
            <p className="text-sm text-[#787E8C]">No required documents for this patient.</p>
          </div>
        ) : (
          <div className="w-full">
            <div className={`${DOCUMENTS_TABLE_GRID} border-b border-[#EDF3EA] pb-4`}>
              <span className="text-sm font-medium text-[#262D3B]">Documents</span>
              <span className="text-center text-sm font-medium text-[#262D3B]">
                Required Document
              </span>
              <span className="text-center text-sm font-medium text-[#262D3B]">
                Not Required Document
              </span>
            </div>

            <div className="flex flex-col">
              {requiredDocuments.map((doc) => {
                const selection = documentSelections[doc.documentMasterId];
                const isRequired = selection === "required";
                const isNotRequired = selection === "not_required";

                return (
                  <div
                    key={doc.documentMasterId}
                    className={`${DOCUMENTS_TABLE_GRID} border-b border-[#EDF3EA] py-4 last:border-b-0`}
                  >
                    <span className="text-sm font-normal leading-relaxed text-[#262D3B]">
                      {doc.documentName}
                    </span>
                    <div className="flex justify-center">
                      <Checkbox
                        checked={isRequired}
                        onChange={(checked) => onRequiredChange(doc.documentMasterId, checked)}
                      />
                    </div>
                    <div className="flex justify-center">
                      <Checkbox
                        checked={isNotRequired}
                        onChange={(checked) => onNotRequiredChange(doc.documentMasterId, checked)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {validationAttempted && documentsValidationError ? (
          <p className="mt-3 text-sm text-[#EF4444]" role="alert">
            {documentsValidationError}
          </p>
        ) : null}

        <div className="mt-6 rounded-[6px] border border-[#0B8C00]/50 bg-[#F4FAF4] p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <Checkbox
              checked={confirmConsentsReceived}
              onChange={(checked) => onConfirmConsentsReceivedChange(checked)}
            />
            <span className="text-sm font-semibold leading-relaxed text-[#262D3B]" style={{marginTop:"-3px"}}>
              I confirm that I have received the signed consent forms from the patient or their
              attendant.
            </span>
          </label>
        </div>
      </SectionCard>

      {nonCompliantMode ? (
        <div className="flex flex-wrap items-center justify-start gap-3">
          <Button
            type="button"
            variant="primary"
            size="medium"
            className="!min-w-[180px] h-11 shrink-0 rounded-full !font-bold"
            onClick={onFinalize}
            disabled={!canFinalize || isFinalizing}
            isLoading={isFinalizing}
          >
            {finalizeLabel}
          </Button>
          <BackToPreviousPageButton text="Back" onClick={onBack} />
        </div>
      ) : null}
      {!nonCompliantMode && !hideActions ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="primary"
              size="medium"
              className="!min-w-0"
              onClick={onFinalize}
              disabled={!canFinalize || isFinalizing}
              isLoading={isFinalizing}
            >
              {finalizeLabel}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="medium"
              className="!min-w-0 !border-[#9A7909] !bg-white !text-[#9A7909] shadow-none hover:!bg-[#FBF8F2] active:!bg-[#F5F0E6]"
              onClick={onBack}
              leftIcon={<Image src="/icons/LeftArrowIcon.svg" alt="" width={16} height={16} />}
            >
              Back
            </Button>
          </div>
          <p className="text-xs italic leading-relaxed text-[#9FA2AB] sm:text-right">
            {FINALIZE_DISCLAIMER}
          </p>
        </div>
      ) : null}
    </div>
  );
}

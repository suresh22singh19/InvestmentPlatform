"use client";

import Image from "next/image";
import { Button } from "@/components/ui";
import { DISCHARGE_DOCUMENT_SECTIONS } from "@/lib/ipd-reception/dischargeMock";
import { DischargeFlowFooter } from "./DischargeFlowFooter";

type StepDocumentGenerationProps = {
  onBack: () => void;
  onNext: () => void;
};

export function StepDocumentGeneration({ onBack, onNext }: StepDocumentGenerationProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-[#262D3B]">Document Generation</h2>

      {DISCHARGE_DOCUMENT_SECTIONS.map((section) => (
        <div key={section.title} className="space-y-3">
          <h3 className="text-base font-medium text-[#434956]">{section.title}</h3>
          <div className="flex flex-wrap gap-3">
            {section.items.map((doc) =>
              section.variant === "invoice" ? (
                <button
                  key={doc.id}
                  type="button"
                  className="flex min-w-[180px] items-center gap-3 rounded-[20px] border border-[#E3EEE1] bg-white px-5 py-4 text-left shadow-sm transition-shadow hover:shadow-md"
                >
                  <Image src="/icons/DownloadExport.svg" alt="" width={20} height={20} />
                  <span className="text-sm font-medium text-[#262D3B]">{doc.title}</span>
                </button>
              ) : (
                <div
                  key={doc.id}
                  className="flex min-w-[200px] flex-col gap-3 rounded-[20px] border border-[#E3EEE1] bg-white p-4 shadow-sm"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#262D3B]">{doc.title}</p>
                    <p className="mt-1 text-xs text-[#9FA2AB]">Ready to print</p>
                  </div>
                  <Button
                    variant="primary"
                    size="xsmall"
                    className="!min-w-0 self-start"
                    leftIcon={<Image src="/icons/Printer.svg" alt="" width={16} height={16} />}
                  >
                    Print
                  </Button>
                </div>
              )
            )}
          </div>
        </div>
      ))}

      <DischargeFlowFooter onBack={onBack} onNext={onNext} />
    </div>
  );
}

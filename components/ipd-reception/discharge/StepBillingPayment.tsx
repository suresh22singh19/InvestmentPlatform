"use client";

import { Badge } from "@/components/ui";
import type { DischargeBillingInfo } from "@/lib/ipd-reception/dischargeTypes";
import { formatIndianCurrency } from "@/lib/ipd-reception/dischargeMock";
import { DischargeFlowFooter } from "./DischargeFlowFooter";

type StepBillingPaymentProps = {
  billing: DischargeBillingInfo;
  onBack: () => void;
  onNext: () => void;
};

export function StepBillingPayment({ billing, onBack, onNext }: StepBillingPaymentProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-[20px] bg-[#0B8C00] p-6 text-white shadow-sm">
          <h2 className="text-lg font-semibold">Billing & Payment Clearance</h2>
          <div className="mt-6 space-y-4">
            <div className="flex justify-between gap-4 border-b border-white/20 pb-4">
              <span className="text-sm text-white/90">Total Bill Amount</span>
              <span className="text-sm font-bold">
                {formatIndianCurrency(billing.totalBillAmount)}
              </span>
            </div>
            <div className="flex justify-between gap-4 border-b border-white/20 pb-4">
              <span className="text-sm text-white/90">Amount Paid</span>
              <span className="text-sm font-bold">
                {formatIndianCurrency(billing.amountPaid)}
              </span>
            </div>
            <div className="flex justify-between gap-4 border-b border-white/20 pb-4">
              <span className="text-sm text-white/90">Insurance Status</span>
              <span className="text-sm font-bold">{billing.insuranceStatus}</span>
            </div>
            <div className="flex justify-between gap-4 pt-2">
              <span className="text-sm font-medium">Payment Status</span>
              <Badge variant="warning" className="!border-white/40 !bg-white/15 !text-white">
                {billing.paymentStatus}
              </Badge>
            </div>
          </div>
        </div>

        <div className="rounded-[20px] border border-[#E3EEE1] bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold text-[#262D3B]">Admission Details</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { label: "Admission Date", value: billing.admissionDate },
              { label: "Date of Discharge", value: billing.dischargeDate },
              { label: "Ward", value: billing.ward },
              { label: "Bed", value: billing.bed },
              { label: "Doctor", value: billing.doctor },
              { label: "Diagnosis", value: billing.diagnosis },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs font-medium text-[#9FA2AB]">{item.label}</p>
                <p className="mt-1 text-sm font-semibold text-[#262D3B]">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <DischargeFlowFooter onBack={onBack} onNext={onNext} />
    </div>
  );
}

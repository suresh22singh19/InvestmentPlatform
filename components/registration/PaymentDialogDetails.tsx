"use client";

import Image from "next/image";
import { Dialog, ThreeDotLoader } from "@/components/ui";
import { useEffect } from "react";
import { PaymentReceiptCapture } from "@/components/registration/PaymentReceiptCapture";

interface PaymentDialogDetailsProps {
    open: boolean;
    onClose: () => void;
    patientName: string;
    address: string;
    /** When provided and not India, show Address Line 1 & 2 instead of single Address */
    countryName?: string;
    addressLine1?: string;
    addressLine2?: string;
    /** Pin Code (India) or ZIP/Postal Code (non-India) */
    pinCode?: string;
    cityName: string;
    stateName: string;
    jsHealthCardNo: string;
    uhid?: string; // Patient UHID (takes priority over jsHealthCardNo)
    /** Invoice number from registration API (shown after successful payment) */
    invoiceNumber?: string;
    consultationCharges: number;
    subtotal: number;
    tax: number;
    totalAmount: number;
    billDate: string;
    transactionId?: string;
    paymentMode?: string;
    gstBilling?: boolean;
    gstNumber?: string;
    companyName?: string;
    billingAddress?: string;
    billingStateName?: string;
    billingCityName?: string;
    billingPincode?: string;
    onPrint: () => void;
    onSaveAndNext: () => void;
    onDownload: () => void | Promise<void>;
    isSubmitting?: boolean;
    isDownloadingInvoice?: boolean;
    canDownload?: boolean;
    /** When true, only Download and Print are shown (post-success receipt). */
    receiptActionsOnly?: boolean;
    submitLabel?: string;
    splitCashAmount?: string;
    splitCashStatus?: string;
    splitUpiAmount?: string;
    splitUpiStatus?: string;
    splitCardAmount?: string;
    splitCardStatus?: string;
    selectedOnlineSplitMethod?: "razorpay" | "payu";
    invoiceId?: number | string;
    contactNumber?: string;
    admissionType?: string;
    admissionDate?: string;
    amountReceived?: number;
    dueAmount?: number;
    paymentStatus?: string;
    paymentRecords?: Array<{
        id?: number;
        amount: string | number;
        method: string;
        status: string;
    }>;
    lineItemLabel?: string;
    branch?: any;
    branchAddress?: string;
}

export default function PaymentDialogDetails({
    open,
    onClose,
    patientName,
    address,
    countryName,
    addressLine1,
    addressLine2,
    pinCode,
    cityName,
    stateName,
    jsHealthCardNo,
    uhid,
    invoiceNumber,
    consultationCharges,
    subtotal,
    tax,
    totalAmount,
    billDate,
    transactionId,
    paymentMode,
    gstBilling = false,
    gstNumber,
    companyName,
    billingAddress,
    billingStateName,
    billingCityName,
    billingPincode,
    onPrint,
    onSaveAndNext,
    onDownload,
    isSubmitting = false,
    isDownloadingInvoice = false,
    canDownload = true,
    receiptActionsOnly = false,
    submitLabel = "Submit",
    splitCashAmount,
    splitCashStatus,
    splitUpiAmount,
    splitUpiStatus,
    splitCardAmount,
    splitCardStatus,
    selectedOnlineSplitMethod,
    invoiceId,
    contactNumber,
    admissionType,
    admissionDate,
    amountReceived,
    dueAmount,
    paymentStatus,
    paymentRecords,
    lineItemLabel,
    branch,
    branchAddress,
}: PaymentDialogDetailsProps) {
    // Add print styles for proper spacing - single page only
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            @media print {
                @page {
                    margin: 8mm;
                    size: A4 portrait;
                }
                * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                body {
                    margin: 0 !important;
                    padding: 0 !important;
                    background: white !important;
                }
                .dialog-backdrop {
                    background: white !important;
                    position: absolute !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    display: block !important;
                    z-index: 9999 !important;
                }
                .dialog-container {
                    box-shadow: none !important;
                    border: none !important;
                    max-width: 100% !important;
                    width: 100% !important;
                    height: auto !important;
                    max-height: none !important;
                    margin: 0 !important;
                    padding: 2px 2px !important;
                    border-radius: 0 !important;
                    overflow: visible !important;
                    page-break-inside: avoid !important;
                    page-break-after: avoid !important;
                    page-break-before: avoid !important;
                    position: relative !important;
                }
                .dialog-container > div {
                    padding-left: 5px !important;
                    padding-right: 5px !important;
                }
                /* Reduce padding in header and content sections */
                .dialog-container [class*="px-6"] {
                    padding-left: 5px !important;
                    padding-right: 5px !important;
                }
                .dialog-container [class*="px-5"] {
                    padding-left: 5px !important;
                    padding-right: 5px !important;
                }
                /* Hide everything except the dialog content */
                body > *:not(.dialog-backdrop) {
                    display: none !important;
                }
                /* Hide close button and action buttons during print */
                .no-print {
                    display: none !important;
                }
                /* Remove top gap in print */
                .invoice-content {
                    gap: 0 !important;
                    padding-top: 0 !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    border-top: none !important;
                }
                #payment-receipt-capture {
                    width: 100% !important;
                    max-width: 100% !important;
                    box-sizing: border-box !important;
                    border: 1px solid #C0C3C8 !important;
                    background: #ffffff !important;
                }
            }
        `;
        document.head.appendChild(style);
        return () => {
            if (document.head.contains(style)) {
                document.head.removeChild(style);
            }
        };
    }, []);

    // Custom header with only close button
    const customHeader = (
        <div className="no-print flex items-center justify-end px-6 pt-4 pb-0">
            <button
                type="button"
                onClick={onClose}
                className="no-print flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-200 hover:bg-[#F2F8F2]"
                aria-label="Close dialog"
            >
                <Image src="/icons/CrossIcon.svg" alt="Close dialog" width={24} height={24} />
            </button>
        </div>
    );

    return (
        <Dialog
            open={open}
            onClose={onClose}
            title=""
            width="60%"
            customHeader={customHeader}
            contentPadding="pt-0 pb-6 px-4"
        >
            <div className="invoice-content flex w-full min-w-0 flex-col gap-[16px] ">
                <PaymentReceiptCapture
                    captureId="payment-receipt-capture"
                    patientName={patientName}
                    address={address}
                    countryName={countryName}
                    addressLine1={addressLine1}
                    addressLine2={addressLine2}
                    pinCode={pinCode}
                    cityName={cityName}
                    stateName={stateName}
                    jsHealthCardNo={jsHealthCardNo}
                    uhid={uhid}
                    invoiceNumber={invoiceNumber}
                    consultationCharges={consultationCharges}
                    subtotal={subtotal}
                    tax={tax}
                    totalAmount={totalAmount}
                    billDate={billDate}
                    transactionId={transactionId}
                    paymentMode={paymentMode}
                    gstBilling={gstBilling}
                    gstNumber={gstNumber}
                    companyName={companyName}
                    billingAddress={billingAddress}
                    billingStateName={billingStateName}
                    billingCityName={billingCityName}
                    billingPincode={billingPincode}
                    splitCashAmount={splitCashAmount}
                    splitCashStatus={splitCashStatus}
                    splitUpiAmount={splitUpiAmount}
                    splitUpiStatus={splitUpiStatus}
                    splitCardAmount={splitCardAmount}
                    splitCardStatus={splitCardStatus}
                    selectedOnlineSplitMethod={selectedOnlineSplitMethod}
                    invoiceId={invoiceId}
                    contactNumber={contactNumber}
                    admissionType={admissionType}
                    admissionDate={admissionDate}
                    amountReceived={amountReceived}
                    dueAmount={dueAmount}
                    paymentStatus={paymentStatus}
                    paymentRecords={paymentRecords}
                    lineItemLabel={lineItemLabel}
                    branch={branch}
                    branchAddress={branchAddress}
                />

                {/* Action Buttons */}
                <div className="no-print flex flex-wrap justify-end items-center gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="cursor-pointer flex flex-row justify-center items-center px-6 py-3 gap-2 h-[41px] rounded-[32px] border border-[#C0C3C8] bg-white font-inter text-[14px] font-medium leading-[120%] text-[#434956] transition-colors hover:bg-[#F5F6F8]"
                    >
                        Close
                    </button>
                    <button
                        onClick={onPrint}
                        className="cursor-pointer flex flex-row justify-center items-center px-6 py-3 gap-2 h-[41px] border border-[#0B8C00] rounded-[32px] font-inter text-[14px] leading-[120%] text-center text-[#0B8C00] hover:bg-[#0B8C00]/10 transition-colors"
                    >
                        <Image src="/icons/Printer.svg" alt="Print invoice" width={20} height={20} />
                        Print Invoice
                    </button>
                    {canDownload ? (
                        <button
                            type="button"
                            onClick={() => void onDownload()}
                            disabled={isSubmitting || isDownloadingInvoice}
                            className={`flex h-10 shrink-0 items-center justify-center gap-2 rounded-[32px] border border-[#9A7909] bg-white px-6 font-inter text-sm font-medium leading-[120%] text-[#9A7909] transition-colors hover:bg-[#FEF9E7] disabled:cursor-not-allowed disabled:opacity-60 ${isDownloadingInvoice ? "cursor-wait" : "cursor-pointer"
                                }`}
                        >
                            {isDownloadingInvoice ? (
                                <ThreeDotLoader color="green" size="small" />
                            ) : (
                                <>
                                    <Image
                                        src="/icons/DownloadExport.svg"
                                        alt="Download receipt"
                                        width={20}
                                        height={20}
                                        className="shrink-0"
                                    />
                                    Download Now
                                </>
                            )}
                        </button>
                    ) : null}
                    {!receiptActionsOnly ? (
                        <button
                            onClick={onSaveAndNext}
                            disabled={isSubmitting}
                            className={`flex flex-row justify-center items-center px-6 py-3 gap-2 h-[41px] border bg-[#0B8C00] border-[#0B8C00] rounded-[32px] font-inter text-[14px] leading-[120%] text-center text-[#ffffff] transition-colors ${isSubmitting
                                ? "opacity-50 cursor-not-allowed"
                                : "cursor-pointer hover:bg-[#0A7A00]"
                                }`}
                        >
                            {isSubmitting ? (
                                <ThreeDotLoader color="white" size="small" />
                            ) : (
                                <>
                                    <Image src="/icons/save.svg" alt={submitLabel} width={20} height={20} />
                                    <span>{submitLabel}</span>
                                </>
                            )}
                        </button>
                    ) : null}
                </div>
            </div>
        </Dialog>
    );
}

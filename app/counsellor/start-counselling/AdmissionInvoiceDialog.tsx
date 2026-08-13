"use client";

import Image from "next/image";
import { useEffect } from "react";
import { Dialog } from "@/components/ui";
import {
    AdmissionInvoiceReceipt,
    type AdmissionInvoiceReceiptProps,
} from "./AdmissionInvoiceReceipt";

interface AdmissionInvoiceDialogProps extends AdmissionInvoiceReceiptProps {
    open: boolean;
    onClose: () => void;
    onSaveAndNext?: () => void;
}

export default function AdmissionInvoiceDialog({
    open,
    onClose,
    onSaveAndNext,
    ...receiptProps
}: AdmissionInvoiceDialogProps) {
    useEffect(() => {
        const style = document.createElement("style");
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
                body > *:not(.dialog-backdrop) {
                    display: none !important;
                }
                .no-print {
                    display: none !important;
                }
                .invoice-content {
                    gap: 0 !important;
                    padding-top: 0 !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    border-top: none !important;
                }
                #counsellor-admission-invoice {
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
console.log("receiptProps",receiptProps)
    return (
        <Dialog
            open={open}
            onClose={onClose}
            title=""
            width="60%"
            customHeader={customHeader}
            contentPadding="pt-0 pb-6 px-4"
        >
            <div className="invoice-content flex w-full min-w-0 flex-col gap-[16px]">
                <AdmissionInvoiceReceipt {...receiptProps} />

                <div className="no-print flex flex-wrap items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-[41px] cursor-pointer flex-row items-center justify-center gap-2 rounded-[32px] border border-[#C0C3C8] bg-white px-6 py-3 font-inter text-[14px] font-medium leading-[120%] text-[#434956] transition-colors hover:bg-[#F5F6F8]"
                    >
                        Close
                    </button>
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="flex h-[41px] cursor-pointer flex-row items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] px-6 py-3 font-inter text-[14px] leading-[120%] text-[#0B8C00] transition-colors hover:bg-[#0B8C00]/10"
                    >
                        <Image src="/icons/Printer.svg" alt="Print invoice" width={20} height={20} />
                        Print Invoice
                    </button>
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[32px] border border-[#9A7909] bg-white px-6 font-inter text-sm font-medium leading-[120%] text-[#9A7909] transition-colors hover:bg-[#FEF9E7]"
                    >
                        <Image
                            src="/icons/DownloadExport.svg"
                            alt="Download receipt"
                            width={20}
                            height={20}
                            className="shrink-0"
                        />
                        Download Now
                    </button>
                    {onSaveAndNext && receiptProps?.admissionType === "Immediate" && (
                        <button
                            type="button"
                            onClick={onSaveAndNext}
                            className="flex h-[41px] cursor-pointer flex-row items-center justify-center gap-2 rounded-[32px] border border-[#0B8C00] bg-[#0B8C00] px-6 py-3 font-inter text-[14px] font-medium leading-[120%] text-white transition-colors hover:bg-[#0A7A00]"
                        >
                            Save and Next
                            <span aria-hidden="true">→</span>
                        </button>
                    )}
                </div>
            </div>
        </Dialog>
    );
}

"use client";

import Image from "next/image";
import { Dialog, ThreeDotLoader } from "@/components/ui";
import { useEffect } from "react";

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
    onDownload: () => void;
    isSubmitting?: boolean;
    isHospitalRegistration?: boolean;
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
    isHospitalRegistration = false,
}: PaymentDialogDetailsProps) {
    // Add print styles for proper spacing - single page only
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            @media print {
                @page {
                    margin: 0.2cm;
                    size: A4;
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
                    max-height: 100vh !important;
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

    // Check if transaction ID should be displayed (only for digital payments)
    const isDigitalPayment = paymentMode?.toLowerCase() === 'credit';
    const showTransactionId = isDigitalPayment && transactionId && transactionId.trim() !== '';
    // Format currency
    const formatCurrency = (amount: number) => {
        return `₹${amount.toLocaleString('en-IN')}`;
    };

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
        <Dialog open={open} onClose={onClose} title="" width="50%" customHeader={customHeader}>
            <div className="w-full bg-white flex flex-col gap-[16px] invoice-content mt-[-20px]">
              {/* Outer border wrapping entire invoice content */}
              <div className="border border-[#C0C3C8] rounded-[1px] overflow-hidden flex flex-col">
                {/* Header: Logo + Company Info + Payment Receipt */}
                <div className="flex items-center py-[11px] px-[24px]">
                    <div className="flex-shrink-0">
                        <Image
                            src="/images/logo.png"
                            alt="Jeena Sikho Lifecare Limited Logo"
                            width={120}
                            height={80}
                            className="object-contain"
                        />
                    </div>
                    <div className="flex flex-col items-center flex-1">
                        <h1 className="font-inter not-italic font-semibold text-[20px] leading-[130%] text-center text-[#434956] mb-1">
                            Jeena Sikho Lifecare Limited
                        </h1>
                        <p className="font-inter not-italic font-normal text-[12px] leading-[140%] text-center text-[#434956]">
                            Pind Devinagar, Hadbast No. 18, Chandigarh Delhi Highway,Tehsil Derabassi,<br />
                            Distt Mohali Punjab, DERABASSI, PUNJAB 140507, Devinagar BO, derabassi,<br />
                            Mohali (Ajitgarh), PUNJAB(140507)
                        </p>
                        <h2 className="font-inter not-italic font-semibold text-[20px] leading-[130%] text-center text-[#434956] mt-3">
                            Payment Receipt
                        </h2>
                    </div>
                </div>

                {/* Bill Date & Patient UHID rows */}
                <div className="flex flex-col w-full">
                    {/* Bill Date Row */}
                    <div className="flex items-center gap-[8px] w-full h-[55px] border-t border-[#C0C3C8] py-[11px] px-[24px]">
                        <span className="font-inter not-italic font-extrabold text-[14px] leading-[120%] text-[#434956]">Bill Date:</span>
                        <span className="font-inter not-italic font-medium text-[14px] leading-[120%] text-[#434956]">{billDate}</span>
                    </div>
                    {/* Patient UHID Row */}
                    <div className="flex items-center gap-[8px] w-full h-[55px] border-t border-[#C0C3C8] py-[11px] px-[24px]">
                        <span className="font-inter not-italic font-extrabold text-[14px] leading-[120%] text-[#434956]">Patient UHID:</span>
                        <span className="font-inter not-italic font-medium text-[14px] leading-[120%] text-[#434956]">
                            {uhid || 'N/A'}
                        </span>
                    </div>
                </div>

                {/* Customer Details Section */}
                <div className="flex flex-col w-full border-t border-[#C0C3C8]">
                    <h3 className="font-inter not-italic font-extrabold text-[19px] leading-[130%] text-[#434956] py-[11px] px-[24px] pb-0">
                        Customer Details
                    </h3>
                    <div className="flex flex-col gap-[8px] py-[11px] px-[24px]">
                        <p className="font-inter not-italic text-[14px] leading-[120%] text-[#434956]">
                            <span className="font-extrabold">Name:</span>{' '}
                            <span className="font-medium">{patientName}</span>
                        </p>
                        {(!countryName || countryName === "India") ? (
                            <p className="font-inter not-italic text-[14px] leading-[120%] text-[#434956]">
                                <span className="font-extrabold">Address:</span>{' '}
                                <span className="font-medium">{address || "N/A"}</span>
                            </p>
                        ) : (
                            <>
                                <p className="font-inter not-italic text-[14px] leading-[120%] text-[#434956]">
                                    <span className="font-extrabold">Address Line 1:</span>{' '}
                                    <span className="font-medium">{addressLine1?.trim() || "N/A"}</span>
                                </p>
                                <p className="font-inter not-italic text-[14px] leading-[120%] text-[#434956]">
                                    <span className="font-extrabold">Address Line 2:</span>{' '}
                                    <span className="font-medium">{addressLine2?.trim() || "N/A"}</span>
                                </p>
                            </>
                        )}
                        <p className="font-inter not-italic text-[14px] leading-[120%] text-[#434956]">
                            <span className="font-extrabold">City:</span>{' '}
                            <span className="font-medium">{cityName}</span>
                        </p>
                        <p className="font-inter not-italic text-[14px] leading-[120%] text-[#434956]">
                            <span className="font-extrabold">State:</span>{' '}
                            <span className="font-medium">{stateName}</span>
                        </p>
                    </div>
                </div>

                {/* GST Billing Section */}
                {gstBilling && (
                    <div className="flex flex-col w-full border-t border-[#C0C3C8]">
                        <h3 className="font-inter not-italic font-semibold text-[24px] leading-[130%] text-[#434956] py-[11px] px-[24px]">
                            GST Billing
                        </h3>
                        <div className="flex flex-col gap-[8px] py-[11px] px-[24px]">
                            <p className="font-inter not-italic text-[14px] leading-[120%] text-[#434956]">
                                <span className="font-extrabold">GST Number:</span>{' '}
                                <span className="font-medium">{gstNumber || 'N/A'}</span>
                            </p>
                            <p className="font-inter not-italic text-[14px] leading-[120%] text-[#434956]">
                                <span className="font-extrabold">Company Name:</span>{' '}
                                <span className="font-medium">{companyName || 'N/A'}</span>
                            </p>
                            <p className="font-inter not-italic text-[14px] leading-[120%] text-[#434956]">
                                <span className="font-extrabold">Billing Address:</span>{' '}
                                <span className="font-medium">{billingAddress || 'N/A'}</span>
                            </p>
                            <p className="font-inter not-italic text-[14px] leading-[120%] text-[#434956]">
                                <span className="font-extrabold">State:</span>{' '}
                                <span className="font-medium">{billingStateName || 'N/A'}</span>
                            </p>
                            <p className="font-inter not-italic text-[14px] leading-[120%] text-[#434956]">
                                <span className="font-extrabold">City:</span>{' '}
                                <span className="font-medium">{billingCityName || 'N/A'}</span>
                            </p>
                            <p className="font-inter not-italic text-[14px] leading-[120%] text-[#434956]">
                                <span className="font-extrabold">Pin Code:</span>{' '}
                                <span className="font-medium">{billingPincode || 'N/A'}</span>
                            </p>
                        </div>
                    </div>
                )}

                {/* Items Table */}
                <table className="w-full border-collapse">
                    {/* Header Row */}
                    <thead>
                        <tr>
                            <th className="text-left font-inter not-italic font-extrabold text-[14px] leading-[120%] text-[#434956] border border-[#C0C3C8] py-[14px] px-[24px]">
                                Item Name
                            </th>
                            <th className="text-left font-inter not-italic font-extrabold text-[14px] leading-[120%] text-[#434956] border border-[#C0C3C8] py-[14px] px-[24px] w-[160px]">
                                Amount
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Consultation Fee Row */}
                        <tr>
                            <td className="font-inter not-italic font-normal text-[14px] leading-[120%] text-[#434956] border border-[#C0C3C8] py-[12px] px-[24px]">
                                Consultation Fee
                            </td>
                            <td className="font-inter not-italic font-normal text-[14px] leading-[120%] text-[#434956] border border-[#C0C3C8] py-[12px] px-[24px]">
                                {formatCurrency(consultationCharges)}
                            </td>
                        </tr>
                        {/* Subtotal Row */}
                        <tr>
                            <td className="font-inter not-italic font-extrabold text-[14px] leading-[120%] text-[#434956] border border-[#C0C3C8] py-[12px] px-[24px] text-right">
                                Subtotal
                            </td>
                            <td className="font-inter not-italic font-normal text-[14px] leading-[120%] text-[#434956] border border-[#C0C3C8] py-[12px] px-[24px]">
                                {formatCurrency(subtotal)}
                            </td>
                        </tr>
                        {/* Tax Row */}
                        <tr>
                            <td className="font-inter not-italic font-extrabold text-[14px] leading-[120%] text-[#434956] border border-[#C0C3C8] py-[12px] px-[24px] text-right">
                                Tax
                            </td>
                            <td className="font-inter not-italic font-normal text-[14px] leading-[120%] text-[#434956] border border-[#C0C3C8] py-[12px] px-[24px]">
                                {formatCurrency(tax)}
                            </td>
                        </tr>
                        {/* Total Amount Row */}
                        <tr>
                            <td className="font-inter not-italic font-extrabold text-[14px] leading-[120%] text-[#434956] border border-[#C0C3C8] py-[12px] px-[24px] text-right">
                                Total Amount:
                            </td>
                            <td className="font-inter not-italic font-semibold text-[14px] leading-[120%] text-[#434956] border border-[#C0C3C8] py-[12px] px-[24px]">
                                {formatCurrency(totalAmount)}
                            </td>
                        </tr>
                    </tbody>
                </table>
              </div>

                {/* Action Buttons */}
                <div className="no-print flex justify-end items-center gap-2">
                    <button
                        onClick={onPrint}
                        className="cursor-pointer flex flex-row justify-center items-center px-6 py-3 gap-2 h-[41px] border border-[#0B8C00] rounded-[32px] font-inter text-[14px] leading-[120%] text-center text-[#0B8C00] hover:bg-[#0B8C00]/10 transition-colors"
                    >
                        <Image src="/icons/Printer.svg" alt="Print invoice" width={20} height={20} />
                        Print Invoice
                    </button>
                    <button
                        onClick={onSaveAndNext}
                        disabled={isSubmitting}
                        className={`flex flex-row justify-center items-center px-6 py-3 gap-2 h-[41px] border bg-[#0B8C00] border-[#0B8C00] rounded-[32px] font-inter text-[14px] leading-[120%] text-center text-[#ffffff] transition-colors ${
                            isSubmitting
                                ? "opacity-50 cursor-not-allowed"
                                : "cursor-pointer hover:bg-[#0A7A00]"
                        }`}
                    >
                        {isSubmitting ? (
                            <ThreeDotLoader color="white" size="small" />
                        ) : (
                            <>
                                <Image src="/icons/save.svg" alt={isHospitalRegistration ? "Submit" : "Save and next"} width={20} height={20} />
                                <span>{isHospitalRegistration ? "Submit" : "Save & Next"}</span>
                            </>
                        )}
                    </button>
                    {/* <button
                        onClick={onDownload}
                        className="cursor-pointer flex flex-row justify-center items-center px-6 py-3 gap-2 h-[41px] border border-[#9A7909] rounded-[32px] font-inter text-[14px] leading-[120%] text-center text-[#9A7909] hover:bg-[#9A7909]/10 transition-colors"
                    >
                        <Image src="/icons/Download.svg" alt="Download invoice" width={20} height={20} /> Download Now
                    </button> */}
                </div>
            </div>
        </Dialog>
    );
}

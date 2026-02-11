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

    // Custom header with logo on left and Invoice centered
    const customHeader = (
        <div className="relative flex items-start px-6 pt-4 pb-4">
            {/* Logo on the left */}
            <div className="flex-shrink-0">
                <Image 
                    src="/images/logo.png" 
                    alt="Jeena Sikho Lifecare Limited Logo" 
                    width={120} 
                    height={40}
                    className="object-contain"
                />
            </div>
            
            {/* Invoice text centered at top */}
            <div className="absolute left-1/2 transform -translate-x-1/2 top-4">
                <h2 className="text-2xl font-semibold text-[#262D3B]">
                    Invoice
                </h2>
            </div>
            
            {/* Close button on the right */}
            <button
                type="button"
                onClick={onClose}
                className="no-print flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-200 hover:bg-[#F2F8F2] ml-auto"
                aria-label="Close dialog"
            >
                <Image src="/icons/CrossIcon.svg" alt="Close dialog" width={24} height={24} />
            </button>
        </div>
    );

    return (
        <Dialog open={open} onClose={onClose} title="" width="50%" customHeader={customHeader}>
            <div className="w-full bg-white">
                {/* Company Info - Centered */}
                <div className="text-center mb-6">
                    <h1 className="font-inter not-italic font-medium text-[22px] leading-[120%] text-center text-[#434956] mb-2">
                        Jeena Sikho Lifecare Limited
                    </h1>
                    <p className="font-inter not-italic font-medium text-[14px] leading-[120%] text-center text-[#434956]">
                        Pind Devinagar, Hadbast No. 18, Chandigarh Delhi Highway, Tehsil Derabassi,<br />
                        Distt Mohali Punjab, DERABASSI, PUNJAB 140507, Devinagar BO, derabassi,<br />
                        Mohali (Ajitgarh), PUNJAB(140507)
                    </p>
                </div>

                <div className="mb-6">
                    {/* Title */}
                    <h2 className="font-inter not-italic font-semibold text-[24px] leading-[130%] text-center text-[#434956] mb-4">
                        Payment Receipt
                    </h2>

                    {/* Two Row Layout */}
                    <div className="grid grid-cols-2 gap-6 mb-4 text-sm">
                        {/* Row 1: Bill Date and Patient UHID */}
                        <div>
                            <p className="font-inter not-italic font-medium text-[12px] leading-[120%] text-[#434956] mb-2">Bill Date</p>
                            <p className="font-inter not-italic font-medium text-[14px] leading-[120%] text-[#434956]">{billDate}</p>
                        </div>
                        <div>
                            <p className="font-inter not-italic font-medium text-[12px] leading-[120%] text-[#434956] mb-2">Patient UHID</p>
                            <p className="font-inter not-italic font-medium text-[14px] leading-[120%] text-[#434956]">
                                {uhid || 'N/A'}
                            </p>
                        </div>
                        
                        {/* Row 2: Payment Methode and Transaction ID (if exists) */}
                        <div>
                            <p className="font-inter not-italic font-medium text-[12px] leading-[120%] text-[#434956] mb-2">Payment Methode</p>
                            <p className="font-inter not-italic font-medium text-[14px] leading-[120%] text-[#434956]">
                                {paymentMode
                                    ? (paymentMode.toLowerCase() === 'razorpay' || paymentMode.toLowerCase() === 'credit'
                                        ? 'Credit'
                                        : 'Cash')
                                    : 'N/A'}
                            </p>
                        </div>
                        {showTransactionId ? (
                            <div>
                                <p className="font-inter not-italic font-medium text-[12px] leading-[120%] text-[#434956] mb-2">Transaction ID</p>
                                <p className="font-inter not-italic font-medium text-[14px] leading-[120%] text-[#434956]">
                                    {transactionId}
                                </p>
                            </div>
                        ) : (
                            <div>
                                {/* Empty div to maintain grid layout when Transaction ID doesn't exist */}
                            </div>
                        )}
                    </div>
                </div>
                <div className="mb-6">
                    {/* Customer Details */}
                    <h3 className="font-inter not-italic font-semibold text-[24px] leading-[130%] text-start text-[#434956] mb-4">
                        Customer Details
                    </h3>

                    <div className="grid grid-cols-2 gap-6 text-sm mb-6">
                        <div>
                            <p className="font-inter not-italic font-medium text-[12px] leading-[120%] text-[#434956] mb-2">Name</p>
                            <p className="font-inter not-italic font-medium text-[14px] leading-[120%] text-[#434956]">{patientName}</p>
                        </div>
                        {(!countryName || countryName === "India") ? (
                            <div>
                                <p className="font-inter not-italic font-medium text-[12px] leading-[120%] text-[#434956] mb-2">Address</p>
                                <p className="font-inter not-italic font-medium text-[14px] leading-[120%] text-[#434956]">
                                    {address || "N/A"}
                                </p>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <p className="font-inter not-italic font-medium text-[12px] leading-[120%] text-[#434956] mb-2">Address Line 1</p>
                                    <p className="font-inter not-italic font-medium text-[14px] leading-[120%] text-[#434956]">
                                        {addressLine1?.trim() || "N/A"}
                                    </p>
                                </div>
                                <div>
                                    <p className="font-inter not-italic font-medium text-[12px] leading-[120%] text-[#434956] mb-2">Address Line 2</p>
                                    <p className="font-inter not-italic font-medium text-[14px] leading-[120%] text-[#434956]">
                                        {addressLine2?.trim() || "N/A"}
                                    </p>
                                </div>
                            </>
                        )}

                        <div>
                            <p className="font-inter not-italic font-medium text-[12px] leading-[120%] text-[#434956] mb-2">City</p>
                            <p className="font-inter not-italic font-medium text-[14px] leading-[120%] text-[#434956]">
                                {cityName}
                            </p>
                        </div>

                        <div>
                            <p className="font-inter not-italic font-medium text-[12px] leading-[120%] text-[#434956] mb-2">State</p>
                            <p className="font-inter not-italic font-medium text-[14px] leading-[120%] text-[#434956]">
                                {stateName}
                            </p>
                        </div>

                        <div>
                            <p className="font-inter not-italic font-medium text-[12px] leading-[120%] text-[#434956] mb-2">Country</p>
                            <p className="font-inter not-italic font-medium text-[14px] leading-[120%] text-[#434956]">
                                {countryName || "N/A"}
                            </p>
                        </div>

                        <div>
                            <p className="font-inter not-italic font-medium text-[12px] leading-[120%] text-[#434956] mb-2">
                                {(!countryName || countryName === "India") ? "Pin Code" : "ZIP/Postal Code"}
                            </p>
                            <p className="font-inter not-italic font-medium text-[14px] leading-[120%] text-[#434956]">
                                {pinCode?.trim() || "N/A"}
                            </p>
                        </div>
                    </div>

                </div>

                {/* GST Billing Section - Only show when gstBilling is true */}
                {gstBilling && (
                    <div className="mb-6">
                        <h3 className="font-inter not-italic font-semibold text-[24px] leading-[130%] text-start text-[#434956] mb-4">
                            GST Billing
                        </h3>

                        <div className="grid grid-cols-2 gap-6 text-sm mb-6">
                            <div>
                                <p className="font-inter not-italic font-medium text-[12px] leading-[120%] text-[#434956] mb-2">GST Number</p>
                                <p className="font-inter not-italic font-medium text-[14px] leading-[120%] text-[#434956]">
                                    {gstNumber || 'N/A'}
                                </p>
                            </div>
                            <div>
                                <p className="font-inter not-italic font-medium text-[12px] leading-[120%] text-[#434956] mb-2">Company Name</p>
                                <p className="font-inter not-italic font-medium text-[14px] leading-[120%] text-[#434956]">
                                    {companyName || 'N/A'}
                                </p>
                            </div>

                            <div>
                                <p className="font-inter not-italic font-medium text-[12px] leading-[120%] text-[#434956] mb-2">Billing Address</p>
                                <p className="font-inter not-italic font-medium text-[14px] leading-[120%] text-[#434956]">
                                    {billingAddress || 'N/A'}
                                </p>
                            </div>
                            <div>
                                <p className="font-inter not-italic font-medium text-[12px] leading-[120%] text-[#434956] mb-2">State</p>
                                <p className="font-inter not-italic font-medium text-[14px] leading-[120%] text-[#434956]">
                                    {billingStateName || 'N/A'}
                                </p>
                            </div>

                            <div>
                                <p className="font-inter not-italic font-medium text-[12px] leading-[120%] text-[#434956] mb-2">City</p>
                                <p className="font-inter not-italic font-medium text-[14px] leading-[120%] text-[#434956]">
                                    {billingCityName || 'N/A'}
                                </p>
                            </div>
                            <div>
                                <p className="font-inter not-italic font-medium text-[12px] leading-[120%] text-[#434956] mb-2">Pin Code</p>
                                <p className="font-inter not-italic font-medium text-[14px] leading-[120%] text-[#434956]">
                                    {billingPincode || 'N/A'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="overflow-hidden mb-6">
                    <div className="flex justify-between bg-[#F7F8FA] py-4 px-5 text-sm font-medium text-[#262D3B]">
                        <span className="font-inter text-[12px] font-semibold text-[#434956]">Item Name</span>
                        <span className="font-inter text-[12px] font-semibold text-[#434956] text-right">Amount</span>
                    </div>

                    <div className="flex justify-between border-b border-[#EBECED] py-4 px-5 text-sm">
                        <span className="font-inter text-[14px] font-medium text-[#434956]">Consultation Fee</span>
                        <span className="font-inter text-[14px] font-normal text-[#434956] text-right">{formatCurrency(consultationCharges)}</span>
                    </div>

                    <div className="flex justify-end border-b border-[#EBECED] py-4 px-5 text-sm">
                        <span className="font-inter text-[14px] font-normal text-[#434956] mr-2 w-[120px]">Subtotal</span>
                        <span className="font-inter text-[14px] font-normal text-[#434956] w-[120px] text-right">{formatCurrency(subtotal)}</span>
                    </div>

                    <div className="flex justify-end border-b border-[#EBECED] py-4 px-5 text-sm">
                        <span className="font-inter text-[14px] font-normal text-[#434956] mr-2 w-[120px]">Tax</span>
                        <span className="font-inter text-[14px] font-normal text-[#434956] w-[120px] text-right">{formatCurrency(tax)}</span>
                    </div>

                    <div className="flex justify-end border-b border-[#EBECED] py-4 px-5 text-sm">
                        <span className="font-inter text-[14px] font-semibold text-[#434956] mr-2 w-[120px]">Total Amount</span>
                        <span className="font-inter text-[14px] font-semibold text-[#434956] w-[120px] text-right">{formatCurrency(totalAmount)}</span>
                    </div>
                </div>

                <div className="no-print flex justify-end items-center gap-1">
                    <button 
                        onClick={onPrint}
                        className="cursor-pointer flex flex-row justify-center items-center px-6 py-3 gap-2 h-[41px] border border-[#0B8C00] rounded-[32px] font-inter  text-[14px] leading-[120%] text-center text-[#0B8C00] hover:bg-[#0B8C00]/10 transition-colors"
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
                        className="cursor-pointer flex flex-row justify-center items-center px-6 py-3 gap-2 h-[41px] border border-[#9A7909] rounded-[32px] font-inter  text-[14px] leading-[120%] text-center text-[#9A7909] hover:bg-[#9A7909]/10 transition-colors"
                    >
                        <Image src="/icons/Download.svg" alt="Download invoice" width={20} height={20} /> Download Now
                    </button> */}
                </div>
            </div>
        </Dialog>
    );
}

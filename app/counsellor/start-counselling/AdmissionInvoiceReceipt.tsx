"use client";

export interface AdmissionInvoiceReceiptProps {
    captureId?: string;
    patientName: string;
    address: string;
    countryName?: string;
    pinCode?: string;
    cityName: string;
    stateName: string;
    uhid?: string;
    invoiceNumber?: string;
    invoiceId?: number | string;
    contactNumber?: string;
    admissionType?: string;
    admissionDate?: string;
    consultationCharges: number;
    subtotal: number;
    tax: number;
    totalAmount: number;
    billDate: string;
    transactionId?: string;
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
}

function formatCurrency(amount: number) {
    return `₹${amount.toLocaleString("en-IN")}`;
}

function numberToWords(num: number): string {
    if (num === 0) return "Zero Rupees Only";
    const a = [
        "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
        "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
    ];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    const format = (n: number): string => {
        if (n < 20) return a[n];
        const digit = n % 10;
        return b[Math.floor(n / 10)] + (digit !== 0 ? " " + a[digit] : "");
    };

    let words = "";
    let remaining = num;

    const crore = Math.floor(remaining / 10000000);
    remaining %= 10000000;
    if (crore > 0) words += format(crore) + " Crore ";

    const lakh = Math.floor(remaining / 100000);
    remaining %= 100000;
    if (lakh > 0) words += format(lakh) + " Lakh ";

    const thousand = Math.floor(remaining / 1000);
    remaining %= 1000;
    if (thousand > 0) words += format(thousand) + " Thousand ";

    const hundred = Math.floor(remaining / 100);
    remaining %= 100;
    if (hundred > 0) words += format(hundred) + " Hundred ";

    if (remaining > 0) {
        if (words !== "") words += "and ";
        words += format(remaining) + " ";
    }

    return words.trim() + " Rupees Only";
}

export function AdmissionInvoiceReceipt({
    captureId = "counsellor-admission-invoice",
    patientName,
    pinCode,
    address,
    countryName,
    cityName,
    stateName,
    uhid,
    invoiceNumber,
    invoiceId,
    contactNumber,
    admissionType,
    admissionDate,
    consultationCharges,
    subtotal,
    tax,
    totalAmount,
    billDate,
    amountReceived,
    dueAmount,
    paymentStatus,
    paymentRecords,
    lineItemLabel = "Per Day Cost",
}: AdmissionInvoiceReceiptProps) {
    const invoiceDisplay =
        invoiceNumber != null && String(invoiceNumber).trim() !== ""
            ? String(invoiceNumber).trim()
            : "-";

    const invoiceIdDisplay =
        invoiceId != null && String(invoiceId).trim() !== ""
            ? String(invoiceId).trim()
            : null;
// console.log("djhsdj",address)
    return (
        <div
            id={captureId}
            className="box-border flex w-full min-w-0 flex-col overflow-visible rounded-[1px] border border-solid border-[#C0C3C8] bg-white"
        >
            <div className="flex items-center py-[11px] pl-[26px] pr-[24px]">
                <div className="relative flex shrink-0 overflow-visible pr-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/images/logo.png"
                        alt="Jeena Sikho Lifecare Limited Logo"
                        width={120}
                        height={80}
                        decoding="sync"
                        loading="eager"
                        className="block h-[80px] w-auto max-w-[180px] object-contain object-left"
                        draggable={false}
                    />
                </div>
                <div className="flex flex-1 flex-col items-center">
                    <h1 className="mb-1 text-center font-inter text-[20px] font-semibold not-italic leading-[130%] text-[#434956]">
                        Jeena Sikho Lifecare Limited
                    </h1>
                    <p className="text-center font-inter text-[12px] font-normal not-italic leading-[140%] text-[#434956]">
                        {address}
                        <br />
                         {cityName} {stateName}, {stateName} {pinCode},
                        <br />
                        {stateName}({pinCode})
                    </p>
                    <h2 className="mt-3 text-center font-inter text-[20px] font-semibold not-italic leading-[130%] text-[#434956]">
                        Payment Receipt
                    </h2>
                </div>
            </div>

            <div className="flex w-full flex-col">
                <div className="flex min-h-[55px] w-full flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-[#C0C3C8] px-[24px] py-[11px]">
                    <div className="flex min-w-0 items-center gap-[8px]">
                        <span className="font-inter text-[14px] font-extrabold not-italic leading-[120%] text-[#434956]">
                            Bill Date:
                        </span>
                        <span className="font-inter text-[14px] font-medium not-italic leading-[120%] text-[#434956]">
                            {billDate}
                        </span>
                    </div>
                    <div className="flex min-w-0 max-w-full shrink items-center gap-[8px] text-right sm:text-left">
                        <span className="font-inter text-[14px] font-extrabold not-italic leading-[120%] text-[#434956]">
                            Invoice Number :
                        </span>
                        <span className="break-all font-inter text-[14px] font-medium not-italic leading-[120%] text-[#434956]">
                            {invoiceDisplay}
                        </span>
                    </div>
                </div>
                <div className="flex h-[55px] w-full items-center gap-[8px] border-t border-[#C0C3C8] px-[24px] py-[11px]">
                    <span className="font-inter text-[14px] font-extrabold not-italic leading-[120%] text-[#434956]">
                        Patient UHID:
                    </span>
                    <span className="font-inter text-[14px] font-medium not-italic leading-[120%] text-[#434956]">
                        {uhid || "N/A"}
                    </span>
                </div>
                {invoiceIdDisplay ? (
                    <div className="flex h-[55px] w-full items-center gap-[8px] border-t border-[#C0C3C8] px-[24px] py-[11px]">
                        <span className="font-inter text-[14px] font-extrabold not-italic leading-[120%] text-[#434956]">
                            Invoice ID:
                        </span>
                        <span className="font-inter text-[14px] font-medium not-italic leading-[120%] text-[#434956]">
                            {invoiceIdDisplay}
                        </span>
                    </div>
                ) : null}
            </div>

            <div className="flex w-full flex-col border-t border-[#C0C3C8]">
                <h3 className="px-[24px] py-[11px] pb-0 font-inter text-[19px] font-extrabold not-italic leading-[130%] text-[#434956]">
                    Customer Details
                </h3>
                <div className="flex flex-col gap-[8px] px-[24px] py-[11px]">
                    <p className="font-inter text-[14px] not-italic leading-[120%] text-[#434956]">
                        <span className="font-extrabold">Name:</span>{" "}
                        <span className="font-medium">{patientName}</span>
                    </p>
                    {contactNumber ? (
                        <p className="font-inter text-[14px] not-italic leading-[120%] text-[#434956]">
                            <span className="font-extrabold">Contact Number:</span>{" "}
                            <span className="font-medium">{contactNumber}</span>
                        </p>
                    ) : null}
                    <p className="font-inter text-[14px] not-italic leading-[120%] text-[#434956]">
                        <span className="font-extrabold">Address:</span>{" "}
                        <span className="font-medium">{address || "N/A"}</span>
                    </p>
                    <p className="font-inter text-[14px] not-italic leading-[120%] text-[#434956]">
                        <span className="font-extrabold">City:</span>{" "}
                        <span className="font-medium">{cityName}</span>
                    </p>
                    <p className="font-inter text-[14px] not-italic leading-[120%] text-[#434956]">
                        <span className="font-extrabold">State:</span>{" "}
                        <span className="font-medium">{stateName}</span>
                    </p>
                    {countryName ? (
                        <p className="font-inter text-[14px] not-italic leading-[120%] text-[#434956]">
                            <span className="font-extrabold">Country:</span>{" "}
                            <span className="font-medium">{countryName}</span>
                        </p>
                    ) : null}
                </div>
            </div>

            {admissionType ? (
                <div className="flex w-full flex-col border-t border-[#C0C3C8]">
                    <h3 className="px-[24px] py-[11px] pb-0 font-inter text-[19px] font-extrabold not-italic leading-[130%] text-[#434956]">
                        Admission Details
                    </h3>
                    <div className="flex flex-col gap-[8px] px-[24px] py-[11px]">
                        <p className="font-inter text-[14px] not-italic leading-[120%] text-[#434956]">
                            <span className="font-extrabold">Admission Type:</span>{" "}
                            <span className="font-medium">{admissionType}</span>
                        </p>
                        {admissionDate ? (
                            <p className="font-inter text-[14px] not-italic leading-[120%] text-[#434956]">
                                <span className="font-extrabold">Admission Date:</span>{" "}
                                <span className="font-medium">{admissionDate}</span>
                            </p>
                        ) : null}
                    </div>
                </div>
            ) : null}

            <table className="w-full border-collapse">
                <thead>
                    <tr>
                        <th className="border border-l-0 border-[#C0C3C8] px-[24px] py-[14px] text-left font-inter text-[14px] font-extrabold not-italic leading-[120%] text-[#434956]">
                            Item Name
                        </th>
                        <th className="w-[160px] border border-r-0 border-[#C0C3C8] px-[24px] py-[14px] text-right font-inter text-[14px] font-extrabold not-italic leading-[120%] text-[#434956]">
                            Amount
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td className="border border-l-0 border-[#C0C3C8] px-[24px] py-[12px] font-inter text-[14px] font-normal not-italic leading-[120%] text-[#434956]">
                            {lineItemLabel}
                        </td>
                        <td className="border border-r-0 border-[#C0C3C8] px-[24px] py-[12px] text-right font-inter text-[14px] font-normal not-italic leading-[120%] text-[#434956]">
                            {formatCurrency(consultationCharges)}
                        </td>
                    </tr>
                    <tr>
                        <td className="border border-l-0 border-[#C0C3C8] px-[24px] py-[12px] text-right font-inter text-[14px] font-extrabold not-italic leading-[120%] text-[#434956]">
                            Subtotal
                        </td>
                        <td className="border border-r-0 border-[#C0C3C8] px-[24px] py-[12px] text-right font-inter text-[14px] font-normal not-italic leading-[120%] text-[#434956]">
                            {formatCurrency(subtotal)}
                        </td>
                    </tr>
                    <tr>
                        <td className="border border-l-0 border-[#C0C3C8] px-[24px] py-[12px] text-right font-inter text-[14px] font-extrabold not-italic leading-[120%] text-[#434956]">
                            Tax
                        </td>
                        <td className="border border-r-0 border-[#C0C3C8] px-[24px] py-[12px] text-right font-inter text-[14px] font-normal not-italic leading-[120%] text-[#434956]">
                            {formatCurrency(tax)}
                        </td>
                    </tr>
                    <tr>
                        <td className="border border-l-0 border-[#C0C3C8] px-[24px] py-[10px] text-right font-inter text-[#434956]">
                            <div className="mb-1 text-[14px] font-extrabold leading-[120%]">Total Amount:</div>
                            <div className="text-[11px] font-medium text-[#787E8C]">
                                Amount in Words:{" "}
                                <span className="select-all font-extrabold text-[#0B8C00]">
                                    {numberToWords(totalAmount)}
                                </span>
                            </div>
                        </td>
                        <td className="border border-r-0 border-[#C0C3C8] px-[24px] py-[10px] text-right align-middle font-inter text-[14px] font-semibold not-italic leading-[120%] text-[#434956]">
                            {formatCurrency(totalAmount)}
                        </td>
                    </tr>
                </tbody>
            </table>

            {amountReceived != null || dueAmount != null || paymentStatus ? (
                <div className="flex w-full flex-col border-t border-[#C0C3C8]">
                    <h3 className="bg-gray-50/50 px-[24px] py-[12px] pb-3 font-inter text-[15px] font-extrabold not-italic leading-[130%] text-[#434956]">
                        Payment Summary
                    </h3>
                    <div className="flex flex-col gap-[8px] px-[24px] py-[11px]">
                        {amountReceived != null ? (
                            <p className="font-inter text-[14px] not-italic leading-[120%] text-[#434956]">
                                <span className="font-extrabold">Amount Received:</span>{" "}
                                <span className="font-medium">{formatCurrency(Number(amountReceived) || 0)}</span>
                            </p>
                        ) : null}
                        {dueAmount != null ? (
                            <p className="font-inter text-[14px] not-italic leading-[120%] text-[#434956]">
                                <span className="font-extrabold">Due Amount:</span>{" "}
                                <span className="font-medium">{formatCurrency(Number(dueAmount) || 0)}</span>
                            </p>
                        ) : null}
                        {paymentStatus ? (
                            <p className="font-inter text-[14px] not-italic leading-[120%] text-[#434956]">
                                <span className="font-extrabold">Payment Status:</span>{" "}
                                <span className="font-medium capitalize">{paymentStatus}</span>
                            </p>
                        ) : null}
                    </div>
                </div>
            ) : null}

            {paymentRecords && paymentRecords.length > 0 ? (
                <div className="flex w-full flex-col border-t border-[#C0C3C8]">
                    <h3 className="bg-gray-50/50 px-[24px] py-[12px] pb-3 font-inter text-[15px] font-extrabold not-italic leading-[130%] text-[#434956]">
                        Payment Records
                    </h3>
                    <table className="w-full border-collapse border-t border-[#C0C3C8]">
                        <thead>
                            <tr className="bg-white">
                                <th className="border border-l-0 border-[#C0C3C8] px-[24px] py-[12px] text-start font-inter text-[13px] font-extrabold text-[#434956]">
                                    Payment Method
                                </th>
                                <th className="border border-[#C0C3C8] px-[16px] py-[12px] text-center font-inter text-[13px] font-extrabold text-[#434956]">
                                    Status
                                </th>
                                <th className="w-[160px] border border-r-0 border-[#C0C3C8] px-[24px] py-[12px] text-end font-inter text-[13px] font-extrabold text-[#434956]">
                                    Amount
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {paymentRecords.map((record, index) => (
                                <tr key={record.id ?? index} className="hover:bg-gray-50/30">
                                    <td className="border border-l-0 border-[#C0C3C8] px-[24px] py-[10px] text-start font-inter text-[13px] font-semibold capitalize text-[#434956]">
                                        {record.method}
                                    </td>
                                    <td className="border border-[#C0C3C8] px-[16px] py-[10px] text-center font-inter text-[13px] font-medium capitalize text-[#434956]">
                                        {record.status}
                                    </td>
                                    <td className="border border-r-0 border-[#C0C3C8] px-[24px] py-[10px] text-end font-inter text-[13px] font-bold text-[#434956]">
                                        ₹ {Number(record.amount || 0).toLocaleString("en-IN")}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : null}
        </div>
    );
}

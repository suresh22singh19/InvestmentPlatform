"use client";
import React, { useRef, forwardRef, useImperativeHandle, useCallback } from "react";

const TITLE_SRC = "/images/shuddhi_logo.png";

export interface WalletInvoiceData {
    patient_name?: string | null;
    contact_number?: string | null;
    address?: string | null;
    patient_id?: string | null;
    pwid?: string | null;
    sanklp_type?: string | null;
    type?: string | null;
    discountBenefit?: string | null;
    totalamount?: string | null;
    amount?: string | null;
    benefit?: string | null;
    pwrm?: string | null;
    pending?: string | null;
    min?: string | null;
    max?: string | null;
    pwcreatedat?: string | null;
    expire?: string | null;
    staff_name?: string | null;
    staff_code?: string | null;
    firm_name?: string | null;
    branchaddress?: string | null;
    branchtehsil?: string | null;
    branchdistrict?: string | null;
    branchstate?: string | null;
    state_code?: string | null;
    gst_number?: string | null;
    branch_logo?: string | null;
    patient_wallet_installment?: string | null;
    orderAmount?: string | null;
    pwInstallId?: string | null;
}

export type BillOfSupplyProps = {
    data?: WalletInvoiceData;
    showDownloadButton?: boolean;
    showDateColumn?: boolean;
};

export type BillOfSupplyHandle = {
    downloadPdf: () => Promise<void>;
};

type InstallmentItem = {
    deposit?: number | string;
    payment_medthod?: string;
    payment_date?: string;
    receipt_no?: number | string;
    remark?: string | null;
};

function parseInstallments(raw: string | null | undefined): InstallmentItem[] {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
}

function fmtDDMMYYYY(iso: string | null | undefined): string {
    if (!iso) return "";
    try {
        const d = new Date(iso);
        return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
    } catch { return ""; }
}

function fmtLong(iso: string | null | undefined): string {
    if (!iso) return "";
    try {
        return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    } catch { return ""; }
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function below1000(n: number): string {
    if (n < 20) return ONES[n] ?? "";
    if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "");
    return ONES[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + below1000(n % 100) : "");
}

function numberToWords(num: number): string {
    if (!num || num <= 0) return "Zero";
    if (num < 1000) return below1000(num);
    if (num < 100000) return below1000(Math.floor(num / 1000)) + " Thousand" + (num % 1000 ? " " + below1000(num % 1000) : "");
    if (num < 10000000) return below1000(Math.floor(num / 100000)) + " Lakh" + (num % 100000 ? " " + numberToWords(num % 100000) : "");
    return below1000(Math.floor(num / 10000000)) + " Crore" + (num % 10000000 ? " " + numberToWords(num % 10000000) : "");
}

const BORDER_CELL: React.CSSProperties = {
    height: "10px", paddingLeft: "12px", paddingRight: "12px",
    paddingBottom: "3px", paddingTop: "2px", fontWeight: "700",
    border: "1px solid #555", borderLeft: "none", borderRight: "1px solid #555",
    borderBottom: "none", fontSize: "11px",
};
const CELL_INNER: React.CSSProperties = {
    height: "10px", display: "flex", fontSize: "12px", fontWeight: "700",
    alignItems: "center", marginBottom: "12px",
};

const PatientWalletPDF = forwardRef<BillOfSupplyHandle, BillOfSupplyProps>(
    function PatientWalletPDF({ data, showDownloadButton = true, showDateColumn = true }, ref) {
        const printRef = useRef<HTMLDivElement>(null);

        const handleDownloadPDF = useCallback(async () => {
            const html2pdf = (await import("html2pdf.js")).default;
            if (!printRef.current) return;
            const blobUrl = await html2pdf()
                .set({
                    margin: 0,
                    filename: `wallet_invoice_${data?.patient_id || data?.pwid || "receipt"}.pdf`,
                    image: { type: "jpeg", quality: 1 },
                    html2canvas: { scale: 2, useCORS: true, letterRendering: true },
                    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
                })
                .from(printRef.current)
                .outputPdf("bloburl");
            window.open(blobUrl, "_blank");
        }, [data?.patient_id, data?.pwid]);

        useImperativeHandle(ref, () => ({ downloadPdf: handleDownloadPDF }), [handleDownloadPDF]);

        const sanklpType = (data?.sanklp_type ?? "").trim().toLowerCase();
        const isMmb = sanklpType === "mmb";
        const isAdvance = sanklpType === "advance";

        const firmName = data?.firm_name || "JEENA SIKHO LIFECARE LTD";
        const branchAddress = data?.branchaddress || "";
        const branchtehsil = data?.branchtehsil || "";
        const branchdistrict = data?.branchdistrict || "";
        const gstNumber = data?.gst_number || "";
        const branchState = data?.branchstate || "";
        const stateCode = data?.state_code || "";

        const title = isMmb
            ? "Madhumeh Mukt Bharat Program"
            : (showDateColumn ? "Shuddhi Membership Report" : "Shuddhi Membership Receipt");

        const walletNo = data?.pwid || "N/A";
        const installReceiptNo = data?.pwInstallId || data?.pwid || "N/A";
        const headerNo = showDateColumn ? walletNo : installReceiptNo;
        const startDateStr = fmtLong(data?.pwcreatedat);
        const expireDateStr = fmtLong(data?.expire);
        const todayStr = fmtDDMMYYYY(new Date().toISOString());

        const patientName = data?.patient_name || "N/A";
        const patientId = data?.patient_id || "N/A";
        const contactNumber = data?.contact_number || "N/A";
        const address = data?.address || "N/A";

        const installments = parseInstallments(data?.patient_wallet_installment);
        const sumDeposits = installments.reduce((s, it) => s + Number(it.deposit ?? 0), 0);

        const minVal = Number(data?.min ?? 0);
        const maxVal = Number(data?.max ?? 0);
        const amountVal = Number(data?.amount ?? 0);
        const pendingVal = Number(data?.pending ?? 0);
        const benefitVal = Number(data?.benefit ?? 0);
        const pwrmVal = Number(data?.pwrm ?? 0);

        const payableTotal = sumDeposits || amountVal;
        const amountInWords = minVal > 0 && maxVal > 0
            ? numberToWords(sumDeposits)
            : numberToWords(amountVal - pendingVal);
        const benefitPercent = benefitVal + "%";
        const benefitAmount = payableTotal > 0 ? (payableTotal * benefitVal) / 100 : 0;
        const balanceWallet = payableTotal + (payableTotal * benefitVal) / 100;

        const shellStyle: React.CSSProperties = showDownloadButton
            ? { background: "#d0d0cc", minHeight: "100vh", padding: "20px" }
            : { position: "fixed", left: "-10000px", top: 0, width: "794px", padding: 0, margin: 0, background: "#d0d0cc", zIndex: -1, pointerEvents: "none" };

        return (
            <div style={shellStyle}>
                {showDownloadButton && (
                    <div style={{ maxWidth: "720px", margin: "0 auto 12px", textAlign: "right" }}>
                        <button type="button" onClick={handleDownloadPDF}
                            style={{ background: "#024317", color: "#fff", border: "none", borderRadius: "5px", padding: "9px 24px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>
                            ⬇ Download PDF
                        </button>
                    </div>
                )}

                <div ref={printRef} style={{ background: "#fff" }}>
                    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "60px 40px 8px 40px", color: "#000", background: "#fff" }}>
                        <div style={{ border: "1px solid #000", paddingBottom: "10px", textAlign: "center" }}>
                            <div style={{ marginRight: "10px", marginLeft: "10px", marginBottom: "-2px" }}>

                                {/* Header */}
                                <div style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "center", flexDirection: "column", textAlign: "center" }}>
                                    <div style={{ width: "100%", display: "flex", justifyContent: "center", paddingBottom: "6px", paddingTop: "6px" }}>
                                        <img src={TITLE_SRC} alt="Logo" style={{ width: "110px", height: "46px", marginTop: "2px" }} />
                                    </div>
                                    <div style={{ width: "100%", color: "blue" }}>
                                        <h4 style={{ fontSize: "13px", fontWeight: 800, margin: "0", letterSpacing: ".6px" }}>{firmName}</h4>
                                    </div>
                                    <p style={{ margin: "2px 0", fontSize: "9.5px", color: "blue", lineHeight: "1.3" }}>
                                        {branchAddress}<br />
                                        Tehsil-{branchtehsil} Distt-{branchdistrict}
                                    </p>
                                    {(isMmb || (!isAdvance && !isMmb)) && gstNumber && (
                                        <>
                                            <span style={{ fontSize: "9.5px", color: "blue" }}>
                                                GSTIN/UIN : <strong>{gstNumber}</strong>
                                            </span>
                                            <span style={{ fontSize: "9.5px", color: "blue", marginTop: "-1px" }}>
                                                State Name : <strong>{branchState}, Code : {stateCode}</strong>
                                            </span>
                                        </>
                                    )}
                                </div>

                                {/* Title */}
                                <div style={{ textAlign: "center", width: "100%", marginTop: "12px" }}>
                                    <h3 style={{ textAlign: "center", color: "#28a745", letterSpacing: ".6px", fontSize: "14px", fontWeight: "800", margin: "0 0 4px 0" }}>
                                        {title}
                                    </h3>
                                </div>
                            </div>

                            {/* Receipt / Date info */}
                            <div style={{ paddingBottom: "4px", marginTop: "8px", paddingRight: "10px", paddingLeft: "10px" }}>
                                <table width="100%" style={{ border: "none" }}>
                                    <tbody>
                                        <tr>
                                            <td width="75%" style={{ border: "none", padding: "2px 0 6px 0", fontSize: "10px", textAlign: "start", lineHeight: "1.3" }}>
                                                <strong>{showDateColumn ? "Wallet No" : "Receipt No"} : </strong>{headerNo}<br />
                                                {!isAdvance && startDateStr && <><strong>Start Date : </strong>{startDateStr}<br /></>}
                                                {!isAdvance && expireDateStr && <><strong>Expire Date : </strong>{expireDateStr}</>}
                                            </td>
                                            <td width="25%" style={{ border: "none", verticalAlign: "middle", padding: "0", fontSize: "10px", paddingRight: "30px" }}>
                                                <strong>Date : </strong>{todayStr}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Patient Info */}
                            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "start" }}>
                                <tbody>
                                    <tr>
                                        <td style={{ border: "1px solid #000", borderLeft: "none", borderRight: "none", fontSize: "10px", lineHeight: "1.4", padding: "0 12px 8px 10px" }}>
                                            <p style={{ margin: 0 }}>Patient Name</p>
                                            <p style={{ margin: 0 }}><strong>{patientName}</strong></p>
                                            <p style={{ margin: 0 }}>UHID: <strong>{patientId}</strong></p>
                                            <p style={{ margin: 0 }}>Mobile: <strong>{contactNumber}</strong></p>
                                            <p style={{ margin: 0 }}>Address: <strong>{address}</strong></p>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Detail rows */}
                            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "-1px" }}>
                                <tbody>
                                    {!isAdvance && (
                                        <tr style={{ height: "8px" }}>
                                            <td style={{ ...BORDER_CELL, width: "300px", fontSize: "10px" }}><div style={{ ...CELL_INNER, fontSize: "10px", marginBottom: "7px" }}>Staff Name</div></td>
                                            <td style={{ ...BORDER_CELL, borderRight: "none", fontSize: "10px" }}><div style={{ ...CELL_INNER, fontSize: "10px", marginBottom: "7px" }}>{data?.staff_name || ""}</div></td>
                                        </tr>
                                    )}
                                    {!isAdvance && (
                                        <tr style={{ height: "8px" }}>
                                            <td style={{ ...BORDER_CELL, width: "300px", fontSize: "10px" }}><div style={{ ...CELL_INNER, fontSize: "10px", marginBottom: "7px" }}>Employee Code</div></td>
                                            <td style={{ ...BORDER_CELL, borderRight: "none", fontSize: "10px" }}><div style={{ ...CELL_INNER, fontSize: "10px", marginBottom: "7px" }}>{data?.staff_code || ""}</div></td>
                                        </tr>
                                    )}
                                    {!isAdvance && (
                                        <tr>
                                            <td style={{ ...BORDER_CELL, width: "300px", height: "auto", fontSize: "10px" }}>
                                                <div style={{ ...CELL_INNER, height: "auto", fontSize: "10px", paddingTop: "3px", paddingBottom: "3px" }}>Package</div>
                                            </td>
                                            <td style={{ ...BORDER_CELL, borderRight: "none", height: "auto", fontSize: "10px" }}>
                                                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", fontSize: "10px", fontWeight: "700", paddingTop: "3px", paddingBottom: "3px", lineHeight: "1.4" }}>
                                                    <span>{data?.type || ""}</span>
                                                    {data?.discountBenefit && <span>{data.discountBenefit}</span>}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    <tr style={{ height: "8px" }}>
                                        <td style={{ ...BORDER_CELL, width: "300px", fontSize: "10px" }}><div style={{ ...CELL_INNER, fontSize: "10px", marginBottom: "7px" }}>Payable Total ₹</div></td>
                                        <td style={{ ...BORDER_CELL, borderRight: "none", fontSize: "10px" }}><div style={{ ...CELL_INNER, fontSize: "10px", marginBottom: "7px" }}>{payableTotal}</div></td>
                                    </tr>
                                    {!isAdvance && (
                                        <tr style={{ height: "8px" }}>
                                            <td style={{ ...BORDER_CELL, width: "300px", fontSize: "10px" }}><div style={{ ...CELL_INNER, fontSize: "10px", marginBottom: "7px" }}>Benefit ₹ (Additional Amount as per package)</div></td>
                                            <td style={{ ...BORDER_CELL, borderRight: "none", fontSize: "10px" }}>
                                                <div style={{ ...CELL_INNER, fontSize: "10px", marginBottom: "7px" }}>
                                                    {benefitPercent}{!isMmb && benefitAmount > 0 ? ` / ${benefitAmount}` : ""}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    {!isAdvance && (
                                        <tr style={{ height: "8px" }}>
                                            <td style={{ ...BORDER_CELL, width: "300px", fontSize: "10px" }}><div style={{ ...CELL_INNER, fontSize: "10px", marginBottom: "7px" }}>Balance wallet amount including benefit ₹</div></td>
                                            <td style={{ ...BORDER_CELL, borderRight: "none", fontSize: "10px" }}><div style={{ ...CELL_INNER, fontSize: "10px", marginBottom: "7px" }}>{balanceWallet || "0.00"}</div></td>
                                        </tr>
                                    )}
                                    {pendingVal > 0 && (
                                        <tr style={{ height: "8px" }}>
                                            <td style={{ ...BORDER_CELL, width: "300px", fontSize: "10px" }}><div style={{ ...CELL_INNER, fontSize: "10px", marginBottom: "7px" }}>Pending ₹</div></td>
                                            <td style={{ ...BORDER_CELL, borderRight: "none", fontSize: "10px" }}><div style={{ ...CELL_INNER, fontSize: "10px", marginBottom: "7px" }}>{pendingVal}</div></td>
                                        </tr>
                                    )}
                                    {isMmb && (
                                        <tr style={{ height: "8px" }}>
                                            <td style={{ ...BORDER_CELL, width: "300px", fontSize: "10px" }}><div style={{ ...CELL_INNER, fontSize: "10px", marginBottom: "7px" }}>Remaining Amount in Patient Wallet ₹</div></td>
                                            <td style={{ ...BORDER_CELL, borderRight: "none", fontSize: "10px" }}><div style={{ ...CELL_INNER, fontSize: "10px", marginBottom: "7px" }}>{Math.floor(pwrmVal)}</div></td>
                                        </tr>
                                    )}
                                    <tr style={{ height: "8px" }}>
                                        <td colSpan={2} style={{ paddingLeft: "10px", paddingRight: "10px", paddingTop: "2px", paddingBottom: "2px", fontWeight: "700", border: "1px solid #555", borderLeft: "none", borderRight: "none", fontSize: "10px" }}>
                                            <div style={{ display: "flex", fontSize: "10px", fontWeight: "700", alignItems: "center", marginBottom: "7px" }}>
                                                Amount in Words: {amountInWords} Only
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Payment History */}
                            {installments.length > 0 && (
                                <>
                                    <div style={{ textAlign: "center", width: "100%", padding: "4px 0 8px 0" }}>
                                        <h3 style={{ textAlign: "center", fontSize: "12px", margin: 0 }}>{showDateColumn ? "Payment History" : "Mode of Payment"}</h3>
                                    </div>
                                    <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #000" }}>
                                        <thead>
                                            <tr>
                                                {(showDateColumn
                                                    ? ["Date", "Receipt No", "Amount", "Payment Method", "Transaction ID"]
                                                    : ["Deposit", "Payment Method", "Payment Date", "Transaction ID"]
                                                ).map((h, i, arr) => (
                                                    <th key={h} style={{ backgroundColor: "#17a2b8", fontWeight: "400", padding: "0 8px", border: "1px solid #000", borderBottom: "none", borderRight: i < arr.length - 1 ? "none" : "1px solid #000", borderLeft: i === 0 ? "none" : "1px solid #000", fontSize: "9.5px" }}>
                                                        <div style={{ height: "6px", display: "flex", fontSize: "9.5px", fontWeight: "400", alignItems: "center", justifyContent: i === arr.length - 1 ? "center" : "start", marginBottom: "10px" }}>{h}</div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {installments.map((ins, i) => {
                                                const dateStr = fmtDDMMYYYY(ins.payment_date);
                                                const remark = ins.remark || "N/A";
                                                const cells = showDateColumn
                                                    ? [dateStr, String(ins.receipt_no ?? "N/A"), String(ins.deposit ?? ""), ins.payment_medthod || "", remark]
                                                    : [String(ins.deposit ?? ""), ins.payment_medthod || "", dateStr, remark];
                                                return (
                                                    <tr key={i}>
                                                        {cells.map((c, ci) => (
                                                            <td key={ci} style={{ border: "1px solid #000", fontWeight: "400", padding: "0 8px", fontSize: "9.5px", borderRight: ci < cells.length - 1 ? "none" : "1px solid #000", borderLeft: ci === 0 ? "none" : "1px solid #000" }}>
                                                                <div style={{ height: "6px", display: "flex", fontSize: "9.5px", fontWeight: "400", alignItems: "center", justifyContent: ci === cells.length - 1 ? "center" : "start", marginBottom: "10px" }}>{c}</div>
                                                            </td>
                                                        ))}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </>
                            )}

                            {/* Note - non-advance only */}
                            {!isAdvance && (
                                <div style={{ textAlign: "start", width: "100%", marginTop: "2px" }}>
                                    <h3 style={{ textAlign: "center", letterSpacing: ".3px", fontSize: "9px", lineHeight: "1.2", margin: "4px 0" }}>
                                        Note: In case of a refund, all availed benefits will be forfeited, and the amount corresponding to those benefits will be deducted from the original amount paid at the time of first registration.
                                    </h3>
                                </div>
                            )}

                            {/* Terms & Conditions - Shuddhi Membership only (non-advance, non-mmb) */}
                            {!isAdvance && !isMmb && (
                                <div style={{ margin: "6px 0 4px 0", padding: "6px 10px", textAlign: "left" }}>
                                    <p style={{ margin: "0 0 4px 0", fontSize: "9.5px", fontWeight: "700", color: "#000" }}>
                                        Shuddhi Membership Terms &amp; Conditions
                                    </p>
                                    <ol style={{ margin: 0, paddingLeft: "14px", fontSize: "8.5px", lineHeight: "1.4", color: "#000" }}>
                                        <li>The membership is valid for a fixed period from the date of issue, as per the package selected.</li>
                                        <li>The membership fee will be as applicable to the chosen package.</li>
                                        <li>Each membership includes an additional benefit credited to the patient&apos;s virtual wallet, the value of which will be calculated as a percentage of the membership fee.</li>
                                        <li>The total amount credited to the virtual wallet can only be used for the payment of medicines received from Jeena Sikho-Lifecare Ltd.</li>
                                        <li>The membership fee is strictly non-refundable.</li>
                                        <li>The balance in the virtual wallet is exclusively for the purchase of medicines and cannot be used for availing medical services and treatments.</li>
                                        <li>The company reserves the right to forfeit all benefits if the membership is not utilized within the stipulated validity period.</li>
                                        <li>The patient is responsible for safekeeping this slip as a record of their membership.</li>
                                        <li>Jeena Sikho-Lifecare Ltd. reserves the right to modify these terms and conditions at any time. Any updates will be communicated to the patient or published on the company&apos;s official website.</li>
                                    </ol>
                                </div>
                            )}

                            <div style={{ textAlign: "center", width: "100%", marginTop: "6px", marginBottom: "6px" }}>
                                <h3 style={{ textAlign: "center", letterSpacing: ".3px", fontSize: "9px", lineHeight: "1.2", margin: 0 }}>
                                    This is the computer generated slip no need stamp signature required.
                                </h3>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
);

PatientWalletPDF.displayName = "PatientWalletPDF";
export default PatientWalletPDF;

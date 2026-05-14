"use client";
import React, { useRef, forwardRef, useImperativeHandle, useCallback } from "react";
import type { WalletInvoiceData, BillOfSupplyProps, BillOfSupplyHandle } from "./invoiceShuddhiSankalpSinglePaymentReceipt";

export type { WalletInvoiceData, BillOfSupplyProps, BillOfSupplyHandle };

const TITLE_SRC = "/images/shuddhi_logo.png";

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
    height: "10px", paddingLeft: "10px", paddingRight: "10px",
    paddingBottom: "3px", paddingTop: "2px", fontWeight: "700",
    border: "1px solid #555", borderLeft: "none", borderRight: "1px solid #555",
    borderBottom: "none", fontSize: "11px",
};
const CELL_INNER: React.CSSProperties = {
    height: "10px", display: "flex", fontSize: "12px", fontWeight: "700",
    alignItems: "center", marginBottom: "10px",
};

const PatientReportPDF = forwardRef<BillOfSupplyHandle, BillOfSupplyProps>(
    function PatientReportPDF({ data, showDownloadButton = true, showDateColumn = true }, ref) {
        const printRef = useRef<HTMLDivElement>(null);

        const handleDownloadPDF = useCallback(async () => {
            const html2pdf = (await import("html2pdf.js")).default;
            if (!printRef.current) return;
            await html2pdf()
                .set({
                    margin: 0,
                    filename: `wallet_advance_${data?.patient_id || data?.pwid || "receipt"}.pdf`,
                    image: { type: "jpeg", quality: 1 },
                    html2canvas: { scale: 2, useCORS: true, letterRendering: true },
                    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
                })
                .from(printRef.current)
                .save();
        }, [data?.patient_id, data?.pwid]);

        useImperativeHandle(ref, () => ({ downloadPdf: handleDownloadPDF }), [handleDownloadPDF]);

        const firmName = data?.firm_name || "JEENA SIKHO LIFECARE LTD";
        const branchAddress = data?.branchaddress || "";
        const branchtehsil = data?.branchtehsil || "";
        const branchdistrict = data?.branchdistrict || "";

        const walletNo = data?.pwid || "N/A";
        const installReceiptNo = data?.pwInstallId || null;
        const todayStr = fmtDDMMYYYY(new Date().toISOString());

        const patientName = data?.patient_name || "N/A";
        const patientId = data?.patient_id || "N/A";
        const contactNumber = data?.contact_number || "N/A";
        const address = data?.address || "N/A";

        const installments = parseInstallments(data?.patient_wallet_installment);
        const sumDeposits = installments.reduce((s, it) => s + Number(it.deposit ?? 0), 0);
        const amountInWords = numberToWords(sumDeposits);

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
                    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "60px 57px 14px 57px", color: "#000", background: "#fff" }}>
                        <div style={{ border: "1px solid #000", paddingBottom: "20px", textAlign: "center" }}>
                            <div style={{ marginRight: "12px", marginLeft: "12px", marginBottom: "-4px" }}>

                                {/* Header */}
                                <div style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "center", flexDirection: "column", textAlign: "center" }}>
                                    <div style={{ width: "100%", display: "flex", justifyContent: "center", paddingBottom: "10px", paddingTop: "8px" }}>
                                        <img src={TITLE_SRC} alt="Logo" style={{ width: "140px", height: "60px", marginTop: "2px" }} />
                                    </div>
                                    <div style={{ width: "100%", color: "blue" }}>
                                        <h4 style={{ fontSize: "15px", fontWeight: 800, margin: "0", letterSpacing: ".8px" }}>{firmName}</h4>
                                    </div>
                                    <p style={{ margin: "4px 0", fontSize: "11px", color: "blue", lineHeight: "1.4" }}>
                                        {branchAddress}<br />
                                        Tehsil-{branchtehsil} Distt-{branchdistrict}
                                    </p>
                                </div>

                                {/* Title */}
                                <div style={{ textAlign: "center", width: "100%", marginTop: "30px" }}>
                                    <h3 style={{ textAlign: "center", color: "#28a745", letterSpacing: ".8px", fontSize: "16px", fontWeight: "800" }}>
                                        Jeena Sikho Payment Receipt
                                    </h3>
                                </div>
                            </div>

                            {/* Receipt / Date */}
                            <div style={{ paddingBottom: "8px", marginTop: "16px", paddingRight: "10px", paddingLeft: "10px" }}>
                                <table width="100%" style={{ border: "none" }}>
                                    <tbody>
                                        <tr>
                                            <td width="75%" style={{ border: "none", padding: "3px 0 10px 0", fontSize: "12px", textAlign: "start", lineHeight: "1.3" }}>
                                                <strong>{showDateColumn ? "Wallet No" : "Receipt No"} : </strong><span>{showDateColumn ? walletNo : (installReceiptNo ?? walletNo)}</span>
                                            </td>
                                            <td width="25%" style={{ border: "none", verticalAlign: "middle", padding: "0", fontSize: "12px", paddingRight: "40px" }}>
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
                                        <td style={{ border: "1px solid #000", borderLeft: "none", borderRight: "none", fontSize: "12px", lineHeight: "1.5", padding: "0 30px 15px 10px" }}>
                                            <p style={{ margin: 0 }}>Patient Name</p>
                                            <p style={{ margin: 0 }}><strong>{patientName}</strong></p>
                                            <p style={{ margin: 0 }}>UHID: <strong>{patientId}</strong></p>
                                            <p style={{ margin: 0 }}>Mobile: <strong>{contactNumber}</strong></p>
                                            <p style={{ margin: 0 }}>Address: <strong>{address}</strong></p>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Detail rows: only Payable Total + Amount in words */}
                            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "-2px" }}>
                                <tbody>
                                    <tr style={{ height: "10px" }}>
                                        <td style={{ ...BORDER_CELL, width: "300px" }}><div style={CELL_INNER}>Payable Total ₹</div></td>
                                        <td style={{ ...BORDER_CELL, borderRight: "none", textAlign: "center", width: "50px" }}><div style={{ ...CELL_INNER, justifyContent: "center" }}>{sumDeposits}</div></td>
                                    </tr>
                                    <tr style={{ height: "10px" }}>
                                        <td colSpan={2} style={{ paddingLeft: "10px", paddingRight: "10px", paddingTop: "0", paddingBottom: "3px", fontWeight: "700", border: "1px solid #555", borderLeft: "none", borderRight: "none", fontSize: "10px" }}>
                                            <div style={{ display: "flex", fontSize: "11px", fontWeight: "700", alignItems: "center", marginBottom: "10px" }}>
                                                Amount in Words: {amountInWords} Only
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Payment History */}
                            {installments.length > 0 && (
                                <>
                                    <div style={{ textAlign: "center", width: "100%", padding: "10px 0 30px 0" }}>
                                        <h3 style={{ textAlign: "center", fontSize: "14px" }}>Payment History</h3>
                                    </div>
                                    <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #000" }}>
                                        <thead>
                                            <tr>
                                                {(showDateColumn
                                                    ? ["Date", "Receipt No", "Amount", "Payment Method", "Transaction ID"]
                                                    : ["Receipt No", "Amount", "Payment Method", "Transaction ID"]
                                                ).map((h, i, arr) => (
                                                    <th key={h} style={{ backgroundColor: "#17a2b8", fontWeight: "400", padding: "0 12px", border: "1px solid #000", borderBottom: "none", borderRight: i < arr.length - 1 ? "none" : "1px solid #000", borderLeft: i === 0 ? "none" : "1px solid #000", fontSize: "11px" }}>
                                                        <div style={{ height: "8px", display: "flex", fontSize: "11px", fontWeight: "400", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>{h}</div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {installments.map((ins, i) => {
                                                const dateStr = fmtDDMMYYYY(ins.payment_date);
                                                const remark = ins.remark || "N/A";
                                                const cells = showDateColumn
                                                    ? [dateStr, String(ins.receipt_no ?? installReceiptNo ?? "N/A"), String(ins.deposit ?? ""), ins.payment_medthod || "", remark]
                                                    : [String(ins.receipt_no ?? installReceiptNo ?? "N/A"), String(ins.deposit ?? ""), ins.payment_medthod || "", remark];
                                                return (
                                                    <tr key={i}>
                                                        {cells.map((c, ci) => (
                                                            <td key={ci} style={{ border: "1px solid #000", fontWeight: "400", padding: "0 12px", fontSize: "11px", borderRight: ci < cells.length - 1 ? "none" : "1px solid #000", borderLeft: ci === 0 ? "none" : "1px solid #000" }}>
                                                                <div style={{ height: "8px", display: "flex", fontSize: "11px", fontWeight: "400", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>{c}</div>
                                                            </td>
                                                        ))}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </>
                            )}

                            <div style={{ textAlign: "center", width: "100%", marginTop: "12px", marginBottom: "10px" }}>
                                <h3 style={{ textAlign: "center", letterSpacing: ".4px", fontSize: "10px", lineHeight: "1.2" }}>
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

PatientReportPDF.displayName = "PatientReportPDF";
export default PatientReportPDF;

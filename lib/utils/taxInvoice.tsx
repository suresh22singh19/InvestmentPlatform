"use client";
import React, { useRef, forwardRef, useImperativeHandle, useCallback } from "react";

const LOGO_SRC = "/images/jeenasikho_lifecare.jpeg";
const TITLE_SRC = "/images/shuddhi_logo.png";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface BranchInfo {
  address: string;
  district: string;
  state: string;
  pin_code: string;
  phone_number: string;
  type: "clinic" | "hospital";
}
export interface PatientInfo {
  patient: string;
  parent_name: string;
  bp: string;
  sl: string;
  weight: string;
  height: string;
  uhid: string;
  opdId: string;
  age: string;
  gender: string;
}
export interface DoctorInfo {
  name: string;
  education: string[];
  reg_no: string;
}
export interface AppointmentInfo { created_at: string; }

export type TaxInvoiceProps = {
  branch?: BranchInfo;
  patient?: PatientInfo;
  doctor?: DoctorInfo;
  appointment?: AppointmentInfo;
  diagnosis?: string;
  /** When false, hides the on-page download control (parent triggers via ref). Default true. */
  showDownloadButton?: boolean;
};

export type TaxInvoiceHandle = {
  downloadPdf: () => Promise<void>;
};

// ── Default branch (static header address on PDF) ─────────────────────────────
/** Shown in the form header until wired to live branch data. */
export const DEFAULT_STATIC_BRANCH_INFO: BranchInfo = {
  address: "RZ-6A, Syndicate Enclave Dabri Mod, Dwarka",
  district: "Delhi",
  state: "South West Delhi",
  pin_code: "110045",
  phone_number: "8860421234",
  type: "clinic",
};

// ── Demo data ─────────────────────────────────────────────────────────────────
const DEMO_BRANCH = DEFAULT_STATIC_BRANCH_INFO;
const DEMO_PATIENT: PatientInfo = {
  patient: "MANJEET SINGH",
  parent_name: "SO HARPAL SINGH",
  bp: "173/67",
  sl: "NO",
  weight: "94",
  height: "5.11",
  uhid: "DWDL43222025",
  opdId: "1255011",
  age: "50",
  gender: "Male",
};
const DEMO_DOCTOR: DoctorInfo = {
  name: "Dr. Anuradha Kumari",
  education: ["BAMS"],
  reg_no: "",
};
const DEMO_APPOINTMENT: AppointmentInfo = { created_at: "2025-12-03T17:09:03" };
const DEMO_DIAGNOSIS = "LIVER PROBLEM";

/** Show menstrual history line only for female patients (hide for male / unknown). */
function isFemalePatientForPatientForm(gender: string | undefined): boolean {
  const g = (gender ?? "").trim().toLowerCase();
  if (!g) return false;
  if (g === "male" || g === "m" || g.startsWith("male")) return false;
  return g === "female" || g === "f" || g.startsWith("female");
}

/** Gender label: first letter of each word capital (male → Male, FEMALE → Female). */
function formatGenderForPatientFormDisplay(gender: string | undefined): string {
  const raw = (gender ?? "").trim();
  if (!raw) return "—";
  return raw
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

// ── Component ─────────────────────────────────────────────────────────────────
const TaxInvoice = forwardRef<TaxInvoiceHandle, TaxInvoiceProps>(function TaxInvoice(
  {
    branch = DEMO_BRANCH,
    patient = DEMO_PATIENT,
    doctor = DEMO_DOCTOR,
    appointment = DEMO_APPOINTMENT,
    diagnosis = DEMO_DIAGNOSIS,
    showDownloadButton = true,
  },
  ref
) {
  const printRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = useCallback(async () => {
    const html2pdf = (await import("html2pdf.js")).default;
    if (!printRef.current) return;
    await html2pdf()
      .set({
        margin: 0,
        filename: `prescription_${patient.uhid}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(printRef.current)
      .save();
  }, [patient.uhid]);

  useImperativeHandle(ref, () => ({ downloadPdf: handleDownloadPDF }), [handleDownloadPDF]);

  const fmtDate = new Date(appointment.created_at)
    .toLocaleString("en-IN", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    })
    .replace(",", "")
    .replace(/\//g, "-");
  const hasJsHealthPoints = false;
  const jsHealthPoints = { total: 0, deduction: 0, remaining: 0 };

  /** Centers label + value inside bordered header cells (table-cell vertical-align alone is unreliable with stacked blocks). */
  const invoiceHeaderCellInner: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    boxSizing: "border-box",
    width: "100%",
    minHeight: "92px",
    height: "100%",
    padding: "10px 8px",
  };

  // ── Shared font / colour tokens matching the PDF exactly ──────────────────
  const BASE: React.CSSProperties = {
    fontFamily: "'Calibri', 'Gill Sans', 'Trebuchet MS', Arial, sans-serif",
    // fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: "11px",
    // color: "#1a1a1a",
    color: "#000000",
    // lineHeight: "1.55",
  };

  const shellStyle: React.CSSProperties = showDownloadButton
    ? { background: "#d0d0cc", minHeight: "100vh", padding: "20px" }
    // ? { background: "#d0d0cc", minHeight: "100vh", padding: "20px" }
    : {
      position: "fixed",
      left: "-10000px",
      top: 0,
      width: "694px",
      padding: 0,
      margin: 0,
      background: "#d0d0cc",
      zIndex: -1,
      pointerEvents: "none",
    };

  return (
    <div style={shellStyle}>
      {showDownloadButton ? (
        <div style={{ maxWidth: "694px", margin: "0 auto 12px", textAlign: "right" }}>
          <button
            type="button"
            onClick={handleDownloadPDF}
            style={{
              background: "#024317", color: "#fff", border: "none",
              borderRadius: "5px", padding: "9px 24px", fontSize: "14px",
              fontWeight: "600", cursor: "pointer", letterSpacing: "0.4px",
              boxShadow: "0 2px 8px rgba(0,0,0,.25)",
            }}
          >
            ⬇ Download PDF
          </button>
        </div>
      ) : null}

      {/* ═══════════ PRINTABLE AREA ═══════════ */}
      <div ref={printRef} style={{ background: "#fff" }}>
        <style>{`
          strong {
            font-weight: 700 !important;
          }
        `}</style>
        <div style={{ ...BASE, position: "relative", maxWidth: "720px", margin: "50px auto", padding: "0 20px 40px" }}>

          <div style={{ margin: "0 auto 20px", textAlign: "center", fontSize: "32px", marginBottom: "26px" }}><strong>Tax Invoice</strong></div>

          {/* One table (no nested grid) so seller and invoice/date cells share borders with no gutter */}
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td
                  rowSpan={2}
                  style={{
                    border: "1px solid #000",
                    padding: "10px 0px 0px 10px",
                    fontSize: "11px",
                    lineHeight: "1.1",
                    paddingBottom: "14px",
                    paddingTop: "4px",
                    width: "59%",
                    verticalAlign: "middle",
                    borderBottom: "none",
                    borderRight: "none",
                  }}
                >
                  <p style={{ margin: 0, lineHeight: "1.2" }}><strong>Jeena Sikho Lifecare Limited</strong></p>
                  <p style={{ margin: 0, lineHeight: "1.2" }}>{branch.address}</p>
                  <p style={{ margin: 0, lineHeight: "1.2" }}>Tehsil-Rampur Sainia BO</p>
                  <p style={{ margin: 0, lineHeight: "1.2" }}>Disitt-{branch.district.toUpperCase()}</p>
                  <p style={{ margin: 0, lineHeight: "1.2" }}>GSTIN/UIN: 03AADCJ9908J1ZE</p>
                  <p style={{ margin: 0, lineHeight: "1.2" }}><strong>State Name: </strong>{branch.state.toUpperCase()}, code: 03</p>
                </td>
                <td
                  style={{
                    border: "1px solid #000",
                    padding: "10px",
                    fontSize: "11px",
                    textAlign: "center",
                    width: "20%",
                    verticalAlign: "middle",
                    borderBottom: "none",
                    borderRight: "none",
                  }}
                >
                  <div style={{ margin: 0, marginBottom: "-3px", marginTop: "-10px",  paddingTop: "-10px"}}>Invoice No.</div>
                  <div style={{ margin: 0, fontSize: "12px", fontWeight: "900" }}><strong>JS/2026/05/2005078</strong></div>
                </td>
                <td
                  style={{
                    border: "1px solid #000",
                    padding: "10px",
                    fontSize: "11px",
                    textAlign: "center",
                    // width: "25%",
                    width: "26%",
                    verticalAlign: "middle",
                    borderBottom: "none",
                  }}
                >
                  <div style={{ margin: 0, marginBottom: "-3px",marginTop: "-10px",  paddingTop: "-10px"}}>Date</div>
                  <div style={{ margin: 0,    fontSize: "12px", fontWeight: "900" }}><strong>{"02-05-2026"}</strong></div>
                </td>
              </tr>
              <tr>
                <td
                  style={{
                    border: "1px solid #000",
                    padding: "10px",
                    fontSize: "11px",
                    textAlign: "center",
                    verticalAlign: "middle",
                    borderBottom: "none",
                    borderRight: "none",
                  }}
                >
                  <div style={{ margin: 0, marginBottom: "-3px",marginTop: "-10px",  paddingTop: "-10px"  }}>Order No.</div>
                  <div style={{ margin: 0, fontSize: "12px", fontWeight: "900" }}><strong>3895846</strong></div>
                </td>
                <td
                  style={{
                    border: "1px solid #000",
                    padding: "10px",
                    fontSize: "11px",
                    textAlign: "center",
                    verticalAlign: "middle",
                    borderBottom: "none",
                  }}
                >
                  <div style={{ margin: 0, fontSize: "11px",marginTop: "-10px",  paddingTop: "-10px" }}>Mode/Terms of Payment</div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Single table + rowSpan: right cells sit in real table rows (no nested table), so row height matches Buyer and borders share one collapse model */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "-1px" }}>
            <tbody>
              <tr>
                <td
                  rowSpan={2}
                  style={{
                    border: "1px solid #000",
                    padding: "10px",
                    fontSize: "11px",
                    width: "59%",
                    lineHeight: "1.2",
                    paddingTop: "2px",
                    paddingBottom: "16px",
                    verticalAlign: "top",
                    borderBottom: "none",
                    borderRight: "none",
                  }}
                >
                  <p style={{ margin: 0 }}>Buyer (Bill to)</p>
                  <p style={{ margin: 0 }}><strong>{patient.patient}</strong></p>
                  <p style={{ margin: 0 }}><strong>UHID:</strong> {patient.uhid}</p>
                  <p style={{ margin: 0 }}>{branch.state}</p>
                  <p style={{ margin: 0 }}>
                    <strong>State Name:</strong> {branch.state.toUpperCase()}, code: 03
                  </p>
                </td>
                <td
                  style={{
                    border: "1px solid #000",
                    padding: "10px",
                    fontSize: "11px",
                    width: "20%",
                    textAlign: "center",
                    verticalAlign: "middle",
                    borderBottom: "none",
                    borderRight: "none",
                  }}
                >
                <div style={{ margin: 0, fontSize: "11px",marginTop: "-10px",  paddingTop: "-10px" }}>Reference No. & Date</div> 
                </td>
                <td
                  style={{
                    border: "1px solid #000",
                    padding: "10px",
                    fontSize: "12px",
                    width: "28%",
                    textAlign: "center",
                    verticalAlign: "middle",
                    borderBottom: "none",
                  }}
                >
                <div style={{ margin: 0, fontSize: "11px",marginTop: "-10px",  paddingTop: "-10px" }}>Other References</div> 
                </td>
              </tr>
              <tr>
                <td
                  style={{
                    border: "1px solid #000",
                    // padding: "10px",
                    fontSize: "11px",
                    textAlign: "center",
                    verticalAlign: "middle",
                    borderBottom: "none",
                    borderRight: "none",
                    paddingBottom: "10px",
                  }}
                >
                  <strong >Terms of Delivery</strong>
                </td>
                <td style={{ border: "1px solid #000", padding: "10px", fontSize: "11px", verticalAlign: "middle", borderBottom: "none" }} />
              </tr>
            </tbody>
          </table>


          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", marginTop: "-1px" }}>
            <thead>
              <tr>
                {["S No.", "Description of Goods", "HSN/SAC", "GST Rate", "Quantity", "Rate(Per Unit)", hasJsHealthPoints ? "JS Health Point" : "Disc.", "Amount(Excl GST)"].map((h, i) => (
                  <th key={h} style={{
                    border: "1px solid #000", padding: "10px", textAlign: i === 1 ? "start" : "center", 
                    width: i === 0 ? "50px" : i === 7 ? "140px" : "auto",
                    paddingTop: "0px",
                    borderRight: [0, 1, 2, 3, 4, 5, 6].includes(i) ? "none" : "1px solid #000", 
                    borderBottom: [0, 1, 2, 3, 4, 5, 6, 7].includes(i) ? "none" : "1px solid #000"

                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["1", "Panchkarma Services", "999311", "0%", "4", "5000", "0.00", "20,000.00"],
                ["2", "Semi Private Ward (Room Rent)", "999311", "0%", "4", "3000", "0.00", "12,000.00"],
                ["3", "DOCTORS CONSULTANT FEES", "999311", "0%", "4", "2000", "0.00", "8,000.00"],
                ["4", "Nurse Charges", "999311", "0%", "4", "1500", "0.00", "6,000.00"],
                ["5", "Diet Consultation", "999311", "0%", "4", "1500", "0.00", "6,000.00"],
              ].map((row) => (
                <tr key={row[0]}>
                  {row.map((c, i) => (
                    <td key={`${row[0]}-${i}`} style={{
                      border: "1px solid #000", padding: "10px", textAlign: i === 1 ? "left" : "center", paddingTop: "0px",
                      borderRight: [0, 1, 2, 3, 4, 5, 6].includes(i) ? "none" : "1px solid #000", borderBottom: [0, 1, 2, 3, 4, 5, 6, 7].includes(i) ? "none" : "1px solid #000"
                    }}>{c}</td>
                  ))}
                </tr>
              ))}
              <tr>
                <td style={{ border: "1px solid #000", padding: "10px", borderRight: "none", borderBottom: "none", paddingTop: "0px" }} />
                <td colSpan={3} style={{ border: "1px solid #000", padding: "10px", textAlign: "center", borderRight: "none", borderBottom: "none", paddingTop: "0px" }}>Sub Total</td>
                <td style={{ border: "1px solid #000", padding: "10px", textAlign: "center", borderRight: "none", borderBottom: "none", paddingTop: "0px" }}>20</td>
                <td style={{ border: "1px solid #000", padding: "10px", textAlign: "center", borderRight: "none", borderBottom: "none", paddingTop: "0px" }} />
                <td style={{ border: "1px solid #000", padding: "10px", textAlign: "center", borderRight: "none", borderBottom: "none", paddingTop: "0px" }}>0.00</td>
                <td style={{ border: "1px solid #000", padding: "10px", textAlign: "center", borderBottom: "none", paddingTop: "0px" }}>52,000.00</td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #000", padding: "10px", height: "150px", borderRight: "none", borderBottom: "none", paddingTop: "0px" }} />
                <td style={{ border: "1px solid #000", padding: "10px", height: "150px", textAlign: "right", verticalAlign: "middle", borderRight: "none", borderBottom: "none", paddingTop: "0px" }}>
                  <strong>CGST@ 0% </strong><br />
                  <strong>SGST@ 0% </strong><br />
                </td>
                <td style={{ border: "1px solid #000", padding: "10px", paddingTop: "0px", height: "150px", textAlign: "center", verticalAlign: "middle", borderRight: "none", borderBottom: "none" }}>
                  0.00<br />
                  0.00
                </td>
                <td style={{ border: "1px solid #000", padding: "10px", height: "150px", borderRight: "none", borderBottom: "none", verticalAlign: "middle" }} />
                <td style={{ border: "1px solid #000", padding: "10px", height: "150px", borderRight: "none", borderBottom: "none", verticalAlign: "middle" }} />
                <td style={{ border: "1px solid #000", padding: "10px", height: "150px", borderRight: "none", borderBottom: "none", verticalAlign: "middle" }} />
                <td style={{ border: "1px solid #000", padding: "10px", height: "150px", borderRight: "none", borderBottom: "none", verticalAlign: "middle" }} />
                <td style={{ border: "1px solid #000", padding: "10px", height: "150px", textAlign: "center", verticalAlign: "middle", borderBottom: "none" }}>
                  0.00
                </td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #000", padding: "10px", borderRight: "none" }} />
                <td style={{ border: "1px solid #000", padding: "10px", textAlign: "center", borderRight: "none", paddingTop: "0px", paddingBottom: "12px" }}><strong>Total</strong></td>
                <td style={{ border: "1px solid #000", padding: "10px", borderRight: "none", paddingTop: "0px", paddingBottom: "12px" }} />
                <td style={{ border: "1px solid #000", padding: "10px", borderRight: "none", paddingTop: "0px", paddingBottom: "12px" }} />
                <td style={{ border: "1px solid #000", padding: "10px", textAlign: "center", borderRight: "none", paddingTop: "0px", paddingBottom: "12px" }}><strong>20 Nos.</strong></td>
                <td style={{ border: "1px solid #000", padding: "10px", borderRight: "none", paddingTop: "0px", paddingBottom: "12px" }} />
                <td style={{ border: "1px solid #000", padding: "10px", borderRight: "none", paddingTop: "0px", paddingBottom: "12px" }} />
                <td style={{ border: "1px solid #000", padding: "10px", textAlign: "center", paddingTop: "0px", paddingBottom: "12px" }}><strong>52,000.00</strong></td>
              </tr>
            </tbody>
          </table>

          <div style={{ textAlign: "right", marginBottom: "20px", fontSize: "13px", fontWeight:"500", marginTop: "-6px" }}>E. &amp; O.E</div>
          <div style={{ fontSize: "11px", margin: 0 }}>Amount Chargeable (In words)</div>
          <div style={{ fontSize: "11px", margin: "5px 0 20px" }}><strong>INR Fifty-Two Thousand Only</strong></div>

          {/* {hasJsHealthPoints ? ( */}

          {true ? (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginBottom: "20px",
                fontSize: "11px",
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      border: "1px solid #000",
                      padding: "6px",
                      background: "#d0ebff",
                      borderRight: "none",
                      textAlign: "center",
                      borderBottom: "none",
                      paddingTop: "4px",
                      paddingBottom: "16px",
                      fontWeight:400,
                    }}
                  >
                    JS Health Card No.
                  </th>
                  <th
                    style={{
                      border: "1px solid #000",
                      padding: "6px",
                      textAlign: "center",
                      borderBottom: "none",
                      paddingTop: "4px",
                      paddingBottom: "16px",
                      fontWeight:400,
                    }}
                  >
                    505030305253
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td colSpan={2} style={{ padding: 0 }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        marginTop: "-2px",
                      }}
                    >
                      <thead>
                        <tr>
                          {[
                            "Initial Balance",
                            "Redeemed",
                            "Point Earned",
                            "Closing Balance",
                          ].map((heading, i) => (
                            <th
                              key={i}
                              style={{
                                border: "1px solid #000",
                                padding: "6px",
                                textAlign: "center",
                                borderRight: [0, 1, 2].includes(i) ? "none" : "1px solid #000",
                                borderBottom: [0, 1, 2, 3].includes(i) ? "none" : "1px solid #000",
                                paddingTop: "4px",
                                paddingBottom: "16px",
                                fontWeight:400,
                              }}
                            >
                              {heading}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        <tr>
                          {["0", "0", "2600", "2600"].map((val, i) => (
                            <td
                              key={i}
                              style={{
                                border: "1px solid #000",
                                padding: "6px",
                                textAlign: "center",
                                borderRight: [0, 1, 2].includes(i) ? "none" : "1px solid #000",
                                paddingTop: "4px",
                                paddingBottom: "16px",

                              }}
                            >
                              {val}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          ) : null}


          {/* <div style={{ borderTop: "1px solid #000", marginTop: "10px", paddingTop: "6px", textAlign: "center", fontSize: "11px" }}>-- 1 of 2 --</div> */}

          <div style={{ pageBreakBefore: "always", marginTop: "20px" }} />

          {/* <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", marginTop: "10px" }}>
            <thead>
              <tr>
                {["HSN/SAC", "Taxable Value", "CGST Rate Amount", "SGST/UTGST Rate Amount", "Total Tax"].map((h, i) => (
                  <th key={h} style={{   background: "#d0ebff", border: "1px solid #000", padding: "10px", textAlign: "center", borderRight: [0, 1, 2, 3, 4, 5].includes(i) ? "none" : "1px solid #000", borderBottom: [0, 1, 2, 3, 4, 5, 6].includes(i) ? "none" : "1px solid #000" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: "1px solid #000", padding: "10px", textAlign: "center", borderRight: "none", borderBottom: "none" }}>999311</td>
                <td style={{ border: "1px solid #000", padding: "10px", textAlign: "center", borderRight: "none", borderBottom: "none" }}>52000</td>
                <td style={{ border: "1px solid #000", padding: "10px", textAlign: "center", borderRight: "none", borderBottom: "none" }}>0%</td>
                <td style={{ border: "1px solid #000", padding: "10px", textAlign: "center", borderRight: "none", borderBottom: "none" }}>0.00</td>
                <td style={{ border: "1px solid #000", padding: "10px", textAlign: "center", borderRight: "none", borderBottom: "none" }}>0%</td>
                <td style={{ border: "1px solid #000", padding: "10px", textAlign: "center", borderRight: "none", borderBottom: "none" }}>0.00</td>
                <td style={{ border: "1px solid #000", padding: "10px", textAlign: "center", borderBottom: "none" }}>0.00</td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #000", padding: "10px", textAlign: "center", borderRight: "none" }}><strong>Total</strong></td>
                <td style={{ border: "1px solid #000", padding: "10px", textAlign: "center", borderRight: "none" }}><strong>52000</strong></td>
                <td style={{ border: "1px solid #000", padding: "10px", borderRight: "none", }} />
                <td style={{ border: "1px solid #000", padding: "10px", borderRight: "none", }} />
                <td style={{ border: "1px solid #000", padding: "10px", borderRight: "none", }} />
                <td style={{ border: "1px solid #000", padding: "10px", borderRight: "none", }} />
                <td style={{ border: "1px solid #000", padding: "10px", }} />
              </tr>
            </tbody>
          </table> */}

<table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", marginTop: "10px" }}>
  <thead>
    <tr>
      <th rowSpan={2} style={{ borderTop: "1px solid #000", borderLeft: "1px solid #000", borderRight: "1px solid #000", borderBottom: "1px solid #000", textAlign: "center", background: "#d0ebff",  paddingTop: "4px",
                                paddingBottom: "16px", fontWeight:400}}>HSN/SAC</th>
      
      <th rowSpan={2} style={{ borderTop: "1px solid #000", borderRight: "1px solid #000", borderBottom: "1px solid #000", textAlign: "center", background: "#d0ebff",  paddingTop: "4px",
                                paddingBottom: "16px", fontWeight:400}}>Taxable Value</th>
      
      <th colSpan={2} style={{ borderTop: "1px solid #000", borderRight: "1px solid #000", borderBottom: "none", textAlign: "center", background: "#d0ebff",  paddingTop: "4px",
                                paddingBottom: "16px", fontWeight:400}}>CGST</th>
      
      <th colSpan={2} style={{ borderTop: "1px solid #000", borderRight: "1px solid #000", borderBottom: "none", textAlign: "center", background: "#d0ebff",  paddingTop: "4px",
                                paddingBottom: "16px", fontWeight:400}}>SGST/UTGST</th>
      
      <th rowSpan={2} style={{ borderTop: "1px solid #000", borderRight: "1px solid #000", borderBottom: "1px solid #000",  paddingTop: "4px",
                                paddingBottom: "16px", fontWeight:400, textAlign: "center", background: "#d0ebff" }}>Total Tax</th>
    </tr>

    <tr style={{ paddingBottom: "20px" }}>
      <th style={{  borderBottom: "1px solid #000", padding: "0px", textAlign: "right", background: "#d0ebff", borderRight: "none",  paddingTop: "0px",
                                paddingBottom: "0px", fontWeight:400}}>
                                  
       <div style={{ margin: 0, fontSize: "11px", marginTop: "-24px", paddingTop: "8px", paddingBottom: "16px",  paddingRight: "10px", fontWeight:400 }}>Rate</div>               
                                  </th>
      <th style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "0px", textAlign: "left", background: "#d0ebff", paddingTop:"0px"}}>
        <div style={{ margin: 0, fontSize: "11px",marginTop: "-24px",  paddingTop: "-10px", fontWeight:400, paddingLeft: "0px"  }}>Amount</div> </th>
        
      <th style={{ borderRight: "none", borderBottom: "1px solid #000", padding: "0px", textAlign: "right", background: "#d0ebff", paddingTop:"0px" }}>
        <div style={{ margin: 0, fontSize: "11px",marginTop: "-24px",  paddingTop: "-10px", fontWeight:400, paddingRight: "10px"  }}>Rate</div> 
      </th>
      <th style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "0px", textAlign: "left", background: "#d0ebff", paddingTop:"0px"}}>
      <div style={{ margin: 0, fontSize: "11px",marginTop: "-24px",  paddingTop: "-10px", fontWeight:400, paddingLeft: "0px"  }}>Amount</div> </th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td style={{ borderLeft: "1px solid #000", borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "8px", textAlign: "center",  paddingTop: "4px",
                                paddingBottom: "16px", fontWeight:400}}>2106</td>
      <td style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "8px", textAlign: "center",  paddingTop: "4px",
                                paddingBottom: "16px", fontWeight:400}}>14,998.00</td>
      <td style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "8px", textAlign: "center",  paddingTop: "4px",
                                paddingBottom: "16px", fontWeight:400}}>9%</td>
      <td style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "8px", textAlign: "center",  paddingTop: "4px",
                                paddingBottom: "16px", fontWeight:400}}>1.00</td>
      <td style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "8px", textAlign: "center",  paddingTop: "4px",
                                paddingBottom: "16px", fontWeight:400}}>9%</td>
      <td style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "8px", textAlign: "center",  paddingTop: "4px",
                                paddingBottom: "16px", fontWeight:400}}>1.00</td>
      <td style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "8px", textAlign: "center",  paddingTop: "4px",
                                paddingBottom: "16px", fontWeight:400}}>2.00</td>
    </tr>

    <tr>
      <td style={{ borderLeft: "1px solid #000", borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "8px", textAlign: "center",paddingTop: "4px",
                                paddingBottom: "16px", fontWeight:400 }}>999319</td>
      <td style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "8px", textAlign: "center",paddingTop: "4px",
                                paddingBottom: "16px", fontWeight:400 }}>3.57</td>
      <td style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "8px", textAlign: "center",paddingTop: "4px",
                                paddingBottom: "16px", fontWeight:400 }}>6%</td>
      <td style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "8px", textAlign: "center",paddingTop: "4px",
                                paddingBottom: "16px", fontWeight:400 }}>0.22</td>
      <td style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "8px", textAlign: "center",paddingTop: "4px",
                                paddingBottom: "16px", fontWeight:400 }}>6%</td>
      <td style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "8px", textAlign: "center",paddingTop: "4px",
                                paddingBottom: "16px", fontWeight:400 }}>0.22</td>
      <td style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "8px", textAlign: "center",paddingTop: "4px",
                                paddingBottom: "16px", fontWeight:400 }}>0.43</td>
    </tr>

    <tr>
      <td style={{ borderLeft: "1px solid #000", borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "8px", textAlign: "center", paddingTop: "4px",
                                paddingBottom: "16px", fontWeight:"bold" }}>Total</td>
      <td style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "8px", textAlign: "center",paddingTop: "4px",
                                paddingBottom: "16px" }}>15,001.57</td>
      <td style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000" }}></td>
      <td style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000" }}></td>
      <td style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000" }}></td>
      <td style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000" }}></td>
      <td style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "8px", textAlign: "center",paddingTop: "4px",
                                paddingBottom: "16px" }}>2,288.56</td>
    </tr>
  </tbody>
</table>

          {/* <div style={{ margin: "10px 0 20px", fontSize: "11px" }}>
            Tax Amount (In words): <strong>INR zero Only</strong>
          </div> */}

              <div
                style={{
                  margin: "10px 0 20px",
                  fontSize: "11px",
                  whiteSpace: "nowrap"
                }}
              >
                Tax Amount (In words): <strong>INR zero Only</strong>
              </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
            <tbody>
              {/* <tr>
                <td style={{ width: "70%", paddingBottom: "10px", textDecoration: "underline" }}><strong>Declaration:</strong></td>
                <td style={{ width: "30%" }} />
              </tr> */}
              <tr>
                <td style={{ width: "70%", paddingBottom: "10px" }}>
                  <span
                    style={{
                      display: "inline-block",
                      borderBottom: "1px solid #000",
                      paddingBottom: "2px"
                    }}
                  >
                    <strong>Declaration:</strong>
                  </span>
                </td>
                <td style={{ width: "30%" }} />
              </tr>
              <tr>
                <td style={{ width: "30%" }}>
                  We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
                  <br /><br />
                  <strong>This is a Computer Generated Invoice</strong>
                </td>
                <td style={{ width: "30%", textAlign: "center", paddingTop: "10px" }}>
                  Authorised Signatory:
                </td>
              </tr>
              <tr>
                <td />
                <td style={{ textAlign: "right", paddingTop: 0 }}>
                  <strong style={{ fontWeight: 900 }}>For Jeena Sikho Lifecare Limited</strong>
                </td>
              </tr>
            </tbody>
          </table>

          {/* <div style={{ borderTop: "1px solid #000", marginTop: "20px", paddingTop: "6px", textAlign: "center", fontSize: "11px" }}>-- 2 of 2 --</div> */}
        </div>
      </div>{/* end printable */}
    </div>
  );
});

TaxInvoice.displayName = "TaxInvoice";

export default TaxInvoice;

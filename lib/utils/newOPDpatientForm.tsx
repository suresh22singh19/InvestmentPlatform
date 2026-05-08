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

export type NewOPDPatientFormProps = {
  branch?: BranchInfo;
  patient?: PatientInfo;
  doctor?: DoctorInfo;
  appointment?: AppointmentInfo;
  diagnosis?: string;
  /** When false, hides the on-page download control (parent triggers via ref). Default true. */
  showDownloadButton?: boolean;
};

export type NewOPDPatientFormHandle = {
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

function safePatientValue(value: string | undefined): string {
  const normalized = (value ?? "").trim();
  return normalized === "" ? "N/A" : normalized;
}

// ── Component ─────────────────────────────────────────────────────────────────
const NewOPDPatientForm = forwardRef<NewOPDPatientFormHandle, NewOPDPatientFormProps>(function NewOPDPatientForm(
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

  // ── Shared font / colour tokens matching the PDF exactly ──────────────────
  const BASE: React.CSSProperties = {
    fontFamily: "'Calibri', 'Gill Sans', 'Trebuchet MS', Arial, sans-serif",
    fontSize: "14px",
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
      width: "794px",
      padding: 0,
      margin: 0,
      background: "#d0d0cc",
      zIndex: -1,
      pointerEvents: "none",
    };

  return (
    <div style={shellStyle}>
      {showDownloadButton ? (
        <div style={{ maxWidth: "794px", margin: "0 auto 12px", textAlign: "right" }}>
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

        {/* ══════ PAGE 1 ══════ */}
        <div style={{
          ...BASE,
          height: "1122px",
          boxSizing: "border-box",
          padding: "40px 56px",
          display: "flex",
          flexDirection: "column",
        }}>

          {/* ── HEADER ─────────────────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "26px",
              marginBottom: "8px",
            }}
          >
            {/* Left Logo */}
            <img
              src={TITLE_SRC}
              alt="JEENA SIKHO LIFECARE LTD"
              style={{
                width: "130px",
                flexShrink: 0, // ✅ prevents shrinking
              }}
            />

            {/* Company name + address block */}
            <div
              style={{
                width: "74%", // ✅ reduce width here
                // marginLeft: "10px",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <img
                  src={LOGO_SRC}
                  alt="Jeena Sikho"
                  style={{ maxWidth: "100%" }}
                />

                <div
                  style={{
                    fontSize: "14px",
                    marginTop: "-14px",
                    marginBottom: "12px",
                    fontWeight: 500,
                  }}
                >
                  Pind Devinagar, Chandigarh Delhi Highway, Derabassi,
                  Chandigarh, Punjab, S.A.S Nagar
                  <br />
                  PH. 9517714446
                </div>
              </div>
            </div>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid #000000", paddingInline: "12px", margin: "6px 0 20px 0" }} />
          {/* <div style={{ position: "relative", height: "20px", marginTop: "18px", border: "1px solid #fff" }}>
            <div
              style={{
                position: "absolute",
                top: "-10px",
                bottom: "10px",
                inset: 0,
                background: "#003366",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                paddingLeft: "2px",
                margin: 0,
                fontSize: "13px",
              }}
            >
              Patient Details
            </div>
          </div> */}

            <div
                style={{
                  color: "#fff",
                  background: "#003366",
                  // padding: "5px 0px 5px 2px",
                }}
              >
                <h4
                  style={{
                    margin: "0px",
                    fontSize: "13px",
                    fontWeight: 600,
                    marginTop: "-15px",
                    padding: "8px 0px 8px 2px",
                  }}
                >
                  Patient Details
                </h4>
            </div>

          <table
            className="opd-patient-main"
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "none",
              marginTop: "16px",
              tableLayout: "fixed",
            }}
          >
            <colgroup>
              <col style={{ width: "34%" }} />
              <col style={{ width: "28%" }} />
              <col style={{ width: "19%" }} />
              <col style={{ width: "19%" }} />
            </colgroup>

            <thead>
              <tr>
                <th style={{ padding: "0 2px", textAlign: "left", fontWeight: "900", fontSize: "11px" }}>FullName</th>
                <th style={{ padding: "0 2px", textAlign: "left", fontWeight: "900", fontSize: "11px" }}>UHID</th>
                <th style={{ padding: "0 2px", textAlign: "left", fontWeight: "900", fontSize: "11px" }}>Age</th>
                <th style={{ padding: "0 2px", textAlign: "left", fontWeight: "900", fontSize: "11px" }}>Gender</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td style={{ padding: "1px 2px 0", textAlign: "left", fontSize: "12px" }}>
                  {safePatientValue(patient.patient)}
                </td>
                <td style={{ padding: "1px 2px 0", textAlign: "left", fontSize: "12px" }}>
                  {safePatientValue(patient.uhid)}
                </td>
                <td style={{ padding: "1px 2px 0", textAlign: "left", fontSize: "12px" }}>
                  {safePatientValue(patient.age)}
                </td>
                <td style={{ padding: "1px 2px 0", textAlign: "left", fontSize: "12px" }}>
                  {safePatientValue(formatGenderForPatientFormDisplay(patient.gender)).replace("—", "N/A")}
                </td>
              </tr>
            </tbody>
          </table>

          <h4
            style={{
              color: "red",
              fontWeight: 700,
              textAlign: "center",
              marginTop: "50px",
              fontSize: "16px",
            }}
          >
            Form not filled yet by receptionist or doctor.
          </h4>

          <div style={{ marginTop: "110px" }}>
            <p
              style={{
                fontSize: "10px",
                lineHeight: "1.3",
                margin: 0,
              }}
            >
              I hereby assure that whatever information I have provided is correct and true to the best of my knowledge.
              "If I am an asymptomatic carrier or an undiagnosed patient with COVID-19, I know it may endanger doctors and hospital staff. It is my responsibility to take appropriate precautions and to follow the protocols prescribed by them. I also know that I may get an infection from the clinic or from a doctor, and I will take every precaution to prevent this from happening, but I will not hold doctors and clinic staff accountable if such infection occurs to me or my accompanying persons.
            </p>

            <h5
              style={{
                textAlign: "right",
                marginTop: "18px",
                fontSize: "13px",
                fontWeight: 900,
              }}
            >
              Patient Signature
            </h5>
          </div>
          {/* <hr style={{ border: "none", borderTop: "1px solid #000000", paddingInline: "12px", margin: "8px 0 0px 0" }} />
          <div style={{marginLeft:"auto"}}><h5 style={{ textAlign: "center", fontSize: "13px", fontWeight: "600", marginTop: "10px" }}>1</h5></div>   */}
          <hr style={{ border: "none", borderTop: "1px solid #000000", paddingInline: "12px", marginTop: "auto" }} />
          <div style={{ textAlign: "end", fontSize: "13px", fontWeight: "600", marginTop: "-2px" }}>
            1
          </div>

        </div>{/* end page 1 */}


        {/* ══════ PAGE 2 ══════ */}
        <div style={{
          ...BASE,
          height: "1122px",
          boxSizing: "border-box",
          padding: "40px 56px",
          display: "flex",
          flexDirection: "column",
        }}>
          <div>
            <div style={{ marginTop: "10px" }}>
              {/* <div style={{ color: "white", background: "black", padding: "6px" }}>
                <h4 style={{ margin: "10px" }}>Amount Sheet</h4>
              </div> */}

              <div
                style={{
                  color: "#fff",
                  background: "#000",
                  padding: "5px 0px 5px 2px",
                }}
              >
                <h4
                  style={{
                    margin: "10px",
                    fontSize: "16px",
                    fontWeight: 600,
                    marginTop: "-5px",
                  }}
                >
                  Amount Sheet
                </h4>
              </div>
              <table
                style={{
                  fontSize: "11px",
                  width: "100%",
                  textAlign: "start",
                  borderCollapse: "separate",
                  borderSpacing: "3px 3px",
                  tableLayout: "fixed"
                }}
              >
                <tbody>
                  <tr>
                    <td style={{ width: "13%", height: "40px", verticalAlign: "middle", textTransform: "uppercase", paddingTop: "-12px", paddingBottom: "12px"}}>Date</td>
                    <td style={{ width: "19%", height: "40px", verticalAlign: "middle", textTransform: "uppercase", paddingTop: "-12px", paddingBottom: "12px"}}>Amount</td>
                    <td style={{ width: "30%", height: "40px", verticalAlign: "middle", textTransform: "uppercase", paddingTop: "-12px", paddingBottom: "12px"}}>Discount (%AGE)</td>
                    <td style={{ width: "20%", height: "40px", verticalAlign: "middle", textTransform: "uppercase", paddingTop: "-12px", paddingBottom: "12px"}}>REC Payment</td>
                    <td style={{ width: "20%", height: "40px", verticalAlign: "middle", textTransform: "uppercase", paddingTop: "-12px", paddingBottom: "12px"}}>Payment Mode</td>
                  </tr>

                  {Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} style={{ height: "50px", border: "1px solid #222" }} />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid #000000", paddingInline: "12px", marginTop: "auto" }} />
          <div style={{ textAlign: "end", fontSize: "13px", fontWeight: "600", marginTop: "-2px" }}>
            2
          </div>
        </div>
        {/* ══════ end page 2 ══════ */}
      </div>
    </div>
  );
});

NewOPDPatientForm.displayName = "NewOPDPatientForm";

export default NewOPDPatientForm;

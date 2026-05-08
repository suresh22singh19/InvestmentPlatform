"use client";
import React, { useRef, forwardRef, useImperativeHandle, useCallback } from "react";

const LOGO_SRC = "/images/jeenasikho_lifecare.jpeg";
const TITLE_SRC = "/images/shuddhi_logo.png";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface BranchInfo2 {
  address: string;
  district: string;
  state: string;
  pin_code: string;
  phone_number: string;
  type: "clinic" | "hospital";
}

export interface PatientInfo2 {
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
  contactNumber?: string;
  emailAddress?: string;
  bloodGroup?: string;
  address?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  temperature?: string;
}

export interface DoctorInfo2 {
  name: string;
  education: string[];
  reg_no: string;
}

export interface AppointmentInfo2 { created_at: string; }

export type PatientForm2Props = {
  branch?: BranchInfo2;
  patient?: PatientInfo2;
  doctor?: DoctorInfo2;
  appointment?: AppointmentInfo2;
  diagnosis?: string;
  showDownloadButton?: boolean;
};

export type PatientForm2Handle = {
  downloadPdf: () => Promise<void>;
};

export const DEFAULT_STATIC_BRANCH_INFO2: BranchInfo2 = {
  address: "Pind Devinagar, Chandigarh Delhi Highway, Derabassi, Chandigarh, Punjab",
  district: "S.A.S NAGAR",
  state: "PUNJAB",
  pin_code: "140507",
  phone_number: "9517714446",
  type: "clinic",
};

// ── Demo data ─────────────────────────────────────────────────────────────────
const DEMO_BRANCH = DEFAULT_STATIC_BRANCH_INFO2;
const DEMO_PATIENT: PatientInfo2 = {
  patient: "PATIENT NAME",
  parent_name: "GUARDIAN NAME",
  bp: "",
  sl: "",
  weight: "",
  height: "",
  uhid: "",
  opdId: "",
  age: "",
  gender: "",
};
const DEMO_DOCTOR: DoctorInfo2 = { name: "Doctor Name", education: ["BAMS"], reg_no: "" };
const DEMO_APPOINTMENT: AppointmentInfo2 = { created_at: new Date().toISOString() };
const DEMO_DIAGNOSIS = "";

// ── Helpers ───────────────────────────────────────────────────────────────────
function isFemale(gender: string | undefined): boolean {
  const g = (gender ?? "").trim().toLowerCase();
  return g === "female" || g === "f" || g.startsWith("female");
}

function fmtDateOnly(iso: string): string {
  try {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}-${mm}-${d.getFullYear()}`;
  } catch { return ""; }
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const BASE_FONT: React.CSSProperties = {
  fontFamily: "'Arial', 'Helvetica', sans-serif",
  fontSize: "11px",
  color: "#1a1a1a",
  lineHeight: "1.5",
};

const PAGE: React.CSSProperties = {
  ...BASE_FONT,
  padding: "28px 40px",
  maxWidth: "794px",
  margin: "0 auto",
  background: "#fff",
  boxSizing: "border-box",
};

const DARK_BANNER: React.CSSProperties = {
  background: "#1a1a1a",
  color: "#fff",
  fontWeight: "700",
  fontSize: "13px",
  textAlign: "center",
  padding: "6px 10px",
  letterSpacing: "0.5px",
  margin: "10px 0 8px",
};

const SECTION_LABEL: React.CSSProperties = {
  fontWeight: "700",
  fontSize: "11px",
  textDecoration: "underline",
  margin: "10px 0 4px",
};

const TABLE_BASE: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "10px",
  marginBottom: "8px",
};

const TH: React.CSSProperties = {
  border: "1px solid #555",
  background: "#e8e8e8",
  fontWeight: "700",
  padding: "4px 6px",
  textAlign: "center",
  fontSize: "10px",
};

const TD: React.CSSProperties = {
  border: "1px solid #555",
  padding: "4px 6px",
  fontSize: "10px",
  height: "22px",
};

const EMPTY_ROWS = Array.from({ length: 9 });

// ── Header block (reused on pages with logo) ──────────────────────────────────
function HeaderBlock({ branch }: { branch: BranchInfo2 }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "6px" }}>
      <img src={TITLE_SRC} alt="Shuddhi" style={{ width: "90px", height: "auto", flexShrink: 0 }} />
      <div style={{ flex: 1, textAlign: "center" }}>
        <img src={LOGO_SRC} alt="Jeena Sikho Lifecare Ltd" style={{ height: "auto", maxWidth: "360px" }} />
        <div style={{ fontSize: "10px", color: "#333", marginTop: "2px" }}>
          {branch.address},<br />
          {branch.district}, {branch.state}-{branch.pin_code}<br />
          PH.{branch.phone_number}
        </div>
      </div>
    </div>
  );
}

// ── Patient info bar (reused across pages 2-6) ────────────────────────────────
function PatientBar({ patient }: { patient: PatientInfo2 }) {
  return (
    <div style={{ display: "flex", gap: "24px", fontSize: "10px", borderBottom: "1px solid #999", paddingBottom: "3px", marginBottom: "8px" }}>
      <span>Name: <strong>{patient.patient}</strong></span>
      <span>Age: <strong>{patient.age || "—"}</strong></span>
      <span>UHID No.: <strong>{patient.uhid || "—"}</strong></span>
      <span>Sex: <strong>{patient.gender || "—"}</strong></span>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
const PatientForm2 = forwardRef<PatientForm2Handle, PatientForm2Props>(function PatientForm2(
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
        filename: `patient_form2_${patient.uhid || "form"}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(printRef.current)
      .save();
  }, [patient.uhid]);

  useImperativeHandle(ref, () => ({ downloadPdf: handleDownloadPDF }), [handleDownloadPDF]);

  const dateStr = fmtDateOnly(appointment.created_at);
  const addressFull = [patient.address, patient.city, patient.state].filter(Boolean).join(", ")
    + (patient.pinCode ? `-${patient.pinCode}` : "");

  const shellStyle: React.CSSProperties = showDownloadButton
    ? { background: "#d0d0cc", minHeight: "100vh", padding: "20px" }
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

      <div ref={printRef} style={{ background: "#fff" }}>

        {/* ══════ PAGE 1 – Confidential Information ══════ */}
        <div style={PAGE}>
          <HeaderBlock branch={branch} />
          <hr style={{ border: "none", borderTop: "2px solid #999", margin: "6px 0 0" }} />

          <div style={DARK_BANNER}>CONFIDENTIAL INFORMATION</div>

          {/* Row 1 */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "4px", fontSize: "11px" }}>
            <span>Name: <strong>{patient.patient}</strong></span>
            <span style={{ marginLeft: "12px" }}>C/o / D/o / S/o: <strong>{patient.parent_name}</strong></span>
            <span style={{ marginLeft: "12px" }}>Age: <strong>{patient.age || "—"}</strong></span>
          </div>
          {/* Row 2 */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "4px", fontSize: "11px" }}>
            <span>DOB______________________</span>
            <span style={{ marginLeft: "12px" }}>Sex: <strong>{patient.gender || "—"}</strong></span>
            <span style={{ marginLeft: "12px" }}>Occupation:</span>
            <span style={{ marginLeft: "12px" }}>Religion:</span>
          </div>
          {/* Row 3 */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "4px", fontSize: "11px" }}>
            <span>Blood Group: <strong>{patient.bloodGroup || ""}</strong></span>
            <span style={{ marginLeft: "12px" }}>DOM_______________________</span>
            <span style={{ marginLeft: "12px" }}>Address: <strong>{patient.address || ""}</strong></span>
          </div>
          {/* Row 4 */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "4px", fontSize: "11px" }}>
            <span>City: <strong>{patient.city || ""}</strong></span>
            <span style={{ marginLeft: "12px" }}>State: <strong>{patient.state || ""}</strong></span>
            <span style={{ marginLeft: "12px" }}>Pin Code: <strong>{patient.pinCode || ""}</strong></span>
          </div>
          {/* Row 5 */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "4px", fontSize: "11px" }}>
            <span>Telephone: <strong>{patient.contactNumber || ""}</strong></span>
            <span style={{ marginLeft: "12px" }}>E-mail ID: <strong>{patient.emailAddress || ""}</strong></span>
            <span style={{ marginLeft: "12px" }}>Marital Status:</span>
          </div>
          {/* Row 6 */}
          <div style={{ fontSize: "11px", marginBottom: "4px" }}>
            <span>Diet Pattern:</span>
            <span style={{ marginLeft: "24px" }}>Addiction Habit:</span>
          </div>

          <div style={DARK_BANNER}>INITIAL ASSESSMENT</div>

          <div style={{ display: "flex", gap: "24px", fontSize: "11px", marginBottom: "8px" }}>
            <span>UHID No.: <strong>{patient.uhid}</strong></span>
            <span>OPD No.: <strong>{patient.opdId}</strong></span>
            <span>Doctor: <strong>{doctor.name}</strong></span>
          </div>

          {/* Initial Assessment table */}
          <table style={TABLE_BASE}>
            <thead>
              <tr>
                {["DATE", "B.P", "PULSE", "SPO2.", "SUGAR", "WEIGHT", "REMARKS"].map((h) => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* First row pre-filled */}
              <tr>
                <td style={TD}><strong>{dateStr}</strong></td>
                <td style={TD}><strong>{patient.bp || ""}</strong></td>
                <td style={TD}></td>
                <td style={TD}></td>
                <td style={TD}><strong>{patient.sl || ""}</strong></td>
                <td style={TD}><strong>{patient.weight || ""}</strong></td>
                <td style={TD}></td>
              </tr>
              {EMPTY_ROWS.map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} style={TD}></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ══════ PAGE BREAK ══════ */}
        <div style={{ pageBreakBefore: "always", breakBefore: "page" }} />

        {/* ══════ PAGE 2 – Patient's Full History ══════ */}
        <div style={PAGE}>
          <div style={{ ...DARK_BANNER, fontSize: "16px", padding: "10px" }}>PATIENT&apos;S FULL HISTORY</div>
          <PatientBar patient={patient} />
          <div style={{ fontSize: "11px", lineHeight: "2.2" }}>
            <p style={{ margin: "0 0 4px" }}>-सबसे पहले किस बीमारी से शुरुआत हुई थी ? पहले कब कब बीमार पढ़े थे !</p>
            <p style={{ margin: "0 0 4px" }}>- का बीमारी कौन से साल में हुई थी और उस समय क्या उपचार किया गया ? कौन से हॉस्पिटल सैं उपचार हुआ था.</p>
            <p style={{ margin: "0 0 4px" }}>- कितनी फैमिकल वाली गोलियां अभी खा रहे हो ? गोलियाँ के नाम और छितने साल से !</p>
            <p style={{ margin: "0 0 4px" }}>- आज तक कौन-कौन सी जांचे करा चुके हो और क्या Diagnose हुआ था ?</p>
            <p style={{ margin: "0 0 4px" }}>- अतीत में कोई ऐसा घटना घटी हो जिसका जिंदगी पर वा हेल्थ पर गहरा असर पड़ा हो ?</p>
          </div>
        </div>

        {/* ══════ PAGE BREAK ══════ */}
        <div style={{ pageBreakBefore: "always", breakBefore: "page" }} />

        {/* ══════ PAGE 3 – Medical History ══════ */}
        <div style={PAGE}>
          <PatientBar patient={patient} />

          <div style={{ fontSize: "11px", marginBottom: "6px" }}>
            <span>Family History :<strong>Father Name:</strong>,PH.:<span style={{ marginLeft: "8px" }}>/</span><strong>Mother Name:</strong>,PH.:<span style={{ marginLeft: "8px" }}>/</span><strong>Spouse Name:</strong>,PH.:</span>
          </div>
          <div style={{ fontSize: "11px", marginBottom: "6px" }}>Surgery / Procedure History:</div>
          <div style={{ fontSize: "11px", marginBottom: "8px" }}>धरण/कोडी :</div>

          {/* Symptoms table */}
          <table style={TABLE_BASE}>
            <thead>
              <tr>
                <th style={TH}>Visit</th>
                <th style={TH}>Symptoms</th>
                <th style={TH}>Duration</th>
                <th style={TH}>Improvement Scoring</th>
                <th style={TH}>Initial Score</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} style={{ ...TD, height: "28px" }}></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div style={SECTION_LABEL}>HISTORY OF PAST ILLNESS:</div>
          <table style={TABLE_BASE}>
            <thead>
              <tr>
                <th style={TH}>Visit</th>
                <th style={TH}>Disease</th>
                <th style={TH}>Duration</th>
                <th style={TH}>Treatment / Pathy / Indication उपचार / पैथी / संकेत</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 4 }).map((__, j) => (
                    <td key={j} style={{ ...TD, height: "28px" }}></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ fontSize: "11px", marginBottom: "6px" }}>Gynaec/Obs History:</div>
          <div style={SECTION_LABEL}>GASTROENTEROLOGY/ DIGESTION/EXCREATORY SYSTEM</div>
          <div style={{ height: "24px" }} />
          <div style={SECTION_LABEL}>Pulmonary System/cardiac System</div>
          <div style={{ height: "24px" }} />
          <div style={SECTION_LABEL}>Dermatological Examination</div>
          <div style={{ height: "24px" }} />
          <div style={SECTION_LABEL}>Nervous System Examination</div>
          <div style={{ height: "24px" }} />

          <div style={{ fontWeight: "700", fontSize: "11px", margin: "10px 0 4px" }}>INVESTIGATION (Blood / Urine Culture)</div>
          <table style={TABLE_BASE}>
            <thead>
              <tr>
                <th style={TH}>Visit</th>
                <th style={TH}>Investigation</th>
                <th style={TH}>Visit</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {Array.from({ length: 3 }).map((_, j) => (
                  <td key={j} style={{ ...TD, height: "28px" }}></td>
                ))}
              </tr>
            </tbody>
          </table>

          <table style={TABLE_BASE}>
            <thead>
              <tr>
                <th style={TH}>Visit</th>
                <th style={TH}>RADIOLOGY</th>
                <th style={TH}>FINDINGS</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {Array.from({ length: 3 }).map((_, j) => (
                  <td key={j} style={{ ...TD, height: "28px" }}></td>
                ))}
              </tr>
            </tbody>
          </table>

          <table style={TABLE_BASE}>
            <thead>
              <tr>
                <th style={TH}>Visit</th>
                <th style={TH}>Provisional Diagnosis</th>
                <th style={TH}>Final Diagnosis</th>
                <th style={TH}>Line of Treatment</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {Array.from({ length: 4 }).map((_, j) => (
                  <td key={j} style={{ ...TD, height: "28px" }}></td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* ══════ PAGE BREAK ══════ */}
        <div style={{ pageBreakBefore: "always", breakBefore: "page" }} />

        {/* ══════ PAGE 4 – Functional Evaluation ══════ */}
        <div style={PAGE}>
          <PatientBar patient={patient} />
          <div style={{ fontSize: "11px", marginBottom: "6px" }}>Functional Evaluation:</div>

          <div style={{ fontWeight: "700", fontSize: "12px", margin: "8px 0 4px" }}>Balance disorders</div>
          <table style={{ ...TABLE_BASE, width: "50%" }}>
            <thead>
              <tr>
                <th style={TH}>Visit</th>
                <th style={TH}>Sitting</th>
                <th style={TH}>Standing</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 3 }).map((__, j) => (
                    <td key={j} style={{ ...TD, height: "28px" }}></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ fontWeight: "700", fontSize: "12px", margin: "12px 0 4px" }}>Pain Scale:</div>
          <table style={TABLE_BASE}>
            <thead>
              <tr>
                {["Visit", "0 (No Pain)", "1-3 (Mild)", "4-6 (Moderate Severe)", "7-9 (Very Severe)", "10 (Worst Possible)"].map((h) => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} style={{ ...TD, height: "28px" }}></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ fontWeight: "700", fontSize: "12px", textDecoration: "underline", margin: "12px 0 4px" }}>Coordination</div>
          <table style={TABLE_BASE}>
            <thead>
              <tr>
                <th style={TH} rowSpan={2}>Visit</th>
                <th style={TH} colSpan={2}>UPPER LIMBS</th>
                <th style={TH} colSpan={2}>LOWER LIMBS</th>
                <th style={TH}>Comments</th>
              </tr>
              <tr>
                <th style={TH}>Left</th>
                <th style={TH}>Right</th>
                <th style={TH}>Left</th>
                <th style={TH}>Right</th>
                <th style={TH}></th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} style={{ ...TD, height: "28px" }}></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ══════ PAGE BREAK ══════ */}
        <div style={{ pageBreakBefore: "always", breakBefore: "page" }} />

        {/* ══════ PAGE 5 – Panchkarma Treatment Plan ══════ */}
        <div style={PAGE}>
          <table style={{ ...TABLE_BASE, border: "1px solid #555" }}>
            <tbody>
              {/* Main heading */}
              <tr>
                <td colSpan={5} style={{ ...TH, background: "#d0d0d0", fontSize: "12px", padding: "6px", textAlign: "center" }}>
                  PANCHKARMA TREATMENT PLAN
                </td>
              </tr>
              {/* POORVA KARMA */}
              <tr>
                <td colSpan={5} style={{ ...TD, background: "#e8e8e8", fontWeight: "700", textAlign: "center" }}>POORVA KARMA</td>
              </tr>
              <tr>
                {["Visit", "Days Medicine/Treatment", "Benefits, Risk", "Next follow up advice", "Next follow up date"].map((h) => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
              {Array.from({ length: 3 }).map((_, i) => (
                <tr key={`p${i}`}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} style={{ ...TD, height: "28px" }}></td>
                  ))}
                </tr>
              ))}
              {/* PRADHAN KARMA */}
              <tr>
                <td colSpan={5} style={{ ...TD, background: "#e8e8e8", fontWeight: "700", textAlign: "center" }}>PRADHAN KARMA</td>
              </tr>
              <tr>
                {["Visit", "Days Medicine/Treatment", "Benefits, Risk", "Next follow up advice", "Next follow up date"].map((h) => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
              {Array.from({ length: 3 }).map((_, i) => (
                <tr key={`pr${i}`}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} style={{ ...TD, height: "28px" }}></td>
                  ))}
                </tr>
              ))}
              {/* PASCHAT KARMA */}
              <tr>
                <td colSpan={5} style={{ ...TD, background: "#e8e8e8", fontWeight: "700", textAlign: "center" }}>PASCHAT KARMA</td>
              </tr>
              <tr>
                <th style={TH}>Visit</th>
                <th style={{ ...TH }} colSpan={2}>Days Medicine/Treatment</th>
                <th style={{ ...TH }} colSpan={2}>Benefits, Risk</th>
              </tr>
              {Array.from({ length: 3 }).map((_, i) => (
                <tr key={`pa${i}`}>
                  <td style={{ ...TD, height: "28px" }}></td>
                  <td style={{ ...TD, height: "28px" }} colSpan={2}></td>
                  <td style={{ ...TD, height: "28px" }} colSpan={2}></td>
                </tr>
              ))}
              {/* PANCH KARMA */}
              <tr>
                <td colSpan={5} style={{ ...TD, background: "#e8e8e8", fontWeight: "700", textAlign: "center" }}>PANCH KARMA</td>
              </tr>
              <tr>
                {["Visit", "Therapy", "Duration", "Daily/Alternate/No of days", "Therapist"].map((h) => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
              {Array.from({ length: 3 }).map((_, i) => (
                <tr key={`pk${i}`}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} style={{ ...TD, height: "28px" }}></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* TREATMENT */}
          <div style={{ fontWeight: "700", fontSize: "15px", textAlign: "center", margin: "16px 0 8px" }}>TREATMENT:</div>
          <div style={{ display: "flex", gap: "24px", fontSize: "10px", borderBottom: "1px solid #999", paddingBottom: "3px", marginBottom: "6px" }}>
            <span>Name: <strong>{patient.patient}</strong></span>
            <span>Age: <strong>{patient.age || "—"}</strong></span>
            <span>UHID No.: <strong>{patient.uhid || "—"}</strong></span>
            <span>Sex: <strong>{patient.gender || "—"}</strong></span>
          </div>
          <table style={TABLE_BASE}>
            <thead>
              <tr>
                {["Visit", "Medicine", "QTY", "Dosage", "Frequency", "Days"].map((h) => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} style={{ ...TD, height: "28px" }}></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Diagnosis */}
          <div style={{ fontWeight: "700", fontSize: "15px", textAlign: "center", margin: "16px 0 8px" }}>Diagnosis:</div>
          <table style={TABLE_BASE}>
            <thead>
              <tr>
                <th style={TH}>Visit</th>
                <th style={TH}>Diagnosis</th>
                <th style={TH}>Sub Diagnosis</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  <td style={{ ...TD, height: "28px" }}></td>
                  <td style={{ ...TD, height: "28px" }}>{i === 0 ? diagnosis : ""}</td>
                  <td style={{ ...TD, height: "28px" }}></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ══════ PAGE BREAK ══════ */}
        <div style={{ pageBreakBefore: "always", breakBefore: "page" }} />

        {/* ══════ PAGE 6 – Diet History ══════ */}
        <div style={PAGE}>
          <div style={{ fontWeight: "700", fontSize: "18px", textAlign: "center", margin: "0 0 12px" }}>DIET HISTORY</div>
          <div style={{ display: "flex", gap: "24px", fontSize: "10px", borderBottom: "1px solid #999", paddingBottom: "3px", marginBottom: "8px" }}>
            <span>Name: <strong>{patient.patient}</strong></span>
            <span>Age: <strong>{patient.age || "—"}</strong></span>
            <span>UHID No.: <strong>{patient.uhid || "—"}</strong></span>
            <span>Gender: <strong>{patient.gender || "—"}</strong></span>
          </div>
          <table style={TABLE_BASE}>
            <thead>
              <tr>
                <th style={{ ...TH, width: "60px" }}>Visit</th>
                <th style={{ ...TH, width: "140px" }}>Date</th>
                <th style={TH}>Diet Detail</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 12 }).map((_, i) => (
                <tr key={i}>
                  <td style={{ ...TD, height: "28px" }}></td>
                  <td style={{ ...TD, height: "28px" }}></td>
                  <td style={{ ...TD, height: "28px" }}></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ══════ PAGE BREAK ══════ */}
        <div style={{ pageBreakBefore: "always", breakBefore: "page" }} />

        {/* ══════ PAGE 7 – Medical History Form ══════ */}
        <div style={PAGE}>
          <HeaderBlock branch={branch} />
          <hr style={{ border: "none", borderTop: "2px solid #999", margin: "6px 0 8px" }} />

          <div style={{ fontWeight: "700", fontSize: "16px", textAlign: "center", marginBottom: "10px" }}>Medical History Form</div>

          <div style={{ fontWeight: "700", fontSize: "11px", marginBottom: "6px" }}>I. Identifying Information</div>
          <div style={{ display: "flex", gap: "24px", fontSize: "11px", marginBottom: "4px" }}>
            <span>Full Name: <strong>{patient.patient}</strong></span>
            <span style={{ marginLeft: "20px" }}>Date :______________________</span>
          </div>
          <div style={{ display: "flex", gap: "24px", fontSize: "11px", marginBottom: "8px" }}>
            <span>UHID NO: <strong>{patient.uhid}</strong></span>
            <span style={{ marginLeft: "12px" }}>Age: <strong>{patient.age || "—"}</strong></span>
            <span style={{ marginLeft: "12px" }}>Sex: <strong>{patient.gender || "—"}</strong></span>
          </div>
          <div style={{ fontSize: "11px", marginBottom: "4px" }}>Referring Clinician:</div>
          <div style={{ fontSize: "11px", marginBottom: "10px" }}>Reason(s) For Visit:</div>

          <div style={{ fontWeight: "700", fontSize: "12px", marginBottom: "6px" }}>II. Medical History (please give full details)</div>
          <ul style={{ margin: "0 0 10px 16px", fontSize: "11px", lineHeight: "2" }}>
            <li>Diabetes :</li>
            <li>HTN :</li>
            <li>CAD :</li>
            <li>THYROID :</li>
            <li>MENTRUAL :</li>
          </ul>

          {[
            "Are you allergic to any food or drink?",
            "Do you take any vitamins, minerals and/or food supplements?",
            "Have you had any major injuries, hospitalizations, or operations?",
            "Do you have any chronic illnesses?",
            "Do you take any medications on a regular basis?",
          ].map((q) => (
            <div key={q} style={{ fontSize: "11px", marginBottom: "6px" }}>{q}</div>
          ))}

          <div style={{ fontWeight: "700", fontSize: "11px", marginBottom: "4px", marginTop: "6px" }}>Please explain about</div>
          <ul style={{ margin: "0 0 10px 16px", fontSize: "11px", lineHeight: "1.9" }}>
            {["Appetite :", "Food habits :", "Daily working hours :", "Exercise :", "Job profile :", "Height :", "Weight :"].map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>

          {[
            "Have you ever been diagnosed or do you suffer from anxiety?",
            "Have you ever been diagnosed or do you suffer from depression?",
            "Have you ever been diagnosed or do you suffer from an eating disorder, such as, anorexia, bulimia, or binge eating?",
          ].map((q) => (
            <div key={q} style={{ fontSize: "11px", marginBottom: "6px" }}>{q}</div>
          ))}

          <div style={{ display: "flex", gap: "40px", marginTop: "30px" }}>
            <div style={{ border: "1px solid #555", padding: "12px 24px 28px", fontSize: "11px", flex: 1, textAlign: "center" }}>
              <strong>Doctor Signature</strong>
            </div>
            <div style={{ border: "1px solid #555", padding: "12px 24px 28px", fontSize: "11px", flex: 1, textAlign: "center" }}>
              <strong>Patient Signature</strong>
            </div>
          </div>
        </div>

        {/* ══════ PAGE BREAK ══════ */}
        <div style={{ pageBreakBefore: "always", breakBefore: "page" }} />

        {/* ══════ PAGE 8 – Patient Consent Form ══════ */}
        <div style={PAGE}>
          <div style={{ fontSize: "10px", marginBottom: "3px" }}>
            Name: <strong>{patient.patient}</strong>
            <span style={{ marginLeft: "16px" }}>Age: <strong>{patient.age || "—"}</strong></span>
            <span style={{ marginLeft: "16px" }}>UHID No.: <strong>{patient.uhid}</strong></span>
            <span style={{ marginLeft: "16px" }}>Sex: <strong>{patient.gender || "—"}</strong></span>
          </div>
          <hr style={{ border: "none", borderTop: "1px solid #999", margin: "4px 0 8px" }} />

          <div style={{ fontWeight: "700", fontSize: "13px", textAlign: "center", marginBottom: "4px" }}>
            PATIENT CONSENT FORM FOR CASE REPORTS
          </div>
          <div style={{ fontWeight: "700", fontSize: "11px", textAlign: "center", marginBottom: "10px" }}>
            (मामले की रिपोर्ट के लिए रोगी सहमति फॉर्म)
          </div>

          <div style={{ fontSize: "10px", lineHeight: "1.8", marginBottom: "6px" }}>
            For a patient&apos;s consent to publication of information about them in a journal
          </div>
          <div style={{ fontSize: "10px", lineHeight: "1.8", marginBottom: "6px" }}>
            एक पत्रिका में उनके बारे में जानकारी के प्रकाशन के लिए एक रोगी की सहमति के लिए
          </div>

          {[
            ["Name of person described in article/लेख में वर्णित व्यक्ति का नाम", ""],
            ["Subject matter of photograph or article/तस्वीर या लेख का विषय", ""],
            ["Title of article/लेख का शीर्षक", ""],
            ["Medical practitioner or corresponding author/चिकित्सा व्यवसायी या संबंधित लेखक", ""],
          ].map(([label]) => (
            <div key={label as string} style={{ fontSize: "10px", marginBottom: "4px" }}>
              {label as string}______________________
            </div>
          ))}

          <div style={{ fontSize: "10px", lineHeight: "1.8", margin: "8px 0" }}>
            I_________________________[insert full name] give my consent for this information about MYSELF OR MY CHILD OR WARD/MY RELATIVE (insert full name]:______________________________ relating to the subject matter above ("the Information") to appear in a journal article, or to be used for the purpose of research.
          </div>

          <div style={{ fontWeight: "700", fontSize: "10px", textAlign: "center", margin: "6px 0" }}>Or (या)</div>

          <div style={{ fontSize: "10px", lineHeight: "1.8", marginBottom: "8px" }}>
            म____________________[पूरा नाम डालें] इसके लिए मेरी सहमति दें मेरे या मेरे बच्चे या वार्ड के रिश्तेदार के बारे में जानकारी (पूरा डालें नाम]:______________________________ उपरोक्त विषय वस्तु से संबंधित ("सूचना आयन") एक जर्नल लेख में दिखाई देते हैं, या अनुसंधान के उद्देश्य के लिए उपयोग किए जाते हैं।
          </div>

          <div style={{ fontWeight: "700", fontSize: "10px", marginBottom: "4px" }}>I understand the following/मैं निम्नलिखित समझता हूँ</div>

          <div style={{ fontSize: "10px", lineHeight: "1.8" }}>
            <p>1. The Information will be published without my name/child&apos;s name/relatives name attached and every attempt will be made to ensure anonymity. I understand, however, that complete anonymity cannot be guaranteed.</p>
            <p>2. The Information may be published in a journal which is read worldwide or an online journal. Journals are aimed mainly at health care professionals but may be seen by many non-doctors, including journalists.</p>
            <p>3. The Information may be placed on a website.</p>
            <p>4. I can withdraw my consent at any time before online publication, but once the Information has been committed to publication it will not be possible to withdraw the consent.</p>
          </div>

          <div style={{ display: "flex", gap: "16px", marginTop: "20px", fontSize: "10px" }}>
            <span>Patient Signature/रोगी के हस्ताक्षर_______________________</span>
            <span>Date/तारीख______________________</span>
          </div>
          <div style={{ fontSize: "10px", marginTop: "8px" }}>
            Medical Practitioner Signature/चिकित्सा व्यवसायी के हस्ताक्षर:____________Date/तारीख________________
          </div>
        </div>

        {/* ══════ PAGE BREAK ══════ */}
        <div style={{ pageBreakBefore: "always", breakBefore: "page" }} />

        {/* ══════ PAGE 9 – COVID-19 Declaration ══════ */}
        <div style={PAGE}>
          <HeaderBlock branch={branch} />
          <hr style={{ border: "none", borderTop: "2px solid #999", margin: "6px 0 8px" }} />

          <div style={{ fontWeight: "700", fontSize: "13px", textAlign: "center", marginBottom: "10px", letterSpacing: "0.5px" }}>
            COVID-19 MANDATORY SELF DECLARATION
          </div>

          <div style={{ display: "flex", gap: "24px", fontSize: "11px", marginBottom: "4px" }}>
            <span>Name: <strong>{patient.patient}</strong></span>
            <span style={{ marginLeft: "16px" }}>Age: <strong>{patient.age || "—"}</strong></span>
            <span style={{ marginLeft: "16px" }}>Gender: <strong>{patient.gender || "—"}</strong></span>
          </div>
          <div style={{ fontSize: "11px", marginBottom: "4px" }}>
            Address: <strong>{addressFull || ""}</strong>
          </div>
          <div style={{ fontSize: "11px", marginBottom: "10px" }}>
            Contact Number: <strong>{patient.contactNumber || ""}</strong>
          </div>

          <div style={{ fontSize: "10px", marginBottom: "8px", lineHeight: "1.6" }}>
            Due to the ongoing and rapidly changing situation with the novel-corona virus (COVID-19), we are requiring all visitors to the Shuddhi Ayurveda Panchkarma Hospital ( A unit of Jeena Sikho Lifecare Ltd), Hospital to fill-out the self-declaration form below
          </div>

          <div style={{ fontWeight: "700", fontSize: "11px", marginBottom: "6px" }}>Do you have any of the following flu-like symptoms ?</div>

          <table style={{ ...TABLE_BASE, width: "60%" }}>
            <tbody>
              {["Fever(बुखार)", "Dry Cough(सूखी खाँसी)", "Sore Throat(गला खराब होना)", "Diarrhea(दस्त)", "Breathlessness(सांस फूलना)", "Asthma(दमा)", "Other : Please specify(अन्य (कृपया निर्दिष्ट करें)"].map((s) => (
                <tr key={s}>
                  <td style={{ border: "1px solid #555", padding: "3px 6px", fontSize: "10px", height: "20px" }}>{s}</td>
                  <td style={{ border: "1px solid #555", padding: "3px 6px", fontSize: "10px", width: "80px" }}></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ fontSize: "10px", lineHeight: "2", marginTop: "8px" }}>
            {[
              "• History of travel In the recent one month nationally and internationally?",
              "• Any contact history with a person who had returned from foreign country? If yes, please specify.",
              "• Purpose of your visit: For consultation, Patient attendant/other reason?",
              "• Have you come in contact with the covid-19 positive patient in last one month?",
              "• Have you attend any gathering or visited any crowded market place in the last 14 days? If yes, please specify.",
              "• Are you taking any precautionary measures for boosting your immunity prior to coming? If yes, please specify.",
              "• Kindly share your status of Aarogya Setu app? Red/Orange/Green.",
            ].map((q) => <div key={q}>{q}</div>)}
          </div>

          <div style={{ fontSize: "10px", lineHeight: "1.7", marginTop: "8px" }}>
            I hereby assure that whatever information I have provided is correct and true to the best of my knowledge. &quot;If I am an asymptomatic carrier or an undiagnosed patient with covid-19, I know it may endanger doctors and Hospital staff. It is my responsibility to take appropriate precaution and to follow the protocols prescribed by them.&quot;
          </div>

          <div style={{ textAlign: "right", fontWeight: "700", fontSize: "11px", marginTop: "20px" }}>Patient Signature</div>
        </div>

        {/* ══════ PAGE BREAK ══════ */}
        <div style={{ pageBreakBefore: "always", breakBefore: "page" }} />

        {/* ══════ PAGE 10 – Feedback Form ══════ */}
        <div style={PAGE}>
          <HeaderBlock branch={branch} />
          <hr style={{ border: "none", borderTop: "2px solid #999", margin: "6px 0 8px" }} />

          <div style={{ fontWeight: "700", fontSize: "14px", textAlign: "center", marginBottom: "8px", letterSpacing: "0.5px" }}>
            FEEDBACK FORM
          </div>
          <div style={{ fontSize: "10px", marginBottom: "8px" }}>
            Name: <strong>{patient.patient}</strong>
            <span style={{ marginLeft: "16px" }}>Age: <strong>{patient.age || "—"}</strong></span>
            <span style={{ marginLeft: "16px" }}>UHID No.: <strong>{patient.uhid}</strong></span>
            <span style={{ marginLeft: "16px" }}>Sex: <strong>{patient.gender || "—"}</strong></span>
          </div>

          <div style={{ fontWeight: "700", fontSize: "11px", marginBottom: "4px" }}>Dear Sir/Madam, प्रिय महोदय/ महोदया</div>
          <div style={{ fontSize: "10px", lineHeight: "1.7", marginBottom: "8px" }}>
            We want to know your opinion. We would appreciate if you would spare us a moment of your valuable time in providing us your feedback regarding various aspects of medical care and hospitality that were extended to your stay here with us.
          </div>

          <table style={TABLE_BASE}>
            <thead>
              <tr>
                <th style={{ ...TH, width: "40px" }}>S.No</th>
                <th style={TH}>Services/सेवाएं</th>
                <th style={{ ...TH, width: "120px" }}>Good/अच्छा, yes/हाँ<br />Not Good/अच्छा नहीं, No/नहीं</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["1.", "Do you found, Time period spent on your assessment is sufficient or not? आपकी जांच के लिए डॉक्टर के द्वारा दिया गया समय पर्याप्त है या नहीं"],
                ["2.", "Explained about diagnosis and treatment? निदान और उपचार के बारे में समझाया"],
                ["3.", "How is work experience of staff? कर्मचारियों का कार्य अनुभव कैसा है"],
                ["4.", "During your problem did employee or staff respond you on time or not? जब आप अपनी समस्या बताते हैं, तो कर्मचारी ठीक से सुनते हैं"],
                ["5.", "Did staff treat you with dignity and respect? क्या कर्मचारी आप से गरिमा और सम्मान के साथ व्यवहार करते हैं"],
                ["6.", "How would you feel during treatment? ईलाज के दौरान आपने कैसा अनुभव किया"],
                ["7.", "Did you have confidence and trust in the staff? क्या आप कर्मचारी के कार्य क्षमता से संतुष्ट हैं"],
                ["8.", "What one thing would you change about the department? इस विभाग में कोई एक भी ऐसी चीज जिस में आप सुधार चाहते हैं"],
              ].map(([no, text]) => (
                <tr key={no as string}>
                  <td style={{ ...TD, textAlign: "center", verticalAlign: "top" }}>{no as string}</td>
                  <td style={{ ...TD, fontSize: "9px", lineHeight: "1.5" }}>{text as string}</td>
                  <td style={TD}></td>
                </tr>
              ))}
              <tr>
                <td colSpan={2} style={{ ...TD, fontWeight: "700", fontSize: "10px" }}>Your comments / आपके सुझाव</td>
                <td style={TD}></td>
              </tr>
            </tbody>
          </table>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px", fontSize: "10px" }}>
            <span>Date:.....................................</span>
            <span>Signature(Patient/Guardian)</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "10px" }}>
            <span>Signature(Hospital Authority)</span>
            <span>Signature (MD/MS)</span>
          </div>
        </div>

      </div>{/* end printable */}
    </div>
  );
});

PatientForm2.displayName = "PatientForm2";

export default PatientForm2;

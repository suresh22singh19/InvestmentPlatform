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

export type PatientCGHSProps = {
  branch?: BranchInfo;
  patient?: PatientInfo;
  doctor?: DoctorInfo;
  appointment?: AppointmentInfo;
  diagnosis?: string;
  /** When false, hides the on-page download control (parent triggers via ref). Default true. */
  showDownloadButton?: boolean;
};

export type PatientCGHSHandle = {
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
const PatientCGHS = forwardRef<PatientCGHSHandle, PatientCGHSProps>(function PatientCGHS(
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
    const blobUrl = await html2pdf()
      .set({
        margin: 0,
        filename: `prescription_${patient.uhid}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(printRef.current)
      .outputPdf("bloburl");
    window.open(blobUrl, "_blank");
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
    color: "#1a1a1a",
    lineHeight: "1.55",
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
        <div style={{ ...BASE, padding: "36px 70px", maxWidth: "800px", margin: "0 auto" }}>

          {/* ── HEADER ─────────────────────────────────────────────── */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "8px" }}>
            {/* Jeena Sikho badge logo */}
            <img src={TITLE_SRC} alt="JEENA SIKHO LIFECARE LTD"
                style={{ height: "auto", width: "120px", display: "block", margin: "0 auto 4px" }} />

            {/* Company name + address block */}
            <div style={{ flex: 1, textAlign: "center" }}>
            <img src={LOGO_SRC} alt="Jeena Sikho" style={{ height: "auto", width: "auto", flexShrink: 0 }} />
              <div style={{ fontSize: "14px", fontFamily: "serif", color: "#333", marginTop: "-8px", marginBottom: '12px'}}>
                {branch.address}, {branch.district}-{branch.pin_code} , {branch.state.toUpperCase()},<br />
                {branch.district.toUpperCase()}-{branch.pin_code}<br />
                PH.{branch.phone_number}
              </div>
            </div>
          </div>

          {/* ── HORIZONTAL RULE ────────────────────────────────────── */}
          <hr style={{ border: "none", borderTop: "2px solid #BBBBBB", paddingInline: "12px", margin: "8px 0 0" }} />

          {/* ── THREE-COLUMN BODY ──────────────────────────────────── */}
          <div style={{ display: "flex", alignItems: "flex-start",}}>

            {/* LEFT – Services sidebar ─────────────────────────────── */}
            <div style={{ width: "152px", flexShrink: 0, paddingRight: "12px", paddingTop: "8px",
               }}>

              {([ 
                ["ORTHOCARE",    ["Joint pain","Cervical Pain","Low Back Ache"]],
                ["PANCHKARMA",   ["Detoxification","Rejuvenation","Kati Basti","Prishta Basti",
                                  "Janu Basti","Akshi Tarpana","Nasya","Abhyanga","Swedanam"]],
                ["GASTOCARE",    ["Acidity","Constipation","Liver Treatment"]],
                ["KIDNEY DISEASE", []],
                ["FACILITY",    branch.type === "clinic"
                                  ? ["OPD","Daycare"]
                                  : ["OPD","IPD","Daycare"]],
              ] as [string, string[]][]).map(([heading, items]) => (
                <div key={heading} style={{ marginBottom: "12px" }}>
                  <div style={{ fontWeight: "600", fontSize: "14px", 
                    color: "#111", marginBottom: "3px", fontFamily: "Montserrat, sans-serif" }}>
                    {heading}
                  </div>
                  {items.map((item) => (
                    <div key={item} style={{ fontSize: "13px",marginBottom: "6px", color: "#333", paddingLeft: "0",fontFamily: "Montserrat, sans-serif",
                      lineHeight: "1.65" }}>
                      {item}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* CENTRE – Patient info ───────────────────────────────── */}
            <div style={{ flex: 1, paddingLeft: "18px", paddingRight: "14px",
              paddingTop: "8px", borderLeft: "2px solid #BBBBBB" }}>

              {/* Name / parent */}
              <p style={{ margin: "0 0 2px", fontSize: "13px", fontFamily: "Montserrat, sans-serif", }}>
                Name: <span style={{fontWeight: "600"}}>{patient.patient}</span>
              </p>
              <p style={{ margin: "0 0 6px", fontSize: "13px", fontFamily: "Montserrat, sans-serif", }}>
                W/o,D/o,S/o: <span style={{fontWeight: "600"}}>{patient.parent_name}</span>
              </p>
              <p style={{ margin: "0 0 2px", fontSize: "13px", fontFamily: "Montserrat, sans-serif", }}>Chief Complaint</p>
              <p style={{ margin: "0 0 2px", fontSize: "13px", fontFamily: "Montserrat, sans-serif", }}>History</p>
              {isFemalePatientForPatientForm(patient.gender) ? (
                <p style={{ margin: "0 0 6px", fontSize: "13px", fontFamily: "Montserrat, sans-serif", }}>Menstrual History</p>
              ) : null}
              <p style={{ margin: "10px 0 10px", fontSize: "13px", fontFamily: "Montserrat, sans-serif", }}>
                Diagnosis: <span style={{fontWeight: "600"}}>{diagnosis}</span>
              </p>

              {/* Ashtavidha Pariksha */}
              <div style={{ fontSize: "13px",fontFamily: "Montserrat, sans-serif",marginTop: "16px" }}>
                <p style={{ margin: "0 0 8px" }}>अष्टविध परिक्षा</p>
                <p style={{ margin: "0 0 8px" }}>स्पर्श</p>
                <p style={{ margin: "0 0 8px" }}>शब्द</p>
                <p style={{ margin: "0 0 8px" }}>Face (आकृति)</p>
                <p style={{ margin: "0 0 8px" }}>Eye (दृष्टि)</p>
                <p style={{ margin: "0 0 8px" }}>Jiwha (जिह्वा)</p>
                <p style={{ margin: "0 0 8px" }}>Urine (मूत्र)</p>
                <p style={{ margin: "0 0 8px" }}>Stool (मल)</p>
                <p style={{ margin: "0 0 8px" }}>Nadi (वात, पित, कफ)</p>
                <p style={{ margin: "0 0 6px" }}>(Dash Vidha)</p>
              </div>

              {/* Dash Vidha numbered */}
              <div style={{ fontSize: "13px", lineHeight: "1.75", fontFamily: "Montserrat, sans-serif", marginTop: "16px"}}>
                {["Prakruti","Vikruti","Sara","Samhana","Pramana",
                  "Satmya","Satva","Aahar Shakti","Vaya","Vyayam Shakti"].map((v, i) => (
                  <p key={v} style={{ margin: "0 0 4px" }}>{i + 1}. {v}</p>
                ))}
              </div>

              {/* Vitals */}
              <div style={{ marginTop: "14px", fontSize: "13px", lineHeight: "1.75",fontFamily: "Montserrat, sans-serif", }}>
                <p style={{ margin: "0 0 2px" }}>Vitals:</p>
                <p style={{ margin: "0 0 2px" }}>B.P.: <span style={{fontWeight: "600"}}>{patient.bp}</span></p>
                <p style={{ margin: "0 0 2px" }}>Sugar Level: <span style={{fontWeight: "600"}}>{patient.sl}</span></p>
                <p style={{ margin: "0 0 2px" }}>Weight: <span style={{fontWeight: "600"}}>{patient.weight}</span></p>
                <p style={{ margin: "0 0 2px" }}>Height: <span style={{fontWeight: "600"}}>{patient.height}</span></p>
                <p style={{ margin: "0" }}>RBS.:</p>
              </div>
            </div>

            {/* RIGHT – Doctor & patient meta ─────────────────────── */}
            <div style={{ width: "175px", flexShrink: 0, paddingLeft: "14px", paddingTop: "8px" }}>
              <p style={{ margin: "0", fontWeight: "600", fontSize: "16px",fontFamily: "Montserrat, sans-serif",
                color: "#024317" }}>
                Dr. {doctor.name}
              </p>
              {doctor.education.map((e) => (
                <p key={e} style={{ margin: "0",marginTop: "-4px", fontSize: "13px",fontFamily: "Montserrat, sans-serif", }}>{e}</p>
              ))}
              <p style={{ margin: "2px 0 0", fontWeight: "600", fontSize: "13px", color: "#024317", fontFamily: "Montserrat, sans-serif", }}>
                Reg No.{doctor.reg_no ? " " + doctor.reg_no : ""}
              </p>

              <div style={{ marginTop: "14px", fontSize: "13px",fontFamily: "Montserrat, sans-serif", }}>
                <p style={{ margin: "0" }}>
                  UHID No.: <span style={{fontWeight: "600"}}>{patient.uhid}</span>
                </p>
                <p style={{ margin: "0" }}>
                  OPD No.: <span style={{fontWeight: "600"}}>{patient.opdId}</span>
                </p>
                <p style={{ margin: "0" }}>
                  Age: <span style={{fontWeight: "600"}}>{patient.age}</span>
                </p>
                <p style={{ margin: "0" }}>
                  Gender:{" "}
                  <span style={{ fontWeight: "600" }}>{formatGenderForPatientFormDisplay(patient.gender)}</span>
                </p>
                <p style={{ margin: "0", whiteSpace: "nowrap" }}>
                  Date: <span style={{fontWeight: "600"}}>{fmtDate}</span>
                </p>
              </div>
            </div>

          </div>{/* end three-col */}

          {/* ── NEXT CONSULTATION ──────────────────────────────────── */}
          <div style={{ textAlign: "end", marginTop: "30px", paddingTop: "8px",fontSize: "14px", fontWeight: "600",fontFamily: "Montserrat, sans-serif" }}>
            NEXT CONSULTATION DATE: .............................................................
          </div>

        </div>{/* end page 1 */}

        {/* ══════ PAGE BREAK ══════ */}
        <div style={{ pageBreakBefore: "always", breakBefore: "page" }} />

        {/* ══════ PAGE 2 – Medicine Care Plan ══════ */}
        <div style={{ ...BASE, padding: "36px 70px", maxWidth: "740px", margin: "0 auto" }}>

          <div style={{ textAlign: "center", fontSize: "20px", fontWeight: "600",fontFamily: "Montserrat, sans-serif",
            letterSpacing: "1px", marginBottom: "20px" }}>
            MEDICINE CARE PLAN
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", fontFamily: "Montserrat, sans-serif" }}>
            <thead>
              <tr>
                {["MEDICINE","BENEFITS","RISKS","ALTERNATIVES"].map((h) => (
                  <th key={h} style={{ border: "1px solid #dddddd", fontWeight: "500",padding: "12px", height: "45px",
                    fontSize: "12px",lineHeight: "18px", textAlign: "left",  verticalAlign: "middle",fontFamily: "Montserrat, sans-serif", }}>
                      <div style={{marginBottom: '12px'}}>{h}</div>
                    </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {[0,1,2,3].map((i) => (
                  <td key={i} style={{ border: "1px solid #dddddd", padding: "12px",
                    height: "300px", verticalAlign: "top", width: "25%" }} />
                ))}
              </tr>
            </tbody>
          </table>

          <ul style={{  marginTop: "8px", lineHeight: "2",fontSize: "12px",fontFamily: "Montserrat, sans-serif" }}>
            <li><strong>DO&apos;S -</strong> FOLLOW SHUDDHI ADVICE HEALTHY DIET &amp; LIFESTYLE,</li>
            <li><strong style={{ textDecoration: "none",fontFamily: "Montserrat, sans-serif", fontWeight: "600", borderBottom: "1px solid #000", paddingBottom: "8px" }}>(PATHYA)</strong>{" "}
              DAILY YOGA PRANAYAM, MORNING WALK</li>
            <li style={{ marginTop: "8px" }}><strong>DONT&apos;S -</strong> AVOID UNHEALTHY FOOD, LATE NIGHT DINNER,</li>
            <li><strong style={{ textDecoration: "none",fontFamily: "Montserrat, sans-serif", fontWeight: "600", borderBottom: "1px solid #000", paddingBottom: "8px" }}>(APATHYA)</strong>{" "}
              AVOID OVER EATING, HEAVY WORKOUT, AVOID NON-VEG, UNHYGIENIC PRODUCTS <br /> &amp; FRIED FOODS</li>
            <li style={{ marginTop: "8px" }}><strong style={{ textDecoration: "none",fontFamily: "Montserrat, sans-serif", fontWeight: "600", borderBottom: "1px solid #000", paddingBottom: "8px" }}>OUTCOME -</strong><br /><br /></li>
            <li style={{ marginTop: "8px" }}><strong style={{ textDecoration: "none",fontFamily: "Montserrat, sans-serif", fontWeight: "600", borderBottom: "1px solid #000", paddingBottom: "8px"}}>PREVENTIVE MEASURES -</strong><br /><br /></li>
            <li style={{ marginTop: "8px" }}>
              <strong style={{ textDecoration: "none",fontFamily: "Montserrat, sans-serif", fontWeight: "600", borderBottom: "1px solid #000", paddingBottom: "8px"}}>PATIENT CONSENT -</strong>
              <p style={{ fontSize: "12px", lineHeight: "1.8", marginTop: "6px" }}>
                डॉक्टर ने मुझे मेरी बीमारी और उसकी चिकित्सा के बारे में पूरी तरह से समझा दिया है।
                हम सब कुछ समझते हुए, हमारे मरीज़ अपनी चिकित्सा करवाना चाहते हैं और इसके लिए सहमति देते हैं।
              </p>
            </li>
          </ul>

          <div style={{ display: "flex", justifyContent: "space-between",
            marginTop: "50px", fontSize: "12px",fontFamily: "Montserrat, sans-serif" }}>
            <span>डॉक्टर के हस्ताक्षर: _______________</span>
            <span>मरीज़ के हस्ताक्षर: _______________</span>
          </div>

        </div>{/* end page 2 */}
      </div>{/* end printable */}
    </div>
  );
});

PatientCGHS.displayName = "PatientCGHS";

export default PatientCGHS;

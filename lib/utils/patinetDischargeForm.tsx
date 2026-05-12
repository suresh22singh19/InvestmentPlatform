"use client";
import React, { useRef, forwardRef, useImperativeHandle, useCallback } from "react";

const LOGO_SRC = "/images/jeenasikho_lifecare.jpeg";
// const TITLE_SRC = "/images/shuddhi_logo_old.png";
const TITLE_SRC = "/images/Shuddhi-gram-LOGO.png";
const assesment_SRC = "/images/assesment.jpg";
const black_logo_SRC = "/images/jeenasikho_lifecare_black.jpeg";

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

function asDisplay(value: string | undefined | null, fallback = "N/A"): string {
  const normalized = (value ?? "").trim();
  return normalized || fallback;
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const BASE_FONT: React.CSSProperties = {
  // fontFamily: "'Arial', 'Helvetica', sans-serif",
  fontSize: "11px",
  color: "#1a1a1a",
  lineHeight: "1.5",
};

const PAGE: React.CSSProperties = {
  ...BASE_FONT,
  padding: "28px 54px",
  maxWidth: "794px",
  margin: "0 auto",
  background: "#fff", 
  boxSizing: "border-box",
};

const PAGE_WITH_FOOTER: React.CSSProperties = {
  ...PAGE,
  height: "1122px",
  position: "relative",
  paddingBottom: "64px",
  overflow: "hidden",
};

function PageFooter({ pageNumber }: { pageNumber: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: "54px",
        right: "54px",
        bottom: "40px",
        borderTop: "1px solid #000000",
        paddingTop: "0px",
        textAlign: "right",
        fontSize: "11px",
        fontWeight: 600,
      }}
    >
    <div style={{fontSize: "13px", fontWeight: 600, paddingTop:"0px"}}>{pageNumber}</div>  
    </div>

    /* <hr style={{ border: "none",position: "absolute", bottom: "30px", left: "54px", right: "54px", borderTop: "1px solid #000000", paddingInline: "12px", marginTop: "auto" }} />
    <div style={{ position: "absolute", bottom: "30px", right: "54px", textAlign: "end", fontSize: "13px", fontWeight: "600", marginTop: "-2px" }}>
      {pageNumber}
    </div> */
    
  );
}

const DARK_BANNER: React.CSSProperties = {
  backgroundColor: "#000000",
  display: "block",
  color: "#fff",
  fontWeight: "800",
  fontSize: "15px",
  textAlign: "center",
  padding: "8px 12px",
  borderRadius: "10px",
  marginRight: "auto",
  marginLeft: "auto",
  lineHeight: "1.5",
};

// const DARK_BANNER: React.CSSProperties = {
//   background: "#1a1a1a",
//   display: "block",
//   width: "fit-content",
//   color: "#fff",
//   fontWeight: "700",
//   fontSize: "15px",
//   textAlign: "center",
//   height: "30px",
//   padding: "0px 2px",
//   margin: "10px auto",
//   borderRadius: "10px",
// };

const SECTION_LABEL: React.CSSProperties = {
  fontWeight: "700",
  fontSize: "16px",
  // textDecoration: "underline",
  margin: "10px 0 4px",
};

const TABLE_BASE: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "10px",
  marginBottom: "8px",
};

// const TH: React.CSSProperties = {
//   border: "1px solid #555",
//   background: "#e8e8e8",
//   fontWeight: "700",
//   padding: "4px 6px",
//   textAlign: "center",
//   fontSize: "10px",
// };

const TH: React.CSSProperties = {
  border: "1px solid #555",
  background: "#e8e8e8",
  fontWeight: "700",
  padding: "6px",
  textAlign: "center",
  verticalAlign: "middle", // ✅ important
  fontSize: "12px",
  height: "30px",          // ✅ gives space to center
};

const TD: React.CSSProperties = {
  border: "1px solid #555",
  padding: "4px 6px",
  fontSize: "13px",
  height: "22px",
};

// const EMPTY_ROWS = Array.from({ length: 9 });
const EMPTY_ROWS = Array.from({ length: 8 });

// ── Header block (reused on pages with logo) ──────────────────────────────────
// function HeaderBlock({ branch }: { branch: BranchInfo2 }) {
//   return (
//     <>
//       {/* ── HEADER ─────────────────────────────────────────────── */}
//       <div
//         style={{
//           display: "flex",
//           alignItems: "flex-start",
//           gap: "0px",
//           marginBottom: "8px",
//         }}
//       >
//         {/* Left Logo */}
//         <img
//           src={TITLE_SRC}
//           alt="JEENA SIKHO LIFECARE LTD"
//           style={{
//             width: "200px",
//             height: "auto",
//             // flexShrink: 0,
//           }}
//         />
     

//         {/* Company name + address block */}
//         <div
//           style={{
//             width: "100%",
//           }}
//         >
//           <div style={{ textAlign: "center" }}>
//             <img
//               src={LOGO_SRC}
//               alt="Jeena Sikho"
//               // style={{ maxWidth: "100%" }}
//               style={{ maxWidth: "500px" }}
//             />

//           </div>
//         </div>
//       </div>
//     </>
//   );
// }

// function HeaderBlock({ branch }: { branch: BranchInfo2 }) {
//   return (
//     <div
//       style={{
//         display: "flex",
//         alignItems: "center", // better vertical alignment
//         justifyContent: "space-between",
//         // marginBottom: "8px",
//       }}
//     >
//       {/* Left Logo */}
//       <div style={{ width: "200px" }}>
//       <img
//         src={TITLE_SRC}
//         alt="JEENA SIKHO LIFECARE LTD"
//         style={{
//           width: "200px",
//           height: "auto",
//         }}
//       />
//       </div>

//       {/* Right Logo */}
//       <div style={{ width: "500px" }}>
//       <img
//         src={LOGO_SRC}
//         alt="Jeena Sikho"
//         style={{
//           width: "500px", // control size instead of maxWidth
//           height: "auto",
//         }}
//       />  
//        <div
//                   style={{
//                     fontSize: "14px",
//                     marginTop: "4px",
//                     marginBottom: "12px",
//                     fontWeight: 500,
//                   }}
//                 >
//                   Pind Devinagar, Chandigarh Delhi Highway, Derabassi,
//                   Chandigarh, Punjab, S.A.S Nagar
//                   <br />
//                   PH. 9517714446
//                 </div>
//          </div>
        
//     </div>
//   );
// }

function HeaderBlock({ branch }: { branch: BranchInfo2 }) {
  return (
    <>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "10px",
        width: "100%",
        marginLeft: "-3px",
        marginTop: "-20px",
      }}
    >
      {/* LEFT LOGO */}
      <div style={{ marginLeft: "-20px" }}>
        <img
          src={TITLE_SRC}
          alt="JEENA SIKHO LIFECARE LTD"
          style={{
            width: "160px",
            height: "auto",
            display: "block",
          }}
        />
      </div>

      {/* RIGHT SIDE */}
      <div
        style={{
          flex: 1,              // ✅ takes remaining space
          textAlign: "center",
          marginRight: "16px",
        }}
      >
        {/* LOGO */}
        <img
          src={LOGO_SRC}
          alt="Jeena Sikho"
          style={{
            maxWidth: "100%",   // ✅ responsive instead of fixed 500px
            height: "auto",
            display: "block",
            margin: "0 auto",
          }}
        />

      </div>
    </div>
          {/* ADDRESS */}
       <div
          style={{
            fontSize: "14px",
            lineHeight: "1.4",
            fontWeight: 400,
            width: "74%",
            marginLeft:"auto",
            marginTop:"-42px",
            textAlign:"center",
            marginRight:"20px",
            color:"#444444"
          }}
        >
         Raj Ballav Dwar, Patna, PATNA,
          <br />
          PH.9525099000
        </div> 
        </>
  );
}

// ── Patient info bar (reused across pages 2-6) ────────────────────────────────
function PatientBar({ patient }: { patient: PatientInfo2 }) {
  return (
    <div style={{ display: "flex", gap: "34px", fontSize: "12px", borderBottom: "1px solid #000", paddingBottom: "5px", marginBottom: "8px" }}>
      {/* <span>Name: <strong>{patient.patient}</strong></span>
      <span>Age: <strong>{patient.age || "—"}</strong></span>
      <span>UHID No.: <strong>{patient.uhid || "—"}</strong></span>
      <span>Sex: <strong>{patient.gender || "—"}</strong></span> */}

      <span>Name: <strong>{asDisplay(patient.patient)}</strong></span>
      <span>Age: <strong>{asDisplay(patient.age)}</strong></span>
      <span>UHID No.: <strong>{asDisplay(patient.uhid)}</strong></span>
      <span>Sex: <strong>{asDisplay(patient.gender)}</strong></span>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
const PatientForm3 = forwardRef<PatientForm2Handle, PatientForm2Props>(function PatientForm2(
  { branch = DEMO_BRANCH, patient = DEMO_PATIENT, doctor = DEMO_DOCTOR, appointment = DEMO_APPOINTMENT, diagnosis = DEMO_DIAGNOSIS, showDownloadButton = true},ref
) {
  const printRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = useCallback(async () => {
    const html2pdf = (await import("html2pdf.js")).default;
    if (!printRef.current) return;
    await html2pdf()
      .set({
        margin: 0,
        filename: `patient_form3_${patient.uhid || "form"}.pdf`,
        image: { type: "jpeg", quality: 1 },
        html2canvas: { scale: 3, useCORS: true, letterRendering: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(printRef.current)
      .save();
  }, [patient.uhid]);

//   const handleDownloadPDF = useCallback(async () => {
//   const html2pdf = (await import("html2pdf.js")).default;

//   if (!printRef.current) return;

//   await document.fonts.ready;

//   await html2pdf()
//     .set({
//       margin: 0,
//       filename: `patient_form2_${patient.uhid || "form"}.pdf`,
//       image: {
//         type: "jpeg",
//         quality: 1,
//       },

//       html2canvas: {
//         scale: 3,
//         useCORS: true,
//         logging: false,
//       },

//       jsPDF: {
//         unit: "mm",
//         format: "a4",
//         orientation: "portrait",
//       },
//     })
//     .from(printRef.current)
//     .save();
// }, [patient.uhid]);

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
      <style>{`
          strong {
            font-weight: 800 !important;
          }
        `}</style>

        {/* ══════ PAGE 1 – Confidential Information ══════ */}
        <div style={PAGE_WITH_FOOTER}>
          <HeaderBlock branch={branch} />
          {/* <hr style={{ border: "none", borderTop: "2px solid #999", margin: "6px 0 0" }} /> */}
          <hr style={{ border: "none", borderTop: "1px solid #000", paddingInline: "12px", margin: "18px 0 4px 0" }}/>
       
          <div
            style={{
            display: "flex",
            fontSize: "12px",
            marginBottom: "10px",
            flexWrap: "wrap",
            paddingLeft : "20px",
            paddingBottom : "4px",
            }}
            >
            <span style={{ width: "100%", marginBottom: "12px", wordSpacing: "2px" }}>
                {/* Full Name: <strong>{patient.patient || "-"}</strong> */}
                Full Name: <strong>{asDisplay(patient.patient)}</strong>
            </span>

            <span style={{ marginRight:"40px" }}>
                {/* UHID NO: <strong>{patient.uhid || "-"}</strong> */}
                UHID NO: <strong>{asDisplay(patient.uhid)}</strong>
            </span>

            <span style={{ marginRight:"40px" }}>
                {/* Age: <strong>{patient.age || "-"}</strong> */}
                Age: <strong>{asDisplay(patient.age)}</strong>
            </span>

            <span>
                {/* Sex: <strong>{patient.gender || "-"}</strong> */}
                Sex: <strong>{asDisplay(patient.gender)}</strong>
            </span>
            </div>

          <h2 style={{ fontWeight: "800", fontSize: "22px", textAlign: "center", marginBottom: "16px" }}>
            Nutritional Assessment Form
          </h2>

          <div style={{ fontWeight: "700", fontSize: "15px", marginBottom: "8px" }}>
            Medical History (please give full details)
          </div>

          <PageFooter pageNumber={1} />
        </div>

        {/* ══════ PAGE 2 – Initial Assessment Form ══════ */}
        <div style={{ ...PAGE_WITH_FOOTER}}>
        <HeaderBlock branch={branch} />
        <hr style={{ border: "none", borderTop: "1px solid #000", paddingInline: "12px", margin: "18px 0 6px 0" }}/>
        <div
            style={{
            // backgroundColor: "#000",
            height: "20px",
            marginTop: "20px",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            marginBottom:"20px",
          }}
        >
          <span
            style={{
              backgroundColor: "#000",
              color: "#fff",
              padding: "0px 6px 16px 6px", // increased padding
              fontWeight: 800,
              fontSize: "15px",
              whiteSpace: "nowrap",
              lineHeight: "16px",
              borderRadius: "10px",
              display: "inline-block", // important for html2canvas
            }}
          >
            CONFIDENTIAL INFORMATION
          </span>
        </div>

          {/* Row 1 */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "4px", fontSize: "13px" }}>
            {/* <span>Name: <strong>{patient.patient}</strong></span> */}
             <span>Name: <strong>{asDisplay(patient.patient)}</strong></span>
            {/* <span style={{ marginLeft: "40px" }}>C/o / D/o / S/o: <strong>{patient.parent_name || "abcd"}</strong></span> */}
            <span style={{ marginLeft: "40px" }}>C/o / D/o / S/o: <strong>{asDisplay(patient.parent_name)}</strong></span>
            {/* <span style={{ marginLeft: "40px" }}>Age: <strong>{patient.age || "25"}</strong></span> */}
            <span style={{ marginLeft: "40px" }}>Age: <strong>{asDisplay(patient.age)}</strong></span>
          </div>
          {/* Row 2 */}
          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "4px", fontSize: "13px" }}>
            {/* <span>DOB_______________________</span> */}
            <span style={{ marginLeft: "0px" }}>Sex: <strong>{asDisplay(patient.gender)}</strong></span>
            <span style={{ marginLeft: "40px" }}>Occupation: <strong>{"Free"}</strong></span>
            <span style={{ marginLeft: "60px" }}>Religion: <strong>{""}</strong></span>
          </div>
          {/* Row 3 */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "4px", fontSize: "13px" }}>
            <span style={{ marginLeft: "0px" }}>Blood Group: <strong>{patient.bloodGroup || "O+"}</strong></span>
            {/* <span style={{ marginLeft: "76px" }}>DOM______________________________</span> */}
            <span style={{ marginLeft: "70px" }}>Address: <strong>{asDisplay(patient.address)}</strong></span>
          </div>
          {/* Row 4 */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "4px", fontSize: "13px" }}>
            <span>City: <strong>{asDisplay(patient.city)}</strong></span>
            <span style={{ marginLeft: "68px" }}>State: <strong>{asDisplay(patient.state)}</strong></span>
            {/* <span style={{ marginLeft: "56px" }}>Pin Code: <strong>{patient.pinCode || ""}</strong></span> */}
            <span style={{ marginLeft: "58px" }}>Pin Code: <strong>{asDisplay(patient.pinCode)}</strong></span>
            <span style={{ marginLeft: "20px" }}>Marital Status: <strong>{"Married"}</strong></span>
          </div>
          {/* Row 5 */}
          {/* <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "4px", fontSize: "13px" }}>
            <span style={{marginLeft:"0px"}}>Telephone: <strong>{patient.contactNumber || ""}</strong></span>
            <span style={{ marginLeft: "40px" }}>E-mail ID: <strong>{patient.emailAddress || ""}</strong></span>
            <span style={{ marginLeft: "40px" }}>Marital Status:<strong>{"MArried"}</strong></span>
          </div> */}
          {/* Row 6 */}
          {/* <div style={{ fontSize: "13px", marginBottom: "4px" }}>
            <span>Diet Pattern:<strong>{"Vegetarian"}</strong></span>
            <span style={{ marginLeft: "24px" }}>Addiction Habit:<strong>{"Alcohol"}</strong></span>
          </div> */}

          {/* <div style={DARK_BANNER}>INITIAL ASSESSMENT</div> */}
          <div 
            style={{
            marginTop:"26px", 
            backgroundColor: "#000000", 
            color: "#fff", 
            fontSize: "14px", 
            fontWeight: "800" , 
            paddingBottom:"12px", 
            paddingTop:"-6px", 
            paddingLeft:"10px", 
            paddingRight:"10px", 
            textAlign:"center"}}>
          <h4 
           style={{paddingTop:"-20px"}}>INITIAL ASSESSMENT</h4>
          </div>

          <div style={{ display: "flex", gap: "74px", fontSize: "13px", marginBottom: "10px", paddingBottom:"10px" }}>
            <span>UHID No.: <strong>{asDisplay(patient.uhid)}</strong></span>
            <span>OPD No.: <strong>{asDisplay(patient.opdId)}</strong></span>
            <span>Doctor: <strong>{asDisplay(doctor.name)}</strong></span>
          </div>

          {/* Initial Assessment table */}
          <table style={TABLE_BASE}>
            <thead>
              <tr style={{height:"10px"}}>
                {["DATE", "B.P", "PULSE", "SPO2.", "SUGAR", "WEIGHT", "REMARKS"].map((h) => (
                <th style={{...TD, marginBottom:"28px"}}>
                <div style={{height:"10px", display:"flex",fontSize:"14px", fontWeight:"700", alignItems:"center", justifyContent:"center" , marginBottom:"12px"}}>
                 {h}
                </div>
                </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* First row pre-filled */}
              <tr style={{height:"10px"}}>
                <td style={{...TD, marginBottom:"28px"}}>
                  <div style={{height:"10px", display:"flex", alignItems:"center", justifyContent:"center" , marginBottom:"12px"}}>
                  <strong>{dateStr}</strong>
                  </div>
                  </td>

                  <td style={{...TD, marginBottom:"28px"}}>
                  <div style={{height:"10px", display:"flex", alignItems:"center", justifyContent:"center" , marginBottom:"12px"}}>
                  <strong>{"s"}</strong>
                  </div>
                  </td>

                  <td style={{...TD, marginBottom:"28px"}}>
                  <div style={{height:"10px", display:"flex", alignItems:"center", justifyContent:"center" , marginBottom:"12px"}}>
                  <strong>{""}</strong>
                  </div>
                  </td>

                  <td style={{...TD, marginBottom:"28px"}}>
                  <div style={{height:"10px", display:"flex", alignItems:"center", justifyContent:"center" , marginBottom:"12px"}}>
                  <strong>{""}</strong>
                  </div>
                  </td>

                  <td style={{...TD, marginBottom:"28px"}}>
                  <div style={{height:"10px", display:"flex", alignItems:"center", justifyContent:"center" , marginBottom:"12px"}}>
                  <strong>{"d"}</strong>
                  </div>
                  </td>

                  <td style={{...TD, marginBottom:"28px"}}>
                  <div style={{height:"10px", display:"flex", alignItems:"center", justifyContent:"center" , marginBottom:"12px"}}>
                  <strong>{"50"}</strong>
                  </div>
                  </td>

                  <td style={{...TD, marginBottom:"28px"}}>
                  <div style={{height:"10px", display:"flex", alignItems:"center", justifyContent:"center" , marginBottom:"12px"}}>
                  <strong>{""}</strong>
                  </div>
                  </td>
              </tr>
              {/* {EMPTY_ROWS.map((_, i) => (
                <tr key={i} style={{height:"10px"}}>
                  {Array.from({ length: 1 }).map((__, j) => (
                    <td style={{...TD, marginBottom:"28px"}}>
                    <div style={{height:"10px", display:"flex", alignItems:"center", justifyContent:"center" , marginBottom:"12px"}}>
                    <strong>{""}</strong>
                    </div>
                    </td>
                  ))}
                </tr>
              ))} */}
            </tbody>
          </table>
          <PageFooter pageNumber={2} />
        </div>

        {/* ══════ PAGE 3 – Samanya Pariksha ══════ */}
        <div style={{ ...PAGE_WITH_FOOTER, paddingTop: "58px" }}>
          {/* <div style={{ fontWeight: "800", fontSize: "18px", marginBottom: "12px" }}>Samanya Pariksha</div> */}

          {/* <div
            style={{
            // backgroundColor: "#000",
            height: "20px",
            marginTop: "20px",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            marginBottom:"20px",
          }}
        >
          <span
            style={{
              backgroundColor: "#000",
              color: "#fff",
              padding: "0px 6px 16px 6px", // increased padding
              fontWeight: 800,
              fontSize: "15px",
              whiteSpace: "nowrap",
              lineHeight: "16px",
              borderRadius: "10px",
              display: "inline-block", // important for html2canvas
            }}
          >
            SAMANYA PARIKSHA
          </span>
        </div> */}

          <div 
            style={{
            backgroundColor: "#000000", 
            color: "#fff", 
            fontSize: "15px", 
            fontWeight: "800" , 
            paddingBottom:"16px", 
            paddingTop:"0px", 
            paddingLeft:"10px", 
            paddingRight:"10px", 
            textAlign:"start"
            
            }}>
          <h4 style={{paddingTop:"0px"}}>Samanya Pariksha</h4>
          </div>


          {/* <div style={{ fontSize: "13px", lineHeight: "1.8", marginBottom: "12px" }}>
            <div>1. Awastha</div>
            <div>2. Dosha</div>
            <div>3. Dushya</div>
            <div>4. Rog Marg</div>
            <div>5. Sadhiya/Asadhiya</div>
          </div> */}
          <div
            style={{
                fontSize: "14px",
                lineHeight: "1.8",
                marginBottom: "22px",
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                // gap: "8px 20px",
                columnGap: "20px", // gap between columns
                rowGap: "22px",   // gap between rows
            }}
            >
            <div>1. Awastha</div>
            <div>2. Dosha</div>
            <div>3. Dushya</div>
            <div>4. Rog Marg</div>
            <div>5. Sadhiya/Asadhiya</div>
            </div>
          <div 
            style={{
            backgroundColor: "#000000", 
            color: "#fff", 
            fontSize: "15px", 
            fontWeight: "800" , 
            paddingBottom:"16px", 
            paddingTop:"0px", 
            paddingLeft:"10px", 
            paddingRight:"10px", 
            textAlign:"start"
            
            }}>
          <h4 style={{paddingTop:"0px"}}>Dashvidh Pariksha</h4>
          </div>
          {/* {[
            "Prakriti (Physical constitution)",
            "Vikruti (Pathological Condition)",
            "Sara (excellence of tissues)",
            "Samhanana (body compactness)",
            "Pramana (measurements of body parts)",
            "Satmya (homologation)",
            "Sattva (mental constitution)",
            "Aharashakti (capacity to ingest food and digest and assimilate food)",
            "Vyayamashakti (capacity to exercise)",
            "Vaya (age)",
          ].map((item, index) => (
            <div key={item} style={{ fontSize: "13px", marginBottom: "8px" }}>
              {item}
              <span style={{ float: "right", minWidth: "30px", textAlign: "right" }}>{index + 1}.</span>
            </div>
          ))} */}
          <ul
                style={{
                    padding: 0,
                    margin: 0,
                    listStyle: "none",
                }}
                >
                    <div style={{ border: "1px solid #ccc", padding:"0px 20px 20px 20px" }}>
                    {[
                    "Prakriti (Physical constitution)",
                    "Vikruti (Pathological Condition)",
                    "Sara (excellence of tissues)",
                    "Samhanana (body compactness)",
                    "Pramana (measurements of body parts)",
                    "Satmya (homologation)",
                    "Sattva (mental constitution)",
                    "Aharashakti (capacity to ingest food and digest and assimilate food)",
                    "Vyayamashakti (capacity to exercise)",
                    "Vaya (age)",
                ].map((item, index) => (
                    <li
                    key={item}
                    style={{
                        fontSize: "14px",
                        marginBottom: "0px",
                        fontWeight: "400",
                        color: "#000",
                    }}
                    >
                       <span
                        style={{
                        minWidth: "30px",
                        textAlign: "left",
                        marginRight: "10px",
                        }}
                    >
                        {index + 1}.
                    </span>
                    <span>{item}</span>

                
                    </li>
                ))}
                    </div>
            
                </ul>
          <PageFooter pageNumber={3} />
        </div>

        {/* ══════ PAGE 4 – Patient's Full History ══════ */}
        <div style={{ ...PAGE_WITH_FOOTER, paddingTop: "58px" }}>
        <div
            style={{
            // backgroundColor: "#000",
            // height: "20px",
            // marginTop: "20px",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            marginBottom:"6px",
          }}
        >
          <span
            style={{
              backgroundColor: "#000",
              color: "#fff",
              padding: "0px 110px 28px 110px", // increased padding
              fontWeight: 700,
              fontSize: "30px",
              whiteSpace: "nowrap",
              lineHeight: "16px",
              borderRadius: "10px",
              display: "inline-block", // important for html2canvas
            }}
          >
            PATIENT'S FULL HISTORY
          </span>
        </div>
          <PatientBar patient={patient} />
          <PageFooter pageNumber={4} />
        </div>

        {/* ══════ PAGE 5 – Patient's Full History ══════ */}
        <div style={{ ...PAGE_WITH_FOOTER, paddingTop: "58px" }}>
          <PatientBar patient={patient} />
          <PageFooter pageNumber={5} />
        </div>

        {/* ══════ PAGE 6 – Remarks & Doctor Signature ══════ */}
        <div style={PAGE_WITH_FOOTER}>
          {/* <HeaderBlock branch={branch} /> */}

          <div
        style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "10px",
        width: "100%",
        marginLeft: "-3px",
        marginTop: "-20px",
      }}
    >
      {/* LEFT LOGO */}
      <div style={{ marginLeft: "-20px" }}>
        <img
          src={TITLE_SRC}
          alt="JEENA SIKHO LIFECARE LTD"
          style={{
            width: "160px",
            height: "auto",
            display: "block",
          }}
        />
      </div>

      {/* RIGHT SIDE */}
      <div
        style={{
          flex: 1,              // ✅ takes remaining space
          textAlign: "center",
          marginRight: "16px",
        }}
      >
        {/* LOGO */}
        <img
          src={black_logo_SRC}
          alt="Jeena Sikho"
          style={{
            maxWidth: "100%",   // ✅ responsive instead of fixed 500px
            height: "auto",
            display: "block",
            margin: "0 auto",
          }}
        />

  
      </div>
       </div>
          {/* ADDRESS */}
       <div
          style={{
            fontSize: "14px",
            lineHeight: "1.4",
            fontWeight: 500,
            width: "74%",
            marginLeft:"auto",
            marginTop:"-36px",
            textAlign:"center",
            marginRight:"20px",
            color:"#444444"
          }}
        >
         Raj Ballav Dwar, Patna, PATNA, BIHAR-801503
          <br />
          PH. 9517714446
        </div> 

          <hr style={{ border: "none", borderTop: "1px solid #000000", margin: "18px 0 24px 0" }} />
      
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "18px", fontWeight: "700" }}>
            <span style={{ fontSize: "20px", paddingLeft: "20px" }}>Remarks</span>

            <div style={{ fontSize: "12px", textAlign: "right",border: "1px solid #555", padding: "0px 34px 28px 34px", height: "70px" }}>
            <span>Doctor&apos;s Signature and Stamp</span>
            </div>
          </div>

           {/* <div style={{ display: "flex", gap: "80px", marginTop: "30px", verticalAlign: "start" }}>
             <div style={{ height:"80px", paddingTop:"0px", border: "1px solid #555", textAlign: "center", padding: "0px 24px 28px", fontSize: "12px", flex: 1}}>
              <strong>Doctor Signature</strong>
            </div>
            </div> */}
            
          <PageFooter pageNumber={6} />
        </div>

        {/* ══════ PAGE 7 – Patient's Full History ══════ */}
        <div style={{ ...PAGE_WITH_FOOTER, paddingTop: "58px" }}>
          <PatientBar patient={patient} />
          <PageFooter pageNumber={7} />
        </div>

        {/* ══════ PAGE 8 – Signatures ══════ */}
        <div style={PAGE_WITH_FOOTER}>
          <HeaderBlock branch={branch} />
          <hr style={{ border: "none", borderTop: "1px solid #000000", margin: "18px 0 24px 0" }} />
          {/* <div style={{ display: "flex", justifyContent: "space-between", marginTop: "18px", fontSize: "14px", fontWeight: "700" }}>
            <span>Doctor Signature</span>
            <span>Patient Signature</span>
          </div> */}

       
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "18px", fontWeight: "700" }}>
            <div style={{ fontSize: "12px", textAlign: "center",border: "1px solid #555", padding: "0px 80px 28px 80px", height: "70px" }}>
            <span>Doctor Signature</span>
            </div>

            <div style={{ fontSize: "12px", textAlign: "center",border: "1px solid #555", padding: "0px 80px 28px 80px", height: "70px" }}>
            <span>Patient Signature</span>
            </div>
          </div>
          <PageFooter pageNumber={8} />
        </div>

        {/* ══════ PAGE 9 – Patient Consent Form ══════ */}
        <div style={{ ...PAGE_WITH_FOOTER, paddingTop: "58px" }}>
          {/* <div style={{ fontSize: "10px", marginBottom: "3px" }}>
            Name: <strong>{patient.patient}</strong>
            <span style={{ marginLeft: "16px" }}>Age: <strong>{patient.age || "—"}</strong></span>
            <span style={{ marginLeft: "16px" }}>UHID No.: <strong>{patient.uhid}</strong></span>
            <span style={{ marginLeft: "16px" }}>Sex: <strong>{patient.gender || "—"}</strong></span>
          </div> */}
            <PatientBar patient={patient}/>
          {/* <hr style={{ border: "none", borderTop: "1px solid #999", margin: "4px 0 8px" }} /> */}
          {/* <hr style={{ border: "none", borderTop: "2px solid #000000", paddingInline: "12px", margin: "18px 0 6px 0" }}/> */}
          <div style={{ fontWeight: "800", fontSize: "13px", textAlign: "center", marginBottom: "0px" }}>
            PATIENT CONSENT FORM FOR CASE REPORTS
          </div>
          <div style={{ fontWeight: "700", fontSize: "13px", textAlign: "center", marginBottom: "10px",paddingTop: "-10px" }}>
            (मामले की रिपोर्ट के लिए रोगी सहमति फॉर्म)
          </div>

          <div style={{ fontSize: "12px", lineHeight: "1.4", marginBottom: "6px" }}>
            For a patient&apos;s consent to publication of information about them in a journal
          </div>
          <div style={{ fontSize: "12px", lineHeight: "1.4", marginBottom: "6px" }}>
            एक पत्रिका में उनके बारे में जानकारी के प्रकाशन के लिए एक रोगी की सहमति के लिए
          </div>

          {[
            ["Name of person described in article/लेख में वर्णित व्यक्ति का नाम", ""],
            ["Subject matter of photograph or article/तस्वीर या लेख का विषय", ""],
            ["Title of article/लेख का शीर्षक", ""],
            ["Medical practitioner or corresponding author/चिकित्सा व्यवसायी या संबंधित लेखक", ""],
          ].map(([label]) => (
            <div key={label as string} style={{ fontSize: "12px", marginBottom: "4px" }}>
              {label as string}______________________
            </div>
          ))}

          <div style={{ fontSize: "12px", lineHeight: "1.4", margin: "8px 0" }}>
            I_________________________[insert full name] give my consent for this information about MYSELF OR MY CHILD OR WARD/MY RELATIVE (insert full name]:______________________________ relating to the subject matter above ("the Information") to appear in a journal article, or to be used for the purpose of research.
          </div>

            <div style={{ fontWeight: "800", fontSize: "16px", textAlign: "center", margin: "-10px", marginBottom: "4px" }}>Or (या)</div>

          <div style={{ fontSize: "12px", lineHeight: "1.4", marginBottom: "8px" }}>
            म____________________[पूरा नाम डालें] इसके लिए मेरी सहमति दें 
            मेरे या मेरे बच्चे या वार्ड के रिश्तेदार के बारे में जानकारी (पूरा डालें नाम]:______________________________ उपरोक्त विषय वस्तु से संबंधित ("सूचना आयन") एक जर्नल लेख में दिखाई देते हैं, या अनुसंधान के उद्देश्य के लिए उपयोग किए जाते हैं।
          </div>


          <div style={{ fontWeight: "400", fontSize: "12px", marginBottom: "8px" }}>I understand the following/मैं निम्नलिखित समझता हूँ</div>

          <div style={{ fontSize: "12px", lineHeight: "1.8" }}>
            <p>1. The Information will be published without my name/child&apos;s name/relatives name attached and every attempt will be made to ensure anonymity. I understand, however, that complete anonymity cannot be guaranteed.</p>
            <p>2. The Information may be published in a journal which is read worldwide or an online journal. Journals are aimed mainly at health care professionals but may be seen by many non-doctors, including journalists.</p>
            <p>3. The Information may be placed on a website.</p>
            <p>4. I can withdraw my consent at any time before online publication, but once the Information has been committed to publication it will not be possible to withdraw the consent.</p>
          </div>

          <div style={{ fontWeight: "800", fontSize: "16px", textAlign: "center", margin: "-10px", marginTop: "2px", marginBottom: "4px" }}>Or (या)</div>

          <div style={{ fontSize: "13px", lineHeight: "1.8" }}>
          <p>
            सूचना मेरे नाम/बच्चे के नाम/रिश्तेदारों के नाम संलग्न किए बिना और
            प्रत्येक के बिना प्रकाशित की जाएगी गुमनामी सुनिश्चित करने का प्रयास
            किया जाएगा। हालाँकि, मैं समझता हूँ कि पूर्ण गुमनामी नहीं हो सकती
            गारंटी दी जाए। यह संभव है कि शायद कहीं कोई, उदाहरण के लिए, कोई
            व्यक्ति जिसने देखा हो मेरे बाद मेरा बच्चा/रिश्तेदार, अगर मैं अस्पताल
            में था, या कोई रिश्तेदार - मेरी पहचान कर सकता है।
            <br />
            2. सूचना को एक ऐसे जर्नल में प्रकाशित किया जा सकता है जिसे दुनिया भर
            में पढ़ा जाता है या एक ऑनलाइन जर्नल में। पत्रिकाओं मुख्य रूप से
            स्वास्थ्य देखभाल पेशेवरों के उद्देश्य से हैं, लेकिन कई गैर-डॉक्टरों
            द्वारा देखे जा सकते हैं, जिनमें शामिल हैं
            <br />
            3. सूचना को वेबसाइट पर डाला जा सकता है।
            <br />
            4. मैं ऑनलाइन प्रकाशन से पहले किसी भी समय अपनी सहमति वापस ले सकता
            हूं, लेकिन एक बार सूचना प्राप्त हो जाने के बाद प्रकाशन के लिए
            प्रतिबद्ध है तो सहमति वापस लेना संभव नहीं होगा।
          </p>
          </div>

          {/* <div style={{ display: "flex", gap: "16px", marginTop: "20px", fontSize: "14px" }}>
            <span>Patient Signature/रोगी के हस्ताक्षर_______________________</span>
            <span>Date/तारीख______________________</span>
          </div>
          <div style={{ fontSize: "12px", marginTop: "8px" }}>
            Medical Practitioner Signature/चिकित्सा व्यवसायी के हस्ताक्षर:____________Date/तारीख________________
          </div> */}

          <p style={{ fontSize: "14px", lineHeight: "1.4", marginTop: "20px"}}>
            Patient Signature/रोगी के हस्ताक्षर_______________________Date/तारीख______________________
            <br />
            Signature of requesting medical practitioner/health care worker/अनुरोध
            करने वाले चिकित्सक/स्वास्थ्य देखभाल कार्यकर्ता/के हस्ताक्षर
            <br />
            Medical Practitioner Signature/चिकित्सा व्यवसायी के हस्ताक्षर:____________Date/तारीख________________
          </p>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "40px", fontSize: "12px" }}>
            <span>Date:.....................................</span>
            <span>Signature(Patient/Guardian)</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "12px"}}>
            <span style={{marginRight: "100px"}} >Signature(Hospital Authority)</span>
            <span style={{marginRight: "50px"}}>Signature (MD/MS)</span>
          </div>

          <PageFooter pageNumber={9} />
        </div>

         {/* ══════ PAGE 10 – Feedback Form ══════ */}
         <div style={PAGE_WITH_FOOTER}>
          {/* <HeaderBlock branch={branch} /> */}

          <div
        style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "10px",
        width: "100%",
        marginLeft: "-3px",
        marginTop: "-20px",
      }}
    >
      {/* LEFT LOGO */}
      <div style={{ marginLeft: "-20px" }}>
        <img
          src={TITLE_SRC}
          alt="JEENA SIKHO LIFECARE LTD"
          style={{
            width: "160px",
            height: "auto",
            display: "block",
          }}
        />
      </div>

      {/* RIGHT SIDE */}
      <div
        style={{
          flex: 1,              // ✅ takes remaining space
          textAlign: "center",
          marginRight: "16px",
        }}
      >
        {/* LOGO */}
        <img
          src={black_logo_SRC}
          alt="Jeena Sikho"
          style={{
            maxWidth: "100%",   // ✅ responsive instead of fixed 500px
            height: "auto",
            display: "block",
            margin: "0 auto",
          }}
        />

  
      </div>
       </div>
          {/* ADDRESS */}
       <div
          style={{
            fontSize: "14px",
            lineHeight: "1.4",
            fontWeight: 500,
            width: "74%",
            marginLeft:"auto",
            marginTop:"-42px",
            textAlign:"center",
            marginRight:"20px",
            color:"#444444"
          }}
        >
          Raj Ballav Dwar, Patna, PATNA, BIHAR-801503
          <br />
          PH. 9517714446
        </div> 


          {/* <hr style={{ border: "none", borderTop: "2px solid #999", margin: "6px 0 8px" }} /> */}
          <hr style={{ border: "none", borderTop: "1px solid #000", margin: "20px 0 2px 0px" }} />

          <div style={{ fontWeight: "800", fontSize: "16px", textAlign: "center", marginBottom: "14px", letterSpacing: "0.5px" }}>
            FEEDBACK FORM
          </div>
          <div style={{ display: "flex", gap: "24px", fontSize: "12px", marginBottom: "18px" }}>
            {/* <span>Name: <strong>{patient.patient}</strong></span>
            <span style={{ marginLeft: "16px" }}>Age: <strong>{patient.age || "—"}</strong></span>
            <span style={{ marginLeft: "16px" }}>Gender: <strong>{patient.gender || "—"}</strong></span> */}

            {/* <span>Name: <strong>{patient.patient || "-"}</strong></span>
            <span style={{ marginLeft: "16px" }}>Age: <strong>{patient.age || "-"}</strong></span>
            <span style={{ marginLeft: "16px" }}>Gender: <strong>{patient.gender || "-"}</strong></span> */}

            <span>Name: <strong>{asDisplay(patient.patient)}</strong></span>
            <span style={{ marginLeft: "16px" }}>Age: <strong>{asDisplay(patient.age)}</strong></span>
            <span style={{ marginLeft: "16px" }}>UHID No.: <strong>{asDisplay(patient.uhid)}</strong></span>
            <span style={{ marginLeft: "16px" }}>Gender: <strong>{asDisplay(patient.gender)}</strong></span>

          </div>

          <div style={{ fontWeight: "700", fontSize: "14px", marginBottom: "10px" }}>Dear Sir/Madam, प्रिय महोदय/ महोदया</div>
          <div style={{ fontSize: "14px", lineHeight: "1.4", marginBottom: "16px" }}>
            We want to know your opinion. We would appreciate if you would spare us a moment of your valuable time in providing us your feedback regarding various aspects of medical care and hospitality that were extended to your stay here with us.
          </div>
          <p style={{ fontSize: "15px", lineHeight: "1.4", marginBottom: "24px" }}>
            हम आपकी राय जानना चाहते हैं हम आप की सराहना करेंगे अगर आप हमें अपने मूल्यवान समय का एकक्षण देंगे जो हमें आपकी चिकित्सा, देखभाल और आतिथ्य के विभिन्न पहलुओं के बारे में आप की प्रतिक्रिया प्रदान करने में मदद करता है।
            जो हमारे यहाँ इलाज के दौरान अनुभव किया।
         </p>


          {/* <div style={{ width: "80%" }}> */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "60px", fontSize: "12px" }}>
            <span>Date:.....................................</span>
            <span>Signature(Patient/Guardian)</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "12px"}}>
            <span style={{marginRight: "100px"}} >Signature(Hospital Authority)</span>
            <span style={{marginRight: "50px"}}>Signature (MD/MS)</span>
          </div>
          <PageFooter pageNumber={11} />
        </div>

        {/* ══════ PAGE 11 – COVID-19 Declaration ══════ */}
        <div style={PAGE_WITH_FOOTER}>
          {/* <HeaderBlock branch={branch} /> */}


          <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            width: "100%",
            marginLeft: "-3px",
            marginTop: "-20px",
          }}
        >
      {/* LEFT LOGO */}
      <div style={{ marginLeft: "-20px" }}>
        <img
          src={TITLE_SRC}
          alt="JEENA SIKHO LIFECARE LTD"
          style={{
            width: "160px",
            height: "auto",
            display: "block",
          }}
        />
      </div>

      {/* RIGHT SIDE */}
      <div
        style={{
          flex: 1,              // ✅ takes remaining space
          textAlign: "center",
          marginRight: "16px",
        }}
      >
        {/* LOGO */}
        <img
          src={black_logo_SRC}
          alt="Jeena Sikho"
          style={{
            maxWidth: "100%",   // ✅ responsive instead of fixed 500px
            height: "auto",
            display: "block",
            margin: "0 auto",
          }}
        />

  
      </div>
       </div>
          {/* ADDRESS */}
       <div
          style={{
            fontSize: "14px",
            lineHeight: "1.4",
            fontWeight: 500,
            width: "74%",
            marginLeft:"auto",
            marginTop:"-42px",
            textAlign:"center",
            marginRight:"20px",
            color:"#444444"
          }}
        >
       Raj Ballav Dwar, Patna, PATNA, BIHAR-801503
          <br />
          PH. 9517714446
        </div> 


          {/* <hr style={{ border: "none", borderTop: "2px solid #999", margin: "6px 0 8px" }} /> */}
          <hr style={{ border: "none", borderTop: "2px solid #000", margin: "20px 0 2px 0px" }} />

          <div style={{ fontWeight: "800", fontSize: "17px", textAlign: "center", marginBottom: "10px", letterSpacing: "0.5px", marginTop: "-10px" }}>
            COVID-19 MANDATORY SELF DECLARATION
          </div>

          <div style={{ display: "flex", gap: "24px", fontSize: "14px", marginBottom: "4px" }}>
            {/* <span>Name: <strong>{patient.patient}</strong></span>
            <span style={{ marginLeft: "16px" }}>Age: <strong>{patient.age || "—"}</strong></span>
            <span style={{ marginLeft: "16px" }}>Gender: <strong>{patient.gender || "—"}</strong></span> */}

            {/* <span>Name: <strong>{patient.patient || "-"}</strong></span>
            <span style={{ marginLeft: "16px" }}>Age: <strong>{patient.age || "-"}</strong></span>
            <span style={{ marginLeft: "16px" }}>Gender: <strong>{patient.gender || "-"}</strong></span> */}

            <span>Name: <strong>{asDisplay(patient.patient)}</strong></span>
            <span style={{ marginLeft: "16px" }}>Age: <strong>{asDisplay(patient.age)}</strong></span>
            <span style={{ marginLeft: "16px" }}>Gender: <strong>{asDisplay(patient.gender)}</strong></span>


          </div>
          <div style={{ fontSize: "14px", marginBottom: "4px" }}>
            Address: <strong>{addressFull || "N/A"}</strong>
          </div>
          <div style={{ fontSize: "14px", marginBottom: "10px" }}>
            Contact Number: <strong>{asDisplay(patient.contactNumber)}</strong>
          </div>

          <div style={{ fontSize: "12px", marginBottom: "8px", lineHeight: "1.2", marginTop: "12px" }}>
            Due to the ongoing and rapidly changing situation with the novel-corona virus (COVID-19), we are requiring all visitors to the Shuddhi Ayurveda Panchkarma Hospital ( A unit of Jeena Sikho Lifecare Ltd), Hospital to fill-out the self-declaration form below
          </div>

          <div style={{ fontWeight: "700", fontSize: "15px", marginBottom: "6px" }}>Do you have any of the following flu-like symptoms ?</div>

          <div style={{ fontSize: "12px", lineHeight: "1.4", marginTop: "3px" }}>
          I hereby assure that whatever informat ion I have provided is correct and true to the best of my knowledge. "If I am an
          asymptomatic carrier or an undiagnosed patient with covid-19, Iknow it may endanger doctors and Hospital staff. It is my
          responsibility to take appropriate precaution and to follow the protocols prescribed by them. Ialso know that" I may get an
          infection from the clinic or form a doctor and Iwill take every precaution to prevent this from happening but Iwill not at all
          hold Doctors and clinic staff accountable if such infection occurs to me or my accompanying persons.
          </div>

          <div style={{ textAlign: "right", fontWeight: "700", fontSize: "12px", marginTop: "40px" }}>Patient Signature</div>
          <PageFooter pageNumber={10} />
        </div>

       

        {/* ══════ PAGE 12 – Amount Sheet ══════ */}
        <div style={{...PAGE_WITH_FOOTER, paddingTop: "58px"}}>
          {/* <div style={{ fontWeight: "800", fontSize: "22px", textAlign: "center", marginBottom: "16px" }}>
            Amount Sheet
          </div>
          <table style={TABLE_BASE}>
            <thead>
              <tr>
                {["DATE", "AMOUNT", "DISCOUNT (%AGE)", "REC PAYMENT", "PAYMENT MODE"].map((h) => (
                  <th key={h} style={{ ...TH, background: "#fff", fontSize: "12px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 20 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} style={{ ...TD, height: "24px" }} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table> */}
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
                  textAlign: "center",
                  // borderCollapse: "separate",
                  // borderSpacing: "3px 3px",
                  borderCollapse : "collapse",
                  tableLayout: "fixed"
                }}
              >
                <tbody>
                  <tr>
                    <td style={{ border: "1px solid #222" , width: "11%", height: "50px", verticalAlign: "middle", textTransform: "uppercase", paddingTop: "0px", paddingBottom: "14px", fontSize: "14px"}}>Date</td>
                    <td style={{ border: "1px solid #222" , width: "18%", height: "50px", verticalAlign: "middle", textTransform: "uppercase", paddingTop: "0px", paddingBottom: "14px", fontSize: "14px"}}>Amount</td>
                    <td style={{ border: "1px solid #222" , width: "30%", height: "50px", verticalAlign: "middle", textTransform: "uppercase", paddingTop: "0px", paddingBottom: "14px", fontSize: "14px"}}>Discount (%AGE)</td>
                    <td style={{ border: "1px solid #222" , width: "20%", height: "50px", verticalAlign: "middle", textTransform: "uppercase", paddingTop: "0px", paddingBottom: "14px", fontSize: "14px"}}>REC Payment</td>
                    <td style={{ border: "1px solid #222" , width: "23%", height: "50px", verticalAlign: "middle", textTransform: "uppercase", paddingTop: "0px", paddingBottom: "14px", fontSize: "14px"}}>Payment Mode</td>
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
          <PageFooter pageNumber={12} />
        </div>

      </div>
    </div>
  );
});

PatientForm3.displayName = "PatientForm3";

export default PatientForm3;
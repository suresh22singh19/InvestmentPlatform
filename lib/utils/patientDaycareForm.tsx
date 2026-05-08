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

function asDisplay(value: string | null | undefined, fallback = "N/A"): string {
  const normalized = (value ?? "").trim();
  return normalized ? normalized : fallback;
}

function formatGenderDisplay(gender: string | undefined): string {
  const normalized = asDisplay(gender, "N/A");
  if (normalized === "N/A") return normalized;
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
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
            marginTop:"-36px",
            textAlign:"center",
            marginRight:"20px",
            color:"#444444"
          }}
        >
          Pind Devinagar, Chandigarh Delhi Highway, Derabassi,
          Chandigarh, Punjab, S.A.S NAGAR, PUNJAB-140507
          <br />
          PH. 9517714446
        </div> 
        </>
  );
}

// ── Patient info bar (reused across pages 2-6) ────────────────────────────────
function PatientBar({ patient }: { patient: PatientInfo2 }) {
  return (
    <div style={{ display: "flex", gap: "34px", fontSize: "12px", borderBottom: "1px solid #000", paddingBottom: "5px", marginBottom: "8px" }}>
      <span>Name: <strong>{asDisplay(patient.patient)}</strong></span>
      <span>Age: <strong>{asDisplay(patient.age)}</strong></span>
      <span>UHID No.: <strong>{asDisplay(patient.uhid)}</strong></span>
      <span>Sex: <strong>{formatGenderDisplay(patient.gender)}</strong></span>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
const PatientForm2 = forwardRef<PatientForm2Handle, PatientForm2Props>(function PatientForm2(
  { branch = DEMO_BRANCH, patient = DEMO_PATIENT, doctor = DEMO_DOCTOR, appointment = DEMO_APPOINTMENT, diagnosis = DEMO_DIAGNOSIS, showDownloadButton = true},ref
) {
  const printRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = useCallback(async () => {
    const html2pdf = (await import("html2pdf.js")).default;
    if (!printRef.current) return;
    await html2pdf()
      .set({
        margin: 0,
        filename: `patient_form2_${patient.uhid || "form"}.pdf`,
        image: { type: "jpeg", quality: 1 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
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
            font-weight: 600 !important;
          }
        `}</style>

        {/* ══════ PAGE 1 – Confidential Information ══════ */}
        <div style={PAGE}>
          <HeaderBlock branch={branch} />
          {/* <hr style={{ border: "none", borderTop: "2px solid #999", margin: "6px 0 0" }} /> */}
          <hr style={{ border: "none", borderTop: "2px solid #000000", paddingInline: "12px", margin: "18px 0 20px 0" }}/>

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
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "4px", fontSize: "13px" }}>
            <span>Name: <strong>{asDisplay(patient.patient)}</strong></span>
            <span style={{ marginLeft: "40px" }}>C/o / D/o / S/o: <strong>{asDisplay(patient.parent_name)}</strong></span>
            <span style={{ marginLeft: "40px" }}>Age: <strong>{asDisplay(patient.age)}</strong></span>
          </div>
          {/* Row 2 */}
          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "4px", fontSize: "13px" }}>
            <span>DOB_______________________</span>
            <span style={{ marginLeft: "0px" }}>Sex: <strong>{formatGenderDisplay(patient.gender)}</strong></span>
            <span style={{ marginLeft: "40px" }}>Occupation: <strong>{asDisplay("")}</strong></span>
            <span style={{ marginLeft: "40px" }}>Religion: <strong>{asDisplay("")}</strong></span>
          </div>
          {/* Row 3 */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "4px", fontSize: "13px" }}>
            <span style={{ marginLeft: "0px" }}>Blood Group: <strong>{asDisplay(patient.bloodGroup)}</strong></span>
            <span style={{ marginLeft: "76px" }}>DOM______________________________</span>
            <span style={{ marginLeft: "0px" }}>Address: <strong>{asDisplay(patient.address)}</strong></span>
          </div>
          {/* Row 4 */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "4px", fontSize: "13px" }}>
            <span>City: <strong>{asDisplay(patient.city)}</strong></span>
            <span style={{ marginLeft: "68px" }}>State: <strong>{asDisplay(patient.state)}</strong></span>
            <span style={{ marginLeft: "58px" }}>Pin Code: <strong>{asDisplay(patient.pinCode)}</strong></span>

          </div>
          {/* Row 5 */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "4px", fontSize: "13px" }}>
            <span style={{marginLeft:"0px"}}>Telephone: <strong>{asDisplay(patient.contactNumber)}</strong></span>
            <span style={{ marginLeft: "40px" }}>E-mail ID: <strong>{asDisplay(patient.emailAddress)}</strong></span>
            <span style={{ marginLeft: "40px" }}>Marital Status:<strong>{asDisplay("")}</strong></span>
          </div>
          {/* Row 6 */}
          <div style={{ fontSize: "13px", marginBottom: "4px" }}>
            <span>Diet Pattern:<strong>{asDisplay("")}</strong></span>
            <span style={{ marginLeft: "24px" }}>Addiction Habit:<strong>{asDisplay("")}</strong></span>
          </div>

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

          <div style={{ display: "flex", gap: "74px", fontSize: "13px", marginBottom: "8px", paddingBottom:"10px" }}>
            {/* <span>UHID No.: <strong>{patient.uhid}</strong></span>
            <span>OPD No.: <strong>{patient.opdId}</strong></span>
            <span>Doctor: <strong>{doctor.name}</strong></span> */}

            <span>UHID No.: <strong>{asDisplay(patient.uhid)}</strong></span>
            <span>OPD No.: <strong>{asDisplay(patient.opdId)}</strong></span>
            <span>Doctor: <strong>{asDisplay(doctor.name)}</strong></span>
          </div>

          {/* Initial Assessment table */}
          <table style={TABLE_BASE}>
            <thead>
              <tr style={{height:"10px"}}>
                {["DATE", "B.P", "PULSE", "SPO2.", "SUGAR", "WEIGHT", "REMARKS"].map((h) => (
                  // <th key={h} style={{...TH, fontSize:"14px", backgroundColor:"#fff", paddingBottom:"10px",marginTop:"-10px", paddingTop:"-10px"}}>{h}</th>
                //   <th
                //   key={h}
                //   style={{
                //     ...TH,
                //     fontSize: "14px",
                //     backgroundColor: "#fff",
                //     paddingBottom:"20px",marginTop:"-20px", paddingTop:"-10px"
                //   }}
                // >
                //   {h}
                // </th>

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



                {/* <td style={TD}><strong>{patient.bp || ""}</strong></td>
                <td style={TD}></td>
                <td style={TD}></td>
                <td style={TD}><strong>{patient.sl || ""}</strong></td>
                <td style={TD}><strong>{patient.weight || ""}</strong></td>
                <td style={TD}></td> */}
              </tr>
              {EMPTY_ROWS.map((_, i) => (
                <tr key={i} style={{height:"10px"}}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    // <td key={j} style={TD}></td>
                    <td style={{...TD, marginBottom:"28px"}}>
                    <div style={{height:"10px", display:"flex", alignItems:"center", justifyContent:"center" , marginBottom:"12px"}}>
                    <strong>{""}</strong>
                    </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ══════ PAGE BREAK ══════ */}
        <div style={{ pageBreakBefore: "always", breakBefore: "page" }} />

        {/* ══════ PAGE 2 – Patient's Full History ══════ */}
        <div style={{...PAGE, paddingTop:"58px"}}>
          {/* <div style={{ ...DARK_BANNER, fontSize: "16px", padding: "10px" }}>PATIENT&apos;S FULL HISTORY</div> */}

          {/* <div
          style={{
            height: "30px !important",
            background: "#000",
            display: "inline-block",
            // width: "90%",
            margin: "0 auto",
            borderRadius: "10px",
            fontWeight: "700",
            // padding: "10px 0",
            // display: "flex",
            // justifyContent: "center",
            // alignItems: "center",
          }}
        >
          <h3
            style={{
              color: "#fff",
              fontSize: "30px",
              margin: 0,
              border:"1px solid red",
            }}
          >
            PATIENT'S FULL HISTORY
          </h3>
        </div> */}


        {/* <div
          style={{
            height: "30px !important",
            background: "#000",
            display: "inline-block",
            margin: "0 auto",
            borderRadius: "10px",
            fontWeight: "700",
          }}
        >
          <h3
            style={{
              color: "#fff",
              fontSize: "30px",
              margin: 0,
              border:"1px solid red",
              zIndex: "1000",
            }}
          >
            PATIENT'S FULL HISTORY
          </h3>
          </div> */}

         <div
            style={{
            // backgroundColor: "#000",
            // height: "20px",
            // marginTop: "20px",
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
          <div style={{ fontSize: "15px", lineHeight: "1.2" }}>
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
        <div style={{...PAGE, paddingTop: "58px"}}>
          <PatientBar patient={patient} />

          <div style={{ fontSize: "12px", marginBottom: "6px" }}>
            <span>Family History :<strong>Father Name:</strong>,PH.:<span style={{ marginLeft: "8px" }}>/</span><strong>Mother Name:</strong>,PH.:<span style={{ marginLeft: "8px" }}>/</span><strong>Spouse Name:</strong>,PH.:</span>
          </div>
          <div style={{ fontSize: "12px", marginBottom: "14px" }}>Surgery / Procedure History:</div>
          <div style={{ fontSize: "12px", marginBottom: "30px" }}>धरण/कोडी :</div>

          {/* Symptoms table */}
          <table style={TABLE_BASE}>
            <thead>
              <tr style={{height:"10px"}}>
                <th style={{...TH,  width: "10%", fontSize: "14px", backgroundColor: "#fff", fontWeight: "400"}}>
                  <div style={{height:"10px", display:"flex", fontSize:"14px", fontWeight:"400", alignItems:"center", justifyContent:"center" , marginBottom:"12px"}}>
                  Visit
                  </div>
                </th>
                <th style={{...TH,  width: "25%", fontSize: "14px", backgroundColor: "#fff", fontWeight: "800"}}>
                  <div style={{height:"10px", display:"flex", fontSize:"14px", fontWeight:"800", alignItems:"center", justifyContent:"center" , marginBottom:"12px"}}>
                  Symptoms
                  </div>
                </th>
                <th style={{...TH,  width: "25%", fontSize: "14px", backgroundColor: "#fff", fontWeight: "800"}}>
                  <div style={{height:"10px", display:"flex", fontSize:"14px", fontWeight:"800", alignItems:"center", justifyContent:"center" , marginBottom:"12px"}}>
                  Duration
                  </div>
                </th>
                <th style={{...TH,  width: "20%", fontSize: "14px", backgroundColor: "#fff", fontWeight: "800"}}>
                  <div style={{height:"10px", lineHeight:"15px", display:"flex", fontSize:"14px", fontWeight:"800", alignItems:"center", justifyContent:"center" , marginBottom:"14px"}}>
                  Improvement Scoring
                  </div>
                </th>
                <th style={{...TH,  width: "20%", fontSize: "14px", backgroundColor: "#fff", fontWeight: "800"}}>
                  <div style={{height:"10px", display:"flex", fontSize:"14px", fontWeight:"800", alignItems:"center", justifyContent:"center" , marginBottom:"12px"}}>
                  Initial Score
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {/* {Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} style={{ ...TD, height: "28px" }}></td>
                  ))}
                </tr>
              ))} */}
            </tbody>
          </table>

          <div style={{...SECTION_LABEL, marginTop:"4px", marginBottom:"8px", fontSize:"14px", fontWeight:"800"}}>HISTORY OF PAST ILLNESS:</div>
          <table style={TABLE_BASE}>
            <thead>
              <tr style={{height:"16px"}}>
                <th style={{
                    ...TH,
                    width: "10%",
                    fontSize: "14px",
                    backgroundColor: "#fff",
                    fontWeight: "400",
                  }}>
                  <div style={{height:"16px", display:"flex", fontSize:"14px", fontWeight:"400", alignItems:"center", justifyContent:"center" , marginBottom:"12px"}}>
                  Visit
                  </div>
                </th> 
                <th style={{...TH,  width: "25%", fontSize: "14px", backgroundColor: "#fff", fontWeight: "800"}}>
                  <div style={{height:"16px", display:"flex", fontSize:"14px", fontWeight:"800", alignItems:"center", justifyContent:"center" , marginBottom:"12px"}}>
                  Disease
                  </div>
                </th>
                <th style={{...TH, width: "25%",fontSize: "14px", backgroundColor: "#fff", fontWeight: "800"}}>
                  <div style={{height:"16px", display:"flex", fontSize:"14px", fontWeight:"800", alignItems:"center", justifyContent:"center" , marginBottom:"12px"}}>
                  Duration
                  </div>
                </th>
                <th style={{...TH, width: "40%",  fontSize: "14px", backgroundColor: "#fff", fontWeight: "800"}}>
                  <div style={{height:"16px", display:"flex", fontSize:"14px", fontWeight:"800", alignItems:"center", justifyContent:"center" , marginBottom:"14px"}}>
                  Treatment / Pathy / Indication उपचार / पैथी / संकेत
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {/* {Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 4 }).map((__, j) => (
                    <td key={j} style={{ ...TD, height: "28px" }}></td>
                  ))}
                </tr>
              ))} */}
            </tbody>
          </table>

          <div style={{ fontSize: "12px", marginBottom: "16px" }}>Gynaec/Obs History:</div>
          <div style={{...SECTION_LABEL, marginBottom:"8px", fontSize:"13px", fontWeight:"800", textDecoration:"underline"}}>GASTROENTEROLOGY/ DIGESTION/EXCREATORY SYSTEM</div>
          {/* <div style={{ height: "24px" }} /> */}
          <div style={{...SECTION_LABEL, marginBottom:"24px", fontSize:"12px", fontWeight:"800", textDecoration:"underline"}}>Pulmonary System/cardiac System</div>
          {/* <div style={{ height: "24px" }} /> */}
          <div style={{...SECTION_LABEL, marginBottom:"8px", fontSize:"12px", fontWeight:"800", textDecoration:"underline"}}>Dermatological Examination</div>
          {/* <div style={{ height: "24px" }} /> */}
          <div style={{...SECTION_LABEL, marginBottom:"8px", fontSize:"12px", fontWeight:"800", textDecoration:"underline"} }>Nervous System Examination</div>
          {/* <div style={{ height: "24px" }} /> */}

          <div style={{marginBottom:"18px"}}>
          <div style={{ fontWeight: "800", fontSize: "14px", margin: "10px 0 8px" }}>INVESTIGATION (Blood / Urine Culture)</div>
          <table style={TABLE_BASE}>
            <thead>
              <tr style={{height:"8px"}}>
                <th style={{
                    ...TH,
                    width: "10%",
                    fontSize: "14px",
                    backgroundColor: "#fff",
                    fontWeight: "800",
                    height:"8px", 
                    paddingTop:"0px"
                  }}
                  >
                  <div style={{height:"8px",paddingTop:"0px", display:"flex", fontSize:"14px", fontWeight:"800", alignItems:"center", justifyContent:"center" , marginBottom:"10px"}}>
                  Visit
                  </div>
                </th>
                <th 
                style={{
                    ...TH,
                    width: "45%",
                    fontSize: "14px",
                    backgroundColor: "#fff",
                    fontWeight: "800",
                    height:"8px", 
                    paddingTop:"0px"
                  }}
                >
                  <div style={{height:"8px", paddingTop:"0px", display:"flex", fontSize:"14px", fontWeight:"800", alignItems:"center", justifyContent:"center" , marginBottom:"10px"}}>
                  Investigation
                  </div>
                </th>
                <th style={{
                    ...TH,
                    width: "45%",
                    fontSize: "14px",
                    backgroundColor: "#fff",
                    fontWeight: "800",
                    height:"8px", 
                    paddingTop:"0px"
                  }}
                  >
                  <div style={{height:"8px",paddingTop:"0px", display:"flex", fontSize:"14px", fontWeight:"800", alignItems:"center", justifyContent:"center" , marginBottom:"10px"}}>
                  Visit
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {/* {Array.from({ length: 3 }).map((_, j) => (
                  <td key={j} style={{ ...TD, height: "28px" }}></td>
                ))} */}
              </tr>
            </tbody>
          </table>
          </div>

        <div style={{marginBottom:"18px"}}>
          <table style={{...TABLE_BASE}}>
            <thead>
              <tr style={{height:"8px"}}>
                <th style={{
                    ...TH,
                    width: "10%",
                    fontSize: "14px",
                    backgroundColor: "#fff",
                    fontWeight: "800",
                    height:"8px", 
                    paddingTop:"0px"
                  }}>
                  <div style={{height:"8px",paddingTop:"0px", display:"flex", fontSize:"14px", fontWeight:"800", alignItems:"center", justifyContent:"center" , marginBottom:"10px"}}>
                  Visit
                  </div>
                </th>
                <th  style={{
                    ...TH,
                    width: "30%",
                    fontSize: "14px",
                    backgroundColor: "#fff",
                    fontWeight: "800",
                    height:"8px", 
                    paddingTop:"0px"
                  }}>
                  <div style={{height:"8px",paddingTop:"0px", display:"flex", fontSize:"14px", fontWeight:"800", alignItems:"center", justifyContent:"center" , marginBottom:"10px"}}>
                  RADIOLOGY
                  </div>
                </th>
                <th 
                style={{
                  ...TH,
                  fontSize: "14px",
                  backgroundColor: "#fff",
                  fontWeight: "800",
                  height:"8px", 
                  paddingTop:"0px"
                }}
                >
                <div style={{height:"8px",paddingTop:"0px", display:"flex", fontSize:"14px", fontWeight:"800", alignItems:"center", justifyContent:"center" , marginBottom:"10px"}}>
                FINDINGS
                </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {/* {Array.from({ length: 3 }).map((_, j) => (
                  <td key={j} style={{ ...TD, height: "28px" }}></td>
                ))} */}
              </tr>
            </tbody>
          </table>
          </div>

          <div style={{marginBottom:"18px"}}>
          <table style={TABLE_BASE}>
            <thead>
              <tr>
                <th style={{
                    ...TH,
                    width: "10%",
                    fontSize: "14px",
                    backgroundColor: "#fff",
                    fontWeight: "800",
                    height:"8px", 
                    paddingTop:"0px"
                  }}>
                  <div style={{height:"8px",paddingTop:"0px", display:"flex", fontSize:"14px", fontWeight:"800", alignItems:"center", justifyContent:"center" , marginBottom:"10px"}}>
                  Visit
                  </div>
                </th>
                <th style={{
                    ...TH,
                    width: "30%",
                    fontSize: "14px",
                    backgroundColor: "#fff",
                    fontWeight: "800",
                    height:"8px", 
                    paddingTop:"0px"
                  }}>
                  <div style={{height:"8px",paddingTop:"0px", display:"flex", fontSize:"14px", fontWeight:"800", alignItems:"center", justifyContent:"center" , marginBottom:"10px"}}>
                  Provisional Diagnosis
                  </div>
                </th>
                <th style={{
                    ...TH,
                    fontSize: "14px",
                    backgroundColor: "#fff",
                    fontWeight: "800",
                    height:"8px", 
                    paddingTop:"0px"
                  }}>
                  <div style={{height:"8px",paddingTop:"0px", display:"flex", fontSize:"14px", fontWeight:"800", alignItems:"center", justifyContent:"center" , marginBottom:"10px"}}>
                  Final Diagnosis
                  </div>
                </th>
                <th 
                style={{
                  ...TH,
                  fontSize: "14px",
                  backgroundColor: "#fff",
                  fontWeight: "800",
                  height:"8px", 
                  paddingTop:"0px"
                }}>
                <div style={{height:"8px",paddingTop:"0px", display:"flex", fontSize:"14px", fontWeight:"800", alignItems:"center", justifyContent:"center" , marginBottom:"10px"}}>
                Line of Treatment
                </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {/* {Array.from({ length: 4 }).map((_, j) => (
                  <td key={j} style={{ ...TD, height: "28px" }}></td>
                ))} */}
              </tr>
            </tbody>
          </table>
          </div>
        </div>

        {/* ══════ PAGE BREAK ══════ */}
        <div style={{ pageBreakBefore: "always", breakBefore: "page" }} />

        {/* ══════ PAGE 4 – Functional Evaluation ══════ */}
        <div style={{...PAGE, paddingTop: "58px"}}>
          <PatientBar patient={patient} />
          <div style={{ fontSize: "14px", marginBottom: "6px", textDecoration: "underline" }}>Functional Evaluation:</div>

          <div style={{ fontWeight: "700", fontSize: "12px", margin: "14px 0px 16px 0px", textDecoration:"underline", paddingBottom:"2px" }}>Balance disorders</div>
          <table style={{ ...TABLE_BASE, width: "45%" }}>
            <thead>
              <tr style={{height:"8px"}}>
                <th style={{...TH, height:"8px", fontSize: "12px", fontWeight: "800",backgroundColor: "#fff", padding:"0px !important"}}>
                  <div style={{height:"8px",paddingTop:"0px", display:"flex", fontSize:"12px", fontWeight:"800", alignItems:"center", justifyContent:"center" , marginBottom:"14px"}}>
                  Visit
                  </div>
                </th>
                <th style={{...TH, height:"8px", fontSize: "12px", fontWeight: "800",backgroundColor: "#fff", padding:"0px !important"}}>
                  <div style={{height:"8px",paddingTop:"0px", display:"flex", fontSize:"12px", fontWeight:"800", alignItems:"center", justifyContent:"center" , marginBottom:"14px"}}>
                  Sitting
                  </div>
                </th>
                <th style={{...TH, height:"8px", fontSize: "12px", fontWeight: "800",backgroundColor: "#fff", padding:"0px !important"}}>
                  <div style={{height:"8px",paddingTop:"0px", display:"flex", fontSize:"12px", fontWeight:"800", alignItems:"center", justifyContent:"center" , marginBottom:"14px"}}>
                  Standing
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {/* {Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 3 }).map((__, j) => (
                    <td key={j} style={{ ...TD, height: "28px" }}></td>
                  ))}
                </tr>
              ))} */}
            </tbody>
          </table>

          <div style={{ fontWeight: "700", fontSize: "14px", margin: "12px 0 4px" }}>Pain Scale:</div>
          <table style={TABLE_BASE}>  
              <tr style={{height:"8px"}}>
                {["Visit", "0 (No Pain)", "1-3 (Mild)", "4-6 (Moderate Severe)", "7-9 (Very Severe)", "10 (Worst Possible)"].map((h) => (
                  <th key={h} style={{...TH, height:"8px", padding:"0px", textAlign: "start", fontSize: "14px", fontWeight: "400",backgroundColor: "#fff"}}>
                    <div style={{height:"8px",paddingTop:"0px", display:"flex", fontSize:"14px", fontWeight:"400", alignItems:"center", justifyContent:"center" , marginBottom:"14px"}}>
                    {h}
                    </div>
                  </th>
                ))}
              </tr>
            
            <tbody>
              {/* {Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} style={{ ...TD, height: "28px" }}></td>
                  ))}
                </tr>
              ))} */}
            </tbody>
          </table>

          
          <table style={{width: "100%", borderCollapse: "collapse"}}>
            <tr>
              <td style={{ width:"50%"}}>
              <div style={{ fontWeight: "800", fontSize: "13px", textDecoration: "underline", margin: "12px 0 4px" }}>Coordination</div>
                <table style={{width: "50% !important", borderCollapse: "collapse"}}>
                  <tbody>
                    <tr>
                      <td style={{...TH, height:"8px", padding:"2px", fontSize: "11px", fontWeight: "400",backgroundColor: "#fff"}}>
                        <div style={{height:"8px",paddingTop:"0px", display:"flex", fontSize:"11px", fontWeight:"500", alignItems:"center", justifyContent:"center" , marginBottom:"14px"}}>
                        Visit
                        </div>
                      </td>
                      <td colSpan={2} style={{...TH, height:"8px", padding:"2px", fontSize: "11px", fontWeight: "400",backgroundColor: "#fff"}}>
                        <div style={{height:"8px",paddingTop:"0px", display:"flex", fontSize:"11px", fontWeight:"500", alignItems:"center", justifyContent:"center" , marginBottom:"14px"}}>
                        UPPER LIMBS
                        </div>
                      </td>
                      <td colSpan={2} style={{...TH, height:"8px", padding:"2px", fontSize: "11px", fontWeight: "400",backgroundColor: "#fff"}}>
                        <div style={{height:"8px",paddingTop:"0px", display:"flex", fontSize:"11px", fontWeight:"500", alignItems:"center", justifyContent:"center" , marginBottom:"14px"}}>
                        LOWER LIMBS
                        </div>
                      </td>
                      <td style={{...TH,height:"8px", padding:"2px", fontSize: "11px", fontWeight: "400",backgroundColor: "#fff"}}>
                        <div style={{height:"8px",paddingTop:"0px", display:"flex", fontSize:"11px", fontWeight:"500", alignItems:"center", justifyContent:"center" , marginBottom:"14px"}}>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{...TH,height:"8px", padding:"2px", fontSize: "11px", fontWeight: "400",backgroundColor: "#fff"}}>
                        <div style={{height:"8px",paddingTop:"0px", display:"flex", fontSize:"11px", fontWeight:"500", alignItems:"center", justifyContent:"center" , marginBottom:"14px"}}>
                        </div>
                      </td>
                      <td style={{...TH, height:"8px", padding:"2px", fontSize: "11px", fontWeight: "400",backgroundColor: "#fff"}}>
                        <div style={{height:"8px",paddingTop:"0px", display:"flex", fontSize:"11px", fontWeight:"500", alignItems:"center", justifyContent:"center" , marginBottom:"14px"}}>
                        Left
                        </div>
                      </td>
                      <td style={{...TH, height:"8px", padding:"2px", fontSize: "11px", fontWeight: "400",backgroundColor: "#fff"}}>
                        <div style={{height:"8px",paddingTop:"0px", display:"flex", fontSize:"11px", fontWeight:"500", alignItems:"center", justifyContent:"center" , marginBottom:"14px"}}>
                        Right
                        </div>
                      </td>
                      <td style={{...TH, height:"8px", padding:"2px", fontSize: "11px", fontWeight: "400",backgroundColor: "#fff"}}>
                        <div style={{height:"8px",paddingTop:"0px", display:"flex", fontSize:"11px", fontWeight:"500", alignItems:"center", justifyContent:"center" , marginBottom:"14px"}}>
                        Left
                        </div>
                      </td>
                      <td style={{...TH, height:"8px", padding:"2px", fontSize: "11px", fontWeight: "400",backgroundColor: "#fff"}}>
                        <div style={{height:"8px",paddingTop:"0px", display:"flex", fontSize:"11px", fontWeight:"500", alignItems:"center", justifyContent:"center" , marginBottom:"14px"}}>
                        Right
                        </div>
                      </td>
                      <td style={{...TH, height:"8px", padding:"2px", fontSize: "11px", fontWeight: "400",backgroundColor: "#fff"}}>
                        <div style={{height:"8px",paddingTop:"0px", display:"flex", fontSize:"11px", fontWeight:"500", alignItems:"center", justifyContent:"center" , marginBottom:"14px"}}>
                        comments
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
              <td style={{ width:"50%"}}>
                <div style={{width:"100%", height:"100%", display:"flex", justifyContent:"center", alignItems:"center"}}>
                 <img src={assesment_SRC} alt="assessment" style={{width:"100%", height:"100%", objectFit:"contain"}}/>
                </div>
              </td>
            </tr>
          </table>


          {/* <table style={TABLE_BASE}>
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
            </tbody>
          </table> */}
        </div>

        {/* ══════ PAGE BREAK ══════ */}
        <div style={{ pageBreakBefore: "always", breakBefore: "page" }} />

        {/* ══════ PAGE 5 – Panchkarma Treatment Plan ══════ */}
        <div style={{...PAGE, paddingTop:"58px"}}>
          <table style={{ ...TABLE_BASE, border: "1px solid #555" }}>
            <tbody>
              {/* Main heading */}
              <tr style={{height:"8px"}}>
                <td colSpan={5} style={{ ...TH, height:"10px", fontWeight: "500", backgroundColor: "#444544", color:"#fff", fontSize: "14px", textAlign: "center" }}>
                <div style={{height:"8px", display:"flex", alignItems:"center", justifyContent:"center" , marginBottom:"12px"}}>
                  PANCHKARMA TREATMENT PLAN
                  </div>
                </td>
              </tr>
  

              {/* POORVA KARMA */}
              <tr>
                <td colSpan={5} style={{ ...TD, background: "#444544", fontWeight: "500", color:"#fff", fontSize: "14px", padding: "6px", textAlign: "center" }}>
                <div style={{height:"8px", display:"flex", alignItems:"center", justifyContent:"center" , marginBottom:"12px"}}>
                  POORVA KARMA
                  </div>
                </td>
              </tr>
              <tr>
                {["Visit", "Days Medicine/Treatment", "Benefits, Risk", "Next follow up advice", "Next follow up date"].map((h) => (
                  <th key={h} style={{...TH, fontWeight: "400", fontSize: "14px", backgroundColor: "#fff"}}>
                    <div style={{height:"8px",paddingTop:"0px", display:"flex", fontSize:"14px", fontWeight:"400", alignItems:"center", justifyContent:"center" , marginBottom:"14px"}}>
                    {h}
                    </div>
                  </th>
                ))}
              </tr>
              {/* {Array.from({ length: 3 }).map((_, i) => (
                <tr key={`p${i}`}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} style={{ ...TD, height: "28px" }}></td>
                  ))}
                </tr>
              ))} */}
              {/* PRADHAN KARMA */}
              <tr>
                <td colSpan={5} style={{ ...TD, background: "#444544",color:"#fff", fontSize: "14px", fontWeight: "500", textAlign: "center" }}>
                <div style={{height:"8px", display:"flex", alignItems:"center", justifyContent:"center" , marginBottom:"12px"}}>
                  PRADHAN KARMA
                  </div>
                </td>
              </tr>
              <tr>
                {["Visit", "Days Medicine/Treatment", "Benefits, Risk", "Next follow up advice", "Next follow up date"].map((h) => (
                  <th key={h} style={{...TH, fontWeight: "400", fontSize: "14px", backgroundColor: "#fff"}}>
                    <div style={{height:"8px",paddingTop:"0px", display:"flex", fontSize:"14px", fontWeight:"400", alignItems:"center", justifyContent:"center" , marginBottom:"14px"}}>
                    {h}
                    </div>
                  </th>
                ))}
              </tr>
              {/* {Array.from({ length: 3 }).map((_, i) => (
                <tr key={`pr${i}`}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} style={{ ...TD, height: "28px" }}></td>
                  ))}
                </tr>
              ))} */}
              {/* PASCHAT KARMA */}
              <tr>
                <td colSpan={5} style={{ ...TD, background: "#444544",color:"#fff", fontSize: "14px", fontWeight: "500", textAlign: "center" }}>
                <div style={{height:"8px", display:"flex", alignItems:"center", justifyContent:"center" , marginBottom:"12px"}}>
                  PASCHAT KARMA
                  </div>
                </td>
              </tr>
              <tr>
                <th style={{...TH, fontWeight: "400", fontSize: "14px", backgroundColor: "#fff"}}>
                  <div style={{height:"8px",paddingTop:"0px", display:"flex", fontSize:"14px", fontWeight:"400", alignItems:"center", justifyContent:"center" , marginBottom:"14px"}}>
                  Visit
                  </div>
                </th>
                <th style={{ ...TH, fontWeight: "400", fontSize: "14px", backgroundColor: "#fff" }} colSpan={2}>
                  <div style={{height:"8px",paddingTop:"0px", display:"flex", fontSize:"14px", fontWeight:"400", alignItems:"center", justifyContent:"center" , marginBottom:"14px"}}>
                  Days Medicine/Treatment
                  </div>
                </th>
                <th style={{ ...TH, fontWeight: "400", fontSize: "14px", backgroundColor: "#fff" }} colSpan={2}>
                  <div style={{height:"8px",paddingTop:"0px", display:"flex", fontSize:"14px", fontWeight:"400", alignItems:"center", justifyContent:"center" , marginBottom:"14px"}}>
                  Benefits, Risk
                  </div>
                </th>
              </tr>
              {/* {Array.from({ length: 3 }).map((_, i) => (
                <tr key={`pa${i}`}>
                  <td style={{ ...TD, height: "28px" }}></td>
                  <td style={{ ...TD, height: "28px" }} colSpan={2}></td>
                  <td style={{ ...TD, height: "28px" }} colSpan={2}></td>
                </tr>
              ))} */}
              {/* PANCH KARMA */}
              <tr>
                <td colSpan={5} style={{ ...TD, background: "#444544", color:"#fff", fontSize: "14px", fontWeight: "500", textAlign: "center" }}>
                <div style={{height:"8px", display:"flex", alignItems:"center", justifyContent:"center" , marginBottom:"12px"}}>
                  PANCH KARMA
                  </div>
                </td>
              </tr>
              <tr>
                {["Visit", "Therapy", "Duration", "Daily/Alternate/No of days", "Therapist"].map((h) => (
                  <th key={h} style={{...TH, fontWeight: "400", fontSize: "14px", backgroundColor: "#fff"}}>
                    <div style={{height:"8px",paddingTop:"0px", display:"flex", fontSize:"14px", fontWeight:"400", alignItems:"center", justifyContent:"center" , marginBottom:"14px"}}>
                    {h}
                    </div>
                  </th>
                ))}
              </tr>
              {/* {Array.from({ length: 3 }).map((_, i) => (
                <tr key={`pk${i}`}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} style={{ ...TD, height: "28px" }}></td>
                  ))}
                </tr>
              ))} */}
            </tbody>
          </table>

          {/* TREATMENT */}
          <div style={{ fontWeight: "800", fontSize: "22px", textAlign: "center", margin: "12px 0 26px 0px" }}>TREATMENT:</div>
          {/* <div style={{ display: "flex", gap: "24px", fontSize: "10px", borderBottom: "1px solid #999", paddingBottom: "3px", marginBottom: "6px" }}>
            <span>Name: <strong>{patient.patient}</strong></span>
            <span>Age: <strong>{patient.age || "—"}</strong></span>
            <span>UHID No.: <strong>{patient.uhid || "—"}</strong></span>
            <span>Sex: <strong>{patient.gender || "—"}</strong></span>
          </div> */}

          <PatientBar patient={patient}/>

          <table style={TABLE_BASE}>
            <thead>
              <tr style={{height:"8px"}}>
                {["Visit", "Medicine", "QTY", "Dosage", "Frequency", "Days"].map((h,i) => (
                  <th key={h} style={{...TH,  width: i == 0 ? "40px" : "auto", height:"8px", padding:"2px", textAlign: "start", fontSize: "12px", fontWeight: "400",backgroundColor: "#fff"}}>
                    <div style={{ height:"8px",paddingTop:"0px", display:"flex", fontSize:"12px", fontWeight:"400", alignItems:"center", justifyContent:"center" , marginBottom:"14px"}}>
                    {h}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
        
            <tbody>
              {/* {Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} style={{ ...TD, height: "28px" }}></td>
                  ))}
                </tr>
              ))} */}
            </tbody>
          </table>

          {/* Diagnosis */}
          <div style={{ fontWeight: "800", fontSize: "22px", textAlign: "center", margin: "12px 0 26px 0px"  }}>Diagnosis:</div>
          <table style={TABLE_BASE}>
            <thead>
              <tr style={{height:"8px"}}>
                <th style={{...TH,height:"8px", width:"40px", padding:"2px", textAlign: "start", fontSize: "14px", fontWeight: "400",backgroundColor: "#fff"}}>
                    <div style={{height:"8px",paddingTop:"0px", display:"flex", fontSize:"14px", fontWeight:"400", alignItems:"center", justifyContent:"center" , marginBottom:"14px"}}>
                    Visit
                    </div>
                  </th>
                <th style={{...TH,height:"8px", padding:"2px", textAlign: "start", fontSize: "14px", fontWeight: "400",backgroundColor: "#fff"}}>
                    <div style={{height:"8px",paddingTop:"0px", display:"flex", fontSize:"14px", fontWeight:"400", alignItems:"center", justifyContent:"center" , marginBottom:"14px"}}>
                    Diagnosis
                    </div>
                  </th>
                <th style={{...TH,height:"8px", padding:"2px", textAlign: "start", fontSize: "14px", fontWeight: "400",backgroundColor: "#fff"}}>
                    <div style={{height:"8px",paddingTop:"0px", display:"flex", fontSize:"14px", fontWeight:"400", alignItems:"center", justifyContent:"center" , marginBottom:"14px"}}>
                    Sub Diagnosis
                    </div>
                  </th>
              </tr>
            </thead>
            <tbody>
              {/* {Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  <td style={{ ...TD, height: "28px" }}></td>
                  <td style={{ ...TD, height: "28px" }}>{i === 0 ? diagnosis : ""}</td>
                  <td style={{ ...TD, height: "28px" }}></td>
                </tr>
              ))} */}
            </tbody>
          </table>
        </div>

        {/* ══════ PAGE BREAK ══════ */}
        <div style={{ pageBreakBefore: "always", breakBefore: "page" }} />

        {/* ══════ PAGE 6 – Diet History ══════ */}
        <div style={{...PAGE, paddingTop:"58px"}}>
          <div style={{ fontWeight: "800", fontSize: "22px", textAlign: "center", margin: "0 0 18px 0px" }}>DIET HISTORY</div>
          {/* <div style={{ display: "flex", gap: "24px", fontSize: "10px", borderBottom: "1px solid #999", paddingBottom: "3px", marginBottom: "8px" }}>
            <span>Name: <strong>{patient.patient}</strong></span>
            <span>Age: <strong>{patient.age || "—"}</strong></span>
            <span>UHID No.: <strong>{patient.uhid || "—"}</strong></span>
            <span>Gender: <strong>{patient.gender || "—"}</strong></span>
          </div> */}
          <PatientBar patient={patient}/>
          <table style={TABLE_BASE}>
            <thead>
              <tr style={{height:"8px"}}>
                <th style={{ ...TH, height:"8px", padding:"2px", width: "40px", fontSize: "14px", fontWeight: "400",backgroundColor: "#fff"}}>
                    <div style={{height:"8px",paddingTop:"0px", display:"flex", fontSize:"14px", fontWeight:"400", alignItems:"center", justifyContent:"center" , marginBottom:"14px"}}>
                    Visit
                    </div>
                  </th>
                <th style={{ ...TH, height:"8px", padding:"2px", fontSize: "14px", fontWeight: "400",backgroundColor: "#fff"}}>
                    <div style={{height:"8px",paddingTop:"0px", display:"flex", fontSize:"14px", fontWeight:"400", alignItems:"center", justifyContent:"center" , marginBottom:"14px"}}>
                    Date
                    </div>
                  </th>
                <th style={{ ...TH, height:"8px", padding:"2px", fontSize: "14px", fontWeight: "400",backgroundColor: "#fff"}}>
                    <div style={{height:"8px",paddingTop:"0px", display:"flex", fontSize:"14px", fontWeight:"400", alignItems:"center", justifyContent:"center" , marginBottom:"14px"}}>
                    Diet Detail
                    </div>
                  </th>
              </tr>
            </thead>
            <tbody>
              {/* {Array.from({ length: 12 }).map((_, i) => (
                <tr key={i}>
                  <td style={{ ...TD, height: "28px" }}></td>
                  <td style={{ ...TD, height: "28px" }}></td>
                  <td style={{ ...TD, height: "28px" }}></td>
                </tr>
              ))} */}
            </tbody>
          </table>
        </div>

        {/* ══════ PAGE BREAK ══════ */}
        <div style={{ pageBreakBefore: "always", breakBefore: "page" }} />

        {/* ══════ PAGE 7 – Nutritional Assessment Form ══════ */}
        <div style={PAGE}>
          <HeaderBlock branch={branch} />
          {/* <hr style={{ border: "none", borderTop: "2px solid #999", margin: "6px 0 8px" }} /> */}

          <hr style={{ border: "none", borderTop: "2px solid #000000", paddingInline: "12px", margin: "18px 0 6px 0" }}/>

          <h2 style={{ fontWeight: "800", fontSize: "22px", textAlign: "center", marginBottom: "10px" }}>Nutritional Assessment Form</h2>

          <div style={{ fontWeight: "700", fontSize: "16px", marginBottom: "6px" }}>I. Identifying Information</div>
          <div style={{ display: "flex", gap: "48px", fontSize: "12px", marginBottom: "14px", marginLeft:"20px" }}>
            <span>Full Name: <strong>{asDisplay(patient.patient)}</strong></span>
            <span style={{ marginLeft: "20px" }}>Date :______________________</span>
          </div>
          {/* <div style={{ display: "flex", gap: "24px", fontSize: "11px", marginBottom: "8px" }}> */}
          <div style={{ display: "flex", gap: "20px", fontSize: "12px", marginBottom: "14px", marginLeft:"20px" }}>
            <span>UHID NO: <strong>{asDisplay(patient.uhid)}</strong></span>
            <span style={{ marginLeft: "40px" }}>Age: <strong>{asDisplay(patient.age)}</strong></span>
            <span style={{ marginLeft: "12px" }}>Sex: <strong>{formatGenderDisplay(patient.gender)}</strong></span>
          </div>
          <div style={{ fontSize: "12px", marginBottom: "14px" }}>Referring Clinician:</div>
          <div style={{ fontSize: "12px", marginBottom: "14px" }}>Reason(s) For Visit:</div>

          <div style={{ fontWeight: "800", fontSize: "16px", marginBottom: "0px" }}>II. Medical History (please give full details)</div>
          <ul style={{ margin: "0 0 10px 16px", fontSize: "13px", lineHeight: "1.4", paddingLeft: "30px" , paddingTop: "-10px"}}>
            <li>• Diabetes :</li>
            <li>• HTN :</li>
            <li>• CAD :</li>
            <li>• THYROID :</li>
            <li>• MENTRUAL :</li>
          </ul>

          {[
            "Are you allergic to any food or drink?",
            "Do you take any vitamins, minerals and/or food supplements?",
            "Have you had any major injuries, hospitalizations, or operations?",
            "Do you have any chronic illnesses?",
            "Do you take any medications on a regular basis?",
          ].map((q) => (
            <div key={q} style={{ fontSize: "12px",lineHeight: "2.4", marginBottom: "6px" }}>{q}</div>
          ))}

          <div style={{ fontWeight: "800", fontSize: "12px", marginBottom: "0px", marginTop: "6px" }}>Please explain about</div>
          <ul style={{ margin: "0 0 10px 16px", fontSize: "12px", lineHeight: "1.4",paddingLeft: "20px" , paddingTop: "-20px" }}>
            {["Appetite :", "Food habits :", "Daily working hours :", "Exercise :", "Job profile :", "Height :", "Weight :"].map((i) => (
              // <li key={i}>◦ {i}</li>
              <li key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "20px", lineHeight: 1, marginTop: "-8px" }}>◦</span>
              <span>{i}</span>
            </li>
            ))}
          </ul>

          {[
            "Have you ever been diagnosed or do you suffer from anxiety?",
            "Have you ever been diagnosed or do you suffer from depression?",
            "Have you ever been diagnosed or do you suffer from an eating disorder, such as, anorexia, bulimia, or binge eating?",
          ].map((q) => (
            <div key={q} style={{ fontSize: "12px",lineHeight: "2.4", marginBottom: "6px" }}>{q}</div>
          ))}

          <div style={{ display: "flex", gap: "80px", marginTop: "30px", verticalAlign: "start" }}>
            <div style={{ height:"80px", paddingTop:"0px", border: "1px solid #555", textAlign: "center", padding: "0px 24px 28px", fontSize: "12px", flex: 1}}>
              <strong>Doctor Signature</strong>
            </div>

            <div style={{ border: "1px solid #333", textAlign: "center", padding: "0px 24px 28px", fontSize: "12px", flex: 1}}>
              <strong>Patient Signature</strong>
            </div>
          </div>
        </div>

        {/* ══════ PAGE BREAK ══════ */}
        <div style={{ pageBreakBefore: "always", breakBefore: "page" }} />

        {/* ══════ PAGE 8 – Patient Consent Form ══════ */}
        <div style={{...PAGE, paddingTop:"58px"}}>
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

          <div style={{ fontSize: "12px", lineHeight: "1.8" }}>
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
        </div>

        {/* ══════ PAGE BREAK ══════ */}
        <div style={{ pageBreakBefore: "always", breakBefore: "page" }} />

        {/* ══════ PAGE 9 – COVID-19 Declaration ══════ */}
        <div style={PAGE}>
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
          Pind Devinagar, Chandigarh Delhi Highway, Derabassi,
          Chandigarh, Punjab, S.A.S NAGAR, PUNJAB-140507
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

            <span>Name: <strong>{asDisplay(patient.patient)}</strong></span>
            <span style={{ marginLeft: "16px" }}>Age: <strong>{asDisplay(patient.age)}</strong></span>
            <span style={{ marginLeft: "16px" }}>Gender: <strong>{formatGenderDisplay(patient.gender)}</strong></span>

          </div>
          <div style={{ fontSize: "14px", marginBottom: "4px" }}>
            Address: <strong>{addressFull ? addressFull : "N/A"}</strong>
          </div>
          <div style={{ fontSize: "14px", marginBottom: "10px" }}>
            Contact Number: <strong>{asDisplay(patient.contactNumber)}</strong>
          </div>

          <div style={{ fontSize: "12px", marginBottom: "8px", lineHeight: "1.2" }}>
            Due to the ongoing and rapidly changing situation with the novel-corona virus (COVID-19), we are requiring all visitors to the Shuddhi Ayurveda Panchkarma Hospital ( A unit of Jeena Sikho Lifecare Ltd), Hospital to fill-out the self-declaration form below
          </div>

          <div style={{ fontWeight: "700", fontSize: "15px", marginBottom: "6px" }}>Do you have any of the following flu-like symptoms ?</div>

          <table style={{ ...TABLE_BASE, width: "60%" }}>
            <tbody>
              {["Fever(बुखार)", "Dry Cough(सूखी खाँसी)", "Sore Throat(गला खराब होना)", "Diarrhea(दस्त)", "Breathlessness(सांस फूलना)", "Asthma(दमा)", "Other : Please specify(अन्य (कृपया निर्दिष्ट करें)"].map((s) => (
                <tr key={s} style={{height:"8px"}}>
                  <td style={{ height:"8px", paddingTop:"0px", paddingLeft:"4px", border: "1px solid #555", fontSize: "12px" }}>
                    <div style={{height:"8px",paddingTop:"0px", fontSize:"12px", fontWeight:"500" , marginBottom:"20px", marginTop:"0px", textAlign:"start"}}>
                    {s}
                    </div>
                  </td>
                  <td style={{ height:"8px", paddingTop:"0px", paddingLeft:"4px", border: "1px solid #555", fontSize: "12px", width: "80px" }}>
                    <div style={{height:"8px",paddingTop:"0px", fontSize:"12px", fontWeight:"500" , marginBottom:"20px", marginTop:"0px", textAlign:"start"}}>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* <div style={{ fontSize: "12px", lineHeight: "2.4", marginTop: "8px" }}>
            {[
              "• History of travel In the recent one month nationally and internationally?",
              "• Any contact history with a person who had returned from foreign country? If yes, please specify.",
              "• Purpose of your visit: For consultation, Patient attendant/other reason?",
              "• Have you come in contact with the covid-19 positive patient in last one month?",
              "• Have you attend any gathering or visited any crowded market place in the last 14 days? If yes, please specify.",
              "• Are you taking any precautionary measures for boosting your immunity prior to coming? If yes, please specify.",
              "• Kindly share your status of Aarogya Setu app? Red/Orange/Green. I hereby assure that whatever informat ion I have provided is correct and true to the best of my knowledge.",
            ].map((q) => <div key={q}>{q}</div>)}
          </div> */}

<div style={{ fontSize: "12px", marginTop: "8px" }}>
  {[
    "• History of travel In the recent one month nationally and internationally?",
    "• Any contact history with a person who had returned from foreign country? If yes, please specify.",
    "• Purpose of your visit: For consultation, Patient attendant/other reason?",
    "• Have you come in contact with the covid-19 positive patient in last one month?",
    "• Have you attend any gathering or visited any crowded market place in the last 14 days? If yes, please specify.",
    "• Are you taking any precautionary measures for boosting your immunity prior to coming? If yes, please specify.",
    "• Kindly share your status of Aarogya Setu app? Red/Orange/Green. I hereby assure that whatever information I have provided is correct and true to the best of my knowledge.",
  ].map((q, index, arr) => (
    <div
      key={q}
      style={{
        lineHeight: index === arr.length - 1 ? "normal" : "2.4",
        marginBottom: "6px",
      }}
    >
      {q}
    </div>
  ))}
</div>

          <div style={{ fontSize: "12px", lineHeight: "1.4", marginTop: "14px" }}>
          I hereby assure that whatever informat ion I have provided is correct and true to the best of my knowledge. "If I am an
          asymptomatic carrier or an undiagnosed patient with covid-19, Iknow it may endanger doctors and Hospital staff. It is my
          responsibility to take appropriate precaution and to follow the protocols prescribed by them. Ialso know that" I may get an
          infection from the clinic or form a doctor and Iwill take every precaution to prevent this from happening but Iwill not at all
          hold Doctors and clinic staff accountable if such infection occurs to me or my accompanying persons.
          </div>

          <div style={{ textAlign: "right", fontWeight: "700", fontSize: "12px", marginTop: "40px" }}>Patient Signature</div>
        </div>

        {/* ══════ PAGE BREAK ══════ */}
        <div style={{ pageBreakBefore: "always", breakBefore: "page" }} />

        {/* ══════ PAGE 10 – Feedback Form ══════ */}
        <div style={PAGE}>
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
          Pind Devinagar, Chandigarh Delhi Highway, Derabassi,
          Chandigarh, Punjab, S.A.S NAGAR, PUNJAB-140507
          <br />
          PH. 9517714446
        </div> 


          {/* <hr style={{ border: "none", borderTop: "2px solid #999", margin: "6px 0 8px" }} /> */}
          <hr style={{ border: "none", borderTop: "2px solid #000", margin: "20px 0 2px 0px" }} />

          <div style={{ fontWeight: "800", fontSize: "16px", textAlign: "center", marginBottom: "14px", letterSpacing: "0.5px" }}>
            FEEDBACK FORM
          </div>
          <div style={{ display: "flex", gap: "24px", fontSize: "12px", marginBottom: "18px" }}>
            {/* <span>Name: <strong>{patient.patient}</strong></span>
            <span style={{ marginLeft: "16px" }}>Age: <strong>{patient.age || "—"}</strong></span>
            <span style={{ marginLeft: "16px" }}>Gender: <strong>{patient.gender || "—"}</strong></span> */}

            <span>Name: <strong>{asDisplay(patient.patient)}</strong></span>
            <span style={{ marginLeft: "16px" }}>Age: <strong>{asDisplay(patient.age)}</strong></span>
            <span style={{ marginLeft: "16px" }}>Gender: <strong>{formatGenderDisplay(patient.gender)}</strong></span>

          </div>

          <div style={{ fontWeight: "700", fontSize: "14px", marginBottom: "10px" }}>Dear Sir/Madam, प्रिय महोदय/ महोदया</div>
          <div style={{ fontSize: "14px", lineHeight: "1.4", marginBottom: "16px" }}>
            We want to know your opinion. We would appreciate if you would spare us a moment of your valuable time in providing us your feedback regarding various aspects of medical care and hospitality that were extended to your stay here with us.
          </div>
          <p style={{ fontSize: "15px", lineHeight: "1.4", marginBottom: "24px" }}>
            हम आपकी राय जानना चाहते हैं हम आप की सराहना करेंगे अगर आप हमें अपने मूल्यवान समय का एकक्षण देंगे जो हमें आपकी चिकित्सा, देखभाल और आतिथ्य के विभिन्न पहलुओं के बारे में आप की प्रतिक्रिया प्रदान करने में मदद करता है।
            जो हमारे यहाँ इलाज के दौरान अनुभव किया।
         </p>

          <table style={TABLE_BASE}>
            <thead>
              <tr>
                <th style={{ ...TH,height:"8px", width: "40px", backgroundColor:"#fff", color:"#000", fontWeight: "700", fontSize: "13px", paddingTop:"0px" }}>
                  <div style={{paddingTop:"0px", fontSize:"13px", fontWeight:"700", alignItems:"center", justifyContent:"center" , marginBottom:"12px"}}>
                  S.No
                  </div>
                </th>
                <th style={{ ...TH, height:"8px",paddingTop:"0px",backgroundColor:"#fff", color:"#000", fontWeight: "700", fontSize: "13px" }}>
                  <div style={{paddingTop:"0px", fontSize:"13px", fontWeight:"700", alignItems:"center", justifyContent:"center" , marginBottom:"12px"}}>
                  Services/सेवाएं
                  </div>
                </th>
                <th style={{ ...TH,height:"8px",paddingTop:"0px", width: "170px", backgroundColor:"#fff", color:"#000", fontWeight: "700", fontSize: "13px" }}>
                  <div style={{paddingTop:"0px", fontSize:"13px", fontWeight:"700", alignItems:"center", justifyContent:"center" , marginBottom:"12px"}}>
                  Good/अच्छा, yes/हाँ<br />Not Good/अच्छा नहीं, No/नहीं
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {/* {[
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
                  <td style={{ ...TD, textAlign: "center", verticalAlign: "top" , fontSize: "13px" }}>{no as string}</td>
                  <td style={{ ...TD, lineHeight: "1.5", fontSize: "13px" }}>{text as string}</td>
                  <td style={TD}></td>
                </tr>
              ))} */}
              {[
                  [
                    "1.",
                    "Do you found, Time period spent on your assessment is sufficient or not?",
                    "आपकी जांच के लिए डॉक्टर के द्वारा दिया गया समय पर्याप्त है या नहीं",
                  ],
                  [
                    "2.",
                    "Explained about diagnosis and treatment?",
                    "निदान और उपचार के बारे में समझाया",
                  ],
                  [
                    "3.",
                    "How is work experience of staff?",
                    "कर्मचारियों का कार्य अनुभव कैसा है",
                  ],
                  [
                    "4.",
                    "During your problem did employee or staff respond you on time or not?",
                    "जब आप अपनी समस्या बताते हैं, तो कर्मचारी ठीक से सुनते हैं",
                  ],
                  [
                    "5.",
                    "Did staff treat you with dignity and respect?",
                    "क्या कर्मचारी आप से गरिमा और सम्मान के साथ व्यवहार करते हैं",
                  ],
                  [
                    "6.",
                    "How would you feel during treatment?",
                    "ईलाज के दौरान आपने कैसा अनुभव किया",
                  ],
                  [
                    "7.",
                    "Did you have confidence and trust in the staff?",
                    "क्या आप कर्मचारी के कार्य क्षमता से संतुष्ट हैं",
                  ],
                  [
                    "8.",
                    "What one thing would you change about the department?",
                    "इस विभाग में कोई एक भी ऐसी चीज जिस में आप सुधार चाहते हैं",
                  ],
                ].map(([no, eng, hindi]) => (
                  <tr key={no as string}>
                    <td
                      style={{
                        ...TD,
                        textAlign: "center",
                        verticalAlign: "top",
                        fontSize: "13px",
                        paddingTop:"0px",
                      }}
                    >
                      {no as string}
                    </td>

                    <td style={{ ...TD, fontSize: "13px", lineHeight: "1.5", paddingTop:"0px", paddingBottom:"12px" }}>
                      <div>{eng as string}</div>

                      <div
                        style={{
                          marginTop: "2px",
                          fontSize: "12px",
                        }}
                      >
                        {hindi as string}
                      </div>
                    </td>

                    <td style={{ ...TD, paddingTop:"0px" }}></td>
                  </tr>
                ))}
              <tr>
                <td colSpan={2} style={{ ...TD, fontWeight: "700", fontSize: "14px", paddingTop:"0px", paddingBottom:"12px" }}>Your comments / आपके सुझाव</td>
                <td style={{ ...TD, paddingTop:"0px", paddingBottom:"14px" }}></td>
              </tr>
            </tbody>
          </table>

          {/* <div style={{ width: "80%" }}> */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "30px", fontSize: "12px" }}>
            <span>Date:.....................................</span>
            <span>Signature(Patient/Guardian)</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "12px"}}>
            <span style={{marginRight: "100px"}} >Signature(Hospital Authority)</span>
            <span style={{marginRight: "50px"}}>Signature (MD/MS)</span>
          </div>
        </div>

        {/* <div style={{marginTop: "30px", fontSize: "12px", width:"60%" }}>
            <span>Date:.....................................</span>
            <span>Signature(Patient/Guardian)</span>
          </div>
          <div style={{marginTop: "8px", fontSize: "12px", width:"35%"}}>
            <span>Signature(Hospital Authority)</span>
            <span>Signature (MD/MS)</span>
          </div>
        </div> */}


        {/* </div> */}

      </div>
    </div>
  );
});

PatientForm2.displayName = "PatientForm2";

export default PatientForm2;
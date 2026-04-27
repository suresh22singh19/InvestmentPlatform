/**
 * Patient Report PDF Generator
 * Generates a 2-page PDF matching the Jeena Sikho Lifecare Report template.
 * Uses jsPDF with Noto Sans Devanagari font for Hindi text support.
 */

import jsPDF from "jspdf";

export interface PatientReportData {
  patientName: string;
  guardianLabel: string;
  guardianName: string;
  chiefComplaint: string;
  history: string;
  menstrualHistory: string;
  diagnosis: string;
  doctorName: string;
  doctorQualification: string;
  doctorRegNo: string;
  uhid: string;
  opdNo: string;
  age: string;
  gender: string;
  date: string;
  bloodPressure: string;
  sugarLevel: string;
  weight: string;
  height: string;
  rbs: string;
}

/** Show menstrual history line only for female patients (not male / unknown). */
function isFemalePatientForReport(gender: string): boolean {
  const g = (gender || "").trim().toLowerCase();
  if (!g) return false;
  if (g === "male" || g === "m" || g.startsWith("male")) return false;
  return g === "female" || g === "f" || g.startsWith("female");
}

/** Gender on PDF: first letter capital per word (male → Male, female → Female). */
function formatGenderForDisplay(gender: string): string {
  const raw = (gender || "").trim();
  if (!raw) return "";
  return raw
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Doctor line on PDF: always "Dr. {name}"; avoids "Dr. Dr." if API already sends a prefix. */
function formatDoctorNameForDisplay(name: string): string {
  const raw = (name || "").trim();
  if (!raw) return "";
  const withoutPrefix = raw.replace(/^(dr\.?|doctor)\s+/i, "").trim();
  return withoutPrefix ? `Dr. ${withoutPrefix}` : "Dr.";
}

// Sidebar treatment categories
const SIDEBAR_DATA = [
  {
    title: "ORTHOCARE",
    items: ["Joint pain", "Cervical Pain", "Low Back Ache"],
  },
  {
    title: "PANCHKARMA",
    items: [
      "Detoxification",
      "Rejuvenation",
      "Kati Basti",
      "Prishta Basti",
      "Janu Basti",
      "Akshi Tarpana",
      "Nasya",
      "Abhyanga",
      "Swedanam",
    ],
  },
  {
    title: "GASTOCARE",
    items: ["Acidity", "Constipation", "Liver Treatment"],
  },
  {
    title: "KIDNEY DISEASE",
    items: [],
  },
  {
    title: "FACILITY",
    items: ["OPD", "Daycare"],
  },
];

const DASH_VIDHA_LIST = [
  "Prakruti",
  "Vikruti",
  "Sara",
  "Samhana",
  "Pramana",
  "Satmya",
  "Satva",
  "Aahar Shakti",
  "Vaya",
  "Vyayam Shakti",
];

/**
 * Loads an image from a URL and returns it as a base64 data URL.
 */
const loadImage = (url: string): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = document.createElement("img");
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

/**
 * Loads a font file from the public folder and returns as base64 string.
 */
const loadFont = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch {
    return null;
  }
};

/**
 * Register the Noto Sans Devanagari font with jsPDF for Hindi text.
 */
const registerHindiFont = async (doc: jsPDF): Promise<boolean> => {
  const fontBase64 = await loadFont("/fonts/NotoSansDevanagari-Regular.ttf");
  if (!fontBase64) return false;

  doc.addFileToVFS("NotoSansDevanagari-Regular.ttf", fontBase64);
  doc.addFont("NotoSansDevanagari-Regular.ttf", "NotoSansDevanagari", "normal");

  const boldBase64 = await loadFont("/fonts/NotoSansDevanagari-Bold.ttf");
  if (boldBase64) {
    doc.addFileToVFS("NotoSansDevanagari-Bold.ttf", boldBase64);
    doc.addFont("NotoSansDevanagari-Bold.ttf", "NotoSansDevanagari", "bold");
  }

  return true;
};

/**
 * Helper to set Hindi font
 */
const setHindiFont = (doc: jsPDF, style: "normal" | "bold" = "normal") => {
  doc.setFont("NotoSansDevanagari", style);
};

/**
 * Helper to set English font
 */
const setEnglishFont = (doc: jsPDF, style: "normal" | "bold" = "normal") => {
  doc.setFont("helvetica", style);
};

/**
 * Generate and download the patient report PDF.
 */
export const generatePatientReportPDF = async (
  data: PatientReportData
): Promise<void> => {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const marginLeft = 15;
  const marginRight = 15;
  const contentWidth = pageWidth - marginLeft - marginRight;

  // Register Hindi font
  const hindiFontLoaded = await registerHindiFont(doc);

  // Colors
  const orangeColor: [number, number, number] = [231, 137, 18]; // #e78912
  const greenColor: [number, number, number] = [42, 88, 42]; // #2a582a
  const blackColor: [number, number, number] = [0, 0, 0];
  const darkGray: [number, number, number] = [51, 51, 51]; // #333
  const midGray: [number, number, number] = [85, 85, 85]; // #555
  const borderColor: [number, number, number] = [204, 204, 204]; // #ccc

  // Sidebar width (25% of content)
  const sidebarWidth = contentWidth * 0.25;
  const mainContentX = marginLeft + sidebarWidth + 2;
  const mainContentWidth = contentWidth - sidebarWidth - 2;

  // ==================== PAGE 1 ====================

  // --- HEADER ---
  let headerY = 12;

  // Load and add logo
  const logoData = await loadImage("/images/logo.png");
  const logoW = 35;
  const logoH = 13;
  if (logoData) {
    doc.addImage(logoData, "PNG", marginLeft, headerY - 5, logoW, logoH);
  }

  // Text area starts after logo with a gap, centered within the remaining space
  const textAreaStartX = marginLeft + logoW + 8;
  const textAreaWidth = contentWidth - logoW - 8;
  const textCenterX = textAreaStartX + textAreaWidth / 2;

  // Company name - centered, sized to match address line width
  setEnglishFont(doc, "bold");
  doc.setTextColor(orangeColor[0], orangeColor[1], orangeColor[2]);
  // Measure address line width at size 9 to match
  doc.setFontSize(9);
  setEnglishFont(doc, "normal");
  const addressText = "RZ-6A, Syndicate Enclave Dabri Mod, Dwarka, Delhi-110045, SOUTH WEST DELHI,";
  const addressWidth = doc.getTextWidth(addressText);
  // Calculate font size for company name to match that width
  setEnglishFont(doc, "bold");
  doc.setFontSize(10);
  const baseWidth = doc.getTextWidth("JEENA SIKHO LIFECARE LTD");
  const targetFontSize = Math.floor((addressWidth / baseWidth) * 10) + 1;
  doc.setFontSize(targetFontSize);
  doc.setTextColor(orangeColor[0], orangeColor[1], orangeColor[2]);
  doc.text("JEENA SIKHO LIFECARE LTD", textCenterX, headerY + 2, { align: "center" });

  // Address lines - centered
  doc.setFontSize(9);
  setEnglishFont(doc, "normal");
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text(
    "RZ-6A, Syndicate Enclave Dabri Mod, Dwarka, Delhi-110045, SOUTH WEST DELHI,",
    textCenterX,
    headerY + 9,
    { align: "center" }
  );
  doc.text("DELHI-110045", textCenterX, headerY + 14, { align: "center" });
  doc.text("PH.8860421234", textCenterX, headerY + 19, { align: "center" });

  headerY += 27;

  // Horizontal line below header
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.3);
  doc.line(marginLeft, headerY, marginLeft + contentWidth, headerY);

  // Vertical line for sidebar
  const sidebarLineX = marginLeft + sidebarWidth;
  doc.line(sidebarLineX, headerY, sidebarLineX, pageHeight - 15);

  // --- SIDEBAR ---
  let sidebarY = headerY + 7;

  SIDEBAR_DATA.forEach((section) => {
    doc.setFontSize(11);
    setEnglishFont(doc, "bold");
    doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
    doc.text(section.title, marginLeft + 0, sidebarY);
    sidebarY += 5;

    doc.setFontSize(9);
    setEnglishFont(doc, "normal");
    doc.setTextColor(68, 68, 68);
    section.items.forEach((item) => {
      doc.text(item, marginLeft + 0, sidebarY);
      sidebarY += 4.5;
    });
    sidebarY += 3;
  });

  // --- MAIN CONTENT ---
  let mainY = headerY + 6;

  // Doctor info column X position (with gap from patient info)
  const doctorInfoX = mainContentX + mainContentWidth * 0.62;

  // ---- Patient Info (left side) ----
  doc.setFontSize(10);
  doc.setTextColor(midGray[0], midGray[1], midGray[2]);
  setEnglishFont(doc, "normal");
  const nameLabel = "Name: ";
  const nameLabelWidth = doc.getTextWidth(nameLabel);
  doc.text(nameLabel, mainContentX, mainY);
  setEnglishFont(doc, "bold");
  doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
  // Wrap patient name within available width on the left column so it doesn't overlap other fields
  const nameX = mainContentX + nameLabelWidth;
  const nameMaxWidth = doctorInfoX - nameX - 4; // leave small gap before doctor column
  const nameLines = doc.splitTextToSize(data.patientName || "", Math.max(nameMaxWidth, 40)) as string[];
  nameLines.forEach((line: string, index: number) => {
    doc.text(line, nameX, mainY + index * 4.5);
  });
  mainY += 4.5 * nameLines.length + 1;

  setEnglishFont(doc, "normal");
  doc.setTextColor(midGray[0], midGray[1], midGray[2]);
  const guardianLabel = "W/o,D/o,S/o: ";
  const guardianLabelWidth = doc.getTextWidth(guardianLabel);
  doc.text(guardianLabel, mainContentX, mainY);
  setEnglishFont(doc, "bold");
  doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
  // Same wrap width as patient name — avoid overlapping doctor / Reg. No. column
  const guardianX = mainContentX + guardianLabelWidth;
  const guardianMaxWidth = doctorInfoX - guardianX - 4;
  const guardianLines = doc.splitTextToSize(
    data.guardianName || "",
    Math.max(guardianMaxWidth, 40)
  ) as string[];
  guardianLines.forEach((line: string, index: number) => {
    doc.text(line, guardianX, mainY + index * 4.5);
  });
  mainY += 4.5 * guardianLines.length + 1;

  setEnglishFont(doc, "normal");
  doc.setTextColor(midGray[0], midGray[1], midGray[2]);
  doc.text("Chief Complaint", mainContentX, mainY);
  mainY += 5;

  doc.text("History", mainContentX, mainY);
  mainY += 5;

  if (isFemalePatientForReport(data.gender)) {
    doc.text("Menstrual History", mainContentX, mainY);
  }
  // Reserve the same vertical space whether the line is shown (female) or not (male), so Diagnosis stays aligned
  mainY += 8;

  setEnglishFont(doc, "normal");
  doc.setTextColor(midGray[0], midGray[1], midGray[2]);
  const diagLabel = "Diagnosis: ";
  const diagLabelWidth = doc.getTextWidth(diagLabel);
  doc.text(diagLabel, mainContentX, mainY);
  setEnglishFont(doc, "bold");
  doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
  doc.text(data.diagnosis || "", mainContentX + diagLabelWidth, mainY);

  // ---- Doctor Info (right side) ----
  let doctorY = headerY + 6;

  doc.setFontSize(11);
  setEnglishFont(doc, "bold");
  doc.setTextColor(greenColor[0], greenColor[1], greenColor[2]);
  doc.text(formatDoctorNameForDisplay(data.doctorName), doctorInfoX, doctorY);
  doctorY += 5;

  doc.setFontSize(9);
  setEnglishFont(doc, "normal");
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text(data.doctorQualification || "BAMS", doctorInfoX, doctorY);
  doctorY += 4;

  setEnglishFont(doc, "bold");
  doc.setTextColor(greenColor[0], greenColor[1], greenColor[2]);
  doc.text("Reg No.", doctorInfoX, doctorY);
  doctorY += 8;

  // UHID, OPD, Age, Gender, Date
  const labelValuePairs = [
    { label: "UHID No.:", value: data.uhid },
    { label: "OPD No.:", value: data.opdNo },
    { label: "Age:", value: data.age },
    { label: "Gender:", value: formatGenderForDisplay(data.gender) },
    { label: "Date:", value: data.date },
  ];

  doc.setFontSize(9);
  labelValuePairs.forEach((pair) => {
    setEnglishFont(doc, "normal");
    doc.setTextColor(midGray[0], midGray[1], midGray[2]);
    const pairLabel = `${pair.label} `;
    doc.text(pairLabel, doctorInfoX, doctorY);
    doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
    doc.text(pair.value || "", doctorInfoX + doc.getTextWidth(pairLabel), doctorY);
    doctorY += 5;
  });

  // --- EXAMINATION SECTION ---
  mainY += 12;

  doc.setFontSize(10);
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);

  if (hindiFontLoaded) {
    // Hindi exam terms in Devanagari
    setHindiFont(doc, "normal");
    doc.text("\u0905\u0937\u094D\u091F\u0935\u093F\u0927 \u092A\u0930\u0940\u0915\u094D\u0937\u093E", mainContentX, mainY); // अष्टविध परीक्षा
    mainY += 5;
    doc.text("\u0938\u094D\u092A\u0930\u094D\u0936", mainContentX, mainY); // स्पर्श
    mainY += 5;
    doc.text("\u0936\u092C\u094D\u0926", mainContentX, mainY); // शब्द
    mainY += 5;

    // Exam items: English (Hindi)
    const examItems = [
      { english: "Face", hindi: "\u0906\u0915\u0943\u0924\u093F" }, // आकृति
      { english: "Eye", hindi: "\u0926\u0943\u0937\u094D\u091F\u093F" }, // दृष्टि
      { english: "Jiwha", hindi: "\u091C\u093F\u0935\u094D\u0939\u093E" }, // जिव्हा
      { english: "Urine", hindi: "\u092E\u0942\u0924\u094D\u0930" }, // मूत्र
      { english: "Stool", hindi: "\u092E\u0932" }, // मल
      { english: "Nadi", hindi: "\u0935\u093E\u0924, \u092A\u093F\u0924\u094D\u0924, \u0915\u092B" }, // वात, पित्त, कफ
    ];

    examItems.forEach((item) => {
      setEnglishFont(doc, "normal");
      doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
      const englishPart = `${item.english} (`;
      doc.text(englishPart, mainContentX, mainY);
      const englishWidth = doc.getTextWidth(englishPart);

      setHindiFont(doc, "normal");
      doc.text(item.hindi, mainContentX + englishWidth, mainY);
      const hindiWidth = doc.getTextWidth(item.hindi);

      setEnglishFont(doc, "normal");
      doc.text(")", mainContentX + englishWidth + hindiWidth, mainY);
      mainY += 5;
    });
  } else {
    // Fallback: transliterated
    setEnglishFont(doc, "normal");
    const fallbackTerms = [
      "Ashtavidh Pariksha", "Sparsh", "Shabd",
      "Face (Aakriti)", "Eye (Drishti)", "Jiwha (Jivha)",
      "Urine (Mutra)", "Stool (Mal)", "Nadi (Vaat, Pitta, Kapha)",
    ];
    fallbackTerms.forEach((term) => {
      doc.text(term, mainContentX, mainY);
      mainY += 5;
    });
  }

  // (Dash Vidha)
  setEnglishFont(doc, "normal");
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text("(Dash Vidha)", mainContentX, mainY);
  mainY += 6;

  // Numbered list 1-10
  doc.setFontSize(9);
  DASH_VIDHA_LIST.forEach((item, index) => {
    doc.text(`${index + 1}. ${item}`, mainContentX + 5, mainY);
    mainY += 4.5;
  });

  mainY += 5;

  // --- VITALS ---
  doc.setFontSize(10);
  setEnglishFont(doc, "normal");
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text("Vitals:", mainContentX, mainY);
  mainY += 5;

  // Always show these rows so layout stays consistent when vitals are missing
  const vitals = [
    { label: "B.P.:", value: data.bloodPressure },
    { label: "Sugar Level:", value: data.sugarLevel },
    { label: "Weight:", value: data.weight },
    { label: "Height:", value: data.height },
    { label: "RBS.:", value: data.rbs },
  ];

  doc.setFontSize(9);
  vitals.forEach((v) => {
    setEnglishFont(doc, "normal");
    doc.setTextColor(midGray[0], midGray[1], midGray[2]);
    const vLabel = `${v.label} `;
    doc.text(vLabel, mainContentX, mainY);
    doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
    doc.text(v.value || "", mainContentX + doc.getTextWidth(vLabel), mainY);
    mainY += 5;
  });

  // --- FOOTER (Next consultation date) - positioned at bottom of page ---
  doc.setFontSize(10);
  setEnglishFont(doc, "bold");
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  const nextConsultText =
    "NEXT CONSULTATION DATE: ..............................................................";
  const ncWidth = doc.getTextWidth(nextConsultText);
  const footerY = pageHeight - 20;
  doc.text(nextConsultText, marginLeft + contentWidth - ncWidth, footerY);

  // ==================== PAGE 2 ====================
  doc.addPage();

  let page2Y = 20;

  // Title: MEDICINE CARE PLAN
  doc.setFontSize(14);
  setEnglishFont(doc, "bold");
  doc.setTextColor(44, 62, 80); // #2c3e50
  const careTitle = "MEDICINE CARE PLAN";
  const careTitleWidth = doc.getTextWidth(careTitle);
  doc.text(careTitle, (pageWidth - careTitleWidth) / 2, page2Y);
  page2Y += 12;

  // Table: Medicine | Benefits | Risks | Alternatives
  const tableHeaders = ["MEDICINE", "BENEFITS", "RISKS", "ALTERNATIVES"];
  const colWidth = contentWidth / 4;
  const tableHeaderHeight = 10;
  const tableRowHeight = 80;

  doc.setDrawColor(153, 153, 153); // #999
  doc.setLineWidth(0.3);

  // Draw header row
  doc.setFontSize(10);
  setEnglishFont(doc, "bold");
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);

  tableHeaders.forEach((header, i) => {
    const x = marginLeft + i * colWidth;
    doc.rect(x, page2Y, colWidth, tableHeaderHeight);
    doc.text(header, x + 3, page2Y + 7);
  });
  page2Y += tableHeaderHeight;

  // Draw empty body row
  tableHeaders.forEach((_, i) => {
    const x = marginLeft + i * colWidth;
    doc.rect(x, page2Y, colWidth, tableRowHeight);
  });
  page2Y += tableRowHeight + 12;

  // --- DO'S ---
  doc.setFontSize(10);
  setEnglishFont(doc, "bold");
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);

  const dosLabel = "DO'S - ";
  doc.text(dosLabel, marginLeft, page2Y);
  const dosLabelWidth = doc.getTextWidth(dosLabel);
  setEnglishFont(doc, "normal");
  doc.text("FOLLOW SHUDDHI ADVICE HEALTHY DIET & LIFESTYLE,", marginLeft + dosLabelWidth, page2Y);
  page2Y += 6;

  setEnglishFont(doc, "bold");
  const pathyaLabel = "(PATHYA) ";
  doc.text(pathyaLabel, marginLeft, page2Y);
  const pathyaWidth = doc.getTextWidth(pathyaLabel.trim());
  doc.line(marginLeft, page2Y + 0.5, marginLeft + pathyaWidth, page2Y + 0.5);
  setEnglishFont(doc, "normal");
  doc.text("DAILY YOGA PRANAYAM, MORNING WALK", marginLeft + doc.getTextWidth(pathyaLabel), page2Y);
  page2Y += 10;

  // --- DONT'S ---
  setEnglishFont(doc, "bold");
  const dontsLabel = "DONT'S - ";
  doc.text(dontsLabel, marginLeft, page2Y);
  const dontsLabelWidth = doc.getTextWidth(dontsLabel);
  setEnglishFont(doc, "normal");
  doc.text("AVOID UNHEALTHY FOOD, LATE NIGHT DINNER,", marginLeft + dontsLabelWidth, page2Y);
  page2Y += 6;

  setEnglishFont(doc, "bold");
  const apathyaLabel = "(APATHYA) ";
  doc.text(apathyaLabel, marginLeft, page2Y);
  const apathyaWidth = doc.getTextWidth(apathyaLabel.trim());
  doc.line(marginLeft, page2Y + 0.5, marginLeft + apathyaWidth, page2Y + 0.5);
  setEnglishFont(doc, "normal");
  doc.text(
    "AVOID OVER EATING, HEAVY WORKOUT, AVOID NON-VEG, UNHYGIENIC PRODUCTS & FRIED",
    marginLeft + doc.getTextWidth(apathyaLabel),
    page2Y
  );
  page2Y += 5;
  doc.text("FOODS", marginLeft, page2Y);
  page2Y += 10;

  // --- OUTCOME ---
  setEnglishFont(doc, "bold");
  const outcomeText = "OUTCOME -";
  doc.text(outcomeText, marginLeft, page2Y);
  const outcomeWidth = doc.getTextWidth(outcomeText);
  doc.line(marginLeft, page2Y + 0.5, marginLeft + outcomeWidth, page2Y + 0.5);
  page2Y += 10;

  // --- PREVENTIVE MEASURES ---
  const prevText = "PREVENTIVE MEASURES -";
  doc.text(prevText, marginLeft, page2Y);
  const prevWidth = doc.getTextWidth(prevText);
  doc.line(marginLeft, page2Y + 0.5, marginLeft + prevWidth, page2Y + 0.5);
  page2Y += 12;

  // --- PATIENT CONSENT ---
  setEnglishFont(doc, "bold");
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  const consentTitle = "PATIENT CONSENT -";
  doc.text(consentTitle, marginLeft, page2Y);
  const consentTitleWidth = doc.getTextWidth(consentTitle);
  doc.line(marginLeft, page2Y + 0.5, marginLeft + consentTitleWidth, page2Y + 0.5);
  page2Y += 7;

  // Consent text in Hindi
  doc.setFontSize(9);
  if (hindiFontLoaded) {
    setHindiFont(doc, "bold");
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    // डॉक्टर ने मुझे मेरी बीमारी और उसकी चिकित्सा के बारे में पूरी तरह से समझा दिया है।
    doc.text(
      "\u0921\u0949\u0915\u094D\u091F\u0930 \u0928\u0947 \u092E\u0941\u091D\u0947 \u092E\u0947\u0930\u0940 \u092C\u0940\u092E\u093E\u0930\u0940 \u0914\u0930 \u0909\u0938\u0915\u0940 \u091A\u093F\u0915\u093F\u0924\u094D\u0938\u093E \u0915\u0947 \u092C\u093E\u0930\u0947 \u092E\u0947\u0902 \u092A\u0942\u0930\u0940 \u0924\u0930\u0939 \u0938\u0947 \u0938\u092E\u091D\u093E \u0926\u093F\u092F\u093E \u0939\u0948\u0964",
      marginLeft,
      page2Y
    );
    page2Y += 5;
    // हम सब कुछ समझते हुए, हमारे मरीज़ अपनी चिकित्सा करवाना चाहते हैं और इसके लिए सहमति देते हैं।
    doc.text(
      "\u0939\u092E \u0938\u092C \u0915\u0941\u091B \u0938\u092E\u091D\u0924\u0947 \u0939\u0941\u090F, \u0939\u092E\u093E\u0930\u0947 \u092E\u0930\u0940\u091C\u093C \u0905\u092A\u0928\u0940 \u091A\u093F\u0915\u093F\u0924\u094D\u0938\u093E",
      marginLeft,
      page2Y
    );
    page2Y += 5;
    doc.text(
      "\u0915\u0930\u0935\u093E\u0928\u093E \u091A\u093E\u0939\u0924\u0947 \u0939\u0948\u0902 \u0914\u0930 \u0907\u0938\u0915\u0947 \u0932\u093F\u090F \u0938\u0939\u092E\u0924\u093F \u0926\u0947\u0924\u0947 \u0939\u0948\u0902\u0964",
      marginLeft,
      page2Y
    );
  } else {
    setEnglishFont(doc, "normal");
    doc.text(
      "Doctor ne mujhe meri bimari aur uski chikitsa ke bare mein puri tarah se samjha diya hai.",
      marginLeft,
      page2Y
    );
    page2Y += 5;
    doc.text(
      "Hum sab kuch samajhte hue, hamare mariz apni chikitsa karvana chahte hain aur iske liye",
      marginLeft,
      page2Y
    );
    page2Y += 5;
    doc.text("sahmati dete hain.", marginLeft, page2Y);
  }

  page2Y += 20;

  // --- SIGNATURES ---
  doc.setFontSize(10);
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);

  if (hindiFontLoaded) {
    setHindiFont(doc, "normal");
    // डॉक्टर के हस्ताक्षर:
    doc.text(
      "\u0921\u0949\u0915\u094D\u091F\u0930 \u0915\u0947 \u0939\u0938\u094D\u0924\u093E\u0915\u094D\u0937\u0930:",
      marginLeft,
      page2Y
    );
    // मरीज़ के हस्ताक्षर:
    const patSigText = "\u092E\u0930\u0940\u091C\u093C \u0915\u0947 \u0939\u0938\u094D\u0924\u093E\u0915\u094D\u0937\u0930:";
    const patSigWidth = doc.getTextWidth(patSigText);
    doc.text(
      patSigText,
      marginLeft + contentWidth - patSigWidth,
      page2Y
    );
  } else {
    setEnglishFont(doc, "normal");
    doc.text("Doctor ke hastakshar:", marginLeft, page2Y);
    const patSigFallback = "Mariz ke hastakshar:";
    doc.text(
      patSigFallback,
      marginLeft + contentWidth - doc.getTextWidth(patSigFallback),
      page2Y
    );
  }

  // --- SAVE PDF ---
  const safeFileName = (data.patientName || "Patient")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim();
  doc.save(`${safeFileName}_Form.pdf`);
};

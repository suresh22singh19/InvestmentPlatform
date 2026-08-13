// "use client";

// import Image from "next/image";
// import { useEffect, useState } from "react";
// import {
//   BackToPreviousPageButton,
//   Badge,
//   Button,
//   Dialog,
//   FormSelectField,
//   FormTextareaField,
//   MessageDialog,
//   Tooltip,
// } from "@/components/ui";

// export type MedicationSchedulePatient = {
//   patientName: string;
//   patientUhid: string;
//   age: string;
//   gender: string;
//   bedNumber: string;
//   diagnosis: string;
//   admissionDate: string;
//   statusLabel?: string;
// };

// type MarStatus = "administered" | "due-now" | "overdue" | "scheduled";

// type MarMedicineItem = {
//   name: string;
//   dosage: string;
// };

// type MarTag = {
//   label: string;
//   tone: "warning" | "danger";
//   tooltip?: string;
// };

// type MarCard = {
//   id: string;
//   status: MarStatus;
//   medicineCountLabel: string;
//   nurseName?: string;
//   medicines: MarMedicineItem[];
//   moreCount?: number;
//   timeLabel?: string;
//   timePrefix?: string;
//   showWarning?: boolean;
//   tag?: MarTag;
//   medicationLabel?: string;
//   dosageLabel?: string;
//   scheduledTime?: string;
// };

// const ADMINISTER_DOSE_STATUS_OPTIONS = [
//   { label: "Completed", value: "Completed" },
//   { label: "Missed", value: "Missed" },
//   { label: "Refused", value: "Refused" },
//   { label: "Cancelled", value: "Cancelled" },
//   { label: "Wasted", value: "Wasted" },
// ];

// const MAR_COLUMNS: Array<{ id: string; time: string; period: string }> = [
//   { id: "morning", time: "08:00", period: "Morning" },
//   { id: "late-morning", time: "10:00", period: "Late Morning" },
//   { id: "noon", time: "12:00", period: "Noon" },
//   { id: "afternoon", time: "14:00", period: "Afternoon" },
//   { id: "evening", time: "18:00", period: "Evening" },
//   { id: "dinner", time: "20:00", period: "Dinner" },
//   { id: "night", time: "22:00", period: "Night" },
// ];

// const MAR_ROWS: Array<Record<string, MarCard | null>> = [
//   {
//     morning: {
//       id: "r1-morning",
//       status: "administered",
//       medicineCountLabel: "1 Medicine",
//       nurseName: "Nurse Prachi Arora",
//       medicines: [{ name: "Paracetamol", dosage: "650mg • 1 Tablet" }],
//       timeLabel: "08:15 AM",
//     },
//     "late-morning": {
//       id: "r1-late-morning",
//       status: "due-now",
//       medicineCountLabel: "4 Medicine",
//       medicines: [
//         { name: "Paracetamol", dosage: "650mg • 1 Tablet" },
//         { name: "Vitamin D3", dosage: "60k IU • 1 Capsule" },
//       ],
//       moreCount: 2,
//       showWarning: true,
//       tag: { label: "Wasted", tone: "warning", tooltip: "Patient refused medication." },
//       medicationLabel: "Amoxicillin 500mg",
//       dosageLabel: "2 Tablets • Oral • After Food",
//       scheduledTime: "24 May 2026, 10:00 AM",
//     },
//     noon: null,
//     afternoon: {
//       id: "r1-afternoon",
//       status: "administered",
//       medicineCountLabel: "1 Medicine",
//       nurseName: "Nurse Prachi Arora",
//       medicines: [{ name: "Paracetamol", dosage: "650mg • 1 Tablet" }],
//       timeLabel: "08:15 AM",
//     },
//     evening: {
//       id: "r1-evening",
//       status: "due-now",
//       medicineCountLabel: "2 Medicine",
//       medicines: [
//         { name: "Paracetamol", dosage: "650mg • 1 Tablet" },
//         { name: "Vitamin D3", dosage: "60k IU • 1 Capsule" },
//       ],
//       medicationLabel: "Amoxicillin 500mg",
//       dosageLabel: "2 Tablets • Oral • After Food",
//       scheduledTime: "24 May 2026, 06:00 PM",
//     },
//     dinner: null,
//     night: {
//       id: "r1-night",
//       status: "scheduled",
//       medicineCountLabel: "1 Medicine",
//       nurseName: "Nurse Prachi Arora",
//       medicines: [{ name: "Chyawanprash", dosage: "2 Spoons" }],
//     },
//   },
//   {
//     morning: null,
//     "late-morning": {
//       id: "r2-late-morning",
//       status: "overdue",
//       medicineCountLabel: "1 Medicine",
//       nurseName: "Nurse Prachi Arora",
//       medicines: [{ name: "Omez", dosage: "650mg • 1 Tablet" }],
//       timeLabel: "08:15 AM",
//       timePrefix: "Was",
//       tag: { label: "Refused", tone: "danger", tooltip: "Patient declined medication despite counseling." },
//     },
//     noon: null,
//     afternoon: null,
//     evening: {
//       id: "r2-evening",
//       status: "scheduled",
//       medicineCountLabel: "1 Medicine",
//       nurseName: "Nurse Prachi Arora",
//       medicines: [{ name: "Chyawanprash", dosage: "2 Spoons" }],
//     },
//     dinner: null,
//     night: null,
//   },
// ];

// function MarStatusClockIcon({ color }: { color: string }) {
//   return (
//     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
//       <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.6" />
//       <path d="M12 7V12L15 14" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
//     </svg>
//   );
// }

// function MarInfoIcon({ color }: { color: string }) {
//   return (
//     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
//       <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.6" />
//       <path d="M12 11V16" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
//       <circle cx="12" cy="8" r="1" fill={color} />
//     </svg>
//   );
// }

// function MarCardView({
//   card,
//   onDueNowClick,
// }: {
//   card: MarCard;
//   onDueNowClick?: (card: MarCard) => void;
// }) {
//   const styles = (() => {
//     switch (card.status) {
//       case "administered":
//         return {
//           bg: "#E8F5E9",
//           border: "#0B8C0033",
//           statusColor: "#0B8C00",
//           statusLabel: "Administered",
//           timeColor: "#0B8C00",
//         };
//       case "due-now":
//         return {
//           bg: "#F2F8F2",
//           border: "#0B8C0033",
//           statusColor: "#0B8C00",
//           statusLabel: "Due Now",
//           timeColor: "#0B8C00",
//         };
//       case "overdue":
//         return {
//           bg: "#FEF2F2",
//           border: "#93000A3D",
//           statusColor: "#DC2626",
//           statusLabel: "OVERDUE",
//           timeColor: "#DC2626",
//         };
//       case "scheduled":
//       default:
//         return {
//           bg: "#FFF7ED",
//           border: "#EA580C3D",
//           statusColor: "#EA580C",
//           statusLabel: "Scheduled",
//           timeColor: "#EA580C",
//         };
//     }
//   })();

//   const tagStyles =
//     card.tag?.tone === "danger"
//       ? { border: "#FCA5A5", text: "#DC2626", bg: "#FFFFFF", icon: "#DC2626" }
//       : { border: "#FDBA74", text: "#EA580C", bg: "#FFFFFF", icon: "#EA580C" };

//   const tagBadge = card.tag ? (
//     <span
//       className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium"
//       style={{
//         borderColor: tagStyles.border,
//         color: tagStyles.text,
//         backgroundColor: tagStyles.bg,
//       }}
//     >
//       {card.tag.label}
//       <MarInfoIcon color={tagStyles.icon} />
//     </span>
//   ) : null;

//   const isClickable = card.status === "due-now" && Boolean(onDueNowClick);

//   return (
//     <div
//       role={isClickable ? "button" : undefined}
//       tabIndex={isClickable ? 0 : undefined}
//       onClick={isClickable ? () => onDueNowClick?.(card) : undefined}
//       onKeyDown={
//         isClickable
//           ? (event) => {
//               if (event.key === "Enter" || event.key === " ") {
//                 event.preventDefault();
//                 onDueNowClick?.(card);
//               }
//             }
//           : undefined
//       }
//       className={`w-full rounded-[12px] border p-3 ${isClickable ? "cursor-pointer transition-shadow hover:shadow-[0px_8px_18px_rgba(34,56,43,0.08)]" : ""}`}
//       style={{ backgroundColor: styles.bg, borderColor: styles.border }}
//     >
//       <div className="flex items-start justify-between gap-2">
//         <p className="text-xs font-semibold" style={{ color: styles.statusColor }}>
//           {styles.statusLabel}
//         </p>
//         <div className="flex items-center gap-1.5">
//           <p className="text-[10px] text-[#9FA2AB]">{card.medicineCountLabel}</p>
//           {card.showWarning ? <Image src="/icons/Warning.svg" alt="Warning" width={14} height={14} /> : null}
//         </div>
//       </div>

//       {card.status === "overdue" && card.nurseName ? (
//         <p className="mt-2 text-[11px] text-[#9FA2AB]">{card.nurseName}</p>
//       ) : null}

//       <div className="mt-2 space-y-2">
//         {card.medicines.map((medicine) => (
//           <div
//             key={`${card.id}-${medicine.name}`}
//             className="rounded-[8px] border border-[#EDF3EA] bg-white px-2.5 py-2 shadow-[0px_1px_2px_rgba(34,56,43,0.04)]"
//           >
//             <p className="text-xs leading-[150%] text-[#434956]">
//               <span className="font-semibold text-[#262D3B]">{medicine.name}</span>{" "}
//               <span>{medicine.dosage}</span>
//             </p>
//           </div>
//         ))}
//       </div>

//       {card.moreCount ? (
//         <button
//           type="button"
//           className="mt-2 text-xs font-medium text-[#0B8C00] hover:underline"
//           onClick={(event) => {
//             if (isClickable) event.stopPropagation();
//           }}
//         >
//           + {card.moreCount} More
//         </button>
//       ) : null}

//       {(card.nurseName && card.status !== "overdue") || card.tag || card.timeLabel ? (
//         <div className="mt-3 flex items-center justify-between gap-2">
//           <div className="min-w-0">
//             {card.nurseName && card.status !== "overdue" ? (
//               <p className="truncate text-[11px] text-[#9FA2AB]">{card.nurseName}</p>
//             ) : null}
//             {card.tag ? (
//               <div
//                 className={card.nurseName && card.status !== "overdue" ? "mt-1.5" : ""}
//                 onClick={(event) => {
//                   if (isClickable) event.stopPropagation();
//                 }}
//               >
//                 {card.tag.tooltip ? (
//                   <Tooltip content={card.tag.tooltip} position="top" delay={0} maxWidth={180}>
//                     <button type="button" className="inline-flex">
//                       {tagBadge}
//                     </button>
//                   </Tooltip>
//                 ) : (
//                   tagBadge
//                 )}
//               </div>
//             ) : null}
//           </div>

//           {card.timeLabel ? (
//             <div className="flex shrink-0 items-center gap-1" style={{ color: styles.timeColor }}>
//               <MarStatusClockIcon color={styles.timeColor} />
//               <span className="text-[10px] font-medium">
//                 {card.timePrefix ? `${card.timePrefix} ` : ""}
//                 {card.timeLabel}
//               </span>
//             </div>
//           ) : null}
//         </div>
//       ) : null}
//     </div>
//   );
// }

// function AdministerDoseDialog({
//   open,
//   onClose,
//   onSubmit,
//   patientName,
//   card,
// }: {
//   open: boolean;
//   onClose: () => void;
//   onSubmit: () => void;
//   patientName: string;
//   card: MarCard | null;
// }) {
//   const [administeredBy, setAdministeredBy] = useState("Prachi Arora");
//   const [status, setStatus] = useState("");
//   const [remark, setRemark] = useState("");

//   useEffect(() => {
//     if (!open) return;
//     setAdministeredBy("Prachi Arora");
//     setStatus("");
//     setRemark("");
//   }, [open, card]);

//   const medicationLabel =
//     card?.medicationLabel ??
//     (card?.medicines[0] ? `${card.medicines[0].name} ${card.medicines[0].dosage.split(" • ")[0]}` : "—");
//   const dosageLabel = card?.dosageLabel ?? card?.medicines[0]?.dosage ?? "—";
//   const scheduledTime = card?.scheduledTime ?? "24 May 2026, 10:00 AM";

//   const detailRows = [
//     { label: "Patient Name", value: patientName },
//     { label: "Medication", value: medicationLabel },
//     { label: "Dosage", value: dosageLabel },
//     { label: "Scheduled Time", value: scheduledTime },
//   ];

//   return (
//     <Dialog open={open} onClose={onClose} title="Administer dose" width={560} contentPadding="px-6 pb-6 pt-2">
//       <div className="space-y-5">
//         <div className="divide-y divide-[#EDF3EA] rounded-[12px] border border-[#EDF3EA] bg-white">
//           {detailRows.map((row) => (
//             <div key={row.label} className="flex items-center justify-between gap-4 px-4 py-3">
//               <p className="text-sm text-[#7B8089]">{row.label}</p>
//               <p className="text-right text-sm font-medium text-[#262D3B]">{row.value}</p>
//             </div>
//           ))}

//           <div className="flex items-center justify-between gap-4 px-4 py-3">
//             <p className="text-sm text-[#7B8089]">Administered</p>
//             <input
//               type="text"
//               value={administeredBy}
//               onChange={(event) => setAdministeredBy(event.target.value)}
//               className="h-10 w-[220px] rounded-full border border-[#DFE0E2] bg-white px-4 text-sm font-medium text-[#262D3B] outline-none focus:border-[#0B8C00] focus:ring-2 focus:ring-[#0B8C00]/20"
//             />
//           </div>

//           <div className="flex items-center justify-between gap-4 px-4 py-3">
//             <p className="text-sm text-[#7B8089]">Current Time</p>
//             <p className="text-right text-sm font-medium text-[#262D3B]">27 May 2026, 10:00 AM</p>
//           </div>
//         </div>

//         <FormSelectField
//           label="Status"
//           width="100%"
//           value={status}
//           options={ADMINISTER_DOSE_STATUS_OPTIONS}
//           onChange={(value) => setStatus(String(value))}
//           placeholder="Select"
//         />

//         <FormTextareaField
//           label="Remark"
//           width="100%"
//           height={110}
//           value={remark}
//           onChange={(event) => setRemark(event.target.value)}
//           placeholder="Enter Remark..."
//         />

//         <div className="flex flex-wrap items-center gap-3 pt-1">
//           <Button variant="primary" size="small" onClick={onSubmit}>
//             Submit
//           </Button>
//         </div>
//       </div>
//     </Dialog>
//   );
// }



// export function PatientMedicationScheduleTab({
//   patient,
//   onBack,
// }: {
//   patient: MedicationSchedulePatient | string;
//   onBack?: () => void;
// }) {
//   const patientDetails: MedicationSchedulePatient =
//     typeof patient === "string"
//       ? {
//           patientName: patient,
//           patientUhid: "AS-9921-0812",
//           age: "42 years",
//           gender: "Male",
//           bedNumber: "302",
//           diagnosis: "Vata imbalance",
//           admissionDate: "Oct 18, 2024",
//           statusLabel: "STABLE",
//         }
//       : 
      
//       patient;

//   const [isAdministerDoseOpen, setIsAdministerDoseOpen] = useState(false);
//   const [selectedAdministerCard, setSelectedAdministerCard] = useState<MarCard | null>(null);
//   const [isAdministerDoseSuccessOpen, setIsAdministerDoseSuccessOpen] = useState(false);

//   const openAdministerDose = (card: MarCard) => {
//     setSelectedAdministerCard(card);
//     setIsAdministerDoseOpen(true);
//   };

//   const closeAdministerDose = () => {
//     setIsAdministerDoseOpen(false);
//     setSelectedAdministerCard(null);
//   };

//   const handleAdministerDoseSubmit = () => {
//     closeAdministerDose();
//     setIsAdministerDoseSuccessOpen(true);
//   };

//   const closeAdministerDoseSuccess = () => {
//     setIsAdministerDoseSuccessOpen(false);
//   };

//   const patientMeta = [
//     `UHID: ${patientDetails.patientUhid}`,
//     `Age: ${patientDetails.age}`,
//     `Gender: ${patientDetails.gender}`,
//     `Bed Number: ${patientDetails.bedNumber}`,
//     `Diagnosis: ${patientDetails.diagnosis}`,
//     `Admission Date: ${patientDetails.admissionDate}`,
//   ].join("  •  ");

//   return (
//     <>
//       <div className="space-y-5">
//         {onBack ? <BackToPreviousPageButton onClick={onBack} text="Back to Medication" /> : null}

//         {/* <div className="flex flex-wrap items-center gap-3">
//           <h1 className="text-[22px] font-semibold leading-tight text-[#262D3B] md:text-[24px]">
//             {patientDetails.patientName}
//           </h1>
//           <Badge variant="success" className="font-medium">
//             {patientDetails.statusLabel ?? "STABLE"}
//           </Badge>
//         </div>
//         <p className="text-sm text-[#434956]">{patientMeta}</p> */}

//         <section className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.06)]">
//           <h3 className="mb-4 text-base font-medium text-[#262D3B]">MAR - Today, 24 May 2024</h3>

//           <div className="overflow-x-auto">
//             <div className="min-w-[1120px] overflow-hidden rounded-[14px] border border-[#D7DED7]">
//               <div className="grid grid-cols-7">
//                 {MAR_COLUMNS.map((column, index) => (
//                   <div
//                     key={column.id}
//                     className={`bg-white px-3 py-3 text-center ${
//                       index < MAR_COLUMNS.length - 1 ? "border-r border-[#D7DED7]" : ""
//                     } border-b border-[#D7DED7]`}
//                   >
//                     <p className="text-sm font-semibold text-[#262D3B]">{column.time}</p>
//                     <p className="mt-0.5 text-xs text-[#9FA2AB]">{column.period}</p>
//                   </div>
//                 ))}
//               </div>

//               {MAR_ROWS.map((row, rowIndex) => (
//                 <div key={`mar-row-${rowIndex}`} className="grid grid-cols-7">
//                   {MAR_COLUMNS.map((column, columnIndex) => {
//                     const card = row[column.id] ?? null;
//                     return (
//                       <div
//                         key={`${column.id}-r${rowIndex}`}
//                         className={`min-h-[220px] bg-white p-3 ${
//                           columnIndex < MAR_COLUMNS.length - 1 ? "border-r border-[#D7DED7]" : ""
//                         } ${rowIndex < MAR_ROWS.length - 1 ? "border-b border-[#D7DED7]" : ""}`}
//                       >
//                         {card ? <MarCardView card={card} onDueNowClick={openAdministerDose} /> : null}
//                       </div>
//                     );
//                   })}
//                 </div>
//               ))}
//             </div>
//           </div>
//         </section>
//       </div>

//       <AdministerDoseDialog
//         open={isAdministerDoseOpen}
//         onClose={closeAdministerDose}
//         onSubmit={handleAdministerDoseSubmit}
//         patientName={patientDetails.patientName}
//         card={selectedAdministerCard}
//       />

//       <MessageDialog
//         open={isAdministerDoseSuccessOpen}
//         onClose={closeAdministerDoseSuccess}
//         icon="/icons/SuccessCheck.svg"
//         iconBgColor="#E8F5E9"
//         message="Medication administered successfully"
//         confirmText="OK"
//         showCancel={false}
//         onConfirm={closeAdministerDoseSuccess}
//         width={400}
//       />
//     </>
//   );
// }














"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  BackToPreviousPageButton,
  Button,
  DatePicker,
  Dialog,
  FormSelectField,
  FormTextareaField,
  MessageDialog,
  SpinnerLoader,
  Tooltip,
} from "@/components/ui";
import {
  useStaffNurseGetPatientMedicineScheduleQuery,
  useStaffNurseUpdateTodayPatientMedicineDoseMutation,
  type PatientMedicineDetailItem,
} from "@/store/api/ipdStaffNurseAPI";

export type MedicationSchedulePatient = {
  patientId?: number;
  patientName: string;
  patientUhid: string;
  age: string;
  gender: string;
  bedNumber: string;
  diagnosis: string;
  admissionDate: string;
  statusLabel?: string;
};

type MarStatus = "administered" | "due-now" | "overdue" | "scheduled" | "missed" | "refused" | "cancelled" | "wasted";

type MarMedicineItem = {
  name: string;
  dosage: string;
};

type MarCard = {
  id: string;
  status: MarStatus;
  statusLabel: string;
  statusRemark?: string;
  nurseName?: string;
  medicines: MarMedicineItem[];
  timeLabel?: string;
  timePrefix?: string;
  showWarning?: boolean;
  medicationLabel?: string;
  dosageLabel?: string;
  scheduledTime?: string;
  sourceMedicines?: PatientMedicineDetailItem[];
};

const ADMINISTER_DOSE_STATUS_OPTIONS = [
  { label: "Completed", value: "completed" },
  { label: "Missed", value: "missed" },
  { label: "Refused", value: "refused" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Wasted", value: "wasted" },
];

const MAR_COLUMNS: Array<{ id: string; time: string; period: string }> = [
  { id: "morning", time: "5:00 am - 7:00 am", period: "Morning" },
  { id: "afternoon", time: "11:00 am - 01:00 pm", period: "Afternoon" },
  { id: "evening", time: "5:00 pm - 07:00 pm", period: "Evening" },
  { id: "night", time: "10:00 pm - 12 am", period: "Night" },
];

const SHIFT_COLUMN_MAP: Record<string, string> = {
  morning: "morning",
  afternoon: "afternoon",
  evening: "evening",
  night: "night",
};

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMedicineDosageDisplay(item: PatientMedicineDetailItem) {
  const amount = item.dosageAmount?.trim();
  const unit = item.dosageUnit?.trim();
  const formattedUnit = unit ? `${unit.charAt(0)}${unit.slice(1).toLowerCase()}` : "";
  const dosePart =
    amount && formattedUnit ? `${amount} ${formattedUnit}` : amount || formattedUnit || "N/A";

  if (!item.timingType?.trim()) return dosePart;

  const timing = item.timingType
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return `${dosePart} • ${timing}`;
}

function formatCompletedTime(completedAt: string | null | undefined) {
  if (!completedAt) return undefined;

  return new Date(completedAt).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatScheduleHeadingDate(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "MAR - Today";

  const month = date.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const formattedDate = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // return `${month}, ${formattedDate}`;
    return `${formattedDate}`;
}

function mapShiftNameToColumnId(shift: string) {
  const normalized = shift.trim().toLowerCase();
  return SHIFT_COLUMN_MAP[normalized] ?? null;
}

function formatDoseStatusLabel(status: string) {
  return status
    .trim()
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function mapTodayDoseStatusToMarStatus(status: string): MarStatus {
  switch (status.trim().toLowerCase()) {
    case "completed":
      return "administered";
    case "missed":
      return "missed";
    case "refused":
      return "refused";
    case "cancelled":
      return "cancelled";
    case "wasted":
      return "wasted";
    default:
      return "scheduled";
  }
}

function deriveMedicineMarDisplay(medicine: PatientMedicineDetailItem): {
  status: MarStatus;
  statusLabel: string;
  statusRemark?: string;
} {
  const todayDoseStatus = medicine.todayDoses?.status?.trim();

  if (todayDoseStatus) {
    return {
      status: mapTodayDoseStatusToMarStatus(todayDoseStatus),
      statusLabel: formatDoseStatusLabel(todayDoseStatus),
      statusRemark: medicine.todayDoses?.remark?.trim() || undefined,
    };
  }

  const shiftTimeStatus = medicine.shiftTimeStatus?.trim().toLowerCase();

  if (shiftTimeStatus === "duenow") {
    return { status: "due-now", statusLabel: "Due Now" };
  }

  if (shiftTimeStatus === "overdue") {
    return { status: "overdue", statusLabel: "OVERDUE" };
  }

  // upcoming (or any other / null) → Scheduled
  return { status: "scheduled", statusLabel: "Scheduled" };
}

function mapMedicineToMarCard(
  columnId: string,
  shiftLabel: string,
  medicine: PatientMedicineDetailItem
): MarCard {
  const { status, statusLabel, statusRemark } = deriveMedicineMarDisplay(medicine);

  return {
    id: `${columnId}-${medicine.id}`,
    status,
    statusLabel,
    statusRemark,
    nurseName: medicine.nurseName || undefined,
    medicines: [
      {
        name: medicine.medicineName,
        dosage: formatMedicineDosageDisplay(medicine),
      },
    ],
    showWarning: status === "overdue",
    timeLabel: formatCompletedTime(medicine.todayDoses?.completedAt),
    timePrefix: status === "overdue" ? "Was" : undefined,
    medicationLabel: medicine.medicineName,
    dosageLabel: formatMedicineDosageDisplay(medicine),
    scheduledTime: `${shiftLabel}${
      medicine.todayDoses?.completedAt
        ? ` • ${formatCompletedTime(medicine.todayDoses.completedAt)}`
        : ""
    }`,
    sourceMedicines: [medicine],
  };
}

function buildMarColumns(
  schedule: Array<{ shift: string; medicines: PatientMedicineDetailItem[] }>
): Record<string, MarCard[]> {
  const columns: Record<string, MarCard[]> = {
    morning: [],
    afternoon: [],
    evening: [],
    night: [],
  };

  schedule.forEach((shiftGroup) => {
    const columnId = mapShiftNameToColumnId(shiftGroup.shift);
    if (!columnId) return;

    columns[columnId] = shiftGroup.medicines.map((medicine) =>
      mapMedicineToMarCard(columnId, shiftGroup.shift, medicine)
    );
  });

  return columns;
}

function MarStatusClockIcon({ color }: { color: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.6" />
      <path d="M12 7V12L15 14" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MarInfoIcon({ color }: { color: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.6" />
      <path d="M12 11V16" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="8" r="1" fill={color} />
    </svg>
  );
}

function MarCardView({
  card,
  onDueNowClick,
}: {
  card: MarCard;
  onDueNowClick?: (card: MarCard) => void;
}) {
  const styles = (() => {
    switch (card.status) {
      case "administered":
        return {
          bg: "#E8F5E9",
          border: "#0B8C0033",
          statusColor: "#0B8C00",
          timeColor: "#0B8C00",
        };
      case "due-now":
        return {
          bg: "#F2F8F2",
          border: "#0B8C0033",
          statusColor: "#0B8C00",
          timeColor: "#0B8C00",
        };
      case "overdue":
      case "missed":
      case "refused":
        return {
          bg: "#FEF2F2",
          border: "#93000A3D",
          statusColor: "#DC2626",
          timeColor: "#DC2626",
        };
      case "cancelled":
      case "wasted":
        return {
          bg: "#FFF7ED",
          border: "#EA580C3D",
          statusColor: "#EA580C",
          timeColor: "#EA580C",
        };
      case "scheduled":
      default:
        return {
          bg: "#FFF7ED",
          border: "#EA580C3D",
          statusColor: "#EA580C",
          timeColor: "#EA580C",
        };
    }
  })();

  const isClickable = card.status === "due-now" && Boolean(onDueNowClick);

  return (
    <div
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? () => onDueNowClick?.(card) : undefined}
      onKeyDown={
        isClickable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onDueNowClick?.(card);
              }
            }
          : undefined
      }
      className={`mx-auto w-[250px] rounded-[12px] border p-3 ${isClickable ? "cursor-pointer transition-shadow hover:shadow-[0px_8px_18px_rgba(34,56,43,0.08)]" : ""}`}
      style={{ backgroundColor: styles.bg, borderColor: styles.border }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: styles.statusColor }}>
          <span>{card.statusLabel}</span>
          {card.statusRemark ? (
            <Tooltip
              content={<span className="text-xs text-[#262D3B]">{card.statusRemark}</span>}
              position="top"
              delay={0}
              maxWidth={220}
            >
              <button
                type="button"
                className="inline-flex"
                aria-label="View remark"
                onClick={(event) => {
                  event.stopPropagation();
                }}
              >
                <MarInfoIcon color={styles.statusColor} />
              </button>
            </Tooltip>
          ) : null}
        </p>
        <div className="flex items-center gap-1.5">
          {card.showWarning ? <Image src="/icons/Warning.svg" alt="Warning" width={14} height={14} /> : null}
        </div>
      </div>

      <div className="mt-2 space-y-2">
        {card.medicines.map((medicine) => (
          <div
            key={`${card.id}-${medicine.name}`}
            className="rounded-[8px] border border-[#EDF3EA] bg-white px-2.5 py-2 shadow-[0px_1px_2px_rgba(34,56,43,0.04)]"
          >
            <p className="text-xs leading-[150%] text-[#434956]">
              <span className="font-semibold text-[#262D3B]">{medicine.name}</span>{" "}
              <span>{medicine.dosage}</span>
            </p>
          </div>
        ))}
      </div>

      {(card.nurseName || card.timeLabel) ? (
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            {card.nurseName ? (
              <p className="truncate text-[11px] text-[#9FA2AB]">
                <span>Nurse Name : </span>
                <span className="font-medium text-[#434956]">{card.nurseName}</span>
              </p>
            ) : null}
          </div>

          {card.timeLabel ? (
            <div className="flex shrink-0 items-center gap-1" style={{ color: styles.timeColor }}>
              <MarStatusClockIcon color={styles.timeColor} />
              <span className="text-[10px] font-medium">
                {card.timePrefix ? `${card.timePrefix} ` : ""}
                {card.timeLabel}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// const now = new Date();

// const date = now.toLocaleDateString("en-GB", {
//   day: "2-digit",
//   month: "short",
//   year: "numeric",
// });

// const time = now.toLocaleTimeString("en-IN", {
//   hour: "2-digit",
//   minute: "2-digit",
//   hour12: true,
// });

// const currentDateTime = `${date}, ${time}`;

function rtkErrorMessage(error: unknown): string {
  const parsed = error as { data?: { message?: string }; message?: string };
  if (typeof parsed?.data?.message === "string") return parsed.data.message;
  if (typeof parsed?.message === "string") return parsed.message;
  return "Something went wrong";
}

function AdministerDoseDialog({
  open,
  onClose,
  onSubmit,
  patientName,
  card,
  isSubmitting = false,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: { status: string; remark: string }) => void | Promise<void>;
  patientName: string;
  card: MarCard | null;
  isSubmitting?: boolean;
}) {
  const [administeredBy, setAdministeredBy] = useState<string>("");
  const [status, setStatus] = useState("");
  const [remark, setRemark] = useState("");
  const [statusError, setStatusError] = useState("");
  const [remarkError, setRemarkError] = useState("");
    // currentdatetime(LabtestReport)
    const [formattedDateTime, setLabtestReportformattedDateTime] = useState("");
    useEffect(() => {
      const updateDateTime = () => {
        const now = new Date();
    
        const date = now.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
    
        const time = now.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
    
        setLabtestReportformattedDateTime(`${date} | ${time}`);
      };
    
      updateDateTime();
    
    
      const interval = setInterval(updateDateTime, 60000);
    
      return () => clearInterval(interval);
    }, []);

  useEffect(() => {
    if (!open) return;

    const userData = localStorage.getItem("user");

    if (userData) {
      const user = JSON.parse(userData);
      setAdministeredBy(user.name);
    }
    setStatus("");
    setRemark("");
    setStatusError("");
    setRemarkError("");
  }, [open, card]);

  const medicationLabel =
    card?.medicationLabel ??
    (card?.medicines[0] ? `${card.medicines[0].name} ${card.medicines[0].dosage.split(" • ")[0]}` : "—");
  const dosageLabel = card?.dosageLabel ?? card?.medicines[0]?.dosage ?? "—";
  const scheduledTime = card?.scheduledTime ?? "24 May 2026, 10:00 AM";

  const detailRows = [
    { label: "Patient Name", value: patientName, withTooltip: true },
    { label: "Medicine Name", value: medicationLabel },
    { label: "Dosage", value: dosageLabel },
    { label: "Scheduled Time", value: scheduledTime },
  ];

  const handleSubmit = () => {
    const nextStatusError = status.trim() ? "" : "Status is required";
    const nextRemarkError = remark.trim() ? "" : "Remark is required";

    setStatusError(nextStatusError);
    setRemarkError(nextRemarkError);

    if (nextStatusError || nextRemarkError) {
      return;
    }

    void onSubmit({
      status: status.trim(),
      remark: remark.trim(),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} title="Administer dose" width={560} contentPadding="px-6 pb-6 pt-2">
      <div className="space-y-5">
        <div className="divide-y divide-[#EDF3EA] rounded-[12px] border border-[#EDF3EA] bg-white">
          {detailRows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4 px-4 py-3">
              <p className="shrink-0 text-sm text-[#7B8089]">{row.label}</p>
              {row.withTooltip ? (
                <Tooltip
                  position="top"
                  maxWidth={600}
                  content={
                    <span className="whitespace-nowrap text-xs text-[#262D3B]">{row.value}</span>
                  }
                >
                  <p className="min-w-0 max-w-[280px] cursor-default truncate text-right text-sm font-medium text-[#262D3B]">
                    {row.value}
                  </p>
                </Tooltip>
              ) : (
                <p className="text-right text-sm font-medium text-[#262D3B]">{row.value}</p>
              )}
            </div>
          ))}

          {/* <div className="flex items-center justify-between gap-4 px-4 py-3">
            <p className="text-sm text-[#7B8089]">Administered</p>
            <input
            disabled
              type="text"
              value={administeredBy}
              onChange={(event) => setAdministeredBy(event.target.value)}
              className="h-10 w-[220px] rounded-full border border-[#DFE0E2] bg-white px-4 text-sm font-medium text-[#262D3B] outline-none focus:border-[#0B8C00] focus:ring-2 focus:ring-[#0B8C00]/20"
            />
          </div> */}

           <div className="flex items-center justify-between gap-4 px-4 py-3">
            <p className="text-sm text-[#7B8089]">Administered</p>
            <p className="text-right text-sm font-medium text-[#262D3B]">{administeredBy}</p>
          </div>

          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <p className="text-sm text-[#7B8089]">Current Date/Time</p>
            <p className="text-right text-sm font-medium text-[#262D3B]">{formattedDateTime}</p>
          </div>
        </div>

        <FormSelectField
          label="Status *"
          width="100%"
          background="white"
          value={status}
          options={ADMINISTER_DOSE_STATUS_OPTIONS}
          onChange={(value) => {
            setStatus(String(value));
            if (statusError) setStatusError("");
          }}
          placeholder="Select"
          error={statusError || undefined}
        />

        <FormTextareaField
          label="Remark *"
          width="100%"
          height={110}
          value={remark}
          onChange={(event) => {
            setRemark(event.target.value);
            if (remarkError) setRemarkError("");
          }}
          placeholder="Enter Remark..."
          error={remarkError || undefined}
        />

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button
            variant="primary"
            size="small"
            disabled={isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}


export function PatientMedicationScheduleTab({
  patient,
  patientId,
  patientMedicinePrescribeId,
  initialDate,
  onBack,
}: {
  patient?: MedicationSchedulePatient | string;
  patientId?: number;
  patientMedicinePrescribeId?: number;
  initialDate?: string;
  onBack?: () => void;
}) {
  const [scheduleDate, setScheduleDate] = useState(
    () => initialDate ?? formatLocalDate(new Date())
  );

  const patientDetails: MedicationSchedulePatient =
    typeof patient === "string"
      ? {
          patientName: patient,
          patientUhid: "AS-9921-0812",
          age: "42 years",
          gender: "Male",
          bedNumber: "302",
          diagnosis: "Vata imbalance",
          admissionDate: "Oct 18, 2024",
          statusLabel: "STABLE",
        }
      : patient ?? {
          patientName: "Patient",
          patientUhid: "N/A",
          age: "N/A",
          gender: "N/A",
          bedNumber: "N/A",
          diagnosis: "N/A",
          admissionDate: "N/A",
          statusLabel: "STABLE",
        };

  const resolvedPatientId = patientId ?? patientDetails.patientId;

  const {
    data: medicineScheduleRes,
    isLoading: isMedicineScheduleLoading,
    isFetching: isMedicineScheduleFetching,
    refetch: refetchMedicineSchedule,
  } = useStaffNurseGetPatientMedicineScheduleQuery(
    {
      patientId: resolvedPatientId ?? 0,
      date: scheduleDate,
      ...(patientMedicinePrescribeId != null
        ? { patientMedicinePrescribeId }
        : {}),
    },
    {
      skip: !resolvedPatientId,
      refetchOnMountOrArgChange: true,
    }
  );

  const marColumns = useMemo(
    () => buildMarColumns(medicineScheduleRes?.data ?? []),
    [medicineScheduleRes?.data]
  );
  const scheduleHeading = useMemo(() => formatScheduleHeadingDate(scheduleDate), [scheduleDate]);
  const isScheduleLoading = isMedicineScheduleLoading || isMedicineScheduleFetching;
  const hasScheduleData = MAR_COLUMNS.some((column) => (marColumns[column.id]?.length ?? 0) > 0);

  const [isAdministerDoseOpen, setIsAdministerDoseOpen] = useState(false);
  const [selectedAdministerCard, setSelectedAdministerCard] = useState<MarCard | null>(null);
  const [isAdministerDoseSuccessOpen, setIsAdministerDoseSuccessOpen] = useState(false);
  const [isAdministerDoseErrorOpen, setIsAdministerDoseErrorOpen] = useState(false);
  const [administerDoseDialogMessage, setAdministerDoseDialogMessage] = useState("");
  const [updateTodayPatientMedicineDose, { isLoading: isUpdatingDose }] =
    useStaffNurseUpdateTodayPatientMedicineDoseMutation();


  const openAdministerDose = (card: MarCard) => {
    setSelectedAdministerCard(card);
    setIsAdministerDoseOpen(true);
  };

  const closeAdministerDose = () => {
    setIsAdministerDoseOpen(false);
    setSelectedAdministerCard(null);
  };

  const handleAdministerDoseSubmit = async ({
    status,
    remark,
  }: {
    status: string;
    remark: string;
  }) => {
    const medicine = selectedAdministerCard?.sourceMedicines?.[0];
    if (!medicine) {
      setAdministerDoseDialogMessage("Medicine details are missing. Please try again.");
      setIsAdministerDoseErrorOpen(true);
      return;
    }

    try {
      const result = await updateTodayPatientMedicineDose({
        patientMedicinePrescribeId: medicine.id,
        status,
        remark,
      }).unwrap();

      closeAdministerDose();
      setAdministerDoseDialogMessage(result.message || "Medicine dose updated successfully");
      setIsAdministerDoseSuccessOpen(true);
      void refetchMedicineSchedule();
    } catch (error) {
      setAdministerDoseDialogMessage(
        rtkErrorMessage(error) || "Failed to update medicine dose. Please try again."
      );
      setIsAdministerDoseErrorOpen(true);
    }
  };

  const closeAdministerDoseSuccess = () => {
    setIsAdministerDoseSuccessOpen(false);
    setAdministerDoseDialogMessage("");
  };

  const closeAdministerDoseError = () => {
    setIsAdministerDoseErrorOpen(false);
    setAdministerDoseDialogMessage("");
  };

  const patientMeta = [
    `UHID: ${patientDetails.patientUhid}`,
    `Age: ${patientDetails.age}`,
    `Gender: ${patientDetails.gender}`,
    `Bed Number: ${patientDetails.bedNumber}`,
    `Diagnosis: ${patientDetails.diagnosis}`,
    `Admission Date: ${patientDetails.admissionDate}`,
  ].join("  •  ");

  return (
    <>
      <div className="space-y-5">
        {onBack ? <BackToPreviousPageButton onClick={onBack} text="Back to Medication" /> : null}

        {/* <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[22px] font-semibold leading-tight text-[#262D3B] md:text-[24px]">
            {patientDetails.patientName}
          </h1>
          <Badge variant="success" className="font-medium">
            {patientDetails.statusLabel ?? "STABLE"}
          </Badge>
        </div>
        <p className="text-sm text-[#434956]">{patientMeta}</p> */}

        <section className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.06)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-medium text-[#262D3B]">{scheduleHeading}</h3>
            <div className="w-[180px]">
              <DatePicker
                label=""
                value={scheduleDate}
                onChange={setScheduleDate}
                placeholder="Select date"
                // background="white"
                width="100%"
                disablePastDates={false}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[1120px] overflow-hidden rounded-[14px] border border-[#D7DED7]">
              <div className="grid grid-cols-4">
                {MAR_COLUMNS.map((column, index) => (
                  <div
                    key={column.id}
                    className={`bg-white px-3 py-3 text-center ${
                      index < MAR_COLUMNS.length - 1 ? "border-r border-[#D7DED7]" : ""
                    } border-b border-[#D7DED7]`}
                  >
                    <p className="text-sm font-semibold text-[#262D3B]">{column.time}</p>
                    <p className="mt-0.5 text-xs text-[#9FA2AB]">{column.period}</p>
                  </div>
                ))}
              </div>

              {isScheduleLoading ? (
                <div className="flex items-center justify-center gap-2 bg-white py-16 text-sm text-[#9CA3AF]">
                  <SpinnerLoader size={18} />
                  Loading medication schedule...
                </div>
              ) : !hasScheduleData ? (
                <div className="bg-white py-16 text-center text-sm text-[#9CA3AF]">
                  No medication schedule found for this date.
                </div>
              ) : (
                <div className="grid grid-cols-4">
                  {MAR_COLUMNS.map((column, columnIndex) => {
                    const cards = marColumns[column.id] ?? [];
// console.log("fhvdfdb", cards)
                    return (
                      <div
                        key={column.id}
                        className={`space-y-3 bg-white p-3 ${
                          columnIndex < MAR_COLUMNS.length - 1 ? "border-r border-[#D7DED7]" : ""
                        }`}
                      >
                        {cards.length > 0 ? (
                          cards.map((card) => (
                            <MarCardView
                              key={card.id}
                              card={card}
                              onDueNowClick={openAdministerDose}
                            />
                          ))
                        ) : (
                          <div className="min-h-[120px]" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <AdministerDoseDialog
        open={isAdministerDoseOpen}
        onClose={closeAdministerDose}
        onSubmit={handleAdministerDoseSubmit}
        patientName={patientDetails.patientName}
        card={selectedAdministerCard}
        isSubmitting={isUpdatingDose}
      />

      <MessageDialog
        open={isAdministerDoseSuccessOpen}
        onClose={closeAdministerDoseSuccess}
        icon="/icons/SuccessCheck.svg"
        iconBgColor="#E8F5E9"
        message={administerDoseDialogMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={closeAdministerDoseSuccess}
        width={400}
      />

      <MessageDialog
        open={isAdministerDoseErrorOpen}
        onClose={closeAdministerDoseError}
        icon="/icons/ErrorIcon.svg"
        iconBgColor="#FEE2E2"
        message={administerDoseDialogMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={closeAdministerDoseError}
        width={400}
      />
    </>
  );
}


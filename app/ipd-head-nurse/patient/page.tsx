// "use client";

// import Image from "next/image";
// import { useMemo, useState, type ReactNode } from "react";
// import { AppShell } from "@/components/layout/AppShell";
// import {
//   Badge,
//   Button,
//   Pagination,
//   StatCard,
//   Table,
//   TableBody,
//   TableData,
//   TableHead,
//   TableHeader,
//   TableRow,
//   TableSearchInput,
// } from "@/components/ui";
// import { useAppSelector } from "@/store/hooks";
// import { selectUserName } from "@/store/slices/authSlice";
// import {
//   NurseAllocationView,
//   type NurseAllocationPatient,
// } from "@/components/ipd-head-nurse/NurseAllocationView";
// import {
//   AssignedPatientView,
//   mapAssignedPatientRowToDetail,
//   type AssignedPatientDetail,
// } from "@/components/ipd-head-nurse/AssignedPatientView";

// // ─── Stat card component ──────────────────────────────────────────────────────
// type DashboardStatCardProps = {
//   label: string;
//   value: string | number;
//   iconSrc: string;
//   isActive?: boolean;
//   onClick?: () => void;
// };

// function DashboardStatCard({ label, value, iconSrc, isActive, onClick }: DashboardStatCardProps) {
//   return (
//     <div
//       onClick={onClick}
//       className={`rounded-[20px] py-3 px-5 flex justify-between items-center transition-all duration-200 select-none bg-white`}
//     >
//       <div>
//         <p className={`text-sm font-medium mb-3 ${isActive ? "text-white" : "text-[#434956]"}`}>
//           {label}
//         </p>
//         <h4 className={`font-bold text-[32px] leading-[120%] ${isActive ? "text-white" : "text-[#262D3B]"}`}>
//           {value}
//         </h4>
//       </div>
//       <div className={isActive ? "opacity-100" : ""}>
//         <Image
//           src={iconSrc}
//           alt={label}
//           width={28}
//           height={28}
//           style={isActive ? { filter: "brightness(0) invert(1)" } : undefined}
//         />
//       </div>
//     </div>
//   );
// }

// type PatientListRow = {
//   id: number;
//   patientName: string;
//   opdDoctor: string;
//   nurse: string;
//   bed: string;
//   lastVisit: string;
//   date: string;
//   isUrgent?: boolean;
// };

// type AssignedPatientRow = {
//   id: number;
//   patientName: string;
//   patientId: string;
//   age: string;
//   gender: string;
//   accommodation: string;
//   doctor: string;
//   diagnosis: string;
//   nurse: string;
//   status: "Critical" | "Stable" | "Observation";
// };

// type MedicationAlert = {
//   id: number;
//   medicine: string;
//   bed: string;
//   nurse: string;
//   statusLabel: string;
//   statusTone: "danger" | "warning" | "neutral";
//   actionLabel: "ADMINISTER" | "WAIT";
//   actionTone: "danger" | "neutral";
// };

// type TaskItem = {
//   id: number;
//   title: string;
//   dueLabel: string;
// };

// type ColleagueItem = {
//   id: number;
//   name: string;
//   patientCount: number;
// };

// type PatientAlertItem = {
//   id: number;
//   title: string;
//   description: string;
//   timeAgo: string;
//   tone: "danger" | "success";
//   actionLabel: string;
//   actionVariant: "outline" | "primary";
// };

// type TableFilters = {
//   searchTerm: string;
//   currentPage: number;
//   itemsPerPage: number;
// };

// const PATIENT_LIST_COLUMN_COUNT = 8;
// const ASSIGNED_PATIENT_COLUMN_COUNT = 9;
// const PAGINATION_OPTIONS = [6, 10, 20, 50];

// const WARD_BED_STATS = [
//   { label: "Total Bed", value: "25" },
//   { label: "Occupied", value: "18" },
//   { label: "Vacant", value: "4" },
//   { label: "Reserved", value: "2" },
//   { label: "Under Cleaning", value: "1" },
// ];

// const SUMMARY_CARDS = [
//   { id: "pending-tasks", title: "Pending Tasks", value: "14", iconSrc: "/icons/Hourglass.svg" },
//   { id: "admissions-today", title: "Admissions Today", value: "02", iconSrc: "/icons/addPatient.svg" },
//   { id: "overdue-medicines", title: "Overdue Medicines", value: "03", iconSrc: "/icons/Warning.svg" },
//   { id: "ready-discharge", title: "Ready for Discharge", value: "12", iconSrc: "/icons/exitIcon.svg" },
// ];

// const PATIENT_LIST_ROWS: PatientListRow[] = [
//   {
//     id: 1,
//     patientName: "Ajay Kumar",
//     opdDoctor: "Dr. Rahul Kapoor",
//     nurse: "Priya Das",
//     bed: "Bed #102",
//     lastVisit: "10:30 AM",
//     date: "07 Jul 2026",
//   },
//   {
//     id: 2,
//     patientName: "Sneha Gupta",
//     opdDoctor: "Dr. Anil Mehta",
//     nurse: "Jyoti Sharma",
//     bed: "Bed #205",
//     lastVisit: "09:15 AM",
//     date: "07 Jul 2026",
//     isUrgent: true,
//   },
//   {
//     id: 3,
//     patientName: "Rohit Verma",
//     opdDoctor: "Dr. Kavita Singh",
//     nurse: "Arpita Khanna",
//     bed: "Bed #108",
//     lastVisit: "11:00 AM",
//     date: "07 Jul 2026",
//   },
//   {
//     id: 4,
//     patientName: "Meera Joshi",
//     opdDoctor: "Dr. Sunil Rao",
//     nurse: "Tanish Patra",
//     bed: "Bed #112",
//     lastVisit: "08:45 AM",
//     date: "07 Jul 2026",
//   },
//   {
//     id: 5,
//     patientName: "Vikas Sharma",
//     opdDoctor: "Dr. Neha Gupta",
//     nurse: "Sneha Gupta",
//     bed: "Bed #118",
//     lastVisit: "10:05 AM",
//     date: "07 Jul 2026",
//     isUrgent: true,
//   },
//   {
//     id: 6,
//     patientName: "Pooja Nair",
//     opdDoctor: "Dr. Amit Patel",
//     nurse: "Priya Das",
//     bed: "Bed #120",
//     lastVisit: "09:50 AM",
//     date: "07 Jul 2026",
//   },
// ];

// const ASSIGNED_PATIENT_ROWS: AssignedPatientRow[] = [
//   {
//     id: 1,
//     patientName: "Rajesh Kumar",
//     patientId: "JSKL41712025",
//     age: "68Y",
//     gender: "Male",
//     accommodation: "Room: 12 | Floor: Floor 2 | Bed: #G-45",
//     doctor: "Dr. Rahul Kapoor",
//     diagnosis: "Acute Infarction - Frontal Lobe",
//     nurse: "M. Mahendran",
//     status: "Critical",
//   },
//   {
//     id: 2,
//     patientName: "Sunita Devi",
//     patientId: "JSKL41712026",
//     age: "54Y",
//     gender: "Female",
//     accommodation: "Room: 08 | Floor: Floor 2 | Bed: #G-32",
//     doctor: "Dr. Anil Mehta",
//     diagnosis: "Vata Imbalance - Chronic Joint Pain",
//     nurse: "Jyoti Sharma",
//     status: "Stable",
//   },
//   {
//     id: 3,
//     patientName: "Amit Singh",
//     patientId: "JSKL41712027",
//     age: "42Y",
//     gender: "Male",
//     accommodation: "Room: 15 | Floor: Floor 3 | Bed: #G-51",
//     doctor: "Dr. Kavita Singh",
//     diagnosis: "Post-operative Recovery",
//     nurse: "Arpita Khanna",
//     status: "Observation",
//   },
//   {
//     id: 4,
//     patientName: "Neha Verma",
//     patientId: "JSKL41712028",
//     age: "36Y",
//     gender: "Female",
//     accommodation: "Room: 10 | Floor: Floor 2 | Bed: #G-38",
//     doctor: "Dr. Sunil Rao",
//     diagnosis: "Respiratory Distress",
//     nurse: "Tanish Patra",
//     status: "Critical",
//   },
//   {
//     id: 5,
//     patientName: "Ramesh Patel",
//     patientId: "JSKL41712029",
//     age: "61Y",
//     gender: "Male",
//     accommodation: "Room: 18 | Floor: Floor 3 | Bed: #G-60",
//     doctor: "Dr. Neha Gupta",
//     diagnosis: "Diabetes Management",
//     nurse: "Sneha Gupta",
//     status: "Stable",
//   },
//   {
//     id: 6,
//     patientName: "Kavita Joshi",
//     patientId: "JSKL41712030",
//     age: "29Y",
//     gender: "Female",
//     accommodation: "Room: 06 | Floor: Floor 1 | Bed: #G-22",
//     doctor: "Dr. Amit Patel",
//     diagnosis: "Maternal Care - Observation",
//     nurse: "Priya Das",
//     status: "Observation",
//   },
// ];

// const MEDICATION_ALERTS: MedicationAlert[] = [
//   {
//     id: 1,
//     medicine: "Ceftriaxone 1g IV",
//     bed: "Bed 1",
//     nurse: "Jyoti Sharma",
//     statusLabel: "30m Overdue",
//     statusTone: "danger",
//     actionLabel: "ADMINISTER",
//     actionTone: "danger",
//   },
//   {
//     id: 2,
//     medicine: "Metformin 500mg PO",
//     bed: "Bed 2",
//     nurse: "Sneha Gupta",
//     statusLabel: "Due Now",
//     statusTone: "warning",
//     actionLabel: "WAIT",
//     actionTone: "neutral",
//   },
//   {
//     id: 3,
//     medicine: "Paracetamol 650mg PO",
//     bed: "Bed 2",
//     nurse: "Tanish Patra",
//     statusLabel: "Upcoming",
//     statusTone: "neutral",
//     actionLabel: "WAIT",
//     actionTone: "neutral",
//   },
//     {
//     id: 4,
//     medicine: "Paracetamol 650mg PO",
//     bed: "Bed 2",
//     nurse: "Tanish Patra",
//     statusLabel: "Upcoming",
//     statusTone: "neutral",
//     actionLabel: "WAIT",
//     actionTone: "neutral",
//   },
// ];

// const TASK_ITEMS: TaskItem[] = [
//   { id: 1, title: "Vital Signs for Bed 102", dueLabel: "Due: Immediate" },
//   { id: 2, title: "Wound Dressing for Bed 205", dueLabel: "Due: 30 min" },
//   { id: 3, title: "Medication Round - Ward B", dueLabel: "Due: 10 min" },
//   { id: 4, title: "Patient Hygiene - Bed 108", dueLabel: "Due: 25 min" },
// ];

// const COLLEAGUES: ColleagueItem[] = [
//   { id: 1, name: "Jyoti Sharma", patientCount: 5 },
//   { id: 2, name: "Arpita Khanna", patientCount: 3 },
//   { id: 3, name: "Tanish Patra", patientCount: 4 },
//   { id: 4, name: "Sneha Gupta", patientCount: 2 },
// ];

// const PATIENT_ALERTS: PatientAlertItem[] = [
//   {
//     id: 1,
//     title: "Bed 205: Pain Level Spike",
//     description: "Patient reports increased discomfort. Pain score moved from 4 to 8.",
//     timeAgo: "4m ago",
//     tone: "danger",
//     actionLabel: "Acknowledged",
//     actionVariant: "outline",
//   },
//   {
//     id: 2,
//     title: "Bed 102: Lab Results Ready",
//     description: "Full Blood Count and Electrolyte panel results are now available.",
//     timeAgo: "4m ago",
//     tone: "success",
//     actionLabel: "View Lab",
//     actionVariant: "primary",
//   },
// ];

// function getGreeting(): string {
//   const hour = new Date().getHours();
//   if (hour < 12) return "Good morning";
//   if (hour < 17) return "Good afternoon";
//   return "Good evening";
// }

// function getAssignedStatusVariant(status: AssignedPatientRow["status"]) {
//   if (status === "Critical") return "danger";
//   if (status === "Stable") return "success";
//   return "warning";
// }

// function filterRows<T extends { patientName: string }>(rows: T[], searchTerm: string): T[] {
//   const query = searchTerm.trim().toLowerCase();
//   if (!query) return rows;
//   return rows.filter((row) => row.patientName.toLowerCase().includes(query));
// }

// function paginateRows<T>(rows: T[], currentPage: number, itemsPerPage: number): T[] {
//   const start = (currentPage - 1) * itemsPerPage;
//   return rows.slice(start, start + itemsPerPage);
// }

// function DashboardSection({
//   title,
//   searchValue,
//   onSearchChange,
//   children,
//   footer,
// }: {
//   title: string;
//   searchValue: string;
//   onSearchChange: (value: string) => void;
//   children: ReactNode;
//   footer?: ReactNode;
// }) {
//   return (
//     <section className="w-full rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] mb-4">
//       <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
//         <h2 className="text-base font-medium leading-[120%] text-[#262D3B]">{title}</h2>
//         <div className="w-full sm:w-[300px] sm:shrink-0">
//           <TableSearchInput value={searchValue} onChange={onSearchChange} placeholder="Search Here..." />
//         </div>
//       </div>
//       {children}
//       {footer}
//     </section>
//   );
// }

// function ChevronRightIcon() {
//   return (
//  <svg
//   width="16"
//   height="16"
//   viewBox="0 0 16 16"
//   fill="none"
//   className="shrink-0 text-[#1F1F1F]"
// >
//   <path
//     d="M6 4L10 8L6 12"
//     stroke="currentColor"
//     strokeWidth="1.5"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//   />
// </svg>
//     // <Image src="/icons/rightArrow.svg" alt="rightArrow" width={18} height={18} />
//   );
// }

// export default function IPDHeadNursePatientPage() {
//   const userName = useAppSelector(selectUserName) ?? "Anjali";
//   const [allocationPatient, setAllocationPatient] = useState<NurseAllocationPatient | null>(null);
//   const [selectedPatient, setSelectedPatient] = useState<AssignedPatientDetail | null>(null);

//   const [patientListFilters, setPatientListFilters] = useState<TableFilters>({
//     searchTerm: "",
//     currentPage: 1,
//     itemsPerPage: 6,
//   });

//   const [assignedFilters, setAssignedFilters] = useState<TableFilters>({
//     searchTerm: "",
//     currentPage: 1,
//     itemsPerPage: 6,
//   });

//   const filteredPatientList = useMemo(
//     () => filterRows(PATIENT_LIST_ROWS, patientListFilters.searchTerm),
//     [patientListFilters.searchTerm]
//   );

//   const filteredAssignedPatients = useMemo(
//     () => filterRows(ASSIGNED_PATIENT_ROWS, assignedFilters.searchTerm),
//     [assignedFilters.searchTerm]
//   );

//   const paginatedPatientList = useMemo(
//     () => paginateRows(filteredPatientList, patientListFilters.currentPage, patientListFilters.itemsPerPage),
//     [filteredPatientList, patientListFilters.currentPage, patientListFilters.itemsPerPage]
//   );

//   const paginatedAssignedPatients = useMemo(
//     () => paginateRows(filteredAssignedPatients, assignedFilters.currentPage, assignedFilters.itemsPerPage),
//     [filteredAssignedPatients, assignedFilters.currentPage, assignedFilters.itemsPerPage]
//   );

//   console.log("MEDICATION_ALERTSafssfa:", MEDICATION_ALERTS);

//   if (allocationPatient) {
//     return (
//       <AppShell>
//         <NurseAllocationView
//           patient={allocationPatient}
//           onBack={() => setAllocationPatient(null)}
//           onConfirm={() => setAllocationPatient(null)}
//         />
//       </AppShell>
//     );
//   }

//   if (selectedPatient) {
//     return (
//       <AppShell>
//         <AssignedPatientView patient={selectedPatient} onBack={() => setSelectedPatient(null)} />
//       </AppShell>
//     );
//   }

//   return (
//     <AppShell>
//       <div className="space-y-6">
//         <div>
//           <h1 className="text-[22px] font-semibold leading-tight text-[#262D3B] md:text-[24px] lg:text-[26px]">
//             {getGreeting()}, {userName}
//           </h1>
//           <p className="mt-0.5 text-sm text-[#525763] font-medium text-[13px] leading-[18px]">
//             Ward 4B • Intensive Care Unit • Shift Remaining: 6h 42m • Handover Due: 16:00
//           </p>
//         </div>

//         {/* <section className="rounded-[20px] border border-[#EBECED] bg-white px-6 py-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] mb-4">
//   <div className="border-b border-[#EBECED] pb-4">
//     <h2 className="text-base font-medium text-[#262D3B]">
//       Ward Bed Occupancy
//     </h2>
//   </div>

//   <div className="mt-5 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
//     {WARD_BED_STATS.map((stat) => (
//       <div key={stat.label} className="min-w-0">
//         <p className="text-sm text-[#434956]">{stat.label}</p>
//         <p className="mt-2 text-[14px] font-bold leading-none text-[#262D3B]">
//           {stat.value}
//         </p>
//       </div>
//     ))}
//   </div>
//         </section> */}

//         {/* <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-4">
//              {SUMMARY_CARDS.map((card) => {
//             const displayValue = card.value; // You can format the value if needed
//           return (
//             <DashboardStatCard
//               key={card.id}
//               label={card.title}
//               value={displayValue}
//               iconSrc={card.iconSrc}
//             />
//           );
//         })}
//         </div> */}

//         {/* <DashboardSection
//           title="Patient List"
//           searchValue={patientListFilters.searchTerm}
//           onSearchChange={(value) =>
//             setPatientListFilters((prev) => ({
//               ...prev,
//               searchTerm: value,
//               currentPage: 1,
//             }))
//           }
//           footer={
//             filteredPatientList.length > 0 ? (
//               <Pagination
//                 currentPage={patientListFilters.currentPage}
//                 totalItems={filteredPatientList.length}
//                 itemsPerPage={patientListFilters.itemsPerPage}
//                 itemsPerPageOptions={PAGINATION_OPTIONS}
//                 onPageChange={(page) => setPatientListFilters((prev) => ({ ...prev, currentPage: page }))}
//                 onItemsPerPageChange={(items) =>
//                   setPatientListFilters((prev) => ({ ...prev, itemsPerPage: items, currentPage: 1 }))
//                 }
//               />
//             ) : null
//           }
//         >
//           <Table>
//             <TableHeader>
//               <TableRow className="bg-white">
//                 <TableHead position="first">Sr no.</TableHead>
//                 <TableHead>Patient Name</TableHead>
//                 <TableHead>OPD Doctor</TableHead>
//                 <TableHead>Nurse</TableHead>
//                 <TableHead>Bed</TableHead>
//                 <TableHead>Last Visit</TableHead>
//                 <TableHead>Date</TableHead>
//                 <TableHead position="last">Action</TableHead>
//               </TableRow>
//             </TableHeader>
//             <TableBody>
//               {paginatedPatientList.length === 0 ? (
//                 <TableRow>
//                   <TableData colSpan={PATIENT_LIST_COLUMN_COUNT} className="py-12 text-center text-sm text-[#9CA3AF]">
//                     No patients found.
//                   </TableData>
//                 </TableRow>
//               ) : (
//                 paginatedPatientList.map((patient, index) => {
//                   const srNo = String(
//                     (patientListFilters.currentPage - 1) * patientListFilters.itemsPerPage + index + 1
//                   ).padStart(2, "0");

//                   return (
//                     <TableRow key={patient.id} className="bg-white transition-colors hover:bg-[#F7FAF7]">
//                       <TableData variant="primary">{srNo}</TableData>
//                       <TableData>
//                         <div className="flex items-center gap-2">
//                           <span>{patient.patientName}</span>
       
//                         </div>
//                       </TableData>
//                       <TableData>{patient.opdDoctor}</TableData>
//                       <TableData>{patient.nurse}</TableData>
//                       <TableData>{patient.bed}</TableData>


//                       <TableData>
//                         <div className="flex items-center gap-2">
//                             {patient.isUrgent ? (
//                             <button className="px-3 py-1 rounded-full text-xs inline-block select-none transition-all duration-200 border border-[#93000A3D] text-[#93000A] bg-[#FFFFFF] font-normal">
//                                 Urgent
//                             </button>
//                             )
//                         : (
//                             <span className="text-sm text-gray-600">
//                             Last visit: {patient.lastVisit || "N/A"}
//                             </span>
//                         )
//                         }                          
//                         </div>
//                         </TableData>
//                       <TableData>{patient.date}</TableData>
//                       <TableData>
//                         <div className="flex flex-wrap items-center gap-2">
//                           <Button
//                             variant="primary"
//                             size="xsmall"
//                             className="!min-w-0 whitespace-nowrap"
//                             onClick={() =>
//                               setAllocationPatient({
//                                 id: patient.id,
//                                 patientName: patient.patientName,
//                                 bed: patient.bed,
//                               })
//                             }
//                           >
//                             Assign Nurse
//                           </Button>
//                           <Button variant="outline" size="xsmall" className="!min-w-0 whitespace-nowrap">
//                             View
//                           </Button>
//                         </div>
//                       </TableData>
//                     </TableRow>
//                   );
//                 })
//               )}
//             </TableBody>
//           </Table>
//         </DashboardSection> */}

//         <DashboardSection
//           title="Assigned Patients"
//           searchValue={assignedFilters.searchTerm}
//           onSearchChange={(value) =>
//             setAssignedFilters((prev) => ({
//               ...prev,
//               searchTerm: value,
//               currentPage: 1,
//             }))
//           }
//           footer={
//             filteredAssignedPatients.length > 0 ? (
//               <Pagination
//                 currentPage={assignedFilters.currentPage}
//                 totalItems={filteredAssignedPatients.length}
//                 itemsPerPage={assignedFilters.itemsPerPage}
//                 itemsPerPageOptions={PAGINATION_OPTIONS}
//                 onPageChange={(page) => setAssignedFilters((prev) => ({ ...prev, currentPage: page }))}
//                 onItemsPerPageChange={(items) =>
//                   setAssignedFilters((prev) => ({ ...prev, itemsPerPage: items, currentPage: 1 }))
//                 }
//               />
//             ) : null
//           }
//         >
//           <Table>
//             <TableHeader>
//               <TableRow className="bg-white">
//                 <TableHead position="first">Sr no.</TableHead>
//                 <TableHead>Patient Name</TableHead>
//                 <TableHead>Age/Gender</TableHead>
//                 <TableHead>Accommodation Details</TableHead>
//                 <TableHead>Doctor</TableHead>
//                 <TableHead>Diagnosis</TableHead>
//                 <TableHead>Nurse</TableHead>
//                 <TableHead>Status</TableHead>
//                 <TableHead position="last">Action</TableHead>
//               </TableRow>
//             </TableHeader>
//             <TableBody>
//               {paginatedAssignedPatients.length === 0 ? (
//                 <TableRow>
//                   <TableData
//                     colSpan={ASSIGNED_PATIENT_COLUMN_COUNT}
//                     className="py-12 text-center text-sm text-[#9CA3AF]"
//                   >
//                     No assigned patients found.
//                   </TableData>
//                 </TableRow>
//               ) : (
//                 paginatedAssignedPatients.map((patient, index) => {
//                   const srNo = String(
//                     (assignedFilters.currentPage - 1) * assignedFilters.itemsPerPage + index + 1
//                   ).padStart(2, "0");

//                   return (
//                     <TableRow key={patient.id} className="bg-white transition-colors hover:bg-[#F7FAF7]">
//                       <TableData variant="primary">{srNo}</TableData>
//                       <TableData>
//                         <div className="min-w-[160px]">
//                           <p className="font-medium text-[#262D3B]">{patient.patientName}</p>
//                               <p className="mt-0.5 text-xs text-[#262D3B]">{patient.patientId}</p>
//                         </div>
//                       </TableData>
//                       <TableData>
//                         <div className="min-w-[110px]">
//                           <p className="text-[#0B8C00]">Age: <span className="text-[#262D3B]">{patient.age}</span></p>
//                             <p className="text-[#0B8C00]">Gender: <span className="text-[#262D3B]">{patient.gender}</span></p>
//                         </div>
//                       </TableData>
//                       <TableData className="min-w-[220px]">{patient.accommodation}</TableData>
//                       <TableData>{patient.doctor}</TableData>
//                       <TableData className="min-w-[180px]">{patient.diagnosis}</TableData>
//                       <TableData>{patient.nurse}</TableData>
//                       <TableData>
//                         { patient.status === "Critical" ? (
//                           <button className="px-3 py-1 rounded-[30px] text-xs inline-block select-none transition-all duration-200 border border-[#93000A3D] text-[#93000A] bg-[#FFFFFF] font-normal">{patient.status}</button>
//                         ) : patient.status === "Stable" ? (
//                           <button className="px-3 py-1 rounded-[30px] text-xs inline-block select-none transition-all duration-200 border border-[#0B8C0033] text-[#0B8C00] bg-[#FFFFFF] font-normal">{patient.status}</button>
//                         ) : (
//                             <button className="px-3 py-1 rounded-[30px] text-xs inline-block select-none transition-all duration-200 border border-[#B4530933] text-[#B45309] bg-[#FFFFFF] font-normal">{patient.status}</button>
//                         )
//                         }
//                       </TableData>
//                       <TableData>
//                         <button
//                           type="button"
//                           className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
//                           aria-label={`View ${patient.patientName}`}
//                           onClick={() => setSelectedPatient(mapAssignedPatientRowToDetail(patient))}
//                         >
//                           <Image src="/icons/ViewEyeIcon.svg" alt="View" width={18} height={18} />
//                         </button>
//                       </TableData>
//                     </TableRow>
//                   );
//                 })
//               )}
//             </TableBody>
//           </Table>
//         </DashboardSection>

       
//         <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 mb-4">
//         {/* Medication Alerts */}
//           <section className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
//             <h2 className="text-base font-medium text-[#262D3B]">Medication Alerts</h2>
//             <div className="mt-5 space-y-4">
//                 {MEDICATION_ALERTS.map((alert) => {
//                     const statusColor = alert?.statusTone
//                     console.log("statusColor", statusColor,alert.statusLabel)
//                 return (
//                     <div
//                     key={alert.id}
//                     className="rounded-[16px] bg-[#FCFDFC] py-3 px-0 mb-0"
//                     >
//                     <div className="flex items-start gap-3">
//                         <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E8F5E9]">
//                         <Image src="/icons/DoctorBagIcon.svg" alt="" width={18} height={18} />
//                         </div>

//                         <div className="min-w-0 flex-1">
//                         <p className="text-sm font-semibold text-[#262D3B]">
//                             {alert.medicine}
//                         </p>

//                         <p className="mt-1 flex items-center gap-1 text-xs text-[#434956]">
//                             <span>
//                             {alert.bed} • {alert.nurse}
//                             </span>

//                             <span
//                             className={`text-xs font-normal ${
//                                 statusColor === "danger"
//                                 ? "text-[#93000A]"
//                                 : statusColor === "warning"
//                                 ? "text-[#EA580C]"
//                                 : statusColor === "neutral" ? "text-[#434956]" : ""
//                             }`}
//                             >
//                             • {alert.statusLabel}
//                             </span>
//                         </p>
//                         </div>
//                             {
//                             statusColor === "danger" ? (
//                                 <button className="inline-block rounded-[30px] border border-[#93000A3D] bg-white px-3 py-1 text-xs font-normal text-[#93000A]">
//                                     {alert.actionLabel}
//                                 </button>
//                             ) : statusColor === "warning" ? (
//                                 <button className="inline-block rounded-[30px]  border border-[#EA580C3D] bg-white px-3 py-1 text-xs font-normal text-[#EA580C]">
//                                     {alert.actionLabel}
//                                 </button>
//                             ) : statusColor === "neutral" ? (
//                                 <button className="inline-block text-[#3F3F3F] rounded-[30px] border border-[#EBECED] bg-[#EBECED80] px-3 py-1 text-xs font-normal text-[#9FA2AB]">
//                                     {alert.actionLabel}
//                                 </button>
//                             ) : null
//                             }
//                     </div>
//                     </div>
//                 );
//                 })}
//             </div>
//             <Button variant="outline" size="small" className="mt-5 w-full">
//               See More
//             </Button>
//           </section>

//         {/* Tasks Pending */}
//           <section className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
//             <div className="flex items-center justify-between gap-3">
//               <h2 className="text-base font-medium text-[#262D3B]">Tasks - Next 2 Hours</h2>
//               {/* <Badge variant="warning" className="font-medium">
//                 4 Tasks Pending
//               </Badge> */}
//               <button className="px-3 py-1 rounded-[30px] text-xs inline-block select-none transition-all duration-200 border border-[#EBECED] text-[#3F3F3F] bg-[#EBECED80] font-normal">
//                 4 Tasks Pending
//               </button>

//             </div>
//             {/* <div className="mt-5 divide-y divide-[#EDF3EA]"> */}
//                   <div className="mt-4">
//               {TASK_ITEMS.map((task) => (
//                 <button
//                   key={task.id}
//                   type="button"
//                   className="flex w-full items-center justify-between gap-3 py-3 px-0 mb-0 text-left transition-colors"
//                 >
//                   <div className="min-w-0">
//                     <p className="text-sm font-medium text-[#262D3B]">{task.title}</p>
//                     <p className="mt-1 text-xs text-[#434956]">{task.dueLabel}</p>
//                   </div>
//                   <ChevronRightIcon />
//                 </button>
//               ))}
//             </div>
//           </section>

//         {/* Colleagues */}
//           <section className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
//             <h2 className="text-base font-medium text-[#262D3B]">Colleagues</h2>
//             <div className="mt-4 space-y-4">
//               {COLLEAGUES.map((colleague) => (
//                 <div
//                   key={colleague.id}
//                   className="flex items-center justify-between px-0 py-3 mb-0"
//                 >
//                   <div>
//                     <p className="text-sm font-medium text-[#262D3B]">{colleague.name}</p>
//                     <p className="text-xs text-[#434956]">{colleague.patientCount} Patients</p>
//                   </div>
//                 </div>
//               ))}
//             </div>
//             <Button variant="outline" size="small" className="mt-5 w-full">
//               See More
//             </Button>
//           </section>
//         </div>

//         {/* Patient Alerts */}
//         <section className="rounded-2xl bg-white p-5 shadow-lg border border-gray-200">
//         <h2 className="mb-4 text-sm font-semibold text-gray-800">
//             Patient Alerts
//         </h2>

//         <div className="space-y-3">
//             {PATIENT_ALERTS.map((alert) => (
//             <div
//                 key={alert.id}
//                 className={`flex items-center justify-between rounded-xl border-l-4 px-2 py-3 ${
//                 alert.tone === "danger"
//                     ? "border-l-[#93000A] bg-[#93000A0D] mb-4"
//                     : "border-l-[#0B8C00] bg-[#0B8C000D]"
//                 }`}
//             >
//                 {/* Left */}
//                 <div className="flex items-start gap-2">
//                 <div
//                     className={`flex h-9 w-9 items-center justify-center rounded-full ${
//                     alert.tone === "danger"
//                         ? "bg-[#FDECEC] text-[#DC2626]"
//                         : "bg-[#EDF8ED] text-[#0B8C00]"
//                     }`}
//                 >
//                     {alert.tone === "danger" ? (
//                     //   <TrendingUp size={18} />
//                     <Image src="/icons/painLevel.svg" alt="Trending Up" width={28} height={17} />
//                     ) : (
//                     //   <FileText size={18} />
//                     <Image src="/icons/labresult.svg" alt="Trending Up" width={28} height={17} />
//                     )}
//                 </div>

//                 <div>
//                     <h3 className="text-sm font-semibold text-gray-800">
//                     {alert.title}
//                     </h3>

//                     <p className="mt-1 text-xs text-gray-500">
//                     {alert.description}
//                     </p>
//                 </div>
//                 </div>

//                 {/* Right */}
//                 <div className="flex items-center gap-3">
//                 <span className="text-xs text-gray-500">
//                     {alert.timeAgo}
//                 </span>

//                 <button
//                 className={`rounded-full px-4 py-2 text-xs font-normal ${
//                     alert.tone === "danger"
//                     ? "border border-[#0B8C003D] bg-white text-[#0B8C00]"
//                     : "bg-[#0B8C00] text-white"
//                 }`}
//                 >
//                 {alert.actionLabel}
//                 </button>
//                 </div>
//             </div>
//             ))}
//         </div>
//         </section>
//       </div>
//     </AppShell>
//   );
// }










"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
// import { keepPreviousData } from "@reduxjs/toolkit/query";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
  BackToPreviousPageButton,
  Badge,
  Button,
  FormSelectField,
  Pagination,
  SpinnerLoader,
  Table,
  TableBody,
  TableData,
  TableHead,
  TableHeader,
  TableRow,
  TableSearchInput,
  Tooltip,
  ViewAppointment,
} from "@/components/ui";
import { useDebounce } from "@/hooks/useDebounce";
import { useAppSelector } from "@/store/hooks";
import { selectUserName } from "@/store/slices/authSlice";
import {
  NurseAllocationView,
  type NurseAllocationPatient,
} from "@/components/ipd-head-nurse/NurseAllocationView";
import {
  AssignedPatientView,
  type AssignedPatientDetail,
} from "@/components/ipd-head-nurse/AssignedPatientView";
import { useIPDNurseResolvedBranchId } from "@/hooks/useBranchFilter";
import {
  useGetHeadNurseDashboardQuery,
  useGetAdmittedPatientListQuery,
  useGetMedicationAlertsQuery,
  useGetNursePatientCountQuery,
  useGetPatientAssignToNurseListQuery,
  useGetPendingOverdueTasksQuery,
  useLazyGetOnePatientDetailQuery,
  type AssignedPatientListItem,
  type AdmittedPatientListItem,
  type MedicationAlertItem,
} from "@/store/api/ipdHeadNurseAPI";
import { useGetPatientFilesQuery, useLazyGetPresignedUrlQuery } from "@/store/api/commonApi";
import { buildViewAppointmentData } from "@/lib/ipd-head-nurse/patientView";

// ─── Stat card component ──────────────────────────────────────────────────────
type DashboardStatCardProps = {
  label: string;
  value: string | number;
  iconSrc: string;
  isActive?: boolean;
  onClick?: () => void;
};

function DashboardStatCard({ label, value, iconSrc, isActive, onClick }: DashboardStatCardProps) {
  return (
    <div
      onClick={onClick}
      className={`rounded-[20px] py-3 px-5 flex justify-between items-center transition-all duration-200 select-none bg-white`}
    >
      <div>
        <p className={`text-sm font-medium mb-3 ${isActive ? "text-white" : "text-[#434956]"}`}>
          {label}
        </p>
        <h4 className={`font-bold text-[32px] leading-[120%] ${isActive ? "text-white" : "text-[#262D3B]"}`}>
          {value}
        </h4>
      </div>
      <div className={isActive ? "opacity-100" : ""}>
        <Image
          src={iconSrc}
          alt={label}
          width={28}
          height={28}
          style={isActive ? { filter: "brightness(0) invert(1)" } : undefined}
        />
      </div>
    </div>
  );
}

type AssignedPatientStatus = "Critical" | "Stable" | "Observation";

type TaskItem = {
  id: number;
  title: string;
  dueLabel: string;
};

type PatientAlertItem = {
  id: number;
  title: string;
  description: string;
  timeAgo: string;
  tone: "danger" | "success";
  actionLabel: string;
  actionVariant: "outline" | "primary";
};

type TableFilters = {
  currentPage: number;
  itemsPerPage: number;
};

const PATIENT_LIST_COLUMN_COUNT = 8;
const ASSIGNED_PATIENT_COLUMN_COUNT = 9;
const PAGINATION_OPTIONS = [6, 10, 20, 50];

const WARD_BED_STAT_LABELS = [
  { label: "Total Bed", key: "count" as const },
  { label: "Occupied", key: "occupied" as const },
  { label: "Vacant", key: "vacant" as const },
  { label: "Reserved", key: "reserved" as const },
  { label: "Under Cleaning", key: "underCleaning" as const },
];

const SUMMARY_CARDS = [
  { id: "pending-tasks", title: "Pending Tasks", iconSrc: "/icons/Hourglass.svg" },
  { id: "admissions-today", title: "Admissions Today", iconSrc: "/icons/addPatient.svg" },
  { id: "overdue-medicines", title: "Overdue Medicines", iconSrc: "/icons/Warning.svg" },
  { id: "ready-discharge", title: "Ready for Discharge", iconSrc: "/icons/exitIcon.svg" },
] as const;

const TASK_ITEMS: TaskItem[] = [
  { id: 1, title: "Vital Signs for Bed 102", dueLabel: "Due: Immediate" },
  { id: 2, title: "Wound Dressing for Bed 205", dueLabel: "Due: 30 min" },
  { id: 3, title: "Medication Round - Ward B", dueLabel: "Due: 10 min" },
  { id: 4, title: "Patient Hygiene - Bed 108", dueLabel: "Due: 25 min" },
];

const PATIENT_ALERTS: PatientAlertItem[] = [
  // {
  //   id: 1,
  //   title: "Bed 205: Pain Level Spike",
  //   description: "Patient reports increased discomfort. Pain score moved from 4 to 8.",
  //   timeAgo: "4m ago",
  //   tone: "danger",
  //   actionLabel: "Acknowledged",
  //   actionVariant: "outline",
  // },
  {
    id: 2,
    title: "Bed 102: Lab Results Ready",
    description: "Full Blood Count and Electrolyte panel results are now available.",
    timeAgo: "4m ago",
    tone: "success",
    actionLabel: "View Lab",
    actionVariant: "primary",
  },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatAssignedPatientGender(gender: string) {
  if (!gender) return "N/A";
  return gender.charAt(0).toUpperCase() + gender.slice(1);
}

function formatAssignedPatientAge(age: string) {
  if (!age) return "N/A";
  return age.toUpperCase().endsWith("Y") ? age : `${age}Y`;
}

function formatAssignedPatientAccommodation(patient: AssignedPatientListItem) {
  const parts = [
    patient.roomNumber ? `Room: ${patient.roomNumber}` : null,
    patient.bedNumber ? `Bed: ${patient.bedNumber}` : null,
    patient.roomType ? `Type: ${patient.roomType}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" | ") : "N/A";
}

function mapAssignedPatientStatus(status: string): AssignedPatientStatus {
  const normalized = status?.toLowerCase();
  if (normalized === "critical") return "Critical";
  if (normalized === "observation") return "Observation";
  return "Stable";
}

function mapAssignedListItemToDetail(patient: AssignedPatientListItem): AssignedPatientDetail {
  return {
    id: patient.id,
    patientTitle:patient.patientTitle,
    patientName: patient.patientName,
    patientUhid: patient.uhid,
    age: formatAssignedPatientAge(patient.age).replace(/Y$/i, " years"),
    gender: formatAssignedPatientGender(patient.gender),
    bedNumber: patient.bedNumber || "N/A",
    roomNumber: patient.roomNumber || "N/A",
    admissionDate: formatAdmittedPatientDate(patient.admissionDate),
    treatingDoctor: patient.doctorName || "N/A",
    diagnosis: patient.diagnosis || "N/A",
    patientType: patient.type || "Normal Patient",
  };
}

function formatAdmittedPatientDate(dateValue: string) {
  if (!dateValue) return "N/A";
  return new Date(dateValue).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatAdmittedPatientLastVisit(dateValue: string) {
  if (!dateValue) return "N/A";
  return new Date(dateValue).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatAdmittedPatientBed(patient: AdmittedPatientListItem) {
  if (patient.bedNumber) return `Bed ${patient.bedNumber}`;
  if (patient.roomNumber) return `Room ${patient.roomNumber}`;
  return "N/A";
}

function isUrgentAdmission(patient: AdmittedPatientListItem) {
  return patient.admissionType?.toLowerCase() === "immediate";
}

function mapMedicationStatusTone(status: string): "danger" | "warning" | "neutral" {
  const normalized = status?.toLowerCase();
  if (normalized === "overdue") return "danger";
  if (normalized === "due" || normalized === "due_now") return "warning";
  return "neutral";
}

function medicationActionLabel(status: string): "ADMINISTER" | "WAIT" {
  return status?.toLowerCase() === "overdue" ? "ADMINISTER" : "WAIT";
}

function DashboardSection({
  title,
  searchValue,
  onSearchChange,
  children,
  footer,
}: {
  title: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="w-full rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] mb-4">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-medium leading-[120%] text-[#262D3B]">{title}</h2>
        <div className="w-full sm:w-[300px] sm:shrink-0">
          <TableSearchInput value={searchValue} onChange={onSearchChange} placeholder="Search Here..." />
        </div>
      </div>
      {children}
      {footer}
    </section>
  );
}

function ChevronRightIcon() {
  return (
 <svg
  width="16"
  height="16"
  viewBox="0 0 16 16"
  fill="none"
  className="shrink-0 text-[#1F1F1F]"
>
  <path
    d="M6 4L10 8L6 12"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
</svg>
    // <Image src="/icons/rightArrow.svg" alt="rightArrow" width={18} height={18} />
  );
}


const TRUNCATED_TABLE_CELL_WIDTH = 150;
function TruncatedTableCell({ text }: { text: string }) {
  const value = text?.trim() ? text.trim() : "N/A";
  const textRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;

    const checkTruncation = () => {
      setIsTruncated(element.scrollWidth > element.clientWidth + 1);
    };

    checkTruncation();

    const observer = new ResizeObserver(checkTruncation);
    observer.observe(element);
    return () => observer.disconnect();
  }, [value]);

  return (
    <Tooltip
      position="top"
      maxWidth={360}
      disabled={!isTruncated}
      className="!overflow-visible !py-2.5"
      content={
        <p className="m-0 max-w-[340px] whitespace-normal break-words text-left text-xs leading-[1.6] text-[#262D3B]">
          {value}
        </p>
      }
    >
      <div
        className="flex min-w-0 items-center"
        style={{ width: TRUNCATED_TABLE_CELL_WIDTH, maxWidth: TRUNCATED_TABLE_CELL_WIDTH }}
      >
        <span
          ref={textRef}
          className="min-w-0 flex-1 overflow-hidden whitespace-nowrap"
        >
          {value}
        </span>
        {isTruncated ? <span className="shrink-0 pl-1.5 text-[#434956]">...</span> : null}
      </div>
    </Tooltip>
  );
}

export default function IPDHeadNursePage() {
  const userName = useAppSelector(selectUserName) ?? "";
  const [currentPage, setCurrentPage] = useState(1);
  const [allocationPatient, setAllocationPatient] = useState<NurseAllocationPatient | null>(null);
  const [selectedAssignedPatient, setSelectedAssignedPatient] =
    useState<AssignedPatientDetail | null>(null);
  const [viewPatientMode, setViewPatientMode] = useState(false);
  const [fetchedPatientData, setFetchedPatientData] = useState<Record<string, unknown> | null>(null);
  // const [loadingPatientId, setLoadingPatientId] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [showAllMedicationAlerts, setShowAllMedicationAlerts] = useState(false);
  const [showAllTasks, setShowAllTasks] = useState(false);

  // const [getOnePatientDetail] = useLazyGetOnePatientDetailQuery();
  // const [getPresignedUrl] = useLazyGetPresignedUrlQuery();

  // const patientUhid =
  //   (fetchedPatientData?.appointmentDetail as { uhid?: string } | undefined)?.uhid ||
  //   (fetchedPatientData?.patientDetails as { uhid?: string } | undefined)?.uhid ||
  //   "";

  // const { data: patientFilesResponse } = useGetPatientFilesQuery(
  //   { uhid: patientUhid },
  //   { skip: !viewPatientMode || !patientUhid, refetchOnMountOrArgChange: true }
  // );

  const {
    selectedBranchFilter: selectedBranch,
    setSelectedBranchFilter: setSelectedBranch,
    branchFilterOptions: hookBranchFilterOptions,
    isLoadingBranches: isLoadingBranchFilter,
    isBranchFilterDisabled,
    resolvedFilterBranchId,
  } = useIPDNurseResolvedBranchId();

  // const {
  //   data: dashboardRes,
  //   isLoading: isDashboardLoading,
  //   isFetching: isDashboardFetching,
  // } = useGetHeadNurseDashboardQuery(
  //   { branchId: resolvedFilterBranchId! },
  //   { skip: resolvedFilterBranchId == null, refetchOnMountOrArgChange: true }
  // );

  const {
    data: nursePatientCountRes,
    isLoading: isNursePatientCountLoading,
    isFetching: isNursePatientCountFetching,
    refetch: refetchNursePatientCount,
  } = useGetNursePatientCountQuery(
    { branchId: resolvedFilterBranchId! },
    { skip: resolvedFilterBranchId == null, refetchOnMountOrArgChange: true }
  );

  const colleagues = useMemo(
    () =>
      (nursePatientCountRes?.data ?? []).map((nurse) => ({
        id: nurse.nurseId,
        name: nurse.name,
        patientCount: Number(nurse.totalPatients) || 0,
      })),
    [nursePatientCountRes?.data]
  );

  const visibleColleagues = showAll ? colleagues : colleagues.slice(0, 4);
  const isColleaguesLoading = isNursePatientCountLoading || isNursePatientCountFetching;

  const {
    data: medicationAlertsRes,
    isLoading: isMedicationAlertsLoading,
    isFetching: isMedicationAlertsFetching,
    refetch: refetchMedicationAlerts,
  } = useGetMedicationAlertsQuery(
    { branchId: resolvedFilterBranchId! },
    { skip: resolvedFilterBranchId == null, refetchOnMountOrArgChange: true }
  );

  const medicationAlerts = useMemo(
    () => medicationAlertsRes?.data ?? [],
    [medicationAlertsRes?.data]
  );
  const visibleMedicationAlerts = showAllMedicationAlerts
    ? medicationAlerts
    : medicationAlerts.slice(0, 4);
  const isMedicationAlertsTableLoading = isMedicationAlertsLoading || isMedicationAlertsFetching;

    const {
      data: pendingOverdueTasksRes,
      isLoading: isPendingOverdueTasksLoading,
      isFetching: isPendingOverdueTasksFetching,
      refetch: refetchPendingOverdueTasks,
    } = useGetPendingOverdueTasksQuery(
      { branchId: resolvedFilterBranchId! },
      { skip: resolvedFilterBranchId == null, refetchOnMountOrArgChange: true }
    );
  
    const pendingOverdueTasks = useMemo(
      () => pendingOverdueTasksRes?.data ?? [],
      [pendingOverdueTasksRes?.data]
    );
    const visiblePendingOverdueTasks = showAllTasks
      ? pendingOverdueTasks
      : pendingOverdueTasks.slice(0, 4);
    const isPendingOverdueTasksLoadingState =
      isPendingOverdueTasksLoading || isPendingOverdueTasksFetching;
  

  // const wardBedStats = useMemo(() => {
  //   const beds = dashboardRes?.data?.beds;
  //   const isLoading = isDashboardLoading || isDashboardFetching;

  //   return WARD_BED_STAT_LABELS.map((stat) => ({
  //     label: stat.label,
  //     value: beds ? String(beds[stat.key]) : isLoading ? "..." : "0",
  //   }));
  // }, [dashboardRes?.data?.beds, isDashboardLoading, isDashboardFetching]);

  // const summaryCards = useMemo(() => {
  //   const data = dashboardRes?.data;
  //   const isLoading = isDashboardLoading || isDashboardFetching;

  //   const getValue = (count: number | undefined) => {
  //     if (data) return String(count ?? 0);
  //     return isLoading ? "..." : "0";
  //   };

  //   return SUMMARY_CARDS.map((card) => {
  //     let value = "0";

  //     if (card.id === "pending-tasks") {
  //       value = getValue(data?.pendingTaskCount);
  //     } else if (card.id === "admissions-today") {
  //       value = getValue(data?.admissionsToday?.count);
  //     } else if (card.id === "overdue-medicines") {
  //       value = getValue(data?.overdueMedicineCount);
  //     } else if (card.id === "ready-discharge") {
  //       value = getValue(data?.readyForDischargeCount);
  //     }

  //     return { ...card, value };
  //   });
  // }, [dashboardRes?.data, isDashboardLoading, isDashboardFetching]);

  const [patientListFilters, setPatientListFilters] = useState<TableFilters>({
    currentPage: 1,
    itemsPerPage: 6,
  });
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [patientSortBy, setPatientSortBy] = useState("patientName");
  const [patientSortOrder, setPatientSortOrder] = useState<"ASC" | "DESC">("ASC");
  const debouncedPatientSearch = useDebounce(patientSearchTerm, 500);

  useEffect(() => {
    setPatientListFilters((prev) => ({ ...prev, currentPage: 1 }));
  }, [debouncedPatientSearch, selectedBranch, patientSortBy, patientSortOrder]);

  // const admittedPatientsParams = useMemo(() => {
  //   if (resolvedFilterBranchId == null) return null;

  //   return {
  //     branchId: resolvedFilterBranchId,
  //     search: debouncedPatientSearch.trim() || undefined,
  //     sortBy: patientSortBy,
  //     order: patientSortOrder,
  //     page: patientListFilters.currentPage,
  //     limit: patientListFilters.itemsPerPage,
  //   };
  // }, [
  //   resolvedFilterBranchId,
  //   debouncedPatientSearch,
  //   patientSortBy,
  //   patientSortOrder,
  //   patientListFilters.currentPage,
  //   patientListFilters.itemsPerPage,
  // ]);

  // const {
  //   data: admittedPatientsRes,
  //   isLoading: isAdmittedPatientsLoading,
  //   isFetching: isAdmittedPatientsFetching,
  // } = useGetAdmittedPatientListQuery(admittedPatientsParams!, {
  //   skip: admittedPatientsParams == null,
  //   refetchOnMountOrArgChange: true,
  // });

  // const admittedPatients = admittedPatientsRes?.data ?? [];
  // const admittedPatientsTotal = admittedPatientsRes?.total ?? 0;
  // const isAdmittedPatientsTableLoading = isAdmittedPatientsLoading || isAdmittedPatientsFetching;

  const [assignedFilters, setAssignedFilters] = useState({
    currentPage: 1,
    itemsPerPage: 6,
  });
  const [assignedSearchTerm, setAssignedSearchTerm] = useState("");
  const [assignedSortBy, setAssignedSortBy] = useState("patientName");
  const [assignedSortOrder, setAssignedSortOrder] = useState<"ASC" | "DESC">("ASC");
  const debouncedAssignedSearch = useDebounce(assignedSearchTerm, 500);

  useEffect(() => {
    setAssignedFilters((prev) => ({ ...prev, currentPage: 1 }));
  }, [debouncedAssignedSearch, selectedBranch, assignedSortBy, assignedSortOrder]);

  const assignedPatientsParams = useMemo(() => {
    if (resolvedFilterBranchId == null) return null;

    return {
      branchId: resolvedFilterBranchId,
      search: debouncedAssignedSearch.trim() || undefined,
      sortBy: assignedSortBy,
      order: assignedSortOrder,
      page: assignedFilters.currentPage,
      limit: assignedFilters.itemsPerPage,
    };
  }, [
    resolvedFilterBranchId,
    debouncedAssignedSearch,
    assignedSortBy,
    assignedSortOrder,
    assignedFilters.currentPage,
    assignedFilters.itemsPerPage,
  ]);

  const {
    data: assignedPatientsRes,
    isLoading: isAssignedPatientsLoading,
    refetch: refetchAssignedPatients,
  } = useGetPatientAssignToNurseListQuery(assignedPatientsParams!, {
    skip: assignedPatientsParams == null,
    refetchOnMountOrArgChange: true,
    // placeholderData: keepPreviousData,
  });

  const assignedPatients = assignedPatientsRes?.data ?? [];
  const assignedPatientsTotal = assignedPatientsRes?.total ?? 0;
  const isAssignedPatientsTableLoading = isAssignedPatientsLoading;

  // const patientFilesItems = useMemo(() => {
  //   const files = patientFilesResponse?.data;
  //   if (!Array.isArray(files)) return [];

  //   return files.map((file) => {
  //     const formattedDate = file.createdAt
  //       ? new Date(file.createdAt).toLocaleDateString("en-GB", {
  //           day: "2-digit",
  //           month: "short",
  //           year: "numeric",
  //         })
  //       : "";

  //     return {
  //       name: file.fileName || "File",
  //       size: `${file.fileType || "Document"} • ${formattedDate}`,
  //       onClick: async () => {
  //         try {
  //           const result = await getPresignedUrl({ key: file.path }).unwrap();
  //           const signedUrl = result?.data?.signedUrl;
  //           if (signedUrl) {
  //             window.open(signedUrl, "_blank", "noopener,noreferrer");
  //           }
  //         } catch {
  //           // ignore file open errors
  //         }
  //       },
  //       actionIconSrc: "/icons/ViewEyeIcon.svg",
  //       actionIconAlt: "View File",
  //     };
  //   });
  // }, [patientFilesResponse, getPresignedUrl]);

  // const handleViewPatient = async (patientId: number) => {
  //   setLoadingPatientId(patientId);
  //   try {
  //     const res = await getOnePatientDetail(patientId).unwrap();
  //     if (res?.success) {
  //       setFetchedPatientData(res.data as Record<string, unknown>);
  //       setViewPatientMode(true);
  //     }
  //   } finally {
  //     setLoadingPatientId(null);
  //   }
  // };

  if (viewPatientMode && fetchedPatientData) {
    // const viewData = buildViewAppointmentData(fetchedPatientData);

    return (
      <AppShell>
        <div className="flex flex-col gap-6">
          <div className="flex items-start justify-between">
            <PageHeading title="View" />
            <BackToPreviousPageButton
              text="Back"
              onClick={() => {
                setViewPatientMode(false);
                setFetchedPatientData(null);
              }}
            />
          </div>

          {/* <ViewAppointment
            uhid={patientUhid || undefined}
            appointmentItems={viewData.appointmentItems}
            walletRemainingAmount={viewData.remainingAmount}
            walletDetails={viewData.walletDetails}
            referralItems={viewData.referralItems}
            patientName={viewData.patientName}
            patientSubtitle={viewData.patientSubtitle}
            patientBadges={viewData.patientBadges}
            patientInfoItems={viewData.patientInfoItems}
            showVitals={true}
            vitalsItems={viewData.vitalsItems}
            timelineItems={viewData.timelineItems.length > 0 ? viewData.timelineItems : undefined}
            healthCardNo={viewData.healthCardNo}
            medicalItems={viewData.medicalItems}
            fileItems={patientFilesItems}
            otherInfoItems={viewData.otherInfoItems}
          /> */}
        </div>
      </AppShell>
    );
  }

  if (selectedAssignedPatient) {
    return (
      <AppShell>
        <AssignedPatientView
          patient={selectedAssignedPatient}
          // onBack={() => setSelectedAssignedPatient(null)}
            onBack={() => {
            setSelectedAssignedPatient(null);
            // void refetchDashboard();
            void refetchPendingOverdueTasks();
            void refetchNursePatientCount();
            void refetchMedicationAlerts();
            // void refetchAdmittedPatients();
            void refetchAssignedPatients();
          }}
        />
      </AppShell>
    );
  }

  if (allocationPatient) {
    return (
      <AppShell>
        <NurseAllocationView
          patient={allocationPatient}
          branchId={resolvedFilterBranchId}
          assignMode="assignNurse"
          onBack={() => setAllocationPatient(null)}
          onConfirm={() => setAllocationPatient(null)}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[22px] font-semibold leading-tight text-[#262D3B] md:text-[24px] lg:text-[26px]">
              {getGreeting()}, {userName}
            </h1>
            {/* <p className="mt-0.5 text-sm text-[#525763] font-medium text-[13px] leading-[18px]">
              Ward 4B • Intensive Care Unit • Shift Remaining: 6h 42m • Handover Due: 16:00
            </p> */}
          </div>

          <div className="w-full shrink-0 sm:w-[280px]">
            <FormSelectField
              label=""
              hideLabel
              options={hookBranchFilterOptions}
              value={selectedBranch}
              onChange={(value) => {
                setSelectedBranch(Array.isArray(value) ? value[0] : value || "");
                setCurrentPage(1);
              }}
              placeholder={isLoadingBranchFilter ? "Loading branches..." : "Select Branch"}
              mode="single"
              background="normal"
              width="100%"
              disabled={isBranchFilterDisabled || isLoadingBranchFilter}
            />
          </div>
        </div>

        {/* <section className="rounded-[20px] border border-[#EBECED] bg-white px-6 py-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] mb-4">
        <div className="border-b border-[#EBECED] pb-4">
          <h2 className="text-base font-medium text-[#262D3B]">
            Ward Bed Occupancy
          </h2>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
          {wardBedStats.map((stat) => (
            <div key={stat.label} className="min-w-0">
              <p className="text-sm text-[#434956]">{stat.label}</p>
              <p className="mt-2 text-[14px] font-bold leading-none text-[#262D3B]">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
        </section> */}

        {/* <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-4">
             {summaryCards.map((card) => (
            <DashboardStatCard
              key={card.id}
              label={card.title}
              value={card.value}
              iconSrc={card.iconSrc}
            />
          ))}
        </div> */}

        {/* <DashboardSection
          title="Patient List"
          searchValue={patientSearchTerm}
          onSearchChange={(value) => {
            setPatientSearchTerm(value);
            setPatientListFilters((prev) => ({ ...prev, currentPage: 1 }));
          }}
          footer={
            admittedPatientsTotal > 0 ? (
              <Pagination
                currentPage={patientListFilters.currentPage}
                totalItems={admittedPatientsTotal}
                itemsPerPage={patientListFilters.itemsPerPage}
                itemsPerPageOptions={PAGINATION_OPTIONS}
                onPageChange={(page) => setPatientListFilters((prev) => ({ ...prev, currentPage: page }))}
                onItemsPerPageChange={(items) =>
                  setPatientListFilters((prev) => ({ ...prev, itemsPerPage: items, currentPage: 1 }))
                }
              />
            ) : null
          }
        >
          <Table>
            <TableHeader>
              <TableRow className="bg-white">
                <TableHead position="first">Sr no.</TableHead>
                <TableHead>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1"
                    onClick={() => {
                      setPatientSortBy("patientName");
                      setPatientSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"));
                      setPatientListFilters((prev) => ({ ...prev, currentPage: 1 }));
                    }}
                  >
                    Patient Name
                    <Image src="/icons/SortByAscDes.svg" alt="Sort" width={14} height={14} />
                  </button>
                </TableHead>
                <TableHead>Patient Type</TableHead>
                <TableHead>OPD Doctor</TableHead>
                <TableHead>Bed</TableHead>
                <TableHead>Last Visit</TableHead>
                <TableHead>Date</TableHead>
                <TableHead position="last">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isAdmittedPatientsTableLoading ? (
                <TableRow>
                  <TableData colSpan={PATIENT_LIST_COLUMN_COUNT} className="py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-sm text-[#9CA3AF]">
                      <SpinnerLoader size={18} />
                      Loading patients...
                    </div>
                  </TableData>
                </TableRow>
              ) : admittedPatients.length === 0 ? (
                <TableRow>
                  <TableData colSpan={PATIENT_LIST_COLUMN_COUNT} className="py-12 text-center text-sm text-[#9CA3AF]">
                    No patients found.
                  </TableData>
                </TableRow>
              ) : (
                admittedPatients.map((patient, index) => {
                  const srNo = String(
                    (patientListFilters.currentPage - 1) * patientListFilters.itemsPerPage + index + 1
                  ).padStart(2, "0");
                  const bedLabel = formatAdmittedPatientBed(patient);

                  return (
                    <TableRow key={patient.id} className="bg-white transition-colors hover:bg-[#F7FAF7]">
                      <TableData variant="primary">{srNo}</TableData>
                      <TableData>
                        <div className="min-w-[160px]">
                          <p className="font-medium text-[#262D3B]">{patient.patientName}</p>
                          <p className="mt-0.5 text-xs text-[#262D3B]">{patient.uhid}</p>
                        </div>
                      </TableData>
                      <TableData>
                        <button className="inline-block select-none rounded-full border border-[#0B8C0033] bg-[#FFFFFF] px-3 py-1 text-xs font-normal text-[#0B8C00] transition-all duration-200">
                          {patient.type?.toUpperCase() || "N/A"}
                        </button>
                      </TableData>
                      <TableData>{patient.doctorName || "N/A"}</TableData>
                      <TableData>{bedLabel}</TableData>
                      <TableData>
                        <div className="flex items-center gap-2">
                          {isUrgentAdmission(patient) ? (
                            <button className="inline-block select-none rounded-full border border-[#93000A3D] bg-[#FFFFFF] px-3 py-1 text-xs font-normal text-[#93000A] transition-all duration-200">
                              Urgent
                            </button>
                          ) : (
                            <span className="text-sm text-gray-600">
                              Last visit: {formatAdmittedPatientLastVisit(patient.lastVisit)}
                            </span>
                          )}
                        </div>
                      </TableData>
                      <TableData>{formatAdmittedPatientDate(patient.admissionDate)}</TableData>
                      <TableData>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="primary"
                            size="xsmall"
                            className="!min-w-0 whitespace-nowrap"
                            onClick={() =>
                              setAllocationPatient({
                                id: patient.id,
                                patientName: patient.patientName,
                                bed: bedLabel,
                                packageEndDate: patient.packageEndDate,
                              })
                            }
                          >
                            Assign Nurse
                          </Button>
                          <Button
                            variant="outline"
                            size="xsmall"
                            className="!min-w-0 whitespace-nowrap"
                            disabled={loadingPatientId === patient.id}
                            onClick={() => handleViewPatient(patient.id)}
                          >
                            {loadingPatientId === patient.id ? "Loading..." : "View"}
                          </Button>
                        </div>
                      </TableData>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </DashboardSection> */}


           <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 mb-4">
        {/* Medication Alerts */}
          {/* <section className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
            <h2 className="text-base font-medium text-[#262D3B]">Medication Alerts</h2>
            <div className="mt-5 space-y-4">
                {MEDICATION_ALERTS.map((alert) => {
                    const statusColor = alert?.statusTone
                    console.log("statusColor", statusColor,alert.statusLabel)
                return (
                    <div
                    key={alert.id}
                    className="rounded-[16px] bg-[#FCFDFC] py-3 px-0 mb-0"
                    >
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E8F5E9]">
                        <Image src="/icons/DoctorBagIcon.svg" alt="" width={18} height={18} />
                        </div>

                        <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#262D3B]">
                            {alert.medicine}
                        </p>

                        <p className="mt-1 flex items-center gap-1 text-xs text-[#434956]">
                            <span>
                            {alert.bed} • {alert.nurse}
                            </span>

                            <span
                            className={`text-xs font-normal ${
                                statusColor === "danger"
                                ? "text-[#93000A]"
                                : statusColor === "warning"
                                ? "text-[#EA580C]"
                                : statusColor === "neutral" ? "text-[#434956]" : ""
                            }`}
                            >
                            • {alert.statusLabel}
                            </span>
                        </p>
                        </div>
                            {
                            statusColor === "danger" ? (
                                <button className="inline-block rounded-[30px] border border-[#93000A3D] bg-white px-3 py-1 text-xs font-normal text-[#93000A]">
                                    {alert.actionLabel}
                                </button>
                            ) : statusColor === "warning" ? (
                                <button className="inline-block rounded-[30px]  border border-[#EA580C3D] bg-white px-3 py-1 text-xs font-normal text-[#EA580C]">
                                    {alert.actionLabel}
                                </button>
                            ) : statusColor === "neutral" ? (
                                <button className="inline-block text-[#3F3F3F] rounded-[30px] border border-[#EBECED] bg-[#EBECED80] px-3 py-1 text-xs font-normal text-[#9FA2AB]">
                                    {alert.actionLabel}
                                </button>
                            ) : null
                            }
                    </div>
                    </div>
                );
                })}
            </div>
            <Button variant="outline" size="small" className="mt-5 w-full">
              See More
            </Button>
          </section> */}

          <section className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
            <h2 className="text-base font-medium text-[#262D3B]">Medication Alerts</h2>
          <div
            className={`mt-5 space-y-4 ${
              showAllMedicationAlerts ? "max-h-[320px] overflow-y-auto pr-2" : ""
            }`}
          >
            {isMedicationAlertsTableLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-[#9CA3AF]">
                <SpinnerLoader size={18} />
                Loading medication alerts...
              </div>
            ) : visibleMedicationAlerts.length === 0 ? (
              <p className="py-6 text-center text-sm text-[#9CA3AF]">No medication alerts found.</p>
            ) : (
            visibleMedicationAlerts.map((alert: MedicationAlertItem) => {
              const statusColor = mapMedicationStatusTone(alert.status);

              return (
                <div
                  key={alert.id}
                  className="rounded-[16px] bg-[#FCFDFC] px-0 py-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E8F5E9]">
                      <Image
                        src="/icons/DoctorBagIcon.svg"
                        alt=""
                        width={18}
                        height={18}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#262D3B]">
                        {alert.medicineName}
                      </p>

                      <p className="mt-1 flex items-center gap-1 text-xs text-[#434956]">
                        <span>
                          Bed {alert.bedNumber} • {alert.nurseName}
                        </span>

                        <span
                          className={`text-xs font-normal ${
                            statusColor === "danger"
                              ? "text-[#93000A]"
                              : statusColor === "warning"
                              ? "text-[#EA580C]"
                              : statusColor === "neutral"
                              ? "text-[#434956]"
                              : ""
                          }`}
                        >
                          • {alert.timeStatus}
                        </span>
                      </p>
                    </div>

                    {statusColor === "danger" ? (
                      <button className="inline-block rounded-[30px] border border-[#93000A3D] bg-white px-3 py-1 text-xs font-normal text-[#93000A]">
                        {medicationActionLabel(alert.status)}
                      </button>
                    ) : statusColor === "warning" ? (
                      <button className="inline-block rounded-[30px] border border-[#EA580C3D] bg-white px-3 py-1 text-xs font-normal text-[#EA580C]">
                        {medicationActionLabel(alert.status)}
                      </button>
                    ) : statusColor === "neutral" ? (
                      <button className="inline-block rounded-[30px] border border-[#EBECED] bg-[#EBECED80] px-3 py-1 text-xs font-normal text-[#9FA2AB]">
                        {medicationActionLabel(alert.status)}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            }))}
          </div>
            {/* <Button variant="outline" size="small" className="mt-5 w-full">
              See More
            </Button> */}
           {medicationAlerts.length > 4 && (
            <Button
                variant="outline"
                size="small"
                className="mt-5 w-full"
                onClick={() =>
                  setShowAllMedicationAlerts(!showAllMedicationAlerts)
                }
              >
                {showAllMedicationAlerts ? "See Less" : "See More"}
              </Button>
            )}
          </section>


        {/* Tasks Pending */}
          <section className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-medium text-[#262D3B]">Tasks - Prev 2 Hours</h2>
              <button className="px-3 py-1 rounded-[30px] text-xs inline-block select-none transition-all duration-200 border border-[#EBECED] text-[#3F3F3F] bg-[#EBECED80] font-normal">
                {pendingOverdueTasks.length} Tasks Pending
              </button>
            </div>
            <div className="mt-4">
              {isPendingOverdueTasksLoadingState ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-[#9CA3AF]">
                  <SpinnerLoader size={18} />
                  Loading tasks...
                </div>
              ) : visiblePendingOverdueTasks.length === 0 ? (
                <p className="py-6 text-center text-sm text-[#9CA3AF]">No pending tasks found.</p>
              ) : (
                visiblePendingOverdueTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex w-full items-center justify-between gap-3 py-3 px-0 mb-0 text-left"
                  >
                     <div className="min-w-0">
                      {/* <p className="text-sm font-medium text-[#262D3B]">{task.taskName}</p> */}
                      <p className="text-sm font-medium text-[#262D3B]">{task.taskName}</p>
                      <Tooltip content={`${task.patientTitle} ${task.patientName}`}>
                        <p className="mt-1 w-full truncate whitespace-nowrap text-xs text-[#434956]">
                          Patient Name: {task.patientTitle} {task.patientName}
                        </p>
                      </Tooltip>
                      <div className="mt-1 flex flex-wrap items-start gap-1 text-xs text-[#434956]">
                        <p className="line-clamp-2 max-w-[140px] text-xs text-[#434956]"> Nurse Name: {task.nurseName}</p>
                        <p className="text-xs text-[#434956]">• Bed {task.bedNumber}</p>
                        <p className="text-xs text-[#434956]">• {task.time}</p>
                      </div>
                    </div>
                    <Badge variant={task.status === "overdue" ? "danger" : "warning"} className="capitalize">
                      {task.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
            {pendingOverdueTasks.length > 4 && (
              <Button
                variant="outline"
                size="small"
                className="mt-5 w-full"
                onClick={() => setShowAllTasks(!showAllTasks)}
              >
                {showAllTasks ? "See Less" : "See More"}
              </Button>
            )}
          </section>

        {/* Colleagues */}
        <section className="rounded-[20px] border border-[#E3EEE1] bg-white p-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
            <h2 className="text-base font-medium text-[#262D3B]">Colleagues</h2>

            <div
              className={`mt-4 space-y-4 ${
                showAll ? "max-h-[320px] overflow-y-auto pr-2" : ""
              }`}
            >
              {isColleaguesLoading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-[#9CA3AF]">
                  <SpinnerLoader size={18} />
                  Loading colleagues...
                </div>
              ) : visibleColleagues.length === 0 ? (
                <p className="py-6 text-center text-sm text-[#9CA3AF]">No colleagues found.</p>
              ) : (
                visibleColleagues.map((colleague) => (
                  <div
                    key={colleague.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#262D3B]">
                        {colleague.name}
                      </p>
                      <p className="text-xs text-[#434956]">
                        {colleague.patientCount} Patients
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {colleagues.length > 4 && (
            <Button
              variant="outline"
              size="small"
              className="mt-5 w-full"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? "See Less" : "See More"}
            </Button>
          )}
        </section>
        </div>

        <DashboardSection
          title="Assigned Patients"
          searchValue={assignedSearchTerm}
          onSearchChange={(value) => {
            setAssignedSearchTerm(value);
            setAssignedFilters((prev) => ({ ...prev, currentPage: 1 }));
          }}
          footer={
            assignedPatientsTotal > 0 ? (
              <Pagination
                currentPage={assignedFilters.currentPage}
                totalItems={assignedPatientsTotal}
                itemsPerPage={assignedFilters.itemsPerPage}
                itemsPerPageOptions={PAGINATION_OPTIONS}
                onPageChange={(page) => setAssignedFilters((prev) => ({ ...prev, currentPage: page }))}
                onItemsPerPageChange={(items) =>
                  setAssignedFilters((prev) => ({ ...prev, itemsPerPage: items, currentPage: 1 }))
                }
              />
            ) : null
          }
        >
          <Table>
            <TableHeader>
              <TableRow className="bg-white">
                <TableHead position="first">Sr no.</TableHead>
                <TableHead>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 cursor-pointer"
                    onClick={() => {
                      setAssignedSortBy("patientName");
                      setAssignedSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"));
                      setAssignedFilters((prev) => ({ ...prev, currentPage: 1 }));
                    }}
                  >
                    Patient Name
                    <Image src="/icons/SortByAscDes.svg" alt="Sort" width={12} height={12} />
                  </button>
                </TableHead>
                <TableHead>Age/Gender</TableHead>
                <TableHead>Accommodation Details</TableHead>
                <TableHead>Doctor Name</TableHead>
                <TableHead>Diagnosis</TableHead>
                <TableHead>Nurse Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead position="last">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isAssignedPatientsTableLoading ? (
                <TableRow>
                  <TableData colSpan={ASSIGNED_PATIENT_COLUMN_COUNT} className="py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-sm text-[#9CA3AF]">
                      <SpinnerLoader size={18} />
                      Loading assigned patients...
                    </div>
                  </TableData>
                </TableRow>
              ) : assignedPatients.length === 0 ? (
                <TableRow>
                  <TableData
                    colSpan={ASSIGNED_PATIENT_COLUMN_COUNT}
                    className="py-12 text-center text-sm text-[#9CA3AF]"
                  >
                    No assigned patients found.
                  </TableData>
                </TableRow>
              ) : (
                assignedPatients.map((patient, index) => {
                  const srNo = String(
                    (assignedFilters.currentPage - 1) * assignedFilters.itemsPerPage + index + 1
                  ).padStart(2, "0");
                  // const displayStatus = mapAssignedPatientStatus(patient.status);
                    const displayStatus = mapAssignedPatientStatus(patient?.patientCurrentConditionStatus);

                  return (
                    <TableRow key={patient.id} className="bg-white transition-colors">
                      <TableData variant="primary">{srNo}</TableData>
                      <TableData>
                        <div className="min-w-[160px]">
                          <div className="font-medium text-[#262D3B]">
                          <TruncatedTableCell
                          key={`patient-list-${patient.id ?? index}`}
                          text={[patient.patientTitle, patient.patientName].filter(Boolean).join(" ") || "N/A"}
                           />
                          </div>
                          <p className="mt-0.5 text-xs text-[#262D3B]">{patient.uhid}</p>
                        </div>
                      </TableData>
                      <TableData>
                        <div className="min-w-[110px]">
                          <p className="text-[#0B8C00]">
                            Age: <span className="text-[#262D3B]">{formatAssignedPatientAge(patient.age)}</span>
                          </p>
                          <p className="text-[#0B8C00]">
                            Gender:{" "}
                            <span className="text-[#262D3B]">{formatAssignedPatientGender(patient.gender)}</span>
                          </p>
                        </div>
                      </TableData>
                      <TableData className="min-w-[220px]">
                        {formatAssignedPatientAccommodation(patient)}
                      </TableData>
                      <TableData>{patient.doctorName || "N/A"}</TableData>
                      {/* <TableData className="min-w-[180px]">{patient.diagnosis || "N/A"}</TableData> */}
                      <TableData className="min-w-[180px]">
                      <TruncatedTableCell
                      key={`assigned-patient-list-${patient.id ?? index}`}
                      text={patient.diagnosis || "N/A"}
                      />
                      </TableData>
                      <TableData>{patient.nurseName || "N/A"}</TableData>
                      <TableData>
                        {displayStatus === "Critical" ? (
                          <button className="px-3 py-1 rounded-[30px] text-xs inline-block select-none transition-all duration-200 border border-[#93000A3D] text-[#93000A] bg-[#FFFFFF] font-normal">
                            {displayStatus}
                          </button>
                        ) : displayStatus === "Stable" ? (
                          <button className="px-3 py-1 rounded-[30px] text-xs inline-block select-none transition-all duration-200 border border-[#0B8C0033] text-[#0B8C00] bg-[#FFFFFF] font-normal">
                            {displayStatus}
                          </button>
                        ) : (
                          <button className="px-3 py-1 rounded-[30px] text-xs inline-block select-none transition-all duration-200 border border-[#B4530933] text-[#B45309] bg-[#FFFFFF] font-normal">
                            {displayStatus}
                          </button>
                        )}
                      </TableData>
                      <TableData>
                    <Tooltip content="View" position="top" delay={0}>
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
                          aria-label={`View ${patient.patientName}`}
                          onClick={() => setSelectedAssignedPatient(mapAssignedListItemToDetail(patient))}
                        >
                          <Image src="/icons/ViewEyeIcon.svg" alt="View" width={18} height={18} />
                        </button>
                       </Tooltip>
                      </TableData>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </DashboardSection>       

        {/* Patient Alerts */}
        <section className="rounded-2xl bg-white p-5 shadow-lg border border-gray-200">
        <h2 className="mb-4 text-sm font-semibold text-gray-800">
            Patient Alerts
        </h2>

        <div className="space-y-3">
            {PATIENT_ALERTS.map((alert) => (
            <div
                key={alert.id}
                className={`flex items-center justify-between rounded-xl border-l-4 px-2 py-3 ${
                alert.tone === "danger"
                    ? "border-l-[#93000A] bg-[#93000A0D] mb-4"
                    : "border-l-[#0B8C00] bg-[#0B8C000D]"
                }`}
            >
                {/* Left */}
                <div className="flex items-start gap-2">
                <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    alert.tone === "danger"
                        ? "bg-[#FDECEC] text-[#DC2626]"
                        : "bg-[#EDF8ED] text-[#0B8C00]"
                    }`}
                >
                    {alert.tone === "danger" ? (
                    //   <TrendingUp size={18} />
                    <Image src="/icons/painLevel.svg" alt="Trending Up" width={28} height={17} />
                    ) : (
                    //   <FileText size={18} />
                    <Image src="/icons/labresult.svg" alt="Trending Up" width={28} height={17} />
                    )}
                </div>

                <div>
                    <h3 className="text-sm font-semibold text-gray-800">
                    {alert.title}
                    </h3>

                    <p className="mt-1 text-xs text-gray-500">
                    {alert.description}
                    </p>
                </div>
                </div>

                {/* Right */}
                <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">
                    {alert.timeAgo}
                </span>

                <button
                className={`rounded-full px-4 py-2 text-xs font-normal ${
                    alert.tone === "danger"
                    ? "border border-[#0B8C003D] bg-white text-[#0B8C00]"
                    : "bg-[#0B8C00] text-white"
                }`}
                >
                {alert.actionLabel}
                </button>
                </div>
            </div>
            ))}
        </div>
        </section>
      </div>
    </AppShell>
  );
}


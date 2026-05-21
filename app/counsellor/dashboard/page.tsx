"use client";

import { useState } from "react";
import Image from "next/image";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
  TableSearchInput,
  Pagination,
  Button,
  TableListingCard,
  type TableListingSection,
} from "@/components/ui";

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
      className={`rounded-[20px] p-5 flex justify-between items-center cursor-pointer transition-all duration-200 select-none ${
        isActive
          ? "bg-[#0B8C00] shadow-lg scale-[1.02]"
          : "bg-white  hover:shadow-md"
      }`}
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
          width={48}
          height={48}
          style={isActive ? { filter: "brightness(0) invert(1)" } : undefined}
        />
      </div>
    </div>
  );
}

// ─── Stat cards config ────────────────────────────────────────────────────────
const STAT_CARDS = [
  { id: "referred",   label: "Referred Patients",    value: 20, iconSrc: "/icons/patientBed.svg" },
  { id: "admissions", label: "Today's Admissions",   value: 24, iconSrc: "/icons/addPatient.svg" },
  { id: "rooms",      label: "Available Rooms Today", value: 18, iconSrc: "/icons/bedDarkIcon.svg" },
];

// ─── Static patient data ──────────────────────────────────────────────────────
const PATIENTS = [
  { id: 1, name: "Ajay Kumar",   uhid: "JSKL41712025", contact: "9876543210", doctor: "Dr Shiv Ram Singh",          complaint: "Fever & Body Pain",  lastVisit: "18 May 2026" },
  { id: 2, name: "Rohit Singh",  uhid: "JSKL41712025", contact: "9812345678", doctor: "Dr. Aakash Dave",            complaint: "Chest Pain",          lastVisit: "17 May 2026" },
  { id: 3, name: "Ajeet Kumar",  uhid: "JSKL41712025", contact: "9898989898", doctor: "Dr Heera Singh",             complaint: "Migraine",            lastVisit: "16 May 2026" },
  { id: 4, name: "Manish Soni",  uhid: "JSKL41712025", contact: "9765432109", doctor: "Dr Alok Ashok Tripathi",     complaint: "Stomach Infection",   lastVisit: "15 May 2026" },
  { id: 5, name: "Pankaj Kumar", uhid: "JSKL41712025", contact: "9123456780", doctor: "Dr Aishwarya Subhash Thorat",complaint: "Back Pain",           lastVisit: "14 May 2026" },
  { id: 6, name: "Aman Singh",   uhid: "JSKL41712025", contact: "9988776655", doctor: "Dr Kadambaree",              complaint: "High Blood Pressure", lastVisit: "13 May 2026" },
];

// ─── Table config per card ────────────────────────────────────────────────────
const TABLE_CONFIG = {
  referred: {
    title: "Referred Patients",
    colSpan: 7,
  },
  admissions: {
    title: "Today's Admissions",
    colSpan: 8,
  },
  rooms: {
    title: "Available Rooms Today",
    colSpan: 7,
  },
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CounsellorDashboardPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [activeCard, setActiveCard] = useState<string>("referred");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const handleCardClick = (id: string) => {
    setActiveCard(id);
    setSearchTerm("");
    setCurrentPage(1);
    setSortOrder("asc");
  };

  const filtered = PATIENTS
    .filter(
      (p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.uhid.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.doctor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.complaint.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) =>
      sortOrder === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    );

  const tableConfig = TABLE_CONFIG[activeCard as keyof typeof TABLE_CONFIG];

  return (
    <AppShell>
      {/* Page Heading + Action Buttons */}
      <div className="flex items-center justify-between">
        <PageHeading title="Dashboard" />
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            leftIcon={<Image src="/icons/bedLightIcon.svg" alt="" width={20} height={20} />}
          >
            Manage Rooms
          </Button>
          <Button
            variant="outline"
            className="!bg-transparent"
            leftIcon={<Image src="/icons/AddIcon.svg" alt="" width={20} height={20} />}
          >
            New Admission
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        {STAT_CARDS.map((card) => (
          <DashboardStatCard
            key={card.id}
            label={card.label}
            value={card.value}
            iconSrc={card.iconSrc}
            isActive={activeCard === card.id}
            onClick={() => handleCardClick(card.id)}
          />
        ))}
      </div>

      {/* Dynamic Table */}
      {(() => {
        const btnCls = "px-4 py-1.5 rounded-[32px] border border-[#0B8C00] text-[#0B8C00] text-xs font-medium hover:bg-[#F2F8F2] transition-colors whitespace-nowrap";

        const nameCol: TableListingSection["columns"][number] = {
          label: "Patient Name",
          sortable: true,
          sortDirection: sortOrder,
          onSort: () => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc")),
        };

        const columns: TableListingSection["columns"] =
          activeCard === "admissions"
            ? [
                { label: "Sr no.", position: "first" },
                nameCol,
                { label: "Patient UHID" },
                { label: "Contact Number" },
                { label: "Referring Doctor" },
                { label: "Chief Complaint" },
                { label: "Last Visit Date" },
                { label: "Action", position: "last", className: "cursor-pointer" },
              ]
            : [
                { label: "Sr no.", position: "first" },
                nameCol,
                { label: "Patient UHID" },
                { label: activeCard === "rooms" ? "Patient Contact Number" : "Contact Number" },
                { label: "Referring Doctor" },
                { label: "Chief Complaint" },
                { label: "Action", position: "last", className: "cursor-pointer" },
              ];

        const rows: TableListingSection["rows"] = filtered.map((patient, index) => {
          const sr = (currentPage - 1) * itemsPerPage + index + 1;
          const uhid = (
            <span className="text-[#0B8C00] font-medium cursor-pointer hover:underline">
              {patient.uhid}
            </span>
          );
          const actions =
            activeCard === "referred" ? (
              <button type="button" className={btnCls}>Start Counselling</button>
            ) : activeCard === "admissions" ? (
              <div className="flex items-center gap-2">
                <button type="button" className={btnCls}>Refer to OPD</button>
                <button type="button" className={btnCls}>Start Admission</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button type="button" className={btnCls}>View</button>
                <button type="button" className={btnCls}>Start Admission</button>
              </div>
            );

          const base = [sr, patient.name, uhid, patient.contact, patient.doctor, patient.complaint];
          return activeCard === "admissions"
            ? [...base, patient.lastVisit, actions]
            : [...base, actions];
        });

        return (
          <>
            <TableListingCard
              sections={[{
                id: activeCard,
                title: tableConfig.title,
                titleRightContent: (
                  <div style={{ width: "280px" }}>
                    <TableSearchInput
                      value={searchTerm}
                      onChange={(value) => { setSearchTerm(value); setCurrentPage(1); }}
                      placeholder="Search Here..."
                    />
                  </div>
                ),
                columns,
                rows,
                emptyMessage: "No patients found",
              }]}
            />
            <Pagination
              currentPage={currentPage}
              totalItems={10}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(items) => { setItemsPerPage(items); setCurrentPage(1); }}
              itemsPerPageOptions={[ 10, 20, 50,100]}
            />
          </>
        );
      })()}
    </AppShell>
  );
}

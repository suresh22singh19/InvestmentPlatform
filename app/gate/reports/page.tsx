"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import GateEntryLayout from "@/components/gate/GateEntryLayout";
import {
  GoToHomeButton,
  BackToPreviousPageButton,
  Tabs,
  TableSearchInput,
  FormSelectField,
  ExportButton,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableData,
  Pagination,
  Dialog,
  Tooltip,
} from "@/components/ui";
import type { SelectOption } from "@/components/ui/FormSelectField";
import { useAppSelector } from "@/store/hooks";
import { selectSelectedBranch } from "@/store/slices/authSlice";
import { usePermission } from "@/hooks/usePermission";
import { useLazyGetGatePatientEntriesQuery, useLazyGetVisitorsQuery } from "@/store/api/gateApi";
import type { PatientEntryItem, GroupedVisitorItem, RawVisitorDetail } from "@/store/api/gateApi";
import { useExport, type ExportColumn } from "@/hooks/useExport";
import DateFilterDropdown from "@/components/registration/DateFilterDropdown";

type DailyReport = PatientEntryItem;

/** Get display address: use patientAddress/address if available, else addressLine1 and addressLine2 (for non-India). Works for both patient and visitor (use address or visitorAddress). */
function getDisplayAddress(item: {
  patientAddress?: string | null;
  address?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
}): string {
  const addr = item.patientAddress ?? item.address;
  if (addr != null && String(addr).trim() !== "") return String(addr).trim();
  const parts = [item.addressLine1, item.addressLine2]
    .filter((s): s is string => s != null && String(s).trim() !== "")
    .map((s) => String(s).trim());
  return parts.length > 0 ? parts.join(", ") : "N/A";
}

/** Get display address for visitor (visitorAddress, visitorAddressLine1, visitorAddressLine2). */
function getVisitorDisplayAddress(visitor: { visitorAddress?: string | null; visitorAddressLine1?: string | null; visitorAddressLine2?: string | null }): string {
  return getDisplayAddress({
    address: visitor.visitorAddress,
    addressLine1: visitor.visitorAddressLine1,
    addressLine2: visitor.visitorAddressLine2,
  });
}

// Map tab values to API entryType and type values
const getApiParamsFromTab = (tab: string): { entryType?: string; type?: string } => {
  switch (tab) {
    case "patient":
      return { entryType: "new", type: "New Patient" };
    case "revisit-patient":
      return { entryType: "old", type: "Revisit Patient" };
    case "all":
      // For "All" tab, don't filter by entryType or type (show all patient entries)
      return { entryType: undefined, type: undefined };
    case "patient-visitor":
      return { entryType: undefined, type: undefined }; // Use visitors API
    case "ipd-visitor":
      return { entryType: undefined, type: undefined };
    case "others":
      return { entryType: undefined, type: undefined }; // Use visitors API
    default:
      return { entryType: undefined, type: undefined };
  }
};

// Legacy function for backward compatibility (used in some places)
const getApiTypeFromTab = (tab: string): string | undefined => {
  switch (tab) {
    case "patient":
      return "new_patient";
    case "revisit-patient":
      return "revisit_patient";
    case "patient-visitor":
      return "patient_visitor";
    case "ipd-visitor":
      return "ipd_visitor";
    case "others":
      return "other";
    default:
      return undefined; // "all" - no type filter
  }
};

const patientVisitorOptions: SelectOption[] = [
  { value: "patient-visitor", label: "Patient" },
  { value: "only-visitor", label: "Visitor" },
];

const tabOptions = [
  { value: "all", label: "All" },
  { value: "patient", label: "New Patient" },
  { value: "revisit-patient", label: "Revisit Patient" },
  { value: "patient-visitor", label: "OPD/IPD Visitor" },
  { value: "others", label: "Other Visitor" },
  { value: "patient-medicine-type", label: "Patient Medicine Type" },
];

// Table column configurations
type TableColumn = {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (report: DailyReport) => string | React.ReactNode;
};

const getTableColumns = (activeTab: string, selectedPatientVisitor?: string): TableColumn[] => {
  const baseColumns: TableColumn[] = [
    { key: "sr", label: "Sr no.", sortable: false },
  ];

  // Helper to conditionally include registrationNo and tokenNo
  const shouldShowRegistrationAndToken = () => {
    // Hide when "Only Visitor" is selected
    if (selectedPatientVisitor === "only-visitor") {
      return false;
    }
    return true;
  };

  switch (activeTab) {
    case "revisit-patient":
      return [
        ...baseColumns,
        { key: "patientName", label: "Patient Name", sortable: true },
        { key: "type", label: "Type", sortable: false },
        ...(shouldShowRegistrationAndToken() ? [
          { key: "registrationNo", label: "Registration No.", sortable: true },
          { key: "tokenNo", label: "Token No.", sortable: true },
        ] : []),
        { key: "created", label: "Created", sortable: true },
        { key: "action", label: "Action", sortable: false },
      ];

    case "patient-visitor":
      return [
        ...baseColumns,
        { key: "patientName", label: "Patient Name", sortable: true },
        { key: "visitorName", label: "Visitor Name", sortable: true },
        { key: "type", label: "Type", sortable: false },
        { key: "created", label: "Created", sortable: true },
        { key: "action", label: "Action", sortable: false },
      ];

    case "patient-medicine-type":
      return [
        ...baseColumns,
        { key: "uhid", label: "UHID", sortable: true },
        { key: "patientName", label: "Patient Name", sortable: true },
        { key: "visitorName", label: "Visitor Name", sortable: true },
        { key: "contactNumber", label: "Contact Number", sortable: true },
        { key: "created", label: "Created", sortable: true },
        { key: "action", label: "Action", sortable: false },
      ];

    case "others":
      return [
        ...baseColumns,
        { key: "visitorName", label: "Visitor Name", sortable: true },
        { key: "type", label: "Type", sortable: false },
        { key: "created", label: "Created", sortable: true },
        { key: "action", label: "Action", sortable: false },
      ];

    default: // "all" and "patient"
      return [
        ...baseColumns,
        { key: "patientName", label: "Patient Name", sortable: true },
        { key: "visitorName", label: "Visitor Name", sortable: true },
        { key: "type", label: "Type", sortable: false },
        ...(shouldShowRegistrationAndToken() ? [
          { key: "registrationNo", label: "Registration No.", sortable: true },
          { key: "tokenNo", label: "Token No.", sortable: true },
        ] : []),
        { key: "created", label: "Created", sortable: true },
        { key: "action", label: "Action", sortable: false },
      ];
  }
};

// Dialog field configurations
type DialogField = {
  label: string;
  key: keyof DailyReport;
  column?: 1 | 2 | 3;
};

const getDialogFields = (activeTab: string, selectedPatientVisitor?: string): DialogField[] => {
  switch (activeTab) {
    case "revisit-patient":
      return [
        { label: "Patient Name", key: "patientName", column: 1 },
        { label: "Aadhar Number", key: "aadharNumber", column: 1 },
        { label: "Address", key: "address", column: 1 },
        { label: "Address Line 1", key: "addressLine1", column: 1 },
        { label: "Address Line 2", key: "addressLine2", column: 1 },
        { label: "State", key: "state", column: 1 },
        { label: "Tehsil/Area", key: "tehsil", column: 1 },
        { label: "Post Office", key: "area", column: 1 },
        { label: "Patient Type", key: "patientType", column: 1 },
        { label: "Contact Number", key: "contactNumber", column: 2 },
        { label: "Age", key: "age", column: 2 },
        { label: "City", key: "city", column: 2 },
        { label: "Country", key: "country", column: 2 },
        { label: "Indian/Foreigner/Nepal", key: "indianForeignerNepal", column: 3 },
        { label: "Pin Code", key: "pinCode", column: 3 },
      ];

    case "patient-visitor":
      return [
        { label: "Patient Name", key: "patientName", column: 1 },
        { label: "Patient Type", key: "patientType", column: 1 },
        { label: "Address", key: "address", column: 1 },
        { label: "Address Line 1", key: "addressLine1", column: 1 },
        { label: "Address Line 2", key: "addressLine2", column: 1 },
        { label: "State", key: "state", column: 1 },
        { label: "Visitor Name", key: "visitorName", column: 2 },
        { label: "Aadhar Number", key: "aadharNumber", column: 2 },
        { label: "City", key: "city", column: 2 },
        { label: "Tehsil/Area", key: "tehsil", column: 2 },
        { label: "Post Office", key: "area", column: 2 },
        { label: "Country", key: "country", column: 2 },
        { label: "Visitor contact Number", key: "visitorContactNumber", column: 3 },
        { label: "Pin Code", key: "pinCode", column: 3 },
        { label: "Visitor Purpose", key: "visitorPurpose", column: 3 },
        { label: "Patient Phone No.", key: "patientPhoneOrUhid", column: 3 },
        // IPD‑specific bed information (shown only when values exist; keys already present from visitors API)
        { label: "Patient Room No", key: "patientRoomNo", column: 1 },
        { label: "Patient Bed No", key: "patientBedNo", column: 2 },
        { label: "Patient Building No", key: "patientBuilding", column: 3 },
      ];

    case "patient-medicine-type":
      return [
        { label: "UHID", key: "uhid", column: 1 },
        { label: "Patient Name", key: "patientName", column: 1 },
        { label: "Contact Number", key: "contactNumber", column: 1 },
        { label: "Country", key: "country", column: 1 },
        { label: "Pin Code", key: "pinCode", column: 2 },
        { label: "Address", key: "address", column: 2 },
        { label: "Address Line 1", key: "addressLine1", column: 2 },
        { label: "Address Line 2", key: "addressLine2", column: 2 },
        { label: "State", key: "state", column: 2 },
        { label: "City", key: "city", column: 2 },
        { label: "Tehsil/Area", key: "tehsil", column: 2 },
        { label: "Post Office", key: "area", column: 2 },
        { label: "Visitor Name", key: "visitorName", column: 3 },
        { label: "Visitor Nationality", key: "visitorNationality", column: 3 },
        // Visitor identification field will be dynamically shown based on nationality
        { label: "visitorIdentification", key: "visitorIdentification", column: 3 },
      ];

    case "others":
      return [
        // Column 1: Basic Info & Location
        { label: "Visitor Name", key: "visitorName", column: 1 },
        { label: "Pin Code", key: "pinCode", column: 1 },
        { label: "Country", key: "country", column: 1 },
        // Column 2: Contact & Address
        { label: "Visitor contact Number", key: "visitorContactNumber", column: 2 },
        { label: "Address", key: "address", column: 2 },
        { label: "Address Line 1", key: "addressLine1", column: 2 },
        { label: "Address Line 2", key: "addressLine2", column: 2 },
        { label: "State", key: "state", column: 2 },
        { label: "Tehsil/Area", key: "tehsil", column: 2 },
        { label: "Post Office", key: "area", column: 2 },
        // Column 3: Identification, Company & City
        { label: "Aadhar Number", key: "aadharNumber", column: 3 },
        { label: "Visitor Company Name", key: "visitorCompanyName", column: 3 },
        { label: "Whom To Meet", key: "visitorPurpose", column: 3 },
        { label: "City", key: "city", column: 3 },
      ];

    default: // "all" and "patient"
      // When "Only Visitor" is selected on "All" tab, show only visitor-related fields
      // Include Address Line 1 & 2 so Other/non-India visitors show them when API returns visitorAddressLine1/2
      if (activeTab === "all" && selectedPatientVisitor === "only-visitor") {
        return [
          // Column 1: Basic Info & Location
          { label: "Visitor Name", key: "visitorName", column: 1 },
          { label: "Pin Code", key: "pinCode", column: 1 },
          { label: "Country", key: "country", column: 1 },
          // Column 2: Contact & Address
          { label: "Visitor contact Number", key: "visitorContactNumber", column: 2 },
          { label: "Address", key: "address", column: 2 },
          { label: "Address Line 1", key: "addressLine1", column: 2 },
          { label: "Address Line 2", key: "addressLine2", column: 2 },
          { label: "State", key: "state", column: 2 },
          { label: "Tehsil/Area", key: "tehsil", column: 2 },
          { label: "Post Office", key: "area", column: 2 },
          // Column 3: Identification, Company & City
          { label: "Aadhar Number", key: "aadharNumber", column: 3 },
          { label: "Visitor Company Name", key: "visitorCompanyName", column: 3 },
          { label: "Visitor Purpose", key: "visitorPurpose", column: 3 },
          { label: "City", key: "city", column: 3 },
        ];
      }
      // Default: show all fields (Patient Visitor case on "All" tab)
      return [
        // Row 1
        { label: "Name", key: "patientName", column: 1 },
        { label: "Contact Number", key: "contactNumber", column: 2 },
        { label: "Indian/Foreigner/Nepal", key: "indianForeignerNepal", column: 3 },
        // Row 2
        { label: "Aadhar Number", key: "aadharNumber", column: 1 },
        { label: "Age", key: "age", column: 2 },
        { label: "Pin Code", key: "pinCode", column: 3 },
        // Row 3
        { label: "Address", key: "address", column: 1 },
        { label: "Address Line 1", key: "addressLine1", column: 2 },
        { label: "Address Line 2", key: "addressLine2", column: 3 },
        // Row 4
        { label: "City", key: "city", column: 1 },
        { label: "State", key: "state", column: 2 },
        { label: "Email Address", key: "emailAddress", column: 3 },
        // Row 5
        { label: "Country", key: "country", column: 1 },
        { label: "Tehsil/Area", key: "tehsil", column: 2 },
        { label: "Post Office", key: "area", column: 3 },
        // Row 6
        { label: "Marital Status", key: "maritalStatus", column: 1 },
        { label: "Patient Type", key: "patientType", column: 2 },
        { label: "Occupation", key: "occupation", column: 3 },
      ];
  }
};

const getDialogTitle = (activeTab: string, selectedPatientVisitor?: string, selectedReport?: DailyReport | null): string => {
  switch (activeTab) {
    case "revisit-patient":
      return "Revisit Patient";
    case "patient-visitor":
      // When viewing a specific patient visitor, show the type (OPD or IPD)
      if (selectedReport?.type === "OPD") {
        return "OPD Visitor";
      }
      if (selectedReport?.type === "IPD") {
        return "IPD Visitor";
      }
      return "Patient Visitor";
    case "patient-medicine-type":
      return "Patient Medicine Type";
    case "others":
      return "Other";
    case "patient":
      // When viewing a specific patient in "Patient" tab, show the patient type
      if (selectedReport?.type) {
        return selectedReport.type;
      }
      return "All Details";
    default:
      // When "Only Visitor" is selected on "All" tab, show "Only Visitor"
      if (activeTab === "all" && selectedPatientVisitor === "only-visitor") {
        return "Only Visitor";
      }
      // When viewing a specific patient in "All" tab, show the patient type
      if (activeTab === "all" && selectedReport?.type) {
        return selectedReport.type;
      }
      return "All Details";
  }
};

const getInnerInformationText = (activeTab: string, selectedPatientVisitor?: string, selectedReport?: DailyReport | null): string => {
  switch (activeTab) {
    case "patient":
      // When viewing a specific patient in "Patient" tab, show the patient type + "Information"
      if (selectedReport?.type) {
        return `${selectedReport.type} Information`;
      }
      return "Patient Information";
    case "revisit-patient":
      return "Revisit Patient Information";
    case "patient-visitor":
      // When viewing a specific patient visitor, show the type + "Visitor Information"
      if (selectedReport?.type === "OPD") {
        return "OPD Visitor Information";
      }
      if (selectedReport?.type === "IPD") {
        return "IPD Visitor Information";
      }
      return "Patient Visitor Information";
    case "patient-medicine-type":
      return "Patient Medicine Type Information";
    case "others":
      return "Other Information";
    default:
      // When "Only Visitor" is selected on "All" tab
      if (activeTab === "all" && selectedPatientVisitor === "only-visitor") {
        return "Only Visitor Information";
      }
      // When viewing a specific patient in "All" tab, show the patient type + "Information"
      if (activeTab === "all" && selectedReport?.type) {
        return `${selectedReport.type} Information`;
      }
      return "All Information";
  }
};

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to format visitor type (OTHER -> Other, leave others as-is)
const formatVisitorType = (type: string | undefined): string => {
  if (!type) return "N/A";
  // Only format "OTHER" to "Other", leave other types unchanged
  if (type === "OTHER") {
    return "Other";
  }
  return type;
};

// Helper function to mask phone number (show last 4 digits, mask first 6 with 'x')
const maskPhoneNumber = (phoneNumber: string | null | undefined): string => {
  if (!phoneNumber) return "N/A";
  const cleaned = phoneNumber.replace(/\D/g, ""); // Remove non-digits
  if (cleaned.length < 4) return phoneNumber; // If less than 4 digits, return as is
  const last4 = cleaned.slice(-4);
  const masked = "XXXXXX" + last4;
  return masked;
};

// Helper function to format name with title
const formatNameWithTitle = (name: string | undefined | null, title: string | undefined | null): string => {
  if (!name || name === "N/A") return "N/A";
  const trimmedName = name.trim();
  const trimmedTitle = title && title.trim() ? title.trim() : null;
  
  if (!trimmedTitle) {
    return trimmedName;
  }
  
  // Handle comma-separated names and titles (multiple visitors)
  if (trimmedName.includes(",")) {
    const names = trimmedName.split(",").map(n => n.trim()).filter(n => n.length > 0);
    const titles = trimmedTitle.includes(",") 
      ? trimmedTitle.split(",").map(t => t.trim()).filter(t => t.length > 0)
      : [trimmedTitle];
    
    // Match each name with its corresponding title (or use the first title if not enough titles)
    // Check if name already starts with the title to avoid duplication
    return names.map((n, index) => {
      const matchedTitle = titles[index] || titles[0] || "";
      if (!matchedTitle) return n;
      // Check if name already starts with this title (case-insensitive)
      const titleLower = matchedTitle.toLowerCase();
      const nameLower = n.toLowerCase();
      if (nameLower.startsWith(titleLower + " ") || nameLower === titleLower) {
        return n; // Name already has the title, don't add it again
      }
      return `${matchedTitle} ${n}`;
    }).join(", ");
  }
  
  // For single name, use first title if multiple titles provided
  const firstTitle = trimmedTitle.includes(",") 
    ? trimmedTitle.split(",")[0].trim()
    : trimmedTitle;
  
  if (!firstTitle) {
    return trimmedName;
  }
  
  // Check if name already starts with the title to avoid duplication
  const titleLower = firstTitle.toLowerCase();
  const nameLower = trimmedName.toLowerCase();
  if (nameLower.startsWith(titleLower + " ") || nameLower === titleLower) {
    return trimmedName; // Name already has the title, don't add it again
  }
  
  return `${firstTitle} ${trimmedName}`;
};

// Helper function to get patient title from report
const getPatientTitle = (report: DailyReport): string | undefined => {
  // For visitors API: patientTitle or title both represent patient title
  // For patient-entries API: title represents patient title
  return (report as any).patientTitle || (report as any).title;
};

// Helper function to get visitor title from report
const getVisitorTitle = (report: DailyReport): string | undefined => {
  return (report as any).visitorTitle;
};

// Build field rows (arrays of 3 label/value pairs) for a single raw visitor, used in view dialog
function buildVisitorFieldRows(
  visitor: RawVisitorDetail,
  maskPhone: (p: string | null | undefined) => string,
  fmtName: (name: string | null | undefined, title: string | null | undefined) => string
): Array<Array<{ label: string; value: string }>> {
  const visitorName = fmtName(visitor.visitor_name, visitor.visitor_title) || "N/A";
  const patientName = fmtName(visitor.patient_name, visitor.patient_title) || "N/A";

  const hasAddrLine1 = !!(visitor.visitor_address_line1 && visitor.visitor_address_line1.trim());
  const address = hasAddrLine1
    ? [visitor.visitor_address_line1, visitor.visitor_address_line2].filter(Boolean).join(", ")
    : (visitor.visitor_address || "N/A");
  const addrLabel = hasAddrLine1 ? "Address Line 1" : "Address";
  const pinLabel = hasAddrLine1 ? "ZIP/Postal Code" : "Pin Code";

  const nationality = visitor.visitor_nationality || "Indian";
  let idLabel = "Visitor Aadhar Number";
  let idValue: string = visitor.visitor_aadhar_card_no || "N/A";
  if (nationality === "Foreigner") {
    idLabel = "Visitor Passport Number";
    idValue = visitor.visitor_passport_number || "N/A";
  } else if (nationality === "Nepal") {
    idLabel = "Visitor National ID";
    idValue = visitor.visitor_national_id || "N/A";
  }

  const country = visitor.visitor_country || "N/A";
  const isIndia = country === "India" || country === "6";
  const cityLabel = isIndia ? "District" : "City";

  switch (visitor.visitor_type) {
    case "OPD":
    case "IPD": {
      const rows: Array<Array<{ label: string; value: string }>> = [
        [
          { label: "Patient Name", value: patientName },
          { label: "Patient Phone No.", value: maskPhone(visitor.patient_phone_number) },
          { label: "Visitor Type", value: visitor.visitor_type },
        ],
        [
          { label: "Visitor Name", value: visitorName },
          { label: "Visitor Contact Number", value: maskPhone(visitor.visitor_contact_number) },
          { label: idLabel, value: idValue },
        ],
        [
          { label: addrLabel, value: address },
          { label: "State", value: visitor.visitor_state || "N/A" },
          { label: cityLabel, value: visitor.visitor_city || "N/A" },
        ],
        [
          { label: "Tehsil/Area", value: visitor.visitor_tehsil || "N/A" },
          { label: "Post Office", value: visitor.visitor_area || "N/A" },
          { label: pinLabel, value: visitor.visitor_pin_code || "N/A" },
        ],
        ...(visitor.visitor_type === "IPD"
          ? [
              [
                { label: "Patient Room No", value: visitor.patient_room_no || "N/A" },
                { label: "Patient Bed No", value: visitor.patient_bed_no || "N/A" },
                { label: "Patient Building", value: visitor.patient_building || "N/A" },
              ],
              [
                { label: "Country", value: country },
                { label: "Visitor Purpose", value: visitor.visitor_purpose || "N/A" },
              ],
            ]
          : [
              [
                { label: "Country", value: country },
                { label: "Visitor Purpose", value: visitor.visitor_purpose || "N/A" },
              ],
            ]),
      ];
      // if (visitor.visitor_purpose?.trim()) {
      //   rows.push([{ label: "Visitor Purpose", value: visitor.visitor_purpose! }]);
      // }
      return rows;
    }

    case "OTHER": {
      const rows: Array<Array<{ label: string; value: string }>> = [
        [
          { label: "Visitor Name", value: visitorName },
          { label: pinLabel, value: visitor.visitor_pin_code || "N/A" },
          { label: "Country", value: country },
        ],
        [
          { label: "Visitor contact Number", value: maskPhone(visitor.visitor_contact_number) },
          { label: addrLabel, value: address },
          { label: "State", value: visitor.visitor_state || "N/A" },
        ],
        [
          { label: "Tehsil/Area", value: visitor.visitor_tehsil || "N/A" },
          { label: "Post Office", value: visitor.visitor_area || "N/A" },
          { label: idLabel, value: idValue },
        ],
        [
          { label: cityLabel, value: visitor.visitor_city || "N/A" },
          { label: "Whom To Meet", value: visitor.visitor_purpose || "N/A" },
        ],
      ];
      if (visitor.visitor_company_name?.trim()) {
        rows.push([{ label: "Visitor Company Name", value: visitor.visitor_company_name! }]);
      }
      // if (visitor.visitor_purpose?.trim()) {
      //   rows.push([{ label: "Whom To Meet", value: visitor.visitor_purpose! }]);
      // }
      return rows;
    }

    case "MEDICINE":
    default: {
      return [
        [
          { label: "Patient UHID", value: visitor.patient_uhid || "N/A" },
          { label: "Patient Name", value: patientName },
          { label: "Contact Number", value: maskPhone(visitor.patient_phone_number) },
        ],
        [
          { label: "Country", value: country },
          { label: pinLabel, value: visitor.visitor_pin_code || "N/A" },
          { label: addrLabel, value: address },
        ],
        [
          { label: "State", value: visitor.visitor_state || "N/A" },
          { label: cityLabel, value: visitor.visitor_city || "N/A" },
          { label: "Tehsil/Area", value: visitor.visitor_tehsil || "N/A" },
        ],
        [
          { label: "Post Office", value: visitor.visitor_area || "N/A" },
          { label: "Visitor Name", value: visitorName },
          { label: "Visitor Nationality", value: visitor.visitor_nationality || "N/A" },
        ],
        [
          { label: idLabel, value: idValue },
          {
            label: "Who Visited for Medicine",
            value:
              visitor.is_patient_visit_for_medicine === true
                ? "Patient"
                : visitor.is_patient_visit_for_medicine === false
                  ? "Visitor"
                  : "N/A",
          },
        ],
      ];
    }
  }
}

export default function GateReportsPage() {
  const router = useRouter();
  const viewDailyReportsPerm = usePermission("Gate", { subModule: "View Daily Reports" });
  const selectedBranch = useAppSelector(selectSelectedBranch);
  const branchId = selectedBranch?.id ?? 1;
  const branchName = selectedBranch?.name ?? "";

  const [activeTab, setActiveTab] = useState("all"); // Default to "All" tab
  const [searchInput, setSearchInput] = useState(""); // Immediate input value
  const [searchTerm, setSearchTerm] = useState(""); // Debounced search term for API calls
  const [selectedPatientVisitor, setSelectedPatientVisitor] = useState<string>("patient-visitor"); // Default to "Patient Visitor"
  const [fromDate, setFromDate] = useState(getTodayDate()); // Default to today's date
  const [toDate, setToDate] = useState(getTodayDate()); // Default to today's date
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewAllDialogOpen, setViewAllDialogOpen] = useState(false);
  const [visitorNamesDialogItems, setVisitorNamesDialogItems] = useState<string[]>([]);
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");

  const isOnlyVisitorAllTab = activeTab === "all" && selectedPatientVisitor === "only-visitor";

  // Debounce search input - update searchTerm after 500ms of no typing
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      // Trim leading and trailing spaces before setting search term
      const trimmedSearch = searchInput.trim();
      setSearchTerm(trimmedSearch);
      setCurrentPage(1); // Reset to first page when search changes
    }, 500); // 500ms delay

    return () => {
      clearTimeout(debounceTimer);
    };
  }, [searchInput]);

  // Handle click outside filter dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };

    if (isFilterOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isFilterOpen]);

  const handleFilterClick = () => {
    setIsFilterOpen(!isFilterOpen);
  };

  const handleFilter = (filterFromDate: string, filterToDate: string) => {
    if (filterFromDate && filterToDate && filterToDate < filterFromDate) {
      return;
    }
    setFromDate(filterFromDate);
    setToDate(filterToDate);
    setCurrentPage(1); // Reset to first page when filter is applied
    setIsFilterOpen(false);
    // Clear selected report and close details section when date filter changes
    setSelectedReport(null);
    setIsViewDialogOpen(false);
  };

  const handleClear = () => {
    // Clear dates to empty strings to match DateFilterDropdown behavior
    // Empty strings will be converted to undefined in API call, which means no date filter
    const today = getTodayDate();
    setFromDate(today);
    setToDate(today);
    setCurrentPage(1); // Reset to first page when filter is cleared
    // Clear selected report and close details section when date filter changes
    setSelectedReport(null);
    setIsViewDialogOpen(false);
  };

  // API hooks - use different endpoints based on selectedPatientVisitor
  const [getPatientEntries, { data: patientEntriesData, isLoading: isLoadingPatients, isError: isErrorPatients }] = useLazyGetGatePatientEntriesQuery();
  const [getVisitors, { data: visitorsData, isLoading: isLoadingVisitors, isError: isErrorVisitors }] = useLazyGetVisitorsQuery();

  // Determine which API data to use
  // Use visitors API data when:
  // 1. Patient Visitor tab
  // 2. Patient Medicine Type tab
  // 3. Others tab
  // 4. On "All" tab and "Only Visitor" is selected
  // Use patient-entries API when:
  // 1. All tab (with Patient Visitor selected - default)
  // 2. Patient tab
  // 3. Revisit Patient tab
  const useVisitorsAPI =
    activeTab === "patient-visitor" ||
    activeTab === "patient-medicine-type" ||
    activeTab === "others" ||
    (activeTab === "all" && selectedPatientVisitor === "only-visitor");
  const apiData = useVisitorsAPI ? visitorsData : patientEntriesData;
  const isLoading = useVisitorsAPI ? isLoadingVisitors : isLoadingPatients;
  const isError = useVisitorsAPI ? isErrorVisitors : isErrorPatients;

  // Map column keys to API field names
  const getApiSortField = (columnKey: string): string => {
    // For Patient Medicine Type tab, contactNumber should sort by patientPhoneNumber
    if (activeTab === "patient-medicine-type" && columnKey === "contactNumber") {
      return "patientPhoneNumber";
    }
    
    const fieldMap: Record<string, string> = {
      patientName: "patientName",
      visitorName: "visitorName",
      type: "type",
      registrationNo: "registrationNo",
      tokenNo: "tokenNo",
      created: "createdAt",
      contactNumber: "contactNo",
      uhid: "patientUhid",
    };
    return fieldMap[columnKey] || columnKey;
  };

  // Map selected patient visitor option to API type
  const getApiTypeFromSelect = (selectedValue: string): string => {
    if (selectedValue === "patient-visitor") {
      return "patient_visitor";
    }
    if (selectedValue === "only-visitor") {
      return "only_visitor";
    }
    return "";
  };

  // Fetch data when filters change
  useEffect(() => {
    const startDateFormatted = fromDate && fromDate.trim() !== "" ? fromDate : undefined;
    const endDateFormatted = toDate && toDate.trim() !== "" ? toDate : undefined;

    // Use visitors API when:
    // 1. "Patient Visitor" tab → visitorType: "opd_ipd"
    // 2. "Patient Medicine type" tab → visitorType: "MEDICINE"
    // 3. "Others" tab is active → visitorType: "Other"
    // 4. On "All" tab and "Only Visitor" is selected
    if (activeTab === "patient-visitor") {
      getVisitors({
        page: currentPage,
        limit: itemsPerPage,
        visitorType: "opd_ipd",
        startDate: startDateFormatted,
        endDate: endDateFormatted,
        search: searchTerm || undefined,
        branchId,
        sort: sortField,
        order: sortOrder,
      });
    } else if (activeTab === "patient-medicine-type") {
      getVisitors({
        page: currentPage,
        limit: itemsPerPage,
        visitorType: "MEDICINE",
        startDate: startDateFormatted,
        endDate: endDateFormatted,
        search: searchTerm || undefined,
        branchId,
        sort: sortField,
        order: sortOrder,
      });
    } else if (activeTab === "others") {
      getVisitors({
        page: currentPage,
        limit: itemsPerPage,
        visitorType: "Other",
        startDate: startDateFormatted,
        endDate: endDateFormatted,
        search: searchTerm || undefined,
        branchId,
        sort: sortField,
        order: sortOrder,
      });
    } else if (activeTab === "all" && selectedPatientVisitor === "only-visitor") {
      getVisitors({
        page: currentPage,
        limit: itemsPerPage,
        visitorType: "opd_ipd_medicine_other",
        startDate: startDateFormatted,
        endDate: endDateFormatted,
        search: searchTerm || undefined,
        branchId,
        sort: sortField,
        order: sortOrder,
      });
    } else {
      // Use patient-entries API for:
      // 1. "All" tab (with "Patient Visitor" selected - default)
      // 2. "Patient" tab
      // 3. "Revisit Patient" tab
      const apiParams = getApiParamsFromTab(activeTab);
      getPatientEntries({
        page: currentPage,
        limit: itemsPerPage,
        entryType: apiParams.entryType,
        type: apiParams.type,
        startDate: startDateFormatted,
        endDate: endDateFormatted,
        search: searchTerm || undefined,
        branchId,
        sort: sortField,
        order: sortOrder,
      });
    }
  }, [activeTab, currentPage, itemsPerPage, fromDate, toDate, searchTerm, selectedPatientVisitor, sortField, sortOrder, branchId, getPatientEntries, getVisitors]);

  const handleGoToHome = () => {
    router.push("/gate");
  };

  const handleBack = () => {
    router.push("/gate");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Reset to first page when filters change
    setCurrentPage(1);
    // Trigger refetch (useEffect will handle it)
  };

  // Handle tab change - reset sorting, pagination, search (but keep date filter)
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    // Reset sorting to default values
    setSortField("createdAt");
    setSortOrder("DESC");
    // Reset to first page
    setCurrentPage(1);
    // Clear search input (but keep the last selected date)
    setSearchInput("");
    setSearchTerm("");
    // Don't reset date filter - keep the last selected date
    // Clear selected report and close details section when changing tabs
    setSelectedReport(null);
    setIsViewDialogOpen(false);
  };

  // Fetch all data for export (without limit)
  const fetchAllDataForExport = async (): Promise<DailyReport[]> => {
    const startDateFormatted = fromDate && fromDate.trim() !== "" ? fromDate : undefined;
    const endDateFormatted = toDate && toDate.trim() !== "" ? toDate : undefined;

    const formatDate = (dateString: string) => {
      try {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
      } catch {
        return dateString;
      }
    };

    // Helper: map a GroupedVisitorItem to a DailyReport row for export
    const mapGroupedVisitorForExport = (item: unknown, tabType: string): DailyReport => {
      const grouped = item as unknown as GroupedVisitorItem;
      const visitors = grouped.visitors || [];
      const first = visitors[0];
      if (!first) return { id: 0, type: "N/A", createdAt: "", created: "N/A", patientName: "N/A", visitorName: "N/A" } as unknown as DailyReport;

      const patientName = formatNameWithTitle(first.patient_name, first.patient_title);
      // All visitor names joined for export
      const allVisitorNames = visitors
        .map(v => formatNameWithTitle(v.visitor_name, v.visitor_title))
        .filter(n => n && n !== "N/A")
        .join(", ");
      const created = first.created_at ? formatDate(first.created_at) : (grouped.createdAt || "N/A");
// debugger
      if (tabType === "medicine") {
        return {
          id: first.id,
          patientName,
          uhid: first.patient_uhid || "N/A",
          contactNumber: first.patient_phone_number || first.visitor_contact_number || "N/A",
          country: first.visitor_country || "N/A",
          pinCode: first.visitor_pin_code || "N/A",
          address: first.visitor_address || "N/A",
          state: first.visitor_state || "N/A",
          city: first.visitor_city || "N/A",
          visitorName: allVisitorNames || "N/A",
          visitorAadharCardNo: first.visitor_aadhar_card_no || "N/A",
          type: "Patient Medicine Type",
          created,
        } as unknown as DailyReport;
      }

      return {
        id: first.id,
        patientName,
        visitorName: allVisitorNames || "N/A",
        type: formatVisitorType(first.visitor_type),
        created,
        contactNumber: first.visitor_contact_number || "N/A",
        address: first.visitor_address || "N/A",
      } as unknown as DailyReport;
    };

    try {
      if (activeTab === "patient-visitor") {
        const result = await getVisitors({
          page: 1,
          limit: "",
          visitorType: "opd_ipd",
          startDate: startDateFormatted,
          endDate: endDateFormatted,
          search: searchTerm || undefined,
          branchId,
          sort: sortField,
          order: sortOrder,
        });
        if (!result.data) return [];
        return result.data.data.map(item => mapGroupedVisitorForExport(item, "opd_ipd"));
      } else if (activeTab === "patient-medicine-type") {
        const result = await getVisitors({
          page: 1,
          limit: "",
          visitorType: "MEDICINE",
          startDate: startDateFormatted,
          endDate: endDateFormatted,
          search: searchTerm || undefined,
          branchId,
          sort: sortField,
          order: sortOrder,
        });
        if (!result.data) return [];
        return result.data.data.map(item => mapGroupedVisitorForExport(item, "medicine"));
      } else if (activeTab === "others") {
        const result = await getVisitors({
          page: 1,
          limit: "",
          visitorType: "Other",
          startDate: startDateFormatted,
          endDate: endDateFormatted,
          search: searchTerm || undefined,
          branchId,
          sort: sortField,
          order: sortOrder,
        });
        if (!result.data) return [];
        return result.data.data.map(item => mapGroupedVisitorForExport(item, "other"));
      } else if (activeTab === "all" && selectedPatientVisitor === "only-visitor") {
        const result = await getVisitors({
          page: 1,
          limit: "",
          visitorType: "opd_ipd_medicine_other",
          startDate: startDateFormatted,
          endDate: endDateFormatted,
          search: searchTerm || undefined,
          branchId,
          sort: sortField,
          order: sortOrder,
        });
        if (!result.data) return [];
        return result.data.data.map(item => mapGroupedVisitorForExport(item, "all"));
      } else {
        // Use patient-entries API for:
        // 1. "All" tab (with "Patient Visitor" selected - default)
        // 2. "Patient" tab
        // 3. "Revisit Patient" tab
        // 4. "Patient Visitor" tab with "Patient Visitor" selected (handled above, but fallback here)
        const apiParams = getApiParamsFromTab(activeTab);
        const result = await getPatientEntries({
          page: 1,
          limit: "", // Empty string to fetch all data
          entryType: apiParams.entryType,
          type: apiParams.type,
          startDate: startDateFormatted,
          endDate: endDateFormatted,
          search: searchTerm || undefined,
          branchId,
          sort: sortField,
          order: sortOrder,
        });

        if (!result.data) return [];

        return result.data.data.map((item) => {
          const patientItem = item as any; // Use any to access all fields from API
          const patientTitle = patientItem.title; // For patient-entries API, title is patient title
          const visitorTitle = patientItem.visitorTitle;
          const rawPatientName = patientItem.name || patientItem.patientName;
          const rawVisitorName = patientItem.visitorName;
          return {
            ...patientItem,
            // Map field names for display - same as in reports useMemo, with titles
            patientName: formatNameWithTitle(rawPatientName, patientTitle),
            visitorName: formatNameWithTitle(rawVisitorName, visitorTitle),
            registrationNo: patientItem.registerToken || patientItem.registrationNo || undefined,
            tokenNo: patientItem.opdToken || patientItem.tokenNo || null,
            created: patientItem.createdAt ? formatDate(patientItem.createdAt) : "N/A",
            contactNumber: patientItem.contactNo || patientItem.contactNumber,
            aadharNumber: patientItem.aadharCardNo || patientItem.aadharNumber,
            age: patientItem.age,
            emailAddress: patientItem.emailAddress,
            maritalStatus: patientItem.maritalStatus,
            occupation: patientItem.occupation,
            patientType: patientItem.patientType,
            pinCode: patientItem.pinCode,
            country: patientItem.country,
            state: patientItem.patientState || patientItem.state,
            city: patientItem.city,
            tehsil: patientItem.tehsil,
            area: patientItem.area,
            address: getDisplayAddress(patientItem as any),
            addressLine1: patientItem.addressLine1 ?? undefined,
            addressLine2: patientItem.addressLine2 ?? undefined,
            indianForeignerNepal: patientItem.nationality || patientItem.indianForeignerNepal,
          } as DailyReport;
        });
      }
    } catch (error) {
      console.error("Error fetching data for export:", error);
      return [];
    }
  };

  // Convert table columns to export columns (reactive to tab/visitor changes)
  const exportColumns = useMemo((): ExportColumn[] => {
    const currentTableColumns = activeTab === "all"
      ? getTableColumns(activeTab, selectedPatientVisitor)
      : getTableColumns(activeTab);

    // Filter out action column and convert to ExportColumn format
    return currentTableColumns
      .filter(col => col.key !== "action")
      .map(col => ({
        key: col.key,
        label: col.label,
        getValue: (row: DailyReport, index: number) => {
          if (col.key === "sr" || col.key === "serial") {
            return String(index + 1);
          }
          if (col.key === "contactNumber" || col.key === "visitorContactNumber") {
            const v = row[col.key as keyof DailyReport];
            if (v === undefined || v === null || String(v).trim() === "") {
              return "N/A";
            }
            return maskPhoneNumber(String(v));
          }
          const value = row[col.key as keyof DailyReport];
          return value !== undefined && value !== null ? String(value) : "N/A";
        },
      }));
  }, [activeTab, selectedPatientVisitor]);

  // Get export title based on active tab (reactive).
  // For "All" tab when downloading PDF/CSV: patient-entries API → "New & Revisit Patient", visitors API → "All Visitor"
  const exportTitle = useMemo((): string => {
    if (activeTab === "all") {
      return selectedPatientVisitor === "only-visitor" ? "All Visitor" : "New & Revisit Patient";
    }
    return tabOptions.find(t => t.value === activeTab)?.label || "All Reports";
  }, [activeTab, selectedPatientVisitor]);

  // Get export file name based on active tab (reactive)
  const exportFileName = useMemo((): string => {
    return exportTitle.toLowerCase().replace(/\s+/g, "_");
  }, [exportTitle]);

  // Use export hook - columns, title, and fileName are reactive
  const { handleExportPDF, handleExportCSV, isLoadingPDF, isLoadingCSV } = useExport({
    title: exportTitle,
    fileName: exportFileName,
    columns: exportColumns,
    fetchData: fetchAllDataForExport,
    logoUrl: "/images/logo.png",
    branchName: branchName ?? undefined,
  });

  const handleView = (report: DailyReport) => {
    setSelectedReport(report);
    setIsViewDialogOpen(true);
    // Scroll to details section after a brief delay to ensure it's rendered
    setTimeout(() => {
      const detailsSection = document.getElementById('view-user-details-section');
      if (detailsSection) {
        detailsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // Get table columns based on active tab and selected patient visitor option
  const tableColumns = useMemo(() => {
    // Pass selectedPatientVisitor only when on "all" tab (where the dropdown is visible)
    if (activeTab === "all") {
      return getTableColumns(activeTab, selectedPatientVisitor);
    }
    return getTableColumns(activeTab);
  }, [activeTab, selectedPatientVisitor]);

  // Get dialog fields for table (based on active tab and selected patient visitor option)
  const dialogFields = useMemo(() => {
    // Pass selectedPatientVisitor when on "all" tab to conditionally show fields
    if (activeTab === "all") {
      return getDialogFields(activeTab, selectedPatientVisitor);
    }
    return getDialogFields(activeTab);
  }, [activeTab, selectedPatientVisitor]);

  // Get dialog fields for details view.
  // Special cases on "All" tab with "Only Visitor" selected:
  // - For selected OPD/IPD records we show the Patient Visitor layout.
  // - For selected MEDICINE records we show the Patient Medicine Type layout.
  // When addressLine1 has value: show only Address Line 1 & 2, hide Address. Otherwise show only Address.
  // For visitor rows, also check visitorAddressLine1 so "Other Visitor" etc. show address lines when API returns them.
  const detailDialogFields = useMemo(() => {
    let fields: DialogField[];
    if (isOnlyVisitorAllTab && selectedReport) {
      if (selectedReport.type === "OPD" || selectedReport.type === "IPD") {
        fields = getDialogFields("patient-visitor");
      } else if (selectedReport.type === "MEDICINE") {
        fields = getDialogFields("patient-medicine-type");
      } else {
        fields = dialogFields;
      }
    } else {
      fields = dialogFields;
    }

    // For OPD or any non‑IPD visitor, hide IPD‑specific room/bed/building fields
    const isIpdVisitor = (selectedReport as any)?.type === "IPD";
    if (!isIpdVisitor) {
      fields = fields.filter(
        (f) =>
          f.key !== "patientRoomNo" &&
          f.key !== "patientBedNo" &&
          f.key !== "patientBuilding"
      );
    }

    const addr1 = selectedReport?.addressLine1 ?? (selectedReport as any)?.visitorAddressLine1;
    const hasAddressLine1 = addr1 != null && String(addr1).trim() !== "";
    let finalFields = fields;

    if (hasAddressLine1) {
      finalFields = finalFields.filter((f) => f.key !== "address");
    } else {
      finalFields = finalFields.filter((f) => f.key !== "addressLine1" && f.key !== "addressLine2");
    }

    // For "Others" tab (or corresponding visitor rows), show Visitor Company Name only when it exists
    const company = (selectedReport as any)?.visitorCompanyName;
    const hasCompanyName = company != null && String(company).trim() !== "";
    if (!hasCompanyName) {
      finalFields = finalFields.filter((f) => f.key !== "visitorCompanyName");
    }

    // Show Visitor Purpose only when it has a non-empty value
    const purpose = (selectedReport as any)?.visitorPurpose;
    const hasVisitorPurpose = purpose != null && String(purpose).trim() !== "";
    if (!hasVisitorPurpose) {
      finalFields = finalFields.filter((f) => f.key !== "visitorPurpose");
    }

    return finalFields;
  }, [isOnlyVisitorAllTab, selectedReport, dialogFields]);

  // Get data from API response and map fields
  const reports = useMemo(() => {
    if (!apiData?.data) return [];

    const formatDate = (dateString: string) => {
      try {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
      } catch {
        return dateString;
      }
    };

    return apiData.data.map((item) => {
      if (useVisitorsAPI) {
        // New grouped API format: each item is a GroupedVisitorItem
        const groupedItem = item as unknown as GroupedVisitorItem;
        const visitors = groupedItem.visitors || [];
        const firstVisitor = visitors[0];
// debugger
        if (!firstVisitor) {
          return {
            id: 0,
            type: "N/A",
            createdAt: groupedItem.createdAt || "",
            created: groupedItem.createdAt || "N/A",
            patientName: "N/A",
            visitorName: "N/A",
            allVisitors: [],
            visitorCount: 0,
          } as unknown as DailyReport;
        }

        const visitorType = firstVisitor.visitor_type;
        const createdFormatted = groupedItem.createdAt
          ? formatDate(groupedItem.createdAt)
          : (groupedItem.createdAt || "N/A");
        const patientName = formatNameWithTitle(firstVisitor.patient_name, firstVisitor.patient_title);
        const firstVisitorName = formatNameWithTitle(firstVisitor.visitor_name, firstVisitor.visitor_title);
// debugger
        // Patient Medicine Type tab or MEDICINE visitor on "All" + "Only Visitor"
        if (activeTab === "patient-medicine-type" || (isOnlyVisitorAllTab && visitorType === "MEDICINE")) {
          return {
            id: firstVisitor.id,
            patientName,
            uhid: firstVisitor.patient_uhid || "N/A",
            contactNumber: firstVisitor.patient_phone_number || firstVisitor.visitor_contact_number || "N/A",
            country: firstVisitor.visitor_country || "N/A",
            pinCode: firstVisitor.visitor_pin_code || "N/A",
            address: firstVisitor.visitor_address || "N/A",
            addressLine1: firstVisitor.visitor_address_line1 ?? undefined,
            addressLine2: firstVisitor.visitor_address_line2 ?? undefined,
            state: firstVisitor.visitor_state || "N/A",
            city: firstVisitor.visitor_city || "N/A",
            tehsil: firstVisitor.visitor_tehsil || undefined,
            area: firstVisitor.visitor_area || undefined,
            visitorName: firstVisitorName,
            visitorAadharCardNo: firstVisitor.visitor_aadhar_card_no || undefined,
            visitorPassportNumber: firstVisitor.visitor_passport_number || undefined,
            visitorNationalId: firstVisitor.visitor_national_id || undefined,
            visitorNationality: firstVisitor.visitor_nationality || "N/A",
            type: isOnlyVisitorAllTab ? "MEDICINE" : "Patient Medicine Type",
            created: createdFormatted,
            patientTitle: firstVisitor.patient_title,
            visitorTitle: firstVisitor.visitor_title,
            title: firstVisitor.patient_title,
            allVisitors: visitors,
            visitorCount: groupedItem.visitorCount,
          } as unknown as DailyReport;
        }

        // OPD / IPD / OTHER (and unrecognised types)
        return {
          id: firstVisitor.id,
          patientName,
          visitorName: firstVisitorName,
          type: formatVisitorType(visitorType),
          created: createdFormatted,
          visitorContactNumber: firstVisitor.visitor_contact_number,
          pinCode: firstVisitor.visitor_pin_code,
          address: firstVisitor.visitor_address || "N/A",
          addressLine1: firstVisitor.visitor_address_line1 ?? undefined,
          addressLine2: firstVisitor.visitor_address_line2 ?? undefined,
          city: firstVisitor.visitor_city,
          state: firstVisitor.visitor_state,
          country: firstVisitor.visitor_country,
          tehsil: firstVisitor.visitor_tehsil || undefined,
          area: firstVisitor.visitor_area || undefined,
          aadharNumber: firstVisitor.visitor_aadhar_card_no || undefined,
          visitorAadharCardNo: firstVisitor.visitor_aadhar_card_no || undefined,
          visitorPassportNumber: firstVisitor.visitor_passport_number || undefined,
          visitorNationalId: firstVisitor.visitor_national_id || undefined,
          visitorNationality: firstVisitor.visitor_nationality || undefined,
          visitorPurpose: firstVisitor.visitor_purpose || undefined,
          visitorCompanyName: firstVisitor.visitor_company_name || undefined,
          patientUhid: firstVisitor.patient_uhid || undefined,
          patientPhoneNumber: firstVisitor.patient_phone_number || undefined,
          patientRoomNo: firstVisitor.patient_room_no || undefined,
          patientBedNo: firstVisitor.patient_bed_no || undefined,
          patientBuilding: firstVisitor.patient_building || undefined,
          aadharPhoto: firstVisitor.aadhar_photo || undefined,
          vehiclePhoto: firstVisitor.vehicle_photo || undefined,
          patientTitle: firstVisitor.patient_title,
          visitorTitle: firstVisitor.visitor_title,
          title: firstVisitor.patient_title,
          allVisitors: visitors,
          visitorCount: groupedItem.visitorCount,
        } as unknown as DailyReport;
      } else {
        // Patient entry item - map fields from API response
        // debugger
        const patientItem = item as any;
        const patientTitle = patientItem.title;
        const visitorTitle = patientItem.visitorTitle;
        const rawPatientName = patientItem.name || patientItem.patientName;
        const rawVisitorName = patientItem.visitorName;
        return {
          ...patientItem,
          patientName: formatNameWithTitle(rawPatientName, patientTitle),
          visitorName: formatNameWithTitle(rawVisitorName, visitorTitle),
          rawVisitorName: rawVisitorName,
          registrationNo: patientItem.registerToken || patientItem.registrationNo || undefined,
          tokenNo: patientItem.opdToken || patientItem.tokenNo || null,
          created: patientItem.createdAt ? formatDate(patientItem.createdAt) : "N/A",
          contactNumber: patientItem.contactNo || patientItem.contactNumber,
          aadharNumber: patientItem.aadharCardNo || patientItem.aadharNumber,
          age: patientItem.age,
          emailAddress: patientItem.emailAddress,
          maritalStatus: patientItem.maritalStatus,
          occupation: patientItem.occupation,
          patientType: patientItem.patientType,
          pinCode: patientItem.pinCode,
          country: patientItem.country,
          state: patientItem.patientState || patientItem.state,
          city: patientItem.city,
          tehsil: patientItem.tehsil,
          area: patientItem.area,
          address: getDisplayAddress(patientItem as any),
          addressLine1: patientItem.addressLine1 ?? undefined,
          addressLine2: patientItem.addressLine2 ?? undefined,
          indianForeignerNepal: patientItem.nationality || patientItem.indianForeignerNepal,
          patientTitle,
          visitorTitle,
          title: patientTitle,
        } as DailyReport;
      }
    });
  }, [apiData, activeTab, selectedPatientVisitor, useVisitorsAPI, isOnlyVisitorAllTab]);

  const totalItems = useMemo(() => {
    return apiData?.total || 0;
  }, [apiData]);

  // Clear selected report if it's no longer in the current data set
  useEffect(() => {
    if (selectedReport && reports.length > 0) {
      const reportExists = reports.some(report => report.id === selectedReport.id);
      if (!reportExists) {
        setSelectedReport(null);
        setIsViewDialogOpen(false);
      }
    }
  }, [reports, selectedReport]);

  // Use API data directly (already paginated and filtered by backend)
  const paginatedData = reports;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  const handleSort = (columnKey: string) => {
    const apiField = getApiSortField(columnKey);

    // If clicking the same field, toggle order; otherwise set new field with DESC
    if (sortField === apiField) {
      setSortOrder(sortOrder === "ASC" ? "DESC" : "ASC");
    } else {
      setSortField(apiField);
      setSortOrder("DESC");
    }
    // Reset to first page when sorting changes
    setCurrentPage(1);
  };

  // Get sort direction for a column
  const getSortDirection = (columnKey: string): "asc" | "desc" | null => {
    const apiField = getApiSortField(columnKey);
    if (sortField === apiField) {
      return sortOrder === "ASC" ? "asc" : "desc";
    }
    return null;
  };

  // Handle opening view all dialog for visitor names
  const handleOpenViewAllVisitors = (visitorNames: string[]) => {
    setVisitorNamesDialogItems(visitorNames);
    setViewAllDialogOpen(true);
  };

  // Render visitor names with "+Count" button if multiple visitors
  const renderVisitorNames = (report: DailyReport): React.ReactNode => {
    // New grouped format: use allVisitors array when available
    const allVisitors = (report as any).allVisitors as RawVisitorDetail[] | undefined;

    if (allVisitors && allVisitors.length > 0) {
      const names = allVisitors
        .map(v => formatNameWithTitle(v.visitor_name, v.visitor_title))
        .filter((n): n is string => !!n && n !== "N/A");

      if (names.length === 0) return "N/A";
      if (names.length === 1) {
        return (
          <Tooltip content={names[0]} position="top" delay={0}>
            <span className="inline-block max-w-[200px] truncate align-top text-left">
              {names[0]}
            </span>
          </Tooltip>
        );
      }

      const remainingCount = names.length - 1;
      const allNamesTooltip = names.join(", ");
      return (
        <div className="flex items-center gap-2">
          <Tooltip content={allNamesTooltip} position="top" delay={0}>
            <span className="inline-block max-w-[140px] truncate align-top text-left">
              {names[0]}
            </span>
          </Tooltip>
          <button
            type="button"
            onClick={() => handleOpenViewAllVisitors(names)}
            className="inline-flex shrink-0 h-[30px] cursor-pointer items-center justify-center gap-2 rounded-[30px] border border-[#FDC70F]/32 bg-[#FDC70F]/5 px-4 text-xs font-semibold leading-[120%] text-[#9A7909] transition-colors hover:bg-[#FDC70F]/10"
          >
            +{remainingCount}
          </button>
        </div>
      );
    }

    // Fallback for patient-entries API (comma-separated names)
    const rawVisitorName = (report as any).rawVisitorName || report.visitorName;
    const rawVisitorTitle = (report as any).visitorTitle;

    if (!rawVisitorName || rawVisitorName === "N/A") return "N/A";

    const formattedName = formatNameWithTitle(rawVisitorName, rawVisitorTitle);
    if (!formattedName || formattedName === "N/A") return "N/A";

    const names = formattedName.split(",").map(n => n.trim()).filter(n => n.length > 0);
    if (names.length === 0) return "N/A";
    if (names.length === 1) {
      return (
        <Tooltip content={names[0]} position="top" delay={0}>
          <span className="inline-block max-w-[200px] truncate align-top text-left">
            {names[0]}
          </span>
        </Tooltip>
      );
    }

    const remainingCount = names.length - 1;
    const allNamesTooltip = names.join(", ");
    return (
      <div className="flex items-center gap-2">
        <Tooltip content={allNamesTooltip} position="top" delay={0}>
          <span className="inline-block max-w-[140px] truncate align-top text-left">
            {names[0]}
          </span>
        </Tooltip>
        <button
          type="button"
          onClick={() => handleOpenViewAllVisitors(names)}
          className="inline-flex shrink-0 h-[30px] cursor-pointer items-center justify-center gap-2 rounded-[30px] border border-[#FDC70F]/32 bg-[#FDC70F]/5 px-4 text-xs font-semibold leading-[120%] text-[#9A7909] transition-colors hover:bg-[#FDC70F]/10"
        >
          +{remainingCount}
        </button>
      </div>
    );
  };

  // Render table cell content
  const renderTableCell = (column: TableColumn, report: DailyReport, index: number): string | number | React.ReactNode => {
    if (column.key === "sr") {
      return (currentPage - 1) * itemsPerPage + index + 1;
    }
    if (column.key === "action") {
      return (
        <Tooltip content="View" >
        <button
      
          type="button"
          onClick={() => handleView(report)}
          className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[#F7FAF7]"
          aria-label="View details"
        >
          <Image src="/icons/ViewEyeIcon.svg" alt="View" width={20} height={20} />
        </button>
          </Tooltip>
      );
    }
    if (column.key === "visitorName") {
      return renderVisitorNames(report);
    }
    const value = report[column.key as keyof DailyReport];
    // Apply masking for contact number fields in table
    if (column.key === "contactNumber" || column.key === "visitorContactNumber") {
      if (value === undefined || value === null || String(value).trim() === "") {
        return "N/A";
      }
      return maskPhoneNumber(String(value));
    }
    if (column.key === "patientName") {
      const strValue = value !== undefined && value !== null ? String(value) : "N/A";
      if (strValue === "N/A") return strValue;
      return (
        <Tooltip content={strValue} position="top" delay={0}>
          <span className="inline-block max-w-[200px] truncate align-top text-left">
            {strValue}
          </span>
        </Tooltip>
      );
    }
    return value !== undefined && value !== null ? String(value) : "N/A";
  };

  // Group dialog fields by column
  const dialogFieldsByColumn = useMemo(() => {
    const columns: { [key: number]: DialogField[] } = { 1: [], 2: [], 3: [] };
    detailDialogFields.forEach((field) => {
      if (field.column) {
        columns[field.column].push(field);
      }
    });
    return columns;
  }, [detailDialogFields]);

  return (
    <GateEntryLayout title="" subModuleName="View Daily Reports">
      {!isViewDialogOpen && !selectedReport && (
        <div className="w-full overflow-hidden rounded-[20px] lg:border border-0 border-[#E3EEE1] p-0 lg:p-5">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-[32px] font-semibold leading-[120%] text-[#262D3B]">Daily Reports</h1>
            <div className="flex items-center gap-2">
              <GoToHomeButton onClick={handleGoToHome} />
              <BackToPreviousPageButton onClick={handleBack} />
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6">
            <Tabs options={tabOptions} value={activeTab} onChange={handleTabChange} />
          </div>

          <div className="mb-6 rounded-[20px] bg-white p-4">
            {/* Search and Filter Section */}
            <div className="mb-6 flex items-center lg:justify-between justify-end">
              <h2 className="text-lg font-semibold leading-[120%] text-[#434956] text-hide">
                {/* {activeTab === "all" ? "All" : tabOptions.find((t) => t.value === activeTab)?.label || "All"} */}
              </h2>
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <TableSearchInput
                  value={searchInput}
                  onChange={setSearchInput}
                  placeholder={activeTab === "patient-medicine-type" ? "Search by Name, Mobile Number" : "Search by Name"}
                />
                {activeTab === "all" && (
                  <div className="w-[250px]">
                    <FormSelectField
                      label=""
                      options={patientVisitorOptions}
                      value={selectedPatientVisitor}
                      onChange={(value) => {
                        const newValue = Array.isArray(value) ? value[0] : value || "";
                        setSelectedPatientVisitor(newValue);
                        setCurrentPage(1); // Reset to first page when filter changes
                        // Clear selected report and close details section when filter changes
                        setSelectedReport(null);
                        setIsViewDialogOpen(false);
                      }}
                      placeholder="Patient Visitors"
                      mode="single"
                      background="normal"
                      width={250}
                      height={44}
                    />
                  </div>
                )}
                <div className="relative" ref={filterRef}>
                  <button
                    type="button"
                    onClick={handleFilterClick}
                    className="cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center w-[108px] h-10 rounded-[32px] border border-[#0B8C00] bg-white hover:bg-[#F7FAF7] relative z-10"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Image src="/icons/FilterIcon.svg" alt="filter" width={24} height={24} />
                      <span className="font-inter font-medium text-sm leading-[120%] text-[#0B8C00] text-hide">Filter</span>
                    </div>
                  </button>
                  {isFilterOpen && (
                    <div className="absolute right-0 top-full mt-2 z-50">
                      <DateFilterDropdown
                        onFilter={handleFilter}
                        onClear={handleClear}
                        initialFromDate={fromDate}
                        initialToDate={toDate}
                      />
                    </div>
                  )}
                </div>
                {viewDailyReportsPerm.canDownload && (
                  <ExportButton
                    onExportPDF={handleExportPDF}
                    onExportCSV={handleExportCSV}
                    isLoadingPDF={isLoadingPDF}
                    isLoadingCSV={isLoadingCSV}
                  />
                )}
              </form>
            </div>

            {/* Table */}
            <div className="mb-6">
              <Table>
                <TableHeader>
                  <TableRow className="bg-white">
                    {tableColumns.map((column, index) => (
                      <TableHead
                        key={column.key}
                        position={index === 0 ? "first" : index === tableColumns.length - 1 ? "last" : undefined}
                        sortable={column.sortable}
                        sortDirection={column.sortable ? getSortDirection(column.key) : null}
                        onSort={column.sortable ? () => handleSort(column.key) : undefined}
                        className={column.key === "sr" ? "!w-14 !min-w-0 !max-w-14 !px-2 !whitespace-nowrap" : column.key === "action" ? "!w-14 !min-w-0 !max-w-14 !px-2" : undefined}
                      >
                        {column.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableData colSpan={tableColumns.length} className="py-12 text-center text-sm text-[#9CA3AF]">
                        Loading...
                      </TableData>
                    </TableRow>
                  ) : isError ? (
                    <TableRow>
                      <TableData colSpan={tableColumns.length} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <p className="text-sm text-red-500">Error loading reports. Please try again.</p>
                          <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#0B8C00] border border-[#0B8C00] rounded-[8px] bg-white hover:bg-[#F7FAF7] transition-colors"
                          >
                            <Image src="/icons/RefreshIcon.svg" alt="Refresh" width={16} height={16} />
                            Refresh Page
                          </button>
                        </div>
                      </TableData>
                    </TableRow>
                  ) : paginatedData.length === 0 ? (
                    <TableRow>
                      <TableData colSpan={tableColumns.length} className="py-12 text-center text-sm text-[#9CA3AF]">
                        No reports found
                      </TableData>
                    </TableRow>
                  ) : (
                    paginatedData.map((report, index) => (
                      <TableRow key={report.id} className="bg-white transition-colors hover:bg-[#F7FAF7]">
                        {tableColumns.map((column) => (
                          <TableData
                            key={column.key}
                            position={column.key === "action" ? "last" : column.key === "sr" ? "first" : undefined}
                            variant={column.key === "sr" ? "primary" : undefined}
                            className={
                              column.key === "sr"
                                ? "!w-14 !min-w-0 !max-w-14 !px-2 !whitespace-nowrap"
                                : column.key === "action"
                                  ? "!w-14 !min-w-0 !max-w-14 !px-2"
                                  : undefined
                            }
                          >
                            {renderTableCell(column, report, index)}
                          </TableData>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {!isLoading && totalItems > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
                itemsPerPageOptions={[10, 20, 50, 100]}
              />
            )}
          </div>
        </div>
      )}


      {/* ----------------------------------------------------------------------------- */}
      {/* View User Details Section - Inline */}
      {isViewDialogOpen && selectedReport && (
        <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] px-5 pb-5 pt-5 ">
          {/* Header */}
          <div className="mb-6 flex items-center lg:justify-between justify-end">
            <h1 className="text-[32px] font-semibold leading-[120%] text-[#262D3B]">
              {isOnlyVisitorAllTab && selectedReport?.type === "MEDICINE"
                ? "Patient Medicine Type"
                : isOnlyVisitorAllTab && selectedReport?.type === "OPD"
                ? "OPD Visitor"
                : isOnlyVisitorAllTab && selectedReport?.type === "IPD"
                ? "IPD Visitor"
                : isOnlyVisitorAllTab && (selectedReport?.type === "OTHER" || selectedReport?.type === "Other")
                ? "Other Visitor"
                : getDialogTitle(activeTab, selectedPatientVisitor, selectedReport)}
            </h1>
            <BackToPreviousPageButton onClick={() => {
              setIsViewDialogOpen(false);
              setSelectedReport(null);
            }} />
          </div>
          {/* ---- Visitor API: multi-visitor view (new grouped response format) ---- */}
          {useVisitorsAPI && (() => {
            const allVis = (selectedReport as any).allVisitors as RawVisitorDetail[] | undefined;
            if (!allVis || allVis.length === 0) return null;

            const firstVisitor = allVis[0];
            const isMedicineVisitorLayout = firstVisitor.visitor_type === "MEDICINE";

            const getVisitorSectionTitle = (visitor: RawVisitorDetail, idx: number) => {
              if (allVis.length > 1 && !isMedicineVisitorLayout) return `Visitor ${idx + 1} Information`;
              switch (visitor.visitor_type) {
                case "OPD": return "OPD Visitor Information";
                case "IPD": return "IPD Visitor Information";
                case "MEDICINE": return "Patient Medicine Type Information";
                case "OTHER": return "Other Visitor Information";
                default: return getInnerInformationText(activeTab, selectedPatientVisitor, selectedReport);
              }
            };

            const resolvePhotoSrc = (raw: string | null | undefined): string | null => {
              if (!raw) return null;
              return raw.startsWith("http://") || raw.startsWith("https://") ? raw : `/api/files/${raw}`;
            };

            // MEDICINE (single or multiple visitors): one address block (incl. Who Visited for Medicine once) + Visitor Information with Visitor 1, Visitor 2, ...
            if (isMedicineVisitorLayout) {
              const sharedRows = buildVisitorFieldRows(firstVisitor, maskPhoneNumber, formatNameWithTitle);
              const whoVisitedValues = [...new Set(
                allVis.map((v) =>
                  v.is_patient_visit_for_medicine === true
                    ? "Patient"
                    : v.is_patient_visit_for_medicine === false
                      ? "Visitor"
                      : "N/A"
                )
              )];
              const whoVisitedDisplay = whoVisitedValues.filter((x) => x !== "N/A").length > 0
                ? whoVisitedValues.join(", ")
                : "N/A";
              const patientAddressRows = [
                ...sharedRows.slice(0, 3),
                [sharedRows[3][0], { label: "Who Visited for Medicine", value: whoVisitedDisplay }],
              ];
              const getIdValue = (v: RawVisitorDetail) => {
                const n = v.visitor_nationality || "Indian";
                if (n === "Foreigner") return v.visitor_passport_number?.trim() || "";
                if (n === "Nepal") return v.visitor_national_id?.trim() || "";
                return v.visitor_aadhar_card_no?.trim() || "";
              };
              const hasRealValue = (s: string | undefined | null) => {
                const t = (s ?? "").trim();
                return t.length > 0 && t.toUpperCase() !== "N/A";
              };
              const hasVisitorData = (v: RawVisitorDetail) =>
                hasRealValue(formatNameWithTitle(v.visitor_name, v.visitor_title)) ||
                hasRealValue(v.visitor_nationality) ||
                hasRealValue(getIdValue(v));
              const visitorsWithData = allVis.filter(hasVisitorData);
              return (
                <div className="space-y-6">
                  <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] px-5 pb-5 pt-5 bg-white">
                    <div className="mb-5">
                      <h1 className="font-inter font-medium text-[18px] leading-[1.2] text-[#262D3B]">
                        Medicine Type Information
                      </h1>
                    </div>
                    <div>
                      {patientAddressRows.map((row, rowIdx) => (
                        <div key={rowIdx} className="grid grid-cols-3 gap-4 border-t border-b border-[#DFE0E2] mb-4">
                          {row.map((field, fieldIdx) => (
                            <div key={fieldIdx} className="space-y-1 border-r last:border-0 border-[#DFE0E2] py-[10px] px-4">
                              <p className="text-xs font-medium text-[#7B8089]">{field.label}</p>
                              <p className="text-sm font-medium text-[#262D3B] break-words">{field.value}</p>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                    {visitorsWithData.length > 0 && (
                      <div className="mt-6">
                        <h2 className="font-inter font-medium text-[18px] leading-[1.2] text-[#262D3B] mb-4">
                          Visitor Information
                        </h2>
                        {visitorsWithData.map((visitor, idx) => {
                          const nameVal = formatNameWithTitle(visitor.visitor_name, visitor.visitor_title)?.trim() || "";
                          const nationalityVal = visitor.visitor_nationality?.trim() || "";
                          const idVal = getIdValue(visitor);
                          const cells: Array<{ label: string; value: string }> = [];
                          if (hasRealValue(nameVal)) cells.push({ label: "Visitor Name", value: nameVal });
                          if (hasRealValue(nationalityVal)) cells.push({ label: "Visitor Nationality", value: nationalityVal });
                          if (hasRealValue(idVal)) cells.push({ label: "Visitor Aadhar Number", value: idVal });
                          if (cells.length === 0) return null;
                          return (
                            <div key={visitor.id ?? idx} className={idx > 0 ? "mt-4" : ""}>
                              <h3 className="font-inter font-medium text-[16px] leading-[1.2] text-[#262D3B] mb-2">
                                Visitor {idx + 1}
                              </h3>
                              <div
                                className="grid gap-4 border-t border-b border-[#DFE0E2] mb-4"
                                style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}
                              >
                                {cells.map((cell, cellIdx) => (
                                  <div
                                    key={cellIdx}
                                    className="space-y-1 border-r last:border-0 border-[#DFE0E2] py-[10px] px-4"
                                  >
                                    <p className="text-xs font-medium text-[#7B8089]">{cell.label}</p>
                                    <p className="text-sm font-medium text-[#262D3B] break-words">{cell.value}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            return allVis.map((visitor, visIdx) => {
              const isIpdOrMedicine = visitor.visitor_type === "IPD" || visitor.visitor_type === "MEDICINE";
              const fieldRows = buildVisitorFieldRows(visitor, maskPhoneNumber, formatNameWithTitle);
              const aadharSrc = resolvePhotoSrc(visitor.aadhar_photo);

              return (
                <div key={visitor.id ?? visIdx} className={`grid grid-cols-12 gap-4 ${visIdx > 0 ? "mt-4" : ""}`}>
                  <div className={isIpdOrMedicine ? "col-span-12" : "col-span-8"}>
                    <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] px-5 pb-5 pt-5 bg-white">
                      <div className="mb-5">
                        <h1 className="font-inter font-medium text-[18px] leading-[1.2] text-[#262D3B]">
                          {getVisitorSectionTitle(visitor, visIdx)}
                        </h1>
                      </div>
                      <div>
                        {fieldRows.map((row, rowIdx) => (
                          <div key={rowIdx} className="grid grid-cols-3 gap-4 border-t border-b border-[#DFE0E2] mb-4">
                            {row.map((field, fieldIdx) => (
                              <div key={fieldIdx} className="space-y-1 border-r last:border-0 border-[#DFE0E2] py-[10px] px-4">
                                <p className="text-xs font-medium text-[#7B8089]">{field.label}</p>
                                <p className="text-sm font-medium text-[#262D3B] break-words">{field.value}</p>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {!isIpdOrMedicine && (
                    <div className="col-span-4">
                      <div className="w-full h-full overflow-hidden rounded-[20px] border border-[#E3EEE1] px-5 pb-5 pt-5 bg-white flex flex-col">
                        <div className="mb-5 flex-shrink-0">
                          <h1 className="font-inter font-medium text-[18px] leading-[1.2] text-[#262D3B]">
                            Aadhar Card Photo
                          </h1>
                        </div>
                        <div className="flex flex-1 items-center justify-center min-h-0">
                          {aadharSrc ? (
                            <img src={aadharSrc} alt="Aadhar Card" className="w-full max-w-[400px] h-[185px] object-cover" />
                          ) : (
                            <p className="text-sm font-medium text-[#7B8089]">No Data Available</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            });
          })()}

          {/* ---- Patient-entries API: existing detail layout ---- */}
          {!useVisitorsAPI && (
            <>
              <div className="grid grid-cols-12 gap-4">
                <div
                  className={
                    activeTab === "patient-medicine-type" ||
                    (activeTab === "patient-visitor" && selectedReport?.type === "IPD")
                      ? "col-span-12"
                      : "col-span-8"
                  }
                >
                  <div id="view-user-details-section" className="w-full h-full overflow-hidden rounded-[20px] border border-[#E3EEE1] px-5 pb-5 pt-5 bg-white">
                    <div className="mb-5 flex items-center justify-between">
                      <h1 className="font-inter font-medium text-[18px] leading-[1.2] text-[#262D3B]">
                        {getInnerInformationText(activeTab, selectedPatientVisitor, selectedReport)}
                      </h1>
                    </div>
                    <div className="space-y-4">
                      {Array.from({ length: Math.ceil(detailDialogFields.length / 3) }, (_, rowIndex) => {
                        const rowFields = detailDialogFields.slice(rowIndex * 3, rowIndex * 3 + 3);
                        return (
                          <div key={rowIndex} className="grid grid-cols-3 gap-4 border-t border-b border-[#DFE0E2] mb-4">
                            {rowFields.map((field) => {
                              if (field.key === "visitorIdentification") {
                                const visitorNationality = (selectedReport as any).visitorNationality;
                                let identificationLabel = "Visitor Aadhar Card Number";
                                let identificationValue = (selectedReport as any).visitorAadharCardNo;
                                if (visitorNationality === "Nepal") {
                                  identificationLabel = "Visitor National Id";
                                  identificationValue = (selectedReport as any).visitorNationalId;
                                } else if (visitorNationality === "Foreigner") {
                                  identificationLabel = "Visitor Passport Number";
                                  identificationValue = (selectedReport as any).visitorPassportNumber;
                                }
                                return (
                                  <div key={field.key} className="space-y-1 border-r last:border-0 border-[#DFE0E2] py-[10px] px-4">
                                    <p className="text-xs font-medium text-[#7B8089]">{identificationLabel}</p>
                                    <p className="text-sm font-medium text-[#262D3B]">
                                      {identificationValue ? String(identificationValue) : "N/A"}
                                    </p>
                                  </div>
                                );
                              }
                              if (field.key === "patientPhoneOrUhid") {
                                const phone = (selectedReport as any).patientPhoneNumber;
                                const uhid = (selectedReport as any).patientUhid;
                                const hasPhone = phone != null && String(phone).trim() !== "";
                                const hasUhid = uhid != null && String(uhid).trim() !== "";
                                const label = hasPhone ? "Patient Phone No." : hasUhid ? "Patient UHID" : "Patient Phone No.";
                                const value = hasPhone ? maskPhoneNumber(String(phone).trim()) : hasUhid ? String(uhid).trim() : "N/A";
                                return (
                                  <div key={field.key} className="space-y-1 border-r last:border-0 border-[#DFE0E2] py-[10px] px-4">
                                    <p className="text-xs font-medium text-[#7B8089]">{label}</p>
                                    <p className="text-sm font-medium text-[#262D3B]">{value}</p>
                                  </div>
                                );
                              }
                              let displayValue = selectedReport[field.key];
                              if (field.key === "patientType") {
                                const panelName = (selectedReport as any).panelName;
                                if (panelName && panelName !== "N/A" && panelName.trim() !== "") {
                                  displayValue = panelName;
                                }
                              }
                              if (field.key === "addressLine1") {
                                displayValue = displayValue ?? (selectedReport as any)?.visitorAddressLine1;
                              } else if (field.key === "addressLine2") {
                                displayValue = displayValue ?? (selectedReport as any)?.visitorAddressLine2;
                              }
                              const addr1ForLabel = selectedReport?.addressLine1 ?? (selectedReport as any)?.visitorAddressLine1;
                              const hasAddressLine1 = addr1ForLabel != null && String(addr1ForLabel).trim() !== "";
                              const isIndiaCountry = selectedReport?.country === "India" || selectedReport?.country === "6";
                              const label =
                                field.key === "pinCode" && hasAddressLine1
                                  ? "ZIP/Postal Code"
                                  : field.key === "city"
                                    ? (isIndiaCountry ? "District" : "City")
                                    : field.label;
                              const isContactNumberField = field.key === "contactNumber" || field.key === "visitorContactNumber";
                              const finalDisplayValue = field.key === "visitorPurpose"
                                ? ((displayValue != null && String(displayValue).trim() !== "") ? String(displayValue).trim() : "N/A")
                                : isContactNumberField && displayValue
                                ? maskPhoneNumber(String(displayValue))
                                : displayValue
                                  ? String(displayValue)
                                  : "N/A";
                              return (
                                <div key={field.key} className="space-y-1 border-r last:border-0 border-[#DFE0E2] py-[10px] px-4">
                                  <p className="text-xs font-medium text-[#7B8089]">{label}</p>
                                  <p className="text-sm font-medium text-[#262D3B] break-words">{finalDisplayValue}</p>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                {!(activeTab === "patient-medicine-type" || (activeTab === "patient-visitor" && selectedReport?.type === "IPD")) && (
                  <div className="col-span-4">
                    <div id="view-user-details-section" className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] px-5 pb-5 pt-5 bg-white">
                      <div className="mb-5 flex items-center justify-between">
                        <h1 className="font-inter font-medium text-[18px] leading-[1.2] text-[#262D3B]">Vehicle Number Photo</h1>
                      </div>
                      <div className="flex justify-center">
                        {(() => {
                          const vehiclePhoto = (selectedReport as any)?.vehiclePhoto as string | undefined;
                          const vehicleSrc = vehiclePhoto && (vehiclePhoto.startsWith("http://") || vehiclePhoto.startsWith("https://")) ? vehiclePhoto : null;
                          return vehicleSrc ? (
                            <img src={vehicleSrc} alt="Vehicle Number" className="w-full max-w-[280px] h-[185px] object-cover" />
                          ) : (
                            <p className="text-sm font-medium text-[#7B8089]">No Data Available</p>
                          );
                        })()}
                      </div>
                    </div>
                    <div id="view-user-details-section" className="mt-4 w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] px-5 pb-5 pt-5 bg-white">
                      <div className="mb-5 flex items-center justify-between">
                        <h1 className="font-inter font-medium text-[18px] leading-[1.2] text-[#262D3B]">Aadhar Card Photo</h1>
                      </div>
                      <div className="flex justify-center">
                        {(() => {
                          const aadharPhoto = (selectedReport as any)?.aadharPhoto as string | undefined;
                          const aadharSrc = aadharPhoto && (aadharPhoto.startsWith("http://") || aadharPhoto.startsWith("https://")) ? aadharPhoto : null;
                          return aadharSrc ? (
                            <img src={aadharSrc} alt="Aadhar Card" className="w-full max-w-[280px] h-[185px] object-cover" />
                          ) : (
                            <p className="text-sm font-medium text-[#7B8089]">No Data Available</p>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Visitor Information Section for patient-entries API */}
              <div className="grid grid-cols-12 gap-4">
                {(() => {
                  const rawVisitorName = (selectedReport as any).rawVisitorName || (selectedReport as any).visitorName;
                  const rawVisitorTitle = (selectedReport as any).visitorTitle;
                  const visitorAadharCardNo = (selectedReport as any).visitorAadharCardNo;
                  const visitorPassportNumber = (selectedReport as any).visitorPassportNumber;
                  const visitorNationalId = (selectedReport as any).visitorNationalId;
                  const visitorNationality = (selectedReport as any).visitorNationality;

                  if (!rawVisitorName || rawVisitorName === "N/A") return null;

                  const visitorNames = rawVisitorName.split(",").map((n: string) => n.trim()).filter((n: string) => n.length > 0);
                  const visitorTitles = rawVisitorTitle && rawVisitorTitle !== "N/A"
                    ? rawVisitorTitle.split(",").map((t: string) => t.trim()).filter((t: string) => t.length > 0)
                    : [];
                  const visitorNationalities = visitorNationality && visitorNationality !== "N/A"
                    ? visitorNationality.split(",").map((n: string) => n.trim()).filter((n: string) => n.length > 0)
                    : [];

                  const parseIdField = (v: string | undefined): string[] => {
                    if (!v || v === "N/A") return [];
                    return v.includes(",")
                      ? v.split(",").map(s => s.trim()).filter(s => s.length > 0 && s !== "N/A")
                      : [v.trim()];
                  };

                  const aadhars = parseIdField(visitorAadharCardNo);
                  const passports = parseIdField(visitorPassportNumber);
                  const nationalIds = parseIdField(visitorNationalId);

                  const visitors = visitorNames.map((name: string, idx: number) => {
                    const title = visitorTitles[idx] || visitorTitles[0] || "";
                    const formattedName = title ? `${title} ${name}` : name;
                    const nat = visitorNationalities[idx] || visitorNationalities[0] || "N/A";
                    let identificationLabel = "Visitor Aadhar Number";
                    let identification = "N/A";
                    if (nat === "Indian") {
                      const cnt = visitorNationalities.slice(0, idx).filter((n: string) => n === "Indian").length;
                      identification = aadhars[cnt] || "N/A";
                    } else if (nat === "Foreigner") {
                      identificationLabel = "Visitor Passport Number";
                      const cnt = visitorNationalities.slice(0, idx).filter((n: string) => n === "Foreigner").length;
                      identification = passports[cnt] || "N/A";
                    } else if (nat === "Nepal") {
                      identificationLabel = "Visitor National Id";
                      const cnt = visitorNationalities.slice(0, idx).filter((n: string) => n === "Nepal").length;
                      identification = nationalIds[cnt] || "N/A";
                    } else {
                      if (aadhars[idx]) { identification = aadhars[idx]; }
                      else if (passports[idx]) { identificationLabel = "Visitor Passport Number"; identification = passports[idx]; }
                      else if (nationalIds[idx]) { identificationLabel = "Visitor National Id"; identification = nationalIds[idx]; }
                    }
                    return { name: formattedName, nationality: nat, identification, identificationLabel };
                  });

                  if (visitors.length === 0) return null;

                  return (
                    <div className="col-span-8 w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] px-5 pb-5 pt-5 bg-white mt-4">
                      <div className="mb-5">
                        <h1 className="font-inter font-medium text-[18px] leading-[1.2] text-[#262D3B]">Visitor Information</h1>
                      </div>
                      <div className="space-y-4">
                        {visitors.map((visitor: { name: string; nationality: string; identification: string; identificationLabel: string }, idx: number) => (
                          <div key={idx}>
                            <div className="mb-2">
                              <p className="text-sm font-medium text-[#262D3B]">Visitor {idx + 1}</p>
                            </div>
                            <div className="border-t border-b border-[#DFE0E2] mb-4">
                              <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4">
                                  <p className="text-xs font-medium text-[#7B8089]">Visitor Name</p>
                                  <p className="text-sm font-medium text-[#262D3B] break-words">{visitor.name}</p>
                                </div>
                                <div className="space-y-1 border-r border-[#DFE0E2] py-[10px] px-4">
                                  <p className="text-xs font-medium text-[#7B8089]">Visitor Nationality</p>
                                  <p className="text-sm font-medium text-[#262D3B] break-words">{visitor.nationality}</p>
                                </div>
                                <div className="space-y-1 py-[10px] px-4">
                                  <p className="text-xs font-medium text-[#7B8089]">{visitor.identificationLabel}</p>
                                  <p className="text-sm font-medium text-[#262D3B] break-words">{visitor.identification}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </>
          )}
        </div>
      )}




      {/* ============================================== */}
      {/* View All Visitors Dialog */}
      <Dialog
        open={viewAllDialogOpen && visitorNamesDialogItems.length > 0}
        onClose={() => {
          setViewAllDialogOpen(false);
          setVisitorNamesDialogItems([]);
        }}
        title="View All Visitors"
        width={600}
        contentPadding="px-6 py-6"
      >
        {/* Visitors Content */}
        <div className="flex flex-wrap gap-2">
          {visitorNamesDialogItems.map((name, idx) => (
            <span
              key={`${name}-${idx}`}
              className="inline-flex h-[30px] items-center justify-center rounded-[30px] border border-[#FDC70F]/32 bg-[#FDC70F]/5 px-5 text-xs font-semibold leading-[120%] text-[#9A7909]"
            >
              {name}
            </span>
          ))}
        </div>
      </Dialog>
    </GateEntryLayout>
  );
}

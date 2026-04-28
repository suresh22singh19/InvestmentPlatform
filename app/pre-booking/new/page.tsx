"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import type { RefObject } from "react";
import { useFormik } from "formik";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { BackToPreviousPageButton, Button, FormInputField, FormSelectField, MessageDialog } from "@/components/ui";
import { createPreBookingFormSchema, type PreBookingFormValues } from "@/lib/validation/preBookingSchemas";
import { getPreBookingAdvanceDaysFromMasterList } from "@/lib/utils/preBookingMasterSettings";
import PreBookingPatientInformation from "@/components/registration/PreBookingPatientInformation";
import AddressDetails from "@/components/forms/AddressDetails";
import AddictionDetails from "@/components/registration/AddictionDetails";
import PatientType from "@/components/registration/PatientType";
import DiagnosisInformation from "@/components/registration/DiagnosisInformation";
import IpdOpdDetails from "@/components/registration/IpdOpdDetails";
import PatientAlreadyExistsDialog from "@/components/registration/PatientAlreadyExistsDialog";
import type { SelectOption } from "@/components/ui/FormSelectField";
import { useAppSelector } from "@/store/hooks";
import { selectUserBranchId, selectRoleCategoryType, selectSelectedBranch } from "@/store/slices/authSlice";
import { registrationApi } from "@/store/api/registrationApi";
import type { ExistingPatient } from "@/store/api/gateApi";
import { useGetDiagnosisCategoriesQuery, useGetMasterSettingsQuery, useGetBranchesQuery } from "@/store/api/settingsApi";
import {
  useCreatePreBookingMutation,
  useUpdatePreBookingMutation,
  type PreBookingListItem,
} from "@/store/api/preBookingApi";
import {
  PRE_BOOKING_LIST_BRANCH_STORAGE_KEY,
  readPersistedBranchFilterSelection,
  writePersistedBranchFilterSelection,
} from "@/hooks/useBranchFilter";
import { useGetDoctorsByBranchQuery } from "@/store/api/registrationApi";
import {
  useLazyGetPincodeQuery,
  useGetCountriesQuery,
  useGetStatesQuery,
  useGetCitiesQuery,
  useGetTehsilsQuery,
  useGetAreasQuery,
} from "@/store/api/publicApi";

const PRE_BOOKING_EDIT_STORAGE_KEY = "hiims-pre-booking-edit-data";

const initialValues: PreBookingFormValues = {
  contactNumber: "",
  branchId: "",
  doctor: "",
  gender: "",
  emailAddress: "",
  patientNameSelect: "",
  patientName: "",
  age: "",
  fathersHusbandsNameSelect: "",
  fathersHusbandsName: "",
  maritalStatus: "",
  pinCode: "",
  country: "6",
  state: "",
  city: "",
  tehsil: "",
  area: "",
  address: "",
  addressLine1: "",
  addressLine2: "",
  gstBilling: false,
  gstNumber: "",
  companyName: "",
  billingAddress: "",
  billingState: "",
  billingCity: "",
  billingPincode: "",
  addictionAlcohol: false,
  addictionSmoking: false,
  addictionTobacco: false,
  addictionDrugs: false,
  addictionOther: false,
  addictionSpecify: "",
  referral: "no",
  source: "",
  tvSpecificField: "",
  newspaperSpecificField: "",
  socialMediaSpecificField: "",
  doctorSpecificField: "",
  referralName: "",
  referralMobile: "",
  patientType: "",
  patientSubType: "",
  panelId: "",
  benificiaryId: "",
  insuranceCompany: "",
  ayushCovered: "",
  jsHealthCardNo: "",
  diagnosis: "",
  subDiagnosis: "",
  symptoms: "",
  bookingType: "opd",
  appointmentDate: "",
  timeSlot: "",
  packageId: "",
  startDate: "",
  endDate: "",
  amount: "",
  paymentMode: "",
  paymentMethod: "",
  transactionId: "",
};

// Field order for scroll-to-first-error (matches form layout: Contact → Title → Name → Age → Gender → Guardian Title → Father's Name → Marital Status → Doctor → Pin Code → etc.)
const PRE_BOOKING_FIELD_ORDER = [
  "patientType", "panelId", "patientSubType", "benificiaryId", "insuranceCompany", "ayushCovered",
  "contactNumber", "patientNameSelect", "patientName", "age", "gender", "fathersHusbandsNameSelect", "fathersHusbandsName", "emailAddress", "maritalStatus", "doctor", "jsHealthCardNo",
  "country", "pinCode", "state", "city", "tehsil", "area", "address", "addressLine1", "addressLine2",
  "addictionSpecify", "diagnosis", "subDiagnosis", "symptoms",
  "bookingType", "appointmentDate", "timeSlot", "packageId", "startDate", "endDate", "amount", "paymentMode", "paymentMethod", "transactionId",
];

function mapApiToFormikTimeSlot(timeSlot: string | null | undefined): string {
  if (!timeSlot) return "";
  const normalized = String(timeSlot).trim();
  const map: Record<string, string> = {
    "09:00am - 10:00am": "09:00-10:00",
    "10:00am - 11:00am": "10:00-11:00",
    "11:00am - 12:00pm": "11:00-12:00",
    "12:00pm - 01:00pm": "12:00-13:00",
    "01:00pm - 02:00pm": "13:00-14:00",
    "02:00pm - 03:00pm": "14:00-15:00",
    "03:00pm - 04:00pm": "15:00-16:00",
    "04:00pm - 05:00pm": "16:00-17:00",
    "05:00pm - 06:00pm": "17:00-18:00",
  };
  return map[normalized] ?? normalized;
}

function normalizeAddictionList(addiction: string[] | string | null | undefined): string[] {
  if (Array.isArray(addiction)) {
    return addiction.map((x) => String(x || "").toLowerCase()).filter(Boolean);
  }
  if (!addiction) return [];
  const raw = String(addiction).trim();
  if (!raw) return [];
  if (raw.startsWith("[") && raw.endsWith("]")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((x) => String(x || "").toLowerCase()).filter(Boolean);
    } catch {
      // fallback to split below
    }
  }
  return raw
    .split(",")
    .map((x) => x.replace(/["'\[\]]/g, "").trim().toLowerCase())
    .filter(Boolean);
}

export default function NewPreBookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editIdParam = searchParams?.get("editId") ?? null;
  const editPreBookingId = editIdParam && /^\d+$/.test(editIdParam) ? Number(editIdParam) : null;
  const isEditMode = editPreBookingId != null;
  const userBranchId = useAppSelector(selectUserBranchId);
  const headerSelectedBranch = useAppSelector(selectSelectedBranch);
  const roleCategoryType = useAppSelector(selectRoleCategoryType);
  const isPreBookingSuperAdmin = roleCategoryType?.toLowerCase() === "superadmin";
  const [superAdminPreBookingBranch, setSuperAdminPreBookingBranch] = useState("");
  const isSuperAdminForSubmitRef = useRef(false);
  const submittedBranchIdRef = useRef<number | undefined>(undefined);
  const editAddressTextRef = useRef<{
    state?: string;
    city?: string;
    tehsil?: string;
    area?: string;
  } | null>(null);
  const hasPrefilledEditAddressRef = useRef(false);
  /** Prevents the edit-prefill effect from re-running every time formik changes. */
  const hasInitializedEditRef = useRef(false);

  const { data: branchesForSuperAdmin, isLoading: isLoadingSuperAdminBranches } = useGetBranchesQuery(undefined, {
    skip: !isPreBookingSuperAdmin,
  });
  const superAdminBranchOptions: SelectOption[] = useMemo(() => {
    const rows = branchesForSuperAdmin?.data;
    if (!Array.isArray(rows) || rows.length === 0) return [];
    return rows.map((b) => ({ value: String(b.id), label: b.name }));
  }, [branchesForSuperAdmin]);

  const [checkExistingPatientsQuery] = registrationApi.useLazyCheckExistingPatientsByPhoneQuery();
  const [createPreBooking, { isLoading: isCreatingPreBooking }] = useCreatePreBookingMutation();
  const [updatePreBooking, { isLoading: isUpdatingPreBooking }] = useUpdatePreBookingMutation();
  const isSubmitting = isCreatingPreBooking || isUpdatingPreBooking;
  const [getPincode] = useLazyGetPincodeQuery();

  const [patientExistsDialogOpen, setPatientExistsDialogOpen] = useState(false);
  const [existingPatients, setExistingPatients] = useState<ExistingPatient[]>([]);
  const [selectedRevisitPatient, setSelectedRevisitPatient] = useState<ExistingPatient | null>(null);
  const [isContactLoading, setIsContactLoading] = useState(false);
  const lastCheckedContactRef = useRef<string>("");
  /** When country name cannot be resolved until `countriesData` loads (revisit from registration). */
  const pendingRevisitAddressForCountryRef = useRef<{
    pinCode?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    tehsil?: string;
    area?: string;
    addressLine1?: string;
    addressLine2?: string;
  } | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
  const [apiErrorMessage, setApiErrorMessage] = useState("");

  const resolveBranchId = useCallback(
    (branchIdValue?: string) => {
      if (branchIdValue?.trim()) {
        const n = Number(branchIdValue);
        if (Number.isFinite(n) && n > 0) return n;
      }
      if (userBranchId != null) {
        const n = Number(userBranchId);
        if (Number.isFinite(n) && n > 0) return n;
      }
      if (headerSelectedBranch?.id != null) {
        const n = Number(headerSelectedBranch.id);
        if (Number.isFinite(n) && n > 0) return n;
      }
      return undefined;
    },
    [userBranchId, headerSelectedBranch?.id]
  );

  // Refs for scroll-to-first-error on validation failure
  const contactNumberRef = useRef<HTMLInputElement>(null);
  const doctorRef = useRef<HTMLDivElement>(null);
  const patientNameSelectRef = useRef<HTMLDivElement>(null);
  const patientNameRef = useRef<HTMLInputElement>(null);
  const ageRef = useRef<HTMLInputElement>(null);
  const genderRef = useRef<HTMLDivElement>(null);
  const emailAddressRef = useRef<HTMLInputElement>(null);
  const fathersHusbandsNameSelectRef = useRef<HTMLDivElement>(null);
  const fathersHusbandsNameRef = useRef<HTMLInputElement>(null);
  const maritalStatusRef = useRef<HTMLDivElement>(null);
  const jsHealthCardNoRef = useRef<HTMLInputElement>(null);
  const patientTypeRef = useRef<HTMLDivElement>(null);
  const panelIdRef = useRef<HTMLDivElement>(null);
  const patientSubTypeRef = useRef<HTMLDivElement>(null);
  const benificiaryIdRef = useRef<HTMLInputElement>(null);
  const insuranceCompanyRef = useRef<HTMLInputElement>(null);
  const ayushCoveredRef = useRef<HTMLDivElement>(null);
  const pinCodeRef = useRef<HTMLInputElement>(null);
  const countryRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<HTMLDivElement>(null);
  const tehsilRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const addressLine1Ref = useRef<HTMLInputElement>(null);
  const addressLine2Ref = useRef<HTMLInputElement>(null);
  const addictionSpecifyRef = useRef<HTMLInputElement>(null);
  const diagnosisRef = useRef<HTMLDivElement>(null);
  const subDiagnosisRef = useRef<HTMLDivElement>(null);
  const symptomsRef = useRef<HTMLTextAreaElement>(null);
  const appointmentDateRef = useRef<HTMLInputElement>(null);
  const timeSlotRef = useRef<HTMLDivElement>(null);
  const packageIdRef = useRef<HTMLDivElement>(null);
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const paymentModeRef = useRef<HTMLDivElement>(null);
  const paymentMethodRef = useRef<HTMLDivElement>(null);
  const transactionIdRef = useRef<HTMLInputElement>(null);

  const fieldRefMap = useMemo((): Record<string, RefObject<HTMLElement | null>> => ({
    contactNumber: contactNumberRef as RefObject<HTMLElement | null>,
    doctor: doctorRef as RefObject<HTMLElement | null>,
    patientNameSelect: patientNameSelectRef as RefObject<HTMLElement | null>,
    patientName: patientNameRef as RefObject<HTMLElement | null>,
    age: ageRef as RefObject<HTMLElement | null>,
    gender: genderRef as RefObject<HTMLElement | null>,
    emailAddress: emailAddressRef as RefObject<HTMLElement | null>,
    fathersHusbandsNameSelect: fathersHusbandsNameSelectRef as RefObject<HTMLElement | null>,
    fathersHusbandsName: fathersHusbandsNameRef as RefObject<HTMLElement | null>,
    maritalStatus: maritalStatusRef as RefObject<HTMLElement | null>,
    jsHealthCardNo: jsHealthCardNoRef as RefObject<HTMLElement | null>,
    patientType: patientTypeRef as RefObject<HTMLElement | null>,
    panelId: panelIdRef as RefObject<HTMLElement | null>,
    patientSubType: patientSubTypeRef as RefObject<HTMLElement | null>,
    benificiaryId: benificiaryIdRef as RefObject<HTMLElement | null>,
    insuranceCompany: insuranceCompanyRef as RefObject<HTMLElement | null>,
    ayushCovered: ayushCoveredRef as RefObject<HTMLElement | null>,
    pinCode: pinCodeRef as RefObject<HTMLElement | null>,
    country: countryRef as RefObject<HTMLElement | null>,
    state: stateRef as RefObject<HTMLElement | null>,
    city: cityRef as RefObject<HTMLElement | null>,
    tehsil: tehsilRef as RefObject<HTMLElement | null>,
    area: areaRef as RefObject<HTMLElement | null>,
    address: addressRef as RefObject<HTMLElement | null>,
    addressLine1: addressLine1Ref as RefObject<HTMLElement | null>,
    addressLine2: addressLine2Ref as RefObject<HTMLElement | null>,
    addictionSpecify: addictionSpecifyRef as RefObject<HTMLElement | null>,
    diagnosis: diagnosisRef as RefObject<HTMLElement | null>,
    subDiagnosis: subDiagnosisRef as RefObject<HTMLElement | null>,
    symptoms: symptomsRef as RefObject<HTMLElement | null>,
    appointmentDate: appointmentDateRef as RefObject<HTMLElement | null>,
    timeSlot: timeSlotRef as RefObject<HTMLElement | null>,
    packageId: packageIdRef as RefObject<HTMLElement | null>,
    startDate: startDateRef as RefObject<HTMLElement | null>,
    endDate: endDateRef as RefObject<HTMLElement | null>,
    amount: amountRef as RefObject<HTMLElement | null>,
    paymentMode: paymentModeRef as RefObject<HTMLElement | null>,
    paymentMethod: paymentMethodRef as RefObject<HTMLElement | null>,
    transactionId: transactionIdRef as RefObject<HTMLElement | null>,
  }), []);

  const { data: masterSettingsData } = useGetMasterSettingsQuery();
  const preBookingAdvanceDays = useMemo(
    () => getPreBookingAdvanceDaysFromMasterList(masterSettingsData?.data),
    [masterSettingsData?.data],
  );
  const preBookingValidationSchema = useMemo(
    () => createPreBookingFormSchema(preBookingAdvanceDays),
    [preBookingAdvanceDays],
  );

  const formik = useFormik<PreBookingFormValues>({
    initialValues,
    validationSchema: preBookingValidationSchema,
    validateOnChange: true,
    validateOnBlur: true,
    onSubmit: async (values) => {
      if (isSubmitting) return;
      try {
        const resolvedBranchId = isSuperAdminForSubmitRef.current
          ? submittedBranchIdRef.current ?? resolveBranchId(values.branchId)
          : resolveBranchId(values.branchId);
        if (resolvedBranchId == null) {
          setApiErrorMessage("Branch is required.");
          setShowApiErrorDialog(true);
          return;
        }
        const addictionList = [
          values.addictionAlcohol && "alcohol",
          values.addictionSmoking && "smoking",
          values.addictionTobacco && "tobacco",
          values.addictionDrugs && "drugs",
          values.addictionOther && (values.addictionSpecify?.toLowerCase() || "other"),
        ].filter(Boolean) as string[];

        // Resolve country, state, city, tehsil, area IDs to names for API payload (using already-fetched data)
        let countryName: string | undefined = values.country === "6" ? "India" : undefined;
        let stateName: string | undefined = values.state || undefined;
        let cityName: string | undefined = values.city || undefined;
        let tehsilName: string | undefined = values.tehsil || undefined;
        let areaName: string | undefined = values.area || undefined;

        if (values.country && countriesData?.data) {
          const countryObj = countriesData.data.find((c) => String(c.id) === String(values.country));
          if (countryObj?.name) {
            countryName = countryObj.name;
          }
        }
        if (values.state && statesData?.data) {
          const stateObj = statesData.data.find((s) => String(s.id) === String(values.state));
          if (stateObj?.name) {
            stateName = stateObj.name;
          }
        }
        if (values.city && citiesData?.data) {
          const cityObj = citiesData.data.find((c) => String(c.id) === String(values.city));
          if (cityObj?.name) {
            cityName = cityObj.name;
          }
        }
        if (values.tehsil && tehsilsData?.data) {
          const tehsilObj = tehsilsData.data.find((t) => String(t.id) === String(values.tehsil));
          if (tehsilObj?.name) {
            tehsilName = tehsilObj.name;
          }
        }
        if (values.area && areasData?.data) {
          const areaObj = areasData.data.find((a) => String(a.id) === String(values.area));
          if (areaObj?.name) {
            areaName = areaObj.name;
          }
        }

        const payload = {
          branchId: resolvedBranchId,
          uhid: selectedRevisitPatient?.uhid ?? undefined,
          contactNumber: values.contactNumber,
          patientName: values.patientName,
          patientTitle: values.patientNameSelect || undefined,
          guardianTitle: values.fathersHusbandsNameSelect || undefined,
          parentName: values.fathersHusbandsName || undefined,
          gender: values.gender ? values.gender.charAt(0).toUpperCase() + values.gender.slice(1) : undefined,
          age: values.age,
          emailAddress: values.emailAddress || undefined,
          maritalStatus: values.maritalStatus ? values.maritalStatus.charAt(0).toUpperCase() + values.maritalStatus.slice(1) : undefined,
          doctorUserId: values.doctor ? Number(values.doctor) : undefined,
          pinCode: values.pinCode || undefined,
          country: countryName ?? (values.country === "6" ? "India" : values.country),
          state: stateName,
          city: cityName,
          tehsil: tehsilName,
          area: areaName,
          areaId: values.area && /^\d+$/.test(values.area) ? Number(values.area) : undefined,
          address: values.address || undefined,
          addressLine1: values.addressLine1 || undefined,
          addressLine2: values.addressLine2 || undefined,
          addiction: addictionList.length > 0 ? addictionList : undefined,
          patientType: values.patientType ? values.patientType.charAt(0).toUpperCase() + values.patientType.slice(1) : undefined,
          patientSubType: values.patientSubType || undefined,
          panelId: values.panelId || undefined,
          benificiaryId: values.benificiaryId || undefined,
          insuranceCompany: values.insuranceCompany || undefined,
          ayushCovered: values.ayushCovered || undefined,
          // jsHealthCardNo: values.jsHealthCardNo || undefined,
          diagnosisId: values.diagnosis ? Number(values.diagnosis) : undefined,
          subDiagnosisId: values.subDiagnosis ? Number(values.subDiagnosis) : undefined,
          symptoms: values.symptoms || undefined,
          bookingType: (values.bookingType || "opd").toLowerCase(),
          // dateApp: values.bookingType === "opd" ? values.appointmentDate : undefined,
          appointmentDate: values.bookingType === "opd" ? values.appointmentDate : undefined,
          timeSlot: values.bookingType === "opd" ? values.timeSlot : undefined,
          remarks: "",
          packageId: values.bookingType === "ipd" ? values.packageId : undefined,
          startDate: values.bookingType === "ipd" ? values.startDate : undefined,
          endDate: values.bookingType === "ipd" ? values.endDate : undefined,
          amount: values.bookingType === "ipd" ? values.amount : undefined,
          paymentMode: values.bookingType === "ipd" ? values.paymentMode : undefined,
          paymentMethod: values.bookingType === "ipd" ? values.paymentMethod : undefined,
          transactionId: values.bookingType === "ipd" ? values.transactionId : undefined,
        };
        // The update endpoint rejects `contactNumber`; strip it before sending.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { contactNumber: _omit, ...updatePayload } = payload;
        const res = isEditMode && editPreBookingId != null
          ? await updatePreBooking({ id: editPreBookingId, ...updatePayload }).unwrap()
          : await createPreBooking(payload).unwrap();
        setSuccessMessage(
          res?.message ??
          (isEditMode ? "Pre-booking updated successfully." : "Pre-booking created successfully.")
        );
        setShowSuccessDialog(true);
      } catch (err: any) {
        const msg = err?.data?.message || err?.message || (isEditMode ? "Failed to update pre-booking." : "Failed to save pre-booking.");
        setApiErrorMessage(msg);
        setShowApiErrorDialog(true);
      }
    },
  });

  const effectivePreBookingBranchId = useMemo(() => {
    if (isPreBookingSuperAdmin) {
      const n = parseInt(superAdminPreBookingBranch, 10);
      if (Number.isFinite(n) && n > 0) return n;
      const fb = headerSelectedBranch?.id ?? userBranchId;
      return fb != null && Number.isFinite(Number(fb)) ? Number(fb) : undefined;
    }
    return resolveBranchId(formik.values.branchId);
  }, [
    isPreBookingSuperAdmin,
    superAdminPreBookingBranch,
    headerSelectedBranch?.id,
    userBranchId,
    formik.values.branchId,
    resolveBranchId,
  ]);

  isSuperAdminForSubmitRef.current = isPreBookingSuperAdmin;
  submittedBranchIdRef.current = effectivePreBookingBranchId;

  useEffect(() => {
    if (!isPreBookingSuperAdmin) return;
    if (superAdminPreBookingBranch !== "") return;
    const fromList = readPersistedBranchFilterSelection(PRE_BOOKING_LIST_BRANCH_STORAGE_KEY);
    if (fromList) {
      setSuperAdminPreBookingBranch(fromList);
      return;
    }
    const id = headerSelectedBranch?.id ?? userBranchId;
    if (id != null && Number.isFinite(Number(id))) {
      setSuperAdminPreBookingBranch(String(id));
    }
  }, [isPreBookingSuperAdmin, superAdminPreBookingBranch, headerSelectedBranch?.id, userBranchId]);

  useEffect(() => {
    if (!isPreBookingSuperAdmin) return;
    if (effectivePreBookingBranchId == null) return;
    const s = String(effectivePreBookingBranchId);
    if (formik.values.branchId !== s) {
      formik.setFieldValue("branchId", s, false);
    }
  }, [isPreBookingSuperAdmin, effectivePreBookingBranchId, formik]);

  useEffect(() => {
    if (!isEditMode || editPreBookingId == null) return;
    // Guard: only run once per editId to prevent re-running on every formik state change.
    if (hasInitializedEditRef.current) return;
    if (typeof window === "undefined") return;
    hasInitializedEditRef.current = true;
    try {
      const raw = localStorage.getItem(PRE_BOOKING_EDIT_STORAGE_KEY);
      if (!raw) return;
      const item = JSON.parse(raw) as PreBookingListItem | null;
      if (!item || Number(item.id) !== Number(editPreBookingId)) return;

      const addictionList = normalizeAddictionList(item.addiction);
      const nextBranchId = item.branch_id != null ? String(item.branch_id) : "";
      const countryLower = String(item.country ?? "").toLowerCase();
      const isIndiaEdit =
        countryLower === "india" || String(item.country) === "6" || countryLower === "6";

      // Allow the address-resolution effect to fire once after initial values are set.
      hasPrefilledEditAddressRef.current = false;
      const nextValues: PreBookingFormValues = {
        ...initialValues,
        branchId: nextBranchId,
        contactNumber: item.contact_number ?? "",
        patientName: item.patient_name ?? "",
        patientNameSelect: item.patient_title ?? "",
        age: item.age ?? "",
        gender: (item.gender ?? "").toLowerCase(),
        emailAddress: item.email_address ?? "",
        fathersHusbandsNameSelect: item.guardian_title ?? "",
        fathersHusbandsName: item.guardian_name ?? "",
        maritalStatus: (item.marital_status ?? "").toLowerCase(),
        doctor: item.doctor_user_id != null ? String(item.doctor_user_id) : "",
        pinCode: item.pin_code ?? "",
        country: isIndiaEdit ? "6" : "",
        // For India, these fields are IDs, but API provides names; we resolve IDs via pincode API.
        state: isIndiaEdit ? "" : (item.state ?? ""),
        city: isIndiaEdit ? "" : (item.city ?? ""),
        tehsil: isIndiaEdit ? "" : (item.tehsil ?? ""),
        area: isIndiaEdit ? "" : (item.area ?? ""),
        address: item.address ?? "",
        addressLine1: item.address_line1 ?? "",
        addressLine2: item.address_line2 ?? "",
        addictionAlcohol: addictionList.includes("alcohol"),
        addictionSmoking: addictionList.includes("smoking"),
        addictionTobacco: addictionList.includes("tobacco"),
        addictionDrugs: addictionList.includes("drugs"),
        addictionSpecify:
          addictionList.find((a) => !["alcohol", "smoking", "tobacco", "drugs", "other", "others"].includes(a)) ?? "",
        // Check "Other" when the list contains "other"/"others" OR a custom specify value.
        addictionOther:
          addictionList.includes("other") ||
          addictionList.includes("others") ||
          addictionList.some((a) => !["alcohol", "smoking", "tobacco", "drugs", "other", "others"].includes(a)),
        patientType: (item.patient_type ?? "").toLowerCase(),
        patientSubType: item.patient_sub_type ?? "",
        panelId: item.panel_id != null ? String(item.panel_id) : "",
        benificiaryId: item.benificiary_id ?? "",
        insuranceCompany: item.insurance_company ?? "",
        ayushCovered: item.ayush_covered ?? "",
        diagnosis: item.diagnosis_id != null ? String(item.diagnosis_id) : "",
        subDiagnosis: item.sub_diagnosis_id != null ? String(item.sub_diagnosis_id) : "",
        symptoms: item.symptoms ?? "",
        bookingType: (item.booking_type ?? "opd").toLowerCase(),
        appointmentDate: item.appointment_date?.slice(0, 10) ?? "",
        // API returns time slot in the same format as the UI options.
        timeSlot: item.appointment_time ?? "",
      };

      formik.setValues(nextValues, false);
      setSelectedRevisitPatient(null);
      setExistingPatients([]);
      setPatientExistsDialogOpen(false);
      lastCheckedContactRef.current = "";
      if (isPreBookingSuperAdmin && nextBranchId) {
        setSuperAdminPreBookingBranch(nextBranchId);
      }

      if (isIndiaEdit) {
        editAddressTextRef.current = {
          state: item.state,
          city: item.city,
          tehsil: item.tehsil,
          area: item.area,
        };
      } else {
        editAddressTextRef.current = null;
      }
    } catch {
      // Ignore parsing errors and allow manual edit.
    }
  // Intentionally omit `formik` and `isPreBookingSuperAdmin` from deps: formik is a new object
  // on every render, which would cause this effect to re-run and overwrite the prefilled values.
  // The `hasInitializedEditRef` guard ensures this runs exactly once per editId.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, editPreBookingId]);

  // Facility / corporate: branch is not chosen via UI; Yup requires `branchId`. Sync from auth/header when empty.
  useEffect(() => {
    if (isPreBookingSuperAdmin) return;
    if (formik.values.branchId?.trim()) return;
    const resolved = resolveBranchId("");
    if (resolved == null) return;
    formik.setFieldValue("branchId", String(resolved), false);
  }, [
    isPreBookingSuperAdmin,
    formik.values.branchId,
    formik.setFieldValue,
    resolveBranchId,
    userBranchId,
    headerSelectedBranch?.id,
  ]);

  const resetPreBookingFormOnSuperAdminBranchChange = useCallback(
    (nextBranchId: number) => {
      formik.resetForm({
        values: { ...initialValues, branchId: String(nextBranchId) },
      });
      lastCheckedContactRef.current = "";
      setExistingPatients([]);
      setPatientExistsDialogOpen(false);
      setSelectedRevisitPatient(null);
      setIsContactLoading(false);
    },
    [formik],
  );

  // If master setting tightens the window, snap appointment date back into range
  useEffect(() => {
    if (formik.values.bookingType !== "opd") return;
    const apt = formik.values.appointmentDate?.trim();
    if (!apt || !/^\d{4}-\d{2}-\d{2}$/.test(apt)) return;
    const [y, mo, d] = apt.split("-").map((n) => parseInt(n, 10));
    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return;
    const selected = new Date(y, mo - 1, d);
    selected.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxD = new Date(today);
    maxD.setDate(maxD.getDate() + preBookingAdvanceDays);
    if (selected < today || selected > maxD) {
      const clamped = selected > maxD ? maxD : today;
      formik.setFieldValue(
        "appointmentDate",
        `${clamped.getFullYear()}-${String(clamped.getMonth() + 1).padStart(2, "0")}-${String(clamped.getDate()).padStart(2, "0")}`,
        false,
      );
    }
  }, [preBookingAdvanceDays, formik.values.bookingType, formik.values.appointmentDate]);

  // Pre-load location master data so CreatePrebooking doesn't need to fire these APIs
  const { data: countriesData } = useGetCountriesQuery();
  const preBookingAddressIsIndia = formik.values.country === "6";
  const { data: statesData } = useGetStatesQuery(
    formik.values.country && preBookingAddressIsIndia ? { countryId: formik.values.country } : undefined,
    { skip: !formik.values.country || !preBookingAddressIsIndia }
  );
  const { data: citiesData } = useGetCitiesQuery(
    formik.values.state && preBookingAddressIsIndia ? { stateId: formik.values.state } : undefined,
    { skip: !formik.values.state || !preBookingAddressIsIndia }
  );
  const { data: tehsilsData } = useGetTehsilsQuery(
    formik.values.city && preBookingAddressIsIndia
      ? { districtId: formik.values.city }
      : undefined,
    { skip: !formik.values.city || !preBookingAddressIsIndia }
  );
  const { data: areasData } = useGetAreasQuery(
    formik.values.tehsil && preBookingAddressIsIndia ? { tehsilId: formik.values.tehsil } : undefined,
    { skip: !formik.values.tehsil || !preBookingAddressIsIndia }
  );

  const { data: diagnosisCategoriesData } = useGetDiagnosisCategoriesQuery({
    page: 1,
    limit: 100,
    sort: "createdAt",
    order: "desc",
  });
  const { data: doctorsData } = useGetDoctorsByBranchQuery(
    { branchId: effectivePreBookingBranchId },
    {
      skip: effectivePreBookingBranchId == null,
      refetchOnMountOrArgChange: true,
    }
  );

  const prefillAddressFromPincode = useCallback(
    async (addr: { pinCode?: string; state?: string; city?: string; tehsil?: string; area?: string }) => {
      if (!addr?.pinCode) return;
      const digits = addr.pinCode.replace(/\D/g, "").slice(0, 6);
      if (!digits) return;

      try {
        const result = await getPincode(digits).unwrap();
        const raw = result?.data;
        const items: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
        if (!items.length) return;

        const normalize = (v?: string | null) => (v || "").toString().trim().toLowerCase();
        const targetState = normalize(addr.state);
        const targetCity = normalize(addr.city);
        const targetTehsil = normalize(addr.tehsil);
        const targetArea = normalize(addr.area);

        let best = items[0];
        let bestScore = -1;
        items.forEach((item) => {
          let score = 0;
          if (targetState && normalize(item.state) === targetState) score += 4;
          if (targetCity && normalize(item.district) === targetCity) score += 3;
          if (targetTehsil && normalize(item.tehsil) === targetTehsil) score += 2;
          if (targetArea && normalize(item.area) === targetArea) score += 1;
          if (score > bestScore) {
            bestScore = score;
            best = item;
          }
        });

        if (best.country_id) formik.setFieldValue("country", String(best.country_id), false);
        if (best.state_id) formik.setFieldValue("state", String(best.state_id), false);
        if (best.district_id) formik.setFieldValue("city", String(best.district_id), false);
        if (best.tehsil_id) formik.setFieldValue("tehsil", String(best.tehsil_id), false);
        if (best.area_id) formik.setFieldValue("area", String(best.area_id), false);
        setTimeout(() => {
          void formik.validateField("emailAddress");
        }, 10);
      } catch {
        // Ignore pincode prefill errors; user can still select manually
      }
    },
    [getPincode, formik]
  );

  // Keep a stable ref to the latest prefillAddressFromPincode so the address-resolution
  // effect below does not re-run every render (the useCallback recreates on every formik change).
  const prefillAddressFromPincodeRef = useRef(prefillAddressFromPincode);
  useEffect(() => {
    prefillAddressFromPincodeRef.current = prefillAddressFromPincode;
  });

  // Edit-mode address resolution:
  // API returns India location as names, but the form uses master-list IDs. Resolve via pincode API.
  useEffect(() => {
    if (!isEditMode || editPreBookingId == null) return;
    if (formik.values.country !== "6") return;
    if (!formik.values.pinCode) return;
    if (!editAddressTextRef.current) return;
    if (hasPrefilledEditAddressRef.current) return;

    hasPrefilledEditAddressRef.current = true;
    void prefillAddressFromPincodeRef.current({
      pinCode: formik.values.pinCode,
      state: editAddressTextRef.current.state,
      city: editAddressTextRef.current.city,
      tehsil: editAddressTextRef.current.tehsil,
      area: editAddressTextRef.current.area,
    });
  }, [
    isEditMode,
    editPreBookingId,
    formik.values.country,
    formik.values.pinCode,
    // prefillAddressFromPincode is intentionally omitted — the stable ref is used instead.
  ]);

  /** Resolve registration address country to master id; India uses pincode cascade, non-India uses state/city text from API. */
  const applyRevisitAddressFromRegistration = useCallback(
    (addr: {
      pinCode?: string;
      address?: string;
      city?: string;
      state?: string;
      country?: string;
      tehsil?: string;
      area?: string;
      addressLine1?: string;
      addressLine2?: string;
    }) => {
      if (addr.pinCode) formik.setFieldValue("pinCode", addr.pinCode, false);
      if (addr.address) formik.setFieldValue("address", addr.address, false);
      if (addr.addressLine1) formik.setFieldValue("addressLine1", addr.addressLine1, false);
      if (addr.addressLine2) formik.setFieldValue("addressLine2", addr.addressLine2, false);

      const rawCountry = addr.country != null ? String(addr.country).trim() : "";
      let resolvedCountryId: string | null = null;

      if (!rawCountry) {
        void prefillAddressFromPincode({
          pinCode: addr.pinCode,
          state: addr.state,
          city: addr.city,
          tehsil: addr.tehsil,
          area: addr.area,
        });
        return;
      }

      if (rawCountry) {
        if (!isNaN(Number(rawCountry)) && rawCountry !== "") {
          resolvedCountryId = rawCountry;
          formik.setFieldValue("country", rawCountry, false);
        } else if (rawCountry.toLowerCase() === "india") {
          resolvedCountryId = "6";
          formik.setFieldValue("country", "6", false);
        } else if (countriesData?.data) {
          const country = countriesData.data.find(
            (c: { id: number | string; name: string }) =>
              (c.name || "").toLowerCase() === rawCountry.toLowerCase()
          );
          if (country) {
            resolvedCountryId = String(country.id);
            formik.setFieldValue("country", resolvedCountryId, false);
          }
        }
      }

      if (resolvedCountryId === "6") {
        void prefillAddressFromPincode({
          pinCode: addr.pinCode,
          state: addr.state,
          city: addr.city,
          tehsil: addr.tehsil,
          area: addr.area,
        });
      } else if (resolvedCountryId && resolvedCountryId !== "6") {
        formik.setFieldValue("state", addr.state != null ? String(addr.state).trim() : "", false);
        formik.setFieldValue("city", addr.city != null ? String(addr.city).trim() : "", false);
        formik.setFieldValue("tehsil", "", false);
        formik.setFieldValue("area", "", false);
      } else if (rawCountry && countriesData?.data) {
        const found = countriesData.data.some(
          (c: { name?: string }) => (c.name || "").toLowerCase() === rawCountry.toLowerCase()
        );
        if (!found) {
          formik.setFieldValue("state", addr.state != null ? String(addr.state).trim() : "", false);
          formik.setFieldValue("city", addr.city != null ? String(addr.city).trim() : "", false);
          formik.setFieldValue("tehsil", "", false);
          formik.setFieldValue("area", "", false);
        }
      }
    },
    [formik, countriesData, prefillAddressFromPincode]
  );

  useEffect(() => {
    if (!countriesData?.data || !pendingRevisitAddressForCountryRef.current) return;
    const addr = pendingRevisitAddressForCountryRef.current;
    pendingRevisitAddressForCountryRef.current = null;
    applyRevisitAddressFromRegistration(addr);
  }, [countriesData, applyRevisitAddressFromRegistration]);

  const checkExistingPatients = useCallback(
    async (phoneNumber: string) => {
      if (!phoneNumber || phoneNumber.length !== 10 || lastCheckedContactRef.current === phoneNumber) return;
      setIsContactLoading(true);
      lastCheckedContactRef.current = phoneNumber;
      try {
        const branchId = effectivePreBookingBranchId;
        if (branchId == null) return;
        const result = await checkExistingPatientsQuery({
          branchId,
          phoneNumber,
        }).unwrap();
        const registrations = result.data?.registrations || [];
        const preBookings = result.data?.preBookings || [];
        const userLead = result.data?.userLead;

        const mappedRegistrations: ExistingPatient[] = (registrations as any[]).map((r: any) => ({
          id: r.id,
          sUhid: r.sUhid ?? null,
          uhid: r.uhid ?? "",
          branchId: r.branchId ?? branchId,
          patientName: r.patientName ?? "",
          patientTitle: r.patientTitle,
          gender: r.gender,
          age: r.age,
          contactNumber: r.contactNumber ?? "",
          whatsappNo: r.whatsappNo,
          emailAddress: r.emailAddress,
          maritalStatus: r.maritalStatus,
          aadharCardNo: r.aadharCardNo,
          address: r.address,
          name: r.patientName ?? "",
          branchName: "N/A",
          addictionType: r.addictionType,
          addictionSpecify: r.addictionSpecify,
          guardianName: r.guardianName,
          guardianTitle: r.guardianTitle,
          jsHealthCardNo: r.jsHealthCardNo,
          doctorUserId: r.doctorUserId,
          panelId: r.panelId,
          benificiaryId: r.benificiaryId,
          insuranceCompany: r.insuranceCompany,
          ayushCovered: r.ayushCovered,
          patientType: r.patientType,
          patientSubType: r.patientSubType,
          diagnosis: r.diagnosis ?? r.v1Diagnosis,
          subDiagnosis: r.subDiagnosis ?? r.v1SubDiagnosis,
          symptoms: r.symptoms ?? r.v1Symptoms,
          isPreBooking: false,
          preBookingId: null,
        }));

        // Map pre-bookings – support both snake_case (new API) and camelCase (old API)
        const mappedPreBookings: ExistingPatient[] = (preBookings as any[]).map((pb: any) => {
          const patientName = pb.patient_name ?? pb.patientName ?? "";
          const patientTitle = pb.patient_title ?? pb.patientTitle ?? undefined;
          const guardianName = pb.guardian_name ?? pb.guardianName ?? "";
          const guardianTitle = pb.guardian_title ?? pb.guardianTitle ?? undefined;
          const contactNumber = pb.contact_number ?? pb.contactNumber ?? "";
          const emailAddress = pb.email_address ?? pb.emailAddress ?? undefined;
          const maritalStatus = pb.marital_status ?? pb.maritalStatus ?? "";
          const patientType = pb.patient_type ?? pb.patientType ?? null;
          const patientSubType = pb.patient_sub_type ?? pb.patientSubType ?? null;
          const benificiaryId = pb.benificiary_id ?? pb.benificiaryId ?? null;
          const insuranceCompany = pb.insurance_company ?? pb.insuranceCompany ?? null;
          const ayushCovered = pb.ayush_covered ?? pb.ayushCovered ?? null;
          const pinCode = pb.pin_code ?? pb.pinCode ?? "";
          const addressLine1 = pb.address_line1 ?? pb.addressLine1 ?? undefined;
          const addressLine2 = pb.address_line2 ?? pb.addressLine2 ?? undefined;
          // Parse addiction if it's a JSON string
          let addictionType: string[] | undefined;
          try {
            if (Array.isArray(pb.addiction)) addictionType = pb.addiction;
            else if (typeof pb.addiction === "string" && pb.addiction) addictionType = JSON.parse(pb.addiction);
          } catch { addictionType = undefined; }
          return {
            id: pb.id || 0,
            sUhid: null,
            uhid: pb.uhid || "",
            branchId: pb.branch_id ?? pb.branchId ?? branchId,
            patientName,
            patientTitle,
            doctorUserId: pb.doctor_user_id ?? pb.doctorUserId ?? undefined,
            gender: pb.gender || "",
            age: pb.age || "",
            contactNumber,
            whatsappNo: contactNumber,
            emailAddress,
            maritalStatus,
            aadharCardNo: undefined,
            occupation: undefined,
            religion: undefined,
            specificReligion: null,
            jsHealthCardNo: null,
            guardianName,
            guardianTitle,
            patientType,
            panelId: pb.panel_id ?? pb.panelId ?? null,
            patientSubType,
            benificiaryId,
            insuranceCompany,
            ayushCovered,
            addictionType,
            addictionSpecify: pb.addiction_specify ?? pb.addictionSpecify ?? undefined,
            diagnosis: String(pb.diagnosis_id ?? pb.diagnosisId ?? ""),
            subDiagnosis: String(pb.sub_diagnosis_id ?? pb.subDiagnosisId ?? ""),
            symptoms: pb.symptoms ?? undefined,
            address: {
              id: 0,
              address: pb.address || "",
              city: pb.city || "",
              pinCode,
              state: pb.state || "",
              country: pb.country === "101" ? "6" : (pb.country || "India"),
              tehsil: pb.tehsil || undefined,
              area: pb.area || undefined,
              addressLine1,
              addressLine2,
              areaId: pb.area_id ?? pb.areaId ?? undefined,
            },
            name: patientName,
            branchName: "N/A",
            isPreBooking: true,
            preBookingId: pb.id || null,
          } as ExistingPatient;
        });

        // Priority: preBookings first. If preBookings exist, show ONLY preBookings.
        // If no preBookings but registrations exist, show only registrations.
        if (preBookings.length > 0) {
          setExistingPatients(mappedPreBookings);
          setPatientExistsDialogOpen(true);
        } else if (registrations.length > 0) {
          setExistingPatients(mappedRegistrations);
          setPatientExistsDialogOpen(true);
        } else if (userLead && Object.keys(userLead).length > 0) {
          const ul = userLead as any;
          setExistingPatients([
            {
              id: ul.id ?? 0,
              uhid: ul.uhid ?? "",
              branchId: ul.branchId ?? effectivePreBookingBranchId,
              patientName: ul.patientName ?? "",
              patientTitle: ul.parentPrefix,
              contactNumber: ul.contactNumber ?? "",
              gender: ul.gender,
              age: ul.age,
              name: ul.patientName ?? "",
              branchName: "N/A",
            },
          ]);
          setPatientExistsDialogOpen(true);
        }
      } catch {
        lastCheckedContactRef.current = "";
      } finally {
        setIsContactLoading(false);
      }
    },
    [checkExistingPatientsQuery, effectivePreBookingBranchId]
  );

  const handleContactNumberChange = useCallback(
    (value: string) => {
      if (value && value.length === 10) checkExistingPatients(value);
      else lastCheckedContactRef.current = "";
    },
    [checkExistingPatients]
  );

  const handleRevisit = useCallback(
    (patient: ExistingPatient) => {
      setPatientExistsDialogOpen(false);
      setSelectedRevisitPatient(patient);
      lastCheckedContactRef.current = "";

      // Patient Information
      if (patient.contactNumber) formik.setFieldValue("contactNumber", patient.contactNumber, false);
      if (patient.patientTitle) formik.setFieldValue("patientNameSelect", patient.patientTitle, false);
      if (patient.patientName || patient.name) formik.setFieldValue("patientName", patient.patientName || (patient as { name?: string }).name || "", false);
      if (patient.gender) formik.setFieldValue("gender", patient.gender.toLowerCase(), false);
      if (patient.age) formik.setFieldValue("age", String(patient.age ?? ""), false);
      if (patient.emailAddress) formik.setFieldValue("emailAddress", patient.emailAddress, false);
      if (patient.maritalStatus) formik.setFieldValue("maritalStatus", patient.maritalStatus.toLowerCase(), false);
      if (patient.branchId) formik.setFieldValue("branchId", String(patient.branchId), false);
      if (patient.doctorUserId) formik.setFieldValue("doctor", String(patient.doctorUserId), false);
      const guardianName = (patient as { guardianName?: string }).guardianName;
      const guardianTitle = (patient as { guardianTitle?: string }).guardianTitle;
      if (guardianName) formik.setFieldValue("fathersHusbandsName", guardianName, false);
      if (guardianTitle) formik.setFieldValue("fathersHusbandsNameSelect", guardianTitle, false);
      if ((patient as { jsHealthCardNo?: string }).jsHealthCardNo) formik.setFieldValue("jsHealthCardNo", (patient as { jsHealthCardNo?: string }).jsHealthCardNo ?? "", false);

      // Address Details — resolve country to master id; non-India uses state/city text (do not run India pincode cascade)
      const addr = patient.address as {
        address?: string;
        city?: string;
        pinCode?: string;
        state?: string;
        country?: string;
        tehsil?: string;
        area?: string;
        addressLine1?: string;
        addressLine2?: string;
      } | undefined;
      if (addr) {
        const rawCountry = addr.country != null ? String(addr.country).trim() : "";
        const canResolveCountryWithoutMasterList =
          !rawCountry ||
          (!isNaN(Number(rawCountry)) && rawCountry !== "") ||
          rawCountry.toLowerCase() === "india";
        const needsDeferCountry =
          Boolean(rawCountry) && !canResolveCountryWithoutMasterList && !countriesData?.data;

        if (needsDeferCountry) {
          pendingRevisitAddressForCountryRef.current = {
            pinCode: addr.pinCode,
            address: addr.address,
            city: addr.city,
            state: addr.state,
            country: addr.country,
            tehsil: addr.tehsil,
            area: addr.area,
            addressLine1: addr.addressLine1,
            addressLine2: addr.addressLine2,
          };
          if (addr.pinCode) formik.setFieldValue("pinCode", addr.pinCode, false);
          if (addr.address) formik.setFieldValue("address", addr.address, false);
          if (addr.addressLine1) formik.setFieldValue("addressLine1", addr.addressLine1, false);
          if (addr.addressLine2) formik.setFieldValue("addressLine2", addr.addressLine2, false);
          formik.setFieldValue("country", "", false);
        } else {
          applyRevisitAddressFromRegistration(addr);
        }

        setTimeout(() => {
          void formik.validateField("emailAddress");
        }, 50);
      }

      // Addiction Details
      const addictionType = (patient as { addictionType?: string[] }).addictionType as string[] | undefined;
      const addictionSpecify = (patient as { addictionSpecify?: string }).addictionSpecify;
      if (addictionType && Array.isArray(addictionType)) {
        const lower = addictionType.map((a: string) => (a || "").toLowerCase());
        formik.setFieldValue("addictionAlcohol", lower.includes("alcohol"), false);
        formik.setFieldValue("addictionSmoking", lower.includes("smoking"), false);
        formik.setFieldValue("addictionTobacco", lower.includes("tobacco"), false);
        formik.setFieldValue("addictionDrugs", lower.includes("drugs"), false);
        formik.setFieldValue("addictionOther", lower.includes("other") || lower.includes("others"), false);
      }
      if (addictionSpecify) formik.setFieldValue("addictionSpecify", addictionSpecify, false);

      // Patient Type & Panel
      if (patient.patientType) formik.setFieldValue("patientType", patient.patientType.toLowerCase(), false);
      if (patient.patientSubType) formik.setFieldValue("patientSubType", patient.patientSubType, false);
      if (patient.panelId != null) formik.setFieldValue("panelId", String(patient.panelId), false);
      if ((patient as { benificiaryId?: string }).benificiaryId) formik.setFieldValue("benificiaryId", (patient as { benificiaryId?: string }).benificiaryId ?? "", false);
      if ((patient as { insuranceCompany?: string }).insuranceCompany) formik.setFieldValue("insuranceCompany", (patient as { insuranceCompany?: string }).insuranceCompany ?? "", false);
      if ((patient as { ayushCovered?: string }).ayushCovered) formik.setFieldValue("ayushCovered", (patient as { ayushCovered?: string }).ayushCovered ?? "", false);

      // Diagnosis Information
      const diagnosis = (patient as { diagnosis?: string }).diagnosis;
      const subDiagnosis = (patient as { subDiagnosis?: string }).subDiagnosis;
      const symptoms = (patient as { symptoms?: string }).symptoms;
      if (diagnosis) formik.setFieldValue("diagnosis", diagnosis, false);
      if (subDiagnosis) formik.setFieldValue("subDiagnosis", subDiagnosis, false);
      if (symptoms) formik.setFieldValue("symptoms", symptoms, false);
    },
    [formik, countriesData, applyRevisitAddressFromRegistration]
  );

  const handlePatientExistsDialogClose = useCallback(() => {
    lastCheckedContactRef.current = "";
    setExistingPatients([]);
    setPatientExistsDialogOpen(false);
    setSelectedRevisitPatient(null);
    pendingRevisitAddressForCountryRef.current = null;
    formik.setFieldValue("contactNumber", "");
  }, [formik]);

  const doctorOptions: SelectOption[] = useMemo(() => {
    const rows = doctorsData?.data;
    if (!Array.isArray(rows) || rows.length === 0) return [];
    return rows.map((d: any) => ({
      value: String(d.id),
      label: (d.name || d.userName || "").trim() || `Doctor ${d.id}`,
    }));
  }, [doctorsData]);

  const diagnosisOptions: SelectOption[] = useMemo(() => {
    if (!diagnosisCategoriesData?.data || !Array.isArray(diagnosisCategoriesData.data)) return [];
    return diagnosisCategoriesData.data
      .filter((item: any) => item.status === "active")
      .map((item: any) => ({ value: String(item.id), label: item.diagnosisCategory }));
  }, [diagnosisCategoriesData]);

  const subDiagnosisOptions: SelectOption[] = useMemo(() => {
    if (!formik.values.diagnosis || !diagnosisCategoriesData?.data?.length) return [];
    const cat = (diagnosisCategoriesData.data as any[]).find((c: any) => String(c.id) === formik.values.diagnosis);
    if (!cat?.subDiagnoses?.length) return [];
    return (cat.subDiagnoses as any[])
      .filter((s: any) => s.status !== "inactive")
      .map((s: any) => ({ value: String(s.id), label: s.name }));
  }, [diagnosisCategoriesData, formik.values.diagnosis]);

  // Show validation error only for fields that have been touched (or all errors after submit)
  const getFormErrors = (): Record<string, string> => {
    const errs = (formik.errors as Record<string, string>) || {};
    if (formik.submitCount > 0) return errs;
    const touched = formik.touched as Record<string, boolean | undefined>;
    const filtered: Record<string, string> = {};
    for (const key of Object.keys(errs)) {
      if (touched[key]) filtered[key] = errs[key];
    }
    return filtered;
  };

  const patientInfoReadOnlyFields = useMemo<("contactNumber" | "patientNameSelect" | "patientName")[] | undefined>(() => {
    if (isEditMode) {
      const fields: ("contactNumber" | "patientNameSelect" | "patientName")[] = ["contactNumber", "patientName"];
      // Disable Patient Title only when a value is already present; allow editing if it is empty.
      if (formik.values.patientNameSelect) fields.push("patientNameSelect");
      return fields;
    }
    if (selectedRevisitPatient) return ["contactNumber", "patientNameSelect", "patientName"];
    return undefined;
  }, [isEditMode, selectedRevisitPatient, formik.values.patientNameSelect]);

  // Focus the first focusable control inside a container (input, textarea, or select trigger button) – in series order
  const focusElementInContainer = (container: HTMLElement, delayMs = 200) => {
    if (container instanceof HTMLInputElement || container instanceof HTMLTextAreaElement) {
      container.focus();
      return;
    }
    const focusable =
      container.querySelector<HTMLButtonElement>('button[type="button"]') ||
      container.querySelector<HTMLElement>("[aria-haspopup='listbox']") ||
      container.querySelector<HTMLInputElement>("input:not([type='hidden'])") ||
      container.querySelector<HTMLTextAreaElement>("textarea");
    if (focusable) {
      setTimeout(() => focusable.focus(), delayMs);
    }
  };

  // On Save with validation errors: scroll to and focus first incomplete field in series (Contact → Title → Name → Age → Gender → Guardian Title → … → Doctor → Pin Code → etc.)
  useEffect(() => {
    if (formik.submitCount === 0 || !formik.errors || Object.keys(formik.errors).length === 0) return;
    const firstErrorField = PRE_BOOKING_FIELD_ORDER.find((f) => formik.errors[f as keyof typeof formik.errors]);
    if (!firstErrorField) return;
    const el = fieldRefMap[firstErrorField]?.current;
    const target = el || document.querySelector<HTMLElement>(`[data-field="${firstErrorField}"]`);
    if (target) {
      setTimeout(() => {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        focusElementInContainer(target, 200);
      }, 100);
    }
  }, [formik.submitCount, formik.errors, fieldRefMap]);

  return (
    <AppShell>
      <div className="flex items-start justify-between mb-4">
        <PageHeading title={isEditMode ? "Edit Pre Booking" : "Pre Booking"} />
          <div className="px-5 flex flex-wrap items-center justify-end gap-2">
            {isPreBookingSuperAdmin && superAdminBranchOptions.length > 0 ? (
              <div className={`w-[min(300px,85vw)] shrink-0 ${isEditMode ? "cursor-not-allowed" : ""}`}>
                <FormSelectField
                  label=""
                  hideLabel
                  options={superAdminBranchOptions}
                  value={superAdminPreBookingBranch || String(effectivePreBookingBranchId ?? "")}
                  onChange={(val) => {
                    const nextStr = Array.isArray(val) ? val[0] : val ?? "";
                    const nextNum = parseInt(String(nextStr), 10);
                    if (!Number.isFinite(nextNum) || nextNum < 1) return;
                    if (nextNum !== effectivePreBookingBranchId) {
                      resetPreBookingFormOnSuperAdminBranchChange(nextNum);
                    }
                    setSuperAdminPreBookingBranch(String(nextNum));
                    writePersistedBranchFilterSelection(
                      PRE_BOOKING_LIST_BRANCH_STORAGE_KEY,
                      String(nextNum),
                    );
                  }}
                  placeholder={isLoadingSuperAdminBranches ? "Loading branches…" : "Select Branch"}
                  mode="single"
                  background="normal"
                  width={300}
                  disabled={isLoadingSuperAdminBranches || isEditMode}
                />
              </div>
            ) : null}
            <BackToPreviousPageButton iconOnly={true} onClick={() => router.back()} />
          </div>
      </div>

      <form onSubmit={formik.handleSubmit} className="space-y-0">
        {formik.status?.submitError && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
            {formik.status.submitError}
          </div>
        )}

        <PatientType
          panelsBranchId={effectivePreBookingBranchId}
          formData={{
            patientType: formik.values.patientType ?? "",
            patientSubType: formik.values.patientSubType ?? "",
            panelId: formik.values.panelId ?? "",
            benificiaryId: formik.values.benificiaryId ?? "",
            insuranceCompany: formik.values.insuranceCompany ?? "",
            ayushCovered: formik.values.ayushCovered ?? "",
          }}
          onChange={(field, value) => {
            formik.setFieldValue(field, value, false);
            formik.validateField(field);
          }}
          onBlur={(field) => { formik.setFieldTouched(field, true); formik.validateField(field); }}
          errors={getFormErrors()}
          fieldRefs={{
            patientType: patientTypeRef,
            panelId: panelIdRef,
            patientSubType: patientSubTypeRef,
            benificiaryId: benificiaryIdRef,
            insuranceCompany: insuranceCompanyRef,
            ayushCovered: ayushCoveredRef,
          }}
        />

        <PreBookingPatientInformation
          doctorSelectOptions={doctorOptions}
          emailRequiredByAddressCountry={
            Boolean(formik.values.country) && formik.values.country !== "6"
          }
          formData={{
            contactNumber: formik.values.contactNumber ?? "",
            branchId:
              formik.values.branchId ||
              (effectivePreBookingBranchId != null ? String(effectivePreBookingBranchId) : "") ||
              (userBranchId != null ? String(userBranchId) : ""),
            doctor: formik.values.doctor ?? "",
            gender: formik.values.gender ?? "",
            emailAddress: formik.values.emailAddress ?? "",
            patientNameSelect: formik.values.patientNameSelect ?? "",
            patientName: formik.values.patientName ?? "",
            age: formik.values.age ?? "",
            fathersHusbandsNameSelect: formik.values.fathersHusbandsNameSelect ?? "",
            fathersHusbandsName: formik.values.fathersHusbandsName ?? "",
            maritalStatus: formik.values.maritalStatus ?? "",
          }}
          onChange={(field, value) => {
            formik.setFieldValue(field, value, false);
            if (field === "emailAddress") {
              const touched = formik.touched.emailAddress;
              const err = formik.errors.emailAddress;
              if (touched || err) {
                setTimeout(() => {
                  void formik.validateField("emailAddress");
                }, 0);
              }
            } else {
              void formik.validateField(field);
            }
          }}
          onBlur={(field) => { formik.setFieldTouched(field, true); formik.validateField(field); }}
          onContactNumberChange={isEditMode ? undefined : handleContactNumberChange}
          errors={getFormErrors()}
          isContactLoading={isContactLoading}
          showJsHealthCardNo={formik.values.patientType?.toLowerCase() === "private"}
          jsHealthCardNo={formik.values.jsHealthCardNo ?? ""}
          onJsHealthCardNoChange={(value) => {
            formik.setFieldValue("jsHealthCardNo", value, false);
            formik.validateField("jsHealthCardNo");
          }}
          onJsHealthCardNoBlur={() => { formik.setFieldTouched("jsHealthCardNo", true); formik.validateField("jsHealthCardNo"); }}
          jsHealthCardReadOnly={!!(selectedRevisitPatient && (selectedRevisitPatient as { jsHealthCardNo?: string | null }).jsHealthCardNo)}
          readOnlyFields={patientInfoReadOnlyFields}
          fieldRefs={{
            contactNumber: contactNumberRef,
            doctor: doctorRef,
            patientNameSelect: patientNameSelectRef,
            patientName: patientNameRef,
            age: ageRef,
            gender: genderRef,
            emailAddress: emailAddressRef,
            fathersHusbandsNameSelect: fathersHusbandsNameSelectRef,
            fathersHusbandsName: fathersHusbandsNameRef,
            maritalStatus: maritalStatusRef,
          }}
        />

        <AddressDetails
          formData={{
            pinCode: formik.values.pinCode ?? "",
            country: formik.values.country ?? "6",
            state: formik.values.state ?? "",
            city: formik.values.city ?? "",
            tehsil: formik.values.tehsil ?? "",
            area: formik.values.area ?? "",
            address: formik.values.address ?? "",
            addressLine1: formik.values.addressLine1 ?? "",
            addressLine2: formik.values.addressLine2 ?? "",
          }}
          onChange={(field, value) => {
            formik.setFieldValue(field, value, false);
            formik.validateField(field);
            if (field === "country") {
              setTimeout(() => {
                void formik.validateField("emailAddress");
              }, 10);
            }
          }}
          onBlur={(field) => { formik.setFieldTouched(field, true); formik.validateField(field); }}
          title="Address Details"
          iconSrc="/icons/addressicon.svg"
          errors={getFormErrors()}
          fieldRefs={{
            pinCode: pinCodeRef,
            country: countryRef,
            state: stateRef,
            city: cityRef,
            tehsil: tehsilRef,
            area: areaRef,
            address: addressRef,
            addressLine1: addressLine1Ref,
            addressLine2: addressLine2Ref,
          }}
        />

        <AddictionDetails
          formData={{
            addictionAlcohol: !!formik.values.addictionAlcohol,
            addictionSmoking: !!formik.values.addictionSmoking,
            addictionTobacco: !!formik.values.addictionTobacco,
            addictionDrugs: !!formik.values.addictionDrugs,
            addictionOther: !!formik.values.addictionOther,
            addictionSpecify: formik.values.addictionSpecify ?? "",
          }}
          onChange={(field, value) => {
            formik.setFieldValue(field, value, false);
            formik.validateField(field);
          }}
          onBlur={(field) => formik.setFieldTouched(field, true)}
          errors={getFormErrors()}
          fieldRefs={{ addictionSpecify: addictionSpecifyRef }}
        />

        <DiagnosisInformation
          formData={{
            diagnosis: formik.values.diagnosis ?? "",
            subDiagnosis: formik.values.subDiagnosis ?? "",
            symptoms: formik.values.symptoms ?? "",
          }}
          onChange={(field, value) => {
            formik.setFieldValue(field, value, false);
            formik.validateField(field);
          }}
          onBlur={(field) => { formik.setFieldTouched(field, true); formik.validateField(field); }}
          diagnosisOptions={diagnosisOptions}
          subDiagnosisOptions={subDiagnosisOptions}
          errors={getFormErrors()}
          fieldRefs={{
            diagnosis: diagnosisRef,
            subDiagnosis: subDiagnosisRef,
            symptoms: symptomsRef,
          }}
        />

        <IpdOpdDetails
          maxAdvanceBookingDays={preBookingAdvanceDays}
          formData={{
            bookingType: (formik.values.bookingType || "opd") as "opd" | "ipd",
            appointmentDate: formik.values.appointmentDate ?? "",
            timeSlot: formik.values.timeSlot ?? "",
            packageId: formik.values.packageId ?? "",
            startDate: formik.values.startDate ?? "",
            endDate: formik.values.endDate ?? "",
            amount: formik.values.amount ?? "",
            paymentMode: formik.values.paymentMode ?? "",
            paymentMethod: formik.values.paymentMethod ?? "",
            transactionId: formik.values.transactionId ?? "",
          }}
          onChange={(field, value) => {
            formik.setFieldValue(field, value, false);
            formik.validateField(field);
          }}
          onBlur={(field) => { formik.setFieldTouched(field, true); formik.validateField(field); }}
          packageOptions={[]}
          errors={getFormErrors()}
          fieldRefs={{
            appointmentDate: appointmentDateRef,
            timeSlot: timeSlotRef,
            packageId: packageIdRef,
            startDate: startDateRef,
            endDate: endDateRef,
            amount: amountRef,
            paymentMode: paymentModeRef,
            paymentMethod: paymentMethodRef,
            transactionId: transactionIdRef,
          }}
        />

        <div className="mt-6 flex justify-end">
          <Button
            type="submit"
            disabled={
              isSubmitting ||
              (isEditMode &&
                formik.values.country === "6" &&
                ((!formik.values.state ||
                  !formik.values.city ||
                  !formik.values.tehsil ||
                  !formik.values.area) ||
                  !statesData?.data ||
                  !citiesData?.data ||
                  !tehsilsData?.data ||
                  !areasData?.data))
            }
            isLoading={isSubmitting}
            className="bg-[#0B8C00] hover:bg-[#0a7d00] text-white font-medium py-3 px-6 rounded-[12px] w-auto min-w-[100px]"
          >
            {isEditMode ? "Update" : "Save"}
          </Button>
        </div>
      </form>

      <PatientAlreadyExistsDialog
        open={patientExistsDialogOpen}
        onClose={handlePatientExistsDialogClose}
        existingPatients={existingPatients}
        onRevisit={handleRevisit}
      />

      {/* Success Dialog */}
      <MessageDialog
        open={showSuccessDialog}
        onClose={() => {
          setShowSuccessDialog(false);
          router.push("/pre-booking");
        }}
        icon="/icons/SuccessCheck.svg"
        iconBgColor="#E8F5E9"
        message={successMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => {
          setShowSuccessDialog(false);
          router.push("/pre-booking");
        }}
      />

      {/* API Error Dialog */}
      <MessageDialog
        open={showApiErrorDialog}
        onClose={() => setShowApiErrorDialog(false)}
        icon="/icons/CrossIcon.svg"
        iconBgColor="#FFEBEE"
        message={apiErrorMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => setShowApiErrorDialog(false)}
      />
    </AppShell>
  );
}

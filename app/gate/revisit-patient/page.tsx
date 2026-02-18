"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFormik } from "formik";
import GateEntryLayout from "@/components/gate/GateEntryLayout";
import { GoToHomeButton, BackToPreviousPageButton, Button, Dialog, Table, TableHeader, TableBody, TableRow, TableHead, TableData, MessageDialog } from "@/components/ui";
import { FormInputField } from "@/components/ui";
import { revisitPatientSchema, type RevisitPatientFormValues } from "@/lib/validation/gateSchemas";
import { useLazyCheckExistingPatientsByPhoneQuery, useLazyGetPreBookingByIdQuery, type ExistingPatient } from "@/store/api/gateApi";
import { useArrowKeyNavigation } from "@/hooks/useArrowKeyNavigation";

export default function GateRevisitPatientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientDataParam = searchParams.get("patientData");
  const branchId = 1; // Default branch ID

  // Parse patient data from query param
  const [patientData, setPatientData] = useState<ExistingPatient | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [patientExistsDialogOpen, setPatientExistsDialogOpen] = useState(false);
  const [existingPatients, setExistingPatients] = useState<ExistingPatient[]>([]);
  const [showNotFoundDialog, setShowNotFoundDialog] = useState(false);
  const [notFoundMessage, setNotFoundMessage] = useState("");
  const [isFromPreBooking, setIsFromPreBooking] = useState(false); // Track if data comes from pre-booking API
  const uhidSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null); // For debouncing UHID search
  const isClosingDialogRef = useRef(false); // Track if dialog is being closed to prevent re-triggering

  // Loading states for each input field
  const [isContactNumberLoading, setIsContactNumberLoading] = useState(false);
  const [isUhidLoading, setIsUhidLoading] = useState(false);
  const [isAadharCardNumberLoading, setIsAadharCardNumberLoading] = useState(false);
  const [isPreBookingLoading, setIsPreBookingLoading] = useState(false);

  // Lazy query for checking existing patients (supports both phoneNumber and uhid)
  const [checkExistingPatientsQuery] = useLazyCheckExistingPatientsByPhoneQuery();
  // Lazy query for getting pre-booking by ID
  const [getPreBookingByIdQuery] = useLazyGetPreBookingByIdQuery();

  useEffect(() => {
    if (patientDataParam) {
      try {
        const decoded = decodeURIComponent(patientDataParam);
        const parsed = JSON.parse(decoded) as ExistingPatient;
        setPatientData(parsed);
        setIsReadOnly(true);
      } catch (error) {
        console.error("Error parsing patient data:", error);
      }
    }
  }, [patientDataParam]);

  // Refs for error scrolling
  const contactNumberRef = useRef<HTMLInputElement>(null);
  const uhidRef = useRef<HTMLInputElement>(null);
  const aadharCardNumberRef = useRef<HTMLInputElement>(null);
  const preBookingRef = useRef<HTMLInputElement>(null);

  // Form ref for arrow key navigation
  const formRef = useRef<HTMLFormElement>(null);

  // Enable arrow key navigation for form fields
  useArrowKeyNavigation(formRef, true);

  // Initialize form values from patient data if available
  const initialValues: RevisitPatientFormValues = {
    contactNumber: patientData?.contactNumber || "",
    uhid: patientData?.uhid || "",
    aadharCardNumber: patientData?.aadharCardNo || "",
    preBooking: "",
  };

  const formik = useFormik<RevisitPatientFormValues>({
    initialValues,
    enableReinitialize: true, // Re-initialize when patientData changes
    validationSchema: revisitPatientSchema,
    validateOnChange: false,
    validateOnBlur: true, // Enable validation on blur
    onSubmit: async (values) => {
      // If in read-only mode (patient data from dialog), redirect to new-patient with pre-filled data
      if (isReadOnly && patientData) {
        // Encode patient data as JSON in query param
        const patientDataEncoded = encodeURIComponent(JSON.stringify(patientData));
        router.push(`/gate/new-patient?patientData=${patientDataEncoded}`);
        return;
      }

      // Search for patient by contact number, UHID, Aadhar Card Number, or Pre Booking
      if (values.contactNumber && values.contactNumber.length === 10) {
        await checkExistingPatients(values.contactNumber, undefined, undefined);
      } else if (values.uhid && values.uhid.trim().length > 0) {
        await checkExistingPatients(undefined, values.uhid.trim(), undefined);
      } else if (values.aadharCardNumber && values.aadharCardNumber.trim().length === 12) {
        await checkExistingPatients(undefined, undefined, values.aadharCardNumber.trim());
      } else if (values.preBooking && values.preBooking.trim().length >= 1) {
        // Pre Booking search - use dedicated pre-booking API
        await checkPreBooking(values.preBooking.trim());
      }
    },
  });

  // Update form values when patientData is set from dialog
  useEffect(() => {
    if (patientData && isReadOnly) {
      formik.setValues({
        contactNumber: patientData.contactNumber || "",
        uhid: patientData.uhid || "",
        aadharCardNumber: patientData.aadharCardNo || "",
        preBooking: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientData, isReadOnly]);

  // Check for existing patients by contact number, UHID, or Aadhar Card Number
  const checkExistingPatients = async (contactNumber?: string, uhid?: string, aadharCardNo?: string) => {
    // Don't check if dialog is being closed
    if (isClosingDialogRef.current) {
      return;
    }

    // Need at least one valid parameter
    if ((!contactNumber || contactNumber.length !== 10) &&
      (!uhid || uhid.trim().length === 0) &&
      (!aadharCardNo || aadharCardNo.trim().length !== 12)) {
      return;
    }

    // Set loading state based on which parameter is provided
    if (contactNumber) {
      setIsContactNumberLoading(true);
    } else if (uhid) {
      setIsUhidLoading(true);
    } else if (aadharCardNo) {
      setIsAadharCardNumberLoading(true);
    }

    try {
      const result = await checkExistingPatientsQuery({
        branchId: branchId,
        phoneNumber: contactNumber || "",
        uhid: uhid || undefined,
        aadharCardNo: aadharCardNo || undefined,
      }).unwrap();

      // Double-check if dialog is being closed after async operation
      if (isClosingDialogRef.current) {
        return;
      }

      // Handle new response structure with registrations and preBookings
      const registrations = result.data?.registrations || [];

      // If there are registrations, show the "Already exist" dialog
      if (registrations.length > 0) {
        // Map API response to match our interface
        const mappedPatients = registrations.map((patient: any) => ({
          ...patient,
          // Ensure backward compatibility
          name: patient.patientName || patient.name,
          branchName: patient.branchName || "N/A",
          // Preserve address object with tehsil and area if they exist
          address: patient.address ? {
            ...patient.address,
            tehsil: (patient.address as any)?.tehsil || undefined,
            area: (patient.address as any)?.area || undefined,
          } : undefined,
        }));
        setExistingPatients(mappedPatients);
        setIsFromPreBooking(false); // Mark as coming from regular patient search
        setPatientExistsDialogOpen(true);
      } else {
        // No registrations found - show message dialog only if not already showing
        if (!showNotFoundDialog) {
          const message = "No registration found for the provided Contact Number, UHID, or Aadhar Card Number";
          setNotFoundMessage(message);
          setShowNotFoundDialog(true);
        }
      }
    } catch (error) {
      console.error("Error checking existing patients:", error);
      // If API fails, don't show dialog
    } finally {
      // Clear loading states based on which parameter was provided
      if (contactNumber) {
        setIsContactNumberLoading(false);
      } else if (uhid) {
        setIsUhidLoading(false);
      } else if (aadharCardNo) {
        setIsAadharCardNumberLoading(false);
      }
    }
  };

  // Transform pre-booking data to ExistingPatient format
  const transformPreBookingToPatient = (preBookingData: any): ExistingPatient => {
    return {
      id: preBookingData.id,
      sUhid: null,
      uhid: preBookingData.uhid || "",
      branchId: preBookingData.branchId,
      patientName: preBookingData.patientName,
      patientTitle: undefined, // Not available in pre-booking
      doctorUserId: preBookingData.doctorUserId,
      gender: preBookingData.gender?.toLowerCase() || undefined,
      age: preBookingData.age,
      contactNumber: preBookingData.contactNumber,
      whatsappNo: preBookingData.whatsappNumber || undefined,
      emailAddress: preBookingData.emailAddress || undefined,
      maritalStatus: preBookingData.maritalStatus || undefined,
      aadharCardNo: undefined, // Not available in pre-booking
      occupation: preBookingData.occupation || undefined,
      height: preBookingData.height || undefined,
      weight: preBookingData.weight || undefined,
      bloodGroup: preBookingData.bloodGroup || undefined,
      allergies: preBookingData.allergies || preBookingData.allergiesInfo || undefined,
      surgeries: preBookingData.surgeries || preBookingData.surgicalHistory || undefined,
      dietType: preBookingData.dietType || undefined,
      guardianName: preBookingData.guardianName || undefined,
      addiction: preBookingData.addiction || undefined,
      patientType: preBookingData.patientType || null,
      patientSubType: preBookingData.patientSubType || null,
      benificiaryId: preBookingData.benificiaryId || null,
      insuranceCompany: preBookingData.insuranceCompany || null,
      ayushCovered: preBookingData.ayushCovered || null,
      remark: preBookingData.remark || null,
      address: {
        id: 0, // Pre-booking doesn't have address ID
        address: preBookingData.address || "",
        city: preBookingData.city || "",
        pinCode: preBookingData.pinCode || "",
        state: preBookingData.state || "",
        country: preBookingData.country || "",
        // Include tehsil and area if available in pre-booking data
        tehsil: (preBookingData as any)?.tehsil || (preBookingData as any)?.address?.tehsil || undefined,
        area: (preBookingData as any)?.area || (preBookingData as any)?.address?.area || undefined,
        addressableType: "preBooking",
        addressableId: preBookingData.id,
        addressType: "primary",
        isActive: true,
        createdAt: preBookingData.createdAt || new Date().toISOString(),
        updatedAt: preBookingData.updatedAt || new Date().toISOString(),
      },
      name: preBookingData.patientName,
      branchName: "N/A",
      isPreBooking: true,
      preBookingId: preBookingData.id,
    };
  };

  // Check for pre-booking by ID
  const checkPreBooking = async (preBookingId: string) => {
    // Don't check if dialog is being closed
    if (isClosingDialogRef.current) {
      return;
    }

    if (!preBookingId || preBookingId.trim().length === 0) {
      return;
    }

    setIsPreBookingLoading(true);
    try {
      const result = await getPreBookingByIdQuery({
        branchId: branchId,
        preBookingId: preBookingId.trim(),
      }).unwrap();

      // Double-check if dialog is being closed after async operation
      if (isClosingDialogRef.current) {
        return;
      }

      // Transform pre-booking data to ExistingPatient format
      if (result.success && result.data) {
        const transformedPatient = transformPreBookingToPatient(result.data);
        setExistingPatients([transformedPatient]);
        setIsFromPreBooking(true); // Mark as coming from pre-booking
        setPatientExistsDialogOpen(true);
      } else {
        // No pre-booking found
        if (!showNotFoundDialog) {
          const message = "No pre-booking found for the provided Pre Booking ID";
          setNotFoundMessage(message);
          setShowNotFoundDialog(true);
        }
      }
    } catch (error) {
      console.error("Error checking pre-booking:", error);
      // If API fails, show not found message
      if (!showNotFoundDialog) {
        const message = "No pre-booking found for the provided Pre Booking ID";
        setNotFoundMessage(message);
        setShowNotFoundDialog(true);
      }
    } finally {
      setIsPreBookingLoading(false);
    }
  };

  // Handle contact number change - check when it reaches 10 digits
  const handleContactNumberChange = (value: string) => {
    if (!isReadOnly && !isClosingDialogRef.current && value.length === 10) {
      checkExistingPatients(value, undefined, undefined);
    }
  };

  // Handle UHID change - check when UHID is entered (debounced)
  const handleUHIDChange = (value: string) => {
    if (!isReadOnly && !isClosingDialogRef.current && value.trim().length >= 10) {
      // Clear any existing timeout
      if (uhidSearchTimeoutRef.current) {
        clearTimeout(uhidSearchTimeoutRef.current);
      }

      // Debounce UHID search - wait 500ms after user stops typing
      uhidSearchTimeoutRef.current = setTimeout(() => {
        // Don't call API if dialog is being closed
        if (isClosingDialogRef.current) {
          return;
        }
        // Only call API if UHID has at least 10 characters
        if (value.trim().length >= 10) {
          checkExistingPatients(undefined, value.trim(), undefined);
        }
      }, 500); // Wait 500ms after user stops typing
    } else {
      // Clear timeout if UHID is less than 10 characters
      if (uhidSearchTimeoutRef.current) {
        clearTimeout(uhidSearchTimeoutRef.current);
        uhidSearchTimeoutRef.current = null;
      }
    }
  };

  // Handle Aadhar Card Number change - check when it reaches 12 digits (debounced)
  const handleAadharCardNumberChange = (value: string) => {
    if (!isReadOnly && !isClosingDialogRef.current && value.trim().length === 12) {
      // Clear any existing timeout
      if (uhidSearchTimeoutRef.current) {
        clearTimeout(uhidSearchTimeoutRef.current);
      }

      // Debounce Aadhar search - wait 500ms after user stops typing
      uhidSearchTimeoutRef.current = setTimeout(() => {
        // Don't call API if dialog is being closed
        if (isClosingDialogRef.current) {
          return;
        }
        // Only call API if Aadhar Card Number has exactly 12 digits
        if (value.trim().length === 12) {
          checkExistingPatients(undefined, undefined, value.trim());
        }
      }, 500); // Wait 500ms after user stops typing
    } else {
      // Clear timeout if Aadhar Card Number is less than 12 digits
      if (uhidSearchTimeoutRef.current) {
        clearTimeout(uhidSearchTimeoutRef.current);
        uhidSearchTimeoutRef.current = null;
      }
    }
  };

  // Handle Pre Booking change - check when it has at least 1 digit (debounced)
  const handlePreBookingChange = (value: string) => {
    if (!isReadOnly && !isClosingDialogRef.current && value.trim().length >= 1) {
      // Clear any existing timeout
      if (uhidSearchTimeoutRef.current) {
        clearTimeout(uhidSearchTimeoutRef.current);
      }

      // Debounce Pre Booking search - wait 500ms after user stops typing
      uhidSearchTimeoutRef.current = setTimeout(() => {
        // Don't call API if dialog is being closed
        if (isClosingDialogRef.current) {
          return;
        }
        // Only call API if Pre Booking has at least 1 digit
        if (value.trim().length >= 1) {
          checkPreBooking(value.trim());
        }
      }, 500); // Wait 500ms after user stops typing
    } else {
      // Clear timeout if Pre Booking is empty
      if (uhidSearchTimeoutRef.current) {
        clearTimeout(uhidSearchTimeoutRef.current);
        uhidSearchTimeoutRef.current = null;
      }
    }
  };

  // Handle revisit button click from dialog
  const handleRevisitFromDialog = useCallback((patient: ExistingPatient) => {
    // Close dialog
    setPatientExistsDialogOpen(false);

    // Redirect to new-patient page with pre-filled patient data
    const patientDataEncoded = encodeURIComponent(JSON.stringify(patient));
    router.push(`/gate/new-patient?patientData=${patientDataEncoded}`);
  }, [router]);

  // Memoized close handler for dialog
  const handleDialogClose = useCallback(() => {
    setPatientExistsDialogOpen(false);
    // Clear all fields when dialog is closed
    formik.setFieldValue("contactNumber", "", false);
    formik.setFieldValue("uhid", "", false);
    formik.setFieldValue("aadharCardNumber", "", false);
    formik.setFieldValue("preBooking", "", false);
    // Clear existing patients list
    setExistingPatients([]);
    // Reset pre-booking flag
    setIsFromPreBooking(false);
    // Clear any pending search timeout
    if (uhidSearchTimeoutRef.current) {
      clearTimeout(uhidSearchTimeoutRef.current);
      uhidSearchTimeoutRef.current = null;
    }
  }, [formik]);

  const getFormErrors = () => {
    const errors: Record<string, string> = {};

    if (formik.errors.contactNumber && formik.touched.contactNumber) {
      errors.contactNumber = formik.errors.contactNumber;
    }
    if (formik.errors.uhid && formik.touched.uhid) {
      errors.uhid = formik.errors.uhid;
    }
    if (formik.errors.aadharCardNumber && formik.touched.aadharCardNumber) {
      errors.aadharCardNumber = formik.errors.aadharCardNumber;
    }
    if (formik.errors.preBooking && formik.touched.preBooking) {
      errors.preBooking = formik.errors.preBooking;
    }

    return errors;
  };

  const getSchemaError = () => {
    // Check for schema-level "at-least-one" error
    const allErrors = formik.errors as any;
    if (allErrors && typeof allErrors === 'object' && 'atLeastOne' in allErrors) {
      return allErrors.atLeastOne;
    }
    // Also check if error is on the root level
    if (formik.errors && typeof formik.errors === 'string') {
      return formik.errors;
    }
    return null;
  };

  const scrollToFirstError = () => {
    const errors = getFormErrors();
    const errorKeys = Object.keys(errors);
    if (errorKeys.length === 0) return;

    const errorKey = errorKeys[0];
    let target: HTMLElement | null = null;

    switch (errorKey) {
      case "contactNumber":
        target = contactNumberRef.current;
        break;
      case "uhid":
        target = uhidRef.current;
        break;
      case "aadharCardNumber":
        target = aadharCardNumberRef.current;
        break;
      case "preBooking":
        target = preBookingRef.current;
        break;
    }

    if (target) {
      setTimeout(() => {
        target?.scrollIntoView({ behavior: "smooth", block: "center" });
        target?.focus();
      }, 100);
    }
  };

  const handleGoToHome = () => {
    router.push("/gate");
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <GateEntryLayout title="">
      <div className="overflow-hidden rounded-[20px] border border-[#E3EEE1] px-4 py-4" style={{ width: "50%", margin: "auto" }}>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-[24px] font-semibold leading-[130%] text-[#434956]">Revisit Patient</h1>
          <GoToHomeButton onClick={handleGoToHome} />
        </div>

        <form ref={formRef} className="space-y-6">

          {/* Patient Identification Fields */}
          <div className="space-y-6 rounded-[16px] border border-[#E3EEE1] bg-white px-5 py-5 shadow-[0px_6px_40px_rgba(34,56,43,0.08)]">
            <p className="text-sm font-medium leading-[120%] text-[#434956]">
              Please fill in any one of the options given below.
            </p>
            {getSchemaError() && (
              <p className="text-sm text-[#F6776E]">
                {getSchemaError()}
              </p>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="relative">
                <FormInputField
                  ref={contactNumberRef}
                  label="Contact Number"
                  value={formik.values.contactNumber}
                  onChange={(e) => {
                    if (!isReadOnly) {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                      formik.setFieldValue("contactNumber", value, false);
                      // Clear error if field was previously invalid
                      if (formik.touched.contactNumber && formik.errors.contactNumber) {
                        setTimeout(() => {
                          formik.validateField("contactNumber");
                        }, 0);
                      }
                      // Check when contact number reaches 10 digits
                      if (value.length === 10) {
                        handleContactNumberChange(value);
                      }
                    }
                  }}
                  onBlur={(e) => {
                    if (!isReadOnly) {
                      formik.setFieldTouched("contactNumber", true, false);
                      formik.validateField("contactNumber");
                      const value = e.target.value.trim();
                      if (value && value.length === 10) {
                        handleContactNumberChange(value);
                      }
                    }
                  }}
                  placeholder="Contact Number"
                  type="tel"
                  maxLength={10}
                  error={getFormErrors().contactNumber}
                  disabled={isReadOnly}
                  readOnly={isReadOnly}
                />
                {isContactNumberLoading && (
                  <div className="absolute right-4 top-[10px] flex h-6 w-6 items-center justify-center">
                    <svg
                      className="h-5 w-5 animate-spin text-[#0B8C00]"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                )}
              </div>

              <div className="relative">
                <FormInputField
                  ref={uhidRef}
                  label="UHID"
                  value={formik.values.uhid}
                  onChange={(e) => {
                    if (!isReadOnly) {
                      // Remove spaces, allow alphanumeric characters, limit to 15 characters
                      const value = e.target.value.replace(/\s/g, "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 15).toUpperCase();
                      formik.setFieldValue("uhid", value, false);
                      // Clear error if field was previously invalid
                      if (formik.touched.uhid && formik.errors.uhid) {
                        setTimeout(() => {
                          formik.validateField("uhid");
                        }, 0);
                      }
                      // Check for existing patients when UHID is entered (debounced)
                      if (value.length >= 10) {
                        handleUHIDChange(value);
                      }
                    }
                  }}
                  onBlur={(e) => {
                    if (!isReadOnly) {
                      formik.setFieldTouched("uhid", true, false);
                      formik.validateField("uhid");
                      const value = e.target.value.trim();
                      if (value && value.length >= 10) {
                        // Clear any pending timeout
                        if (uhidSearchTimeoutRef.current) {
                          clearTimeout(uhidSearchTimeoutRef.current);
                          uhidSearchTimeoutRef.current = null;
                        }
                        checkExistingPatients(undefined, value, undefined);
                      }
                    }
                  }}
                  placeholder="Enter UHID"
                  type="text"
                  maxLength={15}
                  error={getFormErrors().uhid}
                  disabled={isReadOnly}
                  readOnly={isReadOnly}
                />
                {isUhidLoading && (
                  <div className="absolute right-4 top-[10px] flex h-6 w-6 items-center justify-center">
                    <svg
                      className="h-5 w-5 animate-spin text-[#0B8C00]"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                )}
              </div>

            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

              <div className="relative">
                <FormInputField
                  ref={aadharCardNumberRef}
                  label="Aadhar Card Number"
                  value={formik.values.aadharCardNumber}
                  onChange={(e) => {
                    if (!isReadOnly) {
                      // Only allow digits, limit to 12 characters
                      const value = e.target.value.replace(/\D/g, "").slice(0, 12);
                      formik.setFieldValue("aadharCardNumber", value, false);
                      // Clear error if field was previously invalid
                      if (formik.touched.aadharCardNumber && formik.errors.aadharCardNumber) {
                        setTimeout(() => {
                          formik.validateField("aadharCardNumber");
                        }, 0);
                      }
                      // Check for existing patients when Aadhar Card Number is entered (debounced)
                      if (value.length === 12) {
                        handleAadharCardNumberChange(value);
                      }
                    }
                  }}
                  onBlur={(e) => {
                    if (!isReadOnly) {
                      formik.setFieldTouched("aadharCardNumber", true, false);
                      formik.validateField("aadharCardNumber");
                      const value = e.target.value.trim();
                      if (value && value.length === 12) {
                        // Clear any pending timeout
                        if (uhidSearchTimeoutRef.current) {
                          clearTimeout(uhidSearchTimeoutRef.current);
                          uhidSearchTimeoutRef.current = null;
                        }
                        checkExistingPatients(undefined, undefined, value);
                      }
                    }
                  }}
                  placeholder="Enter Aadhar Card Number"
                  type="tel"
                  maxLength={12}
                  error={getFormErrors().aadharCardNumber}
                  disabled={isReadOnly}
                  readOnly={isReadOnly}
                />
                {isAadharCardNumberLoading && (
                  <div className="absolute right-4 top-[10px] flex h-6 w-6 items-center justify-center">
                    <svg
                      className="h-5 w-5 animate-spin text-[#0B8C00]"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                )}
              </div>

              <div className="relative">
                <FormInputField
                  ref={preBookingRef}
                  label="Pre Booking"
                  value={formik.values.preBooking}
                  onChange={(e) => {
                    if (!isReadOnly) {
                      // Only allow digits, limit to 10 characters
                      const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                      formik.setFieldValue("preBooking", value, false);
                      // Clear error if field was previously invalid
                      if (formik.touched.preBooking && formik.errors.preBooking) {
                        setTimeout(() => {
                          formik.validateField("preBooking");
                        }, 0);
                      }
                      // Check for existing patients when Pre Booking is entered (debounced)
                      if (value.length >= 1) {
                        handlePreBookingChange(value);
                      }
                    }
                  }}
                  onBlur={(e) => {
                    if (!isReadOnly) {
                      formik.setFieldTouched("preBooking", true, false);
                      formik.validateField("preBooking");
                      const value = e.target.value.trim();
                      if (value && value.length >= 1) {
                        // Clear any pending timeout
                        if (uhidSearchTimeoutRef.current) {
                          clearTimeout(uhidSearchTimeoutRef.current);
                          uhidSearchTimeoutRef.current = null;
                        }
                        checkPreBooking(value);
                      }
                    }
                  }}
                  placeholder="Enter Pre Booking ID"
                  type="tel"
                  maxLength={10}
                  error={getFormErrors().preBooking}
                  disabled={isReadOnly}
                  readOnly={isReadOnly}
                />
                {isPreBookingLoading && (
                  <div className="absolute right-4 top-[10px] flex h-6 w-6 items-center justify-center">
                    <svg
                      className="h-5 w-5 animate-spin text-[#0B8C00]"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Action Buttons */}
          <div className="flex items-center justify-start gap-3">
            <BackToPreviousPageButton onClick={handleBack} />
          </div>
        </form>
      </div>

      {/* Patient Already Exists Dialog */}
      <Dialog
        open={patientExistsDialogOpen}
        onClose={handleDialogClose}
        title="Patient"
        width={1440}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-center rounded-[8px] border border-[#0B8C00]/20 bg-[#0B8C00]/20 px-5 py-4">
            <p className="text-[28px] font-medium leading-[120%] text-[#0B8C00]">
              {isFromPreBooking ? "Pre Booking Patient" : "Patient Already Exists"}
            </p>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-white">
                <TableHead position="first">Sr no.</TableHead>
                <TableHead sortable>UHID</TableHead>
                <TableHead sortable>Name</TableHead>
                <TableHead sortable>Branch Name</TableHead>
                <TableHead position="last">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {existingPatients.length === 0 ? (
                <TableRow>
                  <TableData
                    colSpan={5}
                    className="py-12 text-center text-sm text-[#9CA3AF]"
                  >
                    No patients found
                  </TableData>
                </TableRow>
              ) : (
                existingPatients.map((patient, index) => (
                  <TableRow
                    key={patient.id}
                    className="bg-white transition-colors hover:bg-[#F7FAF7]"
                  >
                    <TableData variant="primary">{index + 1}</TableData>
                    <TableData>{patient.uhid || "-"}</TableData>
                    <TableData>{patient.patientName || patient.name || "-"}</TableData>
                    <TableData>{patient.branchName || "N/A"}</TableData>
                    <TableData>
                      <button
                        type="button"
                        onClick={() => handleRevisitFromDialog(patient)}
                        className="flex h-7 items-center justify-center rounded-[32px] border border-[#0B8C00] bg-white px-4 text-sm font-medium text-[#0B8C00] transition-colors hover:bg-[#F2F8F2]"
                      >
                        Revisit
                      </button>
                    </TableData>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Dialog>

      {/* Patient Not Found Dialog */}
      <MessageDialog
        open={showNotFoundDialog}
        onClose={() => {
          // Set flag to prevent re-triggering
          isClosingDialogRef.current = true;

          // Clear any pending timeouts
          if (uhidSearchTimeoutRef.current) {
            clearTimeout(uhidSearchTimeoutRef.current);
            uhidSearchTimeoutRef.current = null;
          }

          setShowNotFoundDialog(false);
          // Clear all fields when dialog is closed
          formik.setFieldValue("contactNumber", "", false);
          formik.setFieldValue("uhid", "", false);
          formik.setFieldValue("aadharCardNumber", "", false);
          formik.setFieldValue("preBooking", "", false);
          // Clear all errors and touched state
          formik.setErrors({});
          formik.setTouched({});

          // Reset flag after a delay to allow cleanup
          setTimeout(() => {
            isClosingDialogRef.current = false;
          }, 500);
        }}
        icon="/icons/CrossIcon.svg"
        iconBgColor="#FFEBEE"
        message={notFoundMessage || "Patient details not found"}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => {
          // Set flag to prevent re-triggering
          isClosingDialogRef.current = true;

          // Clear any pending timeouts
          if (uhidSearchTimeoutRef.current) {
            clearTimeout(uhidSearchTimeoutRef.current);
            uhidSearchTimeoutRef.current = null;
          }

          setShowNotFoundDialog(false);
          // Clear all fields when dialog is closed
          formik.setFieldValue("contactNumber", "", false);
          formik.setFieldValue("uhid", "", false);
          formik.setFieldValue("aadharCardNumber", "", false);
          formik.setFieldValue("preBooking", "", false);
          // Clear all errors and touched state
          formik.setErrors({});
          formik.setTouched({});

          // Reset flag after a delay to allow cleanup
          setTimeout(() => {
            isClosingDialogRef.current = false;
          }, 500);
        }}
      />
    </GateEntryLayout>
  );
}

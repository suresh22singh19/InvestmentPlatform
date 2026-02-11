"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useFormik } from "formik";
import GateEntryLayout from "@/components/gate/GateEntryLayout";
import { GoToHomeButton, BackToPreviousPageButton, Button, MessageDialog } from "@/components/ui";
import { AddressDetails, PatientVisitorDetails, IPDAdditionalDetails } from "@/components/forms";
import { gateIPDVisitorSchema, type GateIPDVisitorFormValues, type IPDVisitorItemFormValues } from "@/lib/validation/gateSchemas";
import { useVisitorEntryMutation } from "@/store/api/gateApi";
import { useGetCountriesQuery, useGetStatesQuery, useGetCitiesQuery, useLazyGetTehsilsQuery, useLazyGetAreasQuery } from "@/store/api/publicApi";
import { useArrowKeyNavigation } from "@/hooks/useArrowKeyNavigation";

export default function GateIPDVisitorPage() {
  const router = useRouter();
  const [visitorEntry, { isLoading: isSubmitting }] = useVisitorEntryMutation();
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [apiErrorMessage, setApiErrorMessage] = useState("");
  const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);

  // Fetch countries, states, and cities to get names from IDs
  const { data: countriesData } = useGetCountriesQuery({});
  const { data: statesData } = useGetStatesQuery({}); // Fetch all states
  const { data: citiesData } = useGetCitiesQuery({}); // Fetch all cities
  
  // Lazy queries for tehsils and areas - fetch per visitor during form submission
  const [getTehsilsQuery] = useLazyGetTehsilsQuery();
  const [getAreasQuery] = useLazyGetAreasQuery();

  // Refs for scrolling/focusing invalid fields
  const mobileNumberRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const aadharCardNumberRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const visitorTitleRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const visitorNameRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const patientTitleRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const patientNameRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const purposeRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const pinCodeRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const countryRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const stateRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const cityRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const tehsilRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const areaRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const addressRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const searchTypeRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const phoneNumberRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const uhidRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const buildingRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const roomNumberRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const bedNumberRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const createEmptyVisitor = (id: string): IPDVisitorItemFormValues => ({
    id,
    mobileNumber: "",
    aadharCardNumber: "",
    visitorNameSelect: "",
    visitorName: "",
    patientNameSelect: "",
    patientName: "",
    purpose: "",
    pinCode: "",
    country: "6", // India is auto-selected
    state: "",
    city: "",
    tehsil: "" as any,
    area: "" as any,
    address: "",
    addressLine1: "",
    addressLine2: "",
    searchType: "",
    phoneNumber: "",
    uhid: "",
    building: "",
    roomNumber: "",
    bedNumber: "",
  });

  const initialValues: GateIPDVisitorFormValues = {
    visitors: [createEmptyVisitor("1")],
  };

  // Form ref for arrow key navigation
  const formRef = useRef<HTMLFormElement>(null);
  
  // Enable arrow key navigation for form fields
  // When navigating to a select field, trigger validation
  useArrowKeyNavigation(formRef, true, (fieldName) => {
    // Validate the select field when navigating to it
    // Note: fieldName will be like "visitorTitle" or "patientTitle" from data-field attribute
    // We need to map it to the actual formik field path
    // Find the visitor index by checking which visitor's field is currently focused
    const activeElement = document.activeElement;
    let visitorIndex = 0; // Default to first visitor
    
    // Try to find the visitor index by checking the active element's parent
    if (activeElement) {
      const visitorContainer = activeElement.closest('[data-visitor-index]');
      if (visitorContainer) {
        const indexAttr = visitorContainer.getAttribute('data-visitor-index');
        if (indexAttr !== null) {
          visitorIndex = parseInt(indexAttr, 10);
        }
      } else {
        // Fallback: try to find by checking form structure
        const form = formRef.current;
        if (form) {
          const allVisitorContainers = form.querySelectorAll('[data-visitor-index]');
          for (let i = 0; i < allVisitorContainers.length; i++) {
            if (allVisitorContainers[i].contains(activeElement)) {
              const indexAttr = allVisitorContainers[i].getAttribute('data-visitor-index');
              if (indexAttr !== null) {
                visitorIndex = parseInt(indexAttr, 10);
                break;
              }
            }
          }
        }
      }
    }
    
    const fieldMap: Record<string, string> = {
      visitorTitle: `visitors[${visitorIndex}].visitorNameSelect`,
      patientTitle: `visitors[${visitorIndex}].patientNameSelect`,
      country: `visitors[${visitorIndex}].country`,
      state: `visitors[${visitorIndex}].state`,
      city: `visitors[${visitorIndex}].city`,
      searchType: `visitors[${visitorIndex}].searchType`,
    };
    const formikField = fieldMap[fieldName];
    if (formikField) {
      formik.setFieldTouched(formikField, true, false);
      formik.validateField(formikField);
    }
  });

  const formik = useFormik<GateIPDVisitorFormValues>({
    initialValues,
    validationSchema: gateIPDVisitorSchema,
    validateOnChange: false,
    validateOnBlur: true, // Enable validation on blur
    validate: (values) => {
      const errors: any = {};
      
      if (!values.visitors || values.visitors.length <= 1) {
        return errors;
      }
      
      // Check for duplicate mobile numbers
      const mobileNumberMap = new Map<string, number[]>();
      values.visitors.forEach((visitor, index) => {
        const mobileNumber = visitor.mobileNumber?.trim();
        if (mobileNumber && mobileNumber.length > 0) {
          if (!mobileNumberMap.has(mobileNumber)) {
            mobileNumberMap.set(mobileNumber, []);
          }
          mobileNumberMap.get(mobileNumber)!.push(index);
        }
      });
      
      mobileNumberMap.forEach((indices, mobileNumber) => {
        if (indices.length > 1) {
          if (!errors.visitors) {
            errors.visitors = [];
          }
          // Only show error on duplicates (skip the first occurrence, show error on subsequent ones)
          indices.slice(1).forEach((index) => {
            if (!errors.visitors[index]) {
              errors.visitors[index] = {};
            }
            errors.visitors[index].mobileNumber = "Mobile Number must be unique across all visitors";
          });
        }
      });
      
      // Check for duplicate Aadhar card numbers
      const aadharNumberMap = new Map<string, number[]>();
      values.visitors.forEach((visitor, index) => {
        const aadharNumber = visitor.aadharCardNumber?.trim();
        if (aadharNumber && aadharNumber.length > 0) {
          if (!aadharNumberMap.has(aadharNumber)) {
            aadharNumberMap.set(aadharNumber, []);
          }
          aadharNumberMap.get(aadharNumber)!.push(index);
        }
      });
      
      aadharNumberMap.forEach((indices, aadharNumber) => {
        if (indices.length > 1) {
          if (!errors.visitors) {
            errors.visitors = [];
          }
          // Only show error on duplicates (skip the first occurrence, show error on subsequent ones)
          indices.slice(1).forEach((index) => {
            if (!errors.visitors[index]) {
              errors.visitors[index] = {};
            }
            errors.visitors[index].aadharCardNumber = "Aadhar Card Number must be unique across all visitors";
          });
        }
      });
      
      return errors;
    },
    onSubmit: async () => {},
  });

  // Helper function to convert Formik errors to flat structure for components
  // Only show errors for fields that have been touched (blurred)
  const getFormErrors = (index: number): Record<string, string> => {
    const visitorErrors = Array.isArray(formik.errors.visitors)
      ? (formik.errors.visitors[index] as any)
      : undefined;
    const visitorTouched = Array.isArray(formik.touched.visitors)
      ? (formik.touched.visitors[index] as any)
      : undefined;

    if (!visitorErrors || !visitorTouched) {
      return {};
    }

    // Only return errors for fields that have been touched
    const errors: Record<string, string> = {};
    Object.keys(visitorErrors).forEach((key) => {
      if (visitorTouched[key] && typeof visitorErrors[key] === "string") {
        errors[key] = visitorErrors[key];
      }
    });

    return errors;
  };

  const handleGoToHome = () => {
    router.push("/gate");
  };

  const handleAddMore = () => {
    const currentVisitors = formik.values.visitors || [];
    if (currentVisitors.length >= 5) {
      // Show error message - you can customize this
      alert("Maximum 5 visitors allowed");
      return;
    }
    const newVisitor = createEmptyVisitor(Date.now().toString());
    formik.setFieldValue("visitors", [...currentVisitors, newVisitor], false);
    
    // Validate after adding to catch any duplicates
    setTimeout(() => {
      formik.validateForm();
    }, 0);
  };

  const handleRemoveVisitor = (index: number) => {
    const currentVisitors = formik.values.visitors || [];
    if (currentVisitors.length <= 1) return;
    const updated = currentVisitors.filter((_, i) => i !== index);
    
    // Remove visitor from form values
    formik.setFieldValue("visitors", updated, false);
    
    // Clear errors and touched state for the removed visitor by filtering them out
    if (Array.isArray(formik.errors.visitors)) {
      const updatedErrors = formik.errors.visitors.filter((_, i) => i !== index);
      if (updatedErrors.length === 0) {
        // If no errors left, clear the visitors errors entirely
        const newErrors = { ...formik.errors };
        delete (newErrors as any).visitors;
        formik.setErrors(newErrors);
      } else {
        // Update with filtered errors
        formik.setFieldError("visitors", updatedErrors as any);
      }
    }
    
    if (Array.isArray(formik.touched.visitors)) {
      const updatedTouched = formik.touched.visitors.filter((_, i) => i !== index);
      formik.setFieldTouched("visitors", updatedTouched.length > 0 ? updatedTouched as any : []);
    }
    
    // Revalidate to check if duplicate errors should be cleared
    setTimeout(() => {
      formik.validateForm();
    }, 0);
  };

  const scrollToVisitorField = (index: number, field: keyof IPDVisitorItemFormValues) => {
    let target: HTMLElement | null = null;

    switch (field) {
      case "mobileNumber":
        target = mobileNumberRefs.current[index] as unknown as HTMLElement | null;
        break;
      case "aadharCardNumber":
        target = aadharCardNumberRefs.current[index] as unknown as HTMLElement | null;
        break;
      case "visitorNameSelect":
        target = visitorTitleRefs.current[index] as unknown as HTMLElement | null;
        break;
      case "visitorName":
        target = visitorNameRefs.current[index] as unknown as HTMLElement | null;
        break;
      case "patientNameSelect":
        target = patientTitleRefs.current[index] as unknown as HTMLElement | null;
        break;
      case "patientName":
        target = patientNameRefs.current[index] as unknown as HTMLElement | null;
        break;
      case "purpose":
        target = purposeRefs.current[index] as unknown as HTMLElement | null;
        break;
      case "pinCode":
        target = pinCodeRefs.current[index] as unknown as HTMLElement | null;
        break;
      case "country":
        target = countryRefs.current[index] as unknown as HTMLElement | null;
        break;
      case "state":
        target = stateRefs.current[index] as unknown as HTMLElement | null;
        break;
      case "city":
        target = cityRefs.current[index] as unknown as HTMLElement | null;
        break;
      case "tehsil" as any:
        target = tehsilRefs.current[index] as unknown as HTMLElement | null;
        break;
      case "area" as any:
        target = areaRefs.current[index] as unknown as HTMLElement | null;
        break;
      case "address":
        target = addressRefs.current[index] as unknown as HTMLElement | null;
        break;
      case "searchType":
        target = searchTypeRefs.current[index] as unknown as HTMLElement | null;
        break;
      case "phoneNumber":
        target = phoneNumberRefs.current[index] as unknown as HTMLElement | null;
        break;
      case "uhid":
        target = uhidRefs.current[index] as unknown as HTMLElement | null;
        break;
      case "building":
        target = buildingRefs.current[index] as unknown as HTMLElement | null;
        break;
      case "roomNumber":
        target = roomNumberRefs.current[index] as unknown as HTMLElement | null;
        break;
      case "bedNumber":
        target = bedNumberRefs.current[index] as unknown as HTMLElement | null;
        break;
      default:
        break;
    }

    if (!target) return;

    setTimeout(() => {
      target?.scrollIntoView({ behavior: "smooth", block: "center" });

      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        target.focus();
      } else {
        const triggerButton = target.querySelector('button[type="button"]');
        if (triggerButton instanceof HTMLElement) {
          setTimeout(() => {
            triggerButton.focus();
          }, 150);
        }
      }
    }, 100);
  };

  const scrollToFirstError = () => {
    const errors = formik.errors.visitors;
    const values = formik.values.visitors;
    if (!errors || !values) return;

    for (let i = 0; i < errors.length; i++) {
      const err = errors[i] as Partial<IPDVisitorItemFormValues> | undefined;
      if (!err) continue;

      const order: (keyof IPDVisitorItemFormValues)[] = [
        "mobileNumber",
        "aadharCardNumber",
        "visitorNameSelect",
        "visitorName",
        "patientNameSelect",
        "patientName",
        "purpose",
        "pinCode",
        "country",
        "state",
        "city",
        "tehsil" as any,
        "area" as any,
        "address",
        "searchType",
        "phoneNumber",
        "uhid",
        "building",
        "roomNumber",
        "bedNumber",
      ];

      for (const field of order) {
        if ((err as any)[field]) {
          scrollToVisitorField(i, field);
          return;
        }
      }
    }
  };

  // Mark all IPD visitor fields as touched so validation messages show on submit
  const markAllVisitorFieldsTouched = () => {
    const currentVisitors = formik.values.visitors || [];
    const touchedVisitors = currentVisitors.map((visitor) => {
      const touchedVisitor: Partial<Record<keyof IPDVisitorItemFormValues, boolean>> = {};
      (Object.keys(visitor) as (keyof IPDVisitorItemFormValues)[]).forEach((key) => {
        touchedVisitor[key] = true;
      });
      return touchedVisitor;
    });

    formik.setTouched({ visitors: touchedVisitors } as any, false);
  };

  const handleBack = () => {
    router.back();
  };

  // Get names from IDs for country, state, and city
  const getCountryName = (countryId: string): string => {
    const country = countriesData?.data?.find((c) => c.id.toString() === countryId);
    return country?.name || countryId;
  };

  const getStateName = (stateId: string): string => {
    const state = statesData?.data?.find((s) => s.id.toString() === stateId);
    return state?.name || stateId;
  };

  const getCityName = (cityId: string): string => {
    const city = citiesData?.data?.find((c) => c.id.toString() === cityId);
    return city?.name || cityId;
  };

  // Helper functions to get tehsil and area names from IDs
  const getTehsilName = async (tehsilId: string, cityId: string): Promise<string> => {
    if (!tehsilId || !cityId) return tehsilId;
    try {
      const result = await getTehsilsQuery({ districtId: cityId }).unwrap();
      const tehsil = result?.data?.find((t: any) => t.id.toString() === tehsilId);
      return tehsil?.name || tehsilId;
    } catch (error) {
      console.error("Error fetching tehsil name:", error);
      return tehsilId;
    }
  };

  const getAreaName = async (areaId: string, tehsilId: string): Promise<string> => {
    if (!areaId || !tehsilId) return areaId;
    try {
      const result = await getAreasQuery({ tehsilId: tehsilId }).unwrap();
      const area = result?.data?.find((a: any) => a.id.toString() === areaId);
      return area?.name || areaId;
    } catch (error) {
      console.error("Error fetching area name:", error);
      return areaId;
    }
  };

  // Handle form submission (assumes form is already validated)
  const handleFormSubmit = async (values: GateIPDVisitorFormValues) => {
    console.log("IPD Visitor form submit clicked");
    console.log("Form data:", values);

    try {
      // Map all visitors to the API format with async name resolution
      const visitors = await Promise.all(
        (values.visitors || []).map(async (visitor) => {
          const tehsilId = (visitor as any).tehsil;
          const areaId = (visitor as any).area;
          
          // Fetch tehsil and area names if IDs are present
          let tehsilName: string | undefined = undefined;
          let areaName: string | undefined = undefined;
          
          if (tehsilId && visitor.city) {
            tehsilName = await getTehsilName(tehsilId, visitor.city);
          }
          
          if (areaId && tehsilId) {
            // Always set visitorAreaId from the selected area ID (this is the numeric ID from areas API response)
            // areaId contains the area ID (e.g., 332662) from the areas API
            // Fetch area name for the payload
            try {
              areaName = await getAreaName(areaId, tehsilId);
            } catch (error) {
              console.error("Error fetching area name, but visitorAreaId is still set:", error);
              // Even if area name fetch fails, visitorAreaId is still set below
              areaName = areaId; // Fallback to ID if name fetch fails
            }
          }
          
          return {
            patientTitle: visitor.patientNameSelect || undefined,
            visitorTitle: visitor.visitorNameSelect || undefined,
            visitorName: visitor.visitorName,
            visitorType: "IPD" as const,
            visitorContactNumber: visitor.mobileNumber,
            visitorAadharCardNo: visitor.aadharCardNumber || undefined,
            visitorNationality: "Indian", // Default nationality for IPD visitor (no separate nationality field)
            ...(visitor.country === "6"
              ? { visitorAddress: visitor.address }
              : {
                  visitorAddressLine1: (visitor as any).addressLine1 || "",
                  visitorAddressLine2: (visitor as any).addressLine2 || "",
                }),
            visitorCity: visitor.city ? getCityName(visitor.city) : "",
            visitorTehsil: tehsilName,
            visitorArea: areaName,
            visitorAreaId: areaId ? areaId : undefined, // Add areaId from the selected area ID (numeric ID from areas API)
            visitorState: visitor.state ? getStateName(visitor.state) : "",
            visitorCountry: visitor.country ? getCountryName(visitor.country) : "",
            visitorPinCode: visitor.pinCode || "",
            visitorPurpose: visitor.purpose,
            patientName: visitor.patientName,
            // IPD specific fields - always send (empty string if not provided)
            patientPhoneNumber: visitor.phoneNumber || "",
            patientUhid: visitor.uhid || "",
            patientBuilding: visitor.building || undefined,
            patientRoomNo: visitor.roomNumber || undefined,
            patientBedNo: visitor.bedNumber || undefined,
            vehiclePhoto: null as File | null,
            aadharPhoto: (visitor.aadharPhoto && typeof visitor.aadharPhoto === "object" && "name" in visitor.aadharPhoto) ? (visitor.aadharPhoto as File) : null,
          };
        })
      );

      const payload = { visitors };

      console.log("API Payload:", payload);
      const response = await visitorEntry(payload).unwrap();
      console.log("Visitor entries created successfully:", response);
      
      // Show success message
      setSuccessMessage(response?.message || "Visitor entry created successfully!");
      setShowSuccessDialog(true);
      
      // Reset form after successful submission
      setTimeout(() => {
        formik.resetForm();
        formik.setFieldValue("visitors", [createEmptyVisitor("1")]);
      }, 2000);
      
    } catch (error: any) {
      console.error("Error submitting form:", error);
      
      // Handle error - show error message
      let errorMsg = "Failed to submit visitor entry. Please try again.";
      
      if (error?.data?.message) {
        errorMsg = error.data.message;
      } else if (error?.error) {
        errorMsg = error.error;
      } else if (error?.message) {
        errorMsg = error.message;
      }
      
      setApiErrorMessage(errorMsg);
      setShowApiErrorDialog(true);
    }
  };

  return (
    <GateEntryLayout title="">
      <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] px-5 pb-5 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-[28px] font-semibold leading-[120%] text-[#262D3B]">IPD Visitor</h1>
          <div className="flex items-center gap-3">
            <GoToHomeButton onClick={handleGoToHome} />
            <button
              type="button"
              className={`flex h-11 items-center justify-center gap-2 rounded-[32px] border px-6 text-sm font-medium leading-[120%] transition-colors ${
                (formik.values.visitors?.length || 0) >= 5
                  ? "border-[#D0D5DD] bg-[#F9FAFB] text-[#98A2B3] cursor-not-allowed"
                  : "border-[#0B8C00] text-[#0B8C00] hover:bg-[#F2F8F2]"
              }`}
              onClick={handleAddMore}
              disabled={(formik.values.visitors?.length || 0) >= 5}
              title={(formik.values.visitors?.length || 0) >= 5 ? "Maximum 5 visitors allowed" : ""}
            >
              <Image src="/icons/AddIcon.svg" alt="Add" width={20} height={20} className="shrink-0" />
              Add More
            </button>
          </div>
        </div>

        <form
          ref={formRef}
          onSubmit={async (e) => {
            e.preventDefault();
            const errors = await formik.validateForm();
            if (Object.keys(errors).length > 0) {
              formik.setErrors(errors);
              markAllVisitorFieldsTouched();
              scrollToFirstError();
              return;
            }

            await handleFormSubmit(formik.values);
          }}
          className="space-y-6"
        >
          {formik.values.visitors?.map((visitor, index) => (
            <div key={visitor.id || index} className="space-y-3 rounded-[16px]" data-visitor-index={index}>
              {/* Visitor Header */}
              <div className="flex items-center justify-between">
                <div className="text-[20px] font-semibold leading-[120%] text-[#262D3B]">
                  IPD Visitor {index + 1}
                </div>
                {formik.values.visitors && formik.values.visitors.length > 1 && (
                  <button
                    type="button"
                    className="flex items-center justify-center shrink-0"
                    onClick={() => handleRemoveVisitor(index)}
                    aria-label="Remove visitor"
                  >
                    <Image
                      src="/icons/TrashGreenIcon.svg"
                      alt="Delete"
                      width={44}
                      height={44}
                    />
                  </button>
                )}
              </div>

              {/* IPD Visitor (Personal Details) Section */}
              <PatientVisitorDetails
                data={{
                  mobileNumber: visitor.mobileNumber || "",
                  aadharCardNumber: visitor.aadharCardNumber || "",
                  visitorNameSelect: visitor.visitorNameSelect || "",
                  visitorName: visitor.visitorName || "",
                  patientNameSelect: visitor.patientNameSelect || "",
                  patientName: visitor.patientName || "",
                  purpose: visitor.purpose || "",
                  patientUHID: "",
                  patientMobileNumber: "",
                }}
                showPatientFields={false}
                onChange={(field, value) => {
                  formik.setFieldValue(`visitors[${index}].${field}`, value, false); // Don't validate on change
                  
                  // For select fields only, if a value is selected, mark as touched and validate immediately
                  const selectFields = ["visitorNameSelect", "patientNameSelect"];
                  if (selectFields.includes(field) && value && value.trim() !== "") {
                    setTimeout(() => {
                      formik.setFieldTouched(`visitors[${index}].${field}`, true, false);
                      formik.validateField(`visitors[${index}].${field}`);
                    }, 0);
                  }
                  
                  // For input fields: if field was previously invalid (touched and had error), validate on change
                  // This allows errors to clear immediately when user corrects them
                  const inputFields = ["mobileNumber", "aadharCardNumber", "visitorName", "patientName", "purpose"];
                  if (inputFields.includes(field)) {
                    const fieldPath = `visitors[${index}].${field}`;
                    const visitorTouched = Array.isArray(formik.touched.visitors) 
                      ? (formik.touched.visitors[index] as any)
                      : undefined;
                    const visitorErrors = Array.isArray(formik.errors.visitors)
                      ? (formik.errors.visitors[index] as any)
                      : undefined;
                    const isTouched = visitorTouched?.[field];
                    const hasError = visitorErrors?.[field];
                    
                    // For mobileNumber and aadharCardNumber, we need to validate all visitors to check for duplicates
                    if (field === "mobileNumber" || field === "aadharCardNumber") {
                      // If there are multiple visitors, validate to check for duplicates
                      // Also validate if field was touched or had errors before
                      if ((formik.values.visitors?.length || 0) > 1 && (isTouched || hasError || value.trim().length === 10 || (field === "aadharCardNumber" && value.trim().length === 12))) {
                        setTimeout(() => {
                          // Mark field as touched so errors will show
                          formik.setFieldTouched(`visitors[${index}].${field}`, true, false);
                          // Validate the entire form to check for duplicates (this runs the custom validate function)
                          formik.validateForm();
                        }, 0);
                      }
                    } else {
                      // For other fields, only validate the specific field
                      if (isTouched && hasError) {
                        setTimeout(() => {
                          formik.validateField(fieldPath);
                        }, 0);
                      }
                    }
                  }
                  // For new fields (not touched), validation will happen on blur only
                }}
                onBlur={(field) => {
                  formik.setFieldTouched(`visitors[${index}].${field}`, true, false); // Mark as touched, don't validate yet
                  
                  // For mobileNumber and aadharCardNumber, validate all visitors to check for duplicates
                  if (field === "mobileNumber" || field === "aadharCardNumber") {
                    // Validate the entire form to check for duplicates (this runs the custom validate function)
                    setTimeout(() => {
                      formik.validateForm();
                    }, 0);
                  } else {
                    // For other fields, only validate the specific field
                    formik.validateField(`visitors[${index}].${field}`);
                  }
                }}
                fieldRefs={{
                  mobileNumber: (el: HTMLInputElement | null) => {
                    mobileNumberRefs.current[index] = el;
                  },
                  aadharCardNumber: (el: HTMLInputElement | null) => {
                    aadharCardNumberRefs.current[index] = el;
                  },
                  visitorTitle: (el: HTMLDivElement | null) => {
                    visitorTitleRefs.current[index] = el;
                  },
                  visitorName: (el: HTMLInputElement | null) => {
                    visitorNameRefs.current[index] = el;
                  },
                  patientTitle: (el: HTMLDivElement | null) => {
                    patientTitleRefs.current[index] = el;
                  },
                  patientName: (el: HTMLInputElement | null) => {
                    patientNameRefs.current[index] = el;
                  },
                  purpose: (el: HTMLInputElement | null) => {
                    purposeRefs.current[index] = el;
                  },
                }}
                errors={getFormErrors(index)}
                title="IPD Visitor"
              />

              {/* Address Details Section */}
              <AddressDetails
                formData={{
                  pinCode: visitor.pinCode || "",
                  country: visitor.country || "",
                  state: visitor.state || "",
                  city: visitor.city || "",
                  tehsil: (visitor as any).tehsil || "",
                  area: (visitor as any).area || "",
                  address: visitor.address || "",
                  addressLine1: (visitor as any).addressLine1 || "",
                  addressLine2: (visitor as any).addressLine2 || "",
                }}
                onChange={(field, value) => {
                  formik.setFieldValue(`visitors[${index}].${field}`, value, false); // Set value without immediate validation
                  
                  // For select fields only (country, state, city, tehsil, area), if a value is selected, mark as touched and validate immediately
                  const selectFields = ["country", "state", "city", "tehsil", "area"] as string[];
                  if (selectFields.includes(field) && value && value.trim() !== "") {
                    const fieldPath = `visitors[${index}].${field}`;
                    // Use a slightly longer timeout to ensure Formik state is updated, especially for async auto-fill from pincode
                    setTimeout(() => {
                      // Double-check that the value is actually set before validating
                      const currentValue = formik.values.visitors?.[index]?.[field as keyof IPDVisitorItemFormValues];
                      if (currentValue === value || String(currentValue) === String(value)) {
                        formik.setFieldTouched(fieldPath, true, false);
                        formik.validateField(fieldPath);
                      } else {
                        // If value isn't set yet, try again after a bit more time
                        setTimeout(() => {
                          formik.setFieldTouched(fieldPath, true, false);
                          formik.validateField(fieldPath);
                        }, 50);
                      }
                    }, 10);
                  }
                  
                  // For input fields: if field was previously invalid (touched and had error), validate on change
                  // This allows errors to clear immediately when user corrects them
                  const inputFields = ["pinCode", "address", "addressLine1", "addressLine2"];
                  if (inputFields.includes(field)) {
                    const fieldPath = `visitors[${index}].${field}`;
                    const visitorTouched = Array.isArray(formik.touched.visitors) 
                      ? (formik.touched.visitors[index] as any)
                      : undefined;
                    const visitorErrors = Array.isArray(formik.errors.visitors)
                      ? (formik.errors.visitors[index] as any)
                      : undefined;
                    const isTouched = visitorTouched?.[field];
                    const hasError = visitorErrors?.[field];
                    
                    // If field was touched and had an error, validate on change to clear error immediately
                    if (isTouched && hasError) {
                      setTimeout(() => {
                        formik.validateField(fieldPath);
                      }, 0);
                    }
                  }
                  // For new fields (not touched), validation will happen on blur only
                }}
                onBlur={(field) => {
                  formik.setFieldTouched(`visitors[${index}].${field}`, true, false); // Mark as touched, don't validate yet
                  formik.validateField(`visitors[${index}].${field}`); // Validate the field after marking as touched
                }}
                fieldRefs={{
                  pinCode: (el: HTMLInputElement | null) => {
                    pinCodeRefs.current[index] = el;
                  },
                  country: (el: HTMLDivElement | null) => {
                    countryRefs.current[index] = el;
                  },
                  state: (el: HTMLDivElement | null) => {
                    stateRefs.current[index] = el;
                  },
                  city: (el: HTMLDivElement | null) => {
                    cityRefs.current[index] = el;
                  },
                  tehsil: (el: HTMLDivElement | null) => {
                    tehsilRefs.current[index] = el;
                  },
                  area: (el: HTMLDivElement | null) => {
                    areaRefs.current[index] = el;
                  },
                  address: (el: HTMLInputElement | null) => {
                    addressRefs.current[index] = el;
                  },
                }}
                errors={getFormErrors(index)}
              />

              {/* Additional Details Section */}
              <IPDAdditionalDetails
                data={{
                  searchType: visitor.searchType || "",
                  phoneNumber: visitor.phoneNumber || "",
                  uhid: visitor.uhid || "",
                  building: visitor.building || "",
                  roomNumber: visitor.roomNumber || "",
                  bedNumber: visitor.bedNumber || "",
                }}
                onChange={(field, value) => {
                  formik.setFieldValue(`visitors[${index}].${field}`, value, false); // Don't validate on change
                  
                  // For select fields only (searchType), if a value is selected, mark as touched and validate immediately
                  if (field === "searchType" && value && value.trim() !== "") {
                    setTimeout(() => {
                      formik.setFieldTouched(`visitors[${index}].${field}`, true, false);
                      formik.validateField(`visitors[${index}].${field}`);
                    }, 0);
                  }
                  
                  // For input fields: if field was previously invalid (touched and had error), validate on change
                  // This allows errors to clear immediately when user corrects them
                  const inputFields = ["phoneNumber", "uhid", "building", "roomNumber", "bedNumber"];
                  if (inputFields.includes(field)) {
                    const fieldPath = `visitors[${index}].${field}`;
                    const visitorTouched = Array.isArray(formik.touched.visitors) 
                      ? (formik.touched.visitors[index] as any)
                      : undefined;
                    const visitorErrors = Array.isArray(formik.errors.visitors)
                      ? (formik.errors.visitors[index] as any)
                      : undefined;
                    const isTouched = visitorTouched?.[field];
                    const hasError = visitorErrors?.[field];
                    
                    // If field was touched and had an error, validate on change to clear error immediately
                    if (isTouched && hasError) {
                      setTimeout(() => {
                        formik.validateField(fieldPath);
                      }, 0);
                    }
                  }
                  
                  // Clear the other field when searchType changes
                  if (field === "searchType") {
                    if (value === "Phone") {
                      formik.setFieldValue(`visitors[${index}].uhid`, "", false);
                      formik.setFieldError(`visitors[${index}].uhid`, undefined);
                    } else if (value === "UHID") {
                      formik.setFieldValue(`visitors[${index}].phoneNumber`, "", false);
                      formik.setFieldError(`visitors[${index}].phoneNumber`, undefined);
                    } else {
                      // Clear both fields when searchType is cleared (empty string or "None")
                      formik.setFieldValue(`visitors[${index}].phoneNumber`, "", false);
                      formik.setFieldValue(`visitors[${index}].uhid`, "", false);
                      formik.setFieldError(`visitors[${index}].phoneNumber`, undefined);
                      formik.setFieldError(`visitors[${index}].uhid`, undefined);
                    }
                  }
                  // For new fields (not touched), validation will happen on blur only
                }}
                onBlur={(field) => {
                  formik.setFieldTouched(`visitors[${index}].${field}`, true, false); // Mark as touched, don't validate yet
                  formik.validateField(`visitors[${index}].${field}`); // Validate the field after marking as touched
                }}
                fieldRefs={{
                  searchType: (el: HTMLDivElement | null) => {
                    searchTypeRefs.current[index] = el;
                  },
                  phoneNumber: (el: HTMLInputElement | null) => {
                    phoneNumberRefs.current[index] = el;
                  },
                  uhid: (el: HTMLInputElement | null) => {
                    uhidRefs.current[index] = el;
                  },
                  building: (el: HTMLInputElement | null) => {
                    buildingRefs.current[index] = el;
                  },
                  roomNumber: (el: HTMLInputElement | null) => {
                    roomNumberRefs.current[index] = el;
                  },
                  bedNumber: (el: HTMLInputElement | null) => {
                    bedNumberRefs.current[index] = el;
                  },
                }}
                errors={getFormErrors(index)}
              />
            </div>
          ))}

          {/* Action Buttons */}
          <div className="flex items-center justify-start gap-4">
            <Button 
              type="submit" 
              variant="primary" 
              isLoading={formik.isSubmitting || isSubmitting}
              disabled={formik.isSubmitting || isSubmitting}
            >
              Submit
            </Button>
            <BackToPreviousPageButton onClick={handleBack} />
          </div>
        </form>
      </div>

      {/* Success Dialog */}
      <MessageDialog
        open={showSuccessDialog}
        onClose={() => {
          setShowSuccessDialog(false);
          router.push("/gate");
        }}
        icon="/icons/SuccessCheck.svg"
        iconBgColor="#E8F5E9"
        message={successMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => {
          setShowSuccessDialog(false);
          router.push("/gate");
        }}
      />

      {/* API Error Dialog - Only for API errors, not validation errors */}
      <MessageDialog
        open={showApiErrorDialog}
        onClose={() => {
          setShowApiErrorDialog(false);
        }}
        icon="/icons/CrossIcon.svg"
        iconBgColor="#FFEBEE"
        message={apiErrorMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => {
          setShowApiErrorDialog(false);
        }}
      />
    </GateEntryLayout>
  );
}

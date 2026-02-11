"use client";

import { useParams, useRouter } from "next/navigation";
import { useRef, useEffect, useState } from "react";
import { useFormik } from "formik";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { BackToPreviousPageButton, Button, MessageDialog } from "@/components/ui";
import RegistrationPersonalDetails from "@/components/registration/RegistrationPersonalDetails";
import { AddressDetails } from "@/components/forms";
import { useGetPatientRegistrationDetailsQuery, useUpdatePatientRegistrationDetailsMutation } from "@/store/api/registrationApi";
import { useGetCountriesQuery, useGetStatesQuery, useGetCitiesQuery, useLazyGetStatesQuery, useLazyGetCitiesQuery, useLazyGetTehsilsQuery, useLazyGetAreasQuery } from "@/store/api/publicApi";
import { registrationPersonalDetailsSchema } from "@/lib/validation/registrationSchemas";
import { useArrowKeyNavigation } from "@/hooks/useArrowKeyNavigation";
import type { RegistrationPersonalDetailsFormValues } from "@/lib/validation/registrationSchemas";

export default function EditRegistrationFormPage() {
    const router = useRouter();
    const params = useParams();
    const patientId = params?.patientId as string;
    const formRef = useRef<HTMLFormElement>(null);

    // Dialog states
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    // Fetch patient registration details - always fetch fresh data when edit icon is clicked
    const { data: registrationData, isLoading, isError } = useGetPatientRegistrationDetailsQuery(
        { registrationId: patientId || "" },
        { 
            skip: !patientId,
            refetchOnMountOrArgChange: true, // Always refetch when component mounts or patientId changes
        }
    );

    const [updateRegistration, { isLoading: isUpdating }] = useUpdatePatientRegistrationDetailsMutation();

    const patientData = registrationData?.data;

    // Track when address fields are fully loaded (IDs converted from names)
    const [isAddressFieldsReady, setIsAddressFieldsReady] = useState(false);

    // Fetch countries, states, and cities for converting names to IDs when loading form
    const { data: countriesData } = useGetCountriesQuery();
    const [selectedCountryId, setSelectedCountryId] = useState<string>("");
    const { data: statesData } = useGetStatesQuery(
        selectedCountryId ? { countryId: selectedCountryId } : undefined,
        { skip: !selectedCountryId }
    );
    const [selectedStateId, setSelectedStateId] = useState<string>("");
    const { data: citiesData } = useGetCitiesQuery(
        selectedStateId ? { stateId: selectedStateId } : undefined,
        { skip: !selectedStateId }
    );
    const [getStates] = useLazyGetStatesQuery();
    const [getCities] = useLazyGetCitiesQuery();
    const [getTehsilsQuery] = useLazyGetTehsilsQuery();
    const [getAreasQuery] = useLazyGetAreasQuery();

    // Submit logic function
    const handleSubmitLogic = async (values: any) => {
        console.log("handleSubmitLogic called with values:", values);
        try {
            // Prepare payload - only personal info and address info
            const payload: any = {};
            
            // Add personal information fields (only if they have values)
            if (values.patientNameSelect) payload.patientTitle = values.patientNameSelect;
            if (values.patientName) payload.patientName = values.patientName;
            if (values.fathersHusbandsNameSelect) payload.guardianTitle = values.fathersHusbandsNameSelect;
            if (values.fathersHusbandsName) payload.guardianName = values.fathersHusbandsName;
            if (values.gender) payload.gender = values.gender;
            if (values.age) payload.age = values.age;
            if (values.maritalStatus) payload.maritalStatus = values.maritalStatus;
            if (values.religion) payload.religion = values.religion;
            if (values.specificReligion) payload.specificReligion = values.specificReligion;
            if (values.occupation) payload.occupation = values.occupation;
            if (values.emailAddress) payload.emailAddress = values.emailAddress;
            if (values.whatsappNo) payload.whatsappNo = values.whatsappNo;
            if (values.aadharCardNumber) payload.aadharCardNo = values.aadharCardNumber;

            // Add address object with all address fields plus addressId
            // Convert IDs to names for country, state, and city
            const addressFields: any = {};
            if (values.address) addressFields.address = values.address;
            if (values.pinCode) addressFields.pinCode = values.pinCode;
            if ((values as any).addressLine1 != null && (values as any).addressLine1 !== "") addressFields.addressLine1 = (values as any).addressLine1;
            if ((values as any).addressLine2 != null && (values as any).addressLine2 !== "") addressFields.addressLine2 = (values as any).addressLine2;
            
            // Convert country ID to name
            if (values.country && countriesData?.data) {
                const country = countriesData.data.find((c: any) => c.id.toString() === values.country);
                if (country) {
                    addressFields.country = country.name;
                } else {
                    addressFields.country = values.country; // Fallback to ID if name not found
                }
            }
            
            // Fetch states for the selected country to convert state ID to name
            let stateName = values.state;
            if (values.state && values.country) {
                try {
                    const statesResult = await getStates({ countryId: values.country }).unwrap();
                    if (statesResult?.data) {
                        const state = statesResult.data.find((s: any) => s.id.toString() === values.state);
                        if (state) {
                            stateName = state.name;
                        }
                    }
                } catch (error) {
                    console.error("Error fetching states:", error);
                }
            }
            if (stateName) addressFields.state = stateName;
            
            // Fetch cities for the selected state to convert city ID to name
            let cityName = values.city;
            if (values.city && values.state) {
                try {
                    const citiesResult = await getCities({ stateId: values.state }).unwrap();
                    if (citiesResult?.data) {
                        const city = citiesResult.data.find((c: any) => c.id.toString() === values.city);
                        if (city) {
                            cityName = city.name;
                        }
                    }
                } catch (error) {
                    console.error("Error fetching cities:", error);
                }
            }
            if (cityName) addressFields.city = cityName;
            
            // Fetch tehsil name from tehsil ID
            let tehsilName = (values as any).tehsil;
            if ((values as any).tehsil && values.city) {
                try {
                    const tehsilsResult = await getTehsilsQuery({ districtId: values.city }).unwrap();
                    if (tehsilsResult?.data) {
                        const tehsil = tehsilsResult.data.find((t: any) => t.id.toString() === (values as any).tehsil);
                        if (tehsil) {
                            tehsilName = tehsil.name;
                        }
                    }
                } catch (error) {
                    console.error("Error fetching tehsils:", error);
                }
            }
            if (tehsilName && typeof tehsilName === 'string') {
                addressFields.tehsil = tehsilName;
            }
            
            // Fetch area name from area ID
            let areaName = (values as any).area;
            const areaId = (values as any).area; // Store area ID before converting to name
            if ((values as any).area && (values as any).tehsil) {
                // Always set areaId from the selected area ID (this is the numeric ID from areas API response)
                // areaId contains the area ID (e.g., 332662) from the areas API
                // Fetch area name for the payload
                try {
                    const areasResult = await getAreasQuery({ tehsilId: (values as any).tehsil }).unwrap();
                    if (areasResult?.data) {
                        const area = areasResult.data.find((a: any) => a.id.toString() === (values as any).area);
                        if (area) {
                            areaName = area.name;
                        }
                    }
                } catch (error) {
                    console.error("Error fetching area name, but areaId is still set:", error);
                    // Even if area name fetch fails, areaId is still set below
                    areaName = areaId; // Fallback to ID if name fetch fails
                }
            }
            if (areaName && typeof areaName === 'string') {
                addressFields.area = areaName;
            }
            // Add areaId from the selected area ID (numeric ID from areas API)
            if (areaId) {
                addressFields.areaId = areaId;
            }
            
            // Add addressId from existing address data
            if (patientData?.address?.id) {
                addressFields.addressId = patientData.address.id;
            }
            
            if (Object.keys(addressFields).length > 0) {
                payload.address = addressFields;
            }

            // Console log payload before API call
            console.log("Payload for API:", payload);
            console.log("Calling updateRegistration API...");

            const result = await updateRegistration({
                registrationId: patientId || "",
                ...payload,
            }).unwrap();
            
            console.log("API Response:", result);

            if (result.success) {
                setSuccessMessage("Registration updated successfully!");
                setShowSuccessDialog(true);
            } else {
                setErrorMessage(result.message || "Failed to update registration");
                setShowErrorDialog(true);
            }
        } catch (error: any) {
            console.error("Error updating registration:", error);
            setErrorMessage(error?.data?.message || error?.message || "Failed to update registration");
            setShowErrorDialog(true);
        }
    };

    // Initialize formik with validation schema
    const formik = useFormik<Partial<RegistrationPersonalDetailsFormValues> & {
        contactNumber: string;
        whatsappNo: string;
        aadharCardNumber: string;
        patientNameSelect: string;
        patientName: string;
        gender: string;
        age: string;
        maritalStatus: string;
        fathersHusbandsNameSelect: string;
        fathersHusbandsName: string;
        religion: string;
        specificReligion: string;
        occupation: string;
        emailAddress: string;
        jsHealthCardNo: string;
        pinCode: string;
        country: string;
        state: string;
        city: string;
        tehsil: string;
        area: string;
        address: string;
        addressLine1: string;
        addressLine2: string;
    }>({
        initialValues: {
            contactNumber: "",
            whatsappNo: "",
            aadharCardNumber: "",
            patientNameSelect: "",
            patientName: "",
            gender: "",
            age: "",
            maritalStatus: "",
            fathersHusbandsNameSelect: "",
            fathersHusbandsName: "",
            religion: "",
            specificReligion: "",
            occupation: "",
            emailAddress: "",
            jsHealthCardNo: "",
            pinCode: "",
            country: "",
            state: "",
            city: "",
            tehsil: "",
            area: "",
            address: "",
            addressLine1: "",
            addressLine2: "",
        },
        validationSchema: registrationPersonalDetailsSchema,
        enableReinitialize: true,
        onSubmit: async (values, { setSubmitting }) => {
            console.log("Formik onSubmit called with values:", values);
            await handleSubmitLogic(values);
            setSubmitting(false);
        },
    });

    // Populate form when data is loaded - Step 1: Set basic fields and find country ID
    useEffect(() => {
        if (patientData && countriesData?.data) {
            // Find country ID from country name
            let countryId = "";
            if (patientData.address?.country) {
                const country = countriesData.data.find((c: any) => 
                    c.name.toLowerCase() === patientData.address?.country?.toLowerCase()
                );
                if (country) {
                    countryId = country.id.toString();
                }
            }

            // Set all form values
            formik.setValues({
                contactNumber: patientData.contactNumber || "",
                whatsappNo: patientData.whatsappNo || "",
                aadharCardNumber: patientData.aadharCardNo || "",
                patientNameSelect: patientData.patientTitle || "",
                patientName: patientData.patientName || "",
                gender: patientData.gender || "",
                age: patientData.age || "",
                maritalStatus: patientData.maritalStatus || "",
                fathersHusbandsNameSelect: patientData.guardianTitle || "",
                fathersHusbandsName: patientData.guardianName || "",
                religion: patientData.religion || "",
                specificReligion: patientData.specificReligion || "",
                occupation: patientData.occupation || "",
                emailAddress: patientData.emailAddress || "",
                jsHealthCardNo: patientData.jsHealthCardNo || "",
                pinCode: patientData.address?.pinCode || "",
                country: countryId,
                state: "", // Will be set in next useEffect
                city: "", // Will be set in next useEffect
                tehsil: "", // Will be set after city is set
                area: "", // Will be set after tehsil is set
                address: patientData.address?.address || "",
                // When API returns null for addressLine1/2, fallback to legacy "address" for non-India so existing data shows in Address Line 1
                addressLine1: (() => {
                    const addr = patientData.address as any;
                    const line1 = addr?.addressLine1 != null && addr?.addressLine1 !== "" ? addr.addressLine1 : "";
                    if (line1) return line1;
                    const countryName = (addr?.country || "").toString();
                    if (countryName && countryName.toLowerCase() !== "india" && countryName !== "6" && addr?.address?.trim()) {
                        return addr.address.trim();
                    }
                    return "";
                })(),
                addressLine2: (patientData.address as any)?.addressLine2 ?? "",
            } as any);

            // Reset address fields ready flag when new data loads
            setIsAddressFieldsReady(false);

            // Set country ID to trigger states fetch
            if (countryId) {
                setSelectedCountryId(countryId);
            }
        }
    }, [patientData, countriesData]);

    // Step 2: Find state ID from state name once states are loaded
    useEffect(() => {
        
        if (patientData?.address?.state && statesData?.data && selectedCountryId) {
            const state = statesData.data.find((s: any) => 
                s.name.toLowerCase() === patientData.address?.state?.toLowerCase()
            );
            if (state) {
                const stateId = state.id.toString();
                // Set value without validation
                formik.setFieldValue("state", stateId, false);
                // Clear any existing errors for state by removing from errors object
                const currentErrors = { ...formik.errors };
                if (currentErrors.state) {
                    delete currentErrors.state;
                    formik.setErrors(currentErrors);
                }
                // Clear touched state to prevent error display
                const currentTouched = { ...formik.touched };
                if (currentTouched.state) {
                    delete currentTouched.state;
                    formik.setTouched(currentTouched, false);
                }
                setSelectedStateId(stateId); // Trigger cities fetch
                // Mark address fields as ready when state is set
                // State field is ready immediately when state ID is set
                // Don't wait for citiesData to load - city will be handled separately
                setIsAddressFieldsReady(true);
            } else if (patientData?.address?.state && !state) {
                // If state name exists in data but not found in statesData, still mark as ready to prevent errors
                setIsAddressFieldsReady(true);
            }
        } else if (patientData && !patientData?.address?.state && selectedCountryId) {
            // If no state in data but country is set, mark as ready
            setIsAddressFieldsReady(true);
        }
    }, [patientData, statesData, selectedCountryId]);

    // Step 3: Find city ID from city name once cities are loaded
    useEffect(() => {
        if (patientData?.address?.city && citiesData?.data && selectedStateId) {
            const city = citiesData.data.find((c: any) => 
                c.name.toLowerCase() === patientData.address?.city?.toLowerCase()
            );
            if (city) {
                const cityId = city.id.toString();
                // Set value without validation
                formik.setFieldValue("city", cityId, false);
                // Clear any existing errors for city by removing from errors object
                const currentErrors = { ...formik.errors };
                if (currentErrors.city) {
                    delete currentErrors.city;
                    formik.setErrors(currentErrors);
                }
                // Clear touched state to prevent error display
                const currentTouched = { ...formik.touched };
                if (currentTouched.city) {
                    delete currentTouched.city;
                    formik.setTouched(currentTouched, false);
                }
                // Mark address fields as ready when city is set
                setIsAddressFieldsReady(true);
            } else if (patientData?.address?.state && !patientData?.address?.city) {
                // If state is set but no city in data, mark as ready
                setIsAddressFieldsReady(true);
            }
        }
    }, [patientData, citiesData, selectedStateId]);

    // Step 4: Find tehsil ID from tehsil name once city is set
    useEffect(() => {
        if (patientData?.address?.tehsil && formik.values.city && selectedStateId) {
            const fetchAndSetTehsil = async () => {
                try {
                    const result = await getTehsilsQuery({ districtId: formik.values.city }).unwrap();
                    if (result?.data) {
                        const tehsilName = patientData.address?.tehsil || "";
                        const tehsil = result.data.find((t: any) => 
                            (t.name || "").toLowerCase() === String(tehsilName || "").toLowerCase()
                        );
                        if (tehsil) {
                            const tehsilId = tehsil.id.toString();
                            formik.setFieldValue("tehsil", tehsilId, false);
                            // Clear errors and touched state
                            const currentErrors = { ...formik.errors };
                            if (currentErrors.tehsil) {
                                delete currentErrors.tehsil;
                                formik.setErrors(currentErrors);
                            }
                            const currentTouched = { ...formik.touched };
                            if (currentTouched.tehsil) {
                                delete currentTouched.tehsil;
                                formik.setTouched(currentTouched, false);
                            }
                        }
                    }
                } catch (error) {
                    console.error("Error fetching tehsils:", error);
                }
            };
            fetchAndSetTehsil();
        }
    }, [patientData, formik.values.city, selectedStateId, getTehsilsQuery]);

    // Step 5: Find area ID from area name once tehsil is set
    useEffect(() => {
        if (patientData?.address?.area && formik.values.tehsil) {
            const fetchAndSetArea = async () => {
                try {
                    const result = await getAreasQuery({ tehsilId: formik.values.tehsil }).unwrap();
                    if (result?.data) {
                        const areaName = patientData.address?.area || "";
                        const area = result.data.find((a: any) => 
                            (a.name || "").toLowerCase() === String(areaName || "").toLowerCase()
                        );
                        if (area) {
                            const areaId = area.id.toString();
                            formik.setFieldValue("area", areaId, false);
                            // Clear errors and touched state
                            const currentErrors = { ...formik.errors };
                            if (currentErrors.area) {
                                delete currentErrors.area;
                                formik.setErrors(currentErrors);
                            }
                            const currentTouched = { ...formik.touched };
                            if (currentTouched.area) {
                                delete currentTouched.area;
                                formik.setTouched(currentTouched, false);
                            }
                        }
                    }
                } catch (error) {
                    console.error("Error fetching areas:", error);
                }
            };
            fetchAndSetArea();
        }
    }, [patientData, formik.values.tehsil, getAreasQuery]);

    // Refs for form fields
    const contactNumberRef = useRef<HTMLInputElement>(null);
    const whatsappNoRef = useRef<HTMLInputElement>(null);
    const aadharCardNumberRef = useRef<HTMLInputElement>(null);
    const patientNameSelectRef = useRef<HTMLDivElement>(null);
    const patientNameRef = useRef<HTMLInputElement>(null);
    const genderRef = useRef<HTMLDivElement>(null);
    const ageRef = useRef<HTMLInputElement>(null);
    const maritalStatusRef = useRef<HTMLDivElement>(null);
    const fathersHusbandsNameSelectRef = useRef<HTMLDivElement>(null);
    const fathersHusbandsNameRef = useRef<HTMLInputElement>(null);
    const religionRef = useRef<HTMLDivElement>(null);
    const specificReligionRef = useRef<HTMLInputElement>(null);
    const occupationRef = useRef<HTMLInputElement>(null);
    const emailAddressRef = useRef<HTMLInputElement>(null);
    const jsHealthCardNoRef = useRef<HTMLInputElement>(null);

    // Address field refs
    const pinCodeRef = useRef<HTMLInputElement>(null);
    const countryRef = useRef<HTMLDivElement>(null);
    const stateRef = useRef<HTMLDivElement>(null);
    const cityRef = useRef<HTMLDivElement>(null);
    const tehsilRef = useRef<HTMLDivElement>(null);
    const areaRef = useRef<HTMLDivElement>(null);
    const addressRef = useRef<HTMLInputElement>(null);
    const addressLine1Ref = useRef<HTMLInputElement>(null);
    const addressLine2Ref = useRef<HTMLInputElement>(null);

    // Enable arrow key navigation
    useArrowKeyNavigation(formRef, true);

    // Helper function to get form errors
    // Exclude state and city errors until address fields are ready (IDs converted from names)
    const getFormErrors = () => {
        const errors: Record<string, string> = {};
        Object.keys(formik.errors).forEach((key) => {
            // Don't show state/city/tehsil/area errors until address fields are ready
            if ((key === "state" || key === "city" || key === "tehsil" || key === "area") && !isAddressFieldsReady) {
                return;
            }
            const error = formik.errors[key as keyof typeof formik.errors];
            if (error && typeof error === "string") {
                errors[key] = error;
            }
        });
        return errors;
    };

    // Scroll to first error
    const scrollToFirstError = () => {
        const firstErrorField = Object.keys(formik.errors)[0];
        if (firstErrorField) {
            const fieldRef = formik.getFieldProps(firstErrorField).name;
            const refMap: Record<string, React.RefObject<HTMLElement | null>> = {
                contactNumber: contactNumberRef,
                whatsappNo: whatsappNoRef,
                aadharCardNumber: aadharCardNumberRef,
                patientNameSelect: patientNameSelectRef,
                patientName: patientNameRef,
                gender: genderRef,
                age: ageRef,
                maritalStatus: maritalStatusRef,
                fathersHusbandsNameSelect: fathersHusbandsNameSelectRef,
                fathersHusbandsName: fathersHusbandsNameRef,
                religion: religionRef,
                specificReligion: specificReligionRef,
                occupation: occupationRef,
                emailAddress: emailAddressRef,
                jsHealthCardNo: jsHealthCardNoRef,
                pinCode: pinCodeRef,
                country: countryRef,
                state: stateRef,
                city: cityRef,
                tehsil: tehsilRef,
                area: areaRef,
                address: addressRef,
                addressLine1: addressLine1Ref,
                addressLine2: addressLine2Ref,
            };

            const ref = refMap[firstErrorField];
            if (ref?.current) {
                ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
                ref.current.focus();
            }
        }
    };

    if (isLoading) {
        return (
            <AppShell>
                <div className="flex items-center justify-center min-h-screen">
                    <p>Loading...</p>
                </div>
            </AppShell>
        );
    }

    if (isError || !patientData) {
        return (
            <AppShell>
                <div className="flex items-center justify-center min-h-screen">
                    <p>Error loading registration details. Please try again.</p>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <div className="space-y-8">
                <div className="flex items-start justify-between">
                    <PageHeading title="Edit Registration Form" />
                    <div className="px-5">
                        <BackToPreviousPageButton
                            iconOnly={true}
                            onClick={() => router.back()}
                        />
                    </div>
                </div>

                <form
                    ref={formRef}
                    onSubmit={async (e) => {
                        e.preventDefault();
                        console.log("Form submit triggered");
                        
                        // Define fields for validation
                        const fields = [
                            'contactNumber', 'patientNameSelect', 'patientName', 'gender', 'age',
                            'maritalStatus', 'fathersHusbandsNameSelect', 'fathersHusbandsName',
                            'religion', 'occupation', 'pinCode', 'country', 'state', 'city', 'tehsil', 'area', 'address',
                            'aadharCardNumber', 'whatsappNo', 'emailAddress', 'specificReligion'
                        ];
                        
                        // Mark fields as touched
                        fields.forEach(field => {
                            formik.setFieldTouched(field, true, false);
                        });
                        
                        // Validate form
                        const errors = await formik.validateForm();
                        const formErrors: Record<string, string> = {};
                        
                        fields.forEach(field => {
                            const error = errors[field as keyof typeof errors];
                            if (error && typeof error === 'string') {
                                formErrors[field] = error;
                            }
                        });
                        
                        // Check Aadhar Card Number: if entered, must be exactly 12 digits
                        if (formik.values.aadharCardNumber && formik.values.aadharCardNumber.trim() !== '') {
                            const aadharValue = formik.values.aadharCardNumber.trim();
                            if (aadharValue.length !== 12 || !/^\d+$/.test(aadharValue)) {
                                formErrors.aadharCardNumber = 'Aadhar Card Number must be exactly 12 digits';
                                formik.setFieldTouched('aadharCardNumber', true, false);
                            }
                        }
                        
                        // Check Email Address: if entered, must be valid email format
                        if (formik.values.emailAddress && formik.values.emailAddress.trim() !== '') {
                            const emailValue = formik.values.emailAddress.trim();
                            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
                            if (!emailRegex.test(emailValue)) {
                                formErrors.emailAddress = 'Please enter a valid email address';
                                formik.setFieldTouched('emailAddress', true, false);
                            }
                        }
                        
                        // Check conditional fields
                        if (formik.values.religion === 'other' && !formik.values.specificReligion) {
                            formErrors.specificReligion = 'Specific Religion is required';
                            formik.setFieldTouched('specificReligion', true, false);
                        }
                        
                        if (Object.keys(formErrors).length > 0) {
                            console.log("Validation errors found:", formErrors);
                            formik.setErrors({ ...formik.errors, ...formErrors });
                            scrollToFirstError();
                            return;
                        }
                        
                        console.log("Validation passed, calling submit logic directly");
                        // Call submit logic directly
                        formik.setSubmitting(true);
                        await handleSubmitLogic(formik.values);
                        formik.setSubmitting(false);
                    }}
                    className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] p-5 mb-4"
                >
                    <h3 className="font-inter font-semibold text-[24px] leading-[120%] text-[#262D3B] mb-4">Personal Information</h3>

                    {/* Personal Details Component */}
                    <RegistrationPersonalDetails
                        formData={{
                            contactNumber: formik.values.contactNumber || "",
                            whatsappNo: formik.values.whatsappNo || "",
                            aadharCardNumber: formik.values.aadharCardNumber || "",
                            patientNameSelect: formik.values.patientNameSelect || "",
                            patientName: formik.values.patientName || "",
                            gender: formik.values.gender || "",
                            age: formik.values.age || "",
                            maritalStatus: formik.values.maritalStatus || "",
                            fathersHusbandsNameSelect: formik.values.fathersHusbandsNameSelect || "",
                            fathersHusbandsName: formik.values.fathersHusbandsName || "",
                            religion: formik.values.religion || "",
                            specificReligion: formik.values.specificReligion || "",
                            occupation: formik.values.occupation || "",
                            emailAddress: formik.values.emailAddress || "",
                            jsHealthCardNo: formik.values.jsHealthCardNo || "",
                        }}
                        registrationId={patientId}
                        onChange={(field, value) => {
                            formik.setFieldValue(field, value, false);

                            // For select fields, if a value is selected, mark as touched and validate immediately
                            const selectFields = ["gender", "maritalStatus", "religion", "patientNameSelect", "fathersHusbandsNameSelect"];
                            if (selectFields.includes(field) && value && value.trim() !== "") {
                                setTimeout(() => {
                                    formik.setFieldTouched(field, true, false);
                                    formik.validateField(field);
                                }, 0);
                            }

                            // For input fields: if field was previously invalid (touched and had error), validate on change
                            const inputFields = ["whatsappNo", "aadharCardNumber", "patientName", "age", "fathersHusbandsName", "occupation", "specificReligion"];
                            if (inputFields.includes(field)) {
                                const isTouched = formik.touched[field as keyof typeof formik.touched];
                                const hasError = formik.errors[field as keyof typeof formik.errors];

                                if (isTouched && hasError) {
                                    setTimeout(() => {
                                        formik.validateField(field);
                                    }, 0);
                                }
                            }
                            
                            // For email field: validate on change once touched
                            if (field === "emailAddress") {
                                const isTouched = formik.touched[field as keyof typeof formik.touched];
                                if (isTouched) {
                                    setTimeout(() => {
                                        formik.validateField(field);
                                    }, 0);
                                }
                            }
                        }}
                        onBlur={(field) => {
                            formik.setFieldTouched(field, true, false);
                            formik.validateField(field);
                        }}
                        fieldRefs={{
                            contactNumber: contactNumberRef,
                            whatsappNo: whatsappNoRef,
                            aadharCardNumber: aadharCardNumberRef,
                            patientNameSelect: patientNameSelectRef,
                            patientName: patientNameRef,
                            gender: genderRef,
                            age: ageRef,
                            maritalStatus: maritalStatusRef,
                            fathersHusbandsNameSelect: fathersHusbandsNameSelectRef,
                            fathersHusbandsName: fathersHusbandsNameRef,
                            religion: religionRef,
                            specificReligion: specificReligionRef,
                            occupation: occupationRef,
                            emailAddress: emailAddressRef,
                            jsHealthCardNo: jsHealthCardNoRef,
                        }}
                        errors={getFormErrors()}
                        readOnlyFields={["contactNumber", "jsHealthCardNo"]}
                    />

                    {/* Address Details Component */}
                    <AddressDetails
                        formData={{
                            pinCode: formik.values.pinCode || "",
                            country: formik.values.country || "",
                            state: formik.values.state || "",
                            city: formik.values.city || "",
                            tehsil: (formik.values as any).tehsil || "",
                            area: (formik.values as any).area || "",
                            address: formik.values.address || "",
                            addressLine1: (formik.values as any).addressLine1 || "",
                            addressLine2: (formik.values as any).addressLine2 || "",
                        }}
                        onChange={(field, value) => {
                            formik.setFieldValue(field, value, false);

                            // For select fields only (country, state, city, tehsil, area), if a value is selected, mark as touched and validate immediately
                            // But only if address fields are ready (IDs have been converted from names)
                            const selectFields = ["country", "state", "city", "tehsil", "area"];
                            if (selectFields.includes(field) && value && value.trim() !== "" && isAddressFieldsReady) {
                                setTimeout(() => {
                                    const currentValue = formik.values[field as keyof typeof formik.values];
                                    if (currentValue === value || String(currentValue) === String(value)) {
                                        formik.setFieldTouched(field, true, false);
                                        formik.validateField(field);
                                    } else {
                                        setTimeout(() => {
                                            formik.setFieldTouched(field, true, false);
                                            formik.validateField(field);
                                        }, 50);
                                    }
                                }, 10);
                            }

                            // For input fields: if field was previously invalid (touched and had error), validate on change
                            const inputFields = ["pinCode", "address", "addressLine1", "addressLine2"];
                            if (inputFields.includes(field)) {
                                const isTouched = formik.touched[field as keyof typeof formik.touched];
                                const hasError = formik.errors[field as keyof typeof formik.errors];

                                if (isTouched && hasError) {
                                    setTimeout(() => {
                                        formik.validateField(field);
                                    }, 0);
                                }
                            }
                        }}
                        onBlur={(field) => {
                            formik.setFieldTouched(field, true, false);
                            formik.validateField(field);
                        }}
                        title="Address Information"
                        iconSrc="/icons/addressicon.svg"
                        iconAlt="Address info"
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
                        errors={getFormErrors()}
                    />

                    <div className="flex justify-end mt-4">
                        <Button
                            type="submit"
                            variant="primary"
                            size="large"
                            isLoading={isUpdating || formik.isSubmitting}
                            disabled={isUpdating || formik.isSubmitting}
                        >
                            Submit
                        </Button>
                    </div>
                </form>

                {/* Success Dialog */}
                <MessageDialog
                    open={showSuccessDialog}
                    onClose={() => {
                        setShowSuccessDialog(false);
                        router.push("/registration/registrationList");
                    }}
                    icon="/icons/SuccessCheck.svg"
                    iconBgColor="#E8F5E9"
                    message={successMessage}
                    confirmText="OK"
                    showCancel={false}
                    onConfirm={() => {
                        setShowSuccessDialog(false);
                        router.push("/registration/registrationList");
                    }}
                />

                {/* Error Dialog */}
                <MessageDialog
                    open={showErrorDialog}
                    onClose={() => {
                        setShowErrorDialog(false);
                    }}
                    icon="/icons/CrossIcon.svg"
                    iconBgColor="#FFEBEE"
                    message={errorMessage}
                    confirmText="OK"
                    showCancel={false}
                    onConfirm={() => {
                        setShowErrorDialog(false);
                    }}
                />
            </div>
        </AppShell>
    );
}


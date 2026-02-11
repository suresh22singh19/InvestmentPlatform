"use client";

import { useRef, useState, useMemo, useEffect } from "react";
import { FormikProps } from "formik";
import { BackToPreviousPageButton, MessageDialog, ThreeDotLoader } from "@/components/ui";
import PaymentDetails from "@/components/registration/PaymentDetails";
import BillingInformation from "@/components/registration/BillingInformation";
import PaymentDialogDetails from "@/components/registration/PaymentDialogDetails";
import ProcessingPaymentDialog from "@/components/registration/ProcessingPaymentDialog";
import { useGetStatesQuery, useGetCitiesQuery, useGetCountriesQuery, useLazyGetTehsilsQuery, useLazyGetAreasQuery } from "@/store/api/publicApi";
import { useGetServicesByBranchAndPaymentModesQuery, useCreateHospitalPatientMutation, useCreateAppointmentAndUpdateRegistrationMutation, useLazyGetRazorpayPosPaymentStatusPollingQuery, useCancelRazorpayPosPaymentMutation, type HospitalPatientRequest, type CreateAppointmentAndUpdateRegistrationRequest, type RazorpayPosMachineUser } from "@/store/api/registrationApi";
import { selectUserId, selectUserBranchId } from "@/store/slices/authSlice";
import { useAppSelector } from "@/store/hooks";
import type { RegistrationPersonalDetailsFormValues } from "@/lib/validation/registrationSchemas";
import type { SelectOption } from "@/components/ui/FormSelectField";

interface PaymentFormProps {
    formik: FormikProps<RegistrationPersonalDetailsFormValues>;
    getFormErrors: () => Record<string, string>;
    onNext: () => void;
    onBack: () => void;
    isHospitalRegistration?: boolean;
    patientToken?: string; // Token from patient entry (opdToken or registerToken)
    patientEntryId?: number | string | null; // Patient entry ID from patient-entries API
    preBookingId?: number | string | null; // Pre-booking ID when pre-booking is selected
    patientUhid?: string; // Patient UHID from existing patient (if available)
    patientRegistrationId?: number | null; // Registration ID from existing patient (if available)
    userLeadId?: number | null; // userLead ID when both registrations and preBookings are empty
}

export default function PaymentForm({
    formik,
    getFormErrors,
    onNext,
    onBack,
    isHospitalRegistration = false,
    patientToken = "",
    patientEntryId = null,
    preBookingId = null,
    patientUhid = "",
    patientRegistrationId = null,
    userLeadId = null,
}: PaymentFormProps) {
    const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Credit payment flow states
    const [showProcessingDialog, setShowProcessingDialog] = useState(false);
    const [showPaymentSuccessDialog, setShowPaymentSuccessDialog] = useState(false);
    const [showPaymentErrorDialog, setShowPaymentErrorDialog] = useState(false);
    const [paymentProcessingSuccess, setPaymentProcessingSuccess] = useState(false);
    const [selectedPosMachineName, setSelectedPosMachineName] = useState<string>("");
    const [paymentResponse, setPaymentResponse] = useState<unknown>(null);
    const [p2pRequestId, setP2pRequestId] = useState<string | null>(null);
    const [razorpayPosPaymentLogId, setRazorpayPosPaymentLogId] = useState<number | string | null>(null);
    const [razorpayPosMachineId, setRazorpayPosMachineId] = useState<number | string | null>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const pollingAttemptsRef = useRef<number>(0);
    const pollingStartTimeRef = useRef<number | null>(null);
    
    // Mutation hook for creating hospital patient
    const [createHospitalPatient, { isLoading: isCreatingPatient }] = useCreateHospitalPatientMutation();
    
    // Mutation hook for creating appointment and updating registration (for existing patients)
    const [createAppointmentAndUpdateRegistration, { isLoading: isUpdatingRegistration }] = useCreateAppointmentAndUpdateRegistrationMutation();
    
    // Query hook for polling payment status
    const [getRazorpayPosPaymentStatusPolling] = useLazyGetRazorpayPosPaymentStatusPollingQuery();
    
    // Mutation hook for canceling payment
    const [cancelRazorpayPosPayment, { isLoading: isCancelingPayment }] = useCancelRazorpayPosPaymentMutation();
    
    // Lazy queries for tehsils and areas - fetch during form submission
    const [getTehsilsQuery] = useLazyGetTehsilsQuery();
    const [getAreasQuery] = useLazyGetAreasQuery();
    
    // Get branchId and userId from auth state
    const branchId = useAppSelector(selectUserBranchId) || 1;
    const userId = useAppSelector(selectUserId) || 1;
    
    // Fetch countries, states and cities data to get names from IDs
    const { data: countriesData } = useGetCountriesQuery();

    const { data: statesData } = useGetStatesQuery(
        formik.values.country
            ? { countryId: formik.values.country }
            : undefined,
        { skip: !formik.values.country }
    );

    const { data: citiesData } = useGetCitiesQuery(
        formik.values.state
            ? { stateId: formik.values.state }
            : undefined,
        { skip: !formik.values.state }
    );

    // Helper function to get country name from ID
    const getCountryName = useMemo(() => {
        if (!countriesData?.data || !formik.values.country) return formik.values.country || 'N/A';
        const country = countriesData.data.find((c: any) => c.id.toString() === formik.values.country);
        return country?.name || formik.values.country || 'N/A';
    }, [countriesData, formik.values.country]);

    // Helper function to get state name from ID
    const getStateName = useMemo(() => {
        if (!statesData?.data || !formik.values.state) return formik.values.state || 'N/A';
        const state = statesData.data.find((s) => s.id.toString() === formik.values.state);
        return state?.name || formik.values.state || 'N/A';
    }, [statesData, formik.values.state]);

    // Helper function to get city name from ID
    const getCityName = useMemo(() => {
        if (!citiesData?.data || !formik.values.city) return formik.values.city || 'N/A';
        const city = citiesData.data.find((c) => c.id.toString() === formik.values.city);
        return city?.name || formik.values.city || 'N/A';
    }, [citiesData, formik.values.city]);

    // Fetch services by branch and payment modes (Consultation Charges) from API
    const { data: servicesData, isLoading: isLoadingPaymentCategories } = useGetServicesByBranchAndPaymentModesQuery(
        {
            branchId: branchId,
            subCategory: "consultancy",
            userId: userId,
        },
        { skip: !branchId || !userId }
    );
    
    // Extract services and POS machine users from response
    const services = servicesData?.data?.services || [];
    const razorpayPosMachineUsers: RazorpayPosMachineUser[] = servicesData?.data?.razorpayPosMachineUsers || [];
    
    // Get serviceId from first service (for payment payload)
    const serviceId = useMemo(() => {
        if (services && services.length > 0) {
            return services[0].id;
        }
        return null;
    }, [services]);

    // Store serviceId in formik when services are loaded (for clinic registration)
    useEffect(() => {
        if (serviceId && formik.values.serviceId !== serviceId) {
            formik.setFieldValue("serviceId", serviceId, false);
        }
    }, [serviceId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Transform services to SelectOption format
    const consultationChargesOptions: SelectOption[] = useMemo(() => {
        if (!services || services.length === 0) {
            // Fallback to default options if API data is not available
            return [
                { value: "300", label: "300" },
                { value: "500", label: "500" },
        
            ];
        }
        return services.map((service) => {
            // Use price as value and label
            const priceValue = service.price?.toString() || service.id?.toString() || "";
            const priceLabel = service.price?.toString() || priceValue;
            return {
                value: priceValue,
                label: priceLabel,
            };
        });
    }, [services]);

    // Fetch billing states and cities data
    // Use same country as Personal Info (Address) for billing states
    const billingCountryId = formik.values.country && formik.values.country.trim() !== "" ? formik.values.country : "6";
    const { data: billingStatesData } = useGetStatesQuery(
        { countryId: billingCountryId },
        { skip: !billingCountryId }
    );

    const { data: billingCitiesData } = useGetCitiesQuery(
        formik.values.billingState
            ? { stateId: formik.values.billingState }
            : undefined,
        { skip: !formik.values.billingState }
    );

    // Helper function to get billing state name from ID
    const getBillingStateName = useMemo(() => {
        if (!billingStatesData?.data || !formik.values.billingState) return 'N/A';
        const state = billingStatesData.data.find((s) => s.id.toString() === formik.values.billingState);
        return state?.name || 'N/A';
    }, [billingStatesData, formik.values.billingState]);

    // Helper function to get billing city name from ID
    const getBillingCityName = useMemo(() => {
        if (!billingCitiesData?.data || !formik.values.billingCity) return 'N/A';
        const city = billingCitiesData.data.find((c) => c.id.toString() === formik.values.billingCity);
        return city?.name || 'N/A';
    }, [billingCitiesData, formik.values.billingCity]);

    // Payment Details field refs
    const consultationChargesRef = useRef<HTMLDivElement>(null);
    const paymentModeRef = useRef<HTMLDivElement>(null);
    const transactionIdRef = useRef<HTMLInputElement>(null);

    // Billing Information field refs
    const gstNumberRef = useRef<HTMLInputElement>(null);
    const companyNameRef = useRef<HTMLInputElement>(null);
    const billingAddressRef = useRef<HTMLInputElement>(null);
    const billingStateRef = useRef<HTMLDivElement>(null);
    const billingCityRef = useRef<HTMLDivElement>(null);
    const billingPincodeRef = useRef<HTMLInputElement>(null);

    const handleSubmit = async () => {
        const consultationChargesAmount = parseFloat(formik.values.consultationCharges || '0') || 0;
        const requiresPaymentMode = consultationChargesAmount > 0;

        // Define fields for Step 2 (Payment) - only require paymentMode when charges > 0
        const step2Fields = requiresPaymentMode ? ['consultationCharges', 'paymentMode'] : ['consultationCharges'];
        
        // Mark step 2 fields as touched
        step2Fields.forEach(field => {
            formik.setFieldTouched(field, true, false);
        });
        
        // Validate only step 2 fields
        const errors = await formik.validateForm();
        const step2Errors: Record<string, string> = {};
        
        step2Fields.forEach(field => {
            const error = errors[field as keyof typeof errors];
            if (error && typeof error === 'string') {
                step2Errors[field] = error;
            }
        });
        
        // Check conditional fields - for Credit payment, transaction ID will be set after payment processing
        // Skip this validation if processing is successful or when charges are 0
        if (
            requiresPaymentMode &&
            formik.values.paymentMode?.toLowerCase() === 'credit' && 
            !formik.values.transactionId && 
            !paymentProcessingSuccess
        ) {
            step2Errors.transactionId = 'Transaction ID is required for digital payment';
            formik.setFieldTouched('transactionId', true, false);
        }
        
        if (formik.values.gstBilling) {
            const billingFields = ['gstNumber', 'companyName', 'billingAddress', 'billingState', 'billingCity', 'billingPincode'];
            billingFields.forEach(field => {
                formik.setFieldTouched(field, true, false);
                const error = errors[field as keyof typeof errors];
                if (error && typeof error === 'string') {
                    step2Errors[field] = error;
                }
            });
        }
        
        if (Object.keys(step2Errors).length > 0) {
            formik.setErrors({ ...formik.errors, ...step2Errors });
            // Scroll to first error
            const firstErrorKey = Object.keys(step2Errors)[0];
            const element = document.querySelector(`[data-field="${firstErrorKey}"]`);
            if (element instanceof HTMLElement) {
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
            return;
        }
        
        // Open invoice dialog instead of directly going to next step
        setIsInvoiceDialogOpen(true);
    };

    // Format date and time
    const formatDateTime = () => {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = now.toLocaleString('en-US', { month: 'short' });
        const year = now.getFullYear();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
        const displayHours = now.getHours() % 12 || 12;
        return `${day}-${month}-${year} ${displayHours}:${minutes} ${ampm}`;
    };

    // Get patient name with title
    const getPatientName = () => {
        const title = formik.values.patientNameSelect || '';
        const name = formik.values.patientName || '';
        return title && name ? `${title} ${name}` : name || 'N/A';
    };

    // Calculate amounts
    const consultationCharges = parseFloat(formik.values.consultationCharges || '0') || 0;
    const subtotal = consultationCharges;
    // Calculate tax only when GST billing is enabled (18% GST in India)
    const tax = formik.values.gstBilling ? Math.round((subtotal * 0.18) * 100) / 100 : 0;
    const totalAmount = subtotal + tax;

    // Format currency
    const formatCurrency = (amount: number) => {
        return `₹${amount.toLocaleString('en-IN')}`;
    };

    // Helper function to map formik values to API payload
    // Note: This function ensures all values are serializable to prevent Redux Toolkit error #38
    // Error #38 occurs when non-serializable values (like functions, class instances, or invalid types) are stored in Redux
    const mapFormikToApiPayload = async (): Promise<HospitalPatientRequest> => {
        const values = formik.values;
        
        // Get country, state and city names from IDs - ensure they're not 'N/A' (which could cause serialization issues)
        const countryName = getCountryName === 'N/A' ? "" : getCountryName;
        const stateName = getStateName === 'N/A' ? "" : getStateName;
        const cityName = getCityName === 'N/A' ? "" : getCityName;
        const billingStateName = getBillingStateName === 'N/A' ? "" : getBillingStateName;
        const billingCityName = getBillingCityName === 'N/A' ? "" : getBillingCityName;
        
        // Fetch tehsil and area names if IDs are present
        let tehsilName: string | undefined = undefined;
        let areaName: string | undefined = undefined;
        
        const tehsilId = (values as any).tehsil;
        const areaId = (values as any).area;
        
        if (tehsilId && values.city) {
            try {
                const result = await getTehsilsQuery({ districtId: values.city }).unwrap();
                const tehsil = result?.data?.find((t: any) => t.id.toString() === tehsilId);
                tehsilName = tehsil?.name;
            } catch (error) {
                console.error("Error fetching tehsil name:", error);
            }
        }
        
        if (areaId && tehsilId) {
            // Always set areaId from the selected area ID (this is the numeric ID from areas API response)
            // areaId contains the area ID (e.g., 332662) from the areas API
            // Fetch area name for the payload
            try {
                const result = await getAreasQuery({ tehsilId: tehsilId }).unwrap();
                const area = result?.data?.find((a: any) => a.id.toString() === areaId);
                areaName = area?.name;
            } catch (error) {
                console.error("Error fetching area name, but areaId is still set:", error);
                // Even if area name fetch fails, areaId is still set below
                areaName = areaId; // Fallback to ID if name fetch fails
            }
        }
        
        // Determine referral source info based on source type
        let referralSourceInfo = "";
        if (values.referral?.toLowerCase() === "yes" && values.source) {
            if (values.source === "tv" && values.tvSpecificField) {
                referralSourceInfo = values.tvSpecificField;
            } else if (values.source === "newspaper" && values.newspaperSpecificField) {
                referralSourceInfo = values.newspaperSpecificField;
            } else if (values.source === "social-media" && values.socialMediaSpecificField) {
                referralSourceInfo = values.socialMediaSpecificField;
            } else if (values.source === "doctor" && values.doctorSpecificField) {
                referralSourceInfo = values.doctorSpecificField;
            } else if (values.source === "other" && values.referralName) {
                referralSourceInfo = values.referralName;
            }
        }
        
        // Convert doctor ID to number if it exists, otherwise use empty string
        const doctorUserId = values.doctor ? (typeof values.doctor === 'string' ? parseInt(values.doctor, 10) || values.doctor : values.doctor) : "";
        
        // Build the API payload - ensure all values are serializable
        // patientEntryId: from token panel (patient-entries API response id) - backend uses it to remove/update that entry after registration
        // userLeadId: when entry came from userLead (both registrations and preBookings empty)
        const payload: HospitalPatientRequest = {
            branchId: 1,
            patientEntryId: patientEntryId != null && patientEntryId !== '' ? (typeof patientEntryId === 'string' ? parseInt(patientEntryId, 10) || patientEntryId : patientEntryId) : undefined,
            patientTitle: values.patientNameSelect || "",
            patientName: values.patientName || "",
            contactNumber: values.contactNumber || "",
            whatsappNo: values.whatsappNo || values.contactNumber || "",
            aadharCardNo: values.aadharCardNumber || undefined,
            guardianTitle: values.fathersHusbandsNameSelect || "",
            guardianName: values.fathersHusbandsName || "",
            gender: values.gender || "",
            age: values.age || "",
            religion: values.religion || "",
            specificReligion: values.specificReligion || undefined,
            occupation: values.occupation || "",
            emailAddress: values.emailAddress || "",
            jsHealthCardNo: values.jsHealthCardNo || undefined,
            ayushCovered: values.ayushCovered || undefined,
            panelId: values.panelId ? parseInt(values.panelId, 10) : undefined,
            patientSubType: values.patientSubType ? values.patientSubType : null,
            benificiaryId: values.benificiaryId || undefined,
            insuranceCompany: values.insuranceCompany || undefined,
            isReferral: values.referral?.toLowerCase() === "yes" ? "yes" : undefined,
            referralSourceInfo: referralSourceInfo || undefined,
            referralUserId: values.doctorSpecificField || undefined,
            referralName: values.referralName || undefined,
            referralMobile: values.referralMobile || undefined,
            maritalStatus: values.maritalStatus || "",
            patientType: values.patientType ? values.patientType.toUpperCase() : undefined,
            doctorUserId: doctorUserId,
            // Add userLeadId if provided (when both registrations and preBookings are empty)
            ...(userLeadId !== null && userLeadId !== undefined ? { userLeadId: userLeadId } : {}),
            address: {
                address: values.address || "",
                city: cityName || "",
                state: stateName || "",
                country: countryName || "",
                pinCode: values.pinCode || "",
                tehsil: tehsilName,
                area: areaName,
                areaId: areaId ? areaId : undefined, // Add areaId from the selected area ID (numeric ID from areas API)
                addressLine1: (values as any).addressLine1 || undefined,
                addressLine2: (values as any).addressLine2 || undefined,
            },
            payment: {
                doctorFee: parseFloat(values.consultationCharges || "0") || 0,
                paymentMode: values.paymentMode?.toLowerCase() === "credit" ? "razorpay" : (values.paymentMode?.toLowerCase() === "cash" ? "cash" : (values.paymentMode || "").toLowerCase()),
                transactionId: values.transactionId || undefined,
                serviceId: values.paymentMode?.toLowerCase() === "credit" && serviceId ? (typeof serviceId === 'number' ? serviceId : parseInt(String(serviceId), 10)) : undefined,
                razorpayPosPaymentLogId: values.paymentMode?.toLowerCase() === "credit" && razorpayPosPaymentLogId ? (typeof razorpayPosPaymentLogId === 'number' ? razorpayPosPaymentLogId : parseInt(String(razorpayPosPaymentLogId), 10)) : undefined,
                gstNumber: values.gstBilling ? (values.gstNumber || undefined) : undefined,
                companyName: values.gstBilling ? (values.companyName || undefined) : undefined,
                billingAddress: values.gstBilling ? (values.billingAddress || undefined) : undefined,
                state: values.gstBilling ? (getBillingStateName === 'N/A' ? undefined : getBillingStateName || undefined) : undefined,
                city: values.gstBilling ? (getBillingCityName === 'N/A' ? undefined : getBillingCityName || undefined) : undefined,
                pincode: values.gstBilling ? (values.billingPincode ? parseInt(values.billingPincode, 10) : undefined) : undefined,
            },
            appointment: {
                token: patientToken || undefined,
                appointmentDate: values.appointmentDate || "",
                timeSlot: values.timeSlot || "",
                doctorUserId: doctorUserId,
                isPreBooking: false,
                preBookingId: preBookingId ? (typeof preBookingId === 'number' ? preBookingId : parseInt(String(preBookingId), 10)) : null,
            },
        };
        
        return payload;
    };

    // Map formik values to CreateAppointmentAndUpdateRegistration API payload
    const mapFormikToCreateAppointmentPayload = async (): Promise<CreateAppointmentAndUpdateRegistrationRequest> => {
        const values = formik.values;
        
        // Get city, state, country names from IDs
        const cityName = citiesData?.data?.find((c: any) => c.id.toString() === values.city)?.name || values.city || "";
        const stateName = statesData?.data?.find((s: any) => s.id.toString() === values.state)?.name || values.state || "";
        const countryName = countriesData?.data?.find((c: any) => c.id.toString() === values.country)?.name || values.country || "";
        
        // Get tehsil and area names if IDs are available
        let tehsilName: string | undefined = undefined;
        let areaName: string | undefined = undefined;
        
        if (values.tehsil && values.city) {
            try {
                const tehsilsResult = await getTehsilsQuery({ districtId: values.city });
                if (tehsilsResult.data?.success && tehsilsResult.data?.data) {
                    const tehsil = tehsilsResult.data.data.find((t: any) => t.id.toString() === values.tehsil);
                    tehsilName = tehsil?.name;
                    
                    if (tehsilName && values.area) {
                        // Always set areaId from the selected area ID (this is the numeric ID from areas API response)
                        // values.area contains the area ID (e.g., 332662) from the areas API
                        // Fetch area name for the payload
                        try {
                            const areasResult = await getAreasQuery({ tehsilId: values.tehsil });
                            if (areasResult.data?.success && areasResult.data?.data) {
                                const area = areasResult.data.data.find((a: any) => a.id.toString() === values.area);
                                areaName = area?.name;
                            }
                        } catch (error) {
                            console.error("Error fetching area name, but areaId is still set:", error);
                            // Even if area name fetch fails, areaId is still set below
                            areaName = values.area; // Fallback to ID if name fetch fails
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching tehsil/area name:", error);
            }
        }
        
        // Determine referral source info based on source type
        let referralSourceInfo = "";
        if (values.referral?.toLowerCase() === "yes" && values.source) {
            if (values.source === "tv" && values.tvSpecificField) {
                referralSourceInfo = values.tvSpecificField;
            } else if (values.source === "newspaper" && values.newspaperSpecificField) {
                referralSourceInfo = values.newspaperSpecificField;
            } else if (values.source === "social-media" && values.socialMediaSpecificField) {
                referralSourceInfo = values.socialMediaSpecificField;
            } else if (values.source === "doctor" && values.doctorSpecificField) {
                referralSourceInfo = values.doctorSpecificField;
            } else if (values.source === "other" && values.referralName) {
                referralSourceInfo = values.referralName;
            }
        }
        
        // Convert doctor ID to number
        const doctorUserId = values.doctor ? (typeof values.doctor === 'string' ? parseInt(values.doctor, 10) : values.doctor) : 0;
        
        // Build the API payload for CreateAppointmentAndUpdateRegistration
        const payload: CreateAppointmentAndUpdateRegistrationRequest = {
            branchId: branchId || 1,
            // Only send patientEntryId when we have it (token selection).
            // For "Already Exist Patient" dialog (revisit), patientEntryId will be null and this field will be omitted.
            patientEntryId: patientEntryId ? (typeof patientEntryId === 'number' ? patientEntryId : parseInt(String(patientEntryId), 10)) : undefined,
            registrationId: patientRegistrationId || 0,
            uhid: patientUhid || "",
            facilityType: "hospital",
            registration: {
                patientTitle: values.patientNameSelect || "",
                patientName: values.patientName || "",
                contactNumber: values.contactNumber || "",
                whatsappNo: values.whatsappNo || values.contactNumber || "",
                aadharCardNo: values.aadharCardNumber || undefined,
                guardianTitle: values.fathersHusbandsNameSelect || "",
                guardianName: values.fathersHusbandsName || "",
                gender: values.gender || "",
                age: values.age || "",
                religion: values.religion || "",
                specificRelegion: values.specificReligion || undefined,
                occupation: values.occupation || "",
                emailAddress: values.emailAddress || undefined,
                jsHealthCardNo: values.jsHealthCardNo || undefined,
                ayushCovered: values.ayushCovered || undefined,
                benificiaryId: values.benificiaryId || undefined,
                insuranceCompany: values.insuranceCompany || undefined,
                isReferral: values.referral?.toLowerCase() === "yes" ? values.referral : undefined,
                referralSourceInfo: referralSourceInfo || undefined,
                referralUserId: values.doctorSpecificField ? parseInt(values.doctorSpecificField, 10) : undefined,
                referralName: values.referralName || undefined,
                referralMobile: values.referralMobile || undefined,
                maritalStatus: values.maritalStatus || "",
                doctorUserId: doctorUserId,
                patientType: (values.patientType || "").toLowerCase(),
                addictionSpecify: undefined,
                addictionType: undefined,
            },
            address: {
                address: values.address || "",
                city: cityName || "",
                state: stateName || "",
                country: countryName || "",
                pinCode: values.pinCode || "",
                tehsil: tehsilName,
                area: areaName,
                areaId: values.area ? values.area : undefined, // Add areaId from the selected area ID (numeric ID from areas API)
                addressLine1: (values as any).addressLine1 || undefined,
                addressLine2: (values as any).addressLine2 || undefined,
            },
            appointment: {
                isPreBooking: !!preBookingId,
                preBookingId: preBookingId ? (typeof preBookingId === 'number' ? preBookingId : parseInt(String(preBookingId), 10)) : undefined,
                appointmentDate: values.appointmentDate || "",
                timeSlot: values.timeSlot || "",
                doctorUserId: doctorUserId,
                bloodPressure: undefined,
                sugarLevel: undefined,
                temperature: undefined,
                spo2: undefined,
                pulse: undefined,
                diagnosisId: undefined,
                diagnosisSymptoms: undefined,
                doctorFee: values.consultationCharges || undefined,
                subDiagnosisId: undefined,
                isDoctorChecked: false,
                isDiabetes: false,
                diabetesRemarks: undefined,
                isHypertension: false,
                hypertensionRemarks: undefined,
                isCad: false,
                cadRemarks: undefined,
                isThyroid: false,
                thyroidRemarks: undefined,
                isMenstrual: false,
                menstrualRemarks: undefined,
                isPreBooked: !!preBookingId,
                token: patientToken || undefined,
            },
            payment: {
                doctorFee: parseFloat(values.consultationCharges || "0") || 0,
                serviceId: values.paymentMode?.toLowerCase() === "credit" && serviceId ? (typeof serviceId === 'number' ? serviceId : parseInt(String(serviceId), 10)) : undefined,
                paymentMode: values.paymentMode?.toLowerCase() === "credit" ? "razorpay" : (values.paymentMode?.toLowerCase() === "cash" ? "cash" : (values.paymentMode || "").toLowerCase()),
                razorpayPosPaymentLogId: values.paymentMode?.toLowerCase() === "credit" && razorpayPosPaymentLogId ? (typeof razorpayPosPaymentLogId === 'number' ? razorpayPosPaymentLogId : parseInt(String(razorpayPosPaymentLogId), 10)) : undefined,
                transactionId: values.transactionId || undefined,
                companyName: values.gstBilling ? (values.companyName || undefined) : undefined,
                billingAddress: values.gstBilling ? (values.billingAddress || undefined) : undefined,
                state: values.gstBilling ? (getBillingStateName === 'N/A' ? undefined : getBillingStateName || undefined) : undefined,
                city: values.gstBilling ? (getBillingCityName === 'N/A' ? undefined : getBillingCityName || undefined) : undefined,
                pincode: values.gstBilling ? (values.billingPincode ? parseInt(values.billingPincode, 10) : undefined) : undefined,
            },
        };
        
        return payload;
    };

    // Handle dialog actions
    const handlePrintInvoice = () => {
        window.print();
    };

    const handleSaveAndNext = async () => {
        if (isHospitalRegistration) {
            // For Hospital registration, check if patient already exists (has UHID)
            setIsSubmitting(true);
            try {
                let result;
                
                // If patient already exists (has UHID and registrationId), use the new API
                if (patientUhid && patientRegistrationId) {
                    const payload = await mapFormikToCreateAppointmentPayload();
                    // Console log API payload before hitting API
                    console.log("CreateAppointmentAndUpdateRegistration API Payload Data:", JSON.stringify(payload, null, 2));
                    result = await createAppointmentAndUpdateRegistration(payload).unwrap();
                } else {
                    // New patient registration - use the regular API
                    const payload = await mapFormikToApiPayload();
                    // Console log API payload before hitting API
                    console.log("API Payload Data:", JSON.stringify(payload, null, 2));
                    result = await createHospitalPatient(payload).unwrap();
                }
                
                // Close invoice dialog
                setIsInvoiceDialogOpen(false);
                
                // If successful, call onNext which will show success dialog in parent
                if (result.success) {
                    onNext();
                } else {
                    setErrorMessage(result.message || "Registration failed. Please try again.");
                    setShowErrorDialog(true);
                }
            } catch (error: any) {
                // Close invoice dialog
                setIsInvoiceDialogOpen(false);
                
                // Log the full error for debugging
                console.error("Registration error:", error);
                
                // Show error message
                let errorMsg = "An error occurred during registration. Please try again.";
                if (error?.data?.message) {
                    errorMsg = error.data.message;
                } else if (error?.message) {
                    errorMsg = error.message;
                } else if (typeof error === 'string') {
                    errorMsg = error;
                }
                
                setErrorMessage(errorMsg);
                setShowErrorDialog(true);
            } finally {
                setIsSubmitting(false);
            }
        } else {
            // For Clinics, onNext will go to next step (Vitals)
            setIsInvoiceDialogOpen(false);
            onNext();
        }
    };

    const handleDownloadInvoice = () => {
        // You can implement download logic here
        console.log('Download invoice');
    };
    
    const handleErrorDialogClose = () => {
        setShowErrorDialog(false);
        setErrorMessage("");
    };

    // Handle Credit payment selection - show processing dialog
    const handleCreditSelected = (posMachineName: string, posMachineId?: string) => {
        setSelectedPosMachineName(posMachineName);
        if (posMachineId) {
            setRazorpayPosMachineId(posMachineId);
        }
        setShowProcessingDialog(true);
        
        // TODO: Make API call to initiate payment request with selected POS machine
        // Example:
        // const paymentRequest = await sendPaymentRequest({
        //     posMachineId: selectedPosMachine,
        //     amount: formik.values.consultationCharges,
        //     patientId: patientEntryId,
        //     // ... other payment details
        // });
        // 
        // Then poll for payment status or listen to webhook:
        // - If payment succeeds: call handlePaymentSuccess()
        // - If payment fails: call handlePaymentTimeout() or handlePaymentError()
        // 
        // The ProcessingPaymentDialog will auto-timeout after 2 minutes if no response
    };

    // Handle payment processing success
    const handlePaymentSuccess = (pollingResponse?: unknown) => {
        // Clear polling
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
        pollingAttemptsRef.current = 0;
        pollingStartTimeRef.current = null;
        
        setShowProcessingDialog(false);
        setPaymentProcessingSuccess(true);
        
        // Extract transaction ID from polling response if available
        // Response structure: { success: true, data: { rawResponse: { txnId: "..." } } }
        if (pollingResponse && typeof pollingResponse === 'object' && 'data' in pollingResponse) {
            const responseData = pollingResponse as { 
                data?: { 
                    rawResponse?: { txnId?: string; [key: string]: unknown };
                    transactionId?: string;
                    [key: string]: unknown;
                };
                [key: string]: unknown;
            };
            
            // Try to get txnId from rawResponse first (actual API response structure)
            const txnId = responseData.data?.rawResponse?.txnId || responseData.data?.transactionId;
            
            if (txnId && typeof txnId === 'string') {
                // Limit to 30 characters as per requirement (25-30 characters max)
                const truncatedTxnId = txnId.slice(0, 30);
                formik.setFieldValue("transactionId", truncatedTxnId, false);
            } else {
                // Generate a mock transaction ID if not available in response
                const mockTransactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
                formik.setFieldValue("transactionId", mockTransactionId, false);
            }
        } else {
            // Generate a mock transaction ID if no response provided
            const mockTransactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
            formik.setFieldValue("transactionId", mockTransactionId, false);
        }
        
        setSelectedPosMachineName(""); // Clear selected POS machine name after success
        setP2pRequestId(null); // Clear p2pRequestId
        // Note: Don't clear razorpayPosPaymentLogId here - it's needed for the API payload
        // Note: Don't clear razorpayPosMachineId here - it's needed for cancel API
        setShowPaymentSuccessDialog(true);
    };

    // Polling function for payment status - no timeout, continues polling every 2:30 seconds
    // If abstractPaymentStatus is "PROCESSING", calls immediately again until SUCCESS or FAILED
    const startPaymentStatusPolling = async (requestId: string) => {
        const pollingInterval = 150000; // 2.5 minutes (150 seconds = 150000ms) - time between polling requests when not PROCESSING
        const processingPollInterval = 1000; // 1 second delay when status is PROCESSING (to avoid too rapid calls)
        
        // Clear any existing polling
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
        
        pollingAttemptsRef.current = 0;
        pollingStartTimeRef.current = Date.now();
        
        // Track if we're in rapid polling mode (PROCESSING status)
        let isProcessingMode = false;
        let processingTimeoutRef: NodeJS.Timeout | null = null;

        const poll = async () => {
            // Check if polling was manually stopped (e.g., by cancel)
            if (!pollingIntervalRef.current && pollingAttemptsRef.current > 0 && !isProcessingMode) {
                console.log("Polling was stopped, not making another request.");
                return;
            }
            
            try {
                pollingAttemptsRef.current += 1;
                const timeSinceStart = pollingStartTimeRef.current 
                    ? Math.floor((Date.now() - pollingStartTimeRef.current) / 1000) 
                    : 0;
                console.log(`Polling attempt ${pollingAttemptsRef.current} for payment status (${timeSinceStart}s elapsed)...`);
                
                const result = await getRazorpayPosPaymentStatusPolling({
                    p2pRequestId: requestId,
                }).unwrap();

                // Check payment status - stop polling on SUCCESS, FAILED, or CANCELED
                // API response structure: { success: true, data: { status: "AUTHORIZED", isSuccessful: true, ... } }
                const responseData = result.data as any;
                const paymentStatus = responseData?.status || responseData?.paymentStatus;
                const isSuccessful = responseData?.isSuccessful;
                const abstractPaymentStatus = responseData?.rawResponse?.abstractPaymentStatus;
                const messageCode = responseData?.rawResponse?.messageCode;
                const message = responseData?.rawResponse?.message || responseData?.message;
                const pollingTimeout = responseData?.pollingTimeout;
                
                console.log("Payment polling response:", {
                    resultSuccess: result.success,
                    paymentStatus,
                    isSuccessful,
                    abstractPaymentStatus,
                    messageCode,
                    message,
                    pollingTimeout,
                });
                
                // Check if status is PROCESSING
                const isProcessing = abstractPaymentStatus?.toUpperCase() === "PROCESSING";
                
                // Check for success conditions:
                // 1. Top-level success flag
                // 2. Status is AUTHORIZED (case-insensitive)
                // 3. isSuccessful is true
                // 4. abstractPaymentStatus is SUCCESS
                const isSuccess = result.success && (
                    paymentStatus?.toUpperCase() === "AUTHORIZED" ||
                    paymentStatus?.toUpperCase() === "SUCCESS" ||
                    paymentStatus?.toLowerCase() === "completed" ||
                    isSuccessful === true ||
                    abstractPaymentStatus?.toUpperCase() === "SUCCESS"
                );
                
                // Check for canceled conditions
                const isCanceled = messageCode === "P2P_DEVICE_CANCELED" ||
                                  message?.toLowerCase().includes("canceled") ||
                                  message?.toLowerCase().includes("cancelled");
                
                // Check for polling timeout (server-side timeout) - but continue polling
                const isPollingTimeout = pollingTimeout === true ||
                                       message?.toLowerCase().includes("polling timeout") ||
                                       message?.toLowerCase().includes("payment status unknown");
                
                // Check for failed conditions (excluding canceled and timeout)
                const isFailed = !isCanceled && !isPollingTimeout && (
                    paymentStatus?.toUpperCase() === "FAILED" || 
                    paymentStatus?.toUpperCase() === "REJECTED" ||
                    paymentStatus?.toLowerCase() === "failed" ||
                    paymentStatus?.toLowerCase() === "rejected" ||
                    abstractPaymentStatus?.toUpperCase() === "FAILED" ||
                    (isSuccessful === false && paymentStatus && !isPollingTimeout)
                );
                
                console.log("Payment status check:", { isSuccess, isFailed, isCanceled, isPollingTimeout, isProcessing });

                if (isSuccess) {
                    // Payment successful - stop polling and handle success
                    isProcessingMode = false;
                    if (processingTimeoutRef) {
                        clearTimeout(processingTimeoutRef);
                        processingTimeoutRef = null;
                    }
                    if (pollingIntervalRef.current) {
                        clearInterval(pollingIntervalRef.current);
                        pollingIntervalRef.current = null;
                    }
                    handlePaymentSuccess(result);
                } else if (isFailed) {
                    // Payment failed - stop polling and handle error
                    isProcessingMode = false;
                    if (processingTimeoutRef) {
                        clearTimeout(processingTimeoutRef);
                        processingTimeoutRef = null;
                    }
                    if (pollingIntervalRef.current) {
                        clearInterval(pollingIntervalRef.current);
                        pollingIntervalRef.current = null;
                    }
                    handlePaymentTimeout("Payment failed");
                } else if (isCanceled) {
                    // Payment canceled - stop polling and handle cancel
                    isProcessingMode = false;
                    if (processingTimeoutRef) {
                        clearTimeout(processingTimeoutRef);
                        processingTimeoutRef = null;
                    }
                    if (pollingIntervalRef.current) {
                        clearInterval(pollingIntervalRef.current);
                        pollingIntervalRef.current = null;
                    }
                    handlePaymentCanceled(message || "Payment was canceled on the device.");
                } else if (isProcessing) {
                    // Status is PROCESSING - call API again immediately (with small delay to avoid too rapid calls)
                    isProcessingMode = true;
                    console.log(`Payment status is PROCESSING (attempt ${pollingAttemptsRef.current}), calling API again immediately...`);
                    
                    // Clear any existing processing timeout
                    if (processingTimeoutRef) {
                        clearTimeout(processingTimeoutRef);
                    }
                    
                    // Call poll() again after a short delay (1 second) to avoid too rapid API calls
                    processingTimeoutRef = setTimeout(() => {
                        if (isProcessingMode && pollingIntervalRef.current) {
                            poll();
                        }
                    }, processingPollInterval);
                } else if (isPollingTimeout) {
                    // Server-side polling timeout - continue polling (make another request)
                    isProcessingMode = false;
                    if (processingTimeoutRef) {
                        clearTimeout(processingTimeoutRef);
                        processingTimeoutRef = null;
                    }
                    console.log("Server-side polling timeout, will continue polling in 2:30 minutes...");
                    // Don't stop polling, just wait for next interval
                    // The interval will automatically call poll() again after 2:30 minutes
                } else {
                    // Status is still pending (but not PROCESSING) - continue polling with normal interval
                    isProcessingMode = false;
                    if (processingTimeoutRef) {
                        clearTimeout(processingTimeoutRef);
                        processingTimeoutRef = null;
                    }
                    console.log(`Payment status still pending (attempt ${pollingAttemptsRef.current}), will continue polling in 2:30 minutes...`);
                    // Don't stop polling, just wait for next interval
                    // The interval will automatically call poll() again after 2:30 minutes
                }
            } catch (error) {
                console.error(`Error polling payment status (attempt ${pollingAttemptsRef.current}):`, error);
                
                // If in processing mode, retry immediately after error
                if (isProcessingMode) {
                    console.log("Error in PROCESSING mode, will retry immediately...");
                    if (processingTimeoutRef) {
                        clearTimeout(processingTimeoutRef);
                    }
                    processingTimeoutRef = setTimeout(() => {
                        if (isProcessingMode && pollingIntervalRef.current) {
                            poll();
                        }
                    }, processingPollInterval);
                } else {
                    // Continue polling on error - will retry in next interval (2:30 minutes)
                    // Don't stop polling unless manually canceled or interval is cleared
                    if (pollingIntervalRef.current) {
                        console.log("Will retry polling in 2:30 minutes...");
                    } else {
                        console.log("Polling interval was cleared, stopping retries.");
                    }
                }
            }
        };

        // Start polling immediately, then every 2:30 minutes (150 seconds = 150000ms)
        // Call poll() immediately for the first request
        poll();
        
        // Set up interval to call poll() every 2:30 minutes
        // This will continue calling poll() every 150000ms until payment status is received
        // Note: If status is PROCESSING, poll() will call itself immediately, so this interval
        // acts as a fallback for other pending states
        pollingIntervalRef.current = setInterval(() => {
            // Only poll if interval still exists (hasn't been cleared) and not in processing mode
            // (processing mode handles its own rapid polling)
            if (pollingIntervalRef.current && !isProcessingMode) {
                poll();
            }
        }, pollingInterval);
        
        console.log(`Polling started. Will call API every ${pollingInterval / 1000} seconds (${pollingInterval / 60000} minutes) until payment status is received. If status is PROCESSING, will poll immediately.`);
    };

    // Start polling when p2pRequestId is set and processing dialog is open
    useEffect(() => {
        if (p2pRequestId && showProcessingDialog && !pollingIntervalRef.current) {
            console.log("Starting payment status polling for p2pRequestId:", p2pRequestId);
            startPaymentStatusPolling(p2pRequestId);
        }

        // Cleanup on unmount or when dialog closes
        return () => {
            if (pollingIntervalRef.current) {
                console.log("Cleaning up polling interval...");
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
            pollingAttemptsRef.current = 0;
            pollingStartTimeRef.current = null;
        };
    }, [p2pRequestId, showProcessingDialog]);

    // Handle payment processing failure
    const handlePaymentTimeout = (timeoutMessage?: string) => {
        // Clear polling
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
        pollingAttemptsRef.current = 0;
        pollingStartTimeRef.current = null;
        
        setShowProcessingDialog(false);
        setPaymentProcessingSuccess(false);
        setSelectedPosMachineName(""); // Clear selected POS machine name
        setP2pRequestId(null); // Clear p2pRequestId
        setRazorpayPosPaymentLogId(null); // Clear razorpayPosPaymentLogId
        setRazorpayPosMachineId(null); // Clear razorpayPosMachineId
        // Empty payment mode field and go back to payment step
        formik.setFieldValue("paymentMode", "", false);
        formik.setFieldValue("transactionId", "", false);
        
        // Set error message (use provided message or default)
        setErrorMessage(timeoutMessage || "Payment failed");
        setShowPaymentErrorDialog(true);
    };

    // Track if cancel was manually initiated to prevent duplicate dialogs
    const isManualCancelRef = useRef(false);
    
    // Handle cancel success from ProcessingPaymentDialog - stops polling
    const handleCancelSuccess = () => {
        // Mark as manual cancel to prevent polling from showing another dialog
        isManualCancelRef.current = true;
        
        // Stop polling immediately
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
        pollingAttemptsRef.current = 0;
        pollingStartTimeRef.current = null;
    };
    
    // Handle payment canceled (from polling)
    const handlePaymentCanceled = (cancelMessage?: string) => {
        // If cancel was manually initiated, don't show another dialog
        if (isManualCancelRef.current) {
            isManualCancelRef.current = false; // Reset flag
            return;
        }
        
        // Clear polling
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
        pollingAttemptsRef.current = 0;
        pollingStartTimeRef.current = null;
        
        setShowProcessingDialog(false);
        setPaymentProcessingSuccess(false);
        setSelectedPosMachineName(""); // Clear selected POS machine name
        setP2pRequestId(null); // Clear p2pRequestId
        setRazorpayPosPaymentLogId(null); // Clear razorpayPosPaymentLogId
        setRazorpayPosMachineId(null); // Clear razorpayPosMachineId
        // Empty payment mode field and go back to payment step
        formik.setFieldValue("paymentMode", "", false);
        formik.setFieldValue("transactionId", "", false);
        
        // Set canceled message
        setErrorMessage(cancelMessage || "Payment was canceled on the device.");
        setShowPaymentErrorDialog(true);
    };

    // Handle processing dialog close (cancel)
    const handleProcessingDialogClose = () => {
        // Reset manual cancel flag
        isManualCancelRef.current = false;
        
        // Clear polling
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
        pollingAttemptsRef.current = 0;
        pollingStartTimeRef.current = null;
        
        setShowProcessingDialog(false);
        setPaymentProcessingSuccess(false);
        setSelectedPosMachineName(""); // Clear selected POS machine name
        setP2pRequestId(null); // Clear p2pRequestId
        setRazorpayPosMachineId(null); // Clear razorpayPosMachineId
        // Empty payment mode field when user cancels
        formik.setFieldValue("paymentMode", "", false);
        formik.setFieldValue("transactionId", "", false);
    };

    // Handle payment success dialog close - move to next step
    const handlePaymentSuccessDialogClose = () => {
        setShowPaymentSuccessDialog(false);
        // For Credit payment, after success, proceed to next step
        if (isHospitalRegistration) {
            // For hospital, open invoice dialog
            setIsInvoiceDialogOpen(true);
        } else {
            // For clinic, go to next step
            onNext();
        }
    };

    // Handle payment error dialog close
    const handlePaymentErrorDialogClose = () => {
        setShowPaymentErrorDialog(false);
        setErrorMessage(""); // Clear error message when dialog closes
        // Stay on payment step, payment mode is already cleared
    };

    return (
        <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] p-5 mb-4">
            <h3 className="font-inter font-semibold text-[24px] leading-[120%] text-[#262D3B] mb-4">Payment Information</h3>
            
            {/* Payment Details Component */}
            <PaymentDetails
                formData={{
                    consultationCharges: formik.values.consultationCharges || "",
                    paymentMode: formik.values.paymentMode || "",
                    transactionId: formik.values.transactionId || "",
                    gstBilling: formik.values.gstBilling || false,
                }}
                razorpayPosMachineUsers={razorpayPosMachineUsers}
                onChange={(field, value) => {
                    formik.setFieldValue(field, value, false);

                    // Reset payment processing success flag when payment mode changes
                    if (field === "paymentMode") {
                        setPaymentProcessingSuccess(false);
                        if (typeof value === "string" && value.toLowerCase() !== "credit") {
                            formik.setFieldValue("transactionId", "", false);
                        }
                    }

                    // For select fields, validate immediately
                    const selectFields = ["consultationCharges", "paymentMode"];
                    if (selectFields.includes(field) && value && String(value).trim() !== "") {
                        setTimeout(() => {
                            formik.setFieldTouched(field, true, false);
                            formik.validateField(field);
                        }, 10);
                    }

                    // For input fields: if field was previously invalid, validate on change
                    const inputFields = ["transactionId"];
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
                consultationChargesOptions={consultationChargesOptions}
                fieldRefs={{
                    consultationCharges: consultationChargesRef,
                    paymentMode: paymentModeRef,
                    transactionId: transactionIdRef,
                }}
                errors={getFormErrors()}
                onCreditSelected={handleCreditSelected}
                paymentData={{
                    amount: parseFloat(formik.values.consultationCharges || "0") || 0,
                    customerMobile: formik.values.contactNumber || "",
                    patientUhid: patientUhid || "", // Use patientUhid from existing patient if available, otherwise empty string (don't use jsHealthCardNo)
                    patientType: (formik.values.patientType || "opd").toLowerCase(),
                    description: `Payment for appointment ${patientToken || "N/A"}`,
                }}
                onPaymentSuccess={(response) => {
                    setPaymentResponse(response);
                    console.log("Payment initiation success:", response);
                    
                    // Extract p2pRequestId and razorpayPosPaymentLogId from response
                    const responseData = response as {
                        success: boolean;
                        data: {
                            p2pRequestId: string;
                            razorpayPosPaymentLogId?: number | string;
                            terminalId?: string;
                            [key: string]: unknown;
                        };
                        [key: string]: unknown;
                    };
                    
                    if (responseData?.data?.p2pRequestId) {
                        setP2pRequestId(responseData.data.p2pRequestId);
                        setSelectedPosMachineName(
                            responseData.data?.terminalId 
                                ? `Razorpay POS Machine ${responseData.data.terminalId}`
                                : "Processing Payment"
                        );
                        setShowProcessingDialog(true);
                    }

                    // Extract and store razorpayPosPaymentLogId
                    if (responseData?.data?.razorpayPosPaymentLogId) {
                        const logId = responseData.data.razorpayPosPaymentLogId;
                        setRazorpayPosPaymentLogId(logId);
                        // Also store in formik for clinic registration
                        formik.setFieldValue("razorpayPosPaymentLogId", logId, false);
                    }
                }}
                onPaymentError={(error) => {
                    console.error("Payment initiation error:", error);
                    console.error("Error type:", typeof error);
                    console.error("Error keys:", error && typeof error === 'object' ? Object.keys(error) : 'N/A');
                    
                    // Extract error message from API response
                    let errorMsg = "Failed to initiate payment. Please try again.";
                    
                    if (error && typeof error === 'object') {
                        // RTK Query error structure: { data: { message: string }, status: number }
                        const rtkError = error as any;
                        
                        // Check nested data.message (RTK Query wraps the API response)
                        // API returns: { data: null, message: "...", statusCode: 500 }
                        // RTK wraps it as: { data: { data: null, message: "...", statusCode: 500 }, status: 500 }
                        if (rtkError.data?.message) {
                            errorMsg = rtkError.data.message;
                        } 
                        // Check if data itself is the API response
                        else if (rtkError.data && typeof rtkError.data === 'object' && 'message' in rtkError.data) {
                            errorMsg = (rtkError.data as any).message;
                        }
                        // Check top-level message
                        else if (rtkError.message) {
                            errorMsg = rtkError.message;
                        }
                    } else if (typeof error === 'string') {
                        errorMsg = error;
                    }
                    
                    console.log("Extracted error message:", errorMsg);
                    
                    // Clear payment mode and transaction ID on error
                    formik.setFieldValue("paymentMode", "", false);
                    formik.setFieldValue("transactionId", "", false);
                    
                    // Set error message and show dialog
                    setErrorMessage(errorMsg);
                    setShowPaymentErrorDialog(true);
                }}
            />

            {/* Billing Information Component - Only show when GST Billing is checked */}
            {formik.values.gstBilling && (
                <BillingInformation
                    formData={{
                        gstNumber: formik.values.gstNumber || "",
                        companyName: formik.values.companyName || "",
                        billingAddress: formik.values.billingAddress || "",
                        billingState: formik.values.billingState || "",
                        billingCity: formik.values.billingCity || "",
                        billingPincode: formik.values.billingPincode || "",
                    }}
                    billingCountryId={formik.values.country || "6"}
                    onChange={(field, value) => {
                        formik.setFieldValue(field, value, false);

                        // For select fields, validate immediately
                        const selectFields = ["billingState", "billingCity"];
                        if (selectFields.includes(field) && value && value.trim() !== "") {
                            setTimeout(() => {
                                formik.setFieldTouched(field, true, false);
                                formik.validateField(field);
                            }, 10);
                        }

                        // For input fields: if field was previously invalid, validate on change
                        const inputFields = ["gstNumber", "companyName", "billingAddress", "billingPincode"];
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
                    fieldRefs={{
                        gstNumber: gstNumberRef,
                        companyName: companyNameRef,
                        billingAddress: billingAddressRef,
                        billingState: billingStateRef,
                        billingCity: billingCityRef,
                        billingPincode: billingPincodeRef,
                    }}
                    errors={getFormErrors()}
                />
            )}
            
            <div className="flex justify-end mt-4 gap-2">
                <BackToPreviousPageButton onClick={onBack} disabled={isHospitalRegistration && (isSubmitting || isCreatingPatient)} />
                <button 
                    className="cursor-pointer flex flex-row justify-center items-center px-6 py-3 gap-2 bg-[#0B8C00] rounded-[32px] font-inter font-medium text-sm leading-[120%] text-center text-white hover:bg-[#0A7A00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                    onClick={handleSubmit}
                    disabled={isHospitalRegistration && (isSubmitting || isCreatingPatient)}
                >
                    {isHospitalRegistration && (isSubmitting || isCreatingPatient) ? (
                        <ThreeDotLoader color="white" size="small" />
                    ) : (
                        <span>{isHospitalRegistration ? "Submit" : "Save & Next"}</span>
                    )}
                </button>
            </div>
            <PaymentDialogDetails
                open={isInvoiceDialogOpen}
                onClose={() => setIsInvoiceDialogOpen(false)}
                patientName={getPatientName()}
                address={formik.values.address || ''}
                countryName={getCountryName}
                addressLine1={(formik.values as any).addressLine1}
                addressLine2={(formik.values as any).addressLine2}
                pinCode={formik.values.pinCode ?? ""}
                cityName={getCityName}
                stateName={getStateName}
                jsHealthCardNo={formik.values.jsHealthCardNo || ''}
                uhid={patientUhid || ''}
                consultationCharges={consultationCharges}
                subtotal={subtotal}
                tax={tax}
                totalAmount={totalAmount}
                billDate={formatDateTime()}
                transactionId={formik.values.transactionId}
                paymentMode={formik.values.paymentMode}
                gstBilling={formik.values.gstBilling || false}
                gstNumber={formik.values.gstNumber}
                companyName={formik.values.companyName}
                billingAddress={formik.values.billingAddress}
                billingStateName={getBillingStateName}
                billingCityName={getBillingCityName}
                billingPincode={formik.values.billingPincode}
                onPrint={handlePrintInvoice}
                onSaveAndNext={handleSaveAndNext}
                onDownload={handleDownloadInvoice}
                isSubmitting={isSubmitting || isCreatingPatient}
                isHospitalRegistration={isHospitalRegistration}
            />
            
            {/* Error Dialog */}
            <MessageDialog
                open={showErrorDialog}
                onClose={handleErrorDialogClose}
                icon="/icons/CrossIcon.svg"
                iconBgColor="#FFEBEE"
                message={errorMessage}
                confirmText="OK"
                showCancel={false}
                onConfirm={handleErrorDialogClose}
            />

            {/* Processing Payment Dialog */}
            <ProcessingPaymentDialog
                open={showProcessingDialog}
                onClose={handleProcessingDialogClose}
                onTimeout={handlePaymentTimeout}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentTimeout}
                onCancelSuccess={handleCancelSuccess}
                duration={150} // 2 minutes 30 seconds (2:30) - for display only, no timeout
                posMachineName={selectedPosMachineName}
                p2pRequestId={p2pRequestId}
                razorpayPosMachineId={razorpayPosMachineId}
            />

            {/* Payment Success Dialog */}
            <MessageDialog
                open={showPaymentSuccessDialog}
                onClose={handlePaymentSuccessDialogClose}
                icon="/icons/SuccessIcon.svg"
                iconBgColor="#E8F5E9"
                message="Payment successful"
                confirmText="Ok"
                showCancel={false}
                onConfirm={handlePaymentSuccessDialogClose}
                width={400}
            />

            {/* Payment Error Dialog */}
            <MessageDialog
                open={showPaymentErrorDialog}
                onClose={handlePaymentErrorDialogClose}
                icon="/icons/ErrorIcon.svg"
                iconBgColor="#FFEBEE"
                message={errorMessage || "Payment timeout"}
                confirmText="Ok"
                showCancel={false}
                onConfirm={handlePaymentErrorDialogClose}
                width={400}
            />
        </div>
    );
}


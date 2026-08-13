"use client";

import { useState, useEffect, useMemo } from "react";
import { useFormik } from "formik";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { BackToPreviousPageButton, MessageDialog } from "@/components/ui";
import RegistrationSteps from "@/components/registration/RegistrationSteps";
import VitalForm from "@/app/registration/vital";
import MedicalForm from "@/app/registration/medical";
import PatientOldHistory from "@/components/registration/PatientOldHistory";
import { registrationPersonalDetailsSchema, type RegistrationPersonalDetailsFormValues } from "@/lib/validation/registrationSchemas";
import { useGetAppointmentByIdQuery, useUpdateAppointmentVitalsMedicalMutation, useLazyGetAppointmentsListQuery } from "@/store/api/registrationApi";
import { parseYesNoDetailsValue, buildYesNoDetailsPayload } from "@/lib/utils/common";
import { useSelector } from "react-redux";
import { selectUserId } from "@/store/slices/authSlice";
import type { RootState } from "@/store";

export default function VitalsMedicalInfoPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const appointmentId = params?.patientId as string; // This is actually the appointment ID
    // Get gender and patient name from URL query parameters
    const genderFromUrl = searchParams?.get("gender");
    const patientNameFromUrl = searchParams?.get("patientName");
    const patientTypeFromUrl = searchParams?.get("patientType");
    
    const [currentStep, setCurrentStep] = useState(0); // 0 = Vitals, 1 = Medical Info
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [showPatientHistoryDialog, setShowPatientHistoryDialog] = useState(false);
    const [patientName, setPatientName] = useState(patientNameFromUrl || "");

    // Get current user ID for updatedBy
    const userId = useSelector((state: RootState) => selectUserId(state));
    
    // Fetch appointment data from API
    const { data: appointmentData, isLoading: isLoadingAppointment } = useGetAppointmentByIdQuery(
        { 
            appointmentId: appointmentId || "", 
            branchId: 1 
        },
        { skip: !appointmentId }
    );

    const isDaycare = useMemo(() => {
        const rawType = (
            patientTypeFromUrl ||
            appointmentData?.data?.patientType ||
            appointmentData?.data?.registration?.patientType ||
            (appointmentData?.data as any)?.patient_type ||
            (appointmentData?.data?.registration as any)?.patient_type ||
            ""
        ).toString().toLowerCase().trim();
        return rawType === "daycare";
    }, [patientTypeFromUrl, appointmentData]);

    const vitalsMedicalSteps = useMemo(() => {
        if (isDaycare) {
            return [{ number: "Step 01", label: "Vitals" }];
        }
        return [
            { number: "Step 01", label: "Vitals" },
            { number: "Step 02", label: "Medical" },
        ];
    }, [isDaycare]);

    const vitalsDietListBranchId = useMemo(() => {
        const bid = appointmentData?.data?.branchId;
        if (bid == null) return undefined;
        const n = typeof bid === "number" ? bid : Number(bid);
        return Number.isFinite(n) && n >= 1 ? n : undefined;
    }, [appointmentData?.data?.branchId]);
    
    // Mutation for updating appointment vitals/medical
    const [updateAppointmentVitalsMedical, { isLoading: isSubmitting }] = useUpdateAppointmentVitalsMedicalMutation();
    
    // Lazy query for refetching appointments list
    const [refetchAppointmentsList] = useLazyGetAppointmentsListQuery();

    // Set gender from URL query parameter on initial load
    useEffect(() => {
        if (genderFromUrl) {
            formik.setFieldValue("gender", genderFromUrl.toLowerCase(), false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [genderFromUrl]);

    // Extract patient name and gender from appointment data
    useEffect(() => {
        if (appointmentData?.data) {
            if (!patientNameFromUrl) {
                const name = appointmentData.data.registration?.patientName || 
                            appointmentData.data.registration?.patient || 
                            "Patient";
                setPatientName(name);
            }
            
            // Populate gender - prioritize URL query parameter, fallback to API data
            const gender = genderFromUrl || appointmentData.data.registration?.gender || "";
            if (gender) {
                formik.setFieldValue("gender", gender.toLowerCase(), false);
            }
            
            // Populate lastDayFullDiet from appointment data
            const registration = appointmentData.data.registration;
            if (registration && 'lastDayFullDiet' in registration) {
                const lastDayFullDiet = (registration as any).lastDayFullDiet || "";
                if (lastDayFullDiet) {
                    formik.setFieldValue("lastDayFullDiet", lastDayFullDiet, false);
                }
            }

            // Populate allergies / surgeries from appointment data (split detail string into Yes/No + details)
            if (registration) {
                const rawAllergies = (registration as any).allergies;
                if (rawAllergies != null && String(rawAllergies).trim() !== "") {
                    const { yesNo, details } = parseYesNoDetailsValue(String(rawAllergies));
                    if (yesNo) formik.setFieldValue("allergies", yesNo, false);
                    formik.setFieldValue("allergiesDetails", details, false);
                }
                const rawSurgeries = (registration as any).surgeries;
                if (rawSurgeries != null && String(rawSurgeries).trim() !== "") {
                    const { yesNo, details } = parseYesNoDetailsValue(String(rawSurgeries));
                    if (yesNo) formik.setFieldValue("surgeries", yesNo, false);
                    formik.setFieldValue("surgeriesDetails", details, false);
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appointmentData]);

    // Initial form values - need all fields for formik but only use vitals and medical info
    const initialValues: RegistrationPersonalDetailsFormValues = {
        contactNumber: "",
        whatsappNo: "",
        aadharCardNumber: "",
        patientNameSelect: "",
        patientName: patientName,
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
        country: "6", // India is auto-selected
        state: "",
        city: "",
        address: "",
        patientType: "",
        patientSubType: "",
        benificiaryId: "",
        insuranceCompany: "",
        ayushCovered: "",
        referral: "",
        source: "",
        tvSpecificField: "",
        newspaperSpecificField: "",
        socialMediaSpecificField: "",
        doctorSpecificField: "",
        referralName: "",
        referralMobile: "",
        doctor: "",
        appointmentDate: "",
        timeSlot: "",
        consultationCharges: "",
        paymentMode: "",
        transactionId: "",
        gstBilling: false,
        gstNumber: "",
        companyName: "",
        billingAddress: "",
        billingState: "",
        billingCity: "",
        billingPincode: "",
        heightFeet: "",
        heightInch: "",
        weight: "",
        bloodGroup: "",
        allergies: "",
        allergiesDetails: "",
        surgeries: "",
        surgeriesDetails: "",
        dietType: "",
        lastDayFullDiet: "",
        bloodPressure: "",
        sugarLevel: "",
        temperature: "",
        pulse: "",
        spo2: "",
        diabetes: "",
        diabetesRemarks: "",
        htn: "",
        htnRemarks: "",
        coronaryArteryDisease: "",
        coronaryArteryDiseaseRemarks: "",
        thyroid: "",
        thyroidRemarks: "",
        menstrual: "",
        menstrualRemarks: "",
        alcohol: false,
        smoking: false,
        tobacco: false,
        drugs: false,
        addictionOther: false,
        addictionSpecify: "",
        diagnosis: "",
        subDiagnosis: "",
        symptoms: "",
    };

    // Formik setup
    const formik = useFormik<RegistrationPersonalDetailsFormValues>({
        initialValues,
        validationSchema: registrationPersonalDetailsSchema,
        validateOnChange: false,
        validateOnBlur: true,
        onSubmit: async (values) => {
            console.log("Vitals & Medical Info submitted:", values);
            // Handle submission here
        },
    });

    // Update patient name in formik when it's loaded
    useEffect(() => {
        if (patientName) {
            formik.setFieldValue("patientName", patientName);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patientName]);

    // Handle body overflow and keyboard when dialog is open
    useEffect(() => {
        if (showPatientHistoryDialog) {
            document.body.style.overflow = "hidden";
            
            const handleKeyDown = (event: KeyboardEvent) => {
                if (event.key === "Escape") {
                    setShowPatientHistoryDialog(false);
                }
            };
            
            document.addEventListener("keydown", handleKeyDown);
            return () => {
                document.body.style.overflow = "";
                document.removeEventListener("keydown", handleKeyDown);
            };
        } else {
            document.body.style.overflow = "";
        }
    }, [showPatientHistoryDialog]);

    const handleBackSteps = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        } else {
            // If on first step, go back to previous page
            router.back();
        }
    };

    const handleNextStep = () => {
        if (isDaycare) {
            void handleFinalSubmit();
        } else if (currentStep < vitalsMedicalSteps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleFinalSubmit = async () => {
        if (!appointmentId || !appointmentData?.data) {
            console.error("Missing appointment ID or data");
            return;
        }

        try {
            const values = formik.values;
            const appointment = appointmentData.data;
            
            // Calculate height from feet and inches (e.g., 5 feet 8 inches = 5.8)
            const heightFeet = parseFloat(values.heightFeet) || 0;
            const heightInch = parseFloat(values.heightInch) || 0;
            const height = heightFeet + (heightInch / 12);
            const heightString = height.toFixed(1);
            
            // Map medical fields: "Yes"/"No" to boolean
            const isDiabetes = values.diabetes?.toLowerCase() === "yes";
            const isHypertension = values.htn?.toLowerCase() === "yes";
            const isCad = values.coronaryArteryDisease?.toLowerCase() === "yes";
            const isThyroid = values.thyroid?.toLowerCase() === "yes";
            const isMenstrual = values.menstrual?.toLowerCase() === "yes";
            
            // Allergies / Surgeries: send the free-text details when "Yes", "no" when "No", or omit when empty.
            const allergiesString = buildYesNoDetailsPayload(values.allergies, (values as any).allergiesDetails);
            const surgeriesString = buildYesNoDetailsPayload(values.surgeries, (values as any).surgeriesDetails);
            
            // Build addictionType array from checkboxes (only known types) - send in lowercase
            const addictionType: string[] = [];
            if (values.alcohol) addictionType.push("alcohol");
            if (values.smoking) addictionType.push("smoking");
            if (values.tobacco) addictionType.push("tobacco");
            if (values.drugs) addictionType.push("drugs");
            
            // Set addictionSpecify if "other" is checked and has a value
            const addictionSpecify = values.addictionOther && values.addictionSpecify 
                ? values.addictionSpecify 
                : undefined;
            
            // Map diagnosis to diagnosisId
            let diagnosisId: number | string | null = null;
            if (values.diagnosis) {
                const parsedId = parseInt(values.diagnosis, 10);
                diagnosisId = isNaN(parsedId) ? null : parsedId;
            }
            
            // Map subDiagnosis to subDiagnosisId
            let subDiagnosisId: number | null = null;
            if (values.subDiagnosis) {
                const parsedId = parseInt(values.subDiagnosis, 10);
                subDiagnosisId = isNaN(parsedId) ? null : parsedId;
            }
            
            // Prepare the payload according to new API structure
            const payload = {
                appointmentId: appointmentId,
                registrationId: appointment.registrationId || appointment.registration?.id || "",
                updatedBy: userId || 0,
                // Medical fields (top level)
                isCad: isCad,
                cadRemarks: values.coronaryArteryDiseaseRemarks || undefined,
                isDiabetes: isDiabetes,
                diabetesRemarks: values.diabetesRemarks || undefined,
                isHypertension: isHypertension,
                hypertensionRemarks: values.htnRemarks || undefined,
                isMenstrual: isMenstrual,
                menstrualRemarks: values.menstrualRemarks || undefined,
                isThyroid: isThyroid,
                thyroidRemarks: values.thyroidRemarks || undefined,
                // Vitals fields (top level)
                spo2: values.spo2 || undefined,
                pulse: values.pulse || undefined,
                temperature: values.temperature || undefined,
                sugarLevel: values.sugarLevel || undefined,
                diagnosisSymptoms: values.symptoms || undefined,
                diagnosisId: diagnosisId,
                subDiagnosisId: subDiagnosisId || undefined,
                bloodPressure: values.bloodPressure || undefined,
                // Registration object
                registration: {
                    addictionType: addictionType.length > 0 ? addictionType : undefined,
                    addictionSpecify: addictionSpecify,
                    height: heightString,
                    weight: values.weight || undefined,
                    bloodGroup: values.bloodGroup || undefined,
                    allergies: allergiesString,
                    surgeries: surgeriesString,
                    dietType: values.dietType || undefined,
                    lastDayFullDiet: values.lastDayFullDiet || undefined,
                    updatedBy: userId || 0,
                },
            };
            
            // Call the API - appointmentId is passed separately, rest goes in body
            const { appointmentId: _, ...body } = payload;
            const result = await updateAppointmentVitalsMedical({
                appointmentId: appointmentId,
                ...body,
            }).unwrap();
            
            // Show success dialog
            setShowSuccessDialog(true);
            
            // Refetch appointments list in the background
            refetchAppointmentsList({
                branchId: 1,
                search: "",
                page: 1,
                limit: 10,
            });
        } catch (error: any) {
            console.error("Error submitting vitals & medical info:", error);
            const errorMsg = error?.data?.message || error?.message || "Failed to update vitals and medical information. Please try again.";
            setErrorMessage(errorMsg);
            setShowErrorDialog(true);
        }
    };

    const handleResetAfterSuccess = () => {
        formik.resetForm({ values: initialValues });
        setCurrentStep(0);
        setShowSuccessDialog(false);
        // Navigate back to previous page
        router.back();
    };

    // Helper function to convert Formik errors to flat structure
    const getFormErrors = (): Record<string, string> => {
        const errors: Record<string, string> = {};
        Object.keys(formik.errors).forEach((key) => {
            const error = formik.errors[key as keyof typeof formik.errors];
            const touched = formik.touched[key as keyof typeof formik.touched];
            if (touched && typeof error === "string") {
                errors[key] = error;
            }
        });
        return errors;
    };

    // Show loading state while fetching appointment data
    if (isLoadingAppointment) {
        return (
            <AppShell>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <div className="text-sm text-[#9CA3AF]">Loading patient data...</div>
                    </div>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <div className="space-y-6">
                <div className="flex items-start justify-between">
                    <PageHeading className="" title={`Vitals & Medical Info - ${patientName || "Patient"}`} />
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            className="flex h-11 items-center gap-2 rounded-[32px] border border-[#0B8C00] px-6 text-sm font-medium text-[#0B8C00] transition-colors hover:bg-[#F2F8F2]"
                            onClick={() => {
                                setShowPatientHistoryDialog(true);
                            }}
                        >
                            <Image src="/icons/viewDetialsDrakIcon.svg" alt="View Details" width={20} height={20} />
                            <span className="md:hidden block">Patient Old History</span>
                        </button>
                        <BackToPreviousPageButton 
                            iconOnly={true} 
                            onClick={() => router.back()}
                        />
                    </div>
                </div>

                <div className="w-full">
                    <RegistrationSteps steps={vitalsMedicalSteps} currentStep={currentStep} />

                    {/* Conditional rendering based on current step */}
                    {currentStep === 0 && (
                        <VitalForm
                            formik={formik}
                            getFormErrors={getFormErrors}
                            onNext={handleNextStep}
                            onBack={handleBackSteps}
                            showBackButton={false}
                            branchId={vitalsDietListBranchId}
                            submitButtonText={isDaycare ? "Save" : "Save & Next"}
                        />
                    )}

                    {currentStep === 1 && ( 
                        <MedicalForm
                            formik={formik}
                            getFormErrors={getFormErrors}
                            onBack={handleBackSteps}
                            onSubmit={handleFinalSubmit}
                            onSuccessClose={() => {
                                // Don't reset here, let handleFinalSubmit show our custom dialog
                            }}
                            customSuccessMessage="Completed Vitals & Medical Information!"
                            showInternalSuccessDialog={false}
                            isSubmitting={isSubmitting}
                        />
                    )}
                </div>
            </div>

            {/* Success Dialog */}
            <MessageDialog
                open={showSuccessDialog}
                onClose={() => {
                    setShowSuccessDialog(false);
                    handleResetAfterSuccess();
                }}
                icon="/icons/SuccessCheck.svg"
                iconBgColor="#E8F5E9"
                message="Completed Vitals & Medical Information!"
                confirmText="OK"
                showCancel={false}
                onConfirm={() => {
                    setShowSuccessDialog(false);
                    handleResetAfterSuccess();
                }}
            />
            
            {/* Error Dialog */}
            <MessageDialog
                open={showErrorDialog}
                onClose={() => setShowErrorDialog(false)}
                icon="/icons/ErrorIcon.svg"
                iconBgColor="#FFEBEE"
                message={errorMessage}
                confirmText="OK"
                showCancel={false}
                onConfirm={() => setShowErrorDialog(false)}
            />

            {/* Patient Old History Right Side Dialog */}
            {showPatientHistoryDialog && (
                <div className="fixed inset-0 z-50 flex">
                    {/* Backdrop */}
                    <div
                        className="flex-1 bg-[#0B1323]/70"
                        onClick={() => setShowPatientHistoryDialog(false)}
                    />
                    {/* Right Side Dialog */}
                    <div className="w-[400px] bg-white shadow-[0px_32px_80px_rgba(47,72,61,0.18)] flex flex-col h-full">
                        {/* Header */}
                        <div className=" flex items-center gap-2 justify-between px-3 pt-6 pb-0">
                            <div className="flex items-center gap-2">
                                <Image src="/icons/patient_history.svg" alt="Patient History Icon" width={24} height={24} />
                                <h3 className="font-inter font-medium text-base leading-[120%] text-[#262D3B]"> Patient old history</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowPatientHistoryDialog(false)}
                                className="flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-200 hover:bg-[#F2F8F2]"
                                aria-label="Close dialog"
                            >
                                <Image src="/icons/CrossIcon.svg" alt="Close dialog" width={24} height={24} />
                            </button>
                        </div>
                        {/* Content */}
                        <div className="flex-1 overflow-y-auto">
                            <PatientOldHistory removeBorderAndShadow={true} removeHorizontalPadding={true} hideHeading={true} />
                        </div>
                    </div>
                </div>
            )}
        </AppShell>
    );
}

"use client";

import { useState, useRef } from "react";
import { useFormik } from "formik";
import { Dialog, MessageDialog } from "@/components/ui";
import RegistrationSteps from "@/components/registration/RegistrationSteps";
import VitalForm from "@/app/registration/vital";
import MedicalForm from "@/app/registration/medical";
import { registrationPersonalDetailsSchema, type RegistrationPersonalDetailsFormValues } from "@/lib/validation/registrationSchemas";

interface VitalsMedicalInfoDialogProps {
    open: boolean;
    onClose: () => void;
    patientId: number;
    patientName: string;
}

export default function VitalsMedicalInfoDialog({
    open,
    onClose,
    patientId,
    patientName,
}: VitalsMedicalInfoDialogProps) {
    const [currentStep, setCurrentStep] = useState(0); // 0 = Vitals, 1 = Medical Info
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);

    const vitalsMedicalSteps = [
        { number: "Step 01", label: "Vitals" },
        { number: "Step 02", label: "Medical Info" },
    ];

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
        country: "",
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
        surgeries: "",
        dietType: "",
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

    const handleBackSteps = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleNextStep = () => {
        if (currentStep < vitalsMedicalSteps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleFinalSubmit = async () => {
        try {
            // Formik validation is already done in MedicalForm
            // Just show success dialog
            console.log("Vitals & Medical Info submitted:", formik.values);
            setShowSuccessDialog(true);
        } catch (error) {
            console.error("Error submitting vitals & medical info:", error);
            // Error handling can be added here if needed
        }
    };

    const handleResetAfterSuccess = () => {
        formik.resetForm({ values: initialValues });
        setCurrentStep(0);
        setShowSuccessDialog(false);
        onClose();
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

    return (
        <>
            <Dialog 
                open={open} 
                onClose={onClose} 
                title={`Vitals & Medical Information - ${patientName}`}
                width="90%"
            >
                <div className="w-full">
                    <RegistrationSteps steps={vitalsMedicalSteps} currentStep={currentStep} />

                    {/* Conditional rendering based on current step */}
                    {currentStep === 0 && (
                        <VitalForm
                            formik={formik}
                            getFormErrors={getFormErrors}
                            onNext={handleNextStep}
                            onBack={handleBackSteps}
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
                        />
                    )}
                </div>
            </Dialog>

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
        </>
    );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Dialog, Button, FormInputField, FormTextareaField, MessageDialog } from "@/components/ui";
import { useUpdatePatientContactNumberMutation, useLazyCheckPhoneNumberQuery } from "@/store/api/registrationApi";
import { useSelector } from "react-redux";
import { selectUserId, selectUserBranchId } from "@/store/slices/authSlice";
import type { RootState } from "@/store";
import { useDebounce } from "@/hooks/useDebounce";

interface UpdateContactDialogProps {
    open: boolean;
    onClose: () => void;
    currentContactNumber?: string; // Optional - if provided, will pre-fill and disable old contact number field
    registrationId: number | string;
    onSuccess?: (newContactNumber: string) => void;
}

const validationSchema = Yup.object().shape({
    oldContactNumber: Yup.string()
        .trim()
        .required("Old Contact Number is required")
        .length(10, "Contact Number must be exactly 10 digits")
        .matches(/^\d+$/, "Contact Number must contain only digits"),
    newContactNumber: Yup.string()
        .trim()
        .required("New Contact Number is required")
        .length(10, "Contact Number must be exactly 10 digits")
        .matches(/^\d+$/, "Contact Number must contain only digits"),
    remarks: Yup.string()
        .trim()
        .optional(),
});

export default function UpdateContactDialog({
    open,
    onClose,
    currentContactNumber,
    registrationId,
    onSuccess,
}: UpdateContactDialogProps) {
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [oldContactNumberError, setOldContactNumberError] = useState<string | undefined>(undefined);
    const [isCheckingPhoneNumber, setIsCheckingPhoneNumber] = useState(false);
    const [phoneNumberExists, setPhoneNumberExists] = useState<boolean | null>(null);
    const [fetchedRegistrationId, setFetchedRegistrationId] = useState<string | number | null>(null);
    const [patientName, setPatientName] = useState<string | null>(null);

    // Get current user ID and branchId for requestedBy
    const userId = useSelector((state: RootState) => selectUserId(state));
    const branchId = useSelector((state: RootState) => selectUserBranchId(state)) || 1;
    const [updateContactNumber, { isLoading: isUpdating }] = useUpdatePatientContactNumberMutation();
    const [checkPhoneNumber] = useLazyCheckPhoneNumberQuery();
    
    // Ref to track if we should skip the check (e.g., when currentContactNumber is provided)
    const skipCheckRef = useRef(!!currentContactNumber);

    const formik = useFormik({
        initialValues: {
            oldContactNumber: currentContactNumber || "",
            newContactNumber: "",
            remarks: "",
        },
        validationSchema,
        enableReinitialize: true,
        onSubmit: async (values, { setSubmitting, resetForm }) => {
            try {
                // Validate that old contact number exists
                if (phoneNumberExists === false) {
                    setErrorMessage("This number does not exist. Please enter your correct mobile number");
                    setShowErrorDialog(true);
                    setSubmitting(false);
                    return;
                }

                // Validate that we have fetchedRegistrationId and patientName
                if (!fetchedRegistrationId || !patientName) {
                    setErrorMessage("Registration information is missing. Please verify the old contact number again.");
                    setShowErrorDialog(true);
                    setSubmitting(false);
                    return;
                }

                // Validate that new contact number is different from old
                if (values.newContactNumber === values.oldContactNumber) {
                    setErrorMessage("New contact number must be different from old contact number");
                    setShowErrorDialog(true);
                    setSubmitting(false);
                    return;
                }

                // Check if userId is available
                if (!userId) {
                    setErrorMessage("User ID is required to update contact number. Please login again.");
                    setShowErrorDialog(true);
                    setSubmitting(false);
                    return;
                }

                const result = await updateContactNumber({
                    registrationId: fetchedRegistrationId,
                    patientName: patientName,
                    oldContactNo: values.oldContactNumber,
                    newContactNo: values.newContactNumber,
                    requestedBy: userId,
                    branchId: branchId,
                    remarks: values.remarks || undefined,
                }).unwrap();

                if (result.success) {
                    setSuccessMessage(result.message || "Contact number change request submitted successfully!");
                    setShowSuccessDialog(true);
                    resetForm();
                    // Call onSuccess callback with new contact number
                    onSuccess?.(values.newContactNumber);
                } else {
                    setErrorMessage(result.message || "Failed to submit contact number change request");
                    setShowErrorDialog(true);
                }
            } catch (error: any) {
                console.error("Error updating contact number:", error);
                setErrorMessage(error?.data?.message || error?.message || "Failed to submit contact number change request");
                setShowErrorDialog(true);
            } finally {
                setSubmitting(false);
            }
        },
    });

    // Debounce old contact number to avoid too many API calls
    const debouncedOldContactNumber = useDebounce(
        currentContactNumber ? "" : formik.values.oldContactNumber,
        500
    );

    // Update skipCheckRef when currentContactNumber changes and fetch registration details
    useEffect(() => {
        skipCheckRef.current = !!currentContactNumber;
        if (currentContactNumber && open) {
            setPhoneNumberExists(true);
            setOldContactNumberError(undefined);
            // If currentContactNumber is provided, we need to check the phone number
            // to get fetchedRegistrationId and patientName
            if (currentContactNumber.length === 10) {
                checkPhoneNumber({
                    phoneNumber: currentContactNumber,
                })
                    .then((result) => {
                        if (result.data?.success && result.data.data?.exists) {
                            const registration = result.data.data?.registration;
                            if (registration) {
                                setFetchedRegistrationId(registration.id);
                                setPatientName(registration.patientName);
                            }
                        }
                    })
                    .catch((error) => {
                        console.error("Error checking phone number for current contact:", error);
                    });
            }
        } else if (!currentContactNumber) {
            // Reset these values when currentContactNumber is cleared
            setFetchedRegistrationId(null);
            setPatientName(null);
        }
    }, [currentContactNumber, checkPhoneNumber, open]);

    // Effect to check phone number when user enters 10 digits
    useEffect(() => {
        // Skip check if currentContactNumber is provided (it's already validated)
        if (currentContactNumber) {
            return;
        }

        // Only check if we have exactly 10 digits
        if (debouncedOldContactNumber.length === 10 && /^\d{10}$/.test(debouncedOldContactNumber)) {
            setIsCheckingPhoneNumber(true);
            setOldContactNumberError(undefined);
            setPhoneNumberExists(null);

            checkPhoneNumber({
                phoneNumber: debouncedOldContactNumber,
            })
                .then((result) => {
                    if (result.data?.success) {
                        const exists = result.data.data?.exists ?? false;
                        setPhoneNumberExists(exists);
                        if (!exists) {
                            setOldContactNumberError("This number does not exist. Please enter your correct mobile number");
                            setFetchedRegistrationId(null);
                            setPatientName(null);
                        } else {
                            setOldContactNumberError(undefined);
                            // Store fetchedRegistrationId and patientName from the response
                            const registration = result.data.data?.registration;
                            if (registration) {
                                setFetchedRegistrationId(registration.id);
                                setPatientName(registration.patientName);
                            }
                        }
                    } else {
                        setPhoneNumberExists(false);
                        setOldContactNumberError("This number does not exist. Please enter your correct mobile number");
                        setFetchedRegistrationId(null);
                        setPatientName(null);
                    }
                })
                .catch((error) => {
                    console.error("Error checking phone number:", error);
                    setPhoneNumberExists(false);
                    setOldContactNumberError("This number does not exist. Please enter your correct mobile number");
                    setFetchedRegistrationId(null);
                    setPatientName(null);
                })
                .finally(() => {
                    setIsCheckingPhoneNumber(false);
                });
        } else if (debouncedOldContactNumber.length > 0 && debouncedOldContactNumber.length < 10) {
            // Clear error if user is still typing
            setPhoneNumberExists(null);
            setOldContactNumberError(undefined);
            setFetchedRegistrationId(null);
            setPatientName(null);
        } else if (debouncedOldContactNumber.length === 0) {
            // Clear state when field is empty
            setPhoneNumberExists(null);
            setOldContactNumberError(undefined);
            setFetchedRegistrationId(null);
            setPatientName(null);
        }
    }, [debouncedOldContactNumber, checkPhoneNumber, currentContactNumber]);

    const handleClose = () => {
        if (!isUpdating) {
            formik.resetForm({
                values: {
                    oldContactNumber: currentContactNumber || "",
                    newContactNumber: "",
                    remarks: "",
                },
            });
            // Reset validation state
            setOldContactNumberError(undefined);
            setPhoneNumberExists(null);
            setIsCheckingPhoneNumber(false);
            setFetchedRegistrationId(null);
            setPatientName(null);
            skipCheckRef.current = !!currentContactNumber;
            onClose();
        }
    };

    const handleSuccessClose = () => {
        setShowSuccessDialog(false);
        handleClose();
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={handleClose}
                title="Update Contact"
                width={577}
            >
                <form
                    onSubmit={formik.handleSubmit}
                    className="flex flex-col gap-6"
                >
                    {/* Old Contact Number */}
                    <div>
                        <FormInputField
                            label="Old Contact Number *"
                            value={formik.values.oldContactNumber}
                            onChange={(e) => {
                                // Only allow editing if currentContactNumber is not provided
                                if (!currentContactNumber) {
                                    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                                    formik.setFieldValue("oldContactNumber", value, false);
                                    // Reset validation state when user types
                                    if (value.length !== 10) {
                                        setPhoneNumberExists(null);
                                        setOldContactNumberError(undefined);
                                    }
                                }
                            }}
                            onBlur={() => {
                                formik.setFieldTouched("oldContactNumber", true);
                                formik.validateField("oldContactNumber");
                            }}
                            placeholder={currentContactNumber ? "" : "Enter 10 digit old mobile number"}
                            type="tel"
                            maxLength={10}
                            error={
                                formik.touched.oldContactNumber
                                    ? oldContactNumberError || formik.errors.oldContactNumber
                                    : oldContactNumberError
                            }
                            disabled={!!currentContactNumber || isCheckingPhoneNumber}
                            readOnly={!!currentContactNumber}
                            className={currentContactNumber ? "!cursor-not-allowed" : ""}
                        />
                    </div>

                    {/* New Contact Number */}
                    <div>
                        <FormInputField
                            label="New Contact Number *"
                            value={formik.values.newContactNumber}
                            onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                                formik.setFieldValue("newContactNumber", value, false);
                            }}
                            onBlur={() => {
                                formik.setFieldTouched("newContactNumber", true);
                                formik.validateField("newContactNumber");
                            }}
                            placeholder="Enter 10 digit mobile number"
                            type="tel"
                            maxLength={10}
                            error={formik.touched.newContactNumber ? formik.errors.newContactNumber : undefined}
                        />
                    </div>

                    {/* Remarks */}
                    <div>
                        <FormTextareaField
                            label="Remarks"
                            value={formik.values.remarks}
                            onChange={(e) => {
                                formik.setFieldValue("remarks", e.target.value, false);
                            }}
                            onBlur={() => {
                                formik.setFieldTouched("remarks", true);
                                formik.validateField("remarks");
                            }}
                            placeholder="Enter remarks (optional)"
                            error={formik.touched.remarks ? formik.errors.remarks : undefined}
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            size="large"
                            onClick={handleClose}
                            disabled={isUpdating}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            size="large"
                            isLoading={isUpdating || formik.isSubmitting || isCheckingPhoneNumber}
                            disabled={
                                isUpdating ||
                                formik.isSubmitting ||
                                isCheckingPhoneNumber ||
                                phoneNumberExists === false ||
                                (formik.values.oldContactNumber.length === 10 && phoneNumberExists === null)
                            }
                        >
                            Submit
                        </Button>
                    </div>
                </form>
            </Dialog>

            {/* Success Dialog */}
            <MessageDialog
                open={showSuccessDialog}
                onClose={handleSuccessClose}
                icon="/icons/SuccessCheck.svg"
                iconBgColor="#E8F5E9"
                message={successMessage}
                confirmText="OK"
                showCancel={false}
                onConfirm={handleSuccessClose}
            />

            {/* Error Dialog */}
            <MessageDialog
                open={showErrorDialog}
                onClose={() => setShowErrorDialog(false)}
                icon="/icons/CrossIcon.svg"
                iconBgColor="#FFEBEE"
                message={errorMessage}
                confirmText="OK"
                showCancel={false}
                onConfirm={() => setShowErrorDialog(false)}
            />
        </>
    );
}


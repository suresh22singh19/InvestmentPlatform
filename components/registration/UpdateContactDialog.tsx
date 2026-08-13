"use client";

import { useState, useEffect, useCallback } from "react";
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
    disableOldContactNumber?: boolean;
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
        .matches(/^[A-Za-z\s]*$/, "Remarks must contain only letters and spaces")
        .max(100, "Remarks must be at most 100 characters")
        .optional(),
});

export default function UpdateContactDialog({
    open,
    onClose,
    currentContactNumber,
    registrationId,
    onSuccess,
    disableOldContactNumber = false,
}: UpdateContactDialogProps) {
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [oldContactNumberError, setOldContactNumberError] = useState<string | undefined>(undefined);
    const [isCheckingPhoneNumber, setIsCheckingPhoneNumber] = useState(false);
    const [phoneNumberExists, setPhoneNumberExists] = useState<boolean | null>(null);
    const [isCheckingNewPhoneNumber, setIsCheckingNewPhoneNumber] = useState(false);
    const [newPhoneNumberExists, setNewPhoneNumberExists] = useState<boolean | null>(null);
    const [newContactNumberError, setNewContactNumberError] = useState<string | undefined>(undefined);
    const [fetchedRegistrationId, setFetchedRegistrationId] = useState<string | number | null>(null);
    const [patientName, setPatientName] = useState<string | null>(null);

    // Get current user ID and branchId for requestedBy
    const userId = useSelector((state: RootState) => selectUserId(state));
    const branchId = useSelector((state: RootState) => selectUserBranchId(state)) || 1;
    const [updateContactNumber, { isLoading: isUpdating }] = useUpdatePatientContactNumberMutation();
    const [checkPhoneNumber] = useLazyCheckPhoneNumberQuery();

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

                // Validate that new contact number is not assigned to another patient
                if (newPhoneNumberExists === true) {
                    setErrorMessage("Contact number already exists for a patient. Please enter a new number.");
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

    // Debounce old/new contact numbers to avoid too many API calls
    const debouncedOldContactNumber = useDebounce(formik.values.oldContactNumber, 500);

    const runOldContactNumberCheck = useCallback((phoneNumber: string) => {
        setIsCheckingPhoneNumber(true);
        setOldContactNumberError(undefined);
        setPhoneNumberExists(null);

        checkPhoneNumber({
            phoneNumber,
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
                        const registration = result.data.data?.registration;
                        if (registration) {
                            setFetchedRegistrationId(registration.id);
                            setPatientName(registration.patientName);
                        } else {
                            setFetchedRegistrationId(null);
                            setPatientName(null);
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
    }, [checkPhoneNumber]);

    // Instantly check old contact number when dialog opens
    useEffect(() => {
        if (!open) return;

        const oldNumberOnOpen = (formik.values.oldContactNumber || "").trim();
        if (oldNumberOnOpen.length === 10 && /^\d{10}$/.test(oldNumberOnOpen)) {
            runOldContactNumberCheck(oldNumberOnOpen);
        } else {
            setPhoneNumberExists(null);
            setOldContactNumberError(undefined);
            setFetchedRegistrationId(null);
            setPatientName(null);
        }
    }, [open, currentContactNumber, formik.values.oldContactNumber, runOldContactNumberCheck]);

    // Effect to check phone number when user enters 10 digits
    useEffect(() => {
        // Only check if we have exactly 10 digits
        if (debouncedOldContactNumber.length === 10 && /^\d{10}$/.test(debouncedOldContactNumber)) {
            runOldContactNumberCheck(debouncedOldContactNumber);
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
    }, [debouncedOldContactNumber, runOldContactNumberCheck]);

    const runNewContactNumberCheck = useCallback((phoneNumber: string) => {
        setIsCheckingNewPhoneNumber(true);
        setNewContactNumberError(undefined);
        setNewPhoneNumberExists(null);

        checkPhoneNumber({ phoneNumber })
            .then((result) => {
                if (result.data?.success) {
                    const exists = result.data.data?.exists ?? false;
                    setNewPhoneNumberExists(exists);
                    if (exists) {
                        setNewContactNumberError("Contact number already exists for a patient");
                    } else {
                        setNewContactNumberError(undefined);
                    }
                } else {
                    setNewPhoneNumberExists(false);
                    setNewContactNumberError(undefined);
                }
            })
            .catch((error) => {
                console.error("Error checking new phone number:", error);
                setNewPhoneNumberExists(null);
                setNewContactNumberError("Unable to verify new contact number. Please try again.");
            })
            .finally(() => {
                setIsCheckingNewPhoneNumber(false);
            });
    }, [checkPhoneNumber]);

    // Check if new contact number already exists when user completes 10 digits
    useEffect(() => {
        const newContactNumber = formik.values.newContactNumber;
        if (newContactNumber.length === 10 && /^\d{10}$/.test(newContactNumber)) {
            runNewContactNumberCheck(newContactNumber);
        } else if (newContactNumber.length < 10) {
            setNewPhoneNumberExists(null);
            setNewContactNumberError(undefined);
        }
    }, [formik.values.newContactNumber, runNewContactNumberCheck]);

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
            setNewPhoneNumberExists(null);
            setIsCheckingNewPhoneNumber(false);
            setNewContactNumberError(undefined);
            setFetchedRegistrationId(null);
            setPatientName(null);
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
                closeOnOutsideClick={false}
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
                                const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                                formik.setFieldValue("oldContactNumber", value, false);
                                // Reset validation state when user types
                                if (value.length !== 10) {
                                    setPhoneNumberExists(null);
                                    setOldContactNumberError(undefined);
                                }
                            }}
                            onBlur={() => {
                                formik.setFieldTouched("oldContactNumber", true);
                                formik.validateField("oldContactNumber");
                            }}
                            placeholder="Enter 10 digit old mobile number"
                            type="tel"
                            maxLength={10}
                            error={
                                formik.touched.oldContactNumber
                                    ? oldContactNumberError || formik.errors.oldContactNumber
                                    : oldContactNumberError
                            }
                            disabled={disableOldContactNumber || isCheckingPhoneNumber}
                            readOnly={disableOldContactNumber}
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
                                if (value.length !== 10) {
                                    setNewPhoneNumberExists(null);
                                    setNewContactNumberError(undefined);
                                }
                            }}
                            onBlur={() => {
                                formik.setFieldTouched("newContactNumber", true);
                                formik.validateField("newContactNumber");
                            }}
                            placeholder="Enter 10 digit mobile number"
                            type="tel"
                            maxLength={10}
                            error={
                                formik.touched.newContactNumber
                                    ? newContactNumberError || formik.errors.newContactNumber
                                    : newContactNumberError
                            }
                        />
                    </div>

                    {/* Remarks */}
                    <div>
                        <FormTextareaField
                            label="Remarks"
                            value={formik.values.remarks}
                            onChange={(e) => {
                                let value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                                value = value.replace(/^\s+/, "");
                                value = value.replace(/(.)\1{2,}/g, "$1$1");
                                if (value.length > 0) {
                                    value = value.charAt(0).toUpperCase() + value.slice(1);
                                }
                                value = value.slice(0, 100);
                                formik.setFieldValue("remarks", value, false);
                            }}
                            onBlur={() => {
                                formik.setFieldTouched("remarks", true);
                                formik.validateField("remarks");
                            }}
                            placeholder="Enter remarks (optional)"
                            maxLength={100}
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
                            isLoading={isUpdating || formik.isSubmitting || isCheckingPhoneNumber || isCheckingNewPhoneNumber}
                            disabled={
                                isUpdating ||
                                formik.isSubmitting ||
                                isCheckingPhoneNumber ||
                                isCheckingNewPhoneNumber ||
                                phoneNumberExists === false ||
                                newPhoneNumberExists === true ||
                                (formik.values.oldContactNumber.length === 10 && phoneNumberExists === null) ||
                                (formik.values.newContactNumber.length === 10 && newPhoneNumberExists === null)
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


"use client";

import { useState, useCallback, useMemo } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Dialog, Button, FormInputField, FormTextareaField, MessageDialog, Tooltip } from "@/components/ui";
import {
    useGetArogyaCardSeriesQuery,
    useLazyCheckJsHealthCardAssignmentQuery,
    useCreateChangeHealthCardRequestMutation,
} from "@/store/api/registrationApi";
import { useSelector } from "react-redux";
import { selectUserId, selectUserBranchId, selectSelectedBranch } from "@/store/slices/authSlice";
import type { RootState } from "@/store";

interface UpdateHealthCardDialogProps {
    open: boolean;
    onClose: () => void;
    currentHealthCardNo?: string;
    registrationId?: number | string;
    uhid?: string;
    phone?: string;
    branchId?: number | string;
    arogyaCardSeries?: any[];
    onSuccess?: (newHealthCardNo: string) => void;
}

const validationSchema = Yup.object().shape({
    oldHealthCardNumber: Yup.string()
        .trim()
        .required("Old HealthCard Number is required"),
    newHealthCardNumber: Yup.string()
        .trim()
        .required("New HealthCard Number is required")
        .matches(/^\d+$/, "HealthCard Number must contain only digits")
        .length(12, "HealthCard Number must be exactly 12 digits"),
    remarks: Yup.string()
        .trim()
        .max(250, "Remarks must be at most 250 characters")
        .optional(),
});

export default function UpdateHealthCardDialog({
    open,
    onClose,
    currentHealthCardNo = "",
    registrationId,
    uhid = "",
    phone = "",
    branchId: branchIdProp,
    arogyaCardSeries: arogyaCardSeriesProp,
    onSuccess,
}: UpdateHealthCardDialogProps) {
    const userId = useSelector((state: RootState) => selectUserId(state));
    const authBranchId = useSelector((state: RootState) => selectUserBranchId(state));
    const selectedBranch = useSelector((state: RootState) => selectSelectedBranch(state));
    const resolvedBranchId = Number(branchIdProp || selectedBranch?.id || authBranchId || 1);

    // Fetch Arogya Card Series if not provided as prop
    const { data: fetchedSeriesRes } = useGetArogyaCardSeriesQuery(
        { branchId: resolvedBranchId },
        { skip: Boolean(arogyaCardSeriesProp && arogyaCardSeriesProp.length > 0) }
    );

    const activeSeriesList = useMemo(() => {
        if (Array.isArray(arogyaCardSeriesProp) && arogyaCardSeriesProp.length > 0) {
            return arogyaCardSeriesProp;
        }
        if (fetchedSeriesRes?.data && Array.isArray(fetchedSeriesRes.data)) {
            return fetchedSeriesRes.data;
        }
        return [];
    }, [arogyaCardSeriesProp, fetchedSeriesRes]);

    const isNoSeriesAssigned = useMemo(() => {
        return activeSeriesList.length === 0;
    }, [activeSeriesList]);

    const [checkJsHealthCardQuery] = useLazyCheckJsHealthCardAssignmentQuery();
    const [createChangeHealthCardRequest, { isLoading: isSubmittingApi }] = useCreateChangeHealthCardRequestMutation();

    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [apiErrorMessage, setApiErrorMessage] = useState("");

    const [newCardError, setNewCardError] = useState<string | undefined>(undefined);
    const [isCheckingCardNumber, setIsCheckingCardNumber] = useState(false);
    const [isCardAlreadyAssigned, setIsCardAlreadyAssigned] = useState<boolean | null>(null);

    const runCardValidation = useCallback(async (cardNumber: string) => {
        const cleanVal = cardNumber.replace(/\D/g, "");
        if (cleanVal.length !== 12) {
            setNewCardError(undefined);
            setIsCardAlreadyAssigned(null);
            return;
        }

        // 1. Check if same as old health card number
        if (currentHealthCardNo && cleanVal === currentHealthCardNo.replace(/\D/g, "")) {
            setNewCardError("New HealthCard Number must be different from old HealthCard Number");
            setIsCardAlreadyAssigned(null);
            return;
        }

        // 2. Card Series range check
        if (activeSeriesList.length > 0) {
            const match = activeSeriesList.find((series: any) => {
                const sStart = String(series.seriesStart || "").replace(/\D/g, "");
                const sEnd = String(series.seriesEnd || "").replace(/\D/g, "");
                if (!sStart || !sEnd) return false;

                const valNum = Number(cleanVal);
                const startNum = Number(sStart);
                const endNum = Number(sEnd);
                return valNum >= startNum && valNum <= endNum;
            });

            if (!match) {
                const listStr = activeSeriesList
                    .map((series: any) => `${series.cardName} (${series.seriesStart}-${series.seriesEnd})`)
                    .join(" | ");
                setNewCardError(`Please match the series under the assigned card series : ${listStr}`);
                setIsCardAlreadyAssigned(null);
                return;
            }
        }

        // 3. API Check for already assigned healthcard number
        setIsCheckingCardNumber(true);
        setNewCardError(undefined);
        try {
            const result = await checkJsHealthCardQuery({ cardNumber: cleanVal }).unwrap();
            if (result.data?.patient) {
                setIsCardAlreadyAssigned(true);
                setNewCardError("Health Card No. already assigned to another patient");
            } else {
                setIsCardAlreadyAssigned(false);
                setNewCardError(undefined);
            }
        } catch (err) {
            console.error("Error checking healthcard assignment:", err);
            setIsCardAlreadyAssigned(null);
        } finally {
            setIsCheckingCardNumber(false);
        }
    }, [currentHealthCardNo, activeSeriesList, checkJsHealthCardQuery]);

    const formik = useFormik({
        initialValues: {
            oldHealthCardNumber: currentHealthCardNo || "",
            newHealthCardNumber: "",
            remarks: "",
        },
        validationSchema,
        enableReinitialize: true,
        onSubmit: async (values, { setSubmitting, resetForm }) => {
            try {
                if (values.newHealthCardNumber === values.oldHealthCardNumber) {
                    setApiErrorMessage("New HealthCard Number must be different from old HealthCard Number");
                    setShowApiErrorDialog(true);
                    setSubmitting(false);
                    return;
                }

                if (newCardError) {
                    setApiErrorMessage(newCardError);
                    setShowApiErrorDialog(true);
                    setSubmitting(false);
                    return;
                }

                if (isCardAlreadyAssigned === true) {
                    setApiErrorMessage("Health Card No. already assigned to another patient");
                    setShowApiErrorDialog(true);
                    setSubmitting(false);
                    return;
                }

                const resolvedUhid = String(uhid || "").trim();
                const resolvedRegId = Number(registrationId) || 0;

                if (!resolvedUhid || resolvedRegId < 1) {
                    setApiErrorMessage(
                        !resolvedUhid && resolvedRegId < 1
                            ? "uhid should not be empty and registrationId must not be less than 1"
                            : !resolvedUhid
                            ? "uhid should not be empty"
                            : "registrationId must not be less than 1"
                    );
                    setShowApiErrorDialog(true);
                    setSubmitting(false);
                    return;
                }

                const payload = {
                    uhid: resolvedUhid,
                    registrationId: resolvedRegId,
                    branchId: Number(resolvedBranchId),
                    phone: phone || "",
                    newCardNumber: values.newHealthCardNumber,
                    reason: values.remarks || "Card barcode is unreadable.",
                    requestedBy: Number(userId) || 1,
                };

                const response = await createChangeHealthCardRequest(payload).unwrap();

                if (response.success !== false) {
                    setSuccessMessage(response.message || "Request send successfully ");
                    setShowSuccessDialog(true);
                    resetForm();
                    onSuccess?.(values.newHealthCardNumber);
                } else {
                    const rawMsg = response.message;
                    const msgStr = Array.isArray(rawMsg) ? rawMsg.join(", ") : rawMsg || "Failed to submit HealthCard change request";
                    setApiErrorMessage(msgStr);
                    setShowApiErrorDialog(true);
                }
            } catch (error: any) {
                console.error("Error submitting HealthCard change request:", error);
                const rawMsg = error?.data?.message || error?.message;
                const msgStr = Array.isArray(rawMsg) ? rawMsg.join(", ") : rawMsg || "Failed to submit HealthCard change request";
                setApiErrorMessage(msgStr);
                setShowApiErrorDialog(true);
            } finally {
                setSubmitting(false);
            }
        },
    });

    const handleClose = () => {
        if (!isSubmittingApi && !formik.isSubmitting) {
            formik.resetForm({
                values: {
                    oldHealthCardNumber: currentHealthCardNo || "",
                    newHealthCardNumber: "",
                    remarks: "",
                },
            });
            setNewCardError(undefined);
            setIsCheckingCardNumber(false);
            setIsCardAlreadyAssigned(null);
            onClose();
        }
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={handleClose}
                title="Update HealthCard"
                width={577}
                closeOnOutsideClick={false}
            >
                <form
                    onSubmit={formik.handleSubmit}
                    className="flex flex-col gap-6"
                >
                    {/* Old HealthCard Number */}
                    <div>
                        <FormInputField
                            label="Old HealthCard Number *"
                            value={formik.values.oldHealthCardNumber}
                            onChange={() => { }}
                            placeholder="Enter 12 digit HealthCard number"
                            type="tel"
                            maxLength={12}
                            disabled={true}
                            readOnly={true}
                        />
                    </div>

                    {/* New HealthCard Number */}
                    <div>
                        {isNoSeriesAssigned ? (
                            <Tooltip content="No card or series number has been assigned to your current branch" position="top" delay={0}>
                                <div className="w-full">
                                    <FormInputField
                                        label="New HealthCard Number *"
                                        value={formik.values.newHealthCardNumber}
                                        onChange={(e) => {
                                            if (isNoSeriesAssigned) return;
                                            const value = e.target.value.replace(/\D/g, "").slice(0, 12);
                                            formik.setFieldValue("newHealthCardNumber", value, false);
                                            if (value.length === 12) {
                                                runCardValidation(value);
                                            } else {
                                                setNewCardError(undefined);
                                                setIsCardAlreadyAssigned(null);
                                            }
                                        }}
                                        onBlur={() => {
                                            if (isNoSeriesAssigned) return;
                                            formik.setFieldTouched("newHealthCardNumber", true);
                                            formik.validateField("newHealthCardNumber");
                                            if (formik.values.newHealthCardNumber.length === 12) {
                                                runCardValidation(formik.values.newHealthCardNumber);
                                            }
                                        }}
                                        placeholder="No card or series number has been assigned to your current branch"
                                        type="tel"
                                        maxLength={12}
                                        disabled={isNoSeriesAssigned}
                                        error={undefined}
                                    />
                                </div>
                            </Tooltip>
                        ) : (
                            <FormInputField
                                label="New HealthCard Number *"
                                value={formik.values.newHealthCardNumber}
                                onChange={(e) => {
                                    if (isNoSeriesAssigned) return;
                                    const value = e.target.value.replace(/\D/g, "").slice(0, 12);
                                    formik.setFieldValue("newHealthCardNumber", value, false);
                                    if (value.length === 12) {
                                        runCardValidation(value);
                                    } else {
                                        setNewCardError(undefined);
                                        setIsCardAlreadyAssigned(null);
                                    }
                                }}
                                onBlur={() => {
                                    if (isNoSeriesAssigned) return;
                                    formik.setFieldTouched("newHealthCardNumber", true);
                                    formik.validateField("newHealthCardNumber");
                                    if (formik.values.newHealthCardNumber.length === 12) {
                                        runCardValidation(formik.values.newHealthCardNumber);
                                    }
                                }}
                                placeholder="Enter 12 digit HealthCard number"
                                type="tel"
                                maxLength={12}
                                disabled={isNoSeriesAssigned}
                                error={
                                    (formik.touched.newHealthCardNumber && formik.errors.newHealthCardNumber) || newCardError
                                }
                            />
                        )}
                    </div>

                    {/* Remarks */}
                    <div>
                        <FormTextareaField
                            label="Remarks"
                            value={formik.values.remarks}
                            onChange={(e) => {
                                if (isNoSeriesAssigned) return;
                                const value = e.target.value.slice(0, 250);
                                formik.setFieldValue("remarks", value, false);
                            }}
                            onBlur={() => {
                                if (isNoSeriesAssigned) return;
                                formik.setFieldTouched("remarks", true);
                                formik.validateField("remarks");
                            }}
                            placeholder="Enter remarks (optional)"
                            maxLength={250}
                            disabled={isNoSeriesAssigned}
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
                            disabled={isSubmittingApi || formik.isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            size="large"
                            isLoading={isSubmittingApi || formik.isSubmitting || isCheckingCardNumber}
                            disabled={
                                isNoSeriesAssigned ||
                                isSubmittingApi ||
                                formik.isSubmitting ||
                                isCheckingCardNumber ||
                                Boolean(newCardError) ||
                                isCardAlreadyAssigned === true
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
                onClose={() => {
                    setShowSuccessDialog(false);
                    handleClose();
                }}
                icon="/icons/SuccessCheck.svg"
                iconBgColor="#E8F5E9"
                message={successMessage}
                confirmText="Success"
                showCancel={false}
                onConfirm={() => {
                    setShowSuccessDialog(false);
                    handleClose();
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
        </>
    );
}

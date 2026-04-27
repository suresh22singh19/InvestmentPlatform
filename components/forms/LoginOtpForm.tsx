"use client";

import React, { useState, useEffect } from "react";
import { Formik, Form } from "formik";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { loginOtpSchema, type LoginOtpFormValues } from "@/lib/validation/schemas";

const OTP_MIN = 4;
const OTP_MAX = 6;

interface LoginOtpFormProps {
  onSubmit: (otp: string) => void | Promise<void>;
  onBack: () => void;
  isLoading?: boolean;
  /** e.g. "OTP sent to registered phone number" */
  infoMessage?: string;
  apiError?: string;
}

export const LoginOtpForm: React.FC<LoginOtpFormProps> = ({
  onSubmit,
  onBack,
  isLoading = false,
  infoMessage,
  apiError,
}) => {
  const [isNavigating, setIsNavigating] = useState(false);
  /** Server error shown only until user edits the field; cleared on input/backspace. */
  const [displayApiError, setDisplayApiError] = useState<string | undefined>(undefined);

  useEffect(() => {
    setDisplayApiError(apiError);
  }, [apiError]);

  const initialValues: LoginOtpFormValues = {
    otp: "",
  };

  return (
    <Formik
      initialValues={initialValues}
      enableReinitialize
      validationSchema={loginOtpSchema}
      validateOnChange={false}
      validateOnBlur={false}
      onSubmit={async (values, { setSubmitting }) => {
        try {
          await onSubmit(values.otp.trim());
          setIsNavigating(true);
        } catch {
          setSubmitting(false);
          setIsNavigating(false);
        }
      }}
    >
      {({
        values,
        errors,
        isSubmitting,
        setFieldValue,
        setFieldError,
        submitCount,
      }) => {
        const len = values.otp.length;
        const canSubmit = len >= OTP_MIN && len <= OTP_MAX;

        return (
          <Form className="space-y-6">
            {infoMessage ? (
              <p className="text-sm text-[#434956] leading-[140%] rounded-lg bg-[#E8F5E9] border border-[#C8E6C9] px-4 py-3">
                {infoMessage}
              </p>
            ) : null}

            <Input
              label="Enter Login OTP"
              type="text"
              name="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={OTP_MAX}
              placeholder="Enter OTP"
              value={values.otp}
              onChange={(e) => {
                const next = e.target.value.replace(/\D/g, "").slice(0, OTP_MAX);
                void setFieldValue("otp", next, false);
                setDisplayApiError(undefined);
                setFieldError("otp", undefined);
              }}
              error={
                displayApiError ||
                (submitCount > 0 && errors.otp ? errors.otp : undefined)
              }
            />

            <Button
              type="submit"
              variant="primary"
              size="large"
              fullWidth
              className="mt-2"
              disabled={
                isSubmitting ||
                isLoading ||
                isNavigating ||
                !canSubmit
              }
              isLoading={isSubmitting || isLoading || isNavigating}
            >
              Verify &amp; Sign In
            </Button>

            <button
              type="button"
              onClick={onBack}
              disabled={isSubmitting || isLoading || isNavigating}
              className="w-full text-center text-[#0B8C00] text-base font-normal leading-[120%] hover:underline focus:outline-none transition-colors cursor-pointer disabled:opacity-50"
            >
              Back to login
            </button>
          </Form>
        );
      }}
    </Formik>
  );
};

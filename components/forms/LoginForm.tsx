"use client";

import React, { useState } from "react";
import { Formik, Form } from "formik";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { loginSchema, LoginFormValues } from "@/lib/validation/schemas";
import { LoginType } from "@/types/auth";

interface LoginFormProps {
  onSubmit: (values: LoginFormValues) => void | Promise<void>;
  onAlternativeLogin?: (type: LoginType) => void;
  onForgotPassword?: () => void;
  initialValues?: Partial<LoginFormValues>;
  isLoading?: boolean;
  apiErrors?: {
    email?: string;
    password?: string;
  };
  onClearFieldError?: (field: "email" | "password") => void;
  onRememberMeChange?: (checked: boolean) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  onAlternativeLogin,
  onForgotPassword,
  initialValues = {},
  isLoading = false,
  apiErrors,
  onClearFieldError,
  onRememberMeChange,
}) => {
  const [isNavigating, setIsNavigating] = useState(false);
  
  const defaultInitialValues: LoginFormValues = {
    email: "",
    password: "",
    rememberMe: true,
    ...initialValues,
  };

  return (
    <Formik
      initialValues={defaultInitialValues}
      enableReinitialize={true}
      validationSchema={loginSchema}
      onSubmit={async (values, { setSubmitting }) => {
        try {
          await onSubmit(values);
          // If onSubmit completes without error, we're navigating
          // Keep button disabled until navigation completes
          setIsNavigating(true);
          // Don't reset setSubmitting on success - let navigation happen
          // The component will unmount when navigation completes
        } catch (error) {
          // Reset submitting state and navigation state on error so user can try again
          setSubmitting(false);
          setIsNavigating(false);
          // Re-throw to let Formik handle the error
          throw error;
        }
      }}
    >
      {({
        values,
        errors,
        touched,
        handleChange,
        handleBlur,
        isSubmitting,
        setFieldValue,
      }) => (
        <Form className="space-y-6">
          {/* Email Input */}
          <Input
            label="Enter Your Email ID"
            type="email"
            name="email"
            placeholder="Enter Your Email..."
            value={values.email}
            onChange={(event) => {
              handleChange(event);
              onClearFieldError?.("email");
            }}
            onBlur={handleBlur}
            error={
              apiErrors?.email ||
              (touched.email && errors.email ? errors.email : undefined)
            }
          />

          {/* Password Input */}
          <Input
            label="Enter Your Password"
            type="password"
            name="password"
            placeholder="Enter Your Password..."
            value={values.password}
            onChange={(event) => {
              handleChange(event);
              onClearFieldError?.("password");
            }}
            onBlur={handleBlur}
            error={
              apiErrors?.password ||
              (touched.password && errors.password ? errors.password : undefined)
            }
          />

          {/* Remember Me Toggle and Forgot Password */}
          <div className="flex items-center justify-between">
            <Toggle
              checked={values.rememberMe}
              onChange={(checked) => {
                setFieldValue("rememberMe", checked);
                onRememberMeChange?.(checked);
              }}
              label="Remember me"
            />
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-[#0B8C00] text-base font-normal leading-[120%] hover:underline focus:outline-none transition-colors cursor-pointer"
            >
              Forgot Password
            </button>
          </div>

          {/* Sign In Button */}
          <Button
            type="submit"
            variant="primary"
            size="large"
            fullWidth
            className="mt-4"
            disabled={isSubmitting || isLoading || isNavigating}
            isLoading={isSubmitting || isLoading || isNavigating}
          >
            Sign In
          </Button>
        </Form>
      )}
    </Formik>
  );
};
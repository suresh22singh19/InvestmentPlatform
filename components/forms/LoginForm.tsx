"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Formik, Form } from "formik";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { loginSchema, LoginFormValues } from "@/lib/validation/schemas";
import { LoginType } from "@/types/auth";

/** Return `'otp'` when the server requires an OTP step (do not treat as navigation). */
export type LoginSubmitPhase = "otp" | void;

interface LoginFormProps {
  onSubmit: (values: LoginFormValues) => void | Promise<void | LoginSubmitPhase>;
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
          const phase = await onSubmit(values);
          if (phase === "otp") {
            setSubmitting(false);
            return;
          }
          // If onSubmit completes without error, we're navigating
          setIsNavigating(true);
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
          <div className="flex items-center justify-between pt-1">
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
              className="text-amber-400 text-sm font-extrabold hover:text-amber-300 focus:outline-none transition-colors cursor-pointer"
            >
              Forgot Password
            </button>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={isSubmitting || isLoading || isNavigating}
            className="w-full mt-6 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 text-slate-950 font-black text-base tracking-wide shadow-lg shadow-amber-500/20 hover:from-amber-300 hover:to-yellow-300 transition-all duration-200 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting || isLoading || isNavigating ? (
              <span className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-slate-950 border-t-transparent" />
            ) : (
              "Sign In"
            )}
          </button>

          {/* Sign Up Navigation Link */}
          <div className="pt-2 text-center">
            <span className="text-sm text-slate-400 font-medium">Don't have an account? </span>
            <Link
              href="/signup"
              className="text-amber-400 font-extrabold hover:text-amber-300 text-sm inline-block transition-colors underline cursor-pointer ml-1"
            >
              Sign Up
            </Link>
          </div>
        </Form>
      )}
    </Formik>
  );
};
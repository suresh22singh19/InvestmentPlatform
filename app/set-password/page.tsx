"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Formik, Form } from "formik";
import { Logo } from "@/components/ui/Logo";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { MessageDialog } from "@/components/ui/MessageDialog";
import {
  useSetUserPasswordMutation,
  useCheckSetPasswordStatusQuery,
} from "@/store/api/authApi";
import { resetPasswordSchema } from "@/lib/validation/schemas";
import {
  decodeJwtPayload,
  type PasswordFlowTokenPayload,
} from "@/lib/utils/decodeJwtPayload";

export default function SetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");
  const payload = useMemo(
    () => (token ? decodeJwtPayload<PasswordFlowTokenPayload>(token) : null),
    [token]
  );

  const isNurse = payload?.loginUserType?.toLowerCase() === "nurse";
  const isDoctor = payload?.loginUserType?.toLowerCase() === "doctor";
  const isUser = payload?.loginUserType?.toLowerCase() === "user";

  // Call checkSetPasswordStatus only for nurse/doctor users with a valid token
  const {
    data: statusData,
    isLoading: isStatusLoading,
    isError: isStatusError,
  } = useCheckSetPasswordStatusQuery(token as string, {
    skip: !token || (!isNurse && !isUser && !isDoctor),
  });

  // Redirect nurse/doctor if password is already set
  useEffect(() => {
    if ((isNurse || isDoctor || isUser) && statusData?.data?.isUserSetPassword === "yes") {
      router.replace("/");
    }
  }, [isNurse, isDoctor, isUser, statusData, router]);

  const email = payload?.email;
  const loginType = payload?.login_type;
  const [setUserPassword, { isLoading }] = useSetUserPasswordMutation();
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});

  const navigateToLogin = () => {
    if (loginType) {
      router.push(`/`);
    } else {
      router.push("/");
    }
  };

  // Show loader while checking password status for nurse/doctor users
  if ((isNurse || isDoctor || isUser) && isStatusLoading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center px-4 py-8">
        <p className="text-sm text-[#434956]">Loading…</p>
      </div>
    );
  }

// Show error if the status check failed for nurse/doctor users
if ((isNurse || isDoctor || isUser) && isStatusError) {
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md p-6 rounded-lg bg-red-50 border border-red-200 shadow-sm">
        <p className="text-sm text-red-600 mb-4 text-center">
          Unable to verify your set-password link. Please request a new link.
        </p>

        <Button
          variant="primary"
          size="large"
          fullWidth
          onClick={navigateToLogin}
        >
          Back to Login
        </Button>
      </div>
    </div>
  );
}

// Prevent flash of the form while the redirect is pending
// (useEffect fires after the first render, so we guard here too)
if ((isNurse || isDoctor || isUser) && statusData?.data?.isUserSetPassword === "yes") {
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-4 py-8">
      <p className="text-sm text-[#434956]">Redirecting…</p>
    </div>
  );
}

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-[480px]">
        <div className="flex justify-start mb-6">
          <Logo />
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#434956] mb-2">
            Set a New Password
          </h1>
          <p className="text-sm text-[#434956] leading-[120%]">
            Create an initial password to access your account.
          </p>
        </div>

        {!token || !email ? (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-600">
              Invalid set password link. Please request a new set password link.
            </p>
          </div>
        ) : (
          <Formik
            initialValues={{
              password: "",
              confirmPassword: "",
            }}
            validationSchema={resetPasswordSchema}
            onSubmit={async (values, { setSubmitting }) => {
              setFieldErrors({});

              try {
                const result = await setUserPassword({
                  email,
                  password: values.password,
                  confirm_password: values.confirmPassword,
                  token: token,
                }).unwrap();

                setSuccessMessage(
                  result?.message || "Password set successfully!"
                );
                setShowSuccessDialog(true);
              } catch (error: any) {
                console.error("Set password error:", error);

                const apiMessage = error?.data?.message || error?.data?.error;
                if (apiMessage) {
                  const lowerMessage = apiMessage.toLowerCase();
                  if (lowerMessage.includes("password")) {
                    setFieldErrors({ password: apiMessage });
                  } else if (lowerMessage.includes("confirm")) {
                    setFieldErrors({ confirmPassword: apiMessage });
                  } else {
                    setFieldErrors({ password: apiMessage });
                  }
                } else {
                  setFieldErrors({
                    password: "Unable to set password. Please try again.",
                  });
                }
              } finally {
                setSubmitting(false);
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
            }) => (
              <Form className="space-y-6">
                <Input
                  label="Enter Password"
                  type="password"
                  name="password"
                  placeholder="Enter Password..."
                  value={values.password}
                  onChange={(event) => {
                    handleChange(event);
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  onBlur={handleBlur}
                  error={
                    fieldErrors?.password ||
                    (touched.password && errors.password
                      ? errors.password
                      : undefined)
                  }
                />

                <Input
                  label="Confirm Password"
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm Password..."
                  value={values.confirmPassword}
                  onChange={(event) => {
                    handleChange(event);
                    setFieldErrors((prev) => ({
                      ...prev,
                      confirmPassword: undefined,
                    }));
                  }}
                  onBlur={handleBlur}
                  error={
                    fieldErrors?.confirmPassword ||
                    (touched.confirmPassword && errors.confirmPassword
                      ? errors.confirmPassword
                      : undefined)
                  }
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="large"
                  fullWidth
                  disabled={isSubmitting || isLoading}
                >
                  {isSubmitting || isLoading ? "Submitting..." : "Submit"}
                </Button>
              </Form>
            )}
          </Formik>
        )}

        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-[#EBECED]"></div>
          <span className="px-4 text-xs text-[#434956]">Or</span>
          <div className="flex-1 border-t border-[#EBECED]"></div>
        </div>

        <Button
          variant="primary"
          size="large"
          fullWidth
          onClick={navigateToLogin}
        >
          Back to Login
        </Button>
      </div>

      <MessageDialog
        open={showSuccessDialog}
        onClose={() => {
          setShowSuccessDialog(false);
          navigateToLogin();
        }}
        icon="/icons/SuccessCheck.svg"
        iconBgColor="#E8F5E9"
        message={successMessage || "Password set successfully!"}
        confirmText="Back to Login"
        showCancel={false}
        onConfirm={() => {
          setShowSuccessDialog(false);
          navigateToLogin();
        }}
      />
    </div>
  );
}

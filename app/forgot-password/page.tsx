"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { MessageDialog } from "@/components/ui/MessageDialog";
import { LoginType } from "@/types/auth";
import { useForgotPasswordMutation } from "@/store/api/authApi";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();
  const allowedLoginTypes: LoginType[] = [
    "admin",
    "doctor",
    "nurse",
    "team",
    "field-user",
  ];
  const paramType = searchParams.get("type");
  const returnType =
    paramType && allowedLoginTypes.includes(paramType as LoginType)
      ? (paramType as LoginType)
      : null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    // Clear previous errors
    setError(null);
    setSuccessMessage(null);
    
    try {
      const response = await forgotPassword({
        login_type: returnType ?? "admin",
        email: email.trim(),
      }).unwrap();
      
      // Show success message
      setSuccessMessage(response?.message ?? "Password reset instructions sent successfully.");
      setShowSuccessModal(true);
    } catch (apiError: any) {
      console.error("Forgot password error:", apiError);
      
      // Extract error message from API response
      // API returns: { success: false, message: "...", error: "..." }
      const apiMessage = apiError?.data?.message || apiError?.data?.error;
      
      if (apiMessage) {
        setError(apiMessage); // This will show below the email input
      } else if (apiError?.status === 503 || apiError?.status === "FETCH_ERROR") {
        setError("Server is unavailable. Please try again later.");
      } else {
        setError("Unable to process request. Please try again.");
      }
    }
  };

  const navigateToLogin = () => {
    if (returnType) {
      router.push(`/?type=${encodeURIComponent(returnType)}`);
      return;
    }

    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-[480px]">
        <div className="flex justify-start mb-6">
          <Logo />
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#434956] mb-2">
            Forgot Password
          </h1>
          <p className="text-sm text-[#434956] leading-[120%]">
            Don’t worry! Just enter your email address and we’ll help you reset
            your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Enter Your Email ID"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (error) setError(null);
            }}
            placeholder="Enter Your Email..."
            error={error ?? undefined}
          />

          <Button
            type="submit"
            variant="primary"
            size="large"
            fullWidth
            disabled={isLoading}
          >
            {isLoading ? "Submitting..." : "Submit"}
          </Button>
        </form>

        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-[#EBECED]"></div>
          <span className="px-4 text-xs text-[#434956]">Or</span>
          <div className="flex-1 border-t border-[#EBECED]"></div>
        </div>

        <Button
          variant="outline"
          size="large"
          fullWidth
            onClick={navigateToLogin}
        >
          Back to Login
        </Button>
      </div>

      <MessageDialog
        open={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          navigateToLogin();
        }}
        icon="/icons/SuccessCheck.svg"
        iconBgColor="#E8F5E9"
        message={successMessage || "Password reset instructions sent successfully"}
        confirmText="Back to Login"
        showCancel={false}
        onConfirm={() => {
          setShowSuccessModal(false);
          navigateToLogin();
        }}
      />
    </div>
  );
}


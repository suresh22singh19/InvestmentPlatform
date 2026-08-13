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
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
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
  const paramType = searchParams?.get("type");
  const returnType =
    paramType && allowedLoginTypes.includes(paramType as LoginType)
      ? (paramType as LoginType)
      : null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim()) {
      setErrorMessage("Email is required");
      setShowErrorDialog(true);
      return;
    }

    // Clear previous errors
    setShowErrorDialog(false);
    setErrorMessage("");
    setSuccessMessage(null);
    
    try {
      const response = await forgotPassword({
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
        setErrorMessage(apiMessage);
        setShowErrorDialog(true);
      } else if (apiError?.status === 503 || apiError?.status === "FETCH_ERROR") {
        setErrorMessage("Server is unavailable. Please try again later.");
        setShowErrorDialog(true);
      } else {
        setErrorMessage("Unable to process request. Please try again.");
        setShowErrorDialog(true);
      }
    }
  };

  const navigateToLogin = () => {
    if (returnType) {
      router.push(`/`);
      return;
    }

    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center relative overflow-hidden px-4 py-12">
      {/* Background Ambient Spotlights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-[480px] relative z-10">
        {/* Dark Glass Card Container */}
        <div className="p-8 md:p-10 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl">
          {/* Logo Badge */}
          <div className="flex justify-center mb-8">
            <Logo />
          </div>

          <div className="mb-6 text-center">
            <h1 className="text-2xl font-black text-white tracking-tight">
              Forgot Password
            </h1>
            <p className="text-sm text-slate-400 font-medium mt-1">
              Don’t worry! Just enter your email address and we’ll help you reset your password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Enter Your Email ID"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (showErrorDialog) {
                  setShowErrorDialog(false);
                  setErrorMessage("");
                }
              }}
              placeholder="Enter Your Email..."
            />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 text-slate-950 font-black text-base tracking-wide shadow-lg shadow-amber-500/20 hover:from-amber-300 hover:to-yellow-300 transition-all duration-200 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <span className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-slate-950 border-t-transparent" />
              ) : (
                "Submit"
              )}
            </button>
          </form>

          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-slate-800"></div>
            <span className="px-4 text-xs text-slate-500 font-semibold uppercase">Or</span>
            <div className="flex-1 border-t border-slate-800"></div>
          </div>

          <button
            type="button"
            onClick={navigateToLogin}
            className="w-full py-3.5 px-6 rounded-2xl bg-slate-900 text-slate-200 hover:text-white font-extrabold text-base border border-slate-800 hover:bg-slate-800 transition-all duration-200 cursor-pointer"
          >
            Back to Login
          </button>
        </div>
      </div>

      {/* Success Dialog */}
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

      {/* Error Dialog */}
      <MessageDialog
        open={showErrorDialog}
        onClose={() => {
          setShowErrorDialog(false);
        }}
        icon="/icons/CrossIcon.svg"
        iconBgColor="#FFEBEE"
        message={errorMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => {
          setShowErrorDialog(false);
        }}
      />
    </div>
  );
}


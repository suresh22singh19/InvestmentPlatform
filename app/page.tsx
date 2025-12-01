"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { SegmentedButtonGroup } from "@/components/ui/SegmentedButtonGroup";
import { LoginForm } from "@/components/forms/LoginForm";
import { useLoginMutation } from "@/store/api/authApi";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials } from "@/store/slices/authSlice";
import { LoginFormValues } from "@/lib/validation/schemas";
import { LoginType } from "@/types/auth";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useAppDispatch();
  const [activeLoginType, setActiveLoginType] = useState<LoginType>("admin");
  const [doctorRole, setDoctorRole] = useState<LoginType>("doctor");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Load saved credentials and rememberMe state from localStorage synchronously
  const getSavedCredentials = (): {
    email: string;
    password: string;
    rememberMe: boolean;
  } | null => {
    if (typeof window === "undefined") return null;
    
    const savedEmail = localStorage.getItem("rememberedEmail");
    const savedPassword = localStorage.getItem("rememberedPassword");
    const savedRememberMe = localStorage.getItem("rememberMe") === "true";
    
    // Get last rememberMe checkbox state (even if credentials don't exist)
    const lastRememberMeState = localStorage.getItem("lastRememberMeState") === "true";

    if (savedEmail && savedPassword && savedRememberMe) {
      return {
        email: savedEmail,
        password: savedPassword,
        rememberMe: savedRememberMe,
      };
    }
    
    // Return null but we'll use lastRememberMeState for the checkbox
    return null;
  };

  const getLastRememberMeState = (): boolean => {
    if (typeof window === "undefined") return true;
    const lastState = localStorage.getItem("lastRememberMeState");
    return lastState === "true" || lastState === null; // Default to true if not set
  };

  const [savedCredentials, setSavedCredentials] = useState<{
    email: string;
    password: string;
    rememberMe: boolean;
  } | null>(getSavedCredentials());
  
  const [lastRememberMeState, setLastRememberMeState] = useState<boolean>(getLastRememberMeState());
  const allowedLoginTypes: LoginType[] = [
    "admin",
    "doctor",
    "nurse",
    "team",
    "field-user",
  ];
  const searchParamsString = searchParams.toString();

  useEffect(() => {
    const typeParam = searchParams.get("type");
    if (!typeParam) {
      return;
    }

    if (allowedLoginTypes.includes(typeParam as LoginType)) {
      const loginType = typeParam as LoginType;
      setActiveLoginType(loginType);
      if (loginType === "doctor" || loginType === "nurse") {
        setDoctorRole(loginType);
      }
    }

    router.replace("/", { scroll: false });
  }, [searchParamsString, router]);

  const isDoctorFlow = activeLoginType === "doctor" || activeLoginType === "nurse";
  const isTeamFlow = activeLoginType === "team";
  const isFieldUserFlow = activeLoginType === "field-user";

  const clearFieldError = (field: "email" | "password") => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleLogin = async (values: LoginFormValues) => {
    // Clear previous errors
    setFieldErrors({});
    setGeneralError(null);

    try {
      const loginTypeToUse = isDoctorFlow
        ? doctorRole
        : isTeamFlow
        ? "team"
        : isFieldUserFlow
        ? "field-user"
        : "admin";

      // Call login API
      const result = await login({
        login_type: loginTypeToUse,
        email: values.email,
        password: values.password,
      }).unwrap();

      // Save credentials to Redux if login successful
      if (result.data?.access_token && result.data?.user) {
        dispatch(
          setCredentials({
            user: result.data.user,
            token: result.data.access_token,
          })
        );

        // Handle "Remember Me" functionality
        if (typeof window !== "undefined") {
          // Always save the last rememberMe checkbox state
          localStorage.setItem("lastRememberMeState", values.rememberMe ? "true" : "false");
          setLastRememberMeState(values.rememberMe);
          
          if (values.rememberMe) {
            // Save email and password to localStorage
            localStorage.setItem("rememberedEmail", values.email);
            localStorage.setItem("rememberedPassword", values.password);
            localStorage.setItem("rememberMe", "true");
            setSavedCredentials({
              email: values.email,
              password: values.password,
              rememberMe: true,
            });
          } else {
            // Clear saved credentials if rememberMe is false
            localStorage.removeItem("rememberedEmail");
            localStorage.removeItem("rememberedPassword");
            localStorage.removeItem("rememberMe");
            setSavedCredentials(null);
          }
        }

        // Redirect to dashboard
        router.push("/dashboard");
      }
    } catch (error: any) {
      console.error("Login error:", error);

      const apiMessage = error?.data?.message || error?.data?.error;
      if (apiMessage) {
        const lowerMessage = apiMessage.toLowerCase();
        if (lowerMessage.includes("email")) {
          setFieldErrors({ email: apiMessage });
        } else if (lowerMessage.includes("password")) {
          setFieldErrors({ password: apiMessage });
        } else {
          setGeneralError(apiMessage);
        }
        return;
      }

      if (error?.status === 503 || error?.status === "FETCH_ERROR") {
        setGeneralError("Server is unavailable. Please check your connection or try again later.");
      } else {
        setGeneralError("Login failed. Please check your credentials and try again.");
      }
    }
  };

  const handleAlternativeLogin = (type: LoginType) => {
    switch (type) {
      case "doctor":
        setActiveLoginType("doctor");
        setDoctorRole("doctor");
        return;
      case "team":
        setActiveLoginType("team");
        return;
      case "field-user":
        setActiveLoginType("field-user");
        return;
      default:
        setActiveLoginType("admin");
    }
  };

  const handleForgotPassword = () => {
    const typeForForgot = isDoctorFlow ? doctorRole : activeLoginType;
    router.push(`/forgot-password?type=${encodeURIComponent(typeForForgot)}`);
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-[526px]">
        {/* Logo */}
        <div className="flex justify-start mb-6">
          <Logo />
        </div>

        {/* Login Form Container (no background as per design) */}
        <div className="p-0">
          {/* Title Section */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-[#434956] mb-2">
              {isDoctorFlow
                ? "Doctor/Nurse"
                : isTeamFlow
                ? "Clinic Team"
                : isFieldUserFlow
                ? "Field User/Champion"
                : "Admin User"}
            </h1>
            <p className="text-sm text-[#434956] leading-[120%]">
              Sign in to your account and join us
            </p>
          </div>

          {isDoctorFlow && (
            <div className="mb-8">
              <SegmentedButtonGroup<LoginType>
                options={[
                  { label: "Doctor", value: "doctor" },
                  { label: "Nurse", value: "nurse" },
                ]}
                value={doctorRole}
                onChange={(value) => {
                  setDoctorRole(value);
                  setActiveLoginType(value);
                }}
              />
            </div>
          )}

          {/* Error Message */}
          {generalError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-600 font-medium">{generalError}</p>
            </div>
          )}

          {/* Login Form */}
          <LoginForm 
            key={activeLoginType}
            onSubmit={handleLogin} 
            isLoading={isLoading}
            onForgotPassword={handleForgotPassword}
            apiErrors={fieldErrors}
            onClearFieldError={clearFieldError}
            onRememberMeChange={(checked) => {
              // Only save to localStorage, don't update state to prevent form reinitialization
              if (typeof window !== "undefined") {
                localStorage.setItem("lastRememberMeState", checked ? "true" : "false");
              }
            }}
            initialValues={
              savedCredentials
                ? {
                    email: savedCredentials.email,
                    password: savedCredentials.password,
                    rememberMe: savedCredentials.rememberMe,
                  }
                : {
                    email: "",
                    password: "",
                    rememberMe: lastRememberMeState,
                  }
            }
          />

          {!isDoctorFlow && !isTeamFlow && !isFieldUserFlow && (
            <>
              {/* Separator */}
              <div className="flex items-center my-8">
                <div className="flex-1 border-t border-[#EBECED]"></div>
                <span className="px-4 text-xs text-[#434956]">Or Sign in As</span>
                <div className="flex-1 border-t border-[#EBECED]"></div>
              </div>

              {/* Alternative Login Buttons */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    size="large"
                    fullWidth
                    onClick={() => handleAlternativeLogin("doctor")}
                  >
                    Doctor Login
                  </Button>
                  <Button
                    variant="outline"
                    size="large"
                    fullWidth
                    onClick={() => handleAlternativeLogin("team")}
                  >
                    Team Login
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="large"
                  fullWidth
                  onClick={() => handleAlternativeLogin("field-user")}
                >
                  Field User/Champion Login
                </Button>
              </div>
            </>
          )}

          {(isDoctorFlow || isTeamFlow || isFieldUserFlow) && (
            <>
              <div className="flex items-center my-6">
                <div className="flex-1 border-t border-[#EBECED]"></div>
                <span className="px-4 text-xs text-[#434956]">Or</span>
                <div className="flex-1 border-t border-[#EBECED]"></div>
              </div>
              <div className="mt-6">
                <Button
                  variant="outline"
                  size="large"
                  fullWidth
                  onClick={() => {
                    setActiveLoginType("admin");
                    setDoctorRole("doctor");
                  }}
                >
                  Back to Admin Login
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
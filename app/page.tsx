"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { MessageDialog } from "@/components/ui";
import { LoginForm } from "@/components/forms/LoginForm";
import { LoginOtpForm } from "@/components/forms/LoginOtpForm";
import {
  useLoginMutation,
  isLoginSuccessData,
  isLoginOtpRequiredData,
  type LoginResponse,
} from "@/store/api/authApi";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials } from "@/store/slices/authSlice";
import { LoginFormValues } from "@/lib/validation/schemas";
import { encrypt, decrypt } from "@/lib/utils/encryption";
import type { LoginPermissionModule } from "@/store/api/authApi";
import { formatPermissions, hasOnlyGateModuleViewAccess } from "@/utils/permission";

type PendingLogin = {
  email: string;
  password: string;
  rememberMe: boolean;
};

const SUB_MODULE_ROUTE_MAP: Record<string, string> = {
  dashboard: "/dashboard",
  configuration: "/settings/configuration",
  "branch ip network": "/settings/branch-ip-network",
  "duplicate number exceptions": "/settings/duplicate-number-exceptions",
  "manage contact updates": "/settings/manage-contact-updates",
  "discount approval": "/settings/discount-approval",
  "refund approval": "/settings/refund-approval",
  users: "/settings/users",
  panel: "/settings/panel",
  therapy: "/settings/therapy",
  "lab tests": "/settings/lab-tests",
  package: "/settings/package",
  "diet category": "/settings/diet-category",
  "diagnosis diet": "/settings/diet",
  diagnosis: "/settings/diagnosis",
  "sub diagnosis": "/settings/sub-diagnosis",
  "health card management": "/settings/health-card-management",
  support: "/settings/support",
  "misc settings": "/settings/misc-settings",
  facilities: "/settings/facilities",
  hardware: "/settings/hardware",
  "room type master": "/settings/room-type",
  "consultancy service": "/settings/consultancy-service",
  registration: "/registration",
  "registration report": "/reports",
  tokens: "/token",
  vouchers: "/voucher",
  "role master": "/roles&permission/role-master",
  "branch role master": "/roles&permission/banch-role-master",
  "approval level setup": "/roles&permission/approval-level-setup",
  "approval level assignment": "/roles&permission/approval-level-assignment",
  opd: "/registration/registrationList",
  "add hospital/clinic": "/infrastructure",
  "new patient": "/gate/new-patient",
  "revisit patient": "/gate/revisit-patient",
  "opd visitor": "/gate/patient-visitor",
  "ipd visitor": "/gate/ipd-visitor",
  "other visitor": "/gate/other",
  "patient medicine type": "/gate/patient-medicine-type",
  "view daily reports": "/gate/reports",
};

const getPermissionLandingRoute = (permissions?: LoginPermissionModule[]): string | null => {
  if (!permissions?.length) return null;

  /** Prefer Dashboard when visible so mixed roles (e.g. Doctor + Role Master) land on home, not admin. */
  for (const permissionModule of permissions) {
    if (!permissionModule?.isActive) continue;
    for (const subModule of permissionModule.subModules ?? []) {
      if (!subModule?.isActive || !subModule?.canView) continue;
      if (subModule.moduleName.trim().toLowerCase() === "dashboard") {
        return "/dashboard";
      }
    }
  }

  for (const permissionModule of permissions) {
    if (!permissionModule?.isActive) continue;

    for (const subModule of permissionModule.subModules ?? []) {
      if (!subModule?.isActive || !subModule?.canView) continue;
      const route = SUB_MODULE_ROUTE_MAP[subModule.moduleName.trim().toLowerCase()];
      if (route) return route;
    }
  }

  return null;
};

export default function LoginPage() {
  const router = useRouter();
  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useAppDispatch();
  const [authPhase, setAuthPhase] = useState<"credentials" | "otp">("credentials");
  const [pendingLogin, setPendingLogin] = useState<PendingLogin | null>(null);
  const [otpInfoMessage, setOtpInfoMessage] = useState("");
  const [otpFieldError, setOtpFieldError] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  
  // Load saved credentials and rememberMe state from localStorage synchronously
  const getSavedCredentials = (): {
    email: string;
    password: string;
    rememberMe: boolean;
  } | null => {
    if (typeof window === "undefined") return null;
    
    const savedEmail = localStorage.getItem("rememberedEmail");
    const savedPasswordEncrypted = localStorage.getItem("rememberedPassword");
    const savedRememberMe = localStorage.getItem("rememberMe") === "true";
    
    // Get last rememberMe checkbox state (even if credentials don't exist)
    const lastRememberMeState = localStorage.getItem("lastRememberMeState") === "true";

    if (savedEmail && savedPasswordEncrypted && savedRememberMe) {
      // Decrypt the password
      const savedPassword = decrypt(savedPasswordEncrypted);
      
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

  const clearFieldError = (field: "email" | "password") => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const finalizeSuccessfulLogin = useCallback(
    async (result: LoginResponse, values: LoginFormValues) => {
      if (!isLoginSuccessData(result.data)) return;

      dispatch(
        setCredentials({
          user: result.data.user,
          permissions: result.data.permissions ?? [],
          branch_access: result.data.branch_access ?? [],
          login_type: result.data.login_type,
          access_token: result.data.access_token,
          token_type: result.data.token_type,
          expires_in: result.data.expires_in,
        })
      );

      if (typeof window !== "undefined") {
        localStorage.setItem("lastRememberMeState", values.rememberMe ? "true" : "false");
        setLastRememberMeState(values.rememberMe);

        if (values.rememberMe) {
          localStorage.setItem("rememberedEmail", values.email);
          localStorage.setItem("rememberedPassword", encrypt(values.password));
          localStorage.setItem("rememberMe", "true");
          setSavedCredentials({
            email: values.email,
            password: values.password,
            rememberMe: true,
          });
        } else {
          localStorage.removeItem("rememberedEmail");
          localStorage.removeItem("rememberedPassword");
          localStorage.removeItem("rememberMe");
          setSavedCredentials(null);
        }
      }

      const loginType = result.data.login_type?.toLowerCase();
      const permissionsMap = formatPermissions(result.data.permissions ?? []);

      if (loginType === "clinic user") {
        router.push("/registration");
      } else if (loginType === "hospital user") {
        router.push("/registration/hospital");
      } else if (loginType === "nurse") {
        router.push("/registration/registrationList");
      } else if (hasOnlyGateModuleViewAccess(permissionsMap)) {
        router.push("/gate");
      } else if (loginType?.includes("gate")) {
        router.push("/gate");
      } else {
        router.push(getPermissionLandingRoute(result.data.permissions) ?? "/dashboard");
      }
    },
    [dispatch, router]
  );

  const parseApiErrorMessage = (error: unknown): string | undefined => {
    const err = error as {
      data?: { message?: string | string[]; error?: string };
      status?: number | string;
    };
    let apiMessage: string | undefined;
    if (err?.data?.message) {
      apiMessage = Array.isArray(err.data.message) ? err.data.message[0] : err.data.message;
    }
    if (!apiMessage) apiMessage = err?.data?.error;
    return apiMessage;
  };

  const handleLogin = async (values: LoginFormValues) => {
    setFieldErrors({});
    setShowErrorDialog(false);
    setErrorMessage("");

    try {
      const result = await login({
        email: values.email,
        password: values.password,
      }).unwrap();

      if (isLoginOtpRequiredData(result.data)) {
        setPendingLogin({
          email: values.email,
          password: values.password,
          rememberMe: values.rememberMe,
        });
        setOtpInfoMessage(result.message || "OTP sent to registered phone number");
        setOtpFieldError(undefined);
        setAuthPhase("otp");
        return "otp" as const;
      }

      if (isLoginSuccessData(result.data)) {
        await finalizeSuccessfulLogin(result, values);
      }
    } catch (error: unknown) {
      console.error("Login error:", error);

      const apiMessage = parseApiErrorMessage(error);

      if (apiMessage) {
        const lowerMessage = typeof apiMessage === "string" ? apiMessage.toLowerCase() : "";
        if (lowerMessage.includes("email")) {
          setFieldErrors({ email: apiMessage });
          setErrorMessage(apiMessage);
          setShowErrorDialog(true);
        } else if (lowerMessage.includes("password")) {
          setFieldErrors({ password: apiMessage });
          setErrorMessage(apiMessage);
          setShowErrorDialog(true);
        } else {
          setErrorMessage(apiMessage);
          setShowErrorDialog(true);
        }
        throw new Error(apiMessage);
      }

      const err = error as { status?: number | string };
      if (err?.status === 503 || err?.status === "FETCH_ERROR") {
        const errorMsg = "Server is unavailable. Please check your connection or try again later.";
        setErrorMessage(errorMsg);
        setShowErrorDialog(true);
        throw new Error(errorMsg);
      }
      const errorMsg = "Login failed. Please check your credentials and try again.";
      setErrorMessage(errorMsg);
      setShowErrorDialog(true);
      throw new Error(errorMsg);
    }
  };

  const handleVerifyOtp = async (otp: string) => {
    if (!pendingLogin) {
      throw new Error("Session expired. Please sign in again.");
    }
    setOtpFieldError(undefined);
    setShowErrorDialog(false);
    setErrorMessage("");

    try {
      const result = await login({
        email: pendingLogin.email,
        password: pendingLogin.password,
        otp,
      }).unwrap();

      if (isLoginOtpRequiredData(result.data)) {
        setOtpInfoMessage(result.message || otpInfoMessage);
        setOtpFieldError("A new OTP was sent. Enter the latest code.");
        throw new Error(result.message || "New OTP required");
      }

      if (isLoginSuccessData(result.data)) {
        const values: LoginFormValues = {
          email: pendingLogin.email,
          password: pendingLogin.password,
          rememberMe: pendingLogin.rememberMe,
        };
        await finalizeSuccessfulLogin(result, values);
        return;
      }

      const errorMsg = "Login failed after OTP. Please try again.";
      setErrorMessage(errorMsg);
      setShowErrorDialog(true);
      throw new Error(errorMsg);
    } catch (error: unknown) {
      console.error("OTP login error:", error);

      const apiMessage = parseApiErrorMessage(error);
      if (apiMessage) {
        // Inline only: wrong OTP often returns 401 — global handler must not redirect;
        // keep user on OTP step so they can correct the code without a modal blocking the form.
        setOtpFieldError(apiMessage);
        throw new Error(apiMessage);
      }

      const err = error as { status?: number | string; message?: string };
      if (err?.status === 503 || err?.status === "FETCH_ERROR") {
        const errorMsg = "Server is unavailable. Please check your connection or try again later.";
        setErrorMessage(errorMsg);
        setShowErrorDialog(true);
        throw new Error(errorMsg);
      }
      if (err instanceof Error && err.message && !err.message.includes("Login failed")) {
        throw err;
      }
      const errorMsg = "Invalid or expired OTP. Please try again.";
      setOtpFieldError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const handleBackFromOtp = () => {
    setAuthPhase("credentials");
    setPendingLogin(null);
    setOtpInfoMessage("");
    setOtpFieldError(undefined);
  };

  const handleForgotPassword = () => {
    router.push(`/forgot-password`);
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
          {authPhase === "credentials" ? (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-semibold text-[#434956] mb-2">Login</h1>
                <p className="text-sm text-[#434956] leading-[120%]">
                  Login to your account and join us
                </p>
              </div>

              <LoginForm
                onSubmit={handleLogin}
                isLoading={isLoading}
                onForgotPassword={handleForgotPassword}
                apiErrors={fieldErrors}
                onClearFieldError={clearFieldError}
                onRememberMeChange={(checked) => {
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
            </>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-semibold text-[#434956] mb-2">Enter Login OTP</h1>
                <p className="text-sm text-[#434956] leading-[120%]">
                  Enter the one-time password sent to your registered phone number.
                </p>
              </div>

              <LoginOtpForm
                onSubmit={handleVerifyOtp}
                onBack={handleBackFromOtp}
                isLoading={isLoading}
                infoMessage={otpInfoMessage}
                apiError={otpFieldError}
              />
            </>
          )}
        </div>
      </div>

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
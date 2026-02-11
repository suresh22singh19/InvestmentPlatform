"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { MessageDialog } from "@/components/ui";
import { LoginForm } from "@/components/forms/LoginForm";
import { useLoginMutation } from "@/store/api/authApi";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials } from "@/store/slices/authSlice";
import { LoginFormValues } from "@/lib/validation/schemas";
import { LoginType } from "@/types/auth";
import { encrypt, decrypt } from "@/lib/utils/encryption";

export default function LoginPage() {
  const router = useRouter();
  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useAppDispatch();
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

  const handleLogin = async (values: LoginFormValues) => {
    // Clear previous errors
    setFieldErrors({});
    setShowErrorDialog(false);
    setErrorMessage("");

    try {
      // Call login API
      const result = await login({
        email: values.email,
        password: values.password,
      }).unwrap();

      // Save credentials to Redux if login successful
      if (result.data?.access_token && result.data?.user) {
        dispatch(
          setCredentials({
            user: result.data.user,
            login_type: result.data.login_type,
            access_token: result.data.access_token,
            token_type: result.data.token_type,
            expires_in: result.data.expires_in,
          })
        );

        // Handle "Remember Me" functionality
        if (typeof window !== "undefined") {
          // Always save the last rememberMe checkbox state
          localStorage.setItem("lastRememberMeState", values.rememberMe ? "true" : "false");
          setLastRememberMeState(values.rememberMe);
          
          if (values.rememberMe) {
            // Save email and encrypted password to localStorage
            localStorage.setItem("rememberedEmail", values.email);
            const encryptedPassword = encrypt(values.password);
            localStorage.setItem("rememberedPassword", encryptedPassword);
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

        // Check login_type and redirect accordingly
        const loginType = result.data?.login_type?.toLowerCase();
        
        if (loginType === "clinic user") {
          router.push("/registration");
        } else if (loginType === "hospital user") {
          router.push("/registration/hospital");
        } else if (loginType === "nurse") {
          router.push("/registration/registrationList");
        } else if (result.data?.user?.groupName === "Gate") {
          router.push("/gate");
        } else {
          router.push("/dashboard");
        }
      }
    } catch (error: any) {
      console.error("Login error:", error);

      // Handle message as either string or array
      let apiMessage: string | undefined;
      if (error?.data?.message) {
        if (Array.isArray(error.data.message)) {
          // Extract first error message from array
          apiMessage = error.data.message[0];
        } else {
          apiMessage = error.data.message;
        }
      }
      
      // Fallback to error field if message not available
      if (!apiMessage) {
        apiMessage = error?.data?.error;
      }

      if (apiMessage) {
        const lowerMessage = typeof apiMessage === 'string' ? apiMessage.toLowerCase() : '';
        if (lowerMessage.includes("email")) {
          setFieldErrors({ email: apiMessage });
          // Show dialog for email errors too
          setErrorMessage(apiMessage);
          setShowErrorDialog(true);
        } else if (lowerMessage.includes("password")) {
          setFieldErrors({ password: apiMessage });
          // Show dialog for password errors too
          setErrorMessage(apiMessage);
          setShowErrorDialog(true);
        } else {
          setErrorMessage(apiMessage);
          setShowErrorDialog(true);
        }
        // Throw error so Formik can catch it and reset submitting state
        throw new Error(apiMessage);
      }

      if (error?.status === 503 || error?.status === "FETCH_ERROR") {
        const errorMsg = "Server is unavailable. Please check your connection or try again later.";
        setErrorMessage(errorMsg);
        setShowErrorDialog(true);
        throw new Error(errorMsg);
      } else {
        const errorMsg = "Login failed. Please check your credentials and try again.";
        setErrorMessage(errorMsg);
        setShowErrorDialog(true);
        throw new Error(errorMsg);
      }
    }
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
          {/* Title Section - single generic login */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-[#434956] mb-2">Login</h1>
            <p className="text-sm text-[#434956] leading-[120%]">
              Login to your account and join us
            </p>
          </div>

          {/* Login Form */}
          <LoginForm 
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
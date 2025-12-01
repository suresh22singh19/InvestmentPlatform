import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoginFormValues } from "@/lib/validation/schemas";
import { LoginType, LoginResponse } from "@/types/auth";

export const useAuth = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (
    values: LoginFormValues,
    loginType: LoginType = "admin"
  ): Promise<LoginResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API call
      // const response = await fetch("/api/auth/login", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ ...values, loginType }),
      // });
      // const data = await response.json();

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockResponse: LoginResponse = {
        success: true,
        message: "Login successful",
        token: "mock-token",
        user: {
          id: "1",
          email: values.email,
          role: loginType,
        },
      };

      // Store token if rememberMe is true
      if (values.rememberMe) {
        localStorage.setItem("authToken", mockResponse.token || "");
        localStorage.setItem("user", JSON.stringify(mockResponse.user));
      } else {
        sessionStorage.setItem("authToken", mockResponse.token || "");
        sessionStorage.setItem("user", JSON.stringify(mockResponse.user));
      }

      // Navigate to dashboard or home
      router.push("/dashboard");

      return mockResponse;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred during login";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const alternativeLogin = async (type: LoginType) => {
    console.log(`Alternative login: ${type}`);
    // Handle different login types
    // This could navigate to a different login page or handle differently
  };

  return {
    login,
    alternativeLogin,
    isLoading,
    error,
  };
};

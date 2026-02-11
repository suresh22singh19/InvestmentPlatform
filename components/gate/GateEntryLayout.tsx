"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { GateHeaderBar } from "@/components/layout/GateHeaderBar";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { selectUser, logout, setCredentials } from "@/store/slices/authSlice";

type GateEntryLayoutProps = {
  title: string;
  children?: ReactNode;
};

export default function GateEntryLayout({ title, children }: GateEntryLayoutProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Restore user from localStorage if not in Redux store
    if (!user && typeof window !== "undefined") {
      // First try to get the full loginData
      const storedLoginData = localStorage.getItem("loginData");
      
      if (storedLoginData) {
        try {
          const loginData = JSON.parse(storedLoginData);
          dispatch(setCredentials(loginData));
        } catch (error) {
          console.error("Failed to parse stored loginData", error);
          router.push("/");
          return;
        }
      } else {
        // Fallback: reconstruct from individual localStorage items
        const storedUser = localStorage.getItem("user");
        const storedToken = localStorage.getItem("authToken");
        const storedTokenType = localStorage.getItem("tokenType");
        const storedLoginType = localStorage.getItem("loginType");
        const storedExpiresIn = localStorage.getItem("expiresIn");
        
        if (storedUser && storedToken) {
          try {
            const parsedUser = JSON.parse(storedUser);
            dispatch(setCredentials({
              user: parsedUser,
              access_token: storedToken,
              token_type: storedTokenType || "Bearer",
              login_type: storedLoginType || "admin",
              expires_in: storedExpiresIn ? parseInt(storedExpiresIn, 10) : 3600,
            }));
          } catch (error) {
            console.error("Failed to parse stored user", error);
            router.push("/");
            return;
          }
        } else {
          router.push("/");
          return;
        }
      }
    }

    setIsChecking(false);
  }, [user, dispatch, router]);

  useEffect(() => {
    if (!isChecking && user) {
      // If user is not a Gate user, redirect to dashboard
      if (user.groupName !== "Gate") {
        router.push("/dashboard");
        return;
      }
    }
  }, [user, router, isChecking]);

  // Show nothing while checking authentication
  if (isChecking || !user || user.groupName !== "Gate") {
    return null;
  }

  const handleLogout = () => {
    // Dispatch logout action to clear Redux state
    dispatch(logout());
    // Redirect to login
    router.push("/");
  };

  return (
    <div className="min-h-screen gradient-bg w-full">
      <div className="flex flex-col min-h-screen w-full">
        {/* Top Header Bar - Logo left, User right */}
        <GateHeaderBar
          userName={user.name || user.email}
          userRole={user.groupName}
          onLogout={handleLogout}
        />

        {/* Main Content Area */}
        <main className="flex-1 flex justify-center px-20 py-0">
          <div className="w-full ">
            <h1 className="text-[24px] font-semibold leading-[130%] text-[#434956] mb-4">
              {title}
            </h1>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}



"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { GateHeaderBar } from "@/components/layout/GateHeaderBar";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { logoutJatayu } from "@/store/api/jatayuApi";
import {
  selectUser,
  selectLoginType,
  selectPermissionsMap,
  logout,
  setCredentials,
} from "@/store/slices/authSlice";
import { getSubModulePermissions, hasOnlyGateModuleViewAccess } from "@/utils/permission";
import type { PermissionAction } from "@/utils/permission";

const GATE_MODULE = "Gate";

export type GateEntryLayoutProps = {
  title: string;
  subModuleName: string;
  children?: ReactNode | ((permissions: PermissionAction) => ReactNode);
};

export default function GateEntryLayout({ title, subModuleName, children }: GateEntryLayoutProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const loginType = useAppSelector(selectLoginType);
  const permissionsMap = useAppSelector(selectPermissionsMap);
  const [isChecking, setIsChecking] = useState(true);

  const isGateOnlyUser = useMemo(() => hasOnlyGateModuleViewAccess(permissionsMap), [permissionsMap]);
  const isGateUser =
    Boolean(loginType && loginType.toLowerCase().includes("gate")) || isGateOnlyUser;

  const permissions = useMemo(
    () => getSubModulePermissions(permissionsMap, GATE_MODULE, subModuleName),
    [permissionsMap, subModuleName]
  );

  /** Daily reports: read-only → `canView`. All other Gate screens (new entry): `canAdd`. */
  const isViewDailyReports = useMemo(
    () => subModuleName.trim().toLowerCase() === "view daily reports",
    [subModuleName]
  );
  const hasSubmoduleAccess = useMemo(
    () => (isViewDailyReports ? permissions.canView : permissions.canAdd),
    [isViewDailyReports, permissions.canView, permissions.canAdd]
  );

  useEffect(() => {
    if (!user && typeof window !== "undefined") {
      const storedLoginData = localStorage.getItem("loginData");

      if (storedLoginData) {
        try {
          const loginData = JSON.parse(storedLoginData);
          dispatch(setCredentials(loginData));
        } catch {
          router.push("/");
          return;
        }
      } else {
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
          } catch {
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
    if (isChecking) return;
    if (!user || !isGateUser) {
      router.push("/dashboard");
      return;
    }
    if (!hasSubmoduleAccess) {
      router.push("/gate");
    }
  }, [user, router, isChecking, isGateUser, hasSubmoduleAccess]);

  if (isChecking || !user || !isGateUser || !hasSubmoduleAccess) {
    return null;
  }

  const handleLogout = () => {
    logoutJatayu().catch((err) => console.error("Jatayu logout failed:", err));
    dispatch(logout());
    router.push("/");
  };

  return (
    <div className="min-h-screen gradient-bg w-full">
      <div className="flex flex-col min-h-screen w-full">
        <GateHeaderBar
          userName={user.userName || user.email}
          userRole={user.role?.name || "Gate"}
          onLogout={handleLogout}
        />

        <main className="flex-1 flex justify-center px-5 lg:px-20 py-0">
          <div className="w-full">
            <h1 className="text-[24px] font-semibold leading-[130%] text-[#434956] mb-4">
              {title}
            </h1>
            {typeof children === "function" ? children(permissions) : children}
          </div>
        </main>
      </div>
    </div>
  );
}



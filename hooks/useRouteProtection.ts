"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { selectLoginType } from "@/store/slices/authSlice";

/**
 * Hook to protect routes based on user role
 * 
 * For nurse users, only allows access to:
 * - /registration/registrationList
 * - /registration/registrationList/vitals-medical/[patientId]
 * - /registration/registrationList/[patientId]/view
 * - /registration/registrationList/[patientId]/edit
 * 
 * For hospital user, only allows access to:
 * - /registration/hospital
 * - /registration/registrationList
 * - /registration/registrationList/vitals-medical/[patientId]
 * - /registration/registrationList/[patientId]/view
 * - /registration/registrationList/[patientId]/edit
 * 
 * For clinic user, only allows access to:
 * - /registration
 * - /registration/registrationList
 * - /registration/registrationList/[patientId]/view
 * - /registration/registrationList/vitals-medical/[patientId]
 */
export const useRouteProtection = () => {
    const router = useRouter();
    const pathname = usePathname();
    const loginType = useAppSelector(selectLoginType);

    useEffect(() => {
        // Skip protection on public routes
        const publicRoutes = ["/", "/forgot-password", "/reset-password"];
        if (publicRoutes.includes(pathname)) {
            return;
        }

        // Get login type from Redux store or localStorage as fallback
        let userLoginType = loginType;

        if (!userLoginType && typeof window !== "undefined") {
            userLoginType = localStorage.getItem("loginType") || null;
        }

        // Only protect routes if user is logged in
        if (!userLoginType) {
            return;
        }

        const normalizedLoginType = userLoginType.toLowerCase();

        // Check if user is a nurse
        if (normalizedLoginType === "nurse") {
            // Check if current path matches allowed routes for nurses
            const isAllowedRoute =
                // Exact match for registration list
                pathname === "/registration/registrationList" ||
                // Match vitals-medical route: /registration/registrationList/vitals-medical/[patientId]
                /^\/registration\/registrationList\/vitals-medical\/\d+$/.test(pathname) ||
                // Match view route: /registration/registrationList/[patientId]/view
                /^\/registration\/registrationList\/\d+\/view$/.test(pathname) 
                // Match edit route: /registration/registrationList/[patientId]/edit
                // /^\/registration\/registrationList\/\d+\/edit$/.test(pathname);

            // If not on an allowed route, redirect to login
            if (!isAllowedRoute) {
                router.push("/");
            }
        }
        // Check if user is a hospital user
        else if (normalizedLoginType === "hospital user") {
            // Check if current path matches allowed routes for hospital users
            const isAllowedRoute =
                // Exact match for hospital registration page
                pathname === "/registration/hospital" ||
                // Exact match for registration list
                pathname === "/registration/registrationList" ||
                // Match vitals-medical route: /registration/registrationList/vitals-medical/[patientId]
                /^\/registration\/registrationList\/vitals-medical\/\d+$/.test(pathname) ||
                // Match view route: /registration/registrationList/[patientId]/view
                /^\/registration\/registrationList\/\d+\/view$/.test(pathname) ||
                // Match edit route: /registration/registrationList/[patientId]/edit
                /^\/registration\/registrationList\/\d+\/edit$/.test(pathname);

            // If not on an allowed route, redirect to login
            if (!isAllowedRoute) {
                router.push("/");
            }
        }
        // Check if user is a clinic user
        else if (normalizedLoginType === "clinic user") {
            // Check if current path matches allowed routes for clinic users
            const isAllowedRoute =
                // Exact match for registration page
                pathname === "/registration" ||
                // Exact match for registration list
                pathname === "/registration/registrationList" ||
                // Match view route: /registration/registrationList/[patientId]/view
                /^\/registration\/registrationList\/\d+\/view$/.test(pathname) ||
                // Match vitals-medical route: /registration/registrationList/vitals-medical/[patientId]
                /^\/registration\/registrationList\/vitals-medical\/\d+$/.test(pathname);

            // If not on an allowed route, redirect to login
            if (!isAllowedRoute) {
                router.push("/");
            }
        }
    }, [loginType, pathname, router]);
};


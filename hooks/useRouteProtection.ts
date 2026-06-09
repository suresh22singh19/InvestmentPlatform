"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import {
    selectLoginType,
    selectPermissionsMap,
    selectSelectedBranch,
    selectUserGroupName,
    selectUserEmail,
} from "@/store/slices/authSlice";
import type { NormalizedPermissionsMap } from "@/utils/permission";

// Email-based registration route restrictions for special admin accounts.
// Key: lowercase email  →  Value: the ONLY registration page they may access.
const EMAIL_REGISTRATION_RESTRICTION: Record<string, string> = {
    "superadminhiims@dikonia.in": "/registration",
    "superadminhiims2@dikonia.in": "/registration/hospital",
};

const MODULE_ROUTE_PREFIXES: Record<string, string[]> = {
    dashboard: ["/dashboard"],
    settings: ["/settings"],
    registration: ["/registration"],
    patient: [
        "/registration/registrationList",
        "/patient",
        "/patient/details",
        "/ipd-reception",
    ],
    patients: [
        "/registration/registrationList",
        "/patient",
        "/patient/details",
        "/ipd-reception",
    ],
    reports: ["/reports"],
    token: ["/token"],
    tokens: ["/token"],
    "pre-booking": ["/pre-booking"],
    "lead-request": ["/lead-request"],
    infrastructure: ["/infrastructure", "/hospital-infrastructure"],
    /** `slugify("Roles And Permissions")` in permission.ts */
    "roles-and-permissions": ["/roles&permission"],
    "roles-permission": ["/roles&permission"],
    "roles-permissions": ["/roles&permission"],
    gate: ["/gate"],
    /** `slugify("Discharge Pending")` — branch pending discharge list */
    "discharge-pending": ["/discharge-pending"],
    "nurse": ["/nurse"],
    reception: ["/ipd-reception"],
    /** `slugify("IPD Reception")` */
    "ipd-reception": ["/ipd-reception"],
};

const SUB_MODULE_ROUTE_PREFIXES: Record<string, string[]> = {
    nurse: ["/nurse"],
    therapist: ["/settings/therapist"],
    /** Matches login `moduleName` / `subModule.moduleName` "Tokens" → slug `tokens` */
    tokens: ["/token"],
    dashboard: ["/dashboard"],
    "add-hospital-clinic": ["/infrastructure"],
    "pre-booking": ["/pre-booking"],
    "lead-request": ["/lead-request"],
    // "add-hospital-clinic": ["/infrastructure", "/hospital-infrastructure"],
    configuration: ["/settings/configuration"],
    "branch-ip-network": ["/settings/branch-ip-network"],
    "duplicate-number-exceptions": ["/settings/duplicate-number-exceptions"],
    "manage-contact-updates": ["/settings/manage-contact-updates"],
    "discount-approval": ["/settings/discount-approval"],
    "refund-approval": ["/settings/refund-approval"],
    users: ["/settings/users"],
    panel: ["/settings/panel"],
    document: ["/settings/document"],
    "document-master": ["/settings/document"],
    therapy: ["/settings/therapy"],
    "lab-tests": ["/settings/lab-tests"],
    "lab-test": ["/settings/lab-tests"],
    package: ["/settings/package"],
    packages: ["/settings/package"],
    "package-master": ["/settings/package"],
    "package-settings": ["/settings/package"],
    "package-management": ["/settings/package"],
    "diet-category": ["/settings/diet-category"],
    "diagnosis-diet": ["/settings/diet"],
    diagnosis: ["/settings/diagnosis"],
    "sub-diagnosis": ["/settings/sub-diagnosis"],
    "health-card-management": ["/settings/health-card-management"],
    support: ["/settings/support"],
    "misc-settings": ["/settings/misc-settings"],
    facilities: ["/settings/facilities"],
    hardware: ["/settings/hardware"],
    "room-type-master": ["/settings/room-type"],
    "consultancy-service": ["/settings/consultancy-service"],
    "offer-master": ["/settings/offer-master"],
    offer: ["/settings/offer-master"],
    "role-master": ["/roles&permission/role-master"],
    "branch-role-master": ["/roles&permission/banch-role-master"],
    "approval-level-setup": ["/roles&permission/approval-level-setup"],
    "approval-level-assignment": ["/roles&permission/approval-level-assignment"],
    registration: ["/registration", "/registration/hospital"],
    "registration-report": ["/reports"],
    opd: ["/registration/registrationList", "/patient/opd", "/patient/details"],
    ipd: ["/patient/ipd", "/patient/details"],
    daycare: [
        "/registration/daycare-registration-cli",
        "/registration/daycare-registration-hos",
        "/patient/daycare",
        "/patient/details",
    ],
    /** Patient submodule "Discharge" (`slugify("Discharge")`) */
    discharge: ["/patient/discharge"],
    /** IPD Reception dashboard + patient view / open file */
    "ipd-reception-dashboard": ["/ipd-reception/dashboard", "/ipd-reception/patient"],
    "new-patient": ["/gate/new-patient"],
    "revisit-patient": ["/gate/revisit-patient"],
    "opd-visitor": ["/gate/patient-visitor"],
    "ipd-visitor": ["/gate/ipd-visitor"],
    "other-visitor": ["/gate/other"],
    "patient-medicine-type": ["/gate/patient-medicine-type"],
    "view-daily-reports": ["/gate/reports"],
    /** Submodule key matches parent name "Discharge Pending" */
    "discharge-pending": ["/discharge-pending"],
};

const RESTRICTED_ROOT_PREFIXES = [
    "/dashboard",
    "/settings",
    "/profile",
    "/registration",
    "/patient",
    "/reports",
    "/token",
    "/pre-booking",
    "/lead-request",
    "/roles&permission",
    "/infrastructure",
    "/hospital-infrastructure",
    "/discharge-pending",
    "/nurse",
    "/ipd-reception",
];

/**
 * First path segment after `/settings/` may not match `slugify(moduleName)` from the API
 * (e.g. URL is `package` but permission key is `package-master`). Map segment → submodule keys to try.
 */
const SETTINGS_URL_SEGMENT_SUBMODULE_SLUGS: Record<string, string[]> = {
    package: [
        "package",
        "packages",
        "package-master",
        "package-settings",
        "package-management",
    ],
    "lab-tests": ["lab-tests", "lab-test"],
};

const IPD_RECEPTION_MODULE_KEYS = new Set(["reception", "ipd-reception"]);

const getSubModuleRoutePrefixes = (moduleKey: string, subModuleKey: string): string[] => {
    if (IPD_RECEPTION_MODULE_KEYS.has(moduleKey) && subModuleKey === "dashboard") {
        return ["/ipd-reception/dashboard", "/ipd-reception/patient"];
    }
    return SUB_MODULE_ROUTE_PREFIXES[subModuleKey] ?? [];
};

const canAccessSettingsUrlBySegment = (
    pathname: string,
    permissionsMap: NormalizedPermissionsMap
): boolean => {
    const base = pathname.split("?")[0] ?? pathname;
    if (!base.startsWith("/settings/")) return false;
    const parts = base.split("/").filter(Boolean);
    if (parts.length < 2 || parts[0] !== "settings") return false;
    const segment = parts[1];
    if (!segment || segment === "profile") return false;

    const settingsModule = Object.values(permissionsMap).find(
        (m) => m.key === "settings" && m.isActive
    );
    if (!settingsModule?.subModules) return false;

    const slugCandidates = new Set<string>([
        segment,
        ...(SETTINGS_URL_SEGMENT_SUBMODULE_SLUGS[segment] ?? []),
    ]);
    for (const slug of slugCandidates) {
        const sub = settingsModule.subModules[slug];
        if (sub?.isActive && sub?.canView) return true;
    }
    return false;
};

const getAllowedRoutePrefixesFromPermissions = (
    permissionsMap: NormalizedPermissionsMap,
    selectedBranchType: string | null
): string[] => {
    const prefixes = new Set<string>(["/settings/profile", "/profile"]);

    Object.values(permissionsMap).forEach((modulePermission) => {
        if (!modulePermission?.isActive) return;

        if (modulePermission.canView) {
            (MODULE_ROUTE_PREFIXES[modulePermission.key] ?? []).forEach((prefix) =>
                prefixes.add(prefix)
            );
        }

        Object.values(modulePermission.subModules ?? {}).forEach((subModulePermission) => {
            if (!subModulePermission?.isActive || !subModulePermission.canView) return;
            getSubModuleRoutePrefixes(modulePermission.key, subModulePermission.key).forEach(
                (prefix) => prefixes.add(prefix)
            );
        });
    });

    // Branch-based registration route narrowing
    if (selectedBranchType === "clinic") {
        prefixes.delete("/registration/hospital");
    } else if (selectedBranchType === "hospital") {
        prefixes.delete("/registration");
        prefixes.add("/registration/hospital");
    }

    return Array.from(prefixes);
};

const pathMatchesPrefix = (pathname: string, prefix: string): boolean =>
    pathname === prefix || pathname?.startsWith(prefix + "/");

const getFirstAccessibleRouteFromPermissions = (
    permissionsMap: NormalizedPermissionsMap,
    selectedBranchType: string | null
): string | null => {
    for (const modulePermission of Object.values(permissionsMap)) {
        if (!modulePermission?.isActive) continue;

        const moduleRoutePrefixes = MODULE_ROUTE_PREFIXES[modulePermission.key] ?? [];
        const filteredModuleRoutePrefixes = moduleRoutePrefixes.filter((prefix) => {
            if (selectedBranchType === "clinic" && prefix === "/registration/hospital") {
                return false;
            }
            if (selectedBranchType === "hospital" && prefix === "/registration") {
                return false;
            }
            return true;
        });

        const orderedSubModules = Object.values(modulePermission.subModules ?? {});
        for (const subModulePermission of orderedSubModules) {
            if (!subModulePermission?.isActive || !subModulePermission.canView) continue;

            const subModulePrefixes = getSubModuleRoutePrefixes(
                modulePermission.key,
                subModulePermission.key
            );
            const filteredSubModulePrefixes = subModulePrefixes.filter((prefix) => {
                if (selectedBranchType === "clinic" && prefix === "/registration/hospital") {
                    return false;
                }
                if (selectedBranchType === "hospital" && prefix === "/registration") {
                    return false;
                }
                return true;
            });
            if (filteredSubModulePrefixes.length > 0) {
                return filteredSubModulePrefixes[0];
            }
        }

        if (modulePermission.canView && filteredModuleRoutePrefixes.length > 0) {
            return filteredModuleRoutePrefixes[0];
        }
    }

    return null;
};

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
    const permissionsMapFromState = useAppSelector(selectPermissionsMap);
    const selectedBranchFromState = useAppSelector(selectSelectedBranch);
    const groupNameFromState = useAppSelector(selectUserGroupName);
    const userEmailFromState = useAppSelector(selectUserEmail);

    useEffect(() => {
        if (pathname == null) return;

        // Skip protection on public routes
        const publicRoutes = ["/", "/forgot-password", "/reset-password"];
        if (publicRoutes.includes(pathname)) {
            return;
        }

        // Get login type from Redux store or localStorage as fallback
        let userLoginType = loginType;
        let userGroupName = groupNameFromState;
        let userEmail = userEmailFromState;
        let userPermissionsMap: NormalizedPermissionsMap = permissionsMapFromState ?? {};
        let selectedBranchType = selectedBranchFromState?.type?.toLowerCase() ?? null;

        if (typeof window !== "undefined") {
            if (!userLoginType) {
                userLoginType = localStorage.getItem("loginType");
            }
            if (!userPermissionsMap || Object.keys(userPermissionsMap).length === 0) {
                try {
                    const persistedPermissions = localStorage.getItem("permissions");
                    if (persistedPermissions) {
                        userPermissionsMap = JSON.parse(persistedPermissions) as NormalizedPermissionsMap;
                    }
                } catch {
                    userPermissionsMap = {};
                }
            }
            if (!userGroupName) {
                try {
                    const rawLoginData = localStorage.getItem("loginData");
                    if (rawLoginData) {
                        const parsed = JSON.parse(rawLoginData);
                        userGroupName = parsed?.user?.groupName ?? null;
                        if (!selectedBranchType) {
                            const persistedSelectedBranch = localStorage.getItem("selectedBranch");
                            if (persistedSelectedBranch) {
                                try {
                                    selectedBranchType = JSON.parse(persistedSelectedBranch)?.type?.toLowerCase() ?? null;
                                } catch {
                                    selectedBranchType = null;
                                }
                            } else {
                                selectedBranchType =
                                    parsed?.branch_access?.find(
                                        (branch: { id?: number; type?: string }) => branch?.id === parsed?.user?.branchId
                                    )?.type?.toLowerCase() ??
                                    parsed?.branch_access?.[0]?.type?.toLowerCase() ??
                                    null;
                            }
                        }
                        if (!userEmail) {
                            userEmail = parsed?.user?.email ?? null;
                        }
                    }
                } catch {
                    userGroupName = null;
                }
            }
        }

        // Only protect routes if we have a login type
        if (!userLoginType) {
            return;
        }

        // Gate user: restrict to /gate/* and /profile only
        if (userLoginType.toLowerCase().includes("gate")) {
            const isGateRoute =
                pathname === "/gate" || pathname?.startsWith("/gate/");
            const isProfileRoute =
                pathname === "/profile" || pathname?.startsWith("/profile/");

            if (!isGateRoute && !isProfileRoute) {
                router.push("/gate");
            }
            return;
        }

        const hasPermissionData =
            userPermissionsMap && Object.keys(userPermissionsMap).length > 0;

        // If logged in but has no permissions, restrict them to /profile only
        if (!hasPermissionData) {
            const isProfileRoute = pathname === "/profile" || pathname?.startsWith("/profile/");
            if (!isProfileRoute) {
                router.push("/profile");
            }
            return;
        }
        const isRestrictedPath = RESTRICTED_ROOT_PREFIXES.some((prefix) =>
            pathMatchesPrefix(pathname, prefix)
        );
        if (hasPermissionData && isRestrictedPath) {
            const allowedPrefixes = getAllowedRoutePrefixesFromPermissions(
                userPermissionsMap,
                selectedBranchType
            );
            const canAccessCurrentRoute =
                allowedPrefixes.some((prefix) => pathMatchesPrefix(pathname, prefix)) ||
                canAccessSettingsUrlBySegment(pathname, userPermissionsMap);
            const isSettingsPackageOpenAccess =
                pathname === "/settings/package" ||
                pathname?.startsWith("/settings/package/");
            // offer-master permission not yet implemented in backend — allow access unconditionally
            const isSettingsOfferMasterOpenAccess =
                pathname === "/settings/offer-master" ||
                pathname?.startsWith("/settings/offer-master/");
            if (!canAccessCurrentRoute && !isSettingsPackageOpenAccess && !isSettingsOfferMasterOpenAccess) {
                const fallbackRoute =
                    getFirstAccessibleRouteFromPermissions(
                        userPermissionsMap,
                        selectedBranchType
                    ) ??
                    allowedPrefixes[0] ??
                    "/dashboard";
                router.push(fallbackRoute);
                return;
            }
        }

        // --- Email-based registration restriction (special admin accounts) ---
        if (userEmail) {
            const allowedRoute = EMAIL_REGISTRATION_RESTRICTION[userEmail.toLowerCase()];
            if (allowedRoute) {
                // Routes shared by ALL special admin accounts (always accessible).
                const sharedRoutes = ["/registration/registrationList"];
                const isOnSharedRoute = sharedRoutes.some(
                    (r) => pathname === r || pathname?.startsWith(r + "/")
                );

                if (!isOnSharedRoute) {
                    // These users must NOT access the other registration page.
                    const otherRegistrationRoutes = Object.values(EMAIL_REGISTRATION_RESTRICTION).filter(
                        (r) => r !== allowedRoute
                    );
                    const isOnForbiddenRoute = otherRegistrationRoutes.some(
                        (r) => pathname === r || pathname?.startsWith(r + "/")
                    );
                    if (isOnForbiddenRoute) {
                        router.push(allowedRoute);
                    }
                }
                return; // No further checks needed for these accounts
            }
        }

        // --- Branch-type based restriction for registration flows ---
        // clinic branch  -> only /registration (plus shared registration-list routes)
        // hospital branch-> only /registration/hospital (plus shared registration-list routes)
        if (selectedBranchType === "clinic" || selectedBranchType === "hospital") {
            const isSharedRegistrationRoute =
                pathname === "/registration/registrationList" ||
                pathname?.startsWith("/registration/registrationList/");
            if (!isSharedRegistrationRoute) {
                const clinicRoute = "/registration";
                const hospitalRoute = "/registration/hospital";
                const forbiddenRoute =
                    selectedBranchType === "clinic" ? hospitalRoute : clinicRoute;
                const targetRoute =
                    selectedBranchType === "clinic" ? clinicRoute : hospitalRoute;

                const isOnForbiddenRoute =
                    pathname === forbiddenRoute || pathname?.startsWith(forbiddenRoute + "/");
                if (isOnForbiddenRoute) {
                    router.push(targetRoute);
                    return;
                }
            }
        }

    }, [
        loginType,
        permissionsMapFromState,
        selectedBranchFromState,
        groupNameFromState,
        userEmailFromState,
        pathname,
        router,
    ]);
};


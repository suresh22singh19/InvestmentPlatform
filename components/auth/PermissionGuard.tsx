"use client";

import type { ReactNode } from "react";
import { usePermission } from "@/hooks/usePermission";
import type { PermissionAction } from "@/utils/permission";

type PermissionGuardProps = {
  moduleId: string;
  action?: keyof PermissionAction;
  subModule?: string;
  children: ReactNode;
  fallback?: ReactNode;
};

export function PermissionGuard({
  moduleId,
  action = "canView",
  subModule,
  children,
  fallback = null,
}: PermissionGuardProps) {
  const permissions = usePermission(moduleId, subModule ? { subModule } : undefined);

  if (!permissions[action]) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

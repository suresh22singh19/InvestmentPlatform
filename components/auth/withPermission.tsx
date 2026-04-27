"use client";

import type { ComponentType } from "react";
import { usePermission } from "@/hooks/usePermission";

export function withPermission<P extends object>(
  WrappedComponent: ComponentType<P>,
  moduleId: string,
  subModule?: string
) {
  const ComponentWithPermission = (props: P) => {
    const { canView } = usePermission(moduleId, subModule ? { subModule } : undefined);
    if (!canView) {
      return <div className="text-sm text-[#D14D4F]">Access denied</div>;
    }
    return <WrappedComponent {...props} />;
  };

  ComponentWithPermission.displayName = `WithPermission(${WrappedComponent.displayName || WrappedComponent.name || "Component"})`;

  return ComponentWithPermission;
}

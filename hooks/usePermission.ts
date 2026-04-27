"use client";

import { useAppSelector } from "@/store/hooks";
import { selectPermissionsMap } from "@/store/slices/authSlice";
import {
  getModulePermissions,
  getSubModulePermissions,
  type PermissionAction,
} from "@/utils/permission";

type UsePermissionOptions = {
  subModule?: string;
};

export const usePermission = (
  moduleNameOrKey: string,
  options?: UsePermissionOptions
): PermissionAction => {
  const permissionsMap = useAppSelector(selectPermissionsMap);

  if (options?.subModule) {
    return getSubModulePermissions(permissionsMap, moduleNameOrKey, options.subModule);
  }

  return getModulePermissions(permissionsMap, moduleNameOrKey);
};

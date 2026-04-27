export type PermissionAction = {
  canDownload: boolean;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

export type RawSubModulePermission = {
  id?: string | number;
  parentModuleId?: string | number;
  moduleName?: string;
  isActive?: boolean;
  canDownload?: boolean;
  canView?: boolean;
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
};

export type RawModulePermission = {
  id?: string | number;
  moduleName?: string;
  isActive?: boolean;
  canDownload?: boolean;
  canView?: boolean;
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  subModules?: RawSubModulePermission[];
};

export type NormalizedModulePermission = PermissionAction & {
  id: string;
  moduleId: string;
  moduleName: string;
  key: string;
  isActive: boolean;
  subModules: Record<string, PermissionAction & { id: string; moduleName: string; key: string; isActive: boolean }>;
};

export type NormalizedPermissionsMap = Record<string, NormalizedModulePermission>;

const toPermissionAction = (
  source?: Partial<PermissionAction> | null,
  fallback?: Partial<PermissionAction>
): PermissionAction => ({
  canDownload: Boolean(source?.canDownload ?? fallback?.canDownload ?? false),
  canView: Boolean(source?.canView ?? fallback?.canView ?? false),
  canAdd: Boolean(source?.canAdd ?? fallback?.canAdd ?? false),
  canEdit: Boolean(source?.canEdit ?? fallback?.canEdit ?? false),
  canDelete: Boolean(source?.canDelete ?? fallback?.canDelete ?? false),
});

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const formatPermissions = (
  permissions: RawModulePermission[] = []
): NormalizedPermissionsMap => {
  const map: NormalizedPermissionsMap = {};

  permissions.forEach((module) => {
    const moduleName = module.moduleName?.trim() || "unknown-module";
    const moduleKey = slugify(moduleName);
    const moduleId = String(module.id ?? moduleKey);
    const moduleActions = toPermissionAction(module);

    const subModules: NormalizedModulePermission["subModules"] = {};
    module.subModules?.forEach((subModule) => {
      const subModuleName = subModule.moduleName?.trim() || "unknown-sub-module";
      const subKey = slugify(subModuleName);
      const subId = String(subModule.id ?? subKey);

      subModules[subKey] = {
        id: subId,
        moduleName: subModuleName,
        key: subKey,
        isActive: Boolean(subModule.isActive ?? true),
        ...toPermissionAction(subModule, moduleActions),
      };
    });

    map[moduleKey] = {
      id: moduleId,
      moduleId,
      moduleName,
      key: moduleKey,
      isActive: Boolean(module.isActive ?? true),
      ...moduleActions,
      subModules,
    };
  });

  return map;
};

const EMPTY_PERMISSION: PermissionAction = {
  canDownload: false,
  canView: false,
  canAdd: false,
  canEdit: false,
  canDelete: false,
};

export const getModulePermissions = (
  permissionsMap: NormalizedPermissionsMap | null | undefined,
  moduleKeyOrName: string
): PermissionAction => {
  if (!permissionsMap || !moduleKeyOrName) return EMPTY_PERMISSION;
  const key = slugify(moduleKeyOrName);
  const modulePermission = permissionsMap[key];
  if (!modulePermission) return EMPTY_PERMISSION;
  return {
    canDownload: Boolean(modulePermission.canDownload),
    canView: Boolean(modulePermission.canView),
    canAdd: Boolean(modulePermission.canAdd),
    canEdit: Boolean(modulePermission.canEdit),
    canDelete: Boolean(modulePermission.canDelete),
  };
};

export const getSubModulePermissions = (
  permissionsMap: NormalizedPermissionsMap | null | undefined,
  moduleKeyOrName: string,
  subModuleKeyOrName: string
): PermissionAction => {
  if (!permissionsMap || !moduleKeyOrName || !subModuleKeyOrName) return EMPTY_PERMISSION;
  const moduleKey = slugify(moduleKeyOrName);
  const subModuleKey = slugify(subModuleKeyOrName);
  const modulePermission = permissionsMap[moduleKey];
  const subModule = modulePermission?.subModules?.[subModuleKey];
  if (!subModule) return EMPTY_PERMISSION;
  return {
    canDownload: Boolean(subModule.canDownload),
    canView: Boolean(subModule.canView),
    canAdd: Boolean(subModule.canAdd),
    canEdit: Boolean(subModule.canEdit),
    canDelete: Boolean(subModule.canDelete),
  };
};

export const hasModuleViewAccess = (
  permissionsMap: NormalizedPermissionsMap | null | undefined,
  moduleKeyOrName: string
): boolean => {
  const moduleKey = slugify(moduleKeyOrName);
  const modulePermission = permissionsMap?.[moduleKey];
  if (!modulePermission || !modulePermission.isActive) return false;

  if (modulePermission.canView) return true;
  return Object.values(modulePermission.subModules).some(
    (subModule) => subModule.isActive && subModule.canView
  );
};

const GATE_MODULE_KEY = slugify("Gate");

/**
 * True when the user has view access on at least one Gate sub-module and no view access
 * on any other module (e.g. Corporate Gate). Used for standalone `/gate` shell vs main app.
 */
export const hasOnlyGateModuleViewAccess = (
  permissionsMap: NormalizedPermissionsMap | null | undefined
): boolean => {
  if (!permissionsMap || Object.keys(permissionsMap).length === 0) return false;
  let hasGate = false;
  let hasNonGate = false;
  for (const [key, mod] of Object.entries(permissionsMap)) {
    if (!mod.isActive) continue;
    const anyView =
      Boolean(mod.canView) ||
      Object.values(mod.subModules).some((s) => s.isActive && s.canView);
    if (!anyView) continue;
    if (key === GATE_MODULE_KEY) hasGate = true;
    else hasNonGate = true;
  }
  return hasGate && !hasNonGate;
};
"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Button,
  FormInputField,
  FormSelectField,
  ConfigurationSummaryPanel,
  MessageDialog,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableData,
  Checkbox,
  Pagination,
} from "@/components/ui";
import type { RoomInventoryItem, OccupancyStatus } from "./RoomInventory";
import {
  useGetSingleRoomQuery,
  useUpdateRoomMutation,
  useBulkUpdateRoomMutation,
  useGetBranchHardwareFacilityByTypeQuery,
  useGetBranchHierarchyTreeQuery,
  useGetUnconfiguredRoomsQuery,
  useGetBuildingsByBranchQuery,
  useGetBranchRoomTypesByBranchQuery,
  type BranchRoomTypeMappingRow,
  type UnconfiguredRoomRow,
} from "@/store/api/branchSetupApi";
import type { FacilityConfigurationSummarySnapshot } from "@/lib/types/facilityConfigurationSummary";
import { useFacilityConfigurationSummaryFromHierarchy } from "@/hooks/useFacilityConfigurationSummaryFromHierarchy";
import {
  displayLabelForApiRoomType,
  roomTypeOptionSelected,
} from "@/lib/utils/branchRoomTypeOptions";
import {
  sanitizeBedNumberIdentifierInput,
  formatRoomHierarchyPath,
  genderUsageDisplayLabel,
} from "@/lib/utils/common";

const BASE_STEPS = [
  { id: "basic", label: "Basic Info" },
  { id: "roomType", label: "Room Type" },
  { id: "attributes", label: "Attributes" },
  { id: "hardware", label: "Hardware" },
  { id: "facilities", label: "Facilities" },
  { id: "review", label: "Review" },
] as const;

const COPY_STEP = { id: "configOtherRooms", label: "Config Other Rooms" } as const;

const ROOM_TYPES = [
  { value: "Consultation Room", label: "Consultation Room", category: "Out-Patient" },
  { value: "Therapy Room", label: "Therapy Room", category: "Out-Patient" },
  { value: "IPD - Deluxe Room", label: "IPD - Deluxe Room", category: "In-Patient Department" },
  { value: "IPD - Semi-Deluxe Room", label: "IPD - Semi-Deluxe Room", category: "In-Patient Department" },
  { value: "IPD - Private Room", label: "IPD - Private Room", category: "In-Patient Department" },
  { value: "IPD - Ward", label: "IPD - Ward", category: "In-Patient Department" },
];

const STATUS_OPTIONS = [
  { value: "Pending", label: "Setup pending" },
  { value: "Vacant", label: "Vacant" },
  { value: "Fully Occupied", label: "Fully Occupied" },
  { value: "Partially Occupied", label: "Partially Occupied" },
  // { value: "Reserved", label: "Reserved" },
  { value: "Under Maintenance", label: "Under Maintenance" },
];

const TOILET_OPTIONS = [
  { value: "western", label: "Western" },
  { value: "indian", label: "Indian" },
  { value: "both", label: "Both" },
];

const HARDWARE_OPTIONS = [
  "Examination Bed",
  "BP Monitor",
  "ECG Machine",
  "Standard Hospital Bed",
  "ICU Bed",
  "Ventilator",
  "Infusion Pump",
  "Nurse Call System",
  "Examination Table",
  "Crash Cart",
  "Defibrillator",
];

const FACILITIES_OPTIONS = [
  "Air Conditioning",
  "Oxygen Supply",
  "Attached Washroom",
  "Attendant Couch",
  "Cupboard/Storage",
  "WiFi",
  "Suction Facility",
  "Television",
  "Refrigerator",
  "Intercom",
  "Hand Wash Station",
];

type HardwareLine = { hardwareFacilityId: number; name: string; qty: number };
type FacilityLine = { facilityId: number; name: string };

function occupancyApiToUi(s: string | null | undefined): OccupancyStatus {
  if (s == null || String(s).trim() === "") return "Vacant";
  const t = String(s).trim().toLowerCase();
  if (t.includes("partial")) return "Partially Occupied";
  if (t.includes("fully") && t.includes("occup")) return "Fully Occupied";
  if (t.includes("vacant")) return "Vacant";
  if (t.includes("reserved")) return "Reserved";
  if (t.includes("maintenance")) return "Under Maintenance";
  return "Vacant";
}

function occupancyUiToApi(s: OccupancyStatus): string {
  const map: Record<OccupancyStatus, string> = {
    Pending: "vacant",
    Vacant: "vacant",
    "Fully Occupied": "fully occupied",
    "Partially Occupied": "partially occupied",
    Reserved: "reserved",
    "Under Maintenance": "under maintenance",
  };
  return map[s] ?? String(s).toLowerCase();
}

function roomUsageToGender(u: string | null | undefined): "Male" | "Female" | "Mixed" | "" {
  const t = (u ?? "").trim().toLowerCase();
  if (t === "male") return "Male";
  if (t === "female") return "Female";
  if (t === "mixed" || t === "general") return "Mixed";
  return "";
}

function genderToRoomUsage(g: "Male" | "Female" | "Mixed" | ""): string | undefined {
  if (!g) return undefined;
  return g.toLowerCase();
}

type RoomConfigurationProps = {
  facilityName: string;
  room: RoomInventoryItem;
  /** When set with numeric room id, load/save via room APIs */
  branchId?: number | null;
  /** API `roomType` codes + labels from branch room-type master */
  roomTypeOptions?: { value: string; label: string }[];
  /** Branch room-type mappings (for labels when `roomType` from API is a short code). */
  branchRoomTypeRows?: BranchRoomTypeMappingRow[];
  configurationSummary?: FacilityConfigurationSummarySnapshot | null;
  onBack: () => void;
  onSave: (room?: RoomInventoryItem) => void;
};

export const RoomConfiguration = ({
  facilityName,
  room: initialRoom,
  branchId = null,
  roomTypeOptions = [],
  branchRoomTypeRows = [],
  configurationSummary = null,
  onBack,
  onSave,
}: RoomConfigurationProps) => {
  const roomIdNum = parseInt(initialRoom.id, 10);
  const apiMode = Number.isFinite(roomIdNum) && roomIdNum > 0 && branchId != null;
  const branchIdNum = branchId ?? 0;
  const { data: hierarchyTreeRes } = useGetBranchHierarchyTreeQuery(branchIdNum, { skip: branchId == null });
  const configurationSummaryForPanel = useFacilityConfigurationSummaryFromHierarchy(
    hierarchyTreeRes?.success && Array.isArray(hierarchyTreeRes.data) ? hierarchyTreeRes.data : undefined,
    configurationSummary,
  );

  const { data: singleRes, isFetching: singleLoading, isError: singleError } = useGetSingleRoomQuery(
    roomIdNum,
    { skip: !apiMode }
  );

  const branchHwFacSkip = !apiMode || branchId == null;
  const { data: hwBranchRes } = useGetBranchHardwareFacilityByTypeQuery(
    { branchId: branchId!, type: "hardware" },
    { skip: branchHwFacSkip }
  );
  const { data: facBranchRes } = useGetBranchHardwareFacilityByTypeQuery(
    { branchId: branchId!, type: "facility" },
    { skip: branchHwFacSkip }
  );

  const [updateRoom, { isLoading: saving }] = useUpdateRoomMutation();
  const [bulkUpdateRoom, { isLoading: isBulkSaving }] = useBulkUpdateRoomMutation();

  const [stepIndex, setStepIndex] = useState(0);
  const [showCopyStep, setShowCopyStep] = useState(false);
  const [selectedUnconfiguredRoomIds, setSelectedUnconfiguredRoomIds] = useState<number[]>(() =>
    roomIdNum > 0 ? [roomIdNum] : []
  );
  const [unconfigPage, setUnconfigPage] = useState(1);
  const [unconfigLimit, setUnconfigLimit] = useState(10);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [unconfigBuildingFilter, setUnconfigBuildingFilter] = useState<string>("all");
  const [unconfigRoomTypeFilter, setUnconfigRoomTypeFilter] = useState<string>("all");

  useEffect(() => {
    if (roomIdNum > 0 && !selectedUnconfiguredRoomIds.includes(roomIdNum)) {
      setSelectedUnconfiguredRoomIds((prev) => [...prev, roomIdNum]);
    }
  }, [roomIdNum, selectedUnconfiguredRoomIds]);

  const steps = useMemo(() => {
    return showCopyStep ? [...BASE_STEPS, COPY_STEP] : BASE_STEPS;
  }, [showCopyStep]);

  const currentStepId = steps[stepIndex]?.id ?? "basic";

  const { data: buildingsRes, isLoading: buildingsLoading } = useGetBuildingsByBranchQuery(branchIdNum, {
    skip: !showCopyStep || branchIdNum === 0,
  });

  const { data: branchTypesRes, isLoading: typesLoading } = useGetBranchRoomTypesByBranchQuery(branchIdNum, {
    skip: !showCopyStep || branchIdNum === 0,
  });

  const buildingRows = buildingsRes?.success && Array.isArray(buildingsRes.data) ? buildingsRes.data : [];
  const branchTypeRows = branchTypesRes?.success && Array.isArray(branchTypesRes.data) ? branchTypesRes.data : [];

  const unconfigBuildingOptions = useMemo(() => {
    const opts = [{ value: "all", label: "All Buildings" }];
    for (const b of buildingRows) {
      const name = b.name != null && String(b.name).trim() !== "" ? String(b.name) : `Building ${b.id}`;
      opts.push({ value: String(b.id), label: name });
    }
    return opts;
  }, [buildingRows]);

  const unconfigRoomTypeOptions = useMemo(() => {
    const opts = [{ value: "all", label: "All Types" }];
    for (const r of branchTypeRows) {
      const label =
        r.roomType?.roomType != null && String(r.roomType.roomType).trim() !== ""
          ? String(r.roomType.roomType)
          : `Type #${r.roomtypeId}`;
      opts.push({ value: String(r.roomtypeId), label });
    }
    return opts;
  }, [branchTypeRows]);

  const {
    data: unconfigRes,
    isLoading: isUnconfigLoading,
    isFetching: isUnconfigFetching,
    isError: isUnconfigError,
  } = useGetUnconfiguredRoomsQuery(
    {
      branchId: branchIdNum,
      page: unconfigPage,
      limit: unconfigLimit,
      buildingId: unconfigBuildingFilter === "all" ? "" : unconfigBuildingFilter,
      roomtypeId: unconfigRoomTypeFilter === "all" ? "" : unconfigRoomTypeFilter,
    },
    {
      skip: !showCopyStep || branchIdNum === 0,
    }
  );

  const unconfigRows = unconfigRes?.data ?? [];
  const unconfigTotal = unconfigRes?.total ?? 0;
  const unconfigTotalPages = unconfigRes?.totalPages ?? 1;

  const allCurrentPageSelected = useMemo(() => {
    if (unconfigRows.length === 0) return false;
    return unconfigRows.every((r) => selectedUnconfiguredRoomIds.includes(r.id));
  }, [unconfigRows, selectedUnconfiguredRoomIds]);

  const toggleSelectAllUnconfig = () => {
    if (allCurrentPageSelected) {
      const currentPageIds = new Set(unconfigRows.map((r) => r.id));
      setSelectedUnconfiguredRoomIds((prev) =>
        prev.filter((id) => (roomIdNum > 0 && id === roomIdNum) || !currentPageIds.has(id))
      );
    } else {
      const newIds = new Set([
        ...(roomIdNum > 0 ? [roomIdNum] : []),
        ...selectedUnconfiguredRoomIds,
        ...unconfigRows.map((r) => r.id),
      ]);
      setSelectedUnconfiguredRoomIds(Array.from(newIds));
    }
  };

  const toggleSelectUnconfigRoom = (id: number) => {
    if (roomIdNum > 0 && id === roomIdNum) return;
    setSelectedUnconfiguredRoomIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };
  const [roomNumber, setRoomNumber] = useState(() =>
    sanitizeBedNumberIdentifierInput(initialRoom.roomNumber),
  );
  const [capacity, setCapacity] = useState(String(initialRoom.capacity));
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [currentStatus, setCurrentStatus] = useState<OccupancyStatus>(() => {
    const s = initialRoom.occupancyStatus;
    if ((s as string) === "Occupied") return "Fully Occupied";
    return s as OccupancyStatus;
  });
  /** Local mode: display label from ROOM_TYPES. API mode: `roomType` code sent to backend. */
  const [roomType, setRoomType] = useState(initialRoom.roomType);
  const [genderUsage, setGenderUsage] = useState<"Male" | "Female" | "Mixed" | "">(
    initialRoom.genderUsage ?? "",
  );
  const [roomToilet, setRoomToilet] = useState("western");
  const [apiStatus, setApiStatus] = useState("active");
  const [hardware, setHardware] = useState<HardwareLine[]>(() => {
    if (initialRoom.hardwareItems?.length) {
      return initialRoom.hardwareItems.map((h) => ({
        hardwareFacilityId: 0,
        name: h.name,
        qty: h.qty,
      }));
    }
    if (initialRoom.hardwareCount > 0) {
      return [
        { hardwareFacilityId: 0, name: "Examination Bed", qty: 1 },
        { hardwareFacilityId: 0, name: "BP Monitor", qty: 1 },
      ];
    }
    return [];
  });
  const [facilities, setFacilities] = useState<FacilityLine[]>(() => {
    if (initialRoom.facilityNames?.length) {
      return initialRoom.facilityNames.map((n) => ({ facilityId: 0, name: n }));
    }
    const base =
      initialRoom.facilitiesCount >= 2
        ? [
          { facilityId: 0, name: "Oxygen Supply" },
          { facilityId: 0, name: "Attached Washroom" },
        ]
        : [];
    if (initialRoom.hasAC && !base.some((b) => b.name === "Air Conditioning")) {
      base.push({ facilityId: 0, name: "Air Conditioning" });
    }
    return base;
  });
  const [newHardwareSelect, setNewHardwareSelect] = useState("");
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const lastHydratedKey = useRef<string>("");

  useEffect(() => {
    lastHydratedKey.current = "";
  }, [roomIdNum]);

  useEffect(() => {
    if (!apiMode || !singleRes?.success || !singleRes.data) return;
    const d = singleRes.data;
    const key = `${d.id}-${d.updatedAt ?? ""}-${d.roomNumber}`;
    if (lastHydratedKey.current === key) return;
    lastHydratedKey.current = key;

    setRoomNumber(d.roomNumber);
    setCapacity(String(d.bedCapacity ?? 1));
    setCurrentStatus(
      d.roomConfigStatus === "incomplete"
        ? "Pending"
        : occupancyApiToUi(d.roomCurrentStatus),
    );
    setRoomType(d.roomType ?? "");
    setGenderUsage(roomUsageToGender(d.roomUsage));
    setRoomToilet((d.roomToilet ?? "western").toLowerCase());
    setApiStatus(d.status ?? "active");
    setHardware(
      (d.hardware ?? []).map((h) => ({
        hardwareFacilityId: h.hardwareFacilityId,
        name: h.hardwareEntity?.name ?? `Hardware #${h.hardwareFacilityId}`,
        qty: h.quantity ?? 1,
      }))
    );
    setFacilities(
      (d.facility ?? []).map((f) => ({
        facilityId: f.hardwareFacilityId,
        name: f.facilityEntity?.name ?? `Facility #${f.hardwareFacilityId}`,
      }))
    );
  }, [apiMode, singleRes]);

  const hardwareMasterOptions = useMemo(() => {
    const rows =
      hwBranchRes?.success && Array.isArray(hwBranchRes.data) ? hwBranchRes.data : [];
    return rows.map((r) => ({
      value: String(r.hardwareFacilityId),
      label:
        r.hardwareFacility?.name != null && String(r.hardwareFacility.name).trim() !== ""
          ? String(r.hardwareFacility.name)
          : `Item ${r.hardwareFacilityId}`,
    }));
  }, [hwBranchRes]);

  /** Facility catalog ids for room API (`facilityId` = branch row `hardwareFacilityId`). */
  const facilityMasterList = useMemo(() => {
    const rows =
      facBranchRes?.success && Array.isArray(facBranchRes.data) ? facBranchRes.data : [];
    return rows.map((r) => ({
      id: r.hardwareFacilityId,
      name:
        r.hardwareFacility?.name != null && String(r.hardwareFacility.name).trim() !== ""
          ? String(r.hardwareFacility.name)
          : `Facility ${r.hardwareFacilityId}`,
    }));
  }, [facBranchRes]);

  const effectiveRoomTypeOptions = useMemo(() => {
    const base = roomTypeOptions.length > 0 ? [...roomTypeOptions] : [];
    if (!apiMode || !roomType) return base;
    const hasMatch = base.some((o) => roomTypeOptionSelected(roomType, o.value));
    if (!hasMatch) {
      const label =
        branchRoomTypeRows.length > 0
          ? displayLabelForApiRoomType(roomType, branchRoomTypeRows)
          : roomType;
      return [{ value: roomType, label }, ...base];
    }
    return base;
  }, [roomTypeOptions, roomType, apiMode, branchRoomTypeRows]);

  const roomTypeLabelForReview = useMemo(() => {
    if (!apiMode) return roomType;
    const o = effectiveRoomTypeOptions.find((x) => roomTypeOptionSelected(roomType, x.value));
    return o?.label ?? roomType;
  }, [apiMode, roomType, effectiveRoomTypeOptions]);

  const currentRoomRow: UnconfiguredRoomRow = useMemo(
    () => ({
      id: roomIdNum,
      branchId: branchIdNum,
      buildingId: initialRoom.buildingId ?? 0,
      floorId: initialRoom.floorId ?? 0,
      roomType: roomType,
      bedCapacity: parseInt(capacity, 10) || 1,
      roomNumber: roomNumber || String(roomIdNum),
      roomConfigStatus: "configuring",
      building: { id: initialRoom.buildingId ?? 0, name: initialRoom.building || "Current Building" },
      floor: { id: initialRoom.floorId ?? 0, floor: initialRoom.floor || "Current Floor" },
      roomTypeDetails: { id: 0, roomType: roomTypeLabelForReview || roomType },
    }),
    [roomIdNum, branchIdNum, initialRoom, roomType, capacity, roomNumber, roomTypeLabelForReview]
  );

  const step7Rows = useMemo(() => {
    const rest = unconfigRows.filter((r) => r.id !== roomIdNum);
    return roomIdNum > 0 ? [currentRoomRow, ...rest] : unconfigRows;
  }, [unconfigRows, roomIdNum, currentRoomRow]);

  const locationPath = formatRoomHierarchyPath(
    initialRoom.building,
    initialRoom.block,
    initialRoom.floor,
  );

  const openError = (msg: string) => {
    setErrorMessage(msg);
    setShowErrorDialog(true);
  };

  const handleAddHardwareLocal = (hardwareName: string) => {
    if (!hardwareName) return;
    const existing = hardware.find((h) => h.name === hardwareName);
    if (existing) {
      setHardware((prev) =>
        prev.map((h) => (h.name === hardwareName ? { ...h, qty: h.qty + 1 } : h))
      );
    } else {
      setHardware((prev) => [...prev, { hardwareFacilityId: 0, name: hardwareName, qty: 1 }]);
    }
    setNewHardwareSelect("");
  };

  const handleAddHardwareFromMaster = (idStr: string) => {
    const id = parseInt(idStr, 10);
    if (!Number.isFinite(id)) return;
    const master =
      hwBranchRes?.success && Array.isArray(hwBranchRes.data)
        ? hwBranchRes.data.find((x) => x.hardwareFacilityId === id)
        : null;
    const name =
      master?.hardwareFacility?.name != null && String(master.hardwareFacility.name).trim() !== ""
        ? String(master.hardwareFacility.name)
        : `Item ${id}`;
    const exists = hardware.find((h) => h.hardwareFacilityId === id);
    if (exists) {
      setHardware((prev) =>
        prev.map((h) => (h.hardwareFacilityId === id ? { ...h, qty: h.qty + 1 } : h))
      );
    } else {
      setHardware((prev) => [...prev, { hardwareFacilityId: id, name, qty: 1 }]);
    }
    setNewHardwareSelect("");
  };

  const handleRemoveHardware = (key: string) => {
    setHardware((prev) =>
      prev.filter((h) => (h.hardwareFacilityId ? String(h.hardwareFacilityId) : h.name) !== key)
    );
  };

  const handleHardwareQty = (key: string, delta: number) => {
    setHardware((prev) =>
      prev
        .map((h) => {
          const k = h.hardwareFacilityId ? String(h.hardwareFacilityId) : h.name;
          if (k !== key) return h;
          const newQty = Math.max(0, h.qty + delta);
          return newQty === 0 ? null : { ...h, qty: newQty };
        })
        .filter(Boolean) as HardwareLine[]
    );
  };

  const toggleFacilityLocal = (name: string) => {
    setFacilities((prev) => {
      const exists = prev.find((f) => f.name === name);
      if (exists) return prev.filter((f) => f.name !== name);
      return [...prev, { facilityId: 0, name }];
    });
  };

  const toggleFacilityApi = (facilityId: number, name: string) => {
    setFacilities((prev) => {
      const exists = prev.find((f) => f.facilityId === facilityId);
      if (exists) return prev.filter((f) => f.facilityId !== facilityId);
      return [...prev, { facilityId, name }];
    });
  };

  const allApiFacilitiesSelected = useMemo(() => {
    if (facilityMasterList.length === 0) return false;
    return facilityMasterList.every((item) => facilities.some((f) => f.facilityId === item.id));
  }, [facilityMasterList, facilities]);

  const toggleSelectAllFacilitiesApi = () => {
    if (allApiFacilitiesSelected) {
      const masterIds = new Set(facilityMasterList.map((i) => i.id));
      setFacilities((prev) => prev.filter((f) => !masterIds.has(f.facilityId)));
    } else {
      setFacilities(
        facilityMasterList.map((item) => ({
          facilityId: item.id,
          name: item.name != null && String(item.name).trim() !== "" ? String(item.name) : String(item.id),
        }))
      );
    }
  };

  const allLocalFacilitiesSelected = useMemo(() => {
    if (FACILITIES_OPTIONS.length === 0) return false;
    return FACILITIES_OPTIONS.every((fac) => facilities.some((f) => f.name === fac));
  }, [facilities]);

  const toggleSelectAllFacilitiesLocal = () => {
    if (allLocalFacilitiesSelected) {
      setFacilities([]);
    } else {
      setFacilities(FACILITIES_OPTIONS.map((fac) => ({ facilityId: 0, name: fac })));
    }
  };

  const handleSave = async () => {
    const roomNumberForSave = sanitizeBedNumberIdentifierInput(roomNumber).trim();

    if (apiMode && branchId != null) {
      const hardwares = hardware
        .filter((h) => h.hardwareFacilityId > 0)
        .map((h) => ({ hardwareId: h.hardwareFacilityId, quantity: h.qty }));
      const facilitiesPayload = facilities
        .filter((f) => f.facilityId > 0)
        .map((f) => ({ facilityId: f.facilityId }));

      try {
        const res = await updateRoom({
          roomId: roomIdNum,
          branchId,
          body: {
            roomType,
            bedCapacity: parseInt(capacity, 10) || 1,
            roomNumber: roomNumberForSave,
            status: apiStatus,
            roomToilet,
            roomCurrentStatus: occupancyUiToApi(currentStatus),
            roomUsage: genderToRoomUsage(genderUsage),
            hardwares,
            facilities: facilitiesPayload,
          },
        }).unwrap();
        const msg = res?.message || "Room configuration updated successfully!";
        setSuccessMessage(msg);
        setShowSuccessDialog(true);
      } catch (e: unknown) {
        const msg =
          e && typeof e === "object" && "data" in e
            ? String((e as { data?: { message?: string } }).data?.message ?? "Request failed.")
            : "Request failed.";
        openError(msg);
      }
      return;
    }

    const hasACFromFacilities = facilities.some((f) => f.name === "Air Conditioning");
    const updated: RoomInventoryItem = {
      ...initialRoom,
      roomNumber: roomNumberForSave,
      capacity: parseInt(capacity, 10) || 1,
      occupancyStatus: currentStatus,
      roomType,
      genderUsage,
      hasAC: hasACFromFacilities,
      hardwareCount: hardware.reduce((s, h) => s + h.qty, 0),
      facilitiesCount: facilities.length,
      status: "configured",
      hardwareItems: hardware.length
        ? hardware.map((h) => ({ name: h.name, qty: h.qty }))
        : undefined,
      facilityNames: facilities.length ? facilities.map((f) => f.name) : undefined,
    };
    onSave(updated);
  };

  const handleSaveAndCopyToOtherRooms = () => {
    setShowCopyStep(true);
    setStepIndex(6);
  };

  const handleBulkSubmit = async () => {
    if (!apiMode || branchIdNum === 0) {
      onSave();
      return;
    }
    const roomNumberForSave = sanitizeBedNumberIdentifierInput(roomNumber).trim();
    const hardwares = hardware
      .filter((h) => h.hardwareFacilityId > 0)
      .map((h) => ({ hardwareId: h.hardwareFacilityId, quantity: h.qty }));
    const facilitiesPayload = facilities
      .filter((f) => f.facilityId > 0)
      .map((f) => ({ facilityId: f.facilityId }));

    try {
      const res = await bulkUpdateRoom({
        branchId: branchIdNum,
        body: {
          roomType,
          bedCapacity: parseInt(capacity, 10) || 1,
          status: apiStatus,
          roomToilet,
          roomCurrentStatus: occupancyUiToApi(currentStatus),
          roomUsage: genderToRoomUsage(genderUsage),
          roomIds: selectedUnconfiguredRoomIds,
          hardwares,
          facilities: facilitiesPayload,
        },
      }).unwrap();

      const msg = res?.message || "Room configuration updated and copied to selected rooms successfully!";
      setSuccessMessage(msg);
      setShowSuccessDialog(true);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "data" in e
          ? String((e as { data?: { message?: string } }).data?.message ?? "Bulk update request failed.")
          : "Bulk update request failed.";
      openError(msg);
    }
  };

  if (apiMode && singleLoading && !singleRes?.success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[320px] gap-3">
        <svg
          className="h-10 w-10 animate-spin text-[#0B8C00]"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <p className="text-sm text-gray-600">Loading room…</p>
      </div>
    );
  }

  if (apiMode && singleError && !singleRes?.success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[280px] gap-4 px-4">
        <p className="text-sm text-red-600 text-center">Could not load room. Check your connection and try again.</p>
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-full">
      <div className={`flex flex-col transition-all duration-300 ${isPanelOpen ? "w-[80%]" : "w-full"}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg hover:bg-green-100"
            >
              <svg className="h-5 w-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Room Configuration</h1>
              <p className="text-sm text-gray-500">Editing {roomNumber}</p>
            </div>
          </div>
          {!isPanelOpen && (
            <button
              type="button"
              onClick={() => setIsPanelOpen(true)}
              className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-full bg-green-600 shadow-lg transition-all hover:bg-green-700"
              aria-label="Open Configuration Summary"
            >
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600 mb-6 px-1">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          </svg>
          <span>{locationPath}</span>
        </div>

        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          {steps.map((step, i) => {
            const isActive = i === stepIndex;
            const isPast = i < stepIndex;
            return (
              <React.Fragment key={step.id}>
                <button
                  type="button"
                  onClick={() => setStepIndex(i)}
                  className={`flex items-center gap-2 flex-shrink-0 ${isActive ? "font-semibold text-gray-900" : "text-gray-500"}`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${isActive ? "bg-gray-900 text-white" : isPast ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"
                      }`}
                  >
                    {isPast ? (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </span>
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
                {i < steps.length - 1 && <span className="flex-shrink-0 w-4 h-0.5 bg-gray-200 rounded" />}
              </React.Fragment>
            );
          })}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex-1">
          {currentStepId === "basic" && (
            <div className="space-y-6 max-w-lg">
              <FormInputField
                label="Room Number / Identifier"
                value={roomNumber}
                placeholder="e.g., G-A-001, Wing_B_12"
                maxLength={100}
                autoComplete="off"
                onChange={(e) => setRoomNumber(sanitizeBedNumberIdentifierInput(e.target.value))}
                onBlur={(e) => {
                  const t = e.target.value.trim();
                  if (t !== e.target.value) setRoomNumber(t);
                }}
                disabled={true}
              // helperText="Letters, digits, spaces, hyphen (-), and underscore (_). Max 100; max two identical characters in a row."
              />
              <FormInputField
                label="Room Capacity (Beds/Patients)"
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                min={1}
              />
              <FormSelectField
                label="Current Status"
                options={STATUS_OPTIONS}
                value={currentStatus}
                onChange={(v) => setCurrentStatus((typeof v === "string" ? v : v[0]) as OccupancyStatus)}
              />
              {apiMode ? (
                <FormSelectField
                  label="Room toilet"
                  options={TOILET_OPTIONS}
                  value={roomToilet}
                  onChange={(v) => setRoomToilet(typeof v === "string" ? v : v[0] ?? "western")}
                />
              ) : null}
            </div>
          )}

          {currentStepId === "roomType" &&
            (apiMode ? (
              <div className="max-w-2xl">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Select Room Type</h3>
                {effectiveRoomTypeOptions.length === 0 ? (
                  <p className="text-sm text-gray-500">No room types configured for this branch.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {effectiveRoomTypeOptions.map((opt) => {
                      const selected = roomTypeOptionSelected(roomType, opt.value);
                      return (
                        <button
                          key={`${opt.value}-${opt.label}`}
                          type="button"
                          onClick={() => setRoomType(opt.value)}
                          className={`flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-colors ${selected ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:border-gray-300"
                            }`}
                        >
                          <span
                            className={`flex h-5 w-5 rounded-full border-2 flex-shrink-0 mt-0.5 ${selected ? "border-gray-900 bg-gray-900" : "border-gray-300"
                              }`}
                          >
                            {selected && (
                              <svg className="h-full w-full text-white p-0.5" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </span>
                          <div>
                            <p className="font-medium text-gray-900">{opt.label}</p>
                            {opt.label !== opt.value ? (
                              <p className="text-xs text-gray-500">{opt.value}</p>
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="max-w-2xl">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Select Room Type</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ROOM_TYPES.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRoomType(opt.value)}
                      className={`flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-colors ${roomType === opt.value ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:border-gray-300"
                        }`}
                    >
                      <span
                        className={`flex h-5 w-5 rounded-full border-2 flex-shrink-0 mt-0.5 ${roomType === opt.value ? "border-gray-900 bg-gray-900" : "border-gray-300"
                          }`}
                      >
                        {roomType === opt.value && (
                          <svg className="h-full w-full text-white p-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">{opt.label}</p>
                        <p className="text-xs text-gray-500">{opt.category}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}

          {currentStepId === "attributes" && (
            <div className="space-y-8 max-w-lg">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Gender Usage</h3>
                <div className="flex gap-3 flex-wrap">
                  {(["Male", "Female", "Mixed"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGenderUsage(g)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 ${genderUsage === g ? "border-gray-900 bg-gray-50" : "border-gray-200"
                        }`}
                    >
                      <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                      <span>{genderUsageDisplayLabel(g)}</span>
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-500">Air Conditioning is configured in the Facilities step.</p>
            </div>
          )}

          {currentStepId === "hardware" &&
            (apiMode ? (
              <div className="space-y-6 max-w-xl">
                <div>
                  <FormSelectField
                    label="Add Hardware Equipment"
                    options={hardwareMasterOptions}
                    value={hardware.filter((h) => h.hardwareFacilityId > 0).map((h) => String(h.hardwareFacilityId))}
                    onChange={(value) => {
                      const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
                      const selectedIds = selectedValues.map((v) => parseInt(v, 10)).filter((n) => Number.isFinite(n));
                      setHardware((prev) => {
                        const updated = prev.filter(
                          (h) => h.hardwareFacilityId === 0 || selectedIds.includes(h.hardwareFacilityId)
                        );
                        selectedIds.forEach((id) => {
                          if (!updated.some((h) => h.hardwareFacilityId === id)) {
                            const master =
                              hwBranchRes?.success && Array.isArray(hwBranchRes.data)
                                ? hwBranchRes.data.find((x) => x.hardwareFacilityId === id)
                                : null;
                            const name =
                              master?.hardwareFacility?.name != null && String(master.hardwareFacility.name).trim() !== ""
                                ? String(master.hardwareFacility.name)
                                : `Item ${id}`;
                            updated.push({ hardwareFacilityId: id, name, qty: 1 });
                          }
                        });
                        return updated;
                      });
                    }}
                    placeholder="Select equipment to add..."
                    mode="multiple"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Installed Hardware</h3>
                  {hardware.length === 0 ? (
                    <p className="text-sm text-gray-500">No hardware added yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {hardware.map((h) => {
                        const key = h.hardwareFacilityId ? String(h.hardwareFacilityId) : h.name;
                        return (
                          <div
                            key={key}
                            className="flex items-center justify-between p-3 rounded-lg border border-gray-200"
                          >
                            <div className="flex items-center gap-2">
                              <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span className="text-sm font-medium">{h.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleHardwareQty(key, -1)}
                                className="h-8 w-8 rounded border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                              >
                                −
                              </button>
                              <span className="w-8 text-center text-sm">{h.qty}</span>
                              <button
                                type="button"
                                onClick={() => handleHardwareQty(key, 1)}
                                className="h-8 w-8 rounded border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                              >
                                +
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveHardware(key)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6 max-w-xl">
                <div>
                  <FormSelectField
                    label="Add Hardware Equipment"
                    options={HARDWARE_OPTIONS.map((name) => ({
                      label: name,
                      value: name,
                    }))}
                    value={hardware.map((h) => h.name)}
                    onChange={(value) => {
                      const selectedNames = Array.isArray(value) ? value : value ? [value] : [];
                      setHardware((prev) => {
                        const updated = prev.filter((h) => selectedNames.includes(h.name));
                        selectedNames.forEach((name) => {
                          if (!updated.some((h) => h.name === name)) {
                            updated.push({ hardwareFacilityId: 0, name, qty: 1 });
                          }
                        });
                        return updated;
                      });
                    }}
                    placeholder="Select equipment to add..."
                    mode="multiple"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Installed Hardware</h3>
                  {hardware.length === 0 ? (
                    <p className="text-sm text-gray-500">No hardware added yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {hardware.map((h) => {
                        const key = h.name;
                        return (
                          <div
                            key={key}
                            className="flex items-center justify-between p-3 rounded-lg border border-gray-200"
                          >
                            <div className="flex items-center gap-2">
                              <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span className="text-sm font-medium">{h.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleHardwareQty(key, -1)}
                                className="h-8 w-8 rounded border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                              >
                                −
                              </button>
                              <span className="w-8 text-center text-sm">{h.qty}</span>
                              <button
                                type="button"
                                onClick={() => handleHardwareQty(key, 1)}
                                className="h-8 w-8 rounded border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                              >
                                +
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveHardware(key)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}

          {currentStepId === "facilities" &&
            (apiMode ? (
              <div className="max-w-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">Select Available Facilities</h3>
                  {/* {facilityMasterList.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleSelectAllFacilitiesApi}
                      className="cursor-pointer text-xs font-semibold text-green-700 hover:text-green-800 bg-green-50 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <span
                        className={`flex h-4 w-4 rounded border flex-shrink-0 ${allApiFacilitiesSelected ? "border-green-700 bg-green-700 text-white" : "border-gray-400 bg-white"}`}
                      >
                        {allApiFacilitiesSelected && (
                          <svg className="h-full w-full p-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </span>
                      All ({allApiFacilitiesSelected ? "Selected" : "Select All"})
                    </button>
                  )} */}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {facilityMasterList.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleSelectAllFacilitiesApi}
                      className={`cursor-pointer flex items-center gap-3 p-4 rounded-lg border-2 text-left ${allApiFacilitiesSelected ? "border-gray-900 bg-gray-50" : "border-gray-200"}`}
                    >
                      <span
                        className={`flex h-5 w-5 rounded border-2 flex-shrink-0 ${allApiFacilitiesSelected ? "border-gray-900 bg-gray-900" : "border-gray-300"}`}
                      >
                        {allApiFacilitiesSelected && (
                          <svg className="h-full w-full text-white p-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">All (Select All)</span>
                    </button>
                  )}
                  {facilityMasterList.map((item) => {
                    const selected = facilities.some((f) => f.facilityId === item.id);
                    const label =
                      item.name != null && String(item.name).trim() !== "" ? String(item.name) : String(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleFacilityApi(item.id, label)}
                        className={`cursor-pointer flex items-center gap-3 p-4 rounded-lg border-2 text-left ${selected ? "border-gray-900 bg-gray-50" : "border-gray-200"
                          }`}
                      >
                        <span
                          className={`flex h-5 w-5 rounded border-2 flex-shrink-0 ${selected ? "border-gray-900 bg-gray-900" : "border-gray-300"
                            }`}
                        >
                          {selected && (
                            <svg className="h-full w-full text-white p-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="max-w-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">Select Available Facilities</h3>
                  {FACILITIES_OPTIONS.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleSelectAllFacilitiesLocal}
                      className="cursor-pointer text-xs font-semibold text-green-700 hover:text-green-800 bg-green-50 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <span
                        className={`flex h-4 w-4 rounded border flex-shrink-0 ${allLocalFacilitiesSelected ? "border-green-700 bg-green-700 text-white" : "border-gray-400 bg-white"}`}
                      >
                        {allLocalFacilitiesSelected && (
                          <svg className="h-full w-full p-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </span>
                      All ({allLocalFacilitiesSelected ? "Selected" : "Select All"})
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {FACILITIES_OPTIONS.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleSelectAllFacilitiesLocal}
                      className={`cursor-pointer flex items-center gap-3 p-4 rounded-lg border-2 text-left ${allLocalFacilitiesSelected ? "border-gray-900 bg-gray-50" : "border-gray-200"}`}
                    >
                      <span
                        className={`flex h-5 w-5 rounded border-2 flex-shrink-0 ${allLocalFacilitiesSelected ? "border-gray-900 bg-gray-900" : "border-gray-300"}`}
                      >
                        {allLocalFacilitiesSelected && (
                          <svg className="h-full w-full text-white p-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">All (Select All)</span>
                    </button>
                  )}
                  {FACILITIES_OPTIONS.map((fac) => (
                    <button
                      key={fac}
                      type="button"
                      onClick={() => toggleFacilityLocal(fac)}
                      className={`cursor-pointer flex items-center gap-3 p-4 rounded-lg border-2 text-left ${facilities.some((f) => f.name === fac) ? "border-gray-900 bg-gray-50" : "border-gray-200"
                        }`}
                    >
                      <span
                        className={`flex h-5 w-5 rounded border-2 flex-shrink-0 ${facilities.some((f) => f.name === fac) ? "border-gray-900 bg-gray-900" : "border-gray-300"
                          }`}
                      >
                        {facilities.some((f) => f.name === fac) && (
                          <svg className="h-full w-full text-white p-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{fac}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}

          {currentStepId === "review" && (
            <div className="max-w-2xl space-y-6">
              <h3 className="text-sm font-semibold text-gray-900">Room Configuration Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Room Number</p>
                  <p className="font-semibold text-gray-900">{roomNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Room Type</p>
                  <p className="font-semibold text-gray-900">{roomTypeLabelForReview}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Capacity</p>
                  <p className="font-semibold text-gray-900">{capacity} bed(s)</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Gender</p>
                  <p className="font-semibold text-gray-900">
                    {genderUsage ? genderUsageDisplayLabel(genderUsage) : "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">AC</p>
                  <p className="font-semibold text-gray-900">
                    {facilities.some((f) => f.name === "Air Conditioning") ? "Yes" : "No"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                    {currentStatus}
                  </span>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  Hardware ({hardware.reduce((s, h) => s + h.qty, 0)})
                </h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  {hardware.map((h) => (
                    <li key={h.hardwareFacilityId || h.name}>
                      {h.name}: Qty: {h.qty}
                    </li>
                  ))}
                  {hardware.length === 0 && <li className="text-gray-500">None</li>}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Facilities ({facilities.length})</h4>
                <div className="flex flex-wrap gap-2">
                  {facilities.map((f) => (
                    <span key={f.facilityId || f.name} className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                      {f.name}
                    </span>
                  ))}
                  {facilities.length === 0 && <span className="text-sm text-gray-500">None</span>}
                </div>
              </div>
            </div>
          )}

          {currentStepId === "configOtherRooms" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Config Other Rooms</h3>
                  <p className="text-sm text-gray-500">
                    Select incomplete rooms to copy configuration from {roomNumber}.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-[280px]">
                    <FormSelectField
                      label=""
                      options={unconfigBuildingOptions}
                      value={unconfigBuildingFilter}
                      onChange={(v) => {
                        setUnconfigBuildingFilter((typeof v === "string" ? v : v[0]) || "all");
                        setUnconfigPage(1);
                      }}
                      placeholder="All Buildings"
                      disabled={buildingsLoading}
                      emptyMessage={buildingsLoading ? "Loading…" : "No buildings"}
                    />
                  </div>
                  <div className="w-[280px]">
                    <FormSelectField
                      label=""
                      options={unconfigRoomTypeOptions}
                      value={unconfigRoomTypeFilter}
                      onChange={(v) => {
                        setUnconfigRoomTypeFilter((typeof v === "string" ? v : v[0]) || "all");
                        setUnconfigPage(1);
                      }}
                      placeholder="All Types"
                      disabled={typesLoading}
                      emptyMessage={
                        typesLoading ? "Loading…" : unconfigRoomTypeOptions.length <= 1 ? "Add room types for this branch" : "All Types"
                      }
                    />
                  </div>
                  <div className="text-sm text-gray-600">
                    Selected: <span className="font-semibold text-[#0B8C00]">{selectedUnconfiguredRoomIds.length}</span> room(s)
                  </div>
                </div>
              </div>

              {isUnconfigLoading || isUnconfigFetching ? (
                <p className="text-sm text-gray-500 py-6">Loading unconfigured rooms…</p>
              ) : isUnconfigError ? (
                <p className="text-sm text-red-600 py-6">Could not fetch unconfigured rooms.</p>
              ) : unconfigRows.length === 0 ? (
                <p className="text-sm text-gray-500 py-6">No unconfigured rooms found for this branch.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 text-center">
                          <Checkbox
                            checked={allCurrentPageSelected}
                            onChange={toggleSelectAllUnconfig}
                          />
                        </TableHead>
                        <TableHead>Room Number</TableHead>
                        <TableHead>Building</TableHead>
                        <TableHead>Floor</TableHead>
                        <TableHead>Room Type</TableHead>
                        {/* <TableHead>Bed Capacity</TableHead> */}
                        <TableHead>Config Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {step7Rows.map((room) => {
                        const isCurrentRoom = roomIdNum > 0 && room.id === roomIdNum;
                        const isSelected = selectedUnconfiguredRoomIds.includes(room.id);
                        const bName = room.building?.name ?? `Building #${room.buildingId}`;
                        const fName = room.floor?.floor ?? `Floor #${room.floorId}`;
                        const rType = room.roomTypeDetails?.roomType ?? room.roomType ?? "—";
                        return (
                          <TableRow
                            key={room.id}
                            className={`${isCurrentRoom ? "bg-blue-50/50" : "cursor-pointer"} ${isSelected && !isCurrentRoom ? "bg-green-50/50" : ""}`}
                            onClick={() => {
                              if (!isCurrentRoom) toggleSelectUnconfigRoom(room.id);
                            }}
                          >
                            <TableData className="text-center">
                              <div onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={isSelected}
                                  disabled={isCurrentRoom}
                                  onChange={() => {
                                    if (!isCurrentRoom) toggleSelectUnconfigRoom(room.id);
                                  }}
                                />
                              </div>
                            </TableData>
                            <TableData className="font-medium text-gray-900">
                              {room.roomNumber}
                              {isCurrentRoom ? (
                                <span className="ml-2 text-xs font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                                  (Current Room)
                                </span>
                              ) : null}
                            </TableData>
                            <TableData>{bName}</TableData>
                            <TableData>{fName}</TableData>
                            <TableData>{rType}</TableData>
                            {/* <TableData>{room.bedCapacity ?? "—"}</TableData> */}
                            <TableData>
                              {isCurrentRoom ? (
                                <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 capitalize">
                                  Configuring
                                </span>
                              ) : (
                                <span className="inline-flex rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 capitalize">
                                  {room.roomConfigStatus || "incomplete"}
                                </span>
                              )}
                            </TableData>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {unconfigTotal > 0 ? (
                <Pagination
                  currentPage={unconfigPage}
                  totalItems={unconfigTotal}
                  itemsPerPage={unconfigLimit}
                  onPageChange={setUnconfigPage}
                  onItemsPerPageChange={(newLimit) => {
                    setUnconfigLimit(newLimit);
                    setUnconfigPage(1);
                  }}
                  itemsPerPageOptions={[10, 20, 50, 100]}
                />
              ) : null}
            </div>
          )}
        </div>

        <div className="flex justify-between mt-6 pt-6 border-t border-gray-200">
          <Button variant="outline" onClick={() => setStepIndex((i) => Math.max(0, i - 1))} disabled={stepIndex === 0 || isBulkSaving || saving}>
            Previous
          </Button>
          {stepIndex < steps.length - 1 ? (
            <Button variant="primary" onClick={() => setStepIndex((i) => i + 1)}>
              Next Step
            </Button>
          ) : currentStepId === "review" ? (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                type="button"
                onClick={() => handleSaveAndCopyToOtherRooms()}
                disabled={saving}
              >
                Save & Copy To Other Rooms
              </Button>
              <Button
                variant="primary"
                onClick={() => void handleSave()}
                isLoading={saving}
                leftIcon={!saving ? <span className="text-white">✓</span> : undefined}
              >
                Save Room Configuration
              </Button>
            </div>
          ) : (
            <Button
              variant="primary"
              onClick={() => void handleBulkSubmit()}
              isLoading={isBulkSaving}
            >
              Submit
            </Button>
          )}
        </div>
      </div>

      <ConfigurationSummaryPanel
        facilityName={facilityName}
        completionPercentage={configurationSummaryForPanel.completionPercentage}
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        buildings={configurationSummaryForPanel.buildings}
        floors={configurationSummaryForPanel.floors}
        totalRooms={configurationSummaryForPanel.totalRooms}
        configuredRooms={configurationSummaryForPanel.configuredRooms}
        incompleteRooms={configurationSummaryForPanel.incompleteRooms}
        lastModified={configurationSummaryForPanel.lastModified}
      />

      <MessageDialog
        open={showErrorDialog}
        onClose={() => setShowErrorDialog(false)}
        icon="/icons/CrossIcon.svg"
        iconBgColor="#FFEBEE"
        message={errorMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => setShowErrorDialog(false)}
      />

      <MessageDialog
        open={showSuccessDialog}
        onClose={() => {
          setShowSuccessDialog(false);
          onSave();
        }}
        icon="/icons/SuccessCheck.svg"
        iconBgColor="#E8F5E9"
        message={successMessage}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => {
          setShowSuccessDialog(false);
          onSave();
        }}
      />
    </div>
  );
};

"use client";

import { AppShell } from '@/components/layout/AppShell'
import { PageHeading } from '@/components/layout/PageHeading'
import {
  ActionCard,
  Breadcrumb,
  ConfigurationProgress,
  ConfigurationProgressCard,
  ConfigurationSummaryPanel,
  MasterDataCard,
} from '@/components/ui'
import { BedManagement, RoomInventory, RoomTypeMaster, StructureBuilder, HardwareMaster, FacilitiesMaster, CompleteHierarchyTree, RoomConfiguration, ConsultancyBranchService } from '@/components/infrastructure'
import type { RoomInventoryItem } from '@/components/infrastructure'
import { useSearchParams } from 'next/navigation'
import React, { useMemo, useState } from 'react'
import { useGetBranchHierarchyTreeQuery, useGetBranchRoomTypesByBranchQuery } from '@/store/api/branchSetupApi'
import { branchRoomTypeSelectOptions } from '@/lib/utils/branchRoomTypeOptions'
import { usePermission } from '@/hooks/usePermission'
import type { HierarchyInsights } from '@/lib/utils/branchHierarchyStats'
import {
  computeBranchHierarchyStats,
  formatHierarchyLastModified,
  roomsConfiguredDisplay,
  statDisplay,
} from '@/lib/utils/branchHierarchyStats'
import type { FacilityConfigurationSummarySnapshot } from '@/lib/types/facilityConfigurationSummary'

function insightMasterCount(
  ins: HierarchyInsights | null | undefined,
  key: 'totalBranchRoomTypes' | 'totalBranchHardware' | 'totalBranchFacility',
): number | null {
  if (!ins || typeof ins !== 'object') return null;
  const v = ins[key];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return 0;
}

function subtitleRoomTypes(n: number | null, loading: boolean, hasBranch: boolean): string {
  if (!hasBranch) return '—';
  if (loading && n === null) return 'Loading…';
  const c = n ?? 0;
  return c === 1 ? '1 type defined' : `${c} types defined`;
}

function subtitleItemsAvailable(
  n: number | null,
  loading: boolean,
  hasBranch: boolean,
): string {
  if (!hasBranch) return '—';
  if (loading && n === null) return 'Loading…';
  const c = n ?? 0;
  if (c === 1) return '1 item available — click to view list';
  return `${c} items available — click to view list`;
}

/** Tree nodes use ids like `room-42`; room APIs expect numeric string `42`. */
function roomIdForApi(id: string): string {
  const m = /^room-(\d+)$/i.exec(String(id).trim());
  if (m) return m[1];
  return String(id).trim();
}

type ProgressCardStatus = "Complete" | "In Progress" | "-";

const PROGRESS_CARD_TEMPLATES = [
  {
    id: 1,
    title: "Buildings & Structure",
    description: "Define buildings and floors",
    icon: (
      <svg
        className="h-5 w-5 text-green-700"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        />
      </svg>
    ),
    iconBgColor: "bg-green-100",
  },
  {
    id: 2,
    title: "Floors",
    description: "Add floors to each building",
    icon: (
      <svg
        className="h-5 w-5 text-green-700"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 6h16M4 12h16M4 18h16"
        />
      </svg>
    ),
    iconBgColor: "bg-green-100",
  },
  {
    id: 3,
    title: "Rooms Created",
    description: "Add rooms and spaces",
    icon: (
      <svg
        className="h-5 w-5 text-green-700"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
    iconBgColor: "bg-green-100",
  },
  {
    id: 4,
    title: "Rooms Configured",
    description: "Hardware, facilities, and details",
    icon: (
      <svg
        className="h-5 w-5 text-green-700"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
        />
      </svg>
    ),
    iconBgColor: "bg-green-100",
  },
] as const;

function metricToDisplayString(m: number | string): string {
  if (m === "-") return "-";
  return String(m);
}

/** Progress cards: unknown count → "0" (aligned with Structure Overview). */
function progressCardCountDisplay(v: string): string {
  return v === "-" ? "0" : v;
}

/** Progress card for room ratio: unknown → "0 / 0". */
function progressCardRoomsValue(raw: string): string {
  return raw === "-" ? "0 / 0" : raw;
}

function statusForStructureCount(display: string): ProgressCardStatus {
  if (display === "-") return "-";
  const n = parseInt(display, 10);
  if (!Number.isFinite(n)) return "-";
  return n > 0 ? "Complete" : "In Progress";
}

function statusForRoomsConfiguredCard(value: string, configuredKnown: boolean): ProgressCardStatus {
  if (!configuredKnown || value === "-") return "-";
  const parts = value.split("/").map((s) => parseInt(s.trim(), 10));
  if (parts.length !== 2 || !parts.every((x) => Number.isFinite(x))) return "-";
  const [c, t] = parts;
  if (t === 0) return "Complete";
  return c >= t ? "Complete" : "In Progress";
}

function readCompletionPercent(
  searchParams: ReturnType<typeof useSearchParams>,
  fallback: number | null
): number | null {
  const raw = searchParams?.get("completion");
  if (raw == null || raw === "") return fallback;
  if (raw === "-" || raw.toUpperCase() === "N/A") return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : null;
}

/** Integer for progress UI, or "-" placeholders from list navigation (never NaN). */
function readQueryMetric(
  searchParams: ReturnType<typeof useSearchParams>,
  key: string,
  fallback: number
): number | string {
  const raw = searchParams?.get(key);
  if (raw == null || raw === "") return fallback;
  if (raw === "-" || raw.toUpperCase() === "N/A") return "-";
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : "-";
}

const page = () => {
  const modulePermission = usePermission("Infrastructure");
  const subModulePermission = usePermission("Infrastructure", { subModule: "Add Hospital/Clinic" });
  const canView = modulePermission.canView || subModulePermission.canView;
  const canAdd = modulePermission.canAdd || subModulePermission.canAdd;
  const canEdit = modulePermission.canEdit || subModulePermission.canEdit;
  const canDelete = modulePermission.canDelete || subModulePermission.canDelete;

  const searchParams = useSearchParams();
  const facilityName = searchParams?.get('facility') || 'City General Hospital';
  const facilityType = searchParams?.get('type') || 'Hospital';
  const facilityAddress = searchParams?.get('address') || '123 Healthcare Blvd, Medical District';
  const branchIdParam = searchParams?.get('branchId');
  const branchIdNum =
    branchIdParam != null && /^\d+$/.test(branchIdParam.trim())
      ? Number(branchIdParam)
      : null;

  const { data: hierarchyResponse, isLoading: hierarchyLoading } =
    useGetBranchHierarchyTreeQuery(branchIdNum ?? 0, { skip: branchIdNum === null || !canView });

  const { data: branchRoomTypesRes } = useGetBranchRoomTypesByBranchQuery(branchIdNum ?? 0, {
    skip: branchIdNum === null || !canView,
  });

  const branchRoomTypeRows =
    branchRoomTypesRes?.success && Array.isArray(branchRoomTypesRes.data) ? branchRoomTypesRes.data : [];

  const roomTypeOptionsForConfig = useMemo(
    () => branchRoomTypeSelectOptions(branchRoomTypeRows),
    [branchRoomTypeRows],
  );

  const hierarchyStats = useMemo(() => {
    if (branchIdNum === null) return undefined;
    if (hierarchyLoading && !hierarchyResponse) return null;
    if (!hierarchyResponse?.success || !Array.isArray(hierarchyResponse.data)) return null;
    return computeBranchHierarchyStats(hierarchyResponse.data);
  }, [branchIdNum, hierarchyLoading, hierarchyResponse]);

  const displayFacilityName =
    hierarchyResponse?.success && hierarchyResponse.data?.[0]?.name
      ? String(hierarchyResponse.data[0].name)
      : facilityName;

  const completionForUi = useMemo((): number | null => {
    if (branchIdNum !== null) {
      if (hierarchyStats == null) return null;
      return hierarchyStats.completionPercent;
    }
    return readCompletionPercent(searchParams, null);
  }, [branchIdNum, hierarchyStats, searchParams]);

  const buildings = readQueryMetric(searchParams, 'buildings', 2);
  const floors = readQueryMetric(searchParams, 'floors', 3);
  const totalRooms = readQueryMetric(searchParams, 'totalRooms', 2);
  const configuredRooms = readQueryMetric(searchParams, 'configuredRooms', 1);
  const incompleteRooms = readQueryMetric(searchParams, 'incompleteRooms', 1);

  const configurationProgressCards = useMemo(() => {
    const templates = [...PROGRESS_CARD_TEMPLATES];
    if (branchIdNum === null) {
      const b = readQueryMetric(searchParams, "buildings", 2);
      const f = readQueryMetric(searchParams, "floors", 3);
      const tr = readQueryMetric(searchParams, "totalRooms", 2);
      const cr = readQueryMetric(searchParams, "configuredRooms", 1);
      const bStr = metricToDisplayString(b);
      const fStr = metricToDisplayString(f);
      const trStr = metricToDisplayString(tr);
      const crStr = metricToDisplayString(cr);
      const roomsValRaw =
        trStr === "-" || crStr === "-" ? "-" : `${crStr} / ${trStr}`;
      const roomsKnown = trStr !== "-" && crStr !== "-";
      return templates.map((t, i) => {
        const rows: Array<{ value: string; status: ProgressCardStatus }> = [
          {
            value: progressCardCountDisplay(bStr),
            status: statusForStructureCount(progressCardCountDisplay(bStr)),
          },
          {
            value: progressCardCountDisplay(fStr),
            status: statusForStructureCount(progressCardCountDisplay(fStr)),
          },
          {
            value: progressCardCountDisplay(trStr),
            status: statusForStructureCount(progressCardCountDisplay(trStr)),
          },
          {
            value: progressCardRoomsValue(roomsValRaw),
            status: statusForRoomsConfiguredCard(roomsValRaw, roomsKnown),
          },
        ];
        return { ...t, ...rows[i] };
      });
    }
    if (hierarchyStats == null) {
      return templates.map((t, i) => ({
        ...t,
        value: i === 3 ? "0 / 0" : "0",
        status:
          i === 3
            ? statusForRoomsConfiguredCard("-", false)
            : statusForStructureCount("0"),
      }));
    }
    const s = hierarchyStats;
    const roomsValRaw = roomsConfiguredDisplay(s.configuredRooms, s.rooms, s.configuredKnown);
    const bDisp = progressCardCountDisplay(statDisplay(s.buildings));
    const fDisp = progressCardCountDisplay(statDisplay(s.floors));
    const rDisp = progressCardCountDisplay(statDisplay(s.rooms));
    return [
      { ...templates[0], value: bDisp, status: statusForStructureCount(bDisp) },
      { ...templates[1], value: fDisp, status: statusForStructureCount(fDisp) },
      { ...templates[2], value: rDisp, status: statusForStructureCount(rDisp) },
      {
        ...templates[3],
        value: progressCardRoomsValue(roomsValRaw),
        status: statusForRoomsConfiguredCard(roomsValRaw, s.configuredKnown),
      },
    ];
  }, [branchIdNum, hierarchyStats, searchParams]);

  const panelBuildings =
    branchIdNum !== null
      ? hierarchyStats == null
        ? "-"
        : statDisplay(hierarchyStats.buildings)
      : buildings;
  const panelFloors =
    branchIdNum !== null
      ? hierarchyStats == null
        ? "-"
        : statDisplay(hierarchyStats.floors)
      : floors;
  const panelTotalRooms =
    branchIdNum !== null
      ? hierarchyStats == null
        ? "-"
        : statDisplay(hierarchyStats.rooms)
      : totalRooms;
  const panelConfiguredRooms =
    branchIdNum !== null
      ? hierarchyStats == null
        ? "-"
        : hierarchyStats.configuredKnown
          ? statDisplay(hierarchyStats.configuredRooms)
          : "-"
      : configuredRooms;
  const panelIncompleteRooms =
    branchIdNum !== null
      ? hierarchyStats == null
        ? "-"
        : hierarchyStats.configuredKnown
          ? statDisplay(hierarchyStats.incompleteRooms)
          : "-"
      : incompleteRooms;

  const lastModifiedStr =
    branchIdNum === null || hierarchyStats == null
      ? "-"
      : formatHierarchyLastModified(hierarchyStats.lastModifiedIso);

  const facilityConfigurationSummary = useMemo((): FacilityConfigurationSummarySnapshot | null => {
    if (branchIdNum === null) return null;
    return {
      completionPercentage: completionForUi,
      lastModified: lastModifiedStr,
      buildings: panelBuildings,
      floors: panelFloors,
      totalRooms: panelTotalRooms,
      configuredRooms: panelConfiguredRooms,
      incompleteRooms: panelIncompleteRooms,
    };
  }, [
    branchIdNum,
    completionForUi,
    lastModifiedStr,
    panelBuildings,
    panelFloors,
    panelTotalRooms,
    panelConfiguredRooms,
    panelIncompleteRooms,
  ]);

  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [activeView, setActiveView] = useState<
    | 'structure'
    | 'inventory'
    | 'roomType'
    | 'hardware'
    | 'facilities'
    | 'hierarchyTree'
    | 'roomConfigFromStructure'
    | 'bedManagementFromStructure'
    | 'branchConsultancy'
    | null
  >(null);
  const [roomToEditFromStructure, setRoomToEditFromStructure] = useState<RoomInventoryItem | null>(null);
  const [roomForBedsFromStructure, setRoomForBedsFromStructure] = useState<RoomInventoryItem | null>(null);

  /** Build RoomInventoryItem from Structure Builder tree room + context so we can open Room Configuration */
  const handleEditRoomFromStructure = (room: { id: string; name: string; roomNumber?: string; roomType?: string }, context: { building: string; block: string; floor: string }) => {
    if (!canAdd && !canEdit) return;
    const roomItem: RoomInventoryItem = {
      id: roomIdForApi(room.id),
      roomNumber: room.roomNumber ?? room.name,
      roomType: room.roomType ?? 'Consultation Room',
      building: context.building,
      block: context.block,
      floor: context.floor,
      status: 'incomplete',
      occupancyStatus: 'Vacant',
      capacity: 1,
      genderUsage: 'Mixed',
      hasAC: false,
      hardwareCount: 0,
      facilitiesCount: 0,
    };
    setRoomToEditFromStructure(roomItem);
    setActiveView('roomConfigFromStructure');
    setIsPanelOpen(false);
  };

  const handleOpenBedManagementFromStructure = (
    room: { id: string; name: string; roomNumber?: string; roomType?: string },
    context: { building: string; block: string; floor: string; buildingId: number; floorId: number },
  ) => {
    if (!canEdit) return;
    const roomItem: RoomInventoryItem = {
      id: roomIdForApi(room.id),
      roomNumber: room.roomNumber ?? room.name,
      roomType: room.roomType ?? 'Consultation Room',
      building: context.building,
      block: context.block,
      floor: context.floor,
      buildingId: context.buildingId,
      floorId: context.floorId,
      status: 'incomplete',
      occupancyStatus: 'Vacant',
      capacity: 1,
      genderUsage: 'Mixed',
      hasAC: false,
      hardwareCount: 0,
      facilitiesCount: 0,
    };
    setRoomForBedsFromStructure(roomItem);
    setActiveView('bedManagementFromStructure');
    setIsPanelOpen(false);
  };

  const masterDataCards = useMemo(() => {
    const hasBranch = branchIdNum !== null;
    const branch0 =
      hierarchyResponse?.success && Array.isArray(hierarchyResponse.data)
        ? hierarchyResponse.data[0]
        : undefined;
    const ins = branch0?.insights ?? null;
    const countRt = insightMasterCount(ins, 'totalBranchRoomTypes');
    const countHw = insightMasterCount(ins, 'totalBranchHardware');
    const countFc = insightMasterCount(ins, 'totalBranchFacility');
    const loading = hasBranch && hierarchyLoading && !hierarchyResponse;

    return [
      {
        id: 1,
        title: 'Room Types',
        subtitle: subtitleRoomTypes(countRt, loading, hasBranch),
        icon: (
          <svg
            className="h-6 w-6 text-green-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
        ),
        iconBgColor: 'bg-green-100',
        onClick: () => {
          if (!canView) return;
          setActiveView('roomType');
          setIsPanelOpen(false);
        },
      },
      {
        id: 2,
        title: 'Hardware',
        subtitle: subtitleItemsAvailable(countHw, loading, hasBranch),
        icon: (
          <svg
            className="h-6 w-6 text-green-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        ),
        iconBgColor: 'bg-green-100',
        onClick: () => {
          if (!canView) return;
          setActiveView('hardware');
          setIsPanelOpen(false);
        },
      },
      {
        id: 3,
        title: 'Facilities',
        subtitle: subtitleItemsAvailable(countFc, loading, hasBranch),
        icon: (
          <svg
            className="h-6 w-6 text-green-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        ),
        iconBgColor: 'bg-green-100',
        onClick: () => {
          if (!canView) return;
          setActiveView('facilities');
          setIsPanelOpen(false);
        },
      },
    ];
  }, [branchIdNum, canView, hierarchyLoading, hierarchyResponse]);

  const actionCards = [
    {
      id: 1,
      title: "Manage Structure",
      description: "Buildings, floors & rooms",
      icon: (
        <svg
          className="h-6 w-6 text-green-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      ),
      buttonLabel: "Configure",
      iconBgColor: "bg-green-100",
      onClick: () => {
        if (!canView) return;
        setActiveView('structure');
        setIsPanelOpen(false);
      },
    },
    {
      id: 2,
      title: "Room Inventory",
      description: "View and configure all rooms",
      icon: (
        <svg
          className="h-6 w-6 text-green-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
          />
        </svg>
      ),
      buttonLabel: "View All",
      iconBgColor: "bg-green-100",
      onClick: () => {
        if (!canView) return;
        setActiveView('inventory');
        setIsPanelOpen(false);
      },
    },
    {
      id: 3,
      title: "Branch Consultancy Service",
      description: "Consultancy fees and billing for this branch",
      icon: (
        <svg
          className="h-6 w-6 text-green-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8.25a6.5 6.5 0 01-6.5-6.5H9"
          />
        </svg>
      ),
      buttonLabel: "Configure",
      iconBgColor: "bg-green-100",
      onClick: () => {
        if (!canView) return;
        setActiveView("branchConsultancy");
        setIsPanelOpen(false);
      },
    },
  ];

  const homeIcon = (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  );

  const breadcrumbItems = [
    {
      label: 'All Facilities',
      href: '/infrastructure',
      icon: homeIcon,
    },
    {
      label: displayFacilityName,
    },
  ];

  if (!canView) {
    return (
      <AppShell>
        <div className="rounded-[12px] border border-red-200 bg-red-50 p-4 text-red-700">
          You do not have permission to view infrastructure configuration.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex gap-6">
        {/* Main Content - 80% when panel open, 100% when closed */}
        <div className={`transition-all duration-300 ${isPanelOpen ? 'w-[80%]' : 'w-full'}`}>
          {activeView === 'structure' ? (
            <StructureBuilder
              facilityName={displayFacilityName}
              branchId={branchIdNum}
              canView={canView}
              canAdd={canAdd}
              canEdit={canEdit}
              canDelete={canDelete}
              prefetchedBranchRoomTypes={branchRoomTypeRows}
              facilityType={facilityType as "Hospital" | "Clinic"}
              configurationSummary={facilityConfigurationSummary ?? undefined}
              onBack={() => setActiveView(null)}
              onEditRoom={handleEditRoomFromStructure}
              onOpenBedManagement={handleOpenBedManagementFromStructure}
            />
          ) : activeView === 'roomConfigFromStructure' && roomToEditFromStructure ? (
            <RoomConfiguration
              facilityName={displayFacilityName}
              branchId={branchIdNum}
              room={roomToEditFromStructure}
              roomTypeOptions={roomTypeOptionsForConfig}
              branchRoomTypeRows={branchRoomTypeRows}
              configurationSummary={facilityConfigurationSummary ?? undefined}
              onBack={() => { setActiveView('structure'); setRoomToEditFromStructure(null); }}
              onSave={() => { setActiveView('structure'); setRoomToEditFromStructure(null); }}
            />
          ) : activeView === 'bedManagementFromStructure' && roomForBedsFromStructure ? (
            <BedManagement
              facilityName={displayFacilityName}
              branchId={branchIdNum}
              canView={canView}
              canAdd={canAdd}
              canEdit={canEdit}
              canDelete={canDelete}
              room={roomForBedsFromStructure}
              configurationSummary={facilityConfigurationSummary ?? undefined}
              onBack={() => {
                setActiveView('structure');
                setRoomForBedsFromStructure(null);
              }}
            />
          ) : activeView === 'inventory' ? (
            <RoomInventory
              facilityName={displayFacilityName}
              branchId={branchIdNum}
              canView={canView}
              canAdd={canAdd}
              canEdit={canEdit}
              canDelete={canDelete}
              configurationSummary={facilityConfigurationSummary ?? undefined}
              onBack={() => setActiveView(null)}
            />
          ) : activeView === "branchConsultancy" ? (
            <ConsultancyBranchService
              facilityName={displayFacilityName}
              branchId={branchIdNum}
              canView={canView}
              canAdd={canAdd}
              canEdit={canEdit}
              canDelete={canDelete}
              configurationSummary={facilityConfigurationSummary ?? undefined}
              onBack={() => setActiveView(null)}
            />
          ) : activeView === 'roomType' ? (
            <RoomTypeMaster
              facilityName={displayFacilityName}
              branchId={branchIdNum}
              canView={canView}
              canAdd={canAdd}
              canEdit={canEdit}
              canDelete={canDelete}
              configurationSummary={facilityConfigurationSummary ?? undefined}
              onBack={() => setActiveView(null)}
            />
          ) : activeView === 'hardware' ? (
            <HardwareMaster
              facilityName={displayFacilityName}
              branchId={branchIdNum}
              canView={canView}
              canAdd={canAdd}
              canEdit={canEdit}
              canDelete={canDelete}
              configurationSummary={facilityConfigurationSummary ?? undefined}
              onBack={() => setActiveView(null)}
            />
          ) : activeView === 'facilities' ? (
            <FacilitiesMaster
              facilityName={displayFacilityName}
              branchId={branchIdNum}
              canView={canView}
              canAdd={canAdd}
              canEdit={canEdit}
              canDelete={canDelete}
              configurationSummary={facilityConfigurationSummary ?? undefined}
              onBack={() => setActiveView(null)}
            />
          ) : activeView === 'hierarchyTree' ? (
            <CompleteHierarchyTree
              branchId={branchIdNum}
              facilityName={displayFacilityName}
              facilityType={facilityType as "Hospital" | "Clinic"}
              configurationSummary={facilityConfigurationSummary ?? undefined}
              onBack={() => setActiveView(null)}
            />
          ) : (
            <>
              <div className="space-y-6 border-b border-gray-200 pb-4">
                {/* Breadcrumb Navigation */}
                <Breadcrumb items={breadcrumbItems} />

                {/* Hospital Details */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <p className="text-xl font-semibold text-gray-900">{displayFacilityName}</p>
                      <p className="rounded-full bg-green-600 px-3 py-1 text-xs font-medium text-white">
                        {facilityType}
                      </p>
                    </div>
                    <p className="text-sm text-gray-500">{facilityAddress}</p>
                  </div>
                  
                  {/* Open Panel Button - Show when panel is closed */}
                  {!isPanelOpen && (
                    <button
                      onClick={() => setIsPanelOpen(true)}
                      className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-full bg-green-600 shadow-lg transition-all hover:bg-green-700"
                      aria-label="Open panel"
                    >
                      <svg
                        className="h-6 w-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Configuration Progress Card */}
                <ConfigurationProgress completionPercentage={completionForUi} />
              </div>

              {/* Action Cards */}
              <div className=" grid grid-cols-1 gap-6 md:grid-cols-3">
                {actionCards.map((card: typeof actionCards[0]) => (
                  <ActionCard
                    key={card.id}
                    title={card.title}
                    description={card.description}
                    icon={card.icon}
                    buttonLabel={card.buttonLabel}
                    iconBgColor={card.iconBgColor}
                    onButtonClick={card.onClick}
                  />
                ))}
              </div>

              {/* Master Data Configuration */}
              <div className="mt-4">
                <h2 className="mb-4 text-xl font-semibold text-gray-900">Master Data Configuration</h2>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {masterDataCards.map((card: typeof masterDataCards[0]) => (
                    <MasterDataCard
                      key={card.id}
                      title={card.title}
                      subtitle={card.subtitle}
                      icon={card.icon}
                      iconBgColor={card.iconBgColor}
                      onButtonClick={card.onClick}
                      buttonLabel={
                        card.id === 1
                          ? "Configure"
                          : card.id === 2 || card.id === 3
                            ? "View list"
                            : undefined
                      }
                    />
                  ))}
                </div>
              </div>

              {/* Configuration Progress */}
              <div className="mt-4">
                <h2 className="mb-4 text-xl font-semibold text-gray-900">Configuration Progress</h2>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {configurationProgressCards.map((card) => (
                    <ConfigurationProgressCard
                      key={card.id}
                      title={card.title}
                      description={card.description}
                      value={card.value}
                      status={card.status}
                      icon={card.icon}
                      iconBgColor={card.iconBgColor}
                    />
                  ))}
                </div>
              </div>

              {/* Complete Hierarchy Tree Card */}
              <div className="mt-4">
                <div className="rounded-[12px] border border-gray-200 bg-white p-4 ">
                  <div className="flex items-center justify-between gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0 h-14 w-14 flex items-center justify-center rounded-lg bg-green-100">
                      <svg
                        className="h-7 w-7 text-green-700"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        {/* Top node */}
                        <rect x="9" y="2" width="6" height="6" rx="1" fill="currentColor" />
                        {/* Bottom left node */}
                        <rect x="2" y="14" width="6" height="6" rx="1" fill="currentColor" />
                        {/* Bottom right node */}
                        <rect x="16" y="14" width="6" height="6" rx="1" fill="currentColor" />
                        {/* Connecting lines */}
                        <line x1="12" y1="8" x2="5" y2="14" stroke="currentColor" strokeWidth="2" />
                        <line x1="12" y1="8" x2="19" y2="14" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    </div>

                    {/* Text Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900">Complete Hierarchy Tree</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        View the complete structure including all buildings, floors, rooms, and beds in an expandable tree view
                      </p>
                    </div>

                    {/* Button */}
                    <div className="flex-shrink-0">
                      <button
                        onClick={() => {
                          if (!canView) return;
                          setActiveView('hierarchyTree');
                          setIsPanelOpen(false);
                        }}
                        className="rounded-[12px] bg-green-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700 whitespace-nowrap"
                      >
                        View Tree
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* What's Next Section */}
              {/* <div className="mt-4">
                <div className="rounded-[12px] border border-gray-200 bg-white p-4 ">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">What's Next?</h2>

                  <div className="flex items-start gap-4">
               
                    <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-green-600">
                      <span className="text-white font-semibold text-base">4</span>
                    </div>

                    
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-gray-900 mb-1">Configure Rooms</h3>
                      <p className="text-sm text-gray-600">
                        Add hardware, facilities, and detailed specifications for each room
                      </p>
                    </div>
                  </div>
                </div>
              </div> */}
            </>
          )}
        </div>

        {/* Right Side Panel - 20% - Always visible when panel is open */}
        <ConfigurationSummaryPanel
          facilityName={displayFacilityName}
          facilityType={facilityType as "Hospital" | "Clinic"}
          completionPercentage={completionForUi}
          isOpen={isPanelOpen}
          onClose={() => setIsPanelOpen(false)}
          buildings={panelBuildings}
          floors={panelFloors}
          totalRooms={panelTotalRooms}
          configuredRooms={panelConfiguredRooms}
          incompleteRooms={panelIncompleteRooms}
          lastModified={lastModifiedStr}
        />

      </div>
    </AppShell>
  )
}
export default page

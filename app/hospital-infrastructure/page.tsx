"use client";

import { FormEvent, useMemo, useState } from "react";
import type { DragEvent } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

type RoomType =
  | "consultation"
  | "therapy"
  | "operation-theatre"
  | "general"
  | "private"
  | "ward"
  | "cottage"
  | "washroom";

type DepartmentType = "Clinical" | "Administrative" | "Support";

type RoomDetailType = "default" | "private-room" | "washroom" | "cottage-ward";

type RoomDetail = {
  id: string;
  name: string;
  detailType: RoomDetailType;
  attributes: Record<string, string>;
};

type Room = {
  id: string;
  name: string;
  roomType: RoomType;
  details: RoomDetail[];
};

type Department = {
  id: string;
  name: string;
  type: DepartmentType;
  rooms: Room[];
};

type Floor = {
  id: string;
  name: string;
  departments: Department[];
};

type Block = {
  id: string;
  name: string;
  floors: Floor[];
};

type Building = {
  id: string;
  name: string;
  floors?: string;
  blocks: Block[];
};

type Hospital = {
  id: string;
  name: string;
  location: string;
  buildings: Building[];
};

type SelectionState = {
  hospitalId: string | null;
  buildingId: string | null;
  blockId: string | null;
  floorId: string | null;
  departmentId: string | null;
  roomId: string | null;
  detailId: string | null;
};

type LevelKey = "hospital" | "building" | "block" | "floor" | "department" | "room" | "detail";

type DialogMode = "add" | "edit";

type DialogState = {
  open: boolean;
  level: LevelKey | null;
  mode: DialogMode;
  parentIds: Partial<SelectionState>;
  targetId?: string | null;
};

type RoomTypeOption = {
  value: RoomType;
  label: string;
  detailType: RoomDetailType;
};

type HierarchySectionProps<T extends { id: string }> = {
  title: string;
  description: string;
  items: T[];
  selectedId: string | null;
  disabled?: boolean;
  onSelect: (id: string | null) => void;
  onAdd: () => void;
  onEdit: () => void;
  onRemove: () => void;
  getOptionLabel: (item: T) => string;
  renderSelectedInfo?: (item: T | undefined) => React.ReactNode;
};

const LEVEL_ORDER: LevelKey[] = ["hospital", "building", "block", "floor", "department", "room", "detail"];

const LEVEL_LABELS: Record<LevelKey, string> = {
  hospital: "Hospital",
  building: "Building",
  block: "Block",
  floor: "Floor",
  department: "Department",
  room: "Room",
  detail: "Room Type Detail",
};

const LEVEL_KEY_MAP: Record<LevelKey, keyof SelectionState> = {
  hospital: "hospitalId",
  building: "buildingId",
  block: "blockId",
  floor: "floorId",
  department: "departmentId",
  room: "roomId",
  detail: "detailId",
};

const CORE_LEVEL_KEYS: LevelKey[] = ["hospital", "building", "block", "floor", "department", "room"];

const BUILDER_LEVEL_DESCRIPTIONS: Record<LevelKey, string> = {
  hospital: "Primary institution where infrastructure lives.",
  building: "Segment facilities by physical buildings or towers.",
  block: "Break buildings into blocks or wings for clarity.",
  floor: "Insert floor levels between blocks and departments.",
  department: "Organize services such as clinical or administrative units.",
  room: "Define spaces like wards, theatres, and consultation rooms.",
  detail: "Capture granular room attributes such as washroom styles.",
};

const ROOM_TYPES: RoomTypeOption[] = [
  { value: "consultation", label: "Consultation Room", detailType: "default" },
  { value: "therapy", label: "Therapy Room", detailType: "default" },
  { value: "operation-theatre", label: "Operation Theatre", detailType: "default" },
  { value: "general", label: "General Room", detailType: "default" },
  { value: "private", label: "Private Room", detailType: "private-room" },
  { value: "ward", label: "Ward", detailType: "cottage-ward" },
  { value: "cottage", label: "Cottage", detailType: "cottage-ward" },
  { value: "washroom", label: "Washroom", detailType: "washroom" },
];

const ROOM_TYPE_DESCRIPTIONS: Record<RoomType, string> = {
  consultation: "Spaces dedicated for patient consultations.",
  therapy: "Therapy areas such as physiotherapy or Ayurveda treatments.",
  "operation-theatre": "High-sterility operating environments.",
  general: "General purpose rooms for admissions or observation.",
  private: "Premium private rooms with configurable amenities.",
  ward: "Shared wards housing multiple beds.",
  cottage: "Cottage or suite style accommodations.",
  washroom: "Washrooms and sanitation facilities.",
};

const isLevelKey = (value: string): value is LevelKey =>
  LEVEL_ORDER.includes(value as LevelKey);

const isRoomType = (value: string): value is RoomType =>
  ROOM_TYPES.some((type) => type.value === value);

type CustomFieldType = "text" | "select" | "radio";

type CustomField = {
  id: string;
  type: CustomFieldType;
  label: string;
  helperText?: string;
  placeholder?: string;
  options?: string[];
};

type CustomHierarchyElement = {
  id: string;
  label: string;
  description: string;
  fields: CustomField[];
  data?: Array<Record<string, string>>;
};

type CustomElementDialogState = {
  open: boolean;
  editId: string | null;
};

type CustomElementDataDialogState = {
  open: boolean;
  elementId: string | null;
  mode: DialogMode;
  targetIndex: number | null;
};

type CustomFieldDraft = {
  id: string;
  type: CustomFieldType;
  label: string;
  helperText?: string;
  placeholder?: string;
  optionsText?: string;
};

type CustomElementDraft = {
  label: string;
  description: string;
  fields: CustomFieldDraft[];
};

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: "Text Input",
  select: "Select Dropdown",
  radio: "Radio Group",
};

const FIELD_PALETTE: CustomFieldType[] = ["text", "select", "radio"];

const INITIAL_CUSTOM_ELEMENT_DRAFT: CustomElementDraft = {
  label: "",
  description: "",
  fields: [],
};

const parseOptionsText = (value?: string) =>
  value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

const isCustomFieldType = (value: string): value is CustomFieldType =>
  FIELD_PALETTE.includes(value as CustomFieldType);

const DEPARTMENT_TYPES: DepartmentType[] = ["Clinical", "Administrative", "Support"];

const INITIAL_DATA: Hospital[] = [
  {
    id: "hospital-1",
    name: "Apollo Clinic",
    location: "New Delhi, India",
    buildings: [
      {
        id: "building-1",
        name: "Building A",
        floors: "12",
        blocks: [
          {
            id: "block-1",
            name: "Block 1",
            floors: [
              {
                id: "floor-1",
                name: "Floor 1",
            departments: [
              {
                id: "department-1",
                name: "Physiotherapy",
                type: "Clinical",
                rooms: [
                  {
                    id: "room-1",
                    name: "Therapy Suite",
                    roomType: "therapy",
                    details: [
                      {
                        id: "detail-1",
                        name: "Male · English Toilet · AC · Deluxe",
                        detailType: "default",
                        attributes: {
                          gender: "Male",
                          toiletType: "English",
                          airConditioning: "AC",
                          luxuryLevel: "Deluxe",
                        },
                      },
                    ],
                  },
                  {
                    id: "room-2",
                    name: "Recovery Ward",
                    roomType: "ward",
                    details: [
                      {
                        id: "detail-2",
                        name: "12 Bed Ward",
                        detailType: "cottage-ward",
                        attributes: {
                          bedCapacity: "12",
                          amenities: "Central monitoring, family lounge access",
                        },
                      },
                    ],
                  },
                  {
                    id: "room-3",
                    name: "Therapy Support Washroom",
                    roomType: "washroom",
                    details: [
                      {
                        id: "detail-3",
                        name: "Male Washroom (Western)",
                        detailType: "washroom",
                        attributes: {
                          gender: "Male",
                          style: "Western",
                        },
                      },
                    ],
                  },
                ],
              },
              {
                id: "department-2",
                name: "Cardiology",
                type: "Clinical",
                rooms: [
                  {
                    id: "room-4",
                    name: "Cath Lab",
                    roomType: "operation-theatre",
                    details: [
                      {
                        id: "detail-4",
                        name: "Unisex · English Toilet · AC · Super Deluxe",
                        detailType: "default",
                        attributes: {
                          gender: "Unisex",
                          toiletType: "English",
                          airConditioning: "AC",
                          luxuryLevel: "Super Deluxe",
                        },
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "building-2",
        name: "Building B",
        floors: "6",
        blocks: [
          {
            id: "block-2",
            name: "Block 2",
            floors: [
              {
                id: "floor-2",
                name: "Ground Floor",
                departments: [
                  {
                    id: "department-3",
                    name: "Administration",
                    type: "Administrative",
                    rooms: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

const generateId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `id-${Math.random().toString(36).slice(2, 10)}`;
};

const determineDetailType = (roomType: RoomType): RoomDetailType => {
  switch (roomType) {
    case "private":
      return "private-room";
    case "washroom":
      return "washroom";
    case "ward":
    case "cottage":
      return "cottage-ward";
    default:
      return "default";
  }
};

const formatDetailName = (
  detailType: RoomDetailType,
  values: Record<string, string>,
  baseRoomTypeLabel: string
) => {
  switch (detailType) {
    case "private-room": {
      const sharing = values.sharingType ?? "Single";
      const luxury = values.luxuryLevel ?? "Deluxe";
      return `${sharing} ${luxury}`;
    }
    case "washroom": {
      const gender = values.gender ?? "Unisex";
      const style = values.style ?? "Western";
      return `${gender} Washroom (${style})`;
    }
    case "cottage-ward": {
      const capacity = values.bedCapacity ?? "0";
      return `${baseRoomTypeLabel} · ${capacity} Beds`;
    }
    default:
      if (values.gender || values.toiletType || values.airConditioning || values.luxuryLevel) {
        const segments = [
          values.gender,
          values.toiletType ? `${values.toiletType} Toilet` : null,
          values.airConditioning,
          values.luxuryLevel,
        ].filter(Boolean);
        return segments.length > 0 ? segments.join(" · ") : baseRoomTypeLabel;
      }
      if (values.note) {
        return values.note;
      }
      return baseRoomTypeLabel;
  }
};

const HierarchySection = <T extends { id: string }>({
  title,
  description,
  items,
  selectedId,
  disabled = false,
  onSelect,
  onAdd,
  onEdit,
  onRemove,
  getOptionLabel,
  renderSelectedInfo,
}: HierarchySectionProps<T>) => {
  const selectedItem = items.find((item) => item.id === selectedId);

  return (
    <section className="rounded-3xl border border-[#E1E8E1] bg-white p-6 shadow-[0px_24px_60px_rgba(47,72,61,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#1D2635]">{title}</h2>
          <p className="mt-1 text-sm text-[#586270]">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="small" variant="outline" onClick={onAdd} disabled={disabled}>
            ➕ Add
          </Button>
          <Button size="small" variant="outline" onClick={onEdit} disabled={!selectedId}>
            ✏️ Edit
          </Button>
          <Button
            size="small"
            variant="ghost"
            className="text-[#D14D4F]!"
            onClick={onRemove}
            disabled={!selectedId}
          >
            ❌ Remove
          </Button>
        </div>
      </div>

      <div className="mt-5">
        <label className="text-xs font-semibold uppercase tracking-wide text-[#7A8577]">
          Select {title}
        </label>
        <select
          className="mt-2 w-full rounded-full border border-[#D4DDD4] bg-white px-4 py-3 text-sm font-medium text-[#1D2635] transition focus:border-[#0B8C00] focus:outline-none focus:ring-4 focus:ring-[#0B8C00]/10 disabled:border-[#E6EAE6] disabled:bg-[#F5F7F5]"
          value={selectedId ?? ""}
          onChange={(event) => onSelect(event.target.value || null)}
          disabled={disabled || items.length === 0}
        >
          <option value="">Select {title}</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {getOptionLabel(item)}
            </option>
          ))}
        </select>
      </div>

      {renderSelectedInfo ? renderSelectedInfo(selectedItem) : null}
    </section>
  );
};

type CustomElementSectionProps = {
  element: CustomHierarchyElement;
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
  onAddEntry: () => void;
  onEditEntry: () => void;
  onRemoveEntry: () => void;
  onConfigureStructure: () => void;
  onRemoveElement: () => void;
};

const CustomElementSection = ({
  element,
  selectedIndex,
  onSelect,
  onAddEntry,
  onEditEntry,
  onRemoveEntry,
  onConfigureStructure,
  onRemoveElement,
}: CustomElementSectionProps) => {
  const entries = element.data ?? [];
  const selectedEntry = selectedIndex !== null ? entries[selectedIndex] ?? null : null;

  const getEntryLabel = (index: number) => {
    const entry = entries[index];
    if (!entry) {
      return `Entry ${index + 1}`;
    }

    for (const field of element.fields) {
      const value = entry[field.id];
      if (value) {
        return value;
      }
    }

    return `Entry ${index + 1}`;
  };

  return (
    <section className="rounded-3xl border border-[#E1E8E1] bg-white p-6 shadow-[0px_24px_60px_rgba(47,72,61,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#1D2635]">{element.label}</h2>
          {element.description ? (
            <p className="mt-1 text-sm text-[#586270]">{element.description}</p>
          ) : (
            <p className="mt-1 text-sm text-[#586270]">Custom collection of fields.</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="small" variant="outline" onClick={onAddEntry}>
            ➕ Add
          </Button>
          <Button
            size="small"
            variant="outline"
            onClick={onEditEntry}
            disabled={selectedEntry === null}
          >
            ✏️ Edit
          </Button>
          <Button
            size="small"
            variant="ghost"
            className="text-[#D14D4F]!"
            onClick={onRemoveEntry}
            disabled={selectedEntry === null}
          >
            ❌ Remove
          </Button>
        </div>
      </div>

      <div className="mt-5">
        <label className="text-xs font-semibold uppercase tracking-wide text-[#7A8577]">
          Select {element.label}
        </label>
        <select
          className="mt-2 w-full rounded-full border border-[#D4DDD4] bg-white px-4 py-3 text-sm font-medium text-[#1D2635] transition focus:border-[#0B8C00] focus:outline-none focus:ring-4 focus:ring-[#0B8C00]/10 disabled:border-[#E6EAE6] disabled:bg-[#F5F7F5]"
          value={selectedIndex !== null ? String(selectedIndex) : ""}
          onChange={(event) => {
            const { value } = event.target;
            onSelect(value === "" ? null : Number(value));
          }}
          disabled={entries.length === 0}
        >
          <option value="">Select {element.label}</option>
          {entries.map((_, index) => (
            <option key={`${element.id}-entry-${index}`} value={index}>
              {getEntryLabel(index)}
            </option>
          ))}
        </select>
        {entries.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-[#F8FBF8] px-4 py-4 text-xs text-[#7A8577]">
            No entries yet. Click Add to capture information using this custom element.
          </p>
        ) : null}
      </div>

      {selectedEntry ? (
        <div className="mt-5 grid gap-4 rounded-2xl bg-[#F8FBF8] px-5 py-5 text-sm text-[#1D2635] md:grid-cols-2">
          {element.fields.map((field) => (
            <div key={field.id}>
              <p className="font-semibold text-[#0B8C00]">{field.label}</p>
              <p className="mt-1 text-sm text-[#1D2635]">
                {selectedEntry[field.id] && selectedEntry[field.id]?.trim()
                  ? selectedEntry[field.id]
                  : "Not specified"}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="small" onClick={onConfigureStructure}>
          Configure Fields
        </Button>
        <Button variant="ghost" size="small" className="text-[#D14D4F]!" onClick={onRemoveElement}>
          Remove Element
        </Button>
      </div>
    </section>
  );
};

export default function HospitalInfrastructurePage() {
  const [data, setData] = useState<Hospital[]>(INITIAL_DATA);
  const [selection, setSelection] = useState<SelectionState>({
    hospitalId: null,
    buildingId: null,
    blockId: null,
    floorId: null,
    departmentId: null,
    roomId: null,
    detailId: null,
  });
  const [viewMode, setViewMode] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState>({
    open: false,
    level: null,
    mode: "add",
    parentIds: {},
    targetId: null,
  });
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [experienceStep, setExperienceStep] = useState<"welcome" | "builder" | "configure">(
    "welcome"
  );
  const [builderLevels, setBuilderLevels] = useState<LevelKey[]>([]);
  const [builderRoomTypes, setBuilderRoomTypes] = useState<RoomType[]>([]);
  const [builderCustomElementIds, setBuilderCustomElementIds] = useState<string[]>([]);
  const [customElements, setCustomElements] = useState<CustomHierarchyElement[]>([]);
  const [customElementDialog, setCustomElementDialog] = useState<CustomElementDialogState>({
    open: false,
    editId: null,
  });
  const [customElementDraft, setCustomElementDraft] =
    useState<CustomElementDraft>(INITIAL_CUSTOM_ELEMENT_DRAFT);
  const [customElementSelections, setCustomElementSelections] = useState<
    Record<string, number | null>
  >({});
  const [customDataDialog, setCustomDataDialog] = useState<CustomElementDataDialogState>({
    open: false,
    elementId: null,
    mode: "add",
    targetIndex: null,
  });
  const [customDataFormValues, setCustomDataFormValues] = useState<Record<string, string>>({});
  const builderHasCoreLevels = useMemo(
    () => CORE_LEVEL_KEYS.every((level) => builderLevels.includes(level)),
    [builderLevels]
  );
  const selectedCustomElements = useMemo(
    () =>
      builderCustomElementIds
        .map((id) => customElements.find((element) => element.id === id))
        .filter(Boolean) as CustomHierarchyElement[],
    [builderCustomElementIds, customElements]
  );
  const activeCustomDataElement = useMemo(() => {
    if (!customDataDialog.elementId) {
      return null;
    }
    return (
      customElements.find((element) => element.id === customDataDialog.elementId) ?? null
    );
  }, [customDataDialog.elementId, customElements]);

  const handleDragStartLevel = (event: DragEvent<HTMLButtonElement>, level: LevelKey) => {
    event.dataTransfer.setData("text/hierarchy-level", level);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDragStartRoomType = (event: DragEvent<HTMLButtonElement>, type: RoomType) => {
    event.dataTransfer.setData("text/room-type", type);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleBuilderDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    const levelData = event.dataTransfer.getData("text/hierarchy-level");
    if (levelData && isLevelKey(levelData) && !builderLevels.includes(levelData)) {
      setBuilderLevels((prev) => [...prev, levelData]);
      return;
    }

    const roomTypeData = event.dataTransfer.getData("text/room-type");
    if (roomTypeData && isRoomType(roomTypeData) && !builderRoomTypes.includes(roomTypeData)) {
      setBuilderRoomTypes((prev) => [...prev, roomTypeData]);
      return;
    }

    const customElementId = event.dataTransfer.getData("text/custom-element-id");
    if (customElementId) {
      const exists = builderCustomElementIds.includes(customElementId);
      const elementExists = customElements.some((element) => element.id === customElementId);
      if (!exists && elementExists) {
        setBuilderCustomElementIds((prev) => [...prev, customElementId]);
        setCustomElementSelections((prev) => ({
          ...prev,
          [customElementId]: prev[customElementId] ?? null,
        }));
      }
    }
  };

  const removeBuilderLevel = (level: LevelKey) => {
    setBuilderLevels((prev) => prev.filter((item) => item !== level));
  };

  const removeBuilderRoomType = (type: RoomType) => {
    setBuilderRoomTypes((prev) => prev.filter((item) => item !== type));
  };

  const handleDragStartCustomElement = (event: DragEvent<HTMLElement>, customElementId: string) => {
    event.dataTransfer.setData("text/custom-element-id", customElementId);
    event.dataTransfer.effectAllowed = "move";
  };

  const removeBuilderCustomElement = (customElementId: string) => {
    setBuilderCustomElementIds((prev) => prev.filter((item) => item !== customElementId));
    setCustomElementSelections((prev) => {
      if (!(customElementId in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[customElementId];
      return next;
    });
  };

  const resetBuilderCanvas = () => {
    setBuilderLevels([]);
    setBuilderRoomTypes([]);
    setBuilderCustomElementIds([]);
    setCustomElementSelections({});
  };

  const createFieldDraft = (type: CustomFieldType): CustomFieldDraft => ({
    id: generateId(),
    type,
    label: FIELD_TYPE_LABELS[type],
    helperText: "",
    placeholder: type === "text" ? "" : undefined,
    optionsText: type === "text" ? undefined : "Option 1, Option 2",
  });

  const resetCustomElementDraft = () => {
    setCustomElementDraft(INITIAL_CUSTOM_ELEMENT_DRAFT);
  };

  const openCustomElementDialog = (customElementId?: string) => {
    if (customElementId) {
      const element = customElements.find((item) => item.id === customElementId);
      if (element) {
        setCustomElementDraft({
          label: element.label,
          description: element.description,
          fields: element.fields.map((field) => ({
            id: field.id,
            type: field.type,
            label: field.label,
            helperText: field.helperText ?? "",
            placeholder: field.placeholder ?? "",
            optionsText: field.type === "text" ? undefined : (field.options ?? []).join(", "),
          })),
        });
      }
      setCustomElementDialog({ open: true, editId: customElementId });
      return;
    }

    resetCustomElementDraft();
    setCustomElementDialog({ open: true, editId: null });
  };

  const closeCustomElementDialog = () => {
    setCustomElementDialog({ open: false, editId: null });
    resetCustomElementDraft();
  };

  const addFieldToDraft = (type: CustomFieldType) => {
    setCustomElementDraft((prev) => ({
      ...prev,
      fields: [...prev.fields, createFieldDraft(type)],
    }));
  };

  const handleFieldPaletteDragStart = (event: DragEvent<HTMLButtonElement>, type: CustomFieldType) => {
    event.dataTransfer.setData("text/custom-field-type", type);
    event.dataTransfer.effectAllowed = "copyMove";
  };

  const handleFieldDropOnDraft = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const fieldType = event.dataTransfer.getData("text/custom-field-type");
    if (fieldType && isCustomFieldType(fieldType)) {
      addFieldToDraft(fieldType);
    }
  };

  const updateDraftField = (fieldId: string, updates: Partial<CustomFieldDraft>) => {
    setCustomElementDraft((prev) => ({
      ...prev,
      fields: prev.fields.map((field) => (field.id === fieldId ? { ...field, ...updates } : field)),
    }));
  };

  const removeDraftField = (fieldId: string) => {
    setCustomElementDraft((prev) => ({
      ...prev,
      fields: prev.fields.filter((field) => field.id !== fieldId),
    }));
  };

  const moveDraftField = (fieldId: string, direction: "up" | "down") => {
    setCustomElementDraft((prev) => {
      const index = prev.fields.findIndex((field) => field.id === fieldId);
      if (index < 0) {
        return prev;
      }

      const nextFields = [...prev.fields];
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= nextFields.length) {
        return prev;
      }

      const [movedField] = nextFields.splice(index, 1);
      nextFields.splice(newIndex, 0, movedField);
      return { ...prev, fields: nextFields };
    });
  };

  const customElementDraftValid = useMemo(() => {
    if (customElementDraft.fields.length === 0) {
      return false;
    }

    return customElementDraft.fields.every((field) => {
      const hasLabel = field.label.trim().length > 0;
      if (!hasLabel) {
        return false;
      }

      if (field.type === "text") {
        return true;
      }

      return parseOptionsText(field.optionsText).length > 0;
    });
  }, [customElementDraft]);

  const saveCustomElement = () => {
    if (!customElementDraftValid) {
      return;
    }

    const elementId = customElementDialog.editId ?? generateId();
    const trimmedLabel = customElementDraft.label.trim();
    const trimmedDescription = customElementDraft.description.trim();

    const fields: CustomField[] = customElementDraft.fields.map((field) => {
      const base: CustomField = {
        id: field.id,
        type: field.type,
        label: field.label.trim() || FIELD_TYPE_LABELS[field.type],
      };

      if (field.helperText && field.helperText.trim()) {
        base.helperText = field.helperText.trim();
      }

      if (field.placeholder && field.placeholder.trim()) {
        base.placeholder = field.placeholder.trim();
      }

      if (field.type !== "text") {
        base.options = parseOptionsText(field.optionsText);
      }

      return base;
    });

    const element: CustomHierarchyElement = {
      id: elementId,
      label: trimmedLabel || "Custom Element",
      description: trimmedDescription,
      fields,
      data: customElements.find((item) => item.id === elementId)?.data ?? [],
    };

    setCustomElements((prev) => {
      const exists = prev.some((item) => item.id === elementId);
      if (exists) {
        return prev.map((item) => (item.id === elementId ? element : item));
      }
      return [...prev, element];
    });

    setCustomElementDialog({ open: false, editId: null });
    resetCustomElementDraft();
  };

  const removeCustomElementDefinition = (customElementId: string) => {
    setCustomElements((prev) => prev.filter((element) => element.id !== customElementId));
    setBuilderCustomElementIds((prev) => prev.filter((elementId) => elementId !== customElementId));
    setCustomElementSelections((prev) => {
      if (!(customElementId in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[customElementId];
      return next;
    });
  };

  const openCustomElementDataDialog = (
    elementId: string,
    mode: DialogMode,
    targetIndex: number | null = null
  ) => {
    const element = customElements.find((item) => item.id === elementId);
    if (!element) {
      return;
    }

    const initialValues: Record<string, string> = {};
    element.fields.forEach((field) => {
      const existingValue =
        targetIndex !== null && element.data && element.data[targetIndex]
          ? element.data[targetIndex][field.id] ?? ""
          : "";
      initialValues[field.id] = existingValue;
    });

    setCustomDataFormValues(initialValues);
    setCustomDataDialog({
      open: true,
      elementId,
      mode,
      targetIndex,
    });
  };

  const closeCustomElementDataDialog = () => {
    setCustomDataDialog({
      open: false,
      elementId: null,
      mode: "add",
      targetIndex: null,
    });
    setCustomDataFormValues({});
  };

  const removeCustomElementEntry = (elementId: string, index: number) => {
    setCustomElements((prev) =>
      prev.map((item) => {
        if (item.id !== elementId) {
          return item;
        }
        const currentData = item.data ? [...item.data] : [];
        if (index < 0 || index >= currentData.length) {
          return item;
        }
        currentData.splice(index, 1);
        return {
          ...item,
          data: currentData,
        };
      })
    );

    setCustomElementSelections((prev) => {
      const current = prev[elementId];
      if (current === undefined) {
        return prev;
      }

      let nextIndex: number | null = current;
      if (current === null) {
        nextIndex = null;
      } else if (current === index) {
        nextIndex = null;
      } else if (current > index) {
        nextIndex = current - 1;
      }

      return {
        ...prev,
        [elementId]: nextIndex,
      };
    });
  };

  const updateCustomDataFormValue = (fieldId: string, value: string) => {
    setCustomDataFormValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleCustomElementDataSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const { elementId, mode, targetIndex } = customDataDialog;
    if (!elementId) {
      return;
    }

    const element = customElements.find((item) => item.id === elementId);
    if (!element) {
      return;
    }

    const entryValues: Record<string, string> = {};
    for (const field of element.fields) {
      const rawValue = customDataFormValues[field.id] ?? "";
      const value = field.type === "text" ? rawValue.trim() : rawValue;
      if (!value) {
        window.alert(`Please provide a value for "${field.label}".`);
        return;
      }
      entryValues[field.id] = value;
    }

    let nextSelectedIndex: number | null = null;

    setCustomElements((prev) =>
      prev.map((item) => {
        if (item.id !== elementId) {
          return item;
        }
        const currentData = item.data ? [...item.data] : [];
        if (mode === "edit" && targetIndex !== null && currentData[targetIndex]) {
          currentData[targetIndex] = entryValues;
          nextSelectedIndex = targetIndex;
        } else {
          currentData.push(entryValues);
          nextSelectedIndex = currentData.length - 1;
        }
        return {
          ...item,
          data: currentData,
        };
      })
    );

    setCustomElementSelections((prev) => ({
      ...prev,
      [elementId]: nextSelectedIndex,
    }));

    closeCustomElementDataDialog();
  };

  const setSelectionAtLevel = (level: LevelKey, value: string | null) => {
    setViewMode(false);
    setSelection((prev) => {
      const next: SelectionState = { ...prev };
      const updateKey = LEVEL_KEY_MAP[level];
      next[updateKey] = value;

      const levelIndex = LEVEL_ORDER.indexOf(level);
      for (let index = levelIndex + 1; index < LEVEL_ORDER.length; index += 1) {
        const key = LEVEL_KEY_MAP[LEVEL_ORDER[index]];
        next[key] = null;
      }

      return next;
    });
  };

  const resetSelectionsFromLevel = (level: LevelKey) => {
    setViewMode(false);
    setSelection((prev) => {
      const next: SelectionState = { ...prev };
      const startIndex = LEVEL_ORDER.indexOf(level);
      for (let index = startIndex; index < LEVEL_ORDER.length; index += 1) {
        const key = LEVEL_KEY_MAP[LEVEL_ORDER[index]];
        next[key] = null;
      }
      return next;
    });
  };

  const closeDialog = () => {
    setDialogState({
      open: false,
      level: null,
      mode: "add",
      parentIds: {},
      targetId: null,
    });
    setFormValues({});
  };

  const selectedHospital = useMemo(
    () => data.find((hospital) => hospital.id === selection.hospitalId),
    [data, selection.hospitalId]
  );

  const selectedBuilding = useMemo(
    () => selectedHospital?.buildings.find((building) => building.id === selection.buildingId),
    [selectedHospital, selection.buildingId]
  );

  const selectedBlock = useMemo(
    () => selectedBuilding?.blocks.find((block) => block.id === selection.blockId),
    [selectedBuilding, selection.blockId]
  );

  const selectedFloor = useMemo(
    () => selectedBlock?.floors.find((floor) => floor.id === selection.floorId),
    [selectedBlock, selection.floorId]
  );

  const selectedDepartment = useMemo(
    () => selectedFloor?.departments.find((department) => department.id === selection.departmentId),
    [selectedFloor, selection.departmentId]
  );

  const selectedRoom = useMemo(
    () => selectedDepartment?.rooms.find((room) => room.id === selection.roomId),
    [selectedDepartment, selection.roomId]
  );

  const selectedDetail = useMemo(
    () => selectedRoom?.details.find((detail) => detail.id === selection.detailId),
    [selectedRoom, selection.detailId]
  );

  const currentRoomTypeConfig = useMemo(() => {
    if (!selectedRoom) {
      return null;
    }
    return ROOM_TYPES.find((type) => type.value === selectedRoom.roomType) ?? null;
  }, [selectedRoom]);

  const canViewStructure = Boolean(selectedHospital);

  const openHospitalDialog = (mode: DialogMode) => {
    const initial: Record<string, string> =
      mode === "edit" && selectedHospital
        ? {
            name: selectedHospital.name,
            location: selectedHospital.location,
          }
        : {
            name: "",
            location: "",
          };

    setFormValues(initial);
    setDialogState({
      open: true,
      level: "hospital",
      mode,
      parentIds: {},
      targetId: mode === "edit" ? selectedHospital?.id ?? null : null,
    });
  };

  const openBuildingDialog = (mode: DialogMode) => {
    if (!selection.hospitalId || !selectedHospital) {
      return;
    }

    const initial: Record<string, string> =
      mode === "edit" && selectedBuilding
        ? {
            name: selectedBuilding.name,
            floors: selectedBuilding.floors ?? "",
          }
        : {
            name: "",
            floors: "",
          };

    setFormValues(initial);
    setDialogState({
      open: true,
      level: "building",
      mode,
      parentIds: { hospitalId: selectedHospital.id },
      targetId: mode === "edit" ? selectedBuilding?.id ?? null : null,
    });
  };

  const openBlockDialog = (mode: DialogMode) => {
    if (!selectedHospital || !selectedBuilding) {
      return;
    }

    const initial: Record<string, string> =
      mode === "edit" && selectedBlock
        ? {
            name: selectedBlock.name,
          }
        : {
            name: "",
          };

    setFormValues(initial);
    setDialogState({
      open: true,
      level: "block",
      mode,
      parentIds: {
        hospitalId: selectedHospital.id,
        buildingId: selectedBuilding.id,
      },
      targetId: mode === "edit" ? selectedBlock?.id ?? null : null,
    });
  };

  const openFloorDialog = (mode: DialogMode) => {
    if (!selectedHospital || !selectedBuilding || !selectedBlock) {
      return;
    }

    const initial: Record<string, string> =
      mode === "edit" && selectedFloor
        ? {
            name: selectedFloor.name,
          }
        : {
            name: "",
          };

    setFormValues(initial);
    setDialogState({
      open: true,
      level: "floor",
      mode,
      parentIds: {
        hospitalId: selectedHospital.id,
        buildingId: selectedBuilding.id,
        blockId: selectedBlock.id,
      },
      targetId: mode === "edit" ? selectedFloor?.id ?? null : null,
    });
  };

  const openDepartmentDialog = (mode: DialogMode) => {
    if (!selectedHospital || !selectedBuilding || !selectedBlock || !selectedFloor) {
      return;
    }

    const initial: Record<string, string> =
      mode === "edit" && selectedDepartment
        ? {
            name: selectedDepartment.name,
            type: selectedDepartment.type,
          }
        : {
            name: "",
            type: "Clinical",
          };

    setFormValues(initial);
    setDialogState({
      open: true,
      level: "department",
      mode,
      parentIds: {
        hospitalId: selectedHospital.id,
        buildingId: selectedBuilding.id,
        blockId: selectedBlock.id,
        floorId: selectedFloor.id,
      },
      targetId: mode === "edit" ? selectedDepartment?.id ?? null : null,
    });
  };

  const openRoomDialog = (mode: DialogMode) => {
    if (
      !selectedHospital ||
      !selectedBuilding ||
      !selectedBlock ||
      !selectedFloor ||
      !selectedDepartment
    ) {
      return;
    }

    const initial: Record<string, string> =
      mode === "edit" && selectedRoom
        ? {
            name: selectedRoom.name,
            roomType: selectedRoom.roomType,
          }
        : {
            name: "",
            roomType: ROOM_TYPES[0]?.value ?? "consultation",
          };

    setFormValues(initial);
    setDialogState({
      open: true,
      level: "room",
      mode,
      parentIds: {
        hospitalId: selectedHospital.id,
        buildingId: selectedBuilding.id,
        blockId: selectedBlock.id,
        floorId: selectedFloor.id,
        departmentId: selectedDepartment.id,
      },
      targetId: mode === "edit" ? selectedRoom?.id ?? null : null,
    });
  };

  const openDetailDialog = (mode: DialogMode) => {
    if (
      !selectedHospital ||
      !selectedBuilding ||
      !selectedBlock ||
      !selectedFloor ||
      !selectedDepartment ||
      !selectedRoom
    ) {
      return;
    }

    const detailType =
      mode === "edit" && selectedDetail
        ? selectedDetail.detailType
        : determineDetailType(selectedRoom.roomType);

    let initial: Record<string, string> = {};

    if (mode === "edit" && selectedDetail) {
      initial = { ...selectedDetail.attributes };
      if (detailType === "default") {
        initial = {
          gender: selectedDetail.attributes.gender ?? "Male",
          toiletType: selectedDetail.attributes.toiletType ?? "Indian",
          airConditioning: selectedDetail.attributes.airConditioning ?? "AC",
          luxuryLevel: selectedDetail.attributes.luxuryLevel ?? "Deluxe",
        };
      }
    } else {
      switch (detailType) {
        case "private-room":
          initial = { sharingType: "Single", luxuryLevel: "Deluxe" };
          break;
        case "washroom":
          initial = { gender: "Male", style: "Western" };
          break;
        case "cottage-ward":
          initial = { bedCapacity: "1", amenities: "" };
          break;
        default:
          initial = {
            gender: "Male",
            toiletType: "Indian",
            airConditioning: "AC",
            luxuryLevel: "Deluxe",
          };
          break;
      }
    }

    setFormValues(initial);
    setDialogState({
      open: true,
      level: "detail",
      mode,
      parentIds: {
        hospitalId: selectedHospital.id,
        buildingId: selectedBuilding.id,
        blockId: selectedBlock.id,
        floorId: selectedFloor.id,
        departmentId: selectedDepartment.id,
        roomId: selectedRoom.id,
      },
      targetId: mode === "edit" ? selectedDetail?.id ?? null : null,
    });
  };

  const handleRemoveHospital = () => {
    if (!selectedHospital) {
      return;
    }

    const confirmed = window.confirm(
      `Remove hospital "${selectedHospital.name}" and all associated infrastructure?`
    );
    if (!confirmed) {
      return;
    }

    setData((prev) => prev.filter((hospital) => hospital.id !== selectedHospital.id));
    resetSelectionsFromLevel("hospital");
  };

  const handleRemoveBuilding = () => {
    if (!selectedHospital || !selectedBuilding) {
      return;
    }

    const confirmed = window.confirm(
      `Remove building "${selectedBuilding.name}" and all nested blocks?`
    );
    if (!confirmed) {
      return;
    }

    setData((prev) =>
      prev.map((hospital) =>
        hospital.id === selectedHospital.id
          ? {
              ...hospital,
              buildings: hospital.buildings.filter((building) => building.id !== selectedBuilding.id),
            }
          : hospital
      )
    );
    resetSelectionsFromLevel("building");
  };

  const handleRemoveBlock = () => {
    if (!selectedHospital || !selectedBuilding || !selectedBlock) {
      return;
    }

    const confirmed = window.confirm(
      `Remove block "${selectedBlock.name}" and all nested floors?`
    );
    if (!confirmed) {
      return;
    }

    setData((prev) =>
      prev.map((hospital) =>
        hospital.id === selectedHospital.id
          ? {
              ...hospital,
              buildings: hospital.buildings.map((building) =>
                building.id === selectedBuilding.id
                  ? {
                      ...building,
                      blocks: building.blocks.filter((block) => block.id !== selectedBlock.id),
                    }
                  : building
              ),
            }
          : hospital
      )
    );
    resetSelectionsFromLevel("block");
  };

  const handleRemoveFloor = () => {
    if (!selectedHospital || !selectedBuilding || !selectedBlock || !selectedFloor) {
      return;
    }

    const confirmed = window.confirm(
      `Remove floor "${selectedFloor.name}" and all nested departments?`
    );
    if (!confirmed) {
      return;
    }

    setData((prev) =>
      prev.map((hospital) =>
        hospital.id === selectedHospital.id
          ? {
              ...hospital,
              buildings: hospital.buildings.map((building) =>
                building.id === selectedBuilding.id
                  ? {
                      ...building,
                      blocks: building.blocks.map((block) =>
                        block.id === selectedBlock.id
                          ? {
                              ...block,
                              floors: block.floors.filter((floor) => floor.id !== selectedFloor.id),
                            }
                          : block
                      ),
                    }
                  : building
              ),
            }
          : hospital
      )
    );
    resetSelectionsFromLevel("floor");
  };

  const handleRemoveDepartment = () => {
    if (
      !selectedHospital ||
      !selectedBuilding ||
      !selectedBlock ||
      !selectedFloor ||
      !selectedDepartment
    ) {
      return;
    }

    const confirmed = window.confirm(
      `Remove department "${selectedDepartment.name}" and all nested rooms?`
    );
    if (!confirmed) {
      return;
    }

    setData((prev) =>
      prev.map((hospital) =>
        hospital.id === selectedHospital.id
          ? {
              ...hospital,
              buildings: hospital.buildings.map((building) =>
                building.id === selectedBuilding.id
                  ? {
                      ...building,
                      blocks: building.blocks.map((block) =>
                        block.id === selectedBlock.id
                          ? {
                              ...block,
                                      floors: block.floors.map((floor) =>
                                        floor.id === selectedFloor.id
                                          ? {
                                              ...floor,
                                              departments: floor.departments.filter(
                                (department) => department.id !== selectedDepartment.id
                                              ),
                                            }
                                          : floor
                              ),
                            }
                          : block
                      ),
                    }
                  : building
              ),
            }
          : hospital
      )
    );
    resetSelectionsFromLevel("department");
  };

  const handleRemoveRoom = () => {
    if (
      !selectedHospital ||
      !selectedBuilding ||
      !selectedBlock ||
      !selectedFloor ||
      !selectedDepartment ||
      !selectedRoom
    ) {
      return;
    }

    const confirmed = window.confirm(`Remove room "${selectedRoom.name}" and all room details?`);
    if (!confirmed) {
      return;
    }

    setData((prev) =>
      prev.map((hospital) =>
        hospital.id === selectedHospital.id
          ? {
              ...hospital,
              buildings: hospital.buildings.map((building) =>
                building.id === selectedBuilding.id
                  ? {
                      ...building,
                      blocks: building.blocks.map((block) =>
                        block.id === selectedBlock.id
                          ? {
                              ...block,
                                      floors: block.floors.map((floor) =>
                                        floor.id === selectedFloor.id
                                          ? {
                                              ...floor,
                                              departments: floor.departments.map((department) =>
                                department.id === selectedDepartment.id
                                  ? {
                                      ...department,
                                      rooms: department.rooms.filter(
                                        (room) => room.id !== selectedRoom.id
                                      ),
                                    }
                                  : department
                                              ),
                                            }
                                          : floor
                              ),
                            }
                          : block
                      ),
                    }
                  : building
              ),
            }
          : hospital
      )
    );
    resetSelectionsFromLevel("room");
  };

  const handleRemoveDetail = () => {
    if (
      !selectedHospital ||
      !selectedBuilding ||
      !selectedBlock ||
      !selectedFloor ||
      !selectedDepartment ||
      !selectedRoom ||
      !selectedDetail
    ) {
      return;
    }

    const confirmed = window.confirm(`Remove room detail "${selectedDetail.name}"?`);
    if (!confirmed) {
      return;
    }

    setData((prev) =>
      prev.map((hospital) =>
        hospital.id === selectedHospital.id
          ? {
              ...hospital,
              buildings: hospital.buildings.map((building) =>
                building.id === selectedBuilding.id
                  ? {
                      ...building,
                      blocks: building.blocks.map((block) =>
                        block.id === selectedBlock.id
                          ? {
                              ...block,
                                      floors: block.floors.map((floor) =>
                                        floor.id === selectedFloor.id
                                          ? {
                                              ...floor,
                                              departments: floor.departments.map((department) =>
                                department.id === selectedDepartment.id
                                  ? {
                                      ...department,
                                      rooms: department.rooms.map((room) =>
                                        room.id === selectedRoom.id
                                          ? {
                                              ...room,
                                              details: room.details.filter(
                                                (detail) => detail.id !== selectedDetail.id
                                              ),
                                            }
                                          : room
                                      ),
                                    }
                                  : department
                                              ),
                                            }
                                          : floor
                              ),
                            }
                          : block
                      ),
                    }
                  : building
              ),
            }
          : hospital
      )
    );
    resetSelectionsFromLevel("detail");
  };

  const upsertDepartmentRoom = (
    hospitals: Hospital[],
    parentIds: Required<
      Pick<SelectionState, "hospitalId" | "buildingId" | "blockId" | "floorId" | "departmentId">
    >,
    updater: (rooms: Room[]) => Room[]
  ) => {
    return hospitals.map((hospital) =>
      hospital.id === parentIds.hospitalId
        ? {
            ...hospital,
            buildings: hospital.buildings.map((building) =>
              building.id === parentIds.buildingId
                ? {
                    ...building,
                    blocks: building.blocks.map((block) =>
                      block.id === parentIds.blockId
                        ? {
                            ...block,
                            floors: block.floors.map((floor) =>
                              floor.id === parentIds.floorId
                                ? {
                                    ...floor,
                                    departments: floor.departments.map((department) =>
                              department.id === parentIds.departmentId
                                ? {
                                    ...department,
                                    rooms: updater(department.rooms),
                                  }
                                : department
                                    ),
                                  }
                                : floor
                            ),
                          }
                        : block
                    ),
                  }
                : building
            ),
          }
        : hospital
    );
  };

  const upsertRoomDetail = (
    hospitals: Hospital[],
    parentIds: Required<
      Pick<
        SelectionState,
        "hospitalId" | "buildingId" | "blockId" | "floorId" | "departmentId" | "roomId"
      >
    >,
    updater: (details: RoomDetail[]) => RoomDetail[]
  ) => {
    return hospitals.map((hospital) =>
      hospital.id === parentIds.hospitalId
        ? {
            ...hospital,
            buildings: hospital.buildings.map((building) =>
              building.id === parentIds.buildingId
                ? {
                    ...building,
                    blocks: building.blocks.map((block) =>
                      block.id === parentIds.blockId
                        ? {
                            ...block,
                            floors: block.floors.map((floor) =>
                              floor.id === parentIds.floorId
                                ? {
                                    ...floor,
                                    departments: floor.departments.map((department) =>
                              department.id === parentIds.departmentId
                                ? {
                                    ...department,
                                    rooms: department.rooms.map((room) =>
                                      room.id === parentIds.roomId
                                        ? {
                                            ...room,
                                            details: updater(room.details),
                                          }
                                        : room
                                    ),
                                  }
                                : department
                                    ),
                                  }
                                : floor
                            ),
                          }
                        : block
                    ),
                  }
                : building
            ),
          }
        : hospital
    );
  };

  const handleDialogSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!dialogState.level) {
      return;
    }

    const { level, mode, parentIds, targetId } = dialogState;

    switch (level) {
      case "hospital": {
        const name = (formValues.name ?? "").trim();
        const location = (formValues.location ?? "").trim();

        if (!name) {
          window.alert("Hospital name is required.");
          return;
        }

        if (mode === "add") {
          const newHospital: Hospital = {
            id: generateId(),
            name,
            location,
            buildings: [],
          };
          setData((prev) => [...prev, newHospital]);
          setSelectionAtLevel("hospital", newHospital.id);
        } else if (mode === "edit" && targetId) {
          setData((prev) =>
            prev.map((hospital) =>
              hospital.id === targetId
                ? {
                    ...hospital,
                    name,
                    location,
                  }
                : hospital
            )
          );
        }
        break;
      }
      case "building": {
        const hospitalId = parentIds.hospitalId;
        if (!hospitalId) {
          return;
        }

        const name = (formValues.name ?? "").trim();
        const floorsValue = (formValues.floors ?? "").trim();

        if (!name) {
          window.alert("Building name/number is required.");
          return;
        }

        if (mode === "add") {
          const newBuilding: Building = {
            id: generateId(),
            name,
            floors: floorsValue || undefined,
            blocks: [],
          };

          setData((prev) =>
            prev.map((hospital) =>
              hospital.id === hospitalId
                ? {
                    ...hospital,
                    buildings: [...hospital.buildings, newBuilding],
                  }
                : hospital
            )
          );
          setSelectionAtLevel("building", newBuilding.id);
        } else if (mode === "edit" && targetId) {
          setData((prev) =>
            prev.map((hospital) =>
              hospital.id === hospitalId
                ? {
                    ...hospital,
                    buildings: hospital.buildings.map((building) =>
                      building.id === targetId
                        ? {
                            ...building,
                            name,
                            floors: floorsValue || undefined,
                          }
                        : building
                    ),
                  }
                : hospital
            )
          );
        }
        break;
      }
      case "block": {
        const hospitalId = parentIds.hospitalId;
        const buildingId = parentIds.buildingId;
        if (!hospitalId || !buildingId) {
          return;
        }

        const name = (formValues.name ?? "").trim();
        if (!name) {
          window.alert("Block name/code is required.");
          return;
        }

        if (mode === "add") {
          const newBlock: Block = {
            id: generateId(),
            name,
            floors: [],
          };

          setData((prev) =>
            prev.map((hospital) =>
              hospital.id === hospitalId
                ? {
                    ...hospital,
                    buildings: hospital.buildings.map((building) =>
                      building.id === buildingId
                        ? {
                            ...building,
                            blocks: [...building.blocks, newBlock],
                          }
                        : building
                    ),
                  }
                : hospital
            )
          );
          setSelectionAtLevel("block", newBlock.id);
        } else if (mode === "edit" && targetId) {
          setData((prev) =>
            prev.map((hospital) =>
              hospital.id === hospitalId
                ? {
                    ...hospital,
                    buildings: hospital.buildings.map((building) =>
                      building.id === buildingId
                        ? {
                            ...building,
                            blocks: building.blocks.map((block) =>
                              block.id === targetId
                                ? {
                                    ...block,
                                    name,
                                  }
                                : block
                            ),
                          }
                        : building
                    ),
                  }
                : hospital
            )
          );
        }
        break;
      }
      case "floor": {
        const hospitalId = parentIds.hospitalId;
        const buildingId = parentIds.buildingId;
        const blockId = parentIds.blockId;
        if (!hospitalId || !buildingId || !blockId) {
          return;
        }

        const name = (formValues.name ?? "").trim();
        if (!name) {
          window.alert("Floor name/number is required.");
          return;
        }

        if (mode === "add") {
          const newFloor: Floor = {
            id: generateId(),
            name,
            departments: [],
          };

          setData((prev) =>
            prev.map((hospital) =>
              hospital.id === hospitalId
                ? {
                    ...hospital,
                    buildings: hospital.buildings.map((building) =>
                      building.id === buildingId
                        ? {
                            ...building,
                            blocks: building.blocks.map((block) =>
                              block.id === blockId
                                ? {
                                    ...block,
                                    floors: [...block.floors, newFloor],
                                  }
                                : block
                            ),
                          }
                        : building
                    ),
                  }
                : hospital
            )
          );
          setSelectionAtLevel("floor", newFloor.id);
        } else if (mode === "edit" && targetId) {
          setData((prev) =>
            prev.map((hospital) =>
              hospital.id === hospitalId
                ? {
                    ...hospital,
                    buildings: hospital.buildings.map((building) =>
                      building.id === buildingId
                        ? {
                            ...building,
                            blocks: building.blocks.map((block) =>
                              block.id === blockId
                                ? {
                                    ...block,
                                    floors: block.floors.map((floor) =>
                                      floor.id === targetId
                                        ? {
                                            ...floor,
                                            name,
                                          }
                                        : floor
                                    ),
                                  }
                                : block
                            ),
                          }
                        : building
                    ),
                  }
                : hospital
            )
          );
        }
        break;
      }
      case "department": {
        const hospitalId = parentIds.hospitalId;
        const buildingId = parentIds.buildingId;
        const blockId = parentIds.blockId;
        const floorId = parentIds.floorId;
        if (!hospitalId || !buildingId || !blockId || !floorId) {
          return;
        }

        const name = (formValues.name ?? "").trim();
        const type = (formValues.type as DepartmentType) ?? "Clinical";

        if (!name) {
          window.alert("Department name is required.");
          return;
        }

        if (mode === "add") {
          const newDepartment: Department = {
            id: generateId(),
            name,
            type,
            rooms: [],
          };

          setData((prev) =>
            prev.map((hospital) =>
              hospital.id === hospitalId
                ? {
                    ...hospital,
                    buildings: hospital.buildings.map((building) =>
                      building.id === buildingId
                        ? {
                            ...building,
                            blocks: building.blocks.map((block) =>
                              block.id === blockId
                                ? {
                                    ...block,
                                  floors: block.floors.map((floor) =>
                                    floor.id === floorId
                                      ? {
                                          ...floor,
                                          departments: [...floor.departments, newDepartment],
                                        }
                                      : floor
                                  ),
                                  }
                                : block
                            ),
                          }
                        : building
                    ),
                  }
                : hospital
            )
          );
          setSelectionAtLevel("department", newDepartment.id);
        } else if (mode === "edit" && targetId) {
          setData((prev) =>
            prev.map((hospital) =>
              hospital.id === hospitalId
                ? {
                    ...hospital,
                    buildings: hospital.buildings.map((building) =>
                      building.id === buildingId
                        ? {
                            ...building,
                            blocks: building.blocks.map((block) =>
                              block.id === blockId
                                ? {
                                    ...block,
                                  floors: block.floors.map((floor) =>
                                    floor.id === floorId
                                      ? {
                                          ...floor,
                                          departments: floor.departments.map((department) =>
                                      department.id === targetId
                                        ? {
                                            ...department,
                                            name,
                                            type,
                                          }
                                        : department
                                          ),
                                        }
                                      : floor
                                    ),
                                  }
                                : block
                            ),
                          }
                        : building
                    ),
                  }
                : hospital
            )
          );
        }
        break;
      }
      case "room": {
        const { hospitalId, buildingId, blockId, floorId, departmentId } = parentIds;
        if (!hospitalId || !buildingId || !blockId || !floorId || !departmentId) {
          return;
        }

        const name = (formValues.name ?? "").trim();
        const roomType = (formValues.roomType as RoomType) ?? ROOM_TYPES[0].value;

        if (!name) {
          window.alert("Room name/number is required.");
          return;
        }

        if (mode === "add") {
          const newRoom: Room = {
            id: generateId(),
            name,
            roomType,
            details: [],
          };

          setData((prev) =>
            upsertDepartmentRoom(
              prev,
              { hospitalId, buildingId, blockId, floorId, departmentId },
              (rooms) => [...rooms, newRoom]
            )
          );
          setSelectionAtLevel("room", newRoom.id);
        } else if (mode === "edit" && targetId) {
          setData((prev) =>
            upsertDepartmentRoom(
              prev,
              { hospitalId, buildingId, blockId, floorId, departmentId },
              (rooms) =>
              rooms.map((room) =>
                room.id === targetId
                  ? {
                      ...room,
                      name,
                      roomType,
                      details:
                        room.roomType === roomType
                          ? room.details
                          : room.details.filter(() => false),
                    }
                  : room
              )
            )
          );
          if (selectedRoom && selectedRoom.roomType !== roomType) {
            resetSelectionsFromLevel("detail");
          }
        }
        break;
      }
      case "detail": {
        const { hospitalId, buildingId, blockId, floorId, departmentId, roomId } = parentIds;
        if (!hospitalId || !buildingId || !blockId || !floorId || !departmentId || !roomId) {
          return;
        }

        const baseRoom =
          selectedDepartment?.rooms.find((room) => room.id === roomId) ?? selectedRoom ?? null;
        if (!baseRoom) {
          return;
        }

        const baseRoomType =
          mode === "edit" && selectedDetail
            ? ROOM_TYPES.find((type) => type.value === baseRoom.roomType)
            : ROOM_TYPES.find((type) => type.value === baseRoom.roomType);

        const detailType =
          mode === "edit" && selectedDetail
            ? selectedDetail.detailType
            : determineDetailType(baseRoom.roomType);

        const baseTypeLabel = baseRoomType?.label ?? "Room Detail";

        let name = "";
        let attributes: Record<string, string> = {};

        if (detailType === "private-room") {
          const sharingType = formValues.sharingType ?? "";
          const luxuryLevel = formValues.luxuryLevel ?? "";
          if (!sharingType || !luxuryLevel) {
            window.alert("Select sharing type and luxury level for the private room.");
            return;
          }
          attributes = {
            sharingType,
            luxuryLevel,
          };
          name = formatDetailName(detailType, attributes, baseTypeLabel);
        } else if (detailType === "washroom") {
          const gender = formValues.gender ?? "";
          const style = formValues.style ?? "";
          if (!gender || !style) {
            window.alert("Select gender and style for the washroom configuration.");
            return;
          }
          attributes = {
            gender,
            style,
          };
          name = formatDetailName(detailType, attributes, baseTypeLabel);
        } else if (detailType === "cottage-ward") {
          const bedCapacity = formValues.bedCapacity ?? "";
          if (!bedCapacity) {
            window.alert("Enter bed capacity for the cottage/ward.");
            return;
          }
          attributes = {
            bedCapacity,
            amenities: formValues.amenities ?? "",
          };
          name = formatDetailName(detailType, attributes, baseTypeLabel);
        } else {
          const gender = formValues.gender ?? "";
          const toiletType = formValues.toiletType ?? "";
          const airConditioning = formValues.airConditioning ?? "";
          const luxuryLevel = formValues.luxuryLevel ?? "";
          if (!gender || !toiletType || !airConditioning || !luxuryLevel) {
            window.alert("Select gender, toilet type, AC preference, and luxury level.");
            return;
          }
          attributes = {
            gender,
            toiletType,
            airConditioning,
            luxuryLevel,
          };
          name = formatDetailName(detailType, attributes, baseTypeLabel);
        }

        if (mode === "add") {
          const newDetail: RoomDetail = {
            id: generateId(),
            name,
            detailType,
            attributes,
          };

          setData((prev) =>
            upsertRoomDetail(
              prev,
              { hospitalId, buildingId, blockId, floorId, departmentId, roomId },
              (details) => [...details, newDetail]
            )
          );
          setSelectionAtLevel("detail", newDetail.id);
        } else if (mode === "edit" && targetId) {
          setData((prev) =>
            upsertRoomDetail(
              prev,
              { hospitalId, buildingId, blockId, floorId, departmentId, roomId },
              (details) =>
                details.map((detail) =>
                  detail.id === targetId
                    ? {
                        ...detail,
                        name,
                        detailType,
                        attributes,
                      }
                    : detail
                )
            )
          );
        }
        break;
      }
      default:
        break;
    }

    closeDialog();
  };

  const dialogTitle =
    dialogState.level && dialogState.mode
      ? `${dialogState.mode === "add" ? "Add" : "Edit"} ${LEVEL_LABELS[dialogState.level]}`
      : "Manage Hierarchy";

  const dialogDetailType =
    dialogState.level === "detail"
      ? dialogState.mode === "edit" && selectedDetail
        ? selectedDetail.detailType
        : determineDetailType(selectedRoom?.roomType ?? "consultation")
      : null;

  const renderDialogFields = () => {
    if (!dialogState.level) {
      return null;
    }

    switch (dialogState.level) {
      case "hospital":
        return (
          <div className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-[#1D2635]">
                Hospital Name<span className="text-[#D14D4F]">*</span>
              </label>
              <input
                type="text"
                value={formValues.name ?? ""}
                onChange={(event) => setFormValues((prev) => ({ ...prev, name: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-[#D4DDD4] px-4 py-3 text-sm font-medium text-[#1D2635] focus:border-[#0B8C00] focus:outline-none focus:ring-4 focus:ring-[#0B8C00]/10"
                placeholder="Enter hospital name"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-[#1D2635]">Location</label>
              <input
                type="text"
                value={formValues.location ?? ""}
                onChange={(event) =>
                  setFormValues((prev) => ({ ...prev, location: event.target.value }))
                }
                className="mt-2 w-full rounded-2xl border border-[#D4DDD4] px-4 py-3 text-sm font-medium text-[#1D2635] focus:border-[#0B8C00] focus:outline-none focus:ring-4 focus:ring-[#0B8C00]/10"
                placeholder="City, Country"
              />
            </div>
          </div>
        );
      case "building":
        return (
          <div className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-[#1D2635]">
                Building Name / Number<span className="text-[#D14D4F]">*</span>
              </label>
              <input
                type="text"
                value={formValues.name ?? ""}
                onChange={(event) => setFormValues((prev) => ({ ...prev, name: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-[#D4DDD4] px-4 py-3 text-sm font-medium text-[#1D2635] focus:border-[#0B8C00] focus:outline-none focus:ring-4 focus:ring-[#0B8C00]/10"
                placeholder="e.g., Building A"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-[#1D2635]">Floors</label>
              <input
                type="text"
                value={formValues.floors ?? ""}
                onChange={(event) =>
                  setFormValues((prev) => ({ ...prev, floors: event.target.value }))
                }
                className="mt-2 w-full rounded-2xl border border-[#D4DDD4] px-4 py-3 text-sm font-medium text-[#1D2635] focus:border-[#0B8C00] focus:outline-none focus:ring-4 focus:ring-[#0B8C00]/10"
                placeholder="Total floors (optional)"
              />
            </div>
          </div>
        );
      case "block":
        return (
          <div>
            <label className="text-sm font-semibold text-[#1D2635]">
              Block Name / Code<span className="text-[#D14D4F]">*</span>
            </label>
            <input
              type="text"
              value={formValues.name ?? ""}
              onChange={(event) => setFormValues((prev) => ({ ...prev, name: event.target.value }))}
              className="mt-2 w-full rounded-2xl border border-[#D4DDD4] px-4 py-3 text-sm font-medium text-[#1D2635] focus:border-[#0B8C00] focus:outline-none focus:ring-4 focus:ring-[#0B8C00]/10"
              placeholder="e.g., Block 1"
            />
          </div>
        );
      case "floor":
        return (
          <div>
            <label className="text-sm font-semibold text-[#1D2635]">
              Floor Name / Number<span className="text-[#D14D4F]">*</span>
            </label>
            <input
              type="text"
              value={formValues.name ?? ""}
              onChange={(event) => setFormValues((prev) => ({ ...prev, name: event.target.value }))}
              className="mt-2 w-full rounded-2xl border border-[#D4DDD4] px-4 py-3 text-sm font-medium text-[#1D2635] focus:border-[#0B8C00] focus:outline-none focus:ring-4 focus:ring-[#0B8C00]/10"
              placeholder="e.g., Floor 1"
            />
          </div>
        );
      case "department":
        return (
          <div className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-[#1D2635]">
                Department Name<span className="text-[#D14D4F]">*</span>
              </label>
              <input
                type="text"
                value={formValues.name ?? ""}
                onChange={(event) => setFormValues((prev) => ({ ...prev, name: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-[#D4DDD4] px-4 py-3 text-sm font-medium text-[#1D2635] focus:border-[#0B8C00] focus:outline-none focus:ring-4 focus:ring-[#0B8C00]/10"
                placeholder="e.g., Cardiology"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-[#1D2635]">Department Type</label>
              <select
                value={formValues.type ?? "Clinical"}
                onChange={(event) =>
                  setFormValues((prev) => ({ ...prev, type: event.target.value }))
                }
                className="mt-2 w-full rounded-2xl border border-[#D4DDD4] bg-white px-4 py-3 text-sm font-medium text-[#1D2635] focus:border-[#0B8C00] focus:outline-none focus:ring-4 focus:ring-[#0B8C00]/10"
              >
                {DEPARTMENT_TYPES.map((departmentType) => (
                  <option key={departmentType} value={departmentType}>
                    {departmentType}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );
      case "room":
        return (
          <div className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-[#1D2635]">
                Room Name / Number<span className="text-[#D14D4F]">*</span>
              </label>
              <input
                type="text"
                value={formValues.name ?? ""}
                onChange={(event) => setFormValues((prev) => ({ ...prev, name: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-[#D4DDD4] px-4 py-3 text-sm font-medium text-[#1D2635] focus:border-[#0B8C00] focus:outline-none focus:ring-4 focus:ring-[#0B8C00]/10"
                placeholder="e.g., Room 101"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-[#1D2635]">Room Category</label>
              <select
                value={formValues.roomType ?? ROOM_TYPES[0].value}
                onChange={(event) =>
                  setFormValues((prev) => ({ ...prev, roomType: event.target.value }))
                }
                className="mt-2 w-full rounded-2xl border border-[#D4DDD4] bg-white px-4 py-3 text-sm font-medium text-[#1D2635] focus:border-[#0B8C00] focus:outline-none focus:ring-4 focus:ring-[#0B8C00]/10"
              >
                {ROOM_TYPES.map((roomType) => (
                  <option key={roomType.value} value={roomType.value}>
                    {roomType.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );
      case "detail":
        if (!dialogDetailType) {
          return null;
        }

        if (dialogDetailType === "private-room") {
          return (
            <div className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-[#1D2635]">
                  Sharing Type<span className="text-[#D14D4F]">*</span>
                </label>
                <select
                  value={formValues.sharingType ?? "Single"}
                  onChange={(event) =>
                    setFormValues((prev) => ({ ...prev, sharingType: event.target.value }))
                  }
                  className="mt-2 w-full rounded-2xl border border-[#D4DDD4] bg-white px-4 py-3 text-sm font-medium text-[#1D2635] focus:border-[#0B8C00] focus:outline-none focus:ring-4 focus:ring-[#0B8C00]/10"
                >
                  <option value="Single">Single</option>
                  <option value="Twin Sharing">Twin Sharing</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-[#1D2635]">
                  Luxury Level<span className="text-[#D14D4F]">*</span>
                </label>
                <select
                  value={formValues.luxuryLevel ?? "Deluxe"}
                  onChange={(event) =>
                    setFormValues((prev) => ({ ...prev, luxuryLevel: event.target.value }))
                  }
                  className="mt-2 w-full rounded-2xl border border-[#D4DDD4] bg-white px-4 py-3 text-sm font-medium text-[#1D2635] focus:border-[#0B8C00] focus:outline-none focus:ring-4 focus:ring-[#0B8C00]/10"
                >
                  <option value="Deluxe">Deluxe</option>
                  <option value="Super Deluxe">Super Deluxe</option>
                </select>
              </div>
            </div>
          );
        }

        if (dialogDetailType === "washroom") {
          return (
            <div className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-[#1D2635]">
                  Gender<span className="text-[#D14D4F]">*</span>
                </label>
                <select
                  value={formValues.gender ?? "Male"}
                  onChange={(event) =>
                    setFormValues((prev) => ({ ...prev, gender: event.target.value }))
                  }
                  className="mt-2 w-full rounded-2xl border border-[#D4DDD4] bg-white px-4 py-3 text-sm font-medium text-[#1D2635] focus:border-[#0B8C00] focus:outline-none focus:ring-4 focus:ring-[#0B8C00]/10"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Unisex">Unisex</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-[#1D2635]">
                  Style<span className="text-[#D14D4F]">*</span>
                </label>
                <select
                  value={formValues.style ?? "Western"}
                  onChange={(event) =>
                    setFormValues((prev) => ({ ...prev, style: event.target.value }))
                  }
                  className="mt-2 w-full rounded-2xl border border-[#D4DDD4] bg-white px-4 py-3 text-sm font-medium text-[#1D2635] focus:border-[#0B8C00] focus:outline-none focus:ring-4 focus:ring-[#0B8C00]/10"
                >
                  <option value="Western">Western</option>
                  <option value="Indian">Indian</option>
                </select>
              </div>
            </div>
          );
        }

        if (dialogDetailType === "cottage-ward") {
          return (
            <div className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-[#1D2635]">
                  Bed Capacity<span className="text-[#D14D4F]">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={formValues.bedCapacity ?? "1"}
                  onChange={(event) =>
                    setFormValues((prev) => ({ ...prev, bedCapacity: event.target.value }))
                  }
                  className="mt-2 w-full rounded-2xl border border-[#D4DDD4] px-4 py-3 text-sm font-medium text-[#1D2635] focus:border-[#0B8C00] focus:outline-none focus:ring-4 focus:ring-[#0B8C00]/10"
                  placeholder="Enter bed count"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-[#1D2635]">Amenities</label>
                <textarea
                  value={formValues.amenities ?? ""}
                  onChange={(event) =>
                    setFormValues((prev) => ({ ...prev, amenities: event.target.value }))
                  }
                  className="mt-2 h-32 w-full rounded-2xl border border-[#D4DDD4] px-4 py-3 text-sm font-medium text-[#1D2635] focus:border-[#0B8C00] focus:outline-none focus:ring-4 focus:ring-[#0B8C00]/10"
                  placeholder="Comma-separated amenities"
                />
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-5">
          <div>
              <p className="text-sm font-semibold text-[#1D2635]">
                Gender<span className="text-[#D14D4F]">*</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {["Male", "Female", "Unisex"].map((option) => (
                  <label
                    key={option}
                    className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm ${
                      formValues.gender === option
                        ? "border-[#0B8C00] bg-[#F2F8F2] text-[#0B8C00]"
                        : "border-[#D4DDD4] text-[#1D2635]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="detail-gender"
                      value={option}
                      checked={(formValues.gender ?? "Male") === option}
                      onChange={(event) =>
                        setFormValues((prev) => ({ ...prev, gender: event.target.value }))
                      }
                      className="hidden"
                    />
                    {option}
            </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-[#1D2635]">
                Toilet Type<span className="text-[#D14D4F]">*</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {["Indian", "English"].map((option) => (
                  <label
                    key={option}
                    className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm ${
                      formValues.toiletType === option
                        ? "border-[#0B8C00] bg-[#F2F8F2] text-[#0B8C00]"
                        : "border-[#D4DDD4] text-[#1D2635]"
                    }`}
                  >
            <input
                      type="radio"
                      name="detail-toilet"
                      value={option}
                      checked={(formValues.toiletType ?? "Indian") === option}
                      onChange={(event) =>
                        setFormValues((prev) => ({ ...prev, toiletType: event.target.value }))
                      }
                      className="hidden"
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-[#1D2635]">
                Air Conditioning<span className="text-[#D14D4F]">*</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {["AC", "Non-AC"].map((option) => (
                  <label
                    key={option}
                    className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm ${
                      formValues.airConditioning === option
                        ? "border-[#0B8C00] bg-[#F2F8F2] text-[#0B8C00]"
                        : "border-[#D4DDD4] text-[#1D2635]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="detail-ac"
                      value={option}
                      checked={(formValues.airConditioning ?? "AC") === option}
                      onChange={(event) =>
                        setFormValues((prev) => ({ ...prev, airConditioning: event.target.value }))
                      }
                      className="hidden"
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-[#1D2635]">
                Luxury Level<span className="text-[#D14D4F]">*</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {["Deluxe", "Super Deluxe"].map((option) => (
                  <label
                    key={option}
                    className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm ${
                      formValues.luxuryLevel === option
                        ? "border-[#0B8C00] bg-[#F2F8F2] text-[#0B8C00]"
                        : "border-[#D4DDD4] text-[#1D2635]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="detail-luxury"
                      value={option}
                      checked={(formValues.luxuryLevel ?? "Deluxe") === option}
                      onChange={(event) =>
                        setFormValues((prev) => ({ ...prev, luxuryLevel: event.target.value }))
                      }
                      className="hidden"
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const renderDetailAttributes = (detail: RoomDetail) => {
    switch (detail.detailType) {
      case "private-room":
        return (
          <p className="text-xs text-[#586270]">
            {detail.attributes.sharingType} · {detail.attributes.luxuryLevel}
          </p>
        );
      case "washroom":
        return (
          <p className="text-xs text-[#586270]">
            {detail.attributes.gender} · {detail.attributes.style}
          </p>
        );
      case "cottage-ward":
        return (
          <p className="text-xs text-[#586270]">
            {detail.attributes.bedCapacity} beds
            {detail.attributes.amenities
              ? ` · Amenities: ${detail.attributes.amenities}`
              : null}
          </p>
        );
      default:
      return (
        <div className="flex flex-col gap-1 text-xs text-[#586270]">
          {detail.attributes.gender ? <p>Gender: {detail.attributes.gender}</p> : null}
          {detail.attributes.toiletType ? (
            <p>Toilet: {detail.attributes.toiletType}</p>
          ) : null}
          {detail.attributes.airConditioning ? (
            <p>Air Conditioning: {detail.attributes.airConditioning}</p>
          ) : null}
          {detail.attributes.luxuryLevel ? (
            <p>Luxury: {detail.attributes.luxuryLevel}</p>
          ) : null}
          {!detail.attributes.gender &&
          !detail.attributes.toiletType &&
          !detail.attributes.airConditioning &&
          !detail.attributes.luxuryLevel &&
          detail.attributes.note ? (
            <p>{detail.attributes.note}</p>
          ) : null}
        </div>
      );
    }
  };

  const renderRoomNodes = (rooms: Room[]) =>
    rooms.map((room) => {
      const typeLabel = ROOM_TYPES.find((type) => type.value === room.roomType)?.label ?? "Room";
      return (
        <div key={room.id} className="space-y-3 border-l border-[#E1E8E1] pl-4">
          <div className="rounded-2xl bg-[#F8FBF8] px-4 py-3">
            <p className="font-semibold text-[#1D2635]">{room.name}</p>
            <p className="text-xs text-[#586270]">{typeLabel}</p>
            <p className="mt-1 text-xs text-[#7A8577]">
              {room.details.length === 1 ? "1 detail" : `${room.details.length} details`}
            </p>
          </div>
          {room.details.length > 0 ? (
            <div className="space-y-2 border-l border-dashed border-[#CBDACB] pl-4">
              {room.details.map((detail) => (
                <div
                  key={detail.id}
                  className="rounded-2xl bg-white px-4 py-3 text-sm text-[#1D2635] shadow-[0px_12px_30px_rgba(47,72,61,0.08)]"
                >
                  <p className="font-semibold text-[#0B8C00]">{detail.name}</p>
                  <div className="mt-1">{renderDetailAttributes(detail)}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      );
    });

  const renderDepartmentNodes = (departments: Department[]) =>
    departments.map((department) => (
      <div key={department.id} className="space-y-4 border-l-2 border-[#D4DDD4] pl-5">
        <div className="rounded-2xl bg-white px-4 py-4 shadow-[0px_20px_50px_rgba(47,72,61,0.08)]">
          <p className="text-sm font-semibold text-[#1D2635]">{department.name}</p>
          <p className="mt-1 text-xs text-[#586270]">Type: {department.type}</p>
          <p className="mt-1 text-xs text-[#7A8577]">
            {department.rooms.length === 1 ? "1 room" : `${department.rooms.length} rooms`}
          </p>
        </div>
        {department.rooms.length > 0 ? (
          <div className="space-y-4 border-l border-[#E1E8E1] pl-5">
            {renderRoomNodes(department.rooms)}
          </div>
        ) : null}
      </div>
    ));

  const renderFloorNodes = (floors: Floor[]) =>
    floors.map((floor) => (
      <div key={floor.id} className="space-y-4 border-l-2 border-[#CBDACB] pl-5">
        <div className="rounded-2xl bg-[#F8FBF8] px-4 py-4">
          <p className="text-sm font-semibold text-[#1D2635]">{floor.name}</p>
          <p className="mt-1 text-xs text-[#7A8577]">
            {floor.departments.length === 1 ? "1 department" : `${floor.departments.length} departments`}
          </p>
        </div>
        {floor.departments.length > 0 ? (
          <div className="space-y-4 border-l border-[#D4DDD4] pl-5">
            {renderDepartmentNodes(floor.departments)}
          </div>
        ) : null}
      </div>
    ));

  const renderBlockNodes = (blocks: Block[]) =>
    blocks.map((block) => (
      <div key={block.id} className="space-y-4 border-l-2 border-[#D4DDD4] pl-5">
        <div className="rounded-2xl bg-white px-4 py-4 shadow-[0px_20px_50px_rgba(47,72,61,0.08)]">
          <p className="text-sm font-semibold text-[#1D2635]">{block.name}</p>
          <p className="mt-1 text-xs text-[#7A8577]">
            {block.floors.length === 1 ? "1 floor" : `${block.floors.length} floors`}
          </p>
        </div>
        {block.floors.length > 0 ? (
          <div className="space-y-4 border-l border-[#CBDACB] pl-5">{renderFloorNodes(block.floors)}</div>
        ) : null}
      </div>
    ));

  const renderBuildingNodes = (buildings: Building[]) =>
    buildings.map((building) => (
      <div key={building.id} className="space-y-4 border-l-2 border-[#CBDACB] pl-5">
        <div className="rounded-2xl bg-[#F8FBF8] px-4 py-4">
          <p className="text-sm font-semibold text-[#1D2635]">{building.name}</p>
          <p className="mt-1 text-xs text-[#586270]">
            {building.floors ? `${building.floors} floors total` : "Floors not specified"}
          </p>
          <p className="mt-1 text-xs text-[#7A8577]">
            {building.blocks.length === 1 ? "1 block" : `${building.blocks.length} blocks`}
          </p>
        </div>
        {building.blocks.length > 0 ? (
          <div className="space-y-4 border-l border-[#D4DDD4] pl-5">{renderBlockNodes(building.blocks)}</div>
        ) : null}
      </div>
    ));

  return (
    <AppShell>
      {experienceStep === "welcome" ? (
        <div className="flex flex-1 flex-col px-8 pb-12">
          <PageHeading title="Hospital Infrastructure" />
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#586270]">
            Build and manage hierarchical infrastructure for hospitals. Configure hospitals,
            buildings, blocks, floors, departments, rooms, and detailed room attributes with live
            dependent dropdowns. Use the actions to add, edit, or remove items at every level, then
            switch to the Selected Branch view to audit the full path.
          </p>

          <div className="mt-14 flex flex-1 items-center justify-center">
            <div className="flex max-w-2xl flex-col items-center gap-6 rounded-[32px] border-2 border-dashed border-[#0B8C00]/30 bg-white/80 px-16 py-20 text-center shadow-[0px_28px_80px_rgba(47,72,61,0.12)] backdrop-blur-sm">
              <h2 className="text-2xl font-semibold text-[#1D2635]">Make It Your Own</h2>
              <p className="text-sm leading-relaxed text-[#586270]">
                Start by designing the hierarchy you want to manage. Drag and drop the infrastructure
                elements on the next step, then unlock the full configuration experience tailored to
                your selection.
              </p>
              <Button onClick={() => setExperienceStep("builder")}>Let&apos;s Start</Button>
            </div>
          </div>
        </div>
      ) : experienceStep === "builder" ? (
        <div className="flex flex-1 flex-col px-8 pb-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <PageHeading title="Design Your Infrastructure Flow" />
            <Button variant="primary" size="small" onClick={() => setExperienceStep("welcome")}>
              Back
            </Button>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#586270]">
            Drag options into the canvas to craft the path you want administrators to follow. We
            recommend covering the full journey from hospital to room details for the richest setup.
          </p>

          <div className="mt-10 flex flex-1 flex-col gap-6 lg:flex-row">
            <div className="flex flex-1 flex-col">
              <div
                className="flex flex-1 flex-col rounded-[32px] border-2 border-dashed border-[#0B8C00]/40 bg-white/70 p-8 text-center shadow-[0px_24px_60px_rgba(47,72,61,0.08)] backdrop-blur-sm"
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }}
                onDrop={handleBuilderDrop}
              >
                {builderLevels.length === 0 &&
                builderRoomTypes.length === 0 &&
                builderCustomElementIds.length === 0 ? (
                  <div className="m-auto max-w-md space-y-3">
                    <p className="text-base font-semibold text-[#1D2635]">
                      Drag options from the right panel
                    </p>
                    <p className="text-sm leading-relaxed text-[#586270]">
                      Begin with the hospital level, then continue with buildings, blocks, floors,
                      custom steps, and room types. You can remove cards later.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6 text-left">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#7A8577]">
                        Hierarchy Path
                      </p>
                      <div className="mt-3 flex flex-wrap gap-3">
                        {builderLevels.map((level) => (
                          <div
                            key={level}
                            className="group relative min-w-[200px] rounded-2xl border border-[#0B8C00] bg-[#F2F8F2] px-4 py-3 pr-12 text-[#0B8C00] shadow-[0px_16px_30px_rgba(34,56,43,0.12)]"
                          >
                            <p className="text-sm font-semibold">{LEVEL_LABELS[level]}</p>
                            <p className="mt-1 text-xs text-[#4F6152]">
                              {BUILDER_LEVEL_DESCRIPTIONS[level]}
                            </p>
                            <button
                              type="button"
                              onClick={() => removeBuilderLevel(level)}
                              className="absolute right-3 top-3 rounded-full bg-white/80 px-2 py-1 text-xs font-semibold text-[#0B8C00] shadow hover:bg-white"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {builderCustomElementIds.length > 0 ? (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#7A8577]">
                          Custom Steps
                        </p>
                        <div className="mt-3 flex flex-wrap gap-3">
                          {builderCustomElementIds.map((customId) => {
                            const element = customElements.find((item) => item.id === customId);
                            if (!element) {
                              return null;
                            }
                            return (
                              <div
                                key={customId}
                                className="group relative min-w-[200px] rounded-2xl border border-[#8DBA8D] bg-[#F8FBF8] px-4 py-3 pr-12 text-[#1D2635]"
                              >
                                <p className="text-sm font-semibold text-[#0B8C00]">
                                  {element.label}
                                </p>
                                {element.description ? (
                                  <p className="mt-1 text-xs text-[#586270]">{element.description}</p>
                                ) : null}
                                <p className="mt-2 text-xs text-[#7A8577]">
                                  {element.fields.length} field{element.fields.length === 1 ? "" : "s"}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => removeBuilderCustomElement(customId)}
                                  className="absolute right-3 top-3 rounded-full bg-white/80 px-2 py-1 text-xs font-semibold text-[#0B8C00] shadow hover:bg-white"
                                >
                                  Remove
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {builderRoomTypes.length > 0 ? (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#7A8577]">
                          Room Types To Configure
                        </p>
                        <div className="mt-3 flex flex-wrap gap-3">
                          {builderRoomTypes.map((roomType) => {
                            const roomTypeLabel =
                              ROOM_TYPES.find((type) => type.value === roomType)?.label;
                            return (
                              <div
                                key={roomType}
                                className="group relative rounded-2xl border border-[#9CBD9C] bg-[#F8FBF8] px-4 py-3 pr-12 text-[#1D2635]"
                              >
                                <p className="text-sm font-semibold text-[#0B8C00]">
                                  {roomTypeLabel}
                                </p>
                                <p className="mt-1 text-xs text-[#586270]">
                                  {ROOM_TYPE_DESCRIPTIONS[roomType]}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => removeBuilderRoomType(roomType)}
                                  className="absolute right-3 top-3 rounded-full bg-white/80 px-2 py-1 text-xs font-semibold text-[#0B8C00] shadow hover:bg-white"
                                >
                                  Remove
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    <p className="text-xs text-[#7A8577]">
                      Drag additional items to expand the flow or remove cards to simplify it. This
                      layout guides the configuration experience on the next screen.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                <Button variant="ghost" size="small" onClick={resetBuilderCanvas}>
                  Reset Canvas
                </Button>
                <Button
                  size="medium"
                  onClick={() => setExperienceStep("configure")}
                  disabled={!builderHasCoreLevels}
                >
                  Proceed to Configuration
                </Button>
              </div>
              {!builderHasCoreLevels ? (
                <p className="mt-2 text-xs text-[#D17C2F]">
                  Add Hospital, Building, Block, Floor, Department, and Room to continue.
                </p>
              ) : null}
            </div>

            <div className="w-full shrink-0 space-y-6 lg:w-80">
              <section className="rounded-3xl border border-[#E1E8E1] bg-white p-6 shadow-[0px_24px_60px_rgba(47,72,61,0.08)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-[#1D2635]">Hierarchy Elements</h3>
                    <p className="mt-1 text-xs text-[#586270]">
                      Drag in the order you want to follow.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openCustomElementDialog()}
                    className="rounded-full bg-[#0B8C00]/10 px-3 py-1 text-xs font-semibold text-[#0B8C00] transition hover:bg-[#0B8C00]/20"
                  >
                    + Custom
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  {LEVEL_ORDER.map((level) => (
                    <button
                      key={level}
                      type="button"
                      draggable
                      onDragStart={(event) => handleDragStartLevel(event, level)}
                      className="w-full rounded-2xl border border-[#D4DDD4] bg-[#F8FBF8] px-4 py-3 text-left text-sm font-medium text-[#1D2635] transition hover:border-[#0B8C00] hover:bg-[#F2F8F2]"
                    >
                      <div className="flex items-center justify-between">
                        <span>{LEVEL_LABELS[level]}</span>
                        <span className="text-xs font-semibold text-[#7A8577]">
                          {builderLevels.includes(level) ? "Added" : "Drag"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#586270]">
                        {BUILDER_LEVEL_DESCRIPTIONS[level]}
                      </p>
                    </button>
                  ))}
                </div>

                {customElements.length > 0 ? (
                  <>
                    <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-[#7A8577]">
                      Your Custom Elements
                    </p>
                    <div className="mt-3 space-y-3">
                      {customElements.map((element) => (
                        <div
                          key={element.id}
                          draggable
                          onDragStart={(event) => handleDragStartCustomElement(event, element.id)}
                          className="rounded-2xl border border-[#CBDACB] bg-[#FDFDFD] px-4 py-4 text-left text-sm text-[#1D2635] shadow-sm transition hover:border-[#0B8C00] hover:bg-[#F2F8F2]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-[#0B8C00]">{element.label}</p>
                              {element.description ? (
                                <p className="mt-1 text-xs text-[#586270]">{element.description}</p>
                              ) : null}
                              <p className="mt-2 text-xs text-[#7A8577]">
                                {element.fields.length} field{element.fields.length === 1 ? "" : "s"} · Drag
                                to use
                              </p>
                            </div>
                            <span className="text-xs font-semibold text-[#7A8577]">Drag</span>
                          </div>
                          <div className="mt-3 flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => openCustomElementDialog(element.id)}
                              className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#0B8C00] shadow hover:bg-[#F2F8F2]"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => removeCustomElementDefinition(element.id)}
                              className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#D14D4F] shadow hover:bg-[#FDF0F0]"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
              </section>

              <section className="rounded-3xl border border-[#E1E8E1] bg-white p-6 shadow-[0px_24px_60px_rgba(47,72,61,0.08)]">
                <h3 className="text-sm font-semibold text-[#1D2635]">Room Types</h3>
                <p className="mt-1 text-xs text-[#586270]">Optional additions for detailed setup.</p>
                <div className="mt-4 space-y-3">
                  {ROOM_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      draggable
                      onDragStart={(event) => handleDragStartRoomType(event, type.value)}
                      className="w-full rounded-2xl border border-[#D4DDD4] bg-[#FDFDFD] px-4 py-3 text-left text-sm font-medium text-[#1D2635] transition hover:border-[#0B8C00] hover:bg-[#F2F8F2]"
                    >
                      <div className="flex items-center justify-between">
                        <span>{type.label}</span>
                        <span className="text-xs font-semibold text-[#7A8577]">
                          {builderRoomTypes.includes(type.value) ? "Added" : "Drag"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#586270]">
                        {ROOM_TYPE_DESCRIPTIONS[type.value]}
                      </p>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="px-8 pb-12">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <PageHeading title="Hospital Infrastructure" />
              <Button variant="outline" size="small" onClick={() => setExperienceStep("builder")}>
                Adjust Flow
              </Button>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#586270]">
              Build and manage hierarchical infrastructure for hospitals. Configure hospitals,
              buildings, blocks, floors, departments, rooms, and detailed room attributes with live
              dependent dropdowns. Use the actions to add, edit, or remove items at every level, then
              switch to the Selected Branch view to audit the full path.
            </p>

            <div className="mt-10 grid gap-8 lg:grid-cols-[2fr,1fr]">
              <div className="space-y-6">
                {selectedCustomElements.length > 0 ? (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold text-[#1D2635]">Custom Elements</h2>
                        <p className="mt-1 text-sm text-[#586270]">
                          These steps were added in the builder. They behave just like the hierarchy
                          sections below.
                        </p>
                      </div>
                      <Button variant="outline" size="small" onClick={() => setExperienceStep("builder")}>
                        Adjust Flow
                      </Button>
                    </div>
                    {selectedCustomElements.map((element) => (
                      <CustomElementSection
                        key={element.id}
                        element={element}
                        selectedIndex={customElementSelections[element.id] ?? null}
                        onSelect={(index) =>
                          setCustomElementSelections((prev) => ({
                            ...prev,
                            [element.id]: index,
                          }))
                        }
                        onAddEntry={() => openCustomElementDataDialog(element.id, "add")}
                        onEditEntry={() => {
                          const selectedIndex = customElementSelections[element.id];
                          if (selectedIndex === null || selectedIndex === undefined) {
                            return;
                          }
                          openCustomElementDataDialog(element.id, "edit", selectedIndex);
                        }}
                        onRemoveEntry={() => {
                          const selectedIndex = customElementSelections[element.id];
                          if (selectedIndex === null || selectedIndex === undefined) {
                            return;
                          }
                          removeCustomElementEntry(element.id, selectedIndex);
                        }}
                        onConfigureStructure={() => openCustomElementDialog(element.id)}
                        onRemoveElement={() => removeBuilderCustomElement(element.id)}
                      />
                    ))}
                  </div>
                ) : null}

                <HierarchySection
                  title="Hospital"
                  description="Choose a hospital to manage its infrastructure."
                  items={data}
                  selectedId={selection.hospitalId}
                  onSelect={(id) => setSelectionAtLevel("hospital", id)}
                  onAdd={() => openHospitalDialog("add")}
                  onEdit={() => openHospitalDialog("edit")}
                  onRemove={handleRemoveHospital}
                  getOptionLabel={(hospital) => hospital.name}
                  renderSelectedInfo={(hospital) =>
                    hospital ? (
                      <div className="mt-4 grid grid-cols-1 gap-3 rounded-2xl bg-[#F2F8F2] px-4 py-4 text-sm text-[#1D2635] md:grid-cols-2">
                        <div>
                          <p className="font-semibold text-[#0B8C00]">Location</p>
                          <p>{hospital.location || "Not specified"}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-[#0B8C00]">Buildings</p>
                          <p>{hospital.buildings.length}</p>
                        </div>
                      </div>
                    ) : null
                  }
                />

                <HierarchySection
                  title="Building"
                  description="Select a building to manage its blocks."
                  items={selectedHospital?.buildings ?? []}
                  selectedId={selection.buildingId}
                  disabled={!selectedHospital}
                  onSelect={(id) => setSelectionAtLevel("building", id)}
                  onAdd={() => openBuildingDialog("add")}
                  onEdit={() => openBuildingDialog("edit")}
                  onRemove={handleRemoveBuilding}
                  getOptionLabel={(building) =>
                    building.floors ? `${building.name} · ${building.floors} floors` : building.name
                  }
                  renderSelectedInfo={(building) =>
                    building ? (
                      <div className="mt-4 grid grid-cols-1 gap-3 rounded-2xl bg-[#F8FBF8] px-4 py-4 text-sm text-[#1D2635] md:grid-cols-2">
                        <div>
                          <p className="font-semibold text-[#0B8C00]">Floors</p>
                          <p>{building.floors ?? "Not specified"}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-[#0B8C00]">Blocks</p>
                          <p>{building.blocks.length}</p>
                        </div>
                      </div>
                    ) : null
                  }
                />

                <HierarchySection
                  title="Block"
                  description="Select a block to configure its floors."
                  items={selectedBuilding?.blocks ?? []}
                  selectedId={selection.blockId}
                  disabled={!selectedBuilding}
                  onSelect={(id) => setSelectionAtLevel("block", id)}
                  onAdd={() => openBlockDialog("add")}
                  onEdit={() => openBlockDialog("edit")}
                  onRemove={handleRemoveBlock}
                  getOptionLabel={(block) => block.name}
                  renderSelectedInfo={(block) =>
                    block ? (
                      <div className="mt-4 rounded-2xl bg-[#F8FBF8] px-4 py-4 text-sm text-[#1D2635]">
                        <p className="font-semibold text-[#0B8C00]">Floors</p>
                        <p>{block.floors.length}</p>
                      </div>
                    ) : null
                  }
                />

                <HierarchySection
                  title="Floor"
                  description="Select a floor to configure departments."
                  items={selectedBlock?.floors ?? []}
                  selectedId={selection.floorId}
                  disabled={!selectedBlock}
                  onSelect={(id) => setSelectionAtLevel("floor", id)}
                  onAdd={() => openFloorDialog("add")}
                  onEdit={() => openFloorDialog("edit")}
                  onRemove={handleRemoveFloor}
                  getOptionLabel={(floor) => floor.name}
                  renderSelectedInfo={(floor) =>
                    floor ? (
                      <div className="mt-4 rounded-2xl bg-[#F8FBF8] px-4 py-4 text-sm text-[#1D2635]">
                        <p className="font-semibold text-[#0B8C00]">Departments</p>
                        <p>{floor.departments.length}</p>
                      </div>
                    ) : null
                  }
                />

                <HierarchySection
                  title="Department"
                  description="Link rooms to a specific department."
                  items={selectedFloor?.departments ?? []}
                  selectedId={selection.departmentId}
                  disabled={!selectedFloor}
                  onSelect={(id) => setSelectionAtLevel("department", id)}
                  onAdd={() => openDepartmentDialog("add")}
                  onEdit={() => openDepartmentDialog("edit")}
                  onRemove={handleRemoveDepartment}
                  getOptionLabel={(department) => `${department.name} (${department.type})`}
                  renderSelectedInfo={(department) =>
                    department ? (
                      <div className="mt-4 rounded-2xl bg-[#F8FBF8] px-4 py-4 text-sm text-[#1D2635]">
                        <p className="font-semibold text-[#0B8C00]">Rooms</p>
                        <p>{department.rooms.length}</p>
                      </div>
                    ) : null
                  }
                />

                <HierarchySection
                  title="Room"
                  description="Configure room categories and their details."
                  items={selectedDepartment?.rooms ?? []}
                  selectedId={selection.roomId}
                  disabled={!selectedDepartment}
                  onSelect={(id) => setSelectionAtLevel("room", id)}
                  onAdd={() => openRoomDialog("add")}
                  onEdit={() => openRoomDialog("edit")}
                  onRemove={handleRemoveRoom}
                  getOptionLabel={(room) => {
                    const typeLabel =
                      ROOM_TYPES.find((type) => type.value === room.roomType)?.label ?? "Room";
                    return `${room.name} · ${typeLabel}`;
                  }}
                  renderSelectedInfo={(room) =>
                    room ? (
                      <div className="mt-4 rounded-2xl bg-[#F8FBF8] px-4 py-4 text-sm text-[#1D2635]">
                        <p className="font-semibold text-[#0B8C00]">Room Details</p>
                        <p>{room.details.length}</p>
                        {room.details.length === 0 ? (
                          <p className="mt-2 text-xs text-[#7A8577]">
                            No detail configurations yet. Add detail to capture specific room
                            attributes.
                          </p>
                        ) : null}
                      </div>
                    ) : null
                  }
                />

                <HierarchySection
                  title="Room Type Details"
                  description="Add context-specific detail (e.g., washroom style, private room configuration)."
                  items={selectedRoom?.details ?? []}
                  selectedId={selection.detailId}
                  disabled={!selectedRoom}
                  onSelect={(id) => setSelectionAtLevel("detail", id)}
                  onAdd={() => openDetailDialog("add")}
                  onEdit={() => openDetailDialog("edit")}
                  onRemove={handleRemoveDetail}
                  getOptionLabel={(detail) => detail.name}
                  renderSelectedInfo={(detail) =>
                    detail ? (
                      <div className="mt-4 rounded-2xl bg-[#F8FBF8] px-4 py-4 text-sm text-[#1D2635]">
                        <p className="font-semibold text-[#0B8C00]">Detail Summary</p>
                        {renderDetailAttributes(detail)}
                      </div>
                    ) : selectedRoom && determineDetailType(selectedRoom.roomType) !== "default" ? (
                      <div className="mt-4 rounded-2xl bg-[#FDF8F2] px-4 py-4 text-sm text-[#D17C2F]">
                        Specific detail configuration required for this room type.
                      </div>
                    ) : null
                  }
                />
              </div>

              <aside className="space-y-4">
                <div className="rounded-3xl border border-[#E1E8E1] bg-white p-6 shadow-[0px_24px_60px_rgba(47,72,61,0.08)]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-[#1D2635]">Structure Overview</h3>
                      <p className="mt-1 text-sm text-[#586270]">
                        Review every building, block, floor, department, and room within the selected
                        hospital.
                      </p>
                    </div>
                    {viewMode ? (
                      <Button variant="outline" size="small" onClick={() => setViewMode(false)}>
                        Back to Editing
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="small"
                        onClick={() => setViewMode(true)}
                        disabled={!canViewStructure}
                      >
                        👁️ View Structure
                      </Button>
                    )}
                  </div>

                  {viewMode ? (
                    selectedHospital ? (
                      <div className="mt-6 space-y-5">
                        <div className="rounded-2xl bg-[#F8FBF8] px-4 py-4">
                          <p className="text-base font-semibold text-[#1D2635]">
                            {selectedHospital.name}
                          </p>
                          <p className="mt-1 text-sm text-[#586270]">
                            {selectedHospital.location || "Location not specified"}
                          </p>
                          <p className="mt-2 text-xs text-[#7A8577]">
                            {selectedHospital.buildings.length === 1
                              ? "1 building"
                              : `${selectedHospital.buildings.length} buildings`}
                          </p>
                            </div>

                        {selectedHospital.buildings.length > 0 ? (
                          <div className="space-y-4 border-l-2 border-[#D4DDD4] pl-5">
                            {renderBuildingNodes(selectedHospital.buildings)}
                          </div>
                        ) : (
                          <p className="rounded-2xl bg-[#F8FBF8] px-4 py-3 text-sm text-[#586270]">
                            No buildings added yet. Use the Add action in the Building section to start
                            mapping the structure.
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-6 rounded-2xl bg-[#F8FBF8] px-4 py-4 text-sm text-[#586270]">
                        Select a hospital from the left panel to view its complete structure.
                      </p>
                    )
                  ) : (
                    <p className="mt-6 rounded-2xl bg-[#F8FBF8] px-4 py-4 text-sm text-[#586270]">
                      Click “View Structure” after choosing a hospital to see every building, block,
                      floor, department, room, and room detail in a nested hierarchy.
                    </p>
                  )}
                </div>

                {selectedRoom && selectedRoom.details.length > 0 ? (
                  <div className="rounded-3xl border border-[#E1E8E1] bg-white p-6 shadow-[0px_24px_60px_rgba(47,72,61,0.08)]">
                    <h3 className="text-lg font-semibold text-[#1D2635]">Available Details</h3>
                    <div className="mt-4 space-y-3">
                      {selectedRoom.details.map((detail) => (
                        <button
                          key={detail.id}
                          type="button"
                          onClick={() => setSelectionAtLevel("detail", detail.id)}
                          className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${
                            selection.detailId === detail.id
                              ? "border-[#0B8C00] bg-[#F2F8F2] text-[#0B8C00]"
                              : "border-[#E1E8E1] bg-[#F8FBF8] text-[#1D2635] hover:border-[#0B8C00]/40"
                          }`}
                        >
                          <p className="font-semibold">{detail.name}</p>
                          {renderDetailAttributes(detail)}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </aside>
            </div>
          </div>
          <Dialog open={dialogState.open} onClose={closeDialog} title={dialogTitle} width={620}>
            <form onSubmit={handleDialogSubmit} className="space-y-6">
              {renderDialogFields()}
              <div className="flex items-center justify-end gap-3">
                <Button type="button" variant="ghost" size="small" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button type="submit" size="small">
                  {dialogState.mode === "add" ? "Save" : "Update"}
                </Button>
              </div>
            </form>
          </Dialog>
        </>
      )}
      <Dialog
        open={customDataDialog.open}
        onClose={closeCustomElementDataDialog}
        title={
          customDataDialog.mode === "add"
            ? `Add ${activeCustomDataElement?.label ?? "Entry"}`
            : `Edit ${activeCustomDataElement?.label ?? "Entry"}`
        }
        width={600}
      >
        {activeCustomDataElement ? (
          <form onSubmit={handleCustomElementDataSubmit} className="space-y-6">
            {activeCustomDataElement.fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-[#7A8577]">
                  {field.label}
                </label>
                {field.type === "text" ? (
                  <input
                    type="text"
                    className="w-full rounded-2xl border border-[#D4DDD4] px-4 py-3 text-sm text-[#1D2635] focus:border-[#0B8C00] focus:outline-none focus:ring-4 focus:ring-[#0B8C00]/10"
                    placeholder={field.placeholder ?? `Enter ${field.label}`}
                    value={customDataFormValues[field.id] ?? ""}
                    onChange={(event) => updateCustomDataFormValue(field.id, event.target.value)}
                  />
                ) : field.type === "select" ? (
                  <select
                    className="w-full rounded-2xl border border-[#D4DDD4] bg-white px-4 py-3 text-sm text-[#1D2635] focus:border-[#0B8C00] focus:outline-none focus:ring-4 focus:ring-[#0B8C00]/10"
                    value={customDataFormValues[field.id] ?? ""}
                    onChange={(event) => updateCustomDataFormValue(field.id, event.target.value)}
                  >
                    <option value="">Select {field.label}</option>
                    {(field.options ?? []).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex flex-wrap gap-3 rounded-2xl border border-[#D4DDD4] bg-white px-4 py-3">
                    {(field.options ?? []).map((option) => (
                      <label key={option} className="flex items-center gap-2 text-sm text-[#1D2635]">
                        <input
                          type="radio"
                          name={field.id}
                          value={option}
                          checked={customDataFormValues[field.id] === option}
                          onChange={(event) => updateCustomDataFormValue(field.id, event.target.value)}
                          className="h-4 w-4 text-[#0B8C00] focus:ring-[#0B8C00]"
                        />
                        {option}
                      </label>
                    ))}
                    {(field.options ?? []).length === 0 ? (
                      <p className="text-xs text-[#D17C2F]">No options configured for this field.</p>
                    ) : null}
                  </div>
                )}
                {field.helperText ? (
                  <p className="text-xs text-[#7A8577]">{field.helperText}</p>
                ) : null}
              </div>
            ))}
            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                size="small"
                onClick={closeCustomElementDataDialog}
              >
                Cancel
              </Button>
              <Button type="submit" size="small">
                {customDataDialog.mode === "add" ? "Save" : "Update"}
              </Button>
            </div>
          </form>
        ) : null}
      </Dialog>

      <Dialog
        open={customElementDialog.open}
        onClose={closeCustomElementDialog}
        title={
          customElementDialog.editId ? "Edit Custom Hierarchy Element" : "Add Custom Hierarchy Element"
        }
        width={780}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            saveCustomElement();
          }}
          className="space-y-6"
        >
          <div className="grid gap-6 md:grid-cols-[220px,1fr]">
            <aside>
              <h4 className="text-sm font-semibold text-[#1D2635]">Field Palette</h4>
              <p className="mt-1 text-xs text-[#586270]">
                Drag or click a field type to add it to your custom element.
              </p>
              <div className="mt-4 space-y-3">
                {FIELD_PALETTE.map((type) => (
                  <button
                    key={type}
                    type="button"
                    draggable
                    onDragStart={(event) => handleFieldPaletteDragStart(event, type)}
                    onClick={() => addFieldToDraft(type)}
                    className="w-full rounded-2xl border border-[#D4DDD4] bg-[#F8FBF8] px-4 py-3 text-left text-sm font-medium text-[#1D2635] transition hover:border-[#0B8C00] hover:bg-[#F2F8F2]"
                  >
                    <div className="flex items-center justify-between">
                      <span>{FIELD_TYPE_LABELS[type]}</span>
                      <span className="text-xs font-semibold text-[#7A8577]">Drag or click</span>
                    </div>
                    <p className="mt-1 text-xs text-[#586270]">
                      {type === "text"
                        ? "Single input for capturing free-form text."
                        : type === "select"
                          ? "Dropdown with configurable choices."
                          : "Radio buttons for selecting one option."}
                    </p>
                  </button>
                ))}
              </div>
            </aside>

            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-[#7A8577]">
                    Element Name
                  </label>
                  <input
                    type="text"
                    className="mt-2 w-full rounded-2xl border border-[#D4DDD4] px-4 py-3 text-sm text-[#1D2635] focus:border-[#0B8C00] focus:outline-none focus:ring-4 focus:ring-[#0B8C00]/10"
                    placeholder="e.g., Therapy Wing Review"
                    value={customElementDraft.label}
                    onChange={(event) =>
                      setCustomElementDraft((prev) => ({ ...prev, label: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-[#7A8577]">
                    Short Description
                  </label>
                  <textarea
                    className="mt-2 w-full rounded-2xl border border-[#D4DDD4] px-4 py-3 text-sm text-[#1D2635] focus:border-[#0B8C00] focus:outline-none focus:ring-4 focus:ring-[#0B8C00]/10"
                    rows={3}
                    placeholder="Explain what this step captures."
                    value={customElementDraft.description}
                    onChange={(event) =>
                      setCustomElementDraft((prev) => ({ ...prev, description: event.target.value }))
                    }
                  />
                </div>
              </div>

              <div
                className="min-h-[220px] rounded-3xl border-2 border-dashed border-[#0B8C00]/30 bg-[#F8FBF8] p-5"
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "copy";
                }}
                onDrop={handleFieldDropOnDraft}
              >
                {customElementDraft.fields.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-[#586270]">
                    <span className="text-base font-semibold text-[#1D2635]">
                      Build your custom form
                    </span>
                    <span>Drag a field type here, or click from the left panel.</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {customElementDraft.fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="rounded-2xl border border-[#D4DDD4] bg-white px-5 py-5 text-sm text-[#1D2635] shadow-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-[#0B8C00]">
                            {FIELD_TYPE_LABELS[field.type]}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => moveDraftField(field.id, "up")}
                              disabled={index === 0}
                              className={`rounded-full bg-white px-3 py-1 text-xs font-semibold shadow ${
                                index === 0
                                  ? "cursor-not-allowed text-[#AEB8AE]"
                                  : "text-[#0B8C00] hover:bg-[#F2F8F2]"
                              }`}
                            >
                              Up
                            </button>
                            <button
                              type="button"
                              onClick={() => moveDraftField(field.id, "down")}
                              disabled={index === customElementDraft.fields.length - 1}
                              className={`rounded-full bg-white px-3 py-1 text-xs font-semibold shadow ${
                                index === customElementDraft.fields.length - 1
                                  ? "cursor-not-allowed text-[#AEB8AE]"
                                  : "text-[#0B8C00] hover:bg-[#F2F8F2]"
                              }`}
                            >
                              Down
                            </button>
                            <button
                              type="button"
                              onClick={() => removeDraftField(field.id)}
                              className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#D14D4F] shadow hover:bg-[#FDF0F0]"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 space-y-3">
                          <div>
                            <label className="text-xs font-semibold uppercase tracking-wide text-[#7A8577]">
                              Field Label
                            </label>
                            <input
                              type="text"
                              className="mt-2 w-full rounded-2xl border border-[#D4DDD4] px-4 py-3 text-sm text-[#1D2635] focus:border-[#0B8C00] focus:outline-none focus:ring-4 focus:ring-[#0B8C00]/10"
                              placeholder="e.g., Number of Therapy Beds"
                              value={field.label}
                              onChange={(event) =>
                                updateDraftField(field.id, { label: event.target.value })
                              }
                            />
                          </div>

                          {field.type === "text" ? (
                            <div>
                              <label className="text-xs font-semibold uppercase tracking-wide text-[#7A8577]">
                                Placeholder (optional)
                              </label>
                              <input
                                type="text"
                                className="mt-2 w-full rounded-2xl border border-[#D4DDD4] px-4 py-3 text-sm text-[#1D2635] focus:border-[#0B8C00] focus:outline-none focus:ring-4 focus:ring-[#0B8C00]/10"
                                placeholder="Enter placeholder text"
                                value={field.placeholder ?? ""}
                                onChange={(event) =>
                                  updateDraftField(field.id, { placeholder: event.target.value })
                                }
                              />
                            </div>
                          ) : (
                            <div>
                              <label className="text-xs font-semibold uppercase tracking-wide text-[#7A8577]">
                                Options (comma separated)
                              </label>
                              <textarea
                                className="mt-2 w-full rounded-2xl border border-[#D4DDD4] px-4 py-3 text-sm text-[#1D2635] focus:border-[#0B8C00] focus:outline-none focus:ring-4 focus:ring-[#0B8C00]/10"
                                rows={3}
                                placeholder="e.g., Option 1, Option 2"
                                value={field.optionsText ?? ""}
                                onChange={(event) =>
                                  updateDraftField(field.id, { optionsText: event.target.value })
                                }
                              />
                            </div>
                          )}

                          <div>
                            <label className="text-xs font-semibold uppercase tracking-wide text-[#7A8577]">
                              Helper Text (optional)
                            </label>
                            <input
                              type="text"
                              className="mt-2 w-full rounded-2xl border border-[#D4DDD4] px-4 py-3 text-sm text-[#1D2635] focus:border-[#0B8C00] focus:outline-none focus:ring-4 focus:ring-[#0B8C00]/10"
                              placeholder="Hint shown below the field"
                              value={field.helperText ?? ""}
                              onChange={(event) =>
                                updateDraftField(field.id, { helperText: event.target.value })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" size="small" onClick={closeCustomElementDialog}>
              Cancel
            </Button>
            <Button type="submit" size="small" disabled={!customElementDraftValid}>
              {customElementDialog.editId ? "Update Element" : "Save Element"}
            </Button>
          </div>
        </form>
      </Dialog>
    </AppShell>
  );
}

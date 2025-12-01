"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type SizeValue = number | string;

export type SelectOption = {
  label: string;
  value: string;
  description?: string;
  icon?: ReactNode;
};

export type FormSelectFieldProps = {
  label: string;
  options: SelectOption[];
  mode?: "single" | "multiple";
  value?: string | string[] | null;
  defaultValue?: string | string[];
  onChange?: (value: string | string[], selection: SelectOption | SelectOption[] | null) => void;
  width?: SizeValue;
  height?: SizeValue;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  background?: "normal" | "white";
};

const normalizeSize = (value: SizeValue | undefined) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "number") {
    return `${value}px`;
  }

  return value;
};

const arrowIcon = (
  <svg
    className="h-5 w-5 text-[#7B8089]"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M5 7.6582L10 12.6582L15 7.6582"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CheckIcon = () => (
  <svg width="12" height="9" viewBox="0 0 12 9" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M10.6666 1.66675L4.24992 8.08341L1.33325 5.16675"
      stroke="#0B8C00"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const RadioTick = () => (
  <span className="absolute inset-1 rounded-full bg-[#0B8C00]" />
);

export const FormSelectField = ({
  label,
  options,
  width,
  height = 44,
  placeholder = "Select option",
  searchPlaceholder = "Type here",
  disabled = false,
  background = "normal",
  ...props
}: FormSelectFieldProps) => {
  const isMultiple = props.mode === "multiple";
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<{
    top: number;
    left: number;
    width: number;
    placement: "bottom" | "top";
    maxHeight: number;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const initialSingleValue: string | null =
    !isMultiple
      ? typeof props.value === "string" || props.value === null
        ? (props.value ?? null)
        : typeof props.defaultValue === "string" || props.defaultValue === null
          ? (props.defaultValue ?? null)
          : null
      : null;

  const initialMultipleValue: string[] =
    isMultiple
      ? Array.isArray(props.value)
        ? props.value
        : Array.isArray(props.defaultValue)
          ? props.defaultValue
          : []
      : [];

  const [internalSingle, setInternalSingle] = useState<string | null>(initialSingleValue);
  const [internalMultiple, setInternalMultiple] = useState<string[]>(initialMultipleValue);

  const selectedValue = useMemo(() => {
    if (isMultiple) {
      if (Array.isArray(props.value)) {
        return props.value;
      }
      return internalMultiple;
    }
    if (typeof props.value === "string" || props.value === null) {
      return props.value;
    }
    return internalSingle ?? null;
  }, [isMultiple, props.value, internalMultiple, internalSingle]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) {
      return options;
    }

    const query = searchTerm.toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(query));
  }, [options, searchTerm]);

  const updateDropdownPosition = useCallback(() => {
    if (!containerRef.current) {
      return;
    }

    const triggerRect = containerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const margin = 12;
    const offset = 6;
    const widthValue = triggerRect.width;
    const spaceBelow = viewportHeight - triggerRect.bottom - margin;
    const spaceAbove = triggerRect.top - margin;

    let placement: "bottom" | "top" = "bottom";

    if (spaceBelow < 220 && spaceAbove > spaceBelow) {
      placement = "top";
    }

    const availableSpace = placement === "bottom" ? spaceBelow : spaceAbove;
    const maxHeight = Math.min(360, Math.max(220, availableSpace));

    let left = triggerRect.left;
    if (left + widthValue + margin > viewportWidth) {
      left = viewportWidth - widthValue - margin;
    }
    left = Math.max(left, margin);

    const top =
      placement === "bottom"
        ? triggerRect.bottom + offset
        : triggerRect.top - offset;

    setDropdownStyle({
      top,
      left,
      width: widthValue,
      placement,
      maxHeight,
    });
  }, []);

  useLayoutEffect(() => {
    if (open) {
      updateDropdownPosition();
    }
  }, [open, updateDropdownPosition, filteredOptions.length]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        panelRef.current &&
        !panelRef.current.contains(target)
      ) {
        setOpen(false);
        setSearchTerm("");
      }
    };

    const handleWindowChange = () => {
      updateDropdownPosition();
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", handleWindowChange);
    window.addEventListener("scroll", handleWindowChange, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", handleWindowChange);
      window.removeEventListener("scroll", handleWindowChange, true);
    };
  }, [open, updateDropdownPosition]);

  useEffect(() => {
    if (listRef.current && open) {
      listRef.current.scrollTop = 0;
    }
  }, [open, searchTerm]);

  const toggleOpen = useCallback(() => {
    if (disabled) {
      return;
    }

    setOpen((prev) => {
      const next = !prev;
      if (!next) {
        setSearchTerm("");
      }
      return next;
    });
  }, [disabled]);

  const handleSingleSelect = useCallback(
    (value: string) => {
      const option = options.find((item) => item.value === value) ?? null;

      if (props.value === undefined || !(typeof props.value === "string" || props.value === null)) {
        setInternalSingle(value);
      }

      props.onChange?.(value, option);
      setOpen(false);
      setSearchTerm("");
    },
    [options, props]
  );

  const handleMultiToggle = useCallback(
    (value: string) => {
      const currentValues = Array.isArray(props.value) ? props.value : internalMultiple;
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];

      if (!Array.isArray(props.value)) {
        setInternalMultiple(nextValues);
      }

      const selectedOptions = options.filter((item) => nextValues.includes(item.value));
      props.onChange?.(nextValues, selectedOptions);
    },
    [internalMultiple, options, props]
  );

  const handleClearAll = useCallback(() => {
    if (!Array.isArray(props.value)) {
      setInternalMultiple([]);
    }

    props.onChange?.([], []);
  }, [props]);

  const selectedLabel = useMemo(() => {
    if (isMultiple) {
      const values = (selectedValue as string[]) ?? [];
      const selectedOptions = options.filter((opt) => values.includes(opt.value));
      if (!selectedOptions.length) {
        return placeholder;
      }
      return selectedOptions.map((opt) => opt.label).join(", ");
    }

    const value = selectedValue as string | null;
    if (!value) {
      return placeholder;
    }

    return options.find((opt) => opt.value === value)?.label ?? placeholder;
  }, [isMultiple, options, placeholder, selectedValue]);

  const wrapperStyles = useMemo(() => {
    return {
      width: normalizeSize(width),
    } as React.CSSProperties;
  }, [width]);

  const triggerStyles = useMemo(() => {
    return {
      height: normalizeSize(height),
    } as React.CSSProperties;
  }, [height]);

  const selectedCount = isMultiple ? ((selectedValue as string[]) ?? []).length : 0;
  const allValues = useMemo(() => options.map((opt) => opt.value), [options]);
  const areAllSelected = useMemo(() => {
    if (!isMultiple) {
      return false;
    }
    const values = (selectedValue as string[]) ?? [];
    return allValues.length > 0 && allValues.every((value) => values.includes(value));
  }, [allValues, isMultiple, selectedValue]);

  const handleSelectAllToggle = useCallback(() => {
    if (!isMultiple) {
      return;
    }
    const currentValues = Array.isArray(props.value) ? props.value : internalMultiple;
    const shouldSelect = !(
      allValues.length > 0 && allValues.every((value) => currentValues.includes(value))
    );
    const nextValues = shouldSelect ? allValues : [];

    if (!Array.isArray(props.value)) {
      setInternalMultiple(nextValues);
    }

    const selectedOptions = options.filter((item) => nextValues.includes(item.value));
    props.onChange?.(nextValues, selectedOptions);
  }, [allValues, internalMultiple, isMultiple, options, props]);

  const dropdownContent =
    mounted && open && dropdownStyle
      ? createPortal(
          <div
            ref={panelRef}
            className="z-[1000] flex max-h-[calc(100vh-96px)] flex-col rounded-[16px] border border-[#E6E8EC] bg-white shadow-[0px_28px_60px_rgba(47,72,61,0.16)]"
            style={{
              position: "fixed",
              top: dropdownStyle.top,
              left: dropdownStyle.left,
              width: dropdownStyle.width,
              transform:
                dropdownStyle.placement === "top" ? "translateY(-100%)" : "none",
              maxHeight: dropdownStyle.maxHeight,
            }}
          >
            {isMultiple ? (
              <div className="flex flex-shrink-0 items-center justify-between border-b border-[#F2F4F7] px-6 py-3 text-sm font-medium text-[#434956]">
                <span>{selectedCount} selected</span>
                <button
                  type="button"
                  className="text-[#0B8C00] hover:underline"
                  onClick={handleClearAll}
                >
                  Clear All
                </button>
              </div>
            ) : null}

            <div className="flex flex-1 flex-col overflow-hidden px-6 py-4">
              <div className="mb-3 space-y-2">
                <span className="text-sm  text-[#262D3B]">
                  Search
                </span>
                <label className="group mt-[5px] flex items-center gap-3 rounded-lg border border-[#D0D5DD] bg-white px-3 py-2 shadow-[0px_1px_2px_rgba(16,24,40,0.05)] transition-all duration-200 focus-within:border-[#0B8C00] focus-within:ring-2 focus-within:ring-[#0B8C00]/10">
                  <Image
                    src="/icons/searchdarkIcon.svg"
                    alt=""
                    width={16}
                    height={16}
                    className="h-4 w-4 shrink-0 text-[#98A2B3]"
                  />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full border-none bg-transparent text-sm font-medium text-[#262D3B] placeholder:text-[#98A2B3] focus:outline-none"
                  />
                </label>
              </div>

              <div
                ref={listRef}
                className="custom-scroll flex-1 overflow-y-auto pr-4"
              >
                <div className="flex flex-col gap-0">
                  {isMultiple ? (
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-[10px] px-4 py-3 text-sm font-medium text-[#434956] transition-colors hover:bg-[#F7FAF7]"
                      onClick={handleSelectAllToggle}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={`relative flex h-4 w-4 items-center justify-center rounded-[4px] border bg-white ${
                            areAllSelected ? "border-[#0B8C00]" : "border-[#D0D5DD]"
                          }`}
                        >
                          {areAllSelected ? <CheckIcon /> : null}
                        </span>
                        <span className="text-left">Select All</span>
                      </span>
                    </button>
                  ) : null}
                  {filteredOptions.length === 0 ? (
                    <div className="py-6 text-center text-sm text-[#9CA3AF]">
                      No results found
                    </div>
                  ) : (
                    filteredOptions.map((option) => {
                      const isSelected = isMultiple
                        ? ((selectedValue as string[]) ?? []).includes(option.value)
                        : (selectedValue as string | null) === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          className="flex w-full items-center justify-between rounded-[10px] px-4 py-3 text-sm font-medium text-[#434956] transition-colors hover:bg-[#F7FAF7]"
                          onClick={() =>
                            isMultiple
                              ? handleMultiToggle(option.value)
                              : handleSingleSelect(option.value)
                          }
                        >
                          <span className="flex items-center gap-3">
                            <span
                              className={`relative flex items-center justify-center ${
                                isMultiple
                                  ? `h-4 w-4 rounded-[4px] border bg-white ${
                                      isSelected ? "border-[#0B8C00]" : "border-[#D0D5DD]"
                                    }`
                                  : `h-5 w-5 rounded-full border ${
                                      isSelected ? "border-[#0B8C00]" : "border-[#B8BFC9]"
                                    } bg-white`
                              }`}
                            >
                              {isMultiple ? (
                                isSelected ? (
                                  <CheckIcon />
                                ) : null
                              ) : isSelected ? (
                                <RadioTick />
                              ) : null}
                            </span>
                            <span className="text-left">{option.label}</span>
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div
      ref={containerRef}
      className="relative inline-flex w-full flex-col gap-2"
      style={wrapperStyles}
    >
      <span className="pointer-events-none absolute left-6 top-0 -translate-y-1/2 rounded-full bg-white px-2 text-xs font-medium text-[#7B8089]">
        {label}
      </span>

      <button
        type="button"
        className={`flex w-full items-center justify-between rounded-[32px] border border-[#EBECED] ${background === "white" ? "bg-white" : "bg-[#0B8C000D]"} px-6 text-left text-sm font-medium text-[#262D3B] transition-colors focus:border-[#0B8C00] focus:outline-none focus:ring-2 focus:ring-[#0B8C00]/20 disabled:cursor-not-allowed ${open ? "border-[#0B8C00]" : ""}`}
        onClick={toggleOpen}
        style={triggerStyles}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
      >
        <span className={`flex-1 truncate ${(!isMultiple && !(selectedValue as string | null)) || (isMultiple && !selectedCount) ? "text-[#9CA3AF]" : "text-[#262D3B]"}`} title={selectedLabel}>
          {selectedLabel}
        </span>
        <span className={`ml-4 transition-transform duration-200 ${open ? "rotate-180" : "rotate-0"}`}>
          {arrowIcon}
        </span>
      </button>

      {dropdownContent}
    </div>
  );
};



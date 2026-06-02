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
  forwardRef,
  type ReactNode,
} from "react";

type SizeValue = number | string;

export type SelectOption = {
  label: string;
  value: string;
  description?: string;
  icon?: ReactNode;
  /** When true, the option cannot be toggled (multi-select) or chosen (single). */
  disabled?: boolean;
};

export type FormSelectFieldProps = {
  label: string;
  options: SelectOption[];
  mode?: "single" | "multiple";
  value?: string | string[] | null;
  defaultValue?: string | string[];
  onChange?: (value: string | string[], selection: SelectOption | SelectOption[] | null) => void;
  onBlur?: () => void;
  /** Fires when the dropdown opens (click, keyboard, etc.). */
  onOpen?: () => void;
  width?: SizeValue;
  dropdownWidth?: SizeValue; // Separate width for dropdown panel (if not provided, uses input width)
  height?: SizeValue;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  background?: "normal" | "white";
  error?: string;
  emptyMessage?: string; // Custom message when no options are available
  hideLabel?: boolean; // When true, do not render label (e.g. for compact header use)
  /** Renders beside the floating label (e.g. info icon with tooltip). */
  labelSuffix?: ReactNode;
  className?: string;
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

const CheckIconWhite = () => (
  <svg width="12" height="9" viewBox="0 0 12 9" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M10.6666 1.66675L4.24992 8.08341L1.33325 5.16675"
      stroke="white"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const RadioTick = () => (
  <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0B8C00] flex-shrink-0" />
);

export const FormSelectField = forwardRef<HTMLDivElement, FormSelectFieldProps>(
  (
    {
      label,
      options,
      width,
      dropdownWidth,
      height = 44,
      placeholder = "Select option",
      searchPlaceholder = "Type and search",
      disabled = false,
      background = "normal",
      error,
      emptyMessage = "No results found",
      hideLabel = false,
      labelSuffix,
      className="",
      onBlur,
      onOpen,
      ...props
    }: FormSelectFieldProps,
    ref
  ) => {
  const isMultiple = props.mode === "multiple";
  const Check_Cursor_pointer = className ? className : "";
  
  const labelIsRequired = label.includes("*");
  const labelTextWithoutRequired = useMemo(() => {
    if (!labelIsRequired) return label;
    return label.split("*")[0].trimEnd();
  }, [label, labelIsRequired]);

  const renderLabel = useMemo(() => {
    if (labelIsRequired) {
      const parts = label.split("*");
      return (
        <>
          {parts[0]}
          <span className="text-[#F6776E]">*</span>
          {parts.slice(1).join("*")}
        </>
      );
    }
    return label;
  }, [label, labelIsRequired]);

  const requiredAsterisk = (
    <span className="pointer-events-none text-[#F6776E]">*</span>
  );
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [keyboardSearch, setKeyboardSearch] = useState("");
  const [keyboardSearchTimeout, setKeyboardSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
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
    const searchQuery = searchTerm.trim() || keyboardSearch.trim();
    if (!searchQuery) {
      return options;
    }

    const query = searchQuery.toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(query));
  }, [options, searchTerm, keyboardSearch]);

  const updateDropdownPosition = useCallback(() => {
    if (!containerRef.current) {
      return;
    }

    const triggerRect = containerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const margin = 12;
    const offset = 6;
    // Use dropdownWidth if provided, otherwise use input field width
    const widthValue = dropdownWidth 
      ? (typeof dropdownWidth === "number" ? dropdownWidth : parseFloat(String(dropdownWidth)))
      : triggerRect.width;
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
  }, [dropdownWidth]);

  useLayoutEffect(() => {
    if (open) {
      updateDropdownPosition();
      // Focus search input when dropdown opens
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
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
        setKeyboardSearch("");
        setHighlightedIndex(-1);
        onBlur?.(); // Call onBlur when dropdown closes
      }
    };

    const handleFocusChange = (event: FocusEvent) => {
      // Check if focus is moving to an element outside our component
      const target = event.target as Node | null;
      if (
        target &&
        containerRef.current &&
        !containerRef.current.contains(target) &&
        panelRef.current &&
        !panelRef.current.contains(target)
      ) {
        // Focus moved outside, close dropdown
        setOpen(false);
        setSearchTerm("");
        setKeyboardSearch("");
        setHighlightedIndex(-1);
        onBlur?.();
      }
    };

    const handleWindowChange = () => {
      updateDropdownPosition();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("focusin", handleFocusChange);
    window.addEventListener("resize", handleWindowChange);
    window.addEventListener("scroll", handleWindowChange, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("focusin", handleFocusChange);
      window.removeEventListener("resize", handleWindowChange);
      window.removeEventListener("scroll", handleWindowChange, true);
    };
  }, [open, updateDropdownPosition, onBlur]);

  useEffect(() => {
    if (listRef.current && open) {
      listRef.current.scrollTop = 0;
    }
  }, [open, searchTerm]);

  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      onOpen?.();
    }
    prevOpenRef.current = open;
  }, [open, onOpen]);

  // Clear keyboard search after timeout
  useEffect(() => {
    if (keyboardSearchTimeout) {
      clearTimeout(keyboardSearchTimeout);
    }
    if (keyboardSearch) {
      const timeout = setTimeout(() => {
        setKeyboardSearch("");
      }, 1000); // Clear after 1 second of no typing
      setKeyboardSearchTimeout(timeout);
    }
    return () => {
      if (keyboardSearchTimeout) {
        clearTimeout(keyboardSearchTimeout);
      }
    };
  }, [keyboardSearch]);

    const toggleOpen = useCallback(() => {
    if (disabled) {
      return;
    }

    setOpen((prev) => {
      const next = !prev;
      if (!next) {
        // When closing, call onBlur to trigger validation
        setSearchTerm("");
        setKeyboardSearch("");
        setHighlightedIndex(-1);
        // Call onBlur when dropdown closes (even without selection)
        setTimeout(() => {
          onBlur?.();
        }, 0);
      } else {
        // Reset highlighted index when opening
        setHighlightedIndex(-1);
      }
      return next;
    });
  }, [disabled, onBlur]);

  const handleSingleSelect = useCallback(
    (value: string) => {
      const option = options.find((item) => String(item.value) === String(value)) ?? null;
      if (option?.disabled) {
        return;
      }

      if (props.value === undefined || !(typeof props.value === "string" || props.value === null)) {
        setInternalSingle(value);
      }

      props.onChange?.(value, option);
      setOpen(false);
      setSearchTerm("");
      setKeyboardSearch("");
      setHighlightedIndex(-1);
      
      // Delay onBlur to ensure value change is processed first
      setTimeout(() => {
        onBlur?.(); // Call onBlur when dropdown closes, after value is updated
      }, 0);
    },
    [options, props, onBlur]
  );

  const handleMultiToggle = useCallback(
    (value: string) => {
      const option = options.find((item) => String(item.value) === String(value));
      if (option?.disabled) {
        return;
      }
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

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    // Space key - open dropdown
    if (e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setSearchTerm("");
        setKeyboardSearch("");
      }
      return;
    }

    // Escape key - close dropdown
    if (e.key === "Escape") {
      if (open) {
        setOpen(false);
        setSearchTerm("");
        setKeyboardSearch("");
        onBlur?.(); // Call onBlur when dropdown closes
        setHighlightedIndex(-1);
      }
      return;
    }

    // Tab key - select matching/highlighted option if available, then move to next field
    if (e.key === "Tab") {
      // If field is disabled, manually skip to next enabled field
      if (disabled) {
        e.preventDefault();
        // Find next focusable field, skipping disabled select fields
        const form = buttonRef.current?.closest("form") || document.body;
        const allFocusable = Array.from(
          form.querySelectorAll<HTMLElement>(
            'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => {
          const rect = el.getBoundingClientRect();
          const isVisible = rect.width > 0 && rect.height > 0;
          const isInPortal = panelRef.current?.contains(el);
          // Skip disabled select fields (buttons with aria-haspopup="listbox" and disabled attribute)
          const isDisabledSelect = el.tagName === "BUTTON" && 
                                   el.getAttribute("aria-haspopup") === "listbox" && 
                                   el.hasAttribute("disabled");
          return isVisible && !isInPortal && !isDisabledSelect;
        });
        
        const currentIndex = allFocusable.findIndex(el => el === buttonRef.current);
        if (currentIndex >= 0) {
          const nextIndex = e.shiftKey ? currentIndex - 1 : currentIndex + 1;
          if (nextIndex >= 0 && nextIndex < allFocusable.length) {
            allFocusable[nextIndex]?.focus();
          }
        }
        return;
      }
      
      // Always call onBlur when Tab is pressed (whether dropdown is open or not)
      // This ensures validation runs when user tabs away without selecting
      setTimeout(() => {
        onBlur?.(); // Call onBlur when tabbing away
      }, 0);
      
      // If dropdown is open, close it
      if (open) {
        setOpen(false);
        setSearchTerm("");
        setKeyboardSearch("");
        setHighlightedIndex(-1);
      }
      
      // If there's a keyboard search or highlighted option, select it
      if (keyboardSearch || (open && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length)) {
        let optionToSelect: SelectOption | null = null;
        
        if (open && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          // Use highlighted option if dropdown is open
          optionToSelect = filteredOptions[highlightedIndex];
        } else if (keyboardSearch && filteredOptions.length > 0) {
          // Use first matching option from keyboard search
          optionToSelect = filteredOptions[0];
        }
        
        if (optionToSelect) {
          // Select the option
          if (isMultiple) {
            handleMultiToggle(optionToSelect.value);
          } else {
            handleSingleSelect(optionToSelect.value);
          }
          // Don't prevent default - let Tab proceed naturally to next field
          // The selection will happen before the focus moves
        }
      }
      // Let Tab proceed normally (either with or without selection)
      return;
    }

    // If dropdown is open, handle navigation
    if (open) {
      // Arrow keys - navigate options
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) => {
          const next = prev < filteredOptions.length - 1 ? prev + 1 : prev;
          // Scroll into view
          if (listRef.current && next >= 0) {
            setTimeout(() => {
              const optionElement = listRef.current?.children[0]?.children[next + (isMultiple ? 1 : 0)] as HTMLElement;
              if (optionElement) {
                optionElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
              }
            }, 0);
          }
          return next;
        });
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => {
          const next = prev > 0 ? prev - 1 : 0;
          // Scroll into view
          if (listRef.current && next >= 0) {
            setTimeout(() => {
              const optionElement = listRef.current?.children[0]?.children[next + (isMultiple ? 1 : 0)] as HTMLElement;
              if (optionElement) {
                optionElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
              }
            }, 0);
          }
          return next;
        });
        return;
      }

      // Enter key - select highlighted option
      if (e.key === "Enter") {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          const option = filteredOptions[highlightedIndex];
          if (isMultiple) {
            handleMultiToggle(option.value);
          } else {
            handleSingleSelect(option.value);
          }
        }
        return;
      }
    }

    // Backspace key - focus search input
    if (e.key === "Backspace") {
      // If dropdown is open and search input is already focused, don't handle backspace here
      // Let the search input handle it naturally
      if (open && document.activeElement === searchInputRef.current) {
        return; // Let the search input handle backspace normally
      }
      
      // If there's keyboard search, clear it and focus search input
      if (keyboardSearch) {
        e.preventDefault();
        const newSearch = keyboardSearch.slice(0, -1);
        setKeyboardSearch(newSearch);
        setSearchTerm(newSearch);
        
        // Open dropdown if closed
        if (!open) {
          setOpen(true);
        }
        
        // Focus search input with multiple attempts to ensure it works
        const focusSearchInput = () => {
          if (searchInputRef.current) {
            searchInputRef.current.focus();
            // Verify focus was successful, if not try again
            if (document.activeElement !== searchInputRef.current) {
              requestAnimationFrame(() => {
                searchInputRef.current?.focus();
              });
            }
          } else {
            // If ref is not ready, try again after a short delay
            setTimeout(focusSearchInput, 10);
          }
        };
        
        // Use requestAnimationFrame for better timing
        requestAnimationFrame(() => {
          focusSearchInput();
        });
      } else {
        // If no keyboard search, just open dropdown and focus search input
        if (!open) {
          e.preventDefault();
          setOpen(true);
          
          // Focus search input with multiple attempts to ensure it works
          const focusSearchInput = () => {
            if (searchInputRef.current) {
              searchInputRef.current.focus();
              // Verify focus was successful, if not try again
              if (document.activeElement !== searchInputRef.current) {
                requestAnimationFrame(() => {
                  searchInputRef.current?.focus();
                });
              }
            } else {
              // If ref is not ready, try again after a short delay
              setTimeout(focusSearchInput, 10);
            }
          };
          
          // Use requestAnimationFrame for better timing
          requestAnimationFrame(() => {
            focusSearchInput();
          });
        } else {
          // Dropdown is open but search input is not focused, focus it
          e.preventDefault();
          const focusSearchInput = () => {
            if (searchInputRef.current) {
              searchInputRef.current.focus();
              // Verify focus was successful, if not try again
              if (document.activeElement !== searchInputRef.current) {
                requestAnimationFrame(() => {
                  searchInputRef.current?.focus();
                });
              }
            } else {
              // If ref is not ready, try again after a short delay
              setTimeout(focusSearchInput, 10);
            }
          };
          
          requestAnimationFrame(() => {
            focusSearchInput();
          });
        }
      }
      return;
    }

    // Typing - build search string and filter
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const newSearch = keyboardSearch + e.key;
      setKeyboardSearch(newSearch);
      setSearchTerm(newSearch); // Also update search input for consistency
      
      // If dropdown is not open, open it
      if (!open) {
        setOpen(true);
      }
      
      // Ensure search input is focused when typing
      if (open && document.activeElement !== searchInputRef.current) {
        requestAnimationFrame(() => {
          searchInputRef.current?.focus();
        });
      }

      // Calculate filtered options with new search term immediately
      const query = newSearch.toLowerCase();
      const filtered = options.filter((option) => 
        option.label.toLowerCase().includes(query)
      );
      
      // Find first matching option that starts with the query
      const matchIndex = filtered.findIndex((option) =>
        option.label.toLowerCase().startsWith(query)
      );
      
      // Set highlighted index immediately
      if (matchIndex >= 0) {
        setHighlightedIndex(matchIndex);
        // Scroll into view after a brief delay to ensure DOM is updated
        setTimeout(() => {
          if (listRef.current && matchIndex >= 0) {
            const optionElement = listRef.current?.children[0]?.children[matchIndex + (isMultiple ? 1 : 0)] as HTMLElement;
            if (optionElement) {
              optionElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
            }
          }
        }, 10);
      } else if (filtered.length > 0) {
        // If no exact start match, highlight first filtered option
        setHighlightedIndex(0);
        // Scroll into view
        setTimeout(() => {
          if (listRef.current) {
            const optionElement = listRef.current?.children[0]?.children[0 + (isMultiple ? 1 : 0)] as HTMLElement;
            if (optionElement) {
              optionElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
            }
          }
        }, 10);
      } else {
        // No matches, reset highlight
        setHighlightedIndex(-1);
      }
    }
  }, [disabled, open, options, highlightedIndex, keyboardSearch, isMultiple, filteredOptions, handleSingleSelect, handleMultiToggle]);

  // Reset highlighted index when filtered options change
  useEffect(() => {
    if (open && filteredOptions.length > 0 && highlightedIndex < 0) {
      // Auto-highlight first option when dropdown opens
      setHighlightedIndex(0);
    }
  }, [open, filteredOptions.length, highlightedIndex]);

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

    const match = options.find((opt) => String(opt.value) === String(value));
    return match?.label ?? placeholder;
  }, [isMultiple, options, placeholder, selectedValue]);

  const wrapperStyles = useMemo(() => {
    if (width === undefined) {
      return {} as React.CSSProperties;
    }
    const w = normalizeSize(width);
    return {
      width: w,
      minWidth: w,
      flexShrink: 0,
    } as React.CSSProperties;
  }, [width]);

  const triggerStyles = useMemo(() => {
    return {
      height: normalizeSize(height),
    } as React.CSSProperties;
  }, [height]);

  const selectedCount = isMultiple ? ((selectedValue as string[]) ?? []).length : 0;
  const selectableValues = useMemo(
    () => options.filter((opt) => !opt.disabled).map((opt) => opt.value),
    [options]
  );
  const lockedValues = useMemo(
    () => options.filter((opt) => opt.disabled).map((opt) => opt.value),
    [options]
  );
  const areAllSelected = useMemo(() => {
    if (!isMultiple) {
      return false;
    }
    const values = (selectedValue as string[]) ?? [];
    return (
      selectableValues.length > 0 &&
      selectableValues.every((value) => values.includes(value))
    );
  }, [isMultiple, selectableValues, selectedValue]);

  const handleSelectAllToggle = useCallback(() => {
    if (!isMultiple) {
      return;
    }
    const currentValues = Array.isArray(props.value) ? props.value : internalMultiple;
    const allSelectableSelected =
      selectableValues.length > 0 &&
      selectableValues.every((value) => currentValues.includes(value));
    const nextValues = allSelectableSelected
      ? [...lockedValues]
      : [...new Set([...lockedValues, ...selectableValues])];

    if (!Array.isArray(props.value)) {
      setInternalMultiple(nextValues);
    }

    const selectedOptions = options.filter((item) => nextValues.includes(item.value));
    props.onChange?.(nextValues, selectedOptions);
  }, [internalMultiple, isMultiple, lockedValues, options, props, selectableValues]);

  const handleClearAll = useCallback(() => {
    if (!isMultiple) {
      return;
    }
    const nextValues = [...lockedValues];

    if (!Array.isArray(props.value)) {
      setInternalMultiple(nextValues);
    }

    const selectedOptions = options.filter((item) => nextValues.includes(item.value));
    props.onChange?.(nextValues, selectedOptions);
  }, [isMultiple, lockedValues, options, props]);

  const dropdownContent =
    mounted && open && dropdownStyle
      ? createPortal(
          <div
            ref={panelRef}
            className={`z-[1000] flex max-h-[calc(100vh-96px)] flex-col rounded-[16px] border border-[#E6E8EC] bg-white shadow-[0px_28px_60px_rgba(47,72,61,0.16)]`}
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

            <div className="flex flex-1 flex-col overflow-hidden px-4 py-4">
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
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(event) => {
                      const newValue = event.target.value;
                      setSearchTerm(newValue);
                      setKeyboardSearch(newValue); // Sync keyboard search
                      
                      // Calculate filtered options immediately (don't wait for memoized value)
                      const query = newValue.trim().toLowerCase();
                      const filtered = query
                        ? options.filter((option) => option.label.toLowerCase().includes(query))
                        : options;
                      
                      // Update highlighted index based on search
                      if (query) {
                        // Find first matching option that starts with the query
                        const matchIndex = filtered.findIndex((option) =>
                          option.label.toLowerCase().startsWith(query)
                        );
                        
                        if (matchIndex >= 0) {
                          setHighlightedIndex(matchIndex);
                          // Scroll into view after a brief delay to ensure DOM is updated
                          setTimeout(() => {
                            if (listRef.current && matchIndex >= 0) {
                              const optionElement = listRef.current?.children[0]?.children[matchIndex + (isMultiple ? 1 : 0)] as HTMLElement;
                              if (optionElement) {
                                optionElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
                              }
                            }
                          }, 10);
                        } else if (filtered.length > 0) {
                          // If no exact start match, highlight first filtered option
                          setHighlightedIndex(0);
                          setTimeout(() => {
                            if (listRef.current) {
                              const optionElement = listRef.current?.children[0]?.children[0 + (isMultiple ? 1 : 0)] as HTMLElement;
                              if (optionElement) {
                                optionElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
                              }
                            }
                          }, 10);
                        } else {
                          setHighlightedIndex(-1);
                        }
                      } else {
                        // Empty search, highlight first option
                        if (filtered.length > 0) {
                          setHighlightedIndex(0);
                        } else {
                          setHighlightedIndex(-1);
                        }
                      }
                    }}
                    onKeyDown={(e) => {
                      // Enter key - select highlighted option or first option if available
                      if (e.key === "Enter") {
                        e.preventDefault();
                        
                        // If there's a highlighted option, select it
                        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
                          const option = filteredOptions[highlightedIndex];
                          if (isMultiple) {
                            handleMultiToggle(option.value);
                          } else {
                            handleSingleSelect(option.value);
                          }
                          // Close dropdown after selection
                          setOpen(false);
                          setSearchTerm("");
                          setKeyboardSearch("");
                          setHighlightedIndex(-1);
                          buttonRef.current?.focus();
                          return;
                        }
                        
                        // If no highlighted option but there are filtered options, select the first one
                        if (filteredOptions.length > 0) {
                          const firstOption = filteredOptions[0];
                          if (isMultiple) {
                            handleMultiToggle(firstOption.value);
                          } else {
                            handleSingleSelect(firstOption.value);
                          }
                          // Close dropdown after selection
                          setOpen(false);
                          setSearchTerm("");
                          setKeyboardSearch("");
                          setHighlightedIndex(-1);
                          buttonRef.current?.focus();
                          return;
                        }
                        
                        // If no options available, just close dropdown
                        setOpen(false);
                        setSearchTerm("");
                        setKeyboardSearch("");
                        setHighlightedIndex(-1);
                        buttonRef.current?.focus();
                        return;
                      }
                      
                      // Arrow keys - navigate options when in search input
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        if (filteredOptions.length > 0) {
                          setHighlightedIndex((prev) => {
                            const next = prev < filteredOptions.length - 1 ? prev + 1 : prev;
                            // Scroll into view
                            if (listRef.current && next >= 0) {
                              setTimeout(() => {
                                const optionElement = listRef.current?.children[0]?.children[next + (isMultiple ? 1 : 0)] as HTMLElement;
                                if (optionElement) {
                                  optionElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
                                }
                              }, 0);
                            }
                            return next;
                          });
                        }
                        return;
                      }
                      
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        if (filteredOptions.length > 0) {
                          setHighlightedIndex((prev) => {
                            const next = prev > 0 ? prev - 1 : 0;
                            // Scroll into view
                            if (listRef.current && next >= 0) {
                              setTimeout(() => {
                                const optionElement = listRef.current?.children[0]?.children[next + (isMultiple ? 1 : 0)] as HTMLElement;
                                if (optionElement) {
                                  optionElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
                                }
                              }, 0);
                            }
                            return next;
                          });
                        }
                        return;
                      }
                      
                      // Tab key - select highlighted or first matching option if search text exists, then move to next field
                      if (e.key === "Tab") {
                        e.preventDefault();
                        
                        let optionToSelect: SelectOption | null = null;
                        
                        // If there's a highlighted option, use it
                        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
                          optionToSelect = filteredOptions[highlightedIndex];
                        } 
                        // Otherwise, if there's search text and filtered options, select the first one
                        else if (searchTerm && filteredOptions.length > 0) {
                          optionToSelect = filteredOptions[0];
                        }
                        
                        // Select the option if we have one
                        if (optionToSelect) {
                          if (isMultiple) {
                            handleMultiToggle(optionToSelect.value);
                          } else {
                            handleSingleSelect(optionToSelect.value);
                          }
                        } else {
                          // If no selection made, just close and call onBlur
                          setOpen(false);
                          setSearchTerm("");
                          setKeyboardSearch("");
                          setHighlightedIndex(-1);
                          setTimeout(() => {
                            onBlur?.(); // Call onBlur when dropdown closes without selection
                          }, 0);
                        }
                        
                        // Close dropdown
                        setOpen(false);
                        setSearchTerm("");
                        setKeyboardSearch("");
                        setHighlightedIndex(-1);
                        
                        // First, return focus to the button to ensure selection is complete
                        // Then move to next field after a brief delay
                        if (optionToSelect) {
                          // Wait for selection to complete, then move focus
                          setTimeout(() => {
                            if (!buttonRef.current) return;
                            
                            // Return focus to button briefly to ensure selection completes
                            buttonRef.current.focus();
                            
                            // Then move to next field after selection is confirmed
                            setTimeout(() => {
                              if (!buttonRef.current) return;
                              
                              // Find all focusable elements in the form/document
                              const form = buttonRef.current.closest('form') || document.body;
                              const allFocusable = Array.from(
                                form.querySelectorAll<HTMLElement>(
                                  'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
                                )
                              );
                              
                              // Filter out elements that are not visible or are in portals/dropdowns
                              const focusableElements = allFocusable.filter(el => {
                                const rect = el.getBoundingClientRect();
                                const isVisible = rect.width > 0 && rect.height > 0 && 
                                                window.getComputedStyle(el).visibility !== 'hidden' &&
                                                window.getComputedStyle(el).display !== 'none';
                                
                                // Check if element is in a portal (dropdown panel)
                                const isInPortal = panelRef.current?.contains(el);
                                
                                // Skip disabled select fields
                                const isDisabledSelect = el.tagName === "BUTTON" && 
                                                         el.getAttribute("aria-haspopup") === "listbox" && 
                                                         el.hasAttribute("disabled");
                                
                                return isVisible && !isInPortal && !isDisabledSelect;
                              });
                              
                              // Find the button's index in the focusable elements
                              const buttonIndex = focusableElements.findIndex(el => 
                                el === buttonRef.current
                              );
                              
                              if (buttonIndex >= 0) {
                                if (e.shiftKey) {
                                  // Shift+Tab - focus previous element
                                  if (buttonIndex > 0) {
                                    focusableElements[buttonIndex - 1]?.focus();
                                  }
                                } else {
                                  // Tab - focus next element
                                  if (buttonIndex < focusableElements.length - 1) {
                                    focusableElements[buttonIndex + 1]?.focus();
                                  }
                                }
                              }
                            }, 100);
                          }, 10);
                        } else {
                          // No selection, just move to next field
                          setTimeout(() => {
                            if (!buttonRef.current) return;
                            
                            const form = buttonRef.current.closest('form') || document.body;
                            const allFocusable = Array.from(
                              form.querySelectorAll<HTMLElement>(
                                'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
                              )
                            );
                            
                            const focusableElements = allFocusable.filter(el => {
                              const rect = el.getBoundingClientRect();
                              const isVisible = rect.width > 0 && rect.height > 0 && 
                                              window.getComputedStyle(el).visibility !== 'hidden' &&
                                              window.getComputedStyle(el).display !== 'none';
                              const isInPortal = panelRef.current?.contains(el);
                              const isDisabledSelect = el.tagName === "BUTTON" && 
                                                       el.getAttribute("aria-haspopup") === "listbox" && 
                                                       el.hasAttribute("disabled");
                              return isVisible && !isInPortal && !isDisabledSelect;
                            });
                            
                            const buttonIndex = focusableElements.findIndex(el => 
                              el === buttonRef.current
                            );
                            
                            if (buttonIndex >= 0) {
                              if (e.shiftKey) {
                                if (buttonIndex > 0) {
                                  focusableElements[buttonIndex - 1]?.focus();
                                }
                              } else {
                                if (buttonIndex < focusableElements.length - 1) {
                                  focusableElements[buttonIndex + 1]?.focus();
                                }
                              }
                            }
                          }, 10);
                        }
                        
                        return;
                      }
                      // Escape key - close dropdown and return focus to button
                      if (e.key === "Escape") {
                        e.preventDefault();
                        setOpen(false);
                        setSearchTerm("");
                        setKeyboardSearch("");
                        onBlur?.(); // Call onBlur when dropdown closes
                        setHighlightedIndex(-1);
                        buttonRef.current?.focus();
                        return;
                      }
                    }}
                    placeholder={searchPlaceholder}
                    className="w-full border-none bg-transparent text-sm font-medium text-[#262D3B] placeholder:text-[#98A2B3] focus:outline-none"
                  />
                </label>
              </div>

              <div
                ref={listRef}
                className="scrollbar-hidden flex-1 overflow-y-auto pr-0"
              >
                <div className="flex flex-col gap-0">
                  {isMultiple ? (
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-[10px] px-3 py-3 text-sm font-medium text-[#434956] transition-colors hover:bg-[#F7FAF7]"
                      onClick={handleSelectAllToggle}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={`relative flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border-2 ${
                            areAllSelected
                              ? "border-[#0B8C00] bg-[#0B8C00]"
                              : "border-[#D0D5DD] bg-white"
                          }`}
                        >
                          {areAllSelected ? <CheckIconWhite /> : null}
                        </span>
                        <span className="text-left">Select All</span>
                      </span>
                    </button>
                  ) : null}
                  {filteredOptions.length === 0 ? (
                    <div className="py-6 text-center text-sm text-[#9CA3AF]">
                      {emptyMessage}
                    </div>
                  ) : (
                    filteredOptions.map((option, index) => {
                      const isOptionDisabled = Boolean(option.disabled);
                      const isSelected = isMultiple
                        ? ((selectedValue as string[]) ?? []).includes(option.value)
                        : (selectedValue as string | null) === option.value;
                      const isHighlighted = highlightedIndex === index;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          disabled={isOptionDisabled}
                          className={`flex w-full items-center justify-between rounded-[10px] px-3 py-3 text-sm font-medium transition-colors ${
                            isOptionDisabled
                              ? "cursor-not-allowed text-[#9CA3AF]"
                              : `text-[#434956] ${
                                  isHighlighted ? "bg-[#0B8C00]/10" : "hover:bg-[#F7FAF7]"
                                }`
                          }`}
                          onClick={() =>
                            isOptionDisabled
                              ? undefined
                              : isMultiple
                                ? handleMultiToggle(option.value)
                                : handleSingleSelect(option.value)
                          }
                          onMouseEnter={() => setHighlightedIndex(index)}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={`relative inline-block shrink-0 ${
                                isMultiple
                                  ? `h-4 w-4 rounded-[4px] border-2 ${
                                      isSelected
                                        ? "border-[#0B8C00] bg-[#0B8C00]"
                                        : "border-[#D0D5DD] bg-white"
                                    }`
                                  : `h-5 w-5 rounded-full border-2 ${
                                      isSelected ? "border-[#0B8C00]" : "border-[#B8BFC9]"
                                    } bg-white`
                              }`}
                              style={!isMultiple ? { aspectRatio: "1 / 1" } : undefined}
                            >
                              {isMultiple ? (
                                <span className="absolute inset-0 flex items-center justify-center">
                                  {isSelected ? <CheckIconWhite /> : null}
                                </span>
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

  // Attach both internal and forwarded refs to the same container element
  const setContainerRef = (node: HTMLDivElement | null) => {
    containerRef.current = node;
    if (typeof ref === "function") {
      ref(node);
    } else if (ref) {
      (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    }
  };

  return (
    <div
      ref={setContainerRef}
      className={`relative inline-flex flex-col ${width === undefined ? "w-full" : ""} ${hideLabel ? "gap-0" : "gap-2"} ${disabled ? "cursor-not-allowed" : ""}`}
      style={wrapperStyles}
    >
      {!hideLabel ? (
        <span
          className={`absolute left-6 top-0 z-10 flex -translate-y-1/2 items-center gap-1 rounded-full bg-white px-2 text-xs font-medium text-[#7B8089] ${labelSuffix ? "cursor-default" : "pointer-events-none"}`}
        >
          <span className={labelSuffix ? "cursor-default" : undefined}>
            {labelSuffix && labelIsRequired ? labelTextWithoutRequired : renderLabel}
          </span>
          {labelSuffix}
          {labelSuffix && labelIsRequired ? (
            <span className="cursor-default">{requiredAsterisk}</span>
          ) : null}
        </span>
      ) : null}

      <button
        ref={buttonRef}
        type="button"
        className={`flex w-full items-center justify-between rounded-[32px] border ${error ? "border-[#F87171]" : "border-[#EBECED]"} ${background === "white" ? "bg-white" : "bg-[#0B8C000D]"} px-6 text-left text-sm font-medium text-[#262D3B] transition-colors focus:border-[#0B8C00] focus:outline-none focus:ring-2 focus:ring-[#0B8C00]/20 ${disabled ? "cursor-not-allowed" : labelSuffix ? "cursor-default" : ""} disabled:cursor-not-allowed ${open ? "border-[#0B8C00]" : ""} ${Check_Cursor_pointer}`}
        onClick={toggleOpen}
        onKeyDown={handleKeyDown}
        onBlur={(e) => {
          // Close dropdown when button loses focus
          if (open) {
            const relatedTarget = e.relatedTarget as Node | null;
            // Check if focus is moving outside the component (not to search input or panel)
            if (
              relatedTarget &&
              containerRef.current &&
              !containerRef.current.contains(relatedTarget) &&
              panelRef.current &&
              !panelRef.current.contains(relatedTarget)
            ) {
              // Focus is moving outside, close dropdown
              setOpen(false);
              setSearchTerm("");
              setKeyboardSearch("");
              setHighlightedIndex(-1);
              setTimeout(() => {
                onBlur?.();
              }, 0);
            } else if (!relatedTarget) {
              // If no related target (e.g., clicking outside), close dropdown
              setOpen(false);
              setSearchTerm("");
              setKeyboardSearch("");
              setHighlightedIndex(-1);
              setTimeout(() => {
                onBlur?.();
              }, 0);
            }
          } else {
            // Dropdown is already closed, just call onBlur for validation
            const relatedTarget = e.relatedTarget as Node | null;
            if (relatedTarget && containerRef.current && !containerRef.current.contains(relatedTarget) && panelRef.current && !panelRef.current.contains(relatedTarget)) {
              setTimeout(() => {
                onBlur?.();
              }, 0);
            } else if (!relatedTarget) {
              setTimeout(() => {
                onBlur?.();
              }, 0);
            }
          }
        }}
        style={triggerStyles}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        tabIndex={disabled ? 0 : undefined}
      >
        <span
          className={`flex-1 truncate ${
            (!isMultiple && !(selectedValue as string | null)) ||
            (isMultiple && !selectedCount)
              ? "text-[#9CA3AF]"
              : "text-[#434956]"
          }`}
          title={selectedLabel}
        >
          {selectedLabel}
        </span>
        <span
          className={`ml-0 transition-transform duration-200 ${
            open ? "rotate-180" : "rotate-0"
          }`}
        >
          {arrowIcon}
        </span>
      </button>

      {dropdownContent}

      {error ? <span className="text-xs text-[#F87171]">{error}</span> : null}
    </div>
  );
});

FormSelectField.displayName = "FormSelectField";


"use client";

import React, { useRef, useEffect } from "react";

interface PatientTypeButtonGroupProps {
    options: string[];
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    label?: string;
    required?: boolean;
    error?: string;
    fieldRef?: React.RefObject<HTMLDivElement | null>;
    dataField?: string;
    disabled?: boolean;
    /** Fixed width (px) for each option button. */
    buttonWidth?: number;
    /** Option values (lowercase) to disable, e.g. ["ipd"]. Disabled options show cursor-not-allowed and are not clickable. */
    disabledOptions?: string[];
}

export function PatientTypeButtonGroup({
    options,
    value,
    onChange,
    onBlur,
    label,
    required = false,
    error,
    fieldRef,
    dataField,
    disabled = false,
    buttonWidth,
    disabledOptions = [],
}: PatientTypeButtonGroupProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const currentIndexRef = useRef<number>(-1);
    const wasFocusedRef = useRef<boolean>(false);

    // Set the ref on the container div
    useEffect(() => {
        if (fieldRef && containerRef.current) {
            (fieldRef as React.MutableRefObject<HTMLDivElement | null>).current = containerRef.current;
        }
    }, [fieldRef]);

    // Find current active index
    useEffect(() => {
        const activeIndex = options.findIndex(opt => value === opt.toLowerCase());
        currentIndexRef.current = activeIndex;
    }, [value, options]);

    // Handle focus when field is navigated to via arrow keys
    useEffect(() => {
        const handleFocus = () => {
            // If no button is focused and user navigates to this field, focus the first button
            const hasFocusedButton = buttonRefs.current.some(btn => btn === document.activeElement);
            if (!hasFocusedButton && containerRef.current?.contains(document.activeElement as Node)) {
                // Focus the first button if no value is selected, or the active button if a value is selected
                const activeIndex = options.findIndex(opt => value === opt.toLowerCase());
                const buttonToFocus = activeIndex >= 0 ? activeIndex : 0;
                buttonRefs.current[buttonToFocus]?.focus();
                wasFocusedRef.current = true;
            }
        };

        // Use a small delay to ensure the focus event has completed
        const timeoutId = setTimeout(handleFocus, 10);
        return () => clearTimeout(timeoutId);
    }, [value, options]);

    // Detect when focus leaves the button group via arrow keys
    useEffect(() => {
        const handleFocusChange = () => {
            // Check if focus has moved outside the button group
            if (wasFocusedRef.current && containerRef.current) {
                const activeElement = document.activeElement;
                const isStillInGroup = containerRef.current.contains(activeElement);
                
                if (!isStillInGroup && wasFocusedRef.current) {
                    // Focus has left the group, validate if required and no value
                    if (required && !value && onBlur) {
                        setTimeout(() => {
                            onBlur();
                        }, 0);
                    }
                    wasFocusedRef.current = false;
                }
            }
        };

        // Listen for focus changes
        document.addEventListener("focusin", handleFocusChange);
        return () => {
            document.removeEventListener("focusin", handleFocusChange);
        };
    }, [required, value, onBlur]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
        // Only handle arrow keys if we're within the button group
        // This prevents conflict with the form-level arrow key navigation
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            // Check if we're in a text input context - if so, let the form navigation handle it
            const activeElement = document.activeElement;
            if (activeElement && activeElement.tagName === "INPUT" && 
                (activeElement as HTMLInputElement).type !== "button") {
                return; // Let form navigation handle it
            }
            
            // Check if this is the last button and we're moving right, or first button moving left
            // This means we're about to leave the button group
            const isLeavingGroup = 
                (e.key === "ArrowRight" && index === options.length - 1) ||
                (e.key === "ArrowLeft" && index === 0);
            
            // If we're leaving the group and no value is selected, trigger validation
            if (isLeavingGroup && !value && required && onBlur) {
                // Use setTimeout to trigger validation after navigation completes
                setTimeout(() => {
                    onBlur();
                }, 100);
            }
            
            // Don't prevent default if we're leaving the group - let form navigation handle it
                if (!isLeavingGroup) {
                e.preventDefault();
                e.stopPropagation();
                // Only move focus, don't select the option; skip disabled options
                if (e.key === "ArrowLeft") {
                    let prevIndex = index > 0 ? index - 1 : options.length - 1;
                    while (disabledOptions.includes(options[prevIndex].toLowerCase())) {
                        prevIndex = prevIndex > 0 ? prevIndex - 1 : options.length - 1;
                        if (prevIndex === index) break;
                    }
                    if (!disabledOptions.includes(options[prevIndex].toLowerCase())) {
                        buttonRefs.current[prevIndex]?.focus();
                    }
                } else if (e.key === "ArrowRight") {
                    let nextIndex = index < options.length - 1 ? index + 1 : 0;
                    while (disabledOptions.includes(options[nextIndex].toLowerCase())) {
                        nextIndex = nextIndex < options.length - 1 ? nextIndex + 1 : 0;
                        if (nextIndex === index) break;
                    }
                    if (!disabledOptions.includes(options[nextIndex].toLowerCase())) {
                        buttonRefs.current[nextIndex]?.focus();
                    }
                }
            }
            // If isLeavingGroup is true, let the form navigation handle it (don't prevent default)
        } else if (e.key === "Enter" || e.key === " ") {
            const optLower = options[index].toLowerCase();
            if (disabledOptions.includes(optLower)) {
                e.preventDefault();
                return;
            }
            // Select the option when Enter or Space is pressed
            e.preventDefault();
            onChange(optLower);
        } else if (e.key === "Tab") {
            // When Tab is pressed, trigger blur validation if no value selected
            if (!value && required && onBlur) {
                onBlur();
            }
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
        // Check if focus is moving outside the button group
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            if (onBlur) {
                onBlur();
            }
        }
    };

    return (
        <div 
            ref={containerRef}
            className="group relative w-full" 
            data-field={dataField}
            onBlur={handleBlur}
            tabIndex={-1}
        >
            {label && (
                <span className={`block text-xs font-medium text-[#7B8089] mb-[2px] ${disabled ? "hover:opacity-50 hover:cursor-not-allowed transition-opacity" : ""}`}>
                    {label.includes("*") ? (
                        <>
                            {label.replace("*", "").trim()}
                            <span className="text-[#F6776E]"> *</span>
                        </>
                    ) : (
                        <>
                            {label}
                            {required && <span className="text-[#F6776E]"> *</span>}
                        </>
                    )}
                </span>
            )}

            <div className={`flex items-center gap-[7px] ${buttonWidth ? "w-fit" : "w-full"}`}>
                {options.map((option, index) => {
                    const optLower = option.toLowerCase();
                    const isOptionDisabled = disabled || disabledOptions.includes(optLower);
                    const isActive = value === optLower;
                    return (
                        <button
                            key={option}
                            ref={(el) => {
                                buttonRefs.current[index] = el;
                            }}
                            type="button"
                            onClick={() => !disabled && !disabledOptions.includes(optLower) && onChange(optLower)}
                            onKeyDown={(e) => !disabled && handleKeyDown(e, index)}
                            disabled={disabled}
                            aria-disabled={disabledOptions.includes(optLower) || undefined}
                            className={`
                                font-inter min-w-0 font-medium text-[12px] leading-[120%]
                                flex flex-row justify-center items-center transition-all duration-200
                                border focus:outline-none focus:ring-2 focus:ring-[#0B8C00]/20 focus:border-[#0B8C00]
                                ${buttonWidth ? "shrink-0" : "flex-1 basis-0"}
                                ${isOptionDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
                                ${isActive
                                    ? "bg-[#0B8C00] text-white border-[#0B8C00]"
                                    : "text-[#434956] bg-white border-[#EBECED] hover:bg-[#F5FBF5]"
                                }
                                ${isOptionDisabled && !isActive ? "hover:bg-white hover:opacity-60" : ""}
                            `}
                            style={{
                                height: "24px",
                                paddingLeft: "10px",
                                paddingRight: "10px",
                                borderRadius: "12px",
                                borderWidth: "1px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                ...(buttonWidth ? { width: `${buttonWidth}px` } : {}),
                            }}
                        >
                            {option}
                        </button>
                    );
                })}
            </div>
            {error && (
                <p className="mt-1 text-xs text-[#F6776E]">{error}</p>
            )}
        </div>
    );
}


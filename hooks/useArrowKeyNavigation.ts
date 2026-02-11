"use client";

import { useEffect, RefObject } from "react";

/**
 * Custom hook for navigating between form fields using left/right arrow keys
 * 
 * @param formRef - Optional ref to the form element. If not provided, will work on any form in the document
 * @param enabled - Whether the navigation is enabled (default: true)
 * @param onFieldFocus - Optional callback that will be called when navigating to a field, with the field name
 * 
 * @example
 * ```tsx
 * const formRef = useRef<HTMLFormElement>(null);
 * useArrowKeyNavigation(formRef, true, (fieldName) => {
 *   // Validate the field
 * });
 * 
 * return <form ref={formRef}>...</form>
 * ```
 */
export function useArrowKeyNavigation(
  formRef?: RefObject<HTMLFormElement | HTMLElement | null> | RefObject<HTMLFormElement | HTMLElement>,
  enabled: boolean = true,
  onFieldFocus?: (fieldName: string) => void
) {
  useEffect(() => {
    if (!enabled) return;

    const handleArrowKeyNavigation = (e: KeyboardEvent) => {
      // Only handle left/right arrow keys
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;

      const target = e.target as HTMLElement;
      if (!target) return;
      
      // Find the form element or container element
      const form = formRef?.current || target.closest("form") || target.closest("[data-form-container]");
      if (!form) return;
      
      // Make sure we're actually in the form (if formRef is provided)
      if (formRef?.current) {
        if (!formRef.current.contains(target)) {
          return;
        }
      }

      // Don't handle if user is in a dropdown panel, search input, or portal
      if (
        target.closest('[role="listbox"]') ||
        target.closest('[data-portal]') ||
        (target.tagName === "INPUT" && target.closest('[role="listbox"]'))
      ) {
        return;
      }

      // Don't handle if a dropdown is open
      const openDropdown = document.querySelector('[role="listbox"][aria-expanded="true"]');
      if (openDropdown && openDropdown.contains(target)) {
        return;
      }

      // Get all focusable form fields in order BEFORE preventing default
      const focusableSelectors = [
        'input:not([disabled]):not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="file"])',
        'textarea:not([disabled])',
        'select:not([disabled])',
        'button[type="button"]:not([disabled])',
        'button[type="submit"]:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(', ');

      const allElements = Array.from(
        form.querySelectorAll<HTMLElement>(focusableSelectors)
      );

      const focusableElements = allElements.filter((el) => {
        // Filter out elements that are not visible
        const rect = el.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0;
        
        // Filter out elements inside dropdowns/portals (but include the trigger buttons)
        const isInDropdown = el.closest('[role="listbox"]') || el.closest('[data-portal]');
        const isDropdownButton = el.tagName === "BUTTON" && el.getAttribute("aria-haspopup") === "listbox";
        
        // Check if element is disabled
        const isDisabled = el.hasAttribute("disabled") || 
                          (el as HTMLInputElement | HTMLButtonElement).disabled ||
                          (isDropdownButton && el.hasAttribute("disabled"));
        
        // Include dropdown buttons but exclude elements inside dropdown panels
        if (isDropdownButton) {
          return isVisible && !isDisabled;
        }
        
        return isVisible && !isInDropdown && !isDisabled;
      }).sort((a, b) => {
        // Sort by visual position: top to bottom, then left to right
        const rectA = a.getBoundingClientRect();
        const rectB = b.getBoundingClientRect();
        
        // First compare by top position (with some tolerance for same row)
        const topDiff = rectA.top - rectB.top;
        const tolerance = 10; // pixels tolerance for "same row"
        
        if (Math.abs(topDiff) < tolerance) {
          // Same row, sort by left position
          return rectA.left - rectB.left;
        }
        
        // Different rows, sort by top position
        return topDiff;
      });

      // Don't handle if user is typing in an input (cursor navigation)
      // Check this AFTER we have the focusable elements list
      if (target.tagName === "INPUT") {
        const input = target as HTMLInputElement;
        const inputType = input.type;
        if (inputType === "text" || inputType === "email" || inputType === "tel" || inputType === "number") {
          const cursorPosition = input.selectionStart || 0;
          const selectionEnd = input.selectionEnd || 0;
          const textLength = input.value.length;
          const hasSelection = cursorPosition !== selectionEnd;

          // If there's a text selection, allow normal selection behavior
          if (hasSelection) {
            return;
          }

          // If cursor is not at the start (left arrow) or end (right arrow), allow normal cursor movement
          if (e.key === "ArrowLeft" && cursorPosition > 0) return;
          if (e.key === "ArrowRight" && cursorPosition < textLength) return;
        }
      }

      // Don't handle in textarea (allow normal cursor movement)
      if (target.tagName === "TEXTAREA") {
        const textarea = target as HTMLTextAreaElement;
        const cursorPosition = textarea.selectionStart || 0;
        const textLength = textarea.value.length;

        if (e.key === "ArrowLeft" && cursorPosition > 0) return;
        if (e.key === "ArrowRight" && cursorPosition < textLength) return;
      }

      // Now prevent default after we've collected the elements and checked cursor position
      e.preventDefault();

      // Find current focused element index
      // Get the active element (which might be different from target in capture phase)
      const activeElement = document.activeElement as HTMLElement;
      const elementToFind = activeElement || target;
      
      // First try direct match with active element
      let currentIndex = focusableElements.findIndex((el) => el === elementToFind);
      
      // If not found, check if target/activeElement is inside any focusable element
      if (currentIndex === -1) {
        currentIndex = focusableElements.findIndex((el) => {
          return el.contains(elementToFind) || el === elementToFind;
        });
      }

      // If still not found, try with target directly
      if (currentIndex === -1) {
        currentIndex = focusableElements.findIndex((el) => el === target || el.contains(target));
      }

      // If still not found, try to find by checking if target is a form field itself
      if (currentIndex === -1) {
        const fieldElement = elementToFind.tagName === "INPUT" || elementToFind.tagName === "TEXTAREA" || 
                            elementToFind.tagName === "SELECT" || 
                            (elementToFind.tagName === "BUTTON" && elementToFind.getAttribute("aria-haspopup") === "listbox")
          ? elementToFind
          : target;
        
        if (fieldElement) {
          currentIndex = focusableElements.findIndex((el) => el === fieldElement);
        }
      }

      if (currentIndex === -1) {
        return;
      }

      // Find next enabled field, skipping disabled ones
      let nextIndex: number;
      let attempts = 0;
      const maxAttempts = focusableElements.length; // Prevent infinite loop

      if (e.key === "ArrowRight") {
        // Move to next enabled field
        nextIndex = currentIndex + 1;
        if (nextIndex >= focusableElements.length) {
          nextIndex = 0; // Wrap to first field
        }
        
        // Skip disabled fields
        while (attempts < maxAttempts) {
          const candidate = focusableElements[nextIndex];
          if (candidate) {
            const isDisabled = candidate.hasAttribute("disabled") || 
                              (candidate as HTMLInputElement | HTMLButtonElement).disabled ||
                              (candidate.tagName === "BUTTON" && 
                               candidate.getAttribute("aria-haspopup") === "listbox" && 
                               candidate.hasAttribute("disabled"));
            
            if (!isDisabled) {
              break; // Found an enabled field
            }
          }
          
          // Move to next field
          nextIndex++;
          if (nextIndex >= focusableElements.length) {
            nextIndex = 0; // Wrap to first field
          }
          attempts++;
        }
      } else {
        // Move to previous enabled field
        nextIndex = currentIndex - 1;
        if (nextIndex < 0) {
          nextIndex = focusableElements.length - 1; // Wrap to last field
        }
        
        // Skip disabled fields
        while (attempts < maxAttempts) {
          const candidate = focusableElements[nextIndex];
          if (candidate) {
            const isDisabled = candidate.hasAttribute("disabled") || 
                              (candidate as HTMLInputElement | HTMLButtonElement).disabled ||
                              (candidate.tagName === "BUTTON" && 
                               candidate.getAttribute("aria-haspopup") === "listbox" && 
                               candidate.hasAttribute("disabled"));
            
            if (!isDisabled) {
              break; // Found an enabled field
            }
          }
          
          // Move to previous field
          nextIndex--;
          if (nextIndex < 0) {
            nextIndex = focusableElements.length - 1; // Wrap to last field
          }
          attempts++;
        }
      }

      const nextElement = focusableElements[nextIndex];
      if (nextElement) {
        // First, validate the field we're leaving (current field) if it's a select field
        if (
          target.tagName === "BUTTON" &&
          target.getAttribute("aria-haspopup") === "listbox"
        ) {
          const currentParentWithField = target.closest('[data-field]');
          if (currentParentWithField && onFieldFocus) {
            const currentFieldName = currentParentWithField.getAttribute('data-field');
            if (currentFieldName) {
              // Validate the field we're leaving
              onFieldFocus(currentFieldName);
            }
          }
        }
        
        // Now focus the next element
        // For select fields (button elements), focus the button and trigger validation
        if (
          nextElement.tagName === "BUTTON" &&
          nextElement.getAttribute("aria-haspopup") === "listbox"
        ) {
          nextElement.focus();
          
          // Trigger validation for the select field we're navigating to
          setTimeout(() => {
            // Find the parent element with data-field attribute
            const parentWithField = nextElement.closest('[data-field]');
            if (parentWithField) {
              const fieldName = parentWithField.getAttribute('data-field');
              if (fieldName && onFieldFocus) {
                // Call the validation callback
                onFieldFocus(fieldName);
              }
            }
          }, 10);
        } else {
          nextElement.focus();
          // Scroll the element into view if needed
          nextElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
          // For input fields, select all text for easy replacement
          if (nextElement.tagName === "INPUT" && (nextElement as HTMLInputElement).type !== "file") {
            // Use setTimeout to ensure focus happens before selection
            setTimeout(() => {
              (nextElement as HTMLInputElement).select();
            }, 0);
          }
        }
      }
    };

    // Use capture phase to catch events early
    document.addEventListener("keydown", handleArrowKeyNavigation, true);
    return () => {
      document.removeEventListener("keydown", handleArrowKeyNavigation, true);
    };
  }, [formRef, enabled, onFieldFocus]);
}


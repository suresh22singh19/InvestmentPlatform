"use client";

import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

type PaginationProps = {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  itemsPerPageOptions?: number[];
};

export const Pagination = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 20, 50, 100],
}: PaginationProps) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
    placement: "top" | "bottom";
  } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (isDropdownOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = itemsPerPageOptions.length * 40 + 8; // Approximate height
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const margin = 12;
      
      let placement: "top" | "bottom" = "bottom";
      if (spaceBelow < dropdownHeight + margin && spaceAbove > spaceBelow) {
        placement = "top";
      }
      
      const gap = 4;
      const top =
        placement === "bottom"
          ? rect.bottom + gap
          : rect.top - dropdownHeight - gap;
      
      setDropdownPosition({
        top,
        left: rect.left,
        placement,
      });
    }
  }, [isDropdownOpen, itemsPerPageOptions.length]);

  useEffect(() => {
    if (!isDropdownOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsDropdownOpen(false);
      }
    };

    const handleWindowChange = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const dropdownHeight = itemsPerPageOptions.length * 40 + 8;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        const margin = 12;
        
        let placement: "top" | "bottom" = "bottom";
        if (spaceBelow < dropdownHeight + margin && spaceAbove > spaceBelow) {
          placement = "top";
        }
        
        const gap = 4;
        const top =
          placement === "bottom"
            ? rect.bottom + gap
            : rect.top - dropdownHeight - gap;
        
        setDropdownPosition({
          top,
          left: rect.left,
          placement,
        });
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", handleWindowChange);
    window.addEventListener("scroll", handleWindowChange, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", handleWindowChange);
      window.removeEventListener("scroll", handleWindowChange, true);
    };
  }, [isDropdownOpen]);

  const dropdownContent =
    mounted && isDropdownOpen && dropdownPosition
      ? createPortal(
          <>
            <div
              className="fixed inset-0 z-[1000]"
              onClick={() => setIsDropdownOpen(false)}
            />
            <div
              ref={dropdownRef}
              className="fixed z-[1001] min-w-[80px] rounded-lg border border-[#E6E8EC] bg-white shadow-lg overflow-hidden"
              style={{
                top: dropdownPosition.top,
                left: dropdownPosition.left,
              }}
            >
              {itemsPerPageOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onItemsPerPageChange(option);
                    setIsDropdownOpen(false);
                    onPageChange(1);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-[#F7FAF7] transition-colors ${
                    itemsPerPage === option
                      ? "bg-[#F2F8F2] text-[#0B8C00]"
                      : "text-[#434956]"
                  }`}
                >
                  {option.toString().padStart(2, "0")}
                </button>
              ))}
            </div>
          </>,
          document.body
        )
      : null;

  return (
    <div className="flex items-center justify-between pt-4">
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex h-6 items-center gap-2 text-sm font-medium text-[#434956]"
        >
          <span>Rows per page:</span>
          <span className="flex items-center gap-1">
            <span>{itemsPerPage.toString().padStart(2, "0")}</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={`transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
            >
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="#434956"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>
      </div>

      {dropdownContent}

      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-[#434956]">
          {startItem}-{endItem} of {totalItems}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentPage === 1}
            className="flex h-6 w-6 items-center justify-center rounded transition-colors disabled:cursor-not-allowed disabled:opacity-50 hover:bg-[#F7FAF7]"
            aria-label="Previous page"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 12L6 8L10 4"
                stroke="#434956"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={currentPage === totalPages}
            className="flex h-6 w-6 items-center justify-center rounded transition-colors disabled:cursor-not-allowed disabled:opacity-50 hover:bg-[#F7FAF7]"
            aria-label="Next page"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6 4L10 8L6 12"
                stroke="#434956"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};


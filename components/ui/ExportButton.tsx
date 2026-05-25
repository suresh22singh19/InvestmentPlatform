"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ThreeDotLoader } from "./ThreeDotLoader";

const MENU_WIDTH = 200;
const MENU_GAP = 12;

type ExportButtonProps = {
  onExportPDF?: () => void;
  onExportCSV?: () => void;
  isLoadingPDF?: boolean;
  isLoadingCSV?: boolean;
  className?: string;
};

export const ExportButton = ({
  onExportPDF,
  onExportCSV,
  isLoadingPDF = false,
  isLoadingCSV = false,
  className = "",
}: ExportButtonProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const prevLoadingPDFRef = useRef(false);
  const prevLoadingCSVRef = useRef(false);

  const updateMenuPosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    let left = rect.right - MENU_WIDTH;
    const maxLeft = window.innerWidth - MENU_WIDTH - 8;
    left = Math.max(8, Math.min(left, maxLeft));
    setMenuPos({
      top: rect.bottom + MENU_GAP,
      left,
    });
  }, []);

  useLayoutEffect(() => {
    if (!isMenuOpen) {
      setMenuPos(null);
      return;
    }
    updateMenuPosition();
  }, [isMenuOpen, updateMenuPosition]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const onScrollOrResize = () => updateMenuPosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [isMenuOpen, updateMenuPosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const t = event.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (dropdownRef.current?.contains(t)) return;
      setIsMenuOpen(false);
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const pdfJustCompleted = prevLoadingPDFRef.current && !isLoadingPDF;
    const csvJustCompleted = prevLoadingCSVRef.current && !isLoadingCSV;

    if ((pdfJustCompleted || csvJustCompleted) && isMenuOpen) {
      const timer = setTimeout(() => {
        setIsMenuOpen(false);
      }, 100);
      return () => clearTimeout(timer);
    }

    prevLoadingPDFRef.current = isLoadingPDF;
    prevLoadingCSVRef.current = isLoadingCSV;
  }, [isLoadingPDF, isLoadingCSV, isMenuOpen]);

  const handleExportPDF = () => {
    onExportPDF?.();
  };

  const handleExportCSV = () => {
    onExportCSV?.();
  };

  const dropdown =
    isMenuOpen && menuPos && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={dropdownRef}
            role="menu"
            style={{
              position: "fixed",
              top: menuPos.top,
              left: menuPos.left,
              width: MENU_WIDTH,
              zIndex: 10000,
            }}
            className="overflow-hidden rounded-2xl border border-[#ECF0ED] bg-white shadow-[0px_24px_48px_rgba(34,56,43,0.12)]"
          >
            {onExportPDF ? (
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-[#262D3B] transition hover:bg-[#F2F8F2] disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleExportPDF}
                disabled={isLoadingPDF || isLoadingCSV}
              >
                {isLoadingPDF ? (
                  <ThreeDotLoader color="green" size="small" />
                ) : (
                  <Image src="/icons/PdfIcon.svg" alt="PDF" width={20} height={20} />
                )}
                PDF
              </button>
            ) : null}
            {onExportCSV ? (
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-[#262D3B] transition hover:bg-[#F2F8F2] disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleExportCSV}
                disabled={isLoadingPDF || isLoadingCSV}
              >
                {isLoadingCSV ? (
                  <ThreeDotLoader color="green" size="small" />
                ) : (
                  <Image src="/icons/CsvIcon.svg" alt="CSV" width={20} height={20} />
                )}
                CSV
              </button>
            ) : null}
          </div>,
          document.body
        )
      : null;

  const Check_Cursor_pointer = className ? className : "";
  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsMenuOpen((prev) => !prev)}
        className={`flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#9A7909] bg-white px-6 text-sm font-medium leading-[120%] text-[#9A7909] transition-colors hover:bg-[#FEF9E7] ${Check_Cursor_pointer}`}
      >
        <Image src="/icons/DownloadExport.svg" alt="Export" width={20} height={20} className="shrink-0" />
        <span className="text-hide">Export</span>
        <Image
          src="/icons/ArrowDown.svg"
          alt="Expand menu"
          width={16}
          height={16}
          className={`shrink-0 transition-transform ${isMenuOpen ? "rotate-180" : ""}`}
        />
      </button>
      {dropdown}
    </div>
  );
};

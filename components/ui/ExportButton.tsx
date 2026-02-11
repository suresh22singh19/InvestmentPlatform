"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ThreeDotLoader } from "./ThreeDotLoader";

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
  className = "" 
}: ExportButtonProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const prevLoadingPDFRef = useRef(false);
  const prevLoadingCSVRef = useRef(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  // Close menu when loading completes (when loading goes from true to false)
  useEffect(() => {
    // Check if PDF loading just completed (was loading, now not loading)
    const pdfJustCompleted = prevLoadingPDFRef.current && !isLoadingPDF;
    // Check if CSV loading just completed (was loading, now not loading)
    const csvJustCompleted = prevLoadingCSVRef.current && !isLoadingCSV;

    if ((pdfJustCompleted || csvJustCompleted) && isMenuOpen) {
      // Small delay to ensure download has started
      const timer = setTimeout(() => {
        setIsMenuOpen(false);
      }, 100);
      return () => clearTimeout(timer);
    }

    // Update refs for next render
    prevLoadingPDFRef.current = isLoadingPDF;
    prevLoadingCSVRef.current = isLoadingCSV;
  }, [isLoadingPDF, isLoadingCSV, isMenuOpen]);

  const handleExportPDF = () => {
    // Don't close menu immediately - let it close when loading completes
    onExportPDF?.();
  };

  const handleExportCSV = () => {
    // Don't close menu immediately - let it close when loading completes
    onExportCSV?.();
  };

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsMenuOpen((prev) => !prev)}
        className="flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#9A7909] bg-white px-6 text-sm font-medium leading-[120%] text-[#9A7909] transition-colors hover:bg-[#FEF9E7]"
      >
        <Image src="/icons/DownloadExport.svg" alt="Export" width={20} height={20} className="shrink-0" />
        Export
        <Image
          src="/icons/ArrowDown.svg"
          alt="Expand menu"
          width={16}
          height={16}
          className={`shrink-0 transition-transform ${isMenuOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isMenuOpen ? (
        <div className="absolute right-0 top-full mt-3 w-[200px] overflow-hidden rounded-2xl border border-[#ECF0ED] bg-white shadow-[0px_24px_48px_rgba(34,56,43,0.12)] z-50">
          <button
            type="button"
            className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-[#262D3B] transition hover:bg-[#F2F8F2] disabled:opacity-60 disabled:cursor-not-allowed"
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
          <button
            type="button"
            className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-[#262D3B] transition hover:bg-[#F2F8F2] disabled:opacity-60 disabled:cursor-not-allowed"
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
        </div>
      ) : null}
    </div>
  );
};


"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Image from "next/image";

type FileUploadFieldProps = {
  label: string;
  accept?: string; // e.g., "image/*,.pdf,.svg" or "image/png,image/jpeg,.pdf"
  value?: string;
  onChange?: (file: File | null, fileName: string) => void;
  placeholder?: string;
  className?: string;
  icon?: string; // Custom icon path, defaults to UploadIcon
  error?: string;
};

export const FileUploadField = ({
  label,
  accept = "image/*,.pdf,.svg",
  value,
  onChange,
  placeholder = "Upload",
  className = "",
  icon = "/icons/UploadIcon.svg",
  error,
}: FileUploadFieldProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>(value || "");

  useEffect(() => {
    setFileName(value || "");
  }, [value]);

  // Clear fileName when error is shown and value is empty (invalid file rejected)
  useEffect(() => {
    if (error && (!value || value === "")) {
      setFileName("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [error, value]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;
      if (file) {
        setFileName(file.name);
        onChange?.(file, file.name);
      }
    },
    [onChange]
  );

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onChange?.(null, "");
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    // Don't trigger file input if clicking on remove button
    if ((e.target as HTMLElement).closest('button[aria-label="Remove file"]')) {
      return;
    }
    fileInputRef.current?.click();
  };

  return (
    <div className={`inline-flex w-full flex-col gap-2 ${className}`}>
      <div className="group relative inline-flex w-full">
        <span className="pointer-events-none absolute left-6 top-0 z-10 -translate-y-1/2 rounded-full bg-white px-2 text-xs font-medium text-[#7B8089]">
          {label}
        </span>

        <div className="relative w-full z-0">
          <div
            onClick={handleContainerClick}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            tabIndex={0}
            role="button"
            aria-label={label}
            className="flex h-11 w-full cursor-pointer items-center rounded-[32px] border border-[#DFE0E2] bg-white px-6 text-sm font-medium transition-colors hover:border-[#0B8C00] focus:outline-none focus:ring-2 focus:ring-[#0B8C00]/20 focus:border-[#0B8C00]"
          >
            {fileName ? (
              <div className="flex w-full items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-[#262D3B]">{fileName}</span>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="relative z-10 flex shrink-0 items-center justify-center rounded-full p-1 text-[#F6776E] hover:bg-[#F6776E]/10 transition-colors"
                  aria-label="Remove file"
                >
                  <Image src="/icons/CrossIcon.svg" alt="Remove" width={16} height={16} />
                </button>
              </div>
            ) : (
              <div className="flex w-full items-center justify-center gap-2">
                <Image src={icon} alt="Upload" width={20} height={20} className="shrink-0" />
                <span className="text-sm font-medium text-[#7B8089]">{placeholder}</span>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label={label}
            tabIndex={-1}
          />
        </div>
      </div>

      {error && <span className="text-xs text-[#F87171]">{error}</span>}
    </div>
  );
};


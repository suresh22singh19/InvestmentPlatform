"use client";

import Image from "next/image";
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type DialogSize = number | string;

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  width?: DialogSize;
  height?: DialogSize;
  children?: ReactNode;
  customHeader?: ReactNode;
  contentPadding?: string; // Optional custom padding for content area (e.g., "px-6 py-2")
  closeOnOutsideClick?: boolean; // Whether to close dialog when clicking outside (default: true)
  closeOnEscape?: boolean; // Whether to close dialog when pressing Escape key (default: true)
};

const normalizeSize = (value: DialogSize | undefined) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "number") {
    return `${value}px`;
  }

  return value;
};

export const Dialog = ({
  open,
  onClose,
  title,
  width = 638,
  height,
  children,
  customHeader,
  contentPadding = "px-6 py-6",
  closeOnOutsideClick = true,
  closeOnEscape = true,
}: DialogProps) => {
  const [mounted, setMounted] = useState(false);
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && closeOnEscape) {
        onClose();
      }
    };

    if (open) {
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mounted, onClose, open, closeOnEscape]);

  const dialogStyles = useMemo(() => {
    return {
      width: normalizeSize(width),
      height: normalizeSize(height),
    } as React.CSSProperties;
  }, [height, width]);

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    <div
      className="dialog-backdrop fixed inset-0 z-50 flex items-center justify-center bg-[#0B1323]/70 px-4"
      onClick={closeOnOutsideClick ? onClose : undefined}
    >
      <div
        className="dialog-container relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-[12px] bg-white shadow-[0px_32px_80px_rgba(47,72,61,0.18)]"
        style={dialogStyles}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        {customHeader ? (
          <div className="">
            {customHeader}
          </div>
        ) : (
          <div className="flex items-center justify-between  px-6 pt-4">
            <h2 id={titleId} className="text-xl font-semibold text-[#262D3B]">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-200 hover:bg-[#F2F8F2]"
              aria-label="Close dialog"
            >
              <Image src="/icons/CrossIcon.svg" alt="Close dialog" width={24} height={24} />
            </button>
          </div>
        )}

        <div className={`flex flex-1 flex-col overflow-y-auto custom-scroll ${contentPadding}`}>{children}</div>
      </div>
    </div>,
    document.body
  );
};



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
  /** When "hidden", the body does not scroll (use an inner ScrollableContainer). Default scrolls the whole body. */
  contentOverflow?: "auto" | "hidden";
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

let dialogScrollLockCount = 0;

function lockBodyScrollForDialog() {
  dialogScrollLockCount += 1;
  if (dialogScrollLockCount !== 1) {
    return;
  }
  const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
  document.documentElement.classList.add("dialog-scroll-lock");
  document.body.classList.add("dialog-scroll-lock");
  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }
}

function unlockBodyScrollForDialog() {
  dialogScrollLockCount = Math.max(0, dialogScrollLockCount - 1);
  if (dialogScrollLockCount !== 0) {
    return;
  }
  document.documentElement.classList.remove("dialog-scroll-lock");
  document.body.classList.remove("dialog-scroll-lock");
  document.body.style.paddingRight = "";
}

export const Dialog = ({
  open,
  onClose,
  title,
  width = 638,
  height,
  children,
  customHeader,
  contentPadding = "px-6 py-6",
  contentOverflow = "auto",
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
      const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
      document.body.style.overflow = "hidden";
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      document.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
      document.removeEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
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
      className="dialog-backdrop fixed inset-0 z-[999] flex items-center justify-center overscroll-none bg-slate-950/80 backdrop-blur-md px-4"
      onClick={closeOnOutsideClick ? onClose : undefined}
    >
      <div
        className="dialog-container relative flex max-h-[90vh] min-h-0 w-full flex-col overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-2xl backdrop-blur-xl"
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
          <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-800">
            <h2
              id={titleId}
              className="font-extrabold text-xl leading-tight text-white tracking-tight"
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <Image src="/icons/CrossIcon.svg" alt="Close dialog" width={20} height={20} className="brightness-0 invert opacity-70 hover:opacity-100" />
            </button>
          </div>
        )}

        <div
          className={
            contentOverflow === "hidden"
              ? `flex min-h-0 flex-1 flex-col overflow-hidden overscroll-y-contain ${contentPadding}`
              : `custom-scroll flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain ${contentPadding}`
          }
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};



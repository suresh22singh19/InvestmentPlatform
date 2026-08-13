"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";

type MessageDialogProps = {
  open: boolean;
  onClose: () => void;
  icon?: string; // Path to icon SVG
  iconBgColor?: string; // Background color for icon circle
  /** When set, replaces the default circular image icon (e.g. custom illustration). */
  iconSlot?: ReactNode;
  message: ReactNode;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean; // Show cancel button or not
  width?: number;
  /** When true, confirm shows a loader and both actions are disabled (e.g. async confirm). */
  isActionLoading?: boolean;
  closeOnOutsideClick?: boolean; // Whether to close dialog when clicking outside (default: true)
};

export const MessageDialog = ({
  open,
  onClose,
  icon = "/icons/SuccessCheck.svg",
  iconBgColor = "#E8F5E9",
  iconSlot,
  message,
  onConfirm,
  onCancel,
  confirmText = "Yes",
  cancelText = "No",
  showCancel = true,
  width = 400,
  isActionLoading = false,
  closeOnOutsideClick = true,
}: MessageDialogProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
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
  }, [mounted, onClose, open]);

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      onClose();
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onClose();
    }
  };

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md px-4"
      onClick={closeOnOutsideClick && !isActionLoading ? onClose : undefined}
    >
      <div
        className="relative flex w-full flex-col overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-2xl backdrop-blur-xl p-6 md:p-8"
        style={{ width: `${width}px` }}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isActionLoading}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          aria-label="Close dialog"
        >
          <Image src="/icons/CrossIcon.svg" alt="Close dialog" width={20} height={20} className="brightness-0 invert opacity-70 hover:opacity-100" />
        </button>

        {/* Content */}
        <div className="flex flex-col items-center pt-2 pb-4">
          {/* Icon */}
          {iconSlot != null ? (
            <div className="mb-4 flex justify-center">{iconSlot}</div>
          ) : (
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-400 shadow-inner">
              <Image src={icon} width={32} height={32} alt="Icon" className="brightness-0 invert sepia-[1] hue-rotate-[10deg] saturate-[3]" />
            </div>
          )}

          {/* Message */}
          <p className="text-center text-lg font-extrabold leading-snug text-white tracking-tight px-2">{message}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          {showCancel && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={isActionLoading}
              className="flex-1 py-3 px-5 rounded-2xl bg-slate-800 text-slate-200 hover:text-white font-extrabold text-sm border border-slate-700 hover:bg-slate-700 transition-all cursor-pointer disabled:opacity-50"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isActionLoading}
            className="flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-amber-500/20 hover:from-amber-300 hover:to-yellow-300 transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isActionLoading ? (
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-slate-950 border-t-transparent" />
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};


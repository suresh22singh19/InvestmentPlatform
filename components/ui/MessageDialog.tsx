"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";

type MessageDialogProps = {
  open: boolean;
  onClose: () => void;
  icon?: string; // Path to icon SVG
  iconBgColor?: string; // Background color for icon circle
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean; // Show cancel button or not
  width?: number;
};

export const MessageDialog = ({
  open,
  onClose,
  icon = "/icons/SuccessCheck.svg",
  iconBgColor = "#E8F5E9",
  message,
  onConfirm,
  onCancel,
  confirmText = "Yes",
  cancelText = "No",
  showCancel = true,
  width = 400,
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1323]/70 px-4"
      onClick={onClose}
    >
      <div
        className="relative flex w-full flex-col overflow-hidden rounded-[12px] bg-white shadow-[0px_32px_80px_rgba(47,72,61,0.18)]"
        style={{ width: `${width}px` }}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-lg transition-colors duration-200 hover:bg-[#F2F8F2]"
          aria-label="Close dialog"
        >
          <Image src="/icons/CrossIcon.svg" alt="Close dialog" width={24} height={24} />
        </button>

        {/* Content */}
        <div className="flex flex-col items-center px-6 pt-6 pb-4">
          {/* Icon */}
          <div
            className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: iconBgColor }}
          >
            <Image src={icon} width={30} height={30} alt="Icon" />
          </div>

          {/* Message */}
          <p className="text-center text-base font-medium leading-[150%] text-[#000000]">{message}</p>
        </div>

        {/* Action Buttons */}
        <div
          className="flex gap-3 px-6 pb-6"
          style={{
            paddingTop: "18px",
          }}
        >
          {showCancel && (
            <Button
              variant="outline"
              size="large"
              fullWidth
              onClick={handleCancel}
              className="flex-1"
            >
              {cancelText}
            </Button>
          )}
          <Button
            variant="primary"
            size="large"
            fullWidth
            onClick={handleConfirm}
            className="flex-1"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};


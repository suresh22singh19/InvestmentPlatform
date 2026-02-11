"use client";

import React from "react";
import Image from "next/image";

type RefreshButtonProps = {
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
};

export const RefreshButton = ({ onClick, disabled = false, className = "" }: RefreshButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#9A7909] bg-white px-6 text-sm font-medium leading-[120%] text-[#9A7909] transition-colors hover:bg-[#FDF8E8] focus:outline-none focus:ring-2 focus:ring-[#9A7909]/20 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <Image src="/icons/RefreshIcon.svg" alt="Refresh" width={20} height={20} className="shrink-0" />
      Refresh
    </button>
  );
};

type BackToPreviousPageButtonProps = {
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  text?: string;
  iconOnly?: boolean;
  icon?: React.ReactNode;
};

export const BackToPreviousPageButton = ({ 
  onClick, 
  disabled = false, 
  className = "",
  text = "Back",
  iconOnly = false,
  icon
}: BackToPreviousPageButtonProps) => {
  const defaultIcon = <Image src="/icons/LeftArrowIcon.svg" alt="Back" width={20} height={20} className="shrink-0" />;
  const buttonIcon = icon || defaultIcon;
  
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-11 items-center justify-center ${iconOnly ? 'px-3' : 'gap-2 px-6'} rounded-[32px] border border-[#9A7909] text-sm font-medium leading-[120%] text-[#9A7909] transition-colors hover:bg-[#FDF8E8] focus:outline-none focus:ring-2 focus:ring-[#9A7909]/20 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {buttonIcon}
      {!iconOnly && <span>{text}</span>}
    </button>
  );
};

// Icon-only button component
type IconOnlyButtonProps = {
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  icon: React.ReactNode;
  ariaLabel: string;
};

export const IconOnlyButton = ({ 
  onClick, 
  disabled = false, 
  className = "",
  icon,
  ariaLabel
}: IconOnlyButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`flex h-11 w-11 items-center justify-center rounded-[32px] border border-[#9A7909] text-[#9A7909] transition-colors hover:bg-[#FDF8E8] focus:outline-none focus:ring-2 focus:ring-[#9A7909]/20 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {icon}
    </button>
  );
};
export const GoToHomeButton = ({ onClick, disabled = false, className = "" }: RefreshButtonProps) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClick && !disabled) {
      onClick();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`flex h-11 items-center justify-center gap-2 rounded-[32px] border border-[#9A7909]  px-6 text-sm font-medium leading-[120%] text-[#9A7909] transition-colors hover:bg-[#FDF8E8] focus:outline-none focus:ring-2 focus:ring-[#9A7909]/20 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      Go to Home
    </button>
  );
};


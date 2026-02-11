"use client";

import React from "react";
import { ThreeDotLoader } from "./ThreeDotLoader";

const baseClasses =
  "inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0B8C00]/20 disabled:cursor-not-allowed disabled:opacity-60";

const variantClasses = {
  primary:
    "bg-[#0B8C00] text-white shadow-[0px_20px_40px_rgba(34,56,43,0.18)] hover:bg-[#0A7F00] active:bg-[#096B00]",
  outline:
    "border border-[#0B8C00] bg-white text-[#0B8C00] shadow-[0px_20px_40px_rgba(34,56,43,0.08)] hover:bg-[#F2F8F2] active:bg-[#E4F2E4]",
  ghost: "bg-transparent text-[#0B8C00] hover:bg-[#F2F8F2]",
};

const sizeClasses = {
  large: "h-11 px-8 text-sm",
  medium: "h-10 px-6 text-sm",
  small: "h-9 px-5 text-xs",
};

export type ButtonVariant = keyof typeof variantClasses;
export type ButtonSize = keyof typeof sizeClasses;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  asChild?: boolean;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "large",
  fullWidth = false,
  className = "",
  children,
  leftIcon,
  rightIcon,
  isLoading = false,
  disabled,
  ...props
}) => {
  const widthClass = fullWidth ? "w-full" : "min-w-[132px]";
  const isDisabled = disabled || isLoading;
  
  // Determine loader color: white for primary (green) buttons, green for others
  const loaderColor = variant === "primary" ? "white" : "green";
  const loaderSize = size === "small" ? "small" : size === "medium" ? "medium" : "large";

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} gap-2 ${className} cursor-pointer`}
      disabled={isDisabled}
      {...props}
    >
      {isLoading ? (
        <ThreeDotLoader color={loaderColor} size={loaderSize} />
      ) : (
        <>
          {leftIcon ? <span className="-ml-1 flex items-center">{leftIcon}</span> : null}
          <span>{children}</span>
          {rightIcon ? <span className="-mr-1 flex items-center">{rightIcon}</span> : null}
        </>
      )}
    </button>
  );
};

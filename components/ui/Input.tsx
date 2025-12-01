"use client";

import React, { useState } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  type = "text",
  error,
  className = "",
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="w-full">
      <label className="block text-base font-medium text-[#434956] mb-2">
        {label}
      </label>
      <div className="relative">
        <input
          type={isPassword && showPassword ? "text" : type}
          className={`
            w-full h-[49px] px-6 py-4 rounded-[32px] 
            border border-[#EBECED] 
            bg-white
            text-[14px] leading-[120%] text-[#525763]
            placeholder:text-[#525763]
            focus:outline-none focus:ring-2 focus:ring-[#0B8C00] focus:border-[#0B8C00]
            transition-all
            ${error ? "border-red-500" : ""}
            ${className}
          `}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-6 top-1/2 -translate-y-1/2 hover:opacity-80 transition-opacity focus:outline-none"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <img
                src="/icons/closeEye.svg"
                alt="Hide password"
                width={19}
                height={19}
                className="w-5 h-5"
              />
            ) : (
              <img
                src="/icons/openEye.svg"
                alt="Show password"
                width={19}
                height={19}
                className="w-5 h-5"
              />
            )}
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

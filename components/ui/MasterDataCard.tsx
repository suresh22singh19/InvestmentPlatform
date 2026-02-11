"use client";

import React from "react";

type MasterDataCardProps = {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBgColor?: string;
  buttonLabel?: string;
  onButtonClick?: () => void;
  className?: string;
};

export const MasterDataCard = ({
  title,
  subtitle,
  icon,
  iconBgColor = "bg-gray-100",
  buttonLabel = "Edit",
  onButtonClick,
  className = "",
}: MasterDataCardProps) => {
  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm ${className}`}>
      <div className="flex items-center justify-between gap-4">
        {/* Icon */}
        <div className={`flex-shrink-0 h-12 w-12 flex items-center justify-center rounded-full ${iconBgColor}`}>
          {icon}
        </div>
        
        {/* Text Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600 mt-0.5">{subtitle}</p>
        </div>
        
        {/* Button */}
        <div className="flex-shrink-0">
          <button
            onClick={onButtonClick}
            className="rounded-lg bg-transparent px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-100 whitespace-nowrap"
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

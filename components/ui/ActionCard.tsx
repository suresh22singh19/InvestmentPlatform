"use client";

import React from "react";

type ActionCardProps = {
  title: string;
  description: string;
  icon: React.ReactNode;
  buttonLabel: string;
  iconBgColor?: string;
  onButtonClick?: () => void;
  className?: string;
};

export const ActionCard = ({
  title,
  description,
  icon,
  buttonLabel,
  iconBgColor = "bg-blue-100",
  onButtonClick,
  className = "",
}: ActionCardProps) => {
  return (
    <div className={`rounded-[12px] border border-gray-200 bg-white p-6 shadow-sm ${className}`}>
      <div className="flex items-center justify-between gap-4">
        {/* Icon */}
        <div className={`flex-shrink-0 h-12 w-12 flex items-center justify-center rounded-full ${iconBgColor}`}>
          {icon}
        </div>
        
        {/* Text Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600 mt-0.5">{description}</p>
        </div>
        
        {/* Button */}
        <div className="flex-shrink-0">
          <button
            onClick={onButtonClick}
            className="rounded-[12px] bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 whitespace-nowrap"
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

"use client";

import React from "react";

type ConfigurationProgressCardProps = {
  title: string;
  description: string;
  value: string;
  status: "Complete" | "In Progress";
  icon: React.ReactNode;
  iconBgColor?: string;
  className?: string;
};

export const ConfigurationProgressCard = ({
  title,
  description,
  value,
  status,
  icon,
  iconBgColor = "bg-blue-100",
  className = "",
}: ConfigurationProgressCardProps) => {
  const isComplete = status === "Complete";

  return (
    <div className={`rounded-[12px] border border-gray-200 bg-white p-4 shadow-sm ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-[12px] ${iconBgColor}`}>
          {icon}
        </div>
        <div className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-1 ${
          isComplete 
            ? "bg-green-100 text-green-700" 
            : "bg-yellow-100 text-yellow-700"
        }`}>
          {isComplete && (
            <svg
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
          {status}
        </div>
      </div>
      
      <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-600 mb-3">{description}</p>
      
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
};

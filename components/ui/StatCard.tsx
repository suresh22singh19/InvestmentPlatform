"use client";

import React from "react";

type StatCardProps = {
  title: string;
  value: string | number;
  className?: string;
};

export const StatCard = ({ title, value, className = "" }: StatCardProps) => {
  return (
    <div
      className={`rounded-[12px] border border-gray-200 bg-white p-4 ${className}`}
    >
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-black">{value}</p>
    </div>
  );
};

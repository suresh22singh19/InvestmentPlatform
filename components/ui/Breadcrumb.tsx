"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type BreadcrumbItem = {
  label: string;
  href?: string;
  icon?: React.ReactNode;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
  showBackButton?: boolean;
  onBack?: () => void;
};

export const Breadcrumb = ({
  items,
  showBackButton = true,
  onBack,
}: BreadcrumbProps) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Back Button */}
      {showBackButton && (
        <button
          onClick={handleBack}
          className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
          aria-label="Go back"
        >
          <svg
            className="h-5 w-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      )}

      {/* Breadcrumb Items */}
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const hasIcon = !!item.icon;

        return (
          <React.Fragment key={index}>
            {isLast ? (
              // Last item - no link, just text
              <span className="text-sm font-medium text-gray-900">
                {hasIcon && <span className="mr-1.5 inline-block">{item.icon}</span>}
                {item.label}
              </span>
            ) : (
              // Not last item - render as link
              <>
                {item.href ? (
                  <Link
                    href={item.href}
                    className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {hasIcon && item.icon}
                    <span>{item.label}</span>
                  </Link>
                ) : (
                  <span className="flex items-center gap-1.5 text-sm text-gray-600">
                    {hasIcon && item.icon}
                    <span>{item.label}</span>
                  </span>
                )}
              </>
            )}

            {/* Separator */}
            {!isLast && (
              <svg
                className="h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

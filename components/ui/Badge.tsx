import React from "react";

export type BadgeVariant = "success" | "warning" | "danger" | "neutral" | "info" | "primary" | "occupied" | "cleaning" | "not_available" | "checkout";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: BadgeVariant;
    className?: string;
    children: React.ReactNode;
}

export function Badge({
    variant = "neutral",
    className = "",
    children,
    ...props
}: BadgeProps) {
    let variantClasses = "";

    switch (variant) {
        case "success":
        case "primary":
            variantClasses = "border border-[#0B8C00] text-[#0B8C00] bg-[#0B8C000D]";
            break;
        case "warning":
            variantClasses = "border border-[#EA580C] text-[#EA580C] bg-[#FFF7ED]";
            break;
        case "danger":
            variantClasses = "border border-[#EF4444] text-[#DC2626] bg-[#FEF2F2]";
            break;
        case "neutral":
            variantClasses = "border border-[#CBD5E1] text-[#64748B] bg-[#F8FAFC]";
            break;
        case "info":
            variantClasses = "border border-[#3B82F6] text-[#1D4ED8] bg-[#EFF6FF]";
            break;
        case "occupied":
        case "cleaning":
            variantClasses = "border border-transparent text-[#787E8C] bg-[#F5F6F8]";
            break;
        case "not_available":
            variantClasses = "border border-[#FCA5A5] text-[#EF4444] bg-transparent";
            break;
        case "checkout":
            variantClasses = "border border-transparent text-[#D97706] bg-[#FFFBEB]";
            break;
        default:
            variantClasses = "border border-[#CBD5E1] text-[#64748B] bg-[#F8FAFC]";
    }

    const hasFontWeight = className.includes("font-");

    return (
        <span
            className={`px-3 py-1 rounded-full text-xs ${hasFontWeight ? "" : "font-semibold"} inline-block select-none transition-all duration-200 ${variantClasses} ${className}`}
            {...props}
        >
            {children}
        </span>
    );
}

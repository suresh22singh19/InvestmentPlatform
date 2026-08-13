"use client";

import React from "react";
import ScrollableContainer from "./ScrollableContainer";

type TableProps = {
  children: React.ReactNode;
  className?: string;
  /** Merged onto the inner table element. Omit to keep default `min-w-max` (content-sized width). */
  tableClassName?: string;
};

export const Table = ({ children, className = "", tableClassName }: TableProps) => {
  const tableClasses = tableClassName?.trim()
    ? `w-full border-separate border-spacing-0 ${tableClassName}`
    : "w-full border-separate border-spacing-0 min-w-max";
  return (
    <ScrollableContainer className={`w-full rounded-t-[8px] ${className}`} maxHeight="none">
      <table className={tableClasses}>{children}</table>
    </ScrollableContainer>
  );
};

type TableHeaderProps = {
  children: React.ReactNode;
  className?: string;
};

export const TableHeader = ({ children, className = "" }: TableHeaderProps) => {
  return <thead className={className}>{children}</thead>;
};

type TableBodyProps = {
  children: React.ReactNode;
  className?: string;
};

export const TableBody = ({ children, className = "" }: TableBodyProps) => {
  return <tbody className={className}>{children}</tbody>;
};

type TableRowProps = {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
};

export const TableRow = ({ children, className = "", onClick }: TableRowProps) => {
  // <tr> may only contain <td>/<th>; JSX whitespace between cells becomes text nodes and breaks hydration.
  const cells = React.Children.toArray(children).filter(
    (child) => typeof child !== "string" || child.trim() !== ""
  );
  return (
    <tr
      className={`${className} ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      {cells}
    </tr>
  );
};

type TableHeadProps = {
  children: React.ReactNode;
  className?: string;
  sortable?: boolean;
  sortDirection?: "asc" | "desc" | null;
  onSort?: () => void;
  position?: "first" | "last" | "middle";
  colSpan?: number;
  rowSpan?: number;
};

export const TableHead = ({
  children,
  className = "",
  sortable = false,
  sortDirection = null,
  onSort,
  position = "middle",
  colSpan,
  rowSpan,
}: TableHeadProps) => {
  const baseClasses = "h-[46px] border-t border-b border-[#EDF3EA] px-5 pt-0 text-xs font-medium text-[#262D3B]";
  
  const positionClasses = {
    first: "border-l rounded-tl-[8px] rounded-bl-[8px]",
    last: "border-r rounded-tr-[8px] rounded-br-[8px]",
    middle: "",
  };

  return (
    <th
      className={`text-left ${baseClasses} ${positionClasses[position]} ${sortable ? "cursor-pointer select-none" : ""} ${className}`}
      onClick={sortable && onSort ? onSort : undefined}
      colSpan={colSpan}
      rowSpan={rowSpan}
    >
      <div className="flex items-center gap-2">
        <span>{children}</span>
        {sortable && (
          <span className="flex items-center">
            <SortIcon />
          </span>
        )}
      </div>
    </th>
  );
};

type TableDataProps = {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
  position?: "first" | "last" | "middle";
  variant?: "default" | "primary";
  onClick?: () => void;
};

export const TableData = ({ 
  children, 
  className = "", 
  colSpan,
  position = "middle",
  variant = "default",
  onClick,
}: TableDataProps) => {
  const baseClasses = "h-[46px] border-b border-[#EDF3EA] px-5 text-sm leading-[120%]";
  
  const variantClasses = {
    default: "text-[#434956]",
    primary: "text-[#262D3B]",
  };

  return (
    <td 
      className={`${baseClasses} ${variantClasses[variant]} ${onClick ? "cursor-pointer" : ""} ${className}`} 
      colSpan={colSpan}
      onClick={onClick}
    >
      {children}
    </td>
  );
};

const SortIcon = () => {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <path
        d="M3.74976 7.93701H8.24976C8.3115 7.93696 8.3722 7.95552 8.42358 7.98975C8.47502 8.02408 8.51515 8.07324 8.53882 8.13037C8.56246 8.18748 8.56847 8.25041 8.5564 8.31104C8.54428 8.37158 8.51512 8.42755 8.47144 8.47119L6.22144 10.7212C6.19246 10.7502 6.15773 10.7729 6.11987 10.7886C6.08194 10.8043 6.04082 10.813 5.99976 10.813C5.95883 10.8129 5.91843 10.8042 5.88062 10.7886C5.84275 10.7729 5.80804 10.7502 5.77905 10.7212L3.52905 8.47119C3.48534 8.42752 3.45521 8.37163 3.44312 8.31104C3.43106 8.25049 3.43712 8.18743 3.46069 8.13037C3.48434 8.0733 3.52457 8.02408 3.57593 7.98975C3.6273 7.95546 3.688 7.93701 3.74976 7.93701ZM5.99976 1.18701C6.04082 1.18701 6.08194 1.19472 6.11987 1.21045C6.15781 1.22618 6.19241 1.24975 6.22144 1.27881L8.47144 3.52881C8.5151 3.57249 8.54433 3.62839 8.5564 3.68896C8.56845 3.74959 8.56248 3.81253 8.53882 3.86963C8.51514 3.92664 8.47493 3.97499 8.42358 4.00928C8.37215 4.04361 8.3116 4.06206 8.24976 4.06201H3.74976C3.68812 4.06194 3.62817 4.0435 3.5769 4.00928C3.52563 3.975 3.48533 3.92659 3.46167 3.86963C3.43802 3.81263 3.43117 3.7495 3.44312 3.68896C3.45514 3.62834 3.48537 3.57253 3.52905 3.52881L5.77905 1.27881C5.80808 1.24975 5.84268 1.22618 5.88062 1.21045C5.91837 1.19485 5.95891 1.18705 5.99976 1.18701Z"
        fill="#262D3B"
        stroke="#262D3B"
        strokeWidth="0.125"
      />
    </svg>
  );
};


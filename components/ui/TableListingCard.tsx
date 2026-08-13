"use client";

import type { ReactNode } from "react";
import { Table, TableBody, TableData, TableHead, TableHeader, TableRow } from "./Table";
import { Pagination } from "./Pagination";
import { SpinnerLoader } from "./SpinnerLoader";

type PaginationConfig = {
    currentPage: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange: (itemsPerPage: number) => void;
    itemsPerPageOptions?: number[];
};

export interface TableListingColumn {
    label: string;
    position?: "first" | "middle" | "last";
    sortable?: boolean;
    sortDirection?: "asc" | "desc" | null;
    onSort?: () => void;
    className?: string;
}

export interface TableListingSection {
    id: string;
    /** Shown on the left of the header row. If omitted, leftSideContent fills that slot instead. */
    title?: string;
    /** Shown on the left when title is absent. Use for filters, buttons, tabs, etc. */
    leftSideContent?: ReactNode;
    /** Always shown on the right of the header row. */
    titleRightContent?: ReactNode;
    columns?: TableListingColumn[];
    rows?: ReactNode[][];
    /** When `rows` is empty, show headers + centered message in the table body */
    emptyMessage?: string;
    /** When provided, renders Pagination inside the card below the table */
    pagination?: PaginationConfig;
    /** Shows a centered spinner in the table body while data is loading */
    isLoading?: boolean;
    /** Custom content to render instead of the standard Table */
    customContent?: ReactNode;
    /** If true, renders a styled error state container instead of the table or customContent */
    isError?: boolean;
    /** The error message to display in the error state. */
    errorMessage?: string;
}


interface TableListingCardProps {
    sections: TableListingSection[];
    className?: string;
}

export function TableListingCard({ sections, className = "" }: TableListingCardProps) {
    return (
        <div className={`mb-4 w-full rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 ${className}`}>
            {sections.map((section, index) => (
                <div key={section.id} className={index === sections.length - 1 ? "" : "mb-4"}>
                    {(() => {
                        const leftContent = section.title
                            ? <h2 className="font-inter font-medium text-base leading-[120%] text-[#262D3B]">{section.title}</h2>
                            : section.leftSideContent ?? null;
                        const hasLeft = leftContent !== null;
                        const hasRight = !!section.titleRightContent;
                        if (!hasLeft && !hasRight) return null;
                        return (
                            // <div className="flex min-w-0 items-center gap-3 pb-6">
                            //     {hasLeft && (
                            //         <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
                            //             {leftContent}
                            //         </div>
                            //     )}
                            //     {hasRight && (
                            //         <div className="min-w-0 flex-1 overflow-hidden">{section.titleRightContent}</div>
                            //     )}

                               <div className={`flex items-center gap-2 pb-6 ${hasLeft && hasRight ? "justify-between" : hasRight ? "justify-end" : "justify-start"}`}>
                                {hasLeft && <div className="flex items-center gap-2">{leftContent}</div>}
                                {hasRight && section.titleRightContent}
                            </div>
                        );
                    })()}

                    {section.isError ? (
                        <div className="py-12 text-center text-sm font-medium leading-[120%] text-[#F6776E]">
                            {section.errorMessage || "Facing server API error"}
                        </div>
                    ) : section.customContent ? (
                        section.isLoading ? (
                            <div className="flex h-[240px] items-center justify-center">
                                <SpinnerLoader size={28} />
                            </div>
                        ) : (
                            section.customContent
                        )
                    ) : (

                        <div style={{ overflow: "visible" }}>
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-white">
                                        {(section.columns ?? []).map((column, columnIndex) => (
                                            <TableHead
                                                key={`${section.id}-header-${columnIndex}`}
                                                position={
                                                    column.position ??
                                                    (columnIndex === 0
                                                        ? "first"
                                                        : columnIndex === (section.columns ?? []).length - 1
                                                            ? "last"
                                                            : "middle")
                                                }
                                                sortable={column.sortable}
                                                sortDirection={column.sortDirection}
                                                onSort={column.onSort}
                                                className={column.className}
                                            >
                                                {column.label}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {section.isLoading ? (
                                        <TableRow>
                                            <TableData
                                                colSpan={(section.columns ?? []).length}
                                                className="h-auto min-h-[120px] border-b-0 py-12 align-middle"
                                            >
                                                <div className="flex items-center justify-center">
                                                    <SpinnerLoader size={28} />
                                                </div>
                                            </TableData>
                                        </TableRow>
                                    ) : (section.rows ?? []).length === 0 && section.emptyMessage ? (
                                        <TableRow>
                                            <TableData
                                                colSpan={(section.columns ?? []).length}
                                                className="h-auto min-h-[120px] border-b-0 py-12 align-middle"
                                            >
                                                <p className="text-center text-sm font-normal leading-[120%] text-[#9FA2AB]">
                                                    {section.emptyMessage}
                                                </p>
                                            </TableData>
                                        </TableRow>
                                    ) : (
                                        (section.rows ?? []).map((row, rowIndex) => (
                                            <TableRow key={`${section.id}-row-${rowIndex}`}>
                                                {row.map((cell, cellIndex) => (
                                                    <TableData key={`${section.id}-row-${rowIndex}-cell-${cellIndex}`}>
                                                        {cell}
                                                    </TableData>
                                                ))}
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                    {section.pagination && !section.isError && (section.customContent || (section.rows ?? []).length > 0 || section.isLoading) && (
                        <Pagination
                            currentPage={section.pagination.currentPage}
                            totalItems={section.pagination.totalItems}
                            itemsPerPage={section.pagination.itemsPerPage}
                            onPageChange={section.pagination.onPageChange}
                            onItemsPerPageChange={section.pagination.onItemsPerPageChange}
                            itemsPerPageOptions={section.pagination.itemsPerPageOptions}
                        />
                    )}
                </div>
            ))}
        </div>
    );
}

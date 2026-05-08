"use client";

import type { ReactNode } from "react";
import { Table, TableBody, TableData, TableHead, TableHeader, TableRow } from "./Table";

export interface TableListingColumn {
    label: string;
    position?: "first" | "middle" | "last";
}

export interface TableListingSection {
    id: string;
    title: string;
    titleRightContent?: ReactNode;
    columns: TableListingColumn[];
    rows: ReactNode[][];
    /** When `rows` is empty, show headers + centered message in the table body */
    emptyMessage?: string;
}

interface TableListingCardProps {
    sections: TableListingSection[];
    className?: string;
}

export function TableListingCard({ sections, className = "" }: TableListingCardProps) {
    return (
        <div className={`mb-4 w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 ${className}`}>
            {sections.map((section, index) => (
                <div key={section.id} className={index === sections.length - 1 ? "" : "mb-4"}>
                    <div className="flex items-center justify-between gap-2 cursor-pointer">
                        <div className="flex items-center gap-2">
                            <h2 className="font-inter font-medium text-base leading-[120%] text-[#262D3B]">{section.title}</h2>
                        </div>
                        {section.titleRightContent}
                    </div>

                        <div style={{ overflow: "visible" }}>
                            <div className="mb-6 flex items-center justify-between" style={{ overflow: "visible" }}>
                                <h2 className="text-lg font-semibold text-[#434956]" />
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-white">
                                        {section.columns.map((column, columnIndex) => (
                                            <TableHead
                                                key={`${section.id}-header-${columnIndex}`}
                                                position={
                                                    column.position ??
                                                    (columnIndex === 0
                                                        ? "first"
                                                        : columnIndex === section.columns.length - 1
                                                            ? "last"
                                                            : "middle")
                                                }
                                            >
                                                {column.label}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {section.rows.length === 0 && section.emptyMessage ? (
                                        <TableRow>
                                            <TableData
                                                colSpan={section.columns.length}
                                                className="h-auto min-h-[120px] border-b-0 py-12 align-middle"
                                            >
                                                <p className="text-center text-sm font-normal leading-[120%] text-[#9FA2AB]">
                                                    {section.emptyMessage}
                                                </p>
                                            </TableData>
                                        </TableRow>
                                    ) : (
                                        section.rows.map((row, rowIndex) => (
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
                </div>
            ))}
        </div>
    );
}

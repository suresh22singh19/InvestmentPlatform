"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Dialog } from "@/components/ui";
import { useLazyGetPincodeQuery } from "@/store/api/publicApi";
import { useDebounce } from "@/hooks/useDebounce";

interface PincodeArea {
    id: number;
    name: string;
    tehsils: Array<{
        id: number;
        name: string;
        district: {
            id: number;
            name: string;
            state: {
                id: number;
                name: string;
                country: {
                    id: number;
                    name: string;
                };
            };
        };
    }>;
}

interface PincodeData {
    pincode: number;
    areas: PincodeArea[];
}

interface PincodeSelectionDialogProps {
    open: boolean;
    onClose: () => void;
    pincodeData: PincodeData[];
    searchQuery?: string;
    onSelect: (pincode: number, area: PincodeArea, tehsil: PincodeArea["tehsils"][0]) => void;
}

interface FlattenedPincodeRow {
    pincode: number;
    pincodeWithArea: string;
    area: PincodeArea;
    tehsil: PincodeArea["tehsils"][0];
    district: string;
    state: string;
    country: string;
}

export default function PincodeSelectionDialog({
    open,
    onClose,
    pincodeData: initialPincodeData,
    searchQuery = "",
    onSelect,
}: PincodeSelectionDialogProps) {
    const [selectedRow, setSelectedRow] = useState<{ pincode: number; areaId: number; tehsilId: number } | null>(null);
    const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
    const [pincodeData, setPincodeData] = useState<PincodeData[]>(initialPincodeData || []);
    const [isLoadingPincodes, setIsLoadingPincodes] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const wasFocusedRef = useRef(false);
    
    // Lazy query for pincode - only fetch when needed
    const [getPincode] = useLazyGetPincodeQuery();
    
    // Debounce pincode value - wait 500ms after user stops typing
    const debouncedPincode = useDebounce(localSearchQuery, 500);

    // Reset selected row when dialog opens
    useEffect(() => {
        if (open) {
            setSelectedRow(null);
            setLocalSearchQuery(searchQuery);
            setPincodeData(initialPincodeData || []);
            wasFocusedRef.current = false;
            // Focus input when dialog opens
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [open, searchQuery, initialPincodeData]);
    
    // Restore focus after API call completes
    useEffect(() => {
        if (!isLoadingPincodes && wasFocusedRef.current && inputRef.current) {
            // Restore focus after a short delay to ensure DOM is updated
            setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
        }
    }, [isLoadingPincodes]);

    // Transform flat API response to nested structure
    const transformFlatPincodeData = (flatDataArray: any[]): PincodeData[] => {
        // Group by pincode, then by area, then by tehsil
        interface TehsilData {
            id: number;
            name: string;
            district: {
                id: number;
                name: string;
                state: {
                    id: number;
                    name: string;
                    country: {
                        id: number;
                        name: string;
                    };
                };
            };
        }
        
        interface AreaData {
            id: number;
            name: string;
            tehsils: Map<number, TehsilData>;
        }
        
        type AreaMap = Map<number, AreaData>;
        type PincodeMap = Map<number, AreaMap>;
        
        const pincodeMap: PincodeMap = new Map();
        
        flatDataArray.forEach((item) => {
            const pincode = item.pincode;
            const areaId = item.area_id;
            const tehsilId = item.tehsil_id;
            
            if (!pincodeMap.has(pincode)) {
                pincodeMap.set(pincode, new Map());
            }
            const areaMap = pincodeMap.get(pincode)!;
            
            if (!areaMap.has(areaId)) {
                areaMap.set(areaId, {
                    id: areaId,
                    name: item.area,
                    tehsils: new Map(),
                });
            }
            const area = areaMap.get(areaId)!;
            
            if (!area.tehsils.has(tehsilId)) {
                area.tehsils.set(tehsilId, {
                    id: tehsilId,
                    name: item.tehsil,
                    district: {
                        id: item.district_id,
                        name: item.district,
                        state: {
                            id: item.state_id,
                            name: item.state,
                            country: {
                                id: item.country_id,
                                name: item.country,
                            },
                        },
                    },
                });
            }
        });
        
        // Convert to array format expected by dialog
        const result: PincodeData[] = [];
        pincodeMap.forEach((areaMap, pincode) => {
            const areas: PincodeArea[] = [];
            areaMap.forEach((area) => {
                areas.push({
                    id: area.id,
                    name: area.name,
                    tehsils: Array.from(area.tehsils.values()),
                });
            });
            result.push({
                pincode,
                areas,
            });
        });
        
        return result;
    };

    // Effect to fetch pincode suggestions when debounced pincode has at least 3 digits
    useEffect(() => {
        // Only call API if debounced pincode has at least 3 digits
        if (debouncedPincode.length < 3) {
            if (debouncedPincode.length === 0) {
                // Reset to initial data if input is cleared
                setPincodeData(initialPincodeData || []);
            }
            return;
        }

        setIsLoadingPincodes(true);

        // Call API with debounced pincode value
        getPincode(debouncedPincode).then((result) => {
            setIsLoadingPincodes(false);
            
            // Check if API call was successful and data exists
            if (result.data?.success && result.data?.data) {
                const apiPincodeData = result.data.data;
                
                // Handle flat API response structure (array of flat objects)
                const dataArray = Array.isArray(apiPincodeData) ? apiPincodeData : [apiPincodeData];
                
                // Check if data is in flat format (has area_id, tehsil_id, etc.)
                if (dataArray.length > 0 && dataArray[0] && typeof dataArray[0] === "object" && "area_id" in dataArray[0]) {
                    // Transform flat structure to nested structure
                    const transformedData = transformFlatPincodeData(dataArray);
                    setPincodeData(transformedData);
                } else if (dataArray.length > 0 && dataArray[0] && typeof dataArray[0] === "object" && "pincode" in dataArray[0] && "areas" in dataArray[0]) {
                    // Already in nested format
                    setPincodeData(dataArray as unknown as PincodeData[]);
                } else {
                    setPincodeData([]);
                }
            } else {
                setPincodeData([]);
            }
        }).catch((error) => {
            setIsLoadingPincodes(false);
            console.error("Error fetching pincode data:", error);
            setPincodeData([]);
        });
    }, [debouncedPincode, getPincode, initialPincodeData]);

    // Flatten pincode data: repeat pincode for each area
    const flattenedRows: FlattenedPincodeRow[] = useMemo(() => {
        const rows: FlattenedPincodeRow[] = [];

        pincodeData.forEach((pincodeItem) => {
            pincodeItem.areas.forEach((area) => {
                area.tehsils.forEach((tehsil) => {
                    const pincodeWithArea = `${pincodeItem.pincode} ${area.name}`;
                    rows.push({
                        pincode: pincodeItem.pincode,
                        pincodeWithArea,
                        area,
                        tehsil,
                        district: tehsil.district.name,
                        state: tehsil.district.state.name,
                        country: tehsil.district.state.country.name,
                    });
                });
            });
        });

        return rows;
    }, [pincodeData]);

    const handleRowSelect = (row: FlattenedPincodeRow) => {
        setSelectedRow({
            pincode: row.pincode,
            areaId: row.area.id,
            tehsilId: row.tehsil.id,
        });
    };

    const handleConfirm = () => {
        if (selectedRow) {
            const selectedRowData = flattenedRows.find(
                (row) =>
                    row.pincode === selectedRow.pincode &&
                    row.area.id === selectedRow.areaId &&
                    row.tehsil.id === selectedRow.tehsilId
            );

            if (selectedRowData) {
                onSelect(selectedRowData.pincode, selectedRowData.area, selectedRowData.tehsil);
                setSelectedRow(null);
                onClose();
            }
        }
    };

    const resultsCount = flattenedRows.length;
    const resultsText = resultsCount > 50 ? "50+" : resultsCount.toString();

    return (
        <Dialog
            open={open}
            onClose={onClose}
            title="Pincode"
            width={1440}
            contentPadding="px-6 py-6"
            height="90vh"
        >
            <div className="flex flex-col" style={{ height: '100%', maxHeight: 'calc(90vh - 120px)' }}>
                {/* Fixed Header Section */}
                <div className="flex-shrink-0 space-y-6 pb-4">
                    {/* Search Section */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-[#262D3B]">Pincode</label>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={localSearchQuery}
                                    onChange={(e) => {
                                        // Only allow digits
                                        const numericValue = e.target.value.replace(/\D/g, "").slice(0, 6);
                                        setLocalSearchQuery(numericValue);
                                    }}
                                    onFocus={() => {
                                        wasFocusedRef.current = true;
                                    }}
                                    onBlur={() => {
                                        // Don't clear wasFocusedRef immediately on blur
                                        // Only clear it when dialog closes or user explicitly blurs
                                    }}
                                    className="w-full rounded-[8px] border border-[#D0D5DD] bg-white px-4 py-2.5 text-sm font-medium text-[#262D3B] focus:outline-none focus:ring-2 focus:ring-[#0B8C00]/20"
                                    placeholder={isLoadingPincodes ? "Loading..." : "Enter pincode (min 3 digits)"}
                                    disabled={isLoadingPincodes}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Results Summary */}
                    {localSearchQuery && (
                        <div className="text-sm text-[#434956]">
                            {isLoadingPincodes ? (
                                "Searching..."
                            ) : flattenedRows.length === 0 ? (
                                `No results found for "${localSearchQuery}"`
                            ) : (
                                `${resultsText} results found for "${localSearchQuery}" • Sorted by Relevance`
                            )}
                        </div>
                    )}
                </div>

                {/* Scrollable Table Section */}
                <div className="flex-1 overflow-y-auto" style={{ minHeight: 0, maxHeight: '650px' }}>
                    <div className="relative">
                        <table className="w-full border-separate border-spacing-0 min-w-max">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-white">
                                    <th className="h-[46px] border-t border-b border-l border-[#EDF3EA] rounded-tl-[8px] rounded-bl-[8px] px-5 text-xs font-medium text-[#262D3B] text-left bg-white"></th>
                                    <th className="h-[46px] border-t border-b border-[#EDF3EA] px-5 text-xs font-medium text-[#262D3B] text-left bg-white">Pincode</th>
                                    <th className="h-[46px] border-t border-b border-[#EDF3EA] px-5 text-xs font-medium text-[#262D3B] text-left bg-white">Post Office</th>
                                    <th className="h-[46px] border-t border-b border-[#EDF3EA] px-5 text-xs font-medium text-[#262D3B] text-left bg-white">District</th>
                                    <th className="h-[46px] border-t border-b border-[#EDF3EA] px-5 text-xs font-medium text-[#262D3B] text-left bg-white">Tehsil/Area</th>
                                    <th className="h-[46px] border-t border-b border-[#EDF3EA] px-5 text-xs font-medium text-[#262D3B] text-left bg-white">State</th>
                                    <th className="h-[46px] border-t border-b border-r border-[#EDF3EA] rounded-tr-[8px] rounded-br-[8px] px-5 text-xs font-medium text-[#262D3B] text-left bg-white">Country</th>
                                </tr>
                            </thead>
                            <tbody>
                                {flattenedRows.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="h-[46px] border-b border-[#EDF3EA] px-5 text-sm leading-[120%] text-[#434956] py-12 text-center"
                                        >
                                            No pincodes found
                                        </td>
                                    </tr>
                                ) : (
                                    flattenedRows.map((row, index) => {
                                        const isSelected =
                                            selectedRow?.pincode === row.pincode &&
                                            selectedRow?.areaId === row.area.id &&
                                            selectedRow?.tehsilId === row.tehsil.id;

                                        return (
                                            <tr
                                                key={`${row.pincode}-${row.area.id}-${row.tehsil.id}-${index}`}
                                                className="bg-white transition-colors hover:bg-[#F7FAF7] cursor-pointer"
                                                onClick={() => handleRowSelect(row)}
                                            >
                                                <td className="h-[46px] border-b border-l border-[#EDF3EA] px-5 text-sm leading-[120%] text-[#262D3B]">
                                                    <div className="flex items-center">
                                                        <div className="relative flex h-4 w-4 items-center justify-center">
                                                            <input
                                                                type="radio"
                                                                checked={isSelected}
                                                                onChange={() => handleRowSelect(row)}
                                                                className="h-4 w-4 cursor-pointer appearance-none rounded-full border-2 border-[#D0D5DD] checked:border-[#0B8C00]"
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                            {isSelected && (
                                                                <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0B8C00]" />
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="h-[46px] border-b border-[#EDF3EA] px-5 text-sm leading-[120%] text-[#434956]">{row.pincode}</td>
                                                <td className="h-[46px] border-b border-[#EDF3EA] px-5 text-sm leading-[120%] text-[#434956]">{row.area.name}</td>
                                                <td className="h-[46px] border-b border-[#EDF3EA] px-5 text-sm leading-[120%] text-[#434956]">{row.district}</td>
                                                <td className="h-[46px] border-b border-[#EDF3EA] px-5 text-sm leading-[120%] text-[#434956]">{row.tehsil.name}</td>
                                                <td className="h-[46px] border-b border-[#EDF3EA] px-5 text-sm leading-[120%] text-[#434956]">{row.state}</td>
                                                <td className="h-[46px] border-b border-r border-[#EDF3EA] px-5 text-sm leading-[120%] text-[#434956]">{row.country}</td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Fixed Action Buttons */}
                <div className="flex-shrink-0 flex items-center justify-end gap-3 border-t border-[#EDF3EA] pt-4 mt-4 bg-white sticky bottom-0 z-20">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-10 items-center justify-center rounded-[8px] border border-[#D0D5DD] bg-white px-6 text-sm font-medium text-[#434956] transition-colors hover:bg-[#F7FAF7]"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={!selectedRow}
                        className="flex h-10 items-center justify-center rounded-[8px] bg-[#0B8C00] px-6 text-sm font-medium text-white transition-colors hover:bg-[#0A7A00] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </Dialog>
    );
}

"use client";

import Image from "next/image";
import { useState, useMemo, useEffect, useRef } from "react";
import NoDataBox from "@/components/registration/NoDataBox";
import { ScrollableContainer, TableSearchInput } from "../ui";
import { useGetPatientEntriesQuery, type PatientEntry } from "@/store/api/registrationApi";
import { useDebounce } from "@/hooks/useDebounce";

interface TokenItem {
    id: string;
    name: string;
    patientId: string;
    date: string;
    time: string;
    tokenNumber: string;
}

interface TokenPanelProps {
    onTokenClick?: (entry: PatientEntry) => void;
    selectedTokenId?: string | number | null; // ID of currently selected token
    onRefetchReady?: (refetch: () => void) => void; // Callback to expose refetch function to parent
}

export default function TokenPanel({ onTokenClick, selectedTokenId, onRefetchReady }: TokenPanelProps = {}) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [itemsToShow, setItemsToShow] = useState(4);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [limit] = useState(100);
    const prevSearchTermRef = useRef(searchTerm);
    const prevSelectedTokenIdRef = useRef<string | number | null | undefined>(selectedTokenId);
    
    // Track selectedTokenId changes to ensure highlighting updates
    useEffect(() => {
        if (prevSelectedTokenIdRef.current !== selectedTokenId) {
            prevSelectedTokenIdRef.current = selectedTokenId;
        }
    }, [selectedTokenId]);

    const handleToggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    // Debounce search to avoid too many API calls
    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    
    // Trim the debounced search term to remove leading and trailing spaces
    const trimmedSearchTerm = debouncedSearchTerm.trim();
    const searchParam = trimmedSearchTerm || "";

    // Reset to first page when search term changes
    useEffect(() => {
        if (prevSearchTermRef.current !== searchTerm) {
            prevSearchTermRef.current = searchTerm;
            setCurrentPage(1);
        }
    }, [searchTerm]);

    // Fetch patient entries from API
    const { data: patientEntriesData, isLoading, isError, refetch } = useGetPatientEntriesQuery({
        branchId: 1,
        search: searchParam,
        page: currentPage,
        limit: limit,
    });

    // Expose refetch function to parent component (only once when refetch is available)
    useEffect(() => {
        if (onRefetchReady && refetch) {
            onRefetchReady(() => {
                refetch();
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refetch]); // Only depend on refetch, not onRefetchReady to avoid infinite loop

    // Get raw entries data for passing to click handler
    const rawEntries: PatientEntry[] = useMemo(() => {
        const entries = Array.isArray(patientEntriesData) 
            ? patientEntriesData 
            : patientEntriesData?.data || [];
        return entries;
    }, [patientEntriesData]);
        
    // Transform API data to TokenItem format
    const tokens: TokenItem[] = useMemo(() => {
        if (!rawEntries || rawEntries.length === 0) return [];
        
        return rawEntries.map((entry) => {
            // Parse createdAt to extract date and time
            let date = "";
            let time = "";
            if (entry.createdAt) {
                try {
                    const dateObj = new Date(entry.createdAt);
                    // Format date as DD-MM-YYYY
                    const day = String(dateObj.getDate()).padStart(2, '0');
                    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const year = dateObj.getFullYear();
                    date = `${day}-${month}-${year}`;
                    
                    // Format time as HH:MM AM/PM
                    const hours = dateObj.getHours();
                    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
                    const ampm = hours >= 12 ? 'PM' : 'AM';
                    const displayHours = hours % 12 || 12;
                    time = `${String(displayHours).padStart(2, '0')}:${minutes} ${ampm}`;
                } catch (error) {
                    console.error("Error parsing date:", error);
                }
            }
            
            return {
                id: String(entry.id || ""),
                name: entry.name || "",
                patientId: entry.contactNo || entry.aadharCardNo || String(entry.id || ""),
                date: date,
                time: time,
                tokenNumber: entry.opdToken || entry.registerToken || "",
            };
        });
    }, [rawEntries]);

    const handleViewMore = () => {
        setItemsToShow(10); // Show up to 10 tokens (or all if fewer)
    };

    // Filter tokens based on search term (client-side filtering as backup)
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filteredTokens = normalizedSearch
        ? tokens.filter((token) => {
            const haystack = `${token.name} ${token.patientId} ${token.tokenNumber}`.toLowerCase();
            return haystack.includes(normalizedSearch);
        })
        : tokens;

    const displayedTokens =
        itemsToShow >= 10 && filteredTokens.length > 10
            ? filteredTokens
            : filteredTokens.slice(0, itemsToShow);
    const hasMoreItems = filteredTokens.length > itemsToShow && itemsToShow < 10;

    return (
        <div className="w-full relative" style={{ overflow: "visible" }}>
            <div className="w-full rounded-[20px] border border-[#E3EEE1] bg-white px-4 pb-5 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]" style={{ overflow: "visible" }}>
                <div
                    className={`flex items-center justify-between gap-2 ${isExpanded ? "mb-[20px]" : "mb-[0px]"} cursor-pointer`}
                    onClick={handleToggleExpand}
                >
                    <div className="flex items-center gap-2">
                        <Image src="/icons/token.svg" alt="Token Icon" width={20} height={20} />
                        <h2 className="font-[Inter] font-medium text-base leading-[120%] text-[#262D3B]">Token</h2>
                    </div>
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className={`transition-transform duration-300 ${isExpanded ? "" : "rotate-180"}`}
                    >
                        <path
                            d="M3.75 12.6254C3.73365 12.6254 3.71726 12.6218 3.70215 12.6156C3.68694 12.6093 3.67277 12.5999 3.66113 12.5883C3.64961 12.5767 3.64006 12.5633 3.63379 12.5482C3.62753 12.5331 3.62407 12.5167 3.62402 12.5004C3.62402 12.4841 3.6276 12.4676 3.63379 12.4525C3.64009 12.4373 3.64949 12.4231 3.66113 12.4115L9.91113 6.1615C9.92274 6.14988 9.93697 6.14045 9.95215 6.13416C9.96724 6.12794 9.98367 6.12439 10 6.12439C10.0163 6.12443 10.0328 6.12791 10.0479 6.13416L10.0879 6.1615L16.3379 12.4115C16.3614 12.435 16.375 12.4671 16.375 12.5004C16.3749 12.5335 16.3613 12.5648 16.3379 12.5883C16.3145 12.6117 16.2831 12.6253 16.25 12.6254C16.2168 12.6254 16.1846 12.6118 16.1611 12.5883L10.3535 6.77966L10 6.42615L3.83789 12.5883C3.82632 12.5998 3.81295 12.6093 3.79785 12.6156C3.78275 12.6219 3.76634 12.6253 3.75 12.6254Z"
                            stroke="#434956"
                        />
                    </svg>
                </div>
                {isExpanded ? (
                    <>
                        <div className="mb-3">
                            <TableSearchInput
                                value={searchTerm}
                                onChange={(value) => {
                                    // Trim spaces from input value
                                    const trimmedValue = value.trimStart();
                                    setSearchTerm(trimmedValue);
                                    setItemsToShow(4);
                                }}
                                placeholder="Search..."
                            />
                        </div>
                        {isLoading ? (
                            <div className="py-8 text-center text-sm text-[#9CA3AF]">Loading tokens...</div>
                        ) : isError ? (
                            <NoDataBox message="Error loading tokens" />
                        ) : displayedTokens.length > 0 ? (
                            <div className="w-full max-w-md mx-auto">
                                <div className="mt-1" style={{ overflow: "visible" }}>
                                    <ScrollableContainer
                                        maxHeight="400px"
                                        className="pr-2"
                                        showScrollbar={true}
                                    >
                                        <div>
                                            {displayedTokens.length > 0 && (
                                                displayedTokens.map((token, index) => {
                                                    const entry = rawEntries.find(e => String(e.id) === token.id);
                                                    const isSelected = selectedTokenId !== null && selectedTokenId !== undefined && String(selectedTokenId) === token.id;
                                                    return (
                                                        <div
                                                            key={token.id}
                                                            onClick={() => entry && onTokenClick?.(entry)}
                                                            className={`cursor-pointer px-3 py-2 rounded-[12px] transition-colors duration-300 ease-in-out mb-3 w-auto ${
                                                                isSelected
                                                                    ? "bg-[rgba(11,140,0,0.15)] border-2 border-[#0B8C00]"
                                                                    : "bg-[rgba(223,224,226,0.05)] border border-[#DFE0E2] hover:bg-[rgba(11,140,0,0.05)] hover:border-[#0B8C00] focus:bg-[rgba(11,140,0,0.05)] focus:border-[#0B8C00]"
                                                            }`}
                                                        >
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div className="leading-[12px]">
                                                                    <h4 className="font-inter font-medium text-base leading-[120%] text-[#262D3B]">
                                                                        {token.name}
                                                                    </h4>
                                                                    <span className="font-inter font-normal text-xs leading-[120%] text-[#434956]">
                                                                        {token.patientId}
                                                                    </span>
                                                                </div>
                                                                <div className="px-4 py-1.5 bg-white border border-[rgba(22,163,74,0.2)] rounded-[30px] font-inter font-normal text-xs leading-[120%] text-[#16A34A] w-auto text-nowrap">
                                                                    {token.tokenNumber}
                                                                </div>
                                                            </div>

                                                            <div className="flex justify-between">
                                                                <span className="font-inter font-normal text-xs leading-[120%] text-[#434956]">
                                                                    📅 {token.date} • ⏰ {token.time}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </ScrollableContainer>

                                    {hasMoreItems && displayedTokens.length > 0 && (
                                        <div className="flex justify-center mt-4">
                                            <button
                                                onClick={handleViewMore}
                                                className="cursor-pointer flex flex-row justify-center items-center px-3 py-1.5 gap-2 bg-[rgba(11,140,0,0.15)] rounded-[32px] font-inter font-medium text-xs leading-[120%] text-center text-[#0B8C00] hover:bg-[rgba(11,140,0,0.25)] transition-colors"
                                            >
                                                <Image src="/icons/Eye.svg" alt="Eye icon" width={16} height={16} />
                                                View More
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <NoDataBox message="No Data Found" />
                        )}
                    </>
                ) : null}
            </div>
        </div>
    );
}


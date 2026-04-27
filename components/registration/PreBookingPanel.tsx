"use client";

import Image from "next/image";
import { Button } from "../ui/Button";
import { useState, useRef, useEffect, useMemo } from "react";
import DateFilterDropdown from "./DateFilterDropdown";
import { ScrollableContainer, TableSearchInput, Tooltip } from "../ui";
import NoDataBox from "./NoDataBox";
import { useGetPreBookingsListQuery, type PreBookingItem } from "@/store/api/registrationApi";
import { useDebounce } from "@/hooks/useDebounce";

interface BookingItem {
    id: string;
    name: string;
    patientId: string;
    status: string;
    date: string;
    time: string;
    bookingNumber: string;
    patientMobile: string;
    period: "past" | "present" | "future" | "";
}

interface PreBookingPanelProps {
    onPreBookingClick?: (preBooking: PreBookingItem | null) => void;
    selectedPreBookingId?: string | number | null; // ID of currently selected pre-booking
    onRefetchReady?: (refetch: () => void) => void; // Callback to expose refetch function
    /** Branch for pre-bookings list (defaults to 1 if omitted — prefer auth branch from parent) */
    branchId?: number | string;
}

type TimePeriod = "past" | "present" | "future" | "";

export default function PreBookingPanel({
    onPreBookingClick,
    selectedPreBookingId,
    onRefetchReady,
    branchId: branchIdProp,
}: PreBookingPanelProps = {}) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("present");
    const [itemsToShow, setItemsToShow] = useState(4);
    const [searchTerm, setSearchTerm] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const filterRef = useRef<HTMLDivElement>(null);
    const bookingsContainerRef = useRef<HTMLDivElement>(null);

    const handleToggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    // Debounce search to avoid too many API calls
    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    const searchParam = debouncedSearchTerm.trim() || "";

    const listBranchId = branchIdProp ?? 1;

    // Fetch pre-bookings from API — refetch whenever the panel remounts (e.g. sidebar closed then reopened)
    const { data: preBookingsData, isLoading, isError, refetch } = useGetPreBookingsListQuery(
        {
            branchId: listBranchId,
            page: 1,
            limit: 25,
            search: searchParam,
            fromDate: fromDate,
            toDate: toDate,
            dateFilter: selectedPeriod || "",
        },
        { refetchOnMountOrArgChange: true }
    );

    // Expose refetch to parent. RTK throws if the panel was unmounted (subscription ended) — swallow that.
    useEffect(() => {
        if (!onRefetchReady || !refetch) return;
        onRefetchReady(() => {
            void Promise.resolve(refetch()).catch((e: unknown) => {
                const msg = e instanceof Error ? e.message : String(e);
                if (!msg.includes("Cannot refetch a query that has not been started yet")) {
                    console.warn("Pre-bookings refetch failed:", e);
                }
            });
        });
    }, [onRefetchReady, refetch]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
        };

        if (isFilterOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isFilterOpen]);

    const handleFilterClick = () => {
        setIsFilterOpen(!isFilterOpen);
    };

    const handleFilter = (filterFromDate: string, filterToDate: string) => {
        setFromDate(filterFromDate);
        setToDate(filterToDate);
        setItemsToShow(4); // Reset to 4 items when filter is applied
        setIsFilterOpen(false);
    };

    const handleClear = () => {
        setFromDate("");
        setToDate("");
        setItemsToShow(4); // Reset to 4 items when filter is cleared
    };

    const handlePeriodChange = (period: TimePeriod) => {
        setSelectedPeriod(period);
        setItemsToShow(4); // Reset to 4 items when changing period
    };

    const handleViewMore = () => {
        setItemsToShow(10); // Show 6 more items (total 10)
    };

    // Get raw pre-booking items for passing to click handler
    const rawPreBookings: PreBookingItem[] = useMemo(() => {
        if (!preBookingsData) return [];
        
        // Check if response is successful
        if (preBookingsData.success === false) {
            return [];
        }
        
        // Handle response structure: data.preBookings array
        let dataArray: any[] = [];
        
        if (preBookingsData.data && Array.isArray(preBookingsData.data.preBookings)) {
            // API returns { data: { preBookings: [...] } }
            dataArray = preBookingsData.data.preBookings;
        } else if (Array.isArray(preBookingsData.data)) {
            // Fallback: if data is directly an array
            dataArray = preBookingsData.data;
        } else {
            dataArray = [];
        }
        
        return dataArray;
    }, [preBookingsData]);

    // Transform API data to BookingItem format
    const bookings: BookingItem[] = useMemo(() => {
        if (rawPreBookings.length === 0) return [];

        return rawPreBookings.map((item) => {
            // Format date from API (assuming format like "2025-11-15" or ISO string)
            const formatDate = (dateStr?: string) => {
                if (!dateStr) return "";
                try {
                    const date = new Date(dateStr);
                    const day = String(date.getDate()).padStart(2, "0");
                    const month = String(date.getMonth() + 1).padStart(2, "0");
                    const year = date.getFullYear();
                    return `${day}-${month}-${year}`;
                } catch {
                    return dateStr;
                }
            };

            // Format time from API (assuming format like "09:30:00" or "09:30 AM")
            const formatTime = (timeStr?: string) => {
                if (!timeStr) return "";
                // If already in 12-hour format, return as is
                if (timeStr.includes("AM") || timeStr.includes("PM")) {
                    return timeStr;
                }
                // Convert 24-hour to 12-hour format
                try {
                    const [hours, minutes] = timeStr.split(":");
                    const hour24 = parseInt(hours, 10);
                    const hour12 = hour24 > 12 ? hour24 - 12 : hour24 === 0 ? 12 : hour24;
                    const ampm = hour24 >= 12 ? "PM" : "AM";
                    return `${hour12}:${minutes} ${ampm}`;
                } catch {
                    return timeStr;
                }
            };

            // Get patient name - API returns "patientName" field
            const patientName = item.patientName || "Unknown";
            
            // Get patient ID (UHID) - show complete UHID
            const patientId = item.uhid || "N/A";
            const formattedPatientId = patientId || "N/A";
            const patientMobile = item.contactNumber || "N/A";

            // Get booking number - use id as booking number
            const bookingNumber = item.id ? `#${item.id}` : "#N/A";

            // Get status and capitalize first letter
            const status = item.status || "Pre-booking";
            const capitalizedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

            // Get appointment time - API returns "appointmentTime" field
            const appointmentTime = item.appointmentTime || item.timeSlot || "";

            return {
                id: String(item.id),
                name: patientName,
                patientId: formattedPatientId,
                status: capitalizedStatus,
                date: formatDate(item.appointmentDate),
                time: formatTime(appointmentTime),
                bookingNumber: bookingNumber,
                patientMobile: patientMobile,
                period: selectedPeriod, // API already filters by dateFilter
            };
        });
    }, [rawPreBookings, selectedPeriod]);

    // API handles search filtering, so we use bookings directly
    const filteredBookings = bookings;

    // Get bookings to display
    // If itemsToShow is 10 and there are more than 10 items, show all and enable scroll
    // Otherwise, show limited items
    const displayedBookings = itemsToShow >= 10 && filteredBookings.length > 10
        ? filteredBookings
        : filteredBookings.slice(0, itemsToShow);
    const hasMoreItems = filteredBookings.length > itemsToShow && itemsToShow < 10;

    // Get period label
    const getPeriodLabel = () => {
        switch (selectedPeriod) {
            case "past":
                return "Past Bookings";
            case "present":
                return "Present Bookings";
            case "future":
                return "Future Bookings";
            case "":
                return "All Bookings";
            default:
                return "All Bookings";
        }
    };

    const maskPhoneNumber = (phoneNumber: string | null | undefined): string => {
        if (!phoneNumber) return "N/A";
        const cleaned = phoneNumber.replace(/\D/g, ""); // Remove non-digits
        if (cleaned.length < 4) return phoneNumber; // If less than 4 digits, return as is
        const last4 = cleaned.slice(-4);
        const masked = "XXXXXX" + last4;
        return masked;
      };

    return (
        <div className="w-full relative" style={{ overflow: 'visible' }}>
            <div className="w-full rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]" style={{ overflow: 'visible' }}>
                <div
                    className={`flex items-center justify-between gap-2 ${isExpanded ? "mb-[20px]" : "mb-[0px]"} cursor-pointer`}
                    onClick={handleToggleExpand}
                >
                    <div className="flex items-center gap-2">
                        <Image src="/icons/PreBookingCheck.svg" alt="Prebooking Icon" width={18} height={18} />
                        <h2 className="font-[Inter] font-medium text-base leading-[120%] text-[#262D3B]">Pre Booking</h2>
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
                    <div className="w-full max-w-md mx-auto">
                    {/* Filter buttons - always visible */}
                    <div className="flex items-center justify-between gap-1 mb-4">
                        <button 
                            onClick={() => handlePeriodChange("present")}
                            className={`prebooking-media cursor-pointer flex flex-row justify-center items-center px-4 py-2 gap-3 rounded-full w-full h-[32px] font-inter not-italic font-medium text-[14px] leading-[120%] transition-colors ${selectedPeriod === "present"
                                    ? "bg-[#0B8C00] text-[#ffffff]"
                                    : "bg-[rgba(11,140,0,0.05)] text-[#434956]"
                                }`}
                        >
                            Present
                        </button>
                        <button
                            onClick={() => handlePeriodChange("past")}
                            className={`prebooking-media cursor-pointer flex flex-row justify-center items-center px-4 py-2 gap-3 rounded-full w-full h-[32px] font-inter not-italic font-medium text-[14px] leading-[120%] transition-colors ${selectedPeriod === "past"
                                    ? "bg-[#0B8C00] text-[#ffffff]"
                                    : "bg-[rgba(11,140,0,0.05)] text-[#434956]"
                                }`}
                        >
                            Past
                        </button>
                        <button
                            onClick={() => handlePeriodChange("future")}
                            className={`prebooking-media cursor-pointer flex flex-row justify-center items-center px-4 py-2 gap-3 rounded-full w-full h-[32px] font-inter not-italic font-medium text-[14px] leading-[120%] transition-colors ${selectedPeriod === "future"
                                    ? "bg-[#0B8C00] text-[#ffffff]"
                                    : "bg-[rgba(11,140,0,0.05)] text-[#434956]"
                                }`}
                        >
                            Future
                        </button>
                    </div>

                    <div className="mt-4" style={{ overflow: 'visible' }}>
                        <div className="flex items-center justify-between mb-4 relative" style={{ overflow: 'visible' }}>
                            <h2 className="font-inter not-italic font-medium text-[16px] leading-[120%] text-[#262D3B]">
                                {getPeriodLabel()}
                            </h2>
                            <div className="relative z-40" ref={filterRef} style={{ overflow: 'visible' }}>
                                <button
                                    onClick={handleFilterClick}
                                    className="cursor-pointer hover:opacity-80 transition-opacity"
                                >
                                    <Image src="/icons/filter.svg" alt="filter" width={24} height={24} />
                                </button>
                                {isFilterOpen && (
                                    <div className="absolute right-0 top-full mt-2 z-40" style={{ position: 'absolute' }}>
                                        <DateFilterDropdown
                                            onFilter={handleFilter}
                                            onClear={handleClear}
                                            initialFromDate={fromDate}
                                            initialToDate={toDate}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Search by name or phone number - always visible */}
                        <div className="mb-4">
                            <TableSearchInput
                                value={searchTerm}
                                onChange={(value) => {
                                    setSearchTerm(value);
                                    setItemsToShow(4);
                                }}
                                placeholder="Search by name or UHID number"
                            />
                        </div>

                        {/* List area - shows loading, error, or data */}
                        {isLoading ? (
                            <div className="text-center py-8 text-[#434956] font-inter font-normal text-sm">
                                Loading...
                            </div>
                        ) : isError ? (
                            <div className="text-center py-8 text-red-500 font-inter font-normal text-sm">
                                Error loading pre-bookings. Please try again.
                            </div>
                        ) : filteredBookings.length === 0 ? (
                            <div className="text-center py-8 text-[#434956] font-inter font-normal text-sm">
                                No Data Found
                            </div>
                        ) : (
                            <>
                                <ScrollableContainer
                                    maxHeight="400px"
                                    className="pr-2"
                                    showScrollbar={true}
                                >
                                    <div ref={bookingsContainerRef}>
                                        {displayedBookings.length > 0 ? (
                                            displayedBookings.map((booking) => {
                                                const rawPreBooking = rawPreBookings.find(pb => String(pb.id) === booking.id);
                                                const isSelected = selectedPreBookingId !== null && selectedPreBookingId !== undefined && String(selectedPreBookingId) === booking.id;
                                                
                                                const isNonClickable = selectedPeriod === "past" || selectedPeriod === "future";
                                                return (
                                                <div
                                                    key={booking.id}
                                                    onClick={() => {
                                                        if (isNonClickable) return;
                                                        if (rawPreBooking) {
                                                            if (isSelected) {
                                                                onPreBookingClick?.(null);
                                                            } else {
                                                                onPreBookingClick?.(rawPreBooking);
                                                            }
                                                        }
                                                    }}
                                                    className={`px-3 py-2 rounded-[12px] transition-colors duration-300 ease-in-out mb-3 w-auto ${
                                                        isNonClickable
                                                            ? "cursor-not-allowed bg-[rgba(223,224,226,0.05)] border border-[#DFE0E2] opacity-80"
                                                            : isSelected
                                                                ? "cursor-pointer bg-[rgba(11,140,0,0.15)] border-2 border-[#0B8C00]"
                                                                : "cursor-pointer bg-[rgba(223,224,226,0.05)] border border-[#DFE0E2] hover:bg-[rgba(11,140,0,0.05)] hover:border-[#0B8C00] focus:bg-[rgba(11,140,0,0.05)] focus:border-[#0B8C00]"
                                                    }`}
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="leading-[12px]">
                                                            <Tooltip content={booking.name}>
                                                            <h6 className="font-inter font-medium text-base leading-[120%] text-[#262D3B] min-w-0 max-w-[175px] truncate" >{booking.name}</h6>
                                                                </Tooltip>
                                                            {/* <span className="font-inter font-normal text-xs leading-[120%] text-[#434956]">{booking.patientId}</span> */}
                                                            <span className="font-inter font-normal text-xs leading-[120%] text-[#434956]">{booking.patientMobile ? maskPhoneNumber(booking.patientMobile) : "N/A"}</span>
                                                        </div>
                                                        <div className="px-3 py-1.5 bg-white border border-[rgba(22,163,74,0.2)] rounded-[30px] font-inter font-normal text-xs leading-[120%] text-[#16A34A] w-auto text-nowrap">
                                                            {booking.status}
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-between">
                                                        <span className="font-inter font-normal text-xs leading-[120%] text-[#434956]">📅 {booking.date} • ⏰ {booking.time}</span>
                                                        <span className="font-inter font-normal text-xs leading-[120%] text-[#434956]">{booking.bookingNumber}</span>
                                                    </div>
                                                </div>
                                                );
                                            })
                                        ) : (
                                            <div className="text-center py-8 text-[#434956] font-inter font-normal text-sm">
                                                No bookings found
                                            </div>
                                        )}
                                    </div>
                                </ScrollableContainer>

                                {hasMoreItems && (
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
                            </>
                        )}
                    </div>
                </div>
                ) : null}
            </div>
        </div>
    );
}


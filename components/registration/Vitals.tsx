"use client";

import { useState } from "react";
import Image from "next/image";
import { ScrollableContainer } from "../ui";
import NoDataBox from "./NoDataBox";

interface VitalsData {
    bloodPressure?: string;
    sugarLevel?: string;
    temperature?: string;
    heartRate?: string;
    spo2?: string;
}

interface VitalsProps {
    vitals?: VitalsData;
}

export default function Vitals({
    vitals = {
        bloodPressure: "125/85",
        sugarLevel: "115",
        temperature: "98",
        heartRate: "92",
        spo2: "98",
    },
}: VitalsProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    const handleToggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    const hasVitals = vitals && (
        vitals.bloodPressure ||
        vitals.sugarLevel ||
        vitals.temperature ||
        vitals.heartRate ||
        vitals.spo2
    );

    return (
        <div className="mb-4 w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
            <div
                className={`flex items-center justify-between gap-2 ${isExpanded ? "mb-[20px]" : "mb-[0px]"} cursor-pointer`}
                onClick={handleToggleExpand}
            >
                <div className="flex items-center gap-2 ">
                    <Image src="/icons/VitalsIcon.svg" alt="Vitals Info Icon" width={20} height={20} />
                    <h2 className="font-inter font-medium text-base leading-[120%] text-[#262D3B]">Vitals</h2>
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
                    {hasVitals ? (
                        <div className="Room-content mt-5">
                            <ScrollableContainer maxHeight="800px" className="pr-2" showScrollbar={true}>
                                <div className="max-w-md space-y-3">
                                    {/* Row 1 */}
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Blood Pressure */}
                                        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                                            <div className="flex items-center gap-2 font-inter text-[14px] leading-[120%] font-medium text-[#434956]">
                                                <span className="w-2 h-2 rotate-45 bg-blue-600 inline-block"></span>
                                                Blood Pressure
                                            </div>
                                            <div className="mt-1 font-inter text-[20px] leading-[130%] font-semibold text-[#434956]">
                                                {vitals.bloodPressure || "N/A"} <span className="font-medium">bp</span>
                                            </div>
                                        </div>

                                        {/* Sugar Level */}
                                        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                                            <div className="flex items-center gap-2 font-inter text-[14px] leading-[120%] font-medium text-[#434956]">
                                                <span className="w-2 h-2 rotate-45 bg-blue-600 inline-block"></span>
                                                Sugar Level
                                            </div>
                                            <div className="mt-1 font-inter text-[20px] leading-[130%] font-semibold text-[#434956]">
                                                {vitals.sugarLevel || "N/A"} <span className="font-medium">mg/dL</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Row 2 */}
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Temperature */}
                                        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                                            <div className="flex items-center gap-2 font-inter text-[14px] leading-[120%] font-medium text-[#434956]">
                                                <span className="w-2 h-2 rotate-45 bg-blue-600 inline-block"></span>
                                                Temperature
                                            </div>
                                            <div className="mt-1 font-inter text-[20px] leading-[130%] font-semibold text-[#434956]">
                                                {vitals.temperature || "N/A"}°C
                                            </div>
                                        </div>

                                        {/* Heart Rate */}
                                        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                                            <div className="flex items-center gap-2 font-inter text-[14px] leading-[120%] font-medium text-[#434956]">
                                                <span className="w-2 h-2 rotate-45 bg-blue-600 inline-block"></span>
                                                Heart Rate
                                            </div>
                                            <div className="mt-1 font-inter text-[20px] leading-[130%] font-semibold text-[#434956]">
                                                {vitals.heartRate || "N/A"} <span className="font-medium">bpm</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* SPO2 */}
                                    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                                        <div className="flex items-center gap-2 font-inter text-[14px] leading-[120%] font-medium text-[#434956]">
                                            <span className="w-2 h-2 rotate-45 bg-blue-600 inline-block"></span>
                                            SPO2
                                        </div>
                                        <div className="mt-1 font-inter text-[20px] leading-[130%] font-semibold text-[#434956]">
                                            {vitals.spo2 || "N/A"} %
                                        </div>
                                    </div>
                                </div>
                            </ScrollableContainer>
                        </div>
                    ) : (
                        <NoDataBox message="No Data Found" />
                    )}
                </>
            ) : null}
        </div>
    );
}

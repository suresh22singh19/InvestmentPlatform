"use client";

import { useState } from "react";
import Image from "next/image";
import { ScrollableContainer } from "../ui";
import NoDataBox from "./NoDataBox";

export interface TherapyItem {
    id: number | string;
    therapyName: string;
    date: string;
    doctor: string;
    therapist: string;
    doctorRemark?: string | null;
    therapistRemark?: string | null;
    status?: string;
}

interface TherapyProps {
    therapies?: TherapyItem[];
}

export default function Therapy({
    therapies,
}: TherapyProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    const handleToggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    const hasTherapies = Array.isArray(therapies) && therapies.length > 0;

    return (
        <div className="w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-4 pb-5 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)]">
            <div
                className={`flex items-center justify-between gap-2 ${isExpanded ? "mb-[20px]" : "mb-[0px]"} cursor-pointer`}
                onClick={handleToggleExpand}
            >
                <div className="flex items-center gap-2 ">
                    <Image src="/icons/VitalsIcon.svg" alt="Vitals Info Icon" width={20} height={20} />
                    <h2 className="font-inter font-medium text-base leading-[120%] text-[#262D3B]">Therapy</h2>
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
                    {hasTherapies ? (
                        <div className="Room-content mt-5">
                            <ScrollableContainer maxHeight="1000px" className="pr-2" showScrollbar={true}>
                                <div className="max-w-md space-y-4">
                                    {therapies.map((therapy) => (
                                        <div key={therapy.id} className="rounded-xl border border-[#DFE0E2] bg-white px-3 py-3 mb-3">
                                            <div className="flex justify-between items-center mb-1">
                                                <h3 className="font-inter text-[16px] leading-[120%] font-medium text-[#262D3B]">
                                                    {therapy.therapyName}
                                                </h3>
                                                <div className="flex items-center gap-2">
                                                    {therapy.status && (
                                                        <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                                                            therapy.status.toLowerCase() === "completed"
                                                                ? "bg-green-100 text-green-700"
                                                                : "bg-blue-100 text-blue-700"
                                                        }`}>
                                                            {therapy.status}
                                                        </span>
                                                    )}
                                                    <span className="font-inter text-[12px] leading-[120%] font-normal text-[#434956]">
                                                        📅 {therapy.date}
                                                    </span>
                                                </div>
                                            </div>

                                            <p className="font-inter text-[12px] leading-[120%] font-normal text-[#434956] mb-[6px]">
                                                Doctor: {therapy.doctor} • Therapist: {therapy.therapist}
                                            </p>

                                            {therapy.doctorRemark && therapy.doctorRemark !== "N/A" && (
                                                <p className="mb-[6px] font-inter text-[14px] leading-[120%] font-normal text-[#434956]">
                                                    <span className="font-inter text-[14px] leading-[120%] font-bold text-[#434956]">
                                                        Doctor Remark:
                                                    </span>{" "}
                                                    {therapy.doctorRemark}
                                                </p>
                                            )}

                                            <p className="font-inter text-[14px] leading-[120%] font-normal text-[#434956]">
                                                <span className="font-inter text-[14px] leading-[120%] font-bold text-[#434956]">
                                                    Therapist Remark:
                                                </span>{" "}
                                                {therapy.therapistRemark || "N/A"}
                                            </p>
                                        </div>
                                    ))}
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

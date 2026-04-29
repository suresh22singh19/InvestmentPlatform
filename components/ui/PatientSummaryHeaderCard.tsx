"use client";

import Image from "next/image";

export interface PatientSummaryInfoItem {
    id: string;
    iconSrc: string;
    iconAlt: string;
    label: string;
    value: string;
}

interface PatientSummaryHeaderCardProps {
    patientName: string;
    infoItems: PatientSummaryInfoItem[];
    balanceIconSrc?: string;
    balanceIconAlt?: string;
    balanceValue?: string;
    className?: string;
}

export function PatientSummaryHeaderCard({
    patientName,
    infoItems,
    balanceIconSrc = "/icons/moneyicon.svg",
    balanceIconAlt = "Money",
    balanceValue,
    className = "",
}: PatientSummaryHeaderCardProps) {
    return (
        <div className={`data mt-5 ${className}`}>
            <div>
                <h4 className="font-inter font-semibold text-[32px] leading-[120%] text-[#262D3B]">{patientName}</h4>
            </div>
            <div className="flex justify-between items-end">
                <div className="flex gap-10 mt-5">
                    {infoItems.map((item) => (
                        <div key={item.id} className="flex gap-3 items-center">
                            <div className="flex items-center justify-center w-[40px] h-[40px] bg-white border border-[#EBECED] rounded-full">
                                <Image src={item.iconSrc} alt={item.iconAlt} width={20} height={20} />
                            </div>
                            <div>
                                <h4 className="not-italic font-medium text-[12px] leading-[120%] text-[#434956]">{item.label}</h4>
                                <h2 className="not-italic font-medium text-[14px] leading-[120%] text-[#262D3B]">{item.value}</h2>
                            </div>
                        </div>
                    ))}
                </div>
                {balanceValue ? (
                    <div>
                        <div className="flex gap-2 items-center">
                            <div className="flex items-center justify-center w-[40px] h-[40px] bg-white border border-[#EBECED] rounded-full">
                                <Image src={balanceIconSrc} alt={balanceIconAlt} width={20} height={20} />
                            </div>
                            <div>
                                <h2 className="not-italic font-semibold text-[14px] leading-[120%] text-[#262D3B]">{balanceValue}</h2>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

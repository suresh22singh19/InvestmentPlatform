"use client";

import Image from "next/image";

export interface PatientWalletDetailItem {
    label: string;
    value: string;
}

interface PatientWalletInformationCardProps {
    title?: string;
    iconSrc?: string;
    iconAlt?: string;
    remainingAmountLabel?: string;
    remainingAmount: string;
    details: PatientWalletDetailItem[];
    actionLabel?: string;
    onActionClick?: () => void;
    className?: string;
}

export function PatientWalletInformationCard({
    title = "Patient Wallet Information",
    iconSrc = "/icons/patient_history.svg",
    iconAlt = "Wallet Icon",
    remainingAmountLabel = "Remaining Amount",
    remainingAmount,
    details,
    actionLabel = "View Details",
    onActionClick,
    className = "",
}: PatientWalletInformationCardProps) {
    return (
        <div className={`mb-4 w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] ${className}`}>
            <div className="flex items-center justify-between gap-2 cursor-pointer">
                <div className="flex items-center gap-2">
                    <Image src={iconSrc} alt={iconAlt} width={20} height={20} />
                    <h2 className="font-inter font-medium text-base leading-[120%] text-[#262D3B]">{title}</h2>
                </div>
            </div>
            <div className="content-js">
                {remainingAmount === "N/A" ? (
                    <p className="py-6 text-center font-inter text-sm font-medium leading-[120%] text-[#6E7480]">
                        No Data Available
                    </p>
                ) : (
                    <>
                        <div className="my-5">
                            <h5 className="font-medium text-base leading-[19px] text-center tracking-[0.03em] text-[#9FA2AB] mb-2">
                                {remainingAmountLabel}
                            </h5>
                            <h4 className="font-bold text-2xl leading-[28px] text-center text-[#1D1B23]">
                                {remainingAmount}
                            </h4>
                        </div>
                        {details && details.length > 0 && (
                            <div className="border border-[#EBECED] rounded-md divide-y divide-gray-200 bg-white">
                                {details.map((item) => (
                                    <div key={item.label} className="flex justify-between items-center px-5 py-[18px]">
                                        <p className="font-inter font-normal text-sm leading-[120%] text-[#434956]">{item.label}</p>
                                        <p className="font-inter font-medium text-sm leading-[120%] text-right text-[#434956]">
                                            {item.value}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* {onActionClick && (
                            <div className="flex justify-center mt-4">
                                <button
                                    type="button"
                                    onClick={onActionClick}
                                    className="cursor-pointer flex flex-row justify-center items-center px-3 py-1.5 gap-2 bg-[rgba(11,140,0,0.15)] rounded-[32px] font-inter font-medium text-xs leading-[120%] text-center text-[#0B8C00] hover:bg-[rgba(11,140,0,0.25)] transition-colors"
                                >
                                    <Image src="/icons/Eye.svg" alt="Eye icon" width={16} height={16} />
                                    {actionLabel}
                                </button>
                            </div>
                        )} */}
                    </>
                )}
            </div>
        </div>
    );
}

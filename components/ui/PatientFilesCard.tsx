"use client";

import Image from "next/image";

export interface PatientFileItem {
    name: string;
    size: string;
    fileIconSrc?: string;
    fileIconAlt?: string;
    actionIconSrc?: string;
    actionIconAlt?: string;
}

interface PatientFilesCardProps {
    title?: string;
    titleIconSrc?: string;
    titleIconAlt?: string;
    items: PatientFileItem[];
    className?: string;
}

export function PatientFilesCard({
    title = "Patient Files",
    titleIconSrc = "/icons/patient_history.svg",
    titleIconAlt = "Medical Icon",
    items,
    className = "",
}: PatientFilesCardProps) {
    return (
        <div className={`mb-4 w-full overflow-hidden rounded-[20px] border border-[#E3EEE1] bg-white px-6 pb-6 pt-5 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] ${className}`}>
            <div className="flex items-center justify-between gap-2 cursor-pointer">
                <div className="flex items-center gap-2 ">
                    <Image src={titleIconSrc} alt={titleIconAlt} width={20} height={20} />
                    <h2 className="font-inter font-medium text-base leading-[120%] text-[#262D3B]">{title}</h2>
                </div>
            </div>
            <div className="Room-content mt-5">
                <div>
                    <div className="bg-white mb-4 ">
                        {items.map((item, index) => (
                            <div key={`${item.name}-${index}`} className="py-2 mb-3 last:mb-0 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div>
                                        <div className="flex justify-center items-center w-9 h-9 bg-[rgba(11,140,0,0.05)] shadow-[0px_6px_30px_rgba(0,0,0,0.08)] rounded-full">
                                            <Image
                                                src={item.fileIconSrc ?? "/icons/patient_history.svg"}
                                                alt={item.fileIconAlt ?? "Patient File"}
                                                width={20}
                                                height={20}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm leading-[120%] text-[#262D3B]">{item.name}</p>
                                        <p className="font-medium text-[10px] leading-[120%] text-[#434956]">{item.size}</p>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-center items-center w-9 h-9 bg-[rgba(11,140,0,0.05)] shadow-[0px_6px_30px_rgba(0,0,0,0.08)] rounded-full">
                                        <Image
                                            src={item.actionIconSrc ?? "/icons/filedownload.svg"}
                                            alt={item.actionIconAlt ?? "File Download"}
                                            width={20}
                                            height={20}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

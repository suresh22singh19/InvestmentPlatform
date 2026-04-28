"use client";

import Image from "next/image";

interface HealthCardPreviewProps {
    imageSrc?: string;
    imageAlt?: string;
    cardNumber: string;
    cardNumberAriaLabel?: string;
    className?: string;
}

export function HealthCardPreview({
    imageSrc = "/images/HealthCard.jpeg",
    imageAlt = "Health card preview",
    cardNumber,
    cardNumberAriaLabel = "JS Health Card",
    className = "",
}: HealthCardPreviewProps) {
    return (
        <div className={`w-full rounded-[16px] border border-[#E3EEE1] bg-white px-5 pb-5 pt-5 mb-4 ${className}`}>
            <div className="relative inline-block max-w-full">
                <Image
                    src={imageSrc}
                    alt={imageAlt}
                    width={380}
                    height={380}
                    className="h-auto max-h-[380px] w-full max-w-[380px] object-contain"
                />
                <p
                    className="absolute bottom-3 left-[22px] text-[13px] font-semibold tracking-[3px] text-[#fff71f] drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] sm:text-[15px] sm:tracking-[4px]"
                    aria-label={cardNumberAriaLabel}
                >
                    {cardNumber}
                </p>
            </div>
        </div>
    );
}

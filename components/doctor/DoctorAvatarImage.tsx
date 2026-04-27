"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { DOCTOR_PHOTO_PLACEHOLDER, resolveDoctorPhotoSrc } from "@/lib/doctor/doctorPhoto";

type DoctorAvatarImageProps = {
    imgUrl: string | null | undefined;
    /** Pixel width/height (square). */
    size?: number;
    className?: string;
};

/** Doctor photo with fallback to `/icons/Portrait_Placeholder.svg` when URL is default or image fails to load. */
export function DoctorAvatarImage({ imgUrl, size = 40, className }: DoctorAvatarImageProps) {
    const [src, setSrc] = useState(() => resolveDoctorPhotoSrc(imgUrl));

    useEffect(() => {
        setSrc(resolveDoctorPhotoSrc(imgUrl));
    }, [imgUrl]);

    const unoptimized =
        src.startsWith("http://") || src.startsWith("https://");

    return (
        <Image
            src={src}
            alt=""
            width={size}
            height={size}
            className={className}
            unoptimized={unoptimized}
            onError={() => {
                setSrc((current) =>
                    current === DOCTOR_PHOTO_PLACEHOLDER ? current : DOCTOR_PHOTO_PLACEHOLDER
                );
            }}
        />
    );
}

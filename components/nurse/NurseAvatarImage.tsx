"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { NURSE_PHOTO_PLACEHOLDER, resolveNursePhotoSrc } from "@/lib/nurse/nursePhoto";

type NurseAvatarImageProps = {
    imgUrl: string | null | undefined;
    size?: number;
    className?: string;
};

export function NurseAvatarImage({ imgUrl, size = 40, className }: NurseAvatarImageProps) {
    const [src, setSrc] = useState(() => resolveNursePhotoSrc(imgUrl));

    useEffect(() => {
        setSrc(resolveNursePhotoSrc(imgUrl));
    }, [imgUrl]);

    const unoptimized = src.startsWith("http://") || src.startsWith("https://");

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
                    current === NURSE_PHOTO_PLACEHOLDER ? current : NURSE_PHOTO_PLACEHOLDER
                );
            }}
        />
    );
}

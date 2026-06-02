"use client";

import Image from "next/image";
import { Tooltip } from "@/components/ui";
import { LoginTypeHelpContent, type LoginTypeHelpEntity } from "@/lib/auth/loginTypeHelp";

type LoginTypeInfoIconProps = {
    entity?: LoginTypeHelpEntity;
    size?: number;
};

export function LoginTypeInfoIcon({ entity = "user", size = 16 }: LoginTypeInfoIconProps) {
    return (
        <Tooltip
            content={<LoginTypeHelpContent entity={entity} />}
            position="top"
            maxWidth={410}
            delay={0}
            className="text-[10px] leading-[1.35]"
        >
            <span
                role="img"
                aria-label="Login type information"
                className="inline-flex shrink-0 cursor-default items-center justify-center rounded-full text-[#0B8C00]"
            >
                <Image
                    src="/icons/InfoIcon.svg"
                    alt=""
                    width={size}
                    height={size}
                    className="shrink-0"
                    style={{ width: size, height: size }}
                    aria-hidden
                />
            </span>
        </Tooltip>
    );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ScrollableContainer from "@/components/ui/ScrollableContainer";
import { RECEPTION_DASHBOARD_TABS } from "@/lib/ipd-reception/constants";
import type { ReceptionDashboardTab } from "@/lib/ipd-reception/types";

type ReceptionNavTabsProps = {
  activeTab: ReceptionDashboardTab;
};

export function ReceptionNavTabs({ activeTab }: ReceptionNavTabsProps) {
  const pathname = usePathname();

  return (
    <ScrollableContainer
      maxHeight="none"
      overflowY="hidden"
      overflowX="auto"
      className="mb-5 h-[41px] w-full rounded-[100px] border border-[#DFE0E2] p-1"
    >
      <div className="flex h-[33px] w-full min-w-max items-center gap-[5px]">
        {RECEPTION_DASHBOARD_TABS.map((tab) => {
          const isActive =
            activeTab === tab.value ||
            pathname === tab.href ||
            pathname?.startsWith(`${tab.href}/`);

          return (
            <Link
              key={tab.value}
              href={tab.href}
              className={`flex h-[33px] min-w-max flex-1 items-center justify-center gap-2 rounded-[100px] border border-[#DFE0E2] px-4 text-sm font-medium leading-[120%] transition-colors whitespace-nowrap ${
                isActive
                  ? "bg-[#0B8C00] text-white"
                  : "bg-white text-[#434956] hover:bg-[#F2F8F2]"
              }`}
            >
              <Image
                src={tab.iconSrc}
                alt=""
                width={16}
                height={16}
                style={isActive ? { filter: "brightness(0) invert(1)" } : undefined}
              />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </ScrollableContainer>
  );
}

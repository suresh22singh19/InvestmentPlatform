"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { SIDEBAR_NAVIGATION, type SidebarNavItem } from "@/lib/constants/navigation";

type SidebarProps = {
  onNavigate?: () => void;
};

const classNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const shouldItemBeActive = (pathname: string, item: SidebarNavItem): boolean => {
  if (item.href && pathname === item.href) {
    return true;
  }

  if (item.children) {
    return item.children.some((child) => !!child.href && pathname?.startsWith(child.href));
  }

  return false;
};

const SidebarItem = ({
  item,
  isActive,
  isExpanded,
  onToggle,
  onNavigate,
}: {
  item: SidebarNavItem;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: (key: string) => void;
  onNavigate?: () => void;
}) => {
  const Icon = item.icon;

  const itemBaseClasses =
    "flex w-full items-center gap-3 rounded-full px-5 py-3 text-sm font-semibold transition-all duration-200";
  const activeClasses = "bg-[#0B8C00] text-white";
  const inactiveClasses = "text-[#434956] bg-white hover:bg-[#F2F8F2]";

  const hasChildren = !!item.children?.length;

  const baseContent = (
    <>
      {Icon ? <Icon className="h-5 w-5 shrink-0" /> : null}
      <span className="flex-1 text-left">{item.label}</span>
      {hasChildren ? (
        <svg
          className={classNames(
            "ml-auto h-4 w-4 transition-transform duration-200",
            isExpanded ? "rotate-180" : "rotate-0"
          )}
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M5 8l5 5 5-5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </>
  );

  if (item.href && !hasChildren) {
    return (
      <Link
        href={item.href}
        // prefetch={false}
        className={classNames(
          itemBaseClasses,
          isActive ? activeClasses : inactiveClasses,
          " hover:border-[#B0D5B0] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0B8C00]"
        )}
        onClick={onNavigate}
      >
        {baseContent}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={classNames(
        itemBaseClasses,
        isActive ? activeClasses : inactiveClasses,
        " hover:border-[#B0D5B0] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0B8C00]"
      )}
      onClick={() => onToggle(item.key)}
    >
      {baseContent}
    </button>
  );
};

export const Sidebar = ({ onNavigate }: SidebarProps) => {
  const pathname = usePathname();
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => {
    return new Set();
  });

  useEffect(() => {
    if (!pathname) {
      return;
    }

    setExpandedKeys((prev) => {
      const defaults = SIDEBAR_NAVIGATION.filter((item) =>
        shouldItemBeActive(pathname, item)
      ).map((item) => item.key);

      const next = new Set(prev);
      defaults.forEach((key) => next.add(key));
      return next;
    });
  }, [pathname]);

  const toggleItem = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <aside className="relative flex h-screen w-[240px] flex-col overflow-hidden pl-4 pr-5 pt-5 pb-4">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-[#D6D7D9]" />

      <div className="mb-6 flex items-center justify-center">
        <Logo />
      </div>

      <nav className="flex flex-1 flex-col gap-2 overflow-y-auto pr-2 scrollbar-hidden">
        {SIDEBAR_NAVIGATION.map((item) => {
          const isActive = pathname ? shouldItemBeActive(pathname, item) : false;
          const isExpanded = expandedKeys.has(item.key);

          return (
            <div key={item.key}>
              <SidebarItem
                item={item}
                isActive={isActive}
                isExpanded={isExpanded}
                onToggle={toggleItem}
                onNavigate={onNavigate}
              />

              {item.children && isExpanded ? (
                <div className="mt-2 flex flex-col gap-1 pl-6">
                  {item.children.map((child) => {
                    const childActive = pathname ? pathname === child.href : false;
                    return (
                      <Link
                        key={child.key}
                        href={child.href ?? "#"}
                        // prefetch={false}
                        className={classNames(
                          "flex items-center rounded-full px-4 py-2 text-xs font-medium transition-colors duration-150",
                          childActive ? "text-[#0B8C00]" : "text-[#525763] hover:text-[#0B8C00]"
                        )}
                        onClick={onNavigate}
                      >
                        <span className="mr-2 inline-flex h-1.5 w-1.5 rounded-full bg-[#0B8C00]" />
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="mt-auto pt-6">
        <p className="text-sm text-black">
          © Copyright 2025{" "}
          <span className="font-medium text-[#0B8C00]">HIIMS</span>
        </p>
      </div>
    </aside>
  );
};



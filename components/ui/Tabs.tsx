"use client";

import ScrollableContainer from "./ScrollableContainer";

type TabOption = {
  value: string;
  label: string;
};

type TabsProps = {
  options: TabOption[];
  value: string | string[];
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  tabBorder?: boolean;
  wrap?: boolean;
  multiSelect?: boolean;
};

export const Tabs = ({
  options,
  value,
  onChange,
  className = "",
  disabled = false,
  tabBorder = true,
  wrap = false,
  multiSelect = false
}: TabsProps) => {
  const isOptionActive = (optVal: string) => {
    if (multiSelect) {
      if (!value) return false;
      const selectedArr = Array.isArray(value)
        ? value
        : typeof value === "string"
          ? value.replace(/[{}]/g, "").split(",").map(v => v.trim())
          : [];
      return selectedArr.some(v => {
        const normV = String(v).replace(/[{}"']/g, "").trim().toLowerCase();
        const normOpt = String(optVal).toLowerCase();
        if (normV === normOpt) return true;
        if (normOpt === "hepatitis" && normV.includes("hepatitis")) return true;
        if (normOpt === "tb" && (normV === "tuberculosis" || normV === "tb")) return true;
        return false;
      });
    }
    return value === optVal;
  };

  const handleTabClick = (clickedVal: string) => {
    if (disabled) return;
    if (multiSelect) {
      let selectedArr = Array.isArray(value)
        ? value
        : typeof value === "string" && value.trim()
          ? value.replace(/[{}]/g, "").split(",").map(v => v.trim())
          : [];
      
      const isNoneOrNormal = (v: string) => {
        const norm = v.toLowerCase();
        return norm === "none" || norm === "no" || norm === "nil" || norm === "normal";
      };
      
      const isNoneClicked = isNoneOrNormal(clickedVal);
      
      if (isNoneClicked) {
        if (selectedArr.some(v => v.toLowerCase() === clickedVal.toLowerCase())) {
          selectedArr = selectedArr.filter(v => v.toLowerCase() !== clickedVal.toLowerCase());
        } else {
          selectedArr = [clickedVal];
        }
      } else {
        selectedArr = selectedArr.filter(v => !isNoneOrNormal(v));
        if (selectedArr.some(v => v.toLowerCase() === clickedVal.toLowerCase())) {
          selectedArr = selectedArr.filter(v => v.toLowerCase() !== clickedVal.toLowerCase());
        } else {
          selectedArr.push(clickedVal);
        }
      }
      onChange(selectedArr.join(","));
    } else {
      onChange(clickedVal);
    }
  };

  if (wrap) {
    return (
      <div
        className={`w-full rounded-[16px] border border-[#DFE0E2] p-2 bg-white ${disabled ? "opacity-60" : ""} ${className}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          {options.map((option) => {
            const isActive = isOptionActive(option.value);
            return (
              <button
                key={option.value}
                type="button"
                disabled={disabled}
                onClick={() => handleTabClick(option.value)}
                className={`flex h-[34px] items-center justify-center rounded-full px-4 text-xs font-semibold leading-[120%] transition-colors cursor-pointer border ${
                  isActive
                    ? "bg-[#0B8C00] text-white border-[#0B8C00]"
                    : "bg-white text-[#434956] border-[#DFE0E2] hover:bg-[#F2F8F2]"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <ScrollableContainer
      maxHeight="none"
      overflowY="hidden"
      overflowX="auto"
      className={`h-[41px] w-full rounded-[100px] border border-[#DFE0E2] p-1 ${disabled ? "opacity-60" : ""} ${className}`}
    >
      <div className="flex h-full w-full min-w-max items-center gap-[5px]">
        {options.map((option) => {
          const isActive = isOptionActive(option.value);
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => handleTabClick(option.value)}
              className={`text-nowrap flex h-[33px] min-w-max flex-1 items-center justify-center rounded-[100px] px-4 text-sm font-medium leading-[120%] transition-colors disabled:cursor-not-allowed ${tabBorder ? "border border-[#DFE0E2]" : ""} ${isActive
                  ? "bg-[#0B8C00] text-white"
                  : "bg-white text-[#434956] hover:bg-[#F2F8F2]"
                }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </ScrollableContainer>
  );
};
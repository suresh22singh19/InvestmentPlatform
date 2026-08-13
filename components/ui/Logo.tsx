import React from "react";
import { FaCrown } from "react-icons/fa";

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = "" }) => {
  return (
    <div className={`inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-amber-400/80 shadow-md select-none shrink-0 ${className}`}>
      {/* Left Icon: Glossy Golden Crown Emblem */}
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-900 flex items-center justify-center shadow-inner shrink-0">
        <FaCrown className="text-base text-slate-900" />
      </div>

      {/* Right Text: Brand Name & Subtitle */}
      <div className="flex flex-col justify-center text-left leading-none">
        <span className="text-sm font-black tracking-tight text-white">
          <span className="text-amber-400 font-extrabold">D</span>VENTURES
        </span>
        <span className="text-[9px] font-black text-amber-400/90 uppercase tracking-widest mt-0.5">
          GLOBAL YIELD
        </span>
      </div>
    </div>
  );
};

import React from "react";
import Image from "next/image";

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = "", width = 160, height = 61 }) => {
  return (
    <Image
      src="/images/logo.png"
      alt="Jeena Sikho Logo"
      width={width}
      height={height}
      priority
      className={className}
    />
  );
};

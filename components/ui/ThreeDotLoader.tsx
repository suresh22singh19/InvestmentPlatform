"use client";

import React, { useEffect } from "react";

export type LoaderColor = "white" | "green";

interface ThreeDotLoaderProps {
  color?: LoaderColor;
  size?: "small" | "medium" | "large";
  className?: string;
}

const sizeClasses = {
  small: "w-1 h-1",
  medium: "w-1.5 h-1.5",
  large: "w-2 h-2",
};

const colorClasses = {
  white: "bg-white",
  green: "bg-[#0B8C00]",
};

const bounceAnimation = {
  animation: "dot-bounce 1.4s infinite ease-in-out",
};

// Add keyframes to document if not already present
const injectKeyframes = () => {
  if (typeof document === "undefined") return;
  
  const styleId = "three-dot-loader-keyframes";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @keyframes dot-bounce {
        0%, 80%, 100% {
          transform: scale(0.8);
          opacity: 0.5;
        }
        40% {
          transform: scale(1);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }
};

export const ThreeDotLoader: React.FC<ThreeDotLoaderProps> = ({
  color = "white",
  size = "medium",
  className = "",
}) => {
  useEffect(() => {
    injectKeyframes();
  }, []);

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span
        className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full`}
        style={{
          ...bounceAnimation,
          animationDelay: "0ms",
        }}
      />
      <span
        className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full`}
        style={{
          ...bounceAnimation,
          animationDelay: "160ms",
        }}
      />
      <span
        className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full`}
        style={{
          ...bounceAnimation,
          animationDelay: "320ms",
        }}
      />
    </div>
  );
};

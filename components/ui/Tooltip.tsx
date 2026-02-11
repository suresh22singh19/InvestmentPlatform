"use client";

import React, { useState, useRef, useEffect } from "react";

export type TooltipPosition = "top" | "bottom" | "left" | "right";

export interface TooltipProps {
  /**
   * The content to display in the tooltip
   */
  content: string | React.ReactNode;
  
  /**
   * The child element that triggers the tooltip on hover
   */
  children: React.ReactElement;
  
  /**
   * Position of the tooltip relative to the trigger element
   * @default "top"
   */
  position?: TooltipPosition;
  
  /**
     * Delay in milliseconds before showing the tooltip
     * @default 0
   */
  delay?: number;
  
  /**
   * Custom className for the tooltip container
   */
  className?: string;
  
  /**
   * Custom className for the tooltip content
   */
  contentClassName?: string;
  
  /**
   * Whether to show the tooltip pointer/tail
   * @default true
   */
  showPointer?: boolean;
  
  /**
   * Maximum width of the tooltip
   * @default "auto"
   */
  maxWidth?: string | number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = "top",
  delay = 0,
  className = "",
  contentClassName = "",
  showPointer = true,
  maxWidth = "auto",
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    if (delay > 0) {
      timeoutRef.current = setTimeout(() => {
        setIsVisible(true);
      }, delay);
    } else {
      setIsVisible(true);
    }
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const updatePosition = () => {
        if (!triggerRef.current || !tooltipRef.current) return;
        
        const triggerRect = triggerRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();

        // If tooltip hasn't rendered yet (height is 0), wait a bit
        if (tooltipRect.height === 0) {
          requestAnimationFrame(updatePosition);
          return;
        }

        let top = 0;
        let left = 0;

        switch (position) {
          case "top":
            top = triggerRect.top - tooltipRect.height - 8;
            left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
            break;
          case "bottom":
            top = triggerRect.bottom + 8;
            left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
            break;
          case "left":
            top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
            left = triggerRect.left - tooltipRect.width - 8;
            break;
          case "right":
            top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
            left = triggerRect.right + 12; // Increased gap for right position
            break;
        }

        // Keep tooltip within viewport horizontally
        const padding = 8;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (left < padding) {
          left = padding;
        } else if (left + tooltipRect.width > viewportWidth - padding) {
          left = viewportWidth - tooltipRect.width - padding;
        }

        // For top position, only adjust if it would go off-screen at the top
        // Don't flip to bottom automatically - respect the position prop
        if (position === "top" && top < padding) {
          // If tooltip would go off top, keep it at top padding but still show above
          top = padding;
        } else if (position === "bottom" && top + tooltipRect.height > viewportHeight - padding) {
          top = viewportHeight - tooltipRect.height - padding;
        }

        setTooltipStyle({
          position: "fixed",
          top: `${top}px`,
          left: `${left}px`,
          zIndex: 9999,
        });
      };

      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        updatePosition();
      });
    } else {
      // Reset style when tooltip is hidden
      setTooltipStyle({});
    }
  }, [isVisible, position]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getPointerClass = () => {
    if (!showPointer) return "";
    
    switch (position) {
      case "top":
        return "after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-8 after:border-t-white after:border-r-transparent after:border-b-transparent after:border-l-transparent";
      case "bottom":
        return "after:content-[''] after:absolute after:bottom-full after:left-1/2 after:-translate-x-1/2 after:border-8 after:border-b-white after:border-r-transparent after:border-t-transparent after:border-l-transparent";
      case "left":
        return "after:content-[''] after:absolute after:left-full after:top-1/2 after:-translate-y-1/2 after:border-8 after:border-l-white after:border-r-transparent after:border-t-transparent after:border-b-transparent";
      case "right":
        return "after:content-[''] after:absolute after:right-full after:top-1/2 after:-translate-y-1/2 after:border-8 after:border-r-white after:border-l-transparent after:border-t-transparent after:border-b-transparent";
      default:
        return "";
    }
  };

  // Determine if we should use block or inline-block based on className
  const wrapperClass = className.includes('w-full') || className.includes('block') 
    ? 'block' 
    : 'inline-block';
  
  return (
    <>
      <div
        ref={triggerRef}
        className={`${wrapperClass} ${className}`}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        {children}
      </div>
      
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`fixed bg-white text-black text-xs font-medium px-3 py-2 rounded-lg shadow-md whitespace-nowrap z-[9999] ${getPointerClass()} ${contentClassName}`}
          style={{
            ...tooltipStyle,
            maxWidth: typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth,
          }}
          role="tooltip"
          onMouseEnter={showTooltip}
          onMouseLeave={hideTooltip}
        >
          {content}
        </div>
      )}
    </>
  );
};


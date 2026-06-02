"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  cloneElement,
  isValidElement,
  type ReactNode,
  type ReactElement,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";

export type TooltipPosition = "top" | "bottom" | "left" | "right";
type TooltipTrigger = "hover" | "click" | "both";

export interface TooltipProps {
  content: ReactNode;
  position?: TooltipPosition;
  trigger?: TooltipTrigger;
  delay?: number;
  hideDelay?: number;
  maxWidth?: number;
  arrow?: boolean;
  className?: string;
  offset?: number;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  zIndex?: number;
  children: ReactNode;
}

const ARROW_SIZE = 6;
const VIEWPORT_PADDING = 8;

export function Tooltip({
  content,
  position = "top",
  trigger = "hover",
  delay = 200,
  hideDelay = 0,
  maxWidth = 280,
  arrow = true,
  className = "",
  offset = 8,
  disabled = false,
  open: controlledOpen,
  onOpenChange,
  zIndex = 99999,
  children,
}: TooltipProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const triggerRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const coordsRef = useRef({ top: 0, left: 0 });
  const arrowLeftRef = useRef<number | null>(null);
  const actualPosRef = useRef<TooltipPosition>(position);
  const [, forceRender] = useState(0);

  const isControlled = controlledOpen !== undefined;
  const visible = isControlled ? controlledOpen : internalOpen;

  useEffect(() => { setMounted(true); }, []);

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  const clearTimers = useCallback(() => {
    clearTimeout(showTimer.current);
    clearTimeout(hideTimer.current);
  }, []);

  const calcPosition = useCallback(() => {
    const triggerEl = triggerRef.current;
    const tooltipEl = tooltipRef.current;
    if (!triggerEl || !tooltipEl) return;

    const tRect = triggerEl.getBoundingClientRect();
    const ttRect = tooltipEl.getBoundingClientRect();
    const gap = offset + (arrow ? ARROW_SIZE : 0);

    const fits = (pos: TooltipPosition): boolean => {
      switch (pos) {
        case "top":    return tRect.top - gap - ttRect.height >= VIEWPORT_PADDING;
        case "bottom": return tRect.bottom + gap + ttRect.height <= window.innerHeight - VIEWPORT_PADDING;
        case "left":   return tRect.left - gap - ttRect.width >= VIEWPORT_PADDING;
        case "right":  return tRect.right + gap + ttRect.width <= window.innerWidth - VIEWPORT_PADDING;
      }
    };

    const order: Record<TooltipPosition, TooltipPosition[]> = {
      top:    ["top", "bottom", "right", "left"],
      bottom: ["bottom", "top", "right", "left"],
      left:   ["left", "right", "top", "bottom"],
      right:  ["right", "left", "top", "bottom"],
    };

    const resolved = order[position].find(fits) ?? position;
    let top = 0, left = 0;

    switch (resolved) {
      case "top":
        top  = tRect.top  - gap - ttRect.height + window.scrollY;
        left = tRect.left + tRect.width / 2 - ttRect.width / 2 + window.scrollX;
        break;
      case "bottom":
        top  = tRect.bottom + gap + window.scrollY;
        left = tRect.left + tRect.width / 2 - ttRect.width / 2 + window.scrollX;
        break;
      case "left":
        top  = tRect.top + tRect.height / 2 - ttRect.height / 2 + window.scrollY;
        left = tRect.left - gap - ttRect.width + window.scrollX;
        break;
      case "right":
        top  = tRect.top + tRect.height / 2 - ttRect.height / 2 + window.scrollY;
        left = tRect.right + gap + window.scrollX;
        break;
    }

    const clampedLeft = Math.max(
      window.scrollX + VIEWPORT_PADDING,
      Math.min(left, window.scrollX + window.innerWidth - ttRect.width - VIEWPORT_PADDING),
    );
    const clampedTop = Math.max(
      window.scrollY + VIEWPORT_PADDING,
      Math.min(top, window.scrollY + window.innerHeight - ttRect.height - VIEWPORT_PADDING),
    );

    const triggerCenterX = tRect.left + tRect.width / 2 + window.scrollX;
    const arrowInset = ARROW_SIZE + 10;
    arrowLeftRef.current = Math.max(
      arrowInset,
      Math.min(triggerCenterX - clampedLeft, ttRect.width - arrowInset),
    );

    actualPosRef.current = resolved;
    coordsRef.current = { top: clampedTop, left: clampedLeft };
  }, [position, offset, arrow]);

  // Position + reveal: runs after the hidden tooltip has been painted so we can read its size
  useEffect(() => {
    if (!visible || !mounted) return;

    // Double-rAF: first frame paints the hidden tooltip so getBoundingClientRect works,
    // second frame applies the calculated position and reveals it.
    let id1: number, id2: number;
    id1 = requestAnimationFrame(() => {
      calcPosition();
      id2 = requestAnimationFrame(() => forceRender((n) => n + 1));
    });
    return () => { cancelAnimationFrame(id1); cancelAnimationFrame(id2); };
  }, [visible, mounted, calcPosition, content]);

  // Reposition on scroll / resize
  useEffect(() => {
    if (!visible) return;
    const handler = () => { calcPosition(); forceRender((n) => n + 1); };
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [visible, calcPosition]);

  // Outside click (for click trigger)
  useEffect(() => {
    if (!visible || (trigger !== "click" && trigger !== "both")) return;
    const handler = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node) || tooltipRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [visible, trigger, setOpen]);

  // Escape key
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [visible, setOpen]);

  const show = useCallback(() => {
    if (disabled) return;
    clearTimers();
    if (delay > 0) {
      showTimer.current = setTimeout(() => setOpen(true), delay);
    } else {
      setOpen(true);
    }
  }, [disabled, delay, clearTimers, setOpen]);

  const hide = useCallback(() => {
    clearTimers();
    if (hideDelay > 0) {
      hideTimer.current = setTimeout(() => setOpen(false), hideDelay);
    } else {
      setOpen(false);
    }
  }, [hideDelay, clearTimers, setOpen]);

  // Cleanup timers on unmount
  useEffect(() => () => clearTimers(), [clearTimers]);

  const arrowStyle = (): CSSProperties => {
    const base: CSSProperties = { position: "absolute", width: 0, height: 0 };
    const b = `${ARROW_SIZE}px solid transparent`;
    const fill = `${ARROW_SIZE}px solid #F5F5F5`;
    const arrowLeft = arrowLeftRef.current;
    const horizontalArrow =
      arrowLeft != null
        ? { left: arrowLeft, transform: "translateX(-50%)" as const }
        : { left: "50%", transform: "translateX(-50%)" as const };

    switch (actualPosRef.current) {
      case "top":
        return { ...base, bottom: -ARROW_SIZE, ...horizontalArrow, borderLeft: b, borderRight: b, borderTop: fill };
      case "bottom":
        return { ...base, top: -ARROW_SIZE, ...horizontalArrow, borderLeft: b, borderRight: b, borderBottom: fill };
      case "left":
        return { ...base, right: -ARROW_SIZE, top: "50%", transform: "translateY(-50%)", borderTop: b, borderBottom: b, borderLeft: fill };
      case "right":
        return { ...base, left: -ARROW_SIZE, top: "50%", transform: "translateY(-50%)", borderTop: b, borderBottom: b, borderRight: fill };
    }
  };

  // Early return: no wrapper, no portal, zero DOM impact
  if (!content || disabled) return <>{children}</>;

  // Determine if coords have been computed at least once
  const hasCoords = coordsRef.current.top !== 0 || coordsRef.current.left !== 0;

  const tooltipNode =
    visible && mounted
      ? createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            style={{
              position: "absolute",
              zIndex,
              width: "max-content",
              maxWidth,
              wordWrap: "break-word",
              overflowWrap: "break-word",
              top: coordsRef.current.top,
              left: coordsRef.current.left,
              visibility: hasCoords ? "visible" : "hidden",
              opacity: hasCoords ? 1 : 0,
              transition: hasCoords ? "opacity 150ms ease-out" : "none",
            }}
            className={`rounded-lg bg-[#F5F5F5] px-3 py-2 text-xs leading-[1.5] text-[#262D3B] shadow-[0px_4px_16px_rgba(0,0,0,0.12)] border border-[#E3EEE1] ${className}`}
            onMouseEnter={trigger === "hover" || trigger === "both" ? show : undefined}
            onMouseLeave={trigger === "hover" || trigger === "both" ? hide : undefined}
          >
            {content}
            {arrow && <span style={arrowStyle()} />}
          </div>,
          document.body,
        )
      : null;

  // Attach handlers + ref to child via cloneElement (no wrapper DOM node at all)
  if (isValidElement(children)) {
    const child = children as ReactElement<Record<string, unknown>>;
    const childProps: Record<string, unknown> = {
      ref: (node: HTMLElement | null) => {
        triggerRef.current = node;
        // Forward the child's own ref
        const childRef = (child as any).ref;
        if (typeof childRef === "function") childRef(node);
        else if (childRef && typeof childRef === "object") (childRef as { current: unknown }).current = node;
      },
    };
    if (trigger === "hover" || trigger === "both") {
      childProps.onMouseEnter = (e: React.MouseEvent) => { show(); (child.props as any).onMouseEnter?.(e); };
      childProps.onMouseLeave = (e: React.MouseEvent) => { hide(); (child.props as any).onMouseLeave?.(e); };
    }
    if (trigger === "click" || trigger === "both") {
      childProps.onClick = (e: React.MouseEvent) => { visible ? hide() : show(); (child.props as any).onClick?.(e); };
    }
    return (
      <>
        {cloneElement(child, childProps)}
        {tooltipNode}
      </>
    );
  }

  // Fallback: wrap text / fragments in a span
  return (
    <>
      <span
        ref={triggerRef as React.RefObject<HTMLSpanElement | null>}
        style={{ display: "inline" }}
        onMouseEnter={trigger === "hover" || trigger === "both" ? show : undefined}
        onMouseLeave={trigger === "hover" || trigger === "both" ? hide : undefined}
        onClick={trigger === "click" || trigger === "both" ? () => (visible ? hide() : show()) : undefined}
      >
        {children}
      </span>
      {tooltipNode}
    </>
  );
}

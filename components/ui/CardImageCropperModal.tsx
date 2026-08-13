"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Dialog } from "./Dialog";
import { Button } from "./Button";
import { SpinnerLoader } from "./SpinnerLoader";

export interface CardImageCropperModalProps {
    open: boolean;
    imageSrc: string | null;
    fileName?: string;
    targetWidth?: number; // Default 384
    targetHeight?: number; // Default 240
    onConfirm: (croppedFile: File, croppedDataUrl: string) => void;
    onClose: () => void;
}

type HandleType = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w" | "move";

export const CardImageCropperModal: React.FC<CardImageCropperModalProps> = ({
    open,
    imageSrc,
    fileName = "health_card.png",
    targetWidth = 384,
    targetHeight = 240,
    onConfirm,
    onClose,
}) => {
    const targetAspect = targetWidth / targetHeight; // 384 / 240 = 1.6

    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
    const [displaySize, setDisplaySize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
    const [isExactSize, setIsExactSize] = useState(false);

    // Crop box in display container coordinates { x, y, width, height }
    const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number }>({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
    });

    const [activeAction, setActiveAction] = useState<{
        type: HandleType;
        startX: number;
        startY: number;
        initialBox: { x: number; y: number; width: number; height: number };
    } | null>(null);

    const [isProcessing, setIsProcessing] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    // Reset state when modal opens with a new image
    useEffect(() => {
        if (open && imageSrc) {
            setIsImageLoaded(false);
            setNaturalSize({ width: 0, height: 0 });
            setDisplaySize({ width: 0, height: 0 });
            setIsExactSize(false);
            setCropBox({ x: 0, y: 0, width: 0, height: 0 });
        }
    }, [open, imageSrc]);

    // Handle image load to calculate initial box
    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        const nw = img.naturalWidth;
        const nh = img.naturalHeight;
        const dw = img.clientWidth || img.width;
        const dh = img.clientHeight || img.height;

        setNaturalSize({ width: nw, height: nh });
        setDisplaySize({ width: dw, height: dh });
        setIsImageLoaded(true);

        const exact = nw === targetWidth && nh === targetHeight;
        setIsExactSize(exact);

        // Initialize crop box scaled to 55% of display dimensions with target aspect ratio
        let boxWidth = dw * 0.55;
        let boxHeight = boxWidth / targetAspect;

        if (boxHeight > dh * 0.55) {
            boxHeight = dh * 0.55;
            boxWidth = boxHeight * targetAspect;
        }

        const x = (dw - boxWidth) / 2;
        const y = (dh - boxHeight) / 2;

        setCropBox({ x, y, width: boxWidth, height: boxHeight });
    };

    // Keep crop box within image boundaries using real-time DOM measurements
    const clampBox = useCallback(
        (box: { x: number; y: number; width: number; height: number }) => {
            const dw = imgRef.current?.clientWidth || displaySize.width || 1;
            const dh = imgRef.current?.clientHeight || displaySize.height || 1;

            const minWidth = 40;
            const minHeight = minWidth / targetAspect;

            let w = Math.max(minWidth, Math.min(dw, box.width));
            let h = w / targetAspect;

            if (h > dh) {
                h = dh;
                w = h * targetAspect;
            }

            let x = Math.max(0, Math.min(dw - w, box.x));
            let y = Math.max(0, Math.min(dh - h, box.y));

            return { x, y, width: w, height: h };
        },
        [displaySize, targetAspect]
    );

    // Mouse / Touch Event Handlers for Dragging & Resizing
    const handleMouseDown = (type: HandleType) => (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        setActiveAction({
            type,
            startX: clientX,
            startY: clientY,
            initialBox: { ...cropBox },
        });
    };

    useEffect(() => {
        if (!activeAction) return;

        const handleMove = (e: MouseEvent | TouchEvent) => {
            const clientX = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
            const clientY = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

            const dx = clientX - activeAction.startX;
            const dy = clientY - activeAction.startY;
            const { initialBox, type } = activeAction;
            const dw = imgRef.current?.clientWidth || displaySize.width || 1;
            const dh = imgRef.current?.clientHeight || displaySize.height || 1;

            let nextBox = { ...initialBox };

            if (type === "move") {
                nextBox.x = initialBox.x + dx;
                nextBox.y = initialBox.y + dy;
            } else {
                // Handle corner and edge resizing enforcing targetAspect
                let newWidth = initialBox.width;

                if (type.includes("e")) {
                    newWidth = initialBox.width + dx;
                } else if (type.includes("w")) {
                    newWidth = initialBox.width - dx;
                } else if (type.includes("s")) {
                    newWidth = (initialBox.height + dy) * targetAspect;
                } else if (type.includes("n")) {
                    newWidth = (initialBox.height - dy) * targetAspect;
                }

                newWidth = Math.max(40, Math.min(dw, newWidth));
                const newHeight = newWidth / targetAspect;

                if (type.includes("w")) {
                    nextBox.x = initialBox.x + (initialBox.width - newWidth);
                }
                if (type.includes("n")) {
                    nextBox.y = initialBox.y + (initialBox.height - newHeight);
                }

                nextBox.width = newWidth;
                nextBox.height = newHeight;
            }

            setCropBox(clampBox(nextBox));
        };

        const handleUp = () => {
            setActiveAction(null);
        };

        window.addEventListener("mousemove", handleMove);
        window.addEventListener("mouseup", handleUp);
        window.addEventListener("touchmove", handleMove);
        window.addEventListener("touchend", handleUp);

        return () => {
            window.removeEventListener("mousemove", handleMove);
            window.removeEventListener("mouseup", handleUp);
            window.removeEventListener("touchmove", handleMove);
            window.removeEventListener("touchend", handleUp);
        };
    }, [activeAction, displaySize, clampBox, targetAspect]);

    // Crop Image onto canvas & trigger onConfirm
    const handleConfirmCrop = async () => {
        if (!imgRef.current || !isImageLoaded) return;
        setIsProcessing(true);

        try {
            const img = imgRef.current;
            const scaleX = naturalSize.width / displaySize.width;
            const scaleY = naturalSize.height / displaySize.height;

            const sourceX = cropBox.x * scaleX;
            const sourceY = cropBox.y * scaleY;
            const sourceW = cropBox.width * scaleX;
            const sourceH = cropBox.height * scaleY;

            const canvas = document.createElement("canvas");
            canvas.width = targetWidth;
            canvas.height = targetHeight;

            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Could not get canvas context");

            // Smooth image scaling settings
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";

            // Draw cropped area onto target canvas size (384 x 240)
            ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, targetWidth, targetHeight);

            const croppedDataUrl = canvas.toDataURL("image/png", 1.0);

            // Convert canvas to File object
            canvas.toBlob((blob) => {
                if (!blob) {
                    setIsProcessing(false);
                    return;
                }

                const outName = fileName.replace(/\.[^/.]+$/, "") + "_card_384x240.png";
                const croppedFile = new File([blob], outName, { type: "image/png" });

                setIsProcessing(false);
                onConfirm(croppedFile, croppedDataUrl);
                onClose();
            }, "image/png", 1.0);
        } catch (err) {
            console.error("Failed to crop image:", err);
            setIsProcessing(false);
        }
    };

    if (!open || !imageSrc) return null;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            title="Adjust Health Card Image Area"
            width={720}
            contentOverflow="hidden"
            closeOnOutsideClick={false}
        >
            <div className="flex flex-col gap-4 p-4 select-none">
                {/* Header Information Banner */}
                <div className="flex items-center justify-between rounded-xl bg-[#F2F8F2] p-3 border border-[#E3EEE1]">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#0B8C00]">Required Dimensions:</span>
                        <span className="rounded-md bg-[#0B8C00] px-2 py-0.5 text-xs font-bold text-white">
                            {targetWidth} × {targetHeight} px
                        </span>
                    </div>
                    {isExactSize && (
                        <div className="flex items-center gap-1 text-xs font-bold text-[#0B8C00]">
                            <span>✓ Image is already in exact {targetWidth}×{targetHeight} px format</span>
                        </div>
                    )}
                    {naturalSize.width > 0 && (
                        <span className="text-xs font-medium text-[#7B8089]">
                            Original: {naturalSize.width} × {naturalSize.height} px
                        </span>
                    )}
                </div>

                {/* Main Interactive Crop Canvas Container */}
                <div className="relative flex items-center justify-center overflow-hidden rounded-2xl bg-slate-900 p-3 min-h-[260px] max-h-[460px]">
                    {!isImageLoaded && (
                        <div className="flex flex-col items-center justify-center gap-2 py-16 text-white">
                            <SpinnerLoader size={28} />
                            <span className="text-xs font-medium text-slate-300">Loading card image...</span>
                        </div>
                    )}

                    <div ref={containerRef} className="relative inline-block overflow-hidden rounded-lg">
                        {/* Source Image */}
                        <img
                            ref={imgRef}
                            src={imageSrc}
                            alt="Card Source"
                            onLoad={handleImageLoad}
                            className="max-h-[400px] w-auto max-w-full object-contain block"
                            draggable={false}
                        />

                        {/* Darkened Vignette Overlay & Interactive Selection Box */}
                        {isImageLoaded && (
                            <div
                                className="absolute cursor-move border-2 border-[#0B8C00] shadow-[0_0_0_9999px_rgba(0,0,0,0.65)]"
                                style={{
                                    left: `${cropBox.x}px`,
                                    top: `${cropBox.y}px`,
                                    width: `${cropBox.width}px`,
                                    height: `${cropBox.height}px`,
                                }}
                                onMouseDown={handleMouseDown("move")}
                                onTouchStart={handleMouseDown("move")}
                            >
                                {/* Grid Lines (Rule of thirds) */}
                                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                                    <div className="border-r border-b border-white/30" />
                                    <div className="border-r border-b border-white/30" />
                                    <div className="border-b border-white/30" />
                                    <div className="border-r border-b border-white/30" />
                                    <div className="border-r border-b border-white/30" />
                                    <div className="border-b border-white/30" />
                                    <div className="border-r border-white/30" />
                                    <div className="border-r border-white/30" />
                                    <div />
                                </div>

                                {/* Dimension Badge Pill */}
                                <div className="absolute top-2 left-2 pointer-events-none rounded bg-[#0B8C00] px-2 py-0.5 text-[10px] font-bold text-white shadow">
                                    {targetWidth} × {targetHeight} px
                                </div>

                                {/* 8 Resize Handle Dots & Bars */}
                                {/* Top-Left */}
                                <div
                                    className="absolute -left-1.5 -top-1.5 h-3.5 w-3.5 cursor-nwse-resize rounded-sm bg-[#0B8C00] border-2 border-white shadow-md hover:scale-125 transition-transform"
                                    onMouseDown={handleMouseDown("nw")}
                                    onTouchStart={handleMouseDown("nw")}
                                />
                                {/* Top-Right */}
                                <div
                                    className="absolute -right-1.5 -top-1.5 h-3.5 w-3.5 cursor-nesw-resize rounded-sm bg-[#0B8C00] border-2 border-white shadow-md hover:scale-125 transition-transform"
                                    onMouseDown={handleMouseDown("ne")}
                                    onTouchStart={handleMouseDown("ne")}
                                />
                                {/* Bottom-Left */}
                                <div
                                    className="absolute -left-1.5 -bottom-1.5 h-3.5 w-3.5 cursor-nesw-resize rounded-sm bg-[#0B8C00] border-2 border-white shadow-md hover:scale-125 transition-transform"
                                    onMouseDown={handleMouseDown("sw")}
                                    onTouchStart={handleMouseDown("sw")}
                                />
                                {/* Bottom-Right */}
                                <div
                                    className="absolute -right-1.5 -bottom-1.5 h-3.5 w-3.5 cursor-nwse-resize rounded-sm bg-[#0B8C00] border-2 border-white shadow-md hover:scale-125 transition-transform"
                                    onMouseDown={handleMouseDown("se")}
                                    onTouchStart={handleMouseDown("se")}
                                />
                                {/* Top Center */}
                                <div
                                    className="absolute left-1/2 -top-1.5 h-3.5 w-3.5 -translate-x-1/2 cursor-ns-resize rounded-sm bg-[#0B8C00] border-2 border-white shadow-md hover:scale-125 transition-transform"
                                    onMouseDown={handleMouseDown("n")}
                                    onTouchStart={handleMouseDown("n")}
                                />
                                {/* Bottom Center */}
                                <div
                                    className="absolute left-1/2 -bottom-1.5 h-3.5 w-3.5 -translate-x-1/2 cursor-ns-resize rounded-sm bg-[#0B8C00] border-2 border-white shadow-md hover:scale-125 transition-transform"
                                    onMouseDown={handleMouseDown("s")}
                                    onTouchStart={handleMouseDown("s")}
                                />
                                {/* Left Center */}
                                <div
                                    className="absolute -left-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 cursor-ew-resize rounded-sm bg-[#0B8C00] border-2 border-white shadow-md hover:scale-125 transition-transform"
                                    onMouseDown={handleMouseDown("w")}
                                    onTouchStart={handleMouseDown("w")}
                                />
                                {/* Right Center */}
                                <div
                                    className="absolute -right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 cursor-ew-resize rounded-sm bg-[#0B8C00] border-2 border-white shadow-md hover:scale-125 transition-transform"
                                    onMouseDown={handleMouseDown("e")}
                                    onTouchStart={handleMouseDown("e")}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-3">
                    {/* <span className="text-xs font-medium text-[#7B8089]">
                        Drag box to adjust position or corner handles to resize. Selection output will be scaled to exactly {targetWidth} × {targetHeight} px.
                    </span> */}

                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="small"
                            onClick={onClose}
                            disabled={isProcessing}
                            className="!border-[#DFE0E2] !text-[#434956] hover:!bg-gray-100 !rounded-[24px]"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            size="small"
                            onClick={handleConfirmCrop}
                            isLoading={isProcessing}
                            disabled={!isImageLoaded || isProcessing}
                            className="!rounded-[24px]"
                        >
                            Select Area
                        </Button>
                    </div>
                </div>
            </div>
        </Dialog>
    );
};

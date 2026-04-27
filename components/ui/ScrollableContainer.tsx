import React from "react";

interface ScrollableContainerProps {
    children: React.ReactNode;
    maxHeight?: string | number;
    className?: string;
    showScrollbar?: boolean;
    /** Default auto; use hidden for horizontal-only strips to avoid a vertical scrollbar thumb. */
    overflowY?: "auto" | "hidden" | "visible";
}

const ScrollableContainer = React.forwardRef<HTMLDivElement, ScrollableContainerProps>(({
    children,
    maxHeight = "400px",
    className = "",
    showScrollbar = true,
    overflowY = "auto",
}, ref) => {
    const heightStyle = typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight;
    const overflowYClass =
        overflowY === "hidden" ? "overflow-y-hidden" : overflowY === "visible" ? "overflow-y-visible" : "overflow-y-auto";

    return (
        <>
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 5px;
                    height: 5px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background:rgb(255, 255, 255);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #b8c0cc;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #98a2b3;
                }
                .custom-scrollbar::-webkit-scrollbar-button {
                    display: none;
                    height: 0;
                    width: 0;
                }
                .custom-scrollbar::-webkit-scrollbar-button:start:decrement,
                .custom-scrollbar::-webkit-scrollbar-button:end:increment {
                    display: none;
                }
            `}</style>
            <div
                ref={ref}
                className={`${overflowYClass} ${showScrollbar ? "custom-scrollbar cstm-hidden" : "scrollbar-hide"} ${className}`}
                style={{
                    maxHeight: heightStyle,
                }}
            >
                {children}
            </div>
        </>
    );
});

ScrollableContainer.displayName = "ScrollableContainer";

export default ScrollableContainer;
